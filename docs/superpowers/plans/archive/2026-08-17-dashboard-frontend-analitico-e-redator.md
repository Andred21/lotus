# Dashboard · frontend analítico e view do Redator (B2) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** renderizar a metade analítica do Dashboard do administrador (5 séries, 2 rankings,
compliance de turmas, carga de redatores, seletor de período) e a view do Redator inteira,
consumindo o contrato agregado que o bloco A já expõe, sem nenhuma mutação.

**Architecture:** o hook `useDashboard` discrimina o payload UMA vez em `ready-admin` /
`ready-redator` (D3) e guarda o último payload bom para a falha de troca de janela não substituir a
tela (D6). A página vira só o roteador de `kind`; cada view compõe a sua pasta (`admin/`,
`redator/`). Gráfico é SVG via Recharts, embrulhado em dois wrappers de `shared/ui` que são os
únicos consumidores da paleta `--chart-1..5` (D11). Tabela de verdade usa `AppDataTable` (D9).
Ausência autorizada some da tela, nunca vira zero (D7).

**Tech Stack:** React 19.2 + TS · TanStack Query v5.101 · Recharts (novo) · PrimeReact 10.9 via
`shared/ui` · Tailwind v4 (layout) · Vitest + Testing Library · ESLint flat config.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-08-17-dashboard-frontend-analitico-e-redator-design.md`.
  Context Packet: `docs/superpowers/context-packets/2026-08-17-dashboard-frontend-analitico-e-redator.md`.
- Branch `feat/dashboard-frontend-analitico-e-redator`, **main tree**. Nasce de `main@c2ac9d4`;
  já tem `e48b4ae`, `3aa91e2`, `6610fe4` (só docs de estado).
- **`backend/config/cors.php` está modificado no working tree e NÃO é deste bloco (WIP do João).**
  Nunca entra em `git add`. Todo commit usa **paths exatos**, jamais `git add -A` / `git add .`.
- **Zero backend.** `git diff main...HEAD -- backend/` fica vazio; `generated.ts` não se edita à mão
  (lei §5.3) e não se regenera — nenhum DTO muda.
- **Zero mutação.** O bloco é read-only: nenhum `POST`/`PUT`/`DELETE`, nenhum `useMutation`.
- Cor: Tailwind é layout; cor vem de variável do tema (ADR-16). Nada de `text-slate-500` e irmãs em
  `className` — a catraca `COR_HARDCODED` reprova. **Hex literal novo: zero** (D2).
- Fronteira (lei §5.6): `app/` e `features/` **não importam `primereact`** — só `@shared/ui`.
- Comandos, sempre de `frontend/`: `pnpm lint`, `pnpm build`, `pnpm test`.
- **Baseline medida nesta branch, antes da Task 1:** `pnpm lint` exit 0, `pnpm build` verde,
  `pnpm test` **39 arquivos / 223 testes**. Toda task termina com os três verdes.
- i18n: chave nova entra nas **3 locales** (`es-CL`, `pt-BR`, `en`), `es-CL` como referência.
  Nenhuma chave crua na tela.

---

## Duas emendas à spec, medidas durante o planejamento

As duas entram no §11 da spec na Task 11, com a medição junto. Estão aqui porque mudam código.

### Emenda 1 — a D8 obriga dois arquivos que a §4 da spec não lista

A régua da D8 (`max-lines: 150` em `src/app/**/*.tsx`) e a estrutura da §4 se contradizem: a §4 dá
ao `DashboardPage.tsx` o papel de "escolher o ramo por `kind`" E de compor as ~10 seções do admin.
Hoje ele tem **159 linhas** com 5 seções; as 4 novas (período, séries, rankings, compliance+carga)
não cabem sob 150 de jeito nenhum.

Resolução, sem reabrir a D4: o que a §4 já fazia para o Redator (`RedatorView.tsx`) passa a valer
para o admin, e o que as **duas** views usam mora na raiz — que é literalmente o critério da D4.
Três arquivos a mais que a §4:

- `admin/AdminView.tsx` — compõe as seções do admin (simétrico ao `redator/RedatorView.tsx`)
- `SectionLabel.tsx` — a faixa de seção, usada pelas duas views
- `DashboardSkeleton.tsx` — o esqueleto do `loading`, que é anterior ao ramo

### Emenda 2 — `placeholderData: keepPreviousData` não cobre a metade que a D6 existe para cobrir

A D6 pede duas coisas: (a) sem flash branco na troca normal de janela e (b) **na falha da troca, o
dado anterior FICA e o erro vira aviso ao lado**. Medido no observador da versão instalada,
`node_modules/.pnpm/@tanstack+query-core@5.101.1/.../src/queryObserver.ts:486-491`, o placeholder só
se aplica quando `status === 'pending'`:

```ts
if (
  options.placeholderData !== undefined &&
  data === undefined &&
  status === 'pending'
) {
```

Quando o fetch da key nova **falha**, `status` vira `'error'`, `data` volta `undefined`, o
placeholder não entra — e o hook cai em `kind: 'error'`, que é exatamente a tela em branco que a D6
foi escrita para impedir. A metade (a) funciona; a (b), que é o objetivo declarado, não.

Resolução: **um** mecanismo no lugar de dois. O hook guarda o último payload que chegou bom e o usa
como piso quando `query.data` está `undefined`. Isso cobre (a) e (b) — na troca normal e na falhada,
o dado anterior é o mesmo objeto. `placeholderData` **sai**: mantê-lo ao lado do piso seria a
segunda fonte da mesma verdade, que é o defeito que este repositório já pagou três vezes.

O objetivo da D6 e o teste que ela pede não mudam. Muda o mecanismo nomeado.

---

## Estrutura de arquivos

```
frontend/package.json                                  # + recharts                        T1
frontend/src/shared/styles/brand-theme.css             # + --chart-1..5                    T1
frontend/src/shared/styles/tokens.ts                   # + chartInks                       T1
frontend/tests/chart-tokens.test.ts                    # novo: contraste + catraca         T1
frontend/src/shared/ui/AppLineChart/{AppLineChart.tsx,pivot.ts,pivot.test.ts,index.ts}   T2
frontend/src/shared/ui/AppBarChart/{AppBarChart.tsx,index.ts}                            T2
frontend/src/shared/ui/index.ts                        # + 2 barris                        T2
frontend/eslint.config.js                              # régua em src/app/**/*.tsx         T5
frontend/src/app/pages/Dashboard/
  DashboardPage.tsx        # só o ramo por kind                                  T3, T4, T6, T10
  useDashboard.ts          # D3 + D6 (Emenda 2)                                          T3
  useDashboard.test.tsx    # cenários 1-4                                                T3
  SectionLabel.tsx         # Emenda 1                                                    T4
  DashboardSkeleton.tsx    # Emenda 1                                                    T4
  KpiRow.tsx               # só render, genérico sobre Kpi[]                             T4
  AgendaPanel.tsx          # genérico sobre a linha (D13)                                T4
  AlertList.tsx            # intocado — reuso direto pelo Redator (D13)                   —
  DashboardItemRow.tsx     # intocado                                                     —
  navigation.ts            # intocado                                                     —
  index.ts                 # intocado                                                     —
  admin/
    AdminView.tsx          # Emenda 1                                    T4, T6, T7, T8, T9
    kpiCards.ts            # derivação que sai do KpiRow                                 T4
    kpiCards.test.ts       # cenário 5                                                   T4
    PendingList.tsx        # git mv                                                      T4
    PipelineFunnel.tsx     # git mv                                                      T4
    periodPresets.ts       # derivação dos 4 presets                                     T6
    periodPresets.test.ts  # cenário extra, justificado na T6                            T6
    PeriodFilter.tsx       # D5                                                          T6
    SeriesPanel.tsx        # D7                                                          T7
    RankingsPanel.tsx                                                                    T8
    CompliancePanel.tsx    # D9                                                          T9
    RedatorLoadPanel.tsx   # D9                                                          T9
  redator/
    RedatorView.tsx        # compõe as 5 seções                                         T10
    resumoCards.ts         # derivação                                                  T10
    resumoCards.test.ts    # cenário 6                                                  T10
    PendenciasList.tsx                                                                  T10
frontend/src/shared/config/locales/{es-CL,pt-BR,en}.json   # ~45 chaves  T6, T7, T8, T9, T10
docs/superpowers/specs/…-design.md                     # §11 Emendas 1 e 2               T11
docs/superpowers/state.md · historico/progress.md      # fechamento                      T11
```

`git mv` preserva histórico nos dois arquivos movidos; os imports reapontam no mesmo commit.

---

## Task 1: Paleta de gráfico — dependência, tokens e a régua que os prova

**Files:**
- Modify: `frontend/package.json` (dependência `recharts`)
- Modify: `frontend/src/shared/styles/brand-theme.css` (bloco `:root` e bloco `html:not(.dark)`)
- Modify: `frontend/src/shared/styles/tokens.ts` (final do arquivo)
- Create: `frontend/tests/chart-tokens.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces: `chartInks: readonly string[]` (5 posições, `'var(--chart-1)'`…`'var(--chart-5)'`),
  consumido pela Task 2. As CSS vars `--chart-1`…`--chart-5`.

**Por que a dependência entra JUNTO com os tokens e não sozinha:** a D1 escolheu Recharts pelo
argumento de que SVG consome `stroke="var(--chart-N)"` sem JS nenhum. A dependência sem os tokens
não prova nada, e os tokens sem a dependência não têm consumidor. O deliverable desta task é
"existe uma paleta de série medida e uma biblioteca que a consome sem código de tema".

- [ ] **Step 1: Instalar o Recharts**

```bash
cd frontend && pnpm add recharts
```

- [ ] **Step 2: Verificar a compatibilidade com React 19.2 — é step, não premissa (D1)**

```bash
cd frontend && node -e "
const p = require('./node_modules/recharts/package.json');
console.log('recharts', p.version);
console.log('peer react:', p.peerDependencies?.react ?? '(nenhum)');
"
```

Expected: uma versão cujo peer `react` **aceita 19** (Recharts 3.x). Se o peer for
`^16.8 || ^17 || ^18`, a instalação puxou a linha 2.x — rode `pnpm add recharts@^3` e repita.

**PARE e reporte se nem a 3.x aceitar React 19:** a D1 rejeitou `chart.js` por mérito, e trocar a
biblioteca é decisão de spec, não do executor.

- [ ] **Step 3: Registrar o custo de bundle, para o review ter o número**

```bash
cd frontend && pnpm build 2>&1 | tail -20
```

Expected: build verde. Anote a linha do maior chunk — a Task 11 compara com a baseline
(`pnpm build` verde antes desta task) e o número entra no fechamento. Não há orçamento a cumprir
aqui; há um número a declarar.

- [ ] **Step 4: Escrever a régua ANTES dos tokens (vermelho primeiro)**

Cria `frontend/tests/chart-tokens.test.ts`. O molde é o irmão `tests/tone-ink.test.ts`: mede a
RAZÃO, não confere um hex escolhido — assim um degrau novo da rampa só passa se for legível de fato.

```ts
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
```

- [ ] **Step 5: Rodar e ver falhar**

Run: `cd frontend && pnpm test chart-tokens`
Expected: FAIL. `degrau` vem `''` e não casa o `toMatch`; o contraste dá `1`; a catraca acha
`[]` em vez dos dois permitidos.

- [ ] **Step 6: Declarar os 5 tokens no tema ESCURO (bloco `:root`)**

Em `frontend/src/shared/styles/brand-theme.css`, dentro do bloco `:root`, **logo depois** do bloco
`--tone-neutral-ink: var(--surface-300);` e **antes** de `--divider-stroke`, insira:

```css
  /* Paleta de SÉRIE (D2 do B2). Categórica: distingue datasets, não gradua
   * urgência. Por isso nenhum dos 5 sai dos hues dos `--tone-*-ink`
   * (blue/green/yellow/red) — `certificados_emitidos` desenhado em vermelho
   * diria "perigo" na mesma tela em que alerta e série convivem, que é a
   * alternativa que a D2 rejeitou.
   *
   * Zero hex novo, como o `--brand-gradient`: cada token aponta para um degrau
   * que a rampa do tema JÁ tem, e o degrau muda por tema porque a superfície
   * inverte — a mesma mecânica do `--brand-ink` e dos tons acima.
   *
   * O piso é 3:1, não 4,5:1: traço de gráfico é elemento gráfico, não texto.
   * A ordem 1..4 é a dos hues mais afastados entre si, porque são esses quatro
   * que dividem UM gráfico (as 4 séries de contagem); o 5 desenha a série de UF,
   * que tem eixo próprio. Régua medida: `frontend/tests/chart-tokens.test.ts`. */
  --chart-1: var(--teal-400);
  --chart-2: var(--orange-400);
  --chart-3: var(--purple-400);
  --chart-4: var(--pink-400);
  --chart-5: var(--indigo-400);
```

- [ ] **Step 7: Declarar os 5 tokens no tema CLARO (bloco `html:not(.dark)`)**

No mesmo arquivo, dentro de `html:not(.dark)`, **logo depois** de
`--tone-neutral-ink: var(--surface-400);`, insira:

```css
  /* Degraus do claro. NÃO é o mesmo índice dos quatro tons: o que iguala os
   * cinco é a razão medida sobre `--surface-card`, e o piso aqui é 3:1 —
   * 3,41 (teal-600) / 3,78 (orange-600) / 3,96 (purple-500) / 3,53 (pink-500)
   * / 4,47 (indigo-500). Teal e laranja precisam descer um degrau a mais
   * porque no 500 medem 2,49:1 e 2,80:1 sobre o branco: reprovam. */
  --chart-1: var(--teal-600);
  --chart-2: var(--orange-600);
  --chart-3: var(--purple-500);
  --chart-4: var(--pink-500);
  --chart-5: var(--indigo-500);
```

- [ ] **Step 8: Dar um dono em JS à paleta**

No fim de `frontend/src/shared/styles/tokens.ts`, acrescente:

```ts
/**
 * Tinta de SÉRIE, por índice. Mora aqui pela mesma razão das tintas de
 * severidade acima — uma cor com um dono —, e não junto do gráfico: a catraca
 * de cor do `eslint.config.js` só enxerga `className`, então um hex dentro de
 * um objeto de configuração de gráfico passaria verde (P-36). Com a paleta num
 * módulo só, o call-site passa ÍNDICE de série e nunca nomeia cor (D11).
 *
 * `as const` e não `string[]`: o índice fora de faixa vira erro de tipo em vez
 * de `undefined` virando traço invisível. Régua medida — contraste de 3:1 nos
 * dois temas e 30° de matiz entre quaisquer duas — em
 * `frontend/tests/chart-tokens.test.ts`.
 */
export const chartInks = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
] as const
```

- [ ] **Step 9: Rodar a régua e ver passar**

Run: `cd frontend && pnpm test chart-tokens`
Expected: PASS — 22 casos (5 tokens × 2 asserções × 2 temas = 20, mais "distinguíveis" × 2 temas,
mais o controle do amarelo, mais a catraca; a contagem exata sai do runner e vai para o commit).

- [ ] **Step 10: Gate completo**

```bash
cd frontend && pnpm lint && pnpm build && pnpm test
```
Expected: os três verdes. A contagem de testes sobe da baseline de 223.

- [ ] **Step 11: Commit**

```bash
cd /home/jvbat/projetos/lotus && git add \
  frontend/package.json frontend/pnpm-lock.yaml \
  frontend/src/shared/styles/brand-theme.css \
  frontend/src/shared/styles/tokens.ts \
  frontend/tests/chart-tokens.test.ts
git commit -m "feat(dashboard): paleta de serie com dono e regua de contraste

Recharts entra (D1) e com ele os 5 tokens categoricos --chart-1..5 (D2),
todos apontando para degraus que a rampa do tema ja tem: zero hex novo.

A regua mede razao e matiz, nao confere hex escolhido: 3:1 sobre o card nos
dois temas (traco de grafico e elemento grafico, nao texto) e 30 graus de
matiz entre quaisquer duas series. A catraca de D11 fixa que so brand-theme.css
e tokens.ts nomeiam o token — COR_HARDCODED nao enxerga hex em objeto de
configuracao (P-36)."
```

---

## Task 2: Os dois wrappers de gráfico em `shared/ui`

**Files:**
- Create: `frontend/src/shared/ui/AppLineChart/pivot.ts`
- Create: `frontend/src/shared/ui/AppLineChart/pivot.test.ts`
- Create: `frontend/src/shared/ui/AppLineChart/AppLineChart.tsx`
- Create: `frontend/src/shared/ui/AppLineChart/index.ts`
- Create: `frontend/src/shared/ui/AppBarChart/AppBarChart.tsx`
- Create: `frontend/src/shared/ui/AppBarChart/index.ts`
- Modify: `frontend/src/shared/ui/index.ts`

**Interfaces:**
- Consumes: `chartInks` de `../../styles/tokens` (Task 1).
- Produces:
  ```ts
  export type ChartPoint = { x: string; y: number }
  export type ChartSeries = { key: string; label: string; points: ChartPoint[] }
  export type AppLineChartProps = {
    series: ChartSeries[]
    ariaLabel: string
    height?: number          // default 260
    inkOffset?: number       // default 0 — índice inicial em chartInks
    formatX?: (x: string) => string
    formatY?: (y: number) => string
  }
  export function AppLineChart(props: AppLineChartProps): JSX.Element
  export function pivot(series: ChartSeries[]): Record<string, string | number>[]

  export type BarDatum = { label: string; value: number }
  export type AppBarChartProps = {
    data: BarDatum[]
    ariaLabel: string
    height?: number          // default 260
    inkIndex?: number        // default 0
    formatValue?: (v: number) => string
  }
  export function AppBarChart(props: AppBarChartProps): JSX.Element
  ```

**Por que `pivot` é arquivo próprio e testado:** Recharts consome UMA lista de linhas com uma chave
por série; o contrato natural do call-site é uma lista de séries. A conversão é a única lógica de
verdade dos wrappers, e é pura — então ela é o que se testa. Render de SVG em jsdom não entra: é a
mesma linha de corte do B1 (componente de biblioteca em jsdom fica fora do runner).

- [ ] **Step 1: Escrever o teste do pivot (falhando)**

`frontend/src/shared/ui/AppLineChart/pivot.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { pivot } from './pivot'

describe('pivot', () => {
  it('junta séries pelo eixo x, na ordem em que os x aparecem', () => {
    const linhas = pivot([
      { key: 'a', label: 'A', points: [{ x: '2026-01', y: 1 }, { x: '2026-02', y: 2 }] },
      { key: 'b', label: 'B', points: [{ x: '2026-01', y: 10 }, { x: '2026-02', y: 20 }] },
    ])

    expect(linhas).toEqual([
      { x: '2026-01', a: 1, b: 10 },
      { x: '2026-02', a: 2, b: 20 },
    ])
  })

  // Buraco no MEIO da série é ausência de ponto, não zero: o backend só projeta
  // o mês que tem registro, e desenhar 0 ali afirmaria "aconteceu nada" onde a
  // verdade é "não se sabe". Mesma lei da D7 aplicada dentro da linha.
  it('mês sem registro numa série não vira zero — a chave simplesmente falta', () => {
    const linhas = pivot([
      { key: 'a', label: 'A', points: [{ x: '2026-01', y: 1 }, { x: '2026-03', y: 3 }] },
      { key: 'b', label: 'B', points: [{ x: '2026-02', y: 20 }] },
    ])

    expect(linhas).toEqual([
      { x: '2026-01', a: 1 },
      { x: '2026-03', a: 3 },
      { x: '2026-02', b: 20 },
    ])
  })

  it('ordena o eixo pelo x, não pela ordem de chegada das séries', () => {
    const linhas = pivot([
      { key: 'a', label: 'A', points: [{ x: '2026-03', y: 3 }] },
      { key: 'b', label: 'B', points: [{ x: '2026-01', y: 1 }] },
    ])

    expect(linhas.map((l) => l.x)).toEqual(['2026-01', '2026-03'])
  })

  it('série vazia não cria linha nenhuma', () => {
    expect(pivot([{ key: 'a', label: 'A', points: [] }])).toEqual([])
  })
})
```

**Nota:** o segundo caso e o terceiro se contradizem de propósito na LEITURA — o segundo mostra a
ordem de chegada e o terceiro exige ordenação. Resolva escrevendo o `pivot` **ordenado**, e ajuste a
expectativa do segundo caso para a ordem ordenada (`2026-01`, `2026-02`, `2026-03`) ao ver o
vermelho. O ponto do segundo caso é a **ausência da chave**, não a ordem.

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd frontend && pnpm test pivot`
Expected: FAIL — `Failed to resolve import "./pivot"`.

- [ ] **Step 3: Escrever o pivot**

`frontend/src/shared/ui/AppLineChart/pivot.ts`:

```ts
export type ChartPoint = { x: string; y: number }

export type ChartSeries = {
  /** Chave de dado no gráfico. Precisa ser estável e única entre as séries do
   * MESMO gráfico — é ela que amarra a linha ao ponto depois do pivot. */
  key: string
  /** Rótulo já traduzido. O wrapper não conhece i18n. */
  label: string
  points: ChartPoint[]
}

/**
 * Lista de séries -> lista de linhas, uma por valor de `x`, com uma chave por
 * série. É o formato que o Recharts consome, e a única lógica de verdade dos
 * wrappers — por isso mora fora do componente e é o que se testa.
 *
 * Mês sem registro NÃO vira zero: a chave da série some daquela linha, e o
 * Recharts pula o ponto. O backend só projeta o mês que tem registro, e
 * desenhar 0 ali afirmaria "aconteceu nada" onde a verdade é "não se sabe" —
 * a mesma lei que a D7 aplica à seção inteira, aqui dentro da linha.
 *
 * A ordenação é do `x` como string: o backend manda `YYYY-MM`
 * (`AnalyticsQuery.php:230`), formato em que a ordem lexicográfica É a
 * cronológica. Ordenar por data exigiria parse e traria fuso para dentro de um
 * módulo que não tem nada com isso.
 */
export function pivot(series: ChartSeries[]): Record<string, string | number>[] {
  const porX = new Map<string, Record<string, string | number>>()

  for (const serie of series) {
    for (const ponto of serie.points) {
      const linha = porX.get(ponto.x) ?? { x: ponto.x }
      linha[serie.key] = ponto.y
      porX.set(ponto.x, linha)
    }
  }

  return [...porX.values()].sort((a, b) => String(a.x).localeCompare(String(b.x)))
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `cd frontend && pnpm test pivot`
Expected: PASS, 4 casos.

- [ ] **Step 5: Escrever o `AppLineChart`**

`frontend/src/shared/ui/AppLineChart/AppLineChart.tsx`:

```tsx
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { chartInks } from '../../styles/tokens'
import { pivot } from './pivot'
import type { ChartSeries } from './pivot'

export type { ChartPoint, ChartSeries } from './pivot'
export { pivot } from './pivot'

export type AppLineChartProps = {
  series: ChartSeries[]
  /** Rótulo acessível do gráfico inteiro. Obrigatório: SVG sem nome é uma
   * mancha para leitor de tela, e o `<title>` do Recharts não cobre o container. */
  ariaLabel: string
  height?: number
  /** Índice inicial em `chartInks`. Existe para dois gráficos IRMÃOS na mesma
   * tela não abrirem os dois no mesmo tom. O call-site passa índice, nunca
   * cor (D11). */
  inkOffset?: number
  formatX?: (x: string) => string
  formatY?: (y: number) => string
}

/**
 * Gráfico de linha. SVG, e é o motivo da escolha (D1): `stroke="var(--chart-N)"`
 * é resolvido pelo próprio CSS, então a troca de tema — que acontece trocando o
 * `href` de um `<link>`, sem re-render React (`primeTheme.ts:15`) — repinta o
 * traço sozinha. Em canvas a cor é lida em JS e congela até alguém forçar
 * redraw.
 *
 * Toda a cor sai de `chartInks` por índice: este arquivo e o irmão de barra são
 * os únicos componentes que a consomem, e nenhum call-site nomeia token (D11).
 * Cor de eixo, grade e tooltip vêm das vars do tema pelo mesmo motivo.
 */
export function AppLineChart({
  series,
  ariaLabel,
  height = 260,
  inkOffset = 0,
  formatX,
  formatY,
}: AppLineChartProps) {
  const linhas = pivot(series)

  return (
    <div role="img" aria-label={ariaLabel} style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={linhas} margin={{ top: 8, right: 16, bottom: 0, left: -8 }}>
          <CartesianGrid stroke="var(--surface-border)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="x"
            tickFormatter={formatX}
            tick={{ fill: 'var(--text-color-secondary)', fontSize: 12 }}
            stroke="var(--surface-border)"
          />
          <YAxis
            tickFormatter={formatY}
            allowDecimals={false}
            tick={{ fill: 'var(--text-color-secondary)', fontSize: 12 }}
            stroke="var(--surface-border)"
          />
          <Tooltip
            formatter={(valor: number) => (formatY ? formatY(valor) : valor)}
            contentStyle={{
              background: 'var(--surface-card)',
              border: '1px solid var(--surface-border)',
              borderRadius: '6px',
              color: 'var(--text-color)',
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12, color: 'var(--text-color-secondary)' }} />
          {series.map((serie, i) => (
            <Line
              key={serie.key}
              type="monotone"
              dataKey={serie.key}
              name={serie.label}
              stroke={chartInks[(inkOffset + i) % chartInks.length]}
              strokeWidth={2}
              dot={false}
              // Buraco no meio da série não vira zero — o pivot omite a chave e
              // esta prop faz o Recharts pular o ponto em vez de fechá-lo em 0.
              connectNulls={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
```

- [ ] **Step 6: Escrever o `AppBarChart`**

`frontend/src/shared/ui/AppBarChart/AppBarChart.tsx`:

```tsx
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { chartInks } from '../../styles/tokens'

export type BarDatum = { label: string; value: number }

export type AppBarChartProps = {
  data: BarDatum[]
  ariaLabel: string
  height?: number
  /** Índice em `chartInks`. Índice, nunca cor (D11). */
  inkIndex?: number
  formatValue?: (v: number) => string
}

/**
 * Barra HORIZONTAL (`layout="vertical"` no vocabulário do Recharts: é o eixo
 * de categoria que fica na vertical). Ranking tem rótulo longo — nome de curso
 * e razão social de cliente —, e em barra vertical esse rótulo só cabe girado
 * ou truncado. Deitada, ele ocupa uma faixa de largura fixa e é lido na
 * horizontal como qualquer outro texto da tela.
 *
 * Mesma tese de cor do irmão de linha: tudo por `chartInks` e vars do tema, e
 * o call-site passa índice.
 */
export function AppBarChart({ data, ariaLabel, height = 260, inkIndex = 0, formatValue }: AppBarChartProps) {
  return (
    <div role="img" aria-label={ariaLabel} style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 8, right: 24, bottom: 0, left: 8 }}>
          <CartesianGrid stroke="var(--surface-border)" strokeDasharray="3 3" horizontal={false} />
          <XAxis
            type="number"
            allowDecimals={false}
            tickFormatter={formatValue}
            tick={{ fill: 'var(--text-color-secondary)', fontSize: 12 }}
            stroke="var(--surface-border)"
          />
          <YAxis
            type="category"
            dataKey="label"
            width={160}
            tick={{ fill: 'var(--text-color-secondary)', fontSize: 12 }}
            stroke="var(--surface-border)"
          />
          <Tooltip
            cursor={{ fill: 'var(--surface-hover)' }}
            formatter={(valor: number) => (formatValue ? formatValue(valor) : valor)}
            contentStyle={{
              background: 'var(--surface-card)',
              border: '1px solid var(--surface-border)',
              borderRadius: '6px',
              color: 'var(--text-color)',
            }}
          />
          <Bar dataKey="value" fill={chartInks[inkIndex % chartInks.length]} radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
```

- [ ] **Step 7: Os dois barris de pasta e o barril raiz**

`frontend/src/shared/ui/AppLineChart/index.ts`:

```ts
export * from './AppLineChart'
```

`frontend/src/shared/ui/AppBarChart/index.ts`:

```ts
export * from './AppBarChart'
```

Em `frontend/src/shared/ui/index.ts`, acrescente as duas linhas em ordem alfabética — `AppBarChart`
logo depois de `AppAvatar`, e `AppLineChart` logo depois de `AppInputText`:

```ts
export * from './AppBarChart'
```
```ts
export * from './AppLineChart'
```

- [ ] **Step 8: Provar que a catraca da D11 continua fechada**

Run: `cd frontend && pnpm test chart-tokens`
Expected: PASS. Os dois wrappers consomem `chartInks` e **não** escrevem `--chart-`, então a lista
de infratores segue com os dois arquivos permitidos. Se falhar, algum wrapper escreveu o token
direto — troque por `chartInks[i]`.

- [ ] **Step 9: Gate completo**

```bash
cd frontend && pnpm lint && pnpm build && pnpm test
```
Expected: os três verdes. `pnpm build` é o que prova que o Recharts tipa contra o TS 6.0/React 19
neste uso concreto — não só que a peer aceita a versão.

- [ ] **Step 10: Commit**

```bash
cd /home/jvbat/projetos/lotus && git add \
  frontend/src/shared/ui/AppLineChart frontend/src/shared/ui/AppBarChart \
  frontend/src/shared/ui/index.ts
git commit -m "feat(shared/ui): AppLineChart e AppBarChart sobre Recharts

Os dois unicos componentes que consomem chartInks, e por indice: o call-site
nunca nomeia cor (D11). Cor de eixo, grade e tooltip saem das vars do tema,
entao a troca de tema por href de <link> repinta tudo sem JS.

O pivot de series para linhas mora fora do componente e e o que se testa —
render de SVG em jsdom fica de fora, mesmo corte do B1. Mes sem registro nao
vira zero: a chave some da linha e connectNulls={false} pula o ponto."
```

---

## Task 3: O hook discrimina as duas views e para de perder a tela na troca de janela

**Files:**
- Modify: `frontend/src/app/pages/Dashboard/useDashboard.ts`
- Modify: `frontend/src/app/pages/Dashboard/useDashboard.test.tsx`
- Modify: `frontend/src/app/pages/Dashboard/DashboardPage.tsx:103,121` (só o que o tipo obriga)

**Interfaces:**
- Consumes: nada das tasks anteriores.
- Produces:
  ```ts
  export type DashboardState =
    | { kind: 'loading' }
    | { kind: 'error'; error: ProblemDetails; retry: () => void }
    | { kind: 'unauthorized' }
    | { kind: 'ready-admin'; data: AdminDashboardData; staleError: string | null; retry: () => void }
    | { kind: 'ready-redator'; data: RedatorDashboardData; staleError: string | null; retry: () => void }
  ```
  `kind: 'unsupported'` **deixa de existir**. `useDashboard(period?)` mantém a assinatura.

- [ ] **Step 1: Escrever os 3 cenários novos, e trocar `'ready'` por `'ready-admin'` nos 6 que já existem**

Em `frontend/src/app/pages/Dashboard/useDashboard.test.tsx`:

(a) acrescente o import e a fábrica do payload do Redator, logo depois de `semNenhumaSecao`:

```tsx
import type { AdminDashboardData, RedatorDashboardData } from '@shared/types/generated'
```

```tsx
/** As 6 chaves do contrato do Redator, nenhuma anulável (`generated.ts:376-383`).
 * É o que faz o Redator NÃO ter `unauthorized`: não existe payload dele
 * "fechado" — ou ele é redator, ou o backend manda a view do admin. */
function redator(overrides: Partial<RedatorDashboardData> = {}): RedatorDashboardData {
  return {
    view: 'redator',
    resumo: {
      turmas_em_andamento: 2,
      proximas_turmas: 1,
      pendencias_documentais: 3,
      documentos_vencendo: 0,
    },
    agenda: { starting_soon: [], ending_soon: [], in_progress: [], overdue: [] },
    pendencias_documentais: [],
    alertas_documentos: [],
    historico: { turmas_concluidas: 9, certificados_emitidos: 41 },
    ...overrides,
  }
}
```

(b) **substitua** cada `'ready'` por `'ready-admin'` nos 6 casos existentes. São 12 ocorrências
(`toBe('ready')` e `!== 'ready'`) nas linhas 79, 80, 103, 106, 114, 117, 176, 177 e vizinhas. O
teste da linha 145 (`unauthorized`) e o da 91 (`error`) não mudam de literal.

(c) acrescente os 3 casos novos no fim do `describe`:

```tsx
  // Cenário 1 da spec: o contrato é união discriminada por `view`, e a
  // discriminação acontece UMA vez, no hook. A página nunca re-estreita (D3).
  it('payload de redator vira kind próprio, com o DTO já estreitado', async () => {
    get.mockResolvedValue({ data: redator() })

    const { result } = renderHook(() => useDashboard(), { wrapper })

    await waitFor(() => expect(result.current.kind).toBe('ready-redator'))
    if (result.current.kind !== 'ready-redator') throw new Error('esperava kind ready-redator')
    expect(result.current.data.historico.certificados_emitidos).toBe(41)
    expect(result.current.staleError).toBeNull()
  })

  // Cenário 3: a query key varia pelo período (`useDashboard.ts:17-18`), então
  // trocar a janela cria key NOVA e `query.data` volta `undefined`. Sem piso, a
  // tela pisca em branco a cada troca.
  it('trocar a janela mantém o dado anterior enquanto o novo não chega', async () => {
    get.mockResolvedValue({ data: admin() })

    const { result, rerender } = renderHook(
      ({ p }: { p: { start: string; end: string } }) => useDashboard(p),
      { wrapper, initialProps: { p: { start: '2026-01-01', end: '2026-06-30' } } },
    )
    await waitFor(() => expect(result.current.kind).toBe('ready-admin'))

    get.mockImplementation(() => new Promise(() => {}))
    rerender({ p: { start: '2026-07-01', end: '2026-12-31' } })

    // A key nova está pendente e NUNCA resolve. A tela não pode virar skeleton.
    expect(result.current.kind).toBe('ready-admin')
    if (result.current.kind !== 'ready-admin') throw new Error('esperava kind ready-admin')
    expect(result.current.data.kpis.turmas_em_andamento).toBe(4)
  })

  // Cenário 4, e o que a D6 existe para impedir: janela invertida sobe 422
  // (`DashboardFilterData.php`), e sem piso a tela INTEIRA virava AppErrorState
  // por um erro de digitação no filtro. `staleError` não alcançava, porque o
  // cache é da key ANTIGA.
  it('falha na troca de janela mantém o dado anterior e vira aviso, não tela de erro', async () => {
    get.mockResolvedValue({ data: admin() })

    const { result, rerender } = renderHook(
      ({ p }: { p: { start: string; end: string } }) => useDashboard(p),
      { wrapper, initialProps: { p: { start: '2026-01-01', end: '2026-06-30' } } },
    )
    await waitFor(() => expect(result.current.kind).toBe('ready-admin'))

    get.mockRejectedValue(problem('La fecha de término no puede ser anterior a la de inicio.'))
    rerender({ p: { start: '2026-12-31', end: '2026-01-01' } })

    await waitFor(() => {
      if (result.current.kind !== 'ready-admin') throw new Error('a tela não pode virar erro com dado em mão')
      expect(result.current.staleError).toBe('La fecha de término no puede ser anterior a la de inicio.')
    })
    if (result.current.kind !== 'ready-admin') throw new Error('esperava kind ready-admin')
    expect(result.current.data.kpis.turmas_em_andamento).toBe(4)
  })
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd frontend && pnpm test useDashboard`
Expected: FAIL. Os 6 casos adaptados falham porque o hook ainda devolve `'ready'`; o cenário 1
recebe `'unsupported'`; os cenários 3 e 4 recebem `'loading'` e `'error'`.

- [ ] **Step 3: Reescrever o hook**

Em `frontend/src/app/pages/Dashboard/useDashboard.ts`:

(a) acrescente `useRef` ao import do React (o arquivo hoje não importa nada de `react`; a linha
entra no topo):

```ts
import { useRef } from 'react'
```

(b) **substitua** o bloco `export type DashboardState = …` (linhas 23-37) por:

```ts
/**
 * O que a tela pode ser. Cada `kind` tem um ramo de render próprio e nenhum se
 * confunde com outro — falha, vazio de verdade e "sem permissão" dizem coisas
 * diferentes sobre o banco, e trocar um pelo outro faz a tela mentir.
 *
 * `unauthorized` não é `empty`: a tela não está vazia, ela está fechada. E ela
 * mede SÓ o ramo admin: as 6 chaves de `RedatorDashboardData` são não-anuláveis
 * (`generated.ts:376-383`), então não existe payload de redator "fechado".
 *
 * Dois `kind` de pronto e nenhum `unsupported` (D3 do B2): a discriminação por
 * `view` acontece AQUI, uma vez, e a página recebe o DTO já estreitado. O ramo
 * `unsupported` morreu junto com a ausência de tela do Redator — ramo que não
 * dispara é órfão, e o review do B1 já matou três.
 */
export type DashboardState =
  | { kind: 'loading' }
  | { kind: 'error'; error: ProblemDetails; retry: () => void }
  | { kind: 'unauthorized' }
  | { kind: 'ready-admin'; data: AdminDashboardData; staleError: string | null; retry: () => void }
  | { kind: 'ready-redator'; data: RedatorDashboardData; staleError: string | null; retry: () => void }
```

(c) **substitua** o corpo de `useDashboard` (linhas 77-116) por:

```ts
export function useDashboard(period?: DashboardPeriod): DashboardState {
  const query = useQuery<DashboardPayload, ProblemDetails>({
    queryKey: dashboardKeys.metrics(period),
    queryFn: () =>
      api
        .get<DashboardPayload>('/api/dashboard/metricas', {
          params: { period_start: period?.start, period_end: period?.end },
        })
        .then((r) => r.data),
  })

  /**
   * Piso da tela: o último payload que chegou bom, de QUALQUER janela (D6).
   *
   * A query key varia pelo período (`:17-18`), então trocar a janela cria key
   * nova e `query.data` volta `undefined` — a tela inteira viraria
   * `AppErrorState` por um erro de digitação no filtro, e `staleError` não
   * alcança porque o cache é da key antiga.
   *
   * `placeholderData: keepPreviousData` NÃO resolve isso, medido: o observador
   * da 5.101.1 só aplica o placeholder com `status === 'pending'`
   * (`query-core/src/queryObserver.ts:486-491`), e o fetch que falha vira
   * `'error'`. Ele cobre a troca normal e não cobre a falhada, que é
   * justamente a metade que a D6 existe para cobrir. Um piso só cobre as duas,
   * e dois mecanismos para a mesma verdade é o defeito que este repositório já
   * pagou três vezes (Emenda 2 da spec).
   *
   * A escrita durante o render é idempotente — atribui o mesmo objeto que o
   * cache já guarda —, então o duplo render do StrictMode não muda nada.
   */
  const ultimoPayload = useRef<DashboardPayload | undefined>(undefined)
  if (query.data !== undefined) ultimoPayload.current = query.data

  const retry = () => {
    void query.refetch()
  }

  const data = query.data ?? ultimoPayload.current

  // Nada em mão, nem desta janela nem de nenhuma anterior. É AQUI que a falha
  // pode substituir a tela.
  if (data === undefined) {
    if (query.isError) {
      // `{}` quando o interceptor não populou o corpo: `isError` sem `error`
      // ainda é falha, e devolver `loading` a esconderia. Mesmo tratamento do
      // `useLoadState`.
      return { kind: 'error', error: query.error ?? ({} as ProblemDetails), retry }
    }
    return { kind: 'loading' }
  }

  // Com dado em mão, a falha do refetch é aviso AO LADO — a tela continua
  // utilizável (lição do BD-6).
  const staleError = query.isError ? (query.error?.detail ?? null) : null

  if (data.view === 'redator') return { kind: 'ready-redator', data, staleError, retry }
  if (nenhumaSecaoLegivel(data)) return { kind: 'unauthorized' }

  return { kind: 'ready-admin', data, staleError, retry }
}
```

(d) no docblock de `DashboardPeriod` (linhas 6-7), a frase "e a UI dele não (D5)" ficou falsa — a UI
chega na Task 6. Troque por:

```ts
/** Janela histórica. Só séries e rankings a respeitam (D3 do bloco A). A UI do
 * seletor mora em `admin/PeriodFilter.tsx` (D5 do B2). */
```

- [ ] **Step 4: Rodar e ver passar**

Run: `cd frontend && pnpm test useDashboard`
Expected: PASS, 9 casos (os 6 de antes + 3 novos).

- [ ] **Step 5: Fazer a página compilar de novo**

Em `frontend/src/app/pages/Dashboard/DashboardPage.tsx`:

- **apague** as linhas 101-103 inteiras (o comentário de 2 linhas e o
  `if (state.kind === 'unsupported') return <div>{header}</div>`);
- na linha 121, troque `const { data } = state` por:

```tsx
  // A view do Redator chega na Task 10; até lá o ramo dela renderiza só o
  // cabeçalho, como o `unsupported` fazia — mas agora com o tipo certo.
  if (state.kind === 'ready-redator') return <div>{header}</div>

  const { data } = state
```

- [ ] **Step 6: Gate completo**

```bash
cd frontend && pnpm lint && pnpm build && pnpm test
```
Expected: os três verdes. `pnpm build` é o que prova que nenhum outro consumidor de `'ready'` ficou
para trás — `index.ts` só exporta a página, então o único consumidor é `DashboardPage.tsx`.

- [ ] **Step 7: Commit**

```bash
cd /home/jvbat/projetos/lotus && git add \
  frontend/src/app/pages/Dashboard/useDashboard.ts \
  frontend/src/app/pages/Dashboard/useDashboard.test.tsx \
  frontend/src/app/pages/Dashboard/DashboardPage.tsx
git commit -m "feat(dashboard): hook discrimina admin e redator e nao perde a tela na troca de janela

D3: dois kind de pronto, cada um com o DTO ja estreitado; unsupported morre,
porque ramo que nao dispara e orfao.

D6, emendada: o piso e o ultimo payload bom, nao placeholderData. Medido no
queryObserver 5.101.1 (:486-491), o placeholder so vale com status pending —
cobre a troca normal e nao cobre a falhada, que e a metade que a D6 existe
para cobrir. Um mecanismo cobre as duas."
```

---

## Task 4: A fronteira de pasta espelha a fronteira de `kind`

**Files:**
- Create: `frontend/src/app/pages/Dashboard/SectionLabel.tsx` (Emenda 1)
- Create: `frontend/src/app/pages/Dashboard/DashboardSkeleton.tsx` (Emenda 1)
- Create: `frontend/src/app/pages/Dashboard/admin/AdminView.tsx` (Emenda 1)
- Create: `frontend/src/app/pages/Dashboard/admin/kpiCards.ts`
- Create: `frontend/src/app/pages/Dashboard/admin/kpiCards.test.ts`
- Move: `PendingList.tsx` e `PipelineFunnel.tsx` → `admin/` (com `git mv`)
- Modify: `KpiRow.tsx`, `AgendaPanel.tsx`, `DashboardPage.tsx`

**Interfaces:**
- Consumes: `DashboardState` da Task 3.
- Produces:
  ```ts
  // SectionLabel.tsx
  export function SectionLabel({ children }: { children: ReactNode }): JSX.Element
  // DashboardSkeleton.tsx
  export function DashboardSkeleton(): JSX.Element
  // KpiRow.tsx  — render genérico, a derivação sai (D13)
  export type Kpi = { key: string; value: string; hint?: { i18nKey: string; value: string }; tone: AppCardTone }
  export function KpiRow({ items }: { items: Kpi[] }): JSX.Element | null
  // admin/kpiCards.ts
  export function kpiCards(k: AdminKpisData): Kpi[]
  // AgendaPanel.tsx — genérico sobre a linha (D13)
  export type AgendaLinha = { turma_id: number; course_name: string; start_date: string; end_date: string; client_name?: string | null }
  export type AgendaJanelas<L extends AgendaLinha> = { starting_soon: L[]; ending_soon: L[]; in_progress: L[]; overdue: L[] }
  export function AgendaPanel<L extends AgendaLinha>({ agenda }: { agenda: AgendaJanelas<L> }): JSX.Element
  // admin/AdminView.tsx
  export function AdminView({ data }: { data: AdminDashboardData }): JSX.Element
  ```

**Por que o `AdminView` entra aqui e não na §4 da spec:** ver **Emenda 1**. A régua da Task 5 exige a
página abaixo de 150 linhas e ela tem 159 hoje, antes das 4 seções novas.

- [ ] **Step 1: Escrever o teste da derivação de KPI (cenário 5), falhando**

`frontend/src/app/pages/Dashboard/admin/kpiCards.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { kpiCards } from './kpiCards'
import type { AdminKpisData } from '@shared/types/generated'

const cheio: AdminKpisData = {
  turmas_em_andamento: 4,
  turmas_encerrando_em_breve: 1,
  turmas_atrasadas: 0,
  conclusoes_por_confirmar: 2,
  cotacoes: { pending_count: 3, pending_value_uf: '450.0000' },
  certificados_a_emitir: 5,
}

describe('kpiCards', () => {
  // A chave é a chave i18n COMPLETA, não um sufixo montado dentro do render.
  // Ver a nota "A chave i18n do KPI" no Step 5 — vira a Emenda 3 da spec.
  it('os 6 KPIs viram 6 cards, na ordem do contrato', () => {
    expect(kpiCards(cheio).map((c) => c.key)).toEqual([
      'dashboard.kpi.turmasEmAndamento',
      'dashboard.kpi.turmasEncerrandoEmBreve',
      'dashboard.kpi.turmasAtrasadas',
      'dashboard.kpi.conclusoesPorConfirmar',
      'dashboard.kpi.cotacoesPendentes',
      'dashboard.kpi.certificadosAEmitir',
    ])
  })

  // A lei do bloco A: o backend manda `null` justamente para a tela não ter
  // como mentir. Zero no lugar de "não posso ler" seria a mentira (D6 do B1).
  it('campo null não vira card', () => {
    const cards = kpiCards({ ...cheio, turmas_atrasadas: null, cotacoes: null })
    expect(cards.map((c) => c.key)).toEqual([
      'dashboard.kpi.turmasEmAndamento',
      'dashboard.kpi.turmasEncerrandoEmBreve',
      'dashboard.kpi.conclusoesPorConfirmar',
      'dashboard.kpi.certificadosAEmitir',
    ])
  })

  // ZERO não é null: o KPI de turmas atrasadas vale 0 no seed, e some-lo
  // esconderia a informação mais tranquilizadora da tela.
  it('zero vira card — só null some', () => {
    expect(kpiCards(cheio).find((c) => c.key === 'dashboard.kpi.turmasAtrasadas')?.value).toBe('0')
  })

  it('a cotação leva o valor em UF como grandeza secundária do mesmo card', () => {
    const cotacoes = kpiCards(cheio).find((c) => c.key === 'dashboard.kpi.cotacoesPendentes')
    expect(cotacoes?.value).toBe('3')
    expect(cotacoes?.hint).toEqual({ i18nKey: 'dashboard.kpi.cotacoesValor', value: '450' })
  })

  // O contrato tem 6 chaves e a derivação é medida por `Object.values` no hook.
  // Se o backend ganhar um KPI e esta lista não, o teste cai aqui em vez de a
  // tela esconder o campo novo em silêncio.
  it('a derivação cobre todas as chaves do contrato', () => {
    expect(kpiCards(cheio)).toHaveLength(Object.keys(cheio).length)
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd frontend && pnpm test kpiCards`
Expected: FAIL — `Failed to resolve import "./kpiCards"`.

- [ ] **Step 3: Criar a pasta `admin/` e mover os dois componentes com histórico**

```bash
cd /home/jvbat/projetos/lotus/frontend/src/app/pages/Dashboard && mkdir -p admin redator && \
git mv PendingList.tsx admin/PendingList.tsx && \
git mv PipelineFunnel.tsx admin/PipelineFunnel.tsx && \
git status --short
```
Expected: duas linhas `R  frontend/src/app/pages/Dashboard/…`.

Em `admin/PendingList.tsx`, reaponte os dois imports relativos (linhas 4-5):

```tsx
import { DashboardItemRow } from '../DashboardItemRow'
import { pendingItemRoute } from '../navigation'
```

`admin/PipelineFunnel.tsx` só importa de `@shared/*` — nada a reapontar.

- [ ] **Step 4: Extrair a derivação para `admin/kpiCards.ts`**

`frontend/src/app/pages/Dashboard/admin/kpiCards.ts` — o corpo é o `cards` que hoje mora em
`KpiRow.tsx:30-58`, sem uma linha de lógica nova:

```ts
import { formatUf } from '@shared/lib'
import type { AdminKpisData } from '@shared/types/generated'
import type { Kpi } from '../KpiRow'

/**
 * Campo `null` NÃO vira card (D6 do B1). Nada de zero no lugar do que não pode
 * ser lido — essa é a lei do bloco A, e o backend passou a mandar `null`
 * justamente para a tela não ter como mentir — e nada de rótulo "sem acesso",
 * que poluiria a tela de quem nunca terá o módulo. É o mesmo padrão que o
 * Sidebar já aplica ao filtrar item por permissão.
 *
 * Saiu do `KpiRow` porque o segundo consumidor chegou: o render já era genérico
 * sobre `Kpi[]` e só esta derivação era do admin, então o Redator escreve a
 * dele em `redator/resumoCards.ts` e ninguém abstrai nada de especulativo
 * (D13, lição 3).
 *
 * A chave é a chave i18n COMPLETA. O `KpiRow` montava `dashboard.kpi.${key}`
 * dentro do render, e com o segundo consumidor esse prefixo implícito quebra:
 * as chaves do Redator vivem em `dashboard.redator.kpi.*`. É a mesma correção
 * que o Q-1 do review de 2026-08-16 já fez neste arquivo — derivação não
 * escapa do módulo puro para dentro do JSX (Emenda 3 da spec).
 */
export function kpiCards(k: AdminKpisData): Kpi[] {
  const lista: Kpi[] = []

  if (k.turmas_em_andamento !== null) {
    lista.push({ key: 'dashboard.kpi.turmasEmAndamento', value: String(k.turmas_em_andamento), tone: 'info' })
  }
  if (k.turmas_encerrando_em_breve !== null) {
    lista.push({
      key: 'dashboard.kpi.turmasEncerrandoEmBreve',
      value: String(k.turmas_encerrando_em_breve),
      tone: 'warning',
    })
  }
  if (k.turmas_atrasadas !== null) {
    lista.push({ key: 'dashboard.kpi.turmasAtrasadas', value: String(k.turmas_atrasadas), tone: 'danger' })
  }
  if (k.conclusoes_por_confirmar !== null) {
    lista.push({
      key: 'dashboard.kpi.conclusoesPorConfirmar',
      value: String(k.conclusoes_por_confirmar),
      tone: 'warning',
    })
  }
  if (k.cotacoes !== null) {
    lista.push({
      key: 'dashboard.kpi.cotacoesPendentes',
      value: String(k.cotacoes.pending_count),
      hint: { i18nKey: 'dashboard.kpi.cotacoesValor', value: formatUf(k.cotacoes.pending_value_uf) },
      tone: 'neutral',
    })
  }
  if (k.certificados_a_emitir !== null) {
    lista.push({ key: 'dashboard.kpi.certificadosAEmitir', value: String(k.certificados_a_emitir), tone: 'info' })
  }

  return lista
}
```

- [ ] **Step 5: Deixar o `KpiRow` só com o render**

**A chave i18n do KPI passa a ser completa (Emenda 3).** `KpiRow` montava
`dashboard.kpi.${kpi.key}` dentro do render. Com o Redator como segundo consumidor — chaves em
`dashboard.redator.kpi.*` — o prefixo implícito quebra, e a alternativa (uma prop de prefixo) põe
metade da chave no call-site e metade no render. É a mesma correção que o Q-1 do review de
2026-08-16 já fez neste arquivo: derivação não escapa do módulo puro para dentro do JSX.

Em `frontend/src/app/pages/Dashboard/KpiRow.tsx`:

- **apague** as linhas 4-5 (`import { formatUf }` e `import type { AdminKpisData }`) e a função
  `cards` inteira (linhas 19-58, incluindo o docblock dela — ele foi para `kpiCards.ts`);
- **exporte** o tipo `Kpi` (linha 7: `type Kpi = {` → `export type Kpi = {`) e troque o comentário
  do campo `key` (linhas 8-9) por:

```tsx
  /** Chave i18n COMPLETA — `dashboard.kpi.*` no admin, `dashboard.redator.kpi.*`
   * no Redator. Completa e não sufixo: com dois consumidores, um prefixo
   * montado dentro do render põe metade da chave no módulo puro e metade no
   * JSX (Emenda 3). Serve também de `key` do React: é única por card. */
```

- **substitua** a assinatura e as duas primeiras linhas do corpo (linhas 60-64) por:

```tsx
/**
 * Fileira de contadores. Genérico sobre `Kpi[]` desde o B1 — só a DERIVAÇÃO era
 * do admin, e ela saiu para `admin/kpiCards.ts` quando o segundo consumidor
 * chegou (D13). O Redator monta duas instâncias, resumo e histórico, cada uma
 * com sua faixa de seção.
 */
export function KpiRow({ items }: { items: Kpi[] }) {
  const { t } = useTranslation()

  if (items.length === 0) return null
```

- troque `{lista.map((kpi) => (` por `{items.map((kpi) => (`;
- troque `{t(\`dashboard.kpi.${kpi.key}\`)}` (linha 94) por `{t(kpi.key)}`.

- [ ] **Step 6: Rodar o teste da derivação e ver passar**

Run: `cd frontend && pnpm test kpiCards`
Expected: PASS, 5 casos.

- [ ] **Step 7: Tornar o `AgendaPanel` genérico sobre a linha (D13)**

`AgendaData` e `RedatorAgendaData` têm as mesmas 4 janelas; a linha difere em **exatamente um
campo**, `client_name`, que o Redator não pode ver. Genérico, o ownership vira consequência do
tipo — não condicional de tela.

Em `frontend/src/app/pages/Dashboard/AgendaPanel.tsx`:

- **substitua** a linha 6 (`import type { AgendaData, AgendaTurmaData } …`) por:

```tsx
/**
 * A linha mínima que o painel sabe desenhar. `client_name` é OPCIONAL, e é o
 * único campo em que `AgendaTurmaData` e `RedatorAgendaTurmaData` divergem
 * (`generated.ts:29-35` × `:370-375`): o Redator não pode ver cliente.
 *
 * Genérico e não condicional de tela: assim o ownership é consequência do
 * TIPO — passar o payload do Redator não dá acesso a um campo que ele não tem,
 * e nenhum `if` de papel mora no render (D13).
 */
export type AgendaLinha = {
  turma_id: number
  course_name: string
  start_date: string
  end_date: string
  client_name?: string | null
}

export type AgendaJanelas<L extends AgendaLinha> = {
  starting_soon: L[]
  ending_soon: L[]
  in_progress: L[]
  overdue: L[]
}
```

- na linha 15, troque `keyof AgendaData` por `keyof AgendaJanelas<AgendaLinha>`;
- na linha 28, troque a assinatura de `TurmaLinha` por
  `function TurmaLinha({ turma }: { turma: AgendaLinha })`;
- na linha 60, troque a assinatura do painel por:

```tsx
export function AgendaPanel<L extends AgendaLinha>({ agenda }: { agenda: AgendaJanelas<L> }) {
```

O corpo não muda: `turma.client_name && (…)` já era o guarda, e agora ele é o tipo.

- [ ] **Step 8: Extrair `SectionLabel` e `DashboardSkeleton` (Emenda 1)**

`frontend/src/app/pages/Dashboard/SectionLabel.tsx` — **mova** o bloco de `DashboardPage.tsx:29-56`
inteiro (docblock incluído), acrescentando o import:

```tsx
import type { ReactNode } from 'react'
```

e trocando `function SectionLabel` por `export function SectionLabel`.

`frontend/src/app/pages/Dashboard/DashboardSkeleton.tsx` — **mova** o bloco de
`DashboardPage.tsx:12-27`, acrescentando o import e o `export`:

```tsx
import { AppSkeleton } from '@shared/ui'
```

```tsx
export function DashboardSkeleton() {
```

- [ ] **Step 9: Criar o `admin/AdminView.tsx` com o que era o corpo do ramo `ready` da página**

`frontend/src/app/pages/Dashboard/admin/AdminView.tsx`:

```tsx
import { useTranslation } from 'react-i18next'
import type { AdminDashboardData } from '@shared/types/generated'
import { SectionLabel } from '../SectionLabel'
import { KpiRow } from '../KpiRow'
import { AlertList } from '../AlertList'
import { AgendaPanel } from '../AgendaPanel'
import { kpiCards } from './kpiCards'
import { PendingList } from './PendingList'
import { PipelineFunnel } from './PipelineFunnel'

/**
 * Composição do administrador. Saiu do `DashboardPage` porque a página é o
 * roteador de `kind` (D3) e as duas views compõem a própria pasta (D4) — e
 * porque a régua da D8 não caberia com as duas responsabilidades no mesmo
 * arquivo (Emenda 1 da spec).
 *
 * Layout "torre" (D16 do B1): fileira de KPIs; abaixo, pendências e alertas
 * LADO A LADO — as duas listas que respondem "o que faço agora", na primeira
 * tela; abaixo, agenda e pipeline, que são leitura de contexto. Em telas
 * estreitas as colunas empilham.
 */
export function AdminView({ data }: { data: AdminDashboardData }) {
  const { t } = useTranslation()

  return (
    <div className="space-y-6">
      <KpiRow items={kpiCards(data.kpis)} />

      <section className="space-y-3">
        <SectionLabel>{t('dashboard.section.action')}</SectionLabel>
        {/* Duas colunas só a partir de `xl`. Em `lg` a sidebar ainda está
          * expandida (256px) e cada card caía para ~343px, truncando os 7
          * rótulos de pendência; em 1280 a truncagem some (UI-04 da revisão de
          * 2026-08-16). */}
        <div className="grid gap-4 xl:grid-cols-2">
          <PendingList items={data.pendencias} />
          <AlertList items={data.alertas} />
        </div>
      </section>

      {/* Seção nula por gate não renderiza (D7) — e a faixa some junto quando
        * as DUAS somem, senão o rótulo anunciaria um bloco vazio. */}
      {(data.agenda !== null || data.pipeline !== null) && (
        <section className="space-y-3">
          <SectionLabel>{t('dashboard.section.context')}</SectionLabel>
          <div className="space-y-4">
            {data.agenda !== null && <AgendaPanel agenda={data.agenda} />}
            {data.pipeline !== null && <PipelineFunnel stages={data.pipeline} />}
          </div>
        </section>
      )}
    </div>
  )
}
```

- [ ] **Step 10: Encolher o `DashboardPage.tsx` ao roteador de `kind`**

**Substitua o arquivo inteiro** por:

```tsx
import { useTranslation } from 'react-i18next'
import { PageHeader, AppErrorState, AppEmptyState, InlineLoadState } from '@shared/ui'
import { useSessionStore } from '@shared/stores/sessionStore'
import { useDashboard } from './useDashboard'
import { DashboardSkeleton } from './DashboardSkeleton'
import { AdminView } from './admin/AdminView'

/**
 * Roteador de `kind` do Dashboard, e só isso (D3/D4). A query e a política de
 * estado moram em `useDashboard`; cada view compõe a própria pasta.
 */
export function DashboardPage() {
  const { t } = useTranslation()
  const user = useSessionStore((s) => s.user)
  const state = useDashboard()

  const header = (
    <PageHeader title={t('dashboard.welcome', { name: user?.name })} description={t('dashboard.subtitle')} />
  )

  if (state.kind === 'loading') {
    return (
      <div>
        {header}
        <DashboardSkeleton />
      </div>
    )
  }

  // Falhou E não há nada em mão, de nenhuma janela: é o único caso em que o
  // erro SUBSTITUI a tela.
  if (state.kind === 'error') {
    return (
      <div>
        {header}
        <AppErrorState
          title={t('common.loadError')}
          detail={state.error.detail ?? t('common.loadErrorHint')}
          retryLabel={t('common.retry')}
          onRetry={state.retry}
        />
      </div>
    )
  }

  // O caso-limite do §4 do B1: esconder cada seção nula, uma a uma, deixaria a
  // página em branco para quem não tem módulo nenhum — indistinguível de falha
  // silenciosa. A tela diz o que está acontecendo em vez de não dizer nada.
  // Só o admin tem este ramo: as 6 chaves do Redator são não-anuláveis.
  if (state.kind === 'unauthorized') {
    return (
      <div>
        {header}
        <AppEmptyState
          icon="pi pi-lock"
          title={t('dashboard.noAccess.title')}
          description={t('dashboard.noAccess.description')}
        />
      </div>
    )
  }

  // A view do Redator chega na Task 10.
  if (state.kind === 'ready-redator') return <div>{header}</div>

  return (
    <div>
      {header}
      {/* Falha COM dado em mão: aviso ao lado, a tela permanece utilizável (BD-6). */}
      <InlineLoadState error={state.staleError} retryLabel={t('common.retry')} onRetry={state.retry} />
      <AdminView data={state.data} />
    </div>
  )
}
```

- [ ] **Step 11: Conferir que a página cabe sob a régua que a Task 5 vai ligar**

```bash
cd frontend && wc -l src/app/pages/Dashboard/*.tsx src/app/pages/Dashboard/admin/*.tsx
```
Expected: nenhum `.tsx` acima de 150. Se algum passar, o remédio é dividir — não relaxar a régua.

- [ ] **Step 12: Gate completo**

```bash
cd frontend && pnpm lint && pnpm build && pnpm test
```
Expected: os três verdes.

- [ ] **Step 13: Commit**

```bash
cd /home/jvbat/projetos/lotus && git add \
  frontend/src/app/pages/Dashboard
git commit -m "refactor(dashboard): pasta por view e derivacao de KPI com dono

D4: admin/ e redator/; na raiz fica o que as DUAS views usam de verdade.
git mv preserva o historico de PendingList e PipelineFunnel.

D13, medido e nao presumido: KpiRow ja era generico sobre Kpi[], entao so a
derivacao sai (admin/kpiCards.ts) e o Redator escreve a dele; AgendaPanel fica
generico sobre a linha, e como client_name e o unico campo em que os dois
contratos divergem, o ownership vira consequencia do TIPO, nao condicional de
tela; AlertList nao muda uma linha.

Emenda 1 da spec: AdminView, SectionLabel e DashboardSkeleton nao estavam na
estrutura da §4, e sao o que faz a pagina caber sob a regua da D8 — ela tinha
159 linhas ANTES das 4 secoes novas.

Emenda 3: a chave i18n do Kpi passa a ser COMPLETA, nao sufixo montado dentro
do render — com o Redator em dashboard.redator.kpi.*, o prefixo implicito
quebraria. Mesma correcao que o Q-1 do review de 2026-08-16 ja fez aqui."
```

---

## Task 5: A régua `max-lines` passa a valer em `src/app/**`

**Files:**
- Modify: `frontend/eslint.config.js:246-252` (o bloco de `max-lines`)

**Interfaces:**
- Consumes: a estrutura da Task 4 (a página abaixo de 150).
- Produces: nada em código; produz a garantia de que as Tasks 6-10 nascem sob a régua.

**Por que a régua entra AGORA e não no fim:** catraca serve para o código nascer conforme, não para
reprovar o que já foi escrito. As 4 seções novas chegam nas próximas cinco tasks — se a régua ligasse
depois, elas nasceriam grandes e a task de ligar viraria uma refatoração retroativa. É a mesma
sequência da D11 do B1, que ligou a catraca de cor nesta mesma camada descoberta.

- [ ] **Step 1: Medir o estado da camada ANTES**

```bash
cd frontend && wc -l $(find src/app -name '*.tsx' ! -name '*.test.tsx') | sort -rn | head -5
```
Expected: o maior abaixo de 150. **Se algum passar, volte à Task 4 e divida** — a régua não se
afrouxa para caber no código.

Registre também o que fica de fora por desenho:

```bash
cd frontend && wc -l $(find src/app -name '*.test.tsx') $(find src/app -name '*.ts' ! -name '*.test.ts') | sort -rn | head -5
```
Expected: `useDashboard.test.tsx` acima de 150 — e é isento **de propósito** (glob `.tsx`
não-teste). O `.ts` também fica de fora: hook e módulo de derivação longos são legítimos.

- [ ] **Step 2: Ligar a régua**

Em `frontend/eslint.config.js`, no bloco que hoje é
`files: ['src/features/*/components/**/*.{ts,tsx}']` com `max-lines`, **substitua o bloco inteiro**
(o comentário acima dele permanece) por:

```js
  {
    files: ['src/features/*/components/**/*.{ts,tsx}'],
    rules: {
      'max-lines': ['error', { max: 150, skipBlankLines: false, skipComments: false }],
    },
  },
  // D8 do B2: `src/app/**` era a camada SEM régua, e dois dos seus 24 arquivos
  // já a excediam — os dois criados pelo B1. Mesmo formato da D11 do B1, que
  // fechou a P-34 ligando a catraca de cor nesta mesma camada descoberta.
  //
  // O glob é `.tsx` e não `{ts,tsx}` de PROPÓSITO, e é o mesmo recorte da regra
  // das features, que vale só para `components/`: hook e módulo de derivação
  // longos são legítimos, componente inchado não. Em `app/pages/Dashboard/` os
  // `.ts` são exatamente isso — `useDashboard`, `navigation`, `kpiCards`,
  // `resumoCards`, `periodPresets`.
  //
  // Teste cai na mesma isenção pelo mesmo motivo: quebrar um arquivo de teste
  // coeso é pagar preço pela regra, não pelo defeito.
  {
    files: ['src/app/**/*.tsx'],
    ignores: ['**/*.test.tsx'],
    rules: {
      'max-lines': ['error', { max: 150, skipBlankLines: false, skipComments: false }],
    },
  },
```

- [ ] **Step 3: Provar que a régua está VERDE no HEAD**

Run: `cd frontend && pnpm lint`
Expected: exit 0.

- [ ] **Step 4: Provar que a régua REPROVA — o outro sentido, sem o qual ela pode estar morta**

```bash
cd frontend && cp src/app/pages/Dashboard/SectionLabel.tsx /tmp/SectionLabel.bak && \
  for i in $(seq 1 200); do echo "// sonda $i" >> src/app/pages/Dashboard/SectionLabel.tsx; done && \
  pnpm lint; echo "exit=$?"; \
  cp /tmp/SectionLabel.bak src/app/pages/Dashboard/SectionLabel.tsx && rm /tmp/SectionLabel.bak && \
  git diff --stat -- src/app/pages/Dashboard/SectionLabel.tsx
```
Expected: o `pnpm lint` do meio sai **não-zero**, com
`File has too many lines (238). Maximum allowed is 150  max-lines`. O `git diff --stat` final vem
**vazio** — a sonda foi removida.

- [ ] **Step 5: Provar que o `.ts` e o teste continuam ISENTOS**

```bash
cd frontend && npx eslint --print-config src/app/pages/Dashboard/useDashboard.ts | \
  node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log('useDashboard.ts max-lines:', JSON.stringify(JSON.parse(s).rules['max-lines'])))"
cd frontend && npx eslint --print-config src/app/pages/Dashboard/useDashboard.test.tsx | \
  node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log('useDashboard.test.tsx max-lines:', JSON.stringify(JSON.parse(s).rules['max-lines'])))"
```
Expected: os dois imprimem `undefined` ou a regra desligada — nenhum imprime `["error",{"max":150…`.
É o que prova que o `ignores` e o glob `.tsx` fazem o que o comentário afirma, e não outra coisa.

- [ ] **Step 6: Gate completo**

```bash
cd frontend && pnpm lint && pnpm build && pnpm test
```
Expected: os três verdes.

- [ ] **Step 7: Commit**

```bash
cd /home/jvbat/projetos/lotus && git add frontend/eslint.config.js
git commit -m "chore(lint): regua de max-lines passa a valer em src/app

D8: src/app/** era a camada sem regua, e 2 dos seus 24 arquivos ja a excediam.
Entra AGORA, antes das 4 secoes novas, para elas nascerem conformes — mesma
sequencia da D11 do B1.

Glob .tsx e nao {ts,tsx}, e teste isento: hook e modulo de derivacao longos
sao legitimos, componente inchado nao. Provada nos dois sentidos — verde no
HEAD e reprovando com sonda de 200 linhas — e o --print-config confirma que
.ts e .test.tsx ficam de fora."
```

---

## Task 6: O seletor de período (D5) e a janela que a página passa ao hook (D12)

**Files:**
- Create: `frontend/src/app/pages/Dashboard/admin/periodPresets.ts`
- Create: `frontend/src/app/pages/Dashboard/admin/periodPresets.test.ts`
- Create: `frontend/src/app/pages/Dashboard/admin/PeriodFilter.tsx`
- Modify: `frontend/src/app/pages/Dashboard/DashboardPage.tsx`
- Modify: `frontend/src/app/pages/Dashboard/admin/AdminView.tsx`
- Modify: `frontend/src/shared/config/locales/{es-CL,pt-BR,en}.json`

**Interfaces:**
- Consumes: `DashboardPeriod` e `useDashboard(period?)` (Task 3); `AdminView` (Task 4).
- Produces:
  ```ts
  export type PeriodPresetKey = 'last12' | 'last6' | 'currentYear' | 'custom'
  export const PERIOD_PRESETS: readonly PeriodPresetKey[]
  export const PERIOD_PRESET_PADRAO: PeriodPresetKey
  export function periodoDoPreset(preset: PeriodPresetKey, hoje: Date): DashboardPeriod | null
  export function periodoPadrao(hoje: Date): DashboardPeriod
  export function PeriodFilter({ preset, period, staleError, onPresetChange, onPeriodChange, onRetry }: {...})
  export function AdminView({ data, preset, period, staleError, onPresetChange, onPeriodChange, onRetry }: {...})
  ```

**Um cenário além dos 6 da spec, e por quê:** o §6 não lista teste de preset porque a spec deixou a
UX do seletor em aberto. `periodoDoPreset` calcula datas que vão para o servidor sem passar por
validação de cliente (D6: "a regra de janela invertida fica só no backend") — errar o cálculo manda
uma janela errada que o backend **aceita**, e a tela mostra o período errado sem nenhum 422. É a
mesma categoria do `parseUfInput`: valor silenciosamente errado.

- [ ] **Step 1: Escrever o teste dos presets, falhando**

`frontend/src/app/pages/Dashboard/admin/periodPresets.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { periodoDoPreset, periodoPadrao } from './periodPresets'

// Data fixa e injetada, nunca `new Date()` dentro do módulo: preset que lê o
// relógio sozinho não se testa e quebra na virada do mês em produção.
const hoje = new Date(2026, 7, 17) // 17 de agosto de 2026, hora local

describe('periodoDoPreset', () => {
  // O default espelha `DEFAULT_MONTHS = 12` (`DashboardFilterData.php:24`): a
  // primeira carga da tela tem de pedir a MESMA janela que o servidor
  // resolveria sozinho, senão o "Últimos 12 meses" do dropdown mostraria um
  // recorte diferente do que a tela mostrava antes de alguém tocar no filtro.
  it('últimos 12 meses termina hoje e começa 12 meses atrás', () => {
    expect(periodoDoPreset('last12', hoje)).toEqual({ start: '2025-08-17', end: '2026-08-17' })
  })

  it('últimos 6 meses termina hoje e começa 6 meses atrás', () => {
    expect(periodoDoPreset('last6', hoje)).toEqual({ start: '2026-02-17', end: '2026-08-17' })
  })

  it('ano corrente vai de 1º de janeiro até hoje', () => {
    expect(periodoDoPreset('currentYear', hoje)).toEqual({ start: '2026-01-01', end: '2026-08-17' })
  })

  // "Personalizado" não é uma janela: é o modo em que os dois campos mandam.
  it('personalizado não calcula janela nenhuma', () => {
    expect(periodoDoPreset('custom', hoje)).toBeNull()
  })

  // O default da tela não pode divergir do preset que o dropdown mostra
  // selecionado: seriam dois cálculos da mesma janela, e o "Últimos 12 meses"
  // exibiria um recorte diferente do que a tela já mostrava.
  it('a janela padrão é a mesma que o preset de 12 meses calcula', () => {
    expect(periodoPadrao(hoje)).toEqual(periodoDoPreset('last12', hoje))
  })

  // O dia 31 recuando para um mês de 30 não pode virar o dia 1º do mês
  // seguinte, que é o que `setMonth` faz sozinho — a janela ganharia um dia e
  // o rótulo diria "6 meses" sobre outra coisa.
  it('recuar de um dia 31 para um mês curto cai no último dia do mês curto', () => {
    expect(periodoDoPreset('last6', new Date(2026, 7, 31))).toEqual({ start: '2026-02-28', end: '2026-08-31' })
  })

  // ISO pelos componentes LOCAIS, nunca `toISOString()`: em UTC-3/-4 o
  // `toISOString` de uma data à meia-noite local devolve o dia ANTERIOR.
  it('a data sai em ISO local, não em UTC', () => {
    const janeiro = new Date(2026, 0, 1)
    expect(periodoDoPreset('currentYear', janeiro)?.end).toBe('2026-01-01')
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd frontend && pnpm test periodPresets`
Expected: FAIL — `Failed to resolve import "./periodPresets"`.

- [ ] **Step 3: Escrever os presets**

`frontend/src/app/pages/Dashboard/admin/periodPresets.ts`:

```ts
import type { DashboardPeriod } from '../useDashboard'

export type PeriodPresetKey = 'last12' | 'last6' | 'currentYear' | 'custom'

/** A ordem do dropdown: o mais frequente primeiro, "Personalizado" por último
 * porque é o que revela dois campos a mais. */
export const PERIOD_PRESETS: readonly PeriodPresetKey[] = ['last12', 'last6', 'currentYear', 'custom']

/** O default da tela. Espelha `DEFAULT_MONTHS = 12` do
 * `DashboardFilterData.php:24`: a primeira carga precisa pedir a MESMA janela
 * que o servidor resolveria sozinho. */
export const PERIOD_PRESET_PADRAO: PeriodPresetKey = 'last12'

/** `Date` -> `YYYY-MM-DD` pelos componentes LOCAIS. Nunca `toISOString()`:
 * o Chile é UTC-3/-4 e a meia-noite local vira o dia ANTERIOR em UTC. Mesma
 * razão do `dateToIso` do `AppDatePicker`. */
function iso(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dia}`
}

/** Recua `meses` preservando o dia, e ancorando no ÚLTIMO dia do mês quando o
 * dia não existe lá. `setMonth` sozinho estoura para o mês seguinte — 31 de
 * agosto menos 6 viraria 3 de março —, e a janela ganharia dias que o rótulo
 * não promete. */
function mesesAtras(base: Date, meses: number): Date {
  const alvo = new Date(base.getFullYear(), base.getMonth() - meses, 1)
  const ultimoDia = new Date(alvo.getFullYear(), alvo.getMonth() + 1, 0).getDate()
  alvo.setDate(Math.min(base.getDate(), ultimoDia))
  return alvo
}

/**
 * Janela de um preset. `hoje` é PARÂMETRO e não `new Date()` interno: preset
 * que lê o relógio sozinho não se testa e quebra na virada do mês.
 *
 * `custom` devolve `null` porque não é uma janela — é o modo em que os dois
 * `AppDatePicker` mandam (D5). Dois campos e não um range: o wrapper é de data
 * única (`AppDatePicker.tsx:6`) e o backend trata os limites como
 * independentes.
 */
export function periodoDoPreset(preset: PeriodPresetKey, hoje: Date): DashboardPeriod | null {
  if (preset === 'custom') return null
  if (preset === 'currentYear') {
    return { start: iso(new Date(hoje.getFullYear(), 0, 1)), end: iso(hoje) }
  }
  return { start: iso(mesesAtras(hoje, preset === 'last12' ? 12 : 6)), end: iso(hoje) }
}

/** A janela com que a tela abre. Existe para o call-site não precisar de `!`
 * sobre o retorno anulável: `PERIOD_PRESET_PADRAO` é tipado `PeriodPresetKey`,
 * o TS não o estreita para "não-custom", e uma asserção de não-nulo no estado
 * inicial da página seria uma promessa que só o leitor humano confere. */
export function periodoPadrao(hoje: Date): DashboardPeriod {
  return { start: iso(mesesAtras(hoje, 12)), end: iso(hoje) }
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `cd frontend && pnpm test periodPresets`
Expected: PASS, 7 casos.

- [ ] **Step 5: Escrever o `PeriodFilter`**

`frontend/src/app/pages/Dashboard/admin/PeriodFilter.tsx`:

```tsx
import { useTranslation } from 'react-i18next'
import { AppDropdown, AppDatePicker, InlineLoadState } from '@shared/ui'
import type { DashboardPeriod } from '../useDashboard'
import { PERIOD_PRESETS } from './periodPresets'
import type { PeriodPresetKey } from './periodPresets'

/**
 * Seletor de janela histórica (D5): presets para o caso frequente, e
 * "Personalizado" revelando DOIS campos de data — não um range. O wrapper é de
 * data única (`AppDatePicker.tsx:6`) e o backend trata `period_start` e
 * `period_end` como limites independentes; dois campos espelham o contrato 1:1.
 *
 * Sem validação de janela invertida aqui (D6): ela vive no backend, que sobe
 * 422 com `errors.period_end`. Validar no cliente duplicaria a regra, e a
 * mensagem chegaria em duas gramáticas diferentes. A falha aparece AO LADO,
 * neste mesmo bloco, com a tela mantendo o dado anterior.
 */
export function PeriodFilter({
  preset,
  period,
  staleError,
  onPresetChange,
  onPeriodChange,
  onRetry,
}: {
  preset: PeriodPresetKey
  period: DashboardPeriod
  /** `detail` do 422/500 do GET da janela nova. A tela segue com o dado anterior. */
  staleError: string | null
  onPresetChange: (p: PeriodPresetKey) => void
  onPeriodChange: (p: DashboardPeriod) => void
  onRetry: () => void
}) {
  const { t } = useTranslation()

  const opcoes = PERIOD_PRESETS.map((chave) => ({ value: chave, label: t(`dashboard.period.${chave}`) }))

  return (
    <div className="space-y-1">
      <div className="grid gap-2 sm:grid-cols-[minmax(0,14rem)_auto]">
        <AppDropdown
          value={preset}
          options={opcoes}
          optionLabel="label"
          optionValue="value"
          onChange={(e) => onPresetChange(e.value as PeriodPresetKey)}
          aria-label={t('dashboard.period.label')}
        />
        {preset === 'custom' && (
          <div className="grid gap-2 sm:grid-cols-2">
            <AppDatePicker
              value={period.start}
              onChange={(v) => onPeriodChange({ ...period, start: v ?? period.start })}
              aria-label={t('dashboard.period.start')}
              placeholder={t('dashboard.period.start')}
            />
            <AppDatePicker
              value={period.end}
              onChange={(v) => onPeriodChange({ ...period, end: v ?? period.end })}
              aria-label={t('dashboard.period.end')}
              placeholder={t('dashboard.period.end')}
            />
          </div>
        )}
      </div>
      {/* O erro da janela mora AQUI, junto do controle que o causou — não no
        * topo da página. É o que a D6 pede, e o InlineLoadState já é a linha
        * compacta sob um controle que continua utilizável. */}
      <InlineLoadState error={staleError} retryLabel={t('common.retry')} onRetry={onRetry} />
    </div>
  )
}
```

- [ ] **Step 6: Ligar o estado da janela na página (D12) e passar tudo ao `AdminView`**

O período mora em `useState` da página: não cruza fronteira além do par página/seletor, e a rule
proíbe promover a Zustand o que não cruza fronteira. Dado de servidor segue no TanStack Query.

Em `frontend/src/app/pages/Dashboard/DashboardPage.tsx`:

(a) troque os imports do topo por:

```tsx
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PageHeader, AppErrorState, AppEmptyState, InlineLoadState } from '@shared/ui'
import { useSessionStore } from '@shared/stores/sessionStore'
import { useDashboard } from './useDashboard'
import { DashboardSkeleton } from './DashboardSkeleton'
import { AdminView } from './admin/AdminView'
import { PERIOD_PRESET_PADRAO, periodoDoPreset, periodoPadrao } from './admin/periodPresets'
import type { PeriodPresetKey } from './admin/periodPresets'
```

(b) logo depois de `const user = useSessionStore(…)`, insira:

```tsx
  // D12: a janela mora aqui. Não cruza fronteira além do par página/seletor, e
  // a rule proíbe promover a Zustand o que não cruza fronteira. `useState` com
  // inicializador de função para o `new Date()` rodar UMA vez, no mount, e não
  // a cada render.
  const [preset, setPreset] = useState<PeriodPresetKey>(PERIOD_PRESET_PADRAO)
  const [period, setPeriod] = useState(() => periodoPadrao(new Date()))
  const state = useDashboard(period)

  // Trocar de preset recalcula a janela; "Personalizado" mantém a que estava e
  // passa o comando para os dois campos.
  const trocarPreset = (novo: PeriodPresetKey) => {
    setPreset(novo)
    const janela = periodoDoPreset(novo, new Date())
    if (janela) setPeriod(janela)
  }
```

e **apague** a linha `const state = useDashboard()` que estava ali.

(c) troque a última `return` por:

```tsx
  return (
    <div>
      {header}
      <AdminView
        data={state.data}
        preset={preset}
        period={period}
        staleError={state.staleError}
        onPresetChange={trocarPreset}
        onPeriodChange={setPeriod}
        onRetry={state.retry}
      />
    </div>
  )
```

e **apague** o `<InlineLoadState …>` do corpo da página: a falha agora mora ao lado do seletor
(D6), dentro do `PeriodFilter`. Remova `InlineLoadState` do import se ele ficar sem uso.

- [ ] **Step 7: Receber o filtro no `AdminView`**

Em `frontend/src/app/pages/Dashboard/admin/AdminView.tsx`:

(a) acrescente os imports:

```tsx
import type { DashboardPeriod } from '../useDashboard'
import { PeriodFilter } from './PeriodFilter'
import type { PeriodPresetKey } from './periodPresets'
```

(b) troque a assinatura por:

```tsx
export function AdminView({
  data,
  preset,
  period,
  staleError,
  onPresetChange,
  onPeriodChange,
  onRetry,
}: {
  data: AdminDashboardData
  preset: PeriodPresetKey
  period: DashboardPeriod
  staleError: string | null
  onPresetChange: (p: PeriodPresetKey) => void
  onPeriodChange: (p: DashboardPeriod) => void
  onRetry: () => void
}) {
```

(c) acrescente, **depois** do bloco de contexto (agenda/pipeline) e antes do `</div>` final, a
seção de análise — que nas Tasks 7 e 8 ganha os dois painéis:

```tsx
      {/* A janela histórica só alcança séries e rankings (D3 do bloco A), e é
        * por isso que o seletor mora DENTRO desta seção e não no cabeçalho da
        * página: no cabeçalho ele prometeria filtrar a tela inteira. */}
      <section className="space-y-3">
        <SectionLabel>{t('dashboard.section.analysis')}</SectionLabel>
        <PeriodFilter
          preset={preset}
          period={period}
          staleError={staleError}
          onPresetChange={onPresetChange}
          onPeriodChange={onPeriodChange}
          onRetry={onRetry}
        />
      </section>
```

- [ ] **Step 8: As chaves de i18n**

Em `frontend/src/shared/config/locales/es-CL.json`, dentro de `dashboard`, acrescente
`section.analysis` e o bloco `period`:

```json
    "section": {
      "action": "Requiere acción",
      "context": "Contexto",
      "analysis": "Análisis del período"
    },
```
```json
    "period": {
      "label": "Período",
      "last12": "Últimos 12 meses",
      "last6": "Últimos 6 meses",
      "currentYear": "Año en curso",
      "custom": "Personalizado",
      "start": "Desde",
      "end": "Hasta"
    },
```

`pt-BR.json`:

```json
      "analysis": "Análise do período"
```
```json
    "period": {
      "label": "Período",
      "last12": "Últimos 12 meses",
      "last6": "Últimos 6 meses",
      "currentYear": "Ano corrente",
      "custom": "Personalizado",
      "start": "De",
      "end": "Até"
    },
```

`en.json`:

```json
      "analysis": "Period analysis"
```
```json
    "period": {
      "label": "Period",
      "last12": "Last 12 months",
      "last6": "Last 6 months",
      "currentYear": "Current year",
      "custom": "Custom",
      "start": "From",
      "end": "To"
    },
```

- [ ] **Step 9: Provar na tela que a janela só move séries e rankings**

```bash
cd /home/jvbat/projetos/lotus && docker compose up -d && cd frontend && pnpm dev
```

Abra http://localhost:5173, entre como admin. Confira, e anote para a Task 11:
1. O dropdown abre em "Últimos 12 meses".
2. A aba de rede mostra `period_start`/`period_end` de 12 meses na PRIMEIRA carga.
3. Trocar para "Últimos 6 meses" dispara um GET novo e a tela **não pisca em branco**.
4. Em "Personalizado", pôr `Desde` DEPOIS de `Hasta` devolve 422 e a tela **permanece** com o dado
   anterior, com a frase espanhola do servidor ao lado do seletor.

- [ ] **Step 10: Gate completo**

```bash
cd frontend && pnpm lint && pnpm build && pnpm test
```
Expected: os três verdes.

- [ ] **Step 11: Commit**

```bash
cd /home/jvbat/projetos/lotus && git add \
  frontend/src/app/pages/Dashboard \
  frontend/src/shared/config/locales/es-CL.json \
  frontend/src/shared/config/locales/pt-BR.json \
  frontend/src/shared/config/locales/en.json
git commit -m "feat(dashboard): seletor de periodo com presets e campos personalizados

D5: 4 presets, e Personalizado revela DOIS AppDatePicker — o wrapper e de data
unica e o backend trata os limites como independentes.

D12: a janela mora em useState da pagina; nao cruza fronteira alem do par
pagina/seletor. O default espelha DEFAULT_MONTHS=12 do servidor.

O calculo dos presets e testado porque manda data ao servidor sem validacao de
cliente (D6): errar o recuo de mes manda uma janela que o backend ACEITA e a
tela mostra errada, sem nenhum 422. O 31 de agosto recuando 6 meses cai em 28
de fevereiro, nao em 3 de marco.

O erro da janela aparece ao lado do seletor, dentro da secao que ele filtra."
```

---

## Task 7: As 5 séries mensais (D7)

**Files:**
- Create: `frontend/src/app/pages/Dashboard/admin/SeriesPanel.tsx`
- Modify: `frontend/src/app/pages/Dashboard/admin/AdminView.tsx`
- Modify: `frontend/src/shared/config/locales/{es-CL,pt-BR,en}.json`

**Interfaces:**
- Consumes: `AppLineChart`, `ChartSeries` (Task 2); `SectionLabel` (Task 4).
- Produces: `export function SeriesPanel({ series }: { series: SeriesData }): JSX.Element | null`

**Dois gráficos e não um, e por quê:** as 4 séries de contagem (`turmas_iniciadas`,
`turmas_concluidas`, `certificados_emitidos`, `matriculas`) são inteiros e dividem o mesmo eixo;
`uf_aprovada` é `decimal(12,4)` em UF, ordem de grandeza e unidade diferentes — no mesmo eixo, ou
ela achata as outras quatro na linha de base, ou elas achatam a UF. A spec deixou a visualização por
dataset em aberto ("o Drive admite linha, barras e ranking/Pareto, mas não fixa uma visualização por
dataset"); esta é a escolha do plano, e o motivo é a unidade.

- [ ] **Step 1: Escrever o painel**

`frontend/src/app/pages/Dashboard/admin/SeriesPanel.tsx`:

```tsx
import { useTranslation } from 'react-i18next'
import { AppCard, AppCardHeader, AppEmptyState, AppLineChart } from '@shared/ui'
import type { ChartSeries } from '@shared/ui'
import { formatMonthYear, formatUf } from '@shared/lib'
import type { SeriesData } from '@shared/types/generated'

/** As 4 séries de CONTAGEM, na ordem do ciclo: a turma começa, termina, o aluno
 * se matricula e o certificado sai.
 *
 * `as const` e não `(keyof SeriesData)[]`: tipada pela chave inteira, o
 * elemento alarga para `MonthlyCountData[] | MonthlyAmountData[] | null` e o
 * `.map` sobre a união de dois tipos de array não é chamável. Com as 4 chaves
 * literais, `series[chave]` é `MonthlyCountData[] | null` — um tipo só, e
 * `p.count` existe sem guarda. Guarda que nunca dispara é ramo órfão, e o
 * review do B1 matou três. */
const CONTAGENS = ['turmas_iniciadas', 'turmas_concluidas', 'matriculas', 'certificados_emitidos'] as const

/** `YYYY-MM` -> "ago 2026". O backend projeta o mês em `Y-m`
 * (`AnalyticsQuery.php:230`); `formatMonthYear` ancora ao meio-dia para o fuso
 * a oeste não devolver o mês anterior. */
const mes = (x: string) => formatMonthYear(`${x}-01`)

/**
 * As 5 séries mensais. Série nula SOME — do gráfico e da legenda (D7): o
 * backend manda `null` no que o papel não pode ler, e desenhar uma linha em
 * zero afirmaria "não aconteceu nada" onde a verdade é "não se pode saber".
 * Mesmo molde da D6 do B1: uma tela, uma gramática de ausência.
 *
 * Dois gráficos porque são duas UNIDADES: as quatro contagens são inteiros e
 * dividem o eixo; `uf_aprovada` é decimal em UF, e no mesmo eixo uma das duas
 * escalas achata a outra contra a linha de base.
 *
 * A UF nunca passa por `Number` no VALOR exibido — `formatUf` corta zeros e
 * troca o separador sobre a string do backend. No eixo do gráfico ela precisa
 * ser número (é geometria), e é a única conversão: o rótulo do tooltip e do
 * eixo volta pelo formatador.
 */
export function SeriesPanel({ series }: { series: SeriesData }) {
  const { t } = useTranslation()

  const contagens: ChartSeries[] = CONTAGENS.flatMap((chave) => {
    const pontos = series[chave]
    if (pontos === null) return []
    return [{
      key: chave,
      label: t(`dashboard.series.${chave}`),
      points: pontos.map((p) => ({ x: p.month, y: p.count })),
    }]
  })

  const uf: ChartSeries[] =
    series.uf_aprovada === null
      ? []
      : [{
          key: 'uf_aprovada',
          label: t('dashboard.series.uf_aprovada'),
          points: series.uf_aprovada.map((p) => ({ x: p.month, y: Number(p.total_uf) })),
        }]

  // Todas as 5 fechadas por gate: a seção inteira some, sem card vazio (D7).
  if (contagens.length === 0 && uf.length === 0) return null

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {contagens.length > 0 && (
        <AppCard>
          <AppCardHeader title={t('dashboard.series.countsTitle')} />
          {contagens.every((s) => s.points.length === 0) ? (
            <AppEmptyState icon="pi pi-chart-line" title={t('dashboard.series.empty')} />
          ) : (
            <div className="px-2 pb-2">
              <AppLineChart series={contagens} ariaLabel={t('dashboard.series.countsTitle')} formatX={mes} />
            </div>
          )}
        </AppCard>
      )}

      {uf.length > 0 && (
        <AppCard>
          <AppCardHeader title={t('dashboard.series.ufTitle')} />
          {uf[0].points.length === 0 ? (
            <AppEmptyState icon="pi pi-chart-line" title={t('dashboard.series.empty')} />
          ) : (
            <div className="px-2 pb-2">
              <AppLineChart
                series={uf}
                ariaLabel={t('dashboard.series.ufTitle')}
                inkOffset={4}
                formatX={mes}
                formatY={(v) => formatUf(v.toFixed(4))}
              />
            </div>
          )}
        </AppCard>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Pendurar no `AdminView`**

Em `admin/AdminView.tsx`, dentro da `<section>` de análise criada na Task 6, **depois** do
`<PeriodFilter …/>`:

```tsx
        {data.series !== null && <SeriesPanel series={data.series} />}
```

E o import:

```tsx
import { SeriesPanel } from './SeriesPanel'
```

A `<section>` inteira ainda precisa sumir quando não houver nada analítico. Troque a abertura dela
por:

```tsx
      {(data.series !== null || data.rankings !== null) && (
      <section className="space-y-3">
```

e feche com `)}` depois do `</section>`. (O `rankings` entra na Task 8; a condição já o inclui para
não mexer duas vezes na mesma linha.)

- [ ] **Step 3: As chaves de i18n**

`es-CL.json`, dentro de `dashboard`:

```json
    "series": {
      "countsTitle": "Evolución mensual",
      "ufTitle": "UF aprobada por mes",
      "empty": "Sin registros en el período",
      "turmas_iniciadas": "Clases iniciadas",
      "turmas_concluidas": "Clases concluidas",
      "matriculas": "Matrículas",
      "certificados_emitidos": "Certificados emitidos",
      "uf_aprovada": "UF aprobada"
    },
```

`pt-BR.json`:

```json
    "series": {
      "countsTitle": "Evolução mensal",
      "ufTitle": "UF aprovada por mês",
      "empty": "Sem registros no período",
      "turmas_iniciadas": "Turmas iniciadas",
      "turmas_concluidas": "Turmas concluídas",
      "matriculas": "Matrículas",
      "certificados_emitidos": "Certificados emitidos",
      "uf_aprovada": "UF aprovada"
    },
```

`en.json`:

```json
    "series": {
      "countsTitle": "Monthly trend",
      "ufTitle": "Approved UF per month",
      "empty": "No records in the period",
      "turmas_iniciadas": "Classes started",
      "turmas_concluidas": "Classes completed",
      "matriculas": "Enrollments",
      "certificados_emitidos": "Certificates issued",
      "uf_aprovada": "Approved UF"
    },
```

- [ ] **Step 4: Provar na tela**

Com `pnpm dev` de pé, no Dashboard do admin:
1. As duas cartas de série desenham com dado do seed.
2. Trocar o período muda as duas linhas e **não** muda KPI, pendências, alertas, agenda nem
   pipeline.
3. Trocar de tema claro↔escuro **repinta o traço sem recarregar a página** — é o que a D1 comprou
   ao escolher SVG.

- [ ] **Step 5: Gate completo**

```bash
cd frontend && pnpm lint && pnpm build && pnpm test
```
Expected: os três verdes. `pnpm lint` também prova que `SeriesPanel.tsx` nasceu sob a régua da D8.

- [ ] **Step 6: Commit**

```bash
cd /home/jvbat/projetos/lotus && git add \
  frontend/src/app/pages/Dashboard/admin \
  frontend/src/shared/config/locales/es-CL.json \
  frontend/src/shared/config/locales/pt-BR.json \
  frontend/src/shared/config/locales/en.json
git commit -m "feat(dashboard): as 5 series mensais

D7: serie nula some do grafico E da legenda; as 5 fechadas somem a secao
inteira. Esconder nao e converter em zero — o backend manda null justamente
para a tela nao ter como mentir.

Dois graficos porque sao duas unidades: as 4 contagens dividem o eixo, e a UF
e decimal — no mesmo eixo uma escala achata a outra. A UF so vira Number na
geometria; o rotulo volta por formatUf sobre a string do backend."
```

---

## Task 8: Os 2 rankings

**Files:**
- Create: `frontend/src/app/pages/Dashboard/admin/RankingsPanel.tsx`
- Modify: `frontend/src/app/pages/Dashboard/admin/AdminView.tsx`
- Modify: `frontend/src/shared/config/locales/{es-CL,pt-BR,en}.json`

**Interfaces:**
- Consumes: `AppBarChart`, `BarDatum` (Task 2).
- Produces: `export function RankingsPanel({ rankings }: { rankings: RankingsData }): JSX.Element | null`

**Uma métrica por vez, escolhida pelo usuário:** `RankingRowData` traz 4 grandezas (`turmas`,
`matriculas`, `certificados`, `uf_aprovada`). Desenhar as 4 juntas numa barra agrupada põe UF e
contagem no mesmo eixo — o problema que a Task 7 acabou de separar. Um dropdown de métrica mantém as
4 acessíveis com um eixo por vez.

- [ ] **Step 1: Escrever o painel**

`frontend/src/app/pages/Dashboard/admin/RankingsPanel.tsx`:

```tsx
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AppCard, AppCardHeader, AppCardToolbar, AppDropdown, AppEmptyState, AppBarChart } from '@shared/ui'
import type { BarDatum } from '@shared/ui'
import { formatUf } from '@shared/lib'
import type { RankingRowData, RankingsData } from '@shared/types/generated'

type Metrica = 'turmas' | 'matriculas' | 'certificados' | 'uf_aprovada'

const METRICAS: Metrica[] = ['turmas', 'matriculas', 'certificados', 'uf_aprovada']

/** Uma métrica por vez, e não 4 barras agrupadas: `uf_aprovada` é decimal em UF
 * e as outras três são contagem — no mesmo eixo, uma achata a outra. Mesma
 * razão que separou os dois gráficos de série. */
function valor(linha: RankingRowData, metrica: Metrica): number {
  // `uf_aprovada` é `string | null` (`generated.ts:352-362`): `null` é o gate
  // comercial fechado, e vira ausência — a linha some do gráfico, não vira 0.
  if (metrica === 'uf_aprovada') return linha.uf_aprovada === null ? NaN : Number(linha.uf_aprovada)
  return linha[metrica]
}

function barras(linhas: RankingRowData[], metrica: Metrica): BarDatum[] {
  return linhas
    .map((l) => ({ label: l.name, value: valor(l, metrica) }))
    .filter((b) => !Number.isNaN(b.value))
    .sort((a, b) => b.value - a.value)
}

function Ranking({
  titulo,
  linhas,
  metrica,
  inkIndex,
}: {
  titulo: string
  linhas: RankingRowData[]
  metrica: Metrica
  inkIndex: number
}) {
  const { t } = useTranslation()
  const dados = barras(linhas, metrica)

  return (
    <AppCard>
      <AppCardHeader title={titulo} count={dados.length} />
      {dados.length === 0 ? (
        <AppEmptyState icon="pi pi-chart-bar" title={t('dashboard.rankings.empty')} />
      ) : (
        <div className="px-2 pb-2">
          <AppBarChart
            data={dados}
            ariaLabel={titulo}
            inkIndex={inkIndex}
            formatValue={metrica === 'uf_aprovada' ? (v) => formatUf(v.toFixed(4)) : undefined}
          />
        </div>
      )}
    </AppCard>
  )
}

/**
 * Os dois rankings, cursos e clientes, sobre a mesma métrica escolhida. Ambos
 * respeitam a janela histórica (D3 do bloco A) e por isso vivem na seção de
 * análise, junto do seletor.
 *
 * A métrica mora em `useState` local: não cruza fronteira nenhuma — nem para a
 * página, que já tem a janela, nem para o servidor, que manda as 4 grandezas
 * de uma vez.
 */
export function RankingsPanel({ rankings }: { rankings: RankingsData }) {
  const { t } = useTranslation()
  const [metrica, setMetrica] = useState<Metrica>('turmas')

  const opcoes = METRICAS.map((m) => ({ value: m, label: t(`dashboard.rankings.metric.${m}`) }))

  return (
    <div className="space-y-3">
      <AppCardToolbar
        start={
          <div className="w-full sm:w-56">
            <AppDropdown
              value={metrica}
              options={opcoes}
              optionLabel="label"
              optionValue="value"
              onChange={(e) => setMetrica(e.value as Metrica)}
              aria-label={t('dashboard.rankings.metric.label')}
            />
          </div>
        }
      />
      <div className="grid gap-4 xl:grid-cols-2">
        <Ranking titulo={t('dashboard.rankings.courses')} linhas={rankings.courses} metrica={metrica} inkIndex={0} />
        <Ranking titulo={t('dashboard.rankings.clients')} linhas={rankings.clients} metrica={metrica} inkIndex={2} />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Pendurar no `AdminView`**

Dentro da `<section>` de análise, **depois** do `SeriesPanel`:

```tsx
        {data.rankings !== null && <RankingsPanel rankings={data.rankings} />}
```

E o import:

```tsx
import { RankingsPanel } from './RankingsPanel'
```

- [ ] **Step 3: Verificar a régua do `AdminView`**

```bash
cd frontend && wc -l src/app/pages/Dashboard/admin/AdminView.tsx && pnpm lint
```
Expected: abaixo de 150, e `pnpm lint` exit 0. Se estourar, divida — a régua não se afrouxa.

- [ ] **Step 4: As chaves de i18n**

`es-CL.json`:

```json
    "rankings": {
      "courses": "Cursos más demandados",
      "clients": "Clientes más activos",
      "empty": "Sin datos en el período",
      "metric": {
        "label": "Métrica",
        "turmas": "Clases",
        "matriculas": "Matrículas",
        "certificados": "Certificados",
        "uf_aprovada": "UF aprobada"
      }
    },
```

`pt-BR.json`:

```json
    "rankings": {
      "courses": "Cursos mais demandados",
      "clients": "Clientes mais ativos",
      "empty": "Sem dados no período",
      "metric": {
        "label": "Métrica",
        "turmas": "Turmas",
        "matriculas": "Matrículas",
        "certificados": "Certificados",
        "uf_aprovada": "UF aprovada"
      }
    },
```

`en.json`:

```json
    "rankings": {
      "courses": "Most requested courses",
      "clients": "Most active clients",
      "empty": "No data in the period",
      "metric": {
        "label": "Metric",
        "turmas": "Classes",
        "matriculas": "Enrollments",
        "certificados": "Certificates",
        "uf_aprovada": "Approved UF"
      }
    },
```

- [ ] **Step 5: Provar na tela**

1. Os dois rankings desenham, ordenados do maior para o menor.
2. Trocar a métrica para "UF aprobada" reordena as barras e o eixo passa a mostrar UF formatada.
3. Trocar o período muda os dois rankings e nada mais.
4. Com um papel sem `commercial.*`, a coluna de UF do payload chega `null` e a linha **some** do
   gráfico da métrica de UF — não vira barra de tamanho zero. (Prova completa na Task 11.)

- [ ] **Step 6: Gate completo**

```bash
cd frontend && pnpm lint && pnpm build && pnpm test
```
Expected: os três verdes.

- [ ] **Step 7: Commit**

```bash
cd /home/jvbat/projetos/lotus && git add \
  frontend/src/app/pages/Dashboard/admin \
  frontend/src/shared/config/locales/es-CL.json \
  frontend/src/shared/config/locales/pt-BR.json \
  frontend/src/shared/config/locales/en.json
git commit -m "feat(dashboard): rankings de cursos e clientes

Barra horizontal porque o rotulo e nome de curso e razao social: deitada, ele
e lido como qualquer texto da tela em vez de girado ou truncado.

Uma metrica por vez e nao 4 barras agrupadas: uf_aprovada e decimal e as
outras tres sao contagem — mesmo problema de eixo que separou os graficos de
serie. uf_aprovada null e gate comercial fechado, entao a linha SOME do
grafico; barra de tamanho zero seria a mentira que a D7 proibe."
```

---

## Task 9: Compliance de turmas e carga de redatores (D9)

**Files:**
- Create: `frontend/src/app/pages/Dashboard/admin/CompliancePanel.tsx`
- Create: `frontend/src/app/pages/Dashboard/admin/RedatorLoadPanel.tsx`
- Modify: `frontend/src/app/pages/Dashboard/admin/AdminView.tsx`
- Modify: `frontend/src/shared/config/locales/{es-CL,pt-BR,en}.json`

**Interfaces:**
- Consumes: `AppDataTable`, `AppColumn` (já em `shared/ui`); `SectionLabel` (Task 4).
- Produces:
  - `export function CompliancePanel({ turmas }: { turmas: TurmaComplianceData[] }): JSX.Element`
  - `export function RedatorLoadPanel({ redatores }: { redatores: RedatorLoadData[] }): JSX.Element`

**Sem `SearchableTableFrame` (D9):** dashboard é visão; busca é do módulo dono. E sem reescrever o
rodapé à mão — a rule proíbe, e reescrevê-lo rendeu, em 6 cópias, paginador duplicado e vazio falso.

- [ ] **Step 1: Escrever o `CompliancePanel`**

`frontend/src/app/pages/Dashboard/admin/CompliancePanel.tsx`:

```tsx
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AppCard, AppCardHeader, AppDataTable, AppColumn, AppEmptyState, AppTag } from '@shared/ui'
import { formatDate } from '@shared/lib'
import type { TurmaComplianceData } from '@shared/types/generated'

/** Ancorado ao meio-dia: data ISO pura é lida como UTC e volta um dia num fuso
 * a oeste (mesma razão do `formatMonthYear`). */
const dia = (iso: string) => formatDate(new Date(`${iso}T12:00:00`))

/**
 * Compliance documental das turmas. Tabela de verdade e não lista compacta
 * (D9): são 8 campos por linha, e em linha compacta metade trunca.
 *
 * `AppDataTable` sem `SearchableTableFrame`: dashboard é visão, busca é do
 * módulo dono. O wrapper já resolve vazio, ordenação e o rodapé de contagem — e
 * reescrever esse rodapé à mão rendeu, em 6 cópias, paginador duplicado e
 * vazio falso.
 *
 * A janela histórica NÃO alcança esta seção: compliance é estado ATUAL (D3 do
 * bloco A), e é por isso que ela mora fora da seção de análise.
 */
export function CompliancePanel({ turmas }: { turmas: TurmaComplianceData[] }) {
  const { t } = useTranslation()

  return (
    <AppCard>
      <AppCardHeader title={t('dashboard.compliance.title')} count={turmas.length} />
      <AppDataTable
        value={turmas}
        dataKey="turma_id"
        emptyMessage={<AppEmptyState icon="pi pi-verified" title={t('dashboard.compliance.empty')} />}
        footerCount={t('dashboard.compliance.count', { count: turmas.length })}
      >
        <AppColumn
          field="course_name"
          header={t('dashboard.compliance.course')}
          sortable
          body={(r: TurmaComplianceData) => (
            <Link to={`/operacion/turmas/${r.turma_id}`} className="no-underline" style={{ color: 'var(--text-color)' }}>
              {r.course_name}
            </Link>
          )}
        />
        <AppColumn
          header={t('dashboard.compliance.redatores')}
          body={(r: TurmaComplianceData) =>
            r.redatores.length === 0 ? (
              <span style={{ color: 'var(--text-color-secondary)' }}>{t('dashboard.compliance.noRedator')}</span>
            ) : (
              r.redatores.join(', ')
            )
          }
        />
        <AppColumn
          header={t('dashboard.compliance.range')}
          body={(r: TurmaComplianceData) => (
            <span className="font-mono text-xs">
              {t('dashboard.agenda.range', { start: dia(r.start_date), end: dia(r.end_date) })}
            </span>
          )}
        />
        <AppColumn
          header={t('dashboard.compliance.present')}
          body={(r: TurmaComplianceData) => r.present_types.length}
        />
        <AppColumn
          header={t('dashboard.compliance.missing')}
          body={(r: TurmaComplianceData) =>
            r.missing_types.length === 0 ? '—' : r.missing_types.join(', ')
          }
        />
        <AppColumn
          header={t('dashboard.compliance.enabled')}
          sortable
          field="habilitada"
          body={(r: TurmaComplianceData) => (
            <AppTag
              value={r.habilitada ? t('common.yes') : t('common.no')}
              severity={r.habilitada ? 'success' : 'warning'}
            />
          )}
        />
      </AppDataTable>
    </AppCard>
  )
}
```

**`common.yes` e `common.no` NÃO existem em nenhuma das 3 locales** (medido). Elas entram no Step 3.

- [ ] **Step 2: Escrever o `RedatorLoadPanel`**

`frontend/src/app/pages/Dashboard/admin/RedatorLoadPanel.tsx`:

```tsx
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AppCard, AppCardHeader, AppDataTable, AppColumn, AppEmptyState } from '@shared/ui'
import { dangerText, warningText } from '@shared/styles/tokens'
import type { RedatorLoadData } from '@shared/types/generated'

/** Contador que só ganha tinta quando é diferente de zero: um "0 vencidos" em
 * vermelho leria como alarme sobre a informação mais tranquilizadora da linha.
 * Cor por `style` e token, nunca por classe Tailwind (ADR-16). */
function Contador({ valor, ink }: { valor: number; ink?: string }) {
  return (
    <span className="font-mono tabular-nums" style={valor > 0 && ink ? { color: ink } : undefined}>
      {valor}
    </span>
  )
}

/**
 * Carga dos redatores: quantas turmas cada um tem agora e em seguida, e quantos
 * documentos dele estão vencidos ou vencendo. Estado ATUAL — a janela histórica
 * não alcança esta seção (D3 do bloco A).
 *
 * Tabela e não lista (D9): 6 campos por linha, todos numéricos exceto o nome.
 *
 * LIMITAÇÃO DECLARADA (P-44, D10): no banco de dev esta tabela mostra dois
 * usuários-sonda de gates anteriores. Apagá-los é mutação de dado alheia a um
 * bloco read-only, e a ficha da pendência fecha "quando um bloco puder
 * reseedar o banco de dev" — este não pode.
 */
export function RedatorLoadPanel({ redatores }: { redatores: RedatorLoadData[] }) {
  const { t } = useTranslation()

  return (
    <AppCard>
      <AppCardHeader title={t('dashboard.redatorLoad.title')} count={redatores.length} />
      <AppDataTable
        value={redatores}
        dataKey="redator_id"
        emptyMessage={<AppEmptyState icon="pi pi-users" title={t('dashboard.redatorLoad.empty')} />}
        footerCount={t('dashboard.redatorLoad.count', { count: redatores.length })}
      >
        <AppColumn
          field="name"
          header={t('dashboard.redatorLoad.name')}
          sortable
          body={(r: RedatorLoadData) => (
            // `/personas` SEM parâmetro, e não `/personas/{id}`: não existe rota
            // de detalhe de relator — `AppRouter` registra só `/personas`, e o
            // `navigation.ts:49-50` já resolveu o mesmo caso com `key: null`
            // ("listagem com diálogo, sem rota de detalhe"). Ancorar na entidade
            // é o FUT-2 do backlog e depende de decisão do João; inventar
            // `/personas/{id}` aqui daria 404 depois do clique, que é pior que
            // link nenhum.
            <Link to="/personas" className="no-underline" style={{ color: 'var(--text-color)' }}>
              {r.name}
            </Link>
          )}
        />
        <AppColumn
          field="current_turmas"
          header={t('dashboard.redatorLoad.current')}
          sortable
          body={(r: RedatorLoadData) => <Contador valor={r.current_turmas} />}
        />
        <AppColumn
          field="upcoming_turmas"
          header={t('dashboard.redatorLoad.upcoming')}
          sortable
          body={(r: RedatorLoadData) => <Contador valor={r.upcoming_turmas} />}
        />
        <AppColumn
          field="expired_documents"
          header={t('dashboard.redatorLoad.expired')}
          sortable
          body={(r: RedatorLoadData) => <Contador valor={r.expired_documents} ink={dangerText} />}
        />
        <AppColumn
          field="expiring_documents"
          header={t('dashboard.redatorLoad.expiring')}
          sortable
          body={(r: RedatorLoadData) => <Contador valor={r.expiring_documents} ink={warningText} />}
        />
      </AppDataTable>
    </AppCard>
  )
}
```

- [ ] **Step 3: Pendurar as duas no `AdminView` e as chaves de i18n**

Em `admin/AdminView.tsx`, **depois** da seção de análise:

```tsx
      {/* Estado ATUAL, não histórico: por isso fora da seção de análise, e o
        * seletor de janela não as toca (D3 do bloco A). */}
      {(data.compliance_turmas !== null || data.redatores !== null) && (
        <section className="space-y-3">
          <SectionLabel>{t('dashboard.section.compliance')}</SectionLabel>
          <div className="space-y-4">
            {data.compliance_turmas !== null && <CompliancePanel turmas={data.compliance_turmas} />}
            {data.redatores !== null && <RedatorLoadPanel redatores={data.redatores} />}
          </div>
        </section>
      )}
```

E os imports:

```tsx
import { CompliancePanel } from './CompliancePanel'
import { RedatorLoadPanel } from './RedatorLoadPanel'
```

**Duas coisas medidas antes de escrever:**
1. `common.yes`/`common.no` **não existem** — entram nas 3 locales, dentro de `common`.
2. A contagem de rodapé do repositório **não usa plural do i18next**: `role.count` é
   `"{{count}} roles"`, forma única, sem `_other`. As novas seguem o mesmo formato — inventar
   `count_other` aqui criaria duas gramáticas de rodapé na mesma aplicação.

`es-CL.json`, dentro de `common`:

```json
    "yes": "Sí",
    "no": "No",
```

`es-CL.json`, dentro de `dashboard` (mais `section.compliance`):

```json
      "compliance": "Cumplimiento y carga"
```
```json
    "compliance": {
      "title": "Cumplimiento documental de clases",
      "empty": "Sin clases que revisar",
      "count": "{{count}} clases",
      "course": "Curso",
      "redatores": "Relatores",
      "noRedator": "Sin relator",
      "range": "Período",
      "present": "Documentos presentes",
      "missing": "Documentos faltantes",
      "enabled": "Habilitada"
    },
    "redatorLoad": {
      "title": "Carga de relatores",
      "empty": "Sin relatores",
      "count": "{{count}} relatores",
      "name": "Relator",
      "current": "Clases en curso",
      "upcoming": "Próximas clases",
      "expired": "Documentos vencidos",
      "expiring": "Documentos por vencer"
    },
```

`pt-BR.json`, dentro de `common`:

```json
    "yes": "Sim",
    "no": "Não",
```

`pt-BR.json`, dentro de `dashboard`:

```json
      "compliance": "Conformidade e carga"
```
```json
    "compliance": {
      "title": "Conformidade documental das turmas",
      "empty": "Sem turmas a revisar",
      "count": "{{count}} turmas",
      "course": "Curso",
      "redatores": "Relatores",
      "noRedator": "Sem relator",
      "range": "Período",
      "present": "Documentos presentes",
      "missing": "Documentos faltantes",
      "enabled": "Habilitada"
    },
    "redatorLoad": {
      "title": "Carga de relatores",
      "empty": "Sem relatores",
      "count": "{{count}} relatores",
      "name": "Relator",
      "current": "Turmas em curso",
      "upcoming": "Próximas turmas",
      "expired": "Documentos vencidos",
      "expiring": "Documentos a vencer"
    },
```

`en.json`, dentro de `common`:

```json
    "yes": "Yes",
    "no": "No",
```

`en.json`, dentro de `dashboard`:

```json
      "compliance": "Compliance and workload"
```
```json
    "compliance": {
      "title": "Class document compliance",
      "empty": "No classes to review",
      "count": "{{count}} classes",
      "course": "Course",
      "redatores": "Instructors",
      "noRedator": "No instructor",
      "range": "Period",
      "present": "Documents on file",
      "missing": "Missing documents",
      "enabled": "Enabled"
    },
    "redatorLoad": {
      "title": "Instructor workload",
      "empty": "No instructors",
      "count": "{{count}} instructors",
      "name": "Instructor",
      "current": "Classes in progress",
      "upcoming": "Upcoming classes",
      "expired": "Expired documents",
      "expiring": "Documents expiring"
    },
```

- [ ] **Step 4: Provar na tela**

1. As duas tabelas renderizam com dado do seed, ordenáveis pelas colunas marcadas.
2. Trocar o período **não** muda nenhuma das duas — é a D3 do bloco A provada na tela.
3. Os dois usuários-sonda da P-44 aparecem na carga. **Anote os nomes** para a limitação declarada
   da Task 11.

- [ ] **Step 5: Gate completo**

```bash
cd frontend && pnpm lint && pnpm build && pnpm test
```
Expected: os três verdes, e `AdminView.tsx` ainda sob 150.

- [ ] **Step 6: Commit**

```bash
cd /home/jvbat/projetos/lotus && git add \
  frontend/src/app/pages/Dashboard/admin \
  frontend/src/shared/config/locales/es-CL.json \
  frontend/src/shared/config/locales/pt-BR.json \
  frontend/src/shared/config/locales/en.json
git commit -m "feat(dashboard): compliance de turmas e carga de redatores

D9: AppDataTable sem SearchableTableFrame — dashboard e visao, busca e do
modulo dono. O dado e tabular de verdade (8 e 6 campos) e o wrapper ja resolve
vazio, ordenacao e rodape de contagem.

Fora da secao de analise de proposito: as duas sao estado ATUAL e a janela
historica nao as toca (D3 do bloco A).

D10: a carga mostra os dois usuarios-sonda da P-44 no banco de dev. Fica
declarado, nao apagado — limpar usuario que pode estar ligado a turma e
mutacao alheia a um bloco read-only."
```

---

## Task 10: A view do Redator inteira

**Files:**
- Create: `frontend/src/app/pages/Dashboard/redator/resumoCards.ts`
- Create: `frontend/src/app/pages/Dashboard/redator/resumoCards.test.ts`
- Create: `frontend/src/app/pages/Dashboard/redator/PendenciasList.tsx`
- Create: `frontend/src/app/pages/Dashboard/redator/RedatorView.tsx`
- Modify: `frontend/src/app/pages/Dashboard/DashboardPage.tsx`
- Modify: `frontend/src/shared/config/locales/{es-CL,pt-BR,en}.json`

**Interfaces:**
- Consumes: `Kpi`/`KpiRow`, `AgendaPanel` genérico, `AlertList`, `SectionLabel` (Task 4).
- Produces:
  - `export function resumoCards(r: RedatorResumoData): Kpi[]`
  - `export function historicoCards(h: RedatorHistoricoData): Kpi[]`
  - `export function PendenciasList({ items }: { items: RedatorTurmaPendenciaData[] }): JSX.Element`
  - `export function RedatorView({ data }: { data: RedatorDashboardData }): JSX.Element`

**As 5 seções do contrato e quem renderiza cada uma** (mapeamento da spec §4):

| Seção do contrato | Quem renderiza | Origem |
|---|---|---|
| `resumo` (4 contadores) | `KpiRow` | derivação em `redator/resumoCards.ts` |
| `historico` (2 contadores) | `KpiRow`, segunda instância | derivação em `redator/resumoCards.ts` |
| `agenda` (4 janelas) | `AgendaPanel`, genérico sobre a linha | D13 |
| `pendencias_documentais` | `redator/PendenciasList.tsx` | novo |
| `alertas_documentos` | `AlertList` | reuso direto, mesmo tipo |

**Limitação em vigor (spec §9.1):** nenhum redator autentica hoje —
`CreateRedatorAction.php:20` cria com `is_active=false` e `AuthController.php:52` recusa inativo. O
aceite desta task é por **payload e render**, não por sessão real.

- [ ] **Step 1: Escrever o teste das duas derivações (cenário 6), falhando**

`frontend/src/app/pages/Dashboard/redator/resumoCards.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { historicoCards, resumoCards } from './resumoCards'

describe('resumoCards', () => {
  // As 4 chaves de `RedatorResumoData` são NÃO-anuláveis (`generated.ts:433-438`):
  // não há gate a esconder, então nenhum card some. É a diferença estrutural
  // para `kpiCards`, e é o que faz o Redator não ter estado `unauthorized`.
  it('os 4 contadores viram 4 cards, na ordem do contrato', () => {
    expect(
      resumoCards({
        turmas_em_andamento: 2,
        proximas_turmas: 1,
        pendencias_documentais: 3,
        documentos_vencendo: 0,
      }).map((c) => c.key),
    ).toEqual([
      'dashboard.redator.kpi.turmasEmAndamento',
      'dashboard.redator.kpi.proximasTurmas',
      'dashboard.redator.kpi.pendenciasDocumentais',
      'dashboard.redator.kpi.documentosVencendo',
    ])
  })

  it('zero vira card — não há null a esconder neste contrato', () => {
    const cards = resumoCards({
      turmas_em_andamento: 0,
      proximas_turmas: 0,
      pendencias_documentais: 0,
      documentos_vencendo: 0,
    })
    expect(cards).toHaveLength(4)
    expect(cards.every((c) => c.value === '0')).toBe(true)
  })

  // Pendência e vencimento levam tom; turma em curso e próxima, não: tom é
  // severidade, e "tenho 2 turmas" não é aviso de nada.
  it('só pendência e vencimento carregam tom de severidade', () => {
    const porChave = Object.fromEntries(
      resumoCards({
        turmas_em_andamento: 2,
        proximas_turmas: 1,
        pendencias_documentais: 3,
        documentos_vencendo: 1,
      }).map((c) => [c.key, c.tone]),
    )
    expect(porChave).toEqual({
      'dashboard.redator.kpi.turmasEmAndamento': 'info',
      'dashboard.redator.kpi.proximasTurmas': 'neutral',
      'dashboard.redator.kpi.pendenciasDocumentais': 'warning',
      'dashboard.redator.kpi.documentosVencendo': 'warning',
    })
  })
})

describe('historicoCards', () => {
  // Instância SEPARADA de KpiRow, e não seis cards numa fileira: resumo e
  // histórico respondem perguntas diferentes — "o que tenho agora" e "o que já
  // fiz" — e o Drive as separa. Cada uma leva sua faixa de seção.
  it('os 2 contadores do histórico viram 2 cards neutros', () => {
    const cards = historicoCards({ turmas_concluidas: 9, certificados_emitidos: 41 })
    expect(cards.map((c) => c.key)).toEqual([
      'dashboard.redator.kpi.turmasConcluidas',
      'dashboard.redator.kpi.certificadosEmitidos',
    ])
    expect(cards.map((c) => c.value)).toEqual(['9', '41'])
    expect(cards.every((c) => c.tone === 'neutral')).toBe(true)
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd frontend && pnpm test resumoCards`
Expected: FAIL — `Failed to resolve import "./resumoCards"`.

- [ ] **Step 3: Escrever as derivações**

`frontend/src/app/pages/Dashboard/redator/resumoCards.ts`:

```ts
import type { RedatorHistoricoData, RedatorResumoData } from '@shared/types/generated'
import type { Kpi } from '../KpiRow'

/**
 * Os 4 contadores do "o que tenho agora" do Redator.
 *
 * Sem nenhum `if` de nulidade, ao contrário do `admin/kpiCards.ts`: as 4 chaves
 * de `RedatorResumoData` são NÃO-anuláveis (`generated.ts:433-438`) — não há
 * gate a esconder porque o payload já é o dele. É a mesma razão estrutural pela
 * qual o Redator não tem estado `unauthorized`.
 *
 * Tom só onde há severidade: pendência documental e documento vencendo pedem
 * ação; "tenho 2 turmas em curso" não é aviso de nada.
 */
export function resumoCards(r: RedatorResumoData): Kpi[] {
  return [
    { key: 'dashboard.redator.kpi.turmasEmAndamento', value: String(r.turmas_em_andamento), tone: 'info' },
    { key: 'dashboard.redator.kpi.proximasTurmas', value: String(r.proximas_turmas), tone: 'neutral' },
    { key: 'dashboard.redator.kpi.pendenciasDocumentais', value: String(r.pendencias_documentais), tone: 'warning' },
    { key: 'dashboard.redator.kpi.documentosVencendo', value: String(r.documentos_vencendo), tone: 'warning' },
  ]
}

/**
 * Os 2 contadores do "o que já fiz". Instância SEPARADA de `KpiRow`, e não seis
 * cards numa fileira só: resumo e histórico respondem perguntas diferentes, e o
 * Drive as separa. Neutros os dois — histórico não tem urgência.
 */
export function historicoCards(h: RedatorHistoricoData): Kpi[] {
  return [
    { key: 'dashboard.redator.kpi.turmasConcluidas', value: String(h.turmas_concluidas), tone: 'neutral' },
    { key: 'dashboard.redator.kpi.certificadosEmitidos', value: String(h.certificados_emitidos), tone: 'neutral' },
  ]
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `cd frontend && pnpm test resumoCards`
Expected: PASS, 4 casos.

- [ ] **Step 5: Escrever a lista de pendências documentais**

`frontend/src/app/pages/Dashboard/redator/PendenciasList.tsx`:

```tsx
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AppCard, AppCardHeader, AppEmptyState, AppButton } from '@shared/ui'
import { formatDate } from '@shared/lib'
import { warningText } from '@shared/styles/tokens'
import type { RedatorTurmaPendenciaData } from '@shared/types/generated'

const dia = (iso: string) => formatDate(new Date(`${iso}T12:00:00`))

/**
 * Turmas do próprio Redator com documento faltando. Sem cliente, sem UF, sem
 * turma alheia — o payload `view=redator` já chega filtrado da API, e esta tela
 * não tem como pedir mais do que ele traz.
 *
 * A ação leva ao Meu Perfil e não a um formulário local: o Redator anexa
 * documento POR LÁ, e este bloco é read-only. Botão fora do `<li>` para o
 * ponteiro não competir com nada dentro da linha.
 */
export function PendenciasList({ items }: { items: RedatorTurmaPendenciaData[] }) {
  const { t } = useTranslation()

  return (
    <AppCard>
      <AppCardHeader
        title={t('dashboard.redator.pendencias.title')}
        count={items.length}
        actions={
          items.length > 0 ? (
            // `/perfil` — o path que o `AppRouter` registra. Não é `/mi-perfil`.
            <Link to="/perfil" className="no-underline">
              <AppButton label={t('dashboard.redator.pendencias.goToProfile')} text />
            </Link>
          ) : undefined
        }
      />
      {items.length === 0 ? (
        <AppEmptyState
          icon="pi pi-check-circle"
          title={t('dashboard.redator.pendencias.empty')}
          description={t('dashboard.redator.pendencias.emptyHint')}
        />
      ) : (
        <ul className="m-0 list-none p-0">
          {items.map((item) => (
            <li
              key={item.turma_id}
              className="border-b px-4 py-2 last:border-b-0"
              style={{ borderColor: 'var(--surface-border)' }}
            >
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
                <span className="min-w-0 basis-full sm:flex-1 sm:basis-0">
                  <span className="block truncate text-sm font-medium" title={item.course_name}>
                    {item.course_name}
                  </span>
                  <span className="block truncate text-xs" style={{ color: warningText }}>
                    {t('dashboard.redator.pendencias.missing', { types: item.missing_types.join(', ') })}
                  </span>
                </span>
                <span className="shrink-0 font-mono text-xs" style={{ color: 'var(--text-color-secondary)' }}>
                  {t('dashboard.redator.pendencias.until', { date: dia(item.end_date) })}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </AppCard>
  )
}
```

- [ ] **Step 6: Compor a view**

`frontend/src/app/pages/Dashboard/redator/RedatorView.tsx`:

```tsx
import { useTranslation } from 'react-i18next'
import type { RedatorDashboardData } from '@shared/types/generated'
import { SectionLabel } from '../SectionLabel'
import { KpiRow } from '../KpiRow'
import { AgendaPanel } from '../AgendaPanel'
import { AlertList } from '../AlertList'
import { PendenciasList } from './PendenciasList'
import { historicoCards, resumoCards } from './resumoCards'

/**
 * Painel do Redator: as 5 seções do contrato `view=redator`, e nada além.
 *
 * Não há gate a testar aqui — as 6 chaves são não-anuláveis
 * (`generated.ts:376-383`) — e não há ocultação a fazer: o payload já chega
 * filtrado da API, sem Comercial, sem UF, sem cliente e sem turma alheia. O
 * `AgendaPanel` genérico (D13) fecha o ownership pelo TIPO:
 * `RedatorAgendaTurmaData` não tem `client_name`, então não existe o que
 * esconder.
 *
 * Três dos cinco renderizadores são reuso medido, não abstração especulativa
 * (D13): `AlertList` consome o MESMO `AlertData[]`, `KpiRow` já era genérico
 * sobre `Kpi[]` e `AgendaPanel` divergia em exatamente um campo.
 */
export function RedatorView({ data }: { data: RedatorDashboardData }) {
  const { t } = useTranslation()

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <SectionLabel>{t('dashboard.redator.section.now')}</SectionLabel>
        <KpiRow items={resumoCards(data.resumo)} />
      </section>

      <section className="space-y-3">
        <SectionLabel>{t('dashboard.redator.section.action')}</SectionLabel>
        <div className="grid gap-4 xl:grid-cols-2">
          <PendenciasList items={data.pendencias_documentais} />
          <AlertList items={data.alertas_documentos} />
        </div>
      </section>

      <section className="space-y-3">
        <SectionLabel>{t('dashboard.redator.section.agenda')}</SectionLabel>
        <AgendaPanel agenda={data.agenda} />
      </section>

      {/* Instância separada de KpiRow, com faixa própria: resumo e histórico
        * respondem perguntas diferentes — "o que tenho agora" e "o que já fiz"
        * — e o Drive as separa. */}
      <section className="space-y-3">
        <SectionLabel>{t('dashboard.redator.section.history')}</SectionLabel>
        <KpiRow items={historicoCards(data.historico)} />
      </section>
    </div>
  )
}
```

- [ ] **Step 7: Ligar o ramo na página**

Em `frontend/src/app/pages/Dashboard/DashboardPage.tsx`, **substitua**
`if (state.kind === 'ready-redator') return <div>{header}</div>` por:

```tsx
  if (state.kind === 'ready-redator') {
    return (
      <div>
        {header}
        {/* Falha COM dado em mão: aviso ao lado (BD-6). O Redator não tem
          * seletor de janela, então o aviso mora aqui e não junto de um
          * controle. */}
        <InlineLoadState error={state.staleError} retryLabel={t('common.retry')} onRetry={state.retry} />
        <RedatorView data={state.data} />
      </div>
    )
  }
```

E os imports (`InlineLoadState` volta ao import de `@shared/ui` se tiver saído na Task 6):

```tsx
import { RedatorView } from './redator/RedatorView'
```

- [ ] **Step 8: As chaves de i18n**

`es-CL.json`, dentro de `dashboard`:

```json
    "redator": {
      "section": {
        "now": "Mi situación",
        "action": "Requiere mi acción",
        "agenda": "Mis clases",
        "history": "Mi historial"
      },
      "kpi": {
        "turmasEmAndamento": "Clases en curso",
        "proximasTurmas": "Próximas clases",
        "pendenciasDocumentais": "Clases con documentación pendiente",
        "documentosVencendo": "Mis documentos por vencer",
        "turmasConcluidas": "Clases concluidas",
        "certificadosEmitidos": "Certificados emitidos"
      },
      "pendencias": {
        "title": "Documentación pendiente",
        "empty": "Sin documentación pendiente",
        "emptyHint": "Todas tus clases tienen la documentación al día.",
        "missing": "Falta: {{types}}",
        "until": "Hasta {{date}}",
        "goToProfile": "Ir a Mi Perfil"
      }
    },
```

`pt-BR.json`:

```json
    "redator": {
      "section": {
        "now": "Minha situação",
        "action": "Requer minha ação",
        "agenda": "Minhas turmas",
        "history": "Meu histórico"
      },
      "kpi": {
        "turmasEmAndamento": "Turmas em curso",
        "proximasTurmas": "Próximas turmas",
        "pendenciasDocumentais": "Turmas com documentação pendente",
        "documentosVencendo": "Meus documentos a vencer",
        "turmasConcluidas": "Turmas concluídas",
        "certificadosEmitidos": "Certificados emitidos"
      },
      "pendencias": {
        "title": "Documentação pendente",
        "empty": "Sem documentação pendente",
        "emptyHint": "Todas as suas turmas estão com a documentação em dia.",
        "missing": "Falta: {{types}}",
        "until": "Até {{date}}",
        "goToProfile": "Ir ao Meu Perfil"
      }
    },
```

`en.json`:

```json
    "redator": {
      "section": {
        "now": "My status",
        "action": "Needs my action",
        "agenda": "My classes",
        "history": "My history"
      },
      "kpi": {
        "turmasEmAndamento": "Classes in progress",
        "proximasTurmas": "Upcoming classes",
        "pendenciasDocumentais": "Classes with pending documents",
        "documentosVencendo": "My documents expiring",
        "turmasConcluidas": "Classes completed",
        "certificadosEmitidos": "Certificates issued"
      },
      "pendencias": {
        "title": "Pending documents",
        "empty": "No pending documents",
        "emptyHint": "All your classes have their documents up to date.",
        "missing": "Missing: {{types}}",
        "until": "Until {{date}}",
        "goToProfile": "Go to My Profile"
      }
    },
```

O `KpiRow` já traduz por `t(kpi.key)` desde a Task 4 (Emenda 3), então estas chaves entram
completas em `resumoCards.ts` e nada mais precisa mudar aqui.

- [ ] **Step 9: Provar a view por payload — não há sessão de redator (spec §9.1)**

Com `pnpm dev` de pé e logado como admin, force o payload no devtools do navegador:

```js
// Console do navegador, com o Dashboard aberto.
// Substitui a resposta do endpoint por um payload de redator, sem tocar no banco.
const orig = window.fetch
window.fetch = async (...a) => {
  const r = await orig(...a)
  if (String(a[0]).includes('/api/dashboard/metricas')) {
    return new Response(JSON.stringify({
      view: 'redator',
      resumo: { turmas_em_andamento: 2, proximas_turmas: 1, pendencias_documentais: 1, documentos_vencendo: 0 },
      agenda: { starting_soon: [], ending_soon: [], in_progress: [{ turma_id: 1, course_name: 'Alta tensión', start_date: '2026-08-01', end_date: '2026-09-01' }], overdue: [] },
      pendencias_documentais: [{ turma_id: 1, course_name: 'Alta tensión', end_date: '2026-09-01', missing_types: ['CV'] }],
      alertas_documentos: [],
      historico: { turmas_concluidas: 9, certificados_emitidos: 41 },
    }), { status: 200, headers: { 'content-type': 'application/json' } })
  }
  return r
}
```

Depois recarregue a query (troque de rota e volte). Confira e anote:
1. As **4 seções** com faixa própria renderizam; a agenda mostra a turma **sem linha de cliente**.
2. **Nenhum** seletor de período, nenhum ranking, nenhum compliance, nenhum KPI de cotação, nenhuma
   UF em lugar nenhum da tela.
3. O botão "Ir a Mi Perfil" navega para o Meu Perfil.
4. Nenhuma chave crua (nada com cara de `dashboard.redator.…` na tela).

Restaure com `location.reload()`.

- [ ] **Step 10: Gate completo**

```bash
cd frontend && pnpm lint && pnpm build && pnpm test
```
Expected: os três verdes.

- [ ] **Step 11: Commit**

```bash
cd /home/jvbat/projetos/lotus && git add \
  frontend/src/app/pages/Dashboard \
  frontend/src/shared/config/locales/es-CL.json \
  frontend/src/shared/config/locales/pt-BR.json \
  frontend/src/shared/config/locales/en.json
git commit -m "feat(dashboard): view do Redator inteira

As 5 secoes do contrato view=redator, e nada alem. Tres dos cinco
renderizadores sao reuso MEDIDO (D13): AlertList consome o mesmo AlertData[],
KpiRow ja era generico sobre Kpi[], e AgendaPanel divergia em exatamente um
campo — client_name —, entao o ownership virou consequencia do TIPO em vez de
condicional de tela.

Duas instancias de KpiRow e nao seis cards: resumo e historico respondem
perguntas diferentes, e o Drive as separa.

Limitacao em vigor (spec §9.1): nenhum redator autentica —
CreateRedatorAction.php:20 cria inativo e AuthController.php:52 recusa. A prova
e por payload e render."
```

---

## Task 11: Provar o DoD, registrar as emendas e fechar o estado

**Files:**
- Modify: `docs/superpowers/specs/2026-08-17-dashboard-frontend-analitico-e-redator-design.md` (§11)
- Modify: `docs/superpowers/state.md`
- Modify: `docs/superpowers/historico/progress.md`

**Interfaces:**
- Consumes: tudo.
- Produces: estado em `ready_for_review`.

**Um passo desta task NÃO é do executor:** o `/lotus-ui-review` (Step 9) é do João —
`disable-model-invocation: true`. O bloco não fecha sem ele, e o aceite da EAP 8.4.0 exige validar
admin e Redator **separadamente**.

- [ ] **Step 1: DoD 1 e 2 — as 6 seções analíticas e o alcance da janela**

Com `docker compose up -d` e `pnpm dev`, logado como admin:
- as 6 seções analíticas (2 cartas de série, 2 rankings, compliance, carga) renderizam com dado do
  seed e o período default de 12 meses;
- trocar o período muda **só** séries e rankings. Anote, para cada uma das outras 7 seções (KPI,
  pendências, alertas, agenda, pipeline, compliance, carga), que o conteúdo é idêntico antes e
  depois.

- [ ] **Step 2: DoD 3 — janela invertida**

Em "Personalizado", ponha `Desde` depois de `Hasta`. Confira: 422 na rede, a tela **permanece** com
o dado anterior, e a frase `La fecha de término no puede ser anterior a la de inicio.` aparece ao
lado do seletor, com botão de reintentar. Anote que ela chega em espanhol nas 3 locales (D-18).

- [ ] **Step 3: DoD 4 — gate `null` por papel-sonda, criado e removido por API**

```bash
cd /home/jvbat/projetos/lotus && docker compose exec -T app php artisan tinker --execute="
\$r = Spatie\Permission\Models\Role::firstOrCreate(['name' => 'sonda-b2', 'guard_name' => 'web']);
\$r->syncPermissions(['operation.turma.view']);
echo 'papel sonda criado: ', \$r->id, PHP_EOL;
"
```

Crie um usuário com esse papel pela UI de Identidade, entre com ele e confira:
1. `compliance_turmas` **presente** (tem `operation.turma.view`), `redatores` **null** → a tabela de
   carga **some inteira**, sem card vazio;
2. `series` com algumas chaves `null` → a série fechada **some do gráfico E da legenda**, e nenhuma
   linha desce a zero;
3. `rankings.*.uf_aprovada` `null` → a linha some da métrica de UF, sem barra de tamanho zero.

Remova o papel-sonda:

```bash
cd /home/jvbat/projetos/lotus && docker compose exec -T app php artisan tinker --execute="
Spatie\Permission\Models\Role::where('name', 'sonda-b2')->delete();
echo 'papel sonda removido', PHP_EOL;
"
```

**O usuário-sonda criado pela UI: apague-o pela UI**, ou anote-o na P-44 se ele já estiver ligado a
alguma turma (mesma regra da D10 — read-only não apaga dado ligado).

- [ ] **Step 4: DoD 5 — a view do Redator**

Repita o Step 9 da Task 10 e anote os 4 pontos. Registre que a prova é por payload, não por sessão
(spec §9.1).

- [ ] **Step 5: DoD 6 — 3 locales × 2 temas**

Percorra o Dashboard nas 3 locales e nos 2 temas. Anote: nenhuma chave crua, nenhuma série
ilegível no tema oposto, e as 5 cores da D2 medidas — a medição é o
`frontend/tests/chart-tokens.test.ts`, que já cobra 3:1 nos dois temas:

```bash
cd frontend && pnpm test chart-tokens
```

- [ ] **Step 6: DoD 7 — a régua da D8 nos dois sentidos**

Repita os Steps 3, 4 e 5 da Task 5 e anote o exit code de cada um.

- [ ] **Step 7: DoD 8 — zero mutação**

```bash
cd /home/jvbat/projetos/lotus && docker compose exec -T mysql sh -c \
  'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" -N -e "
    SELECT table_name, table_rows FROM information_schema.tables
    WHERE table_schema = DATABASE() ORDER BY table_name;" lotus' > /tmp/tabelas-antes.txt
```

Percorra o Dashboard inteiro nas duas views, trocando período e métrica. Repita o comando para
`/tmp/tabelas-depois.txt` e:

```bash
diff /tmp/tabelas-antes.txt /tmp/tabelas-depois.txt && echo "SEM MUTACAO"
```
Expected: `SEM MUTACAO`. (Se o nome do banco ou a variável de senha diferirem, ajuste pelo
`docker-compose.yml` — o que importa é a contagem por tabela antes e depois.)

- [ ] **Step 8: DoD 9 — o escopo é medido, não afirmado**

```bash
cd /home/jvbat/projetos/lotus && \
  echo "--- backend ---" && git diff main...HEAD --stat -- backend/ && \
  echo "--- generated.ts ---" && git diff main...HEAD --stat -- frontend/src/shared/types/generated.ts && \
  echo "--- cors.php ainda fora do commit? ---" && git status --short backend/config/cors.php
```
Expected: os dois primeiros **vazios** (Pint e `typescript:transform` N/A por escopo medido), e o
`cors.php` ainda como ` M` não-staged.

```bash
cd frontend && pnpm lint && pnpm build && pnpm test
```
Expected: os três verdes. **Anote a contagem final de arquivos/testes** — ela vai para o
`progress.md` como número medido, não projetado.

- [ ] **Step 9: DoD 10 — `/lotus-ui-review`. PASSO DO JOÃO**

`disable-model-invocation: true`. **Pare aqui e peça ao João**, informando que o aceite da EAP
8.4.0 exige validar **admin e Redator separadamente** — coisa que o B1 não podia satisfazer, porque
a view do Redator não existia.

Só siga para o Step 10 com o resultado dele em mão.

- [ ] **Step 10: Registrar as duas emendas na spec**

Em `docs/superpowers/specs/2026-08-17-dashboard-frontend-analitico-e-redator-design.md`,
**substitua** a §11 inteira por:

```markdown
## 11. Emendas

### Emenda 1 — a D8 obriga três arquivos que a §4 não listava (Task 4)

A §4 dava ao `DashboardPage.tsx` dois papéis — roteador de `kind` E compositor das seções do
admin — e a D8 põe uma régua de 150 linhas sobre ele. Ele tinha **159 linhas ANTES** das 4 seções
novas; as duas exigências não se satisfazem juntas.

Resolvido sem reabrir a D4, pelo próprio critério dela: o que a §4 já fazia para o Redator
(`RedatorView.tsx`) passa a valer para o admin, e o que as duas views usam mora na raiz. Três
arquivos a mais: `admin/AdminView.tsx`, `SectionLabel.tsx` e `DashboardSkeleton.tsx`.

### Emenda 2 — a D6 troca de mecanismo, não de objetivo (Task 3)

A D6 nomeava `placeholderData: keepPreviousData`. Medido no observador da versão instalada
(`@tanstack/query-core@5.101.1`, `src/queryObserver.ts:486-491`), o placeholder só entra com
`status === 'pending'`:

```ts
if (options.placeholderData !== undefined && data === undefined && status === 'pending') {
```

Quando o fetch da janela nova **falha**, `status` vira `'error'` e `data` volta `undefined` — o
placeholder não entra e a tela vira `AppErrorState`, que é exatamente o que a D6 foi escrita para
impedir. Ele cobre a troca normal (o "ganho de brinde") e **não cobre a troca falhada**, que era o
objetivo declarado.

Substituído por um piso único no hook: o último payload que chegou bom, usado quando `query.data`
está `undefined`. Cobre as duas metades com um mecanismo só; manter os dois seria a segunda fonte
da mesma verdade. O objetivo da D6 e o cenário 4 do §6 não mudaram.

### Emenda 3 — a chave i18n do KPI passa a ser completa (Task 4)

`KpiRow` montava `dashboard.kpi.${key}` dentro do render. Com o Redator como segundo consumidor, as
chaves dele vivem em `dashboard.redator.kpi.*` e o prefixo implícito quebra; a alternativa, uma prop
de prefixo, põe metade da chave no call-site e metade no render. O `Kpi.key` passa a carregar a
chave i18n inteira, e cada módulo de derivação a escreve. É a mesma correção que o Q-1 do review de
2026-08-16 já fez neste arquivo: derivação não escapa do módulo puro para dentro do JSX.
```

- [ ] **Step 11: `progress.md` e `state.md`**

Em `docs/superpowers/historico/progress.md`, acrescente a entrada do bloco no formato que as
anteriores usam: o que entrou, os números medidos (contagem final de arquivos/testes, delta de
bundle do Step 3 da Task 1), as 3 emendas, e as 4 limitações declaradas da spec §9 — com os nomes
dos dois usuários-sonda da P-44 anotados no Step 4 da Task 9.

Em `docs/superpowers/state.md`, atualize o frontmatter:

```yaml
workflow_state: ready_for_review
next_owner: claude
next_action: request_code_review
updated_at: <agora, ISO com fuso -03:00>
```

`active_spec`, `active_plan` e `context_packet` **permanecem preenchidos** — quem fecha é o
`/fechar-sprint`. Acrescente ao bloco `## Trabalho ativo` a subseção `### Execução — <data>` com o
resultado do DoD item a item.

- [ ] **Step 12: Commit final**

```bash
cd /home/jvbat/projetos/lotus && git add \
  docs/superpowers/specs/2026-08-17-dashboard-frontend-analitico-e-redator-design.md \
  docs/superpowers/state.md \
  docs/superpowers/historico/progress.md
git commit -m "docs(state): B2 executado, DoD provado, estado vai a ready_for_review

Tres emendas registradas na spec, todas medidas durante a execucao: a D8
obrigava tres arquivos que a §4 nao listava; a D6 trocou de mecanismo porque
placeholderData so vale com status pending e nao cobria a troca FALHADA, que
era o objetivo dela; e a chave i18n do KPI passou a ser completa quando o
segundo consumidor chegou."
```

- [ ] **Step 13: Conferir que o WIP do João sobreviveu intacto**

```bash
cd /home/jvbat/projetos/lotus && git status --short && \
  git log --oneline main..HEAD && \
  git diff main...HEAD --stat -- backend/
```
Expected: `backend/config/cors.php` ainda ` M` e **não** commitado; o log com os commits das 11
tasks mais os 3 de estado anteriores; o diff de `backend/` **vazio**.

---

## Handoff de execução

**executor: claude**

O bloco é frontend puro, no **main tree** (P-03: task que toca backend assume main tree; esta não
toca backend, e a branch `feat/dashboard-frontend-analitico-e-redator` já está criada e com 3
commits de estado). Fica com o Claude por três razões que não são escrita de tela:

1. **Duas emendas à spec nascem no meio da execução.** A Emenda 2 substitui o mecanismo que a
   decisão aprovada nomeia, com base numa medição no `node_modules`; a Emenda 1 acrescenta arquivos
   que a §4 não lista. Delegar isso pediria que o executor tivesse autoridade para emendar uma
   decisão aprovada — que não é autoridade de executor.
2. **A Task 5 liga uma catraca de lint numa camada inteira** e a prova nos dois sentidos, incluindo
   `--print-config` para confirmar que o `ignores` faz o que o comentário afirma. Mesma categoria da
   Task 2 do B1.
3. **A Task 11 é prova de DoD com papel-sonda de RBAC criado e removido por API, contagem de tabela
   antes e depois, e interceptação de payload no navegador** — e ela precisa saber o que fazer se o
   usuário-sonda ficar ligado a uma turma (a regra da D10, que proíbe apagar).

**A Task 11 tem um passo que não é do executor:** o `/lotus-ui-review` (Step 9) é do João —
`disable-model-invocation: true`. O bloco não fecha sem ele, e o aceite da EAP 8.4.0 exige validar
**admin e Redator separadamente**.
