import { listSource } from '@shared/hooks'
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
 * Nasceram derivando à mão porque o `useLoadState` de então engolia a promise do
 * `refetch` (Q-14 · D-54). Pago o débito, a derivação some: o `listSource` é a
 * home única da forma, e o contrato da promise vem do tipo dele.
 */
export function useTurmasPage() {
  return listSource(useTurmas())
}
