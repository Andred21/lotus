# Bloco 66 — Identidade, gráficos, acessibilidade e polimento — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** celeste raro e header fixo, folio contido, movimento reduzido e rail a 12px, meses zerados no painel, gráficos distinguíveis e acessíveis, teclado e leitor de tela, polimento de carga — e o quadro final dos 46 IDs.

**Architecture:** correções locais em `shared/ui`, no shell, no painel e numa query do backend (`AnalyticsQuery`), sobre o `IconName` (64) e os tokens de tema (65).

**Tech Stack:** React 19, TS, Vite, react-router-dom 7.18, TanStack Query 5, Zustand, PrimeReact 10 via `shared/ui`, Tailwind 4, Vitest + Testing Library, `@phosphor-icons/react`, Laravel 13 (PHPUnit).

**Spec:** `docs/superpowers/blocos/64-frontend-revisao-ui-ux-e-icones/spec.md` (compartilhada pelos blocos 64, 65 e 66; D12). Detalhe `arquivo:linha` de cada ID: `docs/superpowers/audits/2026-11-26-ui-ux-pro-max.md`.

Caminhos abaixo: `src/` = `frontend/src/`; `FE` = `frontend/`.

**IDs da auditoria que este bloco fecha:** B-1, B-11, B-7, D-2, D-3, D-4, D-5, D-7, D-8, A-3, A-4, A-5, A-6, A-7, A-9, A-12, A-8, B-2, B-5, B-3, A-11, B-4, D-10, B-6, B-9, B-10, B-12.

**Depende:** bloco 65 mesclado na `main`.

## Global Constraints

- Lei 6: nenhuma feature (`src/features/**`) nem `src/app/**` importa `primereact` ou `@phosphor-icons/react`. Só `src/shared/ui/**`.
- `generated.ts` não muda: nenhum DTO muda neste bloco (D-3 é frontend; D-2 mantém o shape de `MonthlyCountData`/`MonthlyAmountData`).
- CSS de tema gerado (`src/shared/styles/themes/lara-*-lotus.css`) só muda por `pnpm brand-theme`, nunca à mão.
- Toda chave nova de i18n entra nos três `src/shared/config/locales/{es-CL,pt-BR,en}.json` (o `parity.test.ts` cobra). Vocabulário no estilo `<dominio>.<acao>` existente; genéricos em `common.*`.
- Contraste de todo par tocado: ≥ 4,5:1 texto, ≥ 3:1 traço/controle, claro e escuro.
- ESLint `max-lines` 150 vale nos blocos que já o aplicam; arquivo que estourar se divide.
- PHP: Pint só nos arquivos tocados (`cd backend && ./vendor/bin/pint <arquivos>`); testes no container da lane (`docker compose exec -T app php artisan test --filter=...`).
- Frontend: `cd frontend && pnpm vitest run <caminho>` por task; `pnpm lint`, `pnpm test` e `pnpm build` verdes no fim de cada task.
- DESIGN.md (raiz) muda na task que muda o comportamento que ele descreve.
- Commit por task, mensagem `tipo(<NN>): ...` com o número do bloco.

## Review Focus

1. Janela de painel que cruza a virada de ano e começa/termina no meio do mês, no fuso de Santiago: meses contínuos, sem duplicar nem pular. Teste na Task 4.
2. Empate na décima posição do ranking: desempate estável por nome, o mesmo top 10 em toda renderização. Teste na Task 5.
3. UF `'0.0000'` vira `'0'`, e UF negativa (estorno) mantém o sinal. Teste na Task 6.
4. Curso com um módulo só: setas desabilitadas, e o foco não some ao remover o último. Teste na Task 8.
5. Sidebar colapsada a 390: o rótulo curto de 12px cabe no rail em todo locale. Teste na Task 3 (`rótulos curtos cabem`).

---

## Fase 1 — Identidade e identificadores (T8, T4)

### Task 1: Celeste raro e controles fixos no header (B-2, B-5)

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
- [ ] **Step 5: Commit** `fix(66): celeste volta a ser raro; header fixo nos dois temas`.

### Task 2: Folio, check e barra de progresso (B-1, B-7, B-11)

**Files:**
- Modify:
  - `src/features/certification/components/Historial/historialColumns.ts:17-26`: largura do folio sem transbordo a 1024. Ajuste o peso de `codigo`/`cotizacion`, ou crie `COL.folio` em `src/shared/ui/AppDataTable/columnWidth.ts`.
  - `src/features/certification/components/Historial/HistorialTable.tsx:64`: `whitespace-nowrap`.
  - `src/features/certification/components/Emission/EmissionStudentsTable.tsx:88` e `src/features/certification/components/Emission/BatchIssueDialog.tsx:79`: `✓` vira `AppIcon name="check"` com `aria-hidden`; o folio fica `nowrap`. O `AppTag` aceita `icon`.
  - `src/features/operation/components/Document/TurmaDocuments.tsx:46-49`: trilho e barra ≥ 3:1 nos dois temas. Trilho `--surface-400`, ou com borda `cinza-traco`; barra `--green-700` no claro e `--green-400` no escuro. Medir.
- Test:
  - `columnWidth.test.ts`, `HistorialTable.test.tsx`, `EmissionStudentsTable.test.tsx`.
  - `TurmaDocuments.test.tsx` (novo, só a classe e o token).

**Interfaces:** nenhuma.

- [ ] **Step 1: Testes que falham:**
  - `folio não quebra`: classe `whitespace-nowrap`.
  - `peso do folio comporta LOT-AAAA-NNNNN a 1024`: a largura calculada é ≥ à do texto, pela função de `columnWidth`.
  - `check é ícone, não glifo`: sem `✓` no texto.
  - `barra de progresso usa os tokens medidos`.
- [ ] **Step 2–4:** FAIL → implementar → PASS.
- [ ] **Step 5: Commit** `fix(66): folio contido, check como ícone, barra legível`.

### Task 3: Movimento reduzido e rail a 12px (B-3/A-11, B-4)

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
- [ ] **Step 5: Commit** `fix(66): respeita movimento reduzido; rail a 12px`.

## Fase 2 — Gráficos do painel (T6)

### Task 4: Meses da janela preenchidos com zero (D-2)

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
- [ ] **Step 5: Commit** `fix(66): painel preenche com zero os meses vazios da janela`.

### Task 5: Rankings, linhas distinguíveis e gráfico acessível (D-3, D-4, D-8)

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
  - `empate na décima posição desempata por nome` (Review Focus 2): o mesmo top 10 em toda renderização.
  - `contagens em dois cards`.
  - `cada série tem traço próprio, também na legenda`.
  - `gráfico expõe tabela acessível com os dados`.
  - `wrapper não tem role img`.
- [ ] **Step 2–4:** FAIL → implementar → PASS.
- [ ] **Step 5: Commit** `fix(66): rankings top 10, séries distinguíveis, gráfico com tabela acessível`.

### Task 6: UF por idioma e KPI zerado neutro (D-5, D-7)

**Files:**
- Modify:
  - `src/shared/lib/uf.ts`: `formatUf(value: string, locale: string = i18n.language): string`. Usa `new Intl.NumberFormat(locale, { maximumFractionDigits: 4 }).format(value)`, com a string decimal direto, sem `Number`. A assinatura não muda para os 8 chamadores.
  - `src/app/pages/Dashboard/admin/kpiCards.ts:39-49`: tom `null` quando o valor é 0.
- Test: `src/shared/lib/uf.test.ts` (novo), `src/app/pages/Dashboard/admin/kpiCards.test.ts`

**Interfaces:** nenhuma.

- [ ] **Step 1: Testes que falham:**
  - `es-CL agrupa milhar com ponto e decimal com vírgula`: `formatUf('12345.6700','es-CL') === '12.345,67'`.
  - `en usa vírgula e ponto`: `'12,345.67'`.
  - `zeros à direita somem`: `'1.0000'` → `'1'`, e `'0.0000'` → `'0'` (Review Focus 3).
  - `valor negativo mantém o sinal`: `'-1500.5000'` em es-CL → `'-1.500,5'`.
  - `KPI em 0 não pinta severidade`.
- [ ] **Step 2–4:** FAIL → implementar → PASS. Rode `pnpm vitest run src/features/commercial` para os chamadores de UF.
- [ ] **Step 5: Commit** `fix(66): UF formatada por idioma; KPI zerado sem alarme`.

## Fase 3 — Teclado e leitor de tela (T7)

### Task 7: Estado dos controles, busca, rolagem, subnav e rótulos do Prime (A-4, A-5, A-6, A-9, A-12)

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
- [ ] **Step 5: Commit** `fix(66): estado e nome acessível nos controles`.

### Task 8: Foco ao reordenar, nível de título e links do painel (A-3, A-7, A-8)

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
  - `curso com um módulo só tem as setas desabilitadas, e remover o último devolve o foco ao botão de adicionar` (Review Focus 4).
  - `card header é h2 por padrão`.
  - `link do painel tem aparência de link`.
- [ ] **Step 2–4:** FAIL → implementar → PASS.
- [ ] **Step 5: Commit** `fix(66): foco ao reordenar, hierarquia de título, links do painel`.

## Fase 4 — Carga e polimento (T9)

### Task 9: Logo, assets, toolbar, viewport, raio e cabeçalho (D-10, B-6, B-9, B-10, B-12, D8)

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
- [ ] **Step 2–4:** FAIL → implementar → PASS. Rode `pnpm build` e anote o `dist` final (gz) contra a medição do bloco 64 (Task 7).
- [ ] **Step 5: Commit** `fix(66): polimento de carga e layout`.

## Fase 5 — Passada visual

### Task 10: Passada visual e quadro de fechamento do bloco 66

**Files:**
- Create: `docs/superpowers/blocos/66-frontend-identidade-graficos-e-acessibilidade/visual/<ID>.png` (uma por achado visual), `docs/superpowers/blocos/66-frontend-identidade-graficos-e-acessibilidade/fechamento.md` (uma linha por ID deste bloco: os 27 do cabeçalho; e, numa seção "Quadro dos 46", todos os IDs da auditoria apontando para o `fechamento.md` do bloco que o fechou (64, 65 ou 66) — com a prova: teste (arquivo e nome), captura (caminho) ou "veredito do João")

**Interfaces:**
- Consumes: Tasks 1–9.

- [ ] **Step 1:** Subir o stack da lane (`docker compose up -d`, offset da lane no `.env`). Se o `artisan test` fatalizar por memória, é a P-57 (imagem `app` velha): `docker compose build app`.
- [ ] **Step 2:** Skill `lotus-ui-review` em: Dashboard (séries, rankings, KPIs), Certificados (Historial, Emisión), Operación (documentos da turma), Cursos (módulos), shell (sidebar colapsada e header nos dois temas), listagens com busca a 390 — 1440×900, 1024×768 e 390×844, claro e escuro. A varredura completa fica no scratchpad.
- [ ] **Step 3:** Por achado visual (A-12, B-1, B-2, B-4, B-5, B-6, B-7, B-9, B-10, B-11, B-12, D-4, D-7), versionar só a captura que prova o veredito, em PNG.
- [ ] **Step 4:** Regressão vista na passada vira correção na task dona, com commit próprio, antes de seguir.
- [ ] **Step 5:** Escrever o `fechamento.md`; levar ao João, numa rodada só, os IDs que nem teste nem captura fecham.
- [ ] **Step 6:** Gate final: `pnpm lint`, `pnpm test`, `pnpm build` e `docker compose exec -T app php artisan test` verdes.
- [ ] **Step 7: Commit** `docs(66): passada visual e quadro de fechamento`.

## Grupos paralelos

| Grupo | Tasks | Files: disjuntos | Aresta Consumes/Produces |
|---|---|---|---|
| G1 | 2, 4, 6 | sim, nos três pares: `historialColumns`/`HistorialTable`/`EmissionStudentsTable`/`BatchIssueDialog`/`TurmaDocuments` (+ `columnWidth` e testes) × `backend/.../AnalyticsQuery.php`, `AnalyticsQueryTest.php`, `pivot.ts` × `src/shared/lib/uf.ts`, `uf.test.ts`, `kpiCards.ts`, `kpiCards.test.ts`; nenhuma das três toca locales | nenhuma: a 4 não muda o DTO; a 6 não lê série; a 2 só consome o `AppIcon` do 64 |

Task fora de grupo executa e revisa uma a uma.

## Handoff de execução

- `executor: claude`. O bloco decide padrão em `shared/` e mexe em lei do §5 ou em julgamento visual; não há paths fechados para o Codex.
- Sessão: `opus`, esforço `high`.
- Papéis (`.claude/papeis.md`): `implementador-mecanico` nas Tasks 2, 6 e 9; `implementador-integracao` nas Tasks 1, 3, 4, 5, 7 e 8; a Task 10 é da sessão (navegador e conversa com o João); `revisor-task` em toda task, `re-revisor` nas rodadas de correção, `corretor-tardio` nas rodadas 4–5, `revisor-branch` ao fim.
