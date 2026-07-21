import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@shared/api/axios'
import type { ProblemDetails } from '@shared/api/axios'
import type { PendingQuoteData, TurmaData, TurmaModalidade } from '@shared/types/generated'

export const turmaKeys = {
  all: ['turmas'] as const,
  list: () => ['turmas', 'list'] as const,
  detail: (id: number) => ['turmas', 'detail', id] as const,
  pending: () => ['turmas', 'pending'] as const,
}

/** Campos que a UI escreve na configuração da turma. `course_id`/`quote_id` NÃO
 * entram: o servidor deriva da cotação. `local_aplicacao` é exigido só no presencial. */
export type TurmaConfigPayload = {
  modalidade: TurmaModalidade
  local_aplicacao: string | null
  start_date: string
  end_date: string
}

export function useTurmas() {
  return useQuery<TurmaData[], ProblemDetails>({
    queryKey: turmaKeys.list(),
    queryFn: () => api.get<TurmaData[]>('/api/turmas').then((r) => r.data),
  })
}

export function useTurma(id: number) {
  return useQuery<TurmaData, ProblemDetails>({
    queryKey: turmaKeys.detail(id),
    queryFn: () => api.get<TurmaData>(`/api/turmas/${id}`).then((r) => r.data),
    enabled: Number.isFinite(id),
  })
}

export function usePendingQuotes() {
  return useQuery<PendingQuoteData[], ProblemDetails>({
    queryKey: turmaKeys.pending(),
    queryFn: () => api.get<PendingQuoteData[]>('/api/turmas/pendientes-configuracion').then((r) => r.data),
  })
}

/** Toda mutação de turma repinta a lista, o detalhe e a fila de pendentes
 * (invalidar `all` cobre as três keys, que começam por `['turmas']`). */
function useInvalidate() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: turmaKeys.all })
}

export function useCreateTurma() {
  const invalidate = useInvalidate()
  return useMutation<TurmaData, ProblemDetails, { quoteId: number; payload: TurmaConfigPayload }>({
    mutationFn: ({ quoteId, payload }) =>
      api.post<TurmaData>(`/api/quotes/${quoteId}/turma`, payload).then((r) => r.data),
    onSuccess: invalidate,
  })
}

export function useUpdateTurma() {
  const invalidate = useInvalidate()
  return useMutation<TurmaData, ProblemDetails, { turmaId: number; payload: TurmaConfigPayload }>({
    mutationFn: ({ turmaId, payload }) =>
      api.put<TurmaData>(`/api/turmas/${turmaId}`, payload).then((r) => r.data),
    onSuccess: invalidate,
  })
}

export function useDesignateRedator() {
  const invalidate = useInvalidate()
  return useMutation<TurmaData, ProblemDetails, { turmaId: number; redatorId: number }>({
    mutationFn: ({ turmaId, redatorId }) =>
      api.post<TurmaData>(`/api/turmas/${turmaId}/redatores/${redatorId}`).then((r) => r.data),
    onSuccess: invalidate,
  })
}

export function useRemoveRedator() {
  const invalidate = useInvalidate()
  return useMutation<TurmaData, ProblemDetails, { turmaId: number; redatorId: number }>({
    mutationFn: ({ turmaId, redatorId }) =>
      api.delete<TurmaData>(`/api/turmas/${turmaId}/redatores/${redatorId}`).then((r) => r.data),
    onSuccess: invalidate,
  })
}
