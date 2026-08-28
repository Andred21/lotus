import type { ReactNode } from 'react'

/**
 * Faixa de seção. O `h2` que faltava: a página emitia `h1` e depois `h3` dos
 * cards, sem degrau intermediário, e as quatro seções não se apresentavam como
 * filhas do título (UI-05 do review de 2026-08-17). O degrau existe porque a
 * página TEM dois registros — o que pede ação e o que dá contexto —, e eles já
 * estavam escritos no docblock abaixo sem aparecer na tela.
 *
 * A margem do `h2` já é zerada pelo mini-reset de `index.css` (P-46).
 *
 * Tinta do corpo, não a secundária. A razão ORIGINAL era contraste: a faixa
 * pousa no `--surface-ground`, e ali a secundária de então (`#64748b`) media
 * 4,34:1 — reprovava o 4,5:1 de texto normal, embora passasse raspando (4,76:1)
 * sobre o branco dos cards, onde moram os outros rótulos miúdos da tela.
 *
 * Essa razão MORREU no BD-16 (D-28): a secundária do claro desceu ao slate-600
 * e hoje mede 6,92:1 no humo — ver o bloco `html:not(.dark)` do
 * `brand-theme.css`. A tinta de corpo fica assim mesmo, agora por hierarquia e
 * não por régua: é um `h2`, e o degrau que ele marca vem do peso e da caixa
 * alta, não de um cinza mais claro que o dos rótulos que ele encabeça.
 */
export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <h2
        className="text-xs font-semibold tracking-wider uppercase"
        style={{ color: 'var(--text-color)' }}
      >
        {children}
      </h2>
      <span aria-hidden="true" className="h-px flex-1" style={{ background: 'var(--surface-border)' }} />
    </div>
  )
}
