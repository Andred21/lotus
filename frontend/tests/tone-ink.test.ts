import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(__dirname, '..')
const fonte = (caminho: string) => readFileSync(resolve(root, caminho), 'utf8')

const temaClaro = fonte('src/shared/styles/themes/lara-light-lotus.css')
const temaEscuro = fonte('src/shared/styles/themes/lara-dark-lotus.css')
const camadaDeMarca = fonte('src/shared/styles/brand-theme.css')
const tokens = fonte('src/shared/styles/tokens.ts')

const hex = (css: string, nome: string) =>
  css.match(new RegExp(`${nome}:\\s*(#[0-9a-f]{6})`, 'i'))?.[1].toLowerCase() ?? ''

const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))

const luminancia = (h: string) =>
  rgb(h)
    .map((v) => v / 255)
    .map((s) => (s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4))
    .reduce((soma, canal, i) => soma + [0.2126, 0.7152, 0.0722][i] * canal, 0)

const contraste = (a: string, b: string) => {
  const [claro, escuro] = [luminancia(a), luminancia(b)].sort((x, y) => y - x)
  return (claro + 0.05) / (escuro + 0.05)
}

/** O `AppCard tone` compõe o fundo com `color-mix(hue 8%, --surface-card)`; o
 * `AppTag` usa 15% do mesmo hue. A tinta pousa nele tanto quanto no card puro, e
 * é lá que ela é MAIS fraca — por isso cada tom traz a SUA proporção. */
const tingido = (hue: string, card: string, parte: number) =>
  '#' +
  rgb(hue)
    .map((v, i) => Math.round(v * parte + rgb(card)[i] * (1 - parte)))
    .map((v) => v.toString(16).padStart(2, '0'))
    .join('')

/** O hue e a proporção de fundo de cada tom. `accent` não é severidade — é a
 * modalidade `Online`, que tem hue próprio e nunca entra na escala
 * success/info/warning/danger —, mas a régua é a mesma, e ele entrou aqui
 * quando o BD-16 mediu que era o último sítio da fórmula que os outros quatro
 * já tinham abandonado. */
const TONS = {
  info: { hue: 'blue', parte: 0.08 },
  success: { hue: 'green', parte: 0.08 },
  warning: { hue: 'yellow', parte: 0.08 },
  danger: { hue: 'red', parte: 0.08 },
  accent: { hue: 'purple', parte: 0.15 },
}

/** As tintas como o CSS as resolve: o bloco da camada de marca diz qual DEGRAU
 * vale no tema, e a folha do tema diz quanto vale o degrau. */
function tintasDe(bloco: string, tema: string) {
  return Object.keys(TONS).map((tom) => {
    const degrau = bloco.match(new RegExp(`--tone-${tom}-ink:\\s*var\\((--[a-z]+-\\d+)\\)`))?.[1] ?? ''
    return { tom, degrau, tinta: hex(tema, `\\${degrau}`) }
  })
}

const blocoClaro = camadaDeMarca.match(/^html:not\(\.dark\)\s*\{([^}]*)\}/m)?.[1] ?? ''
const blocoRaiz = camadaDeMarca.match(/^:root\s*\{([^}]*)\}/m)?.[1] ?? ''

/**
 * UI-04 do review de 2026-08-17. O número do KPI em tom de aviso media 2,86:1
 * no tema claro — abaixo até do 3,0:1 de texto grande —, e o rótulo secundário
 * sobre o card tingido ficava em 4,28–4,41:1 nos quatro tons. A causa era a
 * fórmula `color-mix(hue 70%, --text-color)`, cujo docblock afirmava manter
 * contraste "nos dois temas": valia no escuro e não valia no claro.
 *
 * O teste mede a razão em vez de conferir um hex escolhido, como o irmão
 * `brand-ink.test.ts`: um degrau novo da rampa só passa aqui se for legível de
 * fato, e nenhum dos dois temas pode regredir sem cair neste arquivo.
 */
describe('tinta de severidade sobre superfície de card (UI-04)', () => {
  describe.each([
    { tema: 'claro', bloco: blocoClaro, folha: temaClaro },
    { tema: 'escuro', bloco: blocoRaiz, folha: temaEscuro },
  ])('tema $tema', ({ bloco, folha }) => {
    const card = hex(folha, '--surface-card')

    it.each(tintasDe(bloco, folha))(
      'o tom $tom aponta para um degrau da rampa e passa AA em texto normal (4,5:1)',
      ({ degrau, tinta }) => {
        expect(degrau).toMatch(/^--(blue|green|yellow|red|purple)-\d00$/)
        expect(contraste(tinta, card)).toBeGreaterThanOrEqual(4.5)
      },
    )

    it.each(tintasDe(bloco, folha))(
      'o tom $tom continua passando sobre a superfície tingida pelo próprio tom',
      ({ tom, tinta }) => {
        const { hue, parte } = TONS[tom as keyof typeof TONS]
        expect(contraste(tinta, tingido(hex(folha, `--${hue}-500`), card, parte))).toBeGreaterThanOrEqual(4.5)
      },
    )
  })

  /** O controle que faz o teste discriminar: a fórmula antiga é justamente
   * quem reprovava no claro, então uma "correção" que voltasse a ela cairia
   * aqui. 70% de `--yellow-500` com 30% de `--text-color` dá #b3911f, que mede
   * 2,86:1 sobre o card tingido — o número do KPI em aviso. */
  it('a mistura de 70% do hue com a tinta do corpo reprova no claro — é o defeito que o token evita', () => {
    const amarelo = rgb(hex(temaClaro, '--yellow-500'))
    const corpo = rgb(hex(temaClaro, '--text-color'))
    const misturado =
      '#' +
      amarelo
        .map((v, i) => Math.round(v * 0.7 + corpo[i] * 0.3))
        .map((v) => v.toString(16).padStart(2, '0'))
        .join('')

    expect(contraste(misturado, hex(temaClaro, '--surface-card'))).toBeLessThan(3.05)
  })

  it('as tintas de `tokens.ts` leem o token de tom, não uma mistura própria', () => {
    for (const nome of ['dangerText', 'infoText', 'successText', 'warningText', 'accentText']) {
      const linha = tokens.match(new RegExp(`export const ${nome} = (.+)`))?.[1] ?? ''
      expect(linha).toMatch(/^'var\(--tone-\w+-ink\)'$/)
    }
  })
})
