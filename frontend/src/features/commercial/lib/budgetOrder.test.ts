import { describe, expect, it } from 'vitest'
import type { BudgetData, QuoteStatus } from '@shared/types/generated'
import { newestFirst, sortBudgetsBy } from './budgetOrder'

const comEstado = (status: QuoteStatus | undefined) =>
  ({ status, quotes: [] }) as unknown as Pick<BudgetData, 'status' | 'quotes'>

const comCotacoes = (n: number) =>
  ({ status: undefined, quotes: Array.from({ length: n }, () => ({})) }) as unknown as Pick<BudgetData, 'status' | 'quotes'>

describe('newestFirst', () => {
  it('ordena pelo número do id, não pelo texto, e não muta a entrada', () => {
    const entrada = [{ id: 5 }, { id: 1000 }, { id: 999 }]

    expect(newestFirst(entrada).map((r) => r.id)).toEqual([1000, 999, 5])
    expect(entrada.map((r) => r.id)).toEqual([5, 1000, 999])
  })

  it('manda a linha sem id para o fim', () => {
    expect(newestFirst([{ id: undefined }, { id: 3 }, { id: 7 }]).map((r) => r.id)).toEqual([7, 3, undefined])
  })
})

describe('sortBudgetsBy', () => {
  const entrada = [comEstado('rejected'), comEstado(undefined), comEstado('pending'), comEstado('approved')]
  const estados = (rows: ReturnType<typeof comEstado>[]) => rows.map((r) => r.status)

  it('estado crescente: Pendiente, Aprobada, Rechazada, sem estado no fim', () => {
    expect(estados(sortBudgetsBy(entrada, 'status', 1))).toEqual(['pending', 'approved', 'rejected', undefined])
  })

  it('estado decrescente inverte os três e mantém o sem estado no fim', () => {
    expect(estados(sortBudgetsBy(entrada, 'status', -1))).toEqual(['rejected', 'approved', 'pending', undefined])
  })

  it('não muta a entrada', () => {
    const copia = [...entrada]
    sortBudgetsBy(entrada, 'status', 1)

    expect(entrada).toEqual(copia)
  })

  it('cotizaciones ordena pela quantidade de cotações nos dois sentidos', () => {
    const rows = [comCotacoes(2), comCotacoes(0), comCotacoes(1)]

    expect(sortBudgetsBy(rows, 'quoteCount', 1).map((r) => r.quotes.length)).toEqual([0, 1, 2])
    expect(sortBudgetsBy(rows, 'quoteCount', -1).map((r) => r.quotes.length)).toEqual([2, 1, 0])
  })
})
