import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useCourseForm } from './useCourseForm'

const create = vi.fn()
const sync = vi.fn()

vi.mock('@shared/api/coursesApi', () => ({
  coursesApi: {
    keys: { all: ['courses'] },
    useCreate: () => ({ mutate: create, isPending: false, error: null }),
    useUpdate: () => ({ mutate: vi.fn(), isPending: false, error: null }),
  },
}))

vi.mock('../api/useSyncCourseRedatores', () => ({
  useSyncCourseRedatores: () => ({ mutateAsync: sync, isPending: false, error: null }),
}))

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

beforeEach(() => {
  create.mockReset()
  sync.mockReset()
  create.mockImplementation((_payload, opts) => opts?.onSuccess?.({ id: 42 }))
})

describe('useCourseForm', () => {
  it('não recria o curso quando o sync de redatores reprova e o usuário reenvia', async () => {
    sync.mockRejectedValueOnce(new Error('sync falhou'))
    const onDone = vi.fn()
    const { result } = renderHook(() => useCourseForm(null, 'create', onDone), { wrapper })

    act(() => { result.current.toggleRedator(7) })
    await act(async () => { result.current.submit() })

    expect(create).toHaveBeenCalledTimes(1)
    expect(sync).toHaveBeenCalledTimes(1)
    expect(onDone).not.toHaveBeenCalled()

    sync.mockResolvedValueOnce(undefined)
    await act(async () => { result.current.submit() })

    expect(create).toHaveBeenCalledTimes(1)   // <- o curso NÃO nasce duas vezes
    expect(sync).toHaveBeenCalledTimes(2)
    expect(onDone).toHaveBeenCalledTimes(1)
  })

  it('não dispara o sync quando nenhum redator foi escolhido', async () => {
    const onDone = vi.fn()
    const { result } = renderHook(() => useCourseForm(null, 'create', onDone), { wrapper })

    await act(async () => { result.current.submit() })

    expect(sync).not.toHaveBeenCalled()
    expect(onDone).toHaveBeenCalledTimes(1)
  })
})
