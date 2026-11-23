import { describe, expect, it, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { createWrapper } from '@shared/testing/providers'
import type { BudgetData } from '@shared/types/generated'
import { useClientBudgets } from './useClientBudgets'

const hoje = new Date()
const hojeIso = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 12).toISOString()

const budget = (id: number, client_id: number, status: BudgetData['status'], created_at: string) =>
  ({ id, client_id, code: `Scap ${id}`, status, created_at, quotes: [] }) as unknown as BudgetData

const ORCAMENTOS = [
  budget(1, 1, 'approved', '2025-03-10T15:00:00-03:00'),
  budget(2, 1, 'pending', hojeIso),
  budget(3, 2, 'pending', hojeIso),
]

vi.mock('@shared/api/budgetsApi', () => ({
  budgetsApi: {
    useList: () => ({
      data: ORCAMENTOS, isLoading: false, isError: false, error: null, refetch: vi.fn(),
    }),
  },
}))

const { wrapper } = createWrapper()

describe('useClientBudgets', () => {
  it('padrão: todos os orçamentos do cliente, sem recorte de período', () => {
    const { result } = renderHook(() => useClientBudgets(1), { wrapper })
    expect(result.current.preset).toBe('all')
    // Mais novo primeiro (id maior), como a aba Presupuestos.
    expect(result.current.rows.map((b) => b.id)).toEqual([2, 1])
  })

  it('o preset de ano deixa só os criados no ano corrente', () => {
    const { result } = renderHook(() => useClientBudgets(1), { wrapper })
    act(() => result.current.setPreset('year'))
    expect(result.current.rows.map((b) => b.id)).toEqual([2])
  })

  it('o filtro de estado recorta pelo status do orçamento', () => {
    const { result } = renderHook(() => useClientBudgets(1), { wrapper })
    act(() => { result.current.setPreset('all'); result.current.setStatus('approved') })
    expect(result.current.rows.map((b) => b.id)).toEqual([1])
  })

  it('a busca casa o código do orçamento', () => {
    const { result } = renderHook(() => useClientBudgets(1), { wrapper })
    act(() => result.current.setSearch('Scap 1'))
    expect(result.current.rows.map((b) => b.id)).toEqual([1])
  })

  it('o preset personalizado usa o período escolhido', () => {
    const { result } = renderHook(() => useClientBudgets(1), { wrapper })
    act(() => {
      result.current.setPreset('custom')
      result.current.setPeriod({ start: '2025-01-01', end: '2025-12-31' })
    })
    expect(result.current.rows.map((b) => b.id)).toEqual([1])
  })

  it('limpar devolve busca, estado e período ao padrão', () => {
    const { result } = renderHook(() => useClientBudgets(1), { wrapper })
    act(() => { result.current.setSearch('x'); result.current.setStatus('approved'); result.current.setPreset('week') })
    act(() => result.current.clear())
    expect(result.current.rows.map((b) => b.id)).toEqual([2, 1])
    expect(result.current.preset).toBe('all')
  })

  it('sem cliente, não há linhas', () => {
    const { result } = renderHook(() => useClientBudgets(null), { wrapper })
    expect(result.current.rows).toEqual([])
  })
})
