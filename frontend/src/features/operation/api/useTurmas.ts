import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@shared/api/axios'
import type { ProblemDetails } from '@shared/api/axios'
import { pageEndpoint } from '@shared/api/page'
import { problemFromBlob } from '@shared/api/problemFromBlob'
import type { ArchivedTurmaData, PendingQuoteData, TurmaData, TurmaModalidade } from '@shared/types/generated'

export const turmaKeys = {
  all: ['turmas'] as const,
  list: () => ['turmas', 'list'] as const,
  archived: () => ['turmas', 'archived'] as const,
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

/** A página do hub e a dos arquivados (spec D1). As chaves de query são
 * montadas pelo `useServerTable` sobre `turmaKeys.list()`/`archived()`, que
 * começam em `['turmas']` — o `useInvalidate()` abaixo continua cobrindo as
 * duas. A arquivada devolve o DTO composto; quem achata é `useTurmasPage`. */
export const turmasPage = pageEndpoint<TurmaData>('/api/turmas')
export const turmasArchivedPage = pageEndpoint<ArchivedTurmaData>('/api/turmas/archived')

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

/** Conclusão é terminal (RN-15): invalida lista, detalhe e pendentes via
 * `turmaKeys.all` para nenhuma tela seguir mostrando a turma como em curso. */
export function useConcludeTurma() {
  const invalidate = useInvalidate()
  return useMutation<TurmaData, ProblemDetails, number>({
    mutationFn: (turmaId) =>
      api.post<TurmaData>(`/api/turmas/${turmaId}/conclude`).then((r) => r.data),
    onSuccess: invalidate,
  })
}

export function useTurmaManual() {
  return useMutation<Blob, ProblemDetails, number>({
    mutationFn: (turmaId) =>
      api
        .get<Blob>(`/api/turmas/${turmaId}/manual`, { responseType: 'blob' })
        .then((r) => r.data)
        .catch(async (error: unknown) => {
          throw await problemFromBlob(error)
        }),
  })
}

export function useTurmaManualDocx() {
  return useMutation<Blob, ProblemDetails, number>({
    mutationFn: (turmaId) =>
      api
        .get<Blob>(`/api/turmas/${turmaId}/manual/docx`, { responseType: 'blob' })
        .then((r) => r.data)
        .catch(async (error: unknown) => {
          throw await problemFromBlob(error)
        }),
  })
}

/** O arquivar da turma, que não existia no frontend até aqui (P7). O backend
 * recusa turma concluída com 422 (RN-15) — o toast do hook de página é o que
 * torna essa recusa visível. */
export function useArchiveTurma() {
  const invalidate = useInvalidate()
  return useMutation<void, ProblemDetails, number>({
    mutationFn: (turmaId) => api.delete(`/api/turmas/${turmaId}`).then(() => undefined),
    onSuccess: invalidate,
  })
}

export function useRestoreTurma() {
  const invalidate = useInvalidate()
  return useMutation<TurmaData, ProblemDetails, number>({
    mutationFn: (turmaId) => api.post<TurmaData>(`/api/turmas/${turmaId}/restore`).then((r) => r.data),
    onSuccess: invalidate,
  })
}
