import type { CertificateData, EmissionPanelEnrollmentData } from '@shared/types/generated'

/** Janela de aviso antes do vencimento. Chave i18n dos rótulos: `certificate.status.<valor>`. */
export const POR_VENCER_DIAS = 30

export type CertDerivedStatus = 'vigente' | 'por_vencer' | 'vencido' | 'revocado'

/** Severidade do `AppTag` por status derivado — usada por `HistorialTable` e
 * `CertificateViewDialog`; mora junto do `certStatus` que a indexa. */
export const STATUS_SEVERITY: Record<CertDerivedStatus, 'success' | 'warning' | 'secondary' | 'danger'> = {
  vigente: 'success',
  por_vencer: 'warning',
  vencido: 'secondary',
  revocado: 'danger',
}

/** Deriva o status de exibição a partir de `status` (2 valores, do backend) e
 * `valido_ate` (data, ou `null` para vigência indefinida). `revocado` tem
 * precedência sobre qualquer data (peso legal: um certificado revogado nunca
 * volta a aparecer como vigente por conta de `valido_ate`). Comparação por
 * data pura (sem hora) — `today` truncado para meia-noite local antes de
 * comparar com o limite, também à meia-noite. */
export function certStatus(
  c: Pick<CertificateData, 'status' | 'valido_ate'>,
  today = new Date(),
): CertDerivedStatus {
  if (c.status === 'revocado') return 'revocado'
  if (!c.valido_ate) return 'vigente'
  const limit = new Date(`${c.valido_ate}T00:00:00`)
  // Data que não parseia é `Invalid Date`: TODA comparação abaixo daria falso e
  // a função cairia em `vigente`. Direção conservadora obrigatória em documento
  // com peso legal — `vencido` (regra `frontend-fsliced.md`, mesma política do
  // `valid_until` de documento de redator).
  if (Number.isNaN(limit.getTime())) return 'vencido'
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  if (limit < start) return 'vencido'
  const days = Math.floor((limit.getTime() - start.getTime()) / 86_400_000)
  return days <= POR_VENCER_DIAS ? 'por_vencer' : 'vigente'
}

export type RowCertKind = 'sin_emitir' | 'emitido' | 'no_corresponde'

/** Que célula a linha do painel de emissão mostra na coluna Certificado:
 * já tem certificado emitido, está pendente de emissão (aprovado, sem
 * certificado ainda) ou não corresponde (reprovado/pendente — nunca vai
 * emitir enquanto o estado acadêmico não mudar). */
export function rowCertKind(e: EmissionPanelEnrollmentData): RowCertKind {
  if (e.certificate) return 'emitido'
  return e.approval_status === 'aprobado' ? 'sin_emitir' : 'no_corresponde'
}
