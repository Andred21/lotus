import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  AppDataTable, AppColumn, AppInputText, AppDropdown, AppButton, AppTag,
  AppCardToolbar, AppCardFooter, AppEmptyState,
} from '@shared/ui'
import type { BudgetData, QuoteStatus } from '@shared/types/generated'
import { clientsApi } from '@shared/api/clientsApi'
import { quoteStatusSeverity } from '../../lib/quoteStatus'
import { formatUf } from '../../lib/uf'

const STATUSES: QuoteStatus[] = ['pending', 'approved', 'rejected']

export function BudgetsTable({
  budgets, loading, actions,
}: {
  budgets: BudgetData[]
  loading: boolean
  actions?: ReactNode
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [filter, setFilter] = useState('')
  const [status, setStatus] = useState<QuoteStatus | null>(null)
  const [first, setFirst] = useState(0)
  const clients = clientsApi.useList()

  const clientName = (id: number) => clients.data?.find((c) => c.id === id)?.legal_name ?? '—'

  // Busca por código OU cliente: o AppDataTable filtra só por campos da própria
  // linha, e o nome do cliente não é um deles (vem de outra query). Por isso o
  // filtro é aplicado aqui, antes de entregar as linhas à tabela.
  const term = filter.trim().toLowerCase()
  const rows = budgets.filter((b) => {
    const matchesStatus = status === null || b.status === status
    const matchesTerm =
      term === '' ||
      (b.code ?? '').toLowerCase().includes(term) ||
      clientName(b.client_id).toLowerCase().includes(term)
    return matchesStatus && matchesTerm
  })

  const statusOptions = [
    { label: t('budget.filterAll'), value: null },
    ...STATUSES.map((s) => ({ label: t(`quoteStatus.${s}`), value: s })),
  ]

  const filtering = term !== '' || status !== null

  const empty = filtering ? (
    <AppEmptyState
      icon="pi pi-search"
      // Só monta `Sin resultados para "x"` quando existe termo. Com apenas o
      // filtro de estado ativo, o termo é vazio e a frase citaria aspas em
      // branco — cai no título genérico.
      title={term === '' ? t('common.noResultsFiltered') : t('common.noResults', { term: filter.trim() })}
      description={t('common.noResultsHint')}
      action={
        <AppButton
          label={t('common.clearSearch')}
          icon="pi pi-times"
          text
          onClick={() => { setFilter(''); setStatus(null); setFirst(0) }}
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
                value={filter}
                onChange={(e) => { setFilter(e.target.value); setFirst(0) }}
              />
            </div>
            <div className="w-48">
              <AppDropdown
                value={status}
                options={statusOptions}
                onChange={(e) => { setStatus(e.value as QuoteStatus | null); setFirst(0) }}
              />
            </div>
          </>
        }
        end={actions}
      />
      <AppDataTable
        value={rows}
        loading={loading}
        emptyMessage={loading ? undefined : empty}
        paginator={rows.length > 10}
        first={first}
        onPage={(e) => setFirst(e.first)}
      >
        <AppColumn
          header={t('budget.code')}
          body={(b: BudgetData) => <span className="font-mono text-sm" style={{ color: 'var(--primary-color)' }}>{b.code}</span>}
        />
        <AppColumn header={t('budget.client')} body={(b: BudgetData) => clientName(b.client_id)} />
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
      <AppCardFooter count={t('budget.count', { count: rows.length })} />
    </>
  )
}
