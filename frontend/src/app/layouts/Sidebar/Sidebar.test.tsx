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

  /** M-5: o `CONTEUDO_DO_RAIL` do `SidebarItem.test.tsx` subtrai `nav px-1` (4+4).
   * Este é o lado da sidebar da conta: mexer no padding do nav sem refazê-la
   * deixa a prova dos rótulos curtos verde sobre uma largura que não existe. */
  it('colapsada, o nav usa px-1; expandida, px-3', () => {
    useUiStore.setState({ sidebarCollapsed: true })
    const { container, unmount } = renderWithProviders(<Sidebar />, { route: '/' })
    expect(container.querySelector('nav')?.className).toContain('px-1')
    expect(container.querySelector('nav')?.className).not.toContain('px-3')
    unmount()

    useUiStore.setState({ sidebarCollapsed: false })
    const expandida = renderWithProviders(<Sidebar />, { route: '/' })
    expect(expandida.container.querySelector('nav')?.className).toContain('px-3')
  })
})
