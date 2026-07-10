import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { AppDialog } from '../AppDialog'
import { AppButton } from '../AppButton'
import type { DialogMode } from '@shared/lib'

/**
 * Dialog unificado de cadastro: visualização, edição e criação são o mesmo
 * componente — no create os campos vêm vazios. Maximizable.
 *
 * Os botões vivem no footer, inclusive o "Editar" do modo view: o header fica
 * só com título e conteúdo contextual (`headerExtra`).
 */
export function CrudDialog({
  visible, mode, title, onHide, onEdit, onSubmit, pending, submitLabel, headerExtra, children,
}: {
  visible: boolean
  mode: DialogMode
  title: string
  onHide: () => void
  onEdit?: () => void
  onSubmit?: () => void
  pending?: boolean
  submitLabel?: string
  headerExtra?: ReactNode
  children: ReactNode
}) {
  const { t } = useTranslation()

  const header = (
    <div className="flex items-center gap-4 pr-6">
      <span>{title}</span>
      {headerExtra}
    </div>
  )

  const footer =
    mode === 'view' ? (
      <div className="flex justify-end gap-2">
        <AppButton label={t('common.close')} text onClick={onHide} />
        {onEdit && <AppButton variant="brandIcon" label={t('common.edit')} icon="pi pi-pencil" onClick={onEdit} />}
      </div>
    ) : (
      <div className="flex justify-end gap-2">
        <AppButton label={t('common.cancel')} text onClick={onHide} />
        <AppButton
          variant="brandIcon"
          label={submitLabel ?? t('common.save')}
          icon="pi pi-check"
          loading={pending}
          onClick={onSubmit}
        />
      </div>
    )

  return (
    <AppDialog header={header} visible={visible} onHide={onHide} footer={footer}>
      {children}
    </AppDialog>
  )
}
