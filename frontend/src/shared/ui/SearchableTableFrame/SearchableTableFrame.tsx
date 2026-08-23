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
  /** O filtro PRÓPRIO da tela (o `filterSlot`) está de fato cortando linha.
   * `filtering` não responde isso: com termo digitado ele é `true` mesmo sem
   * filtro nenhum, e era por isso que o botão do vazio dizia "limpar busca"
   * enquanto o clique também zerava o dropdown, devolvendo uma lista MAIOR do
   * que a que o usuário tinha estreitado (UI-09). Como `filtering`, vem do hook
   * e mede o EFEITO — a moldura não recalcula nem esta pergunta. */
  filteredByScope: boolean
  rows: T[]
  first: number
  onFilterChange: (value: string) => void
  onPage: (event: { first: number }) => void
  clear: () => void
}

/** Filtro próprio da tabela (dropdown, chips) e a forma de limpá-lo, indivisíveis
 * de propósito: sem `filterSlot` nenhum dos dois existe; com ele, `onClearFilter`
 * é OBRIGATÓRIO.
 *
 * O contrato era prosa ("quem passa `filterSlot` passa também um `clear`
 * COMPOSTO no `table`") e três consumidores remontavam o mesmo `clearAll` à mão.
 * Esquecer produzia um "Limpar filtros" que não devolvia a lista — a mesma
 * classe de falha silenciosa que o `filtering` do `useTableFilter` existiu para
 * matar em 2026-08-03, quando `BudgetsTable` e `TurmasTable` erraram juntas.
 * Instrução repetida três vezes quer mecanismo, não parágrafo (lição 14): agora
 * a moldura compõe (`table.clear()` + `onClearFilter()`) e o par é união
 * discriminada — passar o slot sem o clear não compila (review do BD-4, Q-2). */
type FilterSlotProps =
  | { filterSlot?: undefined; onClearFilter?: undefined }
  | { filterSlot: ReactNode; onClearFilter: () => void }

interface SearchableTableFrameBaseProps<T> {
  /** Vem pronto da feature — quem declara `searchable` é quem tem o vocabulário
   * de domínio (spec D3). */
  table: SearchableTableState<T>
  searchPlaceholder: string
  /** O vazio DE DOMÍNIO (ícone, título, ação de cadastro). O vazio de BUSCA é
   * genérico nas 5 tabelas e a moldura monta sozinha (spec D4). */
  emptyState: ReactNode
  footerCount: ReactNode
  actions?: ReactNode
  /** Alternância de FONTE de dados (ativos × arquivados). Prop própria, FORA da
   * união `filterSlot`/`onClearFilter`: não é filtro, e tratá-la como um
   * quebraria o `clear()` composto (spec D11). */
  viewSwitch?: ReactNode
  loading?: boolean
  error?: { detail?: string | null } | null
  /** Devolver a promise do refetch faz o Reintentar do AppErrorState esperar
   * por ela (Q-14). Tipar `() => void` aqui compilaria — TS aceita descartar o
   * retorno — e faria o tipo mentir sobre o contrato. */
  onRetry?: () => void | Promise<unknown>
  /** As `<AppColumn/>`. */
  children: ReactNode
}

export type SearchableTableFrameProps<T> = SearchableTableFrameBaseProps<T> & FilterSlotProps

/** Moldura de tabela em card com busca: toolbar, os dois empty states, corpo e
 * rodapé-paginador. As 5 tabelas busca-só repetiam este bloco literalmente —
 * diferiam só em `searchable`, ícone, 3 chaves i18n e `footerCount`.
 *
 * Não entram aqui: `RolesTable` (sem busca) e `EnrollmentTable` (sem
 * toolbar) — spec D2.
 *
 * Tabela com filtro próprio entra pelo `filterSlot`: o vazio abaixo bifurca a
 * redação por `term`, como `BudgetsTable` e `TurmasTable` já faziam à mão. */
export function SearchableTableFrame<T>({
  table,
  searchPlaceholder,
  emptyState,
  footerCount,
  filterSlot,
  onClearFilter,
  actions,
  viewSwitch,
  loading,
  error,
  onRetry,
  children,
}: SearchableTableFrameProps<T>) {
  const { t } = useTranslation()

  // Os três casos do vazio, nomeados pelo que o clique VAI limpar — não pelo
  // que está ativo. `clearAll` sempre limpou os dois; o rótulo é que bifurcava
  // só por `term` e, com busca e filtro juntos, prometia um e fazia dois
  // (UI-09). Filtrando sem termo continua sem oferecer "limpar busca": mandaria
  // o usuário apagar um campo já vazio.
  const filteredBySearch = table.term !== ''
  const ambos = filteredBySearch && table.filteredByScope
  // A composição é da moldura, não do chamador: `table.clear()` do
  // `useTableFilter` limpa só a busca, e este botão promete os dois.
  const clearAll = () => {
    table.clear()
    onClearFilter?.()
  }
  const empty = table.filtering ? (
    <AppEmptyState
      icon="pi pi-search"
      title={filteredBySearch ? t('common.noResults', { term: table.filter.trim() }) : t('common.noResultsFiltered')}
      description={
        ambos
          ? t('common.noResultsSearchAndFiltersHint')
          : filteredBySearch
            ? t('common.noResultsHint')
            : t('common.noResultsFilteredHint')
      }
      action={
        <AppButton
          label={
            ambos
              ? t('common.clearSearchAndFilters')
              : filteredBySearch
                ? t('common.clearSearch')
                : t('common.clearFilters')
          }
          icon="pi pi-times"
          text
          onClick={clearAll}
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
          <div className="flex min-w-64 flex-1 flex-wrap items-center gap-3">
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
        // `!loading` pelo mesmo motivo: durante o GET inicial a lista está vazia
        // e o `AppDataTable` mostra o corpo de carregamento, não o empty state —
        // sem esta guarda o botão de cadastro não existia em lugar nenhum da
        // tela até o GET voltar (review do BD-3, Q-3).
        end={
          <>
            {viewSwitch}
            {error || (!loading && !table.filtering && table.rows.length === 0) ? undefined : actions}
          </>
        }
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
