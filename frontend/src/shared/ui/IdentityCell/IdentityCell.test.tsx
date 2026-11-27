import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { IdentityCell } from './IdentityCell'

/**
 * O que se prova aqui é o contrato que os 14 sítios consomem: a estrutura das
 * duas formas, e a AUSÊNCIA de descrição — que é a guarda de que o
 * EnrollmentTable depende quando o e-mail é null (spec D8). Sem ela, a célula
 * abriria uma segunda linha vazia e a altura da linha da tabela oscilaria
 * entre os alunos com e sem e-mail.
 */

describe('IdentityCell', () => {
  it('na forma padrão empilha título e descrição em duas linhas truncadas', () => {
    const { container } = render(<IdentityCell title="Juan Soto" description="juan@lotus.cl" />)

    const linhas = container.querySelectorAll('span.truncate')
    expect(linhas).toHaveLength(2)
    expect(linhas[0].textContent).toBe('Juan Soto')
    expect(linhas[1].textContent).toBe('juan@lotus.cl')
  })

  it('sem descrição não abre a segunda linha', () => {
    const { container } = render(<IdentityCell title="Juan Soto" />)

    expect(container.querySelectorAll('span.truncate')).toHaveLength(1)
    expect(screen.queryByText('juan@lotus.cl')).toBeNull()
  })

  /** `description={null}` é o que o EnrollmentTable passa quando `email` é
   * null — vindo do DTO, não de uma prop omitida. */
  it('com descrição null também não abre a segunda linha', () => {
    const { container } = render(<IdentityCell title="Juan Soto" description={null} />)

    expect(container.querySelectorAll('span.truncate')).toHaveLength(1)
  })

  /** O que trunca tem de expor o valor inteiro (A-2). O `title` sozinho só
   * existe no hover do mouse: teclado e leitor de tela não o alcançam. Isto NÃO
   * prova a largura — o jsdom não faz layout —, prova o caminho de recuperação. */
  it('nome truncado tem o texto completo acessível, por nome e por foco', async () => {
    render(<IdentityCell title="Compañía General de Electricidad" description="76.123.456-7" />)

    const celula = screen.getByRole('group', { name: 'Compañía General de Electricidad, 76.123.456-7' })
    expect(celula.tabIndex).toBe(0)

    fireEvent.focus(celula)

    const dica = await waitFor(() => {
      const el = document.querySelector<HTMLElement>('.p-tooltip')
      expect(el).not.toBeNull()
      return el!
    })
    expect(dica.textContent).toBe('Compañía General de Electricidad, 76.123.456-7')
  })

  it('o mouse também abre a dica com o texto completo', async () => {
    render(<IdentityCell title="Compañía General de Electricidad" />)

    fireEvent.mouseEnter(screen.getByRole('group', { name: 'Compañía General de Electricidad' }))

    const dica = await waitFor(() => {
      const el = document.querySelector<HTMLElement>('.p-tooltip')
      expect(el).not.toBeNull()
      return el!
    })
    expect(dica.textContent).toBe('Compañía General de Electricidad')
  })

  /** WCAG 1.4.13: conteúdo que aparece em foco/hover precisa poder ser dispensado
   * sem mover o ponteiro nem o foco. O Tooltip do Prime nasce com Esc desligado. */
  it('a dica fecha com Esc, sem tirar o foco da célula', async () => {
    render(<IdentityCell title="Compañía General de Electricidad" />)
    const celula = screen.getByRole('group', { name: 'Compañía General de Electricidad' })
    celula.focus()
    fireEvent.focus(celula)
    await waitFor(() => expect(document.querySelector('.p-tooltip')).not.toBeNull())

    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape', keyCode: 27 })

    await waitFor(() => expect(document.querySelector('.p-tooltip')).toBeNull())
    expect(document.activeElement).toBe(celula)
  })

  /** Dica nativa E dica do Prime no mesmo hover seriam duas caixas. */
  it('não deixa o `title` nativo duplicar a dica', () => {
    const { container } = render(<IdentityCell title="Juan Soto" description="juan@lotus.cl" />)

    expect(container.querySelector('[title]')).toBeNull()
  })

  /** O `RedatorCard` passa `<span className="font-mono">{rut}</span>`: sem a
   * guarda de tipo o nome diria `[object Object]`, pior que nome nenhum. */
  it('não inventa texto quando a descrição não é string', () => {
    render(
      <IdentityCell title="Juan Soto" description={<span className="font-mono">76.123.456-7</span>} />,
    )

    expect(screen.getByRole('group', { name: 'Juan Soto' })).toBeTruthy()
  })

  /** Dentro de um controle interativo (o `<button aria-pressed>` do
   * `AppSelectableCard`) um filho focável é HTML inválido: leitor de tela lê
   * botão e grupo em duplicidade e a dica abriria dentro do botão. Sem o foco,
   * a recuperação do corte volta a ser o `title`, como antes de A-2. */
  it('com `focusable={false}` não vira parada de Tab, nem grupo, nem abre dica', async () => {
    const { container } = render(
      <IdentityCell focusable={false} title="Compañía General de Electricidad" description="76.123.456-7" />,
    )

    expect(screen.queryByRole('group')).toBeNull()
    expect(container.querySelector('[tabindex]')).toBeNull()

    fireEvent.mouseEnter(container.querySelector('span.truncate')!)
    await new Promise((r) => setTimeout(r, 50))
    expect(document.querySelector('.p-tooltip')).toBeNull()
  })

  it('com `focusable={false}` o texto inteiro volta ao `title` das linhas que truncam', () => {
    const { container } = render(
      <IdentityCell focusable={false} title="Compañía General de Electricidad" description="76.123.456-7" />,
    )

    const linhas = container.querySelectorAll('span.truncate')
    expect(linhas[0].getAttribute('title')).toBe('Compañía General de Electricidad')
    expect(linhas[1].getAttribute('title')).toBe('76.123.456-7')
  })

  it('na forma inline não trunca, e mantém título e descrição na mesma linha', () => {
    const { container } = render(
      <IdentityCell title="Enel Chile" description="RUT 76.123.456-7" inline />,
    )

    expect(container.querySelectorAll('span.truncate')).toHaveLength(0)
    expect(container.textContent).toContain('Enel Chile')
    expect(container.textContent).toContain('RUT 76.123.456-7')
  })

  /** O avatar do Prime é um `<div>`: embrulhá-lo num `<span>` é o mesmo HTML
   * inválido que a D7 tirou do subtítulo do DetailHeader. */
  it('na forma inline o container é elemento de fluxo, não fraseado', () => {
    const { container } = render(<IdentityCell title="Enel Chile" inline />)

    expect(container.firstElementChild?.tagName).toBe('DIV')
  })

  /** O avatar ILUSTRA o título que vem ao lado. Sem `aria-hidden` o leitor de
   * tela anuncia o nome duas vezes por linha — em 13 tabelas. */
  it('esconde o avatar do leitor de tela nas duas formas', () => {
    const { container: empilhado } = render(<IdentityCell title="Juan Soto" />)
    const { container: inline } = render(<IdentityCell title="Juan Soto" inline />)

    expect(empilhado.querySelector('[aria-hidden="true"]')?.textContent).toBe('JS')
    expect(inline.querySelector('[aria-hidden="true"]')?.textContent).toBe('JS')
  })

  it('sem imagem cai nas iniciais do título', () => {
    render(<IdentityCell title="Juan Soto" description="juan@lotus.cl" />)

    expect(screen.getByText('JS')).toBeTruthy()
  })

  it('com imagem renderiza o <img> com o título como alt', () => {
    render(<IdentityCell title="Juan Soto" image="https://exemplo.cl/foto.jpg" />)

    const img = screen.getByAltText('Juan Soto') as HTMLImageElement
    expect(img.tagName).toBe('IMG')
    expect(img.src).toBe('https://exemplo.cl/foto.jpg')
  })

  /** O TurmaDetailPage passa um AppButton como descrição; o RedatorCard passa
   * o RUT em mono. Se a prop fosse `string`, os dois voltariam a escrever
   * markup à mão no sítio. */
  it('aceita ReactNode na descrição', () => {
    render(
      <IdentityCell title="Enel Chile" description={<span className="font-mono">76.123.456-7</span>} />,
    )

    const rut = screen.getByText('76.123.456-7')
    expect(rut.tagName).toBe('SPAN')
    expect(rut.className).toContain('font-mono')
  })

  /**
   * Herança da P-41. O `truncate` das duas linhas só EXISTE por causa do
   * `min-w-0` do bloco de texto: item de flex nasce com `min-width: auto` e não
   * encolhe abaixo do próprio conteúdo, então o texto empurrava a célula e o
   * corte nunca acontecia — CLIENTE media 249px e REDATOR 263px na tabela de
   * turmas, 45% da largura, com a largura declarada na coluna sem efeito
   * nenhum (UI-02 de 2026-08-22).
   *
   * O par é o contrato, e este teste guarda o par. O que ele NÃO faz é medir:
   * jsdom não tem layout, `scrollWidth` e `clientWidth` são sempre 0. A medida
   * de `scrollWidth > clientWidth` acontece no navegador e vive em `audits/`
   * (spec §4.5) — dito aqui para ninguém supor cobertura que não existe.
   */
  it('a forma empilhada mantém o par min-w-0 + truncate', () => {
    const { container } = render(<IdentityCell title="Juan Soto" description="juan@lotus.cl" />)

    const blocoDeTexto = container.querySelector('.min-w-0')
    expect(blocoDeTexto, 'sem min-w-0 o truncate das linhas não corta nada').toBeTruthy()
    expect(blocoDeTexto?.querySelectorAll('span.truncate')).toHaveLength(2)
  })

  /** A forma inline NÃO trunca de propósito: ela carrega nó arbitrário (botão,
   * tag), e `truncate` cortaria o nó em vez do texto. */
  it('a forma inline não trunca nem declara min-w-0', () => {
    const { container } = render(<IdentityCell title="Enel Chile" description="RUT 76.123.456-7" inline />)

    expect(container.querySelectorAll('span.truncate')).toHaveLength(0)
    expect(container.querySelector('.min-w-0')).toBeNull()
  })
})

/**
 * jsdom não faz layout: `getBoundingClientRect` devolve zero e não há como
 * medir a elipse aqui. O que se prova é a TRAVA — a classe que impede o avatar
 * de ceder largura —, que é o que alguém apagaria por engano ao mexer no
 * flex da célula.
 */
describe('IdentityCell — o avatar não cede largura para o texto', () => {
  it('na forma empilhada, o avatar não encolhe', () => {
    const { container } = render(<IdentityCell title="Subestación Norte" description="76.123.456-0" />)

    expect(container.querySelector('.p-avatar')?.className).toContain('shrink-0')
  })

  it('na forma inline também', () => {
    const { container } = render(<IdentityCell inline title="Subestación Norte" description="76.123.456-0" />)

    expect(container.querySelector('.p-avatar')?.className).toContain('shrink-0')
  })
})

