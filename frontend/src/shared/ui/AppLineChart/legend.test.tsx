import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ChartLegend } from './legend'

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
    const traco = lista.querySelector('line') as SVGLineElement
    expect(traco.getAttribute('stroke')).toBe('var(--surface-border)')
  })

  it('o marcador repete o traço da série', () => {
    render(
      <ChartLegend
        payload={[
          { value: 'Contínua', color: 'var(--surface-border)', payload: { strokeDasharray: '' } },
          { value: 'Tracejada', color: 'var(--surface-border)', payload: { strokeDasharray: '6 3' } },
        ]}
      />,
    )

    const tracos = Array.from(screen.getByRole('list').querySelectorAll('line')).map((l) =>
      l.getAttribute('stroke-dasharray'),
    )
    expect(tracos).toEqual([null, '6 3'])
  })

  it('sem séries não renderiza nada', () => {
    const { container } = render(<ChartLegend payload={[]} />)
    expect(container.firstChild).toBeNull()
  })
})
