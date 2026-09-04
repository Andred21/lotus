import { describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { focusManager } from '@tanstack/react-query'
import { api } from '@shared/api/axios'
import { useServerTable } from '@shared/hooks'
import { createWrapper } from '@shared/testing/providers'
import { certificatesPage, certificatesTableOptions, useEmissionPanel } from './certificatesApi'

vi.mock('@shared/api/axios', () => ({
  api: { get: vi.fn() },
}))

const get = vi.mocked(api.get)

/**
 * O wrapper repete o default do `AppProviders` de propósito
 * (`refetchOnWindowFocus: false`): sem ele, a query passaria neste teste pelo
 * default do TanStack e a catraca não provaria nada.
 */
const { wrapper } = createWrapper()

describe('a página do Historial — revalidação do estado derivado', () => {
  /**
   * `display_status` é derivado no servidor a partir do "hoje" de Santiago, e
   * congela no fetch. A aba do Historial fica aberta o dia inteiro: sem
   * revalidar, um certificado que venceu à meia-noite continua com a tag
   * `vigente` até alguém remontar a tela — estado errado sobre documento de
   * peso legal (Q-1 do review de 2026-08-24). Com a lista paginada, a opção
   * viaja em `certificatesTableOptions` e é o `useServerTable` que a entrega
   * ao `useQuery` — é isso que se prova aqui.
   */
  it('revalida quando a janela volta ao foco, contra o default do AppProviders', async () => {
    get.mockResolvedValue({ data: { data: [], meta: { page: 1, per_page: 10, total: 0, last_page: 1, total_unfiltered: 0, summary: { vigente: 0, por_vencer: 0, vencido: 0, revocado: 0 } } } })

    const { result } = renderHook(() => useServerTable(certificatesPage, certificatesTableOptions), { wrapper })

    await waitFor(() => expect(result.current.meta).toBeDefined())
    expect(get).toHaveBeenCalledTimes(1)

    act(() => {
      focusManager.setFocused(false)
      focusManager.setFocused(true)
    })

    await waitFor(() => expect(get).toHaveBeenCalledTimes(2))

    focusManager.setFocused(undefined)
  })
})

describe('o painel de emissão — segundo observador não refaz o GET', () => {
  /**
   * `useHistorial` monta um segundo observador de `useEmissionPanel` na mesma
   * chave, para o Reemitir; com `staleTime` 0 o observador novo refazia o GET
   * no instante em que a aba Emisión saía de vista (f3 UI-09, run de
   * 2026-08-28 — a run não isolou o gatilho; é este, não foco). O payload
   * cresce com as turmas concluídas. `invalidateQueries` pós-emissão ignora
   * `staleTime`, então a emissão continua repintando o painel.
   */
  it('dois observadores na mesma janela custam um GET', async () => {
    get.mockClear()
    get.mockResolvedValue({ data: [] })
    const { wrapper: compartilhado } = createWrapper()

    const primeiro = renderHook(() => useEmissionPanel(true), { wrapper: compartilhado })
    await waitFor(() => expect(primeiro.result.current.isSuccess).toBe(true))
    primeiro.unmount()
    const segundo = renderHook(() => useEmissionPanel(true), { wrapper: compartilhado })
    await waitFor(() => expect(segundo.result.current.isSuccess).toBe(true))

    expect(get).toHaveBeenCalledTimes(1)
  })
})
