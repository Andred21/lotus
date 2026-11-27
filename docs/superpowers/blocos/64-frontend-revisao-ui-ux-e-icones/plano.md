# Bloco 64 — Ícones Phosphor e data router — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** trocar PrimeIcons por Phosphor atrás de um registro em `shared/ui` e migrar o roteador para data router (rotas `lazy`, título por rota, foco no `<main>`, 404, 403 por módulo e o hook da guarda de rascunho).

**Architecture:** ícones primeiro, por uma ponte tipada (`IconProp`) que aceita nome novo e classe legada até a última call site migrar (Task 6 remove a ponte). Depois o roteador vira data router, o que habilita `lazy` e `useBlocker`; o hook da guarda nasce aqui e os formulários o ligam no bloco 65.

**Tech Stack:** React 19, TS, Vite, react-router-dom 7.18, TanStack Query 5, Zustand, PrimeReact 10 via `shared/ui`, Tailwind 4, Vitest + Testing Library, `@phosphor-icons/react`.

**Spec:** `docs/superpowers/blocos/64-frontend-revisao-ui-ux-e-icones/spec.md` (compartilhada pelos blocos 64, 65 e 66; D12). Detalhe `arquivo:linha` de cada ID: `docs/superpowers/audits/2026-11-26-ui-ux-pro-max.md`.

Caminhos abaixo: `src/` = `frontend/src/`; `FE` = `frontend/`.

**IDs da auditoria que este bloco fecha:** T10 (ícones), D-6, C-12, C-10. O C-2 só fecha no 65 (aqui nasce o hook).

**Depende:** — (primeiro dos três).

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

1. Aba aberta durante um deploy: o chunk antigo some e a navegação falha no import — recarrega uma vez, nunca em loop. Teste na Task 7.
2. Deep link a detalhe de módulo sem permissão (`/operacion/turmas/5`): 403, não tela branca nem 404. Teste na Task 8.
3. Botão só-ícone continua com nome acessível depois da troca de ícone. Teste na Task 2.
4. Ícone sobre o shell azul-poste e no tema escuro herda a cor do texto. Teste na Task 1.
5. Rota desconhecida sem sessão vai ao login, não ao 404. Teste na Task 8.

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
  - `herda a cor do texto` (Review Focus 4): o `svg` usa `fill="currentColor"`.
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
- [ ] **Step 4: Atualizar os testes** das pastas listadas: asserções sobre classe `pi-*` viram asserção sobre `svg` ou `aria-label`. Acrescente em `SidebarItem.test.tsx` o teste `item ativo usa peso fill` e, em `RowActions.test.tsx`, `botão só-ícone mantém o nome acessível após a troca` (Review Focus 3).
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

### Task 7: Data router com rotas `lazy` e bandeiras fora do CSS global (D-6)

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
  - `falha ao carregar chunk recarrega uma vez` (Review Focus 1): `lazy` rejeitando com erro de import dinâmico leva a `window.location.reload` uma única vez (marca `sessionStorage['lotus:chunk-reload']`); na segunda, `AppErrorState`.
- [ ] **Step 2: Rodar** → FAIL (`routes` não existe).
- [ ] **Step 3:** Mover a árvore para `routes.tsx` como objetos. `SessionBootstrap` e `ProtectedRoute` continuam como `element` das duas rotas-layout (spec §6, fase 2). Cada página entra por `lazy: () => import(...).then(m => ({ Component: m.X }))`. `LoginRoute` e o layout continuam estáticos. Os comentários de grupo de hoje são preservados. O `path: '*'` mantém o `Navigate`, que só muda na Task 8. As rotas `lazy` ganham `errorElement` com a regra de recarga única do teste acima.
- [ ] **Step 4: Rodar** → PASS. Medir o `dist`: `pnpm build` e anotar o tamanho do chunk principal (gz) antes e depois na mensagem de commit (D-6).
- [ ] **Step 5: Commit** `refactor(64): data router com rotas lazy`.

**Bandeiras (segunda metade do D-6, mesmo task):**

**Files:**
- Modify: `src/main.tsx` (sai `flag-icons/css/flag-icons.min.css`), `src/shared/ui/LanguageMenu/LanguageMenu.tsx` (3 SVGs importados: `flag-icons/flags/4x3/{cl,br,us}.svg` como `<img>` com `alt=""`), `src/shared/ui/PhoneInput/PhoneInput.tsx` (passa a importar o CSS do `flag-icons` no próprio módulo, porque usa bandeira de todos os países), `src/shared/ui/LanguageMenu/LanguageMenu.test.tsx`

**Interfaces:** nenhuma.

- [ ] **Step 1: Teste que falha.** `LanguageMenu.test.tsx`: `bandeira é imagem local, não classe fi`. O gatilho contém `img` e nenhum elemento `.fi`.
- [ ] **Step 2: Rodar** → FAIL. **Step 3:** Implementar. **Step 4:** PASS. `pnpm build`, anotando o CSS gz antes e depois.
- [ ] **Step 6: Commit** `perf(64): bandeiras do idioma em SVG; CSS do flag-icons só no PhoneInput`.

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
  - `detalhe sem permissão mostra 403` (Review Focus 2): o mesmo em `/operacion/turmas/5`.
  - `rota desconhecida sem sessão vai ao login, não ao 404` (Review Focus 5).
- [ ] **Step 2: Rodar** → FAIL.
- [ ] **Step 3: Implementar.**
  - `handle.titleKey` reusa `nav.*`. Detalhes usam o do módulo (`/operacion/turmas/:id` → `nav.operacion`). `/perfil` usa a chave do título do perfil; confira o pai da chave `"title": "Mi perfil"` no `es-CL.json`.
  - `handle.permission` vem do `NAV_MODULES` do módulo, com prefixo de `path`.
  - Chaves novas: `errors.notFoundTitle`, `errors.notFoundBody`, `errors.forbiddenTitle`, `errors.forbiddenBody`, `errors.backHome`.
  - Em `screenDetail`/`AppErrorState`, status 403 não recebe `onRetry` (molde de `podeRepetir` em `useWindowedQuery.ts:18`).
- [ ] **Step 4: Rodar** → PASS; `pnpm test` verde.
- [ ] **Step 5: Commit** `feat(64): título por rota, foco no main, 404 e 403 por módulo`.

### Task 9: `useUnsavedChangesGuard` e helper de teste com data router (C-2, rota)

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

## Fase 3 — Passada visual

### Task 10: Passada visual e quadro de fechamento do bloco 64

**Files:**
- Create: `docs/superpowers/blocos/64-frontend-revisao-ui-ux-e-icones/visual/<ID>.png` (uma por achado visual), `docs/superpowers/blocos/64-frontend-revisao-ui-ux-e-icones/fechamento.md` (uma linha por ID deste bloco: T10, D-6, C-12, C-10 — com a prova: teste (arquivo e nome), captura (caminho) ou "veredito do João")

**Interfaces:**
- Consumes: Tasks 1–9.

- [ ] **Step 1:** Subir o stack da lane (`docker compose up -d`, offset da lane no `.env`). Se o `artisan test` fatalizar por memória, é a P-57 (imagem `app` velha): `docker compose build app`.
- [ ] **Step 2:** Skill `lotus-ui-review` em: todas as telas (os ícones estão em todas): Dashboard, Comercial e detalhe de orçamento, Operación e detalhe e criação de turma, Cursos, Certificados (Emisión e Historial), Personas, Administración, Perfil, login, 404 e 403 — 1440×900, 1024×768 e 390×844, claro e escuro. A varredura completa fica no scratchpad.
- [ ] **Step 3:** Por achado visual (T10 — sidebar com ativo `fill`, uma listagem com ações, um diálogo, nos dois temas; C-10 — 404 e 403), versionar só a captura que prova o veredito, em PNG.
- [ ] **Step 4:** Regressão vista na passada vira correção na task dona, com commit próprio, antes de seguir.
- [ ] **Step 4b:** `grep -rE "pi pi-|primeicons" frontend --exclude-dir=node_modules` sem nada fora dos temas gerados; números do D-6 (chunk principal e CSS, gz, antes e depois) no `fechamento.md`.
- [ ] **Step 5:** Escrever o `fechamento.md`; levar ao João, numa rodada só, os IDs que nem teste nem captura fecham.
- [ ] **Step 6:** Gate final: `pnpm lint`, `pnpm test`, `pnpm build` e `docker compose exec -T app php artisan test` verdes.
- [ ] **Step 7: Commit** `docs(64): passada visual e quadro de fechamento`.

## Grupos paralelos

| Grupo | Tasks | Files: disjuntos | Aresta Consumes/Produces |
|---|---|---|---|
| G1 | 3, 4 | sim: `src/app/**`, `src/features/{catalog,operation}/**` × `src/features/{commercial,identity,certification}/**`; nenhuma das duas toca locales nem `shared/` | nenhuma entre elas; ambas consomem só a Task 2 |

Task fora de grupo executa e revisa uma a uma.

## Handoff de execução

- `executor: claude`. O bloco decide padrão em `shared/` e mexe em lei do §5 ou em julgamento visual; não há paths fechados para o Codex.
- Sessão: `opus`, esforço `high`.
- Papéis (`.claude/papeis.md`): `implementador-mecanico` nas Tasks 3 e 4; `implementador-integracao` nas Tasks 1, 2, 5, 6, 7, 8 e 9; a Task 10 é da sessão (navegador e conversa com o João); `revisor-task` em toda task, `re-revisor` nas rodadas de correção, `corretor-tardio` nas rodadas 4–5, `revisor-branch` ao fim.
