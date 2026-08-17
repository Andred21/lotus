import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
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
