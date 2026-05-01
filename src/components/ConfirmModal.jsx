import React from 'react';
import { useConfirmStore } from '../store/useConfirmStore';
import { 
  AlertTriangle, Info, CheckCircle, 
  HelpCircle, X, ShieldAlert 
} from 'lucide-react';
import { clsx } from 'clsx';

export default function ConfirmModal() {
  const { 
    isOpen, title, message, confirmText, 
    cancelText, onConfirm, closeConfirm, type 
  } = useConfirmStore();

  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'danger': return <ShieldAlert className="w-8 h-8 text-red-600" />;
      case 'warning': return <AlertTriangle className="w-8 h-8 text-amber-600" />;
      case 'success': return <CheckCircle className="w-8 h-8 text-emerald-600" />;
      default: return <HelpCircle className="w-8 h-8 text-indigo-600" />;
    }
  };

  const getBgColor = () => {
    switch (type) {
      case 'danger': return 'bg-red-50';
      case 'warning': return 'bg-amber-50';
      case 'success': return 'bg-emerald-50';
      default: return 'bg-indigo-50';
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={closeConfirm}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl shadow-slate-900/20 overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-8 duration-300">
        
        {/* Header - Icon Area */}
        <div className={clsx("p-8 flex flex-col items-center gap-4 text-center", getBgColor())}>
           <div className="bg-white p-4 rounded-[2rem] shadow-sm">
             {getIcon()}
           </div>
           <div>
             <h3 className="text-xl font-black text-slate-800 tracking-tight leading-tight">{title}</h3>
           </div>
        </div>

        {/* Content */}
        <div className="px-8 py-6 text-center">
          <p className="text-slate-500 font-medium leading-relaxed">
            {message}
          </p>
        </div>

        {/* Footer - Actions */}
        <div className="p-8 pt-2 flex flex-col sm:flex-row gap-3">
          <button 
            onClick={closeConfirm}
            className="flex-1 px-6 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black rounded-2xl transition-all active:scale-95 text-sm uppercase tracking-wider"
          >
            {cancelText}
          </button>
          <button 
            onClick={onConfirm}
            className={clsx(
              "flex-1 px-6 py-4 text-white font-black rounded-2xl transition-all active:scale-95 text-sm shadow-lg uppercase tracking-wider",
              type === 'danger' ? 'bg-red-600 hover:bg-red-700 shadow-red-200' :
              type === 'warning' ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-200' :
              type === 'success' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200' :
              'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'
            )}
          >
            {confirmText}
          </button>
        </div>

        {/* Close Button X */}
        <button 
          onClick={closeConfirm}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
