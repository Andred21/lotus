import { describe, expect, it, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { createWrapper } from '@shared/testing/providers'
import type { ProfileData } from '@shared/types/generated'
import { useProfileForm } from './useProfileForm'

const enviados = vi.hoisted(() => ({ payloads: [] as unknown[] }))

vi.mock('../api/useProfile', () => ({
  useUpdateProfile: () => ({
    mutate: (payload: unknown) => enviados.payloads.push(payload),
    isPending: false,
    error: null,
  }),
}))

const { wrapper } = createWrapper()

function perfil(over: Partial<ProfileData> = {}): ProfileData {
  return {
    id: 1,
    uuid: 'u',
    name: 'Juan Morales',
    email: 'juan@lotus.cl',
    rut: '18.400.000-2',
    phone: '+56 9 1111 1111',
    type: 'staff',
    role: 'redator',
    photo_url: null,
    redator: null,
    ...over,
  }
}

describe('useProfileForm', () => {
  it('semeia o form a partir do perfil', () => {
    const { result } = renderHook(() => useProfileForm(perfil()), { wrapper })

    expect(result.current.form).toEqual({ name: 'Juan Morales', phone: '+56 9 1111 1111' })
  })

  it('telefone nulo vira string vazia, nao a string "null"', () => {
    const { result } = renderHook(() => useProfileForm(perfil({ phone: null })), { wrapper })

    expect(result.current.form.phone).toBe('')
  })

  it('refetch com o MESMO id nao apaga o que o usuario digitou', () => {
    const { result, rerender } = renderHook((p: ProfileData) => useProfileForm(p), {
      wrapper,
      initialProps: perfil(),
    })

    act(() => result.current.set('name', 'Juan M. Morales'))
    // Objeto NOVO, mesmo id — é o que um refetch produz.
    rerender(perfil())

    expect(result.current.form.name).toBe('Juan M. Morales')
  })

  it('envia name e phone, e telefone vazio vira null', () => {
    enviados.payloads = []
    const { result } = renderHook(() => useProfileForm(perfil({ phone: null })), { wrapper })

    act(() => result.current.set('name', 'Ana'))
    act(() => result.current.submit())

    expect(enviados.payloads).toEqual([{ name: 'Ana', phone: null }])
  })
})
