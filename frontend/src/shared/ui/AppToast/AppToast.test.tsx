import { createRef } from 'react'
import { describe, expect, it } from 'vitest'
import { act, render } from '@testing-library/react'
import i18n from '@shared/config/i18n'
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

describe('AppToast — nome do fechar', () => {
  it('o botão de fechar usa common.close traduzido, não o inglês do Prime', async () => {
    await i18n.changeLanguage('es-CL')
    const ref = createRef<AppToastHandle>()
    render(<AppToast ref={ref} />)

    await act(async () => {
      ref.current?.success('Detalhe')
    })

    const fechar = document.querySelector('.p-toast-icon-close')
    expect(fechar?.getAttribute('aria-label')).toBe('Cerrar')
  })
})
