import { useState } from 'react'
import { useTableFilter, usePermissions } from '@shared/hooks'
import type {
  CertificateData,
  CertificateDisplayStatus,
  EmissionPanelEnrollmentData,
  EmissionPanelTurmaData,
} from '@shared/types/generated'
import { useCertificate, useCertificates, useEmissionPanel } from '../api/certificatesApi'

export type ReissueTarget = { enrollment: EmissionPanelEnrollmentData; turma: EmissionPanelTurmaData }

/**
 * Estado da aba Historial: lista completa (`useCertificates`) + busca + filtro
 * de estado (`useTableFilter`, `where` sobre o `display_status` do servidor) + contagens
 * por estado do rodapé + a query pontual do `Ver` (`useCertificate`, mesmo
 * padrão do `useEmissionPanelState`) + a localização da matrícula/turma no
 * painel de emissão (`useEmissionPanel`, já em cache pela aba Emisión) para o
 * Reemitir. A query mora aqui, não no componente: `no-restricted-syntax`
 * reprova `useQuery`/`useMutation` sob `features/*\/components/**`.
 */
export function useHistorial() {
  const certificates = useCertificates()
  const { can } = usePermissions()
  // O painel só alimenta o Reemitir, que já exige `issue` — para quem só tem
  // `view`, a query desligada evita um 403 garantido no mount da aba.
  const panel = useEmissionPanel(can('certification.certificate.issue'))

  const [statusFilter, setStatusFilterState] = useState<CertificateDisplayStatus | null>(null)
  const [viewingCertificateId, setViewingCertificateId] = useState<number | null>(null)
  const [revoking, setRevoking] = useState<CertificateData | null>(null)
  const [reissuing, setReissuing] = useState<CertificateData | null>(null)
  const viewingCertificate = useCertificate(viewingCertificateId)

  /** Reemissão concluída: fecha a confirmação e abre o diálogo do certificado
   * novo. É UMA transição — enquanto `reissuing` morava no componente e
   * `viewingCertificateId` aqui, ela vivia metade no JSX e metade no hook. */
  const openIssuedCertificate = (certificate: CertificateData) => {
    setReissuing(null)
    setViewingCertificateId(certificate.id)
  }

  const rows = certificates.data ?? []
  const table = useTableFilter(
    rows,
    (c) => [c.codigo, c.snapshot.aluno.name, c.snapshot.aluno.rut],
    statusFilter ? (c) => c.display_status === statusFilter : undefined,
  )

  // O dropdown de estado não passa por `onFilterChange` (isso é só a busca) —
  // sem resetar a página aqui, trocar de estado no meio da página 2 mantém o
  // `first` obsoleto até o clamp do hook agir, o mesmo cuidado que
  // `TurmasTable`/`BudgetsTable` tomam à mão.
  const setStatusFilter = (value: CertificateDisplayStatus | null) => {
    setStatusFilterState(value)
    table.resetPage()
  }

  // Só o filtro de estado: a composição com a busca é da moldura, que exige
  // este callback junto do `filterSlot` (SearchableTableFrame). Sem
  // `resetPage()` porque quem limpa já volta à lista inteira, e a moldura chama
  // o `table.clear()` no mesmo clique.
  const clearStatusFilter = () => setStatusFilterState(null)

  const statusSummary = {
    vigentes: table.rows.filter((c) => c.display_status === 'vigente').length,
    porVencer: table.rows.filter((c) => c.display_status === 'por_vencer').length,
    vencidos: table.rows.filter((c) => c.display_status === 'vencido').length,
    revocados: table.rows.filter((c) => c.display_status === 'revocado').length,
  }

  /** Acha a matrícula/turma do painel de emissão pelo `enrollment_id` do
   * certificado — o painel só sabe falar de matrícula, não de certificado
   * revogado. `null` quando a turma não aparece mais no painel (deixou de ser
   * emissível por outro motivo que não `emission_blocked`, ex. deixou de estar
   * concluída). */
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
    loading: certificates.isLoading,
    loadError: certificates.isError ? (certificates.error ?? null) : null,
    reload: (): Promise<unknown> => certificates.refetch(),
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
