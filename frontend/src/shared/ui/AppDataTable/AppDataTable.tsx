import { DataTable } from 'primereact/datatable'
import type { DataTableProps, DataTableValueArray, DataTablePassThroughOptions } from 'primereact/datatable'
import { Column } from 'primereact/column'
import { appDataTablePt } from './style'

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

/** Wrapper do DataTable: paginação/sort/filtro client-side (o index devolve
 * array puro). Colunas via <AppColumn/>. */
export function AppDataTable<T extends DataTableValueArray>({ pt, ...props }: DataTableProps<T>) {
  return (
    <DataTable
      dataKey="id"
      removableSort
      paginator
      rows={10}
      pt={mergePt(appDataTablePt, pt as DataTableProps<DataTableValueArray>['pt'])}
      {...props}
    />
  )
}

export { Column as AppColumn }
export type { ColumnProps as AppColumnProps } from 'primereact/column'
