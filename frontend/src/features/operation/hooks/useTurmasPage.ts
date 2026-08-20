import type { ProblemDetails } from '@shared/api/axios'
import { useTurmas } from '../api/useTurmas'

/**
 * O alias de página das turmas, no molde dos 7 `useXPage` que já existem — não é
 * delegação vazia, é o que mantém a query fora do componente. O irmão dele, o
 * `usePendingQuotesPage`, mora em arquivo próprio.
 *
 * O que estes dois acrescentam aos outros sete: `useTurmas.ts` é artesanal e não
 * passa pela fábrica `createCrudResource`, então devolve `UseQueryResult` cru. Era
 * a assimetria que fazia a `OperationPage` ser a ÚNICA a derivar o estado de carga
 * à mão, em ternário aninhado dentro da prop:
 *
 *     error={archived ? turmasArchived.error : turmas.isError ? (turmas.error ?? {}) : null}
 *
 * Esse `isError ? (error ?? {}) : null` é literalmente o `loadError` do
 * `useLoadState`, e a rule é explícita em que estado de carga de lista não se
 * deriva à mão na feature (Q-1/Q-2 do review de 2026-08-14).
 *
 * **`useLoadState` não serve aqui, e isso foi medido:** o `refetch` dele faz
 * `void query.refetch()` (`useLoadState.ts:51-53`) e descarta a promise que o
 * `AppErrorState` aguarda para manter o Reintentar em `loading` (Q-14). Usá-lo
 * regrediria esse contrato **sem quebrar tipo nem teste** — TS aceita descartar
 * retorno (D4 da spec).
 */
export function useTurmasPage() {
  const query = useTurmas()

  return {
    items: query.data ?? [],
    loading: query.isLoading,
    /** `null` em sucesso, inclusive com lista vazia — vazio não é erro (D16). O
     * `{}` cobre o erro de rede que não passa pelo interceptor: `isError` sem
     * `ProblemDetails` ainda é falha, e devolver `null` a esconderia. */
    error: query.isError ? (query.error ?? ({} as ProblemDetails)) : null,
    /** Devolve a promise (Q-14). */
    refetch: () => query.refetch(),
  }
}
