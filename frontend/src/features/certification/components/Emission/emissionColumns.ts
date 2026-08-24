import { COL, tableWidths } from '@shared/ui'

/**
 * Classificação das colunas da `EmissionStudentsTable`.
 *
 * `certificate` é `short` e não `tag`: a célula imprime texto cru — `✓ <código>`
 * quando emitido, e uma frase curta traduzida quando não —, sem `AppTag`.
 * Classificar pela forma que a tela desenha.
 *
 * Const, e não função: a coluna de ação existe em toda visão. O `body` dela
 * devolve `null` na linha que não corresponde, mas a COLUNA não sai — a reserva
 * de largura dela continua devida.
 */
export const LARGURA_EMISSAO = tableWidths({
  name: COL.identity,
  finalGrade: COL.count,
  attendance: COL.count,
  acadStatus: COL.tag,
  certificate: COL.short,
})
