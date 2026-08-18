import { describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useDashboard } from './useDashboard'
import { api } from '@shared/api/axios'
import type { ProblemDetails } from '@shared/api/axios'
import type { AdminDashboardData, RedatorDashboardData } from '@shared/types/generated'

vi.mock('@shared/api/axios', () => ({
  api: { get: vi.fn() },
}))

const get = vi.mocked(api.get)

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

/** Wrapper com o cliente à mão, para o teste que precisa refazer o GET da MESMA
 * key. Com dado em mão e sem falha, o estado não expõe gatilho nenhum —
 * `staleRetry` só nasce DEPOIS do erro, e o `retry` que existia nos dois `ready`
 * era campo sem consumidor de produção (Q-4 da revisão de 2026-08-17). Quem
 * refaz o GET no produto é o próprio TanStack Query (montagem, foco, janela
 * voltando), e é isso que o `refetchQueries` reproduz. */
function comCliente() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  )

  return { qc, Wrapper }
}

function admin(overrides: Partial<AdminDashboardData> = {}): AdminDashboardData {
  return {
    view: 'admin',
    kpis: {
      turmas_em_andamento: 4,
      turmas_encerrando_em_breve: 1,
      turmas_atrasadas: 0,
      conclusoes_por_confirmar: 2,
      cotacoes: { pending_count: 3, pending_value_uf: '450.0000' },
      certificados_a_emitir: 5,
    },
    pendencias: [],
    alertas: [],
    pipeline: [{ stage: 'quote_pending', count: 3 }],
    agenda: { starting_soon: [], ending_soon: [], in_progress: [], overdue: [] },
    compliance_turmas: null,
    redatores: null,
    series: null,
    rankings: null,
    period_start: '2025-08-15',
    period_end: '2026-08-15',
    ...overrides,
  }
}

/** Payload de quem não tem permissão de módulo nenhum: todo KPI nulo, as duas
 * seções anuláveis do B1 nulas, e as duas listas não-anuláveis vazias. */
function semNenhumaSecao(): AdminDashboardData {
  return admin({
    kpis: {
      turmas_em_andamento: null,
      turmas_encerrando_em_breve: null,
      turmas_atrasadas: null,
      conclusoes_por_confirmar: null,
      cotacoes: null,
      certificados_a_emitir: null,
    },
    pipeline: null,
    agenda: null,
  })
}

/** As 6 chaves do contrato do Redator, nenhuma anulável (`generated.ts:376-383`).
 * É o que faz o Redator NÃO ter `unauthorized`: não existe payload dele
 * "fechado" — ou ele é redator, ou o backend manda a view do admin. */
function redator(overrides: Partial<RedatorDashboardData> = {}): RedatorDashboardData {
  return {
    view: 'redator',
    resumo: {
      turmas_em_andamento: 2,
      proximas_turmas: 1,
      pendencias_documentais: 3,
      documentos_vencendo: 0,
    },
    agenda: { starting_soon: [], ending_soon: [], in_progress: [], overdue: [] },
    pendencias_documentais: [],
    alertas_documentos: [],
    historico: { turmas_concluidas: 9, certificados_emitidos: 41 },
    ...overrides,
  }
}

function problem(detail: string, status = 500): ProblemDetails {
  return {
    type: 'https://lotus.cl/errors/x',
    title: 'Error',
    status,
    detail,
    instance: '',
  }
}

describe('useDashboard', () => {
  it('sucesso devolve o payload admin tipado', async () => {
    get.mockResolvedValue({ data: admin() })

    const { result } = renderHook(() => useDashboard(), { wrapper })

    await waitFor(() => expect(result.current.kind).toBe('ready-admin'))
    if (result.current.kind !== 'ready-admin') throw new Error('esperava kind ready-admin')
    expect(result.current.data.kpis.turmas_em_andamento).toBe(4)
    expect(result.current.staleError).toBeNull()
  })

  // Falhou E não há nada em cache: é o que autoriza SUBSTITUIR a tela pelo erro.
  it('falha sem cache vira kind error', async () => {
    get.mockRejectedValue(problem('sin conexión'))

    const { result } = renderHook(() => useDashboard(), { wrapper })

    await waitFor(() => expect(result.current.kind).toBe('error'))
    if (result.current.kind !== 'error') throw new Error('esperava kind error')
    expect(result.current.error.detail).toBe('sin conexión')
  })

  // Lição do BD-6 aplicada a objeto único: um refetch falho mantém `data`
  // populado enquanto `status` vira `error`. Substituir a tela aí apaga
  // informação utilizável — a falha vira aviso AO LADO do que já veio.
  it('falha COM cache mantém os dados e avisa ao lado', async () => {
    get.mockResolvedValueOnce({ data: admin() })
    const { qc, Wrapper } = comCliente()

    const { result } = renderHook(() => useDashboard(), { wrapper: Wrapper })
    await waitFor(() => expect(result.current.kind).toBe('ready-admin'))

    get.mockRejectedValue(problem('caiu no refetch'))
    await act(async () => {
      await qc.refetchQueries()
    })

    await waitFor(() => {
      if (result.current.kind !== 'ready-admin') throw new Error('a tela não pode virar erro com cache em mão')
      // D-05: `detail` de servidor não é localizado, então não sai do hook. O
      // aviso continua existindo — quem o dispara é `staleErrored`, e a dica
      // genérica é escolhida por quem imprime (`DashboardPage.avisoStale`).
      expect(result.current.staleErrored).toBe(true)
      expect(result.current.staleError).toBeNull()
    })
    if (result.current.kind !== 'ready-admin') throw new Error('esperava kind ready-admin')
    expect(result.current.data.kpis.turmas_em_andamento).toBe(4)
  })

  // D5: a fronteira do filtro nasce pronta, sem UI. É o que garante que o B2
  // ligue o seletor de período sem mexer no cache.
  it('a query key varia por período', async () => {
    get.mockResolvedValue({ data: admin() })
    // Contagem RELATIVA, não toHaveBeenCalledTimes absoluto: `get` é o mesmo
    // mock dos testes anteriores deste arquivo (mesmo padrão de
    // useValidationPage.test.tsx) — o total já vem com chamadas prévias.
    const antes = get.mock.calls.length

    const { rerender } = renderHook(({ p }: { p?: { start: string; end: string } }) => useDashboard(p), {
      wrapper,
      initialProps: { p: { start: '2026-01-01', end: '2026-06-30' } },
    })
    await waitFor(() => expect(get.mock.calls.length).toBe(antes + 1))

    rerender({ p: { start: '2026-07-01', end: '2026-12-31' } })

    await waitFor(() => expect(get.mock.calls.length).toBe(antes + 2))
    expect(get.mock.calls[antes][1]).toEqual({ params: { period_start: '2026-01-01', period_end: '2026-06-30' } })
    expect(get.mock.calls[antes + 1][1]).toEqual({ params: { period_start: '2026-07-01', period_end: '2026-12-31' } })
  })

  // O caso-limite do §4 da spec: esconder cada seção nula, uma a uma, deixaria
  // uma página em branco indistinguível de falha silenciosa.
  it('nenhuma seção legível tem estado próprio, distinto de vazio e de falha', async () => {
    get.mockResolvedValue({ data: semNenhumaSecao() })

    const { result } = renderHook(() => useDashboard(), { wrapper })

    await waitFor(() => expect(result.current.kind).toBe('unauthorized'))
  })

  // Papel só com `identity.user.view`: o backend alimenta os alertas de
  // documento de relator por essa permissão (`AdminDashboardAssembler.php:157`)
  // e ela não liga KPI, pipeline nem agenda. Item NA lista prova permissão, e
  // dizer "nenhum módulo visível" aqui esconderia alerta autorizado.
  it('alerta na lista impede o estado de sem acesso, mesmo com todo o resto nulo', async () => {
    get.mockResolvedValue({
      data: admin({
        ...semNenhumaSecao(),
        alertas: [
          {
            type: 'redator_document_expired',
            severity: 'high',
            entity_id: 5,
            description: 'Documento del relator vencido.',
            date: '2026-08-01',
            navigation: { redator_id: 5 },
          },
        ],
      }),
    })

    const { result } = renderHook(() => useDashboard(), { wrapper })

    await waitFor(() => expect(result.current.kind).toBe('ready-admin'))
    if (result.current.kind !== 'ready-admin') throw new Error('esperava kind ready-admin')
    expect(result.current.data.alertas).toHaveLength(1)
  })

  // Cenário 1 da spec: o contrato é união discriminada por `view`, e a
  // discriminação acontece UMA vez, no hook. A página nunca re-estreita (D3).
  it('payload de redator vira kind próprio, com o DTO já estreitado', async () => {
    get.mockResolvedValue({ data: redator() })

    const { result } = renderHook(() => useDashboard(), { wrapper })

    await waitFor(() => expect(result.current.kind).toBe('ready-redator'))
    if (result.current.kind !== 'ready-redator') throw new Error('esperava kind ready-redator')
    expect(result.current.data.historico.certificados_emitidos).toBe(41)
    expect(result.current.staleError).toBeNull()
  })

  // Cenário 3: a query key varia pelo período (`useDashboard.ts:17-18`), então
  // trocar a janela cria key NOVA e `query.data` volta `undefined`. Sem piso, a
  // tela pisca em branco a cada troca.
  it('trocar a janela mantém o dado anterior enquanto o novo não chega', async () => {
    get.mockResolvedValue({ data: admin() })

    const { result, rerender } = renderHook(
      ({ p }: { p: { start: string; end: string } }) => useDashboard(p),
      { wrapper, initialProps: { p: { start: '2026-01-01', end: '2026-06-30' } } },
    )
    await waitFor(() => expect(result.current.kind).toBe('ready-admin'))

    get.mockImplementation(() => new Promise(() => {}))
    rerender({ p: { start: '2026-07-01', end: '2026-12-31' } })

    // A key nova está pendente e NUNCA resolve. A tela não pode virar skeleton.
    expect(result.current.kind).toBe('ready-admin')
    if (result.current.kind !== 'ready-admin') throw new Error('esperava kind ready-admin')
    expect(result.current.data.kpis.turmas_em_andamento).toBe(4)
  })

  // O outro ramo da D-05, para o silêncio acima não virar "o hook nunca fala":
  // envelope que o PRÓPRIO front sintetizou (rede caída) já é i18n e sai.
  it('detail escrito pelo FRONT sobrevive ao filtro da D-05', async () => {
    get.mockResolvedValueOnce({ data: admin() })
    const { qc, Wrapper } = comCliente()

    const { result } = renderHook(() => useDashboard(), { wrapper: Wrapper })
    await waitFor(() => expect(result.current.kind).toBe('ready-admin'))

    get.mockRejectedValue({ ...problem('Revisa tu conexión.', 0), localDetail: true })
    await act(async () => {
      await qc.refetchQueries()
    })

    await waitFor(() => {
      if (result.current.kind !== 'ready-admin') throw new Error('esperava kind ready-admin')
      expect(result.current.staleError).toBe('Revisa tu conexión.')
    })
  })

  // Cenário 4, e o que a D6 existe para impedir: janela invertida sobe 422
  // (`DashboardFilterData.php`), e sem piso a tela INTEIRA virava AppErrorState
  // por um erro de digitação no filtro. `staleError` não alcançava, porque o
  // cache é da key ANTIGA.
  it('falha na troca de janela mantém o dado anterior e vira aviso, não tela de erro', async () => {
    get.mockResolvedValue({ data: admin() })

    const { result, rerender } = renderHook(
      ({ p }: { p: { start: string; end: string } }) => useDashboard(p),
      { wrapper, initialProps: { p: { start: '2026-01-01', end: '2026-06-30' } } },
    )
    await waitFor(() => expect(result.current.kind).toBe('ready-admin'))

    get.mockRejectedValue(problem('La fecha de término no puede ser anterior a la de inicio.', 422))
    rerender({ p: { start: '2026-12-31', end: '2026-01-01' } })

    await waitFor(() => {
      if (result.current.kind !== 'ready-admin') throw new Error('a tela não pode virar erro com dado em mão')
      expect(result.current.staleErrored).toBe(true)
      expect(result.current.staleError).toBeNull()
      // O texto do servidor não vai à tela, mas a CAUSA vai: janela invertida é
      // 422, e a dica de conexão seria instrução errada (review do BD-13, Q-1).
      expect(result.current.staleHint).toBe('common.invalidDataHint')
    })
    if (result.current.kind !== 'ready-admin') throw new Error('esperava kind ready-admin')
    expect(result.current.data.kpis.turmas_em_andamento).toBe(4)
  })

  // UI-05 da revisão de 2026-08-17: a MESMA janela invertida do teste acima
  // oferecia "Reintentar", e clicar reemitia a mesma URL para receber o mesmo
  // 422. Repetir não é recuperação quando o servidor recusou a requisição.
  it('a recusa de validação avisa sem oferecer repetição', async () => {
    get.mockResolvedValue({ data: admin() })

    const { result, rerender } = renderHook(
      ({ p }: { p: { start: string; end: string } }) => useDashboard(p),
      { wrapper, initialProps: { p: { start: '2026-01-01', end: '2026-06-30' } } },
    )
    await waitFor(() => expect(result.current.kind).toBe('ready-admin'))

    get.mockRejectedValue(problem('La fecha de término no puede ser anterior a la de inicio.', 422))
    rerender({ p: { start: '2026-12-31', end: '2026-01-01' } })

    await waitFor(() => {
      if (result.current.kind !== 'ready-admin') throw new Error('esperava kind ready-admin')
      expect(result.current.staleErrored).toBe(true)
      expect(result.current.staleError).toBeNull()
      expect(result.current.staleHint).toBe('common.invalidDataHint')
    })
    if (result.current.kind !== 'ready-admin') throw new Error('esperava kind ready-admin')
    expect(result.current.staleRetry).toBeUndefined()
  })

  // O simétrico, e o que impede a correção acima de calar o botão para todo
  // mundo: falha de transporte continua oferecendo repetição, porque ali
  // repetir É a recuperação.
  it('a falha de transporte continua oferecendo repetição', async () => {
    get.mockResolvedValue({ data: admin() })

    const { result, rerender } = renderHook(
      ({ p }: { p: { start: string; end: string } }) => useDashboard(p),
      { wrapper, initialProps: { p: { start: '2025-01-01', end: '2025-06-30' } } },
    )
    await waitFor(() => expect(result.current.kind).toBe('ready-admin'))

    get.mockRejectedValue(problem('Error interno del servidor.', 500))
    rerender({ p: { start: '2025-07-01', end: '2025-12-31' } })

    await waitFor(() => {
      if (result.current.kind !== 'ready-admin') throw new Error('esperava kind ready-admin')
      expect(result.current.staleRetry).toBeTypeOf('function')
    })
  })
})
