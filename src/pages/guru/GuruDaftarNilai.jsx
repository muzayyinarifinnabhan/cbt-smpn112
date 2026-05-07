import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { Search, Award, Calendar, ChevronRight, Download } from 'lucide-react';
import { clsx } from 'clsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default function GuruDaftarNilai() {
  const { profile } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (profile?.id) {
      fetchData();
    }
  }, [profile]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: res, error } = await supabase
        .from('jadwal_ujian')
        .select(`
          *,
          bank_soal(kode_bank_soal, master_mapel(nama_mapel)),
          master_kelas(nama_kelas)
        `)
        .eq('guru_id', profile.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setData(res || []);
    } catch (err) {
      toast.error('Gagal memuat data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const filtered = data.filter(d =>
    d.nama_ujian?.toLowerCase().includes(search.toLowerCase()) ||
    d.bank_soal?.master_mapel?.nama_mapel?.toLowerCase().includes(search.toLowerCase())
  );

  const handleDownloadPDF = async (jadwal) => {
    const toastId = toast.loading('Mengambil data hasil nilai...');
    try {
      // 1. Ambil Hasil Nilai
      const { data: hasil, error } = await supabase
        .from('hasil_nilai')
        .select('*, profiles(nama_lengkap)')
        .eq('jadwal_ujian_id', jadwal.id)
        .order('nilai_total', { ascending: false });

      if (error) throw error;
      
      if (!hasil || hasil.length === 0) {
        toast.error('Belum ada data nilai untuk ujian ini', { id: toastId });
        return;
      }

      // 2. Ambil Peserta Ujian berdasarkan kelas_id
      const { data: pesertaList } = await supabase
        .from('peserta_ujian')
        .select('siswa_id, nomor_peserta')
        .eq('kelas_id', jadwal.kelas_id);
        
      const finalHasil = hasil.map(h => {
        const p = pesertaList?.find(pes => pes.siswa_id === h.siswa_id);
        return {
          ...h,
          peserta_ujian: { nomor_peserta: p?.nomor_peserta || '-' }
        };
      });

      // 3. Generate PDF
      const doc = new jsPDF();
      const mapel = jadwal.bank_soal?.master_mapel?.nama_mapel || 'Mapel';
      const kelasName = jadwal.master_kelas?.nama_kelas || 'Kelas';
      const namaUjian = jadwal.nama_ujian || 'Ujian';
      const kkm = jadwal.bank_soal?.kkm || 70;

      // Header Laporan
      doc.setFontSize(16);
      doc.text(`Laporan Hasil Ujian - ${namaUjian}`, 14, 15);
      
      doc.setFontSize(10);
      doc.text(`Mata Pelajaran : ${mapel}`, 14, 23);
      doc.text(`Kelas          : ${kelasName}`, 14, 28);
      doc.text(`KKM            : ${kkm}`, 14, 33);
      doc.text(`Total Peserta  : ${finalHasil.length} Siswa`, 14, 38);

      const tableColumn = ["No", "No. Peserta", "Nama Siswa", "Nilai PG", "Nilai Essay", "Nilai Total", "Keterangan"];
      const tableRows = [];

      finalHasil.forEach((item, index) => {
        const lulus = item.nilai_total >= kkm ? 'LULUS' : 'REMIDI';
        const rowData = [
          index + 1,
          item.peserta_ujian?.nomor_peserta || '-',
          item.profiles?.nama_lengkap || '-',
          item.nilai_pg?.toFixed(0) ?? 0,
          item.nilai_essay?.toFixed(0) ?? 0,
          item.nilai_total?.toFixed(0) ?? 0,
          lulus
        ];
        tableRows.push(rowData);
      });

      doc.autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: 45,
        theme: 'grid',
        headStyles: { fillColor: [79, 70, 229] }, // indigo-600
        styles: { fontSize: 9, cellPadding: 3 },
        columnStyles: {
          0: { halign: 'center', cellWidth: 10 },
          1: { halign: 'center' },
          3: { halign: 'center' },
          4: { halign: 'center' },
          5: { halign: 'center', fontStyle: 'bold' },
          6: { halign: 'center', fontStyle: 'bold' }
        },
        didParseCell: function(data) {
          if (data.section === 'body' && data.column.index === 6) {
            if (data.cell.raw === 'REMIDI') {
              data.cell.styles.textColor = [220, 38, 38];
            } else {
              data.cell.styles.textColor = [5, 150, 105];
            }
          }
        }
      });

      const dateStr = new Date().toLocaleDateString('id-ID').replace(/\//g, '-');
      doc.save(`Hasil_Nilai_${kelasName}_${mapel}_${dateStr}.pdf`);

      toast.success('PDF berhasil diunduh', { id: toastId });
    } catch (err) {
      toast.error('Gagal membuat PDF: ' + err.message, { id: toastId });
    }
  };

  return (
    <div className="min-h-full bg-[#f8fafc] animate-in fade-in duration-500">
      <div className="p-6 md:p-8">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-[28px] font-bold text-slate-800 tracking-tight leading-none mb-2">Hasil Nilai Ujian</h1>
            <p className="text-[15px] font-medium text-slate-500">Pilih jadwal ujian untuk melihat rekapitulasi nilai siswa</p>
          </div>
        </div>

        {/* Table Card */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input type="text" placeholder="Cari nama ujian atau mapel..." value={search} onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-slate-500 text-[13px] font-semibold">
                  <th className="px-6 py-4">Nama Ujian</th>
                  <th className="px-6 py-4">Mata Pelajaran</th>
                  <th className="px-6 py-4">Kelas</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="5" className="px-6 py-12 text-center text-slate-500">Memuat data...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan="5" className="px-6 py-12 text-center text-slate-400">
                    <Calendar className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p className="font-medium">Belum ada jadwal ujian.</p>
                  </td></tr>
                ) : filtered.map(item => {
                  return (
                    <tr key={item.id} className="hover:bg-slate-50 border-b border-slate-50 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-800 text-[14px]">{item.nama_ujian}</td>
                      <td className="px-6 py-4 text-[13px] text-slate-600">
                        <div className="font-semibold">{item.bank_soal?.master_mapel?.nama_mapel || '-'}</div>
                      </td>
                      <td className="px-6 py-4 text-[13px] text-slate-600">{item.master_kelas?.nama_kelas || '-'}</td>
                      <td className="px-6 py-4">
                        <span className={clsx('px-2.5 py-1 rounded-md text-[12px] font-bold', 
                          item.status_ujian === 'selesai' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                        )}>
                          {item.status_ujian === 'selesai' ? 'Selesai' : 'Belum Selesai'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button 
                            onClick={() => handleDownloadPDF(item)}
                            className="p-2 border border-slate-200 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 hover:border-indigo-200 rounded-lg transition-colors"
                            title="Download PDF"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <Link to={`/guru/jadwal/hasil/${item.id}`}
                            className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors text-[13px] font-bold"
                            title="Lihat Hasil Nilai"
                          >
                            <Award className="w-4 h-4" />
                            Lihat Hasil
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
