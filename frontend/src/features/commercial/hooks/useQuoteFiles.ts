import { useState } from 'react'
import type { FileUploadHandlerEvent } from '@shared/ui'
import { useMutationErrors } from '@shared/hooks'
import { useUploadQuoteFile, useRemoveQuoteFile } from '../api/useCommercialFiles'

/** Documentos de cotação: um input de upload por linha da lista. Molde:
 * `useImportStudentsFlow` — `sizeError` e a mutation mudam juntos e são o mesmo
 * assunto ("este envio falhou"), então moram no mesmo hook.
 *
 * Rejeição por tamanho é local (não passa pela API): o AppFileUpload barra o
 * arquivo antes de qualquer request, então não vira erro de mutação. */
export function useQuoteFiles() {
  const uploadFile = useUploadQuoteFile()
  const removeFile = useRemoveQuoteFile()
  // `message`: o upload é um único input por linha, sem campo onde pendurar o
  // 422 de "file"/"type" — o hook já resolve o fallback.
  const { message: fileError } = useMutationErrors([uploadFile.error, removeFile.error])
  const [sizeError, setSizeError] = useState<string | null>(null)

  const upload = (quoteId: number, e: FileUploadHandlerEvent) => {
    // Zera a rejeição da tentativa anterior antes de tentar de novo — era o que
    // o `onClick` do componente fazia à mão.
    setSizeError(null)
    const file = e.files[0]
    if (!file) return
    uploadFile.mutate({ quoteId, file }, { onSuccess: () => e.options.clear() })
  }

  return {
    upload,
    remove: (quoteId: number, fileId: number) => removeFile.mutate({ quoteId, fileId }),
    /** Só a linha em voo desabilita o próprio botão — o `disabled` é por cotação,
     * nunca da lista inteira. */
    isUploading: (quoteId: number) =>
      uploadFile.isPending && uploadFile.variables?.quoteId === quoteId,
    fileError,
    sizeError,
    setSizeError,
  }
}
