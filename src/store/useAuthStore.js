import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { supabase } from '../lib/supabase';

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null, // Basic auth info
      profile: null, // Full profile info from `profiles` table
      session: null,
      loading: true,
      isHydrated: false,
      
      // Set Auth Data
      setAuth: (session, profile) => set({ 
        session, 
        user: session?.user || (profile ? { id: profile.id } : null), 
        profile, 
        loading: false 
      }),
      setLoading: (loading) => set({ loading }),
      setHydrated: () => set({ isHydrated: true }),
      
      // Custom Logout
      signOut: async () => {
        set({ loading: true });
        await supabase.auth.signOut();
        set({ session: null, user: null, profile: null, loading: false });
        localStorage.removeItem('auth-storage'); // Clear persistence
      }
    }),
    {
      name: 'auth-storage', // name of the item in the storage (must be unique)
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: (state) => {
        return (state, error) => {
          if (!error) state.setHydrated();
        }
      }
    }
  )
);
