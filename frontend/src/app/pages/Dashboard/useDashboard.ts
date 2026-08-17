import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@shared/api/axios'
import type { ProblemDetails } from '@shared/api/axios'
import type { AdminDashboardData, RedatorDashboardData } from '@shared/types/generated'

/** Janela histórica. Só séries e rankings a respeitam (D3 do bloco A). A UI do
 * seletor mora em `admin/PeriodFilter.tsx` (D5 do B2). */
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
 * `unauthorized` não é `empty`: a tela não está vazia, ela está fechada. E ela
 * mede SÓ o ramo admin: as 6 chaves de `RedatorDashboardData` são não-anuláveis
 * (`generated.ts:376-383`), então não existe payload de redator "fechado".
 *
 * Dois `kind` de pronto e nenhum `unsupported` (D3 do B2): a discriminação por
 * `view` acontece AQUI, uma vez, e a página recebe o DTO já estreitado. O ramo
 * `unsupported` morreu junto com a ausência de tela do Redator — ramo que não
 * dispara é órfão, e o review do B1 já matou três.
 */
export type DashboardState =
  | { kind: 'loading' }
  | { kind: 'error'; error: ProblemDetails; retry: () => void }
  | { kind: 'unauthorized' }
  | {
      kind: 'ready-admin'
      data: AdminDashboardData
      staleError: string | null
      /** Ausente quando repetir não é recuperação — ver `podeRepetir`. */
      staleRetry?: () => void
      retry: () => void
    }
  | {
      kind: 'ready-redator'
      data: RedatorDashboardData
      staleError: string | null
      staleRetry?: () => void
      retry: () => void
    }

/**
 * Repetir só recupera falha de TRANSPORTE. Um 4xx é a recusa desta requisição:
 * reemitir a mesma URL devolve a mesma recusa, sem informação nova. O caso
 * medido é a janela invertida do filtro — o backend sobe 422 com
 * "La fecha de término no puede ser anterior a la de inicio.", e o "Reintentar"
 * ao lado da mensagem tomava o mesmo 422 (UI-05 da revisão de 2026-08-17). Ali a
 * recuperação é corrigir a data, e é o que a própria mensagem já diz.
 *
 * Sem `status` (o `{}` do interceptor que não populou o corpo), a falha é
 * tratada como de transporte: oferecer o botão a mais é mais barato que negá-lo
 * a quem só perdeu a rede.
 */
function podeRepetir(erro: ProblemDetails | null): boolean {
  const status = erro?.status
  return status === undefined || status < 400 || status >= 500
}

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

  /**
   * Piso da tela: o último payload que chegou bom, de QUALQUER janela (D6).
   *
   * A query key varia pelo período (`:17-18`), então trocar a janela cria key
   * nova e `query.data` volta `undefined` — a tela inteira viraria
   * `AppErrorState` por um erro de digitação no filtro, e `staleError` não
   * alcança porque o cache é da key antiga.
   *
   * `placeholderData: keepPreviousData` NÃO resolve isso, medido: o observador
   * da 5.101.1 só aplica o placeholder com `status === 'pending'`
   * (`query-core/src/queryObserver.ts:486-491`), e o fetch que falha vira
   * `'error'`. Ele cobre a troca normal e não cobre a falhada, que é
   * justamente a metade que a D6 existe para cobrir. Um piso só cobre as duas,
   * e dois mecanismos para a mesma verdade é o defeito que este repositório já
   * pagou três vezes (Emenda 2 da spec).
   *
   * O piso é ESTADO ajustado durante o render, não `useRef`: a régua
   * `react-hooks/refs` reprova escrever `.current` no corpo do render, e este
   * repositório já tem o molde certo para "ajustar estado quando a entrada
   * muda" — `useEntityForm.ts:29-35`. A guarda de igualdade é o que impede o
   * laço, e ela é confiável porque o TanStack Query faz structural sharing: o
   * payload que não mudou volta como o MESMO objeto.
   *
   * No render em que o piso sobe, `query.data` já está definido — então a tela
   * lê o dado novo nesse mesmo render, não o piso velho.
   */
  const [ultimoPayload, setUltimoPayload] = useState<DashboardPayload | undefined>(undefined)
  if (query.data !== undefined && query.data !== ultimoPayload) setUltimoPayload(query.data)

  const retry = () => {
    void query.refetch()
  }

  const data = query.data ?? ultimoPayload

  // Nada em mão, nem desta janela nem de nenhuma anterior. É AQUI que a falha
  // pode substituir a tela.
  if (data === undefined) {
    if (query.isError) {
      // `{}` quando o interceptor não populou o corpo: `isError` sem `error`
      // ainda é falha, e devolver `loading` a esconderia. Mesmo tratamento do
      // `useLoadState`.
      return { kind: 'error', error: query.error ?? ({} as ProblemDetails), retry }
    }
    return { kind: 'loading' }
  }

  // Com dado em mão, a falha do refetch é aviso AO LADO — a tela continua
  // utilizável (lição do BD-6).
  const staleError = query.isError ? (query.error?.detail ?? null) : null
  const staleRetry = query.isError && podeRepetir(query.error) ? retry : undefined

  if (data.view === 'redator') return { kind: 'ready-redator', data, staleError, staleRetry, retry }
  if (nenhumaSecaoLegivel(data)) return { kind: 'unauthorized' }

  return { kind: 'ready-admin', data, staleError, staleRetry, retry }
}
