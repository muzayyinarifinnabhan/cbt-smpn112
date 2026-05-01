import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, Edit2, Trash2, X, Save, 
  ArrowLeft, Upload, Image, Trash,
  CheckCircle, PlusCircle, HelpCircle, FileText
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import { useConfirmStore } from '../../store/useConfirmStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useParams, Link } from 'react-router-dom';

export default function AdminInputSoal() {
  const { profile } = useAuthStore();
  const { showConfirm } = useConfirmStore();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [bankSoal, setBankSoal] = useState(null);
  const [data, setData] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    tipe_soal: 'pg',
    pertanyaan: '',
    opsi_a: '',
    opsi_b: '',
    opsi_c: '',
    opsi_d: '',
    opsi_e: '',
    kunci_jawaban: 'A',
    gambar: null,
    gambar_url: ''
  });

  useEffect(() => {
    fetchBankSoal();
    fetchSoal();
  }, [id]);

  const fetchBankSoal = async () => {
    const { data: res } = await supabase
      .from('bank_soal')
      .select('*, master_mapel(nama_mapel), master_kelas(nama_kelas)')
      .eq('id', id)
      .single();
    setBankSoal(res);
  };

  const fetchSoal = async () => {
    setLoading(true);
    try {
      const { data: res, error } = await supabase
        .from('soal')
        .select('*')
        .eq('bank_soal_id', id)
        .order('created_at', { ascending: true });
      if (error) throw error;
      setData(res || []);
    } catch (error) {
      toast.error('Gagal memuat soal');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      tipe_soal: 'pg',
      pertanyaan: '',
      opsi_a: '',
      opsi_b: '',
      opsi_c: '',
      opsi_d: '',
      opsi_e: '',
      kunci_jawaban: 'A',
      gambar: null,
      gambar_url: ''
    });
    setIsEdit(false);
    setSelectedId(null);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      let finalImageUrl = formData.gambar_url;

      // Konversi gambar ke Base64 (tidak perlu Storage bucket)
      if (formData.gambar instanceof File) {
        if (formData.gambar.size > 2 * 1024 * 1024) {
          throw new Error('Ukuran gambar maksimal 2MB.');
        }
        finalImageUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(formData.gambar);
          reader.onload = () => resolve(reader.result);
          reader.onerror = () => reject(new Error('Gagal membaca file gambar.'));
        });
      }

      const payload = {
        bank_soal_id: id,
        tipe_soal: formData.tipe_soal,
        pertanyaan: formData.pertanyaan,
        opsi_a: formData.opsi_a,
        opsi_b: formData.opsi_b,
        opsi_c: formData.opsi_c,
        opsi_d: formData.opsi_d,
        opsi_e: formData.opsi_e,
        kunci_jawaban: formData.tipe_soal === 'pg' ? formData.kunci_jawaban : null,
        gambar_url: finalImageUrl
      };

      if (isEdit) {
        await supabase.from('soal').update(payload).eq('id', selectedId);
        toast.success('Soal diperbarui');
      } else {
        await supabase.from('soal').insert([payload]);
        toast.success('Soal baru berhasil ditambahkan');
      }

      setShowForm(false);
      resetForm();
      fetchSoal();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (soalId) => {
    showConfirm({
      title: 'Hapus Soal?',
      message: 'Apakah Anda yakin ingin menghapus soal ini? Data yang sudah dihapus tidak dapat dikembalikan.',
      confirmText: 'Ya, Hapus',
      cancelText: 'Batal',
      type: 'danger',
      onConfirm: async () => {
        try {
          await supabase.from('soal').delete().eq('id', soalId);
          toast.success('Soal berhasil dihapus');
          fetchSoal();
        } catch (error) {
          toast.error('Gagal menghapus soal');
        }
      }
    });
  };

  const startEdit = (item) => {
    setSelectedId(item.id);
    setIsEdit(true);
    setFormData({
      tipe_soal: item.tipe_soal,
      pertanyaan: item.pertanyaan,
      opsi_a: item.opsi_a || '',
      opsi_b: item.opsi_b || '',
      opsi_c: item.opsi_c || '',
      opsi_d: item.opsi_d || '',
      opsi_e: item.opsi_e || '',
      kunci_jawaban: item.kunci_jawaban || 'A',
      gambar_url: item.gambar_url || '',
      gambar: null
    });
    setShowForm(true);
  };

  return (
    <div className="min-h-full p-4 md:p-8 animate-in fade-in duration-500">
      
      {/* Header Info */}
      <div className="bg-white border border-slate-200 rounded-2xl px-6 py-5 flex items-center justify-between shadow-sm mb-6">
        <div className="flex items-center gap-4">
          <Link 
            to={profile?.role === 'guru' ? '/guru/soal' : '/admin/soal'} 
            className="p-2 hover:bg-slate-100 rounded-full transition-all text-slate-500"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-800">
              Butir Soal: {bankSoal?.master_mapel?.nama_mapel}
            </h1>
            <p className="text-sm text-slate-500 font-medium">
              {bankSoal?.kode_bank_soal} • {bankSoal?.master_kelas?.nama_kelas}
            </p>
          </div>
        </div>
        {!showForm && (
          <button 
            onClick={() => { resetForm(); setShowForm(true); }}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-md transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" /> Tambah Soal
          </button>
        )}
      </div>

      {showForm ? (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden animate-in slide-in-from-bottom duration-300">
          <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h2 className="text-lg font-bold text-indigo-900">{isEdit ? 'Edit Butir Soal' : 'Input Butir Soal Baru'}</h2>
            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-red-500">
              <X className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSave} className="p-8 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Left Column: Questions & Options */}
              <div className="lg:col-span-2 space-y-6">
                <div>
                  <label className="text-sm font-bold text-slate-700 mb-2 block">Tipe Soal</label>
                  <div className="flex gap-4">
                    {['pg', 'essay'].map((t) => (
                      <button
                        key={t} type="button"
                        onClick={() => setFormData({...formData, tipe_soal: t})}
                        className={`flex-1 py-2 px-4 rounded-xl text-sm font-bold border-2 transition-all ${
                          formData.tipe_soal === t 
                            ? "bg-indigo-600 border-indigo-600 text-white" 
                            : "bg-white border-slate-100 text-slate-400 hover:border-slate-200"
                        }`}
                      >
                        {t.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-bold text-slate-700 mb-2 block">Pertanyaan</label>
                  <textarea 
                    required
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm min-h-[120px]"
                    placeholder="Tulis soal di sini..."
                    value={formData.pertanyaan}
                    onChange={(e) => setFormData({...formData, pertanyaan: e.target.value})}
                  />
                </div>

                {formData.tipe_soal === 'pg' && (
                  <div className="space-y-4">
                    <label className="text-sm font-bold text-slate-700 block">Opsi Jawaban & Kunci</label>
                    {['a', 'b', 'c', 'd', 'e'].slice(0, bankSoal?.opsi_jawaban || 5).map((opt) => (
                      <div key={opt} className="flex items-center gap-3 group">
                        <button
                          type="button"
                          onClick={() => setFormData({...formData, kunci_jawaban: opt.toUpperCase()})}
                          className={`w-10 h-10 shrink-0 rounded-full font-bold flex items-center justify-center transition-all ${
                            formData.kunci_jawaban === opt.toUpperCase()
                              ? "bg-emerald-500 text-white shadow-lg shadow-emerald-200"
                              : "bg-slate-100 text-slate-400 hover:bg-slate-200"
                          }`}
                        >
                          {opt.toUpperCase()}
                        </button>
                        <input 
                          type="text" required
                          placeholder={`Jawaban ${opt.toUpperCase()}...`}
                          className="flex-1 px-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-sm"
                          value={formData[`opsi_${opt}`]}
                          onChange={(e) => setFormData({...formData, [`opsi_${opt}`]: e.target.value})}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Right Column: Media */}
              <div className="space-y-6">
                <div>
                  <label className="text-sm font-bold text-slate-700 mb-2 block text-center">Gambar Pendukung (Opsional)</label>
                  <div className="mt-2 flex flex-col items-center">
                    <div className="w-full aspect-video bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center p-4 relative overflow-hidden group">
                      {formData.gambar || formData.gambar_url ? (
                        <>
                          <img 
                            src={formData.gambar instanceof File ? URL.createObjectURL(formData.gambar) : formData.gambar_url} 
                            className="w-full h-full object-contain" 
                          />
                          <button 
                            onClick={() => setFormData({...formData, gambar: null, gambar_url: ''})}
                            className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <Trash className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <div className="text-center">
                          <Image className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Seret atau Klik untuk Upload Gambar</p>
                        </div>
                      )}
                      <input 
                        type="file" accept="image/*" 
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        onChange={(e) => setFormData({...formData, gambar: e.target.files[0]})}
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-3 italic font-medium">Format: JPG, PNG, WEBP (Maks 2MB)</p>
                  </div>
                </div>
              </div>

            </div>

            <div className="pt-8 border-t border-slate-50 flex justify-end gap-3">
              <button 
                type="button" onClick={() => setShowForm(false)}
                className="px-8 py-3 bg-slate-100 text-slate-500 font-bold rounded-xl hover:bg-slate-200 transition-all"
              >
                Batal
              </button>
              <button 
                type="submit" disabled={saving}
                className="px-12 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all disabled:opacity-50"
              >
                {saving ? 'Menyimpan...' : 'Simpan Soal'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="space-y-4 pb-20">
          {loading ? (
            <div className="py-20 text-center"><p className="animate-pulse font-bold text-slate-400">Memuat soal...</p></div>
          ) : data.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-20 text-center">
               <HelpCircle className="w-16 h-16 text-slate-100 mx-auto mb-4" />
               <h3 className="text-slate-400 font-black text-xl uppercase tracking-widest">Belum Ada Soal</h3>
               <p className="text-slate-400 mt-2 font-medium">Klik tombol tambah di pojok kanan atas untuk mengisi soal.</p>
            </div>
          ) : (
            data.map((item, idx) => (
              <div key={item.id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all group flex flex-col md:flex-row gap-6">
                <div className="w-12 h-12 shrink-0 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-black text-lg border-2 border-indigo-100">
                  {idx + 1}
                </div>
                
                <div className="flex-1 space-y-4">
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                      item.tipe_soal === 'pg' ? "bg-blue-100 text-blue-600" : "bg-purple-100 text-purple-600"
                    }`}>
                      {item.tipe_soal}
                    </span>
                    <span className="h-1 w-1 rounded-full bg-slate-300"></span>
                    <span className="text-[11px] text-slate-400 font-bold">{new Date(item.created_at).toLocaleString('id-ID')}</span>
                  </div>

                  <p className="text-slate-800 font-medium leading-relaxed whitespace-pre-wrap">{item.pertanyaan}</p>
                  
                  {item.gambar_url && (
                    <img src={item.gambar_url} className="max-h-60 rounded-xl border border-slate-100 shadow-sm" />
                  )}

                  {item.tipe_soal === 'pg' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                      {['a','b','c','d','e'].slice(0, bankSoal?.opsi_jawaban_jumlah || 5).map(opt => item[`opsi_${opt}`] && (
                        <div key={opt} className={`flex items-center gap-3 p-3 rounded-xl border ${
                          item.kunci_jawaban === opt.toUpperCase() 
                            ? "bg-emerald-50 border-emerald-200" 
                            : "bg-slate-50 border-slate-100"
                        }`}>
                          <span className={`w-8 h-8 shrink-0 rounded-lg flex items-center justify-center font-bold text-xs ${
                            item.kunci_jawaban === opt.toUpperCase() ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-500"
                          }`}>
                            {opt.toUpperCase()}
                          </span>
                          <span className={`text-[13px] font-medium ${item.kunci_jawaban === opt.toUpperCase() ? "text-emerald-700" : "text-slate-600"}`}>
                            {item[`opsi_${opt}`]}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex md:flex-col gap-2 shrink-0">
                  <button onClick={() => startEdit(item)} className="p-3 bg-white border border-slate-100 rounded-2xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all font-bold">
                    <Edit2 className="w-5 h-5" />
                  </button>
                  <button onClick={() => handleDelete(item.id)} className="p-3 bg-white border border-slate-100 rounded-2xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all font-bold">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

    </div>
  );
}
