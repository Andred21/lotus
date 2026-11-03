import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { renderWithProviders } from '@shared/testing/providers'
import { registerPrimeLocales } from '@shared/config/primeLocale'
import type { QuoteData } from '@shared/types/generated'
import { QuoteWizard } from './QuoteWizard'

vi.mock('react-i18next', async (importOriginal) => {
  const { mockUseTranslation } = await import('@shared/testing/i18n')
  return {
    ...(await importOriginal<typeof import('react-i18next')>()),
    useTranslation: mockUseTranslation(),
  }
})

const atualiza = vi.hoisted(() => vi.fn())

vi.mock('../../api/useQuotes', () => ({
  useCreateQuote: () => ({ mutate: vi.fn(), isPending: false, error: null }),
  useUpdateQuote: () => ({ mutate: atualiza, isPending: false, error: null }),
}))

const CURSOS = [
  { id: 7, name: 'Alta tensión', workload_hours: 8 },
  { id: 9, name: 'Baja tensión', workload_hours: 4 },
]
vi.mock('../../hooks/useQuoteCourseSearch', () => ({
  useQuoteCourseSearch: () => ({
    data: CURSOS, list: CURSOS, search: '', setSearch: () => {}, isLoading: false, isError: false,
    errorDetail: undefined, errorHint: '', loadError: null, refetch: () => Promise.resolve(),
    isEmpty: false, unusable: false, failedWithoutData: false, noResults: false,
  }),
}))

const COTACAO = {
  id: 3, course_id: 7, status: 'approved', turma_status: 'em_andamento', student_count: 12,
  value_uf: '450.5000', purchase_order: 'OC-99', planned_start_date: '2026-11-03', planned_end_date: '2026-11-20',
} as unknown as QuoteData

const montar = (onlyUf: boolean) =>
  renderWithProviders(<QuoteWizard visible budgetId={1} quote={COTACAO} onlyUf={onlyUf} onHide={() => {}} />)

const ROTULOS = ['quote.students', 'quote.purchaseOrder', 'quote.plannedStart', 'quote.plannedEnd']

// O `AppDatePicker` resolve o locale do Prime registrado no boot (`main.tsx`).
beforeAll(registerPrimeLocales)
beforeEach(() => atualiza.mockReset())

describe('QuoteWizard — cotação aprovada com turma (onlyUf)', () => {
  it('só o value_uf é editável: os outros quatro viram texto de leitura', () => {
    montar(true)

    expect((screen.getByLabelText('quote.valueUf') as HTMLInputElement).disabled).toBe(false)
    ROTULOS.forEach((r) => expect(screen.queryByLabelText(r)).toBeNull())
    // O valor gravado segue visível, em texto: input cinza truncaria dado de contrato.
    ;['12', 'OC-99', '2026-11-03', '2026-11-20'].forEach((v) => expect(screen.getByText(v)).toBeTruthy())
  })

  it('o curso não é alcançável: sem Voltar e sem seletor, e o envio leva o curso gravado', () => {
    montar(true)

    expect(screen.queryByRole('button', { name: 'quote.back' })).toBeNull()
    expect(screen.queryAllByRole('radio')).toHaveLength(0)

    fireEvent.change(screen.getByLabelText('quote.valueUf'), { target: { value: '500,25' } })
    fireEvent.click(screen.getByRole('button', { name: 'common.save' }))

    expect(atualiza).toHaveBeenCalledTimes(1)
    expect(atualiza.mock.calls[0][0]).toEqual({
      quoteId: 3,
      payload: {
        course_id: 7, student_count: 12, value_uf: '500.25', purchase_order: 'OC-99',
        planned_start_date: '2026-11-03', planned_end_date: '2026-11-20',
      },
    })
  })
})

describe('QuoteWizard — sem onlyUf', () => {
  it('os cinco campos seguem editáveis e dá para voltar ao curso', () => {
    montar(false)

    ;[...ROTULOS, 'quote.valueUf'].forEach((r) => expect((screen.getByLabelText(r) as HTMLInputElement).disabled).toBe(false))
    expect(screen.getByRole('button', { name: 'quote.back' })).toBeTruthy()
  })
})
