import { useSyncExternalStore } from 'react'

const COMPACT = '(max-width: 1023px)'

/**
 * `true` abaixo de 1024px. Só leitura: **não** escreve no `uiStore`, para o
 * toggle manual do usuário continuar valendo quando a janela voltar a crescer.
 *
 * `useSyncExternalStore` em vez de `useState` + `useEffect`: o valor inicial sai
 * correto já na primeira renderização, sem um frame com a sidebar expandida numa
 * tela estreita.
 */
export function useIsCompactViewport() {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(COMPACT)
      mql.addEventListener('change', onChange)
      return () => mql.removeEventListener('change', onChange)
    },
    () => window.matchMedia(COMPACT).matches,
    () => false,
  )
}
