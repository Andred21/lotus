import type { MotivoInidoneidade, RedatorData } from '@shared/types/generated'

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

/** RN-09 no front, como AVISO (bloco 39): os motivos pelos quais o redator não
 * é idôneo para o curso, na mesma ordem do backend (`not_qualified` antes de
 * `reuf_invalid`). `[]` = idôneo. A API é a fronteira autoritativa e aceita a
 * designação de qualquer jeito; aqui só se decide se o front pede confirmação. */
export function motivosInidoneidade(redator: RedatorData, courseId: number): MotivoInidoneidade[] {
  const motivos: MotivoInidoneidade[] = []
  if (!redator.course_ids.includes(courseId)) motivos.push('not_qualified')
  if (!hasValidReuf(redator)) motivos.push('reuf_invalid')
  return motivos
}
