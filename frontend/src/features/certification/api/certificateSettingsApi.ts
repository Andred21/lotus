import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@shared/api/axios'
import type { ProblemDetails } from '@shared/api/axios'
import { postMultipart } from '@shared/api/postMultipart'
import type { CertificateSettingsData } from '@shared/types/generated'

const KEY = ['certificate-settings'] as const
const URL = '/api/certificate-settings'
const SIGNATURE_URL = `${URL}/signature`

export type CertificateSettingsPayload = Pick<CertificateSettingsData, 'manager_name' | 'manager_title'>

/** Os quatro verbos devolvem a configuração inteira: a resposta vira o cache, sem
 * segundo GET. Mesmo estado que o PDF lê (D5: assinaturas vivas). */
function useStoreResponse() {
  const qc = useQueryClient()
  return (data: CertificateSettingsData) => qc.setQueryData(KEY, data)
}

export function useCertificateSettings() {
  return useQuery<CertificateSettingsData, ProblemDetails>({
    queryKey: KEY,
    queryFn: () => api.get<CertificateSettingsData>(URL).then((r) => r.data),
  })
}

export function useUpdateCertificateSettings() {
  const store = useStoreResponse()
  return useMutation<CertificateSettingsData, ProblemDetails, CertificateSettingsPayload>({
    mutationFn: (payload) => api.put<CertificateSettingsData>(URL, payload).then((r) => r.data),
    onSuccess: store,
  })
}

export function useUploadManagerSignature() {
  const store = useStoreResponse()
  return useMutation<CertificateSettingsData, ProblemDetails, File>({
    mutationFn: (file) => postMultipart<CertificateSettingsData>(SIGNATURE_URL, { file }),
    onSuccess: store,
  })
}

export function useRemoveManagerSignature() {
  const store = useStoreResponse()
  return useMutation<CertificateSettingsData, ProblemDetails, void>({
    mutationFn: () => api.delete<CertificateSettingsData>(SIGNATURE_URL).then((r) => r.data),
    onSuccess: store,
  })
}
