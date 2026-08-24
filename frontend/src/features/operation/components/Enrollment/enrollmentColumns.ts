import { COL, tableWidths } from '@shared/ui'

/**
 * Classificação das colunas da `EnrollmentTable`.
 *
 * `acao` é parâmetro e não constante porque a coluna de ação desta tabela sai
 * inteira no registro fechado (`registroBloqueado`): as duas ações recusam a
 * escrita com 422 e uma faixa vazia em toda linha só roubaria largura de quem
 * carrega dado. Sem o parâmetro, os 10% reservados a ela virariam faixa sem
 * dono no registro fechado — o sorteio do `table-layout: auto` de volta.
 */
export const enrollmentWidths = (acao: boolean) =>
  tableWidths({ name: COL.identity, rut: COL.rut, status: COL.tag }, { acao })
