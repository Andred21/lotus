import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '@shared/testing/providers'
import { setViewportWidth } from '@shared/testing/viewport'
import { useSessionStore } from '@shared/stores/sessionStore'
import type { ArchiveMode } from '@shared/hooks'
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
  archived_at: '2026-09-01T10:00:00Z', archived_by: 'Admin Lotus',
} as unknown as BudgetRow

function comPermissoes(permissions: string[]) {
  useSessionStore.setState({
    status: 'authenticated',
    user: {
      id: 1, uuid: 'u-1', name: 'Quien Sea', email: 'q@lotus.cl', type: 'admin',
      is_active: true, roles: [], permissions, photo_url: null,
    },
  })
}

const larguraDaColunaDeAcoes = () =>
  (document.querySelector('thead tr th:last-child') as HTMLTableCellElement).style.width

const montar = (mode: ArchiveMode) =>
  renderWithProviders(
    <BudgetsTable
      budgets={[ORCAMENTO]} loading={false} mode={mode} onModeChange={() => {}}
      onRestore={() => {}} busy={false}
    />,
    { route: '/comercial' },
  )

afterEach(() => {
  useSessionStore.setState({ user: null, status: 'unauthenticated' })
})

/** Item 23 (`D-65`): orçamento ativo tem uma ação só (ver) — nada a colapsar,
 * mas a presa de 6rem sobrava sobre o botão; em arquivados, restaurar perde o
 * rótulo no telefone como nas outras visões. */
describe('BudgetsTable — coluna de ações', () => {
  it('no desktop, ver numa coluna de 6rem', () => {
    montar('active')

    expect(screen.getByRole('button', { name: 'common.view' })).toBeTruthy()
    expect(larguraDaColunaDeAcoes()).toBe('6rem')
  })

  it('em 390px, ver segue solto (uma ação não abre menu) e a coluna encolhe para ele', () => {
    setViewportWidth(390)
    montar('active')

    expect(screen.getByRole('button', { name: 'common.view' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'common.moreActions' })).toBeNull()
    expect(larguraDaColunaDeAcoes()).toBe('4.5rem')
  })

  it('em arquivados no 390px, restaurar fica só ícone, com nome acessível', () => {
    comPermissoes(['commercial.budget.restore'])
    setViewportWidth(390)
    montar('archived')

    expect(screen.getByRole('button', { name: 'archive.restoreAction' }).textContent?.trim()).toBe('')
    expect(larguraDaColunaDeAcoes()).toBe('4.5rem')
  })

  it('em arquivados no desktop, restaurar segue rotulado numa coluna de 10rem', () => {
    comPermissoes(['commercial.budget.restore'])
    montar('archived')

    expect(screen.getByRole('button', { name: 'archive.restoreAction' }).textContent).toContain('archive.restoreAction')
    expect(larguraDaColunaDeAcoes()).toBe('10rem')
  })

  it('em arquivados abaixo de sm, o piso é o medido para esta visão (item 23, audit §5)', () => {
    montar('archived')

    const tabela = document.querySelector('table') as HTMLTableElement
    expect(tabela.className).toContain('sm:min-w-[42rem]')
    expect(tabela.style.getPropertyValue('--table-narrow-floor')).toBe('58rem')
  })
})
