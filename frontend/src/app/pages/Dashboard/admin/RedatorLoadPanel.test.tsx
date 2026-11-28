import { describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '@shared/testing/providers'
import type { RedatorLoadData } from '@shared/types/generated'
import { RedatorLoadPanel } from './RedatorLoadPanel'

vi.mock('react-i18next', async (importOriginal) => {
  const { mockUseTranslation } = await import('@shared/testing/i18n')
  return {
    ...(await importOriginal<typeof import('react-i18next')>()),
    useTranslation: mockUseTranslation(),
  }
})

const REDATOR: RedatorLoadData = {
  redator_id: 7,
  name: 'Ana Silva',
  current_turmas: 1,
  upcoming_turmas: 2,
  expired_documents: 0,
  expiring_documents: 0,
}

describe('RedatorLoadPanel — link do relator (A-8)', () => {
  it('link do painel tem aparência de link', () => {
    renderWithProviders(<RedatorLoadPanel redatores={[REDATOR]} />, { route: '/' })

    const link = screen.getByRole('link', { name: 'Ana Silva' })
    // A listagem de redatores não lê a busca da URL (`useCrudPage` filtra em
    // memória), então o destino segue sendo a listagem, sem `?q=` e sem rota de detalhe.
    expect(link.getAttribute('href')).toBe('/personas')
    expect(link.getAttribute('style')).toContain('color: var(--brand-ink)')
    expect(link.className).toContain('hover:underline')
    expect(link.className).toContain('focus-visible:underline')
  })

  it('o título do card é h2 ou h3 conforme o nível pedido pela página', () => {
    renderWithProviders(<RedatorLoadPanel redatores={[REDATOR]} />, { route: '/' })

    expect(screen.getByRole('heading', { level: 3, name: 'dashboard.redatorLoad.title' })).toBeTruthy()
  })
})
