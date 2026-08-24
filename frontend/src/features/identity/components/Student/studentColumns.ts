import { COL, tableWidths } from '@shared/ui'

/**
 * Classificação das colunas da `StudentsTable`.
 *
 * Const, e não função: o aluno não tem visão de arquivados (RN-01 — aluno é
 * entidade, não usuário) e a coluna de ação existe em toda linha.
 */
export const LARGURA_ALUNO = tableWidths({
  name: COL.identity,
  rut: COL.rut,
  currentClient: COL.short,
  turmas: COL.count,
})
