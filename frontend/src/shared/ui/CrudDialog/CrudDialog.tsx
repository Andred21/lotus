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
  visible, mode, title, onHide, onEdit, onSubmit, pending, disabled, closeBlocked, submitLabel, headerExtra, children,
}: {
  visible: boolean
  mode: DialogMode
  title: string
  onHide: () => void
  onEdit?: () => void
  onSubmit?: () => void
  pending?: boolean
  /** Desabilita o botão salvar sem mexer no loading (ex.: dependência externa
   * que ainda não carregou, como a lista de clientes do create de aluno). */
  disabled?: boolean
  /** Fecha as TRÊS saídas do diálogo (Cancelar/Fechar, X do header, ESC)
   * enquanto uma escrita em voo não pode ser abandonada — hoje, o upload da
   * foto bufferizada logo depois do `201` do create. Fechar nessa janela
   * descartaria a foto em silêncio: a entidade já existe, mas o arquivo nunca
   * chega, e o diálogo some antes de qualquer banner de erro.
   *
   * **Salvar é a QUARTA saída** e não é coberta por esta prop: o `onSubmit`
   * do chamador costuma fechar o diálogo no `onSuccess`. Quem usa
   * `closeBlocked` precisa gatear `disabled` pela mesma condição, senão a
   * perda silenciosa volta pela porta do Salvar. */
  closeBlocked?: boolean
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
        <AppButton label={t('common.close')} text disabled={closeBlocked} onClick={onHide} />
        {onEdit && <AppButton variant="brandIcon" label={t('common.edit')} icon="pi pi-pencil" onClick={onEdit} />}
      </div>
    ) : (
      <div className="flex justify-end gap-2">
        <AppButton label={t('common.cancel')} text disabled={closeBlocked} onClick={onHide} />
        <AppButton
          variant="brandIcon"
          label={submitLabel ?? t('common.save')}
          icon="pi pi-check"
          loading={pending}
          disabled={disabled}
          onClick={onSubmit}
        />
      </div>
    )

  return (
    <AppDialog
      header={header}
      visible={visible}
      onHide={onHide}
      closable={!closeBlocked}
      closeOnEscape={!closeBlocked}
      footer={footer}
    >
      {children}
    </AppDialog>
  )
}
