import { useMutation } from '@tanstack/react-query'
import { api } from './axios'
import type { ProblemDetails } from './axios'
import { problemFromBlob } from './problemFromBlob'

/**
 * O PDF do certificado como blob autenticado (a rota exige o cookie de
 * sessão).
 *
 * Mora em `shared/api` — e não em `features/certification/api` — porque duas
 * features o pedem: o Historial e a coluna de certificado no detalhe do aluno.
 * Mesmo lugar e mesmo motivo de `shared/api/studentsApi.ts` e
 * `shared/api/redatoresApi.ts`.
 *
 * O gate NÃO muda com a mudança de lugar: `GET /api/certificates/{id}/pdf`
 * segue exigindo `certification.certificate.view` (spec §7).
 */
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
