import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { useUiStore } from '@shared/stores/uiStore'
import { AppearanceControls } from './AppearanceControls'

vi.mock('react-i18next', async (importOriginal) => {
  const { mockUseTranslation } = await import('@shared/testing/i18n')
  return {
    ...(await importOriginal<typeof import('react-i18next')>()),
    useTranslation: mockUseTranslation({ language: 'en' }),
  }
})

/** B-5 (D4): o par mora no header (azul-poste fixo) e no login (idem) — os dois
 * controles são `shell`, idênticos nos dois temas. */
describe('AppearanceControls', () => {
  it('controles do header usam shell: toggle de tema sem classe dark:', () => {
    render(<AppearanceControls />)

    const toggle = screen.getByLabelText('common.toggleTheme')
    expect(toggle.className).toContain('text-[var(--shell-ink)]')
    expect(toggle.className).not.toContain('dark:')
  })

  it('surface="page" devolve a marca do tema claro: iconToggle no tema, compact no idioma', () => {
    render(<AppearanceControls surface="page" />)

    const toggle = screen.getByLabelText('common.toggleTheme')
    expect(toggle.className).toContain('border-[var(--brand-ink)]')
    expect(toggle.className).not.toContain('--shell-ink')

    const idioma = screen.getByRole('button', { name: /common\.language/ })
    expect(idioma.className).toContain('border-[var(--brand-ink)]')
    expect(idioma.className).toContain('px-3 py-2.5 text-sm')
    expect(idioma.className).not.toContain('--shell-ink')
  })

  it('toggle de tema expõe aria-pressed', () => {
    useUiStore.setState({ theme: 'light' })
    const { rerender } = render(<AppearanceControls />)
    expect(screen.getByLabelText('common.toggleTheme').getAttribute('aria-pressed')).toBe('false')

    useUiStore.setState({ theme: 'dark' })
    rerender(<AppearanceControls />)
    expect(screen.getByLabelText('common.toggleTheme').getAttribute('aria-pressed')).toBe('true')
  })
})
