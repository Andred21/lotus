import { describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '@shared/testing/providers'
import { APP_VERSION } from '@shared/config/brand'
import { LoginPage } from './LoginPage'

vi.mock('react-i18next', async (importOriginal) => {
  const { mockUseTranslation } = await import('@shared/testing/i18n')
  return {
    ...(await importOriginal<typeof import('react-i18next')>()),
    useTranslation: mockUseTranslation(),
  }
})

describe('LoginPage', () => {
  // Bloco 45, Q-2: o login é rota pública e o CHANGELOG diz o que cada versão
  // corrige; a versão de produção só aparece para quem tem sessão (sidebar).
  it('não mostra a versão do produto a quem não autenticou', () => {
    renderWithProviders(<LoginPage />, { route: '/login' })

    expect(screen.getByLabelText('login.email')).toBeTruthy()
    expect(screen.queryByText(APP_VERSION)).toBeNull()
  })
})
