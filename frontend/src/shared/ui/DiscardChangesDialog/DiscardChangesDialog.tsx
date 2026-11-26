import { useTranslation } from 'react-i18next'
import { ConfirmDialog } from '../ConfirmDialog'

/**
 * A confirmação de descartar rascunho, com a cópia num lugar só.
 *
 * Recebe o `dialogProps` do `useUnsavedChangesGuard` (`{...guard.dialogProps}`):
 * a guarda decide QUANDO abrir, esta peça decide COMO perguntar. `warning`, não
 * `danger`: descartar perde o que o usuário digitou, mas nada que já estivesse
 * gravado. O Cancelar vira "Seguir editando" porque é a saída que o usuário quer.
 */
export function DiscardChangesDialog({
  visible,
  onConfirm,
  onCancel,
}: {
  visible: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  const { t } = useTranslation()

  return (
    <ConfirmDialog
      visible={visible}
      title={t('common.discardTitle')}
      message={t('common.discardBody')}
      confirmLabel={t('common.discardConfirm')}
      cancelLabel={t('common.keepEditing')}
      confirmIcon="delete"
      severity="warning"
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  )
}
