import { describe, expect, it } from 'vitest'
import { renderHook, screen } from '@testing-library/react'
import { useQueryClient } from '@tanstack/react-query'
import { useLocation } from 'react-router-dom'
import { createWrapper, renderWithProviders } from './providers'

describe('providers de teste', () => {
  it('devolve o MESMO client entre re-renders', () => {
    // O defeito que a home fecha: 20 dos 24 wrappers locais construíam o
    // client DENTRO do componente wrapper, então cada re-render descartava o
    // cache junto.
    const { wrapper } = createWrapper()
    const { result, rerender } = renderHook(() => useQueryClient(), { wrapper })
    const primeiro = result.current
    rerender()
    expect(result.current).toBe(primeiro)
  })

  it('devolve ao chamador o mesmo client que injeta', () => {
    const { wrapper, client } = createWrapper()
    const { result } = renderHook(() => useQueryClient(), { wrapper })
    expect(result.current).toBe(client)
  })

  it('o default desliga retry nos dois eixos e o refetch por foco', () => {
    const { client } = createWrapper()
    const padrao = client.getDefaultOptions()
    expect(padrao.queries?.retry).toBe(false)
    expect(padrao.queries?.refetchOnWindowFocus).toBe(false)
    expect(padrao.mutations?.retry).toBe(false)
  })

  it('NÃO fixa staleTime', () => {
    // `staleTime` é sujeito de teste em `useDashboard.test.tsx`, que declara
    // por escrito que a página é quem o passa. Um default aqui apagaria o
    // sujeito daquele arquivo.
    expect(createWrapper().client.getDefaultOptions().queries?.staleTime).toBeUndefined()
  })

  it('aceita override e o override substitui o default', () => {
    const { client } = createWrapper({
      queryClientOptions: { defaultOptions: { queries: { retry: 3 } } },
    })
    expect(client.getDefaultOptions().queries?.retry).toBe(3)
  })

  it('sem `route`, não monta router', () => {
    function Sonda() {
      return <span data-testid="sonda">montou</span>
    }
    renderWithProviders(<Sonda />)
    expect(screen.getByTestId('sonda')).toBeTruthy()
  })

  it('com `route`, monta o MemoryRouter naquela entrada', () => {
    function Rota() {
      return <span data-testid="rota">{useLocation().pathname}</span>
    }
    renderWithProviders(<Rota />, { route: '/validar/abc' })
    expect(screen.getByTestId('rota').textContent).toBe('/validar/abc')
  })

  it('devolve o client também no render', () => {
    const { client } = renderWithProviders(<span />)
    expect(typeof client.getQueryCache).toBe('function')
  })
})
