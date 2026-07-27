import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AppCard, ConfirmDialog, FormErrorBanner, AppDetailSkeleton } from '@shared/ui'
import type { TurmaData, TurmaDocumentData } from '@shared/types/generated'
import { useTurmaDocsSection } from '../../hooks/useTurmaDocsSection'
import { TURMA_DOCUMENT_TYPES } from '../../lib/turmaDocuments'
import { DocumentTypeCard } from './DocumentTypeCard'
import { ManualButton } from './ManualButton'

export function TurmaDocuments({ turma }: { turma: TurmaData }) {
  const { t } = useTranslation()
  const s = useTurmaDocsSection(turma)
  const [pendingRemoval, setPendingRemoval] = useState<TurmaDocumentData | null>(null)

  if (s.loading) return <AppDetailSkeleton />

  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="font-medium">{t('operation.documents.title')}</h3>
          <p className="text-sm" style={{ color: 'var(--text-color-secondary)' }}>
            {t('operation.documents.progress', { done: s.deliveredCount, total: s.totalTypes })}
          </p>
          <div className="mt-2 h-2 w-64 rounded" style={{ background: 'var(--surface-section)' }}>
            <div
              className="h-2 rounded transition-[width]"
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
