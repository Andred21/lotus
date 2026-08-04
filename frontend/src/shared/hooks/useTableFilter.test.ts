import { describe, expect, it } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useTableFilter } from './useTableFilter'

interface Row {
  id: number
  name: string
  code: string | null
  status: 'ativo' | 'inativo'
}

const rows: Row[] = [
  { id: 1, name: 'Alta Tensão', code: 'AT-1', status: 'ativo' },
  { id: 2, name: 'Baixa Tensão', code: null, status: 'inativo' },
  { id: 3, name: 'Subestações', code: 'SUB-9', status: 'ativo' },
]

const searchable = (row: Row) => [row.name, row.code]

describe('useTableFilter', () => {
  it('sem searchable, digitar não filtra nada', () => {
    // A aba Alumnos depende disto: tem estado de página e clamp, não tem busca.
    const { result } = renderHook(() => useTableFilter(rows))

    act(() => result.current.onFilterChange('alta'))

    expect(result.current.rows).toHaveLength(3)
    expect(result.current.filter).toBe('alta')
  })

  it('aplica where ANTES da busca', () => {
    const { result } = renderHook(() =>
      useTableFilter(rows, searchable, (row) => row.status === 'ativo'),
    )

    expect(result.current.rows.map((r) => r.id)).toEqual([1, 3])

    act(() => result.current.onFilterChange('tensão'))

    // 'Baixa Tensão' casa a busca mas foi cortada pelo where.
    expect(result.current.rows.map((r) => r.id)).toEqual([1])
  })

  it('busca é case-insensitive e ignora campo nulo sem quebrar', () => {
    const { result } = renderHook(() => useTableFilter(rows, searchable))

    act(() => result.current.onFilterChange('  ALTA  '))

    expect(result.current.term).toBe('alta')
    expect(result.current.rows.map((r) => r.id)).toEqual([1])

    act(() => result.current.onFilterChange('SUB-9'))

    // A linha 2 tem code null: não pode casar nem lançar.
    expect(result.current.rows.map((r) => r.id)).toEqual([3])
  })

  it('onFilterChange volta para a primeira página', () => {
    const { result } = renderHook(() => useTableFilter(rows, searchable))

    act(() => result.current.onPage({ first: 2 }))
    expect(result.current.first).toBe(2)

    act(() => result.current.onFilterChange('tensão'))
    expect(result.current.first).toBe(0)
  })

  it('clampa a página durante o render e não deixa a página obsoleta voltar', () => {
    // Lista encolhe (ex. deleção na última página) e depois cresce de novo sem
    // o usuário trocar de página. O clamp é do ESTADO, não só da leitura —
    // sem isso a página obsoleta reaparece.
    const { result, rerender } = renderHook(({ items }) => useTableFilter(items), {
      initialProps: { items: rows },
    })

    act(() => result.current.onPage({ first: 2 }))
    expect(result.current.first).toBe(2)

    rerender({ items: rows.slice(0, 1) })
    expect(result.current.first).toBe(0)

    rerender({ items: rows })
    expect(result.current.first).toBe(0)
  })

  it('clear() zera termo e página', () => {
    const { result } = renderHook(() => useTableFilter(rows, searchable))

    act(() => result.current.onFilterChange('alta'))
    act(() => result.current.onPage({ first: 2 }))

    act(() => result.current.clear())

    expect(result.current.filter).toBe('')
    expect(result.current.term).toBe('')
    expect(result.current.first).toBe(0)
    expect(result.current.rows).toHaveLength(3)
  })
})
