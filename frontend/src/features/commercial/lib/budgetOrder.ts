import type { BudgetData, QuoteStatus } from '@shared/types/generated'

/** Posição do estado na ordem do negócio. Ordenar o texto traduzido daria
 * Aprobada < Pendiente < Rechazada em es-CL e outra ordem em en/pt-BR. */
const STATUS_POSITION: Record<QuoteStatus, number> = { pending: 0, approved: 1, rejected: 2 }

/**
 * Ordem da tabela de Presupuestos. O `id` é o número do Scap, então o mais novo
 * é o de `id` maior; compará-lo como número, e não o `code` como texto, é o que
 * põe "Scap 1000" antes de "Scap 999". Linha sem `id` vai para o fim. Devolve
 * cópia — a lista da query não é tocada.
 */
export function newestFirst<T extends { id?: number }>(rows: readonly T[]): T[] {
  return [...rows].sort((a, b) => {
    if (a.id === undefined || b.id === undefined) return Number(a.id === undefined) - Number(b.id === undefined)

    return b.id - a.id
  })
}

/**
 * Ordenação das colunas Estado e Cotizaciones. O Estado segue a ordem do
 * negócio (`pending` < `approved` < `rejected`), decisão do João em 2026-11-01;
 * orçamento sem estado fica no fim nos dois sentidos — inverter `order` não o
 * traz para o topo. Devolve cópia.
 */
export function sortBudgetsBy<T extends Pick<BudgetData, 'status' | 'quotes'>>(
  rows: readonly T[],
  key: 'status' | 'quoteCount',
  order: 1 | -1,
): T[] {
  return [...rows].sort((a, b) => {
    if (key === 'quoteCount') return (a.quotes.length - b.quotes.length) * order
    if (a.status === undefined || b.status === undefined) return Number(a.status === undefined) - Number(b.status === undefined)

    return (STATUS_POSITION[a.status] - STATUS_POSITION[b.status]) * order
  })
}

/**
 * Props de coluna ordenável para a `BudgetsTable`. O `sortField` existe porque
 * a coluna não tem `field` de verdade (o valor é derivado) e o DataTable só
 * dispara o `sortFunction` de uma coluna que tem campo de ordenação.
 */
export function budgetSortProps(key: 'status' | 'quoteCount') {
  return {
    sortable: true,
    sortField: key,
    sortFunction: (e: { data: BudgetData[]; order?: number | null }) =>
      sortBudgetsBy(e.data, key, e.order === -1 ? -1 : 1),
  }
}
