# Dashboard Backend Agregações — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.
> **Execução mesclada:** cada task declara `Executor: claude` ou `Executor: codex` — ver
> `## Handoff de execução` no fim. Task de codex roda via `lotus-execute-block`
> (`.agents/skills/`), sandbox workspace-write restrito aos `paths_autorizados` da task.

**Goal:** contrato backend read-only do Dashboard — domínio `App\Domains\Dashboard`, DTOs, queries
de agregação, `GET /api/dashboard/metricas` com RBAC/ownership por papel, e testes.

**Architecture:** spec `docs/superpowers/specs/2026-08-14-dashboard-backend-agregacoes-design.md`
(D1–D9). Dois DTOs raiz discriminados por `view` (D5); serviços de consulta por área compostos por
dois assemblers; regra de domínio reusada, nunca duplicada (D8).

**Tech Stack:** Laravel 13 · spatie/laravel-data + typescript-transformer · sqlite `:memory:` na
suíte · MySQL 8 real no gate.

## Global Constraints

- **Main tree** `/home/jvbat/projetos/lotus`, branch `feat/dashboard-backend-agregacoes` criada de
  `main` (P-03: bloco de backend não usa worktree). Backend roda **no container** `app`.
- Janelas (D4): `TURMA_WINDOW_DAYS = 7`, `EXPIRY_WINDOW_DAYS = 30` — só via `DashboardWindows`.
- Certificado revogado NÃO devolve matrícula a "a emitir" (D6): "sem certificado" = sem NENHUMA
  linha em `certificates` para o `enrollment_id`.
- Sem permissão nova (D7). Gates: comercial ← `commercial.quote.view` **e**
  `commercial.budget.view`; certificação ← `certification.certificate.view`; redatores ←
  `identity.user.view`; operação ← `operation.turma.view`. Seção sem gate = `null` tipado.
- UF sempre string bcmath 4 casas (ADR-19), nunca float.
- Zero Model/migration/tabela/Policy/Action no domínio Dashboard. Zero mutação em qualquer task.
- Toda coleção nos DTOs é projeção de saída: `#[DataCollectionOf(...)]` + `#[ReadOnlyCollection]`
  (`App\Shared\Data\Attributes\ReadOnlyCollection`) — sem isso o `PersistenceLawsTest` reprova.
- Cada aresta nova no `DomainDependencyTest` entra na task que a usa, com justificativa no commit.
- **D-P1 (emenda declarada à D9):** bucketing mensal das séries é feito em PHP sobre projeção
  mínima (`select` só de data e valor), porque truncar mês em SQL diverge entre sqlite (suíte) e
  MySQL (`DATE_FORMAT`/`strftime`). Contagens e somas de KPI continuam 100% em SQL.
- `users.type` é string crua (`'admin' | 'redator'` — sem cast de enum no model). RN-01: só esses
  autenticam.
- Pint no host, de dentro de `backend/`, **sempre com os arquivos da task como argumento**.
- Teste novo só vale visto **reprovar** antes do código (lição 10). Commits: um por task.

---

### Task 1: Contrato — enums, janelas e DTOs + `generated.ts`

**Executor: claude** (ADR-04/§5.3: o contrato é a fonte do `generated.ts`; decisão de forma).

**Files:**
- Create: `backend/app/Domains/Dashboard/Enums/{PendingItemType,DashboardAlertType,DashboardSeverity,PipelineStage,DashboardModule}.php`
- Create: `backend/app/Domains/Dashboard/Services/DashboardWindows.php`
- Create: `backend/app/Domains/Dashboard/Data/` — 19 DTOs listados abaixo
- Test: `backend/tests/Feature/Dashboard/DashboardContractTest.php`
- Regen: `frontend/src/shared/types/generated.ts` (mesmo commit — lição 11)

**Interfaces (Produces — todo o resto do plano consome):**

```php
// Enums (string-backed, #[TypeScript]):
enum PendingItemType: string {
    case QuoteAwaitingApproval = 'quote_awaiting_approval';
    case QuoteApprovedWithoutTurma = 'quote_approved_without_turma';
    case TurmaWithoutRedator = 'turma_without_redator';
    case TurmaDocsIncomplete = 'turma_docs_incomplete';
    case TurmaAwaitingConclusion = 'turma_awaiting_conclusion';
    case EnrollmentAwaitingCertificate = 'enrollment_awaiting_certificate';
}
enum DashboardAlertType: string {
    case TurmaOverdue = 'turma_overdue';
    case CertificateExpiringSoon = 'certificate_expiring_soon';
    case CertificateExpired = 'certificate_expired';
    case RedatorDocumentExpired = 'redator_document_expired';
    case RedatorDocumentExpiringSoon = 'redator_document_expiring_soon';
}
enum DashboardSeverity: string { case High = 'high'; case Medium = 'medium'; case Normal = 'normal'; }
// Derivação fixa: Expired/Overdue => High; ExpiringSoon => Medium; resto => Normal.
enum PipelineStage: string {
    case QuotePending = 'quote_pending';
    case QuoteApprovedWithoutTurma = 'quote_approved_without_turma';
    case TurmaInProgress = 'turma_in_progress';
    case TurmaReadyForConclusion = 'turma_ready_for_conclusion';
    case ConcludedPendingIssuance = 'concluded_pending_issuance';
    case FullyIssued = 'fully_issued';
}
enum DashboardModule: string { case Commercial = 'commercial'; case Operation = 'operation'; case Certification = 'certification'; }

final class DashboardWindows {
    public const TURMA_WINDOW_DAYS = 7;
    public const EXPIRY_WINDOW_DAYS = 30;
    public static function turmaHorizon(): \Carbon\CarbonImmutable;   // today + 7d (endOfDay)
    public static function expiryHorizon(): \Carbon\CarbonImmutable;  // today + 30d (endOfDay)
}
```

DTOs (todos `#[TypeScript] class X extends Data`, propriedades públicas promovidas; coleções com
`#[DataCollectionOf]` + `#[ReadOnlyCollection]`; nenhuma coleção `Optional` — o contrato inteiro é
saída):

| DTO | Propriedades |
|---|---|
| `PendingItemData` | `DashboardModule $module`, `PendingItemType $type`, `DashboardSeverity $severity`, `int $entity_id`, `string $description`, `?string $date`, `/** @var array<string,int> */ array $navigation` (RO) |
| `AlertData` | `DashboardAlertType $type`, `DashboardSeverity $severity`, `int $entity_id`, `string $description`, `?string $date`, `/** @var array<string,int> */ array $navigation` (RO) |
| `AgendaTurmaData` | `int $turma_id`, `string $course_name`, `?string $client_name`, `string $start_date`, `string $end_date` |
| `AgendaData` | 4 coleções `AgendaTurmaData[]` (RO): `starting_soon`, `ending_soon`, `in_progress`, `overdue` |
| `QuoteKpisData` | `int $pending_count`, `string $pending_value_uf` |
| `AdminKpisData` | `int $turmas_em_andamento`, `int $turmas_encerrando_em_breve`, `int $turmas_atrasadas`, `int $conclusoes_por_confirmar`, `?QuoteKpisData $cotacoes`, `?int $certificados_a_emitir` |
| `PipelineStageCountData` | `PipelineStage $stage`, `int $count` |
| `TurmaComplianceData` | `int $turma_id`, `string $course_name`, `/** @var string[] */ array $redatores` (RO), `string $start_date`, `string $end_date`, `/** @var string[] */ array $present_types` (RO), `/** @var string[] */ array $missing_types` (RO), `bool $habilitada` |
| `RedatorLoadData` | `int $redator_id`, `string $name`, `int $current_turmas`, `int $upcoming_turmas`, `int $expired_documents`, `int $expiring_documents` |
| `MonthlyCountData` | `string $month` (`YYYY-MM`), `int $count` |
| `MonthlyAmountData` | `string $month`, `string $total_uf` |
| `SeriesData` | `?array` de `MonthlyCountData[]` (RO cada): `turmas_iniciadas`, `turmas_concluidas`, `certificados_emitidos`, `matriculas`; `/** @var MonthlyAmountData[] */ ?array $uf_aprovada` (RO) |
| `RankingRowData` | `int $id`, `string $name`, `int $turmas`, `int $matriculas`, `int $certificados`, `?string $uf_aprovada` |
| `RankingsData` | `RankingRowData[]` (RO): `courses`, `clients` |
| `RedatorResumoData` | `int $turmas_em_andamento`, `int $proximas_turmas`, `int $pendencias_documentais`, `int $documentos_vencendo` |
| `RedatorTurmaPendenciaData` | `int $turma_id`, `string $course_name`, `string $end_date`, `/** @var string[] */ array $missing_types` (RO) |
| `RedatorHistoricoData` | `int $turmas_concluidas`, `int $certificados_emitidos` |
| `AdminDashboardData` | `#[LiteralTypeScriptType("'admin'")] string $view = 'admin'`, `AdminKpisData $kpis`, `PendingItemData[] $pendencias` (RO), `AlertData[] $alertas` (RO), `/** @var PipelineStageCountData[] */ ?array $pipeline` (RO), `?AgendaData $agenda`, `/** @var TurmaComplianceData[] */ ?array $compliance_turmas` (RO), `/** @var RedatorLoadData[] */ ?array $redatores` (RO), `?SeriesData $series`, `?RankingsData $rankings`, `string $period_start`, `string $period_end` |
| `RedatorDashboardData` | `#[LiteralTypeScriptType("'redator'")] string $view = 'redator'`, `RedatorResumoData $resumo`, `AgendaData $agenda`, `RedatorTurmaPendenciaData[] $pendencias_documentais` (RO), `AlertData[] $alertas_documentos` (RO), `RedatorHistoricoData $historico` |

Nota de forma: campos `?X $secao` nulos = seção não autorizada (D7); coleção vazia = autorizada e
sem dados. `SeriesData` granulariza o gate por série (operação/certificação/comercial).

- [ ] **Step 1: teste do contrato (falha primeiro)** — `DashboardContractTest`: instancia
  `AdminDashboardData` e `RedatorDashboardData` com fixtures mínimas em array e afirma
  `->toArray()`: discriminador `view`, seções nulas presentes como `null` (não ausentes), coleção
  vazia serializa `[]`. Rodar: `docker compose exec -T app php artisan test --filter=DashboardContractTest`
  → FAIL (classes inexistentes).
- [ ] **Step 2: implementar enums, `DashboardWindows` e os 19 DTOs** conforme a tabela.
- [ ] **Step 3: suíte inteira** — `docker compose exec -T app php artisan test` → verde; em
  particular `PersistenceLawsTest` (prova das marcas RO) e `DomainDependencyTest` (Task 1 não
  importa nada de outro domínio — DTOs só usam enums próprios e escalares; se reprovar, a task
  vazou uma aresta antes da hora).
- [ ] **Step 4: regenerar tipos** — `docker compose exec -T app php artisan typescript:transform`;
  `git diff --stat frontend/src/shared/types/generated.ts` mostra os tipos novos; `pnpm build` em
  `frontend/` verde (sem consumidor, só type-check).
- [ ] **Step 5: Pint + commit** — `cd backend && ./vendor/bin/pint app/Domains/Dashboard tests/Feature/Dashboard`;
  commit `feat(dashboard): contrato de DTOs, enums e janelas + generated.ts`.

---

### Task 2: `OperationMetricsQuery`

**Executor: codex** — mecânica de query com contrato fechado na Task 1 e verificação executável.
`paths_autorizados`: `backend/app/Domains/Dashboard/Services/OperationMetricsQuery.php`,
`backend/tests/Feature/Dashboard/OperationMetricsQueryTest.php`,
`backend/tests/Feature/Shared/DomainDependencyTest.php` (somente adicionar a chave `'Dashboard'`).

**Interfaces:**
- Consumes: DTOs/enums da Task 1; `TurmaHabilitacaoService::for(Turma): HabilitacaoStatus`
  (`isHabilitada()`, `missingTypes()`; **exige** `documentacaoObrigatoria` eager —
  `->with('documentacaoObrigatoria')`); `TurmaDocumentType::values()`; `Turma` (relações
  `course()`, `redatores()`, `enrollments()`, `quote()`); status via `TurmaStatus`.
- Produces:

```php
class OperationMetricsQuery {
    public function __construct(private readonly TurmaHabilitacaoService $habilitacao) {}
    /** @return array{em_andamento:int, encerrando:int, atrasadas:int, conclusoes_por_confirmar:int} */
    public function kpis(): array;
    public function agenda(): AgendaData;                       // as 4 listas, janela D4
    /** @return TurmaComplianceData[] */                        // turmas em_andamento
    public function complianceTurmas(): array;
    /** @return PendingItemData[] */                            // 3 tipos: TurmaWithoutRedator,
    public function pendencias(): array;                        // TurmaDocsIncomplete, TurmaAwaitingConclusion
}
```

- [ ] **Step 1: teste (falha primeiro)** — `OperationMetricsQueryTest` com fixtures por
  `Model::create()` (padrão da suíte; não há factories de domínio): curso + cotação aprovada +
  4 turmas: (a) `em_andamento` com `end_date` = hoje+3d e docs completos (3 tipos em
  `documentacaoObrigatoria`); (b) `em_andamento` com `end_date` ontem, docs incompletos, sem
  redator; (c) `em_andamento` com `start_date` hoje+2d (futura — `start_date > hoje` NÃO conta
  como "em andamento" para agenda `starting_soon`; contagem de KPI usa só `status`); (d)
  `concluida`. Asserções: `kpis()` = `['em_andamento'=>3,'encerrando'=>1,'atrasadas'=>1,
  'conclusoes_por_confirmar'=>1]`; `agenda()` põe (a) em `ending_soon`, (b) em `overdue`, (c) em
  `starting_soon`; `complianceTurmas()` traz (b) com `habilitada=false` e `missing_types` não
  vazio; `pendencias()` contém `TurmaWithoutRedator` e `TurmaDocsIncomplete` para (b) e
  `TurmaAwaitingConclusion` para (a). Rodar
  `docker compose exec -T app php artisan test --filter=OperationMetricsQueryTest` → FAIL.
- [ ] **Step 2: implementar.** Contagens 100% em SQL (`Turma::query()->where('status',...)` +
  `whereDate`); `conclusoes_por_confirmar`, compliance e pendências derivam sobre **uma única**
  coleção `em_andamento` com `->with(['documentacaoObrigatoria','course','redatores','quote.budget.client'])`,
  reusando `$this->habilitacao->for($turma)` (D8 — proibido reimplementar a regra). Horizontes só
  por `DashboardWindows`.
- [ ] **Step 3: aresta** — adicionar em `DomainDependencyTest::ALLOWED`:
  `'Dashboard' => ['Operation\Models\Turma', 'Operation\Enums\TurmaStatus',
  'Operation\Enums\TurmaDocumentType', 'Operation\Services\TurmaHabilitacaoService',
  'Catalog\Models\Course', 'Commercial\Models\Quote', 'Commercial\Models\Budget',
  'Commercial\Models\Client', 'Identity\Models\Redator']` — só as que ESTA task importa de fato;
  conferir com os `use` do arquivo final.
- [ ] **Step 4: suíte inteira verde**; Pint nos 2 arquivos; commit
  `feat(dashboard): OperationMetricsQuery (kpis, agenda, compliance, pendencias)`.

---

### Task 3: `CommercialMetricsQuery`

**Executor: codex** — mesma natureza da Task 2. `paths_autorizados`:
`backend/app/Domains/Dashboard/Services/CommercialMetricsQuery.php`,
`backend/tests/Feature/Dashboard/CommercialMetricsQueryTest.php`,
`backend/tests/Feature/Shared/DomainDependencyTest.php` (somente a chave `'Dashboard'`).

**Interfaces:**
- Consumes: Task 1; `Quote` (`status: QuoteStatus`, `value_uf`, `approved_at`, `budget()`);
  turma viva de uma quote = existe linha em `turmas` com `active_quote_id = quotes.id`.
- Produces:

```php
class CommercialMetricsQuery {
    public function quoteKpis(): QuoteKpisData;                 // pending: count + soma bcmath
    /** @return PendingItemData[] */                            // QuoteAwaitingApproval,
    public function pendencias(): array;                        // QuoteApprovedWithoutTurma
}
```

- [ ] **Step 1: teste (falha)** — fixtures: budget com 3 quotes — `pending` (value_uf `100.5000`),
  `pending` (`200.2500`), `approved` **sem turma**; e 1 quote `approved` **com turma** viva.
  Asserções: `quoteKpis()` = `pending_count 2`, `pending_value_uf '300.7500'` (string exata —
  bcmath, não float); `pendencias()` tem 2 `QuoteAwaitingApproval` + 1 `QuoteApprovedWithoutTurma`
  (a quote com turma NÃO aparece). Rodar → FAIL.
- [ ] **Step 2: implementar.** Soma UF: `->pluck('value_uf')` da projeção `pending` e `bcadd` em
  4 casas (mesma forma do `BudgetSummaryService::totalValueUf`). "Sem turma":
  `->whereNotExists(fn ($q) => $q->from('turmas')->whereColumn('turmas.active_quote_id', 'quotes.id'))`.
- [ ] **Step 3: aresta** — acrescentar `'Commercial\Enums\QuoteStatus'` à chave `'Dashboard'`
  (Quote/Budget/Client já entraram na Task 2; adicionar só o que faltar de fato).
- [ ] **Step 4: suíte verde; Pint; commit**
  `feat(dashboard): CommercialMetricsQuery (kpis e pendencias de cotação)`.

---

### Task 4: `CertificationMetricsQuery` + `AnalyticsQuery` (séries e rankings)

**Executor: codex.** `paths_autorizados`:
`backend/app/Domains/Dashboard/Services/{CertificationMetricsQuery,AnalyticsQuery}.php`,
`backend/tests/Feature/Dashboard/{CertificationMetricsQueryTest,AnalyticsQueryTest}.php`,
`backend/tests/Feature/Shared/DomainDependencyTest.php` (somente a chave `'Dashboard'`).

**Interfaces:**
- Consumes: Task 1; `Certificate` (`enrollment_id`, `valido_ate`, `status: CertificateStatus`,
  `created_at` = data de emissão — spec §4.3); `Enrollment` (`approval_status`, `turma_id`);
  `files.valid_until` dos documentos de redator (`Redator::documents()` MorphMany).
- Produces:

```php
class CertificationMetricsQuery {
    public function certificadosAEmitir(): int;                 // D6: aprobado + concluida + SEM linha em certificates
    /** @return PendingItemData[] */                            // EnrollmentAwaitingCertificate (1 por turma)
    public function pendencias(): array;
    /** @return AlertData[] */                                  // cert expirado / expirando ≤30d;
    public function alertas(): array;                           // doc redator vencido / vencendo ≤30d
}
class AnalyticsQuery {
    public function series(CarbonImmutable $start, CarbonImmutable $end): SeriesData;   // D-P1: bucket YYYY-MM em PHP
    public function rankings(CarbonImmutable $start, CarbonImmutable $end): RankingsData;
}
```

- [ ] **Step 1: testes (falham)** — `CertificationMetricsQueryTest`: turma `concluida` com 3
  matrículas — `aprobado` sem certificado (conta), `aprobado` com certificado **revogado** (NÃO
  conta — a asserção da D6), `reprobado` (não conta) → `certificadosAEmitir() === 1`; certificado
  com `valido_ate` ontem → `CertificateExpired`, com `valido_ate` hoje+10d →
  `CertificateExpiringSoon`, com hoje+60d → ausente; documento de redator com `valid_until` ontem
  e hoje+10d → os dois alertas de documento. `AnalyticsQueryTest`: quotes aprovadas com
  `approved_at` em meses distintos → `uf_aprovada` bucketizada por `YYYY-MM` com soma string
  bcmath; turma iniciada fora do período NÃO entra; ranking de curso conta turmas/matrículas/
  certificados do período. Rodar os dois filtros → FAIL.
- [ ] **Step 2: implementar.** "Sem certificado": `whereNotIn('id',
  Certificate::query()->select('enrollment_id'))` sobre `Enrollment` (sem relação nova em
  Operation — não editar model de outro domínio). Séries: `select` mínimo da coluna de data (e
  `value_uf` quando UF) já filtrado pelo período em SQL; bucket `YYYY-MM` em PHP (D-P1). Datas de
  negócio da spec §4.3: `approved_at`, `start_date`, `concluded_at`, `certificates.created_at`.
  Rankings: agregação SQL com `groupBy` + `count` por curso e por cliente (via
  `quotes → budgets → clients`), UF `null` quando o chamador não pedir (parâmetro
  `bool $includeUf` — o gate é do assembler, Task 6).
- [ ] **Step 3: arestas** — acrescentar `'Certification\Models\Certificate'`,
  `'Certification\Enums\CertificateStatus'`, `'Operation\Models\Enrollment'`,
  `'Operation\Enums\EnrollmentApprovalStatus'`, `'Identity\Enums\RedatorDocumentType'` (se
  importada de fato) à chave `'Dashboard'`.
- [ ] **Step 4: suíte verde; Pint; commit**
  `feat(dashboard): CertificationMetricsQuery e AnalyticsQuery (series/rankings)`.

---

### Task 5: `RedatorScopeQuery`

**Executor: claude** — eixo de ownership (vazamento entre papéis é o risco central da spec §9).

**Files:**
- Create: `backend/app/Domains/Dashboard/Services/RedatorScopeQuery.php`
- Test: `backend/tests/Feature/Dashboard/RedatorScopeQueryTest.php`

**Interfaces:**
- Consumes: Task 1; ownership = `turma_redator` (`Turma::redatores()`); documentos próprios =
  `Redator::documents()` com `valid_until`.
- Produces:

```php
class RedatorScopeQuery {
    public function __construct(private readonly TurmaHabilitacaoService $habilitacao) {}
    public function resumo(Redator $redator): RedatorResumoData;
    public function agenda(Redator $redator): AgendaData;
    /** @return RedatorTurmaPendenciaData[] */
    public function pendenciasDocumentais(Redator $redator): array;
    /** @return AlertData[] */
    public function alertasDocumentos(Redator $redator): array;
    public function historico(Redator $redator): RedatorHistoricoData;
}
```

- [ ] **Step 1: teste (falha)** — o cenário central é o negativo: DOIS redatores com turmas
  próprias e uma turma compartilhada; cada método chamado para o redator A afirma presença das
  turmas dele (inclusive a compartilhada) e **ausência por id** de toda turma exclusiva de B; docs
  vencendo de B não aparecem nos alertas de A; `historico()` de A conta só certificados de
  matrículas de turmas de A. → FAIL.
- [ ] **Step 2: implementar** — toda query parte de
  `$redator->turmas()` / `whereHas('redatores', fn ($q) => $q->whereKey($redator->id))`; o
  escopo entra ANTES de qualquer agregação (Drive §7.4). Zero UF, zero cliente global, zero dado
  de outro redator em qualquer retorno.
- [ ] **Step 3: suíte verde; Pint; commit** `feat(dashboard): RedatorScopeQuery (ownership)`.

---

### Task 6: Assemblers, controller, rota e gates (D7)

**Executor: claude** — decide RBAC por seção e a classificação exclusiva do pipeline.

**Files:**
- Create: `backend/app/Domains/Dashboard/Services/{AdminDashboardAssembler,RedatorDashboardAssembler,PipelineQuery,RedatorLoadQuery}.php`
- Create: `backend/app/Domains/Dashboard/Data/DashboardFilterData.php`
- Create: `backend/app/Domains/Dashboard/Http/Controllers/DashboardController.php`
- Create: `backend/app/Domains/Dashboard/routes.php`
- Modify: `backend/tests/Feature/Shared/DomainDependencyTest.php` (arestas restantes, se alguma faltar)
- Test: `backend/tests/Feature/Dashboard/{PipelineQueryTest,RedatorLoadQueryTest}.php`

**Interfaces:**
- Consumes: Tasks 1–5 (todas as assinaturas acima); `HabilitacaoStatus::isHabilitada()`.
- Produces:

```php
class DashboardFilterData extends Data {          // period_start/period_end ISO; default 12 meses;
    public function __construct(                  // start > end → ValidationException → 422 RFC 7807
        public ?string $period_start,
        public ?string $period_end,
    ) {}
    public static function rules(): array;        // ['date', 'after_or_equal' no end]
}
class PipelineQuery {
    /** @return PipelineStageCountData[] */       // 6 baldes exclusivos (spec §4.3);
    public function stages(bool $includeQuoteStages): array;
}
class RedatorLoadQuery {
    /** @return RedatorLoadData[] */                  // seção `redatores` (D2): turmas atuais/
    public function get(): array;                     // próximas por redator + docs vencidos/vencendo
}
class AdminDashboardAssembler  { public function assemble(User $user, DashboardFilterData $f): AdminDashboardData; }
class RedatorDashboardAssembler { public function assemble(Redator $redator): RedatorDashboardData; }
// Composição de `alertas` no AdminDashboardAssembler: TurmaOverdue derivado da lista `overdue`
// de OperationMetricsQuery::agenda() + os alertas de CertificationMetricsQuery::alertas() —
// cada item filtrado pelo gate do módulo de origem (D7).
// DashboardController::metricas(Request): AdminDashboardData|RedatorDashboardData
// routes.php: Route::middleware('auth:sanctum')->get('dashboard/metricas', [DashboardController::class, 'metricas']);
```

Gates no `AdminDashboardAssembler` (D7 — seção sem gate = `null`; itens de pendência/alerta
filtrados pelo módulo de origem):

| Seção | Condição |
|---|---|
| `kpis.cotacoes` | `$user->can('commercial.quote.view') && $user->can('commercial.budget.view')` |
| `kpis.certificados_a_emitir` | `certification.certificate.view` |
| `pipeline` (etapas de cotação) | gate comercial → `stages(includeQuoteStages: false)` sem ele |
| `agenda`, `compliance_turmas`, KPIs de turma | `operation.turma.view` (sem ele: `null` / zeros declarados no teste da Task 7) |
| `redatores` | `identity.user.view` |
| `series.*` / `rankings` | por série: turmas/matrículas ← operação; certificados ← certificação; UF ← comercial |

- [ ] **Step 1: testes (falham)** — `PipelineQueryTest`: um exemplar por balde (quote
  pending; approved sem turma; turma em andamento não habilitada; habilitada; concluída com
  emissão pendente; concluída tudo emitido) → cada um em exatamente um balde, soma dos counts =
  total de exemplares; turma concluída sem matrícula aprovada pendente cai em `FullyIssued`
  (spec §4.3). `RedatorLoadQueryTest`: dois redatores — um com turma em andamento + turma futura +
  doc `valid_until` ontem, outro sem nada → linhas com `current_turmas`/`upcoming_turmas`/
  `expired_documents` corretos e zeros no segundo. → FAIL.
- [ ] **Step 2: implementar** `PipelineQuery`, assemblers, `DashboardFilterData` (default: fim =
  hoje, início = hoje−12 meses), controller (resolve `type`: `'redator'` → `RedatorDashboardAssembler`
  com `$user->redator` — `abort` NUNCA: usuário redator sem linha `redatores` é estado inválido e
  sobe exceção de servidor; senão admin), `routes.php` no padrão dos demais domínios.
- [ ] **Step 3: suíte inteira verde** (rota entra no radar do `NestedRouteOwnershipTest`? rota é
  flat, sem parâmetro — não dispara); Pint; commit
  `feat(dashboard): endpoint /api/dashboard/metricas com gates por papel`.

---

### Task 7: Feature tests do endpoint (spec §6, os 9 cenários)

**Executor: claude** — as asserções negativas de vazamento são o coração do risco ALTO.

**Files:**
- Test: `backend/tests/Feature/Dashboard/DashboardEndpointTest.php`

**Interfaces:** Consumes: endpoint da Task 6; `RolePermissionSeeder`/`PermissionCatalog` para
montar atores (admin com role `admin`; role customizada sem permissões comerciais; user
`type='redator'` com `Redator` e role `redator`).

- [ ] **Step 1: escrever os 9 cenários da spec §6** — (1) admin completo com valores conferidos;
  (2) admin sem gate comercial: `kpis.cotacoes === null`, `series.uf_aprovada === null`,
  `rankings.*.uf_aprovada === null`, e **grep do JSON inteiro** por `value_uf`/soma UF ausentes;
  (3) redator: `view === 'redator'`, ids de turma alheia ausentes do JSON serializado (asserção
  por string no corpo bruto), sem chaves `series`/`rankings`/`pendencias` (só
  `pendencias_documentais`); (4) banco vazio → 200 com zeros/`[]`, não erro; (5) período móvel
  restringe séries e não altera `kpis`/`pendencias`/`pipeline`; (6) `period_start > period_end` →
  422 `application/problem+json`; (7) D6 revogado (via endpoint); (8) N+1: cenário representativo
  sob `preventLazyLoading` (já global) — passa sem `LazyLoadingViolationException`; (9)
  `DomainDependencyTest` já verde ao longo das tasks — aqui só conferir que a matriz não tem
  aresta sobrando (toda entrada da chave `'Dashboard'` tem `use` correspondente).
- [ ] **Step 2: cada cenário visto reprovar** contra sabotagem dirigida onde o teste é novo de
  comportamento já implementado (lição 10): derrubar o gate comercial por `perl -0pi` no
  assembler, ver (2) reprovar nomeado, restaurar com `git checkout --`; idem para o escopo do
  redator no `RedatorScopeQuery` e (3).
- [ ] **Step 3: suíte inteira; Pint; commit** `test(dashboard): endpoint por papel, vazio, filtro e N+1`.

---

### Task 8: Gate final — e2e contra a API real e fechamento do bloco

**Executor: claude** — mexe em sessão real e decide DoD.

- [ ] **Step 1: baseline** — `docker compose exec -T app php artisan test` (placar completo
  registrado), `pnpm lint`/`pnpm build`/`pnpm test` no frontend (`generated.ts` novo não pode
  quebrar nada), `git status --porcelain` limpo.
- [ ] **Step 2: e2e com sessão Sanctum real** (cookie+CSRF, `-H 'Origin:'` + `-H 'Accept:
  application/json'` — lição 12), três atores contra `http://localhost:8080`:
  admin → `view:'admin'` com seções e valores conferidos contra o banco de dev por SQL;
  role sem permissão comercial (criar role custom via API de roles, reverter depois) → seções
  comerciais `null` e corpo sem UF; redator (seed: ativar temporária e reversivelmente como no
  fechamento do BD-7, hash restaurado e conferido) → só as turmas dele, corpo sem `series`.
- [ ] **Step 3: filtro na API real** — `?period_start=2026-01-01&period_end=2026-06-30` restringe
  séries; inválido devolve 422 `application/problem+json`.
- [ ] **Step 4: zero mutação medida** — contagem de `audits` e das tabelas de negócio antes/depois
  dos GETs: idênticas (exceto artefatos declarados do ator de teste, restaurados).
- [ ] **Step 5: fechamento** — `typescript:transform` sem diff novo; Pint nos `.php` do bloco;
  placar final vs. projeção; commit final se houver ajuste; estado → `ready_for_review` (fora
  deste plano, no `/executar-bloco`).

---

## Handoff de execução

`executor: misto` — por task, conforme decisão do João (2026-08-14: "delegue tarefas de backend ao
codex, mesclando entre você e ele"). Critério do comando aplicado task a task: codex recebe o que é
mecânico com contrato fechado e verificação executável; claude retém contrato (§5.3/ADR-04),
ownership/RBAC, classificação de pipeline e gate final.

| Task | Executor | paths_autorizados (codex) |
|---|---|---|
| 1 | claude | — |
| 2 | codex | `backend/app/Domains/Dashboard/Services/OperationMetricsQuery.php` · `backend/tests/Feature/Dashboard/OperationMetricsQueryTest.php` · `backend/tests/Feature/Shared/DomainDependencyTest.php` (só a chave `'Dashboard'`) |
| 3 | codex | `backend/app/Domains/Dashboard/Services/CommercialMetricsQuery.php` · `backend/tests/Feature/Dashboard/CommercialMetricsQueryTest.php` · `backend/tests/Feature/Shared/DomainDependencyTest.php` (idem) |
| 4 | codex | `backend/app/Domains/Dashboard/Services/{CertificationMetricsQuery,AnalyticsQuery}.php` · `backend/tests/Feature/Dashboard/{CertificationMetricsQueryTest,AnalyticsQueryTest}.php` · `backend/tests/Feature/Shared/DomainDependencyTest.php` (idem) |
| 5 | claude | — |
| 6 | claude | — |
| 7 | claude | — |
| 8 | claude | — |

Regras do misto: task de codex é revisada por claude antes do commit contar como fechado (review
gate do plugin segue DESLIGADO — a revisão é passo explícito); codex não toca `state.md`, backlog,
pendências nem arquivo fora dos paths da task; violação de path = task reprovada e refeita.

**Projeção de placar:** baseline backend `591 passed, 5 skipped` → +~24 testes novos (5 arquivos de
teste de serviço + contrato + endpoint); número exato conferido no gate da Task 8 contra a soma dos
casos escritos. Frontend inalterado em 35 arquivos / 176 testes (nenhum consumidor novo).
