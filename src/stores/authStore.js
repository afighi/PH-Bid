import { create } from 'zustand';

export const useAuthStore = create((set) => ({
  user:    null,    // Firebase Auth user object
  profile: null,    // Supabase profiles row
  loading: true,

  setAuth:    (user, profile) => set({ user, profile, loading: false }),
  clearAuth:  ()              => set({ user: null, profile: null, loading: false }),
  setLoading: (loading)       => set({ loading }),
  updateProfile: (updates)    => set((s) => ({ profile: { ...s.profile, ...updates } })),
}));
