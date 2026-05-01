import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { BookOpen, Calendar, Users, Award, Bell } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { clsx } from 'clsx';

export default function GuruDashboard() {
  const { profile } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUjian: 0,
    ujianAktif: 0,
    totalPeserta: 0,
    rataNilai: 0
  });

  useEffect(() => {
    fetchStats();

    // Set up Realtime subscriptions for Jadwal Ujian and Hasil Nilai
    // Whenever an exam changes status, or a student finishes an exam, re-calculate the Guru's dashboard stats.
    const channel = supabase.channel('guru_dashboard_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jadwal_ujian' }, () => {
        fetchStats();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hasil_nilai' }, () => {
        fetchStats();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile]);

  const fetchStats = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      // Di aplikasi nyata, kueri ini digabungkan secara spesifik untuk `guru_id` di bank soal,
      // tetapi untuk kesederhanaan dan mengikuti placeholder, kita fetch semua aktivitas relevan (atau count)
      
      // 1. Total Ujian (Jadwal Ujian yang menggunakan bank soal milik guru ini)
      const { count: totalJadwal } = await supabase
        .from('jadwal_ujian')
        .select(`id, bank_soal!inner(guru_id)`, { count: 'exact', head: true })
        .eq('bank_soal.guru_id', profile.id);

      // 2. Ujian Aktif (Status 1 yang milik guru ini)
      const { count: aktifJadwal } = await supabase
        .from('jadwal_ujian')
        .select(`id, bank_soal!inner(guru_id)`, { count: 'exact', head: true })
        .eq('status', 1)
        .eq('bank_soal.guru_id', profile.id);

      // 3. Total Peserta (Siswa yang ikut ujian guru ini)
      // Ini agak kompleks dengan relasi tabel, sebagai placeholder/rataan kita hitung log ujian_aktif 
      // yang terikat ke jadwal ujian guru ini.
      const { data: allJadwal } = await supabase
        .from('jadwal_ujian')
        .select(`id, bank_soal!inner(guru_id)`)
        .eq('bank_soal.guru_id', profile.id);
        
      let pesertaCount = 0;
      let rataRata = 0;

      if (allJadwal && allJadwal.length > 0) {
        const jadwalIds = allJadwal.map(j => j.id);
        
        // Count peserta based on hasil_nilai for these exams
        const { data: hasilData } = await supabase
          .from('hasil_nilai')
          .select('nilai_total')
          .in('jadwal_ujian_id', jadwalIds);

        if (hasilData && hasilData.length > 0) {
           pesertaCount = hasilData.length;
           const totalNilai = hasilData.reduce((sum, row) => sum + Number(row.nilai_total || 0), 0);
           rataRata = Math.round(totalNilai / pesertaCount);
        }
      }

      setStats({
        totalUjian: totalJadwal || 0,
        ujianAktif: aktifJadwal || 0,
        totalPeserta: pesertaCount,
        rataNilai: rataRata
      });

    } catch (error) {
      console.error('Error fetching guru stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const cards = [
    {
      title: 'Total Ujian',
      value: stats.totalUjian,
      icon: BookOpen,
      color: 'bg-blue-500',
    },
    {
      title: 'Ujian Aktif',
      value: stats.ujianAktif,
      icon: Calendar,
      color: 'bg-green-500',
    },
    {
      title: 'Total Peserta',
      value: stats.totalPeserta,
      icon: Users,
      color: 'bg-purple-500',
    },
    {
      title: 'Rata-rata Nilai',
      value: stats.rataNilai,
      icon: Award,
      color: 'bg-orange-500',
    }
  ];

  return (
    <div className="min-h-full bg-[#f8fafc] animate-in fade-in duration-500 p-6 md:p-8">
      
      {/* Header section identical to screenshot */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-[28px] font-bold text-slate-800 tracking-tight leading-none mb-2">
            Dashboard Guru
          </h1>
          <p className="text-[15px] font-medium text-slate-500">
            Selamat datang, {profile?.nama_lengkap || 'Guru'}
          </p>
        </div>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, idx) => (
          <div 
            key={idx} 
            className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex items-center justify-between group hover:shadow-md transition-shadow"
          >
            <div className="flex flex-col gap-1">
              <span className="text-sm font-semibold text-slate-400">{card.title}</span>
              <span className="text-[32px] font-bold text-slate-800 leading-none">
                {loading ? (
                   <div className="h-8 w-12 bg-slate-100 animate-pulse rounded mt-1"></div>
                ) : (
                   card.value
                )}
              </span>
            </div>
            <div className={clsx("w-[60px] h-[60px] rounded-[20px] flex items-center justify-center text-white shadow-sm", card.color)}>
              <card.icon className="w-8 h-8 opacity-90" strokeWidth={2.5} />
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}