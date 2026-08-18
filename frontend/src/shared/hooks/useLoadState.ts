import type { UseQueryResult } from '@tanstack/react-query'
import type { ProblemDetails } from '@shared/api/axios'
import { screenDetail } from '@shared/lib'

/**
 * Os estados de carga de uma query de LISTA, derivados num lugar só.
 *
 * Seis hooks de feature repetiam esta mesma derivação — `isError`, `errorDetail`,
 * o `refetch` que engole a promise, e o predicado de vazio verbatim em três
 * deles, sob dois nomes (`isEmpty` e `showEmptyHint`). O bloco do B-7 extraiu a
 * VIEW (`InlineLoadState`) e deixou a FONTE replicada: a política "falhou" vs.
 * "veio vazia" só mudava em seis arquivos ao mesmo tempo, e já tinha divergido
 * (review do BD-6, Q-2).
 *
 * Recebe o resultado da query, não a query: quem decide `enabled`, key e
 * `select` continua sendo o hook da feature, que espalha isto e acrescenta o
 * que é dele (opções, lookup por id, filtro por termo).
 */
export function useLoadState<T>(query: UseQueryResult<T[], ProblemDetails>) {
  const data = query.data ?? []

  return {
    data,
    isLoading: query.isLoading,
    isError: query.isError,
    /** O `detail` que pode ir à TELA, não o do envelope. O do servidor não é
     * localizado (`ProblemDetails.php` devolve português literal), então
     * `screenDetail` o silencia e o `?? t('common.loadErrorHint')` que os
     * consumidores já escrevem assume. Quem precisa do envelope inteiro usa
     * `loadError` — a política é de quem IMPRIME. */
    errorDetail: screenDetail(query.error),
    /** Falha no formato que `AppDataTable`/`AppErrorState` leem. `{}` quando o
     * interceptor não populou o corpo: `isError` sem `error` ainda é falha, e
     * devolver `null` a esconderia. */
    loadError: query.isError ? (query.error ?? ({} as ProblemDetails)) : null,
    /** Lista que carregou e veio vazia DE VERDADE — nem falha, nem carregando.
     * Tem mensagem própria, distinta da de falha: é o débito B-7 inteiro. */
    isEmpty: !query.isError && query.isSuccess && data.length === 0,
    /** Sem lista utilizável: carregando, falhou sem cache, ou veio vazia. `[]` é
     * truthy, então `!query.data` deixaria passar lista vazia. */
    unusable: data.length === 0,
    /** Falhou E não há nada em cache para mostrar. É o que autoriza SUBSTITUIR a
     * tela pelo erro; com cache utilizável o certo é manter a lista e avisar ao
     * lado dela (D3, precedente `03280c6`) — um refetch falho mantém `data`
     * populado enquanto `status` vira `error`. */
    failedWithoutData: query.isError && data.length === 0,
    refetch: () => {
      void query.refetch()
    },
  }
}
