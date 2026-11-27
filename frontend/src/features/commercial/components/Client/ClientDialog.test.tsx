import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { useSessionStore } from '@shared/stores/sessionStore'
import type { ClientData } from '@shared/types/generated'
import { ClientDialog } from './ClientDialog'

vi.mock('react-i18next', async (importOriginal) => {
  const { mockUseTranslation } = await import('@shared/testing/i18n')
  return {
    ...(await importOriginal<typeof import('react-i18next')>()),
    useTranslation: mockUseTranslation(),
  }
})

// O que se mede é SE a seção de orçamentos monta; o resto do diálogo vira stub.
vi.mock('@shared/ui', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@shared/ui')>()),
  CrudDialog: ({ children, afterForm }: { children: React.ReactNode; afterForm?: React.ReactNode }) => (
    <div>
      <form>{children}</form>
      {afterForm}
    </div>
  ),
  FormPhotoRow: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))
vi.mock('../../hooks/useClientForm', () => ({
  useClientForm: () => ({
    form: { legal_name: 'Cliente', name: 'Cliente', contacts: [] },
    readOnly: true, submit: vi.fn(), pending: false, busy: false,
    photo: { hasBufferedFailure: false }, fieldErrors: {}, generalError: null, errorSummary: {},
    addr: {}, setAddr: vi.fn(), patchContact: vi.fn(), setPrimaryContact: vi.fn(),
    addContact: vi.fn(), removeContact: vi.fn(), set: vi.fn(),
  }),
}))
vi.mock('./AddressFields', () => ({ AddressFields: () => null }))
vi.mock('./ContactFields', () => ({ ContactFields: () => null }))
vi.mock('./ClientGeneralFields', () => ({ ClientGeneralFields: () => null }))
vi.mock('./ClientBudgetsSection', () => ({
  ClientBudgetsSection: () => <div data-testid="client-budgets" />,
}))

afterEach(() => {
  useSessionStore.setState({ user: null, status: 'unauthenticated' })
})

/** RBAC real pela sessão (`usePermissions` lê o store), como o `TurmaRowActions.test`. */
function comPermissoes(permissions: string[]) {
  useSessionStore.setState({
    status: 'authenticated',
    user: {
      id: 1, uuid: 'u-1', name: 'Quien Sea', email: 'q@lotus.cl', type: 'admin',
      is_active: true, roles: [], permissions, photo_url: null,
    },
  })
}

const cliente = { id: 9 } as ClientData

function montar() {
  render(<ClientDialog visible mode="view" client={cliente} onHide={() => {}} />)
}

describe('ClientDialog — orçamentos do cliente (review Q-2 do bloco 60)', () => {
  it('monta a seção com commercial.budget.view', () => {
    comPermissoes(['commercial.client.view', 'commercial.budget.view'])
    montar()
    expect(screen.queryByTestId('client-budgets')).not.toBeNull()
  })

  it('sem commercial.budget.view a seção não monta (a API recusaria a lista)', () => {
    comPermissoes(['commercial.client.view'])
    montar()
    expect(screen.queryByTestId('client-budgets')).toBeNull()
  })

  it('a seção fica fora do <form>: Enter na busca não salva o cliente', () => {
    comPermissoes(['commercial.client.view', 'commercial.budget.view'])
    montar()
    expect(screen.getByTestId('client-budgets').closest('form')).toBeNull()
  })
})
