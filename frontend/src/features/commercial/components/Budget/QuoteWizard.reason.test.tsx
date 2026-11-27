import { beforeAll, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { renderWithProviders } from '@shared/testing/providers'
import { registerPrimeLocales } from '@shared/config/primeLocale'
import { QuoteWizard } from './QuoteWizard'

vi.mock('react-i18next', async (importOriginal) => {
  const { mockUseTranslation } = await import('@shared/testing/i18n')
  return {
    ...(await importOriginal<typeof import('react-i18next')>()),
    useTranslation: mockUseTranslation(),
  }
})

vi.mock('../../api/useQuotes', () => ({
  useCreateQuote: () => ({ mutate: vi.fn(), isPending: false, error: null }),
  useUpdateQuote: () => ({ mutate: vi.fn(), isPending: false, error: null }),
}))

const CURSOS = [{ id: 7, name: 'Alta tensión', workload_hours: 8 }]
vi.mock('../../hooks/useQuoteCourseSearch', () => ({
  useQuoteCourseSearch: () => ({
    data: CURSOS, list: CURSOS, search: '', setSearch: () => {}, isLoading: false, isError: false,
    errorDetail: undefined, errorHint: '', loadError: null, refetch: () => Promise.resolve(),
    isEmpty: false, unusable: false, failedWithoutData: false, noResults: false,
  }),
}))

beforeAll(registerPrimeLocales)

const montar = () =>
  renderWithProviders(<QuoteWizard visible budgetId={1} quote={null} onlyUf={false} onHide={() => {}} />, {
    route: '/presupuestos/1',
  })

describe('QuoteWizard — motivo do Siguiente desabilitado', () => {
  it('Siguiente sem curso escolhido mostra o motivo visível', () => {
    montar()

    expect((screen.getByRole('button', { name: 'quote.next' }) as HTMLButtonElement).disabled).toBe(true)
    const motivo = screen.getByText('quote.nextNeedsCourse')
    expect(motivo.className).not.toContain('sr-only')
  })

  it('o motivo some quando o curso é escolhido', () => {
    montar()

    fireEvent.click(screen.getByText('Alta tensión'))

    expect((screen.getByRole('button', { name: 'quote.next' }) as HTMLButtonElement).disabled).toBe(false)
    expect(screen.queryByText('quote.nextNeedsCourse')).toBeNull()
  })
})
