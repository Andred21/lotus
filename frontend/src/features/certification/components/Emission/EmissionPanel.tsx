import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AppCard, AppDropdown, AppEmptyState, AppErrorState, AppButton, AppTag } from '@shared/ui'
import type { CertificateData, EmissionPanelEnrollmentData } from '@shared/types/generated'
import { formatDate } from '@shared/lib'
import { useEmissionPanelState } from '../../hooks/useEmissionPanelState'
import { EmissionStudentsTable } from './EmissionStudentsTable'
import { ConfirmIssueDialog } from './ConfirmIssueDialog'
import { IssuedDialog } from './IssuedDialog'

type Viewing = { certificate: CertificateData; studentName: string; courseName: string }

export function EmissionPanel() {
  const { t } = useTranslation()
  const s = useEmissionPanelState()
  const [issuing, setIssuing] = useState<EmissionPanelEnrollmentData | null>(null)
  const [viewing, setViewing] = useState<Viewing | null>(null)

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
            {/* onClick fica sem handler nesta task — Task 7 liga o botão via
                useBatchIssue (a EmissionPanel do brief não pede o diálogo de
                lote aqui, só a contagem/desabilitação). */}
            <AppButton
              variant="brandIcon"
              icon="pi pi-verified"
              label={t('certificate.emitAllPending', { count: s.counts.pendientes })}
              disabled={s.counts.pendientes === 0 || turma.emission_blocked !== null}
            />
          </div>

          <AppCard>
            <EmissionStudentsTable
              enrollments={turma.enrollments}
              loading={s.loading}
              blocked={turma.emission_blocked !== null}
              onEmit={setIssuing}
              onView={(enrollment) => {
                const cert = enrollment.certificate ? s.certificateById.get(enrollment.certificate.id) : undefined
                if (cert) setViewing({ certificate: cert, studentName: enrollment.student_name, courseName: turma.course_name })
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
            setViewing({ certificate, studentName: issuing.student_name, courseName: turma.course_name })
          }}
        />
      )}

      {viewing && (
        <IssuedDialog
          certificate={viewing.certificate}
          studentName={viewing.studentName}
          courseName={viewing.courseName}
          onHide={() => setViewing(null)}
        />
      )}
    </div>
  )
}
