import { beforeAll, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'
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

// A atualização "dá certo" na hora: o que se prova é o que o wizard faz DEPOIS.
vi.mock('../../api/useQuotes', () => ({
  useCreateQuote: () => ({ mutate: vi.fn(), isPending: false, error: null }),
  useUpdateQuote: () => ({
    mutate: (_vars: unknown, opts?: { onSuccess?: () => void }) => opts?.onSuccess?.(),
    isPending: false,
    error: null,
  }),
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
  id: 3, course_id: 7, status: 'draft', turma_status: null, student_count: 12,
  value_uf: '450.5000', purchase_order: 'OC-99', planned_start_date: '2026-11-03', planned_end_date: '2026-11-20',
} as unknown as QuoteData

const montar = (quote: QuoteData | null, onHide = vi.fn()) => {
  renderWithProviders(
    <QuoteWizard visible budgetId={1} quote={quote} onlyUf={false} onHide={onHide} />,
    { route: '/presupuestos/1' },
  )
  return onHide
}

const perguntou = () => screen.queryByText('common.discardTitle') !== null
const cancelar = () => fireEvent.click(screen.getByRole('button', { name: 'common.cancel' }))
const mudarValor = (v: string) => fireEvent.change(screen.getByLabelText('quote.valueUf'), { target: { value: v } })

beforeAll(registerPrimeLocales)

describe('QuoteWizard — guarda de rascunho', () => {
  it('Cancelar sem mudança não pergunta', () => {
    const onHide = montar(COTACAO)

    cancelar()

    expect(onHide).toHaveBeenCalledTimes(1)
    expect(perguntou()).toBe(false)
  })

  it('wizard com mudança pergunta no Cancelar, e Descartar fecha', async () => {
    const onHide = montar(COTACAO)
    mudarValor('999')

    cancelar()

    await waitFor(() => expect(perguntou()).toBe(true))
    expect(onHide).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'common.discardConfirm' }))
    expect(onHide).toHaveBeenCalledTimes(1)
  })

  it('o X do diálogo também pergunta', async () => {
    const onHide = montar(COTACAO)
    mudarValor('999')

    fireEvent.click(screen.getByRole('button', { name: 'common.close' }))

    await waitFor(() => expect(perguntou()).toBe(true))
    expect(onHide).not.toHaveBeenCalled()
  })

  it('desfazer a mudança à mão volta a não perguntar', () => {
    const onHide = montar(COTACAO)

    mudarValor('999')
    mudarValor('450,5')
    cancelar()

    expect(onHide).toHaveBeenCalledTimes(1)
    expect(perguntou()).toBe(false)
  })

  it('no create, escolher o curso já é rascunho', async () => {
    const onHide = montar(null)
    fireEvent.click(screen.getAllByRole('radio')[0])

    cancelar()

    await waitFor(() => expect(perguntou()).toBe(true))
    expect(onHide).not.toHaveBeenCalled()
  })

  it('salvar com sucesso fecha sem perguntar', () => {
    const onHide = montar(COTACAO)
    mudarValor('999')

    fireEvent.click(screen.getByRole('button', { name: 'common.save' }))

    expect(onHide).toHaveBeenCalledTimes(1)
    expect(perguntou()).toBe(false)
  })
})
