import { useState } from 'react'
import type { ImportResultData } from '@shared/types/generated'
import type { FileUploadHandlerEvent } from '@shared/ui'
import { useMutationErrors } from '@shared/hooks'
import { useImportStudents } from '../api/useImportStudents'

/**
 * Fluxo do diálogo de importação de planilha. Molde: `useEnrollStudentFlow`, o
 * vizinho da mesma pasta — `result`, `sizeError` e a mutation mudam juntos e
 * precisam ser resetados juntos, senão reabrir o diálogo mostra o resumo (ou o
 * erro) de uma importação anterior.
 *
 * `close` é inerte enquanto a mutation está em voo: o diálogo trava ESC/X para
 * o 422/403 ter onde pousar (mesma disciplina dos ConfirmDialog da feature).
 */
export function useImportStudentsFlow(turmaId: number, onHide: () => void) {
  const importMutation = useImportStudents()
  const { message } = useMutationErrors([importMutation.error])
  const [result, setResult] = useState<ImportResultData | null>(null)
  const [sizeError, setSizeError] = useState<string | null>(null)

  const upload = (e: FileUploadHandlerEvent) => {
    setSizeError(null)
    const file = e.files[0]
    if (!file) return
    importMutation.mutate({ turmaId, file }, { onSuccess: (r) => setResult(r) })
  }

  const close = () => {
    if (importMutation.isPending) return
    setResult(null)
    setSizeError(null)
    importMutation.reset()
    onHide()
  }

  return {
    result,
    sizeError,
    setSizeError,
    upload,
    close,
    pending: importMutation.isPending,
    message,
  }
}
