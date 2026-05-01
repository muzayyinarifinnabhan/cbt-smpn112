import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, Edit2, Trash2, X, Save, 
  User, Lock, Eye, EyeOff, Hash, ShieldCheck
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';

export default function AdminDataPengawas() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(null);

  // Form Data State
  const [formData, setFormData] = useState({
    nip: '',
    nama_lengkap: '',
    username: '',
    password: ''
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
        .eq('role', 'pengawas')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setData(res || []);
    } catch (error) {
      toast.error('Gagal memuat data pengawas');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      nip: '',
      nama_lengkap: '',
      username: '',
      password: ''
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
            username: formData.username
        };
        
        if (formData.password) {
            updatePayload.password_plain = formData.password;
        }

        const { error } = await supabase
          .from('profiles')
          .update(updatePayload)
          .eq('id', selectedId);
        
        if (error) throw error;
        toast.success('Data pengawas berhasil diperbarui');
      } else {
        const { error } = await supabase
          .from('profiles')
          .insert([{
            id: crypto.randomUUID(),
            role: 'pengawas',
            nip: formData.nip,
            nama_lengkap: formData.nama_lengkap,
            username: formData.username,
            password_plain: formData.password
          }]);
        
        if (error) throw error;
        toast.success('Pengawas baru berhasil ditambahkan');
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
      password: ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Hapus data pengawas ini?')) return;
    try {
      const { error } = await supabase.from('profiles').delete().eq('id', id);
      if (error) throw error;
      toast.success('Pengawas berhasil dihapus');
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
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2 tracking-tight uppercase">
            <ShieldCheck className="w-6 h-6 text-indigo-600" />
            Data Pengawas
          </h1>
          <p className="text-sm text-slate-500 font-medium font-medium">Kelola data petugas pengawas ruangan ujian</p>
        </div>
        <button 
          onClick={() => { resetForm(); setShowModal(true); }}
          className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-md active:scale-95"
        >
          <Plus className="w-4 h-4" /> Tambah Pengawas
        </button>
      </div>

      {/* Main Table Container */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        
        {/* Search Bar */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/20">
          <div className="relative w-full max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Cari NIP atau nama pengawas..." 
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 text-sm bg-white transition-all"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white border-b border-slate-100 text-slate-400 text-[11px] font-black tracking-widest uppercase">
                <th className="px-6 py-4">NIP</th>
                <th className="px-6 py-4">Nama Lengkap</th>
                <th className="px-6 py-4">Username</th>
                <th className="px-6 py-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan="4" className="px-6 py-12 text-center text-slate-400 italic">Memuat data pengawas...</td></tr>
              ) : filteredData.length === 0 ? (
                <tr><td colSpan="4" className="px-6 py-12 text-center text-slate-400 italic font-medium">Belum ada data pengawas terdaftar.</td></tr>
              ) : (
                filteredData.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4 font-black text-slate-700 text-[13px] tracking-tight">{item.nip || '-'}</td>
                    <td className="px-6 py-4 text-[14px] font-bold text-slate-600 uppercase tracking-tighter">{item.nama_lengkap}</td>
                    <td className="px-6 py-4 text-[13px] font-medium text-slate-400 italic">{item.username}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => startEdit(item)}
                          className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
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

      {/* Modern Modal (Matching Screenshot) */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-[500px] rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-100">
            
            {/* Header */}
            <div className="flex items-center justify-between px-8 py-6">
              <h2 className="text-xl font-bold text-slate-800 tracking-tight">
                {isEdit ? 'Ubah Pengawas' : 'Tambah Pengawas'}
              </h2>
              <button 
                onClick={() => setShowModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form Content */}
            <form onSubmit={handleSubmit} className="px-8 pb-8 pt-2 space-y-6">
              
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 ml-1">NIP</label>
                <input 
                  required
                  type="text" 
                  className="w-full px-5 py-3.5 bg-white border-2 border-slate-100 rounded-2xl outline-none focus:border-indigo-600 transition-all font-medium text-slate-700 shadow-sm"
                  value={formData.nip}
                  onChange={(e) => setFormData({...formData, nip: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 ml-1">Nama</label>
                <input 
                  required
                  type="text" 
                  className="w-full px-5 py-3.5 bg-white border-2 border-slate-100 rounded-2xl outline-none focus:border-indigo-600 transition-all font-medium text-slate-700 shadow-sm"
                  value={formData.nama_lengkap}
                  onChange={(e) => setFormData({...formData, nama_lengkap: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 ml-1">Username</label>
                <input 
                  required
                  type="text" 
                  className="w-full px-5 py-3.5 bg-white border-2 border-slate-100 rounded-2xl outline-none focus:border-indigo-600 transition-all font-medium text-slate-700 shadow-sm"
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                />
              </div>

              <div className="space-y-2 pb-2">
                <label className="text-sm font-bold text-slate-700 ml-1">Password</label>
                <div className="relative">
                  <input 
                    required={!isEdit}
                    type={showPassword ? 'text' : 'password'} 
                    className="w-full px-5 py-3.5 bg-white border-2 border-slate-100 rounded-2xl outline-none focus:border-indigo-600 transition-all font-medium text-slate-700 shadow-sm"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Action Buttons Matching Screenshot */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-50 mt-4">
                <button 
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-8 py-3.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all active:scale-95 shadow-sm"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  disabled={saving}
                  className="px-10 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-all active:scale-95 disabled:opacity-70 shadow-lg shadow-indigo-600/20 flex items-center justify-center"
                >
                  {saving ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    'Simpan'
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
}
