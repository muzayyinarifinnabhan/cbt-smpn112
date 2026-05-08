import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { KeyRound, Maximize, ShieldAlert, AlertTriangle, ChevronRight, ChevronLeft, HelpCircle, LayoutGrid, LogOut, CheckCircle2, User, Clock, BookOpen, Monitor, Lock } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { supabase } from '../../lib/supabase';
import { useConfirmStore } from '../../store/useConfirmStore';
import { verifyRotatingToken } from '../../utils/tokenUtils';

export default function SiswaUjian() {
  const { showConfirm } = useConfirmStore();
  const { jadwalId } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuthStore();
  
  const [tokenInput, setTokenInput] = useState('');
  const [isExamStarted, setIsExamStarted] = useState(false);
  const [violationMessage, setViolationMessage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [examData, setExamData] = useState(null);
  const [fetchingData, setFetchingData] = useState(true);

  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({}); // { soal_id: { jawaban: 'A', ragu: false } }
  const [session, setSession] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0); // in seconds
  const [isFinished, setIsFinished] = useState(false);

  // Ambil data ujian
  useEffect(() => {
    const fetchExamData = async () => {
      try {
        const { data, error } = await supabase
          .from('jadwal_ujian')
          .select(`
            *,
            bank_soal (
              pg_jumlah,
              essay_jumlah,
              master_mapel (
                nama_mapel
              )
            )
          `)
          .eq('id', jadwalId)
          .single();

        if (error) throw error;
        setExamData(data);
      } catch (err) {
        console.error("Error fetching exam:", err);
      } finally {
        setFetchingData(false);
      }
    };

    fetchExamData();
  }, [jadwalId]);

  // Fungsi untuk menangani pelanggaran
  const handleViolation = useCallback(async (message) => {
    if (!session || isFinished) return;

    // Jika sudah keluar tidak perlu berulang kali
    if (!isExamStarted) return;
    
    setIsExamStarted(false);
    setViolationMessage(message);
    setTokenInput(''); 
    
    // Update DB: is_blocked = true dan increment peringatan_nyontek
    try {
      const { data: updatedSession, error: uErr } = await supabase
        .from('ujian_aktif')
        .update({ 
          is_blocked: true,
          peringatan_nyontek: (session.peringatan_nyontek || 0) + 1
        })
        .eq('id', session.id)
        .select()
        .single();
      
      if (!uErr) {
        setSession(updatedSession);
      }
    } catch (err) {
      console.error("Gagal update status blokir:", err);
    }

    // Keluar dari mode fullscreen jika masih didalam
    if (document.fullscreenElement) {
      document.exitFullscreen().catch((err) => console.error(err));
    }
  }, [session]);

  // Violation: kick back to token screen (not permanent block)

  useEffect(() => {
    if (!isExamStarted) return;

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        handleViolation('Layar penuh telah ditutup. Anda dikeluarkan dari sesi ujian demi keamanan.');
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleViolation('Sistem mendeteksi Anda membuka tab atau aplikasi lain.');
      }
    };

    const handleWindowBlur = () => {
      handleViolation('Layar ujian kehilangan fokus. Anda terdeteksi melihat aplikasi lain atau layar mengambang.');
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [isExamStarted, handleViolation]);

  // Handle Timer
  useEffect(() => {
    if (!isExamStarted || !timeLeft) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmitUjian();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isExamStarted, timeLeft]);

  // Helper shuffle
  const shuffleArray = (array) => {
    const newArr = [...array];
    for (let i = newArr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
    }
    return newArr;
  };

  const startExamSequence = async () => {
    try {
      if (!profile?.id) {
        throw new Error('Profil siswa tidak ditemukan. Silakan login kembali.');
      }

      // 1. Cek atau Buat Sesi Ujian (ujian_aktif)
      const { data: existingSession, error: sErr } = await supabase
        .from('ujian_aktif')
        .select('*')
        .eq('jadwal_ujian_id', jadwalId)
        .eq('siswa_id', profile.id)
        .maybeSingle();

      let currentSession = existingSession;
      if (!currentSession) {
        const { data: newSession, error: nErr } = await supabase
          .from('ujian_aktif')
          .insert([{
            jadwal_ujian_id: jadwalId,
            siswa_id: profile.id,
            status: 'sedang_ujian'
          }])
          .select()
          .single();
        if (nErr) throw nErr;
        currentSession = newSession;
      } else if (currentSession.status === 'selesai') {
        toast.error('Ujian ini sudah Anda selesaikan.');
        navigate('/siswa');
        return;
      }

      // CEK STATUS BLOKIR & LIMIT PELANGGARAN
      if (currentSession.peringatan_nyontek >= 3) {
        setViolationMessage('Anda telah melanggar aturan lebih dari 3 kali. Akses ujian ini telah ditutup secara permanen.');
        setIsLoading(false);
        return;
      }

      if (currentSession.is_blocked) {
        setViolationMessage('Akun Anda terblokir. Silakan hubungi pengawas/admin untuk mereset sesi Anda.');
        setIsLoading(false);
        return;
      }

      setSession(currentSession);
      setAnswers(currentSession.jawaban_pg || {});

      // 2. Ambil Soal
      const { data: allSoal, error: qErr } = await supabase
        .from('soal')
        .select('*')
        .eq('bank_soal_id', examData.bank_soal_id);
      
      if (qErr) throw qErr;

      let processedQuestions = allSoal || [];
      if (examData.acak_soal) {
        processedQuestions = shuffleArray(processedQuestions);
      }
      setQuestions(processedQuestions);

      // 3. Hitung Waktu
      const startTime = new Date(currentSession.waktu_mulai_ujian).getTime();
      const durationMs = examData.durasi_menit * 60 * 1000;
      const now = new Date().getTime();
      const remainingSeconds = Math.max(0, Math.floor((startTime + durationMs - now) / 1000));
      
      if (remainingSeconds === 0) {
        handleSubmitUjian();
        return;
      }
      setTimeLeft(remainingSeconds);

      // 4. Masuk Fullscreen
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }

      setIsExamStarted(true);
      setViolationMessage(null);
    } catch (err) {
      console.error(err);
      setViolationMessage('Gagal memulai ujian: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMulaiUjian = async (e) => {
    e.preventDefault();
    if (!tokenInput.trim()) return;

    setIsLoading(true);

    // Verifikasi token berputar (dihitung di sisi klien, tidak perlu DB)
    const isValid = verifyRotatingToken(jadwalId, tokenInput);

    if (!isValid) {
      setIsLoading(false);
      setViolationMessage('Token tidak valid atau sudah kedaluwarsa. Minta token terbaru ke guru Anda.');
      return;
    }

    await startExamSequence();
  };

  const handleAnswer = async (soalId, jawaban, isRagu = null) => {
    const currentAns = answers[soalId] || { jawaban: null, ragu: false };
    const newAns = {
      ...currentAns,
      ...(jawaban !== null && { jawaban }),
      ...(isRagu !== null && { ragu: isRagu })
    };

    const newAnswers = { ...answers, [soalId]: newAns };
    setAnswers(newAnswers);

    // Save to DB
    await supabase
      .from('ujian_aktif')
      .update({ jawaban_pg: newAnswers })
      .eq('id', session.id);
  };

  const handleSubmitUjian = async () => {
    showConfirm({
      title: 'Selesaikan Ujian?',
      message: 'Apakah Anda yakin ingin menyelesaikan ujian? Jawaban tidak dapat diubah setelah ini.',
      confirmText: 'Ya, Selesai',
      cancelText: 'Belum, Lanjut',
      type: 'warning',
      onConfirm: async () => {
        setIsLoading(true);
        try {
          // 1. Ambil Kunci Jawaban
          const { data: soalList } = await supabase
            .from('soal')
            .select('id, kunci_jawaban')
            .eq('bank_soal_id', session.jadwal_ujian?.bank_soal_id);
          
          const { data: bankSoal } = await supabase
            .from('bank_soal')
            .select('pg_bobot')
            .eq('id', session.jadwal_ujian?.bank_soal_id)
            .single();

          const studentAnswers = session.jawaban_pg || {};
          let benar = 0;
          let salah = 0;
          let kosong = 0;

          soalList?.forEach(soal => {
            const jawabanSiswa = studentAnswers[soal.id];
            if (!jawabanSiswa) {
              kosong++;
            } else if (jawabanSiswa === soal.kunci_jawaban) {
              benar++;
            } else {
              salah++;
            }
          });

          // Rumus Nilai - Jika pg_bobot 0, gunakan skala 100
          const bobot = bankSoal?.pg_bobot || (100 / (soalList?.length || 1));
          const nilaiTotal = benar * bobot;

          // 2. Simpan ke hasil_nilai
          await supabase
            .from('hasil_nilai')
            .upsert([{
              jadwal_ujian_id: session.jadwal_ujian_id,
              siswa_id: profile.id,
              pg_benar: benar,
              pg_salah: salah,
              pg_kosong: kosong,
              nilai_pg: nilaiTotal,
              nilai_total: nilaiTotal
            }], { onConflict: 'jadwal_ujian_id, siswa_id' });

          // 3. Update Status Sesi
          await supabase
            .from('ujian_aktif')
            .update({ 
              status: 'selesai',
              waktu_selesai_ujian: new Date().toISOString()
            })
            .eq('id', session.id);
          
          setIsFinished(true);
          setIsExamStarted(false);
          if (document.fullscreenElement) {
            await document.exitFullscreen();
          }
        } catch (err) {
          console.error(err);
          toast.error('Gagal mengirimkan ujian. Silakan coba lagi.');
        } finally {
          setIsLoading(false);
        }
      }
    });
  };

  if (isFinished) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-700">
        <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mb-8 animate-bounce">
          <CheckCircle2 className="w-12 h-12 text-emerald-600" />
        </div>
        <h1 className="text-4xl font-black text-slate-900 mb-2">Ujian Selesai!</h1>
        <p className="text-slate-500 font-bold text-lg mb-10 max-w-md">Terima kasih, jawaban Anda telah berhasil terkirim ke server kami.</p>
        
        <div className="bg-slate-50 rounded-[2.5rem] p-10 w-full max-w-sm border border-slate-100 mb-10">
           <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-bold uppercase tracking-wider text-xs">Mata Pelajaran</span>
                <span className="text-slate-800 font-black">{examData?.bank_soal?.master_mapel?.nama_mapel}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-bold uppercase tracking-wider text-xs">Status</span>
                <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-black uppercase">Berhasil Terkirim</span>
              </div>
           </div>
        </div>

        <button 
          onClick={() => navigate('/siswa')}
          className="px-12 py-5 bg-indigo-600 text-white font-black rounded-[2rem] hover:bg-indigo-700 shadow-2xl shadow-indigo-200 transition-all active:scale-95 flex items-center gap-3"
        >
          KEMBALI KE DASHBOARD
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    );
  }

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Navigasi UI
  const currentSoal = questions[currentIndex];

  const keluarUjian = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(err => console.error(err));
    }
    navigate('/siswa');
  };

  if (!isExamStarted) {
    if (fetchingData) {
      return (
        <div className="min-h-screen bg-[#1e293b] flex items-center justify-center">
          <div className="text-white flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
            <p className="font-medium">Menyiapkan Ruang Tunggu...</p>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-[#0f172a] relative overflow-hidden flex flex-col items-center p-4 py-12">
        {/* Ruang Tunggu Content (Sudah ada di kode lama, tetap gunakan UI yg sama) */}
        <div className="absolute inset-0 opacity-10" style={{ 
          backgroundImage: `radial-gradient(circle, #fff 1px, transparent 1px)`,
          backgroundSize: '30px 30px'
        }}></div>

        <div className="relative z-10 flex flex-col items-center mb-8 text-center">
          <div className="w-16 h-16 bg-white/10 rounded-xl flex items-center justify-center mb-4 backdrop-blur-sm border border-white/20 overflow-hidden">
             <img src="/logo.png" alt="Logo SMPN 112" className="w-12 h-12 object-contain" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">Ruang Tunggu Ujian</h1>
          <p className="text-blue-300 font-medium">SMP Negeri 112 Jakarta</p>
        </div>

        <div className="relative z-10 w-full max-w-2xl bg-white rounded-[2rem] shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="bg-gradient-to-r from-[#4f46e5] to-[#7c3aed] p-6 text-white">
            <h2 className="text-xl md:text-2xl font-bold uppercase tracking-wide">{examData?.nama_ujian || 'UJIAN AKTIF'}</h2>
            <p className="text-purple-100 font-medium mt-1">{examData?.bank_soal?.master_mapel?.nama_mapel || 'Mata Pelajaran'}</p>
          </div>

          <div className="p-6 md:p-10 space-y-8">
            <div className="bg-blue-50/50 rounded-2xl p-4 flex items-center gap-4 border border-blue-100/50">
              <div className="bg-white p-2.5 rounded-xl shadow-sm"><User className="w-6 h-6 text-blue-600" /></div>
              <div className="flex flex-col">
                <span className="font-bold text-slate-800 leading-none mb-1">{profile?.nama_lengkap}</span>
                <span className="text-xs text-slate-500 font-medium tracking-wider uppercase">No. Peserta: {profile?.username}</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="bg-blue-50/40 rounded-[2rem] p-4 flex flex-col items-center justify-center border border-blue-100/30">
                <div className="bg-white p-2 rounded-lg shadow-sm mb-2"><Clock className="w-5 h-5 text-blue-600" /></div>
                <span className="text-xl font-black text-slate-800">{examData?.durasi_menit}</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Menit</span>
              </div>
              <div className="bg-green-50/40 rounded-[2rem] p-4 flex flex-col items-center justify-center border border-green-100/30">
                <div className="bg-white p-2 rounded-lg shadow-sm mb-2"><BookOpen className="w-5 h-5 text-green-600" /></div>
                <span className="text-xl font-black text-slate-800">{(examData?.bank_soal?.pg_jumlah || 0) + (examData?.bank_soal?.essay_jumlah || 0)}</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Soal</span>
              </div>
              <div className="bg-purple-50/40 rounded-[2rem] p-4 flex flex-col items-center justify-center border border-purple-100/30">
                <div className="bg-white p-2 rounded-lg shadow-sm mb-2"><Monitor className="w-5 h-5 text-purple-600" /></div>
                <span className="text-sm font-black text-slate-800">Fullscreen</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mode</span>
              </div>
            </div>

            <div className="bg-amber-50 rounded-2xl p-5 border border-amber-200/50">
               <div className="flex items-center gap-2 mb-3">
                 <AlertTriangle className="w-5 h-5 text-amber-600" />
                 <h4 className="font-bold text-amber-900 text-sm">Perhatian Penting:</h4>
               </div>
               <ul className="text-xs text-amber-800 space-y-2 font-medium">
                 <li>• Ujian berjalan dalam mode <strong>fullscreen</strong></li>
                 <li>• Keluar fullscreen/pindah tab akan <strong>otomatis logout</strong></li>
                 <li>• Pastikan koneksi internet stabil</li>
               </ul>
            </div>

            <div className="space-y-4">
              <form onSubmit={handleMulaiUjian} className="space-y-4">
                <input
                  type="text" required value={tokenInput} onChange={(e) => setTokenInput(e.target.value)}
                  placeholder="MASUKKAN TOKEN"
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-5 text-center text-xl font-black tracking-widest text-slate-800 focus:border-blue-500 transition-all outline-none uppercase"
                />
                
                {violationMessage && (
                  <div className="text-red-600 text-sm font-bold text-center bg-red-50 p-3 rounded-xl border border-red-100">
                    {violationMessage}
                  </div>
                )}

                <button
                  type="submit" disabled={isLoading || !tokenInput.trim()}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 text-white font-bold py-5 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-lg"
                >
                  {isLoading ? <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-white"></div> : <><Lock className="w-5 h-5" /> Mulai Ujian <ChevronRight className="w-5 h-5" /></>}
                </button>
              </form>
            </div>

            <button onClick={keluarUjian} className="w-full text-center text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors">Kembali ke Dashboard</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans select-none">
      {/* Header Ujian */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-[100] shadow-sm">
        <div className="flex items-center gap-4">
          <div className="bg-indigo-600 rounded-lg p-2.5 text-white shadow-md shadow-indigo-100">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-sm md:text-base font-black text-slate-800 leading-tight uppercase tracking-tight">{examData?.nama_ujian}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <Clock className="w-3.5 h-3.5 text-indigo-500" />
              <span className="text-xs md:text-sm text-slate-500 font-bold font-mono tracking-tighter">Batas Waktu: {formatTime(timeLeft)}</span>
            </div>
          </div>
        </div>

        <button 
          onClick={handleSubmitUjian}
          className="flex items-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 font-black px-6 py-3 rounded-2xl border border-red-200 transition-all active:scale-95 text-xs md:text-sm uppercase tracking-wider"
        >
          <LogOut className="w-4 h-4" />
          <span>Selesai Ujian</span>
        </button>
      </header>

      {/* Main Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-8 flex flex-col lg:flex-row gap-8">
        
        {/* Kolom Kiri: Area Soal */}
        <div className="flex-1 bg-white rounded-[2.5rem] shadow-sm border border-slate-200 p-8 md:p-12 flex flex-col relative overflow-hidden">
          {/* Accent bar */}
          <div className="absolute top-0 left-0 w-full h-1.5 bg-indigo-600"></div>

          <div className="mb-8">
            <span className="bg-indigo-50 text-indigo-700 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest mb-4 inline-block">
              Soal Nomor {currentIndex + 1}
            </span>
            <h2 className="text-lg md:text-2xl font-bold text-slate-800 leading-relaxed">
               <div dangerouslySetInnerHTML={{ __html: currentSoal?.pertanyaan }} />
            </h2>
          </div>

          <div className="space-y-4 flex-1">
            {['a', 'b', 'c', 'd', 'e'].map((opt) => {
              const optText = currentSoal?.[`opsi_${opt}`];
              if (!optText) return null;

              const isSelected = answers[currentSoal.id]?.jawaban === opt.toUpperCase();

              return (
                <label 
                  key={opt}
                  className={`flex items-center gap-5 p-5 rounded-3xl border-2 transition-all cursor-pointer group animate-in slide-in-from-left-4 duration-300 ${
                    isSelected 
                    ? 'border-indigo-600 bg-indigo-50/50 shadow-md shadow-indigo-100/50' 
                    : 'border-slate-100 hover:border-indigo-200 hover:bg-slate-50'
                  }`}
                >
                  <input 
                    type="radio" 
                    name={`soal_${currentSoal.id}`}
                    checked={isSelected}
                    onChange={() => handleAnswer(currentSoal.id, opt.toUpperCase())}
                    className="hidden"
                  />
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-lg transition-all ${
                    isSelected ? 'bg-indigo-600 text-white scale-110' : 'bg-slate-100 text-slate-400 group-hover:bg-indigo-100 group-hover:text-indigo-600'
                  }`}>
                    {opt.toUpperCase()}
                  </div>
                  <div className={`font-bold transition-colors ${isSelected ? 'text-indigo-900' : 'text-slate-600'}`}>
                    {optText}
                  </div>
                </label>
              );
            })}
          </div>
          
          {/* Action Buttons */}
          <div className="mt-12 pt-8 border-t border-slate-100 flex flex-wrap justify-between gap-4">
            <button 
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex(prev => prev - 1)}
              className="px-8 py-4 bg-white hover:bg-slate-50 border-2 border-slate-200 text-slate-700 rounded-2xl font-black text-sm flex items-center gap-3 transition-all active:scale-95 disabled:opacity-30 disabled:pointer-events-none"
            >
              <ChevronLeft className="w-5 h-5 text-indigo-500" />
              SEBELUMNYA
            </button>
            
            <button 
              onClick={() => handleAnswer(currentSoal.id, null, !answers[currentSoal.id]?.ragu)}
              className={`px-8 py-4 rounded-2xl border-2 font-black text-sm flex items-center gap-3 transition-all active:scale-95 ${
                answers[currentSoal.id]?.ragu 
                ? 'bg-amber-400 border-amber-500 text-amber-900 shadow-lg shadow-amber-200' 
                : 'bg-white border-slate-200 text-slate-500 hover:border-amber-400 hover:text-amber-600'
              }`}
            >
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${answers[currentSoal.id]?.ragu ? 'bg-amber-900 border-amber-900' : 'border-slate-300'}`}>
                 {answers[currentSoal.id]?.ragu && <div className="w-2 h-2 bg-white rounded-full"></div>}
              </div>
              RAGU-RAGU
            </button>

            <button 
              disabled={currentIndex === questions.length - 1}
              onClick={() => setCurrentIndex(prev => prev + 1)}
              className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-sm flex items-center gap-3 transition-all shadow-xl shadow-indigo-200 active:scale-95 disabled:opacity-30 disabled:pointer-events-none"
            >
              SELANJUTNYA
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Kolom Kanan: Navigasi */}
        <div className="w-full lg:w-96 flex flex-col gap-6">
           <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 p-8">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-6 flex items-center gap-3">
                <LayoutGrid className="w-4 h-4 text-indigo-600" /> 
                Navigasi Soal
              </h3>
              
              <div className="grid grid-cols-5 gap-3">
                {questions.map((q, i) => {
                  const ans = answers[q.id];
                  const isCurrent = currentIndex === i;
                  const isAnswered = !!ans?.jawaban;
                  const isRagu = !!ans?.ragu;

                  let bgColor = 'bg-white border-slate-100 text-slate-400 hover:border-indigo-300';
                  if (isRagu) bgColor = 'bg-amber-400 border-amber-500 text-amber-900 font-black shadow-sm';
                  else if (isAnswered) bgColor = 'bg-indigo-600 border-indigo-700 text-white font-black shadow-md shadow-indigo-100';
                  
                  return (
                    <button 
                      key={q.id}
                      onClick={() => setCurrentIndex(i)}
                      className={`w-full aspect-square rounded-2xl text-[13px] border-2 transition-all active:scale-90 flex items-center justify-center ${bgColor} ${isCurrent ? 'ring-4 ring-indigo-500/20 border-indigo-500' : ''}`}
                    >
                      {i + 1}
                    </button>
                  );
                })}
              </div>

              <div className="mt-8 grid grid-cols-3 gap-2">
                 <div className="flex flex-col items-center gap-1.5">
                   <div className="w-full h-1 bg-indigo-600 rounded-full"></div>
                   <span className="text-[10px] font-black text-slate-400 uppercase">Selesai</span>
                 </div>
                 <div className="flex flex-col items-center gap-1.5">
                   <div className="w-full h-1 bg-amber-400 rounded-full"></div>
                   <span className="text-[10px] font-black text-slate-400 uppercase">Ragu</span>
                 </div>
                 <div className="flex flex-col items-center gap-1.5">
                   <div className="w-full h-1 bg-slate-100 rounded-full"></div>
                   <span className="text-[10px] font-black text-slate-400 uppercase">Belum</span>
                 </div>
              </div>
           </div>

           {/* User Profile Info Mini */}
           <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-[2.5rem] p-8 text-white shadow-xl">
              <div className="flex items-center gap-4 mb-4">
                 <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/10">
                    <User className="w-6 h-6" />
                 </div>
                 <div>
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider leading-none mb-1">Nama Peserta</div>
                    <div className="text-sm font-black truncate max-w-[150px]">{profile?.nama_lengkap}</div>
                 </div>
              </div>
              <div className="h-px bg-white/10 w-full mb-4"></div>
              <div className="flex items-center justify-between">
                 <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sesi ID</div>
                 <div className="text-[10px] font-black font-mono bg-white/5 px-2 py-0.5 rounded uppercase tracking-tighter">{session?.id.substring(0,8)}</div>
              </div>
           </div>
        </div>

      </main>
    </div>
  );
}