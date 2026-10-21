import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import type { RedatorData, TurmaData } from '@shared/types/generated'
import { useRedatorPicker } from './useRedatorPicker'

const lista = vi.hoisted(() => ({ data: undefined as unknown, isLoading: false }))
vi.mock('@shared/api/redatoresApi', () => ({
  redatoresApi: {
    useList: () => ({ data: lista.data, isLoading: lista.isLoading, isError: false, error: null, refetch: vi.fn() }),
  },
}))

const designate = vi.hoisted(() => ({ mutate: vi.fn() }))
vi.mock('../api/useTurmas', () => ({
  useDesignateRedator: () => ({ mutate: designate.mutate, isPending: false, error: null }),
  useRemoveRedator: () => ({ mutate: vi.fn(), isPending: false, error: null }),
}))

const CURSO = 9
const futuro = '2999-01-01'

function redator(id: number, over: { courseIds?: number[]; reuf?: boolean } = {}): RedatorData {
  return {
    id, name: `Redator ${id}`, rut: '1-9', email: `r${id}@lotus.cl`, phone: null, is_active: true,
    course_ids: over.courseIds ?? [CURSO],
    documents: over.reuf === false ? [] : [{ id: id * 10, type: 'REUF', valid_until: futuro }],
    photo_url: null, last_login: null,
  } as unknown as RedatorData
}

const IDONEO = redator(1)
const INIDONEO = redator(2, { courseIds: [1], reuf: false })
const DESIGNADO = redator(3, { reuf: false })

const TURMA = { id: 5, course_id: CURSO, redatores: [{ id: 3 }] } as unknown as TurmaData

beforeEach(() => {
  designate.mutate.mockReset()
  lista.isLoading = false
  lista.data = [IDONEO, INIDONEO, DESIGNADO]
})

describe('useRedatorPicker', () => {
  it('lista todos os não designados, cada um com seus motivos', () => {
    const { result } = renderHook(() => useRedatorPicker(TURMA))

    expect(result.current.options).toEqual([
      { redator: IDONEO, motivos: [] },
      { redator: INIDONEO, motivos: ['not_qualified', 'reuf_invalid'] },
    ])
  })

  it('pick de idôneo designa direto', () => {
    const { result } = renderHook(() => useRedatorPicker(TURMA))

    let direto = false
    act(() => { direto = result.current.pick(1) })

    expect(direto).toBe(true)
    expect(designate.mutate).toHaveBeenCalledWith({ turmaId: 5, redatorId: 1 })
    expect(result.current.pendingConfirmation).toBeNull()
  })

  it('pick de inidôneo abre a confirmação e não designa', () => {
    const { result } = renderHook(() => useRedatorPicker(TURMA))

    let direto = true
    act(() => { direto = result.current.pick(2) })

    expect(direto).toBe(false)
    expect(designate.mutate).not.toHaveBeenCalled()
    expect(result.current.pendingConfirmation).toEqual({
      redator: INIDONEO, motivos: ['not_qualified', 'reuf_invalid'],
    })
  })

  it('confirmPick designa o pendente e limpa a confirmação', () => {
    const { result } = renderHook(() => useRedatorPicker(TURMA))
    act(() => { result.current.pick(2) })

    act(() => result.current.confirmPick())

    expect(designate.mutate).toHaveBeenCalledWith({ turmaId: 5, redatorId: 2 })
    expect(result.current.pendingConfirmation).toBeNull()
  })

  it('cancelPick limpa a confirmação sem designar', () => {
    const { result } = renderHook(() => useRedatorPicker(TURMA))
    act(() => { result.current.pick(2) })

    act(() => result.current.cancelPick())

    expect(designate.mutate).not.toHaveBeenCalled()
    expect(result.current.pendingConfirmation).toBeNull()
  })

  it('motivosDe devolve os motivos de um designado', () => {
    const { result } = renderHook(() => useRedatorPicker(TURMA))

    expect(result.current.motivosDe(3)).toEqual(['reuf_invalid'])
  })

  it('motivosDe devolve null com a lista não carregada (sem tag "Idóneo" por omissão)', () => {
    lista.data = undefined
    lista.isLoading = true
    const { result } = renderHook(() => useRedatorPicker(TURMA))

    expect(result.current.motivosDe(3)).toBeNull()
  })

  it('motivosDe devolve null para um redator fora da lista', () => {
    const { result } = renderHook(() => useRedatorPicker(TURMA))

    expect(result.current.motivosDe(99)).toBeNull()
  })
})
