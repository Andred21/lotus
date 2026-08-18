import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { act, cleanup, render } from '@testing-library/react'
import i18n from '@shared/config/i18n'
import { AppFilePreviewDialog } from './AppFilePreviewDialog'

beforeAll(async () => {
  await i18n.changeLanguage('es-CL')
})

afterEach(cleanup)

const pdf = {
  original_name: 'reuf-juan-morales.pdf',
  mime: 'application/pdf',
  size: 1024,
  download_url: 'http://localhost:9000/lotus/reuf.pdf?assinada=1',
}

function abrir() {
  render(<AppFilePreviewDialog file={pdf} visible onHide={() => {}} />)
  const container = document.querySelector<HTMLDivElement>('.p-dialog-content div[tabindex="-1"]')
  const iframe = document.querySelector('iframe')
  if (!container || !iframe) throw new Error('visor nao montou')
  return { container, iframe }
}

// O tick do `setTimeout(0)` da devolução: o handler lê `activeElement` no tick
// SEGUINTE ao blur, porque no próprio blur o foco ainda não pousou.
const proximoTick = () => act(async () => { await new Promise(r => setTimeout(r, 0)) })

describe('AppFilePreviewDialog', () => {
  it('poe o foco num contêiner PRÓPRIO, e nao no primeiro focavel', () => {
    // D-25: o `focusOnShow` do Prime foca o primeiro elemento FOCÁVEL, que no
    // caminho do PDF é o `<iframe>`, e com foco lá dentro o Escape morre no
    // visor nativo do Chrome — o handler do diálogo escuta no documento
    // hospedeiro e nunca recebe a tecla. O contêiner é `tabIndex={-1}`: focável
    // por código, invisível ao Tab, e o keydown dele sobe até o documento.
    const { container, iframe } = abrir()

    expect(container.contains(iframe)).toBe(true)
    expect(container.tabIndex).toBe(-1)
  })

  it('devolve o foco UMA vez quando o visor o toma sozinho', async () => {
    // Medido no gate do BD-16, sonda de 100 em 100ms: sem clique nenhum, o visor
    // nativo toma o foco ~200ms depois de abrir. A devolução é no `blur` que
    // aponta para o iframe, e o `relatedTarget` não serve de sinal — a URL é
    // pré-assinada, de outra origem, e o Chrome entrega nulo.
    const { container, iframe } = abrir()
    container.focus()

    iframe.focus()
    expect(document.activeElement).toBe(iframe)
    await proximoTick()

    expect(document.activeElement).toBe(container)
  })

  it('nao expulsa quem ENTRA no visor de proposito', async () => {
    // A trava de uma devolução por abertura é o que separa devolver de PRENDER:
    // depois dela, quem chega ao iframe por Tab ou clique fica nele, e é daí em
    // diante que o Escape passa a ser do navegador (o `X` continua fechando).
    const { container, iframe } = abrir()
    container.focus()

    iframe.focus()
    await proximoTick()
    expect(document.activeElement).toBe(container)

    iframe.focus()
    await proximoTick()
    expect(document.activeElement).toBe(iframe)
  })
})
