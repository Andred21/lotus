import { useMutation } from '@tanstack/react-query'
import { api } from '@shared/api/axios'
import type { ProblemDetails } from '@shared/api/axios'

/** Reenvia o convite de primeiro acesso. Existe para os redatores cadastrados
 *  antes deste bloco, que nasceram sem credencial utilizável. */
export function useRedatorInvitation() {
  return useMutation<void, ProblemDetails, number>({
    mutationFn: async (redatorId) => {
      await api.post(`/api/redatores/${redatorId}/invitation`)
    },
  })
}
