import { useBlobTabOpener } from '@shared/hooks'
import { useCertificatePdf } from '@shared/api/certificatesApi'

/**
 * Abre o PDF do certificado numa aba nova.
 *
 * O mecanismo (blob autenticado, aba aberta ANTES da requisição, objectURL
 * revogado no unmount) mora em `shared/hooks/useBlobTabOpener`. Este hook é só
 * a composição com a mutation do certificado, e mantém a assinatura antiga —
 * `open()` sem argumento, com o id capturado — para os chamadores não mudarem.
 *
 * Antes daqui havia um clone de `useTurmaManualOpener` copiado inteiro, com o
 * docblock declarando que era clone. `useTurmaManualOpener` NÃO foi migrado
 * neste bloco: a metade dele que baixa o DOCX divide o mesmo controle de
 * objectURL com a que abre o PDF, e desmontar isso é mudança própria, com
 * risco próprio.
 */
export function useCertificatePdfOpener(certificateId: number) {
  const opener = useBlobTabOpener(useCertificatePdf())

  return {
    open: () => opener.open(certificateId),
    pending: opener.pending,
    popupBlocked: opener.popupBlocked,
    message: opener.message,
  }
}
