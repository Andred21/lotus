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

/** O corpo da regra cujo seletor começa por `prefixo`. */
const regra = (css: string, prefixo: string) =>
  css.match(new RegExp(`${prefixo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^{}]*\\{([^{}]*)\\}`))?.[1] ?? ''

const corDe = (corpo: string) => corpo.match(/(?<![-\w])color:\s*(#[0-9a-f]{6})/i)?.[1] ?? ''
const fundoDe = (corpo: string) => corpo.match(/background(?:-color)?:\s*(#[0-9a-f]{6})/i)?.[1] ?? ''

/** A cor do anel de foco. São duas formas de `box-shadow`: o
 * `:not(:disabled):focus` traz uma camada só, e o `:enabled:focus` traz um
 * separador antes — ali o anel é a camada de 4px, nunca a primeira. */
const anelDe = (corpo: string) =>
  (corpo.match(/0 0 0 4px\s+(#[0-9a-f]{6}|rgba?\([^)]*\))/i) ??
    corpo.match(/box-shadow:\s*0 0 0 [\d.]+(?:rem|px)\s+(#[0-9a-f]{6}|rgba?\([^)]*\))/i))?.[1] ?? ''

/** O hue declarado, sem o alfa — é ele que responde "de que família é". */
const nucleo = (cor: string) => {
  const m = cor.match(/^rgba?\(\s*(\d+)\D+(\d+)\D+(\d+)/i)
  return m
    ? '#' + [1, 2, 3].map((i) => Number(m[i]).toString(16).padStart(2, '0')).join('')
    : cor.toLowerCase()
}

/** A cor como o olho a vê: veladura composta sobre onde pousa. Comparar a cor
 * DECLARADA ignoraria o alfa, e o anel do escuro é veladura. */
const solido = (cor: string, sobre: string) => {
  const m = cor.match(/^rgba\(\s*\d+\D+\d+\D+\d+\D+([\d.]+)/i)
  const alfa = m ? Number(m[1]) : 1
  return (
    '#' +
    rgb(nucleo(cor))
      .map((v, i) => Math.round(v * alfa + rgb(sobre)[i] * (1 - alfa)))
      .map((v) => v.toString(16).padStart(2, '0'))
      .join('')
  )
}

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
  ])('tema $tema', ({ tema, bloco, folha }) => {
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

    /** Bloco 43: o fundo de 15% do `AppTag` (`severityTone`) é também o do ícone
     * da `ConfirmDialog`, e só o `accent` era medido nessa proporção. */
    it.each(tintasDe(bloco, folha).filter(({ tom }) => tom !== 'accent'))(
      'o tom $tom passa AA sobre o fundo de 15% do `severityTone`',
      ({ tom, tinta }) => {
        const { hue } = TONS[tom as keyof typeof TONS]
        expect(contraste(tinta, tingido(hex(folha, `--${hue}-500`), card, 0.15))).toBeGreaterThanOrEqual(4.5)
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

/**
 * UI-02 do review de 2026-08-18. O `Eliminar foto` do `AppPhotoField` — a única
 * ação irreversível do cartão de identidade — media 3,44:1 no tema claro.
 *
 * A causa não é o token acima: é o gerador do tema, que deixa as paletas de
 * severidade INTACTAS de propósito, e com isso o `#ef4444` compilado do Lara
 * seguia pintando o rótulo dos variants `text` e `outlined` — os dois em que o
 * vermelho é primeiro plano, e não fundo. A régua é 4,5:1 porque 16px em negrito
 * não é texto grande (o limiar é 18,66px).
 *
 * Mede sobre `--surface-ground` porque é ali que o botão vive: o cartão `sunken`
 * do `/perfil` (D-28) pinta o fundo do shell, e ele é o fundo MAIS escuro dos
 * dois no claro — se passa nele, passa no card.
 */
describe('tinta do botão `danger` text/outlined (UI-02)', () => {
  /** O fundo como o CSS o resolve: a camada de marca sobrescreve o ground do
   * claro (`#f1f5f9`, D-28) e não toca o do escuro. */
  const ground = (bloco: string, folha: string) =>
    hex(bloco, '--surface-ground') || hex(folha, '--surface-ground')

  it('a camada de marca aponta os dois variants para o token de tom', () => {
    expect(camadaDeMarca).toMatch(
      /:root \.p-button\.p-button-danger\.p-button-text,[\s\S]*?\{\s*color: var\(--tone-danger-ink\);\s*\}/,
    )
    expect(camadaDeMarca).toContain(':root .p-button.p-button-danger.p-button-outlined,')
  })

  /** A regra base do Lara é (0,3,0), mas `:hover` e `:active` chegam a (0,5,0)
   * repetindo o MESMO `#ef4444`: sem uma linha por estado, passar o mouse
   * devolvia os 3,44:1 e a captura de tela não acusaria. */
  it('cobre `:hover` e `:active`, onde o Lara repete a cor com especificidade maior', () => {
    for (const variant of ['text', 'outlined']) {
      for (const estado of [':hover', ':active']) {
        expect(camadaDeMarca).toContain(
          `:root .p-button.p-button-danger.p-button-${variant}:not(:disabled)${estado}`,
        )
      }
    }
  })

  it.each([
    { tema: 'claro', bloco: blocoClaro, folha: temaClaro },
    { tema: 'escuro', bloco: blocoRaiz, folha: temaEscuro },
  ])('no tema $tema a tinta passa AA (4,5:1) sobre o cartão recuado', ({ bloco, folha }) => {
    const degrau = bloco.match(/--tone-danger-ink:\s*var\((--[a-z]+-\d+)\)/)?.[1] ?? ''
    expect(degrau).toMatch(/^--red-\d00$/)
    expect(contraste(hex(folha, `\\${degrau}`), ground(bloco, folha))).toBeGreaterThanOrEqual(4.5)
  })

  /** O controle que faz o teste discriminar: reverter para o vermelho do Lara
   * cai aqui, não na captura de tela. */
  it('o vermelho compilado do Lara reprova sobre o cartão recuado do claro', () => {
    expect(contraste('#ef4444', '#f1f5f9')).toBeLessThan(4.5)
  })
})

/**
 * P-30. O único `AppButton severity="warning"` do produto
 * (`MoveConfirmDialog.tsx:36`) confirma uma ação irreversível de matrícula, e no
 * tema claro o Lara o pintava com `#ffffff` sobre `#f97316`: **2,80:1**, abaixo
 * do 4,5:1 de texto e abaixo até do 3:1 de elemento gráfico.
 *
 * A ficha pedia coerência de família (o `AppTag` warning já pintava com
 * `--yellow-*`), e a coerência resolveu o contraste junto. Mede os QUATRO
 * estados porque a regra base do Lara é (0,3,0) e `:hover`/`:active`/`:focus`
 * chegam a (0,5,0) repetindo a cor: sem uma asserção por estado, passar o mouse
 * devolveria a reprovação sem a captura de tela acusar — o mesmo defeito da
 * UI-02. O `:focus` entrou no review de 2026-09-03 (Q-5), que mediu o buraco: a
 * ficha corrigiu o preenchimento e deixou o anel de foco no laranja de stock,
 * onde ele PIOROU de 2,25:1 para 1,54:1 contra o fundo novo.
 *
 * Mede também a AMARRAÇÃO, não só a razão (Q-6): a razão sozinha fica verde se
 * alguém mover `--tone-warning-ink` um degrau e o botão ficar para trás — a
 * `AppTag` andaria, o botão não, e a ficha reabriria em silêncio, que é
 * exatamente a "uma severidade, duas famílias" que a P-30 fechou.
 */
describe('botão `warning` filled e outlined (P-30)', () => {
  const rampaAmarela = (folha: string) =>
    [...folha.matchAll(/--yellow-\d00:\s*(#[0-9a-f]{6})/gi)].map((m) => m[1].toLowerCase())

  describe.each([
    { tema: 'claro', folha: temaClaro, bloco: blocoClaro, ground: '#ffffff', degrauFundo: '--yellow-500' },
    { tema: 'escuro', folha: temaEscuro, bloco: blocoRaiz, ground: '', degrauFundo: '--yellow-400' },
  ])('tema $tema', ({ folha, bloco, ground, degrauFundo }) => {
    it.each([
      { estado: 'base', prefixo: '.p-button.p-button-warning,' },
      { estado: 'hover', prefixo: '.p-button.p-button-warning:not(:disabled):hover,' },
      { estado: 'active', prefixo: '.p-button.p-button-warning:not(:disabled):active,' },
    ])('o filled no estado $estado passa AA (4,5:1)', ({ prefixo }) => {
      const corpo = regra(folha, prefixo)
      const [tinta, fundo] = [corDe(corpo), fundoDe(corpo)]

      expect(fundo).toMatch(/^#[0-9a-f]{6}$/)
      expect(contraste(tinta, fundo)).toBeGreaterThanOrEqual(4.5)
    })

    it('a tinta do filled é o degrau 900 do amarelo nos dois temas', () => {
      expect(corDe(regra(folha, '.p-button.p-button-warning,'))).toBe(hex(folha, '--yellow-900'))
    })

    it('o outlined/text é primeiro plano e passa AA sobre a superfície onde vive', () => {
      const cor = corDe(regra(folha, '.p-button.p-button-warning.p-button-outlined,'))
      const fundo = ground || hex(folha, '--surface-card')

      expect(contraste(cor, fundo)).toBeGreaterThanOrEqual(4.5)
    })

    /** A amarração da Q-6, e o motivo de ela ser separada da razão acima: o
     * `AppTag` warning lê `--tone-warning-ink` (`tokens.ts` → `AppTag.tsx`) e o
     * botão lê o hex compilado. Sem esta linha os dois podem divergir com as
     * quatro asserções de contraste verdes. */
    it('o outlined/text pinta com o MESMO degrau que a camada de marca publica em `--tone-warning-ink`', () => {
      const degrau = bloco.match(/--tone-warning-ink:\s*var\((--[a-z]+-\d+)\)/)?.[1] ?? ''

      expect(degrau).toMatch(/^--yellow-\d00$/)
      expect(corDe(regra(folha, '.p-button.p-button-warning.p-button-outlined,'))).toBe(
        hex(folha, `\\${degrau}`),
      )
    })

    it(`o preenchimento do filled é ${degrauFundo}, o degrau que a rampa publica`, () => {
      expect(fundoDe(regra(folha, '.p-button.p-button-warning,'))).toBe(hex(folha, degrauFundo))
    })

    /** O quarto estado (Q-5). Duas regras de `:focus` coexistem com a MESMA
     * especificidade (0,4,0) e a de baixo é quem pinta — as duas entram, porque
     * corrigir só a que vence deixa a outra pronta para voltar a valer se o
     * Lara reordenar o arquivo. */
    it.each([
      { qual: '`:not(:disabled):focus`', prefixo: '.p-button.p-button-warning:not(:disabled):focus,' },
      { qual: '`:enabled:focus`', prefixo: '.p-button.p-button-warning:enabled:focus' },
    ])('o anel de foco em $qual é da família amarela e separa 3:1 da superfície', ({ prefixo }) => {
      const superficie = ground || hex(folha, '--surface-card')
      const anel = anelDe(regra(folha, prefixo))

      expect(anel).not.toBe('')
      expect(rampaAmarela(folha)).toContain(nucleo(anel))
      expect(contraste(solido(anel, superficie), superficie)).toBeGreaterThanOrEqual(3)
    })
  })

  /** O controle da Q-5: os dois anéis de stock reprovam, cada um contra o
   * vizinho que ele precisa separar. Reverter qualquer um cai aqui. */
  it('o anel de foco de stock do Lara reprova contra o preenchimento novo e contra a página', () => {
    expect(contraste('#fde68a', '#eab308')).toBeLessThan(3)
    expect(contraste('#fcb98b', '#ffffff')).toBeLessThan(3)
  })

  /** Os dois controles que fazem o teste discriminar (lição 10). O primeiro é o
   * defeito que a ficha fecha; o segundo é a "correção" ingênua — trocar cada
   * degrau de laranja pelo degrau de amarelo na MESMA posição —, que reprova o
   * active do claro por 2,29:1 e que este arquivo tem de recusar. */
  it('o laranja de stock do Lara reprova, e a troca degrau a degrau reprova pior', () => {
    expect(contraste('#ffffff', '#f97316')).toBeLessThan(3)
    expect(contraste('#5e4803', '#a47d06')).toBeLessThan(3)
  })
})

/**
 * P-74 / O3 do bloco 49. No tema claro o Lara pintava `#ffffff` sobre o fundo de
 * stock das severidades — `#22c55e` 2,28:1, `#0ea5e9` 2,77:1, `#ef4444` 3,76:1,
 * `#a855f7` 3,96:1 —, e o "Eliminar" de toda confirmação herdava o vermelho. A
 * decisão (opção A, spec §4.1) é o molde da P-30: fundo claro da rampa da Lotus e
 * letra no degrau 900 da mesma família, com os estados SUBINDO a rampa.
 *
 * A régua cobre as CINCO severidades nos DOIS temas e nenhum par é pulado: razão
 * do filled em base/hover/active e anel de foco contra cada superfície onde o
 * botão pousa. No claro mede também a AMARRAÇÃO — o degrau exato, lido da própria
 * folha —, porque a razão sozinha passa com qualquer degrau que meça bem.
 */
describe('botão filled das cinco severidades (P-74)', () => {
  const SEVERIDADES = [
    { sev: 'success', hue: 'green' },
    { sev: 'info', hue: 'blue' },
    { sev: 'warning', hue: 'yellow' },
    { sev: 'danger', hue: 'red' },
    { sev: 'help', hue: 'purple' },
  ]
  const DO_P74 = SEVERIDADES.filter(({ sev }) => sev !== 'warning')

  const temas = [
    {
      tema: 'claro',
      folha: temaClaro,
      superficies: ['#ffffff', hex(blocoClaro, '--surface-ground')],
    },
    {
      tema: 'escuro',
      folha: temaEscuro,
      superficies: [hex(temaEscuro, '--surface-ground'), hex(temaEscuro, '--surface-card')],
    },
  ]

  describe.each(temas)('tema $tema', ({ folha, superficies }) => {
    it.each(
      SEVERIDADES.flatMap(({ sev }) => [
        { sev, estado: 'base', prefixo: `.p-button.p-button-${sev},` },
        { sev, estado: 'hover', prefixo: `.p-button.p-button-${sev}:not(:disabled):hover,` },
        { sev, estado: 'active', prefixo: `.p-button.p-button-${sev}:not(:disabled):active,` },
      ]),
    )('$sev: o filled no estado $estado passa AA (4,5:1)', ({ prefixo }) => {
      const corpo = regra(folha, prefixo)

      expect(fundoDe(corpo)).toMatch(/^#[0-9a-f]{6}$/)
      expect(contraste(corDe(corpo), fundoDe(corpo))).toBeGreaterThanOrEqual(4.5)
    })

    it.each(
      SEVERIDADES.flatMap(({ sev }) => [
        { sev, qual: '`:not(:disabled):focus`', prefixo: `.p-button.p-button-${sev}:not(:disabled):focus,` },
        { sev, qual: '`:enabled:focus`', prefixo: `.p-button.p-button-${sev}:enabled:focus` },
      ]),
    )('$sev: o anel de foco em $qual separa 3:1 de cada superfície', ({ prefixo }) => {
      const anel = anelDe(regra(folha, prefixo))

      expect(anel).not.toBe('')
      for (const superficie of superficies) {
        expect(contraste(solido(anel, superficie), superficie)).toBeGreaterThanOrEqual(3)
      }
    })
  })

  /** A amarração do claro (spec §4.1): fundo base/hover/active nos degraus
   * 300/200/100 da família, tinta e anel no 900. O `warning` fica de fora porque
   * a P-30 tem o `describe` dela. */
  describe.each(DO_P74)('tema claro: $sev amarrado à rampa $hue', ({ sev, hue }) => {
    const degrau = (n: number) => hex(temaClaro, `--${hue}-${n}`)

    it.each([
      { estado: 'base', prefixo: `.p-button.p-button-${sev},`, n: 300 },
      { estado: 'hover', prefixo: `.p-button.p-button-${sev}:not(:disabled):hover,`, n: 200 },
      { estado: 'active', prefixo: `.p-button.p-button-${sev}:not(:disabled):active,`, n: 100 },
    ])('o fundo do estado $estado é o degrau $n e a tinta é o 900', ({ prefixo, n }) => {
      const corpo = regra(temaClaro, prefixo)

      expect(degrau(n)).toMatch(/^#[0-9a-f]{6}$/)
      expect(fundoDe(corpo)).toBe(degrau(n))
      expect(corDe(corpo)).toBe(degrau(900))
    })

    it.each([
      { qual: '`:not(:disabled):focus`', prefixo: `.p-button.p-button-${sev}:not(:disabled):focus,` },
      { qual: '`:enabled:focus`', prefixo: `.p-button.p-button-${sev}:enabled:focus` },
    ])('o anel em $qual é o degrau 900', ({ prefixo }) => {
      expect(nucleo(anelDe(regra(temaClaro, prefixo)))).toBe(degrau(900))
    })
  })

  /** O controle negativo: a tinta branca de stock sobre o fundo de stock das
   * quatro reprova — é o defeito que a ficha fecha, e reverter cai aqui. */
  it.each(['#22c55e', '#0ea5e9', '#ef4444', '#a855f7'])(
    'o branco de stock sobre %s reprova no claro',
    (fundo) => {
      expect(contraste('#ffffff', fundo)).toBeLessThan(4.5)
    },
  )
})

/**
 * Bloco 43, spec §4.1: header e footer do diálogo padrão vestem a superfície
 * FIXA do shell — a do sidebar e do navbar. A pintura mora em `brand-theme.css`,
 * fora de layer, e por isso um seletor sem estado vence também o hover e o
 * active do Lara; a premissa só vale enquanto o tema viver em `@layer primereact`.
 */
describe('moldura navy do diálogo padrão (bloco 43)', () => {
  /** O corpo da regra cujo seletor é exatamente `seletor`. */
  const regra = (seletor: string) =>
    camadaDeMarca.match(new RegExp(`${seletor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{([^}]*)\\}`))?.[1] ?? ''

  it('o tema vive em layer — é o que deixa a folha de marca vencer sem especificidade', () => {
    expect(temaClaro).toContain('@layer primereact')
    expect(temaEscuro).toContain('@layer primereact')
  })

  it('header e footer pintam o navy, com a tinta do shell e o foco celeste', () => {
    const corpo = regra('.lotus-dialog .p-dialog-header,\n.lotus-dialog .p-dialog-footer')

    expect(corpo).toMatch(/background:\s*var\(--brand-navy\)/)
    expect(corpo).toMatch(/color:\s*var\(--shell-ink\)/)
    expect(corpo).toMatch(/--focus-stroke:\s*var\(--brand\)/)
    expect(corpo).toMatch(/--text-color-secondary:\s*var\(--shell-ink-muted\)/)
  })

  it('as tintas do shell passam AA sobre o navy', () => {
    // As duas são `slate` copiado literal (comentário do `:root`): `--shell-ink`
    // é o 300 (#cbd5e1) e `--shell-ink-muted` o 400 (#94a3b8).
    const navy = hex(camadaDeMarca, '--brand-navy')
    expect(navy).toBe('#0f2b3d')
    expect(camadaDeMarca).toMatch(/--shell-ink:\s*oklch\(86\.9% 0\.022 252\.894\);/)
    expect(camadaDeMarca).toMatch(/--shell-ink-muted:\s*oklch\(70\.4% 0\.04 256\.788\);/)
    expect(contraste('#cbd5e1', navy)).toBeGreaterThanOrEqual(4.5)
    expect(contraste('#94a3b8', navy)).toBeGreaterThanOrEqual(4.5)
  })

  it('o botão primário de marca se destaca do navy (3:1, contorno)', () => {
    expect(contraste(hex(camadaDeMarca, '--brand'), hex(camadaDeMarca, '--brand-navy'))).toBeGreaterThanOrEqual(3)
  })

  it.each([
    '.lotus-dialog .p-dialog-header .p-dialog-title,\n.lotus-dialog .p-dialog-header .p-dialog-header-icon',
  ])('%s lê a tinta do shell', (seletor) => {
    expect(regra(seletor)).toMatch(/color:\s*var\(--shell-ink\)/)
  })

  // J-1 do bloco 44: o `link` do cabeçalho e o `outlined` do rodapé herdavam a
  // cor da marca do Lara (navy sobre navy, 2,18:1). Os três estilos sem fundo
  // leem a tinta do shell nos dois lados.
  it('link, outlined e text, no header e no footer, leem a tinta do shell', () => {
    const seletores = ['header', 'footer']
      .flatMap((lado) => ['text', 'link', 'outlined'].map((v) => `.lotus-dialog .p-dialog-${lado} .p-button.p-button-${v}`))
      .join(',\n')

    expect(regra(seletores)).toMatch(/color:\s*var\(--shell-ink\)/)
  })

  it('o outlined do diálogo desenha a borda em tinta clara, não na marca', () => {
    const corpo = regra(
      '.lotus-dialog .p-dialog-header .p-button.p-button-outlined,\n.lotus-dialog .p-dialog-footer .p-button.p-button-outlined',
    )
    expect(corpo).toMatch(/border-color:\s*rgb\(255 255 255 \/ 0\.5\)/)
    // 50% de branco sobre o navy passa os 3:1 de contorno de componente.
    expect(contraste('#87959e', hex(camadaDeMarca, '--brand-navy'))).toBeGreaterThanOrEqual(3)
  })
})
