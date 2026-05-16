import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, Edit2, Trash2, X, Save, 
  BookOpen, Layers, Users, FileText, CheckCircle, 
  Settings, HelpCircle, GraduationCap, ChevronRight
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import { useConfirmStore } from '../../store/useConfirmStore';
import { useNavigate } from 'react-router-dom';

import { clsx } from 'clsx';

export default function AdminBankSoal() {
  const { showConfirm } = useConfirmStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);

  // Form Data State
  const [formData, setFormData] = useState({
    kode_bank_soal: '',
    mapel_id: '',
    level_id: '',
    kelas_id: '',
    pg_jumlah: 0,
    pg_bobot: 0,
    pg_tampil: 0,
    opsi_jawaban: 5,
    essay_jumlah: 0,
    essay_bobot: 0,
    essay_tampil: 0,
    kkm: 75,
    guru_id: '',
    nama_guru: '',
    status: 'draft',
    tipe: 'non-agama' // 'agama' or 'non-agama'
  });

  // Master Data
  const [master, setMaster] = useState({
    mapel: [],
    level: [],
    kelas: [],
    guru: []
  });

  useEffect(() => {
    fetchData();
    fetchMasterData();
  }, []);

  const fetchMasterData = async () => {
    try {
      const [m, l, k, g] = await Promise.all([
        supabase.from('master_mapel').select('*').order('nama_mapel'),
        supabase.from('master_level').select('*').order('nama_level'),
        supabase.from('master_kelas').select('*').order('nama_kelas'),
        supabase.from('profiles').select('*').eq('role', 'guru').order('nama_lengkap')
      ]);

      setMaster({
        mapel: m.data || [],
        level: l.data || [],
        kelas: k.data || [],
        guru: g.data || []
      });
    } catch (error) {
      console.error(error);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: res, error } = await supabase
        .from('bank_soal')
        .select(`
          *,
          master_mapel (nama_mapel),
          master_level (nama_level),
          master_kelas (nama_kelas),
          profiles (nama_lengkap)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setData(res || []);
    } catch (error) {
      toast.error('Gagal memuat bank soal');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      kode_bank_soal: '',
      mapel_id: '',
      level_id: '',
      kelas_id: '',
      pg_jumlah: 0,
      pg_bobot: 0,
      pg_tampil: 0,
      opsi_jawaban: 5,
      essay_jumlah: 0,
      essay_bobot: 0,
      essay_tampil: 0,
      kkm: 75,
      guru_id: '',
      nama_guru: '',
      status: 'draft',
      tipe: 'non-agama'
    });
    setIsEdit(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Bersihkan data: ubah string kosong di kolom ID menjadi null
      const payload = { ...formData };
      if (!payload.guru_id) payload.guru_id = null;
      if (!payload.mapel_id) payload.mapel_id = null;
      if (!payload.level_id) payload.level_id = null;
      if (!payload.kelas_id) payload.kelas_id = null;

      if (isEdit) {
        const { error } = await supabase
          .from('bank_soal')
          .update(payload)
          .eq('id', selectedItem.id);
        if (error) throw error;
        toast.success('Bank Soal diperbarui');
      } else {
        const { error } = await supabase
          .from('bank_soal')
          .insert([payload]);
        if (error) throw error;
        toast.success('Bank Soal berhasil dibuat');
      }
      setShowModal(false);
      fetchData();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    showConfirm({
      title: 'Hapus Bank Soal?',
      message: 'Apakah Anda yakin ingin menghapus bank soal ini? Seluruh soal di dalamnya juga akan ikut terhapus.',
      confirmText: 'Ya, Hapus',
      cancelText: 'Batal',
      type: 'danger',
      onConfirm: async () => {
        try {
          await supabase.from('bank_soal').delete().eq('id', id);
          toast.success('Hapus berhasil');
          fetchData();
        } catch (error) {
          toast.error('Gagal menghapus');
        }
      }
    });
  };

  return (
    <div className="min-h-full p-4 md:p-8 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-2xl px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-600" />
            Bank Soal Ujian
          </h1>
          <p className="text-sm text-slate-500 font-medium">Kelola paket soal Pilihan Ganda dan Essay</p>
        </div>
        <button 
          onClick={() => { resetForm(); setShowModal(true); }}
          className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-md active:scale-95"
        >
          <Plus className="w-4 h-4" /> Tambah Bank Soal
        </button>
      </div>

      {/* Grid List Bank Soal */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          Array(3).fill(0).map((_, i) => (
            <div key={i} className="bg-white h-64 rounded-2xl border border-slate-100 animate-pulse"></div>
          ))
        ) : data.length === 0 ? (
          <div className="col-span-full py-20 bg-white rounded-2xl border border-dashed border-slate-300 flex flex-col items-center justify-center">
            <HelpCircle className="w-12 h-12 text-slate-200 mb-4" />
            <p className="text-slate-400 font-bold">Belum ada Bank Soal</p>
          </div>
        ) : (
          data.map((item) => (
            <div key={item.id} className="bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-all group overflow-hidden flex flex-col">
              {/* Card Header */}
              <div className="p-5 border-b border-slate-50 bg-slate-50/50">
                <div className="flex justify-between items-start mb-2">
                  <span className="px-2.5 py-1 bg-white border border-slate-200 text-slate-600 text-[10px] font-bold rounded-lg uppercase tracking-wider">
                    {item.kode_bank_soal}
                  </span>
                  <div className={clsx(
                    "px-2.5 py-1 text-[10px] font-bold rounded-lg uppercase",
                    item.status === 'aktif' ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                  )}>
                    {item.status}
                  </div>
                </div>
                <h3 className="text-base font-bold text-slate-800 line-clamp-1">{item.master_mapel?.nama_mapel}</h3>
                <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                  <span className="bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded font-bold">{item.master_level?.nama_level}</span>
                  <span>•</span>
                  <span>{item.master_kelas?.nama_kelas}</span>
                </div>
              </div>

              {/* Card Stats */}
              <div className="p-5 flex-1 space-y-4">
                 <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-white border border-slate-100 rounded-xl">
                       <span className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Pilihan Ganda</span>
                       <span className="text-sm font-bold text-slate-700">{item.pg_jumlah} Soal</span>
                    </div>
                    <div className="p-3 bg-white border border-slate-100 rounded-xl">
                       <span className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Essay</span>
                       <span className="text-sm font-bold text-slate-700">{item.essay_jumlah} Soal</span>
                    </div>
                 </div>
                 <div className="flex items-center justify-between text-xs text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-2">
                       <GraduationCap className="w-3.5 h-3.5" />
                       <span className="font-medium truncate max-w-[120px]">{item.nama_guru || item.profiles?.nama_lengkap || 'Admin'}</span>
                    </div>
                    <span className="font-bold text-indigo-600">KKM: {item.kkm}</span>
                 </div>
              </div>

              {/* Card Actions */}
              <div className="p-3 bg-slate-50 border-t border-slate-100 flex gap-2">
                <button 
                  onClick={() => navigate(`/admin/soal/input/${item.id}`)}
                  className="flex-1 bg-white hover:bg-indigo-50 text-indigo-600 border border-indigo-200 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
                >
                  <Plus className="w-3.5 h-3.5" /> Input Soal
                </button>
                <button 
                  onClick={() => { setSelectedItem(item); setFormData(item); setIsEdit(true); setShowModal(true); }}
                  className="p-2 bg-white text-slate-400 hover:text-blue-600 hover:bg-white rounded-xl border border-slate-200 shadow-sm transition-all"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => handleDelete(item.id)}
                  className="p-2 bg-white text-slate-400 hover:text-red-600 hover:bg-white rounded-xl border border-slate-200 shadow-sm transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* --- ADD / EDIT MODAL --- */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => !saving && setShowModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden animate-in zoom-in duration-300 border border-slate-200">
            
            {/* Modal Header */}
            <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800">
                {isEdit ? 'Edit Bank Soal' : 'Tambah Bank Soal'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-50 rounded-full transition-all text-slate-400 hover:text-red-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSave} className="p-8 max-h-[85vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-2 gap-5">
                
                {/* Kode Bank Soal */}
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700">Kode Bank Soal</label>
                  <input
                    type="text" required
                    value={formData.kode_bank_soal}
                    onChange={(e) => setFormData({...formData, kode_bank_soal: e.target.value})}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
                    placeholder="Contoh: XII-IPA-MAT"
                  />
                </div>

                {/* Mata Pelajaran */}
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700">Mata Pelajaran</label>
                  <select
                    required
                    value={formData.mapel_id}
                    onChange={(e) => setFormData({...formData, mapel_id: e.target.value})}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
                  >
                    <option value="">Pilih Mapel</option>
                    {master.mapel.map(v => <option key={v.id} value={v.id}>{v.nama_mapel}</option>)}
                  </select>
                </div>

                {/* Level */}
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700">Level Soal</label>
                  <select
                    required
                    value={formData.level_id}
                    onChange={(e) => setFormData({...formData, level_id: e.target.value})}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
                  >
                    <option value="">Pilih Level</option>
                    {master.level.map(v => <option key={v.id} value={v.id}>{v.nama_level}</option>)}
                  </select>
                </div>

                {/* Kelas */}
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700">Kelas (Opsional)</label>
                  <select
                    value={formData.kelas_id}
                    onChange={(e) => setFormData({...formData, kelas_id: e.target.value})}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
                  >
                    <option value="">Semua Kelas di Level Ini</option>
                    {master.kelas
                      .filter(v => !formData.level_id || v.level_id === formData.level_id)
                      .map(v => <option key={v.id} value={v.id}>{v.nama_kelas}</option>)
                    }
                  </select>
                  <p className="text-[10px] text-slate-400 font-medium">* Kosongkan jika ingin digunakan untuk banyak kelas sekaligus</p>
                </div>

                {/* SECTION PG */}
                <div className="col-span-2 mt-4 flex items-center gap-3">
                   <div className="h-px bg-slate-100 flex-1"></div>
                   <span className="text-[11px] font-black text-slate-300 uppercase tracking-[2px]">Soal Pilihan Ganda</span>
                   <div className="h-px bg-slate-100 flex-1"></div>
                </div>

                <div className="grid grid-cols-4 col-span-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase">Jumlah Soal</label>
                    <input
                      type="number"
                      value={formData.pg_jumlah}
                      onChange={(e) => setFormData({...formData, pg_jumlah: parseInt(e.target.value)})}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-indigo-500 transition-all text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase">Bobot Nilai</label>
                    <input
                      type="number"
                      value={formData.pg_bobot}
                      onChange={(e) => setFormData({...formData, pg_bobot: parseInt(e.target.value)})}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-indigo-500 transition-all text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase">Soal Tampil</label>
                    <input
                      type="number"
                      value={formData.pg_tampil}
                      onChange={(e) => setFormData({...formData, pg_tampil: parseInt(e.target.value)})}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-indigo-500 transition-all text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase">Opsi Jawaban</label>
                    <select
                      value={formData.opsi_jawaban}
                      onChange={(e) => setFormData({...formData, opsi_jawaban: parseInt(e.target.value)})}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none"
                    >
                      <option value="4">4 Opsi</option>
                      <option value="5">5 Opsi</option>
                    </select>
                  </div>
                </div>

                {/* SECTION ESSAY */}
                <div className="col-span-2 mt-4 flex items-center gap-3">
                   <div className="h-px bg-slate-100 flex-1"></div>
                   <span className="text-[11px] font-black text-slate-300 uppercase tracking-[2px]">Soal Essay</span>
                   <div className="h-px bg-slate-100 flex-1"></div>
                </div>

                <div className="grid grid-cols-3 col-span-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase">Jumlah Soal</label>
                    <input
                      type="number"
                      value={formData.essay_jumlah}
                      onChange={(e) => setFormData({...formData, essay_jumlah: parseInt(e.target.value)})}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase">Bobot Nilai</label>
                    <input
                      type="number"
                      value={formData.essay_bobot}
                      onChange={(e) => setFormData({...formData, essay_bobot: parseInt(e.target.value)})}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase">Soal Tampil</label>
                    <input
                      type="number"
                      value={formData.essay_tampil}
                      onChange={(e) => setFormData({...formData, essay_tampil: parseInt(e.target.value)})}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                    />
                  </div>
                </div>

                {/* KKM & Guru */}
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700">KKM</label>
                  <input
                    type="number" required
                    value={formData.kkm}
                    onChange={(e) => setFormData({...formData, kkm: parseInt(e.target.value)})}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm font-bold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700">Guru Pengampu</label>
                  <input
                    type="text" required
                    value={formData.nama_guru}
                    onChange={(e) => setFormData({...formData, nama_guru: e.target.value})}
                    placeholder="Ketik Nama Guru Pengampu"
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm"
                  />
                </div>

                {/* Status & Checkbox */}
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm"
                  >
                    <option value="draft">Draft</option>
                    <option value="aktif">Aktif</option>
                    <option value="arsip">Arsip</option>
                  </select>
                </div>

                <div className="flex items-end pb-3">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input 
                      type="checkbox" 
                      className="w-5 h-5 rounded-lg text-indigo-600 focus:ring-indigo-500 transition-all border-slate-300"
                      checked={formData.tipe === 'agama'}
                      onChange={(e) => setFormData({...formData, tipe: e.target.checked ? 'agama' : 'non-agama'})}
                    />
                    <span className="text-sm font-bold text-slate-600 group-hover:text-indigo-600 transition-all">Soal Agama</span>
                  </label>
                </div>

              </div>

              {/* Action Buttons */}
              <div className="mt-10 flex items-center justify-end gap-3 pt-6 border-t border-slate-50">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={saving}
                  className="px-6 py-2.5 text-sm font-bold text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-2.5 rounded-xl text-sm font-bold transition-all shadow-md active:scale-95 disabled:opacity-50 min-w-[140px]"
                >
                  {saving ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
