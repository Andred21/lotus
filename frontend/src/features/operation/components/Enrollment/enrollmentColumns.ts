import { COL, tableWidths } from '@shared/ui'

/**
 * Classificação das colunas da `EnrollmentTable`.
 *
 * `actions` é parâmetro e não constante porque a coluna de ação desta tabela sai
 * inteira no registro fechado (`registroBloqueado`): as duas ações recusam a
 * escrita com 422 e uma faixa vazia em toda linha só roubaria largura de quem
 * carrega dado. Sem o parâmetro, os 10% reservados a ela virariam faixa sem dono
 * no registro fechado, e faixa sem dono reescala tudo o que sobra.
 */
export const enrollmentWidths = (actions: boolean) =>
  tableWidths({ name: COL.identity, rut: COL.rut, status: COL.tag }, { actions })

/**
 * A lista de matrículas arquivadas é SEMPRE arquivada — o rastreio não é
 * condicional aqui —, então o orçamento já nasce descontado dos 24% do par de
 * `ARCHIVED_COLUMN`.
 *
 * `actions` é parâmetro pelo mesmo motivo da tabela ativa, e não por simetria: a
 * coluna de `Restaurar` também sai inteira no registro fechado. Congelá-la em
 * `true` deixava 10 pontos sem dono nesse estado, e o navegador os redistribuía
 * sobre o que restou — inclusive sobre `ARCHIVED_COLUMN`, cujo par existe
 * justamente para render 10%/14% IGUAIS nas sete superfícies arquivadas.
 */
export const archivedEnrollmentWidths = (actions: boolean) =>
  tableWidths({ name: COL.identity, rut: COL.rut }, { actions, archived: true })
