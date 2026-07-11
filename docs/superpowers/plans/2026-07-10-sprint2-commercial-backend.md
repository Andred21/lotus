# Backend do Comercial: Orçamentos & Cotações — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar o núcleo comercial — orçamento (`budget`) agrupando cotações (`quote`) independentes, com status/totais derivados, aprovação por superadmin e anexos polimórficos.

**Architecture:** DDD-lite (ADR-02): schema em inglês → models `Auditable`+`SoftDeletes` → Actions em transação → Domain Service de derivação (lado leitura) → DTOs `spatie/laravel-data` (fonte dos tipos TS) → controllers finos com RBAC via `HasMiddleware`. `budget.status` e totais NÃO são colunas: computados das cotações filhas.

**Tech Stack:** Laravel 13 (PHP 8.3), MySQL 8 (sqlite `:memory:` nos testes), spatie/laravel-data + typescript-transformer, owen-it/laravel-auditing, spatie/laravel-permission.

**Spec:** `docs/superpowers/specs/2026-07-10-sprint2-commercial-backend-design.md`
**Branch:** `feat/sprint2-comercial-backend` (base = `main` @ e990319, PR #3 mergeado).

## Global Constraints

- **Backend só roda no container:** `docker compose exec -T app php artisan test` (host WSL sem mbstring). Regen TS: `docker compose exec -T app php artisan typescript:transform`.
- **`pint` NUNCA sem argumento** — só os arquivos tocados: `docker compose exec -T app ./vendor/bin/pint <arquivos>`.
- **Schema em inglês** (decisão Sprint 1). "Scap"/"Cot"/"UF" são conteúdo de dado, não nome de coluna.
- **ADR-17:** `budgets.code` = `"Scap {id}"` imutável, gerado na Action a partir do `id`; `quotes.seq_in_budget` = contador atômico por orçamento via `lockForUpdate()`; código composto (`Scap N - Cot M`) é **calculado**, nunca persistido; `id` continua a FK.
- **ADR-02:** regra → Actions/Domain Services; sem Repository; testes de integração sqlite, não mock.
- **ADR-08:** auditoria na app, sem trigger; models `Auditable`+`SoftDeletes` mudam via `$model->delete()` (nunca delete no query builder).
- **ADR-03:** erros RFC 7807 pelo handler global; validação = `ValidationException::withMessages([...])`, nunca `abort(422)`. Controllers deixam exceções subirem.
- **ADR-07:** RBAC — as permissões `commercial.budget.*` e `commercial.quote.*` (inclusive `commercial.quote.approve`) **já estão semeadas** no `RolePermissionSeeder`; admin já exclui `approve`, superadmin tem tudo, redator nada. **NÃO editar o seeder.** Wire só o middleware nos controllers.
- **ADR-10:** os morph aliases `budget` e `quote` **já estão** no `enforceMorphMap` do `AppServiceProvider`. **NÃO editar o provider.**
- **ADR-04:** `frontend/src/shared/types/generated.ts` é gerado; nunca editar à mão — corrigir o DTO e regenerar.
- **Lei §7 (RN-14):** financeiro (fatura/comprovante) nunca bloqueia ação.
- **Domínio:** tudo em `app/Domains/Commercial/` (já existe, com Client). Testes novos em `tests/Feature/Comercial/`.
- **Padrão de partida (WIP do João):** antes de tocar arquivo, `git status`; working tree do João é intocável. `git add` só os caminhos da task.

---

## Estrutura de arquivos

```
database/migrations/2026_07_10_*_budgets.php        Task 1 — cria budgets + quotes
app/Domains/Commercial/
  Enums/QuoteStatus.php                              Task 2 — enum pending/approved/rejected
  Models/Budget.php                                  Task 2 — hasMany quotes, morphMany files, cascade
  Models/Quote.php                                   Task 2 — belongsTo budget/course, casts
  Services/BudgetSummaryService.php                  Task 3 — derivação status + somas
  Data/QuoteData.php                                 Task 4 — DTO + code calculado
  Data/BudgetData.php                                Task 4 — DTO + derivados (via service)
  Actions/CreateBudgetAction.php                     Task 5 — cria + gera code
  Http/Controllers/BudgetController.php              Task 5 — apiResource + middleware
  Actions/CreateQuoteAction.php                      Task 6 — seq atômico
  Actions/UpdateQuoteAction.php                      Task 6 — reabre rejected; trava approved
  Http/Controllers/QuoteController.php               Task 6+7 — nested + approve/reject
  Actions/ApproveQuoteAction.php                     Task 7
  Actions/RejectQuoteAction.php                      Task 7
  Http/Controllers/BudgetFileController.php          Task 8 — anexos budget
  Http/Controllers/QuoteFileController.php           Task 8 — anexos quote
  routes.php                                         Tasks 5,6,7,8 — acrescenta rotas
app/Shared/Files/Data/FileData.php                   Task 8 — DTO genérico de anexo
tests/Feature/Comercial/*.php                        Tasks 1-8
```

---

### Task 1: Migrations budgets + quotes

**Files:**
- Create: `backend/database/migrations/2026_07_10_120000_budgets.php`
- Test: `backend/tests/Feature/Comercial/SchemaTest.php`

**Interfaces:**
- Produces: tabelas `budgets` (`id`, `client_id`, `code` nullable UNIQUE, `payment_terms` nullable, timestamps, softDeletes) e `quotes` (`id`, `budget_id`, `course_id`, `seq_in_budget`, `student_count`, `planned_start_date` null, `planned_end_date` null, `purchase_order` null, `value_uf` decimal(12,4), `status` enum, `approved_at` null, timestamps, softDeletes, UNIQUE(`budget_id`,`seq_in_budget`)).

> **`code` é nullable** por necessidade do ADR-17: o valor deriva do `id` (autoincrement), desconhecido antes do insert. A Action preenche dentro da mesma transação; nunca fica null na prática (Task 5 tem teste).

- [ ] **Step 1: Write the failing test**

`backend/tests/Feature/Comercial/SchemaTest.php`:
```php
<?php

namespace Tests\Feature\Comercial;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class SchemaTest extends TestCase
{
    use RefreshDatabase;

    public function test_budgets_columns(): void
    {
        foreach (['id', 'client_id', 'code', 'payment_terms', 'created_at', 'deleted_at'] as $col) {
            $this->assertTrue(Schema::hasColumn('budgets', $col), "budgets.$col ausente");
        }
    }

    public function test_quotes_columns(): void
    {
        foreach ([
            'id', 'budget_id', 'course_id', 'seq_in_budget', 'student_count',
            'planned_start_date', 'planned_end_date', 'purchase_order', 'value_uf',
            'status', 'approved_at', 'deleted_at',
        ] as $col) {
            $this->assertTrue(Schema::hasColumn('quotes', $col), "quotes.$col ausente");
        }
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `docker compose exec -T app php artisan test --filter=SchemaTest`
Expected: FAIL — `budgets` não existe.

- [ ] **Step 3: Write the migration**

`backend/database/migrations/2026_07_10_120000_budgets.php`:
```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('budgets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_id')->constrained('clients')->cascadeOnDelete();
            // Código de rastreio "Scap {id}" (ADR-17). Nullable no schema porque
            // deriva do id (autoincrement); a Action preenche na mesma transação.
            $table->string('code')->nullable()->unique();
            $table->string('payment_terms')->nullable();   // forma de pagamento (texto livre)
            $table->timestamps();
            $table->softDeletes();
            // Sem index explícito em client_id: o InnoDB já cria um p/ sustentar
            // a FK (padrão das migrations da Sprint 1).
        });

        Schema::create('quotes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('budget_id')->constrained('budgets')->cascadeOnDelete();
            $table->foreignId('course_id')->constrained('courses');
            $table->unsignedSmallInteger('seq_in_budget');       // contador atômico por orçamento (ADR-17)
            $table->unsignedInteger('student_count');            // quantidade de alunos
            $table->date('planned_start_date')->nullable();
            $table->date('planned_end_date')->nullable();
            $table->string('purchase_order')->nullable();        // OC do cliente
            $table->decimal('value_uf', 12, 4);                  // valor em UF
            $table->enum('status', ['pending', 'approved', 'rejected'])->default('pending');
            $table->timestamp('approved_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['budget_id', 'seq_in_budget']);
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('quotes');
        Schema::dropIfExists('budgets');
    }
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `docker compose exec -T app php artisan test --filter=SchemaTest`
Expected: PASS (2 passed).

- [ ] **Step 5: Commit**

```bash
docker compose exec -T app ./vendor/bin/pint database/migrations/2026_07_10_120000_budgets.php
git add backend/database/migrations/2026_07_10_120000_budgets.php backend/tests/Feature/Comercial/SchemaTest.php
git commit -m "feat(comercial): migrations budgets + quotes (Sprint 2 · 6.1.1)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Models Budget/Quote + enum QuoteStatus + cascade

**Files:**
- Create: `backend/app/Domains/Commercial/Enums/QuoteStatus.php`
- Create: `backend/app/Domains/Commercial/Models/Budget.php`
- Create: `backend/app/Domains/Commercial/Models/Quote.php`
- Test: `backend/tests/Feature/Comercial/BudgetModelTest.php`

**Interfaces:**
- Consumes: tabelas da Task 1; morph aliases `budget`/`quote` (já no provider).
- Produces:
  - `QuoteStatus` (enum `string`): `Pending='pending'`, `Approved='approved'`, `Rejected='rejected'`.
  - `Budget`: `belongsTo client`, `hasMany quotes`, `morphMany files`; `$fillable=['client_id','code','payment_terms']`; soft-delete cascateia p/ quotes.
  - `Quote`: `belongsTo budget`, `belongsTo course`, `morphMany files`; casts `status`→`QuoteStatus`, `approved_at`→datetime, `planned_start_date`/`planned_end_date`→date, `value_uf`→`decimal:4`.

> O enum (spec 6.1.3) nasce aqui porque o model `Quote` casta `status` para ele. O typescript-transformer coleta enums automaticamente (precedente: `RedatorDocumentType`), então não precisa de `#[TypeScript]`.

- [ ] **Step 1: Write the failing test**

`backend/tests/Feature/Comercial/BudgetModelTest.php`:
```php
<?php

namespace Tests\Feature\Comercial;

use App\Domains\Commercial\Enums\QuoteStatus;
use App\Domains\Commercial\Models\Budget;
use App\Domains\Commercial\Models\Quote;
use App\Domains\Identity\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BudgetModelTest extends TestCase
{
    use RefreshDatabase;

    private function client(): int
    {
        return User::factory()->create(['type' => 'cliente', 'is_active' => false])
            ->client()->create(['legal_name' => 'ACME', 'type' => 'client'])->id;
    }

    private function quote(Budget $budget, int $seq, string $status = 'pending'): Quote
    {
        $courseId = \App\Domains\Catalog\Models\Course::create(['name' => 'C', 'workload_hours' => 8])->id;

        return Quote::create([
            'budget_id' => $budget->id, 'course_id' => $courseId, 'seq_in_budget' => $seq,
            'student_count' => 10, 'value_uf' => 50.5, 'status' => $status,
        ]);
    }

    public function test_status_casts_to_enum(): void
    {
        $budget = Budget::create(['client_id' => $this->client(), 'code' => 'Scap 1']);
        $quote = $this->quote($budget, 1, 'approved');

        $this->assertInstanceOf(QuoteStatus::class, $quote->fresh()->status);
        $this->assertSame(QuoteStatus::Approved, $quote->fresh()->status);
    }

    public function test_relations(): void
    {
        $budget = Budget::create(['client_id' => $this->client(), 'code' => 'Scap 1']);
        $this->quote($budget, 1);

        $this->assertCount(1, $budget->quotes);
        $this->assertTrue($budget->quotes->first()->budget->is($budget));
    }

    public function test_soft_delete_cascades_to_quotes(): void
    {
        $budget = Budget::create(['client_id' => $this->client(), 'code' => 'Scap 1']);
        $quote = $this->quote($budget, 1);

        $budget->delete();

        $this->assertSoftDeleted('budgets', ['id' => $budget->id]);
        $this->assertSoftDeleted('quotes', ['id' => $quote->id]);
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `docker compose exec -T app php artisan test --filter=BudgetModelTest`
Expected: FAIL — classe `QuoteStatus`/`Budget` inexistente.

- [ ] **Step 3: Write the enum and models**

`backend/app/Domains/Commercial/Enums/QuoteStatus.php`:
```php
<?php

namespace App\Domains\Commercial\Enums;

/**
 * Status de aprovação da cotação. Reusado como status agregado (derivado) do
 * orçamento (BudgetData): os valores são idênticos.
 */
enum QuoteStatus: string
{
    case Pending = 'pending';
    case Approved = 'approved';
    case Rejected = 'rejected';
}
```

`backend/app/Domains/Commercial/Models/Budget.php`:
```php
<?php

namespace App\Domains\Commercial\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Shared\Files\Models\File;
use OwenIt\Auditing\Auditable as AuditableTrait;
use OwenIt\Auditing\Contracts\Auditable;

/**
 * Orçamento = agrupador comercial de cotações independentes. `code` ("Scap {id}")
 * é gerado na Action (ADR-17). Status e totais NÃO são colunas: derivados das
 * cotações (BudgetSummaryService).
 */
class Budget extends Model implements Auditable
{
    use AuditableTrait, SoftDeletes;

    protected $fillable = [
        'client_id',
        'code',
        'payment_terms',
    ];

    protected $auditInclude = [
        'client_id',
        'code',
        'payment_terms',
    ];

    protected static function booted(): void
    {
        static::deleting(function (Budget $budget) {
            if (! $budget->isForceDeleting()) {
                // Instância a instância: soft-delete pelo builder não audita (ADR-08).
                $budget->quotes()->get()->each(fn (Quote $q) => $q->delete());
            }
        });
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(\App\Domains\Commercial\Models\Client::class);
    }

    public function quotes(): HasMany
    {
        return $this->hasMany(Quote::class);
    }

    public function files(): MorphMany
    {
        return $this->morphMany(File::class, 'fileable');
    }
}
```

`backend/app/Domains/Commercial/Models/Quote.php`:
```php
<?php

namespace App\Domains\Commercial\Models;

use App\Domains\Catalog\Models\Course;
use App\Domains\Commercial\Enums\QuoteStatus;
use App\Shared\Files\Models\File;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use OwenIt\Auditing\Auditable as AuditableTrait;
use OwenIt\Auditing\Contracts\Auditable;

/**
 * Cotação = parte aprovável do orçamento (1 curso). `seq_in_budget` é atômico
 * por orçamento (ADR-17). Cliente vem do orçamento (não é coluna própria).
 */
class Quote extends Model implements Auditable
{
    use AuditableTrait, SoftDeletes;

    protected $fillable = [
        'budget_id',
        'course_id',
        'seq_in_budget',
        'student_count',
        'planned_start_date',
        'planned_end_date',
        'purchase_order',
        'value_uf',
        'status',
        'approved_at',
    ];

    protected $auditInclude = [
        'budget_id', 'course_id', 'seq_in_budget', 'student_count',
        'planned_start_date', 'planned_end_date', 'purchase_order',
        'value_uf', 'status', 'approved_at',
    ];

    protected $casts = [
        'status' => QuoteStatus::class,
        'approved_at' => 'datetime',
        'planned_start_date' => 'date',
        'planned_end_date' => 'date',
        'value_uf' => 'decimal:4',
    ];

    public function budget(): BelongsTo
    {
        return $this->belongsTo(Budget::class);
    }

    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class);
    }

    public function files(): MorphMany
    {
        return $this->morphMany(File::class, 'fileable');
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `docker compose exec -T app php artisan test --filter=BudgetModelTest`
Expected: PASS (3 passed).

- [ ] **Step 5: Commit**

```bash
docker compose exec -T app ./vendor/bin/pint app/Domains/Commercial/Enums/QuoteStatus.php app/Domains/Commercial/Models/Budget.php app/Domains/Commercial/Models/Quote.php
git add backend/app/Domains/Commercial/Enums backend/app/Domains/Commercial/Models/Budget.php backend/app/Domains/Commercial/Models/Quote.php backend/tests/Feature/Comercial/BudgetModelTest.php
git commit -m "feat(comercial): models Budget/Quote + enum QuoteStatus + cascade (Sprint 2 · 6.1.2)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: BudgetSummaryService (derivação status + somas)

**Files:**
- Create: `backend/app/Domains/Commercial/Services/BudgetSummaryService.php`
- Test: `backend/tests/Feature/Comercial/BudgetSummaryServiceTest.php`

**Interfaces:**
- Consumes: `Budget`, `Quote`, `QuoteStatus` (Task 2). Requer `$budget->quotes` carregado.
- Produces:
  - `status(Budget $budget): QuoteStatus` — `Approved` se ≥1 quote `Approved`; `Rejected` se há quotes e **todas** `Rejected`; senão `Pending`.
  - `totalValueUf(Budget $budget): float` — Σ `value_uf` de todas as quotes ativas.
  - `totalStudents(Budget $budget): int` — Σ `student_count`.

> É a regra RN-06 (aprovação do orçamento) + RF-ORC-07 (cálculo) da task 6.1.6, num lugar só, lado leitura. Sem trigger (ADR-08). Consumida pelo `BudgetData` (Task 4).

- [ ] **Step 1: Write the failing test**

`backend/tests/Feature/Comercial/BudgetSummaryServiceTest.php`:
```php
<?php

namespace Tests\Feature\Comercial;

use App\Domains\Commercial\Enums\QuoteStatus;
use App\Domains\Commercial\Models\Budget;
use App\Domains\Commercial\Models\Quote;
use App\Domains\Commercial\Services\BudgetSummaryService;
use App\Domains\Catalog\Models\Course;
use App\Domains\Identity\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BudgetSummaryServiceTest extends TestCase
{
    use RefreshDatabase;

    private BudgetSummaryService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new BudgetSummaryService;
    }

    private function budgetWith(array $statuses): Budget
    {
        $clientId = User::factory()->create(['type' => 'cliente', 'is_active' => false])
            ->client()->create(['legal_name' => 'ACME', 'type' => 'client'])->id;
        $budget = Budget::create(['client_id' => $clientId, 'code' => 'Scap 1']);
        $courseId = Course::create(['name' => 'C', 'workload_hours' => 8])->id;

        foreach ($statuses as $i => $status) {
            Quote::create([
                'budget_id' => $budget->id, 'course_id' => $courseId, 'seq_in_budget' => $i + 1,
                'student_count' => 10, 'value_uf' => 100, 'status' => $status,
            ]);
        }

        return $budget->load('quotes');
    }

    public function test_approved_when_any_quote_approved(): void
    {
        $budget = $this->budgetWith(['pending', 'approved', 'rejected']);
        $this->assertSame(QuoteStatus::Approved, $this->service->status($budget));
    }

    public function test_rejected_when_all_rejected(): void
    {
        $budget = $this->budgetWith(['rejected', 'rejected']);
        $this->assertSame(QuoteStatus::Rejected, $this->service->status($budget));
    }

    public function test_pending_when_no_quotes_or_still_pending(): void
    {
        $this->assertSame(QuoteStatus::Pending, $this->service->status($this->budgetWith([])));
        $this->assertSame(QuoteStatus::Pending, $this->service->status($this->budgetWith(['pending'])));
    }

    public function test_totals_sum_all_active_quotes(): void
    {
        $budget = $this->budgetWith(['pending', 'approved', 'rejected']);  // 3 × 100 UF, 3 × 10 alunos
        $this->assertSame(300.0, $this->service->totalValueUf($budget));
        $this->assertSame(30, $this->service->totalStudents($budget));
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `docker compose exec -T app php artisan test --filter=BudgetSummaryServiceTest`
Expected: FAIL — `BudgetSummaryService` inexistente.

- [ ] **Step 3: Write the service**

`backend/app/Domains/Commercial/Services/BudgetSummaryService.php`:
```php
<?php

namespace App\Domains\Commercial\Services;

use App\Domains\Commercial\Enums\QuoteStatus;
use App\Domains\Commercial\Models\Budget;
use App\Domains\Commercial\Models\Quote;

/**
 * Deriva o estado agregado do orçamento a partir das cotações filhas (lado
 * leitura, sem trigger — ADR-08). RN-06: aprovado se ≥1 cotação aprovada.
 * RF-ORC-07: valor/alunos = soma das cotações. Requer `$budget->quotes` carregado.
 */
class BudgetSummaryService
{
    public function status(Budget $budget): QuoteStatus
    {
        $quotes = $budget->quotes;

        if ($quotes->contains(fn (Quote $q) => $q->status === QuoteStatus::Approved)) {
            return QuoteStatus::Approved;
        }

        if ($quotes->isNotEmpty() && $quotes->every(fn (Quote $q) => $q->status === QuoteStatus::Rejected)) {
            return QuoteStatus::Rejected;
        }

        return QuoteStatus::Pending;
    }

    public function totalValueUf(Budget $budget): float
    {
        return (float) $budget->quotes->sum(fn (Quote $q) => (float) $q->value_uf);
    }

    public function totalStudents(Budget $budget): int
    {
        return (int) $budget->quotes->sum('student_count');
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `docker compose exec -T app php artisan test --filter=BudgetSummaryServiceTest`
Expected: PASS (4 passed).

- [ ] **Step 5: Commit**

```bash
docker compose exec -T app ./vendor/bin/pint app/Domains/Commercial/Services/BudgetSummaryService.php
git add backend/app/Domains/Commercial/Services/BudgetSummaryService.php backend/tests/Feature/Comercial/BudgetSummaryServiceTest.php
git commit -m "feat(comercial): BudgetSummaryService — derivação status + somas (Sprint 2 · 6.1.6)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: DTOs QuoteData + BudgetData + regen TS

**Files:**
- Create: `backend/app/Domains/Commercial/Data/QuoteData.php`
- Create: `backend/app/Domains/Commercial/Data/BudgetData.php`
- Modify: `frontend/src/shared/types/generated.ts` (via artisan, não à mão)
- Test: `backend/tests/Feature/Comercial/DtoTest.php`

**Interfaces:**
- Consumes: `Budget`, `Quote`, `QuoteStatus` (Task 2); `BudgetSummaryService` (Task 3).
- Produces:
  - `QuoteData` — input: `course_id` (req, exists), `student_count` (req, min:1), `value_uf` (req, numeric), `purchase_order`/`planned_start_date`/`planned_end_date` (nullable). Output-only: `id`, `budget_id`, `seq_in_budget`, `status` (`QuoteStatus`), `approved_at`, `code` (calculado `"Scap {budget_id} - Cot {seq}"`). `fromModel(Quote): self`.
  - `BudgetData` — input: `client_id` (req, exists), `payment_terms` (nullable). Output-only: `id`, `code`, `status` (`QuoteStatus`, derivado), `total_value_uf`, `total_students`, `quotes` (`QuoteData[]`). `fromModel(Budget): self` (usa `app(BudgetSummaryService::class)`).

> Precedente do service locator em `fromModel`: `RedatorDocumentData::fromModel` usa `app(UploadFileAction)`. Mesma via aqui.

- [ ] **Step 1: Write the failing test**

`backend/tests/Feature/Comercial/DtoTest.php`:
```php
<?php

namespace Tests\Feature\Comercial;

use App\Domains\Catalog\Models\Course;
use App\Domains\Commercial\Data\BudgetData;
use App\Domains\Commercial\Data\QuoteData;
use App\Domains\Commercial\Enums\QuoteStatus;
use App\Domains\Commercial\Models\Budget;
use App\Domains\Commercial\Models\Quote;
use App\Domains\Identity\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DtoTest extends TestCase
{
    use RefreshDatabase;

    private function seed(): Budget
    {
        $clientId = User::factory()->create(['type' => 'cliente', 'is_active' => false])
            ->client()->create(['legal_name' => 'ACME', 'type' => 'client'])->id;
        $budget = Budget::create(['client_id' => $clientId, 'code' => 'Scap 7']);
        $courseId = Course::create(['name' => 'C', 'workload_hours' => 8])->id;
        Quote::create([
            'budget_id' => $budget->id, 'course_id' => $courseId, 'seq_in_budget' => 2,
            'student_count' => 15, 'value_uf' => 120.0, 'status' => 'approved',
        ]);

        return $budget->load('quotes');
    }

    public function test_quote_data_code_is_calculated(): void
    {
        $quote = $this->seed()->quotes->first();
        $data = QuoteData::fromModel($quote);

        $this->assertSame("Scap {$quote->budget_id} - Cot 2", $data->code);
        $this->assertSame(QuoteStatus::Approved, $data->status);
    }

    public function test_budget_data_derives_status_and_totals(): void
    {
        $data = BudgetData::fromModel($this->seed());

        $this->assertSame(QuoteStatus::Approved, $data->status);   // ≥1 aprovada
        $this->assertSame(120.0, $data->total_value_uf);
        $this->assertSame(15, $data->total_students);
        $this->assertCount(1, $data->quotes);
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `docker compose exec -T app php artisan test --filter=DtoTest`
Expected: FAIL — `QuoteData`/`BudgetData` inexistente.

- [ ] **Step 3: Write the DTOs**

`backend/app/Domains/Commercial/Data/QuoteData.php`:
```php
<?php

namespace App\Domains\Commercial\Data;

use App\Domains\Commercial\Enums\QuoteStatus;
use App\Domains\Commercial\Models\Quote;
use Spatie\LaravelData\Data;
use Spatie\LaravelData\Optional;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * Contrato da cotação. `budget_id`, `seq_in_budget`, `status`, `approved_at` e
 * `code` são read-only (saída). `code` é o composto calculado (ADR-17), nunca
 * persistido. `budget` vem da rota no store, não do DTO.
 */
#[TypeScript]
class QuoteData extends Data
{
    public function __construct(
        public int|Optional $id,
        public int|Optional $budget_id,
        public int|Optional $seq_in_budget,
        public int $course_id,
        public int $student_count,
        public float $value_uf,
        public QuoteStatus|Optional $status,
        public string|Optional|null $approved_at,
        public string|Optional $code,
        public string|Optional|null $purchase_order = null,
        public string|Optional|null $planned_start_date = null,
        public string|Optional|null $planned_end_date = null,
    ) {}

    public static function rules(): array
    {
        return [
            'course_id' => ['required', 'integer', 'exists:courses,id'],
            'student_count' => ['required', 'integer', 'min:1'],
            'value_uf' => ['required', 'numeric', 'min:0'],
            'purchase_order' => ['nullable', 'string', 'max:255'],
            'planned_start_date' => ['nullable', 'date'],
            'planned_end_date' => ['nullable', 'date'],
        ];
    }

    public static function fromModel(Quote $quote): self
    {
        return new self(
            id: $quote->id,
            budget_id: $quote->budget_id,
            seq_in_budget: $quote->seq_in_budget,
            course_id: $quote->course_id,
            student_count: $quote->student_count,
            value_uf: (float) $quote->value_uf,
            status: $quote->status,
            approved_at: $quote->approved_at?->toIso8601String(),
            code: "Scap {$quote->budget_id} - Cot {$quote->seq_in_budget}",
            purchase_order: $quote->purchase_order,
            planned_start_date: $quote->planned_start_date?->toDateString(),
            planned_end_date: $quote->planned_end_date?->toDateString(),
        );
    }
}
```

`backend/app/Domains/Commercial/Data/BudgetData.php`:
```php
<?php

namespace App\Domains\Commercial\Data;

use App\Domains\Commercial\Enums\QuoteStatus;
use App\Domains\Commercial\Models\Budget;
use App\Domains\Commercial\Services\BudgetSummaryService;
use Spatie\LaravelData\Attributes\DataCollectionOf;
use Spatie\LaravelData\Data;
use Spatie\LaravelData\Optional;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * Contrato do orçamento. `code`, `status` e os totais são DERIVADOS (não
 * colunas): computados das cotações pelo BudgetSummaryService. `status` reusa
 * QuoteStatus (mesmos valores).
 */
#[TypeScript]
class BudgetData extends Data
{
    public function __construct(
        public int|Optional $id,
        public int $client_id,
        public string|Optional $code,
        public QuoteStatus|Optional $status,
        public float|Optional $total_value_uf,
        public int|Optional $total_students,
        /** @var array<QuoteData> */
        #[DataCollectionOf(QuoteData::class)]
        public array $quotes = [],
        public string|Optional|null $payment_terms = null,
    ) {}

    public static function rules(): array
    {
        return [
            'client_id' => ['required', 'integer', 'exists:clients,id'],
            'payment_terms' => ['nullable', 'string', 'max:255'],
        ];
    }

    public static function fromModel(Budget $budget): self
    {
        $summary = app(BudgetSummaryService::class);

        return new self(
            id: $budget->id,
            client_id: $budget->client_id,
            code: $budget->code,
            status: $summary->status($budget),
            total_value_uf: $summary->totalValueUf($budget),
            total_students: $summary->totalStudents($budget),
            quotes: QuoteData::collect($budget->quotes->all()),
            payment_terms: $budget->payment_terms,
        );
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `docker compose exec -T app php artisan test --filter=DtoTest`
Expected: PASS (2 passed).

- [ ] **Step 5: Regenerate TS types**

Run: `docker compose exec -T app php artisan typescript:transform`
Expected: `frontend/src/shared/types/generated.ts` ganha `BudgetData`, `QuoteData`, `QuoteStatus`. Confirme:
```bash
grep -E 'BudgetData|QuoteData|QuoteStatus' frontend/src/shared/types/generated.ts
```

- [ ] **Step 6: Commit**

```bash
docker compose exec -T app ./vendor/bin/pint app/Domains/Commercial/Data/QuoteData.php app/Domains/Commercial/Data/BudgetData.php
git add backend/app/Domains/Commercial/Data backend/tests/Feature/Comercial/DtoTest.php frontend/src/shared/types/generated.ts
git commit -m "feat(comercial): DTOs BudgetData/QuoteData + status/totais derivados + tipos TS (Sprint 2 · 6.1.3)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: Budget CRUD — CreateBudgetAction + BudgetController + rotas

**Files:**
- Create: `backend/app/Domains/Commercial/Actions/CreateBudgetAction.php`
- Create: `backend/app/Domains/Commercial/Http/Controllers/BudgetController.php`
- Modify: `backend/app/Domains/Commercial/routes.php`
- Test: `backend/tests/Feature/Comercial/BudgetCrudTest.php`

**Interfaces:**
- Consumes: `BudgetData` (Task 4); RBAC `commercial.budget.*` (já semeado).
- Produces:
  - `CreateBudgetAction::execute(BudgetData): Budget` — cria + gera `code = "Scap {id}"` na transação.
  - `BudgetController` (apiResource): index/store/show/update/destroy; middleware `commercial.budget.{view|create|update|delete}`. update NÃO altera `code` (imutável).
  - rotas `apiResource('budgets')`.

- [ ] **Step 1: Write the failing test**

`backend/tests/Feature/Comercial/BudgetCrudTest.php`:
```php
<?php

namespace Tests\Feature\Comercial;

use App\Domains\Identity\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BudgetCrudTest extends TestCase
{
    use RefreshDatabase;

    private function clientId(): int
    {
        return User::factory()->create(['type' => 'cliente', 'is_active' => false])
            ->client()->create(['legal_name' => 'ACME', 'type' => 'client'])->id;
    }

    public function test_cria_orcamento_gera_code_scap(): void
    {
        $this->actingAsAdmin();
        $clientId = $this->clientId();

        $response = $this->postJson('/api/budgets', [
            'client_id' => $clientId,
            'payment_terms' => '50% antecipado',
        ]);

        $id = $response->assertCreated()
            ->assertJsonPath('status', 'pending')       // derivado: sem cotações
            ->assertJsonPath('total_value_uf', 0)
            ->json('id');

        $this->assertSame("Scap {$id}", $response->json('code'));
        $this->assertDatabaseHas('budgets', ['id' => $id, 'code' => "Scap {$id}", 'payment_terms' => '50% antecipado']);
    }

    public function test_client_id_obrigatorio(): void
    {
        $this->actingAsAdmin();

        $this->postJson('/api/budgets', [])
            ->assertStatus(422)
            ->assertJsonValidationErrors('client_id');
    }

    public function test_lista_mostra_edita_remove(): void
    {
        $this->actingAsAdmin();
        $clientId = $this->clientId();

        $id = $this->postJson('/api/budgets', ['client_id' => $clientId])->json('id');

        $this->getJson('/api/budgets')->assertOk()->assertJsonCount(1);
        $this->getJson("/api/budgets/{$id}")->assertOk()->assertJsonPath('id', $id);

        // update: payment_terms muda; code NÃO muda (imutável)
        $this->putJson("/api/budgets/{$id}", ['client_id' => $clientId, 'payment_terms' => 'à vista'])
            ->assertOk()
            ->assertJsonPath('payment_terms', 'à vista')
            ->assertJsonPath('code', "Scap {$id}");

        $this->deleteJson("/api/budgets/{$id}")->assertNoContent();
        $this->assertSoftDeleted('budgets', ['id' => $id]);
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `docker compose exec -T app php artisan test --filter=BudgetCrudTest`
Expected: FAIL — rota `/api/budgets` inexistente (404).

- [ ] **Step 3: Write the Action, Controller and routes**

`backend/app/Domains/Commercial/Actions/CreateBudgetAction.php`:
```php
<?php

namespace App\Domains\Commercial\Actions;

use App\Domains\Commercial\Data\BudgetData;
use App\Domains\Commercial\Models\Budget;
use Illuminate\Support\Facades\DB;
use Spatie\LaravelData\Optional;

/**
 * Cria o orçamento e gera o código de rastreio "Scap {id}" (ADR-17) na MESMA
 * transação — o id só existe após o insert. Código é imutável daqui em diante.
 */
class CreateBudgetAction
{
    public function execute(BudgetData $data): Budget
    {
        return DB::transaction(function () use ($data) {
            $budget = Budget::create([
                'client_id' => $data->client_id,
                'payment_terms' => $data->payment_terms instanceof Optional ? null : $data->payment_terms,
            ]);

            $budget->update(['code' => "Scap {$budget->id}"]);

            return $budget->load('quotes');
        });
    }
}
```

`backend/app/Domains/Commercial/Http/Controllers/BudgetController.php`:
```php
<?php

namespace App\Domains\Commercial\Http\Controllers;

use App\Domains\Commercial\Actions\CreateBudgetAction;
use App\Domains\Commercial\Data\BudgetData;
use App\Domains\Commercial\Models\Budget;
use App\Http\Controllers\Controller;
use Illuminate\Http\Response;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

class BudgetController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('permission:commercial.budget.view', only: ['index', 'show']),
            new Middleware('permission:commercial.budget.create', only: ['store']),
            new Middleware('permission:commercial.budget.update', only: ['update']),
            new Middleware('permission:commercial.budget.delete', only: ['destroy']),
        ];
    }

    /** @return array<BudgetData> */
    public function index(): array
    {
        return Budget::with('quotes')
            ->get()
            ->map(fn (Budget $b) => BudgetData::fromModel($b))
            ->all();
    }

    public function store(BudgetData $data, CreateBudgetAction $action): BudgetData
    {
        return BudgetData::fromModel($action->execute($data));
    }

    public function show(Budget $budget): BudgetData
    {
        return BudgetData::fromModel($budget->load('quotes'));
    }

    public function update(BudgetData $data, Budget $budget): BudgetData
    {
        // `code` e `client_id` são imutáveis: só payment_terms muda por aqui.
        $budget->update([
            'payment_terms' => $data->payment_terms instanceof \Spatie\LaravelData\Optional ? null : $data->payment_terms,
        ]);

        return BudgetData::fromModel($budget->load('quotes'));
    }

    public function destroy(Budget $budget): Response
    {
        $budget->delete();

        return response()->noContent();
    }
}
```

Modify `backend/app/Domains/Commercial/routes.php` — adicione o import e a rota dentro do grupo `auth:sanctum` existente:
```php
use App\Domains\Commercial\Http\Controllers\BudgetController;
```
```php
    Route::apiResource('budgets', BudgetController::class);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `docker compose exec -T app php artisan test --filter=BudgetCrudTest`
Expected: PASS (3 passed).

- [ ] **Step 5: Commit**

```bash
docker compose exec -T app ./vendor/bin/pint app/Domains/Commercial/Actions/CreateBudgetAction.php app/Domains/Commercial/Http/Controllers/BudgetController.php app/Domains/Commercial/routes.php
git add backend/app/Domains/Commercial/Actions/CreateBudgetAction.php backend/app/Domains/Commercial/Http/Controllers/BudgetController.php backend/app/Domains/Commercial/routes.php backend/tests/Feature/Comercial/BudgetCrudTest.php
git commit -m "feat(comercial): CRUD de orçamento + code Scap gerado na Action (Sprint 2 · 6.1.4)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 6: Quote CRUD — Create/UpdateQuoteAction + QuoteController nested + rotas

**Files:**
- Create: `backend/app/Domains/Commercial/Actions/CreateQuoteAction.php`
- Create: `backend/app/Domains/Commercial/Actions/UpdateQuoteAction.php`
- Create: `backend/app/Domains/Commercial/Http/Controllers/QuoteController.php`
- Modify: `backend/app/Domains/Commercial/routes.php`
- Test: `backend/tests/Feature/Comercial/QuoteCrudTest.php`

**Interfaces:**
- Consumes: `QuoteData`, `Budget`, `Quote`, `QuoteStatus`.
- Produces:
  - `CreateQuoteAction::execute(Budget, QuoteData): Quote` — `seq_in_budget` atômico via `lockForUpdate()` no `MAX(seq)+1`; status inicial `Pending`.
  - `UpdateQuoteAction::execute(Quote, QuoteData): Quote` — `approved` → 422; senão atualiza campos e força status `Pending` (reabre `rejected`).
  - `QuoteController` — index (nested), store (nested), show, update, destroy; middleware `commercial.quote.{view|create|update|delete}`. (approve/reject entram na Task 7.)
  - rotas nested + `apiResource('quotes')->only(show,update,destroy)`.

- [ ] **Step 1: Write the failing test**

`backend/tests/Feature/Comercial/QuoteCrudTest.php`:
```php
<?php

namespace Tests\Feature\Comercial;

use App\Domains\Catalog\Models\Course;
use App\Domains\Commercial\Models\Budget;
use App\Domains\Commercial\Models\Quote;
use App\Domains\Identity\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class QuoteCrudTest extends TestCase
{
    use RefreshDatabase;

    private int $budgetId;
    private int $courseId;

    private function setUpBudget(): void
    {
        $clientId = User::factory()->create(['type' => 'cliente', 'is_active' => false])
            ->client()->create(['legal_name' => 'ACME', 'type' => 'client'])->id;
        $this->budgetId = Budget::create(['client_id' => $clientId, 'code' => 'Scap 1'])->id;
        $this->courseId = Course::create(['name' => 'C', 'workload_hours' => 8])->id;
    }

    private function payload(): array
    {
        return ['course_id' => $this->courseId, 'student_count' => 12, 'value_uf' => 80.5, 'purchase_order' => 'OC-1'];
    }

    public function test_cria_cotacao_seq_atomico(): void
    {
        $this->actingAsAdmin();
        $this->setUpBudget();

        $r1 = $this->postJson("/api/budgets/{$this->budgetId}/quotes", $this->payload());
        $r1->assertCreated()->assertJsonPath('seq_in_budget', 1)->assertJsonPath('status', 'pending');

        $r2 = $this->postJson("/api/budgets/{$this->budgetId}/quotes", $this->payload());
        $r2->assertCreated()->assertJsonPath('seq_in_budget', 2)
            ->assertJsonPath('code', "Scap {$this->budgetId} - Cot 2");

        $this->assertDatabaseHas('quotes', ['budget_id' => $this->budgetId, 'seq_in_budget' => 1]);
        $this->assertDatabaseHas('quotes', ['budget_id' => $this->budgetId, 'seq_in_budget' => 2]);
    }

    public function test_course_id_obrigatorio(): void
    {
        $this->actingAsAdmin();
        $this->setUpBudget();

        $this->postJson("/api/budgets/{$this->budgetId}/quotes", ['student_count' => 1, 'value_uf' => 1])
            ->assertStatus(422)->assertJsonValidationErrors('course_id');
    }

    public function test_update_reabre_rejected_para_pending(): void
    {
        $this->actingAsAdmin();
        $this->setUpBudget();
        $quote = Quote::create([
            'budget_id' => $this->budgetId, 'course_id' => $this->courseId, 'seq_in_budget' => 1,
            'student_count' => 5, 'value_uf' => 10, 'status' => 'rejected',
        ]);

        $this->putJson("/api/quotes/{$quote->id}", $this->payload())
            ->assertOk()->assertJsonPath('status', 'pending')->assertJsonPath('student_count', 12);
    }

    public function test_update_de_cotacao_aprovada_bloqueado(): void
    {
        $this->actingAsAdmin();
        $this->setUpBudget();
        $quote = Quote::create([
            'budget_id' => $this->budgetId, 'course_id' => $this->courseId, 'seq_in_budget' => 1,
            'student_count' => 5, 'value_uf' => 10, 'status' => 'approved',
        ]);

        $this->putJson("/api/quotes/{$quote->id}", $this->payload())
            ->assertStatus(422)->assertJsonValidationErrors('status');
    }

    public function test_lista_nested_e_remove(): void
    {
        $this->actingAsAdmin();
        $this->setUpBudget();
        $id = $this->postJson("/api/budgets/{$this->budgetId}/quotes", $this->payload())->json('id');

        $this->getJson("/api/budgets/{$this->budgetId}/quotes")->assertOk()->assertJsonCount(1);
        $this->deleteJson("/api/quotes/{$id}")->assertNoContent();
        $this->assertSoftDeleted('quotes', ['id' => $id]);
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `docker compose exec -T app php artisan test --filter=QuoteCrudTest`
Expected: FAIL — rotas de quote inexistentes.

- [ ] **Step 3: Write the Actions, Controller and routes**

`backend/app/Domains/Commercial/Actions/CreateQuoteAction.php`:
```php
<?php

namespace App\Domains\Commercial\Actions;

use App\Domains\Commercial\Data\QuoteData;
use App\Domains\Commercial\Enums\QuoteStatus;
use App\Domains\Commercial\Models\Budget;
use App\Domains\Commercial\Models\Quote;
use Illuminate\Support\Facades\DB;
use Spatie\LaravelData\Optional;

/**
 * Cria a cotação sob um orçamento. `seq_in_budget` é atômico: lockForUpdate no
 * MAX(seq) do orçamento dentro da transação (ADR-17). O UNIQUE(budget_id,seq) é
 * a defesa extra. Cliente vem do orçamento (não é input).
 */
class CreateQuoteAction
{
    public function execute(Budget $budget, QuoteData $data): Quote
    {
        return DB::transaction(function () use ($budget, $data) {
            $seq = (int) Quote::where('budget_id', $budget->id)
                ->lockForUpdate()
                ->max('seq_in_budget') + 1;

            return Quote::create([
                'budget_id' => $budget->id,
                'course_id' => $data->course_id,
                'seq_in_budget' => $seq,
                'student_count' => $data->student_count,
                'value_uf' => $data->value_uf,
                'purchase_order' => $data->purchase_order instanceof Optional ? null : $data->purchase_order,
                'planned_start_date' => $data->planned_start_date instanceof Optional ? null : $data->planned_start_date,
                'planned_end_date' => $data->planned_end_date instanceof Optional ? null : $data->planned_end_date,
                'status' => QuoteStatus::Pending,
            ]);
        });
    }
}
```

`backend/app/Domains/Commercial/Actions/UpdateQuoteAction.php`:
```php
<?php

namespace App\Domains\Commercial\Actions;

use App\Domains\Commercial\Data\QuoteData;
use App\Domains\Commercial\Enums\QuoteStatus;
use App\Domains\Commercial\Models\Quote;
use Illuminate\Validation\ValidationException;
use Spatie\LaravelData\Optional;

/**
 * Edita uma cotação. Cotação aprovada é imutável (editar desincronizaria a
 * futura turma) → 422. Editar uma recusada a REABRE para pending (decisão do
 * produto: recusada é reabrível).
 */
class UpdateQuoteAction
{
    public function execute(Quote $quote, QuoteData $data): Quote
    {
        if ($quote->status === QuoteStatus::Approved) {
            throw ValidationException::withMessages([
                'status' => 'Cotação aprovada não pode ser editada.',
            ]);
        }

        $quote->update([
            'course_id' => $data->course_id,
            'student_count' => $data->student_count,
            'value_uf' => $data->value_uf,
            'purchase_order' => $data->purchase_order instanceof Optional ? null : $data->purchase_order,
            'planned_start_date' => $data->planned_start_date instanceof Optional ? null : $data->planned_start_date,
            'planned_end_date' => $data->planned_end_date instanceof Optional ? null : $data->planned_end_date,
            'status' => QuoteStatus::Pending,   // reabre recusada; mantém pendente
        ]);

        return $quote;
    }
}
```

`backend/app/Domains/Commercial/Http/Controllers/QuoteController.php`:
```php
<?php

namespace App\Domains\Commercial\Http\Controllers;

use App\Domains\Commercial\Actions\CreateQuoteAction;
use App\Domains\Commercial\Actions\UpdateQuoteAction;
use App\Domains\Commercial\Data\QuoteData;
use App\Domains\Commercial\Models\Budget;
use App\Domains\Commercial\Models\Quote;
use App\Http\Controllers\Controller;
use Illuminate\Http\Response;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

class QuoteController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('permission:commercial.quote.view', only: ['index', 'show']),
            new Middleware('permission:commercial.quote.create', only: ['store']),
            new Middleware('permission:commercial.quote.update', only: ['update']),
            new Middleware('permission:commercial.quote.delete', only: ['destroy']),
        ];
    }

    /** @return array<QuoteData> */
    public function index(Budget $budget): array
    {
        return $budget->quotes()->get()
            ->map(fn (Quote $q) => QuoteData::fromModel($q))
            ->all();
    }

    public function store(QuoteData $data, Budget $budget, CreateQuoteAction $action): QuoteData
    {
        return QuoteData::fromModel($action->execute($budget, $data));
    }

    public function show(Quote $quote): QuoteData
    {
        return QuoteData::fromModel($quote);
    }

    public function update(QuoteData $data, Quote $quote, UpdateQuoteAction $action): QuoteData
    {
        return QuoteData::fromModel($action->execute($quote, $data));
    }

    public function destroy(Quote $quote): Response
    {
        $quote->delete();

        return response()->noContent();
    }
}
```

Modify `backend/app/Domains/Commercial/routes.php` — import + rotas no grupo `auth:sanctum`:
```php
use App\Domains\Commercial\Http\Controllers\QuoteController;
```
```php
    Route::get('budgets/{budget}/quotes', [QuoteController::class, 'index']);
    Route::post('budgets/{budget}/quotes', [QuoteController::class, 'store']);
    Route::apiResource('quotes', QuoteController::class)->only(['show', 'update', 'destroy']);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `docker compose exec -T app php artisan test --filter=QuoteCrudTest`
Expected: PASS (5 passed).

- [ ] **Step 5: Commit**

```bash
docker compose exec -T app ./vendor/bin/pint app/Domains/Commercial/Actions/CreateQuoteAction.php app/Domains/Commercial/Actions/UpdateQuoteAction.php app/Domains/Commercial/Http/Controllers/QuoteController.php app/Domains/Commercial/routes.php
git add backend/app/Domains/Commercial/Actions/CreateQuoteAction.php backend/app/Domains/Commercial/Actions/UpdateQuoteAction.php backend/app/Domains/Commercial/Http/Controllers/QuoteController.php backend/app/Domains/Commercial/routes.php backend/tests/Feature/Comercial/QuoteCrudTest.php
git commit -m "feat(comercial): CRUD de cotação — seq atômico, reabre recusada, trava aprovada (Sprint 2 · 6.1.4)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 7: Aprovação — Approve/RejectQuoteAction + endpoints + RBAC

**Files:**
- Create: `backend/app/Domains/Commercial/Actions/ApproveQuoteAction.php`
- Create: `backend/app/Domains/Commercial/Actions/RejectQuoteAction.php`
- Modify: `backend/app/Domains/Commercial/Http/Controllers/QuoteController.php` (add approve/reject + middleware)
- Modify: `backend/app/Domains/Commercial/routes.php` (add POST approve/reject)
- Modify: `backend/tests/TestCase.php` (add `actingAsSuperadmin()`)
- Test: `backend/tests/Feature/Comercial/QuoteApprovalTest.php`

**Interfaces:**
- Consumes: `Quote`, `QuoteStatus`, `BudgetData`, RBAC `commercial.quote.approve` (já semeado; só superadmin).
- Produces:
  - `ApproveQuoteAction::execute(Quote): Quote` — `status=Approved`, `approved_at=now()`.
  - `RejectQuoteAction::execute(Quote): Quote` — `status=Rejected`, `approved_at=null`.
  - `QuoteController::approve/reject` — middleware `commercial.quote.approve` (ambos).
  - `TestCase::actingAsSuperadmin(): User`.
  - rotas `POST quotes/{quote}/approve|reject`.

- [ ] **Step 1: Add the `actingAsSuperadmin` helper**

Modify `backend/tests/TestCase.php` — adicione após `actingAsAdmin()`:
```php
    /**
     * Autentica como superadmin (role com TODAS as permissões, inclui
     * commercial.quote.approve). Uso nos testes de aprovação (Fluxo 2).
     */
    protected function actingAsSuperadmin(): User
    {
        $this->seed(RolePermissionSeeder::class);

        $user = User::factory()->create(['type' => 'admin', 'is_active' => true]);
        $user->assignRole('superadmin');
        $this->actingAs($user, 'web');

        return $user;
    }
```

- [ ] **Step 2: Write the failing test**

`backend/tests/Feature/Comercial/QuoteApprovalTest.php`:
```php
<?php

namespace Tests\Feature\Comercial;

use App\Domains\Catalog\Models\Course;
use App\Domains\Commercial\Models\Budget;
use App\Domains\Commercial\Models\Quote;
use App\Domains\Identity\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class QuoteApprovalTest extends TestCase
{
    use RefreshDatabase;

    private function quote(string $status = 'pending'): Quote
    {
        $clientId = User::factory()->create(['type' => 'cliente', 'is_active' => false])
            ->client()->create(['legal_name' => 'ACME', 'type' => 'client'])->id;
        $budgetId = Budget::create(['client_id' => $clientId, 'code' => 'Scap 1'])->id;
        $courseId = Course::create(['name' => 'C', 'workload_hours' => 8])->id;

        return Quote::create([
            'budget_id' => $budgetId, 'course_id' => $courseId, 'seq_in_budget' => 1,
            'student_count' => 5, 'value_uf' => 10, 'status' => $status,
        ]);
    }

    public function test_superadmin_aprova_e_budget_deriva_aprovado(): void
    {
        $this->actingAsSuperadmin();
        $quote = $this->quote();

        $this->postJson("/api/quotes/{$quote->id}/approve")
            ->assertOk()->assertJsonPath('status', 'approved');

        $this->assertNotNull($quote->fresh()->approved_at);

        // o orçamento agora deriva 'approved'
        $this->getJson("/api/budgets/{$quote->budget_id}")
            ->assertOk()->assertJsonPath('status', 'approved');
    }

    public function test_superadmin_recusa_todas_budget_deriva_recusado(): void
    {
        $this->actingAsSuperadmin();
        $quote = $this->quote();

        $this->postJson("/api/quotes/{$quote->id}/reject")
            ->assertOk()->assertJsonPath('status', 'rejected');

        $this->assertNull($quote->fresh()->approved_at);
        $this->getJson("/api/budgets/{$quote->budget_id}")
            ->assertOk()->assertJsonPath('status', 'rejected');
    }

    public function test_admin_nao_pode_aprovar(): void
    {
        $this->actingAsAdmin();          // admin NÃO tem commercial.quote.approve
        $quote = $this->quote();

        $this->postJson("/api/quotes/{$quote->id}/approve")->assertForbidden();
        $this->postJson("/api/quotes/{$quote->id}/reject")->assertForbidden();
    }
}
```

- [ ] **Step 3: Run test to verify it fails**

Run: `docker compose exec -T app php artisan test --filter=QuoteApprovalTest`
Expected: FAIL — rota approve inexistente.

- [ ] **Step 4: Write the Actions, controller methods and routes**

`backend/app/Domains/Commercial/Actions/ApproveQuoteAction.php`:
```php
<?php

namespace App\Domains\Commercial\Actions;

use App\Domains\Commercial\Enums\QuoteStatus;
use App\Domains\Commercial\Models\Quote;

/**
 * Aprova a cotação (Fluxo 2 — só superadmin, com aceite do cliente asserido).
 * Procedural: status + carimbo. O ator vem da auditoria (ADR-08).
 */
class ApproveQuoteAction
{
    public function execute(Quote $quote): Quote
    {
        $quote->update(['status' => QuoteStatus::Approved, 'approved_at' => now()]);

        return $quote;
    }
}
```

`backend/app/Domains/Commercial/Actions/RejectQuoteAction.php`:
```php
<?php

namespace App\Domains\Commercial\Actions;

use App\Domains\Commercial\Enums\QuoteStatus;
use App\Domains\Commercial\Models\Quote;

/**
 * Recusa a cotação (Fluxo 2 — só superadmin). Zera approved_at. A cotação
 * recusada é reabrível: um update posterior a volta a pending (UpdateQuoteAction).
 */
class RejectQuoteAction
{
    public function execute(Quote $quote): Quote
    {
        $quote->update(['status' => QuoteStatus::Rejected, 'approved_at' => null]);

        return $quote;
    }
}
```

Modify `QuoteController` — adicione ao `middleware()` a linha do approve, e os 2 métodos + imports:
```php
            new Middleware('permission:commercial.quote.approve', only: ['approve', 'reject']),
```
Imports no topo:
```php
use App\Domains\Commercial\Actions\ApproveQuoteAction;
use App\Domains\Commercial\Actions\RejectQuoteAction;
```
Métodos (após `destroy`):
```php
    public function approve(Quote $quote, ApproveQuoteAction $action): QuoteData
    {
        return QuoteData::fromModel($action->execute($quote));
    }

    public function reject(Quote $quote, RejectQuoteAction $action): QuoteData
    {
        return QuoteData::fromModel($action->execute($quote));
    }
```

Modify `backend/app/Domains/Commercial/routes.php` — no grupo `auth:sanctum`:
```php
    Route::post('quotes/{quote}/approve', [QuoteController::class, 'approve']);
    Route::post('quotes/{quote}/reject', [QuoteController::class, 'reject']);
```

- [ ] **Step 5: Run test to verify it passes**

Run: `docker compose exec -T app php artisan test --filter=QuoteApprovalTest`
Expected: PASS (3 passed).

- [ ] **Step 6: Commit**

```bash
docker compose exec -T app ./vendor/bin/pint app/Domains/Commercial/Actions/ApproveQuoteAction.php app/Domains/Commercial/Actions/RejectQuoteAction.php app/Domains/Commercial/Http/Controllers/QuoteController.php app/Domains/Commercial/routes.php
git add backend/app/Domains/Commercial/Actions/ApproveQuoteAction.php backend/app/Domains/Commercial/Actions/RejectQuoteAction.php backend/app/Domains/Commercial/Http/Controllers/QuoteController.php backend/app/Domains/Commercial/routes.php backend/tests/TestCase.php backend/tests/Feature/Comercial/QuoteApprovalTest.php
git commit -m "feat(comercial): aprovar/recusar cotação (só superadmin) + budget derivado (Sprint 2 · 6.1.5)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 8: Anexos polimórficos (fatura/comprovante/documento de cotação)

**Files:**
- Create: `backend/app/Shared/Files/Data/FileData.php`
- Create: `backend/app/Domains/Commercial/Http/Controllers/BudgetFileController.php`
- Create: `backend/app/Domains/Commercial/Http/Controllers/QuoteFileController.php`
- Modify: `backend/app/Domains/Commercial/routes.php`
- Modify: `frontend/src/shared/types/generated.ts` (via artisan)
- Test: `backend/tests/Feature/Comercial/CommercialFilesTest.php`

**Interfaces:**
- Consumes: `UploadFileAction::execute(Model $owner, UploadedFile $file, string $type, ?CarbonInterface, ?string $disk): File`; `File` model; morph aliases `budget`/`quote` (já registrados).
- Produces:
  - `FileData` (`#[TypeScript]`): `id`, `type`, `original_name`, `mime`, `size`. `fromModel(File): self`.
  - `BudgetFileController::store/destroy` — tipos `invoice`/`receipt`; checagem de posse.
  - `QuoteFileController::store/destroy` — tipo `quote_document`; checagem de posse.
  - rotas nested sob `permission:commercial.budget.update` / `commercial.quote.update`.

> Financeiro NÃO bloqueia (RN-14): o upload é registro/histórico. A aprovação (Task 7) não exige anexo.

- [ ] **Step 1: Write the failing test**

`backend/tests/Feature/Comercial/CommercialFilesTest.php`:
```php
<?php

namespace Tests\Feature\Comercial;

use App\Domains\Catalog\Models\Course;
use App\Domains\Commercial\Models\Budget;
use App\Domains\Commercial\Models\Quote;
use App\Domains\Identity\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class CommercialFilesTest extends TestCase
{
    use RefreshDatabase;

    private function budget(): Budget
    {
        $clientId = User::factory()->create(['type' => 'cliente', 'is_active' => false])
            ->client()->create(['legal_name' => 'ACME', 'type' => 'client'])->id;

        return Budget::create(['client_id' => $clientId, 'code' => 'Scap 1']);
    }

    public function test_upload_fatura_no_orcamento(): void
    {
        Storage::fake();
        $this->actingAsAdmin();
        $budget = $this->budget();

        $this->postJson("/api/budgets/{$budget->id}/files", [
            'type' => 'invoice',
            'file' => UploadedFile::fake()->create('fatura.pdf', 20, 'application/pdf'),
        ])->assertCreated()->assertJsonPath('type', 'invoice')->assertJsonPath('original_name', 'fatura.pdf');

        $this->assertDatabaseHas('files', [
            'fileable_type' => 'budget', 'fileable_id' => $budget->id, 'type' => 'invoice',
        ]);
    }

    public function test_upload_documento_na_cotacao(): void
    {
        Storage::fake();
        $this->actingAsAdmin();
        $budget = $this->budget();
        $courseId = Course::create(['name' => 'C', 'workload_hours' => 8])->id;
        $quote = Quote::create([
            'budget_id' => $budget->id, 'course_id' => $courseId, 'seq_in_budget' => 1,
            'student_count' => 5, 'value_uf' => 10, 'status' => 'pending',
        ]);

        $this->postJson("/api/quotes/{$quote->id}/files", [
            'type' => 'quote_document',
            'file' => UploadedFile::fake()->create('aceite.pdf', 10, 'application/pdf'),
        ])->assertCreated()->assertJsonPath('type', 'quote_document');

        $this->assertDatabaseHas('files', [
            'fileable_type' => 'quote', 'fileable_id' => $quote->id, 'type' => 'quote_document',
        ]);
    }

    public function test_tipo_invalido_rejeitado(): void
    {
        Storage::fake();
        $this->actingAsAdmin();
        $budget = $this->budget();

        $this->postJson("/api/budgets/{$budget->id}/files", [
            'type' => 'random',
            'file' => UploadedFile::fake()->create('x.pdf', 1, 'application/pdf'),
        ])->assertStatus(422)->assertJsonValidationErrors('type');
    }

    public function test_delete_cross_orcamento_404(): void
    {
        Storage::fake();
        $this->actingAsAdmin();
        $b1 = $this->budget();
        $b2 = $this->budget();

        $fileId = $this->postJson("/api/budgets/{$b1->id}/files", [
            'type' => 'invoice',
            'file' => UploadedFile::fake()->create('f.pdf', 1, 'application/pdf'),
        ])->json('id');

        // tentar deletar pelo orçamento errado → 404 (posse)
        $this->deleteJson("/api/budgets/{$b2->id}/files/{$fileId}")->assertNotFound();
        // pelo dono → 204
        $this->deleteJson("/api/budgets/{$b1->id}/files/{$fileId}")->assertNoContent();
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `docker compose exec -T app php artisan test --filter=CommercialFilesTest`
Expected: FAIL — rota de files inexistente.

- [ ] **Step 3: Write the DTO, controllers and routes**

`backend/app/Shared/Files/Data/FileData.php`:
```php
<?php

namespace App\Shared\Files\Data;

use App\Shared\Files\Models\File;
use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * Contrato genérico de anexo (tabela polimórfica `files`). Usado pelos anexos
 * do orçamento (fatura/comprovante) e da cotação (documento). Sem valid_until:
 * documentos financeiros não têm vigência (ao contrário dos de redator).
 */
#[TypeScript]
class FileData extends Data
{
    public function __construct(
        public int $id,
        public string $type,
        public string $original_name,
        public ?string $mime,
        public int $size,
    ) {}

    public static function fromModel(File $file): self
    {
        return new self(
            id: $file->id,
            type: $file->type,
            original_name: $file->original_name,
            mime: $file->mime,
            size: $file->size,
        );
    }
}
```

`backend/app/Domains/Commercial/Http/Controllers/BudgetFileController.php`:
```php
<?php

namespace App\Domains\Commercial\Http\Controllers;

use App\Domains\Commercial\Models\Budget;
use App\Http\Controllers\Controller;
use App\Shared\Files\Actions\UploadFileAction;
use App\Shared\Files\Data\FileData;
use App\Shared\Files\Models\File;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/**
 * Anexos do orçamento: fatura (`invoice`) e comprovante (`receipt`). Registro
 * financeiro — NÃO bloqueia nenhuma ação (RN-14).
 */
class BudgetFileController extends Controller
{
    public function store(Request $request, Budget $budget, UploadFileAction $action): FileData
    {
        $validated = $request->validate([
            'type' => ['required', 'in:invoice,receipt'],
            'file' => ['required', 'file', 'max:10240'],
        ]);

        return FileData::fromModel(
            $action->execute($budget, $request->file('file'), $validated['type']),
        );
    }

    public function destroy(Budget $budget, File $file): Response
    {
        abort_unless(
            $file->fileable_type === 'budget' && $file->fileable_id === $budget->id,
            404,
        );

        $file->delete();

        return response()->noContent();
    }
}
```

`backend/app/Domains/Commercial/Http/Controllers/QuoteFileController.php`:
```php
<?php

namespace App\Domains\Commercial\Http\Controllers;

use App\Domains\Commercial\Models\Quote;
use App\Http\Controllers\Controller;
use App\Shared\Files\Actions\UploadFileAction;
use App\Shared\Files\Data\FileData;
use App\Shared\Files\Models\File;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/**
 * Anexos da cotação: documento/aceite (`quote_document`). Opcional — a
 * aprovação não exige anexo (RN-14).
 */
class QuoteFileController extends Controller
{
    public function store(Request $request, Quote $quote, UploadFileAction $action): FileData
    {
        $validated = $request->validate([
            'type' => ['required', 'in:quote_document'],
            'file' => ['required', 'file', 'max:10240'],
        ]);

        return FileData::fromModel(
            $action->execute($quote, $request->file('file'), $validated['type']),
        );
    }

    public function destroy(Quote $quote, File $file): Response
    {
        abort_unless(
            $file->fileable_type === 'quote' && $file->fileable_id === $quote->id,
            404,
        );

        $file->delete();

        return response()->noContent();
    }
}
```

Modify `backend/app/Domains/Commercial/routes.php` — imports + rotas nested com RBAC de grupo (padrão do cliente nested):
```php
use App\Domains\Commercial\Http\Controllers\BudgetFileController;
use App\Domains\Commercial\Http\Controllers\QuoteFileController;
```
```php
    Route::middleware('permission:commercial.budget.update')->group(function () {
        Route::post('budgets/{budget}/files', [BudgetFileController::class, 'store']);
        Route::delete('budgets/{budget}/files/{file}', [BudgetFileController::class, 'destroy']);
    });

    Route::middleware('permission:commercial.quote.update')->group(function () {
        Route::post('quotes/{quote}/files', [QuoteFileController::class, 'store']);
        Route::delete('quotes/{quote}/files/{file}', [QuoteFileController::class, 'destroy']);
    });
```

- [ ] **Step 4: Run test to verify it passes**

Run: `docker compose exec -T app php artisan test --filter=CommercialFilesTest`
Expected: PASS (4 passed).

- [ ] **Step 5: Regenerate TS + full suite**

```bash
docker compose exec -T app php artisan typescript:transform
docker compose exec -T app php artisan test
```
Expected: `FileData` em `generated.ts`; suíte inteira verde.

- [ ] **Step 6: Commit**

```bash
docker compose exec -T app ./vendor/bin/pint app/Shared/Files/Data/FileData.php app/Domains/Commercial/Http/Controllers/BudgetFileController.php app/Domains/Commercial/Http/Controllers/QuoteFileController.php app/Domains/Commercial/routes.php
git add backend/app/Shared/Files/Data/FileData.php backend/app/Domains/Commercial/Http/Controllers/BudgetFileController.php backend/app/Domains/Commercial/Http/Controllers/QuoteFileController.php backend/app/Domains/Commercial/routes.php backend/tests/Feature/Comercial/CommercialFilesTest.php frontend/src/shared/types/generated.ts
git commit -m "feat(comercial): anexos polimórficos de orçamento e cotação (Sprint 2 · 6.1.7)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review (feito)

**1. Spec coverage:**
- Schema §6.1.1 → Task 1. Models/morph/cascade §6.1.2 → Task 2 (morph aliases já existiam). DTOs+enum+TS §6.1.3 → Tasks 2 (enum) + 4 (DTOs). Actions CriarCotacao/CRUD §6.1.4 → Tasks 5+6. Approve/Reject+RBAC §6.1.5 → Task 7. Domain Service §6.1.6 → Task 3. Anexos §6.1.7 → Task 8. ✓
- Decisões travadas: derivados (Task 3/4), recusada reabrível (Task 6), aprovação procedural+approved_at (Task 7), `quotes.client_id` não persistido (Task 1 schema — ausente), `payment_terms` texto livre (Task 1), total = todas as ativas (Task 3). ✓
- RBAC já semeado / morph já registrado — Constraints anotam "não editar". ✓

**2. Placeholder scan:** sem TBD/TODO; todo passo de código traz o código completo. ✓

**3. Type consistency:** `QuoteStatus` (Task 2) reusado em `Quote` cast, `BudgetSummaryService` (Task 3), `QuoteData`/`BudgetData` (Task 4). `BudgetSummaryService::{status,totalValueUf,totalStudents}` idênticos entre Task 3 (def) e Task 4 (uso). `UploadFileAction::execute(Model,UploadedFile,string,...)` bate com a assinatura real lida do código. `code` calculado `"Scap {budget_id} - Cot {seq}"` idêntico em `QuoteData::fromModel` (Task 4) e no teste da Task 6. ✓
