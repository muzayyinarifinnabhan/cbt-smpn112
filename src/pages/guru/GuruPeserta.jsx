import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import { Search, Users } from 'lucide-react';
import { toast } from 'sonner';

export default function GuruPeserta() {
  const { profile } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [peserta, setPeserta] = useState([]);
  const [kelasFilter, setKelasFilter] = useState('');
  const [search, setSearch] = useState('');
  const [guruClasses, setGuruClasses] = useState([]);

  useEffect(() => {
    if (profile?.id) {
      fetchData();
    }
  }, [profile]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // 1. Dapatkan daftar kelas yang diajar guru ini (berdasarkan bank soal yang mereka buat)
      const { data: bankSoalData, error: bsError } = await supabase
        .from('bank_soal')
        .select('kelas_id, master_kelas(nama_kelas)')
        .eq('guru_id', profile.id);

      if (bsError) throw bsError;

      // Filter agar kelas tidak duplikat
      const uniqueClassesMap = new Map();
      bankSoalData?.forEach(bs => {
        if (bs.kelas_id && bs.master_kelas) {
          uniqueClassesMap.set(bs.kelas_id, bs.master_kelas.nama_kelas);
        }
      });

      const classesArray = Array.from(uniqueClassesMap, ([id, nama_kelas]) => ({ id, nama_kelas }));
      // Urutkan berdasarkan nama kelas
      classesArray.sort((a, b) => a.nama_kelas.localeCompare(b.nama_kelas));
      setGuruClasses(classesArray);

      // Jika guru belum membuat bank soal apapun, peserta kosong
      if (classesArray.length === 0) {
        setPeserta([]);
        setLoading(false);
        return;
      }

      const classIds = classesArray.map(c => c.id);

      // 2. Tarik data peserta yang berada di kelas-kelas tersebut
      const { data: pesertaData, error: pError } = await supabase
        .from('peserta_ujian')
        .select(`
          id,
          nomor_peserta,
          profiles(nama_lengkap),
          master_kelas(nama_kelas)
        `)
        .in('kelas_id', classIds)
        .order('nomor_peserta');

      if (pError) throw pError;
      
      setPeserta(pesertaData || []);
    } catch (error) {
      toast.error('Gagal memuat daftar peserta: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Logika Filter
  const filteredPeserta = peserta.filter(p => {
    const matchSearch = 
      p.nomor_peserta?.toLowerCase().includes(search.toLowerCase()) || 
      p.profiles?.nama_lengkap?.toLowerCase().includes(search.toLowerCase());
    
    const matchKelas = kelasFilter === '' || p.master_kelas?.nama_kelas === kelasFilter;
    
    return matchSearch && matchKelas;
  });

  return (
    <div className="min-h-full bg-[#f8fafc] animate-in fade-in duration-500">
      <div className="p-6 md:p-8">
        
        {/* Header Section */}
        <div className="mb-8">
          <h1 className="text-[28px] font-bold text-slate-800 tracking-tight leading-none mb-2">
            Peserta Ujian
          </h1>
          <p className="text-[15px] font-medium text-slate-500">
            Daftar peserta didik pada kelas yang Anda ajar
          </p>
        </div>

        {/* Content Section */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          
          {/* Toolbar */}
          <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row items-center gap-4">
            
            <div className="relative w-full md:w-[350px]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Cari siswa..."
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="w-full md:w-[250px] md:ml-auto">
              <select 
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 appearance-none text-[14px] cursor-pointer"
                value={kelasFilter}
                onChange={(e) => setKelasFilter(e.target.value)}
              >
                <option value="">Semua Kelas</option>
                {guruClasses.map(c => (
                  <option key={c.id} value={c.nama_kelas}>{c.nama_kelas}</option>
                ))}
              </select>
            </div>
            
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white border-b border-slate-100 text-slate-500 text-[13px] font-semibold">
                  <th className="px-6 py-4 w-[200px]">No. Peserta</th>
                  <th className="px-6 py-4">Nama</th>
                  <th className="px-6 py-4 w-[150px]">Kelas</th>
                  <th className="px-6 py-4 w-[150px] text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-12 text-center text-slate-500">Memuat data peserta...</td>
                  </tr>
                ) : filteredPeserta.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-400">
                        <Users className="w-12 h-12 mb-3 opacity-20" />
                        <p className="text-[14px] font-medium">Tidak ada peserta yang ditemukan.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredPeserta.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 border-b border-slate-50 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-800 text-[13px]">{item.nomor_peserta}</td>
                      <td className="px-6 py-4 text-[14px] font-semibold text-slate-600">{item.profiles?.nama_lengkap || '-'}</td>
                      <td className="px-6 py-4 text-[13px] text-slate-600">{item.master_kelas?.nama_kelas || '-'}</td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center justify-center px-3 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-500">
                          Offline
                        </span>
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
