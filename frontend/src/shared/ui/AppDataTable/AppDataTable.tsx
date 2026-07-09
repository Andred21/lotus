import { DataTable } from 'primereact/datatable'
import type { DataTableProps, DataTableValueArray } from 'primereact/datatable'
import { Column } from 'primereact/column'

/** Wrapper do DataTable: paginação/sort/filtro client-side (o index devolve
 * array puro), dark. Colunas via <AppColumn/>. */
export function AppDataTable<T extends DataTableValueArray>(props: DataTableProps<T>) {
  return (
    <DataTable
      dataKey="id"
      removableSort
      paginator
      rows={10}
      className="text-sm"
      {...props}
    />
  )
}

export { Column as AppColumn }
export type { ColumnProps as AppColumnProps } from 'primereact/column'
