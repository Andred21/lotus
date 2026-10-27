import type { EnrollmentData } from '@shared/types/generated'

/**
 * Leitura do resultado acadêmico da matrícula para a tabela de alunos.
 *
 * `grades` nasce `Array<any>` no generated.ts (o transformer não distingue
 * mapa de lista), mas o backend grava um mapa; a nota final é `grades.final`.
 */
export function finalGradeOf(e: EnrollmentData): string | null {
  const final = (e.grades as Record<string, unknown> | null | undefined)?.final
  if (final === null || final === undefined) return null
  const text = String(final).trim()
  return text === '' ? null : text
}

/** Nota numérica (vírgula ou ponto) com 1 a 2 casas no locale ativo; texto livre sai como veio. */
export function formatGrade(raw: string, locale: string): string {
  const text = raw.trim()
  if (!/^\d+([.,]\d+)?$/.test(text)) return raw
  return new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 2 })
    .format(Number(text.replace(',', '.')))
}

export function formatAttendance(pct: string, locale: string): string {
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(Number(pct))} %`
}

/** O que falta no resultado da matrícula. Não bloqueia a conclusão: só alimenta o aviso. */
export function missingResultFields(e: EnrollmentData): Array<'grade' | 'attendance'> {
  const missing: Array<'grade' | 'attendance'> = []
  if (finalGradeOf(e) === null) missing.push('grade')
  if (e.attendance_pct == null || String(e.attendance_pct).trim() === '') missing.push('attendance')
  return missing
}
