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

/**
 * A tabela de turmas dentro do detalhe do aluno. Sem coluna de ação — abrir a
 * turma é navegação, e ela já está no código da primeira coluna.
 */
export const LARGURA_TURMA_DO_ALUNO = tableWidths(
  { code: COL.code, course: COL.text, date: COL.date, status: COL.tag },
  { acao: false },
)
