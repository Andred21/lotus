import { useQuery } from '@tanstack/react-query'
import { api } from '@shared/api/axios'
import type { ProblemDetails } from '@shared/api/axios'
import type { PublicCertificateData } from '@shared/types/generated'

/** Arquivo próprio (fora de `certificatesApi.ts`): a página pública de
 * validação por QR não deve importar o módulo autenticado. `retry: false`
 * porque um 404 (código inexistente/errado) é resultado válido da consulta,
 * não falha transitória de rede — repetir só atrasa a resposta ao visitante. */
export function usePublicCertificate(uuid: string) {
  return useQuery<PublicCertificateData, ProblemDetails>({
    queryKey: ['public-certificate', uuid] as const,
    queryFn: () => api.get<PublicCertificateData>(`/api/publico/certificados/${uuid}`).then((r) => r.data),
    enabled: Boolean(uuid),
    retry: false,
    /** Vence o default `false` do `AppProviders`: o cartão do QR imprime o
     * `display_status` derivado no servidor, e o fiscalizador deixa a aba
     * aberta no celular. Mesma razão do `useCertificates` (Q-1 do review de
     * 2026-08-24). */
    refetchOnWindowFocus: true,
  })
}
