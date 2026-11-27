import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { createWrapper } from '@shared/testing/providers'
import type { QuoteData } from '@shared/types/generated'
import { useBudgetDetail } from './useBudgetDetail'

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

const query = { data: { id: 5, client_id: 1, code: 'Scap 5', quotes: [] }, isLoading: false, isError: false, error: null, refetch: vi.fn() }
const sucesso = () => ({
  mutate: (_id: number, o?: { onSuccess?: () => void }) => o?.onSuccess?.(),
  isPending: false,
  error: null,
  reset: vi.fn(),
})

vi.mock('@shared/api/budgetsApi', () => ({
  budgetsApi: { useOne: () => query, useRemove: () => sucesso() },
}))
vi.mock('@shared/api/clientsApi', () => ({
  clientsApi: { useList: () => ({ ...query, data: [] }) },
}))
vi.mock('../api/useQuotes', () => ({
  useApproveQuote: () => sucesso(),
  useRejectQuote: () => sucesso(),
  useRemoveQuote: () => sucesso(),
}))
vi.mock('../api/useCommercialFiles', () => ({
  useRemoveBudgetFile: () => ({ mutate: vi.fn(), isPending: false, error: null, reset: vi.fn() }),
}))

const quote = { id: 9, code: 'Scap 5-1' } as QuoteData
const { wrapper } = createWrapper({ route: '/comercial/presupuestos/5' })

describe('useBudgetDetail — sucesso dito (C-5)', () => {
  beforeEach(() => toast.success.mockClear())

  it('aprovar e rejeitar cotização mostram toast', () => {
    const { result } = renderHook(() => useBudgetDetail(5), { wrapper })

    act(() => result.current.askConfirm('approve', quote))
    act(() => result.current.runConfirm())
    expect(toast.success).toHaveBeenLastCalledWith('quote.approvedToast')
    expect(result.current.confirm).toBeNull()

    act(() => result.current.askConfirm('reject', quote))
    act(() => result.current.runConfirm())
    expect(toast.success).toHaveBeenLastCalledWith('quote.rejectedToast')
    expect(toast.success).toHaveBeenCalledTimes(2)
  })

  it('remover cotização mostra toast', () => {
    const { result } = renderHook(() => useBudgetDetail(5), { wrapper })

    act(() => result.current.askConfirm('remove', quote))
    act(() => result.current.runConfirm())

    expect(toast.success).toHaveBeenLastCalledWith('quote.deletedToast')
  })

  it('arquivar o orçamento mostra o toast de arquivado', () => {
    const { result } = renderHook(() => useBudgetDetail(5), { wrapper })

    act(() => result.current.deleteBudget())

    expect(toast.success).toHaveBeenLastCalledWith('archive.archivedToast')
  })
})
