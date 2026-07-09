import type { RedatorData, RedatorDocumentData } from '@shared/types/generated'

const WARN_DAYS = 30

export type DocStatus = 'sin_venc' | 'vigente' | 'por_vencer' | 'vencido'

export function docStatus(validUntil: string | null): DocStatus {
  if (!validUntil) return 'sin_venc'
  const days = (new Date(validUntil).getTime() - Date.now()) / 86_400_000
  if (days < 0) return 'vencido'
  if (days < WARN_DAYS) return 'por_vencer'
  return 'vigente'
}

/** Idoneidade provisória (visual). Regra canônica + gate por policy = futuro (RN-09). */
export function idoneidade(r: RedatorData): 'idoneo' | 'por_vencer' | 'no_idoneo' {
  const docs = r.documents ?? []
  const statuses = docs.map((d: RedatorDocumentData) => docStatus(d.valid_until))
  if (statuses.includes('vencido') || r.course_ids.length === 0) return 'no_idoneo'
  if (statuses.includes('por_vencer')) return 'por_vencer'
  return 'idoneo'
}
