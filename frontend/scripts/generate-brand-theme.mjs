// Gera os temas Lara-Lotus (spec D5' de 2026-08-11): cópia dos Lara stock com a
// escala azul substituída pela escala celeste derivada de #25A5E4, os neutros
// unificados em slate, radius 6px→4px e a tipografia entregue ao @fontsource.
//
// Existe porque o Lara COMPILA as cores inline nas regras de componente (97
// ocorrências literais de #3b82f6 no light) — sobrescrever as vars de `:root`
// não restiliza botão, foco nem highlight.
//
// Saída VERSIONADA em src/shared/styles/themes/ — não editar à mão. No upgrade
// do primereact, rodar `pnpm brand-theme`; `tests/brand-theme.test.ts` acusa
// drift nos dois casos (edição à mão e upgrade sem regerar).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

// ── Paleta (spec §4) ────────────────────────────────────────────────────────
export const CELESTE = '#25a5e4' // primária única
export const AZUL_POSTE = '#0f2b3d' // navy
const NOCHE = '#0b1220' // fundo dark
const GRAFITE = '#334155' // texto corpo no claro (= slate-700)

// ── Derivação da escala celeste ─────────────────────────────────────────────
// Cada azul do Lara é re-ancorado em celeste PRESERVANDO seu deslocamento de
// luminância em relação à primária de origem: um tom 40% mais claro que o azul
// primário vira um celeste 40% mais claro que o celeste primário. Assim o ritmo
// claro/escuro do tema (e portanto os contrastes internos) sobrevive à troca, e
// a primária cai exatamente em #25A5E4 em vez de num tom "parecido".
const canais = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
const paraHex = (c) => '#' + c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')
const linear = (v) => {
  const s = v / 255
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}
const luminancia = ([r, g, b]) => 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b)
const misturar = (c, t, alvo) => c.map((v) => v + (alvo - v) * t)

function reancorar(origem, ancora, marca) {
  const [alvoY, ancoraY] = [luminancia(canais(origem)), luminancia(canais(ancora))]
  if (Math.abs(alvoY - ancoraY) < 1e-6) return marca
  const marcaRgb = canais(marca)
  const alvo = alvoY > ancoraY ? 255 : 0
  // A luminância é monótona em t, mas CRESCE rumo ao branco e DECRESCE rumo ao preto.
  const sobe = alvo === 255
  let lo = 0
  let hi = 1
  for (let i = 0; i < 40; i++) {
    const m = (lo + hi) / 2
    if ((luminancia(misturar(marcaRgb, m, alvo)) < alvoY) === sobe) lo = m
    else hi = m
  }
  return paraHex(misturar(marcaRgb, (lo + hi) / 2, alvo))
}

// A ESCALA nomeada (--primary-50..900 / --blue-50..900) não é re-ancorada: ela é
// gerada como rampa própria, em degraus fixos de mistura, que é o que a spec §4
// chama de "escala via color-mix". O motivo é medido: a luminância do celeste
// cai ENTRE os degraus 400 e 500 do Lara, então re-ancorar a escala fazia
// `--primary-400` e `--primary-500` saírem idênticos — dois degraus publicados
// com a mesma cor, defeito latente no primeiro `bg-primary-400` que existir.
const DEGRAUS = {
  50: 0.95, 100: 0.87, 200: 0.72, 300: 0.52, 400: 0.28,
  500: 0,
  600: 0.18, 700: 0.35, 800: 0.52, 900: 0.68,
}

const RAMPA = Object.values(DEGRAUS).map((t, i) =>
  paraHex(misturar(canais(CELESTE), t, i < 5 ? 255 : 0)),
)

/** Casa a escala do Lara (em ordem 50→900) com a rampa celeste, degrau a degrau. */
const rampear = (escalaLara) => Object.fromEntries(escalaLara.map((hex, i) => [hex, RAMPA[i]]))

// ── Os azuis, medidos no Lara instalado (não deduzidos) ─────────────────────
// Contagens de 2026-08-11, primereact 10.9.8. Só a família da PRIMÁRIA entra:
// as paletas de severidade (info/sky, success, warning, danger, secondary/slate)
// ficam intactas de propósito — elas comunicam significado, não marca.
const ANCORA_LIGHT = '#3b82f6' // tw blue-500 = primária do lara-light-blue
const ANCORA_DARK = '#60a5fa' // tw blue-400 = primária do lara-dark-blue

// (a) Azuis COMPILADOS nas regras de componente — re-ancorados por luminância.
const COMPILADOS_LIGHT = [
  '#eff6ff', // tw blue-50  — fundo de highlight (47x)
  '#dbeafe', // tw blue-100 — só via rgba (3x)
  '#bfdbfe', // tw blue-200 — anel de foco do Lara (67x)
  '#9dc1fb', // anel do .p-button (2x)
  '#8cbeff', // droppoint da tree (1x)
  '#70aeff', // toggler do organizationchart (1x)
  '#3b82f6', // PRIMÁRIA (97x)
  '#2563eb', // tw blue-600 — hover (8x)
  '#1d4ed8', // tw blue-700 — highlight-text / active (88x)
  '#022354', // hover do speeddial (1x)
]

const COMPILADOS_DARK = [
  '#60a5fa', // PRIMÁRIA do dark (92x)
  '#93c5fd', // tw blue-300 — hover (15x)
  '#bfdbfe', // tw blue-200 (11x)
  '#3b82f6', // tw blue-500 — 3 bordas de seta de popup + o --blue-500 (4x)
]

// (b) Escalas NOMEADAS, em ordem 50→900 — viram a rampa celeste.
// O dark tem escala própria em --primary-* mas carrega a MESMA --blue-* do light.
const ESCALA_LARA_LIGHT = [
  '#f5f9ff', '#d0e1fd', '#abc9fb', '#85b2f9', '#609af8',
  '#3b82f6', '#326fd1', '#295bac', '#204887', '#183462',
]
const ESCALA_LARA_DARK = [
  '#f7fbff', '#d9e9fe', '#bbd8fd', '#9cc7fc', '#7eb6fb',
  '#60a5fa', '#528cd5', '#4374af', '#355b8a', '#264264',
]

const reancorarTodos = (azuis, ancora) =>
  Object.fromEntries(azuis.map((hex) => [hex, reancorar(hex, ancora, CELESTE)]))

/** A união do que a guarda de drift (D-P6) exige que desapareça. */
export const AZUIS_LIGHT = [...new Set([...COMPILADOS_LIGHT, ...ESCALA_LARA_LIGHT])]
export const AZUIS_DARK = [
  ...new Set([...COMPILADOS_DARK, ...ESCALA_LARA_DARK, ...ESCALA_LARA_LIGHT]),
]

// ── Neutros: gray do Tailwind → slate, degrau a degrau (D-P3) ───────────────
// "Uma família só": o shell misturava gray-200 com slate-400 e o resultado é a
// aparência lavada que o review reprovou. Aqui não há regra a derivar — é troca
// de paleta, então a tabela é literal e conferível linha a linha.
const NEUTROS_LIGHT = {
  '#f9fafb': '#f8fafc', // gray-50  → slate-50   (47x; é o --surface-ground)
  '#f3f4f6': '#f1f5f9', // gray-100 → slate-100 = humo (98x)
  '#e5e7eb': '#e2e8f0', // gray-200 → slate-200 (120x)
  '#d1d5db': '#cbd5e1', // gray-300 → slate-300 (27x)
  '#9ca3af': '#94a3b8', // gray-400 → slate-400 (6x)
  '#6b7280': '#64748b', // gray-500 → slate-500 (117x; texto secundário)
  '#4b5563': GRAFITE, //   gray-600 → GRAFITE   (209x; é o --text-color, spec §4)
  '#374151': '#1e293b', // gray-700 → slate-800 (65x; ícone/hover, um passo abaixo do corpo)
  '#1f2937': '#0f172a', // gray-800 → slate-900 (10x; --surface-800/--gray-800, D-P7)
  '#111827': '#020617', // gray-900 → slate-950 (2x)
  'rgba(31, 41, 55': 'rgba(15, 23, 42', // veladura do gray-800 (4x)
}

const NEUTROS_DARK = {
  '#424b57': GRAFITE, //   borda principal → slate-700 (205x)
  '#374151': GRAFITE, //   segunda família de borda → slate-700 (26x), unificadas de propósito
  '#3f4753': GRAFITE, //   borda do confirm-popup (1x)
  '#1f2937': '#1e293b', // --surface-a (card) → slate-800 (98x)
  '#1c2532': '#0f172a', // linha ímpar do datatable → slate-900 (5x; segue mais escura que o card)
  '#1c2127': '#0f172a', // vão do anel de foco → slate-900 (8x; idem)
  '#111827': NOCHE, //     --surface-b (ground) → NOCHE (19x, spec §4 / D-P2)
  '#030712': AZUL_POSTE, //--primary-color-text → AZUL-POSTE (28x, D-P7: coincide com a D6)
  '#4b5563': GRAFITE, //   (2x)
  '#6b7280': '#64748b', // (4x)
  '#9ca3af': '#94a3b8', // (2x)
  '#d1d5db': '#cbd5e1', // (2x)
  '#e5e7eb': '#e2e8f0', // (4x)
  '#f3f4f6': '#f1f5f9', // (4x)
  '#f9fafb': '#f8fafc', // (2x)
  'rgba(31, 41, 55': 'rgba(15, 23, 42',
  'rgba(66, 75, 87': 'rgba(51, 65, 85',
}

// As veladuras da primária: o Lara escreve o canal RGB literal, sem hex.
const VELADURAS_LIGHT = { 'rgba(59, 130, 246': 'rgba(37, 165, 228' }
const VELADURAS_DARK = {
  'rgba(96, 165, 250': 'rgba(37, 165, 228',
  'rgba(59, 130, 246': 'rgba(37, 165, 228',
  'rgba(7, 99, 212': 'rgba(26, 116, 161',
  'rgba(29, 127, 248': 'rgba(37, 165, 228',
}

// A rampa vem DEPOIS do re-ancoramento: nas chaves que os dois cobrem (a
// primária, que é compilada e também é o degrau 500), o degrau nomeado manda.
export const LIGHT_MAP = {
  ...reancorarTodos(COMPILADOS_LIGHT, ANCORA_LIGHT),
  ...rampear(ESCALA_LARA_LIGHT),
  ...NEUTROS_LIGHT,
  ...VELADURAS_LIGHT,
  // D6/D-P8 no nível do token: é ELE que declara "texto sobre a primária", e
  // dizê-lo branco enquanto o tema pinta navy seria a contradição dentro do
  // próprio arquivo. No dark já vinha correto (#030712, remapeado nos neutros).
  '--primary-color-text: #ffffff': `--primary-color-text: ${AZUL_POSTE}`,
}

export const DARK_MAP = {
  ...reancorarTodos(COMPILADOS_DARK, ANCORA_DARK),
  ...rampear(ESCALA_LARA_DARK),
  ...rampear(ESCALA_LARA_LIGHT),
  ...NEUTROS_DARK,
  ...VELADURAS_DARK,
}

const COMUM = {
  'border-radius: 6px': 'border-radius: 4px', // D7 — pega o --border-radius pela mesma substring
  '"Inter var"': '"Inter"', // a Inter real vem do @fontsource (Task 1)
}

// ── D-P4: fora os @font-face do Lara ────────────────────────────────────────
// O rename acima também atinge os dois blocos @font-face, cujo `src` é
// url("./fonts/InterVariable.woff2") RELATIVO ao arquivo — que passa a morar em
// src/shared/styles/themes/, sem pasta fonts/. Sem a remoção o build quebra, e
// o tema ainda declararia uma face "Inter" com src 404 competindo com a real.
const semFontFace = (css) => css.replace(/@font-face\s*\{[^}]*\}\s*/g, '')

// ── D-P8 / D-P10: nada branco pousa sobre a primária no claro ───────────────
// Branco sobre celeste mede 2,77:1 — reprova o AA de texto (4,5:1) e até o 3:1
// de elemento gráfico. Azul-poste sobre celeste mede 5,29:1. É propriedade do
// TEMA, não do brand-theme.css: são 9 blocos que pintam o fundo e declaram a
// cor juntos, mais 7 declarações em descendentes que herdam o fundo do
// ancestral e que a regra "mesmo bloco" não enxerga.
const PRIMARIAS_LARA = [ANCORA_LIGHT, ANCORA_DARK]

// Descendentes medidos cujo ancestral pinta com a primária. Só texto e ícone —
// preenchimento decorativo fica branco de propósito (a bolinha do inputswitch e
// o handle do slider são o idioma universal do controle; navy ali lê como bug).
const HERDEIROS = [
  '.p-checkbox .p-checkbox-box .p-checkbox-icon',
  '.p-radiobutton .p-radiobutton-box .p-radiobutton-icon',
  '.p-selectbutton .p-button.p-highlight .p-button-icon-left',
  '.p-togglebutton.p-highlight .p-button .p-button-icon-left',
  '.p-togglebutton:not(.p-disabled):has(.p-togglebutton-input:hover).p-highlight .p-button .p-button-icon-left',
  '.p-selectbutton .p-button.p-highlight:hover .p-button-icon-left',
  '.p-progressbar .p-progressbar-label',
]

const BRANCO = /(color|background-color|background)(\s*:\s*)#(?:ffffff|fff)\b/gi

function textoSobrePrimaria(css) {
  return css.replace(/([^{}]+)\{([^{}]*)\}/g, (bloco, seletor, corpo) => {
    const pintaComPrimaria = PRIMARIAS_LARA.some((p) =>
      new RegExp(`background(-color)?:\\s*${p}\\b`, 'i').test(corpo),
    )
    const herdaPrimaria = HERDEIROS.some((s) => seletor.includes(s))
    if (!pintaComPrimaria && !herdaPrimaria) return bloco
    // No bloco que pinta o fundo, só a COR do texto muda — o fundo segue primária.
    const alvo = herdaPrimaria ? BRANCO : /(color)(\s*:\s*)#(?:ffffff|fff)\b/gi
    return `${seletor}{${corpo.replace(alvo, `$1$2${AZUL_POSTE}`)}}`
  })
}

const CABECALHO = `/* GERADO por scripts/generate-brand-theme.mjs — NÃO editar à mão.
 * Regerar com \`pnpm brand-theme\`; tests/brand-theme.test.ts acusa drift. */
`

const escapar = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export function transform(css, map) {
  const tabela = { ...map, ...COMUM }
  // Uma passada só: substituir em série faria uma saída ser reescaneada pela
  // chave seguinte (o `#e2e8f0` que sai do gray-200 é chave de outra família).
  const chaves = Object.keys(tabela).sort((a, b) => b.length - a.length)
  const busca = new RegExp(chaves.map(escapar).join('|'), 'gi')
  const indice = new Map(Object.entries(tabela).map(([k, v]) => [k.toLowerCase(), v]))

  const out = textoSobrePrimaria(semFontFace(css)).replace(
    busca,
    (achado) => indice.get(achado.toLowerCase()) ?? achado,
  )
  return CABECALHO + out
}

function gerar(nomeStock, map, nomeSaida) {
  const src = readFileSync(
    resolve(root, `node_modules/primereact/resources/themes/${nomeStock}/theme.css`),
    'utf8',
  )
  const dir = resolve(root, 'src/shared/styles/themes')
  mkdirSync(dir, { recursive: true })
  writeFileSync(resolve(dir, `${nomeSaida}.css`), transform(src, map))
  console.log(`gerado: src/shared/styles/themes/${nomeSaida}.css`)
}

// Só gera quando executado como script; importar (teste) não escreve nada.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  gerar('lara-light-blue', LIGHT_MAP, 'lara-light-lotus')
  gerar('lara-dark-blue', DARK_MAP, 'lara-dark-lotus')
}
