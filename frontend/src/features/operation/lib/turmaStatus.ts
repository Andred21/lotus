import type { TurmaData, TurmaDisplayStatus as GeneratedTurmaDisplayStatus, TurmaModalidade } from '@shared/types/generated'

/** Do backend desde o bloco `hardening-performance-e-dados`: o filtro da lista
 * é SQL (`TurmaQueryBuilder::whereDisplayStatus`) e a paridade com esta
 * derivação é catraca lá (`TurmaStatusParityTest`). O alias fica para os
 * consumidores de célula/cabeçalho não mudarem de import. */
export type TurmaDisplayStatus = GeneratedTurmaDisplayStatus

/** 3 estados de exibição derivados de `status` (2 valores) + `habilitada`
 * (derivado no backend): concluida > habilitada > em_andamento. Chave i18n:
 * `operation.status.<valor>`. */
export function turmaDisplayStatus(turma: TurmaData): TurmaDisplayStatus {
  if (turma.status === 'concluida') return 'concluida'
  if (turma.habilitada) return 'habilitada'
  return 'em_andamento'
}

/** RN-15: turma concluída tranca o REGISTRO ACADÊMICO inteiro — matrícula,
 * resultado, redator e configuração —, não só a documentação. Do lado do
 * servidor são sete Actions passando por `assertAcademicallyWritable()`, todas
 * devolvendo 422; oferecer o controle e recusar a escrita depois esconde do
 * operador que aquele registro está fechado, num sistema em que ele tem peso
 * legal. Dono único da derivação: cada consumidor que a escrevesse à mão
 * (`turma.status === 'concluida'`) é um sítio a mais para a regra divergir
 * quando o backend ganhar um terceiro status. */
export function registroAcademicoBloqueado(turma: TurmaData): boolean {
  return turma.status === 'concluida'
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
