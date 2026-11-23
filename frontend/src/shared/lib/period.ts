/** Janela de datas `yyyy-mm-dd`, limites inclusivos. É o formato que o
 * `AppDatePicker` emite e que o backend aceita em `period_start`/`period_end`. */
export type Period = { start: string; end: string }

/** `Date` -> `yyyy-mm-dd` pelos componentes LOCAIS. Nunca `toISOString()`: o
 * Chile é UTC-3/-4 e a meia-noite local vira o dia ANTERIOR em UTC. */
export function toLocalIsoDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dia}`
}

/**
 * Período do calendário corrente, do primeiro dia da semana/mês/ano até HOJE.
 * A semana começa na segunda-feira. `today` é parâmetro, não `new Date()`
 * interno: quem lê o relógio sozinho não se testa e quebra na virada do período.
 */
export function currentCalendarPeriod(kind: 'week' | 'month' | 'year', today: Date): Period {
  let start: Date
  if (kind === 'week') {
    // getDay(): domingo=0 ... sábado=6. Recuo até a segunda (domingo recua 6).
    const recuo = (today.getDay() + 6) % 7
    start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - recuo)
  } else if (kind === 'month') {
    start = new Date(today.getFullYear(), today.getMonth(), 1)
  } else {
    start = new Date(today.getFullYear(), 0, 1)
  }
  return { start: toLocalIsoDate(start), end: toLocalIsoDate(today) }
}

/**
 * O instante ISO cai dentro do período? Compara o DIA LOCAL do instante, não o
 * dia em UTC: 23:30 de 22/11 em Santiago é 02:30Z do dia 23, e pertence ao 22.
 * `null` é "sem recorte" e aceita tudo. Strings `yyyy-mm-dd` comparam
 * lexicograficamente.
 */
export function isWithinPeriod(instant: string, period: Period | null): boolean {
  if (period === null) return true
  const dia = toLocalIsoDate(new Date(instant))
  return dia >= period.start && dia <= period.end
}
