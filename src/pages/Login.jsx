import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/useAuthStore';
import { User, Lock, Eye, EyeOff, LogIn, ShieldCheck, GraduationCap } from 'lucide-react';
import { clsx } from 'clsx';

export default function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState('siswa'); // 'siswa', 'admin', atau 'pengawas'

  const { user, profile, setAuth } = useAuthStore();

  useEffect(() => {
    if (user && profile) {
      if (profile.role === 'admin') navigate('/admin');
      else if (profile.role === 'guru') navigate('/guru');
      else if (profile.role === 'pengawas') navigate('/pengawas');
      else if (profile.role === 'siswa') navigate('/siswa');
      else navigate('/');
    }
  }, [user, profile, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (mode === 'siswa') {
        // --- LOGIC LOGIN SISWA (ROBUST MODE) ---
        const cleanUsername = username.trim();
        const cleanPassword = password.trim();

        const { data: peserta, error: pesertaError } = await supabase
          .from('peserta_ujian')
          .select('*, profiles(*)')
          .eq('nomor_peserta', cleanUsername)
          .eq('password_plain', cleanPassword)
          .maybeSingle();

        console.log('Debug Login Siswa:', { 
          input: { cleanUsername, cleanPassword }, 
          found: peserta, 
          error: pesertaError 
        });

        if (pesertaError || !peserta) {
          throw new Error('Nomor Peserta atau Password salah');
        }

        if (!peserta.profiles) {
          throw new Error('Data profil siswa tidak ditemukan. Silakan hubungi admin.');
        }

        setAuth(null, peserta.profiles);
      } else {
        // --- LOGIC LOGIN ADMIN / GURU / PENGAWAS ---
        const cleanUsername = username.trim();
        const cleanPassword = password.trim();

        if (mode === 'admin') {
          // ADMIN / GURU
          if (cleanUsername.includes('@')) {
            // Bisa jadi Admin login pakai email (Supabase Auth)
            const { data, error: authError } = await supabase.auth.signInWithPassword({
              email: cleanUsername,
              password: cleanPassword,
            });

            if (!authError && data.session) {
              let { data: profileData } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', data.user.id)
                .single();

              if (profileData) {
                setAuth(data.session, profileData);
                return;
              }
            }
          }
          
          // Jika Supabase Auth gagal atau bukan email, kita cek di profiles secara manual
          // karena AdminDataAdministrator sekarang menyimpan admin baru di table profiles (dengan email di kolom username)
          const { data: profileData, error: profError } = await supabase
            .from('profiles')
            .select('*')
            .or(`username.eq.${cleanUsername}`)
            .eq('password_plain', cleanPassword)
            .in('role', ['admin', 'guru'])
            .maybeSingle();

          if (profError || !profileData) {
            throw new Error('Email/Username atau Password salah');
          }

          setAuth(null, profileData);
        } else if (mode === 'pengawas') {
          // PENGAWAS
          const { data: profileData, error: profError } = await supabase
            .from('profiles')
            .select('*')
            .eq('username', cleanUsername)
            .eq('password_plain', cleanPassword)
            .eq('role', 'pengawas')
            .maybeSingle();

          if (profError || !profileData) {
            throw new Error('Username atau Password salah');
          }

          setAuth(null, profileData);
        }
      }
    } catch (err) {
      console.error('Login Error:', err);
      const msg = err.message === 'Invalid login credentials' 
        ? 'Email atau Password salah' 
        : err.message;
      setError(msg);
      setLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 relative"
      style={{
        backgroundColor: '#253b8f', // Warna dasar biru dark
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M19 19h-6v2h6v6h2v-6h6v-2h-6v-6h-2v6z' fill='rgba(255,255,255,0.06)'/%3E%3C/svg%3E")`
      }}
    >
      <div className="w-full max-w-md shadow-2xl rounded-2xl overflow-hidden flex flex-col">
        {/* Bagian Atas - Biru */}
        <div className="bg-gradient-to-b from-indigo-500 to-indigo-600 px-8 py-10 flex flex-col items-center">
          <div className="mb-4">
            {/* Logo dipanggil dari public/logo.png */}
            <img src="/logo.png" alt="Logo SMPN 112 Jakarta" className="w-[100px] h-[100px] object-contain drop-shadow-md" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-wide">CBT Online</h1>
          <h2 className="text-sm font-medium text-indigo-100 mt-1">SMP Negeri 112 Jakarta</h2>
          <p className="text-xs italic text-indigo-200 mt-2">"BerPIJAR"</p>
        </div>

        {/* Bagian Bawah - Form */}
        <div className="bg-[#f8fafc] px-6 sm:px-8 py-8">
          
          {/* Tab Pemilihan Mode Login */}
          <div className="flex rounded-xl bg-slate-200/60 p-1 mb-6 gap-1">
            <button
              onClick={() => { setMode('siswa'); setUsername(''); setPassword(''); setError(''); }}
              className={clsx(
                "flex-1 flex items-center justify-center gap-2 py-2 text-[13px] font-semibold rounded-lg transition-all",
                mode === 'siswa' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
              )}
            >
              <GraduationCap className="w-4 h-4" /> Siswa
            </button>
            <button
              onClick={() => { setMode('admin'); setUsername(''); setPassword(''); setError(''); }}
              className={clsx(
                "flex-1 flex items-center justify-center gap-2 py-2 text-[13px] font-semibold rounded-lg transition-all",
                mode === 'admin' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
              )}
            >
              <ShieldCheck className="w-4 h-4" /> Admin/Guru
            </button>
            <button
              onClick={() => { setMode('pengawas'); setUsername(''); setPassword(''); setError(''); }}
              className={clsx(
                "flex-1 flex items-center justify-center gap-2 py-2 text-[13px] font-semibold rounded-lg transition-all",
                mode === 'pengawas' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
              )}
            >
              <User className="w-4 h-4" /> Pengawas
            </button>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {error && (
              <div className="text-red-600 text-sm font-medium bg-red-50 p-3 rounded-lg text-center border border-red-100">
                {error}
              </div>
            )}
            
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 ml-1">
                {mode === 'siswa' ? 'Nomor Peserta' : mode === 'admin' ? 'Email / Username' : 'Username'}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  {mode === 'siswa' ? <User className="h-5 w-5 text-slate-400" /> : <ShieldCheck className="h-5 w-5 text-slate-400" />}
                </div>
                <input
                  type="text"
                  required
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors bg-white text-slate-800"
                  placeholder={
                    mode === 'siswa' ? "Contoh: 2026160426" : 
                    mode === 'admin' ? "Masukkan email atau username" : 
                    "Masukkan username pengawas"
                  }
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 ml-1">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  className="block w-full pl-10 pr-10 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors bg-white text-slate-800"
                  placeholder="Masukkan password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-indigo-600"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center gap-2 py-2.5 px-4 mt-2 border border-transparent text-sm font-semibold rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
            >
              {loading ? 'Memproses...' : (
                <>
                  <LogIn className="w-4 h-4" />
                  Masuk
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center flex flex-col space-y-1">
            <span className="text-[11px] text-slate-500">© 2024 CBT SMP Negeri 112 Jakarta</span>
            <span className="text-[11px] text-slate-400">Sistem Ujian Berbasis Komputer</span>
          </div>
        </div>
      </div>
    </div>
  );
}