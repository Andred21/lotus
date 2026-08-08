import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AppDialog, AppButton, AppDropdown, AppInputText, FormField, FormErrorBanner } from '@shared/ui'
import type { CertificateData, EmissionPanelEnrollmentData, EmissionPanelTurmaData } from '@shared/types/generated'
import { useMutationErrors } from '@shared/hooks'
import { useIssueCertificate } from '../../api/certificatesApi'

type Props = {
  enrollment: EmissionPanelEnrollmentData
  turma: EmissionPanelTurmaData
  onHide: () => void
  onIssued: (certificate: CertificateData) => void
}

/** Confirmação de emissão individual. Reusado pelo Reemitir (Task 8) — por
 * isso a interface fica só nos 3 dados de domínio (`enrollment`/`turma`/
 * `onIssued`); quem monta decide como abre e fecha. Sem linha Código: o
 * código nasce dentro da transação do POST (D9), não existe antes dele. */
export function ConfirmIssueDialog({ enrollment, turma, onHide, onIssued }: Props) {
  const { t } = useTranslation()
  const issue = useIssueCertificate()
  const { fieldErrors, message } = useMutationErrors([issue.error])
  const [redatorId, setRedatorId] = useState<number | null>(
    turma.redatores.length === 1 ? turma.redatores[0].redator_id : null,
  )

  const vigencia =
    turma.template_validity_months == null
      ? t('certificate.vigenciaIndefinida')
      : t('certificate.vigenciaMeses', { count: turma.template_validity_months })

  const submit = () => {
    if (redatorId == null || issue.isPending) return
    issue.mutate(
      { enrollmentId: enrollment.enrollment_id, redatorId },
      { onSuccess: onIssued },
    )
  }

  const footer = (
    <div className="flex justify-end gap-2">
      <AppButton label={t('common.cancel')} outlined disabled={issue.isPending} onClick={onHide} />
      <AppButton
        label={t('certificate.confirmEmit')}
        icon="pi pi-check"
        disabled={redatorId == null}
        loading={issue.isPending}
        onClick={submit}
      />
    </div>
  )

  return (
    <AppDialog visible header={t('certificate.confirmTitle')} onHide={onHide} footer={footer} closable={!issue.isPending}>
      <div className="space-y-4">
        <FormErrorBanner message={message} />
        <p className="text-sm" style={{ color: 'var(--text-color-secondary)' }}>{t('certificate.confirmBody')}</p>

        <FormField label={t('certificate.fieldAlumno')}>
          <AppInputText value={enrollment.student_name} disabled readOnly />
        </FormField>
        <FormField label={t('certificate.fieldRut')}>
          <AppInputText value={enrollment.student_rut} disabled readOnly />
        </FormField>
        <FormField label={t('certificate.fieldCurso')}>
          <AppInputText value={turma.course_name} disabled readOnly />
        </FormField>
        <FormField label={t('certificate.fieldVigencia')}>
          <AppInputText value={vigencia} disabled readOnly />
        </FormField>

        <FormField label={t('certificate.fieldRelator')} error={fieldErrors?.redator_id?.[0]}>
          <AppDropdown
            value={redatorId}
            options={turma.redatores.map((r) => ({ label: r.name, value: r.redator_id }))}
            optionLabel="label"
            optionValue="value"
            placeholder={t('certificate.fieldRelator')}
            onChange={(e) => setRedatorId(e.value)}
          />
        </FormField>
      </div>
    </AppDialog>
  )
}
