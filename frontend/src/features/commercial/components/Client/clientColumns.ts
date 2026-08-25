import { COL, tableWidths } from "@shared/ui";

/**
 * Classificação das colunas da `ClientsTable`.
 *
 * `commune` é `short` porque a célula lê `addresses[0].commune` — nome de comuna
 * chilena, de tamanho conhecido —, e `contacts` é `count` porque a célula imprime
 * a quantidade, não a lista.
 */
export const clientWidths = (archived: boolean) =>
  tableWidths(
    {
      legalName: COL.identity,
      rut: COL.rut,
      type: COL.tag,
      commune: COL.short,
      contacts: COL.count,
    },
    { archived },
  );
