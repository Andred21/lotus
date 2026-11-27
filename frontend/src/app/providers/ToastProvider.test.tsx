import { describe, expect, it } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { useToast } from '@shared/hooks'
import { ToastProvider } from './ToastProvider'

function Disparador() {
  const toast = useToast()
  return (
    <>
      <button onClick={() => toast.success('Guardado')}>ok</button>
      <button onClick={() => toast.error('Falhou')}>erro</button>
    </>
  )
}

describe('ToastProvider', () => {
  it.each([
    ['ok', 'success', 'Guardado'],
    ['erro', 'error', 'Falhou'],
  ])('entrega o contexto: o clique em %s vira a mensagem %s na tela', async (botao, severidade, detalhe) => {
    render(
      <ToastProvider>
        <Disparador />
      </ToastProvider>,
    )

    await act(async () => {
      fireEvent.click(screen.getByText(botao))
    })

    expect(document.querySelector(`.p-toast-message-${severidade}`)?.textContent).toContain(detalhe)
  })

  it('fora do provider o useToast é no-op e não quebra a tela', async () => {
    render(<Disparador />)

    await act(async () => {
      fireEvent.click(screen.getByText('ok'))
    })

    expect(document.querySelector('.p-toast-message')).toBeNull()
  })
})
