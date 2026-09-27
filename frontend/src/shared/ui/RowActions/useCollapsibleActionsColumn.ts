// Caminho FUNDO, como o `AppBarChart`: o barrel `@shared/hooks` reexporta hooks
// que importam `shared/ui`, e passar por ele arrastaria a camada para dentro de
// uma linha de tabela.
import { useIsNarrowViewport } from '@shared/hooks/useViewport'

/** Um botão de ícone (2.5rem) mais o `px-4` da célula — o que sobra para a
 * coluna presa quando a linha colapsa num controle só. */
const COLLAPSED_WIDTH = '4.5rem'

/**
 * A largura da coluna presa de ações que colapsa abaixo de `sm`, e o booleano
 * que a linha repassa a `RowActions`/`ArchiveRowActions`.
 *
 * Devolve a LARGURA, e não o `style`: a coluna segue escrevendo
 * `style={stickyActionsColumn(acoes.width)}`, que é a âncora que a catraca
 * `ACAO_SEM_ANCORA` do `eslint.config.js` procura em toda coluna de ação.
 *
 * Opt-in por tabela, e não no `stickyActionsColumn` de todas: a coluna só pode
 * encolher se a linha colapsar junto, e cada tabela que liga isto passa a ter
 * um layout de telefone novo, medido no navegador e não suposto. Hoje:
 * Redactores, Alumnos, Usuarios e Roles (item 16 fatia 3). As outras oito
 * tabelas da `D-65` são do item 23.
 *
 * Tabela de ação única (Roles, Alumnos) não passa `collapsed` a ninguém: um
 * botão só já cabe nos 4.5rem.
 */
export function useCollapsibleActionsColumn(width: string): { width: string; collapsed: boolean } {
  const collapsed = useIsNarrowViewport()
  return { width: collapsed ? COLLAPSED_WIDTH : width, collapsed }
}
