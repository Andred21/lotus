import { useMutation } from '@tanstack/react-query'
import { api } from '@shared/api/axios'
import type { ProblemDetails } from '@shared/api/axios'
import { problemFromBlob } from '@shared/api/problemFromBlob'

/**
 * A amostra do certificado de um curso, como blob autenticado (a rota exige o
 * cookie de sessão). Na forma do `useCertificatePdf` de `shared/api`.
 *
 * O PDF sai com o código `MUESTRA` e a marca d'água `MUESTRA — SIN VALIDEZ`:
 * nada é persistido, auditado nem numerado. O gate é
 * `certification.certificate.view`, o mesmo do PDF emitido.
 */
export function useCertificatePreview() {
  return useMutation<Blob, ProblemDetails, number>({
    mutationFn: (courseId) =>
      api
        .get<Blob>(`/api/courses/${courseId}/certificate-preview`, { responseType: 'blob' })
        .then((r) => r.data)
        .catch(async (error: unknown) => {
          throw await problemFromBlob(error)
        }),
  })
}
