import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Download, Printer, Search, User, 
  BookOpen, FileText, ChevronRight, Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import { useConfirmStore } from '../../store/useConfirmStore';

export default function AdminSemuaNilai() {
  const { showConfirm } = useConfirmStore();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDeleting, setIsDeleting] = useState(null);

  useEffect(() => {
    fetchData();

    const channel = supabase.channel('semua-nilai-realtime')
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
      toast.error('Gagal memuat rekap nilai');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (item) => {
    showConfirm({
      title: 'Hapus Hasil Nilai?',
      message: `Hapus hasil nilai '${item.profiles.nama_lengkap}' pada ujian '${item.jadwal_ujian.nama_ujian}'? Sesi aktif siswa ini juga akan dihapus.`,
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

          // 2. Hapus ujian_aktif
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

  const handleExportCSV = () => {
    if (data.length === 0) return toast.error('Tidak ada data untuk diekspor');

    const headers = ['No Peserta', 'Nama', 'Ujian', 'Mapel', 'Benar', 'Salah', 'Kosong', 'Nilai'];
    const rows = data.map(item => [
      item.profiles?.username,
      item.profiles?.nama_lengkap,
      item.jadwal_ujian?.nama_ujian,
      item.jadwal_ujian?.bank_soal?.master_mapel?.nama_mapel,
      item.pg_benar,
      item.pg_salah,
      item.pg_kosong,
      item.nilai_total
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n"
      + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Rekap_Nilai_CBT_${new Date().toLocaleDateString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Data berhasil diekspor ke CSV');
  };

  const handlePrint = () => {
    window.print();
  };

  const filteredData = data.filter(item => 
    item.profiles?.nama_lengkap?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.profiles?.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.jadwal_ujian?.nama_ujian?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.jadwal_ujian?.bank_soal?.master_mapel?.nama_mapel?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-full p-4 md:p-8 animate-in fade-in duration-500 print:p-0">
      
      {/* Header Section (Hidden during print) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 print:hidden">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Semua Nilai</h1>
          <p className="text-slate-500 text-[14px] font-medium">Lihat semua nilai dari berbagai mata pelajaran</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleExportCSV}
            className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-all active:scale-95"
          >
            <Download className="w-4 h-4" />
            Download CSV
          </button>
          <button 
            onClick={handlePrint}
            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg transition-all active:scale-95"
          >
            <Printer className="w-4 h-4" />
            Cetak
          </button>
        </div>
      </div>

      {/* Print-only Header */}
      <div className="hidden print:block mb-8 text-center border-b-2 border-slate-800 pb-4">
        <h1 className="text-2xl font-bold uppercase">Laporan Rekapitulasi Nilai CBT</h1>
        <p className="text-sm font-medium">SMP Negeri 112 Jakarta</p>
        <p className="text-[10px] text-slate-500 mt-1">Dicetak pada: {new Date().toLocaleString('id-ID')}</p>
      </div>

      {/* Main Table Container */}
      <div className="bg-white border border-slate-200 rounded-[2.5rem] shadow-sm overflow-hidden print:border-none print:shadow-none">
        
        {/* Filter Bar (Hidden during print) */}
        <div className="p-8 border-b border-slate-50 print:hidden">
          <div className="relative max-w-md">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Cari peserta atau mapel..."
              className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-slate-400 text-[12px] font-black uppercase tracking-wider border-b border-slate-100 bg-slate-50/30 print:bg-slate-100">
                <th className="px-8 py-6">No Peserta</th>
                <th className="px-8 py-6">Nama</th>
                <th className="px-8 py-6 uppercase tracking-tighter">Ujian</th>
                <th className="px-8 py-6 uppercase tracking-tighter">Mapel</th>
                <th className="px-8 py-6 text-right">Nilai</th>
                <th className="px-8 py-6 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan="5" className="px-8 py-12 text-center text-slate-400 italic font-medium">Memproses rekapitulasi nilai...</td></tr>
              ) : filteredData.length === 0 ? (
                <tr><td colSpan="5" className="px-8 py-12 text-center text-slate-400 italic font-medium">Tidak ada data nilai ditemukan.</td></tr>
              ) : (
                filteredData.map((item) => (
                  <tr key={item.id} className="group hover:bg-slate-50/50 transition-colors print:break-inside-avoid">
                    <td className="px-8 py-6 text-[14px] font-black text-slate-800">{item.profiles?.username}</td>
                    <td className="px-8 py-6 text-[14px] font-bold text-slate-600 uppercase tracking-tight">
                      {item.profiles?.nama_lengkap}
                    </td>
                    <td className="px-8 py-6 text-[13px] font-medium text-slate-500">
                      {item.jadwal_ujian?.nama_ujian || '-'}
                    </td>
                    <td className="px-8 py-6 text-[13px] font-medium text-slate-500">
                      {item.jadwal_ujian?.bank_soal?.master_mapel?.nama_mapel || '-'}
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex items-center justify-end gap-4">
                        <span className={`inline-block px-4 py-1.5 font-black rounded-xl text-[15px] min-w-[50px] text-center shadow-sm ${
                          item.nilai_total >= 75 
                          ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                          : item.nilai_total >= 40 
                          ? 'bg-amber-50 text-amber-600 border border-amber-100'
                          : 'bg-red-50 text-red-600 border border-red-100'
                        }`}>
                          {item.nilai_total}
                        </span>
                        
                        <button 
                          onClick={() => handleDelete(item)}
                          disabled={isDeleting === item.id}
                          className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all active:scale-90 disabled:opacity-50"
                        >
                          {isDeleting === item.id ? (
                            <div className="w-4 h-4 border-2 border-red-200 border-t-red-500 rounded-full animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Print Footer */}
      <div className="hidden print:flex justify-between mt-12 px-8 italic text-[10px] text-slate-400">
        <div>* Laporan ini dihasilkan secara otomatis oleh Sistem CBT SMPN 112</div>
        <div>Halaman 1 dari 1</div>
      </div>
    </div>
  );
}
