import { technicalDataClass } from '@shared/ui'
import type { EnrollmentData } from '@shared/types/generated'
import { finalGradeOf, formatAttendance, formatGrade } from '../../lib/enrollmentResult'

/** Travessão em texto normal: ausência não é dado técnico, então não usa a fonte mono. */
const Missing = () => <span>—</span>

export function GradeCell({ enrollment, locale }: { enrollment: EnrollmentData; locale: string }) {
  const grade = finalGradeOf(enrollment)
  return grade === null ? <Missing /> : <span className={technicalDataClass}>{formatGrade(grade, locale)}</span>
}

export function AttendanceCell({ enrollment, locale }: { enrollment: EnrollmentData; locale: string }) {
  const pct = enrollment.attendance_pct
  return pct == null || pct === ''
    ? <Missing />
    : <span className={technicalDataClass}>{formatAttendance(pct, locale)}</span>
}
