import { describe, expect, it } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useLocation, useNavigate } from 'react-router-dom'
import { createWrapper } from '@/shared/testing/providers'
import { useUnsavedChangesGuard } from './useUnsavedChangesGuard'

/** O hook sob teste, mais o que o teste precisa para navegar e para ler onde está. */
function useSonda(dirty: boolean) {
  return {
    guard: useUnsavedChangesGuard(dirty),
    navigate: useNavigate(),
    location: useLocation(),
  }
}

function montar(dirty: boolean) {
  const { wrapper } = createWrapper({ route: '/a' })
  return renderHook(({ d }) => useSonda(d), { wrapper, initialProps: { d: dirty } })
}

describe('useUnsavedChangesGuard', () => {
  it('sem mudança, navegar não bloqueia', () => {
    const { result } = montar(false)

    act(() => { void result.current.navigate('/b') })

    expect(result.current.location.pathname).toBe('/b')
    expect(result.current.guard.dialogProps.visible).toBe(false)
  })

  it('com mudança, navegar abre o diálogo e Descartar prossegue', () => {
    const { result } = montar(true)

    act(() => { void result.current.navigate('/b') })
    expect(result.current.location.pathname).toBe('/a')
    expect(result.current.guard.dialogProps.visible).toBe(true)

    act(() => { result.current.guard.dialogProps.onConfirm() })
    expect(result.current.location.pathname).toBe('/b')
    expect(result.current.guard.dialogProps.visible).toBe(false)
  })

  it('Seguir editando cancela a navegação', () => {
    const { result } = montar(true)

    act(() => { void result.current.navigate('/b') })
    act(() => { result.current.guard.dialogProps.onCancel() })

    expect(result.current.location.pathname).toBe('/a')
    expect(result.current.guard.dialogProps.visible).toBe(false)
  })

  it('mudança só de query ou hash não bloqueia', () => {
    const { result } = montar(true)

    act(() => { void result.current.navigate('/a?aba=2#topo') })

    expect(result.current.location.search).toBe('?aba=2')
    expect(result.current.guard.dialogProps.visible).toBe(false)
  })

  it('allowNavigation libera uma navegação e só uma', () => {
    const { result } = montar(true)

    act(() => {
      result.current.guard.allowNavigation()
      void result.current.navigate('/b')
    })
    expect(result.current.location.pathname).toBe('/b')
    expect(result.current.guard.dialogProps.visible).toBe(false)

    act(() => { void result.current.navigate('/c') })
    expect(result.current.location.pathname).toBe('/b')
    expect(result.current.guard.dialogProps.visible).toBe(true)
  })

  it('confirmDiscard sem mudança chama proceed direto', () => {
    const { result } = montar(false)
    let chamadas = 0

    act(() => { result.current.guard.confirmDiscard(() => { chamadas += 1 }) })

    expect(chamadas).toBe(1)
    expect(result.current.guard.dialogProps.visible).toBe(false)
  })

  it('confirmDiscard com mudança abre o diálogo; Descartar chama proceed e Seguir editando não', () => {
    const { result } = montar(true)
    let chamadas = 0
    const proceed = () => { chamadas += 1 }

    act(() => { result.current.guard.confirmDiscard(proceed) })
    expect(chamadas).toBe(0)
    expect(result.current.guard.dialogProps.visible).toBe(true)

    act(() => { result.current.guard.dialogProps.onCancel() })
    expect(chamadas).toBe(0)
    expect(result.current.guard.dialogProps.visible).toBe(false)

    act(() => { result.current.guard.confirmDiscard(proceed) })
    act(() => { result.current.guard.dialogProps.onConfirm() })
    expect(chamadas).toBe(1)
    expect(result.current.guard.dialogProps.visible).toBe(false)
  })

  it('beforeunload só com mudança', () => {
    const limpo = montar(false)
    const semMudanca = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(semMudanca)
    expect(semMudanca.defaultPrevented).toBe(false)
    limpo.unmount()

    const sujo = montar(true)
    const comMudanca = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(comMudanca)
    expect(comMudanca.defaultPrevented).toBe(true)

    sujo.rerender({ d: false })
    const depois = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(depois)
    expect(depois.defaultPrevented).toBe(false)
  })
})
