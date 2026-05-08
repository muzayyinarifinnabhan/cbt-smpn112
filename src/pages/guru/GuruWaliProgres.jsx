import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import { toast } from 'sonner';
import { ChevronDown, Users, CheckCircle2, Clock, MinusCircle } from 'lucide-react';

export default function GuruWaliProgres() {
  const { profile } = useAuthStore();
  const [loadingJadwal, setLoadingJadwal] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [jadwalList, setJadwalList] = useState([]);
  const [selectedJadwalId, setSelectedJadwalId] = useState('');
  
  const [stats, setStats] = useState({
    total: 0,
    selesai: 0,
    mengerjakan: 0,
    belum_mulai: 0
  });

  useEffect(() => {
    if (profile?.id) {
      fetchJadwal();
    }
  }, [profile]);

  useEffect(() => {
    if (selectedJadwalId) {
      fetchStats(selectedJadwalId);
    } else {
      setStats({ total: 0, selesai: 0, mengerjakan: 0, belum_mulai: 0 });
    }
  }, [selectedJadwalId]);

  const fetchJadwal = async () => {
    setLoadingJadwal(true);
    try {
      const { data, error } = await supabase
        .from('jadwal_ujian')
        .select(`
          id,
          nama_ujian,
          kelas_id,
          master_kelas(nama_kelas)
        `)
        .eq('guru_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setJadwalList(data || []);
      if (data && data.length > 0) {
        setSelectedJadwalId(data[0].id);
      }
    } catch (err) {
      toast.error('Gagal memuat daftar ujian: ' + err.message);
    } finally {
      setLoadingJadwal(false);
    }
  };

  const fetchStats = async (jadwalId) => {
    setLoadingData(true);
    try {
      const jadwal = jadwalList.find(j => j.id === jadwalId);
      if (!jadwal?.kelas_id) return;

      // 1. Get total students in class
      const { count: totalSiswa, error: cError } = await supabase
        .from('peserta_ujian')
        .select('*', { count: 'exact', head: true })
        .eq('kelas_id', jadwal.kelas_id);
        
      if (cError) throw cError;

      // 2. Get ujian_aktif to calculate progress
      const { data: activeSessions, error: hError } = await supabase
        .from('ujian_aktif')
        .select('status')
        .eq('jadwal_ujian_id', jadwalId);
        
      if (hError) throw hError;

      let selesai = 0;
      let mengerjakan = 0;

      (activeSessions || []).forEach(h => {
        if (h.status === 'selesai') selesai++;
        else if (h.status === 'sedang_ujian') mengerjakan++;
      });

      const belum = (totalSiswa || 0) - selesai - mengerjakan;

      setStats({
        total: totalSiswa || 0,
        selesai,
        mengerjakan,
        belum_mulai: belum > 0 ? belum : 0
      });

    } catch (err) {
      toast.error('Gagal memuat statistik: ' + err.message);
    } finally {
      setLoadingData(false);
    }
  };

  const selectedJadwal = jadwalList.find(j => j.id === selectedJadwalId);

  return (
    <div className="min-h-full bg-[#f8fafc] animate-in fade-in duration-500">
      <div className="p-6 md:p-8">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-[28px] font-bold text-slate-800 tracking-tight leading-none mb-2">
              Progres Ujian {selectedJadwal?.master_kelas ? `- Kelas ${selectedJadwal.master_kelas.nama_kelas}` : ''}
            </h1>
            <p className="text-[15px] font-medium text-slate-500">
              Ringkasan pengerjaan ujian siswa saat ini
            </p>
          </div>
          
          <div className="w-full md:w-80">
            <div className="relative">
              <select 
                value={selectedJadwalId}
                onChange={(e) => setSelectedJadwalId(e.target.value)}
                disabled={loadingJadwal || jadwalList.length === 0}
                className="w-full pl-4 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-slate-700 appearance-none shadow-sm disabled:opacity-50"
              >
                {loadingJadwal ? (
                  <option value="">Memuat daftar ujian...</option>
                ) : jadwalList.length === 0 ? (
                  <option value="">Belum ada jadwal ujian</option>
                ) : (
                  jadwalList.map(j => (
                    <option key={j.id} value={j.id}>
                      {j.nama_ujian} ({j.master_kelas?.nama_kelas})
                    </option>
                  ))
                )}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center justify-between transition-transform hover:-translate-y-1 duration-300">
            <div>
              <p className="text-[13px] font-bold text-slate-500 mb-1">Total Siswa</p>
              {loadingData ? (
                <div className="h-8 w-16 bg-slate-100 animate-pulse rounded" />
              ) : (
                <h3 className="text-3xl font-black text-slate-800">{stats.total}</h3>
              )}
            </div>
            <div className="w-14 h-14 rounded-2xl bg-blue-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
              <Users className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center justify-between transition-transform hover:-translate-y-1 duration-300">
            <div>
              <p className="text-[13px] font-bold text-slate-500 mb-1">Selesai</p>
              {loadingData ? (
                <div className="h-8 w-16 bg-slate-100 animate-pulse rounded" />
              ) : (
                <h3 className="text-3xl font-black text-slate-800">{stats.selesai}</h3>
              )}
            </div>
            <div className="w-14 h-14 rounded-2xl bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/30">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center justify-between transition-transform hover:-translate-y-1 duration-300">
            <div>
              <p className="text-[13px] font-bold text-slate-500 mb-1">Sedang Mengerjakan</p>
              {loadingData ? (
                <div className="h-8 w-16 bg-slate-100 animate-pulse rounded" />
              ) : (
                <h3 className="text-3xl font-black text-slate-800">{stats.mengerjakan}</h3>
              )}
            </div>
            <div className="w-14 h-14 rounded-2xl bg-amber-500 flex items-center justify-center text-white shadow-lg shadow-amber-500/30">
              <Clock className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center justify-between transition-transform hover:-translate-y-1 duration-300">
            <div>
              <p className="text-[13px] font-bold text-slate-500 mb-1">Belum Mulai</p>
              {loadingData ? (
                <div className="h-8 w-16 bg-slate-100 animate-pulse rounded" />
              ) : (
                <h3 className="text-3xl font-black text-slate-800">{stats.belum_mulai}</h3>
              )}
            </div>
            <div className="w-14 h-14 rounded-2xl bg-slate-600 flex items-center justify-center text-white shadow-lg shadow-slate-600/30">
              <MinusCircle className="w-6 h-6" />
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
