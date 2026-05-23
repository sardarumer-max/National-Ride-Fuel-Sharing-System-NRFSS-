import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { supabase } from '../lib/supabase'

const STORE_KEY = 'nrfss-auth'

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      profile: null,
      session: null,
      // loading starts true; useAuth's onAuthStateChange resolves it
      loading: true,

      setSession: (session) => set({
        session,
        user: session?.user ?? null,
      }),
      setProfile: (profile) => set({ profile }),
      setLoading: (loading) => set({ loading }),

      signOut: async () => {
        console.log('[authStore] Signing out...')
        try {
          const { error } = await supabase.auth.signOut()
          if (error) console.warn('[authStore] signOut error:', error.message)
        } catch (e) {
          console.warn('[authStore] signOut exception:', e)
        }
        // Clear all auth state
        set({ user: null, profile: null, session: null, loading: false })
        // Purge persisted state from localStorage so stale profile doesn't survive
        try {
          localStorage.removeItem(STORE_KEY)
        } catch (_) { /* ignore if localStorage unavailable */ }
        console.log('[authStore] Sign out complete, state cleared')
      },

      isAdmin:    () => get().profile?.role === 'admin',
      isDriver:   () => ['driver', 'admin'].includes(get().profile?.role),
      isVerified: () => get().profile?.is_verified === true,
    }),
    {
      name: STORE_KEY,
      storage: createJSONStorage(() => localStorage),
      // Only persist the profile — session/user are re-established by Supabase on load
      partialize: (state) => ({ profile: state.profile }),
      // Always reset loading to true on rehydration; useAuth will resolve it
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.loading = true
          console.log('[authStore] Rehydrated from storage, loading=true')
        }
      },
    }
  )
)

export default useAuthStore
