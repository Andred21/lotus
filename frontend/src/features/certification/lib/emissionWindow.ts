/** O MESMO 12 de `EmissionPanelQuery::JANELA_MESES` (backend). O dono é o
 * backend — é ele que decide o default quando o parâmetro não vem; este
 * existe para o seletor de data mostrar o default antes do primeiro GET e para
 * "limpar" o seletor voltar a ele. Mudar um sem o outro faz a tela prometer
 * uma janela e a API responder outra (spec D7; desvio 4 do plano). */
export const EMISSION_PANEL_WINDOW_MONTHS = 12

/** Hoje menos a janela, em `YYYY-MM-DD` pelos componentes LOCAIS — a mesma
 * regra anti-fuso do `AppDatePicker`. */
export function defaultConcludedSince(hoje: Date = new Date()): string {
  const d = new Date(hoje.getFullYear(), hoje.getMonth() - EMISSION_PANEL_WINDOW_MONTHS, hoje.getDate())
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
