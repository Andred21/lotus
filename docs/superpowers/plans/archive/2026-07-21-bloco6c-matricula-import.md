# Bloco 6c · Matrícula + importação de alunos (backend) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar a entidade `Enrollment` e os dois caminhos de matrícula (individual + import xlsx/csv tolerante a erro por linha) sobre `StudentResolver` (6a) e `Turma` (6b).

**Architecture:** `EnrollStudentAction` é a fonte única da matrícula (individual E cada linha do import); `ImportStudentsAction` só orquestra o loop com transação POR LINHA. Parser isolado em `SpreadsheetRowReader` (openspout). Spec: `docs/superpowers/specs/2026-07-21-bloco6c-matricula-import-design.md` (decisões D1–D9).

**Tech Stack:** Laravel 13 / PHP 8.3 (container `app`), openspout/openspout, spatie/laravel-data + typescript-transformer, sqlite `:memory:` nos testes + prova MySQL (lição #15).

## Global Constraints

- Backend roda no container: `docker compose exec -T app php artisan test --filter=X`.
- Main tree (P-03), não worktree. `git add` só dos caminhos da task; Pint só nos arquivos tocados.
- Erros sempre `ValidationException`/RFC 7807 — nunca `abort()` (lei §4).
- Auditoria só na aplicação; delete sempre via `$model->delete()` (lição #5).
- `generated.ts` nunca à mão — regen `php artisan typescript:transform` (lei §3).
- Permissão do bloco: **`operation.enrollment.manage`** (já existe no catálogo/seeder — D8).
- Enum de aprovação: `pendiente|aprobado|reprobado`, default `pendiente`.
- Colunas da planilha (D1): `RUT, Nombre, Email, Teléfono`, linha 1 = cabeçalho.

---

### Task 1: Instalar openspout

**Files:**
- Modify: `backend/composer.json` / `backend/composer.lock` (via composer)

**Interfaces:**
- Produces: classes `OpenSpout\Reader\XLSX\Reader`, `OpenSpout\Reader\CSV\Reader`, `OpenSpout\Writer\XLSX\Writer` (usadas nas Tasks 5–6).

- [ ] **Step 1: Instalar**

Run: `docker compose exec -T app composer require openspout/openspout`
Expected: instala sem conflito (PHP 8.3 ok).

- [ ] **Step 2: Provar que carrega**

Run: `docker compose exec -T app php -r "new \OpenSpout\Reader\XLSX\Reader(); echo 'ok';"`
Expected: `ok`

- [ ] **Step 3: Commit**

```bash
git add backend/composer.json backend/composer.lock
git commit -m "chore(operation): add openspout p/ parser xlsx/csv do import (6c)"
```

---

### Task 2: Migration `enrollments` + model + enum

**Files:**
- Create: `backend/database/migrations/2026_07_21_100000_create_enrollments_table.php`
- Create: `backend/app/Domains/Operation/Enums/EnrollmentApprovalStatus.php`
- Create: `backend/app/Domains/Operation/Models/Enrollment.php`
- Modify: `backend/app/Domains/Operation/Models/Turma.php` (+ `enrollments()`)
- Modify: `backend/app/Providers/AppServiceProvider.php` (+ alias `'enrollment'`)
- Test: `backend/tests/Feature/Operation/EnrollmentModelTest.php`

**Interfaces:**
- Produces: `Enrollment` (Auditable+SoftDeletes; fillable `turma_id, student_id, grades, attendance_pct, approval_status`; relations `turma()`, `student()`), `Turma::enrollments(): HasMany`, enum `EnrollmentApprovalStatus::{Pendiente,Aprobado,Reprobado}`.

- [ ] **Step 1: Teste que falha**

```php
<?php

namespace Tests\Feature\Operation;

use App\Domains\Catalog\Models\Course;
use App\Domains\Commercial\Models\Budget;
use App\Domains\Commercial\Models\Quote;
use App\Domains\Identity\Models\Student;
use App\Domains\Identity\Models\User;
use App\Domains\Operation\Enums\EnrollmentApprovalStatus;
use App\Domains\Operation\Enums\TurmaModalidade;
use App\Domains\Operation\Enums\TurmaStatus;
use App\Domains\Operation\Models\Enrollment;
use App\Domains\Operation\Models\Turma;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EnrollmentModelTest extends TestCase
{
    use RefreshDatabase;

    private Turma $turma;

    private Student $student;

    protected function setUp(): void
    {
        parent::setUp();
        $clientId = User::factory()->create(['type' => 'cliente', 'is_active' => false])
            ->client()->create(['legal_name' => 'ACME', 'type' => 'client'])->id;
        $budget = Budget::create(['client_id' => $clientId, 'code' => 'Scap 1']);
        $course = Course::create(['name' => 'AT', 'workload_hours' => 8]);
        $quote = Quote::create([
            'budget_id' => $budget->id, 'course_id' => $course->id, 'seq_in_budget' => 1,
            'student_count' => 5, 'value_uf' => 10, 'status' => 'approved',
        ]);
        $this->turma = Turma::create([
            'quote_id' => $quote->id, 'course_id' => $course->id,
            'modalidade' => TurmaModalidade::Online, 'local_aplicacao' => null,
            'start_date' => '2026-08-01', 'end_date' => '2026-08-10',
            'status' => TurmaStatus::EmAndamento,
        ]);
        $this->student = Student::create([
            'user_id' => User::factory()->create(['type' => 'aluno', 'is_active' => false])->id,
        ]);
    }

    public function test_matricula_nasce_pendiente_e_relaciona(): void
    {
        $e = Enrollment::create(['turma_id' => $this->turma->id, 'student_id' => $this->student->id]);

        $this->assertSame(EnrollmentApprovalStatus::Pendiente, $e->approval_status);
        $this->assertNull($e->grades);
        $this->assertSame($this->student->id, $e->student->id);
        $this->assertSame(1, $this->turma->enrollments()->count());
    }

    public function test_unique_turma_student_rejeita_duplicata_no_banco(): void
    {
        Enrollment::create(['turma_id' => $this->turma->id, 'student_id' => $this->student->id]);

        $this->expectException(QueryException::class);
        // insert direto: prova o MECANISMO de banco, não a regra de aplicação
        Enrollment::query()->getQuery()->insert([
            'turma_id' => $this->turma->id, 'student_id' => $this->student->id,
            'created_at' => now(), 'updated_at' => now(),
        ]);
    }
}
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `docker compose exec -T app php artisan test --filter=EnrollmentModelTest`
Expected: FAIL (`Class ... Enrollment not found` / tabela inexistente).

- [ ] **Step 3: Migration**

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('enrollments', function (Blueprint $table) {
            $table->id();
            // RESTRICT: turma/aluno com matrícula não somem (peso legal, padrão 6a/6b)
            $table->foreignId('turma_id')->constrained('turmas')->restrictOnDelete();
            $table->foreignId('student_id')->constrained('students')->restrictOnDelete();
            $table->json('grades')->nullable();
            $table->decimal('attendance_pct', 5, 2)->nullable();
            $table->enum('approval_status', ['pendiente', 'aprobado', 'reprobado'])
                ->default('pendiente');
            $table->timestamps();
            $table->softDeletes();
            // fora do constrained() e nomeado — lição 6b: ->unique() encadeado não emite índice
            $table->unique(['turma_id', 'student_id'], 'enrollments_turma_student_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('enrollments');
    }
};
```

- [ ] **Step 4: Enum**

```php
<?php

namespace App\Domains\Operation\Enums;

enum EnrollmentApprovalStatus: string
{
    case Pendiente = 'pendiente';
    case Aprobado = 'aprobado';
    case Reprobado = 'reprobado';
}
```

- [ ] **Step 5: Model**

```php
<?php

namespace App\Domains\Operation\Models;

use App\Domains\Identity\Models\Student;
use App\Domains\Operation\Enums\EnrollmentApprovalStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use OwenIt\Auditing\Auditable;
use OwenIt\Auditing\Contracts\Auditable as AuditableContract;

/**
 * Matrícula: entidade associativa forte aluno↔turma; carrega o resultado
 * acadêmico e origina o certificado (1:0..1). Notas/presença são escritas no 6d.
 */
class Enrollment extends Model implements AuditableContract
{
    use Auditable;
    use SoftDeletes;

    protected $fillable = ['turma_id', 'student_id', 'grades', 'attendance_pct', 'approval_status'];

    protected $auditInclude = ['turma_id', 'student_id', 'grades', 'attendance_pct', 'approval_status'];

    protected $casts = [
        'grades' => 'array',
        'attendance_pct' => 'decimal:2',
        'approval_status' => EnrollmentApprovalStatus::class,
    ];

    public function turma(): BelongsTo
    {
        return $this->belongsTo(Turma::class);
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }
}
```

- [ ] **Step 6: Relation na Turma + morph alias**

Em `Turma.php`, adicionar (import `Illuminate\Database\Eloquent\Relations\HasMany` e a classe):

```php
    public function enrollments(): HasMany
    {
        return $this->hasMany(Enrollment::class);
    }
```

Em `AppServiceProvider`, no `enforceMorphMap`, adicionar:

```php
    'enrollment' => \App\Domains\Operation\Models\Enrollment::class,
```

- [ ] **Step 7: Rodar e ver passar**

Run: `docker compose exec -T app php artisan test --filter=EnrollmentModelTest`
Expected: PASS (2 testes).

- [ ] **Step 8: Commit**

```bash
git add backend/database/migrations/2026_07_21_100000_create_enrollments_table.php \
  backend/app/Domains/Operation/Enums/EnrollmentApprovalStatus.php \
  backend/app/Domains/Operation/Models/Enrollment.php \
  backend/app/Domains/Operation/Models/Turma.php \
  backend/app/Providers/AppServiceProvider.php \
  backend/tests/Feature/Operation/EnrollmentModelTest.php
git commit -m "feat(operation): enrollments — entidade de matrícula com unique turma+aluno (6c)"
```

---

### Task 3: `StudentResolver` aceita email nulo (D9)

**Files:**
- Modify: `backend/app/Domains/Identity/Services/StudentResolver.php`
- Test: `backend/tests/Feature/Identity/StudentResolverTest.php` (adicionar 2 testes)

**Interfaces:**
- Consumes: `StudentResolver::resolveByRut(string $rut, string $name, string $email, ?string $phone, Client $client): StudentResolution` (6a).
- Produces: mesma assinatura com **`?string $email`**; aluno NOVO sem email → `ValidationException` chave `email`; aluno EXISTENTE sem email → resolve normal.

- [ ] **Step 1: Testes que falham** (append em `StudentResolverTest`, usando os helpers já existentes no arquivo para criar client/aluno — seguir o padrão dos testes vizinhos):

```php
    public function test_aluno_novo_sem_email_recusa_por_linha(): void
    {
        $client = $this->makeClient(); // helper existente do arquivo (ajuste ao nome real)

        $this->expectException(ValidationException::class);
        try {
            $this->resolver()->resolveByRut('11.111.111-1', 'Juan Soto', null, null, $client);
        } catch (ValidationException $e) {
            $this->assertArrayHasKey('email', $e->errors());
            throw $e;
        }
    }

    public function test_aluno_existente_sem_email_resolve_normal(): void
    {
        $client = $this->makeClient();
        // cria o aluno com email (1ª passada)
        $first = $this->resolver()->resolveByRut('11.111.111-1', 'Juan Soto', 'juan@acme.cl', null, $client);
        // 2ª passada SEM email: email só é usado no ramo de criação
        $again = $this->resolver()->resolveByRut('11.111.111-1', 'Juan Soto', null, null, $client);

        $this->assertSame($first->student->id, $again->student->id);
    }
```

> Nota ao executor: abra o arquivo e adapte a construção de client/resolver ao helper REAL que os
> testes existentes usam (não invente um novo setup paralelo).

- [ ] **Step 2: Ver falhar**

Run: `docker compose exec -T app php artisan test --filter=StudentResolverTest`
Expected: FAIL — `TypeError` (argumento 3 não aceita null).

- [ ] **Step 3: Mudança no resolver**

Assinatura: `string $email` → `?string $email`. No ramo de criação (antes do `ensureEmailAvailable`):

```php
            if ($user === null) {
                if ($email === null || $email === '') {
                    throw ValidationException::withMessages([
                        'email' => 'E-mail é obrigatório para aluno novo.',
                    ]);
                }
                $this->provisioner->ensureEmailAvailable($email);
```

- [ ] **Step 4: Ver passar (suíte Identity inteira — sem regressão do 6a)**

Run: `docker compose exec -T app php artisan test --filter=StudentResolverTest`
Expected: PASS (todos, antigos + 2 novos).

- [ ] **Step 5: Commit**

```bash
git add backend/app/Domains/Identity/Services/StudentResolver.php \
  backend/tests/Feature/Identity/StudentResolverTest.php
git commit -m "feat(identity): StudentResolver aceita email nulo — obrigatório só p/ aluno novo (6c/D9)"
```

---

### Task 4: `EnrollStudentAction` + `EnrollOutcome`

**Files:**
- Create: `backend/app/Domains/Operation/Services/EnrollOutcome.php`
- Create: `backend/app/Domains/Operation/Actions/EnrollStudentAction.php`
- Test: `backend/tests/Feature/Operation/EnrollStudentActionTest.php`

**Interfaces:**
- Consumes: `StudentResolver::resolveByRut(string, string, ?string, ?string, Client): StudentResolution` (Task 3); `Enrollment` (Task 2); `Turma::quote->budget->client`.
- Produces: `EnrollStudentAction::execute(Turma $turma, string $rut, string $name, ?string $email, ?string $phone): EnrollOutcome`; `EnrollOutcome` readonly `{ Enrollment $enrollment, StudentResolution $resolution, bool $alreadyEnrolled }`.

- [ ] **Step 1: Teste que falha**

```php
<?php

namespace Tests\Feature\Operation;

use App\Domains\Catalog\Models\Course;
use App\Domains\Commercial\Models\Budget;
use App\Domains\Commercial\Models\Quote;
use App\Domains\Identity\Enums\StudentResolutionOutcome;
use App\Domains\Identity\Models\User;
use App\Domains\Operation\Actions\EnrollStudentAction;
use App\Domains\Operation\Enums\TurmaModalidade;
use App\Domains\Operation\Enums\TurmaStatus;
use App\Domains\Operation\Models\Enrollment;
use App\Domains\Operation\Models\Turma;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class EnrollStudentActionTest extends TestCase
{
    use RefreshDatabase;

    private Turma $turma;

    protected function setUp(): void
    {
        parent::setUp();
        $clientId = User::factory()->create(['type' => 'cliente', 'is_active' => false])
            ->client()->create(['legal_name' => 'ACME', 'type' => 'client'])->id;
        $budget = Budget::create(['client_id' => $clientId, 'code' => 'Scap 1']);
        $course = Course::create(['name' => 'AT', 'workload_hours' => 8]);
        $quote = Quote::create([
            'budget_id' => $budget->id, 'course_id' => $course->id, 'seq_in_budget' => 1,
            'student_count' => 2, 'value_uf' => 10, 'status' => 'approved',
        ]);
        $this->turma = Turma::create([
            'quote_id' => $quote->id, 'course_id' => $course->id,
            'modalidade' => TurmaModalidade::Online, 'local_aplicacao' => null,
            'start_date' => '2026-08-01', 'end_date' => '2026-08-10',
            'status' => TurmaStatus::EmAndamento,
        ]);
    }

    private function action(): EnrollStudentAction
    {
        return app(EnrollStudentAction::class);
    }

    public function test_rut_novo_cria_aluno_vinculo_e_matricula(): void
    {
        $outcome = $this->action()->execute($this->turma, '11.111.111-1', 'Juan Soto', 'juan@acme.cl', null);

        $this->assertSame(StudentResolutionOutcome::Created, $outcome->resolution->outcome);
        $this->assertFalse($outcome->alreadyEnrolled);
        $user = $outcome->resolution->student->user;
        $this->assertSame('aluno', $user->type);
        $this->assertFalse((bool) $user->is_active);
        $this->assertSame(1, $this->turma->enrollments()->count());
    }

    public function test_repetido_e_idempotente_already_enrolled(): void
    {
        $this->action()->execute($this->turma, '11.111.111-1', 'Juan Soto', 'juan@acme.cl', null);
        $outcome = $this->action()->execute($this->turma, '11.111.111-1', 'Juan Soto', null, null);

        $this->assertTrue($outcome->alreadyEnrolled);
        $this->assertSame(1, $this->turma->enrollments()->count());
    }

    public function test_turma_fora_de_andamento_recusa_422(): void
    {
        $this->turma->update(['status' => TurmaStatus::Concluida]);

        $this->expectException(ValidationException::class);
        $this->action()->execute($this->turma, '11.111.111-1', 'Juan Soto', 'juan@acme.cl', null);
    }

    public function test_rematricula_restaura_o_mesmo_registro(): void
    {
        $first = $this->action()->execute($this->turma, '11.111.111-1', 'Juan Soto', 'juan@acme.cl', null);
        $first->enrollment->delete(); // remoção (soft)

        $again = $this->action()->execute($this->turma, '11.111.111-1', 'Juan Soto', null, null);

        $this->assertSame($first->enrollment->id, $again->enrollment->id);
        $this->assertNull($again->enrollment->fresh()->deleted_at);
        $this->assertSame(1, Enrollment::withTrashed()->count()); // nunca 2º registro (unique/D7)
    }
}
```

- [ ] **Step 2: Ver falhar**

Run: `docker compose exec -T app php artisan test --filter=EnrollStudentActionTest`
Expected: FAIL (`EnrollStudentAction not found`).

- [ ] **Step 3: `EnrollOutcome`**

```php
<?php

namespace App\Domains\Operation\Services;

use App\Domains\Identity\Services\StudentResolution;
use App\Domains\Operation\Models\Enrollment;

final readonly class EnrollOutcome
{
    public function __construct(
        public Enrollment $enrollment,
        public StudentResolution $resolution,
        public bool $alreadyEnrolled,
    ) {}
}
```

- [ ] **Step 4: `EnrollStudentAction`**

```php
<?php

namespace App\Domains\Operation\Actions;

use App\Domains\Identity\Services\StudentResolver;
use App\Domains\Operation\Enums\TurmaStatus;
use App\Domains\Operation\Models\Enrollment;
use App\Domains\Operation\Models\Turma;
use App\Domains\Operation\Services\EnrollOutcome;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Fonte única da matrícula: o individual e CADA linha do import passam aqui.
 * Turma fora de em_andamento recusa (D4). Reincidência é idempotente; matrícula
 * soft-deletada RESTAURA (o unique inclui removidos — D7/lição #8).
 */
class EnrollStudentAction
{
    public function __construct(private readonly StudentResolver $resolver) {}

    public function execute(Turma $turma, string $rut, string $name, ?string $email, ?string $phone): EnrollOutcome
    {
        if ($turma->status !== TurmaStatus::EmAndamento) {
            throw ValidationException::withMessages([
                'turma' => 'Matrícula só é permitida com a turma em andamento.',
            ]);
        }

        return DB::transaction(function () use ($turma, $rut, $name, $email, $phone) {
            $client = $turma->quote->budget->client; // RF-TUR-03: cliente da cotação
            $resolution = $this->resolver->resolveByRut($rut, $name, $email, $phone, $client);

            $enrollment = Enrollment::withTrashed()
                ->where('turma_id', $turma->id)
                ->where('student_id', $resolution->student->id)
                ->first();

            if ($enrollment !== null && ! $enrollment->trashed()) {
                return new EnrollOutcome($enrollment, $resolution, alreadyEnrolled: true);
            }

            if ($enrollment !== null) {
                $enrollment->restore();
            } else {
                $enrollment = Enrollment::create([
                    'turma_id' => $turma->id,
                    'student_id' => $resolution->student->id,
                ]);
            }

            return new EnrollOutcome($enrollment, $resolution, alreadyEnrolled: false);
        });
    }
}
```

- [ ] **Step 5: Ver passar**

Run: `docker compose exec -T app php artisan test --filter=EnrollStudentActionTest`
Expected: PASS (4 testes).

- [ ] **Step 6: Commit**

```bash
git add backend/app/Domains/Operation/Services/EnrollOutcome.php \
  backend/app/Domains/Operation/Actions/EnrollStudentAction.php \
  backend/tests/Feature/Operation/EnrollStudentActionTest.php
git commit -m "feat(operation): EnrollStudentAction — fonte única da matrícula, gate em_andamento (6c)"
```

---

### Task 5: `SpreadsheetRowReader` (openspout)

**Files:**
- Create: `backend/app/Domains/Operation/Services/SpreadsheetRowReader.php`
- Test: `backend/tests/Feature/Operation/SpreadsheetRowReaderTest.php`

**Interfaces:**
- Produces: `SpreadsheetRowReader::rows(UploadedFile $file): \Generator` — yield `['row' => int (1-based contando cabeçalho), 'rut' => string, 'name' => string, 'email' => ?string, 'phone' => ?string]`. Pula linha 1 (cabeçalho) e linhas vazias; só a 1ª aba.

- [ ] **Step 1: Teste que falha** (fixtures gerados NO teste com o writer do openspout — sem binário no repo):

```php
<?php

namespace Tests\Feature\Operation;

use App\Domains\Operation\Services\SpreadsheetRowReader;
use Illuminate\Http\UploadedFile;
use OpenSpout\Common\Entity\Row;
use OpenSpout\Writer\XLSX\Writer as XlsxWriter;
use Tests\TestCase;

class SpreadsheetRowReaderTest extends TestCase
{
    private function makeXlsx(array $rows): UploadedFile
    {
        $path = tempnam(sys_get_temp_dir(), 'imp').'.xlsx';
        $writer = new XlsxWriter();
        $writer->openToFile($path);
        foreach ($rows as $row) {
            $writer->addRow(Row::fromValues($row));
        }
        $writer->close();

        return new UploadedFile($path, 'alunos.xlsx', null, null, true);
    }

    private function makeCsv(array $rows): UploadedFile
    {
        $path = tempnam(sys_get_temp_dir(), 'imp').'.csv';
        $h = fopen($path, 'w');
        foreach ($rows as $row) {
            fputcsv($h, $row);
        }
        fclose($h);

        return new UploadedFile($path, 'alunos.csv', null, null, true);
    }

    public function test_xlsx_pula_cabecalho_e_linhas_vazias_e_normaliza_opcionais(): void
    {
        $file = $this->makeXlsx([
            ['RUT', 'Nombre', 'Email', 'Teléfono'],
            ['11.111.111-1', 'Juan Soto', 'juan@acme.cl', '+56 9 1111'],
            ['', '', '', ''],
            ['22.222.222-2', 'Ana Rojas', '', ''],
        ]);

        $rows = iterator_to_array((new SpreadsheetRowReader())->rows($file), false);

        $this->assertCount(2, $rows);
        $this->assertSame(2, $rows[0]['row']);
        $this->assertSame('11.111.111-1', $rows[0]['rut']);
        $this->assertSame('juan@acme.cl', $rows[0]['email']);
        $this->assertSame(4, $rows[1]['row']); // linha vazia pulada, numeração preservada
        $this->assertNull($rows[1]['email']);  // '' vira null (D1: opcionais)
        $this->assertNull($rows[1]['phone']);
    }

    public function test_csv_produz_o_mesmo_contrato(): void
    {
        $file = $this->makeCsv([
            ['RUT', 'Nombre', 'Email', 'Teléfono'],
            ['11.111.111-1', 'Juan Soto', 'juan@acme.cl', ''],
        ]);

        $rows = iterator_to_array((new SpreadsheetRowReader())->rows($file), false);

        $this->assertCount(1, $rows);
        $this->assertSame('Juan Soto', $rows[0]['name']);
        $this->assertNull($rows[0]['phone']);
    }
}
```

- [ ] **Step 2: Ver falhar**

Run: `docker compose exec -T app php artisan test --filter=SpreadsheetRowReaderTest`
Expected: FAIL (`SpreadsheetRowReader not found`).

- [ ] **Step 3: Implementação**

```php
<?php

namespace App\Domains\Operation\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Validation\ValidationException;
use OpenSpout\Reader\CSV\Reader as CsvReader;
use OpenSpout\Reader\XLSX\Reader as XlsxReader;

/**
 * Só leitura: itera a planilha de alunos (D1: RUT, Nombre, Email, Teléfono,
 * linha 1 = cabeçalho) e entrega linhas normalizadas. Zero regra de negócio.
 */
class SpreadsheetRowReader
{
    /** @return \Generator<array{row:int,rut:string,name:string,email:?string,phone:?string}> */
    public function rows(UploadedFile $file): \Generator
    {
        $reader = match (strtolower($file->getClientOriginalExtension())) {
            'xlsx' => new XlsxReader(),
            'csv', 'txt' => new CsvReader(),
            default => throw ValidationException::withMessages([
                'file' => 'Formato não suportado — envie xlsx ou csv.',
            ]),
        };

        $reader->open($file->getRealPath());

        try {
            $rowNumber = 0;
            foreach ($reader->getSheetIterator() as $sheet) {
                foreach ($sheet->getRowIterator() as $row) {
                    $rowNumber++;
                    if ($rowNumber === 1) {
                        continue; // cabeçalho (D1)
                    }
                    $cells = array_map(fn ($c) => trim((string) $c), $row->toArray());
                    if (implode('', $cells) === '') {
                        continue; // linha vazia
                    }
                    yield [
                        'row' => $rowNumber,
                        'rut' => $cells[0] ?? '',
                        'name' => $cells[1] ?? '',
                        'email' => ($cells[2] ?? '') !== '' ? $cells[2] : null,
                        'phone' => ($cells[3] ?? '') !== '' ? $cells[3] : null,
                    ];
                }
                break; // só a 1ª aba
            }
        } finally {
            $reader->close();
        }
    }
}
```

- [ ] **Step 4: Ver passar**

Run: `docker compose exec -T app php artisan test --filter=SpreadsheetRowReaderTest`
Expected: PASS (2 testes).

- [ ] **Step 5: Commit**

```bash
git add backend/app/Domains/Operation/Services/SpreadsheetRowReader.php \
  backend/tests/Feature/Operation/SpreadsheetRowReaderTest.php
git commit -m "feat(operation): SpreadsheetRowReader — parser xlsx/csv da planilha de alunos (6c)"
```

---

### Task 6: DTOs de resultado + `ImportStudentsAction`

**Files:**
- Create: `backend/app/Domains/Operation/Data/ImportRowErrorData.php`
- Create: `backend/app/Domains/Operation/Data/MovedStudentData.php`
- Create: `backend/app/Domains/Operation/Data/ImportResultData.php`
- Create: `backend/app/Domains/Operation/Actions/ImportStudentsAction.php`
- Test: `backend/tests/Feature/Operation/ImportStudentsActionTest.php`

**Interfaces:**
- Consumes: `EnrollStudentAction::execute(...): EnrollOutcome` (Task 4), `SpreadsheetRowReader::rows(...)` (Task 5), `StudentResolutionOutcome::{Created,AlreadyLinked,Moved}` (6a).
- Produces: `ImportStudentsAction::execute(Turma $turma, UploadedFile $file): ImportResultData`; `ImportResultData { int $created, int $relinked, int $already_enrolled, MovedStudentData[] $moved, ImportRowErrorData[] $errors, int $enrolled_total, int $contracted_count }`; `MovedStudentData { rut, name, previous_client, client }`; `ImportRowErrorData { int $row, string $message }`.

- [ ] **Step 1: Teste que falha**

```php
<?php

namespace Tests\Feature\Operation;

use App\Domains\Catalog\Models\Course;
use App\Domains\Commercial\Models\Budget;
use App\Domains\Commercial\Models\Quote;
use App\Domains\Identity\Services\StudentResolver;
use App\Domains\Identity\Models\User;
use App\Domains\Operation\Actions\ImportStudentsAction;
use App\Domains\Operation\Enums\TurmaModalidade;
use App\Domains\Operation\Enums\TurmaStatus;
use App\Domains\Operation\Models\Turma;
use App\Domains\Commercial\Models\Client;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Validation\ValidationException;
use OpenSpout\Common\Entity\Row;
use OpenSpout\Writer\XLSX\Writer as XlsxWriter;
use Tests\TestCase;

class ImportStudentsActionTest extends TestCase
{
    use RefreshDatabase;

    private Turma $turma;

    private Client $otherClient;

    protected function setUp(): void
    {
        parent::setUp();
        $client = User::factory()->create(['type' => 'cliente', 'is_active' => false])
            ->client()->create(['legal_name' => 'ACME', 'type' => 'client']);
        $this->otherClient = User::factory()->create(['type' => 'cliente', 'is_active' => false])
            ->client()->create(['legal_name' => 'OTRA', 'type' => 'client']);
        $budget = Budget::create(['client_id' => $client->id, 'code' => 'Scap 1']);
        $course = Course::create(['name' => 'AT', 'workload_hours' => 8]);
        $quote = Quote::create([
            'budget_id' => $budget->id, 'course_id' => $course->id, 'seq_in_budget' => 1,
            'student_count' => 2, 'value_uf' => 10, 'status' => 'approved',
        ]);
        $this->turma = Turma::create([
            'quote_id' => $quote->id, 'course_id' => $course->id,
            'modalidade' => TurmaModalidade::Online, 'local_aplicacao' => null,
            'start_date' => '2026-08-01', 'end_date' => '2026-08-10',
            'status' => TurmaStatus::EmAndamento,
        ]);
    }

    private function xlsx(array $rows): UploadedFile
    {
        $path = tempnam(sys_get_temp_dir(), 'imp').'.xlsx';
        $writer = new XlsxWriter();
        $writer->openToFile($path);
        $writer->addRow(Row::fromValues(['RUT', 'Nombre', 'Email', 'Teléfono']));
        foreach ($rows as $row) {
            $writer->addRow(Row::fromValues($row));
        }
        $writer->close();

        return new UploadedFile($path, 'alunos.xlsx', null, null, true);
    }

    public function test_import_misto_reporta_e_nao_aborta(): void
    {
        // aluno pré-existente vinculado a OUTRO cliente → moved
        app(StudentResolver::class)
            ->resolveByRut('33.333.333-3', 'Pedro Lagos', 'pedro@otra.cl', null, $this->otherClient);

        $result = app(ImportStudentsAction::class)->execute($this->turma, $this->xlsx([
            ['11.111.111-1', 'Juan Soto', 'juan@acme.cl', '+56 9 1111'],   // novo
            ['RUT-INVALIDO', 'Mal Formado', '', ''],                       // erro rut (linha 3)
            ['33.333.333-3', 'Pedro Lagos', '', ''],                       // moved
            ['11.111.111-1', 'Juan Soto', '', ''],                         // duplicado na planilha
            ['44.444.444-4', 'Sin Correo', '', ''],                        // erro email/D9 (linha 6)
        ]));

        $this->assertSame(1, $result->created);
        $this->assertSame(0, $result->relinked);
        $this->assertSame(1, $result->already_enrolled);
        $this->assertCount(1, $result->moved);
        $this->assertSame('OTRA', $result->moved[0]->previous_client);
        $this->assertSame('ACME', $result->moved[0]->client);
        $this->assertCount(2, $result->errors);
        $this->assertSame(3, $result->errors[0]->row);
        $this->assertSame(6, $result->errors[1]->row);
        $this->assertSame(2, $result->enrolled_total);   // Juan + Pedro persistidos
        $this->assertSame(2, $result->contracted_count); // D3: informa, nunca bloqueia
    }

    public function test_reimport_e_idempotente(): void
    {
        $file = fn () => $this->xlsx([['11.111.111-1', 'Juan Soto', 'juan@acme.cl', '']]);
        app(ImportStudentsAction::class)->execute($this->turma, $file());
        $result = app(ImportStudentsAction::class)->execute($this->turma, $file());

        $this->assertSame(0, $result->created);
        $this->assertSame(1, $result->already_enrolled);
        $this->assertSame(1, $result->enrolled_total);
    }

    public function test_turma_fora_de_andamento_recusa_422(): void
    {
        $this->turma->update(['status' => TurmaStatus::Habilitada]);

        $this->expectException(ValidationException::class);
        app(ImportStudentsAction::class)->execute($this->turma, $this->xlsx([]));
    }
}
```

- [ ] **Step 2: Ver falhar**

Run: `docker compose exec -T app php artisan test --filter=ImportStudentsActionTest`
Expected: FAIL (`ImportStudentsAction not found`).

- [ ] **Step 3: DTOs**

`ImportRowErrorData.php`:

```php
<?php

namespace App\Domains\Operation\Data;

use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

#[TypeScript]
class ImportRowErrorData extends Data
{
    public function __construct(
        public int $row,
        public string $message,
    ) {}
}
```

`MovedStudentData.php`:

```php
<?php

namespace App\Domains\Operation\Data;

use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

#[TypeScript]
class MovedStudentData extends Data
{
    public function __construct(
        public string $rut,
        public string $name,
        public ?string $previous_client,
        public string $client,
    ) {}
}
```

`ImportResultData.php`:

```php
<?php

namespace App\Domains\Operation\Data;

use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * Resumo do import (tela-turmas: quantos criados/associados/movidos, linhas com
 * erro). `contracted_count` vs `enrolled_total` é D3: o front avisa, nunca bloqueia.
 */
#[TypeScript]
class ImportResultData extends Data
{
    public function __construct(
        public int $created,
        public int $relinked,
        public int $already_enrolled,
        /** @var MovedStudentData[] */
        public array $moved,
        /** @var ImportRowErrorData[] */
        public array $errors,
        public int $enrolled_total,
        public int $contracted_count,
    ) {}
}
```

- [ ] **Step 4: Action**

```php
<?php

namespace App\Domains\Operation\Actions;

use App\Domains\Identity\Enums\StudentResolutionOutcome;
use App\Domains\Operation\Data\ImportResultData;
use App\Domains\Operation\Data\ImportRowErrorData;
use App\Domains\Operation\Data\MovedStudentData;
use App\Domains\Operation\Enums\TurmaStatus;
use App\Domains\Operation\Models\Turma;
use App\Domains\Operation\Services\SpreadsheetRowReader;
use Illuminate\Http\UploadedFile;
use Illuminate\Validation\ValidationException;

/**
 * Orquestra o import: transação POR LINHA (a do EnrollStudentAction), nunca
 * global — linha com erro é reportada no resumo e a planilha segue (tela-turmas).
 */
class ImportStudentsAction
{
    public function __construct(
        private readonly SpreadsheetRowReader $reader,
        private readonly EnrollStudentAction $enroll,
    ) {}

    public function execute(Turma $turma, UploadedFile $file): ImportResultData
    {
        if ($turma->status !== TurmaStatus::EmAndamento) {
            throw ValidationException::withMessages([
                'turma' => 'Importação só é permitida com a turma em andamento.',
            ]);
        }

        $created = $relinked = $already = 0;
        $moved = [];
        $errors = [];

        foreach ($this->reader->rows($file) as $line) {
            try {
                $outcome = $this->enroll->execute(
                    $turma, $line['rut'], $line['name'], $line['email'], $line['phone'],
                );

                if ($outcome->alreadyEnrolled) {
                    $already++;

                    continue;
                }

                match ($outcome->resolution->outcome) {
                    StudentResolutionOutcome::Created => $created++,
                    StudentResolutionOutcome::AlreadyLinked => $relinked++,
                    StudentResolutionOutcome::Moved => $moved[] = new MovedStudentData(
                        rut: $outcome->resolution->student->user->rut,
                        name: $outcome->resolution->student->user->name,
                        previous_client: $outcome->resolution->previousClient?->legal_name,
                        client: $turma->quote->budget->client->legal_name,
                    ),
                };
            } catch (ValidationException $e) {
                $errors[] = new ImportRowErrorData(
                    row: $line['row'],
                    message: collect($e->errors())->flatten()->implode(' '),
                );
            }
        }

        return new ImportResultData(
            created: $created,
            relinked: $relinked,
            already_enrolled: $already,
            moved: $moved,
            errors: $errors,
            enrolled_total: $turma->enrollments()->count(),
            contracted_count: $turma->quote->student_count,
        );
    }
}
```

- [ ] **Step 5: Ver passar**

Run: `docker compose exec -T app php artisan test --filter=ImportStudentsActionTest`
Expected: PASS (3 testes).

- [ ] **Step 6: Regressão lição #10 — ver o teste pegar o bug**

Edite temporariamente o `catch` da Action para `throw $e;` (simula import que aborta no 1º erro).
Run: `docker compose exec -T app php artisan test --filter=test_import_misto_reporta_e_nao_aborta`
Expected: **FAIL** (ValidationException estoura, linhas boas não persistem). Desfaça a edição e rode
de novo: PASS. Só então o teste vale.

- [ ] **Step 7: Commit**

```bash
git add backend/app/Domains/Operation/Data/ImportRowErrorData.php \
  backend/app/Domains/Operation/Data/MovedStudentData.php \
  backend/app/Domains/Operation/Data/ImportResultData.php \
  backend/app/Domains/Operation/Actions/ImportStudentsAction.php \
  backend/tests/Feature/Operation/ImportStudentsActionTest.php
git commit -m "feat(operation): ImportStudentsAction — import tolerante a erro por linha + resumo (6c)"
```

---

### Task 7: `RemoveEnrollmentAction` + `EnrollmentData` + controller + rotas

**Files:**
- Create: `backend/app/Domains/Operation/Actions/RemoveEnrollmentAction.php`
- Create: `backend/app/Domains/Operation/Data/EnrollmentData.php`
- Create: `backend/app/Domains/Operation/Http/Controllers/EnrollmentController.php`
- Modify: `backend/app/Domains/Operation/routes.php`
- Test: `backend/tests/Feature/Operation/EnrollmentApiTest.php`

**Interfaces:**
- Consumes: `EnrollStudentAction` (Task 4), `ImportStudentsAction` (Task 6), `Enrollment` (Task 2).
- Produces: rotas `GET|POST /api/turmas/{turma}/alunos`, `POST /api/turmas/{turma}/alunos/importar`, `DELETE /api/turmas/{turma}/alunos/{enrollment}` (scoped); `EnrollmentData` (entrada: `rut`, `name`, `email?`, `phone?`; saída: + `id`, `turma_id`, `student_id`, `approval_status`, `attendance_pct`, `grades`).

- [ ] **Step 1: Teste que falha**

```php
<?php

namespace Tests\Feature\Operation;

use App\Domains\Catalog\Models\Course;
use App\Domains\Commercial\Models\Budget;
use App\Domains\Commercial\Models\Quote;
use App\Domains\Identity\Models\User;
use App\Domains\Operation\Enums\TurmaModalidade;
use App\Domains\Operation\Enums\TurmaStatus;
use App\Domains\Operation\Models\Enrollment;
use App\Domains\Operation\Models\Turma;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use OpenSpout\Common\Entity\Row;
use OpenSpout\Writer\XLSX\Writer as XlsxWriter;
use Tests\TestCase;

class EnrollmentApiTest extends TestCase
{
    use RefreshDatabase;

    private Turma $turma;

    protected function setUp(): void
    {
        parent::setUp();
        $clientId = User::factory()->create(['type' => 'cliente', 'is_active' => false])
            ->client()->create(['legal_name' => 'ACME', 'type' => 'client'])->id;
        $budget = Budget::create(['client_id' => $clientId, 'code' => 'Scap 1']);
        $course = Course::create(['name' => 'AT', 'workload_hours' => 8]);
        $quote = Quote::create([
            'budget_id' => $budget->id, 'course_id' => $course->id, 'seq_in_budget' => 1,
            'student_count' => 5, 'value_uf' => 10, 'status' => 'approved',
        ]);
        $this->turma = Turma::create([
            'quote_id' => $quote->id, 'course_id' => $course->id,
            'modalidade' => TurmaModalidade::Online, 'local_aplicacao' => null,
            'start_date' => '2026-08-01', 'end_date' => '2026-08-10',
            'status' => TurmaStatus::EmAndamento,
        ]);
    }

    public function test_matricula_individual_201_e_lista(): void
    {
        $this->actingAsAdmin();

        $this->postJson("/api/turmas/{$this->turma->id}/alunos", [
            'rut' => '11.111.111-1', 'name' => 'Juan Soto', 'email' => 'juan@acme.cl',
        ])
            ->assertCreated()
            ->assertJsonPath('rut', '11.111.111-1')
            ->assertJsonPath('approval_status', 'pendiente');

        $this->getJson("/api/turmas/{$this->turma->id}/alunos")
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.name', 'Juan Soto');
    }

    public function test_individual_sem_rut_valido_422(): void
    {
        $this->actingAsAdmin();

        $this->postJson("/api/turmas/{$this->turma->id}/alunos", [
            'rut' => 'nope', 'name' => 'X',
        ])->assertStatus(422);
    }

    public function test_import_endpoint_retorna_resumo(): void
    {
        $this->actingAsAdmin();
        $path = tempnam(sys_get_temp_dir(), 'imp').'.xlsx';
        $writer = new XlsxWriter();
        $writer->openToFile($path);
        $writer->addRow(Row::fromValues(['RUT', 'Nombre', 'Email', 'Teléfono']));
        $writer->addRow(Row::fromValues(['11.111.111-1', 'Juan Soto', 'juan@acme.cl', '']));
        $writer->addRow(Row::fromValues(['RUT-INVALIDO', 'Mal', '', '']));
        $writer->close();

        $this->postJson(
            "/api/turmas/{$this->turma->id}/alunos/importar",
            ['file' => new UploadedFile($path, 'alunos.xlsx', null, null, true)],
        )
            ->assertOk()
            ->assertJsonPath('created', 1)
            ->assertJsonPath('errors.0.row', 3)
            ->assertJsonPath('contracted_count', 5);
    }

    public function test_import_arquivo_invalido_422(): void
    {
        $this->actingAsAdmin();

        $this->postJson("/api/turmas/{$this->turma->id}/alunos/importar", [
            'file' => UploadedFile::fake()->create('malware.pdf', 10, 'application/pdf'),
        ])->assertStatus(422);
    }

    public function test_destroy_soft_deleta_e_e_scoped(): void
    {
        $this->actingAsAdmin();
        $this->postJson("/api/turmas/{$this->turma->id}/alunos", [
            'rut' => '11.111.111-1', 'name' => 'Juan Soto', 'email' => 'juan@acme.cl',
        ])->assertCreated();
        $enrollment = Enrollment::sole();

        $this->deleteJson("/api/turmas/{$this->turma->id}/alunos/{$enrollment->id}")
            ->assertNoContent();
        $this->assertSoftDeleted('enrollments', ['id' => $enrollment->id]);

        // outra turma não alcança a matrícula (scoped binding → 404)
        $otherQuote = Quote::create([
            'budget_id' => $this->turma->quote->budget_id, 'course_id' => $this->turma->course_id,
            'seq_in_budget' => 2, 'student_count' => 1, 'value_uf' => 5, 'status' => 'approved',
        ]);
        $other = Turma::create([
            'quote_id' => $otherQuote->id, 'course_id' => $this->turma->course_id,
            'modalidade' => TurmaModalidade::Online, 'local_aplicacao' => null,
            'start_date' => '2026-09-01', 'end_date' => '2026-09-10',
            'status' => TurmaStatus::EmAndamento,
        ]);
        $this->deleteJson("/api/turmas/{$other->id}/alunos/{$enrollment->id}")
            ->assertNotFound();
    }

    public function test_sem_permissao_403(): void
    {
        $this->actingAsRedator(); // helper existente; se o nome real divergir, use o padrão dos testes vizinhos

        $this->postJson("/api/turmas/{$this->turma->id}/alunos", [
            'rut' => '11.111.111-1', 'name' => 'Juan Soto', 'email' => 'juan@acme.cl',
        ])->assertForbidden();
    }
}
```

> Nota ao executor: confirme os helpers de auth reais em `tests/TestCase.php` (`actingAsAdmin` existe;
> para o 403 use o helper/role sem `operation.enrollment.manage` que os testes de RBAC vizinhos usam).

- [ ] **Step 2: Ver falhar**

Run: `docker compose exec -T app php artisan test --filter=EnrollmentApiTest`
Expected: FAIL (404 nas rotas).

- [ ] **Step 3: `RemoveEnrollmentAction`**

```php
<?php

namespace App\Domains\Operation\Actions;

use App\Domains\Operation\Enums\TurmaStatus;
use App\Domains\Operation\Models\Enrollment;
use Illuminate\Validation\ValidationException;

class RemoveEnrollmentAction
{
    public function execute(Enrollment $enrollment): void
    {
        if ($enrollment->turma->status !== TurmaStatus::EmAndamento) {
            throw ValidationException::withMessages([
                'turma' => 'Remoção de matrícula só é permitida com a turma em andamento.',
            ]);
        }

        $enrollment->delete(); // model, nunca builder — auditoria (lição #5)
    }
}
```

- [ ] **Step 4: `EnrollmentData`**

```php
<?php

namespace App\Domains\Operation\Data;

use App\Domains\Operation\Enums\EnrollmentApprovalStatus;
use App\Domains\Operation\Models\Enrollment;
use App\Shared\Rules\ValidRut;
use Spatie\LaravelData\Data;
use Spatie\LaravelData\Optional;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * Contrato da matrícula. Entrada (individual): rut+name obrigatórios, email
 * opcional (o Action exige email só p/ aluno NOVO — D9). Resultado acadêmico
 * (grades/attendance/approval) é read-only aqui; escrita é 6d.
 */
#[TypeScript]
class EnrollmentData extends Data
{
    public function __construct(
        public int|Optional $id,
        public int|Optional $turma_id,
        public int|Optional $student_id,
        public string $name,
        public string $rut,
        public ?string $email,
        public ?string $phone,
        public EnrollmentApprovalStatus|Optional $approval_status,
        public string|Optional|null $attendance_pct,
        public array|Optional|null $grades,
    ) {}

    public static function rules(): array
    {
        return [
            'rut' => ['required', 'string', new ValidRut()],
            'name' => ['required', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
        ];
    }

    public static function fromModel(Enrollment $e): self
    {
        return new self(
            id: $e->id,
            turma_id: $e->turma_id,
            student_id: $e->student_id,
            name: $e->student->user->name,
            rut: $e->student->user->rut,
            email: $e->student->user->email,
            phone: $e->student->user->phone,
            approval_status: $e->approval_status,
            attendance_pct: $e->attendance_pct,
            grades: $e->grades,
        );
    }
}
```

> Nota ao executor: confirme o namespace real de `ValidRut` (`App\Shared\Rules\ValidRut` — cheque um
> DTO existente, ex. `ClientData`, e copie o import de lá).

- [ ] **Step 5: Controller**

```php
<?php

namespace App\Domains\Operation\Http\Controllers;

use App\Domains\Operation\Actions\EnrollStudentAction;
use App\Domains\Operation\Actions\ImportStudentsAction;
use App\Domains\Operation\Actions\RemoveEnrollmentAction;
use App\Domains\Operation\Data\EnrollmentData;
use App\Domains\Operation\Data\ImportResultData;
use App\Domains\Operation\Models\Enrollment;
use App\Domains\Operation\Models\Turma;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

class EnrollmentController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('permission:operation.turma.view', only: ['index']),
            new Middleware('permission:operation.enrollment.manage', only: ['store', 'import', 'destroy']),
        ];
    }

    /** @return array<EnrollmentData> */
    public function index(Turma $turma): array
    {
        return $turma->enrollments()->with('student.user')->get()
            ->map(fn (Enrollment $e) => EnrollmentData::fromModel($e))
            ->all();
    }

    public function store(EnrollmentData $data, Turma $turma, EnrollStudentAction $action): JsonResponse
    {
        $outcome = $action->execute($turma, $data->rut, $data->name, $data->email, $data->phone);

        return EnrollmentData::fromModel($outcome->enrollment->load('student.user'))
            ->toResponse(request())
            ->setStatusCode(201);
    }

    public function import(Request $request, Turma $turma, ImportStudentsAction $action): ImportResultData
    {
        $validated = $request->validate([
            'file' => ['required', 'file', 'mimes:xlsx,csv,txt', 'max:10240'],
        ]);

        return $action->execute($turma, $validated['file']);
    }

    public function destroy(Turma $turma, Enrollment $enrollment, RemoveEnrollmentAction $action): Response
    {
        $action->execute($enrollment);

        return response()->noContent();
    }
}
```

- [ ] **Step 6: Rotas** — adicionar ao group de `Operation/routes.php` (import do controller no topo):

```php
    Route::get('turmas/{turma}/alunos', [EnrollmentController::class, 'index']);
    Route::post('turmas/{turma}/alunos', [EnrollmentController::class, 'store']);
    Route::post('turmas/{turma}/alunos/importar', [EnrollmentController::class, 'import']);
    Route::delete('turmas/{turma}/alunos/{enrollment}', [EnrollmentController::class, 'destroy'])
        ->scopeBindings();
```

- [ ] **Step 7: Ver passar**

Run: `docker compose exec -T app php artisan test --filter=EnrollmentApiTest`
Expected: PASS (6 testes).

- [ ] **Step 8: Regenerar tipos TS (lei §3; lição #11 — sem consumidor front hoje, só regen)**

Run: `docker compose exec -T app php artisan typescript:transform`
Depois: `cd frontend && pnpm build` — Expected: build verde (tipos novos são só adição).

- [ ] **Step 9: Commit**

```bash
git add backend/app/Domains/Operation/Actions/RemoveEnrollmentAction.php \
  backend/app/Domains/Operation/Data/EnrollmentData.php \
  backend/app/Domains/Operation/Http/Controllers/EnrollmentController.php \
  backend/app/Domains/Operation/routes.php \
  backend/tests/Feature/Operation/EnrollmentApiTest.php \
  frontend/src/shared/types/generated.ts
git commit -m "feat(operation): endpoints de matrícula — individual, import e remoção (6c)"
```

---

### Task 8: Prova MySQL + suíte inteira + pendência i18n

**Files:**
- Modify: `docs/pendencias.md` (+ pendência chaves `perm.*` de `operation.enrollment.manage`)

**Interfaces:**
- Consumes: tudo acima.

- [ ] **Step 1: Migration contra o MySQL real (lição #15)**

Run: `docker compose exec -T app php artisan migrate`
Expected: `2026_07_21_100000_create_enrollments_table` roda sem erro (sem 1215/índice fantasma).
Depois: `docker compose exec -T app php artisan tinker --execute="echo \Illuminate\Support\Facades\DB::select('SHOW INDEX FROM enrollments')[0]->Table;"` — Expected: `enrollments` (índices existem de fato).

- [ ] **Step 2: Suíte inteira**

Run: `docker compose exec -T app php artisan test`
Expected: PASS total, zero regressão.

- [ ] **Step 3: Pint cirúrgico (só arquivos do bloco)**

Run: `./vendor/bin/pint backend/app/Domains/Operation backend/app/Domains/Identity/Services/StudentResolver.php backend/tests/Feature/Operation backend/tests/Feature/Identity/StudentResolverTest.php`
(ajuste o caminho de execução conforme o repo — NUNCA sem argumento.)

- [ ] **Step 4: Registrar pendência em `docs/pendencias.md`**

Adicionar (seguindo o formato das pendências existentes):

```markdown
- **P-0X · Chaves i18n de `operation.enrollment.manage`** — a permissão já existe no catálogo e
  agora tem rota consumidora (6c), mas as chaves `perm.operation_enrollment_manage` não existem nos
  3 locales — o picker de Roles renderiza chave crua. Fechar no Bloco 6-frontend.
  Gatilho de expiração: entrega do 6-frontend.
```

- [ ] **Step 5: Commit final**

```bash
git add docs/pendencias.md
git commit -m "docs(pendencias): chaves i18n de operation.enrollment.manage ficam p/ 6-frontend (6c)"
```

> A prova e2e via curl (lição #12: `Origin` + `Accept`) e o arquivamento de plano/spec ficam no
> gate `/fechar-sprint`, como nos blocos 6a/6b.
