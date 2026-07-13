import { useTranslation } from 'react-i18next'
import { AppDialog } from '../AppDialog'
import { AppButton } from '../AppButton'

/** Confirmação de ação irreversível ou de peso legal (aprovar uma cotação libera
 * a turma na Operação). Apresentacional puro: não conhece feature nem mutação. */
export function ConfirmDialog({
  visible, title, message, confirmLabel, severity, pending, onConfirm, onCancel,
}: {
  visible: boolean
  title: string
  message: string
  confirmLabel?: string
  severity?: 'danger'
  pending?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  const { t } = useTranslation()

  const footer = (
    <div className="flex justify-end gap-2">
      <AppButton label={t('common.cancel')} text onClick={onCancel} />
      <AppButton
        label={confirmLabel ?? t('common.save')}
        icon="pi pi-check"
        severity={severity}
        loading={pending}
        onClick={onConfirm}
      />
    </div>
  )

  return (
    <AppDialog header={title} visible={visible} onHide={onCancel} footer={footer}>
      <p className="text-sm text-slate-600 dark:text-slate-300">{message}</p>
    </AppDialog>
  )
}
