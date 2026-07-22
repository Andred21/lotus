import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@shared/api/axios'
import type { ProblemDetails } from '@shared/api/axios'
import type { ImportResultData } from '@shared/types/generated'
import { turmaKeys } from './useTurmas'
import { enrollmentKeys } from './useEnrollments'

/** Upload de planilha (xlsx/csv). NÃO fixa Content-Type: o axios deriva
 * multipart+boundary do FormData (fixar json faria o File virar {} — upload vazio,
 * 201 silencioso, peso legal — rule frontend-fsliced/axios). */
export function useImportStudents() {
  const qc = useQueryClient()
  return useMutation<ImportResultData, ProblemDetails, { turmaId: number; file: File }>({
    mutationFn: ({ turmaId, file }) => {
      const body = new FormData()
      body.append('file', file)
      return api
        .post<ImportResultData>(`/api/turmas/${turmaId}/alunos/importar`, body)
        .then((r) => r.data)
    },
    onSuccess: (_data, { turmaId }) => {
      qc.invalidateQueries({ queryKey: enrollmentKeys.list(turmaId) })
      qc.invalidateQueries({ queryKey: turmaKeys.all })
    },
  })
}
