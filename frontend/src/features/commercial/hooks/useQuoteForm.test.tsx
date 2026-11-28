import { describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { createWrapper } from '@shared/testing/providers'
import { useQuoteForm } from './useQuoteForm'
import type { QuoteData } from '@shared/types/generated'

const falha = vi.hoisted(() => ({ erro: null as unknown }))
const atualizar = vi.hoisted(() => vi.fn())

vi.mock('../api/useQuotes', () => ({
  useCreateQuote: () => ({ mutate: vi.fn(), isPending: false, error: falha.erro }),
  useUpdateQuote: () => ({ mutate: atualizar, isPending: false, error: null }),
}))

const { wrapper } = createWrapper()

describe('useQuoteForm — erro 422 some ao corrigir', () => {
  it('editar o campo limpa o erro dele e só dele', () => {
    falha.erro = {
      type: 'x', title: 'x', status: 422, detail: '', instance: '/x',
      errors: { student_count: ['mínimo 1'], value_uf: ['inválido'] },
    }
    const { result } = renderHook(() => useQuoteForm(1, null, () => {}), { wrapper })
    expect(result.current.fieldErrors?.student_count).toEqual(['mínimo 1'])

    act(() => result.current.set('student_count', 3))

    expect(result.current.fieldErrors?.student_count).toBeUndefined()
    expect(result.current.fieldErrors?.value_uf).toEqual(['inválido'])
    falha.erro = null
  })
})

describe('useQuoteForm — UF em edição', () => {
  it('valor de milhar não vira decimal: campo e payload ficam "1234"', () => {
    const quote = { id: 7, course_id: 2, student_count: 3, value_uf: '1234.0000' } as QuoteData
    const { result } = renderHook(() => useQuoteForm(1, quote, () => {}), { wrapper })

    expect(result.current.form.value_uf).toBe('1234')
    act(() => result.current.submit())

    expect(atualizar.mock.calls[0][0].payload.value_uf).toBe('1234')
  })
})

describe('useQuoteForm — entrada de UF ambígua (Q-2 do bloco 66)', () => {
  it('"1,500" vira erro no campo e não chega ao payload', () => {
    atualizar.mockClear()
    const quote = { id: 7, course_id: 2, student_count: 3, value_uf: '10.0000' } as QuoteData
    const { result } = renderHook(() => useQuoteForm(1, quote, () => {}), { wrapper })

    act(() => result.current.setValueUf('1,500'))

    expect(result.current.fieldErrors?.value_uf).toHaveLength(1)
    act(() => result.current.submit())
    expect(atualizar).not.toHaveBeenCalled()
  })

  it('corrigir para uma forma não ambígua limpa o erro e envia o valor', () => {
    atualizar.mockClear()
    const quote = { id: 7, course_id: 2, student_count: 3, value_uf: '10.0000' } as QuoteData
    const { result } = renderHook(() => useQuoteForm(1, quote, () => {}), { wrapper })

    act(() => result.current.setValueUf('1,500'))
    act(() => result.current.setValueUf('1500'))

    expect(result.current.fieldErrors?.value_uf).toBeUndefined()
    act(() => result.current.submit())
    expect(atualizar.mock.calls[0][0].payload.value_uf).toBe('1500')
  })
})
