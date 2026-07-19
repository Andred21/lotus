# Design — Bloco de refino do frontend Comercial (H.1.3)

> **Status:** aprovado · **Data:** 2026-07-19 · **Tipo:** refino de feature entregue (sem backend/schema/DTO)
> **Origem:** consolida os achados de duas revisões desta sessão sobre a feature `commercial`
> (`/revisar-frontend` = eixo código; `/revisar-ui` = eixo visual). Task Notion: **H.1.3 · Frontend · Tela/UI · Sprint 2 Comercial**.
> **Feature base:** Sprint 2 · Comercial frontend (entregue 2026-07-13, plano em `plans/archive/2026-07-13-sprint2-commercial-frontend.md`).

## 1. Objetivo

Fechar os achados **C** (viola rule) e **B** (funciona mas melhora) das duas revisões, sem mudar
uma linha de comportamento observável. A feature Comercial funciona; este bloco alinha o **código**
às rules `frontend-fsliced.md` (componente declarativo, manipulação de array nested no hook, grupo de
campos coeso vira subcomponente, kit de form em vez de erro na mão) e a **interface** às telas irmãs
(consistência de wrapper, acessibilidade, ordem de ação).

**Não-objetivo:** nenhuma mudança de regra de negócio, schema, DTO ou endpoint. Nenhuma refatoração
de vizinho não pedido. Sync de docs (Notion H.1.3) é passo separado, **fora** deste bloco.

## 2. Princípios inegociáveis

- **Comportamento idêntico, provado.** Refatoração que muda o que a tela renderiza/faz é bug, não
  refatoração (peso legal). Sem test runner no front → prova = `pnpm build` + `pnpm lint` verdes **E**
  caminhada visual/comportamental de cada tela tocada. Build verde não é aceite (lei §8).
- **Ordem: estrutural ANTES de visual.** Não se pole pixel de componente-Deus (lei do review). Os
  achados de código (Seção 4) vêm antes dos visuais (Seção 5).
- **Cor segue o kit.** Tailwind = layout + cor do nosso elemento com par `dark:` — é o padrão de fato
  do codebase (`shared/ui` inteiro faz assim; ADR-16 reserva CSS var do Lara para o INTERNO de
  componente Prime). Nenhuma cor nova fura o tema.
- **Fronteira de dependência (§6).** Feature nunca importa PrimeReact direto nem outra feature.
  Wrapper novo (AppDatePicker) mora em `shared/ui`.

## 3. Escopo — mapa dos achados

| # | Eixo | Achado | Arquivo(s) | Ação |
|---|------|--------|-----------|------|
| C1 | código | manipulação de array nested solta no JSX (`patchContact`/`setPrimaryContact`/`setAddr`) | `ClientDialog.tsx` | mover para `useClientForm` |
| C2 | código | endereço (6 campos) + contatos inline | `ClientDialog.tsx` | extrair `AddressFields` + `ContactFields` |
| C-Deus | código | componente-Deus 237 linhas, não-declarativo | `BudgetDetailPage.tsx` | extrair `useBudgetDetail` (completo) |
| B1 | código | caixa de erro na mão em vez do kit | `BudgetDetailPage.tsx`, `QuotesList.tsx` | trocar por `FormErrorBanner` |
| B2 | código | `<input type="radio">` cru | `QuoteWizard.tsx` | trocar por `AppRadioButton` |
| UI-B2 | visual | `<input type="date">` nativo destoa do input Prime | `QuoteWizard.tsx` | **criar `AppDatePicker`** e usar |
| UI-B1 | visual | wizard 2 passos sem indicador | `QuoteWizard.tsx` | stepper no header |
| UI-B3 | visual | toolbar das 2 abas inconsistente | `ClientsTable.tsx` | unificar wrapper de busca |
| UI-B4 | visual | botões só-ícone sem nome acessível | `QuotesList.tsx`, `FileList.tsx`, tabelas | `aria-label` (i18n) |
| UI-B5 | visual | destrutivo encravado no header | `BudgetDetailPage.tsx` | reordenar/agrupar |

Fora de escopo (Caso A das revisões = aderente): CommercialPage, BudgetDialog, BudgetsTable,
FileList (salvo aria-label), todos os hooks/api/lib da feature. A linha em branco solta de
`ClientsTable.tsx:18` é nit trivial — cai junto no toque de UI-B3.

## 4. Estrutural (code-review)

### 4.A · ClientDialog (C1 + C2)

**Decisão:** casadas — os helpers vão pro hook PRIMEIRO, aí os subcomponentes os consomem.

**`useClientForm` passa a expor** (molde: `useCourseForm` que já expõe `add/remove/patch/move`):
- `setAddr(patch: Partial<ClientAddressData>)` — preserva os endereços restantes (lógica atual das
  linhas 34-39 do ClientDialog, movida sem alteração).
- `patchContact(i, patch)`, `setPrimaryContact(i)`, `addContact()`.

Some do componente: as `function patchContact`/`setPrimaryContact` livres e o import
`Dispatch, SetStateAction`. `setForm` deixa de ser consumido pelo componente.

**`AddressFields` + `ContactFields`** — novos em `features/commercial/components/Client/`:
- `AddressFields`: recebe `value: ClientAddressData`, `onChange(patch)`, `readOnly`, `errors?`.
  Renderiza os 6 campos (região, comuna, cidade, rua, complemento, número) — markup idêntico ao
  atual (linhas 86-106).
- `ContactFields`: recebe `contacts`, `readOnly`, `errors?` e callbacks (`onPatch`, `onSetPrimary`,
  `onAdd`). Renderiza a lista `key={i}` (rule: replace-total usa índice), radio + 4 `NestedField` +
  botão add — markup idêntico ao atual (linhas 108-141).

**Invariantes a preservar (idêntico):** mapeamento 422 por chave (`contacts.i.name`…), principal-único
(`is_primary` só num contato), `EMPTY_ADDRESS` como fallback, `name` derivado de `legal_name` no
submit, `FormErrorSummary` com `excludePrefixes={['contacts.']}`.

### 4.B · BudgetDetailPage (C-Deus, extração completa)

**Decisão:** extração completa (não parcial). O componente vira JSX puro.

**Novo `useBudgetDetail(budgetId: number)`** em `features/commercial/hooks/`. Absorve tudo que hoje
está inline (linhas 25-60):
- Queries: `budgetsApi.useOne(budgetId)`, `clientsApi.useList()`; deriva `budget`, `client`, `loading`.
- Mutations: `useApproveQuote`, `useRejectQuote`, `useRemoveQuote`, `budgetsApi.useRemove`,
  `useUploadBudgetFile`, `useRemoveBudgetFile`.
- Erros: 3× `useMutationErrors` → `confirmError`, `removeBudgetError`, `fileError`.
- Estado de dialog: `editing`, `wizard`, `confirm`, `confirmDeleteBudget`, `fileType`.
- Handlers: `handleUpload` (com `e.options.clear()` no sucesso), abrir/fechar de cada dialog,
  `onConfirm` (seleciona a mutation por `confirm.action`), reset de erro-fantasma no cancelar
  (linhas 180-188), `navigate('/comercial')` no delete e `navigate` no create.
- `permissions.can('commercial.quote.approve')` → `canApprove`.

**Componente:** só consome o hook e renderiza. `TotalCard` continua função local apresentacional.
`CONFIRM_COPY` continua const de módulo.

**Invariantes a preservar (peso legal):** reset de erro-fantasma ao reabrir confirm para outra
cotação; `e.options.clear()` pós-upload; navegação para fora no delete do orçamento; os hooks
declarados antes de qualquer early return (regra de hooks).

### 4.C · code-B menores

- **B1 · `FormErrorBanner`** no lugar das caixas `<p bg-red-50 …>` de `fileError` (BudgetDetailPage
  linhas 153-157; QuotesList linhas 43-47). **Cuidado de margem:** as caixas atuais posicionam com
  `mx-4`/`m-4` dentro de seção com borda; `FormErrorBanner` traz `mb-4` próprio e é `role="alert"`.
  **Envolver em `<div className="mx-4">`** (ou equivalente) para o posicionamento ficar idêntico —
  senão é regressão visual. Ganho: some a reintrodução de "UnmappedErrors local" que a rule proíbe.
- **B2 · `AppRadioButton`** no picker de curso do QuoteWizard (linhas 82-87). Mantém o `<label>` de
  card com hover; troca só o `<input type="radio">` cru pelo wrapper. `name="quote-course"`,
  `checked`, `onChange` preservados.

## 5. Visual (UI-review)

### 5.A · AppDatePicker (novo wrapper — resolve UI-B2)

**Local:** `shared/ui/AppDatePicker/AppDatePicker.tsx` + `index.ts`; entra no barrel raiz
`shared/ui/index.ts`. Reexporta `AppDatePickerProps` (fecha a fronteira de tipo).

**Base:** PrimeReact `Calendar`. **Sem `forwardRef`** — Calendar é class component; segue a categoria
do `AppDropdown` (a rule diz: forwardRef só para wrapper de componente de função com ref de DOM útil).

**Contrato string-in/string-out `'YYYY-MM-DD'`** (crítico):
- A prop `value` é `string | null` e `onChange` emite `string | null` no formato ISO de data — **igual
  ao contrato atual** do form (`planned_start_date`/`planned_end_date` são strings). O consumidor
  (`useQuoteForm`) não muda.
- Internamente converte string↔`Date` usando componentes **locais** (`new Date(y, m-1, d)` /
  `getFullYear/getMonth/getDate`), **nunca** `new Date('YYYY-MM-DD')` (que parseia como UTC e pode
  recuar um dia em fuso negativo — Chile é UTC-3/-4). Mesma disciplina do `value_uf`: o canônico não
  passa por conversão perigosa. Data planejada errada por fuso é defeito silencioso — inaceitável.

**Locale es-CL:** registrar `addLocale('es', { firstDayOfWeek, dayNames, dayNamesShort, dayNamesMin,
monthNames, monthNamesShort, today, clear })` em `shared/config` (novo `primeLocale.ts`, chamado no
mesmo ponto de boot do tema). Calendar recebe `locale="es"`, `dateFormat="dd/mm/yy"`, `showIcon`.

**Uso:** QuoteWizard passo 2 substitui os 2 `<input type="date">` (linhas 133-150) por `AppDatePicker`
dentro dos mesmos `FormField`. Aposenta o markup nativo cru.

### 5.B · UI-B menores (layout/a11y)

- **UI-B1 · Stepper.** Indicador de passo no header do QuoteWizard (ex.: "Paso 1 de 2" ou dois pontos
  ativos/inativos). Só layout Tailwind + cor do kit. Reflete `step` do `useQuoteForm` (já existe).
- **UI-B3 · Toolbar.** `ClientsTable`: a busca crua full-width ganha o mesmo wrapper
  `min-w-64 flex-1` dentro de uma row `flex flex-wrap gap-3` que a `BudgetsTable` usa. As duas abas
  passam a ter a mesma barra. Cai junto a linha em branco solta (`ClientsTable.tsx:18`).
- **UI-B4 · a11y.** `aria-label` (chave i18n, `es-CL` de referência) em todo botão só-ícone: upload do
  QuotesList (`chooseLabel=""`, linhas 86-91), eye/pencil/trash em QuotesList, download/trash em
  FileList, eye nas tabelas Budgets/Clients. Sem mudança visual.
- **UI-B5 · Ordem.** Header do BudgetDetailPage (linhas 86-106): separar o destrutivo. Layout alvo:
  ação primária **Agregar cotización** (brand) isolada à direita; **Editar** + **Excluir** agrupados
  à parte, o destrutivo deixa de ficar encravado entre editar e a primária.

## 6. Camadas tocadas (blast radius)

- `features/commercial/hooks/`: `useClientForm.ts` (edita), `useBudgetDetail.ts` (novo).
- `features/commercial/components/Client/`: `ClientDialog.tsx` (edita), `AddressFields.tsx` +
  `ContactFields.tsx` (novos).
- `features/commercial/components/Budget/`: `BudgetDetailPage.tsx`, `QuotesList.tsx`,
  `QuoteWizard.tsx`, `BudgetsTable.tsx` (edita).
- `features/commercial/components/Client/ClientsTable.tsx` (edita).
- `shared/ui/AppDatePicker/` (novo) + `shared/ui/index.ts` (barrel).
- `shared/config/primeLocale.ts` (novo) + ponto de boot.
- i18n: chaves novas de `aria-label` e do stepper nos 3 locales (`pt-BR`, `es-CL`, `en`) — idênticas.

**Backend/schema/DTO:** intocados. `generated.ts`: intocado (contrato de string preservado).

## 7. Verificação (DoD por área)

Gate por task no plano; DoD do bloco:
- `pnpm build` (tsc -b + vite) e `pnpm lint` verdes.
- **ClientDialog:** create (campos vazios), edit (dados carregam), view (readOnly), add/patch de
  contato, principal-único, endereço preservado ao editar — todos idênticos ao antes.
- **BudgetDetailPage:** aprovar/recusar/excluir cotação (com erro 422/403 aparecendo), reset de
  erro ao reabrir confirm para outra cotação, upload/remoção de documento com clear, editar e
  excluir orçamento (navega para fora) — idênticos.
- **QuoteWizard:** create 2-passos (stepper mostra o passo, radio seleciona curso, datas via
  AppDatePicker gravam `YYYY-MM-DD` correto sem shift de fuso), edit abre no passo 2 — idênticos.
- **Consistência:** as 2 abas com a mesma barra; header do detalhe com destrutivo separado;
  leitor de tela lê nome nos botões de ícone.

## 8. Riscos

- **`useBudgetDetail`** é a maior superfície e é de peso legal (confirmação/reset/navegação). A
  extração não pode alterar 1 pixel do fluxo — daí a checklist comportamental explícita.
- **Fuso no AppDatePicker.** Se a conversão string↔Date usar UTC, a data planejada recua um dia em
  Chile. O contrato local (Seção 5.A) é a defesa; a task tem que provar com uma data concreta.
- **Margem do FormErrorBanner** (B1): swap sem preservar `mx-4` regride o visual.
