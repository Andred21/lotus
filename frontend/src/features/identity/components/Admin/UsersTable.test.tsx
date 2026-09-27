import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '@shared/testing/providers'
import { setViewportWidth } from '@shared/testing/viewport'
import { useSessionStore } from '@shared/stores/sessionStore'
import type { UserData } from '@shared/types/generated'
import { UsersTable } from './UsersTable'

vi.mock('react-i18next', async (importOriginal) => {
  const { mockUseTranslation } = await import('@shared/testing/i18n')
  return {
    ...(await importOriginal<typeof import('react-i18next')>()),
    useTranslation: mockUseTranslation(),
  }
})

const user: UserData = {
  id: 1, uuid: 'u-1', name: 'Admin Lotus', email: 'admin@lotus.cl', rut: null, phone: null,
  role: 'superadmin', is_active: true, password: undefined, type: 'admin', roles: ['superadmin'],
  photo_url: null, last_login: null,
}

describe('UsersTable', () => {
  it('a coluna Rol imprime o rótulo do role, não o slug (UI-01)', () => {
    renderWithProviders(
      <UsersTable
        users={[user]} loading={false} onView={() => {}} mode="active" onModeChange={() => {}}
        onArchive={() => {}} onRestore={() => {}} busy={false}
      />,
    )
    expect(screen.getByText('roleName.superadmin')).toBeTruthy()
    expect(screen.queryByText('superadmin')).toBeNull()
  })

  it('usa um piso menor que os 48rem default, para não forçar rolagem em 1024x768 (UI-02)', () => {
    // Mesma raiz do UI-03 de Pessoas (RedatoresTable): o piso default do
    // AppDataTable (min-w-[48rem] = 768px) é maior que os 718px de moldura em
    // 1024x768 — o piso vence, força rolagem, e a coluna de ações presa
    // (right: 0) cobre "Último acceso" com ~50px de sobreposição.
    renderWithProviders(
      <UsersTable
        users={[user]} loading={false} onView={() => {}} mode="active" onModeChange={() => {}}
        onArchive={() => {}} onRestore={() => {}} busy={false}
      />,
    )
    const tabela = document.querySelector('table') as HTMLTableElement
    expect(tabela.className).not.toContain('min-w-[48rem]')
    expect(tabela.className).toContain('min-w-[42rem]')
  })
})

/** Q-1 do review de 2026-09-26: Administración em 390x844 tinha a mesma coluna
 * presa cobrindo o nome que o UI-01 de Pessoas — registrada como "Conhecido
 * (D-65)" em vez de corrigida. Com `identity.access.manage` a linha tem
 * arquivar e ver, e as duas colapsam num botão só. */
describe('UsersTable — ações colapsam no telefone', () => {
  afterEach(() => {
    useSessionStore.setState({ user: null, status: 'unauthenticated' })
  })

  it('em 390px a linha tem UM botão de ações, e a coluna presa encolhe para ele', () => {
    useSessionStore.setState({
      status: 'authenticated',
      user: {
        id: 1, uuid: 'u-1', name: 'Admin Lotus', email: 'admin@lotus.cl', type: 'admin',
        is_active: true, roles: ['superadmin'], permissions: ['identity.access.manage'], photo_url: null,
      },
    })
    setViewportWidth(390)
    renderWithProviders(
      <UsersTable
        users={[user]} loading={false} onView={() => {}} mode="active" onModeChange={() => {}}
        onArchive={() => {}} onRestore={() => {}} busy={false}
      />,
    )

    expect(screen.getByRole('button', { name: 'common.moreActions' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'archive.archiveAction' })).toBeNull()
    const coluna = document.querySelector('thead tr th:last-child') as HTMLTableCellElement
    expect(coluna.style.width).toBe('4.5rem')
  })
})
