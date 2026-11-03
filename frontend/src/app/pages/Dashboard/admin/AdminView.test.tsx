import { describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '@shared/testing/providers'
import type { AdminDashboardData, DashboardVisibilityData, TurmaComplianceData } from '@shared/types/generated'
import { AdminView } from './AdminView'

vi.mock('react-i18next', async (importOriginal) => {
  const { mockUseTranslation } = await import('@shared/testing/i18n')
  return {
    ...(await importOriginal<typeof import('react-i18next')>()),
    useTranslation: mockUseTranslation(),
  }
})

const ABERTO: DashboardVisibilityData = { operation: true, commercial: true, certification: true, identity: true }

function admin(over: Partial<AdminDashboardData> = {}): AdminDashboardData {
  return {
    view: 'admin',
    visibility: ABERTO,
    kpis: {
      turmas_em_andamento: 0,
      turmas_encerrando_em_breve: 0,
      turmas_atrasadas: 0,
      conclusoes_por_confirmar: 0,
      cotacoes: { pending_count: 0, pending_value_uf: '0.0000' },
      certificados_a_emitir: 0,
    },
    pendencias: [],
    alertas: [],
    pipeline: [],
    agenda: { starting_soon: [], ending_soon: [], in_progress: [], overdue: [] },
    compliance_turmas: [],
    redatores: [],
    series: null,
    rankings: null,
    period_start: '2025-08-15',
    period_end: '2026-08-15',
    ...over,
  }
}

const TURMA: TurmaComplianceData = {
  turma_id: 7,
  course_name: 'Operación de Subestaciones',
  redatores: [],
  start_date: '2026-08-10',
  end_date: '2026-08-18',
  present_types: [],
  missing_types: [],
  missing_requirements: ['redator'],
  habilitada: false,
}

function montar(data: AdminDashboardData) {
  return renderWithProviders(
    <AdminView
      data={data}
      preset="last12"
      period={{ start: data.period_start, end: data.period_end }}
      staleError={null}
      onPresetChange={() => {}}
      onPeriodChange={() => {}}
    />,
    { route: '/' },
  )
}

/**
 * Critério 5: a seção do Cumplimiento é decidida pela visibilidade, nunca pela
 * presença do dado. Gate aberto com lista vazia é "sem dados" no card; gate
 * fechado some, tenha ou não dado no payload.
 */
describe('AdminView — seção de compliance', () => {
  it('com operação visível e `compliance_turmas` vazia, mostra o card com o vazio, não o esconde', () => {
    montar(admin({ compliance_turmas: [] }))

    expect(screen.getByText('dashboard.compliance.title')).toBeTruthy()
    expect(screen.getByText('dashboard.compliance.empty')).toBeTruthy()
  })

  it('com operação fechada e dado ausente, a seção não existe', () => {
    montar(admin({ visibility: { ...ABERTO, operation: false }, compliance_turmas: null }))

    expect(screen.queryByText('dashboard.compliance.title')).toBeNull()
    expect(screen.queryByText('dashboard.section.compliance')).toBeNull()
  })

  it('com operação fechada, a seção não existe nem se o payload trouxer linhas', () => {
    montar(admin({ visibility: { ...ABERTO, operation: false }, compliance_turmas: [TURMA] }))

    expect(screen.queryByText('dashboard.compliance.title')).toBeNull()
    expect(screen.queryByText('Operación de Subestaciones')).toBeNull()
  })
})
