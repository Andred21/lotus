# Bloco 6-frontend · Exec 2 · Alumnos — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar a aba **Alumnos** da turma — matrícula individual com pré-check de troca de cliente (2 passos), import de planilha (xlsx/csv) com resumo, e remoção — mais o único toque backend previsto: endpoint de **preview de RUT não-mutante**.

**Architecture:** Backend ganha uma leitura read-only sobre o `StudentResolver` (`previewByRut` → `StudentLookup`) projetada por `EnrollPreviewData::fromLookup`, exposta em `GET turmas/{turma}/alunos/preview`. As Actions de escrita (`EnrollStudentAction`, `ImportStudentsAction`, `RemoveEnrollmentAction`) e os DTOs (`EnrollmentData`, `ImportResultData`, `MovedStudentData`, `ImportRowErrorData`) **já existem** (6c) — nenhum toque neles. Frontend é greenfield na feature `operation`: hooks de API de sub-recurso (molde `useTurmas`), um hook de fluxo 2-passos, e componentes declarativos plugados na aba `students` do `TurmaDetailPage` (hoje placeholder `comingSoon`).

**Tech Stack:** Laravel 13 / PHP 8.3 · spatie/laravel-data (`#[TypeScript]`) · React 19 + TS + TanStack Query · PrimeReact via `shared/ui` · i18next (pt-BR/es-CL/en).

## Global Constraints

Copiadas verbatim das leis (`CLAUDE.md` §5) e rules `.claude/rules/{backend-ddd,frontend-fsliced,generated-types}.md` — valem para **toda** task:

- **DDD-lite, SEM Repository sobre Eloquent** (ADR-02). Controller fino: RMB nas leituras, injeta Action nas escritas, retorna sempre `XData::fromModel`/projeção. Regra read-only com lógica de domínio (`will_move`) mora na projeção do DTO, não solta no controller.
- **`generated.ts` não se edita à mão.** Toca DTO com `#[TypeScript]` → `docker compose exec -T app php artisan typescript:transform` **no mesmo commit** (lição #11). Fica no `globalIgnores` do eslint.
- **Auth = cookie Sanctum + CSRF.** Erros sobem ao handler RFC 7807; nunca `abort(422)`. Validação por `rules()` do DTO ou `$request->validate`.
- **RBAC = middleware `permission:`** no controller (`HasMiddleware`). Preview usa `operation.enrollment.manage` (permissão **já existe**, criada no 6c — nada de seeder novo).
- **Features não importam PrimeReact direto** (só via `shared/ui`) **nem outra feature — nem para tipo.** Redatores/cursos read-only vêm de `shared/api`. Dependência aponta só para baixo.
- **Financeiro/contagem nunca bloqueia** — `contracted_count` vs `enrolled_total` é aviso, nunca gate (D3 do 6c).
- **Server state → TanStack Query; UI local (passo do form) → `useState`.** Componente de feature é declarativo; estado/mutations/derivação no hook.
- **Kit de form `shared/ui/FormField/`** (`FormField`, `FormErrorSummary`) — não reintroduzir helpers locais. Wrappers: `AppButton`, `AppDataTable`, `AppDialog`, `AppFileUpload`, `AppTag`, `AppAvatar`, `AppInputText` — nunca o componente cru do Prime.
- **i18n:** 3 locales com chaves **idênticas**; `es-CL` é a referência de rótulo (cliente chileno). Vocabulário de domínio = o do backend (`Redator`, `Alumno`, `Turma`).
- **`valid_until` inparseável = vencido** (peso legal, direção conservadora) — regra de idoneidade do Exec 1; não reaparece aqui, mas mantém o princípio "derivação conservadora no front".
- **Gate por execução (lei §8):** backend = feature test verde **contra MySQL** (lição #15); frontend = `pnpm build` (tsc -b) + `pnpm lint` verdes **e** comportamento provado na UI contra o backend real. "Pacote instalado / build isolado" não é DoD.

**Comandos de verificação:**
```bash
# Backend (do host, container `app`):
docker compose exec -T app php artisan test --filter=EnrollPreviewApiTest          # loop rápido (sqlite :memory:)
docker compose exec -T -e DB_CONNECTION=mysql -e DB_DATABASE=lotus_test app php artisan test --filter=EnrollPreviewApiTest   # gate MySQL (lição #15)
docker compose exec -T app php artisan typescript:transform                        # regenera generated.ts
# Frontend (de frontend/, nativo WSL):
pnpm build && pnpm lint
```

---

## File Structure

**Backend (`backend/app/Domains/`):**
- Create `Identity/Services/StudentLookup.php` — value object read-only do preview (espelha `StudentResolution`, sem `#[TypeScript]`).
- Modify `Identity/Services/StudentResolver.php` — adiciona `previewByRut(string $rut): StudentLookup` (não muta).
- Create `Operation/Data/EnrollPreviewData.php` — DTO `#[TypeScript]` com `fromLookup(StudentLookup, Client): self`.
- Modify `Operation/Http/Controllers/EnrollmentController.php` — método `preview()` + middleware.
- Modify `Operation/routes.php` — rota `GET turmas/{turma}/alunos/preview`.
- Create `backend/tests/Feature/Operation/EnrollPreviewApiTest.php` — feature test (6 ramos).

**Frontend (`frontend/src/features/operation/`):**
- Create `api/useEnrollments.ts` — `list · enroll · remove` (molde `useTurmas`).
- Create `api/useEnrollPreview.ts` — mutation de preview (GET on-demand).
- Create `api/useImportStudents.ts` — upload multipart → `ImportResultData`.
- Create `lib/enrollmentStatus.ts` — rótulo/severidade do `approval_status`.
- Create `hooks/useEnrollmentSection.ts` — lista + remoção da aba.
- Create `hooks/useEnrollStudentFlow.ts` — máquina de 2 passos (rut→preview→detalhes).
- Create `components/Enrollment/EnrollmentSection.tsx` — container da aba.
- Create `components/Enrollment/EnrollmentTable.tsx` — tabela de matriculados.
- Create `components/Enrollment/EnrollStudentForm.tsx` — diálogo individual (2 passos).
- Create `components/Enrollment/MoveConfirmDialog.tsx` — confirm de troca de cliente.
- Create `components/Enrollment/ImportDialog.tsx` — upload de planilha.
- Create `components/Enrollment/ImportResultSummary.tsx` — resumo do import.
- Modify `components/Turma/TurmaDetailPage.tsx` — troca o placeholder da aba `students` por `<EnrollmentSection>`.
- Modify `shared/config/locales/{es-CL,pt-BR,en}.json` — bloco `operation.enrollment.*`.

---

## Task 1: Backend — endpoint de preview de RUT (não-mutante)

**Files:**
- Create: `backend/app/Domains/Identity/Services/StudentLookup.php`
- Modify: `backend/app/Domains/Identity/Services/StudentResolver.php`
- Create: `backend/app/Domains/Operation/Data/EnrollPreviewData.php`
- Modify: `backend/app/Domains/Operation/Http/Controllers/EnrollmentController.php`
- Modify: `backend/app/Domains/Operation/routes.php`
- Test: `backend/tests/Feature/Operation/EnrollPreviewApiTest.php`

**Interfaces:**
- Consumes: `App\Shared\Support\Rut::parse()`, `App\Shared\Rules\ValidRut`, `Identity\Models\{User,Student}`, `Commercial\Models\Client`. Existentes.
- Produces (consumido pela Task 3/5 via `generated.ts`):
  - `StudentResolver::previewByRut(string $rut): StudentLookup` — lança `ValidationException` (chave `rut`) se RUT inválido ou de tipo não-aluno; nunca cria/move.
  - `EnrollPreviewData` (`#[TypeScript]`): `{ exists: bool, name: ?string, rut: string, current_client: ?string, will_move: bool, previous_client: ?string }`.
  - Rota `GET /api/turmas/{turma}/alunos/preview?rut=…` (perm `operation.enrollment.manage`).

- [ ] **Step 1: Escrever o feature test (falha primeiro)**

Create `backend/tests/Feature/Operation/EnrollPreviewApiTest.php`:

```php
<?php

namespace Tests\Feature\Operation;

use App\Domains\Catalog\Models\Course;
use App\Domains\Commercial\Models\Budget;
use App\Domains\Commercial\Models\Client;
use App\Domains\Commercial\Models\Quote;
use App\Domains\Identity\Models\User;
use App\Domains\Operation\Enums\TurmaModalidade;
use App\Domains\Operation\Enums\TurmaStatus;
use App\Domains\Operation\Models\Turma;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EnrollPreviewApiTest extends TestCase
{
    use RefreshDatabase;

    private Turma $turma;

    private Course $course;

    protected function setUp(): void
    {
        parent::setUp();
        $this->course = Course::create(['name' => 'AT', 'workload_hours' => 8]);
        $this->turma = $this->makeTurmaForClient('ACME', 1);
    }

    /** Cria cliente + budget + quote approved + turma em_andamento. */
    private function makeTurmaForClient(string $clientName, int $seq): Turma
    {
        $clientId = User::factory()->create(['type' => 'cliente', 'is_active' => false])
            ->client()->create(['legal_name' => $clientName, 'type' => 'client'])->id;
        $budget = Budget::create(['client_id' => $clientId, 'code' => "Scap {$seq}"]);
        $quote = Quote::create([
            'budget_id' => $budget->id, 'course_id' => $this->course->id, 'seq_in_budget' => 1,
            'student_count' => 5, 'value_uf' => 10, 'status' => 'approved',
        ]);

        return Turma::create([
            'quote_id' => $quote->id, 'course_id' => $this->course->id,
            'modalidade' => TurmaModalidade::Online, 'local_aplicacao' => null,
            'start_date' => '2026-08-01', 'end_date' => '2026-08-10',
            'status' => TurmaStatus::EmAndamento,
        ]);
    }

    public function test_rut_inexistente_devolve_exists_false(): void
    {
        $this->actingAsAdmin();

        $this->getJson("/api/turmas/{$this->turma->id}/alunos/preview?rut=11.111.111-1")
            ->assertOk()
            ->assertJsonPath('exists', false)
            ->assertJsonPath('will_move', false)
            ->assertJsonPath('name', null)
            ->assertJsonPath('current_client', null);
    }

    public function test_aluno_do_mesmo_cliente_nao_move(): void
    {
        $this->actingAsAdmin();
        // matricular cria o aluno vinculado ao cliente ACME desta turma
        $this->postJson("/api/turmas/{$this->turma->id}/alunos", [
            'rut' => '11.111.111-1', 'name' => 'Juan Soto', 'email' => 'juan@acme.cl',
        ])->assertCreated();

        $this->getJson("/api/turmas/{$this->turma->id}/alunos/preview?rut=11.111.111-1")
            ->assertOk()
            ->assertJsonPath('exists', true)
            ->assertJsonPath('name', 'Juan Soto')
            ->assertJsonPath('current_client', 'ACME')
            ->assertJsonPath('will_move', false)
            ->assertJsonPath('previous_client', null);
    }

    public function test_aluno_de_outro_cliente_marca_will_move(): void
    {
        $this->actingAsAdmin();
        $beta = $this->makeTurmaForClient('BETA', 2);
        // aluno nasce vinculado a BETA
        $this->postJson("/api/turmas/{$beta->id}/alunos", [
            'rut' => '11.111.111-1', 'name' => 'Juan Soto', 'email' => 'juan@beta.cl',
        ])->assertCreated();

        // preview contra a turma de ACME → moverá de BETA para ACME
        $this->getJson("/api/turmas/{$this->turma->id}/alunos/preview?rut=11.111.111-1")
            ->assertOk()
            ->assertJsonPath('exists', true)
            ->assertJsonPath('current_client', 'BETA')
            ->assertJsonPath('will_move', true)
            ->assertJsonPath('previous_client', 'BETA');
    }

    public function test_rut_invalido_422(): void
    {
        $this->actingAsAdmin();

        $this->getJson("/api/turmas/{$this->turma->id}/alunos/preview?rut=nope")
            ->assertStatus(422);
    }

    public function test_rut_de_outro_tipo_de_usuario_422(): void
    {
        $this->actingAsAdmin();
        User::factory()->create(['type' => 'admin', 'rut' => '22.222.222-2', 'is_active' => true]);

        $this->getJson("/api/turmas/{$this->turma->id}/alunos/preview?rut=22.222.222-2")
            ->assertStatus(422);
    }

    public function test_sem_permissao_403(): void
    {
        $this->seed(RolePermissionSeeder::class);
        $user = User::factory()->redator()->create(['is_active' => true]);
        $user->assignRole('redator');
        $this->actingAs($user, 'web');

        $this->getJson("/api/turmas/{$this->turma->id}/alunos/preview?rut=11.111.111-1")
            ->assertForbidden();
    }
}
```

> Nota: `User::factory()->create(['type' => 'admin', 'rut' => '22.222.222-2'])` assume que a factory aceita `rut` override; se a coluna `rut` não estiver no `fillable`/factory, ajuste para `User::factory()->create(['type' => 'admin'])->forceFill(['rut' => '22.222.222-2'])->save()`. Verifique a factory antes de assumir.

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `docker compose exec -T app php artisan test --filter=EnrollPreviewApiTest`
Expected: FAIL — rota inexistente devolve 404 (`assertOk`/`assertStatus(422)` quebram).

- [ ] **Step 3: Criar o value object `StudentLookup`**

Create `backend/app/Domains/Identity/Services/StudentLookup.php`:

```php
<?php

namespace App\Domains\Identity\Services;

use App\Domains\Identity\Models\Student;

/**
 * Resultado read-only de uma consulta de aluno por RUT (preview de matrícula).
 * Não é DTO de API (sem #[TypeScript]): a projeção p/ o front é do EnrollPreviewData,
 * que precisa do cliente da turma p/ derivar will_move. Espelha StudentResolution.
 */
final class StudentLookup
{
    public function __construct(
        public readonly bool $exists,
        public readonly ?Student $student,
        public readonly string $formattedRut,
    ) {}
}
```

- [ ] **Step 4: Adicionar `previewByRut` ao `StudentResolver`**

Modify `backend/app/Domains/Identity/Services/StudentResolver.php` — adicione o método (não altera `resolveByRut`):

```php
    /**
     * Leitura read-only para o preview de matrícula (RF-ALU-04): resolve o RUT
     * sem criar nem mover. Lança por RUT inválido ou tipo não-aluno (mesmo
     * critério do resolveByRut); ausência de aluno é resultado válido (exists=false).
     */
    public function previewByRut(string $rut): StudentLookup
    {
        $parsed = Rut::parse($rut);

        if (! $parsed->isValid()) {
            throw ValidationException::withMessages(['rut' => 'RUT inválido.']);
        }

        $formatted = $parsed->format();
        $user = User::withTrashed()->where('rut', $formatted)->first();

        if ($user === null) {
            return new StudentLookup(false, null, $formatted);
        }

        if ($user->type !== 'aluno') {
            throw ValidationException::withMessages([
                'rut' => 'Este RUT pertence a um usuário de outro tipo.',
            ]);
        }

        $student = Student::withTrashed()->where('user_id', $user->id)->firstOrFail();
        $student->loadMissing('currentClient', 'user');

        return new StudentLookup(true, $student, $formatted);
    }
```

- [ ] **Step 5: Criar `EnrollPreviewData`**

Create `backend/app/Domains/Operation/Data/EnrollPreviewData.php`:

```php
<?php

namespace App\Domains\Operation\Data;

use App\Domains\Commercial\Models\Client;
use App\Domains\Identity\Services\StudentLookup;
use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * Preview de matrícula (não-mutante): o front pergunta pelo RUT antes de matricular
 * e, se o aluno já pertence a OUTRO cliente, confirma a troca (RN-10; 6c move em
 * silêncio, o front "deve avisar"). will_move e previous_client são derivados aqui
 * contra o cliente da turma — o StudentLookup (Identity) não conhece a turma.
 */
#[TypeScript]
class EnrollPreviewData extends Data
{
    public function __construct(
        public bool $exists,
        public ?string $name,
        public string $rut,
        public ?string $current_client,
        public bool $will_move,
        public ?string $previous_client,
    ) {}

    public static function fromLookup(StudentLookup $lookup, Client $turmaClient): self
    {
        if (! $lookup->exists) {
            return new self(false, null, $lookup->formattedRut, null, false, null);
        }

        $student = $lookup->student;
        $current = $student->currentClient;
        $currentName = $current?->legal_name;
        $willMove = $current !== null && $current->id !== $turmaClient->id;

        return new self(
            exists: true,
            name: $student->user->name,
            rut: $lookup->formattedRut,
            current_client: $currentName,
            will_move: $willMove,
            previous_client: $willMove ? $currentName : null,
        );
    }
}
```

- [ ] **Step 6: Adicionar o método `preview` ao controller + a rota**

Modify `backend/app/Domains/Operation/Http/Controllers/EnrollmentController.php`:

Adicione os imports no topo:
```php
use App\Domains\Identity\Services\StudentResolver;
use App\Domains\Operation\Data\EnrollPreviewData;
use App\Shared\Rules\ValidRut;
```

Inclua `'preview'` no grupo de middleware `operation.enrollment.manage`:
```php
            new Middleware('permission:operation.enrollment.manage', only: ['store', 'import', 'destroy', 'preview']),
```

Adicione o método (depois de `index`):
```php
    public function preview(Request $request, Turma $turma, StudentResolver $resolver): EnrollPreviewData
    {
        $validated = $request->validate(['rut' => ['required', 'string', new ValidRut]]);

        return EnrollPreviewData::fromLookup(
            $resolver->previewByRut($validated['rut']),
            $turma->quote->budget->client,
        );
    }
```

Modify `backend/app/Domains/Operation/routes.php` — adicione a rota junto ao bloco de alunos (antes do `store`, ordem não importa por ser GET distinto):
```php
    Route::get('turmas/{turma}/alunos/preview', [EnrollmentController::class, 'preview']);
```

- [ ] **Step 7: Rodar o teste (sqlite) e confirmar que passa**

Run: `docker compose exec -T app php artisan test --filter=EnrollPreviewApiTest`
Expected: PASS (6 testes verdes).

- [ ] **Step 8: Regenerar os tipos TS**

Run: `docker compose exec -T app php artisan typescript:transform`
Expected: `generated.ts` atualizado com `export type EnrollPreviewData = { exists: boolean; name: string | null; rut: string; current_client: string | null; will_move: boolean; previous_client: string | null; }`. Confirme:
`grep -n "EnrollPreviewData" frontend/src/shared/types/generated.ts`

- [ ] **Step 9: Rodar o gate MySQL (lição #15)**

Run: `docker compose exec -T -e DB_CONNECTION=mysql -e DB_DATABASE=lotus_test app php artisan test --filter=EnrollPreviewApiTest`
Expected: PASS. (Prova que a leitura `withTrashed`/join `quote.budget.client` roda em InnoDB, não só em sqlite.)

- [ ] **Step 10: Commit**

```bash
git add backend/app/Domains/Identity/Services/StudentLookup.php \
        backend/app/Domains/Identity/Services/StudentResolver.php \
        backend/app/Domains/Operation/Data/EnrollPreviewData.php \
        backend/app/Domains/Operation/Http/Controllers/EnrollmentController.php \
        backend/app/Domains/Operation/routes.php \
        backend/tests/Feature/Operation/EnrollPreviewApiTest.php \
        frontend/src/shared/types/generated.ts
git commit -m "feat(operation): endpoint preview de RUT (não-mutante) p/ matrícula individual

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: Frontend — hooks de API da matrícula

**Files:**
- Create: `frontend/src/features/operation/api/useEnrollments.ts`
- Create: `frontend/src/features/operation/api/useEnrollPreview.ts`
- Create: `frontend/src/features/operation/api/useImportStudents.ts`

**Interfaces:**
- Consumes: `api` e `ProblemDetails` de `@shared/api/axios`; `turmaKeys` de `../api/useTurmas`; tipos `EnrollmentData`, `ImportResultData`, `EnrollPreviewData` de `@shared/types/generated` (Task 1 regen).
- Produces (consumido pelas Tasks 4/5/6):
  - `enrollmentKeys.list(turmaId: number)` — query key.
  - `useEnrollments(turmaId: number)` → `UseQueryResult<EnrollmentData[], ProblemDetails>`.
  - `useEnrollStudent()` → mutation `{ turmaId: number; payload: { rut: string; name: string; email?: string | null; phone?: string | null } }` → `EnrollmentData`.
  - `useRemoveEnrollment()` → mutation `{ turmaId: number; enrollmentId: number }` → `void`.
  - `useEnrollPreview()` → mutation `{ turmaId: number; rut: string }` → `EnrollPreviewData`.
  - `useImportStudents()` → mutation `{ turmaId: number; file: File }` → `ImportResultData`.

- [ ] **Step 1: Criar `useEnrollments.ts`**

Create `frontend/src/features/operation/api/useEnrollments.ts`:

```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@shared/api/axios'
import type { ProblemDetails } from '@shared/api/axios'
import type { EnrollmentData } from '@shared/types/generated'
import { turmaKeys } from './useTurmas'

export const enrollmentKeys = {
  all: ['enrollments'] as const,
  list: (turmaId: number) => ['enrollments', 'list', turmaId] as const,
}

/** Campos que a UI envia na matrícula individual. Aluno novo (preview.exists=false)
 * exige email (D9 do 6c); o backend valida — o front só pré-marca o campo. */
export type EnrollPayload = {
  rut: string
  name: string
  email?: string | null
  phone?: string | null
}

/** Matricular/remover mexe no count da turma (enrolled_count) → repinta também
 * a lista e o detalhe de turmas, além da lista de matrículas. */
function useInvalidate(turmaId: number) {
  const qc = useQueryClient()
  return () => {
    qc.invalidateQueries({ queryKey: enrollmentKeys.list(turmaId) })
    qc.invalidateQueries({ queryKey: turmaKeys.all })
  }
}

export function useEnrollments(turmaId: number) {
  return useQuery<EnrollmentData[], ProblemDetails>({
    queryKey: enrollmentKeys.list(turmaId),
    queryFn: () => api.get<EnrollmentData[]>(`/api/turmas/${turmaId}/alunos`).then((r) => r.data),
    enabled: Number.isFinite(turmaId),
  })
}

export function useEnrollStudent() {
  const qc = useQueryClient()
  return useMutation<EnrollmentData, ProblemDetails, { turmaId: number; payload: EnrollPayload }>({
    mutationFn: ({ turmaId, payload }) =>
      api.post<EnrollmentData>(`/api/turmas/${turmaId}/alunos`, payload).then((r) => r.data),
    onSuccess: (_data, { turmaId }) => {
      qc.invalidateQueries({ queryKey: enrollmentKeys.list(turmaId) })
      qc.invalidateQueries({ queryKey: turmaKeys.all })
    },
  })
}

export function useRemoveEnrollment() {
  const qc = useQueryClient()
  return useMutation<void, ProblemDetails, { turmaId: number; enrollmentId: number }>({
    mutationFn: ({ turmaId, enrollmentId }) =>
      api.delete(`/api/turmas/${turmaId}/alunos/${enrollmentId}`).then(() => undefined),
    onSuccess: (_data, { turmaId }) => {
      qc.invalidateQueries({ queryKey: enrollmentKeys.list(turmaId) })
      qc.invalidateQueries({ queryKey: turmaKeys.all })
    },
  })
}
```

> `useInvalidate` acima ficou como referência de intenção; as mutations já invalidam inline com o `turmaId` do variável de mutação (mais simples que fechar sobre um id fixo). Não exporte `useInvalidate` — remova-o se o lint acusar variável não usada.

**Correção:** remova a função `useInvalidate` do arquivo (as mutations invalidam inline). O arquivo final não deve conter `useInvalidate`.

- [ ] **Step 2: Criar `useEnrollPreview.ts`**

Create `frontend/src/features/operation/api/useEnrollPreview.ts`:

```ts
import { useMutation } from '@tanstack/react-query'
import { api } from '@shared/api/axios'
import type { ProblemDetails } from '@shared/api/axios'
import type { EnrollPreviewData } from '@shared/types/generated'

/** Preview de RUT antes de matricular (2 passos, D5). GET on-demand → mutation
 * (não query): dispara no clique de "Continuar", não no render. RUT inválido /
 * tipo errado sobe como 422 no ProblemDetails. */
export function useEnrollPreview() {
  return useMutation<EnrollPreviewData, ProblemDetails, { turmaId: number; rut: string }>({
    mutationFn: ({ turmaId, rut }) =>
      api
        .get<EnrollPreviewData>(`/api/turmas/${turmaId}/alunos/preview`, { params: { rut } })
        .then((r) => r.data),
  })
}
```

- [ ] **Step 3: Criar `useImportStudents.ts`**

Create `frontend/src/features/operation/api/useImportStudents.ts`:

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@shared/api/axios'
import type { ProblemDetails } from '@shared/api/axios'
import type { ImportResultData } from '@shared/types/generated'
import { turmaKeys } from './useTurmas'
import { enrollmentKeys } from './useEnrollments'

/** Upload de planilha (xlsx/csv). NÃO fixa Content-Type: o axios deriva
 * multipart+boundary do FormData (fixar json faria o File virar {} — upload vazio,
 * 201 silencioso, peso legal — rule frontend-fsliced/axios). */
export function useImportStudents() {
  const qc = useQueryClient()
  return useMutation<ImportResultData, ProblemDetails, { turmaId: number; file: File }>({
    mutationFn: ({ turmaId, file }) => {
      const body = new FormData()
      body.append('file', file)
      return api
        .post<ImportResultData>(`/api/turmas/${turmaId}/alunos/importar`, body)
        .then((r) => r.data)
    },
    onSuccess: (_data, { turmaId }) => {
      qc.invalidateQueries({ queryKey: enrollmentKeys.list(turmaId) })
      qc.invalidateQueries({ queryKey: turmaKeys.all })
    },
  })
}
```

- [ ] **Step 4: Verificar build + lint**

Run (de `frontend/`): `pnpm build && pnpm lint`
Expected: verde. (Se `EnrollPreviewData` não existir em `generated.ts`, a Task 1 Step 8 não rodou — volte e regenere.)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/operation/api/useEnrollments.ts \
        frontend/src/features/operation/api/useEnrollPreview.ts \
        frontend/src/features/operation/api/useImportStudents.ts
git commit -m "feat(operation): hooks de API de matrícula (lista/enroll/remove/preview/import)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: Frontend — i18n da aba Alumnos (3 locales)

**Files:**
- Modify: `frontend/src/shared/config/locales/es-CL.json`
- Modify: `frontend/src/shared/config/locales/pt-BR.json`
- Modify: `frontend/src/shared/config/locales/en.json`

**Interfaces:**
- Produces: chaves `operation.enrollment.*` (idênticas nos 3 locales) consumidas pelas Tasks 4/5/6. `es-CL` é a referência de rótulo.

- [ ] **Step 1: Adicionar o bloco `enrollment` ao `es-CL.json`**

No `es-CL.json`, dentro do objeto `"operation"` (irmão de `"redator"`), adicione:

```json
    "enrollment": {
      "addStudent": "Agregar alumno",
      "importSheet": "Importar planilla (xlsx/csv)",
      "empty": "Aún no hay alumnos matriculados.",
      "footerCount": "{{count}} alumnos matriculados",
      "table": {
        "name": "NOMBRE",
        "rut": "RUT",
        "client": "CLIENTE",
        "status": "ESTADO MATRÍCULA"
      },
      "status": {
        "pendiente": "Matriculado",
        "aprobado": "Aprobado",
        "reprobado": "Reprobado"
      },
      "remove": "Quitar",
      "removeConfirm": "¿Quitar la matrícula de {{name}}?",
      "form": {
        "title": "Agregar alumno",
        "rutLabel": "RUT",
        "verify": "Continuar",
        "nameLabel": "Nombre",
        "emailLabel": "Correo electrónico",
        "emailHintNew": "Obligatorio para alumno nuevo.",
        "phoneLabel": "Teléfono",
        "submit": "Matricular",
        "cancel": "Cancelar",
        "back": "Volver"
      },
      "move": {
        "title": "El alumno pertenece a otro cliente",
        "body": "{{name}} está vinculado a {{previous}}. Al matricularlo aquí pasará a {{current}}.",
        "confirm": "Sí, mover y continuar",
        "cancel": "Cancelar"
      },
      "import": {
        "title": "Importar planilla",
        "help": "Sube un archivo xlsx o csv con columnas RUT, Nombre, Email, Teléfono.",
        "choose": "Elegir archivo",
        "uploading": "Importando…",
        "resultTitle": "Resumen de la importación",
        "created": "Creados",
        "relinked": "Reasociados",
        "alreadyEnrolled": "Ya matriculados",
        "moved": "Movidos de cliente",
        "movedRow": "{{name}} ({{rut}}): {{previous}} → {{client}}",
        "errors": "Filas con error",
        "errorRow": "Fila {{row}}: {{message}}",
        "enrolledVsContracted": "{{enrolled}} de {{contracted}} contratados",
        "close": "Cerrar"
      }
    }
```

- [ ] **Step 2: Espelhar em `pt-BR.json`** (mesmas chaves, rótulos pt-BR)

```json
    "enrollment": {
      "addStudent": "Adicionar aluno",
      "importSheet": "Importar planilha (xlsx/csv)",
      "empty": "Ainda não há alunos matriculados.",
      "footerCount": "{{count}} alunos matriculados",
      "table": {
        "name": "NOME",
        "rut": "RUT",
        "client": "CLIENTE",
        "status": "STATUS DE MATRÍCULA"
      },
      "status": {
        "pendiente": "Matriculado",
        "aprobado": "Aprovado",
        "reprobado": "Reprovado"
      },
      "remove": "Remover",
      "removeConfirm": "Remover a matrícula de {{name}}?",
      "form": {
        "title": "Adicionar aluno",
        "rutLabel": "RUT",
        "verify": "Continuar",
        "nameLabel": "Nome",
        "emailLabel": "E-mail",
        "emailHintNew": "Obrigatório para aluno novo.",
        "phoneLabel": "Telefone",
        "submit": "Matricular",
        "cancel": "Cancelar",
        "back": "Voltar"
      },
      "move": {
        "title": "O aluno pertence a outro cliente",
        "body": "{{name}} está vinculado a {{previous}}. Ao matriculá-lo aqui, passará para {{current}}.",
        "confirm": "Sim, mover e continuar",
        "cancel": "Cancelar"
      },
      "import": {
        "title": "Importar planilha",
        "help": "Envie um arquivo xlsx ou csv com colunas RUT, Nome, Email, Telefone.",
        "choose": "Escolher arquivo",
        "uploading": "Importando…",
        "resultTitle": "Resumo da importação",
        "created": "Criados",
        "relinked": "Reassociados",
        "alreadyEnrolled": "Já matriculados",
        "moved": "Movidos de cliente",
        "movedRow": "{{name}} ({{rut}}): {{previous}} → {{client}}",
        "errors": "Linhas com erro",
        "errorRow": "Linha {{row}}: {{message}}",
        "enrolledVsContracted": "{{enrolled}} de {{contracted}} contratados",
        "close": "Fechar"
      }
    }
```

- [ ] **Step 3: Espelhar em `en.json`** (mesmas chaves, rótulos en)

```json
    "enrollment": {
      "addStudent": "Add student",
      "importSheet": "Import sheet (xlsx/csv)",
      "empty": "No students enrolled yet.",
      "footerCount": "{{count}} students enrolled",
      "table": {
        "name": "NAME",
        "rut": "RUT",
        "client": "CLIENT",
        "status": "ENROLLMENT STATUS"
      },
      "status": {
        "pendiente": "Enrolled",
        "aprobado": "Passed",
        "reprobado": "Failed"
      },
      "remove": "Remove",
      "removeConfirm": "Remove {{name}}'s enrollment?",
      "form": {
        "title": "Add student",
        "rutLabel": "RUT",
        "verify": "Continue",
        "nameLabel": "Name",
        "emailLabel": "Email",
        "emailHintNew": "Required for a new student.",
        "phoneLabel": "Phone",
        "submit": "Enroll",
        "cancel": "Cancel",
        "back": "Back"
      },
      "move": {
        "title": "Student belongs to another client",
        "body": "{{name}} is linked to {{previous}}. Enrolling here will move them to {{current}}.",
        "confirm": "Yes, move and continue",
        "cancel": "Cancel"
      },
      "import": {
        "title": "Import sheet",
        "help": "Upload an xlsx or csv file with columns RUT, Name, Email, Phone.",
        "choose": "Choose file",
        "uploading": "Importing…",
        "resultTitle": "Import summary",
        "created": "Created",
        "relinked": "Relinked",
        "alreadyEnrolled": "Already enrolled",
        "moved": "Moved between clients",
        "movedRow": "{{name}} ({{rut}}): {{previous}} → {{client}}",
        "errors": "Rows with errors",
        "errorRow": "Row {{row}}: {{message}}",
        "enrolledVsContracted": "{{enrolled}} of {{contracted}} contracted",
        "close": "Close"
      }
    }
```

- [ ] **Step 4: Verificar JSON válido + build**

Run: `python3 -c "import json; [json.load(open(f'frontend/src/shared/config/locales/{l}.json')) for l in ['es-CL','pt-BR','en']]" && echo OK`
Depois (de `frontend/`): `pnpm build`
Expected: `OK` e build verde.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/shared/config/locales/es-CL.json \
        frontend/src/shared/config/locales/pt-BR.json \
        frontend/src/shared/config/locales/en.json
git commit -m "feat(operation): chaves i18n da aba Alumnos (pt/es/en)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: Frontend — tabela de matriculados + remoção + plug na aba

**Files:**
- Create: `frontend/src/features/operation/lib/enrollmentStatus.ts`
- Create: `frontend/src/features/operation/hooks/useEnrollmentSection.ts`
- Create: `frontend/src/features/operation/components/Enrollment/EnrollmentTable.tsx`
- Create: `frontend/src/features/operation/components/Enrollment/EnrollmentSection.tsx`
- Modify: `frontend/src/features/operation/components/Turma/TurmaDetailPage.tsx`

**Interfaces:**
- Consumes: `useEnrollments`, `useRemoveEnrollment` (Task 2); `EnrollmentData`, `EnrollmentApprovalStatus` de generated; `AppDataTable`, `AppButton`, `AppTag`, `AppAvatar` de `@shared/ui`.
- Produces (consumido pela Task 5/6):
  - `enrollmentStatusLabelKey(s): string`, `enrollmentStatusSeverity(s): 'info'|'success'|'danger'`.
  - `useEnrollmentSection(turma: TurmaData)` → `{ enrollments: EnrollmentData[]; loading: boolean; remove(id: number): void; removing: boolean; error: string | null }`.
  - `<EnrollmentSection turma={TurmaData} />` — container da aba (nesta task só tabela + remoção; botões de add/import entram nas Tasks 5/6).

- [ ] **Step 1: Criar `lib/enrollmentStatus.ts`**

```ts
import type { EnrollmentApprovalStatus } from '@shared/types/generated'

/** Rótulo do estado de matrícula (pendiente = "Matriculado"). Chave i18n; o
 * componente traduz. */
export function enrollmentStatusLabelKey(status: EnrollmentApprovalStatus): string {
  return `operation.enrollment.status.${status}`
}

export function enrollmentStatusSeverity(
  status: EnrollmentApprovalStatus,
): 'info' | 'success' | 'danger' {
  switch (status) {
    case 'aprobado':
      return 'success'
    case 'reprobado':
      return 'danger'
    default:
      return 'info'
  }
}
```

- [ ] **Step 2: Criar `hooks/useEnrollmentSection.ts`**

```ts
import { useConfirm } from '@shared/ui'
import { useTranslation } from 'react-i18next'
import type { TurmaData } from '@shared/types/generated'
import { useMutationErrors } from '@shared/hooks'
import { useEnrollments, useRemoveEnrollment } from '../api/useEnrollments'

/** Orquestra a lista/remoção da aba Alumnos. O componente só consome. */
export function useEnrollmentSection(turma: TurmaData) {
  const { t } = useTranslation()
  const turmaId = turma.id!
  const list = useEnrollments(turmaId)
  const removeMutation = useRemoveEnrollment()
  const { message: error } = useMutationErrors([removeMutation.error])

  const remove = (enrollmentId: number) =>
    removeMutation.mutate({ turmaId, enrollmentId })

  return {
    enrollments: list.data ?? [],
    loading: list.isLoading,
    remove,
    removing: removeMutation.isPending,
    error,
    t,
  }
}
```

> **Verifique antes:** se `@shared/ui` NÃO exporta `useConfirm`, remova o import (a confirmação de remoção fica na Task 5 via `window.confirm` ou um `AppDialog` simples — ver Step 4). Não invente um wrapper novo nesta task. O `useTranslation` pode ficar no componente; deixei no hook por conveniência — se o lint reclamar de retorno de `t`, mova para o componente.

- [ ] **Step 3: Criar `components/Enrollment/EnrollmentTable.tsx`**

```tsx
import { useTranslation } from 'react-i18next'
import { AppDataTable, AppAvatar, AppTag, AppButton } from '@shared/ui'
import type { EnrollmentData } from '@shared/types/generated'
import { enrollmentStatusLabelKey, enrollmentStatusSeverity } from '../../lib/enrollmentStatus'

type Props = {
  enrollments: EnrollmentData[]
  onRemove: (enrollmentId: number) => void
  removing: boolean
}

export function EnrollmentTable({ enrollments, onRemove, removing }: Props) {
  const { t } = useTranslation()

  if (enrollments.length === 0) {
    return <p className="p-4 text-sm text-slate-500">{t('operation.enrollment.empty')}</p>
  }

  return (
    <AppDataTable value={enrollments} dataKey="id">
      {[
        {
          header: t('operation.enrollment.table.name'),
          body: (e: EnrollmentData) => (
            <div className="flex items-center gap-3">
              <AppAvatar name={e.name} />
              <span className="font-medium">{e.name}</span>
            </div>
          ),
        },
        { header: t('operation.enrollment.table.rut'), field: 'rut' },
        {
          header: t('operation.enrollment.table.status'),
          body: (e: EnrollmentData) =>
            e.approval_status ? (
              <AppTag
                value={t(enrollmentStatusLabelKey(e.approval_status))}
                severity={enrollmentStatusSeverity(e.approval_status)}
              />
            ) : null,
        },
        {
          header: '',
          body: (e: EnrollmentData) => (
            <AppButton
              icon="pi pi-times"
              outlined
              severity="danger"
              disabled={removing}
              aria-label={t('operation.enrollment.remove')}
              onClick={() => e.id != null && onRemove(e.id)}
            />
          ),
        },
      ]}
    </AppDataTable>
  )
}
```

> **Verifique o contrato do `AppDataTable`:** o exemplo acima passa colunas como filhos-array de objetos-descritor, que **pode não** ser a API real do wrapper. Abra `frontend/src/shared/ui/AppDataTable/AppDataTable.tsx` e siga o padrão REAL (provavelmente `<Column>` filhos, como o Prime). Ajuste este JSX para o mesmo formato usado em `TurmasTable.tsx` (Exec 1) — copie a forma de declarar coluna de lá, incluindo coluna com `body` custom e coluna de ação. A coluna CLIENTE (`operation.enrollment.table.client`) do §3 da spec: inclua se `EnrollmentData` expuser o cliente; **não expõe** (`EnrollmentData` não tem client) → omita a coluna CLIENTE nesta tabela (o cliente da turma é único e já aparece no cabeçalho da página). Registre isso como desvio consciente da spec.

- [ ] **Step 4: Criar `components/Enrollment/EnrollmentSection.tsx`** (só tabela nesta task)

```tsx
import { useTranslation } from 'react-i18next'
import type { TurmaData } from '@shared/types/generated'
import { useEnrollmentSection } from '../../hooks/useEnrollmentSection'
import { EnrollmentTable } from './EnrollmentTable'

export function EnrollmentSection({ turma }: { turma: TurmaData }) {
  const { t } = useTranslation()
  const s = useEnrollmentSection(turma)

  if (s.loading) return <p className="p-4 text-sm text-slate-500">{t('common.loading')}</p>

  return (
    <div className="space-y-4 p-4">
      {s.error && <p className="text-sm text-red-600">{s.error}</p>}
      <EnrollmentTable enrollments={s.enrollments} onRemove={s.remove} removing={s.removing} />
      <p className="text-sm text-slate-500">
        {t('operation.enrollment.footerCount', { count: s.enrollments.length })}
      </p>
    </div>
  )
}
```

> A confirmação de remoção ("¿Quitar…?") entra na Task 5 junto do resto dos diálogos, OU aqui com `window.confirm(t('operation.enrollment.removeConfirm', { name }))` antes de `onRemove` — escolha `window.confirm` se `@shared/ui` não tiver diálogo de confirmação; peso da matrícula é reversível (soft-delete + rematrícula restaura), então confirmação leve basta.

- [ ] **Step 5: Plugar na aba `students` do `TurmaDetailPage`**

Modify `frontend/src/features/operation/components/Turma/TurmaDetailPage.tsx`:

Adicione o import:
```tsx
import { EnrollmentSection } from '../Enrollment/EnrollmentSection'
```

Troque o painel placeholder da aba students:
```tsx
        <AppTabPanel header={t('operation.detail.tabs.students')}>
          <p className="p-4 text-sm text-slate-500">{t('operation.detail.comingSoon')}</p>
        </AppTabPanel>
```
por:
```tsx
        <AppTabPanel header={t('operation.detail.tabs.students')}>
          <EnrollmentSection turma={turma} />
        </AppTabPanel>
```

- [ ] **Step 6: Verificar build + lint**

Run (de `frontend/`): `pnpm build && pnpm lint`
Expected: verde.

- [ ] **Step 7: Provar na UI** (gate do projeto — comportamento, não build)

Com `docker compose up -d` + `pnpm dev`: entre numa turma em_andamento com matrículas (use o seed atual ou matricule via Task 5 depois). Confirme: aba **Alumnos** lista NOME/RUT/ESTADO, tag de estado correta, footer com contagem, botão remover soft-deleta e a linha some. Se ainda não há alunos, o empty-state aparece.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/features/operation/lib/enrollmentStatus.ts \
        frontend/src/features/operation/hooks/useEnrollmentSection.ts \
        frontend/src/features/operation/components/Enrollment/EnrollmentTable.tsx \
        frontend/src/features/operation/components/Enrollment/EnrollmentSection.tsx \
        frontend/src/features/operation/components/Turma/TurmaDetailPage.tsx
git commit -m "feat(operation): aba Alumnos com tabela de matriculados e remoção

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: Frontend — matrícula individual com pré-check em 2 passos

**Files:**
- Create: `frontend/src/features/operation/hooks/useEnrollStudentFlow.ts`
- Create: `frontend/src/features/operation/components/Enrollment/MoveConfirmDialog.tsx`
- Create: `frontend/src/features/operation/components/Enrollment/EnrollStudentForm.tsx`
- Modify: `frontend/src/features/operation/components/Enrollment/EnrollmentSection.tsx`

**Interfaces:**
- Consumes: `useEnrollPreview` (Task 2), `useEnrollStudent` (Task 2), `useMutationErrors` de `@shared/hooks`, `EnrollPreviewData` de generated, kit `FormField`/`FormErrorSummary` + `AppInputText`/`AppButton`/`AppDialog` de `@shared/ui`.
- Produces:
  - `useEnrollStudentFlow(turmaId: number, turmaClientName: string, onDone: () => void)` → máquina de estado (ver Step 1).
  - `<MoveConfirmDialog visible previousClient currentClient onConfirm onCancel />`.
  - `<EnrollStudentForm turmaId turmaClientName visible onHide />`.

- [ ] **Step 1: Criar `hooks/useEnrollStudentFlow.ts`**

```ts
import { useState } from 'react'
import type { EnrollPreviewData } from '@shared/types/generated'
import { useMutationErrors } from '@shared/hooks'
import { useEnrollPreview } from '../api/useEnrollPreview'
import { useEnrollStudent } from '../api/useEnrollments'

type Step = 'rut' | 'details'

const EMPTY_DETAILS = { name: '', email: '', phone: '' }

/**
 * Máquina de 2 passos da matrícula individual (D5):
 *  passo 'rut'     → digita RUT, "Continuar" chama o preview.
 *                    preview.will_move → abre MoveConfirmDialog (confirm antes de avançar).
 *                    senão → avança direto a 'details'.
 *  passo 'details' → nome (sempre) + email (obrigatório só p/ aluno novo) + telefone → "Matricular".
 * Fecha e reseta ao concluir (onDone).
 */
export function useEnrollStudentFlow(
  turmaId: number,
  turmaClientName: string | null,
  onDone: () => void,
) {
  const [step, setStep] = useState<Step>('rut')
  const [rut, setRut] = useState('')
  const [preview, setPreview] = useState<EnrollPreviewData | null>(null)
  const [moveOpen, setMoveOpen] = useState(false)
  const [details, setDetails] = useState(EMPTY_DETAILS)

  const previewMutation = useEnrollPreview()
  const enrollMutation = useEnrollStudent()
  const { fieldErrors, message } = useMutationErrors([
    previewMutation.error,
    enrollMutation.error,
  ])

  const reset = () => {
    setStep('rut')
    setRut('')
    setPreview(null)
    setMoveOpen(false)
    setDetails(EMPTY_DETAILS)
    previewMutation.reset()
    enrollMutation.reset()
  }

  const advanceToDetails = (p: EnrollPreviewData) => {
    // aluno existente → pré-preenche o nome (email desconhecido no preview)
    setDetails({ name: p.name ?? '', email: '', phone: '' })
    setStep('details')
  }

  const runPreview = () => {
    previewMutation.mutate(
      { turmaId, rut },
      {
        onSuccess: (p) => {
          setPreview(p)
          if (p.will_move) setMoveOpen(true)
          else advanceToDetails(p)
        },
      },
    )
  }

  const confirmMove = () => {
    setMoveOpen(false)
    if (preview) advanceToDetails(preview)
  }

  const cancelMove = () => {
    setMoveOpen(false)
  }

  const setField = (k: keyof typeof EMPTY_DETAILS, v: string) =>
    setDetails((d) => ({ ...d, [k]: v }))

  const submit = () => {
    enrollMutation.mutate(
      {
        turmaId,
        payload: {
          rut,
          name: details.name,
          email: details.email || null,
          phone: details.phone || null,
        },
      },
      {
        onSuccess: () => {
          reset()
          onDone()
        },
      },
    )
  }

  return {
    step,
    rut,
    setRut,
    preview,
    isNewStudent: preview ? !preview.exists : true,
    moveOpen,
    turmaClientName,
    details,
    setField,
    runPreview,
    confirmMove,
    cancelMove,
    submit,
    reset,
    fieldErrors,
    message,
    previewing: previewMutation.isPending,
    submitting: enrollMutation.isPending,
  }
}
```

- [ ] **Step 2: Criar `components/Enrollment/MoveConfirmDialog.tsx`**

```tsx
import { useTranslation } from 'react-i18next'
import { AppDialog, AppButton } from '@shared/ui'

type Props = {
  visible: boolean
  studentName: string
  previousClient: string | null
  currentClient: string | null
  onConfirm: () => void
  onCancel: () => void
}

export function MoveConfirmDialog({
  visible,
  studentName,
  previousClient,
  currentClient,
  onConfirm,
  onCancel,
}: Props) {
  const { t } = useTranslation()
  return (
    <AppDialog visible={visible} header={t('operation.enrollment.move.title')} onHide={onCancel}>
      <p className="mb-4 text-sm">
        {t('operation.enrollment.move.body', {
          name: studentName,
          previous: previousClient ?? '—',
          current: currentClient ?? '—',
        })}
      </p>
      <div className="flex justify-end gap-2">
        <AppButton label={t('operation.enrollment.move.cancel')} outlined onClick={onCancel} />
        <AppButton label={t('operation.enrollment.move.confirm')} severity="warning" onClick={onConfirm} />
      </div>
    </AppDialog>
  )
}
```

> `severity="warning"` — confirme que `AppButton` repassa `severity` (o Exec 1 usa `severity="danger"`; warning segue o mesmo caminho). Se não houver `warning`, use o default (sem severity).

- [ ] **Step 3: Criar `components/Enrollment/EnrollStudentForm.tsx`**

```tsx
import { useTranslation } from 'react-i18next'
import { AppDialog, AppButton, AppInputText, FormField, FormErrorSummary } from '@shared/ui'
import { useEnrollStudentFlow } from '../../hooks/useEnrollStudentFlow'
import { MoveConfirmDialog } from './MoveConfirmDialog'

type Props = {
  turmaId: number
  turmaClientName: string | null
  visible: boolean
  onHide: () => void
}

export function EnrollStudentForm({ turmaId, turmaClientName, visible, onHide }: Props) {
  const { t } = useTranslation()
  const f = useEnrollStudentFlow(turmaId, turmaClientName, onHide)

  const close = () => {
    f.reset()
    onHide()
  }

  const err = (key: string) => f.fieldErrors?.[key]?.[0]

  return (
    <AppDialog visible={visible} header={t('operation.enrollment.form.title')} onHide={close}>
      <div className="space-y-4">
        <FormErrorSummary errors={f.fieldErrors} mapped={['rut', 'name', 'email', 'phone']} />

        <FormField label={t('operation.enrollment.form.rutLabel')} error={err('rut')}>
          <AppInputText
            value={f.rut}
            onChange={(e) => f.setRut(e.target.value)}
            disabled={f.step === 'details'}
          />
        </FormField>

        {f.step === 'rut' && (
          <div className="flex justify-end gap-2">
            <AppButton label={t('operation.enrollment.form.cancel')} outlined onClick={close} />
            <AppButton
              label={t('operation.enrollment.form.verify')}
              disabled={!f.rut || f.previewing}
              onClick={f.runPreview}
            />
          </div>
        )}

        {f.step === 'details' && (
          <>
            <FormField label={t('operation.enrollment.form.nameLabel')} error={err('name')}>
              <AppInputText value={f.details.name} onChange={(e) => f.setField('name', e.target.value)} />
            </FormField>
            <FormField
              label={t('operation.enrollment.form.emailLabel')}
              error={err('email')}
            >
              <AppInputText value={f.details.email} onChange={(e) => f.setField('email', e.target.value)} />
            </FormField>
            {f.isNewStudent && (
              <p className="text-sm text-slate-500">{t('operation.enrollment.form.emailHintNew')}</p>
            )}
            <FormField label={t('operation.enrollment.form.phoneLabel')} error={err('phone')}>
              <AppInputText value={f.details.phone} onChange={(e) => f.setField('phone', e.target.value)} />
            </FormField>
            <div className="flex justify-end gap-2">
              <AppButton label={t('operation.enrollment.form.cancel')} outlined onClick={close} />
              <AppButton
                label={t('operation.enrollment.form.submit')}
                disabled={!f.details.name || f.submitting}
                onClick={f.submit}
              />
            </div>
          </>
        )}

        {f.message && <p className="text-sm text-red-600">{f.message}</p>}
      </div>

      <MoveConfirmDialog
        visible={f.moveOpen}
        studentName={f.preview?.name ?? ''}
        previousClient={f.preview?.previous_client ?? null}
        currentClient={f.turmaClientName}
        onConfirm={f.confirmMove}
        onCancel={f.cancelMove}
      />
    </AppDialog>
  )
}
```

> **Verifique o contrato do `AppInputText`:** copie a forma de uso de um diálogo do Exec 1/comercial (assinatura de `onChange`/`value`). Ajuste se o wrapper expuser props diferentes.

- [ ] **Step 4: Ligar o botão "Agregar alumno" no `EnrollmentSection`**

Modify `EnrollmentSection.tsx` — adicione estado de abertura + botão + o form:

```tsx
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AppButton } from '@shared/ui'
import type { TurmaData } from '@shared/types/generated'
import { useEnrollmentSection } from '../../hooks/useEnrollmentSection'
import { EnrollmentTable } from './EnrollmentTable'
import { EnrollStudentForm } from './EnrollStudentForm'

export function EnrollmentSection({ turma }: { turma: TurmaData }) {
  const { t } = useTranslation()
  const s = useEnrollmentSection(turma)
  const [addOpen, setAddOpen] = useState(false)

  if (s.loading) return <p className="p-4 text-sm text-slate-500">{t('common.loading')}</p>

  return (
    <div className="space-y-4 p-4">
      <div className="flex justify-end gap-2">
        <AppButton
          label={t('operation.enrollment.addStudent')}
          icon="pi pi-user-plus"
          outlined
          onClick={() => setAddOpen(true)}
        />
      </div>

      {s.error && <p className="text-sm text-red-600">{s.error}</p>}
      <EnrollmentTable enrollments={s.enrollments} onRemove={s.remove} removing={s.removing} />
      <p className="text-sm text-slate-500">
        {t('operation.enrollment.footerCount', { count: s.enrollments.length })}
      </p>

      <EnrollStudentForm
        turmaId={turma.id!}
        turmaClientName={turma.client_name ?? null}
        visible={addOpen}
        onHide={() => setAddOpen(false)}
      />
    </div>
  )
}
```

- [ ] **Step 5: Verificar build + lint**

Run (de `frontend/`): `pnpm build && pnpm lint`
Expected: verde.

- [ ] **Step 6: Provar na UI** (3 ramos do pré-check)

Com backend + seed: numa turma em_andamento, "Agregar alumno":
1. **RUT novo** → passo detalhes exige nome+email; matricula, aparece na tabela.
2. **RUT existente do MESMO cliente** → passo detalhes com nome pré-preenchido, sem aviso de troca; matricula.
3. **RUT existente de OUTRO cliente** → abre MoveConfirmDialog ("pertence a X… passará para Y"); confirmar matricula e move; cancelar volta sem matricular.
4. **RUT inválido** → 422 mostra erro no campo rut (não avança).

- [ ] **Step 7: Commit**

```bash
git add frontend/src/features/operation/hooks/useEnrollStudentFlow.ts \
        frontend/src/features/operation/components/Enrollment/MoveConfirmDialog.tsx \
        frontend/src/features/operation/components/Enrollment/EnrollStudentForm.tsx \
        frontend/src/features/operation/components/Enrollment/EnrollmentSection.tsx
git commit -m "feat(operation): matrícula individual com pré-check de troca de cliente (2 passos)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 6: Frontend — import de planilha + resumo

**Files:**
- Create: `frontend/src/features/operation/components/Enrollment/ImportResultSummary.tsx`
- Create: `frontend/src/features/operation/components/Enrollment/ImportDialog.tsx`
- Modify: `frontend/src/features/operation/components/Enrollment/EnrollmentSection.tsx`

**Interfaces:**
- Consumes: `useImportStudents` (Task 2); `ImportResultData` de generated; `AppFileUpload` (+ `FileUploadHandlerEvent`), `AppDialog`, `AppButton` de `@shared/ui`.
- Produces:
  - `<ImportResultSummary result={ImportResultData} />`.
  - `<ImportDialog turmaId visible onHide />`.

- [ ] **Step 1: Criar `components/Enrollment/ImportResultSummary.tsx`**

```tsx
import { useTranslation } from 'react-i18next'
import type { ImportResultData } from '@shared/types/generated'

export function ImportResultSummary({ result }: { result: ImportResultData }) {
  const { t } = useTranslation()
  return (
    <div className="space-y-3 text-sm">
      <p className="font-medium">
        {t('operation.enrollment.import.enrolledVsContracted', {
          enrolled: result.enrolled_total,
          contracted: result.contracted_count,
        })}
      </p>
      <ul className="space-y-1">
        <li>{t('operation.enrollment.import.created')}: {result.created}</li>
        <li>{t('operation.enrollment.import.relinked')}: {result.relinked}</li>
        <li>{t('operation.enrollment.import.alreadyEnrolled')}: {result.already_enrolled}</li>
      </ul>

      {result.moved.length > 0 && (
        <div>
          <p className="font-medium">{t('operation.enrollment.import.moved')}</p>
          <ul className="list-disc pl-5 text-slate-600 dark:text-slate-300">
            {result.moved.map((m, i) => (
              <li key={i}>
                {t('operation.enrollment.import.movedRow', {
                  name: m.name,
                  rut: m.rut,
                  previous: m.previous_client ?? '—',
                  client: m.client,
                })}
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.errors.length > 0 && (
        <div>
          <p className="font-medium text-red-600">{t('operation.enrollment.import.errors')}</p>
          <ul className="list-disc pl-5 text-red-600">
            {result.errors.map((e, i) => (
              <li key={i}>{t('operation.enrollment.import.errorRow', { row: e.row, message: e.message })}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Criar `components/Enrollment/ImportDialog.tsx`**

```tsx
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AppDialog, AppButton, AppFileUpload } from '@shared/ui'
import type { FileUploadHandlerEvent } from '@shared/ui'
import type { ImportResultData } from '@shared/types/generated'
import { useMutationErrors } from '@shared/hooks'
import { useImportStudents } from '../../api/useImportStudents'
import { ImportResultSummary } from './ImportResultSummary'

type Props = {
  turmaId: number
  visible: boolean
  onHide: () => void
}

export function ImportDialog({ turmaId, visible, onHide }: Props) {
  const { t } = useTranslation()
  const importMutation = useImportStudents()
  const { message } = useMutationErrors([importMutation.error])
  const [result, setResult] = useState<ImportResultData | null>(null)

  const upload = (e: FileUploadHandlerEvent) => {
    const file = e.files[0]
    if (!file) return
    importMutation.mutate(
      { turmaId, file },
      { onSuccess: (r) => setResult(r) },
    )
  }

  const close = () => {
    setResult(null)
    importMutation.reset()
    onHide()
  }

  return (
    <AppDialog visible={visible} header={t('operation.enrollment.import.title')} onHide={close}>
      <div className="space-y-4">
        {!result && (
          <>
            <p className="text-sm text-slate-500">{t('operation.enrollment.import.help')}</p>
            <AppFileUpload
              accept=".xlsx,.csv"
              chooseLabel={t('operation.enrollment.import.choose')}
              uploadHandler={upload}
              disabled={importMutation.isPending}
            />
            {importMutation.isPending && (
              <p className="text-sm text-slate-500">{t('operation.enrollment.import.uploading')}</p>
            )}
          </>
        )}

        {result && (
          <>
            <ImportResultSummary result={result} />
            <div className="flex justify-end">
              <AppButton label={t('operation.enrollment.import.close')} onClick={close} />
            </div>
          </>
        )}

        {message && <p className="text-sm text-red-600">{message}</p>}
      </div>
    </AppDialog>
  )
}
```

> `AppFileUpload` é `mode="basic" auto customUpload` (o wrapper fixa `customUpload`) — o upload dispara via `uploadHandler` assim que o arquivo é escolhido; não há botão "enviar" separado. Confirme os nomes de prop (`chooseLabel`, `accept`, `uploadHandler`) contra `primereact/fileupload` (o wrapper repassa tudo). `FileUploadHandlerEvent` é reexportado por `@shared/ui` (via `AppFileUpload`); se o barrel não reexportar, importe de `@shared/ui/AppFileUpload/AppFileUpload` ou adicione o reexport no barrel.

- [ ] **Step 3: Ligar o botão "Importar planilla" no `EnrollmentSection`**

Modify `EnrollmentSection.tsx` — adicione o segundo estado + botão + diálogo:

```tsx
import { ImportDialog } from './ImportDialog'
// ...
  const [importOpen, setImportOpen] = useState(false)
// ...dentro do <div className="flex justify-end gap-2">, ANTES do "Agregar alumno":
        <AppButton
          label={t('operation.enrollment.importSheet')}
          icon="pi pi-upload"
          outlined
          onClick={() => setImportOpen(true)}
        />
// ...e antes do fechamento do container, junto do EnrollStudentForm:
      <ImportDialog turmaId={turma.id!} visible={importOpen} onHide={() => setImportOpen(false)} />
```

- [ ] **Step 4: Verificar build + lint**

Run (de `frontend/`): `pnpm build && pnpm lint`
Expected: verde.

- [ ] **Step 5: Provar na UI**

Numa turma em_andamento, "Importar planilla": suba um xlsx com colunas RUT/Nombre/Email/Teléfono contendo 1 linha válida + 1 RUT inválido. Confirme o resumo: created=1, errors com "Fila 3", `enrolled_total` vs `contracted_count`, e (se houver linha de aluno de outro cliente) a lista de `moved`. Fechar recarrega a tabela com os novos matriculados. Suba um `.pdf` → 422 tratado (mensagem, sem quebrar).

- [ ] **Step 6: Commit**

```bash
git add frontend/src/features/operation/components/Enrollment/ImportResultSummary.tsx \
        frontend/src/features/operation/components/Enrollment/ImportDialog.tsx \
        frontend/src/features/operation/components/Enrollment/EnrollmentSection.tsx
git commit -m "feat(operation): import de planilha de alunos com resumo (created/moved/errors)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 7: Atualizar progress.md e pendencias.md

**Files:**
- Modify: `docs/superpowers/progress.md`
- Modify: `docs/pendencias.md`

- [ ] **Step 1: Atualizar a entrada Ativo no `progress.md`**

Na linha do Bloco 6-frontend (§ tabela), amplie o **Resultado** para citar Exec 2 entregue (aba Alumnos: matrícula individual com pré-check 2 passos, import + resumo, remoção; backend `EnrollPreviewData` + endpoint preview não-mutante). Remova o item **Exec 2** do Backlog (linhas 52-55). Mantenha **Exec 3** e a task de seed no backlog.

- [ ] **Step 2: Registrar desvios em `pendencias.md`**

Adicione lembretes (não corrigir agora):
- Coluna **CLIENTE** da tabela de alunos (spec §3) foi **omitida**: `EnrollmentData` não expõe cliente e o cliente da turma é único (já no cabeçalho). Se a Lotus pedir alunos de multi-cliente na mesma turma, expor `client_name` no `EnrollmentData`.
- Confirmação de remoção via `window.confirm` (se foi o caminho escolhido) — candidato a `ConfirmDialog` de `shared/ui` no futuro.

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/progress.md docs/pendencias.md
git commit -m "docs(operation): progress/pendencias pós Exec 2 (aba Alumnos)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review

**1. Spec coverage (spec §3 aba Alumnos + §5 Exec 2 + §9 DoD Exec 2):**
- Matrícula individual com pré-check 2 passos (D5) → Task 5. ✓
- Import xlsx/csv + `ImportResultSummary` (created/relinked/moved/errors + enrolled vs contracted) → Task 6. ✓
- Remoção → Task 4. ✓
- Tabela NOMBRE(avatar)/RUT/ESTADO + footer count → Task 4. ✓ (coluna CLIENTE omitida conscientemente — registrada Task 7.)
- Endpoint preview não-mutante `EnrollPreviewData` (ramos exists/will_move) → Task 1, feature test MySQL. ✓
- i18n do namespace (`operation.enrollment.*`) → Task 3. ✓ (P-07/`perm.*` é **Exec 3** — fora daqui, correto.)

**2. Placeholder scan:** sem "TBD/TODO". As notas `>` são verificações de contrato de wrapper/factory (o executor confirma contra o código real), não lacunas de conteúdo — cada uma tem a ação concreta.

**3. Type consistency:** `enrollmentKeys.list(turmaId)`, `EnrollPayload`, `useEnrollStudent/useRemoveEnrollment/useEnrollPreview/useImportStudents`, `useEnrollStudentFlow`, `EnrollPreviewData.{exists,name,rut,current_client,will_move,previous_client}` usados de forma idêntica entre Tasks 1→2→5. `ImportResultData.{created,relinked,already_enrolled,moved,errors,enrolled_total,contracted_count}` e `MovedStudentData.{rut,name,previous_client,client}` batem com os DTOs reais lidos no backend. ✓

**Pontos que o executor DEVE confirmar contra o código (não assumir):**
1. API real do `AppDataTable` (coluna via `<Column>` vs descritor) — copiar de `TurmasTable.tsx`.
2. `@shared/ui` exporta `useConfirm`? Se não, remover do hook (Task 4 Step 2) e usar `window.confirm`.
3. `AppButton` repassa `severity="warning"` (Task 5 Step 2).
4. Barrel reexporta `FileUploadHandlerEvent` (Task 6 Step 2).
5. Factory de `User` aceita override de `rut` (Task 1 Step 1).
