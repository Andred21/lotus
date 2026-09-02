import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { AppErrorState } from './AppErrorState'

/** Uma promise que só resolve quando o teste mandar — é o que permite observar o
 * botão DURANTE o voo do GET, e não depois. Mesmo molde do
 * `InlineLoadState.test.tsx`, que guarda o outro consumidor do
 * `useRetryPending`. */
function promiseControlada() {
  let resolve!: (v: unknown) => void
  const promise = new Promise((r) => {
    resolve = r
  })
  return { promise, resolve }
}

describe('AppErrorState', () => {
  it('anuncia a falha como alert, com título e detalhe', () => {
    render(<AppErrorState title="No se pudo cargar" detail="Sin conexión" />)

    // O texto é obrigatório: erro nunca é só cor nem só ícone (peso legal).
    expect(screen.getByRole('alert').textContent).toContain('No se pudo cargar')
    expect(screen.getByText('Sin conexión')).toBeTruthy()
  })

  it('sem `onRetry` não há botão: quem não recarrega não promete que recarrega', () => {
    render(<AppErrorState title="No se pudo cargar" retryLabel="Reintentar" />)

    expect(screen.queryByRole('button')).toBeNull()
  })
})

describe('AppErrorState — o Reintentar espera a promise (Q-14)', () => {
  it('fica em carga enquanto a promise está pendente, e volta quando resolve', async () => {
    const { promise, resolve } = promiseControlada()
    render(
      <AppErrorState title="No se pudo cargar" retryLabel="Reintentar" onRetry={() => promise} />,
    )

    const botao = screen.getByRole('button') as HTMLButtonElement
    fireEvent.click(botao)

    // A catraca do D-54 inteiro: apagar o `loading`/`disabled` daqui, ou voltar
    // a `void query.refetch()` num produtor, deixa o botão livre com o GET em
    // voo — e nem o tipo nem o build veem isso.
    await waitFor(() => expect(botao.disabled).toBe(true))

    resolve(undefined)

    await waitFor(() => expect(botao.disabled).toBe(false))
  })

  it('ignora o clique repetido enquanto a promise não resolve', async () => {
    const { promise, resolve } = promiseControlada()
    const onRetry = vi.fn(() => promise)
    render(
      <AppErrorState title="No se pudo cargar" retryLabel="Reintentar" onRetry={onRetry} />,
    )

    const botao = screen.getByRole('button')
    fireEvent.click(botao)
    await waitFor(() => expect((botao as HTMLButtonElement).disabled).toBe(true))
    fireEvent.click(botao)

    expect(onRetry).toHaveBeenCalledTimes(1)
    resolve(undefined)
  })

  it('handler que devolve void continua funcionando', async () => {
    const onRetry = vi.fn()
    render(
      <AppErrorState title="No se pudo cargar" retryLabel="Reintentar" onRetry={onRetry} />,
    )

    fireEvent.click(screen.getByRole('button'))

    await waitFor(() => expect(onRetry).toHaveBeenCalledTimes(1))
  })
})
