import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { AppFileActions } from './AppFileActions'

const arquivo = {
  original_name: 'reuf-juan.pdf',
  download_url: 'https://minio.local/reuf-juan.pdf?X-Amz-Signature=abc',
}

/**
 * UI-05 do review de 2026-08-18. `<a><AppButton/></a>` rendia DUAS paradas de
 * Tab por ação de baixar, e a primeira — o `<a>` — não tinha nome acessível: na
 * seção de documentos do `/perfil` eram 6 paradas para 3 ações, metade delas
 * anunciando só "link". `<a>` não pode conter conteúdo interativo, então a
 * correção foi tirar um dos dois, não arrumar o `tabIndex`.
 *
 * O teste prende as duas metades: a ausência do `<a>` (a parada muda) e a
 * presença do gesto que ele fazia (a nova aba), porque tirar o link sem repor a
 * navegação seria trocar um defeito de foco por um botão que não baixa.
 */
describe('AppFileActions — baixar é UM controle, com nome (UI-05)', () => {
  it('não embrulha o botão num `<a>`, e o botão se anuncia', () => {
    const { container } = render(<AppFileActions file={arquivo} onPreview={() => {}} />)

    expect(container.querySelectorAll('a')).toHaveLength(0)
    expect(screen.getByRole('button', { name: 'common.download' })).toBeTruthy()
  })

  it('abre a URL pré-assinada em aba nova, pelo mesmo gesto que o `target="_blank"` usava', () => {
    const abrir = vi.spyOn(window, 'open').mockImplementation(() => null)
    render(<AppFileActions file={arquivo} onPreview={() => {}} />)

    fireEvent.click(screen.getByRole('button', { name: 'common.download' }))

    expect(abrir).toHaveBeenCalledWith(arquivo.download_url, '_blank', 'noopener,noreferrer')
    abrir.mockRestore()
  })
})

/**
 * Bloco 47 (decisão do João, 2026-11-01): todo excluir de arquivo confirma
 * antes. O CV do redator excluía direto, e arquivo de peso legal some sem volta.
 * A confirmação mora aqui, e não nas telas, para valer para todos os consumidores.
 */
describe('AppFileActions — excluir confirma sempre', () => {
  const lixeira = () => screen.getByRole('button', { name: 'common.delete' })
  const noDialogo = () => within(screen.getByRole('dialog'))

  it('clicar na lixeira abre o diálogo e NÃO chama onRemove', () => {
    const onRemove = vi.fn()
    render(<AppFileActions file={arquivo} onPreview={() => {}} onRemove={onRemove} />)

    fireEvent.click(lixeira())

    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(onRemove).not.toHaveBeenCalled()
  })

  it('cancelar fecha sem excluir', async () => {
    const onRemove = vi.fn()
    render(<AppFileActions file={arquivo} onPreview={() => {}} onRemove={onRemove} />)
    fireEvent.click(lixeira())

    fireEvent.click(noDialogo().getByRole('button', { name: 'common.cancel' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(onRemove).not.toHaveBeenCalled()
  })

  it('confirmar chama onRemove uma vez', () => {
    const onRemove = vi.fn()
    render(<AppFileActions file={arquivo} onPreview={() => {}} onRemove={onRemove} />)
    fireEvent.click(lixeira())

    fireEvent.click(noDialogo().getByRole('button', { name: 'common.delete' }))

    expect(onRemove).toHaveBeenCalledTimes(1)
  })

  it('onRemove síncrono fecha o diálogo no ato', async () => {
    render(<AppFileActions file={arquivo} onPreview={() => {}} onRemove={() => {}} />)
    fireEvent.click(lixeira())

    fireEvent.click(noDialogo().getByRole('button', { name: 'common.delete' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('com Promise o diálogo fica aberto até ela resolver', async () => {
    let resolver: () => void = () => {}
    const onRemove = vi.fn(() => new Promise<void>((r) => { resolver = r }))
    render(<AppFileActions file={arquivo} onPreview={() => {}} onRemove={onRemove} />)
    fireEvent.click(lixeira())

    fireEvent.click(noDialogo().getByRole('button', { name: 'common.delete' }))
    expect(screen.getByRole('dialog')).toBeTruthy()

    resolver()
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('Promise rejeitada deixa o diálogo aberto mostrando removeError', async () => {
    const onRemove = vi.fn(() => Promise.reject(new Error('403')))
    render(
      <AppFileActions file={arquivo} onPreview={() => {}} onRemove={onRemove} removeError="Sem permissão" />,
    )
    fireEvent.click(lixeira())
    expect(screen.queryByText('Sem permissão')).toBeNull()

    fireEvent.click(noDialogo().getByRole('button', { name: 'common.delete' }))

    expect(await screen.findByText('Sem permissão')).toBeTruthy()
    expect(screen.getByRole('dialog')).toBeTruthy()
  })

  it('usa os textos da tela quando ela os passa', () => {
    render(
      <AppFileActions
        file={arquivo}
        onPreview={() => {}}
        onRemove={() => {}}
        removeLabel="Quitar"
        confirmTitle="Título da tela"
        confirmMessage="Mensagem da tela"
        confirmLabel="Sim, quitar"
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Quitar' }))

    expect(screen.getByText('Título da tela')).toBeTruthy()
    expect(screen.getByText('Mensagem da tela')).toBeTruthy()
    expect(noDialogo().getByRole('button', { name: 'Sim, quitar' })).toBeTruthy()
  })

  it('sem textos da tela, o diálogo usa os padrões do common', () => {
    render(<AppFileActions file={arquivo} onPreview={() => {}} onRemove={() => {}} />)
    fireEvent.click(lixeira())

    expect(screen.getByText('common.deleteFileTitle')).toBeTruthy()
    expect(screen.getByText('common.deleteFileMessage')).toBeTruthy()
  })
})

describe('AppFileActions — todo botão mostra dica à esquerda com o texto do aria-label', () => {
  it.each([
    ['common.preview'],
    ['common.download'],
    ['common.delete'],
  ])('%s', async (rotulo) => {
    render(<AppFileActions file={arquivo} onPreview={() => {}} onRemove={() => {}} />)

    fireEvent.mouseEnter(screen.getByRole('button', { name: rotulo }))

    const dica = await waitFor(() => {
      const el = document.querySelector<HTMLElement>('.p-tooltip')
      expect(el).not.toBeNull()
      return el!
    })
    expect(dica.textContent).toBe(rotulo)
    expect(dica.className).toContain('p-tooltip-left')
  })
})
