import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AppCard, AppDropdown, AppEmptyState, AppErrorState, AppButton, AppTag } from '@shared/ui'
import type { EmissionPanelEnrollmentData } from '@shared/types/generated'
import { formatDate } from '@shared/lib'
import { useEmissionPanelState } from '../../hooks/useEmissionPanelState'
import { EmissionStudentsTable } from './EmissionStudentsTable'
import { ConfirmIssueDialog } from './ConfirmIssueDialog'
import { IssuedDialog } from './IssuedDialog'
import { BatchIssueDialog } from './BatchIssueDialog'

export function EmissionPanel() {
  const { t } = useTranslation()
  const s = useEmissionPanelState()
  const [issuing, setIssuing] = useState<EmissionPanelEnrollmentData | null>(null)
  const [batchIssuing, setBatchIssuing] = useState(false)

  const turma = s.selected

  if (s.loadError) {
    return (
      <AppErrorState
        title={t('common.loadError')}
        detail={s.loadError.detail ?? t('common.loadErrorHint')}
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
              onClick={() => setBatchIssuing(true)}
            />
          </div>

          <AppCard>
            <EmissionStudentsTable
              enrollments={turma.enrollments}
              loading={s.loading}
              blocked={turma.emission_blocked !== null}
              onEmit={setIssuing}
              onView={(enrollment) => {
                if (!enrollment.certificate) return
                s.setViewingCertificateId(enrollment.certificate.id)
              }}
            />
          </AppCard>
        </>
      )}

      {issuing && turma && (
        <ConfirmIssueDialog
          enrollment={issuing}
          turma={turma}
          onHide={() => setIssuing(null)}
          onIssued={(certificate) => {
            setIssuing(null)
            s.setViewingCertificateId(certificate.id)
          }}
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

      {batchIssuing && turma && <BatchIssueDialog turma={turma} onHide={() => setBatchIssuing(false)} />}
    </div>
  )
}
