import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  transform,
  LIGHT_MAP,
  DARK_MAP,
  AZUIS_LIGHT,
  AZUIS_DARK,
  HERDEIROS,
  CELESTE,
  AZUL_POSTE,
  TINTA_CLARA,
  CINZA_BORDA,
} from '../scripts/generate-brand-theme.mjs'

const root = resolve(__dirname, '..')
const stock = (name: string) =>
  readFileSync(resolve(root, `node_modules/primereact/resources/themes/${name}/theme.css`), 'utf8')
const committed = (name: string) =>
  readFileSync(resolve(root, `src/shared/styles/themes/${name}.css`), 'utf8')
const brand = () => readFileSync(resolve(root, 'src/shared/styles/brand-theme.css'), 'utf8')

// A tinta é argumento só do claro: no escuro o celeste de primeiro plano pousa
// em superfície escura e mede 6,76:1 (achado 3 do checkpoint).
const light = () => transform(stock('lara-light-blue'), LIGHT_MAP, TINTA_CLARA)
const dark = () => transform(stock('lara-dark-blue'), DARK_MAP)

// ── Régua da família azul (Q-6) ─────────────────────────────────────────────
// Serve à guarda de upgrade: precisa dizer "isto é azul da família da primária"
// sobre uma cor que ninguém listou ainda, então é geometria, não lista. Os três
// limiares foram medidos sobre os 171/177 hexes do Lara 10.9.8 instalado, e
// cada um existe para separar uma vizinhança concreta — ver a guarda abaixo.
const CORES = /#([0-9a-f]{6}|[0-9a-f]{3})\b|rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/gi

/** Todo literal de cor de um texto CSS (ou de uma chave do mapa) como RGB. */
function rgbDasCores(texto: string): number[][] {
  const achados: number[][] = []
  for (const m of texto.matchAll(CORES)) {
    if (m[1]) {
      const hex = m[1].length === 3 ? m[1].replace(/./g, (c) => c + c) : m[1]
      achados.push([0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16)))
    } else {
      achados.push([Number(m[2]), Number(m[3]), Number(m[4])])
    }
  }
  return achados
}

function daFamiliaAzul([r, g, b]: number[]): boolean {
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const croma = max - min
  // Croma separa COR de quase-neutro. Os gray/slate escuros do Lara têm
  // saturação HSL alta por artefato de luminância (#111827 marca 39%), e é o
  // croma que os derruba: 22 contra os 35 do #dbeafe, o azul mapeado mais fraco.
  if (croma < 30) return false
  const soma = max + min
  const saturacao = (soma > 255 ? croma / (510 - soma) : croma / soma) * 100
  // O azul mapeado menos saturado é #355b8a (44,5%); o neutro slate mais
  // saturado que passa no croma é #334155 (25,0%). 36 cai na folga.
  if (saturacao < 36) return false
  const matiz =
    60 *
    (max === r
      ? (g - b) / croma + (g < b ? 6 : 0)
      : max === g
        ? (b - r) / croma + 2
        : (r - g) / croma + 4)
  // A família mapeada mede 211,7–224,3. O vizinho cromático mais próximo abaixo
  // é o info/sky (≤204,0) e acima é o indigo (≥238,5): a janela cai na folga dos
  // dois lados, e as severidades ficam intactas de propósito.
  return matiz >= 207 && matiz <= 231
}

const chaveRgb = (rgb: number[]) => rgb.join(',')
const hexDeRgb = (rgb: number[]) => '#' + rgb.map((v) => v.toString(16).padStart(2, '0')).join('')

/**
 * Azuis da família da primária presentes no CSS que o mapa do gerador NÃO cobre.
 *
 * A referência de cobertura é o MAPA, não `AZUIS_*`: as duas listas dizem coisas
 * diferentes. `AZUIS_*` é "o que tem de desaparecer da saída" e só existe na
 * forma hex; o mapa é "o que o gerador sabe traduzir" e inclui as veladuras, que
 * o Lara escreve só como `rgba(...)` (o dark tem dois azuis exclusivos dessa
 * forma). Cobrar contra `AZUIS_*` reprovaria o gerador correto de hoje.
 */
function azuisDescobertos(cssStock: string, mapa: Record<string, string>): string[] {
  const cobertos = new Set(Object.keys(mapa).flatMap(rgbDasCores).map(chaveRgb))
  const fora = new Set<string>()
  for (const rgb of rgbDasCores(cssStock)) {
    if (daFamiliaAzul(rgb) && !cobertos.has(chaveRgb(rgb))) fora.add(hexDeRgb(rgb))
  }
  return [...fora].sort()
}

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
   * `rgba(...)`.
   *
   * Q-6: esta guarda cobre UMA direção — os azuis já conhecidos não sobrevivem
   * à geração. Ela não sabe nada de um azul que o Lara passe a usar num upgrade,
   * e a igualdade acima também não: regerado o tema, os dois lados nascem do
   * stock novo e a comparação passa. Quem cobre esse caso é a guarda de upgrade
   * logo abaixo, que varre o stock atrás de azul não mapeado.
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

  /**
   * Q-6: a guarda que o comentário acima PROMETIA e que não existia. As listas
   * `AZUIS_*` são manuais; um upgrade do primereact que traga um azul novo não
   * reprova em lugar nenhum — regerado o tema, os dois lados da igualdade nascem
   * do stock novo e o Tailwind blue fica dentro de um tema de marca.
   *
   * Esta varre o MESMO stock que o gerador consome e cobra que toda cor da
   * família azul da primária esteja no mapa. Reprova de verdade: o teste
   * seguinte injeta um azul novo e confere que ele é acusado.
   *
   * PONTOS CEGOS declarados, para o comentário não prometer mais do que cobre:
   *
   * 1. Os degraus "-50" (`#eff6ff`, `#f5f9ff`, `#f7fbff`) ficam sob o croma
   *    mínimo e a guarda não os alcança. Não é descuido — ali a geometria não
   *    separa: `#f7fbff` (azul-50 do Lara) e `#f6f9fc` (neutro) têm a mesma
   *    matiz e a mesma forma, e qualquer limiar que aceitasse um aceitaria o
   *    outro. São brancos a olho nu; o que escapa ali é cosmético.
   * 2. A régua lê `#rgb`, `#rrggbb` e `rgb()/rgba()` separados por vírgula — que
   *    é tudo que o Lara 10.9.8 escreve (conferido: zero hex de 8 dígitos, zero
   *    sintaxe por espaço, zero `hsl/lab/oklch/color-mix`). Se um upgrade migrar
   *    a notação, esta guarda fica cega — só que o gerador casa por substring da
   *    MESMA forma, então ele para de substituir junto e o tema sai sem marca
   *    nenhuma. Quem acusa aí são as asserções de token (`--primary-color` e
   *    `--primary-500` deixam de ser celeste), não a igualdade: regerado o tema,
   *    ela compara stock novo com stock novo e passa.
   */
  it('todo azul da família da primária no Lara stock está mapeado (guarda de upgrade)', () => {
    for (const [nome, arquivo, mapa] of [
      ['light', 'lara-light-blue', LIGHT_MAP],
      ['dark', 'lara-dark-blue', DARK_MAP],
    ] as const) {
      const descobertos = azuisDescobertos(stock(arquivo), mapa)
      expect(`${nome}: ${descobertos.join(', ')}`).toBe(`${nome}: `)
    }
  })

  /**
   * Lição 10: guarda que nunca viu o bug é cobertura fantasma. Como o bug que
   * a de cima persegue só existe num upgrade futuro do primereact, a prova é
   * aqui — CSS sintético com um azul da família que ninguém mapeou, ao lado das
   * severidades que ficam intactas de propósito. Fixa as duas metades: acusa o
   * azul novo e NÃO acusa info/sky, success, warning, danger nem secondary/slate.
   */
  it('a guarda de upgrade tem dentes: acusa azul novo e ignora as severidades', () => {
    const novo = '#4f8ff7' // matiz 217,1 — no meio da família, fora de todo mapa
    const severidades = [
      '.a{color:#0ea5e9;background:#38bdf8;border-color:#082f49}', // info/sky
      '.b{color:#22c55e;background:#f59e0b;border-color:#ef4444}', // success/warning/danger
      '.c{color:#64748b;background:#334155;border-color:#94a3b8}', // secondary/slate
      '.d{color:#6366f1;background:#1f2937;border-color:#030712}', // indigo e quase-pretos
      '.e{box-shadow:0 0 0 1px rgba(2, 6, 23, 0.5)}',
    ].join('')

    expect(azuisDescobertos(severidades, LIGHT_MAP)).toEqual([])
    expect(azuisDescobertos(`${severidades}.f{background:${novo}}`, LIGHT_MAP)).toEqual([novo])
    // e na forma rgba, que foi por onde o #dbeafe escapou por quatro dias
    expect(
      azuisDescobertos(`${severidades}.g{background:rgba(79, 143, 247, 0.24)}`, LIGHT_MAP),
    ).toEqual([novo])
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
   *
   * Q-2: itera a constante do GERADOR, não uma amostra dela. A versão anterior
   * conferia três dos sete, e os quatro de select/togglebutton podiam voltar a
   * branco sobre celeste (2,77:1) com a suíte verde — a igualdade lá em cima não
   * pega, porque regenera os dois lados. É a mesma forma de defeito que a D-P6
   * corrigiu neste arquivo; agora herdeiro novo entra na guarda sozinho.
   *
   * O casamento é por lista de seletores (`includes`), igual ao do gerador,
   * porque o Lara agrupa `-icon-left` e `-icon-right` num bloco só: quatro dos
   * sete nunca abrem bloco próprio, e foi isso que empurrou a versão anterior
   * para a amostragem. Blocos casados sem cor nenhuma existem de propósito (o
   * `width/height` do `.p-checkbox-icon`), então a régua é "pelo menos um bloco
   * pinta navy" + "nenhum ficou branco", e não "todos pintam navy".
   */
  it('ícone e rótulo que pousam na primária por herança também viram navy (D-P10)', () => {
    const blocos = [...light().matchAll(/([^{}]+)\{([^{}]*)\}/g)]

    for (const seletor of HERDEIROS) {
      const corpos = blocos.filter(([, sel]) => sel.includes(seletor)).map(([, , corpo]) => corpo)
      const comNavy = corpos.filter((corpo) => corpo.includes(AZUL_POSTE))
      const brancos = corpos.filter((corpo) => /#(?:ffffff|fff)\b/i.test(corpo))

      // 0 blocos casados também reprova aqui: seletor que sumiu no upgrade é
      // guarda que passou a não guardar nada.
      expect(
        `${seletor}: ${comNavy.length ? 'navy presente' : `SEM navy em ${corpos.length} bloco(s)`}`,
      ).toBe(`${seletor}: navy presente`)
      expect(`${seletor}: ${brancos.join(' | ')}`).toBe(`${seletor}: `)
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

/**
 * Minor 2/3 da fatia 1 do item 16: `brand-theme.css` repinta o hover de linha do
 * DataTable, porque a coluna de ações presa pinta fundo próprio por `style`
 * inline e o realce morria exatamente onde o olho vai clicar. A folha gerada
 * crava a cor do hover como LITERAL, não como token — não há variável do tema a
 * apontar de lá, então a cor foi copiada à mão para os dois temas.
 *
 * Q-3 do review de 2026-08-25: cópia à mão sem catraca. Mexer no gerador, trocar
 * a primária ou subir o primereact muda o hover do tema e deixa a coluna presa
 * na cor velha — o defeito que a correção fechou, de volta com a suíte inteira
 * verde. Esta guarda é a catraca que faltava: o valor lá e o valor cá, iguais.
 *
 * Ela lê o tema COMMITADO, e não a geração fresca, de propósito: é o arquivo
 * commitado que o navegador carrega. A igualdade lá em cima já cobra que ele
 * seja uma geração fresca, então as duas juntas fecham o caminho inteiro.
 */
describe('o tinte da coluna presa acompanha o hover do tema (Q-3)', () => {
  const blocos = (css: string) => [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
  const declaracao = (corpo: string, prop: string) =>
    corpo.match(new RegExp(`(?:^|[;{\\s])${prop}:\\s*([^;]+);`))?.[1].trim() ?? null

  /** O fundo que o tema pinta na linha sob o ponteiro. */
  const hoverDoTema = (nome: string) => {
    const casados = blocos(committed(nome))
      .filter(
        ([, sel]) => sel.includes('.p-datatable.p-datatable-hoverable-rows') && sel.includes(':hover'),
      )
      .map(([, , corpo]) => declaracao(corpo, 'background'))
      .filter((valor): valor is string => valor !== null)

    // 0 casados reprova junto: seletor que sumiu num upgrade é guarda cega, e
    // uma guarda cega passaria calada exatamente no caso que ela existe para ver.
    expect(`${nome}: ${casados.length}`).toBe(`${nome}: 1`)

    return casados[0]
  }

  /** O tinte que a nossa folha injeta na `tr` e a célula presa herda. */
  const tinteDaMarca = (escuro: boolean) => {
    const rotulo = escuro ? 'dark' : 'light'
    const casados = blocos(brand())
      .filter(([, , corpo]) => corpo.includes('--sticky-cell-tint:'))
      .filter(([, sel]) => sel.includes('html.dark') === escuro)
      .map(([, , corpo]) => declaracao(corpo, '--sticky-cell-tint'))

    expect(`${rotulo}: ${casados.length}`).toBe(`${rotulo}: 1`)

    return casados[0]
  }

  it('o tinte do claro é o hover do lara-light-lotus', () => {
    expect(tinteDaMarca(false)).toBe(hoverDoTema('lara-light-lotus'))
  })

  it('o tinte do escuro é o hover do lara-dark-lotus', () => {
    expect(tinteDaMarca(true)).toBe(hoverDoTema('lara-dark-lotus'))
  })
})

// ── D-68: a borda de controle do claro mede 3:1 ─────────────────────────────
// `#cbd5e1` sobre branco mede 1,48:1 e reprova a WCAG 1.4.11 (3:1 no limite do
// controle quando ele é o único indicador). O escuro tem poço de fundo e não
// depende do traço, por isso a passada é só do claro — mesma condição da tinta.
//
// A partição é a razão de a regra ser de FORMA e não troca de entrada no mapa:
// `#cbd5e1` aparece 27× no claro gerado, e só 21 são borda. As outras 6 —
// `--surface-300`, `--gray-300` e quatro `background`/`background-color`
// decorativos (hoje do datepicker, do inputswitch, do carousel e da galleria) —
// NÃO são traço de controle, e trocá-las mexeria na rampa de neutros.
//
// O slate-500 já era cor viva do tema ANTES desta passada — `.p-button-plain` e
// `.p-button-secondary` herdam o gray-500 do mapa de cor, três declarações de
// `border`/`border-color` entre elas. Elas não passam por `BORDA_DE_CONTROLE`
// (nunca foram `#cbd5e1`) mas ficam no MESMO grafema no CSS final. Por isso a
// contagem no claro GERADO é 24 (21 convertidas + 3 pré-existentes), não 21 —
// o "21" é o tamanho da partição na FONTE, medido pela segunda asserção: zero
// borda sobra em `#cbd5e1`.
const DECLARACOES_COM = (css: string, hex: string) =>
  [...css.matchAll(new RegExp(`[-\\w]*\\s*:\\s*[^;{}]*${hex}[^;{}]*`, 'gi'))].map((m) => m[0].trim())

describe('D-68 — borda de controle do tema claro', () => {
  it('as bordas em slate-500 somam 24 (21 convertidas + 3 já vivas), e nenhuma sobra em slate-300', () => {
    const css = light()
    const bordas = DECLARACOES_COM(css, CINZA_BORDA).filter((d) => /^border/.test(d))
    expect(bordas.length).toBe(24)
    expect(DECLARACOES_COM(css, '#cbd5e1').filter((d) => /^border/.test(d))).toEqual([])
  })

  it('os 4 preenchimentos decorativos e as 2 declarações de rampa ficam intactos', () => {
    const sobrou = DECLARACOES_COM(light(), '#cbd5e1')
    expect(sobrou.length).toBe(6)
    expect(sobrou.filter((d) => /^--/.test(d)).sort()).toEqual(['--gray-300: #cbd5e1', '--surface-300: #cbd5e1'])
    expect(sobrou.filter((d) => /^background/.test(d)).length).toBe(4)
  })

  it('o escuro não recebe a passada — lá o traço não é o único indicador', () => {
    expect(DECLARACOES_COM(dark(), CINZA_BORDA).filter((d) => /^border/.test(d)).length).toBe(0)
  })
})
