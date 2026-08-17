import { describe, expect, it, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useProfilePassword } from './useProfilePassword'

const chamadas = vi.hoisted(() => ({
  payloads: [] as unknown[],
  falhar: false,
}))

vi.mock('../api/useProfile', () => ({
  useChangePassword: () => ({
    mutate: (payload: unknown, opts?: { onSuccess?: () => void }) => {
      chamadas.payloads.push(payload)
      if (!chamadas.falhar) opts?.onSuccess?.()
    },
    isPending: false,
    error: null,
  }),
}))

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

describe('useProfilePassword', () => {
  it('envia os tres campos que o DTO exige', () => {
    chamadas.payloads = []
    chamadas.falhar = false
    const { result } = renderHook(() => useProfilePassword(), { wrapper })

    act(() => result.current.set('current_password', 'antiga'))
    act(() => result.current.set('password', 'nova-secreta-1'))
    act(() => result.current.set('password_confirmation', 'nova-secreta-1'))
    act(() => result.current.submit())

    expect(chamadas.payloads).toEqual([
      {
        current_password: 'antiga',
        password: 'nova-secreta-1',
        password_confirmation: 'nova-secreta-1',
      },
    ])
  })

  it('sucesso limpa os tres campos e avisa quem pediu', () => {
    chamadas.payloads = []
    chamadas.falhar = false
    const avisado = vi.fn()
    const { result } = renderHook(() => useProfilePassword(avisado), { wrapper })

    act(() => result.current.set('password', 'nova-secreta-1'))
    act(() => result.current.submit())

    expect(result.current.form).toEqual({
      current_password: '',
      password: '',
      password_confirmation: '',
    })
    expect(avisado).toHaveBeenCalledOnce()
  })

  it('falha NAO limpa: o usuario nao redigita o que ele acertou', () => {
    chamadas.payloads = []
    chamadas.falhar = true
    const { result } = renderHook(() => useProfilePassword(), { wrapper })

    act(() => result.current.set('current_password', 'antiga'))
    act(() => result.current.submit())

    expect(result.current.form.current_password).toBe('antiga')
  })
})
