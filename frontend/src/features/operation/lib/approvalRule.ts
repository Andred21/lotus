import type { ApprovalRuleData, EnrollmentApprovalStatus } from '@shared/types/generated'

const NUMERIC = /^\d+([.,]\d+)?$/

function parse(raw: string, min: number, max: number): number | null {
  const text = raw.trim()
  if (!NUMERIC.test(text)) return null
  const value = Number(text.replace(',', '.'))
  return value >= min && value <= max ? value : null
}

/** Nota digitada (vírgula ou ponto, com espaços em volta) na escala chilena 1,0–7,0; fora dela, `null`. */
export function parseGrade(raw: string): number | null {
  return parse(raw, 1, 7)
}

/** Presença digitada em 0–100; mesma leitura da nota. */
export function parseAttendance(raw: string): number | null {
  return parse(raw, 0, 100)
}

/**
 * Status que a regra mínima da turma indica para a nota e a presença digitadas.
 * `null` quando falta a regra ou um dos dois valores não é legível: nesse caso
 * nada é sugerido e o status do form fica como está. A regra (nota e presença
 * mínimas) mora no backend e chega em `TurmaData.approval_rule`.
 */
export function suggestedStatus(
  finalGrade: string,
  attendance: string,
  rule: ApprovalRuleData | undefined,
): Extract<EnrollmentApprovalStatus, 'aprobado' | 'reprobado'> | null {
  if (!rule) return null
  const grade = parseGrade(finalGrade)
  const pct = parseAttendance(attendance)
  if (grade === null || pct === null) return null
  return grade >= rule.min_grade && pct >= rule.min_attendance_pct ? 'aprobado' : 'reprobado'
}
