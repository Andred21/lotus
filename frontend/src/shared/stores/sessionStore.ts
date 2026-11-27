import { create } from 'zustand'
import type { SessionUserData } from '@shared/types/generated'

// Fonte do tipo = DTO gerado do backend (ADR-04).
export type SessionUser = SessionUserData

export type SessionStatus = 'loading' | 'authenticated' | 'unauthenticated'

interface SessionState {
  user: SessionUser | null
  status: SessionStatus
  /** A sessão caiu COM a aba aberta (401/419 numa rota autenticada). Existe para a
   * tela de login explicar por que o usuário voltou para lá e para a guarda de
   * rascunho não segurá-lo. Só o logout e o login a zeram. */
  expired: boolean
  setUser: (user: SessionUser) => void
  clear: () => void
  /** Idempotente: várias requisições recusadas ao mesmo tempo expiram UMA vez, e o
   * redirecionamento, o aviso e o `from` saem de uma única transição. */
  expire: () => void
}

/**
 * Sessão do usuário autenticado. Vive em `shared` porque é infraestrutura
 * transversal (como o cliente axios), consumida por `app` (guard de rota, shell)
 * e por qualquer feature que precise do RBAC. Não é domínio.
 */
export const useSessionStore = create<SessionState>((set) => ({
  user: null,
  status: 'loading', // até o boot resolver via GET /api/me
  expired: false,
  setUser: (user) => set({ user, status: 'authenticated', expired: false }),
  clear: () => set({ user: null, status: 'unauthenticated', expired: false }),
  expire: () =>
    set((s) => (s.status === 'authenticated' ? { user: null, status: 'unauthenticated', expired: true } : s)),
}))
