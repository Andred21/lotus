import { describe, expect, it, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { createWrapper } from '@shared/testing/providers'
import { useQuoteCourseSearch } from './useQuoteCourseSearch'

const CURSOS = [
  { id: 1, code: 'C-12', name: 'Altura', workload_hours: 8 },
  { id: 2, code: 'C-7', name: 'Alta tensión', workload_hours: 16 },
]

vi.mock('@shared/api/coursesApi', () => ({
  coursesApi: {
    useList: () => ({
      data: CURSOS, isLoading: false, isError: false, error: null, refetch: vi.fn(),
    }),
  },
}))

const { wrapper } = createWrapper()

describe('useQuoteCourseSearch', () => {
  it('a busca casa o código do curso', () => {
    const { result } = renderHook(() => useQuoteCourseSearch(), { wrapper })
    act(() => { result.current.setSearch('c-12') })
    expect(result.current.list.map((c) => c.id)).toEqual([1])
  })

  it('a busca casa o nome do curso', () => {
    const { result } = renderHook(() => useQuoteCourseSearch(), { wrapper })
    act(() => { result.current.setSearch('tensión') })
    expect(result.current.list.map((c) => c.id)).toEqual([2])
  })
})
