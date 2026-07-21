import type { RedatorData } from '@shared/types/generated'

const REUF = 'REUF'

function todayIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** REUF vigente = presente E (`valid_until` nulo OU data >= hoje). Data
 * inparseável conta como VENCIDA (direção conservadora — peso legal). Compara
 * string ISO `YYYY-MM-DD` (ordem lexicográfica = ordem cronológica). */
function hasValidReuf(redator: RedatorData): boolean {
  const today = todayIso()
  return redator.documents.some((doc) => {
    if (doc.type !== REUF) return false
    if (doc.valid_until == null) return true
    const iso = doc.valid_until.slice(0, 10)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false
    return iso >= today
  })
}

/** RN-09 no front: redator habilitado ao curso E com REUF vigente. Mesma regra do
 * `RedatorIdoneidadeService` do backend (que é a fronteira autoritativa — `can()`
 * de UI, ADR-07). */
export function isEligible(redator: RedatorData, courseId: number): boolean {
  return redator.course_ids.includes(courseId) && hasValidReuf(redator)
}
