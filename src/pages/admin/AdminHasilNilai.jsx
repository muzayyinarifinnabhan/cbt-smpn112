import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  BarChart3, Search, User, CheckCircle2, 
  XCircle, MinusCircle, ArrowDownAZ, 
  Filter, Download, ChevronDown, Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import { clsx } from 'clsx';
import { useConfirmStore } from '../../store/useConfirmStore';

export default function AdminHasilNilai() {
  const { showConfirm } = useConfirmStore();
  const [loading, setLoading] = useState(true);
  const [jadwalList, setJadwalList] = useState([]);
  const [selectedJadwal, setSelectedJadwal] = useState('');
  const [data, setData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState({ avg: 0, high: 0, low: 0 });
  const [isDeleting, setIsDeleting] = useState(null);

  useEffect(() => {
    fetchJadwalList();
  }, []);

  useEffect(() => {
    if (selectedJadwal) {
      fetchData();

      // Realtime subscription for results
      const channel = supabase.channel(`hasil-realtime-${selectedJadwal}`)
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'hasil_nilai',
          filter: `jadwal_ujian_id=eq.${selectedJadwal}` 
        }, () => {
          fetchData();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [selectedJadwal]);

  const fetchJadwalList = async () => {
    try {
      const { data: res } = await supabase
        .from('jadwal_ujian')
        .select('id, nama_ujian')
        .order('created_at', { ascending: false });
      
      setJadwalList(res || []);
      if (res?.length > 0) setSelectedJadwal(res[0].id);
    } catch (error) {
      toast.error('Gagal memuat daftar ujian');
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: res, error } = await supabase
        .from('hasil_nilai')
        .select(`
          *,
          profiles (nama_lengkap, username)
        `)
        .eq('jadwal_ujian_id', selectedJadwal);
      
      if (error) throw error;
      
      const results = res || [];
      setData(results);

      // Kalkulasi Stat
      if (results.length > 0) {
        const scores = results.map(r => Number(r.nilai_total));
        const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
        const high = Math.max(...scores);
        const low = Math.min(...scores);
        setStats({ avg: avg.toFixed(1), high, low });
      } else {
        setStats({ avg: 0, high: 0, low: 0 });
      }

    } catch (error) {
      toast.error('Gagal memuat hasil nilai');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (item) => {
    showConfirm({
      title: 'Hapus Hasil Nilai?',
      message: `Hapus hasil nilai '${item.profiles.nama_lengkap}'? Sesi ujian siswa ini juga akan dihapus agar siswa bisa mengulang jika diperlukan.`,
      confirmText: 'Ya, Hapus',
      cancelText: 'Batal',
      type: 'danger',
      onConfirm: async () => {
        setIsDeleting(item.id);
        try {
          // 1. Hapus hasil_nilai
          const { error: err1 } = await supabase
            .from('hasil_nilai')
            .delete()
            .eq('id', item.id);
          
          if (err1) throw err1;

          // 2. Hapus ujian_aktif (agar bisa ujian lagi jika admin mau)
          await supabase
            .from('ujian_aktif')
            .delete()
            .eq('siswa_id', item.siswa_id)
            .eq('jadwal_ujian_id', item.jadwal_ujian_id);

          toast.success('Hasil nilai berhasil dihapus');
          fetchData(); // Refresh list
        } catch (error) {
          toast.error('Gagal menghapus hasil nilai');
          console.error(error);
        } finally {
          setIsDeleting(null);
        }
      }
    });
  };

  const filteredData = data.filter(item => 
    item.profiles?.nama_lengkap?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.profiles?.username?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-full p-4 md:p-8 animate-in fade-in duration-500">
      
      {/* Header & Stats Cards (Modern Design like Screenshot) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Rata-rata */}
        <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm text-center flex flex-col items-center justify-center gap-1 group hover:border-blue-200 transition-all">
           <div className="text-4xl font-black text-blue-600 mb-1">{stats.avg}</div>
           <div className="text-[13px] font-bold text-slate-400 uppercase tracking-widest">Rata-rata</div>
        </div>
        {/* Tertinggi */}
        <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm text-center flex flex-col items-center justify-center gap-1 group hover:border-emerald-200 transition-all">
           <div className="text-4xl font-black text-emerald-600 mb-1">{stats.high}</div>
           <div className="text-[13px] font-bold text-slate-400 uppercase tracking-widest">Tertinggi</div>
        </div>
        {/* Terendah */}
        <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm text-center flex flex-col items-center justify-center gap-1 group hover:border-red-200 transition-all">
           <div className="text-4xl font-black text-red-600 mb-1">{stats.low}</div>
           <div className="text-[13px] font-bold text-slate-400 uppercase tracking-widest">Terendah</div>
        </div>
      </div>

      {/* Filter Section Container */}
      <div className="bg-white border border-slate-200 rounded-[2.5rem] shadow-sm overflow-hidden p-8">
        
        {/* Search & Filter Header */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative w-full md:w-80">
            <select 
              value={selectedJadwal}
              onChange={(e) => setSelectedJadwal(e.target.value)}
              className="w-full pl-6 pr-12 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-sm appearance-none text-slate-700 uppercase tracking-tight"
            >
              {jadwalList.map(j => (
                <option key={j.id} value={j.id}>{j.nama_ujian}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>

          <div className="relative flex-1">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Cari peserta..."
              className="w-full pl-12 pr-6 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Results Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-slate-400 text-[12px] font-black uppercase tracking-wider border-b border-slate-100">
                <th className="px-4 py-6">No Peserta</th>
                <th className="px-4 py-6">Nama</th>
                <th className="px-4 py-6 text-center">Benar</th>
                <th className="px-4 py-6 text-center">Salah</th>
                <th className="px-4 py-6 text-center">Kosong</th>
                <th className="px-4 py-6 text-center">Nilai</th>
                <th className="px-4 py-6 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan="6" className="px-4 py-12 text-center text-slate-400 italic font-medium">Memuat data hasil nilai...</td></tr>
              ) : filteredData.length === 0 ? (
                <tr><td colSpan="6" className="px-4 py-12 text-center text-slate-400 italic font-medium">Belum ada siswa yang menyelesaikan ujian ini.</td></tr>
              ) : (
                filteredData.map((item) => (
                  <tr key={item.id} className="group hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-6 text-[14px] font-black text-slate-700">{item.profiles?.username}</td>
                    <td className="px-4 py-6 text-[14px] font-bold text-slate-600 uppercase tracking-tight">
                      {item.profiles?.nama_lengkap}
                    </td>
                    <td className="px-4 py-6 text-center">
                      <div className="flex items-center justify-center gap-2 text-emerald-600 font-bold">
                        <CheckCircle2 className="w-4 h-4 opacity-80" />
                        {item.pg_benar}
                      </div>
                    </td>
                    <td className="px-4 py-6 text-center">
                      <div className="flex items-center justify-center gap-2 text-red-500 font-bold">
                        <XCircle className="w-4 h-4 opacity-80" />
                        {item.pg_salah}
                      </div>
                    </td>
                    <td className="px-4 py-6 text-center">
                      <div className="flex items-center justify-center gap-2 text-slate-400 font-bold">
                        <MinusCircle className="w-4 h-4 opacity-80" />
                        {item.pg_kosong}
                      </div>
                    </td>
                    <td className="px-4 py-6 text-center">
                      <span className="inline-block px-4 py-1.5 bg-red-50 text-red-600 font-black rounded-xl text-lg min-w-[60px] text-center shadow-sm">
                        {item.nilai_total}
                      </span>
                    </td>
                    <td className="px-4 py-6 text-center">
                       <button 
                        onClick={() => handleDelete(item)}
                        disabled={isDeleting === item.id}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all active:scale-90 disabled:opacity-50"
                      >
                        {isDeleting === item.id ? (
                          <div className="w-4 h-4 border-2 border-red-200 border-t-red-500 rounded-full animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
