import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@shared/api/axios'
import type { ProblemDetails } from '@shared/api/axios'
import { problemFromBlob } from '@shared/api/problemFromBlob'
import type {
  BatchIssueItemResultData,
  CertificateData,
  EmissionPanelTurmaData,
} from '@shared/types/generated'

const panelKey = ['certificates', 'emission-panel'] as const
const listKey = ['certificates', 'list'] as const
const detailKey = (id: number) => ['certificates', 'detail', id] as const

export function useEmissionPanel() {
  return useQuery<EmissionPanelTurmaData[], ProblemDetails>({
    queryKey: panelKey,
    queryFn: () => api.get<EmissionPanelTurmaData[]>('/api/certificates/emission-panel').then((r) => r.data),
  })
}

export function useCertificates() {
  return useQuery<CertificateData[], ProblemDetails>({
    queryKey: listKey,
    queryFn: () => api.get<CertificateData[]>('/api/certificates').then((r) => r.data),
  })
}

/** Certificado pontual por id — o `Ver` de uma linha já emitida
 * (`useEmissionPanelState`) só recebe `{id, codigo, status}` do painel
 * (`EmissionPanelCertificateData`), sem `created_at`. Busca UM certificado
 * (`GET /api/certificates/{id}`) em vez de puxar `useCertificates()` inteiro —
 * o histórico é um arquivo legal que só cresce, sem teto. */
export function useCertificate(id: number | null) {
  return useQuery<CertificateData, ProblemDetails>({
    queryKey: id === null ? (['certificates', 'detail', 'none'] as const) : detailKey(id),
    queryFn: () => api.get<CertificateData>(`/api/certificates/${id}`).then((r) => r.data),
    enabled: id !== null,
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
    onSuccess: invalidate,
  })
}

export function useRevokeCertificate() {
  const invalidate = useInvalidate()
  return useMutation<CertificateData, ProblemDetails, { certificateId: number; reason: string }>({
    mutationFn: ({ certificateId, reason }) =>
      api.post<CertificateData>(`/api/certificates/${certificateId}/revoke`, { reason }).then((r) => r.data),
    onSuccess: invalidate,
  })
}

export function useCertificatePdf() {
  return useMutation<Blob, ProblemDetails, number>({
    mutationFn: (id) =>
      api
        .get<Blob>(`/api/certificates/${id}/pdf`, { responseType: 'blob' })
        .then((r) => r.data)
        .catch(async (error: unknown) => {
          throw await problemFromBlob(error)
        }),
  })
}
