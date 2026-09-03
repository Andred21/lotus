import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SectionLabel } from './SectionLabel'
import { sectionLabelClass } from '../typography'

/**
 * "Encabeçar um grupo" saía em 5 grafias — `text-sm font-bold tracking-wide
 * uppercase` no `FormSection`, `text-xs font-semibold tracking-wider uppercase`
 * no Dashboard, `font-medium` puro em três cartões de operation e
 * `text-sm font-medium uppercase tracking-wide` com tinta secundária num quarto
 * (achado A2 do audit de 2026-08-26).
 */
describe('SectionLabel', () => {
  it('é h2 por padrão e carrega a grafia compartilhada', () => {
    render(<SectionLabel>Acción</SectionLabel>)

    const faixa = screen.getByRole('heading', { name: 'Acción', level: 2 })
    expect(faixa.className).toContain(sectionLabelClass)
  })

  /**
   * O nível vem por prop porque os sítios de operation são `h3` dentro de card
   * sob o `h1` da página — forçar `h2` inverteria a árvore de cabeçalhos —, e o
   * Dashboard precisa do `h2` que o degrau dele existe para marcar (UI-05 do
   * review de 2026-08-17). Nível fixo quebraria um dos dois lados (spec D6).
   */
  it('aceita h3 para a faixa dentro de card ou diálogo', () => {
    render(<SectionLabel as="h3">Identidad</SectionLabel>)

    expect(screen.getByRole('heading', { name: 'Identidad', level: 3 })).toBeTruthy()
  })

  it('a hairline sai por padrão e some com `rule={false}`', () => {
    const { container, rerender } = render(<SectionLabel>Acción</SectionLabel>)
    expect(container.querySelector('span[aria-hidden="true"]')).not.toBeNull()

    rerender(<SectionLabel rule={false}>Acción</SectionLabel>)
    expect(container.querySelector('span[aria-hidden="true"]')).toBeNull()
  })

  /** Tinta do CORPO, não a secundária nem a de marca. A P-36 já foi reaberta
   * três vezes pela via do "sem cor fica sem graça": a hierarquia vem do peso e
   * da caixa alta, e o mecanismo é este teste. */
  it('pinta com a tinta de corpo', () => {
    render(<SectionLabel>Acción</SectionLabel>)

    expect(screen.getByRole('heading', { name: 'Acción' }).getAttribute('style'))
      .toContain('var(--text-color)')
  })
})
