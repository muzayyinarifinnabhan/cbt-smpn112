import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { Calendar, Users, Award, PlayCircle, List, Eye, ChevronRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { clsx } from 'clsx';
import { Link } from 'react-router-dom';

export default function GuruDashboard() {
  const { profile } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalBankSoal: 0, ujianAktif: 0, totalPeserta: 0, rataNilai: 0 });
  const [ujianAktifList, setUjianAktifList] = useState([]);

  useEffect(() => {
    if (profile?.id) {
      fetchStats();

      // Realtime subscription for guru dashboard
      const channel = supabase.channel(`guru-dashboard-${profile.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'ujian_aktif' }, () => {
          fetchStats();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'hasil_nilai' }, () => {
          fetchStats();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [profile]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      // 1. Total Bank Soal milik guru ini
      const { count: bsCount } = await supabase
        .from('bank_soal')
        .select('id', { count: 'exact', head: true })
        .eq('guru_id', profile.id);

      // 2. Jadwal ujian aktif milik guru ini + progress siswa
      const { data: aktifData } = await supabase
        .from('jadwal_ujian')
        .select(`
          id, 
          nama_ujian, 
          durasi_menit, 
          master_kelas(id, nama_kelas), 
          bank_soal(master_mapel(nama_mapel)),
          ujian_aktif(status)
        `)
        .eq('guru_id', profile.id)
        .eq('status_ujian', 'aktif');

      // Proses progress siswa untuk setiap ujian
      const processedAktif = (aktifData || []).map(exam => {
        const statuses = exam.ujian_aktif || [];
        const sedang = statuses.filter(s => s.status === 'sedang_ujian').length;
        const selesai = statuses.filter(s => s.status === 'selesai').length;
        return { ...exam, sedang, selesai };
      });

      setUjianAktifList(processedAktif);

      // 3. Hitung total peserta & rata-rata nilai dari semua jadwal guru ini
      const { data: allJadwal } = await supabase
        .from('jadwal_ujian')
        .select('id')
        .eq('guru_id', profile.id);

      let pesertaCount = 0;
      let rataRata = 0;
      if (allJadwal?.length > 0) {
        const ids = allJadwal.map(j => j.id);
        const { data: hasilData } = await supabase
          .from('hasil_nilai')
          .select('nilai_total')
          .in('jadwal_ujian_id', ids);
        if (hasilData?.length > 0) {
          pesertaCount = hasilData.length;
          rataRata = Math.round(hasilData.reduce((s, r) => s + Number(r.nilai_total || 0), 0) / pesertaCount);
        }
      }

      setStats({
        totalBankSoal: bsCount || 0,
        ujianAktif: aktifData?.length || 0,
        totalPeserta: pesertaCount,
        rataNilai: rataRata,
      });
    } catch (error) {
      console.error('Error fetching guru stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { title: 'Bank Soal', value: stats.totalBankSoal, icon: List, color: 'bg-blue-500', href: '/guru/soal' },
    { title: 'Ujian Aktif', value: stats.ujianAktif, icon: PlayCircle, color: 'bg-emerald-500', href: '/guru/jadwal' },
    { title: 'Total Peserta', value: stats.totalPeserta, icon: Users, color: 'bg-purple-500', href: '/guru/peserta' },
    { title: 'Rata-rata Nilai', value: stats.rataNilai, icon: Award, color: 'bg-orange-500', href: '/guru/nilai' },
  ];

  return (
    <div className="min-h-full bg-[#f8fafc] animate-in fade-in duration-500 p-6 md:p-8">
      
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-[28px] font-bold text-slate-800 tracking-tight leading-none mb-2">Dashboard Guru</h1>
        <p className="text-[15px] font-medium text-slate-500">
          Selamat datang, {profile?.nama_lengkap || 'Guru'} 👋
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {statCards.map((card, idx) => (
          <Link to={card.href} key={idx}
            className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex items-center justify-between group hover:shadow-md hover:border-slate-200 transition-all"
          >
            <div className="flex flex-col gap-1">
              <span className="text-[13px] font-semibold text-slate-400">{card.title}</span>
              <span className="text-[32px] font-bold text-slate-800 leading-none">
                {loading
                  ? <div className="h-8 w-12 bg-slate-100 animate-pulse rounded mt-1"></div>
                  : card.value
                }
              </span>
            </div>
            <div className={clsx("w-[56px] h-[56px] rounded-2xl flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform", card.color)}>
              <card.icon className="w-7 h-7 opacity-90" strokeWidth={2.5} />
            </div>
          </Link>
        ))}
      </div>

      {/* Ujian Aktif Sekarang */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-6">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <h2 className="text-[16px] font-bold text-slate-800">Ujian Aktif Sekarang</h2>
          </div>
          <Link to="/guru/jadwal" className="text-[13px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1">
            Lihat Semua <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {loading ? (
          <div className="px-6 py-8 text-center text-slate-400">Memuat...</div>
        ) : ujianAktifList.length === 0 ? (
          <div className="px-6 py-10 text-center text-slate-400">
            <Calendar className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p className="font-medium text-[14px]">Tidak ada ujian yang sedang aktif.</p>
            <p className="text-[12px] mt-1">Buka menu <b>Jadwal Ujian</b> untuk mengaktifkan ulangan.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {ujianAktifList.map(item => (
              <div key={item.id} className="flex flex-col md:flex-row md:items-center justify-between px-6 py-5 hover:bg-slate-50 transition-colors gap-4">
                <div>
                  <p className="font-bold text-[15px] text-slate-800">{item.nama_ujian}</p>
                  <p className="text-[12px] text-slate-500 mt-1">
                    {item.bank_soal?.master_mapel?.nama_mapel} · Kelas {item.master_kelas?.nama_kelas} · {item.durasi_menit} menit
                  </p>
                  <div className="flex items-center gap-4 mt-3">
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-tight">Sedang: <span className="text-blue-600">{item.sedang}</span></span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-tight">Selesai: <span className="text-emerald-600">{item.selesai}</span></span>
                    </div>
                  </div>
                </div>
                <Link to={`/guru/jadwal/monitor/${item.id}`}
                  className="flex items-center justify-center gap-1.5 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-[12px] font-bold hover:bg-blue-700 transition-all shadow-md active:scale-95"
                >
                  <Eye className="w-3.5 h-3.5" /> Monitor Live
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Shortcut Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { icon: List, label: 'Kelola Bank Soal', desc: 'Tambah & edit soal ujian', href: '/guru/soal', color: 'text-blue-600 bg-blue-50 border-blue-200' },
          { icon: Calendar, label: 'Jadwal Ulangan', desc: 'Buat & aktifkan ulangan harian', href: '/guru/jadwal', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
          { icon: Award, label: 'Hasil Nilai', desc: 'Lihat rekap nilai siswa', href: '/guru/nilai', color: 'text-purple-600 bg-purple-50 border-purple-200' },
        ].map(action => (
          <Link to={action.href} key={action.label}
            className="flex items-center gap-4 bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-md hover:border-slate-300 transition-all group"
          >
            <div className={clsx("w-12 h-12 rounded-xl flex items-center justify-center border", action.color)}>
              <action.icon className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-[14px] text-slate-800">{action.label}</p>
              <p className="text-[12px] text-slate-400 mt-0.5">{action.desc}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors shrink-0" />
          </Link>
        ))}
      </div>

    </div>
  );
}