import { useState } from 'react'
import { useLoadState, usePermissions, useServerTable, useTableUrlState } from '@shared/hooks'
import type {
  CertificateData,
  CertificateDisplayStatus,
  CertificatePageMetaData,
  EmissionPanelEnrollmentData,
  EmissionPanelTurmaData,
} from '@shared/types/generated'
import {
  certificatesPage,
  certificatesTableOptions,
  useCertificate,
  useCertificateQuotes,
  useEmissionPanel,
} from '../api/certificatesApi'

const CERTIFICATE_STATUSES: readonly CertificateDisplayStatus[] = ['vigente', 'por_vencer', 'vencido', 'revocado']

/** As colunas `sortable` de `HistorialTable`: só elas valem como `sort` da URL. */
const SORTABLE = ['codigo', 'created_at', 'valido_ate']

export type ReissueTarget = { enrollment: EmissionPanelEnrollmentData; turma: EmissionPanelTurmaData }

/**
 * Estado da aba Historial: a página do servidor (`useServerTable` sobre
 * `certificatesPage`, com busca, filtros `display_status` e `quote_id` e sort no backend —
 * spec D1/D4) + contagens por estado lidas de `meta.summary` (D6) + a query
 * pontual do `Ver` (`useCertificate`, mesmo padrão do `useEmissionPanelState`)
 * + a localização da matrícula/turma no painel de emissão (`useEmissionPanel`,
 * ligado só quando há Reemitir aberto, na janela daquele certificado) para o
 * Reemitir. A query mora aqui, não no componente: `no-restricted-syntax`
 * reprova `useQuery`/`useMutation` sob `features/*\/components/**`.
 *
 * Busca, página, sort e os dois filtros moram na URL (C-3, chaves `q`, `page`,
 * `sort`, `display_status` e `quote_id`): recarregar ou voltar da revogação
 * reabre a lista como estava. Valor que não decodifica — estado desconhecido,
 * cotação que não é inteiro positivo — é "sem filtro", nunca erro.
 *
 * `loadError` segue `loadFailure` (`{}` sem corpo) desde que a lista vem do
 * `useServerTable` — a exceção que a rule registrava para este hook acabou.
 */
export function useHistorial() {
  const { can } = usePermissions()

  const url = useTableUrlState({ enabled: true })
  const statusFilter = CERTIFICATE_STATUSES.find((s) => s === url.read('display_status')) ?? null
  const setStatusFilter = (next: CertificateDisplayStatus | null) => url.write({ display_status: next })
  const rawQuote = url.read('quote_id')
  const quoteFilter = rawQuote !== null && /^[1-9]\d*$/.test(rawQuote) ? Number(rawQuote) : null
  const setQuoteFilter = (next: number | null) => url.write({ quote_id: next === null ? null : String(next) })
  const quotes = useLoadState(useCertificateQuotes())
  const [viewingCertificateId, setViewingCertificateId] = useState<number | null>(null)
  const [revoking, setRevoking] = useState<CertificateData | null>(null)
  const [reissuing, setReissuing] = useState<CertificateData | null>(null)
  const viewingCertificate = useCertificate(viewingCertificateId)

  // O painel só alimenta o Reemitir, que já exige `issue` — para quem só tem
  // `view`, a query desligada evita um 403 garantido no mount da aba. E só
  // ligada COM certificado em mão: a janela do painel é a da turma DESTE
  // certificado (`end_date` congelado no snapshot), não os 12 meses default.
  // Revogar acontece muito depois de concluir; com a janela default, turma
  // concluída há mais de 12 meses saía do painel, `findReissueTarget` devolvia
  // `null` e o diálogo mostrava `reissueUnavailable` — a MESMA tarja de um
  // bloqueio legítimo — enquanto o `CertificateEligibility` do backend seguia
  // autorizando o POST (Q-1 do review de 2026-08-29). Sem `end_date` no
  // snapshot (documento antigo/corrompido), cai no default do servidor.
  const panel = useEmissionPanel(
    reissuing !== null && can('certification.certificate.issue'),
    reissuing?.snapshot.turma.end_date ? { period_start: reissuing.snapshot.turma.end_date } : undefined,
  )

  // Trocar o filtro volta à página 1 dentro do hook — não há `resetPage()` a
  // chamar aqui, ao contrário do que `TurmasTable`/`BudgetsTable` faziam à mão.
  const table = useServerTable<CertificateData, CertificatePageMetaData>(certificatesPage, {
    ...certificatesTableOptions,
    filters: { display_status: statusFilter, quote_id: quoteFilter },
    url: { sortable: SORTABLE },
  })

  /** Reemissão concluída: fecha a confirmação e abre o diálogo do certificado
   * novo. É UMA transição — enquanto `reissuing` morava no componente e
   * `viewingCertificateId` aqui, ela vivia metade no JSX e metade no hook. */
  const openIssuedCertificate = (certificate: CertificateData) => {
    setReissuing(null)
    setViewingCertificateId(certificate.id)
  }

  // Os dois filtros nomeados (estado e cotação): a composição com a busca é da
  // moldura, que exige este callback junto do `filterSlot` (SearchableTableFrame).
  const clearFilters = () => url.write({ display_status: null, quote_id: null })

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
    quoteFilter,
    setQuoteFilter,
    quoteOptions: quotes.data,
    // Só a falha SEM opções em mão custa algo (filtro vazio e ZIP travado, que
    // exige cotação): com cache, o refetch falho mantém a lista utilizável.
    quoteLoadFailure: quotes.failedWithoutData
      ? { errorDetail: quotes.errorDetail, errorHint: quotes.errorHint }
      : null,
    reloadQuotes: quotes.refetch,
    clearFilters,
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
