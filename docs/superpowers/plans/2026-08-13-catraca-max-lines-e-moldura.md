# BD-4 · Catraca do `max-lines` e adoção da moldura — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** zerar o array `ignores` do `max-lines` no `eslint.config.js` extraindo os quatro
componentes legados, adotar a `SearchableTableFrame` nas duas tabelas com dropdown e montar o
`FormErrorSummary` nos dois diálogos que não o têm.

**Architecture:** extração é **movimento literal** — nenhuma condicional muda de forma, nenhum `key`
muda de critério, e quem tinha irmãos diretos devolve `Fragment`, nunca `<div>` (um nó novo muda o
`space-y-*` do pai). Os hooks que alimentam gates do `CrudDialog` (`useStudentClients`,
`useEntityPhoto`) **ficam no pai**; os filhos recebem props. As quatro mudanças de tela são
declaradas na spec e nenhuma outra é aceitável.

**Tech Stack:** React 19 + TS (Vite) · PrimeReact via `shared/ui` · Tailwind v4 (layout) · vitest
(jsdom) · eslint flat config.

**Spec:** `docs/superpowers/specs/2026-08-13-catraca-max-lines-e-moldura-design.md` (D1–D9).

## Global Constraints

- **Baseline medido em `0c2a24b`, não herdado:** `pnpm lint` exit 0 · `pnpm build` verde ·
  `pnpm test` = **28 arquivos / 138 testes**. O `state.md` registra 27/131 e está **vencido**;
  quem executar mede de novo antes de começar e trava sobre o número medido.
- **Projeção deste plano:** **29 arquivos / 142 testes** (+3 casos do `FormErrorSummary` na Task 1,
  +1 arquivo/+1 caso do `AppFileRow` na Task 6). Nenhum diálogo ganha teste — componente com
  PrimeReact no jsdom está fora do corte do runner.
- **Régua:** `max-lines: ['error', { max: 150, skipBlankLines: false, skipComments: false }]` sobre
  `src/features/*/components/**`. Comentário conta. **Comentário de justificativa sai junto com o
  bloco que explica, nunca apagado para caber.**
- **Cada arquivo sai do array `ignores` no MESMO commit da sua extração.** Não existe estado
  intermediário verde.
- **Features não importam PrimeReact direto nem outra feature — nem para tipo** (lei §5.6/ADR-05).
- **Um arquivo novo por responsabilidade**, em `features/<x>/components/<Entidade>/`, arquivo irmão
  sem subpasta — convenção medida em 6 exemplos da casa.
- **Nome de arquivo novo bate com o export.** Não propagar o typo do vizinho
  (`StudentIdentifyFields.tsx` exporta `StudentIdentityFields`).
- Mensagens de commit em português **sem acento**, como o resto do repositório.
- Toda contagem de linha é `wc -l`. O arquivo antes da mudança se confere com
  `git show HEAD:<path> | wc -l`.

---

## Mapa de arquivos

**Criados:**

| Arquivo | Responsabilidade |
|---|---|
| `frontend/src/features/identity/components/Student/StudentClientField.tsx` | O campo de cliente do aluno: dropdown no create, texto fora dele, com as duas dicas de falha/lista vazia |
| `frontend/src/features/identity/components/Student/StudentDetailSections.tsx` | As duas seções do modo view: histórico de vínculos e tabela de turmas |
| `frontend/src/features/identity/components/Redator/SlotBody.tsx` | `EmptySlot` + `SlotBody` + o tipo `SlotBodyProps` |
| `frontend/src/features/identity/components/Redator/RedatorDocumentsSection.tsx` | A seção DOCUMENTS do diálogo do redator: erros, os 4 slots e o preview |
| `frontend/src/features/identity/components/Redator/RedatorUserSection.tsx` | A seção USUARIO: foto + campos de identidade |
| `frontend/src/features/commercial/components/Budget/BudgetOverlays.tsx` | Os 4 overlays da tela de orçamento + o mapa `CONFIRM_COPY` |
| `frontend/src/features/commercial/components/Budget/BudgetStatCard.tsx` | O cartão de total |
| `frontend/src/shared/ui/AppFileRow/AppFileRow.test.tsx` | Guarda do `title` no nome truncado (UI-01) |

**Modificados:** os quatro alvos da catraca · `BudgetsTable` · `TurmasTable` ·
`shared/ui/FormField/FormField.test.tsx` · `shared/ui/AppFileRow/AppFileRow.tsx` ·
`shared/ui/SearchableTableFrame/SearchableTableFrame.tsx` (só docblock) · `eslint.config.js` ·
`.claude/rules/frontend-fsliced.md` · `docs/superpowers/state.md`.

---

## Task 1: Mecanismo do item (c) — testes do `FormErrorSummary`

O componente não tem **nenhum** teste hoje, e é o único mecanismo que sobrevive ao bloco para o
item (c). Ele é `<ul>` puro, sem PrimeReact, então cabe no runner.

**Files:**
- Modify: `frontend/src/shared/ui/FormField/FormField.test.tsx` (acrescenta um `describe` ao fim)

**Interfaces:**
- Consumes: `FormErrorSummary({ errors, mapped, excludePrefixes })` de
  `shared/ui/FormField/FormField.tsx:79-107`. `errors` é `Record<string, string[]> | undefined`;
  `mapped` é obrigatório; renderiza `null` quando não sobra chave.
- Produces: nada para tasks seguintes.

- [ ] **Step 1: medir o baseline e travar sobre ele**

```bash
cd frontend && pnpm test 2>&1 | tail -5
```
Esperado: `Test Files  28 passed (28)` e `Tests  138 passed (138)`. Se divergir, **pare** e reporte
— o plano inteiro projeta a partir daqui.

- [ ] **Step 2: escrever os três casos**

Acrescente ao fim de `frontend/src/shared/ui/FormField/FormField.test.tsx`, e inclua
`FormErrorSummary` no import da linha 3:

```tsx
describe('FormErrorSummary', () => {
  it('mostra a chave que NAO esta em mapped', () => {
    // É o item (c) do BD-4: `phone` não tem `error=` em campo nenhum, então
    // sem o resumo um 422 nele não aparece em lugar algum da tela.
    render(<FormErrorSummary errors={{ phone: ['El teléfono es inválido.'] }} mapped={['name', 'rut']} />)

    expect(screen.getByText('El teléfono es inválido.')).toBeTruthy()
  })

  it('NAO repete a chave que ja aparece no proprio campo', () => {
    render(<FormErrorSummary errors={{ rut: ['RUT inválido.'] }} mapped={['name', 'rut']} />)

    expect(screen.queryByText('RUT inválido.')).toBeNull()
  })

  it('corta a chave que casa excludePrefixes', () => {
    render(
      <FormErrorSummary
        errors={{ 'modules.0.name': ['Requerido.'], phone: ['Inválido.'] }}
        mapped={['name']}
        excludePrefixes={['modules.']}
      />,
    )

    expect(screen.queryByText('Requerido.')).toBeNull()
    expect(screen.getByText('Inválido.')).toBeTruthy()
  })
})
```

- [ ] **Step 3: rodar e ver os três verdes**

```bash
cd frontend && pnpm exec vitest run src/shared/ui/FormField/FormField.test.tsx
```
Esperado: `Tests  8 passed (8)` (5 antigos + 3 novos).

- [ ] **Step 4: provar que os casos discriminam (sonda, lição 10)**

Verde na primeira rodada não prova nada — os três afirmam comportamento que já existe. Troque
**temporariamente** a linha 92-94 de `frontend/src/shared/ui/FormField/FormField.tsx`, o filtro do
resumo, para ignorar `mapped`:

```tsx
  const keys = Object.keys(errors ?? {})
```

Rode de novo:
```bash
cd frontend && pnpm exec vitest run src/shared/ui/FormField/FormField.test.tsx
```
Esperado: **FAIL** no caso "NAO repete a chave que ja aparece no proprio campo". Restaure o arquivo
com `git checkout -- src/shared/ui/FormField/FormField.tsx` e confirme `git status --porcelain`
mostrando **só** o arquivo de teste.

- [ ] **Step 5: commit**

```bash
git add frontend/src/shared/ui/FormField/FormField.test.tsx
git commit -m "test(ui): FormErrorSummary ganha os tres casos que faltavam"
```

---

## Task 2: `StudentDialog` 281 → ~111

**Files:**
- Create: `frontend/src/features/identity/components/Student/StudentClientField.tsx`
- Create: `frontend/src/features/identity/components/Student/StudentDetailSections.tsx`
- Modify: `frontend/src/features/identity/components/Student/StudentDialog.tsx`
- Modify: `frontend/eslint.config.js:249` (remove a entrada do array `ignores`)

**Interfaces:**
- Consumes: `useStudentForm` (devolve `crud` inteiro, **incluindo `errorSummary`**, hoje não
  desestruturado) · `useStudentClients(mode)` → `{ options, isError, errorDetail, showEmptyHint,
  refetch, unusable }` · `useStudentDetail(id)` → `{ data, isLoading, isError, error, refetch }`.
- Produces:
  - `StudentClientField({ mode, value, readOnlyLabel, error, options, isError, errorDetail, showEmptyHint, unusable, refetch, onChange }): JSX.Element`
  - `StudentDetailSections({ detail }: { detail: ReturnType<typeof useStudentDetail> }): JSX.Element`

- [ ] **Step 1: conferir o ponto de partida**

```bash
cd frontend && wc -l src/features/identity/components/Student/StudentDialog.tsx
```
Esperado: `281`. Divergiu → pare e reporte (o plano projeta a partir deste número).

- [ ] **Step 2: criar `StudentDetailSections.tsx`**

Move **verbatim** o corpo de `StudentDialog.tsx:173-277` (do `detail.isError ? (` até o `))}`
exclusive), preservando o comentário de 174-178 — ele explica por que o erro cobre as duas seções, e
sai junto com o bloco que explica. `useStudentDetail` **fica no pai** (D4): o filho recebe `detail`
por prop, então a requisição que hoje sai em modo edit continua saindo.

```tsx
import { useTranslation } from "react-i18next";
import {
  AppTag,
  AppDataTable,
  AppColumn,
  AppSkeleton,
  AppErrorState,
  FormSection,
} from "@shared/ui";
import type {
  StudentTurmaData,
  StudentClientLogData,
} from "@shared/types/generated";
import {
  enrollmentStatusLabelKey,
  enrollmentStatusSeverity,
  formatMonthYear,
} from "@shared/lib";
import type { useStudentDetail } from "../../api/useStudentDetail";

/** As duas seções do modo view: histórico de vínculos e turmas do aluno. O
 * hook fica no diálogo — descê-lo cancelaria a requisição que hoje sai em modo
 * edit, e isso é mudança de rede, não extração (D4). */
export function StudentDetailSections({
  detail,
}: {
  detail: ReturnType<typeof useStudentDetail>;
}) {
  const { t } = useTranslation();

  return detail.isError ? (
    /* ...corpo verbatim de StudentDialog.tsx:174-277... */
  ) : (
    /* ... */
  );
}
```

Duas mudanças **obrigatórias** dentro do corpo movido, e nenhuma outra:
1. `<ul className="sp">` (linha 199) vira `<ul className="space-y-2">` — `sp` não é utilitário
   Tailwind e não existe em CSS nenhum do `src`; a lista renderiza hoje sem espaçamento (D6).
2. O `<>` / `</>` do ramo feliz (186/276) permanece `Fragment` — os filhos são irmãos diretos
   dentro do `<section className="space-y-4">` do pai.

- [ ] **Step 3: criar `StudentClientField.tsx`**

Colapsa o campo no molde do `BudgetDialog:54-65` (D3). O `FormField` em modo leitura faz
`readOnly ? <ReadOnlyValue value={value}/> : children` — troca os filhos inteiros —, então as duas
dicas ficam dentro de `children` (só existem no create de qualquer jeito) e o aviso `clientLocked`
**sai para fora do `FormField`**, senão o edit perde o aviso.

```tsx
import { useTranslation } from "react-i18next";
import { AppButton, AppDropdown, FormField } from "@shared/ui";
import type { DialogMode } from "@shared/lib";
import { dangerText } from "@shared/styles/tokens";

/** Cliente é imutável depois do cadastro: fora do `create` o campo é texto, não
 * input desabilitado — `<AppInputText disabled>` cortava o nome do cliente, que
 * é o débito do BD-3 §4 numa quarta grafia que nenhuma das duas catracas
 * enxerga. Mesmo molde do `BudgetDialog`. */
export function StudentClientField({
  mode,
  value,
  readOnlyLabel,
  error,
  options,
  isError,
  errorDetail,
  showEmptyHint,
  unusable,
  refetch,
  onChange,
}: {
  mode: DialogMode;
  value: number | null;
  /** O rótulo do modo leitura vem do pai, não do `options`: fora do `create` a
   * lista de clientes nem é buscada, e o nome vigente mora na entidade. */
  readOnlyLabel: string;
  error?: string;
  options: { label: string; value: number }[];
  isError: boolean;
  errorDetail?: string | null;
  showEmptyHint: boolean;
  unusable: boolean;
  refetch: () => void;
  onChange: (id: number) => void;
}) {
  const { t } = useTranslation();

  return (
    <>
      <FormField
        label={t("student.client")}
        error={error}
        readOnly={mode !== "create"}
        value={readOnlyLabel}
      >
        <AppDropdown
          value={value}
          disabled={unusable}
          options={options}
          onChange={(e) => onChange(e.value as number)}
          className="w-full"
        />
        {/* ...as duas dicas, verbatim de StudentDialog.tsx:126-153... */}
      </FormField>
      {mode === "edit" && (
        <p className="mt-1 text-xs" style={{ color: "var(--text-color-secondary)" }}>
          {t("student.clientLocked")}
        </p>
      )}
    </>
  );
}
```

**O texto do modo leitura preserva o de hoje.** O diálogo passa
`readOnlyLabel={student?.current_client_name ?? t("student.noClient")}` — exatamente o que a linha
157 exibe hoje. Sem isso o campo cairia no travessão do `ReadOnlyValue`, que é o default correto
para vazio mas **não** é o texto atual, e a extração deixaria de ser literal. O filho não conhece
`StudentData`: recebe string pronta.

- [ ] **Step 4: trocar no diálogo**

Em `StudentDialog.tsx`:
1. Acrescente `errorSummary` ao destructuring da linha 60 e monte o resumo logo após o
   `FormErrorBanner` da linha 81, no molde do `ClientDialog:74-75`:
   ```tsx
   <FormErrorBanner message={generalError} />
   <FormErrorSummary errors={fieldErrors} {...errorSummary} />
   ```
   `useStudentForm` já declara `mapped: ['name','rut','email','client_id']` e
   `summaryOnly: ['phone']` — nada muda no hook.
2. Substitua 113-170 pela chamada de `StudentClientField` e 172-277 por
   `{mode === "view" && <StudentDetailSections detail={detail} />}`.
3. Remova os imports que ficam órfãos: `AppButton`, `AppInputText`, `AppDropdown`, `AppTag`,
   `AppDataTable`, `AppColumn`, `AppSkeleton`, `AppErrorState`, `dangerText`, os tipos
   `StudentTurmaData`/`StudentClientLogData` e as três funções de `@shared/lib`
   (`enrollmentStatusLabelKey`, `enrollmentStatusSeverity`, `formatMonthYear`). Acrescente
   `FormErrorSummary`.
4. `useStudentClients` e `useStudentDetail` **permanecem** no diálogo — `clientsUnusable` alimenta
   `disabled={clientsUnusable || photo.pending}` na linha 77, fora do campo.

- [ ] **Step 5: tirar do `ignores` e medir**

Remova a linha `'src/features/identity/components/Student/StudentDialog.tsx',` de
`frontend/eslint.config.js:249`.

```bash
cd frontend && wc -l src/features/identity/components/Student/StudentDialog.tsx \
  src/features/identity/components/Student/StudentClientField.tsx \
  src/features/identity/components/Student/StudentDetailSections.tsx && pnpm lint
```
Esperado: `StudentDialog` **abaixo de 150** (projeção ~111), os dois filhos abaixo de 150 também, e
`pnpm lint` **exit 0**. Se o diálogo passar de 150, o próximo bloco a sair é o par foto+identity
(89-111, 23 linhas), que é cópia quase literal do `StaffUserDialog` e do `ClientDialog`.

- [ ] **Step 6: build e suíte**

```bash
cd frontend && pnpm build && pnpm test 2>&1 | tail -5
```
Esperado: build verde; `28 passed` / `141 passed` (o baseline mais os 3 da Task 1).

- [ ] **Step 7: commit**

```bash
git add frontend/src/features/identity/components/Student/ frontend/eslint.config.js
git commit -m "refactor(identity): StudentDialog abaixo da regua, com resumo de erros"
```

---

## Task 3: `RedatorDocumentSlot` 175 → 59

**Files:**
- Create: `frontend/src/features/identity/components/Redator/SlotBody.tsx`
- Modify: `frontend/src/features/identity/components/Redator/RedatorDocumentSlot.tsx`
- Modify: `frontend/eslint.config.js` (remove a entrada do `RedatorDocumentSlot`)

**Interfaces:**
- Produces: `SlotBody(props: SlotBodyProps): JSX.Element` e o **tipo exportado** `SlotBodyProps`
  (hoje declarado em `RedatorDocumentSlot.tsx:13-27`), que continua sendo prop-type dos dois lados:
  o wrapper faz `{ type, mode, doc, ...body }` e repassa `{...body}`.

- [ ] **Step 1: conferir o ponto de partida**

```bash
cd frontend && wc -l src/features/identity/components/Redator/RedatorDocumentSlot.tsx
```
Esperado: `175`.

- [ ] **Step 2: mover `EmptySlot` + `SlotBody` + o tipo**

Crie `SlotBody.tsx` com, **verbatim**: o tipo `SlotBodyProps` (linhas 13-27, agora `export type`), a
constante `UPLOAD_CHOOSE_OPTIONS` (8-11, usada só por `EmptySlot:46` e `SlotBody:135`), `EmptySlot`
(29-54) e `SlotBody` (56-145), mais os imports que essas 116 linhas usam.

**Duas assimetrias medidas que a extração NÃO pode normalizar:**
- o ramo `view` sem documento devolve `<p>` cru e **não** `EmptySlot` (linha 100), diferente de
  `create` (77) e `edit` (113-120);
- o ramo `create` monta a linha de arquivo **sem** `AppFileActions`, com botão de remoção próprio,
  porque `File` do browser não tem `download_url` — a razão já está comentada no código.

A D6 do próprio arquivo (147-154) continua valendo: `preview` e `sizeError` **não** descem para o
slot.

- [ ] **Step 3: o wrapper importa em vez de declarar**

Em `RedatorDocumentSlot.tsx` sobram os imports vivos, o `import { SlotBody, type SlotBodyProps } from './SlotBody'`
e o componente exportado (147-175, 29 linhas).

- [ ] **Step 4: tirar do `ignores` e medir**

```bash
cd frontend && wc -l src/features/identity/components/Redator/RedatorDocumentSlot.tsx \
  src/features/identity/components/Redator/SlotBody.tsx && pnpm lint && pnpm build
```
Esperado: wrapper ~59, `SlotBody.tsx` ~128, lint exit 0, build verde.

- [ ] **Step 5: commit**

```bash
git add frontend/src/features/identity/components/Redator/ frontend/eslint.config.js
git commit -m "refactor(identity): corpo do slot de documento sai do wrapper"
```

---

## Task 4: `RedatorDialog` 206 → ~129

Duas seções saem, não uma: só a de documentos deixa o arquivo em **151**, uma acima da régua, e o
resumo de erros soma +3.

**Files:**
- Create: `frontend/src/features/identity/components/Redator/RedatorDocumentsSection.tsx`
- Create: `frontend/src/features/identity/components/Redator/RedatorUserSection.tsx`
- Modify: `frontend/src/features/identity/components/Redator/RedatorDialog.tsx`
- Modify: `frontend/eslint.config.js` (remove a entrada do `RedatorDialog`)

**Interfaces:**
- Consumes: `useRedatorForm` → `{ form, set, toggleCourse, readOnly, submit, pending, stagedDocs,
  stageDoc, unstageDoc, fieldErrors, generalError }` — **sem `errorSummary`**, porque o hook não usa
  `useCrudForm` e não vai migrar (D2).
- Produces:
  - `RedatorDocumentsSection({ mode, redator, stagedDocs, stageDoc, unstageDoc }): JSX.Element`
  - `RedatorUserSection({ form, set, readOnly, fieldErrors, photo }): JSX.Element`

- [ ] **Step 1: criar `RedatorDocumentsSection.tsx`**

Leva, do diálogo: os hooks `useUploadDocument`/`useRemoveDocument`/`useFilePreview` e o
`useState<string | null>` de `sizeError` (72-75), os dois handlers (87-101), o `existing`/`redatorId`
(79/85) e a seção inteira (158-193). É legal chamar esses hooks de um componente de feature: nenhum
é `xxxApi.useAlgo()`, nenhum é `useQuery` direto e nenhum recebe objeto de api como argumento.

**Mudança de padrão declarada (D6):** os dois `<p>` crus de erro (159-168) viram `FormErrorBanner`,
alinhando com o irmão `BudgetDocumentsCard:56-57`:

```tsx
      <FormSection title={t("redator.sectionDocuments")} spaced />
      <FormErrorBanner message={upload.error?.detail} />
      <FormErrorBanner message={sizeError} />
```

O componente devolve **`Fragment`**, não `<div>`: os filhos são irmãos diretos do
`<section className="space-y-4">` do diálogo.

- [ ] **Step 2: criar `RedatorUserSection.tsx`**

Move verbatim 131-156 (o `FormSection` de usuário, o `<div>` da foto e o `<div>` dos campos).
`useEntityPhoto` **fica no pai** — `photo.pending` alimenta `disabled` e `closeBlocked` do
`CrudDialog` (112-113). O filho recebe o objeto `photo` inteiro por prop.

- [ ] **Step 3: montar o resumo com `mapped` literal (D2)**

Em `RedatorDialog.tsx`, logo após o `FormErrorBanner` da linha 124:

```tsx
      <FormErrorSummary
        errors={fieldErrors}
        // `useRedatorForm` não roda sobre `useCrudForm` (decisão do BD-5), então
        // não há `errorSummary` a espalhar: a lista é literal, no estilo do
        // CourseDialog/QuoteWizard. Só name, rut e email têm `error=` no campo;
        // phone, course_ids e documents[<tipo>] caem aqui.
        mapped={['name', 'rut', 'email']}
      />
```

- [ ] **Step 4: limpar os imports órfãos**

Saem: `useState` (linha 1), `AppFilePreviewDialog` (6), `FileUploadHandlerEvent` (11),
`useUploadDocument`/`useRemoveDocument` (15-18), `DOC_TYPES` (24), `type DocType` (27),
`dangerText` (32), `useFilePreview`, `AppPhotoField`, `RedatorIdentityFields` e
`RedatorDocumentSlot`. Entram: `FormErrorSummary`, `RedatorDocumentsSection`, `RedatorUserSection`.

- [ ] **Step 5: tirar do `ignores` e medir**

```bash
cd frontend && wc -l src/features/identity/components/Redator/RedatorDialog.tsx \
  src/features/identity/components/Redator/RedatorDocumentsSection.tsx \
  src/features/identity/components/Redator/RedatorUserSection.tsx && pnpm lint && pnpm build
```
Esperado: diálogo abaixo de 150 (projeção ~129), os dois filhos abaixo, lint exit 0, build verde.

- [ ] **Step 6: commit**

```bash
git add frontend/src/features/identity/components/Redator/ frontend/eslint.config.js
git commit -m "refactor(identity): RedatorDialog abaixo da regua, com resumo de erros"
```

---

## Task 5: `BudgetDetailPage` 187 → ~136 · **o array `ignores` some**

> **Refinamento da spec, achado ao escrever o plano:** a §4.4 projetava ~145 supondo uma chamada de
> volta de ~12 linhas. Medido no código, os quatro overlays consomem o objeto `d` **inteiro**
> (`useBudgetDetail`), que a página já tem — a chamada é de **uma** linha, e `formatUf` e
> `AppCardTone` também ficam órfãos. A projeção cai para **~136**. A contingência da spec (extrair a
> prop `actions` do `DetailHeader`, 20 linhas) fica de reserva e só entra se a contagem real do
> Step 5 passar de 150.

**Files:**
- Create: `frontend/src/features/commercial/components/Budget/BudgetOverlays.tsx`
- Create: `frontend/src/features/commercial/components/Budget/BudgetStatCard.tsx`
- Modify: `frontend/src/features/commercial/components/Budget/BudgetDetailPage.tsx`
- Modify: `frontend/eslint.config.js:248-253` (o bloco `ignores` inteiro sai)
- Modify: `.claude/rules/frontend-fsliced.md:106`

**Interfaces:**
- Produces:
  - `BudgetOverlays({ d, budgetId, budget }): JSX.Element` — `d` é
    `ReturnType<typeof useBudgetDetail>`, o mesmo objeto que a página já consome inteiro
  - `BudgetStatCard({ label, value, tone }: { label: string; value?: string; tone?: AppCardTone })`

- [ ] **Step 1: criar `BudgetOverlays.tsx`**

Move verbatim 131-166 (os quatro overlays, com o comentário de 131) e o mapa `CONFIRM_COPY`
(172-176), que só eles usam. Devolve **`Fragment`** — são irmãos diretos dentro do
`<div className="space-y-6">`, e um `<div>` novo faria o `space-y-6` espaçar um filho só.

- [ ] **Step 2: criar `BudgetStatCard.tsx`**

Move verbatim 178-187, **com o jsdoc de 178-179**. O nome do arquivo bate com o export: o componente
passa a se chamar `BudgetStatCard`, e os três sítios do grid (103-105) acompanham.

- [ ] **Step 3: trocar na página**

```tsx
        <BudgetOverlays d={d} budgetId={budgetId} budget={budget} />
```
Os ramos de estado (23-58) **não são tocados** — é o que os 3 testes vivos guardam. Saem os imports
órfãos: `BudgetDialog`, `QuoteWizard`, `ConfirmDialog`, `AppCardTone` e `formatUf`.

- [ ] **Step 4: apagar o bloco `ignores` e reescrever a rule**

Em `frontend/eslint.config.js`, o array `ignores` (248-253) sai **inteiro**, junto do comentário que
o explica (245-247). O bloco fica só com o glob e a regra.

Em `.claude/rules/frontend-fsliced.md:106`, a frase "A régua tem catraca: **4 legados em `ignores`**
(...), lista que só encolhe; não acrescente arquivo para calar o lint" vira o registro de que a
catraca **fechou** — a régua vale sem exceção, e componente que passar dela extrai o bloco coeso.
Mesma redação que a regra irmã de query-em-componente já usa ("Zerada em 2026-08-03 — o bloco
`ignores` não existe mais"). O teste `repo-docs-refs` não pega essa frase (os tokens não têm `/` nem
extensão), então ela só fica verdadeira se for reescrita à mão, agora.

- [ ] **Step 5: a prova central do bloco**

```bash
cd frontend && grep -n "ignores" eslint.config.js && pnpm lint
```
Esperado: nenhuma ocorrência dentro do bloco do `max-lines` (o `globalIgnores` do topo continua) e
`pnpm lint` **exit 0**. Este é o DoD do bloco; se reprovar, o arquivo que estourou volta para a
mesa, não para o array.

- [ ] **Step 6: os 3 testes vivos, sem uma linha de diff**

```bash
cd frontend && pnpm exec vitest run src/features/commercial/components/Budget/BudgetDetailPage.test.tsx \
  && git status --porcelain src/features/commercial/components/Budget/BudgetDetailPage.test.tsx
```
Esperado: `Tests  3 passed (3)` e o `git status` **vazio** — o arquivo de teste não é editado, e é
isso que prova que o corte foi literal.

- [ ] **Step 7: build, suíte e commit**

```bash
cd frontend && pnpm build && pnpm test 2>&1 | tail -5
git add frontend/src/features/commercial/components/Budget/ frontend/eslint.config.js .claude/rules/frontend-fsliced.md
git commit -m "refactor(commercial): BudgetDetailPage abaixo da regua e catraca zerada"
```

---

## Task 6: UI-01 — `title` no nome truncado (`shared/ui`)

Achado B do gate do BD-3, ainda aberto. O achado nomeia o `RedatorDialog`; o defeito está uma camada
abaixo, e corrigir lá alcança `AppFilePreviewDialog:51`, `DocumentTypeCard:69`, `FileList:23` e os 3
sítios do slot.

**Files:**
- Create: `frontend/src/shared/ui/AppFileRow/AppFileRow.test.tsx`
- Modify: `frontend/src/shared/ui/AppFileRow/AppFileRow.tsx:55`

- [ ] **Step 1: escrever o teste que falha**

```tsx
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AppFileRow } from './AppFileRow'

describe('AppFileRow', () => {
  it('expoe o nome inteiro em title, porque a linha trunca', () => {
    // UI-01: a 390px o nome sai truncado sem hover e sem quebra — o valor
    // some da tela sem nenhum caminho para lê-lo.
    render(<AppFileRow name="certificado-de-titulo-profesional-2026.pdf" mime="application/pdf" />)

    expect(screen.getByText('certificado-de-titulo-profesional-2026.pdf').getAttribute('title'))
      .toBe('certificado-de-titulo-profesional-2026.pdf')
  })
})
```

- [ ] **Step 2: rodar e ver vermelho**

```bash
cd frontend && pnpm exec vitest run src/shared/ui/AppFileRow/AppFileRow.test.tsx
```
Esperado: **FAIL**, `expected null to be 'certificado-...'`.

- [ ] **Step 3: corrigir a linha 55**

```tsx
        <p className="truncate text-sm font-medium" title={name}>{name}</p>
```

- [ ] **Step 4: rodar e ver verde, depois commitar**

```bash
cd frontend && pnpm exec vitest run src/shared/ui/AppFileRow/AppFileRow.test.tsx && pnpm build
git add frontend/src/shared/ui/AppFileRow/
git commit -m "fix(ui): nome de arquivo truncado expoe o valor inteiro em title (UI-01)"
```

---

## Task 7: `BudgetsTable` adota a `SearchableTableFrame`

**Files:**
- Modify: `frontend/src/features/commercial/components/Budget/BudgetsTable.tsx`
- Modify: `frontend/src/shared/ui/SearchableTableFrame/SearchableTableFrame.tsx:62-66` (docblock)

- [ ] **Step 1: confirmar a porta de import**

```bash
cd frontend && grep -n "SearchableTableFrame" src/shared/ui/index.ts
```
Esperado: a moldura é reexportada pelo barrel; o import na feature é de `@shared/ui`.

- [ ] **Step 2: trocar a toolbar e a tabela pela moldura**

Substitui `BudgetsTable.tsx:83-118` (o `AppCardToolbar` e a abertura do `AppDataTable`); as colunas
(119-137) **não mudam**. O `empty` de busca/filtro (62-78) some — é o que a moldura já monta, com a
mesma bifurcação e as mesmas 6 chaves i18n. Fica só o vazio de domínio, agora na prop `emptyState`:

```tsx
  const clearAll = () => { table.clear(); setStatus(null) }

  return (
    <SearchableTableFrame
      table={{ ...table, clear: clearAll }}
      searchPlaceholder={t('budget.searchPlaceholder')}
      filterSlot={
        <div className="w-48">
          <AppDropdown
            value={status}
            options={statusOptions}
            optionValue="value"
            onChange={(e) => { setStatus(e.value as QuoteStatus | null); table.resetPage() }}
          />
        </div>
      }
      emptyState={
        <AppEmptyState icon="pi pi-file" title={t('budget.empty')} description={t('budget.emptyHint')} action={actions} />
      }
      footerCount={t('budget.count', { count: table.rows.length })}
      actions={actions}
      loading={busy}
      error={loadError}
      onRetry={retry}
    >
      {/* colunas verbatim */}
    </SearchableTableFrame>
  )
```

O `clear` composto é obrigatório: quem passa `filterSlot` **deve** passar um `clear` que limpe também
o filtro, porque o vazio de filtro oferece `common.clearFilters`. O molde da casa monta isso no hook
(`useHistorial`), mas aqui o estado do dropdown mora em `useState` local.

**Mudança de tela declarada (D8):** o CTA passa a seguir o critério da moldura
(`!table.filtering && rows.length === 0`), então em **lista vazia com termo digitado** ele passa a
aparecer, onde hoje some. Nos outros três casos os critérios coincidem.

- [ ] **Step 3: corrigir o comentário falso do retry**

O comentário de 38-41 afirma que o `retry` devolve a promise das **duas** recargas.
`useCommercialClients.refetch` descarta a própria com `void`, então o `Promise.all` só espera o
`onRetry` do pai. Reescreva dizendo o que o código faz.

- [ ] **Step 4: corrigir o docblock da moldura**

`SearchableTableFrame.tsx:62-63` diz que `BudgetsTable`/`TurmasTable` "não entram aqui (dropdown de
filtro por cima) — spec D2" e três linhas abaixo descreve o caminho delas pelo `filterSlot`. A
primeira frase morre; as duas passam a ser consumidoras nomeadas.

- [ ] **Step 5: verificar e commitar**

```bash
cd frontend && wc -l src/features/commercial/components/Budget/BudgetsTable.tsx && pnpm lint && pnpm build && pnpm test 2>&1 | tail -3
git add frontend/src/features/commercial/components/Budget/BudgetsTable.tsx frontend/src/shared/ui/SearchableTableFrame/SearchableTableFrame.tsx
git commit -m "refactor(commercial): BudgetsTable adota a SearchableTableFrame"
```

---

## Task 8: `TurmasTable` adota a `SearchableTableFrame`

Mesmo movimento da Task 7, com três diferenças medidas: **não tem `actions`** (turma não nasce de
botão, nasce de cotação aprovada), o vazio de domínio não tem ação, e o arquivo está **exatamente em
150 linhas sem estar nos `ignores`** — se a adoção inflar, o lint reprova sozinho.

**Files:**
- Modify: `frontend/src/features/operation/components/Turma/TurmasTable.tsx`

- [ ] **Step 1: trocar a toolbar e a tabela pela moldura**

Substitui 63-96 pelo mesmo molde da Task 7, sem `actions`:

```tsx
  const clearAll = () => { table.clear(); setStatus(null) }

  return (
    <SearchableTableFrame
      table={{ ...table, clear: clearAll }}
      searchPlaceholder={t('operation.table.search')}
      filterSlot={
        <div className="w-48">
          <AppDropdown
            value={status}
            options={statusOptions}
            optionValue="value"
            onChange={(e) => { setStatus(e.value as TurmaDisplayStatus | null); table.resetPage() }}
          />
        </div>
      }
      emptyState={
        // Sem ação: turma não se cria por botão, nasce de cotação aprovada.
        <AppEmptyState icon="pi pi-calendar" title={t('operation.table.empty')} description={t('operation.table.emptyHint')} />
      }
      footerCount={t('operation.table.count', { count: table.rows.length })}
      loading={loading}
      error={error}
      onRetry={onRetry}
    >
      {/* colunas verbatim de 97-146 */}
    </SearchableTableFrame>
  )
```

Some o `empty` de 42-61 e a const `filtering` de 40, que fica sem uso. Imports órfãos:
`AppInputText`, `AppCardToolbar`.

- [ ] **Step 2: verificar e commitar**

```bash
cd frontend && wc -l src/features/operation/components/Turma/TurmasTable.tsx && pnpm lint && pnpm build && pnpm test 2>&1 | tail -3
git add frontend/src/features/operation/components/Turma/TurmasTable.tsx
git commit -m "refactor(operation): TurmasTable adota a SearchableTableFrame"
```

---

## Task 9: doc — o ponteiro fantasma e os números vencidos

**Files:**
- Modify: `docs/superpowers/state.md:105` e `:250`
- Modify: `docs/superpowers/backlog.md:143`, `:340`, `:347`, `:349`, `:410`

- [ ] **Step 1: corrigir o ponteiro fantasma no `state.md`**

As duas citações de `FormErrorSummary.tsx:62-67` passam a apontar
`frontend/src/shared/ui/FormField/FormField.tsx:79-107`, que é onde o componente vive. **A spec e o
plano arquivados do BD-8 não são tocados** (D9): artefato fechado não se reescreve.

- [ ] **Step 2: corrigir os números do `backlog.md`**

`StudentDialog` 283 → **281**, `RedatorDialog` 199 → **206**, `BudgetDetailPage` 171 → **187**, e a
contradição interna (a linha 410 ainda afirma "189 linhas cada"). Cada número recebe a data da
medição. **Nenhum item é removido nem promovido** — a baixa dos débitos cobertos é do
`/fechar-sprint`.

- [ ] **Step 3: a guarda de doc continua verde**

```bash
cd frontend && pnpm exec vitest run tests/repo-docs-refs.test.ts
```
Esperado: verde — o path novo existe.

- [ ] **Step 4: commit**

```bash
git add docs/superpowers/state.md docs/superpowers/backlog.md
git commit -m "docs: corrige o ponteiro do FormErrorSummary e os numeros da catraca"
```

---

## Task 10: Gate

Verificação pura, sem commit de código.

- [ ] **Step 1: ferramentas**

```bash
cd frontend && pnpm lint && pnpm build && pnpm test 2>&1 | tail -5
```
Esperado: lint exit 0 **com o bloco `ignores` inexistente**; build verde; **29 arquivos / 142
testes**. Divergiu da projeção → explique a diferença, não a maquie.

- [ ] **Step 2: a régua, medida arquivo a arquivo**

```bash
cd frontend && wc -l src/features/identity/components/Student/StudentDialog.tsx \
  src/features/identity/components/Redator/RedatorDialog.tsx \
  src/features/identity/components/Redator/RedatorDocumentSlot.tsx \
  src/features/commercial/components/Budget/BudgetDetailPage.tsx \
  src/features/commercial/components/Budget/BudgetsTable.tsx \
  src/features/operation/components/Turma/TurmasTable.tsx
```
Esperado: os seis **abaixo de 150**.

- [ ] **Step 3: nenhuma sonda, nenhum vazamento de camada**

```bash
cd frontend && git diff main...HEAD -- src | grep -nE "console\.log|debugger|SONDA" ; \
  grep -rn "from 'primereact" src/features | head ; \
  git diff main...HEAD --stat -- ../backend src/shared/types/generated.ts
```
Esperado: as três saídas **vazias**.

- [ ] **Step 4: órfãos**

```bash
cd frontend && grep -rn "AppInputText" src/features/identity/components/Student/ ; \
  grep -rn "className=\"sp\"" src ; \
  grep -rn "auditSync\|ignores" eslint.config.js | head
```
Esperado: nenhum `AppInputText` sobrando no diálogo do aluno, zero `sp`, e `ignores` só no
`globalIgnores` do topo.

- [ ] **Step 5: e2e — o 422 de `phone` (D1)**

Com sessão Sanctum viva (cookie + CSRF, `Origin` e `Accept`), forje o payload que a tela não
consegue mandar:

```bash
curl -sS -X PUT http://localhost:8080/api/students/<id> \
  -H 'Content-Type: application/json' -H 'Accept: application/json' \
  -H 'Origin: http://localhost:5173' -H "X-XSRF-TOKEN: <token>" -b <cookiejar> \
  -d '{"name":"...","rut":"...","phone":[]}' -i | head -20
```
Esperado: **422** `application/problem+json` com `errors.phone`. Repita para
`PUT /api/redatores/<id>`. Este é o insumo do Step 6.

- [ ] **Step 6: navegador (`/lotus-ui-review`), com o que precisa ser visto**

1. **`StudentDialog`** e **`RedatorDialog`**: o 422 forjado do Step 5 aparece **no resumo**, acima do
   formulário — é o item (c) do BD-4.
2. **`StudentDialog` em view e edit:** o cliente é **texto**, não input cinza; em edit o aviso
   `clientLocked` continua visível (é o que sairia em silêncio se ficasse dentro do `FormField`); a
   lista de vínculos tem espaçamento entre itens.
3. **`RedatorDialog`:** os erros de upload e de tamanho aparecem como banner; o nome de arquivo longo
   tem `title` (UI-01), conferido a 390x844.
4. **`BudgetsTable`:** os quatro casos do CTA — lista cheia, filtro de estado zerando linhas, busca
   sem match, e **lista vazia com termo digitado** (o caso que muda, D8) — mais o **wrap da toolbar a
   390x844**, que é o efeito de layout que a moldura pode introduzir.
5. **`TurmasTable`:** busca, filtro e os dois vazios; sem CTA em nenhum.
6. **`BudgetDetailPage`:** os três ramos de estado intocados e os overlays abrindo (editar, wizard,
   os dois confirmares).

- [ ] **Step 7: escrever o que o gate NÃO provou**

Sem maquiagem, no relatório: nenhum diálogo tem teste de componente, então a equivalência das
extrações é visual e não sobrevive como mecanismo; a requisição de `useStudentDetail` em modo edit
continua saindo (D4); o `mapped` literal do redator não tem guarda contra campo novo no payload
(D2); e a lista genuinamente vazia da `BudgetsTable` só se observa sem mutação se a base estiver
vazia.

---

## Handoff de execução

**`executor: claude`**, sem `paths_autorizados`.

Critério: o bloco decide apresentação em vários sítios (o que vira `Fragment` e o que vira `<div>`,
o que é dica e o que é banner), atravessa a lei §5.6 do `CLAUDE.md` e mexe no `eslint.config.js`,
onde um bloco no lugar errado apaga seletor existente **em silêncio** (Q-2 de 2026-08-04, reincidente
no BD-3). A Task 5 ainda reescreve rule normativa, que é lei-adjacente.
