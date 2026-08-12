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
  TINTA_CLARA,
} from '../scripts/generate-brand-theme.mjs'

const root = resolve(__dirname, '..')
const stock = (name: string) =>
  readFileSync(resolve(root, `node_modules/primereact/resources/themes/${name}/theme.css`), 'utf8')
const committed = (name: string) =>
  readFileSync(resolve(root, `src/shared/styles/themes/${name}.css`), 'utf8')

// A tinta é argumento só do claro: no escuro o celeste de primeiro plano pousa
// em superfície escura e mede 6,76:1 (achado 3 do checkpoint).
const light = () => transform(stock('lara-light-blue'), LIGHT_MAP, TINTA_CLARA)
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

  /**
   * Um azul sobreviveu à Task 2 por quatro dias e nenhuma guarda o viu: o
   * `#dbeafe` estava mapeado pela forma HEX, que o Lara nunca escreve — ele só
   * aparece como `rgba(219, 234, 254, 0.7)`, o fundo das três mensagens `info`.
   * A guarda de hex passava porque o hex de fato não estava lá. Esta confere a
   * forma rgba de TODA a família azul, que é como o buraco se fecha de vez.
   */
  it('nenhum azul do Lara sobrevive na forma rgba (o buraco da guarda de hex)', () => {
    const rgbDoHex = (hex: string) =>
      'rgba(' + [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(', ')

    for (const [nome, css, azuis] of [
      ['light', light(), AZUIS_LIGHT],
      ['dark', dark(), AZUIS_DARK],
    ] as const) {
      const sobreviventes = azuis.filter((hex) => css.includes(rgbDoHex(hex)))
      expect(`${nome}: ${sobreviventes.join(', ')}`).toBe(`${nome}: `)
    }
  })

  /**
   * Achado 3 do checkpoint (decisão do João, 2026-08-12). No tema claro não
   * existe superfície escura, então celeste como `color:` é sempre celeste
   * sobre claro — 2,77:1 no branco, 2,53:1 no humo, abaixo até do 3:1 de
   * elemento gráfico. A tinta é o degrau 700 (5,88:1 no branco).
   *
   * As três asserções juntas são o ponto: a cor de TEXTO sai, o TOKEN da marca
   * fica e o PREENCHIMENTO fica. Sem as duas últimas, "zerar o celeste" seria
   * satisfeito por um tema sem marca nenhuma.
   */
  it('celeste não é cor de primeiro plano no claro, mas segue token e preenchimento (achado 3)', () => {
    const css = light()
    const primeiroPlano = /(?<![-\w])color:\s*#25a5e4\b/gi

    expect(`primeiro plano celeste: ${css.match(primeiroPlano)?.length ?? 0}`).toBe(
      'primeiro plano celeste: 0',
    )
    expect(css).toContain(`--primary-color: ${CELESTE}`)
    expect(css).toContain(`background: ${CELESTE}`)
    expect(css).toContain(TINTA_CLARA)
  })

  /**
   * A tinta é do claro. No escuro o celeste pousa em superfície escura (6,76:1)
   * e fica.
   *
   * A asserção é sobre a DECLARAÇÃO, não sobre o valor: `#186b94` é o degrau
   * 700 da rampa e existe legitimamente nos dois temas como `--primary-700` /
   * `--blue-700` (o DARK_MAP carrega a escala do light). Procurar o hex solto
   * reprovaria o dark correto — foi o que esta asserção fez na primeira escrita.
   */
  it('o escuro mantém celeste como primeiro plano e não recebe a tinta', () => {
    const css = dark()

    expect(/(?<![-\w])color:\s*#25a5e4\b/i.test(css)).toBe(true)
    expect(`tinta como cor no dark: ${css.match(/(?<![-\w])color:\s*#186b94\b/gi)?.length ?? 0}`)
      .toBe('tinta como cor no dark: 0')
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
