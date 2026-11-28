import { cloneElement } from 'react'
import type { ReactElement } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'

// O jsdom não mede layout e o `ResponsiveContainer` não desenha nada sem
// tamanho: o stub devolve o filho com largura e altura fixas para o SVG existir.
vi.mock('recharts', async (importOriginal) => ({
  ...(await importOriginal<typeof import('recharts')>()),
  ResponsiveContainer: ({ children }: { children: ReactElement<{ width?: number; height?: number }> }) =>
    cloneElement(children, { width: 600, height: 260 }),
}))

import { AppLineChart } from './AppLineChart'

const SERIES = [
  {
    key: 'a',
    label: 'Iniciadas',
    points: [
      { x: '2026-07', y: 2 },
      { x: '2026-08', y: 0 },
    ],
  },
  {
    key: 'b',
    label: 'Concluídas',
    points: [
      { x: '2026-07', y: 1 },
      { x: '2026-08', y: 3 },
    ],
  },
  {
    key: 'c',
    label: 'Terceira',
    points: [
      { x: '2026-07', y: 1 },
      { x: '2026-08', y: 3 },
    ],
  },
  {
    key: 'd',
    label: 'Quarta',
    points: [
      { x: '2026-07', y: 1 },
      { x: '2026-08', y: 3 },
    ],
  },
]

const renderChart = () =>
  render(<AppLineChart series={SERIES} ariaLabel="Turmas por mês" xLabel="Mês" formatX={(x) => `mês ${x}`} />)

describe('AppLineChart', () => {
  it('wrapper não tem role img', () => {
    renderChart()

    expect(screen.queryByRole('img')).toBeNull()
  })

  it('cada série tem traço próprio, no gráfico e na legenda', async () => {
    const { container } = renderChart()
    const curvas = () => Array.from(container.querySelectorAll('path.recharts-line-curve'))

    // Enquanto a animação de entrada roda, o Recharts sobrescreve o dasharray
    // com o do desenho progressivo ("0px 0px"): só o valor final é o da série.
    await waitFor(
      () => expect(curvas().every((p) => !p.getAttribute('stroke-dasharray')?.includes('0px'))).toBe(true),
      {
        timeout: 8000,
      },
    )
    const traco = curvas().map((p) => p.getAttribute('stroke-dasharray') ?? '')
    // A ordem dos `path` no DOM é a de empilhamento do Recharts, não a das
    // séries: aqui o que vale é que os quatro traços são distintos e são os da
    // tabela fixa.
    expect([...traco].sort()).toEqual(['', '2 3', '6 3', '8 3 2 3'])

    // A legenda (o Recharts a ordena por nome) casa cada rótulo com o traço da
    // POSIÇÃO da série: o marcador de "Concluídas", a 2ª, é o '6 3'.
    const legenda = Object.fromEntries(
      Array.from(container.querySelectorAll('ul[role="list"] li')).map((li) => [
        li.textContent,
        li.querySelector('line')?.getAttribute('stroke-dasharray') ?? '',
      ]),
    )
    expect(legenda).toEqual({ Iniciadas: '', Concluídas: '6 3', Terceira: '2 3', Quarta: '8 3 2 3' })
  }, 10_000)

  it('o desenho aria-hidden não tem elemento focável nem role application', () => {
    const { container } = renderChart()

    const escondido = container.querySelector('[aria-hidden="true"]') as HTMLElement
    // O SVG tem de existir, senão a ausência de foco não prova nada.
    expect(escondido.querySelector('svg')).toBeTruthy()
    // `tabindex="-1"` (portais de z-index e caixa do tooltip do Recharts) fica fora
    // da ordem de tabulação, e o axe `aria-hidden-focus` o aceita: o que vale é a
    // sequência de Tab, então qualquer tabindex diferente de -1 reprova.
    expect(escondido.querySelectorAll('[tabindex]:not([tabindex="-1"])')).toHaveLength(0)
    expect(escondido.querySelectorAll('[role="application"]')).toHaveLength(0)
  })

  it('expõe tabela acessível com os dados das séries', () => {
    renderChart()

    const tabela = screen.getByRole('table', { name: 'Turmas por mês' })
    expect(
      within(tabela)
        .getAllByRole('columnheader')
        .map((c) => c.textContent),
    ).toEqual(['Mês', 'Iniciadas', 'Concluídas', 'Terceira', 'Quarta'])
    const linhas = within(tabela).getAllByRole('row').slice(1)
    expect(Array.from(linhas[0].children).map((c) => c.textContent)).toEqual(['mês 2026-07', '2', '1', '1', '1'])
    // O zero da janela vira "0" na tabela, não célula vazia.
    expect(Array.from(linhas[1].children).map((c) => c.textContent)).toEqual(['mês 2026-08', '0', '3', '3', '3'])
  })
})
