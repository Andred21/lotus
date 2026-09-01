import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { ChartLegend } from './legend'

afterEach(cleanup)

/**
 * f2 UI-09 (run de 2026-08-28): o Recharts pinta o TEXTO da legenda com a tinta
 * da série, e no tema claro as cinco medem 3,41–4,47:1 a 12px — abaixo de AA.
 * A rampa foi calibrada para traço (3:1), não para texto. Aqui o texto sai na
 * tinta secundária e só o marcador carrega a série. E a lista ganha
 * `role="list"`, que o mini-reset da P-46 tira do `ul` de terceiro — era a
 * P-63, aberta desde 2026-08-27 esperando um bloco que tocasse gráfico.
 */
describe('ChartLegend', () => {
  it('é uma lista com semântica e o texto não herda a tinta da série', () => {
    render(<ChartLegend payload={[{ value: 'Matrículas', color: 'var(--surface-border)' }]} />)

    const lista = screen.getByRole('list')
    expect(lista.tagName).toBe('UL')
    expect(lista.getAttribute('style')).toContain('var(--text-color-secondary)')
    expect(screen.getByText('Matrículas')).toBeTruthy()
    const marcador = lista.querySelector('[aria-hidden="true"]') as HTMLElement
    expect(marcador.getAttribute('style')).toContain('var(--surface-border)')
  })

  it('sem séries não renderiza nada', () => {
    const { container } = render(<ChartLegend payload={[]} />)
    expect(container.firstChild).toBeNull()
  })
})
