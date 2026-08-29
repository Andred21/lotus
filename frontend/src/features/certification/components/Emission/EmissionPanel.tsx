import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { AppCard, AppDatePicker, AppDropdown, AppEmptyState, AppErrorState, AppButton, AppTag } from '@shared/ui'
import { formatDate, loadErrorHint, screenDetail } from '@shared/lib'
import { useEmissionPanelState } from '../../hooks/useEmissionPanelState'
import { EmissionStudentsTable } from './EmissionStudentsTable'
import { ConfirmIssueDialog } from './ConfirmIssueDialog'
import { IssuedDialog } from './IssuedDialog'
import { BatchIssueDialog } from './BatchIssueDialog'

export function EmissionPanel() {
  const { t } = useTranslation()
  const s = useEmissionPanelState()
  const turmaInputId = useId()
  const desdeInputId = useId()

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
      <AppCard>
        <div className="space-y-3 p-4">
          {/* O rótulo é a correção do UI-02 da run de Certificados
            * (2026-08-25). O nome acessível existia, mas vinha do PLACEHOLDER —
            * o PrimeReact o usa como texto do botão que abre a lista —, e no
            * visual não havia rótulo nenhum: escolhida a turma, o campo passa a
            * mostrar só o VALOR e nada diz que aquilo é a turma. `useId` +
            * `inputId`, a mesma forma dos três filtros de estado irmãos. A
            * chave `certificate.turmaConcluida` já existia nas 3 locales e não
            * era usada em lugar nenhum. */}
          <label htmlFor={desdeInputId} className="text-sm" style={{ color: 'var(--text-color-secondary)' }}>
            {t('certificate.concludedSince')}
          </label>
          <AppDatePicker inputId={desdeInputId} value={s.desde} onChange={s.setDesde} />
          <label htmlFor={turmaInputId} className="text-sm" style={{ color: 'var(--text-color-secondary)' }}>
            {t('certificate.turmaConcluida')}
          </label>
          <AppDropdown
            inputId={turmaInputId}
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
              variant="primary"
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
