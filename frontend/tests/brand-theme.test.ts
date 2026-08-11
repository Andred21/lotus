import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  transform,
  LIGHT_MAP,
  DARK_MAP,
  AZUIS_LIGHT,
  AZUIS_DARK,
  CELESTE,
  AZUL_POSTE,
} from '../scripts/generate-brand-theme.mjs'

const root = resolve(__dirname, '..')
const stock = (name: string) =>
  readFileSync(resolve(root, `node_modules/primereact/resources/themes/${name}/theme.css`), 'utf8')
const committed = (name: string) =>
  readFileSync(resolve(root, `src/shared/styles/themes/${name}.css`), 'utf8')

const light = () => transform(stock('lara-light-blue'), LIGHT_MAP)
const dark = () => transform(stock('lara-dark-blue'), DARK_MAP)

/**
 * O tema commitado deve ser exatamente uma geração fresca sobre o Lara
 * instalado — pega edição à mão E upgrade do primereact sem re-rodar o script.
 */
describe("temas Lara-Lotus gerados (spec D5')", () => {
  it('light commitado == geração fresca', () => {
    expect(committed('lara-light-lotus')).toBe(light())
  })

  it('dark commitado == geração fresca', () => {
    expect(committed('lara-dark-lotus')).toBe(dark())
  })

  /**
   * D-P6: a guarda assere a ausência da FAMÍLIA azul medida no Lara, não de
   * três hexes escolhidos a dedo. O rascunho do plano conferia `#3b82f6`,
   * `#1d4ed8` e `#60a5fa` — e deixava passar `#9dc1fb` (anel de foco),
   * `#f5f9ff`/`#d0e1fd`/`#abc9fb`/`#85b2f9` (escala do Lara) e as veladuras
   * `rgba(...)`. A fonte da lista é o próprio mapa, então um azul novo que
   * entre num upgrade só passa despercebido se ninguém o tiver mapeado — e aí
   * o teste de igualdade acima já reprova.
   */
  it('nenhum azul do Lara sobrevive em nenhum dos dois temas', () => {
    for (const [nome, css, azuis] of [
      ['light', light(), AZUIS_LIGHT],
      ['dark', dark(), AZUIS_DARK],
    ] as const) {
      const sobreviventes = azuis.filter((hex) => css.toLowerCase().includes(hex))
      expect(`${nome}: ${sobreviventes.join(', ')}`).toBe(`${nome}: `)
    }
  })

  it('as veladuras rgba da primária também viram celeste', () => {
    expect(light()).not.toContain('rgba(59, 130, 246')
    expect(dark()).not.toContain('rgba(96, 165, 250')
    expect(dark()).not.toContain('rgba(59, 130, 246')
  })

  /** D-P5: a spec §4 promete escala celeste — a `--primary-*` é parte dela. */
  it('a escala --primary-* é celeste nos dois temas', () => {
    expect(light()).toContain(`--primary-500:${CELESTE}`)
    expect(dark()).toContain(`--primary-500:${CELESTE}`)
  })

  /**
   * Degrau repetido é defeito latente: `bg-primary-400` e `bg-primary-500`
   * renderizariam igual. Aconteceu de verdade na primeira geração — a
   * luminância do celeste cai ENTRE os degraus 400 e 500 do Lara, então
   * re-ancorar a escala por luminância colapsava os dois. Por isso a escala
   * nomeada é rampa de degraus fixos, e não re-ancoramento.
   */
  it('as escalas nomeadas têm 10 degraus distintos e monótonos', () => {
    const claridade = (h: string) =>
      [1, 3, 5].reduce((s, i) => s + parseInt(h.slice(i, i + 2), 16), 0)

    for (const [nome, css] of [
      ['light', light()],
      ['dark', dark()],
    ] as const) {
      for (const familia of ['primary', 'blue']) {
        const degraus = [...css.matchAll(new RegExp(`--${familia}-(\\d+):(#[0-9a-f]{6})`, 'gi'))]
          .map((m) => [Number(m[1]), m[2].toLowerCase()] as const)
          .sort((a, b) => a[0] - b[0])
        const cores = degraus.map(([, hex]) => hex)

        expect(`${nome}/${familia}: ${cores.length}`).toBe(`${nome}/${familia}: 10`)
        expect(`${nome}/${familia}: ${new Set(cores).size}`).toBe(`${nome}/${familia}: 10`)
        // 50 é o mais claro e 900 o mais escuro, sem inversão no meio
        const claridades = cores.map(claridade)
        expect(`${nome}/${familia}: ${[...claridades].sort((a, b) => b - a).join()}`).toBe(
          `${nome}/${familia}: ${claridades.join()}`,
        )
      }
    }
  })

  /**
   * O token que DECLARA "texto sobre a primária". A regra de bloco da D-P8 não
   * o alcança (ele mora no `:root`, que não pinta fundo nenhum), e deixá-lo
   * branco seria a D6 contradita dentro do próprio arquivo que a implementa.
   */
  it('--primary-color-text é azul-poste nos dois temas (D6)', () => {
    expect(light()).toContain(`--primary-color-text: ${AZUL_POSTE}`)
    expect(dark()).toContain(`--primary-color-text: ${AZUL_POSTE}`)
  })

  /** Spec §4: os tokens nomeados existem de fato no tema gerado. */
  it('os tokens da paleta chegam ao arquivo', () => {
    expect(light()).toContain(CELESTE)
    expect(light()).toContain('#334155') // grafite — corpo no claro
    expect(dark()).toContain(CELESTE)
    expect(dark()).toContain('#0b1220') // noche — fundo dark
    expect(dark()).toContain(AZUL_POSTE) // --primary-color-text (D-P7)
  })

  /** D7. O `--border-radius: 6px` cai junto, por ser a mesma substring. */
  it('o radius global é 4px', () => {
    expect(light()).not.toContain('border-radius: 6px')
    expect(dark()).not.toContain('border-radius: 6px')
    expect(light()).toContain('--border-radius: 4px')
  })

  /**
   * D-P4: sem isto o tema gerado declara uma face "Inter" apontando para
   * `./fonts/InterVariable.woff2` — que não existe ao lado do arquivo gerado —
   * e o build QUEBRA. A Inter real vem do @fontsource (Task 1).
   */
  it('não sobra @font-face nem referência a asset (D-P4)', () => {
    for (const css of [light(), dark()]) {
      expect(css).not.toContain('@font-face')
      expect(css).not.toContain('url(')
      expect(css).not.toContain('Inter var')
    }
    // o :root continua nomeando a família — é ele que dá Inter ao corpo
    expect(light()).toContain('--font-family: "Inter", sans-serif')
  })

  /**
   * D-P8 (decisão do João): branco sobre celeste mede 2,77:1 e reprova AA
   * (4,5:1) e até o limiar de 3:1 de elemento gráfico. Azul-poste sobre
   * celeste mede 5,29:1. A regra é do TEMA, não do `brand-theme.css`.
   */
  it('nenhum texto branco pousa sobre a primária no light (D-P8)', () => {
    const blocos = [...light().matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    const infratores = blocos
      .filter(([, , corpo]) => new RegExp(`background(-color)?:\\s*${CELESTE}`, 'i').test(corpo))
      .filter(([, , corpo]) => /(?:^|[;\s])color:\s*#(?:ffffff|fff)\s*;/i.test(corpo))
      .map(([, sel]) => sel.trim().replace(/\s+/g, ' '))

    expect(infratores).toEqual([])
  })

  /**
   * D-P10: o ícone/rótulo herda o fundo do ancestral, então a regra "mesmo
   * bloco" não o alcança — medido no Lara instalado, sete declarações ficavam
   * brancas sobre celeste (check do checkbox, ponto do radio, ícones de
   * select/togglebutton e o label da progressbar).
   */
  it('ícone e rótulo que pousam na primária por herança também viram navy (D-P10)', () => {
    const css = light()
    for (const seletor of [
      '.p-checkbox .p-checkbox-box .p-checkbox-icon',
      '.p-radiobutton .p-radiobutton-box .p-radiobutton-icon',
      '.p-progressbar .p-progressbar-label',
    ]) {
      const bloco = css.split(seletor + ' {')[1]?.split('}')[0] ?? ''
      expect(`${seletor}: ${bloco}`).toContain(AZUL_POSTE)
    }
  })

  /** O botão primário é o caso que a D6 nomeia desde a spec. */
  it('o botão e a tag primários levam texto azul-poste no light (D6)', () => {
    const css = light()
    for (const seletor of ['.p-button', '.p-tag']) {
      const bloco = css.split('\n  ' + seletor + ' {')[1]?.split('}')[0] ?? ''
      expect(bloco).toContain(`background: ${CELESTE}`)
      expect(bloco).toContain(`color: ${AZUL_POSTE}`)
    }
  })

  /** O dark já vinha com texto escuro sobre a primária — a D-P8 é no-op lá. */
  it('o dark não tem o par branco-sobre-primária', () => {
    const infratores = [...dark().matchAll(/([^{}]+)\{([^{}]*)\}/g)]
      .filter(([, , corpo]) => new RegExp(`background(-color)?:\\s*${CELESTE}`, 'i').test(corpo))
      .filter(([, , corpo]) => /(?:^|[;\s])color:\s*#(?:ffffff|fff)\s*;/i.test(corpo))

    expect(infratores).toEqual([])
  })
})
