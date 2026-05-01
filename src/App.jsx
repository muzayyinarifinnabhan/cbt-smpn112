import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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

// Pengawas Pages
import PengawasDashboard from './pages/pengawas/PengawasDashboard';

// Siswa Pages
import SiswaDashboard from './pages/siswa/SiswaDashboard';
import SiswaUjian from './pages/siswa/SiswaUjian';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, profile, loading } = useAuthStore();

  if (loading) return (
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

const RootHandler = () => {
  const { user, profile, loading } = useAuthStore();

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-sky-600">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-sky-600 mb-4"></div>
      <h2 className="font-semibold text-lg">Mengalihkan...</h2>
    </div>
  );

  if (!user) return <Navigate to="/login" replace />;
  if (profile?.role === 'admin') return <Navigate to="/admin" replace />;
  if (profile?.role === 'guru') return <Navigate to="/guru" replace />;
  if (profile?.role === 'pengawas') return <Navigate to="/pengawas" replace />;
  if (profile?.role === 'siswa') return <Navigate to="/siswa" replace />;
  
  return <Navigate to="/login" replace />;
};

export default function App() {
  const { setAuth, setLoading } = useAuthStore();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      handleSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSession = async (session) => {
    if (session?.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
        
      setAuth(session, profile);
    } else {
      // Jangan clear jika sedang login custom_db (karena tidak pakai Supabase Auth Session)
      const currentProfile = useAuthStore.getState().profile;
      if (!currentProfile) {
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
        <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout /></ProtectedRoute>}>
          <Route index element={<AdminDashboard />} />
          
          {/* Manajemen User */}
          <Route path="user/administrator" element={<AdminGenericPage />} />
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
        <Route path="/guru" element={<ProtectedRoute allowedRoles={['guru']}><DashboardLayout /></ProtectedRoute>}>
          <Route index element={<GuruDashboard />} />
          <Route path="profil" element={<GuruProfil />} />
          <Route path="soal" element={<GuruBankSoal />} />
          <Route path="soal/input/:id" element={<AdminInputSoal />} />
          <Route path="peserta" element={<GuruPeserta />} />
          <Route path="jadwal" element={<GuruJadwalUjian />} />
          <Route path="jadwal/monitor/:id" element={<GuruMonitorUjian />} />
          <Route path="jadwal/hasil/:id" element={<GuruHasilUjian />} />
        </Route>
        
        {/* ----------------- PENGAWAS ----------------- */}
        <Route path="/pengawas" element={<ProtectedRoute allowedRoles={['pengawas']}><DashboardLayout /></ProtectedRoute>}>
          <Route index element={<PengawasDashboard />} />
        </Route>

        {/* ----------------- SISWA ----------------- */}
        <Route path="/siswa" element={<ProtectedRoute allowedRoles={['siswa']}><SiswaLayout /></ProtectedRoute>}>
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
