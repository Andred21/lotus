import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { setViewportWidth } from '@shared/testing/viewport'
import { useSessionStore } from '@shared/stores/sessionStore'
import type { ArchiveMode, ServerTable } from '@shared/hooks'
import { TurmasTable, type TurmaRow } from './TurmasTable'

/**
 * UI-07 (run 2 do `/lotus-ui-review`, achado B): o dropdown de estado na
 * toolbar da tabela não tinha nome nem visual nem para leitor de tela — só o
 * VALOR corrente ("Todos") ficava exposto. A prova é pelo NOME ACESSÍVEL, não
 * pela existência de um `<label>` qualquer: um `<label>` sem `htmlFor` (ou
 * apontando para o nó raiz do Dropdown em vez do `inputId`, defeito que o
 * próprio `AppDropdown` documenta) passaria batido num teste que só buscasse a
 * tag no DOM.
 */
vi.mock('react-i18next', async (importOriginal) => {
  const { mockUseTranslation } = await import('@shared/testing/i18n')
  return {
    ...(await importOriginal<typeof import('react-i18next')>()),
    useTranslation: mockUseTranslation(),
  }
})

const TURMA: TurmaRow = {
  id: 3, quote_id: 1, course_id: 9, modalidade: 'presencial', local_aplicacao: 'Santiago',
  start_date: '2026-01-05', end_date: '2026-02-05', status: 'em_andamento', habilitada: false,
  missing_document_types: [], concluded_at: null, redatores: [], course_name: 'Alta Tensión',
  client_name: 'Transelec', enrolled_count: 15, quote_code: 'COT-1', budget_code: 'ORC-1',
  budget_id: null, client_rut: '11.111.111-1', client_photo_url: null,
  archived_at: '2026-09-01T10:00:00Z', archived_by: 'Admin Lotus',
} as unknown as TurmaRow

/** O `table` pronto do `useTurmasPage` — mock estrutural, no molde do
 * `ServerTable<TurmaRow>` que a tabela consome. */
function tabela(): ServerTable<TurmaRow> {
  return {
    filter: '',
    term: '',
    filtering: false,
    filteredByScope: false,
    rows: [TURMA],
    first: 0,
    onFilterChange: () => {},
    onPage: () => {},
    resetPage: () => {},
    clear: () => {},
    totalRecords: 1,
    meta: undefined,
    sortField: undefined,
    sortOrder: undefined,
    onSort: () => {},
    loading: false,
    error: null,
    refetch: () => Promise.resolve(),
  }
}

function montar(mode: ArchiveMode = 'active') {
  return render(
    <MemoryRouter>
      <TurmasTable
        table={tabela()}
        status={null}
        onStatusChange={() => {}}
        mode={mode}
        onModeChange={() => {}}
        onArchive={() => {}}
        onRestore={() => {}}
        busy={false}
      />
    </MemoryRouter>,
  )
}

describe('TurmasTable — o filtro de estado tem nome acessível (UI-07)', () => {
  it('o dropdown de estado se acha pelo rótulo, não só pelo valor corrente', () => {
    montar()

    // Sob o mock de i18n, `t` devolve a CHAVE: a mesma de
    // `operation.table.status` que já titula a coluna ESTADO.
    expect(screen.getByLabelText('operation.table.status')).toBeTruthy()
  })
})

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

/** Item 23 (`D-65`): a presa de 9rem cobria 79px de "Cliente" em 390x844. */
describe('TurmasTable — coluna de ações', () => {
  afterEach(() => {
    useSessionStore.setState({ user: null, status: 'unauthenticated' })
  })

  it('no desktop, arquivar e ver são ícones soltos numa coluna de 9rem', () => {
    comPermissoes(['operation.turma.delete'])
    montar('active')

    expect(screen.getByRole('button', { name: 'archive.archiveAction' })).toBeTruthy()
    expect(larguraDaColunaDeAcoes()).toBe('9rem')
  })

  it('em 390px, a linha tem UM botão de ações e a coluna encolhe para ele', () => {
    comPermissoes(['operation.turma.delete'])
    setViewportWidth(390)
    montar('active')

    expect(screen.getByRole('button', { name: 'common.moreActions' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'archive.archiveAction' })).toBeNull()
    expect(larguraDaColunaDeAcoes()).toBe('4.5rem')
  })

  it('em arquivados no 390px, restaurar fica só ícone, com nome acessível', () => {
    comPermissoes(['operation.turma.restore'])
    setViewportWidth(390)
    montar('archived')

    expect(screen.getByRole('button', { name: 'archive.restoreAction' }).textContent?.trim()).toBe('')
    expect(larguraDaColunaDeAcoes()).toBe('4.5rem')
  })

  it('em arquivados abaixo de sm, o piso é o medido para esta visão (item 23, audit §5)', () => {
    montar('archived')

    const tabela = document.querySelector('table') as HTMLTableElement
    expect(tabela.className).toContain('sm:min-w-[42rem]')
    expect(tabela.style.getPropertyValue('--table-narrow-floor')).toBe('57.5rem')
  })
})
