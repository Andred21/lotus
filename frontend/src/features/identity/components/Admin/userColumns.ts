import { COL, tableWidths } from '@shared/ui'

/**
 * Classificação das colunas da `UsersTable`.
 *
 * `role` é `short` e não `tag`: a célula imprime `u.role` como texto cru, sem
 * `AppTag` — classificar pela forma que a tela desenha, não pela que o nome da
 * coluna sugere.
 */
export const userWidths = (archived: boolean) =>
  tableWidths(
    { name: COL.identity, role: COL.short, state: COL.tag, lastLogin: COL.dateTime },
    { archived },
  )
