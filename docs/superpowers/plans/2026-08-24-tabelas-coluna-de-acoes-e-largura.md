# Plano — `tabelas-coluna-de-acoes-e-largura` (item 17)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recomendado) ou superpowers:executing-plans para executar este plano task a task. Os passos usam
> checkbox (`- [ ]`) para rastreio.

**Spec:** [`docs/superpowers/specs/2026-08-24-tabelas-coluna-de-acoes-e-largura-design.md`](../specs/2026-08-24-tabelas-coluna-de-acoes-e-largura-design.md)

**Goal:** toda tabela do sistema termina na mesma coluna de ações — presa à direita do invólucro que
rola — e toda coluna de dado declara largura por política, não por sorteio do `table-layout: auto`.

**Architecture:** uma peça em `shared/ui/AppDataTable/columnWidth.ts` publica um vocabulário de
PESOS por classe de conteúdo (`COL`) e um normalizador (`tableWidths`) que reparte o orçamento da
tabela entre as colunas declaradas. Cada tela ganha um arquivo `<entidade>Columns.ts` ao lado dela
que classifica as próprias colunas — a política é da TELA, que conhece o dado. A coluna de ação
continua em `rem`, via `stickyActionsColumn`, porque é a única que não deve escalar. Duas regras
`no-restricted-syntax` entram por último e transformam a política em mecanismo.

**Tech Stack:** React 19 + TS (Vite), PrimeReact 10.9.8 via `shared/ui`, Tailwind v4 (layout),
Vitest (jsdom), ESLint 9 flat config, `playwright-cli` para medição de tela.

**Worktree/branch:** `/home/jvbat/projetos/fix-frontend`, branch `refactor/tabelas-coluna-de-acoes`,
nascida de `cad0d1fb`. Todos os caminhos deste plano são relativos a `frontend/` salvo quando o
comando diz o contrário.

## Global Constraints

- **Feature não importa PrimeReact direto nem outra feature** — nem para tipo (CLAUDE.md §5.6,
  ADR-05). Tudo que este plano acrescenta vem de `@shared/ui`.
- **`generated.ts` não se edita à mão** (ADR-04). Nenhuma task deste plano toca `src/shared/types/`.
- **Escopo é frontend puro.** `git diff main...HEAD -- backend/ frontend/src/shared/types/generated.ts`
  precisa terminar vazio. Pint e `typescript:transform` são N/A por escopo medido.
- **Largura vai em `style`, nunca em classe do Tailwind.** No PrimeReact 10.9.8 o `className` da
  coluna chega só ao `<td>` (`datatable.cjs.js:1742`), enquanto o `style` entra no `<td>` (`:1258`)
  E no `<th>` (`:5163`) — e é o `<th>` quem sustenta a coluna.
- **Nenhuma coluna nova, nenhuma coluna a menos, nenhum redesenho de célula.** O que muda é largura
  e ancoragem. Botão de texto continua botão de texto (D2 da spec).
- **Idioma do código:** identificadores e comentários em português, no molde de `turmaColumns.ts`.
  Cada arquivo mantém a grafia de aspas que já usa (`ClientsTable.tsx` e `StudentDetailSections.tsx`
  usam aspas duplas; os demais, simples).
- **Comando de gate, rodado de `frontend/`:** `pnpm lint` (0 problemas), `pnpm build` (verde),
  `pnpm test` (sem regressão contra a baseline medida na Task 1).
- **Definition of done é comportamento provado na tela** (CLAUDE.md §5.8), não diff e não suíte.

## Divergências medidas em relação à spec

Quatro. Todas nasceram de medição feita ao escrever o plano, não de preferência, e cada uma está
repetida na task onde importa.

1. **`COL` guarda objeto, não número** (spec §3.1 escreve `code: 8`). A spec §3.2 exige que
   `maxWidth` acompanhe `width` **só** na classe `identity`, e com valores numéricos crus a única
   forma de saber qual classe pede teto seria comparar o peso (`peso === 18`) — frágil no dia em que
   outra classe pesar 18. `COL.identity` passa a ser `{ peso: 18, teto: true }`.
2. **Existe um terceiro orçamento: 100%** (spec §3.2 previu 90 e 66). Três das quinze tabelas não
   têm coluna de ação. Reservar-lhe 10% ali deixaria uma faixa sem dono, que é exatamente o sorteio
   do `table-layout: auto` que este bloco existe para remover. `tableWidths(pesos, { acao: false })`.
3. **A regra R1 mede `JSXOpeningElement` com `:has(> …)`, não `JSXElement` com `:has(…)`** (spec §4).
   A grafia da spec **não dispara**: `body={() => <span style={{…}}>}` é atributo do próprio
   `JSXOpeningElement`, então um `style` aninhado no `body` satisfaz o `:has` descendente e a coluna
   passa sem largura. Três das quinze tabelas têm exatamente essa forma. Sondadas as duas grafias em
   2026-08-24: a da spec acusou zero; a corrigida acusou o sítio certo.
4. **O bloco `src/shared/**` fica fora da catraca** (spec §4 pedia os cinco). Ele casaria três
   arquivos de TESTE de shared que renderizam `AppColumn` de fixture; cobri-los exigiria um
   `ignores` que desligaria junto a catraca de cor naqueles arquivos. A população real de shared são
   as duas colunas de `archivedColumns.tsx`, guardadas por teste comportamental na Task 15.

Uma correção de inventário, também medida: a `EmissionStudentsTable` tem **cinco** colunas de dado,
não as quatro que a spec §3.4 lista. A quinta é `colCertificate`.

---

## Procedimento M — medição de tela

As Tasks 2–14 e 17 terminam aqui. É o único jeito de provar o DoD; screenshot sozinho não mede
largura de coluna.

**M0 · Suba o ambiente uma vez por sessão de execução** (não uma vez por task):

```bash
docker compose up -d                       # da raiz do repo principal, se ainda não estiver de pé
pnpm dev &
playwright-cli -s=item17 open http://localhost:5173
```

Peça ao João o login manual quando a tela pedir — nenhuma task deste plano digita credencial nem
cria, edita ou apaga dado da aplicação. A sessão `item17` é reaproveitada por todas as tasks.

**M1 · Para cada viewport, na rota que a task indicar:**

```bash
playwright-cli -s=item17 resize 1440 900
playwright-cli -s=item17 goto <rota>
playwright-cli -s=item17 eval "$(cat <<'JS'
() => {
  const tabela = document.querySelector('.p-datatable-table')
  const rolo = tabela.closest('.p-datatable-wrapper') ?? tabela.parentElement
  const cabecalhos = [...tabela.querySelectorAll('thead th')]
  const ultimo = cabecalhos[cabecalhos.length - 1]
  const celulaAcao = tabela.querySelector('tbody tr:first-child td:last-child')
  const moldura = rolo.getBoundingClientRect()
  const alvo = (celulaAcao ?? ultimo).getBoundingClientRect()
  return {
    moldura: Math.round(moldura.width),
    tabela: Math.round(tabela.getBoundingClientRect().width),
    rolagemOculta: rolo.scrollWidth - rolo.clientWidth,
    colunas: cabecalhos.map((th) => ({
      rotulo: th.innerText.trim() || '(ações)',
      px: Math.round(th.getBoundingClientRect().width),
      pct: +((th.getBoundingClientRect().width / tabela.getBoundingClientRect().width) * 100).toFixed(1),
    })),
    acaoDentroDaMoldura: alvo.right <= moldura.right + 1 && alvo.left >= moldura.left - 1,
  }
}
JS
)"
```

Repita com `resize 1024 768` e `resize 390 844`.

**M2 · O que a leitura precisa mostrar para a task fechar:**

- `acaoDentroDaMoldura: true` nos **três** viewports, inclusive quando `rolagemOculta > 0`. É a
  prova de que a coluna de ação está presa, e não apenas que a tabela coube.
- `pct` de cada coluna de dado **dentro de ±2 pontos** do que `tableWidths` devolveu para ela. Onde
  divergir mais que isso, o `min-content` venceu a preferência (R1 da spec) — registre o rótulo, o
  `px` medido e o conteúdo que não coube no relato da task; **não** afrouxe a classe para calar a
  divergência sem dizer que a mediu.
- Nenhuma coluna de identidade com `px` menor que 120 em 1440x900 — abaixo disso o `IdentityCell`
  trunca o título junto com a descrição e a linha deixa de identificar a entidade.
- Em 390x844, `rolagemOculta > 0` é o **esperado**, não defeito: o `min-w-[48rem]` do
  `appDataTablePt` faz toda tabela rolar abaixo de 768px por construção (R2 da spec). O que a
  medição prova nesse viewport é `acaoDentroDaMoldura: true` — a coluna presa continua alcançável —,
  e **não** que a tabela coube.

**M3 · Registre a leitura dos três viewports no corpo do commit da task**, uma linha por viewport:
`1440x900 moldura=1387 tabela=1387 rolagem=0 acaoDentro=true`.

Se o dado de alguma tela estiver vazio no ambiente local, a task **não** fecha por inspeção de
código: peça ao João o registro que falta, ou declare a tela como não medida no relato e deixe a
task aberta. Suposição de largura é exatamente o defeito que este bloco corrige.

## Procedimento L — gate de código

Rodado de `frontend/`, no fim de toda task, antes do commit:

```bash
pnpm lint && pnpm build && pnpm test
```

Esperado: `pnpm lint` sem saída de erro; `pnpm build` termina com `built in …`; `pnpm test` com a
mesma contagem de arquivos e testes da baseline da Task 1 (mais os testes que a própria task
acrescentar).

---
## Estrutura de arquivos

**Criados** (todos com uma responsabilidade só: classificar as colunas da tela vizinha):

| Arquivo | Responsável por |
|---|---|
| `src/shared/ui/AppDataTable/columnWidth.ts` | vocabulário `COL`, normalizador `tableWidths`, par `ARCHIVED_COLUMN` |
| `src/shared/ui/AppDataTable/columnWidth.test.ts` | catraca da normalização |
| `src/features/operation/components/Enrollment/enrollmentColumns.ts` | `EnrollmentTable` e `ArchivedEnrollmentsList` |
| `src/features/certification/components/Historial/historialColumns.ts` | `HistorialTable` |
| `src/features/certification/components/Emission/emissionColumns.ts` | `EmissionStudentsTable` |
| `src/features/identity/components/Redator/redatorColumns.ts` | `RedatoresTable` |
| `src/features/identity/components/Admin/userColumns.ts` | `UsersTable` |
| `src/features/identity/components/Admin/roleColumns.ts` | `RolesTable` |
| `src/features/identity/components/Student/studentColumns.ts` | `StudentsTable` e `StudentDetailSections` |
| `src/features/commercial/components/Client/clientColumns.ts` | `ClientsTable` |
| `src/features/commercial/components/Budget/budgetColumns.ts` | `BudgetsTable` |
| `src/features/catalog/components/Course/courseColumns.ts` | `CoursesTable` |
| `src/app/pages/Dashboard/admin/panelColumns.ts` | `CompliancePanel` e `RedatorLoadPanel` |

**Modificados:** `turmaColumns.ts` (reescrito para o vocabulário), os 15 componentes de tabela,
`archivedColumns.tsx`, os dois barris de `shared/ui` e `eslint.config.js`.

**Por que um arquivo por pasta, e não um mapa central:** a classificação é conhecimento de domínio —
saber que `course_name` é o texto livre mais longo da turma e que `quote_code` é identificador
atômico. Um mapa central obrigaria quem mexe numa tela a editar um arquivo compartilhado por quinze,
e é a forma exata do acoplamento que o ADR-05 proíbe entre features.

**Regra de assinatura:** a tabela cuja largura depende de estado de render exporta uma FUNÇÃO
(`<entidade>Widths(...)`); a que não depende exporta uma CONST (`LARGURA_<ENTIDADE>`). Depende de
estado quem tem visão de arquivados (`archived`) ou coluna de ação condicional.

---

### Task 1: A peça de `shared` — `COL`, `tableWidths`, `ARCHIVED_COLUMN`

**Files:**
- Create: `src/shared/ui/AppDataTable/columnWidth.ts`
- Create: `src/shared/ui/AppDataTable/columnWidth.test.ts`
- Modify: `src/shared/ui/AppDataTable/index.ts`

**Interfaces:**
- Consumes: nada. É a primeira task.
- Produces, e é o que as Tasks 2–14 importam de `@shared/ui`:
  - `type ColClass = { readonly peso: number; readonly teto?: true }`
  - `const COL: Record<'code'|'identity'|'text'|'short'|'rut'|'tag'|'count'|'date'|'dateTime'|'money', ColClass>`
  - `function tableWidths<K extends string>(pesos: Record<K, ColClass>, opcoes?: { acao?: boolean; archived?: boolean }): Record<K, CSSProperties>`
  - `const ARCHIVED_COLUMN: Record<'archived_at'|'archived_by', CSSProperties>` (usado só na Task 15)

- [ ] **Passo 1: Meça a baseline da suíte, antes de tocar em nada**

```bash
cd /home/jvbat/projetos/fix-frontend/frontend && pnpm test 2>&1 | tail -5
```

Anote os números de `Test Files` e `Tests`. **É esta a baseline do bloco** — o 100/555 registrado no
fechamento do item 16 foi medido numa árvore anterior ao merge do PR #69 e não vale aqui (lei 8:
número herdado não é medição). Escreva a baseline no corpo do commit desta task.

- [ ] **Passo 2: Escreva o teste que falha**

Crie `src/shared/ui/AppDataTable/columnWidth.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { COL, ARCHIVED_COLUMN, tableWidths } from './columnWidth'

const soma = (larguras: Record<string, { width?: string | number }>) =>
  Math.round(
    Object.values(larguras).reduce((total, l) => total + parseFloat(String(l.width)), 0) * 100,
  ) / 100

describe('tableWidths', () => {
  it('fecha o orçamento padrão de 90% em qualquer aridade', () => {
    expect(soma(tableWidths({ a: COL.identity, b: COL.rut, c: COL.tag }))).toBe(90)
    expect(soma(tableWidths({ a: COL.code, b: COL.identity, c: COL.count, d: COL.money, e: COL.tag }))).toBe(90)
    expect(
      soma(
        tableWidths({
          a: COL.code, b: COL.text, c: COL.identity, d: COL.tag,
          e: COL.identity, f: COL.count, g: COL.tag,
        }),
      ),
    ).toBe(90)
  })

  it('desconta o rastreio de arquivados do orçamento', () => {
    expect(soma(tableWidths({ a: COL.identity, b: COL.rut }, { archived: true }))).toBe(66)
    expect(soma(ARCHIVED_COLUMN)).toBe(24)
  })

  it('usa os 100% quando a tabela não tem coluna de ação', () => {
    expect(soma(tableWidths({ a: COL.text, b: COL.count, c: COL.count }, { acao: false }))).toBe(100)
  })

  it('reparte na proporção dos pesos', () => {
    const l = tableWidths({ grande: { peso: 20 }, pequena: { peso: 10 } })
    expect(parseFloat(l.grande.width as string)).toBeCloseTo(parseFloat(l.pequena.width as string) * 2, 1)
  })

  it('dá teto só à classe que trunca', () => {
    const l = tableWidths({ nome: COL.identity, rut: COL.rut })
    expect(l.nome.maxWidth).toBe(l.nome.width)
    expect(l.rut.maxWidth).toBeUndefined()
  })
})
```

- [ ] **Passo 3: Rode e veja falhar**

```bash
cd /home/jvbat/projetos/fix-frontend/frontend && pnpm test src/shared/ui/AppDataTable/columnWidth.test.ts
```

Esperado: FAIL — `Failed to resolve import "./columnWidth"`.

- [ ] **Passo 4: Escreva a implementação**

Crie `src/shared/ui/AppDataTable/columnWidth.ts`:

```ts
import type { CSSProperties } from 'react'

/**
 * Vocabulário de largura de coluna, em PESO — e a repartição do orçamento da
 * tabela entre os pesos declarados.
 *
 * **Peso, e não porcentagem literal, porque a mesma classe de conteúdo aparece
 * em tabela de 3 e de 8 colunas.** Um RUT é um RUT nas duas; o que muda é a
 * fatia que ele merece do que sobra. Porcentagem literal só fecharia numa
 * aridade — em qualquer outra, ou sobra faixa para o navegador sortear (o
 * defeito que este bloco corrige) ou a soma estoura.
 *
 * Os números não são chute: são os que a `TurmasTable` pagou em três medições,
 * registradas no `turmaColumns.ts`, generalizados pela classe de conteúdo.
 *
 * **Orçamento = 100 menos o que não está em porcentagem.** A coluna de ações
 * fica em `rem` de propósito (`stickyActionsColumn`) — é a única que não deve
 * escalar, porque carrega ícone e não texto —, e o rastreio de arquivados tem
 * par fixo aqui embaixo. Os dois saem do orçamento em vez de estourarem os 100%
 * e deixarem a repartição por conta da normalização do navegador.
 *
 * **Normalizar mata a sobra na origem.** A soma é sempre o orçamento, em
 * qualquer aridade: não há resto a sortear.
 */
export type ColClass = { readonly peso: number; readonly teto?: true }

export const COL = {
  /** Identificador atômico, mono, que não quebra: `Scap 1 - Cot 2`, código de certificado. */
  code: { peso: 8 },
  /** `IdentityCell`: avatar + duas linhas. Único com teto — é contra ele que o `truncate` mede. */
  identity: { peso: 18, teto: true },
  /** O texto livre e mais longo da tabela: nome de curso, nome de papel. */
  text: { peso: 21 },
  /** Texto curto e de tamanho conhecido: comuna, nome técnico, papel do usuário. */
  short: { peso: 13 },
  /** Mono de tamanho conhecido. */
  rut: { peso: 9 },
  /** `AppTag` — quem manda é a mais longa das três traduções. */
  tag: { peso: 10 },
  /** Numeral. */
  count: { peso: 7 },
  /** Data sem hora. */
  date: { peso: 10 },
  /** Data com hora (`last_login`). */
  dateTime: { peso: 12 },
  /** Valor + unidade. */
  money: { peso: 10 },
} as const satisfies Record<string, ColClass>

/**
 * O par do rastreio de arquivados, em porcentagem fixa e não em peso: o
 * conteúdo é o mesmo nas 7 tabelas que o mostram — uma data e um nome —, e
 * medir sete vezes o mesmo dado seria desproporcional. Somam os 24 que
 * `tableWidths({ archived: true })` desconta.
 */
export const ARCHIVED_COLUMN = {
  archived_at: { width: '10%' },
  archived_by: { width: '14%' },
} as const satisfies Record<string, CSSProperties>

const RESERVA_ACAO = 10
const RESERVA_ARQUIVADO = 24

export type OrcamentoOpcoes = {
  /** `false` na tabela sem coluna de ação: os 10% reservados a ela viram faixa
   * sem dono, e faixa sem dono é o sorteio do `table-layout: auto` de volta. */
  acao?: boolean
  /** `true` na visão de arquivados, que acrescenta as duas colunas de `ARCHIVED_COLUMN`. */
  archived?: boolean
}

export function tableWidths<K extends string>(
  pesos: Record<K, ColClass>,
  { acao = true, archived = false }: OrcamentoOpcoes = {},
): Record<K, CSSProperties> {
  const chaves = Object.keys(pesos) as K[]
  const orcamento = 100 - (acao ? RESERVA_ACAO : 0) - (archived ? RESERVA_ARQUIVADO : 0)
  const total = chaves.reduce((acumulado, chave) => acumulado + pesos[chave].peso, 0)
  // Contas em centésimos inteiros: somar float de duas casas não fecha o
  // orçamento exato, e a última chave absorve a sobra do arredondamento —
  // no máximo 0,01 ponto por coluna.
  const centesimos = chaves.map((chave) => Math.round((pesos[chave].peso / total) * orcamento * 100))
  centesimos[centesimos.length - 1] += orcamento * 100 - centesimos.reduce((a, b) => a + b, 0)

  const larguras = {} as Record<K, CSSProperties>
  chaves.forEach((chave, indice) => {
    const largura = `${centesimos[indice] / 100}%`
    larguras[chave] = pesos[chave].teto ? { width: largura, maxWidth: largura } : { width: largura }
  })
  return larguras
}
```

- [ ] **Passo 5: Rode e veja passar**

```bash
cd /home/jvbat/projetos/fix-frontend/frontend && pnpm test src/shared/ui/AppDataTable/columnWidth.test.ts
```

Esperado: PASS, 5 testes.

- [ ] **Passo 6: Exporte pelo barril**

Em `src/shared/ui/AppDataTable/index.ts`, acrescente depois da linha do `style`:

```ts
export { COL, ARCHIVED_COLUMN, tableWidths } from './columnWidth'
export type { ColClass, OrcamentoOpcoes } from './columnWidth'
```

`src/shared/ui/index.ts` já faz `export * from './AppDataTable'` (linha 8) — não precisa de linha
nova lá.

- [ ] **Passo 7: Gate e commit**

Rode o **Procedimento L**.

```bash
git add src/shared/ui/AppDataTable/columnWidth.ts src/shared/ui/AppDataTable/columnWidth.test.ts src/shared/ui/AppDataTable/index.ts
git commit -m "feat(shared): vocabulario de largura de coluna com orcamento normalizado

Baseline da suite medida nesta arvore: <N> arquivos / <M> testes."
```

---
### Task 2: `TurmasTable` migra para o vocabulário (a semente)

É a única tabela já medida. **Se o vocabulário não reproduzir os números dela, o vocabulário está
errado — não a tabela.** Nenhuma outra task começa antes desta fechar.

**Files:**
- Modify: `src/features/operation/components/Turma/turmaColumns.ts` (reescrito por inteiro)
- Modify: `src/features/operation/components/Turma/TurmasTable.tsx` (import na linha 15, `archived`
  na 43, `style` das colunas em 81–112, coluna de ação em 114–126)

**Interfaces:**
- Consumes: `COL`, `tableWidths` de `@shared/ui` (Task 1); `stickyActionsColumn`, já importado.
- Produces: `turmaWidths(archived: boolean)` — some `TURMA_COLUMN`, e nenhuma outra task o consome.

- [ ] **Passo 1: Reescreva `turmaColumns.ts`**

Substitua o arquivo inteiro por:

```ts
import { COL, tableWidths } from '@shared/ui'

/**
 * Classificação das colunas da `TurmasTable`. A política é da TELA, que conhece
 * o dado: o wrapper de tabela não sabe qual coluna carrega identificador e qual
 * carrega nome próprio.
 *
 * **Porcentagem, e não `rem`, porque o problema nunca foi o tamanho de uma
 * coluna — foi para onde vai a SOBRA.** Três medições, nesta mesma tabela, para
 * chegar aqui:
 *
 * 1. **Sem largura nenhuma** (UI-02 da revisão de 2026-08-22, 1440x900): a
 *    largura vinha 100% do conteúdo e saía o inverso da importância. CÓDIGO
 *    ficava com 67px de `th` em inglês e `Scap 1 - Cot 2` quebrava em QUATRO
 *    caixas de linha dentro de um `span` de 34px. CLIENTE (249px) e REDATOR
 *    (263px) somavam 45% dos 1147px da tabela, porque o bloco de texto do
 *    `IdentityCell` não encolhia (ver o `min-w-0` de lá; sem ele, teto de
 *    largura aqui não faz efeito nenhum).
 * 2. **Largura em `rem` em quatro colunas só** (reporte do João, 2026-08-24): as
 *    três que ficaram de fora abocanharam a sobra inteira, ~230px cada num
 *    contêiner de 1447px, enquanto CURSO quebrava em duas linhas dentro de
 *    173px.
 * 3. **Largura em `rem` em TODAS, com CURSO absorvendo** (mesmo dia): a sobra
 *    parou de ser sorteada e passou a ser entregue a um só — CURSO foi a
 *    **519px num contêiner de 1603px**, metade daquilo vazio, enquanto CLIENTE
 *    seguia truncando em 222px. Trocar o sorteio por um destinatário fixo não
 *    resolve: nenhuma coluna desta tabela quer 500px.
 *
 * Os números que saíam daqui à mão (8/21/18/8/18/7/10, e o docblock antigo dizia
 * somar 91 quando somavam 90) viraram classes do vocabulário de `shared`, que
 * normaliza a soma para o orçamento em vez de confiar em aritmética escrita à
 * mão. Ver `AppDataTable/columnWidth.ts` para o porquê do orçamento.
 *
 * A coluna de ações NÃO está aqui: fica em `rem`, via `stickyActionsColumn`, no
 * próprio `TurmasTable` — é a única que não deve escalar, porque carrega dois
 * ícones e não texto.
 */
export const turmaWidths = (archived: boolean) =>
  tableWidths(
    {
      code: COL.code,
      course: COL.text,
      client: COL.identity,
      modality: COL.tag,
      redator: COL.identity,
      students: COL.count,
      status: COL.tag,
    },
    { archived },
  )
```

- [ ] **Passo 2: Ligue no `TurmasTable.tsx`**

Troque o import da linha 15:

```ts
import { turmaWidths } from './turmaColumns'
```

Logo abaixo de `const archived = mode === 'archived'` (linha 43), acrescente:

```ts
  const largura = turmaWidths(archived)
```

E troque os sete `style`, um por coluna, casando pela chave do `header`:

| coluna (`header`) | de | para |
|---|---|---|
| `operation.table.code` | `style={TURMA_COLUMN.code}` | `style={largura.code}` |
| `operation.table.course` | `style={TURMA_COLUMN.course}` | `style={largura.course}` |
| `operation.table.client` | `style={TURMA_COLUMN.identity}` | `style={largura.client}` |
| `operation.table.modality` | `style={TURMA_COLUMN.modality}` | `style={largura.modality}` |
| `operation.table.redator` | `style={TURMA_COLUMN.identity}` | `style={largura.redator}` |
| `operation.table.students` | `style={TURMA_COLUMN.students}` | `style={largura.students}` |
| `operation.table.status` | `style={TURMA_COLUMN.status}` | `style={largura.status}` |

A coluna de ação (`stickyActionsColumn('8rem')`) fica como está — a largura dela é aferida no
Passo 4.

- [ ] **Passo 3: Gate de código**

Rode o **Procedimento L**. `pnpm build` reprova se sobrou referência a `TURMA_COLUMN`.

- [ ] **Passo 4: Medição**

Rode o **Procedimento M** em `/operacion` (aba de turmas), nos três viewports, **e repita com o
`ArchiveSwitch` ligado** (visão de arquivados) em 1440x900.

Esperado, em 1440x900 na visão ativa: CÓDIGO ~7,8%, CURSO ~20,5%, CLIENTE ~17,6%, MODALIDADE ~9,8%,
REDATOR ~17,6%, ALUNOS ~6,8%, ESTADO ~9,8%. Nenhuma coluna de identidade abaixo de 120px.
`acaoDentroDaMoldura: true` nos três.

Se a coluna de ação couber com folga ou apertar os dois ícones, ajuste o `rem` do
`stickyActionsColumn` e **remeça** — o `8rem` de hoje não é medição desta task.

- [ ] **Passo 5: Commit**

```bash
git add src/features/operation/components/Turma/turmaColumns.ts src/features/operation/components/Turma/TurmasTable.tsx
git commit -m "refactor(operation): turmas classificam colunas pelo vocabulario de largura

<as 3 linhas de leitura do Procedimento M>"
```

---

### Task 3: `EnrollmentTable` — largura das colunas

Já está presa desde a UI-02. Falta só a largura, e a coluna de ação é CONDICIONAL
(`!registroBloqueado`): registro fechado não mostra ação nenhuma, e reservar 10% para uma coluna que
não existe devolve ao navegador exatamente a faixa sem dono que este bloco está removendo.

**Files:**
- Create: `src/features/operation/components/Enrollment/enrollmentColumns.ts`
- Modify: `src/features/operation/components/Enrollment/EnrollmentTable.tsx` (import na linha 3,
  colunas em 68–88)

**Interfaces:**
- Consumes: `COL`, `tableWidths` de `@shared/ui`.
- Produces: `enrollmentWidths(acao: boolean)`. A Task 11 ACRESCENTA `LARGURA_MATRICULA_ARQUIVADA` a
  este mesmo arquivo — não o crie agora, ficaria um export sem consumidor por oito tasks.

- [ ] **Passo 1: Crie `enrollmentColumns.ts`**

```ts
import { COL, tableWidths } from '@shared/ui'

/**
 * Classificação das colunas da `EnrollmentTable`.
 *
 * `acao` é parâmetro e não constante porque a coluna de ação desta tabela sai
 * inteira no registro fechado (`registroBloqueado`): as duas ações recusam a
 * escrita com 422 e uma faixa vazia em toda linha só roubaria largura de quem
 * carrega dado. Sem o parâmetro, os 10% reservados a ela virariam faixa sem
 * dono no registro fechado — o sorteio do `table-layout: auto` de volta.
 */
export const enrollmentWidths = (acao: boolean) =>
  tableWidths({ name: COL.identity, rut: COL.rut, status: COL.tag }, { acao })
```

- [ ] **Passo 2: Ligue no `EnrollmentTable.tsx`**

Acrescente o import depois da linha 3:

```ts
import { enrollmentWidths } from './enrollmentColumns'
```

Dentro do componente, logo antes do `return`, acrescente:

```ts
  const largura = enrollmentWidths(!registroBloqueado)
```

E acrescente `style` às três colunas de dado:

| coluna (`header`) | acrescente |
|---|---|
| `operation.enrollment.table.name` | `style={largura.name}` |
| `operation.enrollment.table.rut` | `style={largura.rut}` |
| `operation.enrollment.table.status` | `style={largura.status}` |

A coluna de ação (`stickyActionsColumn('6rem')`) não muda de forma; a largura é aferida no Passo 4.

- [ ] **Passo 3: Gate de código** — Procedimento L.

- [ ] **Passo 4: Medição**

Procedimento M em `/operacion/turmas/:id`, aba de matrículas, nos três viewports. Use uma turma com
registro ABERTO. Depois abra uma turma com registro FECHADO em 1440x900 e confirme que as três
colunas somam ~100% e que não há faixa vazia à direita.

Esperado com ação (1440x900): NOME ~43,8%, RUT ~21,9%, ESTADO ~24,3%; `acaoDentroDaMoldura: true`
nos três. Sem ação: ~48,6% / ~24,3% / ~27,0%.

- [ ] **Passo 5: Commit**

```bash
git add src/features/operation/components/Enrollment/enrollmentColumns.ts src/features/operation/components/Enrollment/EnrollmentTable.tsx
git commit -m "refactor(operation): matriculas declaram largura de coluna

<as 3 linhas de leitura do Procedimento M>"
```

---

### Task 4: `HistorialTable` — largura + coluna de ação presa

Primeira das dez que faltam prender. O botão de ação é de TEXTO e continua de texto (D2 da spec):
revogar e reemitir certificado têm peso legal, e trocar rótulo por ícone sem legenda é mudança de
affordance, não de largura. O que muda é posição e ancoragem.

**Files:**
- Create: `src/features/certification/components/Historial/historialColumns.ts`
- Modify: `src/features/certification/components/Historial/HistorialTable.tsx` (import na linha 2,
  colunas em 52–99, coluna de ação em 100–116)

**Interfaces:**
- Consumes: `COL`, `tableWidths`, `stickyActionsColumn` de `@shared/ui`.
- Produces: `LARGURA_HISTORIAL` — const, porque esta tabela não tem visão de arquivados nem coluna
  de ação condicional.

- [ ] **Passo 1: Crie `historialColumns.ts`**

```ts
import { COL, tableWidths } from '@shared/ui'

/**
 * Classificação das colunas da `HistorialTable`.
 *
 * Const, e não função: o histórico de certificados não tem visão de arquivados e
 * a coluna de ação existe em toda linha — nada aqui depende de estado de render.
 *
 * As duas datas são `date` e não `dateTime`: `formatDate` imprime só o dia (o
 * timestamp existe no DTO, mas a hora seria informação nova na tela).
 */
export const LARGURA_HISTORIAL = tableWidths({
  codigo: COL.code,
  alumno: COL.identity,
  curso: COL.text,
  emitidoEm: COL.date,
  validoAte: COL.date,
  estado: COL.tag,
})
```

- [ ] **Passo 2: Ligue no `HistorialTable.tsx`**

Acrescente `stickyActionsColumn` à lista de imports de `@shared/ui` na linha 2, e o import local:

```ts
import { LARGURA_HISTORIAL } from './historialColumns'
```

Acrescente `style` às seis colunas de dado:

| coluna (`header`) | acrescente |
|---|---|
| `certificate.colCodigo` | `style={LARGURA_HISTORIAL.codigo}` |
| `certificate.colAlumno` | `style={LARGURA_HISTORIAL.alumno}` |
| `certificate.colCourse` | `style={LARGURA_HISTORIAL.curso}` |
| `certificate.colIssuedAt` | `style={LARGURA_HISTORIAL.emitidoEm}` |
| `certificate.colValidUntil` | `style={LARGURA_HISTORIAL.validoAte}` |
| `certificate.colStatus` | `style={LARGURA_HISTORIAL.estado}` |

E prenda a coluna de ação — troque `style={{ width: '16rem' }}` por:

```tsx
        style={stickyActionsColumn('16rem')}
```

- [ ] **Passo 3: Gate de código** — Procedimento L. `HistorialTable.test.tsx` já existe; ele precisa
continuar verde sem edição. Se reprovar, o teste está medindo largura implícita — leia o assert
antes de mexer em qualquer coisa e relate.

- [ ] **Passo 4: Medição**

Procedimento M em `/certificados`, aba de historial, nos três viewports.

Esperado (1440x900): CÓDIGO ~9,0%, ALUMNO ~20,2%, CURSO ~23,6%, EMITIDO ~11,2%, VÁLIDO ~11,2%,
ESTADO ~11,2%; `acaoDentroDaMoldura: true` nos três.

Confirme em 390x844 que os até três botões de texto cabem nos `16rem` **sem quebrar em duas linhas**.
Se quebrarem, aumente o `rem` e remeça; não encolha o rótulo.

- [ ] **Passo 5: Commit**

```bash
git add src/features/certification/components/Historial/historialColumns.ts src/features/certification/components/Historial/HistorialTable.tsx
git commit -m "refactor(certification): historial prende a coluna de acao e declara largura

<as 3 linhas de leitura do Procedimento M>"
```

---

### Task 5: `RedatoresTable` — largura + coluna de ação presa (o caso R3)

A única tabela cuja coluna de ação MUDA de conteúdo entre as visões: o botão de reenviar convite só
existe na lista ativa (3 ícones), porque o `User` do relator desce com a cascata de arquivamento
(2 ícones na arquivada). A largura acompanha.

**Files:**
- Create: `src/features/identity/components/Redator/redatorColumns.ts`
- Modify: `src/features/identity/components/Redator/RedatoresTable.tsx` (import na linha 5, colunas
  em 68–96, coluna de ação em 98–126)

**Interfaces:**
- Consumes: `COL`, `tableWidths`, `stickyActionsColumn` de `@shared/ui`.
- Produces: `redatorWidths(archived: boolean)`.

- [ ] **Passo 1: Crie `redatorColumns.ts`**

```ts
import { COL, tableWidths } from '@shared/ui'

/**
 * Classificação das colunas da `RedatoresTable`.
 *
 * `last_login` é `dateTime` e não `date`: `formatDateTime` imprime dia E hora, e
 * a hora é o que distingue dois acessos do mesmo dia — a coluna precisa da fatia
 * maior para não quebrar o carimbo no meio.
 */
export const redatorWidths = (archived: boolean) =>
  tableWidths(
    {
      name: COL.identity,
      rut: COL.rut,
      courses: COL.count,
      suitability: COL.tag,
      lastLogin: COL.dateTime,
    },
    { archived },
  )
```

- [ ] **Passo 2: Ligue no `RedatoresTable.tsx`**

Acrescente `stickyActionsColumn` à lista de imports de `@shared/ui` na linha 5, e o import local:

```ts
import { redatorWidths } from './redatorColumns'
```

Logo abaixo de `const archived = mode === 'archived'`, acrescente:

```ts
  const largura = redatorWidths(archived)
```

| coluna (`header`) | acrescente |
|---|---|
| `redator.name` | `style={largura.name}` |
| `common.rut` | `style={largura.rut}` |
| `redator.enabledCourses` | `style={largura.courses}` |
| `redator.suitability` | `style={largura.suitability}` |
| `common.lastLogin` | `style={largura.lastLogin}` |

E prenda a coluna de ação — troque `style={{ width: '10rem' }}` por:

```tsx
        style={stickyActionsColumn(archived ? '8rem' : '10rem')}
```

- [ ] **Passo 3: Gate de código** — Procedimento L.

- [ ] **Passo 4: Medição (é ela quem decide o R3)**

Procedimento M em `/personas`, aba de relatores, nos três viewports **na visão ativa**, e depois em
1440x900 e 390x844 **com o `ArchiveSwitch` ligado**.

Esperado na ativa (1440x900): NOME ~29,1%, RUT ~14,6%, CURSOS ~11,3%, IDONEIDADE ~16,2%,
ÚLTIMO ACESSO ~19,4%.

O que a medição precisa responder: os três ícones cabem em `10rem` na ativa, e os dois cabem em
`8rem` na arquivada, **sem folga que roube largura de dado e sem aperto que corte o ícone**. Se um
único valor servir às duas visões, simplifique para `stickyActionsColumn('10rem')` e diga no commit
qual medida sustentou a simplificação. Se nenhum servir, mantenha o ternário. Escolha medida, nunca
copiada de outra tabela.

- [ ] **Passo 5: Commit**

```bash
git add src/features/identity/components/Redator/redatorColumns.ts src/features/identity/components/Redator/RedatoresTable.tsx
git commit -m "refactor(identity): relatores prendem a coluna de acao e declaram largura

<as 3 linhas de leitura do Procedimento M, ativa e arquivada>"
```

---
### Task 6: `UsersTable` — largura + coluna de ação presa

**Files:**
- Create: `src/features/identity/components/Admin/userColumns.ts`
- Modify: `src/features/identity/components/Admin/UsersTable.tsx` (import na linha 5, `archived` na
  35, colunas em 57–80, coluna de ação em 82–94)

**Interfaces:**
- Consumes: `COL`, `tableWidths`, `stickyActionsColumn` de `@shared/ui`.
- Produces: `userWidths(archived: boolean)`.

- [ ] **Passo 1: Crie `userColumns.ts`**

```ts
import { COL, tableWidths } from '@shared/ui'

/**
 * Classificação das colunas da `UsersTable`.
 *
 * `role` é `short` e não `tag`: a célula imprime `u.role` como texto cru, sem
 * `AppTag` — classificar pela forma que a tela desenha, não pela que o nome da
 * coluna sugere.
 */
export const userWidths = (archived: boolean) =>
  tableWidths(
    { name: COL.identity, role: COL.short, state: COL.tag, lastLogin: COL.dateTime },
    { archived },
  )
```

- [ ] **Passo 2: Ligue no `UsersTable.tsx`**

Acrescente `stickyActionsColumn` aos imports de `@shared/ui` (linha 5) e:

```ts
import { userWidths } from './userColumns'
```

Logo abaixo de `const archived = mode === 'archived'` (linha 35):

```ts
  const largura = userWidths(archived)
```

| coluna (`header`) | acrescente |
|---|---|
| `admin.name` | `style={largura.name}` |
| `admin.role` | `style={largura.role}` |
| `admin.state` | `style={largura.state}` |
| `common.lastLogin` | `style={largura.lastLogin}` |

Coluna de ação: troque `style={{ width: '8rem' }}` por `style={stickyActionsColumn('8rem')}`.

- [ ] **Passo 3: Gate de código** — Procedimento L.

- [ ] **Passo 4: Medição**

Procedimento M em `/administracion`, aba de usuários, nos três viewports, e com o `ArchiveSwitch`
ligado em 1440x900.

Esperado na ativa (1440x900): NOME ~30,6%, PAPEL ~22,1%, ESTADO ~17,0%, ÚLTIMO ACESSO ~20,4%.
Na arquivada as quatro somam ~66% e o par do rastreio ~24% (o par só existe a partir da Task 15 —
antes disso as duas colunas do rastreio ainda saem do conteúdo; registre isso na leitura em vez de
tratá-lo como defeito desta task).
`acaoDentroDaMoldura: true` nos três.

- [ ] **Passo 5: Commit**

```bash
git add src/features/identity/components/Admin/userColumns.ts src/features/identity/components/Admin/UsersTable.tsx
git commit -m "refactor(identity): usuarios prendem a coluna de acao e declaram largura

<as 3 linhas de leitura do Procedimento M>"
```

---

### Task 7: `ClientsTable` — largura + coluna de ação presa

**Atenção à grafia:** este arquivo usa **aspas duplas e ponto e vírgula**. Mantenha.

**Files:**
- Create: `src/features/commercial/components/Client/clientColumns.ts`
- Modify: `src/features/commercial/components/Client/ClientsTable.tsx` (imports em 5–14, `archived`
  na 52, colunas em 74–104, coluna de ação em 106–118)

**Interfaces:**
- Consumes: `COL`, `tableWidths`, `stickyActionsColumn` de `@shared/ui`.
- Produces: `clientWidths(archived: boolean)`.

- [ ] **Passo 1: Crie `clientColumns.ts`**

```ts
import { COL, tableWidths } from "@shared/ui";

/**
 * Classificação das colunas da `ClientsTable`.
 *
 * `commune` é `short` porque a célula lê `addresses[0].commune` — nome de comuna
 * chilena, de tamanho conhecido —, e `contacts` é `count` porque a célula imprime
 * a quantidade, não a lista.
 */
export const clientWidths = (archived: boolean) =>
  tableWidths(
    {
      legalName: COL.identity,
      rut: COL.rut,
      type: COL.tag,
      commune: COL.short,
      contacts: COL.count,
    },
    { archived },
  );
```

- [ ] **Passo 2: Ligue no `ClientsTable.tsx`**

Acrescente `stickyActionsColumn` à lista de imports de `@shared/ui` (o import multilinha que começa
na linha 5) e:

```ts
import { clientWidths } from "./clientColumns";
```

Logo abaixo de `const archived = mode === "archived";` (linha 52):

```ts
  const largura = clientWidths(archived);
```

| coluna (`header`) | acrescente |
|---|---|
| `client.legalName` | `style={largura.legalName}` |
| `common.rut` | `style={largura.rut}` |
| `client.type` | `style={largura.type}` |
| `client.commune` | `style={largura.commune}` |
| `client.contacts` | `style={largura.contacts}` |

Coluna de ação: troque `style={{ width: "8rem" }}` por `style={stickyActionsColumn("8rem")}`.

- [ ] **Passo 3: Gate de código** — Procedimento L.

- [ ] **Passo 4: Medição**

Procedimento M em `/comercial`, aba de clientes, nos três viewports, e com o `ArchiveSwitch` ligado
em 1440x900.

Esperado na ativa (1440x900): RAZÃO SOCIAL ~28,4%, RUT ~14,2%, TIPO ~15,8%, COMUNA ~20,5%,
CONTATOS ~11,1%. `acaoDentroDaMoldura: true` nos três.

- [ ] **Passo 5: Commit**

```bash
git add src/features/commercial/components/Client/clientColumns.ts src/features/commercial/components/Client/ClientsTable.tsx
git commit -m "refactor(commercial): clientes prendem a coluna de acao e declaram largura

<as 3 linhas de leitura do Procedimento M>"
```

---

### Task 8: `BudgetsTable` — largura + coluna de ação presa

**Files:**
- Create: `src/features/commercial/components/Budget/budgetColumns.ts`
- Modify: `src/features/commercial/components/Budget/BudgetsTable.tsx` (imports em 3–7, `archived`
  na 43, colunas em 93–116, coluna de ação em 118–129)

**Interfaces:**
- Consumes: `COL`, `tableWidths`, `stickyActionsColumn` de `@shared/ui`.
- Produces: `budgetWidths(archived: boolean)`.

- [ ] **Passo 1: Crie `budgetColumns.ts`**

```ts
import { COL, tableWidths } from '@shared/ui'

/**
 * Classificação das colunas da `BudgetsTable`.
 *
 * `totalValue` é `money` e não `count`: a célula imprime valor E unidade
 * (`formatUf(...) UF`), e é a unidade colada no número que não pode quebrar
 * para a linha de baixo.
 */
export const budgetWidths = (archived: boolean) =>
  tableWidths(
    {
      code: COL.code,
      client: COL.identity,
      quoteCount: COL.count,
      totalValue: COL.money,
      status: COL.tag,
    },
    { archived },
  )
```

- [ ] **Passo 2: Ligue no `BudgetsTable.tsx`**

Acrescente `stickyActionsColumn` à lista de imports de `@shared/ui` e:

```ts
import { budgetWidths } from './budgetColumns'
```

Logo abaixo de `const archived = mode === 'archived'` (linha 43):

```ts
  const largura = budgetWidths(archived)
```

| coluna (`header`) | acrescente |
|---|---|
| `budget.code` | `style={largura.code}` |
| `budget.client` | `style={largura.client}` |
| `budget.quoteCount` | `style={largura.quoteCount}` |
| `budget.totalValue` | `style={largura.totalValue}` |
| `budget.status` | `style={largura.status}` |

Coluna de ação: troque `style={{ width: '8rem' }}` por `style={stickyActionsColumn('8rem')}`.

- [ ] **Passo 3: Gate de código** — Procedimento L.

- [ ] **Passo 4: Medição**

Procedimento M em `/comercial`, aba de orçamentos, nos três viewports, e com o `ArchiveSwitch`
ligado em 1440x900.

Esperado na ativa (1440x900): CÓDIGO ~13,6%, CLIENTE ~30,6%, COTAÇÕES ~11,9%, VALOR ~17,0%,
ESTADO ~17,0%. Confirme em 390x844 que `formatUf(...) UF` **não quebra entre o número e a unidade**;
se quebrar, é achado desta task — registre e traga ao João antes de mudar a classe.

- [ ] **Passo 5: Commit**

```bash
git add src/features/commercial/components/Budget/budgetColumns.ts src/features/commercial/components/Budget/BudgetsTable.tsx
git commit -m "refactor(commercial): orcamentos prendem a coluna de acao e declaram largura

<as 3 linhas de leitura do Procedimento M>"
```

---

### Task 9: `CoursesTable` — largura + coluna de ação presa

**Files:**
- Create: `src/features/catalog/components/Course/courseColumns.ts`
- Modify: `src/features/catalog/components/Course/CoursesTable.tsx` (import na linha 5, `archived`
  na 34, colunas em 56–85, coluna de ação em 87–99)

**Interfaces:**
- Consumes: `COL`, `tableWidths`, `stickyActionsColumn` de `@shared/ui`.
- Produces: `courseWidths(archived: boolean)`.

- [ ] **Passo 1: Crie `courseColumns.ts`**

```ts
import { COL, tableWidths } from '@shared/ui'

/**
 * Classificação das colunas da `CoursesTable`.
 *
 * `name` é o `text` desta tabela — é o único campo livre e o mais longo. O
 * `technical_name` é `short` porque é nomenclatura normalizada do setor, de
 * tamanho conhecido, e não frase.
 */
export const courseWidths = (archived: boolean) =>
  tableWidths(
    {
      name: COL.text,
      technicalName: COL.short,
      workload: COL.count,
      redatorCount: COL.count,
    },
    { archived },
  )
```

- [ ] **Passo 2: Ligue no `CoursesTable.tsx`**

Acrescente `stickyActionsColumn` aos imports de `@shared/ui` (linha 5) e:

```ts
import { courseWidths } from './courseColumns'
```

Logo abaixo de `const archived = mode === 'archived'` (linha 34):

```ts
  const largura = courseWidths(archived)
```

| coluna (`header`) | acrescente |
|---|---|
| `course.name` | `style={largura.name}` |
| `course.technicalName` | `style={largura.technicalName}` |
| `course.workloadHours` | `style={largura.workload}` |
| `course.redatorCount` | `style={largura.redatorCount}` |

Coluna de ação: troque `style={{ width: '8rem' }}` por `style={stickyActionsColumn('8rem')}`.

- [ ] **Passo 3: Gate de código** — Procedimento L.

- [ ] **Passo 4: Medição**

Procedimento M em `/cursos`, nos três viewports, e com o `ArchiveSwitch` ligado em 1440x900.

Esperado na ativa (1440x900): NOME ~39,4%, NOME TÉCNICO ~24,4%, CARGA ~13,1%, RELATORES ~13,1%.
Quatro colunas de dado em 90% dão fatias largas — confirme que o ícone que a coluna NOME desenha
antes do texto continua alinhado e que a célula não vira faixa vazia.
`acaoDentroDaMoldura: true` nos três.

- [ ] **Passo 5: Commit**

```bash
git add src/features/catalog/components/Course/courseColumns.ts src/features/catalog/components/Course/CoursesTable.tsx
git commit -m "refactor(catalog): cursos prendem a coluna de acao e declaram largura

<as 3 linhas de leitura do Procedimento M>"
```

---

### Task 10: `EmissionStudentsTable` — largura + coluna de ação presa

**Correção de inventário:** a spec §3.4 classificou esta tabela com QUATRO colunas de dado. São
**cinco** — `colName`, `colFinalGrade`, `colAttendance`, `colAcadStatus` e `colCertificate`. A
quinta imprime `✓ <código>` ou uma frase curta traduzida, e é `short`. Contado no arquivo, não na
tabela da spec.

Botão de texto, que continua de texto (D2): emitir e ver certificado carregam peso legal.

**Files:**
- Create: `src/features/certification/components/Emission/emissionColumns.ts`
- Modify: `src/features/certification/components/Emission/EmissionStudentsTable.tsx` (imports em
  1–8, colunas em 42–70, coluna de ação em 71–83)

**Interfaces:**
- Consumes: `COL`, `tableWidths`, `stickyActionsColumn` de `@shared/ui`.
- Produces: `LARGURA_EMISSAO` — const: sem visão de arquivados, e a coluna de ação existe sempre
  (o `body` dela pode devolver `null` numa linha, mas a COLUNA não sai).

- [ ] **Passo 1: Crie `emissionColumns.ts`**

```ts
import { COL, tableWidths } from '@shared/ui'

/**
 * Classificação das colunas da `EmissionStudentsTable`.
 *
 * `certificate` é `short` e não `tag`: a célula imprime texto cru — `✓ <código>`
 * quando emitido, e uma frase curta traduzida quando não —, sem `AppTag`.
 * Classificar pela forma que a tela desenha.
 *
 * Const, e não função: a coluna de ação existe em toda visão. O `body` dela
 * devolve `null` na linha que não corresponde, mas a COLUNA não sai — a reserva
 * de largura dela continua devida.
 */
export const LARGURA_EMISSAO = tableWidths({
  name: COL.identity,
  finalGrade: COL.count,
  attendance: COL.count,
  acadStatus: COL.tag,
  certificate: COL.short,
})
```

- [ ] **Passo 2: Ligue no `EmissionStudentsTable.tsx`**

Acrescente `stickyActionsColumn` aos imports de `@shared/ui` e:

```ts
import { LARGURA_EMISSAO } from './emissionColumns'
```

| coluna (`header`) | acrescente |
|---|---|
| `certificate.colName` | `style={LARGURA_EMISSAO.name}` |
| `certificate.colFinalGrade` | `style={LARGURA_EMISSAO.finalGrade}` |
| `certificate.colAttendance` | `style={LARGURA_EMISSAO.attendance}` |
| `certificate.colAcadStatus` | `style={LARGURA_EMISSAO.acadStatus}` |
| `certificate.colCertificate` | `style={LARGURA_EMISSAO.certificate}` |

Coluna de ação: troque `style={{ width: '8rem' }}` por `style={stickyActionsColumn('8rem')}`.

- [ ] **Passo 3: Gate de código** — Procedimento L.

- [ ] **Passo 4: Medição**

Procedimento M em `/certificados`, aba de emissão, com uma turma selecionada, nos três viewports.

Esperado (1440x900): ALUNO ~29,5%, NOTA ~11,5%, ASSISTÊNCIA ~11,5%, ESTADO ACADÊMICO ~16,4%,
CERTIFICADO ~21,3%. `acaoDentroDaMoldura: true` nos três.

Confirme que o rótulo mais longo do botão (`certificate.emit` / `certificate.view`, nos três
idiomas) cabe nos `8rem` sem quebrar. Se não couber, aumente e remeça.

- [ ] **Passo 5: Commit**

```bash
git add src/features/certification/components/Emission/emissionColumns.ts src/features/certification/components/Emission/EmissionStudentsTable.tsx
git commit -m "refactor(certification): emissao prende a coluna de acao e declara largura

<as 3 linhas de leitura do Procedimento M>"
```

---

### Task 11: `ArchivedEnrollmentsList` — largura + coluna de ação presa

Tabela sempre arquivada: o rastreio (`archivedColumns(t)`) não é condicional aqui, entra em toda
render. Por isso o orçamento nasce em 66%.

**Files:**
- Modify: `src/features/operation/components/Enrollment/enrollmentColumns.ts` (acrescenta um export)
- Modify: `src/features/operation/components/Enrollment/ArchivedEnrollmentsList.tsx` (imports em
  3–8, colunas em 62–71, coluna de ação em 77–91)

**Interfaces:**
- Consumes: `COL`, `tableWidths`, `stickyActionsColumn` de `@shared/ui`; o arquivo
  `enrollmentColumns.ts` criado na Task 3, que já exporta `enrollmentWidths` — **não o reescreva**.
- Produces: `LARGURA_MATRICULA_ARQUIVADA`.

- [ ] **Passo 1: Acrescente o export em `enrollmentColumns.ts`**

No fim do arquivo criado na Task 3:

```ts
/**
 * A lista de matrículas arquivadas é SEMPRE arquivada — o rastreio não é
 * condicional aqui —, então o orçamento já nasce descontado dos 24% do par de
 * `ARCHIVED_COLUMN`.
 */
export const LARGURA_MATRICULA_ARQUIVADA = tableWidths(
  { name: COL.identity, rut: COL.rut },
  { archived: true },
)
```

- [ ] **Passo 2: Ligue no `ArchivedEnrollmentsList.tsx`**

Acrescente `stickyActionsColumn` aos imports de `@shared/ui` e:

```ts
import { LARGURA_MATRICULA_ARQUIVADA } from './enrollmentColumns'
```

| coluna (`header`) | acrescente |
|---|---|
| `operation.enrollment.table.name` | `style={LARGURA_MATRICULA_ARQUIVADA.name}` |
| `operation.enrollment.table.rut` | `style={LARGURA_MATRICULA_ARQUIVADA.rut}` |

Coluna de ação: troque `style={{ width: '8rem' }}` por `style={stickyActionsColumn('8rem')}`.

- [ ] **Passo 3: Gate de código** — Procedimento L.

- [ ] **Passo 4: Medição**

Procedimento M em `/operacion/turmas/:id`, superfície de matrículas arquivadas, nos três viewports.
Use uma turma que tenha matrícula arquivada; se nenhuma tiver no ambiente local, **peça o registro
ao João** — não feche a task por leitura de código.

Esperado (1440x900): NOME ~44,0%, RUT ~22,0%, e as duas do rastreio somando ~24% a partir da
Task 15. `acaoDentroDaMoldura: true` nos três; o botão desta coluna é rótulo+ícone, confirme que os
`8rem` bastam nos três idiomas.

- [ ] **Passo 5: Commit**

```bash
git add src/features/operation/components/Enrollment/enrollmentColumns.ts src/features/operation/components/Enrollment/ArchivedEnrollmentsList.tsx
git commit -m "refactor(operation): matriculas arquivadas prendem a coluna de acao e declaram largura

<as 3 linhas de leitura do Procedimento M>"
```

---

### Task 12: `StudentsTable` — largura + coluna de ação presa

**Files:**
- Create: `src/features/identity/components/Student/studentColumns.ts`
- Modify: `src/features/identity/components/Student/StudentsTable.tsx` (imports em 1–6, colunas em
  36–59, coluna de ação em 60–65)

**Interfaces:**
- Consumes: `COL`, `tableWidths`, `stickyActionsColumn` de `@shared/ui`.
- Produces: `LARGURA_ALUNO`. A Task 14 ACRESCENTA `LARGURA_TURMA_DO_ALUNO` a este mesmo arquivo.

- [ ] **Passo 1: Crie `studentColumns.ts`**

```ts
import { COL, tableWidths } from '@shared/ui'

/**
 * Classificação das colunas da `StudentsTable`.
 *
 * Const, e não função: o aluno não tem visão de arquivados (RN-01 — aluno é
 * entidade, não usuário) e a coluna de ação existe em toda linha.
 */
export const LARGURA_ALUNO = tableWidths({
  name: COL.identity,
  rut: COL.rut,
  currentClient: COL.short,
  turmas: COL.count,
})
```

- [ ] **Passo 2: Ligue no `StudentsTable.tsx`**

Acrescente `stickyActionsColumn` aos imports de `@shared/ui` e:

```ts
import { LARGURA_ALUNO } from './studentColumns'
```

| coluna (`header`) | acrescente |
|---|---|
| `student.name` | `style={LARGURA_ALUNO.name}` |
| `common.rut` | `style={LARGURA_ALUNO.rut}` |
| `student.currentClient` | `style={LARGURA_ALUNO.currentClient}` |
| `student.turmas` | `style={LARGURA_ALUNO.turmas}` |

Coluna de ação: troque `style={{ width: '4rem' }}` por `style={stickyActionsColumn('4rem')}`.

- [ ] **Passo 3: Gate de código** — Procedimento L.

- [ ] **Passo 4: Medição**

Procedimento M em `/personas`, aba de alunos, nos três viewports.

Esperado (1440x900): NOME ~34,5%, RUT ~17,2%, CLIENTE ATUAL ~24,9%, TURMAS ~13,4%.
`acaoDentroDaMoldura: true` nos três. `4rem` para um ícone é o que a tabela já usava — confirme que
o alvo de clique continua inteiro em 390x844.

- [ ] **Passo 5: Commit**

```bash
git add src/features/identity/components/Student/studentColumns.ts src/features/identity/components/Student/StudentsTable.tsx
git commit -m "refactor(identity): alunos prendem a coluna de acao e declaram largura

<as 3 linhas de leitura do Procedimento M>"
```

---

### Task 13: `RolesTable` — largura + coluna de ação presa

Última das doze com coluna de ação.

**Files:**
- Create: `src/features/identity/components/Admin/roleColumns.ts`
- Modify: `src/features/identity/components/Admin/RolesTable.tsx` (imports em 1–6, colunas em 40–50,
  coluna de ação em 51–54)

**Interfaces:**
- Consumes: `COL`, `tableWidths`, `stickyActionsColumn` de `@shared/ui`.
- Produces: `LARGURA_PAPEL`.

- [ ] **Passo 1: Crie `roleColumns.ts`**

```ts
import { COL, tableWidths } from '@shared/ui'

/**
 * Classificação das colunas da `RolesTable`.
 *
 * `name` é o `text` desta tabela: com três colunas de dado só, o nome do papel é
 * o campo livre, e é ele que precisa da fatia maior. `permissions` é `count`
 * porque a célula imprime a quantidade, não a lista.
 */
export const LARGURA_PAPEL = tableWidths({
  name: COL.text,
  kind: COL.tag,
  permissions: COL.count,
})
```

- [ ] **Passo 2: Ligue no `RolesTable.tsx`**

Acrescente `stickyActionsColumn` aos imports de `@shared/ui` e:

```ts
import { LARGURA_PAPEL } from './roleColumns'
```

| coluna (`header`) | acrescente |
|---|---|
| `role.name` | `style={LARGURA_PAPEL.name}` |
| `role.kind` | `style={LARGURA_PAPEL.kind}` |
| `role.permissions` | `style={LARGURA_PAPEL.permissions}` |

Coluna de ação: troque `style={{ width: '4rem' }}` por `style={stickyActionsColumn('4rem')}`.

- [ ] **Passo 3: Gate de código** — Procedimento L.

- [ ] **Passo 4: Medição**

Procedimento M em `/administracion`, aba de papéis, nos três viewports.

Esperado (1440x900): NOME ~49,7%, TIPO ~23,7%, PERMISSÕES ~16,6%. `acaoDentroDaMoldura: true` nos
três. Com três colunas de dado a fatia do NOME fica larga por construção — se a célula virar faixa
vazia em 1440x900, registre a medida e traga ao João antes de reclassificar.

- [ ] **Passo 5: Commit**

```bash
git add src/features/identity/components/Admin/roleColumns.ts src/features/identity/components/Admin/RolesTable.tsx
git commit -m "refactor(identity): papeis prendem a coluna de acao e declaram largura

<as 3 linhas de leitura do Procedimento M>"
```

---
### Task 14: As três tabelas SEM coluna de ação

`CompliancePanel`, `RedatorLoadPanel` e `StudentDetailSections` não têm ação de linha — nada a
prender. Só largura, e com o orçamento em **100%**: reservar os 10% da coluna de ações onde ela não
existe devolve ao navegador uma faixa sem dono, que é o sorteio do `table-layout: auto` de volta.

Uma task só porque as três compartilham exatamente esta decisão e nenhuma delas tem medição própria
a discutir.

**Files:**
- Create: `src/app/pages/Dashboard/admin/panelColumns.ts`
- Modify: `src/app/pages/Dashboard/admin/CompliancePanel.tsx` (colunas em 31–90)
- Modify: `src/app/pages/Dashboard/admin/RedatorLoadPanel.tsx` (colunas em 42–82)
- Modify: `src/features/identity/components/Student/studentColumns.ts` (acrescenta um export)
- Modify: `src/features/identity/components/Student/StudentDetailSections.tsx` (colunas em 93–126)

**Interfaces:**
- Consumes: `COL`, `tableWidths` de `@shared/ui`; `studentColumns.ts` da Task 12 — **não o
  reescreva**, só acrescente.
- Produces: `LARGURA_COMPLIANCE`, `LARGURA_CARGA_RELATOR`, `LARGURA_TURMA_DO_ALUNO`.

- [ ] **Passo 1: Crie `panelColumns.ts`**

```ts
import { COL, tableWidths } from '@shared/ui'

/**
 * Largura das duas tabelas do painel administrativo do Dashboard.
 *
 * `{ acao: false }` nas duas: são visões, não superfícies de trabalho — a ação
 * mora no módulo de destino, atrás do link da primeira coluna. Sem o `acao:
 * false` o orçamento reservaria 10% a uma coluna inexistente e a faixa voltaria
 * a ser repartida pelo navegador.
 *
 * Na conformidade, `missing` é `text` e não `count`: a célula imprime a LISTA de
 * tipos de documento traduzida (`turmaDocumentTypeList`), não a quantidade — é o
 * campo mais longo da tabela junto com o nome do curso. E `range` é `dateTime`
 * porque a célula carrega DUAS datas com `whitespace-nowrap` (UI-10 de
 * 2026-08-17: comprimida, a coluna quebrava uma data em quatro linhas). Sendo
 * `nowrap`, o `min-content` dela é alto e pode vencer a preferência em tela
 * estreita — é o risco R1 da spec, e a medição do Passo 6 o registra.
 */
export const LARGURA_COMPLIANCE = tableWidths(
  {
    course: COL.text,
    redatores: COL.short,
    range: COL.dateTime,
    present: COL.count,
    missing: COL.text,
    enabled: COL.tag,
  },
  { acao: false },
)

/**
 * `name` é o `text` desta tabela: a célula imprime o nome do relator dentro de um
 * `Link`, e os outros quatro campos são contadores.
 */
export const LARGURA_CARGA_RELATOR = tableWidths(
  {
    name: COL.text,
    current: COL.count,
    upcoming: COL.count,
    expired: COL.count,
    expiring: COL.count,
  },
  { acao: false },
)
```

- [ ] **Passo 2: Ligue no `CompliancePanel.tsx`**

```ts
import { LARGURA_COMPLIANCE } from './panelColumns'
```

| coluna (`header`) | acrescente |
|---|---|
| `dashboard.compliance.course` | `style={LARGURA_COMPLIANCE.course}` |
| `dashboard.compliance.redatores` | `style={LARGURA_COMPLIANCE.redatores}` |
| `dashboard.compliance.range` | `style={LARGURA_COMPLIANCE.range}` |
| `dashboard.compliance.present` | `style={LARGURA_COMPLIANCE.present}` |
| `dashboard.compliance.missing` | `style={LARGURA_COMPLIANCE.missing}` |
| `dashboard.compliance.enabled` | `style={LARGURA_COMPLIANCE.enabled}` |

- [ ] **Passo 3: Ligue no `RedatorLoadPanel.tsx`**

```ts
import { LARGURA_CARGA_RELATOR } from './panelColumns'
```

| coluna (`header`) | acrescente |
|---|---|
| `dashboard.redatorLoad.name` | `style={LARGURA_CARGA_RELATOR.name}` |
| `dashboard.redatorLoad.current` | `style={LARGURA_CARGA_RELATOR.current}` |
| `dashboard.redatorLoad.upcoming` | `style={LARGURA_CARGA_RELATOR.upcoming}` |
| `dashboard.redatorLoad.expired` | `style={LARGURA_CARGA_RELATOR.expired}` |
| `dashboard.redatorLoad.expiring` | `style={LARGURA_CARGA_RELATOR.expiring}` |

- [ ] **Passo 4: Acrescente o export em `studentColumns.ts` e ligue no `StudentDetailSections.tsx`**

No fim de `src/features/identity/components/Student/studentColumns.ts`:

```ts
/**
 * A tabela de turmas dentro do detalhe do aluno. Sem coluna de ação — abrir a
 * turma é navegação, e ela já está no código da primeira coluna.
 */
export const LARGURA_TURMA_DO_ALUNO = tableWidths(
  { code: COL.code, course: COL.text, date: COL.date, status: COL.tag },
  { acao: false },
)
```

Em `StudentDetailSections.tsx` (aspas **duplas**, é a grafia do arquivo):

```ts
import { LARGURA_TURMA_DO_ALUNO } from "./studentColumns";
```

| coluna (`header`) | acrescente |
|---|---|
| `student.turmaCode` | `style={LARGURA_TURMA_DO_ALUNO.code}` |
| `student.turmaCourse` | `style={LARGURA_TURMA_DO_ALUNO.course}` |
| `student.turmaDate` | `style={LARGURA_TURMA_DO_ALUNO.date}` |
| `student.turmaStatus` | `style={LARGURA_TURMA_DO_ALUNO.status}` |

- [ ] **Passo 5: Gate de código** — Procedimento L. `StudentDetailSections.test.tsx` já existe e
precisa continuar verde sem edição.

- [ ] **Passo 6: Medição**

Procedimento M em três superfícies, nos três viewports cada:

1. `/` (Dashboard, painel de conformidade). Esperado em 1440x900: CURSO ~25,0%, RELATORES ~15,5%,
   INTERVALO ~14,3%, PRESENTES ~8,3%, FALTANTES ~25,0%, HABILITADA ~11,9%. **`acaoDentroDaMoldura`
   aqui mede a ÚLTIMA coluna de dado, não uma coluna de ação** — a leitura interessa como prova de
   que a tabela não estourou, não como prova de ancoragem.
2. `/` (Dashboard, painel de carga de relatores). Esperado: NOME ~42,9%, e os quatro contadores
   ~14,3% cada.
3. `/personas`, aba de alunos, diálogo de detalhe de um aluno com turmas. Esperado: CÓDIGO ~16,3%,
   CURSO ~42,9%, DATA ~20,4%, ESTADO ~20,4%.

Em 1024x768 e 390x844, confirme especificamente que o INTERVALO do painel de conformidade continua
numa linha só. Se a coluna estourar a fatia (R1 da spec), registre o `px` medido e o `pct` real na
leitura — é comportamento esperado do `table-layout: auto`, não regressão.

- [ ] **Passo 7: Commit**

```bash
git add src/app/pages/Dashboard/admin/panelColumns.ts src/app/pages/Dashboard/admin/CompliancePanel.tsx src/app/pages/Dashboard/admin/RedatorLoadPanel.tsx src/features/identity/components/Student/studentColumns.ts src/features/identity/components/Student/StudentDetailSections.tsx
git commit -m "refactor(ui): tabelas sem acao declaram largura sobre o orcamento cheio

<as leituras do Procedimento M, por superficie e viewport>"
```

---

### Task 15: `archivedColumns` declara o par fixo

As duas colunas do rastreio de arquivamento servem 7 tabelas com o MESMO conteúdo — uma data e um
nome. Medir sete vezes o mesmo dado é desproporcional (D4 da spec): par fixo em `shared`, e a
assinatura `archivedColumns(t)` não muda.

**São 7 sítios, e não os 8 que o item 17 escreve.** O oitavo consumidor de `archivedColumns` é o
`ArchivedQuotesList`, que **não é tabela** — é layout flex. Largura de coluna não se aplica a ele, e
ele não é tocado por esta task.

**Files:**
- Modify: `src/shared/ui/archivedColumns.tsx` (as duas `AppColumn`, linhas 39–52)
- Modify: `src/shared/ui/archivedColumns.test.tsx` (o helper `coluna` e um `it` novo)

**Interfaces:**
- Consumes: `ARCHIVED_COLUMN` de `./AppDataTable` (Task 1).
- Produces: nada novo. A assinatura pública de `archivedColumns` continua `(t) => ReactElement[]`.

- [ ] **Passo 1: Escreva o teste que falha**

Em `src/shared/ui/archivedColumns.test.tsx`, estenda o tipo devolvido pelo helper `coluna` com
`style?: CSSProperties` (acrescente `import type { CSSProperties } from 'react'` no topo):

```ts
  return elemento.props as {
    field?: string
    header?: string
    style?: CSSProperties
    body?: (linha: { archived_at?: string; archived_by?: string | null }) => unknown
  }
```

E acrescente, dentro do `describe('archivedColumns', ...)`:

```ts
  it('declara a largura das duas colunas, somando o que o orcamento desconta', () => {
    // A catraca de ESLint do item 17 nao alcanca `src/shared/**`: os arquivos de
    // teste de shared renderizam AppColumn de fixture sem largura, e por-los sob a
    // regra exigiria um `ignores` que desligaria junto a catraca de cor. O par vive
    // aqui, entao a prova vive aqui.
    expect(coluna(0).style).toEqual(ARCHIVED_COLUMN.archived_at)
    expect(coluna(1).style).toEqual(ARCHIVED_COLUMN.archived_by)
    expect(
      parseFloat(String(ARCHIVED_COLUMN.archived_at.width)) +
        parseFloat(String(ARCHIVED_COLUMN.archived_by.width)),
    ).toBe(24)
  })
```

Acrescente `ARCHIVED_COLUMN` ao import de `./AppDataTable` que o arquivo já tem na linha 5.

- [ ] **Passo 2: Rode e veja falhar**

```bash
pnpm test src/shared/ui/archivedColumns.test.tsx
```

Esperado: FAIL — `expected undefined to deeply equal { width: '10%' }`.

- [ ] **Passo 3: Implemente**

Em `src/shared/ui/archivedColumns.tsx`, troque o import da linha 3 por:

```ts
import { AppColumn, ARCHIVED_COLUMN } from './AppDataTable'
```

E acrescente `style` às duas colunas:

```tsx
    <AppColumn
      key="archived_at"
      field="archived_at"
      header={t('archive.archivedAt')}
      style={ARCHIVED_COLUMN.archived_at}
      body={(linha: ArchiveTrail) =>
        linha.archived_at ? formatDate(new Date(linha.archived_at)) : '—'
      }
    />,
    <AppColumn
      key="archived_by"
      field="archived_by"
      header={t('archive.archivedBy')}
      style={ARCHIVED_COLUMN.archived_by}
      body={(linha: ArchiveTrail) => linha.archived_by ?? t('archive.unknownAuthor')}
    />,
```

No docblock do arquivo, troque a frase que fala em "8 tabelas" pelo número medido:

```
 * As duas colunas servem 7 TABELAS (o oitavo consumidor, `ArchivedQuotesList`, é
 * layout flex e não tabela) e declaram largura em par fixo, de `ARCHIVED_COLUMN`:
 * o conteúdo é o mesmo nas sete — uma data e um nome —, e medir sete vezes o
 * mesmo dado seria desproporcional (item 17, D4).
```

- [ ] **Passo 4: Rode e veja passar**

```bash
cd /home/jvbat/projetos/fix-frontend/frontend && pnpm test src/shared/ui/archivedColumns.test.tsx
```

Esperado: PASS.

- [ ] **Passo 5: Gate de código** — Procedimento L.

- [ ] **Passo 6: Medição das visões arquivadas**

Procedimento M em 1440x900 nas **7** superfícies com rastreio, com o `ArchiveSwitch` ligado
(ou, na sétima, sempre arquivada): `/operacion` (turmas), `/comercial` (orçamentos), `/comercial`
(clientes), `/cursos`, `/administracion` (usuários), `/personas` (relatores) e a lista de matrículas
arquivadas.

Esperado nas sete: ARQUIVADO EM ~10%, ARQUIVADO POR ~14%, as colunas de dado somando ~66% e a de
ação em `rem`. Nenhuma coluna de identidade abaixo de 120px.

- [ ] **Passo 7: Commit**

```bash
git add src/shared/ui/archivedColumns.tsx src/shared/ui/archivedColumns.test.tsx
git commit -m "feat(shared): rastreio de arquivados declara par fixo de largura

<as 7 leituras do Procedimento M>"
```

---
### Task 16: A política vira mecanismo — as duas regras de ESLint

**Entra por último de propósito.** Ligada antes, o lint ficaria vermelho durante catorze tasks.

**Files:**
- Modify: `frontend/eslint.config.js` (duas const novas depois de `DISABLED_READONLY_ESTATICO`,
  linha ~200; quatro arrays de `no-restricted-syntax` estendidos)
- Create e depois REMOVER: `src/features/operation/components/Turma/__sonda.tsx`

**Interfaces:**
- Consumes: as 15 tabelas já em conformidade (Tasks 2–15). Se alguma não estiver, esta task reprova
  antes de escrever regra — é a função dela.
- Produces: `COLUNA_SEM_LARGURA` e `ACAO_SEM_ANCORA`, duas const internas do `eslint.config.js`.

- [ ] **Passo 1: Acrescente as duas const**

Em `eslint.config.js`, logo depois de `DISABLED_READONLY_ESTATICO` (antes do comentário da
`CATRACA_COR`):

```js
// Item 17: toda coluna declara largura, e toda coluna com ação fica presa à
// direita. As duas nascem DEPOIS de as 15 tabelas cumprirem — regra ligada antes
// deixa o lint vermelho durante catorze tasks.
//
// **`JSXOpeningElement` com `:has(> …)`, e NÃO `JSXElement` com `:has(…)`.** A
// forma descendente não funciona e foi medida: `body={() => <span style={{…}}>}`
// é um atributo do PRÓPRIO `JSXOpeningElement`, então um `style` em qualquer
// elemento aninhado no `body` satisfaz o `:has` e a coluna passa sem declarar
// largura nenhuma. É o caso de CompliancePanel (`<Link style>`), CoursesTable
// (`<i style>`) e StudentsTable (`<span style>`) — três das quinze. Sondado em
// 2026-08-24 nas duas grafias: a descendente acusava ZERO.
const COLUNA_SEM_LARGURA = {
  selector: "JSXOpeningElement[name.name='AppColumn']:not(:has(> JSXAttribute[name.name='style']))",
  message:
    'Toda coluna declara largura (item 17): style={largura.<chave>} de tableWidths/COL, ou style={stickyActionsColumn(<rem>)} na coluna de ações.',
}
// As três formas de célula de ação que o inventário do item 17 achou: adaptador
// `*RowActions`, `AppButton` solto e `AppButton` dentro de `div` — o `:has` é
// descendente de propósito aqui, então o `flex gap-2` do Historial casa.
//
// O que ela NÃO pega, dito para ninguém supor cobertura que não existe: coluna
// de ação cuja célula não passe por `*RowActions` nem `AppButton`, e
// `stickyActionsColumn` chamado em qualquer lugar dentro da coluna que não seja
// o `style` (não existe hoje; a chamada só aparece em `style`).
const ACAO_SEM_ANCORA = {
  selector:
    "JSXElement[openingElement.name.name='AppColumn']" +
    ":has(JSXElement[openingElement.name.name=/RowActions$|^AppButton$/])" +
    ":not(:has(CallExpression[callee.name='stickyActionsColumn']))",
  message:
    'Coluna de ação fica presa à direita do invólucro que rola: style={stickyActionsColumn(<rem>)} (item 17).',
}
```

- [ ] **Passo 2: Entre nos QUATRO blocos que casam as 15 tabelas**

A armadilha do `eslint.config.js:240` é obrigatória: em flat config o `no-restricted-syntax` de um
bloco posterior **apaga** o do anterior para os mesmos arquivos, sem estourar nada. Acrescente
`COLUNA_SEM_LARGURA, ACAO_SEM_ANCORA` ao FIM de cada um destes quatro arrays:

| bloco (`files`) | por que |
|---|---|
| `src/features/*/components/**/*.{ts,tsx}` (com `ignores: CATRACA_COR`) | as 12 tabelas de feature |
| `CATRACA_COR` | partição do mesmo glob; sem isto, tabela futura nesses 4 arquivos escapa |
| `src/features/**/*.{ts,tsx}` (com `ignores` de `components/`) | tabela futura em `pages/` de feature |
| `src/app/**/*.tsx` | `CompliancePanel` e `RedatorLoadPanel` |

**O bloco `src/shared/**/*.tsx` fica de FORA, e isto é decisão medida, não esquecimento.** Ele
casaria três arquivos de TESTE de `shared` que renderizam `AppColumn` de fixture sem largura
(`archivedColumns.test.tsx`, `AppDataTable.test.tsx`, `SearchableTableFrame.test.tsx`, 6 colunas ao
todo). Cobri-los exigiria `ignores: ['**/*.test.tsx']` naquele bloco, o que desligaria junto
`COR_HARDCODED` e `DISABLED_READONLY` nos testes de shared — enfraquecimento silencioso de duas
catracas para ganhar uma. A população real de `shared` são as duas colunas de `archivedColumns.tsx`,
e elas ganharam prova comportamental na Task 15. Escreva esta razão como comentário acima das duas
const, senão a próxima pessoa "conserta" a ausência.

- [ ] **Passo 3: Escreva a sonda e VEJA AS DUAS REPROVAREM**

Crie `src/features/operation/components/Turma/__sonda.tsx`:

```tsx
import { AppColumn, AppDataTable, stickyActionsColumn } from '@shared/ui'
import { TurmaRowActions } from './TurmaRowActions'

export function Sonda() {
  return (
    <AppDataTable value={[]}>
      {/* (a) REPROVA por COLUNA_SEM_LARGURA: o único `style` está aninhado no body */}
      <AppColumn header="a" body={() => <span style={{ color: 'var(--text-color)' }}>x</span>} />
      {/* (b) REPROVA por ACAO_SEM_ANCORA: ação com largura literal, sem âncora */}
      <AppColumn body={() => <TurmaRowActions />} style={{ width: '8rem' }} />
      {/* (c) e (d) PASSAM */}
      <AppColumn header="c" style={{ width: '10%' }} />
      <AppColumn body={() => <TurmaRowActions />} style={stickyActionsColumn('8rem')} />
    </AppDataTable>
  )
}
```

```bash
cd /home/jvbat/projetos/fix-frontend/frontend && npx eslint src/features/operation/components/Turma/__sonda.tsx
```

Esperado: **exatamente 2 erros** — a linha de (a) com a mensagem de `COLUNA_SEM_LARGURA` e a de (b)
com a de `ACAO_SEM_ANCORA`; nada em (c) nem em (d). Só `npx eslint` na sonda: ela não typecheck a
(`TurmaRowActions` sem props) e não deve entrar em `pnpm build`.

Se uma das duas não disparar, **a regra é reescrita, não afrouxada** (R5 da spec) — e o `git blame`
desta task precisa mostrar a sonda vendo a versão final reprovar.

- [ ] **Passo 4: Reverta a sonda**

```bash
rm src/features/operation/components/Turma/__sonda.tsx
git status --short
```

Esperado: só `eslint.config.js` modificado.

- [ ] **Passo 5: Lint sobre a árvore inteira**

```bash
cd /home/jvbat/projetos/fix-frontend/frontend && pnpm lint
```

Esperado: **0 problemas**. É aqui que o R4 da spec aparece, se aparecer: uma coluna de DADO que
contenha `AppButton` casaria `ACAO_SEM_ANCORA`. O inventário não achou nenhuma. Se aparecer, não
prenda a coluna nem desligue a regra — **traga o sítio ao João**: uma coluna de dado com botão é
achado de UI, não de largura.

- [ ] **Passo 6: Gate e commit**

Rode o **Procedimento L** completo.

```bash
git add eslint.config.js
git commit -m "chore(lint): catraca de largura e de ancora da coluna de acao

Duas sondas vistas reprovando antes de ligar; sonda revertida com a arvore limpa."
```

---

### Task 17: Definition of done — a varredura e o registro

Nenhum código novo. Esta task PROVA o bloco, ou o reabre.

**Files:** nenhum modificado. A saída é o relato ao João.

**Interfaces:**
- Consumes: as Tasks 1–16 fechadas.
- Produces: o registro de medição que o `/revisar-sprint` e o `/fechar-sprint` vão ler.

- [ ] **Passo 1: Varredura — nenhuma coluna sem largura declarada**

```bash
cd /home/jvbat/projetos/fix-frontend/frontend && npx eslint 'src/**/*.tsx' --rule "{\"no-restricted-syntax\":[\"error\",{\"selector\":\"JSXOpeningElement[name.name='AppColumn']:not(:has(> JSXAttribute[name.name='style']))\",\"message\":\"coluna sem largura\"}]}"
```

Esperado: erros **somente** em `src/shared/ui/archivedColumns.test.tsx`,
`src/shared/ui/AppDataTable/AppDataTable.test.tsx` e
`src/shared/ui/SearchableTableFrame/SearchableTableFrame.test.tsx` — as fixtures de teste declaradas
como exceção na Task 16. Qualquer erro fora desses três é tabela que escapou; volte à task dela.

- [ ] **Passo 2: Fence de escopo**

```bash
cd /home/jvbat/projetos/fix-frontend && git diff main...HEAD --stat -- backend/ frontend/src/shared/types/generated.ts
```

Esperado: saída vazia. Pint e `typescript:transform` são N/A **por escopo medido**.

- [ ] **Passo 3: Gate final**

```bash
cd /home/jvbat/projetos/fix-frontend/frontend && pnpm lint && pnpm build && pnpm test
```

Esperado: lint 0; build verde; suíte na baseline da Task 1 **mais** os testes acrescentados nas
Tasks 1 e 15.

- [ ] **Passo 4: Consolide as medições**

Monte a tabela final a partir das leituras registradas nos commits das Tasks 2–15:

- **12 tabelas × 3 viewports** (1440x900, 1024x768, 390x844) com `acaoDentroDaMoldura: true`.
- **7 visões arquivadas** em 1440x900, com o par do rastreio em ~10%/~14% e as colunas de dado
  somando ~66%.
- **3 tabelas sem ação** × 3 viewports, com as colunas somando ~100%.

Toda divergência de mais de 2 pontos entre o `pct` medido e o que `tableWidths` devolveu entra na
tabela com o rótulo, o `px` e o conteúdo que venceu a preferência — é o R1 da spec se realizando, e
o registro dele É parte do DoD, não uma nota de rodapé.

- [ ] **Passo 5: Relate ao João**

Entregue: a tabela do Passo 4, a saída do Passo 1, o resultado do Passo 3, e a lista explícita do
que este bloco **não** cobriu — os 3 botões de texto que continuam de texto (D2), o
`ArchivedQuotesList` que não é tabela, e as fixtures de teste de `shared` fora da catraca.

Se qualquer superfície ficou sem medição por falta de dado local, ela aparece como **não medida**, e
o bloco não fecha por inspeção de código. Suposição de largura é o defeito que este bloco corrige.

- [ ] **Passo 6: Commit (só se houver o que registrar em doc)**

Se o registro do Passo 4 for guardado em arquivo, ele vai para `docs/superpowers/audits/`. Se for só
relato de sessão, esta task não commita. O `state.md` **não** é tocado aqui: a transição de
fechamento é do `/fechar-sprint`.

---

## Handoff de execução

```yaml
executor: claude
```

**Por que `claude` na íntegra, e não Codex em parte.** Quinze das dezessete tasks terminam em
medição de tela: abrir a superfície nos três viewports, ler o `pct` real de cada coluna e julgar se
a divergência é o `min-content` fazendo o que deve (R1 da spec) ou classe errada. Esse julgamento
não cabe no plano — é exatamente o que o plano não consegue escrever de antemão. As duas exceções
(a peça de `shared`, na Task 1, e a catraca de ESLint, na Task 16) são pequenas demais para pagarem
um Context Packet e um handoff próprio, e a Task 16 depende de ver as duas sondas reprovarem, que é
a mesma classe de julgamento.

Sem `paths_autorizados`: o campo só existe quando `executor: codex`.

**Ordem obrigatória.** Task 1 → Task 2 (a semente; se o vocabulário não reproduzir a única tabela já
medida, o vocabulário está errado) → Tasks 3–14 (em qualquer ordem entre si) → Task 15 → Task 16
(por último; ligada antes, o lint fica vermelho durante catorze tasks) → Task 17.

**O que faz PARAR e chamar o João:**

- Uma coluna de DADO casando `ACAO_SEM_ANCORA` (R4 da spec) — é achado de UI, não de largura.
- Uma superfície sem dado no ambiente local: peça o registro, não feche por leitura de código.
- Qualquer task que pareça pedir redesenho de célula, coluna nova, coluna a menos, ou converter
  botão de texto em ícone — é o Fora de escopo do item 17 (D2), e a spec já registrou a decisão.
- Divergência entre o que a medição mostra e o que a spec previu que seja grande a ponto de mudar o
  vocabulário: mudar `COL` afeta as quinze tabelas de uma vez.
