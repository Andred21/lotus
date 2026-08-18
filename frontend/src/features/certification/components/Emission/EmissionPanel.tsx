import { useTranslation } from 'react-i18next'
import { AppCard, AppDropdown, AppEmptyState, AppErrorState, AppButton, AppTag } from '@shared/ui'
import { formatDate, screenDetail } from '@shared/lib'
import { useEmissionPanelState } from '../../hooks/useEmissionPanelState'
import { EmissionStudentsTable } from './EmissionStudentsTable'
import { ConfirmIssueDialog } from './ConfirmIssueDialog'
import { IssuedDialog } from './IssuedDialog'
import { BatchIssueDialog } from './BatchIssueDialog'

export function EmissionPanel() {
  const { t } = useTranslation()
  const s = useEmissionPanelState()

  const turma = s.selected

  if (s.loadError) {
    return (
      <AppErrorState
        title={t('common.loadError')}
        detail={screenDetail(s.loadError) ?? t('common.loadErrorHint')}
        retryLabel={t('common.retry')}
        onRetry={s.reload}
      />
    )
  }

  return (
    <div className="space-y-4 p-4">
      <AppCard>
        <div className="space-y-3 p-4">
          <AppDropdown
            value={s.turmaId}
            options={s.options}
            optionLabel="label"
            optionValue="value"
            placeholder={t('certificate.selectTurma')}
            onChange={(e) => s.setTurmaId(e.value)}
          />
          {turma && (
            <p className="text-sm" style={{ color: 'var(--text-color-secondary)' }}>
              {turma.course_name} · {turma.client_name} ·{' '}
              {t('certificate.concludedAt', { date: formatDate(new Date(`${turma.end_date}T00:00:00`)) })}
            </p>
          )}
        </div>
      </AppCard>

      {!turma ? (
        <AppEmptyState
          icon="pi pi-verified"
          title={t('certificate.emptyPanelTitle')}
          description={t('certificate.emptyPanelHint')}
        />
      ) : (
        <>
          <AppCard tone="info" className="px-4 py-3 text-sm">
            <p>{t('certificate.financialNote')}</p>
            <p className="mt-1 font-medium">
              {t('certificate.issuedPending', { issued: s.counts.emitidos, pending: s.counts.pendientes })}
            </p>
          </AppCard>

          {turma.emission_blocked !== null && (
            <AppTag severity="warning" value={t(`certificate.blocked.${turma.emission_blocked}`)} />
          )}

          <div className="flex justify-end">
            <AppButton
              variant="brandIcon"
              icon="pi pi-verified"
              label={t('certificate.emitAllPending', { count: s.counts.pendientes })}
              disabled={s.counts.pendientes === 0 || turma.emission_blocked !== null}
              onClick={() => s.setBatchIssuing(true)}
            />
          </div>

          <AppCard>
            <EmissionStudentsTable
              enrollments={turma.enrollments}
              counts={s.counts}
              loading={s.loading}
              blocked={turma.emission_blocked !== null}
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
