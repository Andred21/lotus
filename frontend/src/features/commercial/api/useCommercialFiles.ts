import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@shared/api/axios'
import type { ProblemDetails } from '@shared/api/axios'
import type { FileData } from '@shared/types/generated'
import { budgetsApi } from '@shared/api/budgetsApi'

/** Tipos aceitos pelo backend: orçamento = fatura/comprovante; cotação = documento. */
export type BudgetFileType = 'invoice' | 'receipt'

function useInvalidate() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: budgetsApi.keys.all })
}

/** O FormData NÃO leva Content-Type explícito: o axios deriva multipart+boundary
 * do payload. Fixar `application/json` fazia o transformRequest serializar o
 * FormData e o arquivo chegava VAZIO, com 201 silencioso (bug 3 da Sprint 1). */
export function useUploadBudgetFile() {
  const invalidate = useInvalidate()
  return useMutation<FileData, ProblemDetails, { budgetId: number; type: BudgetFileType; file: File }>({
    mutationFn: ({ budgetId, type, file }) => {
      const fd = new FormData()
      fd.append('type', type)
      fd.append('file', file)
      return api.post<FileData>(`/api/budgets/${budgetId}/files`, fd).then((r) => r.data)
    },
    onSuccess: invalidate,
  })
}

export function useRemoveBudgetFile() {
  const invalidate = useInvalidate()
  return useMutation<void, ProblemDetails, { budgetId: number; fileId: number }>({
    mutationFn: ({ budgetId, fileId }) =>
      api.delete(`/api/budgets/${budgetId}/files/${fileId}`).then(() => undefined),
    onSuccess: invalidate,
  })
}

export function useUploadQuoteFile() {
  const invalidate = useInvalidate()
  return useMutation<FileData, ProblemDetails, { quoteId: number; file: File }>({
    mutationFn: ({ quoteId, file }) => {
      const fd = new FormData()
      fd.append('type', 'quote_document')
      fd.append('file', file)
      return api.post<FileData>(`/api/quotes/${quoteId}/files`, fd).then((r) => r.data)
    },
    onSuccess: invalidate,
  })
}

export function useRemoveQuoteFile() {
  const invalidate = useInvalidate()
  return useMutation<void, ProblemDetails, { quoteId: number; fileId: number }>({
    mutationFn: ({ quoteId, fileId }) =>
      api.delete(`/api/quotes/${quoteId}/files/${fileId}`).then(() => undefined),
    onSuccess: invalidate,
  })
}
