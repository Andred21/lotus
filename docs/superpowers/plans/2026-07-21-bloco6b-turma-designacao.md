# Bloco 6b · Turma + designação de redator (backend) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformar uma cotação aprovada em turma (config manual) e designar um ou mais redatores com gate de idoneidade RN-09, tudo no backend.

**Architecture:** Domínio `Operation` (hoje scaffold vazio) ganha migration `turmas` + pivot `turma_redator` (N:N), `Turma` model, enums, um serviço de gate (`RedatorIdoneidadeService`), Actions finas e um `TurmaController` REST. Cotação aprovada não cria turma no approve — a turma nasce por POST explícito. Designação é endpoint separado que roda o gate.

**Tech Stack:** Laravel 13 · PHP 8.3 · MySQL 8 (prod/gate) / sqlite `:memory:` (testes de dev) · spatie/laravel-data + typescript-transformer · owen-it/laravel-auditing · spatie/laravel-permission · RFC 7807 via handler global.

## Global Constraints

- **Sem Repository sobre Eloquent** (ADR-02). Lógica em Actions/Services; controllers finos.
- **Auditoria só na aplicação** — `Auditable` no model, `$auditInclude`. Nunca trigger de banco.
- **`generated.ts` não se edita à mão** — muda o DTO e roda `php artisan typescript:transform` (ADR-04, lei §3).
- **Erros sobem ao handler global RFC 7807** — nunca `abort()` nem `response()->json` de erro na Action. Exceções de domínio estendem `HttpException` (idioma do `ImmutableSystemRoleException`). Lei §4.
- **`course_id` da turma é derivado da cotação** — nunca vem do payload.
- **`redator_id` do pivot é RESTRICT** — redator com turma viva não é apagado (lição #15: FK de peso operacional não cascateia).
- **Backend roda no container:** `docker compose exec -T app php artisan ...`. Pint só com argumento.
- **Prova real é contra MySQL** (lição #15): sqlite mascara constraint de FK/DDL. Ver Task 6.

---

### Task 1: Schema, enums e model `Turma`

Cria a fundação de dados do domínio Operation e satisfaz o placeholder `'turma' => Turma::class` já registrado em `app/Providers/AppServiceProvider.php:46`.

**Files:**
- Create: `backend/database/migrations/2026_07_21_000001_create_turmas_table.php`
- Create: `backend/app/Domains/Operation/Enums/TurmaStatus.php`
- Create: `backend/app/Domains/Operation/Enums/TurmaModalidade.php`
- Create: `backend/app/Domains/Operation/Models/Turma.php`
- Modify: `backend/app/Domains/Commercial/Models/Quote.php` (adiciona `turma()` hasOne)
- Test: `backend/tests/Feature/Operation/TurmaModelTest.php`

**Interfaces:**
- Produces: `Turma` model com casts `modalidade`→`TurmaModalidade`, `status`→`TurmaStatus`, `start_date`/`end_date`→date; relations `quote()`, `course()`, `redatores()` (belongsToMany `turma_redator`), `files()` (morphMany). Enums `TurmaStatus::{EmAndamento,Habilitada,Concluida}`, `TurmaModalidade::{Presencial,Online}`. `Quote::turma()` hasOne.

- [ ] **Step 1: Write the failing test**

Create `backend/tests/Feature/Operation/TurmaModelTest.php`:

```php
<?php

namespace Tests\Feature\Operation;

use App\Domains\Catalog\Models\Course;
use App\Domains\Commercial\Models\Budget;
use App\Domains\Commercial\Models\Quote;
use App\Domains\Identity\Models\Redator;
use App\Domains\Identity\Models\User;
use App\Domains\Operation\Enums\TurmaModalidade;
use App\Domains\Operation\Enums\TurmaStatus;
use App\Domains\Operation\Models\Turma;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TurmaModelTest extends TestCase
{
    use RefreshDatabase;

    private function makeApprovedQuote(): Quote
    {
        $clientId = User::factory()->create(['type' => 'cliente', 'is_active' => false])
            ->client()->create(['legal_name' => 'ACME', 'type' => 'client'])->id;
        $budget = Budget::create(['client_id' => $clientId, 'code' => 'Scap 1']);
        $courseId = Course::create(['name' => 'AT', 'workload_hours' => 8])->id;

        return Quote::create([
            'budget_id' => $budget->id, 'course_id' => $courseId, 'seq_in_budget' => 1,
            'student_count' => 5, 'value_uf' => 10, 'status' => 'approved',
        ]);
    }

    public function test_cria_turma_com_casts_e_relacoes(): void
    {
        $quote = $this->makeApprovedQuote();

        $turma = Turma::create([
            'quote_id' => $quote->id, 'course_id' => $quote->course_id,
            'modalidade' => TurmaModalidade::Presencial, 'local_aplicacao' => 'Santiago',
            'start_date' => '2026-08-01', 'end_date' => '2026-08-10',
            'status' => TurmaStatus::EmAndamento,
        ]);

        $fresh = $turma->fresh();
        $this->assertInstanceOf(TurmaModalidade::class, $fresh->modalidade);
        $this->assertSame(TurmaStatus::EmAndamento, $fresh->status);
        $this->assertSame($quote->id, $fresh->quote->id);
        $this->assertSame($quote->course_id, $fresh->course->id);
        $this->assertSame($turma->id, $quote->fresh()->turma->id);
    }

    public function test_pivot_turma_redator_associa_redator(): void
    {
        $quote = $this->makeApprovedQuote();
        $turma = Turma::create([
            'quote_id' => $quote->id, 'course_id' => $quote->course_id,
            'modalidade' => TurmaModalidade::Online, 'local_aplicacao' => null,
            'start_date' => '2026-08-01', 'end_date' => '2026-08-10',
        ]);
        $redator = Redator::create(['user_id' => User::factory()->redator()->create()->id]);

        $turma->redatores()->attach($redator->id);

        $this->assertDatabaseHas('turma_redator', ['turma_id' => $turma->id, 'redator_id' => $redator->id]);
        $this->assertSame(1, $turma->redatores()->count());
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `docker compose exec -T app php artisan test --filter=TurmaModelTest`
Expected: FAIL — `Class "App\Domains\Operation\Models\Turma" not found`.

- [ ] **Step 3: Create the enums**

`backend/app/Domains/Operation/Enums/TurmaStatus.php`:

```php
<?php

namespace App\Domains\Operation\Enums;

/**
 * Estados da turma (máquina de 3 estados). 6b só nasce em EmAndamento;
 * Habilitada/Concluida são transições do 6d (conclusão).
 */
enum TurmaStatus: string
{
    case EmAndamento = 'em_andamento';
    case Habilitada = 'habilitada';
    case Concluida = 'concluida';
}
```

`backend/app/Domains/Operation/Enums/TurmaModalidade.php`:

```php
<?php

namespace App\Domains\Operation\Enums;

enum TurmaModalidade: string
{
    case Presencial = 'presencial';
    case Online = 'online';
}
```

- [ ] **Step 4: Create the migration**

`backend/database/migrations/2026_07_21_000001_create_turmas_table.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('turmas', function (Blueprint $table) {
            $table->id();
            // 1:1 com a cotação. RESTRICT: cotação não some com turma viva.
            $table->foreignId('quote_id')->constrained('quotes')->restrictOnDelete()->unique();
            $table->foreignId('course_id')->constrained('courses');   // derivado da quote
            $table->enum('modalidade', ['presencial', 'online']);
            $table->string('local_aplicacao')->nullable();            // exigido só se presencial (validação DTO)
            $table->date('start_date');
            $table->date('end_date');
            $table->enum('status', ['em_andamento', 'habilitada', 'concluida'])->default('em_andamento');
            $table->timestamps();
            $table->softDeletes();

            $table->index('status');
        });

        Schema::create('turma_redator', function (Blueprint $table) {
            $table->id();
            $table->foreignId('turma_id')->constrained('turmas')->cascadeOnDelete();
            // RESTRICT: redator com turma não é apagado (lição #15).
            $table->foreignId('redator_id')->constrained('redatores')->restrictOnDelete();
            $table->timestamps();

            $table->unique(['turma_id', 'redator_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('turma_redator');
        Schema::dropIfExists('turmas');
    }
};
```

- [ ] **Step 5: Create the `Turma` model**

`backend/app/Domains/Operation/Models/Turma.php`:

```php
<?php

namespace App\Domains\Operation\Models;

use App\Domains\Catalog\Models\Course;
use App\Domains\Commercial\Models\Quote;
use App\Domains\Identity\Models\Redator;
use App\Domains\Operation\Enums\TurmaModalidade;
use App\Domains\Operation\Enums\TurmaStatus;
use App\Shared\Files\Models\File;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use OwenIt\Auditing\Auditable as AuditableTrait;
use OwenIt\Auditing\Contracts\Auditable;

/**
 * Turma = instância operacional de um curso, nascida de uma cotação aprovada
 * (1:1). Um ou mais redatores via pivot `turma_redator` (N:N). `files()` para o
 * manual futuro (morph key `turma`, já registrada no morph map).
 */
class Turma extends Model implements Auditable
{
    use AuditableTrait, SoftDeletes;

    protected $fillable = [
        'quote_id', 'course_id', 'modalidade', 'local_aplicacao',
        'start_date', 'end_date', 'status',
    ];

    protected $auditInclude = [
        'quote_id', 'course_id', 'modalidade', 'local_aplicacao',
        'start_date', 'end_date', 'status',
    ];

    protected $casts = [
        'modalidade' => TurmaModalidade::class,
        'status' => TurmaStatus::class,
        'start_date' => 'date',
        'end_date' => 'date',
    ];

    public function quote(): BelongsTo
    {
        return $this->belongsTo(Quote::class);
    }

    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class);
    }

    public function redatores(): BelongsToMany
    {
        return $this->belongsToMany(Redator::class, 'turma_redator')->withTimestamps();
    }

    public function files(): MorphMany
    {
        return $this->morphMany(File::class, 'fileable');
    }
}
```

- [ ] **Step 6: Add `turma()` to the `Quote` model**

In `backend/app/Domains/Commercial/Models/Quote.php`, add the import and relation.

Add to the imports block (after the existing `use ...Relations\MorphMany;`):

```php
use App\Domains\Operation\Models\Turma;
use Illuminate\Database\Eloquent\Relations\HasOne;
```

Add this method after `files()`:

```php
    /** Turma nascida desta cotação (1:1). Ausente até a config manual (6b). */
    public function turma(): HasOne
    {
        return $this->hasOne(Turma::class);
    }
```

- [ ] **Step 7: Run test to verify it passes**

Run: `docker compose exec -T app php artisan test --filter=TurmaModelTest`
Expected: PASS (2 tests).

- [ ] **Step 8: Pint + commit**

```bash
cd backend && ./vendor/bin/pint app/Domains/Operation app/Domains/Commercial/Models/Quote.php database/migrations/2026_07_21_000001_create_turmas_table.php tests/Feature/Operation/TurmaModelTest.php
cd .. && git add backend/app/Domains/Operation backend/app/Domains/Commercial/Models/Quote.php backend/database/migrations/2026_07_21_000001_create_turmas_table.php backend/tests/Feature/Operation/TurmaModelTest.php
git commit -m "feat(operation): schema turmas + turma_redator + model Turma (6b)"
```

---

### Task 2: Gate de idoneidade — `RedatorIdoneidadeService`

Fonte única de "este redator pode assumir esta turma": habilitação ao curso (`course_redator`) **e** REUF válido (RN-09; `valid_until` nulo = vale sempre).

**Files:**
- Create: `backend/app/Domains/Operation/Exceptions/RedatorNaoElegivelException.php`
- Create: `backend/app/Domains/Operation/Services/RedatorIdoneidadeService.php`
- Test: `backend/tests/Feature/Operation/RedatorIdoneidadeServiceTest.php`

**Interfaces:**
- Consumes: `Redator`, `Course`, `RedatorDocumentType::REUF`.
- Produces: `RedatorIdoneidadeService::assertEligible(Redator, Course): void` (lança `RedatorNaoElegivelException` 422) e `isEligible(Redator, Course): bool`. `RedatorNaoElegivelException::naoHabilitado()` / `::reufInvalido()`.

- [ ] **Step 1: Write the failing test**

Create `backend/tests/Feature/Operation/RedatorIdoneidadeServiceTest.php`:

```php
<?php

namespace Tests\Feature\Operation;

use App\Domains\Catalog\Models\Course;
use App\Domains\Identity\Models\Redator;
use App\Domains\Identity\Models\User;
use App\Domains\Operation\Exceptions\RedatorNaoElegivelException;
use App\Domains\Operation\Services\RedatorIdoneidadeService;
use App\Shared\Files\Models\File;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RedatorIdoneidadeServiceTest extends TestCase
{
    use RefreshDatabase;

    private function service(): RedatorIdoneidadeService
    {
        return app(RedatorIdoneidadeService::class);
    }

    private function makeRedator(): Redator
    {
        return Redator::create(['user_id' => User::factory()->redator()->create()->id]);
    }

    private function reuf(Redator $r, ?string $validUntil): void
    {
        File::create([
            'fileable_type' => 'redator', 'fileable_id' => $r->id, 'type' => 'REUF',
            'path' => 'docs/reuf.pdf', 'original_name' => 'reuf.pdf',
            'mime' => 'application/pdf', 'size' => 100, 'valid_until' => $validUntil,
        ]);
    }

    public function test_habilitado_com_reuf_futuro_e_elegivel(): void
    {
        $course = Course::create(['name' => 'AT', 'workload_hours' => 8]);
        $r = $this->makeRedator();
        $course->redatores()->attach($r->id);
        $this->reuf($r, '2030-01-01');

        $this->assertTrue($this->service()->isEligible($r, $course));
        $this->service()->assertEligible($r, $course);   // não lança
    }

    public function test_reuf_com_validade_nula_vale_sempre(): void
    {
        $course = Course::create(['name' => 'AT', 'workload_hours' => 8]);
        $r = $this->makeRedator();
        $course->redatores()->attach($r->id);
        $this->reuf($r, null);

        $this->assertTrue($this->service()->isEligible($r, $course));
    }

    public function test_sem_reuf_reprova(): void
    {
        $course = Course::create(['name' => 'AT', 'workload_hours' => 8]);
        $r = $this->makeRedator();
        $course->redatores()->attach($r->id);

        $this->expectException(RedatorNaoElegivelException::class);
        $this->service()->assertEligible($r, $course);
    }

    public function test_reuf_vencido_reprova(): void
    {
        $course = Course::create(['name' => 'AT', 'workload_hours' => 8]);
        $r = $this->makeRedator();
        $course->redatores()->attach($r->id);
        $this->reuf($r, '2020-01-01');

        $this->assertFalse($this->service()->isEligible($r, $course));
        $this->expectException(RedatorNaoElegivelException::class);
        $this->service()->assertEligible($r, $course);
    }

    public function test_nao_habilitado_ao_curso_reprova(): void
    {
        $course = Course::create(['name' => 'AT', 'workload_hours' => 8]);
        $r = $this->makeRedator();
        $this->reuf($r, '2030-01-01');   // REUF ok, mas sem course_redator

        $this->expectException(RedatorNaoElegivelException::class);
        $this->service()->assertEligible($r, $course);
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `docker compose exec -T app php artisan test --filter=RedatorIdoneidadeServiceTest`
Expected: FAIL — `Class "App\Domains\Operation\Services\RedatorIdoneidadeService" not found`.

- [ ] **Step 3: Create the exception**

`backend/app/Domains/Operation/Exceptions/RedatorNaoElegivelException.php`:

```php
<?php

namespace App\Domains\Operation\Exceptions;

use Symfony\Component\HttpKernel\Exception\HttpException;

/**
 * Redator não pode ser designado à turma (gate RN-09). HttpException(422) → o
 * handler global (ProblemDetails) formata em RFC 7807. Mensagem distinta por
 * causa para o front diferenciar (não-habilitado vs REUF ausente/vencido).
 */
class RedatorNaoElegivelException extends HttpException
{
    public static function naoHabilitado(): self
    {
        return new self(422, 'Redator não está habilitado a ministrar este curso.');
    }

    public static function reufInvalido(): self
    {
        return new self(422, 'Redator não possui REUF válido (documento ausente ou vencido).');
    }
}
```

- [ ] **Step 4: Create the service**

`backend/app/Domains/Operation/Services/RedatorIdoneidadeService.php`:

```php
<?php

namespace App\Domains\Operation\Services;

use App\Domains\Catalog\Models\Course;
use App\Domains\Identity\Enums\RedatorDocumentType;
use App\Domains\Identity\Models\Redator;
use App\Domains\Operation\Exceptions\RedatorNaoElegivelException;
use Illuminate\Contracts\Database\Query\Builder;

/**
 * Gate de designação (RN-09): redator só assume turma se habilitado ao curso
 * (course_redator) E com REUF válido. `valid_until` nulo = vale sempre;
 * só REUF vencido reprova. CV/TÍTULO não bloqueiam (decisão João, 2026-07-21).
 */
class RedatorIdoneidadeService
{
    public function assertEligible(Redator $redator, Course $course): void
    {
        if (! $this->isHabilitado($redator, $course)) {
            throw RedatorNaoElegivelException::naoHabilitado();
        }
        if (! $this->temReufValido($redator)) {
            throw RedatorNaoElegivelException::reufInvalido();
        }
    }

    public function isEligible(Redator $redator, Course $course): bool
    {
        return $this->isHabilitado($redator, $course) && $this->temReufValido($redator);
    }

    private function isHabilitado(Redator $redator, Course $course): bool
    {
        return $course->redatores()->whereKey($redator->id)->exists();
    }

    private function temReufValido(Redator $redator): bool
    {
        // O soft-delete de `files` já exclui os documentos removidos.
        return $redator->documents()
            ->where('type', RedatorDocumentType::REUF->value)
            ->where(fn (Builder $q) => $q
                ->whereNull('valid_until')
                ->orWhereDate('valid_until', '>=', now()->toDateString()))
            ->exists();
    }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `docker compose exec -T app php artisan test --filter=RedatorIdoneidadeServiceTest`
Expected: PASS (5 tests).

- [ ] **Step 6: Pint + commit**

```bash
cd backend && ./vendor/bin/pint app/Domains/Operation/Services app/Domains/Operation/Exceptions tests/Feature/Operation/RedatorIdoneidadeServiceTest.php
cd .. && git add backend/app/Domains/Operation/Services backend/app/Domains/Operation/Exceptions backend/tests/Feature/Operation/RedatorIdoneidadeServiceTest.php
git commit -m "feat(operation): RedatorIdoneidadeService — gate RN-09 (REUF + habilitação)"
```

---

### Task 3: Criar turma da cotação aprovada (DTO + Action + endpoint)

POST `quotes/{quote}/turma`. Guarda cotação aprovada + sem turma; deriva `course_id` da quote; nasce `em_andamento`.

**Files:**
- Create: `backend/app/Domains/Operation/Data/TurmaRedatorData.php`
- Create: `backend/app/Domains/Operation/Data/TurmaData.php`
- Create: `backend/app/Domains/Operation/Exceptions/TurmaConfiguracaoException.php`
- Create: `backend/app/Domains/Operation/Actions/CreateTurmaAction.php`
- Create: `backend/app/Domains/Operation/Http/Controllers/TurmaController.php`
- Create: `backend/app/Domains/Operation/routes.php`
- Modify: `backend/resources/js/types/generated.ts` (via `typescript:transform`, não à mão)
- Test: `backend/tests/Feature/Operation/TurmaCrudTest.php`

**Interfaces:**
- Consumes: `Turma`, `TurmaModalidade`, `TurmaStatus`, `Quote`, `QuoteStatus::Approved`.
- Produces: `TurmaData` (com `redatores: TurmaRedatorData[]`), `TurmaData::fromModel(Turma)`; `CreateTurmaAction::execute(Quote, TurmaData): Turma`; `TurmaConfiguracaoException::cotacaoNaoAprovada()` / `::turmaJaExiste()`; `TurmaController@store`; rota POST `quotes/{quote}/turma`.

- [ ] **Step 1: Write the failing test**

Create `backend/tests/Feature/Operation/TurmaCrudTest.php`:

```php
<?php

namespace Tests\Feature\Operation;

use App\Domains\Catalog\Models\Course;
use App\Domains\Commercial\Models\Budget;
use App\Domains\Commercial\Models\Quote;
use App\Domains\Identity\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TurmaCrudTest extends TestCase
{
    use RefreshDatabase;

    private int $courseId;

    private function makeQuote(string $status = 'approved'): Quote
    {
        $clientId = User::factory()->create(['type' => 'cliente', 'is_active' => false])
            ->client()->create(['legal_name' => 'ACME', 'type' => 'client'])->id;
        $budget = Budget::create(['client_id' => $clientId, 'code' => 'Scap 1']);
        $this->courseId = Course::create(['name' => 'AT', 'workload_hours' => 8])->id;

        return Quote::create([
            'budget_id' => $budget->id, 'course_id' => $this->courseId, 'seq_in_budget' => 1,
            'student_count' => 5, 'value_uf' => 10, 'status' => $status,
        ]);
    }

    private function payload(array $override = []): array
    {
        return array_merge([
            'modalidade' => 'presencial', 'local_aplicacao' => 'Santiago',
            'start_date' => '2026-08-01', 'end_date' => '2026-08-10',
        ], $override);
    }

    public function test_cria_turma_de_cotacao_aprovada(): void
    {
        $this->actingAsAdmin();
        $quote = $this->makeQuote('approved');

        $this->postJson("/api/quotes/{$quote->id}/turma", $this->payload())
            ->assertCreated()
            ->assertJsonPath('status', 'em_andamento')
            ->assertJsonPath('course_id', $this->courseId)
            ->assertJsonPath('modalidade', 'presencial');

        $this->assertDatabaseHas('turmas', ['quote_id' => $quote->id, 'status' => 'em_andamento']);
    }

    public function test_course_id_vem_da_quote_ignora_payload(): void
    {
        $this->actingAsAdmin();
        $quote = $this->makeQuote('approved');
        $outroCurso = Course::create(['name' => 'Outro', 'workload_hours' => 4])->id;

        $this->postJson("/api/quotes/{$quote->id}/turma", $this->payload(['course_id' => $outroCurso]))
            ->assertCreated()
            ->assertJsonPath('course_id', $this->courseId);   // o da quote, não o injetado
    }

    public function test_cotacao_nao_aprovada_recusa_422(): void
    {
        $this->actingAsAdmin();
        $quote = $this->makeQuote('pending');

        $this->postJson("/api/quotes/{$quote->id}/turma", $this->payload())
            ->assertStatus(422);
        $this->assertDatabaseMissing('turmas', ['quote_id' => $quote->id]);
    }

    public function test_quote_que_ja_tem_turma_recusa_422(): void
    {
        $this->actingAsAdmin();
        $quote = $this->makeQuote('approved');

        $this->postJson("/api/quotes/{$quote->id}/turma", $this->payload())->assertCreated();
        $this->postJson("/api/quotes/{$quote->id}/turma", $this->payload())->assertStatus(422);

        $this->assertSame(1, \App\Domains\Operation\Models\Turma::where('quote_id', $quote->id)->count());
    }

    public function test_presencial_exige_local_aplicacao(): void
    {
        $this->actingAsAdmin();
        $quote = $this->makeQuote('approved');

        $this->postJson("/api/quotes/{$quote->id}/turma", $this->payload(['local_aplicacao' => null]))
            ->assertStatus(422)
            ->assertJsonValidationErrors('local_aplicacao');
    }

    public function test_online_dispensa_local_aplicacao(): void
    {
        $this->actingAsAdmin();
        $quote = $this->makeQuote('approved');

        $this->postJson("/api/quotes/{$quote->id}/turma", $this->payload([
            'modalidade' => 'online', 'local_aplicacao' => null,
        ]))->assertCreated()->assertJsonPath('modalidade', 'online');
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `docker compose exec -T app php artisan test --filter=TurmaCrudTest`
Expected: FAIL — rota `quotes/{quote}/turma` inexistente (404) / controller ausente.

- [ ] **Step 3: Create `TurmaRedatorData`**

`backend/app/Domains/Operation/Data/TurmaRedatorData.php`:

```php
<?php

namespace App\Domains\Operation\Data;

use App\Domains\Identity\Models\Redator;
use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/** Projeção mínima do redator designado (id + nome), read-only na TurmaData. */
#[TypeScript]
class TurmaRedatorData extends Data
{
    public function __construct(
        public int $id,
        public string $name,
    ) {}

    public static function fromModel(Redator $redator): self
    {
        return new self(id: $redator->id, name: $redator->user?->name ?? '');
    }
}
```

- [ ] **Step 4: Create `TurmaData`**

`backend/app/Domains/Operation/Data/TurmaData.php`:

```php
<?php

namespace App\Domains\Operation\Data;

use App\Domains\Identity\Models\Redator;
use App\Domains\Operation\Enums\TurmaModalidade;
use App\Domains\Operation\Enums\TurmaStatus;
use App\Domains\Operation\Models\Turma;
use Illuminate\Validation\Rule;
use Spatie\LaravelData\Data;
use Spatie\LaravelData\Optional;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * Contrato da turma. `quote_id`/`course_id`/`status`/`redatores` são read-only
 * (saída): `course_id` deriva da cotação, `status` nasce em_andamento, redatores
 * entram pela designação. `local_aplicacao` é exigido só no presencial.
 */
#[TypeScript]
class TurmaData extends Data
{
    public function __construct(
        public int|Optional $id,
        public int|Optional $quote_id,
        public int|Optional $course_id,
        public TurmaModalidade $modalidade,
        public string|null $local_aplicacao,
        public string $start_date,
        public string $end_date,
        public TurmaStatus|Optional $status,
        /** @var TurmaRedatorData[] */
        public array|Optional $redatores = [],
    ) {}

    public static function rules(): array
    {
        return [
            'modalidade' => ['required', Rule::enum(TurmaModalidade::class)],
            'local_aplicacao' => ['nullable', 'string', 'max:255', 'required_if:modalidade,presencial'],
            'start_date' => ['required', 'date'],
            'end_date' => ['required', 'date', 'after_or_equal:start_date'],
        ];
    }

    public static function fromModel(Turma $turma): self
    {
        return new self(
            id: $turma->id,
            quote_id: $turma->quote_id,
            course_id: $turma->course_id,
            modalidade: $turma->modalidade,
            local_aplicacao: $turma->local_aplicacao,
            start_date: $turma->start_date->toDateString(),
            end_date: $turma->end_date->toDateString(),
            status: $turma->status,
            redatores: $turma->redatores->map(fn (Redator $r) => TurmaRedatorData::fromModel($r))->all(),
        );
    }
}
```

- [ ] **Step 5: Create `TurmaConfiguracaoException`**

`backend/app/Domains/Operation/Exceptions/TurmaConfiguracaoException.php`:

```php
<?php

namespace App\Domains\Operation\Exceptions;

use Symfony\Component\HttpKernel\Exception\HttpException;

/**
 * Configuração de turma inválida (cotação não aprovada ou turma já existente).
 * HttpException(422) → handler global RFC 7807.
 */
class TurmaConfiguracaoException extends HttpException
{
    public static function cotacaoNaoAprovada(): self
    {
        return new self(422, 'A cotação precisa estar aprovada para configurar a turma.');
    }

    public static function turmaJaExiste(): self
    {
        return new self(422, 'Esta cotação já tem uma turma configurada.');
    }
}
```

- [ ] **Step 6: Create `CreateTurmaAction`**

`backend/app/Domains/Operation/Actions/CreateTurmaAction.php`:

```php
<?php

namespace App\Domains\Operation\Actions;

use App\Domains\Commercial\Enums\QuoteStatus;
use App\Domains\Commercial\Models\Quote;
use App\Domains\Operation\Data\TurmaData;
use App\Domains\Operation\Enums\TurmaStatus;
use App\Domains\Operation\Exceptions\TurmaConfiguracaoException;
use App\Domains\Operation\Models\Turma;
use Illuminate\Support\Facades\DB;

/**
 * Configura a turma a partir de uma cotação aprovada (passo manual, não no
 * approve). `course_id` deriva da cotação — nunca do payload. Nasce em_andamento.
 */
class CreateTurmaAction
{
    public function execute(Quote $quote, TurmaData $data): Turma
    {
        if ($quote->status !== QuoteStatus::Approved) {
            throw TurmaConfiguracaoException::cotacaoNaoAprovada();
        }
        if ($quote->turma()->exists()) {
            throw TurmaConfiguracaoException::turmaJaExiste();
        }

        return DB::transaction(fn () => Turma::create([
            'quote_id' => $quote->id,
            'course_id' => $quote->course_id,          // derivado da cotação
            'modalidade' => $data->modalidade,
            'local_aplicacao' => $data->local_aplicacao,
            'start_date' => $data->start_date,
            'end_date' => $data->end_date,
            'status' => TurmaStatus::EmAndamento,
        ]));
    }
}
```

- [ ] **Step 7: Create `TurmaController` (store only for now)**

`backend/app/Domains/Operation/Http/Controllers/TurmaController.php`:

```php
<?php

namespace App\Domains\Operation\Http\Controllers;

use App\Domains\Commercial\Models\Quote;
use App\Domains\Operation\Actions\CreateTurmaAction;
use App\Domains\Operation\Data\TurmaData;
use App\Http\Controllers\Controller;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

class TurmaController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('permission:operation.turma.view', only: ['index', 'show']),
            new Middleware('permission:operation.turma.create', only: ['store']),
            new Middleware('permission:operation.turma.update', only: ['update']),
            new Middleware('permission:operation.turma.delete', only: ['destroy']),
            new Middleware('permission:operation.turma.assign_redator', only: ['designateRedator', 'removeRedator']),
        ];
    }

    public function store(TurmaData $data, Quote $quote, CreateTurmaAction $action): TurmaData
    {
        return TurmaData::fromModel($action->execute($quote, $data)->load('redatores.user'));
    }
}
```

- [ ] **Step 8: Create `Operation/routes.php`**

`backend/app/Domains/Operation/routes.php` (auto-carregado pelo glob em `routes/api.php`):

```php
<?php

use App\Domains\Operation\Http\Controllers\TurmaController;
use Illuminate\Support\Facades\Route;

// Rotas do domínio Operation (agregadas por routes/api.php sob prefixo `api/`).
Route::middleware('auth:sanctum')->group(function () {
    Route::post('quotes/{quote}/turma', [TurmaController::class, 'store']);
});
```

- [ ] **Step 9: Run test to verify it passes**

Run: `docker compose exec -T app php artisan test --filter=TurmaCrudTest`
Expected: PASS (6 tests).

- [ ] **Step 10: Regenerate typed contract**

Run: `docker compose exec -T app php artisan typescript:transform`
Expected: `generated.ts` regenerado com `TurmaData`/`TurmaRedatorData`. Confirme que aparecem e **não edite à mão**.

- [ ] **Step 11: Pint + commit**

```bash
cd backend && ./vendor/bin/pint app/Domains/Operation tests/Feature/Operation/TurmaCrudTest.php
cd .. && git add backend/app/Domains/Operation backend/resources/js/types/generated.ts backend/tests/Feature/Operation/TurmaCrudTest.php
git commit -m "feat(operation): criar turma de cotação aprovada + TurmaData tipado (6b)"
```

> Nota: se `generated.ts` viver noutro caminho, use o que o `typescript:transform` tocar (confira `config/typescript-transformer.php`). Adicione o arquivo realmente modificado ao commit.

---

### Task 4: Designar / remover redator (gate RN-09 no endpoint)

POST/DELETE `turmas/{turma}/redatores/{redator}`. Designação roda o gate; remoção faz detach. Multi-redator = múltiplas designações.

**Files:**
- Create: `backend/app/Domains/Operation/Actions/DesignateRedatorAction.php`
- Create: `backend/app/Domains/Operation/Actions/RemoveRedatorAction.php`
- Modify: `backend/app/Domains/Operation/Http/Controllers/TurmaController.php` (add `designateRedator`, `removeRedator`)
- Modify: `backend/app/Domains/Operation/routes.php` (add as 2 rotas)
- Test: `backend/tests/Feature/Operation/TurmaDesignationTest.php`

**Interfaces:**
- Consumes: `RedatorIdoneidadeService::assertEligible`, `Turma`, `Redator`, `TurmaData`.
- Produces: `DesignateRedatorAction::execute(Turma, Redator): Turma`; `RemoveRedatorAction::execute(Turma, Redator): Turma`; `TurmaController@designateRedator`/`@removeRedator`; rotas POST/DELETE `turmas/{turma}/redatores/{redator}`.

- [ ] **Step 1: Write the failing test**

Create `backend/tests/Feature/Operation/TurmaDesignationTest.php`:

```php
<?php

namespace Tests\Feature\Operation;

use App\Domains\Catalog\Models\Course;
use App\Domains\Commercial\Models\Budget;
use App\Domains\Commercial\Models\Quote;
use App\Domains\Identity\Models\Redator;
use App\Domains\Identity\Models\User;
use App\Domains\Operation\Enums\TurmaModalidade;
use App\Domains\Operation\Enums\TurmaStatus;
use App\Domains\Operation\Models\Turma;
use App\Shared\Files\Models\File;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TurmaDesignationTest extends TestCase
{
    use RefreshDatabase;

    private Turma $turma;

    private Course $course;

    private function setUpTurma(): void
    {
        $clientId = User::factory()->create(['type' => 'cliente', 'is_active' => false])
            ->client()->create(['legal_name' => 'ACME', 'type' => 'client'])->id;
        $budget = Budget::create(['client_id' => $clientId, 'code' => 'Scap 1']);
        $this->course = Course::create(['name' => 'AT', 'workload_hours' => 8]);
        $quote = Quote::create([
            'budget_id' => $budget->id, 'course_id' => $this->course->id, 'seq_in_budget' => 1,
            'student_count' => 5, 'value_uf' => 10, 'status' => 'approved',
        ]);
        $this->turma = Turma::create([
            'quote_id' => $quote->id, 'course_id' => $this->course->id,
            'modalidade' => TurmaModalidade::Online, 'local_aplicacao' => null,
            'start_date' => '2026-08-01', 'end_date' => '2026-08-10',
            'status' => TurmaStatus::EmAndamento,
        ]);
    }

    private function makeRedator(bool $habilitado, ?string $reufValidUntil): Redator
    {
        $r = Redator::create(['user_id' => User::factory()->redator()->create()->id]);
        if ($habilitado) {
            $this->course->redatores()->attach($r->id);
        }
        if ($reufValidUntil !== false) {
            File::create([
                'fileable_type' => 'redator', 'fileable_id' => $r->id, 'type' => 'REUF',
                'path' => 'docs/reuf.pdf', 'original_name' => 'reuf.pdf',
                'mime' => 'application/pdf', 'size' => 100, 'valid_until' => $reufValidUntil,
            ]);
        }

        return $r;
    }

    public function test_designa_redator_idoneo(): void
    {
        $this->actingAsAdmin();
        $this->setUpTurma();
        $r = $this->makeRedator(habilitado: true, reufValidUntil: '2030-01-01');

        $this->postJson("/api/turmas/{$this->turma->id}/redatores/{$r->id}")
            ->assertOk()
            ->assertJsonPath('redatores.0.id', $r->id);

        $this->assertDatabaseHas('turma_redator', ['turma_id' => $this->turma->id, 'redator_id' => $r->id]);
    }

    public function test_redator_sem_reuf_recusa_422(): void
    {
        $this->actingAsAdmin();
        $this->setUpTurma();
        $r = $this->makeRedator(habilitado: true, reufValidUntil: false);   // false = sem REUF

        $this->postJson("/api/turmas/{$this->turma->id}/redatores/{$r->id}")->assertStatus(422);
        $this->assertDatabaseMissing('turma_redator', ['turma_id' => $this->turma->id, 'redator_id' => $r->id]);
    }

    public function test_redator_reuf_vencido_recusa_422(): void
    {
        $this->actingAsAdmin();
        $this->setUpTurma();
        $r = $this->makeRedator(habilitado: true, reufValidUntil: '2020-01-01');

        $this->postJson("/api/turmas/{$this->turma->id}/redatores/{$r->id}")->assertStatus(422);
    }

    public function test_redator_reuf_validade_nula_passa(): void
    {
        $this->actingAsAdmin();
        $this->setUpTurma();
        $r = $this->makeRedator(habilitado: true, reufValidUntil: null);

        $this->postJson("/api/turmas/{$this->turma->id}/redatores/{$r->id}")->assertOk();
    }

    public function test_redator_nao_habilitado_recusa_422(): void
    {
        $this->actingAsAdmin();
        $this->setUpTurma();
        $r = $this->makeRedator(habilitado: false, reufValidUntil: '2030-01-01');

        $this->postJson("/api/turmas/{$this->turma->id}/redatores/{$r->id}")->assertStatus(422);
    }

    public function test_designacao_idempotente(): void
    {
        $this->actingAsAdmin();
        $this->setUpTurma();
        $r = $this->makeRedator(habilitado: true, reufValidUntil: '2030-01-01');

        $this->postJson("/api/turmas/{$this->turma->id}/redatores/{$r->id}")->assertOk();
        $this->postJson("/api/turmas/{$this->turma->id}/redatores/{$r->id}")->assertOk();

        $this->assertSame(1, $this->turma->redatores()->count());
    }

    public function test_remove_redator_faz_detach(): void
    {
        $this->actingAsAdmin();
        $this->setUpTurma();
        $r = $this->makeRedator(habilitado: true, reufValidUntil: '2030-01-01');
        $this->turma->redatores()->attach($r->id);

        $this->deleteJson("/api/turmas/{$this->turma->id}/redatores/{$r->id}")->assertOk();

        $this->assertDatabaseMissing('turma_redator', ['turma_id' => $this->turma->id, 'redator_id' => $r->id]);
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `docker compose exec -T app php artisan test --filter=TurmaDesignationTest`
Expected: FAIL — rotas `turmas/{turma}/redatores/{redator}` inexistentes (404).

- [ ] **Step 3: Create `DesignateRedatorAction`**

`backend/app/Domains/Operation/Actions/DesignateRedatorAction.php`:

```php
<?php

namespace App\Domains\Operation\Actions;

use App\Domains\Identity\Models\Redator;
use App\Domains\Operation\Models\Turma;
use App\Domains\Operation\Services\RedatorIdoneidadeService;

/**
 * Designa 1 redator à turma após o gate RN-09. Idempotente
 * (syncWithoutDetaching + unique do pivot). Multi-redator = múltiplas chamadas.
 */
class DesignateRedatorAction
{
    public function __construct(private RedatorIdoneidadeService $idoneidade) {}

    public function execute(Turma $turma, Redator $redator): Turma
    {
        $this->idoneidade->assertEligible($redator, $turma->course);
        $turma->redatores()->syncWithoutDetaching([$redator->id]);

        return $turma->load('redatores.user');
    }
}
```

- [ ] **Step 4: Create `RemoveRedatorAction`**

`backend/app/Domains/Operation/Actions/RemoveRedatorAction.php`:

```php
<?php

namespace App\Domains\Operation\Actions;

use App\Domains\Identity\Models\Redator;
use App\Domains\Operation\Models\Turma;

/** Remove a designação de um redator (detach do pivot). */
class RemoveRedatorAction
{
    public function execute(Turma $turma, Redator $redator): Turma
    {
        $turma->redatores()->detach($redator->id);

        return $turma->load('redatores.user');
    }
}
```

- [ ] **Step 5: Add controller methods**

In `backend/app/Domains/Operation/Http/Controllers/TurmaController.php`, add the imports:

```php
use App\Domains\Identity\Models\Redator;
use App\Domains\Operation\Actions\DesignateRedatorAction;
use App\Domains\Operation\Actions\RemoveRedatorAction;
use App\Domains\Operation\Models\Turma;
```

Add these methods after `store()`:

```php
    public function designateRedator(Turma $turma, Redator $redator, DesignateRedatorAction $action): TurmaData
    {
        return TurmaData::fromModel($action->execute($turma, $redator));
    }

    public function removeRedator(Turma $turma, Redator $redator, RemoveRedatorAction $action): TurmaData
    {
        return TurmaData::fromModel($action->execute($turma, $redator));
    }
```

- [ ] **Step 6: Add routes**

In `backend/app/Domains/Operation/routes.php`, add inside the `auth:sanctum` group, after the store route:

```php
    Route::post('turmas/{turma}/redatores/{redator}', [TurmaController::class, 'designateRedator']);
    Route::delete('turmas/{turma}/redatores/{redator}', [TurmaController::class, 'removeRedator']);
```

- [ ] **Step 7: Run test to verify it passes**

Run: `docker compose exec -T app php artisan test --filter=TurmaDesignationTest`
Expected: PASS (7 tests).

- [ ] **Step 8: Pint + commit**

```bash
cd backend && ./vendor/bin/pint app/Domains/Operation tests/Feature/Operation/TurmaDesignationTest.php
cd .. && git add backend/app/Domains/Operation backend/tests/Feature/Operation/TurmaDesignationTest.php
git commit -m "feat(operation): designar/remover redator com gate RN-09 no endpoint (6b)"
```

---

### Task 5: Editar / listar / ver / remover turma

Completa o CRUD: `index`, `show`, `update` (só campos básicos — nunca status/quote/course), `destroy` (soft delete).

**Files:**
- Create: `backend/app/Domains/Operation/Actions/UpdateTurmaAction.php`
- Create: `backend/app/Domains/Operation/Actions/DeleteTurmaAction.php`
- Modify: `backend/app/Domains/Operation/Http/Controllers/TurmaController.php` (add `index`, `show`, `update`, `destroy`)
- Modify: `backend/app/Domains/Operation/routes.php` (add 4 rotas)
- Test: `backend/tests/Feature/Operation/TurmaCrudTest.php` (adiciona casos)

**Interfaces:**
- Consumes: `Turma`, `TurmaData`.
- Produces: `UpdateTurmaAction::execute(Turma, TurmaData): Turma`; `DeleteTurmaAction::execute(Turma): void`; `TurmaController@index/@show/@update/@destroy`; rotas GET `turmas`, GET `turmas/{turma}`, PUT `turmas/{turma}`, DELETE `turmas/{turma}`.

- [ ] **Step 1: Write the failing tests**

Append to `backend/tests/Feature/Operation/TurmaCrudTest.php` (dentro da classe, antes do `}` final):

```php
    public function test_lista_turmas(): void
    {
        $this->actingAsAdmin();
        $quote = $this->makeQuote('approved');
        $this->postJson("/api/quotes/{$quote->id}/turma", $this->payload())->assertCreated();

        $this->getJson('/api/turmas')->assertOk()->assertJsonCount(1);
    }

    public function test_mostra_turma(): void
    {
        $this->actingAsAdmin();
        $quote = $this->makeQuote('approved');
        $id = $this->postJson("/api/quotes/{$quote->id}/turma", $this->payload())->json('id');

        $this->getJson("/api/turmas/{$id}")->assertOk()->assertJsonPath('id', $id);
    }

    public function test_edita_campos_basicos_da_turma(): void
    {
        $this->actingAsAdmin();
        $quote = $this->makeQuote('approved');
        $id = $this->postJson("/api/quotes/{$quote->id}/turma", $this->payload())->json('id');

        $this->putJson("/api/turmas/{$id}", $this->payload([
            'modalidade' => 'online', 'local_aplicacao' => null, 'end_date' => '2026-08-15',
        ]))->assertOk()
            ->assertJsonPath('modalidade', 'online')
            ->assertJsonPath('end_date', '2026-08-15')
            ->assertJsonPath('status', 'em_andamento');   // update não mexe no status
    }

    public function test_remove_turma_soft_delete(): void
    {
        $this->actingAsAdmin();
        $quote = $this->makeQuote('approved');
        $id = $this->postJson("/api/quotes/{$quote->id}/turma", $this->payload())->json('id');

        $this->deleteJson("/api/turmas/{$id}")->assertNoContent();
        $this->assertSoftDeleted('turmas', ['id' => $id]);
    }
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `docker compose exec -T app php artisan test --filter=TurmaCrudTest`
Expected: os 4 novos casos FALHAM (404 nas rotas index/show/update/destroy).

- [ ] **Step 3: Create `UpdateTurmaAction`**

`backend/app/Domains/Operation/Actions/UpdateTurmaAction.php`:

```php
<?php

namespace App\Domains\Operation\Actions;

use App\Domains\Operation\Data\TurmaData;
use App\Domains\Operation\Models\Turma;

/**
 * Edita só os campos configuráveis da turma (modalidade, local, datas). Nunca
 * toca status (6d), quote_id nem course_id (imutáveis pós-criação).
 */
class UpdateTurmaAction
{
    public function execute(Turma $turma, TurmaData $data): Turma
    {
        $turma->update([
            'modalidade' => $data->modalidade,
            'local_aplicacao' => $data->local_aplicacao,
            'start_date' => $data->start_date,
            'end_date' => $data->end_date,
        ]);

        return $turma->load('redatores.user');
    }
}
```

- [ ] **Step 4: Create `DeleteTurmaAction`**

`backend/app/Domains/Operation/Actions/DeleteTurmaAction.php`:

```php
<?php

namespace App\Domains\Operation\Actions;

use App\Domains\Operation\Models\Turma;

/**
 * Soft delete da turma. Home para futuras guardas do 6d (blindagem pós-conclusão
 * RN-15) — hoje sem gate: financeiro nunca bloqueia (lei §7).
 */
class DeleteTurmaAction
{
    public function execute(Turma $turma): void
    {
        $turma->delete();
    }
}
```

- [ ] **Step 5: Add controller methods**

In `backend/app/Domains/Operation/Http/Controllers/TurmaController.php`, add the imports:

```php
use App\Domains\Operation\Actions\DeleteTurmaAction;
use App\Domains\Operation\Actions\UpdateTurmaAction;
use Illuminate\Http\Response;
```

Add these methods (after `store()`, before the designation methods):

```php
    /** @return array<TurmaData> */
    public function index(): array
    {
        return Turma::with('redatores.user')->get()
            ->map(fn (Turma $t) => TurmaData::fromModel($t))
            ->all();
    }

    public function show(Turma $turma): TurmaData
    {
        return TurmaData::fromModel($turma->load('redatores.user'));
    }

    public function update(TurmaData $data, Turma $turma, UpdateTurmaAction $action): TurmaData
    {
        return TurmaData::fromModel($action->execute($turma, $data));
    }

    public function destroy(Turma $turma, DeleteTurmaAction $action): Response
    {
        $action->execute($turma);

        return response()->noContent();
    }
```

- [ ] **Step 6: Add routes**

In `backend/app/Domains/Operation/routes.php`, add inside the `auth:sanctum` group (before the store route, keeping index/show first is fine):

```php
    Route::get('turmas', [TurmaController::class, 'index']);
    Route::get('turmas/{turma}', [TurmaController::class, 'show']);
    Route::put('turmas/{turma}', [TurmaController::class, 'update']);
    Route::delete('turmas/{turma}', [TurmaController::class, 'destroy']);
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `docker compose exec -T app php artisan test --filter=TurmaCrudTest`
Expected: PASS (10 tests — 6 originais + 4 novos).

- [ ] **Step 8: Pint + commit**

```bash
cd backend && ./vendor/bin/pint app/Domains/Operation tests/Feature/Operation/TurmaCrudTest.php
cd .. && git add backend/app/Domains/Operation backend/tests/Feature/Operation/TurmaCrudTest.php
git commit -m "feat(operation): index/show/update/destroy de turma (6b)"
```

---

### Task 6: Registrar pendência + prova contra MySQL (DoD do bloco)

Fecha o bloco: registra a divergência do der-fisico em `pendencias.md` (decisão João) e **prova o comportamento contra MySQL** — sqlite mascara constraint de FK/DDL (lição #15 do 6a).

**Files:**
- Modify: `docs/pendencias.md`
- (sem código novo)

- [ ] **Step 1: Registrar a divergência em `pendencias.md`**

Abra `docs/pendencias.md` e adicione uma pendência nova (siga o formato das existentes no arquivo). Conteúdo:

- **Título:** `der-fisico: turmas.redator_id (FK) → pivot turma_redator (N:N)`
- **Origem:** Bloco 6b (2026-07-21), decisão do João.
- **Descrição:** o `der-fisico.md` modela `turmas.redator_id` como FK simples (1 redator) e a relação `redatores 1:N → turmas`. O bloco 6b implementou **N:N** via pivot `turma_redator` (cobre a premissa "ocasionalmente mais de 1 redator"). Além disso `turmas` ainda está listada na seção "PLANEJADAS" do der-fisico e precisa migrar para a seção de implementadas, com colunas reais e nomes finais em inglês.
- **Ação:** atualizar `der-fisico.md` (linha de `turmas` + relação de `redatores`) numa doc-sync futura (`/auditar-docs` ao fechar a Sprint 3).

- [ ] **Step 2: Commit da pendência**

```bash
git add docs/pendencias.md
git commit -m "docs(pendencias): registra divergência turmas N:N vs der-fisico (6b)"
```

- [ ] **Step 3: Suíte completa verde em sqlite**

Run: `docker compose exec -T app php artisan test`
Expected: PASS — toda a suíte, incluindo os 4 arquivos novos de `Operation`.

- [ ] **Step 4: Provar que a migration aplica em MySQL 8**

O container roda MySQL (`.env`: `DB_CONNECTION=mysql`, db `lotus`). Prova o DDL (enum, `RESTRICT`, `unique`) contra InnoDB — é o que a lição #15 mostrou que só o MySQL real pega:

Run: `docker compose exec -T app php artisan migrate:fresh --seed`
Expected: migra sem erro (as duas tabelas `turmas`/`turma_redator` criadas no InnoDB) e re-semeia. Se o `RESTRICT`/enum fosse inválido, falharia aqui.

- [ ] **Step 5: Provar as constraints de runtime contra MySQL**

Roda os testes do bloco apontados para um banco MySQL de teso (sqlite não enforça o `unique` 1:1 e o `RESTRICT` do mesmo jeito). Cria o banco e roda com override de env (o `phpunit.xml` fixa sqlite com `force` off, então a env real vence):

```bash
docker compose exec -T mysql mysql -uroot -psecret -e "CREATE DATABASE IF NOT EXISTS lotus_test"
docker compose exec -T -e DB_CONNECTION=mysql -e DB_DATABASE=lotus_test app php artisan test --filter=Operation
```

Expected: PASS — os 4 arquivos de `Operation` verdes contra MySQL. Em especial, `test_quote_que_ja_tem_turma_recusa_422` e o pivot `unique` provam a integridade real.

> Se o override de env não pegar (suíte rodar em sqlite mesmo), rode o e2e via curl do gate (`fechar-sprint` §0) contra a API real em MySQL como prova alternativa: criar cotação aprovada → POST turma → designar redator sem REUF (422) → designar redator idôneo (200). Lembre `-H 'Origin: <FRONTEND_URL>' -H 'Accept: application/json'`.

- [ ] **Step 6: Reset do banco de dev**

Run: `docker compose exec -T app php artisan migrate:fresh --seed`
Expected: banco `lotus` de volta ao estado semeado limpo (o `migrate:fresh` do Step 4 já rodou; este garante estado consistente após os experimentos).

---

## Self-Review

**Spec coverage:**
- §1 Fronteira (dentro): schema `turmas`+pivot (T1), `Turma` model (T1), enums (T1), criar turma de cotação aprovada (T3), designar/remover com RN-09 (T4), REST + `TurmaData` tipado (T3/T5), prova MySQL (T6). ✅ Tudo coberto.
- §1 Fronteira (fora): import/matrícula, manual Blade, transições habilitada/concluída, telas — nenhuma task os toca. ✅
- §2 Decisões D1–D5: D1 passo manual (T3, POST explícito), D2 designação separada + `redator_id` nullable→pivot (T4), D3 gate=REUF+habilitação (T2), D4 valid_until nulo vale (T2 `test_reuf_com_validade_nula`), D5 N:N pivot (T1). ✅
- §3 Schema, §4 Domínio, §5 Serviço, §6 Actions, §7 HTTP: mapeados em T1/T2/T3/T4/T5. ✅
- §8 DoD (13 provas): criação (T3: 1-6), designação REUF/habilitação/idempotência/remove (T4: 1-7), soft-delete+RESTRICT (T1 pivot + T5 destroy + T6 migrate MySQL). ✅
- §9 Divergência der-fisico → `pendencias.md` (T6). ✅

**Placeholder scan:** nenhum "TBD/TODO"; todo passo com código completo ou comando exato. ✅

**Type consistency:** `TurmaData`/`TurmaRedatorData` definidos em T3 e reusados em T4/T5 com mesma assinatura; `RedatorIdoneidadeService::assertEligible` (T2) consumido por `DesignateRedatorAction` (T4); `CreateTurmaAction::execute(Quote, TurmaData)` (T3) casado com o controller. `Turma::redatores()`/`course()`/`quote()` (T1) usados consistentemente. ✅
