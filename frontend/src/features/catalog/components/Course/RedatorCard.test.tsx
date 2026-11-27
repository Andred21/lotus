import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { RedatorData } from '@shared/types/generated'
import { RedatorCard } from './RedatorCard'

vi.mock('react-i18next', async (importOriginal) => {
  const { mockUseTranslation } = await import('@shared/testing/i18n')
  return {
    ...(await importOriginal<typeof import('react-i18next')>()),
    useTranslation: mockUseTranslation(),
  }
})

const REDATOR = {
  id: 7, name: 'Ana Silva', rut: '12.345.678-5', photo_url: null, documents: [], course_ids: [],
} as unknown as RedatorData

describe('RedatorCard — célula de identidade e controle interativo', () => {
  /** Com `onToggle` o card inteiro é um `<button aria-pressed>`: nada focável
   * ou com papel próprio pode morar dentro dele. */
  it('selecionável: o botão não carrega filho focável nem grupo', () => {
    render(<RedatorCard redator={REDATOR} selected={false} onToggle={() => {}} />)

    const botao = screen.getByRole('button', { name: /Ana Silva/ })
    expect(botao.getAttribute('aria-pressed')).toBe('false')
    expect(botao.querySelector('[tabindex]')).toBeNull()
    expect(botao.querySelector('[role="group"]')).toBeNull()
  })

  it('somente leitura: o nome truncado segue acessível por foco', () => {
    render(<RedatorCard redator={REDATOR} />)

    expect(screen.getByRole('group', { name: 'Ana Silva' }).tabIndex).toBe(0)
  })
})
