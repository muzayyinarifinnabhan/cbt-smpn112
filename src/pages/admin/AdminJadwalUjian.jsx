import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, Edit2, Trash2, X, Save, 
  Calendar, Clock, Key, CheckCircle, 
  AlertCircle, ChevronRight, ChevronDown, Hash, Users, BookOpen
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import { useConfirmStore } from '../../store/useConfirmStore';
import { format } from 'date-fns';

export default function AdminJadwalUjian() {
  const { showConfirm } = useConfirmStore();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  // Data Referensi
  const [jenisUjian, setJenisUjian] = useState([]);
  const [mapels, setMapels] = useState([]);
  const [kelas, setKelas] = useState([]);
  const [gurus, setGurus] = useState([]);

  // Form State
  const [formData, setFormData] = useState({
    nama_ujian: '',
    jenis_ujian_id: '',
    guru_id: '',
    mapel_id: '',
    kelas_id: '',
    token: '',
    durasi_menit: 60,
    waktu_mulai: '',
    waktu_selesai: '',
    status_ujian: 'menunggu',
    acak_soal: false,
    acak_jawaban: false,
    hasil_tampil: false,
    reset_login: true,
    ulang_kkm: false
  });

  useEffect(() => {
    fetchData();
    fetchReferences();
  }, []);

  const fetchReferences = async () => {
    const { data: j } = await supabase.from('master_jenis_ujian').select('*');
    const { data: m } = await supabase.from('master_mapel').select('*');
    const { data: k } = await supabase.from('master_kelas').select('*');
    const { data: g } = await supabase.from('profiles').select('id, nama_lengkap').eq('role', 'guru').order('nama_lengkap');
    setJenisUjian(j || []);
    setMapels(m || []);
    setKelas(k || []);
    setGurus(g || []);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: res, error } = await supabase
        .from('jadwal_ujian')
        .select(`
          *,
          master_jenis_ujian (nama_ujian),
          bank_soal (
            *,
            master_mapel (nama_mapel),
            master_kelas (nama_kelas)
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setData(res || []);
    } catch (error) {
      toast.error('Gagal memuat jadwal ujian');
    } finally {
      setLoading(false);
    }
  };

  const generateToken = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let token = '';
    for (let i = 0; i < 6; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData({ ...formData, token });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      let finalBankSoalId = null;

      if (!isEdit) {
        // Auto-create Bank Soal untuk ujian resmi Admin
        const bsPayload = {
          kode_bank_soal: `BS-${formData.nama_ujian.replace(/[^a-zA-Z0-9]/g, '').substring(0, 10).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`,
          guru_id: formData.guru_id,
          mapel_id: formData.mapel_id,
          kelas_id: formData.kelas_id,
          pg_jumlah: 0,
          pg_bobot: 0,
          pg_tampil: 0,
          opsi_jawaban: 5,
          essay_jumlah: 0,
          essay_bobot: 0,
          essay_tampil: 0,
          kkm: 70,
          status: 'aktif',
          tipe: 'non-agama'
        };
        const { data: newBs, error: bsErr } = await supabase.from('bank_soal').insert([bsPayload]).select('id').single();
        if (bsErr) throw new Error('Gagal membuat bank soal otomatis: ' + bsErr.message);
        finalBankSoalId = newBs.id;
      }

      const payload = {
        nama_ujian: formData.nama_ujian,
        jenis_ujian_id: formData.jenis_ujian_id,
        guru_id: formData.guru_id,
        token: formData.token,
        durasi_menit: formData.durasi_menit,
        waktu_mulai: formData.waktu_mulai,
        waktu_selesai: formData.waktu_selesai,
        tanggal: formData.waktu_mulai.split('T')[0],
        status_ujian: formData.status_ujian,
        acak_soal: formData.acak_soal,
        acak_jawaban: formData.acak_jawaban,
        hasil_tampil: formData.hasil_tampil,
        reset_login: formData.reset_login,
        ulang_kkm: formData.ulang_kkm
      };

      if (isEdit) {
        await supabase.from('jadwal_ujian').update(payload).eq('id', selectedId);
        toast.success('Jadwal ujian diperbarui');
      } else {
        payload.bank_soal_id = finalBankSoalId;
        await supabase.from('jadwal_ujian').insert([payload]);
        toast.success('Jadwal ujian berhasil dibuat beserta Bank Soalnya');
      }

      setShowModal(false);
      fetchData();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (item) => {
    setIsEdit(true);
    setSelectedId(item.id);
    setFormData({
      nama_ujian: item.nama_ujian,
      jenis_ujian_id: item.jenis_ujian_id,
      guru_id: item.guru_id || item.bank_soal?.guru_id || '',
      mapel_id: item.bank_soal?.mapel_id || '',
      kelas_id: item.bank_soal?.kelas_id || '',
      token: item.token || '',
      durasi_menit: item.durasi_menit,
      waktu_mulai: item.waktu_mulai ? item.waktu_mulai.substring(0, 16) : '',
      waktu_selesai: item.waktu_selesai ? item.waktu_selesai.substring(0, 16) : '',
      status_ujian: item.status_ujian,
      acak_soal: item.acak_soal,
      acak_jawaban: item.acak_jawaban,
      hasil_tampil: item.hasil_tampil,
      reset_login: item.reset_login,
      ulang_kkm: item.ulang_kkm
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    showConfirm({
      title: 'Hapus Jadwal?',
      message: 'Apakah Anda yakin ingin menghapus jadwal ujian ini? Semua data statistik terkait akan ikut terhapus.',
      confirmText: 'Ya, Hapus',
      cancelText: 'Batal',
      type: 'danger',
      onConfirm: async () => {
        await supabase.from('jadwal_ujian').delete().eq('id', id);
        toast.success('Jadwal berhasil dihapus');
        fetchData();
      }
    });
  };

  return (
    <div className="min-h-full p-4 md:p-8 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Jadwal Ujian</h1>
          <p className="text-slate-500 text-[13px] font-medium">Kelola dan atur jadwal pelaksanaan ujian</p>
        </div>
        <button 
          onClick={() => {
            setIsEdit(false);
            setFormData({
              nama_ujian: '',
              jenis_ujian_id: '',
              guru_id: '',
              mapel_id: '',
              kelas_id: '',
              token: '',
              durasi_menit: 60,
              waktu_mulai: '',
              waktu_selesai: '',
              status_ujian: 'menunggu',
              acak_soal: false,
              acak_jawaban: false,
              hasil_tampil: false,
              reset_login: true,
              ulang_kkm: false
            });
            setShowModal(true);
          }}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-md transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          Tambah Ujian
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-5">
           <div className="bg-indigo-50 p-3 rounded-2xl"><Calendar className="w-6 h-6 text-indigo-600" /></div>
           <div><div className="text-2xl font-black text-slate-800">{data.length}</div><div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Jadwal</div></div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-5">
           <div className="bg-green-50 p-3 rounded-2xl"><CheckCircle className="w-6 h-6 text-green-600" /></div>
           <div><div className="text-2xl font-black text-slate-800">{data.filter(i => i.status_ujian === 'aktif').length}</div><div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ujian Aktif</div></div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-5">
           <div className="bg-amber-50 p-3 rounded-2xl"><Clock className="w-6 h-6 text-amber-600" /></div>
           <div><div className="text-2xl font-black text-slate-800">{data.filter(i => i.status_ujian === 'menunggu').length}</div><div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Menunggu</div></div>
        </div>
      </div>

      {/* Table Content */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                <th className="px-6 py-5">Ujian / Mapel</th>
                <th className="px-6 py-5">Kelas</th>
                <th className="px-6 py-5">Waktu & Durasi</th>
                <th className="px-6 py-5">Token</th>
                <th className="px-6 py-5">Status</th>
                <th className="px-6 py-5 text-right px-8">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan="6" className="px-6 py-12 text-center text-slate-400 italic">Memuat data jadwal...</td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan="6" className="px-6 py-12 text-center text-slate-400 italic">Belum ada jadwal ujian.</td></tr>
              ) : (
                data.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-5">
                      <div className="text-[14px] font-bold text-slate-800">{item.nama_ujian}</div>
                      <div className="text-[12px] text-slate-500 font-medium">{item.bank_soal?.master_mapel?.nama_mapel}</div>
                    </td>
                    <td className="px-6 py-5">
                      <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[11px] font-bold">
                        {item.bank_soal?.master_kelas?.nama_kelas}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="text-[13px] font-bold text-slate-700">{format(new Date(item.waktu_mulai), 'dd/MM/yyyy HH:mm')}</div>
                      <div className="text-[11px] text-slate-400 font-medium">{item.durasi_menit} Menit</div>
                    </td>
                    <td className="px-6 py-5">
                      <span className="font-mono bg-indigo-50 text-indigo-700 px-3 py-1 rounded-lg text-xs font-black tracking-widest border border-indigo-100">
                        {item.token || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        item.status_ujian === 'aktif' ? 'bg-green-50 text-green-600 border border-green-100' :
                        item.status_ujian === 'selesai' ? 'bg-slate-50 text-slate-400 border border-slate-100' :
                        'bg-blue-50 text-blue-600 border border-blue-100'
                      }`}>
                        {item.status_ujian}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-right px-8">
                       <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button onClick={() => startEdit(item)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-indigo-600"><Edit2 className="w-4 h-4" /></button>
                         <button onClick={() => handleDelete(item.id)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                       </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Tambah Ujian (Premium Refinement) */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-xl rounded-[32px] shadow-2xl overflow-hidden border border-white/20 animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
            
            {/* Header Modal */}
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-black text-slate-800 tracking-tight">Tambah Ujian</h2>
              <button onClick={() => setShowModal(false)} className="w-10 h-10 flex items-center justify-center hover:bg-slate-100 rounded-full text-slate-400 hover:text-red-500 transition-all">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSave} className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-6">
              
              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-[13px] font-black text-slate-700 ml-1">Nama Ujian</label>
                  <div className="relative">
                    <select 
                      required
                      className="w-full pl-4 pr-10 py-3.5 bg-slate-50/80 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-slate-700 appearance-none cursor-pointer"
                      value={formData.jenis_ujian_id}
                      onChange={(e) => {
                        const selected = jenisUjian.find(v => v.id === e.target.value);
                        setFormData({ ...formData, jenis_ujian_id: e.target.value, nama_ujian: selected?.nama_ujian || '' });
                      }}
                    >
                      <option value="">-- Pilih Nama Ujian --</option>
                      {jenisUjian.map(j => <option key={j.id} value={j.id}>{j.nama_ujian}</option>)}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-[13px] font-black text-slate-700 ml-1">Guru Pengampu</label>
                  <div className="relative">
                    <select 
                      required
                      disabled={isEdit}
                      className="w-full pl-4 pr-10 py-3.5 bg-slate-50/80 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-slate-700 appearance-none cursor-pointer disabled:opacity-50"
                      value={formData.guru_id}
                      onChange={(e) => setFormData({ ...formData, guru_id: e.target.value })}
                    >
                      <option value="">-- Pilih Guru --</option>
                      {gurus.map(g => <option key={g.id} value={g.id}>{g.nama_lengkap}</option>)}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-[13px] font-black text-slate-700 ml-1">Mata Pelajaran</label>
                  <div className="relative">
                    <select 
                      required
                      className="w-full pl-4 pr-10 py-3.5 bg-slate-50/80 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-slate-700 appearance-none cursor-pointer"
                      value={formData.mapel_id}
                      onChange={(e) => setFormData({ ...formData, mapel_id: e.target.value })}
                    >
                      <option value="">-- Pilih --</option>
                      {mapels.map(m => <option key={m.id} value={m.id}>{m.nama_mapel}</option>)}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[13px] font-black text-slate-700 ml-1">Kelas</label>
                  <div className="relative">
                    <select 
                      required
                      className="w-full pl-4 pr-10 py-3.5 bg-slate-50/80 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-slate-700 appearance-none cursor-pointer"
                      value={formData.kelas_id}
                      onChange={(e) => setFormData({ ...formData, kelas_id: e.target.value })}
                    >
                      <option value="">-- Pilih --</option>
                      {kelas.map(k => <option key={k.id} value={k.id}>{k.nama_kelas}</option>)}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-[13px] font-black text-slate-700 ml-1">Token</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" readOnly
                      placeholder="TOKEN"
                      className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-black text-indigo-600 tracking-widest outline-none shadow-inner"
                      value={formData.token}
                    />
                    <button 
                      type="button" onClick={generateToken}
                      className="w-12 h-12 flex items-center justify-center bg-white border border-slate-200 rounded-2xl text-slate-500 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm active:scale-90"
                    >
                      <Key className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[13px] font-black text-slate-700 ml-1">Durasi (menit)</label>
                  <input 
                    type="number" required
                    className="w-full px-5 py-3.5 bg-slate-50/80 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 font-bold"
                    value={formData.durasi_menit}
                    onChange={(e) => setFormData({ ...formData, durasi_menit: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-[13px] font-black text-slate-700 ml-1 text-sky-600">Tanggal Mulai</label>
                  <input 
                    type="datetime-local" required
                    className="w-full px-4 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-sky-500 transition-all font-bold text-slate-600"
                    value={formData.waktu_mulai}
                    onChange={(e) => setFormData({ ...formData, waktu_mulai: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[13px] font-black text-slate-700 ml-1 text-indigo-600">Tanggal Selesai</label>
                  <input 
                    type="datetime-local" required
                    className="w-full px-4 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-indigo-500 transition-all font-bold text-slate-600"
                    value={formData.waktu_selesai}
                    onChange={(e) => setFormData({ ...formData, waktu_selesai: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[13px] font-black text-slate-700 ml-1">Status</label>
                <div className="relative">
                  <select 
                    className="w-full pl-4 pr-10 py-3.5 bg-slate-50/80 border border-slate-200 rounded-2xl outline-none appearance-none cursor-pointer font-bold text-slate-700"
                    value={formData.status_ujian}
                    onChange={(e) => setFormData({ ...formData, status_ujian: e.target.value })}
                  >
                    <option value="menunggu">Menunggu</option>
                    <option value="aktif">Aktif</option>
                    <option value="selesai">Selesai</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Toggles Group */}
              <div className="grid grid-cols-2 gap-x-12 gap-y-5 pt-4">
                <SwitchLabel 
                  label="Acak Soal" 
                  checked={formData.acak_soal} 
                  onChange={(v) => setFormData({ ...formData, acak_soal: v })} 
                />
                <SwitchLabel 
                  label="Acak Jawaban" 
                  checked={formData.acak_jawaban} 
                  onChange={(v) => setFormData({ ...formData, acak_jawaban: v })} 
                />
                <SwitchLabel 
                  label="Hasil Tampil" 
                  checked={formData.hasil_tampil} 
                  onChange={(v) => setFormData({ ...formData, hasil_tampil: v })} 
                />
                <SwitchLabel 
                  label="Reset Login" 
                  checked={formData.reset_login} 
                  onChange={(v) => setFormData({ ...formData, reset_login: v })} 
                />
                <SwitchLabel 
                  label="Ulang KKM" 
                  checked={formData.ulang_kkm} 
                  onChange={(v) => setFormData({ ...formData, ulang_kkm: v })} 
                />
              </div>

              <div className="pt-10 flex justify-end gap-3">
                <button 
                  type="button" onClick={() => setShowModal(false)}
                  className="px-10 py-4 bg-slate-100 text-slate-500 font-black rounded-2xl hover:bg-slate-200 transition-all tracking-wide text-sm"
                >
                  Batal
                </button>
                <button 
                  type="submit" disabled={saving}
                  className="px-14 py-4 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 shadow-xl shadow-indigo-200 transition-all active:scale-95 disabled:opacity-50 tracking-wide text-sm"
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

function SwitchLabel({ label, checked, onChange }) {
  return (
    <div className="flex items-center justify-between group cursor-pointer" onClick={() => onChange(!checked)}>
      <span className="text-[13px] font-bold text-slate-600 group-hover:text-slate-800 transition-colors">{label}</span>
      <div className={`w-11 h-6 rounded-full relative transition-all ${checked ? 'bg-indigo-600 shadow-lg shadow-indigo-200' : 'bg-slate-200'}`}>
        <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${checked ? 'translate-x-5' : ''}`}></div>
      </div>
    </div>
  );
}
