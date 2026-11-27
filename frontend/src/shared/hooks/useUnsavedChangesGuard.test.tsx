import { describe, expect, it } from 'vitest'
import { act, render } from '@testing-library/react'
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

type Sonda = ReturnType<typeof useSonda>

/** Monta o `blocker` como o consumidor faz (via `DiscardChangesDialog`). */
function Montagem({ dirty, onRender }: { dirty: boolean; onRender: (sonda: Sonda) => void }) {
  const sonda = useSonda(dirty)
  onRender(sonda)
  return <>{sonda.guard.dialogProps.blocker}</>
}

function montar(dirty: boolean) {
  const { wrapper } = createWrapper({ route: '/a' })
  const result = { current: undefined as unknown as Sonda }
  const onRender = (sonda: Sonda) => { result.current = sonda }
  const view = render(<Montagem dirty={dirty} onRender={onRender} />, { wrapper })
  return {
    result,
    rerender: ({ d }: { d: boolean }) => view.rerender(<Montagem dirty={d} onRender={onRender} />),
    unmount: view.unmount,
  }
}

/** Duas guardas no mesmo router, como duas telas/diálogos montados juntos. */
function Duas({ a, b, onRender }: {
  a: boolean
  b: boolean
  onRender: (sonda: { a: Sonda['guard']; b: Sonda['guard']; navigate: Sonda['navigate']; location: Sonda['location'] }) => void
}) {
  const guardA = useUnsavedChangesGuard(a)
  const guardB = useUnsavedChangesGuard(b)
  const navigate = useNavigate()
  const location = useLocation()
  onRender({ a: guardA, b: guardB, navigate, location })
  return <>{guardA.dialogProps.blocker}{guardB.dialogProps.blocker}</>
}

function montarDuas(a: boolean, b: boolean) {
  const { wrapper } = createWrapper({ route: '/a' })
  const result = { current: undefined as unknown as Parameters<Parameters<typeof Duas>[0]['onRender']>[0] }
  render(<Duas a={a} b={b} onRender={(sonda) => { result.current = sonda }} />, { wrapper })
  return result
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

  it('allowNavigation também é consumido por uma navegação só de query', () => {
    const { result } = montar(true)

    act(() => {
      result.current.guard.allowNavigation()
      void result.current.navigate('/a?aba=2')
    })
    expect(result.current.location.search).toBe('?aba=2')

    act(() => { void result.current.navigate('/b') })
    expect(result.current.location.pathname).toBe('/a')
    expect(result.current.guard.dialogProps.visible).toBe(true)
  })

  it('duas guardas montadas, a suja bloqueia mesmo com a limpa registrada depois', () => {
    const result = montarDuas(true, false)

    act(() => { void result.current.navigate('/b') })

    expect(result.current.location.pathname).toBe('/a')
    expect(result.current.a.dialogProps.visible).toBe(true)
    expect(result.current.b.dialogProps.visible).toBe(false)
  })

  it('duas guardas montadas, a suja bloqueia mesmo com a limpa registrada antes', () => {
    const result = montarDuas(false, true)

    act(() => { void result.current.navigate('/b') })

    expect(result.current.location.pathname).toBe('/a')
    expect(result.current.b.dialogProps.visible).toBe(true)
    expect(result.current.a.dialogProps.visible).toBe(false)
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
    // O `returnValue` do jsdom é o espelho legado de `defaultPrevented`
    // (atribuir '' viraria `false` e cancelaria). Um campo comum deixa ver o valor atribuído.
    Object.defineProperty(comMudanca, 'returnValue', { writable: true, value: undefined })
    window.dispatchEvent(comMudanca)
    expect(comMudanca.defaultPrevented).toBe(true)
    // Chrome só pergunta com o `returnValue` atribuído.
    expect((comMudanca as BeforeUnloadEvent).returnValue).toBe('')

    sujo.rerender({ d: false })
    const depois = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(depois)
    expect(depois.defaultPrevented).toBe(false)
  })
})
