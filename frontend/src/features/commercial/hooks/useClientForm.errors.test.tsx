import { describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { createWrapper } from '@shared/testing/providers'
import { useClientForm } from './useClientForm'

const falha = vi.hoisted(() => ({ erro: null as unknown }))

vi.mock('@shared/api/clientsApi', () => ({
  clientsApi: {
    keys: { all: ['clients'] },
    useCreate: () => ({ mutate: vi.fn(), isPending: false, error: falha.erro }),
    useUpdate: () => ({ mutate: vi.fn(), isPending: false, error: null }),
  },
}))

const { wrapper } = createWrapper()
const monta = () => renderHook(() => useClientForm(null, 'create', () => {}), { wrapper })
const erro422 = (errors: Record<string, string[]>) => ({
  type: 'x', title: 'x', status: 422, detail: '', instance: '/x', errors,
})

describe('useClientForm — erro 422 some ao corrigir', () => {
  it('editar um campo do contato limpa o erro dele, e só dele', () => {
    falha.erro = erro422({ 'contacts.0.name': ['obrigatório'], 'contacts.0.email': ['inválido'] })
    const { result } = monta()

    act(() => result.current.patchContact(0, { name: 'Ana' }))

    expect(result.current.fieldErrors?.['contacts.0.name']).toBeUndefined()
    expect(result.current.fieldErrors?.['contacts.0.email']).toEqual(['inválido'])
    falha.erro = null
  })

  it('editar a razão social limpa o erro que o backend devolveu como `name`', () => {
    falha.erro = erro422({ name: ['obrigatório'] })
    const { result } = monta()
    expect(result.current.fieldErrors?.legal_name).toEqual(['obrigatório'])

    act(() => result.current.set('legal_name', 'Lotus SpA'))

    expect(result.current.fieldErrors?.legal_name).toBeUndefined()
    falha.erro = null
  })
})
