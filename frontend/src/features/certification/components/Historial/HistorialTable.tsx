import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { AppColumn, AppTag, AppButton, AppEmptyState, AppDropdown, IdentityCell, SearchableTableFrame, stickyActionsColumn } from '@shared/ui'
import type { CertificateData, CertificateDisplayStatus } from '@shared/types/generated'
import { formatDate, CERTIFICATE_STATUS_SEVERITY, certificateStatusLabelKey } from '@shared/lib'
import { useHistorial } from '../../hooks/useHistorial'
import { historialWidths } from './historialColumns'
import { HistorialDialogs } from './HistorialDialogs'

const STATUSES: CertificateDisplayStatus[] = ['vigente', 'por_vencer', 'vencido', 'revocado']

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
  const statusInputId = useId()

  const statusOptions = [
    { label: t('certificate.filterAll'), value: null },
    ...STATUSES.map((s) => ({ label: t(`certificate.status.${s}`), value: s })),
  ]

  return (
    <>
      <SearchableTableFrame
        table={h.table}
        searchPlaceholder={t('certificate.searchPlaceholder')}
        onClearFilter={h.clearStatusFilter}
        filterSlot={
          /* Par rótulo+`inputId`, e não um `<div className="w-48">` com o
           * dropdown solto dentro: sem ele o controle só expõe o VALOR corrente
           * ("Todos") e o leitor de tela anuncia "Todos, combo box", sem dizer o
           * que se filtra. É a TERCEIRA vez que o mesmo achado aparece — UI-07
           * da run de Operação (2026-08-23), UI-02 da de Comercial e UI-01 da de
           * Certificados (2026-08-25) —, sempre nesta mesma forma. `useId` e não
           * id fixo, porque um id hardcoded duplicaria em silêncio se a aba
           * ganhasse uma segunda tabela; `inputId` e não `id`, pelo motivo que o
           * `AppDropdown` documenta. A chave é a que já titula a coluna. */
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor={statusInputId} className="text-sm" style={{ color: 'var(--text-color-secondary)' }}>
              {t('certificate.colStatus')}
            </label>
            <div className="w-48">
              <AppDropdown
                inputId={statusInputId}
                value={h.statusFilter}
                options={statusOptions}
                optionValue="value"
                onChange={(e) => h.setStatusFilter(e.value)}
              />
            </div>
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
              description={ausente(c.snapshot.aluno.rut) ? '—' : c.snapshot.aluno.rut}
              image={c.aluno_photo_url}
            />
          )}
          style={largura.alumno}
        />
        <AppColumn header={t('certificate.colCourse')} body={(c: CertificateData) => c.snapshot.curso.name} style={largura.curso} />
        <AppColumn
          header={t('certificate.colIssuedAt')}
          body={(c: CertificateData) => formatDate(new Date(c.created_at))}
          style={largura.emitidoEm}
        />
        <AppColumn
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
