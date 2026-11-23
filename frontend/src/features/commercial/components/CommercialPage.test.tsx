import { describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '@shared/testing/providers'
import { CommercialPage } from './CommercialPage'

vi.mock('react-i18next', async (importOriginal) => {
  const { mockUseTranslation } = await import('@shared/testing/i18n')
  return {
    ...(await importOriginal<typeof import('react-i18next')>()),
    useTranslation: mockUseTranslation(),
  }
})

const pagina = { items: [], isLoading: false, dialog: null }
const arquivados = { mode: 'active', setMode: vi.fn(), data: undefined, isLoading: false }
vi.mock('../hooks/useClientsPage', () => ({ useClientsPage: () => pagina }))
vi.mock('../hooks/useBudgetsPage', () => ({ useBudgetsPage: () => pagina }))
vi.mock('../hooks/useClientsArchived', () => ({ useClientsArchived: () => arquivados }))
vi.mock('../hooks/useBudgetsArchived', () => ({ useBudgetsArchived: () => arquivados }))
vi.mock('@shared/lib', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@shared/lib')>()),
  archivableSource: () => ({ items: [], loading: false, error: null, refetch: vi.fn() }),
}))
vi.mock('./Client/ClientsTable', () => ({ ClientsTable: () => <div data-testid="clients-table" /> }))
vi.mock('./Budget/BudgetsTable', () => ({ BudgetsTable: () => <div data-testid="budgets-table" /> }))

describe('CommercialPage', () => {
  it('Presupuestos e a primeira aba e o painel visivel; clientes nao monta', () => {
    renderWithProviders(<CommercialPage />, { route: '/' })

    const abas = screen.getAllByRole('tab')
    expect(abas[0].textContent).toBe('budget.tab')
    expect(screen.queryByTestId('budgets-table')).not.toBeNull()
    expect(screen.queryByTestId('clients-table')).toBeNull()
  })
})
