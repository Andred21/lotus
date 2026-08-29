import { useState } from 'react'
import { usePermissions, useServerTable } from '@shared/hooks'
import type {
  CertificateData,
  CertificateDisplayStatus,
  CertificatePageMetaData,
  EmissionPanelEnrollmentData,
  EmissionPanelTurmaData,
} from '@shared/types/generated'
import { certificatesPage, certificatesTableOptions, useCertificate, useEmissionPanel } from '../api/certificatesApi'

export type ReissueTarget = { enrollment: EmissionPanelEnrollmentData; turma: EmissionPanelTurmaData }

/**
 * Estado da aba Historial: a página do servidor (`useServerTable` sobre
 * `certificatesPage`, com busca, filtro `display_status` e sort no backend —
 * spec D1/D4) + contagens por estado lidas de `meta.summary` (D6) + a query
 * pontual do `Ver` (`useCertificate`, mesmo padrão do `useEmissionPanelState`)
 * + a localização da matrícula/turma no painel de emissão (`useEmissionPanel`,
 * já em cache pela aba Emisión) para o Reemitir. A query mora aqui, não no
 * componente: `no-restricted-syntax` reprova `useQuery`/`useMutation` sob
 * `features/*\/components/**`.
 *
 * `loadError` segue `loadFailure` (`{}` sem corpo) desde que a lista vem do
 * `useServerTable` — a exceção que a rule registrava para este hook acabou.
 */
export function useHistorial() {
  const { can } = usePermissions()
  // O painel só alimenta o Reemitir, que já exige `issue` — para quem só tem
  // `view`, a query desligada evita um 403 garantido no mount da aba.
  const panel = useEmissionPanel(can('certification.certificate.issue'))

  const [statusFilter, setStatusFilter] = useState<CertificateDisplayStatus | null>(null)
  const [viewingCertificateId, setViewingCertificateId] = useState<number | null>(null)
  const [revoking, setRevoking] = useState<CertificateData | null>(null)
  const [reissuing, setReissuing] = useState<CertificateData | null>(null)
  const viewingCertificate = useCertificate(viewingCertificateId)

  // Trocar o filtro volta à página 1 dentro do hook — não há `resetPage()` a
  // chamar aqui, ao contrário do que `TurmasTable`/`BudgetsTable` faziam à mão.
  const table = useServerTable<CertificateData, CertificatePageMetaData>(certificatesPage, {
    ...certificatesTableOptions,
    filters: { display_status: statusFilter },
  })

  /** Reemissão concluída: fecha a confirmação e abre o diálogo do certificado
   * novo. É UMA transição — enquanto `reissuing` morava no componente e
   * `viewingCertificateId` aqui, ela vivia metade no JSX e metade no hook. */
  const openIssuedCertificate = (certificate: CertificateData) => {
    setReissuing(null)
    setViewingCertificateId(certificate.id)
  }

  // Só o filtro de estado: a composição com a busca é da moldura, que exige
  // este callback junto do `filterSlot` (SearchableTableFrame).
  const clearStatusFilter = () => setStatusFilter(null)

  // Do `meta` (spec D6): contado no servidor sobre o escopo de `q`, com o
  // MESMO `CASE` do filtro. Zeros antes do primeiro GET.
  const statusSummary = {
    vigentes: table.meta?.summary.vigente ?? 0,
    porVencer: table.meta?.summary.por_vencer ?? 0,
    vencidos: table.meta?.summary.vencido ?? 0,
    revocados: table.meta?.summary.revocado ?? 0,
  }

  /** Acha a matrícula/turma do painel de emissão pelo `enrollment_id` do
   * certificado — o painel só sabe falar de matrícula, não de certificado
   * revogado. `null` quando a turma não aparece mais no painel. */
  const findReissueTarget = (certificate: CertificateData): ReissueTarget | null => {
    for (const turma of panel.data ?? []) {
      const enrollment = turma.enrollments.find((e) => e.enrollment_id === certificate.enrollment_id)
      if (enrollment) return { enrollment, turma }
    }
    return null
  }

  return {
    table,
    statusFilter,
    setStatusFilter,
    clearStatusFilter,
    statusSummary,
    loading: table.loading,
    loadError: table.error,
    reload: table.refetch,
    // `can()` é conveniência de interface; a API é que autoriza (ADR-07).
    canRevoke: can('certification.certificate.revoke'),
    canReissue: can('certification.certificate.issue'),
    viewingCertificateId,
    setViewingCertificateId,
    revoking,
    setRevoking,
    reissuing,
    setReissuing,
    openIssuedCertificate,
    viewingCertificate: viewingCertificate.data ?? null,
    viewingCertificateLoading: viewingCertificate.isLoading,
    viewingCertificateError: viewingCertificate.isError ? (viewingCertificate.error ?? null) : null,
    reloadViewingCertificate: (): Promise<unknown> => viewingCertificate.refetch(),
    findReissueTarget,
    reissuePanelLoading: panel.isLoading,
    reissuePanelError: panel.isError ? (panel.error ?? null) : null,
    reissuePanelReload: (): Promise<unknown> => panel.refetch(),
  }
}
