import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { createWrapper } from '@shared/testing/providers'
import type { TurmaData } from '@shared/types/generated'
import { useTurmaConfigForm } from './useTurmaConfigForm'

vi.mock('react-i18next', async (importOriginal) => {
  const { mockUseTranslation } = await import('@shared/testing/i18n')
  return {
    ...(await importOriginal<typeof import('react-i18next')>()),
    useTranslation: mockUseTranslation(),
  }
})

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock('@shared/ui', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@shared/ui')>()),
  useToast: () => toast,
}))

type Ok = (t: { id: number }) => void
vi.mock('../api/useTurmas', () => ({
  useCreateTurma: () => ({
    mutate: (_v: unknown, o?: { onSuccess?: Ok }) => o?.onSuccess?.({ id: 7 }), isPending: false, error: null,
  }),
  useUpdateTurma: () => ({
    mutate: (_v: unknown, o?: { onSuccess?: Ok }) => o?.onSuccess?.({ id: 3 }), isPending: false, error: null,
  }),
}))
vi.mock('@shared/api/coursesApi', () => ({ coursesApi: { useList: () => ({ data: [] }) } }))

const { wrapper } = createWrapper()
const TURMA = {
  id: 3, course_id: 9, modalidade: 'presencial', local_aplicacao: 'Santiago',
  start_date: '2026-01-05', end_date: '2026-02-05',
} as TurmaData

beforeEach(() => toast.success.mockClear())

describe('useTurmaConfigForm — sucesso dito (C-5)', () => {
  it('salvar em edição diz "actualizado" e entrega o id', () => {
    const onSaved = vi.fn()
    const { result } = renderHook(() => useTurmaConfigForm({ mode: 'edit', turma: TURMA, onSaved }), { wrapper })

    act(() => result.current.submit())

    expect(toast.success).toHaveBeenCalledWith('common.updatedToast')
    expect(onSaved).toHaveBeenCalledWith(3)
  })

  it('a criação navega ao detalhe e não diz nada aqui', () => {
    const onSaved = vi.fn()
    const { result } = renderHook(
      () => useTurmaConfigForm({ mode: 'create', turma: null, quoteId: 1, onSaved }), { wrapper },
    )

    act(() => result.current.submit())

    expect(onSaved).toHaveBeenCalledWith(7)
    expect(toast.success).not.toHaveBeenCalled()
  })

  it('onSaved que lança não diz sucesso', () => {
    const { result } = renderHook(
      () => useTurmaConfigForm({ mode: 'edit', turma: TURMA, onSaved: () => { throw new Error('x') } }), { wrapper },
    )

    expect(() => act(() => result.current.submit())).toThrow('x')
    expect(toast.success).not.toHaveBeenCalled()
  })
})
