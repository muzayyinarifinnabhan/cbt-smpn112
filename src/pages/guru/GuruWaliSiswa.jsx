import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import { toast } from 'sonner';
import { Search, Users, ChevronDown, CheckCircle2, Clock, MinusCircle } from 'lucide-react';
import { clsx } from 'clsx';

export default function GuruWaliSiswa() {
  const { profile } = useAuthStore();
  const [loadingJadwal, setLoadingJadwal] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [jadwalList, setJadwalList] = useState([]);
  const [selectedJadwalId, setSelectedJadwalId] = useState('');
  
  const [studentsData, setStudentsData] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (profile?.id) {
      fetchJadwal();
    }
  }, [profile]);

  useEffect(() => {
    if (selectedJadwalId) {
      fetchStudentsData(selectedJadwalId);
    } else {
      setStudentsData([]);
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
          master_kelas(nama_kelas),
          bank_soal(master_mapel(nama_mapel))
        `)
        .eq('guru_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setJadwalList(data || []);
      
      // Auto select if only 1, or auto select the first one
      if (data && data.length > 0) {
        setSelectedJadwalId(data[0].id);
      }
    } catch (err) {
      toast.error('Gagal memuat daftar ujian: ' + err.message);
    } finally {
      setLoadingJadwal(false);
    }
  };

  const fetchStudentsData = async (jadwalId) => {
    setLoadingData(true);
    try {
      const jadwal = jadwalList.find(j => j.id === jadwalId);
      if (!jadwal?.kelas_id) return;

      // 1. Get all students in that class
      const { data: peserta, error: pError } = await supabase
        .from('peserta_ujian')
        .select('siswa_id, nomor_peserta, profiles(nama_lengkap)')
        .eq('kelas_id', jadwal.kelas_id);
        
      if (pError) throw pError;

      // 2. Get hasil_nilai for this jadwal to determine status
      const { data: hasil, error: hError } = await supabase
        .from('hasil_nilai')
        .select('siswa_id, waktu_mulai, waktu_selesai')
        .eq('jadwal_ujian_id', jadwalId);

      if (hError) throw hError;

      // Combine
      const combined = (peserta || []).map(p => {
        const h = hasil?.find(x => x.siswa_id === p.siswa_id);
        let status = 'Belum Mulai';
        if (h) {
          if (h.waktu_selesai) status = 'Selesai';
          else status = 'Sedang Mengerjakan';
        }

        return {
          id: p.siswa_id,
          nomor_peserta: p.nomor_peserta,
          nama: p.profiles?.nama_lengkap || 'Unknown',
          status: status
        };
      });

      // Sort by name
      combined.sort((a, b) => a.nama.localeCompare(b.nama));
      setStudentsData(combined);

    } catch (err) {
      toast.error('Gagal memuat data siswa: ' + err.message);
    } finally {
      setLoadingData(false);
    }
  };

  const selectedJadwal = jadwalList.find(j => j.id === selectedJadwalId);
  
  const filtered = studentsData.filter(s => 
    s.nama.toLowerCase().includes(search.toLowerCase()) || 
    s.nomor_peserta?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-full bg-[#f8fafc] animate-in fade-in duration-500">
      <div className="p-6 md:p-8">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-[28px] font-bold text-slate-800 tracking-tight leading-none mb-2">
              Siswa Ujian {selectedJadwal?.master_kelas ? `- Kelas ${selectedJadwal.master_kelas.nama_kelas}` : ''}
            </h1>
            <p className="text-[15px] font-medium text-slate-500">
              Pantau status pengerjaan siswa untuk setiap ujian Anda
            </p>
          </div>
          
          {/* Dropdown Pemilihan Ujian */}
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

        {/* Content Section */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          
          {/* Toolbar */}
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Cari siswa atau no peserta..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white border-b border-slate-100 text-slate-500 text-[13px] font-semibold">
                  <th className="px-6 py-4">No. Peserta</th>
                  <th className="px-6 py-4">Nama Lengkap</th>
                  <th className="px-6 py-4">Status Pengerjaan</th>
                </tr>
              </thead>
              <tbody>
                {!selectedJadwalId ? (
                  <tr><td colSpan="3" className="px-6 py-12 text-center text-slate-400">Silakan pilih jadwal ujian terlebih dahulu.</td></tr>
                ) : loadingData ? (
                  <tr><td colSpan="3" className="px-6 py-12 text-center text-slate-500">Memuat data siswa...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan="3" className="px-6 py-12 text-center text-slate-400">
                    <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p className="font-medium">Tidak ada data siswa ditemukan.</p>
                  </td></tr>
                ) : (
                  filtered.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 border-b border-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <span className="font-mono bg-slate-100 text-slate-600 px-3 py-1 rounded-lg text-[13px] font-black tracking-wider">
                          {item.nomor_peserta || '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-800 text-[14px]">{item.nama}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {item.status === 'Selesai' && (
                            <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[12px] font-bold w-fit">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Selesai
                            </span>
                          )}
                          {item.status === 'Sedang Mengerjakan' && (
                            <span className="flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-[12px] font-bold w-fit">
                              <Clock className="w-3.5 h-3.5" /> Mengerjakan
                            </span>
                          )}
                          {item.status === 'Belum Mulai' && (
                            <span className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-500 rounded-full text-[12px] font-bold w-fit">
                              <MinusCircle className="w-3.5 h-3.5" /> Belum Mulai
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

        </div>
      </div>
    </div>
  );
}
