import type { RedatorData, RedatorDocumentData } from '@shared/types/generated'

const WARN_DAYS = 30

export type DocStatus = 'sin_venc' | 'vigente' | 'por_vencer' | 'vencido'

export function docStatus(validUntil: string | null): DocStatus {
  if (!validUntil) return 'sin_venc'
  const days = (new Date(validUntil).getTime() - Date.now()) / 86_400_000
  // Data que não parseia vira NaN, e `NaN < 0`/`NaN < WARN_DAYS` são ambos
  // false — cairia em "vigente" por omissão. Documento tem peso legal, então
  // a direção conservadora é tratar o caso ambíguo como vencido, nunca como
  // válido por engano.
  if (Number.isNaN(days)) return 'vencido'
  if (days < 0) return 'vencido'
  if (days < WARN_DAYS) return 'por_vencer'
  return 'vigente'
}

export type Idoneidade = 'idoneo' | 'por_vencer' | 'no_idoneo'

/** Idoneidade provisória (visual). Regra canônica + gate por policy = futuro (RN-09). */
export function idoneidade(r: RedatorData): Idoneidade {
  const docs = r.documents ?? []
  const statuses = docs.map((d: RedatorDocumentData) => docStatus(d.valid_until))
  if (docs.length === 0 || statuses.includes('vencido') || r.course_ids.length === 0) return 'no_idoneo'
  if (statuses.includes('por_vencer')) return 'por_vencer'
  return 'idoneo'
}

/** Tipos de documento do redator. Vocabulário do backend (`documents[<tipo>]`),
 * não constante de componente. */
export const DOC_TYPES = ['CV', 'REUF', 'TITULO', 'POSTGRADO'] as const
export type DocType = (typeof DOC_TYPES)[number]

/** Convenção única de cor para idoneidade e para status de documento.
 * Antes existiam três cópias divergindo (RedatoresTable, RedatorDialog inline,
 * catalog/RedatorCard) — e o comentário do RedatorCard já pedia que não se
 * inventasse uma segunda. Agora é uma só, ao lado da regra que a produz. */
export const IDONEIDADE_SEVERITY: Record<Idoneidade, 'success' | 'warning' | 'danger'> = {
  idoneo: 'success',
  por_vencer: 'warning',
  no_idoneo: 'danger',
}

export const DOC_STATUS_SEVERITY: Record<DocStatus, 'success' | 'warning' | 'danger'> = {
  sin_venc: 'success',
  vigente: 'success',
  por_vencer: 'warning',
  vencido: 'danger',
}
