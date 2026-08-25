import { COL, tableWidths } from '@shared/ui'

/**
 * Classificação das colunas da `CoursesTable`.
 *
 * `name` é o `text` desta tabela — é o único campo livre e o mais longo. O
 * `technical_name` é `short` porque é nomenclatura normalizada do setor, de
 * tamanho conhecido, e não frase.
 */
export const courseWidths = (archived: boolean) =>
  tableWidths(
    {
      name: COL.text,
      technicalName: COL.short,
      workload: COL.count,
      redatorCount: COL.count,
    },
    { archived },
  )
