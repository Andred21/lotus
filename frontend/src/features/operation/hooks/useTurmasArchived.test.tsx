import { describe, expect, it } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useLocation } from 'react-router-dom'
import { createWrapper } from '@shared/testing/providers'
import { useTurmasArchived } from './useTurmasArchived'

const useObservado = () => ({ archived: useTurmasArchived(), location: useLocation() })

describe('useTurmasArchived — o modo na URL', () => {
  it('sem parâmetro, o modo é o ativo', () => {
    const { wrapper } = createWrapper({ route: '/operacion' })
    const { result } = renderHook(useObservado, { wrapper })

    expect(result.current.archived.mode).toBe('active')
  })

  it('archived=1 restaura o modo arquivado', () => {
    const { wrapper } = createWrapper({ route: '/operacion?archived=1' })
    const { result } = renderHook(useObservado, { wrapper })

    expect(result.current.archived.mode).toBe('archived')
  })

  it('valor estranho em archived volta ao modo ativo', () => {
    const { wrapper } = createWrapper({ route: '/operacion?archived=sim' })
    const { result } = renderHook(useObservado, { wrapper })

    expect(result.current.archived.mode).toBe('active')
  })

  it('ir ao arquivado escreve archived=1, e voltar ao ativo remove archived da URL', () => {
    const { wrapper } = createWrapper({ route: '/operacion?tab=x' })
    const { result } = renderHook(useObservado, { wrapper })

    act(() => result.current.archived.setMode('archived'))
    expect(result.current.archived.mode).toBe('archived')
    expect(new URLSearchParams(result.current.location.search).get('archived')).toBe('1')

    act(() => result.current.archived.setMode('active'))
    expect(result.current.archived.mode).toBe('active')
    const params = new URLSearchParams(result.current.location.search)
    expect(params.has('archived')).toBe(false)
    expect(params.get('tab')).toBe('x')
  })
})
