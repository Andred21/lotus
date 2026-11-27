import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { renderWithProviders } from '@shared/testing/providers'
import { useUiStore } from '@shared/stores/uiStore'
import { Sidebar } from './Sidebar'

// `t` devolve a chave: o que se mede é o estado exposto, não a tradução.
vi.mock('react-i18next', async (importOriginal) => {
  const { mockUseTranslation } = await import('@shared/testing/i18n')
  return {
    ...(await importOriginal<typeof import('react-i18next')>()),
    useTranslation: mockUseTranslation(),
  }
})

afterEach(() => {
  useUiStore.setState({ sidebarCollapsed: false })
})

/** A-5: o botão que recolhe/expande a navegação diz o estado e aponta para ela. */
describe('Sidebar', () => {
  it('sidebar expõe aria-expanded', () => {
    useUiStore.setState({ sidebarCollapsed: false })
    renderWithProviders(<Sidebar />, { route: '/' })

    const toggle = screen.getByRole('button', { name: 'common.toggleMenu' })
    expect(toggle.getAttribute('aria-expanded')).toBe('true')

    const controla = toggle.getAttribute('aria-controls')
    expect(controla).toBeTruthy()
    expect(document.getElementById(controla!)?.tagName).toBe('NAV')

    fireEvent.click(toggle)

    expect(screen.getByRole('button', { name: 'common.toggleMenu' }).getAttribute('aria-expanded')).toBe('false')
  })
})
