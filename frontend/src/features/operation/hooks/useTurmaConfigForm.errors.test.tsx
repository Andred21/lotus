import { describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { createWrapper } from '@shared/testing/providers'
import { useTurmaConfigForm } from './useTurmaConfigForm'

const falha = vi.hoisted(() => ({ erro: null as unknown }))

vi.mock('../api/useTurmas', () => ({
  useCreateTurma: () => ({ mutate: vi.fn(), isPending: false, error: falha.erro }),
  useUpdateTurma: () => ({ mutate: vi.fn(), isPending: false, error: null }),
}))
vi.mock('@shared/api/coursesApi', () => ({ coursesApi: { useList: () => ({ data: [] }) } }))

const { wrapper } = createWrapper()

describe('useTurmaConfigForm — erro 422 some ao corrigir', () => {
  it('editar o campo limpa o erro dele e só dele', () => {
    falha.erro = {
      type: 'x', title: 'x', status: 422, detail: '', instance: '/x',
      errors: { start_date: ['obrigatória'], end_date: ['anterior ao início'] },
    }
    const { result } = renderHook(
      () => useTurmaConfigForm({ mode: 'create', turma: null, quoteId: 3, onSaved: () => {} }),
      { wrapper },
    )
    expect(result.current.fieldErrors?.start_date).toEqual(['obrigatória'])

    act(() => result.current.set('start_date', '2026-12-01'))

    expect(result.current.fieldErrors?.start_date).toBeUndefined()
    expect(result.current.fieldErrors?.end_date).toEqual(['anterior ao início'])
    falha.erro = null
  })
})
