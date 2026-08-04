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

  it('filtering responde por termo e por where, e é falso sem nenhum dos dois', () => {
    // Quem decide "estou filtrando?" é o hook. Duas telas reimplementavam a
    // pergunta com `status === null` e erravam o empty state.
    const semNada = renderHook(() => useTableFilter(rows, searchable))
    expect(semNada.result.current.filtering).toBe(false)

    act(() => semNada.result.current.onFilterChange('alta'))
    expect(semNada.result.current.filtering).toBe(true)

    act(() => semNada.result.current.clear())
    expect(semNada.result.current.filtering).toBe(false)

    const comWhere = renderHook(() =>
      useTableFilter(rows, searchable, (row) => row.status === 'ativo'),
    )
    expect(comWhere.result.current.filtering).toBe(true)
  })

  it('where que não corta nada não é "filtrando" — nem sobre lista vazia', () => {
    // Escopo permanente (where sempre passado, não só quando o usuário escolhe)
    // não pode nascer "filtrando para sempre": mostraria o empty state de filtro
    // sobre uma lista legitimamente vazia, que é o defeito que este bloco veio
    // corrigir, reintroduzido pela porta da frente.
    const naoCorta = renderHook(() => useTableFilter(rows, searchable, () => true))
    expect(naoCorta.result.current.filtering).toBe(false)

    const listaVazia = renderHook(() => useTableFilter([] as Row[], searchable, () => true))
    expect(listaVazia.result.current.rows).toEqual([])
    expect(listaVazia.result.current.filtering).toBe(false)

    // Mas um where que corta de verdade continua sendo filtro ativo.
    const corta = renderHook(() => useTableFilter(rows, searchable, () => false))
    expect(corta.result.current.rows).toEqual([])
    expect(corta.result.current.filtering).toBe(true)
  })
})
