import { create } from 'zustand';

export const useConfirmStore = create((set, get) => ({
  isOpen: false,
  title: 'Konfirmasi',
  message: '',
  confirmText: 'Ya, Lanjutkan',
  cancelText: 'Batal',
  onConfirm: null,
  type: 'danger', // danger, warning, success, info

  showConfirm: ({ title, message, confirmText, cancelText, onConfirm, type = 'danger' }) => {
    set({
      isOpen: true,
      title: title || 'Konfirmasi',
      message: message || 'Apakah Anda yakin?',
      confirmText: confirmText || 'Ya, Lanjutkan',
      cancelText: cancelText || 'Batal',
      onConfirm: async () => {
        if (onConfirm) await onConfirm();
        get().closeConfirm();
      },
      type
    });
  },

  closeConfirm: () => {
    set({ isOpen: false, onConfirm: null });
  }
}));
