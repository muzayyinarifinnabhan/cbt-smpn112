import { Plus, Search, Edit2, Trash2 } from 'lucide-react';
import { useLocation } from 'react-router-dom';

export default function AdminGenericPage() {
  const location = useLocation();
  const pathParts = location.pathname.split('/').filter(Boolean);
  
  // Ambil bagian terakhir untuk dijadikan judul
  const rawTitle = pathParts[pathParts.length - 1] || 'Dashboard';
  
  // Format judul agar huruf kapital dan hilangkan dash
  const title = rawTitle.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  return (
    <div className="min-h-full p-4 md:p-8 animate-in fade-in duration-300">
      
      {/* Top Page Header */}
      <div className="bg-white border border-slate-200 rounded-xl px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-800 capitalize">Manajemen {title.replace('_', ' ')}</h1>
          <p className="text-sm text-slate-500 font-medium">Halaman ini digunakan untuk mengelola data {title.replace('_', ' ').toLowerCase()}</p>
        </div>
        <button className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm">
          <Plus className="w-4 h-4" /> Tambah {title.replace('_', ' ')}
        </button>
      </div>

      {/* Content Box */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden min-h-[400px]">
        
        {/* Top Tools Bar */}
        <div className="p-4 border-b border-slate-100 flex items-center">
          <div className="relative w-full max-w-sm">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder={`Cari data ${title.toLowerCase()}...`} 
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-[13px] bg-slate-50 hover:bg-white transition-colors"
            />
          </div>
        </div>

        {/* Table Placeholder */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white border-b border-slate-100 text-slate-400 text-[13px] font-medium tracking-wide">
                <th className="px-6 py-4">No</th>
                <th className="px-6 py-4 w-full">Keterangan {title.replace('_', ' ')}</th>
                <th className="px-6 py-4 w-40 text-left">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td colSpan="3" className="px-6 py-16 text-center">
                  <div className="flex flex-col items-center justify-center text-slate-400">
                    <div className="h-12 w-12 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                      <Search className="w-6 h-6 text-slate-300" />
                    </div>
                    <span className="text-sm font-medium">Belum ada data {title.replace('_', ' ')} untuk ditampilkan.</span>
                    <span className="text-xs mt-1">Silakan klik tombol "Tambah" di pojok kanan atas.</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

      </div>

    </div>
  );
}
