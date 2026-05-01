import React, { useState, useEffect } from 'react';
import { Plus, Search, Eye, Trash2, X, Play, Square, Calendar, Clock, BookOpen, Users, ChevronRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { clsx } from 'clsx';
import { generateRotatingToken } from '../../utils/tokenUtils';
import { Key } from 'lucide-react';

const STATUS_CONFIG = {
  menunggu: { label: 'Menunggu', class: 'bg-amber-100 text-amber-700' },
  aktif:    { label: 'Aktif',    class: 'bg-emerald-100 text-emerald-700' },
  selesai:  { label: 'Selesai', class: 'bg-slate-100 text-slate-500' },
};

export default function GuruJadwalUjian() {
  const { profile } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [now, setNow] = useState(Date.now());

  // Update 'now' every 30 seconds to keep tokens fresh
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  // Referensi untuk form
  const [bankSoalList, setBankSoalList] = useState([]);
  const [kelasList, setKelasList] = useState([]);

  const [formData, setFormData] = useState({
    nama_ujian: '',
    bank_soal_id: '',
    kelas_id: '',
    durasi_menit: 60,
    waktu_mulai: '',
    waktu_selesai: '',
    acak_soal: true,
    acak_jawaban: true,
    hasil_tampil: false,
    status_ujian: 'menunggu',
  });

  useEffect(() => {
    if (profile?.id) {
      fetchData();
      fetchReferences();
    }
  }, [profile]);

  const fetchReferences = async () => {
    // Hanya ambil bank soal milik guru ini
    const { data: bs } = await supabase
      .from('bank_soal')
      .select('id, kode_bank_soal, master_mapel(nama_mapel), master_kelas(nama_kelas)')
      .eq('guru_id', profile.id);
    
    // Ambil kelas yang ada di bank soal guru ini saja
    const uniqueKelasMap = new Map();
    bs?.forEach(b => {
      if (b.kelas_id && b.master_kelas) {
        uniqueKelasMap.set(b.kelas_id, b.master_kelas.nama_kelas);
      }
    });

    setBankSoalList(bs || []);
    // Fetch all kelas for the class dropdown
    const { data: kl } = await supabase.from('master_kelas').select('*').order('nama_kelas');
    setKelasList(kl || []);
  };

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

  const resetForm = () => {
    setFormData({
      nama_ujian: '', bank_soal_id: '', kelas_id: '',
      durasi_menit: 60, waktu_mulai: '', waktu_selesai: '',
      acak_soal: true, acak_jawaban: true, hasil_tampil: false,
      status_ujian: 'menunggu',
    });
    setIsEdit(false);
    setSelectedId(null);
  };

  const handleOpenAdd = () => { resetForm(); setShowModal(true); };

  const handleOpenEdit = (item) => {
    setFormData({
      nama_ujian: item.nama_ujian || '',
      bank_soal_id: item.bank_soal_id || '',
      kelas_id: item.kelas_id || '',
      durasi_menit: item.durasi_menit || 60,
      waktu_mulai: item.waktu_mulai ? item.waktu_mulai.slice(0, 16) : '',
      waktu_selesai: item.waktu_selesai ? item.waktu_selesai.slice(0, 16) : '',
      acak_soal: item.acak_soal ?? true,
      acak_jawaban: item.acak_jawaban ?? true,
      hasil_tampil: item.hasil_tampil ?? false,
      status_ujian: item.status_ujian || 'menunggu',
    });
    setSelectedId(item.id);
    setIsEdit(true);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...formData, guru_id: profile.id };
      if (isEdit) {
        const { error } = await supabase.from('jadwal_ujian').update(payload).eq('id', selectedId);
        if (error) throw error;
        toast.success('Jadwal berhasil diperbarui!');
      } else {
        const { error } = await supabase.from('jadwal_ujian').insert([payload]);
        if (error) throw error;
        toast.success('Jadwal ulangan berhasil dibuat!');
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      toast.error('Gagal menyimpan: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (item) => {
    const newStatus = item.status_ujian === 'aktif' ? 'selesai' : 
                      item.status_ujian === 'menunggu' ? 'aktif' : 'selesai';
    const confirmMsg = newStatus === 'aktif' 
      ? `Aktifkan ujian "${item.nama_ujian}"? Siswa akan bisa mulai mengerjakan.`
      : `Tutup ujian "${item.nama_ujian}"? Siswa tidak bisa lagi mengerjakan.`;
    if (!window.confirm(confirmMsg)) return;
    try {
      const { error } = await supabase.from('jadwal_ujian').update({ status_ujian: newStatus }).eq('id', item.id);
      if (error) throw error;
      toast.success(newStatus === 'aktif' ? '✅ Ujian diaktifkan! Siswa sudah bisa mengerjakan.' : '🔒 Ujian ditutup.');
      fetchData();
    } catch (err) {
      toast.error('Gagal mengubah status: ' + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Yakin ingin menghapus jadwal ini?')) return;
    try {
      const { error } = await supabase.from('jadwal_ujian').delete().eq('id', id);
      if (error) throw error;
      toast.success('Jadwal dihapus.');
      fetchData();
    } catch (err) {
      toast.error('Gagal menghapus: ' + err.message);
    }
  };

  const filtered = data.filter(d =>
    d.nama_ujian?.toLowerCase().includes(search.toLowerCase()) ||
    d.bank_soal?.master_mapel?.nama_mapel?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-full bg-[#f8fafc] animate-in fade-in duration-500">
      <div className="p-6 md:p-8">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-[28px] font-bold text-slate-800 tracking-tight leading-none mb-2">Jadwal Ujian</h1>
            <p className="text-[15px] font-medium text-slate-500">Kelola ulangan harian untuk kelas Anda</p>
          </div>
          <button onClick={handleOpenAdd} className="flex items-center gap-2 px-6 py-2.5 bg-[#2653D8] hover:bg-blue-700 text-white rounded-lg text-[14px] font-bold transition-all shadow-sm active:scale-95">
            <Plus className="w-5 h-5" />
            Buat Jadwal Ulangan
          </button>
        </div>

        {/* Table Card */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input type="text" placeholder="Cari jadwal ujian..." value={search} onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-slate-500 text-[13px] font-semibold">
                  <th className="px-6 py-4">Nama Ujian</th>
                  <th className="px-6 py-4">Bank Soal / Mapel</th>
                  <th className="px-6 py-4">Kelas</th>
                  <th className="px-6 py-4">Durasi</th>
                  <th className="px-6 py-4">Token Aktif</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="6" className="px-6 py-12 text-center text-slate-500">Memuat data...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan="6" className="px-6 py-12 text-center text-slate-400">
                    <Calendar className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p className="font-medium">Belum ada jadwal. Klik "Buat Jadwal Ulangan" untuk memulai.</p>
                  </td></tr>
                ) : filtered.map(item => {
                  const statusCfg = STATUS_CONFIG[item.status_ujian] || STATUS_CONFIG.menunggu;
                  return (
                    <tr key={item.id} className="hover:bg-slate-50 border-b border-slate-50 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-800 text-[14px]">{item.nama_ujian}</td>
                      <td className="px-6 py-4 text-[13px] text-slate-600">
                        <div className="font-semibold">{item.bank_soal?.master_mapel?.nama_mapel || '-'}</div>
                        <div className="text-slate-400 text-[11px]">{item.bank_soal?.kode_bank_soal}</div>
                      </td>
                      <td className="px-6 py-4 text-[13px] text-slate-600">{item.master_kelas?.nama_kelas || '-'}</td>
                      <td className="px-6 py-4 text-[13px] text-slate-600">{item.durasi_menit} menit</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 font-mono font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-lg w-fit">
                          <Key className="w-3 h-3" />
                          {generateRotatingToken(item.id)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={clsx('px-2.5 py-1 rounded-md text-[12px] font-bold', statusCfg.class)}>
                          {statusCfg.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Aktifkan / Tutup */}
                          {item.status_ujian !== 'selesai' && (
                            <button onClick={() => handleToggleStatus(item)}
                              className={clsx("p-2 rounded-lg border transition-colors text-[11px] font-bold flex items-center gap-1",
                                item.status_ujian === 'aktif'
                                  ? "border-red-200 text-red-600 hover:bg-red-50"
                                  : "border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                              )}
                              title={item.status_ujian === 'aktif' ? 'Tutup Ujian' : 'Aktifkan Ujian'}
                            >
                              {item.status_ujian === 'aktif' ? <Square className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                            </button>
                          )}
                          {/* Monitor */}
                          <Link to={`/guru/jadwal/monitor/${item.id}`}
                            className="p-2 border border-slate-200 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Monitor Real-time"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          {/* Hasil Nilai */}
                          <Link to={`/guru/jadwal/hasil/${item.id}`}
                            className="p-2 border border-slate-200 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Lihat Hasil Nilai"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </Link>
                          {/* Hapus */}
                          {item.status_ujian === 'menunggu' && (
                            <button onClick={() => handleDelete(item.id)}
                              className="p-2 border border-slate-200 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Hapus"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
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

      {/* MODAL BUAT/EDIT JADWAL */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-[700px] max-h-[90vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 shrink-0">
              <h2 className="text-[18px] font-bold text-slate-800">{isEdit ? 'Edit Jadwal' : 'Buat Jadwal Ulangan Harian'}</h2>
              <button onClick={() => setShowModal(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
              <div className="px-6 py-6 overflow-y-auto flex-1 space-y-6">

                <div className="space-y-1.5">
                  <label className="text-[14px] font-bold text-slate-800">Nama Ujian</label>
                  <input required type="text" placeholder="Contoh: UH 1 - Bab Aljabar"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg outline-none focus:border-blue-600 text-[14px]"
                    value={formData.nama_ujian} onChange={e => setFormData({...formData, nama_ujian: e.target.value})} />
                </div>

                {isEdit && (
                  <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                        <Key className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[12px] font-bold text-blue-600 uppercase tracking-wider">Token Saat Ini</p>
                        <p className="text-[11px] text-blue-400">Berikan ke siswa untuk masuk ujian</p>
                      </div>
                    </div>
                    <span className="text-[24px] font-black font-mono text-blue-700 tracking-widest">
                      {generateRotatingToken(selectedId)}
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[14px] font-bold text-slate-800">Bank Soal (Mapel)</label>
                    <select required className="w-full px-4 py-2.5 border border-slate-200 rounded-lg outline-none focus:border-blue-600 text-[14px]"
                      value={formData.bank_soal_id} onChange={e => setFormData({...formData, bank_soal_id: e.target.value})}>
                      <option value="">Pilih Bank Soal</option>
                      {bankSoalList.map(b => (
                        <option key={b.id} value={b.id}>
                          {b.master_mapel?.nama_mapel} — {b.kode_bank_soal}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[14px] font-bold text-slate-800">Kelas</label>
                    <select required className="w-full px-4 py-2.5 border border-slate-200 rounded-lg outline-none focus:border-blue-600 text-[14px]"
                      value={formData.kelas_id} onChange={e => setFormData({...formData, kelas_id: e.target.value})}>
                      <option value="">Pilih Kelas</option>
                      {kelasList.map(k => <option key={k.id} value={k.id}>{k.nama_kelas}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[14px] font-bold text-slate-800">Durasi (menit)</label>
                    <input type="number" min="5" required
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-lg outline-none focus:border-blue-600 text-[14px]"
                      value={formData.durasi_menit} onChange={e => setFormData({...formData, durasi_menit: parseInt(e.target.value) || 60})} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[14px] font-bold text-slate-800">Waktu Mulai</label>
                    <input type="datetime-local"
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-lg outline-none focus:border-blue-600 text-[14px]"
                      value={formData.waktu_mulai} onChange={e => setFormData({...formData, waktu_mulai: e.target.value})} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[14px] font-bold text-slate-800">Waktu Selesai</label>
                    <input type="datetime-local"
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-lg outline-none focus:border-blue-600 text-[14px]"
                      value={formData.waktu_selesai} onChange={e => setFormData({...formData, waktu_selesai: e.target.value})} />
                  </div>
                </div>

                {/* Opsi */}
                <div>
                  <p className="text-[14px] font-bold text-slate-800 mb-3">Opsi Ujian</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {[
                      { key: 'acak_soal', label: 'Acak Soal' },
                      { key: 'acak_jawaban', label: 'Acak Jawaban' },
                      { key: 'hasil_tampil', label: 'Tampilkan Hasil ke Siswa' },
                    ].map(opt => (
                      <label key={opt.key} className="flex items-center gap-2.5 cursor-pointer p-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                        <input type="checkbox" className="w-4 h-4 text-blue-600 rounded"
                          checked={formData[opt.key]}
                          onChange={e => setFormData({...formData, [opt.key]: e.target.checked})} />
                        <span className="text-[13px] font-semibold text-slate-700">{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50 shrink-0">
                <button type="button" onClick={() => setShowModal(false)} className="px-6 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-[14px] font-bold hover:bg-slate-50">
                  Batal
                </button>
                <button type="submit" disabled={saving} className="px-6 py-2.5 bg-[#2653D8] hover:bg-blue-700 text-white rounded-lg text-[14px] font-bold shadow-sm">
                  {saving ? 'Menyimpan...' : 'Simpan Jadwal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
