import { useTranslation } from 'react-i18next'
import { AppDialog, AppButton, AppInputText, FormField, FormErrorSummary } from '@shared/ui'
import { useEnrollStudentFlow } from '../../hooks/useEnrollStudentFlow'
import { MoveConfirmDialog } from './MoveConfirmDialog'
import { dangerText } from '@shared/styles/tokens'

type Props = {
  turmaId: number
  turmaClientName: string | null
  visible: boolean
  onHide: () => void
}

/** Matrícula de aluno na turma, em dois passos: o RUT primeiro (o backend diz
 * se o aluno existe e de qual cliente é) e os dados depois. Grade de duas
 * colunas a partir de `sm` — RUT │ Nome, E-mail │ Teléfono — e botões no
 * footer, que muda com o passo (bloco 43). */
export function EnrollStudentForm({ turmaId, turmaClientName, visible, onHide }: Props) {
  const { t } = useTranslation()
  const f = useEnrollStudentFlow(turmaId, turmaClientName, onHide)

  const close = () => {
    f.reset()
    onHide()
  }

  const err = (key: string) => f.fieldErrors?.[key]?.[0]

  const footer = (
    <div className="flex justify-end gap-2">
      <AppButton label={t('operation.enrollment.form.cancel')} text onClick={close} />
      {f.step === 'rut' ? (
        <AppButton
          variant="primary"
          label={t('operation.enrollment.form.verify')}
          disabled={!f.rut || f.previewing}
          onClick={f.runPreview}
        />
      ) : (
        <AppButton
          variant="primary"
          label={t('operation.enrollment.form.submit')}
          disabled={!f.details.name || f.submitting}
          onClick={f.submit}
        />
      )}
    </div>
  )

  return (
    <AppDialog size="sm" visible={visible} header={t('operation.enrollment.form.title')} onHide={close} footer={footer}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="empty:hidden sm:col-span-2">
          <FormErrorSummary errors={f.fieldErrors} mapped={['rut', 'name', 'email', 'phone']} />
        </div>

        <div className={f.step === 'rut' ? 'sm:col-span-2' : undefined}>
          <FormField label={t('operation.enrollment.form.rutLabel')} error={err('rut')}>
            <AppInputText
              className="w-full"
              value={f.rut}
              onChange={(e) => f.setRut(e.target.value)}
              disabled={f.step === 'details'}
            />
          </FormField>
        </div>

        {f.step === 'details' && (
          <>
            <FormField label={t('operation.enrollment.form.nameLabel')} error={err('name')}>
              <AppInputText className="w-full" value={f.details.name} onChange={(e) => f.setField('name', e.target.value)} />
            </FormField>
            <FormField label={t('operation.enrollment.form.emailLabel')} error={err('email')}>
              <AppInputText className="w-full" value={f.details.email} onChange={(e) => f.setField('email', e.target.value)} />
            </FormField>
            <FormField label={t('operation.enrollment.form.phoneLabel')} error={err('phone')}>
              <AppInputText className="w-full" value={f.details.phone} onChange={(e) => f.setField('phone', e.target.value)} />
            </FormField>
            {f.isNewStudent && (
              <p className="text-sm sm:col-span-2" style={{ color: 'var(--text-color-secondary)' }}>
                {t('operation.enrollment.form.emailHintNew')}
              </p>
            )}
          </>
        )}

        {f.message && (
          <p className="text-sm sm:col-span-2" style={{ color: dangerText }}>
            {f.message}
          </p>
        )}
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
