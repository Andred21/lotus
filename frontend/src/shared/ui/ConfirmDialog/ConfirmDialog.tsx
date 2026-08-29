import { useTranslation } from 'react-i18next'
import { AppDialog } from '../AppDialog'
import { AppButton } from '../AppButton'
import { FormErrorBanner } from '../FormField'

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
      {/* Sem severidade, confirmar é a ação primária do diálogo e veste a
        * marca — a mesma grafia do `CrudDialog` (achado B3). Com `danger`, o
        * preenchido de severidade é o sinal e a marca sairia por cima dele. */}
      <AppButton
        variant={severity ? undefined : 'primary'}
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
      <FormErrorBanner message={error} />
      <p className="text-sm" style={{ color: 'var(--text-color-secondary)' }}>{message}</p>
    </AppDialog>
  )
}
