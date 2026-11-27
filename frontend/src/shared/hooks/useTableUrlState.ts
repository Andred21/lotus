import { useInRouterContext, useSearchParams } from 'react-router-dom'

const SEM_ROUTER: ReturnType<typeof useSearchParams> = [new URLSearchParams(), () => undefined]

export interface TableUrlState {
  /** O valor CRU da chave (já com o prefixo aplicado); `null` quando ausente
   * ou quando o estado está desligado. Validar é de quem lê. */
  read: (key: string) => string | null
  /** Aplica o patch numa escrita só: `null` remove a chave, string a grava.
   * Com `replace`, a lista não enche o histórico; os demais parâmetros da URL
   * (`tab`, deep links) ficam como estão. */
  write: (patch: Record<string, string | null>) => void
}

/**
 * O estado de uma listagem na query string (C-3): busca, página, sort e
 * filtros sobrevivem a recarregar, a colar o link e a voltar para a lista.
 *
 * `prefix` isola duas tabelas na mesma URL (`b_q`, `c_q`); sem ele as chaves
 * são as nuas. `enabled: false` é o default do `useServerTable`: não lê e não
 * escreve, e a tabela se comporta como antes do C-3.
 *
 * Sem `<Router>` acima o hook não lê nem escreve — o mesmo de `enabled: false`.
 * É o que mantém `useServerTable` (default `url: false`) montável em teste de
 * hook e em qualquer árvore sem router; no app há router sempre.
 *
 * Duas escritas no MESMO tick não se compõem — o `setSearchParams` parte da
 * query do último render. Quem muda duas chaves de uma vez usa um `write` só.
 */
export function useTableUrlState({ prefix, enabled }: { prefix?: string; enabled: boolean }): TableUrlState {
  // A presença do Router não muda sem remontar a árvore, então a ordem dos
  // hooks é estável por montagem — é a invariante que o lint não enxerga.
  const inRouter = useInRouterContext()
  // eslint-disable-next-line react-hooks/rules-of-hooks -- condição estável por montagem (ver acima)
  const [params, setParams] = inRouter ? useSearchParams() : SEM_ROUTER
  const name = (key: string) => (prefix ? `${prefix}_${key}` : key)

  return {
    read: (key) => (enabled ? params.get(name(key)) : null),
    write: (patch) => {
      if (!enabled) return
      setParams(
        (current) => {
          const next = new URLSearchParams(current)
          for (const [key, value] of Object.entries(patch)) {
            if (value === null) next.delete(name(key))
            else next.set(name(key), value)
          }
          return next
        },
        { replace: true },
      )
    },
  }
}
