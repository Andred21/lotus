import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { createWrapper } from '@shared/testing/providers'
import type { CourseData } from '@shared/types/generated'
import { useCourseForm } from './useCourseForm'

const create = vi.fn()
const update = vi.fn()
const sync = vi.fn()

vi.mock('@shared/api/coursesApi', () => ({
  coursesApi: {
    keys: { all: ['courses'] },
    useCreate: () => ({ mutate: create, isPending: false, error: null }),
    useUpdate: () => ({ mutate: update, isPending: false, error: null }),
  },
}))

vi.mock('../api/useSyncCourseRedatores', () => ({
  useSyncCourseRedatores: () => ({ mutateAsync: sync, isPending: false, error: null }),
}))

const { wrapper } = createWrapper()

beforeEach(() => {
  create.mockReset()
  sync.mockReset()
  update.mockReset()
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

describe('useCourseForm — código SENCE', () => {
  it('manda sence_code no payload e NUNCA o code (o backend recusa com 422)', async () => {
    const { result } = renderHook(() => useCourseForm(null, 'create', vi.fn()), { wrapper })

    act(() => { result.current.set('sence_code', '12345') })
    await act(async () => { result.current.submit() })

    const payload = create.mock.calls[0][0]
    expect(payload.sence_code).toBe('12345')
    expect(payload).not.toHaveProperty('code')
  })

  it('campo SENCE limpo vai como null, não como string vazia', async () => {
    const { result } = renderHook(() => useCourseForm(null, 'create', vi.fn()), { wrapper })

    act(() => { result.current.set('sence_code', '  ') })
    await act(async () => { result.current.submit() })

    expect(create.mock.calls[0][0].sence_code).toBeNull()
  })

  it('no edit, o code do curso não vaza para o payload', async () => {
    const curso = {
      id: 3, code: 'C-3', name: 'Altura', technical_name: null, sence_code: '99',
      description: null, workload_hours: 8, modules: [], redator_ids: [], modules_total_hours: 0,
    } as CourseData
    const { result } = renderHook(() => useCourseForm(curso, 'edit', vi.fn()), { wrapper })

    await act(async () => { result.current.submit() })

    const payload = update.mock.calls[0][0].payload
    expect(payload.sence_code).toBe('99')
    expect(payload).not.toHaveProperty('code')
  })
})
