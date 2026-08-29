import { useEffect, useRef, type ReactNode } from 'react'
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
 *
 * **Foco após envio reprovado.** O botão de salvar recebe `loading={pending}`;
 * o Prime o desabilita, o navegador solta o foco de elemento `disabled` para o
 * `<body>`, e ao reabilitar ninguém o traz de volta (f4 UI-03, run de
 * 2026-08-28). Na descida de `pending` com o diálogo ainda aberto, o foco vai
 * ao primeiro `[aria-invalid="true"]` do corpo — o `FormField` marca cada um,
 * e o leitor de tela anuncia o `aria-describedby` dele —, e, sem campo
 * inválido, volta ao botão de salvar se tiver caído no `<body>`. Mora aqui
 * porque é este componente que conhece a borda de `pending`; ele não conhece
 * os erros, e não precisa: o DOM já os carrega.
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
  const corpo = useRef<HTMLDivElement>(null)
  const rodape = useRef<HTMLDivElement>(null)
  const estavaPendente = useRef(false)

  useEffect(() => {
    const caiu = estavaPendente.current && !pending
    estavaPendente.current = Boolean(pending)
    if (!caiu || !visible) return
    const invalido = corpo.current?.querySelector<HTMLElement>('[aria-invalid="true"]')
    if (invalido) {
      invalido.focus()
      return
    }
    if (document.activeElement === document.body) {
      rodape.current?.querySelector<HTMLElement>('button:last-of-type')?.focus()
    }
  }, [pending, visible])

  const header = (
    <div className="flex items-center gap-4 pr-6">
      <span>{title}</span>
      {headerExtra}
    </div>
  )

  const footer =
    mode === 'view' ? (
      <div ref={rodape} className="flex justify-end gap-2">
        <AppButton label={t('common.close')} text disabled={closeBlocked} onClick={onHide} />
        {onEdit && <AppButton variant="primary" label={t('common.edit')} icon="pi pi-pencil" onClick={onEdit} />}
      </div>
    ) : (
      <div ref={rodape} className="flex justify-end gap-2">
        <AppButton label={t('common.cancel')} text disabled={closeBlocked} onClick={onHide} />
        <AppButton
          variant="primary"
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
      <div ref={corpo}>{children}</div>
    </AppDialog>
  )
}
