import React, { useState, useEffect } from 'react';
import {
  Printer, Search, Filter, ArrowLeft,
  User, Hash, MapPin, Clock, Lock
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

export default function AdminCetakKartu() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);

  // Filter states
  const [selectedKelas, setSelectedKelas] = useState('');
  const [selectedSesi, setSelectedSesi] = useState('');

  // Master data for filters
  const [master, setMaster] = useState({ kelas: [], sesi: [] });

  useEffect(() => {
    fetchData();
    fetchMasterData();
  }, []);

  const fetchMasterData = async () => {
    try {
      const [k, s] = await Promise.all([
        supabase.from('master_kelas').select('*').order('nama_kelas'),
        supabase.from('master_sesi').select('*').order('nama_sesi')
      ]);
      setMaster({ kelas: k.data || [], sesi: s.data || [] });
    } catch (error) {
      console.error(error);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: res, error } = await supabase
        .from('peserta_ujian')
        .select(`
          *,
          profiles (nama_lengkap, username),
          master_kelas (nama_kelas),
          master_level (nama_level),
          master_sesi (nama_sesi),
          master_ruangan (nama_ruangan)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setData(res || []);
      setFilteredData(res || []);
    } catch (error) {
      toast.error('Gagal memuat data kartu peserta');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let result = data;
    if (selectedKelas) result = result.filter(d => d.kelas_id === selectedKelas);
    if (selectedSesi) result = result.filter(d => d.sesi_id === selectedSesi);
    setFilteredData(result);
  }, [selectedKelas, selectedSesi, data]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-full p-4 md:p-8">

      {/* Header - HIDDEN ON PRINT */}
      <div className="print:hidden">
        <div className="bg-white border border-slate-200 rounded-2xl px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm mb-6">
          <div className="flex items-center gap-4">
            <Link to="/admin/peserta" className="p-2 hover:bg-slate-100 rounded-full transition-all text-slate-500">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Printer className="w-5 h-5 text-blue-600" />
                Cetak Kartu Peserta
              </h1>
              <p className="text-sm text-slate-500 font-medium">Berdasarkan data {filteredData.length} peserta terpilih</p>
            </div>
          </div>
          <button
            onClick={handlePrint}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold transition-all shadow-md active:scale-95"
          >
            <Printer className="w-4 h-4" /> Cetak Sekarang
          </button>
        </div>

        {/* Filters - HIDDEN ON PRINT */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-wrap items-center gap-4 mb-8 shadow-sm">
          <div className="flex-1 min-w-[200px]">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 block ml-1">Filter Kelas</label>
            <select
              value={selectedKelas}
              onChange={(e) => setSelectedKelas(e.target.value)}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="">Semua Kelas</option>
              {master.kelas.map(k => <option key={k.id} value={k.id}>{k.nama_kelas}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 block ml-1">Filter Sesi</label>
            <select
              value={selectedSesi}
              onChange={(e) => setSelectedSesi(e.target.value)}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="">Semua Sesi</option>
              {master.sesi.map(s => <option key={s.id} value={s.id}>{s.nama_sesi}</option>)}
            </select>
          </div>
          <div className="h-10 border-l border-slate-200 hidden md:block"></div>
          <div className="text-slate-500 text-sm font-medium italic">
            Format: A4 - 2 Kartu Per Baris
          </div>
        </div>
      </div>

      {/* --- CARDS CONTAINER --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:grid-cols-2 print:gap-4 print:p-0">
        {filteredData.map((item, index) => (
          <div
            key={item.id}
            className="bg-white border-2 border-slate-800 rounded-lg overflow-hidden flex flex-col relative print:shadow-none print:break-inside-avoid"
            style={{ width: '100%', maxWidth: '450px', margin: '0 auto' }}
          >
            {/* Header Kartu */}
            <div className="p-3 border-b-2 border-slate-800 flex items-center gap-3 bg-slate-50">
              <img src="/logo.png" alt="Logo" className="w-12 h-12 object-contain" />
              <div className="flex flex-col text-center flex-1">
                <h4 className="text-[12px] font-black text-slate-900 border-b border-slate-300 pb-0.5 mb-0.5">KARTU PESERTA UJIAN ONLINE</h4>
                <h2 className="text-[14px] font-bold text-slate-800 uppercase leading-none">SMP NEGERI 112 JAKARTA</h2>
                <p className="text-[9px] text-slate-500 mt-1 capitalize italic font-bold">Jl. A1 Teluk Gong</p>
              </div>
            </div>

            {/* Body Kartu */}
            <div className="p-4 flex gap-4 bg-white relative">

              {/* Data Rows */}
              <div className="flex-1 space-y-2.5">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-400 uppercase leading-none mb-1">Nomor Peserta</span>
                  <span className="text-[14px] font-black text-blue-700 tracking-wider"># {item.nomor_peserta}</span>
                </div>

                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-400 uppercase leading-none mb-1">Nama Lengkap</span>
                  <span className="text-[13px] font-bold text-slate-800 uppercase truncate">{item.profiles?.nama_lengkap}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div className="flex flex-col border-l-2 border-slate-100 pl-2">
                    <span className="text-[9px] font-bold text-slate-400 uppercase mb-0.5">Kelas</span>
                    <span className="text-[11px] font-bold text-slate-700">{item.master_kelas?.nama_kelas || '-'}</span>
                  </div>
                  <div className="flex flex-col border-l-2 border-slate-100 pl-2">
                    <span className="text-[9px] font-bold text-slate-400 uppercase mb-0.5">Tingkat</span>
                    <span className="text-[11px] font-bold text-slate-700">{item.master_level?.nama_level || '-'}</span>
                  </div>
                </div>

                {/* Login Credentials Box */}
                <div className="bg-slate-900 rounded-md p-2 mt-3 flex justify-between items-center text-white">
                  <div>
                    <span className="text-[8px] block opacity-60 uppercase font-bold">Username</span>
                    <span className="text-[12px] font-mono font-bold tracking-wider">{item.profiles?.username}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[8px] block opacity-60 uppercase font-bold">Password</span>
                    <span className="text-[13px] font-mono font-black tracking-widest text-emerald-400">{item.password_plain}</span>
                  </div>
                </div>

                <div className="flex justify-between items-center bg-blue-50/50 p-1.5 rounded-md border border-blue-100 mt-2">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3 h-3 text-blue-500" />
                    <span className="text-[10px] font-bold text-slate-700">Sesi {item.master_sesi?.nama_sesi || '-'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3 h-3 text-blue-500" />
                    <span className="text-[10px] font-bold text-slate-700">Ruang {item.master_ruangan?.nama_ruangan || '-'}</span>
                  </div>
                </div>
              </div>

              {/* Foto Holder (3x4 aspect) */}
              <div className="flex flex-col items-center shrink-0">
                <div className="w-[85px] h-[115px] border-2 border-slate-200 rounded p-1 bg-white shadow-inner flex items-center justify-center relative overflow-hidden">
                  {item.foto_url ? (
                    <img src={item.foto_url} alt="Foto" className="w-full h-full object-cover rounded-[1px]" />
                  ) : (
                    <div className="text-center text-slate-200">
                      <User className="w-10 h-10 mx-auto opacity-30" />
                      <span className="text-[8px] font-bold uppercase opacity-30 mt-1 block leading-tight">Pas Foto<br />3 x 4</span>
                    </div>
                  )}
                  {/* Watermark/Stamp Placeholder */}
                  <div className="absolute bottom-0 right-0 w-8 h-8 rounded-full border-2 border-blue-500/20 m-1 flex items-center justify-center transform rotate-12">
                    <span className="text-[6px] text-blue-500/30 font-bold uppercase">SMPN 112</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Kartu */}
            <div className="px-3 py-1.5 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
              <span className="text-[8px] text-slate-400 italic">Dicetak secara sistem pada: {new Date().toLocaleDateString('id-ID')}</span>
              <div className="flex items-center gap-1">
                <div className="w-1 h-1 rounded-full bg-blue-500"></div>
                <span className="text-[10px] font-bold text-slate-800">CBT v1.0</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* --- GLOBAL PRINT STYLES --- */}
      <style dangerouslySetInnerHTML={{
        __html: `
        @media print {
          body {
            background: white !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          @page {
            size: A4;
            margin: 10mm;
          }
          .grid {
            display: grid !important;
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 15px !important;
          }
          .custom-scrollbar::-webkit-scrollbar {
            display: none;
          }
        }
      `}} />

    </div>
  );
}
