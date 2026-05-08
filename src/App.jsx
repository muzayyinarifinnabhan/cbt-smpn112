import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { supabase } from './lib/supabase';
import { useAuthStore } from './store/useAuthStore';
import { Toaster } from 'sonner';

// Layouts
import DashboardLayout from './layouts/DashboardLayout';
import SiswaLayout from './layouts/SiswaLayout';
import ConfirmModal from './components/ConfirmModal';

// Pages
import Login from './pages/Login';
import Unauthorized from './pages/Unauthorized';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminMasterData from './pages/admin/AdminMasterData';
import AdminPeserta from './pages/admin/AdminPeserta';
import AdminCetakKartu from './pages/admin/AdminCetakKartu';
import AdminBankSoal from './pages/admin/AdminBankSoal';
import AdminInputSoal from './pages/admin/AdminInputSoal';
import AdminStatusPeserta from './pages/admin/AdminStatusPeserta';
import AdminJadwalUjian from './pages/admin/AdminJadwalUjian';
import AdminResetUjian from './pages/admin/AdminResetUjian';
import AdminHasilNilai from './pages/admin/AdminHasilNilai';
import AdminSemuaNilai from './pages/admin/AdminSemuaNilai';
import AdminDaftarHadir from './pages/admin/AdminDaftarHadir';
import AdminDataAdministrator from './pages/admin/AdminDataAdministrator';
import AdminDataGuru from './pages/admin/AdminDataGuru';
import AdminDataPengawas from './pages/admin/AdminDataPengawas';
import AdminTotalUjian from './pages/admin/AdminTotalUjian';
import AdminBeritaAcara from './pages/admin/AdminBeritaAcara';
import AdminGenericPage from './pages/admin/AdminGenericPage';

// Guru Pages
import GuruDashboard from './pages/guru/GuruDashboard';
import GuruProfil from './pages/guru/GuruProfil';
import GuruBankSoal from './pages/guru/GuruBankSoal';
import GuruPeserta from './pages/guru/GuruPeserta';
import GuruJadwalUjian from './pages/guru/GuruJadwalUjian';
import GuruMonitorUjian from './pages/guru/GuruMonitorUjian';
import GuruHasilUjian from './pages/guru/GuruHasilUjian';
import GuruDaftarNilai from './pages/guru/GuruDaftarNilai';
import GuruWaliSiswa from './pages/guru/GuruWaliSiswa';
import GuruWaliProgres from './pages/guru/GuruWaliProgres';
import GuruWaliRekap from './pages/guru/GuruWaliRekap';

// Pengawas Pages
import PengawasDashboard from './pages/pengawas/PengawasDashboard';

// Siswa Pages
import SiswaDashboard from './pages/siswa/SiswaDashboard';
import SiswaUjian from './pages/siswa/SiswaUjian';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, profile, loading, isHydrated } = useAuthStore();

  if (loading || !isHydrated) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-sky-600">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-sky-600 mb-4"></div>
      <h2 className="font-semibold text-lg">Memuat Sistem CBT...</h2>
    </div>
  );

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

// Komponen pembungkus untuk menangani loading dan redirect
const AuthGuard = ({ children }) => {
  const { user, isHydrated, loading } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    // Hanya lakukan redirect jika sudah ter-hidrasi, tidak sedang memuat, dan benar-benar tidak ada user
    if (isHydrated && !loading && !user) {
      navigate('/login', { replace: true });
    }
  }, [user, isHydrated, loading, navigate]);

  if (!isHydrated || loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-sky-600">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-sky-600 mb-4"></div>
        <h2 className="font-semibold text-lg">Memuat Sistem CBT...</h2>
      </div>
    );
  }

  return children;
};

const RootHandler = () => {
  const { user, profile, isHydrated, loading } = useAuthStore();

  if (!isHydrated || loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-sky-600">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-sky-600 mb-4"></div>
        <h2 className="font-semibold text-lg">Mengalihkan...</h2>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (profile?.role === 'admin') return <Navigate to="/admin" replace />;
  if (profile?.role === 'guru') return <Navigate to="/guru" replace />;
  if (profile?.role === 'pengawas') return <Navigate to="/pengawas" replace />;
  if (profile?.role === 'siswa') return <Navigate to="/siswa" replace />;
  
  return <Navigate to="/login" replace />;
};

export default function App() {
  const { setAuth, setLoading, isHydrated } = useAuthStore();

  useEffect(() => {
    if (!isHydrated) return; // Tunggu sampai data dari localStorage siap

    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      handleSession(session);
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      handleSession(session);
    });

    return () => subscription.unsubscribe();
  }, [isHydrated]); // Re-run ketika isHydrated berubah jadi true

  const handleSession = async (session) => {
    // Tunggu sampai store ter-hidrasi dari localStorage sebelum memutuskan untuk clear
    if (!useAuthStore.getState().isHydrated) return;

    if (session?.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
        
      setAuth(session, profile);
    } else {
      // Jika session Supabase null, cek apakah kita punya profile di local storage (custom login)
      const currentProfile = useAuthStore.getState().profile;
      if (currentProfile) {
        // Re-sync auth data agar 'user' object terisi kembali
        setAuth(null, currentProfile);
      } else {
        // Benar-benar tidak ada session & profile, baru clear
        setAuth(null, null);
      }
      setLoading(false);
    }
  };

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/unauthorized" element={<Unauthorized />} />
        
        {/* Redirect Root depending on Role */}
        <Route path="/" element={<RootHandler />} />

        {/* ----------------- ADMIN ----------------- */}
        <Route path="/admin" element={<AuthGuard><ProtectedRoute allowedRoles={['admin']}><DashboardLayout /></ProtectedRoute></AuthGuard>}>
          <Route index element={<AdminDashboard />} />
          
          {/* Manajemen User */}
          <Route path="user/administrator" element={<AdminDataAdministrator />} />
          <Route path="user/guru" element={<AdminDataGuru />} />
          <Route path="user/pengawas" element={<AdminDataPengawas />} />
          <Route path="total_ujian" element={<AdminTotalUjian />} />
          
          {/* Rute Khusus Dashboard */}
          <Route path="master/:tab" element={<AdminMasterData />} />
          <Route path="master" element={<Navigate to="/admin/master/mapel" replace />} />
          <Route path="peserta" element={<AdminPeserta />} />
          <Route path="soal" element={<AdminBankSoal />} />
          <Route path="soal/input/:id" element={<AdminInputSoal />} />
          <Route path="status" element={<AdminStatusPeserta />} />
          
          <Route path="ujian/jadwal" element={<AdminJadwalUjian />} />
          <Route path="ujian/reset" element={<AdminResetUjian />} />
          <Route path="ujian/:slug" element={<AdminGenericPage />} />
          
          <Route path="nilai/hasil" element={<AdminHasilNilai />} />
          <Route path="nilai/semua" element={<AdminSemuaNilai />} />
          <Route path="nilai/:slug" element={<AdminGenericPage />} />
          
          <Route path="cetak/hadir" element={<AdminDaftarHadir />} />
          <Route path="cetak/kartu" element={<AdminCetakKartu />} />
          <Route path="cetak/berita" element={<AdminBeritaAcara />} />
          <Route path="cetak/:slug" element={<AdminGenericPage />} />
          
          {/* Fallback di akhir block Admin */}
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Route>

        {/* ----------------- GURU ----------------- */}
        <Route path="/guru" element={<AuthGuard><ProtectedRoute allowedRoles={['guru']}><DashboardLayout /></ProtectedRoute></AuthGuard>}>
          <Route index element={<GuruDashboard />} />
          <Route path="profil" element={<GuruProfil />} />
          <Route path="soal" element={<GuruBankSoal />} />
          <Route path="soal/input/:id" element={<AdminInputSoal />} />
          <Route path="peserta" element={<GuruPeserta />} />
          <Route path="jadwal" element={<GuruJadwalUjian />} />
          <Route path="jadwal/monitor/:id" element={<GuruMonitorUjian />} />
          <Route path="jadwal/hasil/:id" element={<GuruHasilUjian />} />
          <Route path="nilai" element={<GuruDaftarNilai />} />
          <Route path="wali/siswa" element={<GuruWaliSiswa />} />
          <Route path="wali/progres" element={<GuruWaliProgres />} />
          <Route path="wali/rekap" element={<GuruWaliRekap />} />
        </Route>
        
        {/* ----------------- PENGAWAS ----------------- */}
        <Route path="/pengawas" element={<AuthGuard><ProtectedRoute allowedRoles={['pengawas']}><DashboardLayout /></ProtectedRoute></AuthGuard>}>
          <Route index element={<PengawasDashboard />} />
        </Route>

        {/* ----------------- SISWA ----------------- */}
        <Route path="/siswa" element={<AuthGuard><ProtectedRoute allowedRoles={['siswa']}><SiswaLayout /></ProtectedRoute></AuthGuard>}>
          <Route index element={<SiswaDashboard />} />
        </Route>
        
        {/* Ujian Layout usually doesn't have sidebar */}
        <Route path="/siswa/ujian/:jadwalId" element={<ProtectedRoute allowedRoles={['siswa']}><SiswaUjian /></ProtectedRoute>} />

        {/* Catch-all mencegah layar putih saat URL salah */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster position="top-center" richColors />
      <ConfirmModal />
    </Router>
  );
}
