import { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { User, FileText, BookOpen, Clock, CalendarDays, PlayCircle, ChevronRight, Loader2, KeyRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

export default function SiswaDashboard() {
  const { profile } = useAuthStore();
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [studentDetail, setStudentDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!profile?.id) return;
      
      setLoading(true);
      try {
        // 1. Ambil detail peserta (kelas_id dan nomor_peserta)
        const { data: detail, error: detailErr } = await supabase
          .from('peserta_ujian')
          .select('*, master_kelas(nama_kelas)')
          .eq('id', profile.id)
          .maybeSingle();

        if (detailErr) throw detailErr;
        setStudentDetail(detail);

        if (!detail) {
          setLoading(false);
          return;
        }

        // 2. Ujian dari Admin (filter via bank_soal.kelas_id)
        const { data: adminExams } = await supabase
          .from('jadwal_ujian')
          .select(`
            *,
            bank_soal!inner (
              *,
              master_mapel (nama_mapel)
            )
          `)
          .eq('bank_soal.kelas_id', detail.kelas_id)
          .is('guru_id', null) // Ujian admin tidak punya guru_id
          .eq('status_ujian', 'aktif')
          .order('waktu_mulai', { ascending: true });

        // 3. Ujian dari Guru (filter via jadwal_ujian.kelas_id)
        const { data: guruExams } = await supabase
          .from('jadwal_ujian')
          .select(`
            *,
            bank_soal (
              *,
              master_mapel (nama_mapel)
            ),
            profiles(nama_lengkap)
          `)
          .eq('kelas_id', detail.kelas_id)
          .not('guru_id', 'is', null) // Hanya ujian yang punya guru_id
          .eq('status_ujian', 'aktif')
          .order('waktu_mulai', { ascending: true });

        // 4. Gabungkan dan tandai sumbernya
        const combined = [
          ...(adminExams || []).map(e => ({ ...e, sumber: 'admin' })),
          ...(guruExams || []).map(e => ({ ...e, sumber: 'guru' })),
        ];
        setExams(combined);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [profile?.id]);

  if (loading) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center text-sky-600">
        <Loader2 className="w-10 h-10 animate-spin mb-4" />
        <p className="font-semibold">Memuat Data Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Banner Selamat Datang */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 md:p-8 text-white flex items-center gap-6 shadow-lg">
        <div className="bg-white/20 p-4 rounded-2xl shrink-0 backdrop-blur-sm border border-white/10">
          <User className="w-10 h-10 text-white" />
        </div>
        <div className="flex flex-col">
          <h2 className="text-xl md:text-2xl font-bold mb-2">Selamat Datang, {profile?.nama_lengkap || 'Siswa'}!</h2>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-blue-100 text-sm md:text-base font-medium">
            <span className="flex items-center gap-2"><FileText className="w-4 h-4" /> No. Peserta: {studentDetail?.nomor_peserta || '-'}</span>
            <span className="flex items-center gap-2"><BookOpen className="w-4 h-4" /> Kelas: {studentDetail?.master_kelas?.nama_kelas || '-'}</span>
          </div>
        </div>
      </div>

      {/* Daftar Ujian Aktif Header */}
      <div className="flex items-center gap-3 pt-4 pb-2 text-indigo-900 border-b border-indigo-100/50">
        <BookOpen className="w-5 h-5" />
        <h3 className="text-lg font-bold">Daftar Ujian Aktif</h3>
      </div>

      {/* Card Ujian */}
      <div className="space-y-4">
        {exams.map((exam) => {
          const isGuru = exam.sumber === 'guru';
          return (
            <div key={exam.id} className="bg-white p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-slate-200 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
              
              {/* Aksen Garis Kiri — biru=admin, hijau=guru */}
              <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${isGuru ? 'bg-emerald-500' : 'bg-blue-500'}`}></div>
              
              <div className="pl-3 flex flex-col gap-1.5">
                <div className="flex items-center gap-3 flex-wrap">
                  <h4 className="text-base font-bold text-slate-800">{exam.nama_ujian}</h4>
                  <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${
                    isGuru
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-blue-50 text-blue-600 border-blue-100'
                  }`}>
                    {isGuru ? '📝 Ulangan Harian' : '🏫 Ujian Resmi'}
                  </span>
                  <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-green-100 text-green-700 border border-green-200">
                    Sedang Berlangsung
                  </span>
                  {isGuru && (
                    <span className="px-2 py-0.5 text-[10px] font-black rounded-full bg-amber-100 text-amber-700 border border-amber-200 flex items-center gap-1 uppercase tracking-tighter">
                      <KeyRound className="w-3 h-3" /> Token Diperlukan
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-600 font-medium">{exam.bank_soal?.master_mapel?.nama_mapel}</p>
                {isGuru && exam.profiles && (
                  <p className="text-[12px] text-slate-400 font-medium">Oleh: {exam.profiles.nama_lengkap}</p>
                )}
                <div className="flex items-center text-xs text-slate-500 gap-4 mt-1">
                  <span className="flex items-center gap-1.5 font-medium"><Clock className="w-3.5 h-3.5" /> {exam.durasi_menit} Menit</span>
                  {exam.waktu_mulai && (
                    <span className="flex items-center gap-1.5 font-medium">
                      <CalendarDays className="w-3.5 h-3.5" /> 
                      {format(new Date(exam.waktu_mulai), 'dd MMM yyyy, HH:mm', { locale: id })}
                    </span>
                  )}
                </div>
              </div>

              <div className="pl-3 md:pl-0 mt-2 md:mt-0">
                <button 
                  onClick={() => navigate(`/siswa/ujian/${exam.id}`)}
                  className={`w-full md:w-auto flex items-center justify-center gap-2 text-white py-2.5 px-6 rounded-xl text-sm font-semibold transition-all shadow-md active:scale-95 ${
                    isGuru
                      ? 'bg-emerald-600 hover:bg-emerald-700 hover:shadow-emerald-600/20'
                      : 'bg-blue-600 hover:bg-blue-700 hover:shadow-blue-600/20'
                  }`}
                >
                  <PlayCircle className="w-4 h-4" />
                  Mulai Ujian
                  <ChevronRight className="w-4 h-4 ml-1" />
                </button>
              </div>
              
            </div>
          );
        })}
        {exams.length === 0 && (
          <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-slate-300">
            <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">Belum ada ujian aktif untuk kelas Anda saat ini.</p>
          </div>
        )}
      </div>

    </div>
  );
}