import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { DataTable } from 'primereact/datatable'
import type { DataTableProps, DataTableValueArray, DataTablePassThroughOptions } from 'primereact/datatable'
import { Column } from 'primereact/column'
import { AppErrorState } from '../AppErrorState'
import { appDataTablePt, appPaginatorPt } from './style'

/** Mescla o passthrough do chamador com o da base POR CHAVE. Um spread raso
 * faria `pt={{ root: ... }}` descartar o `className` base do root em silêncio. */
function mergePt(
  base: DataTablePassThroughOptions,
  override?: DataTableProps<DataTableValueArray>['pt'],
): DataTablePassThroughOptions {
  if (!override) return base
  const merged: Record<string, unknown> = { ...base }
  for (const [key, value] of Object.entries(override as Record<string, unknown>)) {
    const current = merged[key]
    if (
      current && typeof current === 'object' && !Array.isArray(current) &&
      value && typeof value === 'object' && !Array.isArray(value)
    ) {
      merged[key] = { ...(current as object), ...(value as object) }
    } else {
      merged[key] = value
    }
  }
  return merged as DataTablePassThroughOptions
}

export type AppDataTableProps<T extends DataTableValueArray> = DataTableProps<T> & {
  /** Contagem em prosa do rodapé. Passá-la liga a faixa: o paginador do
   * DataTable vira o rodapé do card (spec D12), com a contagem à esquerda e os
   * controles de página à direita — e só quando há mais de uma página. */
  footerCount?: ReactNode
  /** Problema que impediu o carregamento. Truthy => o corpo vira
   * `AppErrorState` (spec D16). Estruturalmente compatível com `ProblemDetails`
   * sem importar de `shared/api`. */
  error?: { detail?: string | null } | null
  /** Recarrega a lista. Sem ele o estado de erro não oferece botão. */
  onRetry?: () => void
}

/** Wrapper do DataTable: paginação/sort/filtro client-side (o index devolve
 * array puro). Colunas via <AppColumn/>.
 *
 * Durante o `loading` o corpo vazio ainda renderiza — passar `undefined` em
 * `emptyMessage` cairia no default inglês do PrimeReact (`No available
 * options`). Um nó vazio truthy mantém a linha e cala o texto; suprimir isso é
 * responsabilidade do wrapper, não de cada tabela.
 *
 * O rodapé é o paginador: com `footerCount`, `alwaysShowPaginator` mantém a
 * faixa mesmo em página única e `paginatorTemplate=''` apaga os controles
 * (template falsy não cria elemento algum; `leftContent` renderiza fora desse
 * ramo). Fatiar a página fora da tabela foi rejeitado: 5 tabelas têm coluna
 * `sortable`, e o DataTable só ordena o que recebe.
 *
 * Em erro (spec D16) o wrapper força três coisas de uma vez: linhas vazias (dado
 * obsoleto de um refetch que falhou não é dado válido), rodapé desligado
 * (contar linhas de uma lista que não carregou é ruído) e o corpo virando
 * `AppErrorState`. O estado de erro vence o de vazio: a tabela nunca convida a
 * cadastrar sobre uma falha. */
export function AppDataTable<T extends DataTableValueArray>({
  pt,
  loading,
  emptyMessage,
  footerCount,
  error,
  onRetry,
  value,
  rows = 10,
  ...props
}: AppDataTableProps<T>) {
  const { t } = useTranslation()
  const errored = error != null
  const data = (errored ? [] : value) as T | undefined
  const paginated = (data?.length ?? 0) > rows

  const body = errored ? (
    <AppErrorState
      title={t('common.loadError')}
      detail={error?.detail ?? t('common.loadErrorHint')}
      retryLabel={onRetry ? t('common.retry') : undefined}
      onRetry={onRetry}
    />
  ) : loading ? (
    <span />
  ) : (
    emptyMessage
  )

  return (
    <DataTable
      dataKey="id"
      removableSort
      rowHover
      value={data}
      rows={rows}
      paginator={footerCount !== undefined && !errored}
      alwaysShowPaginator
      paginatorLeft={footerCount}
      paginatorTemplate={paginated ? 'PrevPageLink PageLinks NextPageLink' : ''}
      pt={mergePt({ ...appDataTablePt, paginator: appPaginatorPt }, pt as DataTableProps<DataTableValueArray>['pt'])}
      loading={loading && !errored}
      emptyMessage={body}
      {...props}
    />
  )
}

export { Column as AppColumn }
export type { ColumnProps as AppColumnProps } from 'primereact/column'
