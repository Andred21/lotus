import { COL, tableWidths } from '@shared/ui'

/**
 * Classificação das colunas da `CoursesTable`.
 *
 * `name` é o `text` desta tabela — é o único campo livre e o mais longo. O
 * `technical_name` é `short` porque é nomenclatura normalizada do setor, de
 * tamanho conhecido, e não frase. `redatorCount` é `short`, não `count`: o
 * CONTEÚDO da célula é um numeral, mas o CABEÇALHO é uma palavra de uma peça
 * só ("Redactores"/"Redatores"/"Writers") sem ponto de quebra — `count`
 * (peso 7) reservava faixa estreita demais e o rótulo transbordava por trás
 * da coluna de ações em 1024x768 (UI-01, `2026-09-04-lotus-ui-review-cursos.md`).
 */
export const courseWidths = (archived: boolean) =>
  tableWidths(
    {
      name: COL.text,
      technicalName: COL.short,
      workload: COL.count,
      redatorCount: COL.short,
    },
    { archived },
  )
