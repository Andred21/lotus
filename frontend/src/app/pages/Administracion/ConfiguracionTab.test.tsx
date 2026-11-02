import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ConfiguracionTab } from './ConfiguracionTab'

vi.mock('react-i18next', async (importOriginal) => {
  const { mockUseTranslation } = await import('@shared/testing/i18n')
  return { ...(await importOriginal<typeof import('react-i18next')>()), useTranslation: mockUseTranslation() }
})
vi.mock('@features/certification/components/Settings/CertificateSettingsPanel', () => ({
  CertificateSettingsPanel: () => <div data-testid="painel-certificados" />,
}))

describe('ConfiguracionTab', () => {
  it('o corpo da aba tem o mesmo respiro do diálogo em todo o contorno', () => {
    const { container } = render(<ConfiguracionTab />)
    const raiz = container.firstElementChild as HTMLElement

    expect(raiz.classList.contains('p-6')).toBe(true)
    expect(raiz.classList.contains('md:grid-cols-[14rem_minmax(0,1fr)]')).toBe(true)
  })
})
