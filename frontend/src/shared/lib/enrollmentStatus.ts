import type { EnrollmentApprovalStatus } from '@shared/types/generated'

/**
 * Estado de matrícula: rótulo e severidade.
 *
 * Mora em `shared/lib`, não em `features/operation/lib`, porque duas features
 * o consomem — `operation` (tabela de matrículas) e `identity` (histórico de
 * turmas do aluno). Feature não importa feature, nem para tipo: união
 * compartilhada sobe para shared (ADR-05). Duplicar o mapa nas duas telas foi
 * o caminho errado — dois mapas divergem, e o `Record<string, …>` com fallback
 * que a cópia exigia engole estado novo em silêncio.
 */

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
