import type { DialogPassThroughOptions } from 'primereact/dialog'

/** Passthrough do Dialog (ADR-16). As cores usam as CSS vars do tema Lara, então
 * acompanham a troca de folha sem `dark:`. O footer recebe a mesma superfície do
 * header — no default do Lara ele sai transparente e "flutua" sobre o conteúdo. */
export const appDialogPt: DialogPassThroughOptions = {
  root: { className: 'w-[70vw] max-w-5xl' },
  header: { className: 'bg-[var(--surface-section)] border-b border-[var(--surface-border)]' },
  content: { className: 'bg-[var(--surface-card)]' },
  footer: { className: 'bg-[var(--surface-section)] border-t border-[var(--surface-border)]' },
}
