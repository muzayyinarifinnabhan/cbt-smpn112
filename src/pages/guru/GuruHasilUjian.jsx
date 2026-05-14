import React, { useState, useEffect } from 'react';
import { ArrowLeft, Award, Download, RefreshCw, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Link, useParams } from 'react-router-dom';
import { clsx } from 'clsx';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default function GuruHasilUjian() {
  const { id } = useParams(); // jadwal_ujian id
  const [jadwal, setJadwal] = useState(null);
  const [hasilList, setHasilList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();

    // Subscribe to real-time changes on hasil_nilai for this specific exam
    const channel = supabase.channel(`guru-hasil-realtime-${id}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'hasil_nilai',
        filter: `jadwal_ujian_id=eq.${id}` 
      }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Info jadwal
      const { data: jadwalData } = await supabase
        .from('jadwal_ujian')
        .select('*, bank_soal(kode_bank_soal, kkm, pg_bobot, master_mapel(nama_mapel)), master_kelas(nama_kelas)')
        .eq('id', id)
        .single();
      setJadwal(jadwalData);

      // 2. Ambil Hasil Nilai & Profiles
      const { data: rawHasil, error: hErr } = await supabase
        .from('hasil_nilai')
        .select('*, profiles(nama_lengkap)')
        .eq('jadwal_ujian_id', id)
        .order('nilai_total', { ascending: false });

      if (hErr) throw hErr;

      // 3. Ambil SELURUH Data Peserta & Kelas
      // id di peserta_ujian = id profil siswa (tidak ada kolom siswa_id)
      const { data: pesertaList, error: pErr } = await supabase
        .from('peserta_ujian')
        .select('id, nomor_peserta, master_kelas(nama_kelas)');
      
      if (pErr) throw pErr;

      // 4. Mapping: siswa_id di hasil_nilai = id di peserta_ujian
      const mappedHasil = (rawHasil || []).map(h => {
        const p = pesertaList?.find(pl => pl.id === h.siswa_id);
        return {
          ...h,
          peserta_ujian: p || null
        };
      });

      setHasilList(mappedHasil);
    } catch (err) {
      console.error("Fetch Error:", err);
      toast.error('Gagal memuat hasil: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const kkm = jadwal?.bank_soal?.kkm || 70;
  const avgNilai = hasilList.length > 0
    ? (hasilList.reduce((sum, h) => sum + (h.nilai_total || 0), 0) / hasilList.length).toFixed(1)
    : 0;
  const lulusCount = hasilList.filter(h => h.nilai_total >= kkm).length;

  const handleRecalculate = async (item) => {
    try {
      const { data: session } = await supabase
        .from('ujian_aktif')
        .select('*')
        .eq('siswa_id', item.siswa_id)
        .eq('jadwal_ujian_id', id)
        .single();
      
      if (!session || !session.jawaban_pg) {
        toast.error('Data jawaban tidak ditemukan di server.');
        return;
      }

      const { data: soalList } = await supabase
        .from('soal')
        .select('id, kunci_jawaban')
        .eq('bank_soal_id', jadwal.bank_soal_id);
      
      let benar = 0;
      let salah = 0;
      let kosong = 0;
      const answers = session.jawaban_pg;

      soalList?.forEach(soal => {
        const jawabanSiswa = answers[soal.id]?.jawaban;
        if (!jawabanSiswa) kosong++;
        else if (jawabanSiswa.toString().toLowerCase() === soal.kunci_jawaban.toString().toLowerCase()) benar++;
        else salah++;
      });

      const dbBobot = Number(jadwal?.bank_soal?.pg_bobot || 0);
      const bobot = (dbBobot > 0) ? dbBobot : (100 / (soalList?.length || 1));
      const nilaiTotal = benar * bobot;

      await supabase.from('hasil_nilai').update({
        pg_benar: benar,
        pg_salah: salah,
        pg_kosong: kosong,
        nilai_pg: nilaiTotal,
        nilai_total: nilaiTotal
      }).eq('id', item.id);

      toast.success(`Berhasil menghitung ulang nilai ${item.profiles?.nama_lengkap}`);
      fetchData();
    } catch (err) {
      toast.error('Gagal hitung ulang: ' + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Yakin ingin menghapus hasil ini?')) return;
    await supabase.from('hasil_nilai').delete().eq('id', id);
    fetchData();
  };

  const exportToPDF = async () => {
    try {
      if (hasilList.length === 0) {
        toast.error('Tidak ada data hasil nilai untuk diexport.');
        return;
      }

      const doc = new jsPDF();
      const mapel = jadwal?.bank_soal?.master_mapel?.nama_mapel || 'Mapel';
      const kelasName = jadwal?.master_kelas?.nama_kelas || 'Kelas';
      const namaUjian = jadwal?.nama_ujian || 'Ujian';

      doc.setFontSize(16);
      doc.text(`Laporan Hasil Ujian - ${namaUjian}`, 14, 15);
      
      doc.setFontSize(10);
      doc.text(`Mata Pelajaran : ${mapel}`, 14, 23);
      doc.text(`Kelas          : ${kelasName}`, 14, 28);
      doc.text(`KKM            : ${kkm}`, 14, 33);
      doc.text(`Total Peserta  : ${hasilList.length} Siswa`, 14, 38);

      const tableColumn = ["No", "No. Peserta", "Nama Siswa", "Kelas", "Nilai PG", "Nilai Essay", "Nilai Total", "Keterangan"];
      const tableRows = [];

      hasilList.forEach((item, index) => {
        const lulusStatus = item.nilai_total >= kkm ? 'LULUS' : 'REMIDI';
        const rowData = [
          index + 1,
          item.peserta_ujian?.nomor_peserta || '-',
          item.profiles?.nama_lengkap || '-',
          item.peserta_ujian?.master_kelas?.nama_kelas || '-',
          item.nilai_pg?.toFixed(0) ?? 0,
          item.nilai_essay?.toFixed(0) ?? 0,
          item.nilai_total?.toFixed(0) ?? 0,
          lulusStatus
        ];
        tableRows.push(rowData);
      });

      doc.autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: 45,
        theme: 'grid',
        headStyles: { fillColor: [79, 70, 229] },
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
      toast.success('PDF berhasil dibuat');
    } catch (error) {
      console.error('PDF Error:', error);
      toast.error('Gagal membuat PDF: ' + error.message);
    }
  };

  return (
    <div className="min-h-full bg-[#f8fafc] animate-in fade-in duration-500">
      <div className="p-6 md:p-8">

        <div className="bg-white border border-slate-200 rounded-2xl px-6 py-5 flex items-center justify-between shadow-sm mb-6">
          <div className="flex items-center gap-4">
            <Link to="/guru/jadwal" className="p-2 hover:bg-slate-100 rounded-full transition-all text-slate-500">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-[18px] font-bold text-slate-800 leading-none">
                Hasil: {jadwal?.nama_ujian || '...'}
              </h1>
              <p className="text-[13px] text-slate-400 mt-0.5">
                {jadwal?.bank_soal?.master_mapel?.nama_mapel} · Kelas {jadwal?.master_kelas?.nama_kelas} · KKM: {kkm}
              </p>
            </div>
          </div>
          <button 
            onClick={exportToPDF}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-[13px] font-bold shadow-md transition-all active:scale-95"
          >
            <Download className="w-4 h-4" />
            Cetak PDF
          </button>
        </div>

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

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-[15px] font-bold text-slate-800">Rekap Nilai Siswa</h2>
            <div className="flex items-center gap-2 text-[12px] font-semibold text-slate-500">
              <Award className="w-4 h-4" />
              KKM: {kkm}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-slate-500 text-[13px] font-semibold">
                   <th className="px-6 py-4">No</th>
                  <th className="px-6 py-4">No. Peserta</th>
                  <th className="px-6 py-4">Nama Siswa</th>
                  <th className="px-6 py-4">Kelas</th>
                  <th className="px-6 py-4 text-center">Nilai PG</th>
                  <th className="px-6 py-4 text-center">Nilai Essay</th>
                  <th className="px-6 py-4 text-center">Nilai Total</th>
                  <th className="px-6 py-4 text-center">Keterangan</th>
                  <th className="px-6 py-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="9" className="px-6 py-12 text-center text-slate-500">Memuat hasil nilai...</td></tr>
                ) : hasilList.length === 0 ? (
                  <tr><td colSpan="9" className="px-6 py-12 text-center text-slate-400">
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
                      <td className="px-6 py-4 text-[14px] font-semibold text-slate-800">
                        {item.profiles?.nama_lengkap || '-'}
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-slate-100 text-slate-600 text-[11px] font-bold rounded uppercase">
                          {item.peserta_ujian?.master_kelas?.nama_kelas || '-'}
                        </span>
                      </td>
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
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button 
                            onClick={() => handleRecalculate(item)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                            title="Hitung Ulang Nilai"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(item.id)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">
                            <Trash2 className="w-4 h-4" />
                          </button>
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
