import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@shared/api/axios'
import { postMultipart } from '@shared/api/postMultipart'
import type { ProblemDetails } from '@shared/api/axios'
import type { TurmaDocumentData, TurmaDocumentType } from '@shared/types/generated'
import { turmaKeys } from './useTurmas'

export const documentKeys = {
  all: ['turma-documents'] as const,
  list: (turmaId: number) => ['turma-documents', 'list', turmaId] as const,
}

export function useTurmaDocuments(turmaId: number) {
  return useQuery<TurmaDocumentData[], ProblemDetails>({
    queryKey: documentKeys.list(turmaId),
    queryFn: () =>
      api.get<TurmaDocumentData[]>(`/api/turmas/${turmaId}/documents`).then((r) => r.data),
    enabled: Number.isFinite(turmaId),
  })
}

/** Invalida também `turmaKeys.all`: `habilitada` é derivada no backend e muda
 * quando o 3º tipo é entregue. */
export function useUploadTurmaDocument() {
  const qc = useQueryClient()
  return useMutation<
    TurmaDocumentData,
    ProblemDetails,
    { turmaId: number; type: TurmaDocumentType; file: File }
  >({
    mutationFn: ({ turmaId, type, file }) =>
      postMultipart<TurmaDocumentData>(`/api/turmas/${turmaId}/documents`, { type, file }),
    onSuccess: (_data, { turmaId }) => {
      qc.invalidateQueries({ queryKey: documentKeys.list(turmaId) })
      qc.invalidateQueries({ queryKey: turmaKeys.all })
    },
  })
}

/** Remoção de documento com peso legal (RN-16): a rota usa scopeBindings, então
 * arquivo de outra turma responde 404. Invalida a lista e a turma (a habilitação
 * pode cair de volta para "em curso"). */
export function useRemoveTurmaDocument() {
  const qc = useQueryClient()
  return useMutation<void, ProblemDetails, { turmaId: number; fileId: number }>({
    mutationFn: ({ turmaId, fileId }) =>
      api.delete(`/api/turmas/${turmaId}/documents/${fileId}`).then(() => undefined),
    onSuccess: (_data, { turmaId }) => {
      qc.invalidateQueries({ queryKey: documentKeys.list(turmaId) })
      qc.invalidateQueries({ queryKey: turmaKeys.all })
    },
  })
}
