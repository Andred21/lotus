import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { api } from '@shared/api/axios'
import type { ArchiveMode } from '@shared/hooks'
import { createWrapper } from '@shared/testing/providers'
import { useTurmasPage } from './useTurmasPage'

vi.mock('@shared/api/axios', () => ({
  api: { get: vi.fn() },
}))

const get = vi.mocked(api.get)

const meta = { page: 1, per_page: 10, total: 1, last_page: 1, total_unfiltered: 1 }

describe('useTurmasPage', () => {
  beforeEach(() => {
    get.mockReset()
  })

  it('modo ativo: pede /api/turmas com page/per_page e o status como filtro nomeado', async () => {
    get.mockResolvedValue({ data: { data: [{ id: 7, course_name: 'T-7' }], meta } })

    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useTurmasPage('active', 'habilitada'), { wrapper })

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(get).toHaveBeenCalledWith('/api/turmas', { params: { page: 1, per_page: 10, status: 'habilitada' } })
    expect(result.current.rows).toEqual([{ id: 7, course_name: 'T-7' }])
    expect(result.current.totalRecords).toBe(1)
    expect(result.current.error).toBeNull()
  })

  it('modo arquivado: pede /api/turmas/archived e ACHATA o DTO composto numa forma só', async () => {
    // A tabela não pode ter duas formas (`useArchivedPage`): o agregado sobe
    // ao topo e `archived_at`/`archived_by` ficam ao lado — no fetch, antes de
    // o hook ver a linha.
    get.mockResolvedValue({
      data: {
        data: [{ turma: { id: 9, course_name: 'T-9' }, archived_at: '2026-08-18T10:00:00-03:00', archived_by: 'Ana Torres' }],
        meta,
      },
    })

    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useTurmasPage('archived', null), { wrapper })

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(get).toHaveBeenCalledWith('/api/turmas/archived', { params: { page: 1, per_page: 10 } })
    expect(result.current.rows).toEqual([
      { id: 9, course_name: 'T-9', archived_at: '2026-08-18T10:00:00-03:00', archived_by: 'Ana Torres' },
    ])
  })

  it('trocar de modo na pagina 3 pede a PRIMEIRA pagina do endpoint novo (Q-3)', async () => {
    get.mockResolvedValue({ data: { data: [], meta: { ...meta, total: 30, last_page: 3, total_unfiltered: 30 } } })

    const { wrapper } = createWrapper()
    const { result, rerender } = renderHook(
      ({ mode }: { mode: ArchiveMode }) => useTurmasPage(mode, null),
      { wrapper, initialProps: { mode: 'active' as ArchiveMode } },
    )

    await waitFor(() => expect(result.current.loading).toBe(false))
    act(() => result.current.onPage({ first: 20 }))
    await waitFor(() =>
      expect(get).toHaveBeenLastCalledWith('/api/turmas', { params: { page: 3, per_page: 10 } }))

    rerender({ mode: 'archived' })

    // A lista arquivada e outra FONTE: `page: 3` dela seria fora de faixa, viria
    // vazia e so entao o clamp voltaria a 1 — um GET jogado fora e uma piscada
    // de tabela vazia.
    await waitFor(() =>
      expect(get).toHaveBeenLastCalledWith('/api/turmas/archived', { params: { page: 1, per_page: 10 } }))
    expect(result.current.first).toBe(0)
  })

  it('devolve rows vazio, e nao undefined, antes de a query voltar', () => {
    get.mockReturnValue(new Promise(() => {}))

    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useTurmasPage('active', null), { wrapper })

    expect(result.current.rows).toEqual([])
    expect(result.current.loading).toBe(true)
  })

  it('devolve o envelope da falha, e `{}` quando o interceptor nao populou o corpo', async () => {
    get.mockRejectedValue(undefined)

    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useTurmasPage('active', null), { wrapper })

    await waitFor(() => expect(result.current.error).not.toBeNull())
    expect(result.current.error).toEqual({})
  })

  it('DEVOLVE a promise do refetch (Q-14)', async () => {
    get.mockResolvedValue({ data: { data: [], meta: { ...meta, total: 0, total_unfiltered: 0 } } })

    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useTurmasPage('active', null), { wrapper })

    await waitFor(() => expect(result.current.loading).toBe(false))
    await expect(result.current.refetch()).resolves.toBeDefined()
  })
})
