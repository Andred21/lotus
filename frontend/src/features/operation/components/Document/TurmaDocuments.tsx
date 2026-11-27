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
          {/* B-11 (bloco 66). O trilho em `--surface-300` (UI-03 de 2026-08-23) saiu do
            * branco do cartão, mas medido a 1,48:1 no claro: continuava invisível, e
            * a barra `--green-500` fazia 2,3:1 sobre ele. O traço de um gráfico pede
            * 3:1 (WCAG 1.4.11) contra o que o cerca, e a PROPORÇÃO pede o mesmo da
            * barra contra o trilho. Trilho = fundo `--surface-200` + borda de controle
            * (`--surface-500` no claro, `--surface-300` no escuro: o `#64748b` do
            * gerador); barra = `--green-700` / `--green-400`. Razões: trilho/cartão
            * 4,76 e 3,07; barra/cartão 4,42 e 7,40; barra/trilho 3,58 e 5,24 (claro e
            * escuro). Os tokens de paleta não invertem com o tema, então o degrau é por
            * variante `dark:`, como o `severityTone`. */}
          <div
            role="progressbar"
            aria-label={t('operation.documents.title')}
            aria-valuemin={0}
            aria-valuemax={s.totalTypes}
            aria-valuenow={s.deliveredCount}
            className="mt-2 h-2.5 w-64 overflow-hidden rounded-full border border-(--surface-500) bg-(--surface-200) dark:border-(--surface-300)"
          >
            <div
              className="h-full rounded-full bg-(--green-700) transition-[width] dark:bg-(--green-400)"
              style={{ width: `${(s.deliveredCount / s.totalTypes) * 100}%` }}
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
