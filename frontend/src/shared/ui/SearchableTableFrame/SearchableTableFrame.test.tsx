import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { AppColumn } from '../AppDataTable'
import { SearchableTableFrame, type SearchableTableState } from './SearchableTableFrame'

// Fábrica única (rule frontend-fsliced.md, seção shared/testing/): a moldura
// monta `AppDataTable`, que lê `i18n` — mock parcial à mão estoura. Sob ela `t`
// devolve a CHAVE, então o que se prova aqui é QUAL texto o vazio escolhe, não
// a tradução dele (isso é do `parity.test.ts`).
vi.mock('react-i18next', async (importOriginal) => {
  const { mockUseTranslation } = await import('@shared/testing/i18n')
  return {
    ...(await importOriginal<typeof import('react-i18next')>()),
    useTranslation: mockUseTranslation(),
  }
})

afterEach(cleanup)

interface Row {
  id: number
  name: string
}

/** Estado de busca já no ponto em que o vazio aparece: lista vazia e
 * `filtering` ligado. Quem produz este objeto na tela real é o
 * `useTableFilter`; aqui ele é montado à mão porque `shared/ui` não importa
 * `shared/hooks` em nenhuma direção. */
function estado(over: Partial<SearchableTableState<Row>> = {}): SearchableTableState<Row> {
  return {
    filter: '',
    term: '',
    filtering: true,
    filteredByScope: false,
    rows: [],
    first: 0,
    onFilterChange: vi.fn(),
    onPage: vi.fn(),
    clear: vi.fn(),
    ...over,
  }
}

function montar(table: SearchableTableState<Row>, onClearFilter = vi.fn()) {
  render(
    <SearchableTableFrame
      table={table}
      searchPlaceholder="common.search"
      emptyState={<span>vazio de domínio</span>}
      footerCount={<span>0</span>}
      filterSlot={<span>slot do filtro</span>}
      onClearFilter={onClearFilter}
    >
      <AppColumn field="name" header="nome" />
    </SearchableTableFrame>,
  )
  return onClearFilter
}

/** O único botão da moldura no vazio: o `filterSlot` é um span e o paginador
 * não desenha controles em página única (`paginatorTemplate=''`). */
const botaoDoVazio = () => screen.getByRole('button')

describe('SearchableTableFrame — o rótulo do vazio nomeia o que o clique limpa (UI-09)', () => {
  it('busca ativa e filtro próprio inativo: promete só a busca', () => {
    montar(estado({ filter: 'zzzz', term: 'zzzz', filteredByScope: false }))

    expect(botaoDoVazio().textContent).toContain('common.clearSearch')
    expect(screen.getByText('common.noResults')).toBeTruthy()
    expect(screen.getByText('common.noResultsHint')).toBeTruthy()
  })

  it('busca inativa e filtro próprio ativo: promete só os filtros', () => {
    montar(estado({ filteredByScope: true }))

    expect(botaoDoVazio().textContent).toContain('common.clearFilters')
    expect(screen.getByText('common.noResultsFiltered')).toBeTruthy()
    expect(screen.getByText('common.noResultsFilteredHint')).toBeTruthy()
  })

  it('CATRACA UI-09: os dois ativos — o rótulo nomeia os DOIS, não só a busca', () => {
    // O defeito medido em /operacion: com `Concluded` no dropdown e `zzzz` na
    // busca, o botão dizia "Limpar busca" e o clique também zerava o estado —
    // a lista voltava MAIOR do que o filtro tinha deixado, sem aviso.
    montar(estado({ filter: 'zzzz', term: 'zzzz', filteredByScope: true }))

    expect(botaoDoVazio().textContent).toContain('common.clearSearchAndFilters')
    // O título continua citando o termo: é a informação mais específica que a
    // tela tem sobre por que a lista ficou vazia.
    expect(screen.getByText('common.noResults')).toBeTruthy()
    expect(screen.getByText('common.noResultsSearchAndFiltersHint')).toBeTruthy()
  })

  it('o clique do caso composto continua limpando os dois — o rótulo é que mudou', () => {
    // Guarda de que a correção mexeu no que o botão DIZ, não no que ele FAZ:
    // `clearAll` já compunha certo antes do UI-09.
    const table = estado({ filter: 'zzzz', term: 'zzzz', filteredByScope: true })
    const onClearFilter = montar(table)

    fireEvent.click(botaoDoVazio())

    expect(table.clear).toHaveBeenCalledTimes(1)
    expect(onClearFilter).toHaveBeenCalledTimes(1)
  })
})
