import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { AppCard, AppErrorState, AppButton, AppTag } from '@shared/ui'
import { loadErrorHint, screenDetail } from '@shared/lib'
import { useEmissionPanelState } from '../../hooks/useEmissionPanelState'
import { EmissionFilters } from './EmissionFilters'
import { PendingTurmaCards } from './PendingTurmaCards'
import { EmissionStudentsTable } from './EmissionStudentsTable'
import { ConfirmIssueDialog } from './ConfirmIssueDialog'
import { IssuedDialog } from './IssuedDialog'
import { BatchIssueDialog } from './BatchIssueDialog'
import { EmissionWarnings } from './EmissionWarnings'

export function EmissionPanel() {
  const { t } = useTranslation()
  const s = useEmissionPanelState()
  const blockedId = useId()

  const turma = s.selected

  if (s.loadError) {
    return (
      <AppErrorState
        title={t('common.loadError')}
        detail={screenDetail(s.loadError) ?? t(loadErrorHint(s.loadError))}
        retryLabel={t('common.retry')}
        onRetry={s.reload}
      />
    )
  }

  return (
    <div className="space-y-4 p-4">
      <EmissionWarnings managerSignatureMissing={s.managerSignatureMissing} />
      <EmissionFilters s={s} turma={turma} />

      {!turma ? (
        s.loading ? null : <PendingTurmaCards turmas={s.turmas} onSelect={s.setTurmaId} />
      ) : (
        <>
          <AppCard tone="info" className="px-4 py-3 text-sm">
            <p>{t('certificate.financialNote')}</p>
            <p className="mt-1 font-medium">
              {t('certificate.issuedPending', { issued: s.counts.emitidos, pending: s.counts.pendientes })}
            </p>
          </AppCard>

          {/* Motivo do bloqueio na MESMA linha do CTA que explica (era irmã
            * solta a 536px, f3 UI-03); `aria-describedby` liga os controles. */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Voltar é terciário e ANTECEDE a ação primária (rule de
              * estilização): `text`, com a tinta secundária subindo no hover,
              * como o do `DetailHeader`. Limpa a MESMA `turmaId` do combo, então
              * o período escolhido não é tocado. */}
            <AppButton
              className="text-[var(--text-color-secondary)] hover:text-[var(--text-color)]"
              text
              icon="pi pi-arrow-left"
              label={t('certificate.backToTurmas')}
              onClick={() => s.setTurmaId(null)}
            />
            <div className="flex flex-wrap items-center justify-end gap-3">
              {turma.emission_blocked !== null && (
                <AppTag id={blockedId} severity="warning" value={t(`certificate.blocked.${turma.emission_blocked}`)} />
              )}
              <AppButton
                variant="primary"
                icon="pi pi-verified"
                label={t('certificate.emitAllPending', { count: s.counts.pendientes })}
                disabled={s.counts.pendientes === 0 || turma.emission_blocked !== null}
                aria-describedby={turma.emission_blocked !== null ? blockedId : undefined}
                onClick={() => s.setBatchIssuing(true)}
              />
            </div>
          </div>

          <AppCard>
            <EmissionStudentsTable
              enrollments={turma.enrollments}
              counts={s.counts}
              loading={s.loading}
              blocked={turma.emission_blocked !== null}
              blockedReasonId={turma.emission_blocked !== null ? blockedId : undefined}
              onEmit={s.setIssuing}
              onView={(enrollment) => {
                if (!enrollment.certificate) return
                s.setViewingCertificateId(enrollment.certificate.id)
              }}
            />
          </AppCard>
        </>
      )}

      {s.issuing && turma && (
        <ConfirmIssueDialog
          enrollment={s.issuing}
          turma={turma}
          onHide={() => s.setIssuing(null)}
          onIssued={s.openIssuedCertificate}
        />
      )}

      {s.viewingCertificateId !== null && (
        <IssuedDialog
          certificateId={s.viewingCertificateId}
          certificate={s.viewingCertificate}
          loading={s.viewingCertificateLoading}
          error={s.viewingCertificateError}
          onRetry={s.reloadViewingCertificate}
          onHide={() => s.setViewingCertificateId(null)}
        />
      )}

      {s.batchIssuing && turma && <BatchIssueDialog turma={turma} onHide={() => s.setBatchIssuing(false)} />}
    </div>
  )
}
