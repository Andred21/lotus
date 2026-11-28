import { useEffect, useId, useRef, type FormEvent, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { AppDialog, type AppDialogSize } from '../AppDialog'
import { AppButton } from '../AppButton'
import { DiscardChangesDialog } from '../DiscardChangesDialog'
import type { UnsavedChangesGuard } from '@shared/hooks/useUnsavedChangesGuard'
import type { DialogMode } from '@shared/lib'

/**
 * Dialog unificado de cadastro: visualização, edição e criação são o mesmo
 * componente — no create os campos vêm vazios. O tamanho é do chamador
 * (bloco 43): `md` ou `lg` nos cadastros; maximiza só no `lg`.
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
 *
 * **Foco na abertura.** O `Dialog` do Prime foca o primeiro focável que
 * encontra, e esse é o botão de maximizar do header: quem abre por teclado
 * começa por um controle de janela e gasta um Tab para chegar ao formulário
 * (run 5 de 2026-08-30). Na subida de `visible` o foco vai ao primeiro controle
 * do corpo; corpo sem controle (o modo `view` de puro texto) recebe o foco no
 * próprio container, que é `tabIndex={-1}` para isso. Quem aponta o foco é este
 * componente, então o `focusOnShow` do Prime sai — os dois disputariam, e o do
 * Prime roda DEPOIS, num efeito de transição, e venceria. Por isso o foco entra
 * pelo `onShow` do próprio Dialog, e não por um efeito nosso: no commit em que
 * o efeito rodaria o conteúdo do portal ainda não está no documento.
 *
 * **Enter envia (A-10).** O corpo é um `<form>`; o Salvar mora no footer, que o
 * Prime renderiza como irmão do corpo, e por isso é o botão `submit` do form
 * pelo atributo `form`. Clique e Enter caem no mesmo `onSubmit` do form, que
 * chama o `onSubmit` do chamador — a guarda de rascunho e o `allowNavigation`
 * do salvar ficam nele, não aqui. O envio implícito é do navegador: com o Salvar
 * desabilitado (`pending`/`disabled`) ele não acontece, e `textarea` segue
 * quebrando linha; o que não é campo do cadastro vai em `afterForm`, fora do
 * form, para o Enter ali não salvar. O `stopPropagation` existe porque o submit de um form dentro
 * de um portal sobe pela árvore do React a um form ancestral.
 *
 * **Foco após Editar.** O `key` por modo do rodapé (abaixo) impede o submit
 * mas desmonta o botão focado; na transição `view → edit` o foco vai ao
 * primeiro campo do corpo, o mesmo alvo da abertura.
 */
export function CrudDialog({
  size, visible, mode, title, onHide, onEdit, onSubmit, pending, disabled, closeBlocked, guard, submitLabel, headerExtra, afterForm, children,
}: {
  /** Teto de largura e maximizar (bloco 43) — repassado ao `AppDialog`. */
  size: AppDialogSize
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
  /** A guarda de rascunho do formulário: o `crud.guard` que o `useCrudForm` (ou
   * `useRedatorForm`) devolve. O dialog monta o `DiscardChangesDialog` com o
   * `guard.dialogProps` e roteia Cancelar/Fechar, X e Esc por
   * `guard.confirmDiscard`.
   *
   * É o objeto da guarda, e não um `dirty` booleano, porque a guarda nasce no
   * hook do form: só ele sabe quando o salvar deu certo e libera a navegação
   * (`allowNavigation`) antes de o `afterCreate` navegar — o `onCreated` do
   * orçamento leva ao detalhe com o form ainda sujo. Um `dirty` aqui criaria a
   * guarda dentro do dialog, longe do salvar, e essa navegação de sucesso abriria
   * "descartar?". Sem `guard`, o dialog fecha direto. */
  guard?: UnsavedChangesGuard
  submitLabel?: string
  headerExtra?: ReactNode
  /** Conteúdo do corpo que NÃO é campo do cadastro (busca, filtros e tabela de
   * uma seção relacionada). Fica depois do `<form>`, fora dele: dentro, o Enter
   * numa busca acionaria o Salvar do footer pelo envio implícito e salvaria o
   * registro pela metade. */
  afterForm?: ReactNode
  children: ReactNode
}) {
  const { t } = useTranslation()
  const corpo = useRef<HTMLDivElement>(null)
  const rodape = useRef<HTMLDivElement>(null)
  const estavaPendente = useRef(false)
  const formId = useId()

  useEffect(() => {
    const caiu = estavaPendente.current && !pending
    estavaPendente.current = Boolean(pending)
    if (!caiu || !visible) return
    const invalido = corpo.current?.querySelector<HTMLElement>('[aria-invalid="true"]')
    if (invalido) {
      invalido.focus()
      return
    }
    // 422 sem campo na tela: o resumo de erros é o alvo (`FormErrorSummary`).
    const resumo = corpo.current?.querySelector<HTMLElement>('[role="alert"][tabindex="-1"]')
    if (resumo) {
      resumo.focus()
      return
    }
    if (document.activeElement === document.body) {
      rodape.current?.querySelector<HTMLElement>('button:last-of-type')?.focus()
    }
  }, [pending, visible])

  const focarCorpo = () => {
    const primeiro = corpo.current?.querySelector<HTMLElement>(
      'input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled])',
    )
    ;(primeiro ?? corpo.current)?.focus()
  }

  // Editar → edição: a `key` do rodapé desmonta o botão que tinha o foco e o
  // navegador o solta no `<body>`. Quem pediu a edição vai ao primeiro campo.
  const modoAnterior = useRef(mode)
  useEffect(() => {
    const entrouEmEdicao = modoAnterior.current === 'view' && mode === 'edit'
    modoAnterior.current = mode
    if (entrouEmEdicao && visible) focarCorpo()
  }, [mode, visible])

  // Saída que descarta: com guarda e rascunho, pergunta antes de fechar.
  const sair = () => (guard ? guard.confirmDiscard(onHide) : onHide())

  const enviar = (e: FormEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (mode === 'view' || pending || disabled) return
    onSubmit?.()
  }

  const header = (
    <div className="flex items-center gap-4 pr-6">
      <span>{title}</span>
      {headerExtra}
    </div>
  )

  // `key` por modo: sem ela o React reaproveita o `<button>` do Editar como o
  // Salvar (mesma posição), ele vira `type="submit"` dentro do próprio clique e
  // o navegador envia o form. Clicar em Editar salvava e voltava à leitura.
  const footer =
    mode === 'view' ? (
      <div key="view" ref={rodape} className="flex justify-end gap-2">
        <AppButton label={t('common.close')} text disabled={closeBlocked} onClick={sair} />
        {onEdit && <AppButton variant="primary" label={t('common.edit')} icon="edit" onClick={onEdit} />}
      </div>
    ) : (
      <div key="edit" ref={rodape} className="flex justify-end gap-2">
        <AppButton label={t('common.cancel')} text disabled={closeBlocked} onClick={sair} />
        <AppButton
          variant="primary"
          label={submitLabel ?? t('common.save')}
          icon="check"
          type="submit"
          form={formId}
          loading={pending}
          disabled={disabled}
        />
      </div>
    )

  return (
    <>
      <AppDialog
        size={size}
        header={header}
        visible={visible}
        onHide={sair}
        closable={!closeBlocked}
        closeOnEscape={!closeBlocked}
        focusOnShow={false}
        onShow={focarCorpo}
        footer={footer}
      >
        <div ref={corpo} tabIndex={-1} className="outline-none">
          <form id={formId} onSubmit={enviar}>{children}</form>
          {afterForm}
        </div>
      </AppDialog>
      {guard && <DiscardChangesDialog {...guard.dialogProps} />}
    </>
  )
}
