import { Tag } from 'primereact/tag'
import type { TagProps } from 'primereact/tag'
import { accentText, dangerText, infoText, successText, warningText } from '../../styles/tokens'

/** Tom sem equivalente em `severity` do PrimeReact. Hoje só o roxo de
 * modalidade `Online`. Modalidade não é severidade — não entra na escala
 * success/info/warning/danger. */
export type AppTagTone = 'accent'

export interface AppTagProps extends TagProps {
  tone?: AppTagTone
}

/** Fundo e texto do `secondary`, que o Lara não pinta — ver o docblock abaixo.
 * São as variáveis do tema, não uma fórmula: as duas já invertem com a folha
 * (claro `#e2e8f0`/`#334155`, escuro `#334155`/branco a 87%). */
const NEUTRO = { background: 'var(--surface-200)', color: 'var(--text-color)' }

/** Mesma mecânica dos quatro tons abaixo, e pelo mesmo motivo medido: a tinta
 * era `color-mix(in srgb, var(--purple-500) 70%, var(--text-color))` — a fórmula
 * que o `tokens.ts` abandonou —, e aqui ela reprovava nos DOIS temas: 4,44:1 no
 * claro e 4,41:1 no escuro, contra o 4,5:1 de texto normal (12px/700). Este era
 * o último sítio dela no projeto. */
const ACCENT = {
  background: 'color-mix(in srgb, var(--purple-500) 15%, var(--surface-card))',
  color: accentText,
}

/** Hue por severidade. Os palette vars do Lara NÃO invertem entre temas, então o
 * fundo tingido é composto com `--surface-card` (que inverte) via color-mix — a
 * mesma mecânica do `AppCard`. A TINTA, essa, vem de `--tone-*-ink`, que troca o
 * degrau da rampa por tema e já é o que o corpo do produto usa para texto de
 * severidade. */
const TOM: Record<string, { background: string; color: string }> = {
  success: { background: 'color-mix(in srgb, var(--green-500) 15%, var(--surface-card))', color: successText },
  info: { background: 'color-mix(in srgb, var(--blue-500) 15%, var(--surface-card))', color: infoText },
  warning: { background: 'color-mix(in srgb, var(--yellow-500) 15%, var(--surface-card))', color: warningText },
  danger: { background: 'color-mix(in srgb, var(--red-500) 15%, var(--surface-card))', color: dangerText },
}

/**
 * `severity="secondary"` sai NEUTRO, e é o wrapper quem resolve isso.
 *
 * O Lara não tem regra `.p-tag.p-tag-secondary` — só success/info/warning/danger
 * —, então a severidade que o PrimeReact aceita cai na regra BASE `.p-tag`, cujo
 * fundo é a primária. Resultado medido: "Sin subir" saía `rgb(37,165,228)`
 * contra `rgb(14,165,233)` das tags `info` ao lado, isto é, a ausência de
 * documento lia como rótulo informativo — a marca no lugar do neutro (UI-03 do
 * review de 2026-08-16). Não é o tema que está errado: o mapa de cor do Lara não
 * cobre este caso, e completar a folha GERADA (`pnpm brand-theme`) é o que a
 * guarda de drift existe para impedir.
 *
 * **As quatro severidades de tom também são do wrapper agora, e por AA.** O que
 * o Lara pinta é branco sobre saturado: `Vigente` mediu **2,28:1** e as tags de
 * curso **2,77:1**, a 12px/700 — e 12px bold não é "texto grande" para a WCAG (o
 * corte é 18,66px), então a régua é 4,5:1 e as duas reprovam (D-20 do review de
 * 2026-08-17). A correção não inventa mecânica: é o `ACCENT` logo acima, que é a
 * mesma tese que o passe do Dashboard fixou — cor de sinal em fundo e traço,
 * texto em contraste cheio. `secondary` fica de fora porque mede 8,4:1 e já
 * passava.
 */
export function AppTag({ tone, style, ...props }: AppTagProps) {
  const toneStyle =
    tone === 'accent'
      ? ACCENT
      : props.severity === 'secondary'
        ? NEUTRO
        : props.severity
          ? TOM[props.severity]
          : undefined

  return <Tag {...props} style={{ ...toneStyle, ...style }} />
}
