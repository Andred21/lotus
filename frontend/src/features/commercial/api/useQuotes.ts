import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@shared/api/axios'
import type { ProblemDetails } from '@shared/api/axios'
import type { QuoteData } from '@shared/types/generated'
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
