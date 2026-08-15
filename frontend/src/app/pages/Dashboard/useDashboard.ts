import { useQuery } from '@tanstack/react-query'
import { api } from '@shared/api/axios'
import type { ProblemDetails } from '@shared/api/axios'
import type { AdminDashboardData, RedatorDashboardData } from '@shared/types/generated'

/** Janela histórica. Só séries e rankings a respeitam (D3 do bloco A), e as duas
 * são do B2 — por isso o parâmetro existe e a UI dele não (D5). */
export type DashboardPeriod = { start: string; end: string }

export const dashboardKeys = {
  all: ['dashboard'] as const,
  /** A key varia pelo período para o B2 ligar o seletor sem mexer no cache. */
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
 * Nenhuma seção do B1 legível: todo KPI nulo E as duas seções anuláveis nulas.
 *
 * `pendencias` e `alertas` ficam de fora da conta de propósito — são listas
 * NÃO-anuláveis, então quem não tem permissão nenhuma recebe `[]`, exatamente
 * como quem tem permissão e não tem pendência. Elas não distinguem os dois
 * casos; os KPIs e as seções anuláveis distinguem.
 */
function nenhumaSecaoLegivel(d: AdminDashboardData): boolean {
  const k = d.kpis
  const algumKpi =
    k.turmas_em_andamento !== null ||
    k.turmas_encerrando_em_breve !== null ||
    k.turmas_atrasadas !== null ||
    k.conclusoes_por_confirmar !== null ||
    k.cotacoes !== null ||
    k.certificados_a_emitir !== null

  return !algumKpi && d.pipeline === null && d.agenda === null
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
