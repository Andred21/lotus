import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { IdentityCell } from './IdentityCell'

/**
 * O que se prova aqui é o contrato que os 14 sítios consomem: a estrutura das
 * duas formas, e a AUSÊNCIA de descrição — que é a guarda de que o
 * EnrollmentTable depende quando o e-mail é null (spec D8). Sem ela, a célula
 * abriria uma segunda linha vazia e a altura da linha da tabela oscilaria
 * entre os alunos com e sem e-mail.
 */

afterEach(() => {
  cleanup()
})

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

  /** Molde do `AppFileRow` (UI-01): o que trunca tem de expor o valor inteiro em
   * `title`, senão o corte é perda silenciosa. Isto NÃO prova a largura — o
   * jsdom não faz layout —, prova o caminho de recuperação, que é DOM. */
  it('expõe título e descrição inteiros em title, porque as duas linhas truncam', () => {
    const { container } = render(
      <IdentityCell title="Compañía General de Electricidad" description="76.123.456-7" />,
    )

    const linhas = container.querySelectorAll('span.truncate')
    expect(linhas[0].getAttribute('title')).toBe('Compañía General de Electricidad')
    expect(linhas[1].getAttribute('title')).toBe('76.123.456-7')
  })

  /** O `RedatorCard` passa `<span className="font-mono">{rut}</span>`: sem a
   * guarda de tipo o tooltip diria `[object Object]`, pior que tooltip nenhum. */
  it('não inventa title quando a descrição não é texto', () => {
    const { container } = render(
      <IdentityCell title="Juan Soto" description={<span className="font-mono">76.123.456-7</span>} />,
    )

    expect(container.querySelectorAll('span.truncate')[1].getAttribute('title')).toBeNull()
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
})
