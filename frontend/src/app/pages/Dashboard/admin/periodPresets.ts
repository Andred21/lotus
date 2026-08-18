import type { DashboardPeriod } from '../useDashboard'

export type PeriodPresetKey = 'last12' | 'last6' | 'currentYear' | 'custom'

/** A ordem do dropdown: o mais frequente primeiro, "Personalizado" por último
 * porque é o que revela dois campos a mais. */
export const PERIOD_PRESETS: readonly PeriodPresetKey[] = ['last12', 'last6', 'currentYear', 'custom']

/** O default da tela. Espelha `DEFAULT_MONTHS = 12` do
 * `DashboardFilterData.php:24`: a primeira carga precisa pedir a MESMA janela
 * que o servidor resolveria sozinho. */
export const PERIOD_PRESET_PADRAO: PeriodPresetKey = 'last12'

/** `Date` -> `YYYY-MM-DD` pelos componentes LOCAIS. Nunca `toISOString()`:
 * o Chile é UTC-3/-4 e a meia-noite local vira o dia ANTERIOR em UTC. Mesma
 * razão do `dateToIso` do `AppDatePicker`. */
function iso(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dia}`
}

/** Recua `meses` preservando o dia, e ancorando no ÚLTIMO dia do mês quando o
 * dia não existe lá. `setMonth` sozinho estoura para o mês seguinte — 31 de
 * agosto menos 6 viraria 3 de março —, e a janela ganharia dias que o rótulo
 * não promete. */
function mesesAtras(base: Date, meses: number): Date {
  const alvo = new Date(base.getFullYear(), base.getMonth() - meses, 1)
  const ultimoDia = new Date(alvo.getFullYear(), alvo.getMonth() + 1, 0).getDate()
  alvo.setDate(Math.min(base.getDate(), ultimoDia))
  return alvo
}

/**
 * Janela de um preset. `hoje` é PARÂMETRO e não `new Date()` interno: preset
 * que lê o relógio sozinho não se testa e quebra na virada do mês.
 *
 * `custom` devolve `null` porque não é uma janela — é o modo em que os dois
 * `AppDatePicker` mandam (D5). Dois campos e não um range: o wrapper é de data
 * única (`AppDatePicker.tsx:6`) e o backend trata os limites como
 * independentes.
 */
export function periodoDoPreset(preset: PeriodPresetKey, hoje: Date): DashboardPeriod | null {
  if (preset === 'custom') return null
  if (preset === 'currentYear') {
    return { start: iso(new Date(hoje.getFullYear(), 0, 1)), end: iso(hoje) }
  }
  return { start: iso(mesesAtras(hoje, preset === 'last12' ? 12 : 6)), end: iso(hoje) }
}

/** A janela com que a tela abre. Existe para o call-site não precisar de `!`
 * sobre o retorno anulável: `PERIOD_PRESET_PADRAO` é tipado `PeriodPresetKey`,
 * o TS não o estreita para "não-custom", e uma asserção de não-nulo no estado
 * inicial da página seria uma promessa que só o leitor humano confere. */
export function periodoPadrao(hoje: Date): DashboardPeriod {
  return { start: iso(mesesAtras(hoje, 12)), end: iso(hoje) }
}
