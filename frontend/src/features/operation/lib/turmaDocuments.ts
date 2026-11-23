import type { TurmaDocumentType } from '@shared/types/generated'

/** Os 4 tipos do enum backend (D6/RN-16), na ordem de exibição da aba. Só
 * `MANUAL` e `EVALUACION_REDATOR` habilitam a turma; as evaluaciones do cliente
 * e dos alunos são opcionais — quem decide é o backend (`TurmaData.habilitada`,
 * `missing_optional_document_types`), esta lista é só apresentação. */
export const TURMA_DOCUMENT_TYPES: TurmaDocumentType[] = ['MANUAL', 'EVALUACION_REDATOR', 'EVALUACION_CLIENTE', 'EVALUACION_ALUNO']
