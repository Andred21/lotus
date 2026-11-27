import { describe, expect, it } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { useLocation, useNavigate, useNavigationType } from 'react-router-dom'
import { createWrapper } from '@shared/testing/providers'
import { backState, useBackNavigation } from './useBackNavigation'
import { useUrlTab } from './useUrlTab'

const TABS = ['users', 'roles', 'configuracion'] as const

/** O hook sob teste e a localização real que ele produz, lado a lado. */
const voltar = (fallback: string) => () => ({
  back: useBackNavigation(fallback),
  navigate: useNavigate(),
  location: useLocation(),
  navigationType: useNavigationType(),
})

const abas = (visible?: readonly (typeof TABS)[number][]) => () => ({
  tabs: useUrlTab(TABS, visible),
  navigate: useNavigate(),
  location: useLocation(),
  navigationType: useNavigationType(),
})

describe('useBackNavigation', () => {
  it('volver com backTo volta no histórico e reencontra a busca', async () => {
    const { wrapper } = createWrapper({ route: '/lista?q=ana&page=2' })
    const { result } = renderHook(voltar('/fallback'), { wrapper })

    act(() => {
      void result.current.navigate('/detalhe/7', { state: backState(result.current.location) })
    })
    await waitFor(() => expect(result.current.location.pathname).toBe('/detalhe/7'))
    expect(result.current.location.state).toEqual({ backTo: '/lista?q=ana&page=2' })

    act(() => result.current.back())

    await waitFor(() => expect(result.current.location.pathname).toBe('/lista'))
    expect(result.current.location.search).toBe('?q=ana&page=2')
    // Voltar é recuar no histórico, não empurrar uma entrada nova.
    expect(result.current.navigationType).toBe('POP')
  })

  it('volver sem backTo vai ao fallback', async () => {
    const { wrapper } = createWrapper({ route: '/detalhe/7' })
    const { result } = renderHook(voltar('/fallback'), { wrapper })

    act(() => result.current.back())

    await waitFor(() => expect(result.current.location.pathname).toBe('/fallback'))
  })
})

describe('useUrlTab', () => {
  it('tab inválida ou invisível abre a primeira visível', () => {
    const invalida = createWrapper({ route: '/admin?tab=nao-existe' })
    const a = renderHook(abas(), { wrapper: invalida.wrapper })
    expect(a.result.current.tabs).toMatchObject({ tab: 'users', index: 0 })

    // `roles` existe, mas o usuário não a enxerga.
    const invisivel = createWrapper({ route: '/admin?tab=roles' })
    const b = renderHook(abas(['users', 'configuracion']), { wrapper: invisivel.wrapper })
    expect(b.result.current.tabs).toMatchObject({ tab: 'users', index: 0 })
  })

  it('o índice é a posição do slot no TabView, que conta o painel invisível', () => {
    // `[users, <roles oculto>, configuracion]`: o TabView entrega 2, não 1.
    const { wrapper } = createWrapper({ route: '/admin?tab=configuracion' })
    const { result } = renderHook(abas(['users', 'configuracion']), { wrapper })
    expect(result.current.tabs).toMatchObject({ tab: 'configuracion', index: 2 })
  })

  it('trocar de aba usa replace', () => {
    const { wrapper } = createWrapper({ route: '/admin' })
    const { result } = renderHook(abas(['users', 'configuracion']), { wrapper })

    act(() => result.current.tabs.setTab('configuracion'))
    expect(result.current.navigationType).toBe('REPLACE')
    expect(result.current.location.search).toBe('?tab=configuracion')

    // Pelo índice (o que o TabView entrega).
    act(() => result.current.tabs.setTab(0))
    expect(result.current.location.search).toBe('?tab=users')
  })

  it('trocar de aba preserva as chaves da lista e o state do voltar', async () => {
    const { wrapper } = createWrapper({ route: '/admin' })
    const { result } = renderHook(abas(), { wrapper })
    act(() => {
      void result.current.navigate('/admin?q=ana&page=2', { state: { backTo: '/origem' } })
    })
    await waitFor(() => expect(result.current.location.search).toBe('?q=ana&page=2'))

    act(() => result.current.tabs.setTab('roles'))

    expect(new URLSearchParams(result.current.location.search).get('q')).toBe('ana')
    expect(new URLSearchParams(result.current.location.search).get('page')).toBe('2')
    expect(new URLSearchParams(result.current.location.search).get('tab')).toBe('roles')
    expect(result.current.location.state).toEqual({ backTo: '/origem' })
  })
})
