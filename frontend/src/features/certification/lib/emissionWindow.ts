/** O MESMO 12 de `EmissionPanelQuery::JANELA_MESES` (backend). O dono do
 * default é o BACKEND — ele o aplica quando `period_start` não vem, no fuso
 * `America/Santiago`, que é o do negócio. Este número existe só para o seletor
 * ANUNCIAR a janela vigente ("Últimos 12 meses") enquanto o usuário não escolhe
 * data; o front não a calcula nem a manda.
 *
 * Havia aqui um `defaultConcludedSince()` que montava `YYYY-MM-DD` pelos
 * componentes LOCAIS do navegador e ia em TODO GET — o caminho default do
 * servidor nunca rodava, e máquina fora de Santiago perto da meia-noite
 * deslocava a borda em um dia, incluindo ou omitindo turma concluída
 * (Q-2 do review de 2026-08-29). Mudar este número sem mudar o do backend faz a
 * tela prometer uma janela e a API responder outra (spec D7). */
export const EMISSION_PANEL_WINDOW_MONTHS = 12

/** Os presets do período da Emisión, na ordem do dropdown. `last12` é o do
 * servidor — o único que NÃO manda parâmetro; Semana/Mes/Año são o calendário
 * corrente até hoje (`currentCalendarPeriod`) e `custom` revela as duas datas. */
export type EmissionPeriodKey = 'last12' | 'week' | 'month' | 'year' | 'custom'

export const EMISSION_PERIOD_KEYS: readonly EmissionPeriodKey[] = ['last12', 'week', 'month', 'year', 'custom']

/** Data ISO (`YYYY-MM-DD`) em `dd/mm/yy`, por fatiamento da string: sem `Date`,
 * então sem fuso para deslocar o dia. É a grafia do combo da Emisión (spec 5.1)
 * e a da planilha de certificados. */
export function shortDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-')
  return `${d}/${m}/${y.slice(2)}`
}

/** O rótulo da turma no combo: `Scap 190 - R1 · <curso> · 12/10/26`. A
 * cotação vem primeiro porque é o nome com que a Lotus chama a turma. */
export function turmaOptionLabel(turma: { quote_code: string; course_name: string; end_date: string }): string {
  return `${turma.quote_code} · ${turma.course_name} · ${shortDate(turma.end_date)}`
}
