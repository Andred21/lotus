import type { EnrollmentApprovalStatus } from '@shared/types/generated'

/** Rótulo do estado de matrícula (pendiente = "Matriculado"). Chave i18n; o
 * componente traduz. */
export function enrollmentStatusLabelKey(status: EnrollmentApprovalStatus): string {
  return `operation.enrollment.status.${status}`
}

export function enrollmentStatusSeverity(
  status: EnrollmentApprovalStatus,
): 'info' | 'success' | 'danger' {
  switch (status) {
    case 'aprobado':
      return 'success'
    case 'reprobado':
      return 'danger'
    default:
      return 'info'
  }
}
