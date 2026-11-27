import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { AppBarChart } from './AppBarChart'

const barras = (n: number) => Array.from({ length: n }, (_, i) => ({ label: `Curso ${i + 1}`, value: i + 1 }))

/** O desenho (SVG) é o único filho `aria-hidden` do wrapper. */
const desenho = (container: HTMLElement) => container.querySelector('[aria-hidden="true"]') as HTMLElement

describe('AppBarChart', () => {
  it('wrapper não tem role img: o nome e os dados vêm da tabela', () => {
    render(<AppBarChart data={barras(3)} ariaLabel="Ranking" valueLabel="Turmas" categoryLabel="Curso" />)

    expect(screen.queryByRole('img')).toBeNull()
  })

  it('expõe tabela acessível com as mesmas barras, nomeada pelo ariaLabel', () => {
    render(
      <AppBarChart
        data={barras(3)}
        ariaLabel="Ranking"
        valueLabel="Turmas"
        categoryLabel="Curso"
        formatValue={(v) => `${v} u`}
      />,
    )

    const tabela = screen.getByRole('table', { name: 'Ranking' })
    expect(
      within(tabela)
        .getAllByRole('columnheader')
        .map((c) => c.textContent),
    ).toEqual(['Curso', 'Turmas'])
    const linhas = within(tabela).getAllByRole('row').slice(1)
    expect(linhas.map((l) => Array.from(l.children).map((c) => c.textContent))).toEqual([
      ['Curso 1', '1 u'],
      ['Curso 2', '2 u'],
      ['Curso 3', '3 u'],
    ])
  })

  it('a altura cresce com o número de barras, com piso de 120px', () => {
    const poucas = render(<AppBarChart data={barras(2)} ariaLabel="A" valueLabel="V" categoryLabel="C" />)
    expect(desenho(poucas.container).style.height).toBe('120px')
    poucas.unmount()

    const dez = render(<AppBarChart data={barras(10)} ariaLabel="B" valueLabel="V" categoryLabel="C" />)
    expect(desenho(dez.container).style.height).toBe('260px')
  })

  it('o desenho some da árvore de acessibilidade (a tabela o substitui)', () => {
    const { container } = render(<AppBarChart data={barras(3)} ariaLabel="A" valueLabel="V" categoryLabel="C" />)

    expect(desenho(container)).toBeTruthy()
    expect(desenho(container).contains(screen.getByRole('table', { name: 'A', hidden: true }))).toBe(false)
  })
})
