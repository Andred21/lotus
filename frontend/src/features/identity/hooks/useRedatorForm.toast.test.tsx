import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import type { RedatorData } from '@shared/types/generated'
import { useRedatorForm } from './useRedatorForm'

vi.mock('react-i18next', async (importOriginal) => {
  const { mockUseTranslation } = await import('@shared/testing/i18n')
  return {
    ...(await importOriginal<typeof import('react-i18next')>()),
    useTranslation: mockUseTranslation(),
  }
})

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock('@shared/hooks', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@shared/hooks')>()),
  useToast: () => toast,
}))

// O salvar "dá certo" na hora: o que se prova é o que o hook diz depois.
vi.mock('@shared/api/redatoresApi', () => ({
  redatoresApi: {
    useCreate: () => ({
      mutate: (_fd: unknown, o?: { onSuccess?: (c: unknown) => Promise<void> }) => { void o?.onSuccess?.({ id: 9 }) },
      isPending: false, error: null,
    }),
    useUpdate: () => ({
      mutate: (_v: unknown, o?: { onSuccess?: () => void }) => o?.onSuccess?.(),
      isPending: false, error: null,
    }),
  },
}))

const REDATOR = {
  id: 4, name: 'Ana', rut: '1-9', email: 'a@lotus.cl', phone: null, course_ids: [], is_active: true,
} as unknown as RedatorData

beforeEach(() => toast.success.mockClear())

describe('useRedatorForm — sucesso dito (C-5)', () => {
  it('criar diz "creado" e fecha, depois do afterCreate', async () => {
    const onDone = vi.fn()
    const ordem: string[] = []
    const afterCreate = vi.fn(async () => { ordem.push('afterCreate') })
    toast.success.mockImplementation(() => ordem.push('toast'))
    const { result } = renderHook(() => useRedatorForm(null, 'create', onDone, afterCreate))

    await act(async () => result.current.submit())

    expect(toast.success).toHaveBeenCalledWith('common.createdToast')
    expect(ordem).toEqual(['afterCreate', 'toast'])
    expect(onDone).toHaveBeenCalledTimes(1)
  })

  it('afterCreate que falha não diz sucesso nem fecha', async () => {
    const erro = vi.spyOn(console, 'error').mockImplementation(() => {})
    const onDone = vi.fn()
    const { result } = renderHook(() =>
      useRedatorForm(null, 'create', onDone, () => Promise.reject(new Error('docs falharam'))),
    )

    await act(async () => result.current.submit())

    expect(toast.success).not.toHaveBeenCalled()
    expect(onDone).not.toHaveBeenCalled()
    erro.mockRestore()
  })

  it('editar diz "actualizado" e fecha', () => {
    const onDone = vi.fn()
    const { result } = renderHook(() => useRedatorForm(REDATOR, 'edit', onDone))

    act(() => result.current.submit())

    expect(toast.success).toHaveBeenCalledWith('common.updatedToast')
    expect(onDone).toHaveBeenCalledTimes(1)
  })
})
