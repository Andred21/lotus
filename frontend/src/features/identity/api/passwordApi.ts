import { useMutation } from '@tanstack/react-query'
import { api } from '@shared/api/axios'
import type { ProblemDetails } from '@shared/api/axios'
import { initCsrf } from '@shared/api/csrf'

export type PasswordFlow = 'invite' | 'reset'

interface SetPasswordVars {
  token: string
  email: string
  password: string
  password_confirmation: string
}

/** Convite e recuperação são endpoints distintos de propósito: cada fluxo tem
 *  seu broker e seu TTL no backend (7 dias × 60 minutos). */
const ROTA: Record<PasswordFlow, string> = {
  invite: '/api/invitation/accept',
  reset: '/api/password/reset',
}

export function useSetPasswordMutation(flow: PasswordFlow) {
  return useMutation<void, ProblemDetails, SetPasswordVars>({
    mutationFn: async (vars) => {
      await initCsrf()
      await api.post(ROTA[flow], vars)
    },
  })
}

export function useForgotPasswordMutation() {
  return useMutation<void, ProblemDetails, { email: string }>({
    mutationFn: async (vars) => {
      await initCsrf()
      await api.post('/api/password/forgot', vars)
    },
  })
}
