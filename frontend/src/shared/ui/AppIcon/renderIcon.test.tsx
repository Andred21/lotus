import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { AppButton } from '../AppButton'
import { AppTag } from '../AppTag'
import { primeIcon, renderIcon } from './renderIcon'

function montar(node: ReturnType<typeof renderIcon>) {
  return render(<div>{node}</div>).container
}

describe('renderIcon', () => {
  it('nome novo vira AppIcon', () => {
    const container = montar(renderIcon('close'))

    expect(container.querySelector('svg')).not.toBeNull()
    expect(container.querySelector('i')).toBeNull()
  })

  it('classe legada vira <i>', () => {
    const container = montar(renderIcon('pi pi-check'))

    expect(container.querySelector('i.pi.pi-check')).not.toBeNull()
    expect(container.querySelector('svg')).toBeNull()
  })

  it('undefined não renderiza nada', () => {
    expect(montar(renderIcon(undefined)).innerHTML).toBe('<div></div>')
  })

  it('repassa peso, tamanho e classe ao AppIcon', () => {
    const svg = montar(renderIcon('check', { weight: 'fill', size: 'lg', className: 'shrink-0' })).querySelector('svg')

    expect(svg?.getAttribute('width')).toBe('24')
    expect(svg?.getAttribute('class')).toContain('shrink-0')
  })

  it('a classe extra também chega ao <i> legado', () => {
    const container = montar(renderIcon('pi pi-check', { className: 'text-3xl' }))

    expect(container.querySelector('i')?.className).toBe('pi pi-check text-3xl')
  })
})

describe('primeIcon', () => {
  it('undefined segue undefined', () => {
    expect(primeIcon(undefined)).toBeUndefined()
  })

  it('classe legada segue string, que é o que o Prime já entende', () => {
    expect(primeIcon('pi pi-check')).toBe('pi pi-check')
  })

  it('nome novo vira função que herda a classe do slot do Prime', () => {
    const slot = primeIcon('check')
    if (typeof slot !== 'function') throw new Error('esperava função')

    const svg = montar(
      slot({ iconProps: { className: 'p-button-icon p-c' }, element: null, props: {} }),
    ).querySelector('svg')

    expect(svg?.getAttribute('class')).toContain('p-button-icon')
  })

  it('classe extra soma à do slot', () => {
    const slot = primeIcon('spinner', 'animate-spin')
    if (typeof slot !== 'function') throw new Error('esperava função')

    const svg = montar(
      slot({ iconProps: { className: 'p-button-loading-icon' }, element: null, props: {} }),
    ).querySelector('svg')

    expect(svg?.getAttribute('class')).toContain('animate-spin')
    expect(svg?.getAttribute('class')).toContain('p-button-loading-icon')
  })
})

describe('classe que não é do registro', () => {
  it('bandeira do LanguageMenu passa como string, sem estourar', () => {
    expect(primeIcon('fi fi-gb' as 'pi pi-x')).toBe('fi fi-gb')
  })
})

/** Os slots do Prime recebem o ícone pela mão do `primeIcon`: o que se prova é
 * o resultado no DOM, com a classe do slot que dá o espaço ao lado do rótulo. */
describe('IconName nos wrappers do Prime', () => {
  it('AppButton com rótulo: svg com a classe de slot à esquerda', () => {
    const { container } = render(<AppButton label="Guardar" icon="check" />)
    const svg = container.querySelector('button svg')

    expect(svg?.getAttribute('class')).toContain('p-button-icon-left')
    expect(svg?.getAttribute('aria-hidden')).toBe('true')
  })

  it('AppButton em loading troca o ícone pelo spinner girando', () => {
    const { container } = render(<AppButton label="Guardar" icon="check" loading />)
    const svgs = container.querySelectorAll('button svg')

    expect(svgs).toHaveLength(1)
    expect(svgs[0].getAttribute('class')).toContain('animate-spin')
  })

  it('AppButton sem ícone não renderiza svg', () => {
    const { container } = render(<AppButton label="Guardar" />)

    expect(container.querySelector('button svg')).toBeNull()
  })

  it('AppButton ainda aceita a classe legada', () => {
    const { container } = render(<AppButton label="Guardar" icon="pi pi-check" />)

    expect(container.querySelector('button .pi.pi-check')).not.toBeNull()
  })

  it('AppTag com ícone do registro', () => {
    const { container } = render(<AppTag value="Vigente" icon="receipt" />)

    expect(container.querySelector('.p-tag svg')?.getAttribute('class')).toContain('p-tag-icon')
  })
})
