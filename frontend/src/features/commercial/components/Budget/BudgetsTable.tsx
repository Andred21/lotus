import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  AppColumn, AppDropdown, AppButton, AppTag,
  AppEmptyState, SearchableTableFrame,
} from '@shared/ui'
import { useTableFilter } from '@shared/hooks'
import type { BudgetData, QuoteStatus } from '@shared/types/generated'
import { quoteStatusSeverity } from '../../lib/quoteStatus'
import { formatUf } from '../../lib/uf'
import { useCommercialClients } from '../../hooks/useCommercialClients'

const STATUSES: QuoteStatus[] = ['pending', 'approved', 'rejected']

export function BudgetsTable({
  budgets, loading, actions, error, onRetry,
}: {
  budgets: BudgetData[]
  loading: boolean
  actions?: ReactNode
  error?: { detail?: string | null } | null
  /** Devolver a promise do refetch faz o Reintentar do AppErrorState esperar
   * por ela (Q-14). Tipar `() => void` aqui compilaria — TS aceita descartar o
   * retorno — e faria o tipo mentir sobre o contrato. */
  onRetry?: () => void | Promise<unknown>
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [status, setStatus] = useState<QuoteStatus | null>(null)
  const clients = useCommercialClients()

  // A falha da query auxiliar conta como falha da tabela. Sem isso um GET de
  // clientes quebrado deixava a tabela inteira com `—` na coluna Cliente e a
  // busca por cliente devolvendo vazio, tudo em silêncio — a tela afirmaria que
  // esses orçamentos não têm cliente (spec D16). Reintentar recarrega as duas.
  const loadError = error ?? clients.loadError
  /** `useCommercialClients.refetch` descarta a própria promise com `void`, então
   * o `Promise.all` só serve para o `AppErrorState` aguardar o `onRetry` do pai
   * (Q-14) — a recarga de clientes acontece junto, mas sem promise para esperar. */
  const retry = () => Promise.all([onRetry?.(), clients.refetch()])
  /** Carregando é qualquer uma das duas queries: a tabela só está "vazia"
   * depois que as duas responderam. */
  const busy = loading || clients.isLoading

  // Busca por código OU cliente: o AppDataTable filtra só por campos da própria
  // linha, e o nome do cliente não é um deles (vem de outra query). Por isso o
  // filtro é aplicado aqui, antes de entregar as linhas à tabela.
  const table = useTableFilter(
    budgets,
    (b) => [b.code, clients.clientName(b.client_id)],
    status === null ? undefined : (b) => b.status === status,
  )

  const statusOptions = [
    { label: t('budget.filterAll'), value: null },
    ...STATUSES.map((s) => ({ label: t(`quoteStatus.${s}`), value: s })),
  ]

  // Composto: o vazio de filtro da moldura oferece `common.clearFilters`, e sem
  // limpar o dropdown junto o estado do status ficaria preso (o `clear` do
  // `useTableFilter` sozinho só limpa a busca).
  const clearAll = () => { table.clear(); setStatus(null) }

  return (
    <SearchableTableFrame
      table={{ ...table, clear: clearAll }}
      searchPlaceholder={t('budget.searchPlaceholder')}
      filterSlot={
        <div className="w-48">
          <AppDropdown
            value={status}
            options={statusOptions}
            optionValue="value"
            onChange={(e) => { setStatus(e.value as QuoteStatus | null); table.resetPage() }}
          />
        </div>
      }
      emptyState={
        <AppEmptyState icon="pi pi-file" title={t('budget.empty')} description={t('budget.emptyHint')} action={actions} />
      }
      footerCount={t('budget.count', { count: table.rows.length })}
      actions={actions}
      loading={busy}
      error={loadError}
      onRetry={retry}
    >
      <AppColumn
        header={t('budget.code')}
        body={(b: BudgetData) => <span className="font-bold text-sm" style={{ color: 'var(--primary-color)' }}>{b.code}</span>}
      />
      <AppColumn header={t('budget.client')} body={(b: BudgetData) => clients.clientName(b.client_id)} />
      <AppColumn header={t('budget.quoteCount')} body={(b: BudgetData) => <span className="font-semibold">{b.quotes.length}</span>} />
      <AppColumn header={t('budget.totalValue')} body={(b: BudgetData) => `${formatUf(b.total_value_uf ?? '0')} UF`} />
      <AppColumn
        header={t('budget.status')}
        body={(b: BudgetData) =>
          b.status ? <AppTag value={t(`quoteStatus.${b.status}`)} severity={quoteStatusSeverity(b.status)} /> : null
        }
      />
      <AppColumn
        body={(b: BudgetData) => (
          <AppButton icon="pi pi-eye" text rounded aria-label={t('common.view')} onClick={() => navigate(`/comercial/presupuestos/${b.id}`)} />
        )}
        style={{ width: '4rem' }}
      />
    </SearchableTableFrame>
  )
}
