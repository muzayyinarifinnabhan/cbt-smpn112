import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Printer, ChevronDown, Users, 
  MapPin, BookOpen, Clock, FileText 
} from 'lucide-react';
import { toast } from 'sonner';

export default function AdminDaftarHadir() {
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  
  // Master Data State
  const [master, setMaster] = useState({
    mapel: [],
    kelas: [],
    ruangan: [],
    sesi: []
  });

  // Filter State
  const [filters, setFilters] = useState({
    mapel_id: '',
    kelas_id: '',
    ruangan_id: '',
    sesi_id: ''
  });

  const [peserta, setPeserta] = useState([]);

  useEffect(() => {
    fetchMasterData();
  }, []);

  useEffect(() => {
    fetchParticipants();
  }, [filters]);

  const fetchMasterData = async () => {
    try {
      const [m, k, r, s] = await Promise.all([
        supabase.from('master_mapel').select('id, nama_mapel').order('nama_mapel'),
        supabase.from('master_kelas').select('id, nama_kelas').order('nama_kelas'),
        supabase.from('master_ruangan').select('id, nama_ruangan').order('nama_ruangan'),
        supabase.from('master_sesi').select('id, nama_sesi').order('nama_sesi')
      ]);

      setMaster({
        mapel: m.data || [],
        kelas: k.data || [],
        ruangan: r.data || [],
        sesi: s.data || []
      });
    } catch (error) {
      toast.error('Gagal memuat data master');
    } finally {
      setLoading(false);
    }
  };

  const fetchParticipants = async () => {
    setFetching(true);
    try {
      let query = supabase
        .from('peserta_ujian')
        .select(`
          id,
          nomor_peserta,
          profiles (nama_lengkap),
          master_kelas (nama_kelas),
          master_ruangan (nama_ruangan),
          master_sesi (nama_sesi)
        `);

      if (filters.kelas_id) query = query.eq('kelas_id', filters.kelas_id);
      if (filters.ruangan_id) query = query.eq('ruangan_id', filters.ruangan_id);
      if (filters.sesi_id) query = query.eq('sesi_id', filters.sesi_id);

      const { data: res, error } = await query;
      if (error) throw error;
      
      setPeserta(res || []);
    } catch (error) {
      console.error(error);
    } finally {
      setFetching(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const currentMapel = master.mapel.find(m => m.id === filters.mapel_id)?.nama_mapel || 'Semua Mata Pelajaran';

  return (
    <div className="min-h-full p-4 md:p-8 animate-in fade-in duration-500 print:p-0">
      
      {/* Header Section (Hidden during print) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 print:hidden">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Daftar Hadir</h1>
          <p className="text-slate-500 text-[14px] font-medium">Cetak daftar hadir ujian</p>
        </div>
        <button 
          onClick={handlePrint}
          className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-8 py-3 rounded-xl text-sm font-bold shadow-lg transition-all active:scale-95"
        >
          <Printer className="w-4 h-4" />
          Cetak
        </button>
      </div>

      {/* Filter Bar (Modern 4-column like screenshot, Hidden during print) */}
      <div className="bg-white border border-slate-200 rounded-[2.5rem] shadow-sm p-8 mb-8 print:hidden">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <FilterSelect 
            label="Mata Pelajaran" 
            value={filters.mapel_id} 
            onChange={(v) => setFilters(f => ({...f, mapel_id: v}))}
            options={master.mapel.map(i => ({ value: i.id, label: i.nama_mapel }))}
            placeholder="Semua Mapel"
          />
          <FilterSelect 
            label="Kelas" 
            value={filters.kelas_id} 
            onChange={(v) => setFilters(f => ({...f, kelas_id: v}))}
            options={master.kelas.map(i => ({ value: i.id, label: i.nama_kelas }))}
            placeholder="Semua Kelas"
          />
          <FilterSelect 
            label="Ruang" 
            value={filters.ruangan_id} 
            onChange={(v) => setFilters(f => ({...f, ruangan_id: v}))}
            options={master.ruangan.map(i => ({ value: i.id, label: i.nama_ruangan }))}
            placeholder="Semua Ruang"
          />
          <FilterSelect 
            label="Sesi" 
            value={filters.sesi_id} 
            onChange={(v) => setFilters(f => ({...f, sesi_id: v}))}
            options={master.sesi.map(i => ({ value: i.id, label: i.nama_sesi }))}
            placeholder="Semua Sesi"
          />
        </div>
      </div>

      {/* Document Area (Formal Design) */}
      <div className="bg-white border border-slate-200 rounded-[2.5rem] shadow-sm p-12 min-h-[800px] print:border-none print:shadow-none print:p-0">
        
        {/* Document Header */}
        <div className="text-center mb-10">
          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-widest leading-none">Daftar Hadir Ujian</h2>
          <p className="text-lg font-bold text-slate-600 mt-2">SMP Negeri 112 Jakarta</p>
          <div className="w-40 h-[2px] bg-slate-900 mx-auto mt-4"></div>
          
          <div className="grid grid-cols-2 gap-4 mt-8 text-left max-w-2xl mx-auto text-[13px] font-bold text-slate-500 uppercase">
             <div>Mapel : <span className="text-slate-800">{currentMapel}</span></div>
             <div>Ruang : <span className="text-slate-800">{master.ruangan.find(r => r.id === filters.ruangan_id)?.nama_ruangan || '-'}</span></div>
             <div>Kelas : <span className="text-slate-800">{master.kelas.find(k => k.id === filters.kelas_id)?.nama_kelas || '-'}</span></div>
             <div>Sesi : <span className="text-slate-800">{master.sesi.find(s => s.id === filters.sesi_id)?.nama_sesi || '-'}</span></div>
          </div>
        </div>

        {/* Document Table */}
        <div className="overflow-hidden">
          <table className="w-full border-collapse border border-slate-300">
            <thead>
              <tr className="bg-slate-50 text-slate-600 text-[12px] font-black uppercase tracking-tight">
                <th className="border border-slate-300 px-4 py-4 w-12 text-center">No</th>
                <th className="border border-slate-300 px-6 py-4 text-left w-40">No Peserta</th>
                <th className="border border-slate-300 px-6 py-4 text-left">Nama</th>
                <th className="border border-slate-300 px-6 py-4 text-center w-24">Kelas</th>
                <th className="border border-slate-300 px-10 py-4 text-center w-48">Tanda Tangan</th>
              </tr>
            </thead>
            <tbody>
              {fetching ? (
                <tr><td colSpan="5" className="px-6 py-20 text-center text-slate-400 italic font-medium">Memuat daftar hadir...</td></tr>
              ) : peserta.length === 0 ? (
                <tr><td colSpan="5" className="px-6 py-20 text-center text-slate-300 italic font-medium">Tidak ada data peserta untuk kriteria ini.</td></tr>
              ) : (
                peserta.map((item, index) => (
                  <tr key={item.id} className="text-slate-700 font-medium">
                    <td className="border border-slate-300 px-4 py-4 text-center font-bold text-[13px]">{index + 1}</td>
                    <td className="border border-slate-300 px-6 py-4 font-black tracking-tight text-[14px]">{item.nomor_peserta}</td>
                    <td className="border border-slate-300 px-6 py-4 uppercase text-[13px]">{item.profiles?.nama_lengkap}</td>
                    <td className="border border-slate-300 px-6 py-4 text-center font-bold text-[13px]">{item.master_kelas?.nama_kelas}</td>
                    <td className="border border-slate-300 px-6 py-6 text-[10px] text-slate-300 italic flex items-end justify-start h-16">
                       {index % 2 === 0 ? `${index + 1}. .........` : ''}
                       {index % 2 !== 0 ? <div className="ml-auto text-right w-full">{index + 1}. .........</div> : ''}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Document Footer (Signature Area for Supervisor) */}
        <div className="mt-16 flex justify-end px-12">
           <div className="text-center">
             <div className="text-[13px] font-bold mb-20 uppercase tracking-wider">Pengawas Ruang,</div>
             <div className="w-48 h-[1px] bg-slate-900 mb-1"></div>
             <div className="text-[11px] font-bold text-slate-400 uppercase tracking-tighter">NIP. ............................</div>
           </div>
        </div>
      </div>
    </div>
  );
}

function FilterSelect({ label, value, onChange, options, placeholder }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-[12px] font-black text-slate-400 uppercase tracking-widest pl-1">{label}</label>
      <div className="relative group">
        <select 
          value={value} 
          onChange={(e) => onChange(e.target.value)}
          className="w-full pl-5 pr-10 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-[13px] text-slate-600 appearance-none cursor-pointer"
        >
          <option value="">{placeholder}</option>
          {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 pointer-events-none group-hover:text-slate-500 transition-colors" />
      </div>
    </div>
  );
}
