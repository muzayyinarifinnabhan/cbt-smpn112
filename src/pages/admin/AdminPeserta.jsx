import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, Edit2, Trash2, X, Save, 
  User, Lock, Eye, EyeOff, Hash, Book, 
  MapPin, Clock, Server, Upload, Filter,
  MoreVertical, Camera, GraduationCap
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';

export default function AdminPeserta() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);

  // Form Data State
  const [formData, setFormData] = useState({
    no_peserta: '',
    username: '',
    nama_lengkap: '',
    foto: null,
    agama: '',
    kelas_id: '',
    level_id: '',
    sesi_id: '',
    ruangan_id: '',
    server_id: '',
    password: ''
  });

  // Master Data for Selects
  const [master, setMaster] = useState({
    kelas: [],
    level: [],
    sesi: [],
    ruangan: [],
    server: []
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    fetchData();
    fetchMasterData();
  }, []);

  const fetchMasterData = async () => {
    try {
      const [k, l, s, r, srv] = await Promise.all([
        supabase.from('master_kelas').select('*').order('nama_kelas'),
        supabase.from('master_level').select('*').order('nama_level'),
        supabase.from('master_sesi').select('*').order('nama_sesi'),
        supabase.from('master_ruangan').select('*').order('nama_ruangan'),
        supabase.from('master_server').select('*').order('nama_server')
      ]);

      setMaster({
        kelas: k.data || [],
        level: l.data || [],
        sesi: s.data || [],
        ruangan: r.data || [],
        server: srv.data || []
      });
    } catch (error) {
      console.error('Error fetching master data:', error);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // Ambil data peserta
      const { data: peserta, error: pErr } = await supabase
        .from('peserta_ujian')
        .select(`
          *,
          master_kelas (nama_kelas),
          master_level (nama_level),
          master_sesi (nama_sesi),
          master_ruangan (nama_ruangan),
          master_server (nama_server)
        `)
        .order('created_at', { ascending: false });

      if (pErr) throw pErr;

      // Ambil semua profiles role siswa
      const { data: profileList, error: prErr } = await supabase
        .from('profiles')
        .select('id, nama_lengkap, username')
        .eq('role', 'siswa');

      if (prErr) throw prErr;

      // Gabungkan manual: peserta_ujian.id === profiles.id
      const merged = (peserta || []).map(p => ({
        ...p,
        profiles: profileList?.find(pr => pr.id === p.id) || null
      }));

      setData(merged);
    } catch (error) {
      toast.error('Gagal memuat data peserta');
      console.error('fetchData error:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      no_peserta: '',
      username: '',
      nama_lengkap: '',
      foto: null,
      agama: '',
      kelas_id: '',
      level_id: '',
      sesi_id: '',
      ruangan_id: '',
      server_id: '',
      password: ''
    });
    setIsEdit(false);
    setSelectedItem(null);
  };

  const handleEdit = (item) => {
    setSelectedItem(item);
    setIsEdit(true);
    setFormData({
      no_peserta: item.nomor_peserta,
      username: item.profiles?.username,
      nama_lengkap: item.profiles?.nama_lengkap,
      foto: null, // Reset photo update
      agama: item.agama,
      kelas_id: item.kelas_id,
      level_id: item.level_id,
      sesi_id: item.sesi_id,
      ruangan_id: item.ruangan_id,
      server_id: item.server_id,
      password: item.password_plain || ''
    });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const cleanUsername = formData.username.trim();
      const cleanNoPeserta = formData.no_peserta.trim();

      // --- VALIDASI KEUNIKAN (Hanya untuk Create New) ---
      if (!isEdit) {
        // 1. Cek Username (Case Insensitive)
        const { data: checkUser } = await supabase
          .from('profiles')
          .select('id, role')
          .ilike('username', cleanUsername)
          .maybeSingle();
        
        if (checkUser) {
          const roleLabel = checkUser.role === 'siswa' ? 'peserta lain' : `seorang ${checkUser.role}`;
          throw new Error(`Username "${cleanUsername}" sudah digunakan oleh ${roleLabel}. Silakan gunakan username yang berbeda.`);
        }

        // 2. Cek No Peserta
        const { data: checkNo } = await supabase
          .from('peserta_ujian')
          .select('id')
          .eq('nomor_peserta', cleanNoPeserta)
          .maybeSingle();

        if (checkNo) {
          throw new Error(`Nomor Peserta "${cleanNoPeserta}" sudah terdaftar. Silakan gunakan nomor yang berbeda.`);
        }
      }

      let profileId = selectedItem?.id;
      let fotoUrl = selectedItem?.foto_url;

      // 1. Handle Photo Upload if exists (non-blocking)
      if (formData.foto instanceof File) {
        try {
          const fileExt = formData.foto.name.split('.').pop();
          const fileName = `${cleanNoPeserta}_${Date.now()}.${fileExt}`;
          const { error: uploadError } = await supabase.storage
            .from('foto_peserta')
            .upload(fileName, formData.foto);

          if (uploadError) {
            // Foto gagal upload tapi data tetap disimpan
            console.warn('Upload foto gagal (diabaikan):', uploadError.message);
            toast.warning('Data disimpan, tapi foto gagal diunggah. Cek pengaturan storage di Supabase.');
          } else {
            const { data: urlData } = supabase.storage.from('foto_peserta').getPublicUrl(fileName);
            fotoUrl = urlData.publicUrl;
          }
        } catch (uploadErr) {
          console.warn('Upload foto error (diabaikan):', uploadErr);
        }
      }

      if (isEdit) {
        // --- UPDATE ---
        // Profile update
        await supabase.from('profiles').update({
          nama_lengkap: formData.nama_lengkap,
          username: cleanUsername
        }).eq('id', profileId);

        // Peserta update
          await supabase.from('peserta_ujian').update({
            nomor_peserta: cleanNoPeserta,
            siswa_id: profileId,
            foto_url: fotoUrl,
            agama: formData.agama,
            kelas_id: formData.kelas_id,
            level_id: formData.level_id,
            sesi_id: formData.sesi_id,
            ruangan_id: formData.ruangan_id,
            server_id: formData.server_id,
            password_plain: formData.password
          }).eq('id', profileId);

        toast.success('Data peserta berhasil diperbarui');
      } else {
        // --- CREATE NEW ---
        // 1. Create Profile (Auto-generate UUID)
        const newId = crypto.randomUUID();
        const { error: pErr } = await supabase.from('profiles').insert([
          {
            id: newId,
            username: cleanUsername,
            nama_lengkap: formData.nama_lengkap,
            role: 'siswa'
          }
        ]);
        if (pErr) throw pErr;

        // 2. Create Peserta
        const { error: sErr } = await supabase.from('peserta_ujian').insert([{
            id: newId,
            siswa_id: newId,
            nomor_peserta: cleanNoPeserta,
            foto_url: fotoUrl,
            agama: formData.agama,
            kelas_id: formData.kelas_id,
            level_id: formData.level_id,
            sesi_id: formData.sesi_id,
            ruangan_id: formData.ruangan_id,
            server_id: formData.server_id,
            password_plain: formData.password
        }]);
        if (sErr) throw sErr;

        toast.success('Peserta baru berhasil ditambahkan');
      }

      setShowModal(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.message || 'Terjadi kesalahan saat menyimpan');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedItem) return;
    try {
      await supabase.from('profiles').delete().eq('id', selectedItem.id);
      toast.success('Peserta berhasil dihapus');
      setShowDeleteModal(false);
      fetchData();
    } catch (error) {
      toast.error('Gagal menghapus peserta');
    }
  };

  const filteredData = data.filter(item => 
    item.profiles?.nama_lengkap?.toLowerCase().includes(search.toLowerCase()) ||
    item.nomor_peserta?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-full p-4 md:p-8 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-2xl px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-blue-600" />
            Manajemen Peserta Ujian
          </h1>
          <p className="text-sm text-slate-500 font-medium">Total {data.length} peserta terdaftar dalam sistem</p>
        </div>
        <button 
          onClick={() => { resetForm(); setShowModal(true); }}
          className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-md active:scale-95"
        >
          <Plus className="w-4 h-4" /> Tambah Peserta
        </button>
      </div>

      {/* Main Table Container */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        
        {/* Search & Filter Bar */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center gap-4 bg-slate-50/50">
          <div className="relative w-full max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Cari nama atau nomor peserta..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 text-sm bg-white transition-all"
            />
          </div>
          <div className="flex items-center gap-2 ml-auto">
             <button className="p-2 border border-slate-200 rounded-lg hover:bg-white text-slate-500 transition-all shadow-sm">
                <Filter className="w-4 h-4" />
             </button>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white border-b border-slate-100 text-slate-400 text-[12px] font-bold tracking-wider uppercase">
                <th className="px-6 py-4 w-16">Foto</th>
                <th className="px-6 py-4">Nomor & Nama</th>
                <th className="px-6 py-4">Kelas / Tingkat</th>
                <th className="px-6 py-4">Sesi & Ruang</th>
                <th className="px-6 py-4">Status Akun</th>
                <th className="px-6 py-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array(5).fill(0).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4"><div className="w-10 h-10 bg-slate-100 rounded-full"></div></td>
                    <td className="px-6 py-4"><div className="h-4 w-32 bg-slate-100 rounded mb-2"></div><div className="h-3 w-24 bg-slate-100 rounded"></div></td>
                    <td colSpan="4"></td>
                  </tr>
                ))
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-20 text-center text-slate-400">
                    <div className="flex flex-col items-center">
                      <Search className="w-12 h-12 text-slate-200 mb-4" />
                      <p className="font-medium">Tidak ada data ditemukan</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredData.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      {item.foto_url ? (
                        <img src={item.foto_url} className="w-10 h-10 rounded-full object-cover border-2 border-slate-100" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-500 font-bold border-2 border-blue-100 text-xs">
                          {item.profiles?.nama_lengkap?.substring(0, 2).toUpperCase()}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-[13px] font-bold text-slate-800">{item.nomor_peserta}</div>
                      <div className="text-[13px] text-slate-500 font-medium">{item.profiles?.nama_lengkap}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-[13px] font-semibold text-slate-700">{item.master_kelas?.nama_kelas || '-'}</div>
                      <div className="text-[11px] text-slate-400">{item.master_level?.nama_level || '-'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-[13px] font-semibold text-slate-700">{item.master_ruangan?.nama_ruangan || '-'}</div>
                      <div className="text-[11px] text-slate-400">Sesi {item.master_sesi?.nama_sesi || '-'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        <span className="text-[12px] font-bold text-emerald-600">Aktif</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => handleEdit(item)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => { setSelectedItem(item); setShowDeleteModal(true); }}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* --- ADD / EDIT MODAL --- */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => !saving && setShowModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in duration-300 border border-slate-200">
            
            {/* Modal Header */}
            <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800">
                {isEdit ? 'Edit Peserta' : 'Tambah Peserta'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-50 rounded-full transition-all text-slate-400 hover:text-red-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSave} className="p-8 max-h-[80vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                
                {/* No Peserta */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">No Peserta</label>
                  <input
                    type="text" required
                    autoComplete="off"
                    value={formData.no_peserta}
                    onChange={(e) => setFormData({...formData, no_peserta: e.target.value})}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-medium text-slate-800"
                    placeholder="Masukkan No Peserta"
                  />
                </div>

                {/* Username */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Username</label>
                  <input
                    type="text" required
                    autoComplete="off"
                    value={formData.username}
                    onChange={(e) => setFormData({...formData, username: e.target.value})}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-medium text-slate-800"
                    placeholder="Masukkan Username"
                  />
                </div>

                {/* Nama Lengkap */}
                <div className="md:col-span-2 space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Nama Lengkap</label>
                  <input
                    type="text" required
                    value={formData.nama_lengkap}
                    onChange={(e) => setFormData({...formData, nama_lengkap: e.target.value})}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-medium text-slate-800"
                    placeholder="Masukkan Nama Lengkap"
                  />
                </div>

                {/* Foto Peserta */}
                <div className="md:col-span-2 space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Foto Peserta</label>
                  <div className="flex items-center gap-2 w-full p-1.5 bg-white border border-slate-200 rounded-xl">
                    <label className="flex items-center justify-center px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg cursor-pointer transition-all text-sm font-bold text-slate-700 shrink-0">
                      Pilih File
                      <input 
                        type="file" accept="image/*" className="hidden" 
                        onChange={(e) => setFormData({...formData, foto: e.target.files[0]})}
                      />
                    </label>
                    <span className="text-sm text-slate-400 truncate px-2 italic font-medium">
                      {formData.foto ? formData.foto.name : 'Tidak ada file yang dipilih'}
                    </span>
                  </div>
                </div>

                {/* Agama */}
                <div className="md:col-span-2 space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Agama</label>
                  <select
                    required
                    value={formData.agama}
                    onChange={(e) => setFormData({...formData, agama: e.target.value})}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-medium text-slate-800 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20d%3D%22M19%209l-7%207-7-7%22%20%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem] bg-[right_1rem_center] bg-no-repeat"
                  >
                    <option value="">Pilih Agama</option>
                    {['Islam', 'Kristen', 'Katolik', 'Hindu', 'Budha', 'Konghucu'].map(v => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                </div>

                {/* Kelas */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Kelas</label>
                  <select
                    required
                    value={formData.kelas_id}
                    onChange={(e) => setFormData({...formData, kelas_id: e.target.value})}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-medium text-slate-800 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20d%3D%22M19%209l-7%207-7-7%22%20%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem] bg-[right_1rem_center] bg-no-repeat"
                  >
                    <option value="">Pilih Kelas</option>
                    {master.kelas.map(v => <option key={v.id} value={v.id}>{v.nama_kelas}</option>)}
                  </select>
                </div>

                {/* Level */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Level</label>
                  <select
                    required
                    value={formData.level_id}
                    onChange={(e) => setFormData({...formData, level_id: e.target.value})}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-medium text-slate-800 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20d%3D%22M19%209l-7%207-7-7%22%20%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem] bg-[right_1rem_center] bg-no-repeat"
                  >
                    <option value="">Pilih Level</option>
                    {master.level.map(v => <option key={v.id} value={v.id}>{v.nama_level}</option>)}
                  </select>
                </div>

                {/* Sesi */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Sesi</label>
                  <select
                    required
                    value={formData.sesi_id}
                    onChange={(e) => setFormData({...formData, sesi_id: e.target.value})}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-medium text-slate-800 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20d%3D%22M19%209l-7%207-7-7%22%20%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem] bg-[right_1rem_center] bg-no-repeat"
                  >
                    <option value="">Pilih Sesi</option>
                    {master.sesi.map(v => <option key={v.id} value={v.id}>{v.nama_sesi}</option>)}
                  </select>
                </div>

                {/* Ruang */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Ruang</label>
                  <select
                    required
                    value={formData.ruangan_id}
                    onChange={(e) => setFormData({...formData, ruangan_id: e.target.value})}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-medium text-slate-800 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20d%3D%22M19%209l-7%207-7-7%22%20%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem] bg-[right_1rem_center] bg-no-repeat"
                  >
                    <option value="">Pilih Ruang</option>
                    {master.ruangan.map(v => <option key={v.id} value={v.id}>{v.nama_ruangan}</option>)}
                  </select>
                </div>

                {/* Server */}
                <div className="md:col-span-2 space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Server</label>
                  <select
                    required
                    value={formData.server_id}
                    onChange={(e) => setFormData({...formData, server_id: e.target.value})}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-medium text-slate-800 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20d%3D%22M19%209l-7%207-7-7%22%20%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem] bg-[right_1rem_center] bg-no-repeat"
                  >
                    <option value="">Pilih Server</option>
                    {master.server.map(v => <option key={v.id} value={v.id}>{v.nama_server}</option>)}
                  </select>
                </div>

                {/* Password */}
                <div className="md:col-span-2 space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      autoComplete="new-password"
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-medium text-slate-800 pr-12"
                      placeholder="Masukkan Password"
                    />
                    <button 
                      type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-500 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="h-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-8 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={saving}
                  className="px-6 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2.5 rounded-xl text-sm font-bold transition-all shadow-md active:scale-95 disabled:opacity-50"
                >
                  {saving ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- DELETE CONFIRMATION MODAL --- */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300" />
          <div className="relative bg-white rounded-3xl shadow-2xl p-8 w-full max-w-sm text-center animate-in zoom-in duration-300 border border-red-50">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-5">
              <Trash2 className="w-10 h-10 text-red-500" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Hapus Peserta?</h3>
            <p className="text-sm text-slate-500 mb-8 leading-relaxed">
              Anda akan menghapus <span className="font-bold text-slate-800">{selectedItem?.profiles?.nama_lengkap}</span>. Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-3 text-sm font-bold text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-2xl transition-all"
              >
                Batal
              </button>
              <button 
                onClick={handleDelete}
                className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white text-sm font-bold rounded-2xl transition-all shadow-md active:scale-95 shadow-red-200"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
