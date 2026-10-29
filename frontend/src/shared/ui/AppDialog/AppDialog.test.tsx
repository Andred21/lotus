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
    render(<AppDialog size="lg" visible header="Nuevo cliente" onHide={() => {}} />)

    expect(screen.getByRole('button', { name: 'Cerrar' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Maximizar diálogo' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Close' })).toBeNull()
  })

  it('o pt do chamador sobrevive ao pin do wrapper', () => {
    // mergePt funde chave a chave: quem customiza o botao de fechar nao apaga o
    // nome acessivel, e o pin nao apaga a customizacao dele.
    render(
      <AppDialog
        size="lg"
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

/** Bloco 43, spec §4.1: o tamanho decide o teto de largura e se maximiza. */
describe('AppDialog — tamanho', () => {
  it.each([
    ['sm', 'max-w-[32rem]'],
    ['md', 'max-w-[48rem]'],
    ['lg', 'max-w-[64rem]'],
  ] as const)('%s crava o teto %s e a moldura navy', (size, teto) => {
    render(<AppDialog size={size} visible header="Diálogo" onHide={() => {}} />)

    const raiz = document.querySelector('.p-dialog')
    expect(raiz?.className).toContain('w-[95vw]')
    expect(raiz?.className).toContain(teto)
    expect(raiz?.className).toContain('lotus-dialog')
  })

  it.each(['sm', 'md'] as const)('%s não maximiza', (size) => {
    render(<AppDialog size={size} visible header="Diálogo" onHide={() => {}} />)

    expect(document.querySelector('.p-dialog-header-maximize')).toBeNull()
    expect(screen.getByRole('button', { name: 'Cerrar' })).toBeTruthy()
  })

  it('lg maximiza', () => {
    render(<AppDialog size="lg" visible header="Diálogo" onHide={() => {}} />)

    expect(screen.getByRole('button', { name: 'Maximizar diálogo' })).toBeTruthy()
  })

  it('o lg maximizado não fica preso ao teto', () => {
    render(<AppDialog size="lg" visible header="Diálogo" onHide={() => {}} />)

    expect(document.querySelector('.p-dialog')?.className).toContain('[&.p-dialog-maximized]:max-w-none')
  })

  it('o footer navy tem respiro em cima e embaixo', () => {
    render(<AppDialog size="md" visible header="Diálogo" footer={<span>rodapé</span>} onHide={() => {}} />)

    expect(document.querySelector('.p-dialog-footer')?.className).toContain('py-3')
  })

  it('o chamador não religa o maximizar fora do lg', () => {
    // @ts-expect-error -- `maximizable` saiu do tipo: quem decide é o tamanho.
    render(<AppDialog size="sm" maximizable visible header="Diálogo" onHide={() => {}} />)

    expect(document.querySelector('.p-dialog-header-maximize')).toBeNull()
  })
})
