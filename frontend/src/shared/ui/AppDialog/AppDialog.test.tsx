import { beforeAll, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import i18n from '@shared/config/i18n'
import { AppDialog } from './AppDialog'

// O idioma da INTERFACE, nao o do runtime: em jsdom o detector resolve pelo
// `navigator.language` (en-US), e o defeito medido no gate do BD-16 e
// justamente um rotulo ingles aparecendo numa interface em espanhol.
beforeAll(async () => {
  await i18n.changeLanguage('es-CL')
})

describe('AppDialog', () => {
  it('os DOIS botoes do cabecalho se anunciam no idioma da interface', () => {
    // O de maximizar ja tinha nome traduzido; o de FECHAR caia no
    // `localeOption('close')` do Prime (`dialog.cjs.js:835`), isto e "Close",
    // em todo dialogo da aplicacao.
    render(<AppDialog visible header="Nuevo cliente" onHide={() => {}} />)

    expect(screen.getByRole('button', { name: 'Cerrar' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Maximizar diálogo' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Close' })).toBeNull()
  })

  it('o pt do chamador sobrevive ao pin do wrapper', () => {
    // mergePt funde chave a chave: quem customiza o botao de fechar nao apaga o
    // nome acessivel, e o pin nao apaga a customizacao dele.
    render(
      <AppDialog
        visible
        header="Nuevo cliente"
        onHide={() => {}}
        pt={{ closeButton: { className: 'marcador-do-chamador' } }}
      />,
    )

    const fechar = screen.getByRole('button', { name: 'Cerrar' })
    expect(fechar.className).toContain('marcador-do-chamador')
  })
})
