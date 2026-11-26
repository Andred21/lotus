# Bloco 64 — Revisão UI/UX e ícones Phosphor — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** fechar os 46 achados da auditoria ui-ux-pro-max e trocar PrimeIcons por Phosphor atrás de um registro em `shared/ui`.

**Architecture:** nove fases na ordem da spec (D11). Ícones primeiro, por uma ponte tipada (`IconProp`) que aceita nome novo e classe legada até a última call site migrar. Depois o roteador vira data router, o que habilita `useBlocker` (guarda de rascunho) e `lazy` (code splitting). O resto são correções locais em `shared/ui`, `shared/hooks`, no gerador de tema e numa query do backend.

**Tech Stack:** React 19, TS, Vite, react-router-dom 7.18, TanStack Query 5, Zustand, PrimeReact 10 via `shared/ui`, Tailwind 4, Vitest + Testing Library, `@phosphor-icons/react`, Laravel 13 (PHPUnit).

**Spec:** `docs/superpowers/blocos/64-frontend-revisao-ui-ux-e-icones/spec.md`. Detalhe `arquivo:linha` de cada ID: `docs/superpowers/audits/2026-11-26-ui-ux-pro-max.md`.

Caminhos abaixo: `src/` = `frontend/src/`; `FE` = `frontend/`.

## Global Constraints

- Lei 6: nenhuma feature (`src/features/**`) nem `src/app/**` importa `primereact` ou `@phosphor-icons/react`. Só `src/shared/ui/**`.
- `generated.ts` não muda: nenhum DTO muda neste bloco (D-3 é frontend; D-2 mantém o shape de `MonthlyCountData`/`MonthlyAmountData`).
- CSS de tema gerado (`src/shared/styles/themes/lara-*-lotus.css`) só muda por `pnpm brand-theme`, nunca à mão.
- Toda chave nova de i18n entra nos três arquivos `src/shared/config/locales/{es-CL,pt-BR,en}.json` (o `parity.test.ts` cobra). Vocabulário: siga o estilo `<dominio>.<acao>` existente; genéricos em `common.*`.
- Contraste de todo par tocado: ≥ 4,5:1 texto, ≥ 3:1 traço/controle, claro e escuro.
- ESLint `max-lines` 150 vale nos blocos que já o aplicam; arquivo que estourar se divide.
- PHP: Pint só nos arquivos tocados (`cd backend && ./vendor/bin/pint <arquivos>`); testes no container da lane (`docker compose exec -T app php artisan test --filter=...`, stack com offset +1).
- Frontend: `cd frontend && pnpm vitest run <caminho>` por task; `pnpm lint`, `pnpm test` e `pnpm build` verdes no fim de cada task.
- DESIGN.md (raiz) muda na task que muda o comportamento que ele descreve.
- Commit por task, mensagem `tipo(64): ...`.

## Review Focus

1. Guarda de rascunho com falso positivo: abrir diálogo e fechar sem mexer, ou salvar e ser levado a outra rota, não pode pedir confirmação. Teste na Task 15.
2. Várias requisições recusadas ao mesmo tempo (painel com 3 queries) quando a sessão expira: um redirecionamento, uma mensagem, e o `from` com `search`. A própria tela de login devolvendo 401/422 não entra em loop. Testes na Task 13.
3. URL editada à mão ou antiga (`?page=-3&sort=xyz&archived=talvez`): a lista cai nos defaults, sem erro. Teste na Task 11.
4. `?tab=` desconhecido, ou de aba escondida por permissão (`/certificados?tab=emision` sem `certification.certificate.issue`): abre a primeira aba visível. Teste na Task 12.
5. Janela de painel que cruza a virada de ano e começa/termina no meio do mês, no fuso de Santiago: meses contínuos, sem duplicar nem pular. Teste na Task 23.

---

## Fase 1 — Ícones (T10)

### Task 1: `AppIcon` e o registro `IconName`

**Files:**
- Modify: `FE/package.json`, `FE/pnpm-lock.yaml` (`pnpm add @phosphor-icons/react`)
- Create: `src/shared/ui/AppIcon/AppIcon.tsx`, `src/shared/ui/AppIcon/icons.ts`, `src/shared/ui/AppIcon/index.ts`, `src/shared/ui/AppIcon/AppIcon.test.tsx`
- Modify: `src/shared/ui/index.ts` (uma linha `export * from './AppIcon'`)

**Interfaces:**
- Produces:
  - `type IconName` — união fechada dos nomes Lotus, derivada de `keyof typeof ICONS`.
  - `ICONS: Record<IconName, PhosphorIcon>` em `icons.ts`, um import nomeado por componente.
  - `AppIcon(props: AppIconProps)`, `AppIconProps = { name: IconName; weight?: 'regular' | 'fill'; size?: 'sm' | 'md' | 'lg'; label?: string; className?: string }`. Tamanhos: `sm` 14px, `md` 16px (default, o `1rem` de hoje), `lg` 24px. Sem `label`: `aria-hidden="true"`. Com `label`: `role="img"` e `aria-label`.

- [ ] **Step 1: Tabela de mapeamento.** No topo de `icons.ts`, um comentário com a tabela `pi-<nome> → IconName → Phosphor` cobrindo os 57 nomes do inventário. Nome Lotus é semântico (`close` para `pi-times`, `archive` para `pi-inbox`, `certificate` para `pi-verified`, `spinner` para `pi-spinner`, `chevronRight` para `pi-angle-right`). Dois `pi-*` que significam a mesma coisa colapsam num nome só.
- [ ] **Step 2: Teste que falha.** `AppIcon.test.tsx`:
  - `renderiza svg decorativo por padrão`: `aria-hidden="true"`, sem `role`.
  - `com label vira imagem nomeada`: `getByRole('img', { name: 'Cerrar' })`.
  - `weight fill repassa ao Phosphor`: o `svg` renderizado difere do `regular` (compare `innerHTML`).
  - `size md mede 16px`: atributo `width="16"`.
  - `todo IconName resolve um componente`: `Object.keys(ICONS).length >= 50`, e cada valor é função/objeto.
- [ ] **Step 3: Rodar.** `pnpm vitest run src/shared/ui/AppIcon` → FAIL (módulo inexistente).
- [ ] **Step 4: Implementar** `AppIcon` e `ICONS` conforme Interfaces.
- [ ] **Step 5: Rodar.** O mesmo comando → PASS. `pnpm build` verde.
- [ ] **Step 6: Commit** `feat(64): AppIcon e registro de ícones Phosphor`.

### Task 2: Wrappers de `shared/ui` e o shell aceitam `IconName`

**Files:**
- Create: `src/shared/ui/AppIcon/renderIcon.tsx`, `src/shared/ui/AppIcon/renderIcon.test.tsx`
- Modify (prop de ícone): `src/shared/ui/AppButton/AppButton.tsx`, `src/shared/ui/AppEmptyState/AppEmptyState.tsx`, `src/shared/ui/AppInputText/AppInputText.tsx`, `src/shared/ui/AppPassword/AppPassword.tsx`, `src/shared/ui/RowActions/RowActions.tsx` (+ `ArchiveRowActions` na mesma pasta), `src/shared/ui/AppFileActions/AppFileActions.tsx`, `src/shared/ui/ConfirmDialog/ConfirmDialog.tsx`, `src/shared/ui/ConfirmDialog/style.ts`, `src/shared/ui/AppTag/AppTag.tsx`, `src/shared/ui/AppFileUpload/AppFileUpload.tsx`, `src/shared/ui/AppMenu/AppMenu.tsx`, `src/shared/ui/AppFileRow/AppFileRow.tsx`
- Modify (`<i className="pi …">` interno): `AppErrorState`, `Timestamp`, `AppearanceControls`, `ArchiveSwitch`, `DetailHeader`, `CrudDialog`, `SignaturePreview`, `AppPhotoField`, `AppFileSlot`, `SearchableTableFrame`, `AppDownloadButton` (todos em `src/shared/ui/<Nome>/<Nome>.tsx`)
- Modify (nav): `src/shared/config/navigation.ts`, `src/app/layouts/Sidebar/SidebarItem.tsx`, `src/app/layouts/Sidebar/Sidebar.tsx`
- Test: os `*.test.tsx` das pastas acima que citam `pi-` (AppPassword, RowActions, Timestamp, AppFileSlot, AppFileUpload, ConfirmDialog, DetailHeader, SidebarItem)

**Interfaces:**
- Consumes: `AppIcon`, `IconName` (Task 1).
- Produces:
  - `type LegacyPrimeIcon = \`pi pi-${string}\`` e `type IconProp = IconName | LegacyPrimeIcon`. A ponte existe até a Task 6.
  - `renderIcon(icon: IconProp | undefined, opts?: { weight?: 'regular' | 'fill'; size?: AppIconProps['size'] }): ReactNode`. Para `IconName` devolve `<AppIcon>`; para legado, `<i className={icon} aria-hidden />`.
  - Todo prop de ícone citado acima passa a `IconProp`. O `AppButton` entrega `renderIcon(icon)` ao `icon` do Prime, que aceita nó. O `loadingIcon` default passa a `renderIcon('spinner')` com `animate-spin`.
  - `NavModule.icon: IconName`.

- [ ] **Step 1: Teste que falha.** `renderIcon.test.tsx`:
  - `nome novo vira AppIcon`: `renderIcon('close')` renderiza um `svg`.
  - `classe legada vira <i>`: `renderIcon('pi pi-check')` renderiza `i.pi.pi-check`.
  - `undefined não renderiza nada`.
- [ ] **Step 2: Rodar** `pnpm vitest run src/shared/ui/AppIcon` → FAIL.
- [ ] **Step 3: Implementar** `renderIcon` e trocar os tipos e renderizações dos wrappers listados. Todo uso **interno** de `shared/ui` e do shell passa a `IconName`. `SidebarItem`: ativo com `weight="fill"`, repouso `regular`. `ConfirmDialog/style.ts`: mapa por severity com `IconName`. Remova o comentário `grid!` de `ConfirmDialog.tsx:40` se o motivo (`.pi` sem camada) deixar de existir ali.
- [ ] **Step 4: Atualizar os testes** das pastas listadas: asserções sobre classe `pi-*` viram asserção sobre `svg` ou `aria-label`. Acrescente em `SidebarItem.test.tsx` o teste `item ativo usa peso fill`.
- [ ] **Step 5: Rodar** `pnpm vitest run src/shared/ui src/app/layouts` → PASS. Rodar `pnpm build` → verde, porque as call sites das features seguem válidas pelo legado.
- [ ] **Step 6: Commit** `refactor(64): wrappers de shared/ui aceitam IconName`.

### Task 3: Call sites de `app/`, `catalog` e `operation`

**Files:**
- Modify: todo arquivo de `src/app/**`, `src/features/catalog/**` e `src/features/operation/**` com `pi pi-` ou `pi-<nome>` (inventário: app 11, catalog 6, operation 13 arquivos, testes inclusos). Inclui `src/app/SessionBootstrap.tsx:15` (spinner), `src/app/layouts/Header/UserMenu.tsx:93`, `src/app/pages/Dashboard/DashboardItemRow.tsx:102`, `src/features/operation/components/Turma/PendingQuotesPanel.tsx:48` e `src/features/catalog/components/Course/CoursesTable.tsx:82`. Os dois `<i>` diretos das features viram `<AppIcon>`.

**Interfaces:**
- Consumes: `IconName`, `AppIcon` (barrel `@shared/ui`), `IconProp` (Task 2).
- Produces: nada.

- [ ] **Step 1:** Rode `grep -rlE "pi pi-|['\"]pi-" src/app src/features/catalog src/features/operation`. A lista é o escopo.
- [ ] **Step 2:** Troque cada string pelo `IconName` da tabela da Task 1. Ternários `archived ? 'pi pi-inbox' : 'pi pi-X'` viram `archived ? 'archive' : '<nome>'`.
- [ ] **Step 3:** O grep do Step 1 sai vazio.
- [ ] **Step 4:** `pnpm vitest run src/app src/features/catalog src/features/operation`, `pnpm lint` e `pnpm build` → verdes.
- [ ] **Step 5: Commit** `refactor(64): ícones Phosphor em app, catalog e operation`.

### Task 4: Call sites de `commercial`, `identity` e `certification`

**Files:**
- Modify: todo arquivo de `src/features/commercial/**`, `src/features/identity/**` e `src/features/certification/**` com `pi pi-` ou `pi-<nome>` (inventário: 12, 15 e 13 arquivos, testes inclusos). Inclui `src/features/commercial/lib/budgetDocumentType.ts` (`TagStyle.icon: IconName`).

**Interfaces:**
- Consumes: `IconName` (Task 1), `IconProp` (Task 2).
- Produces: nada.

- [ ] **Steps 1–4:** Os mesmos da Task 3, sobre estas três pastas.
- [ ] **Step 5: Commit** `refactor(64): ícones Phosphor em commercial, identity e certification`.

### Task 5: Ícones internos do PrimeReact pelos props dos wrappers

**Files:**
- Modify: `src/shared/ui/AppDialog/DialogFrame.tsx` (`closeIcon`, `maximizeIcon`), `src/shared/ui/AppDropdown/AppDropdown.tsx` (`dropdownIcon`, `clearIcon`, `filterIcon`), `src/shared/ui/AppCheckbox/AppCheckbox.tsx` (`icon`), `src/shared/ui/AppDataTable/AppDataTable.tsx` (ícones do paginador no `paginatorTemplate` existente, mais `sortIcon`), `src/shared/ui/AppDatePicker/AppDatePicker.tsx` (`icon`, `prevIcon`, `nextIcon`), `src/shared/ui/AppPassword/AppPassword.tsx` (`showIcon`, `hideIcon` como nó), `src/shared/ui/AppTabView/AppTabView.tsx` (`prevButton`/`nextButton` ou `pt` com ícone), `src/shared/ui/AppToast/AppToast.tsx` (ícone por severidade e fechar)
- Test: os testes existentes de cada pasta, mais um caso novo por wrapper.

**Interfaces:**
- Consumes: `AppIcon` (Task 1).
- Produces: nada.

- [ ] **Step 1: Testes que falham.** Um por wrapper, no arquivo de teste da pasta (crie se não existir): `usa ícone Phosphor no <papel>`. A asserção: o botão de fechar, a seta, o check ou o paginador contém um `svg` sem a classe `p-icon`.
- [ ] **Step 2: Rodar** → FAIL.
- [ ] **Step 3:** Passe `<AppIcon name=… />` em cada prop listado. Onde o Prime não tem prop (ex.: um ícone só renderizável por `pt`), use o `pt`. Onde nem isso existe, registre o caso no commit e mantenha o SVG do Prime.
- [ ] **Step 4: Rodar** `pnpm vitest run src/shared/ui` → PASS.
- [ ] **Step 5: Commit** `refactor(64): ícones internos do Prime trocados por Phosphor`.

### Task 6: Fim da ponte, sem `primeicons`, com catraca

**Files:**
- Modify: `src/shared/ui/AppIcon/renderIcon.tsx` (`IconProp = IconName`; o ramo legado sai), `src/shared/ui/AppIcon/renderIcon.test.tsx` (sai o caso legado), `FE/package.json`, `FE/pnpm-lock.yaml` (`pnpm remove primeicons`), `src/main.tsx` (sai a linha 5), `FE/eslint.config.js` (`no-restricted-imports` de `@phosphor-icons/react` fora de `src/shared/ui/**`, mesmo molde do bloco `primereact` ~744-840), `DESIGN.md` (§Navigation: "ícone Phosphor, `regular`; ativo `fill`"; §Components: subseção curta "Ícones" com a regra do registro)
- Create: `FE/tests/icons-ratchet.test.ts`

**Interfaces:**
- Consumes: Tasks 2–5 concluídas.
- Produces: nada.

- [ ] **Step 1: Teste que falha.** Em `icons-ratchet.test.ts`, no molde de `tests/chart-tokens.test.ts:118-121` (varredura recursiva com `readdirSync`):
  - `nenhuma classe PrimeIcons em src`: o regex `/\bpi pi-|['"\`]pi-[a-z]/` não casa nenhum arquivo `.ts`/`.tsx`/`.css` de `src` (exclua `src/shared/styles/themes/`, que é gerado).
  - `primeicons fora do package.json`: o `package.json` não contém `"primeicons"`.
  - `Phosphor só em shared/ui`: nenhum arquivo fora de `src/shared/ui/` contém `from '@phosphor-icons/react'`.
- [ ] **Step 2: Rodar** `pnpm vitest run tests/icons-ratchet.test.ts` → FAIL, porque o `package.json` ainda tem a dependência.
- [ ] **Step 3:** Fazer as mudanças listadas em Files.
- [ ] **Step 4: Rodar** o teste → PASS. `grep -rE "pi pi-|primeicons" FE --exclude-dir=node_modules` sem nada fora dos temas gerados. `pnpm lint`, `pnpm test` e `pnpm build` verdes.
- [ ] **Step 5: Commit** `feat(64): primeicons removido; catraca de ícones`.

## Fase 2 — Roteador e navegação

### Task 7: Data router com rotas `lazy`

**Files:**
- Modify: `src/app/router/AppRouter.tsx`
- Create: `src/app/router/routes.tsx` (a árvore, exportada para teste), `src/app/router/AppRouter.test.tsx`

**Interfaces:**
- Produces:
  - `routes: RouteObject[]`.
  - `AppRouter()`, que renderiza `<RouterProvider router={createBrowserRouter(routes)} />`, com o router criado uma vez, fora do render.
  - `type RouteHandle = { titleKey?: string; permission?: string }`, declarado em `routes.tsx` e consumido na Task 8.

- [ ] **Step 1: Teste que falha.** `AppRouter.test.tsx` monta `createMemoryRouter(routes, { initialEntries: [...] })` com sessão autenticada mockada no `sessionStore`:
  - `rota /operacion carrega a página lazy`: `findByRole('heading', …)` da OperationPage.
  - `/login com sessão autenticada redireciona para /`.
  - `/definir-clave/:token fica fora do bootstrap`: não chama `GET /api/me`.
- [ ] **Step 2: Rodar** → FAIL (`routes` não existe).
- [ ] **Step 3:** Mover a árvore para `routes.tsx` como objetos. `SessionBootstrap` e `ProtectedRoute` continuam como `element` das duas rotas-layout (spec §6, fase 2). Cada página entra por `lazy: () => import(...).then(m => ({ Component: m.X }))`. `LoginRoute` e o layout continuam estáticos. Os comentários de grupo de hoje são preservados. O `path: '*'` mantém o `Navigate`, que só muda na Task 8.
- [ ] **Step 4: Rodar** → PASS. Medir o `dist`: `pnpm build` e anotar o tamanho do chunk principal (gz) antes e depois na mensagem de commit (D-6).
- [ ] **Step 5: Commit** `refactor(64): data router com rotas lazy`.

### Task 8: Título por rota, foco no `<main>`, 404 e guard por módulo (C-12, C-10)

**Files:**
- Modify: `src/app/router/routes.tsx` (`handle` por rota, guard, 404), `src/app/layouts/AppLayout.tsx` (ref no `<main>`, hooks), `FE/index.html` (`<title>Lotus</title>` como fallback), `src/shared/lib/screenDetail.ts` e `src/shared/ui/AppErrorState/AppErrorState.tsx` (403 sem `onRetry`), locales ×3, o comentário de `AppRouter.tsx:53-55`
- Create: `src/app/router/useDocumentTitle.ts`, `src/app/router/useRouteFocus.ts`, `src/app/router/ModuleGuard.tsx`, `src/app/pages/Errors/NotFoundPage.tsx`, `src/app/pages/Errors/ForbiddenPage.tsx`, `src/app/router/routeChrome.test.tsx`

**Interfaces:**
- Consumes: `routes`, `RouteHandle` (Task 7); `usePermissions().can` (`src/shared/hooks/usePermissions.ts`); `NAV_MODULES` (`src/shared/config/navigation.ts`).
- Produces:
  - `useDocumentTitle(): void`: pega o `titleKey` do match mais profundo e escreve `` `${t(titleKey)} · Lotus` ``.
  - `useRouteFocus(ref: RefObject<HTMLElement>): void`: foca o `<main>` quando o `pathname` muda, nunca na montagem.
  - `ModuleGuard({ permission, children })`: sem permissão renderiza `ForbiddenPage`.

- [ ] **Step 1: Testes que falham** (`routeChrome.test.tsx`):
  - `título segue a rota`: em `/operacion`, `document.title === 'Operación · Lotus'` (es-CL).
  - `foco vai ao main na navegação e não na carga`.
  - `rota desconhecida mostra 404 dentro do layout`.
  - `módulo sem permissão mostra 403 sem Reintentar`: usuário sem `operation.turma.view` em `/operacion` vê o texto de 403 e nenhum botão `common.retry`.
- [ ] **Step 2: Rodar** → FAIL.
- [ ] **Step 3: Implementar.**
  - `handle.titleKey` reusa `nav.*`. Detalhes usam o do módulo (`/operacion/turmas/:id` → `nav.operacion`). `/perfil` usa a chave do título do perfil; confira o pai da chave `"title": "Mi perfil"` no `es-CL.json`.
  - `handle.permission` vem do `NAV_MODULES` do módulo, com prefixo de `path`.
  - Chaves novas: `errors.notFoundTitle`, `errors.notFoundBody`, `errors.forbiddenTitle`, `errors.forbiddenBody`, `errors.backHome`.
  - Em `screenDetail`/`AppErrorState`, status 403 não recebe `onRetry` (molde de `podeRepetir` em `useWindowedQuery.ts:18`).
- [ ] **Step 4: Rodar** → PASS; `pnpm test` verde.
- [ ] **Step 5: Commit** `feat(64): título por rota, foco no main, 404 e 403 por módulo`.

### Task 9: Bandeiras fora do CSS global (D-6)

**Files:**
- Modify: `src/main.tsx` (sai `flag-icons/css/flag-icons.min.css`), `src/shared/ui/LanguageMenu/LanguageMenu.tsx` (3 SVGs importados: `flag-icons/flags/4x3/{cl,br,us}.svg` como `<img>` com `alt=""`), `src/shared/ui/PhoneInput/PhoneInput.tsx` (passa a importar o CSS do `flag-icons` no próprio módulo, porque usa bandeira de todos os países), `src/shared/ui/LanguageMenu/LanguageMenu.test.tsx`

**Interfaces:** nenhuma.

- [ ] **Step 1: Teste que falha.** `LanguageMenu.test.tsx`: `bandeira é imagem local, não classe fi`. O gatilho contém `img` e nenhum elemento `.fi`.
- [ ] **Step 2: Rodar** → FAIL. **Step 3:** Implementar. **Step 4:** PASS. `pnpm build`, anotando o CSS gz antes e depois.
- [ ] **Step 5: Commit** `perf(64): bandeiras do idioma em SVG; CSS do flag-icons só no PhoneInput`.

### Task 10: `useUnsavedChangesGuard` e helper de teste com data router (C-2, rota)

**Files:**
- Create: `src/shared/hooks/useUnsavedChangesGuard.ts`, `src/shared/hooks/useUnsavedChangesGuard.test.tsx`, `src/shared/ui/DiscardChangesDialog/{DiscardChangesDialog.tsx,index.ts}`
- Modify: `src/shared/ui/index.ts`, `src/shared/testing/providers.tsx` (o wrapper `route` passa a `createMemoryRouter` com rota `path: '*'`), `src/shared/testing/providers.test.tsx`, locales ×3 (`common.discardTitle`, `common.discardBody`, `common.discardConfirm`, `common.keepEditing`)

**Interfaces:**
- Produces:
  - `useUnsavedChangesGuard(dirty: boolean): UnsavedChangesGuard`, com `UnsavedChangesGuard = { confirmDiscard(proceed: () => void): void; allowNavigation(): void; dialogProps: { visible: boolean; onConfirm(): void; onCancel(): void } }`.
    - `useBlocker` bloqueia só quando `dirty` e o `pathname` muda.
    - `beforeunload` fica ativo só com `dirty`.
    - `allowNavigation()` libera a próxima navegação programática (a que o salvar dispara).
    - `confirmDiscard`: sem `dirty` chama `proceed` na hora; com `dirty` abre o diálogo.
  - `DiscardChangesDialog(props: UnsavedChangesGuard['dialogProps'])`: um `ConfirmDialog` com `severity="warning"` e os textos acima.

- [ ] **Step 1: Testes que falham:**
  - `sem mudança, navegar não bloqueia`.
  - `com mudança, navegar abre o diálogo e Descartar prossegue`.
  - `Seguir editando cancela a navegação`.
  - `allowNavigation libera uma navegação e só uma`.
  - `confirmDiscard sem mudança chama proceed direto`.
  - `beforeunload só com mudança`: `dispatchEvent(new Event('beforeunload', { cancelable: true }))` e `defaultPrevented`.
- [ ] **Step 2: Rodar** → FAIL. **Step 3:** Implementar e trocar o helper de `providers.tsx`.
- [ ] **Step 4:** `pnpm test` inteiro. Teste que quebrar por `useBlocker must be used within a data router`, ou por `<Routes>` aninhado, se ajusta ao helper novo (opção `route`). O `<MemoryRouter>` próprio só se troca se o teste falhar.
- [ ] **Step 5: Commit** `feat(64): guarda de rascunho por useBlocker`.

### Task 11: Estado de listagem na URL (C-3, listas)

**Files:**
- Create: `src/shared/hooks/useTableUrlState.ts`, `src/shared/hooks/useTableUrlState.test.tsx`
- Modify: `src/shared/hooks/useServerTable.ts` (opção `url?: { prefix?: string } | false`, default `false`), `src/shared/hooks/useServerTable.test.tsx`, `src/shared/hooks/useArchivedPage.ts` (opção `urlKey?: string`; `mode` na URL como `archived=1`), `src/features/operation/hooks/useTurmasPage.ts`, `src/features/operation/components/OperationPage.tsx` (`status` na URL), `src/features/identity/hooks/useStudentsPage.ts`, `src/features/certification/hooks/useHistorial.ts` (`statusFilter`/`quoteFilter` na URL)

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
  - `archived=1 restaura o modo arquivado` (`useArchivedPage`).
- [ ] **Step 2: Rodar** → FAIL. **Step 3:** Implementar e ligar nas três listas (`url: {}`) e nos arquivados de turmas. Lista em aba não montada não escreve: o `renderActiveOnly` já desmonta. No `CommercialPage`, onde as duas fontes vivem no pai, passe `enabled` só para a aba ativa.
- [ ] **Step 4: Rodar** `pnpm vitest run src/shared/hooks src/features/operation src/features/identity src/features/certification` → PASS.
- [ ] **Step 5: Commit** `feat(64): busca, filtro, página e sort na URL`.

### Task 12: "Volver" pelo histórico e abas na URL (C-3, voltar; C-11)

**Files:**
- Create: `src/shared/hooks/useBackNavigation.ts`, `src/shared/hooks/useUrlTab.ts`, `src/shared/hooks/navigationHooks.test.tsx`
- Modify: `src/features/operation/hooks/useTurmaDetail.ts:43`, `src/features/commercial/hooks/useBudgetDetail.ts:102`, `src/features/operation/components/Turma/TurmaCreatePage.tsx:15,22,23`, os pontos que navegam da lista ao detalhe (grep `navigate(\`/operacion/turmas/` e `navigate(\`/comercial/presupuestos/` em `src/features`), `src/features/commercial/components/CommercialPage.tsx`, `src/features/certification/components/CertificatesPage.tsx`, `src/features/identity/components/AdministracionPage.tsx`, `src/features/identity/components/PeoplePage.tsx`

**Interfaces:**
- Consumes: as listas na URL (Task 11). O detalhe recebe a URL completa da lista.
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
  - `onSaved` do `TurmaCreatePage` usa `navigate(path, { replace: true })` e chama `allowNavigation()` (Task 10) antes, quando a Task 15 ligar a guarda. Deixe o ponto marcado.
  - Chaves das abas: comercial `budgets|clients`; certificados `emision|historial`; administración `users|roles|configuracion`; personas `redatores|students`.
- [ ] **Step 4: Rodar** → PASS. **Step 5: Commit** `feat(64): voltar pelo histórico e abas na URL`.

## Fase 3 — Sessão e dado fresco (T1)

### Task 13: Sessão expirada volta ao login com a URL inteira (C-1)

**Files:**
- Modify: `src/shared/api/axios.ts`, `src/shared/stores/sessionStore.ts`, `src/app/router/ProtectedRoute.tsx`, `src/features/identity/hooks/useLoginForm.ts`, `src/features/identity/components/Login/LoginForm.tsx` (aviso), `src/shared/lib/screenDetail.ts` (docblocks de ~25-45 e de `loadErrorHint`), locales ×3 (`auth.sessionExpired`)
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
- [ ] **Step 2: Rodar** → FAIL. **Step 3:** Implementar. Os docblocks de `screenDetail.ts` passam a descrever o fluxo real.
- [ ] **Step 4: Rodar** → PASS. **Step 5: Commit** `fix(64): sessão expirada volta ao login com a URL inteira`.

### Task 14: Painel refaz ao voltar à aba e sinaliza a troca de período (D-1, D-9)

**Files:**
- Modify: `src/app/pages/Dashboard/useDashboard.ts:95-120` (`refetchOnWindowFocus: true`, `placeholderData: keepPreviousData`, devolve `refreshing`), `src/app/pages/Dashboard/DashboardPage.tsx`, `src/app/pages/Dashboard/admin/AdminView.tsx` (prop `refreshing`)
- Test: `src/app/pages/Dashboard/useDashboard.test.tsx` (crie se não existir), `src/app/pages/Dashboard/admin/AdminView.test.tsx` (idem)

**Interfaces:**
- Produces: `useDashboard(period)` passa a incluir `refreshing: boolean` (= `isFetching && isPlaceholderData`). `AdminView` recebe `refreshing` e aplica `aria-busy` e `opacity-60` na seção de séries e rankings.

- [ ] **Step 1: Testes que falham:**
  - `foco na janela refaz o painel`: `focusManager.setFocused(true)` dispara o fetch.
  - `troca de período mantém o dado anterior marcado como ocupado`: `aria-busy="true"` enquanto a query nova não resolve.
- [ ] **Step 2–4:** FAIL → implementar → PASS.
- [ ] **Step 5: Commit** `fix(64): painel refaz no foco e sinaliza troca de período`.

## Fase 4 — Formulários e feedback (T2, T3)

### Task 15: Guarda de rascunho nos formulários (C-2, diálogo)

**Files:**
- Modify: `src/shared/hooks/useEntityForm.ts` (devolve `dirty`), `src/shared/hooks/useCrudForm.ts` (repassa `dirty`), `src/shared/ui/CrudDialog/CrudDialog.tsx` (prop `dirty?: boolean`; Fechar, Cancelar, X e Esc passam por `confirmDiscard`; renderiza `DiscardChangesDialog`), `src/features/commercial/hooks/useQuoteForm.ts`, `src/features/commercial/components/Budget/QuoteWizard.tsx`, `src/features/operation/hooks/useTurmaConfigForm.ts`, `src/features/operation/components/Turma/TurmaConfigCard.tsx`, `src/features/operation/components/Turma/TurmaCreatePage.tsx`, os call sites de `CrudDialog` que não usam `useCrudForm` (grep `<CrudDialog`)
- Test: `src/shared/ui/CrudDialog/CrudDialog.test.tsx`, `src/shared/hooks/useCrudForm.test.ts`, `src/features/commercial/components/Budget/QuoteWizard.onlyUf.test.tsx` (ou um irmão `QuoteWizard.guard.test.tsx`), `src/features/operation/components/Turma/TurmaConfigCard.test.tsx`

**Interfaces:**
- Consumes: `useUnsavedChangesGuard`, `DiscardChangesDialog` (Task 10).
- Produces: `useEntityForm(...)` passa a devolver `dirty: boolean`. É uma comparação profunda de `form` contra o valor inicial do último reset, e volta a `false` no reset.

- [ ] **Step 1: Testes que falham:**
  - `fechar sem mudança não pergunta`, para Esc, X, Cancelar e Fechar.
  - `fechar com mudança pergunta, e Descartar fecha`.
  - `desfazer a mudança à mão volta a não perguntar`.
  - `salvar com sucesso fecha sem perguntar`.
  - `wizard com mudança pergunta no Cancelar`.
  - `criação de turma com mudança pergunta no Volver; salvar navega sem perguntar`.
- [ ] **Step 2–4:** FAIL → implementar (no `onSaved` da criação, `allowNavigation()` antes do `navigate`) → PASS.
- [ ] **Step 5: Commit** `feat(64): aviso antes de descartar rascunho`.

### Task 16: Enter envia, erro de campo aninhado e erro que some ao corrigir (A-10, C-7, C-8)

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
- [ ] **Step 5: Commit** `fix(64): Enter envia, erro aninhado acessível, erro some ao corrigir`.

### Task 17: Obrigatório marcado, ajuda e motivo de desabilitado (C-9, A-2 motivo)

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
- [ ] **Step 4:** PASS. **Step 5: Commit** `feat(64): obrigatório marcado e motivo de botão desabilitado`.

### Task 18: Sucesso dito, confirmação nomeada, erro do gate no diálogo, nome truncado acessível (C-5, C-4, C-6, A-2)

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
- [ ] **Step 5: Commit** `fix(64): sucesso dito, confirmação nomeada, erro do gate no diálogo`.

## Fase 5 — Contraste, identificadores e identidade (T4, T8)

### Task 19: Gerador de tema: borda escura, info índigo, tag 600 (A-1, D7, B-8)

**Files:**
- Modify: `FE/scripts/generate-brand-theme.mjs`:
  - `CINZA_BORDA` aplicada também no dark, a :301-305 e :517-520, e com o comentário reescrito.
  - Passada nova: `.p-message-info`, `.p-toast-message-info`, `.p-tag.p-tag-info` e `.p-badge.p-badge-info` em índigo, 700 no claro e 300 no escuro, para tinta e borda, com o fundo composto de `--indigo-500`.
  - Passada nova: `.p-tag { font-weight: 600 }`.
- Modify também:
  - Gerados: `src/shared/styles/themes/lara-light-lotus.css` e `src/shared/styles/themes/lara-dark-lotus.css`, com `pnpm brand-theme`.
  - `src/shared/styles/brand-theme.css`: `--tone-info-ink` vai a `var(--indigo-700)` no claro e `var(--indigo-300)` no escuro.
  - `src/shared/ui/AppTag/tones.ts` e `src/shared/ui/AppCard/AppCard.tsx:21`: info com `--indigo-500`.
  - `DESIGN.md`: :306 sem "no claro"; Severity com info índigo; Chips/Tags 12px/600.
- Test: `FE/tests/brand-theme.test.ts`, `FE/tests/tone-ink.test.ts`, `FE/tests/brand-ink.test.ts`, `src/shared/ui/AppTag/AppTag.test.tsx`, `src/shared/ui/AppCard/AppCard.test.tsx`

**Interfaces:** nenhuma.

- [ ] **Step 1: Testes que falham:**
  - Em `brand-theme.test.ts`: `borda de controle do escuro é #64748b`, `info de message/toast/tag/badge é índigo nos dois temas` e `p-tag pesa 600`.
  - Em `tone-ink.test.ts`: `tone-info-ink é índigo e mede ≥ 4,5:1 sobre o card tingido, claro e escuro`, com o cálculo de contraste já existente no arquivo.
- [ ] **Step 2: Rodar** `pnpm vitest run tests` → FAIL. **Step 3:** Mudar o gerador e rodar `pnpm brand-theme`. Mudar os tokens e os tons.
- [ ] **Step 4:** PASS. O teste de drift (`brand-theme.test.ts`) confirma que o CSS commitado é o gerado.
- [ ] **Step 5: Commit** `fix(64): contraste do tema escuro, info em índigo, tag 600`.

### Task 20: Celeste raro e controles fixos no header (B-2, B-5)

**Files:**
- Modify:
  - `src/shared/ui/AppAvatar/AppAvatar.tsx:47`: iniciais em `--surface-200` com `--text-color`, peso 600. Sobre o shell continua o que já é.
  - `src/shared/ui/IdentityCell/IdentityCell.tsx`: avatar da célula com 40px.
  - `src/shared/ui/RowActions/RowActions.tsx:44-47,107-110`: ação comum em `text plain`; a destrutiva segue `danger`.
  - `src/shared/ui/ArchiveSwitch/ArchiveSwitch.tsx:27-36`: selecionado `secondary outlined`, o outro `text plain`.
  - `src/shared/ui/AppButton/style.ts` e `src/shared/ui/AppButton/AppButton.tsx`: variante nova `shell`, igual nos dois temas e sem `dark:`. Borda `--shell-ink` a 40%, rótulo `--shell-ink`, hover branco a 10%.
  - `src/shared/ui/AppearanceControls/AppearanceControls.tsx:26` e `src/shared/ui/LanguageMenu/LanguageMenu.tsx:45`: `variant="shell"`.
  - `DESIGN.md`: Fixed Dial Rule com a variante `shell`; Buttons; Tables com o avatar neutro de 40px.
- Test: `AppAvatar.test.tsx` (novo), `IdentityCell.test.tsx`, `RowActions.test.tsx`, `ArchiveSwitch.test.tsx`, `AppButton.test.tsx`, `LanguageMenu.test.tsx`

**Interfaces:**
- Produces: `AppButton` `variant="shell"`.

- [ ] **Step 1: Testes que falham:**
  - `avatar de iniciais é neutro`: `style.backgroundColor` contém `--surface-200`.
  - `ação comum de linha não usa celeste`: sem `severity` e com classe `p-button-plain`.
  - `switch selecionado é secondary outlined`.
  - `variante shell não tem classe dark:`.
  - `controles do header usam shell`.
- [ ] **Step 2–4:** FAIL → implementar → PASS.
- [ ] **Step 5: Commit** `fix(64): celeste volta a ser raro; header fixo nos dois temas`.

### Task 21: Folio, check, peso e barra de progresso (B-1, B-7, B-8, B-11)

**Files:**
- Modify:
  - `src/features/certification/components/Historial/historialColumns.ts:17-26`: largura do folio sem transbordo a 1024. Ajuste o peso de `codigo`/`cotizacion`, ou crie `COL.folio` em `src/shared/ui/AppDataTable/columnWidth.ts`.
  - `src/features/certification/components/Historial/HistorialTable.tsx:64`: `whitespace-nowrap`.
  - `src/features/certification/components/Emission/EmissionStudentsTable.tsx:88` e `src/features/certification/components/Emission/BatchIssueDialog.tsx:79`: `✓` vira `AppIcon name="check"` com `aria-hidden`; o folio fica `nowrap`. O `AppTag` aceita `icon`.
  - `src/shared/ui/RecordCode/RecordCode.tsx:14`: `font-semibold`.
  - `src/features/operation/components/Document/TurmaDocuments.tsx:46-49`: trilho e barra ≥ 3:1 nos dois temas. Trilho `--surface-400`, ou com borda `cinza-traco`; barra `--green-700` no claro e `--green-400` no escuro. Medir.
- Test:
  - `columnWidth.test.ts`, `HistorialTable.test.tsx`, `EmissionStudentsTable.test.tsx`, `RecordCode.test.tsx`.
  - `TurmaDocuments.test.tsx` (novo, só a classe e o token).

**Interfaces:** nenhuma.

- [ ] **Step 1: Testes que falham:**
  - `folio não quebra`: classe `whitespace-nowrap`.
  - `peso do folio comporta LOT-AAAA-NNNNN a 1024`: a largura calculada é ≥ à do texto, pela função de `columnWidth`.
  - `check é ícone, não glifo`: sem `✓` no texto.
  - `RecordCode é 600`.
  - `barra de progresso usa os tokens medidos`.
- [ ] **Step 2–4:** FAIL → implementar → PASS.
- [ ] **Step 5: Commit** `fix(64): folio contido, check como ícone, barra legível`.

### Task 22: Movimento reduzido e rail a 12px (B-3/A-11, B-4)

**Files:**
- Modify:
  - `src/index.css`: `@media (prefers-reduced-motion: reduce)` zera `animation-duration`, `transition-duration` e o pulso do `.p-skeleton:after`.
  - `src/app/layouts/Sidebar/Sidebar.tsx:32`: `transition-[width]` com `motion-reduce:transition-none`, no lugar de `transition-all`.
  - `src/app/layouts/Sidebar/SidebarItem.tsx:52`: colapsado a `text-xs`, sem `truncate`, com rótulo curto.
  - `src/shared/config/navigation.ts`: `NavModule.shortLabelKey`.
  - Locales ×3: `nav.short.*`, um por módulo, com no máximo 9 caracteres.
  - `DESIGN.md:317`: Navigation com 12px e rótulo curto.
- Test: `SidebarItem.test.tsx`, `FE/tests/reduced-motion.test.ts` (novo: lê `src/index.css` e afirma a media query e o seletor `.p-skeleton`)

**Interfaces:**
- Produces: `NavModule.shortLabelKey: string`.

- [ ] **Step 1: Testes que falham:**
  - `colapsado usa rótulo curto a 12px sem truncate`.
  - `rótulos curtos cabem`: cada `nav.short.*` tem no máximo 9 caracteres nos três locales.
  - `index.css desliga animação sob movimento reduzido`.
- [ ] **Step 2–4:** FAIL → implementar → PASS.
- [ ] **Step 5: Commit** `fix(64): respeita movimento reduzido; rail a 12px`.

## Fase 6 — Gráficos do painel (T6)

### Task 23: Meses da janela preenchidos com zero (D-2)

**Files:**
- Modify:
  - `backend/app/Domains/Dashboard/Services/AnalyticsQuery.php`: `monthlyCounts` (:250) e `monthlyAmounts` (:272) recebem `CarbonImmutable $start, CarbonImmutable $end`, que são os dias do cliente já recebidos por `series()` (:40-48). Preenchem todo mês `Y-m` de `start` a `end`, com `0` ou `'0.0000'`.
  - `src/shared/ui/AppLineChart/pivot.ts`: só o comentário de :17-20, que agora diz que o backend preenche a janela e que série nula some pela D7.
- Test: `backend/tests/Feature/Dashboard/AnalyticsQueryTest.php`

**Interfaces:** o shape do DTO não muda.

- [ ] **Step 1: Testes que falham**, em `AnalyticsQueryTest.php`:
  - `test_mes_sem_registro_no_meio_da_janela_vem_zero`.
  - `test_meses_vazios_nas_pontas_vem_zero`.
  - `test_janela_parcial_15_mar_a_10_jun_tem_quatro_meses`.
  - `test_janela_que_cruza_o_ano_e_continua`: de 2026-11-20 a 2027-02-05 → `2026-11, 2026-12, 2027-01, 2027-02`.
  - `test_uf_vazia_vem_0_0000`.
  - `test_serie_sem_permissao_continua_null`.
- [ ] **Step 2: Rodar** `docker compose exec -T app php artisan test --filter=AnalyticsQueryTest` → FAIL.
- [ ] **Step 3:** Implementar. O mês vem do dia de Santiago: para `start` e `end`, que já são dias, use `format('Y-m')` e avance com `addMonthNoOverflow()`.
- [ ] **Step 4:** PASS. Rode a suíte do domínio: `--filter=Dashboard`. Pint no arquivo.
- [ ] **Step 5: Commit** `fix(64): painel preenche com zero os meses vazios da janela`.

### Task 24: Rankings, linhas distinguíveis e gráfico acessível (D-3, D-4, D-8)

**Files:**
- Modify:
  - `src/app/pages/Dashboard/admin/RankingsPanel.tsx:38`: `barras()` corta em 10 depois de ordenar.
  - `src/shared/ui/AppBarChart/AppBarChart.tsx`: altura derivada do número de barras (`max(120, n × 26)`), sem o `260` fixo; sai `role="img"`.
  - `src/shared/ui/AppLineChart/AppLineChart.tsx`: sai `role="img"` (:47); `strokeDasharray` por índice de série, de um vetor fixo `['', '6 3', '2 3', '8 3 2 3']`.
  - `src/shared/ui/AppLineChart/legend.tsx`: o marcador repete o traço.
  - `src/app/pages/Dashboard/admin/SeriesPanel.tsx`: as quatro contagens viram dois cards, "Clases" (`turmas_iniciadas`, `turmas_concluidas`) e "Alumnos" (`matriculas`, `certificados_emitidos`), mais o de UF. A grade passa a ter 3 cards.
  - Novo `src/shared/ui/ChartDataTable/{ChartDataTable.tsx,index.ts}`: tabela `sr-only` com as mesmas séries, usada pelos dois wrappers de gráfico.
  - `src/shared/ui/index.ts`.
  - Locales ×3: `dashboard.series.groupTurmas`, `dashboard.series.groupAlumnos`.
- Test: `RankingsPanel.test.tsx`, `SeriesPanel.test.tsx`, `legend.test.tsx`, `AppLineChart.test.tsx` (novo), `AppBarChart.test.tsx` (novo)

**Interfaces:**
- Produces: `ChartDataTable({ caption, columns, rows }: { caption: string; columns: { key: string; label: string }[]; rows: Record<string, string | number>[] })`.

- [ ] **Step 1: Testes que falham:**
  - `ranking mostra no máximo 10 barras da métrica escolhida`: com 30 linhas e a métrica trocada, o top 10 muda.
  - `contagens em dois cards`.
  - `cada série tem traço próprio, também na legenda`.
  - `gráfico expõe tabela acessível com os dados`.
  - `wrapper não tem role img`.
- [ ] **Step 2–4:** FAIL → implementar → PASS.
- [ ] **Step 5: Commit** `fix(64): rankings top 10, séries distinguíveis, gráfico com tabela acessível`.

### Task 25: UF por idioma e KPI zerado neutro (D-5, D-7)

**Files:**
- Modify:
  - `src/shared/lib/uf.ts`: `formatUf(value: string, locale: string = i18n.language): string`. Usa `new Intl.NumberFormat(locale, { maximumFractionDigits: 4 }).format(value)`, com a string decimal direto, sem `Number`. A assinatura não muda para os 8 chamadores.
  - `src/app/pages/Dashboard/admin/kpiCards.ts:39-49`: tom `null` quando o valor é 0.
- Test: `src/shared/lib/uf.test.ts` (novo), `src/app/pages/Dashboard/admin/kpiCards.test.ts`

**Interfaces:** nenhuma.

- [ ] **Step 1: Testes que falham:**
  - `es-CL agrupa milhar com ponto e decimal com vírgula`: `formatUf('12345.6700','es-CL') === '12.345,67'`.
  - `en usa vírgula e ponto`: `'12,345.67'`.
  - `zeros à direita somem`: `'1.0000'` → `'1'`.
  - `KPI em 0 não pinta severidade`.
- [ ] **Step 2–4:** FAIL → implementar → PASS. Rode `pnpm vitest run src/features/commercial` para os chamadores de UF.
- [ ] **Step 5: Commit** `fix(64): UF formatada por idioma; KPI zerado sem alarme`.

## Fase 7 — Teclado e leitor de tela (T7)

### Task 26: Estado dos controles, busca, rolagem, subnav e rótulos do Prime (A-4, A-5, A-6, A-9, A-12)

**Files:**
- Modify:
  - `src/shared/ui/AppearanceControls/AppearanceControls.tsx`: `aria-pressed` no tema escuro.
  - `src/app/layouts/Sidebar/Sidebar.tsx:53`: `aria-expanded` e `aria-controls`.
  - `src/shared/ui/ArchiveSwitch/ArchiveSwitch.tsx`: `aria-label` no grupo e `aria-pressed` nos botões.
  - `src/app/layouts/Header/UserMenu.tsx:92-97` e `src/shared/ui/RowActions/RowActions.tsx:106-111`: `aria-expanded` e `aria-controls` no gatilho.
  - `src/shared/ui/LanguageMenu/LanguageMenu.tsx`: o rótulo visível inclui o idioma atual, ex. "ES".
  - `src/shared/ui/SearchableTableFrame/SearchableTableFrame.tsx:170-185`: `aria-label={searchPlaceholder}` e contagem em `aria-live="polite"`.
  - `src/shared/ui/AppDataTable/AppDataTable.tsx:133`: a região do `paginatorLeft` fica `aria-live`.
  - `src/shared/ui/AppDataTable/AppDataTable.tsx` e `src/shared/ui/AppDataTable/style.ts:173-183`: wrapper de rolagem com `tabIndex={0}`, `role="region"` e `aria-label`.
  - `src/shared/config/primeLocale.ts`: bloco `aria` em `es` e `pt`, mais `addLocale('en')` explícito com `aria`.
  - `src/shared/ui/AppToast/AppToast.tsx:29`: rótulo de fechar traduzido.
  - `src/shared/ui/AppSubNav/AppSubNav.tsx:40`: ativo com borda inferior de 2px em `--brand-ink`, ≥ 3:1, e peso 600.
  - Locales ×3.
- Test: `ArchiveSwitch.test.tsx`, `UserMenu.test.tsx`, `RowActions.test.tsx`, `LanguageMenu.test.tsx`, `SearchableTableFrame.test.tsx`, `AppDataTable.test.tsx`, `AppSubNav.test.tsx`, `src/shared/config/primeLocale.test.ts` (novo)

**Interfaces:** nenhuma.

- [ ] **Step 1: Testes que falham**, um por controle:
  - `toggle de tema expõe aria-pressed`.
  - `sidebar expõe aria-expanded`.
  - `busca tem nome acessível`.
  - `contagem é anunciada`.
  - `rolagem da tabela alcançável por teclado`.
  - `idioma atual no rótulo`.
  - `subnav ativo tem indicador além do tinte`.
  - `Prime traduz os rótulos aria em es e pt`.
- [ ] **Step 2–4:** FAIL → implementar → PASS.
- [ ] **Step 5: Commit** `fix(64): estado e nome acessível nos controles`.

### Task 27: Foco ao reordenar, nível de título e links do painel (A-3, A-7, A-8)

**Files:**
- Modify:
  - `src/features/catalog/components/Course/ModuleFields.tsx:37-51`: `key` estável por módulo, um id local gerado no add, em vez do índice. Depois de mover, o foco vai ao botão equivalente na nova posição; na ponta, ao botão oposto.
  - `src/features/catalog/components/Course/ModuleCard.tsx:42-44`.
  - `src/shared/ui/AppCard/AppCard.tsx:104-147`: `AppCardHeaderProps.level?: 2 | 3`, com default `2`.
  - Os 14 call sites de `AppCardHeader` em `src/app/pages/Dashboard/**`, `PendingQuotesPanel.tsx`, `EvaluacionesCard.tsx`, `BudgetDocumentsCard.tsx` e `BudgetQuotesCard.tsx`: `level={3}` só onde já existe um `h2` acima.
  - `src/app/pages/Dashboard/admin/CompliancePanel.tsx:90` e `src/app/pages/Dashboard/admin/RedatorLoadPanel.tsx:55-70`: links com a aparência de link do tema (`--brand-ink`, sublinhado no hover e no foco). O destino do relator segue a spec §6, fase 7.
- Test: `ModuleFields.test.tsx` (novo), `AppCard.test.tsx`, `CompliancePanel.test.tsx`, `RedatorLoadPanel.test.tsx` (novo)

**Interfaces:**
- Produces: `AppCardHeaderProps.level`.

- [ ] **Step 1: Testes que falham:**
  - `mover para baixo mantém o foco no módulo movido`.
  - `dois Enter seguidos movem duas vezes o mesmo módulo`.
  - `card header é h2 por padrão`.
  - `link do painel tem aparência de link`.
- [ ] **Step 2–4:** FAIL → implementar → PASS.
- [ ] **Step 5: Commit** `fix(64): foco ao reordenar, hierarquia de título, links do painel`.

## Fase 8 — Carga e polimento (T9)

### Task 28: Logo, assets, toolbar, viewport, raio e cabeçalho (D-10, B-6, B-9, B-10, B-12, D8)

**Files:**
- Modify:
  - `src/shared/ui/AppLogo/AppLogo.tsx:27`: `width` e `height` intrínsecos de cada variante.
  - `FE/index.html:7`: `type="image/png"`.
  - `src/shared/ui/SearchableTableFrame/SearchableTableFrame.tsx:175-176`: `min-w-0 sm:min-w-64`.
  - `src/app/layouts/AppLayout.tsx:11` e `src/shared/ui/AppSidebar/AppSidebar.tsx:16`: `h-dvh`.
  - Botões só-ícone sem `rounded` (raio de 4px): `RowActions.tsx`, `AppFileActions.tsx:113,126`, `AppFileSlot.tsx:96`, `AppPhotoField.tsx:120`, `AppDownloadButton.tsx:43`, `AppFileUpload.tsx:15` e `src/features/catalog/components/Course/RedatorCard.tsx:31`.
  - `src/shared/ui/PageHeader/PageHeader.tsx:29-33`: `h1` com `mb-1` e descrição colada.
  - `src/app/pages/Dashboard/KpiRow.tsx:77`: rótulo com `text-balance` e `hyphens-auto`, valor em linha própria abaixo de `sm`.
  - `DESIGN.md:240`: diálogos com os tetos `sm`/`md`/`lg` (D8).
- Delete: `src/assets/hero.png`, `src/assets/react.svg`, `src/assets/vite.svg`, `Logo.png` (confirme o caminho com `git ls-files | grep Logo.png`). `FE/public/favicon.svg` e `FE/public/icons.svg` só se o grep mostrar que não têm uso.
- Test: `PageHeader.test.tsx`, `SearchableTableFrame.test.tsx`, `AppFileActions.test.tsx`, `FE/tests/unused-assets.test.ts` (novo: cada arquivo de `src/assets` é referenciado em `src`)

**Interfaces:** nenhuma.

- [ ] **Step 1: Testes que falham:**
  - `logo tem dimensões`.
  - `busca encolhe abaixo de sm`.
  - `botão só-ícone não é pílula`.
  - `asset sem uso reprova`.
- [ ] **Step 2–4:** FAIL → implementar → PASS. Rode `pnpm build` e anote o `dist` final (gz) contra a medição da Task 7.
- [ ] **Step 5: Commit** `fix(64): polimento de carga e layout`.

## Fase 9 — Passada visual

### Task 29: Revisão no navegador e quadro de fechamento dos 46 IDs

**Files:**
- Create:
  - `docs/superpowers/blocos/64-frontend-revisao-ui-ux-e-icones/visual/<ID>.png`, uma por achado visual.
  - `docs/superpowers/blocos/64-frontend-revisao-ui-ux-e-icones/fechamento.md`: o quadro dos 46 IDs e do T10, com a coluna "prova" preenchida por teste (arquivo e nome), captura (caminho) ou "veredito do João".

**Interfaces:**
- Consumes: Tasks 1–28.

- [ ] **Step 1:** Subir a stack da lane: `docker compose up -d`, offset +1, Vite :5174. Se o `artisan test` fatalizar por memória, é a P-57 (imagem `app` velha): faça `docker compose build app`.
- [ ] **Step 2:** Rodar a skill `lotus-ui-review` em cada tela tocada: Dashboard, Comercial e detalhe de orçamento, Operación e detalhe e criação de turma, Cursos, Certificados (Emisión e Historial), Personas, Administración, Perfil e login. Usar 1440×900, 1024×768 e 390×844, nos temas claro e escuro. A varredura fica no scratchpad.
- [ ] **Step 3:** Por achado visual (A-1, A-12, B-1, B-2, B-4, B-5, B-6, B-7, B-9, B-10, B-11, B-12, C-4, C-9, D-4, D-7), versionar só a captura que prova o veredito, em PNG.
- [ ] **Step 4:** Regressão vista na passada (contraste, transbordo, ícone faltando) vira correção na task dona, com commit próprio, antes de seguir.
- [ ] **Step 5:** Escrever o `fechamento.md`. Levar ao João, numa rodada só, os IDs que nem teste nem captura fecham.
- [ ] **Step 6:** Gate final: `pnpm lint`, `pnpm test`, `pnpm build` e `docker compose exec -T app php artisan test`, todos verdes. `grep -rE "pi pi-|primeicons" frontend --exclude-dir=node_modules` sem nada fora dos temas gerados.
- [ ] **Step 7: Commit** `docs(64): passada visual e quadro de fechamento`.

---

## Grupos paralelos

| Grupo | Tasks | Files: disjuntos | Aresta Consumes/Produces |
|---|---|---|---|
| G1 | 3, 4 | sim: `src/app/**`, `src/features/{catalog,operation}/**` × `src/features/{commercial,identity,certification}/**`; nenhuma das duas toca locales nem `shared/` | nenhuma entre elas; ambas consomem só a Task 2 |
| G2 | 23, 25 | sim: `backend/.../AnalyticsQuery.php`, `AnalyticsQueryTest.php`, `pivot.ts` × `src/shared/lib/uf.ts`, `uf.test.ts`, `kpiCards.ts`, `kpiCards.test.ts` | nenhuma: a 23 não muda o DTO; a 25 não lê série |

Task fora de grupo executa e revisa uma a uma. As demais compartilham `src/shared/config/locales/*.json`, `DESIGN.md` ou wrappers de `shared/ui`, e por isso não paralelizam.

## Handoff de execução

- `executor: claude`. O bloco toca a lei 6 (catraca de ícones e ESLint), decide padrão em `shared/` (guarda de rascunho, estado na URL, data router) e tem julgamento visual de contraste. Não há paths fechados para o Codex.
- Sessão: `opus`, esforço `high`.
- Papéis (`.claude/papeis.md`):
  - `implementador-mecanico` nas Tasks 3, 4, 9, 21, 25 e 28.
  - `implementador-integracao` nas demais tasks de código (1, 2, 5–8, 10–20, 22–24, 26, 27).
  - A Task 29 é da sessão, porque exige navegador e conversa com o João.
  - `revisor-task` em toda task, `re-revisor` nas rodadas de correção, `corretor-tardio` nas rodadas 4–5 e `revisor-branch` ao fim.
