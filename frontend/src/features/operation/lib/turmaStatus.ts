import type { TurmaData, TurmaModalidade } from '@shared/types/generated'

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

/** Props de tom do `AppTag` para a modalidade. Modalidade **não é severidade**
 * (spec D7): `presencial` usa o neutro do PrimeReact e `online` usa o tom
 * `accent`, que não tem `severity` equivalente. Espalhe no AppTag:
 * `<AppTag {...turmaModalidadeTagProps(m)} />`. */
export function turmaModalidadeTagProps(
  modalidade: TurmaModalidade,
): { severity: 'secondary' } | { tone: 'accent' } {
  return modalidade === 'online' ? { tone: 'accent' } : { severity: 'secondary' }
}
