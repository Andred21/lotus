import { COL, tableWidths } from '@shared/ui'

/**
 * Classificação das colunas da `RedatoresTable`.
 *
 * `last_login` é `dateTime` e não `date`: `formatDateTime` imprime dia E hora, e
 * a hora é o que distingue dois acessos do mesmo dia — a coluna precisa da fatia
 * maior para não quebrar o carimbo no meio.
 */
export const redatorWidths = (archived: boolean) =>
  tableWidths(
    {
      name: COL.identity,
      rut: COL.rut,
      courses: COL.count,
      suitability: COL.tag,
      lastLogin: COL.dateTime,
    },
    { archived },
  )
