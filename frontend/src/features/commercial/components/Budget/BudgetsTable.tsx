import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  AppColumn, AppTag, IdentityCell,
  AppEmptyState, ArchiveSwitch, SearchableTableFrame, archivedColumns,
} from '@shared/ui'
import { useTableFilter } from '@shared/hooks'
import type { ArchiveMode } from '@shared/hooks'
import type { BudgetData, QuoteStatus } from '@shared/types/generated'
import { quoteStatusSeverity } from '../../lib/quoteStatus'
import { formatUf, type ArchivableRow } from '@shared/lib'
import { useCommercialClients } from '../../hooks/useCommercialClients'
import { BudgetRowActions } from './BudgetRowActions'
import { BudgetStatusFilter } from './BudgetStatusFilter'

/** A mesma tabela serve as duas fontes. O par de campos do rastreio vive em
 * `ArchivableRow` — estava declarado à mão em 8 arquivos (D-53). */
export type BudgetRow = ArchivableRow<BudgetData>

export function BudgetsTable({
  budgets, loading, actions, error, onRetry,
  mode, onModeChange, onRestore, busy,
}: {
  budgets: BudgetRow[]
  loading: boolean
  mode: ArchiveMode
  onModeChange: (mode: ArchiveMode) => void
  onRestore: (b: BudgetData) => void
  /** Restore em voo — trava os botões da linha (Q-2). */
  busy: boolean
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
  const archived = mode === 'archived'

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
  const carregando = loading || clients.isLoading

  // Busca por código OU cliente: o AppDataTable filtra só por campos da própria
  // linha, e o nome do cliente não é um deles (vem de outra query). Por isso o
  // filtro é aplicado aqui, antes de entregar as linhas à tabela.
  const table = useTableFilter(
    budgets,
    (b) => [b.code, clients.clientName(b.client_id)],
    status === null ? undefined : (b) => b.status === status,
  )

  return (
    <SearchableTableFrame
      table={table}
      searchPlaceholder={t('budget.searchPlaceholder')}
      onClearFilter={() => setStatus(null)}
      filterSlot={
        <BudgetStatusFilter
          value={status}
          onChange={(v) => { setStatus(v); table.resetPage() }}
        />
      }
      emptyState={
        <AppEmptyState
          icon={archived ? 'pi pi-inbox' : 'pi pi-file'}
          title={archived ? t('archive.empty') : t('budget.empty')}
          description={archived ? t('archive.emptyHint') : t('budget.emptyHint')}
          action={archived ? undefined : actions}
        />
      }
      footerCount={t('budget.count', { count: table.rows.length })}
      actions={archived ? undefined : actions}
      viewSwitch={<ArchiveSwitch value={mode} onChange={onModeChange} />}
      loading={carregando}
      error={loadError}
      onRetry={retry}
    >
      <AppColumn
        header={t('budget.code')}
        body={(b: BudgetData) => <span className="font-bold text-sm" style={{ color: 'var(--primary-color)' }}>{b.code}</span>}
      />
      <AppColumn
        header={t('budget.client')}
        body={(b: BudgetData) => {
          const c = clients.client(b.client_id)

          return c ? (
            <IdentityCell title={c.legal_name} description={c.email} image={c.photo_url} />
          ) : (
            clients.clientName(b.client_id)
          )
        }}
      />
      <AppColumn header={t('budget.quoteCount')} body={(b: BudgetData) => <span className="font-semibold">{b.quotes.length}</span>} />
      <AppColumn header={t('budget.totalValue')} body={(b: BudgetData) => `${formatUf(b.total_value_uf ?? '0')} UF`} />
      <AppColumn
        header={t('budget.status')}
        body={(b: BudgetData) =>
          b.status ? <AppTag value={t(`quoteStatus.${b.status}`)} severity={quoteStatusSeverity(b.status)} /> : null
        }
      />
      {archived && archivedColumns(t)}
      <AppColumn
        body={(b: BudgetRow) => (
          <BudgetRowActions
            budget={b}
            archived={archived}
            busy={busy}
            onView={(x) => navigate(`/comercial/presupuestos/${x.id}`)}
            onRestore={onRestore}
          />
        )}
        style={{ width: '8rem' }}
      />
    </SearchableTableFrame>
  )
}
