import { useTranslation } from 'react-i18next'
import {
  AppButton, AppColumn, AppDataTable, AppInputText, COL, FormSection, PeriodFilter, tableWidths, RecordCode
} from '@shared/ui'
import { formatDate } from '@shared/lib'
import type { BudgetData } from '@shared/types/generated'
import { useClientBudgets, type ClientPeriodKey } from '../../hooks/useClientBudgets'
import { BudgetStatusCell } from '../Budget/BudgetStatusCell'
import { BudgetStatusFilter } from '../Budget/BudgetStatusFilter'

const PERIOD_KEYS: ClientPeriodKey[] = ['all', 'week', 'month', 'year', 'custom']
const largura = tableWidths({ code: COL.code, status: COL.tag, date: COL.date }, { actions: false })

/** Orçamentos do cliente no diálogo, com busca por código, estado e período.
 * Mesmo molde das seções de detalhe do aluno: `FormSection` + `AppDataTable`.
 * O hook (e a query) mora aqui e não no diálogo: a seção só monta com o cliente
 * já salvo, e `useList` é o cache da aba Presupuestos. */
export function ClientBudgetsSection({ clientId }: { clientId: number }) {
  const { t } = useTranslation()
  const b = useClientBudgets(clientId)
  const filtering = b.search !== '' || b.status !== null || b.preset !== 'all'

  return (
    <>
      <FormSection title={t('client.budgets.title')} spaced />
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-56 flex-1">
            <AppInputText
              leftIcon="search"
              placeholder={t('client.budgets.searchPlaceholder')}
              aria-label={t('client.budgets.searchPlaceholder')}
              value={b.search}
              onChange={(e) => b.setSearch(e.target.value)}
            />
          </div>
          <BudgetStatusFilter value={b.status} onChange={b.setStatus} />
        </div>
        <div className="flex flex-wrap items-start gap-3">
          <PeriodFilter
            preset={b.preset}
            presets={PERIOD_KEYS.map((value) => ({ value, label: t(`client.budgets.period.${value}`) }))}
            customKey="custom"
            period={b.period}
            onPresetChange={b.setPreset}
            onPeriodChange={b.setPeriod}
          />
          {filtering && (
            <AppButton label={t('common.clearFilters')} icon="close" text onClick={b.clear} />
          )}
        </div>
        <AppDataTable
          value={b.rows}
          dataKey="id"
          loading={b.load.loading}
          error={b.load.error}
          onRetry={b.load.refetch}
          emptyMessage={filtering ? t('client.budgets.emptyFiltered') : t('client.budgets.empty')}
        >
          <AppColumn
            header={t('budget.code')}
            style={largura.code}
            body={(row: BudgetData) => (
              <RecordCode>{row.code}</RecordCode>
            )}
          />
          <AppColumn
            header={t('budget.status')}
            style={largura.status}
            body={(row: BudgetData) => <BudgetStatusCell budget={row} />}
          />
          <AppColumn
            header={t('client.budgets.date')}
            style={largura.date}
            body={(row: BudgetData) => (row.created_at ? formatDate(new Date(row.created_at)) : '—')}
          />
        </AppDataTable>
      </div>
    </>
  )
}
