import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, Edit2, Trash2, X, 
  ShieldCheck, Mail
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import { useConfirmStore } from '../../store/useConfirmStore';

export default function AdminDataAdministrator() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const { showConfirm } = useConfirmStore();

  // Form Data State
  const [formData, setFormData] = useState({
    nama_lengkap: '',
    email: '',
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
        .eq('role', 'admin')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setData(res || []);
    } catch (error) {
      toast.error('Gagal memuat data administrator');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      nama_lengkap: '',
      email: '',
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
            nama_lengkap: formData.nama_lengkap,
            username: formData.email // We store email in the username column
        };
        
        if (formData.password) {
            updatePayload.password_plain = formData.password;
        }

        const { error } = await supabase
          .from('profiles')
          .update(updatePayload)
          .eq('id', selectedId);
        
        if (error) throw error;
        toast.success('Data administrator berhasil diperbarui');
      } else {
        const { error } = await supabase
          .from('profiles')
          .insert([{
            id: crypto.randomUUID(),
            role: 'admin',
            nama_lengkap: formData.nama_lengkap,
            username: formData.email, // We store email in the username column
            password_plain: formData.password
          }]);
        
        if (error) throw error;
        toast.success('Administrator baru berhasil ditambahkan');
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
      nama_lengkap: item.nama_lengkap,
      email: item.username, // Read email from username column
      password: ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    showConfirm({
      title: 'Hapus Administrator',
      message: 'Apakah Anda yakin ingin menghapus data administrator ini? Tindakan ini tidak dapat dibatalkan.',
      confirmText: 'Ya, Hapus',
      cancelText: 'Batal',
      type: 'danger',
      onConfirm: async () => {
        try {
          const { error } = await supabase.from('profiles').delete().eq('id', id);
          if (error) throw error;
          toast.success('Administrator berhasil dihapus');
          fetchData();
        } catch (error) {
          toast.error('Gagal menghapus data');
        }
      }
    });
  };

  const filteredData = data.filter(item => 
    item.nama_lengkap.toLowerCase().includes(search.toLowerCase()) ||
    item.username.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-full p-4 md:p-8 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-2xl px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2 tracking-tight uppercase">
            <ShieldCheck className="w-6 h-6 text-indigo-600" />
            Data Administrator
          </h1>
          <p className="text-sm text-slate-500 font-medium font-medium">Kelola data akses sistem administrator</p>
        </div>
        <button 
          onClick={() => { resetForm(); setShowModal(true); }}
          className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-md active:scale-95"
        >
          <Plus className="w-4 h-4" /> Tambah Administrator
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
              placeholder="Cari nama atau email administrator..." 
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
                <th className="px-6 py-4">Nama Lengkap</th>
                <th className="px-6 py-4">Email / Username</th>
                <th className="px-6 py-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan="3" className="px-6 py-12 text-center text-slate-400 italic">Memuat data administrator...</td></tr>
              ) : filteredData.length === 0 ? (
                <tr><td colSpan="3" className="px-6 py-12 text-center text-slate-400 italic font-medium">Belum ada data administrator terdaftar.</td></tr>
              ) : (
                filteredData.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4 text-[14px] font-bold text-slate-600 uppercase tracking-tighter">{item.nama_lengkap}</td>
                    <td className="px-6 py-4 text-[13px] font-medium text-slate-500 flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      {item.username}
                    </td>
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
          <div className="bg-white w-full max-w-[500px] rounded-xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-300">
            
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5">
              <h2 className="text-xl font-medium text-slate-900">
                {isEdit ? 'Ubah Administrator' : 'Tambah Administrator'}
              </h2>
              <button 
                onClick={() => setShowModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form Content */}
            <form onSubmit={handleSubmit} className="px-6 pb-6 pt-1 space-y-5">
              
              <div className="space-y-1.5">
                <label className="text-[15px] font-medium text-slate-800">Nama</label>
                <input 
                  required
                  type="text" 
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-[15px] text-slate-800"
                  value={formData.nama_lengkap}
                  onChange={(e) => setFormData({...formData, nama_lengkap: e.target.value})}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[15px] font-medium text-slate-800">Email</label>
                <input 
                  required
                  type="email" 
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-[15px] text-slate-800"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[15px] font-medium text-slate-800">Password</label>
                <input 
                  required={!isEdit}
                  type={showPassword ? 'text' : 'password'} 
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-[15px] text-slate-800"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                />
              </div>

              {/* Action Buttons Matching Screenshot */}
              <div className="flex items-center justify-end gap-3 pt-6 mt-2">
                <button 
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-6 py-2.5 bg-white border border-slate-200 text-slate-800 rounded-lg text-[15px] font-medium hover:bg-slate-50 transition-all"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 bg-[#2563eb] hover:bg-blue-700 text-white rounded-lg text-[15px] font-medium transition-all disabled:opacity-70 flex items-center justify-center min-w-[100px]"
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
