import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AuthResponse, User } from '@/lib/types'

type AuthView = 'login' | 'signup' | 'verify'

interface AuthState {
  user: User | null
  access: string | null
  refresh: string | null
  modal: { open: boolean; view: AuthView }
  setSession: (data: AuthResponse) => void
  setTokens: (access: string, refresh: string) => void
  setUser: (user: User) => void
  logout: () => void
  openAuth: (view?: AuthView) => void
  closeAuth: () => void
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      access: null,
      refresh: null,
      modal: { open: false, view: 'login' },
      setSession: ({ access, refresh, user }) => set({ access, refresh, user }),
      setTokens: (access, refresh) => set({ access, refresh }),
      setUser: (user) => set({ user }),
      logout: () => set({ user: null, access: null, refresh: null }),
      openAuth: (view = 'login') => set({ modal: { open: true, view } }),
      closeAuth: () => set((s) => ({ modal: { ...s.modal, open: false } })),
    }),
    {
      name: 'gt-auth',
      partialize: ({ user, access, refresh }) => ({ user, access, refresh }),
    },
  ),
)
