import type { DataTablePassThroughOptions } from 'primereact/datatable'

/** Passthrough do DataTable (ADR-16). Cores por CSS var do tema Lara. */
export const appDataTablePt: DataTablePassThroughOptions = {
  root: { className: 'text-sm' },
  thead: { className: 'bg-[var(--surface-section)]' },
}
