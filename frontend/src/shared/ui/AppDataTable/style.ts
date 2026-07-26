import type { DataTablePassThroughOptions } from 'primereact/datatable'

/** Passthrough do DataTable (ADR-16). Cores por CSS var do tema Lara.
 *
 * Sem zebra por decisão do bloco visual: zebra e hover competem, e na linha já
 * tingida o hover fica ambíguo. Tabela com poucas colunas e borda de linha não
 * precisa de zebra para guiar o olho. */
export const appDataTablePt: DataTablePassThroughOptions = {
  root: { className: 'text-sm' },
  headerRow: { className: 'text-xs uppercase tracking-wide' },
  // headerCell/bodyCell pertencem a ColumnPassThroughOptions, não a
  // DataTablePassThroughOptions — cascatam via `column` (tipagem do PrimeReact 10.9.8).
  column: {
    headerCell: {
      className: 'px-4 py-2.5',
      style: { background: 'var(--surface-section)', color: 'var(--text-color-secondary)' },
    },
    bodyCell: { className: 'px-4 py-3' },
  },
  bodyRow: { className: 'transition-colors' },
}
