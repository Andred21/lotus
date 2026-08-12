import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { gerarGlifo, ORIGEM, DESTINO } from '../scripts/generate-logo-glyph.mjs'

const root = resolve(__dirname, '..')
const asset = (caminho: string) => readFileSync(resolve(root, caminho))

/**
 * O glifo commitado deve ser exatamente um recorte fresco do wordmark
 * versionado — pega edição à mão do PNG E troca do logo sem rodar
 * `pnpm logo-glyph`, que deixaria a sidebar colapsada exibindo a marca velha.
 */
describe('glifo da marca (UI-06 de 2026-08-12)', () => {
  it('o glifo commitado == recorte fresco do wordmark', () => {
    expect(gerarGlifo(asset(ORIGEM)).equals(asset(DESTINO))).toBe(true)
  })

  /**
   * O recorte é do SÍMBOLO, não do wordmark inteiro: se a caixa medida
   * encostasse no bloco de texto, o glifo voltaria a ser um wordmark ilegível
   * no rail de 80px — que é o defeito na outra direção (achado nº 1 do
   * checkpoint de 2026-08-12).
   */
  it('o recorte é o símbolo, não o wordmark inteiro', () => {
    const glifo = gerarGlifo(asset(ORIGEM))
    const [largura, altura] = [glifo.readUInt32BE(16), glifo.readUInt32BE(20)]
    const wordmark = asset(ORIGEM)
    const alturaWordmark = wordmark.readUInt32BE(20)

    // O símbolo ocupa a metade de cima; o texto vive abaixo dele.
    expect(altura).toBeLessThan(alturaWordmark * 0.7)
    // Quase quadrado: é o que permite ao rail exibi-lo sem reduzir a altura.
    expect(largura / altura).toBeGreaterThan(0.6)
    expect(largura / altura).toBeLessThan(1.4)
  })

  /**
   * Um arquivo só para os dois temas — a decisão que dispensa `variant` no
   * `AppLogo` além de `glyph`. Vale enquanto o símbolo for idêntico nos dois
   * assets; se um deles ganhar símbolo próprio, este teste é quem avisa.
   */
  it('o símbolo é o mesmo no wordmark claro e no escuro', () => {
    expect(gerarGlifo(asset('src/assets/LogoLight.png')).equals(gerarGlifo(asset(ORIGEM)))).toBe(
      true,
    )
  })
})
