import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { ConfirmDialog } from '../ConfirmDialog'

/**
 * A confirmação de descartar rascunho, com a cópia num lugar só.
 *
 * Recebe o `dialogProps` do `useUnsavedChangesGuard` (`{...guard.dialogProps}`):
 * a guarda decide QUANDO abrir, esta peça decide COMO perguntar. `warning`, não
 * `danger`: descartar perde o que o usuário digitou, mas nada que já estivesse
 * gravado. O Cancelar vira "Seguir editando" porque é a saída que o usuário quer.
 *
 * Também monta o `blocker` do `dialogProps`: é este componente que põe o blocker
 * do router na árvore (só existe com rascunho). Sem renderizá-lo, a navegação do
 * router não é guardada. `shared/ui` e `shared/hooks` não se importam, então o
 * blocker chega como nó pronto, não como import.
 */
export function DiscardChangesDialog({
  visible,
  onConfirm,
  onCancel,
  blocker = null,
}: {
  visible: boolean
  onConfirm: () => void
  onCancel: () => void
  blocker?: ReactNode
}) {
  const { t } = useTranslation()

  return (
    <>
      {blocker}
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
    </>
  )
}
