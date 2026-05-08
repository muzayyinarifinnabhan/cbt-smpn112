import React, { useState, useEffect } from 'react';
import { 
  Trash2, Search, Filter, History as HistoryIcon, 
  User, BookOpen, Calendar, CheckSquare
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';

export default function AdminTotalUjian() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [search, setSearch] = useState('');
  const [isDeleting, setIsDeleting] = useState(null);

  useEffect(() => {
    fetchData();

    // Realtime for history
    const channel = supabase.channel('history-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hasil_nilai' }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch dari hasil_nilai joined with profiles and jadwal_ujian
      const { data: res, error } = await supabase
        .from('hasil_nilai')
        .select(`
          *,
          profiles (nama_lengkap, username),
          jadwal_ujian (
            nama_ujian,
            bank_soal (
              master_mapel (nama_mapel)
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setData(res || []);
    } catch (error) {
      toast.error('Gagal memuat riwayat ujian');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLog = async (item) => {
    if (!confirm(`Hapus seluruh riwayat ujian '${item.profiles.nama_lengkap}' pada ujian '${item.jadwal_ujian.nama_ujian}'? Data skor di menu Hasil Nilai juga akan hilang.`)) return;
    
    setIsDeleting(item.id);
    try {
      // 1. Hapus dari hasil_nilai
      const { error: err1 } = await supabase
        .from('hasil_nilai')
        .delete()
        .eq('id', item.id);
      
      if (err1) throw err1;

      // 2. Hapus dari ujian_aktif (log jawaban dan status)
      const { error: err2 } = await supabase
        .from('ujian_aktif')
        .delete()
        .eq('siswa_id', item.siswa_id)
        .eq('jadwal_ujian_id', item.jadwal_ujian_id);

      if (err2) throw err2;

      toast.success('Riwayat ujian berhasil dihapus permanen');
      fetchData(); // Refresh list
    } catch (error) {
      toast.error('Gagal menghapus riwayat');
      console.error(error);
    } finally {
      setIsDeleting(null);
    }
  };

  const filteredData = data.filter(item => 
    item.profiles?.nama_lengkap?.toLowerCase().includes(search.toLowerCase()) ||
    item.jadwal_ujian?.nama_ujian?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-full p-4 md:p-8 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-2xl px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2 tracking-tight uppercase">
            <HistoryIcon className="w-6 h-6 text-orange-500" />
            Total Riwayat Ujian
          </h1>
          <p className="text-sm text-slate-500 font-medium">Manajemen log pengerjaan siswa yang telah selesai</p>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        
        {/* Search Bar */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/20 flex flex-col sm:flex-row items-center gap-4">
          <div className="relative w-full max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Cari siswa atau nama ujian..." 
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/10 focus:border-orange-500 text-sm bg-white transition-all transition-all"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-[12px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-full">
               Total: {filteredData.length} Sesi
            </span>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-left border-collapse text-[13px]">
            <thead>
              <tr className="bg-white border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                <th className="px-6 py-4">Data Siswa</th>
                <th className="px-6 py-4">Nama Ujian</th>
                <th className="px-6 py-4">Mata Pelajaran</th>
                <th className="px-6 py-4 text-center">Skor</th>
                <th className="px-6 py-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan="5" className="px-6 py-12 text-center text-slate-400 italic">Memuat data riwayat...</td></tr>
              ) : filteredData.length === 0 ? (
                <tr><td colSpan="5" className="px-6 py-12 text-center text-slate-400 italic font-medium">Belum ada riwayat ujian pengerjaan.</td></tr>
              ) : (
                filteredData.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-700 uppercase">{item.profiles.nama_lengkap}</span>
                        <span className="text-[11px] text-slate-400 font-medium">@{item.profiles.username}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-600 tracking-tight">{item.jadwal_ujian.nama_ujian}</td>
                    <td className="px-6 py-4 font-medium text-slate-500">
                      {item.jadwal_ujian.bank_soal?.master_mapel?.nama_mapel || '-'}
                    </td>
                    <td className="px-6 py-4 text-center">
                       <span className={clsx(
                         "px-2.5 py-1 rounded-lg font-black text-[12px]",
                         item.nilai_total >= 70 ? "bg-emerald-50 text-emerald-600" : "bg-orange-50 text-orange-600"
                       )}>
                          {item.nilai_total}
                       </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button 
                        onClick={() => handleDeleteLog(item)}
                        disabled={isDeleting === item.id}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all active:scale-90 disabled:opacity-50"
                        title="Hapus Riwayat Ujian"
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
