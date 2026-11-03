import { AppCard, AppCardHeader, ArchiveSwitch } from '@shared/ui'
import type { QuoteData } from '@shared/types/generated'
import type { useBudgetQuotesArchived } from '../../hooks/useBudgetQuotesArchived'
import { QuotesList } from './QuotesList'

/** Bloco coeso do card "Cotizaciones": cabeçalho (com o alternador de
 * arquivados, D-59) + lista. Extraído da `BudgetDetailPage` só para caber na
 * régua de 150 linhas — nenhuma condicional muda de forma. */
export function BudgetQuotesCard({
  title, count, quotes, quotesArchived, canManageApproved, onEdit, onRemove, onApprove, onReject,
}: {
  title: string
  count: number
  quotes: QuoteData[]
  quotesArchived: ReturnType<typeof useBudgetQuotesArchived>
  canManageApproved: boolean
  onEdit: (q: QuoteData) => void
  onRemove: (q: QuoteData) => void
  onApprove?: (q: QuoteData) => void
  onReject?: (q: QuoteData) => void
}) {
  return (
    <AppCard>
      <AppCardHeader
        title={title}
        count={count}
        actions={<ArchiveSwitch value={quotesArchived.mode} onChange={quotesArchived.setMode} />}
      />
      <QuotesList
        quotes={quotes}
        canManageApproved={canManageApproved}
        onEdit={onEdit}
        onRemove={onRemove}
        onApprove={onApprove}
        onReject={onReject}
        mode={quotesArchived.mode}
        archived={{
          items: quotesArchived.items,
          loading: quotesArchived.loading,
          error: quotesArchived.error,
          refetch: quotesArchived.refetch,
          restoring: quotesArchived.restoring,
        }}
        onRestore={quotesArchived.restore}
      />
    </AppCard>
  )
}
