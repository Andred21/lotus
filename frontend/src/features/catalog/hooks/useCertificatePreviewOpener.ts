import { useBlobTabOpener } from '@shared/hooks'
import { useCertificatePreview } from '../api/useCertificatePreview'

/**
 * Abre a amostra do certificado do curso da linha, numa aba nova.
 *
 * A composição fica num hook, e não no componente, porque componente de
 * feature não chama query/mutation direto (rule `frontend-fsliced.md`). Um hook
 * por LINHA: o `pending` e o aviso de popup bloqueado são do curso que o
 * usuário clicou.
 */
export function useCertificatePreviewOpener() {
  return useBlobTabOpener(useCertificatePreview())
}
