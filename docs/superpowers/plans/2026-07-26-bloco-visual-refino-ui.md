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

# Partes 2, 3 e 4 — planejadas nos respectivos gates

O `CLAUDE.md` §4 manda escrever o plano detalhado de um bloco **imediatamente antes** de executá-lo,
para que o roadmap adiante não envelheça. As Partes 2 a 4 consomem a API do `AppCard` que a Parte 1
constrói, e essa API é exatamente o que o review da Parte 1 pode mandar mudar. Escrever JSX exato
para sete telas contra um contrato ainda não revisado produziria plano para reescrever.

Cada parte abaixo declara escopo, arquivos e DoD. O plano passo a passo de cada uma é escrito no
gate de review da parte anterior.

## Parte 2 — Operación, Cursos, Pessoas, Administración

**Entra quando:** o DoD da Parte 1 estiver provado por ti na tela.

**Arquivos:**
- `frontend/src/features/operation/components/OperationPage.tsx`
- `frontend/src/features/operation/components/Turma/TurmasTable.tsx`
- `frontend/src/features/operation/components/Turma/PendingQuotesPanel.tsx`
- `frontend/src/features/catalog/components/CatalogPage.tsx`
- `frontend/src/features/catalog/components/Course/CoursesTable.tsx`
- `frontend/src/features/identity/components/PeoplePage.tsx`
- `frontend/src/features/identity/components/Redator/RedatoresTable.tsx`
- `frontend/src/features/identity/components/AdministracionPage.tsx`
- `frontend/src/features/identity/components/Admin/UsersTable.tsx`
- `frontend/src/features/identity/components/Admin/RolesTable.tsx`
- `frontend/src/shared/ui/ModulePage/ModulePage.tsx` e `PageHeader/PageHeader.tsx` (remoção final de
  `actions`)
- Os 3 locales, para o rename de chave de título.

**Escopo:**
- Mesma composição da Parte 1 nas quatro páginas.
- `TurmasTable.tsx:53` — `text-sky-600` vira `var(--primary-color)` (D8; a coluna `CÓDIGO` **fica**,
  seguindo exibindo `quote_code`).
- `PendingQuotesPanel` vira `AppCard` de alerta acima do card principal, com `AppCardHeader`
  levando título e badge de contagem.
- `CatalogPage` — hoje usa `ModuleTabs` com **uma aba só**, contra o contrato do próprio
  `ModulePage`; a tabela passa a ir direto no `AppCard`, sem abas.
- Rename das chaves de título de módulo. Os 3 locales **já rendem o texto certo**
  (`Comercial`/`Comercial`/`Commercial` e `Personas`/`Pessoas`/`People`); o débito é a chave estar
  pendurada na entidade, com `budget.module` duplicando `client.module`. Mudança visível: nenhuma.
- Aba Alunos de `PeoplePage` segue o `<p>` inline (backlog item 2); só passa a viver dentro do card
  sem parecer quebrada.
- **Última task da parte:** remover `actions` de `ModulePage` e `PageHeader`, agora sem consumidor.
  O `pnpm build` é a prova — se alguém ainda passar, o `tsc` acusa.

**DoD:** as cinco páginas com a mesma composição; `Cursos` sem aba única; código da turma com
variável do tema no inspetor, não `text-sky-600`; `grep -rn "actions=" frontend/src/features` sem
ocorrência em `ModulePage`; os 3 locales com chaves idênticas pelo script da Task 2, Step 6.

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

**Escopo:**
- Três `AppCard variant="stat"` no detalhe de orçamento: total cotizado `neutral`, total aprobado
  `success`, total rechazado `danger`.
- `AppCardHeader` com badge de contagem e ação secundária nos cards de Cotizaciones e Documentos.
- Lista de cotizaciones mantém alternância de fundo como separação de item — é lista empilhada, não
  tabela, e a decisão de "sem zebra" (D4) vale para tabela.
- Detalhe de turma: tags de estado e modalidade no `PageHeader` via a prop `tags` da Task 5; as cinco
  abas dentro do `AppCard`. A modalidade `Online` usa `tone="accent"` da Task 3.
- Aba Alumnos: grupo de botões **à esquerda** no slot `start` da toolbar, sem busca.

**DoD:** os três stat cards nas cores certas nos dois temas; aprovar e rejeitar cotização no lugar e
funcionando contra a API real; detalhe de turma com tags no cabeçalho e cinco abas dentro do card;
`Online` roxo e `Presencial` neutro.

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

**executor:** `claude` para as Partes 1, 3 e 4; `codex` candidato para a Parte 2.

| Parte | Executor | Por quê |
|---|---|---|
| 1 | `claude` | Define o contrato que todas as outras copiam. Erro aqui se replica em sete telas. |
| 2 | `codex` | Replicação mecânica de padrão já aprovado e revisado, com verificação executável (`pnpm lint`, `pnpm build`, script de paridade de locales) e paths fechados. |
| 3 | `claude` | Composição heterogênea — stat cards, cabeçalho de card com ação, lista com alternância, abas com conteúdo diferente por aba. Julgamento visual fora do plano. |
| 4 | `claude` | Julgamento visual e de acessibilidade em sete telas; nenhum item se prova por comando. |

**`paths_autorizados` da Parte 2 (quando delegada ao `codex`):**

```
frontend/src/features/operation/components/OperationPage.tsx
frontend/src/features/operation/components/Turma/TurmasTable.tsx
frontend/src/features/operation/components/Turma/PendingQuotesPanel.tsx
frontend/src/features/catalog/components/**
frontend/src/features/identity/components/PeoplePage.tsx
frontend/src/features/identity/components/AdministracionPage.tsx
frontend/src/features/identity/components/Admin/**
frontend/src/features/identity/components/Redator/RedatoresTable.tsx
frontend/src/shared/ui/ModulePage/**
frontend/src/shared/ui/PageHeader/**
frontend/src/shared/config/locales/*.json
```

Fora desses globs, o Codex não escreve. `backend/`, `docs/` e `frontend/src/shared/types/` ficam
explicitamente fora.
