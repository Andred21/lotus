import { describe, expect, it } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useLocation, useNavigationType } from 'react-router-dom'
import { createWrapper } from '@shared/testing/providers'
import { useTableUrlState } from './useTableUrlState'

/** O hook sob teste e a localização que ele produz, lado a lado: o teste lê a
 * URL de verdade, não um mock do `useSearchParams`. */
const observar = (opts: { prefix?: string; enabled: boolean }) => () => ({
  url: useTableUrlState(opts),
  location: useLocation(),
  navigationType: useNavigationType(),
})

describe('useTableUrlState', () => {
  it('lê da URL e escreve nela; null remove a chave', () => {
    const { wrapper } = createWrapper({ route: '/lista?q=ana' })
    const { result } = renderHook(observar({ enabled: true }), { wrapper })
    expect(result.current.url.read('q')).toBe('ana')
    expect(result.current.url.read('page')).toBeNull()

    act(() => result.current.url.write({ q: 'bia', page: '2' }))
    expect(result.current.location.search).toBe('?q=bia&page=2')
    expect(result.current.url.read('page')).toBe('2')

    act(() => result.current.url.write({ q: null }))
    expect(result.current.location.search).toBe('?page=2')
    expect(result.current.url.read('q')).toBeNull()
  })

  it('escreve com replace: a lista não enche o histórico', () => {
    const { wrapper } = createWrapper({ route: '/lista' })
    const { result } = renderHook(observar({ enabled: true }), { wrapper })

    act(() => result.current.url.write({ q: 'ana' }))

    expect(result.current.navigationType).toBe('REPLACE')
  })

  it('tab sobrevive à escrita da lista', () => {
    const { wrapper } = createWrapper({ route: '/personas?tab=alumnos&q=ana' })
    const { result } = renderHook(observar({ enabled: true }), { wrapper })

    act(() => result.current.url.write({ page: '3', q: null }))

    const params = new URLSearchParams(result.current.location.search)
    expect(params.get('tab')).toBe('alumnos')
    expect(params.get('page')).toBe('3')
    expect(params.has('q')).toBe(false)
  })

  it('prefixo isola duas tabelas na mesma URL: b_q e c_q', () => {
    const { wrapper } = createWrapper({ route: '/lista' })
    const { result } = renderHook(
      () => ({
        b: useTableUrlState({ prefix: 'b', enabled: true }),
        c: useTableUrlState({ prefix: 'c', enabled: true }),
        location: useLocation(),
      }),
      { wrapper },
    )

    act(() => result.current.b.write({ q: 'um' }))
    act(() => result.current.c.write({ q: 'dois' }))

    const params = new URLSearchParams(result.current.location.search)
    expect(params.get('b_q')).toBe('um')
    expect(params.get('c_q')).toBe('dois')
    expect(params.has('q')).toBe(false)
    expect(result.current.b.read('q')).toBe('um')
    expect(result.current.c.read('q')).toBe('dois')
  })

  it('desligado não lê nem escreve', () => {
    const { wrapper } = createWrapper({ route: '/lista?q=ana' })
    const { result } = renderHook(observar({ enabled: false }), { wrapper })

    expect(result.current.url.read('q')).toBeNull()
    act(() => result.current.url.write({ q: 'bia', page: '2' }))

    expect(result.current.location.search).toBe('?q=ana')
  })
})
