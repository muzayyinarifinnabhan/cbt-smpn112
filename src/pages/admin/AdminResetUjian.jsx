import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  RefreshCcw, Search, User, FileText, 
  AlertCircle, ShieldAlert, CheckCircle, 
  Trash2, Filter, Clock
} from 'lucide-react';
import { toast } from 'sonner';

export default function AdminResetUjian() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [updating, setUpdating] = useState(null);

  useEffect(() => {
    fetchData();
    
    // Subscribe ke perubahan ujian_aktif untuk update real-time
    const subscription = supabase
      .channel('reset_updates')
      .on('postgres_changes', { event: '*', table: 'ujian_aktif', schema: 'public' }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const fetchData = async () => {
    try {
      const { data: res, error } = await supabase
        .from('ujian_aktif')
        .select(`
          *,
          profiles (nama_lengkap, username),
          jadwal_ujian (nama_ujian, token)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setData(res || []);
    } catch (error) {
      toast.error('Gagal memuat data sesi');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (sessionId) => {
    setUpdating(sessionId);
    try {
      const { error } = await supabase
        .from('ujian_aktif')
        .update({ 
          is_blocked: false,
          status: 'sedang_ujian' // Kembalikan ke sedang ujian jika sebelumnya terblokir
        })
        .eq('id', sessionId);

      if (error) throw error;
      toast.success('Login siswa berhasil di-reset');
    } catch (error) {
      toast.error('Gagal mereset login');
    } finally {
      setUpdating(null);
    }
  };

  const filteredData = data.filter(item => 
    item.profiles?.nama_lengkap?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.profiles?.username?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-full p-4 md:p-8 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Reset Login Siswa</h1>
          <p className="text-slate-500 text-[13px] font-medium">Buka blokir siswa yang terdeteksi keluar dari layar ujian</p>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-5">
           <div className="bg-red-50 p-3 rounded-2xl"><ShieldAlert className="w-6 h-6 text-red-600" /></div>
           <div>
             <div className="text-2xl font-black text-slate-800">{data.filter(i => i.is_blocked).length}</div>
             <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Terblokir</div>
           </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-5">
           <div className="bg-indigo-50 p-3 rounded-2xl"><Clock className="w-6 h-6 text-indigo-600" /></div>
           <div>
             <div className="text-2xl font-black text-slate-800">{data.filter(i => i.status === 'sedang_ujian').length}</div>
             <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sedang Ujian</div>
           </div>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white border border-slate-200 rounded-[2.5rem] shadow-sm overflow-hidden">
        {/* Search Bar */}
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Cari Nama Siswa atau No. Peserta..."
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 text-slate-400 text-[11px] font-black uppercase tracking-wider">
                <th className="px-8 py-5">Peserta</th>
                <th className="px-8 py-5">Ujian / Mapel</th>
                <th className="px-8 py-5 text-center">Pelanggaran</th>
                <th className="px-8 py-5">Status</th>
                <th className="px-8 py-5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan="5" className="px-8 py-12 text-center text-slate-400 italic">Memuat data sesi...</td></tr>
              ) : filteredData.length === 0 ? (
                <tr><td colSpan="5" className="px-8 py-12 text-center text-slate-400 italic">Tidak ada data sesi aktif.</td></tr>
              ) : (
                filteredData.map((item) => (
                  <tr key={item.id} className="group hover:bg-slate-50/50 transition-colors">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                         <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500 font-black">
                           {item.profiles?.nama_lengkap?.charAt(0)}
                         </div>
                         <div>
                           <div className="text-[14px] font-bold text-slate-800 leading-tight">{item.profiles?.nama_lengkap}</div>
                           <div className="text-[12px] text-slate-400 font-bold font-mono tracking-tighter uppercase">{item.profiles?.username}</div>
                         </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="text-[13px] font-bold text-slate-700">{item.jadwal_ujian?.nama_ujian}</div>
                      <div className="text-[11px] text-slate-400 font-medium">Token: <span className="font-black text-indigo-500 tracking-widest">{item.jadwal_ujian?.token}</span></div>
                    </td>
                    <td className="px-8 py-6 text-center">
                       <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg font-black text-sm ${
                         item.peringatan_nyontek >= 3 ? 'bg-red-100 text-red-600' : 
                         item.peringatan_nyontek > 0 ? 'bg-amber-100 text-amber-600' : 
                         'bg-slate-100 text-slate-400'
                       }`}>
                         {item.peringatan_nyontek}
                       </span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2">
                         {item.is_blocked ? (
                           <span className="flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-600 border border-red-100 rounded-full text-[10px] font-black uppercase tracking-wider animate-pulse">
                             <ShieldAlert className="w-3 h-3" />
                             Terblokir
                           </span>
                         ) : item.status === 'selesai' ? (
                           <span className="flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-600 border border-green-100 rounded-full text-[10px] font-black uppercase tracking-wider">
                             <CheckCircle className="w-3 h-3" />
                             Selesai
                           </span>
                         ) : (
                           <span className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-full text-[10px] font-black uppercase tracking-wider">
                             <Clock className="w-3 h-3 text-indigo-400" />
                             Aktif
                           </span>
                         )}
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                       <button 
                         onClick={() => handleReset(item.id)}
                         disabled={!item.is_blocked || updating === item.id || item.peringatan_nyontek >= 3}
                         className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-[12px] font-black transition-all active:scale-95 shadow-sm group ${
                           item.is_blocked && item.peringatan_nyontek < 3
                           ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-100' 
                           : 'bg-slate-100 text-slate-300 pointer-events-none'
                         }`}
                       >
                         <RefreshCcw className={`w-3.5 h-3.5 ${updating === item.id ? 'animate-spin' : ''}`} />
                         {item.peringatan_nyontek >= 3 ? 'LIMIT BLOKIR' : 'RESET LOGIN'}
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
