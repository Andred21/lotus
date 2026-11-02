import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { AppPhotoField } from './AppPhotoField'

// `t` devolve a chave: o que se prova é qual texto o campo escolhe.
vi.mock('react-i18next', async (importOriginal) => {
  const { mockUseTranslation } = await import('@shared/testing/i18n')
  return { ...(await importOriginal<typeof import('react-i18next')>()), useTranslation: mockUseTranslation() }
})

const URL_FOTO = 'https://minio.local/foto.jpg?X-Amz-Signature=abc'

const base = { name: 'Juan Pérez', onSelect: () => {}, onRemove: () => {} }

/** Nomes acessíveis, na ORDEM DO DOM: ver, baixar, substituir, excluir. */
const nomesDosBotoes = () => screen.getAllByRole('button').map((b) => b.getAttribute('aria-label'))

describe('AppPhotoField — ações só-ícone', () => {
  it('com foto: ver, baixar, substituir e excluir, nessa ordem', () => {
    render(<AppPhotoField {...base} url={URL_FOTO} />)

    expect(nomesDosBotoes()).toEqual(['common.preview', 'common.download', 'photo.replace', 'photo.remove'])
  })

  it('as ações não carregam rótulo visível, só ícone', () => {
    render(<AppPhotoField {...base} url={URL_FOTO} />)

    for (const nome of ['common.preview', 'photo.replace', 'photo.remove']) {
      expect(screen.getByRole('button', { name: nome }).textContent?.trim()).toBe('')
    }
  })

  it('o substituir mostra dica à esquerda', async () => {
    render(<AppPhotoField {...base} url={URL_FOTO} />)
    const botao = screen.getByRole('button', { name: 'photo.replace' })

    fireEvent.mouseEnter(botao.closest('span.inline-flex')!)

    const dica = await waitFor(() => {
      const el = document.querySelector<HTMLElement>('.p-tooltip')
      expect(el).not.toBeNull()
      return el!
    })
    expect(dica.textContent).toBe('photo.replace')
    expect(dica.className).toContain('p-tooltip-left')
  })

  it('sem foto, só o enviar, com o nome photo.select', () => {
    render(<AppPhotoField {...base} url={null} />)

    expect(nomesDosBotoes()).toEqual(['photo.select'])
  })

  it('só leitura com foto mostra ver e baixar', () => {
    render(<AppPhotoField {...base} url={URL_FOTO} readOnly />)

    expect(nomesDosBotoes()).toEqual(['common.preview', 'common.download'])
  })

  it('só leitura sem foto não mostra botão nenhum', () => {
    render(<AppPhotoField {...base} url={null} readOnly />)

    expect(screen.queryAllByRole('button')).toHaveLength(0)
  })

  it('o substituir fica desabilitado enquanto pende', () => {
    render(<AppPhotoField {...base} url={URL_FOTO} pending />)

    expect(screen.getByRole('button', { name: 'photo.replace' }).getAttribute('aria-disabled')).toBe('true')
  })
})

describe('AppPhotoField — ver e excluir', () => {
  it('ver abre o preview com a imagem da foto', () => {
    render(<AppPhotoField {...base} url={URL_FOTO} />)

    fireEvent.click(screen.getByRole('button', { name: 'common.preview' }))

    const dialogo = screen.getByRole('dialog')
    const img = within(dialogo).getByRole('img')
    expect(img.getAttribute('src')).toBe(URL_FOTO)
    expect(within(dialogo).getAllByText('photo.fileName').length).toBeGreaterThan(0)
  })

  it('excluir confirma antes de chamar onRemove', () => {
    const onRemove = vi.fn()
    render(<AppPhotoField {...base} url={URL_FOTO} onRemove={onRemove} />)

    fireEvent.click(screen.getByRole('button', { name: 'photo.remove' }))
    expect(onRemove).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'common.delete' }))
    expect(onRemove).toHaveBeenCalledTimes(1)
  })
})

describe('AppPhotoField — erro', () => {
  it('mostra a mensagem e o Reintentar quando há onRetry', () => {
    const onRetry = vi.fn()
    render(<AppPhotoField {...base} url={null} error="Falló la subida" onRetry={onRetry} />)

    expect(screen.getByText('Falló la subida')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'common.retry' }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })
})
