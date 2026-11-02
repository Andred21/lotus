import { fireEvent, screen } from '@testing-library/react'
import type { Raster } from '@shared/lib/signature'

/** Raster com um traço largo o bastante para passar do mínimo do servidor. A
 * limpeza em canvas não roda no jsdom: o teste mocka `canvasBridge` e o resto do
 * fluxo (slot, prévia, hook) é real. */
export function raster(): Raster {
  const width = 1000
  const height = 100
  const data = new Uint8ClampedArray(width * height * 4).fill(255)
  for (let y = 40; y < 60; y++) {
    for (let x = 100; x < 800; x++) data.set([0, 0, 0, 255], (y * width + x) * 4)
  }
  return { width, height, data }
}

/** Escolhe uma foto pelo disparador do slot e espera a prévia limpa. */
export async function escolherImagem(container: HTMLElement) {
  const input = container.querySelector('input[type="file"]') as HTMLInputElement
  fireEvent.change(input, { target: { files: [new File(['jpg'], 'foto.jpg', { type: 'image/jpeg' })] } })
  await screen.findByRole('img', { name: 'signature.previewAlt' })
}

/** Nomes acessíveis dos botões só-ícone, na ordem do DOM. */
export const nomesDosIcones = () =>
  screen.getAllByRole('button').map((b) => b.getAttribute('aria-label')).filter(Boolean)
