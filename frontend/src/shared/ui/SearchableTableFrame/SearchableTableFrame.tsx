import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { DataTableValueArray } from 'primereact/datatable'
import { AppDataTable } from '../AppDataTable'
import { AppCardToolbar } from '../AppCard'
import { AppEmptyState } from '../AppEmptyState'
import { AppInputText } from '../AppInputText'
import { AppButton } from '../AppButton'

/** O que a moldura consome do estado de busca. Estruturalmente compatível com
 * `TableFilter<T>` de `shared/hooks`, **sem importar de lá**: `shared/ui` e
 * `shared/hooks` não se importam em nenhuma direção, e a moldura não abre a
 * primeira aresta (spec D3). Mesmo padrão do `error` do `AppDataTable`, que
 * aceita `ProblemDetails` sem depender de `shared/api`. */
export interface SearchableTableState<T> {
  filter: string
  term: string
  /** Resposta autoritativa para "empty state de filtro ou de lista vazia?".
   * A moldura NÃO recalcula essa pergunta — quem sabe é o hook, porque mede o
   * EFEITO do `where`, não a presença dele. Recalcular com `term === ''` foi o
   * defeito que `TurmasTable` e `BudgetsTable` cometeram juntas em 2026-08-03,
   * e omitir o campo daqui deixava a moldura errada por construção para elas
   * (review de 2026-08-04, Q-1). */
  filtering: boolean
  rows: T[]
  first: number
  onFilterChange: (value: string) => void
  onPage: (event: { first: number }) => void
  clear: () => void
}

export interface SearchableTableFrameProps<T> {
  /** Vem pronto da feature — quem declara `searchable` é quem tem o vocabulário
   * de domínio (spec D3). */
  table: SearchableTableState<T>
  searchPlaceholder: string
  /** O vazio DE DOMÍNIO (ícone, título, ação de cadastro). O vazio de BUSCA é
   * genérico nas 5 tabelas e a moldura monta sozinha (spec D4). */
  emptyState: ReactNode
  footerCount: ReactNode
  /** Filtro próprio da tabela (dropdown, chips), renderizado na toolbar depois
   * do input de busca. Quem passa isto passa também um `clear` COMPOSTO no
   * `table`: o `clear` do `useTableFilter` limpa só a busca, e o vazio de filtro
   * abaixo oferece `common.clearFilters` — se o filtro próprio não for limpo
   * junto, o botão não devolve a lista. `HistorialTable` é o primeiro caso. */
  filterSlot?: ReactNode
  actions?: ReactNode
  loading?: boolean
  error?: { detail?: string | null } | null
  onRetry?: () => void
  /** As `<AppColumn/>`. */
  children: ReactNode
}

/** Moldura de tabela em card com busca: toolbar, os dois empty states, corpo e
 * rodapé-paginador. As 5 tabelas busca-só repetiam este bloco literalmente —
 * diferiam só em `searchable`, ícone, 3 chaves i18n e `footerCount`.
 *
 * Não entram aqui: `BudgetsTable`/`TurmasTable` (dropdown de filtro por cima),
 * `RolesTable` (sem busca) e `EnrollmentTable` (sem toolbar) — spec D2.
 *
 * Tabela com filtro próprio entra pelo `filterSlot`: o vazio abaixo bifurca a
 * redação por `term`, como `BudgetsTable` e `TurmasTable` já faziam à mão. */
export function SearchableTableFrame<T>({
  table,
  searchPlaceholder,
  emptyState,
  footerCount,
  filterSlot,
  actions,
  loading,
  error,
  onRetry,
  children,
}: SearchableTableFrameProps<T>) {
  const { t } = useTranslation()

  // Filtrando sem termo de busca = só o `filterSlot` está estreitando a lista;
  // oferecer "limpar busca" ali mandaria o usuário apagar um campo já vazio.
  const filteredBySearch = table.term !== ''
  const empty = table.filtering ? (
    <AppEmptyState
      icon="pi pi-search"
      title={filteredBySearch ? t('common.noResults', { term: table.filter.trim() }) : t('common.noResultsFiltered')}
      description={filteredBySearch ? t('common.noResultsHint') : t('common.noResultsFilteredHint')}
      action={
        <AppButton
          label={filteredBySearch ? t('common.clearSearch') : t('common.clearFilters')}
          icon="pi pi-times"
          text
          onClick={table.clear}
        />
      }
    />
  ) : (
    emptyState
  )

  return (
    <>
      <AppCardToolbar
        start={
          <div className="flex min-w-64 flex-1 items-center gap-3">
            <div className="min-w-64 flex-1">
              <AppInputText
                leftIcon="pi pi-search"
                placeholder={searchPlaceholder}
                value={table.filter}
                onChange={(e) => table.onFilterChange(e.target.value)}
              />
            </div>
            {filterSlot}
          </div>
        }
        // O CTA aparece na toolbar quando há linha e dentro do vazio quando não
        // há: com a lista vazia o convite a cadastrar É o empty state, e dois
        // botões idênticos na mesma tela é o débito. Irmã da supressão em erro,
        // que já morava nesta linha. `table.filtering`, não `rows.length` sozinho:
        // busca sem resultado não é lista vazia (linha 18-23 acima) — se
        // recalculasse por `rows.length`, o CTA sumiria também durante busca sem
        // match, e o vazio de busca só oferece "limpar", nunca o CTA de domínio.
        end={error || (!table.filtering && table.rows.length === 0) ? undefined : actions}
      />
      <AppDataTable
        value={table.rows as unknown as DataTableValueArray}
        loading={loading}
        error={error}
        onRetry={onRetry}
        emptyMessage={empty}
        footerCount={footerCount}
        first={table.first}
        onPage={table.onPage}
      >
        {children}
      </AppDataTable>
    </>
  )
}
