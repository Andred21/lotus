import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AppCard, ConfirmDialog, FormErrorBanner, AppDetailSkeleton, AppErrorState, SectionLabel } from '@shared/ui'
import type { TurmaData, TurmaDocumentData } from '@shared/types/generated'
import { useTurmaDocsSection } from '../../hooks/useTurmaDocsSection'
import { TURMA_DOCUMENT_TYPES } from '../../lib/turmaDocuments'
import { DocumentTypeCard } from './DocumentTypeCard'
import { ManualButton } from './ManualButton'
import { loadErrorHint, screenDetail } from '@shared/lib'

export function TurmaDocuments({ turma }: { turma: TurmaData }) {
  const { t } = useTranslation()
  const s = useTurmaDocsSection(turma)
  const [pendingRemoval, setPendingRemoval] = useState<TurmaDocumentData | null>(null)

  if (s.loading) return <AppDetailSkeleton />
  if (s.loadError)
    return (
      <AppErrorState
        title={t('common.loadError')}
        detail={screenDetail(s.loadError) ?? t(loadErrorHint(s.loadError))}
        retryLabel={t('common.retry')}
        onRetry={s.reload}
      />
    )

  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <SectionLabel as="h3" rule={false}>{t('operation.documents.title')}</SectionLabel>
          <p className="text-sm" style={{ color: 'var(--text-color-secondary)' }}>
            {t('operation.documents.progress', { done: s.deliveredCount, total: s.totalTypes })}
          </p>
          {/* Trilho em `--surface-300`, não em `--surface-section`: este último
            * resolve para o MESMO branco de `--surface-card` no tema claro, e a
            * barra deixava de ser proporção para virar faixa verde de comprimento
            * arbitrário (UI-03 do relatório de 2026-08-23: 1,00:1 contra o cartão).
            * Token escolhido pela FUNÇÃO — superfície que precisa contrastar com o
            * cartão —, não pelo nome, e medido nos dois temas. */}
          <div className="mt-2 h-2 w-64 rounded-full" style={{ background: 'var(--surface-300)' }}>
            <div
              className="h-2 rounded-full transition-[width]"
              style={{ width: `${(s.deliveredCount / s.totalTypes) * 100}%`, background: 'var(--green-500)' }}
            />
          </div>
        </div>
        <ManualButton turmaId={s.turmaId} />
      </div>

      <FormErrorBanner message={s.error} />

      {s.habilitada && !s.concluida && (
        <AppCard tone="success" className="px-3 py-2 text-sm">
          {t('operation.documents.enabled')}
        </AppCard>
      )}

      {s.lockReason && (
        <AppCard tone="info" className="px-3 py-2 text-sm">
          {t(`operation.documents.lock.${s.lockReason}`)}
        </AppCard>
      )}

      <div className="space-y-3">
        {TURMA_DOCUMENT_TYPES.map((type) => (
          <DocumentTypeCard
            key={type}
            type={type}
            files={s.byType[type]}
            uploading={s.uploading}
            onUpload={(file) => s.upload(type, file)}
            removing={s.removing}
            onRemove={setPendingRemoval}
            canSubmit={s.canSubmit}
          />
        ))}
      </div>

      <ConfirmDialog
        visible={pendingRemoval !== null}
        title={t('operation.documents.removeTitle')}
        message={t('operation.documents.removeBody', { name: pendingRemoval?.original_name ?? '' })}
        confirmLabel={t('operation.documents.remove')}
        severity="danger"
        pending={s.removing}
        error={s.removeError}
        onConfirm={() => {
          if (!pendingRemoval || s.removing || !s.canSubmit) return
          s.remove(pendingRemoval.id, { onSuccess: () => setPendingRemoval(null) })
        }}
        onCancel={() => {
          s.resetRemove()
          setPendingRemoval(null)
        }}
      />
    </div>
  )
}
