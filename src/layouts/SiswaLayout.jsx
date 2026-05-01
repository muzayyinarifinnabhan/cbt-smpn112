import { Outlet, Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { LogOut } from 'lucide-react';
import { useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function SiswaLayout() {
  const { user, profile, signOut } = useAuthStore();

  // Heartbeat untuk status online
  useEffect(() => {
    if (!profile?.id) return;

    const updateStatus = async () => {
      await supabase
        .from('profiles')
        .update({ last_seen: new Date().toISOString() })
        .eq('id', profile.id);
    };

    updateStatus(); // Jalankan saat pertama load
    const interval = setInterval(updateStatus, 60000); // Setiap 60 detik

    return () => clearInterval(interval);
  }, [profile?.id]);

  if (!user || !profile) return <Navigate to="/login" replace />;
  if (profile.role !== 'siswa') return <Navigate to="/unauthorized" replace />;

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans">
      {/* Navbar Atas */}
      <header className="bg-white border-b border-gray-200 px-4 md:px-8 py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <img src="/logo.png" alt="Logo SMPN 112" className="w-10 h-10 object-contain drop-shadow-sm" />
          <div className="flex flex-col">
            <h1 className="text-[17px] font-bold text-slate-800 leading-tight">CBT SMP Negeri 112 Jakarta</h1>
            <span className="text-xs text-slate-500 font-medium">Sistem Ujian Berbasis Komputer</span>
          </div>
        </div>
        
        <button 
          onClick={() => signOut()} 
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 font-medium text-sm transition-colors"
        >
          <LogOut className="w-4 h-4" /> Keluar
        </button>
      </header>

      {/* Konten Utama */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 md:p-6 lg:p-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-sm text-slate-400 font-medium">
        © 2024 CBT SMP Negeri 112 Jakarta - "BerPIJAR"
      </footer>
    </div>
  );
}
