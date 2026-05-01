import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, Edit2, Trash2, X, Save, 
  User, Lock, Eye, EyeOff, Hash, GraduationCap,
  ChevronDown, CheckCircle2
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import { clsx } from 'clsx';

export default function AdminDataGuru() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(null);

  const [formData, setFormData] = useState({
    nip: '',
    nama_lengkap: '',
    username: '',
    password: '',
    mapel_diajar: '',
    is_wali_kelas: false,
    kelas_diwalikan: ''
  });

  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: res, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'guru')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setData(res || []);
    } catch (error) {
      toast.error('Gagal memuat data guru');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      nip: '',
      nama_lengkap: '',
      username: '',
      password: '',
      mapel_diajar: '',
      is_wali_kelas: false,
      kelas_diwalikan: ''
    });
    setIsEdit(false);
    setSelectedId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (isEdit) {
        const updatePayload = {
            nip: formData.nip,
            nama_lengkap: formData.nama_lengkap,
            username: formData.username,
            mapel_diajar: formData.mapel_diajar,
            is_wali_kelas: formData.is_wali_kelas,
            kelas_diwalikan: formData.is_wali_kelas ? formData.kelas_diwalikan : null
        };

        // Update password if one is provided
        if (formData.password) {
            updatePayload.password_plain = formData.password;
        }

        const { error } = await supabase
          .from('profiles')
          .update(updatePayload)
          .eq('id', selectedId);
        
        if (error) throw error;
        toast.success('Data guru berhasil diperbarui');
      } else {
        // Create new guru profile (In a real app, this would use auth.admin.createUser)
        // For this CBT local system, we create the profile record directly as per pattern
        const { error } = await supabase
          .from('profiles')
          .insert([{
            id: crypto.randomUUID(),
            role: 'guru',
            nip: formData.nip,
            nama_lengkap: formData.nama_lengkap,
            username: formData.username,
            password_plain: formData.password,
            mapel_diajar: formData.mapel_diajar,
            is_wali_kelas: formData.is_wali_kelas,
            kelas_diwalikan: formData.is_wali_kelas ? formData.kelas_diwalikan : null
          }]);
        
        if (error) throw error;
        toast.success('Guru baru berhasil ditambahkan');
      }

      setShowModal(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.message || 'Gagal menyimpan data');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (item) => {
    setSelectedId(item.id);
    setIsEdit(true);
    setFormData({
      nip: item.nip || '',
      nama_lengkap: item.nama_lengkap,
      username: item.username,
      password: '', // Password usually strictly set on create or via specific reset
      mapel_diajar: item.mapel_diajar || '',
      is_wali_kelas: item.is_wali_kelas || false,
      kelas_diwalikan: item.kelas_diwalikan || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Hapus data guru ini?')) return;
    try {
      const { error } = await supabase.from('profiles').delete().eq('id', id);
      if (error) throw error;
      toast.success('Guru berhasil dihapus');
      fetchData();
    } catch (error) {
      toast.error('Gagal menghapus data');
    }
  };

  const filteredData = data.filter(item => 
    item.nama_lengkap.toLowerCase().includes(search.toLowerCase()) ||
    item.nip?.toLowerCase().includes(search.toLowerCase()) ||
    item.username.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-full p-4 md:p-8 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-2xl px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2 tracking-tight">
            <GraduationCap className="w-6 h-6 text-blue-600" />
            Manajemen Data Guru
          </h1>
          <p className="text-sm text-slate-500 font-medium">Kelola data tenaga pendidik dan wali kelas</p>
        </div>
        <button 
          onClick={() => { resetForm(); setShowModal(true); }}
          className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-md active:scale-95"
        >
          <Plus className="w-4 h-4" /> Tambah Guru
        </button>
      </div>

      {/* Main Table Container */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        
        {/* Search Bar */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/30">
          <div className="relative w-full max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Cari NIP, nama, atau username..." 
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 text-sm bg-white transition-all transition-all"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white border-b border-slate-100 text-slate-400 text-[12px] font-bold tracking-wider uppercase">
                <th className="px-6 py-4">NIP</th>
                <th className="px-6 py-4">Nama & Mapel</th>
                <th className="px-6 py-4">Username</th>
                <th className="px-6 py-4 text-center">Status Wali Kelas</th>
                <th className="px-6 py-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan="5" className="px-6 py-12 text-center text-slate-400 italic">Memuat data guru...</td></tr>
              ) : filteredData.length === 0 ? (
                <tr><td colSpan="5" className="px-6 py-12 text-center text-slate-400 italic">Belum ada data guru.</td></tr>
              ) : (
                filteredData.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4 font-black text-slate-700 text-[13px]">{item.nip || '-'}</td>
                    <td className="px-6 py-4">
                      <div className="text-[14px] font-bold text-slate-600 uppercase tracking-tight">{item.nama_lengkap}</div>
                      {item.mapel_diajar && (
                         <div className="text-[11px] font-medium text-slate-400 mt-0.5">{item.mapel_diajar}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-[13px] font-medium text-slate-500">{item.username}</td>
                    <td className="px-6 py-4 text-center">
                      {item.is_wali_kelas ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[11px] font-bold border border-emerald-100 shadow-sm uppercase">
                          <CheckCircle2 className="w-3 h-3" /> Wali Kelas
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold text-slate-300 uppercase tracking-tighter">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => startEdit(item)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(item.id)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all"
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

      {/* Modern Add/Edit Teacher Modal (Matching Screenshot) */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-[500px] max-h-[95vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 shrink-0">
              <h2 className="text-xl font-bold text-slate-800 tracking-tight">
                {isEdit ? 'Ubah Guru' : 'Tambah Guru'}
              </h2>
              <button 
                onClick={() => setShowModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="px-6 pb-6 pt-4 space-y-4 overflow-y-auto custom-scrollbar">
              
              <div className="space-y-1.5">
                <label className="text-[13px] font-bold text-slate-800">NIP</label>
                <input 
                  required
                  type="text" 
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all text-[14px]"
                  value={formData.nip}
                  onChange={(e) => setFormData({...formData, nip: e.target.value})}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[13px] font-bold text-slate-800">Nama</label>
                <input 
                  required
                  type="text" 
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all text-[14px]"
                  value={formData.nama_lengkap}
                  onChange={(e) => setFormData({...formData, nama_lengkap: e.target.value})}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[13px] font-bold text-slate-800">Username</label>
                <input 
                  required
                  type="text" 
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all text-[14px]"
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[13px] font-bold text-slate-800">Password</label>
                <input 
                  required={!isEdit}
                  type="text"
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all text-[14px]"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[13px] font-bold text-slate-800">Mata Pelajaran (Mapel)</label>
                <input 
                  type="text"
                  placeholder="Contoh: Matematika"
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all text-[14px]"
                  value={formData.mapel_diajar}
                  onChange={(e) => setFormData({...formData, mapel_diajar: e.target.value})}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[13px] font-bold text-slate-800">Wali Kelas</label>
                <div className="relative">
                  <select 
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 appearance-none cursor-pointer transition-all text-[14px] text-slate-700"
                    value={formData.is_wali_kelas ? 'true' : 'false'}
                    onChange={(e) => setFormData({...formData, is_wali_kelas: e.target.value === 'true'})}
                  >
                    <option value="false">Tidak Ada Perwalian</option>
                    <option value="true">Wali Kelas</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {formData.is_wali_kelas && (
                <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-300">
                  <label className="text-[13px] font-bold text-slate-800">Kelas yang Diwalikan</label>
                  <input 
                    required={formData.is_wali_kelas}
                    type="text" 
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all text-[14px]"
                    value={formData.kelas_diwalikan}
                    onChange={(e) => setFormData({...formData, kelas_diwalikan: e.target.value})}
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 pb-2">
                <button 
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-6 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-[13px] font-semibold hover:bg-slate-50 transition-all"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 bg-[#2653D8] hover:bg-blue-700 text-white rounded-lg text-[13px] font-semibold shadow-sm transition-all disabled:opacity-70 flex items-center justify-center gap-2"
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
