import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ConfirmDialog, AppDropdown, FormField } from '@shared/ui'
import type { CertificateData, EmissionPanelEnrollmentData, EmissionPanelTurmaData } from '@shared/types/generated'
import { useMutationErrors } from '@shared/hooks'
import { useIssueCertificate } from '../../api/certificatesApi'
import { RedatorFirmaWarning } from './EmissionWarnings'

type Props = {
  enrollment: EmissionPanelEnrollmentData
  turma: EmissionPanelTurmaData
  onHide: () => void
  onIssued: (certificate: CertificateData) => void
}

/** Confirmação de emissão individual. Reusado pelo Reemitir (Task 8) — por
 * isso a interface fica só nos 3 dados de domínio (`enrollment`/`turma`/
 * `onIssued`); quem monta decide como abre e fecha. Sem linha Código: o
 * código nasce dentro da transação do POST (D9), não existe antes dele.
 * Confirmação compacta `confirm` (bloco 43). */
export function ConfirmIssueDialog({ enrollment, turma, onHide, onIssued }: Props) {
  const { t } = useTranslation()
  const issue = useIssueCertificate()
  const { fieldErrors, message } = useMutationErrors([issue.error])
  const [redatorId, setRedatorId] = useState<number | null>(
    turma.redatores.length === 1 ? turma.redatores[0].redator_id : null,
  )

  // Bloco 39: o certificado novo nasce sem prazo (`valido_ate` nulo), sempre.
  const vigencia = t('certificate.vigenciaIndefinida')

  const submit = () => {
    if (redatorId == null || issue.isPending) return
    issue.mutate(
      { enrollmentId: enrollment.enrollment_id, redatorId },
      { onSuccess: onIssued },
    )
  }

  return (
    <ConfirmDialog
      visible
      title={t('certificate.confirmTitle')}
      message={t('certificate.confirmBody')}
      confirmLabel={t('certificate.confirmEmit')}
      confirmDisabled={redatorId == null}
      pending={issue.isPending}
      error={message}
      onConfirm={submit}
      onCancel={onHide}
    >
      <div className="mt-4 space-y-4">
        {/* Campos de confirmação: nascem só-leitura, então não há controle a
            montar — `readOnly` sem filho. Input desabilitado cortava o nome
            longo e derrubava o contraste (spec BD-3 §4). */}
        <FormField label={t('certificate.fieldAlumno')} readOnly value={enrollment.student_name} />
        <FormField label={t('certificate.fieldRut')} readOnly value={enrollment.student_rut} />
        <FormField label={t('certificate.fieldCurso')} readOnly value={turma.course_name} />
        <FormField label={t('certificate.fieldVigencia')} readOnly value={vigencia} />

        <FormField label={t('certificate.fieldRedator')} error={fieldErrors?.redator_id?.[0]}>
          <AppDropdown
            value={redatorId}
            options={turma.redatores.map((r) => ({ label: r.name, value: r.redator_id }))}
            optionLabel="label"
            optionValue="value"
            placeholder={t('certificate.fieldRedator')}
            onChange={(e) => setRedatorId(e.value)}
          />
        </FormField>
        <RedatorFirmaWarning turma={turma} redatorId={redatorId} />
      </div>
    </ConfirmDialog>
  )
}
