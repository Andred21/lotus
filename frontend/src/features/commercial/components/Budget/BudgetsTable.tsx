import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  AppDataTable, AppColumn, AppInputText, AppDropdown, AppButton, AppTag,
  AppCardToolbar, AppEmptyState,
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
  onRetry?: () => void
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
  const retry = () => { onRetry?.(); clients.refetch() }

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

  const filtering = table.filtering

  const empty = filtering ? (
    <AppEmptyState
      icon="pi pi-search"
      // Só monta `Sin resultados para "x"` quando existe termo. Com apenas o
      // filtro de estado ativo, o termo é vazio e a frase citaria aspas em
      // branco — cai no título genérico.
      title={table.term === '' ? t('common.noResultsFiltered') : t('common.noResults', { term: table.filter.trim() })}
      description={table.term === '' ? t('common.noResultsFilteredHint') : t('common.noResultsHint')}
      action={
        <AppButton
          label={table.term === '' ? t('common.clearFilters') : t('common.clearSearch')}
          icon="pi pi-times"
          text
          onClick={() => { table.clear(); setStatus(null) }}
        />
      }
    />
  ) : (
    <AppEmptyState icon="pi pi-file" title={t('budget.empty')} description={t('budget.emptyHint')} action={actions} />
  )

  return (
    <>
      <AppCardToolbar
        start={
          <>
            <div className="min-w-64 flex-1">
              <AppInputText
                leftIcon="pi pi-search"
                placeholder={t('budget.searchPlaceholder')}
                value={table.filter}
                onChange={(e) => table.onFilterChange(e.target.value)}
              />
            </div>
            <div className="w-48">
              <AppDropdown
                value={status}
                options={statusOptions}
                optionValue="value"
                onChange={(e) => { setStatus(e.value as QuoteStatus | null); table.resetPage() }}
              />
            </div>
          </>
        }
        end={loadError ? undefined : actions}
      />
      <AppDataTable
        value={table.rows}
        loading={loading || clients.isLoading}
        error={loadError} 
        onRetry={retry}
        emptyMessage={empty}
        footerCount={t('budget.count', { count: table.rows.length })}
        first={table.first}
        onPage={table.onPage}
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
      </AppDataTable>
    </>
  )
}
