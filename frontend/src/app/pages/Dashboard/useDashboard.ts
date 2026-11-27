import { useQuery } from '@tanstack/react-query'
import { api } from '@shared/api/axios'
import type { ProblemDetails } from '@shared/api/axios'
import type { AdminDashboardData, RedatorDashboardData } from '@shared/types/generated'
import { loadFailure, useWindowedQuery } from '@shared/hooks'
import { retryFor, type LoadErrorHintKey, type Period } from '@shared/lib'

/** Janela histórica. Só séries e rankings a respeitam (D3 do bloco A). A UI do
 * seletor é o `PeriodFilter` de `shared/ui` (D5 do B2). */
export type DashboardPeriod = Period

export const dashboardKeys = {
  /** A key varia pelo período para o B2 ligar o seletor sem mexer no cache.
   *
   * Sem `all` aqui: o bloco é read-only e nada invalida cache. Ele existia sem
   * consumidor, e uma raiz de invalidação declarada num lugar e o literal
   * repetido no outro são duas fontes do mesmo namespace (Q-2, review de
   * 2026-08-16). Quando a invalidação chegar, ela nasce com quem a usa. */
  metrics: (period?: DashboardPeriod) =>
    ['dashboard', 'metricas', period?.start ?? null, period?.end ?? null] as const,
}

type DashboardPayload = AdminDashboardData | RedatorDashboardData

/**
 * O que a tela pode ser. Cada `kind` tem um ramo de render próprio e nenhum se
 * confunde com outro — falha, vazio de verdade e "sem permissão" dizem coisas
 * diferentes sobre o banco, e trocar um pelo outro faz a tela mentir.
 *
 * `unauthorized` não é `empty`: a tela não está vazia, ela está fechada. E ela
 * mede SÓ o ramo admin: as 6 chaves de `RedatorDashboardData` são não-anuláveis
 * (`generated.ts:376-383`), então não existe payload de redator "fechado".
 *
 * Dois `kind` de pronto e nenhum `unsupported` (D3 do B2): a discriminação por
 * `view` acontece AQUI, uma vez, e a página recebe o DTO já estreitado. O ramo
 * `unsupported` morreu junto com a ausência de tela do Redator — ramo que não
 * dispara é órfão, e o review do B1 já matou três.
 *
 * Pelo mesmo critério, repetir só é oferecido onde a tela oferece: `retry` no
 * ramo `error`, que é o botão do `AppErrorState`, e `staleRetry` nos dois
 * `ready`, que é o do `InlineLoadState`. Os dois `ready` carregavam TAMBÉM um
 * `retry` que nenhum consumidor de produção lia — dois campos para a mesma
 * ação, um deles inalcançável pela tela (Q-4 da revisão de 2026-08-17).
 */
export type DashboardState =
  | { kind: 'loading' }
  | { kind: 'error'; error: ProblemDetails; retry: (() => Promise<unknown>) | undefined }
  | { kind: 'unauthorized' }
  | {
      kind: 'ready-admin'
      data: AdminDashboardData
      /** Houve falha com dado em mão. Separado de `staleError` porque
       * `screenDetail` cala o `detail` de servidor fora da allowlist da P-70 —
       * e o 500 está fora: sem este sinal, um 500 fazia o aviso inteiro sumir
       * — o `InlineLoadState` desiste no `!error`, e a tela voltava a falhar em
       * silêncio. Quem imprime escolhe a dica. */
      staleErrored: boolean
      /** O `detail` que sobreviveu ao `screenDetail`: o que o FRONT escreveu, e
       * o do SERVIDOR nos status em que ele é localizado (403, 404, 429 — P-70).
       * `null` nos demais, e aí quem imprime cai no `staleHint`. */
      staleError: string | null
      /** A dica a imprimir quando `staleError` é `null`, escolhida pelo STATUS:
       * o 422 de janela invertida não é problema de conexão. */
      staleHint: LoadErrorHintKey
      /** Ausente quando repetir não é recuperação — ver `podeRepetir`. */
      staleRetry?: () => Promise<unknown>
    }
  | {
      kind: 'ready-redator'
      data: RedatorDashboardData
      staleErrored: boolean
      staleError: string | null
      staleHint: LoadErrorHintKey
      staleRetry?: () => Promise<unknown>
    }

/**
 * Nenhum módulo visível: o papel autentica como admin mas não lê módulo
 * nenhum. A decisão é da visibilidade explícita que o backend manda (D-34) —
 * nunca do que sobrou nos campos nulos ou nas listas, que não distinguem "sem
 * permissão" de "sem dado".
 *
 * `identity` conta como módulo visível: o papel só com `identity.user.view` vê
 * os alertas de documento de relator (RN-09, review de 2026-08-16) e não pode
 * cair em "sem acesso" — com alerta ou sem.
 *
 * Exaustivo por construção: `Object.values` sobre o DTO inteiro, então uma
 * quinta flag nasce já contada, sem lista à mão para esquecer.
 */
function nenhumModuloVisivel(d: AdminDashboardData): boolean {
  return !Object.values(d.visibility).some(Boolean)
}

/**
 * A política de estado da tela do Dashboard, num lugar só (D9).
 *
 * Não usa `useLoadState`: a assinatura dele é `UseQueryResult<T[]>`, de LISTA, e
 * aqui o dado é objeto único com seções anuláveis. A tese é a mesma — o que
 * ramifica a tela é o DADO que falta, não o `status` da query —, mas o formato
 * não serve, e um `useResourceState` genérico agora seria abstrair contra um
 * consumidor só.
 */
export function useDashboard(period?: DashboardPeriod): DashboardState {
  const query = useQuery<DashboardPayload, ProblemDetails>({
    queryKey: dashboardKeys.metrics(period),
    queryFn: () =>
      api
        .get<DashboardPayload>('/api/dashboard/metricas', {
          params: { period_start: period?.start, period_end: period?.end },
        })
        .then((r) => r.data),
  })

  // Piso da tela (D6), falha antiga e `podeRepetir`: a política de query por
  // janela mora em `useWindowedQuery` — a Emisión a consome igual, e as duas
  // cópias à mão já tinham divergido (Q-2 da revisão do bloco 62).
  const { data, staleFailed, staleError, staleHint, staleRetry } = useWindowedQuery(query)

  const retry = retryFor(query.error, () => query.refetch())

  // Nada em mão, nem desta janela nem de nenhuma anterior. É AQUI que a falha
  // pode substituir a tela.
  if (data === undefined) {
    // `loadFailure` e não a ternária à mão: é a MESMA política — `{}` quando o
    // interceptor não populou o corpo, porque `isError` sem `error` ainda é
    // falha e devolver `loading` a esconderia —, e ela nasce num lugar só
    // (rule `frontend-fsliced.md`). O `if` sobre o retorno substitui o `if
    // (query.isError)`: a política já responde as duas perguntas numa.
    const falha = loadFailure(query)
    if (falha) return { kind: 'error', error: falha, retry }
    return { kind: 'loading' }
  }

  // Com dado em mão, a falha do refetch é aviso AO LADO — a tela continua
  // utilizável (lição do BD-6).
  const staleErrored = staleFailed

  if (data.view === 'redator') return { kind: 'ready-redator', data, staleErrored, staleError, staleHint, staleRetry }
  if (nenhumModuloVisivel(data)) return { kind: 'unauthorized' }

  return { kind: 'ready-admin', data, staleErrored, staleError, staleHint, staleRetry }
}
