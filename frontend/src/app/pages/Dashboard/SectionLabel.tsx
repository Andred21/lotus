import type { ReactNode } from 'react'

/**
 * Faixa de seção. O `h2` que faltava: a página emitia `h1` e depois `h3` dos
 * cards, sem degrau intermediário, e as quatro seções não se apresentavam como
 * filhas do título (UI-05 do review de 2026-08-17). O degrau existe porque a
 * página TEM dois registros — o que pede ação e o que dá contexto —, e eles já
 * estavam escritos no docblock abaixo sem aparecer na tela.
 *
 * `m-0` pelo mesmo motivo do `AppCardHeader`: sem Preflight, o `h2` traria
 * `margin: 0.83em` do agente do usuário.
 *
 * Tinta do corpo, não a secundária: a faixa pousa no `--surface-ground`, e ali
 * `--text-color-secondary` mede 4,34:1 — reprova o 4,5:1 de texto normal. O
 * mesmo cinza passa (4,76:1) sobre o branco dos cards, que é onde os outros
 * rótulos miúdos da tela moram.
 */
export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <h2
        className="m-0 text-xs font-semibold tracking-wider uppercase"
        style={{ color: 'var(--text-color)' }}
      >
        {children}
      </h2>
      <span aria-hidden="true" className="h-px flex-1" style={{ background: 'var(--surface-border)' }} />
    </div>
  )
}
