import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { ServerTable } from '@shared/hooks'
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

function montar() {
  return render(
    <MemoryRouter>
      <TurmasTable
        table={tabela()}
        status={null}
        onStatusChange={() => {}}
        mode="active"
        onModeChange={() => {}}
        onArchive={() => {}}
        onRestore={() => {}}
        busy={false}
      />
    </MemoryRouter>,
  )
}

afterEach(cleanup)

describe('TurmasTable — o filtro de estado tem nome acessível (UI-07)', () => {
  it('o dropdown de estado se acha pelo rótulo, não só pelo valor corrente', () => {
    montar()

    // Sob o mock de i18n, `t` devolve a CHAVE: a mesma de
    // `operation.table.status` que já titula a coluna ESTADO.
    expect(screen.getByLabelText('operation.table.status')).toBeTruthy()
  })
})
