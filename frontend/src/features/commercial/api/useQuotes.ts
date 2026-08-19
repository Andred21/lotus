import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@shared/api/axios'
import type { ProblemDetails } from '@shared/api/axios'
import type { ArchivedQuoteData, QuoteData } from '@shared/types/generated'
import { budgetsApi } from '@shared/api/budgetsApi'

/** Campos que a UI escreve numa cotação. `client_id` NÃO entra: vem do orçamento
 * pai (o backend nem aceita). `value_uf` é string decimal — dinheiro não passa
 * por float. `status`/`seq_in_budget`/`code` são read-only do servidor. */
export type QuotePayload = {
  course_id: number
  student_count: number
  value_uf: string
  purchase_order: string | null
  planned_start_date: string | null
  planned_end_date: string | null
}

/** Toda mutação de cotação repinta o orçamento inteiro: status agregado e totais
 * são derivados das cotações no backend. */
function useInvalidate() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: budgetsApi.keys.all })
}

export function useCreateQuote() {
  const invalidate = useInvalidate()
  return useMutation<QuoteData, ProblemDetails, { budgetId: number; payload: QuotePayload }>({
    mutationFn: ({ budgetId, payload }) =>
      api.post<QuoteData>(`/api/budgets/${budgetId}/quotes`, payload).then((r) => r.data),
    onSuccess: invalidate,
  })
}

export function useUpdateQuote() {
  const invalidate = useInvalidate()
  return useMutation<QuoteData, ProblemDetails, { quoteId: number; payload: QuotePayload }>({
    mutationFn: ({ quoteId, payload }) =>
      api.put<QuoteData>(`/api/quotes/${quoteId}`, payload).then((r) => r.data),
    onSuccess: invalidate,
  })
}

export function useRemoveQuote() {
  const invalidate = useInvalidate()
  return useMutation<void, ProblemDetails, number>({
    mutationFn: (quoteId) => api.delete(`/api/quotes/${quoteId}`).then(() => undefined),
    onSuccess: invalidate,
  })
}

export function useApproveQuote() {
  const invalidate = useInvalidate()
  return useMutation<QuoteData, ProblemDetails, number>({
    mutationFn: (quoteId) => api.post<QuoteData>(`/api/quotes/${quoteId}/approve`).then((r) => r.data),
    onSuccess: invalidate,
  })
}

export function useRejectQuote() {
  const invalidate = useInvalidate()
  return useMutation<QuoteData, ProblemDetails, number>({
    mutationFn: (quoteId) => api.post<QuoteData>(`/api/quotes/${quoteId}/reject`).then((r) => r.data),
    onSuccess: invalidate,
  })
}

/**
 * Cotações arquivadas DE UM orçamento. Escopada pelo pai porque a cotação não
 * tem lista de topo — ela vive dentro do detalhe (spec D5).
 *
 * A chave começa em `budgetsApi.keys.detail(budgetId)`, que por sua vez começa em
 * `['budgets']` — o mesmo prefixo que `useInvalidate()` invalida. Efeito: arquivar
 * uma cotação repinta a lista de arquivados sem código novo, igual ao molde.
 *
 * `enabled` é PARÂMETRO, não default, pela mesma lição da fábrica: a visão de
 * arquivados não pode buscar na montagem.
 */
export function useQuotesArchived(budgetId: number, enabled: boolean) {
  return useQuery<ArchivedQuoteData[], ProblemDetails>({
    queryKey: [...budgetsApi.keys.detail(budgetId), 'quotes', 'archived'],
    queryFn: () =>
      api.get<ArchivedQuoteData[]>(`/api/budgets/${budgetId}/quotes/archived`).then((r) => r.data),
    enabled,
  })
}

/** O restore NÃO é escopado pelo pai: a rota é `POST /api/quotes/{quote}/restore`,
 * plana, porque a cotação já é identificada globalmente pelo id (spec D5). */
export function useRestoreQuote() {
  const invalidate = useInvalidate()
  return useMutation<QuoteData, ProblemDetails, number>({
    mutationFn: (quoteId) => api.post<QuoteData>(`/api/quotes/${quoteId}/restore`).then((r) => r.data),
    onSuccess: invalidate,
  })
}
