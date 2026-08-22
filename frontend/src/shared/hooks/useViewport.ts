import { useSyncExternalStore } from 'react'

/**
 * Assina uma media query. Interno: quem consome importa o hook NOMEADO abaixo,
 * porque o ponto de corte é decisão de projeto e não parâmetro de call site —
 * espalhar `useMediaQuery('(max-width: 639px)')` pelas telas põe o breakpoint em
 * string literal em cada arquivo que o usa.
 *
 * `useSyncExternalStore` em vez de `useState` + `useEffect`: o valor inicial sai
 * correto já na primeira renderização, sem um frame com o layout errado.
 */
function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query)
      mql.addEventListener('change', onChange)
      return () => mql.removeEventListener('change', onChange)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}

/**
 * `true` abaixo de 1024px. Só leitura: **não** escreve no `uiStore`, para o
 * toggle manual do usuário continuar valendo quando a janela voltar a crescer.
 */
export function useIsCompactViewport(): boolean {
  return useMediaQuery('(max-width: 1023px)')
}

/**
 * `true` abaixo de 640px — o `sm` do Tailwind, o mesmo degrau em que os cards da
 * tela deixam de dividir a linha. É o telefone de pé, onde a largura útil de um
 * card cai para ~300px e uma faixa de eixo dimensionada para desktop passa a
 * comer metade do gráfico (UI-04 da revisão de 2026-08-22).
 */
export function useIsNarrowViewport(): boolean {
  return useMediaQuery('(max-width: 639px)')
}
