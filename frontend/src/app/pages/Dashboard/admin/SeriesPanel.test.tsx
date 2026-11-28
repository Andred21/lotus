import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import type { DashboardVisibilityData, SeriesData } from '@shared/types/generated'
import { SeriesPanel } from './SeriesPanel'

vi.mock('react-i18next', async (importOriginal) => {
  const { mockUseTranslation } = await import('@shared/testing/i18n')
  return {
    ...(await importOriginal<typeof import('react-i18next')>()),
    useTranslation: mockUseTranslation(),
  }
})

const ABERTO: DashboardVisibilityData = { operation: true, commercial: true, certification: true, identity: true }

/** A janela que o backend manda: 13 meses, `0` onde não houve registro. */
const MESES = Array.from(
  { length: 13 },
  (_, i) => `${2025 + Math.floor((7 + i) / 12)}-${String(((7 + i) % 12) + 1).padStart(2, '0')}`,
)
const contagem = (valor = 0, mesComValor = MESES[0]) =>
  MESES.map((month) => ({ month, count: month === mesComValor ? valor : 0 }))
const uf = (total = '0.0000') => MESES.map((month, i) => ({ month, total_uf: i === 0 ? total : '0.0000' }))

const VAZIA: SeriesData = {
  turmas_iniciadas: contagem(),
  turmas_concluidas: contagem(),
  certificados_emitidos: contagem(),
  matriculas: contagem(),
  uf_aprovada: uf(),
}

const COM_DADO: SeriesData = {
  turmas_iniciadas: contagem(2),
  turmas_concluidas: contagem(1),
  certificados_emitidos: contagem(1),
  matriculas: contagem(2),
  uf_aprovada: uf('400.0000'),
}

const GRAFICO_UF = { name: 'dashboard.series.ufTitle' }
const GRAFICO_TURMAS = { name: 'dashboard.series.turmasTitle' }
const GRAFICO_ALUMNOS = { name: 'dashboard.series.alumnosTitle' }

describe('SeriesPanel — gate fechado', () => {
  it('sem o módulo comercial não desenha o gráfico de UF, mesmo com a série preenchida', () => {
    render(<SeriesPanel series={COM_DADO} visibility={{ ...ABERTO, commercial: false }} />)

    expect(screen.queryByRole('table', GRAFICO_UF)).toBeNull()
    expect(screen.queryByText('dashboard.series.ufTitle')).toBeNull()
    // O gate tira o que é comercial, não degrada o resto: as contagens seguem.
    expect(screen.getByRole('table', GRAFICO_TURMAS)).toBeTruthy()
    expect(screen.getByRole('table', GRAFICO_ALUMNOS)).toBeTruthy()
  })

  it('o gráfico de UF existe quando o comercial está aberto e a série tem valor', () => {
    render(<SeriesPanel series={COM_DADO} visibility={ABERTO} />)

    expect(screen.getByRole('table', GRAFICO_UF)).toBeTruthy()
  })
})

describe('SeriesPanel — contagens em dois cards', () => {
  it('Clases e Alumnos são cards separados, com duas séries cada, mais o de UF', () => {
    render(<SeriesPanel series={COM_DADO} visibility={ABERTO} />)

    const cabecalhos = (nome: string) =>
      within(screen.getByRole('table', { name: nome }))
        .getAllByRole('columnheader')
        .map((c) => c.textContent)

    expect(cabecalhos('dashboard.series.turmasTitle').slice(1)).toEqual([
      'dashboard.series.turmas_iniciadas',
      'dashboard.series.turmas_concluidas',
    ])
    expect(cabecalhos('dashboard.series.alumnosTitle').slice(1)).toEqual([
      'dashboard.series.matriculas',
      'dashboard.series.certificados_emitidos',
    ])
    expect(screen.getAllByRole('table')).toHaveLength(3)
    expect(screen.queryByText('dashboard.series.countsTitle')).toBeNull()
  })

  it('sem certificação, o card de Alumnos segue só com as matrículas', () => {
    render(<SeriesPanel series={COM_DADO} visibility={{ ...ABERTO, certification: false }} />)

    const tabela = screen.getByRole('table', GRAFICO_ALUMNOS)
    expect(
      within(tabela)
        .getAllByRole('columnheader')
        .map((c) => c.textContent),
    ).toEqual(['dashboard.series.month', 'dashboard.series.matriculas'])
  })
})

describe('SeriesPanel — gate aberto e janela toda em zero', () => {
  it('com os módulos abertos e toda a janela em zero, mostra "sem dados" em cada card', () => {
    render(<SeriesPanel series={VAZIA} visibility={ABERTO} />)

    // Um vazio por card: Clases, Alumnos e UF.
    expect(screen.getAllByText('dashboard.series.empty')).toHaveLength(3)
    expect(screen.queryAllByRole('table')).toHaveLength(0)
  })

  it('cada card olha as próprias séries: só Clases com valor deixa Alumnos e UF vazios', () => {
    render(
      <SeriesPanel
        series={{ ...VAZIA, turmas_iniciadas: contagem(3), turmas_concluidas: contagem(0) }}
        visibility={ABERTO}
      />,
    )

    expect(screen.getByRole('table', GRAFICO_TURMAS)).toBeTruthy()
    expect(screen.getAllByText('dashboard.series.empty')).toHaveLength(2)
    expect(screen.queryByRole('table', GRAFICO_ALUMNOS)).toBeNull()
    expect(screen.queryByRole('table', GRAFICO_UF)).toBeNull()
  })

  it('um valor em qualquer mês da janela tira o card do vazio', () => {
    render(<SeriesPanel series={{ ...VAZIA, matriculas: contagem(4, MESES[12]) }} visibility={ABERTO} />)

    expect(screen.getByRole('table', GRAFICO_ALUMNOS)).toBeTruthy()
  })
})
