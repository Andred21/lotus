import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { AppCard, AppDropdown, AppErrorState, AppButton, AppTag, PeriodFilter } from '@shared/ui'
import { formatDate, loadErrorHint, screenDetail } from '@shared/lib'
import { useEmissionPanelState } from '../../hooks/useEmissionPanelState'
import { EMISSION_PANEL_WINDOW_MONTHS, EMISSION_PERIOD_KEYS } from '../../lib/emissionWindow'
import { PendingTurmaCards } from './PendingTurmaCards'
import { EmissionStudentsTable } from './EmissionStudentsTable'
import { ConfirmIssueDialog } from './ConfirmIssueDialog'
import { IssuedDialog } from './IssuedDialog'
import { BatchIssueDialog } from './BatchIssueDialog'
import { EmissionWarnings } from './EmissionWarnings'

export function EmissionPanel() {
  const { t } = useTranslation()
  const s = useEmissionPanelState()
  const turmaInputId = useId()
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
      <AppCard>
        <div className="space-y-3 p-4">
          {/* Os presets do período; o 422 de janela invertida aparece AO LADO
            * do filtro, com a tela mantendo o dado anterior (D6 do Dashboard). */}
          <PeriodFilter
            preset={s.preset}
            presets={EMISSION_PERIOD_KEYS.map((value) => ({
              value,
              label: t(`certificate.period.${value}`, { months: EMISSION_PANEL_WINDOW_MONTHS }),
            }))}
            customKey="custom"
            period={s.period}
            staleError={s.staleError}
            onPresetChange={s.setPreset}
            onPeriodChange={s.setPeriod}
            onRetry={s.staleRetry}
          />
          {/* O rótulo é a correção do UI-02 da run de Certificados (2026-08-25).
            * O nome acessível vinha do PLACEHOLDER — o PrimeReact o usa como
            * texto do botão que abre a lista — e no visual não havia rótulo.
            * `useId` + `inputId`, a forma dos filtros de estado irmãos. */}
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
