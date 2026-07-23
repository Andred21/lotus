import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ConfirmDialog } from '@shared/ui'
import type { TurmaData, TurmaDocumentData } from '@shared/types/generated'
import { useTurmaDocsSection } from '../../hooks/useTurmaDocsSection'
import { TURMA_DOCUMENT_TYPES } from '../../lib/turmaDocuments'
import { DocumentTypeCard } from './DocumentTypeCard'

export function TurmaDocuments({ turma }: { turma: TurmaData }) {
  const { t } = useTranslation()
  const s = useTurmaDocsSection(turma)
  const [pendingRemoval, setPendingRemoval] = useState<TurmaDocumentData | null>(null)

  if (s.loading) return <p className="p-4 text-sm text-slate-500">{t('common.loading')}</p>

  return (
    <div className="space-y-4 p-4">
      <div>
        <h3 className="font-medium">{t('operation.documents.title')}</h3>
        <p className="text-sm text-slate-500">
          {t('operation.documents.progress', { done: s.deliveredCount, total: s.totalTypes })}
        </p>
        <div className="mt-2 h-2 w-full rounded bg-slate-200 dark:bg-slate-700">
          <div
            className="h-2 rounded bg-emerald-500 transition-[width]"
            style={{ width: `${(s.deliveredCount / s.totalTypes) * 100}%` }}
          />
        </div>
      </div>

      {s.error && <p className="text-sm text-red-600">{s.error}</p>}

      {s.habilitada && !s.concluida && (
        <p className="rounded bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
          {t('operation.documents.enabled')}
        </p>
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
          if (!pendingRemoval || s.removing) return
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
