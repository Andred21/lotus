# Bloco 65 — Navegação, sessão e formulários — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** estado de lista e abas na URL, voltar pelo histórico, sessão expirada de volta ao login, painel fresco, formulários protegidos e com feedback, e o gerador de tema com contraste no escuro e info em índigo.

**Architecture:** consome o data router, o `IconName` e o `useUnsavedChangesGuard` do bloco 64. Estado de lista vive na URL por um hook de `shared/hooks`; a sessão expira por um marcador idempotente no `sessionStore`; os formulários derivam `dirty` do próprio estado e ligam a guarda.

**Tech Stack:** React 19, TS, Vite, react-router-dom 7.18, TanStack Query 5, Zustand, PrimeReact 10 via `shared/ui`, Tailwind 4, Vitest + Testing Library, `@phosphor-icons/react`.

**Spec:** `docs/superpowers/blocos/65-frontend-navegacao-sessao-e-formularios/spec.md` (recorte e D13), que aponta para a canônica `docs/superpowers/blocos/64-frontend-revisao-ui-ux-e-icones/spec.md` (compartilhada pelos blocos 64, 65 e 66; D1–D12). Detalhe `arquivo:linha` de cada ID: `docs/superpowers/audits/2026-11-26-ui-ux-pro-max.md`.

Caminhos abaixo: `src/` = `frontend/src/`; `FE` = `frontend/`.

**IDs da auditoria que este bloco fecha (16):** C-1, D-1, D-9, C-2, C-7, C-8, A-10, C-9, C-5, C-4, C-6, A-2, C-3, C-11, A-1, B-8 (o índigo de info é parte do B-2, que fecha no 66). O **D-6** não é deste bloco: D13 o leva à ficha 67.

**Depende:** bloco 64 mesclado na `main` (feito: `main@7381665f`).

## Global Constraints

- Lei 6: nenhuma feature (`src/features/**`) nem `src/app/**` importa `primereact` ou `@phosphor-icons/react`. Só `src/shared/ui/**`.
- `generated.ts` não muda: nenhum DTO muda neste bloco.
- CSS de tema gerado (`src/shared/styles/themes/lara-*-lotus.css`) só muda por `pnpm brand-theme`, nunca à mão.
- Toda chave nova de i18n entra nos três `src/shared/config/locales/{es-CL,pt-BR,en}.json` (o `parity.test.ts` cobra). Vocabulário no estilo `<dominio>.<acao>` existente; genéricos em `common.*`.
- Contraste de todo par tocado: ≥ 4,5:1 texto, ≥ 3:1 traço/controle, claro e escuro.
- ESLint `max-lines` 150 vale nos blocos que já o aplicam; arquivo que estourar se divide.
- Frontend: `cd frontend && pnpm vitest run <caminho>` por task; `pnpm lint`, `pnpm test` e `pnpm build` verdes no fim de cada task.
- DESIGN.md (raiz) muda na task que muda o comportamento que ele descreve.
- Commit por task, mensagem `tipo(<NN>): ...` com o número do bloco.

## Review Focus

1. Guarda de rascunho com falso positivo: abrir diálogo e fechar sem mexer, ou salvar e ser levado a outra rota, não pode pedir confirmação. Teste na Task 5.
2. Várias requisições recusadas ao mesmo tempo (painel com 3 queries) quando a sessão expira: um redirecionamento, uma mensagem, e o `from` com `search`. A própria tela de login devolvendo 401/422 não entra em loop. Testes na Task 3.
3. URL editada à mão ou antiga (`?page=-3&sort=xyz&archived=talvez`): a lista cai nos defaults, sem erro. Teste na Task 1.
4. `?tab=` desconhecido, ou de aba escondida por permissão (`/certificados?tab=emision` sem `certification.certificate.issue`): abre a primeira aba visível. Teste na Task 2.
5. Sessão que expira com um formulário sujo aberto: vai ao login sem o diálogo de descarte (salvar falharia de qualquer jeito). Teste na Task 3.

---

## Fase 1 — Navegação (T5)

### Task 1: Estado de listagem na URL (C-3, listas)

**Files:**
- Create: `src/shared/hooks/useTableUrlState.ts`, `src/shared/hooks/useTableUrlState.test.tsx`
- Create também: `src/features/operation/hooks/useTurmasArchived.test.tsx`
- Modify: `src/shared/hooks/useServerTable.ts` (opção `url?: { prefix?: string } | false`, default `false`), `src/shared/hooks/useServerTable.test.tsx`, `src/features/operation/hooks/useTurmasArchived.ts` (o `mode` sai do `useState` para a URL como `archived=1`, via `useTableUrlState`), `src/features/operation/hooks/useTurmasPage.ts`, `src/features/operation/components/OperationPage.tsx` (`status` na URL), `src/features/identity/hooks/useStudentsPage.ts`, `src/features/certification/hooks/useHistorial.ts` (`statusFilter`/`quoteFilter` na URL)

**Interfaces:**
- Produces:
  - `useTableUrlState(opts: { prefix?: string; enabled: boolean }): { read(key: string): string | null; write(patch: Record<string, string | null>): void }`.
    - `write` usa `setSearchParams(..., { replace: true })` e preserva `tab`.
    - Com `enabled: false`, `read` devolve `null` e `write` não faz nada.
  - Chaves: `q`, `page` (1-based na URL; `first` interno), `sort` (`campo` ou `-campo`), mais os filtros nomeados.
  - Valor inválido (página não-inteira ou < 1, campo de sort fora das colunas `sortable`) vira o default. Nunca é erro.

- [ ] **Step 1: Testes que falham** (`useTableUrlState.test.tsx` e `useServerTable.test.tsx`):
  - `busca, página e sort vão à URL e voltam dela`.
  - `URL inválida cai nos defaults`: `?page=-3&sort=xyz` dá `first 0` e `sort null`.
  - `tab sobrevive à escrita da lista`.
  - `prefixo isola duas tabelas`: `b_q` e `c_q`.
  - `desligado não lê nem escreve`.
  - `archived=1 restaura o modo arquivado` e `voltar ao ativo remove archived da URL` (`useTurmasArchived.test.tsx`).
- [ ] **Step 2: Rodar** → FAIL. **Step 3:** Implementar e ligar nas três listas (`url: {}`) e no modo arquivado de turmas. O modo de turmas mora em `useTurmasArchived` (a raiz que pagina compõe as peças sem o `useArchivedPage`); a mudança vai lá. **O `useArchivedPage` não muda:** ele serve as raízes que não paginam (clientes, orçamentos, cursos, redatores, usuários, e as listas internas de cotação e matrícula), quase todas em páginas com abas e com a fonte no pai, que precisariam de chave por aba. Fica fora deste bloco, e a Task 10 registra o recorte no `fechamento.md` (linha do C-3). Lista em aba não montada não escreve: o `renderActiveOnly` já desmonta.
- [ ] **Step 4: Rodar** `pnpm vitest run src/shared/hooks src/features/operation src/features/identity src/features/certification` → PASS.
- [ ] **Step 5: Commit** `feat(65): busca, filtro, página e sort na URL`.

### Task 2: "Volver" pelo histórico e abas na URL (C-3, voltar; C-11)

**Files:**
- Create: `src/shared/hooks/useBackNavigation.ts`, `src/shared/hooks/useUrlTab.ts`, `src/shared/hooks/navigationHooks.test.tsx`
- Modify: `src/features/operation/hooks/useTurmaDetail.ts:43`, `src/features/commercial/hooks/useBudgetDetail.ts:102`, `src/features/operation/components/Turma/TurmaCreatePage.tsx:15,22,23`, os pontos que navegam da lista ao detalhe (grep `navigate(\`/operacion/turmas/` e `navigate(\`/comercial/presupuestos/` em `src/features`), `src/features/commercial/components/CommercialPage.tsx`, `src/features/certification/components/CertificatesPage.tsx`, `src/features/identity/components/AdministracionPage.tsx`, `src/features/identity/components/PeoplePage.tsx`

**Interfaces:**
- Consumes: as listas na URL (Task 1). O detalhe recebe a URL completa da lista.
- Produces:
  - `backState(location: Location): { backTo: string }`, que a lista passa em `navigate(path, { state })`.
  - `useBackNavigation(fallback: string): () => void`: com `state.backTo`, faz `navigate(-1)`; sem ele, `navigate(fallback)`.
  - `useUrlTab<T extends string>(tabs: readonly T[], visible?: readonly T[]): { tab: T; index: number; setTab(next: T | number): void }`.
    - `?tab=` desconhecido ou invisível vira a primeira aba visível.
    - A escrita usa `replace`. O índice é relativo às abas visíveis.

- [ ] **Step 1: Testes que falham:**
  - `volver com backTo volta no histórico e reencontra a busca`.
  - `volver sem backTo vai ao fallback`.
  - `tab inválida ou invisível abre a primeira visível`.
  - `trocar de aba usa replace`.
  - `salvar a criação substitui a entrada`: depois do `onSaved`, `navigate(-1)` não volta ao formulário de criação.
- [ ] **Step 2: Rodar** → FAIL. **Step 3:** Implementar.
  - `onSaved` do `TurmaCreatePage` usa `navigate(path, { replace: true })` e chama `allowNavigation()` (bloco 64, Task 9) antes, quando a Task 5 ligar a guarda. Deixe o ponto marcado.
  - Chaves das abas: comercial `budgets|clients`; certificados `emision|historial`; administración `users|roles|configuracion`; personas `redatores|students`.
- [ ] **Step 4: Rodar** → PASS. **Step 5: Commit** `feat(65): voltar pelo histórico e abas na URL`.

## Fase 2 — Sessão e dado fresco (T1)

### Task 3: Sessão expirada volta ao login com a URL inteira (C-1)

**Files:**
- Modify: `src/shared/api/axios.ts`, `src/shared/stores/sessionStore.ts`, `src/app/router/ProtectedRoute.tsx`, `src/features/identity/hooks/useLoginForm.ts`, `src/features/identity/components/Login/LoginForm.tsx` (aviso), `src/shared/lib/screenDetail.ts` (docblocks de ~25-45 e de `loadErrorHint`), `src/shared/hooks/useUnsavedChangesGuard.ts` e `src/shared/hooks/UnsavedChangesBlocker.tsx` (não bloqueia com `expired`; o filtro do router mora no segundo), `src/shared/hooks/useUnsavedChangesGuard.test.tsx`, locales ×3 (`auth.sessionExpired`)
- Create: `src/shared/api/authErrors.test.ts`

**Interfaces:**
- Consumes: `initCsrf()` (`src/shared/api/csrf.ts:11`).
- Produces:
  - `sessionStore`: campo `expired: boolean` e ação `expire(): void`, idempotente (só age se `status === 'authenticated'`). O `clear()` zera `expired`.
  - Interceptor:
    - 419 → `initCsrf()` e repete a requisição uma vez (marca `config._retried419`).
    - A repetição dá 419 ou 401 → `expire()`.
    - 401 → `expire()`.
    - Isentos (rejeitam normal, sem `expire`): `GET /api/me`, `/api/login`, `/api/logout`, e as rotas de senha de `src/features/identity/api/passwordApi.ts`, com os paths exatos lidos dali.
  - `ProtectedRoute`: `state={{ from: location.pathname + location.search }}`. O `useLoginForm` já navega para `from`.

- [ ] **Step 1: Testes que falham** (`authErrors.test.ts`, com o adapter do axios mockado):
  - `401 em rota autenticada expira a sessão`.
  - `três 401 simultâneos expiram uma vez só`: spy em `expire` com efeito único.
  - `419 renova CSRF e repete uma vez`: sucesso na repetição não expira.
  - `419 duas vezes expira`.
  - `401 do /api/me e do /api/login não expira`.
  - `401 do logout não expira`.
  - Em `ProtectedRoute`/`AppRouter.test.tsx`: `login devolve à URL com search`, de `/certificados?tab=historial` ao login e de volta.
  - `tela de login mostra aviso de sessão expirada`.
  - `sessão expirada com rascunho vai ao login sem diálogo` (Review Focus 5): com `dirty` e `expired`, o `useUnsavedChangesGuard` deixa a navegação passar.
- [ ] **Step 2: Rodar** → FAIL. **Step 3:** Implementar. Os docblocks de `screenDetail.ts` passam a descrever o fluxo real.
- [ ] **Step 4: Rodar** → PASS. **Step 5: Commit** `fix(65): sessão expirada volta ao login com a URL inteira`.

### Task 4: Painel refaz ao voltar à aba e sinaliza a troca de período (D-1, D-9)

**Files:**
- Modify: `src/app/pages/Dashboard/useDashboard.ts:95-120` (`refetchOnWindowFocus: true`, `placeholderData: keepPreviousData`, devolve `refreshing`), `src/app/pages/Dashboard/DashboardPage.tsx`, `src/app/pages/Dashboard/admin/AdminView.tsx` (prop `refreshing`)
- Test: `src/app/pages/Dashboard/useDashboard.test.tsx`, `src/app/pages/Dashboard/admin/AdminView.test.tsx` (ambos existem; casos novos entram neles)

**Interfaces:**
- Produces: `useDashboard(period)` passa a incluir `refreshing: boolean` (= `isFetching && isPlaceholderData`). `AdminView` recebe `refreshing` e aplica `aria-busy` e `opacity-60` na seção de séries e rankings.

- [ ] **Step 1: Testes que falham:**
  - `foco na janela refaz o painel`: `focusManager.setFocused(true)` dispara o fetch.
  - `troca de período mantém o dado anterior marcado como ocupado`: `aria-busy="true"` enquanto a query nova não resolve.
- [ ] **Step 2–4:** FAIL → implementar → PASS.
- [ ] **Step 5: Commit** `fix(65): painel refaz no foco e sinaliza troca de período`.

## Fase 3 — Formulários e feedback (T2, T3)

### Task 5: Guarda de rascunho nos formulários (C-2, diálogo)

**Files:**
- Modify: `src/shared/hooks/useEntityForm.ts` (devolve `dirty`), `src/shared/hooks/useCrudForm.ts` (repassa `dirty`), `src/shared/ui/CrudDialog/CrudDialog.tsx` (prop `dirty?: boolean`; Fechar, Cancelar, X e Esc passam por `confirmDiscard`; renderiza `DiscardChangesDialog`), `src/features/commercial/hooks/useQuoteForm.ts`, `src/features/commercial/components/Budget/QuoteWizard.tsx`, `src/features/operation/hooks/useTurmaConfigForm.ts`, `src/features/operation/components/Turma/TurmaConfigCard.tsx`, `src/features/operation/components/Turma/TurmaCreatePage.tsx`, os call sites de `CrudDialog` que não usam `useCrudForm` (grep `<CrudDialog`)
- Test: `src/shared/ui/CrudDialog/CrudDialog.test.tsx`, `src/shared/hooks/useCrudForm.test.ts`, `src/features/commercial/components/Budget/QuoteWizard.onlyUf.test.tsx` (ou um irmão `QuoteWizard.guard.test.tsx`), `src/features/operation/components/Turma/TurmaConfigCard.test.tsx`

**Interfaces:**
- Consumes: `useUnsavedChangesGuard`, `DiscardChangesDialog` (bloco 64, Task 9).
  - **Quem consome monta `<DiscardChangesDialog {...guard.dialogProps} />`.** É o `DiscardChangesDialog` que renderiza `dialogProps.blocker`, o blocker do router, que só existe enquanto `dirty` (rodada final do 64, I-1: o router consulta só o último blocker registrado e `useBlocker` registra mesmo com `dirty=false`, então uma guarda limpa sempre montada anularia a suja). Sem montar o diálogo, a navegação do router não é guardada; só o `beforeunload` e o `confirmDiscard` valem. Toda tela e todo `CrudDialog` que ligar a guarda precisa renderizá-lo. Duas guardas sujas ao mesmo tempo não são suportadas (vale a última montada).
  - **`allowNavigation()` se chama no `onSuccess`, imediatamente antes do `navigate`.** A liberação é consumida pela primeira navegação avaliada (de `pathname` ou só de query) e é descartada se o rascunho já estiver limpo ao fim do render.
- Produces: `useEntityForm(...)` passa a devolver `dirty: boolean`. É uma comparação profunda de `form` contra o valor inicial do último reset, e volta a `false` no reset.

- [ ] **Step 1: Testes que falham:**
  - `fechar sem mudança não pergunta`, para Esc, X, Cancelar e Fechar.
  - `fechar com mudança pergunta, e Descartar fecha`.
  - `desfazer a mudança à mão volta a não perguntar`.
  - `salvar com sucesso fecha sem perguntar`.
  - `wizard com mudança pergunta no Cancelar`.
  - `criação de turma com mudança pergunta no Volver; salvar navega sem perguntar`.
- [ ] **Step 2–4:** FAIL → implementar (no `onSaved` da criação, `allowNavigation()` antes do `navigate`) → PASS.
- [ ] **Step 5: Commit** `feat(65): aviso antes de descartar rascunho`.

### Task 6: Enter envia, erro de campo aninhado e erro que some ao corrigir (A-10, C-7, C-8)

**Files:**
- Modify: `src/shared/ui/CrudDialog/CrudDialog.tsx` (corpo em `<form onSubmit>`; Salvar `type="submit"`; Enter em `textarea` não envia), `src/shared/ui/FormField/FormField.tsx` (`NestedField` com `FieldContext`; `FormErrorSummary` com `role="alert"` e `tabIndex={-1}`), `src/shared/ui/FormField/fieldContext.ts`, `src/shared/hooks/useEntityForm.ts` (`useMutationErrors`: erro do campo editado some), `src/features/catalog/components/Course/ModuleCard.tsx:29-39`
- Test: `CrudDialog.test.tsx`, `FormField.test.tsx`, `src/shared/hooks/useCrudForm.test.ts`

**Interfaces:**
- Produces: `useMutationErrors(errors[])` passa a devolver também `clearField(name: string): void`, chamado pelo `set` do `useEntityForm` no campo alterado.

- [ ] **Step 1: Testes que falham:**
  - `Enter num input envia`.
  - `Enter em textarea não envia`.
  - `NestedField inválido marca aria-invalid e recebe o foco do primeiro erro`.
  - `resumo de erros é alert e focável`.
  - `editar o campo limpa o erro 422 dele e só dele`.
- [ ] **Step 2–4:** FAIL → implementar → PASS.
- [ ] **Step 5: Commit** `fix(65): Enter envia, erro aninhado acessível, erro some ao corrigir`.

### Task 7: Obrigatório marcado, ajuda e motivo de desabilitado (C-9, A-2 motivo)

**Files:**
- Modify: `src/shared/ui/FormField/FormField.tsx` e `src/shared/ui/FormField/useFormField.tsx` (props `required?: boolean`, `hint?: string`), `src/shared/ui/FormField/fieldContext.ts` (`aria-required`, `describedBy` junta hint e erro), os formulários de cadastro (call sites de `Field`/`FormField` em `src/features/**`, um por entidade), `src/features/certification/components/Historial/RevokeDialog.tsx`, `src/features/certification/components/Emission/ConfirmIssueDialog.tsx`, `src/features/commercial/components/Budget/QuoteWizard.tsx`, `src/features/certification/components/Historial/HistorialExportActions.tsx`, `DESIGN.md` §Inputs/Fields (asterisco, `aria-required`, ajuda abaixo em `--text-color-secondary`), locales ×3 (motivos)
- Test: `FormField.test.tsx`, `fieldAssociation.test.tsx`, `HistorialTable.export.test.tsx`, e um teste por diálogo tocado

**Interfaces:**
- Produces: `FormFieldProps.required`, `FormFieldProps.hint`, e os mesmos em `FieldProps` do `useFormField`.

- [ ] **Step 1: Testes que falham:**
  - `required põe asterisco e aria-required`.
  - `hint liga por aria-describedby, junto com o erro`.
  - `Revocar desabilitado mostra o motivo visível`.
  - `Emitir sem redator mostra o motivo visível`.
  - `ZIP desabilitado mostra o motivo em texto visível`.
- [ ] **Step 2:** FAIL. **Step 3:** Implementar. O obrigatório de cada campo sai da regra `required` do `FormRequest` correspondente em `backend/app/**/Requests/`. Campo sem `FormRequest` equivalente fica sem marca, e o caso vai no commit.
- [ ] **Step 4:** PASS. **Step 5: Commit** `feat(65): obrigatório marcado e motivo de botão desabilitado`.

### Task 8: Sucesso dito, confirmação nomeada, erro do gate no diálogo, nome truncado acessível (C-5, C-4, C-6, A-2)

**Files:**
- Modify: `src/shared/hooks/useCrudForm.ts` (toast em criar e editar), `src/shared/hooks/useArchiveAction.ts` e `src/shared/hooks/useArchiveToasts.ts` (o `failed` deixa de ir a toast quando há diálogo aberto; devolve o erro), `src/shared/ui/ArchiveConfirmDialog/ArchiveConfirmDialog.tsx` (prop `name: string` no título e no corpo; `error` no slot do `ConfirmDialog`), os call sites de `ArchiveConfirmDialog` (grep), `src/features/commercial/hooks/useBudgetDetail.ts` (toast em aprovar, rejeitar e remover), `src/features/commercial/components/Budget/BudgetOverlays.tsx:28-63` (confirmação com folio; "Eliminar presupuesto" vira arquivar, com o texto e a severidade do arquivamento), `src/features/operation/components/Document/ConcludePanel.tsx:74-75` (nome da turma), `src/features/certification/components/Historial/HistorialDialogs.tsx:32` (toast ao revogar), `src/shared/ui/IdentityCell/IdentityCell.tsx:91-95` (nome completo acessível: `AppTooltip` no foco e no hover, mais o `aria-label` da célula), locales ×3
- Test: `useCrudForm.test.ts`, `ArchiveConfirmDialog.test.tsx` (novo), `BudgetDetailPage.test.tsx`, `ConcludePanel.test.tsx`, `IdentityCell.test.tsx`, `HistorialTable.test.tsx`

**Interfaces:**
- Produces: `ArchiveConfirmDialog` ganha `name: string` (obrigatório) e `error?: string | null`. `useArchiveAction` devolve `error: string | null`, limpo ao reabrir.

- [ ] **Step 1: Testes que falham:**
  - `criar e editar mostram toast de sucesso`.
  - `revogar mostra toast`.
  - `aprovar e rejeitar cotização mostram toast`.
  - `confirmação de arquivar nomeia o registro`.
  - `erro do gate aparece no diálogo, que fica aberto`.
  - `remover orçamento usa o texto de arquivar e não danger`.
  - `nome truncado tem o texto completo acessível`.
- [ ] **Step 2–4:** FAIL → implementar → PASS.
- [ ] **Step 5: Commit** `fix(65): sucesso dito, confirmação nomeada, erro do gate no diálogo`.

## Fase 4 — Tema (T4, parte)

### Task 9: Gerador de tema: borda escura, info índigo, tag e folio 600 (A-1, D7, B-8)

**Files:**
- Modify: `FE/scripts/generate-brand-theme.mjs`:
  - `CINZA_BORDA` aplicada também no dark, a :301-305 e :517-520, e com o comentário reescrito.
  - Passada nova: `.p-message-info`, `.p-toast-message-info`, `.p-tag.p-tag-info` e `.p-badge.p-badge-info` em índigo, 700 no claro e 300 no escuro, para tinta e borda, com o fundo composto de `--indigo-500`.
  - Passada nova: `.p-tag { font-weight: 600 }`.
- Modify também:
  - Gerados: `src/shared/styles/themes/lara-light-lotus.css` e `src/shared/styles/themes/lara-dark-lotus.css`, com `pnpm brand-theme`.
  - `src/shared/styles/brand-theme.css`: `--tone-info-ink` vai a `var(--indigo-700)` no claro e `var(--indigo-300)` no escuro.
  - `src/shared/ui/AppTag/tones.ts` e `src/shared/ui/AppCard/AppCard.tsx:21`: info com `--indigo-500`.
  - `src/shared/ui/RecordCode/RecordCode.tsx:14`: `font-semibold` (B-8 inteiro neste bloco).
  - `DESIGN.md`: :306 sem "no claro"; Severity com info índigo; Chips/Tags 12px/600.
- Test: `FE/tests/brand-theme.test.ts`, `FE/tests/tone-ink.test.ts`, `FE/tests/brand-ink.test.ts`, `src/shared/ui/AppTag/AppTag.test.tsx`, `src/shared/ui/AppCard/AppCard.test.tsx`, `src/shared/ui/RecordCode/RecordCode.test.tsx` (`RecordCode é 600`)

**Interfaces:** nenhuma.

- [ ] **Step 1: Testes que falham:**
  - Em `brand-theme.test.ts`: `borda de controle do escuro é #64748b`, `info de message/toast/tag/badge é índigo nos dois temas` e `p-tag pesa 600`.
  - Em `tone-ink.test.ts`: `tone-info-ink é índigo e mede ≥ 4,5:1 sobre o card tingido, claro e escuro`, com o cálculo de contraste já existente no arquivo.
- [ ] **Step 2: Rodar** `pnpm vitest run tests` → FAIL. **Step 3:** Mudar o gerador e rodar `pnpm brand-theme`. Mudar os tokens e os tons.
- [ ] **Step 4:** PASS. O teste de drift (`brand-theme.test.ts`) confirma que o CSS commitado é o gerado.
- [ ] **Step 5: Commit** `fix(65): contraste do tema escuro, info em índigo, tag 600`.

## Fase 5 — Passada visual

### Task 10: Passada visual e quadro de fechamento do bloco 65

**Files:**
- Create: `docs/superpowers/blocos/65-frontend-navegacao-sessao-e-formularios/visual/<ID>.png` (uma por achado visual), `docs/superpowers/blocos/65-frontend-navegacao-sessao-e-formularios/fechamento.md` (uma linha por ID deste bloco: C-1, D-1, D-9, C-2, C-7, C-8, A-10, C-9, C-5, C-4, C-6, A-2, C-3, C-11, A-1, B-8 — com a prova: teste (arquivo e nome), captura (caminho) ou "veredito do João"; e, fora do quadro, uma linha "D-6 — levado à ficha 67 (D13 da spec do 65)")

**Interfaces:**
- Consumes: Tasks 1–9.

- [ ] **Step 1:** Subir o stack da lane (`docker compose up -d`, offset da lane no `.env`). Se o `artisan test` fatalizar por memória, é a P-57 (imagem `app` velha): `docker compose build app`.
- [ ] **Step 2:** Skill `lotus-ui-review` em: Dashboard, Comercial e detalhe de orçamento (wizard), Operación (lista, detalhe e criação de turma), Certificados (Historial, revogar, emitir), Personas, Administración, login com sessão expirada — 1440×900, 1024×768 e 390×844, claro e escuro. A varredura completa fica no scratchpad.
- [ ] **Step 3:** Por achado visual (A-1, A-2, B-8, C-4, C-6, C-9), versionar só a captura que prova o veredito, em PNG.
- [ ] **Step 4:** Regressão vista na passada vira correção na task dona, com commit próprio, antes de seguir.
- [ ] **Step 5:** Escrever o `fechamento.md`; levar ao João, numa rodada só, os IDs que nem teste nem captura fecham.
- [ ] **Step 6:** Gate final: `pnpm lint`, `pnpm test`, `pnpm build` e `docker compose exec -T app php artisan test` verdes.
- [ ] **Step 7: Commit** `docs(65): passada visual e quadro de fechamento`.

## Grupos paralelos

| Grupo | Tasks | Files: disjuntos | Aresta Consumes/Produces |
|---|---|---|---|
| G1 | 1, 4, 9 | sim, nos três pares: hooks de lista (`useTableUrlState`, `useServerTable`, `useTurmasArchived`, hooks de turmas/alunos/Historial, `OperationPage`) × `src/app/pages/Dashboard/**` × gerador de tema, temas gerados, `brand-theme.css`, `AppTag/tones.ts`, `AppCard`, `RecordCode`, `DESIGN.md`, `FE/tests/*`; nenhuma das três toca locales | nenhuma: a 2 consome a 1, mas está fora do grupo |

Task fora de grupo executa e revisa uma a uma (as demais compartilham locales ou wrappers de `shared/ui`).

## Handoff de execução

- `executor: claude`. O bloco decide padrão em `shared/`, toca a lei 6 (só `shared/ui` importa PrimeReact/Phosphor) e exige julgamento visual na Task 10; não há paths fechados para o Codex.
- Sessão: `opus`, esforço `high`.
- Execução: `superpowers:subagent-driven-development`, com `superpowers:test-driven-development` em cada task (o `/executar-bloco` roteia).
- Papéis (`.claude/papeis.md`): `implementador-mecanico` nas Tasks 4; `implementador-integracao` nas Tasks 1, 2, 3, 5, 6, 7, 8 e 9; a Task 10 é da sessão (navegador e conversa com o João); `revisor-task` em toda task, `re-revisor` nas rodadas de correção, `corretor-tardio` nas rodadas 4–5, `revisor-branch` ao fim.
