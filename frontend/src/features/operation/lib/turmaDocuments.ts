import type { TurmaDocumentType } from '@shared/types/generated'

/** Os 3 tipos do enum backend (D6/RN-16), na ordem de exibição da aba.
 * A habilitação da turma exige um arquivo em cada um deles — quem decide é o
 * backend (`TurmaData.habilitada`), esta lista é só apresentação. */
export const TURMA_DOCUMENT_TYPES: TurmaDocumentType[] = ['MANUAL', 'PRUEBAS', 'EVALUACION_REDATOR']

/** Tamanho legível para a linha do arquivo (o backend devolve bytes). */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
