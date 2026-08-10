import { useTranslation } from 'react-i18next'
import { AppInputText, FormField } from '@shared/ui'
import type { CertificateData } from '@shared/types/generated'

type Props = {
  certificate: CertificateData
}

/** Código + alumno do certificado — a identidade que os dois diálogos do
 * Historial mostram por cima do resto (`CertificateViewDialog` e
 * `RevokeDialog`), com o mesmo rótulo e a mesma fonte.
 *
 * Lê SEMPRE `snapshot`, nunca a linha viva da lista: aluno renomeado depois da
 * emissão divergiria do PDF legal (D12).
 *
 * Devolve `Fragment`, não `<div>`: os dois usos têm irmãos diretos dentro de
 * um `space-y-4`, e um nó a mais mudaria o espaçamento do pai.
 *
 * NÃO serve ao `ConfirmIssueDialog`, que mostra campos de aparência parecida
 * vindos de `enrollment`/`turma` — dado vivo, de antes da emissão, quando o
 * snapshot ainda não existe. Unificar os três pela aparência acoplaria a
 * confirmação a um congelado que ainda não nasceu. */
export function CertificateIdentityFields({ certificate }: Props) {
  const { t } = useTranslation()

  return (
    <>
      <FormField label={t('certificate.fieldCodigo')}>
        <AppInputText value={certificate.codigo} disabled readOnly />
      </FormField>
      <FormField label={t('certificate.fieldAlumno')}>
        <AppInputText value={certificate.snapshot.aluno.name} disabled readOnly />
      </FormField>
    </>
  )
}
