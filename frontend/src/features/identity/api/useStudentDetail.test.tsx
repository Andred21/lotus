import { describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { focusManager } from '@tanstack/react-query'
import { api } from '@shared/api/axios'
import { createWrapper } from '@shared/testing/providers'
import { useStudentDetail } from './useStudentDetail'

vi.mock('@shared/api/axios', () => ({
  api: { get: vi.fn() },
}))

const get = vi.mocked(api.get)

/** Mesmo default do `AppProviders` (`refetchOnWindowFocus: false`) — a catraca
 * só vale se a query tiver de vencê-lo. */
const { wrapper } = createWrapper()

describe('useStudentDetail — revalidação do estado derivado', () => {
  /**
   * A coluna Certificado do detalhe do aluno mostra `display_status`, derivado
   * no servidor no instante da resposta. A tela do aluno fica aberta durante o
   * atendimento: sem revalidar no foco, a virada da meia-noite em Santiago
   * passa despercebida e a linha segue dizendo `vigente` (Q-1 do review de
   * 2026-08-24).
   */
  it('revalida quando a janela volta ao foco, contra o default do AppProviders', async () => {
    get.mockResolvedValue({ data: { id: 7, turmas: [] } })

    const { result } = renderHook(() => useStudentDetail(7), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(get).toHaveBeenCalledTimes(1)

    act(() => {
      focusManager.setFocused(false)
      focusManager.setFocused(true)
    })

    await waitFor(() => expect(get).toHaveBeenCalledTimes(2))

    focusManager.setFocused(undefined)
  })
})
