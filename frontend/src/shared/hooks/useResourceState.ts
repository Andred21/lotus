import type { UseQueryResult } from '@tanstack/react-query'
import type { ProblemDetails } from '@shared/api/axios'

/**
 * Os estados de carga de uma query de RECURSO ÚNICO, derivados num lugar só.
 *
 * Irmão do `useLoadState`, não substituto: aquele é tipado
 * `UseQueryResult<T[], …>` e existe pela política "falhou" vs. "veio vazia" de
 * uma LISTA (`isEmpty`, `unusable`, `data.length`). Um recurso único não vem
 * vazio — ou veio, ou não veio —, então esses três predicados não existem aqui.
 * Inventá-los seria a divergência que o `useLoadState` foi extraído para
 * impedir (Q-1/Q-2 do review de 2026-08-14).
 *
 * Recebe o resultado da query, não a query: quem decide key, `enabled` e
 * `select` continua sendo o hook da feature.
 */
export function useResourceState<T>(query: UseQueryResult<T, ProblemDetails>) {
  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    errorDetail: query.error?.detail,
    /** Falha no formato que `AppErrorState`/`InlineLoadState` leem. `{}` quando
     * o interceptor não populou o corpo: `isError` sem `error` ainda é falha, e
     * devolver `null` a esconderia. */
    loadError: query.isError ? (query.error ?? ({} as ProblemDetails)) : null,
    /** Falhou E não há nada em cache. É o único que autoriza SUBSTITUIR a tela;
     * com cache em mão o certo é manter o conteúdo e avisar ao lado, porque um
     * refetch falho mantém `data` populado enquanto `status` vira `error`. */
    failedWithoutData: query.isError && query.data === undefined,
    refetch: () => {
      void query.refetch()
    },
  }
}
