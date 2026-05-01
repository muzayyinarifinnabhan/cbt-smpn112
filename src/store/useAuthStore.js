import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export const useAuthStore = create((set) => ({
  user: null, // Basic auth info
  profile: null, // Full profile info from `profiles` table
  session: null,
  loading: true,
  
  // Set Auth Data
  setAuth: (session, profile) => set({ 
    session, 
    user: session?.user || (profile ? { id: profile.id } : null), 
    profile, 
    loading: false 
  }),
  setLoading: (loading) => set({ loading }),
  
  // Custom Logout
  signOut: async () => {
    set({ loading: true });
    await supabase.auth.signOut();
    set({ session: null, user: null, profile: null, loading: false });
  }
}));
