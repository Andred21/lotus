import { describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import type { RedatorData } from '@shared/types/generated'
import { useRedatorForm } from './useRedatorForm'

vi.mock('@shared/api/redatoresApi', () => ({
  redatoresApi: {
    useCreate: () => ({ mutate: vi.fn(), isPending: false, error: null }),
    useUpdate: () => ({ mutate: vi.fn(), isPending: false, error: null }),
  },
}))

const REDATOR = {
  id: 4, name: 'Ana', rut: '1-9', email: 'a@lotus.cl', phone: null, course_ids: [], is_active: true,
} as unknown as RedatorData

/**
 * O redator NÃO roda sobre `useCrudForm` (o create é multipart), então a guarda
 * de rascunho dele mora aqui. Os documentos escolhidos no create não são campo
 * do form, mas são rascunho: sair sem salvá-los também perde trabalho.
 */
describe('useRedatorForm — rascunho', () => {
  const create = () =>
    renderHook(() => useRedatorForm(null, 'create', () => {}))

  it('nasce limpo e a guarda não pergunta', () => {
    const { result } = create()
    const seguir = vi.fn()

    act(() => result.current.guard.confirmDiscard(seguir))

    expect(seguir).toHaveBeenCalledTimes(1)
  })

  it('campo editado suja, e desfazer à mão limpa', () => {
    const { result } = create()

    act(() => result.current.set('name', 'Ana'))
    expect(result.current.dirty).toBe(true)

    act(() => result.current.set('name', ''))
    expect(result.current.dirty).toBe(false)
  })

  it('documento escolhido no create suja, e retirá-lo limpa', () => {
    const { result } = create()

    act(() => result.current.stageDoc('FIRMA', new File(['x'], 'ci.pdf')))
    expect(result.current.dirty).toBe(true)

    act(() => result.current.unstageDoc('FIRMA'))
    expect(result.current.dirty).toBe(false)
  })

  it('com rascunho, a guarda abre o aviso em vez de seguir', () => {
    const { result } = renderHook(() => useRedatorForm(REDATOR, 'edit', () => {}))
    const seguir = vi.fn()

    act(() => result.current.set('name', 'Outra'))
    act(() => result.current.guard.confirmDiscard(seguir))

    expect(seguir).not.toHaveBeenCalled()
    expect(result.current.guard.dialogProps.visible).toBe(true)
  })
})
