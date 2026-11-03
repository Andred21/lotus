import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
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

const COM_DADO: SeriesData = {
  turmas_iniciadas: [{ month: '2026-07', count: 2 }],
  turmas_concluidas: [{ month: '2026-07', count: 1 }],
  certificados_emitidos: [{ month: '2026-08', count: 1 }],
  matriculas: [{ month: '2026-08', count: 2 }],
  uf_aprovada: [{ month: '2026-07', total_uf: '400.0000' }],
}

const VAZIA: SeriesData = {
  turmas_iniciadas: [],
  turmas_concluidas: [],
  certificados_emitidos: [],
  matriculas: [],
  uf_aprovada: [],
}

const GRAFICO_UF = { name: 'dashboard.series.ufTitle' }
const GRAFICO_CONTAGENS = { name: 'dashboard.series.countsTitle' }

describe('SeriesPanel — gate fechado', () => {
  it('sem o módulo comercial não desenha o gráfico de UF, mesmo com a série preenchida', () => {
    render(<SeriesPanel series={COM_DADO} visibility={{ ...ABERTO, commercial: false }} />)

    expect(screen.queryByRole('img', GRAFICO_UF)).toBeNull()
    expect(screen.queryByText('dashboard.series.ufTitle')).toBeNull()
    // O gate tira o que é comercial, não degrada o resto: as contagens seguem.
    expect(screen.getByRole('img', GRAFICO_CONTAGENS)).toBeTruthy()
  })

  it('o gráfico de UF existe quando o comercial está aberto e a série tem pontos', () => {
    render(<SeriesPanel series={COM_DADO} visibility={ABERTO} />)

    expect(screen.getByRole('img', GRAFICO_UF)).toBeTruthy()
  })
})

describe('SeriesPanel — gate aberto e coleção vazia', () => {
  it('com os três módulos abertos e toda série vazia, mostra "sem dados" e não esconde o card', () => {
    render(<SeriesPanel series={VAZIA} visibility={ABERTO} />)

    // Um vazio por card: as contagens e a UF.
    expect(screen.getAllByText('dashboard.series.empty')).toHaveLength(2)
    expect(screen.queryByRole('img', GRAFICO_CONTAGENS)).toBeNull()
    expect(screen.queryByRole('img', GRAFICO_UF)).toBeNull()
  })
})
