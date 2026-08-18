import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { AppFileActions } from './AppFileActions'

afterEach(() => {
  cleanup()
})

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
