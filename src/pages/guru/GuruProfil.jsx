import React, { useState, useRef } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { User, Hash, Lock, CheckCircle2, XCircle, Camera } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';

export default function GuruProfil() {
  const { profile, setAuth } = useAuthStore();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleUploadAvatar = async (event) => {
    try {
      setUploading(true);
      
      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('Pilih gambar untuk diunggah.');
      }

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${profile.id}-${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      // 1. Upload to Supabase Storage (bucket 'avatars')
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        throw uploadError;
      }

      // 2. Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // 3. Update Profiles Table
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', profile.id);

      if (updateError) {
        throw updateError;
      }

      // 4. Update Local Zustand Store
      setAuth(useAuthStore.getState().session, { ...profile, avatar_url: publicUrl });

      toast.success('Foto profil berhasil diperbarui!');
    } catch (error) {
      toast.error('Gagal mengunggah gambar: ' + error.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-full bg-[#f8fafc] animate-in fade-in duration-500 p-6 md:p-8">
      
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-[28px] font-bold text-slate-800 tracking-tight leading-none mb-2">
          Profil Saya
        </h1>
        <p className="text-[15px] font-medium text-slate-500">
          Informasi akun dan data diri Anda
        </p>
      </div>

      <div className="max-w-3xl bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
        {/* Banner/Top section */}
        <div className="h-32 bg-gradient-to-r from-blue-600 to-indigo-700"></div>
        
        {/* Profile Info */}
        <div className="px-8 pb-8 relative">
          
          {/* Avatar */}
          <div className="absolute -top-12 left-8 group">
            <div className="w-24 h-24 bg-white rounded-full p-1.5 shadow-md relative overflow-hidden">
              <div className="w-full h-full bg-slate-100 rounded-full flex items-center justify-center text-blue-600 overflow-hidden relative">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-10 h-10" />
                )}
                
                {/* Upload Overlay */}
                <div 
                  onClick={() => !uploading && fileInputRef.current?.click()}
                  className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                >
                  {uploading ? (
                    <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Camera className="w-6 h-6 text-white" />
                  )}
                </div>
              </div>
            </div>
            
            <input 
              type="file" 
              ref={fileInputRef}
              className="hidden" 
              accept="image/*"
              onChange={handleUploadAvatar}
              disabled={uploading}
            />
          </div>

          <div className="pt-16">
            <h2 className="text-2xl font-bold text-slate-800">{profile?.nama_lengkap}</h2>
            <p className="text-slate-500 font-medium mt-1">
              Guru {profile?.mapel_diajar ? profile.mapel_diajar : '/ Tenaga Pendidik'}
            </p>

            {/* Tags */}
            <div className="flex flex-wrap items-center gap-3 mt-6">
              <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl">
                <Hash className="w-4 h-4 text-slate-400" />
                <span className="text-sm font-semibold text-slate-700">
                  NIP: {profile?.nip || 'Belum diatur'}
                </span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl">
                <Lock className="w-4 h-4 text-slate-400" />
                <span className="text-sm font-semibold text-slate-700">
                  Username: {profile?.username}
                </span>
              </div>
            </div>

            {/* Section Wali Kelas */}
            <div className="mt-10 pt-8 border-t border-slate-100">
              <h3 className="text-lg font-bold text-slate-800 mb-4">Status Kewalikelasan</h3>
              
              {profile?.is_wali_kelas ? (
                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6 flex items-start gap-4">
                  <div className="p-3 bg-emerald-100 rounded-xl shrink-0">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <h4 className="text-emerald-800 font-bold text-base mb-1">Anda adalah Wali Kelas</h4>
                    <p className="text-emerald-600/80 text-sm font-medium">
                      Sesuai dengan data pusat, Anda ditugaskan sebagai wali untuk kelas <span className="font-bold text-emerald-700 text-[15px] bg-emerald-200/50 px-2 py-0.5 rounded ml-1">{profile?.kelas_diwalikan || '-'}</span>.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 flex items-start gap-4">
                  <div className="p-3 bg-slate-200 rounded-xl shrink-0">
                    <XCircle className="w-6 h-6 text-slate-500" />
                  </div>
                  <div>
                    <h4 className="text-slate-700 font-bold text-base mb-1">Bukan Wali Kelas</h4>
                    <p className="text-slate-500 text-sm font-medium">
                      Saat ini Anda tidak didaftarkan sebagai wali kelas aktif di sistem.
                    </p>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
      
    </div>
  );
}
