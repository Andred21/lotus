import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '@shared/testing/providers'
import { APP_VERSION } from '@shared/config/brand'
import { useSessionStore } from '@shared/stores/sessionStore'
import { LoginPage } from './LoginPage'

vi.mock('react-i18next', async (importOriginal) => {
  const { mockUseTranslation } = await import('@shared/testing/i18n')
  return {
    ...(await importOriginal<typeof import('react-i18next')>()),
    useTranslation: mockUseTranslation(),
  }
})

describe('LoginPage', () => {
  afterEach(() => useSessionStore.setState({ user: null, status: 'loading', expired: false }))

  it('tela de login mostra aviso de sessão expirada', () => {
    useSessionStore.setState({ status: 'unauthenticated', expired: true })
    renderWithProviders(<LoginPage />, { route: '/login' })

    expect(screen.getByRole('status').textContent).toContain('auth.sessionExpired')
  })

  it('sem sessão expirada, o login não mostra o aviso', () => {
    useSessionStore.setState({ status: 'unauthenticated', expired: false })
    renderWithProviders(<LoginPage />, { route: '/login' })

    expect(screen.queryByText('auth.sessionExpired')).toBeNull()
  })

  // Bloco 45, Q-2: o login é rota pública e o CHANGELOG diz o que cada versão
  // corrige; a versão de produção só aparece para quem tem sessão (sidebar).
  it('não mostra a versão do produto a quem não autenticou', () => {
    renderWithProviders(<LoginPage />, { route: '/login' })

    expect(screen.getByLabelText('login.email')).toBeTruthy()
    expect(screen.queryByText(APP_VERSION)).toBeNull()
  })
})
