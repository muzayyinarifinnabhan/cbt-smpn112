import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import { Link } from 'react-router-dom';
import { Plus, Search, Edit2, Trash2, X, FileText, List } from 'lucide-react';
import { toast } from 'sonner';
import { clsx } from 'clsx';
import { useConfirmStore } from '../../store/useConfirmStore';

export default function GuruBankSoal() {
  const { showConfirm } = useConfirmStore();
  const { profile } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [search, setSearch] = useState('');
  
  // Master Data
  const [mapels, setMapels] = useState([]);
  const [levels, setLevels] = useState([]);
  const [kelases, setKelases] = useState([]);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

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
    kkm: 0,
    status: 'aktif',
    tipe: 'non-agama' // 'agama' if checked
  });

  useEffect(() => {
    if (profile?.id) {
      fetchMasterData();
      fetchBankSoal();
    }
  }, [profile]);

  const fetchMasterData = async () => {
    try {
      const [resMapel, resLevel, resKelas] = await Promise.all([
        supabase.from('master_mapel').select('*').order('nama_mapel'),
        supabase.from('master_level').select('*').order('nama_level'),
        supabase.from('master_kelas').select('*').order('nama_kelas'),
      ]);
      setMapels(resMapel.data || []);
      setLevels(resLevel.data || []);
      setKelases(resKelas.data || []);
    } catch (error) {
      console.error('Error fetching master data:', error);
    }
  };

  const fetchBankSoal = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('bank_soal')
        .select(`
          *,
          master_mapel(nama_mapel),
          master_level(nama_level),
          master_kelas(nama_kelas)
        `)
        .or(`guru_id.eq.${profile.id},guru_id.is.null`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setData(data || []);
    } catch (error) {
      toast.error('Gagal memuat bank soal: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredData = data.filter(item => 
    item.kode_bank_soal?.toLowerCase().includes(search.toLowerCase()) ||
    item.master_mapel?.nama_mapel?.toLowerCase().includes(search.toLowerCase())
  );

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
      kkm: 0,
      status: 'aktif',
      tipe: 'non-agama'
    });
    setIsEdit(false);
    setSelectedId(null);
  };

  const handleOpenAdd = () => {
    resetForm();
    setShowModal(true);
  };

  const handleOpenEdit = (item) => {
    setFormData({
      kode_bank_soal: item.kode_bank_soal || '',
      mapel_id: item.mapel_id || '',
      level_id: item.level_id || '',
      kelas_id: item.kelas_id || '',
      pg_jumlah: item.pg_jumlah || 0,
      pg_bobot: item.pg_bobot || 0,
      pg_tampil: item.pg_tampil || 0,
      opsi_jawaban: item.opsi_jawaban || 5,
      essay_jumlah: item.essay_jumlah || 0,
      essay_bobot: item.essay_bobot || 0,
      essay_tampil: item.essay_tampil || 0,
      kkm: item.kkm || 0,
      status: item.status || 'aktif',
      tipe: item.tipe || 'non-agama'
    });
    setSelectedId(item.id);
    setIsEdit(true);
    setShowModal(true);
  };

  const handleDelete = (id) => {
    showConfirm({
      title: 'Hapus Bank Soal',
      message: 'Yakin ingin menghapus bank soal ini? Semua soal di dalamnya juga akan terhapus secara permanen.',
      confirmText: 'Hapus',
      cancelText: 'Batal',
      type: 'danger',
      onConfirm: async () => {
        try {
          const { error } = await supabase.from('bank_soal').delete().eq('id', id);
          if (error) throw error;
          toast.success('Bank soal berhasil dihapus');
          fetchBankSoal();
        } catch (error) {
          if (error.message && error.message.includes('violates foreign key constraint')) {
            toast.error('Bank soal tidak bisa dihapus karena sudah digunakan dalam Jadwal Ujian. Silakan hapus jadwal ujian terkait terlebih dahulu.');
          } else {
            toast.error('Gagal menghapus: ' + error.message);
          }
        }
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...formData, guru_id: profile.id };

      if (isEdit) {
        const { error } = await supabase.from('bank_soal').update(payload).eq('id', selectedId);
        if (error) throw error;
        toast.success('Bank soal berhasil diperbarui');
      } else {
        const { error } = await supabase.from('bank_soal').insert([payload]);
        if (error) throw error;
        toast.success('Bank soal berhasil ditambahkan');
      }
      setShowModal(false);
      fetchBankSoal();
    } catch (error) {
      toast.error('Gagal menyimpan: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-full bg-[#f8fafc] animate-in fade-in duration-500">
      <div className="p-6 md:p-8">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-8">
          <div>
            <h1 className="text-[28px] font-bold text-slate-800 tracking-tight leading-none mb-2">
              Bank Soal Saya
            </h1>
            <p className="text-[15px] font-medium text-slate-500">
              Kelola bank soal ujian Anda
            </p>
          </div>
          <button 
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-6 py-2.5 bg-[#2653D8] hover:bg-blue-700 text-white rounded-lg text-[14px] font-bold transition-all shadow-sm active:scale-95"
          >
            <Plus className="w-5 h-5" />
            Tambah Bank Soal
          </button>
        </div>

        {/* Content Section */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          
          {/* Toolbar */}
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Cari bank soal..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white border-b border-slate-100 text-slate-500 text-[13px] font-semibold">
                  <th className="px-6 py-4">Kode</th>
                  <th className="px-6 py-4">Mata Pelajaran</th>
                  <th className="px-6 py-4">Kelas</th>
                  <th className="px-6 py-4">Level</th>
                  <th className="px-6 py-4">PG/Essay</th>
                  <th className="px-6 py-4">KKM</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-12 text-center text-slate-500">Memuat data...</td>
                  </tr>
                ) : filteredData.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-400">
                        <FileText className="w-12 h-12 mb-3 opacity-20" />
                        <p className="text-[14px] font-medium">Belum ada bank soal.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredData.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 border-b border-slate-50 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-700 text-[13px]">{item.kode_bank_soal}</td>
                      <td className="px-6 py-4 text-[14px] font-semibold text-slate-600">{item.master_mapel?.nama_mapel || '-'}</td>
                      <td className="px-6 py-4 text-[13px] text-slate-600">{item.master_kelas?.nama_kelas || '-'}</td>
                      <td className="px-6 py-4 text-[13px] text-slate-600">{item.master_level?.nama_level || '-'}</td>
                      <td className="px-6 py-4 text-[13px] font-medium text-slate-500">
                        {item.pg_jumlah} / {item.essay_jumlah}
                      </td>
                      <td className="px-6 py-4 text-[13px] font-bold text-slate-700">{item.kkm}</td>
                      <td className="px-6 py-4">
                        <span className={clsx(
                          "px-2.5 py-1 rounded-md text-[12px] font-bold",
                          item.status === 'aktif' ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
                        )}>
                          {item.status === 'aktif' ? 'Aktif' : 'Draft'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <Link 
                            to={`/guru/soal/input/${item.id}`} 
                            className="p-2 border border-slate-200 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Input Soal"
                          >
                            <List className="w-4 h-4" />
                          </Link>
                          {item.guru_id && (
                            <>
                              <button 
                                onClick={() => handleOpenEdit(item)} 
                                className="p-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
                                title="Edit Bank Soal"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => handleDelete(item.id)} 
                                className="p-2 border border-slate-200 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Hapus Bank Soal"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL TAMBAH/UBAH */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-[800px] max-h-[90vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 shrink-0">
              <h2 className="text-[18px] font-bold text-slate-800 tracking-tight">
                {isEdit ? 'Ubah Bank Soal' : 'Tambah Bank Soal'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
              <div className="px-6 py-6 overflow-y-auto custom-scrollbar flex-1 space-y-8">
                
                {/* Row 1 & 2 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[14px] font-bold text-slate-800">Kode Bank Soal</label>
                    <input required type="text" className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg outline-none focus:border-blue-600 text-[14px]"
                      value={formData.kode_bank_soal} onChange={(e) => setFormData({...formData, kode_bank_soal: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[14px] font-bold text-slate-800">Mata Pelajaran</label>
                    <select required className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg outline-none focus:border-blue-600 text-[14px]"
                      value={formData.mapel_id} onChange={(e) => setFormData({...formData, mapel_id: e.target.value})}>
                      <option value="">Pilih Mapel</option>
                      {mapels.map(m => <option key={m.id} value={m.id}>{m.nama_mapel}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[14px] font-bold text-slate-800">Level Soal</label>
                    <select required className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg outline-none focus:border-blue-600 text-[14px]"
                      value={formData.level_id} onChange={(e) => setFormData({...formData, level_id: e.target.value})}>
                      <option value="">Pilih Level</option>
                      {levels.map(l => <option key={l.id} value={l.id}>{l.nama_level}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[14px] font-bold text-slate-800">Kelas</label>
                    <select required className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg outline-none focus:border-blue-600 text-[14px]"
                      value={formData.kelas_id} onChange={(e) => setFormData({...formData, kelas_id: e.target.value})}>
                      <option value="">Pilih Kelas</option>
                      {kelases.map(k => <option key={k.id} value={k.id}>{k.nama_kelas}</option>)}
                    </select>
                  </div>
                </div>

                {/* Section PG */}
                <div className="space-y-4">
                  <h3 className="text-[16px] font-bold text-slate-800 border-b border-slate-100 pb-2">Soal Pilihan Ganda</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[14px] font-bold text-slate-800">Jumlah Soal</label>
                      <input type="number" min="0" className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg outline-none focus:border-blue-600 text-[14px]"
                        value={formData.pg_jumlah} onChange={(e) => setFormData({...formData, pg_jumlah: parseInt(e.target.value) || 0})} />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[14px] font-bold text-slate-800">Bobot Nilai</label>
                      <input type="number" min="0" className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg outline-none focus:border-blue-600 text-[14px]"
                        value={formData.pg_bobot} onChange={(e) => setFormData({...formData, pg_bobot: parseInt(e.target.value) || 0})} />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[14px] font-bold text-slate-800">Soal Tampil</label>
                      <input type="number" min="0" className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg outline-none focus:border-blue-600 text-[14px]"
                        value={formData.pg_tampil} onChange={(e) => setFormData({...formData, pg_tampil: parseInt(e.target.value) || 0})} />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[14px] font-bold text-slate-800">Opsi Jawaban</label>
                      <select className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg outline-none focus:border-blue-600 text-[14px]"
                        value={formData.opsi_jawaban} onChange={(e) => setFormData({...formData, opsi_jawaban: parseInt(e.target.value) || 5})}>
                        <option value="3">3 Opsi</option>
                        <option value="4">4 Opsi</option>
                        <option value="5">5 Opsi</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Section Essay */}
                <div className="space-y-4">
                  <h3 className="text-[16px] font-bold text-slate-800 border-b border-slate-100 pb-2">Soal Essay</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[14px] font-bold text-slate-800">Jumlah Soal</label>
                      <input type="number" min="0" className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg outline-none focus:border-blue-600 text-[14px]"
                        value={formData.essay_jumlah} onChange={(e) => setFormData({...formData, essay_jumlah: parseInt(e.target.value) || 0})} />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[14px] font-bold text-slate-800">Bobot Nilai</label>
                      <input type="number" min="0" className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg outline-none focus:border-blue-600 text-[14px]"
                        value={formData.essay_bobot} onChange={(e) => setFormData({...formData, essay_bobot: parseInt(e.target.value) || 0})} />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[14px] font-bold text-slate-800">Soal Tampil</label>
                      <input type="number" min="0" className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg outline-none focus:border-blue-600 text-[14px]"
                        value={formData.essay_tampil} onChange={(e) => setFormData({...formData, essay_tampil: parseInt(e.target.value) || 0})} />
                    </div>
                  </div>
                </div>

                {/* KKM & Status */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[14px] font-bold text-slate-800">KKM</label>
                    <input type="number" min="0" className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg outline-none focus:border-blue-600 text-[14px]"
                      value={formData.kkm} onChange={(e) => setFormData({...formData, kkm: parseInt(e.target.value) || 0})} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[14px] font-bold text-slate-800">Status</label>
                    <select className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg outline-none focus:border-blue-600 text-[14px]"
                      value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})}>
                      <option value="aktif">Aktif</option>
                      <option value="draft">Draft</option>
                    </select>
                  </div>
                </div>

                {/* Checkbox */}
                <div className="flex items-center gap-3 pt-2 pb-4">
                  <input 
                    type="checkbox" 
                    id="agama_check"
                    className="w-5 h-5 border-slate-300 rounded text-blue-600 focus:ring-blue-500"
                    checked={formData.tipe === 'agama'}
                    onChange={(e) => setFormData({...formData, tipe: e.target.checked ? 'agama' : 'non-agama'})}
                  />
                  <label htmlFor="agama_check" className="text-[14px] font-bold text-slate-800 cursor-pointer">
                    Soal Agama
                  </label>
                </div>
              </div>
              
              {/* Footer Actions */}
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50 shrink-0">
                <button type="button" onClick={() => setShowModal(false)} className="px-6 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-[14px] font-bold hover:bg-slate-50 transition-all">
                  Batal
                </button>
                <button type="submit" disabled={saving} className="px-6 py-2.5 bg-[#2653D8] hover:bg-blue-700 text-white rounded-lg text-[14px] font-bold transition-all shadow-sm">
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
