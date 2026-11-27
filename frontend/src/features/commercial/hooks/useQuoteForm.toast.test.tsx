import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { createWrapper } from '@shared/testing/providers'
import type { QuoteData } from '@shared/types/generated'
import { useQuoteForm } from './useQuoteForm'

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

vi.mock('../api/useQuotes', () => ({
  useCreateQuote: () => ({
    mutate: (_v: unknown, o?: { onSuccess?: () => void }) => o?.onSuccess?.(), isPending: false, error: null,
  }),
  useUpdateQuote: () => ({
    mutate: (_v: unknown, o?: { onSuccess?: () => void }) => o?.onSuccess?.(), isPending: false, error: null,
  }),
}))

const { wrapper } = createWrapper()
const QUOTE = {
  id: 2, course_id: 5, student_count: 3, value_uf: '10.0000', purchase_order: null,
  planned_start_date: null, planned_end_date: null,
} as unknown as QuoteData

beforeEach(() => toast.success.mockClear())

describe('useQuoteForm — sucesso dito (C-5)', () => {
  it('criar diz "creado" e fecha', () => {
    const onDone = vi.fn()
    const { result } = renderHook(() => useQuoteForm(1, null, onDone), { wrapper })

    act(() => result.current.submit())

    expect(toast.success).toHaveBeenCalledWith('common.createdToast')
    expect(onDone).toHaveBeenCalledTimes(1)
  })

  it('editar diz "actualizado" e fecha', () => {
    const onDone = vi.fn()
    const { result } = renderHook(() => useQuoteForm(1, QUOTE, onDone), { wrapper })

    act(() => result.current.submit())

    expect(toast.success).toHaveBeenCalledWith('common.updatedToast')
    expect(onDone).toHaveBeenCalledTimes(1)
  })
})
