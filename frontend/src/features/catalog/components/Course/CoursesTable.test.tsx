import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '@shared/testing/providers'
import { setViewportWidth } from '@shared/testing/viewport'
import { useSessionStore } from '@shared/stores/sessionStore'
import type { ArchiveMode } from '@shared/hooks'
import { CoursesTable, type CourseRow } from './CoursesTable'

vi.mock('react-i18next', async (importOriginal) => {
  const { mockUseTranslation } = await import('@shared/testing/i18n')
  return {
    ...(await importOriginal<typeof import('react-i18next')>()),
    useTranslation: mockUseTranslation(),
  }
})

const CURSO = {
  id: 1, name: 'Alta tensión', technical_name: 'AT-01', description: null, workload_hours: 16,
  templates: [], modules: [], redator_ids: [], modules_total_hours: 16,
  archived_at: '2026-09-01T10:00:00Z', archived_by: 'Admin Lotus',
} as unknown as CourseRow

function comPermissoes(permissions: string[]) {
  useSessionStore.setState({
    status: 'authenticated',
    user: {
      id: 1, uuid: 'u-1', name: 'Quien Sea', email: 'q@lotus.cl', type: 'admin',
      is_active: true, roles: [], permissions, photo_url: null,
    },
  })
}

const larguraDaColunaDeAcoes = () =>
  (document.querySelector('thead tr th:last-child') as HTMLTableCellElement).style.width

const montar = (mode: ArchiveMode) =>
  renderWithProviders(
    <CoursesTable
      courses={[CURSO]} loading={false} onView={() => {}} mode={mode} onModeChange={() => {}}
      onArchive={() => {}} onRestore={() => {}} busy={false}
    />,
  )

afterEach(() => {
  useSessionStore.setState({ user: null, status: 'unauthenticated' })
})

/** Item 23 (`D-65`): em 390x844 a presa de 9rem cobria 95px do nome do curso. */
describe('CoursesTable — coluna de ações', () => {
  it('no desktop, arquivar e ver são ícones soltos numa coluna de 9rem', () => {
    comPermissoes(['catalog.course.delete'])
    montar('active')

    expect(screen.getByRole('button', { name: 'archive.archiveAction' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'common.view' })).toBeTruthy()
    expect(larguraDaColunaDeAcoes()).toBe('9rem')
  })

  it('em 390px, a linha tem UM botão de ações e a coluna encolhe para ele', () => {
    comPermissoes(['catalog.course.delete'])
    setViewportWidth(390)
    montar('active')

    expect(screen.getByRole('button', { name: 'common.moreActions' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'archive.archiveAction' })).toBeNull()
    expect(larguraDaColunaDeAcoes()).toBe('4.5rem')
  })

  it('em arquivados no 390px, restaurar fica só ícone, com nome acessível', () => {
    comPermissoes(['catalog.course.restore'])
    setViewportWidth(390)
    montar('archived')

    expect(screen.getByRole('button', { name: 'archive.restoreAction' }).textContent?.trim()).toBe('')
    expect(larguraDaColunaDeAcoes()).toBe('4.5rem')
  })

  it('em arquivados no desktop, restaurar segue rotulado numa coluna de 10rem', () => {
    comPermissoes(['catalog.course.restore'])
    montar('archived')

    expect(screen.getByRole('button', { name: 'archive.restoreAction' }).textContent).toContain('archive.restoreAction')
    expect(larguraDaColunaDeAcoes()).toBe('10rem')
  })

  it('abaixo de sm, o piso ativo é o medido para esta visão (item 23, audit §5)', () => {
    montar('active')

    const tabela = document.querySelector('table') as HTMLTableElement
    expect(tabela.className).toContain('sm:min-w-[42rem]')
    expect(tabela.style.getPropertyValue('--table-narrow-floor')).toBe('39.5rem')
  })

  it('abaixo de sm, o piso arquivado é o corrigido no Step 4 (a presa também escala com a tabela)', () => {
    montar('archived')

    const tabela = document.querySelector('table') as HTMLTableElement
    expect(tabela.className).toContain('sm:min-w-[42rem]')
    expect(tabela.style.getPropertyValue('--table-narrow-floor')).toBe('47rem')
  })
})
