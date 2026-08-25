import { COL, tableWidths } from '@shared/ui'

/**
 * Classificação das colunas da `HistorialTable`.
 *
 * Sem parâmetro: o histórico de certificados não tem visão de arquivados e a
 * coluna de ação existe em toda linha — nada aqui depende de estado de render.
 *
 * As duas datas são `date` e não `dateTime`: `formatDate` imprime só o dia (o
 * timestamp existe no DTO, mas a hora seria informação nova na tela).
 *
 * A ação desta tabela é a mais larga do sistema (`16rem`, dois botões de texto),
 * bem acima dos 10 pontos que o orçamento reserva — por isso as colunas daqui
 * entregam menos do que declaram, preservando as razões entre si. É a §4 do
 * registro de medição do item 17, não um defeito desta classificação.
 */
export const historialWidths = () =>
  tableWidths({
    codigo: COL.code,
    alumno: COL.identity,
    curso: COL.text,
    emitidoEm: COL.date,
    validoAte: COL.date,
    estado: COL.tag,
  })
