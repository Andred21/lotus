import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AppColumn, AppTag, AppButton, AppEmptyState, AppDropdown, SearchableTableFrame } from '@shared/ui'
import type { CertificateData } from '@shared/types/generated'
import { formatDate } from '@shared/lib'
import { certStatus, STATUS_SEVERITY, type CertDerivedStatus } from '../../lib/certStatus'
import { useHistorial } from '../../hooks/useHistorial'
import { CertificateViewDialog } from './CertificateViewDialog'
import { RevokeDialog } from './RevokeDialog'
import { ReissueDialog } from './ReissueDialog'

const STATUSES: CertDerivedStatus[] = ['vigente', 'por_vencer', 'vencido', 'revocado']

/** Aba Historial: tabela de todos os certificados emitidos, com busca, filtro
 * de estado, Ver/Revocar/Reemitir por linha. Estado e queries vivem em
 * `useHistorial` — este componente só monta o JSX (frontend-fsliced.md). */
export function HistorialTable() {
  const { t } = useTranslation()
  const h = useHistorial()
  const [revoking, setRevoking] = useState<CertificateData | null>(null)
  const [reissuing, setReissuing] = useState<CertificateData | null>(null)

  const statusOptions = [
    { label: t('certificate.filterAll'), value: null },
    ...STATUSES.map((s) => ({ label: t(`certificate.status.${s}`), value: s })),
  ]

  return (
    <>
      <SearchableTableFrame
        table={{ ...h.table, clear: h.clearAll }}
        searchPlaceholder={t('certificate.searchPlaceholder')}
        filterSlot={
          <div className="w-48">
            <AppDropdown
              value={h.statusFilter}
              options={statusOptions}
              optionValue="value"
              onChange={(e) => h.setStatusFilter(e.value)}
            />
          </div>
        }
        emptyState={<AppEmptyState icon="pi pi-verified" title={t('certificate.emptyHistorial')} description={t('certificate.emptyHistorialHint')} />}
        footerCount={t('certificate.statusSummary', h.statusSummary)}
        loading={h.loading}
        error={h.loadError}
        onRetry={h.reload}
      >
        <AppColumn
          header={t('certificate.colCodigo')}
          body={(c: CertificateData) => <span className="font-mono text-sm">{c.codigo}</span>}
        />
        <AppColumn
          header={t('certificate.colAlumno')}
          body={(c: CertificateData) => (
            <div>
              <p className="font-medium">{c.snapshot.aluno.name}</p>
              <p className="text-xs" style={{ color: 'var(--text-color-secondary)' }}>{c.snapshot.aluno.rut ?? '—'}</p>
            </div>
          )}
        />
        <AppColumn header={t('certificate.colCourse')} body={(c: CertificateData) => c.snapshot.curso.name} />
        <AppColumn
          header={t('certificate.colIssuedAt')}
          body={(c: CertificateData) => formatDate(new Date(c.created_at))}
        />
        <AppColumn
          header={t('certificate.colValidUntil')}
          body={(c: CertificateData) => (c.valido_ate ? formatDate(new Date(`${c.valido_ate}T00:00:00`)) : '—')}
        />
        <AppColumn
          header={t('certificate.colStatus')}
          // Documento corrompido não tem estado a afirmar: `certStatus` derivaria
          // "vigente" das datas, que continuam válidas, sobre um snapshot que não
          // sustenta nem o nome do aluno. A tag de defeito ocupa o lugar da de
          // estado, e NÃO vira um quinto `CertDerivedStatus` — isso contaminaria
          // o filtro, os contadores do rodapé e o `CertificateViewDialog`.
          body={(c: CertificateData) =>
            c.snapshot_ok ? (
              <AppTag severity={STATUS_SEVERITY[certStatus(c)]} value={t(`certificate.status.${certStatus(c)}`)} />
            ) : (
              <AppTag severity="danger" value={t('certificate.snapshotCorrupted')} />
            )
          }
        />
        <AppColumn
          body={(c: CertificateData) => {
            const status = certStatus(c)
            return (
              <div className="flex gap-2">
                <AppButton label={t('certificate.view')} text onClick={() => h.setViewingCertificateId(c.id)} />
                {h.canRevoke && (status === 'vigente' || status === 'por_vencer') && (
                  <AppButton label={t('certificate.revoke')} text onClick={() => setRevoking(c)} />
                )}
                {h.canReissue && status === 'revocado' && (
                  <AppButton label={t('certificate.reissue')} text onClick={() => setReissuing(c)} />
                )}
              </div>
            )
          }}
          style={{ width: '16rem' }}
        />
      </SearchableTableFrame>

      {h.viewingCertificateId !== null && (
        <CertificateViewDialog
          certificateId={h.viewingCertificateId}
          certificate={h.viewingCertificate}
          loading={h.viewingCertificateLoading}
          error={h.viewingCertificateError}
          onRetry={h.reloadViewingCertificate}
          onHide={() => h.setViewingCertificateId(null)}
        />
      )}

      {revoking && (
        <RevokeDialog certificate={revoking} onHide={() => setRevoking(null)} onRevoked={() => setRevoking(null)} />
      )}

      {reissuing && (
        <ReissueDialog
          target={h.findReissueTarget(reissuing)}
          panelLoading={h.reissuePanelLoading}
          panelError={h.reissuePanelError}
          onRetryPanel={h.reissuePanelReload}
          onHide={() => setReissuing(null)}
          onIssued={(certificate) => {
            setReissuing(null)
            h.setViewingCertificateId(certificate.id)
          }}
        />
      )}
    </>
  )
}
