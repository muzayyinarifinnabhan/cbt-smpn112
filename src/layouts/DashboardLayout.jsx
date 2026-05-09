import { Outlet, Navigate, useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { useUIStore } from '../store/useUIStore';
import { 
  LogOut, Menu, X, LayoutDashboard, Database, BookOpen, UserCheck, Settings, BookCopy, ShieldCheck, GraduationCap,
  ChevronDown, ChevronRight, FileText, FileSpreadsheet, Users, Hash, Layers, Monitor, Clock, Printer, ChevronLeft,
  History as HistoryIcon, User, ClipboardList, Calendar, Award, TrendingUp
} from 'lucide-react';
import { clsx } from 'clsx';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

export default function DashboardLayout() {
  const { user, profile, signOut } = useAuthStore();
  const { sidebarOpen, setSidebarOpen, toggleSidebar } = useUIStore();
  
  // State for Desktop Sidebar Collapse
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  // State untuk submenu expand/collapse
  const [expandedMenu, setExpandedMenu] = useState('Data Master'); 

  // Root redirect behavior
  useEffect(() => {
    if (window.location.pathname === '/') {
       if (profile?.role === 'admin') navigate('/admin');
       else if (profile?.role === 'guru') navigate('/guru');
       else if (profile?.role === 'pengawas') navigate('/pengawas');
       else if (profile?.role === 'siswa') navigate('/siswa');
    }
  }, [profile, navigate, location.pathname]);

  // Global Real-time Listener for Blocked Students (Admin Only)
  useEffect(() => {
    if (profile?.role !== 'admin') return;

    const channel = supabase
      .channel('admin_notifications')
      .on('postgres_changes', { 
        event: 'UPDATE', 
        table: 'ujian_aktif', 
        schema: 'public' 
      }, async (payload) => {
        // Jika status berubah jadi blocked
        if (payload.new.is_blocked && !payload.old.is_blocked) {
          // Ambil nama siswa
          const { data: student } = await supabase
            .from('profiles')
            .select('nama_lengkap')
            .eq('id', payload.new.siswa_id)
            .single();

          toast.error(`Siswa Terdeteksi Melanggar!`, {
            description: `${student?.nama_lengkap || 'Seorang siswa'} baru saja terblokir (Pelanggaran ke-${payload.new.peringatan_nyontek})`,
            duration: 10000,
            action: {
              label: 'Reset Sekarang',
              onClick: () => navigate('/admin/ujian/reset')
            }
          });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile, navigate]);

  if (!user || !profile) return <Navigate to="/login" replace />;

  const getNavigation = (role) => {
    if (role === 'admin') {
      return [
        { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
        { 
          name: 'Data Master', 
          icon: Database, 
          subItems: [
            { name: 'Mata Pelajaran', href: '/admin/master/mapel', icon: BookOpen },
            { name: 'Jenis Ujian', href: '/admin/master/jenis_ujian', icon: FileText },
            { name: 'Kelas', href: '/admin/master/kelas', icon: Users },
            { name: 'Ruangan', href: '/admin/master/ruangan', icon: Hash },
            { name: 'Level', href: '/admin/master/level', icon: Layers },
            { name: 'Sesi', href: '/admin/master/sesi', icon: Clock },
            { name: 'Server', href: '/admin/master/server', icon: Monitor },
          ]
        },
        { name: 'Peserta Ujian', href: '/admin/peserta', icon: UserCheck },
        { name: 'Bank Soal', href: '/admin/soal', icon: BookCopy },
        { name: 'Status Peserta', href: '/admin/status', icon: ActivityIcon },
        { 
          name: 'Menu Ujian', 
          icon: Settings,
          subItems: [
            { name: 'Jadwal Ujian', href: '/admin/ujian/jadwal', icon: FileSpreadsheet },
            { name: 'Reset Ujian', href: '/admin/ujian/reset', icon: Clock },
          ]
        },
        { 
          name: 'Nilai', 
          icon: BookOpen,
          subItems: [
            { name: 'Hasil Nilai', href: '/admin/nilai/hasil', icon: FileText },
            { name: 'Semua Nilai', href: '/admin/nilai/semua', icon: Database },
          ]
        },
        { 
          name: 'Cetak', 
          icon: Printer,
          subItems: [
            { name: 'Daftar Hadir', href: '/admin/cetak/hadir', icon: FileText },
            { name: 'Cetak Kartu', href: '/admin/cetak/kartu', icon: FileText },
            { name: 'Berita Acara', href: '/admin/cetak/berita', icon: FileText },
          ]
        },
        { 
          name: 'Manajemen User', 
          icon: Users,
          subItems: [
            { name: 'Data Administrator', href: '/admin/user/administrator', icon: ShieldCheck },
            { name: 'Data Guru', href: '/admin/user/guru', icon: GraduationCap },
            { name: 'Data Pengawas', href: '/admin/user/pengawas', icon: UserCheck },
            { name: 'Total Ujian', href: '/admin/total_ujian', icon: HistoryIcon },
          ]
        },
      ];
    }
    if (role === 'guru') {
      return [
        { name: 'Profil Saya', href: '/guru/profil', icon: User },
        { name: 'Bank Soal', href: '/guru/soal', icon: ClipboardList },
        { name: 'Peserta Ujian', href: '/guru/peserta', icon: Users },
        { name: 'Jadwal Ujian', href: '/guru/jadwal', icon: Calendar },
        { name: 'Reset Ujian', href: '/guru/ujian/reset', icon: Clock },
        { name: 'Hasil Nilai', href: '/guru/nilai', icon: Award },
        { 
          name: 'Walikelas', 
          icon: GraduationCap,
          subItems: [
            { name: 'Siswa Ujian', href: '/guru/wali/siswa', icon: Users },
            { name: 'Progres Ujian', href: '/guru/wali/progres', icon: TrendingUp },
            { name: 'Rekap Ujian', href: '/guru/wali/rekap', icon: FileText },
          ]
        },
      ];
    }
    return [{ name: 'Dashboard', href: `/${role}`, icon: LayoutDashboard }];
  };

  const navItems = getNavigation(profile.role);

  return (
    <div className="min-h-screen bg-[#f8fafc] flex overflow-hidden">
      {/* Sidebar untuk Desktop */}
      <aside className={clsx(
        "fixed inset-y-0 left-0 z-50 flex flex-col bg-[#1e293b] text-slate-300 transition-all duration-300 ease-in-out md:static",
        sidebarOpen ? "translate-x-0 w-[260px]" : "-translate-x-full md:translate-x-0",
        desktopCollapsed ? "md:w-[72px]" : "md:w-[260px]"
      )}>
        {/* Sidebar Header */}
        <div className="flex items-center justify-between h-[72px] px-4 bg-[#172033] border-b border-slate-700/50">
          <div className={clsx("flex items-center gap-3 overflow-hidden transition-all", desktopCollapsed ? "w-0 opacity-0 md:opacity-100 md:w-auto" : "w-auto")}>
            <img src="/logo.png" alt="Logo" className="w-8 h-8 rounded drop-shadow-md shrink-0" />
            {!desktopCollapsed && (
              <div className="flex flex-col whitespace-nowrap">
                <h1 className="text-[15px] font-bold text-white tracking-wide">
                  {profile?.role === 'guru' ? 'Portal Guru' : 
                   profile?.role === 'pengawas' ? 'Portal Pengawas' : 'CBT Admin'}
                </h1>
                <span className="text-[11px] text-slate-400">
                  {profile?.role === 'admin' ? 'SMP Negeri 112' : profile?.nama_lengkap}
                </span>
              </div>
            )}
          </div>
          
          {/* Mobile Close Button */}
          <button className="md:hidden p-1" onClick={toggleSidebar}>
            <X className="w-6 h-6 text-slate-400" />
          </button>
        </div>

        {/* Sidebar Menu */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden py-5 px-3 space-y-1 custom-scrollbar">
          {navItems.map((item) => {
            const hasSub = item.subItems && item.subItems.length > 0;
            const isMenuExpanded = expandedMenu === item.name && !desktopCollapsed;
            const isRootActive = location.pathname === item.href;
            
            return (
              <div key={item.name} className="mb-1 relative group">
                {hasSub ? (
                  <button 
                    onClick={() => {
                      if (desktopCollapsed) setDesktopCollapsed(false); // Buka sidebar kalau diklik pas collapse
                      setExpandedMenu(isMenuExpanded ? null : item.name);
                    }}
                    title={desktopCollapsed ? item.name : undefined}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-[13px] font-medium text-slate-300 hover:bg-slate-800 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className="w-[18px] h-[18px] shrink-0" />
                      {!desktopCollapsed && <span className="whitespace-nowrap">{item.name}</span>}
                    </div>
                    {!desktopCollapsed && (isMenuExpanded ? <ChevronDown className="w-4 h-4 shrink-0" /> : <ChevronRight className="w-4 h-4 shrink-0" />)}
                  </button>
                ) : (
                  <Link 
                    to={item.href} 
                    title={desktopCollapsed ? item.name : undefined}
                    className={clsx(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-colors", 
                      isRootActive ? "bg-blue-600 text-white shadow-md shadow-blue-900/20" : "hover:bg-slate-800 hover:text-white"
                    )}
                  > 
                    <item.icon className="w-[18px] h-[18px] shrink-0" />
                    {!desktopCollapsed && <span className="whitespace-nowrap">{item.name}</span>}
                  </Link>
                )}

                {/* Sub Menu Overlay */}
                {hasSub && isMenuExpanded && !desktopCollapsed && (
                  <div className="mt-1 ml-[11px] border-l border-slate-700/50 pl-2 space-y-1 py-1">
                    {item.subItems.map(sub => {
                      const isSubActive = location.pathname.includes(sub.href);
                      return (
                        <Link 
                          key={sub.name}
                          to={sub.href}
                          className={clsx(
                            "flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-colors whitespace-nowrap",
                            isSubActive 
                              ? "bg-blue-600 text-white font-semibold shadow-md" 
                              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                          )}
                        >
                          <sub.icon className="w-4 h-4 opacity-80 shrink-0" />
                          {sub.name}
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Sidebar Footer User Info */}
        <div className="border-t border-slate-700/50 p-4 bg-[#172033]">
          <button 
            onClick={() => signOut()} 
            title={desktopCollapsed ? "Keluar Aplikasi" : undefined}
            className="flex w-full items-center justify-center md:justify-start gap-3 px-3 py-2 text-[13px] font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
          >
            <LogOut className="w-[18px] h-[18px] shrink-0" /> 
            {!desktopCollapsed && <span className="whitespace-nowrap">Keluar Aplikasi</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#f8fafc] w-full relative">
        
        {/* Toggle Sidebar Button for Desktop (Floating inside Main Area to stick to left border) */}
        <button 
          onClick={() => setDesktopCollapsed(!desktopCollapsed)} 
          className="hidden md:flex absolute -left-4 top-[22px] z-50 items-center justify-center w-8 h-8 rounded-full bg-white border border-slate-200 shadow-md text-slate-500 hover:text-slate-800 transition-colors"
          title="Toggle Sidebar"
        >
          {desktopCollapsed ? <ChevronRight className="w-4 h-4 ml-0.5" /> : <ChevronLeft className="w-4 h-4 mr-0.5" />}
        </button>

        {/* Top Header Mobile Info */}
        <header className="bg-white border-b border-slate-200 h-16 flex items-center px-4 md:hidden shadow-sm">
          <button className="aspect-square p-2 hover:bg-slate-100 rounded-lg focus:outline-none transition-colors" onClick={toggleSidebar}>
            <Menu className="w-5 h-5 text-slate-600" />
          </button>
          <div className="ml-3 font-semibold text-slate-800">CBT Dashboard</div>
        </header>

        {/* Note: This allows padding for the desktop toggle icon so contents aren't overlapped. On mobile, we use normal padding. */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden md:pl-2">
          <Outlet />
        </main>
      </div>
      
      {/* Overlay untuk mobile sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}
    </div>
  );
}

function ActivityIcon(props) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  );
}