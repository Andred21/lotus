import { useTranslation } from 'react-i18next'
import { AppColumn, AppTag, AppButton, AppEmptyState, IdentityCell, SearchableTableFrame, stickyActionsColumn, identifierClass } from '@shared/ui'
import type { CertificateData } from '@shared/types/generated'
import { formatDate, CERTIFICATE_STATUS_SEVERITY, certificateStatusLabelKey } from '@shared/lib'
import { useHistorial } from '../../hooks/useHistorial'
import { historialWidths } from './historialColumns'
import { HistorialDialogs } from './HistorialDialogs'
import { HistorialStatusFilter } from './HistorialStatusFilter'

/** Vazio aqui não é `null`: o snapshot corrompido chega com string VAZIA — é o
 * que `CertificateSnapshotData::missingRequiredFields()` mede (`trim === ''`).
 * O `?? '—'` de antes só pegava `null`/`undefined` e deixava a célula em branco. */
const ausente = (valor: string | null | undefined) => (valor ?? '').trim() === ''

/** Aba Historial: tabela de todos os certificados emitidos, com busca, filtro
 * de estado, Ver/Revocar/Reemitir por linha. Estado e queries vivem em
 * `useHistorial` — este componente só monta o JSX (frontend-fsliced.md). */
export function HistorialTable() {
  const { t } = useTranslation()
  const largura = historialWidths()
  const h = useHistorial()

  return (
    <>
      <SearchableTableFrame
        table={h.table}
        totalRecords={h.table.totalRecords}
        sortField={h.table.sortField}
        sortOrder={h.table.sortOrder}
        onSort={h.table.onSort}
        searchPlaceholder={t('certificate.searchPlaceholder')}
        onClearFilter={h.clearStatusFilter}
        filterSlot={<HistorialStatusFilter value={h.statusFilter} onChange={h.setStatusFilter} />}
        emptyState={<AppEmptyState icon="pi pi-verified" title={t('certificate.emptyHistorial')} description={t('certificate.emptyHistorialHint')} />}
        footerCount={t('certificate.statusSummary', h.statusSummary)}
        loading={h.loading}
        error={h.loadError}
        onRetry={h.reload}
      >
        <AppColumn
          field="codigo" sortable
          header={t('certificate.colCodigo')}
          body={(c: CertificateData) => <span className={`${identifierClass} text-sm`}>{c.codigo}</span>}
          style={largura.codigo}
        />
        <AppColumn
          header={t('certificate.colAlumno')}
          body={(c: CertificateData) => (
            /* Texto do snapshot (nome e RUT congelados na emissão) + foto
             * VIVA do aluno: a foto é identidade visual de LISTAGEM, não dado
             * do documento. A spec D4 fechou "nunca foto viva" e o João
             * reverteu em 2026-08-14 — a fronteira ficou onde o documento é
             * apresentado como documento: o PDF e a rota pública do QR
             * continuam só-snapshot, e é lá que a lei mora. */
            <IdentityCell
              /* Nome vazio é CORRUPÇÃO (está em `missingRequiredFields` no
               * backend) e a lista é o único lugar onde o registro aparece antes
               * do clique: a célula diz o que falta em vez de ficar em branco, e
               * casa com a tag de defeito na coluna de estado. RUT vazio é
               * ausência LEGÍTIMA (aluno estrangeiro), então segue travessão —
               * a assimetria é o contrato do backend, não estética. */
              title={ausente(c.snapshot.aluno.name) ? t('certificate.snapshotMissingField') : c.snapshot.aluno.name}
              description={
                ausente(c.snapshot.aluno.rut)
                  ? '—'
                  : <span className={identifierClass}>{c.snapshot.aluno.rut}</span>
              }
              image={c.aluno_photo_url}
            />
          )}
          style={largura.alumno}
        />
        <AppColumn header={t('certificate.colCourse')} body={(c: CertificateData) => c.snapshot.curso.name} style={largura.curso} />
        <AppColumn
          field="created_at" sortable
          header={t('certificate.colIssuedAt')}
          body={(c: CertificateData) => formatDate(new Date(c.created_at))}
          style={largura.emitidoEm}
        />
        <AppColumn
          field="valido_ate" sortable
          header={t('certificate.colValidUntil')}
          body={(c: CertificateData) => (c.valido_ate ? formatDate(new Date(`${c.valido_ate}T00:00:00`)) : '—')}
          style={largura.validoAte}
        />
        <AppColumn
          header={t('certificate.colStatus')}
          // Documento corrompido não tem estado a afirmar: o servidor deriva
          // "vigente" das datas, que continuam válidas, sobre um snapshot que não
          // sustenta nem o nome do aluno. A tag de defeito ocupa o lugar da de
          // estado, e NÃO vira um quinto `CertificateDisplayStatus` — isso contaminaria
          // o filtro, os contadores do rodapé e o `CertificateViewDialog`.
          body={(c: CertificateData) => {
            if (!c.snapshot_ok) return <AppTag severity="danger" value={t('certificate.snapshotCorrupted')} />
            return <AppTag severity={CERTIFICATE_STATUS_SEVERITY[c.display_status]} value={t(certificateStatusLabelKey(c.display_status))} />
          }}
          style={largura.estado}
        />
        <AppColumn
          body={(c: CertificateData) => {
            const status = c.display_status
            return (
              <div className="flex gap-2">
                <AppButton label={t('certificate.view')} text onClick={() => h.setViewingCertificateId(c.id)} />
                {h.canRevoke && (status === 'vigente' || status === 'por_vencer') && (
                  <AppButton label={t('certificate.revoke')} text onClick={() => h.setRevoking(c)} />
                )}
                {h.canReissue && status === 'revocado' && (
                  <AppButton label={t('certificate.reissue')} text onClick={() => h.setReissuing(c)} />
                )}
              </div>
            )
          }}
          style={stickyActionsColumn('16rem')}
        />
      </SearchableTableFrame>

      <HistorialDialogs h={h} />
    </>
  )
}
