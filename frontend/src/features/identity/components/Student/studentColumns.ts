import { COL, tableWidths } from '@shared/ui'

/**
 * Classificação das colunas da `StudentsTable`.
 *
 * Sem parâmetro: o aluno não tem visão de arquivados (RN-01 — aluno é entidade,
 * não usuário) e a coluna de ação existe em toda linha.
 */
export const studentWidths = () =>
  tableWidths({
    name: COL.identity,
    rut: COL.rut,
    currentClient: COL.short,
    turmas: COL.count,
  })

/**
 * A tabela de turmas dentro do detalhe do aluno. Sem coluna de ação — abrir a
 * turma é navegação, e ela já está no código da primeira coluna.
 */
export const studentTurmaWidths = () =>
  tableWidths(
    { code: COL.code, course: COL.text, date: COL.date, status: COL.tag },
    { actions: false },
  )
