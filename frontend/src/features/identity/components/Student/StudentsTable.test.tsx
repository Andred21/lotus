import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@shared/testing/providers'
import { setViewportWidth } from '@shared/testing/viewport'
import type { ServerTable } from '@shared/hooks'
import type { StudentData } from '@shared/types/generated'
import { StudentsTable } from './StudentsTable'

vi.mock('react-i18next', async (importOriginal) => {
  const { mockUseTranslation } = await import('@shared/testing/i18n')
  return {
    ...(await importOriginal<typeof import('react-i18next')>()),
    useTranslation: mockUseTranslation(),
  }
})

const ALUNO = {
  id: 1, name: 'Antonia Aguilera', email: 'antonia@lotus.cl', rut: '11.111.111-1',
  photo_url: null, current_client_name: null, enrollments_count: 2,
} as unknown as StudentData

const tabela: ServerTable<StudentData> = {
  filter: '', term: '', filtering: false, filteredByScope: false, rows: [ALUNO], first: 0,
  onFilterChange: () => {}, onPage: () => {}, resetPage: () => {}, clear: () => {},
  totalRecords: 1, meta: undefined, sortField: undefined, sortOrder: null, onSort: () => {},
  loading: false, error: null, refetch: () => Promise.resolve(),
}

/** Q-1 do review de 2026-09-26 (UI-01 de Pessoas, a metade leve): em 390x844 a
 * coluna presa de 6rem cobria a cauda do nome em Alumnos. Uma ação só (Ver),
 * então nada colapsa — a coluna encolhe para o botão. */
describe('StudentsTable — coluna de ações no telefone (UI-01)', () => {
  const larguraDaColunaDeAcoes = () =>
    (document.querySelector('thead tr th:last-child') as HTMLTableCellElement).style.width

  it('em 390px a coluna presa encolhe para o botão', () => {
    setViewportWidth(390)
    renderWithProviders(<StudentsTable table={tabela} onView={() => {}} />)
    expect(larguraDaColunaDeAcoes()).toBe('4.5rem')
  })

  it('no desktop mantém os 6rem', () => {
    renderWithProviders(<StudentsTable table={tabela} onView={() => {}} />)
    expect(larguraDaColunaDeAcoes()).toBe('6rem')
  })
})
