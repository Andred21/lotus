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
 *
 * **O folio (B-1, bloco 66) pede peso próprio.** `LOT-AAAA-NNNNN` é mono e nowrap:
 * a 1024 (moldura de 718px, ação de 9rem) sobram 574px para os 90 pontos, e o
 * folio precisa de ~150px — `COL.folio` (24) entrega 153px. O peso vem do aluno
 * (identidade trunca com reticências) e do curso (texto livre, quebra de linha):
 * são as duas colunas que absorvem sem perder dado. Cotización, datas e estado
 * ficam como estavam. O teste do `HistorialTable` refaz a conta.
 */
export const historialWidths = () =>
  tableWidths({
    codigo: COL.folio,
    alumno: { ...COL.identity, weight: 14 },
    curso: { weight: 14 },
    cotizacion: COL.code,
    emitidoEm: COL.date,
    validoAte: COL.date,
    estado: COL.tag,
  })
