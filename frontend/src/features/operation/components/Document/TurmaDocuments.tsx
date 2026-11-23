import { useTranslation } from 'react-i18next'
import { AppCard, FormErrorBanner, AppDetailSkeleton, AppErrorState, SectionLabel } from '@shared/ui'
import type { TurmaData, TurmaDocumentData } from '@shared/types/generated'
import { useTurmaDocsSection } from '../../hooks/useTurmaDocsSection'
import { DocumentTypeCard } from './DocumentTypeCard'
import { EvaluacionesCard } from './EvaluacionesCard'
import { ManualButton } from './ManualButton'
import { loadErrorHint, screenDetail } from '@shared/lib'

export function TurmaDocuments({ turma }: { turma: TurmaData }) {
  const { t } = useTranslation()
  const s = useTurmaDocsSection(turma)

  const removeFile = (file: TurmaDocumentData) => {
    if (s.removing) return
    return new Promise<void>((resolve, reject) =>
      s.remove(file.id, { onSuccess: () => resolve(), onError: () => reject(new Error('remove')) }),
    )
  }

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

      {/* A confirmação de remoção é do `AppFileActions`, dentro dos cartões; a guarda
        * fica aqui. A Promise mantém o diálogo aberto até o servidor responder, e a
        * rejeição o deixa aberto mostrando `removeError`. */}
      <div className="space-y-3">
        <DocumentTypeCard
          type="MANUAL"
          files={s.byType.MANUAL}
          uploading={s.uploading}
          onUpload={(file) => s.upload('MANUAL', file)}
          removing={s.removing}
          onRemove={removeFile}
          removeError={s.removeError}
          canSubmit={s.canUpload('MANUAL')}
        />
        <EvaluacionesCard
          clientName={turma.client_name}
          byType={s.byType}
          missingOptional={s.missingOptional}
          uploading={s.uploading}
          onUpload={s.upload}
          canUpload={s.canUpload}
          removing={s.removing}
          removeError={s.removeError}
          onRemove={removeFile}
          canRemove={s.canRemove}
        />
      </div>
    </div>
  )
}
