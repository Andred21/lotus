import { useState } from 'react'
import { useMutationErrors } from '@shared/hooks'
import type { FileUploadHandlerEvent } from '@shared/ui'
import type { RedatorDocumentType } from '@shared/types/generated'
import { useUploadProfileDocument } from '../api/useProfile'

/**
 * Envio da própria documentação profissional.
 *
 * Não existe remoção self-service: o backend oferece substituição (D2 do bloco
 * 1), e a rota de `destroy` não existe neste caminho. `valid_until` também não
 * é enviado daqui — quem o declara é o administrador, e deixar o redator
 * declarar a própria validade fura a RN-09 (D5 do bloco 1).
 */
export function useProfileDocuments(onSent?: () => void) {
  const upload = useUploadProfileDocument()
  const [sizeError, setSizeError] = useState<string | null>(null)

  const { message } = useMutationErrors([upload.error])

  function enviar(type: RedatorDocumentType, e: FileUploadHandlerEvent) {
    setSizeError(null)
    const file = e.files[0]
    if (file) upload.mutate({ type, file }, { onSuccess: onSent })
    e.options.clear()
  }

  return {
    upload: enviar,
    /** O slot EM VOO, não "algum slot em voo": desabilitar os quatro por causa
     * de um trava a tela inteira num upload de 10 MB. */
    uploadingType: upload.isPending ? (upload.variables?.type ?? null) : null,
    error: sizeError ?? message,
    setSizeError: (m: string) => setSizeError(m),
  }
}
