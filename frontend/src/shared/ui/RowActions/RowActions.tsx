import { useRef, type RefObject } from 'react'
import { useTranslation } from 'react-i18next'
import { Tooltip, type TooltipProps } from 'primereact/tooltip'
import { AppButton } from '../AppButton'
import { AppMenu, type AppMenuRef } from '../AppMenu'

export type RowAction = {
  /** Já traduzido: nome acessível do botão e rótulo do item de menu. */
  label: string
  icon: string
  onClick: () => void
  disabled?: boolean
  /** Dica no hover do botão solto. O item de menu já mostra o rótulo. */
  tooltip?: boolean
  /** Ação destrutiva (remover matrícula): tinge o botão solto de perigo. No
   * menu o rótulo já diz o que a ação faz. */
  severity?: 'danger'
  /** `id` do texto que explica o `disabled` — o "Emitir" apagado da Emisión
   * aponta para a tag do bloqueio (f3 UI-03). Vale no botão solto; a tabela
   * que usa é de ação única e nunca abre menu. */
  describedBy?: string
}

/**
 * As ações de uma linha de tabela, soltas ou colapsadas num menu.
 *
 * Nasceu do Q-1 do review de 2026-09-26 (UI-01 de Pessoas, classe `C`). Em
 * 390x844 a moldura da tabela tem 276px, e a coluna presa de Redactores (três
 * ícones, 12rem) deixava 8px do nome visíveis — só a inicial. Nenhuma largura
 * mínima resolve: a coluna precisaria de ~70% da tabela (medido, ficha `D-65`).
 * O que resolve é a linha carregar UM controle abaixo de `sm`.
 *
 * `collapsed` chega por prop, e não daqui de dentro: quem decide é
 * `useCollapsibleActionsColumn`, que encolhe a coluna no MESMO render. Os dois
 * lados vêm do mesmo booleano porque um sem o outro é defeito — ícones soltos
 * numa coluna de 4.5rem transbordam; menu numa coluna de 12rem não devolve
 * nada ao nome.
 *
 * Com uma ação só não há menu: seria um clique a mais para chegar ao mesmo
 * lugar, e um botão já cabe na coluna colapsada.
 */
/** A dica abre à ESQUERDA do ícone. A coluna presa mora na borda direita da
 * tabela, e à direita (o default do Prime) a dica passava da moldura e criava
 * rolagem horizontal na página — achado do João no "Revocar" do Historial
 * (review do item 23). */
const DICA: TooltipProps = { position: 'left' }

/**
 * Um botão solto da linha. Apagado, o `Button` do Prime não abre dica nenhuma
 * (`showTooltip = !disabled || showOnDisabled`), e o `showOnDisabled` dele
 * embrulha o botão num `div` criado FORA do React, que a reconciliação não
 * conhece. Aqui o involucro é um `span` do próprio React: o `.p-disabled` do
 * Prime põe `pointer-events: none` no botão, então o hover cai no `span`, e é
 * nele que a dica se prende — o "Emitir" apagado da Emisión volta a dizer o
 * que é (Q-1 do review do item 23).
 */
function RowActionButton({ acao }: { acao: RowAction }) {
  const involucro = useRef<HTMLSpanElement>(null)
  const dicaNoInvolucro = acao.tooltip && acao.disabled

  const botao = (
    <AppButton
      icon={acao.icon}
      text
      rounded
      severity={acao.severity}
      aria-label={acao.label}
      aria-describedby={acao.describedBy}
      tooltip={acao.tooltip && !acao.disabled ? acao.label : undefined}
      tooltipOptions={DICA}
      disabled={acao.disabled}
      onClick={acao.onClick}
    />
  )

  if (!dicaNoInvolucro) return botao

  return (
    <>
      <span ref={involucro} className="inline-flex">
        {botao}
      </span>
      {/* O `useRef` do React 19 tipa `RefObject<T | null>`, e o d.ts do Prime
        * ainda pede `RefObject<HTMLElement>`: a forma em runtime é a mesma. */}
      <Tooltip target={involucro as RefObject<HTMLElement>} content={acao.label} {...DICA} />
    </>
  )
}

export function RowActions({ actions, collapsed }: { actions: RowAction[]; collapsed: boolean }) {
  const { t } = useTranslation()
  const menu = useRef<AppMenuRef>(null)

  if (actions.length === 0) return null

  if (!collapsed || actions.length === 1) {
    return (
      <div className="flex justify-end gap-1">
        {actions.map((acao) => (
          <RowActionButton key={acao.label} acao={acao} />
        ))}
      </div>
    )
  }

  return (
    <div className="flex justify-end">
      <AppButton
        icon="pi pi-ellipsis-v"
        text
        rounded
        aria-label={t('common.moreActions')}
        aria-haspopup
        onClick={(event) => menu.current?.toggle(event)}
      />
      <AppMenu
        ref={menu}
        // Mesma grafia do `LanguageMenu`: a largura fixa do tema (12.5rem)
        // quebrava "Reenviar invitación" em duas linhas em 390x844, e o
        // gatilho mora na borda direita da tabela — o menu abre para dentro.
        className="w-auto"
        popupAlignment="right"
        model={actions.map((acao) => ({
          label: acao.label,
          icon: acao.icon,
          disabled: acao.disabled,
          command: acao.onClick,
        }))}
      />
    </div>
  )
}
