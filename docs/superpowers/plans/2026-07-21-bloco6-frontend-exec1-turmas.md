# Bloco 6-frontend · Execução 1 — Turmas (hub + detalhe + Configuración + Redactor) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar a 1ª fatia do módulo Operação-frontend — o hub `/operacion` (fila de cotações aprobadas pendentes + tabela de turmas enriquecida) e a página de detalhe não-modal `/operacion/turmas/:id` com as abas **Configuración** (view/edit/create) e **Redactor** (picker idôneo client-side).

**Architecture:** Backend ganha um `TurmaQueryBuilder` (1º QueryBuilder do projeto — custom Eloquent Builder, não Repository) que enriquece `TurmaData` com nome de curso/cliente, contagem de alunos e os códigos de orçamento/cotação por relacionamento; e um endpoint de "pendentes de configuração". Frontend é uma feature greenfield `operation`, espelhando o molde `commercial` (hub `ModulePage`+tabela; página de detalhe estilo `BudgetDetailPage`); server-state em TanStack Query, idoneidade de redator calculada 100% no front.

**Tech Stack:** Laravel 13 / PHP 8.3 (spatie/laravel-data, custom Eloquent Builder) · React 19 + TS (Vite) · TanStack Query · PrimeReact via `shared/ui` · Tailwind v4 (layout) · i18next (pt-BR/es-CL/en).

## Global Constraints

- **`generated.ts` NÃO se edita à mão** — corrige-se o DTO e roda `php artisan typescript:transform` (lei §5.3, ADR-04). Task que regenera ajusta consumidores no mesmo commit.
- **DDD-lite, SEM Repository sobre Eloquent** (ADR-02). O `TurmaQueryBuilder` é custom Eloquent Builder Laravel-nativo.
- **Auth = cookie Sanctum + CSRF**; erros sobem ao handler global RFC 7807 — nunca `abort()` (lei §4).
- **Features não importam PrimeReact direto** (só via `shared/ui`) **nem outra feature** — nem para tipo. Dado cross-feature vem da camada `shared/api` (`redatoresApi`/`coursesApi` já existem read-only) (ADR-05).
- **Campo de saída no DTO bidirecional é `Optional`** — senão o `from()` (entrada) passa a exigi-lo no request. Todos os campos enriquecidos entram `|Optional` com default `new Optional()`.
- **Backend roda no container** `app`: `docker compose exec -T app php artisan …`. Suíte = sqlite `:memory:`; **o gate de fechamento prova contra MySQL** (lição #15).
- **Frontend não tem test runner** — DoD de task de front = `pnpm build` (tsc -b) + `pnpm lint` verdes **e comportamento provado na UI** contra o backend real (lei §8). Rodar de `frontend/`.
- **Pint com escopo cirúrgico:** `./vendor/bin/pint <arquivos>` só nos arquivos tocados (lição #9). `git add` só os caminhos da task.
- **i18n:** 3 locales com chaves **idênticas**; `es-CL` é a referência de rótulo (cliente chileno).
- **Vocabulário do backend:** `redator`/`turma` (não "writer"/"class"). Rota em espanhol (`/operacion`), rótulo é UI.

---

## Task 1: `TurmaQueryBuilder` — projeção de listagem (eager + count)

**Files:**
- Create: `backend/app/Domains/Operation/QueryBuilders/TurmaQueryBuilder.php`
- Modify: `backend/app/Domains/Operation/Models/Turma.php` (add `newEloquentBuilder`)
- Modify: `backend/app/Domains/Operation/Http/Controllers/TurmaController.php:42-47` (`index` usa o builder)
- Test: `backend/tests/Feature/Operation/TurmaQueryBuilderTest.php`

**Interfaces:**
- Produces: `TurmaQueryBuilder::withListingData(): static` — eager-load `redatores.user`, `course`, `quote.budget.client` + `withCount('enrollments')` (atributo `enrollments_count`). `Turma::query()` retorna esta classe.

- [ ] **Step 1: Write the failing test**

```php
<?php

namespace Tests\Feature\Operation;

use App\Domains\Catalog\Models\Course;
use App\Domains\Commercial\Models\Budget;
use App\Domains\Commercial\Models\Quote;
use App\Domains\Identity\Models\User;
use App\Domains\Operation\Models\Enrollment;
use App\Domains\Operation\Models\Turma;
use App\Domains\Operation\QueryBuilders\TurmaQueryBuilder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TurmaQueryBuilderTest extends TestCase
{
    use RefreshDatabase;

    public function test_with_listing_data_carrega_relacoes_e_conta_matriculas(): void
    {
        $clientId = User::factory()->create(['type' => 'cliente', 'is_active' => false])
            ->client()->create(['legal_name' => 'ACME', 'type' => 'client'])->id;
        $budget = Budget::create(['client_id' => $clientId, 'code' => 'Scap 1']);
        $courseId = Course::create(['name' => 'AT 220kV', 'workload_hours' => 8])->id;
        $quote = Quote::create([
            'budget_id' => $budget->id, 'course_id' => $courseId, 'seq_in_budget' => 1,
            'student_count' => 5, 'value_uf' => 10, 'status' => 'approved',
        ]);
        $turma = Turma::create([
            'quote_id' => $quote->id, 'course_id' => $courseId,
            'modalidade' => 'presencial', 'local_aplicacao' => 'Santiago',
            'start_date' => '2026-08-01', 'end_date' => '2026-08-10', 'status' => 'em_andamento',
        ]);
        $studentId = User::factory()->create(['type' => 'aluno', 'is_active' => false])
            ->student()->create()->id;
        Enrollment::create(['turma_id' => $turma->id, 'student_id' => $studentId, 'approval_status' => 'pendiente']);

        $this->assertInstanceOf(TurmaQueryBuilder::class, Turma::query());

        $loaded = Turma::query()->withListingData()->findOrFail($turma->id);

        $this->assertTrue($loaded->relationLoaded('course'));
        $this->assertTrue($loaded->relationLoaded('quote'));
        $this->assertSame('AT 220kV', $loaded->course->name);
        $this->assertSame('ACME', $loaded->quote->budget->client->legal_name);
        $this->assertSame(1, (int) $loaded->enrollments_count);
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `docker compose exec -T app php artisan test --filter=TurmaQueryBuilderTest`
Expected: FAIL — `Error: Call to undefined method …::withListingData()` (ou `assertInstanceOf` falha: `Turma::query()` ainda é o Builder base).

- [ ] **Step 3: Create the QueryBuilder**

`backend/app/Domains/Operation/QueryBuilders/TurmaQueryBuilder.php`:

```php
<?php

namespace App\Domains\Operation\QueryBuilders;

use Illuminate\Database\Eloquent\Builder;

/**
 * QueryBuilder da Turma. Concentra a projeção de listagem/detalhe: eager-load das
 * relações que o TurmaData achata (curso, cotação→orçamento→cliente, redatores) e
 * a contagem de matrículas ativas — evita N+1 no hub. Custom Eloquent Builder
 * (não Repository — ADR-02).
 */
class TurmaQueryBuilder extends Builder
{
    public function withListingData(): static
    {
        return $this
            ->with(['redatores.user', 'course', 'quote.budget.client'])
            ->withCount('enrollments');
    }
}
```

- [ ] **Step 4: Wire the builder into the model**

Modify `backend/app/Domains/Operation/Models/Turma.php` — add the import near the other `use` statements and the override method (após `assertAcademicallyWritable()`):

Import (junto aos demais `use` no topo):
```php
use App\Domains\Operation\QueryBuilders\TurmaQueryBuilder;
use Illuminate\Database\Query\Builder as QueryBuilder;
```

Método (dentro da classe, ao final):
```php
    /** @param  QueryBuilder  $query */
    public function newEloquentBuilder($query): TurmaQueryBuilder
    {
        return new TurmaQueryBuilder($query);
    }
```

- [ ] **Step 5: Use the builder in `index`**

Modify `backend/app/Domains/Operation/Http/Controllers/TurmaController.php` — troca o corpo de `index()`:

```php
    /** @return array<TurmaData> */
    public function index(): array
    {
        return Turma::query()->withListingData()->latest()->get()
            ->map(fn (Turma $t) => TurmaData::fromModel($t))
            ->all();
    }
```

- [ ] **Step 6: Run test to verify it passes**

Run: `docker compose exec -T app php artisan test --filter=TurmaQueryBuilderTest`
Expected: PASS.

- [ ] **Step 7: Pint + commit**

```bash
cd backend && ./vendor/bin/pint app/Domains/Operation/QueryBuilders/TurmaQueryBuilder.php app/Domains/Operation/Models/Turma.php app/Domains/Operation/Http/Controllers/TurmaController.php tests/Feature/Operation/TurmaQueryBuilderTest.php
git add app/Domains/Operation/QueryBuilders/TurmaQueryBuilder.php app/Domains/Operation/Models/Turma.php app/Domains/Operation/Http/Controllers/TurmaController.php tests/Feature/Operation/TurmaQueryBuilderTest.php
git commit -m "feat(operation): TurmaQueryBuilder com projeção de listagem (eager+count)"
```

---

## Task 2: Enriquecer `TurmaData` (curso/cliente/alunos/códigos) + regen

**Files:**
- Modify: `backend/app/Domains/Operation/Data/TurmaData.php`
- Modify (gerado): `frontend/src/shared/types/generated.ts`
- Test: `backend/tests/Feature/Operation/TurmaDataEnrichmentTest.php`

**Interfaces:**
- Produces: `TurmaData` ganha campos de SAÍDA (todos `|Optional`): `course_name`, `client_name`, `enrolled_count`, `quote_code`, `budget_code`, `budget_id`. Consumidos pelo front (hub + detalhe).

- [ ] **Step 1: Write the failing test**

```php
<?php

namespace Tests\Feature\Operation;

use App\Domains\Catalog\Models\Course;
use App\Domains\Commercial\Models\Budget;
use App\Domains\Commercial\Models\Quote;
use App\Domains\Identity\Models\User;
use App\Domains\Operation\Data\TurmaData;
use App\Domains\Operation\Models\Enrollment;
use App\Domains\Operation\Models\Turma;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TurmaDataEnrichmentTest extends TestCase
{
    use RefreshDatabase;

    public function test_from_model_projeta_curso_cliente_codigos_e_contagem(): void
    {
        $clientId = User::factory()->create(['type' => 'cliente', 'is_active' => false])
            ->client()->create(['legal_name' => 'Subestación Norte S.A.', 'type' => 'client'])->id;
        $budget = Budget::create(['client_id' => $clientId, 'code' => 'Scap 7']);
        $courseId = Course::create(['name' => 'Trabajos en líneas 220kV', 'workload_hours' => 24])->id;
        $quote = Quote::create([
            'budget_id' => $budget->id, 'course_id' => $courseId, 'seq_in_budget' => 1,
            'student_count' => 12, 'value_uf' => 30, 'status' => 'approved',
        ]);
        $turma = Turma::create([
            'quote_id' => $quote->id, 'course_id' => $courseId,
            'modalidade' => 'presencial', 'local_aplicacao' => 'Santiago',
            'start_date' => '2026-08-01', 'end_date' => '2026-08-10', 'status' => 'em_andamento',
        ]);
        $studentId = User::factory()->create(['type' => 'aluno', 'is_active' => false])
            ->student()->create()->id;
        Enrollment::create(['turma_id' => $turma->id, 'student_id' => $studentId, 'approval_status' => 'pendiente']);

        $data = TurmaData::fromModel(Turma::query()->withListingData()->findOrFail($turma->id));

        $this->assertSame('Trabajos en líneas 220kV', $data->course_name);
        $this->assertSame('Subestación Norte S.A.', $data->client_name);
        $this->assertSame(1, $data->enrolled_count);
        $this->assertSame($budget->id, $data->budget_id);
        $this->assertSame('Scap 7', $data->budget_code);
        $this->assertSame($quote->code, $data->quote_code);
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `docker compose exec -T app php artisan test --filter=TurmaDataEnrichmentTest`
Expected: FAIL — `Property course_name does not exist` (o construtor ainda não tem os campos).

- [ ] **Step 3: Add the output fields to `TurmaData`**

Modify `backend/app/Domains/Operation/Data/TurmaData.php`. No construtor, após `redatores`, adicione os campos enriquecidos:

```php
        /** @var TurmaRedatorData[] */
        public array|Optional $redatores = [],
        public string|Optional $course_name = new Optional(),
        public string|Optional $client_name = new Optional(),
        public int|Optional $enrolled_count = new Optional(),
        public string|null|Optional $quote_code = new Optional(),
        public string|null|Optional $budget_code = new Optional(),
        public int|null|Optional $budget_id = new Optional(),
```

E no `fromModel`, após `redatores: …`, popule (o `?? …count()` cobre os caminhos que não passam pelo `withListingData`, ex. `show`/`store` — lazy load é permitido, sem `preventLazyLoading`):

```php
            redatores: $turma->redatores->map(fn (Redator $r) => TurmaRedatorData::fromModel($r))->all(),
            course_name: $turma->course->name,
            client_name: $turma->quote->budget->client->legal_name,
            enrolled_count: $turma->enrollments_count ?? $turma->enrollments()->count(),
            quote_code: $turma->quote->code,
            budget_code: $turma->quote->budget->code,
            budget_id: $turma->quote->budget->id,
```

- [ ] **Step 4: Run the enrichment test**

Run: `docker compose exec -T app php artisan test --filter=TurmaDataEnrichmentTest`
Expected: PASS.

- [ ] **Step 5: Run the full Operation suite (regressão dos consumidores de TurmaData)**

Run: `docker compose exec -T app php artisan test --filter=Operation`
Expected: PASS. Os novos campos são chaves adicionais no JSON — assertions `assertJson`/`assertJsonPath` passam. Se algum teste usar `assertExactJson` sobre `TurmaData` e falhar, troque por `assertJson`/`assertJsonFragment` (o campo novo é legítimo, não regressão).

- [ ] **Step 6: Regenerate types**

Run: `docker compose exec -T app php artisan typescript:transform`
Then verify: `grep -n "course_name\|client_name\|enrolled_count\|quote_code\|budget_code" frontend/src/shared/types/generated.ts`
Expected: os 5 campos aparecem no `export type TurmaData`.

- [ ] **Step 7: Pint + commit (backend + gerado juntos — lição #11)**

```bash
cd backend && ./vendor/bin/pint app/Domains/Operation/Data/TurmaData.php tests/Feature/Operation/TurmaDataEnrichmentTest.php
git add app/Domains/Operation/Data/TurmaData.php tests/Feature/Operation/TurmaDataEnrichmentTest.php ../frontend/src/shared/types/generated.ts
git commit -m "feat(operation): TurmaData com curso/cliente/alunos e códigos por relacionamento"
```

---

## Task 3: Endpoint "pendentes de configuração" (`PendingQuoteData`)

**Files:**
- Create: `backend/app/Domains/Operation/Data/PendingQuoteData.php`
- Modify: `backend/app/Domains/Operation/Http/Controllers/TurmaController.php` (add `pending()` + middleware)
- Modify: `backend/app/Domains/Operation/routes.php` (add rota ANTES de `turmas/{turma}`)
- Modify (gerado): `frontend/src/shared/types/generated.ts`
- Test: `backend/tests/Feature/Operation/PendingQuotesTest.php`

**Interfaces:**
- Consumes: `TurmaData`/`TurmaQueryBuilder` de tasks anteriores (não diretamente; usa `Quote`).
- Produces: `GET /api/turmas/pendientes-configuracion` (gate `operation.turma.create`) → `array<PendingQuoteData>` (`quote_id`, `quote_code`, `budget_code`, `client_name`, `course_name`, `student_count`).

- [ ] **Step 1: Write the failing test**

```php
<?php

namespace Tests\Feature\Operation;

use App\Domains\Catalog\Models\Course;
use App\Domains\Commercial\Models\Budget;
use App\Domains\Commercial\Models\Quote;
use App\Domains\Identity\Models\User;
use App\Domains\Operation\Models\Turma;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class PendingQuotesTest extends TestCase
{
    use RefreshDatabase;

    private function actingAdmin(): User
    {
        Permission::findOrCreate('operation.turma.create', 'web');
        $user = User::factory()->create(['type' => 'admin', 'is_active' => true]);
        $user->givePermissionTo('operation.turma.create');

        return $user;
    }

    private function approvedQuote(string $client, string $course, int $students): Quote
    {
        $clientId = User::factory()->create(['type' => 'cliente', 'is_active' => false])
            ->client()->create(['legal_name' => $client, 'type' => 'client'])->id;
        $budget = Budget::create(['client_id' => $clientId, 'code' => 'Scap '.fake()->unique()->numberBetween(1, 9999)]);
        $courseId = Course::create(['name' => $course, 'workload_hours' => 8])->id;

        return Quote::create([
            'budget_id' => $budget->id, 'course_id' => $courseId, 'seq_in_budget' => 1,
            'student_count' => $students, 'value_uf' => 10, 'status' => 'approved',
        ]);
    }

    public function test_lista_cotacoes_aprovadas_sem_turma(): void
    {
        $pending = $this->approvedQuote('Transelec', 'Mantenimiento', 8);

        // Cotação aprovada COM turma → não aparece.
        $withTurma = $this->approvedQuote('Enel', 'Seguridad AT', 15);
        Turma::create([
            'quote_id' => $withTurma->id, 'course_id' => $withTurma->course_id,
            'modalidade' => 'online', 'local_aplicacao' => null,
            'start_date' => '2026-08-01', 'end_date' => '2026-08-10', 'status' => 'em_andamento',
        ]);

        $res = $this->actingAs($this->actingAdmin())
            ->getJson('/api/turmas/pendientes-configuracion');

        $res->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.quote_id', $pending->id)
            ->assertJsonPath('0.client_name', 'Transelec')
            ->assertJsonPath('0.course_name', 'Mantenimiento')
            ->assertJsonPath('0.student_count', 8);
    }

    public function test_sem_permissao_recebe_403(): void
    {
        $user = User::factory()->create(['type' => 'admin', 'is_active' => true]);

        $this->actingAs($user)->getJson('/api/turmas/pendientes-configuracion')->assertForbidden();
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `docker compose exec -T app php artisan test --filter=PendingQuotesTest`
Expected: FAIL — rota `turmas/pendientes-configuracion` cai no `show(Turma)` (model binding tenta resolver "pendientes-configuracion" como id) → 404, não a lista.

- [ ] **Step 3: Create `PendingQuoteData`**

`backend/app/Domains/Operation/Data/PendingQuoteData.php`:

```php
<?php

namespace App\Domains\Operation\Data;

use App\Domains\Commercial\Models\Quote;
use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * Cotação aprovada ainda SEM turma — a fila "pendentes de configuração" do hub.
 * Saída pura (achata cliente/curso/orçamento por relacionamento).
 */
#[TypeScript]
class PendingQuoteData extends Data
{
    public function __construct(
        public int $quote_id,
        public ?string $quote_code,
        public ?string $budget_code,
        public string $client_name,
        public string $course_name,
        public int $student_count,
    ) {}

    public static function fromModel(Quote $quote): self
    {
        return new self(
            quote_id: $quote->id,
            quote_code: $quote->code,
            budget_code: $quote->budget->code,
            client_name: $quote->budget->client->legal_name,
            course_name: $quote->course->name,
            student_count: $quote->student_count,
        );
    }
}
```

- [ ] **Step 4: Add `pending()` to the controller + middleware**

Modify `backend/app/Domains/Operation/Http/Controllers/TurmaController.php`:

Imports (junto aos demais `use`):
```php
use App\Domains\Commercial\Enums\QuoteStatus;
use App\Domains\Operation\Data\PendingQuoteData;
```

Na `middleware()`, inclua `pending` no gate de `create`:
```php
            new Middleware('permission:operation.turma.create', only: ['store', 'pending']),
```

Método novo (após `index()`):
```php
    /** @return array<PendingQuoteData> */
    public function pending(): array
    {
        return Quote::query()
            ->where('status', QuoteStatus::Approved)
            ->whereDoesntHave('turma')
            ->with(['budget.client', 'course'])
            ->latest()
            ->get()
            ->map(fn (Quote $q) => PendingQuoteData::fromModel($q))
            ->all();
    }
```

> Verifique o nome do enum: `grep -rn "enum QuoteStatus" backend/app/Domains/Commercial/Enums/QuoteStatus.php` e confirme o case `Approved = 'approved'`. Se o projeto não tiver o enum e usar string, troque `QuoteStatus::Approved` por `'approved'`.

- [ ] **Step 5: Add the route BEFORE `turmas/{turma}`**

Modify `backend/app/Domains/Operation/routes.php` — insira a linha logo após `Route::get('turmas', …)` e ANTES de `Route::get('turmas/{turma}', …)` (senão o wildcard captura o path):

```php
    Route::get('turmas/pendientes-configuracion', [TurmaController::class, 'pending']);
```

- [ ] **Step 6: Run test to verify it passes**

Run: `docker compose exec -T app php artisan test --filter=PendingQuotesTest`
Expected: PASS (ambos os métodos).

- [ ] **Step 7: Regenerate types + commit**

```bash
docker compose exec -T app php artisan typescript:transform
grep -n "PendingQuoteData" frontend/src/shared/types/generated.ts   # deve existir
cd backend && ./vendor/bin/pint app/Domains/Operation/Data/PendingQuoteData.php app/Domains/Operation/Http/Controllers/TurmaController.php app/Domains/Operation/routes.php tests/Feature/Operation/PendingQuotesTest.php
git add app/Domains/Operation/Data/PendingQuoteData.php app/Domains/Operation/Http/Controllers/TurmaController.php app/Domains/Operation/routes.php tests/Feature/Operation/PendingQuotesTest.php ../frontend/src/shared/types/generated.ts
git commit -m "feat(operation): endpoint pendentes de configuração (cotações aprovadas sem turma)"
```

---

## Task 4: `features/operation/api/useTurmas.ts` — queries + mutations

**Files:**
- Create: `frontend/src/features/operation/api/useTurmas.ts`

**Interfaces:**
- Consumes: `TurmaData`, `PendingQuoteData`, `TurmaModalidade` de `@shared/types/generated`; `api`/`ProblemDetails` de `@shared/api/axios`.
- Produces: `useTurmas()`, `useTurma(id)`, `usePendingQuotes()`, `useCreateTurma()`, `useUpdateTurma()`, `useDesignateRedator()`, `useRemoveRedator()`, tipo `TurmaConfigPayload`, `turmaKeys`.

- [ ] **Step 1: Create the hooks file**

```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@shared/api/axios'
import type { ProblemDetails } from '@shared/api/axios'
import type { PendingQuoteData, TurmaData, TurmaModalidade } from '@shared/types/generated'

export const turmaKeys = {
  all: ['turmas'] as const,
  list: () => ['turmas', 'list'] as const,
  detail: (id: number) => ['turmas', 'detail', id] as const,
  pending: () => ['turmas', 'pending'] as const,
}

/** Campos que a UI escreve na configuração da turma. `course_id`/`quote_id` NÃO
 * entram: o servidor deriva da cotação. `local_aplicacao` é exigido só no presencial. */
export type TurmaConfigPayload = {
  modalidade: TurmaModalidade
  local_aplicacao: string | null
  start_date: string
  end_date: string
}

export function useTurmas() {
  return useQuery<TurmaData[], ProblemDetails>({
    queryKey: turmaKeys.list(),
    queryFn: () => api.get<TurmaData[]>('/api/turmas').then((r) => r.data),
  })
}

export function useTurma(id: number) {
  return useQuery<TurmaData, ProblemDetails>({
    queryKey: turmaKeys.detail(id),
    queryFn: () => api.get<TurmaData>(`/api/turmas/${id}`).then((r) => r.data),
    enabled: Number.isFinite(id),
  })
}

export function usePendingQuotes() {
  return useQuery<PendingQuoteData[], ProblemDetails>({
    queryKey: turmaKeys.pending(),
    queryFn: () => api.get<PendingQuoteData[]>('/api/turmas/pendientes-configuracion').then((r) => r.data),
  })
}

/** Toda mutação de turma repinta a lista, o detalhe e a fila de pendentes
 * (invalidar `all` cobre as três keys, que começam por `['turmas']`). */
function useInvalidate() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: turmaKeys.all })
}

export function useCreateTurma() {
  const invalidate = useInvalidate()
  return useMutation<TurmaData, ProblemDetails, { quoteId: number; payload: TurmaConfigPayload }>({
    mutationFn: ({ quoteId, payload }) =>
      api.post<TurmaData>(`/api/quotes/${quoteId}/turma`, payload).then((r) => r.data),
    onSuccess: invalidate,
  })
}

export function useUpdateTurma() {
  const invalidate = useInvalidate()
  return useMutation<TurmaData, ProblemDetails, { turmaId: number; payload: TurmaConfigPayload }>({
    mutationFn: ({ turmaId, payload }) =>
      api.put<TurmaData>(`/api/turmas/${turmaId}`, payload).then((r) => r.data),
    onSuccess: invalidate,
  })
}

export function useDesignateRedator() {
  const invalidate = useInvalidate()
  return useMutation<TurmaData, ProblemDetails, { turmaId: number; redatorId: number }>({
    mutationFn: ({ turmaId, redatorId }) =>
      api.post<TurmaData>(`/api/turmas/${turmaId}/redatores/${redatorId}`).then((r) => r.data),
    onSuccess: invalidate,
  })
}

export function useRemoveRedator() {
  const invalidate = useInvalidate()
  return useMutation<TurmaData, ProblemDetails, { turmaId: number; redatorId: number }>({
    mutationFn: ({ turmaId, redatorId }) =>
      api.delete<TurmaData>(`/api/turmas/${turmaId}/redatores/${redatorId}`).then((r) => r.data),
    onSuccess: invalidate,
  })
}
```

- [ ] **Step 2: Type-check**

Run: `cd frontend && pnpm build`
Expected: build passa (o arquivo compila; ainda sem consumidores).

- [ ] **Step 3: Commit**

```bash
cd frontend && git add src/features/operation/api/useTurmas.ts
git commit -m "feat(operation): hooks de API de turma (lista/detalhe/pendentes/mutações)"
```

---

## Task 5: `lib/eligibility.ts` + `lib/turmaStatus.ts`

**Files:**
- Create: `frontend/src/features/operation/lib/eligibility.ts`
- Create: `frontend/src/features/operation/lib/turmaStatus.ts`

**Interfaces:**
- Produces: `isEligible(redator: RedatorData, courseId: number): boolean`; `turmaDisplayStatus(t: TurmaData): 'em_andamento' | 'habilitada' | 'concluida'` + `turmaStatusSeverity(s): 'info'|'warning'|'success'`.

- [ ] **Step 1: Create `eligibility.ts`**

```ts
import type { RedatorData } from '@shared/types/generated'

const REUF = 'REUF'

function todayIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** REUF vigente = presente E (`valid_until` nulo OU data >= hoje). Data
 * inparseável conta como VENCIDA (direção conservadora — peso legal). Compara
 * string ISO `YYYY-MM-DD` (ordem lexicográfica = ordem cronológica). */
function hasValidReuf(redator: RedatorData): boolean {
  const today = todayIso()
  return redator.documents.some((doc) => {
    if (doc.type !== REUF) return false
    if (doc.valid_until == null) return true
    const iso = doc.valid_until.slice(0, 10)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false
    return iso >= today
  })
}

/** RN-09 no front: redator habilitado ao curso E com REUF vigente. Mesma regra do
 * `RedatorIdoneidadeService` do backend (que é a fronteira autoritativa — `can()`
 * de UI, ADR-07). */
export function isEligible(redator: RedatorData, courseId: number): boolean {
  return redator.course_ids.includes(courseId) && hasValidReuf(redator)
}
```

- [ ] **Step 2: Create `turmaStatus.ts`**

```ts
import type { TurmaData } from '@shared/types/generated'

export type TurmaDisplayStatus = 'em_andamento' | 'habilitada' | 'concluida'

/** 3 estados de exibição derivados de `status` (2 valores) + `habilitada`
 * (derivado no backend): concluida > habilitada > em_andamento. Chave i18n:
 * `operation.status.<valor>`. */
export function turmaDisplayStatus(turma: TurmaData): TurmaDisplayStatus {
  if (turma.status === 'concluida') return 'concluida'
  if (turma.habilitada) return 'habilitada'
  return 'em_andamento'
}

export function turmaStatusSeverity(status: TurmaDisplayStatus): 'info' | 'warning' | 'success' {
  if (status === 'concluida') return 'success'
  if (status === 'habilitada') return 'warning'
  return 'info'
}
```

- [ ] **Step 3: Type-check + commit**

```bash
cd frontend && pnpm build
git add src/features/operation/lib/eligibility.ts src/features/operation/lib/turmaStatus.ts
git commit -m "feat(operation): libs de idoneidade (client-side) e status de exibição da turma"
```

---

## Task 6: Locale keys `operation.*` (3 locales)

**Files:**
- Modify: `frontend/src/shared/config/locales/es-CL.json`
- Modify: `frontend/src/shared/config/locales/pt-BR.json`
- Modify: `frontend/src/shared/config/locales/en.json`

**Interfaces:**
- Produces: namespace `operation.*` consumido pelas tasks 7–10. Chaves idênticas nos 3 locales.

- [ ] **Step 1: Add the `operation` block to `es-CL.json`** (referência)

Insira como propriedade de topo (irmã de `"nav"`, `"common"`):

```json
  "operation": {
    "title": "Operación",
    "subtitle": "Gestión de turmas y cotizaciones aprobadas",
    "pending": {
      "title": "Cotizaciones aprobadas pendientes de configuración",
      "students": "{{count}} alumnos",
      "configure": "Configurar turma",
      "empty": "No hay cotizaciones pendientes de configuración."
    },
    "table": {
      "code": "Código",
      "course": "Curso",
      "client": "Cliente",
      "modality": "Modalidad",
      "redator": "Redactor",
      "students": "Alumnos",
      "status": "Estado",
      "search": "Buscar por curso, cliente o código…",
      "filterAll": "Todos",
      "count": "{{count}} turmas",
      "empty": "No hay turmas todavía.",
      "noRedator": "— Sin asignar"
    },
    "modality": { "presencial": "Presencial", "online": "Online" },
    "status": { "em_andamento": "En curso", "habilitada": "Habilitada", "concluida": "Concluida" },
    "detail": {
      "back": "Volver a Operación",
      "notFound": "Turma no encontrada.",
      "relatedTo": "Presupuesto {{budget}} · Cotización {{quote}}",
      "tabs": {
        "config": "Configuración",
        "students": "Alumnos",
        "redator": "Redactor",
        "docs": "Documentación",
        "conclusion": "Conclusión"
      },
      "comingSoon": "Disponible en la próxima entrega."
    },
    "config": {
      "title": "Datos de la turma",
      "modality": "Modalidad",
      "local": "Local / Dirección",
      "localPlaceholder": "Dirección donde se aplica (presencial)",
      "startDate": "Fecha de inicio",
      "endDate": "Fecha de término",
      "workload": "Carga horaria (del curso, solo lectura)",
      "workloadValue": "{{hours}} horas",
      "save": "Guardar",
      "cancel": "Cancelar"
    },
    "create": {
      "title": "Configurar turma",
      "subtitle": "Cotización {{quote}} · {{course}}"
    },
    "redator": {
      "title": "Redactor asignado",
      "idoneo": "Idóneo",
      "change": "Cambiar",
      "designate": "Designar redactor",
      "remove": "Quitar",
      "none": "Ningún redactor asignado.",
      "helpNote": "Solo se muestran redactores habilitados para este curso y con documentación vigente (RN-09).",
      "pickerTitle": "Redactores idóneos",
      "pickerEmpty": "No hay redactores idóneos para este curso.",
      "pick": "Designar"
    }
  }
```

- [ ] **Step 2: Add the same block to `pt-BR.json`** (rótulos PT)

```json
  "operation": {
    "title": "Operação",
    "subtitle": "Gestão de turmas e cotações aprovadas",
    "pending": {
      "title": "Cotações aprovadas pendentes de configuração",
      "students": "{{count}} alunos",
      "configure": "Configurar turma",
      "empty": "Nenhuma cotação pendente de configuração."
    },
    "table": {
      "code": "Código",
      "course": "Curso",
      "client": "Cliente",
      "modality": "Modalidade",
      "redator": "Redator",
      "students": "Alunos",
      "status": "Estado",
      "search": "Buscar por curso, cliente ou código…",
      "filterAll": "Todos",
      "count": "{{count}} turmas",
      "empty": "Nenhuma turma ainda.",
      "noRedator": "— Sem designar"
    },
    "modality": { "presencial": "Presencial", "online": "Online" },
    "status": { "em_andamento": "Em curso", "habilitada": "Habilitada", "concluida": "Concluída" },
    "detail": {
      "back": "Voltar para Operação",
      "notFound": "Turma não encontrada.",
      "relatedTo": "Orçamento {{budget}} · Cotação {{quote}}",
      "tabs": {
        "config": "Configuração",
        "students": "Alunos",
        "redator": "Redator",
        "docs": "Documentação",
        "conclusion": "Conclusão"
      },
      "comingSoon": "Disponível na próxima entrega."
    },
    "config": {
      "title": "Dados da turma",
      "modality": "Modalidade",
      "local": "Local / Endereço",
      "localPlaceholder": "Endereço de aplicação (presencial)",
      "startDate": "Data de início",
      "endDate": "Data de término",
      "workload": "Carga horária (do curso, somente leitura)",
      "workloadValue": "{{hours}} horas",
      "save": "Salvar",
      "cancel": "Cancelar"
    },
    "create": {
      "title": "Configurar turma",
      "subtitle": "Cotação {{quote}} · {{course}}"
    },
    "redator": {
      "title": "Redator designado",
      "idoneo": "Idôneo",
      "change": "Trocar",
      "designate": "Designar redator",
      "remove": "Remover",
      "none": "Nenhum redator designado.",
      "helpNote": "Só aparecem redatores habilitados a este curso e com documentação vigente (RN-09).",
      "pickerTitle": "Redatores idôneos",
      "pickerEmpty": "Nenhum redator idôneo para este curso.",
      "pick": "Designar"
    }
  }
```

- [ ] **Step 3: Add the same block to `en.json`** (rótulos EN)

```json
  "operation": {
    "title": "Operations",
    "subtitle": "Manage classes and approved quotes",
    "pending": {
      "title": "Approved quotes pending configuration",
      "students": "{{count}} students",
      "configure": "Configure class",
      "empty": "No quotes pending configuration."
    },
    "table": {
      "code": "Code",
      "course": "Course",
      "client": "Client",
      "modality": "Modality",
      "redator": "Redator",
      "students": "Students",
      "status": "Status",
      "search": "Search by course, client or code…",
      "filterAll": "All",
      "count": "{{count}} classes",
      "empty": "No classes yet.",
      "noRedator": "— Unassigned"
    },
    "modality": { "presencial": "In person", "online": "Online" },
    "status": { "em_andamento": "In progress", "habilitada": "Enabled", "concluida": "Concluded" },
    "detail": {
      "back": "Back to Operations",
      "notFound": "Class not found.",
      "relatedTo": "Budget {{budget}} · Quote {{quote}}",
      "tabs": {
        "config": "Configuration",
        "students": "Students",
        "redator": "Redator",
        "docs": "Documentation",
        "conclusion": "Conclusion"
      },
      "comingSoon": "Available in the next delivery."
    },
    "config": {
      "title": "Class details",
      "modality": "Modality",
      "local": "Venue / Address",
      "localPlaceholder": "Application address (in person)",
      "startDate": "Start date",
      "endDate": "End date",
      "workload": "Workload (from course, read-only)",
      "workloadValue": "{{hours}} hours",
      "save": "Save",
      "cancel": "Cancel"
    },
    "create": {
      "title": "Configure class",
      "subtitle": "Quote {{quote}} · {{course}}"
    },
    "redator": {
      "title": "Assigned redator",
      "idoneo": "Eligible",
      "change": "Change",
      "designate": "Assign redator",
      "remove": "Remove",
      "none": "No redator assigned.",
      "helpNote": "Only redatores enabled for this course with valid documentation are shown (RN-09).",
      "pickerTitle": "Eligible redatores",
      "pickerEmpty": "No eligible redatores for this course.",
      "pick": "Assign"
    }
  }
```

- [ ] **Step 4: Type-check + commit**

```bash
cd frontend && pnpm build
git add src/shared/config/locales/es-CL.json src/shared/config/locales/pt-BR.json src/shared/config/locales/en.json
git commit -m "feat(operation): chaves i18n do módulo Operação (pt/es/en)"
```

---

## Task 7: Hub — `OperationPage` (PendingQuotesPanel + TurmasTable) + rota

**Files:**
- Create: `frontend/src/features/operation/components/OperationPage.tsx`
- Create: `frontend/src/features/operation/components/Turma/PendingQuotesPanel.tsx`
- Create: `frontend/src/features/operation/components/Turma/TurmasTable.tsx`
- Modify: `frontend/src/app/router/AppRouter.tsx` (rota `/operacion` → `OperationPage`)

**Interfaces:**
- Consumes: `useTurmas`, `usePendingQuotes` (task 4); `turmaDisplayStatus`/`turmaStatusSeverity` (task 5); `usePermissions` (`@shared/hooks`).
- Produces: `OperationPage` na rota `/operacion`.

- [ ] **Step 1: Create `PendingQuotesPanel.tsx`**

```tsx
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { AppButton } from '@shared/ui'
import type { PendingQuoteData } from '@shared/types/generated'

export function PendingQuotesPanel({ items }: { items: PendingQuoteData[] }) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  if (items.length === 0) return null

  return (
    <section className="rounded-lg border border-sky-200 bg-sky-50 dark:border-sky-900 dark:bg-sky-950/30">
      <header className="flex items-center gap-2 p-4">
        <h3 className="font-medium text-sky-800 dark:text-sky-200">{t('operation.pending.title')}</h3>
        <span className="rounded-full bg-sky-600 px-2 text-sm text-white">{items.length}</span>
      </header>
      <ul className="divide-y divide-sky-100 dark:divide-sky-900">
        {items.map((q) => (
          <li key={q.quote_id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <span className="text-sm">
              <i className="pi pi-file mr-2 text-sky-600" aria-hidden="true" />
              <strong>{q.client_name}</strong> · {q.course_name} ·{' '}
              <span className="text-slate-500">{t('operation.pending.students', { count: q.student_count })}</span>
            </span>
            <AppButton
              variant="brandIcon"
              label={t('operation.pending.configure')}
              icon="pi pi-cog"
              onClick={() => navigate(`/operacion/turmas/nueva/${q.quote_id}`)}
            />
          </li>
        ))}
      </ul>
    </section>
  )
}
```

- [ ] **Step 2: Create `TurmasTable.tsx`**

```tsx
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { AppDataTable, AppColumn, AppInputText, AppDropdown, AppButton, AppTag } from '@shared/ui'
import type { TurmaData } from '@shared/types/generated'
import { turmaDisplayStatus, turmaStatusSeverity, type TurmaDisplayStatus } from '../../lib/turmaStatus'

const STATUSES: TurmaDisplayStatus[] = ['em_andamento', 'habilitada', 'concluida']

export function TurmasTable({ turmas, loading }: { turmas: TurmaData[]; loading: boolean }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [filter, setFilter] = useState('')
  const [status, setStatus] = useState<TurmaDisplayStatus | null>(null)

  const rows = turmas.filter((turma) => {
    const matchesStatus = status === null || turmaDisplayStatus(turma) === status
    const term = filter.trim().toLowerCase()
    const matchesTerm =
      term === '' ||
      (turma.course_name ?? '').toLowerCase().includes(term) ||
      (turma.client_name ?? '').toLowerCase().includes(term) ||
      (turma.quote_code ?? '').toLowerCase().includes(term) ||
      (turma.budget_code ?? '').toLowerCase().includes(term)
    return matchesStatus && matchesTerm
  })

  const statusOptions = [
    { label: t('operation.table.filterAll'), value: null },
    ...STATUSES.map((s) => ({ label: t(`operation.status.${s}`), value: s })),
  ]

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        <div className="min-w-64 flex-1">
          <AppInputText
            leftIcon="pi pi-search"
            placeholder={t('operation.table.search')}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
        <div className="w-48">
          <AppDropdown value={status} options={statusOptions} onChange={(e) => setStatus(e.value as TurmaDisplayStatus | null)} />
        </div>
      </div>

      <AppDataTable value={rows} loading={loading} emptyMessage={t('operation.table.empty')}>
        <AppColumn
          header={t('operation.table.code')}
          body={(turma: TurmaData) => <span className="font-mono text-sm text-sky-600">{turma.quote_code ?? '—'}</span>}
        />
        <AppColumn header={t('operation.table.course')} body={(turma: TurmaData) => turma.course_name ?? '—'} />
        <AppColumn header={t('operation.table.client')} body={(turma: TurmaData) => turma.client_name ?? '—'} />
        <AppColumn
          header={t('operation.table.modality')}
          body={(turma: TurmaData) => <AppTag value={t(`operation.modality.${turma.modalidade}`)} />}
        />
        <AppColumn
          header={t('operation.table.redator')}
          body={(turma: TurmaData) =>
            turma.redatores.length > 0 ? turma.redatores.map((r) => r.name).join(', ') : (
              <span className="text-slate-400">{t('operation.table.noRedator')}</span>
            )
          }
        />
        <AppColumn header={t('operation.table.students')} body={(turma: TurmaData) => turma.enrolled_count ?? 0} />
        <AppColumn
          header={t('operation.table.status')}
          body={(turma: TurmaData) => {
            const s = turmaDisplayStatus(turma)
            return <AppTag value={t(`operation.status.${s}`)} severity={turmaStatusSeverity(s)} />
          }}
        />
        <AppColumn
          body={(turma: TurmaData) => (
            <AppButton
              icon="pi pi-eye"
              text
              rounded
              aria-label={t('common.view')}
              onClick={() => navigate(`/operacion/turmas/${turma.id}`)}
            />
          )}
          style={{ width: '4rem' }}
        />
      </AppDataTable>

      <p className="text-sm text-slate-500">{t('operation.table.count', { count: rows.length })}</p>
    </div>
  )
}
```

- [ ] **Step 3: Create `OperationPage.tsx`**

```tsx
import { useTranslation } from 'react-i18next'
import { ModulePage } from '@shared/ui'
import { usePermissions } from '@shared/hooks'
import { useTurmas, usePendingQuotes } from '../api/useTurmas'
import { PendingQuotesPanel } from './Turma/PendingQuotesPanel'
import { TurmasTable } from './Turma/TurmasTable'

export function OperationPage() {
  // `usePendingQuotes` dispara sempre; sem `operation.turma.create` o backend
  // responde 403 e o painel simplesmente não é renderizado (o `can()` é RBAC de
  // UI — a API é a fronteira). Query condicional por permissão quebraria a regra
  // de hooks; guarda-se no render.
  const { t } = useTranslation()
  const { can } = usePermissions()
  const turmas = useTurmas()
  const pending = usePendingQuotes()
  const canCreate = can('operation.turma.create')

  return (
    <ModulePage title={t('operation.title')} description={t('operation.subtitle')}>
      <div className="space-y-6">
        {canCreate && <PendingQuotesPanel items={pending.data ?? []} />}
        <TurmasTable turmas={turmas.data ?? []} loading={turmas.isLoading} />
      </div>
    </ModulePage>
  )
}
```

- [ ] **Step 4: Wire the route**

Modify `frontend/src/app/router/AppRouter.tsx`:
- Add import: `import { OperationPage } from '@features/operation/components/OperationPage'`
- Replace the line `<Route path="/operacion" element={<ModulePlaceholder titleKey="nav.operacion" />} />` with:
```tsx
          <Route path="/operacion" element={<OperationPage />} />
```

- [ ] **Step 5: Type-check + lint**

Run: `cd frontend && pnpm build && pnpm lint`
Expected: verdes.

- [ ] **Step 6: Manual proof (app real)**

Suba o stack (`docker compose up -d`, e `cd frontend && pnpm dev`), logue como superadmin e vá em **Operación**. Verifique: a fila "Cotizaciones aprobadas pendientes" aparece se houver cotação aprovada sem turma; a tabela lista turmas com **código (cotação), curso, cliente, modalidade, redator/Sin asignar, alunos, estado**; busca e filtro funcionam; o olho navega para `/operacion/turmas/:id` (pode 404 na tela até a task 8, mas a URL muda).

- [ ] **Step 7: Commit**

```bash
cd frontend && git add src/features/operation/components/OperationPage.tsx src/features/operation/components/Turma/PendingQuotesPanel.tsx src/features/operation/components/Turma/TurmasTable.tsx src/app/router/AppRouter.tsx
git commit -m "feat(operation): hub /operacion com fila de pendentes e tabela de turmas"
```

---

## Task 8: Página de detalhe — `TurmaDetailPage` (shell + abas)

**Files:**
- Create: `frontend/src/features/operation/hooks/useTurmaDetail.ts`
- Create: `frontend/src/features/operation/components/Turma/TurmaDetailPage.tsx`
- Modify: `frontend/src/app/router/AppRouter.tsx` (rota `/operacion/turmas/:id`)

**Interfaces:**
- Consumes: `useTurma` (task 4); `turmaDisplayStatus`/`turmaStatusSeverity` (task 5).
- Produces: `TurmaDetailPage` na rota `/operacion/turmas/:id`, montando as abas. Config e Redactor entram nas tasks 9–10; Alumnos/Docs/Conclusión são placeholder "próxima entrega".

- [ ] **Step 1: Create `useTurmaDetail.ts`**

```ts
import { useNavigate, useParams } from 'react-router-dom'
import { useTurma } from '../api/useTurmas'

/** Orquestração da página de detalhe da turma. O componente só consome. */
export function useTurmaDetail() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const turmaId = Number(id)
  const query = useTurma(turmaId)

  return {
    turmaId,
    loading: query.isLoading,
    turma: query.data,
    goBack: () => navigate('/operacion'),
    goToBudget: (budgetId: number) => navigate(`/comercial/presupuestos/${budgetId}`),
  }
}
```

- [ ] **Step 2: Create `TurmaDetailPage.tsx`** (shell; Config/Redactor entram nas próximas tasks)

```tsx
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ModuleTabs, ModuleTab, AppTag } from '@shared/ui'
import { useTurmaDetail } from '../../hooks/useTurmaDetail'
import { turmaDisplayStatus, turmaStatusSeverity } from '../../lib/turmaStatus'

export function TurmaDetailPage() {
  const { t } = useTranslation()
  const d = useTurmaDetail()
  const [tab, setTab] = useState(0)

  if (d.loading) return <p className="p-4 text-sm text-slate-500">{t('common.loading')}</p>
  if (!d.turma) return <p className="p-4 text-sm text-slate-500">{t('operation.detail.notFound')}</p>

  const turma = d.turma
  const status = turmaDisplayStatus(turma)

  return (
    <div className="space-y-6">
      <button
        type="button"
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
        onClick={d.goBack}
      >
        <i className="pi pi-arrow-left" aria-hidden="true" />
        {t('operation.detail.back')}
      </button>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">{turma.course_name ?? '—'}</h2>
          <p className="text-sm text-slate-500">{turma.client_name ?? '—'}</p>
          {turma.budget_id != null && (
            <button
              type="button"
              className="mt-1 text-sm text-sky-600 hover:underline"
              onClick={() => d.goToBudget(turma.budget_id!)}
            >
              {t('operation.detail.relatedTo', { budget: turma.budget_code ?? '—', quote: turma.quote_code ?? '—' })}
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <AppTag value={t(`operation.status.${status}`)} severity={turmaStatusSeverity(status)} />
          <AppTag value={t(`operation.modality.${turma.modalidade}`)} />
        </div>
      </header>

      <ModuleTabs activeIndex={tab} onTabChange={(e) => setTab(e.index)}>
        <ModuleTab header={t('operation.detail.tabs.config')}>
          <p className="p-4 text-sm text-slate-500">{t('operation.detail.comingSoon')}</p>
        </ModuleTab>
        <ModuleTab header={t('operation.detail.tabs.students')}>
          <p className="p-4 text-sm text-slate-500">{t('operation.detail.comingSoon')}</p>
        </ModuleTab>
        <ModuleTab header={t('operation.detail.tabs.redator')}>
          <p className="p-4 text-sm text-slate-500">{t('operation.detail.comingSoon')}</p>
        </ModuleTab>
        <ModuleTab header={t('operation.detail.tabs.docs')}>
          <p className="p-4 text-sm text-slate-500">{t('operation.detail.comingSoon')}</p>
        </ModuleTab>
        <ModuleTab header={t('operation.detail.tabs.conclusion')}>
          <p className="p-4 text-sm text-slate-500">{t('operation.detail.comingSoon')}</p>
        </ModuleTab>
      </ModuleTabs>
    </div>
  )
}
```

- [ ] **Step 3: Wire the route**

Modify `frontend/src/app/router/AppRouter.tsx`:
- Add import: `import { TurmaDetailPage } from '@features/operation/components/Turma/TurmaDetailPage'`
- Add route após a de `/operacion`:
```tsx
          <Route path="/operacion/turmas/:id" element={<TurmaDetailPage />} />
```

- [ ] **Step 4: Type-check + lint + manual**

Run: `cd frontend && pnpm build && pnpm lint`
Manual: clicar no olho de uma turma abre a página com título=curso, subtítulo=cliente, linha "Presupuesto … · Cotización …" clicável (leva ao orçamento), tags de estado/modalidade, 5 abas (4 com "próxima entrega").

- [ ] **Step 5: Commit**

```bash
cd frontend && git add src/features/operation/hooks/useTurmaDetail.ts src/features/operation/components/Turma/TurmaDetailPage.tsx src/app/router/AppRouter.tsx
git commit -m "feat(operation): página de detalhe da turma (shell + abas + link ao orçamento)"
```

---

## Task 9: Aba `Configuración` — `TurmaConfigCard` (view/edit/create)

**Files:**
- Create: `frontend/src/features/operation/hooks/useTurmaConfigForm.ts`
- Create: `frontend/src/features/operation/components/Turma/TurmaConfigCard.tsx`
- Create: `frontend/src/features/operation/components/Turma/TurmaCreatePage.tsx`
- Modify: `frontend/src/features/operation/components/Turma/TurmaDetailPage.tsx` (aba Config usa o card)
- Modify: `frontend/src/app/router/AppRouter.tsx` (rota `/operacion/turmas/nueva/:quoteId`)

**Interfaces:**
- Consumes: `useCreateTurma`/`useUpdateTurma`/`TurmaConfigPayload` (task 4); `useEntityForm`/`useMutationErrors` (`@shared/hooks`); `coursesApi` (`@shared/api/coursesApi`); `AppDatePicker`/`AppDropdown`/`AppInputText`/`FormField`/`FormErrorSummary`/`AppButton` (`@shared/ui`); `DialogMode` (`@shared/lib`).
- Produces: `TurmaConfigCard` (montado na aba Config e na página de create).

- [ ] **Step 1: Create `useTurmaConfigForm.ts`**

```ts
import { useEntityForm, useMutationErrors } from '@shared/hooks'
import type { DialogMode } from '@shared/lib'
import type { TurmaData } from '@shared/types/generated'
import { useCreateTurma, useUpdateTurma, type TurmaConfigPayload } from '../api/useTurmas'

const EMPTY: TurmaConfigPayload = {
  modalidade: 'presencial',
  local_aplicacao: '',
  start_date: '',
  end_date: '',
}

function toFields(turma: TurmaData): TurmaConfigPayload {
  return {
    modalidade: turma.modalidade,
    local_aplicacao: turma.local_aplicacao ?? '',
    start_date: turma.start_date,
    end_date: turma.end_date,
  }
}

/** Form da configuração da turma, unificado view/edit/create. Create precisa do
 * `quoteId` (a turma nasce de `POST quotes/{quote}/turma`); edit precisa do
 * `turmaId`. `onSaved` recebe o id resultante para a navegação. */
export function useTurmaConfigForm(params: {
  mode: DialogMode
  turma: TurmaData | null
  quoteId?: number
  onSaved: (turmaId: number) => void
}) {
  const { mode, turma, quoteId, onSaved } = params
  const entity = turma ? ({ id: turma.id, ...toFields(turma) } as TurmaConfigPayload & { id?: number }) : null
  const { form, set, readOnly } = useEntityForm<TurmaConfigPayload & { id?: number }>(
    entity,
    mode,
    { ...EMPTY },
    (e) => structuredClone(e),
  )

  const create = useCreateTurma()
  const update = useUpdateTurma()
  const { fieldErrors, generalError } = useMutationErrors([create.error, update.error])

  const payload = (): TurmaConfigPayload => ({
    modalidade: form.modalidade,
    local_aplicacao: form.local_aplicacao || null,
    start_date: form.start_date,
    end_date: form.end_date,
  })

  const submit = () => {
    if (mode === 'create') {
      if (quoteId == null) return
      create.mutate({ quoteId, payload: payload() }, { onSuccess: (t) => t.id != null && onSaved(t.id) })
    } else if (turma?.id != null) {
      update.mutate({ turmaId: turma.id, payload: payload() }, { onSuccess: (t) => t.id != null && onSaved(t.id) })
    }
  }

  return {
    form,
    set,
    readOnly,
    submit,
    pending: create.isPending || update.isPending,
    fieldErrors,
    generalError,
  }
}
```

- [ ] **Step 2: Create `TurmaConfigCard.tsx`**

```tsx
import { useTranslation } from 'react-i18next'
import { AppButton, AppDropdown, AppInputText, AppDatePicker, FormField, FormErrorSummary } from '@shared/ui'
import type { DialogMode } from '@shared/lib'
import type { TurmaData } from '@shared/types/generated'
import { coursesApi } from '@shared/api/coursesApi'
import { useTurmaConfigForm } from '../../hooks/useTurmaConfigForm'

type Props = {
  mode: DialogMode
  turma?: TurmaData | null
  quoteId?: number
  onSaved: (turmaId: number) => void
  onEdit?: () => void
  onCancel?: () => void
}

const MAPPED = ['modalidade', 'local_aplicacao', 'start_date', 'end_date']

export function TurmaConfigCard({ mode, turma = null, quoteId, onSaved, onEdit, onCancel }: Props) {
  const { t } = useTranslation()
  const f = useTurmaConfigForm({ mode, turma, quoteId, onSaved })
  const courses = coursesApi.useList()
  const course = turma?.course_id != null ? courses.data?.find((c) => c.id === turma.course_id) : undefined

  const modalityOptions = [
    { label: t('operation.modality.presencial'), value: 'presencial' },
    { label: t('operation.modality.online'), value: 'online' },
  ]

  return (
    <div className="space-y-5 p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">{t('operation.config.title')}</h3>
        {mode === 'view' && onEdit && (
          <AppButton label={t('common.edit')} icon="pi pi-pencil" outlined onClick={onEdit} />
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label={t('operation.config.modality')} error={f.fieldErrors?.modalidade?.[0]}>
          <AppDropdown
            value={f.form.modalidade}
            options={modalityOptions}
            disabled={f.readOnly}
            onChange={(e) => f.set('modalidade', e.value)}
          />
        </FormField>

        <FormField label={t('operation.config.local')} error={f.fieldErrors?.local_aplicacao?.[0]}>
          <AppInputText
            value={f.form.local_aplicacao ?? ''}
            placeholder={t('operation.config.localPlaceholder')}
            disabled={f.readOnly || f.form.modalidade === 'online'}
            onChange={(e) => f.set('local_aplicacao', e.target.value)}
          />
        </FormField>

        <FormField label={t('operation.config.startDate')} error={f.fieldErrors?.start_date?.[0]}>
          <AppDatePicker value={f.form.start_date || null} disabled={f.readOnly} onChange={(v) => f.set('start_date', v ?? '')} />
        </FormField>

        <FormField label={t('operation.config.endDate')} error={f.fieldErrors?.end_date?.[0]}>
          <AppDatePicker value={f.form.end_date || null} disabled={f.readOnly} onChange={(v) => f.set('end_date', v ?? '')} />
        </FormField>

        {mode !== 'create' && (
          <FormField label={t('operation.config.workload')}>
            <AppInputText value={course ? t('operation.config.workloadValue', { hours: course.workload_hours }) : '—'} disabled readOnly />
          </FormField>
        )}
      </div>

      <FormErrorSummary errors={f.fieldErrors} mapped={MAPPED} />
      {f.generalError && <p className="text-sm text-red-600">{f.generalError}</p>}

      {mode !== 'view' && (
        <div className="flex justify-end gap-2">
          {onCancel && <AppButton label={t('operation.config.cancel')} outlined onClick={onCancel} disabled={f.pending} />}
          <AppButton variant="brandIcon" label={t('operation.config.save')} icon="pi pi-check" onClick={f.submit} disabled={f.pending} />
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Mount the tab in `TurmaDetailPage.tsx`**

Modify `TurmaDetailPage.tsx`: importe o card e um estado de edição; troque a aba Config placeholder pelo card real.

Add imports:
```tsx
import { TurmaConfigCard } from './TurmaConfigCard'
```

Add estado de edição (junto ao `useState` de `tab`):
```tsx
  const [editingConfig, setEditingConfig] = useState(false)
```

Troque a `<ModuleTab header={t('operation.detail.tabs.config')}>…</ModuleTab>` por:
```tsx
        <ModuleTab header={t('operation.detail.tabs.config')}>
          <TurmaConfigCard
            mode={editingConfig ? 'edit' : 'view'}
            turma={turma}
            onEdit={() => setEditingConfig(true)}
            onCancel={() => setEditingConfig(false)}
            onSaved={() => setEditingConfig(false)}
          />
        </ModuleTab>
```

- [ ] **Step 4: Create `TurmaCreatePage.tsx`** (reuso do card para cadastro, D3)

```tsx
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { TurmaConfigCard } from './TurmaConfigCard'

export function TurmaCreatePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { quoteId } = useParams<{ quoteId: string }>()
  const quote = Number(quoteId)

  return (
    <div className="space-y-6">
      <button
        type="button"
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
        onClick={() => navigate('/operacion')}
      >
        <i className="pi pi-arrow-left" aria-hidden="true" />
        {t('operation.detail.back')}
      </button>
      <h2 className="text-2xl font-semibold">{t('operation.create.title')}</h2>
      <div className="rounded-lg border border-slate-200 dark:border-slate-700">
        <TurmaConfigCard
          mode="create"
          quoteId={quote}
          onSaved={(id) => navigate(`/operacion/turmas/${id}`)}
          onCancel={() => navigate('/operacion')}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Wire the create route**

Modify `frontend/src/app/router/AppRouter.tsx`:
- Add import: `import { TurmaCreatePage } from '@features/operation/components/Turma/TurmaCreatePage'`
- Add route (antes da rota `/operacion/turmas/:id` para o path fixo `nueva` não cair no `:id`):
```tsx
          <Route path="/operacion/turmas/nueva/:quoteId" element={<TurmaCreatePage />} />
```

- [ ] **Step 6: Type-check + lint**

Run: `cd frontend && pnpm build && pnpm lint`
Expected: verdes.

- [ ] **Step 7: Manual proof**

- Aba **Configuración** de uma turma: mostra modalidade/local/datas/carga horária (read-only), botão **Editar** entra em edição; salvar persiste (PUT) e volta a view; `local` desabilita quando modalidade=online; datas usam o date picker es-CL.
- Fila de pendentes → **Configurar turma**: abre `/operacion/turmas/nueva/:quoteId`, preenche modalidade/local/datas, salvar cria a turma (POST) e cai no detalhe dela.
- Erro de validação (ex.: presencial sem local, ou `end_date < start_date`): aparece no campo/summary.

- [ ] **Step 8: Commit**

```bash
cd frontend && git add src/features/operation/hooks/useTurmaConfigForm.ts src/features/operation/components/Turma/TurmaConfigCard.tsx src/features/operation/components/Turma/TurmaCreatePage.tsx src/features/operation/components/Turma/TurmaDetailPage.tsx src/app/router/AppRouter.tsx
git commit -m "feat(operation): aba Configuración (view/edit) + cadastro de turma reusando o card"
```

---

## Task 10: Aba `Redactor` — designação com picker idôneo client-side

**Files:**
- Create: `frontend/src/features/operation/hooks/useRedatorPicker.ts`
- Create: `frontend/src/features/operation/components/Turma/RedatorDesignation.tsx`
- Modify: `frontend/src/features/operation/components/Turma/TurmaDetailPage.tsx` (aba Redactor)

**Interfaces:**
- Consumes: `redatoresApi` (`@shared/api/redatoresApi`); `isEligible` (task 5); `useDesignateRedator`/`useRemoveRedator` (task 4); `useMutationErrors` (`@shared/hooks`); `AppDialog`/`AppButton`/`AppAvatar`/`AppTag` (`@shared/ui`).
- Produces: `RedatorDesignation` (montado na aba Redactor).

- [ ] **Step 1: Create `useRedatorPicker.ts`**

```ts
import { useMemo } from 'react'
import { redatoresApi } from '@shared/api/redatoresApi'
import type { RedatorData, TurmaData } from '@shared/types/generated'
import { useMutationErrors } from '@shared/hooks'
import { isEligible } from '../lib/eligibility'
import { useDesignateRedator, useRemoveRedator } from '../api/useTurmas'

/** Lista de redatores idôneos para o curso da turma, MENOS os já designados.
 * Idoneidade é calculada no front (RN-09 espelhado; a API é a fronteira real). */
export function useRedatorPicker(turma: TurmaData) {
  const redatores = redatoresApi.useList()
  const designate = useDesignateRedator()
  const remove = useRemoveRedator()
  const { message: error } = useMutationErrors([designate.error, remove.error])

  const assignedIds = useMemo(() => new Set(turma.redatores.map((r) => r.id)), [turma.redatores])

  const eligible: RedatorData[] = useMemo(() => {
    if (turma.course_id == null) return []
    return (redatores.data ?? []).filter(
      (r) => r.id != null && !assignedIds.has(r.id) && isEligible(r, turma.course_id!),
    )
  }, [redatores.data, assignedIds, turma.course_id])

  return {
    eligible,
    loadingList: redatores.isLoading,
    designate: (redatorId: number) => designate.mutate({ turmaId: turma.id!, redatorId }),
    remove: (redatorId: number) => remove.mutate({ turmaId: turma.id!, redatorId }),
    pending: designate.isPending || remove.isPending,
    error,
  }
}
```

- [ ] **Step 2: Create `RedatorDesignation.tsx`**

```tsx
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AppAvatar, AppButton, AppTag, AppDialog } from '@shared/ui'
import type { TurmaData } from '@shared/types/generated'
import { useRedatorPicker } from '../../hooks/useRedatorPicker'

export function RedatorDesignation({ turma }: { turma: TurmaData }) {
  const { t } = useTranslation()
  const picker = useRedatorPicker(turma)
  const [open, setOpen] = useState(false)

  return (
    <div className="space-y-4 p-4">
      <h3 className="text-sm font-medium uppercase tracking-wide text-slate-500">{t('operation.redator.title')}</h3>

      {turma.redatores.length === 0 && <p className="text-sm text-slate-500">{t('operation.redator.none')}</p>}

      <ul className="space-y-2">
        {turma.redatores.map((r) => (
          <li
            key={r.id}
            className="flex items-center justify-between rounded-lg border border-slate-200 p-3 dark:border-slate-700"
          >
            <div className="flex items-center gap-3">
              <AppAvatar label={r.name} />
              <div>
                <p className="font-medium">{r.name}</p>
                <AppTag value={t('operation.redator.idoneo')} severity="success" />
              </div>
            </div>
            <AppButton
              label={t('operation.redator.remove')}
              icon="pi pi-times"
              outlined
              severity="danger"
              disabled={picker.pending}
              onClick={() => picker.remove(r.id)}
            />
          </li>
        ))}
      </ul>

      <AppButton
        label={turma.redatores.length > 0 ? t('operation.redator.change') : t('operation.redator.designate')}
        icon="pi pi-user-plus"
        outlined
        onClick={() => setOpen(true)}
      />

      <p className="text-sm text-slate-500">{t('operation.redator.helpNote')}</p>
      {picker.error && <p className="text-sm text-red-600">{picker.error}</p>}

      <AppDialog visible={open} header={t('operation.redator.pickerTitle')} onHide={() => setOpen(false)}>
        {picker.eligible.length === 0 ? (
          <p className="text-sm text-slate-500">{t('operation.redator.pickerEmpty')}</p>
        ) : (
          <ul className="space-y-2">
            {picker.eligible.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                <div className="flex items-center gap-3">
                  <AppAvatar label={r.name} />
                  <span className="font-medium">{r.name}</span>
                </div>
                <AppButton
                  variant="brandIcon"
                  label={t('operation.redator.pick')}
                  icon="pi pi-check"
                  disabled={picker.pending}
                  onClick={() => {
                    picker.designate(r.id!)
                    setOpen(false)
                  }}
                />
              </li>
            ))}
          </ul>
        )}
      </AppDialog>
    </div>
  )
}
```

- [ ] **Step 3: Mount the tab**

Modify `TurmaDetailPage.tsx`: importe `RedatorDesignation` e troque a aba Redactor placeholder:

Add import:
```tsx
import { RedatorDesignation } from './RedatorDesignation'
```

Troque `<ModuleTab header={t('operation.detail.tabs.redator')}>…</ModuleTab>` por:
```tsx
        <ModuleTab header={t('operation.detail.tabs.redator')}>
          <RedatorDesignation turma={turma} />
        </ModuleTab>
```

- [ ] **Step 4: Type-check + lint**

Run: `cd frontend && pnpm build && pnpm lint`
Expected: verdes.

> Se `AppAvatar` não aceitar `label`, verifique a prop real: `grep -n "Props" frontend/src/shared/ui/AppAvatar/AppAvatar.tsx`. É wrapper do `Avatar` do Prime — use `label={r.name}` (iniciais) ou a prop que o wrapper expõe. Se o wrapper só aceitar `label`/`image`, o código acima está correto.

- [ ] **Step 5: Manual proof**

Aba **Redactor**: mostra designados (com "Idóneo" + remover) ou "Ningún redactor asignado"; "Designar/Cambiar" abre o diálogo listando **só redatores idôneos** (habilitados ao curso + REUF vigente) e **não** os já designados; designar adiciona (a lista repinta); remover tira; a nota RN-09 aparece. Teste o caso sem idôneos → mensagem vazia.

- [ ] **Step 6: Commit**

```bash
cd frontend && git add src/features/operation/hooks/useRedatorPicker.ts src/features/operation/components/Turma/RedatorDesignation.tsx src/features/operation/components/Turma/TurmaDetailPage.tsx
git commit -m "feat(operation): aba Redactor com designação e picker idôneo client-side"
```

---

## Task 11: Verificação end-to-end da Execução 1

**Files:** nenhum (gate).

- [ ] **Step 1: Backend — suíte Operation verde**

Run: `docker compose exec -T app php artisan test --filter=Operation`
Expected: PASS (inclui os 3 testes novos + regressões).

- [ ] **Step 2: Prova real contra MySQL (lição #15)**

Run: `docker compose exec -T app php artisan migrate:fresh --seed` (ou `migrate` se o banco de dev já está de pé) e confirme que `GET /api/turmas` e `GET /api/turmas/pendientes-configuracion` respondem 200 com os campos enriquecidos (curl com `-H 'Origin: http://localhost:5173' -H 'Accept: application/json'` + cookie/CSRF — lição #12, OU pela UI logada).

- [ ] **Step 3: Frontend — build + lint**

Run: `cd frontend && pnpm build && pnpm lint`
Expected: verdes.

- [ ] **Step 4: Prova de comportamento (DoD, lei §8)**

Com o app rodando, provar o fluxo ponta a ponta:
1. `/operacion` lista turmas (código=cotação, curso, cliente, modalidade, redator/Sin asignar, alunos, estado) e a fila de pendentes.
2. "Configurar turma" cria a turma e cai no detalhe.
3. Aba Configuración edita e persiste; carga horária read-only.
4. Link "Presupuesto … · Cotización …" leva ao orçamento.
5. Aba Redactor designa só idôneos e remove.

- [ ] **Step 5: Commit final da execução (se houver ajuste solto)**

```bash
git add -A && git commit -m "chore(operation): fecha Execução 1 (turmas: hub + detalhe + config + redator)" || echo "nada a commitar"
```

---

## Self-Review (writing-plans)

**1. Spec coverage (Exec 1 da spec `2026-07-21-bloco6-frontend-operacao-design.md`):**
- Hub Pendentes + tabela → Tasks 3, 7. ✓
- Detalhe não-modal + abas → Task 8. ✓
- Configuración view/edit/create (reuso, D3) → Task 9. ✓
- Redactor picker idôneo client-side (D4) → Tasks 5, 10. ✓
- `TurmaQueryBuilder` + `TurmaData` enriquecido + endpoint pendentes (toques backend Exec 1) → Tasks 1, 2, 3. ✓
- Identificação orçamento+cotação por relacionamento + link (D7) → Tasks 2, 7, 8. ✓
- i18n do módulo → Task 6. ✓
- **Fora de Exec 1 (não neste plano):** Alumnos (Exec 2), Documentación/Conclusión/manual/P-07 (Exec 3), seed (task final) — abas ficam "próxima entrega".

**2. Placeholder scan:** sem TBD/TODO; código completo em cada step. Restam 2 checagens de contrato com fallback explícito (não são placeholders): o case do enum `QuoteStatus` (Task 3 Step 4 — grep + fallback string `'approved'`) e a prop de `AppAvatar` (Task 10 Step 4 — grep + fallback `label`).

**3. Type consistency:** `TurmaConfigPayload` (task 4) usado em 9; `turmaKeys`/hooks de 4 usados em 7/8/9/10; `isEligible`/`turmaDisplayStatus` de 5 usados em 7/10/8; campos enriquecidos de `TurmaData` (task 2) consumidos por 7/8. `PendingQuoteData` (task 3) consumido por 7. Nomes batem.

---

## Notas de encaminhamento (fora deste plano — para o fechamento do planejamento)

- **Backlog `progress.md`:** Exec 2 (Alumnos: individual+import, endpoint preview de RUT) e Exec 3 (Documentación+Conclusión+manual+P-07) entram como títulos; planejar just-in-time antes de cada `/executar-bloco`.
- **`pendencias.md` (lembretes — virar task no Notion depois):** FUT-1 (templates de doc via código), FUT-2 (ancoragem cross-módulo genérica), nota "protótipo tinha 4 docs de turma; decisão = 3 do backend (RN-16)".
