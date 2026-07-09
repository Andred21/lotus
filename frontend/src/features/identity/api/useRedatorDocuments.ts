import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@shared/api/axios'
import type { ProblemDetails } from '@shared/api/axios'
import type { RedatorDocumentData } from '@shared/types/generated'
import { redatoresApi } from './redatoresApi'

function useInvalidate() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: redatoresApi.keys.all })
}

export function useUploadDocument() {
  const invalidate = useInvalidate()
  return useMutation<RedatorDocumentData, ProblemDetails, { redatorId: number; type: string; file: File; valid_until?: string | null }>({
    mutationFn: ({ redatorId, type, file, valid_until }) => {
      const fd = new FormData()
      fd.append('type', type)
      fd.append('file', file)
      if (valid_until) fd.append('valid_until', valid_until)
      return api.post<RedatorDocumentData>(`/redatores/${redatorId}/documents`, fd).then((r) => r.data)
    },
    onSuccess: invalidate,
  })
}

export function useRemoveDocument() {
  const invalidate = useInvalidate()
  return useMutation<void, ProblemDetails, { redatorId: number; fileId: number }>({
    mutationFn: ({ redatorId, fileId }) =>
      api.delete(`/redatores/${redatorId}/documents/${fileId}`).then(() => undefined),
    onSuccess: invalidate,
  })
}
