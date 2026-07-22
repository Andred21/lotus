import { useTranslation } from 'react-i18next'
import { AppDialog, AppButton, AppInputText, FormField, FormErrorSummary } from '@shared/ui'
import { useEnrollStudentFlow } from '../../hooks/useEnrollStudentFlow'
import { MoveConfirmDialog } from './MoveConfirmDialog'

type Props = {
  turmaId: number
  turmaClientName: string | null
  visible: boolean
  onHide: () => void
}

export function EnrollStudentForm({ turmaId, turmaClientName, visible, onHide }: Props) {
  const { t } = useTranslation()
  const f = useEnrollStudentFlow(turmaId, turmaClientName, onHide)

  const close = () => {
    f.reset()
    onHide()
  }

  const err = (key: string) => f.fieldErrors?.[key]?.[0]

  return (
    <AppDialog visible={visible} header={t('operation.enrollment.form.title')} onHide={close}>
      <div className="space-y-4">
        <FormErrorSummary errors={f.fieldErrors} mapped={['rut', 'name', 'email', 'phone']} />

        <FormField label={t('operation.enrollment.form.rutLabel')} error={err('rut')}>
          <AppInputText
            value={f.rut}
            onChange={(e) => f.setRut(e.target.value)}
            disabled={f.step === 'details'}
          />
        </FormField>

        {f.step === 'rut' && (
          <div className="flex justify-end gap-2">
            <AppButton label={t('operation.enrollment.form.cancel')} outlined onClick={close} />
            <AppButton
              label={t('operation.enrollment.form.verify')}
              disabled={!f.rut || f.previewing}
              onClick={f.runPreview}
            />
          </div>
        )}

        {f.step === 'details' && (
          <>
            <FormField label={t('operation.enrollment.form.nameLabel')} error={err('name')}>
              <AppInputText value={f.details.name} onChange={(e) => f.setField('name', e.target.value)} />
            </FormField>
            <FormField
              label={t('operation.enrollment.form.emailLabel')}
              error={err('email')}
            >
              <AppInputText value={f.details.email} onChange={(e) => f.setField('email', e.target.value)} />
            </FormField>
            {f.isNewStudent && (
              <p className="text-sm text-slate-500">{t('operation.enrollment.form.emailHintNew')}</p>
            )}
            <FormField label={t('operation.enrollment.form.phoneLabel')} error={err('phone')}>
              <AppInputText value={f.details.phone} onChange={(e) => f.setField('phone', e.target.value)} />
            </FormField>
            <div className="flex justify-end gap-2">
              <AppButton label={t('operation.enrollment.form.cancel')} outlined onClick={close} />
              <AppButton
                label={t('operation.enrollment.form.submit')}
                disabled={!f.details.name || f.submitting}
                onClick={f.submit}
              />
            </div>
          </>
        )}

        {f.message && <p className="text-sm text-red-600">{f.message}</p>}
      </div>

      <MoveConfirmDialog
        visible={f.moveOpen}
        studentName={f.preview?.name ?? ''}
        previousClient={f.preview?.previous_client ?? null}
        currentClient={f.turmaClientName}
        onConfirm={f.confirmMove}
        onCancel={f.cancelMove}
      />
    </AppDialog>
  )
}
