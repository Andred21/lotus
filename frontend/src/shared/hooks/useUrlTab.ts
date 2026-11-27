import { useLocation, useSearchParams } from 'react-router-dom'

export interface UrlTab<T extends string> {
  tab: T
  /** Posição em `tabs` (o conjunto COMPLETO, não o visível). É o que o
   * `TabView` entende: ele numera os filhos pela posição no JSX, e um
   * `{pode && <Tab/>}` ocupa o slot mesmo quando é `false` (medido: com
   * `[users, false, configuracion]` o clique em Configuración chega como 2). */
  index: number
  setTab: (next: T | number) => void
}

/**
 * A aba ativa na query string (`?tab=`, C-11): sobrevive a recarregar e a
 * colar o link. `tabs` é o conjunto completo e `visible` o que o usuário
 * enxerga (permissão). Os painéis do JSX devem seguir a ordem de `tabs`, um
 * slot por nome; `?tab=` desconhecido ou invisível cai na primeira
 * visível — URL adulterada abre a tela, não a quebra.
 *
 * A escrita usa `replace` (trocar de aba não é passo de navegação: com `push`,
 * o "voltar" andaria aba a aba antes de sair da página) e preserva o resto da
 * URL — chaves das listas — e o `state` da entrada, onde viaja o `backTo`.
 */
export function useUrlTab<T extends string>(tabs: readonly T[], visible: readonly T[] = tabs): UrlTab<T> {
  const [params, setParams] = useSearchParams()
  const { state } = useLocation()
  const raw = params.get('tab')
  const tab = visible.find((candidate) => candidate === raw) ?? visible[0]

  return {
    tab,
    index: Math.max(0, tabs.indexOf(tab)),
    setTab: (next) => {
      const name = typeof next === 'number' ? tabs[next] : next
      if (name === undefined || !visible.includes(name)) return
      setParams(
        (current) => {
          const updated = new URLSearchParams(current)
          updated.set('tab', name)
          return updated
        },
        { replace: true, state },
      )
    },
  }
}
