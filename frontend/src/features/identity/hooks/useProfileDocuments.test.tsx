import { describe, expect, it, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import type { FileUploadHandlerEvent } from '@shared/ui'
import { useProfileDocuments } from './useProfileDocuments'

const envios = vi.hoisted(() => ({ vars: [] as unknown[], pendingType: null as string | null }))

vi.mock('../api/useProfile', () => ({
  useUploadProfileDocument: () => ({
    mutate: (v: unknown, opts?: { onSuccess?: () => void }) => {
      envios.vars.push(v)
      opts?.onSuccess?.()
    },
    isPending: envios.pendingType !== null,
    variables: envios.pendingType ? { type: envios.pendingType } : undefined,
    error: null,
  }),
}))

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

const limpar = vi.fn()

function evento(file: File | undefined): FileUploadHandlerEvent {
  return { files: file ? [file] : [], options: { clear: limpar } } as unknown as FileUploadHandlerEvent
}

describe('useProfileDocuments', () => {
  it('envia o arquivo com o tipo do slot e limpa o controle', () => {
    envios.vars = []
    envios.pendingType = null
    const { result } = renderHook(() => useProfileDocuments(), { wrapper })
    const arquivo = new File(['x'], 'cv.pdf', { type: 'application/pdf' })

    act(() => result.current.upload('CV', evento(arquivo)))

    expect(envios.vars).toEqual([{ type: 'CV', file: arquivo }])
    expect(limpar).toHaveBeenCalled()
  })

  it('evento sem arquivo nao vira requisicao', () => {
    envios.vars = []
    envios.pendingType = null
    const { result } = renderHook(() => useProfileDocuments(), { wrapper })

    act(() => result.current.upload('CV', evento(undefined)))

    expect(envios.vars).toEqual([])
  })

  it('so o slot em voo fica pendente, nao os quatro', () => {
    envios.vars = []
    envios.pendingType = 'TITULO'
    const { result } = renderHook(() => useProfileDocuments(), { wrapper })

    expect(result.current.uploadingType).toBe('TITULO')
  })
})
