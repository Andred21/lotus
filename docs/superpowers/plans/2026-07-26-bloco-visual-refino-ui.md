# Bloco visual · Refinamento de UI por módulo — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** entregar a camada compartilhada de composição visual em `frontend/src/shared/ui` e migrar
as telas para ela, junto do checklist de responsividade e estados do Notion `H.2.1`.

**Architecture:** composição explícita. `AppCard` expõe `Header`, `Toolbar` e `Footer` como
subcomponentes e cada tela compõe o que precisa; `ModulePage` encolhe para título, descrição e tags.
A ação primária de módulo desce do `PageHeader` para a toolbar dentro do card, e a toolbar pertence
ao painel da aba ativa — não à página.

**Tech Stack:** React 19 + TypeScript (Vite), PrimeReact via wrappers em `shared/ui`, tema Lara
trocado por folha de estilo em runtime (ADR-16), Tailwind v4 só para layout, i18n em 3 locales.

**Spec:** `docs/superpowers/specs/2026-07-26-bloco-visual-refino-ui-design.md`
**Context packet:** `docs/superpowers/context-packets/bloco-visual-refino-ui.md`

## Global Constraints

- **Cor vem de variável CSS do tema, nunca de par Tailwind hardcoded.** ADR-16. Tailwind é layout.
- **As utilities de cor do `tailwindcss-primeui` não funcionam neste projeto.** Elas resolvem
  `--p-surface-*`; o tema Lara legado define `--surface-*`. `grep -c '\-\-p-surface-0'` no
  `theme.css` do Lara devolve `0`, e nenhum arquivo em `src/` usa `bg-surface-*`. Use as variáveis do
  Lara direto: `--surface-card`, `--surface-border`, `--surface-hover`, `--surface-section`,
  `--text-color`, `--text-color-secondary`, `--primary-color`.
- **Os palette vars do Lara NÃO invertem entre temas.** `--green-50` é `#f4fcf7` no
  `lara-light-blue` **e** no `lara-dark-blue`. Só `--surface-*` e `--text-color*` invertem. Fundo
  tingido que precise funcionar nos dois temas usa
  `color-mix(in srgb, var(--green-500) 10%, var(--surface-card))`, que herda a inversão do
  `--surface-card`.
- **O tema escuro é a classe `.dark` no `<html>`** (`src/app/providers/useApplyTheme.ts:14`), com
  `@custom-variant dark (&:where(.dark, .dark *))` em `src/index.css`.
- **Feature não importa PrimeReact direto nem outra feature** (ADR-05, lei §5.6). `shared` nunca
  importa de `features`.
- **Wrapper novo segue o padrão da pasta:** `AppX/AppX.tsx` + `AppX/index.ts`, reexportando
  `AppXProps`, e uma linha `export * from './AppX'` no barrel `shared/ui/index.ts`.
- **Os 3 locales têm chaves idênticas.** `es-CL` é a referência de rótulo. Chave nova entra em
  `es-CL.json`, `pt-BR.json` e `en.json` na mesma task.
- **`generated.ts` não se edita.** Este bloco não toca DTO, então não há `typescript:transform`.
- **Gate mecânico de toda task:** de `frontend/`, `pnpm lint` e `pnpm build`. O `build` roda `tsc -b`
  antes de bundlar, então erro de tipo aparece aí. Build verde **não** prova comportamento visual.

## Correções de premissa apuradas ao escrever este plano

Três coisas que a spec descreve de um jeito que o código contradiz. O plano segue o código.

1. **A paleta semântica já existe e já está certa.** `quoteStatusSeverity`
   (`features/commercial/lib/quoteStatus.ts`) mapeia `approved→success`, `rejected→danger`,
   `pending→warning`; `turmaStatusSeverity` (`features/operation/lib/turmaStatus.ts`) mapeia
   `concluida→success`, `habilitada→warning`, `em_andamento→info`. As cores do Lara para essas
   severities são o verde, vermelho, âmbar e azul dos prints. **D7 não precisa de escala paralela.**
   Falta só o roxo de `Online`, que não tem `severity` nativa, e o neutro explícito em
   `Empresa`/`Presencial`, que hoje renderizam sem `severity` e saem na cor primária.
2. **Os títulos de módulo já rendem o texto certo nos 3 locales.** `client.module` devolve
   `Comercial`/`Comercial`/`Commercial` e `redator.module` devolve `Personas`/`Pessoas`/`People`. O
   débito é **nomenclatura de chave** — título de módulo pendurado em entidade, com `budget.module`
   duplicando `client.module`. A correção é rename e dedup, com zero mudança visível.
3. **A coluna `CÓDIGO` de Operación já existe** (`TurmasTable.tsx:52-53`), rendendo `quote_code` em
   `font-mono text-sky-600`. Só a cor hardcoded muda (D8).

---

# Parte 1 — Camada `shared/ui` + Comercial (piloto)

Comercial é o piloto porque exercita o contrato inteiro numa tela só: duas abas, busca, ação
primária que muda por aba, e footer sem paginador.

## Task 1: `AppCard` e seus subcomponentes

**Files:**
- Create: `frontend/src/shared/ui/AppCard/AppCard.tsx`
- Create: `frontend/src/shared/ui/AppCard/index.ts`
- Modify: `frontend/src/shared/ui/index.ts`

**Interfaces:**
- Consumes: nada.
- Produces: `AppCard`, `AppCardHeader`, `AppCardToolbar`, `AppCardFooter`, e os tipos
  `AppCardProps`, `AppCardHeaderProps`, `AppCardToolbarProps`, `AppCardFooterProps`.
  `AppCardProps.variant` é `'default' | 'stat'`; `AppCardProps.tone` é
  `'neutral' | 'success' | 'danger'` e só tem efeito quando `variant="stat"`.

- [ ] **Step 1: Criar o componente**

```tsx
// frontend/src/shared/ui/AppCard/AppCard.tsx
import type { CSSProperties, ReactNode } from 'react'

export type AppCardVariant = 'default' | 'stat'
export type AppCardTone = 'neutral' | 'success' | 'danger'

export interface AppCardProps {
  variant?: AppCardVariant
  /** Só tem efeito com variant="stat". */
  tone?: AppCardTone
  className?: string
  children: ReactNode
}

/** Hue por tom. Os palette vars do Lara NÃO invertem entre temas, então o fundo
 * tingido é composto com --surface-card (que inverte) via color-mix. */
const TONE_HUE: Record<AppCardTone, string | null> = {
  neutral: null,
  success: 'var(--green-500)',
  danger: 'var(--red-500)',
}

const TONE_TEXT: Record<AppCardTone, string> = {
  neutral: 'var(--text-color)',
  success: 'var(--green-600)',
  danger: 'var(--red-600)',
}

/**
 * Container de conteúdo. Apresentacional puro — não conhece feature nem rota.
 * Compõe-se com AppCardHeader/AppCardToolbar/AppCardFooter; nenhum deles é
 * obrigatório, e a ordem é responsabilidade de quem compõe.
 */
export function AppCard({ variant = 'default', tone = 'neutral', className, children }: AppCardProps) {
  const hue = variant === 'stat' ? TONE_HUE[tone] : null

  const style: CSSProperties = {
    background: hue ? `color-mix(in srgb, ${hue} 8%, var(--surface-card))` : 'var(--surface-card)',
    borderColor: hue ? `color-mix(in srgb, ${hue} 35%, var(--surface-border))` : 'var(--surface-border)',
    color: variant === 'stat' ? TONE_TEXT[tone] : 'var(--text-color)',
  }

  return (
    <div
      className={['rounded-lg border', variant === 'stat' ? 'px-5 py-4' : '', className].filter(Boolean).join(' ')}
      style={style}
    >
      {children}
    </div>
  )
}

export interface AppCardHeaderProps {
  title: ReactNode
  /** Badge de contagem à direita do título. */
  count?: number
  /** Ação secundária, alinhada à direita. */
  actions?: ReactNode
}

/** Cabeçalho de card: título (+ badge de contagem) à esquerda, ação à direita. */
export function AppCardHeader({ title, count, actions }: AppCardHeaderProps) {
  return (
    <div
      className="flex items-center justify-between gap-3 border-b px-4 py-3"
      style={{ borderColor: 'var(--surface-border)' }}
    >
      <div className="flex items-center gap-2">
        <h3 className="text-base font-semibold" style={{ color: 'var(--text-color)' }}>{title}</h3>
        {count !== undefined && (
          <span
            className="rounded-full px-2 py-0.5 text-xs font-semibold"
            style={{ background: 'var(--surface-section)', color: 'var(--text-color-secondary)' }}
          >
            {count}
          </span>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  )
}

export interface AppCardToolbarProps {
  /** Busca, filtros ou grupo de botões. */
  start?: ReactNode
  /** Ação primária ou contagem. */
  end?: ReactNode
}

/** Linha de controles do card. Empilha em telas estreitas (H.2.1). */
export function AppCardToolbar({ start, end }: AppCardToolbarProps) {
  return (
    <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 flex-wrap items-center gap-3">{start}</div>
      {end && <div className="flex shrink-0 items-center gap-2">{end}</div>}
    </div>
  )
}

export interface AppCardFooterProps {
  /** Contagem em prosa. */
  count: ReactNode
  /**
   * Paginação, quando houver mais de uma página.
   *
   * ATENÇÃO — pendência conhecida da Parte 1: o `DataTable` do PrimeReact é dono
   * do estado de página e renderiza o próprio paginador logo abaixo do corpo da
   * tabela, ou seja ACIMA deste footer. Com as duas coisas ligadas aparecem duas
   * faixas, e o protótipo mostra uma. Em Comercial o caso não ocorre (o seeder
   * cria 4 clientes e 6 orçamentos, abaixo do `rows={10}`), então a Parte 1
   * entrega o footer só com contagem. Unificar as duas faixas — via
   * `paginatorTemplate` do `DataTable` alimentando este slot — é escopo da
   * Parte 2, onde Operación tem o caso real.
   */
  pagination?: ReactNode
}

/** Rodapé do card: contagem à esquerda, paginação à direita. */
export function AppCardFooter({ count, pagination }: AppCardFooterProps) {
  return (
    <div
      className="flex items-center justify-between gap-3 border-t px-4 py-3 text-sm"
      style={{ borderColor: 'var(--surface-border)', color: 'var(--text-color-secondary)' }}
    >
      <span>{count}</span>
      {pagination}
    </div>
  )
}
```

- [ ] **Step 2: Criar o barrel da pasta**

```ts
// frontend/src/shared/ui/AppCard/index.ts
export * from './AppCard'
```

- [ ] **Step 3: Registrar no barrel raiz**

Em `frontend/src/shared/ui/index.ts`, insira a linha em ordem alfabética, entre
`export * from './AppButton'` e `export * from './AppCheckbox'`:

```ts
export * from './AppCard'
```

- [ ] **Step 4: Verificar**

De `frontend/`:

```bash
pnpm lint && pnpm build
```

Esperado: ambos sem erro. `AppCard` ainda não tem consumidor, então nenhuma tela muda.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/shared/ui/AppCard frontend/src/shared/ui/index.ts
git commit -m "feat(ui): AppCard com Header, Toolbar, Footer e variante stat"
```

---

## Task 2: `AppEmptyState` com os dois estados

**Files:**
- Create: `frontend/src/shared/ui/AppEmptyState/AppEmptyState.tsx`
- Create: `frontend/src/shared/ui/AppEmptyState/index.ts`
- Modify: `frontend/src/shared/ui/index.ts`
- Modify: `frontend/src/shared/config/locales/es-CL.json`
- Modify: `frontend/src/shared/config/locales/pt-BR.json`
- Modify: `frontend/src/shared/config/locales/en.json`

**Interfaces:**
- Consumes: nada.
- Produces: `AppEmptyState` e `AppEmptyStateProps` (`icon?: string`, `title: string`,
  `description?: string`, `action?: ReactNode`).

- [ ] **Step 1: Criar o componente**

```tsx
// frontend/src/shared/ui/AppEmptyState/AppEmptyState.tsx
import type { ReactNode } from 'react'

export interface AppEmptyStateProps {
  /** Classe de ícone do PrimeIcons. Default: 'pi pi-inbox'. */
  icon?: string
  title: string
  description?: string
  /** Botão de ação. Ausente quando não há ação sensata a oferecer. */
  action?: ReactNode
}

/**
 * Estado vazio de tabela ou lista. Dois usos, distinguidos por quem chama:
 * sem dado (convida a criar) e busca sem resultado (oferece limpar o filtro).
 * Sugerir cadastro quando o problema é o filtro manda o usuário para o lugar
 * errado, por isso a distinção é do chamador e não deste componente.
 */
export function AppEmptyState({ icon = 'pi pi-inbox', title, description, action }: AppEmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
      <i className={`${icon} text-3xl`} style={{ color: 'var(--text-color-secondary)' }} aria-hidden="true" />
      <p className="text-base font-semibold" style={{ color: 'var(--text-color)' }}>{title}</p>
      {description && (
        <p className="max-w-md text-sm" style={{ color: 'var(--text-color-secondary)' }}>{description}</p>
      )}
      {action && <div className="mt-1">{action}</div>}
    </div>
  )
}
```

- [ ] **Step 2: Criar o barrel da pasta**

```ts
// frontend/src/shared/ui/AppEmptyState/index.ts
export * from './AppEmptyState'
```

- [ ] **Step 3: Registrar no barrel raiz**

Em `frontend/src/shared/ui/index.ts`, entre `export * from './AppDropdown'` e
`export * from './AppFileUpload'`:

```ts
export * from './AppEmptyState'
```

- [ ] **Step 4: Adicionar as chaves de busca vazia nos 3 locales**

Em `frontend/src/shared/config/locales/es-CL.json`, dentro do objeto `common`:

```json
"noResults": "Sin resultados para \"{{term}}\"",
"noResultsFiltered": "Sin resultados para los filtros aplicados",
"noResultsHint": "Revisa el término o limpia la búsqueda.",
"clearSearch": "Limpiar búsqueda"
```

`noResultsFiltered` cobre o caso em que só o filtro de estado está ativo e não há termo — sem ela a
frase citaria aspas vazias.

Em `pt-BR.json`, dentro de `common`:

```json
"noResults": "Sem resultados para \"{{term}}\"",
"noResultsFiltered": "Sem resultados para os filtros aplicados",
"noResultsHint": "Revise o termo ou limpe a busca.",
"clearSearch": "Limpar busca"
```

Em `en.json`, dentro de `common`:

```json
"noResults": "No results for \"{{term}}\"",
"noResultsFiltered": "No results for the applied filters",
"noResultsHint": "Check the term or clear the search.",
"clearSearch": "Clear search"
```

- [ ] **Step 5: Adicionar as dicas de "sem dado" de Comercial nos 3 locales**

`client.empty` e `budget.empty` já existem e viram o **título**. Falta a descrição.

Em `es-CL.json`, dentro de `client`: `"emptyHint": "Registra el primer cliente para comenzar."`
Em `es-CL.json`, dentro de `budget`: `"emptyHint": "Crea el primer presupuesto para comenzar."`

Em `pt-BR.json`, dentro de `client`: `"emptyHint": "Cadastre o primeiro cliente para começar."`
Em `pt-BR.json`, dentro de `budget`: `"emptyHint": "Crie o primeiro orçamento para começar."`

Em `en.json`, dentro de `client`: `"emptyHint": "Register the first client to get started."`
Em `en.json`, dentro de `budget`: `"emptyHint": "Create the first budget to get started."`

- [ ] **Step 6: Verificar que os 3 locales têm as mesmas chaves**

De `frontend/src/shared/config/locales/`:

```bash
python3 -c "
import json
def keys(o,p=''):
    out=set()
    for k,v in o.items():
        n=f'{p}.{k}' if p else k
        out.add(n)
        if isinstance(v,dict): out |= keys(v,n)
    return out
a=keys(json.load(open('es-CL.json')))
b=keys(json.load(open('pt-BR.json')))
c=keys(json.load(open('en.json')))
print('es-pt:', sorted(a^b))
print('es-en:', sorted(a^c))
"
```

Esperado: `es-pt: []` e `es-en: []`. Qualquer chave listada é divergência a corrigir antes de seguir.

- [ ] **Step 7: Verificar build**

De `frontend/`:

```bash
pnpm lint && pnpm build
```

Esperado: ambos sem erro.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/shared/ui/AppEmptyState frontend/src/shared/ui/index.ts frontend/src/shared/config/locales
git commit -m "feat(ui): AppEmptyState e chaves de busca vazia nos 3 locales"
```

---

## Task 3: `AppTag` — tom neutro e tom `accent`

A severidade nativa do PrimeReact já cobre `success`, `info`, `warning` e `danger`, e as cores do
Lara batem com os prints. Faltam dois casos: o neutro de `Empresa`/`Presencial`, que hoje renderiza
sem `severity` e sai na cor primária, e o roxo de `Online`, que não tem severidade nativa.

**Files:**
- Modify: `frontend/src/shared/ui/AppTag/AppTag.tsx`

**Interfaces:**
- Consumes: nada.
- Produces: `AppTagProps` ganha `tone?: 'accent'`. Quando presente, `tone` vence `severity`.
  `severity="secondary"` continua sendo o neutro, vindo do PrimeReact.

- [ ] **Step 1: Reescrever o wrapper**

```tsx
// frontend/src/shared/ui/AppTag/AppTag.tsx
import { Tag } from 'primereact/tag'
import type { TagProps } from 'primereact/tag'

/** Tom sem equivalente em `severity` do PrimeReact. Hoje só o roxo de
 * modalidade `Online`. Modalidade não é severidade — não entra na escala
 * success/info/warning/danger. */
export type AppTagTone = 'accent'

export interface AppTagProps extends TagProps {
  tone?: AppTagTone
}

export function AppTag({ tone, style, ...props }: AppTagProps) {
  const toneStyle =
    tone === 'accent'
      ? {
          background: 'color-mix(in srgb, var(--purple-500) 15%, var(--surface-card))',
          color: 'var(--purple-600)',
        }
      : undefined

  return <Tag {...props} style={{ ...toneStyle, ...style }} />
}
```

- [ ] **Step 2: Verificar build**

De `frontend/`:

```bash
pnpm lint && pnpm build
```

Esperado: ambos sem erro. `AppTagProps` deixou de ser um reexport de `TagProps`, então o build
acusaria qualquer consumidor que dependesse da forma antiga.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/shared/ui/AppTag
git commit -m "feat(ui): tom accent no AppTag para modalidade Online"
```

---

## Task 4: `pt` do `AppDataTable` — densidade, hover e merge profundo

**Files:**
- Modify: `frontend/src/shared/ui/AppDataTable/style.ts`
- Modify: `frontend/src/shared/ui/AppDataTable/AppDataTable.tsx`

**Interfaces:**
- Consumes: nada.
- Produces: `appDataTablePt` passa a trazer `root`, `headerRow`, `headerCell`, `bodyRow` e
  `bodyCell`. `AppDataTable` passa a mesclar o `pt` do chamador **por chave**, não por substituição
  do objeto inteiro.

- [ ] **Step 1: Reescrever o `pt` base**

Densidade é concreta: `py-3` na célula de corpo, `py-2.5` na de cabeçalho, cabeçalho em caixa alta
com `tracking-wide`. Os valores entram aqui e **não** se redefinem por tela.

```ts
// frontend/src/shared/ui/AppDataTable/style.ts
import type { DataTablePassThroughOptions } from 'primereact/datatable'

/** Passthrough do DataTable (ADR-16). Cores por CSS var do tema Lara.
 *
 * Sem zebra por decisão do bloco visual: zebra e hover competem, e na linha já
 * tingida o hover fica ambíguo. Tabela com poucas colunas e borda de linha não
 * precisa de zebra para guiar o olho. */
export const appDataTablePt: DataTablePassThroughOptions = {
  root: { className: 'text-sm' },
  headerRow: { className: 'text-xs uppercase tracking-wide' },
  headerCell: {
    className: 'px-4 py-2.5',
    style: { background: 'var(--surface-section)', color: 'var(--text-color-secondary)' },
  },
  bodyRow: { className: 'transition-colors' },
  bodyCell: { className: 'px-4 py-3' },
}
```

- [ ] **Step 2: Trocar o merge raso por merge por chave**

O merge de hoje, `{ ...appDataTablePt, ...pt }`, faz um chamador que passa `root` descartar o
`text-sm` da base sem perceber.

```tsx
// frontend/src/shared/ui/AppDataTable/AppDataTable.tsx
import { DataTable } from 'primereact/datatable'
import type { DataTableProps, DataTableValueArray, DataTablePassThroughOptions } from 'primereact/datatable'
import { Column } from 'primereact/column'
import { appDataTablePt } from './style'

/** Mescla o passthrough do chamador com o da base POR CHAVE. Um spread raso
 * faria `pt={{ root: ... }}` descartar o `className` base do root em silêncio. */
function mergePt(
  base: DataTablePassThroughOptions,
  override?: DataTableProps<DataTableValueArray>['pt'],
): DataTablePassThroughOptions {
  if (!override) return base
  const merged: Record<string, unknown> = { ...base }
  for (const [key, value] of Object.entries(override as Record<string, unknown>)) {
    const current = merged[key]
    if (
      current && typeof current === 'object' && !Array.isArray(current) &&
      value && typeof value === 'object' && !Array.isArray(value)
    ) {
      merged[key] = { ...(current as object), ...(value as object) }
    } else {
      merged[key] = value
    }
  }
  return merged as DataTablePassThroughOptions
}

/** Wrapper do DataTable: paginação/sort/filtro client-side (o index devolve
 * array puro). Colunas via <AppColumn/>. */
export function AppDataTable<T extends DataTableValueArray>({ pt, ...props }: DataTableProps<T>) {
  return (
    <DataTable
      dataKey="id"
      removableSort
      paginator
      rows={10}
      pt={mergePt(appDataTablePt, pt as DataTableProps<DataTableValueArray>['pt'])}
      {...props}
    />
  )
}

export { Column as AppColumn }
export type { ColumnProps as AppColumnProps } from 'primereact/column'
```

- [ ] **Step 3: Verificar build**

De `frontend/`:

```bash
pnpm lint && pnpm build
```

Esperado: ambos sem erro.

- [ ] **Step 4: Provar na tela**

`pnpm dev`, abrir http://localhost:5173/comercial. Com o `OperationDemoSeeder` carregado, a tabela
de clientes deve mostrar: cabeçalho em caixa alta esmaecido com faixa de fundo própria, linhas mais
altas que antes, e **nenhuma** alternância de cor. Repetir nos dois temas pelo toggle do header.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/shared/ui/AppDataTable
git commit -m "feat(ui): densidade e merge profundo do pt no AppDataTable"
```

---

## Task 5: `ModulePage` ganha `tags`, mantendo `actions` até a Parte 2

Os cinco consumidores de `ModulePage` passam `actions` hoje. Remover a prop agora quebraria quatro
telas que só migram na Parte 2. Então esta task **adiciona** `tags` e deixa `actions` funcionando; a
última task da Parte 2 remove `actions` depois que ninguém mais a passa.

**Files:**
- Modify: `frontend/src/shared/ui/ModulePage/ModulePage.tsx`
- Modify: `frontend/src/shared/ui/PageHeader/PageHeader.tsx`

**Interfaces:**
- Consumes: nada.
- Produces: `ModulePage` aceita `tags?: ReactNode` além de `actions?: ReactNode`. `PageHeader`
  aceita `tags?: ReactNode`. Quando os dois vêm, `tags` renderiza à esquerda de `actions`.

- [ ] **Step 1: Adicionar `tags` ao `PageHeader`**

```tsx
// frontend/src/shared/ui/PageHeader/PageHeader.tsx
import type { ReactNode } from 'react'

/** Cabeçalho de módulo: título + descrição + tags/ações à direita. Presentational
 * puro (não conhece feature).
 *
 * `actions` está em remoção: a ação primária de módulo desceu para a toolbar do
 * card (spec de 2026-07-26, D1). Sai quando a Parte 2 migrar os últimos
 * consumidores. */
export function PageHeader({
  title,
  description,
  tags,
  actions,
}: {
  title: string
  description?: string
  tags?: ReactNode
  actions?: ReactNode
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h2 className="text-2xl font-bold" style={{ color: 'var(--text-color)' }}>{title}</h2>
        {description && (
          <p className="mt-1 text-sm" style={{ color: 'var(--text-color-secondary)' }}>{description}</p>
        )}
      </div>
      {(tags || actions) && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {tags}
          {actions}
        </div>
      )}
    </div>
  )
}
```

Note a troca de `text-slate-800 dark:text-slate-100` e `text-slate-500` por variável do tema: eram
par Tailwind hardcoded, contra o ADR-16.

- [ ] **Step 2: Repassar `tags` no `ModulePage`**

```tsx
// frontend/src/shared/ui/ModulePage/ModulePage.tsx
import type { ReactNode } from 'react'
import { PageHeader } from '../PageHeader'
import { AppTabView, AppTabPanel } from '../AppTabView'

/**
 * Molde de página de módulo: cabeçalho (título, descrição, tags) + corpo.
 * Apresentacional puro — não conhece feature, não conhece rota.
 *
 * O corpo é um <AppCard> composto pela tela: abas, toolbar, tabela e footer.
 * A ação primária vive na toolbar do card, não aqui (spec de 2026-07-26, D1).
 *
 * `actions` está em remoção — sai quando a Parte 2 migrar os últimos consumidores.
 */
export function ModulePage({
  title,
  description,
  tags,
  actions,
  children,
}: {
  title: string
  description?: string
  tags?: ReactNode
  actions?: ReactNode
  children: ReactNode
}) {
  return (
    <div>
      <PageHeader title={title} description={description} tags={tags} actions={actions} />
      {children}
    </div>
  )
}

export const ModuleTabs = AppTabView
export const ModuleTab = AppTabPanel
```

- [ ] **Step 3: Verificar build**

De `frontend/`:

```bash
pnpm lint && pnpm build
```

Esperado: ambos sem erro — as cinco telas seguem passando `actions` e nada quebra.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/shared/ui/ModulePage frontend/src/shared/ui/PageHeader
git commit -m "feat(ui): tags no ModulePage e cor por variavel de tema no PageHeader"
```

---

## Task 6: Migrar a tabela de clientes para o card

**Files:**
- Modify: `frontend/src/features/commercial/components/Client/ClientsTable.tsx`

**Interfaces:**
- Consumes: `AppCard`, `AppCardToolbar`, `AppCardFooter`, `AppEmptyState` da Task 1 e 2.
- Produces: `ClientsTable` passa a receber `actions?: ReactNode`, renderizado no slot direito da
  toolbar. A tabela deixa de emitir o `<p>` de contagem solto.

- [ ] **Step 1: Reescrever o componente**

```tsx
// frontend/src/features/commercial/components/Client/ClientsTable.tsx
import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AppDataTable, AppColumn, AppTag, AppInputText, AppButton, AppCardToolbar, AppCardFooter, AppEmptyState,
} from '@shared/ui'
import type { ClientData } from '@shared/types/generated'

export function ClientsTable({
  clients, loading, onView, actions,
}: {
  clients: ClientData[]
  loading: boolean
  onView: (c: ClientData) => void
  actions?: ReactNode
}) {
  const { t } = useTranslation()
  const [filter, setFilter] = useState('')

  const term = filter.trim().toLowerCase()
  const rows = term === ''
    ? clients
    : clients.filter(
        (c) => c.legal_name.toLowerCase().includes(term) || c.rut.toLowerCase().includes(term),
      )

  // Dois vazios distintos: sem dado convida a cadastrar; busca sem resultado
  // oferece limpar o filtro. Sugerir cadastro quando o problema é o termo manda
  // o usuário para o lugar errado.
  const empty = term === '' ? (
    <AppEmptyState icon="pi pi-building" title={t('client.empty')} description={t('client.emptyHint')} action={actions} />
  ) : (
    <AppEmptyState
      icon="pi pi-search"
      title={t('common.noResults', { term: filter.trim() })}
      description={t('common.noResultsHint')}
      action={<AppButton label={t('common.clearSearch')} icon="pi pi-times" text onClick={() => setFilter('')} />}
    />
  )

  return (
    <>
      <AppCardToolbar
        start={
          <div className="min-w-64 flex-1">
            <AppInputText
              leftIcon="pi pi-search"
              placeholder={t('client.searchPlaceholder')}
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>
        }
        end={actions}
      />
      <AppDataTable value={rows} loading={loading} emptyMessage={empty} paginator={rows.length > 10}>
        <AppColumn field="legal_name" header={t('client.legalName')} sortable />
        <AppColumn header={t('common.rut')} body={(c: ClientData) => <span className="font-mono text-sm">{c.rut}</span>} />
        <AppColumn header={t('client.type')} body={(c: ClientData) => <AppTag value={t(`clientType.${c.type}`)} severity="secondary" />} />
        <AppColumn header={t('client.commune')} body={(c: ClientData) => c.addresses[0]?.commune ?? '—'} />
        <AppColumn header={t('client.contacts')} body={(c: ClientData) => <span className="font-semibold">{c.contacts.length}</span>} />
        <AppColumn
          body={(c: ClientData) => <AppButton icon="pi pi-eye" text rounded aria-label={t('common.view')} onClick={() => onView(c)} />}
          style={{ width: '4rem' }}
        />
      </AppDataTable>
      <AppCardFooter count={t('client.count', { count: rows.length })} />
    </>
  )
}
```

Três mudanças de comportamento, todas deliberadas: o filtro deixa de ser `globalFilter` do
PrimeReact e passa a ser aplicado antes, para que o empty state saiba **por que** está vazio; o RUT
ganha monospace como no protótipo; e `severity="secondary"` põe a tag de tipo em neutro, que hoje sai
na cor primária.

- [ ] **Step 2: Verificar build**

De `frontend/`:

```bash
pnpm lint && pnpm build
```

Esperado: falha em `CommercialPage.tsx`, que ainda não passa `actions` a `ClientsTable` — a próxima
task fecha isso. Se o build passar, `actions` foi declarado opcional sem consumidor, o que também
está correto; siga.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/commercial/components/Client/ClientsTable.tsx
git commit -m "feat(comercial): tabela de clientes na toolbar e footer do card"
```

---

## Task 7: Migrar a tabela de orçamentos para o card

**Files:**
- Modify: `frontend/src/features/commercial/components/Budget/BudgetsTable.tsx`

**Interfaces:**
- Consumes: `AppCardToolbar`, `AppCardFooter`, `AppEmptyState`.
- Produces: `BudgetsTable` passa a receber `actions?: ReactNode`.

- [ ] **Step 1: Reescrever o componente**

```tsx
// frontend/src/features/commercial/components/Budget/BudgetsTable.tsx
import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  AppDataTable, AppColumn, AppInputText, AppDropdown, AppButton, AppTag,
  AppCardToolbar, AppCardFooter, AppEmptyState,
} from '@shared/ui'
import type { BudgetData, QuoteStatus } from '@shared/types/generated'
import { clientsApi } from '@shared/api/clientsApi'
import { quoteStatusSeverity } from '../../lib/quoteStatus'
import { formatUf } from '../../lib/uf'

const STATUSES: QuoteStatus[] = ['pending', 'approved', 'rejected']

export function BudgetsTable({
  budgets, loading, actions,
}: {
  budgets: BudgetData[]
  loading: boolean
  actions?: ReactNode
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [filter, setFilter] = useState('')
  const [status, setStatus] = useState<QuoteStatus | null>(null)
  const clients = clientsApi.useList()

  const clientName = (id: number) => clients.data?.find((c) => c.id === id)?.legal_name ?? '—'

  // Busca por código OU cliente: o AppDataTable filtra só por campos da própria
  // linha, e o nome do cliente não é um deles (vem de outra query). Por isso o
  // filtro é aplicado aqui, antes de entregar as linhas à tabela.
  const term = filter.trim().toLowerCase()
  const rows = budgets.filter((b) => {
    const matchesStatus = status === null || b.status === status
    const matchesTerm =
      term === '' ||
      (b.code ?? '').toLowerCase().includes(term) ||
      clientName(b.client_id).toLowerCase().includes(term)
    return matchesStatus && matchesTerm
  })

  const statusOptions = [
    { label: t('budget.filterAll'), value: null },
    ...STATUSES.map((s) => ({ label: t(`quoteStatus.${s}`), value: s })),
  ]

  const filtering = term !== '' || status !== null

  const empty = filtering ? (
    <AppEmptyState
      icon="pi pi-search"
      // Só monta `Sin resultados para "x"` quando existe termo. Com apenas o
      // filtro de estado ativo, o termo é vazio e a frase citaria aspas em
      // branco — cai no título genérico.
      title={term === '' ? t('common.noResultsFiltered') : t('common.noResults', { term: filter.trim() })}
      description={t('common.noResultsHint')}
      action={
        <AppButton
          label={t('common.clearSearch')}
          icon="pi pi-times"
          text
          onClick={() => { setFilter(''); setStatus(null) }}
        />
      }
    />
  ) : (
    <AppEmptyState icon="pi pi-file" title={t('budget.empty')} description={t('budget.emptyHint')} action={actions} />
  )

  return (
    <>
      <AppCardToolbar
        start={
          <>
            <div className="min-w-64 flex-1">
              <AppInputText
                leftIcon="pi pi-search"
                placeholder={t('budget.searchPlaceholder')}
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              />
            </div>
            <div className="w-48">
              <AppDropdown
                value={status}
                options={statusOptions}
                onChange={(e) => setStatus(e.value as QuoteStatus | null)}
              />
            </div>
          </>
        }
        end={actions}
      />
      <AppDataTable value={rows} loading={loading} emptyMessage={empty} paginator={rows.length > 10}>
        <AppColumn
          header={t('budget.code')}
          body={(b: BudgetData) => <span className="font-mono text-sm" style={{ color: 'var(--primary-color)' }}>{b.code}</span>}
        />
        <AppColumn header={t('budget.client')} body={(b: BudgetData) => clientName(b.client_id)} />
        <AppColumn header={t('budget.quoteCount')} body={(b: BudgetData) => <span className="font-semibold">{b.quotes.length}</span>} />
        <AppColumn header={t('budget.totalValue')} body={(b: BudgetData) => `${formatUf(b.total_value_uf ?? '0')} UF`} />
        <AppColumn
          header={t('budget.status')}
          body={(b: BudgetData) =>
            b.status ? <AppTag value={t(`quoteStatus.${b.status}`)} severity={quoteStatusSeverity(b.status)} /> : null
          }
        />
        <AppColumn
          body={(b: BudgetData) => (
            <AppButton icon="pi pi-eye" text rounded aria-label={t('common.view')} onClick={() => navigate(`/comercial/presupuestos/${b.id}`)} />
          )}
          style={{ width: '4rem' }}
        />
      </AppDataTable>
      <AppCardFooter count={t('budget.count', { count: rows.length })} />
    </>
  )
}
```

O `text-sky-600` do código do orçamento vira `var(--primary-color)` — era par hardcoded contra o
ADR-16.

- [ ] **Step 2: Commit**

```bash
git add frontend/src/features/commercial/components/Budget/BudgetsTable.tsx
git commit -m "feat(comercial): tabela de orcamentos na toolbar e footer do card"
```

---

## Task 8: Compor `CommercialPage` e apagar o ternário do header

**Files:**
- Modify: `frontend/src/features/commercial/components/CommercialPage.tsx`

**Interfaces:**
- Consumes: `AppCard`, `ModulePage` sem `actions`, `ClientsTable` e `BudgetsTable` com `actions`.
- Produces: nada para tasks posteriores.

- [ ] **Step 1: Reescrever a página**

```tsx
// frontend/src/features/commercial/components/CommercialPage.tsx
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { ModulePage, ModuleTabs, ModuleTab, AppButton, AppCard } from '@shared/ui'
import { useClientsPage } from '../hooks/useClientsPage'
import { useBudgetsPage } from '../hooks/useBudgetsPage'
import { ClientsTable } from './Client/ClientsTable'
import { ClientDialog } from './Client/ClientDialog'
import { BudgetsTable } from './Budget/BudgetsTable'
import { BudgetDialog } from './Budget/BudgetDialog'

export function CommercialPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const clients = useClientsPage()
  const budgets = useBudgetsPage()
  const [tab, setTab] = useState(0)

  return (
    <ModulePage title={t('client.module')} description={t('client.moduleDescription')}>
      <AppCard>
        <ModuleTabs activeIndex={tab} onTabChange={(e) => setTab(e.index)}>
          <ModuleTab header={t('client.tabClients')}>
            <ClientsTable
              clients={clients.items}
              loading={clients.loading}
              onView={clients.openView}
              actions={<AppButton variant="brandIcon" label={t('client.new')} icon="pi pi-user-plus" onClick={clients.openCreate} />}
            />
          </ModuleTab>
          <ModuleTab header={t('budget.tab')}>
            <BudgetsTable
              budgets={budgets.items}
              loading={budgets.loading}
              actions={<AppButton variant="brandIcon" label={t('budget.new')} icon="pi pi-file" onClick={budgets.openCreate} />}
            />
          </ModuleTab>
        </ModuleTabs>
      </AppCard>

      {clients.dialog && (
        <ClientDialog
          visible
          mode={clients.dialog.mode}
          client={clients.dialog.entity}
          onHide={clients.close}
          onEdit={clients.startEdit}
        />
      )}

      {budgets.dialog && (
        <BudgetDialog
          visible
          mode={budgets.dialog.mode}
          budget={budgets.dialog.entity}
          onHide={budgets.close}
          onCreated={(created) => navigate(`/comercial/presupuestos/${created.id}`)}
        />
      )}
    </ModulePage>
  )
}
```

A constante `onBudgets` e o ternário de `actions` sumiram: cada aba carrega a própria ação, que era
a razão de existir do condicional.

- [ ] **Step 2: Verificar build**

De `frontend/`:

```bash
pnpm lint && pnpm build
```

Esperado: ambos sem erro.

- [ ] **Step 3: Provar o DoD da Parte 1 na tela**

Suba o stack e o dev server:

```bash
docker compose up -d
cd frontend && pnpm dev
```

Em http://localhost:5173/comercial, com o `OperationDemoSeeder` carregado, confirme:

1. Card único envolvendo abas, toolbar, tabela e footer.
2. Aba **Clientes**: busca à esquerda e `Nuevo cliente` à direita, na mesma linha.
3. Footer lendo `4 clientes` (o seeder cria 4).
4. Trocar para **Presupuestos**: a ação vira `Nuevo presupuesto` **sem** condicional no cabeçalho da
   página; o cabeçalho não tem botão nenhum.
5. Buscar `zzz` na aba Clientes: aparece `Sin resultados para "zzz"` com o botão
   `Limpiar búsqueda` — **não** o convite a cadastrar. Clicar limpa e a tabela volta.
6. Tabela sem zebra, com hover na linha sob o cursor.
7. Repetir 1–6 no tema escuro pelo toggle do header. Cabeçalho, card, footer e empty state precisam
   inverter junto; nada pode ficar branco no escuro.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/features/commercial/components/CommercialPage.tsx
git commit -m "feat(comercial): compoe a pagina no card e remove o ternario do header"
```

---

# Parte 2 — Operación, Cursos, Pessoas, Administración

Replicação do contrato que a Parte 1 aprovou nas quatro páginas de módulo restantes, mais as duas
correções de débito que caem junto (aba única de `Cursos`, títulos pendurados na entidade errada) e a
remoção final de `actions` do `ModulePage`.

## Decisões tomadas no gate desta parte

Três pontos que a spec deixou em aberto e o João decidiu em 2026-07-26, antes de escrever as tasks.

1. **`tone` do `AppCard` passa a ser ortogonal a `variant`, e ganha `info`.** O
   `PendingQuotesPanel` precisa de um card de alerta azul, e hoje o tom só tinge com
   `variant="stat"`, numa escala sem azul. Alternativas rejeitadas: `variant="alert"` com azul fixo
   (cria dois jeitos de tingir o mesmo card) e resolver a cor dentro da feature (põe cor de container
   na feature, contra `.claude/rules/frontend-fsliced.md`).
2. **O paginador unificado fica para a Parte 3.** A spec D6 quer contagem à esquerda e paginador à
   direita no mesmo `AppCardFooter`, mas nenhuma tabela desta parte passa de 10 linhas com o
   `OperationDemoSeeder` (4 turmas, 3 cursos, 7 redatores), então o paginador nem aparece e a
   unificação não teria prova end-to-end. O caso real está na aba Alumnos da Parte 3, onde duas
   turmas têm 12 e 15 matrículas. O slot `pagination` do `AppCardFooter` continua reservado e vazio.
3. **Executor dividido:** as Tasks 9 e 10 são `claude` (tocam o contrato compartilhado que as cinco
   telas e as Partes 3–4 consomem); as Tasks 11 a 17 vão para o `codex`. Ver `## Handoff de execução`.

Duas decisões menores, tomadas ao escrever o plano e declaradas aqui para não virarem achado de
review:

- **O slot direito da toolbar de Operación fica vazio.** O protótipo põe a contagem ali *e* no
  footer; D6 já estabeleceu que a contagem mora no footer. Repetir o mesmo número em duas faixas da
  mesma tela é a inconsistência que D6 resolveu, não um requisito. Operación também não tem ação
  primária de módulo — turma nasce de cotação aprovada, pelo card de alerta.
- **O badge de contagem do `AppCardHeader` continua neutro** (`--surface-section`), mesmo no card de
  alerta, onde o protótipo mostra um badge azul sólido. Tingir o badge exigiria uma segunda escala de
  contraste para funcionar nos dois temas; o título tingido e o fundo do card já sinalizam o alerta.

## Correção de premissa apurada ao escrever esta parte

**`PageHeader` não tem consumidor fora do `ModulePage`.** A Parte 1 escreveu que `actions` sai
"quando a Parte 2 migrar os últimos consumidores", deixando a dúvida sobre as páginas de detalhe.
`grep -rn "PageHeader" frontend/src --include=*.tsx` fora de `shared/ui/` volta **vazio**:
`BudgetDetailPage` e `TurmaDetailPage` montam o próprio cabeçalho. Logo a Task 17 pode remover
`actions` das duas assinaturas sem esperar a Parte 3.

## Verificação recorrente: paridade dos 3 locales

Cinco das nove tasks tocam os locales. Toda task que mexe em `frontend/src/shared/config/locales/`
roda **este** comando antes de commitar, de dentro dessa pasta. É o mesmo script da Task 2, Step 6,
repetido aqui para o intervalo da Parte 2 ficar autocontido:

```bash
python3 -c "
import json
def keys(o,p=''):
    out=set()
    for k,v in o.items():
        n=f'{p}.{k}' if p else k
        out.add(n)
        if isinstance(v,dict): out |= keys(v,n)
    return out
a=keys(json.load(open('es-CL.json')))
b=keys(json.load(open('pt-BR.json')))
c=keys(json.load(open('en.json')))
print('es-pt:', sorted(a^b))
print('es-en:', sorted(a^c))
"
```

Esperado sempre: `es-pt: []` e `es-en: []`. Qualquer chave listada é divergência a corrigir **antes**
de seguir — chave que existe em um locale e falta em outro rende o literal cru na tela quando o
usuário troca de idioma, e isso não aparece em `pnpm build`.

Daqui em diante as tasks chamam este bloco de **script de paridade**.

---

## Task 9: Namespace `module.*` e dedup dos títulos de módulo

Débito do backlog: o título da página mora no namespace da entidade (`client.module`,
`redator.module`), e `budget.module` duplica `client.module` sem consumidor. Os textos já estão
certos nos 3 locales — esta task move as chaves e não muda um pixel.

**Files:**
- Modify: `frontend/src/shared/config/locales/es-CL.json`
- Modify: `frontend/src/shared/config/locales/pt-BR.json`
- Modify: `frontend/src/shared/config/locales/en.json`
- Modify: `frontend/src/features/commercial/components/CommercialPage.tsx`
- Modify: `frontend/src/features/operation/components/OperationPage.tsx`
- Modify: `frontend/src/features/catalog/components/CatalogPage.tsx`
- Modify: `frontend/src/features/identity/components/PeoplePage.tsx`
- Modify: `frontend/src/features/identity/components/AdministracionPage.tsx`

**Interfaces:**
- Consumes: nada.
- Produces: as chaves `module.<slug>.title` e `module.<slug>.description`, com `<slug>` em
  `comercial | operacion | cursos | personas | administracion` — os mesmos slugs de `nav.*` e das
  rotas. As Tasks 13 a 16 leem essas chaves.

> **Por que não reaproveitar `nav.*`:** `nav.comercial` já rende `Comercial`. Reusar rótulo de
> navegação como título de página acopla dois textos que só por coincidência são iguais hoje — o dia
> em que a sidebar precisar de um rótulo curto, o título da página muda junto. O namespace `module.*`
> dedup o que o backlog reportou (título pendurado na entidade, `budget.module` órfão) sem criar esse
> acoplamento.

- [ ] **Step 1: Criar o bloco `module` em `es-CL.json`**

Insira como chave de primeiro nível, entre o fechamento de `"common"` e a abertura de `"admin"`:

```json
  "module": {
    "comercial": {
      "title": "Comercial",
      "description": "Gestión de clientes y presupuestos de capacitación"
    },
    "operacion": {
      "title": "Operación",
      "description": "Gestión de turmas y cotizaciones aprobadas"
    },
    "cursos": {
      "title": "Cursos",
      "description": "Catálogo de cursos y sus redactores habilitados."
    },
    "personas": {
      "title": "Personas",
      "description": "Registro canónico de alumnos y redactores"
    },
    "administracion": {
      "title": "Administración",
      "description": "Usuarios internos, roles y permisos"
    }
  },
```

- [ ] **Step 2: Criar o bloco `module` em `pt-BR.json`**

Mesma posição:

```json
  "module": {
    "comercial": {
      "title": "Comercial",
      "description": "Gestão de clientes e orçamentos de capacitação"
    },
    "operacion": {
      "title": "Operação",
      "description": "Gestão de turmas e cotações aprovadas"
    },
    "cursos": {
      "title": "Cursos",
      "description": "Catálogo de cursos e seus redatores habilitados."
    },
    "personas": {
      "title": "Pessoas",
      "description": "Registro canônico de alunos e redatores"
    },
    "administracion": {
      "title": "Administração",
      "description": "Usuários internos, papéis e permissões"
    }
  },
```

- [ ] **Step 3: Criar o bloco `module` em `en.json`**

Mesma posição:

```json
  "module": {
    "comercial": {
      "title": "Commercial",
      "description": "Client and training quote management"
    },
    "operacion": {
      "title": "Operations",
      "description": "Manage classes and approved quotes"
    },
    "cursos": {
      "title": "Courses",
      "description": "Course catalog and their enabled writers."
    },
    "personas": {
      "title": "People",
      "description": "Canonical registry of students and instructors"
    },
    "administracion": {
      "title": "Administration",
      "description": "Internal users, roles and permissions"
    }
  },
```

Os textos são cópia literal dos valores que já existiam. Se algum divergir, o rename deixou de ser
invisível — pare e confira.

- [ ] **Step 4: Remover as 12 chaves antigas dos 3 locales**

Em **cada um** dos 3 arquivos, apague:

| Namespace | Chaves a remover |
|---|---|
| `client` | `module`, `moduleDescription` |
| `budget` | `module`, `moduleDescription` (já eram órfãs — nenhum componente as lia) |
| `course` | `module`, `moduleDescription` |
| `redator` | `module`, `moduleDescription` |
| `admin` | `module`, `moduleDescription` |
| `operation` | `title`, `subtitle` (chaves de primeiro nível de `operation`, não de `operation.table`) |

Cuide da vírgula da linha anterior quando a chave removida for a última do objeto.

- [ ] **Step 5: Apontar os 5 consumidores para as chaves novas**

Em `frontend/src/features/commercial/components/CommercialPage.tsx`, linha 20:

```tsx
    <ModulePage title={t('module.comercial.title')} description={t('module.comercial.description')}>
```

Em `frontend/src/features/operation/components/OperationPage.tsx`, linha 20:

```tsx
    <ModulePage title={t('module.operacion.title')} description={t('module.operacion.description')}>
```

Em `frontend/src/features/catalog/components/CatalogPage.tsx`, linhas 13-14:

```tsx
      title={t('module.cursos.title')}
      description={t('module.cursos.description')}
```

Em `frontend/src/features/identity/components/PeoplePage.tsx`, linhas 13-14:

```tsx
      title={t('module.personas.title')}
      description={t('module.personas.description')}
```

Em `frontend/src/features/identity/components/AdministracionPage.tsx`, linhas 24-25:

```tsx
      title={t('module.administracion.title')}
      description={t('module.administracion.description')}
```

- [ ] **Step 6: Provar que nenhuma chave antiga sobrou**

De `frontend/`:

```bash
grep -rn "\.module'\|\.moduleDescription'\|operation\.title'\|operation\.subtitle'" src --include=*.tsx --include=*.ts
```

Esperado: **uma única linha**, `src/app/pages/ModulePlaceholder.tsx` com `t('placeholder.module')` —
namespace diferente, não faz parte deste rename. Qualquer outra ocorrência é consumidor esquecido.

```bash
grep -rn '"module"\|"moduleDescription"' src/shared/config/locales
```

Esperado: 3 linhas, uma por locale, todas o `"module": {` recém-criado. Nenhuma
`"moduleDescription"`.

- [ ] **Step 7: Verificar a paridade dos 3 locales**

Rode o **script de paridade** (bloco `## Verificação recorrente` acima) de
`frontend/src/shared/config/locales/`. Esperado: `es-pt: []` e `es-en: []`.

Esta task remove 12 chaves e adiciona 10 em cada arquivo — é a task da parte com maior risco de
esquecer uma linha num locale só.

- [ ] **Step 8: Verificar build**

De `frontend/`:

```bash
pnpm lint && pnpm build
```

Esperado: ambos sem erro.

- [ ] **Step 9: Provar na tela que nada mudou**

`pnpm dev`, e nas 5 rotas — `/comercial`, `/operacion`, `/cursos`, `/personas`, `/administracion` —
o título e a descrição do cabeçalho têm de estar **idênticos** ao que estavam. Chave faltando rende o
literal `module.cursos.title` na tela; é assim que um erro aparece aqui. Trocar o idioma pelo seletor
do header confirma os 3 locales.

- [ ] **Step 10: Commit**

```bash
git add frontend/src/shared/config/locales frontend/src/features/commercial/components/CommercialPage.tsx frontend/src/features/operation/components/OperationPage.tsx frontend/src/features/catalog/components/CatalogPage.tsx frontend/src/features/identity/components/PeoplePage.tsx frontend/src/features/identity/components/AdministracionPage.tsx
git commit -m "refactor(i18n): namespace module.* e dedup dos titulos de modulo"
```

---

## Task 10: `AppCard` — `tone` ortogonal a `variant`, com tom `info`

**Files:**
- Modify: `frontend/src/shared/ui/AppCard/AppCard.tsx`

**Interfaces:**
- Consumes: nada.
- Produces: `AppCardTone` passa a ser `'neutral' | 'info' | 'success' | 'danger'`. O tom tinge fundo
  e borda em **qualquer** `variant`; a cor do texto do container segue o tom só em `variant="stat"`.
  `AppCard` publica a variável CSS `--app-card-tone-text` aos descendentes, e `AppCardHeader` passa a
  usá-la no título. A Task 11 consome `<AppCard tone="info">`; a Parte 3 consome
  `variant="stat"` com `neutral`/`success`/`danger`.

- [ ] **Step 1: Reescrever o corpo do `AppCard` e o título do `AppCardHeader`**

Só as três primeiras exportações do arquivo mudam. `AppCardToolbar`, `AppCardFooter` e todos os tipos
de props seguem exatamente como estão.

Substitua o trecho que vai de `export type AppCardVariant` até o fim de `AppCardHeader` por:

```tsx
export type AppCardVariant = 'default' | 'stat'
export type AppCardTone = 'neutral' | 'info' | 'success' | 'danger'

export interface AppCardProps {
  variant?: AppCardVariant
  /** Tinge fundo e borda em qualquer variante. Em `variant="stat"` tinge
   * também o texto — lá o número É o sinal semântico. */
  tone?: AppCardTone
  className?: string
  children: ReactNode
}

/** Hue por tom. Os palette vars do Lara NÃO invertem entre temas, então o fundo
 * tingido é composto com --surface-card (que inverte) via color-mix. */
const TONE_HUE: Record<AppCardTone, string | null> = {
  neutral: null,
  info: 'var(--blue-500)',
  success: 'var(--green-500)',
  danger: 'var(--red-500)',
}

const TONE_TEXT: Record<AppCardTone, string> = {
  neutral: 'var(--text-color)',
  info: 'color-mix(in srgb, var(--blue-500) 70%, var(--text-color))',
  success: 'color-mix(in srgb, var(--green-500) 70%, var(--text-color))',
  danger: 'color-mix(in srgb, var(--red-500) 70%, var(--text-color))',
}

/**
 * Container de conteúdo. Apresentacional puro — não conhece feature nem rota.
 * Compõe-se com AppCardHeader/AppCardToolbar/AppCardFooter; nenhum deles é
 * obrigatório, e a ordem é responsabilidade de quem compõe.
 *
 * `tone` e `variant` são ortogonais: o tom escolhe a cor, a variante escolhe a
 * forma. Um card de alerta é `tone="info"` sem variante; um card de estatística
 * é `variant="stat"` com o tom que o número pedir.
 *
 * Publica `--app-card-tone-text` aos descendentes para que os subcomponentes
 * acompanhem o tom sem recebê-lo por prop.
 */
export function AppCard({ variant = 'default', tone = 'neutral', className, children }: AppCardProps) {
  const hue = TONE_HUE[tone]

  const style: CSSProperties = {
    background: hue ? `color-mix(in srgb, ${hue} 8%, var(--surface-card))` : 'var(--surface-card)',
    borderColor: hue ? `color-mix(in srgb, ${hue} 35%, var(--surface-border))` : 'var(--surface-border)',
    // O texto do container só segue o tom em `stat`: numa lista ou tabela,
    // tingir todo o corpo derruba o contraste em vez de sinalizar.
    color: variant === 'stat' ? TONE_TEXT[tone] : 'var(--text-color)',
    ['--app-card-tone-text' as string]: TONE_TEXT[tone],
  }

  return (
    <div
      className={['rounded-lg border overflow-hidden', variant === 'stat' ? 'px-5 py-4' : '', className].filter(Boolean).join(' ')}
      style={style}
    >
      {children}
    </div>
  )
}

export interface AppCardHeaderProps {
  title: ReactNode
  /** Badge de contagem à direita do título. */
  count?: number
  /** Ação secundária, alinhada à direita. */
  actions?: ReactNode
}

/** Cabeçalho de card: título (+ badge de contagem) à esquerda, ação à direita.
 * O título acompanha o tom do card pela var publicada pelo `AppCard`; o badge
 * fica neutro de propósito, para não precisar de uma segunda escala de
 * contraste por tom nos dois temas. */
export function AppCardHeader({ title, count, actions }: AppCardHeaderProps) {
  return (
    <div
      className="flex items-center justify-between gap-3 border-b px-4 py-3"
      style={{ borderColor: 'var(--surface-border)' }}
    >
      <div className="flex items-center gap-2">
        <h3
          className="text-base font-semibold"
          style={{ color: 'var(--app-card-tone-text, var(--text-color))' }}
        >
          {title}
        </h3>
        {count !== undefined && (
          <span
            className="rounded-full px-2 py-0.5 text-xs font-semibold"
            style={{ background: 'var(--surface-section)', color: 'var(--text-color-secondary)' }}
          >
            {count}
          </span>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  )
}
```

- [ ] **Step 2: Verificar build**

De `frontend/`:

```bash
pnpm lint && pnpm build
```

Esperado: ambos sem erro. `AppCardTone` ganhou um membro, o que é aditivo — nenhum consumidor atual
quebra.

- [ ] **Step 3: Provar que Comercial não regrediu**

`pnpm dev`, http://localhost:5173/comercial. O card de Comercial usa `tone` default (`neutral`, hue
`null`), então fundo e borda têm de continuar exatamente `--surface-card` e `--surface-border`. Se o
card ficou tingido, o `TONE_HUE.neutral` deixou de ser `null`. Conferir nos dois temas.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/shared/ui/AppCard
git commit -m "feat(ui): tone ortogonal a variant no AppCard e tom info"
```

---

## Task 11: `PendingQuotesPanel` vira card de alerta

**Files:**
- Modify: `frontend/src/features/operation/components/Turma/PendingQuotesPanel.tsx`

**Interfaces:**
- Consumes: `AppCard` com `tone="info"` e `AppCardHeader` da Task 10.
- Produces: nada — a assinatura `{ items: PendingQuoteData[] }` não muda.

- [ ] **Step 1: Reescrever o componente**

```tsx
// frontend/src/features/operation/components/Turma/PendingQuotesPanel.tsx
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { AppButton, AppCard, AppCardHeader } from '@shared/ui'
import type { PendingQuoteData } from '@shared/types/generated'

export function PendingQuotesPanel({ items }: { items: PendingQuoteData[] }) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  if (items.length === 0) return null

  return (
    <AppCard tone="info">
      <AppCardHeader title={t('operation.pending.title')} count={items.length} />
      <ul>
        {items.map((q) => (
          <li
            key={q.quote_id}
            className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 last:border-b-0"
            style={{ borderColor: 'var(--surface-border)' }}
          >
            <span className="text-sm" style={{ color: 'var(--text-color)' }}>
              <i className="pi pi-file mr-2" style={{ color: 'var(--text-color-secondary)' }} aria-hidden="true" />
              <strong>{q.client_name}</strong> · {q.course_name} ·{' '}
              <span style={{ color: 'var(--text-color-secondary)' }}>
                {t('operation.pending.students', { count: q.student_count })}
              </span>
            </span>
            <AppButton
              variant="brandIcon"
              label={t('operation.pending.configure')}
              icon="pi pi-cog"
              onClick={() => navigate(`/operacion/turmas/nueva/${q.quote_id}`)}
            />
          </li>
        ))}
      </ul>
    </AppCard>
  )
}
```

Sai daqui todo par Tailwind de cor hardcoded que violava o ADR-16: `border-sky-200 bg-sky-50
dark:border-sky-900 dark:bg-sky-950/30` no container, `text-sky-800 dark:text-sky-200` no título,
`bg-sky-600 text-white` no badge, `divide-sky-100 dark:divide-sky-900` nos separadores,
`text-sky-600` no ícone e `text-slate-500` na contagem de alunos.

- [ ] **Step 2: Verificar build**

De `frontend/`:

```bash
pnpm lint && pnpm build
```

Esperado: ambos sem erro.

- [ ] **Step 3: Provar na tela**

`pnpm dev`, http://localhost:5173/operacion, logado como usuário com `operation.turma.create` (o
painel não renderiza sem a permissão). Com o `OperationDemoSeeder` carregado tem de aparecer, acima
da tabela: card com fundo e borda **azulados**, título `Cotizaciones aprobadas pendientes de
configuración` em azul com badge de contagem neutro ao lado, e uma linha por cotação com o botão
`Configurar turma` à direita. Repetir no tema escuro pelo toggle do header — o fundo azulado tem de
escurecer junto com o card, não virar uma faixa clara.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/features/operation/components/Turma/PendingQuotesPanel.tsx
git commit -m "feat(operacion): painel de cotizaciones pendentes como AppCard de alerta"
```

---

## Task 12: `TurmasTable` na toolbar e no footer do card

**Files:**
- Modify: `frontend/src/features/operation/lib/turmaStatus.ts`
- Modify: `frontend/src/features/operation/components/Turma/TurmasTable.tsx`
- Modify: `frontend/src/shared/config/locales/es-CL.json`
- Modify: `frontend/src/shared/config/locales/pt-BR.json`
- Modify: `frontend/src/shared/config/locales/en.json`

**Interfaces:**
- Consumes: `AppCardToolbar`, `AppCardFooter`, `AppEmptyState` (Parte 1).
- Produces: `turmaModalidadeTagProps(modalidade)` em `operation/lib/turmaStatus.ts`, devolvendo
  `{ severity: 'secondary' } | { tone: 'accent' }` para espalhar em `<AppTag>`. `TurmasTable` mantém
  a assinatura `{ turmas, loading }` — Operación não tem ação primária de módulo, então não ganha
  `actions`.

- [ ] **Step 1: Adicionar o mapeamento de modalidade ao lib da feature**

Primeiro, na **linha 1** de `frontend/src/features/operation/lib/turmaStatus.ts`, acrescente
`TurmaModalidade` ao import que já existe — não crie um segundo import, e não ponha import no fim do
arquivo (`import/first` do eslint reprova):

```ts
import type { TurmaData, TurmaModalidade } from '@shared/types/generated'
```

Depois anexe a função ao **fim** do arquivo, abaixo de `turmaStatusSeverity`:

```ts
/** Props de tom do `AppTag` para a modalidade. Modalidade **não é severidade**
 * (spec D7): `presencial` usa o neutro do PrimeReact e `online` usa o tom
 * `accent`, que não tem `severity` equivalente. Espalhe no AppTag:
 * `<AppTag {...turmaModalidadeTagProps(m)} />`. */
export function turmaModalidadeTagProps(
  modalidade: TurmaModalidade,
): { severity: 'secondary' } | { tone: 'accent' } {
  return modalidade === 'online' ? { tone: 'accent' } : { severity: 'secondary' }
}
```

- [ ] **Step 2: Adicionar `operation.table.emptyHint` nos 3 locales**

Dentro de `operation.table`, ao lado de `"empty"`:

`es-CL.json`: `"emptyHint": "Las turmas se crean desde una cotización aprobada."`
`pt-BR.json`: `"emptyHint": "As turmas são criadas a partir de uma cotação aprovada."`
`en.json`: `"emptyHint": "Classes are created from an approved quote."`

O vazio de Operación **não** oferece ação: não existe botão de criar turma, ela nasce da cotação
aprovada. Por isso a dica explica o caminho em vez de convidar a cadastrar.

- [ ] **Step 3: Reescrever a tabela**

```tsx
// frontend/src/features/operation/components/Turma/TurmasTable.tsx
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  AppDataTable, AppColumn, AppInputText, AppDropdown, AppButton, AppTag,
  AppCardToolbar, AppCardFooter, AppEmptyState,
} from '@shared/ui'
import type { TurmaData } from '@shared/types/generated'
import {
  turmaDisplayStatus, turmaStatusSeverity, turmaModalidadeTagProps, type TurmaDisplayStatus,
} from '../../lib/turmaStatus'

const STATUSES: TurmaDisplayStatus[] = ['em_andamento', 'habilitada', 'concluida']

export function TurmasTable({ turmas, loading }: { turmas: TurmaData[]; loading: boolean }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [filter, setFilter] = useState('')
  const [status, setStatus] = useState<TurmaDisplayStatus | null>(null)
  const [first, setFirst] = useState(0)

  const term = filter.trim().toLowerCase()
  const rows = turmas.filter((turma) => {
    const matchesStatus = status === null || turmaDisplayStatus(turma) === status
    const matchesTerm =
      term === '' ||
      (turma.course_name ?? '').toLowerCase().includes(term) ||
      (turma.client_name ?? '').toLowerCase().includes(term) ||
      (turma.quote_code ?? '').toLowerCase().includes(term) ||
      (turma.budget_code ?? '').toLowerCase().includes(term)
    return matchesStatus && matchesTerm
  })

  const statusOptions = [
    { label: t('operation.table.filterAll'), value: null },
    ...STATUSES.map((s) => ({ label: t(`operation.status.${s}`), value: s })),
  ]

  const filtering = term !== '' || status !== null

  const empty = filtering ? (
    <AppEmptyState
      icon="pi pi-search"
      // Só cita o termo entre aspas quando existe termo; com apenas o filtro de
      // estado ativo a frase citaria aspas em branco.
      title={term === '' ? t('common.noResultsFiltered') : t('common.noResults', { term: filter.trim() })}
      description={t('common.noResultsHint')}
      action={
        <AppButton
          label={t('common.clearSearch')}
          icon="pi pi-times"
          text
          onClick={() => { setFilter(''); setStatus(null); setFirst(0) }}
        />
      }
    />
  ) : (
    // Sem ação: turma não se cria por botão, nasce de cotação aprovada.
    <AppEmptyState icon="pi pi-calendar" title={t('operation.table.empty')} description={t('operation.table.emptyHint')} />
  )

  return (
    <>
      <AppCardToolbar
        start={
          <>
            <div className="min-w-64 flex-1">
              <AppInputText
                leftIcon="pi pi-search"
                placeholder={t('operation.table.search')}
                value={filter}
                onChange={(e) => { setFilter(e.target.value); setFirst(0) }}
              />
            </div>
            <div className="w-48">
              <AppDropdown
                value={status}
                options={statusOptions}
                onChange={(e) => { setStatus(e.value as TurmaDisplayStatus | null); setFirst(0) }}
              />
            </div>
          </>
        }
      />
      <AppDataTable
        value={rows}
        loading={loading}
        emptyMessage={loading ? undefined : empty}
        paginator={rows.length > 10}
        first={first}
        onPage={(e) => setFirst(e.first)}
      >
        <AppColumn
          header={t('operation.table.code')}
          body={(turma: TurmaData) => (
            <span className="font-mono text-sm" style={{ color: 'var(--primary-color)' }}>
              {turma.quote_code ?? '—'}
            </span>
          )}
        />
        <AppColumn header={t('operation.table.course')} body={(turma: TurmaData) => turma.course_name ?? '—'} />
        <AppColumn header={t('operation.table.client')} body={(turma: TurmaData) => turma.client_name ?? '—'} />
        <AppColumn
          header={t('operation.table.modality')}
          body={(turma: TurmaData) => (
            <AppTag
              value={t(`operation.modality.${turma.modalidade}`)}
              {...turmaModalidadeTagProps(turma.modalidade)}
            />
          )}
        />
        <AppColumn
          header={t('operation.table.redator')}
          body={(turma: TurmaData) =>
            turma.redatores.length > 0 ? turma.redatores.map((r) => r.name).join(', ') : (
              <span style={{ color: 'var(--text-color-secondary)' }}>{t('operation.table.noRedator')}</span>
            )
          }
        />
        <AppColumn
          header={t('operation.table.students')}
          body={(turma: TurmaData) => <span className="font-semibold">{turma.enrolled_count ?? 0}</span>}
        />
        <AppColumn
          header={t('operation.table.status')}
          body={(turma: TurmaData) => {
            const s = turmaDisplayStatus(turma)
            return <AppTag value={t(`operation.status.${s}`)} severity={turmaStatusSeverity(s)} />
          }}
        />
        <AppColumn
          body={(turma: TurmaData) => (
            <AppButton
              icon="pi pi-eye"
              text
              rounded
              aria-label={t('common.view')}
              onClick={() => navigate(`/operacion/turmas/${turma.id}`)}
            />
          )}
          style={{ width: '4rem' }}
        />
      </AppDataTable>
      <AppCardFooter count={t('operation.table.count', { count: rows.length })} />
    </>
  )
}
```

Quatro mudanças de comportamento, todas deliberadas: `text-sky-600` do código vira
`var(--primary-color)` (D8, ADR-16); `text-slate-400` do `— Sin asignar` vira
`--text-color-secondary`; a modalidade ganha tom (`Presencial` neutro, `Online` roxo, D7); e a coluna
`ALUMNOS` fica em negrito, como as demais colunas numéricas do protótipo.

- [ ] **Step 4: Verificar paridade dos locales e build**

Rode o **script de paridade** de `frontend/src/shared/config/locales/`. Esperado: `es-pt: []` e
`es-en: []`.

De `frontend/`:

```bash
pnpm lint && pnpm build
```

Esperado: ambos sem erro. A tabela ainda não está dentro de um `AppCard` — a Task 13 fecha isso —
então a tela fica visualmente estranha neste commit. É esperado.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/operation/lib/turmaStatus.ts frontend/src/features/operation/components/Turma/TurmasTable.tsx frontend/src/shared/config/locales
git commit -m "feat(operacion): tabela de turmas na toolbar e footer do card"
```

---

## Task 13: Compor `OperationPage`

**Files:**
- Modify: `frontend/src/features/operation/components/OperationPage.tsx`

**Interfaces:**
- Consumes: `AppCard` (Task 10), `PendingQuotesPanel` (Task 11), `TurmasTable` (Task 12).
- Produces: nada para tasks posteriores.

- [ ] **Step 1: Reescrever a página**

```tsx
// frontend/src/features/operation/components/OperationPage.tsx
import { useTranslation } from 'react-i18next'
import { ModulePage, AppCard } from '@shared/ui'
import { usePermissions } from '@shared/hooks'
import { useTurmas, usePendingQuotes } from '../api/useTurmas'
import { PendingQuotesPanel } from './Turma/PendingQuotesPanel'
import { TurmasTable } from './Turma/TurmasTable'

export function OperationPage() {
  // `usePendingQuotes` dispara sempre; sem `operation.turma.create` o backend
  // responde 403 e o painel simplesmente não é renderizado (o `can()` é RBAC de
  // UI — a API é a fronteira). Query condicional por permissão quebraria a regra
  // de hooks; guarda-se no render.
  const { t } = useTranslation()
  const { can } = usePermissions()
  const turmas = useTurmas()
  const pending = usePendingQuotes()
  const canCreate = can('operation.turma.create')

  return (
    <ModulePage title={t('module.operacion.title')} description={t('module.operacion.description')}>
      <div className="space-y-6">
        {canCreate && <PendingQuotesPanel items={pending.data ?? []} />}
        <AppCard>
          <TurmasTable turmas={turmas.data ?? []} loading={turmas.isLoading} />
        </AppCard>
      </div>
    </ModulePage>
  )
}
```

Operación não tem abas: a tabela vai direto no card, e o card de alerta fica acima, separado pelo
`space-y-6` que já existia.

- [ ] **Step 2: Verificar build**

De `frontend/`:

```bash
pnpm lint && pnpm build
```

Esperado: ambos sem erro.

- [ ] **Step 3: Provar na tela**

`pnpm dev`, http://localhost:5173/operacion, com o `OperationDemoSeeder` carregado:

1. Card de alerta azul no topo (com a permissão `operation.turma.create`), card branco/escuro abaixo.
2. Dentro do card principal: busca e filtro `Todos` à esquerda na toolbar, **nada** à direita.
3. Tabela com as 4 turmas; cabeçalho em caixa alta esmaecido; hover na linha sob o cursor; sem zebra.
4. Coluna `CÓDIGO` em monospace na cor primária do tema — abrir o inspetor e confirmar que o
   `color` computado vem de `var(--primary-color)`, **não** de `text-sky-600`.
5. Coluna `MODALIDAD`: `Presencial` em cinza neutro, `Online` em roxo.
6. Turma sem redator mostrando `— Sin asignar` esmaecido, não em branco.
7. Footer lendo `4 turmas`.
8. Buscar `zzz`: `Sin resultados para "zzz"` com `Limpiar búsqueda`, **sem** dica de criar turma.
   Filtrar só por estado `Concluida` e limpar a busca: título genérico `Sin resultados para los
   filtros aplicados`.
9. Repetir 1–8 no tema escuro. O card de alerta, o card principal, o footer e o empty state precisam
   inverter juntos.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/features/operation/components/OperationPage.tsx
git commit -m "feat(operacion): compoe a pagina no card"
```

---

## Task 14: Cursos — tabela no card e fim da aba única

**Files:**
- Modify: `frontend/src/features/catalog/components/Course/CoursesTable.tsx`
- Modify: `frontend/src/features/catalog/components/CatalogPage.tsx`
- Modify: `frontend/src/shared/config/locales/es-CL.json`
- Modify: `frontend/src/shared/config/locales/pt-BR.json`
- Modify: `frontend/src/shared/config/locales/en.json`

**Interfaces:**
- Consumes: `AppCard`, `AppCardToolbar`, `AppCardFooter`, `AppEmptyState`.
- Produces: `CoursesTable` passa a receber `actions?: ReactNode`.

- [ ] **Step 1: Adicionar `course.emptyHint` nos 3 locales**

Dentro de `course`, ao lado de `"empty"`:

`es-CL.json`: `"emptyHint": "Crea el primer curso para comenzar."`
`pt-BR.json`: `"emptyHint": "Crie o primeiro curso para começar."`
`en.json`: `"emptyHint": "Create the first course to get started."`

- [ ] **Step 2: Reescrever a tabela**

```tsx
// frontend/src/features/catalog/components/Course/CoursesTable.tsx
import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AppDataTable, AppColumn, AppInputText, AppButton, AppCardToolbar, AppCardFooter, AppEmptyState,
} from '@shared/ui'
import type { CourseData } from '@shared/types/generated'

export function CoursesTable({
  courses, loading, onView, actions,
}: {
  courses: CourseData[]
  loading: boolean
  onView: (c: CourseData) => void
  actions?: ReactNode
}) {
  const { t } = useTranslation()
  const [filter, setFilter] = useState('')
  const [first, setFirst] = useState(0)

  const term = filter.trim().toLowerCase()
  const rows = term === ''
    ? courses
    : courses.filter(
        (c) =>
          c.name.toLowerCase().includes(term) ||
          (c.technical_name ?? '').toLowerCase().includes(term),
      )

  const handleFilterChange = (value: string) => {
    setFilter(value)
    setFirst(0)
  }

  const empty = term === '' ? (
    <AppEmptyState icon="pi pi-book" title={t('course.empty')} description={t('course.emptyHint')} action={actions} />
  ) : (
    <AppEmptyState
      icon="pi pi-search"
      title={t('common.noResults', { term: filter.trim() })}
      description={t('common.noResultsHint')}
      action={<AppButton label={t('common.clearSearch')} icon="pi pi-times" text onClick={() => handleFilterChange('')} />}
    />
  )

  return (
    <>
      <AppCardToolbar
        start={
          <div className="min-w-64 flex-1">
            <AppInputText
              leftIcon="pi pi-search"
              placeholder={t('course.searchPlaceholder')}
              value={filter}
              onChange={(e) => handleFilterChange(e.target.value)}
            />
          </div>
        }
        end={actions}
      />
      <AppDataTable
        value={rows}
        loading={loading}
        emptyMessage={loading ? undefined : empty}
        paginator={rows.length > 10}
        first={first}
        onPage={(e) => setFirst(e.first)}
      >
        <AppColumn field="name" header={t('course.name')} sortable />
        <AppColumn header={t('course.technicalName')} body={(c: CourseData) => c.technical_name ?? '—'} />
        <AppColumn
          header={t('course.workloadHours')}
          body={(c: CourseData) => <span className="font-semibold">{c.workload_hours}</span>}
        />
        <AppColumn
          header={t('course.redatorCount')}
          body={(c: CourseData) => <span className="font-semibold">{c.redator_ids.length}</span>}
        />
        <AppColumn
          body={(c: CourseData) => <AppButton icon="pi pi-eye" text rounded aria-label={t('common.view')} onClick={() => onView(c)} />}
          style={{ width: '4rem' }}
        />
      </AppDataTable>
      <AppCardFooter count={t('course.count', { count: rows.length })} />
    </>
  )
}
```

O `globalFilter` do PrimeReact sai e o filtro passa a ser aplicado antes, para o empty state saber
**por que** está vazio. O botão do olho ganha `aria-label`, que faltava.

- [ ] **Step 3: Reescrever a página, sem `ModuleTabs`**

```tsx
// frontend/src/features/catalog/components/CatalogPage.tsx
import { useTranslation } from 'react-i18next'
import { ModulePage, AppButton, AppCard } from '@shared/ui'
import { useCoursesPage } from '../hooks/useCoursesPage'
import { CoursesTable } from './Course/CoursesTable'
import { CourseDialog } from './Course/CourseDialog'

export function CatalogPage() {
  const { t } = useTranslation()
  const page = useCoursesPage()

  return (
    <ModulePage title={t('module.cursos.title')} description={t('module.cursos.description')}>
      <AppCard>
        <CoursesTable
          courses={page.items}
          loading={page.loading}
          onView={page.openView}
          actions={<AppButton variant="brandIcon" label={t('course.new')} icon="pi pi-plus" onClick={page.openCreate} />}
        />
      </AppCard>

      {page.dialog && (
        <CourseDialog
          visible
          mode={page.dialog.mode}
          course={page.dialog.entity}
          onHide={page.close}
          onEdit={page.startEdit}
        />
      )}
    </ModulePage>
  )
}
```

Fecha o débito do backlog: `ModuleTabs` com uma aba só contrariava o contrato do próprio
`ModulePage` ("uma entidade: passe a tabela direto em `children`"). A chave `course.tabCourses`
deixa de ter consumidor mas **fica nos locales** — a Task 16 é a última a mexer em i18n, e remover
chave órfã de uma entidade não é escopo desta parte.

- [ ] **Step 4: Verificar paridade dos locales e build**

Rode o **script de paridade** de `frontend/src/shared/config/locales/`. Esperado: `es-pt: []` e
`es-en: []`.

De `frontend/`:

```bash
pnpm lint && pnpm build
```

Esperado: ambos sem erro.

- [ ] **Step 5: Provar na tela**

`pnpm dev`, http://localhost:5173/cursos:

1. **Nenhuma aba.** Card único com toolbar, tabela e footer.
2. Busca à esquerda, `Nuevo curso` à direita, mesma linha.
3. Cabeçalho da página sem botão nenhum.
4. Footer lendo `3 curso(s)` (o seeder cria 3).
5. Buscar `zzz`: empty de busca com `Limpiar búsqueda`, não convite a cadastrar.
6. Repetir nos dois temas.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/features/catalog/components frontend/src/shared/config/locales
git commit -m "feat(cursos): tabela no card e remove a aba unica"
```

---

## Task 15: Pessoas — tabela no card e aba Alunos com empty state

**Files:**
- Modify: `frontend/src/features/identity/components/Redator/RedatoresTable.tsx`
- Modify: `frontend/src/features/identity/components/PeoplePage.tsx`
- Modify: `frontend/src/shared/config/locales/es-CL.json`
- Modify: `frontend/src/shared/config/locales/pt-BR.json`
- Modify: `frontend/src/shared/config/locales/en.json`

**Interfaces:**
- Consumes: `AppCard`, `AppCardToolbar`, `AppCardFooter`, `AppEmptyState`.
- Produces: `RedatoresTable` passa a receber `actions?: ReactNode`.

- [ ] **Step 1: Adicionar `redator.emptyHint` nos 3 locales**

Dentro de `redator`, ao lado de `"empty"`:

`es-CL.json`: `"emptyHint": "Registra el primer redactor para comenzar."`
`pt-BR.json`: `"emptyHint": "Cadastre o primeiro redator para começar."`
`en.json`: `"emptyHint": "Register the first instructor to get started."`

- [ ] **Step 2: Reescrever a tabela**

```tsx
// frontend/src/features/identity/components/Redator/RedatoresTable.tsx
import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AppDataTable, AppColumn, AppTag, AppInputText, AppButton,
  AppCardToolbar, AppCardFooter, AppEmptyState,
} from '@shared/ui'
import type { RedatorData } from '@shared/types/generated'
import { idoneidade } from '../../lib/redatorStatus'

const IDON_SEVERITY = { idoneo: 'success', por_vencer: 'warning', no_idoneo: 'danger' } as const

export function RedatoresTable({
  redatores, loading, onView, actions,
}: {
  redatores: RedatorData[]
  loading: boolean
  onView: (r: RedatorData) => void
  actions?: ReactNode
}) {
  const { t } = useTranslation()
  const [filter, setFilter] = useState('')
  const [first, setFirst] = useState(0)

  const term = filter.trim().toLowerCase()
  const rows = term === ''
    ? redatores
    : redatores.filter(
        (r) => r.name.toLowerCase().includes(term) || r.rut.toLowerCase().includes(term),
      )

  const handleFilterChange = (value: string) => {
    setFilter(value)
    setFirst(0)
  }

  const empty = term === '' ? (
    <AppEmptyState icon="pi pi-users" title={t('redator.empty')} description={t('redator.emptyHint')} action={actions} />
  ) : (
    <AppEmptyState
      icon="pi pi-search"
      title={t('common.noResults', { term: filter.trim() })}
      description={t('common.noResultsHint')}
      action={<AppButton label={t('common.clearSearch')} icon="pi pi-times" text onClick={() => handleFilterChange('')} />}
    />
  )

  return (
    <>
      <AppCardToolbar
        start={
          <div className="min-w-64 flex-1">
            <AppInputText
              leftIcon="pi pi-search"
              placeholder={t('redator.searchPlaceholder')}
              value={filter}
              onChange={(e) => handleFilterChange(e.target.value)}
            />
          </div>
        }
        end={actions}
      />
      <AppDataTable
        value={rows}
        loading={loading}
        emptyMessage={loading ? undefined : empty}
        paginator={rows.length > 10}
        first={first}
        onPage={(e) => setFirst(e.first)}
      >
        <AppColumn
          field="name"
          header={t('redator.name')}
          sortable
          body={(r: RedatorData) => (
            <div>
              <p className="font-medium">{r.name}</p>
              <p className="text-xs" style={{ color: 'var(--text-color-secondary)' }}>{r.email}</p>
            </div>
          )}
        />
        <AppColumn
          header={t('common.rut')}
          body={(r: RedatorData) => <span className="font-mono text-sm">{r.rut}</span>}
        />
        <AppColumn
          header={t('redator.enabledCourses')}
          body={(r: RedatorData) => <span className="font-semibold">{r.course_ids.length}</span>}
        />
        <AppColumn
          header={t('redator.suitability')}
          body={(r: RedatorData) => {
            const k = idoneidade(r)
            return <AppTag value={t(`suitability.${k}`)} severity={IDON_SEVERITY[k]} />
          }}
        />
        <AppColumn
          body={(r: RedatorData) => <AppButton icon="pi pi-eye" text rounded aria-label={t('common.view')} onClick={() => onView(r)} />}
          style={{ width: '4rem' }}
        />
      </AppDataTable>
      <AppCardFooter count={t('redator.count', { count: rows.length })} />
    </>
  )
}
```

O RUT ganha monospace, como em Comercial; o e-mail sob o nome troca `text-slate-500` por variável do
tema; o botão do olho ganha `aria-label`.

- [ ] **Step 3: Reescrever a página**

```tsx
// frontend/src/features/identity/components/PeoplePage.tsx
import { useTranslation } from 'react-i18next'
import { ModulePage, ModuleTabs, ModuleTab, AppButton, AppCard, AppEmptyState } from '@shared/ui'
import { useRedatoresPage } from '../hooks/useRedatoresPage'
import { RedatoresTable } from './Redator/RedatoresTable'
import { RedatorDialog } from './Redator/RedatorDialog'

export function PeoplePage() {
  const { t } = useTranslation()
  const page = useRedatoresPage()

  return (
    <ModulePage title={t('module.personas.title')} description={t('module.personas.description')}>
      <AppCard>
        <ModuleTabs>
          <ModuleTab header={t('redator.tabRedatores')}>
            <RedatoresTable
              redatores={page.items}
              loading={page.loading}
              onView={page.openView}
              actions={<AppButton variant="brandIcon" label={t('redator.new')} icon="pi pi-user-plus" onClick={page.openCreate} />}
            />
          </ModuleTab>

          <ModuleTab header={t('redator.tabStudents')}>
            {/* Módulo de alunos é backlog item 2 (não existe endpoint). Aqui só
                deixa de ser um <p> solto e passa a usar o empty state padrão. */}
            <AppEmptyState
              icon="pi pi-user"
              title={t('redator.tabStudents')}
              description={t('redator.studentsPlaceholder')}
            />
          </ModuleTab>
        </ModuleTabs>
      </AppCard>

      {page.dialog && (
        <RedatorDialog
          visible
          mode={page.dialog.mode}
          redator={page.dialog.entity}
          onHide={page.close}
          onEdit={page.startEdit}
        />
      )}
    </ModulePage>
  )
}
```

Corrige um bug de tabela junto: hoje `Nuevo redactor` fica no cabeçalho da página e aparece **também
quando a aba Alumnos está ativa**, oferecendo uma ação que não pertence àquela aba. Com a ação dentro
da toolbar de `RedatoresTable`, ela some junto com a aba.

- [ ] **Step 4: Verificar paridade dos locales e build**

Rode o **script de paridade** de `frontend/src/shared/config/locales/`. Esperado: `es-pt: []` e `es-en: []`.

De `frontend/`:

```bash
pnpm lint && pnpm build
```

Esperado: ambos sem erro.

- [ ] **Step 5: Provar na tela**

`pnpm dev`, http://localhost:5173/personas:

1. Card único envolvendo as duas abas.
2. Aba **Redactores**: busca à esquerda, `Nuevo redactor` à direita; footer `7 redactores` (o seeder
   cria 7); RUT em monospace; tag de idoneidade colorida.
3. Trocar para **Alumnos**: empty state com ícone, título `Alumnos` e a frase de próxima sprint —
   e **nenhum** botão `Nuevo redactor` visível.
4. Buscar `zzz` na aba Redactores: empty de busca com `Limpiar búsqueda`.
5. Repetir nos dois temas.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/features/identity/components/Redator/RedatoresTable.tsx frontend/src/features/identity/components/PeoplePage.tsx frontend/src/shared/config/locales
git commit -m "feat(personas): tabela no card e aba de alunos com empty state"
```

---

## Task 16: Administración — as duas tabelas no card e fim do ternário

**Files:**
- Modify: `frontend/src/features/identity/components/Admin/UsersTable.tsx`
- Modify: `frontend/src/features/identity/components/Admin/RolesTable.tsx`
- Modify: `frontend/src/features/identity/components/AdministracionPage.tsx`
- Modify: `frontend/src/shared/config/locales/es-CL.json`
- Modify: `frontend/src/shared/config/locales/pt-BR.json`
- Modify: `frontend/src/shared/config/locales/en.json`

**Interfaces:**
- Consumes: `AppCard`, `AppCardToolbar`, `AppCardFooter`, `AppEmptyState`.
- Produces: `UsersTable` e `RolesTable` passam a receber `actions?: ReactNode`.

- [ ] **Step 1: Adicionar as chaves faltantes nos 3 locales**

Dentro de `admin`, ao lado de `"empty"`:

`es-CL.json`: `"emptyHint": "Crea el primer usuario para comenzar."`
`pt-BR.json`: `"emptyHint": "Crie o primeiro usuário para começar."`
`en.json`: `"emptyHint": "Create the first user to get started."`

Dentro de `role`, ao lado de `"empty"` — `count` **não existia**, o footer precisa dela:

`es-CL.json`:
```json
"emptyHint": "Crea el primer rol personalizado para comenzar.",
"count": "{{count}} roles"
```

`pt-BR.json`:
```json
"emptyHint": "Crie o primeiro papel personalizado para começar.",
"count": "{{count}} papéis"
```

`en.json`:
```json
"emptyHint": "Create the first custom role to get started.",
"count": "{{count}} roles"
```

- [ ] **Step 2: Reescrever `UsersTable`**

```tsx
// frontend/src/features/identity/components/Admin/UsersTable.tsx
import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AppDataTable, AppColumn, AppTag, AppInputText, AppButton,
  AppCardToolbar, AppCardFooter, AppEmptyState,
} from '@shared/ui'
import type { UserData } from '@shared/types/generated'

export function UsersTable({
  users, loading, onView, actions,
}: {
  users: UserData[]
  loading: boolean
  onView: (u: UserData) => void
  actions?: ReactNode
}) {
  const { t } = useTranslation()
  const [filter, setFilter] = useState('')
  const [first, setFirst] = useState(0)

  const term = filter.trim().toLowerCase()
  const rows = term === ''
    ? users
    : users.filter(
        (u) => u.name.toLowerCase().includes(term) || u.email.toLowerCase().includes(term),
      )

  const handleFilterChange = (value: string) => {
    setFilter(value)
    setFirst(0)
  }

  const empty = term === '' ? (
    <AppEmptyState icon="pi pi-users" title={t('admin.empty')} description={t('admin.emptyHint')} action={actions} />
  ) : (
    <AppEmptyState
      icon="pi pi-search"
      title={t('common.noResults', { term: filter.trim() })}
      description={t('common.noResultsHint')}
      action={<AppButton label={t('common.clearSearch')} icon="pi pi-times" text onClick={() => handleFilterChange('')} />}
    />
  )

  return (
    <>
      <AppCardToolbar
        start={
          <div className="min-w-64 flex-1">
            <AppInputText
              leftIcon="pi pi-search"
              placeholder={t('admin.searchPlaceholder')}
              value={filter}
              onChange={(e) => handleFilterChange(e.target.value)}
            />
          </div>
        }
        end={actions}
      />
      <AppDataTable
        value={rows}
        loading={loading}
        emptyMessage={loading ? undefined : empty}
        paginator={rows.length > 10}
        first={first}
        onPage={(e) => setFirst(e.first)}
      >
        <AppColumn
          field="name"
          header={t('admin.name')}
          sortable
          body={(u: UserData) => (
            <div>
              <p className="font-medium">{u.name}</p>
              <p className="text-xs" style={{ color: 'var(--text-color-secondary)' }}>{u.email}</p>
            </div>
          )}
        />
        <AppColumn header={t('admin.role')} body={(u: UserData) => u.role} />
        <AppColumn
          header={t('admin.state')}
          body={(u: UserData) => (
            <AppTag
              value={u.is_active ? t('common.active') : t('common.inactive')}
              severity={u.is_active ? 'success' : 'danger'}
            />
          )}
        />
        <AppColumn
          body={(u: UserData) => <AppButton icon="pi pi-eye" text rounded aria-label={t('common.view')} onClick={() => onView(u)} />}
          style={{ width: '4rem' }}
        />
      </AppDataTable>
      <AppCardFooter count={t('admin.count', { count: rows.length })} />
    </>
  )
}
```

- [ ] **Step 3: Reescrever `RolesTable`**

Roles **não tem busca**. Pela D1, aba sem busca põe o grupo de botões no slot **esquerdo** da
toolbar, acima da tabela.

```tsx
// frontend/src/features/identity/components/Admin/RolesTable.tsx
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AppDataTable, AppColumn, AppTag, AppButton, AppCardToolbar, AppCardFooter, AppEmptyState,
} from '@shared/ui'
import type { RoleData } from '@shared/types/generated'

export function RolesTable({
  roles, loading, onView, actions,
}: {
  roles: RoleData[]
  loading: boolean
  onView: (r: RoleData) => void
  actions?: ReactNode
}) {
  const { t } = useTranslation()

  // Sem busca nesta aba: só um vazio possível, o de "sem dado".
  const empty = (
    <AppEmptyState icon="pi pi-shield" title={t('role.empty')} description={t('role.emptyHint')} action={actions} />
  )

  return (
    <>
      {/* Aba sem busca: o grupo de botões vai no slot ESQUERDO (spec D1). */}
      <AppCardToolbar start={actions} />
      <AppDataTable value={roles} loading={loading} emptyMessage={loading ? undefined : empty}>
        <AppColumn field="name" header={t('role.name')} sortable />
        <AppColumn
          header={t('role.kind')}
          body={(r: RoleData) => (
            <AppTag value={r.is_system ? t('role.system') : t('role.custom')} severity={r.is_system ? 'info' : 'success'} />
          )}
        />
        <AppColumn
          header={t('role.permissions')}
          body={(r: RoleData) => <span className="font-semibold">{r.permissions.length}</span>}
        />
        <AppColumn
          body={(r: RoleData) => <AppButton icon="pi pi-eye" text rounded aria-label={t('common.view')} onClick={() => onView(r)} />}
          style={{ width: '4rem' }}
        />
      </AppDataTable>
      <AppCardFooter count={t('role.count', { count: roles.length })} />
    </>
  )
}
```

Sem estado de página aqui: sem busca e sem filtro, não há nada que possa deixar o usuário numa página
que sumiu. O `paginator` default do `AppDataTable` continua ligado e cuida do caso de muitas roles.

- [ ] **Step 4: Reescrever a página**

```tsx
// frontend/src/features/identity/components/AdministracionPage.tsx
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ModulePage, ModuleTabs, ModuleTab, AppButton, AppCard } from '@shared/ui'
import { usePermissions } from '@shared/hooks'
import { useUsersPage } from '../hooks/useUsersPage'
import { useRolesPage } from '../hooks/useRolesPage'
import { UsersTable } from './Admin/UsersTable'
import { StaffUserDialog } from './Admin/StaffUserDialog'
import { RolesTable } from './Admin/RolesTable'
import { RoleDialog } from './Admin/RoleDialog'

export function AdministracionPage() {
  const { t } = useTranslation()
  const { can } = usePermissions()
  const canManage = can('identity.access.manage')
  const page = useUsersPage()
  const rolesPage = useRolesPage()
  const [tab, setTab] = useState(0)

  return (
    <ModulePage title={t('module.administracion.title')} description={t('module.administracion.description')}>
      <AppCard>
        <ModuleTabs activeIndex={tab} onTabChange={(e) => setTab(e.index)}>
          <ModuleTab header={t('admin.tabUsers')}>
            <UsersTable
              users={page.items}
              loading={page.loading}
              onView={page.openView}
              actions={
                canManage
                  ? <AppButton variant="brandIcon" label={t('admin.new')} icon="pi pi-user-plus" onClick={page.openCreate} />
                  : undefined
              }
            />
          </ModuleTab>
          {canManage && (
            <ModuleTab header={t('admin.tabRoles')}>
              <RolesTable
                roles={rolesPage.items}
                loading={rolesPage.loading}
                onView={rolesPage.openView}
                actions={<AppButton variant="brandIcon" label={t('role.new')} icon="pi pi-plus" onClick={rolesPage.openCreate} />}
              />
            </ModuleTab>
          )}
        </ModuleTabs>
      </AppCard>

      {page.dialog && (
        <StaffUserDialog
          visible
          mode={page.dialog.mode}
          user={page.dialog.entity}
          canManage={canManage}
          onHide={page.close}
          onEdit={page.startEdit}
        />
      )}

      {rolesPage.dialog && (
        <RoleDialog
          visible
          mode={rolesPage.dialog.mode}
          role={rolesPage.dialog.entity}
          canManage={canManage}
          onHide={rolesPage.close}
          onEdit={rolesPage.startEdit}
        />
      )}
    </ModulePage>
  )
}
```

A constante `onRoles` e o ternário aninhado (`canManage ? (onRoles ? role.new : admin.new) : null`)
somem: cada aba carrega a própria ação, e o guard de `canManage` fica em cada uma. Na aba Roles o
guard já está na renderização da própria aba, então a ação entra sem condicional.

- [ ] **Step 5: Verificar paridade dos locales e build**

Rode o **script de paridade** de `frontend/src/shared/config/locales/`. Esperado: `es-pt: []` e `es-en: []`.

De `frontend/`:

```bash
pnpm lint && pnpm build
```

Esperado: ambos sem erro.

- [ ] **Step 6: Provar na tela**

`pnpm dev`, http://localhost:5173/administracion, logado como superadmin:

1. Card único envolvendo as duas abas.
2. Aba **Usuarios**: busca à esquerda, `Nuevo usuario` à direita; footer com a contagem.
3. Aba **Roles y permisos**: **nenhuma busca**, botão `Nuevo rol` à **esquerda** na toolbar; tabela
   com a coluna de tipo (`Sistema` azul / `Personalizado` verde) e a contagem de permissões em
   negrito; footer `N roles`.
4. O cabeçalho da página não tem botão em nenhuma das abas.
5. Buscar `zzz` na aba Usuarios: empty de busca com `Limpiar búsqueda`.
6. Repetir nos dois temas.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/features/identity/components/Admin frontend/src/features/identity/components/AdministracionPage.tsx frontend/src/shared/config/locales
git commit -m "feat(administracion): tabelas no card e remove o ternario do header"
```

---

## Task 17: Remover `actions` do `ModulePage` e do `PageHeader`

Agora sem consumidor. O `tsc` é a prova: se alguma tela ainda passar `actions`, o build quebra.

**Files:**
- Modify: `frontend/src/shared/ui/ModulePage/ModulePage.tsx`
- Modify: `frontend/src/shared/ui/PageHeader/PageHeader.tsx`

**Interfaces:**
- Consumes: nada.
- Produces: `ModulePage` fica `{ title, description?, tags?, children }`; `PageHeader` fica
  `{ title, description?, tags? }`. A Parte 3 usa `tags` no detalhe de turma.

- [ ] **Step 1: Provar que não há mais consumidor antes de remover**

De `frontend/`:

```bash
grep -rn "actions=" src/features --include=*.tsx
```

Esperado: **nenhuma linha** em que o `actions=` esteja num `<ModulePage`. Ocorrências em
`<ClientsTable`, `<BudgetsTable`, `<CoursesTable`, `<RedatoresTable`, `<UsersTable`, `<RolesTable`
e `<AppCardHeader` são as corretas — a prop mudou de dono, não sumiu.

```bash
grep -rn "PageHeader" src --include=*.tsx | grep -v "shared/ui/"
```

Esperado: nenhuma linha. `PageHeader` só é usado pelo `ModulePage`.

Se qualquer um dos dois greps contrariar o esperado, **pare**: falta migrar uma tela e a remoção
quebraria a Parte 3.

- [ ] **Step 2: Remover `actions` do `PageHeader`**

```tsx
// frontend/src/shared/ui/PageHeader/PageHeader.tsx
import type { ReactNode } from 'react'

/** Cabeçalho de módulo: título + descrição à esquerda, tags à direita.
 * Apresentacional puro (não conhece feature).
 *
 * Não tem slot de ação: a ação primária de módulo mora na toolbar do card
 * (spec de 2026-07-26, D1). */
export function PageHeader({
  title,
  description,
  tags,
}: {
  title: string
  description?: string
  tags?: ReactNode
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h2 className="text-2xl font-bold" style={{ color: 'var(--text-color)' }}>{title}</h2>
        {description && (
          <p className="mt-1 text-sm" style={{ color: 'var(--text-color-secondary)' }}>{description}</p>
        )}
      </div>
      {tags && <div className="flex shrink-0 flex-wrap items-center gap-2">{tags}</div>}
    </div>
  )
}
```

- [ ] **Step 3: Remover `actions` do `ModulePage`**

```tsx
// frontend/src/shared/ui/ModulePage/ModulePage.tsx
import type { ReactNode } from 'react'
import { PageHeader } from '../PageHeader'
import { AppTabView, AppTabPanel } from '../AppTabView'

/**
 * Molde de página de módulo: cabeçalho (título, descrição, tags) + corpo.
 * Apresentacional puro — não conhece feature, não conhece rota.
 *
 * O corpo é um <AppCard> composto pela tela: abas, toolbar, tabela e footer.
 * A ação primária vive na toolbar do card, não aqui (spec de 2026-07-26, D1).
 */
export function ModulePage({
  title,
  description,
  tags,
  children,
}: {
  title: string
  description?: string
  tags?: ReactNode
  children: ReactNode
}) {
  return (
    <div>
      <PageHeader title={title} description={description} tags={tags} />
      {children}
    </div>
  )
}

export const ModuleTabs = AppTabView
export const ModuleTab = AppTabPanel
```

- [ ] **Step 4: Verificar build**

De `frontend/`:

```bash
pnpm lint && pnpm build
```

Esperado: ambos sem erro. Se o `tsc` acusar `Property 'actions' does not exist`, uma tela ficou para
trás — corrija a tela, não reponha a prop.

- [ ] **Step 5: Provar o DoD da Parte 2 nas cinco telas**

`docker compose up -d` e `pnpm dev`, com o `OperationDemoSeeder` carregado. Nas cinco rotas —
`/comercial`, `/operacion`, `/cursos`, `/personas`, `/administracion` — confirme, **nos dois temas**:

1. Card único envolvendo abas (onde houver), toolbar, tabela e footer.
2. Cabeçalho da página **sem botão nenhum** nas cinco.
3. A ação primária de cada tela na toolbar do card, e mudando junto com a aba ativa.
4. `Cursos` sem aba.
5. Footer com contagem em prosa nas seis tabelas.
6. Busca por `zzz` mostrando o empty de busca, não o convite a cadastrar (Roles não tem busca).
7. Nenhum título ou descrição rendendo chave crua (`module.cursos.title` na tela = chave faltando).

- [ ] **Step 6: Commit**

```bash
git add frontend/src/shared/ui/ModulePage frontend/src/shared/ui/PageHeader
git commit -m "refactor(ui): remove actions do ModulePage e do PageHeader"
```

---

# Partes 3 e 4 — planejadas nos respectivos gates

O `CLAUDE.md` §4 manda escrever o plano detalhado de um bloco **imediatamente antes** de executá-lo,
para que o roadmap adiante não envelheça. As Partes 3 e 4 consomem a API do `AppCard` que as Partes 1
e 2 constroem, e essa API é exatamente o que o review de cada parte pode mandar mudar. Escrever JSX
exato para sete telas contra um contrato ainda não revisado produziria plano para reescrever.

Cada parte abaixo declara escopo, arquivos e DoD. O plano passo a passo de cada uma é escrito no
gate de review da parte anterior.

## Parte 3 — Detalhe de orçamento e detalhe de turma

**Entra quando:** o DoD da Parte 2 estiver provado.

**Arquivos:**
- `frontend/src/features/commercial/components/Budget/BudgetDetailPage.tsx`
- `frontend/src/features/commercial/components/Budget/QuotesList.tsx`
- `frontend/src/features/commercial/components/Budget/FileList.tsx`
- `frontend/src/features/operation/components/Turma/TurmaDetailPage.tsx`
- `frontend/src/features/operation/components/Turma/TurmaConfigCard.tsx`
- `frontend/src/features/operation/components/Enrollment/EnrollmentTable.tsx`
- `frontend/src/features/operation/components/Document/TurmaDocuments.tsx`
- `frontend/src/shared/ui/AppPaginator/**` (novo) e `frontend/src/shared/ui/AppDataTable/**`, para a
  unificação do footer.

**Escopo:**
- Três `AppCard variant="stat"` no detalhe de orçamento: total cotizado `neutral`, total aprobado
  `success`, total rechazado `danger`.
- `AppCardHeader` com badge de contagem e ação secundária nos cards de Cotizaciones e Documentos.
- Lista de cotizaciones mantém alternância de fundo como separação de item — é lista empilhada, não
  tabela, e a decisão de "sem zebra" (D4) vale para tabela.
- Detalhe de turma: tags de estado e modalidade no `PageHeader` via a prop `tags` da Task 5; as cinco
  abas dentro do `AppCard`. A modalidade `Online` usa `tone="accent"` da Task 3.
- Aba Alumnos: grupo de botões **à esquerda** no slot `start` da toolbar, sem busca.
- **Paginador unificado (adiado da Parte 1 e reconfirmado no gate da Parte 2).** Contagem à esquerda e
  paginador à direita no mesmo `AppCardFooter`, fechando o double-band que D6 quer evitar. Exige um
  wrapper `AppPaginator` em `shared/ui` (feature não importa `primereact` direto, lei §5.6) e desligar
  o paginador interno do `AppDataTable` quando o footer assumir. **Esta é a parte onde o caso é
  real:** o `OperationDemoSeeder` cria turmas com 12 e 15 matrículas, acima do `rows={10}` — nenhuma
  tabela das Partes 1 e 2 passa de 10 linhas, e por isso a unificação não tinha como ser provada lá.

**DoD:** os três stat cards nas cores certas nos dois temas; aprovar e rejeitar cotização no lugar e
funcionando contra a API real; detalhe de turma com tags no cabeçalho e cinco abas dentro do card;
`Online` roxo e `Presencial` neutro; na aba Alumnos de uma turma com 12 ou 15 matrículas, **uma única
faixa** no rodapé, com a contagem à esquerda e o paginador à direita.

## Parte 4 — Checklist H.2.1

**Entra quando:** o DoD da Parte 3 estiver provado.

**Escopo,** verbatim do Notion `H.2.1`:

- [ ] Tabelas responsivas em mobile (scroll horizontal ou colunas colapsáveis)
- [ ] Dialogs adaptados a telas estreitas (grid 2-col → 1-col)
- [ ] Estados de loading consistentes (skeleton/spinner padrão)
- [ ] Estados empty com mensagem e ação clara — **já entregue na Parte 1**
- [ ] Estados de erro visíveis (nunca falhar em silêncio — peso legal)
- [ ] Densidade e espaçamento revisados contra o design system — **já entregue na Task 4**
- [ ] Contraste e navegação por teclado nos formulários
- [ ] Componentes de formulário vindos de `shared/ui` (sem duplicação local)

**Fecha P-11:** `frontend/src/features/operation/components/Enrollment/EnrollmentTable.tsx:55` é o
último `window.confirm` do repositório. `shared/ui/ConfirmDialog` já existe e é consumido por
`MoveConfirmDialog`, `TurmaDocuments`, `EnrollStudentForm`, `ConcludePanel` e `BudgetDetailPage`.
Prova: `grep -rn "window.confirm" frontend/src` sem resultado.

**DoD:** janela em 768px de largura sem scroll horizontal na página, com a tabela rolando dentro do
próprio container; diálogo em uma coluna; `Tab` percorrendo o formulário na ordem visual; erro de
mutação visível **com texto**, nunca só cor.

---

# Handoff de execução

**executor:** `claude` nas Partes 1, 3 e 4 e nas Tasks 9–10; `codex` nas Tasks 11–17.

| Parte | Tasks | Executor | Por quê |
|---|---|---|---|
| 1 | 1–8 | `claude` | Define o contrato que todas as outras copiam. Erro aqui se replica em sete telas. |
| 2 | 9–10 | `claude` | A Task 9 renomeia chave de i18n consumida pelas cinco telas de uma vez; a Task 10 muda o contrato do `AppCard`, que as Partes 3 e 4 inteiras consomem. Erro em qualquer das duas não é local. |
| 2 | 11–17 | `codex` | Replicação mecânica do padrão já aprovado e revisado, com verificação executável (`pnpm lint`, `pnpm build`, script de paridade de locales) e paths fechados. |
| 3 | — | `claude` | Composição heterogênea — stat cards, cabeçalho de card com ação, lista com alternância, abas com conteúdo diferente por aba, e o `AppPaginator` novo. Julgamento visual fora do plano. |
| 4 | — | `claude` | Julgamento visual e de acessibilidade em sete telas; nenhum item se prova por comando. |

**Intervalo delegado ao `codex`:** Tasks 11 a 17, nesta ordem. A Task 17 é a última e depende de todas
as anteriores — remover `actions` antes de as cinco telas migrarem quebra o build.

**Pré-condição do handoff:** as Tasks 9 e 10 commitadas e verdes. O commit da Task 10 é o `commit
base` a informar ao Codex.

**`paths_autorizados` das Tasks 11–17:**

```
frontend/src/features/operation/components/OperationPage.tsx
frontend/src/features/operation/components/Turma/TurmasTable.tsx
frontend/src/features/operation/components/Turma/PendingQuotesPanel.tsx
frontend/src/features/operation/lib/turmaStatus.ts
frontend/src/features/catalog/components/CatalogPage.tsx
frontend/src/features/catalog/components/Course/CoursesTable.tsx
frontend/src/features/identity/components/PeoplePage.tsx
frontend/src/features/identity/components/AdministracionPage.tsx
frontend/src/features/identity/components/Admin/UsersTable.tsx
frontend/src/features/identity/components/Admin/RolesTable.tsx
frontend/src/features/identity/components/Redator/RedatoresTable.tsx
frontend/src/shared/ui/ModulePage/**
frontend/src/shared/ui/PageHeader/**
frontend/src/shared/config/locales/*.json
```

Fora desses globs, o Codex não escreve. `backend/`, `docs/`, `frontend/src/shared/types/` e
`frontend/src/shared/ui/AppCard/**` ficam explicitamente fora — o `AppCard` é da Task 10, que é do
Claude.

---

# Parte 2 — Correções de review (Tasks C1 a C5)

`/revisar-sprint` da Parte 2 fechou com 5 achados (Q-2 a Q-6). **João aprovou todos, em
2026-07-26**, e delegou a aplicação ao Codex. Estas tasks rodam na mesma worktree
(`.claude/worktrees/bloco-visual-p2`, branch `worktree-bloco-visual-p2`), sobre `d6023c7`, antes do
merge.

Duas delas (C1 e C5) tocam `shared/` — o contrato que as Partes 3 e 4 consomem. O gate da Parte 2
mandava contrato compartilhado para o `claude`; aqui o João decidiu o contrário. O risco fica
contido de outro jeito: **o código de `shared/` está escrito literalmente abaixo**, o Codex aplica
sem latitude de design, e o diff volta para conferência antes do commit.

## Ordem obrigatória

C1 → C2 → C3 → C4 → C5. C1 tira o ternário de `emptyMessage` das 7 tabelas; C5 reescreve as mesmas
tabelas em cima do resultado. Inverter a ordem faz C5 propagar o defeito que C1 corrige.

---

## Task C1 (Q-3): `AppDataTable` suprime o vazio durante o loading

**Files:**
- Modify: `frontend/src/shared/ui/AppDataTable/AppDataTable.tsx`
- Modify: as 7 tabelas (lista no Step 2)

**O defeito:** `emptyMessage={loading ? undefined : empty}` não suprime nada. O `DataTable` renderiza
o corpo vazio sempre que `data` está vazio, inclusive durante o `loading`, e faz
`getJSXElement(props.emptyMessage) || localeOption('emptyMessage')`
(`primereact/datatable/datatable.cjs.js:3389-3392`). O locale ativo do PrimeReact é `en` —
`shared/config/primeLocale.ts` só faz `addLocale('es', …)` para o Calendar e nunca chama
`locale('es')`. Resultado: `No available options`, em inglês, sob o overlay translúcido de loading,
em toda tabela do app.

**A correção mora no wrapper, não nos 7 chamadores.** O `AppDataTable` já recebe `loading`; é ele
quem sabe a regra.

- [ ] **Step 1: Reescrever a assinatura do `AppDataTable`**

Só a função exportada muda; `mergePt` e os reexports ficam como estão.

```tsx
/** Wrapper do DataTable: paginação/sort/filtro client-side (o index devolve
 * array puro). Colunas via <AppColumn/>.
 *
 * Durante o `loading` o corpo vazio ainda renderiza — passar `undefined` em
 * `emptyMessage` cairia no default inglês do PrimeReact (`No available
 * options`). Um nó vazio truthy mantém a linha e cala o texto; suprimir isso é
 * responsabilidade do wrapper, não de cada tabela. */
export function AppDataTable<T extends DataTableValueArray>({
  pt,
  loading,
  emptyMessage,
  ...props
}: DataTableProps<T>) {
  return (
    <DataTable
      dataKey="id"
      removableSort
      rowHover
      paginator
      rows={10}
      pt={mergePt(appDataTablePt, pt as DataTableProps<DataTableValueArray>['pt'])}
      loading={loading}
      emptyMessage={loading ? <span /> : emptyMessage}
      {...props}
    />
  )
}
```

`loading` e `emptyMessage` são desestruturados, então o `{...props}` no fim **não** os
sobrescreve — a ordem está correta como escrita.

- [ ] **Step 2: Trocar o ternário por `empty` nos 7 chamadores**

Em cada arquivo, `emptyMessage={loading ? undefined : empty}` vira `emptyMessage={empty}`:

```
frontend/src/features/commercial/components/Client/ClientsTable.tsx:64
frontend/src/features/commercial/components/Budget/BudgetsTable.tsx:99
frontend/src/features/catalog/components/Course/CoursesTable.tsx:63
frontend/src/features/identity/components/Admin/RolesTable.tsx:27
frontend/src/features/identity/components/Admin/UsersTable.tsx:62
frontend/src/features/identity/components/Redator/RedatoresTable.tsx:65
frontend/src/features/operation/components/Turma/TurmasTable.tsx:88
```

- [ ] **Step 3: Provar que o ternário sumiu**

De `frontend/`:

```bash
grep -rn "loading ? undefined" src
```

Esperado: **nenhuma linha**.

- [ ] **Step 4: Verificar build**

De `frontend/`: `pnpm lint && pnpm build`. Esperado: ambos sem erro.

---

## Task C2 (Q-2): `RolesTable` faz opt-out do paginador default

**Files:**
- Modify: `frontend/src/features/identity/components/Admin/RolesTable.tsx`

**O defeito:** o `AppDataTable` liga `paginator` por default e o PrimeReact tem
`alwaysShowPaginator: true` (`datatable.cjs.js:489`). Com as 3 roles do seeder, um paginador de
página única renderiza **acima** do `AppCardFooter`: duas faixas na mesma tela, que é exatamente o
double-band que a spec D6 elimina. As outras 6 tabelas já fazem o opt-out.

O texto da Task 16 ("o `paginator` default continua ligado e cuida do caso de muitas roles") e a
decisão #2 do gate ("nenhuma tabela desta parte passa de 10 linhas, então o paginador nem aparece")
partiam da premissa errada de que `paginator` sem `alwaysShowPaginator={false}` some com poucas
linhas. Some não.

- [ ] **Step 1: Ligar o paginador por contagem**

Na linha do `AppDataTable`:

```tsx
<AppDataTable value={roles} loading={loading} emptyMessage={empty} paginator={roles.length > 10}>
```

Sem `first`/`onPage`: a aba não tem busca nem filtro, então não existe caminho que deixe o usuário
numa página que sumiu.

- [ ] **Step 2: Provar a consistência entre as 7 tabelas**

De `frontend/`:

```bash
grep -rn "paginator=" src/features
```

Esperado: **7 linhas**, todas na forma `paginator={<algo>.length > 10}`.

- [ ] **Step 3: Verificar build**

De `frontend/`: `pnpm lint && pnpm build`. Esperado: ambos sem erro.

---

## Task C3 (Q-4): ação primária de módulo atrás de `can()`

**Files:**
- Modify: `frontend/src/features/catalog/components/CatalogPage.tsx`
- Modify: `frontend/src/features/identity/components/PeoplePage.tsx`
- Modify: `frontend/src/features/commercial/components/CommercialPage.tsx`

**O defeito:** três páginas renderizam a ação primária sem checar permissão, enquanto
`AdministracionPage` gateia com `canManage` — inconsistência dentro do mesmo diff. Um superadmin
cria role customizada só-leitura (é para isso que serve a `RolesTable`); esse usuário vê
`Nuevo curso`, preenche o diálogo e leva 403 no submit.

As 4 permissões existem em `backend/app/Domains/Identity/Support/PermissionCatalog.php`.

- [ ] **Step 1: `CatalogPage`**

Acrescente `import { usePermissions } from '@shared/hooks'`, e no corpo:

```tsx
  const { can } = usePermissions()
```

A prop vira:

```tsx
          actions={
            can('catalog.course.create')
              ? <AppButton variant="brandIcon" label={t('course.new')} icon="pi pi-plus" onClick={page.openCreate} />
              : undefined
          }
```

- [ ] **Step 2: `PeoplePage`**

Mesmo padrão, com `identity.user.create`:

```tsx
              actions={
                can('identity.user.create')
                  ? <AppButton variant="brandIcon" label={t('redator.new')} icon="pi pi-user-plus" onClick={page.openCreate} />
                  : undefined
              }
```

- [ ] **Step 3: `CommercialPage`**

Duas abas, duas permissões — `commercial.client.create` na de clientes e
`commercial.budget.create` na de orçamentos. Mesma forma ternária.

- [ ] **Step 4: Verificar build**

De `frontend/`: `pnpm lint && pnpm build`. Esperado: ambos sem erro.

> `can()` é conveniência de interface, não segurança — a autorização é da API (ADR-07,
> `.claude/rules/frontend-fsliced.md`). O ganho aqui é não oferecer ação que termina em 403.

---

## Task C4 (Q-5): copy do vazio quando só o filtro de estado está ativo

**Files:**
- Modify: `frontend/src/shared/config/locales/es-CL.json`
- Modify: `frontend/src/shared/config/locales/pt-BR.json`
- Modify: `frontend/src/shared/config/locales/en.json`
- Modify: `frontend/src/features/operation/components/Turma/TurmasTable.tsx`

**O defeito:** com só o filtro de estado ativo, o título já troca para `common.noResultsFiltered`,
mas a descrição segue `common.noResultsHint` ("Revisa el término o limpia la búsqueda") e o CTA
segue `common.clearSearch` ("Limpiar búsqueda") — enquanto o `onClick` limpa busca **e** estado.

- [ ] **Step 1: Duas chaves novas em `common`, nos 3 locales**

Ao lado de `noResultsFiltered`:

`es-CL.json`:
```json
    "noResultsFilteredHint": "Ajusta o limpia los filtros aplicados.",
    "clearFilters": "Limpiar filtros",
```

`pt-BR.json`:
```json
    "noResultsFilteredHint": "Ajuste ou limpe os filtros aplicados.",
    "clearFilters": "Limpar filtros",
```

`en.json`:
```json
    "noResultsFilteredHint": "Adjust or clear the applied filters.",
    "clearFilters": "Clear filters",
```

- [ ] **Step 2: Usar as chaves quando não há termo**

No `empty` de busca do `TurmasTable`, `description` e `label` acompanham o título:

```tsx
      description={term === '' ? t('common.noResultsFilteredHint') : t('common.noResultsHint')}
      action={
        <AppButton
          label={term === '' ? t('common.clearFilters') : t('common.clearSearch')}
          icon="pi pi-times"
          text
          onClick={...}
        />
      }
```

O `onClick` não muda — já limpava busca, estado e página.

- [ ] **Step 3: Verificar paridade dos locales e build**

Rode o **script de paridade** de `frontend/src/shared/config/locales/`. Esperado: `es-pt: []` e
`es-en: []`. Depois, de `frontend/`: `pnpm lint && pnpm build`.

---

## Task C5 (Q-6): `useTableFilter` — o scaffolding de tabela vira contrato

**Files:**
- Create: `frontend/src/shared/hooks/useTableFilter.ts`
- Modify: `frontend/src/shared/hooks/index.ts`
- Modify: as 6 tabelas com busca (a `RolesTable` não tem busca e fica de fora)
- Modify: `.claude/rules/frontend-fsliced.md`

**Por que vira regra e não só refactor:** a Parte 1 já registrou a duplicação com 2 cópias; a Parte 2
levou a 6. As duas correções acima são a prova do custo — Q-2 é um esquecimento em 1 de 6 cópias e
Q-3 é o mesmo acerto errado replicado em 6 de 6. Padrão reincidente em 2 sprints vira contrato.

- [ ] **Step 1: Criar o hook**

```ts
// frontend/src/shared/hooks/useTableFilter.ts
import { useState } from 'react'

export interface TableFilter<T> {
  /** Termo cru — alimenta o input e é o que se cita no empty state. */
  filter: string
  /** Termo normalizado (trim + lowercase); `''` quando não há busca. */
  term: string
  /** Linhas depois do `where` e da busca. */
  rows: T[]
  /** Índice da primeira linha da página (controlado — volta a 0 ao filtrar). */
  first: number
  /** Troca o termo e volta à primeira página. */
  onFilterChange: (value: string) => void
  /** Handler de página do `AppDataTable`. */
  onPage: (event: { first: number }) => void
  /** Volta à primeira página sem mexer no termo — para o filtro próprio da tela. */
  resetPage: () => void
  /** Limpa a busca e volta à primeira página. */
  clear: () => void
  /** Liga o paginador só quando há mais de uma página (spec D6: uma faixa só). */
  paginator: boolean
}

/**
 * Estado de busca e paginação de uma tabela em card. Os 6 consumidores repetiam
 * este bloco literalmente, e a duplicação rendeu dois defeitos no review da
 * Parte 2: o paginador default ligado na `RolesTable` (duas faixas, contra D6) e
 * o empty state falso durante o loading. Contrato fixado em
 * `.claude/rules/frontend-fsliced.md`.
 *
 * `searchable` devolve os campos que a busca varre — `null`/`undefined` são
 * ignorados. `where` é o filtro próprio da tela (estado, tipo) e roda ANTES da
 * busca; saber se ele está ativo continua sendo da tela, não do hook.
 */
export function useTableFilter<T>(
  items: T[],
  searchable: (item: T) => (string | null | undefined)[],
  where?: (item: T) => boolean,
): TableFilter<T> {
  const [filter, setFilter] = useState('')
  const [first, setFirst] = useState(0)

  const term = filter.trim().toLowerCase()
  const scoped = where ? items.filter(where) : items
  const rows =
    term === ''
      ? scoped
      : scoped.filter((item) =>
          searchable(item).some((value) => (value ?? '').toLowerCase().includes(term)),
        )

  const onFilterChange = (value: string) => {
    setFilter(value)
    setFirst(0)
  }

  return {
    filter,
    term,
    rows,
    first,
    onFilterChange,
    onPage: (event) => setFirst(event.first),
    resetPage: () => setFirst(0),
    clear: () => onFilterChange(''),
    paginator: rows.length > 10,
  }
}
```

- [ ] **Step 2: Exportar no barrel**

Em `frontend/src/shared/hooks/index.ts`, mantendo a ordem alfabética existente:

```ts
export { useTableFilter } from './useTableFilter'
export type { TableFilter } from './useTableFilter'
```

- [ ] **Step 3: Migrar as 5 tabelas de busca simples**

`ClientsTable`, `BudgetsTable`, `CoursesTable`, `RedatoresTable`, `UsersTable`. O molde, com
`ClientsTable` como exemplo — some o `useState` de `filter`/`first`, o cálculo de `term`/`rows` e o
`handleFilterChange`:

```tsx
  const table = useTableFilter(clients, (c) => [c.legal_name, c.rut])
```

e as referências trocam assim:

| Antes | Depois |
|---|---|
| `term` | `table.term` |
| `rows` | `table.rows` |
| `filter` (valor do input) | `table.filter` |
| `handleFilterChange(v)` | `table.onFilterChange(v)` |
| `handleFilterChange('')` (CTA limpar) | `table.clear()` |
| `paginator={rows.length > 10}` | `paginator={table.paginator}` |
| `first={first}` | `first={table.first}` |
| `onPage={(e) => setFirst(e.first)}` | `onPage={table.onPage}` |
| `t('common.noResults', { term: filter.trim() })` | `t('common.noResults', { term: table.filter.trim() })` |

Campos de busca por tabela, na ordem exata do código atual:

| Tabela | `searchable` |
|---|---|
| `ClientsTable` | `(c) => [c.legal_name, c.rut]` |
| `BudgetsTable` | os mesmos campos que o filtro atual varre — leia o arquivo, não invente |
| `CoursesTable` | `(c) => [c.name, c.technical_name]` |
| `RedatoresTable` | `(r) => [r.name, r.rut]` |
| `UsersTable` | `(u) => [u.name, u.email]` |

O `BudgetsTable` tem filtro próprio além da busca; trate-o como o `TurmasTable` do Step 4 se for o
caso. **Não mude quais campos a busca varre em nenhuma tabela** — este refactor é comportamento
idêntico.

- [ ] **Step 4: Migrar o `TurmasTable`, que tem filtro de estado**

O `status` continua na tela; entra como `where`:

```tsx
  const [status, setStatus] = useState<TurmaDisplayStatus | null>(null)
  const table = useTableFilter(
    turmas,
    (turma) => [turma.course_name, turma.client_name, turma.quote_code, turma.budget_code],
    status === null ? undefined : (turma) => turmaDisplayStatus(turma) === status,
  )

  const filtering = table.term !== '' || status !== null
```

O `onChange` do dropdown reseta a página pelo hook:

```tsx
                onChange={(e) => { setStatus(e.value as TurmaDisplayStatus | null); table.resetPage() }}
```

E o CTA de limpar zera os dois:

```tsx
          onClick={() => { table.clear(); setStatus(null) }}
```

- [ ] **Step 5: Provar que o scaffolding sumiu**

De `frontend/`:

```bash
grep -rn "handleFilterChange\|setFirst\|filter.trim().toLowerCase()" src/features
```

Esperado: **nenhuma linha**.

```bash
grep -rn "useTableFilter" src/features
```

Esperado: 6 linhas, uma por tabela com busca.

- [ ] **Step 6: Fixar a regra**

Em `.claude/rules/frontend-fsliced.md`, na lista `## Padrões de código`, logo **depois** do bullet
"Página CRUD:", acrescente:

```markdown
- **Tabela em card = `useTableFilter` + `AppCard{Toolbar,Footer}`.** Busca, `first` controlado,
  `clear()` e `paginator={rows.length > 10}` vêm do hook (`shared/hooks/useTableFilter.ts`); a
  feature só declara `searchable` e, quando tem filtro próprio, `where`. Reescrever o bloco na
  feature foi o que rendeu, em 6 cópias, um `RolesTable` com o paginador default ligado (duas
  faixas, contra a spec D6) e um empty state falso durante o loading. A supressão do vazio durante
  `loading` é do `AppDataTable`, não do chamador — **não** reintroduzir
  `emptyMessage={loading ? undefined : empty}`, que cai no default inglês do PrimeReact
  (`No available options`).
```

- [ ] **Step 7: Verificar build**

De `frontend/`: `pnpm lint && pnpm build`. Esperado: ambos sem erro.

---

## Handoff de execução — Tasks C1 a C5

`executor: codex` · base: `d6023c7` na branch `worktree-bloco-visual-p2` (worktree
`.claude/worktrees/bloco-visual-p2`).

**O Codex não commita.** Na Parte 2 o `.git/worktrees/bloco-visual-p2` ficou somente-leitura dentro
do sandbox e o `RECOMMENDED_TRANSITION` voltou `blocked` por isso. Deixe a árvore suja; o Claude
confere o diff contra estes `paths_autorizados`, roda `pnpm lint`, `pnpm build` e o script de
paridade por conta própria, e commita task a task.

**`paths_autorizados` das Tasks C1–C5:**

```
frontend/src/shared/ui/AppDataTable/**
frontend/src/shared/hooks/**
frontend/src/shared/config/locales/*.json
frontend/src/features/commercial/components/CommercialPage.tsx
frontend/src/features/commercial/components/Client/ClientsTable.tsx
frontend/src/features/commercial/components/Budget/BudgetsTable.tsx
frontend/src/features/catalog/components/CatalogPage.tsx
frontend/src/features/catalog/components/Course/CoursesTable.tsx
frontend/src/features/identity/components/PeoplePage.tsx
frontend/src/features/identity/components/Redator/RedatoresTable.tsx
frontend/src/features/identity/components/Admin/UsersTable.tsx
frontend/src/features/identity/components/Admin/RolesTable.tsx
frontend/src/features/operation/components/Turma/TurmasTable.tsx
.claude/rules/frontend-fsliced.md
```

Fora desses globs o Codex não escreve. `backend/`, `docs/`, `frontend/src/shared/types/` e
`frontend/src/shared/ui/AppCard/**` ficam explicitamente fora.

**Prova visual** de todas as 5 correções fica com o João, como no resto do bloco — o sandbox não tem
browser.

---

# Parte 3 — Detalhe de orçamento e detalhe de turma (Tasks 18 a 26)

Base: `96517f5` na `main` (Parte 2 mergeada em `72ed668`). Escopo e DoD herdados do esboço acima,
mais as quatro decisões do gate desta parte, registradas na spec como **D12 a D15** (§10).

## Decisões tomadas no gate desta parte

1. **A faixa do rodapé é o paginador do `DataTable` (D12).** O esboço da Parte 3 previa um
   `AppPaginator` avulso alimentando o slot `pagination` do `AppCardFooter`, com a página fatiada
   fora da tabela. Ao levantar o baseline apareceu o obstáculo: **5 tabelas têm coluna `sortable`**
   (`ClientsTable`, `CoursesTable`, `RolesTable`, `RedatoresTable`, `UsersTable`). Se o `DataTable`
   receber só as linhas visíveis, ele ordena **a página**, não o conjunto — regressão silenciosa.
   O `DataTable` continua dono de página e ordenação; `AppDataTable` ganha `footerCount` e o
   paginador vira a faixa.
2. **`DetailHeader` novo em `shared/ui` (D13)**, em vez de devolver `actions` ao `PageHeader` —
   a Task 17 tirou essa prop de propósito.
3. **Cor: só onde o card novo muda o fundo (D14).** Interior de `DocumentTypeCard`,
   `TurmaConfigCard` e `RedatorDesignation` fica para a Parte 4.
4. **P-11 antecipa para esta parte (D15).** A Task 25 reescreve `EnrollmentTable` inteira; trocar o
   `window.confirm` ali custa poucas linhas.

## Fato verificado na fonte do PrimeReact (não deduzir de novo)

`paginator.cjs.js:1201-1219` — `createElements()` começa com `if (props.template)`. Template `''` é
falsy, então **nenhum controle é criado**. E `leftContent` é montado fora desse ramo
(`paginator.cjs.js:1224-1229`), logo continua renderizando. Com `alwaysShowPaginator` (que vira
`alwaysShow`, `datatable.cjs.js:7613`) o early-return de `totalPages <= 1` também não dispara.

Consequência: `paginatorTemplate=''` + `alwaysShowPaginator` + `paginatorLeft` rende exatamente
`<div class="p-paginator">{contagem}</div>` — uma faixa com a contagem e nada mais. É isso que
sustenta D12.

O `pt` do `DataTable` cascateia para o Paginator pela chave `paginator` (`datatable.cjs.js:7615`),
com as subchaves `root`, `left` e `end` do próprio Paginator.

---

## Task 18: `AppDataTable` ganha `footerCount` — o paginador vira a faixa do rodapé

**Files:**
- Modify: `frontend/src/shared/ui/AppDataTable/style.ts`
- Modify: `frontend/src/shared/ui/AppDataTable/AppDataTable.tsx`

**Interfaces:**
- Consumes: `appDataTablePt` e `mergePt`, que já existem.
- Produces: `AppDataTable` aceita `footerCount?: ReactNode`. Quando ela vem, o componente liga
  `paginator`, `alwaysShowPaginator` e `paginatorLeft={footerCount}`, e só mostra controles de página
  quando `value.length > rows` (`rows` default 10). Quando não vem, nada de paginador — o
  comportamento das telas que ainda não migraram não muda. A Task 20 consome nas 7 tabelas; a Task 25
  consome na aba Alumnos.

- [ ] **Step 1: Acrescentar o `pt` do paginador em `style.ts`**

Acrescente ao fim do arquivo, sem tocar em `appDataTablePt`:

```ts
/** Faixa de rodapé da tabela (spec D12): o paginador do DataTable É o rodapé —
 * contagem à esquerda em `paginatorLeft`, controles à direita, uma faixa só.
 *
 * Layout e cor inline porque o tema Lara já estiliza `.p-paginator` (fundo
 * branco, borda, padding, radius) e utility do Tailwind não vence a
 * especificidade dele. Reproduz o visual do `AppCardFooter`: borda em cima,
 * px-4 py-3, texto secundário. */
export const appPaginatorPt: NonNullable<DataTablePassThroughOptions['paginator']> = {
  root: {
    className: 'text-sm',
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: '0.25rem',
      background: 'transparent',
      border: 'none',
      borderTop: '1px solid var(--surface-border)',
      borderRadius: 0,
      padding: '0.75rem 1rem',
      color: 'var(--text-color-secondary)',
    },
  },
  /** Empurra os controles para a direita sem depender do `justify-content`:
   * com uma página só, a contagem fica sozinha e continua à esquerda. */
  left: { style: { marginRight: 'auto' } },
}
```

- [ ] **Step 2: Ligar `footerCount` no wrapper**

Em `AppDataTable.tsx`, mantenha `mergePt` como está. Troque o import e a assinatura:

```tsx
import type { ReactNode } from 'react'
import { DataTable } from 'primereact/datatable'
import type { DataTableProps, DataTableValueArray, DataTablePassThroughOptions } from 'primereact/datatable'
import { Column } from 'primereact/column'
import { appDataTablePt, appPaginatorPt } from './style'
```

E substitua o corpo do componente por:

```tsx
export type AppDataTableProps<T extends DataTableValueArray> = DataTableProps<T> & {
  /** Contagem em prosa do rodapé. Passá-la liga a faixa: o paginador do
   * DataTable vira o rodapé do card (spec D12), com a contagem à esquerda e os
   * controles de página à direita — e só quando há mais de uma página. */
  footerCount?: ReactNode
}

/** Wrapper do DataTable: paginação/sort/filtro client-side (o index devolve
 * array puro). Colunas via <AppColumn/>.
 *
 * Durante o `loading` o corpo vazio ainda renderiza — passar `undefined` em
 * `emptyMessage` cairia no default inglês do PrimeReact (`No available
 * options`). Um nó vazio truthy mantém a linha e cala o texto; suprimir isso é
 * responsabilidade do wrapper, não de cada tabela.
 *
 * O rodapé é o paginador: com `footerCount`, `alwaysShowPaginator` mantém a
 * faixa mesmo em página única e `paginatorTemplate=''` apaga os controles
 * (template falsy não cria elemento algum; `leftContent` renderiza fora desse
 * ramo). Fatiar a página fora da tabela foi rejeitado: 5 tabelas têm coluna
 * `sortable`, e o DataTable só ordena o que recebe. */
export function AppDataTable<T extends DataTableValueArray>({
  pt,
  loading,
  emptyMessage,
  footerCount,
  value,
  rows = 10,
  ...props
}: AppDataTableProps<T>) {
  const paginated = (value?.length ?? 0) > rows

  return (
    <DataTable
      dataKey="id"
      removableSort
      rowHover
      value={value}
      rows={rows}
      paginator={footerCount !== undefined}
      alwaysShowPaginator
      paginatorLeft={footerCount}
      paginatorTemplate={paginated ? 'PrevPageLink PageLinks NextPageLink' : ''}
      pt={mergePt({ ...appDataTablePt, paginator: appPaginatorPt }, pt as DataTableProps<DataTableValueArray>['pt'])}
      loading={loading}
      emptyMessage={loading ? <span /> : emptyMessage}
      {...props}
    />
  )
}
```

O spread `{...props}` fica por último de propósito: uma tela que ainda passe `paginator={...}`
continua vencendo, e é isso que mantém as 7 tabelas funcionando entre esta task e a Task 20.

**Regressão intermediária conhecida e aceita:** o `paginator` default sai de `true` para "só com
`footerCount`". A única tela que dependia do default é a aba Alumnos — entre esta task e a Task 25
uma turma de 15 matrículas passa a listar as 15 de uma vez, sem paginar. Some na Task 25, que passa
`footerCount`.

- [ ] **Step 3: Verificar build**

De `frontend/`:

```bash
pnpm lint && pnpm build
```

Esperado: ambos sem erro.

- [ ] **Step 4: Provar as duas pontas na tela**

`pnpm dev` com o `OperationDemoSeeder` carregado.

1. http://localhost:5173/comercial — a aba Clientes ainda passa `paginator={table.paginator}` (4
   clientes, false) e continua **sem** faixa do paginador, só com o `AppCardFooter` da Parte 1. Nada
   pode ter mudado visualmente aqui.
2. Só para conferir a faixa nova antes da Task 20, sem commitar: no `ClientsTable`, troque
   temporariamente `paginator={table.paginator}` por `footerCount={t('client.count', { count: table.rows.length })}`.
   Esperado: uma faixa só, borda em cima, `4 clientes` à esquerda, nenhum controle de página (4 ≤ 10).
   **Desfaça** a troca antes do commit — ela é a Task 20.

Conferir nos dois temas: o fundo da faixa tem de acompanhar o card (transparente sobre
`--surface-card`), não ficar branco no tema escuro.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/shared/ui/AppDataTable
git commit -m "feat(ui): footerCount no AppDataTable, paginador vira a faixa do rodape"
```

---

## Task 19: `DetailHeader` em `shared/ui`

**Files:**
- Create: `frontend/src/shared/ui/DetailHeader/DetailHeader.tsx`
- Create: `frontend/src/shared/ui/DetailHeader/index.ts`
- Modify: `frontend/src/shared/ui/index.ts`

**Interfaces:**
- Consumes: nada.
- Produces: `DetailHeader` com `back?: { label: string; onClick: () => void }`, `title: string`,
  `subtitle?: ReactNode`, `tags?: ReactNode`, `actions?: ReactNode`. As Tasks 21 e 24 consomem.
  `PageHeader` **não** muda — continua sem `actions`, exclusivo de módulo (D13).

- [ ] **Step 1: Criar o componente**

`frontend/src/shared/ui/DetailHeader/DetailHeader.tsx`:

```tsx
import type { ReactNode } from 'react'

export interface DetailHeaderProps {
  /** Link de volta ao módulo. O protótipo abre toda tela de detalhe com ele. */
  back?: { label: string; onClick: () => void }
  title: string
  /** Linha de identificação sob o título (cliente, RUT, vínculo). */
  subtitle?: ReactNode
  /** Tags de estado e modalidade, à direita. */
  tags?: ReactNode
  /** Ações da página, à direita das tags (spec D1: em detalhe, a ação primária
   * mora no cabeçalho da página, não na toolbar do card). */
  actions?: ReactNode
}

/**
 * Cabeçalho de página de detalhe. Apresentacional puro — não conhece feature,
 * não conhece rota: quem navega é o `onClick` de quem compõe.
 *
 * Separado do `PageHeader` de propósito (spec D13): página de módulo não tem
 * ação no cabeçalho desde a Task 17, e devolver `actions` lá reabriria a porta
 * que D1 fechou.
 */
export function DetailHeader({ back, title, subtitle, tags, actions }: DetailHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-4">
      {back && (
        <button
          type="button"
          className="flex w-fit items-center gap-2 text-sm hover:underline"
          style={{ color: 'var(--text-color-secondary)' }}
          onClick={back.onClick}
        >
          <i className="pi pi-arrow-left" aria-hidden="true" />
          {back.label}
        </button>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-2xl font-bold" style={{ color: 'var(--text-color)' }}>{title}</h2>
          {subtitle && (
            <p className="mt-1 text-sm" style={{ color: 'var(--text-color-secondary)' }}>{subtitle}</p>
          )}
        </div>
        {(tags || actions) && (
          <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
            {tags}
            {actions}
          </div>
        )}
      </div>
    </div>
  )
}
```

`frontend/src/shared/ui/DetailHeader/index.ts`:

```ts
export * from './DetailHeader'
```

- [ ] **Step 2: Exportar no barrel**

Em `frontend/src/shared/ui/index.ts`, acrescente a linha na ordem alfabética do arquivo:

```ts
export * from './DetailHeader'
```

- [ ] **Step 3: Verificar build**

```bash
pnpm lint && pnpm build
```

Esperado: ambos sem erro. Componente ainda sem consumidor — o `tsc` não reclama de export não usado
em barrel.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/shared/ui/DetailHeader frontend/src/shared/ui/index.ts
git commit -m "feat(ui): DetailHeader para pagina de detalhe"
```

---

## Task 20: as 7 tabelas trocam `AppCardFooter` por `footerCount`

**Files:**
- Modify: `frontend/src/shared/hooks/useTableFilter.ts`
- Modify: `frontend/src/features/commercial/components/Client/ClientsTable.tsx`
- Modify: `frontend/src/features/commercial/components/Budget/BudgetsTable.tsx`
- Modify: `frontend/src/features/operation/components/Turma/TurmasTable.tsx`
- Modify: `frontend/src/features/catalog/components/Course/CoursesTable.tsx`
- Modify: `frontend/src/features/identity/components/Admin/UsersTable.tsx`
- Modify: `frontend/src/features/identity/components/Admin/RolesTable.tsx`
- Modify: `frontend/src/features/identity/components/Redator/RedatoresTable.tsx`
- Modify: `.claude/rules/frontend-fsliced.md`

**Interfaces:**
- Consumes: `footerCount` da Task 18.
- Produces: `TableFilter<T>` perde o campo `paginator`. `first`, `onPage`, `resetPage`, `clear`,
  `filter`, `term` e `rows` seguem iguais. Nenhuma outra task depende de `paginator`.

**Executor:** `codex` (ver `## Handoff de execução — Parte 3`).

- [ ] **Step 1: Tirar `paginator` do `useTableFilter`**

Em `frontend/src/shared/hooks/useTableFilter.ts`, remova as duas ocorrências — a declaração na
interface e o campo no retorno:

Na interface `TableFilter<T>`, apague estas 3 linhas:

```ts
  /** Liga o paginador só quando há mais de uma página (spec D6: uma faixa só). */
  paginator: boolean
```

No objeto retornado, apague esta linha:

```ts
    paginator: rows.length > 10,
```

E troque o segundo parágrafo do docblock do hook por:

```ts
 * Estado de busca e paginação de uma tabela em card. Os 6 consumidores repetiam
 * este bloco literalmente, e a duplicação rendeu dois defeitos no review da
 * Parte 2: o paginador default ligado na `RolesTable` (duas faixas, contra D6) e
 * o empty state falso durante o loading. Contrato fixado em
 * `.claude/rules/frontend-fsliced.md`.
 *
 * Quando ligar o paginador não é decisão do hook nem da tela: quem sabe quantas
 * linhas cabem na página é o `AppDataTable`, que exibe os controles só quando
 * `value.length > rows` (spec D12).
```

- [ ] **Step 2: Trocar o rodapé nas 7 tabelas**

Em cada arquivo, três edições mecânicas:

1. **Import** — remover `AppCardFooter` da lista importada de `@shared/ui`. `AppCardToolbar` e
   `AppEmptyState` ficam.
2. **`AppDataTable`** — remover a linha `paginator={table.paginator}` (em `RolesTable`,
   `paginator={roles.length > 10}`) e acrescentar `footerCount` com **a mesma chave i18n e a mesma
   contagem** que o `AppCardFooter` usava. `first={table.first}` e `onPage={table.onPage}` **ficam**:
   é o reset de página ao filtrar, corrigido na Parte 1.
3. **Rodapé** — apagar a linha `<AppCardFooter count={...} />`. Se o `return` virar um único
   elemento, o fragmento `<>...</>` continua necessário por causa do `AppCardToolbar`; só a
   `RolesTable` fica com toolbar + tabela e mantém o fragmento igual.

Mapa exato de `footerCount` por arquivo (copiar a expressão do `AppCardFooter` que está sendo
apagado):

| Arquivo | `footerCount` |
|---|---|
| `ClientsTable.tsx` | `{t('client.count', { count: table.rows.length })}` |
| `BudgetsTable.tsx` | `{t('budget.count', { count: table.rows.length })}` |
| `TurmasTable.tsx` | `{t('operation.table.count', { count: table.rows.length })}` |
| `CoursesTable.tsx` | `{t('course.count', { count: table.rows.length })}` |
| `UsersTable.tsx` | `{t('admin.count', { count: table.rows.length })}` |
| `RolesTable.tsx` | `{t('role.count', { count: roles.length })}` |
| `RedatoresTable.tsx` | `{t('redator.count', { count: table.rows.length })}` |

Exemplo completo, `ClientsTable.tsx` — o `AppDataTable` fica assim e o `<AppCardFooter …/>` some:

```tsx
      <AppDataTable
        value={table.rows}
        loading={loading}
        emptyMessage={empty}
        footerCount={t('client.count', { count: table.rows.length })}
        first={table.first}
        onPage={table.onPage}
      >
```

E a `RolesTable`, que não usa `useTableFilter`:

```tsx
      <AppDataTable
        value={roles}
        loading={loading}
        emptyMessage={empty}
        footerCount={t('role.count', { count: roles.length })}
      >
```

- [ ] **Step 3: Atualizar o contrato na rule**

Em `.claude/rules/frontend-fsliced.md`, substitua o bullet **"Tabela em card"** inteiro por:

```markdown
- **Tabela em card = `useTableFilter` + `AppCardToolbar` + `footerCount`.** Busca, `first` controlado
  e `clear()` vêm do hook (`shared/hooks/useTableFilter.ts`); a feature só declara `searchable` e,
  quando tem filtro próprio, `where`. **O rodapé é o paginador:** passe `footerCount` ao
  `AppDataTable` e não renderize `AppCardFooter` junto de tabela — o wrapper exibe a faixa sempre e
  os controles de página só quando passa de `rows` (spec D12). Reescrever o bloco na feature foi o
  que rendeu, em 6 cópias, um `RolesTable` com o paginador default ligado (duas faixas, contra a spec
  D6) e um empty state falso durante o loading. A supressão do vazio durante `loading` é do
  `AppDataTable`, não do chamador — **não** reintroduzir `emptyMessage={loading ? undefined : empty}`,
  que cai no default inglês do PrimeReact (`No available options`). Nunca fatiar a página fora do
  `DataTable`: com coluna `sortable`, ordenar a página em vez do conjunto é regressão silenciosa.
```

- [ ] **Step 4: Verificar**

De `frontend/`:

```bash
pnpm lint && pnpm build
```

Esperado: ambos sem erro. Depois, a prova de que nenhuma tabela ficou com o rodapé antigo:

```bash
grep -rn "AppCardFooter\|table.paginator" src/features
```

Esperado: **nenhuma linha**. `AppCardFooter` continua existindo em `src/shared/ui/AppCard/AppCard.tsx`
para card sem tabela — a busca acima é só em `src/features`.

- [ ] **Step 5: Provar na tela**

`pnpm dev`, nos dois temas:

- http://localhost:5173/comercial — uma faixa só embaixo da tabela, `4 clientes` à esquerda, sem
  controles de página. Trocar para Presupuestos: `6 presupuestos`, mesma faixa.
- http://localhost:5173/operacion — `4 turmas`, sem controles.
- Buscar `zzz` em Comercial: empty state de busca, e a faixa mostra `0 clientes`.
- Ordenar por `Razón social` em Comercial: a ordenação vale para a lista inteira (com 4 clientes,
  confirmar que a ordem muda e a contagem não).

- [ ] **Step 6: Commit**

```bash
git add frontend/src/shared/hooks/useTableFilter.ts frontend/src/features .claude/rules/frontend-fsliced.md
git commit -m "refactor(ui): rodape das 7 tabelas passa a ser o paginador (D12)"
```

---

## Task 21: `BudgetDetailPage` — `DetailHeader` e os três cards `stat`

**Files:**
- Modify: `frontend/src/features/commercial/components/Budget/BudgetDetailPage.tsx`

**Interfaces:**
- Consumes: `DetailHeader` (Task 19), `AppCard` com `variant="stat"` e `tone` (Task 10).
- Produces: nada para outras tasks. O componente local `TotalCard` **deixa de existir**.

- [ ] **Step 1: Trocar o cabeçalho e os totais**

Em `BudgetDetailPage.tsx`:

1. No import de `@shared/ui`, acrescente `DetailHeader` e `AppCard`.
2. Troque as linhas de `loading`/`notFound` por versões sem cor fixa:

```tsx
  if (d.loading) return <p className="p-4 text-sm" style={{ color: 'var(--text-color-secondary)' }}>{t('common.loading')}</p>
  if (!d.budget) return <p className="p-4 text-sm" style={{ color: 'var(--text-color-secondary)' }}>{t('budget.notFound')}</p>
```

3. Substitua o `<button>` de voltar **e** o `<header>` inteiro por:

```tsx
      <DetailHeader
        back={{ label: t('budget.back'), onClick: d.goBack }}
        title={budget.code}
        subtitle={
          <>
            {d.client?.legal_name ?? '—'}
            {d.client?.rut && ` · RUT ${d.client.rut}`}
          </>
        }
        tags={
          budget.status && (
            <AppTag value={t(`quoteStatus.${budget.status}`)} severity={quoteStatusSeverity(budget.status)} />
          )
        }
        actions={
          <>
            {/* Ação primária primeiro; destrutivo por último (UI-B5). */}
            <AppButton
              variant="brandIcon"
              label={t('budget.addQuote')}
              icon="pi pi-file"
              onClick={() => d.openWizard(null)}
            />
            {/* Único caminho de edição: o backend só deixa payment_terms mudar. */}
            <AppButton label={t('common.edit')} icon="pi pi-pencil" outlined onClick={d.openEdit} />
            <AppButton
              label={t('common.delete')}
              icon="pi pi-trash"
              outlined
              severity="danger"
              onClick={d.askDeleteBudget}
            />
          </>
        }
      />
```

Como o `DetailHeader` já tem `mb-6`, troque o wrapper externo `<div className="space-y-6">` por
`<div>` e passe a espaçar o corpo: envolva tudo **abaixo** do `DetailHeader` num
`<div className="space-y-6">`.

4. Substitua o grid de totais e apague a função `TotalCard` do fim do arquivo:

```tsx
      {/* Os três totais vêm SOMADOS do backend (bcmath). A UI nunca soma UF. */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label={t('budget.totalQuoted')} value={budget.total_value_uf} />
        <StatCard label={t('budget.totalApproved')} value={budget.total_approved_uf} tone="success" />
        <StatCard label={t('budget.totalRejected')} value={budget.total_rejected_uf} tone="danger" />
      </div>
```

E no fim do arquivo, no lugar de `TotalCard`:

```tsx
/** O número É o sinal: o `AppCard variant="stat"` já tinge texto, fundo e borda
 * pelo `tone`, então aqui não há cor nenhuma — só composição. */
function StatCard({ label, value, tone }: { label: string; value?: string; tone?: AppCardTone }) {
  return (
    <AppCard variant="stat" tone={tone}>
      <p className="text-2xl font-semibold">{formatUf(value ?? '0')} UF</p>
      <p className="mt-1 text-sm" style={{ color: 'var(--text-color-secondary)' }}>{label}</p>
    </AppCard>
  )
}
```

O tipo `AppCardTone` entra no import de `@shared/ui` como `import type`.

- [ ] **Step 2: Verificar build**

```bash
pnpm lint && pnpm build
```

Esperado: ambos sem erro.

- [ ] **Step 3: Provar na tela**

`pnpm dev`, http://localhost:5173/comercial → aba Presupuestos → abrir um orçamento com cotações
aprovadas **e** rejeitadas (o seeder cria: `students: 12` aprovada, `students: 8` rejeitada).

Esperado, nos dois temas: `← Volver a Comercial` acima do título; código do orçamento como título;
cliente · RUT como subtítulo; tag de estado seguida dos três botões, na ordem
`Agregar cotización` → `Editar` → `Eliminar`; três cards lado a lado com o total em cima e o rótulo
embaixo — `Total cotizado` neutro, `Total aprobado` verde, `Total rechazado` vermelho, cada um com
fundo tingido e borda da mesma família. No tema escuro os três precisam continuar legíveis (o
`color-mix` com `--surface-card` cuida disso; se algum ficou lavado, o tom está errado, não o tema).

- [ ] **Step 4: Commit**

```bash
git add frontend/src/features/commercial/components/Budget/BudgetDetailPage.tsx
git commit -m "feat(commercial): DetailHeader e stat cards no detalhe de orcamento"
```

---

## Task 22: Cotizaciones vira `AppCard` com cabeçalho e contagem

**Files:**
- Modify: `frontend/src/features/commercial/components/Budget/BudgetDetailPage.tsx`
- Modify: `frontend/src/features/commercial/components/Budget/QuotesList.tsx`

**Interfaces:**
- Consumes: `AppCard`, `AppCardHeader` (Tasks 1 e 10).
- Produces: nada para outras tasks.

- [ ] **Step 1: Trocar a `<section>` de cotizaciones pelo card**

Em `BudgetDetailPage.tsx`, substitua a `<section>` de Cotizaciones inteira por:

```tsx
      <AppCard>
        <AppCardHeader title={t('budget.quotes')} count={budget.quotes.length} />
        <QuotesList
          quotes={budget.quotes}
          onEdit={(q) => d.openWizard(q)}
          onRemove={(q) => d.askConfirm('remove', q)}
          onApprove={d.canApprove ? (q) => d.askConfirm('approve', q) : undefined}
          onReject={d.canApprove ? (q) => d.askConfirm('reject', q) : undefined}
        />
      </AppCard>
```

O `(3)` em texto sai: a contagem agora é o badge do `AppCardHeader`. Acrescente `AppCardHeader` ao
import de `@shared/ui`.

- [ ] **Step 2: Alternância e cor na `QuotesList`**

A lista de cotizaciones **mantém a alternância de fundo** — é lista de itens empilhados, não tabela,
e D4 ("sem zebra") vale para tabela. Em `QuotesList.tsx`:

1. Vazio sem cor fixa:

```tsx
  if (quotes.length === 0) {
    return <p className="p-4 text-sm" style={{ color: 'var(--text-color-secondary)' }}>{t('budget.noQuotes')}</p>
  }
```

2. Troque o wrapper e o item do `map`. O separador vira `--surface-border` e a alternância vira
   `--surface-section` por índice — inline, porque a cor tem de acompanhar o tema (ADR-16):

```tsx
    <div>
      <div className="m-4 empty:m-0">
        <FormErrorBanner message={fileError} />
      </div>
      {quotes.map((q, i) => (
        <div
          key={q.id}
          className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t p-4 first:border-t-0"
          style={{
            borderColor: 'var(--surface-border)',
            // Alternância como separação de item (spec D4): lista empilhada, não tabela.
            background: i % 2 === 1 ? 'var(--surface-section)' : 'transparent',
          }}
        >
```

3. Nos filhos do item, troque as duas cores fixas restantes:

```tsx
            <p className="mt-1 text-sm" style={{ color: 'var(--text-color-secondary)' }}>
```

```tsx
            {q.status === 'rejected' && (
              <p className="mt-1 text-sm" style={{ color: 'var(--red-500)' }}>{t('quote.rejectedNote')}</p>
            )}
```

4. E o rótulo `Documentos` de cada cotação:

```tsx
              <span className="text-xs font-semibold uppercase" style={{ color: 'var(--text-color-secondary)' }}>
                {t('quote.documents')}
              </span>
```

- [ ] **Step 3: Verificar build**

```bash
pnpm lint && pnpm build
```

Esperado: ambos sem erro.

- [ ] **Step 4: Provar na tela**

Mesmo orçamento da Task 21, nos dois temas. Esperado: card com cabeçalho `Cotizaciones` + badge com
o número, borda separando o cabeçalho da lista, itens alternando fundo (1º transparente, 2º
tingido), o aviso de cotização rejeitada em vermelho legível nos dois temas, e os botões
`Aprobar`/`Rechazar` no mesmo lugar de antes. Aprovar uma cotização pendente contra a API real e
conferir que o card de `Total aprobado` (Task 21) sobe.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/commercial/components/Budget/BudgetDetailPage.tsx frontend/src/features/commercial/components/Budget/QuotesList.tsx
git commit -m "feat(commercial): card de cotizaciones com contagem e alternancia"
```

---

## Task 23: Documentos do orçamento — card com ação no cabeçalho e ícone tipado

**Files:**
- Modify: `frontend/src/features/commercial/components/Budget/BudgetDetailPage.tsx`
- Modify: `frontend/src/features/commercial/components/Budget/FileList.tsx`

**Interfaces:**
- Consumes: `AppCard`, `AppCardHeader`.
- Produces: nada para outras tasks. `FileList` mantém a assinatura
  `{ files: FileData[]; onRemove?: (fileId: number) => void }` — `QuotesList` também a usa.

- [ ] **Step 1: Card de documentos com dropdown e upload no cabeçalho**

Em `BudgetDetailPage.tsx`, substitua a `<section>` de Documentos por:

```tsx
      <AppCard>
        <AppCardHeader
          title={t('budget.documents')}
          count={budget.files?.length ?? 0}
          actions={
            <>
              <div className="w-44">
                <AppDropdown
                  value={d.fileType}
                  options={[
                    { label: t('budget.fileTypeInvoice'), value: 'invoice' },
                    { label: t('budget.fileTypeReceipt'), value: 'receipt' },
                  ]}
                  onChange={(e) => d.setFileType(e.value as BudgetFileType)}
                />
              </div>
              <AppFileUpload
                chooseOptions={{ icon: 'pi pi-upload' }}
                chooseLabel={t('budget.uploadDocument')}
                disabled={d.uploadPending}
                uploadHandler={d.handleUpload}
              />
            </>
          }
        />
        <div className="mx-4 mt-4 empty:m-0">
          <FormErrorBanner message={d.fileError} />
        </div>
        <FileList files={budget.files ?? []} onRemove={(fileId) => d.removeFile(fileId)} />
      </AppCard>
```

- [ ] **Step 2: Ícone tipado e meta no `FileList`**

Substitua o corpo de `FileList.tsx` por:

```tsx
import { useTranslation } from 'react-i18next'
import { AppButton } from '@shared/ui'
import type { FileData } from '@shared/types/generated'

const KB = 1024

/** Ícone e cor por extensão. O protótipo mostra o PDF em quadrado arredondado
 * vermelho; os outros tipos seguem a mesma forma com a cor da família. Cor por
 * palette var do Lara, composta com --surface-card no fundo para funcionar nos
 * dois temas (os palette vars não invertem). */
function fileIcon(name: string): { icon: string; hue: string } {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  if (ext === 'pdf') return { icon: 'pi pi-file-pdf', hue: 'var(--red-500)' }
  if (ext === 'xlsx' || ext === 'xls' || ext === 'csv') return { icon: 'pi pi-file-excel', hue: 'var(--green-500)' }
  if (ext === 'png' || ext === 'jpg' || ext === 'jpeg') return { icon: 'pi pi-image', hue: 'var(--blue-500)' }
  return { icon: 'pi pi-file', hue: 'var(--text-color-secondary)' }
}

export function FileList({ files, onRemove }: { files: FileData[]; onRemove?: (fileId: number) => void }) {
  const { t } = useTranslation()

  if (files.length === 0) {
    return <p className="px-4 pb-4 text-sm" style={{ color: 'var(--text-color-secondary)' }}>{t('budget.noDocuments')}</p>
  }

  return (
    <ul>
      {files.map((f) => {
        const { icon, hue } = fileIcon(f.original_name)
        return (
          <li
            key={f.id}
            className="flex items-center gap-3 border-t px-4 py-3 first:border-t-0"
            style={{ borderColor: 'var(--surface-border)' }}
          >
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
              style={{ background: `color-mix(in srgb, ${hue} 12%, var(--surface-card))`, color: hue }}
            >
              <i className={icon} aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{f.original_name}</p>
              <p className="text-xs" style={{ color: 'var(--text-color-secondary)' }}>
                {f.created_at ? new Date(f.created_at).toLocaleDateString() : ''}
                {' · '}
                {Math.round(f.size / KB)} KB
              </p>
            </div>
            <a href={f.download_url} target="_blank" rel="noreferrer">
              <AppButton icon="pi pi-download" text rounded aria-label={t('common.download')} />
            </a>
            {onRemove && (
              <AppButton icon="pi pi-trash" text rounded severity="danger" aria-label={t('common.delete')} onClick={() => onRemove(f.id)} />
            )}
          </li>
        )
      })}
    </ul>
  )
}
```

- [ ] **Step 3: Verificar build**

```bash
pnpm lint && pnpm build
```

Esperado: ambos sem erro.

- [ ] **Step 4: Provar na tela**

Mesmo orçamento, nos dois temas. O seeder sobe 17 arquivos no MinIO, então há PDF para ver.

Esperado: card `Documentos` com badge de contagem, dropdown de tipo e botão de upload **no
cabeçalho**; cada arquivo com quadrado arredondado vermelho e ícone de PDF, nome, `data · KB` e
ícone de download à direita. Baixar um arquivo pelo ícone (abre em nova aba). Subir um PDF novo e
conferir que ele aparece na lista sem recarregar a página.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/commercial/components/Budget
git commit -m "feat(commercial): card de documentos com icone tipado por extensao"
```

---

## Task 24: `TurmaDetailPage` — `DetailHeader` com tags e as cinco abas dentro do card

**Files:**
- Modify: `frontend/src/features/operation/components/Turma/TurmaDetailPage.tsx`

**Interfaces:**
- Consumes: `DetailHeader` (Task 19), `AppCard` (Task 1), `turmaModalidadeTagProps` (Task 12).
- Produces: as abas passam a viver dentro de um `AppCard`; as Tasks 25 e 26 compõem o **interior**
  dos painéis assumindo esse contexto (fundo `--surface-card`, `panelContainer` sem padding).

- [ ] **Step 1: Reescrever o corpo**

Em `TurmaDetailPage.tsx`:

1. Import: acrescente `DetailHeader` e `AppCard` a `@shared/ui`; acrescente `turmaModalidadeTagProps`
   ao import de `../../lib/turmaStatus`.
2. `loading`/`notFound` sem cor fixa:

```tsx
  if (d.loading) return <p className="p-4 text-sm" style={{ color: 'var(--text-color-secondary)' }}>{t('common.loading')}</p>
  if (!d.turma) return <p className="p-4 text-sm" style={{ color: 'var(--text-color-secondary)' }}>{t('operation.detail.notFound')}</p>
```

3. Substitua o `<button>` de voltar e o `<header>` por:

```tsx
      <DetailHeader
        back={{ label: t('operation.detail.back'), onClick: d.goBack }}
        title={turma.course_name ?? '—'}
        subtitle={
          <>
            {turma.client_name ?? '—'}
            {turma.budget_id != null && (
              <>
                {' · '}
                <button
                  type="button"
                  className="hover:underline"
                  style={{ color: 'var(--primary-color)' }}
                  onClick={() => d.goToBudget(turma.budget_id!)}
                >
                  {t('operation.detail.relatedTo', { budget: turma.budget_code ?? '—', quote: turma.quote_code ?? '—' })}
                </button>
              </>
            )}
          </>
        }
        tags={
          <>
            <AppTag value={t(`operation.status.${status}`)} severity={turmaStatusSeverity(status)} />
            <AppTag value={t(`operation.modality.${turma.modalidade}`)} {...turmaModalidadeTagProps(turma.modalidade)} />
          </>
        }
      />
```

O link para o orçamento entra no subtítulo em vez de virar uma terceira linha: o protótipo mostra
título + uma linha de identificação, e o `text-sky-600` fixo morre junto (ADR-16).

4. Envolva as abas no card, trocando o wrapper externo `<div className="space-y-6">` por `<div>`:

```tsx
      <AppCard>
        <AppTabView activeIndex={tab} onTabChange={(e) => setTab(e.index)}>
```

fechando com `</AppTabView>` e `</AppCard>`.

- [ ] **Step 2: Verificar build**

```bash
pnpm lint && pnpm build
```

Esperado: ambos sem erro.

- [ ] **Step 3: Provar na tela**

`pnpm dev`, http://localhost:5173/operacion → abrir uma turma **online** e uma **presencial** (o
seeder cria as duas modalidades), nos dois temas.

Esperado: `← Volver a Operación`; título com o nome do curso; subtítulo com cliente · vínculo
clicável (que ainda navega para o orçamento); à direita, duas tags — estado (`En curso` azul,
`Habilitada` âmbar ou `Concluida` verde) e modalidade (`Presencial` neutro, `Online` **roxo**). As
cinco abas dentro de um card só, com a barra de abas encostada na borda do card, sem faixa branca
sobrando no tema escuro.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/features/operation/components/Turma/TurmaDetailPage.tsx
git commit -m "feat(operation): DetailHeader com tags e abas dentro do card"
```

---

## Task 25: Aba Alumnos — toolbar, faixa de rodapé com paginação real e fim do `window.confirm`

**Files:**
- Modify: `frontend/src/features/operation/components/Enrollment/EnrollmentSection.tsx`
- Modify: `frontend/src/features/operation/components/Enrollment/EnrollmentTable.tsx`
- Modify: `frontend/src/features/operation/hooks/useEnrollmentSection.ts`
- Modify: `frontend/src/shared/config/locales/es-CL.json`
- Modify: `frontend/src/shared/config/locales/pt-BR.json`
- Modify: `frontend/src/shared/config/locales/en.json`

**Interfaces:**
- Consumes: `footerCount` (Task 18), `AppCardToolbar` (Task 1), `AppEmptyState` (Task 2),
  `ConfirmDialog` (já existe em `shared/ui`).
- Produces: **fecha P-11** — `grep -rn "window.confirm" frontend/src` fica vazio.

Esta é a task onde a faixa unificada tem caso real: o `OperationDemoSeeder` cria turmas com **12** e
**15** matrículas, acima do `rows={10}`. Nenhuma tabela das Partes 1 e 2 passa de 10 linhas.

- [ ] **Step 1: Duas chaves novas nos 3 locales**

Em `es-CL.json`, dentro de `operation.enrollment`, junto de `empty`:

```json
      "emptyHint": "Agrega alumnos uno a uno o importa una planilla para comenzar.",
      "removeTitle": "¿Quitar matrícula?",
```

`pt-BR.json`:

```json
      "emptyHint": "Adicione alunos um a um ou importe uma planilha para começar.",
      "removeTitle": "Remover matrícula?",
```

`en.json`:

```json
      "emptyHint": "Add students one by one or import a spreadsheet to start.",
      "removeTitle": "Remove enrollment?",
```

Rode o **script de paridade** (bloco da Parte 2) de dentro de
`frontend/src/shared/config/locales/`. Esperado: `es-pt: []` e `es-en: []`.

- [ ] **Step 2: Confirmação de remoção sai do `window.confirm`**

Em `useEnrollmentSection.ts`, o docblock explica o `window.confirm` que está saindo. Substitua o
arquivo inteiro por:

```ts
import type { TurmaData } from '@shared/types/generated'
import { useMutationErrors } from '@shared/hooks'
import { useEnrollments, useRemoveEnrollment } from '../api/useEnrollments'

/** Orquestra a lista/remoção da aba Alumnos. O componente só consome.
 *
 * A confirmação de remoção usa o `ConfirmDialog` de `shared/ui` (P-11 fechada na
 * Parte 3 do bloco visual): `window.confirm` não é estilizável, não respeita o
 * tema e não mostra erro de mutação. */
export function useEnrollmentSection(turma: TurmaData) {
  const turmaId = turma.id!
  const list = useEnrollments(turmaId)
  const removeMutation = useRemoveEnrollment()
  const { message: error } = useMutationErrors([removeMutation.error])

  const remove = (enrollmentId: number, options?: { onSuccess?: () => void }) =>
    removeMutation.mutate({ turmaId, enrollmentId }, { onSuccess: options?.onSuccess })

  return {
    enrollments: list.data ?? [],
    loading: list.isLoading,
    remove,
    removing: removeMutation.isPending,
    error,
    resetRemove: () => removeMutation.reset(),
  }
}
```

- [ ] **Step 3: `EnrollmentTable` com faixa, empty state e diálogo**

Substitua `EnrollmentTable.tsx` inteiro por:

```tsx
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AppDataTable, AppColumn, AppAvatar, AppTag, AppButton, AppEmptyState, ConfirmDialog } from '@shared/ui'
import type { EnrollmentData } from '@shared/types/generated'
import { enrollmentStatusLabelKey, enrollmentStatusSeverity } from '../../lib/enrollmentStatus'

type Props = {
  enrollments: EnrollmentData[]
  loading: boolean
  onRemove: (enrollmentId: number, options?: { onSuccess?: () => void }) => void
  removing: boolean
  removeError?: string
  onResetRemove: () => void
}

// Sem coluna CLIENTE: EnrollmentData não expõe cliente (a turma tem um único
// cliente, já mostrado no cabeçalho da página) — desvio consciente da spec
// (§3), não uma lacuna.
export function EnrollmentTable({ enrollments, loading, onRemove, removing, removeError, onResetRemove }: Props) {
  const { t } = useTranslation()
  const [pending, setPending] = useState<EnrollmentData | null>(null)

  return (
    <>
      <AppDataTable
        value={enrollments}
        loading={loading}
        footerCount={t('operation.enrollment.footerCount', { count: enrollments.length })}
        emptyMessage={
          // Sem ação: matricular é o botão da toolbar, logo acima.
          <AppEmptyState
            icon="pi pi-users"
            title={t('operation.enrollment.empty')}
            description={t('operation.enrollment.emptyHint')}
          />
        }
      >
        <AppColumn
          header={t('operation.enrollment.table.name')}
          body={(e: EnrollmentData) => (
            <div className="flex items-center gap-3">
              <AppAvatar name={e.name} />
              <span className="font-medium">{e.name}</span>
            </div>
          )}
        />
        <AppColumn header={t('operation.enrollment.table.rut')} field="rut" />
        <AppColumn
          header={t('operation.enrollment.table.status')}
          body={(e: EnrollmentData) =>
            e.approval_status ? (
              <AppTag
                value={t(enrollmentStatusLabelKey(e.approval_status))}
                severity={enrollmentStatusSeverity(e.approval_status)}
              />
            ) : null
          }
        />
        <AppColumn
          body={(e: EnrollmentData) => (
            <AppButton
              icon="pi pi-times"
              text
              rounded
              severity="danger"
              disabled={removing}
              aria-label={t('operation.enrollment.remove')}
              onClick={() => setPending(e)}
            />
          )}
          style={{ width: '4rem' }}
        />
      </AppDataTable>

      <ConfirmDialog
        visible={pending !== null}
        title={t('operation.enrollment.removeTitle')}
        message={t('operation.enrollment.removeConfirm', { name: pending?.name ?? '' })}
        confirmLabel={t('operation.enrollment.remove')}
        severity="danger"
        pending={removing}
        error={removeError}
        onConfirm={() => {
          if (pending?.id == null || removing) return
          onRemove(pending.id, { onSuccess: () => setPending(null) })
        }}
        onCancel={() => {
          onResetRemove()
          setPending(null)
        }}
      />
    </>
  )
}
```

O `if (enrollments.length === 0) return <p>` some: o vazio agora é o `emptyMessage` da tabela, que já
sabe se calar durante o `loading` (correção C1).

- [ ] **Step 4: `EnrollmentSection` com a toolbar do card**

Substitua o corpo do `return` em `EnrollmentSection.tsx` por:

```tsx
  return (
    <>
      <AppCardToolbar
        // Grupo de botões à ESQUERDA, sem busca — é o que o protótipo mostra na
        // aba Alumnos (packet, "Aba sem busca").
        start={
          <>
            <AppButton
              variant="brandIcon"
              label={t('operation.enrollment.importSheet')}
              icon="pi pi-upload"
              onClick={() => setImportOpen(true)}
            />
            <AppButton
              label={t('operation.enrollment.addStudent')}
              icon="pi pi-user-plus"
              outlined
              onClick={() => setAddOpen(true)}
            />
          </>
        }
      />

      <div className="mx-4 empty:m-0">
        <FormErrorBanner message={s.error} />
      </div>

      <EnrollmentTable
        enrollments={s.enrollments}
        loading={s.loading}
        onRemove={s.remove}
        removing={s.removing}
        removeError={s.error}
        onResetRemove={s.resetRemove}
      />

      <EnrollStudentForm
        turmaId={turma.id!}
        turmaClientName={turma.client_name ?? null}
        visible={addOpen}
        onHide={() => setAddOpen(false)}
      />
      <ImportDialog turmaId={turma.id!} visible={importOpen} onHide={() => setImportOpen(false)} />
    </>
  )
```

Ajuste o import para `import { AppButton, AppCardToolbar, FormErrorBanner } from '@shared/ui'` e
**remova** o early-return de `loading` — quem mostra o carregamento agora é a tabela (`loading`
prop), e sumir com a toolbar durante o refetch faz a tela pular. A contagem em `<p>` no fim também
sai: virou o `footerCount`.

- [ ] **Step 5: Verificar**

```bash
pnpm lint && pnpm build
grep -rn "window.confirm" src
```

Esperado: lint e build sem erro; o `grep` **sem nenhuma linha** — P-11 fechada.

- [ ] **Step 6: Provar na tela**

`pnpm dev`, nos dois temas:

1. Abrir a turma de **15 matrículas** (curso `seguridad`, 15 alunos no seeder) → aba `Alumnos`.
   Esperado: os dois botões à **esquerda**, acima da tabela, sem campo de busca; 10 linhas; **uma
   única faixa** no rodapé com `15 alumnos matriculados` à esquerda e `‹ 1 2 ›` à direita. Ir para a
   página 2: 5 linhas, contagem inalterada.
2. Abrir a turma de **12 matrículas** (curso `lineas220`): mesma faixa, `12 alumnos matriculados`,
   duas páginas.
3. Abrir uma turma com poucas matrículas: mesma faixa, sem controles de página.
4. Clicar no `×` de uma matrícula: abre o `ConfirmDialog` com o nome do aluno — **não** o alerta do
   navegador. Cancelar não remove. Confirmar remove e a contagem da faixa cai.
5. Provocar erro de remoção (turma concluída, RN-15): a mensagem aparece **dentro do diálogo**, com
   texto, e o diálogo não fecha.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/features/operation frontend/src/shared/config/locales
git commit -m "feat(operation): aba Alumnos com faixa unica, empty state e ConfirmDialog (P-11)"
```

---

## Task 26: Banners e progresso das abas sem cor fixa

**Files:**
- Modify: `frontend/src/shared/ui/AppCard/AppCard.tsx`
- Modify: `frontend/src/features/operation/components/Document/TurmaDocuments.tsx`
- Modify: `frontend/src/features/operation/components/Document/ConcludePanel.tsx`

**Interfaces:**
- Consumes: `AppCard` com `tone` (Task 10).
- Produces: `AppCardTone` ganha `'warning'`. Aditivo, como a Task 10 fez com `info`.

Escopo limitado por D14: só o que o fundo novo do card afeta. `DocumentTypeCard`, `TurmaConfigCard`
e `RedatorDesignation` ficam para a Parte 4.

- [ ] **Step 1: Tom `warning` no `AppCard`**

Em `AppCard.tsx`, três linhas:

```ts
export type AppCardTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger'
```

```ts
  warning: 'var(--yellow-500)',
```

(em `TONE_HUE`, entre `success` e `danger`)

```ts
  warning: 'color-mix(in srgb, var(--yellow-500) 70%, var(--text-color))',
```

(em `TONE_TEXT`, na mesma posição)

- [ ] **Step 2: `TurmaDocuments` — banners e barra de progresso**

Em `TurmaDocuments.tsx`:

1. Import: `import { AppCard, ConfirmDialog, FormErrorBanner } from '@shared/ui'`.
2. `loading` sem cor fixa:

```tsx
  if (s.loading) return <p className="p-4 text-sm" style={{ color: 'var(--text-color-secondary)' }}>{t('common.loading')}</p>
```

3. Cabeçalho, progresso e banners:

```tsx
        <div>
          <h3 className="font-medium">{t('operation.documents.title')}</h3>
          <p className="text-sm" style={{ color: 'var(--text-color-secondary)' }}>
            {t('operation.documents.progress', { done: s.deliveredCount, total: s.totalTypes })}
          </p>
          <div className="mt-2 h-2 w-64 rounded" style={{ background: 'var(--surface-section)' }}>
            <div
              className="h-2 rounded transition-[width]"
              style={{ width: `${(s.deliveredCount / s.totalTypes) * 100}%`, background: 'var(--green-500)' }}
            />
          </div>
        </div>
```

```tsx
      <FormErrorBanner message={s.error} />

      {s.habilitada && !s.concluida && (
        <AppCard tone="success" className="px-3 py-2 text-sm">
          {t('operation.documents.enabled')}
        </AppCard>
      )}

      {s.lockReason && (
        <AppCard tone="info" className="px-3 py-2 text-sm">
          {t(`operation.documents.lock.${s.lockReason}`)}
        </AppCard>
      )}
```

O `<p className="text-sm text-red-600">{s.error}</p>` sai: erro de mutação já tem componente próprio
(`FormErrorBanner`), que é o padrão do kit de form.

- [ ] **Step 3: `ConcludePanel` — banners**

Em `ConcludePanel.tsx`, import `import { AppButton, AppCard, AppTag, ConfirmDialog } from '@shared/ui'`
e troque os quatro blocos com cor fixa:

```tsx
      {s.concluida ? (
        <AppCard tone="success" className="px-3 py-2 text-sm">
          {s.concludedAt
            ? t('operation.conclusion.concludedAt', { date: formatDate(new Date(s.concludedAt)) })
            : t('operation.conclusion.state.concluida')}
        </AppCard>
      ) : (
        <>
          {s.habilitada ? (
            <p className="text-sm" style={{ color: 'var(--text-color-secondary)' }}>{t('operation.conclusion.ready')}</p>
          ) : (
            <AppCard tone="warning" className="px-3 py-2 text-sm">
              <p>{t('operation.conclusion.missingTitle')}</p>
              <ul className="mt-1 list-inside list-disc">
                {s.missingTypes.map((type) => (
                  <li key={type}>{t(`operation.documents.type.${type}`)}</li>
                ))}
              </ul>
            </AppCard>
          )}

          <p className="text-sm" style={{ color: 'var(--text-color-secondary)' }}>{t('operation.conclusion.warning')}</p>
```

e, no ramo sem permissão:

```tsx
            <p className="text-sm" style={{ color: 'var(--text-color-secondary)' }}>{t('operation.conclusion.noPermission')}</p>
```

- [ ] **Step 4: Verificar**

```bash
pnpm lint && pnpm build
grep -rn "slate-\|emerald-\|amber-\|red-600" src/features/operation/components/Document/TurmaDocuments.tsx src/features/operation/components/Document/ConcludePanel.tsx src/features/operation/components/Turma/TurmaDetailPage.tsx src/features/operation/components/Enrollment/EnrollmentSection.tsx
```

Esperado: lint e build sem erro; o `grep` **sem nenhuma linha** nesses quatro arquivos.

- [ ] **Step 5: Provar na tela**

`pnpm dev`, nos dois temas, no detalhe de turma:

1. Aba `Documentación` de uma turma **habilitada**: banner verde tingido com borda da mesma família,
   legível no escuro; barra de progresso cinza com preenchimento verde.
2. Aba `Documentación` de uma turma **concluída**: banner de bloqueio azul com o texto de RN-15.
3. Aba `Conclusión` de uma turma **sem documentação completa**: banner âmbar com a lista de tipos
   faltantes.
4. Aba `Conclusión` de uma turma **concluída**: banner verde com a data.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/shared/ui/AppCard frontend/src/features/operation/components/Document
git commit -m "refactor(ui): banners e progresso das abas por variavel do tema"
```

---

# Handoff de execução — Parte 3

**executor:** `claude` nas Tasks 18, 19 e 21 a 26; `codex` na Task 20.

| Task | Executor | Por quê |
|---|---|---|
| 18 | `claude` | Muda o contrato do `AppDataTable`, consumido por 8 telas. Erro aqui não é local. |
| 19 | `claude` | Componente novo em `shared/ui`; decisão de contrato (D13). |
| 20 | `codex` | Replicação mecânica em 7 arquivos + 1 hook + 1 rule, com o mapa de chaves i18n escrito acima, paths fechados e verificação executável (`pnpm lint`, `pnpm build`, `grep`). |
| 21–26 | `claude` | Composição heterogênea e julgamento visual: stat cards, cabeçalho de card com ação, lista com alternância, abas com conteúdo diferente por aba, tom novo no `AppCard`. |

**Pré-condição da Task 20:** Tasks 18 e 19 commitadas, `pnpm lint` e `pnpm build` verdes. O commit da
Task 19 é o **commit base** a informar ao Codex.

**Como delegar a Task 20 ao Codex:** o Codex tem o Superpowers como plugin. O pedido deve mandá-lo
usar a skill **`superpowers:executing-plans`** para percorrer os steps da task na ordem, marcando os
checkboxes, além da `lotus-execute-block` (que fixa o contrato de saída, os `paths_autorizados` e o
relatório auditável). Informe: `plan_path`, `Task 20` como intervalo, branch e commit base.

**O Codex não commita.** Nas Partes 2 e 2-correções o `.git/worktrees/...` ficou somente-leitura no
sandbox dele. Deixe a árvore suja; o Claude confere o diff contra os `paths_autorizados`, roda
`pnpm lint`, `pnpm build` e os `grep` de prova por conta própria, e commita.

**`paths_autorizados` da Task 20:**

```
frontend/src/shared/hooks/useTableFilter.ts
frontend/src/features/commercial/components/Client/ClientsTable.tsx
frontend/src/features/commercial/components/Budget/BudgetsTable.tsx
frontend/src/features/operation/components/Turma/TurmasTable.tsx
frontend/src/features/catalog/components/Course/CoursesTable.tsx
frontend/src/features/identity/components/Admin/UsersTable.tsx
frontend/src/features/identity/components/Admin/RolesTable.tsx
frontend/src/features/identity/components/Redator/RedatoresTable.tsx
.claude/rules/frontend-fsliced.md
```

Fora desses globs o Codex não escreve. `backend/`, `docs/`, `frontend/src/shared/types/`,
`frontend/src/shared/ui/**` e os arquivos das Tasks 21–26 ficam explicitamente fora.

**Prova visual** de todas as tasks fica com o João — o sandbox não tem browser nem root para instalar
as libs do Playwright, limitação já registrada nas Partes 1 e 2.

## DoD da Parte 3

Provado na tela, nos dois temas, com o `OperationDemoSeeder` carregado:

1. Detalhe de orçamento com três cards `stat` — `Total cotizado` neutro, `Total aprobado` verde,
   `Total rechazado` vermelho — e aprovar/rejeitar cotização funcionando contra a API real.
2. Cards de Cotizaciones e Documentos com cabeçalho, badge de contagem e ação no lugar; documento
   listado com ícone tipado, `data · KB` e download.
3. Detalhe de turma com `En curso`/`Presencial` (ou `Online` roxo) no cabeçalho e as cinco abas
   dentro de um card só.
4. Aba Alumnos de uma turma com 12 ou 15 matrículas: **uma faixa** no rodapé, contagem à esquerda,
   paginador à direita; turma com poucas matrículas: mesma faixa, sem controles.
5. Ordenação de `Razón social` em Comercial ordena o conjunto, não a página.
6. `grep -rn "window.confirm" frontend/src` vazio.

---

# Parte 4 — Checklist H.2.1 (Tasks 27 a 39)

Fecha o bloco. Escopo consolidado no adendo `D16`–`D21` da spec (§11), escrito no gate desta parte.

## Decisões tomadas no gate desta parte

Quatro do João, duas apuradas ao escrever o plano. A justificativa completa está na spec §11; aqui
fica só o que muda o código.

1. **D16 — erro de listagem sobe até a tela.** `useCrudPage` expõe `error`/`refetch`, `AppErrorState`
   nasce em `shared/ui` e `AppDataTable` ganha `error`/`onRetry`. Hoje um GET que falha rende o empty
   state que **convida a cadastrar** — a tela afirma algo falso num módulo com auditoria.
2. **D17 — exceção mínima ao shell.** `Sidebar` colapsa por viewport abaixo de 1024px sem escrever no
   `uiStore`; `AppLayout` ganha padding responsivo. Cor do shell não muda.
3. **D18 — corte da cor:** os 3 arquivos do D14 **mais** todo o `shared/ui`. Os 6 diálogos de feature
   ficam como débito.
4. **D19 — loading vira skeleton** nas 3 telas de detalhe. Tabela mantém o overlay do PrimeReact.
5. **D20 — tabela responsiva por scroll horizontal no `pt`**, não coluna colapsável.
6. **D21 — `FormSection`** fecha o item de duplicação local.

## Correções de premissa apuradas ao escrever esta parte

Três coisas que o esboço de §5 · P4 supunha e o código contradiz.

1. **"Componentes de formulário vindos de `shared/ui`" já está satisfeito.**
   `grep -rnE "<(input|select|textarea)[ >]" frontend/src/features` volta **vazio** — nenhum controle
   nativo em feature. O que resta é o `<h3>` de seção duplicado em 6 diálogos (13 ocorrências), que a
   Task 34 resolve.
2. **"Estados empty com mensagem e ação clara" e "densidade revisada" já foram entregues** nas Partes
   1 e 2. A Parte 4 não os reabre; só confere.
3. **`OperationPage` não usa `useCrudPage`.** Ela consome `useTurmas()` direto (`useQuery` com
   `ProblemDetails`), então a propagação de erro nela vem da query, não do hook de CRUD.

## Verificação recorrente

Todas as tasks: de `frontend/`, `pnpm lint && pnpm build`. Tasks que tocam
`frontend/src/shared/config/locales/` rodam também o **script de paridade** (Parte 2, §"Verificação
recorrente"), esperando `es-pt: []` e `es-en: []`.

---

## Task 27: `AppErrorState` e as chaves de erro nos 3 locales

Irmão do `AppEmptyState`. A diferença que justifica o componente separado: ele **nunca** oferece
criar registro — oferece reintentar. Sugerir cadastro sobre uma falha de rede é o pior estado
possível num módulo com auditoria.

**Files:**
- Create: `frontend/src/shared/ui/AppErrorState/AppErrorState.tsx`
- Create: `frontend/src/shared/ui/AppErrorState/index.ts`
- Modify: `frontend/src/shared/ui/index.ts`
- Modify: `frontend/src/shared/config/locales/es-CL.json`
- Modify: `frontend/src/shared/config/locales/pt-BR.json`
- Modify: `frontend/src/shared/config/locales/en.json`

**Interfaces:**
- Consumes: nada.
- Produces: `AppErrorState` e `AppErrorStateProps` (`title: string`, `detail?: string | null`,
  `retryLabel?: string`, `onRetry?: () => void`). As chaves `common.loadError`,
  `common.loadErrorHint` e `common.retry`, consumidas pelas Tasks 29 e 32.

- [ ] **Step 1: Criar o componente**

```tsx
// frontend/src/shared/ui/AppErrorState/AppErrorState.tsx
import { AppButton } from '../AppButton'

export interface AppErrorStateProps {
  title: string
  /** `detail` do RFC 7807, ou dica genérica quando o problema não trouxe um.
   * Erro nunca é só cor nem só ícone — o texto é obrigatório (peso legal). */
  detail?: string | null
  /** Ausente => sem botão. Uma lista que não recarrega sozinha não deve
   * prometer que recarrega. */
  retryLabel?: string
  onRetry?: () => void
}

/**
 * Estado de falha de carregamento. Apresentacional puro.
 *
 * Separado do `AppEmptyState` de propósito: vazio convida a criar, falha convida
 * a reintentar. Um GET quebrado que rende "cadastre o primeiro" faz a tela
 * afirmar algo falso sobre o banco.
 *
 * O tom vem da mesma fórmula do `AppCard` (`color-mix` com `--text-color`), que
 * é o que mantém contraste nos dois temas — os palette vars do Lara não invertem.
 */
export function AppErrorState({ title, detail, retryLabel, onRetry }: AppErrorStateProps) {
  const danger = 'color-mix(in srgb, var(--red-500) 70%, var(--text-color))'

  return (
    <div role="alert" className="flex flex-col items-center gap-3 px-4 py-10 text-center">
      <i className="pi pi-exclamation-triangle text-3xl" style={{ color: danger }} aria-hidden="true" />
      <p className="text-base font-semibold" style={{ color: danger }}>{title}</p>
      {detail && (
        <p className="max-w-md text-sm" style={{ color: 'var(--text-color-secondary)' }}>{detail}</p>
      )}
      {retryLabel && onRetry && (
        <div className="mt-1">
          <AppButton label={retryLabel} icon="pi pi-refresh" outlined onClick={onRetry} />
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Criar o barrel da pasta**

```ts
// frontend/src/shared/ui/AppErrorState/index.ts
export * from './AppErrorState'
```

- [ ] **Step 3: Registrar no barrel raiz**

Em `frontend/src/shared/ui/index.ts`, em ordem alfabética, entre `export * from './AppEmptyState'` e
`export * from './AppFileUpload'`:

```ts
export * from './AppErrorState'
```

- [ ] **Step 4: Adicionar as 3 chaves nos 3 locales**

Em `es-CL.json`, dentro de `common`, depois de `"clearSearch"`:

```json
"loadError": "No se pudieron cargar los datos",
"loadErrorHint": "Revisa tu conexión e inténtalo de nuevo.",
"retry": "Reintentar"
```

Em `pt-BR.json`, dentro de `common`:

```json
"loadError": "Não foi possível carregar os dados",
"loadErrorHint": "Verifique sua conexão e tente de novo.",
"retry": "Tentar de novo"
```

Em `en.json`, dentro de `common`:

```json
"loadError": "Could not load the data",
"loadErrorHint": "Check your connection and try again.",
"retry": "Retry"
```

Cuide da vírgula: `clearSearch` deixa de ser a última chave de `common`.

- [ ] **Step 5: Verificar**

De `frontend/src/shared/config/locales/`, rode o script de paridade. Esperado: `es-pt: []` e
`es-en: []`.

De `frontend/`:

```bash
pnpm lint && pnpm build
```

Esperado: ambos sem erro. `AppErrorState` ainda não tem consumidor.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/shared/ui/AppErrorState frontend/src/shared/ui/index.ts frontend/src/shared/config/locales
git commit -m "feat(ui): AppErrorState e chaves de erro de carga nos 3 locales"
```

---

## Task 28: `AppSkeleton` e `AppDetailSkeleton`

**Files:**
- Create: `frontend/src/shared/ui/AppSkeleton/AppSkeleton.tsx`
- Create: `frontend/src/shared/ui/AppSkeleton/index.ts`
- Modify: `frontend/src/shared/ui/index.ts`

**Interfaces:**
- Consumes: nada.
- Produces: `AppSkeleton` (passthrough de `SkeletonProps`) e `AppDetailSkeleton` (sem props). A
  Task 32 consome `AppDetailSkeleton`.

- [ ] **Step 1: Criar o componente**

```tsx
// frontend/src/shared/ui/AppSkeleton/AppSkeleton.tsx
import { Skeleton } from 'primereact/skeleton'
import type { SkeletonProps } from 'primereact/skeleton'

export type { SkeletonProps as AppSkeletonProps } from 'primereact/skeleton'

/** Wrapper do Skeleton do PrimeReact. Feature não importa `primereact` direto
 * (ADR-05, lei §5.6). */
export function AppSkeleton(props: SkeletonProps) {
  return <Skeleton {...props} />
}

/**
 * Esqueleto de página de detalhe: barra de título, subtítulo e bloco de corpo.
 *
 * Substitui o `<p>Cargando…</p> ` das telas de detalhe (spec D19). Texto cru como
 * estado de carregamento não sinaliza a forma do conteúdo que vem e produz salto
 * de layout quando ele chega.
 */
export function AppDetailSkeleton() {
  return (
    <div className="space-y-4 p-4" aria-busy="true">
      <AppSkeleton width="12rem" height="2rem" />
      <AppSkeleton width="20rem" height="1rem" />
      <AppSkeleton width="100%" height="12rem" />
    </div>
  )
}
```

- [ ] **Step 2: Criar o barrel da pasta**

```ts
// frontend/src/shared/ui/AppSkeleton/index.ts
export * from './AppSkeleton'
```

- [ ] **Step 3: Registrar no barrel raiz**

Em `frontend/src/shared/ui/index.ts`, entre `export * from './AppSidebar'` e
`export * from './AppTabView'`:

```ts
export * from './AppSkeleton'
```

Confira a ordem alfabética real do arquivo antes de inserir; se `AppSidebar` não estiver lá, insira
entre os vizinhos alfabéticos corretos.

- [ ] **Step 4: Verificar**

De `frontend/`:

```bash
pnpm lint && pnpm build
```

Esperado: ambos sem erro.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/shared/ui/AppSkeleton frontend/src/shared/ui/index.ts
git commit -m "feat(ui): AppSkeleton e AppDetailSkeleton"
```

---

## Task 29: `AppDataTable` — estado de erro e scroll horizontal

Duas mudanças no mesmo arquivo porque as duas são o mesmo tipo de decisão: o que a tabela faz quando
o conteúdo não cabe (D20) e quando o conteúdo não veio (D16).

**Files:**
- Modify: `frontend/src/shared/ui/AppDataTable/style.ts`
- Modify: `frontend/src/shared/ui/AppDataTable/AppDataTable.tsx`

**Interfaces:**
- Consumes: `AppErrorState` (Task 27).
- Produces: `AppDataTableProps` ganha `error?: { detail?: string | null } | null` e
  `onRetry?: () => void`. Com `error` truthy: o corpo vira `AppErrorState`, as linhas somem e a faixa
  de rodapé não renderiza. Consumido pelas Tasks 31 e 32.

- [ ] **Step 1: Confirmar os nomes das seções de `pt` na tipagem instalada**

De `frontend/`:

```bash
grep -n "wrapper\|table?:" node_modules/primereact/datatable/datatable.d.ts | head -20
```

Esperado: linhas declarando `wrapper?:` e `table?:` em `DataTablePassThroughOptions`. Se algum dos
dois não existir nesta versão, **pare** — o scroll teria de ir para o `root`, e isso muda a Task.

- [ ] **Step 2: Adicionar o scroll horizontal ao `pt` base**

Em `frontend/src/shared/ui/AppDataTable/style.ts`, dentro de `appDataTablePt`, logo abaixo de
`root`:

```ts
  /** Responsividade (spec D20): quem rola é o card, nunca a página. A tabela
   * ganha largura mínima para as colunas não se espremerem a ponto de quebrar
   * palavra; abaixo disso o wrapper rola na horizontal.
   *
   * Colapsar coluna foi rejeitado: escolher qual dado some é julgamento de
   * domínio, e esconder coluna em tela com peso de auditoria é perda silenciosa. */
  wrapper: { className: 'overflow-x-auto' },
  table: { className: 'min-w-[48rem]' },
```

- [ ] **Step 3: Reescrever o componente**

```tsx
// frontend/src/shared/ui/AppDataTable/AppDataTable.tsx
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { DataTable } from 'primereact/datatable'
import type { DataTableProps, DataTableValueArray, DataTablePassThroughOptions } from 'primereact/datatable'
import { Column } from 'primereact/column'
import { AppErrorState } from '../AppErrorState'
import { appDataTablePt, appPaginatorPt } from './style'

/** Mescla o passthrough do chamador com o da base POR CHAVE. Um spread raso
 * faria `pt={{ root: ... }}` descartar o `className` base do root em silêncio. */
function mergePt(
  base: DataTablePassThroughOptions,
  override?: DataTableProps<DataTableValueArray>['pt'],
): DataTablePassThroughOptions {
  if (!override) return base
  const merged: Record<string, unknown> = { ...base }
  for (const [key, value] of Object.entries(override as Record<string, unknown>)) {
    const current = merged[key]
    if (
      current && typeof current === 'object' && !Array.isArray(current) &&
      value && typeof value === 'object' && !Array.isArray(value)
    ) {
      merged[key] = { ...(current as object), ...(value as object) }
    } else {
      merged[key] = value
    }
  }
  return merged as DataTablePassThroughOptions
}

export type AppDataTableProps<T extends DataTableValueArray> = DataTableProps<T> & {
  /** Contagem em prosa do rodapé. Passá-la liga a faixa: o paginador do
   * DataTable vira o rodapé do card (spec D12), com a contagem à esquerda e os
   * controles de página à direita — e só quando há mais de uma página. */
  footerCount?: ReactNode
  /** Problema que impediu o carregamento. Truthy => o corpo vira
   * `AppErrorState` (spec D16). Estruturalmente compatível com `ProblemDetails`
   * sem importar de `shared/api`. */
  error?: { detail?: string | null } | null
  /** Recarrega a lista. Sem ele o estado de erro não oferece botão. */
  onRetry?: () => void
}

/** Wrapper do DataTable: paginação/sort/filtro client-side (o index devolve
 * array puro). Colunas via <AppColumn/>.
 *
 * Durante o `loading` o corpo vazio ainda renderiza — passar `undefined` em
 * `emptyMessage` cairia no default inglês do PrimeReact (`No available
 * options`). Um nó vazio truthy mantém a linha e cala o texto; suprimir isso é
 * responsabilidade do wrapper, não de cada tabela.
 *
 * O rodapé é o paginador: com `footerCount`, `alwaysShowPaginator` mantém a
 * faixa mesmo em página única e `paginatorTemplate=''` apaga os controles
 * (template falsy não cria elemento algum; `leftContent` renderiza fora desse
 * ramo). Fatiar a página fora da tabela foi rejeitado: 5 tabelas têm coluna
 * `sortable`, e o DataTable só ordena o que recebe.
 *
 * Em erro (spec D16) o wrapper força três coisas de uma vez: linhas vazias (dado
 * obsoleto de um refetch que falhou não é dado válido), rodapé desligado
 * (contar linhas de uma lista que não carregou é ruído) e o corpo virando
 * `AppErrorState`. O estado de erro vence o de vazio: a tabela nunca convida a
 * cadastrar sobre uma falha. */
export function AppDataTable<T extends DataTableValueArray>({
  pt,
  loading,
  emptyMessage,
  footerCount,
  error,
  onRetry,
  value,
  rows = 10,
  ...props
}: AppDataTableProps<T>) {
  const { t } = useTranslation()
  const errored = error != null
  const data = (errored ? [] : value) as T | undefined
  const paginated = (data?.length ?? 0) > rows

  const body = errored ? (
    <AppErrorState
      title={t('common.loadError')}
      detail={error?.detail ?? t('common.loadErrorHint')}
      retryLabel={onRetry ? t('common.retry') : undefined}
      onRetry={onRetry}
    />
  ) : loading ? (
    <span />
  ) : (
    emptyMessage
  )

  return (
    <DataTable
      dataKey="id"
      removableSort
      rowHover
      value={data}
      rows={rows}
      paginator={footerCount !== undefined && !errored}
      alwaysShowPaginator
      paginatorLeft={footerCount}
      paginatorTemplate={paginated ? 'PrevPageLink PageLinks NextPageLink' : ''}
      pt={mergePt({ ...appDataTablePt, paginator: appPaginatorPt }, pt as DataTableProps<DataTableValueArray>['pt'])}
      loading={loading && !errored}
      emptyMessage={body}
      {...props}
    />
  )
}

export { Column as AppColumn }
export type { ColumnProps as AppColumnProps } from 'primereact/column'
```

- [ ] **Step 4: Verificar build**

De `frontend/`:

```bash
pnpm lint && pnpm build
```

Esperado: ambos sem erro. Nenhuma tabela passa `error` ainda, então nada muda em tela.

- [ ] **Step 5: Provar o scroll na tela**

`pnpm dev`, http://localhost:5173/comercial, janela estreitada para ~700px de largura. Esperado: a
página **não** rola na horizontal; a tabela rola dentro do card, e a toolbar/rodapé ficam parados.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/shared/ui/AppDataTable
git commit -m "feat(ui): AppDataTable com estado de erro e scroll horizontal proprio"
```

---

## Task 30: `useCrudPage` expõe o erro da listagem

A raiz do defeito: o hook só devolve `loading`, então a falha nunca chega à tela.

**Files:**
- Modify: `frontend/src/shared/hooks/useCrudPage.ts`

**Interfaces:**
- Consumes: nada.
- Produces: o retorno de `useCrudPage` ganha `error: ProblemDetails | null` e
  `refetch: () => void`. `ListableResource<T>.useList` passa a exigir `isError`, `error` e `refetch`
  — `createCrudResource` já os fornece, porque `useList` devolve o resultado cru do `useQuery`.
  Consumido pela Task 31.

- [ ] **Step 1: Reescrever o hook**

```ts
// frontend/src/shared/hooks/useCrudPage.ts
import { useState } from 'react'
import type { DialogMode } from '@shared/lib'
import type { ProblemDetails } from '@shared/api/axios'

/** Contrato mínimo que `createCrudResource<T>` satisfaz. Tipado por estrutura
 * para o hook não depender da fábrica inteira. */
interface ListableResource<T> {
  useList: () => {
    data?: T[]
    isLoading: boolean
    isError: boolean
    error: ProblemDetails | null
    refetch: () => unknown
  }
}

/**
 * Estado de uma página de módulo CRUD: a lista e o dialog unificado.
 *
 * O dialog guarda o **id**, não o objeto. A entidade é derivada de `items` a cada
 * render, então uma invalidação de query (upload de documento, edição de nested)
 * chega ao dialog aberto. Guardar o objeto congelava um snapshot obsoleto — foi
 * exatamente esse o bug que a task 4.2.2 escondeu.
 *
 * `error` sobe junto com `items` porque sem ele a página não distingue "não há
 * registros" de "não deu para perguntar" (spec D16): o GET falhava e a tabela
 * exibia o empty state que convida a cadastrar.
 */
export function useCrudPage<T extends { id?: number }>(resource: ListableResource<T>) {
  const query = resource.useList()
  const [dialog, setDialog] = useState<{ mode: DialogMode; id: number | null } | null>(null)

  const items = query.data ?? []
  const entity = dialog?.id != null ? (items.find((i) => i.id === dialog.id) ?? null) : null

  return {
    items,
    loading: query.isLoading,
    /** Truthy só quando a listagem falhou. `null` em sucesso, inclusive com
     * lista vazia — vazio não é erro. O cast cobre o erro de rede que não passa
     * pelo interceptor: `isError` sem `ProblemDetails`. Sem ele o tipo vira
     * `ProblemDetails | {}` e qualquer `.detail` no consumidor não compila. */
    error: query.isError ? (query.error ?? ({} as ProblemDetails)) : null,
    refetch: () => { void query.refetch() },
    dialog: dialog ? { mode: dialog.mode, entity } : null,
    openCreate: () => setDialog({ mode: 'create', id: null }),
    openView: (item: T) => setDialog({ mode: 'view', id: item.id ?? null }),
    /** view -> edit, preservando a entidade aberta. Nunca entra em edit sem entidade. */
    startEdit: () => setDialog((d) => (d && d.id != null ? { ...d, mode: 'edit' } : d)),
    close: () => setDialog(null),
  }
}
```

`query.error ?? {}` cobre o caso em que o TanStack marca `isError` sem `ProblemDetails` (erro de
rede antes do interceptor): a tabela ainda mostra o estado de erro, com a dica genérica.

- [ ] **Step 2: Verificar build**

De `frontend/`:

```bash
pnpm lint && pnpm build
```

Esperado: ambos sem erro. Se o build acusar que `useList` não satisfaz `ListableResource`, o
problema é a tipagem de `ProblemDetails` no `useQuery` de `createCrudResource` — confira
`frontend/src/shared/api/createCrudResource.ts:17`, que declara `useQuery<T[], ProblemDetails>`.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/shared/hooks/useCrudPage.ts
git commit -m "feat(shared): useCrudPage expoe erro e refetch da listagem"
```

---

## Task 31: as 7 tabelas e as 5 páginas propagam o erro

Replicação mecânica: cada tabela ganha duas props e as repassa; cada página as preenche. Nenhuma
tabela monta o `AppErrorState` — quem monta é o `AppDataTable` (Task 29), então não há copy nova.

**Files:**
- Modify: `frontend/src/features/commercial/components/Client/ClientsTable.tsx`
- Modify: `frontend/src/features/commercial/components/Budget/BudgetsTable.tsx`
- Modify: `frontend/src/features/catalog/components/Course/CoursesTable.tsx`
- Modify: `frontend/src/features/identity/components/Redator/RedatoresTable.tsx`
- Modify: `frontend/src/features/identity/components/Admin/UsersTable.tsx`
- Modify: `frontend/src/features/identity/components/Admin/RolesTable.tsx`
- Modify: `frontend/src/features/operation/components/Turma/TurmasTable.tsx`
- Modify: `frontend/src/features/commercial/components/CommercialPage.tsx`
- Modify: `frontend/src/features/catalog/components/CatalogPage.tsx`
- Modify: `frontend/src/features/identity/components/PeoplePage.tsx`
- Modify: `frontend/src/features/identity/components/AdministracionPage.tsx`
- Modify: `frontend/src/features/operation/components/OperationPage.tsx`

**Interfaces:**
- Consumes: `AppDataTableProps.error`/`onRetry` (Task 29), `useCrudPage().error`/`refetch` (Task 30).
- Produces: nada para tasks posteriores.

- [ ] **Step 1: Adicionar as duas props às 7 tabelas**

Em **cada** um dos 7 arquivos de tabela, três edições:

1. Na assinatura de props do componente, acrescente:

```tsx
  error?: { detail?: string | null } | null
  onRetry?: () => void
```

2. Na desestruturação dos parâmetros, acrescente `error` e `onRetry`.

3. No `<AppDataTable …>`, acrescente as duas props, logo abaixo de `loading`:

```tsx
        error={error}
        onRetry={onRetry}
```

`ClientsTable` fica assim no trecho tocado (as demais seguem o mesmo padrão, mudando só o nome da
lista):

```tsx
export function ClientsTable({
  clients, loading, onView, actions, error, onRetry,
}: {
  clients: ClientData[]
  loading: boolean
  onView: (c: ClientData) => void
  actions?: ReactNode
  error?: { detail?: string | null } | null
  onRetry?: () => void
}) {
```

```tsx
      <AppDataTable
        value={table.rows}
        loading={loading}
        error={error}
        onRetry={onRetry}
        emptyMessage={empty}
        footerCount={t('client.count', { count: table.rows.length })}
        first={table.first}
        onPage={table.onPage}
      >
```

**Não** mexa no `emptyMessage`, no `footerCount`, no `useTableFilter` nem nas colunas de nenhuma
tabela. O estado de erro vence o de vazio dentro do `AppDataTable`; a tabela não decide isso.

- [ ] **Step 2: Preencher nas 4 páginas que usam `useCrudPage`**

Em `CommercialPage.tsx`, no `<ClientsTable>`, depois de `loading={clients.loading}`:

```tsx
              error={clients.error}
              onRetry={clients.refetch}
```

e no `<BudgetsTable>`, depois de `loading={budgets.loading}`:

```tsx
              error={budgets.error}
              onRetry={budgets.refetch}
```

Em `CatalogPage.tsx`, no `<CoursesTable>`, depois de `loading={page.loading}`:

```tsx
          error={page.error}
          onRetry={page.refetch}
```

Em `PeoplePage.tsx`, no `<RedatoresTable>`, depois de `loading={page.loading}`:

```tsx
              error={page.error}
              onRetry={page.refetch}
```

Em `AdministracionPage.tsx`, no `<UsersTable>`, depois de `loading={page.loading}`:

```tsx
              error={page.error}
              onRetry={page.refetch}
```

e no `<RolesTable>`, depois de `loading={rolesPage.loading}`:

```tsx
                error={rolesPage.error}
                onRetry={rolesPage.refetch}
```

- [ ] **Step 3: Preencher em `OperationPage`, que não usa `useCrudPage`**

`OperationPage` consome `useTurmas()` direto — `useQuery<TurmaData[], ProblemDetails>`, então
`isError`, `error` e `refetch` já existem no objeto da query.

O `?? {}` sem cast basta aqui: `TurmasTable` só repassa o objeto ao `AppDataTable`, que lê `detail`
como opcional. Nas telas de detalhe (Task 32) o cast para `ProblemDetails` é obrigatório, porque lá
o `.detail` é acessado direto e a união com `{}` não compila.

```tsx
          <TurmasTable
            turmas={turmas.data ?? []}
            loading={turmas.isLoading}
            error={turmas.isError ? (turmas.error ?? {}) : null}
            onRetry={() => { void turmas.refetch() }}
          />
```

- [ ] **Step 4: Verificar build**

De `frontend/`:

```bash
pnpm lint && pnpm build
```

Esperado: ambos sem erro.

- [ ] **Step 5: Provar o DoD do erro na tela**

Com o front rodando (`pnpm dev`) e o stack de pé:

```bash
docker compose stop nginx
```

Abra http://localhost:5173/comercial e recarregue. Esperado, em **cada** aba: ícone de alerta,
`No se pudieron cargar los datos`, texto de detalhe e botão `Reintentar`. **Nenhuma** tela pode
mostrar `Sin clientes registrados` nem o botão de cadastrar dentro do corpo da tabela. Repita em
`/operacion`, `/cursos`, `/personas` e `/administracion`.

Depois:

```bash
docker compose start nginx
```

Clique em `Reintentar`. Esperado: a lista carrega sem recarregar a página. Repita nos dois temas.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/features
git commit -m "feat(ui): tabelas e paginas de modulo exibem falha de carga com reintentar"
```

---

## Task 32: telas de detalhe — skeleton no carregamento e erro visível

**Files:**
- Modify: `frontend/src/features/commercial/hooks/useBudgetDetail.ts`
- Modify: `frontend/src/features/commercial/components/Budget/BudgetDetailPage.tsx`
- Modify: `frontend/src/features/operation/hooks/useTurmaDetail.ts`
- Modify: `frontend/src/features/operation/components/Turma/TurmaDetailPage.tsx`
- Modify: `frontend/src/features/operation/components/Document/TurmaDocuments.tsx`

**Interfaces:**
- Consumes: `AppDetailSkeleton` (Task 28), `AppErrorState` (Task 27).
- Produces: `useBudgetDetail` e `useTurmaDetail` ganham `loadError: ProblemDetails | null` e
  `reload: () => void`. Nome diferente de `error`/`refetch` de propósito: os dois hooks já expõem
  `confirmError`, `fileError` e afins, e um `error` genérico ali confundiria.

- [ ] **Step 1: Expor o erro em `useBudgetDetail`**

Em `frontend/src/features/commercial/hooks/useBudgetDetail.ts`, acrescente o import do tipo no topo:

```ts
import type { ProblemDetails } from '@shared/api/axios'
```

e, no objeto de retorno, logo abaixo de `loading: query.isLoading,`:

```ts
    /** Falha do GET do orçamento. Distinto de `confirmError`/`fileError`, que
     * são erros de mutação. O cast é obrigatório: a página lê `.detail`, e a
     * união com `{}` não compila. */
    loadError: query.isError ? (query.error ?? ({} as ProblemDetails)) : null,
    reload: () => { void query.refetch() },
```

- [ ] **Step 2: Expor o erro em `useTurmaDetail`**

```ts
// frontend/src/features/operation/hooks/useTurmaDetail.ts
import { useNavigate, useParams } from 'react-router-dom'
import type { ProblemDetails } from '@shared/api/axios'
import { useTurma } from '../api/useTurmas'

/** Orquestração da página de detalhe da turma. O componente só consome. */
export function useTurmaDetail() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const turmaId = Number(id)
  const query = useTurma(turmaId)

  return {
    turmaId,
    loading: query.isLoading,
    /** Falha do GET da turma — a tela precisa distinguir "não carregou" de
     * "não existe" (spec D16). O cast é obrigatório: a página lê `.detail`. */
    loadError: query.isError ? (query.error ?? ({} as ProblemDetails)) : null,
    reload: () => { void query.refetch() },
    turma: query.data,
    goBack: () => navigate('/operacion'),
    goToBudget: (budgetId: number) => navigate(`/comercial/presupuestos/${budgetId}`),
  }
}
```

- [ ] **Step 3: Trocar o texto de loading e tratar o erro em `BudgetDetailPage`**

Substitua as duas linhas de guarda (`if (d.loading) …` e `if (!d.budget) …`) por:

```tsx
  if (d.loading) return <AppDetailSkeleton />
  if (d.loadError)
    return (
      <AppErrorState
        title={t('common.loadError')}
        detail={d.loadError.detail ?? t('common.loadErrorHint')}
        retryLabel={t('common.retry')}
        onRetry={d.reload}
      />
    )
  if (!d.budget) return <p className="p-4 text-sm" style={{ color: 'var(--text-color-secondary)' }}>{t('budget.notFound')}</p>
```

A ordem importa: `loadError` **antes** de `!d.budget`. Invertida, uma falha de rede renderizaria
"orçamento não encontrado", que afirma algo falso sobre o banco.

No import de `@shared/ui` do topo do arquivo, acrescente `AppDetailSkeleton` e `AppErrorState`.

- [ ] **Step 4: Mesma troca em `TurmaDetailPage`**

```tsx
  if (d.loading) return <AppDetailSkeleton />
  if (d.loadError)
    return (
      <AppErrorState
        title={t('common.loadError')}
        detail={d.loadError.detail ?? t('common.loadErrorHint')}
        retryLabel={t('common.retry')}
        onRetry={d.reload}
      />
    )
  if (!d.turma) return <p className="p-4 text-sm" style={{ color: 'var(--text-color-secondary)' }}>{t('operation.detail.notFound')}</p>
```

No import de `@shared/ui`, acrescente `AppDetailSkeleton` e `AppErrorState`.

- [ ] **Step 5: Trocar o texto de loading em `TurmaDocuments`**

`useTurmaDocsSection` já agrega o erro da lista em `s.error`, exibido pelo `FormErrorBanner` que já
está na aba — não há erro novo a tratar aqui, só o loading:

```tsx
  if (s.loading) return <AppDetailSkeleton />
```

No import de `@shared/ui`, acrescente `AppDetailSkeleton`.

- [ ] **Step 6: Verificar build**

De `frontend/`:

```bash
pnpm lint && pnpm build
```

Esperado: ambos sem erro.

- [ ] **Step 7: Provar na tela**

Com a API de pé, abra um orçamento e uma turma: no instante do carregamento aparecem barras de
skeleton, não `Cargando...`. Com `docker compose stop nginx`, recarregue o detalhe do orçamento:
aparece o estado de erro com `Reintentar`, **não** `Presupuesto no encontrado`. Suba a API e clique
em `Reintentar`. Nos dois temas.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/features/commercial frontend/src/features/operation
git commit -m "feat(ui): telas de detalhe com skeleton e falha de carga visivel"
```

---

## Task 33: diálogos em telas estreitas

**Files:**
- Modify: `frontend/src/shared/ui/AppDialog/style.ts`
- Modify: `frontend/src/features/commercial/components/Client/AddressFields.tsx:17`
- Modify: `frontend/src/features/commercial/components/Client/ClientDialog.tsx:60,68`
- Modify: `frontend/src/features/commercial/components/Budget/QuoteWizard.tsx:104,137`
- Modify: `frontend/src/features/catalog/components/Course/CourseDialog.tsx:57`
- Modify: `frontend/src/features/identity/components/Admin/StaffUserDialog.tsx:53,72`
- Modify: `frontend/src/features/identity/components/Redator/RedatorDialog.tsx:81`

**Interfaces:**
- Consumes: nada.
- Produces: nada para tasks posteriores.

- [ ] **Step 1: Largura responsiva do `AppDialog`**

Em `frontend/src/shared/ui/AppDialog/style.ts`, troque a linha do `root`:

```ts
  root: { className: 'w-[95vw] sm:w-[85vw] lg:w-[70vw] max-w-screen' },
```

`70vw` fixo num celular deixa o diálogo mais estreito que a tela e ainda assim apertado por dentro;
abaixo de `sm` ele passa a ocupar quase tudo.

- [ ] **Step 2: Colapsar os 9 grids de 2 colunas**

Em cada uma das 9 linhas listadas em **Files**, troque exatamente:

```tsx
<div className="grid grid-cols-2 gap-4">
```

por:

```tsx
<div className="grid gap-4 sm:grid-cols-2">
```

`grid-cols-2` sem prefixo mantém duas colunas em qualquer largura; com `sm:` ele cai para uma coluna
abaixo de 640px.

> **Correção do review (Q-13, 2026-07-27):** `RoleDialog.tsx:72` usava `grid-cols-1 md:grid-cols-2`
> — um terceiro breakpoint no mesmo tipo de grid. Passou a `sm:grid-cols-2` como as outras 9, para
> a quebra de coluna dos diálogos ter **um** breakpoint só (640px).

- [ ] **Step 3: Provar que não sobrou grid fixo**

De `frontend/`:

```bash
grep -rn "grid-cols-2" src/features | grep -v "sm:grid-cols-2" | grep -v "md:grid-cols-2"
```

Esperado: nenhuma linha.

- [ ] **Step 4: Verificar build**

De `frontend/`:

```bash
pnpm lint && pnpm build
```

Esperado: ambos sem erro.

- [ ] **Step 5: Provar na tela**

> **Correção do review (Q-13, 2026-07-27):** este passo mandava provar "uma coluna a 768px", o que
> o Step 2 nunca implementou — `sm:` quebra em 640px, então a 768px **duas** colunas são o
> resultado correto. O DoD real do Step 2 é largura e ausência de scroll, não contagem de colunas a
> 768px. Texto abaixo corrigido para o que o código garante.

Janela em **768px**, `/comercial` → `Nuevo cliente`. Esperado: diálogo quase da largura da janela,
**duas** colunas, sem scroll horizontal. Estreite para **600px** (abaixo do `sm`): os mesmos campos
caem para **uma** coluna, ainda sem scroll horizontal. Repita em `Nuevo curso` (`/cursos`),
`Nuevo usuario` e `Nuevo rol` (`/administracion` — a grade de permissões segue o mesmo breakpoint
desde o Q-13). Nos dois temas.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/shared/ui/AppDialog frontend/src/features
git commit -m "feat(ui): dialogos adaptados a telas estreitas"
```

---

## Task 34: `FormSection` — o cabeçalho de seção deixa de ser copiado

13 ocorrências do mesmo `<h3>` em 6 diálogos, com a mesma cor hardcoded. É a "duplicação local" que o
checklist H.2.1 proíbe (spec D21).

**Files:**
- Create: `frontend/src/shared/ui/FormSection/FormSection.tsx`
- Create: `frontend/src/shared/ui/FormSection/index.ts`
- Modify: `frontend/src/shared/ui/index.ts`
- Modify: `frontend/src/features/commercial/components/Client/ClientDialog.tsx:53,77,80`
- Modify: `frontend/src/features/commercial/components/Budget/QuoteWizard.tsx:74,102`
- Modify: `frontend/src/features/catalog/components/Course/CourseDialog.tsx:51,75,179`
- Modify: `frontend/src/features/identity/components/Admin/StaffUserDialog.tsx:47`
- Modify: `frontend/src/features/identity/components/Admin/RoleDialog.tsx:68`
- Modify: `frontend/src/features/identity/components/Redator/RedatorDialog.tsx:77,93,151`

**Interfaces:**
- Consumes: nada.
- Produces: `FormSection` e `FormSectionProps` (`title: string`, `spaced?: boolean`).

- [ ] **Step 1: Criar o componente**

```tsx
// frontend/src/shared/ui/FormSection/FormSection.tsx
export interface FormSectionProps {
  title: string
  /** Espaço acima, para seções que não são a primeira do diálogo. */
  spaced?: boolean
}

/**
 * Cabeçalho de seção dentro de um formulário. Apresentacional puro.
 *
 * Existia copiado em 13 lugares, com a cor fixa em `text-slate-500` — que é
 * cor Tailwind hardcoded contra o ADR-16. Centralizar mata as duas coisas de
 * uma vez.
 */
export function FormSection({ title, spaced }: FormSectionProps) {
  return (
    <h3
      className={`text-xs font-semibold uppercase ${spaced ? 'pt-2' : ''}`}
      style={{ color: 'var(--text-color-secondary)' }}
    >
      {title}
    </h3>
  )
}
```

- [ ] **Step 2: Criar o barrel da pasta**

```ts
// frontend/src/shared/ui/FormSection/index.ts
export * from './FormSection'
```

- [ ] **Step 3: Registrar no barrel raiz**

Em `frontend/src/shared/ui/index.ts`, em ordem alfabética, depois da linha do `FormField`:

```ts
export * from './FormSection'
```

- [ ] **Step 4: Trocar as 13 ocorrências**

O padrão. Onde havia:

```tsx
        <h3 className="text-xs font-semibold uppercase text-slate-500">{t('client.sectionGeneral')}</h3>
```

passa a haver:

```tsx
        <FormSection title={t('client.sectionGeneral')} />
```

E onde havia o mesmo `<h3>` com `pt-2` antes de `text-xs`:

```tsx
        <h3 className="pt-2 text-xs font-semibold uppercase text-slate-500">{t('client.sectionAddress')}</h3>
```

passa a haver:

```tsx
        <FormSection title={t('client.sectionAddress')} spaced />
```

Ocorrências, por arquivo e chave:

| Arquivo | Linha | Chave | `spaced` |
|---|---|---|---|
| `ClientDialog.tsx` | 53 | `client.sectionGeneral` | não |
| `ClientDialog.tsx` | 77 | `client.sectionAddress` | sim |
| `ClientDialog.tsx` | 80 | `client.sectionContacts` | sim |
| `QuoteWizard.tsx` | 74 | `quote.stepCourse` | não |
| `QuoteWizard.tsx` | 102 | `quote.stepData` | não |
| `CourseDialog.tsx` | 51 | `course.sectionGeneral` | não |
| `CourseDialog.tsx` | 75 | `courseModule.section` | sim |
| `CourseDialog.tsx` | 179 | `course.sectionRedatores` | sim |
| `StaffUserDialog.tsx` | 47 | `admin.sectionUser` | não |
| `RoleDialog.tsx` | 68 | `role.permissions` | não |
| `RedatorDialog.tsx` | 77 | `redator.sectionUser` | não |
| `RedatorDialog.tsx` | 93 | `redator.sectionDocuments` | sim |
| `RedatorDialog.tsx` | 151 | `redator.sectionCourses` | sim |

Confirme o `pt-2` no arquivo antes de decidir o `spaced` — os números de linha são do commit base e
podem deslocar. Em cada arquivo, acrescente `FormSection` ao import de `@shared/ui`.

- [ ] **Step 5: Provar que não sobrou cópia**

De `frontend/`:

```bash
grep -rn "uppercase text-slate-500" src/features
```

Esperado: nenhuma linha.

- [ ] **Step 6: Verificar build**

De `frontend/`:

```bash
pnpm lint && pnpm build
```

Esperado: ambos sem erro.

- [ ] **Step 7: Provar na tela**

`/comercial` → `Nuevo cliente`: os três cabeçalhos de seção (`Datos generales`, `Dirección`,
`Contactos`) aparecem no mesmo lugar e com o mesmo peso de antes, e o espaçamento acima do segundo e
do terceiro continua existindo. Nos dois temas — no escuro o texto acompanha o tema, não fica cinza
fixo.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/shared/ui/FormSection frontend/src/shared/ui/index.ts frontend/src/features
git commit -m "feat(ui): FormSection substitui o cabecalho de secao duplicado em 6 dialogos"
```

---

## Task 35: cor por variável do tema em `shared/ui`

Alcance, não contagem (spec D18): cor errada aqui se replica em todas as telas.

**Files:**
- Modify: `frontend/src/shared/ui/FormField/FormField.tsx`
- Modify: `frontend/src/shared/ui/ConfirmDialog/ConfirmDialog.tsx`
- Modify: `frontend/src/shared/ui/Clock/Clock.tsx`
- Modify: `frontend/src/shared/ui/AppPassword/AppPassword.tsx`
- Modify: `frontend/src/shared/ui/AppButton/style.ts`

**Interfaces:**
- Consumes: nada.
- Produces: nenhuma mudança de assinatura. Só cor.

- [ ] **Step 1: `FormField.tsx` — os 4 pontos de cor**

Trocas, uma a uma:

```tsx
      <span className="mb-1 block text-sm text-slate-600 dark:text-slate-300">{label}</span>
```
vira
```tsx
      <span className="mb-1 block text-sm" style={{ color: 'var(--text-color-secondary)' }}>{label}</span>
```

Os três blocos de erro (`FormField`, `NestedField`, `FormErrorSummary`, `FormErrorBanner`) usam a
mesma fórmula do `AppCard`, que é o que mantém contraste nos dois temas — os palette vars do Lara
não invertem:

```tsx
      {error && (
        <span
          className="mt-1 block text-sm"
          style={{ color: 'color-mix(in srgb, var(--red-500) 70%, var(--text-color))' }}
        >
          {error}
        </span>
      )}
```

Para a caixa vermelha do `FormErrorSummary` e do `FormErrorBanner` (`bg-red-50 … dark:bg-red-950`):

```tsx
    style={{
      background: 'color-mix(in srgb, var(--red-500) 10%, var(--surface-card))',
      color: 'color-mix(in srgb, var(--red-500) 70%, var(--text-color))',
    }}
```

mantendo as classes de layout (`mb-4 rounded px-3 py-2 text-sm`) e removendo só as de cor. O
`variant="inline"` do `FormErrorBanner` fica só com a cor de texto, sem fundo.

- [ ] **Step 2: `ConfirmDialog.tsx` — reusar o banner em vez de recriá-lo**

O bloco de erro do `ConfirmDialog` é uma cópia literal do `FormErrorBanner`. Troque:

```tsx
      {error && (
        <p className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
          {error}
        </p>
      )}
      <p className="text-sm text-slate-600 dark:text-slate-300">{message}</p>
```

por:

```tsx
      <FormErrorBanner message={error} />
      <p className="text-sm" style={{ color: 'var(--text-color-secondary)' }}>{message}</p>
```

e acrescente `import { FormErrorBanner } from '../FormField'` ao topo. Ganho lateral: o `role="alert"`
do banner passa a valer também aqui, onde não existia.

- [ ] **Step 3: `Clock.tsx`**

```tsx
    <div className={`text-right text-sm leading-tight ${className} `} style={{ color: 'var(--text-color-secondary)' }}>
      <p className="font-semibold" style={{ color: 'var(--text-color)' }}>{formatTime(now)}</p>
      <p>{formatDate(now)}</p>
    </div>
```

- [ ] **Step 4: `AppPassword.tsx`**

Mantém o prefixo `dark:` — o tema Lara já estiliza o input no claro, e sobrescrever os dois modos
mudaria a aparência aprovada. Só a **fonte da cor** muda:

```tsx
const darkInput =
  'dark:bg-[var(--surface-card)] dark:border-[var(--surface-border)] dark:text-[var(--text-color)] ' +
  'dark:placeholder:text-[var(--text-color-secondary)]'
```

e, nas duas ocorrências de `dark:text-slate-400`, use `dark:text-[var(--text-color-secondary)]`.

- [ ] **Step 5: `AppButton/style.ts`**

O hex `#25A5E4` **fica**: é cor de marca, não cor de tema, e não tem variável equivalente no Lara. O
que sai são os neutros ao redor dele:

```ts
const brandOutline =
  'bg-[var(--surface-card)] text-[#25A5E4] border-2 border-[#25A5E4] ring-0 hover:text-[var(--text-color)] ' +
  'dark:bg-[#25A5E4] dark:border-2 dark:border-white dark:text-white dark:hover:text-[var(--surface-card)]'
```

- [ ] **Step 6: Provar que `shared/ui` ficou limpo**

De `frontend/`:

```bash
grep -rnE "(text|bg|border)-(slate|gray|red|green|emerald|sky|blue|amber|yellow|purple|indigo|rose|zinc|neutral|stone|orange|teal|cyan|lime|violet|fuchsia|pink)-[0-9]{2,3}" src/shared/ui
```

Esperado: nenhuma linha.

- [ ] **Step 7: Verificar build**

De `frontend/`:

```bash
pnpm lint && pnpm build
```

Esperado: ambos sem erro.

- [ ] **Step 8: Provar na tela**

Nos dois temas: rótulo de campo e mensagem de erro legíveis em `Nuevo cliente` (force um 422
salvando com RUT inválido); relógio do header legível; `Contraseña` no login legível; botão de marca
com contorno azul no claro e preenchido no escuro, como antes.

- [ ] **Step 9: Commit**

```bash
git add frontend/src/shared/ui
git commit -m "feat(ui): cor de shared/ui por variavel do tema"
```

---

## Task 36: cor por variável do tema nos 3 arquivos do D14

O que a Parte 3 adiou de propósito (spec D14): o interior dos cards das abas do detalhe de turma.

**Files:**
- Modify: `frontend/src/features/operation/components/Turma/RedatorDesignation.tsx`
- Modify: `frontend/src/features/operation/components/Document/DocumentTypeCard.tsx`
- Modify: `frontend/src/features/operation/components/Turma/TurmaConfigCard.tsx:74`

**Interfaces:**
- Consumes: nada.
- Produces: nada. Só cor.

- [ ] **Step 1: `RedatorDesignation.tsx` — 7 pontos**

| Linha | De | Para |
|---|---|---|
| 14 | `className="text-sm font-medium uppercase tracking-wide text-slate-500"` | `className="text-sm font-medium uppercase tracking-wide"` + `style={{ color: 'var(--text-color-secondary)' }}` |
| 16 | `className="text-sm text-slate-500"` | `className="text-sm"` + `style={{ color: 'var(--text-color-secondary)' }}` |
| 22 | `className="… rounded-lg border border-slate-200 p-3 dark:border-slate-700"` | `className="… rounded-lg border p-3"` + `style={{ borderColor: 'var(--surface-border)' }}` |
| 50 | `className="text-sm text-slate-500"` | `className="text-sm"` + `style={{ color: 'var(--text-color-secondary)' }}` |
| 51 | `className="text-sm text-red-600"` | `className="text-sm"` + `style={{ color: 'color-mix(in srgb, var(--red-500) 70%, var(--text-color))' }}` |
| 55 | `className="text-sm text-slate-500"` | `className="text-sm"` + `style={{ color: 'var(--text-color-secondary)' }}` |
| 59 | `className="… rounded-lg border border-slate-200 p-3 dark:border-slate-700"` | `className="… rounded-lg border p-3"` + `style={{ borderColor: 'var(--surface-border)' }}` |

Preserve todas as classes de layout de cada linha (`flex`, `items-center`, `justify-between`,
`gap-4`); só as classes de **cor** saem.

- [ ] **Step 2: `DocumentTypeCard.tsx` — 5 pontos**

| Linha | De | Para |
|---|---|---|
| 31 | `className="rounded border border-slate-200 p-4 dark:border-slate-700"` | `className="rounded border p-4"` + `style={{ borderColor: 'var(--surface-border)' }}` |
| 62 | `className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300"` | `className="flex items-center gap-2 text-sm"` + `style={{ color: 'var(--text-color)' }}` |
| 65 | `className="text-slate-400"` | `style={{ color: 'var(--text-color-secondary)' }}` |
| 80 | `className="text-sm text-slate-400"` | `className="text-sm"` + `style={{ color: 'var(--text-color-secondary)' }}` |
| 82 | `className="mt-2 text-xs text-slate-400"` | `className="mt-2 text-xs"` + `style={{ color: 'var(--text-color-secondary)' }}` |

- [ ] **Step 3: `TurmaConfigCard.tsx:74` — 1 ponto**

```tsx
      {f.generalError && (
        <p className="text-sm" style={{ color: 'color-mix(in srgb, var(--red-500) 70%, var(--text-color))' }}>
          {f.generalError}
        </p>
      )}
```

- [ ] **Step 4: Provar que os 3 arquivos ficaram limpos**

De `frontend/`:

```bash
grep -rnE "(text|bg|border)-(slate|gray|red|green|emerald|sky|blue|amber|yellow|purple)-[0-9]{2,3}" \
  src/features/operation/components/Turma/RedatorDesignation.tsx \
  src/features/operation/components/Document/DocumentTypeCard.tsx \
  src/features/operation/components/Turma/TurmaConfigCard.tsx
```

Esperado: nenhuma linha.

- [ ] **Step 5: Verificar build**

De `frontend/`:

```bash
pnpm lint && pnpm build
```

Esperado: ambos sem erro.

- [ ] **Step 6: Provar na tela**

`/operacion` → abrir uma turma → abas `Configuración`, `Redactores` e `Documentación`, **nos dois
temas**. Esperado: nenhuma borda cinza-claro presa no tema escuro, nenhum texto secundário
ilegível, e a mensagem de erro de configuração legível quando você salva com data final anterior à
inicial.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/features/operation
git commit -m "feat(operacion): cor do interior das abas de turma por variavel do tema"
```

---

## Task 37: shell — colapso por viewport e padding responsivo

Exceção aprovada e delimitada (spec D17). Só isto sai do shell nesta parte.

**Files:**
- Create: `frontend/src/shared/hooks/useIsCompactViewport.ts`
- Modify: `frontend/src/shared/hooks/index.ts`
- Modify: `frontend/src/app/layouts/Sidebar/Sidebar.tsx`
- Modify: `frontend/src/app/layouts/AppLayout.tsx`

**Interfaces:**
- Consumes: nada.
- Produces: `useIsCompactViewport(): boolean` — `true` abaixo de 1024px.

- [ ] **Step 1: Criar o hook**

```ts
// frontend/src/shared/hooks/useIsCompactViewport.ts
import { useSyncExternalStore } from 'react'

const COMPACT = '(max-width: 1023px)'

/**
 * `true` abaixo de 1024px. Só leitura: **não** escreve no `uiStore`, para o
 * toggle manual do usuário continuar valendo quando a janela voltar a crescer.
 *
 * `useSyncExternalStore` em vez de `useState` + `useEffect`: o valor inicial sai
 * correto já na primeira renderização, sem um frame com a sidebar expandida numa
 * tela estreita.
 */
export function useIsCompactViewport() {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(COMPACT)
      mql.addEventListener('change', onChange)
      return () => mql.removeEventListener('change', onChange)
    },
    () => window.matchMedia(COMPACT).matches,
    () => false,
  )
}
```

- [ ] **Step 2: Exportar no barrel**

Em `frontend/src/shared/hooks/index.ts`, acrescente na ordem já usada pelo arquivo:

```ts
export * from './useIsCompactViewport'
```

Se o barrel usar exports nomeados explícitos em vez de `export *`, siga o padrão existente.

- [ ] **Step 3: Forçar o colapso na `Sidebar`**

Em `frontend/src/app/layouts/Sidebar/Sidebar.tsx`, troque a leitura do estado:

```tsx
  const compact = useIsCompactViewport()
  // Abaixo de 1024px a sidebar expandida come a largura útil e empurra a tabela
  // para fora da janela. O colapso é imposto pela viewport sem tocar no estado
  // persistido: ao alargar de volta, a preferência do usuário volta com ele.
  const collapsed = useUiStore((s) => s.sidebarCollapsed) || compact
```

e importe o hook: `import { usePermissions, useIsCompactViewport } from '@shared/hooks'` (mantendo o
que já é importado dali).

O botão de toggle continua visível e funcional; em tela estreita ele expande enquanto o usuário
quiser, porque `collapsed` só é forçado quando o store está `false`. Se preferir travar o toggle no
compacto, **não** faça agora — seria decisão nova.

- [ ] **Step 4: Padding responsivo do `AppLayout`**

Em `frontend/src/app/layouts/AppLayout.tsx`:

```tsx
        <main className="flex-1 overflow-auto p-4 sm:p-6">
```

`bg-slate-50 dark:bg-slate-950` **fica** — é a aparência que o João aprovou (spec §7); trocá-la por
variável do tema mudaria a cor de fundo. Vira pendência, não task.

- [ ] **Step 5: Verificar build**

De `frontend/`:

```bash
pnpm lint && pnpm build
```

Esperado: ambos sem erro.

- [ ] **Step 6: Provar na tela**

Com o navegador em 1400px: sidebar como sempre, toggle funcionando. Estreite para 900px: a sidebar
colapsa sozinha. Volte para 1400px: ela reabre, respeitando o estado que o usuário tinha antes.
Em 768px: a página **não** rola na horizontal em `/comercial`, `/operacion`, `/cursos`, `/personas` e
`/administracion`. Nos dois temas.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/shared/hooks frontend/src/app/layouts
git commit -m "feat(shell): sidebar colapsa por viewport e padding responsivo no layout"
```

---

## Task 38: `TurmaCreatePage` no padrão das telas de detalhe

Última tela com cabeçalho de voltar artesanal — achado Minor aceito no review de branch da Parte 3.

**Files:**
- Modify: `frontend/src/features/operation/components/Turma/TurmaCreatePage.tsx`

**Interfaces:**
- Consumes: `DetailHeader` e `AppCard` (Parte 3, Tasks 19 e 1).
- Produces: nada.

- [ ] **Step 1: Reescrever a página**

```tsx
// frontend/src/features/operation/components/Turma/TurmaCreatePage.tsx
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { AppCard, DetailHeader } from '@shared/ui'
import { TurmaConfigCard } from './TurmaConfigCard'

export function TurmaCreatePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { quoteId } = useParams<{ quoteId: string }>()
  const quote = Number(quoteId)

  return (
    <div>
      <DetailHeader
        back={{ label: t('operation.detail.back'), onClick: () => navigate('/operacion') }}
        title={t('operation.create.title')}
      />
      <AppCard>
        <TurmaConfigCard
          mode="create"
          quoteId={quote}
          onSaved={(id) => navigate(`/operacion/turmas/${id}`)}
          onCancel={() => navigate('/operacion')}
        />
      </AppCard>
    </div>
  )
}
```

Some junto o par `border-slate-200 dark:border-slate-700` da `<div>` que o `AppCard` substitui, e o
link de voltar passa a ser o mesmo componente das outras duas telas de detalhe.

- [ ] **Step 2: Verificar build**

De `frontend/`:

```bash
pnpm lint && pnpm build
```

Esperado: ambos sem erro.

- [ ] **Step 3: Provar na tela**

`/operacion` → no card de alerta, `Configurar turma` de uma cotação pendente. Esperado: cabeçalho
igual ao do detalhe de turma (link de voltar acima do título), formulário dentro de um card com a
mesma borda e o mesmo fundo das outras telas. Voltar leva para `/operacion`. Nos dois temas.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/features/operation/components/Turma/TurmaCreatePage.tsx
git commit -m "feat(operacion): TurmaCreatePage usa DetailHeader e AppCard"
```

---

## Task 39: passada final do checklist H.2.1 e DoD do bloco

Task de verificação: nada aqui é implementação por antecipação. O que ela achar quebrado vira
correção **dentro** desta task, com commit próprio, ou achado registrado para o `/revisar-sprint`.

**Files:**
- Modify: apenas o que a verificação reprovar.

**Interfaces:**
- Consumes: tudo das Tasks 27 a 38.
- Produces: nada.

- [ ] **Step 1: Rodar os greps de prova**

De `frontend/`:

```bash
grep -rn "window.confirm" src                                     # P-11, fechada na Parte 3
grep -rn "grid-cols-2" src/features | grep -v "sm:grid-cols-2" | grep -v "md:grid-cols-2"
grep -rn "uppercase text-slate-500" src/features
grep -rnE "(text|bg|border)-(slate|gray|red|green|emerald|sky|blue|amber|yellow|purple|indigo|rose|zinc|neutral|stone|orange|teal|cyan|lime|violet|fuchsia|pink)-[0-9]{2,3}" src/shared/ui
grep -rn "from 'primereact" src/features                          # lei §5.6
```

Esperado: os cinco vazios.

- [ ] **Step 2: Rodar o gate mecânico e a paridade de locales**

De `frontend/`:

```bash
pnpm lint && pnpm build
```

De `frontend/src/shared/config/locales/`, o script de paridade. Esperado: `es-pt: []` e `es-en: []`.

- [ ] **Step 3: Conferir os 8 itens do checklist H.2.1, item a item**

| Item | Como provar | Onde foi entregue |
|---|---|---|
| Tabelas responsivas em mobile | janela em 768px, `/comercial`: página sem scroll horizontal, tabela rolando dentro do card | Task 29 (D20) |
| Dialogs em telas estreitas | 768px, `Nuevo cliente`: campos em uma coluna | Task 33 |
| Loading consistente | detalhe de orçamento abre com skeleton, não com texto | Tasks 28 e 32 (D19) |
| Empty com mensagem e ação | buscar `zzz` em Comercial: `Sin resultados` + `Limpiar búsqueda` | Parte 1 (D5) — só conferir |
| Erro visível, nunca em silêncio | `docker compose stop nginx` → as 5 telas de módulo e as 2 de detalhe mostram texto + `Reintentar` | Tasks 27, 29–32 (D16) |
| Densidade e espaçamento | cabeçalho em caixa alta, linha alta, sem zebra | Parte 1 (Task 4) — só conferir |
| Contraste e teclado nos formulários | ver Step 4 | Tasks 35–36 (D18) |
| Forms de `shared/ui`, sem duplicação | `grep -rnE "<(input\|select\|textarea)[ >]" src/features` vazio; nenhum `<h3>` de seção copiado | Task 34 (D21) |

- [ ] **Step 4: Prova de teclado e contraste**

Em `/comercial` → `Nuevo cliente`, **sem tocar o mouse**:

1. `Tab` a partir do primeiro campo percorre os controles na **ordem visual**, incluindo os
   aninhados de endereço e contato.
2. Cada controle focado mostra anel de foco visível — nos **dois** temas.
3. `Esc` fecha o diálogo; `Tab` não escapa dele enquanto aberto.
4. Force um 422 (RUT inválido) e confirme que a mensagem de erro é legível no tema escuro.

Se algum falhar, corrija **aqui**: anel de foco some → `pt` do wrapper correspondente em
`shared/ui`; ordem de tabulação errada → ordem do JSX, nunca `tabIndex` positivo.

- [ ] **Step 5: Prova visual das telas tocadas, nos dois temas**

Com o `OperationDemoSeeder` carregado: `/comercial`, `/operacion`, `/cursos`, `/personas`,
`/administracion`, detalhe de orçamento, detalhe de turma (5 abas) e `Configurar turma`. Em cada uma:
tema claro e escuro, 1400px e 768px.

- [ ] **Step 6: Commit, se houver correção**

```bash
git add frontend/src
git commit -m "fix(ui): correcoes da passada final do checklist H.2.1"
```

Sem correção, não há commit — a task fecha com as verificações registradas no ledger.

---

# Handoff de execução — Parte 4

**executor:** `claude` nas Tasks 27–30, 32, 35, 37, 38 e 39; `codex` nas Tasks 31, 33, 34 e 36.

| Tasks | Executor | Por quê |
|---|---|---|
| 27–30 | `claude` | Contrato compartilhado novo (`AppErrorState`, `AppSkeleton`) e mudança de contrato em `AppDataTable` e `useCrudPage`, que as demais tasks e todas as telas consomem. Erro aqui não é local. |
| 31 | `codex` | Duas props repassadas em 12 arquivos, sem decisão de design: o `AppErrorState` é montado pelo wrapper, não pelo chamador. Verificação executável. |
| 32 | `claude` | Ordem das guardas (`loadError` antes de `notFound`) é julgamento, não replicação — invertida, a tela mente sobre o banco. |
| 33, 34 | `codex` | Substituição literal em 9 e 13 pontos, com grep de prova. O código de `shared/` (`AppDialog/style.ts`, `FormSection`) está escrito no plano, sem latitude de design. |
| 35 | `claude` | `shared/ui` inteiro; a fórmula de contraste precisa valer nos dois temas em componentes que todas as telas consomem. |
| 36 | `codex` | Tabela de trocas linha a linha em 3 arquivos, com grep de prova. |
| 37, 38 | `claude` | Exceção ao shell (§7) e composição de tela. |
| 39 | `claude` | Julgamento visual e de acessibilidade; nenhum item se prova só por comando. |

**Pré-condição do handoff da Task 31:** Tasks 29 e 30 commitadas e verdes — sem elas o build quebra
no primeiro arquivo.

**Pré-condição do handoff da Task 36:** nenhuma; é independente das demais.

Como nas Partes 2 e 3, **o Codex não commita**: o Claude confere o diff contra `paths_autorizados`,
roda `pnpm lint`, `pnpm build` e os greps de prova por conta própria e commita task a task. Ao
delegar, o pedido manda o Codex usar a skill `superpowers:executing-plans` além da
`lotus-execute-block`.

**`paths_autorizados` da Task 31:**

```
frontend/src/features/commercial/components/Client/ClientsTable.tsx
frontend/src/features/commercial/components/Budget/BudgetsTable.tsx
frontend/src/features/commercial/components/CommercialPage.tsx
frontend/src/features/catalog/components/Course/CoursesTable.tsx
frontend/src/features/catalog/components/CatalogPage.tsx
frontend/src/features/identity/components/Redator/RedatoresTable.tsx
frontend/src/features/identity/components/Admin/UsersTable.tsx
frontend/src/features/identity/components/Admin/RolesTable.tsx
frontend/src/features/identity/components/PeoplePage.tsx
frontend/src/features/identity/components/AdministracionPage.tsx
frontend/src/features/operation/components/Turma/TurmasTable.tsx
frontend/src/features/operation/components/OperationPage.tsx
```

**`paths_autorizados` das Tasks 33 e 34:**

```
frontend/src/shared/ui/AppDialog/style.ts
frontend/src/shared/ui/FormSection/**
frontend/src/shared/ui/index.ts
frontend/src/features/commercial/components/Client/AddressFields.tsx
frontend/src/features/commercial/components/Client/ClientDialog.tsx
frontend/src/features/commercial/components/Budget/QuoteWizard.tsx
frontend/src/features/catalog/components/Course/CourseDialog.tsx
frontend/src/features/identity/components/Admin/StaffUserDialog.tsx
frontend/src/features/identity/components/Admin/RoleDialog.tsx
frontend/src/features/identity/components/Redator/RedatorDialog.tsx
```

**`paths_autorizados` da Task 36:**

```
frontend/src/features/operation/components/Turma/RedatorDesignation.tsx
frontend/src/features/operation/components/Turma/TurmaConfigCard.tsx
frontend/src/features/operation/components/Document/DocumentTypeCard.tsx
```

Fora desses globs o Codex não escreve. `backend/`, `docs/`, `frontend/src/shared/types/`,
`frontend/src/app/` e `frontend/src/shared/ui/AppDataTable/**` ficam explicitamente fora.

# DoD da Parte 4 — e do bloco

1. Janela em 768px: nenhuma das 5 páginas de módulo rola na horizontal; a tabela rola dentro do card.
2. Diálogo de cliente em 768px: campos em uma coluna.
3. Com a API derrubada, as 5 páginas de módulo e as 2 de detalhe mostram falha **com texto** e
   `Reintentar`; nenhuma oferece cadastrar sobre a falha. Com a API de volta, `Reintentar` recarrega.
4. Telas de detalhe abrem com skeleton, não com texto.
5. `Tab` percorre `ClientDialog` na ordem visual, com foco visível nos dois temas.
6. Os 5 greps do Step 1 da Task 39 vazios.
7. Tudo provado nos dois temas, com o `OperationDemoSeeder` carregado.
