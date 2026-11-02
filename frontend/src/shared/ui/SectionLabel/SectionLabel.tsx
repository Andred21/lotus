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
  /** Tinta da faixa. `body` (default) é a tinta de corpo com a linha em
   * `--surface-border` — a das faixas de Dashboard, Sidebar e cartões de
   * operation (spec D2). `brand` é do `FormSection`: título em
   * `--primary-color` e linha em `--section-rule`. Quem não é título de seção
   * de formulário NÃO usa `brand`. */
  tone?: 'body' | 'brand'
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
 * Tinta do corpo por padrão, não a secundária. A razão ORIGINAL era contraste:
 * a faixa pousa no `--surface-ground`, e ali a secundária de então (`#64748b`) media
 * 4,34:1. Essa razão MORREU no BD-16 (D-28) — hoje a secundária mede 6,92:1 no
 * humo. A tinta de corpo fica assim mesmo, agora por hierarquia e não por
 * régua: o degrau vem do peso e da caixa alta, não de um cinza mais claro que
 * o dos rótulos que ele encabeça.
 *
 * A marca é opt-in (`tone="brand"`), e só o `FormSection` a pede. A P-36 já
 * travou este componente inteiro na tinta de corpo; o João reverteu a D1 para o
 * título de seção de formulário em 2026-11-01 (ver `FormSection`), e a trava
 * encolheu para o default: Dashboard, Sidebar e cartões seguem em `body`.
 */
export function SectionLabel({
  children, as = 'h2', rule = true, tone = 'body', className,
}: SectionLabelProps) {
  const Heading = as
  const brand = tone === 'brand'
  return (
    <div className={`flex items-center gap-3${className ? ` ${className}` : ''}`}>
      <Heading
        className={sectionLabelClass}
        style={{ color: brand ? 'var(--primary-color)' : 'var(--text-color)' }}
      >
        {children}
      </Heading>
      {rule && (
        <span
          aria-hidden="true"
          className="h-px flex-1"
          style={{ background: brand ? 'var(--section-rule)' : 'var(--surface-border)' }}
        />
      )}
    </div>
  )
}
