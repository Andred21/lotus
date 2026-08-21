import { useState } from 'react'

/**
 * A espera do "Reintentar": mantém o botão em carga enquanto a promise do
 * refetch está em voo, e ignora clique repetido no meio (Q-14).
 *
 * Mora aqui e é consumido por caminho relativo pelos DOIS componentes de falha
 * (`AppErrorState` e `InlineLoadState`). Copiar o `try/finally` no segundo seria
 * a mesma política em dois arquivos — que é o defeito que o D-56 fechou um andar
 * abaixo. Não sai pelo barrel: é mecanismo interno, não superfície pública
 * (mesmo precedente de `useArchiveToasts`).
 *
 * Handler que devolve `void` continua funcionando — só fica sem feedback, e isso
 * está declarado como limitação, não como bug.
 *
 * O `setPending(false)` do `finally` pode cair depois do unmount, e isso NÃO é
 * vazamento: no React 19 `setState` em fiber morto é no-op silencioso (o aviso
 * saiu no 18). No caminho comum nem há unmount — o retry que dá certo apaga o
 * `error` e o `InlineLoadState` devolve `null` de um componente ainda montado.
 * Guardar com `useRef` + cleanup custaria mais que o não-evento que evita.
 */
export function useRetryPending(onRetry?: () => void | Promise<unknown>) {
  const [pending, setPending] = useState(false)

  const run = () => {
    if (pending) return
    setPending(true)
    void (async () => {
      try {
        await onRetry?.()
      } catch {
        // O estado da falha já está na query — quem imprime é o `error` que
        // desceu por prop. Sem este ramo, um `onRetry` que rejeita virava
        // unhandled rejection, e a prop é pública nos dois componentes.
      } finally {
        setPending(false)
      }
    })()
  }

  return { pending, run }
}
