import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@shared/api/axios'
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

/** Documento sobe como multipart: NÃO fixar Content-Type (o axios deriva o
 * boundary do FormData; fixar json faz o File virar {} e o 201 sair vazio).
 * Invalida também `turmaKeys.all`: `habilitada` é derivada no backend e muda
 * quando o 3º tipo é entregue. */
export function useUploadTurmaDocument() {
  const qc = useQueryClient()
  return useMutation<
    TurmaDocumentData,
    ProblemDetails,
    { turmaId: number; type: TurmaDocumentType; file: File }
  >({
    mutationFn: ({ turmaId, type, file }) => {
      const body = new FormData()
      body.append('type', type)
      body.append('file', file)
      return api
        .post<TurmaDocumentData>(`/api/turmas/${turmaId}/documents`, body)
        .then((r) => r.data)
    },
    onSuccess: (_data, { turmaId }) => {
      qc.invalidateQueries({ queryKey: documentKeys.list(turmaId) })
      qc.invalidateQueries({ queryKey: turmaKeys.all })
    },
  })
}
