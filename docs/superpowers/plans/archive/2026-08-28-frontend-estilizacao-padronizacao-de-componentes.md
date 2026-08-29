# Padronização de estilização de componentes — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** fazer o mesmo papel visual sair numa grafia só — botão, título, rótulo de seção, número de estatística e dado técnico — e executar a assinatura que o ADR-16 elegeu (o folio tratado como artefato), deixando catraca em cada frente.

**Architecture:** quatro fases na ordem da spec. Grafia sobre elemento existente vira constante exportada de `shared/ui`; papel com markup próprio vira componente de `shared/ui`. As features consomem pelo barrel — nunca PrimeReact direto, nunca outra feature. Nenhuma cor nova: tudo lê token do tema.

**Tech Stack:** React 19 + TS, Vite, Tailwind v4 (layout), PrimeReact via `shared/ui`, Vitest + Testing Library (jsdom), ESLint flat config.

**Spec:** [`docs/superpowers/specs/2026-08-28-frontend-estilizacao-padronizacao-de-componentes-design.md`](../../specs/archive/2026-08-28-frontend-estilizacao-padronizacao-de-componentes-design.md)

## Global Constraints

- Bloco **frontend puro**. Não toca `backend/` nem `frontend/src/shared/types/generated.ts`. `pint` e `typescript:transform` são N/A por escopo — **medidos** no fechamento, não supostos.
- Feature não importa PrimeReact direto (só via `shared/ui`) nem outra feature, nem para tipo (ADR-05, lei §5.6).
- Tailwind é **layout**; cor vem de variável do tema (ADR-16). Há catraca de lint sobre `className` e sobre `style`.
- Todo `<ul>`/`<ol>` novo carrega `role="list"` — o mini-reset da P-46 zera o marcador (catraca `LISTA_SEM_SEMANTICA`).
- Comando roda de `frontend/`: `pnpm lint`, `pnpm build`, `pnpm test`.
- Chave de i18n nova entra nas **três** locales (`es-CL.json`, `en.json`, `pt-BR.json`) — há catraca de paridade.
- Commit por task. Nunca `git stash` sem `-m` nesta árvore (a pilha é compartilhada).

## Correções ao desenho, medidas na escrita deste plano

Três medições feitas aqui alteram o que a spec previa. Elas valem sobre o texto da spec.

1. **D1 (Sidebar) — a premissa do `viewBox` não se aplica.** O asset é PNG (`src/assets/LogoDark.png`, 335×466, RGBA), não SVG. Medida a caixa opaca: padding transparente de 31px à esquerda, 12px à direita, 15px no topo, 27px no pé. Renderizado em `h-30` (120px de altura → ~86px de largura), esse padding esquerdo vale **~8px na tela** — não explica os 60px do `ml-15`. Logo: recortar o asset **não** fecha o achado, e o `ml-15` é empurrão manual puro. A Task 14 tira o `ml-15` e devolve o posicionamento ao `justify-between` do contêiner; o `h-30` **fica**, porque é a altura do wordmark e não um número de compensação (sem ele o `<img>` renderiza nos 466px naturais). O que a run de UI-review decidir sobre a altura volta como decisão do João, não como novo empurrão.
2. **D3 (Login) — a limitação §7 da spec está paga, e passa.** `--shell-ink` e `--shell-ink-muted` são `oklch()`; convertidos a sRGB dão `#cad5e2` e `#90a1b9`. Contra as duas pontas do `--brand-gradient` (`--primary-900` `#0c3549` e `--brand-navy` `#0f2b3d`): `--shell-ink` mede **8,71:1** e **9,86:1**; `--shell-ink-muted` mede **4,93:1** e **5,57:1**. Os dois passam o 4,5:1 de texto na ponta pior. A troca entra.
3. **A `D-62` tem uma única ocorrência viva, e o seletor foi medido antes de virar task.** Rodado contra `src/features/**/*.tsx`, o seletor da Task 15 reprova exatamente `BudgetDocumentsCard.tsx:36` — a quinta ocorrência que a ficha previa nascer verde. Os demais `AppDropdown` de feature são descendentes de `FormField`, que entrega `inputId` por contexto, e são grafia **certa**. A sonda negativa (remover o `inputId` de `TurmaStatusFilter.tsx:44`) foi rodada e reprovou nomeando o arquivo.

Um quarto ponto, deixado explícito porque a spec não o decidiu: **`FormSection` e os quatro `h3` de operation consomem `SectionLabel` com `rule={false}`.** O default `true` da D6 mantém os 8 sítios do Dashboard byte-idênticos; acrescentar hairline em 13 seções de diálogo e em faixas que já dividem linha com botão/tag seria mudança visual que nenhum achado pediu.

---

## Estrutura de arquivos

**Criados:**

- `frontend/src/shared/ui/typography.ts` — as quatro grafias tipográficas por papel, como constantes. Arquivo plano (não pasta): não é componente, mesmo critério do `archivedColumns.tsx`.
- `frontend/src/shared/ui/typography.test.ts` — catraca das constantes.
- `frontend/src/shared/ui/AppButton/AppButton.test.tsx` — catraca do vocabulário de botão.
- `frontend/src/shared/ui/SectionLabel/SectionLabel.tsx` + `index.ts` + `SectionLabel.test.tsx` — o `SectionLabel` promovido, com nível e hairline por prop.
- `frontend/src/shared/ui/StatValue/StatValue.tsx` + `index.ts` + `StatValue.test.tsx` — o número de estatística.
- `frontend/src/shared/ui/CertificateFolio/CertificateFolio.tsx` + `index.ts` + `CertificateFolio.test.tsx` — a assinatura.
- `.claude/rules/frontend-estilizacao.md` — a regra escrita.

**Modificados:** `AppButton/style.ts`, `AppButton.tsx` (nada), 20 call sites de variant, `PageHeader.tsx`, `DetailHeader.tsx`, `FormSection.tsx`, `FormField.tsx`, `AppTabView.tsx`, `shared/ui/index.ts`, `ValidationPage.tsx`, `IssuedDialog.tsx`, `HistorialTable.tsx`, `KpiRow.tsx`, `BudgetStatCard.tsx`, `ProfileSummaryCard.tsx`, `Sidebar.tsx`, `LoginPage.tsx`, `BudgetDocumentsCard.tsx`, `eslint.config.js`, as 3 locales.

**Removido:** `frontend/src/app/pages/Dashboard/SectionLabel.tsx` (sobe para `shared/ui`).

---

# Fase 1 — vocabulário de botão (B1, B2, B3)

### Task 1: `appButtonStyles` nomeia PAPEL

**Files:**
- Modify: `frontend/src/shared/ui/AppButton/style.ts:25-47`
- Test: `frontend/src/shared/ui/AppButton/AppButton.test.tsx` (criar)
- Modify (call sites): os 22 sítios listados no Step 4

**Interfaces:**
- Produz: `appButtonStyles` com as chaves `primary | compact | iconToggle | noSurface`; `AppButtonVariant = keyof typeof appButtonStyles`. `brandIcon` e `brandLabel` deixam de existir — o `tsc` é quem aponta call site esquecido.

- [ ] **Step 1: Escrever o teste que falha**

Criar `frontend/src/shared/ui/AppButton/AppButton.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest'
import { appButtonStyles } from './style'

/**
 * O vocabulário nomeia PAPEL, não aparência. `brandIcon` era o nome do
 * só-ícone e virou a CTA do produto em 17 sítios com `label=`, enquanto
 * `brandLabel` — o nome que sugeria rótulo — sobrou em 2 (achado B1 do audit de
 * 2026-08-26). Nome que mente faz a próxima CTA nascer no variant errado.
 */
describe('vocabulário de botão', () => {
  it('as chaves são os quatro papéis, e os nomes velhos não voltam', () => {
    expect(Object.keys(appButtonStyles).sort()).toEqual(
      ['compact', 'iconToggle', 'noSurface', 'primary'],
    )
  })

  /**
   * A promessa da D3: o rename NÃO mexe na cascata dos 17 sítios. `primary`
   * herda o padding e o tamanho de fonte do `.p-button` do Lara-Lotus
   * (0.75rem 1.25rem, 1rem) porque não declara os seus. Declarar padding aqui
   * encolheria as 17 CTAs — foi o que a medição do desenho pegou, contra o
   * "byte-idêntico" que o audit supôs sem medir.
   */
  it('`primary` não declara padding nem tamanho de fonte — herda o tema', () => {
    expect(appButtonStyles.primary).not.toMatch(/\b(p|px|py|pt|pb|pl|pr)-/)
    expect(appButtonStyles.primary).not.toMatch(/\btext-(xs|sm|base|lg|xl)\b/)
  })

  /** `iconToggle` é a MESMA superfície de `primary`: o que os separa é o papel
   * (toggle de tema e de colapso não têm rótulo), não a grafia. */
  it('`iconToggle` e `primary` compartilham a grafia', () => {
    expect(appButtonStyles.iconToggle).toBe(appButtonStyles.primary)
  })

  /** `compact` é o único que aperta a geometria — é o seletor de idioma e o
   * "Aprobar" dentro da linha de cotação, onde o botão do tema não cabe. */
  it('`compact` aperta padding e fonte, e só ele', () => {
    expect(appButtonStyles.compact).toContain('px-3 py-2.5 text-sm')
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
cd frontend && pnpm test src/shared/ui/AppButton/AppButton.test.tsx
```

Esperado: FAIL — `expect(received).toEqual(expected)` com `['brandIcon','brandLabel','noSurface']` recebido.

- [ ] **Step 3: Renomear no `style.ts`**

Em `frontend/src/shared/ui/AppButton/style.ts`, trocar o bloco das duas primeiras chaves (linhas 25-29) por:

```ts
export const appButtonStyles = {
  /**
   * Ação primária. É o botão que abre módulo, salva diálogo e confirma
   * emissão — 17 call sites com `label=`.
   *
   * **Não declara padding nem tamanho de fonte, de propósito.** Herda o
   * `.p-button` do Lara-Lotus (`0.75rem 1.25rem`, `1rem`), que é a geometria
   * que estes 17 sítios já pagam hoje sob o nome `brandIcon`. Declarar aqui a
   * geometria do antigo `brandLabel` (`px-3 py-2.5 text-sm`) encolheria os 17
   * — fonte 16→14, padding 20→12. O audit de 2026-08-26 supôs que o rename
   * seria byte-idêntico; medido, os dois lados divergiam, e o lado com 17
   * sítios é o que fica parado (spec D3).
   */
  primary: `flex items-center justify-center ${brandOutline}`,
  /** Marca, só-ícone: os toggles de tema e de colapso da sidebar. Mesma
   * superfície da `primary` — o que separa é o papel, não a grafia. */
  iconToggle: `flex items-center justify-center ${brandOutline}`,
  /** Marca apertada, para caber onde a geometria do tema não cabe: o seletor
   * de idioma ("EN") e o "Aprobar" dentro da linha de cotação. */
  compact: `flex items-center gap-1 px-3 py-2.5 text-sm ${brandOutline}`,
```

- [ ] **Step 4: Migrar os 22 call sites**

```bash
cd frontend
grep -rl 'variant="brandIcon"' src/ | xargs sed -i 's/variant="brandIcon"/variant="primary"/g'
grep -rl 'variant="brandLabel"' src/ | xargs sed -i 's/variant="brandLabel"/variant="compact"/g'
sed -i 's/variant="primary"/variant="iconToggle"/' src/shared/ui/AppearanceControls/AppearanceControls.tsx
sed -i 's/variant="primary"/variant="iconToggle"/' src/app/layouts/Sidebar/Sidebar.tsx
```

Os dois `sed` finais são os **toggles**: `AppearanceControls.tsx:26` (tema) e `Sidebar.tsx:53` (colapso) são os únicos `variant=` desses dois arquivos. O `DetailHeader.tsx:43` fica em `primary` nesta task — vira ação terciária na Task 2, e passar por `primary` mantém a árvore compilando entre as duas.

- [ ] **Step 5: Rodar o teste e o type-check**

```bash
cd frontend && pnpm test src/shared/ui/AppButton/AppButton.test.tsx && pnpm build
```

Esperado: 4 testes PASS; `tsc -b` sem erro (nenhum call site ficou com nome velho).

- [ ] **Step 6: Provar a varredura completa por grep**

```bash
cd frontend && grep -rn 'brandIcon\|brandLabel' src/ ; echo "exit=$?"
```

Esperado: nenhuma linha, `exit=1`.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/shared/ui/AppButton/ frontend/src/
git commit -m "refactor(ui): variant de botao nomeia papel, nao aparencia"
```

---

### Task 2: "Voltar" sai do variant de marca (B2)

**Files:**
- Modify: `frontend/src/shared/ui/DetailHeader/DetailHeader.tsx:41-51`
- Test: `frontend/src/shared/ui/DetailHeader/DetailHeader.test.tsx`

- [ ] **Step 1: Escrever o teste que falha**

Acrescentar em `frontend/src/shared/ui/DetailHeader/DetailHeader.test.tsx`:

```tsx
/**
 * O "Voltar" vestia o MESMO variant de marca da ação primária que ele antecede
 * (achado B2): em `BudgetDetailPage` o cabeçalho abria com dois botões de marca
 * lado a lado, e a hierarquia dizia que sair e agregar cotação pesam igual.
 * Navegação de volta é ação terciária.
 */
it('o "Voltar" não veste a marca — é ação terciária', () => {
  const { container } = render(
    <DetailHeader title="Presupuesto 12" back={{ label: 'Volver', onClick: () => {} }} />,
  )

  const voltar = screen.getByRole('button', { name: /Volver/ })
  expect(voltar.className).not.toContain('border-[var(--brand-ink)]')
  expect(voltar.className).toContain('p-button-text')
  expect(container.querySelector('.pi-arrow-left')).not.toBeNull()
})
```

Se o arquivo ainda não importar `screen`, ajustar o import para `import { cleanup, render, screen } from '@testing-library/react'`.

- [ ] **Step 2: Rodar e ver falhar**

```bash
cd frontend && pnpm test src/shared/ui/DetailHeader/DetailHeader.test.tsx
```

Esperado: FAIL em `expect(voltar.className).not.toContain('border-[var(--brand-ink)]')`.

- [ ] **Step 3: Trocar o botão**

Em `frontend/src/shared/ui/DetailHeader/DetailHeader.tsx`, substituir o bloco `{back && (…)}` (linhas 41-51) por:

```tsx
      {/* Ação terciária, não de marca: este botão ANTECEDE a ação primária da
        * página, e vestir a mesma marca dizia que sair e agir pesam igual
        * (achado B2 do audit de 2026-08-26). `text` do tema, com a tinta
        * secundária subindo para a do corpo no hover. */}
      {back && (
        <AppButton
          className="w-fit"
          text
          icon="pi pi-arrow-left"
          label={back.label}
          style={{ color: 'var(--text-color-secondary)' }}
          onClick={back.onClick}
        />
      )}
```

O `icon`/`label` do próprio Prime substitui o `<i>` + texto em `children`: é a mesma composição, sem a `className` de flex à mão. A sujeira de formatação do sítio (`variant="brandIcon"  ` com espaços à direita, indentação torta e `</AppButton >`) sai junto.

- [ ] **Step 4: Rodar o teste**

```bash
cd frontend && pnpm test src/shared/ui/DetailHeader/DetailHeader.test.tsx
```

Esperado: PASS, incluindo os testes que já existiam no arquivo.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/shared/ui/DetailHeader/
git commit -m "refactor(ui): Voltar do DetailHeader vira acao terciaria"
```

---

### Task 3: `ConfirmDialog` confirma com `primary` (B3)

**Files:**
- Modify: `frontend/src/shared/ui/ConfirmDialog/ConfirmDialog.tsx:26-32`
- Test: `frontend/src/shared/ui/ConfirmDialog/ConfirmDialog.test.tsx` (criar)

- [ ] **Step 1: Escrever o teste que falha**

Criar `frontend/src/shared/ui/ConfirmDialog/ConfirmDialog.test.tsx`:

```tsx
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { ConfirmDialog } from './ConfirmDialog'

afterEach(cleanup)

const base = {
  visible: true,
  title: 'Confirmar',
  message: '¿Seguro?',
  onConfirm: () => {},
  onCancel: () => {},
}

/**
 * `CrudDialog` confirmava com a marca e `ConfirmDialog` com o `severity` cru do
 * Lara: dois diálogos do mesmo produto, dois botões de confirmar diferentes
 * (achado B3). Confirmar é a mesma ação nos dois; o que difere é a severidade.
 */
describe('ConfirmDialog — botão de confirmar', () => {
  it('sem severidade, confirma com a marca (igual ao CrudDialog)', () => {
    render(<ConfirmDialog {...base} confirmLabel="Aceptar" />)

    expect(screen.getByRole('button', { name: /Aceptar/ }).className)
      .toContain('border-[var(--brand-ink)]')
  })

  /** Ação destrutiva NÃO veste marca: o preenchido de severidade é o sinal, e
   * trocá-lo por marca apagaria a diferença entre confirmar e destruir. */
  it('com `severity="danger"`, mantém o preenchido de severidade', () => {
    render(<ConfirmDialog {...base} confirmLabel="Eliminar" severity="danger" />)

    const botao = screen.getByRole('button', { name: /Eliminar/ })
    expect(botao.className).toContain('p-button-danger')
    expect(botao.className).not.toContain('border-[var(--brand-ink)]')
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
cd frontend && pnpm test src/shared/ui/ConfirmDialog/ConfirmDialog.test.tsx
```

Esperado: FAIL no primeiro caso — o botão não tem a borda de marca.

- [ ] **Step 3: Aplicar o variant condicional**

Em `frontend/src/shared/ui/ConfirmDialog/ConfirmDialog.tsx`, trocar o segundo `AppButton` do `footer` por:

```tsx
      {/* Sem severidade, confirmar é a ação primária do diálogo e veste a
        * marca — a mesma grafia do `CrudDialog` (achado B3). Com `danger`, o
        * preenchido de severidade é o sinal e a marca sairia por cima dele. */}
      <AppButton
        variant={severity ? undefined : 'primary'}
        label={confirmLabel ?? t('common.save')}
        icon="pi pi-check"
        severity={severity}
        loading={pending}
        onClick={onConfirm}
      />
```

- [ ] **Step 4: Rodar o teste**

```bash
cd frontend && pnpm test src/shared/ui/ConfirmDialog/ConfirmDialog.test.tsx
```

Esperado: 2 PASS.

- [ ] **Step 5: Gate da fase 1 + screenshot**

```bash
cd frontend && pnpm lint && pnpm build && pnpm test
```

Esperado: lint 0 erro, build verde, suíte verde.

Invocar `/lotus-ui-review` nas telas **Comercial** (lista, com a CTA "Nuevo presupuesto"), **detalhe de presupuesto** (Voltar + CTA lado a lado) e um **diálogo de confirmação**, nos **dois temas**. O relatório vai para `docs/superpowers/audits/2026-08-2X-item18-fase1.md` e tem de provar **ausência de delta** nas CTAs — é o que a D3 promete. Delta visível nas CTAs significa que o `primary` ganhou geometria própria: voltar ao Step 3 da Task 1.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/shared/ui/ConfirmDialog/ docs/superpowers/audits/
git commit -m "refactor(ui): ConfirmDialog confirma com marca quando nao ha severidade"
```

---

# Fase 2 — tipografia (A1, A2, A3, A5, E2)

### Task 4: as grafias tipográficas por papel

**Files:**
- Create: `frontend/src/shared/ui/typography.ts`
- Create: `frontend/src/shared/ui/typography.test.ts`
- Modify: `frontend/src/shared/ui/index.ts`

**Interfaces:**
- Produz: `pageTitleClass`, `sectionLabelClass`, `fieldLabelClass`, `statValueClass` (função `(size: 'page' | 'card') => string`). Todas `string`, consumidas por `className`.

- [ ] **Step 1: Escrever o teste que falha**

Criar `frontend/src/shared/ui/typography.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { fieldLabelClass, pageTitleClass, sectionLabelClass, statValueClass } from './typography'

/**
 * Os dois `h1` do produto tinham vozes diferentes — `font-display … tracking-tight`
 * no `PageHeader`, `text-2xl font-bold` no `DetailHeader` (achado A1) — e o
 * título de auth estava copiado literal em 5 arquivos (A5). Uma constante é o
 * que faz a próxima tela herdar a voz em vez de recopiá-la.
 */
describe('grafias tipográficas por papel', () => {
  it('o título de página carrega a família de display e o tracking apertado', () => {
    expect(pageTitleClass).toBe('font-display text-2xl font-semibold tracking-tight')
  })

  it('a faixa de seção é caixa alta miúda com tracking aberto', () => {
    expect(sectionLabelClass).toBe('text-xs font-semibold tracking-wider uppercase')
  })

  /** Rótulo de CAMPO é peça diferente da faixa de seção (spec D5): os `<dt>` da
   * validação e do diálogo de emissão não encabeçam grupo nenhum, e promovê-los
   * a heading inventaria hierarquia numa página pública de peso legal. */
  it('o rótulo de campo não é heading — não carrega o peso da faixa', () => {
    expect(fieldLabelClass).toBe('text-xs uppercase tracking-wide')
    expect(fieldLabelClass).not.toContain('font-semibold')
  })

  /** Número de estatística SEMPRE em `tabular-nums`: sem ele o dígito dança na
   * coluna a cada re-render (o UF do `BudgetStatCard`, achado A3). */
  it('o número de estatística é sempre tabular, nos dois degraus', () => {
    expect(statValueClass('page')).toContain('tabular-nums')
    expect(statValueClass('card')).toContain('tabular-nums')
    expect(statValueClass('page')).toContain('text-3xl')
    expect(statValueClass('card')).toContain('text-2xl')
    expect(statValueClass('page')).toContain('font-display')
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
cd frontend && pnpm test src/shared/ui/typography.test.ts
```

Esperado: FAIL — `Failed to resolve import "./typography"`.

- [ ] **Step 3: Escrever o arquivo**

Criar `frontend/src/shared/ui/typography.ts`:

```ts
/**
 * Grafia tipográfica por PAPEL.
 *
 * Arquivo plano, e não pasta: as pastas deste barrel são pasta-por-COMPONENTE,
 * e isto deliberadamente não é componente — é a grafia que se aplica a um
 * elemento que JÁ tem dono (`h1` do `PageHeader`, `dt` da validação). Mesmo
 * critério do `archivedColumns.tsx`.
 *
 * Quando o papel tem markup próprio — faixa com hairline, número com rótulo,
 * folio com legenda — a peça é componente, não constante daqui (spec D2).
 *
 * Não há cor nenhuma aqui: cor vem de variável do tema por `style` (ADR-16), e
 * quem compõe é quem sabe sobre que superfície o texto pousa.
 */

/**
 * Título de página. Era a grafia do `PageHeader`; o `DetailHeader` pagava
 * `text-2xl font-bold` e os 5 sítios de auth carregavam a mesma frase copiada
 * literal (achados A1 e A5 do audit de 2026-08-26).
 */
export const pageTitleClass = 'font-display text-2xl font-semibold tracking-tight'

/**
 * Faixa que encabeça um grupo. Era a grafia do `SectionLabel` do Dashboard, e o
 * mesmo papel saía em 5 grafias diferentes pelo produto (achado A2).
 */
export const sectionLabelClass = 'text-xs font-semibold tracking-wider uppercase'

/**
 * Rótulo de CAMPO — o `<dt>` de uma lista de definição. Peça diferente da faixa
 * de seção (spec D5): não encabeça grupo, não é heading, não carrega peso.
 */
export const fieldLabelClass = 'text-xs uppercase tracking-wide'

/**
 * Número de estatística. Dois degraus: `page` para o KPI que é o assunto da
 * dobra, `card` para o número dentro de um cartão que já tem outro assunto.
 *
 * `tabular-nums` nos dois, sem exceção: sem ele o dígito muda de largura entre
 * renders e o número dança na coluna — era o caso do UF do `BudgetStatCard`
 * (achado A3).
 */
export const statValueClass = (size: 'page' | 'card'): string =>
  size === 'page'
    ? 'font-display text-3xl leading-none font-semibold tabular-nums'
    : 'font-display text-2xl font-semibold tabular-nums'
```

- [ ] **Step 4: Publicar no barrel**

Em `frontend/src/shared/ui/index.ts`, acrescentar depois da linha `export * from './SearchableTableFrame'`:

```ts
// Arquivo plano pelo mesmo critério do `archivedColumns`: grafia não é componente.
export * from './typography'
```

- [ ] **Step 5: Rodar o teste**

```bash
cd frontend && pnpm test src/shared/ui/typography.test.ts
```

Esperado: 4 PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/shared/ui/typography.ts frontend/src/shared/ui/typography.test.ts frontend/src/shared/ui/index.ts
git commit -m "feat(ui): grafia tipografica por papel em shared/ui"
```

---

### Task 5: os dois `h1` falam a mesma voz, e a margem vira escala (A1, E2)

**Files:**
- Modify: `frontend/src/shared/ui/PageHeader/PageHeader.tsx:14-17,30`
- Modify: `frontend/src/shared/ui/DetailHeader/DetailHeader.tsx:66-71,93-99`
- Test: `frontend/src/shared/ui/PageHeader/PageHeader.test.tsx`

- [ ] **Step 1: Escrever o teste que falha**

Acrescentar em `frontend/src/shared/ui/PageHeader/PageHeader.test.tsx`, com o import `import { pageTitleClass } from '../typography'` no topo:

```tsx
/**
 * Os dois donos do `h1` tinham vozes diferentes: `font-display … tracking-tight`
 * aqui, `text-2xl font-bold` no detalhe (achado A1). Título de página é um papel
 * só; duas grafias fazem a mesma tela mudar de voz ao navegar para o detalhe.
 */
describe('voz única do título de página', () => {
  it.each([
    ['PageHeader', <PageHeader title="Personas" />],
    ['DetailHeader', <DetailHeader title="Presupuesto 12" />],
  ])('%s escreve o h1 com a grafia compartilhada', (_nome, elemento) => {
    const { container } = render(elemento)

    expect(container.querySelector('h1')?.className).toContain(pageTitleClass)
  })

  /**
   * A margem cravada em `em` era o valor que o agente do usuário dava ao `h2`,
   * mantida enquanto o `h1` não era unificado (D6 da spec do item 8). Unificar
   * é o momento que o audit reservou (E2): a margem passa a ser degrau da
   * escala. A superior some — o mini-reset de `index.css` zera `h1..h6`, e o
   * espaçamento acima passa a ser do contêiner.
   */
  it.each([
    ['PageHeader', <PageHeader title="Personas" />],
    ['DetailHeader', <DetailHeader title="Presupuesto 12" />],
  ])('%s não carrega mais a margem do agente do usuário', (_nome, elemento) => {
    const { container } = render(elemento)

    const h1 = container.querySelector('h1')!
    expect(h1.className).not.toContain('my-[0.83em]')
    expect(h1.className).toContain('mb-4')
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
cd frontend && pnpm test src/shared/ui/PageHeader/PageHeader.test.tsx
```

Esperado: FAIL nos quatro casos novos.

- [ ] **Step 3: Aplicar no `PageHeader`**

Em `frontend/src/shared/ui/PageHeader/PageHeader.tsx`: acrescentar `import { pageTitleClass } from '../typography'` e trocar a linha 30 por:

```tsx
        <h1 className={`mb-4 ${pageTitleClass}`} style={{ color: 'var(--text-color)' }}>{title}</h1>
```

E substituir o último parágrafo do docblock (o que começa em "A margem vertical é cravada porque…") por:

```
 * A margem de baixo é degrau da escala (`mb-4`), não mais o valor que o agente
 * do usuário dava ao `h2`. A de CIMA não existe: o mini-reset de `index.css`
 * (P-46) zera `h1..h6`, e o respiro acima do cabeçalho é responsabilidade do
 * contêiner da página — achado E2 do audit de 2026-08-26.
```

- [ ] **Step 4: Aplicar no `DetailHeader`**

Em `frontend/src/shared/ui/DetailHeader/DetailHeader.tsx`: acrescentar `import { pageTitleClass } from '../typography'` e trocar as linhas 93-99 por:

```tsx
            {!titleHidden && (
              <h1 className={`mb-4 ${pageTitleClass}`} style={{ color: 'var(--text-color)' }}>
                {title}
              </h1>
            )}
```

No comentário do `items-baseline` (linhas 66-73), trocar a menção "carrega `my-[0.83em]` (19,92px medidos)" por "carrega `mb-4`, e nenhuma margem superior desde a E2".

- [ ] **Step 5: Rodar o teste e a suíte de `shared/ui`**

```bash
cd frontend && pnpm test src/shared/ui/
```

Esperado: PASS. Se algum teste de outro componente afirmava `my-[0.83em]`, ele é a segunda cópia da decisão antiga e vai junto.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/shared/ui/PageHeader/ frontend/src/shared/ui/DetailHeader/
git commit -m "refactor(ui): titulo de pagina com voz unica e margem de escala"
```

---

### Task 6: os 5 títulos de auth consomem a constante (A5)

**Files:**
- Modify: `frontend/src/features/identity/components/Login/LoginForm.tsx:45`
- Modify: `frontend/src/features/identity/components/Login/ForgotForm.tsx:38`
- Modify: `frontend/src/features/identity/components/Login/SetPasswordPage.tsx:25,36,51`

Caminhos exatos: confirmar com `grep -rln 'font-display text-2xl font-semibold tracking-tight' src/features/`.

- [ ] **Step 1: Trocar as 5 grafias literais**

Em cada um dos 3 arquivos, acrescentar `pageTitleClass` ao import de `@shared/ui` e trocar
`className="font-display text-2xl font-semibold tracking-tight"` por `className={pageTitleClass}`.

Nos dois `h1` que carregam `ref` e `tabIndex` (`LoginForm`, `ForgotForm`), só a `className` muda.

- [ ] **Step 2: Provar que a cópia literal acabou**

```bash
cd frontend && grep -rn 'font-display text-2xl font-semibold tracking-tight' src/ ; echo "exit=$?"
```

Esperado: só `src/shared/ui/typography.ts` (e o `typography.test.ts`), nenhuma ocorrência em `src/features/`.

- [ ] **Step 3: Rodar a suíte de auth**

```bash
cd frontend && pnpm test src/features/identity/ && pnpm build
```

Esperado: verde.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/features/identity/components/Login/
git commit -m "refactor(identity): titulos de auth consomem a grafia compartilhada"
```

---

### Task 7: `SectionLabel` sobe para `shared/ui` e absorve as 5 grafias (A2)

**Files:**
- Create: `frontend/src/shared/ui/SectionLabel/SectionLabel.tsx`, `index.ts`, `SectionLabel.test.tsx`
- Delete: `frontend/src/app/pages/Dashboard/SectionLabel.tsx`
- Modify: `frontend/src/shared/ui/index.ts`, `frontend/src/shared/ui/FormSection/FormSection.tsx`, `frontend/src/shared/ui/FormSection/FormSection.test.tsx`
- Modify: `frontend/src/app/pages/Dashboard/admin/AdminView.tsx:5`, `frontend/src/app/pages/Dashboard/redator/RedatorView.tsx:3`
- Modify: `RedatorDesignation.tsx:74`, `TurmaConfigCard.tsx:55`, `TurmaDocuments.tsx:31`, `ConcludePanel.tsx:17`

**Interfaces:**
- Produz: `SectionLabel({ children, as = 'h2', rule = true, className })` — `as` escolhe `h2`/`h3`, `rule` liga a hairline, `className` vai no wrapper.

- [ ] **Step 1: Escrever o teste que falha**

Criar `frontend/src/shared/ui/SectionLabel/SectionLabel.test.tsx`:

```tsx
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { SectionLabel } from './SectionLabel'
import { sectionLabelClass } from '../typography'

afterEach(cleanup)

/**
 * "Encabeçar um grupo" saía em 5 grafias — `text-sm font-bold tracking-wide
 * uppercase` no `FormSection`, `text-xs font-semibold tracking-wider uppercase`
 * no Dashboard, `font-medium` puro em três cartões de operation e
 * `text-sm font-medium uppercase tracking-wide` com tinta secundária num quarto
 * (achado A2 do audit de 2026-08-26).
 */
describe('SectionLabel', () => {
  it('é h2 por padrão e carrega a grafia compartilhada', () => {
    render(<SectionLabel>Acción</SectionLabel>)

    const faixa = screen.getByRole('heading', { name: 'Acción', level: 2 })
    expect(faixa.className).toContain(sectionLabelClass)
  })

  /**
   * O nível vem por prop porque os sítios de operation são `h3` dentro de card
   * sob o `h1` da página — forçar `h2` inverteria a árvore de cabeçalhos —, e o
   * Dashboard precisa do `h2` que o degrau dele existe para marcar (UI-05 do
   * review de 2026-08-17). Nível fixo quebraria um dos dois lados (spec D6).
   */
  it('aceita h3 para a faixa dentro de card ou diálogo', () => {
    render(<SectionLabel as="h3">Identidad</SectionLabel>)

    expect(screen.getByRole('heading', { name: 'Identidad', level: 3 })).toBeTruthy()
  })

  it('a hairline sai por padrão e some com `rule={false}`', () => {
    const { container, rerender } = render(<SectionLabel>Acción</SectionLabel>)
    expect(container.querySelector('span[aria-hidden="true"]')).not.toBeNull()

    rerender(<SectionLabel rule={false}>Acción</SectionLabel>)
    expect(container.querySelector('span[aria-hidden="true"]')).toBeNull()
  })

  /** Tinta do CORPO, não a secundária nem a de marca. A P-36 já foi reaberta
   * três vezes pela via do "sem cor fica sem graça": a hierarquia vem do peso e
   * da caixa alta, e o mecanismo é este teste. */
  it('pinta com a tinta de corpo', () => {
    render(<SectionLabel>Acción</SectionLabel>)

    expect(screen.getByRole('heading', { name: 'Acción' }).getAttribute('style'))
      .toContain('var(--text-color)')
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
cd frontend && pnpm test src/shared/ui/SectionLabel/
```

Esperado: FAIL — `Failed to resolve import "./SectionLabel"`.

- [ ] **Step 3: Escrever o componente**

Criar `frontend/src/shared/ui/SectionLabel/SectionLabel.tsx` com o docblock do arquivo antigo preservado e as duas props novas:

```tsx
import type { ReactNode } from 'react'
import { sectionLabelClass } from '../typography'

export interface SectionLabelProps {
  children: ReactNode
  /** Nível do cabeçalho. `h2` é a faixa que divide uma PÁGINA; `h3` é a que
   * encabeça um grupo dentro de card ou diálogo, sob o `h1` da página. Nível
   * fixo quebraria um dos dois lados (spec D6). */
  as?: 'h2' | 'h3'
  /** Hairline à direita do texto. Sai por padrão — é o desenho da faixa do
   * Dashboard, que esta peça generaliza. Faixa que divide linha com botão ou
   * tag desliga (`rule={false}`): ali a linha brigaria com o controle. */
  rule?: boolean
  /** Layout de quem compõe (respiro acima numa seção que não é a primeira). */
  className?: string
}

/**
 * Faixa de seção. O `h2` que faltava no Dashboard: a página emitia `h1` e
 * depois `h3` dos cards, sem degrau intermediário, e as quatro seções não se
 * apresentavam como filhas do título (UI-05 do review de 2026-08-17).
 *
 * Subiu de `app/pages/Dashboard/` para cá porque o MESMO papel saía em 5
 * grafias pelo produto (achado A2 do audit de 2026-08-26) — e uma peça que
 * mora dentro de uma página não é alcançável por feature nenhuma.
 *
 * A margem do cabeçalho já é zerada pelo mini-reset de `index.css` (P-46).
 *
 * Tinta do corpo, não a secundária. A razão ORIGINAL era contraste: a faixa
 * pousa no `--surface-ground`, e ali a secundária de então (`#64748b`) media
 * 4,34:1. Essa razão MORREU no BD-16 (D-28) — hoje a secundária mede 6,92:1 no
 * humo. A tinta de corpo fica assim mesmo, agora por hierarquia e não por
 * régua: o degrau vem do peso e da caixa alta, não de um cinza mais claro que
 * o dos rótulos que ele encabeça.
 */
export function SectionLabel({ children, as = 'h2', rule = true, className }: SectionLabelProps) {
  const Heading = as
  return (
    <div className={`flex items-center gap-3${className ? ` ${className}` : ''}`}>
      <Heading className={sectionLabelClass} style={{ color: 'var(--text-color)' }}>
        {children}
      </Heading>
      {rule && (
        <span aria-hidden="true" className="h-px flex-1" style={{ background: 'var(--surface-border)' }} />
      )}
    </div>
  )
}
```

Criar `frontend/src/shared/ui/SectionLabel/index.ts`:

```ts
export * from './SectionLabel'
```

Acrescentar em `frontend/src/shared/ui/index.ts`, em ordem alfabética após `./SearchableTableFrame`:

```ts
export * from './SectionLabel'
```

- [ ] **Step 4: Apagar o antigo e repontar o Dashboard**

```bash
cd frontend
rm src/app/pages/Dashboard/SectionLabel.tsx
sed -i "s|import { SectionLabel } from '../SectionLabel'|import { SectionLabel } from '@shared/ui'|" \
  src/app/pages/Dashboard/admin/AdminView.tsx src/app/pages/Dashboard/redator/RedatorView.tsx
```

Os 8 call sites do Dashboard não mudam: `as` e `rule` mantêm o default de hoje.

- [ ] **Step 5: `FormSection` passa a compor a faixa**

Substituir o corpo de `frontend/src/shared/ui/FormSection/FormSection.tsx` (mantendo o docblock inteiro, que registra a P-36) por:

```tsx
import { SectionLabel } from '../SectionLabel'

export interface FormSectionProps {
  title: string
  /** Espaço acima, para seções que não são a primeira do diálogo. */
  spaced?: boolean
}
```

e a função por:

```tsx
export function FormSection({ title, spaced }: FormSectionProps) {
  // `h3` porque a seção vive DENTRO de um diálogo, sob o `h1` da página; e
  // `rule={false}` porque as 13 seções de formulário já se separam pelo respiro
  // e pelos divisores do diálogo — hairline aqui é traço que nenhum achado
  // pediu (achado A2, decisão registrada no plano de 2026-08-28).
  return <SectionLabel as="h3" rule={false} className={spaced ? 'pt-2' : undefined}>{title}</SectionLabel>
}
```

Acrescentar ao docblock existente, ao final:

```
 * A grafia deixou de ser própria (`text-sm font-bold tracking-wide`) e passou a
 * ser a compartilhada do `SectionLabel`: o mesmo papel saía em 5 grafias pelo
 * produto (achado A2 do audit de 2026-08-26).
```

- [ ] **Step 6: Atualizar o teste do `FormSection`**

Em `frontend/src/shared/ui/FormSection/FormSection.test.tsx`, o caso "carrega a hierarquia no peso e no tracking" passa a medir a grafia compartilhada:

```tsx
  it('carrega a hierarquia no peso e no tracking, não na cor', () => {
    render(<FormSection title="Identidad" />)

    const titulo = screen.getByRole('heading', { name: 'Identidad', level: 3 })
    expect(titulo.className).toContain(sectionLabelClass)
  })
```

com `import { sectionLabelClass } from '../typography'` no topo. O caso do `spaced` passa a medir o wrapper:

```tsx
  it('`spaced` acrescenta o respiro de cima sem mexer no resto', () => {
    const { container } = render(<FormSection title="Seguridad" spaced />)

    expect(container.firstElementChild?.className).toContain('pt-2')
  })
```

O caso da tinta de corpo fica como está — continua passando pelo `style` do heading.

- [ ] **Step 7: Migrar os 4 `h3` de operation**

Trocar, em cada arquivo, o `<h3>` pela faixa (acrescentando `SectionLabel` ao import de `@shared/ui`):

`src/features/operation/components/Turma/RedatorDesignation.tsx:74`
```tsx
      <SectionLabel as="h3" rule={false}>{t('operation.redator.title')}</SectionLabel>
```

`src/features/operation/components/Turma/TurmaConfigCard.tsx:55`
```tsx
        <SectionLabel as="h3" rule={false}>{t('operation.config.title')}</SectionLabel>
```

`src/features/operation/components/Document/TurmaDocuments.tsx:31`
```tsx
          <SectionLabel as="h3" rule={false}>{t('operation.documents.title')}</SectionLabel>
```

`src/features/operation/components/Document/ConcludePanel.tsx:17`
```tsx
        <SectionLabel as="h3" rule={false}>{t('operation.conclusion.title')}</SectionLabel>
```

Em `RedatorDesignation` a tinta secundária sai junto: a faixa pinta com a tinta de corpo, e era o único dos quatro que usava a secundária num heading.

- [ ] **Step 8: Rodar a suíte tocada**

```bash
cd frontend && pnpm test src/shared/ui/ src/app/pages/Dashboard/ src/features/operation/ && pnpm build
```

Esperado: verde. Testes de operation que buscavam heading por texto continuam achando — o texto não mudou, só o nível e a grafia.

- [ ] **Step 9: Commit**

```bash
git add frontend/src/shared/ui/ frontend/src/app/pages/Dashboard/ frontend/src/features/operation/
git commit -m "refactor(ui): SectionLabel em shared/ui absorve as 5 grafias de faixa"
```

---

### Task 8: `StatValue` — número de estatística com uma grafia só (A3)

**Files:**
- Create: `frontend/src/shared/ui/StatValue/StatValue.tsx`, `index.ts`, `StatValue.test.tsx`
- Modify: `frontend/src/shared/ui/index.ts`
- Modify: `frontend/src/app/pages/Dashboard/KpiRow.tsx:102`
- Modify: `frontend/src/features/commercial/components/Budget/BudgetStatCard.tsx:10`
- Modify: `frontend/src/features/identity/components/Profile/ProfileSummaryCard.tsx:35`

**Interfaces:**
- Produz: `StatValue({ children, size })` com `size: 'page' | 'card'`, renderizando `<span>`.

- [ ] **Step 1: Escrever o teste que falha**

Criar `frontend/src/shared/ui/StatValue/StatValue.test.tsx`:

```tsx
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { StatValue } from './StatValue'

afterEach(cleanup)

/**
 * O número de estatística saía em três tratamentos (achado A3): o KPI já era o
 * alvo (`font-display text-3xl … tabular-nums`), o cartão de presupuesto exibia
 * UF **sem** `tabular-nums` — dígito dançando na coluna a cada re-render — e o
 * cartão de perfil pagava `text-2xl font-semibold` sem família de display.
 */
describe('StatValue', () => {
  it('o número da página é o degrau grande, em display e tabular', () => {
    render(<StatValue size="page">42</StatValue>)

    const numero = screen.getByText('42')
    expect(numero.className).toContain('text-3xl')
    expect(numero.className).toContain('font-display')
    expect(numero.className).toContain('tabular-nums')
  })

  it('o número dentro de cartão desce um degrau e continua tabular', () => {
    render(<StatValue size="card">3</StatValue>)

    const numero = screen.getByText('3')
    expect(numero.className).toContain('text-2xl')
    expect(numero.className).toContain('tabular-nums')
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
cd frontend && pnpm test src/shared/ui/StatValue/
```

Esperado: FAIL — import não resolve.

- [ ] **Step 3: Escrever o componente**

Criar `frontend/src/shared/ui/StatValue/StatValue.tsx`:

```tsx
import type { ReactNode } from 'react'
import { statValueClass } from '../typography'

export interface StatValueProps {
  children: ReactNode
  /** `page`: o número É o assunto da dobra (KPI). `card`: o número dentro de um
   * cartão que já tem outro assunto. */
  size: 'page' | 'card'
}

/**
 * Número de estatística. Componente, e não constante, porque o papel é o
 * ELEMENTO — quem compõe não escolhe a tag nem precisa lembrar do `tabular-nums`
 * (spec D2).
 *
 * O `tabular-nums` é o motivo de existir: sem ele o dígito muda de largura
 * entre renders e o número dança na coluna. Era o caso do UF do
 * `BudgetStatCard` (achado A3 do audit de 2026-08-26).
 *
 * Sem cor: quem compõe sabe sobre que superfície o número pousa — o `AppCard
 * variant="stat"` já tinge texto, fundo e borda pelo `tone`.
 */
export function StatValue({ children, size }: StatValueProps) {
  return <span className={statValueClass(size)}>{children}</span>
}
```

Criar `frontend/src/shared/ui/StatValue/index.ts` com `export * from './StatValue'` e acrescentar `export * from './StatValue'` ao barrel, após `./SectionLabel`.

- [ ] **Step 4: Consumir nos três sítios**

`src/app/pages/Dashboard/KpiRow.tsx:102` (o comentário longo acima da `<p>` fica):
```tsx
              <StatValue size="page">{kpi.value}</StatValue>
```

`src/features/commercial/components/Budget/BudgetStatCard.tsx:10`:
```tsx
      <p><StatValue size="card">{formatUf(value ?? '0')} UF</StatValue></p>
```

`src/features/identity/components/Profile/ProfileSummaryCard.tsx:35`:
```tsx
        <span style={{ color: 'var(--text-color)' }}>
          <StatValue size="card">{redator.cursos_habilitados}</StatValue>
        </span>
```

Acrescentar `StatValue` ao import de `@shared/ui` em cada um.

- [ ] **Step 5: Provar por grep que não sobrou número de stat solto**

```bash
cd frontend && grep -rn 'text-3xl\|text-2xl font-semibold' src/app/pages/Dashboard/ src/features/commercial/components/Budget/BudgetStatCard.tsx src/features/identity/components/Profile/
```

Esperado: nenhuma linha que renderize número de estatística — só ocorrências fora desse papel, se houver.

- [ ] **Step 6: Rodar e commitar**

```bash
cd frontend && pnpm test src/shared/ui/ src/app/pages/Dashboard/ && pnpm build
git add frontend/src/shared/ui/ frontend/src/app/pages/Dashboard/KpiRow.tsx frontend/src/features/commercial/components/Budget/BudgetStatCard.tsx frontend/src/features/identity/components/Profile/ProfileSummaryCard.tsx
git commit -m "feat(ui): StatValue unifica o numero de estatistica"
```

- [ ] **Step 7: Gate da fase 2 + screenshot**

```bash
cd frontend && pnpm lint && pnpm build && pnpm test
```

Invocar `/lotus-ui-review` no **Dashboard**, num **detalhe de presupuesto**, no **perfil** e numa **tela de módulo** (para os dois `h1`), nos **dois temas**. O relatório (`audits/2026-08-2X-item18-fase2.md`) tem de mostrar o antes/depois dos dois cabeçalhos: a margem de baixo desce de 19,92px para 16px **e a de cima some**. Se o cabeçalho colar no que está acima dele, o respiro entra no contêiner da página, nunca de volta no `h1`.

---

# Fase 3 — dado técnico e a assinatura (A4, D4, C4)

### Task 9: `CertificateFolio` — a assinatura do ADR-16

**Files:**
- Create: `frontend/src/shared/ui/CertificateFolio/CertificateFolio.tsx`, `index.ts`, `CertificateFolio.test.tsx`
- Modify: `frontend/src/shared/ui/index.ts`

**Interfaces:**
- Produz: `CertificateFolio({ label, folio, size })` com `size: 'page' | 'dialog'`.

- [ ] **Step 1: Escrever o teste que falha**

Criar `frontend/src/shared/ui/CertificateFolio/CertificateFolio.test.tsx`:

```tsx
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { CertificateFolio } from './CertificateFolio'
import { fieldLabelClass } from '../typography'

afterEach(cleanup)

/**
 * A assinatura que o ADR-16 elegeu — o folio tratado como artefato — nunca foi
 * executada: na página pública de validação ele saía em `text-sm font-medium`,
 * a MESMA grafia do nome do aluno, e sem mono (achados D4 e A4).
 */
describe('CertificateFolio', () => {
  it('o folio é mono e tabular — é dado técnico, não prosa', () => {
    render(<CertificateFolio label="FOLIO" folio="CERT-2026-000123" size="page" />)

    const folio = screen.getByText('CERT-2026-000123')
    expect(folio.className).toContain('font-mono')
    expect(folio.className).toContain('tabular-nums')
  })

  it('na página o folio é o degrau grande, com tracking de artefato', () => {
    render(<CertificateFolio label="FOLIO" folio="CERT-2026-000123" size="page" />)

    const folio = screen.getByText('CERT-2026-000123')
    expect(folio.className).toContain('text-3xl')
    expect(folio.className).toContain('tracking-[0.15em]')
  })

  it('no diálogo desce um degrau em tamanho e em tracking', () => {
    render(<CertificateFolio label="FOLIO" folio="CERT-2026-000123" size="dialog" />)

    const folio = screen.getByText('CERT-2026-000123')
    expect(folio.className).toContain('text-xl')
    expect(folio.className).toContain('tracking-[0.1em]')
  })

  /** A legenda é rótulo de CAMPO, não heading: o bloco não encabeça grupo
   * nenhum, e promovê-lo inventaria hierarquia numa página pública de peso
   * legal (spec D5). */
  it('a legenda usa a grafia de rótulo de campo e não é heading', () => {
    const { container } = render(
      <CertificateFolio label="FOLIO" folio="CERT-2026-000123" size="page" />,
    )

    expect(screen.getByText('FOLIO').className).toContain(fieldLabelClass)
    expect(container.querySelectorAll('h1, h2, h3, h4, h5, h6')).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
cd frontend && pnpm test src/shared/ui/CertificateFolio/
```

Esperado: FAIL — import não resolve.

- [ ] **Step 3: Escrever o componente**

Criar `frontend/src/shared/ui/CertificateFolio/CertificateFolio.tsx`:

```tsx
import { fieldLabelClass } from '../typography'

export interface CertificateFolioProps {
  /** Legenda acima do folio, já traduzida por quem compõe. */
  label: string
  folio: string
  /** `page`: a faixa da validação pública. `dialog`: o mesmo desenho um degrau
   * abaixo, dentro do diálogo de emissão. */
  size: 'page' | 'dialog'
}

/**
 * O folio tratado como ARTEFATO — a assinatura que o ADR-16 elegeu e que nunca
 * havia sido executada (achado D4 do audit de 2026-08-26).
 *
 * Mono e tabular porque é dado técnico: quem valida está com o papel impresso
 * na mão e compara caractere a caractere. O `tracking` aberto é o que separa
 * os grupos do código sem inventar separador que o backend não emite.
 *
 * Os dois degraus são ponto de partida DECLARADO, não medição: a run de
 * `/lotus-ui-review` pode mover um degrau em cada eixo com screenshot, e mais
 * que isso volta para decisão do João — é a tela pública de um documento com
 * peso legal (spec §4.3).
 *
 * A legenda é rótulo de CAMPO, não heading: o bloco não encabeça grupo nenhum
 * (spec D5).
 */
export function CertificateFolio({ label, folio, size }: CertificateFolioProps) {
  const grafia =
    size === 'page'
      ? 'font-mono tabular-nums text-3xl tracking-[0.15em]'
      : 'font-mono tabular-nums text-xl tracking-[0.1em]'

  return (
    <div className="flex flex-col items-center gap-1 text-center">
      <span className={fieldLabelClass} style={{ color: 'var(--text-color-secondary)' }}>
        {label}
      </span>
      <span className={grafia} style={{ color: 'var(--text-color)' }}>{folio}</span>
    </div>
  )
}
```

Criar `index.ts` com `export * from './CertificateFolio'` e acrescentar `export * from './CertificateFolio'` ao barrel, em ordem alfabética após `./ArchiveSwitch`.

- [ ] **Step 4: Rodar e commitar**

```bash
cd frontend && pnpm test src/shared/ui/CertificateFolio/
git add frontend/src/shared/ui/CertificateFolio/ frontend/src/shared/ui/index.ts
git commit -m "feat(ui): CertificateFolio trata o folio como artefato"
```

Esperado: 4 PASS.

---

### Task 10: a validação pública ganha a assinatura, e o diálogo perde o card ad hoc (D4, A4, C4)

**Files:**
- Modify: `frontend/src/features/certification/components/Validation/ValidationPage.tsx:24-63`
- Modify: `frontend/src/features/certification/components/Emission/IssuedDialog.tsx:72-80`
- Test: `frontend/src/features/certification/components/Validation/ValidationPage.test.tsx`

- [ ] **Step 1: Escrever o teste que falha**

Acrescentar em `frontend/src/features/certification/components/Validation/ValidationPage.test.tsx`:

```tsx
/**
 * O folio saía como PRIMEIRO campo de uma `<dl>`, em `text-sm font-medium` — a
 * mesma grafia do nome do aluno (achados D4 e A4). Quem escaneia o QR está com
 * o papel na mão para conferir o folio; ele é a assinatura da página, não mais
 * um campo.
 */
describe('a assinatura da validação', () => {
  it('o folio sai da lista de campos e vira bloco próprio, em mono', () => {
    validation.current = { kind: 'valid', cert: CERT }

    renderPage()

    const folio = screen.getByText('CERT-1')
    expect(folio.className).toContain('font-mono')
    expect(folio.closest('dl')).toBeNull()
  })
})
```

O `validation`, o `CERT` (cujo `codigo` é `'CERT-1'`) e o `renderPage()` já existem no arquivo. Acrescentar `screen` ao import: `import { cleanup, render, screen } from '@testing-library/react'`.

- [ ] **Step 2: Rodar e ver falhar**

```bash
cd frontend && pnpm test src/features/certification/components/Validation/ValidationPage.test.tsx
```

Esperado: FAIL — o folio ainda está dentro da `<dl>` e sem `font-mono`.

- [ ] **Step 3: Reordenar o `ValidCard`**

Em `frontend/src/features/certification/components/Validation/ValidationPage.tsx`, dentro de `ValidCard`, tirar o primeiro `<div>` da `<dl>` (o do `codigo`, linhas 30-35) e pôr a faixa logo abaixo do `StatusHeading`:

```tsx
    <AppCard tone="success">
      <StatusHeading icon="pi-check-circle" tone="success" text={t('certificate.validation.valid')} />
      {/* O folio é a assinatura da página, não mais um campo: quem escaneia o
        * QR está com o papel na mão para conferir ESTE código (achado D4).
        * Fica ABAIXO do status, não acima: o veredito é a resposta que a pessoa
        * veio buscar, e em 390px inverter empurraria o status para perto da
        * dobra (spec D7). */}
      <div className="px-6 pb-2">
        <CertificateFolio label={t('certificate.fieldCodigo')} folio={cert.codigo} size="page" />
      </div>
      <dl className="flex flex-col gap-4 px-6 pb-6">
```

Acrescentar `CertificateFolio` ao import de `@shared/ui`.

- [ ] **Step 4: Os `<dt>` restantes consomem `fieldLabelClass`**

Trocar as três ocorrências de `className="text-xs uppercase tracking-wide"` nos `<dt>` por `className={fieldLabelClass}` (o valor é o mesmo — o ganho é que a próxima cópia herda em vez de recopiar), acrescentando `fieldLabelClass` ao import de `@shared/ui`.

- [ ] **Step 5: `IssuedDialog` troca o card ad hoc (C4)**

Em `frontend/src/features/certification/components/Emission/IssuedDialog.tsx`, substituir o bloco `<div className="rounded-lg border p-6 text-center">` (linhas 72-85) por:

```tsx
          {/* Card montado à mão até 2026-08-28: borda, raio e centralização
            * escritos no sítio, com o folio em `font-mono text-base` — o mesmo
            * papel que a validação pública desenha, em outra grafia (achado C4).
            * Agora é a mesma peça, um degrau abaixo. */}
          <div className="rounded-lg border p-6" style={{ borderColor: 'var(--surface-border)' }}>
            <p className={`text-center ${fieldLabelClass}`} style={{ color: 'var(--text-color-secondary)' }}>
              {t('certificate.issuedHeading')}
            </p>
            <p className="mt-2 text-center text-lg font-semibold">{certificate.snapshot.aluno.name}</p>
            <p className="text-center text-sm" style={{ color: 'var(--text-color-secondary)' }}>
              {certificate.snapshot.curso.name}
            </p>
            <div className="mt-3">
              <CertificateFolio
                label={t('certificate.fieldCodigo')}
                folio={certificate.codigo}
                size="dialog"
              />
            </div>
            <p className="mt-2 text-center text-xs" style={{ color: 'var(--text-color-secondary)' }}>
              {t('certificate.issuedBy', { date: formatDate(new Date(certificate.created_at)) })}
            </p>
          </div>
```

Acrescentar `CertificateFolio, fieldLabelClass` ao import de `@shared/ui`.

- [ ] **Step 6: Rodar a suíte de certification**

```bash
cd frontend && pnpm test src/features/certification/ && pnpm build
```

Esperado: verde.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/features/certification/
git commit -m "feat(certification): folio como assinatura na validacao e no dialogo"
```

---

### Task 11: o RUT do histórico vira mono (A4, segundo sítio)

**Files:**
- Modify: `frontend/src/features/certification/components/Historial/HistorialTable.tsx:90`
- Test: `frontend/src/features/certification/components/Historial/HistorialTable.test.tsx`

- [ ] **Step 1: Escrever o teste que falha**

Acrescentar ao `describe` existente de `HistorialTable.test.tsx`, que já tem os
helpers `certificado()` e `montar()`:

```tsx
  /** RUT é dado técnico e alinha em coluna: sem mono, os pontos e o dígito
   * verificador ficam com largura variável e a coluna serrilha (achado A4). O
   * travessão da ausência legítima NÃO é dado técnico e segue texto puro. */
  it('RUT presente sai em mono; o travessão da ausência, não', () => {
    montar(certificado({ name: 'Ana Torres', rut: '11.111.111-1' }))

    expect(screen.getByText('11.111.111-1').className).toContain('font-mono')

    cleanup()
    montar(certificado({ name: 'Ana Torres', rut: '' }))

    expect(screen.getByText('Ana Torres').closest('td')?.querySelector('.font-mono')).toBeNull()
  })
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
cd frontend && pnpm test src/features/certification/components/Historial/HistorialTable.test.tsx
```

Esperado: FAIL — o texto sai sem `font-mono`.

- [ ] **Step 3: Passar o RUT como nó**

Na linha 90 de `HistorialTable.tsx`, trocar:

```tsx
              description={
                ausente(c.snapshot.aluno.rut)
                  ? '—'
                  : <span className="font-mono">{c.snapshot.aluno.rut}</span>
              }
```

O `IdentityCell` já aceita `ReactNode` em `description`. O travessão da ausência legítima segue texto puro: não é dado técnico, é a marca de que não há dado.

- [ ] **Step 4: Rodar e commitar**

```bash
cd frontend && pnpm test src/features/certification/ && pnpm build
git add frontend/src/features/certification/components/Historial/
git commit -m "fix(certification): RUT do historial em mono"
```

- [ ] **Step 5: Gate da fase 3 + screenshot**

Invocar `/lotus-ui-review` na **validação pública** (`/validar/<uuid>` — caso `valid`), no **diálogo de emissão** e no **histórico**, nos **dois temas**. Relatório em `audits/2026-08-2X-item18-fase3.md`. A run pode mover **um** degrau em cada eixo do `CertificateFolio` (tamanho e tracking); mais que isso volta como decisão do João.

---

# Fase 4 — higiene e a catraca (C1, C2, C3, D1, D3, E1, D-62)

### Task 12: a validação pública sai da paleta crua e do padding próprio (C2, E1)

**Files:**
- Modify: `frontend/src/features/certification/components/Validation/ValidationPage.tsx:13,80`
- Modify: `frontend/eslint.config.js:296-301`

- [ ] **Step 1: Trocar o fundo e o padding**

Linha 80:
```tsx
    <div
      className="flex min-h-screen flex-col items-center gap-8 px-4 py-10"
      style={{ background: 'var(--surface-ground)' }}
    >
```

Era a única tela do produto em paleta Tailwind crua (achado C2) — e `slate-50` nunca foi o humo da marca (`#f1f5f9` é slate-**100**): a tela pública tinha um fundo que nenhuma outra tem, por acidente.

No `StatusHeading` (linha 13), `p-5` vira `p-6` — hero público, pela regra de padding da Task 16 (achado E1). Os `px-5 pb-5` do corpo do card já viraram `px-6 pb-6` na Task 10; conferir que não sobrou `-5` no arquivo:

```bash
cd frontend && grep -n 'p-5\|px-5\|py-5\|pb-5' src/features/certification/components/Validation/ValidationPage.tsx ; echo "exit=$?"
```

Esperado: nenhuma linha, `exit=1`.

- [ ] **Step 2: Fechar a exceção do lint**

Em `frontend/eslint.config.js`, remover de `CATRACA_COR` a linha:

```js
  'src/features/certification/components/Validation/ValidationPage.tsx',
```

A lista é "catraca que só ENCOLHE", e o comentário acima dela diz que a Validação estava ali por ter fundo escuro deliberado. Não tem mais. Acrescentar ao comentário:

```js
// A Validação SAIU em 2026-08-28: o `bg-slate-50 dark:bg-slate-950` virou
// `--surface-ground` (achado C2 do audit de 2026-08-26) e o arquivo não tem
// mais cor crua nenhuma.
```

- [ ] **Step 3: Provar que a catraca agora alcança o arquivo**

```bash
cd frontend && pnpm lint
```

Esperado: 0 erro. Sonda: reintroduzir `bg-slate-50` na linha 80, rodar `pnpm lint` e ver reprovar nomeando `ValidationPage.tsx`; depois desfazer.

- [ ] **Step 4: Rodar e commitar**

```bash
cd frontend && pnpm test src/features/certification/ && pnpm build
git add frontend/src/features/certification/components/Validation/ frontend/eslint.config.js
git commit -m "fix(certification): validacao publica no humo do tema, fora da excecao de cor"
```

---

### Task 13: `AppTabView` funde o `pt` e os banners alinham o raio (C3, C1)

**Files:**
- Modify: `frontend/src/shared/ui/AppTabView/AppTabView.tsx:38-47`
- Modify: `frontend/src/shared/ui/FormField/FormField.tsx:144,181`
- Test: `frontend/src/shared/ui/AppTabView/AppTabView.test.tsx`

- [ ] **Step 1: Escrever o teste que falha**

Acrescentar em `frontend/src/shared/ui/AppTabView/AppTabView.test.tsx`:

```tsx
/**
 * `...(pt ?? appTabViewPt)` apagava o default de quem passasse QUALQUER `pt`
 * (achado C3): um chamador que só quisesse ajustar o `nav` perdia o `p-0` do
 * `panelContainer` em silêncio. É a mesma família do Q-5 do review do item 8 —
 * e o remédio é o `mergePt`, que `AppDialog`, `AppDatePicker`, `AppDataTable`,
 * `AppFileUpload` e `AppPassword` já usam.
 */
it('o `pt` do chamador funde com o default, não o substitui', () => {
  const { container } = render(
    <AppTabView pt={{ nav: { className: 'marca-do-chamador' } }}>
      <AppTabPanel header="Uno"><p>uno</p></AppTabPanel>
    </AppTabView>,
  )

  expect(container.querySelector('.marca-do-chamador')).not.toBeNull()
  expect(container.querySelector('.p-tabview-panels')?.className).toContain('p-0')
})
```

Com `AppTabPanel` no import.

- [ ] **Step 2: Rodar e ver falhar**

```bash
cd frontend && pnpm test src/shared/ui/AppTabView/AppTabView.test.tsx
```

Esperado: FAIL na segunda asserção — o `p-0` do `panelContainer` sumiu.

- [ ] **Step 3: Trocar por `mergePt`**

Em `frontend/src/shared/ui/AppTabView/AppTabView.tsx`, acrescentar `import { mergePt } from '../mergePt'` e trocar o `pt` por:

```tsx
    <TabView
      pt={mergePt(mergePt(appTabViewPt, pt), {
        prevButton: { 'aria-label': t('common.tabsScrollPrev') },
        nextButton: { 'aria-label': t('common.tabsScrollNext') },
      })}
      {...props}
    />
```

O aninhamento preserva a disciplina que o comentário do arquivo já declara: o default do wrapper é PISO, o `pt` do chamador funde por cima dele, e o nome acessível dos dois botões de rolagem vence os dois — acessibilidade não é o que um call site desliga sem querer. Ajustar a última frase do comentário, que dizia "que aqui SUBSTITUI o default inteiro, não faz merge".

- [ ] **Step 4: Alinhar o raio dos banners (C1)**

Em `frontend/src/shared/ui/FormField/FormField.tsx`, nas linhas 144 e 181, trocar `rounded` por `rounded-md`. O `rounded` solto era o único raio do produto sem degrau declarado — a escala vai escrita para a rule da Task 16.

- [ ] **Step 5: Rodar e commitar**

```bash
cd frontend && pnpm test src/shared/ui/ && pnpm build
git add frontend/src/shared/ui/AppTabView/ frontend/src/shared/ui/FormField/
git commit -m "fix(ui): AppTabView funde o pt do chamador e banners alinham o raio"
```

---

### Task 14: o shell perde o empurrão manual e o Login pinta pelo papel (D1, D3)

**Files:**
- Modify: `frontend/src/app/layouts/Sidebar/Sidebar.tsx:47`
- Modify: `frontend/src/features/identity/components/Login/LoginPage.tsx:33,39`

- [ ] **Step 1: Tirar o `ml-15` da marca da sidebar**

Linha 47:
```tsx
          <AppLogo variant="on-dark" className="h-30 w-auto" />
```

O `ml-15` eram 60px de margem manual empurrando o wordmark dentro de uma linha que já tem `justify-between` (achado D1). O `h-30` **fica**: é a altura do wordmark, e sem ela o `<img>` renderiza nos 466px naturais do asset. A premissa de recortar o asset foi medida e não se aplica — ver "Correções ao desenho" no topo deste plano.

- [ ] **Step 2: Pintar tagline e setor pelo papel (D3)**

Em `frontend/src/features/identity/components/Login/LoginPage.tsx`, linhas 33 e 39, trocar as duas tintas:

```tsx
        <p className="my-0 text-center text-xl" style={{ color: 'var(--shell-ink)' }}>
          {t("brand.tagline")}
        </p>

        <p
          className="my-0 text-center font-mono text-xs uppercase tracking-[0.14em]"
          style={{ color: 'var(--shell-ink-muted)' }}
        >
          {t("brand.sector")}
        </p>
```

Tinta de marca estava no papel de texto de APOIO (achado D3); `--shell-ink*` é o token do shell sobre superfície escura fixa, que é exatamente o que este painel é. O wordmark segue com tinta de marca — ele **é** a marca. O `--primary-300` do badge de versão fica: é dado técnico do shell, não texto de apoio da marca.

Contraste medido na escrita do plano, contra as duas pontas do `--brand-gradient`: `--shell-ink` 8,71:1 e 9,86:1; `--shell-ink-muted` 4,93:1 e 5,57:1. Os dois passam o 4,5:1 na ponta pior.

- [ ] **Step 3: Rodar e commitar**

```bash
cd frontend && pnpm lint && pnpm test && pnpm build
git add frontend/src/app/layouts/Sidebar/ frontend/src/features/identity/components/Login/LoginPage.tsx
git commit -m "fix(shell): sidebar sem empurrao manual e Login pinta pelo papel"
```

---

### Task 15: a catraca da `D-62`

**Files:**
- Modify: `frontend/eslint.config.js`
- Modify: `frontend/src/features/commercial/components/Budget/BudgetDocumentsCard.tsx:36`
- Modify: `frontend/src/shared/config/locales/es-CL.json`, `en.json`, `pt-BR.json`

- [ ] **Step 1: Escrever a regra**

Em `frontend/eslint.config.js`, junto das outras constantes de seletor (depois de `DISABLED_READONLY_ESTATICO`):

```js
// `AppDropdown` sem nome acessível. O mesmo defeito foi corrigido À MÃO em
// quatro sítios, por três runs independentes (`TurmaStatusFilter`,
// `BudgetStatusFilter`, `EmissionPanel`, `HistorialTable`), e a quinta
// ocorrência nasceu verde: o filtro de tipo de documento do
// `BudgetDocumentsCard`. Quatro correções e zero catraca é a definição de
// dívida (`D-62`).
//
// Mede a FORMA, não a grafia: `AppDropdown` que não descende de um `FormField`
// — que entrega o `inputId` por contexto, e é a grafia CERTA dos 11 sítios de
// formulário — e que não declara `inputId`, `aria-label` nem `aria-labelledby`
// por conta própria. Grep pela grafia de hoje casaria só os filtros de hoje;
// foi a lição do seletor deste arquivo que nasceu casando só `arguments.0`.
//
// `NestedField` NÃO conta como pai válido, de propósito: ele não monta
// `FieldContext`, então um dropdown dentro dele fica sem nome do mesmo jeito.
// Hoje não há nenhum; quando houver, reprova.
const DROPDOWN_SEM_NOME = {
  selector:
    'JSXElement[openingElement.name.name="AppDropdown"]' +
    ':not(JSXElement[openingElement.name.name="FormField"] JSXElement[openingElement.name.name="AppDropdown"])' +
    ':not(:has(JSXOpeningElement > JSXAttribute[name.name=/^(inputId|aria-label|aria-labelledby)$/]))',
  message:
    'AppDropdown sem nome acessível: dentro de FormField o id vem por contexto; fora dele passe inputId (ligado a uma label) ou aria-label. O `id` do Dropdown cai no nó raiz e não alcança o input focável (D-62).',
}
```

Acrescentar `DROPDOWN_SEM_NOME` aos **três** arrays `no-restricted-syntax` que casam `src/features/**`: os dois blocos de `src/features/*/components/**` (o de `ignores: CATRACA_COR` e o de `files: CATRACA_COR`) e o de `src/features/**` com `ignores`. Bloco próprio colidiria com os existentes pelo bug de merge raso que o comentário do arquivo já documenta (Q-2 de 2026-08-04).

- [ ] **Step 2: Rodar e ver a regra pegar a quinta ocorrência**

```bash
cd frontend && pnpm lint
```

Esperado: 1 erro, em `src/features/commercial/components/Budget/BudgetDocumentsCard.tsx:36` — e em nenhum outro. Os 11 dropdowns dentro de `FormField` e os 4 com `inputId` são grafia certa e passam.

- [ ] **Step 3: Corrigir a quinta ocorrência**

Em `frontend/src/features/commercial/components/Budget/BudgetDocumentsCard.tsx`, acrescentar o nome ao dropdown:

```tsx
              <AppDropdown
                aria-label={t('budget.fileTypeLabel')}
                value={fileType}
```

Ele vive no slot `actions` do `AppCardHeader`, sem label visível na tela — `aria-label` é a porta certa aqui; `inputId` exigiria uma label que o desenho não tem.

- [ ] **Step 4: Acrescentar a chave nas três locales**

Na sub-árvore `budget`, logo antes de `"fileTypeInvoice"`:

`es-CL.json`: `"fileTypeLabel": "Tipo de documento",`
`en.json`: `"fileTypeLabel": "Document type",`
`pt-BR.json`: `"fileTypeLabel": "Tipo de documento",`

- [ ] **Step 5: Rodar o lint e a paridade de locale**

```bash
cd frontend && pnpm lint && pnpm test src/shared/config/locales/
```

Esperado: lint 0 erro; paridade e cópia verdes.

- [ ] **Step 6: Sonda negativa — a prova de que o mecanismo reprova**

```bash
cd frontend
cp src/features/operation/components/Turma/TurmaStatusFilter.tsx /tmp/TurmaStatusFilter.bak
sed -i '/^          inputId={inputId}$/d' src/features/operation/components/Turma/TurmaStatusFilter.tsx
pnpm lint
```

Esperado: reprova **nomeando** `src/features/operation/components/Turma/TurmaStatusFilter.tsx`. Devolver:

```bash
cp /tmp/TurmaStatusFilter.bak src/features/operation/components/Turma/TurmaStatusFilter.tsx
rm /tmp/TurmaStatusFilter.bak
pnpm lint && git status --porcelain
```

Esperado: lint 0 erro; `git status` sem o arquivo da sonda.

- [ ] **Step 7: Commit**

```bash
git add frontend/eslint.config.js frontend/src/features/commercial/components/Budget/BudgetDocumentsCard.tsx frontend/src/shared/config/locales/
git commit -m "feat(lint): catraca de nome acessivel no AppDropdown (D-62)"
```

---

### Task 16: a regra escrita

**Files:**
- Create: `.claude/rules/frontend-estilizacao.md`

- [ ] **Step 1: Escrever a rule**

Criar `.claude/rules/frontend-estilizacao.md` com este conteúdo:

````markdown
---
paths:
  - "frontend/src/**"
---

# Frontend — estilização de componentes (ADR-16)

Tailwind é **layout**. Cor, superfície e geometria de controle vêm do tema PrimeReact via
`shared/ui`. Esta rule diz qual grafia sai para cada PAPEL — e nomeia o mecanismo que a
sustenta, porque regra sem catraca é recomendação solta.

## Botão — o variant nomeia papel, não aparência

| Variant | Papel | Geometria |
|---|---|---|
| `primary` | ação primária: abre módulo, salva diálogo, confirma emissão | herda o `.p-button` do tema |
| `compact` | marca apertada, onde a do tema não cabe (seletor de idioma, ação dentro de linha) | `px-3 py-2.5 text-sm` |
| `iconToggle` | só-ícone: toggle de tema, colapso da sidebar | herda o `.p-button` do tema |
| `noSurface` | gatilho que embrulha um bloco (avatar + identidade no header) | fundo, padding e hover zerados |

- **Ação destrutiva não veste marca:** passa `severity`, e o preenchido de severidade é o sinal.
- **Navegação de volta é terciária:** botão `text`, nunca variant de marca. Ela ANTECEDE a ação
  primária da página; vestir a mesma marca diz que sair e agir pesam igual.
- `primary` **não declara padding nem tamanho de fonte**. Declarar encolhe os 17 call sites de
  uma vez. Mecanismo: `src/shared/ui/AppButton/AppButton.test.tsx`.

## Tipografia — a grafia mora em `shared/ui`, nunca no sítio

| Papel | Peça | Onde |
|---|---|---|
| Título de página (`h1`) | `pageTitleClass` | `PageHeader`, `DetailHeader`, as 5 telas de auth |
| Faixa que encabeça grupo | `<SectionLabel>` | `h2` na página, `h3` em card/diálogo |
| Rótulo de campo (`dt`) | `fieldLabelClass` | listas de definição |
| Número de estatística | `<StatValue>` | KPI (`size="page"`), cartão (`size="card"`) |
| Folio de certificado | `<CertificateFolio>` | validação pública, diálogo de emissão |

- O `h1` tem **dono único** por tela: `PageHeader` no módulo, `DetailHeader` no detalhe. Tela sem
  nenhum dos dois titula o próprio estado, mesmo que escondido (`sr-only`).
- **Rótulo de seção e rótulo de campo são peças diferentes.** Um `<dt>` não encabeça grupo; promovê-lo
  a heading inventa hierarquia.
- Escrever a grafia literal no sítio é o defeito, não o atalho: era como o título de auth virou 5
  cópias. Mecanismo: `src/shared/ui/typography.test.ts`.

## Dado técnico é mono

Folio, RUT, código, versão e contagem que alinha em coluna saem em `font-mono` **com**
`tabular-nums`. Sem o tabular o dígito muda de largura entre renders e o número dança na coluna.

Prosa não é dado técnico: o travessão que marca ausência legítima fica em texto normal.

## Escala de raio

| Papel | Raio |
|---|---|
| Superfície — card, diálogo, faixa de destaque | `rounded-lg` |
| Controle e item de navegação | `rounded-md` |
| Pill — tag, badge, contador | `rounded-full` |

`rounded` solto não existe: é raio sem degrau declarado, e foi assim que os banners de erro
ficaram fora da escala.

## Padding por papel

| Papel | Padding |
|---|---|
| Faixa de card (cabeçalho, rodapé) | `px-4 py-3` |
| Corpo de card | `p-4` |
| Página autenticada | `p-4 sm:p-6` |
| Hero público (validação por QR) | `p-6` |

## Cor

Cor vem de variável do tema, escrita por `style={{ color: 'var(--…)' }}`. Utility de paleta
Tailwind (`bg-slate-50`, `text-red-600`) é o defeito, nos dois temas.

Superfície escura FIXA do shell — sidebar navy, painel de marca do login — lê `--shell-ink` e
`--shell-ink-muted`, não a rampa de marca: tinta de marca ali está no papel de texto de apoio.
O wordmark segue com a marca — ele **é** a marca.

Mecanismo: `COR_HARDCODED` e `COR_LITERAL_EM_STYLE` em `frontend/eslint.config.js`, que medem
`className` e `style`. A lista de exceções `CATRACA_COR` só **encolhe** — nunca reintroduza
arquivo nela para calar o lint.

## Nome acessível de controle sem label visível

`AppDropdown` dentro de `FormField` recebe o `inputId` por contexto — é a grafia certa. Fora dele
(filtro de tabela, controle em slot de ação), passa `inputId` ligado a uma label ou `aria-label`.
O `id` do Dropdown cai no nó raiz e não alcança o input focável.

Mecanismo: `DROPDOWN_SEM_NOME` em `frontend/eslint.config.js`.
````

- [ ] **Step 2: Conferir que o teste de referências de doc continua verde**

```bash
cd frontend && pnpm test tests/repo-docs-refs.test.ts
```

Esperado: PASS — a rule nova não pode citar path que não existe.

- [ ] **Step 3: Commit**

```bash
git add .claude/rules/frontend-estilizacao.md
git commit -m "docs(rules): regra de estilizacao de componentes"
```

---

### Task 17: gate do bloco

- [ ] **Step 1: Suíte, lint e build**

```bash
cd frontend && pnpm lint && pnpm build && pnpm test
```

Esperado: lint 0 erro, build verde, suíte inteira verde.

- [ ] **Step 2: Guardas de grep do DoD**

```bash
cd /home/jvbat/projetos/fix-frontend/frontend
grep -rn 'brandIcon\|brandLabel' src/ ; echo "variant velho exit=$?"
grep -rn 'my-\[0.83em\]' src/ ; echo "margem do UA exit=$?"
grep -rn 'font-display text-2xl font-semibold tracking-tight' src/features/ ; echo "titulo copiado exit=$?"
```

Esperado: os três com `exit=1` (nenhuma linha).

- [ ] **Step 3: Provar `pint`/`typescript:transform` como N/A por escopo**

```bash
cd /home/jvbat/projetos/fix-frontend
git diff --stat main...HEAD -- backend/ frontend/src/shared/types/generated.ts
```

Esperado: saída **vazia**. Saída não-vazia significa que o bloco saiu do escopo e os dois comandos passam a ser obrigatórios.

- [ ] **Step 4: Screenshot da fase 4**

Invocar `/lotus-ui-review` no **Login**, na **sidebar expandida e colapsada** e num **formulário com banner de erro**, nos **dois temas**. Relatório em `audits/2026-08-2X-item18-fase4.md`.

- [ ] **Step 5: Suíte do backend inalterada**

```bash
docker compose exec -T app php artisan test
```

Esperado: verde e sem diferença — o bloco não tocou `backend/`. Se o container da árvore for anterior ao `memory-cli.ini`, isto fatala por memória (P-57); registrar e seguir, não é regressão deste bloco.

---

## Handoff de execução

```yaml
executor: claude
```

**Por que `claude` e não `codex`:** o bloco decide grafia visual em toda task — que degrau de tipografia, que padding, que raio, quando a run de UI-review autoriza mover um degrau e quando a decisão volta para o João. As Tasks 9, 10 e 14 tocam a tela pública de um documento com peso legal e o shell da marca; a Task 15 escreve catraca de lint cuja régua tem de discriminar grafia certa de errada (a armadilha da P-36, guarda que reprova código correto). Nenhuma dessas verificações é executável sem julgamento fora do plano. As tasks mecânicas (1 Step 4, 6, 11) são pequenas demais para pagar o roteamento.
