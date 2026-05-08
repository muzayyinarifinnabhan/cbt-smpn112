import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import { toast } from 'sonner';
import { ChevronDown, Download, Award } from 'lucide-react';
import { clsx } from 'clsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default function GuruWaliRekap() {
  const { profile } = useAuthStore();
  const [loadingJadwal, setLoadingJadwal] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [jadwalList, setJadwalList] = useState([]);
  const [selectedJadwalId, setSelectedJadwalId] = useState('');
  
  const [hasilList, setHasilList] = useState([]);

  useEffect(() => {
    if (profile?.id) {
      fetchJadwal();
    }
  }, [profile]);

  useEffect(() => {
    if (selectedJadwalId) {
      fetchHasil(selectedJadwalId);
    } else {
      setHasilList([]);
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
          bank_soal(kkm, master_mapel(nama_mapel))
        `)
        .eq('guru_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setJadwalList(data || []);
      if (data && data.length > 0) {
        setSelectedJadwalId(data[0].id);
      }
    } catch (err) {
      toast.error('Gagal memuat daftar ujian: ' + err.message);
    } finally {
      setLoadingJadwal(false);
    }
  };

  const fetchHasil = async (jadwalId) => {
    setLoadingData(true);
    try {
      const jadwal = jadwalList.find(j => j.id === jadwalId);
      if (!jadwal?.kelas_id) return;

      const { data: hasil, error: hError } = await supabase
        .from('hasil_nilai')
        .select('*, profiles(nama_lengkap)')
        .eq('jadwal_ujian_id', jadwalId)
        .order('nilai_total', { ascending: false });

      if (hError) throw hError;

      let finalHasil = hasil || [];
      const { data: pesertaList } = await supabase
        .from('peserta_ujian')
        .select('id, nomor_peserta')
        .eq('kelas_id', jadwal.kelas_id);
        
      if (pesertaList) {
        finalHasil = finalHasil.map(h => {
          const p = pesertaList.find(pes => pes.id === h.siswa_id);
          return {
            ...h,
            peserta_ujian: { nomor_peserta: p?.nomor_peserta || '-' }
          };
        });
      }

      setHasilList(finalHasil);
    } catch (err) {
      toast.error('Gagal memuat hasil: ' + err.message);
    } finally {
      setLoadingData(false);
    }
  };

  const selectedJadwal = jadwalList.find(j => j.id === selectedJadwalId);
  const kkm = selectedJadwal?.bank_soal?.kkm || 70;
  const avgNilai = hasilList.length > 0
    ? (hasilList.reduce((sum, h) => sum + (h.nilai_total || 0), 0) / hasilList.length).toFixed(1)
    : 0;
  const lulusCount = hasilList.filter(h => h.nilai_total >= kkm).length;

  const exportToPDF = () => {
    if (hasilList.length === 0) {
      toast.error('Tidak ada data hasil nilai untuk diexport.');
      return;
    }

    const doc = new jsPDF();
    const mapel = selectedJadwal?.bank_soal?.master_mapel?.nama_mapel || 'Mapel';
    const kelasName = selectedJadwal?.master_kelas?.nama_kelas || 'Kelas';
    const namaUjian = selectedJadwal?.nama_ujian || 'Ujian';

    doc.setFontSize(16);
    doc.text(`Laporan Hasil Ujian - ${namaUjian}`, 14, 15);
    
    doc.setFontSize(10);
    doc.text(`Mata Pelajaran : ${mapel}`, 14, 23);
    doc.text(`Kelas          : ${kelasName}`, 14, 28);
    doc.text(`KKM            : ${kkm}`, 14, 33);
    doc.text(`Total Peserta  : ${hasilList.length} Siswa`, 14, 38);

    const tableColumn = ["No", "No. Peserta", "Nama Siswa", "Nilai PG", "Nilai Essay", "Nilai Total", "Keterangan"];
    const tableRows = [];

    hasilList.forEach((item, index) => {
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
  };

  return (
    <div className="min-h-full bg-[#f8fafc] animate-in fade-in duration-500">
      <div className="p-6 md:p-8">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-[28px] font-bold text-slate-800 tracking-tight leading-none mb-2">
              Rekap Ujian {selectedJadwal?.master_kelas ? `- Kelas ${selectedJadwal.master_kelas.nama_kelas}` : ''}
            </h1>
            <p className="text-[15px] font-medium text-slate-500">
              Lihat dan unduh rekapitulasi nilai akhir siswa
            </p>
          </div>
          
          <div className="flex items-center gap-3">
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

            <button 
              onClick={exportToPDF}
              disabled={hasilList.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-xl text-[14px] font-bold transition-all shadow-sm active:scale-95 whitespace-nowrap"
            >
              <Download className="w-4 h-4" />
              Cetak PDF
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        {selectedJadwalId && (
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[
              { label: 'Peserta', value: hasilList.length, color: 'text-slate-700', bg: 'bg-white', border: 'border-slate-200' },
              { label: 'Lulus', value: lulusCount, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
              { label: 'Rata-rata Nilai', value: avgNilai, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
            ].map(stat => (
              <div key={stat.label} className={clsx("rounded-2xl border p-5", stat.bg, stat.border)}>
                <p className={clsx("text-[32px] font-black leading-none", stat.color)}>{stat.value}</p>
                <p className="text-[13px] text-slate-500 font-semibold mt-2">{stat.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Tabel Hasil */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-[15px] font-bold text-slate-800">Rekap Nilai Siswa</h2>
            {selectedJadwal && (
              <div className="flex items-center gap-2 text-[12px] font-semibold text-slate-500">
                <Award className="w-4 h-4" />
                KKM: {kkm}
              </div>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-slate-500 text-[13px] font-semibold">
                  <th className="px-6 py-4">No</th>
                  <th className="px-6 py-4">No. Peserta</th>
                  <th className="px-6 py-4">Nama Siswa</th>
                  <th className="px-6 py-4 text-center">Nilai PG</th>
                  <th className="px-6 py-4 text-center">Nilai Essay</th>
                  <th className="px-6 py-4 text-center">Nilai Total</th>
                  <th className="px-6 py-4 text-center">Keterangan</th>
                </tr>
              </thead>
              <tbody>
                {!selectedJadwalId ? (
                  <tr><td colSpan="7" className="px-6 py-12 text-center text-slate-400">Silakan pilih jadwal ujian terlebih dahulu.</td></tr>
                ) : loadingData ? (
                  <tr><td colSpan="7" className="px-6 py-12 text-center text-slate-500">Memuat hasil nilai...</td></tr>
                ) : hasilList.length === 0 ? (
                  <tr><td colSpan="7" className="px-6 py-12 text-center text-slate-400">
                    Belum ada hasil nilai. Nilai akan muncul setelah siswa menyelesaikan ujian.
                  </td></tr>
                ) : hasilList.map((item, idx) => {
                  const lulus = item.nilai_total >= kkm;
                  return (
                    <tr key={item.id} className="hover:bg-slate-50 border-b border-slate-50 transition-colors">
                      <td className="px-6 py-4 text-[13px] text-slate-500 font-bold">{idx + 1}</td>
                      <td className="px-6 py-4 text-[12px] font-mono text-slate-600 font-semibold">
                        {item.peserta_ujian?.nomor_peserta || '-'}
                      </td>
                      <td className="px-6 py-4 text-[14px] font-semibold text-slate-800">{item.profiles?.nama_lengkap || '-'}</td>
                      <td className="px-6 py-4 text-center font-bold text-[14px] text-slate-700">{item.nilai_pg?.toFixed(0) ?? 0}</td>
                      <td className="px-6 py-4 text-center font-bold text-[14px] text-slate-700">{item.nilai_essay?.toFixed(0) ?? 0}</td>
                      <td className="px-6 py-4 text-center">
                        <span className={clsx("text-[16px] font-black", lulus ? "text-emerald-600" : "text-red-600")}>
                          {item.nilai_total?.toFixed(0) ?? 0}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={clsx("px-2.5 py-1 rounded-md text-[11px] font-bold",
                          lulus ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700")}>
                          {lulus ? 'LULUS' : 'REMIDI'}
                        </span>
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
