import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(__dirname, '..')

/**
 * As dimensões que o `AppLogo` declara no `<img>` (D-10, audit de 2026-11-26)
 * têm de ser as do PNG: um número velho depois de trocar o logo reservaria a
 * caixa com a razão de aspecto errada, e o salto voltaria deformado. Lê o
 * cabeçalho do arquivo (IHDR: largura em 16, altura em 20) e o literal do
 * componente.
 */
describe('dimensões do logo == dimensões do PNG', () => {
  const fonte = readFileSync(resolve(root, 'src/shared/ui/AppLogo/AppLogo.tsx'), 'utf8')

  it.each([
    ['LogoLight', 'light'],
    ['LogoDark', 'dark'],
    ['LogoGlyph', 'glyph'],
  ])('%s', (arquivo, chave) => {
    const declarado = new RegExp(`${chave}: \\{ src: \\w+, width: (\\d+), height: (\\d+) \\}`).exec(fonte)
    expect(declarado, `AppLogo.tsx não declara ${chave}`).not.toBeNull()

    const png = readFileSync(resolve(root, `src/assets/${arquivo}.png`))
    expect([Number(declarado![1]), Number(declarado![2])]).toEqual([png.readUInt32BE(16), png.readUInt32BE(20)])
  })
})
