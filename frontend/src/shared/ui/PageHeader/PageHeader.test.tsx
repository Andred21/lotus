import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { PageHeader } from './PageHeader'
import { DetailHeader } from '../DetailHeader'
import { pageTitleClass } from '../typography'

/**
 * O título de página é `h1` porque estes dois componentes são os donos únicos
 * do título desde a UI-05 de 2026-08-11 — quando o `h1` saiu do Header,
 * ninguém assumiu o nível 1 e toda rota autenticada passou a abrir a árvore de
 * cabeçalhos no nível 2 (UI-02 do review de 2026-08-12).
 *
 * As asserções são sobre o NÍVEL do cabeçalho, não sobre o texto: o texto já
 * aparecia certo com `h2`, e é por isso que a jornada visual não viu nada.
 */

afterEach(() => {
  cleanup()
})

describe('dono do título de página', () => {
  it('PageHeader renderiza o título como h1, e é o único cabeçalho', () => {
    const { container } = render(<PageHeader title="Personas" description="Instructores" />)

    expect(container.querySelector('h1')?.textContent).toBe('Personas')
    expect(container.querySelectorAll('h2, h3, h4, h5, h6')).toHaveLength(0)
  })

  it('DetailHeader renderiza o título como h1 (página de detalhe tem o mesmo dono)', () => {
    const { container } = render(<DetailHeader title="Presupuesto 12" subtitle="Enel" />)

    expect(container.querySelector('h1')?.textContent).toBe('Presupuesto 12')
    expect(container.querySelectorAll('h2, h3, h4, h5, h6')).toHaveLength(0)
  })
})

/**
 * Os dois donos do `h1` tinham vozes diferentes: `font-display … tracking-tight`
 * aqui, `text-2xl font-bold` no detalhe (achado A1). Título de página é um papel
 * só; duas grafias fazem a mesma tela mudar de voz ao navegar para o detalhe.
 */
describe('voz única do título de página', () => {
  it.each([
    ['PageHeader', <PageHeader title="Personas" />],
    ['DetailHeader', <DetailHeader title="Presupuesto 12" />],
  ])('%s escreve o h1 com a grafia compartilhada', (_nome, elemento) => {
    const { container } = render(elemento)

    expect(container.querySelector('h1')?.className).toContain(pageTitleClass)
  })

  /**
   * A margem cravada em `em` era o valor que o agente do usuário dava ao `h2`,
   * mantida enquanto o `h1` não era unificado (D6 da spec do item 8). Unificar
   * é o momento que o audit reservou (E2): a margem passa a ser degrau da
   * escala. A superior some — o mini-reset de `index.css` zera `h1..h6`, e o
   * espaçamento acima passa a ser do contêiner.
   */
  it.each([
    ['PageHeader', <PageHeader title="Personas" />],
    ['DetailHeader', <DetailHeader title="Presupuesto 12" />],
  ])('%s não carrega mais a margem do agente do usuário', (_nome, elemento) => {
    const { container } = render(elemento)

    const h1 = container.querySelector('h1')!
    expect(h1.className).not.toContain('my-[0.83em]')
    expect(h1.className).toContain('mb-4')
  })
})
