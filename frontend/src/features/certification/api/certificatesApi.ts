import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@shared/api/axios'
import type { ProblemDetails } from '@shared/api/axios'
import { pageEndpoint } from '@shared/api/page'
import type {
  BatchIssueItemResultData,
  CertificateData,
  CertificatePageMetaData,
  EmissionPanelTurmaData,
} from '@shared/types/generated'

const panelKey = ['certificates', 'emission-panel'] as const
export const listKey = ['certificates', 'list'] as const
const detailKey = (id: number) => ['certificates', 'detail', id] as const

/** `enabled` porque o endpoint exige `certification.certificate.issue`:
 * consumidor que pode montar sem essa permissão (Historial, que só a usa para
 * o Reemitir) desliga a query em vez de colher um 403 garantido.
 * `desde` é a janela (spec D7); ausente, o servidor aplica os 12 meses. A
 * data entra na chave: cada janela é uma página de cache própria, e o
 * `panelKey` continua prefixo de todas para as invalidações. */
export function useEmissionPanel(enabled = true, desde?: string) {
  return useQuery<EmissionPanelTurmaData[], ProblemDetails>({
    queryKey: [...panelKey, desde ?? 'default'],
    queryFn: () =>
      api
        .get<EmissionPanelTurmaData[]>('/api/certificates/emission-panel', {
          params: desde ? { concluidas_desde: desde } : {},
        })
        .then((r) => r.data),
    enabled,
  })
}

/** A página do Historial (spec D1): busca, filtro de estado e ordenação no
 * servidor, resumo por estado no `meta` (D6). */
export const certificatesPage = pageEndpoint<CertificateData, CertificatePageMetaData>('/api/certificates')

/** `refetchOnWindowFocus` vence o default `false` do `AppProviders`: o
 * `display_status` de cada linha é derivado no servidor a partir do "hoje" de
 * Santiago e congela no fetch. Aba do Historial aberta atravessando a
 * meia-noite mostraria `vigente` sobre certificado já vencido (Q-1 do review
 * de 2026-08-24). Catraca em `certificatesApi.test.tsx`. Limite conhecido: a
 * aba que nunca perde o foco só corrige no próximo remonte. */
export const certificatesTableOptions = { key: listKey, refetchOnWindowFocus: true } as const

/** Certificado pontual por id — o `Ver` de uma linha já emitida
 * (`useEmissionPanelState`) só recebe `{id, codigo, status}` do painel
 * (`EmissionPanelCertificateData`), sem `created_at`. Busca UM certificado
 * (`GET /api/certificates/{id}`) em vez de puxar a página inteira do
 * Historial — o histórico é um arquivo legal que só cresce, sem teto. */
export function useCertificate(id: number | null) {
  return useQuery<CertificateData, ProblemDetails>({
    queryKey: id === null ? (['certificates', 'detail', 'none'] as const) : detailKey(id),
    queryFn: () => api.get<CertificateData>(`/api/certificates/${id}`).then((r) => r.data),
    enabled: id !== null,
    // Mesmo motivo da página do Historial: o diálogo `Ver` imprime o estado
    // derivado, e ele congela no fetch.
    refetchOnWindowFocus: true,
  })
}

/** Emitir muda as duas telas: o painel de emissão (o alumno some da lista de
 * pendentes) e o histórico (o certificado novo aparece). Toda mutação de
 * emissão/revogação invalida as duas keys. */
function useInvalidate() {
  const qc = useQueryClient()
  return () => {
    qc.invalidateQueries({ queryKey: panelKey })
    qc.invalidateQueries({ queryKey: listKey })
  }
}

export function useIssueCertificate() {
  const invalidate = useInvalidate()
  const qc = useQueryClient()
  return useMutation<CertificateData, ProblemDetails, { enrollmentId: number; redatorId: number }>({
    mutationFn: ({ enrollmentId, redatorId }) =>
      api
        .post<CertificateData>(`/api/enrollments/${enrollmentId}/certificate`, { redator_id: redatorId })
        .then((r) => r.data),
    // A resposta do POST já É o certificado — semeia a key de detalhe com ela
    // para o `IssuedDialog` pós-emissão abrir sem round-trip extra por um dado
    // que acabou de chegar (mesma key que `useCertificate` lê).
    onSuccess: (certificate) => {
      qc.setQueryData(detailKey(certificate.id), certificate)
      invalidate()
    },
  })
}

export function useIssueBatch() {
  const invalidate = useInvalidate()
  return useMutation<BatchIssueItemResultData[], ProblemDetails, { enrollmentIds: number[]; redatorId: number }>({
    mutationFn: ({ enrollmentIds, redatorId }) =>
      api
        .post<BatchIssueItemResultData[]>('/api/certificates/batch', {
          enrollment_ids: enrollmentIds,
          redator_id: redatorId,
        })
        .then((r) => r.data),
    // `onSettled`, não `onSuccess`: cada item do lote tem transação própria, e
    // um 500 no meio deixa certificados já commitados (guarda em
    // `BatchIssueTest::test_falha_inesperada_no_meio_do_lote_preserva_o_que_ja_saiu`).
    // Invalidar só no sucesso deixava o painel mostrando `sin_emitir` para
    // matrícula já certificada.
    onSettled: invalidate,
  })
}

export function useRevokeCertificate() {
  const invalidate = useInvalidate()
  const qc = useQueryClient()
  return useMutation<CertificateData, ProblemDetails, { certificateId: number; reason: string }>({
    mutationFn: ({ certificateId, reason }) =>
      api.post<CertificateData>(`/api/certificates/${certificateId}/revoke`, { reason }).then((r) => r.data),
    // Sem isto, um certificado visto (`Ver`) e depois revogado (Historial,
    // Task 8) segue mostrando o detalhe pré-revogação: `panelKey`/`listKey`
    // não cobrem `detailKey`, e a query pontual do `Ver` (`useCertificate`)
    // fica presa no cache antigo. Era inofensivo enquanto a revogação não
    // tinha UI — deixa de ser no mesmo commit que a ganha.
    onSuccess: (certificate) => {
      qc.invalidateQueries({ queryKey: detailKey(certificate.id) })
      invalidate()
    },
  })
}
