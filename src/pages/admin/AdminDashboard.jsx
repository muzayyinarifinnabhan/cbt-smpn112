import { useState, useEffect } from 'react';
import { Users, FileText, CheckCircle, Clock, BookOpen, Activity } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { clsx } from 'clsx';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalSiswa: 0,
    totalUjian: 0,
    totalSoal: 0,
    ujianAktif: 0,
    siswaSedangUjian: 0,
    siswaSelesai: 0,
  });

  // Fungsi untuk memuat data statistik dari database (bisa dipanggil kapanpun)
  const fetchStats = async () => {
    // Note: Idealnya di real-world ini mengambil count dari table melalui RPC 
    // agar lebih cepat, tapi di sini kita ambil dengan head requests.
    const { count: countSiswa } = await supabase.from('peserta_ujian').select('*', { count: 'exact', head: true });
    const { count: countUjian } = await supabase.from('jadwal_ujian').select('*', { count: 'exact', head: true });
    const { count: countSoal } = await supabase.from('soal').select('*', { count: 'exact', head: true });
    
    // Status Spesifik
    const { count: countUjianAktif } = await supabase.from('jadwal_ujian').select('*', { count: 'exact', head: true }).eq('status_ujian', 'aktif');
    
    const { count: countSiswaSedang } = await supabase.from('ujian_aktif').select('*', { count: 'exact', head: true }).eq('status', 'sedang_ujian');
    const { count: countSiswaSelesai } = await supabase.from('ujian_aktif').select('*', { count: 'exact', head: true }).eq('status', 'selesai');

    setStats({
      totalSiswa: countSiswa || 0,
      totalUjian: countUjian || 0,
      totalSoal: countSoal || 0,
      ujianAktif: countUjianAktif || 0,
      siswaSedangUjian: countSiswaSedang || 0,
      siswaSelesai: countSiswaSelesai || 0,
    });
  };

  useEffect(() => {
    fetchStats();

    // Setup Supabase Realtime Subscription
    // Kita subscribe ke tabel ujian_aktif dan jadwal_ujian
    const subscription = supabase.channel('dashboard-metrics')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ujian_aktif' }, () => {
        fetchStats();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jadwal_ujian' }, () => {
        fetchStats();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'peserta_ujian' }, () => {
        fetchStats();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const statCards = [
    { title: 'Total Siswa', value: stats.totalSiswa, icon: Users, color: 'bg-emerald-500', shadow: 'shadow-emerald-500/30' },
    { title: 'Tot. Jadwal Ujian', value: stats.totalUjian, icon: FileText, color: 'bg-indigo-500', shadow: 'shadow-indigo-500/30' },
    { title: 'Total Bank Soal', value: stats.totalSoal, icon: BookOpen, color: 'bg-pink-500', shadow: 'shadow-pink-500/30' },
  ];

  const liveStats = [
    { title: 'Ujian Aktif Saat Ini', value: stats.ujianAktif, icon: Activity, color: 'bg-blue-600', textColor: 'text-blue-600' },
    { title: 'Siswa Sedang Ujian', value: stats.siswaSedangUjian, icon: Clock, color: 'bg-amber-500', textColor: 'text-amber-500' },
    { title: 'Siswa Selesai', value: stats.siswaSelesai, icon: CheckCircle, color: 'bg-teal-500', textColor: 'text-teal-500' },
  ];

  return (
    <div className="space-y-8 pb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Header Section */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-900 p-8 md:p-12 text-white shadow-2xl">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-72 h-72 rounded-full bg-blue-500/20 blur-3xl mix-blend-screen transition-transform duration-1000 animate-pulse"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-indigo-500/20 blur-3xl mix-blend-screen transition-transform duration-1000 animate-pulse delay-700"></div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
            <span className="text-green-400 font-semibold text-sm tracking-wide uppercase">Realtime Live</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4 drop-shadow-sm">
            Dashboard Utama
          </h1>
          <p className="text-slate-300 max-w-xl text-lg font-medium">
            Pantau dan amati langsung pergerakan data sistem Ujian Berbasis Komputer sekolah secara 100% Real-Time.
          </p>
        </div>
      </div>

      {/* Primary Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {statCards.map((card, i) => (
          <div key={i} className={clsx(
            "rounded-2xl p-6 text-white shadow-lg transform hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group",
            card.color, card.shadow
          )}>
            <div className="absolute right-0 top-0 -mr-6 -mt-6 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-500"></div>
            <div className="flex justify-between items-start z-10 relative">
              <div>
                <p className="text-white/80 font-medium text-sm mb-1">{card.title}</p>
                <h3 className="text-4xl font-bold tracking-tight">{card.value.toLocaleString()}</h3>
              </div>
              <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
                <card.icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Live Monitoring Section (Glassmorphism look) */}
      <div className="mt-8">
        <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
          <Activity className="w-5 h-5 text-indigo-500" />
          Status Ujian Berjalan
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {liveStats.map((item, idx) => (
            <div key={idx} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-shadow">
              <div className="flex items-center gap-4">
                <div className={clsx("p-4 rounded-full bg-opacity-10", item.color, item.textColor.replace('text-', 'bg-').replace('600', '100').replace('500', '100'))}>
                  <item.icon className={clsx("w-7 h-7", item.textColor)} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-500 mb-0.5">{item.title}</p>
                  <p className="text-3xl font-extrabold text-slate-800 tracking-tight leading-none">{item.value.toLocaleString()}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
    </div>
  );
}