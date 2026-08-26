import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { AppPassword } from './AppPassword'

afterEach(() => {
  cleanup()
})

/**
 * A largura deste componente já custou QUATRO achados — C-2 (2026-08-12), UI-01
 * (2026-08-13), UI-02 e Q-5 (2026-08-16) —, sempre a mesma forma: metade da
 * regra no wrapper e metade no chamador, ou o override cravado ANTES do spread,
 * onde um `className` do chamador o apaga. A rule da camada já carrega o texto
 * ("pine o override após o spread"); o que faltava era mecanismo, e é isto
 * (Q-9 do review de 2026-08-17).
 *
 * A asserção é sobre o INPUT, não sobre o wrapper: é ele que o Prime aninha
 * dentro do `span.p-password`, fora do alcance do padding do tema, e é nele que
 * `w-full` e `pl-10` precisam sobreviver.
 */
function input() {
  return screen.getByLabelText('senha')
}

describe('AppPassword mantém a largura sob className do chamador', () => {
  it('ramo SEM ícone: `w-full` sobrevive a um inputClassName do chamador', () => {
    render(<AppPassword aria-label="senha" inputClassName="uppercase" />)

    expect(input().className).toContain('w-full')
    expect(input().className).toContain('uppercase')
  })

  it('ramo COM ícone: `w-full` e `pl-10` sobrevivem a um inputClassName do chamador', () => {
    render(<AppPassword aria-label="senha" leftIcon="pi pi-lock" inputClassName="uppercase" />)

    // `pl-10` é o offset que impede o texto de correr por baixo do ícone — some
    // ele e o defeito é visual, não de layout, que é o que fez passar batido
    // três vezes.
    expect(input().className).toContain('w-full')
    expect(input().className).toContain('pl-10')
    expect(input().className).toContain('uppercase')
  })

  it('os dois ramos pinam a largura sem o chamador pedir', () => {
    const { container } = render(<AppPassword aria-label="senha" />)
    expect(input().className).toContain('w-full')
    // O wrapper também: com `toggleMask` o Prime embrulha o input num IconField
    // PRÓPRIO, shrink-to-fit, contra o qual um `w-full` sozinho resolve para a
    // largura intrínseca (UI-01).
    expect(container.querySelector('.p-password')?.className).toContain('w-full')
  })
})

describe('AppPassword — o olho responde às DUAS teclas de botão', () => {
  function olho() {
    return screen.getByRole('button', { name: 'common.showPassword' })
  }

  it('Enter alterna o campo para texto', () => {
    render(<AppPassword aria-label="senha" />)

    expect(input().getAttribute('type')).toBe('password')
    fireEvent.keyDown(olho(), { key: 'Enter', code: 'Enter' })
    expect(input().getAttribute('type')).toBe('text')
  })

  it('Espaco alterna o campo para texto (D-24)', () => {
    // A WAI-ARIA exige as DUAS teclas para role="button". O review de
    // 2026-08-17 mediu Enter funcionando e Espaço não.
    render(<AppPassword aria-label="senha" />)

    expect(input().getAttribute('type')).toBe('password')
    fireEvent.keyDown(olho(), { key: ' ', code: 'Space' })
    expect(input().getAttribute('type')).toBe('text')
  })

  it('o olho NAO carrega aria-pressed', () => {
    // Recusa com motivo (spec D6): o NOME deste controle alterna a cada clique,
    // e um controle cujo nome muda é botão — foi por isso que o `role="switch"`
    // + `aria-checked` do Prime saiu em 2026-08-13 (UI-04), por mentir sobre o
    // estado. Pendurar `aria-pressed` num botão cujo nome já o carrega anuncia o
    // estado duas vezes, em duas gramáticas.
    render(<AppPassword aria-label="senha" />)

    expect(olho().getAttribute('aria-pressed')).toBeNull()
    expect(olho().getAttribute('aria-checked')).toBeNull()
  })
})

/**
 * UI-04 do review de 2026-08-18: o olho media 16x16px, contra o mínimo de 24x24
 * de AA (WCAG 2.5.8), nos quatro campos de senha da aplicação.
 *
 * O jsdom não calcula layout, então a asserção é sobre o MECANISMO — que é onde
 * a correção pode regredir em silêncio: sem `box-content` o padding come o
 * glifo (o `.p-icon` do tema crava `width: 1rem` e o preflight do Tailwind põe
 * `border-box` em tudo), e sem o `transform` da span o glifo desce 6px porque o
 * `margin-top: -0.5rem` do tema assume 1rem de altura. A medida real está no
 * relatório do review; aqui fica a catraca.
 */
describe('AppPassword — o olho tem alvo de toque de 24px para cima (UI-04)', () => {
  it('a folga vai na `<svg>` que carrega o clique, e SOMA ao glifo', () => {
    render(<AppPassword aria-label="senha" />)
    // 16px de glifo + 6px de cada lado = 28px. `content-box` é obrigatório: o
    // `.p-icon` do tema crava `width: 1rem`, e sem ele o padding come o glifo.
    const olho = screen.getByRole('button', { name: 'common.showPassword' }) as unknown as SVGElement
    const estilo = (olho as unknown as HTMLElement).style

    expect(estilo.boxSizing).toBe('content-box')
    expect(estilo.padding).toBe('0.375rem')
    // Não pela utilitária `box-content`: o `*` de `src/index.css` está fora de
    // `@layer` e vence as utilitárias do Tailwind, que estão dentro de
    // `@layer utilities` — medido no navegador, com a classe aplicada e o
    // `box-sizing` resolvendo `border-box` assim mesmo.
    expect(olho.getAttribute('class')).not.toContain('box-content')
    // A classe do Prime sobrevive: o `mergeProps` dele CONCATENA className.
    expect(olho.getAttribute('class')).toContain('p-password-show-icon')
  })

  it('a span posicionada recentra o alvo sem depender da altura dele', () => {
    const { container } = render(<AppPassword aria-label="senha" />)
    const span = container.querySelector('.p-input-icon') as HTMLElement

    expect(span.style.marginTop).toBe('0px')
    expect(span.style.transform).toContain('-50%')
    // Sem `flex` a span fica 4px mais alta que o alvo (vão de linha do `<svg>`
    // inline) e `translateY(-50%)` centra a LINHA, não o glifo — medido: 2px
    // acima do eixo do campo.
    expect(span.style.display).toBe('flex')
  })
})

/**
 * D-33, medida no BD-16 (2026-08-18) em Chromium real: o Prime troca `showIcon`
 * por `hideIcon` ao alternar, o nó focado sai do DOM e `document.activeElement`
 * vira `BODY`. Quem alterna pelo teclado perde o lugar na página.
 *
 * O ícone já é focável — o Prime crava `tabIndex: props.tabIndex || '0'`
 * (`password.cjs.js:601,610`). O que falta é continuidade, não alcance.
 *
 * O âncora é `[role="button"]` dentro do `.p-password`: o `role` é pinado por
 * este wrapper (o default do Prime é `switch` com `aria-checked` invertido,
 * UI-04 de 2026-08-13) e é o único controle dentro do campo.
 */
describe('AppPassword devolve o foco ao olho', () => {
  function olho(container: HTMLElement) {
    const alvo = container.querySelector('.p-password [role="button"]')
    if (!alvo) throw new Error('olho não encontrado')
    return alvo as SVGElement & { focus: () => void }
  }

  it('depois de alternar, o foco fica no ícone e não no <body>', async () => {
    const { container } = render(<AppPassword aria-label="senha" />)

    olho(container).focus()
    fireEvent.click(olho(container))

    await waitFor(() => {
      expect(document.activeElement).toBe(olho(container))
      expect(document.activeElement?.tagName).not.toBe('BODY')
    })
  })

  /** O foco só volta para quem o tinha. Alternar por clique de mouse não pode
   * roubar o foco de outro campo — seria um defeito novo no lugar do antigo. */
  it('não rouba o foco quando o olho não o tinha', async () => {
    const { container } = render(<AppPassword aria-label="senha" />)
    const campo = screen.getByLabelText('senha')

    campo.focus()
    fireEvent.click(olho(container))

    await waitFor(() => expect(document.activeElement).toBe(campo))
  })
})
