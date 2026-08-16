import { useQuery } from '@tanstack/react-query'
import { api } from '@shared/api/axios'
import type { ProblemDetails } from '@shared/api/axios'
import type { AdminDashboardData, RedatorDashboardData } from '@shared/types/generated'

/** Janela histórica. Só séries e rankings a respeitam (D3 do bloco A), e as duas
 * são do B2 — por isso o parâmetro existe e a UI dele não (D5). */
export type DashboardPeriod = { start: string; end: string }

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
 * `unauthorized` não é `empty`: a tela não está vazia, ela está fechada.
 * `unsupported` é o ramo do Redator (D12): o contrato é união discriminada por
 * `view`, o B1 renderiza só `admin`, e hoje nenhum redator autentica.
 */
export type DashboardState =
  | { kind: 'loading' }
  | { kind: 'error'; error: ProblemDetails; retry: () => void }
  | { kind: 'unauthorized' }
  | { kind: 'unsupported' }
  | { kind: 'ready'; data: AdminDashboardData; staleError: string | null; retry: () => void }

/**
 * Nenhuma seção do B1 legível: todo KPI nulo, as duas seções anuláveis nulas E
 * as duas listas vazias.
 *
 * As listas entram pelo lado POSITIVO, não pelo negativo. `pendencias` e
 * `alertas` são NÃO-anuláveis, então `[]` não distingue "sem permissão" de "sem
 * pendência" — mas item NA lista distingue com certeza, porque o gate age na
 * origem e só chega item de módulo autorizado. O caso que provou isso é o papel
 * só com `identity.user.view`: `AdminDashboardAssembler.php:157` alimenta os
 * alertas de documento de relator por essa permissão, e ela não liga KPI,
 * pipeline nem agenda — a tela anunciava "nenhum módulo visível" e escondia
 * alerta autorizado, com peso de RN-09 (review de 2026-08-16, segunda lente).
 *
 * Os KPIs se medem por `Object.values`, não campo a campo: a lista à mão vivia
 * aqui E em `KpiRow.cards`, duas fontes da verdade sobre quais KPIs existem, e
 * divergirem esconde KPI legível atrás da mensagem de "sem acesso".
 */
function nenhumaSecaoLegivel(d: AdminDashboardData): boolean {
  const algumKpi = Object.values(d.kpis).some((valor) => valor !== null)

  return (
    !algumKpi &&
    d.pipeline === null &&
    d.agenda === null &&
    d.pendencias.length === 0 &&
    d.alertas.length === 0
  )
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

  const retry = () => {
    void query.refetch()
  }

  const data = query.data

  // Sem nada em cache. É AQUI que a falha pode substituir a tela.
  if (data === undefined) {
    if (query.isError) {
      // `{}` quando o interceptor não populou o corpo: `isError` sem `error`
      // ainda é falha, e devolver `loading` a esconderia. Mesmo tratamento do
      // `useLoadState`.
      return { kind: 'error', error: query.error ?? ({} as ProblemDetails), retry }
    }
    return { kind: 'loading' }
  }

  if (data.view !== 'admin') return { kind: 'unsupported' }
  if (nenhumaSecaoLegivel(data)) return { kind: 'unauthorized' }

  // Com cache em mão, a falha do refetch é aviso AO LADO — a tela continua
  // utilizável (lição do BD-6).
  return {
    kind: 'ready',
    data,
    staleError: query.isError ? (query.error?.detail ?? null) : null,
    retry,
  }
}
