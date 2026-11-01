import { describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, within } from '@testing-library/react'
import { renderWithProviders } from '@shared/testing/providers'
import { BudgetsTable, type BudgetRow } from './BudgetsTable'

vi.mock('react-i18next', async (importOriginal) => {
  const { mockUseTranslation } = await import('@shared/testing/i18n')
  return {
    ...(await importOriginal<typeof import('react-i18next')>()),
    useTranslation: mockUseTranslation(),
  }
})

// A query auxiliar de clientes: sem o mock ela bateria na API e a tabela
// entraria em erro (spec D16 do bloco que a criou), sem linha a medir.
vi.mock('../../hooks/useCommercialClients', () => ({
  useCommercialClients: () => ({
    data: [], isLoading: false, loadError: null, refetch: () => Promise.resolve(),
    client: () => null, clientName: () => '—',
  }),
}))

const ORCAMENTO = {
  id: 1, client_id: 1, code: 'ORC-1', status: undefined, total_value_uf: '10.5', total_approved_uf: '0',
  total_rejected_uf: '0', total_students: 3, quotes: [], payment_terms: null, files: [],
  archived_at: null, archived_by: null,
} as unknown as BudgetRow

const montar = (mode: 'active' | 'archived', budgets: BudgetRow[]) =>
  renderWithProviders(
    <BudgetsTable
      budgets={budgets} loading={false} mode={mode} onModeChange={() => {}}
      onRestore={() => {}} busy={false}
    />,
    { route: '/comercial' },
  )

/** Ticket 04 (spec D7): a tabela abre pelo Scap mais novo e ordena por Código,
 * Cotizaciones e Estado. O código é "Scap <id>": ordenar o texto poria o 1000
 * antes do 999. */
describe('BudgetsTable — ordenação', () => {
  const scap = (id: number, extra: Record<string, unknown> = {}) =>
    ({ ...ORCAMENTO, id, code: `Scap ${id}`, archived_at: null, archived_by: null, ...extra }) as unknown as BudgetRow
  const crescente = () => [scap(999), scap(1000), scap(5)]

  const codigos = () =>
    Array.from(document.querySelectorAll('tbody tr')).map((tr) => tr.querySelector('td')?.textContent)
  const cabecalho = (chave: string) => screen.getByRole('columnheader', { name: new RegExp(chave) })

  it('abre com o Scap mais novo no topo', () => {
    montar('active', crescente())

    expect(codigos()).toEqual(['Scap 1000', 'Scap 999', 'Scap 5'])
  })

  it('Código ordena pelo número, não pelo texto', async () => {
    montar('active', crescente())

    fireEvent.click(cabecalho('budget.code'))

    expect(codigos()).toEqual(['Scap 5', 'Scap 999', 'Scap 1000'])
  })

  it('Código segue pelo número com um filtro de estado ativo', async () => {
    const rows = [
      scap(999, { status: 'pending' }), scap(1000, { status: 'pending' }),
      scap(5, { status: 'approved' }), scap(77, { status: 'pending' }),
    ]
    montar('active', rows)

    fireEvent.click(document.querySelector('[data-pc-name="dropdown"]') as HTMLElement)
    fireEvent.click(await screen.findByText('quoteStatus.pending', { selector: 'li *, li' }))
    fireEvent.click(cabecalho('budget.code'))

    expect(codigos()).toEqual(['Scap 77', 'Scap 999', 'Scap 1000'])
  })

  it('Código segue pelo número com a busca ativa', async () => {
    montar('active', [scap(999), scap(1000), scap(5), scap(1001)])

    fireEvent.change(screen.getByPlaceholderText('budget.searchPlaceholder'), { target: { value: 'Scap 1' } })
    fireEvent.click(cabecalho('budget.code'))

    expect(codigos()).toEqual(['Scap 1000', 'Scap 1001'])
  })

  it('Estado ordena Pendiente → Aprobada → Rechazada', async () => {
    montar('active', [
      scap(1, { status: 'rejected' }), scap(2, { status: 'pending' }),
      scap(3, { status: 'approved' }), scap(4, { status: undefined }),
    ])

    fireEvent.click(cabecalho('budget.status'))
    expect(codigos()).toEqual(['Scap 2', 'Scap 3', 'Scap 1', 'Scap 4'])

    fireEvent.click(cabecalho('budget.status'))
    expect(codigos()).toEqual(['Scap 1', 'Scap 3', 'Scap 2', 'Scap 4'])
  })

  it('Código, Estado e Cotizaciones mostram a seta de ordenação', () => {
    montar('active', crescente())

    for (const chave of ['budget.code', 'budget.quoteCount', 'budget.status']) {
      expect(cabecalho(chave).getAttribute('aria-sort')).toBe('none')
    }
    expect(within(cabecalho('budget.client')).queryByRole('button')).toBeNull()
    expect(cabecalho('budget.client').getAttribute('aria-sort')).toBeNull()
  })

  it('a visão de arquivados segue ordenando', async () => {
    montar('archived', crescente().map((r) => ({ ...r, archived_at: '2026-09-01T10:00:00Z', archived_by: 'Admin' }) as BudgetRow))

    expect(codigos()).toEqual(['Scap 1000', 'Scap 999', 'Scap 5'])
    fireEvent.click(cabecalho('budget.code'))

    expect(codigos()).toEqual(['Scap 5', 'Scap 999', 'Scap 1000'])
  })
})
