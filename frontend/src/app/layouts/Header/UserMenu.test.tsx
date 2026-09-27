import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '@shared/testing/providers'
import { useSessionStore } from '@shared/stores/sessionStore'
import { UserMenu } from './UserMenu'

// `t` devolve a chave: o que se mede é QUAL texto o cabeçalho escolhe.
vi.mock('react-i18next', async (importOriginal) => {
  const { mockUseTranslation } = await import('@shared/testing/i18n')
  return {
    ...(await importOriginal<typeof import('react-i18next')>()),
    useTranslation: mockUseTranslation(),
  }
})

afterEach(() => {
  useSessionStore.setState({ user: null, status: 'unauthenticated' })
})

function logadoCom(roles: string[]) {
  useSessionStore.setState({
    status: 'authenticated',
    user: {
      id: 1, uuid: 'u-1', name: 'Quien Sea', email: 'q@lotus.cl', type: 'admin',
      is_active: true, roles, permissions: [], photo_url: null,
    },
  })
}

/** Q-4 do review de 2026-09-26: o cabeçalho usava `displayRole`, que monta
 * `roleName.<slug>` para QUALQUER role — um staff com role customizado via a
 * chave crua `roleName.auditor` no topo de toda tela, enquanto a lista de
 * Administración (que já passava por `roleLabel`) mostrava "auditor". */
describe('UserMenu — rótulo do role', () => {
  it('role de sistema sai pela chave roleName', () => {
    logadoCom(['superadmin'])
    renderWithProviders(<UserMenu />, { route: '/' })

    expect(screen.getByText('roleName.superadmin')).toBeTruthy()
  })

  it('role customizado sai como foi digitado, não como chave crua', () => {
    logadoCom(['auditor'])
    renderWithProviders(<UserMenu />, { route: '/' })

    expect(screen.getByText('auditor')).toBeTruthy()
    expect(screen.queryByText('roleName.auditor')).toBeNull()
  })

  it('sem role, a linha do role fica vazia', () => {
    logadoCom([])
    renderWithProviders(<UserMenu />, { route: '/' })

    expect(screen.queryByText(/^roleName\./)).toBeNull()
  })
})
