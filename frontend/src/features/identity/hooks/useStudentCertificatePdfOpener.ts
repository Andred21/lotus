import { useBlobTabOpener } from '@shared/hooks'
import { useCertificatePdf } from '@shared/api/certificatesApi'

/**
 * Abre o PDF do certificado da linha, numa aba nova.
 *
 * A mutation e o mecanismo vêm de `shared/` porque `identity` não pode
 * importar `certification` — nem para tipo (ADR-05). A composição fica num
 * hook, e não no componente, porque componente de feature não chama
 * query/mutation direto (rule `frontend-fsliced.md`).
 *
 * Um hook por LINHA: cada célula tem o próprio `pending` e o próprio aviso de
 * popup bloqueado, que é o que a interface precisa dizer — o certificado que
 * falhou é o daquela linha, não o da tabela.
 */
export function useStudentCertificatePdfOpener() {
  return useBlobTabOpener(useCertificatePdf())
}
