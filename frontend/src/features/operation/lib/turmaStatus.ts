import type { TurmaData } from '@shared/types/generated'

export type TurmaDisplayStatus = 'em_andamento' | 'habilitada' | 'concluida'

/** 3 estados de exibição derivados de `status` (2 valores) + `habilitada`
 * (derivado no backend): concluida > habilitada > em_andamento. Chave i18n:
 * `operation.status.<valor>`. */
export function turmaDisplayStatus(turma: TurmaData): TurmaDisplayStatus {
  if (turma.status === 'concluida') return 'concluida'
  if (turma.habilitada) return 'habilitada'
  return 'em_andamento'
}

export function turmaStatusSeverity(status: TurmaDisplayStatus): 'info' | 'warning' | 'success' {
  if (status === 'concluida') return 'success'
  if (status === 'habilitada') return 'warning'
  return 'info'
}
