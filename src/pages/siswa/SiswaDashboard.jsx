import { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { User, FileText, BookOpen, Clock, CalendarDays, PlayCircle, ChevronRight, Loader2 } from 'lucide-react';
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
        // 1. Ambil detail peserta (terutama kelas_id dan nomor_peserta)
        const { data: detail, error: detailErr } = await supabase
          .from('peserta_ujian')
          .select('*, master_kelas(nama_kelas)')
          .eq('id', profile.id)
          .maybeSingle();

        if (detailErr) throw detailErr;
        setStudentDetail(detail);

        if (!detail) {
          console.warn('Data peserta tidak ditemukan untuk ID:', profile.id);
          setLoading(false);
          return;
        }

        // 2. Ambil jadwal ujian yang sesuai dengan kelas siswa
        // Kita menggunakan filter pada bank_soal.kelas_id untuk memastikan soal yang muncul sesuai kelas siswa
        const { data: examList, error: examErr } = await supabase
          .from('jadwal_ujian')
          .select(`
            *,
            bank_soal!inner (
              *,
              master_mapel (nama_mapel)
            )
          `)
          .eq('bank_soal.kelas_id', detail.kelas_id)
          .eq('status_ujian', 'aktif') // Hanya tampilkan yang aktif sesuai permintaan
          .order('tanggal', { ascending: true });

        if (examErr) throw examErr;
        setExams(examList || []);
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
        {exams.map((exam) => (
          <div key={exam.id} className="bg-white p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-slate-200 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            {/* Aksen Garis Biru Kiri */}
            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-blue-500"></div>
            
            <div className="pl-3 flex flex-col gap-1.5">
              <div className="flex items-center gap-3">
                <h4 className="text-base font-bold text-slate-800">{exam.nama_ujian}</h4>
                <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${
                  exam.status_ujian === 'aktif' 
                    ? 'bg-green-50 text-green-600 border-green-100' 
                    : 'bg-blue-50 text-blue-600 border-blue-100'
                }`}>
                  {exam.status_ujian === 'aktif' ? 'Sedang Berlangsung' : 'Belum Mulai'}
                </span>
              </div>
              <p className="text-sm text-slate-600 font-medium mb-1">{exam.bank_soal?.master_mapel?.nama_mapel}</p>
              
              <div className="flex items-center text-xs text-slate-500 gap-4 mt-1">
                <span className="flex items-center gap-1.5 font-medium"><Clock className="w-3.5 h-3.5" /> {exam.durasi_menit} Menit</span>
                <span className="flex items-center gap-1.5 font-medium">
                  <CalendarDays className="w-3.5 h-3.5" /> 
                  {format(new Date(exam.waktu_mulai), 'dd MMM yyyy, HH:mm', { locale: id })}
                </span>
              </div>
            </div>

            <div className="pl-3 md:pl-0 mt-2 md:mt-0">
              <button 
                onClick={() => navigate(`/siswa/ujian/${exam.id}`)}
                className="w-full md:w-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2.5 px-6 rounded-xl text-sm font-semibold transition-all shadow-md hover:shadow-blue-600/20 active:scale-95 disabled:bg-slate-300 disabled:shadow-none"
              >
                <PlayCircle className="w-4 h-4" />
                Mulai Ujian
                <ChevronRight className="w-4 h-4 ml-1" />
              </button>
            </div>
            
          </div>
        ))}
        {exams.length === 0 && (
          <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-slate-300">
            <p className="text-slate-500">Belum ada jadwal ujian yang tersedia untuk kelas Anda.</p>
          </div>
        )}
      </div>

    </div>
  );
}