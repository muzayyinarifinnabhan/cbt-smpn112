const fs = require('fs');
const path = require('path');

const files = {
  'src/pages/Login.jsx': `import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { GraduationCap } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    // Asumsi saat ini pengguna masuk menggunakan email bawaan supabase atau modifikasi custom,
    // di environment prod kita perlu buat edge function atau mekanisme proxy login untuk username.
    // Tapi untuk mock sementara:
    const { data, error } = await supabase.auth.signInWithPassword({
      email: username + '@cbt.smpn112jkt.sch.id', // trik bila pakai email di db Supabase
      password: password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    
    // Redirect akan ditangani oleh App.jsx watcher di useEffect
    navigate('/');
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl shadow-xl">
        <div className="flex flex-col items-center">
          <div className="bg-sky-100 p-3 rounded-full">
            <GraduationCap className="h-12 w-12 text-sky-600" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            CBT SMPN 112 Jakarta
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Silakan masuk dengan akun Anda
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          {error && <div className="text-red-500 text-sm font-medium bg-red-50 p-3 rounded-lg text-center">{error}</div>}
          <div className="rounded-md shadow-sm space-y-4">
            <div>
              <label htmlFor="username" className="sr-only">Username / No Peserta</label>
              <input
                id="username"
                name="username"
                type="text"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-sky-500 focus:border-sky-500 focus:z-10 sm:text-sm"
                placeholder="Username atau Nomor Peserta"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-sky-500 focus:border-sky-500 focus:z-10 sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? 'Memproses...' : 'Masuk'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}`,
  'src/pages/Unauthorized.jsx': `export default function Unauthorized({ role }) {
  return (
    <div className="flex items-center justify-center min-h-screen text-gray-800">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-red-500 mb-4">403</h1>
        <p className="text-lg mb-4">Akses Ditolak.</p>
        <a href="/" className="text-sky-600 hover:underline">Kembali ke Beranda</a>
      </div>
    </div>
  );
}`,
  'src/layouts/DashboardLayout.jsx': `import { Outlet, Navigate, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { useUIStore } from '../store/useUIStore';
import { LogOut, Menu, X, BookOpen, Users, Settings, Home, Activity } from 'lucide-react';
import { clsx } from 'clsx';
import { useEffect } from 'react';

export default function DashboardLayout() {
  const { user, profile, signOut } = useAuthStore();
  const { sidebarOpen, setSidebarOpen, toggleSidebar } = useUIStore();
  const navigate = useNavigate();

  // Root redirect behavior based on role layout usage
  useEffect(() => {
    if (window.location.pathname === '/') {
       if (profile?.role === 'admin') navigate('/admin');
       else if (profile?.role === 'guru') navigate('/guru');
       else if (profile?.role === 'pengawas') navigate('/pengawas');
       else if (profile?.role === 'siswa') navigate('/siswa');
    }
  }, [profile, navigate]);

  if (!user || !profile) return <Navigate to="/login" replace />;

  const getNavigation = (role) => {
    const baseNav = [{ name: 'Dashboard', href: \`/\${role}\`, icon: Home }];
    
    if (role === 'admin') {
      return [
        ...baseNav,
        { name: 'Data Master', href: '/admin/master', icon: Settings },
        { name: 'Bank Soal', href: '/admin/soal', icon: BookOpen },
        { name: 'Peserta Ujian', href: '/admin/peserta', icon: Users },
        { name: 'Status Realtime', href: '/admin/status', icon: Activity },
      ];
    }
    // Siswa, Guru, Pengawas can be added similarly
    return baseNav;
  };

  const navItems = getNavigation(profile.role);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar untuk Desktop */}
      <aside className={clsx(
        "fixed inset-y-0 z-50 flex flex-col w-64 bg-white border-r transition-transform duration-300 ease-in-out md:translate-x-0 md:static",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center justify-center h-16 border-b px-4">
          <h1 className="text-xl font-bold text-sky-700">CBT 112</h1>
          <button className="ml-auto md:hidden" onClick={toggleSidebar}>
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navItems.map((item) => {
            const isActive = window.location.pathname === item.href;
            return (
              <a key={item.name} href={item.href} className={clsx("flex items-center gap-3 px-3 py-2 rounded-lg transition-colors", isActive ? "bg-sky-50 text-sky-700 font-semibold" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900")}> 
                <item.icon className="w-5 h-5" />
                {item.name}
              </a>
            );
          })}
        </div>
        <div className="border-t p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-sky-100 flex items-center justify-center text-sky-700 font-bold uppercase">
              {profile.nama_lengkap.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{profile.nama_lengkap}</p>
              <p className="text-xs text-gray-500 capitalize">{profile.role}</p>
            </div>
          </div>
          <button onClick={() => signOut()} className="flex w-full items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">
            <LogOut className="w-4 h-4" /> Keluar
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b h-16 flex items-center px-4 md:px-6">
          <button className="md:hidden mr-4 aspect-square p-2 bg-gray-100 hover:bg-gray-200 rounded-lg focus:outline-none" onClick={toggleSidebar}>
            <Menu className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex-1 flex items-center">
            {/* Contextual Header Content */}
          </div>
        </header>
        
        <main className="flex-1 p-4 md:p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>
      
      {/* Overlay untuk mobile sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/20 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}
    </div>
  );
}`,
  'src/pages/admin/AdminDashboard.jsx': `export default function AdminDashboard() {
  return <div><h1 className="text-2xl font-bold text-gray-800">Admin Dashboard</h1></div>;
}`,
  'src/pages/admin/AdminMasterData.jsx': `export default function AdminMasterData() {
  return <div><h1 className="text-2xl font-bold text-gray-800">Master Data</h1></div>;
}`,
  'src/pages/guru/GuruDashboard.jsx': `export default function GuruDashboard() {
  return <div><h1 className="text-2xl font-bold text-gray-800">Guru Dashboard</h1></div>;
}`,
  'src/pages/pengawas/PengawasDashboard.jsx': `export default function PengawasDashboard() {
  return <div><h1 className="text-2xl font-bold text-gray-800">Pengawas Dashboard</h1></div>;
}`,
  'src/pages/siswa/SiswaDashboard.jsx': `export default function SiswaDashboard() {
  return <div><h1 className="text-2xl font-bold text-gray-800">Siswa Dashboard</h1></div>;
}`,
  'src/pages/siswa/SiswaUjian.jsx': `export default function SiswaUjian() {
  return <div><h1 className="text-2xl font-bold text-gray-800">Area Ujian (Strict Mode)</h1></div>;
}`
};

for (const [filePath, content] of Object.entries(files)) {
  const fullPath = path.resolve(process.cwd(), filePath);
  const dir = path.dirname(fullPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(fullPath, content, 'utf-8');
}
console.log('Scaffolding complete!');
