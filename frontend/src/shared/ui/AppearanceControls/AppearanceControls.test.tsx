import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
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
})
