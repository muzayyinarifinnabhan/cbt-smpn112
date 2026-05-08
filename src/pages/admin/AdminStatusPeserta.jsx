import React, { useState, useEffect } from 'react';
import { 
  Users, CheckCircle, Clock, AlertCircle, 
  Search, RefreshCw, Smartphone, Monitor
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';

export default function AdminStatusPeserta() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [search, setSearch] = useState('');
  const [stats, setStats] = useState({
    total: 0,
    online: 0,
    mengerjakan: 0,
    selesai: 0
  });

  useEffect(() => {
    fetchData();

    // Subscribe to Realtime changes
    const channel = supabase
      .channel('status-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ujian_aktif' }, () => {
        fetchData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchData = async () => {
    try {
      // 1. Ambil semua profiles dengan role siswa
      const { data: students, error: pErr } = await supabase
        .from('profiles')
        .select(`
          id,
          nama_lengkap,
          username,
          last_seen,
          peserta_ujian (
            nomor_peserta,
            master_kelas (nama_kelas)
          ),
          ujian_aktif (status)
        `)
        .eq('role', 'siswa');

      if (pErr) throw pErr;

      // 2. Proses status
      const now = new Date();
      let total = 0, online = 0, mengerjakan = 0, selesai = 0;

      const processedData = (students || []).map(item => {
        total++;
        
        // Cek online (aktif dalam 5 menit terakhir)
        const lastSeen = item.last_seen ? new Date(item.last_seen) : null;
        const isOnline = lastSeen && (now - lastSeen) < 300000; // 5 menit = 300.000 ms
 
        // Cek status ujian (Ambil status terbaru dari ujian aktif manapun)
        const activeUjian = (item.ujian_aktif || [])[0];
        const ujianStatus = activeUjian?.status || 'offline';
 
        if (isOnline) online++;
        if (ujianStatus === 'sedang_ujian') mengerjakan++;
        if (ujianStatus === 'selesai') selesai++;
 
        let statusText = 'offline';
        let statusColor = 'bg-slate-100 text-slate-500';
 
        if (ujianStatus === 'sedang_ujian') {
          statusText = 'mengerjakan';
          statusColor = 'bg-yellow-100 text-yellow-600 border border-yellow-200';
        } else if (ujianStatus === 'selesai') {
          statusText = 'selesai';
          statusColor = 'bg-emerald-100 text-emerald-600 border border-emerald-200';
        } else if (isOnline) {
          statusText = 'online';
          statusColor = 'bg-blue-100 text-blue-600 border border-blue-200';
        }
 
        const pDetail = (item.peserta_ujian || [])[0];

        return {
          id: item.id,
          no_peserta: pDetail?.nomor_peserta || item.username,
          nama: item.nama_lengkap,
          kelas: pDetail?.master_kelas?.nama_kelas || '-',
          status: statusText,
          statusColor: statusColor
        };
      });

      setData(processedData);
      setStats({ total, online, mengerjakan, selesai });
    } catch (error) {
      console.error('Error fetching status:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredData = data.filter(item => 
    item.nama?.toLowerCase().includes(search.toLowerCase()) ||
    item.no_peserta?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-full p-4 md:p-8 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Status Peserta</h1>
          <p className="text-slate-500 text-[13px] font-medium">Pantau aktivitas peserta ujian secara real-time</p>
        </div>
        <button 
          onClick={() => { setLoading(true); fetchData(); }}
          className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 px-4 py-2 rounded-xl text-sm font-bold text-slate-600 shadow-sm transition-all active:scale-95"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard 
          icon={<Users className="w-5 h-5 text-blue-500" />}
          label="Total Peserta"
          value={stats.total}
          color="blue"
        />
        <StatCard 
          icon={<CheckCircle className="w-5 h-5 text-emerald-500" />}
          label="Online"
          value={stats.online}
          color="emerald"
        />
        <StatCard 
          icon={<Clock className="w-5 h-5 text-yellow-500" />}
          label="Sedang Ujian"
          value={stats.mengerjakan}
          color="yellow"
        />
        <StatCard 
          icon={<AlertCircle className="w-5 h-5 text-purple-500" />}
          label="Selesai"
          value={stats.selesai}
          color="purple"
        />
      </div>

      {/* Table Section */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden min-h-[400px]">
        <div className="p-6 border-b border-slate-100 bg-slate-50/30 flex items-center justify-between">
           <div className="relative w-full max-w-md">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
             <input 
               type="text"
               placeholder="Cari peserta..."
               className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm font-medium transition-all"
               value={search}
               onChange={(e) => setSearch(e.target.value)}
             />
           </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                <th className="px-6 py-4">No Peserta</th>
                <th className="px-6 py-4">Nama</th>
                <th className="px-6 py-4">Kelas</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center text-slate-400 text-sm font-medium italic">
                    Memproses data status...
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center text-slate-400 text-sm font-medium italic">
                    {search ? `Tidak ada hasil untuk "${search}"` : 'Belum ada data peserta.'}
                  </td>
                </tr>
              ) : (
                filteredData.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 text-[13px] font-bold text-slate-700">{item.no_peserta}</td>
                    <td className="px-6 py-4 text-[13px] font-medium text-slate-600">{item.nama}</td>
                    <td className="px-6 py-4 text-[13px] font-medium text-slate-500">{item.kelas}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-tight ${item.statusColor}`}>
                        {item.status}
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
  );
}

function StatCard({ icon, label, value, color }) {
  const colors = {
    blue: 'bg-blue-50 border-blue-100',
    emerald: 'bg-emerald-50 border-emerald-100',
    yellow: 'bg-yellow-50 border-yellow-100',
    purple: 'bg-purple-50 border-purple-100'
  };

  return (
    <div className={`p-6 rounded-3xl border-2 ${colors[color]} shadow-sm flex items-center gap-6`}>
      <div className="bg-white p-3 rounded-2xl shadow-sm">
        {icon}
      </div>
      <div>
        <div className="text-2xl font-black text-slate-800 leading-none mb-1">{value}</div>
        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</div>
      </div>
    </div>
  );
}
