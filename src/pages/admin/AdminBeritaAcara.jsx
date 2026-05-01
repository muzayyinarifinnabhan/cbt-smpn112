import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Printer, ChevronDown, FileText, 
  MapPin, Clock, Users, CheckCircle2 
} from 'lucide-react';
import { toast } from 'sonner';

export default function AdminBeritaAcara() {
  const [loading, setLoading] = useState(true);
  const [jadwalList, setJadwalList] = useState([]);
  const [selectedJadwal, setSelectedJadwal] = useState('');
  const [details, setDetails] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    hadir: 0,
    selesai: 0,
    tidak_hadir: 0
  });

  useEffect(() => {
    fetchJadwalList();
  }, []);

  useEffect(() => {
    if (selectedJadwal) {
      fetchDetailsAndStats();
      
      // Real-time Subscription untuk statistik
      const channel = supabase
        .channel('berita_acara_realtime')
        .on('postgres_changes', { 
          event: '*', 
          table: 'ujian_aktif', 
          schema: 'public',
          filter: `jadwal_ujian_id=eq.${selectedJadwal}`
        }, () => {
          fetchDetailsAndStats();
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
    } finally {
      setLoading(false);
    }
  };

  const fetchDetailsAndStats = async () => {
    try {
      // 1. Ambil Detail Jadwal
      const { data: jData } = await supabase
        .from('jadwal_ujian')
        .select(`
          *,
          bank_soal (
            id,
            master_mapel (nama_mapel),
            master_kelas (id, nama_kelas)
          )
        `)
        .eq('id', selectedJadwal)
        .single();
      
      if (!jData) return;
      setDetails(jData);

      // 2. Ambil Total Peserta (berdasarkan kelas di bank_soal)
      const { count: totalPeserta } = await supabase
        .from('peserta_ujian')
        .select('*', { count: 'exact', head: true })
        .eq('kelas_id', jData.bank_soal?.master_kelas?.id);

      // 3. Ambil Hadir & Selesai
      const { data: activeSessions } = await supabase
        .from('ujian_aktif')
        .select('status')
        .eq('jadwal_ujian_id', selectedJadwal);

      const hadir = activeSessions?.length || 0;
      const selesai = activeSessions?.filter(s => s.status === 'selesai').length || 0;
      const tidakHadir = (totalPeserta || 0) - hadir;

      setStats({
        total: totalPeserta || 0,
        hadir,
        selesai,
        tidak_hadir: tidakHadir > 0 ? tidakHadir : 0
      });

    } catch (error) {
      console.error(error);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Format Tanggal Hari Ini
  const today = new Date();
  const dayNames = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  const formattedDate = `${dayNames[today.getDay()]}, ${today.getDate()} ${monthNames[today.getMonth()]} ${today.getFullYear()}`;

  return (
    <div className="min-h-full p-4 md:p-8 animate-in fade-in duration-500 print:p-0">
      
      {/* Header Section (Hidden during print) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 print:hidden">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Berita Acara</h1>
          <p className="text-slate-500 text-[14px] font-medium">Cetak berita acara ujian</p>
        </div>
        <button 
          onClick={handlePrint}
          className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-8 py-3 rounded-xl text-sm font-bold shadow-lg transition-all active:scale-95"
        >
          <Printer className="w-4 h-4" />
          Cetak
        </button>
      </div>

      {/* Filter Bar (Hidden during print) */}
      <div className="bg-white border border-slate-200 rounded-[2.5rem] shadow-sm p-8 mb-8 print:hidden">
        <div className="relative max-w-sm">
          <label className="text-[12px] font-black text-slate-400 uppercase tracking-widest pl-1 mb-2 block">Pilih Jadwal Ujian</label>
          <div className="relative group">
            <select 
              value={selectedJadwal}
              onChange={(e) => setSelectedJadwal(e.target.value)}
              className="w-full pl-5 pr-12 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-sm text-slate-700 appearance-none cursor-pointer uppercase tracking-tight"
            >
              {jadwalList.map(j => <option key={j.id} value={j.id}>{j.nama_ujian}</option>)}
            </select>
            <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none group-hover:text-slate-600 transition-all" />
          </div>
        </div>
      </div>

      {/* Document Area (Formal Design) */}
      <div className="mx-auto max-w-4xl bg-white border border-slate-200 rounded-[2.5rem] shadow-sm p-16 print:border-none print:shadow-none print:p-0 print:max-w-none">
        
        {/* Document Header */}
        <div className="text-center mb-12 flex flex-col items-center">
          <img src="/logo.png" alt="Logo" className="w-16 h-16 mb-4 filter grayscale contrast-125" />
          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-[0.2em] leading-tight">Berita Acara Pelaksanaan Ujian</h2>
          <p className="text-lg font-bold text-slate-600">SMP Negeri 112 Jakarta</p>
          <div className="w-full h-[1px] bg-slate-900/10 mt-6 mb-8"></div>
        </div>

        {/* Introduction */}
        <div className="text-[15px] text-slate-800 leading-relaxed mb-8 font-medium">
          Pada hari ini, <span className="font-bold">{formattedDate}</span>, telah dilaksanakan ujian dengan rincian sebagai berikut:
        </div>

        {/* Info Table Like Design */}
        <div className="space-y-4 mb-12 text-[15px]">
          <InfoRow label="Nama Ujian" value={details?.nama_ujian} />
          <InfoRow label="Mata Pelajaran" value={details?.bank_soal?.master_mapel?.nama_mapel} />
          <InfoRow label="Kelas" value={details?.bank_soal?.master_kelas?.nama_kelas} />
          <InfoRow label="Durasi" value={`${details?.durasi_menit} menit`} />
          <div className="h-4"></div>
          <InfoRow label="Jumlah Peserta" value={`${stats.total} orang`} />
          <InfoRow label="Peserta Hadir" value={`${stats.hadir} orang`} />
          <InfoRow label="Peserta Selesai" value={`${stats.selesai} orang`} />
          <InfoRow label="Peserta Tidak Hadir" value={`${stats.tidak_hadir} orang`} />
        </div>

        <div className="text-[15px] text-slate-800 leading-relaxed mb-16 font-medium">
          Demikian berita acara ini dibuat dengan sebenar-benarnya.
        </div>

        {/* Signature Area */}
        <div className="grid grid-cols-2 gap-20 px-8">
           <div className="text-center flex flex-col items-center">
             <div className="text-[14px] font-black mb-24 uppercase tracking-widest">Pengawas Ujian</div>
             <div className="w-64 h-[1px] bg-slate-900/80 mb-1"></div>
             <div className="flex items-center gap-1">
                <div className="text-[14px]">(</div>
                <div className="w-56 h-0.5 border-b border-dotted border-slate-300"></div>
                <div className="text-[14px]">)</div>
             </div>
           </div>
           
           <div className="text-center flex flex-col items-center">
             <div className="text-[14px] font-black mb-24 uppercase tracking-widest">Koordinator Ujian</div>
             <div className="w-64 h-[1px] bg-slate-900/80 mb-1"></div>
             <div className="flex items-center gap-1">
                <div className="text-[14px]">(</div>
                <div className="w-56 h-0.5 border-b border-dotted border-slate-300"></div>
                <div className="text-[14px]">)</div>
             </div>
           </div>
        </div>

      </div>

      {/* Manual Space at bottom for printing */}
      <div className="h-20 print:hidden"></div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-start">
      <div className="w-48 font-bold text-slate-600 tracking-tight">{label}</div>
      <div className="w-4 text-center font-bold">:</div>
      <div className="flex-1 font-black text-slate-800 uppercase pl-2">{value || '-'}</div>
    </div>
  );
}
