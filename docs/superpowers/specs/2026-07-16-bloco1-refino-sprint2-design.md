# Bloco 1 · Refino de código Sprint 2 — Design

> Data: 2026-07-16 · Escopo canônico: Notion 6.4.1, 6.4.2, 6.4.3.
> Fluxo completo (brainstorming → writing-plans → subagent-driven) — este bloco toca código.

## Objetivo

Eliminar duplicação criada na Sprint 2 e alinhar o backend ao padrão de Actions, sem mudar
comportamento observável. Três eixos independentes:

1. **6.4.1** — Kit de formulário em `shared/ui` (frontend), adotado em todos os consumidores.
2. **6.4.2** — `DeleteBudgetAction` / `DeleteQuoteAction` (backend): regra sai do controller.
3. **6.4.3** — Documentar a convenção `from()` vs `fromModel()` nos DTOs (INSTRUÇÕES-DO-PROJETO.md).

**Pré-requisito declarado:** o kit (em especial `NestedField`) é consumido pelos blocos 2–4
(`course_modules` é array aninhado). Extrair agora evita a 6ª duplicação.

---

## 6.4.1 — Kit de formulário em `shared/ui`

### Diagnóstico (duplicação atual)

- `Field` (label + control + erro) — **redefinido idêntico** em 5 diálogos: `BudgetDialog`,
  `ClientDialog`, `QuoteWizard`, `CourseDialog`, `RedatorDialog`.
- `UnmappedErrors` (resumo de 422 sem input na tela) — em 4: `BudgetDialog`, `ClientDialog`,
  `QuoteWizard`, `CourseDialog`. Variante: `ClientDialog`/`QuoteWizard` excluem `contacts.*`.
- `NestedField` (erro sem label, linha nested) — 1: `ClientDialog`.
- Banner de `generalError` — 6 lugares: os 5 diálogos (`variant` box) + `LoginForm`
  (`variant` inline, `role="alert"`, sem box).

### Componentes (pasta-por-componente + barrel `shared/ui/index.ts`)

Puro-apresentacionais — recebem strings **já traduzidas** (kit i18n-agnóstico, como os demais
wrappers). API mantida 1:1 com o que os diálogos já usam (`error?: string` = primeira mensagem),
para migração mecânica.

| Componente | Assinatura | Comportamento |
|---|---|---|
| `FormField` | `{ label: string; error?: string; children: ReactNode }` | `<label>` + span do label + `children` + erro em vermelho. Substitui `Field`. |
| `NestedField` | `{ error?: string; children: ReactNode }` | `<div>` + `children` + erro. Sem label (linha nested: contatos/endereços/módulos). |
| `FormErrorSummary` | `{ errors: Record<string,string[]>; mapped: string[]; excludePrefixes?: string[] }` | `<ul>` dos 422 cujo campo não tem input na tela. `excludePrefixes` default `[]`; `ClientDialog`/`QuoteWizard` passam `['contacts.']`. Substitui `UnmappedErrors`. |
| `FormErrorBanner` | `{ message: string; variant?: 'box' \| 'inline' }` | Banner de erro geral, sempre com `role="alert"`. `box` (default) = caixa vermelha (diálogos); `inline` = texto vermelho sem caixa (`LoginForm`). Substitui o markup inline de `generalError`. |

**Único desvio deliberado de comportamento:** `role="alert"` passa a valer para **todos** os
banners (hoje só o `LoginForm` tem). É consolidação na melhor variante existente — a11y de
leitor de tela —, não "melhoria" gratuita. Registrar em `.superpowers/sdd/progress.md`.

### Adoção (remove todas as cópias locais)

- `BudgetDialog` — `FormField`, `FormErrorSummary`, `FormErrorBanner`.
- `ClientDialog` — `FormField`, `NestedField`, `FormErrorSummary` (`excludePrefixes=['contacts.']`),
  `FormErrorBanner`. O comentário de negócio do `UnmappedErrors` (por que `addresses.*` NÃO é
  excluído) migra junto — preservar a intenção.
- `QuoteWizard` — `FormField`, `FormErrorSummary`, `FormErrorBanner`.
- `CourseDialog` — `FormField`, `FormErrorSummary`, `FormErrorBanner`.
- `RedatorDialog` — `FormField`, `FormErrorBanner` (não tem summary).
- `LoginForm` — `FormErrorBanner variant="inline"`.

### Fora de escopo (6.4.1)

Kit de **layout** (grids 2-col, seções), promoção de outros helpers, ou qualquer mudança visual
além do `role="alert"`.

---

## 6.4.2 — `DeleteBudgetAction` / `DeleteQuoteAction`

### Diagnóstico

A invariante "cotação aprovada não pode ser excluída" está **inline** em
`BudgetController::destroy` e `QuoteController::destroy`. Regra de negócio de escrita pertence a
Action (ADR-02), como `CreateBudgetAction`/`UpdateQuoteAction` já são.

### Desenho

- **`DeleteBudgetAction::execute(Budget $budget): void`** — em `DB::transaction`:
  1. Guarda: se existe quote com `status = Approved` → `ValidationException::withMessages(['status' => '...'])`.
  2. `$budget->delete()` — dispara o `deleting` hook do model (cascade soft-delete das quotes,
     instância a instância, auditado — ADR-08). Mensagem PT movida **verbatim** do controller.
- **`DeleteQuoteAction::execute(Quote $quote): void`** — em `DB::transaction`:
  1. Guarda: se `status === Approved` → `ValidationException` (422). Mensagem verbatim.
  2. `$quote->delete()`.
- **Controllers:** `destroy` passa a injetar a Action, chamar `execute`, retornar `noContent()`.
  Nenhuma regra remanescente no controller.
- **`DB::transaction`** justificado: Budget cascateia N deletes (atomicidade); Quote é 1 delete,
  mas mantém o padrão uniforme das Actions.

### Escopo travado

`ClientController::destroy` **não** muda (fora do bloco). Sem `DeleteClientAction`.

### Testes

`BudgetCrudTest`, `QuoteCrudTest` (guarda 422) e `BudgetModelTest` (cascade) já provam o
comportamento end-to-end em sqlite `:memory:` (ADR-02). Como a extração é **refactor puro**, ficam
verdes sem edição. Não adicionar teste redundante de Action (a Feature test já cobre).

---

## 6.4.3 — Documentar `from()` vs `fromModel()` (INSTRUÇÕES-DO-PROJETO.md)

Doc-only. Cristalizar como **convenção nomeada** o que hoje é implícito ("contrato único" +
"proibido `from([...])` inline"), na Parte II (padrão de entidade / contratos de tipo):

- **`from()` (spatie) = ENTRADA.** Request→DTO; validação via `rules()`; injeção automática no
  controller (`store(XData $data)`). Campos de saída ficam `Optional` (ausentes na entrada) — é o
  que permite **uma** classe servir os dois sentidos.
- **`fromModel(X $m): self` = SAÍDA.** Model→DTO; **único** lugar que projeta o model: achata
  relações (campos do `user` no topo), coleta nested (`XData::collect(...)`), deriva campos
  (ex.: `BudgetSummaryService`). Controller **sempre** retorna `XData::fromModel($m)`.
- **Proibido `XData::from([...])`** para montar resposta — vaza a forma do model pro controller e
  escapa da projeção única.

Referência viva citada: `BudgetData` (`from()` valida entrada via `rules()`; `fromModel()` deriva
`status`/totais e coleta `quotes`).

---

## Definition of Done

- **6.4.1** — kit em `shared/ui` exportado pelo barrel; os 6 consumidores importam do kit, zero
  redefinição local; `pnpm build` (type-check) e `pnpm lint` verdes; diálogos exercidos contra a
  API real (render view/edit/create, submit, erro de campo, erro não-mapeado visível).
- **6.4.2** — Actions criadas; controllers finos; guarda 422 provada contra a API real (tentar
  excluir orçamento/cotação com quote aprovada → 422; excluir sem aprovada → 204 + cascade);
  suíte backend verde.
- **6.4.3** — convenção escrita em INSTRUÇÕES-DO-PROJETO.md, coerente com o código real.

DoD = comportamento provado end-to-end contra a API real, não build/lint/test verde (CLAUDE.md §4).
