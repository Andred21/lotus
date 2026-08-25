import { COL, tableWidths } from '@shared/ui'

/**
 * Classificação das colunas da `BudgetsTable`.
 *
 * `totalValue` é `money` e não `count`: a célula imprime valor E unidade
 * (`formatUf(...) UF`), e é a unidade colada no número que não pode quebrar
 * para a linha de baixo.
 */
export const budgetWidths = (archived: boolean) =>
  tableWidths(
    {
      code: COL.code,
      client: COL.identity,
      quoteCount: COL.count,
      totalValue: COL.money,
      status: COL.tag,
    },
    { archived },
  )
