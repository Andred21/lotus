import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { resolve, join, relative } from 'node:path'

const root = resolve(__dirname, '..')
const fonte = (caminho: string) => readFileSync(resolve(root, caminho), 'utf8')

const temaClaro = fonte('src/shared/styles/themes/lara-light-lotus.css')
const temaEscuro = fonte('src/shared/styles/themes/lara-dark-lotus.css')
const camadaDeMarca = fonte('src/shared/styles/brand-theme.css')

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

/** Ângulo de matiz em graus. É o que mede "distinguíveis entre si" (D2) sem
 * depender de olho: duas séries no MESMO gráfico não podem ser dois degraus do
 * mesmo hue, que foi a alternativa rejeitada na própria decisão. */
function matiz(h: string): number {
  const [r, g, b] = rgb(h).map((v) => v / 255)
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  if (max === min) return 0
  const d = max - min
  const bruto =
    max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return (bruto * 60 + 360) % 360
}

const distanciaDeMatiz = (a: number, b: number) => {
  const bruta = Math.abs(a - b) % 360
  return bruta > 180 ? 360 - bruta : bruta
}

// Mesmo recorte do irmão `tone-ink.test.ts`: `[^}]*` para no primeiro `}`, e
// nenhum dos dois blocos tem chave interna — nem hoje, nem depois do
// `--chart-*`, que é declaração simples.
const blocoClaro = camadaDeMarca.match(/^html:not\(\.dark\)\s*\{([^}]*)\}/m)?.[1] ?? ''
const blocoRaiz = camadaDeMarca.match(/^:root\s*\{([^}]*)\}/m)?.[1] ?? ''

const NOMES = ['--chart-1', '--chart-2', '--chart-3', '--chart-4', '--chart-5']

/** As 5 tintas como o CSS as resolve: o bloco da camada de marca diz qual
 * DEGRAU vale no tema, e a folha do tema diz quanto vale o degrau. */
function tintasDe(bloco: string, tema: string) {
  return NOMES.map((nome) => {
    const degrau = bloco.match(new RegExp(`${nome}:\\s*var\\((--[a-z]+-\\d+)\\)`))?.[1] ?? ''
    return { nome, degrau, tinta: hex(tema, `\\${degrau}`) }
  })
}

/**
 * D2 da spec do B2. As 5 cores de série são categóricas — não carregam
 * severidade — e por isso NÃO podem sair dos hues dos `--tone-*-ink`
 * (blue/green/yellow/red): `certificados_emitidos` em vermelho diria "perigo"
 * na mesma tela onde alerta e série convivem.
 *
 * O piso é 3:1 e não 4,5:1 porque traço de gráfico é ELEMENTO GRÁFICO, não
 * texto — a tese do passe de 2026-08-17, a mesma que o `--focus-stroke` usa.
 */
describe('paleta de série sobre superfície de card (D2)', () => {
  describe.each([
    { tema: 'claro', bloco: blocoClaro, folha: temaClaro },
    { tema: 'escuro', bloco: blocoRaiz, folha: temaEscuro },
  ])('tema $tema', ({ bloco, folha }) => {
    const card = hex(folha, '--surface-card')

    it.each(tintasDe(bloco, folha))(
      '$nome aponta para um degrau de hue NÃO-semântico e passa 3:1 de elemento gráfico',
      ({ degrau, tinta }) => {
        expect(degrau).toMatch(/^--(teal|orange|purple|pink|indigo)-\d00$/)
        expect(contraste(tinta, card)).toBeGreaterThanOrEqual(3)
      },
    )

    it('as 5 são distinguíveis entre si: nenhum par a menos de 30° de matiz', () => {
      const tintas = tintasDe(bloco, folha)
      for (let i = 0; i < tintas.length; i++) {
        for (let j = i + 1; j < tintas.length; j++) {
          expect(distanciaDeMatiz(matiz(tintas[i].tinta), matiz(tintas[j].tinta))).toBeGreaterThanOrEqual(30)
        }
      }
    })
  })

  /** O controle que faz o teste discriminar: reusar o token de tom era a
   * alternativa rejeitada da D2, e `--yellow-400` (a tinta de aviso no escuro)
   * fica a 21° do laranja da paleta — indistinguível num traço de 2px, além de
   * carregar sinal. Uma "simplificação" que voltasse a ela cairia aqui. */
  it('o amarelo do tom de aviso está perto demais do laranja da paleta para ser série', () => {
    const aviso = hex(temaEscuro, '--yellow-400')
    const laranja = hex(temaEscuro, '--orange-400')
    expect(distanciaDeMatiz(matiz(aviso), matiz(laranja))).toBeLessThan(30)
  })
})

/**
 * Catraca da D11: a paleta tem UM dono. O call-site passa índice de série, nunca
 * o nome do token — é o que compensa a cegueira medida da P-36, em que
 * `COR_HARDCODED` só enxerga `className` e um hex dentro de objeto de
 * configuração de gráfico passaria em silêncio.
 */
describe('catraca: quem pode nomear --chart-N (D11)', () => {
  const PERMITIDOS = ['src/shared/styles/brand-theme.css', 'src/shared/styles/tokens.ts']

  function arquivos(dir: string): string[] {
    return readdirSync(dir).flatMap((nome) => {
      const caminho = join(dir, nome)
      if (statSync(caminho).isDirectory()) return arquivos(caminho)
      return /\.(ts|tsx|css)$/.test(nome) ? [caminho] : []
    })
  }

  it('só a camada de marca e tokens.ts escrevem o nome do token', () => {
    const infratores = arquivos(resolve(root, 'src'))
      .filter((caminho) => readFileSync(caminho, 'utf8').includes('--chart-'))
      .map((caminho) => relative(root, caminho).split('\\').join('/'))

    expect(infratores.sort()).toEqual(PERMITIDOS)
  })
})
