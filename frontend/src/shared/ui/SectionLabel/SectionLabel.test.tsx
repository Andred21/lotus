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

  /** Tinta do CORPO é o DEFAULT, não a secundária. A P-36 travava o
   * `SectionLabel` inteiro; desde a reversão da D1 (João, 2026-11-01) ela trava
   * só este default — a marca é opt-in (`tone="brand"`), e quem a pede é o
   * `FormSection`. As faixas de Dashboard, Sidebar e cartões seguem aqui. */
  it('pinta com a tinta de corpo', () => {
    render(<SectionLabel>Acción</SectionLabel>)

    expect(screen.getByRole('heading', { name: 'Acción' }).getAttribute('style'))
      .toContain('var(--text-color)')
  })

  it('tone body mantém a linha em --surface-border', () => {
    const { container } = render(<SectionLabel tone="body">Acción</SectionLabel>)

    expect(container.querySelector('span[aria-hidden="true"]')?.getAttribute('style'))
      .toContain('var(--surface-border)')
  })

  /** A variante da reversão da D1/P-36 (João, 2026-11-01): título no celeste e
   * linha no token `--section-rule`, que é o celeste com transparência. */
  it('tone="brand" pinta o título de --primary-color e a linha de --section-rule', () => {
    const { container } = render(<SectionLabel tone="brand">Acción</SectionLabel>)

    expect(screen.getByRole('heading', { name: 'Acción' }).getAttribute('style'))
      .toContain('var(--primary-color)')
    expect(container.querySelector('span[aria-hidden="true"]')?.getAttribute('style'))
      .toContain('var(--section-rule)')
  })
})
