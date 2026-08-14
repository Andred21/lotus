import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
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
