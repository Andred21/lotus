# Triagem dos audits do item 18 — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** dar veredito escrito aos 49 achados das quatro runs de `/lotus-ui-review` do item 18, corrigir na raiz o que sobreviver (19 achados, quatro raízes com catraca), abrir as seis fichas que são decisão do João, e pintar com dado de prova o que três runs não alcançaram — os seis diálogos de certificação, o ramo válido de `/validar` e o `CertificateFolio`.

**Architecture:** o ledger de triagem nasce na Task 1 com o veredito preliminar de cada achado e vai sendo provado task a task. As raízes (R1 botão sem papel, R2 dado técnico, R3 invalidez/foco, R4 `dataKey`) corrigem em `shared/ui` e ganham catraca de lint ou teste; os sítios só consomem. Nada visual muda sem decisão: o que é do João vira ficha `D-*`. A prova final é uma quinta run no navegador com um certificado real emitido no stack desta árvore.

**Tech Stack:** React 19 + TS, Vite, Tailwind v4 (layout), PrimeReact via `shared/ui`, TanStack Query, Recharts 3, Vitest + Testing Library (jsdom), ESLint flat config com `no-restricted-syntax`.

**Spec:** [`docs/superpowers/specs/2026-08-29-frontend-triagem-dos-audits-do-item-18-design.md`](../specs/2026-08-29-frontend-triagem-dos-audits-do-item-18-design.md)

## Global Constraints

- Bloco **frontend puro**: não toca `backend/` nem `frontend/src/shared/types/generated.ts`. `pint` e `typescript:transform` são N/A por escopo, **medidos** na Task 18 (`git diff --stat main...HEAD -- backend/ frontend/src/shared/types/generated.ts` vazio).
- Feature não importa PrimeReact direto (só via `shared/ui`) nem outra feature, nem para tipo (ADR-05, lei §5.6).
- Tailwind é layout; cor vem de variável do tema (ADR-16). `text-[var(--…)]` passa na catraca; utility de paleta não.
- Catraca nova entra nos **quatro** arrays de `no-restricted-syntax` de tela (`eslint.config.js:415`, `:428`, `:449` para `src/features/**` e `:653` para `src/app/**`) e nasce **verde**, vista reprovar por sonda negativa.
- Todo `<ul>`/`<ol>` novo carrega `role="list"` (`LISTA_SEM_SEMANTICA`).
- Comandos rodam de `frontend/`: `pnpm lint`, `pnpm build`, `pnpm test`. Stack desta árvore em **offset +2**: API `http://localhost:8082`, Vite `http://localhost:5175`.
- Teste de regressão só vale visto **reprovar** contra o código antigo (lição 10). Onde a task diz "sonda", é isso.
- Commit por task, `git add` só nos paths da task. Nunca `git stash` sem `-m` nesta árvore.
- Nenhuma mudança visual fora das decisões D1–D15 da spec: o que a spec manda para ficha **não se corrige** aqui.

## Sondas medidas na escrita deste plano (2026-08-29, `main@37e0e2d4`)

- Seletor `JSXOpeningElement[name.name="AppButton"]:not(:has(> JSXAttribute[name.name=/^(variant|text|outlined|link|severity)$/]))` sobre `src/features/**` + `src/app/**`: **13 hits**, todos listados na Task 6.
- Seletor `JSXAttribute[name.name="className"] Literal|TemplateElement[/font-mono/]`: **20 hits**, todos listados nas Tasks 8 e 9.
- `AppDataTable.tsx:106` crava `dataKey="id"` **antes** do `{...props}` (`:143`): a prop do chamador já vence — a Task 11 não precisa mudar o primitivo, só declarar no sítio e guardar por teste.
- `AppDialog/style.ts` pinta header/footer em `--surface-section` e corpo em `--surface-card`, com razão escrita — a f1 UI-04 é recusada, não corrigida.
- `InputText`, `InputTextarea`, `Dropdown`, `Calendar` e `Password` do PrimeReact declaram `invalid?: boolean` (conferido nos `.d.ts`). `TagProps` estende `HTMLAttributes<HTMLSpanElement>` — `id` passa.
- `recharts` exporta `LegendPayload` (`types/index.d.ts:8`) e `Legend` aceita `content: ReactElement | (props) => ReactNode`.
- Admin do seed: `admin@lotus.cl` / `senha123` (`DatabaseSeeder.php:40-44`). Template de certificado é só JSON (`POST /api/courses/{id}/templates`, `CourseTemplateTest.php:22`).

---

## Estrutura de arquivos

**Criados:**

- `docs/superpowers/audits/2026-08-29-item19-triagem.md` — o ledger da triagem (Task 1; preenchido até a Task 18).
- `frontend/src/shared/ui/CrudDialog/CrudDialog.test.tsx` — foco após envio reprovado.
- `frontend/src/shared/ui/AppSelectableCard/AppSelectableCard.test.tsx` — alvo sem superfície própria.
- `frontend/src/shared/ui/AppLineChart/legend.tsx` + `legend.test.tsx` — legenda com conteúdo próprio.
- `docs/superpowers/audits/2026-08-29-item19-run5.md` — relatório da run 5 (Task 17).

**Modificados:** `FormField/fieldContext.ts`, `fieldAssociation.test.tsx`, `CrudDialog.tsx`, `AppSelectableCard.tsx`, `ArchiveSwitch.tsx` + teste, 6 diálogos de certificação, `LoginForm.tsx`, `ForgotForm.tsx`, `SetPasswordPage.tsx`, `AuthPanel.test.tsx`, `ProfilePersonalSection.tsx`, `ProfileSecuritySection.tsx`, `ProfileDocumentsSection.tsx`, `eslint.config.js`, `typography.ts` + teste, `AppFileRow.tsx`, `CertificateFolio.tsx`, `AppCard.tsx`, 7 arquivos de `app/pages/Dashboard`, `Sidebar.tsx`, 10 arquivos de features com `font-mono`, `BudgetDetailPage.tsx`, `EmissionStudentsTable.tsx`, `CoursesTable.tsx`, `AppDataTable.test.tsx`, `AppLineChart.tsx`, `AgendaPanel.tsx`, `EmissionPanel.tsx`, `certificatesApi.ts` + teste, `QuoteRow.tsx`, `FormSection.tsx` + teste, `docs/superpowers/backlog.md`, `pendencias/{abertas,encerradas,README}.md`, `.claude/rules/frontend-estilizacao.md`.

---

# Fase 0 — o ledger

### Task 1: a triagem nasce como ledger

**Files:**
- Create: `docs/superpowers/audits/2026-08-29-item19-triagem.md`

**Interfaces:**
- Produz: o arquivo que toda task seguinte atualiza na coluna **Prova** (substituindo `pendente — Task N` pela medida ou pelo teste).

- [ ] **Step 1: Escrever o ledger com os 49 vereditos preliminares da spec §4**

```markdown
# Triagem dos audits do item 18 — ledger (item 19)

**Fonte:** `2026-08-28-item18-fase{1,2,3,4}.md` (49 achados) · **Spec:** `specs/2026-08-29-frontend-triagem-dos-audits-do-item-18-design.md`
**Gabarito:** `adequado` · `corrigir` · `ficha` · `recusado` · `sem evidência` (spec §2). Linha com prova `pendente` no fechamento = bloco não fecha.

## Fase 1 — Comercial

| Id | Cl. | Veredito | Raiz | Remédio | Prova |
|---|---|---|---|---|---|
| A1–A6 | A | adequado | — | — (nota da A3: "Volver" em linha própria é desenho do `DetailHeader`, não achado) | — |
| UI-01 | B | corrigir | R1 | `ArchiveSwitch`: selecionado `outlined`, não selecionado `text` | pendente — Task 5 / run 5 |
| UI-02 | B | corrigir | sítio | `size="small"` no Rechazar | pendente — Task 14 / run 5 |
| UI-03 | B | corrigir | R2 | `identifierClass` no RUT do `BudgetDetailPage` | pendente — Task 9 / run 5 |
| UI-04 | B | recusado | — | costura decidida em `AppDialog/style.ts`; f4 A3 mediu coerente | `AppDialog/style.ts:6-11` |

## Fase 2 — Dashboard, Cursos, Perfil

| Id | Cl. | Veredito | Raiz | Remédio | Prova |
|---|---|---|---|---|---|
| UI-01 | A | adequado | — | — | — |
| UI-02 | B | ficha | — | D-63 | pendente — Task 16 |
| UI-03 | B | corrigir (semântica) + ficha | sítio | `FormSection as="h2"` no Perfil; grafia na D-63 | pendente — Task 14 / Task 16 |
| UI-04 | B | recusado | — | consome `sectionLabelClass` por template; `GRAFIA_LITERAL` verde; `h4` sob `h3` é aninhamento | `AgendaPanel.tsx:99`, `KpiRow.tsx:77` |
| UI-05 | B | corrigir | R2 | `technicalDataClass` no pill do `AppCard` e nas colunas numéricas de Cursos | pendente — Tasks 7/9 / run 5 |
| UI-06 | B | corrigir | R2 | as duas constantes nos 20 sítios | pendente — Tasks 8/9 |
| UI-07 | B | corrigir | R2 | `technicalDataClass` na versão da sidebar | pendente — Task 8 / run 5 |
| UI-08 | B | ficha | — | D-64 | pendente — Task 16 |
| UI-09 | B | corrigir | sítio | legenda com conteúdo próprio; paga P-63 | pendente — Task 12 / run 5 |
| UI-10 | C | corrigir | sítio | `min-w-0` na `<section>` da Agenda | pendente — Task 12 / run 5 |

## Fase 3 — Certificados

| Id | Cl. | Veredito | Raiz | Remédio | Prova |
|---|---|---|---|---|---|
| A1–A6 | A | adequado | — | — | — |
| UI-01 | B | ficha | — | D-65 | pendente — Task 16 |
| UI-02 | B | corrigir | R2 | `identifierClass` no RUT da Emisión | pendente — Task 9 / run 5 |
| UI-03 | B | corrigir | sítio | motivo do bloqueio na linha do CTA + `aria-describedby` | pendente — Task 13 / run 5 |
| UI-04 | B | recusado | — | opacidade de `disabled` é calibração por folha do Lara (`:292`); isento da 1.4.3 | `lara-light-lotus.css:292`, `lara-dark-lotus.css:292` |
| UI-05 | B | ficha | — | D-66 (+ P-67) | pendente — Task 16 |
| UI-06 | B | corrigir | R4 | `dataKey="enrollment_id"` na Emisión | pendente — Task 11 / run 5 |
| UI-07 | B | ficha | — | D-67 | pendente — Task 16 |
| UI-08 | B | corrigir | R1 | CTA `primary`, secundárias `text` nos 6 diálogos | pendente — Task 6 / run 5 |
| UI-09 | B | corrigir | sítio | `staleTime: 30_000` no painel (segundo observador do `useHistorial`) | pendente — Task 13 / run 5 |

## Fase 4 — Login, shell, CourseDialog

| Id | Cl. | Veredito | Raiz | Remédio | Prova |
|---|---|---|---|---|---|
| A1–A8 | A | adequado | — | — | — |
| UI-01 | C | corrigir | R1 | alvo do `AppSelectableCard` sem superfície própria | pendente — Task 4 / run 5 |
| UI-02 | B | corrigir | R3 | `invalid` pelo contexto | pendente — Task 2 / run 5 |
| UI-03 | B | corrigir | R3 | `CrudDialog` devolve o foco | pendente — Task 3 / run 5 |
| UI-04 | B | corrigir (pela raiz) | R1 | fecha com a UI-01 | pendente — run 5 (≥ 4,5:1) |
| UI-05 | B | ficha | — | D-68 | pendente — Task 16 |
| UI-06 | B | corrigir | sítio | auth consome `FormField` | pendente — Task 15 / run 5 |

## Run 5 — `2026-08-29-item19-run5.md`

*(preenchido na Task 17: os seis diálogos, `/validar` válido, veredito do `CertificateFolio`, remedições; achado novo entra aqui com o mesmo gabarito.)*
```

- [ ] **Step 2: Commit**

```bash
git add docs/superpowers/audits/2026-08-29-item19-triagem.md
git commit -m "docs(triagem): ledger dos 49 achados do item 18 com veredito preliminar"
```

---

# Fase 1 — R3: invalidez e foco no formulário

### Task 2: `invalid` chega ao controle pelo contexto (f4 UI-02)

**Files:**
- Modify: `frontend/src/shared/ui/FormField/fieldContext.ts:31-63`
- Test: `frontend/src/shared/ui/FormField/fieldAssociation.test.tsx`

**Interfaces:**
- Produz: `useFieldProps(idProp)` devolve também `invalid: true | undefined`; `useSplitFieldProps(idProp).control` idem. Os cinco wrappers (`AppInputText`, `AppTextarea`, `AppDropdown`, `AppPassword`, `AppDatePicker`) já fazem `{...fieldProps} {...props}` (ou `{...field.control} {...rest}`), então a prop do chamador continua vencendo — nenhum wrapper muda.

- [ ] **Step 1: Escrever o teste que falha** — acrescentar ao fim do `describe` de `fieldAssociation.test.tsx`, depois do `it.each(COM_CONTROLE)('o erro chega ao INPUT…')`:

```tsx
  /**
   * A TERCEIRA metade da associação, medida no CourseDialog em 422 (f4 UI-02 da
   * run de 2026-08-28): `aria-invalid` chegava, `.p-invalid` não. A prop
   * `invalid` do Prime é a única porta para a classe, e `useFieldProps` não a
   * devolvia — a invalidez existia para o leitor de tela e não para quem vê.
   * O Login escapava porque passa `invalid` na mão (P-37 com outra roupa).
   */
  it.each(COM_CONTROLE)('o erro PINTA o %s: `.p-invalid` chega ao controle', (_nome, controle) => {
    const { container } = render(
      <FormField label="Campo" error="Requerido">
        {controle}
      </FormField>,
    )
    expect(container.querySelector('.p-invalid')).not.toBeNull()
  })

  it('sem erro nenhum wrapper veste `.p-invalid`', () => {
    const { container } = render(<FormField label="Campo"><AppInputText /></FormField>)
    expect(container.querySelector('.p-invalid')).toBeNull()
  })
```

- [ ] **Step 2: Rodar e ver reprovar**

Run: `pnpm test src/shared/ui/FormField/fieldAssociation.test.tsx`
Expected: 5 reprovações em `o erro PINTA o …` (`expected null not to be null`).

- [ ] **Step 3: Implementar** — em `fieldContext.ts`, substituir `ariaProps`, `useFieldProps` e `useSplitFieldProps` por:

```ts
function ariaProps(field: FieldContextValue) {
  return {
    'aria-invalid': field.invalid || undefined,
    'aria-describedby': field.describedBy,
  }
}

/**
 * `invalid` é a única porta para `.p-invalid` no PrimeReact, e é prop do
 * COMPONENTE — no Calendar ela não viaja pelo `pt.input`, viaja com o
 * `inputId`. Sem ela a invalidez existia só para o leitor de tela (f4 UI-02,
 * run de 2026-08-28). `undefined` e não `false` para a prop do chamador
 * continuar vencendo pelo spread.
 */
function invalidProp(field: FieldContextValue) {
  return { invalid: field.invalid || undefined }
}

export function useFieldProps(idProp: 'id' | 'inputId') {
  const field = useContext(FieldContext)
  if (!field) return {}
  return { [idProp]: field.id, ...invalidProp(field), ...ariaProps(field) }
}

export function useSplitFieldProps(idProp: 'id' | 'inputId') {
  const field = useContext(FieldContext)
  if (!field) return { control: {}, input: {} }
  return { control: { [idProp]: field.id, ...invalidProp(field) }, input: ariaProps(field) }
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `pnpm test src/shared/ui/FormField`
Expected: todos verdes (inclusive `FormField.test.tsx`).

- [ ] **Step 5: Atualizar o ledger** — f4 UI-02, coluna Prova: `fieldAssociation.test.tsx` (5 wrappers, visto reprovar) · run 5.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/shared/ui/FormField/fieldContext.ts frontend/src/shared/ui/FormField/fieldAssociation.test.tsx docs/superpowers/audits/2026-08-29-item19-triagem.md
git commit -m "fix(a11y): invalid chega ao controle pelo contexto do FormField (f4 UI-02)"
```

### Task 3: `CrudDialog` devolve o foco após envio reprovado (f4 UI-03)

**Files:**
- Modify: `frontend/src/shared/ui/CrudDialog/CrudDialog.tsx`
- Create: `frontend/src/shared/ui/CrudDialog/CrudDialog.test.tsx`

**Interfaces:**
- Consome: `AppDialog` (já devolve o foco ao disparador no fechamento — não colide: aqui o diálogo continua aberto).
- Produz: nenhum contrato novo; comportamento: na descida de `pending` com o diálogo aberto, foco no primeiro `[aria-invalid="true"]` do corpo; se não houver e o foco tiver caído no `<body>`, no botão de salvar.

- [ ] **Step 1: Escrever o teste que falha**

```tsx
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import i18n from '@shared/config/i18n'
import { CrudDialog } from './CrudDialog'

beforeAll(async () => {
  await i18n.changeLanguage('es-CL')
})
afterEach(cleanup)

function Harness({ pending, invalido }: { pending: boolean; invalido: boolean }) {
  return (
    <CrudDialog visible mode="create" title="Curso" onHide={() => {}} onSubmit={() => {}} pending={pending}>
      <input aria-label="Nombre" aria-invalid={invalido || undefined} />
    </CrudDialog>
  )
}

/**
 * Medido no CourseDialog em 422 (f4 UI-03, run de 2026-08-28): o Prime
 * desabilita o botão de salvar enquanto `loading`, o navegador solta o foco
 * de um elemento `disabled` para o `<body>`, e quando o botão reabilita
 * ninguém o traz de volta. Quem opera por teclado recomeça o Tab do início do
 * documento sem saber o que houve.
 */
describe('CrudDialog — foco após envio reprovado', () => {
  it('leva o foco ao primeiro campo inválido quando `pending` cai', () => {
    const { rerender } = render(<Harness pending invalido />)
    ;(document.activeElement as HTMLElement | null)?.blur()
    expect(document.activeElement).toBe(document.body)

    rerender(<Harness pending={false} invalido />)

    expect(document.activeElement).toBe(screen.getByLabelText('Nombre'))
  })

  it('sem campo inválido, devolve o foco ao botão de salvar se ele caiu no body', () => {
    const { rerender } = render(<Harness pending invalido={false} />)
    ;(document.activeElement as HTMLElement | null)?.blur()

    rerender(<Harness pending={false} invalido={false} />)

    expect(document.activeElement).toBe(screen.getByRole('button', { name: /Guardar/ }))
  })
})
```

- [ ] **Step 2: Rodar e ver reprovar**

Run: `pnpm test src/shared/ui/CrudDialog`
Expected: 2 reprovações (`activeElement` é `<body>`).

- [ ] **Step 3: Implementar** — `CrudDialog.tsx` passa a:

```tsx
import { useEffect, useRef, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { AppDialog } from '../AppDialog'
import { AppButton } from '../AppButton'
import type { DialogMode } from '@shared/lib'

/**
 * Dialog unificado de cadastro: visualização, edição e criação são o mesmo
 * componente — no create os campos vêm vazios. Maximizable.
 *
 * Os botões vivem no footer, inclusive o "Editar" do modo view: o header fica
 * só com título e conteúdo contextual (`headerExtra`).
 *
 * **Foco após envio reprovado.** O botão de salvar recebe `loading={pending}`;
 * o Prime o desabilita, o navegador solta o foco de elemento `disabled` para o
 * `<body>`, e ao reabilitar ninguém o traz de volta (f4 UI-03, run de
 * 2026-08-28). Na descida de `pending` com o diálogo ainda aberto, o foco vai
 * ao primeiro `[aria-invalid="true"]` do corpo — o `FormField` marca cada um,
 * e o leitor de tela anuncia o `aria-describedby` dele —, e, sem campo
 * inválido, volta ao botão de salvar se tiver caído no `<body>`. Mora aqui
 * porque é este componente que conhece a borda de `pending`; ele não conhece
 * os erros, e não precisa: o DOM já os carrega.
 */
export function CrudDialog({
  visible, mode, title, onHide, onEdit, onSubmit, pending, disabled, closeBlocked, submitLabel, headerExtra, children,
}: {
  visible: boolean
  mode: DialogMode
  title: string
  onHide: () => void
  onEdit?: () => void
  onSubmit?: () => void
  pending?: boolean
  /** Desabilita o botão salvar sem mexer no loading (ex.: dependência externa
   * que ainda não carregou, como a lista de clientes do create de aluno). */
  disabled?: boolean
  /** Fecha as TRÊS saídas do diálogo (Cancelar/Fechar, X do header, ESC)
   * enquanto uma escrita em voo não pode ser abandonada — hoje, o upload da
   * foto bufferizada logo depois do `201` do create. Fechar nessa janela
   * descartaria a foto em silêncio: a entidade já existe, mas o arquivo nunca
   * chega, e o diálogo some antes de qualquer banner de erro.
   *
   * **Salvar é a QUARTA saída** e não é coberta por esta prop: o `onSubmit`
   * do chamador costuma fechar o diálogo no `onSuccess`. Quem usa
   * `closeBlocked` precisa gatear `disabled` pela mesma condição, senão a
   * perda silenciosa volta pela porta do Salvar. */
  closeBlocked?: boolean
  submitLabel?: string
  headerExtra?: ReactNode
  children: ReactNode
}) {
  const { t } = useTranslation()
  const corpo = useRef<HTMLDivElement>(null)
  const rodape = useRef<HTMLDivElement>(null)
  const estavaPendente = useRef(false)

  useEffect(() => {
    const caiu = estavaPendente.current && !pending
    estavaPendente.current = Boolean(pending)
    if (!caiu || !visible) return
    const invalido = corpo.current?.querySelector<HTMLElement>('[aria-invalid="true"]')
    if (invalido) {
      invalido.focus()
      return
    }
    if (document.activeElement === document.body) {
      rodape.current?.querySelector<HTMLElement>('button:last-of-type')?.focus()
    }
  }, [pending, visible])

  const header = (
    <div className="flex items-center gap-4 pr-6">
      <span>{title}</span>
      {headerExtra}
    </div>
  )

  const footer =
    mode === 'view' ? (
      <div ref={rodape} className="flex justify-end gap-2">
        <AppButton label={t('common.close')} text disabled={closeBlocked} onClick={onHide} />
        {onEdit && <AppButton variant="primary" label={t('common.edit')} icon="pi pi-pencil" onClick={onEdit} />}
      </div>
    ) : (
      <div ref={rodape} className="flex justify-end gap-2">
        <AppButton label={t('common.cancel')} text disabled={closeBlocked} onClick={onHide} />
        <AppButton
          variant="primary"
          label={submitLabel ?? t('common.save')}
          icon="pi pi-check"
          loading={pending}
          disabled={disabled}
          onClick={onSubmit}
        />
      </div>
    )

  return (
    <AppDialog
      header={header}
      visible={visible}
      onHide={onHide}
      closable={!closeBlocked}
      closeOnEscape={!closeBlocked}
      footer={footer}
    >
      <div ref={corpo}>{children}</div>
    </AppDialog>
  )
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `pnpm test src/shared/ui/CrudDialog src/shared/ui/AppDialog`
Expected: verdes. Se o rótulo de salvar em `es-CL` não for "Guardar", ajuste o regex do teste ao valor de `common.save` em `src/shared/config/locales/es-CL.json`.

- [ ] **Step 5: Ledger** — f4 UI-03: `CrudDialog.test.tsx` (visto reprovar) · run 5.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/shared/ui/CrudDialog/ docs/superpowers/audits/2026-08-29-item19-triagem.md
git commit -m "fix(a11y): CrudDialog devolve o foco ao campo invalido apos 422 (f4 UI-03)"
```

---

# Fase 2 — R1: botão sem papel

### Task 4: o alvo do `AppSelectableCard` deixa de vestir superfície (f4 UI-01, o C)

**Files:**
- Modify: `frontend/src/shared/ui/AppSelectableCard/AppSelectableCard.tsx:60-72`
- Create: `frontend/src/shared/ui/AppSelectableCard/AppSelectableCard.test.tsx`

**Interfaces:**
- Produz: o `<button>` interno sai `text` (fundo e borda transparentes pelo tema), com fundo e hover zerados por classe e tinta de corpo. Padding do `.p-button` **fica** — é o que preserva a geometria medida (alvo de 442px em card de 468px).

- [ ] **Step 1: Teste que falha**

```tsx
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { AppSelectableCard } from './AppSelectableCard'

afterEach(cleanup)

/**
 * O C da fase 4 (run de 2026-08-28): o `<div>` externo calcula o fundo do
 * estado selecionado (`color-mix` com `--surface-card`) e o `<button>` interno,
 * `AppButton` sem papel, vestia o `.p-button` preenchido do Lara — 94% do card
 * em celeste nos DOIS estados e nos dois temas. Sete cards de redator liam
 * todos como "ligado". Quem pinta é a moldura; o alvo é só área de clique e
 * anel de foco.
 */
describe('AppSelectableCard', () => {
  it('o alvo clicável não veste superfície própria', () => {
    render(<AppSelectableCard selected onToggle={() => {}}>Juan Morales</AppSelectableCard>)

    const alvo = screen.getByRole('button', { pressed: true })
    expect(alvo.className).toContain('p-button-text')
    expect(alvo.className).toContain('bg-transparent!')
    expect(alvo.className).toContain('text-[var(--text-color)]')
  })

  it('sem `onToggle` é leitura: nenhum botão', () => {
    render(<AppSelectableCard>Juan Morales</AppSelectableCard>)
    expect(screen.queryByRole('button')).toBeNull()
  })
})
```

- [ ] **Step 2: Rodar e ver reprovar** — `pnpm test src/shared/ui/AppSelectableCard` → 1 reprovação (`p-button-text` ausente).

- [ ] **Step 3: Implementar** — o `AppButton` interno passa a:

```tsx
        <AppButton
          type="button"
          text
          aria-pressed={selected}
          disabled={disabled}
          onClick={onToggle}
          /* `text` tira fundo e borda pelo tema; o hover do `.p-button-text` e
           * a tinta de marca dele saem por classe — quem pinta hover e estado é
           * o `<div>` externo, que já sabe o `selected`. O padding do `.p-button`
           * FICA: é a geometria medida do alvo (442px em 468px de card). */
          className="flex min-w-0 flex-1 items-center gap-3 bg-transparent! text-left text-[var(--text-color)] hover:bg-transparent! hover:text-[var(--text-color)] disabled:opacity-60"
        >
```

E no docblock do componente, depois de "estilo inline tem precedência sobre qualquer classe.", acrescentar:

```
 *
 * O alvo interno é `text` e sem superfície própria: `AppButton` sem papel caía
 * no `.p-button` preenchido do Lara e cobria o fundo que este componente
 * acabava de calcular — selecionado e não selecionado idênticos, medido nos
 * dois temas (C da fase 4, run de 2026-08-28).
```

- [ ] **Step 4: Rodar e ver passar** — `pnpm test src/shared/ui/AppSelectableCard` → verde; `pnpm lint` → 0.

- [ ] **Step 5: Ledger** — f4 UI-01 e UI-04: teste (visto reprovar) · run 5 (medida nos dois temas).

- [ ] **Step 6: Commit**

```bash
git add frontend/src/shared/ui/AppSelectableCard/ docs/superpowers/audits/2026-08-29-item19-triagem.md
git commit -m "fix(ui): alvo do AppSelectableCard sem superficie propria; a moldura pinta o estado (f4 UI-01)"
```

### Task 5: `ArchiveSwitch` deixa de disputar com a CTA (f1 UI-01)

**Files:**
- Modify: `frontend/src/shared/ui/ArchiveSwitch/ArchiveSwitch.tsx:18-33`
- Test: `frontend/src/shared/ui/ArchiveSwitch/ArchiveSwitch.test.tsx`

- [ ] **Step 1: Teste que falha** — acrescentar ao `describe`:

```tsx
  /**
   * f1 UI-01 (run de 2026-08-28): o lado selecionado era `AppButton` sem papel,
   * isto é, o `.p-button` preenchido do Lara — a MESMA tinta da CTA no escuro e
   * mais preenchido que ela no claro. Filtro não disputa com ação primária:
   * selecionado é contorno, não selecionado é texto, e o único de marca na
   * barra segue sendo a CTA.
   */
  it('o modo corrente é contornado e o outro é texto — nenhum preenchido', () => {
    render(<ArchiveSwitch value="active" onChange={() => {}} />)

    const ativos = screen.getByRole('button', { name: /^(archive\.active|Activos|Ativos|Active)$/i })
    const arquivados = screen.getByRole('button', { name: /^(archive\.archived|Archivados|Arquivados|Archived)$/i })
    expect(ativos.className).toContain('p-button-outlined')
    expect(ativos.className).not.toContain('p-button-text')
    expect(arquivados.className).toContain('p-button-text')
  })
```

- [ ] **Step 2: Ver reprovar** — `pnpm test src/shared/ui/ArchiveSwitch` → 1 reprovação.

- [ ] **Step 3: Implementar**

```tsx
    <div className="inline-flex gap-1" role="group">
      {/* Selecionado `outlined`, o outro `text`: sem papel o lado corrente caía
        * no `.p-button` preenchido do Lara e disputava com a CTA da mesma barra
        * (f1 UI-01, run de 2026-08-28). A tinta é `--brand-ink` no claro (5,3:1)
        * e celeste no escuro, pelo tema. */}
      <AppButton
        label={t('archive.active')}
        size="small"
        outlined={value === 'active'}
        text={value !== 'active'}
        onClick={() => value !== 'active' && onChange('active')}
      />
      <AppButton
        label={t('archive.archived')}
        icon="pi pi-inbox"
        size="small"
        outlined={value === 'archived'}
        text={value !== 'archived'}
        onClick={() => value !== 'archived' && onChange('archived')}
      />
    </div>
```

- [ ] **Step 4: Ver passar** — `pnpm test src/shared/ui/ArchiveSwitch` → verde.

- [ ] **Step 5: Ledger + commit**

```bash
git add frontend/src/shared/ui/ArchiveSwitch/ docs/superpowers/audits/2026-08-29-item19-triagem.md
git commit -m "fix(ui): ArchiveSwitch selecionado e contorno, nao preenchido (f1 UI-01)"
```

### Task 6: os 13 sítios sem papel e a catraca `BOTAO_SEM_PAPEL` (f3 UI-08, D2, D3, D4)

**Files:**
- Modify: `frontend/src/features/certification/components/Emission/ConfirmIssueDialog.tsx:42-43`, `BatchIssueDialog.tsx:25,29-30`, `IssuedDialog.tsx:45,47`, `frontend/src/features/certification/components/Historial/CertificateViewDialog.tsx:37,39`, `ReissueDialog.tsx:60`, `RevokeDialog.tsx:33`
- Modify: `frontend/src/features/identity/components/Login/LoginForm.tsx:102`, `ForgotForm.tsx:80`, `frontend/src/features/identity/components/Password/SetPasswordPage.tsx:28,39,96`
- Modify: `frontend/src/features/identity/components/Profile/ProfilePersonalSection.tsx:71`, `ProfileSecuritySection.tsx:111`
- Modify: `frontend/eslint.config.js` (const nova + os quatro arrays em `:415`, `:428`, `:449`, `:653`)

**Interfaces:**
- Produz: a régua `BOTAO_SEM_PAPEL`; vocabulário: CTA de diálogo/página = `variant="primary"`; Cancelar/Cerrar = `text`; destrutiva = `severity`.

- [ ] **Step 1: Escrever a catraca DESLIGADA e medir** — em `eslint.config.js`, logo após `DROPDOWN_SEM_NOME`:

```js
// Item 19 (R1): `AppButton` sem papel cai no `.p-button` preenchido do Lara —
// celeste com rótulo navy —, que NÃO é papel deste produto: a ação primária é
// o contorno de marca (`variant="primary"`), a secundária é `text`, a
// destrutiva passa `severity`. Foi assim que os seis diálogos de certificação
// (CTA cru), o alvo do `AppSelectableCard` (card de redator selecionado
// idêntico ao não selecionado — o C da fase 4) e o `ArchiveSwitch` (filtro
// disputando com a CTA) escaparam da varredura do item 18. Medido com o próprio
// seletor antes de valer: 13 sítios, classificados na Task 6 do plano de
// 2026-08-29. `rounded` sozinho não é papel — sem `text` o botão segue
// preenchido.
const BOTAO_SEM_PAPEL = {
  selector:
    'JSXOpeningElement[name.name="AppButton"]' +
    ':not(:has(> JSXAttribute[name.name=/^(variant|text|outlined|link|severity)$/]))',
  message:
    'AppButton sem papel cai no preenchido cru do Lara: passe variant="primary" (ação primária), text (secundária), outlined, link ou severity (destrutiva) — .claude/rules/frontend-estilizacao.md §Botão.',
}
```

Acrescentar `BOTAO_SEM_PAPEL,` logo após `DROPDOWN_SEM_NOME,` nos quatro arrays. Rodar `pnpm lint` e conferir que a lista de erros é **exatamente** os 13 sítios abaixo (mais nenhum). Lista diferente → parar e registrar no ledger antes de seguir.

- [ ] **Step 2: Classificar os 13** — uma edição por linha:

| Arquivo:linha | Hoje | Passa a |
|---|---|---|
| `ConfirmIssueDialog.tsx:42` | `outlined` (Cancelar) | `text` |
| `ConfirmIssueDialog.tsx:43` | CTA "Confirmar emisión" sem papel | `variant="primary"` |
| `BatchIssueDialog.tsx:25` | Cerrar sem papel | `text` |
| `BatchIssueDialog.tsx:29` | `outlined` (Cancelar) | `text` |
| `BatchIssueDialog.tsx:30` | CTA "Confirmar emisión" | `variant="primary"` |
| `IssuedDialog.tsx:45` | `outlined` (Cerrar) | `text` |
| `IssuedDialog.tsx:47` | CTA "Descargar PDF" | `variant="primary"` |
| `CertificateViewDialog.tsx:37` | `outlined` (Cerrar) | `text` |
| `CertificateViewDialog.tsx:39` | CTA "Descargar PDF" | `variant="primary"` |
| `ReissueDialog.tsx:60` | Cerrar sem papel | `text` |
| `RevokeDialog.tsx:33` | `outlined` (Cancelar) | `text` (o CTA já é `severity="danger"`) |
| `LoginForm.tsx:102` | submit sem papel | `variant="primary"` (D3) |
| `ForgotForm.tsx:80` | submit sem papel | `variant="primary"` (D3) |
| `SetPasswordPage.tsx:28,39,96` | três ações sem papel | `variant="primary"` (D3) |
| `ProfilePersonalSection.tsx:71` | "Guardar" sem papel | `variant="primary"` |
| `ProfileSecuritySection.tsx:111` | "Cambiar contraseña" sem papel | `variant="primary"` |

Exemplo (ConfirmIssueDialog):

```tsx
      <AppButton label={t('common.cancel')} text disabled={issue.isPending} onClick={onHide} />
      <AppButton
        variant="primary"
        label={t('certificate.confirmEmit')}
```

- [ ] **Step 3: Lint verde e sonda negativa**

Run: `pnpm lint` → 0 erros. Sonda: remover `variant="primary"` de `ConfirmIssueDialog.tsx:43`, rodar `pnpm lint`, ver o erro nomear `ConfirmIssueDialog.tsx`; devolver. Repetir tirando o `variant` do `PeriodFilter`-vizinho de `app/`: remover o `variant="iconToggle"` de `src/app/layouts/Header/AppearanceControls.tsx:26`, ver reprovar (é a prova de que a camada `app/` está coberta); devolver.

- [ ] **Step 4: Testes e build** — `pnpm test` verde; `pnpm build` verde.

- [ ] **Step 5: Ledger** — f3 UI-08: catraca vista reprovar (2 sondas) · run 5.

- [ ] **Step 6: Commit**

```bash
git add frontend/eslint.config.js frontend/src/features/certification frontend/src/features/identity docs/superpowers/audits/2026-08-29-item19-triagem.md
git commit -m "feat(lint): BOTAO_SEM_PAPEL nas duas camadas; 13 sitios ganham papel (f3 UI-08)"
```

---

# Fase 3 — R2: dado técnico com peça

### Task 7: as duas constantes, travadas, e os sítios de `shared/ui`

**Files:**
- Modify: `frontend/src/shared/ui/typography.ts` (fim do arquivo), `typography.test.ts`
- Modify: `frontend/src/shared/ui/AppFileRow/AppFileRow.tsx:95`, `frontend/src/shared/ui/CertificateFolio/CertificateFolio.tsx:34-37`, `frontend/src/shared/ui/AppCard/AppCard.tsx:154`

**Interfaces:**
- Produz: `technicalDataClass: string` (`'font-mono tabular-nums'`) e `identifierClass: string` (`'font-mono tabular-nums whitespace-nowrap'`), exportadas por `@shared/ui` (o barrel já faz `export * from './typography'`).

- [ ] **Step 1: Teste que falha** — acrescentar a `typography.test.ts` (importando as duas constantes):

```ts
  /** Dado técnico é mono COM tabular — o par é inseparável, e a fase 2 mediu
   * sete sítios com metade do par (`font-mono` sozinho). A constante é o que
   * impede a próxima cópia de perder a metade. */
  it('dado técnico carrega o par mono + tabular', () => {
    expect(technicalDataClass).toBe('font-mono tabular-nums')
  })

  /** Identificador é token único: RUT, folio e código não quebram no hífen —
   * a fase 1 mediu "76.123.456-" / "0" a 1024px. */
  it('identificador é dado técnico que não quebra', () => {
    expect(identifierClass).toBe('font-mono tabular-nums whitespace-nowrap')
  })
```

- [ ] **Step 2: Ver reprovar** — `pnpm test src/shared/ui/typography.test.ts` → falha de import/`undefined`.

- [ ] **Step 3: Implementar** — fim de `typography.ts`:

```ts
/**
 * Dado técnico — contagem que alinha em coluna, data, versão. `font-mono` sem
 * `tabular-nums` é o que a fase 2 do item 18 mediu em sete sítios: em IBM Plex
 * Mono a diferença não aparece enquanto a fonte carrega, e a declaração é a
 * garantia contra o fallback. O par é inseparável, e por isso é uma constante.
 * Mecanismo: `MONO_LITERAL` em `frontend/eslint.config.js`.
 */
export const technicalDataClass = 'font-mono tabular-nums'

/**
 * Identificador — RUT, folio, código: dado técnico que é TOKEN ÚNICO e não
 * quebra. O hífen do dígito verificador é oportunidade de quebra para o
 * navegador: a fase 1 mediu "76.123.456-" / "0" no cabeçalho do presupuesto a
 * 1024px. Identificador partido é copiado errado e conferido errado.
 */
export const identifierClass = `${technicalDataClass} whitespace-nowrap`
```

- [ ] **Step 4: Os três sítios de `shared/ui` consomem**

`AppFileRow.tsx:95` — `import { technicalDataClass } from '../typography'`:
```tsx
          <p className={`${technicalDataClass} text-xs`} style={{ color: 'var(--text-color-secondary)' }}>{meta}</p>
```

`CertificateFolio.tsx:34-37` — importar `technicalDataClass` junto de `fieldLabelClass`:
```tsx
  const grafia =
    size === 'page'
      ? `${technicalDataClass} text-3xl tracking-[0.15em]`
      : `${technicalDataClass} text-xl tracking-[0.1em]`
```

`AppCard.tsx:154` (pill de contagem; f2 UI-05) — `import { technicalDataClass } from '../typography'`:
```tsx
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${technicalDataClass}`}
            style={{ background: 'var(--surface-section)', color: 'var(--text-color-secondary)' }}
          >
```

- [ ] **Step 5: Ver passar** — `pnpm test src/shared/ui` → verde; `pnpm lint` → 0.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/shared/ui/typography.ts frontend/src/shared/ui/typography.test.ts frontend/src/shared/ui/AppFileRow/AppFileRow.tsx frontend/src/shared/ui/CertificateFolio/CertificateFolio.tsx frontend/src/shared/ui/AppCard/AppCard.tsx
git commit -m "feat(ui): technicalDataClass e identifierClass — o par mono + tabular vira constante"
```

### Task 8: `app/` consome as constantes (f2 UI-06, UI-07)

**Files:**
- Modify: `frontend/src/app/pages/Dashboard/AgendaPanel.tsx:68,108`, `DashboardItemRow.tsx:72`, `KpiRow.tsx:109`, `admin/CompliancePanel.tsx:64`, `admin/PipelineFunnel.tsx:69`, `admin/RedatorLoadPanel.tsx:13`, `redator/PendenciasList.tsx:79`, `frontend/src/app/layouts/Sidebar/Sidebar.tsx:71`

- [ ] **Step 1: Trocar cada `className`** (importar `technicalDataClass` de `@shared/ui` em cada arquivo — `AgendaPanel` e `KpiRow` já importam `sectionLabelClass` de lá):

| Arquivo:linha | De | Para |
|---|---|---|
| `AgendaPanel.tsx:68` | `"shrink-0 font-mono text-xs"` | `` {`shrink-0 ${technicalDataClass} text-xs`} `` |
| `AgendaPanel.tsx:108` | `"font-mono font-normal tabular-nums"` | `` {`${technicalDataClass} font-normal`} `` |
| `DashboardItemRow.tsx:72` | `"order-2 ml-auto shrink-0 font-mono text-xs sm:order-0 sm:ml-0"` | `` {`order-2 ml-auto shrink-0 ${technicalDataClass} text-xs sm:order-0 sm:ml-0`} `` |
| `KpiRow.tsx:109` | `"font-mono text-xs tabular-nums"` | `` {`${technicalDataClass} text-xs`} `` |
| `CompliancePanel.tsx:64` | `"font-mono text-xs whitespace-nowrap"` | `` {`${technicalDataClass} text-xs whitespace-nowrap`} `` |
| `PipelineFunnel.tsx:69` | `"w-8 shrink-0 text-right font-mono text-sm tabular-nums"` | `` {`w-8 shrink-0 text-right ${technicalDataClass} text-sm`} `` |
| `RedatorLoadPanel.tsx:13` | `"font-mono tabular-nums"` | `{technicalDataClass}` |
| `PendenciasList.tsx:79` | `"shrink-0 font-mono text-xs"` | `` {`shrink-0 ${technicalDataClass} text-xs`} `` |
| `Sidebar.tsx:71` | `"px-4 py-3 text-sm text-(--shell-ink-muted) text-center"` | `` {`px-4 py-3 ${technicalDataClass} text-sm text-(--shell-ink-muted) text-center`} `` |

- [ ] **Step 2: Provar** — `pnpm lint` 0 (a régua de 150 linhas de `app/` continua valendo: nenhum arquivo cresce mais de uma linha de import); `pnpm test` verde; `pnpm build` verde. `grep -rn "font-mono" src/app` deve devolver **zero** linhas.

- [ ] **Step 3: Ledger** — f2 UI-06 (parte `app/`) e UI-07: grep zero · run 5 (versão em mono medida).

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app docs/superpowers/audits/2026-08-29-item19-triagem.md
git commit -m "refactor(app): dado tecnico consome technicalDataClass; versao da sidebar em mono (f2 UI-06/07)"
```

### Task 9: as features consomem as constantes (f1 UI-03, f2 UI-05/06, f3 UI-02)

**Files:**
- Modify: `frontend/src/features/catalog/components/Course/RedatorCard.tsx:41`, `CoursesTable.tsx:82,89`
- Modify: `frontend/src/features/identity/components/Student/StudentsTable.tsx:52`, `StudentCertificateCell.tsx:51`, `Redator/RedatoresTable.tsx:81`, `Profile/ProfileIdentityCard.tsx:76`, `Profile/ProfilePersonalSection.tsx:62`, `Profile/ProfileDocumentSlotHeader.tsx:55`, `Login/LoginPage.tsx:38,48`
- Modify: `frontend/src/features/certification/components/Historial/HistorialTable.tsx:43,66`, `Emission/EmissionStudentsTable.tsx:48`
- Modify: `frontend/src/features/commercial/components/Budget/BudgetDetailPage.tsx:66-70`

- [ ] **Step 1: Trocar cada sítio** (importar `technicalDataClass`/`identifierClass` de `@shared/ui`):

| Arquivo:linha | Papel | Para |
|---|---|---|
| `RedatorCard.tsx:41` | RUT | `description={<span className={identifierClass}>{redator.rut}</span>}` |
| `StudentsTable.tsx:52` | RUT | `` <span className={`${identifierClass} text-sm`}>{s.rut}</span> `` |
| `RedatoresTable.tsx:81` | RUT | `` <span className={`${identifierClass} text-sm`}>{r.rut}</span> `` |
| `StudentCertificateCell.tsx:51` | código | `` <span className={`${identifierClass} text-sm`}>{certificate.codigo}</span> `` |
| `ProfileIdentityCard.tsx:76` | RUT | `<span className={identifierClass}>{profile.rut}</span>` |
| `ProfilePersonalSection.tsx:62` | telefone (input) | `` className={`w-full ${technicalDataClass}`} `` |
| `ProfileDocumentSlotHeader.tsx:55` | dado | `` className={`${technicalDataClass} text-sm`} `` |
| `LoginPage.tsx:38` | legenda de setor | `` className={`my-0 text-center ${technicalDataClass} text-xs uppercase tracking-[0.14em]`} `` |
| `LoginPage.tsx:48` | versão | `` className={`mt-2 ${technicalDataClass} text-[13px] md:absolute md:bottom-4 md:mt-0`} `` |
| `HistorialTable.tsx:43` | código | `` <span className={`${identifierClass} text-sm`}>{c.codigo}</span> `` |
| `HistorialTable.tsx:66` | RUT | `<span className={identifierClass}>{c.snapshot.aluno.rut}</span>` |
| `EmissionStudentsTable.tsx:48` | RUT (f3 UI-02) | `description={<span className={identifierClass}>{e.student_rut}</span>}` |
| `CoursesTable.tsx:82` | contagem (f2 UI-05) | `` <span className={`${technicalDataClass} font-semibold`}>{c.workload_hours}</span> `` |
| `CoursesTable.tsx:89` | contagem | `` <span className={`${technicalDataClass} font-semibold`}>{c.redator_ids.length}</span> `` |

`BudgetDetailPage.tsx:66-70` (f1 UI-03):
```tsx
          <IdentityCell
            inline
            title={d.client?.legal_name ?? '—'}
            /* RUT é identificador: mono, tabular e sem quebra — a 1024px o
             * navegador partia "76.123.456-" / "0" no hífen verificador (f1
             * UI-03, run de 2026-08-28). */
            description={d.client?.rut ? <span className={identifierClass}>RUT {d.client.rut}</span> : undefined}
            image={d.client?.photo_url}
            size="normal"
          />
```

Ajustar o comentário de `ProfileIdentityCard.tsx:68-70` para citar a constante em vez de "o token que StudentsTable… usam".

- [ ] **Step 2: Provar** — `pnpm lint` 0; `pnpm test` verde; `pnpm build` verde. `grep -rn "font-mono" src/features` → **zero**. Arquivo que cruzar 150 linhas por causa do import: extrair nada — o import cabe na linha existente de `@shared/ui`.

- [ ] **Step 3: Ledger** — f1 UI-03, f2 UI-05/06, f3 UI-02: grep zero · run 5 (RUT do presupuesto inteiro a 1024; RUT da Emisión em mono; contagens de Cursos em mono).

- [ ] **Step 4: Commit**

```bash
git add frontend/src/features docs/superpowers/audits/2026-08-29-item19-triagem.md
git commit -m "refactor(features): RUT, folio, codigo e contagem consomem as constantes de dado tecnico (f1 UI-03, f2 UI-05/06, f3 UI-02)"
```

### Task 10: a catraca `MONO_LITERAL`

**Files:**
- Modify: `frontend/eslint.config.js` (const nova após `GRAFIA_LITERAL`; os quatro arrays)

- [ ] **Step 1: Escrever a régua**

```js
// Item 19 (R2): `font-mono` escrito literal no sítio é a metade de um par — a
// fase 2 do item 18 mediu sete sítios com `font-mono` SEM `tabular-nums`, e a
// fase 1 um RUT partido no hífen por viajar como prosa. A rule mandava o par e
// não tinha mecanismo. `technicalDataClass` e `identifierClass` em
// `shared/ui/typography.ts` são a única grafia; `shared/ui` fica de fora porque
// é onde ela é DEFINIDA. Medido com o próprio seletor antes de valer: 20 sítios,
// zerados nas Tasks 8 e 9 do plano de 2026-08-29.
const MSG_MONO_LITERAL =
  'Dado técnico com font-mono literal: importe technicalDataClass (contagem, data, versão) ou identifierClass (RUT, folio, código — não quebra) de @shared/ui. ' +
  'O par font-mono + tabular-nums é inseparável (.claude/rules/frontend-estilizacao.md §Dado técnico).'
const MONO_LITERAL = [
  { selector: 'JSXAttribute[name.name="className"] Literal[value=/font-mono/]', message: MSG_MONO_LITERAL },
  { selector: 'JSXAttribute[name.name="className"] TemplateElement[value.raw=/font-mono/]', message: MSG_MONO_LITERAL },
  { selector: 'Property[key.name="className"] Literal[value=/font-mono/]', message: MSG_MONO_LITERAL },
  { selector: 'Property[key.name="className"] TemplateElement[value.raw=/font-mono/]', message: MSG_MONO_LITERAL },
]
```

Acrescentar `...MONO_LITERAL` logo após `...GRAFIA_LITERAL` nos quatro arrays.

- [ ] **Step 2: Nasce verde e morde** — `pnpm lint` → 0. Sonda: em `RedatorCard.tsx:41` trocar `identifierClass` por `"font-mono"`, rodar, ver reprovar nomeando o arquivo; devolver. Sonda em `app/`: `KpiRow.tsx:109` com `` `font-mono text-xs` ``, ver reprovar; devolver.

- [ ] **Step 3: Ledger** — R2: catraca vista reprovar (2 sondas).

- [ ] **Step 4: Commit**

```bash
git add frontend/eslint.config.js docs/superpowers/audits/2026-08-29-item19-triagem.md
git commit -m "feat(lint): MONO_LITERAL — font-mono so pela constante, nas duas camadas"
```

---

# Fase 4 — R4 e singletons

### Task 11: a Emisión declara a própria chave de linha (f3 UI-06)

**Files:**
- Modify: `frontend/src/features/certification/components/Emission/EmissionStudentsTable.tsx:36`
- Modify: `frontend/src/shared/ui/AppDataTable/AppDataTable.tsx:106` (só o comentário)
- Test: `frontend/src/shared/ui/AppDataTable/AppDataTable.test.tsx`

**Interfaces:**
- Consome: `AppDataTable` já repassa `dataKey` do chamador (`{...props}` depois do default `dataKey="id"`, `AppDataTable.tsx:143`).

- [ ] **Step 1: Teste que falha** — acrescentar ao fim do `describe` de `AppDataTable.test.tsx` (importar `vi` do vitest):

```tsx
  /**
   * `dataKey="id"` é o default do wrapper, e o DTO das linhas de emissão expõe
   * `enrollment_id`: cada linha resolvia a chave para `undefined` e o React
   * acusava `Each child in a list should have a unique "key" prop` no console,
   * de forma determinística, numa tabela cujas linhas carregam ação de
   * documento com peso legal (f3 UI-06, run de 2026-08-28). A prop do
   * chamador vence o default — e este teste é o que garante que continue.
   */
  it('a linha sem `id` declara a própria chave e o console fica limpo', () => {
    const erro = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(
      <AppDataTable value={[{ enrollment_id: 7 }, { enrollment_id: 8 }]} dataKey="enrollment_id">
        <AppColumn field="enrollment_id" header="id" />
      </AppDataTable>,
    )
    expect(erro.mock.calls.flat().join(' ')).not.toContain('unique "key" prop')
    erro.mockRestore()
  })
```

- [ ] **Step 2: Ver o teste morder** — antes de passar, trocar temporariamente `dataKey="enrollment_id"` por nada no teste e rodar `pnpm test src/shared/ui/AppDataTable/AppDataTable.test.tsx`: tem de **reprovar** com o aviso de `key` no console capturado. Devolver o `dataKey`; agora passa (o wrapper já repassa a prop).

- [ ] **Step 3: O sítio declara** — `EmissionStudentsTable.tsx`, no `<AppDataTable`:

```tsx
    <AppDataTable
      /* O DTO desta tabela não tem `id`: a chave é `enrollment_id`. Com o
       * default do wrapper, cada linha resolvia a chave para `undefined` e o
       * React acusava no console (f3 UI-06, run de 2026-08-28). */
      dataKey="enrollment_id"
      value={table.rows}
```

Em `AppDataTable.tsx:106`, acima de `dataKey="id"`:
```tsx
      // Default, não lei: o chamador cuja linha não tem `id` passa o seu
      // (`EmissionStudentsTable`, `enrollment_id`) — o spread abaixo vence.
```

- [ ] **Step 4: Auditar as demais tabelas** — `grep -rn "value={" src/features src/app --include=*Table.tsx` e conferir no `generated.ts` que o tipo de linha de cada uma tem `id` (medido na escrita do plano: `ClientData`, `StudentData`, `RedatorData`, `CourseData`, `TurmaData`, `BudgetData`, `EnrollmentData`, `CertificateData`, `RoleData` têm; só `EmissionPanelEnrollmentData` não). Registrar o resultado no ledger.

- [ ] **Step 5: `pnpm test` e `pnpm lint` verdes. Ledger + commit**

```bash
git add frontend/src/features/certification/components/Emission/EmissionStudentsTable.tsx frontend/src/shared/ui/AppDataTable/ docs/superpowers/audits/2026-08-29-item19-triagem.md
git commit -m "fix(ui): a tabela de emissao declara enrollment_id como chave de linha (f3 UI-06)"
```

### Task 12: Dashboard — a Agenda cabe a 390 e a legenda lê (f2 UI-10, UI-09; paga a P-63)

**Files:**
- Modify: `frontend/src/app/pages/Dashboard/AgendaPanel.tsx:97`
- Create: `frontend/src/shared/ui/AppLineChart/legend.tsx`, `legend.test.tsx`
- Modify: `frontend/src/shared/ui/AppLineChart/AppLineChart.tsx:1,82`

**Interfaces:**
- Produz: `ChartLegend({ payload })` — `payload?: ReadonlyArray<LegendPayload>` do Recharts; renderiza `<ul role="list">`.

- [ ] **Step 1: Teste da legenda que falha**

```tsx
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { ChartLegend } from './legend'

afterEach(cleanup)

/**
 * f2 UI-09 (run de 2026-08-28): o Recharts pinta o TEXTO da legenda com a tinta
 * da série, e no tema claro as cinco medem 3,41–4,47:1 a 12px — abaixo de AA.
 * A rampa foi calibrada para traço (3:1), não para texto. Aqui o texto sai na
 * tinta secundária e só o marcador carrega a série. E a lista ganha
 * `role="list"`, que o mini-reset da P-46 tira do `ul` de terceiro — era a
 * P-63, aberta desde 2026-08-27 esperando um bloco que tocasse gráfico.
 */
describe('ChartLegend', () => {
  it('é uma lista com semântica e o texto não herda a tinta da série', () => {
    render(<ChartLegend payload={[{ value: 'Matrículas', color: 'var(--surface-border)' }]} />)

    const lista = screen.getByRole('list')
    expect(lista.tagName).toBe('UL')
    expect(lista.getAttribute('style')).toContain('var(--text-color-secondary)')
    expect(screen.getByText('Matrículas')).toBeTruthy()
    const marcador = lista.querySelector('[aria-hidden="true"]') as HTMLElement
    expect(marcador.getAttribute('style')).toContain('var(--surface-border)')
  })

  it('sem séries não renderiza nada', () => {
    const { container } = render(<ChartLegend payload={[]} />)
    expect(container.firstChild).toBeNull()
  })
})
```

- [ ] **Step 2: Ver reprovar** — `pnpm test src/shared/ui/AppLineChart/legend.test.tsx` → módulo inexistente.

- [ ] **Step 3: Implementar `legend.tsx`**

```tsx
import type { LegendPayload } from 'recharts'

/**
 * Conteúdo próprio da legenda. O default do Recharts pinta o texto com a cor
 * da série, e a rampa `--chart-*` foi calibrada para TRAÇO (3:1), não para
 * texto de 12px: no claro as cinco ficavam entre 3,41 e 4,47:1 (f2 UI-09, run
 * de 2026-08-28). Aqui o texto sai na tinta secundária e o marcador carrega a
 * série. A cor do marcador vem do `payload` — é o `stroke` que o `AppLineChart`
 * já resolve por índice em `chartInks`; este arquivo não nomeia token nenhum
 * (D11, `tests/chart-tokens.test.ts`).
 *
 * `role="list"`: o mini-reset da P-46 zera `list-style` em todo `ul` e o
 * WebKit tira a semântica junto; a régua de lint só alcança JSX nosso, e a
 * legenda do Recharts era a lista de terceiro que ficava de fora (P-63).
 */
export function ChartLegend({ payload }: { payload?: ReadonlyArray<LegendPayload> }) {
  if (!payload?.length) return null
  return (
    <ul
      role="list"
      className="flex flex-wrap justify-center gap-x-4 gap-y-1 pt-2 text-xs"
      style={{ color: 'var(--text-color-secondary)' }}
    >
      {payload.map((item) => (
        <li key={String(item.value)} className="flex items-center gap-1.5">
          <span aria-hidden="true" className="inline-block h-0.5 w-3.5 rounded-full" style={{ background: item.color }} />
          {item.value}
        </li>
      ))}
    </ul>
  )
}
```

`AppLineChart.tsx`: importar `import { ChartLegend } from './legend'` e trocar a linha 82 por:
```tsx
          <Legend content={<ChartLegend />} />
```

- [ ] **Step 4: A Agenda encolhe** — `AgendaPanel.tsx:97`:

```tsx
            // `min-w-0`: item de grid nasce com `min-width: auto` e não encolhe
            // abaixo do próprio conteúdo; a 390px a seção media 287px num card
            // de 261, o `overflow-hidden` do raio cortava 26px e a reticência
            // do `truncate` caía FORA da área visível (f2 UI-10, o C da run de
            // 2026-08-28). Com o item encolhendo, o corte acontece dentro.
            <section key={janela.key} className="min-w-0">
```

- [ ] **Step 5: Provar** — `pnpm test` verde (inclusive `tests/chart-tokens.test.ts` — o fixture usa `--surface-border`, não `--chart-*`); `pnpm lint` 0; `pnpm build` verde.

- [ ] **Step 6: Ledger** — f2 UI-09: `legend.test.tsx` (visto reprovar) · run 5 (contraste da legenda no claro ≥ 4,5:1; `ul[role=list]` contado). f2 UI-10: run 5 (`scrollWidth == clientWidth` a 390×844, reticência visível). P-63: paga aqui (Task 16 fecha a ficha).

- [ ] **Step 7: Commit**

```bash
git add frontend/src/shared/ui/AppLineChart/ frontend/src/app/pages/Dashboard/AgendaPanel.tsx docs/superpowers/audits/2026-08-29-item19-triagem.md
git commit -m "fix(dashboard): legenda com texto legivel e role=list (f2 UI-09, P-63); Agenda encolhe a 390 (f2 UI-10)"
```

### Task 13: Certificados — o motivo do bloqueio acompanha o controle, e o painel não refaz o GET (f3 UI-03, UI-09)

**Files:**
- Modify: `frontend/src/features/certification/components/Emission/EmissionPanel.tsx:15-17,89-99,103-108`
- Modify: `frontend/src/features/certification/components/Emission/EmissionStudentsTable.tsx:9-19,30,80-88`
- Modify: `frontend/src/features/certification/api/certificatesApi.ts:22-33`
- Test: `frontend/src/features/certification/api/certificatesApi.test.tsx`

- [ ] **Step 1: Teste do `staleTime` que falha** — acrescentar um `describe` a `certificatesApi.test.tsx` (importar `useEmissionPanel`):

```tsx
describe('o painel de emissão — segundo observador não refaz o GET', () => {
  /**
   * `useHistorial` monta um segundo observador de `useEmissionPanel` na mesma
   * chave, para o Reemitir; com `staleTime` 0 o observador novo refazia o GET
   * no instante em que a aba Emisión saía de vista (f3 UI-09, run de
   * 2026-08-28 — a run não isolou o gatilho; é este, não foco). O payload
   * cresce com as turmas concluídas. `invalidateQueries` pós-emissão ignora
   * `staleTime`, então a emissão continua repintando o painel.
   */
  it('dois observadores na mesma janela custam um GET', async () => {
    get.mockResolvedValue({ data: [] })
    const qc = new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: false, retry: false } } })
    const compartilhado = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    )

    const primeiro = renderHook(() => useEmissionPanel(true), { wrapper: compartilhado })
    await waitFor(() => expect(primeiro.result.current.isSuccess).toBe(true))
    primeiro.unmount()
    const segundo = renderHook(() => useEmissionPanel(true), { wrapper: compartilhado })
    await waitFor(() => expect(segundo.result.current.isSuccess).toBe(true))

    expect(get).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 2: Ver reprovar** — `pnpm test src/features/certification/api` → `expected 1, received 2` (limpar `get.mockClear()` num `beforeEach` se a contagem herdar dos outros casos).

- [ ] **Step 3: Implementar** — `useEmissionPanel`:

```ts
export function useEmissionPanel(enabled = true, desde?: string) {
  return useQuery<EmissionPanelTurmaData[], ProblemDetails>({
    queryKey: [...panelKey, desde ?? 'default'],
    queryFn: () =>
      api
        .get<EmissionPanelTurmaData[]>('/api/certificates/emission-panel', {
          params: desde ? { concluidas_desde: desde } : {},
        })
        .then((r) => r.data),
    enabled,
    // O Historial monta um segundo observador desta chave (Reemitir); com
    // `staleTime` 0 ele refazia o GET ao sair da aba Emisión (f3 UI-09).
    // Precedente: `useCrudPage`/`CourseStep`. A invalidação pós-emissão
    // ignora `staleTime`, então emitir continua repintando o painel.
    staleTime: 30_000,
  })
}
```

- [ ] **Step 4: O motivo do bloqueio na linha do CTA** — `EmissionPanel.tsx`:

```tsx
  const blockedId = useId()
```
e o trecho `{turma.emission_blocked !== null && (<AppTag …/>)}` + `<div className="flex justify-end">` vira:

```tsx
          {/* O motivo do bloqueio divide a LINHA com o controle que ele explica:
            * como irmã solta ele ficava a 536px do CTA, em corpo menor, e os 14
            * botões apagados não apontavam para ele (f3 UI-03, run de
            * 2026-08-28). `aria-describedby` liga o controle ao motivo para quem
            * não vê a distância. */}
          <div className="flex flex-wrap items-center justify-end gap-3">
            {turma.emission_blocked !== null && (
              <AppTag id={blockedId} severity="warning" value={t(`certificate.blocked.${turma.emission_blocked}`)} />
            )}
            <AppButton
              variant="primary"
              icon="pi pi-verified"
              label={t('certificate.emitAllPending', { count: s.counts.pendientes })}
              disabled={s.counts.pendientes === 0 || turma.emission_blocked !== null}
              aria-describedby={turma.emission_blocked !== null ? blockedId : undefined}
              onClick={() => s.setBatchIssuing(true)}
            />
          </div>
```

E na `<EmissionStudentsTable`: `blockedReasonId={turma.emission_blocked !== null ? blockedId : undefined}`.

`EmissionStudentsTable.tsx` — na `Props`:
```ts
  /** `id` da tag que explica o bloqueio; os "Emitir" apagados apontam para ela
   * por `aria-describedby` (f3 UI-03). */
  blockedReasonId?: string
```
na assinatura, `blockedReasonId` entra na desestruturação; e o botão da linha `sin_emitir`:
```tsx
            return (
              <AppButton
                label={t('certificate.emit')}
                text
                disabled={blocked}
                aria-describedby={blocked ? blockedReasonId : undefined}
                onClick={() => onEmit(e)}
              />
            )
```

- [ ] **Step 5: Provar** — `pnpm test` verde; `pnpm lint` 0 (`EmissionStudentsTable` e `EmissionPanel` continuam ≤ 150 linhas — conferir com `wc -l`; se estourar, o comentário da Task encolhe, não a régua); `pnpm build` verde.

- [ ] **Step 6: Ledger** — f3 UI-03: run 5 (tag e CTA na mesma linha, `aria-describedby` resolvendo para o texto do motivo). f3 UI-09: teste (visto reprovar) · run 5 (um único `GET /api/certificates/emission-panel` ao trocar de aba).

- [ ] **Step 7: Commit**

```bash
git add frontend/src/features/certification docs/superpowers/audits/2026-08-29-item19-triagem.md
git commit -m "fix(certificados): motivo do bloqueio junto ao CTA com aria-describedby; painel com staleTime (f3 UI-03/09)"
```

### Task 14: o par da cotação na mesma escala, e o Perfil com `h2` (f1 UI-02, f2 UI-03)

**Files:**
- Modify: `frontend/src/features/commercial/components/Budget/QuoteRow.tsx:63`
- Modify: `frontend/src/shared/ui/FormSection/FormSection.tsx`, `FormSection.test.tsx`
- Modify: `frontend/src/features/identity/components/Profile/ProfilePersonalSection.tsx:31`, `ProfileSecuritySection.tsx:38`, `ProfileDocumentsSection.tsx:27`

- [ ] **Step 1: Teste do `FormSection` que falha** — acrescentar:

```tsx
  /**
   * `h3` é o nível de seção DENTRO de diálogo, sob o `h1` da página. No Perfil
   * as três seções dividem a própria página e saíam `h1,h3,h3,h3` — nível
   * pulado nas três viewports (f2 UI-03, run de 2026-08-28). O nível é do
   * chamador; a grafia não muda.
   */
  it('`as="h2"` sobe o nível sem trocar a grafia', () => {
    render(<FormSection title="Datos personales" as="h2" />)

    const titulo = screen.getByRole('heading', { name: 'Datos personales', level: 2 })
    expect(titulo.className).toContain(sectionLabelClass)
  })
```

- [ ] **Step 2: Ver reprovar** — `pnpm test src/shared/ui/FormSection` → heading nível 2 não encontrado.

- [ ] **Step 3: Implementar** — `FormSection.tsx`:

```tsx
export interface FormSectionProps {
  title: string
  /** Espaço acima, para seções que não são a primeira do diálogo. */
  spaced?: boolean
  /** Nível do cabeçalho. `h3` (default) é a seção DENTRO de diálogo, sob o `h1`
   * da página; `h2` é a seção que divide a própria página — o Perfil, cujas
   * três seções saíam `h1,h3,h3,h3` (f2 UI-03, run de 2026-08-28). */
  as?: 'h2' | 'h3'
}

export function FormSection({ title, spaced, as = 'h3' }: FormSectionProps) {
  return <SectionLabel as={as} rule={false} className={spaced ? 'pt-2' : undefined}>{title}</SectionLabel>
}
```
(o comentário existente sobre `h3`/`rule={false}` fica, acrescido de "o nível é do chamador").

Nos três sítios do Perfil: `<FormSection title={…} as="h2" />`.

- [ ] **Step 4: O par da cotação** — `QuoteRow.tsx:63`:

```tsx
        {onReject && quote.status !== 'rejected' && (
          /* `size="small"`: 44px/14px, a mesma escala do `compact` do Aprobar ao
           * lado. Com a geometria cheia do tema, o destrutivo saía 2px mais
           * alto, 32px mais largo e dois pontos maior que o construtivo — a
           * ênfase no sentido errado num par confirmar/recusar (f1 UI-02, run de
           * 2026-08-28). O `severity` segue sendo o sinal do destrutivo. */
          <AppButton label={t('quote.reject')} severity="danger" outlined size="small" onClick={onReject} />
        )}
```

- [ ] **Step 5: Provar** — `pnpm test` verde; `pnpm lint` 0; `pnpm build` verde.

- [ ] **Step 6: Ledger** — f1 UI-02: run 5 (Rechazar e Aprobar em 44px, 14px). f2 UI-03: teste · run 5 (outline do Perfil `h1,h2,h2,h2`).

- [ ] **Step 7: Commit**

```bash
git add frontend/src/features/commercial/components/Budget/QuoteRow.tsx frontend/src/shared/ui/FormSection/ frontend/src/features/identity/components/Profile/ docs/superpowers/audits/2026-08-29-item19-triagem.md
git commit -m "fix(ui): Rechazar na escala do Aprobar (f1 UI-02); FormSection com nivel por prop e Perfil em h2 (f2 UI-03)"
```

### Task 15: as telas de auth consomem o `FormField` (f4 UI-06, D10)

**Files:**
- Modify: `frontend/src/features/identity/components/Login/LoginForm.tsx`, `ForgotForm.tsx`, `frontend/src/features/identity/components/Password/SetPasswordPage.tsx`
- Test: `frontend/src/features/identity/components/Login/AuthPanel.test.tsx`

**Interfaces:**
- Consome: `FormField({ label, error, children })` — `error` é `string | undefined`; id por contexto (`useId`); `invalid`/`aria-*` pela Task 2.

- [ ] **Step 1: Reescrever o teste para achar por rótulo** — `AuthPanel.test.tsx`, os três casos:

```tsx
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
// (imports e `renderPanel` inalterados)

describe('AuthPanel', () => {
  it('em /login mostra os campos do login', () => {
    renderPanel('/login')

    expect(screen.getByLabelText('login.email')).toBeTruthy()
    expect(screen.getByLabelText('login.password')).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'password.forgotTitle' })).toBeNull()
  })

  it('o clique em recuperar troca so os campos e leva o e-mail digitado', () => {
    const { container } = renderPanel('/login')

    fireEvent.change(screen.getByLabelText('login.email'), { target: { value: 'ana@lotus.cl' } })
    fireEvent.click(container.querySelector('a[href="/recuperar-clave"]') as HTMLAnchorElement)

    const forgot = screen.getByLabelText('login.email') as HTMLInputElement
    expect(forgot.value).toBe('ana@lotus.cl')
    expect(screen.queryByLabelText('login.password')).toBeNull()
    expect(screen.getByRole('heading', { name: 'password.forgotTitle' })).toBeTruthy()
  })

  it('em /recuperar-clave abre no modo recuperacao', () => {
    renderPanel('/recuperar-clave')

    expect(screen.getByRole('heading', { name: 'password.forgotTitle' })).toBeTruthy()
    expect(screen.queryByLabelText('login.password')).toBeNull()
  })
})
```

Rodar: passa ainda com o código antigo (os rótulos já existem) — o que este teste guarda é a associação rótulo→controle sobrevivendo à troca.

- [ ] **Step 2: `LoginForm.tsx`** — importar `FormField` de `@shared/ui`, remover `dangerText`; os dois blocos `<div className="flex flex-col gap-1">…</div>` viram:

```tsx
      {/* `FormField`: id por contexto, erro por prop, `invalid`/`aria-*` pelo
          contexto (Task 2). O molde da P-37 nasceu aqui à mão e hoje vive no
          `FormField` — dois recibos de rótulo (16px/500 aqui, 14px/400 lá) era
          o custo de não consumi-lo (f4 UI-06, run de 2026-08-28). */}
      <FormField label={t("login.email")} error={fieldErrors?.email?.[0]}>
        <AppInputText
          leftIcon="pi pi-envelope"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          placeholder={t("login.emailPlaceholder")}
        />
      </FormField>

      <FormField label={t("login.password")} error={fieldErrors?.password?.[0]}>
        <AppPassword
          leftIcon="pi pi-lock"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </FormField>
```

- [ ] **Step 3: `ForgotForm.tsx`** — o bloco do e-mail vira:

```tsx
          <FormField label={t('login.email')} error={fieldErrors?.email?.[0]}>
            <AppInputText
              type="email"
              leftIcon="pi pi-envelope"
              autoComplete="username"
              value={email}
              onChange={(e) => onEmailChange(e.target.value)}
              placeholder={t('login.emailPlaceholder')}
            />
          </FormField>
```
(remover o import de `dangerText`).

- [ ] **Step 4: `SetPasswordPage.tsx`** — os dois blocos viram:

```tsx
        <FormField label={t('password.newPassword')} error={fieldErrors?.password?.[0]}>
          <AppPassword
            leftIcon="pi pi-lock"
            value={password}
            autoComplete="new-password"
            onChange={(e) => setPassword(e.target.value)}
          />
        </FormField>

        <FormField label={t('password.confirmation')}>
          <AppPassword
            leftIcon="pi pi-lock"
            value={confirmation}
            autoComplete="new-password"
            onChange={(e) => setConfirmation(e.target.value)}
          />
        </FormField>
```
(remover o import de `dangerText`; o comentário sobre `htmlFor`/`inputId` sai — o `FormField` é quem sabe a porta).

- [ ] **Step 5: Provar** — `pnpm test` verde (`AuthPanel.test`, `FormField`), `pnpm lint` 0 (os três arquivos encolhem), `pnpm build` verde. No navegador (`:5175/login`), submeter credencial errada: a borda do e-mail pinta (`.p-invalid`, pela Task 2) e o erro aparece sob o campo.

- [ ] **Step 6: Ledger** — f4 UI-06: um recibo (grep `className="font-medium"` em `Login/` e `Password/` → zero) · run 5.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/features/identity/components/Login/ frontend/src/features/identity/components/Password/SetPasswordPage.tsx docs/superpowers/audits/2026-08-29-item19-triagem.md
git commit -m "refactor(auth): login, recuperacao e senha consomem FormField — um recibo de rotulo (f4 UI-06)"
```

---

# Fase 5 — decisões e regra escrita

### Task 16: fichas D-63..D-68, P-63 encerrada, P-67 rehospedada, rule atualizada

**Files:**
- Modify: `docs/superpowers/backlog.md` (tabela `# Decisões não promovíveis isoladamente`, após a linha `D-32`)
- Modify: `docs/superpowers/pendencias/abertas.md` (remover a ficha P-63; atualizar a linha `**Bloco:**` da P-67), `encerradas.md` (§"Em rastro"), `README.md` (linhas da P-63 e da P-67)
- Modify: `.claude/rules/frontend-estilizacao.md`

- [ ] **Step 1: As seis fichas** — acrescentar à tabela do backlog, após `D-32`:

```markdown
| `D-63` | **Escala de heading** (f2 UI-02/03 do audit de 2026-08-28): a faixa de seção (`h2`, 12px caixa alta) é menor que o título de card (`h3`, 16px), e o `h3` do Perfil é byte a byte o `h2` do Dashboard. São dois REGISTROS — eyebrow e título — codificando profundidade por caixa e posição, não por corpo. Recomendação: **manter**; se o João quiser escala monotônica, o título de card sobe para `typography.ts` (hoje literal em `AppCard.tsx:147`) e o degrau muda numa constante. Gatilho: decisão do João. |
| `D-64` | **"1250 UF"** (f2 UI-08): no KPI de cotizaciones a contagem (Archivo 30px) e a grandeza (mono 12px) se encostam e leem como um número; em es-CL o espaço é separador de milhar válido. Recomendação: separador visível na MESMA linha — `·` com `aria-hidden` entre os dois, ou rótulo curto antes do valor —, sem terceira linha (razão em `KpiRow.tsx:104`). Gatilho: decisão do João. |
| `D-65` | **Reserva da coluna presa em tablet** (f3 UI-01): `stickyActionsColumn('8rem')` fixo contra `tableWidths` em % sobre `min-w-[48rem]` — a 1024px a ação cobre 99px (65%) da última coluna de dado, em todas as 12 tabelas com ação presa. Duas direções: reserva em % do mesmo orçamento (reabre as 12 medições do item 17) ou sinal de rolagem no wrapper + `min-width` menor onde a reserva não cabe. Recomendação: a segunda, medida nas 12. Gatilho: bloco de tabelas. |
| `D-66` | **Escala de raio** (f3 UI-05 + **P-67**): a rule diz `lg`/`md`/`full`; a tela tem 4px para botão, input e tag (tema), `rounded` = 4px, `rounded-md` (6px) só nos banners do `FormField`, `rounded-full` só no pill de contagem do `AppCard`. Recomendação: superfície `rounded-lg`; controle, faixa fina **e tag** herdam o raio do tema (4px = `rounded`); `rounded-full` só para círculo e cápsula de contagem; banners voltam ao raio do tema; os 10 sítios da P-67 se classificam por essa régua e a catraca nasce depois. Gatilho: decisão do João; hospeda a P-67. |
| `D-67` | **Corpo do `notFound` público** (f3 UI-07): `/validar/<uuid>` inexistente mostra só o `h1` — zero `a`/`button`, sem eco do identificador. Recomendação: ecoar o identificador consultado em `identifierClass` e uma linha de passo seguinte ("verifica el código impreso o contacta a Lotus"), sem link e sem dado do certificado — texto de página pública de peso legal. Gatilho: decisão do João/Lotus sobre a redação. |
| `D-68` | **Borda do input no tema claro** (f4 UI-05): `#cbd5e1` sobre `#ffffff` mede 1,48:1; a 1.4.11 pede 3:1 no limite do controle quando ele é o único indicador (o escuro tem poço de fundo e não depende do traço). Nenhum `-400` do Tailwind passa (slate-400 2,36:1); slate-500 `#64748b` mede 4,76:1. Recomendação: slate-500 na borda de repouso, via `scripts/generate-brand-theme.mjs`, medida nos dois temas antes de entrar. Gatilho: decisão do João — muda a cara de todo input do claro. |
```

- [ ] **Step 2: P-63 encerra** — recortar a ficha `## P-63 …` de `abertas.md:61-86` e colar em `encerradas.md` sob `## Em rastro`, com o parágrafo de fechamento acima do texto original:

```markdown
### P-63 — o `role="list"` do mini-reset não alcança lista renderizada por biblioteca

**Fechada em 2026-08-29**, no `frontend-triagem-dos-audits-do-item-18` (Task 12), por mecanismo: a
legenda do `AppLineChart` passou a ter conteúdo próprio (`shared/ui/AppLineChart/legend.tsx`) —
`<ul role="list">` com o texto na tinta secundária e o marcador na tinta da série —, porque a
f2 UI-09 do audit de 2026-08-28 mediu o texto da legenda abaixo de AA no claro e o gatilho desta
ficha ("bloco que tocar gráfico") disparou. Guarda em `legend.test.tsx`; medida na run 5
(`audits/2026-08-29-item19-run5.md`): zero `ul` sem `role` no Dashboard.
```

No `README.md`, remover a linha `| P-63 | …` da tabela e acrescentar, no parágrafo de rastro (perto de "A P-66 fechou…"): "**A P-63 fechou no `frontend-triagem-dos-audits-do-item-18` (2026-08-29) e está em rastro.**"

- [ ] **Step 3: P-67 rehospedada** — em `abertas.md`, a linha `**Bloco:**` da P-67 passa a:

```markdown
**Bloco:** `D-66` (decisão do João sobre a escala de raio, aberta pelo item 19 em 2026-08-29) ·
**Gatilho:** a D-66 decidida — os 10 sítios se classificam pela régua escolhida e a catraca nasce
depois do último. Revisar em **2026-10-31**.
```
e no `README.md` a coluna de hospedeiro da P-67 vira `D-66 (decisão do João)`.

- [ ] **Step 4: A rule** — `.claude/rules/frontend-estilizacao.md`:

Na seção **Botão**, acrescentar após a lista:
```markdown
- **Todo `AppButton` de tela declara papel** — `variant`, `text`, `outlined`, `link` ou `severity`.
  Sem papel ele cai no `.p-button` preenchido do Lara, que não é papel deste produto: foi assim que
  os seis diálogos de certificação, o alvo do `AppSelectableCard` e o `ArchiveSwitch` escaparam do
  item 18 (triagem de 2026-08-29). Secundária de diálogo (Cancelar/Cerrar) é `text`, como o
  `CrudDialog`. Mecanismo: `BOTAO_SEM_PAPEL` em `frontend/eslint.config.js`, nas duas camadas.
```

A seção **Dado técnico é mono** passa a:
```markdown
## Dado técnico é mono

Folio, RUT, código, versão e contagem que alinha em coluna saem em `font-mono` **com**
`tabular-nums`. Sem o tabular o dígito muda de largura entre renders e o número dança na coluna.

| Papel | Constante (`shared/ui/typography.ts`) |
|---|---|
| Dado técnico — contagem, data, versão | `technicalDataClass` |
| Identificador — RUT, folio, código (token único, não quebra no hífen) | `identifierClass` |

`font-mono` literal no sítio é o defeito: a fase 2 do audit de 2026-08-28 mediu sete sítios com a
metade do par, e a fase 1 um RUT partido em "76.123.456-" / "0". Mecanismo: `MONO_LITERAL` em
`frontend/eslint.config.js`, nas duas camadas; `shared/ui` fica de fora porque é onde a grafia é
definida.

Prosa não é dado técnico: o travessão que marca ausência legítima fica em texto normal.
```

Na seção **Escala de raio**, substituir o último parágrafo (o do débito) por:
```markdown
`rounded` solto é raio sem degrau declarado. **A escala desta tabela está em decisão (D-66,
2026-08-29):** medida na tela, o tema pinta botão, input e tag em 4px (= `rounded`), `rounded-md`
só existe nos banners do `FormField`, e `rounded-full` só no pill de contagem do `AppCard`. Os 10
sítios da **P-67** esperam a D-66; a catraca nasce depois do último sítio, não antes.
```

Na seção **Tipografia**, acrescentar à tabela: `| Rótulo de campo de formulário | \`<FormField>\` | todo formulário, inclusive login, recuperação e senha |`.

- [ ] **Step 5: Provar** — `pnpm test tests/repo-docs-refs.test.ts` verde (a rule cita `legend.tsx`? não — cita `typography.ts` e `eslint.config.js`, que existem); `pnpm test` verde.

- [ ] **Step 6: Ledger** — as seis linhas `ficha`: prova = `backlog.md D-6x`. P-63 e P-67: registradas na seção final do ledger.

- [ ] **Step 7: Commit**

```bash
git add docs/superpowers/backlog.md docs/superpowers/pendencias/ .claude/rules/frontend-estilizacao.md docs/superpowers/audits/2026-08-29-item19-triagem.md
git commit -m "docs(fichas): D-63..D-68 para o Joao; P-63 fecha por mecanismo; P-67 rehospedada na D-66; rule com as duas catracas"
```

---

# Fase 6 — prova

### Task 17: dado de prova e a run 5 (D15; spec §9.2 e §9.4)

**Files:**
- Create: `docs/superpowers/audits/2026-08-29-item19-run5.md` (relatório da skill, copiado ao path)
- Modify: `docs/superpowers/audits/2026-08-29-item19-triagem.md` (coluna Prova; seção "Run 5")

**Interfaces:**
- Consome: o stack desta árvore no ar (`docker compose up -d` na raiz da worktree; `pnpm dev` em `frontend/`), Gotenberg incluído.

- [ ] **Step 1: Um template para o curso da turma 3** (a turma `concluida` com 13 aprovados e 1 redator, medida na fase 3). Lição 12: `Origin` e `Accept` obrigatórios; o `XSRF-TOKEN` é reextraído depois do login.

```bash
J=/tmp/lotus-8082.jar; rm -f $J
curl -s -c $J -H "Origin: http://localhost:5175" http://localhost:8082/sanctum/csrf-cookie -o /dev/null
X=$(grep XSRF-TOKEN $J | awk '{print $7}' | sed 's/%3D/=/g')
curl -s -b $J -c $J -H "Origin: http://localhost:5175" -H "Accept: application/json" \
  -H "X-XSRF-TOKEN: $X" -H "Content-Type: application/json" \
  -d '{"email":"admin@lotus.cl","password":"senha123"}' http://localhost:8082/api/login -o /dev/null -w '%{http_code}\n'
X=$(grep XSRF-TOKEN $J | awk '{print $7}' | sed 's/%3D/=/g')
COURSE=$(curl -s -b $J -H "Origin: http://localhost:5175" -H "Accept: application/json" http://localhost:8082/api/turmas/3 | python3 -c 'import json,sys; print(json.load(sys.stdin)["course_id"])')
curl -s -b $J -H "Origin: http://localhost:5175" -H "Accept: application/json" -H "X-XSRF-TOKEN: $X" \
  -H "Content-Type: application/json" -d '{"layout_config":{"orientation":"landscape"},"validity_months":24}' \
  http://localhost:8082/api/courses/$COURSE/templates -w '\n%{http_code}\n'
```
Esperado: `200` no login, `201` no template. Se a chave do curso no payload de `/api/turmas/3` não for `course_id`, ler o JSON e ajustar — o `generated.ts` (`TurmaData`) diz o nome.

- [ ] **Step 2: Um certificado pela UI** — no navegador (`:5175`, `admin@lotus.cl`, tema claro): `/certificados` → Emisión → turma 3 → o CTA "Emitir todos" agora habilita (a tag de bloqueio some) → **emitir só UM aluno pela linha** ("Emitir" → `ConfirmIssueDialog` → escolher o redator → confirmar → `IssuedDialog` com o folio). Anotar o folio e o `uuid` de validação (o `IssuedDialog`/`CertificateViewDialog` mostram; ou `GET /api/certificates` com o jar acima). Isto é mutação no banco de dev desta árvore, feita pelo bloco, não pela skill.

- [ ] **Step 3: Invocar a run 5** — `/lotus-ui-review` com este pedido (a skill é read-only; a preferência de tema/idioma é permitida; nenhuma mutação):

> Run `item19-run5` em `fix/frontend-triagem-audits-item-18` @ HEAD, nos dois temas, 1440×900 / 1024×768 / 390×844. Superfícies: (1) `/certificados` Emisión com a turma 3: o par tag-de-bloqueio/CTA numa turma AINDA bloqueada (escolher uma turma sem template) e a tabela com o console limpo ao selecionar; a rede ao trocar para Historial (um único GET do painel); (2) os seis diálogos — `ConfirmIssueDialog`, `BatchIssueDialog` (abrir e CANCELAR), `IssuedDialog`/`CertificateViewDialog` (o "Ver" do certificado emitido), `RevokeDialog` e `ReissueDialog` (abrir e CANCELAR) — costura header/body/footer, CTA `primary`, secundárias `text`; (3) `/validar/<uuid do certificado>` ramo `valid`: **veredito do `CertificateFolio`** (degrau de tamanho e tracking, dois temas, três viewports); (4) `/comercial` aba Presupuestos: barra Activos/Archivados × CTA; `/comercial/presupuestos/1`: RUT do cabeçalho a 1024, par Rechazar/Aprobar; (5) `/` a 390×844: card Agenda (`scrollWidth`/`clientWidth`, reticência), legenda dos gráficos (contraste do texto no claro, `ul[role=list]`); (6) `/cursos` → "New course" → submit vazio: `.p-invalid` no campo, `activeElement` após o 422, cards de redator selecionado × não (fundo interno, RUT ≥ 4,5:1); (7) `/login`: submit `primary`, rótulos, credencial errada. Relatório em `docs/superpowers/audits/2026-08-29-item19-run5.md`.

- [ ] **Step 4: Fechar o ledger** — cada `pendente — … run 5` vira a medida (número, screenshot nomeado). Achado novo da run 5 entra na seção "Run 5" com o gabarito da spec §2: **C corrige agora** (task extra no ledger, com teste ou medida); **B corrige se a raiz já foi tocada** neste bloco, senão vira ficha `D-*`. Veredito do `CertificateFolio` escrito por extenso — mover **um** degrau é autoridade da run (spec do item 18, §4.3); mais que isso é decisão do João e vira ficha.

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/audits/2026-08-29-item19-run5.md docs/superpowers/audits/2026-08-29-item19-triagem.md
git commit -m "docs(triagem): run 5 com certificado real — seis dialogos, /validar valido e o veredito do CertificateFolio"
```

### Task 18: gate do bloco (spec §9.6)

**Files:**
- Modify: `docs/superpowers/audits/2026-08-29-item19-triagem.md` (bloco final "Gate")

- [ ] **Step 1: Escopo medido**

```bash
git diff --stat main...HEAD -- backend/ frontend/src/shared/types/generated.ts
```
Esperado: vazio. `pint` e `typescript:transform` ficam N/A por escopo, **provados**.

- [ ] **Step 2: Gate do frontend** (de `frontend/`)

```bash
pnpm lint && pnpm build && pnpm test
```
Esperado: lint `0`, build verde, suíte verde — anotar `N arquivos / M testes`.

- [ ] **Step 3: Suíte do backend inalterada** (da raiz da worktree, no stack desta árvore)

```bash
docker compose exec -T app php artisan test 2>&1 | tail -3
```
Esperado: o mesmo `passed / skipped` da `main` (`1108 passed / 5 skipped` no fechamento do item 6; conferir o número corrente).

- [ ] **Step 4: Catracas vistas reprovar, de novo, contra o código final** — repetir as quatro sondas (Task 6 ×2, Task 10 ×2) e anotar no ledger; grep de fechamento:

```bash
grep -rn "font-mono" src/features src/app | wc -l          # 0
grep -rln "Requerido\|p-invalid" src/shared/ui/FormField/    # o teste da Task 2
```

- [ ] **Step 5: Ledger sem `pendente`**

```bash
grep -c "pendente" docs/superpowers/audits/2026-08-29-item19-triagem.md   # 0
```

- [ ] **Step 6: Commit e handoff** — o `/executar-bloco` atualiza `state.md` no commit documental de handoff (`ready_for_review`).

```bash
git add docs/superpowers/audits/2026-08-29-item19-triagem.md
git commit -m "docs(triagem): gate do item 19 — lint 0, build e suites verdes, escopo medido"
```

---

## Handoff de execução

```yaml
executor: claude
```

**Por que `claude` e não `codex`:** o bloco é, antes de tudo, julgamento — cada task termina com um veredito no ledger, e a Task 17 decide na tela o que a run reporta (o veredito do `CertificateFolio`, a classificação de achado novo). As Tasks 6 e 10 escrevem catraca de lint cuja régua tem de discriminar papel certo de errado (a armadilha da P-36); a Task 16 escreve as fichas que o João vai decidir; a Task 15 mexe no login. As tasks mecânicas (8, 9, 11) são pequenas demais para pagar o roteamento, e dependem das constantes da 7 no mesmo dia.
