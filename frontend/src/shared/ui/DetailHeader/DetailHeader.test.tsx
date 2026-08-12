import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { DetailHeader } from './DetailHeader'

/**
 * O `PageHeader.test.tsx` já prova que o título VISÍVEL sai como `h1`. O que se
 * prova aqui é o ramo que faltava: os estados sem entidade para nomear — carga,
 * falha de carga, id inexistente — em que o `h1` era condicional ao `title` e,
 * sem ele, a página inteira abria sem nível 1 (Q-5 do review de 2026-08-12).
 *
 * As asserções são sobre EXISTIR um `h1` e ser um só; o texto entra só onde ele
 * é o que muda entre visível e escondido.
 */

afterEach(() => {
  cleanup()
})

describe('DetailHeader sempre tem um nível 1', () => {
  it('emite exatamente um h1 com o título visível', () => {
    const { container } = render(<DetailHeader title="Presupuesto 12" subtitle="Enel" />)

    expect(container.querySelectorAll('h1')).toHaveLength(1)
    expect(container.querySelector('h1')?.textContent).toBe('Presupuesto 12')
    expect(container.querySelector('h1')?.className).not.toContain('sr-only')
  })

  it('com titleHidden continua emitindo o h1, só que fora da tela', () => {
    const { container } = render(<DetailHeader title="Cargando..." titleHidden />)

    const h1 = container.querySelector('h1')
    expect(container.querySelectorAll('h1')).toHaveLength(1)
    expect(h1?.textContent).toBe('Cargando...')
    // `sr-only` é o que mantém o esqueleto de carga intacto: o cabeçalho existe
    // para o leitor de tela e não desenha um segundo título na tela.
    expect(h1?.className).toContain('sr-only')
  })

  it('não abre outro nível de cabeçalho abaixo do h1', () => {
    const { container } = render(
      <DetailHeader title="Turma 7" subtitle="Enel" tags={<span>Activa</span>} />,
    )

    expect(container.querySelectorAll('h2, h3, h4, h5, h6')).toHaveLength(0)
  })
})
