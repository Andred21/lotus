import { usePublicCertificate } from '../api/usePublicCertificate'
import type { PublicCertificateData } from '@shared/types/generated'
import type { ProblemDetails } from '@shared/api/axios'

export type ValidationState =
  | { kind: 'loading' }
  | { kind: 'notFound' }
  | { kind: 'error'; error: ProblemDetails; retry: () => Promise<unknown> }
  | { kind: 'revoked'; cert: PublicCertificateData }
  | { kind: 'expired'; cert: PublicCertificateData }
  | { kind: 'valid'; cert: PublicCertificateData }

/**
 * Deriva o estado de exibição da validação pública por QR (spec D14/D19) a
 * partir de `usePublicCertificate`. A query mora aqui, não em `ValidationPage`
 * — regra de componente declarativo (frontend-fsliced.md): página de feature
 * não chama query/mutation direto, mesmo sendo a rota pública.
 *
 * 404 (código inexistente ou malformado) é resultado válido da consulta, não
 * falha transitória — vira estado próprio (`notFound`), sem retry. Qualquer
 * outro erro (rede, 5xx) fica em `error`, com retry manual (a query nasce com
 * `retry: false`).
 */
export function useValidationPage(uuid: string): ValidationState {
  const query = usePublicCertificate(uuid)

  if (query.isError) {
    if (query.error.status === 404) return { kind: 'notFound' }
    return { kind: 'error', error: query.error, retry: () => query.refetch() }
  }

  if (!query.data) return { kind: 'loading' }

  const cert = query.data
  if (cert.display_status === 'revocado') return { kind: 'revoked', cert }
  if (cert.display_status === 'vencido') return { kind: 'expired', cert }
  return { kind: 'valid', cert }
}
