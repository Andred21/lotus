# Bloco 6a · Aluno + vínculo cliente + resolução por RUT — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar a fundação backend do Sprint 3: `Student` como extensão 1:1 de `User`, o histórico de vínculo aluno↔cliente (RN-10) e o serviço de resolução por RUT que a importação de alunos da Turma (bloco 6c) vai invocar.

**Architecture:** DDD-lite (ADR-02). `Student`/`StudentClientLog` no domínio `Identity`. O invariante "1 vínculo aberto por aluno" é garantido por **coluna gerada + índice único** no banco (mecanismo, não instrução) e mantido pelo `StudentClientLinkService` (fonte única de escrita do vínculo). O `StudentResolver` resolve uma linha de planilha pelo RUT: existe→associa, não existe→cria via `UserProvisioner`. Sem REST/tela/`StudentData` (YAGNI — nascem com consumidor).

**Tech Stack:** Laravel 13 · PHP 8.3 · MySQL 8 (prod) / sqlite `:memory:` (testes) · owen-it/laravel-auditing · spatie/laravel-permission.

## Global Constraints

- Backend roda **no container**: `docker compose exec -T app php artisan …`. Host WSL não tem mbstring.
- Testes: integração sqlite `:memory:` (ADR-02), sem mock. `docker compose exec -T app php artisan test --filter=NomeTest`.
- **DoD = comportamento provado, não build verde** (Lei #8). Teste de regressão só vale depois de vê-lo **reprovar** contra o código antigo (lição #10).
- Nomes de schema em **inglês** (decisão do João; `redator` é exceção de nome próprio).
- **SEM Repository sobre Eloquent** (ADR-02/Lei #1). List/show sem regra vão direto ao Eloquent.
- **Aluno não autentica:** `type=aluno`, `is_active=false`, **sem role** Spatie (Lei #5, RN-01).
- Auditoria só na aplicação (Lei #2/ADR-08). Todo model Auditable/polimórfico registra alias no morph map (ADR-10).
- Migrations na pasta global `database/migrations/` (não por domínio).
- Pint com argumentos só nos arquivos tocados: `./vendor/bin/pint <arquivos>` — **nunca** sem argumento.
- `git add` só os caminhos exatos da task. Rode `git status` antes; WIP do João no working tree é intocável (lição #9).
- Trabalho no **main tree** (pendência P-03: toque de backend não usa worktree).

---

## File Structure

**Criados:**
- `backend/database/migrations/2026_07_20_000001_create_students_table.php` — tabela `students`.
- `backend/database/migrations/2026_07_20_000002_create_student_client_logs_table.php` — tabela `student_client_logs` + coluna gerada única.
- `backend/app/Domains/Identity/Models/Student.php` — model aluno (Auditable, SoftDeletes).
- `backend/app/Domains/Identity/Models/StudentClientLog.php` — histórico (append-only, sem soft-delete).
- `backend/app/Domains/Identity/Enums/LinkOutcome.php` — resultado do link service.
- `backend/app/Domains/Identity/Enums/StudentResolutionOutcome.php` — resultado do resolver.
- `backend/app/Domains/Identity/Services/StudentClientLinkService.php` — invariante RN-10.
- `backend/app/Domains/Identity/Services/StudentResolution.php` — DTO de resultado do resolver.
- `backend/app/Domains/Identity/Services/StudentResolver.php` — resolução por RUT.
- `backend/tests/Feature/Identity/StudentClientLogConstraintTest.php`
- `backend/tests/Feature/Identity/StudentModelTest.php`
- `backend/tests/Feature/Identity/StudentClientLinkServiceTest.php`
- `backend/tests/Feature/Identity/StudentResolverTest.php`

**Modificados:**
- `backend/app/Domains/Identity/Models/User.php` — adiciona relação `student()`.
- `backend/app/Providers/AppServiceProvider.php` — adiciona alias `'student'` no morph map.
- `backend/database/factories/UserFactory.php` — adiciona estado `aluno()`.

---

## Task 1: Schema — `students` + `student_client_logs` com constraint de vínculo aberto

**Files:**
- Create: `backend/database/migrations/2026_07_20_000001_create_students_table.php`
- Create: `backend/database/migrations/2026_07_20_000002_create_student_client_logs_table.php`
- Test: `backend/tests/Feature/Identity/StudentClientLogConstraintTest.php`

**Interfaces:**
- Consumes: tabelas existentes `users`, `clients`.
- Produces: tabelas `students` (`id`, `user_id`, `current_client_id`, `timestamps`, `deleted_at`) e `student_client_logs` (`id`, `student_id`, `client_id`, `started_on`, `ended_on`, `open_link_student_id` gerada única, `timestamps`).

- [ ] **Step 1: Escrever as duas migrations**

`backend/database/migrations/2026_07_20_000001_create_students_table.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('students', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained('users')->cascadeOnDelete();
            $table->foreignId('current_client_id')->nullable()->constrained('clients')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('students');
    }
};
```

`backend/database/migrations/2026_07_20_000002_create_student_client_logs_table.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('student_client_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained('students')->cascadeOnDelete();
            $table->foreignId('client_id')->constrained('clients')->restrictOnDelete();
            $table->date('started_on');
            $table->date('ended_on')->nullable();
            // Vínculo aberto (ended_on IS NULL) carrega o student_id; fechado carrega NULL.
            // UNIQUE → o banco rejeita um 2º vínculo aberto para o mesmo aluno (RN-10, approach B).
            // Suportado em MySQL 8 e sqlite >= 3.31.
            $table->unsignedBigInteger('open_link_student_id')
                ->storedAs('CASE WHEN ended_on IS NULL THEN student_id END');
            $table->timestamps();

            $table->unique('open_link_student_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('student_client_logs');
    }
};
```

- [ ] **Step 2: Escrever o teste de constraint (que prova o mecanismo de banco)**

`backend/tests/Feature/Identity/StudentClientLogConstraintTest.php`:

```php
<?php

namespace Tests\Feature\Identity;

use App\Domains\Commercial\Models\Client;
use App\Domains\Identity\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class StudentClientLogConstraintTest extends TestCase
{
    use RefreshDatabase;

    public function test_banco_rejeita_segundo_vinculo_aberto_do_mesmo_aluno(): void
    {
        [$studentId, $clientId] = $this->makeStudentAndClient();

        DB::table('student_client_logs')->insert([
            'student_id' => $studentId,
            'client_id' => $clientId,
            'started_on' => '2026-01-01',
            'ended_on' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->expectException(QueryException::class);

        DB::table('student_client_logs')->insert([
            'student_id' => $studentId,
            'client_id' => $clientId,
            'started_on' => '2026-02-01',
            'ended_on' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function test_permite_multiplos_vinculos_fechados(): void
    {
        [$studentId, $clientId] = $this->makeStudentAndClient();

        DB::table('student_client_logs')->insert([
            ['student_id' => $studentId, 'client_id' => $clientId, 'started_on' => '2026-01-01', 'ended_on' => '2026-01-31', 'created_at' => now(), 'updated_at' => now()],
            ['student_id' => $studentId, 'client_id' => $clientId, 'started_on' => '2026-02-01', 'ended_on' => '2026-02-28', 'created_at' => now(), 'updated_at' => now()],
        ]);

        $this->assertSame(2, DB::table('student_client_logs')->where('student_id', $studentId)->count());
    }

    /** @return array{0:int,1:int} */
    private function makeStudentAndClient(): array
    {
        $studentUser = User::factory()->create(['type' => 'aluno', 'is_active' => false]);
        $studentId = DB::table('students')->insertGetId([
            'user_id' => $studentUser->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $clientUser = User::factory()->create(['type' => 'cliente', 'is_active' => false]);
        $client = Client::create(['user_id' => $clientUser->id, 'legal_name' => 'Empresa X']);

        return [$studentId, $client->id];
    }
}
```

- [ ] **Step 3: Rodar migrations e o teste**

Run: `docker compose exec -T app php artisan test --filter=StudentClientLogConstraintTest`
Expected: PASS (2 testes). `RefreshDatabase` roda as migrations em sqlite `:memory:`; o 2º insert de vínculo aberto estoura `QueryException`, os dois fechados convivem.

- [ ] **Step 4: Pint nos arquivos tocados**

Run: `docker compose exec -T app ./vendor/bin/pint database/migrations/2026_07_20_000001_create_students_table.php database/migrations/2026_07_20_000002_create_student_client_logs_table.php tests/Feature/Identity/StudentClientLogConstraintTest.php`
Expected: sem erros de estilo.

- [ ] **Step 5: Commit**

```bash
git add backend/database/migrations/2026_07_20_000001_create_students_table.php backend/database/migrations/2026_07_20_000002_create_student_client_logs_table.php backend/tests/Feature/Identity/StudentClientLogConstraintTest.php
git commit -m "feat(identity): schema students + student_client_logs com constraint de vínculo aberto

Coluna gerada open_link_student_id + índice único garante 1 vínculo aberto
por aluno no banco (RN-10). Provado: 2º vínculo aberto estoura QueryException.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: Models `Student` + `StudentClientLog` + relação em User + estado de factory

**Files:**
- Create: `backend/app/Domains/Identity/Models/Student.php`
- Create: `backend/app/Domains/Identity/Models/StudentClientLog.php`
- Modify: `backend/app/Domains/Identity/Models/User.php` (adicionar `student()`)
- Modify: `backend/app/Providers/AppServiceProvider.php` (alias `'student'`)
- Modify: `backend/database/factories/UserFactory.php` (estado `aluno()`)
- Test: `backend/tests/Feature/Identity/StudentModelTest.php`

**Interfaces:**
- Consumes: tabelas da Task 1; `User`, `Client` models.
- Produces:
  - `Student` (Eloquent): `->user()`, `->currentClient()`, `->logs()`, `->openLog()`; fillable `['user_id','current_client_id']`; soft-delete cascateia para o `User`.
  - `StudentClientLog` (Eloquent): `->student()`, `->client()`; fillable `['student_id','client_id','started_on','ended_on']`; casts `started_on`/`ended_on` = date.
  - `User->student()`: HasOne `Student`.
  - `UserFactory::aluno()`: state `type=aluno`, `is_active=false`.

- [ ] **Step 1: Escrever o teste do model**

`backend/tests/Feature/Identity/StudentModelTest.php`:

```php
<?php

namespace Tests\Feature\Identity;

use App\Domains\Commercial\Models\Client;
use App\Domains\Identity\Models\Student;
use App\Domains\Identity\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StudentModelTest extends TestCase
{
    use RefreshDatabase;

    public function test_student_navega_user_client_e_logs(): void
    {
        $studentUser = User::factory()->aluno()->create();
        $student = Student::create(['user_id' => $studentUser->id]);

        $clientUser = User::factory()->create(['type' => 'cliente', 'is_active' => false]);
        $client = Client::create(['user_id' => $clientUser->id, 'legal_name' => 'Empresa X']);

        $student->update(['current_client_id' => $client->id]);
        $student->logs()->create(['client_id' => $client->id, 'started_on' => '2026-01-01', 'ended_on' => null]);

        $student->refresh();

        $this->assertTrue($student->user->is($studentUser));
        $this->assertTrue($student->currentClient->is($client));
        $this->assertCount(1, $student->logs);
        $this->assertNotNull($student->openLog);
        $this->assertTrue($studentUser->student->is($student));
    }

    public function test_soft_delete_do_student_cascateia_para_o_user(): void
    {
        $studentUser = User::factory()->aluno()->create();
        $student = Student::create(['user_id' => $studentUser->id]);

        $student->delete();

        $this->assertSoftDeleted('students', ['id' => $student->id]);
        $this->assertSoftDeleted('users', ['id' => $studentUser->id]);
    }
}
```

- [ ] **Step 2: Rodar o teste e ver falhar**

Run: `docker compose exec -T app php artisan test --filter=StudentModelTest`
Expected: FAIL — `Class "App\Domains\Identity\Models\Student" not found` (e `aluno()` inexistente).

- [ ] **Step 3: Criar o model `Student`**

`backend/app/Domains/Identity/Models/Student.php`:

```php
<?php

namespace App\Domains\Identity\Models;

use App\Domains\Commercial\Models\Client;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use OwenIt\Auditing\Auditable as AuditableTrait;
use OwenIt\Auditing\Contracts\Auditable;

/**
 * Aluno = extensão 1:1 do User via user_id (type=aluno, is_active=false — não
 * autentica, RN-01). current_client_id é o ponteiro do vínculo aberto (mantido
 * pelo StudentClientLinkService); o histórico vive em student_client_logs.
 */
class Student extends Model implements Auditable
{
    use AuditableTrait, SoftDeletes;

    protected $fillable = ['user_id', 'current_client_id'];

    protected $auditInclude = ['user_id', 'current_client_id'];

    protected static function booted(): void
    {
        static::deleting(function (Student $student) {
            if (! $student->isForceDeleting()) {
                // Instância a instância: soft-delete pelo builder não audita.
                $student->user?->delete();
            }
        });
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function currentClient(): BelongsTo
    {
        return $this->belongsTo(Client::class, 'current_client_id');
    }

    public function logs(): HasMany
    {
        return $this->hasMany(StudentClientLog::class);
    }

    /** O vínculo vigente (ended_on IS NULL). No máximo 1 — garantido no banco. */
    public function openLog(): HasOne
    {
        return $this->hasOne(StudentClientLog::class)->whereNull('ended_on');
    }
}
```

- [ ] **Step 4: Criar o model `StudentClientLog`**

`backend/app/Domains/Identity/Models/StudentClientLog.php`:

```php
<?php

namespace App\Domains\Identity\Models;

use App\Domains\Commercial\Models\Client;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Histórico de vínculo aluno↔cliente (RN-10). Append-only: fechar um vínculo é
 * setar ended_on, nunca deletar — por isso NÃO usa SoftDeletes nem é Auditable
 * (o próprio log é o registro histórico). open_link_student_id é coluna gerada
 * pelo banco (não é fillable) que garante 1 vínculo aberto por aluno.
 */
class StudentClientLog extends Model
{
    protected $fillable = ['student_id', 'client_id', 'started_on', 'ended_on'];

    protected $casts = [
        'started_on' => 'date',
        'ended_on' => 'date',
    ];

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }
}
```

- [ ] **Step 5: Adicionar a relação `student()` no `User`**

Em `backend/app/Domains/Identity/Models/User.php`, ao lado das outras relações de extensão (`redator()`/`client()`), adicionar:

```php
    public function student(): \Illuminate\Database\Eloquent\Relations\HasOne
    {
        return $this->hasOne(\App\Domains\Identity\Models\Student::class);
    }
```

(Se o arquivo já importa `Illuminate\Database\Eloquent\Relations\HasOne` e `Student` via `use`, use os nomes curtos para casar o estilo do arquivo.)

- [ ] **Step 6: Registrar o alias `'student'` no morph map**

Em `backend/app/Providers/AppServiceProvider.php`: adicionar o `use` e a entrada no `enforceMorphMap`.

Adicionar ao topo (junto aos outros `use`):
```php
use App\Domains\Identity\Models\Student;
```
Adicionar dentro do array `enforceMorphMap([...])`, junto a `'redator'`:
```php
            'student' => Student::class,
```

- [ ] **Step 7: Adicionar o estado `aluno()` no `UserFactory`**

Em `backend/database/factories/UserFactory.php`, junto ao método `redator()`:

```php
    public function aluno(): static
    {
        return $this->state(fn (array $attributes) => [
            'type' => 'aluno',
            'is_active' => false,
        ]);
    }
```

- [ ] **Step 8: Rodar o teste e ver passar**

Run: `docker compose exec -T app php artisan test --filter=StudentModelTest`
Expected: PASS (2 testes).

- [ ] **Step 9: Pint + commit**

```bash
docker compose exec -T app ./vendor/bin/pint app/Domains/Identity/Models/Student.php app/Domains/Identity/Models/StudentClientLog.php app/Domains/Identity/Models/User.php app/Providers/AppServiceProvider.php database/factories/UserFactory.php tests/Feature/Identity/StudentModelTest.php
git add backend/app/Domains/Identity/Models/Student.php backend/app/Domains/Identity/Models/StudentClientLog.php backend/app/Domains/Identity/Models/User.php backend/app/Providers/AppServiceProvider.php backend/database/factories/UserFactory.php backend/tests/Feature/Identity/StudentModelTest.php
git commit -m "feat(identity): models Student + StudentClientLog (extensão de User, morph alias)

Student é extensão 1:1 de User (Auditable, soft-delete cascateia p/ o user).
StudentClientLog é histórico append-only (sem soft-delete, não auditável).
User->student(); alias 'student' no morph map; UserFactory::aluno().

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: `StudentClientLinkService` — invariante RN-10 (fonte única de escrita do vínculo)

**Files:**
- Create: `backend/app/Domains/Identity/Enums/LinkOutcome.php`
- Create: `backend/app/Domains/Identity/Services/StudentClientLinkService.php`
- Test: `backend/tests/Feature/Identity/StudentClientLinkServiceTest.php`

**Interfaces:**
- Consumes: `Student`, `Client`, `Student->openLog()`, `Student->logs()`.
- Produces:
  - `LinkOutcome` enum: `AlreadyLinked | Linked | Moved`.
  - `StudentClientLinkService::link(Student $student, Client $client): LinkOutcome` — numa transação: no-op se já vinculado ao mesmo cliente; senão fecha o aberto (`ended_on = hoje`), abre novo, atualiza `current_client_id`.

- [ ] **Step 1: Escrever o teste do serviço de vínculo**

`backend/tests/Feature/Identity/StudentClientLinkServiceTest.php`:

```php
<?php

namespace Tests\Feature\Identity;

use App\Domains\Commercial\Models\Client;
use App\Domains\Identity\Enums\LinkOutcome;
use App\Domains\Identity\Models\Student;
use App\Domains\Identity\Models\User;
use App\Domains\Identity\Services\StudentClientLinkService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StudentClientLinkServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_primeiro_vinculo_abre_log_e_seta_ponteiro(): void
    {
        $student = $this->makeStudent();
        $client = $this->makeClient('A');

        $outcome = (new StudentClientLinkService())->link($student, $client);

        $this->assertSame(LinkOutcome::Linked, $outcome);
        $student->refresh();
        $this->assertSame($client->id, $student->current_client_id);
        $this->assertSame(1, $student->logs()->whereNull('ended_on')->count());
    }

    public function test_mesmo_cliente_e_noop(): void
    {
        $student = $this->makeStudent();
        $client = $this->makeClient('A');
        $service = new StudentClientLinkService();

        $service->link($student, $client);
        $outcome = $service->link($student, $client);

        $this->assertSame(LinkOutcome::AlreadyLinked, $outcome);
        $this->assertSame(1, $student->logs()->count());
        $this->assertSame(1, $student->logs()->whereNull('ended_on')->count());
    }

    public function test_move_fecha_o_antigo_e_deixa_exatamente_um_aberto(): void
    {
        $student = $this->makeStudent();
        $clientA = $this->makeClient('A');
        $clientB = $this->makeClient('B');
        $service = new StudentClientLinkService();

        $service->link($student, $clientA);
        $outcome = $service->link($student, $clientB);

        $this->assertSame(LinkOutcome::Moved, $outcome);
        $student->refresh();
        $this->assertSame($clientB->id, $student->current_client_id);
        // Exatamente 1 vínculo aberto, e é o do cliente B.
        $this->assertSame(1, $student->logs()->whereNull('ended_on')->count());
        $this->assertSame($clientB->id, $student->openLog->client_id);
        // O vínculo antigo (cliente A) foi fechado.
        $this->assertNotNull($student->logs()->where('client_id', $clientA->id)->first()->ended_on);
    }

    private function makeStudent(): Student
    {
        $user = User::factory()->aluno()->create();

        return Student::create(['user_id' => $user->id]);
    }

    private function makeClient(string $suffix): Client
    {
        $user = User::factory()->create(['type' => 'cliente', 'is_active' => false]);

        return Client::create(['user_id' => $user->id, 'legal_name' => "Empresa {$suffix}"]);
    }
}
```

- [ ] **Step 2: Rodar o teste e ver falhar**

Run: `docker compose exec -T app php artisan test --filter=StudentClientLinkServiceTest`
Expected: FAIL — `Class "App\Domains\Identity\Enums\LinkOutcome" not found`.

- [ ] **Step 3: Criar o enum `LinkOutcome`**

`backend/app/Domains/Identity/Enums/LinkOutcome.php`:

```php
<?php

namespace App\Domains\Identity\Enums;

/** Resultado de StudentClientLinkService::link(). */
enum LinkOutcome
{
    case AlreadyLinked;  // já vinculado ao mesmo cliente — no-op
    case Linked;         // primeiro vínculo do aluno
    case Moved;          // fechou o vínculo anterior e abriu outro
}
```

- [ ] **Step 4: Criar o `StudentClientLinkService`**

`backend/app/Domains/Identity/Services/StudentClientLinkService.php`:

```php
<?php

namespace App\Domains\Identity\Services;

use App\Domains\Commercial\Models\Client;
use App\Domains\Identity\Enums\LinkOutcome;
use App\Domains\Identity\Models\Student;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Fonte única do invariante RN-10 (1 cliente por aluno por vez, com histórico).
 * Nenhum outro caminho escreve student_client_logs nem students.current_client_id.
 */
class StudentClientLinkService
{
    public function link(Student $student, Client $client): LinkOutcome
    {
        return DB::transaction(function () use ($student, $client) {
            $open = $student->openLog()->first();

            if ($open !== null && (int) $open->client_id === $client->id) {
                return LinkOutcome::AlreadyLinked;
            }

            $today = Carbon::today();

            if ($open !== null) {
                $open->ended_on = $today;
                $open->save();
            }

            $student->logs()->create([
                'client_id' => $client->id,
                'started_on' => $today,
                'ended_on' => null,
            ]);

            $student->current_client_id = $client->id;
            $student->save();

            return $open !== null ? LinkOutcome::Moved : LinkOutcome::Linked;
        });
    }
}
```

- [ ] **Step 5: Rodar o teste e ver passar**

Run: `docker compose exec -T app php artisan test --filter=StudentClientLinkServiceTest`
Expected: PASS (3 testes).

- [ ] **Step 6: Provar a regressão do "move fecha o antigo" (lição #10)**

Editar temporariamente `StudentClientLinkService::link()` para NÃO fechar o antigo — comente as 3 linhas do bloco `if ($open !== null) { $open->ended_on = $today; $open->save(); }`.

Run: `docker compose exec -T app php artisan test --filter=StudentClientLinkServiceTest`
Expected: FAIL — `test_move_fecha_o_antigo_e_deixa_exatamente_um_aberto` falha (2 vínculos abertos, ou `QueryException` da constraint ao abrir o 2º). Isso prova que o teste enxerga o bug.

Reverter a edição (descomentar as 3 linhas) e rodar de novo:
Run: `docker compose exec -T app php artisan test --filter=StudentClientLinkServiceTest`
Expected: PASS (3 testes).

- [ ] **Step 7: Pint + commit**

```bash
docker compose exec -T app ./vendor/bin/pint app/Domains/Identity/Enums/LinkOutcome.php app/Domains/Identity/Services/StudentClientLinkService.php tests/Feature/Identity/StudentClientLinkServiceTest.php
git add backend/app/Domains/Identity/Enums/LinkOutcome.php backend/app/Domains/Identity/Services/StudentClientLinkService.php backend/tests/Feature/Identity/StudentClientLinkServiceTest.php
git commit -m "feat(identity): StudentClientLinkService — invariante 1 vínculo por vez (RN-10)

Fonte única de escrita do vínculo: no-op no mesmo cliente, fecha+reabre no
move, mantém current_client_id. Regressão do 'move fecha o antigo' provada
contra o código bugado (lição #10).

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: `StudentResolver` — resolução por RUT (existe→associa, não existe→cria)

**Files:**
- Create: `backend/app/Domains/Identity/Enums/StudentResolutionOutcome.php`
- Create: `backend/app/Domains/Identity/Services/StudentResolution.php`
- Create: `backend/app/Domains/Identity/Services/StudentResolver.php`
- Test: `backend/tests/Feature/Identity/StudentResolverTest.php`

**Interfaces:**
- Consumes: `UserProvisioner::provision(string $type, string $name, string $rut, string $email, ?string $phone): User`; `StudentClientLinkService::link()`; `LinkOutcome`; `Rut::parse()->isValid()/->format()`; `Student`, `User`, `Client`.
- Produces:
  - `StudentResolutionOutcome` enum: `Created | AlreadyLinked | Moved`.
  - `StudentResolution` (readonly): `{ Student $student, StudentResolutionOutcome $outcome, ?Client $previousClient }`.
  - `StudentResolver::resolveByRut(string $rut, string $name, string $email, ?string $phone, Client $client): StudentResolution` — lança `ValidationException` (chave `rut`) para RUT inválido ou RUT de outro tipo de usuário.

- [ ] **Step 1: Escrever o teste do resolver (todos os ramos)**

`backend/tests/Feature/Identity/StudentResolverTest.php`:

```php
<?php

namespace Tests\Feature\Identity;

use App\Domains\Commercial\Models\Client;
use App\Domains\Identity\Enums\StudentResolutionOutcome;
use App\Domains\Identity\Models\Student;
use App\Domains\Identity\Models\User;
use App\Domains\Identity\Services\StudentResolver;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class StudentResolverTest extends TestCase
{
    use RefreshDatabase;

    private function resolver(): StudentResolver
    {
        return app(StudentResolver::class);
    }

    private function makeClient(string $suffix): Client
    {
        $user = User::factory()->create(['type' => 'cliente', 'is_active' => false]);

        return Client::create(['user_id' => $user->id, 'legal_name' => "Empresa {$suffix}"]);
    }

    public function test_rut_novo_cria_aluno_inativo_sem_role_e_vincula(): void
    {
        $client = $this->makeClient('A');

        $result = $this->resolver()->resolveByRut('12.345.678-5', 'Ana Díaz', 'ana@x.cl', null, $client);

        $this->assertSame(StudentResolutionOutcome::Created, $result->outcome);
        $this->assertDatabaseHas('users', ['email' => 'ana@x.cl', 'type' => 'aluno', 'is_active' => false]);
        $this->assertEmpty($result->student->user->getRoleNames());
        $this->assertSame($client->id, $result->student->current_client_id);
        $this->assertSame(1, $result->student->logs()->whereNull('ended_on')->count());
    }

    public function test_mesmo_rut_mesmo_cliente_e_already_linked(): void
    {
        $client = $this->makeClient('A');
        $this->resolver()->resolveByRut('12.345.678-5', 'Ana Díaz', 'ana@x.cl', null, $client);

        $result = $this->resolver()->resolveByRut('12.345.678-5', 'Ana Díaz', 'ana@x.cl', null, $client);

        $this->assertSame(StudentResolutionOutcome::AlreadyLinked, $result->outcome);
        $this->assertSame(1, Student::count());
        $this->assertSame(1, $result->student->logs()->whereNull('ended_on')->count());
    }

    public function test_mesmo_rut_outro_cliente_move_e_reporta_o_anterior(): void
    {
        $clientA = $this->makeClient('A');
        $clientB = $this->makeClient('B');
        $this->resolver()->resolveByRut('12.345.678-5', 'Ana Díaz', 'ana@x.cl', null, $clientA);

        $result = $this->resolver()->resolveByRut('12.345.678-5', 'Ana Díaz', 'ana@x.cl', null, $clientB);

        $this->assertSame(StudentResolutionOutcome::Moved, $result->outcome);
        $this->assertNotNull($result->previousClient);
        $this->assertSame($clientA->id, $result->previousClient->id);
        $result->student->refresh();
        $this->assertSame($clientB->id, $result->student->current_client_id);
        $this->assertSame(1, $result->student->logs()->whereNull('ended_on')->count());
    }

    public function test_rut_invalido_lanca_validation_na_chave_rut(): void
    {
        $client = $this->makeClient('A');

        try {
            $this->resolver()->resolveByRut('11.111.111-1', 'X', 'x@x.cl', null, $client);
            $this->fail('esperava ValidationException');
        } catch (ValidationException $e) {
            $this->assertArrayHasKey('rut', $e->errors());
        }
    }

    public function test_rut_de_redator_lanca_conflito_de_tipo(): void
    {
        $client = $this->makeClient('A');
        User::factory()->redator()->create(['rut' => '12.345.678-5']);

        try {
            $this->resolver()->resolveByRut('12.345.678-5', 'X', 'x@x.cl', null, $client);
            $this->fail('esperava ValidationException');
        } catch (ValidationException $e) {
            $this->assertArrayHasKey('rut', $e->errors());
        }
    }

    public function test_aluno_soft_deletado_e_restaurado_sem_duplicar(): void
    {
        $client = $this->makeClient('A');
        $first = $this->resolver()->resolveByRut('12.345.678-5', 'Ana Díaz', 'ana@x.cl', null, $client);
        $first->student->delete();

        $result = $this->resolver()->resolveByRut('12.345.678-5', 'Ana Díaz', 'ana@x.cl', null, $client);

        $this->assertSame(1, Student::count());
        $this->assertFalse($result->student->trashed());
        $this->assertFalse($result->student->user->trashed());
    }
}
```

Nota: `'11.111.111-1'` tem dígito verificador inválido (o DV correto de `11.111.111` é `1`? confirme rodando — se o parser aceitar, troque por `'11.111.111-0'`, que é inválido). `'12.345.678-5'` é válido (mesmo RUT usado nos testes de cliente).

- [ ] **Step 2: Rodar o teste e ver falhar**

Run: `docker compose exec -T app php artisan test --filter=StudentResolverTest`
Expected: FAIL — `Class "App\Domains\Identity\Enums\StudentResolutionOutcome" not found`.

- [ ] **Step 3: Criar o enum `StudentResolutionOutcome`**

`backend/app/Domains/Identity/Enums/StudentResolutionOutcome.php`:

```php
<?php

namespace App\Domains\Identity\Enums;

/** Resultado de StudentResolver::resolveByRut() — o que a importação (6c) reporta. */
enum StudentResolutionOutcome
{
    case Created;        // aluno novo criado e matriculado
    case AlreadyLinked;  // aluno já existente, mesmo cliente
    case Moved;          // aluno movido de outro cliente (ver previousClient)
}
```

- [ ] **Step 4: Criar o DTO `StudentResolution`**

`backend/app/Domains/Identity/Services/StudentResolution.php`:

```php
<?php

namespace App\Domains\Identity\Services;

use App\Domains\Commercial\Models\Client;
use App\Domains\Identity\Enums\StudentResolutionOutcome;
use App\Domains\Identity\Models\Student;

/**
 * Resultado interno de uma linha de resolução de aluno. Não é DTO de API (sem
 * #[TypeScript]): a importação (6c) monta seu próprio resumo a partir daqui.
 */
final class StudentResolution
{
    public function __construct(
        public readonly Student $student,
        public readonly StudentResolutionOutcome $outcome,
        public readonly ?Client $previousClient = null,
    ) {}
}
```

- [ ] **Step 5: Criar o `StudentResolver`**

`backend/app/Domains/Identity/Services/StudentResolver.php`:

```php
<?php

namespace App\Domains\Identity\Services;

use App\Domains\Commercial\Models\Client;
use App\Domains\Identity\Enums\LinkOutcome;
use App\Domains\Identity\Enums\StudentResolutionOutcome;
use App\Domains\Identity\Models\Student;
use App\Domains\Identity\Models\User;
use App\Shared\Support\Rut;
use Illuminate\Validation\ValidationException;

/**
 * Resolve uma linha de importação de aluno pelo RUT (chave natural, RF-ALU-07):
 * existe? associa : cria (via UserProvisioner). Aplica o vínculo ao cliente da
 * cotação (RN-10) via StudentClientLinkService. Lança por linha; a importação
 * (6c) captura e reporta, sem abortar a planilha inteira.
 */
class StudentResolver
{
    public function __construct(
        private readonly UserProvisioner $provisioner,
        private readonly StudentClientLinkService $linkService,
    ) {}

    public function resolveByRut(
        string $rut,
        string $name,
        string $email,
        ?string $phone,
        Client $client,
    ): StudentResolution {
        $parsed = Rut::parse($rut);

        if (! $parsed->isValid()) {
            throw ValidationException::withMessages(['rut' => 'RUT inválido.']);
        }

        $user = User::withTrashed()->where('rut', $parsed->format())->first();

        if ($user !== null && $user->type !== 'aluno') {
            throw ValidationException::withMessages([
                'rut' => 'Este RUT pertence a um usuário de outro tipo.',
            ]);
        }

        // Aluno novo: provisiona o User (inativo, sem role) e cria o Student.
        if ($user === null) {
            $created = $this->provisioner->provision('aluno', $name, $rut, $email, $phone);
            $student = Student::create(['user_id' => $created->id]);
            $this->linkService->link($student, $client);

            return new StudentResolution($student, StudentResolutionOutcome::Created);
        }

        // Aluno existente (possivelmente soft-deletado): restaura e revincula.
        if ($user->trashed()) {
            $user->restore();
        }

        $student = Student::withTrashed()->where('user_id', $user->id)->firstOrFail();

        if ($student->trashed()) {
            $student->restore();
        }

        $previousClient = $student->currentClient; // capturado ANTES do link

        $linkOutcome = $this->linkService->link($student, $client);

        $outcome = $linkOutcome === LinkOutcome::AlreadyLinked
            ? StudentResolutionOutcome::AlreadyLinked
            : StudentResolutionOutcome::Moved;

        return new StudentResolution(
            $student,
            $outcome,
            $outcome === StudentResolutionOutcome::Moved ? $previousClient : null,
        );
    }
}
```

- [ ] **Step 6: Rodar o teste e ver passar**

Run: `docker compose exec -T app php artisan test --filter=StudentResolverTest`
Expected: PASS (6 testes). Se `test_rut_invalido...` falhar por o RUT escolhido ser válido, troque o valor conforme a nota do Step 1 e rode de novo.

- [ ] **Step 7: Rodar a suíte inteira (nada quebrou nos vizinhos)**

Run: `docker compose exec -T app php artisan test`
Expected: PASS (toda a suíte verde — inclui os 4 novos test files).

- [ ] **Step 8: Pint + commit**

```bash
docker compose exec -T app ./vendor/bin/pint app/Domains/Identity/Enums/StudentResolutionOutcome.php app/Domains/Identity/Services/StudentResolution.php app/Domains/Identity/Services/StudentResolver.php tests/Feature/Identity/StudentResolverTest.php
git add backend/app/Domains/Identity/Enums/StudentResolutionOutcome.php backend/app/Domains/Identity/Services/StudentResolution.php backend/app/Domains/Identity/Services/StudentResolver.php backend/tests/Feature/Identity/StudentResolverTest.php
git commit -m "feat(identity): StudentResolver — resolução de aluno por RUT (existe→associa, novo→cria)

Chave natural RUT (RF-ALU-07): valida DV, busca withTrashed, cria via
UserProvisioner (aluno inativo, sem role) ou associa/move o existente.
Restaura aluno soft-deletado; rejeita RUT de outro tipo. Provado nos 6 ramos.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review (feito na escrita do plano)

**1. Cobertura do spec:**
- Schema `students` + `student_client_logs` (coluna gerada única) → Task 1. ✅
- Models + morph alias + factories inline → Task 2 (sem `StudentFactory`: repo só usa `UserFactory`; extensões montadas inline — decisão registrada). ✅
- Serviço de vínculo (RN-10, move + fecha antigo) → Task 3. ✅
- Serviço de resolução (todos os ramos: novo/mesmo/move/inválido/tipo-conflito/trashed) → Task 4. ✅
- DoD por comportamento provado + regressão via edição temporária (lição #10) → Task 3 Step 6; constraint de banco → Task 1. ✅
- Fora de escopo (REST/tela/`StudentData`/xlsx) → não há task, conforme a fronteira do spec. ✅

**2. Placeholders:** nenhum "TBD/TODO"; todo step com código ou comando + saída esperada. A única condicional (valor de RUT inválido no Step 1 da Task 4) traz instrução exata de correção.

**3. Consistência de tipos:** `LinkOutcome {AlreadyLinked,Linked,Moved}` (interno) vs `StudentResolutionOutcome {Created,AlreadyLinked,Moved}` (público) — nomes distintos de propósito; o mapeamento `Linked→Moved` no resolver está explícito no código. `link(Student,Client): LinkOutcome`, `resolveByRut(string,string,string,?string,Client): StudentResolution`, `provision(string,string,string,string,?string): User` — batem entre tasks e com o `UserProvisioner` real.
