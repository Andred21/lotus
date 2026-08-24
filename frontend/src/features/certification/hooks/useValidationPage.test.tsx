import { describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useValidationPage } from './useValidationPage'
import { api } from '@shared/api/axios'
import type { ProblemDetails } from '@shared/api/axios'
import type { PublicCertificateData } from '@shared/types/generated'

vi.mock('@shared/api/axios', () => ({
  api: { get: vi.fn() },
}))

const get = vi.mocked(api.get)

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

// As datas ficam só como dado do DTO: quem decide o estado agora é o servidor, em `display_status`.
const FUTURO = '2030-01-01'
const PASSADO = '2020-01-01'

function certWith(overrides: Partial<PublicCertificateData>): PublicCertificateData {
  return {
    codigo: 'CERT-1',
    status: 'emitido',
    valido_ate: null,
    revoked_at: null,
    aluno: { name: 'Ana Pérez' },
    curso: { name: 'Alta Tensión', workload_hours: 40 },
    turma: { end_date: '2026-01-01' },
    cliente: { name: 'Cliente X' },
    redator: { name: 'Redator Uno' },
    display_status: 'vigente',
    ...overrides,
  }
}

function problem(status: number): ProblemDetails {
  return {
    type: 'https://lotus.cl/errors/x',
    title: 'x',
    status,
    detail: 'x',
    instance: '',
  }
}

describe('useValidationPage', () => {
  it('começa em loading antes da resposta chegar', () => {
    get.mockReturnValue(new Promise(() => {})) // nunca resolve nesta assertiva

    const { result } = renderHook(() => useValidationPage('uuid-1'), { wrapper })

    expect(result.current.kind).toBe('loading')
  })

  // O mapeamento abaixo é exaustivo nos 4 valores de `display_status`
  // (`CertificateDisplayStatus`). A precedência "revogado ganha da data" e a
  // janela de `por_vencer` são regra de BACKEND, provada lá
  // (`CertificateDisplayStatusTest`, `CertificateListingTest`,
  // `PublicCertificateTest`) — aqui só se prova o `display_status` → `kind`.
  it('display_status revocado vira kind revoked', async () => {
    get.mockResolvedValue({ data: certWith({ status: 'revocado', valido_ate: FUTURO, display_status: 'revocado' }) })

    const { result } = renderHook(() => useValidationPage('uuid-1'), { wrapper })

    await waitFor(() => expect(result.current.kind).toBe('revoked'))
  })

  it('display_status vencido vira kind expired', async () => {
    get.mockResolvedValue({ data: certWith({ status: 'emitido', valido_ate: PASSADO, display_status: 'vencido' }) })

    const { result } = renderHook(() => useValidationPage('uuid-1'), { wrapper })

    await waitFor(() => expect(result.current.kind).toBe('expired'))
  })

  it('display_status vigente vira kind valid', async () => {
    get.mockResolvedValue({ data: certWith({ status: 'emitido', valido_ate: FUTURO, display_status: 'vigente' }) })

    const { result } = renderHook(() => useValidationPage('uuid-1'), { wrapper })

    await waitFor(() => expect(result.current.kind).toBe('valid'))
  })

  it('display_status por_vencer também vira kind valid — não confundir com expired', async () => {
    get.mockResolvedValue({ data: certWith({ status: 'emitido', valido_ate: FUTURO, display_status: 'por_vencer' }) })

    const { result } = renderHook(() => useValidationPage('uuid-1'), { wrapper })

    await waitFor(() => expect(result.current.kind).toBe('valid'))
  })

  it('404 vira notFound, sem retry — distinto de um erro genérico', async () => {
    get.mockRejectedValue(problem(404))

    const { result } = renderHook(() => useValidationPage('uuid-inexistente'), { wrapper })

    await waitFor(() => expect(result.current.kind).toBe('notFound'))
  })

  it('erro genérico (não-404) vira error, com retry que reconsulta a API', async () => {
    get.mockRejectedValue(problem(500))

    const { result } = renderHook(() => useValidationPage('uuid-1'), { wrapper })

    await waitFor(() => expect(result.current.kind).toBe('error'))
    if (result.current.kind !== 'error') throw new Error('esperava kind error')
    expect(result.current.error.status).toBe(500)

    const retry = result.current.retry
    const chamadasAntes = get.mock.calls.length
    act(() => retry())
    await waitFor(() => expect(get.mock.calls.length).toBe(chamadasAntes + 1))
  })
})
