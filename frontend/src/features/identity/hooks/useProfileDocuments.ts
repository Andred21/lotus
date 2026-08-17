import { useState } from 'react'
import { useMutationErrors } from '@shared/hooks'
import type { ProblemDetails } from '@shared/api/axios'
import type { FileUploadHandlerEvent } from '@shared/ui'
import type { RedatorDocumentType } from '@shared/types/generated'
import { useUploadProfileDocument } from '../api/useProfile'

/**
 * Envio da própria documentação profissional.
 *
 * Não existe remoção self-service: o backend oferece substituição (D2 do bloco
 * 1), e a rota de `destroy` não existe neste caminho.
 *
 * `valid_until` não é enviado daqui porque a tela não o oferece, e NÃO porque a
 * regra o proíba: a D5 do bloco 1 aceita o campo nos três tipos self-service,
 * nenhum dos quais entra no gate da RN-09 — o que a regra barra é o REUF, e
 * quem o barra é o tipo, não a validade.
 *
 * Os quatro slots compartilham UMA instância de mutation, e por isso o estado
 * em voo é local, não lido dela. O observer do TanStack acompanha só a chamada
 * mais recente (`mutationObserver.mutate` faz `removeObserver` na anterior):
 * `isPending`/`variables`/`error` passam a descrever o segundo upload no
 * instante em que ele começa, e os callbacks por chamada do PRIMEIRO nunca
 * disparam. Com dois envios simultâneos isso reabilitava o slot ainda em voo,
 * movia o `disabled` para o slot errado e — o que pesa — engolia a FALHA do
 * primeiro, em documento de peso legal. `mutateAsync` devolve a promise
 * daquela chamada, que resolve mesmo sem observer; a invalidação do cache
 * continua na mutation e vale para as duas.
 */
export function useProfileDocuments(onSent?: () => void) {
  const upload = useUploadProfileDocument()
  const [sizeError, setSizeError] = useState<string | null>(null)
  const [emVoo, setEmVoo] = useState<RedatorDocumentType[]>([])
  const [erro, setErro] = useState<ProblemDetails | null>(null)

  const { message } = useMutationErrors([erro])

  function enviar(type: RedatorDocumentType, e: FileUploadHandlerEvent) {
    setSizeError(null)
    const file = e.files[0]
    if (file) {
      setErro(null)
      setEmVoo((atual) => [...atual, type])
      void upload
        .mutateAsync({ type, file })
        .then(() => onSent?.())
        .catch((motivo: ProblemDetails) => setErro(motivo))
        .finally(() => setEmVoo((atual) => atual.filter((emAndamento) => emAndamento !== type)))
    }
    e.options.clear()
  }

  return {
    upload: enviar,
    /** Os slots EM VOO, não "algum slot em voo": desabilitar os quatro por causa
     * de um trava a tela inteira num upload de 10 MB. Lista, e não um tipo só,
     * porque os envios podem se sobrepor. */
    uploadingTypes: emVoo,
    error: sizeError ?? message,
    setSizeError: (m: string) => setSizeError(m),
  }
}
