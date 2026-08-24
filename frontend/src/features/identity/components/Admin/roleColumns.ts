import { COL, tableWidths } from '@shared/ui'

/**
 * Classificação das colunas da `RolesTable`.
 *
 * `name` é o `text` desta tabela: com três colunas de dado só, o nome do papel é
 * o campo livre, e é ele que precisa da fatia maior. `permissions` é `count`
 * porque a célula imprime a quantidade, não a lista.
 */
export const LARGURA_PAPEL = tableWidths({
  name: COL.text,
  kind: COL.tag,
  permissions: COL.count,
})
