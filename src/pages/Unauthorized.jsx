import { useAuthStore } from '../store/useAuthStore';
import { Navigate } from 'react-router-dom';

export default function Unauthorized() {
  const { profile } = useAuthStore();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 text-gray-800">
      <div className="text-center p-8 bg-white rounded-2xl shadow-xl border border-gray-200">
        <h1 className="text-5xl font-extrabold text-red-500 mb-4">403</h1>
        <h2 className="text-2xl font-bold mb-2">Akses Ditolak</h2>
        <p className="text-gray-600 mb-6 font-medium">
          Role Anda saat ini adalah: <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full">{profile?.role || 'Tidak Diketahui'}</span>.<br/>
          Anda tidak memiliki izin untuk melihat halaman ini.
        </p>
        <button 
          onClick={() => window.location.href = '/'} 
          className="px-6 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition"
        >
          Kembali ke Dasbor Saya
        </button>
      </div>
    </div>
  );
}