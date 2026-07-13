import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { AppButton, AppTag, ConfirmDialog } from '@shared/ui'
import { usePermissions, useMutationErrors } from '@shared/hooks'
import { budgetsApi } from '@shared/api/budgetsApi'
import { clientsApi } from '@shared/api/clientsApi'
import type { QuoteData } from '@shared/types/generated'
import { quoteStatusSeverity } from '../../lib/quoteStatus'
import { formatUf } from '../../lib/uf'
import { useApproveQuote, useRejectQuote, useRemoveQuote } from '../../api/useQuotes'
import { QuotesList } from './QuotesList'
import { BudgetDialog } from './BudgetDialog'
import { QuoteWizard } from './QuoteWizard'

export function BudgetDetailPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const budgetId = Number(id)

  const query = budgetsApi.useOne(budgetId)
  const clients = clientsApi.useList()
  const budget = query.data

  // Declarado ANTES dos early returns: hook não pode ficar atrás de return condicional.
  const [editing, setEditing] = useState(false)
  // null = fechado; { quote: null } = criar; { quote } = editar.
  const [wizard, setWizard] = useState<{ quote: QuoteData | null } | null>(null)
  const removeQuote = useRemoveQuote()
  const { can } = usePermissions()
  const canApprove = can('commercial.quote.approve')
  const approve = useApproveQuote()
  const reject = useRejectQuote()
  const [confirm, setConfirm] = useState<{ action: 'approve' | 'reject'; quote: QuoteData } | null>(null)
  const { generalError: confirmError } = useMutationErrors([approve.error, reject.error])

  if (query.isLoading) return <p className="p-4 text-sm text-slate-500">{t('common.notLoaded')}</p>
  if (!budget) return <p className="p-4 text-sm text-slate-500">{t('budget.notFound')}</p>

  const client = clients.data?.find((c) => c.id === budget.client_id)

  return (
    <div className="space-y-6">
      <button
        type="button"
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
        onClick={() => navigate('/comercial')}
      >
        <i className="pi pi-arrow-left" aria-hidden="true" />
        {t('budget.back')}
      </button>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">{budget.code}</h2>
          <p className="text-sm text-slate-500">
            {client?.legal_name ?? '—'}
            {client?.rut && ` · RUT ${client.rut}`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {budget.status && (
            <AppTag value={t(`quoteStatus.${budget.status}`)} severity={quoteStatusSeverity(budget.status)} />
          )}
          {/* Único caminho de edição do orçamento: o backend só deixa payment_terms
              mudar (cliente e código são imutáveis). */}
          <AppButton label={t('common.edit')} icon="pi pi-pencil" outlined onClick={() => setEditing(true)} />
          <AppButton
            variant="brandIcon"
            label={t('budget.addQuote')}
            icon="pi pi-file"
            onClick={() => setWizard({ quote: null })}
          />
        </div>
      </header>

      {/* Os três totais vêm SOMADOS do backend (bcmath). A UI nunca soma UF. */}
      <div className="grid gap-4 sm:grid-cols-3">
        <TotalCard label={t('budget.totalQuoted')} value={budget.total_value_uf} />
        <TotalCard label={t('budget.totalApproved')} value={budget.total_approved_uf} tone="success" />
        <TotalCard label={t('budget.totalRejected')} value={budget.total_rejected_uf} tone="danger" />
      </div>

      <section className="rounded-lg border border-slate-200 dark:border-slate-700">
        <header className="flex items-center justify-between p-4">
          <h3 className="font-medium">
            {t('budget.quotes')} <span className="text-slate-500">({budget.quotes.length})</span>
          </h3>
        </header>
        <QuotesList
          quotes={budget.quotes}
          onEdit={(q) => setWizard({ quote: q })}
          onRemove={(q) => removeQuote.mutate(q.id!)}
          onApprove={canApprove ? (q) => setConfirm({ action: 'approve', quote: q }) : undefined}
          onReject={canApprove ? (q) => setConfirm({ action: 'reject', quote: q }) : undefined}
        />
      </section>

      {/* Reusa o dialog da Task 4 em modo edit — em `edit` ele trava cliente e
          código e só deixa a forma de pagamento mudar. */}
      {editing && (
        <BudgetDialog visible mode="edit" budget={budget} onHide={() => setEditing(false)} />
      )}

      {wizard && (
        <QuoteWizard visible budgetId={budgetId} quote={wizard.quote} onHide={() => setWizard(null)} />
      )}

      {confirm && (
        <ConfirmDialog
          visible
          title={t(confirm.action === 'approve' ? 'quote.confirmApproveTitle' : 'quote.confirmRejectTitle')}
          message={t(confirm.action === 'approve' ? 'quote.confirmApproveBody' : 'quote.confirmRejectBody')}
          confirmLabel={t(confirm.action === 'approve' ? 'quote.approve' : 'quote.reject')}
          severity={confirm.action === 'reject' ? 'danger' : undefined}
          pending={approve.isPending || reject.isPending}
          error={confirmError}
          onCancel={() => {
            // Reseta o erro da tentativa anterior: sem isso, reabrir o dialog
            // para outra cotação mostraria um erro fantasma de uma tentativa
            // que nunca ocorreu para ela (approve/reject vivem no pai, não
            // são remontados a cada abertura do dialog).
            approve.reset()
            reject.reset()
            setConfirm(null)
          }}
          onConfirm={() => {
            const mutation = confirm.action === 'approve' ? approve : reject
            mutation.mutate(confirm.quote.id!, { onSuccess: () => setConfirm(null) })
          }}
        />
      )}
    </div>
  )
}

function TotalCard({ label, value, tone }: { label: string; value?: string; tone?: 'success' | 'danger' }) {
  const color =
    tone === 'success' ? 'text-emerald-600' : tone === 'danger' ? 'text-red-600' : 'text-slate-900 dark:text-slate-100'
  return (
    <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
      <p className={`text-2xl font-semibold ${color}`}>{formatUf(value ?? '0')} UF</p>
      <p className="mt-1 text-sm text-slate-500">{label}</p>
    </div>
  )
}
