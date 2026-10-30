import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { renderWithProviders } from '@shared/testing/providers'
import { api } from '@shared/api/axios'
import { useSessionStore } from '@shared/stores/sessionStore'
import { AdministracionRoute } from './AdministracionRoute'

vi.mock('react-i18next', async (importOriginal) => {
  const { mockUseTranslation } = await import('@shared/testing/i18n')
  return { ...(await importOriginal<typeof import('react-i18next')>()), useTranslation: mockUseTranslation() }
})

function logadoCom(permissions: string[]) {
  useSessionStore.setState({
    status: 'authenticated',
    user: {
      id: 1, uuid: 'u-1', name: 'Quien Sea', email: 'q@lotus.cl', type: 'admin',
      is_active: true, roles: [], permissions, photo_url: null,
    },
  })
}

beforeEach(() => {
  vi.spyOn(api, 'get').mockImplementation(((url: string) =>
    Promise.resolve({
      data: url === '/api/certificate-settings'
        ? { manager_name: 'Marcia de Batalha', manager_title: 'Gerente OTEC', signature: null }
        : [],
    })) as never)
})

afterEach(() => {
  vi.restoreAllMocks()
  useSessionStore.setState({ user: null, status: 'unauthenticated' })
})

const montar = () => renderWithProviders(<AdministracionRoute />, { route: '/administracion' })

describe('AdministracionRoute', () => {
  it('superadmin vê a aba Configuración, com o submódulo Certificados e o painel', async () => {
    logadoCom(['identity.access.manage', 'certification.settings.manage'])
    montar()

    fireEvent.click(screen.getByText('admin.tabConfiguracion'))

    const atual = screen.getByRole('button', { name: 'admin.configuracion.certificados' })
    expect(atual.getAttribute('aria-current')).toBe('page')
    expect(await screen.findByDisplayValue('Marcia de Batalha')).toBeTruthy()
  })

  it('admin sem certification.settings.manage não vê a aba Configuración', () => {
    logadoCom(['identity.access.manage'])
    montar()

    expect(screen.queryByText('admin.tabConfiguracion')).toBeNull()
    expect(screen.getByText('admin.tabUsers')).toBeTruthy()
  })
})
