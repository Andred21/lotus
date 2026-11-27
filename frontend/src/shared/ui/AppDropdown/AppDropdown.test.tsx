import { beforeAll, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render } from '@testing-library/react'
import i18n from '@shared/config/i18n'
import { AppDropdown } from './AppDropdown'

// O idioma da INTERFACE, nao o do runtime: em jsdom o detector resolve pelo
// `navigator.language` (en-US), e o defeito medido no gate do BD-16 e um rotulo
// ingles aparecendo numa interface em espanhol.
beforeAll(async () => {
  await i18n.changeLanguage('es-CL')
})

// O painel do Prime monta em portal, fora do container do render; a mensagem de
// vazio se le nele, e nao no controle fechado -- que carrega o MESMO texto por
// desenho do Prime (ver o terceiro teste).
const abrirELerPainel = (container: HTMLElement) => {
  fireEvent.click(container.querySelector('.p-dropdown') as HTMLElement)
  return document.querySelector('.p-dropdown-empty-message')?.textContent
}

describe('AppDropdown', () => {
  it('lista vazia nao cai no default INGLES do Prime', () => {
    // `localeOption('emptyMessage')` (`dropdown.cjs.js:497`) e alcancavel de
    // verdade: turma sem redator designado, carteira de clientes ainda em voo.
    const { container } = render(<AppDropdown options={[]} onChange={() => {}} />)

    expect(abrirELerPainel(container)).toBe('Sin opciones disponibles')
  })

  it('a tela ainda diz POR QUE a lista esta vazia, se souber', () => {
    // O piso e default, nao pin: quem sabe o motivo escreve melhor do que ele.
    const { container } = render(
      <AppDropdown options={[]} emptyMessage="Esta turma no tiene redactores" onChange={() => {}} />,
    )

    expect(abrirELerPainel(container)).toBe('Esta turma no tiene redactores')
  })

  it('o controle FECHADO nao passa a exibir a mensagem de vazio', () => {
    // `dropdown.cjs.js:1613` usa `emptyMessage` tambem como ultimo recurso do
    // rotulo fechado (`label || placeholder || emptyMessage || &nbsp;`). O texto
    // entra no DOM, mas so no MESMO estado em que o Prime marca
    // `p-dropdown-label-empty`, que e `visibility: hidden` -- fora da tela e
    // fora da arvore de acessibilidade. Com placeholder, nem isso: o
    // placeholder vence.
    const semPlaceholder = render(<AppDropdown options={[]} onChange={() => {}} />)
    const rotuloVazio = semPlaceholder.container.querySelector('.p-dropdown-label')
    expect(rotuloVazio?.className).toContain('p-dropdown-label-empty')

    cleanup()

    const comPlaceholder = render(
      <AppDropdown options={[]} placeholder="Seleccione" onChange={() => {}} />,
    )
    const rotulo = comPlaceholder.container.querySelector('.p-dropdown-label')
    expect(rotulo?.textContent).toBe('Seleccione')
    expect(rotulo?.className).not.toContain('p-dropdown-label-empty')
  })
})

/** Bloco 64: os SVGs internos (seta, limpar, filtro) são do registro Phosphor. */
describe('AppDropdown — ícones internos', () => {
  const OPTIONS = [{ label: 'Um', value: 1 }]
  const phosphor = (el: Element | null) => {
    const svg = el?.tagName === 'svg' ? el : el?.querySelector('svg')
    expect(svg).not.toBeNull()
    expect(svg?.classList.contains('p-icon')).toBe(false)
  }

  it('usa ícone Phosphor na seta do controle, fechado e aberto', () => {
    const { container } = render(<AppDropdown options={OPTIONS} onChange={() => {}} />)

    phosphor(container.querySelector('.p-dropdown-trigger'))
    fireEvent.click(container.querySelector('.p-dropdown') as HTMLElement)
    phosphor(container.querySelector('.p-dropdown-trigger'))
  })

  it('usa ícone Phosphor no limpar, que continua limpando', () => {
    const onChange = vi.fn()
    const { container } = render(<AppDropdown options={OPTIONS} value={1} showClear onChange={onChange} />)

    const limpar = container.querySelector('.p-dropdown-clear-icon')
    phosphor(limpar)
    fireEvent.pointerUp(limpar as Element)
    expect(onChange).toHaveBeenCalled()
  })

  it('usa ícone Phosphor no filtro do painel', () => {
    const { container } = render(<AppDropdown options={OPTIONS} filter onChange={() => {}} />)

    fireEvent.click(container.querySelector('.p-dropdown') as HTMLElement)
    phosphor(document.querySelector('.p-dropdown-filter-container'))
  })

  it('loading mostra o spinner Phosphor, girando, sem o SVG do Prime', () => {
    const { container } = render(<AppDropdown options={OPTIONS} loading onChange={() => {}} />)

    const svg = container.querySelector('.p-dropdown-trigger svg')
    expect(svg).not.toBeNull()
    expect(svg?.classList.contains('p-icon')).toBe(false)
    expect(svg?.classList.contains('animate-spin')).toBe(true)
  })
})
