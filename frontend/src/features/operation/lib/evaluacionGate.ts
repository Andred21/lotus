import type { TurmaDocumentType, TurmaStatus } from '@shared/types/generated'

type Can = (permission: string) => boolean

/** Quem anexa e quem remove cada tipo de documento da turma, ESPELHANDO o
 * `TurmaDocumentGate` do backend (spec §4.6). É só conveniência de interface:
 * quem decide é a API (ADR-07) e ela recusa o que esta função deixar passar.
 * A matriz do backend (`TurmaEvaluacionUploadMatrixTest`) é a fonte; o teste por
 * tabela daqui reproduz as mesmas linhas.
 *
 * | Tipo                       | Em andamento             | Concluída                             |
 * |----------------------------|--------------------------|---------------------------------------|
 * | MANUAL, EVALUACION_REDATOR | submit_docs              | manage_concluded_docs                 |
 * | EVALUACION_ALUNO           | submit_docs              | submit_docs ou manage_concluded_docs  |
 * | EVALUACION_CLIENTE         | submit_client_evaluation | submit_client_evaluation              |
 *
 * Remover: em andamento segue a linha do tipo; em concluída exige
 * `manage_concluded_docs` para todos os tipos (além da permissão-base do tipo). */
const SUBMIT_DOCS = 'operation.turma.submit_docs'
const MANAGE_CONCLUDED = 'operation.turma.manage_concluded_docs'
const SUBMIT_CLIENT = 'operation.turma.submit_client_evaluation'

/** A permissão-base do tipo: o ator alguma vez tocaria este tipo? */
function temPapel(type: TurmaDocumentType, can: Can): boolean {
  return type === 'EVALUACION_CLIENTE' ? can(SUBMIT_CLIENT) : can(SUBMIT_DOCS) || can(MANAGE_CONCLUDED)
}

export function podeAnexar(type: TurmaDocumentType, status: TurmaStatus, can: Can): boolean {
  if (!temPapel(type, can)) return false
  if (status !== 'concluida') return true
  // Turma concluída: Cliente e Alumnos seguem abertos ao papel que os tem.
  if (type === 'EVALUACION_CLIENTE' || type === 'EVALUACION_ALUNO') return true
  return can(MANAGE_CONCLUDED)
}

export function podeRemover(type: TurmaDocumentType, status: TurmaStatus, can: Can): boolean {
  if (!temPapel(type, can)) return false
  return status !== 'concluida' || can(MANAGE_CONCLUDED)
}
