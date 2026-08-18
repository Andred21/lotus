import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { AppFileUpload } from './AppFileUpload'

afterEach(cleanup)

/** Conta ativacoes no `<input type="file">`, que e onde TODO caminho de
 * ativacao do modo basico desemboca -- o `choose()` do Prime e o `onClick` do
 * proprio no. */
function espiaOSeletor(container: HTMLElement) {
  const seletor = container.querySelector('input[type="file"]')
  if (!seletor) throw new Error('o seletor de arquivo nao montou')
  const ativacoes = vi.fn()
  seletor.addEventListener('click', ativacoes)
  return ativacoes
}

describe('AppFileUpload', () => {
  it('o disparador se anuncia como BOTAO', () => {
    // D-23: o Prime entrega <span class="p-fileupload-choose" tabindex="0"> com
    // role nulo, recebendo foco na sequencia natural -- e e o controle que
    // substitui documento de peso legal de forma irreversivel.
    render(<AppFileUpload chooseLabel="Reemplazar" />)

    expect(screen.getByRole('button')).toBeTruthy()
  })

  it('o nome acessivel diz DE QUAL documento se trata', () => {
    // Tres slots repetem "Reemplazar"; so o chamador sabe de qual documento.
    render(<AppFileUpload chooseLabel="Reemplazar" accessibleName="Reemplazar currículum" />)

    expect(screen.getByRole('button', { name: 'Reemplazar currículum' })).toBeTruthy()
  })

  it('sem accessibleName o nome continua vindo do rotulo visivel', () => {
    render(<AppFileUpload chooseLabel="Reemplazar" />)

    expect(screen.getByRole('button').getAttribute('aria-label')).toBeNull()
  })

  it('com rotulo VAZIO o botao nao anuncia nem MOSTRA o default ingles do Prime', () => {
    // Tres sitios pedem o disparador so-icone com `chooseLabel=""`, e sem piso o
    // botao anunciava E renderizava "Choose" numa interface em espanhol (gate do
    // BD-16, quatro ocorrencias visiveis no dialogo do redator).
    render(<AppFileUpload chooseLabel="" />)

    const botao = screen.getByRole('button')
    const rotulo = botao.getAttribute('aria-label')
    expect(rotulo).toBeTruthy()
    expect(rotulo).not.toBe('Choose')
    expect(botao.textContent).not.toContain('Choose')
  })

  it('ESPACO ativa o disparador, como em qualquer botao', () => {
    // Q-1 do review de 2026-08-18: o `_onKeyDown` do Prime trata so
    // `Enter`/`NumpadEnter` (`fileupload.cjs.js:615-619`), entao o no se
    // anunciava como botao e ignorava metade das teclas que ativam um -- no
    // controle que substitui documento de peso legal de forma irreversivel.
    const { container } = render(<AppFileUpload chooseLabel="Reemplazar" />)
    const ativacoes = espiaOSeletor(container)

    fireEvent.keyDown(screen.getByRole('button'), { key: ' ', code: 'Space' })

    expect(ativacoes).toHaveBeenCalledTimes(1)
  })

  it('ENTER continua ativando, uma vez so', () => {
    // A outra metade do mesmo achado: o `onKeyDown` do `pt` SOMA ao handler do
    // Prime em vez de substitui-lo, porque o `mergeProps` dele compoe funcao de
    // mesmo nome (`utils.cjs.js:2694-2700`). Se um dia passar a substituir,
    // Enter cai aqui -- e nao no dedo do usuario.
    const { container } = render(<AppFileUpload chooseLabel="Reemplazar" />)
    const ativacoes = espiaOSeletor(container)

    fireEvent.keyDown(screen.getByRole('button'), { key: 'Enter', code: 'Enter' })

    expect(ativacoes).toHaveBeenCalledTimes(1)
  })

  it('desabilitado, o disparador ANUNCIA o estado e nao responde a tecla', () => {
    // `basicButtonProps` mantem `tabIndex: 0` com `disabled` e so acrescenta a
    // classe `p-disabled` (`fileupload.cjs.js:1010-1024`): sem `aria-disabled` o
    // alvo recebe foco, anuncia botao HABILITADO e e inerte. Cinco sitios passam
    // `disabled={uploading}`.
    const { container } = render(<AppFileUpload chooseLabel="Reemplazar" disabled />)
    const ativacoes = espiaOSeletor(container)
    const botao = screen.getByRole('button')

    expect(botao.getAttribute('aria-disabled')).toBe('true')

    fireEvent.keyDown(botao, { key: ' ', code: 'Space' })

    expect(ativacoes).not.toHaveBeenCalled()
  })

  it('habilitado, nao mente dizendo que esta desabilitado', () => {
    render(<AppFileUpload chooseLabel="Reemplazar" />)

    expect(screen.getByRole('button').getAttribute('aria-disabled')).toBeNull()
  })

  it('o pt do chamador sobrevive ao pin do wrapper', () => {
    // mergePt funde chave a chave: quem passa pt.basicButton.className nao perde
    // o role que o wrapper crava, e vice-versa.
    render(
      <AppFileUpload
        chooseLabel="Reemplazar"
        pt={{ basicButton: { className: 'marcador-do-chamador' } }}
      />,
    )

    const botao = screen.getByRole('button')
    expect(botao.className).toContain('marcador-do-chamador')
  })
})
