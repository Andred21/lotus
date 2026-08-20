import type { ProblemDetails } from './axios'

/**
 * Mensagem legível de um RFC 7807: o 1º erro de campo quando o 422 os traz, ou
 * o `detail` do problema. `null` quando não há nada exibível.
 *
 * É função, não hook, de propósito: dentro do `onError` de uma mutation não se
 * pode chamar um hook — foi por isso que ela nasceu solta em
 * `useTurmaDocsSection`. Mora aqui desde o review de 2026-08-18 (Q-2) porque o
 * segundo consumidor apareceria como cópia, e feature não importa de feature
 * (lei §6). Mesma resolução do `useMutationErrors`.
 */
export function problemMessage(problem: ProblemDetails): string | null {
  return problem.errors ? (Object.values(problem.errors)[0]?.[0] ?? null) : (problem.detail ?? null)
}
