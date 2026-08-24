import type { CertificateDisplayStatus } from '@shared/types/generated'

/**
 * Estado de exibição do certificado: severidade e rótulo.
 *
 * O que sobe para cá é só a APRESENTAÇÃO. A derivação não subiu — ela morreu:
 * o estado agora vem do servidor em `display_status` (spec D4), e o
 * `certStatus()` que a refazia no React saiu de
 * `features/certification/lib/certStatus.ts`.
 *
 * Mora em `shared/lib` pelo mesmo motivo de `enrollmentStatus.ts`: duas
 * features consomem — `certification` (Historial, cartão do QR) e `identity`
 * (coluna do detalhe do aluno) — e feature não importa feature, nem para tipo
 * (ADR-05). Mesmo molde do `DOC_STATUS_SEVERITY` em `redatorStatus.ts`.
 *
 * `Record` fechado, não `Record<string, …>` com fallback: valor novo no enum
 * tem de reprovar o type-check, não sumir em silêncio numa cor padrão.
 */
export const CERTIFICATE_STATUS_SEVERITY: Record<
  CertificateDisplayStatus,
  'success' | 'warning' | 'secondary' | 'danger'
> = {
  vigente: 'success',
  por_vencer: 'warning',
  vencido: 'secondary',
  revocado: 'danger',
}

/** Chave i18n do rótulo; o componente traduz. */
export function certificateStatusLabelKey(status: CertificateDisplayStatus): string {
  return `certificate.status.${status}`
}
