import { useTranslation } from 'react-i18next'
import { AppDialog, AppButton, AppDropdown, AppInputText, FormField, FormErrorBanner } from '@shared/ui'
import type { ApprovalRuleData, EnrollmentData } from '@shared/types/generated'
import { warningSurface, warningText } from '@shared/styles/tokens'
import { useRegisterResult } from '../../hooks/useRegisterResult'

type Props = {
  turmaId: number
  enrollment: EnrollmentData | null
  visible: boolean
  approvalRule?: ApprovalRuleData
  onHide: () => void
}

/** Registro do resultado acadêmico por matrícula (Task 10): nota, presença e
 * estado de aprovação. É o que fecha o loop com a Certificação — sem ele a
 * matrícula nunca aparece pendente no painel de emissão. */
export function RegisterResultDialog({ turmaId, enrollment, visible, approvalRule, onHide }: Props) {
  const { t } = useTranslation()
  const r = useRegisterResult(turmaId, enrollment, visible, approvalRule)

  // Fechar fica bloqueado com o PUT em voo (mesmo gate do `ConfirmIssueDialog`
  // e do `closeBlocked` do CrudDialog): cancelar durante o pending e reabrir
  // para OUTRA matrícula deixava o `onSuccess` antigo fechar o diálogo novo,
  // descartando o rascunho — o guard cobre também ESC/click-out.
  const close = () => {
    if (r.submitting) return
    r.reset()
    onHide()
  }

  const footer = (
    <div className="flex justify-end gap-2">
      <AppButton label={t('common.cancel')} text disabled={r.submitting} onClick={close} />
      <AppButton
        variant="primary"
        label={t('common.save')}
        disabled={r.submitting}
        onClick={() => r.submit({ onSuccess: close })}
      />
    </div>
  )

  return (
    <AppDialog
      size="sm"
      visible={visible}
      header={t('certificate.result.title')}
      onHide={close}
      closable={!r.submitting}
      footer={footer}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="empty:hidden sm:col-span-2">
          <FormErrorBanner message={r.message} />
        </div>

        <div className="sm:col-span-2">
          <FormField label={t('certificate.result.status')} error={r.fieldErrors?.approval_status?.[0]}>
            <AppDropdown value={r.form.approval_status} options={r.statusOptions} onChange={(e) => r.setStatus(e.value)} />
          </FormField>
        </div>

        <FormField label={t('certificate.result.finalGrade')} error={r.fieldErrors?.['grades.final']?.[0]}>
          <AppInputText className="w-full" value={r.form.finalGrade} onChange={(e) => r.setFinalGrade(e.target.value)} />
        </FormField>

        <FormField label={t('certificate.result.attendance')} error={r.fieldErrors?.attendance_pct?.[0]}>
          <AppInputText className="w-full" value={r.form.attendance_pct} onChange={(e) => r.setAttendance(e.target.value)} />
        </FormField>

        {/* Aviso, não erro: âmbar e sem role="alert" (o FormErrorBanner é vermelho e
            para 422). NUNCA bloqueia o salvar — registro não bloqueia ação. */}
        {r.ruleWarning && (
          <p
            className="rounded-control px-3 py-2 text-sm sm:col-span-2"
            style={{
              background: warningSurface,
              color: warningText,
            }}
          >
            {r.ruleWarning}
          </p>
        )}
      </div>
    </AppDialog>
  )
}
