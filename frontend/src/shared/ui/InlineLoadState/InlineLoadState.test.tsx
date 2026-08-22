import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { InlineLoadState } from './InlineLoadState'

afterEach(() => {
  cleanup()
})

describe('InlineLoadState', () => {
  it('não renderiza nada quando não há falha nem lista vazia', () => {
    const { container } = render(
      <InlineLoadState error={null} emptyHint={null} retryLabel="Reintentar" onRetry={() => {}} />,
    )

    // O componente vive DENTRO de um FormField e de um card: renderizar
    // moldura vazia empurraria layout sem ter o que dizer.
    expect(container.firstChild).toBeNull()
  })

  it('anuncia a falha como alert e chama o Reintentar', () => {
    const onRetry = vi.fn()
    render(<InlineLoadState error="No se pudo cargar" retryLabel="Reintentar" onRetry={onRetry} />)

    expect(screen.getByRole('alert').textContent).toContain('No se pudo cargar')
    fireEvent.click(screen.getByText('Reintentar'))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('a dica de vazio NÃO é alert: lista vazia não é anomalia', () => {
    render(<InlineLoadState emptyHint="No hay clientes" retryLabel="Reintentar" onRetry={() => {}} />)

    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.getByText('No hay clientes')).toBeTruthy()
  })

  it('mostra os dois ramos juntos, cada um com o seu Reintentar', () => {
    render(
      <InlineLoadState
        error="Falla de red"
        emptyHint="No hay clientes"
        retryLabel="Reintentar"
        onRetry={() => {}}
      />,
    )

    expect(screen.getByText('Falla de red')).toBeTruthy()
    expect(screen.getByText('No hay clientes')).toBeTruthy()
    expect(screen.getAllByText('Reintentar')).toHaveLength(2)
  })
})

/** Uma promise que só resolve quando o teste mandar — é o que permite observar o
 * botão DURANTE o voo do GET, e não depois. */
function promiseControlada() {
  let resolve!: (v: unknown) => void
  const promise = new Promise((r) => {
    resolve = r
  })
  return { promise, resolve }
}

describe('InlineLoadState — o Reintentar espera a promise (Q-14)', () => {
  it('fica em carga enquanto a promise está pendente, e volta quando resolve', async () => {
    const { promise, resolve } = promiseControlada()
    render(
      <InlineLoadState error="Sin conexión" retryLabel="Reintentar" onRetry={() => promise} />,
    )

    const botao = screen.getByRole('button', { name: 'Reintentar' }) as HTMLButtonElement
    fireEvent.click(botao)

    await waitFor(() => expect(botao.disabled).toBe(true))

    resolve(undefined)

    await waitFor(() => expect(botao.disabled).toBe(false))
  })

  it('handler que devolve void continua funcionando', async () => {
    let chamadas = 0
    render(
      <InlineLoadState
        error="Sin conexión"
        retryLabel="Reintentar"
        onRetry={() => {
          chamadas += 1
        }}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))

    await waitFor(() => expect(chamadas).toBe(1))
  })
})
