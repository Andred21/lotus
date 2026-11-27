import { describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { createWrapper } from '@shared/testing/providers'
import { useQuoteForm } from './useQuoteForm'

const falha = vi.hoisted(() => ({ erro: null as unknown }))

vi.mock('../api/useQuotes', () => ({
  useCreateQuote: () => ({ mutate: vi.fn(), isPending: false, error: falha.erro }),
  useUpdateQuote: () => ({ mutate: vi.fn(), isPending: false, error: null }),
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
