import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@shared/api/axios'
import type { ProblemDetails } from '@shared/api/axios'
import type { FileData } from '@shared/types/generated'
import { budgetsApi } from '@shared/api/budgetsApi'
import { postMultipart } from '@shared/api/postMultipart'

/** Tipos aceitos pelo backend: orçamento = fatura/comprovante; cotação = documento. */
export type BudgetFileType = 'invoice' | 'receipt'

function useInvalidate() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: budgetsApi.keys.all })
}

export function useUploadBudgetFile() {
  const invalidate = useInvalidate()
  return useMutation<FileData, ProblemDetails, { budgetId: number; type: BudgetFileType; file: File }>({
    mutationFn: ({ budgetId, type, file }) =>
      postMultipart<FileData>(`/api/budgets/${budgetId}/files`, { type, file }),
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
    mutationFn: ({ quoteId, file }) =>
      postMultipart<FileData>(`/api/quotes/${quoteId}/files`, { type: 'quote_document', file }),
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
