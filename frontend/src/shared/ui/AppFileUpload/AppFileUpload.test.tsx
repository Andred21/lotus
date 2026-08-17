import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { AppFileUpload } from './AppFileUpload'

afterEach(cleanup)

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
