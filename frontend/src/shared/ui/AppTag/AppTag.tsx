import { Tag } from 'primereact/tag'
import type { TagProps } from 'primereact/tag'

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

const ACCENT = {
  background: 'color-mix(in srgb, var(--purple-500) 15%, var(--surface-card))',
  color: 'color-mix(in srgb, var(--purple-500) 70%, var(--text-color))',
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
 */
export function AppTag({ tone, style, ...props }: AppTagProps) {
  const toneStyle =
    tone === 'accent' ? ACCENT : props.severity === 'secondary' ? NEUTRO : undefined

  return <Tag {...props} style={{ ...toneStyle, ...style }} />
}
