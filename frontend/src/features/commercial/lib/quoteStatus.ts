import type { QuoteStatus } from '@shared/types/generated'

/** Severidade da AppTag por status de cotação. A chave i18n é `quoteStatus.<status>`. */
export function quoteStatusSeverity(status: QuoteStatus): 'warning' | 'success' | 'danger' {
  if (status === 'approved') return 'success'
  if (status === 'rejected') return 'danger'
  return 'warning'
}
