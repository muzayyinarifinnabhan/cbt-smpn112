import React, { useState, useEffect } from 'react';
import { ArrowLeft, Users, CheckCircle, Clock, RefreshCw, Key, Copy } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Link, useParams } from 'react-router-dom';
import { clsx } from 'clsx';
import { toast } from 'sonner';
import { generateRotatingToken, getSecondsUntilNextToken } from '../../utils/tokenUtils';

const SISWA_STATUS = {
  belum_mulai: { label: 'Belum Mulai', class: 'bg-slate-100 text-slate-500', dot: 'bg-slate-400' },
  sedang_ujian: { label: 'Sedang Mengerjakan', class: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' },
  selesai: { label: 'Selesai', class: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
};

export default function GuruMonitorUjian() {
  const { id } = useParams();
  const [jadwal, setJadwal] = useState(null);
  const [ujianAktifList, setUjianAktifList] = useState([]);
  const [pesertaKelas, setPesertaKelas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // Token state
  const [currentToken, setCurrentToken] = useState('');
  const [countdown, setCountdown] = useState(0);

  // Update token + countdown setiap detik
  useEffect(() => {
    const tick = () => {
      setCurrentToken(generateRotatingToken(id));
      setCountdown(getSecondsUntilNextToken());
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [id]);

  useEffect(() => {
    fetchJadwal();
  }, [id]);

  const fetchJadwal = async () => {
    const { data } = await supabase
      .from('jadwal_ujian')
      .select('*, bank_soal(kode_bank_soal, master_mapel(nama_mapel)), master_kelas(nama_kelas)')
      .eq('id', id)
      .single();
    setJadwal(data);
    if (data?.kelas_id) fetchPeserta(data.kelas_id);
  };

  const fetchPeserta = async (kelasId) => {
    setLoading(true);
    try {
      const { data: siswaList } = await supabase
        .from('peserta_ujian')
        .select('id, nomor_peserta, profiles(nama_lengkap)')
        .eq('kelas_id', kelasId);

      const { data: aktifList } = await supabase
        .from('ujian_aktif')
        .select('siswa_id, status, waktu_mulai_ujian, waktu_selesai_ujian, jawaban_pg, jawaban_essay')
        .eq('jadwal_ujian_id', id);

      setPesertaKelas(siswaList || []);
      setUjianAktifList(aktifList || []);
      setLastUpdate(new Date());
    } catch (err) {
      toast.error('Gagal memuat data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Supabase Realtime
  useEffect(() => {
    const channel = supabase
      .channel(`monitor-ujian-${id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'ujian_aktif',
        filter: `jadwal_ujian_id=eq.${id}`,
      }, (payload) => {
        setUjianAktifList(prev => {
          const updated = [...prev];
          const idx = updated.findIndex(u => u.siswa_id === payload.new?.siswa_id);
          if (idx >= 0) updated[idx] = payload.new;
          else if (payload.new) updated.push(payload.new);
          return updated;
        });
        setLastUpdate(new Date());
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id]);

  const mergedData = pesertaKelas.map(siswa => {
    const progress = ujianAktifList.find(u => u.siswa_id === siswa.id);
    const pgCount = progress?.jawaban_pg ? Object.keys(progress.jawaban_pg).length : 0;
    const essayCount = progress?.jawaban_essay ? Object.keys(progress.jawaban_essay).length : 0;
    return { ...siswa, status: progress?.status || 'belum_mulai', pgCount, essayCount };
  });

  const countByStatus = (s) => mergedData.filter(d => d.status === s).length;

  // Warna countdown: hijau > 60d, kuning 30-60d, merah <30d
  const countdownColor = countdown > 60 ? 'text-emerald-400' : countdown > 30 ? 'text-yellow-400' : 'text-red-400';
  const countdownBg = countdown > 60 ? 'bg-emerald-500/10 border-emerald-500/30' : countdown > 30 ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-red-500/10 border-red-500/30 animate-pulse';

  const formatCountdown = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div className="min-h-full bg-[#f8fafc] animate-in fade-in duration-500">
      <div className="p-6 md:p-8">

        {/* Header */}
        <div className="bg-white border border-slate-200 rounded-2xl px-6 py-5 flex items-center justify-between shadow-sm mb-6">
          <div className="flex items-center gap-4">
            <Link to="/guru/jadwal" className="p-2 hover:bg-slate-100 rounded-full transition-all text-slate-500">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-[18px] font-bold text-slate-800 leading-none">
                Monitor: {jadwal?.nama_ujian || '...'}
              </h1>
              <p className="text-[13px] text-slate-400 mt-0.5">
                {jadwal?.bank_soal?.master_mapel?.nama_mapel} · Kelas {jadwal?.master_kelas?.nama_kelas} · {jadwal?.durasi_menit} menit
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-slate-400">Update: {lastUpdate.toLocaleTimeString('id-ID')}</span>
            <button onClick={() => jadwal?.kelas_id && fetchPeserta(jadwal.kelas_id)}
              className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-all" title="Refresh manual">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* TOKEN PANEL — Pusat perhatian */}
        <div className="bg-slate-900 rounded-2xl p-6 mb-6 shadow-xl">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-yellow-400/20 border border-yellow-400/30 flex items-center justify-center">
                <Key className="w-6 h-6 text-yellow-400" />
              </div>
              <div>
                <p className="text-[12px] font-bold text-slate-400 uppercase tracking-widest">Token Aktif Saat Ini</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Berikan token ini ke siswa agar bisa masuk ujian</p>
              </div>
            </div>

            {/* Token Display */}
            <div className="flex-1 flex items-center justify-center">
              <div className="bg-slate-800 border border-slate-700 rounded-2xl px-10 py-5 flex items-center gap-6">
                <span className="text-[48px] font-black tracking-[0.3em] text-white font-mono">
                  {currentToken || '------'}
                </span>
                <button
                  onClick={() => { navigator.clipboard.writeText(currentToken); toast.success('Token disalin!'); }}
                  className="p-2.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-xl transition-all"
                  title="Salin token"
                >
                  <Copy className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Countdown */}
            <div className={clsx("border rounded-2xl px-6 py-4 text-center min-w-[120px]", countdownBg)}>
              <p className={clsx("text-[32px] font-black font-mono leading-none", countdownColor)}>
                {formatCountdown(countdown)}
              </p>
              <p className="text-[11px] text-slate-400 font-semibold mt-1.5">Token berubah dalam</p>
            </div>
          </div>

          {/* Progress bar countdown */}
          <div className="mt-4 w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className={clsx("h-full rounded-full transition-all duration-1000", 
                countdown > 60 ? "bg-emerald-500" : countdown > 30 ? "bg-yellow-500" : "bg-red-500"
              )}
              style={{ width: `${(countdown / (5 * 60)) * 100}%` }}
            ></div>
          </div>
          <p className="text-center text-[11px] text-slate-500 mt-2">
            🔄 Token berputar otomatis setiap 5 menit · Siswa harus memasukkan ulang jika keluar dari layar ujian
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Belum Mulai', count: countByStatus('belum_mulai'), icon: Clock, color: 'text-slate-500', bg: 'bg-slate-50', border: 'border-slate-200' },
            { label: 'Sedang Mengerjakan', count: countByStatus('sedang_ujian'), icon: Users, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
            { label: 'Selesai', count: countByStatus('selesai'), icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
          ].map(stat => (
            <div key={stat.label} className={clsx("rounded-2xl border p-5 flex items-center gap-4", stat.bg, stat.border)}>
              <div className={clsx("w-12 h-12 rounded-xl flex items-center justify-center bg-white shadow-sm", stat.color)}>
                <stat.icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[28px] font-black text-slate-800 leading-none">{stat.count}</p>
                <p className={clsx("text-[12px] font-semibold mt-1", stat.color)}>{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Tabel Siswa */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-[15px] font-bold text-slate-800">Daftar Peserta</h2>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
              <span className="text-[12px] font-semibold text-blue-600">Live Realtime</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-slate-500 text-[13px] font-semibold">
                  <th className="px-6 py-4">No. Peserta</th>
                  <th className="px-6 py-4">Nama Siswa</th>
                  <th className="px-6 py-4 text-center">Jawaban PG</th>
                  <th className="px-6 py-4 text-center">Jawaban Essay</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="5" className="px-6 py-12 text-center text-slate-500">Memuat data peserta...</td></tr>
                ) : mergedData.length === 0 ? (
                  <tr><td colSpan="5" className="px-6 py-12 text-center text-slate-400">Tidak ada peserta di kelas ini.</td></tr>
                ) : mergedData.map(siswa => {
                  const cfg = SISWA_STATUS[siswa.status] || SISWA_STATUS.belum_mulai;
                  return (
                    <tr key={siswa.id} className="hover:bg-slate-50 border-b border-slate-50 transition-colors">
                      <td className="px-6 py-4 text-[13px] font-mono font-bold text-slate-600">{siswa.nomor_peserta}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2.5">
                          <span className={clsx("w-2 h-2 rounded-full shrink-0", cfg.dot)}></span>
                          <span className="font-semibold text-[14px] text-slate-800">{siswa.profiles?.nama_lengkap}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center font-bold text-[14px] text-slate-700">{siswa.pgCount}</td>
                      <td className="px-6 py-4 text-center font-bold text-[14px] text-slate-700">{siswa.essayCount}</td>
                      <td className="px-6 py-4">
                        <span className={clsx("px-2.5 py-1 rounded-md text-[11px] font-bold", cfg.class)}>
                          {cfg.label}
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
