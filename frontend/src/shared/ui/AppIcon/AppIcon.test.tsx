import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AppIcon } from './AppIcon'
import { ICONS } from './icons'

function svgOf(container: HTMLElement) {
  const svg = container.querySelector('svg')
  if (!svg) throw new Error('svg não renderizado')
  return svg
}

describe('AppIcon', () => {
  it('renderiza svg decorativo por padrão', () => {
    const { container } = render(<AppIcon name="close" />)
    const svg = svgOf(container)

    expect(svg.getAttribute('aria-hidden')).toBe('true')
    expect(svg.hasAttribute('role')).toBe(false)
  })

  it('com label vira imagem nomeada', () => {
    render(<AppIcon name="close" label="Cerrar" />)

    expect(screen.getByRole('img', { name: 'Cerrar' })).toBeTruthy()
  })

  it('weight fill repassa ao Phosphor', () => {
    const regular = render(<AppIcon name="check" />)
    const fill = render(<AppIcon name="check" weight="fill" />)

    expect(svgOf(fill.container).innerHTML).not.toBe(svgOf(regular.container).innerHTML)
  })

  it('size md mede 16px', () => {
    const { container } = render(<AppIcon name="close" />)

    expect(svgOf(container).getAttribute('width')).toBe('16')
  })

  it('size sm mede 14px e lg mede 24px', () => {
    const sm = render(<AppIcon name="close" size="sm" />)
    const lg = render(<AppIcon name="close" size="lg" />)

    expect(svgOf(sm.container).getAttribute('width')).toBe('14')
    expect(svgOf(lg.container).getAttribute('width')).toBe('24')
  })

  it('herda a cor do texto', () => {
    const { container } = render(<AppIcon name="close" />)

    expect(svgOf(container).getAttribute('fill')).toBe('currentColor')
  })

  it('repassa className ao svg', () => {
    const { container } = render(<AppIcon name="close" className="shrink-0" />)

    expect(svgOf(container).getAttribute('class')).toContain('shrink-0')
  })
})

describe('ICONS', () => {
  it('todo IconName resolve um componente', () => {
    const componentes = Object.values(ICONS)

    expect(Object.keys(ICONS).length).toBeGreaterThanOrEqual(50)
    for (const componente of componentes) {
      expect(['function', 'object']).toContain(typeof componente)
      expect(componente).not.toBeNull()
    }
  })
})
