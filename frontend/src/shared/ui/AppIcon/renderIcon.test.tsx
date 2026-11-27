import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { AppButton } from '../AppButton'
import { AppTag } from '../AppTag'
import { primeIcon, primeSlotIcon, renderIcon } from './renderIcon'

function montar(node: ReturnType<typeof renderIcon>) {
  return render(<div>{node}</div>).container
}

describe('renderIcon', () => {
  it('nome novo vira AppIcon', () => {
    const container = montar(renderIcon('close'))

    expect(container.querySelector('svg')).not.toBeNull()
  })

  it('undefined não renderiza nada', () => {
    expect(montar(renderIcon(undefined)).innerHTML).toBe('<div></div>')
  })

  it('repassa peso, tamanho e classe ao AppIcon', () => {
    const svg = montar(renderIcon('check', { weight: 'fill', size: 'lg', className: 'shrink-0' })).querySelector('svg')

    expect(svg?.getAttribute('width')).toBe('28')
    expect(svg?.getAttribute('class')).toContain('shrink-0')
  })
})

describe('primeIcon', () => {
  it('undefined segue undefined', () => {
    expect(primeIcon(undefined)).toBeUndefined()
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

describe('primeSlotIcon', () => {
  const slot = (px?: number) => {
    const fn = px === undefined ? primeSlotIcon('check') : primeSlotIcon('check', px)
    return montar(fn({ iconProps: { className: 'p-icon' } })).querySelector('svg')
  }

  it('mede 20px por padrão', () => {
    expect(slot()?.getAttribute('width')).toBe('20')
  })

  it('px explícito vale (o 32 do cabeçalho de diálogo segue em 32)', () => {
    expect(slot(32)?.getAttribute('width')).toBe('32')
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

  it('AppButton: o glifo de 20px não empurra a altura do botão (margem vertical negativa)', () => {
    const { container } = render(<AppButton label="Guardar" icon="check" />)

    expect(container.querySelector('button svg')?.getAttribute('class')).toContain('-my-0.5')
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

  it('AppTag com ícone do registro', () => {
    const { container } = render(<AppTag value="Vigente" icon="receipt" />)

    expect(container.querySelector('.p-tag svg')?.getAttribute('class')).toContain('p-tag-icon')
  })
})
