# Bloco 43 — `frontend-dialogos-proporcionais-e-tipo-de-documento` — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** diálogos em duas famílias proporcionais — moldura padrão `sm`/`md`/`lg` com header e
footer navy, e confirmação compacta com três severidades —, formulários de aluno e matrícula em
grade, e documento do orçamento etiquetado por tipo (orden de compra, factura, comprobante)
escolhido num diálogo.

**Architecture:** o comportamento comum a todo diálogo (foco de volta ao disparador, nomes
acessíveis do fechar e do maximizar, `draggable={false}`) sai do `AppDialog` para um
`DialogFrame` interno de `shared/ui`; sobre ele vivem duas cascas: `AppDialog` (tamanho
obrigatório, maximizar só no `lg`, classe `lotus-dialog` que a folha de marca pinta de navy) e
`ConfirmDialog` (28rem, sem maximizar, faixa e ícone pela severidade). O tipo de anexo do
orçamento vira enum do domínio Comercial, e o upload sai do header do card para um diálogo cujo
estado mora num hook da feature.

**Tech Stack:** React 19 + TS, PrimeReact 10 via `shared/ui`, Tailwind v4 (layout), Vitest
(jsdom); Laravel 13 / PHP 8.3, PHPUnit (sqlite `:memory:`), typescript-transformer.

**Spec:** `docs/superpowers/blocos/43-frontend-dialogos-proporcionais-e-tipo-de-documento/spec.md`

## Global Constraints

- Lei 6: feature não importa PrimeReact nem outra feature; peça nova de UI nasce em `shared/ui`.
- Lei 3: `frontend/src/shared/types/generated.ts` só muda por
  `docker compose exec -T app php artisan typescript:transform` (o transformer emite sozinho todo
  enum de `app/`, sem atributo).
- Lei 7 / RN-14: anexo ausente nunca bloqueia aprovar o orçamento.
- Larguras (spec §4.1–4.2): todas `w-[95vw]`; teto `sm` = `max-w-[32rem]`, `md` =
  `max-w-[48rem]`, `lg` = `max-w-[64rem]`, confirmação = `max-w-[28rem]`. Maximizar só no `lg`.
- Cor só por variável do tema. A pintura navy do diálogo mora em `brand-theme.css`, escopada em
  `.lotus-dialog` (molde: `.lotus-language-menu`, `brand-theme.css:334-347` — a folha fica fora de
  layer e vence o Lara sem depender de especificidade).
- Todo `AppButton` declara papel; secundária de diálogo (Cancelar/Cerrar) é `text`
  (`BOTAO_SEM_PAPEL`).
- Componente em `features/*/components/**` ≤ 150 linhas e sem query/mutation direta (lint).
- i18n: as 3 locales com chaves idênticas (`es-CL` é a referência); chave que ficar sem uso sai
  das três.
- `danger` preenchido segue como está (3,76:1 no claro, `P-74`) — fora do bloco (spec J10).
- Comandos: backend no container da lane (`docker compose exec -T app …`); frontend com
  `pnpm -C frontend <script>`; Pint só nos arquivos tocados
  (`cd backend && ./vendor/bin/pint <arquivos>`).
- Regressão vista reprovando contra o código antigo por cópia no scratchpad. **Nunca `git stash`.**
- Commits em pt-BR, `feat(43): …`/`test(43): …`/`fix(43): …`, terminando com
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Reabrir o diálogo de upload depois de um envio** (sucesso ou erro): começa limpo, sem tipo,
   sem arquivo, sem erro. Teste no `useBudgetDocumentUpload.test.tsx` (Task 5).
2. **Erro do servidor no upload** (422 de MIME ou tamanho): o diálogo fica aberto, com o erro
   dentro, e tipo e arquivo preservados para tentar de novo. Teste no hook (Task 5).
3. **Fechar com o envio em voo:** X, ESC e Cancelar travados enquanto `pending`; senão o 422
   chegaria sem ninguém para exibi-lo. Teste no `BudgetDocumentUploadDialog.test.tsx` (Task 5).
4. **Arquivo com `type` fora do enum na lista** (dado antigo ou de outro fluxo): tag neutra com o
   valor cru, sem quebrar. Teste no `FileList.test.tsx` (Task 5).
5. **`lg` maximizado:** o teto de largura não pode prender o maximizado. Teste no
   `AppDialog.test.tsx` (Task 3) e conferência no navegador (Task 6).

---

## Preparação (antes da Task 1, uma vez)

Na raiz da lane (`/home/jvbat/projetos/lotus-43-frontend-dialogos-proporcionais-e-tipo-de-documento`,
offset +3: API `:8083`, Vite `:5176`):

```bash
docker compose up -d
docker compose exec -T app composer install
docker compose exec -T app php artisan test --filter=CommercialFilesTest
pnpm -C frontend test
```
Esperado: verde (linha de base).

---

### Task 1: Enum `BudgetDocumentType` e validação do upload do orçamento

**Files:**
- Create: `backend/app/Domains/Commercial/Enums/BudgetDocumentType.php`
- Modify: `backend/app/Domains/Commercial/Http/Controllers/BudgetFileController.php:14-25`
- Modify: `backend/tests/Feature/Comercial/CommercialFilesTest.php`
- Modify: `frontend/src/shared/types/generated.ts` (regenerado)
- Modify: `frontend/src/features/commercial/api/useCommercialFiles.ts:8-9,18`
- Modify: `frontend/src/features/commercial/hooks/useBudgetDetail.ts:9,27` (só o tipo)
- Modify: `frontend/src/features/commercial/components/Budget/BudgetDocumentsCard.tsx:7,15-16` (só o tipo)

**Interfaces:**
- Produces: `App\Domains\Commercial\Enums\BudgetDocumentType: string` com `PURCHASE_ORDER =
  'purchase_order'`, `INVOICE = 'invoice'`, `RECEIPT = 'receipt'`. TS gerado:
  `export type BudgetDocumentType = 'purchase_order' | 'invoice' | 'receipt'`.
  `useUploadBudgetFile()` passa a tipar `type: BudgetDocumentType`. O `BudgetFileType` escrito à
  mão deixa de existir.

- [ ] **Step 1: Testes que falham** — em `CommercialFilesTest`:
  - `test_upload_de_cada_tipo_do_orcamento` com data provider `purchase_order`, `invoice`,
    `receipt`: `POST /api/budgets/{id}/files` → `assertCreated()`, `assertJsonPath('type', $tipo)`,
    `assertDatabaseHas('files', ['fileable_type' => 'budget', 'type' => $tipo])`.
  - `test_tipo_da_cotacao_rejeitado_no_orcamento`: `type = 'quote_document'` →
    `assertStatus(422)->assertJsonValidationErrors('type')`.
  - O `test_tipo_invalido_rejeitado` existente segue.
- [ ] **Step 2:** `docker compose exec -T app php artisan test --filter=CommercialFilesTest` →
  FAIL no caso `purchase_order` (hoje 422).
- [ ] **Step 3: Implementar.** Enum no molde do `TurmaDocumentType` (docblock: tipos de anexo do
  orçamento; `files.type` é string livre e o enum só restringe e rotula; `invoice` e `receipt` são
  os valores já gravados, por isso não há migration). Controller: `'type' => ['required', new
  Enum(BudgetDocumentType::class)]` (mesma grafia do `TurmaDocumentController:43`); docblock da
  classe cita os três tipos e a RN-14.
- [ ] **Step 4:** a suíte de `CommercialFilesTest` passa; `docker compose exec -T app php artisan
  test --filter='Comercial|UploadSizeLimit|RateLimit'` verde.
- [ ] **Step 5:** `docker compose exec -T app php artisan typescript:transform`; em
  `useCommercialFiles.ts`, apagar `BudgetFileType` e importar `BudgetDocumentType` de
  `@shared/types/generated`; trocar o import nos dois consumidores. `pnpm -C frontend build` e
  `pnpm -C frontend test` verdes.
- [ ] **Step 6:** Pint nos dois PHP; commit `feat(43): enum de tipo de anexo do orçamento com orden de compra`.

### Task 2: `DialogFrame` e confirmação compacta com três severidades

**Files:**
- Create: `frontend/src/shared/ui/AppDialog/DialogFrame.tsx`
- Modify: `frontend/src/shared/ui/AppDialog/AppDialog.tsx`
- Create: `frontend/src/shared/ui/AppTag/tones.ts`
- Modify: `frontend/src/shared/ui/AppTag/AppTag.tsx:13-24`
- Create: `frontend/src/shared/ui/ConfirmDialog/style.ts`
- Modify: `frontend/src/shared/ui/ConfirmDialog/ConfirmDialog.tsx`
- Modify: `frontend/src/shared/ui/ConfirmDialog/ConfirmDialog.test.tsx`
- Modify: `frontend/src/features/operation/components/Enrollment/MoveConfirmDialog.tsx`
- Modify: `frontend/src/features/certification/components/Historial/RevokeDialog.tsx`
- Modify: `frontend/src/features/certification/components/Emission/ConfirmIssueDialog.tsx`
- Modify: `frontend/src/shared/config/locales/{es-CL,pt-BR,en}.json` (só se `operation.enrollment.move.cancel` ficar sem uso)

**Interfaces:**
- Produces: `DialogFrame(props: DialogProps)` — interno de `shared/ui`, **fora do barrel**; é o
  corpo atual do `AppDialog` (captura do disparador no render, foco de volta no fechamento,
  `draggable={false}`, pins de `aria-label` do fechar e do maximizar por `mergePt` depois do `pt`
  recebido). Não liga `maximizable` sozinho: quem embrulha decide.
- Produces: `severityTone: Record<'success' | 'info' | 'warning' | 'danger', { background: string;
  color: string }>` em `AppTag/tones.ts` (os valores de hoje do `TOM` do `AppTag`, movidos).
- Produces: `ConfirmDialogSeverity = 'confirm' | 'warning' | 'danger'`;
  `confirmSeverityStyle: Record<ConfirmDialogSeverity, { stripe: string; icon: string; background:
  string; color: string }>` em `ConfirmDialog/style.ts`, com: `confirm` = `var(--blue-500)`,
  `pi pi-check-circle`, `severityTone.info`; `warning` = `var(--yellow-500)`,
  `pi pi-exclamation-triangle`, `severityTone.warning`; `danger` = `var(--red-500)`,
  `pi pi-exclamation-circle`, `severityTone.danger`.
- Produces: `ConfirmDialog` com as props de hoje mais `severity?: ConfirmDialogSeverity` (default
  `'confirm'`), `confirmIcon?: string` (default `'pi pi-check'`) e `confirmDisabled?: boolean`.
  Os consumidores atuais (`severity="danger"` ou sem severidade) não mudam.

- [ ] **Step 1: Testes que falham** — em `ConfirmDialog.test.tsx`, mantendo os existentes:
  - `it.each(['confirm', 'warning', 'danger'])('a severidade %s pinta faixa, ícone e botão')`:
    `document.querySelector('.p-dialog')` tem `data-severity` igual à severidade; o ícone do header
    (`[data-severity-icon]`) tem a classe de `confirmSeverityStyle[s].icon`; o botão de confirmar
    tem `p-button-warning` no `warning`, `p-button-danger` no `danger` e
    `border-[var(--brand-ink)]` no `confirm`.
  - `it('não maximiza nem herda a moldura navy')`: `.p-dialog-header-maximize` ausente; a classe
    da raiz contém `max-w-[28rem]` e não contém `lotus-dialog`.
  - `it('confirmDisabled desliga só o confirmar')` e `it('confirmIcon troca o ícone do botão')`.
  - `it('o mapa de estilo lê os tons do AppTag')`: `confirmSeverityStyle.warning.color ===
    severityTone.warning.color` e `.stripe === 'var(--yellow-500)'` (idem `danger`/`red`,
    `confirm`/`blue` com `info`).
  - AA do âmbar: a régua UI-04 de `frontend/tests/tone-ink.test.ts` já mede as tintas de
    severidade sobre o fundo tingido. Se ela não cobrir o `warning` na mistura de 15 % do
    `severityTone`, o caso entra lá nesta task, nos dois temas.
- [ ] **Step 2:** `pnpm -C frontend exec vitest run src/shared/ui/ConfirmDialog` → FAIL.
- [ ] **Step 3: Implementar.** `DialogFrame` recebe o corpo do `AppDialog` como está, com o
  docblock do foco junto. `AppDialog` vira `<DialogFrame maximizable {...props}
  pt={mergePt(appDialogPt, pt)} />` — comportamento idêntico ao de hoje (a Task 3 o muda).
  `AppTag` passa a ler `severityTone`. `ConfirmDialog` monta o `DialogFrame` com
  `maximizable={false}`, `pt.root` = `{ className: 'w-[95vw] max-w-[28rem]', 'data-severity':
  severity, style: { borderTop: '4px solid <stripe>' } }`, header = ícone circular `size-10
  rounded-full` (`aria-hidden`, `data-severity-icon`, fundo e tinta do mapa) + título, e o botão de confirmar com
  `variant="primary"` no `confirm` e `severity` nos outros dois. `closable`/`closeOnEscape`
  seguem `!pending`.
- [ ] **Step 4: Migrar os três consumidores** para o `ConfirmDialog`, sem mudar as props deles:
  `MoveConfirmDialog` = `severity="warning"`, título/corpo/confirmar das chaves `move.*`;
  `RevokeDialog` = `severity="danger"`, `confirmIcon="pi pi-ban"`, `confirmDisabled={reason.trim()
  === ''}`, `error={message}`, `children` = identidade + motivo; `ConfirmIssueDialog` =
  `severity="confirm"`, `confirmDisabled={redatorId == null}`, `error={message}`, `children` =
  campos de confirmação + redator.
- [ ] **Step 5:** `pnpm -C frontend lint`, `pnpm -C frontend test`, `pnpm -C frontend build`
  verdes (o `AppDialog.test.tsx` e o `EmissionPanel.test.tsx` incluídos).
- [ ] **Step 6:** commit `feat(43): confirmação compacta com três severidades`.

### Task 3: Moldura padrão — tamanho obrigatório, maximizar só no `lg`, header e footer navy

**Files:**
- Modify: `frontend/src/shared/ui/AppDialog/AppDialog.tsx`, `AppDialog/style.ts`, `AppDialog/index.ts`
- Modify: `frontend/src/shared/ui/AppDialog/AppDialog.test.tsx`
- Modify: `frontend/src/shared/styles/brand-theme.css` (bloco novo `.lotus-dialog`)
- Modify: `frontend/tests/tone-ink.test.ts` (describe novo)
- Modify: `frontend/src/shared/ui/CrudDialog/CrudDialog.tsx`, `CrudDialog/CrudDialog.test.tsx`
- Modify: `frontend/src/shared/ui/AppFilePreviewDialog/AppFilePreviewDialog.tsx:82`
- Modify (passar `size`): `features/commercial/components/Budget/{BudgetDialog,QuoteWizard}.tsx`,
  `features/commercial/components/Client/ClientDialog.tsx`,
  `features/catalog/components/Course/CourseDialog.tsx`,
  `features/identity/components/Admin/{RoleDialog,StaffUserDialog}.tsx`,
  `features/identity/components/Student/StudentDialog.tsx`,
  `features/identity/components/Redator/RedatorDialog.tsx`,
  `features/operation/components/Enrollment/{EnrollStudentForm,RegisterResultDialog,ImportDialog}.tsx`,
  `features/operation/components/Turma/RedatorDesignation.tsx`,
  `features/certification/components/Emission/{BatchIssueDialog,IssuedDialog}.tsx`,
  `features/certification/components/Historial/{ReissueDialog,CertificateViewDialog}.tsx`
  (todos sob `frontend/src/`)

**Interfaces:**
- Consumes: `DialogFrame` (Task 2).
- Produces: `export type AppDialogSize = 'sm' | 'md' | 'lg'` e `export type AppDialogProps =
  Omit<DialogProps, 'maximizable'> & { size: AppDialogSize }`, ambos pelo barrel;
  `appDialogPt(size: AppDialogSize): DialogPassThroughOptions` interno (sai do barrel — ninguém
  fora da pasta o usa). `CrudDialog` ganha `size: AppDialogSize` obrigatório.

- [ ] **Step 1: Testes que falham.**
  - `AppDialog.test.tsx`: os dois testes atuais passam a renderizar `size="lg"`; novos:
    `it.each(['sm', 'md'])('%s não maximiza')` (`.p-dialog-header-maximize` ausente) e `it('lg
    maximiza')` (botão "Maximizar diálogo" presente); `it.each([['sm', 'max-w-[32rem]'], ['md',
    'max-w-[48rem]'], ['lg', 'max-w-[64rem]']])('%s crava o teto %s e a moldura navy')` sobre a
    classe de `.p-dialog` (contém o teto e `lotus-dialog`); `it('o lg maximizado não fica preso ao
    teto')` (classe contém `[&.p-dialog-maximized]:max-w-none`); `it('o chamador não religa o
    maximizar fora do lg')` com `// @ts-expect-error` em `<AppDialog size="sm" maximizable … />`
    → `.p-dialog-header-maximize` ausente.
  - `CrudDialog.test.tsx`: os renders existentes passam `size="md"` e seguem verdes.
  - `tone-ink.test.ts`, `describe('moldura navy do diálogo padrão (bloco 43)')`, lendo
    `camadaDeMarca`: a regra `.lotus-dialog .p-dialog-header` e a `.lotus-dialog .p-dialog-footer`
    declaram `background: var(--brand-navy)`, `color: var(--shell-ink)` e `--focus-stroke:
    var(--brand)`; `--shell-ink` é o literal `oklch(86.9% 0.022 252.894)` (o `slate-300`,
    `#cbd5e1`, como o comentário de `brand-theme.css:17-23` declara) e
    `contraste('#cbd5e1', hex(camadaDeMarca, '--brand-navy')) >= 4.5`; existem regras para
    `.p-dialog-header-icon` e para `.p-button.p-button-text` do footer em base,
    `:not(:disabled):hover` e `:not(:disabled):active`, todas com `color: var(--shell-ink)`.
- [ ] **Step 2:** `pnpm -C frontend exec vitest run src/shared/ui/AppDialog tests/tone-ink.test.ts`
  → FAIL.
- [ ] **Step 3: Implementar.** `AppDialog({ size, pt, ...props })` →
  `<DialogFrame {...props} pt={mergePt(appDialogPt(size), pt)} maximizable={size === 'lg'} />`
  (o pin depois do spread é o que impede religar). `appDialogPt(size)`: `root.className` =
  `lotus-dialog w-[95vw] <teto>` (o `lg` com `[&.p-dialog-maximized]:max-w-none`), `content` como
  hoje; header e footer perdem as classes de superfície — a pintura vem do CSS. Em
  `brand-theme.css`, depois do bloco do `.lotus-language-menu`, um bloco `.lotus-dialog`
  comentado: header e footer com `background: var(--brand-navy)`, `color: var(--shell-ink)`,
  `--focus-stroke: var(--brand)` e borda `rgb(255 255 255 / 0.1)`; título e
  `.p-dialog-header-icon` em `var(--shell-ink)`, hover do ícone com fundo `rgb(255 255 255 /
  0.1)`; `.p-button.p-button-text` do footer em `var(--shell-ink)` nos três estados, com o mesmo
  fundo no hover/active. `CrudDialog` repassa `size` e o docblock troca "Maximizable" por
  "maximiza só no `lg`". `AppFilePreviewDialog` passa `size="lg"` e perde o `style` de largura.
- [ ] **Step 4: Tamanho de cada consumidor** (spec §4.3): `sm` → `EnrollStudentForm`,
  `RegisterResultDialog`, `ImportDialog`, `RedatorDesignation` (picker), `ReissueDialog` (as três
  instâncias), `BatchIssueDialog`; `md` → `BudgetDialog`, `ClientDialog`, `CourseDialog`,
  `RoleDialog`, `StaffUserDialog`, `StudentDialog`, `RedatorDialog`, `IssuedDialog`; `lg` →
  `QuoteWizard`, `CertificateViewDialog`. O `tsc -b` acusa quem faltar.
- [ ] **Step 5:** `pnpm -C frontend lint`, `pnpm -C frontend test`, `pnpm -C frontend build` verdes.
- [ ] **Step 6:** commit `feat(43): moldura de diálogo com tamanho e header e footer navy`.

### Task 4: Formulários em grade e botões no footer

**Files:**
- Modify: `frontend/src/shared/ui/FormPhotoRow/FormPhotoRow.tsx:25-39`
- Modify: `frontend/src/features/identity/components/Student/StudentIdentifyFields.tsx:5-11,21`
- Modify: `frontend/src/features/identity/components/Redator/RedatorIdentityFields.tsx:25`
- Modify: `frontend/src/features/operation/components/Enrollment/EnrollStudentForm.tsx`
- Create: `frontend/src/features/operation/components/Enrollment/EnrollStudentForm.test.tsx`
- Modify: `frontend/src/features/operation/components/Enrollment/RegisterResultDialog.tsx`
- Modify: `frontend/src/features/operation/components/Enrollment/RegisterResultDialog.test.tsx`
- Modify: `frontend/src/features/operation/components/Enrollment/ImportDialog.tsx`

**Interfaces:**
- Consumes: `AppDialog` com `size` e a prop `footer` do Prime (Task 3).
- Produces: nenhuma interface nova; só layout.

- [ ] **Step 1: Testes que falham.**
  - `EnrollStudentForm.test.tsx` (mock de `../../hooks/useEnrollStudentFlow` e
    `mockUseTranslation` do `shared/testing`): no passo `rut`, `.p-dialog-footer` contém os botões
    `operation.enrollment.form.cancel` e `operation.enrollment.form.verify`, e o corpo não contém
    nenhum botão; no passo `details`, o footer contém `operation.enrollment.form.submit`, e o RUT
    segue desabilitado.
  - `RegisterResultDialog.test.tsx`: `it('cancelar e salvar vivem no footer')` — os dois botões
    dentro de `.p-dialog-footer`, nenhum em `.p-dialog-content`.
- [ ] **Step 2:** `pnpm -C frontend exec vitest run src/features/operation/components/Enrollment` → FAIL.
- [ ] **Step 3: Implementar.**
  - `FormPhotoRow`: linha a partir de `sm` (`flex flex-col gap-6 sm:flex-row sm:items-start`), a
    foto numa coluna estreita que não encolhe (`shrink-0 sm:w-40`, sem `py-10` nem `lg:w-3/5`), os
    campos em `min-w-0 flex-1 flex flex-col gap-4`.
  - `StudentIdentifyFields` e `RedatorIdentityFields`: o grid de nome e RUT passa a `sm:grid-cols-2`.
    O docblock do aluno diz o que o código faz: Nome │ RUT e E-mail │ Teléfono, empresa em linha
    inteira fora dele.
  - `EnrollStudentForm`: corpo em `grid gap-4 sm:grid-cols-2` — passo 1 só o RUT (linha inteira);
    passo 2 RUT │ Nome, E-mail │ Teléfono, aviso de e-mail e mensagem de erro em `sm:col-span-2`.
    Botões no `footer`, que muda com o passo; o cancelar vira `text`.
  - `RegisterResultDialog`: status em linha inteira, nota │ asistencia lado a lado, aviso em linha
    inteira; botões no `footer`, cancelar `text`.
  - `ImportDialog`: o Cerrar do resultado vai para o `footer` (só existe depois do resultado, como
    hoje).
- [ ] **Step 4:** `pnpm -C frontend lint`, `pnpm -C frontend test`, `pnpm -C frontend build` verdes.
- [ ] **Step 5:** commit `feat(43): formulários de aluno e matrícula em grade`.

### Task 5: Diálogo de upload do orçamento e tag de tipo na lista

**Files:**
- Create: `frontend/src/features/commercial/lib/budgetDocumentType.ts`
- Create: `frontend/src/features/commercial/hooks/useBudgetDocumentUpload.ts`
- Create: `frontend/src/features/commercial/hooks/useBudgetDocumentUpload.test.tsx`
- Create: `frontend/src/features/commercial/components/Budget/BudgetDocumentUploadDialog.tsx`
- Create: `frontend/src/features/commercial/components/Budget/BudgetDocumentUploadDialog.test.tsx`
- Modify: `frontend/src/features/commercial/components/Budget/BudgetDocumentsCard.tsx`
- Modify: `frontend/src/features/commercial/components/Budget/BudgetDetailPage.tsx:124-134`
- Modify: `frontend/src/features/commercial/components/Budget/FileList.tsx`
- Create: `frontend/src/features/commercial/components/Budget/FileList.test.tsx`
- Modify: `frontend/src/features/commercial/hooks/useBudgetDetail.ts`
- Modify: `frontend/src/shared/config/locales/{es-CL,pt-BR,en}.json`

**Interfaces:**
- Consumes: `BudgetDocumentType` e `useUploadBudgetFile()` (Task 1); `AppDialog size="sm"` (Task 3).
- Produces: `BUDGET_DOCUMENT_TYPES: readonly BudgetDocumentType[]` (`['purchase_order',
  'invoice', 'receipt']`, a ordem dos cartões) e `budgetDocumentTag(type: string): { label: string
  | null; severity?: 'info' | 'success'; tone?: 'accent' }` (`purchase_order` → `info`, `invoice`
  → `tone: 'accent'`, `receipt` → `success`; fora do enum → `label: null`, quem renderiza cai na
  tag `secondary` com o valor cru); `label` é a chave `budget.documentType.<tipo>`.
- Produces: `useBudgetDocumentUpload(budgetId: number)` →
  `{ visible, open(), close(), type: BudgetDocumentType | null, setType(t), file: File | null,
  pickFile(e: FileUploadHandlerEvent), sizeError: string | null, onSizeReject(msg: string), error:
  string | null, pending: boolean, canSubmit: boolean, submit() }`.
- Produces: `BudgetDocumentUploadDialog({ u }: { u: ReturnType<typeof useBudgetDocumentUpload> })`
  — molde do `BudgetOverlays` com `d`: o componente só consome.

- [ ] **Step 1: Testes que falham.**
  - `useBudgetDocumentUpload.test.tsx` (`renderHook` + `QueryClientProvider`, mock de
    `../api/useCommercialFiles`): `canSubmit` falso sem tipo, falso sem arquivo, verdadeiro com os
    dois; `submit()` chama `mutate` com `{ budgetId: 7, type: 'purchase_order', file }`; trocar o
    tipo depois de escolher o arquivo envia o tipo novo; no `onError` o `visible` segue `true` e
    `type`/`file` ficam (Review Focus 2); o sucesso fecha (`visible` falso); `close()` e o sucesso
    zeram tipo, arquivo e erros, e reabrir começa limpo (Review Focus 1).
  - `BudgetDocumentUploadDialog.test.tsx` (hook mockado por prop): três cartões na ordem de
    `BUDGET_DOCUMENT_TYPES`, nenhum com `aria-pressed="true"`; "Subir" desabilitado sem
    `canSubmit`; o nome do arquivo escolhido aparece; o `error` aparece dentro do diálogo; com
    `pending`, o Cancelar fica desabilitado e o diálogo não é fechável (sem botão "Cerrar" no
    header) (Review Focus 3).
  - `FileList.test.tsx`: com `showType`, a linha `invoice` mostra a tag `budget.documentType.invoice`
    e a linha `foo` mostra a tag `foo` (Review Focus 4); sem `showType` (o caso do `QuoteRow`),
    nenhuma tag.
- [ ] **Step 2:** `pnpm -C frontend exec vitest run src/features/commercial` → FAIL.
- [ ] **Step 3: Implementar.**
  - Hook: estado do diálogo, tipo, arquivo e `sizeError`; `pickFile` guarda `e.files[0]` e chama
    `e.options.clear()` (o `AppFileUpload` é `auto`: o handler só guarda, não envia);
    `error` = `message` do `useMutationErrors([upload.error])`; `close()` faz `upload.reset()` e
    zera o estado.
  - Diálogo: `AppDialog size="sm"`, título `budget.uploadTitle`, `closable` e `closeOnEscape`
    `!pending`; corpo com o rótulo `budget.fileTypeLabel`, os três `AppSelectableCard` (rótulo
    do tipo, `selected` = tipo atual, `onToggle` = `setType`), o `AppFileUpload` (`chooseLabel` =
    `budget.chooseFile`, `onSizeReject`, `uploadHandler={pickFile}`), o nome do arquivo e os
    `FormErrorBanner` de `error` e `sizeError`; footer Cancelar (`text`) │ Subir (`variant="primary"`,
    `pi pi-upload`, `disabled={!canSubmit}`, `loading={pending}`).
  - Card: recebe `budgetId`, `files`, `onRemove`, `fileError`; chama `useBudgetDocumentUpload`;
    a ação do header é um botão `budget.uploadDocument` no mesmo variant do botão de ação do
    `BudgetQuotesCard`, que abre o diálogo; renderiza o diálogo e `<FileList showType … />`.
  - `useBudgetDetail`: saem `fileType`, `setFileType`, `handleUpload`, `uploadPending`,
    `fileSizeError`, `onFileSizeReject` e o `useUploadBudgetFile`; `fileError` passa a ser só o
    do `removeFile`. `BudgetDetailPage` passa `budgetId` ao card.
  - `FileList`: prop `showType?: boolean`; com ela, a `AppTag` do `budgetDocumentTag` vai no slot
    `actions`, antes do `AppFileActions`.
  - Locales: `budget.documentType.{purchase_order,invoice,receipt}` (es-CL "Orden de compra",
    "Factura", "Comprobante"; pt-BR "Ordem de compra", "Fatura", "Comprovante"; en "Purchase
    order", "Invoice", "Receipt"), `budget.uploadTitle` (= o texto do `budget.uploadDocument` de
    cada locale), `budget.chooseFile` ("Elegir archivo", "Escolher arquivo", "Choose file"); saem
    `budget.fileTypeInvoice` e `budget.fileTypeReceipt`.
- [ ] **Step 4:** `pnpm -C frontend lint`, `pnpm -C frontend test`, `pnpm -C frontend build` verdes.
- [ ] **Step 5:** commit `feat(43): diálogo de upload por tipo e tag na lista de documentos`.

### Task 6: Verificação no navegador, P-94 e gate completo

**Files:**
- Create: `docs/superpowers/blocos/43-frontend-dialogos-proporcionais-e-tipo-de-documento/smoke.md`
- Modify (só se a medição reprovar): `frontend/src/features/identity/components/Student/StudentDialog.tsx`

- [ ] **Step 1:** gate fresco: `docker compose exec -T app php artisan test` (suíte inteira),
  `pnpm -C frontend lint`, `pnpm -C frontend test`, `pnpm -C frontend build`. Tudo verde.
- [ ] **Step 2:** stack da lane: `docker compose exec -T app php artisan migrate:fresh --seed
  --force`; Vite em background (`pnpm -C frontend dev`, porta 5176); login `admin@lotus.cl` /
  `senha123`; navegador pela skill `playwright-cli`, sempre em `http://localhost:5176`.
- [ ] **Step 3: P-94.** Copiar o `medir.cjs` do Apêndice A de
  `docs/superpowers/audits/2026-09-27-item23-medicoes.md` para o scratchpad, apontar para `:5176`
  e `:8083` e medir, com um alumno que tenha turma, a linha `DIALOGO` em 1024×768: `scroll` =
  `frame`. Se reprovar, o `StudentDialog` passa `size={mode === 'view' ? 'lg' : 'md'}`, mede de
  novo e commita `fix(43): diálogo do alumno em lg no modo ver`.
- [ ] **Step 4: Conferir e capturar** (scratchpad, caminho absoluto), em 1024×768 e 1440×900, tema
  claro e escuro:
  1. Alumno criar e ver: Nome │ RUT e E-mail │ Teléfono lado a lado, sem rolagem lateral;
  2. Operación › matricular: passo 1 e passo 2 (RUT │ Nome, E-mail │ Teléfono), botões no footer
     navy; RUT de outro cliente abre o aviso âmbar;
  3. orçamento: subir um documento de cada tipo, a tag na lista; arquivo de tipo recusado mostra o
     erro dentro do diálogo, que não fecha;
  4. uma confirmação de cada severidade: aprovar cotização (`confirm`), mover aluno (`warning`),
     arquivar/eliminar (`danger`) — sem maximizar, 28rem;
  5. preview de arquivo (`lg`): maximiza e ocupa a tela; `sm`/`md` sem botão de maximizar;
  6. Cliente, Usuario e Redator (`FormPhotoRow`): sem regressão de layout; header do `QuoteWizard`
     e `headerExtra` do `CrudDialog` legíveis sobre o navy.
- [ ] **Step 5:** `Skill(lotus-ui-review)` nas telas do DoD 9. O `danger` a 3,76:1 é resíduo
  declarado da `P-74` (spec J10); outro achado se corrige aqui ou se registra no `smoke.md`.
- [ ] **Step 6:** `smoke.md` com o visto em cada item, as medições (a linha `DIALOGO` da `P-94`
  entra literal, para o fechamento da pendência no `/finalizar-bloco`) e os caminhos das capturas;
  commit `docs(43): smoke no navegador`.

---

## Grupos paralelos

| Grupo | Tasks | Files: disjuntos | Aresta Consumes/Produces |
|---|---|---|---|
| G1 | 1, 2 | sim — Task 1 toca backend, `generated.ts`, `useCommercialFiles`, `useBudgetDetail` e `BudgetDocumentsCard`; Task 2 toca `shared/ui/{AppDialog,AppTag,ConfirmDialog}`, os três diálogos migrados e as locales | nenhuma entre elas |
| G2 | 4, 5 | sim — Task 4 toca `FormPhotoRow`, campos de identidade e três diálogos de `Enrollment/`; Task 5 toca `features/commercial/**` e as locales | nenhuma entre elas (as duas consomem a Task 3; a 5 consome também a 1) |

Ordem: G1 → Task 3 → G2 → Task 6. A Task 3 fica fora de grupo porque toca `AppDialog.tsx`
(também da Task 2) e os três diálogos de `Enrollment/` (também da Task 4). A Task 6 precisa de
todas.

Task fora de grupo executa e revisa uma a uma.

## Handoff de execução

- **executor:** `claude`. O bloco toca as leis 3, 6 e 7, muda primitivos de `shared/ui` com
  fan-out em 25 consumidores e pede julgamento visual medido no navegador; não é mecânico com paths
  fechados.
- **Sessão:** modelo `opus`, esforço da sessão, na lane
  `/home/jvbat/projetos/lotus-43-frontend-dialogos-proporcionais-e-tipo-de-documento` (offset +3).
- **Papéis** (`.claude/papeis.md`):
  - `implementador-integracao` nas Tasks 1 a 5 (todas multi-arquivo);
  - `revisor-task` por task, `re-revisor` nas rodadas de correção e `corretor-tardio` nas rodadas
    4 e 5;
  - `revisor-branch` ao fim.
  - A Task 6 roda na própria sessão: precisa do stack, do navegador e da skill `lotus-ui-review`.
- **paths_autorizados:** não se aplica (`executor: claude`).
