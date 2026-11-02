import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { AppFileSlot } from './AppFileSlot'

// `t` devolve a chave: o que se prova é qual texto a peça escolhe.
vi.mock('react-i18next', async (importOriginal) => {
  const { mockUseTranslation } = await import('@shared/testing/i18n')
  return { ...(await importOriginal<typeof import('react-i18next')>()), useTranslation: mockUseTranslation() }
})

const arquivo = {
  original_name: 'cv-juan.pdf',
  mime: 'application/pdf',
  size: 2048,
  download_url: 'https://minio.local/cv-juan.pdf?X-Amz-Signature=abc',
}

/** Nomes acessíveis, na ORDEM DO DOM: a ordem ver, baixar, substituir, excluir é
 * o contrato visual da peça (spec do bloco 47, §4.1). */
const nomesDosBotoes = () => screen.getAllByRole('button').map((b) => b.getAttribute('aria-label'))

describe('AppFileSlot — vazio', () => {
  it('mostra "não carregado" e só o enviar, com o nome common.upload', () => {
    render(<AppFileSlot file={null} onPreview={() => {}} onUpload={() => {}} />)

    expect(screen.getByText('common.notLoaded')).toBeTruthy()
    expect(nomesDosBotoes()).toEqual(['common.upload'])
  })

  it('o rótulo da tela vence o padrão', () => {
    render(<AppFileSlot file={null} onPreview={() => {}} onUpload={() => {}} uploadLabel="Subir CV" />)

    expect(nomesDosBotoes()).toEqual(['Subir CV'])
  })

  it('sem onUpload não há enviar (só leitura)', () => {
    render(<AppFileSlot file={undefined} onPreview={() => {}} />)

    expect(screen.getByText('common.notLoaded')).toBeTruthy()
    expect(screen.queryAllByRole('button')).toHaveLength(0)
  })

  it('o disparador só-ícone tem dica traduzida, nunca "Choose"', async () => {
    render(<AppFileSlot file={null} onPreview={() => {}} onUpload={() => {}} />)
    const botao = screen.getByRole('button', { name: 'common.upload' })
    expect(botao.textContent).not.toContain('Choose')

    // O invólucro é o `span` que carrega a dica: o `FileUpload` não tem prop dela.
    fireEvent.mouseEnter(botao.closest('span.inline-flex')!)

    const dica = await waitFor(() => {
      const el = document.querySelector<HTMLElement>('.p-tooltip')
      expect(el).not.toBeNull()
      return el!
    })
    expect(dica.textContent).toBe('common.upload')
    expect(dica.className).toContain('p-tooltip-left')
  })
})

describe('AppFileSlot — com arquivo', () => {
  it('mostra o nome e as quatro ações na ordem ver, baixar, substituir, excluir', () => {
    render(<AppFileSlot file={arquivo} onPreview={() => {}} onUpload={() => {}} onRemove={() => {}} />)

    expect(screen.getByText('cv-juan.pdf')).toBeTruthy()
    expect(nomesDosBotoes()).toEqual(['common.preview', 'common.download', 'common.replace', 'common.delete'])
  })

  it('sem onUpload não há substituir', () => {
    render(<AppFileSlot file={arquivo} onPreview={() => {}} onRemove={() => {}} />)

    expect(nomesDosBotoes()).toEqual(['common.preview', 'common.download', 'common.delete'])
  })

  it('sem onRemove não há lixeira', () => {
    render(<AppFileSlot file={arquivo} onPreview={() => {}} onUpload={() => {}} />)

    expect(nomesDosBotoes()).toEqual(['common.preview', 'common.download', 'common.replace'])
  })

  it('só leitura é ver e baixar', () => {
    render(<AppFileSlot file={arquivo} onPreview={() => {}} />)

    expect(nomesDosBotoes()).toEqual(['common.preview', 'common.download'])
  })

  it('o rótulo de substituir da tela vence o padrão', () => {
    render(<AppFileSlot file={arquivo} onPreview={() => {}} onUpload={() => {}} replaceLabel="Substituir CV" />)

    expect(screen.getByRole('button', { name: 'Substituir CV' })).toBeTruthy()
  })

  it('ver chama onPreview com o arquivo', () => {
    const onPreview = vi.fn()
    render(<AppFileSlot file={arquivo} onPreview={onPreview} />)

    fireEvent.click(screen.getByRole('button', { name: 'common.preview' }))

    expect(onPreview).toHaveBeenCalledWith(arquivo)
  })

  it('excluir confirma antes de chamar onRemove, e repassa os textos da tela', () => {
    const onRemove = vi.fn()
    render(
      <AppFileSlot file={arquivo} onPreview={() => {}} onRemove={onRemove} confirmTitle="Quitar firma" />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'common.delete' }))

    expect(screen.getByText('Quitar firma')).toBeTruthy()
    expect(onRemove).not.toHaveBeenCalled()
  })

  it('o substituir fica desabilitado enquanto sobe', () => {
    render(<AppFileSlot file={arquivo} onPreview={() => {}} onUpload={() => {}} uploading />)

    expect(screen.getByRole('button', { name: 'common.replace' }).getAttribute('aria-disabled')).toBe('true')
  })
})

describe('AppFileSlot — título e corpo extra', () => {
  it('título em texto vira o rótulo do cartão, e o corpo extra vem abaixo da linha', () => {
    render(
      <AppFileSlot title="Currículo" file={arquivo} onPreview={() => {}}>
        <p>Aviso do corpo</p>
      </AppFileSlot>,
    )

    expect(screen.getByText('Currículo')).toBeTruthy()
    expect(screen.getByText('Aviso do corpo')).toBeTruthy()
  })

  it('título pode ser um nó (texto + tag)', () => {
    render(
      <AppFileSlot title={<><span>Currículo</span><span>Vigente</span></>} file={null} onPreview={() => {}} />,
    )

    expect(screen.getByText('Currículo')).toBeTruthy()
    expect(screen.getByText('Vigente')).toBeTruthy()
  })
})

describe('AppFileSlot — arquivo em stage', () => {
  const staged = new File(['x'], 'novo.pdf', { type: 'application/pdf' })

  it('mostra a linha e SÓ o tirar do stage', () => {
    const onUnstage = vi.fn()
    render(<AppFileSlot file={null} staged={staged} onUnstage={onUnstage} onPreview={() => {}} onUpload={() => {}} />)

    expect(screen.getByText('novo.pdf')).toBeTruthy()
    expect(nomesDosBotoes()).toEqual(['common.delete'])
    expect(document.querySelector('.pi-times')).not.toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'common.delete' }))

    expect(onUnstage).toHaveBeenCalledTimes(1)
  })
})

describe('AppFileSlot — teto de tamanho', () => {
  it('repassa onSizeReject ao disparador', () => {
    const onSizeReject = vi.fn()
    const { container } = render(
      <AppFileSlot file={null} onPreview={() => {}} onUpload={() => {}} maxBytes={1} onSizeReject={onSizeReject} />,
    )
    const seletor = container.querySelector<HTMLInputElement>('input[type="file"]')!

    fireEvent.change(seletor, { target: { files: [new File(['abc'], 'grande.pdf', { type: 'application/pdf' })] } })

    expect(onSizeReject).toHaveBeenCalledTimes(1)
  })
})
