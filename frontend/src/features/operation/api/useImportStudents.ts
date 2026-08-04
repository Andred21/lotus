import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { ProblemDetails } from '@shared/api/axios'
import { postMultipart } from '@shared/api/postMultipart'
import type { ImportResultData } from '@shared/types/generated'
import { turmaKeys } from './useTurmas'
import { enrollmentKeys } from './useEnrollments'

/** Upload de planilha (xlsx/csv). */
export function useImportStudents() {
  const qc = useQueryClient()
  return useMutation<ImportResultData, ProblemDetails, { turmaId: number; file: File }>({
    mutationFn: ({ turmaId, file }) =>
      postMultipart<ImportResultData>(`/api/turmas/${turmaId}/alunos/importar`, { file }),
    onSuccess: (_data, { turmaId }) => {
      qc.invalidateQueries({ queryKey: enrollmentKeys.list(turmaId) })
      qc.invalidateQueries({ queryKey: turmaKeys.all })
    },
  })
}
