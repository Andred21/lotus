import { describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useCrudDialog } from './useCrudDialog'

interface Item {
  id?: number
  name: string
}

describe('useCrudDialog — a entidade vem da lista, ou do useOne quando a lista não a tem (D14)', () => {
  it('id presente na página: useOne recebe undefined e a entidade é a da lista', () => {
    const useOne = vi.fn(() => ({ data: undefined as Item | undefined }))
    const { result } = renderHook(() => useCrudDialog<Item>([{ id: 1, name: 'da lista' }], useOne))

    act(() => result.current.openViewById(1))

    expect(useOne).toHaveBeenLastCalledWith(undefined)
    expect(result.current.dialog?.entity?.name).toBe('da lista')
  })

  it('id fora da página: useOne recebe o id e a entidade é a dele', () => {
    // Com página, o aluno aberto por deep link ou visto na página 3 e depois
    // filtrado para fora não está em `items`; derivar só da lista devolvia
    // `null` e o dialog abria vazio.
    const useOne = vi.fn((id: number | undefined) => ({ data: id === 7 ? { id: 7, name: 'do servidor' } : undefined }))
    const { result } = renderHook(() => useCrudDialog<Item>([{ id: 1, name: 'da lista' }], useOne))

    act(() => result.current.openViewById(7))

    expect(useOne).toHaveBeenLastCalledWith(7)
    expect(result.current.dialog?.entity?.name).toBe('do servidor')
  })

  it('sem useOne, o comportamento antigo fica: fora da lista é null', () => {
    const { result } = renderHook(() => useCrudDialog<Item>([{ id: 1, name: 'da lista' }]))

    act(() => result.current.openViewById(7))

    expect(result.current.dialog?.entity).toBeNull()
  })

  it('startEdit exige entidade, venha ela da lista ou do useOne', () => {
    const useOne = vi.fn((id: number | undefined) => ({ data: id === 7 ? { id: 7, name: 'do servidor' } : undefined }))
    const { result } = renderHook(() => useCrudDialog<Item>([], useOne))

    act(() => result.current.openViewById(7))
    act(() => result.current.startEdit())

    expect(result.current.dialog?.mode).toBe('edit')
  })
})
