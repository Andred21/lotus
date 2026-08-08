import { useTranslation } from 'react-i18next'
import { AppDialog, AppButton, AppDropdown, AppInputText, FormField, FormErrorBanner } from '@shared/ui'
import type { EnrollmentData } from '@shared/types/generated'
import { useRegisterResult } from '../../hooks/useRegisterResult'

type Props = {
  turmaId: number
  enrollment: EnrollmentData | null
  visible: boolean
  onHide: () => void
}

/** Registro do resultado acadêmico por matrícula (Task 10): nota, presença e
 * estado de aprovação. É o que fecha o loop com a Certificação — sem ele a
 * matrícula nunca aparece pendente no painel de emissão. */
export function RegisterResultDialog({ turmaId, enrollment, visible, onHide }: Props) {
  const { t } = useTranslation()
  const r = useRegisterResult(turmaId, enrollment, visible)

  const close = () => {
    r.reset()
    onHide()
  }

  return (
    <AppDialog visible={visible} header={t('certificate.result.title')} onHide={close}>
      <div className="space-y-4">
        <FormErrorBanner message={r.message} />

        <FormField label={t('certificate.result.status')} error={r.fieldErrors?.approval_status?.[0]}>
          <AppDropdown value={r.form.approval_status} options={r.statusOptions} onChange={(e) => r.setStatus(e.value)} />
        </FormField>

        <FormField label={t('certificate.result.finalGrade')} error={r.fieldErrors?.['grades.final']?.[0]}>
          <AppInputText value={r.form.finalGrade} onChange={(e) => r.setFinalGrade(e.target.value)} />
        </FormField>

        <FormField label={t('certificate.result.attendance')} error={r.fieldErrors?.attendance_pct?.[0]}>
          <AppInputText value={r.form.attendance_pct} onChange={(e) => r.setAttendance(e.target.value)} />
        </FormField>

        <div className="flex justify-end gap-2">
          <AppButton label={t('common.cancel')} outlined onClick={close} />
          <AppButton
            label={t('common.save')}
            disabled={r.submitting}
            onClick={() => r.submit({ onSuccess: close })}
          />
        </div>
      </div>
    </AppDialog>
  )
}
