import { describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'
import { AppDropdown } from '@shared/ui'

vi.mock('react-i18next', async (importOriginal) => {
  const { mockUseTranslation } = await import('@shared/testing/i18n')
  return {
    ...(await importOriginal<typeof import('react-i18next')>()),
    useTranslation: mockUseTranslation(),
  }
})

describe('mock de useTranslation', () => {
  it('deixa o AppDropdown renderizar', () => {
    const { container } = render(
      <AppDropdown options={[{ label: 'Uno', value: 1 }]} value={null} onChange={() => {}} />,
    )
    expect(container.querySelector('.p-dropdown')).toBeTruthy()
  })

  it('entrega o idioma ativo, que é o que o AppDropdown usa para remontar', async () => {
    const { mockUseTranslation } = await import('@shared/testing/i18n')
    expect(mockUseTranslation()().i18n.language).toBe('es-CL')
    expect(mockUseTranslation({ language: 'pt-BR' })().i18n.language).toBe('pt-BR')
  })
})
