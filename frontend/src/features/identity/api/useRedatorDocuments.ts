import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@shared/api/axios'
import type { ProblemDetails } from '@shared/api/axios'
import type { RedatorDocumentData } from '@shared/types/generated'
import { redatoresApi } from '@shared/api/redatoresApi'
import { postMultipart } from '@shared/api/postMultipart'

function useInvalidate() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: redatoresApi.keys.all })
}

export function useUploadDocument() {
  const invalidate = useInvalidate()
  return useMutation<RedatorDocumentData, ProblemDetails, { redatorId: number; type: string; file: File; valid_until?: string | null }>({
    // `valid_until` nulo/vazio vira undefined: o helper omite a chave, que é o
    // que o `if (valid_until)` daqui fazia antes.
    mutationFn: ({ redatorId, type, file, valid_until }) =>
      postMultipart<RedatorDocumentData>(`/api/redatores/${redatorId}/documents`, {
        type,
        file,
        valid_until: valid_until || undefined,
      }),
    onSuccess: invalidate,
  })
}

export function useRemoveDocument() {
  const invalidate = useInvalidate()
  return useMutation<void, ProblemDetails, { redatorId: number; fileId: number }>({
    mutationFn: ({ redatorId, fileId }) =>
      api.delete(`/api/redatores/${redatorId}/documents/${fileId}`).then(() => undefined),
    onSuccess: invalidate,
  })
}
