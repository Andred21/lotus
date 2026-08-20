import type { UseQueryResult } from '@tanstack/react-query'
import type { ProblemDetails } from '@shared/api/axios'
import type { ListSource } from '@shared/lib'

/**
 * A política "falhou" vs. "veio vazia", num lugar só.
 *
 * `{}` quando o interceptor não populou o corpo: `isError` sem `error` ainda é
 * falha, e devolver `null` a esconderia. `null` em sucesso, inclusive com lista
 * vazia — vazio não é erro (spec D16).
 *
 * O parâmetro é estrutural, e não `UseQueryResult`, de propósito: a política lê
 * dois campos, e exigir a forma do DADO a impediria de servir o
 * `useResourceState`, que é `UseQueryResult<T, …>` de recurso único.
 */
export function loadFailure(query: {
  isError: boolean
  error: ProblemDetails | null
}): ProblemDetails | null {
  return query.isError ? (query.error ?? ({} as ProblemDetails)) : null
}

/**
 * A forma normalizada de uma lista de página, montada num lugar só.
 *
 * O par `error` + `refetch` estava escrito por extenso em 12 sítios, e a
 * política já tinha divergido uma vez (Q-1/Q-1b/Q-2 do review de 2026-08-14).
 * O `refetch` DEVOLVE a promise: é ela que o `AppErrorState` aguarda para manter
 * o "Reintentar" em `loading` enquanto o GET está em voo (Q-14) — e o tipo de
 * retorno `ListSource<T>` é o que obriga a isso, porque TypeScript aceita
 * descartar retorno e não veria o `void` voltar.
 *
 * Função pura, não hook — o mesmo critério do `archivableSource`. Mora em
 * `shared/hooks` mesmo assim, e não ao lado dele: precisa de `UseQueryResult` e
 * de `ProblemDetails`, e `shared/lib` não importa `@tanstack` nem `@shared/api`
 * (`archivable.ts:18-22`, `screenDetail.ts:23-27`, `AppDataTable.tsx:16-18`).
 */
export function listSource<T>(query: UseQueryResult<T[], ProblemDetails>): ListSource<T> {
  return {
    items: query.data ?? [],
    loading: query.isLoading,
    error: loadFailure(query),
    refetch: () => query.refetch(),
  }
}
