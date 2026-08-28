import type { ReactNode } from 'react'
import { sectionLabelClass } from '../typography'

export interface SectionLabelProps {
  children: ReactNode
  /** Nível do cabeçalho. `h2` é a faixa que divide uma PÁGINA; `h3` é a que
   * encabeça um grupo dentro de card ou diálogo, sob o `h1` da página. Nível
   * fixo quebraria um dos dois lados (spec D6). */
  as?: 'h2' | 'h3'
  /** Hairline à direita do texto. Sai por padrão — é o desenho da faixa do
   * Dashboard, que esta peça generaliza. Faixa que divide linha com botão ou
   * tag desliga (`rule={false}`): ali a linha brigaria com o controle. */
  rule?: boolean
  /** Layout de quem compõe (respiro acima numa seção que não é a primeira). */
  className?: string
}

/**
 * Faixa de seção. O `h2` que faltava no Dashboard: a página emitia `h1` e
 * depois `h3` dos cards, sem degrau intermediário, e as quatro seções não se
 * apresentavam como filhas do título (UI-05 do review de 2026-08-17). O degrau
 * existe porque a página TEM dois registros — o que pede ação e o que dá
 * contexto —, e eles já estavam escritos em docblock sem aparecer na tela.
 *
 * Subiu de `app/pages/Dashboard/` para cá porque o MESMO papel saía em 5
 * grafias pelo produto (achado A2 do audit de 2026-08-26) — e uma peça que
 * mora dentro de uma página não é alcançável por feature nenhuma.
 *
 * A margem do cabeçalho já é zerada pelo mini-reset de `index.css` (P-46).
 *
 * Tinta do corpo, não a secundária. A razão ORIGINAL era contraste: a faixa
 * pousa no `--surface-ground`, e ali a secundária de então (`#64748b`) media
 * 4,34:1. Essa razão MORREU no BD-16 (D-28) — hoje a secundária mede 6,92:1 no
 * humo. A tinta de corpo fica assim mesmo, agora por hierarquia e não por
 * régua: o degrau vem do peso e da caixa alta, não de um cinza mais claro que
 * o dos rótulos que ele encabeça.
 */
export function SectionLabel({ children, as = 'h2', rule = true, className }: SectionLabelProps) {
  const Heading = as
  return (
    <div className={`flex items-center gap-3${className ? ` ${className}` : ''}`}>
      <Heading className={sectionLabelClass} style={{ color: 'var(--text-color)' }}>
        {children}
      </Heading>
      {rule && (
        <span aria-hidden="true" className="h-px flex-1" style={{ background: 'var(--surface-border)' }} />
      )}
    </div>
  )
}
