import { useTranslation } from 'react-i18next'
import { AppDialog } from '../AppDialog'
import { AppButton } from '../AppButton'

/** Confirmação de ação irreversível ou de peso legal (aprovar uma cotação libera
 * a turma na Operação). Apresentacional puro: não conhece feature nem mutação. */
export function ConfirmDialog({
  visible, title, message, confirmLabel, severity, pending, error, onConfirm, onCancel,
}: {
  visible: boolean
  title: string
  message: string
  confirmLabel?: string
  severity?: 'danger'
  pending?: boolean
  error?: string | null
  onConfirm: () => void
  onCancel: () => void
}) {
  const { t } = useTranslation()

  const footer = (
    <div className="flex justify-end gap-2">
      <AppButton label={t('common.cancel')} text disabled={pending} onClick={onCancel} />
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
    // Com a requisição em voo, ESC e o X do header ficam travados junto com o
    // Cancelar: fechar aqui solta o observer da mutação e a resposta (403/422)
    // chegaria sem ninguém para exibi-la.
    <AppDialog
      header={title}
      visible={visible}
      onHide={onCancel}
      footer={footer}
      closable={!pending}
      closeOnEscape={!pending}
    >
      {error && (
        <p className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
          {error}
        </p>
      )}
      <p className="text-sm text-slate-600 dark:text-slate-300">{message}</p>
    </AppDialog>
  )
}
