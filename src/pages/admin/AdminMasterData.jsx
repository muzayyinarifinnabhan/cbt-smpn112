import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Search, Edit2, Trash2, Plus, X, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useParams, Navigate } from 'react-router-dom';

export default function AdminMasterData() {
  const { tab } = useParams(); // 'mapel', 'kelas', dll
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({});
  const [extraData, setExtraData] = useState({});

  // Mapper tab parameter ke nama tabel dan title header
  const tableConfig = {
    'mapel': { 
      table: 'master_mapel', 
      title: 'Mata Pelajaran', 
      subtitle: 'Kelola data mata pelajaran',
      fields: [
        { id: 'kode', label: 'Kode', dbField: 'kode_mapel', placeholder: 'Contoh: BIND_8' },
        { id: 'nama', label: 'Nama', dbField: 'nama_mapel', placeholder: 'Contoh: Bahasa Indonesia Kelas 8' }
      ]
    },
    'jenis_ujian': { 
      table: 'master_jenis_ujian', 
      title: 'Jenis Ujian', 
      subtitle: 'Kelola data referensi jenis ujian',
      fields: [
        { id: 'kode', label: 'Kode', dbField: 'kode_jenis_ujian', placeholder: 'Contoh: PTS' },
        { id: 'nama', label: 'Nama', dbField: 'nama_ujian', placeholder: 'Contoh: Penilaian Tengah Semester' }
      ]
    },
    'kelas': { 
      table: 'master_kelas', 
      title: 'Kelas', 
      subtitle: 'Kelola data kelas siswa',
      fields: [
        { id: 'kode', label: 'Kode', dbField: 'kode_kelas', placeholder: 'Contoh: VIII_A' },
        { id: 'nama', label: 'Nama', dbField: 'nama_kelas', placeholder: 'Contoh: Kelas VIII A' },
        { 
          id: 'tingkat', 
          label: 'Tingkat', 
          dbField: 'level_id', 
          type: 'select', 
          source: 'master_level', 
          displayKey: 'nama_level' 
        }
      ]
    },
    'ruangan': { 
      table: 'master_ruangan', 
      title: 'Ruangan', 
      subtitle: 'Kelola data ruang ujian',
      fields: [
        { id: 'kode', label: 'Kode', dbField: 'kode_ruangan', placeholder: 'Contoh: R01' },
        { id: 'nama', label: 'Nama', dbField: 'nama_ruangan', placeholder: 'Contoh: Ruang Lab Komputer 1' },
        { id: 'kapasitas', label: 'Kapasitas', dbField: 'kapasitas', placeholder: 'Contoh: 40' }
      ]
    },
    'level': { 
      table: 'master_level', 
      title: 'Level', 
      subtitle: 'Kelola data tingkatan/level kelas',
      fields: [
        { id: 'nama', label: 'Nama Level', dbField: 'nama_level', placeholder: 'Contoh: Kelas 7 atau Tingkat 1' }
      ]
    },
    'sesi': { 
      table: 'master_sesi', 
      title: 'Sesi', 
      subtitle: 'Kelola data pembagian sesi waktu ujian',
      fields: [
        { id: 'kode', label: 'Kode', dbField: 'kode_sesi', placeholder: 'Contoh: 1' },
        { id: 'nama', label: 'Nama', dbField: 'nama_sesi', placeholder: 'Contoh: Pagi' },
        { id: 'mulai', label: 'Waktu Mulai', dbField: 'waktu_mulai', type: 'time' },
        { id: 'selesai', label: 'Waktu Selesai', dbField: 'waktu_selesai', type: 'time' }
      ]
    },
    'server': { 
      table: 'master_server', 
      title: 'Server', 
      subtitle: 'Kelola data lokasi server / lab',
      fields: [
        { id: 'nama', label: 'Nama', dbField: 'nama_server', placeholder: 'Contoh: SMPN112JKT' },
        { id: 'ip', label: 'IP Address', dbField: 'ip_address', placeholder: 'Contoh: 10.150.234.217' },
        { 
          id: 'status', 
          label: 'Status', 
          dbField: 'status', 
          type: 'select', 
          options: [
            { id: 'Aktif', label: 'Aktif' },
            { id: 'Tidak Aktif', label: 'Tidak Aktif' }
          ] 
        }
      ]
    },
  };

  const config = tableConfig[tab];

  const fetchData = async () => {
    if (!config) return;
    setLoading(true);
    
    // Fetch main table data with join if necessary
    let query = supabase.from(config.table).select('*');
    
    // Custom join for Kelas to show Level name
    if (tab === 'kelas') {
      query = supabase.from('master_kelas').select('*, master_level(nama_level)');
    }

    const { data: result, error } = await query.order('created_at', { ascending: true });
    if (!error && result) {
      setData(result);
    }

    // Fetch related data if config specifies select fields
    if (config.fields) {
      for (const field of config.fields) {
        if (field.type === 'select' && field.source) {
          const { data: sourceData } = await supabase.from(field.source).select('*').order('created_at', { ascending: true });
          if (sourceData) {
            setExtraData(prev => ({ ...prev, [field.source]: sourceData }));
          }
        }
      }
    }
    
    setLoading(false);
  };

  const handleEdit = (row) => {
    setEditingId(row.id);
    const newFormData = {};
    config.fields?.forEach(f => {
      newFormData[f.id] = row[f.dbField];
    });
    setFormData(newFormData);
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    
    // Basic validation
    const payload = {};
    if (config.fields) {
      for (const f of config.fields) {
        if (!formData[f.id]) {
          toast.error(`${f.label} tidak boleh kosong`);
          return;
        }
        payload[f.dbField] = formData[f.id];
      }
    }

    setSaving(true);
    try {
      let query;
      if (editingId) {
        query = supabase
          .from(config.table)
          .update(payload)
          .eq('id', editingId);
      } else {
        query = supabase
          .from(config.table)
          .insert(payload);
      }

      const { error } = await query;

      if (error) throw error;

      toast.success(`${config.title} berhasil ${editingId ? 'diperbarui' : 'disimpan'}`);
      setIsModalOpen(false);
      setEditingId(null);
      setFormData({});
      fetchData();
    } catch (error) {
      console.error('Error saving data:', error);
      toast.error('Gagal menyimpan: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      setSaving(true);
      const { error } = await supabase
        .from(config.table)
        .delete()
        .eq('id', deleteTarget.id);

      if (error) throw error;
      
      toast.success(`${config.title} berhasil dihapus`);
      setIsDeleteModalOpen(false);
      setDeleteTarget(null);
      fetchData();
    } catch (error) {
      console.error('Error deleting data:', error);
      toast.error('Gagal menghapus: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [tab]);

  if (!config) return <Navigate to="/admin/master/mapel" replace />;

  return (
    <div className="min-h-full animate-in fade-in duration-300">
      
      {/* Top Page Header as seen in reference */}
      <div className="bg-white border-b border-slate-200 px-8 py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-bold text-slate-800">{config.title}</h1>
          <p className="text-sm text-slate-500 font-medium">{config.subtitle}</p>
        </div>
        <button 
          onClick={() => {
            setEditingId(null);
            setFormData({});
            setIsModalOpen(true);
          }}
          className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm"
        >
          <Plus className="w-4 h-4" /> Tambah
        </button>
      </div>

      <div className="p-8">
        {/* Content Box */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden min-h-[400px]">
          
          {/* Top Tools Bar */}
          <div className="p-4 border-b border-slate-100 flex items-center">
            <div className="relative w-full max-w-sm">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Cari.." 
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-[13px] bg-slate-50 hover:bg-white transition-colors"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white border-b border-slate-100 text-slate-400 text-[13px] font-medium tracking-wide">
                  {/* Render Headers from Config Fields */}
                  {config.fields?.map((field) => (
                    <th key={field.id} className="px-6 py-4 uppercase tracking-wider text-[11px] font-bold text-slate-400">
                      {field.label}
                    </th>
                  ))}
                  <th className="px-6 py-4 w-40 text-left uppercase tracking-wider text-[11px] font-bold text-slate-400">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.length === 0 && !loading ? (
                  <tr>
                    <td colSpan="100%" className="px-6 py-12 text-center text-slate-400 text-sm italic">Belum ada data {config.title.toLowerCase()}.</td>
                  </tr>
                ) : (
                  data.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/50 transition-colors group">
                      {config.fields?.map((field) => (
                        <td key={field.id} className="px-6 py-4 text-[13px] text-slate-700 font-medium">
                          {field.type === 'select' && field.source === 'master_level' ? (
                            <span className="px-2.5 py-1 bg-blue-50 text-blue-600 rounded-md text-[11px] font-bold border border-blue-100 uppercase tracking-tight">
                              {row.master_level?.nama_level || '-'}
                            </span>
                          ) : (
                            row[field.dbField]?.toString() || '-'
                          )}
                        </td>
                      ))}
                      <td className="px-6 py-4">
                        <div className="flex justify-start gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => handleEdit(row)}
                            className="p-1.5 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-600 rounded shadow-sm transition-all" 
                            title="Edit"
                          >
                            <Edit2 className="w-[14px] h-[14px]" />
                          </button>
                          <button 
                            onClick={() => {
                              const nameField = config.fields?.find(f => f.id === 'nama') || config.fields?.[0];
                              setDeleteTarget({ id: row.id, name: row[nameField?.dbField] || 'data ini' });
                              setIsDeleteModalOpen(true);
                            }}
                            className="p-1.5 bg-white border border-red-100 hover:border-red-300 hover:bg-red-50 text-red-500 rounded shadow-sm transition-all" 
                            title="Hapus"
                          >
                            <Trash2 className="w-[14px] h-[14px]" />
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
      </div>

        
      
      {/* Modal Tambah Data (Dynamic) */}
      {isModalOpen && config.fields && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" 
            onClick={() => {
              setIsModalOpen(false);
              setEditingId(null);
              setFormData({});
            }}
          ></div>
          
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-800">{editingId ? 'Edit' : 'Tambah'} {config.title}</h3>
              <button 
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingId(null);
                  setFormData({});
                }}
                className="p-1 hover:bg-slate-100 rounded-full transition-colors text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSave} className="p-6 space-y-5">
              {config.fields.map((field) => (
                <div key={field.id}>
                  <label className="block text-sm font-bold text-slate-700 mb-2">{field.label}</label>
                  {field.type === 'select' ? (
                    <select
                      required
                      value={formData[field.id] || ''}
                      onChange={(e) => setFormData({...formData, [field.id]: e.target.value})}
                      className="w-full px-4 py-3 bg-white border-2 border-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-medium text-slate-800"
                    >
                      <option value="">Pilih {field.label}..</option>
                      {field.options ? (
                        field.options.map(opt => (
                          <option key={opt.id} value={opt.id}>{opt.label}</option>
                        ))
                      ) : (
                        extraData[field.source]?.map(option => (
                          <option key={option.id} value={option.id}>
                            {option[field.displayKey]}
                          </option>
                        ))
                      )}
                    </select>
                  ) : field.type === 'time' ? (
                    <input
                      type="time"
                      required
                      value={formData[field.id] || ''}
                      onChange={(e) => setFormData({...formData, [field.id]: e.target.value})}
                      className="w-full px-4 py-3 bg-white border-2 border-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-medium text-slate-800"
                    />
                  ) : (
                    <input
                      type="text"
                      required
                      value={formData[field.id] || ''}
                      onChange={(e) => setFormData({...formData, [field.id]: e.target.value})}
                      className="w-full px-4 py-3 bg-white border-2 border-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-medium text-slate-800 placeholder:text-slate-300 shadow-sm"
                      placeholder={field.placeholder}
                    />
                  )}
                </div>
              ))}

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-50 mt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingId(null);
                    setFormData({});
                  }}
                  className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-600 border-2 border-slate-100 hover:bg-slate-50 transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2"
                >
                  {saving ? (
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : null}
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modern Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity" 
            onClick={() => !saving && setIsDeleteModalOpen(false)}
          ></div>
          
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-[400px] overflow-hidden animate-in zoom-in-95 fade-in duration-300">
            <div className="p-8 flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-6 animate-bounce duration-[2000ms] infinite">
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
              
              <h3 className="text-xl font-bold text-slate-800 mb-2">Konfirmasi Hapus</h3>
              <p className="text-slate-500 text-sm leading-relaxed">
                Apakah Anda yakin ingin menghapus <span className="font-bold text-slate-700">"{deleteTarget?.name}"</span>? 
                <br />Tindakan ini tidak dapat dibatalkan.
              </p>

              <div className="grid grid-cols-2 gap-3 w-full mt-8">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="px-6 py-3 rounded-2xl text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleDelete}
                  className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-2xl text-sm font-bold shadow-lg shadow-red-500/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {saving ? (
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : 'Ya, Hapus'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}