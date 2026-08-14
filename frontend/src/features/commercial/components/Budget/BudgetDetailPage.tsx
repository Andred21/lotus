import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'
import { AppButton, AppTag, DetailHeader, IdentityCell, AppCard, AppCardHeader, AppDetailSkeleton, AppErrorState } from '@shared/ui'
import { quoteStatusSeverity } from '../../lib/quoteStatus'
import { useBudgetDetail } from '../../hooks/useBudgetDetail'
import { QuotesList } from './QuotesList'
import { BudgetDocumentsCard } from './BudgetDocumentsCard'
import { BudgetOverlays } from './BudgetOverlays'
import { BudgetStatCard } from './BudgetStatCard'

export function BudgetDetailPage() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const budgetId = Number(id)
  const d = useBudgetDetail(budgetId)

  // Erro e notFound mantêm o `back`: sem ele um GET que falha e continua falhando
  // prende o usuário na rota — Reintentar recarrega, não sai.
  const back = { label: t('budget.back'), onClick: d.goBack }

  // Todo ramo titula o seu estado: o `h1` da tela de detalhe mora no
  // `DetailHeader`, então ramo sem título é página sem nível 1 (Q-5).
  if (d.loading)
    return (
      <div>
        {/* Título escondido: a primeira barra do esqueleto JÁ é o lugar do
          * título — um h1 visível aqui seriam dois. O `back` acompanha para o
          * cabeçalho não pular de lugar quando o conteúdo chega, e para uma
          * carga que não termina não prender o usuário na rota. */}
        <DetailHeader back={back} title={t('common.loading')} titleHidden />
        <AppDetailSkeleton />
      </div>
    )
  if (d.loadError)
    return (
      <div>
        {/* Escondido pelo mesmo motivo: o `AppErrorState` já mostra esta frase
          * em destaque, e ele serve também às páginas de lista, onde o `h1` é do
          * `PageHeader` — promovê-la lá dentro daria dois níveis 1. */}
        <DetailHeader back={back} title={t('common.loadError')} titleHidden />
        <AppErrorState
          title={t('common.loadError')}
          detail={d.loadError.detail ?? t('common.loadErrorHint')}
          retryLabel={t('common.retry')}
          onRetry={d.reload}
        />
      </div>
    )
  if (!d.budget)
    return (
      <div>
        {/* Aqui a mensagem do estado É o título: virou `h1` e o `<p>` que
          * repetia a mesma frase saiu. */}
        <DetailHeader back={back} title={t('budget.notFound')} />
      </div>
    )

  const budget = d.budget

  return (
    <div>
      <DetailHeader
        back={back}
        title={budget.code ?? '—'}
        subtitle={
          <IdentityCell
            inline
            title={d.client?.legal_name ?? '—'}
            description={d.client?.rut ? `RUT ${d.client.rut}` : undefined}
            image={d.client?.photo_url}
            size="normal"
          />
        }
        tags={
          budget.status && (
            <AppTag value={t(`quoteStatus.${budget.status}`)} severity={quoteStatusSeverity(budget.status)} />
          )
        }
        actions={
          <>
            {/* Ação primária primeiro; destrutivo por último (UI-B5). */}
            <AppButton
              variant="brandIcon"
              label={t('budget.addQuote')}
              icon="pi pi-file"
              onClick={() => d.openWizard(null)}
            />
            {/* Único caminho de edição: o backend só deixa payment_terms mudar. */}
            <AppButton label={t('common.edit')} icon="pi pi-pencil" outlined onClick={d.openEdit} />
            <AppButton
              label={t('common.delete')}
              icon="pi pi-trash"
              outlined
              severity="danger"
              onClick={d.askDeleteBudget}
            />
          </>
        }
      />

      <div className="space-y-6">
        {/* Os três totais vêm SOMADOS do backend (bcmath). A UI nunca soma UF. */}
        <div className="grid gap-4 sm:grid-cols-3">
          <BudgetStatCard label={t('budget.totalQuoted')} value={budget.total_value_uf} />
          <BudgetStatCard label={t('budget.totalApproved')} value={budget.total_approved_uf} tone="success" />
          <BudgetStatCard label={t('budget.totalRejected')} value={budget.total_rejected_uf} tone="danger" />
        </div>

        <AppCard>
          <AppCardHeader title={t('budget.quotes')} count={budget.quotes.length} />
          <QuotesList
            quotes={budget.quotes}
            onEdit={(q) => d.openWizard(q)}
            onRemove={(q) => d.askConfirm('remove', q)}
            onApprove={d.canApprove ? (q) => d.askConfirm('approve', q) : undefined}
            onReject={d.canApprove ? (q) => d.askConfirm('reject', q) : undefined}
          />
        </AppCard>

        <BudgetDocumentsCard
          files={budget.files ?? []}
          fileType={d.fileType}
          onFileTypeChange={d.setFileType}
          uploadPending={d.uploadPending}
          onUpload={d.handleUpload}
          onSizeReject={d.onFileSizeReject}
          onRemove={(fileId) => d.removeFile(fileId)}
          fileError={d.fileError}
          fileSizeError={d.fileSizeError}
        />

        <BudgetOverlays d={d} budgetId={budgetId} budget={budget} />
      </div>
    </div>
  )
}
