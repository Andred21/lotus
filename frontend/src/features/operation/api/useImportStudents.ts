import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@shared/api/axios'
import type { ProblemDetails } from '@shared/api/axios'
import { postMultipart } from '@shared/api/postMultipart'
import { problemFromBlob } from '@shared/api/problemFromBlob'
import type {
  ImportConfirmRowData,
  ImportPreviewData,
  ImportResultData,
} from '@shared/types/generated'
import { turmaKeys } from './useTurmas'
import { enrollmentKeys } from './useEnrollments'

/** Prévia da planilha (xlsx/csv): classifica as linhas sem gravar nada. */
export function usePreviewImport() {
  return useMutation<ImportPreviewData, ProblemDetails, { turmaId: number; file: File }>({
    mutationFn: ({ turmaId, file }) =>
      postMultipart<ImportPreviewData>(`/api/turmas/${turmaId}/alunos/importar/previa`, { file }),
  })
}

/** Confirmação em JSON, linha a linha: o servidor relê só os campos permitidos
 * e revalida tudo (D13). Invalida as mesmas keys da matrícula avulsa. */
export function useConfirmImport() {
  const qc = useQueryClient()
  return useMutation<ImportResultData, ProblemDetails, { turmaId: number; rows: ImportConfirmRowData[] }>({
    mutationFn: ({ turmaId, rows }) =>
      api.post<ImportResultData>(`/api/turmas/${turmaId}/alunos/importar`, { rows }).then((r) => r.data),
    onSuccess: (_data, { turmaId }) => {
      qc.invalidateQueries({ queryKey: enrollmentKeys.list(turmaId) })
      qc.invalidateQueries({ queryKey: turmaKeys.all })
    },
  })
}

/** Modelo .xlsx gerado pelo backend (D14), baixado como blob autenticado. */
export function useDownloadImportTemplate() {
  return useMutation<Blob, ProblemDetails, number>({
    mutationFn: (turmaId) =>
      api
        .get<Blob>(`/api/turmas/${turmaId}/alunos/importar/plantilla`, { responseType: 'blob' })
        .then((r) => r.data)
        .catch(async (error: unknown) => {
          throw await problemFromBlob(error)
        }),
  })
}
