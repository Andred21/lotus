import { useState } from 'react'
import { useTableFilter, usePermissions } from '@shared/hooks'
import type { CertificateData, EmissionPanelEnrollmentData, EmissionPanelTurmaData } from '@shared/types/generated'
import { useCertificate, useCertificates, useEmissionPanel } from '../api/certificatesApi'
import { certStatus, type CertDerivedStatus } from '../lib/certStatus'

export type ReissueTarget = { enrollment: EmissionPanelEnrollmentData; turma: EmissionPanelTurmaData }

/**
 * Estado da aba Historial: lista completa (`useCertificates`) + busca + filtro
 * de estado (`useTableFilter`, `where` derivado de `certStatus`) + contagens
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

  const [statusFilter, setStatusFilterState] = useState<CertDerivedStatus | null>(null)
  const [viewingCertificateId, setViewingCertificateId] = useState<number | null>(null)
  const viewingCertificate = useCertificate(viewingCertificateId)

  const rows = certificates.data ?? []
  const table = useTableFilter(
    rows,
    (c) => [c.codigo, c.snapshot.aluno.name, c.snapshot.aluno.rut],
    statusFilter ? (c) => certStatus(c) === statusFilter : undefined,
  )

  // O dropdown de estado não passa por `onFilterChange` (isso é só a busca) —
  // sem resetar a página aqui, trocar de estado no meio da página 2 mantém o
  // `first` obsoleto até o clamp do hook agir, o mesmo cuidado que
  // `TurmasTable`/`BudgetsTable` tomam à mão.
  const setStatusFilter = (value: CertDerivedStatus | null) => {
    setStatusFilterState(value)
    table.resetPage()
  }

  // Contrato do `filterSlot` (SearchableTableFrame): quem passa um filtro
  // próprio devolve um `clear` COMPOSTO — o `table.clear()` do
  // `useTableFilter` limpa só a busca, e o vazio de filtro da moldura oferece
  // "limpiar filtros" sobre os dois (busca + estado).
  const clearAll = () => {
    table.clear()
    setStatusFilterState(null)
  }

  const statusSummary = {
    vigentes: table.rows.filter((c) => certStatus(c) === 'vigente').length,
    porVencer: table.rows.filter((c) => certStatus(c) === 'por_vencer').length,
    vencidos: table.rows.filter((c) => certStatus(c) === 'vencido').length,
    revocados: table.rows.filter((c) => certStatus(c) === 'revocado').length,
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
    clearAll,
    statusFilter,
    setStatusFilter,
    statusSummary,
    loading: certificates.isLoading,
    loadError: certificates.isError ? (certificates.error ?? null) : null,
    reload: () => { void certificates.refetch() },
    // `can()` é conveniência de interface; a API é que autoriza (ADR-07).
    canRevoke: can('certification.certificate.revoke'),
    canReissue: can('certification.certificate.issue'),
    viewingCertificateId,
    setViewingCertificateId,
    viewingCertificate: viewingCertificate.data ?? null,
    viewingCertificateLoading: viewingCertificate.isLoading,
    viewingCertificateError: viewingCertificate.isError ? (viewingCertificate.error ?? null) : null,
    reloadViewingCertificate: () => { void viewingCertificate.refetch() },
    findReissueTarget,
    reissuePanelLoading: panel.isLoading,
    reissuePanelError: panel.isError ? (panel.error ?? null) : null,
    reissuePanelReload: () => { void panel.refetch() },
  }
}
