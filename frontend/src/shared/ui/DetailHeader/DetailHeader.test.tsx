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

  /**
   * S-2 do re-review de 2026-08-12. `sr-only` é `position: absolute`: fora do
   * fluxo, mas ainda um ITEM do flex se estiver dentro da linha — e o `gap-4`
   * da raiz conta entre itens independente de altura, o que abria 1rem de
   * espaço morto acima do esqueleto e do cartão de erro. jsdom não mede layout,
   * então o que se assere é a estrutura que produz a geometria: escondido, o
   * `h1` é filho DIRETO da raiz e a linha vazia não existe.
   */
  it('com titleHidden e nada mais, o h1 não fica dentro de uma linha vazia', () => {
    const { container } = render(
      <DetailHeader title="Cargando..." titleHidden back={{ label: 'Volver', onClick: () => {} }} />,
    )
    const raiz = container.firstElementChild

    expect(container.querySelector('h1')?.parentElement).toBe(raiz)
    expect([...(raiz?.children ?? [])].map((e) => e.tagName)).toEqual(['BUTTON', 'H1'])
  })

  it('não abre outro nível de cabeçalho abaixo do h1', () => {
    const { container } = render(
      <DetailHeader title="Turma 7" subtitle="Enel" tags={<span>Activa</span>} />,
    )

    expect(container.querySelectorAll('h2, h3, h4, h5, h6')).toHaveLength(0)
  })
})

describe('DetailHeader aceita bloco no subtítulo', () => {
  /**
   * O Avatar do PrimeReact renderiza sempre um <div> (avatar.cjs.js:254), e a
   * célula de identidade inline vai dentro do subtítulo. <div> dentro de <p> é
   * inválido: o parser fecha o <p> antes e o DOM se reorganiza em silêncio.
   * O TurmaDetailPage já passava um <div> aqui antes deste bloco.
   */
  it('não embrulha o subtítulo em <p>', () => {
    const { container } = render(
      <DetailHeader title="Turma 7" subtitle={<div data-testid="bloco">Enel</div>} />,
    )

    expect(container.querySelector('p')).toBeNull()
    expect(container.querySelector('[data-testid="bloco"]')?.parentElement?.tagName).toBe('DIV')
  })
})

describe('alinhamento do bloco da direita', () => {
  it('o bloco com acoes sai da linha de base; so tags continuam nela', () => {
    const { rerender, container } = render(<DetailHeader title="Turma" tags={<span>tag</span>} />)
    expect(container.querySelector('.sm\\:self-center')).toBeNull()

    rerender(<DetailHeader title="Turma" tags={<span>tag</span>} actions={<button>Editar</button>} />)
    expect(container.querySelector('.sm\\:self-center')).not.toBeNull()
  })
})
