import { dangerText, infoText, successText, warningText } from '../../styles/tokens'

export type SeverityToneName = 'success' | 'info' | 'warning' | 'danger'

/** Hue por severidade. Os palette vars do Lara NÃO invertem entre temas, então o
 * fundo tingido é composto com `--surface-card` (que inverte) via color-mix — a
 * mesma mecânica do `AppCard`. A TINTA, essa, vem de `--tone-*-ink`, que troca o
 * degrau da rampa por tema e já é o que o corpo do produto usa para texto de
 * severidade. Dois donos: a tag (`AppTag`) e o ícone da confirmação compacta
 * (`ConfirmDialog`, bloco 43); a régua UI-04 de `tone-ink.test.ts` mede os 15%. */
export const severityTone: Record<SeverityToneName, { background: string; color: string }> = {
  success: { background: 'color-mix(in srgb, var(--green-500) 15%, var(--surface-card))', color: successText },
  info: { background: 'color-mix(in srgb, var(--blue-500) 15%, var(--surface-card))', color: infoText },
  warning: { background: 'color-mix(in srgb, var(--yellow-500) 15%, var(--surface-card))', color: warningText },
  danger: { background: 'color-mix(in srgb, var(--red-500) 15%, var(--surface-card))', color: dangerText },
}
