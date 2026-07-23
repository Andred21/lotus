import { useQuery } from '@tanstack/react-query'
import { api } from '@shared/api/axios'
import type { ProblemDetails } from '@shared/api/axios'
import type { TurmaDocumentData } from '@shared/types/generated'

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
