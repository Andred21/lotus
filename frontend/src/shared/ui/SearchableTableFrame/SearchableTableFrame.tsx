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
 * QUEM FOR ADOTAR COM `where`: o `filtering` abaixo já escolhe o empty state
 * certo, mas o TEXTO do vazio de filtro assume busca por termo. Uma tabela com
 * dropdown precisa também da bifurcação de redação que `BudgetsTable` e
 * `TurmasTable` têm hoje (`term === ''` → `common.noResultsFiltered` +
 * `common.clearFilters`). Não está aqui porque nenhum consumidor atual passa
 * `where` — construir agora seria especulativo (lição 3). */
export function SearchableTableFrame<T>({
  table,
  searchPlaceholder,
  emptyState,
  footerCount,
  actions,
  loading,
  error,
  onRetry,
  children,
}: SearchableTableFrameProps<T>) {
  const { t } = useTranslation()

  const empty = table.filtering ? (
    <AppEmptyState
      icon="pi pi-search"
      title={t('common.noResults', { term: table.filter.trim() })}
      description={t('common.noResultsHint')}
      action={<AppButton label={t('common.clearSearch')} icon="pi pi-times" text onClick={table.clear} />}
    />
  ) : (
    emptyState
  )

  return (
    <>
      <AppCardToolbar
        start={
          <div className="min-w-64 flex-1">
            <AppInputText
              leftIcon="pi pi-search"
              placeholder={searchPlaceholder}
              value={table.filter}
              onChange={(e) => table.onFilterChange(e.target.value)}
            />
          </div>
        }
        end={error ? undefined : actions}
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
