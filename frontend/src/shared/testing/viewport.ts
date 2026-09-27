/**
 * O jsdom não implementa `window.matchMedia`, e até 2026-09-26 nenhum teste
 * montava componente que lesse viewport — `Sidebar` e `AppBarChart` ficavam
 * fora da suíte. As ações de linha que colapsam abaixo de `sm`
 * (`useCollapsibleActionsColumn`, Q-1 do review do item 16 fatia 3) entram em
 * toda tabela de Pessoas e Administración, e sem isto cada teste delas
 * estouraria com `window.matchMedia is not a function`.
 *
 * O stub responde pela LARGURA da janela, não por um booleano: o ponto de corte
 * mora em `useViewport.ts` e o teste diz só "telefone" (390) ou "desktop", sem
 * repetir o `639px`. Desktop é o default, e `test-setup.ts` o devolve depois de
 * cada caso — quem estreita a janela não vaza o telefone para o vizinho.
 */
const DESKTOP = 1440

let largura = DESKTOP

/** Largura da janela que as media queries passam a ver. */
export function setViewportWidth(px: number): void {
  largura = px
}

export function resetViewport(): void {
  largura = DESKTOP
}

/** Só `max-width` e `min-width` em px — as duas formas que `useViewport.ts` usa. */
export function matchMediaStub(query: string): MediaQueryList {
  const max = /\(max-width:\s*(\d+)px\)/.exec(query)
  const min = /\(min-width:\s*(\d+)px\)/.exec(query)
  const cabe = (!max || largura <= Number(max[1])) && (!min || largura >= Number(min[1]))
  return {
    matches: (max !== null || min !== null) && cabe,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }
}
