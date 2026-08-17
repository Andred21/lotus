import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
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
