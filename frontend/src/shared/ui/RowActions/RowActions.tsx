import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
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
export function RowActions({ actions, collapsed }: { actions: RowAction[]; collapsed: boolean }) {
  const { t } = useTranslation()
  const menu = useRef<AppMenuRef>(null)

  if (actions.length === 0) return null

  if (!collapsed || actions.length === 1) {
    return (
      <div className="flex justify-end gap-1">
        {actions.map((acao) => (
          <AppButton
            key={acao.label}
            icon={acao.icon}
            text
            rounded
            aria-label={acao.label}
            tooltip={acao.tooltip ? acao.label : undefined}
            disabled={acao.disabled}
            onClick={acao.onClick}
          />
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
