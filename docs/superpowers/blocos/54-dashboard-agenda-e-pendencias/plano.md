# Bloco 54 — Dashboard: agenda e pendências — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fazer KPI e agenda do Dashboard contarem o mesmo conjunto, dizer por que a turma não está habilitada, tornar o gate RBAC explícito no payload, provar a borda do último dia e tirar o transbordo dos dois painéis de tabela.

**Architecture:** Um classificador puro em `Domains/Dashboard/Services` põe cada turma `em_andamento` em exatamente um de quatro baldes; `OperationMetricsQuery` (admin) e `RedatorScopeQuery` (redator) passam a montar agenda e KPIs a partir dele. "Por confirmar" vira contagem SQL por `whereDisplayStatus(Habilitada)`. `TurmaComplianceData` ganha os requisitos faltantes e as pendências ganham a presencial sem local. Um `DashboardVisibilityData` vai no payload do admin e o front decide seção por ele, num módulo só.

**Tech Stack:** Laravel 13 / PHP 8.3, spatie/laravel-data + typescript-transformer, PHPUnit (sqlite `:memory:`), React 19 + vitest, i18next, playwright-cli (medição do D-73).

**Spec:** `docs/superpowers/blocos/54-dashboard-agenda-e-pendencias/spec.md`

## Global Constraints

- Baldes (spec D1), avaliados nesta ordem, `hoje = FusoDoNegocio::hoje()`, `horizonte = DashboardWindows::turmaHorizon()` (7 dias, inalterado): `overdue` = `end_date < hoje`; `upcoming` = `start_date > hoje` (sem teto); `ending_soon` = `start_date ≤ hoje ≤ end_date ≤ horizonte`; `in_progress` = `start_date ≤ hoje` e `end_date > horizonte`.
- A chave do payload do balde das futuras **continua `starting_soon`** (decisão deste plano: só o rótulo muda; evita mexer em `AgendaData`, `RedatorAgendaData` e no tipo do `AgendaPanel`).
- Rótulo `dashboard.agenda.startingSoon`: es-CL "Próximas clases", pt-BR "Próximas turmas", en "Upcoming classes" (= o KPI `proximasTurmas` de cada locale).
- KPI `turmas_em_andamento` (admin e redator) = |overdue| + |ending_soon| + |in_progress|. O funil (`PipelineQuery`) segue com o total `em_andamento`, futuras incluídas.
- `generated.ts` só por `docker compose exec -T app php artisan typescript:transform`; nunca à mão.
- Mensagem ao usuário só de `lang/`, três locales no backend (`en`, `es_CL`, `pt_BR`) e no front (`es-CL`, `pt-BR`, `en`), mesmas chaves.
- Sem PrimeReact fora de `shared/ui`; `app/pages` não importa de `features/` para rótulo — o helper novo mora em `shared/lib`.
- Teste de regressão: ver reprovar contra o código antigo copiando o arquivo antigo para o scratchpad e restaurando — **nunca `git stash`**.
- Backend: `docker compose exec -T app php artisan test --filter=<Teste>` na raiz da lane, stack de offset +3 (`docker compose up -d`). Pint no host, de `backend/`, só com os arquivos tocados.
- Frontend: de `frontend/`, `pnpm test`, `pnpm lint`, `pnpm build` (o `build` é o type-check).
- Ao fim: nenhum `CertificateStatus::Emitido` em `backend/app/Domains/Dashboard/` (grep vazio).

## Review Focus

1. Turma que começa **hoje** é `ending_soon` ou `in_progress`, nunca `upcoming` — pinado no `AgendaClassifierTest` (Task 1).
2. Turma de um dia que começa e termina hoje é `ending_soon` — `AgendaClassifierTest` (Task 1).
3. Turma **concluída** com datas futuras não aparece em "Próximas" nem em KPI algum — `OperationMetricsQueryTest` (Task 3).
4. Presencial com `local_aplicacao` só de espaços conta como sem local, na linha de compliance e na pendência (paridade com o `trim` do `whereDisplayStatus`) — `OperationMetricsQueryTest` (Task 5).
5. Admin sem gate de operação não consulta turma nenhuma e recebe KPIs de turma `null` — `DashboardEndpointTest::test_admin_sem_gate_de_operacao_recebe_kpi_de_turma_nulo_e_nao_zero` segue verde **sem edição** depois das Tasks 3 e 6.

---

### Task 1: Classificador de agenda

**Files:**
- Create: `backend/app/Domains/Dashboard/Enums/AgendaBucket.php`
- Create: `backend/app/Domains/Dashboard/Services/AgendaBuckets.php`
- Create: `backend/app/Domains/Dashboard/Services/AgendaClassifier.php`
- Modify: `backend/app/Domains/Dashboard/Services/DashboardWindows.php` (docblock: o horizonte agora só delimita `ending_soon`; `upcoming` não tem teto)
- Test: `backend/tests/Feature/Dashboard/AgendaClassifierTest.php`

**Interfaces:**
- Consumes: `FusoDoNegocio::hoje()`, `DashboardWindows::turmaHorizon()`.
- Produces:
  - `enum AgendaBucket: string { Overdue = 'overdue'; Upcoming = 'upcoming'; EndingSoon = 'ending_soon'; InProgress = 'in_progress'; }` (sem `#[TypeScript]`).
  - `final readonly class AgendaBuckets` com `public Collection $overdue, $upcoming, $endingSoon, $inProgress` (cada `Collection<int, Turma>`, ordem de entrada preservada) e `public function startedCount(): int` (= overdue + endingSoon + inProgress).
  - `final class AgendaClassifier { public static function bucketOf(Turma $turma): AgendaBucket; public static function classify(Collection $turmas): AgendaBuckets; }` — puro: nunca consulta, não filtra status (o chamador entrega só `em_andamento`, já escopadas).

- [ ] **Step 1: Write the failing test** — `AgendaClassifierTest`, `CarbonImmutable::setTestNow('2026-08-14 12:00:00')` no `setUp` (como o `OperationMetricsQueryTest`), turmas em memória com `new Turma(['start_date' => ..., 'end_date' => ...])`:
  - `test_cada_turma_cai_no_balde_da_borda`: datas → balde esperado por `bucketOf`:
    `08-01..08-13` → Overdue · `08-15..08-30` → Upcoming · `08-24..09-10` (10 dias à frente) → Upcoming · `08-14..08-14` → EndingSoon · `08-10..08-14` → EndingSoon · `08-10..08-21` (= horizonte) → EndingSoon · `08-10..08-22` (horizonte + 1) → InProgress · `08-14..09-30` (começa hoje) → InProgress.
  - `test_classify_particiona_sem_sobra_nem_repeticao`: as 8 turmas acima → `count` de cada balde = 1, 2, 3, 2 (overdue, upcoming, endingSoon, inProgress); soma = 8; nenhum id em dois baldes; `startedCount() === 6`.
- [ ] **Step 2: Run** `docker compose exec -T app php artisan test --filter=AgendaClassifierTest` — Expected: FAIL, classe inexistente.
- [ ] **Step 3: Implement** enum, `AgendaBuckets` e `AgendaClassifier` conforme Interfaces; `classify` usa `bucketOf` e `groupBy`/`partition` sobre a coleção, baldes vazios como coleção vazia.
- [ ] **Step 4: Run** o mesmo filtro — Expected: PASS.
- [ ] **Step 5: Commit** — `feat(54): classificador de agenda em baldes disjuntos`.

---

### Task 2: AnalyticsQuery — borda do último dia (P-85) e emitido pelo resolver

**Files:**
- Modify: `backend/app/Domains/Dashboard/Services/AnalyticsQuery.php:50,100,148,180-185`
- Test: `backend/tests/Feature/Dashboard/AnalyticsQueryTest.php`

**Interfaces:**
- Consumes: `App\Shared\Support\DataSql::literal(Connection, CarbonInterface): string`; `EmissionStateResolver::whereVigente(Builder $certificates)` (qualifica pela tabela).
- Produces: nada novo; assinaturas de `series()`/`rankings()` inalteradas.

- [ ] **Step 1: Write the failing test** — `test_turma_que_comeca_no_ultimo_dia_do_periodo_entra_na_serie_e_nos_rankings`: período que termina em `D`; turma com `start_date = D` (curso C, cliente X). Asserts: o mês de `D` em `turmas_iniciadas` conta 1; a linha de C em `rankings.courses` tem `turmas = 1`; a linha de X em `rankings.clients` tem `turmas = 1`.
- [ ] **Step 2: Run** `--filter=test_turma_que_comeca_no_ultimo_dia` — Expected: FAIL no sqlite (`'D 00:00:00' <= 'D'` falso).
- [ ] **Step 3: Implement** — nos três `whereBetween` de `start_date`, os limites passam por `DataSql::literal($query->getConnection(), $start|$end)`; no ranking de clientes, troque o `->where('certificates.status', CertificateStatus::Emitido)` por `EmissionStateResolver::whereVigente(...)` e apague o comentário "unificá-la fica para o bloco 54". Se o import de `CertificateStatus` ficar órfão, saia com ele.
- [ ] **Step 4: Run** `--filter=AnalyticsQueryTest` — Expected: PASS, incluindo o `test_certificado_revogado_nao_conta_como_emitido_em_serie_nem_ranking` existente, sem edição. `grep -rn 'CertificateStatus::Emitido' backend/app/Domains/Dashboard` vazio.
- [ ] **Step 5: Commit** — `fix(54): AnalyticsQuery prova o último dia e conta emitido pelo resolver`.

---

### Task 3: Admin — agenda e KPIs pelos baldes, "por confirmar" em SQL, rótulo "Próximas clases"

**Files:**
- Modify: `backend/app/Domains/Dashboard/Services/OperationMetricsQuery.php` (`kpis()`, `agenda()`)
- Modify: `backend/app/Domains/Dashboard/Services/AdminDashboardAssembler.php:115-120`
- Modify: `backend/app/Domains/Dashboard/Services/PipelineQuery.php:44` (só o docblock do shape)
- Modify: `frontend/src/shared/config/locales/{es-CL,pt-BR,en}.json` (`dashboard.agenda.startingSoon`)
- Test: `backend/tests/Feature/Dashboard/OperationMetricsQueryTest.php`, `backend/tests/Feature/Dashboard/DashboardEndpointTest.php`, `backend/tests/Feature/Shared/ListQueryBudgetTest.php` (constante `DASHBOARD`)

**Interfaces:**
- Consumes: `AgendaClassifier::classify()`, `AgendaBuckets` (Task 1); `TurmaQueryBuilder::whereDisplayStatus(TurmaDisplayStatus::Habilitada)`.
- Produces: `OperationMetricsQuery::kpis(): array{em_andamento:int, iniciadas:int, encerrando:int, atrasadas:int, conclusoes_por_confirmar:int}` — `em_andamento` = total (funil), `iniciadas` = `startedCount()` (card). `AgendaData` sem mudança de forma.

**Testes existentes que fixam o comportamento antigo** (atualize, não apague): `OperationMetricsQueryTest::test_agrega_kpis_agenda_compliance_e_pendencias_operacionais` (`:108-117`: `in_progress` deixa de conter a `endingSoon`; `em_andamento` do array segue total); `DashboardEndpointTest::test_admin_completo_recebe_todas_as_secoes_com_valores_conferidos` (`:87`, `:115`) e `test_admin_sem_gate_comercial_nao_recebe_nenhum_valor_de_uf` (`:182`) — recalcule com o cenário, comentando por que cada número mudou.

- [ ] **Step 1: Write the failing tests** em `OperationMetricsQueryTest`:
  - `test_turma_dez_dias_a_frente_esta_na_agenda_e_no_total`: turma `start = hoje+10` → `agenda()->starting_soon` contém o id; `kpis()['em_andamento']` a conta; `kpis()['iniciadas']` não.
  - `test_kpis_sao_o_tamanho_dos_baldes`: cenário com 1 de cada balde → `encerrando === count(ending_soon)`, `atrasadas === count(overdue)`, `iniciadas === count(overdue)+count(ending_soon)+count(in_progress)`, e nenhum id em duas listas da agenda.
  - `test_conclusoes_por_confirmar_e_o_display_status_habilitada`: uma turma habilitada (documentação completa, redator, online) e uma não → `conclusoes_por_confirmar === Turma::query()->whereDisplayStatus(TurmaDisplayStatus::Habilitada)->count() === 1`.
  - `test_turma_concluida_nao_entra_em_agenda_nem_kpi`: concluída com `start = hoje+5` → ausente de `starting_soon`; `em_andamento` não a conta.
- [ ] **Step 2: Run** `--filter=OperationMetricsQueryTest` — Expected: FAIL (agenda corta em 7 dias, sem chave `iniciadas`).
- [ ] **Step 3: Implement** — `agenda()` mapeia os baldes de `classify($this->turmasEmAndamento())` (`upcoming` → `starting_soon`); `kpis()` deriva `em_andamento`/`iniciadas`/`encerrando`/`atrasadas` da coleção memoizada e `conclusoes_por_confirmar` da contagem SQL. Assembler: `turmas_em_andamento: $turmaKpis['iniciadas'] ?? null`. Docblocks do shape no assembler e no `PipelineQuery`. Rótulos do Global Constraints nas três locales.
- [ ] **Step 4: Atualize** os testes existentes listados acima; rode `--filter='OperationMetricsQueryTest|DashboardEndpointTest|PipelineQueryTest'` — Expected: PASS.
- [ ] **Step 5: Meça e atualize** `ListQueryBudgetTest::DASHBOARD['admin']` com o número que o teste reportar (a contagem cai: os três `count()` saem). Rode `--filter=ListQueryBudgetTest` — PASS. Comente a constante com o motivo.
- [ ] **Step 6: Run** a suíte inteira do backend e `pnpm test` — PASS.
- [ ] **Step 7: Commit** — `fix(54): agenda e KPIs do admin saem dos mesmos baldes`.

---

### Task 4: Redator — agenda e resumo pelos baldes

**Files:**
- Modify: `backend/app/Domains/Dashboard/Services/RedatorScopeQuery.php` (`resumo()`, `agenda()`)
- Test: `backend/tests/Feature/Dashboard/RedatorScopeQueryTest.php`, `backend/tests/Feature/Dashboard/DashboardEndpointTest.php:235`

**Interfaces:**
- Consumes: `AgendaClassifier::classify()`, `AgendaBuckets` (Task 1). `turmasEmAndamento($redator)` segue a porta única do escopo.
- Produces: nada novo; `RedatorResumoData`/`RedatorAgendaData` com a mesma forma.

**Testes existentes que fixam o comportamento antigo:** `RedatorScopeQueryTest::test_agenda_traz_as_turmas_do_redator_e_nenhuma_do_outro` (`:210-233`: a `aEmCurso` termina dentro do horizonte e sai de `in_progress`) e `DashboardEndpointTest::test_redator_recebe_so_o_proprio_escopo_e_nenhuma_secao_de_admin` (`:235`).

- [ ] **Step 1: Write the failing tests** em `RedatorScopeQueryTest`:
  - `test_turma_dez_dias_a_frente_esta_no_kpi_e_na_agenda`: turma do redator A com `start = hoje+10` → `resumo()->proximas_turmas` a conta **e** `agenda()->starting_soon` contém o id.
  - `test_turma_alheia_dez_dias_a_frente_nao_aparece`: a mesma turma do redator B → ausente do resumo e da agenda de A.
  - `test_resumo_e_o_tamanho_dos_baldes`: `proximas_turmas === count(starting_soon)`; `turmas_em_andamento === count(overdue)+count(ending_soon)+count(in_progress)`; nenhum id em duas listas.
- [ ] **Step 2: Run** `--filter=RedatorScopeQueryTest` — Expected: FAIL (corte em 7 dias).
- [ ] **Step 3: Implement** — `agenda()` e `resumo()` usam `classify($this->turmasEmAndamento($redator))`; `agendaBucket` passa a receber a coleção do balde.
- [ ] **Step 4: Atualize** os dois testes existentes; rode `--filter='RedatorScopeQueryTest|DashboardEndpointTest|ListQueryBudgetTest'` — PASS, com `DASHBOARD['redator']` **sem edição** (a coleção já é memoizada; se mudar, pare e reporte).
- [ ] **Step 5: Commit** — `fix(54): KPI e agenda do redator contam o mesmo conjunto (D-72)`.

---

### Task 5: Requisitos no "Cumplimiento" e pendência da presencial sem local (P-102)

**Files:**
- Modify: `backend/app/Domains/Dashboard/Data/TurmaComplianceData.php`
- Modify: `backend/app/Domains/Dashboard/Enums/PendingItemType.php`
- Modify: `backend/app/Domains/Dashboard/Services/OperationMetricsQuery.php` (`complianceTurmas()`, `pendencias()`)
- Modify: `backend/lang/{en,es_CL,pt_BR}/dashboard.php` (`pending.turma_presencial_without_local`)
- Create: `frontend/src/shared/lib/turmaRequirement.ts` (+ export no `shared/lib/index.ts`)
- Modify: `frontend/src/features/operation/components/Document/ConcludePanel.tsx:40` (usa o helper)
- Modify: `frontend/src/app/pages/Dashboard/admin/CompliancePanel.tsx` (coluna "Faltan")
- Modify: `frontend/src/app/pages/Dashboard/navigation.ts` (entrada nova do `Record<PendingItemType, Destino>`)
- Regenerate: `frontend/src/shared/types/generated.ts`
- Test: `backend/tests/Feature/Dashboard/OperationMetricsQueryTest.php`, `backend/tests/Feature/Dashboard/DashboardEndpointTest.php` (`test_compliance_do_admin_publica_os_tipos_como_codigo_do_enum`), `frontend/src/shared/lib/turmaRequirement.test.ts`, `frontend/src/app/pages/Dashboard/navigation.test.ts`

**Interfaces:**
- Consumes: `HabilitacaoStatus::missingRequirements(): array<TurmaRequirement>`; `turmaDocumentTypeList(types, t)` de `shared/lib`; chaves `operation.conclusion.requirement.{redator,local_aplicacao}` (já nas três locales).
- Produces:
  - `TurmaComplianceData::$missing_requirements` — `/** @var TurmaRequirement[] */ public array $missing_requirements`, logo após `missing_types`.
  - `PendingItemType::TurmaPresencialWithoutLocal = 'turma_presencial_without_local'`, data = `start_date`, navegação `['turma_id' => id]`, severidade Normal.
  - `turmaRequirementLabel(req: TurmaRequirement, t): string` e `turmaRequirementList(reqs: TurmaRequirement[], t): string` em `shared/lib/turmaRequirement.ts`, no molde de `turmaDocumentType.ts`.

- [ ] **Step 1: Write the failing backend tests** em `OperationMetricsQueryTest`:
  - `test_compliance_lista_requisitos_faltantes`: turma presencial, `local_aplicacao = '   '`, sem redator, documentação completa → linha com `missing_types = []`, `missing_requirements = [Redator, LocalAplicacao]`, `habilitada = false`.
  - `test_pendencias_sinalizam_presencial_sem_local`: a mesma turma → `pendencias()` contém um item `TurmaPresencialWithoutLocal` com `entity_id` da turma e `date` = `start_date`; turma online sem local não gera o item.
- [ ] **Step 2: Run** `--filter=OperationMetricsQueryTest` — Expected: FAIL.
- [ ] **Step 3: Implement backend** — campo no DTO, caso no enum, item em `pendencias()` logo após o "sem relator", frase nas três locales do backend (es_CL: "Clase presencial sin lugar de aplicación."). Regenere `generated.ts`.
- [ ] **Step 4: Run** `--filter='OperationMetricsQueryTest|DashboardEndpointTest|LocaleParityTest|MensagemLiteralTest'` — PASS. No `test_compliance_do_admin_publica_os_tipos_como_codigo_do_enum`, acrescente o assert de `missing_requirements` como código do enum (`'redator'`, `'local_aplicacao'`).
- [ ] **Step 5: Write the failing front tests** — `turmaRequirement.test.ts`: `turmaRequirementList(['redator','local_aplicacao'], eco)` devolve os dois rótulos pelas chaves `operation.conclusion.requirement.*`, na ordem recebida; `navigation.test.ts`: `turma_presencial_without_local` leva a `/operacion/turmas/<turma_id>`.
- [ ] **Step 6: Implement front** — helper; `ConcludePanel` passa a usar `turmaRequirementLabel`; coluna "Faltan" = documentos (`turmaDocumentTypeList`) seguidos de requisitos (`turmaRequirementList`), separados por vírgula, `—` só quando os dois vazios; entrada nova em `PENDENCIA`.
- [ ] **Step 7: Run** de `frontend/`: `pnpm test && pnpm lint && pnpm build` — PASS.
- [ ] **Step 8: Commit** — `fix(54): Cumplimiento diz o que falta e pendência da presencial sem local (P-102)`.

---

### Task 6: Visibilidade explícita no payload do admin (D-34)

**Files:**
- Create: `backend/app/Domains/Dashboard/Data/DashboardVisibilityData.php`
- Modify: `backend/app/Domains/Dashboard/Data/AdminDashboardData.php`
- Modify: `backend/app/Domains/Dashboard/Services/AdminDashboardAssembler.php:56-62` e usos dos `$can*`
- Regenerate: `frontend/src/shared/types/generated.ts`
- Create: `frontend/src/app/pages/Dashboard/admin/secoes.ts`
- Modify: `frontend/src/app/pages/Dashboard/admin/{AdminView.tsx,kpiCards.ts,SeriesPanel.tsx,RankingsPanel.tsx}`
- Test: `backend/tests/Feature/Dashboard/DashboardEndpointTest.php`, `backend/tests/Feature/Dashboard/DashboardContractTest.php`, `frontend/src/app/pages/Dashboard/admin/secoes.test.ts`, `frontend/src/app/pages/Dashboard/admin/kpiCards.test.ts`

**Interfaces:**
- Consumes: `User::can()`; as permissões e combinações do spec D8 (tabela + "seções que pedem dois gates").
- Produces:
  - `#[TypeScript] class DashboardVisibilityData extends Data { bool $operation; bool $commercial; bool $certification; bool $identity; public static function forUser(User $user): self }` — `commercial` = `commercial.quote.view` **e** `commercial.budget.view`.
  - `AdminDashboardData::$visibility` (`public DashboardVisibilityData $visibility`, logo após `view`).
  - Front: `secoesVisiveis(v: DashboardVisibilityData): SecoesAdmin`, com `SecoesAdmin = { turmas: boolean; cotacoes: boolean; certificadosAEmitir: boolean; agenda: boolean; compliance: boolean; pipeline: boolean; redatores: boolean; series: boolean; rankings: boolean; ufMetrica: boolean }` — `pipeline` e `rankings` = operation ∧ certification; `redatores` = identity ∧ operation; `series` = operation ∨ commercial ∨ certification; `agenda`/`compliance`/`turmas` = operation; `cotacoes`/`ufMetrica` = commercial; `certificadosAEmitir` = certification. `kpiCards(k: AdminKpisData, v: DashboardVisibilityData): Kpi[]`.

- [ ] **Step 1: Write the failing backend tests** — em `DashboardEndpointTest`: `test_admin_recebe_a_visibilidade_explicita_por_modulo` (admin completo → os quatro `true`; admin sem `commercial.budget.view` → `commercial = false`, demais `true`). Em `DashboardContractTest::test_admin_dashboard_data_discrimina_view_e_preserva_secoes_nulas`, construa com `visibility` e asserte que serializa os quatro booleanos.
- [ ] **Step 2: Run** `--filter='DashboardEndpointTest|DashboardContractTest'` — FAIL.
- [ ] **Step 3: Implement backend** — DTO; o assembler monta `$v = DashboardVisibilityData::forUser($user)` uma vez e troca os quatro `$can*` por `$v->operation` etc., mantendo as combinações de `:90`, `:102`, `:200`; payload leva `visibility: $v`. Regenere `generated.ts`. Rode o filtro e o `ListQueryBudgetTest` — PASS, constante sem edição.
- [ ] **Step 4: Write the failing front tests** — `secoes.test.ts`: tudo `true` → todas as seções `true`; só `operation` → `pipeline`, `rankings`, `redatores`, `cotacoes`, `ufMetrica`, `certificadosAEmitir` `false` e `series` `true`; só `commercial` → `series` e `ufMetrica` `true`, `agenda` `false`. `kpiCards.test.ts`: com `v.operation = false` e `k.turmas_em_andamento = null` não há card de turma; com `v.operation = true` e todos os KPIs de turma `0`, os quatro cards de turma aparecem com `'0'`. Os cinco testes existentes do arquivo passam a chamar `kpiCards(k, v)`; o `campo null não vira card` vira `gate fechado não vira card`.
- [ ] **Step 5: Implement front** — `AdminView` decide cada seção por `secoesVisiveis(data.visibility)` (o `!== null` que sobrar só estreita tipo, dentro do ramo já decidido); `kpiCards` recebe `v`; `SeriesPanel` recebe a visibilidade e decide cada série pelo módulo dela; `RankingsPanel` troca `metricasDisponiveis(rankings)` por `metricasDisponiveis(secoes)` (oferta `uf_aprovada` quando `ufMetrica`). Docblocks que descrevem o farejo de nulo saem junto.
- [ ] **Step 6: Run** de `frontend/`: `pnpm test && pnpm lint && pnpm build` — PASS. `grep -n "uf_aprovada !== null" frontend/src/app/pages/Dashboard` vazio.
- [ ] **Step 7: Commit** — `refactor(54): visibilidade RBAC explícita no payload do Dashboard (D-34)`.

---

### Task 7: Painéis de tabela sem transbordo (D-73)

**Files:**
- Modify: `frontend/src/app/pages/Dashboard/admin/CompliancePanel.tsx`
- Modify: `frontend/src/app/pages/Dashboard/admin/RedatorLoadPanel.tsx`
- Modify (se a causa estiver lá): `frontend/src/app/pages/Dashboard/admin/panelColumns.ts`
- Evidence: `docs/superpowers/blocos/54-dashboard-agenda-e-pendencias/medicoes-d73.md`

**Interfaces:**
- Consumes: `CompliancePanel` com a coluna "Faltan" da Task 5.
- Produces: nada para outras tasks.

- [ ] **Step 1: Suba e meça o estado atual** — `docker compose up -d`, `migrate --seed` com o `OperationDemoSeeder`, `pnpm dev` (Vite 5176), login de admin; com `playwright-cli` em 1024x768 e 390x844, meça `scrollWidth` e `clientWidth` do invólucro de rolagem de cada painel e, por célula, a de maior `scrollWidth` que a coluna. Registre em `medicoes-d73.md` (esperado hoje: `scrollWidth > clientWidth` nos dois). Candidata conhecida: o intervalo `whitespace-nowrap` da coluna de datas (`panelColumns.ts`, comentário do risco R1).
- [ ] **Step 2: Corrija a célula culpada** — deixe-a quebrar entre as duas datas (nunca dentro de uma data) ou truncar com `title`; sem mexer no piso das colunas, salvo se a medição apontar ele.
- [ ] **Step 3: Remeça** nos dois viewports — Expected: `scrollWidth == clientWidth` nos dois painéis; registre em `medicoes-d73.md`.
- [ ] **Step 4: Run** de `frontend/`: `pnpm test && pnpm lint && pnpm build` — PASS.
- [ ] **Step 5: Commit** — `fix(54): painéis de tabela do Dashboard sem transbordo (D-73)`.

---

## Grupos paralelos

| Grupo | Tasks | Files: disjuntos | Aresta Consumes/Produces |
|---|---|---|---|
| G1 | 1, 2 | sim | nenhuma entre elas |

Task fora de grupo executa e revisa uma a uma, nesta ordem: 3, 4, 5, 6, 7.

Conferência por par. G1: a 1 toca `Dashboard/Enums/AgendaBucket.php`, `Dashboard/Services/{AgendaBuckets,AgendaClassifier,DashboardWindows}.php` e `AgendaClassifierTest.php`; a 2 toca `AnalyticsQuery.php` e `AnalyticsQueryTest.php`. Interseção vazia; a 2 não consome nada da 1.

Por que o resto não paraleliza: a 3 e a 4 consomem a 1 e as duas editam `DashboardEndpointTest.php`; a 5 edita `OperationMetricsQuery.php` (da 3) e `generated.ts`; a 6 edita `AdminDashboardAssembler.php` (da 3), `DashboardEndpointTest.php` e `generated.ts` (da 5); a 7 edita `CompliancePanel.tsx` (da 5) e mede a coluna "Faltan" que a 5 alonga.

**Cruzamento com a lane 50.** O `lane.sh conferir 54` acusa as três locales do front em comum com o
plano da 50 (bloco `quote` lá; só `dashboard.agenda.startingSoon` aqui, na Task 3). Decisão do João
(2026-11-03), a mesma do 48 × 49: segue normal, e quem mesclar por segundo resolve o conflito de
texto nos JSON.

## Handoff de execução

- **executor:** `claude` — o bloco toca RBAC (D-34, lei de escopo do redator), contrato gerado e uma medição de navegador que exige julgamento sobre a célula culpada.
- **Sessão:** `opus`, esforço `high`.
- **Papéis (`.claude/papeis.md`):** `implementador-mecanico` (Tasks 1, 2), `implementador-integracao` (Tasks 3, 4, 5, 6), `revisor-task` (toda task), `re-revisor` (rodadas de correção), `corretor-tardio` (rodadas 4–5, se houver), `revisor-branch` (fim da SDD). A Task 7 roda na sessão principal: precisa do stack da lane e do navegador (`playwright-cli`).
- **Stack:** Tasks 1–6 rodam na suíte sqlite do container (`docker compose up -d` na raiz da lane, offset +3); a Task 7 precisa também de `migrate --seed` e do Vite em 5176.
