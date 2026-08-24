import { COL, tableWidths } from '@shared/ui'

/**
 * Classificação das colunas da `HistorialTable`.
 *
 * Const, e não função: o histórico de certificados não tem visão de arquivados e
 * a coluna de ação existe em toda linha — nada aqui depende de estado de render.
 *
 * As duas datas são `date` e não `dateTime`: `formatDate` imprime só o dia (o
 * timestamp existe no DTO, mas a hora seria informação nova na tela).
 */
export const LARGURA_HISTORIAL = tableWidths({
  codigo: COL.code,
  alumno: COL.identity,
  curso: COL.text,
  emitidoEm: COL.date,
  validoAte: COL.date,
  estado: COL.tag,
})
