import { createRef } from 'react'
import { describe, expect, it } from 'vitest'
import { act, render } from '@testing-library/react'
import { AppToast, type AppToastHandle } from './AppToast'

describe('AppToast — ícones internos', () => {
  const phosphor = (el: Element | null) => {
    const svg = el?.tagName === 'svg' ? el : el?.querySelector('svg')
    expect(svg).not.toBeNull()
    expect(svg?.classList.contains('p-icon')).toBe(false)
  }

  it.each(['success', 'error'] as const)('usa ícone Phosphor na mensagem de %s e no fechar', async (severidade) => {
    const ref = createRef<AppToastHandle>()
    render(<AppToast ref={ref} />)

    await act(async () => {
      ref.current?.[severidade]('Detalhe')
    })

    const mensagem = document.querySelector(`.p-toast-message-${severidade}`)
    expect(mensagem).not.toBeNull()
    phosphor(mensagem?.querySelector('.p-toast-message-icon') ?? null)
    phosphor(mensagem?.querySelector('.p-toast-icon-close') ?? null)
  })
})
