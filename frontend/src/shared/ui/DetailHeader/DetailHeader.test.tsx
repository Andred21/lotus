import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
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

/**
 * Q-1 do review de 2026-08-25. `sm:self-center` existe para o slot `actions` —
 * botão mais alto que a tag, alinhado pela linha de base, empurrava o bloco para
 * cima (Minor 5 da fatia 1). Enquanto os dois slots dividiam um contêiner, o
 * `align-self` valia para o contêiner INTEIRO e levava a tag junto: o UI-08 de
 * 2026-08-23 de volta, espelhado, no `BudgetDetailPage` — o único consumidor que
 * passa `tags` e `actions` ao mesmo tempo.
 *
 * jsdom não mede layout, então o que se assere é a estrutura que produz a
 * geometria, como no S-2 acima: wrappers SEPARADOS, e o `self-center` só no de
 * ações. Asserir "existe um `.sm:self-center` na árvore" — o que a versão
 * anterior deste teste fazia — passava com os dois slots no mesmo contêiner, que
 * é exatamente o defeito.
 */
describe('alinhamento do bloco da direita', () => {
  it('so o bloco de acoes sai da linha de base; a tag fica nela', () => {
    const { container } = render(
      <DetailHeader
        title="Presupuesto 12"
        tags={<span data-testid="tag">Aprobado</span>}
        actions={<button>Editar</button>}
      />,
    )
    const tag = container.querySelector('[data-testid="tag"]')?.parentElement
    const acoes = container.querySelector('button')?.parentElement

    expect(tag).not.toBe(acoes)
    expect(tag?.className).not.toContain('self-center')
    expect(acoes?.className).toContain('sm:self-center')
  })

  it('sem acoes, nada sai da linha de base', () => {
    const { container } = render(<DetailHeader title="Turma" tags={<span>tag</span>} />)

    expect(container.querySelector('.sm\\:self-center')).toBeNull()
  })

  /**
   * O `self-center` só significa alguma coisa se os dois wrappers forem itens da
   * MESMA linha do título. O embrulho de mobile fica no caminho, e é o
   * `sm:contents` que o dissolve a partir do `sm` — sem ele, o `align-self`
   * resolveria contra o embrulho e não contra a linha.
   */
  it('a partir do sm os dois wrappers viram itens diretos da linha', () => {
    const { container } = render(
      <DetailHeader title="Turma" tags={<span>tag</span>} actions={<button>Editar</button>} />,
    )
    const embrulho = container.querySelector('button')?.parentElement?.parentElement

    expect(embrulho?.className).toContain('sm:contents')
    expect(embrulho?.parentElement?.className).toContain('sm:items-baseline')
  })
})

/**
 * O "Voltar" vestia o MESMO variant de marca da ação primária que ele antecede
 * (achado B2): em `BudgetDetailPage` o cabeçalho abria com dois botões de marca
 * lado a lado, e a hierarquia dizia que sair e agregar cotação pesam igual.
 * Navegação de volta é ação terciária.
 */
it('o "Voltar" não veste a marca — é ação terciária', () => {
  const { container } = render(
    <DetailHeader title="Presupuesto 12" back={{ label: 'Volver', onClick: () => {} }} />,
  )

  const voltar = screen.getByRole('button', { name: /Volver/ })
  expect(voltar.className).not.toContain('border-[var(--brand-ink)]')
  expect(voltar.className).toContain('p-button-text')
  expect(container.querySelector('.pi-arrow-left')).not.toBeNull()
  // A tinta secundária sobe para a do corpo no hover. Por `className` com
  // variável, e não por `style` inline: `style` não expressa `:hover`, e um
  // comentário prometendo o que a grafia não faz é a próxima leitura errada.
  expect(voltar.className).toContain('hover:text-[var(--text-color)]')
})
