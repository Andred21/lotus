# Pessoas · Alunos — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** entregar o módulo de Alunos ponta a ponta — listar, ver, criar e editar aluno, com histórico de vínculo com clientes e histórico de turmas — substituindo o empty state fixo da aba `Alumnos` de `PeoplePage`.

**Architecture:** backend DDD-lite no domínio `Identity` (DTOs spatie/laravel-data + duas Actions + controller fino sob `permission:`), reusando os serviços que já são fonte única de regra (`UserProvisioner`, `StudentClientLinkService`). Frontend feature-sliced em `features/identity`, com cliente REST em `shared/api` e um dialog unificado view/edit/create no molde `CrudDialog`.

**Tech Stack:** Laravel 13 / PHP 8.3, spatie/laravel-data + typescript-transformer, spatie/laravel-permission, Pest/PHPUnit sobre sqlite `:memory:`; React 19 + TS, TanStack Query, PrimeReact via `shared/ui`, Tailwind v4 só para layout, i18next em 3 locales.

**Spec:** `docs/superpowers/specs/archive/2026-07-27-bloco-alunos-modulo-design.md` (D1–D11)
**Context packet:** `docs/superpowers/context-packets/bloco-alunos-modulo.md`

## Global Constraints

- Backend roda **no container**: `docker compose exec -T app php artisan ...`. O host WSL não tem mbstring.
- `frontend/src/shared/types/generated.ts` **não se edita à mão** (lei §5.3). Corrija o DTO e regenere.
- Erro de API sobe ao handler global RFC 7807. Proibido `abort(422)` ou montar erro no controller.
- Controller fino: route-model-binding na leitura, Action injetada na escrita, resposta sempre por `XData::fromModel($model)`. Proibido `XData::from([...])` para montar resposta.
- Feature do frontend não importa PrimeReact direto (só via `shared/ui`) nem outra feature — nem para tipo.
- Tailwind é layout; cor vem de variável CSS do tema (`var(--text-color-secondary)` etc.).
- Tabela em card = `useTableFilter` + `AppCardToolbar` + `footerCount`. Não renderizar `AppCardFooter` junto de tabela, não passar `emptyMessage` condicionado a `loading`.
- Aluno **não autentica**: `User` do aluno nasce `type=aluno`, `is_active=false` (RN-01).
- `student_client_logs` é append-only; fechar vínculo é setar `ended_on`. Só `StudentClientLinkService` escreve nele e em `students.current_client_id`.
- Certificados estão **fora do escopo** (D10): não criar coluna `CERTIFICADOS` na listagem nem card `CERTIFICADOS EMITIDOS` no detalhe.
- Ordem das abas de `PeoplePage` **não muda** (D11): `Redactores` continua primeiro.
- `./vendor/bin/pint <arquivos>` — nunca sem argumento.

---

## Task 1: Relação `enrollments` no `Student` e DTOs de histórico

**Executor:** codex

**Files:**
- Modify: `backend/app/Domains/Identity/Models/Student.php`
- Create: `backend/app/Domains/Identity/Data/StudentClientLogData.php`
- Create: `backend/app/Domains/Identity/Data/StudentTurmaData.php`
- Test: `backend/tests/Feature/Identity/StudentHistoryDataTest.php`

**Interfaces:**
- Consumes: `Student::logs()` e `Student::openLog()` (já existem), `Operation\Models\Enrollment`, `Operation\Models\Turma`.
- Produces: `Student::enrollments(): HasMany`; `StudentClientLogData::fromModel(StudentClientLog $log): self` com campos `id, client_id, client_name, started_on, ended_on`; `StudentTurmaData::fromModel(Enrollment $enrollment): self` com campos `turma_id, quote_code, course_name, start_date, approval_status`.

- [ ] **Step 1: Write the failing test**

Create `backend/tests/Feature/Identity/StudentHistoryDataTest.php`:

```php
<?php

namespace Tests\Feature\Identity;

use App\Domains\Catalog\Models\Course;
use App\Domains\Commercial\Models\Budget;
use App\Domains\Commercial\Models\Client;
use App\Domains\Commercial\Models\Quote;
use App\Domains\Identity\Data\StudentClientLogData;
use App\Domains\Identity\Data\StudentTurmaData;
use App\Domains\Identity\Models\Student;
use App\Domains\Identity\Models\User;
use App\Domains\Operation\Enums\TurmaModalidade;
use App\Domains\Operation\Enums\TurmaStatus;
use App\Domains\Operation\Models\Enrollment;
use App\Domains\Operation\Models\Turma;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StudentHistoryDataTest extends TestCase
{
    use RefreshDatabase;

    private function client(string $legalName): Client
    {
        return User::factory()->create(['type' => 'cliente', 'is_active' => false])
            ->client()->create(['legal_name' => $legalName, 'type' => 'client']);
    }

    private function student(): Student
    {
        return Student::create([
            'user_id' => User::factory()->aluno()->create()->id,
        ]);
    }

    public function test_log_data_achata_o_nome_do_cliente_e_o_periodo(): void
    {
        $student = $this->student();
        $client = $this->client('Transelec');

        $log = $student->logs()->create([
            'client_id' => $client->id,
            'started_on' => '2024-01-15',
            'ended_on' => '2025-02-28',
        ]);

        $data = StudentClientLogData::fromModel($log->fresh('client'));

        $this->assertSame($client->id, $data->client_id);
        $this->assertSame('Transelec', $data->client_name);
        $this->assertSame('2024-01-15', $data->started_on);
        $this->assertSame('2025-02-28', $data->ended_on);
    }

    public function test_log_data_mantem_vinculo_aberto_com_ended_on_nulo(): void
    {
        $student = $this->student();
        $client = $this->client('Enel Distribución');

        $log = $student->logs()->create([
            'client_id' => $client->id,
            'started_on' => '2025-03-01',
            'ended_on' => null,
        ]);

        $this->assertNull(StudentClientLogData::fromModel($log->fresh('client'))->ended_on);
    }

    public function test_turma_data_projeta_matricula_com_codigo_da_cotacao(): void
    {
        $student = $this->student();
        $client = $this->client('Subestación Norte S.A.');
        $budget = Budget::create(['client_id' => $client->id, 'code' => 'Scap 9']);
        $course = Course::create(['name' => 'Trabajos en líneas energizadas 220kV', 'workload_hours' => 40]);
        $quote = Quote::create([
            'budget_id' => $budget->id, 'course_id' => $course->id, 'seq_in_budget' => 1,
            'student_count' => 5, 'value_uf' => 10, 'status' => 'approved',
        ]);
        $turma = Turma::create([
            'quote_id' => $quote->id, 'course_id' => $course->id,
            'modalidade' => TurmaModalidade::Presencial, 'local_aplicacao' => 'Santiago',
            'start_date' => '2026-06-01', 'end_date' => '2026-06-10',
            'status' => TurmaStatus::EmAndamento,
        ]);
        $enrollment = Enrollment::create([
            'turma_id' => $turma->id,
            'student_id' => $student->id,
            'approval_status' => 'aprobado',
        ]);

        $data = StudentTurmaData::fromModel($enrollment->fresh(['turma.quote', 'turma.course']));

        $this->assertSame($turma->id, $data->turma_id);
        $this->assertSame($quote->fresh()->code, $data->quote_code);
        $this->assertSame('Trabajos en líneas energizadas 220kV', $data->course_name);
        $this->assertSame('2026-06-01', $data->start_date);
        $this->assertSame('aprobado', $data->approval_status);
    }

    public function test_student_navega_para_as_proprias_matriculas(): void
    {
        $student = $this->student();
        $client = $this->client('ACME');
        $budget = Budget::create(['client_id' => $client->id, 'code' => 'Scap 10']);
        $course = Course::create(['name' => 'AT', 'workload_hours' => 8]);
        $quote = Quote::create([
            'budget_id' => $budget->id, 'course_id' => $course->id, 'seq_in_budget' => 1,
            'student_count' => 5, 'value_uf' => 10, 'status' => 'approved',
        ]);
        $turma = Turma::create([
            'quote_id' => $quote->id, 'course_id' => $course->id,
            'modalidade' => TurmaModalidade::Online, 'local_aplicacao' => null,
            'start_date' => '2026-08-01', 'end_date' => '2026-08-10',
            'status' => TurmaStatus::EmAndamento,
        ]);
        Enrollment::create(['turma_id' => $turma->id, 'student_id' => $student->id]);

        $this->assertCount(1, $student->fresh()->enrollments);
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `docker compose exec -T app php artisan test --filter=StudentHistoryDataTest`
Expected: FAIL — `Class "App\Domains\Identity\Data\StudentClientLogData" not found`.

- [ ] **Step 3: Add the `enrollments` relation to `Student`**

Modify `backend/app/Domains/Identity/Models/Student.php` — acrescente o `use` e o método (a classe já importa `HasMany`):

```php
use App\Domains\Operation\Models\Enrollment;
```

```php
    /**
     * Matrículas do aluno. Identity aponta para Operation aqui pela mesma razão
     * que Catalog\Course aponta para Identity\Redator: a projeção de leitura do
     * aluno precisa do histórico, e um endpoint separado só empurraria a
     * composição para a tela.
     */
    public function enrollments(): HasMany
    {
        return $this->hasMany(Enrollment::class);
    }
```

- [ ] **Step 4: Create `StudentClientLogData`**

Create `backend/app/Domains/Identity/Data/StudentClientLogData.php`:

```php
<?php

namespace App\Domains\Identity\Data;

use App\Domains\Identity\Models\StudentClientLog;
use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * Uma linha do histórico de vínculo aluno↔cliente (RN-10). Só saída: o log é
 * append-only e escrito exclusivamente pelo StudentClientLinkService.
 * `ended_on` nulo = vínculo vigente.
 */
#[TypeScript]
class StudentClientLogData extends Data
{
    public function __construct(
        public int $id,
        public int $client_id,
        public string $client_name,
        public string $started_on,
        public ?string $ended_on,
    ) {}

    public static function fromModel(StudentClientLog $log): self
    {
        return new self(
            id: $log->id,
            client_id: $log->client_id,
            client_name: $log->client->legal_name,
            started_on: $log->started_on->toDateString(),
            ended_on: $log->ended_on?->toDateString(),
        );
    }
}
```

- [ ] **Step 5: Create `StudentTurmaData`**

Create `backend/app/Domains/Identity/Data/StudentTurmaData.php`:

```php
<?php

namespace App\Domains\Identity\Data;

use App\Domains\Operation\Models\Enrollment;
use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * Uma turma no histórico do aluno, projetada a partir da matrícula. Só saída.
 *
 * A turma é identificada por `quote_code` porque turma não tem código próprio
 * (P-13 segue aberta em docs/pendencias.md); o protótipo mostra "TR-45", que
 * hoje não existe no backend.
 */
#[TypeScript]
class StudentTurmaData extends Data
{
    public function __construct(
        public int $turma_id,
        public ?string $quote_code,
        public string $course_name,
        public string $start_date,
        public string $approval_status,
    ) {}

    public static function fromModel(Enrollment $enrollment): self
    {
        $turma = $enrollment->turma;

        return new self(
            turma_id: $turma->id,
            quote_code: $turma->quote?->code,
            course_name: $turma->course->name,
            start_date: $turma->start_date->toDateString(),
            approval_status: $enrollment->approval_status->value,
        );
    }
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `docker compose exec -T app php artisan test --filter=StudentHistoryDataTest`
Expected: PASS — 4 testes.

- [ ] **Step 7: Format and commit**

```bash
./vendor/bin/pint backend/app/Domains/Identity/Data/StudentClientLogData.php backend/app/Domains/Identity/Data/StudentTurmaData.php backend/app/Domains/Identity/Models/Student.php
git add backend/app/Domains/Identity backend/tests/Feature/Identity/StudentHistoryDataTest.php
git commit -m "feat(identity): DTOs de historico do aluno e relacao enrollments"
```

---

## Task 2: `StudentData` e `StudentDetailData`

**Executor:** codex

**Files:**
- Create: `backend/app/Domains/Identity/Data/StudentData.php`
- Create: `backend/app/Domains/Identity/Data/StudentDetailData.php`
- Test: `backend/tests/Feature/Identity/StudentDataTest.php`

**Interfaces:**
- Consumes: `StudentClientLogData::fromModel`, `StudentTurmaData::fromModel` (Task 1).
- Produces: `StudentData::fromModel(Student $student): self` com `id, name, rut, email, phone, client_id, current_client_id, current_client_name, enrollments_count`; `StudentDetailData::fromModel(Student $student): self` com os mesmos campos + `links: StudentClientLogData[]` + `turmas: StudentTurmaData[]`.

- [ ] **Step 1: Write the failing test**

Create `backend/tests/Feature/Identity/StudentDataTest.php`:

```php
<?php

namespace Tests\Feature\Identity;

use App\Domains\Commercial\Models\Client;
use App\Domains\Identity\Data\StudentData;
use App\Domains\Identity\Data\StudentDetailData;
use App\Domains\Identity\Models\Student;
use App\Domains\Identity\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StudentDataTest extends TestCase
{
    use RefreshDatabase;

    private function client(string $legalName): Client
    {
        return User::factory()->create(['type' => 'cliente', 'is_active' => false])
            ->client()->create(['legal_name' => $legalName, 'type' => 'client']);
    }

    public function test_data_achata_os_campos_do_user_e_o_cliente_atual(): void
    {
        $client = $this->client('Transelec');
        $user = User::factory()->aluno()->create([
            'name' => 'María González Rojas',
            'rut' => '12.876.543-K',
            'email' => 'mgonzalez@transelec.cl',
            'phone' => '+56 9 8765 4321',
        ]);
        $student = Student::create(['user_id' => $user->id, 'current_client_id' => $client->id]);

        $data = StudentData::fromModel($student->fresh(['user', 'currentClient']));

        $this->assertSame('María González Rojas', $data->name);
        $this->assertSame('12.876.543-K', $data->rut);
        $this->assertSame('mgonzalez@transelec.cl', $data->email);
        $this->assertSame('+56 9 8765 4321', $data->phone);
        $this->assertSame($client->id, $data->current_client_id);
        $this->assertSame('Transelec', $data->current_client_name);
        $this->assertSame(0, $data->enrollments_count);
    }

    public function test_data_aceita_aluno_sem_cliente_atual(): void
    {
        $student = Student::create(['user_id' => User::factory()->aluno()->create()->id]);

        $data = StudentData::fromModel($student->fresh(['user', 'currentClient']));

        $this->assertNull($data->current_client_id);
        $this->assertNull($data->current_client_name);
    }

    public function test_detail_data_traz_o_historico_de_vinculos_do_mais_recente_ao_mais_antigo(): void
    {
        $antigo = $this->client('Transelec');
        $atual = $this->client('Subestación Norte S.A.');
        $student = Student::create([
            'user_id' => User::factory()->aluno()->create()->id,
            'current_client_id' => $atual->id,
        ]);
        $student->logs()->create(['client_id' => $antigo->id, 'started_on' => '2024-01-01', 'ended_on' => '2025-02-28']);
        $student->logs()->create(['client_id' => $atual->id, 'started_on' => '2025-03-01', 'ended_on' => null]);

        $data = StudentDetailData::fromModel($student->fresh(['user', 'currentClient', 'logs.client', 'enrollments.turma.quote', 'enrollments.turma.course']));

        $this->assertCount(2, $data->links);
        $this->assertSame('Subestación Norte S.A.', $data->links[0]->client_name);
        $this->assertNull($data->links[0]->ended_on);
        $this->assertSame('Transelec', $data->links[1]->client_name);
        $this->assertSame([], $data->turmas);
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `docker compose exec -T app php artisan test --filter=StudentDataTest`
Expected: FAIL — `Class "App\Domains\Identity\Data\StudentData" not found`.

- [ ] **Step 3: Create `StudentData`**

Create `backend/app/Domains/Identity/Data/StudentData.php`:

```php
<?php

namespace App\Domains\Identity\Data;

use App\Domains\Identity\Models\Student;
use App\Shared\Rules\ValidRut;
use Spatie\LaravelData\Attributes\Computed;
use Spatie\LaravelData\Attributes\Validation\Email;
use Spatie\LaravelData\Attributes\Validation\Required;
use Spatie\LaravelData\Data;
use Spatie\LaravelData\Optional;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * Contrato do cadastro de aluno. Campos do usuário-aluno achatados no topo,
 * como no RedatorData.
 *
 * `client_id` é ENTRADA (obrigatório no store, D3 da spec): todo aluno nasce
 * vinculado, e o vínculo é gravado pelo StudentClientLinkService. Na saída, o
 * vínculo vigente aparece em `current_client_id`/`current_client_name`, que são
 * #[Computed] — o update não os aceita, porque trocar de cliente é ato da
 * matrícula.
 */
#[TypeScript]
class StudentData extends Data
{
    public function __construct(
        public int|Optional $id,
        #[Required]
        public string $name,
        #[Required]
        public string $rut,
        #[Required, Email]
        public string $email,
        public string|Optional|null $phone,
        /** Cliente ao qual o aluno é vinculado no cadastro. Só entrada. */
        public int|Optional $client_id,
        #[Computed]
        public ?int $current_client_id = null,
        #[Computed]
        public ?string $current_client_name = null,
        #[Computed]
        public int $enrollments_count = 0,
    ) {}

    public static function rules(): array
    {
        return [
            'rut' => ['required', 'string', new ValidRut],
            'client_id' => ['sometimes', 'integer', 'exists:clients,id'],
        ];
    }

    public static function fromModel(Student $student): self
    {
        return new self(
            id: $student->id,
            name: $student->user->name,
            rut: $student->user->rut,
            email: $student->user->email,
            phone: $student->user->phone,
            client_id: new Optional,
            current_client_id: $student->current_client_id,
            current_client_name: $student->currentClient?->legal_name,
            // `enrollments_count` vem do withCount() do controller; o fallback
            // cobre a chamada direta (testes de unidade) sem gerar N+1 na lista.
            enrollments_count: $student->enrollments_count ?? $student->enrollments()->count(),
        );
    }
}
```

- [ ] **Step 4: Create `StudentDetailData`**

Create `backend/app/Domains/Identity/Data/StudentDetailData.php`:

```php
<?php

namespace App\Domains\Identity\Data;

use App\Domains\Identity\Models\Student;
use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * Projeção de leitura do detalhe do aluno — só saída, usada pelo `show`.
 * Separada de StudentData para que a listagem não carregue logs e matrículas de
 * todos os alunos. Mesmo papel de EnrollPreviewData e PendingQuoteData.
 *
 * Certificados não entram: o domínio Certification não existe (Bloco 7).
 */
#[TypeScript]
class StudentDetailData extends Data
{
    public function __construct(
        public int $id,
        public string $name,
        public string $rut,
        public string $email,
        public ?string $phone,
        public ?int $current_client_id,
        public ?string $current_client_name,
        /** @var array<StudentClientLogData> */
        public array $links,
        /** @var array<StudentTurmaData> */
        public array $turmas,
    ) {}

    public static function fromModel(Student $student): self
    {
        return new self(
            id: $student->id,
            name: $student->user->name,
            rut: $student->user->rut,
            email: $student->user->email,
            phone: $student->user->phone,
            current_client_id: $student->current_client_id,
            current_client_name: $student->currentClient?->legal_name,
            links: $student->logs
                ->sortByDesc('started_on')
                ->values()
                ->map(fn ($log) => StudentClientLogData::fromModel($log))
                ->all(),
            turmas: $student->enrollments
                ->sortByDesc(fn ($enrollment) => $enrollment->turma->start_date)
                ->values()
                ->map(fn ($enrollment) => StudentTurmaData::fromModel($enrollment))
                ->all(),
        );
    }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `docker compose exec -T app php artisan test --filter=StudentDataTest`
Expected: PASS — 3 testes.

- [ ] **Step 6: Format and commit**

```bash
./vendor/bin/pint backend/app/Domains/Identity/Data/StudentData.php backend/app/Domains/Identity/Data/StudentDetailData.php
git add backend/app/Domains/Identity/Data backend/tests/Feature/Identity/StudentDataTest.php
git commit -m "feat(identity): StudentData e StudentDetailData"
```

---

## Task 3: `CreateStudentAction`

**Executor:** codex

**Files:**
- Create: `backend/app/Domains/Identity/Actions/CreateStudentAction.php`
- Test: `backend/tests/Feature/Identity/CreateStudentActionTest.php`

**Interfaces:**
- Consumes: `UserProvisioner::provision(string $type, string $name, string $rut, string $email, ?string $phone): User`, `StudentClientLinkService::link(Student $student, Client $client): LinkOutcome`, `StudentData` (Task 2).
- Produces: `CreateStudentAction::execute(StudentData $data): Student`.

- [ ] **Step 1: Write the failing test**

Create `backend/tests/Feature/Identity/CreateStudentActionTest.php`:

```php
<?php

namespace Tests\Feature\Identity;

use App\Domains\Commercial\Models\Client;
use App\Domains\Identity\Actions\CreateStudentAction;
use App\Domains\Identity\Data\StudentData;
use App\Domains\Identity\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class CreateStudentActionTest extends TestCase
{
    use RefreshDatabase;

    private function client(string $legalName = 'Transelec'): Client
    {
        return User::factory()->create(['type' => 'cliente', 'is_active' => false])
            ->client()->create(['legal_name' => $legalName, 'type' => 'client']);
    }

    private function data(Client $client, string $rut = '12.876.543-K'): StudentData
    {
        return StudentData::from([
            'name' => 'María González Rojas',
            'rut' => $rut,
            'email' => 'mgonzalez@transelec.cl',
            'phone' => '+56 9 8765 4321',
            'client_id' => $client->id,
        ]);
    }

    public function test_cria_user_inativo_student_e_o_primeiro_vinculo(): void
    {
        $client = $this->client();

        $student = app(CreateStudentAction::class)->execute($this->data($client));

        $this->assertDatabaseHas('users', [
            'email' => 'mgonzalez@transelec.cl',
            'type' => 'aluno',
            'is_active' => false,
        ]);
        $this->assertSame($client->id, $student->current_client_id);
        $this->assertDatabaseHas('student_client_logs', [
            'student_id' => $student->id,
            'client_id' => $client->id,
            'ended_on' => null,
        ]);
    }

    public function test_rut_duplicado_vira_erro_de_validacao_e_nao_associacao_silenciosa(): void
    {
        $client = $this->client();
        app(CreateStudentAction::class)->execute($this->data($client));

        $this->expectException(ValidationException::class);

        app(CreateStudentAction::class)->execute(StudentData::from([
            'name' => 'Outro Aluno',
            'rut' => '12.876.543-K',
            'email' => 'outro@transelec.cl',
            'client_id' => $client->id,
        ]));
    }

    public function test_falha_no_meio_nao_deixa_user_orfao(): void
    {
        $client = $this->client();
        User::factory()->create(['email' => 'colisao@transelec.cl']);

        try {
            app(CreateStudentAction::class)->execute(StudentData::from([
                'name' => 'Colisão',
                'rut' => '16.543.210-9',
                'email' => 'colisao@transelec.cl',
                'client_id' => $client->id,
            ]));
            $this->fail('esperava ValidationException por e-mail duplicado');
        } catch (ValidationException) {
            // esperado
        }

        $this->assertDatabaseMissing('users', ['rut' => '16.543.210-9']);
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `docker compose exec -T app php artisan test --filter=CreateStudentActionTest`
Expected: FAIL — `Class "App\Domains\Identity\Actions\CreateStudentAction" not found`.

- [ ] **Step 3: Implement the Action**

Create `backend/app/Domains/Identity/Actions/CreateStudentAction.php`:

```php
<?php

namespace App\Domains\Identity\Actions;

use App\Domains\Commercial\Models\Client;
use App\Domains\Identity\Data\StudentData;
use App\Domains\Identity\Models\Student;
use App\Domains\Identity\Services\StudentClientLinkService;
use App\Domains\Identity\Services\UserProvisioner;
use Illuminate\Support\Facades\DB;
use Spatie\LaravelData\Optional;

/**
 * Cadastro manual de aluno (D2/D3 da spec).
 *
 * NÃO delega ao StudentResolver de propósito: o resolver tem semântica
 * "existe? associa : cria", correta para a planilha de matrícula e errada aqui,
 * onde RUT já cadastrado deve virar 422 em vez de associação silenciosa. A
 * unicidade e o vínculo continuam saindo dos mesmos serviços-fonte
 * (UserProvisioner, StudentClientLinkService), então a regra não duplica.
 */
class CreateStudentAction
{
    public function __construct(
        private readonly UserProvisioner $provisioner,
        private readonly StudentClientLinkService $linkService,
    ) {}

    public function execute(StudentData $data): Student
    {
        return DB::transaction(function () use ($data) {
            $this->provisioner->ensureEmailAvailable($data->email);

            $user = $this->provisioner->provision(
                type: 'aluno',
                name: $data->name,
                rut: $data->rut,
                email: $data->email,
                phone: $data->phone instanceof Optional ? null : $data->phone,
            );

            $student = Student::create(['user_id' => $user->id]);

            $this->linkService->link($student, Client::findOrFail($data->client_id));

            return $student->refresh();
        });
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `docker compose exec -T app php artisan test --filter=CreateStudentActionTest`
Expected: PASS — 3 testes.

- [ ] **Step 5: Format and commit**

```bash
./vendor/bin/pint backend/app/Domains/Identity/Actions/CreateStudentAction.php
git add backend/app/Domains/Identity/Actions/CreateStudentAction.php backend/tests/Feature/Identity/CreateStudentActionTest.php
git commit -m "feat(identity): CreateStudentAction com vinculo obrigatorio"
```

---

## Task 4: `UpdateStudentAction`

**Executor:** codex

**Files:**
- Create: `backend/app/Domains/Identity/Actions/UpdateStudentAction.php`
- Test: `backend/tests/Feature/Identity/UpdateStudentActionTest.php`

**Interfaces:**
- Consumes: `UserProvisioner::ensureRutAvailable(string $rut, ?int $exceptUserId): string`, `UserProvisioner::ensureEmailAvailable(string $email, ?int $exceptUserId): void`, `StudentData`.
- Produces: `UpdateStudentAction::execute(Student $student, StudentData $data): Student`.

- [ ] **Step 1: Write the failing test**

Create `backend/tests/Feature/Identity/UpdateStudentActionTest.php`:

```php
<?php

namespace Tests\Feature\Identity;

use App\Domains\Commercial\Models\Client;
use App\Domains\Identity\Actions\CreateStudentAction;
use App\Domains\Identity\Actions\UpdateStudentAction;
use App\Domains\Identity\Data\StudentData;
use App\Domains\Identity\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class UpdateStudentActionTest extends TestCase
{
    use RefreshDatabase;

    private function client(string $legalName = 'Transelec'): Client
    {
        return User::factory()->create(['type' => 'cliente', 'is_active' => false])
            ->client()->create(['legal_name' => $legalName, 'type' => 'client']);
    }

    public function test_corrige_nome_vindo_errado_da_planilha_sem_tocar_o_vinculo(): void
    {
        $client = $this->client();
        $student = app(CreateStudentAction::class)->execute(StudentData::from([
            'name' => 'Maria Gonzales Roas',
            'rut' => '12.876.543-K',
            'email' => 'mgonzalez@transelec.cl',
            'client_id' => $client->id,
        ]));

        $updated = app(UpdateStudentAction::class)->execute($student, StudentData::from([
            'name' => 'María González Rojas',
            'rut' => '12.876.543-K',
            'email' => 'mgonzalez@transelec.cl',
            'phone' => '+56 9 1111 2222',
        ]));

        $this->assertSame('María González Rojas', $updated->user->name);
        $this->assertSame('+56 9 1111 2222', $updated->user->phone);
        $this->assertSame($client->id, $updated->current_client_id);
        $this->assertDatabaseCount('student_client_logs', 1);
    }

    public function test_ignora_client_id_no_update(): void
    {
        $origem = $this->client('Transelec');
        $outro = $this->client('Enel Distribución');
        $student = app(CreateStudentAction::class)->execute(StudentData::from([
            'name' => 'Pedro Ramírez Silva',
            'rut' => '16.543.210-9',
            'email' => 'pramirez@enel.cl',
            'client_id' => $origem->id,
        ]));

        $updated = app(UpdateStudentAction::class)->execute($student, StudentData::from([
            'name' => 'Pedro Ramírez Silva',
            'rut' => '16.543.210-9',
            'email' => 'pramirez@enel.cl',
            'client_id' => $outro->id,
        ]));

        $this->assertSame($origem->id, $updated->current_client_id);
        $this->assertDatabaseCount('student_client_logs', 1);
    }

    public function test_rut_de_outro_usuario_vira_erro_de_validacao(): void
    {
        $client = $this->client();
        $student = app(CreateStudentAction::class)->execute(StudentData::from([
            'name' => 'Carlos Pérez Muñoz',
            'rut' => '15.234.567-8',
            'email' => 'cperez@subnorte.cl',
            'client_id' => $client->id,
        ]));
        User::factory()->create(['rut' => '12.876.543-K']);

        $this->expectException(ValidationException::class);

        app(UpdateStudentAction::class)->execute($student, StudentData::from([
            'name' => 'Carlos Pérez Muñoz',
            'rut' => '12.876.543-K',
            'email' => 'cperez@subnorte.cl',
        ]));
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `docker compose exec -T app php artisan test --filter=UpdateStudentActionTest`
Expected: FAIL — `Class "App\Domains\Identity\Actions\UpdateStudentAction" not found`.

- [ ] **Step 3: Implement the Action**

Create `backend/app/Domains/Identity/Actions/UpdateStudentAction.php`:

```php
<?php

namespace App\Domains\Identity\Actions;

use App\Domains\Identity\Data\StudentData;
use App\Domains\Identity\Models\Student;
use App\Domains\Identity\Services\UserProvisioner;
use Illuminate\Support\Facades\DB;
use Spatie\LaravelData\Optional;

/**
 * Edita os dados pessoais do aluno. NÃO toca vínculo (D3 da spec): trocar aluno
 * de cliente continua sendo ato da matrícula, pelo StudentClientLinkService.
 * `client_id` que venha no payload é ignorado de propósito.
 */
class UpdateStudentAction
{
    public function __construct(private readonly UserProvisioner $provisioner) {}

    public function execute(Student $student, StudentData $data): Student
    {
        return DB::transaction(function () use ($student, $data) {
            $user = $student->user;

            $rut = $this->provisioner->ensureRutAvailable($data->rut, $user->id);
            $this->provisioner->ensureEmailAvailable($data->email, $user->id);

            $user->update([
                'name' => $data->name,
                'rut' => $rut,
                'email' => $data->email,
                'phone' => $data->phone instanceof Optional ? $user->phone : $data->phone,
            ]);

            return $student->refresh();
        });
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `docker compose exec -T app php artisan test --filter=UpdateStudentActionTest`
Expected: PASS — 3 testes.

- [ ] **Step 5: Format and commit**

```bash
./vendor/bin/pint backend/app/Domains/Identity/Actions/UpdateStudentAction.php
git add backend/app/Domains/Identity/Actions/UpdateStudentAction.php backend/tests/Feature/Identity/UpdateStudentActionTest.php
git commit -m "feat(identity): UpdateStudentAction sem tocar vinculo"
```

---

## Task 5: `StudentController`, rotas e catálogo de permissões

**Executor:** codex

**Files:**
- Create: `backend/app/Domains/Identity/Http/Controllers/StudentController.php`
- Modify: `backend/app/Domains/Identity/routes.php`
- Modify: `backend/app/Domains/Identity/Support/PermissionCatalog.php:33-36`
- Test: `backend/tests/Feature/Identity/StudentCrudTest.php`

**Interfaces:**
- Consumes: `CreateStudentAction::execute`, `UpdateStudentAction::execute`, `StudentData::fromModel`, `StudentDetailData::fromModel`.
- Produces: rotas `GET /api/students`, `GET /api/students/{student}`, `POST /api/students`, `PUT /api/students/{student}`.

- [ ] **Step 1: Write the failing test**

Create `backend/tests/Feature/Identity/StudentCrudTest.php`:

```php
<?php

namespace Tests\Feature\Identity;

use App\Domains\Commercial\Models\Client;
use App\Domains\Identity\Actions\CreateStudentAction;
use App\Domains\Identity\Data\StudentData;
use App\Domains\Identity\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StudentCrudTest extends TestCase
{
    use RefreshDatabase;

    private function client(string $legalName = 'Transelec'): Client
    {
        return User::factory()->create(['type' => 'cliente', 'is_active' => false])
            ->client()->create(['legal_name' => $legalName, 'type' => 'client']);
    }

    public function test_lista_alunos_com_cliente_atual(): void
    {
        $this->actingAsAdmin();
        $client = $this->client();
        app(CreateStudentAction::class)->execute(StudentData::from([
            'name' => 'Carlos Pérez Muñoz',
            'rut' => '15.234.567-8',
            'email' => 'cperez@subnorte.cl',
            'client_id' => $client->id,
        ]));

        $this->getJson('/api/students')
            ->assertOk()
            ->assertJsonPath('0.name', 'Carlos Pérez Muñoz')
            ->assertJsonPath('0.current_client_name', 'Transelec')
            ->assertJsonPath('0.enrollments_count', 0);
    }

    public function test_cria_aluno_pela_api_e_grava_o_primeiro_vinculo(): void
    {
        $this->actingAsAdmin();
        $client = $this->client();

        $response = $this->postJson('/api/students', [
            'name' => 'María González Rojas',
            'rut' => '12.876.543-K',
            'email' => 'mgonzalez@transelec.cl',
            'phone' => '+56 9 8765 4321',
            'client_id' => $client->id,
        ]);

        $id = $response->assertCreated()->json('id');
        $this->assertDatabaseHas('users', ['email' => 'mgonzalez@transelec.cl', 'type' => 'aluno', 'is_active' => false]);
        $this->assertDatabaseHas('student_client_logs', ['student_id' => $id, 'client_id' => $client->id, 'ended_on' => null]);
    }

    public function test_rut_invalido_vira_422_com_a_chave_rut(): void
    {
        $this->actingAsAdmin();
        $client = $this->client();

        $this->postJson('/api/students', [
            'name' => 'RUT Ruim',
            'rut' => '15.234.567-0',
            'email' => 'ruim@transelec.cl',
            'client_id' => $client->id,
        ])->assertStatus(422)->assertJsonPath('errors.rut.0', fn ($m) => is_string($m));
    }

    public function test_rut_duplicado_vira_422(): void
    {
        $this->actingAsAdmin();
        $client = $this->client();
        app(CreateStudentAction::class)->execute(StudentData::from([
            'name' => 'Carlos Pérez Muñoz',
            'rut' => '15.234.567-8',
            'email' => 'cperez@subnorte.cl',
            'client_id' => $client->id,
        ]));

        $this->postJson('/api/students', [
            'name' => 'Homônimo',
            'rut' => '15.234.567-8',
            'email' => 'outro@subnorte.cl',
            'client_id' => $client->id,
        ])->assertStatus(422);
    }

    public function test_detalhe_traz_vinculos_e_turmas(): void
    {
        $this->actingAsAdmin();
        $antigo = $this->client('Transelec');
        $atual = $this->client('Subestación Norte S.A.');
        $student = app(CreateStudentAction::class)->execute(StudentData::from([
            'name' => 'Carlos Pérez Muñoz',
            'rut' => '15.234.567-8',
            'email' => 'cperez@subnorte.cl',
            'client_id' => $antigo->id,
        ]));
        app(\App\Domains\Identity\Services\StudentClientLinkService::class)->link($student, $atual);

        $this->getJson("/api/students/{$student->id}")
            ->assertOk()
            ->assertJsonPath('current_client_name', 'Subestación Norte S.A.')
            ->assertJsonCount(2, 'links')
            ->assertJsonPath('links.0.ended_on', null)
            ->assertJsonPath('turmas', []);
    }

    public function test_atualiza_dados_pessoais(): void
    {
        $this->actingAsAdmin();
        $client = $this->client();
        $student = app(CreateStudentAction::class)->execute(StudentData::from([
            'name' => 'Maria Gonzales Roas',
            'rut' => '12.876.543-K',
            'email' => 'mgonzalez@transelec.cl',
            'client_id' => $client->id,
        ]));

        $this->putJson("/api/students/{$student->id}", [
            'name' => 'María González Rojas',
            'rut' => '12.876.543-K',
            'email' => 'mgonzalez@transelec.cl',
        ])->assertOk()->assertJsonPath('name', 'María González Rojas');
    }

    public function test_redator_autenticado_nao_acessa_alunos(): void
    {
        $this->seed(RolePermissionSeeder::class);
        $user = User::factory()->redator()->create(['is_active' => true]);
        $user->assignRole('redator');
        $this->actingAs($user, 'web');

        $this->getJson('/api/students')->assertForbidden();
        $this->postJson('/api/students', [])->assertForbidden();
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `docker compose exec -T app php artisan test --filter=StudentCrudTest`
Expected: FAIL — 404 nas rotas (`/api/students` não existe).

- [ ] **Step 3: Create the controller**

Create `backend/app/Domains/Identity/Http/Controllers/StudentController.php`:

```php
<?php

namespace App\Domains\Identity\Http\Controllers;

use App\Domains\Identity\Actions\CreateStudentAction;
use App\Domains\Identity\Actions\UpdateStudentAction;
use App\Domains\Identity\Data\StudentData;
use App\Domains\Identity\Data\StudentDetailData;
use App\Domains\Identity\Models\Student;
use App\Http\Controllers\Controller;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

/**
 * Cadastro de aluno. Sem `destroy` (D1 da spec): enrollments.student_id é
 * restrictOnDelete e o soft delete do Student arrasta o User — apagar aluno com
 * matrícula é perda de rastro com peso legal.
 *
 * Permissões: reusa identity.user.* como o RedatorController, a outra extensão
 * 1:1 de User na mesma tela (D8).
 */
class StudentController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('permission:identity.user.view', only: ['index', 'show']),
            new Middleware('permission:identity.user.create', only: ['store']),
            new Middleware('permission:identity.user.update', only: ['update']),
        ];
    }

    /** @return array<StudentData> */
    public function index(): array
    {
        return Student::with(['user', 'currentClient'])
            ->withCount('enrollments')
            ->get()
            ->sortBy(fn (Student $s) => $s->user->name)
            ->values()
            ->map(fn (Student $s) => StudentData::fromModel($s))
            ->all();
    }

    public function store(StudentData $data, CreateStudentAction $action): StudentData
    {
        return StudentData::fromModel($action->execute($data));
    }

    public function show(Student $student): StudentDetailData
    {
        return StudentDetailData::fromModel($student->load([
            'user',
            'currentClient',
            'logs.client',
            'enrollments.turma.quote',
            'enrollments.turma.course',
        ]));
    }

    public function update(StudentData $data, Student $student, UpdateStudentAction $action): StudentData
    {
        return StudentData::fromModel($action->execute($student, $data));
    }
}
```

- [ ] **Step 4: Register the routes**

Modify `backend/app/Domains/Identity/routes.php` — acrescente o `use` no topo e o bloco de rota logo abaixo do `apiResource('users', ...)`:

```php
use App\Domains\Identity\Http\Controllers\StudentController;
```

```php
    Route::apiResource('students', StudentController::class)
        ->only(['index', 'store', 'show', 'update']);
```

- [ ] **Step 5: Update the permission catalog**

Modify `backend/app/Domains/Identity/Support/PermissionCatalog.php` — as três descrições passam a citar alunos (a permissão em si não muda, D8):

```php
            'identity.user.view' => 'Ver usuários, redatores e alunos',
            'identity.user.create' => 'Criar usuários, redatores e alunos',
            'identity.user.update' => 'Editar usuários, redatores e alunos',
```

- [ ] **Step 6: Run the student tests**

Run: `docker compose exec -T app php artisan test --filter=StudentCrudTest`
Expected: PASS — 7 testes.

- [ ] **Step 7: Run the full suite**

Run: `docker compose exec -T app php artisan test`
Expected: PASS. `PermissionCatalogTest` compara chaves, não descrições; se algum teste afirmar a descrição literal antiga, atualize-o no mesmo commit.

- [ ] **Step 8: Format and commit**

```bash
./vendor/bin/pint backend/app/Domains/Identity/Http/Controllers/StudentController.php backend/app/Domains/Identity/routes.php backend/app/Domains/Identity/Support/PermissionCatalog.php
git add backend/app/Domains/Identity backend/tests/Feature/Identity/StudentCrudTest.php
git commit -m "feat(identity): API de alunos sob identity.user.*"
```

---

## Task 6: Tipos gerados e camada de dados do frontend

**Executor:** claude

**Files:**
- Modify: `frontend/src/shared/types/generated.ts` (gerado — não editar à mão)
- Create: `frontend/src/shared/api/studentsApi.ts`
- Create: `frontend/src/features/identity/api/useStudentDetail.ts`

**Interfaces:**
- Consumes: `StudentData`, `StudentDetailData`, `StudentClientLogData`, `StudentTurmaData` (Tasks 1–2, via `@shared/types/generated`).
- Produces: `studentsApi` (`useList`, `useCreate`, `useUpdate`, `keys`); `useStudentDetail(id: number | null | undefined)` devolvendo `UseQueryResult<StudentDetailData, ProblemDetails>`.

- [ ] **Step 1: Regenerate the types**

Run: `docker compose exec -T app php artisan typescript:transform`
Expected: `frontend/src/shared/types/generated.ts` passa a conter `StudentData`, `StudentDetailData`, `StudentClientLogData` e `StudentTurmaData`.

- [ ] **Step 2: Verify nothing broke**

Run: `cd frontend && pnpm build`
Expected: PASS. As adições são novas interfaces; nenhum consumidor existente muda de forma. Se quebrar, o DTO é que está errado — corrija o DTO e regenere, nunca o `generated.ts`.

- [ ] **Step 3: Create the REST client**

Create `frontend/src/shared/api/studentsApi.ts`:

```ts
import { createCrudResource } from './createCrudResource'
import type { StudentData } from '@shared/types/generated'

/** Cliente REST do recurso `students`. Camada de dados compartilhada (ADR-18).
 *
 * `useOne` desta fábrica NÃO é usado: o detalhe do aluno responde
 * `StudentDetailData` (com vínculos e turmas), não `StudentData`, e vive em
 * `features/identity/api/useStudentDetail.ts`. */
export const studentsApi = createCrudResource<StudentData>('students')
```

- [ ] **Step 4: Create the detail hook**

Create `frontend/src/features/identity/api/useStudentDetail.ts`:

```ts
import { useQuery } from '@tanstack/react-query'
import { api } from '@shared/api/axios'
import type { ProblemDetails } from '@shared/api/axios'
import { studentsApi } from '@shared/api/studentsApi'
import type { StudentDetailData } from '@shared/types/generated'

/**
 * Detalhe do aluno — projeção própria do `show`, com vínculos e turmas.
 *
 * Não usa `studentsApi.useOne` porque o tipo de retorno difere do da listagem;
 * a chave é a mesma da fábrica para o cache não fragmentar.
 */
export function useStudentDetail(id: number | null | undefined) {
  return useQuery<StudentDetailData, ProblemDetails>({
    queryKey: studentsApi.keys.detail(id ?? 'none'),
    queryFn: async () => (await api.get<StudentDetailData>(`/api/students/${id}`)).data,
    enabled: id != null,
  })
}
```

- [ ] **Step 5: Verify build and lint**

Run: `cd frontend && pnpm build && pnpm lint`
Expected: PASS, sem warning novo.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/shared/types/generated.ts frontend/src/shared/api/studentsApi.ts frontend/src/features/identity/api/useStudentDetail.ts
git commit -m "feat(identity): tipos gerados e camada de dados de alunos"
```

---

## Task 7: i18n do módulo de alunos

**Executor:** claude

**Files:**
- Modify: `frontend/src/shared/config/locales/es-CL.json`
- Modify: `frontend/src/shared/config/locales/pt-BR.json`
- Modify: `frontend/src/shared/config/locales/en.json`

**Interfaces:**
- Produces: namespace `student.*` (usado pelas Tasks 8–10) e as descrições `perm.identity_user_*` atualizadas para casarem com o `PermissionCatalog` da Task 5.

As 3 chaves `perm.identity_user_{view,create,update}` mudam de texto; `perm.identity_user_delete` **não** muda (não há delete de aluno).

- [ ] **Step 1: Add the `student` namespace to `es-CL.json`**

Acrescente, no mesmo nível de `redator`:

```json
  "student": {
    "new": "Nuevo alumno",
    "create": "Registrar alumno",
    "empty": "Sin alumnos",
    "emptyHint": "Registra el primer alumno para comenzar.",
    "count": "{{count}} alumnos",
    "searchPlaceholder": "Buscar por nombre o RUT...",
    "name": "Nombre completo",
    "currentClient": "Cliente actual",
    "noClient": "— Sin cliente",
    "turmas": "Turmas",
    "sectionPersonal": "Datos personales",
    "sectionLinks": "Vínculo con empresas",
    "sectionTurmas": "Historial de turmas",
    "client": "Empresa",
    "linkCurrent": "Actual",
    "linkSince": "desde {{date}}",
    "linkRange": "{{from}} – {{to}}",
    "noLinks": "Sin vínculos registrados",
    "noTurmas": "Sin turmas registradas",
    "turmaCode": "Código",
    "turmaCourse": "Curso",
    "turmaDate": "Fecha",
    "turmaStatus": "Estado",
    "clientLocked": "El cambio de empresa se hace en la matrícula."
  },
```

E substitua as 3 descrições em `perm`:

```json
    "identity_user_view": "Ver usuarios, redactores y alumnos",
    "identity_user_create": "Crear usuarios, redactores y alumnos",
    "identity_user_update": "Editar usuarios, redactores y alumnos",
```

- [ ] **Step 2: Add the same keys to `pt-BR.json`**

```json
  "student": {
    "new": "Novo aluno",
    "create": "Cadastrar aluno",
    "empty": "Sem alunos",
    "emptyHint": "Cadastre o primeiro aluno para começar.",
    "count": "{{count}} alunos",
    "searchPlaceholder": "Buscar por nome ou RUT...",
    "name": "Nome completo",
    "currentClient": "Cliente atual",
    "noClient": "— Sem cliente",
    "turmas": "Turmas",
    "sectionPersonal": "Dados pessoais",
    "sectionLinks": "Vínculo com empresas",
    "sectionTurmas": "Histórico de turmas",
    "client": "Empresa",
    "linkCurrent": "Atual",
    "linkSince": "desde {{date}}",
    "linkRange": "{{from}} – {{to}}",
    "noLinks": "Sem vínculos registrados",
    "noTurmas": "Sem turmas registradas",
    "turmaCode": "Código",
    "turmaCourse": "Curso",
    "turmaDate": "Data",
    "turmaStatus": "Estado",
    "clientLocked": "A troca de empresa é feita na matrícula."
  },
```

```json
    "identity_user_view": "Ver usuários, redatores e alunos",
    "identity_user_create": "Criar usuários, redatores e alunos",
    "identity_user_update": "Editar usuários, redatores e alunos",
```

- [ ] **Step 3: Add the same keys to `en.json`**

```json
  "student": {
    "new": "New student",
    "create": "Register student",
    "empty": "No students",
    "emptyHint": "Register the first student to get started.",
    "count": "{{count}} students",
    "searchPlaceholder": "Search by name or RUT...",
    "name": "Full name",
    "currentClient": "Current client",
    "noClient": "— No client",
    "turmas": "Turmas",
    "sectionPersonal": "Personal data",
    "sectionLinks": "Company links",
    "sectionTurmas": "Turma history",
    "client": "Company",
    "linkCurrent": "Current",
    "linkSince": "since {{date}}",
    "linkRange": "{{from}} – {{to}}",
    "noLinks": "No links recorded",
    "noTurmas": "No turmas recorded",
    "turmaCode": "Code",
    "turmaCourse": "Course",
    "turmaDate": "Date",
    "turmaStatus": "Status",
    "clientLocked": "Company changes happen at enrollment."
  },
```

```json
    "identity_user_view": "View users, editors and students",
    "identity_user_create": "Create users, editors and students",
    "identity_user_update": "Edit users, editors and students",
```

- [ ] **Step 4: Verify the three locales have identical keys**

Run:

```bash
cd frontend && node -e "
const a=require('./src/shared/config/locales/es-CL.json'),b=require('./src/shared/config/locales/pt-BR.json'),c=require('./src/shared/config/locales/en.json');
const flat=(o,p='')=>Object.entries(o).flatMap(([k,v])=>typeof v==='object'&&v?flat(v,p+k+'.'):[p+k]);
const [A,B,C]=[flat(a),flat(b),flat(c)].map(x=>x.sort().join('|'));
console.log(A===B&&B===C ? 'OK: chaves idênticas' : 'DIVERGENTE');
"
```

Expected: `OK: chaves idênticas`.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/shared/config/locales
git commit -m "feat(i18n): namespace student e permissoes citando alunos"
```

---

## Task 8: `StudentsTable`

**Executor:** claude

**Files:**
- Create: `frontend/src/features/identity/components/Student/StudentsTable.tsx`
- Create: `frontend/src/features/identity/hooks/useStudentsPage.ts`

**Interfaces:**
- Consumes: `studentsApi` (Task 6), `student.*` (Task 7), `useCrudPage`, `useTableFilter`.
- Produces: `useStudentsPage()`; `<StudentsTable students loading error onRetry onView actions />`.

- [ ] **Step 1: Create the page hook**

Create `frontend/src/features/identity/hooks/useStudentsPage.ts`:

```ts
import { useCrudPage } from '@shared/hooks'
import { studentsApi } from '@shared/api/studentsApi'

export function useStudentsPage() {
  return useCrudPage(studentsApi)
}
```

- [ ] **Step 2: Create the table**

Create `frontend/src/features/identity/components/Student/StudentsTable.tsx`:

```tsx
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useTableFilter } from '@shared/hooks'
import {
  AppDataTable, AppColumn, AppAvatar, AppInputText, AppButton,
  AppCardToolbar, AppEmptyState,
} from '@shared/ui'
import type { StudentData } from '@shared/types/generated'

export function StudentsTable({
  students, loading, onView, actions, error, onRetry,
}: {
  students: StudentData[]
  loading: boolean
  onView: (s: StudentData) => void
  actions?: ReactNode
  error?: { detail?: string | null } | null
  onRetry?: () => void
}) {
  const { t } = useTranslation()
  const table = useTableFilter(students, (s) => [s.name, s.rut])

  const empty = table.term === '' ? (
    <AppEmptyState icon="pi pi-user" title={t('student.empty')} description={t('student.emptyHint')} action={actions} />
  ) : (
    <AppEmptyState
      icon="pi pi-search"
      title={t('common.noResults', { term: table.filter.trim() })}
      description={t('common.noResultsHint')}
      action={<AppButton label={t('common.clearSearch')} icon="pi pi-times" text onClick={table.clear} />}
    />
  )

  return (
    <>
      <AppCardToolbar
        start={
          <div className="min-w-64 flex-1">
            <AppInputText
              leftIcon="pi pi-search"
              placeholder={t('student.searchPlaceholder')}
              value={table.filter}
              onChange={(e) => table.onFilterChange(e.target.value)}
            />
          </div>
        }
        end={error ? undefined : actions}
      />
      <AppDataTable
        value={table.rows}
        loading={loading}
        error={error}
        onRetry={onRetry}
        emptyMessage={empty}
        footerCount={t('student.count', { count: table.rows.length })}
        first={table.first}
        onPage={table.onPage}
      >
        <AppColumn
          field="name"
          header={t('student.name')}
          sortable
          body={(s: StudentData) => (
            <div className="flex items-center gap-3">
              <AppAvatar name={s.name} size="normal" />
              <div>
                <p className="font-medium">{s.name}</p>
                <p className="text-xs" style={{ color: 'var(--text-color-secondary)' }}>{s.email}</p>
              </div>
            </div>
          )}
        />
        <AppColumn
          header={t('common.rut')}
          body={(s: StudentData) => <span className="font-mono text-sm">{s.rut}</span>}
        />
        <AppColumn
          header={t('student.currentClient')}
          body={(s: StudentData) =>
            s.current_client_name ?? (
              <span style={{ color: 'var(--text-color-secondary)' }}>{t('student.noClient')}</span>
            )
          }
        />
        <AppColumn
          header={t('student.turmas')}
          body={(s: StudentData) => <span className="font-semibold">{s.enrollments_count}</span>}
        />
        <AppColumn
          body={(s: StudentData) => (
            <AppButton icon="pi pi-eye" text rounded aria-label={t('common.view')} onClick={() => onView(s)} />
          )}
          style={{ width: '4rem' }}
        />
      </AppDataTable>
    </>
  )
}
```

- [ ] **Step 3: Verify build and lint**

Run: `cd frontend && pnpm build && pnpm lint`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/features/identity/components/Student/StudentsTable.tsx frontend/src/features/identity/hooks/useStudentsPage.ts
git commit -m "feat(identity): tabela de alunos"
```

---

## Task 9: `useStudentForm` e `StudentDialog`

**Executor:** claude

**Files:**
- Create: `frontend/src/features/identity/hooks/useStudentForm.ts`
- Create: `frontend/src/features/identity/components/Student/StudentDialog.tsx`

**Interfaces:**
- Consumes: `useEntityForm`, `useMutationErrors`, `studentsApi`, `useStudentDetail` (Task 6), `clientsApi`, `student.*` (Task 7).
- Produces: `<StudentDialog visible mode student onHide onEdit />`.

- [ ] **Step 1: Create the form hook**

Create `frontend/src/features/identity/hooks/useStudentForm.ts`:

```ts
import { useEntityForm, useMutationErrors } from '@shared/hooks'
import type { StudentData } from '@shared/types/generated'
import type { DialogMode } from '@shared/lib'
import { studentsApi } from '@shared/api/studentsApi'

/** Só os campos que o formulário edita. Os derivados de leitura
 * (`current_client_*`, `enrollments_count`) ficam de fora. */
export type StudentFormFields = Pick<StudentData, 'id' | 'name' | 'rut' | 'email' | 'phone'> & {
  client_id: number | null
}

const EMPTY: StudentFormFields = {
  id: undefined, name: '', rut: '', email: '', phone: null, client_id: null,
}

const toFields = (s: StudentFormFields): StudentFormFields => {
  const { id, name, rut, email, phone } = s
  return structuredClone({ id, name, rut, email, phone, client_id: null })
}

export function useStudentForm(student: StudentData | null, mode: DialogMode, onDone: () => void) {
  const entity: StudentFormFields | null = student
    ? { id: student.id, name: student.name, rut: student.rut, email: student.email, phone: student.phone ?? null, client_id: student.current_client_id ?? null }
    : null

  const { form, set, readOnly } = useEntityForm<StudentFormFields>(entity, mode, EMPTY, toFields)

  const create = studentsApi.useCreate()
  const update = studentsApi.useUpdate()

  function submit() {
    if (mode === 'create') {
      create.mutate(
        { name: form.name, rut: form.rut, email: form.email, phone: form.phone, client_id: form.client_id },
        { onSuccess: onDone },
      )
      return
    }
    // client_id não vai no update: trocar de empresa é ato da matrícula (D3).
    update.mutate(
      { id: student!.id as number, payload: { name: form.name, rut: form.rut, email: form.email, phone: form.phone } },
      { onSuccess: onDone },
    )
  }

  const { fieldErrors, generalError } = useMutationErrors([create.error, update.error])

  return {
    form, set, readOnly, submit,
    pending: create.isPending || update.isPending,
    fieldErrors, generalError,
  }
}
```

- [ ] **Step 2: Create the dialog**

Create `frontend/src/features/identity/components/Student/StudentDialog.tsx`:

```tsx
import { useTranslation } from 'react-i18next'
import {
  CrudDialog, AppAvatar, AppInputText, AppDropdown, AppTag, AppDataTable, AppColumn,
  AppSkeleton, AppErrorState, FormField, FormSection, FormErrorBanner,
} from '@shared/ui'
import type { StudentData, StudentTurmaData, StudentClientLogData } from '@shared/types/generated'
import type { DialogMode } from '@shared/lib'
import { clientsApi } from '@shared/api/clientsApi'
import { useStudentDetail } from '../../api/useStudentDetail'
import { useStudentForm } from '../../hooks/useStudentForm'

/**
 * Severidade do estado da matrícula. O helper equivalente vive em
 * `features/operation/lib/enrollmentStatus.ts` e NÃO pode ser importado daqui:
 * feature não importa outra feature, nem para tipo (ADR-05, lei §5.6). A chave
 * de i18n `operation.enrollment.status.*` é reusada porque chave de tradução não
 * é import de código.
 */
const APPROVAL_SEVERITY: Record<string, 'success' | 'danger' | 'info'> = {
  aprobado: 'success', reprobado: 'danger', pendiente: 'info',
}

const monthYear = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('es-CL', { month: 'short', year: 'numeric' })

export function StudentDialog({
  visible, mode, student, onHide, onEdit,
}: {
  visible: boolean
  mode: DialogMode
  student: StudentData | null
  onHide: () => void
  onEdit?: () => void
}) {
  const { t } = useTranslation()
  const { form, set, readOnly, submit, pending, fieldErrors, generalError } = useStudentForm(student, mode, onHide)
  const clients = clientsApi.useList()
  const detail = useStudentDetail(mode === 'create' ? null : student?.id)

  return (
    <CrudDialog
      visible={visible}
      mode={mode}
      title={mode === 'create' ? t('student.new') : form.name}
      onHide={onHide}
      onEdit={onEdit}
      onSubmit={submit}
      pending={pending}
      submitLabel={mode === 'create' ? t('student.create') : undefined}
      headerExtra={mode !== 'create' ? <AppAvatar name={form.name} size="normal" /> : null}
    >
      <FormErrorBanner message={generalError} />

      <section className="space-y-4">
        <FormSection title={t('student.sectionPersonal')} />
        <FormField label={t('student.name')} error={fieldErrors?.name?.[0]}>
          <AppInputText value={form.name} disabled={readOnly} onChange={(e) => set('name', e.target.value)} className="w-full" />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label={t('common.rut')} error={fieldErrors?.rut?.[0]}>
            <AppInputText value={form.rut} disabled={readOnly} onChange={(e) => set('rut', e.target.value)} className="w-full" />
          </FormField>
          <FormField label={t('common.email')} error={fieldErrors?.email?.[0]}>
            <AppInputText value={form.email} disabled={readOnly} onChange={(e) => set('email', e.target.value)} className="w-full" />
          </FormField>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label={t('common.phone')}>
            <AppInputText value={form.phone ?? ''} disabled={readOnly} onChange={(e) => set('phone', e.target.value)} className="w-full" />
          </FormField>
          <FormField label={t('student.client')} error={fieldErrors?.client_id?.[0]}>
            <AppDropdown
              value={form.client_id}
              disabled={readOnly || mode === 'edit'}
              options={(clients.data ?? []).map((c) => ({ label: c.legal_name, value: c.id }))}
              onChange={(e) => set('client_id', e.value as number)}
              className="w-full"
            />
            {mode === 'edit' && (
              <p className="mt-1 text-xs" style={{ color: 'var(--text-color-secondary)' }}>
                {t('student.clientLocked')}
              </p>
            )}
          </FormField>
        </div>

        {mode === 'view' && (
          <>
            <FormSection title={t('student.sectionLinks')} spaced />
            {detail.isLoading && <AppSkeleton height="4rem" />}
            {detail.isError && (
              <AppErrorState
                title={t('common.loadError')}
                detail={detail.error?.detail ?? t('common.loadErrorHint')}
                retryLabel={t('common.retry')}
                onRetry={() => void detail.refetch()}
              />
            )}
            {detail.data && (detail.data.links.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--text-color-secondary)' }}>{t('student.noLinks')}</p>
            ) : (
              <ul className="space-y-2">
                {detail.data.links.map((link: StudentClientLogData) => (
                  <li key={link.id} className="flex items-center justify-between rounded border border-slate-200 p-3 dark:border-slate-700">
                    <span className="text-sm font-medium">{link.client_name}</span>
                    <span className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-color-secondary)' }}>
                      {link.ended_on === null && <AppTag value={t('student.linkCurrent')} severity="info" />}
                      {link.ended_on === null
                        ? t('student.linkSince', { date: monthYear(link.started_on) })
                        : t('student.linkRange', { from: monthYear(link.started_on), to: monthYear(link.ended_on) })}
                    </span>
                  </li>
                ))}
              </ul>
            ))}

            <FormSection title={t('student.sectionTurmas')} spaced />
            {detail.isLoading && <AppSkeleton height="6rem" />}
            {detail.data && (
              <AppDataTable value={detail.data.turmas} emptyMessage={t('student.noTurmas')}>
                <AppColumn
                  header={t('student.turmaCode')}
                  body={(turma: StudentTurmaData) => (
                    <span className="font-mono text-sm" style={{ color: 'var(--primary-color)' }}>{turma.quote_code}</span>
                  )}
                />
                <AppColumn header={t('student.turmaCourse')} body={(turma: StudentTurmaData) => turma.course_name} />
                <AppColumn header={t('student.turmaDate')} body={(turma: StudentTurmaData) => monthYear(turma.start_date)} />
                <AppColumn
                  header={t('student.turmaStatus')}
                  body={(turma: StudentTurmaData) => (
                    <AppTag
                      value={t(`operation.enrollment.status.${turma.approval_status}`)}
                      severity={APPROVAL_SEVERITY[turma.approval_status] ?? 'info'}
                    />
                  )}
                />
              </AppDataTable>
            )}
          </>
        )}
      </section>
    </CrudDialog>
  )
}
```

- [ ] **Step 3: Verify build and lint**

Run: `cd frontend && pnpm build && pnpm lint`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/features/identity/hooks/useStudentForm.ts frontend/src/features/identity/components/Student/StudentDialog.tsx
git commit -m "feat(identity): dialog de aluno com vinculos e historico"
```

---

## Task 10: Ligar a aba `Alumnos` e provar o DoD

**Executor:** claude

**Files:**
- Modify: `frontend/src/features/identity/components/PeoplePage.tsx`

**Interfaces:**
- Consumes: `useStudentsPage` (Task 8), `StudentsTable` (Task 8), `StudentDialog` (Task 9).

- [ ] **Step 1: Wire the tab**

Modify `frontend/src/features/identity/components/PeoplePage.tsx` — a ordem das abas **não muda** (D11): `Redactores` continua primeiro. Só o corpo da aba `Alumnos` troca o empty state fixo pelo conteúdo real.

Imports novos:

```tsx
import { useStudentsPage } from '../hooks/useStudentsPage'
import { StudentsTable } from './Student/StudentsTable'
import { StudentDialog } from './Student/StudentDialog'
```

No corpo do componente, junto de `const page = useRedatoresPage()`:

```tsx
  const students = useStudentsPage()
```

Substitua o conteúdo da aba de alunos:

```tsx
          <ModuleTab header={t('redator.tabStudents')}>
            <StudentsTable
              students={students.items}
              loading={students.loading}
              error={students.error}
              onRetry={students.refetch}
              onView={students.openView}
              actions={
                can('identity.user.create')
                  ? <AppButton variant="brandIcon" label={t('student.new')} icon="pi pi-user-plus" onClick={students.openCreate} />
                  : undefined
              }
            />
          </ModuleTab>
```

E, ao lado do `RedatorDialog` já existente:

```tsx
      {students.dialog && (
        <StudentDialog
          visible
          mode={students.dialog.mode}
          student={students.dialog.entity}
          onHide={students.close}
          onEdit={students.startEdit}
        />
      )}
```

Remova o import de `AppEmptyState` se ele ficar sem uso, e a chave `redator.studentsPlaceholder` dos 3 locales.

- [ ] **Step 2: Verify build and lint**

Run: `cd frontend && pnpm build && pnpm lint`
Expected: PASS, sem import órfão.

- [ ] **Step 3: Prove the DoD against the real API**

Suba `docker compose up -d` e `pnpm dev`, entre como admin e execute, na tela:

1. `Nuevo alumno` → preencher nome, RUT válido, email, telefone e empresa → salvar. Conferir no banco:

```bash
docker compose exec -T mysql mysql -uroot -proot lotus -e "
select u.name, u.type, u.is_active, s.current_client_id from students s join users u on u.id=s.user_id order by s.id desc limit 1;
select student_id, client_id, started_on, ended_on from student_client_logs order by id desc limit 1;"
```

Esperado: `type=aluno`, `is_active=0`, `current_client_id` preenchido e **uma linha de log com `ended_on` NULL**.

2. Repetir o cadastro com o mesmo RUT → 422 com a mensagem no campo RUT, e nenhum aluno novo na lista.
3. Abrir o aluno, `Editar`, trocar o nome, salvar, reabrir → nome novo; conferir que `student_client_logs` continua com uma linha só.
4. Abrir um aluno do `OperationDemoSeeder` → vínculo atual marcado `Actual`, vínculo anterior com período fechado, e o histórico de turmas com o estado correto.
5. `docker compose stop app` → recarregar a aba: a tabela mostra erro com `Reintentar`, **não** empty state. Abrir um aluno já em cache: as seções de vínculo e turmas mostram erro, não listas vazias. `docker compose start app` e `Reintentar` → volta.
6. Com um usuário sem `identity.user.create`, o botão `Nuevo alumno` some; `curl` direto no `POST /api/students` devolve 403.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/features/identity/components/PeoplePage.tsx frontend/src/shared/config/locales
git commit -m "feat(identity): aba Alumnos ligada ao modulo real"
```

---

## Handoff de execução

**executor: misto** — dividido por camada, conforme D-handoff da spec (§8).

| Tasks | Executor | Verificação |
|---|---|---|
| 1–5 | **codex** | `docker compose exec -T app php artisan test` |
| 6–10 | **claude** | `pnpm build` + `pnpm lint` + prova na tela |

**`paths_autorizados` do Codex (Tasks 1–5):**

```
backend/app/Domains/Identity/Data/**
backend/app/Domains/Identity/Actions/**
backend/app/Domains/Identity/Http/Controllers/StudentController.php
backend/app/Domains/Identity/Models/Student.php
backend/app/Domains/Identity/Support/PermissionCatalog.php
backend/app/Domains/Identity/routes.php
backend/tests/Feature/Identity/**
```

O Codex **não** toca `frontend/**`, migrations, seeders nem `generated.ts`. Nenhuma migration é necessária: `students.current_client_id` já é nullable e `student_client_logs` já existe.

**Revisão dupla** (decisão do João em 2026-07-27):

- Tasks 1–5 (Codex) → revisão do Claude contra `.claude/rules/backend-ddd.md`, `generated-types.md` e o `CLAUDE.md` §5. Achado de rule violada volta como correção, não como observação.
- Tasks 6–10 (Claude) → revisão independente do Codex.

## Notas de escopo

- **Certificados não entram** (D10): sem coluna `CERTIFICADOS` na listagem, sem card `CERTIFICADOS EMITIDOS` no detalhe. O protótipo mostra os dois; a divergência é deliberada e some quando o Bloco 7 criar o domínio Certification.
- **Sem `destroy`** (D1): remoção de aluno vira item de backlog no fechamento.
- **P-13 segue aberta:** a turma aparece por `quote_code`; o `TR-45` do protótipo não existe no backend.
