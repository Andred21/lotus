import { create } from 'zustand'
import type { SessionUser } from '../types'

export type SessionStatus = 'loading' | 'authenticated' | 'unauthenticated'

interface SessionState {
  user: SessionUser | null
  status: SessionStatus
  setUser: (user: SessionUser) => void
  clear: () => void
}

export const useSessionStore = create<SessionState>((set) => ({
  user: null,
  status: 'loading', // até o boot resolver via GET /api/me
  setUser: (user) => set({ user, status: 'authenticated' }),
  clear: () => set({ user: null, status: 'unauthenticated' }),
}))
