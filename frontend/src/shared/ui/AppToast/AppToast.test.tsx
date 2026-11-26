import { describe, expect, it } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { ToastProvider, useToast } from './AppToast'

function Disparador() {
  const toast = useToast()
  return (
    <>
      <button onClick={() => toast.success('Guardado')}>ok</button>
      <button onClick={() => toast.error('Falhou')}>erro</button>
    </>
  )
}

describe('AppToast — ícones internos', () => {
  const phosphor = (el: Element | null) => {
    const svg = el?.tagName === 'svg' ? el : el?.querySelector('svg')
    expect(svg).not.toBeNull()
    expect(svg?.classList.contains('p-icon')).toBe(false)
  }

  it.each([
    ['ok', 'success'],
    ['erro', 'error'],
  ])('usa ícone Phosphor na mensagem de %s e no fechar', async (botao, severidade) => {
    render(
      <ToastProvider>
        <Disparador />
      </ToastProvider>,
    )

    await act(async () => {
      fireEvent.click(screen.getByText(botao))
    })

    const mensagem = document.querySelector(`.p-toast-message-${severidade}`)
    expect(mensagem).not.toBeNull()
    phosphor(mensagem?.querySelector('.p-toast-message-icon') ?? null)
    phosphor(mensagem?.querySelector('.p-toast-icon-close') ?? null)
  })
})
