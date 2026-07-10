import { create } from 'zustand'
import type { SessionUserData } from '@shared/types/generated'

// Fonte do tipo = DTO gerado do backend (ADR-04).
export type SessionUser = SessionUserData

export type SessionStatus = 'loading' | 'authenticated' | 'unauthenticated'

interface SessionState {
  user: SessionUser | null
  status: SessionStatus
  setUser: (user: SessionUser) => void
  clear: () => void
}

/**
 * Sessão do usuário autenticado. Vive em `shared` porque é infraestrutura
 * transversal (como o cliente axios), consumida por `app` (guard de rota, shell)
 * e por qualquer feature que precise do RBAC. Não é domínio.
 */
export const useSessionStore = create<SessionState>((set) => ({
  user: null,
  status: 'loading', // até o boot resolver via GET /api/me
  setUser: (user) => set({ user, status: 'authenticated' }),
  clear: () => set({ user: null, status: 'unauthenticated' }),
}))
