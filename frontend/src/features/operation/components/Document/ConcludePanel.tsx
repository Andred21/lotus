import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AppButton, AppTag, ConfirmDialog } from '@shared/ui'
import { formatDate } from '@shared/lib'
import type { TurmaData } from '@shared/types/generated'
import { useConclusionSection } from '../../hooks/useConclusionSection'
import { turmaStatusSeverity } from '../../lib/turmaStatus'

export function ConcludePanel({ turma }: { turma: TurmaData }) {
  const { t } = useTranslation()
  const s = useConclusionSection(turma)
  const [confirming, setConfirming] = useState(false)

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center gap-3">
        <h3 className="font-medium">{t('operation.conclusion.title')}</h3>
        <AppTag
          value={t(`operation.conclusion.state.${s.displayStatus}`)}
          severity={turmaStatusSeverity(s.displayStatus)}
        />
      </div>

      {s.concluida ? (
        <p className="rounded bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
          {s.concludedAt
            ? t('operation.conclusion.concludedAt', { date: formatDate(new Date(s.concludedAt)) })
            : t('operation.conclusion.state.concluida')}
        </p>
      ) : (
        <>
          {s.habilitada ? (
            <p className="text-sm text-slate-600 dark:text-slate-300">{t('operation.conclusion.ready')}</p>
          ) : (
            <div className="rounded bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-300">
              <p>{t('operation.conclusion.missingTitle')}</p>
              <ul className="mt-1 list-inside list-disc">
                {s.missingTypes.map((type) => (
                  <li key={type}>{t(`operation.documents.type.${type}`)}</li>
                ))}
              </ul>
            </div>
          )}

          <p className="text-sm text-slate-500">{t('operation.conclusion.warning')}</p>

          {s.canComplete ? (
            <AppButton
              label={t('operation.conclusion.confirm')}
              icon="pi pi-check-circle"
              severity="danger"
              disabled={!s.habilitada || s.concluding}
              loading={s.concluding}
              onClick={() => setConfirming(true)}
            />
          ) : (
            <p className="text-sm text-slate-500">{t('operation.conclusion.noPermission')}</p>
          )}
        </>
      )}

      <ConfirmDialog
        visible={confirming}
        title={t('operation.conclusion.confirmTitle')}
        message={t('operation.conclusion.confirmBody')}
        confirmLabel={t('operation.conclusion.confirm')}
        severity="danger"
        pending={s.concluding}
        error={s.error}
        onConfirm={() => {
          if (s.concluding || !s.habilitada || s.concluida) return
          s.conclude({ onSuccess: () => setConfirming(false) })
        }}
        onCancel={() => {
          s.resetConclude()
          setConfirming(false)
        }}
      />
    </div>
  )
}
