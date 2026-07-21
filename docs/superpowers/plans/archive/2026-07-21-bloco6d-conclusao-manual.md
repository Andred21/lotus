# Bloco 6d · Conclusão + manual (backend) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fechar o ciclo operacional da turma — doc obrigatória habilita (RN-16, derivado),
admin confirma conclusão terminal, turma concluída blindada (RN-15), manual de classe em PDF
sob demanda (Blade + Gotenberg).

**Architecture:** Spec aprovado em `docs/superpowers/specs/2026-07-21-bloco6d-conclusao-manual-design.md`
(D1–D9). Estado `habilitada` sai do enum persistido e vira derivação (`TurmaHabilitacaoService`).
Docs da turma vão na `files` polimórfica existente. RN-15 = `Turma::assertAcademicallyWritable()`.
Manual = Blade única → Gotenberg → PDF stream, não materializado.

**Tech Stack:** Laravel 13, spatie/laravel-data (`#[TypeScript]`), owen-it auditing,
`UploadFileAction` (Shared/Files), Gotenberg 8 (compose `gotenberg:3000`), sqlite `:memory:` na
suíte + prova real MySQL 8 (lição #15).

## Global Constraints

- **Main tree** (P-03) — sem worktree. `git status` antes de tocar; WIP do João é intocável.
- Backend roda no container: `docker compose exec -T app php artisan test --filter=X`.
- `./vendor/bin/pint <arquivos>` — NUNCA sem argumento. `git add` só caminhos exatos.
- Commits terminam com `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- Erro de negócio = `ValidationException::withMessages` (RFC 7807 no handler) — nunca `abort(422)`.
- Mensagens de erro user-facing em **es-CL** (padrão dos Actions 6b/6c).
- `generated.ts` não se edita à mão; regen + consumidores no MESMO commit (lição #11).
- **Permissões já existem** (D9): `operation.turma.submit_docs` (redator+superadmin — admin comum
  NÃO tem, deliberado), `operation.turma.complete` (admin+superadmin). Nada novo no seeder.
- Teste de regressão de guard só vale visto FALHAR sem o guard (lição #10).

---

### Task 1: Migration (enum 2 valores + `concluded_at`) + limpeza do `TurmaStatus`

**Files:**
- Create: `backend/database/migrations/2026_07_21_200000_alter_turmas_for_conclusao.php`
- Modify: `backend/app/Domains/Operation/Enums/TurmaStatus.php`
- Modify: `backend/app/Domains/Operation/Models/Turma.php` (casts + auditInclude)
- Modify: `backend/tests/Feature/Operation/ImportStudentsActionTest.php:105` (usa `Habilitada`)
- Test: `backend/tests/Feature/Operation/TurmaModelTest.php`

**Interfaces:**
- Produces: coluna `turmas.concluded_at` (timestamp NULL, cast `datetime`); enum
  `TurmaStatus` com SÓ `EmAndamento|Concluida` (Task 3/5 dependem).

- [ ] **Step 1: Teste da nova coluna (falhando)** — adicionar ao `TurmaModelTest`:

```php
    public function test_concluded_at_nasce_nulo_e_casta_datetime(): void
    {
        $quote = $this->makeApprovedQuote();
        $turma = Turma::create([
            'quote_id' => $quote->id, 'course_id' => $quote->course_id,
            'modalidade' => TurmaModalidade::Online, 'local_aplicacao' => null,
            'start_date' => '2026-08-01', 'end_date' => '2026-08-10',
        ]);

        $this->assertNull($turma->fresh()->concluded_at);

        $turma->concluded_at = now();
        $turma->save();

        $this->assertInstanceOf(\Illuminate\Support\Carbon::class, $turma->fresh()->concluded_at);
    }
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `docker compose exec -T app php artisan test --filter=TurmaModelTest`
Expected: FAIL (coluna `concluded_at` inexistente).

- [ ] **Step 3: Migration**

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('turmas', function (Blueprint $table) {
            $table->timestamp('concluded_at')->nullable()->after('status');
        });

        // Estreita o enum: 'habilitada' saiu da máquina persistida — é derivada
        // em runtime (spec 6d, D3). MODIFY direto e só no MySQL: no sqlite da
        // suíte o enum nasce TEXT+CHECK e o estreitamento real só existe (e só
        // importa) no engine real — lição #15.
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE turmas MODIFY status ENUM('em_andamento','concluida') NOT NULL DEFAULT 'em_andamento'");
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE turmas MODIFY status ENUM('em_andamento','habilitada','concluida') NOT NULL DEFAULT 'em_andamento'");
        }

        Schema::table('turmas', function (Blueprint $table) {
            $table->dropColumn('concluded_at');
        });
    }
};
```

- [ ] **Step 4: `TurmaStatus` sem `Habilitada`**

```php
<?php

namespace App\Domains\Operation\Enums;

/**
 * Estados PERSISTIDOS da turma. 'habilitada' não é estado de coluna: é
 * derivação em runtime (TurmaHabilitacaoService — doc RN-16 completa) sobre
 * uma turma em andamento. Conclusão é terminal (spec 6d, D5).
 */
enum TurmaStatus: string
{
    case EmAndamento = 'em_andamento';
    case Concluida = 'concluida';
}
```

- [ ] **Step 5: `Turma` model** — em `$casts` adicionar `'concluded_at' => 'datetime',`; em
  `$auditInclude` adicionar `'concluded_at',` (o ato de concluir é auditado). NÃO adicionar a
  `$fillable` (só a Action escreve, por atribuição direta).

- [ ] **Step 6: Consertar o teste 6c que usava `Habilitada`** — em
  `ImportStudentsActionTest::test_turma_fora_de_andamento_recusa_422` trocar
  `TurmaStatus::Habilitada` por `TurmaStatus::Concluida` (a semântica do teste — "fora de
  andamento recusa" — não muda).

- [ ] **Step 7: Rodar TurmaModelTest (PASS) e a suíte inteira**

Run: `docker compose exec -T app php artisan test`
Expected: tudo verde (247+1).

- [ ] **Step 8: Pint + commit**

```bash
./vendor/bin/pint backend/database/migrations/2026_07_21_200000_alter_turmas_for_conclusao.php backend/app/Domains/Operation/Enums/TurmaStatus.php backend/app/Domains/Operation/Models/Turma.php backend/tests/Feature/Operation/TurmaModelTest.php backend/tests/Feature/Operation/ImportStudentsActionTest.php
git add backend/database/migrations/2026_07_21_200000_alter_turmas_for_conclusao.php backend/app/Domains/Operation/Enums/TurmaStatus.php backend/app/Domains/Operation/Models/Turma.php backend/tests/Feature/Operation/TurmaModelTest.php backend/tests/Feature/Operation/ImportStudentsActionTest.php
git commit -m "feat(operation): turmas.concluded_at + enum status 2 valores (6d)"
```

> Nota Pint: rodar de `backend/` com caminhos relativos se o binário reclamar dos absolutos.

---

### Task 2: `TurmaDocumentType` + `TurmaHabilitacaoService` (RN-16 derivada)

**Files:**
- Create: `backend/app/Domains/Operation/Enums/TurmaDocumentType.php`
- Create: `backend/app/Domains/Operation/Services/TurmaHabilitacaoService.php`
- Test: `backend/tests/Feature/Operation/TurmaHabilitacaoServiceTest.php`

**Interfaces:**
- Consumes: `Turma::files()` (MorphMany p/ `File`), `TurmaStatus` (Task 1).
- Produces: `TurmaDocumentType::{MANUAL,PRUEBAS,EVALUACION_REDATOR}` (string-backed, valores
  iguais aos names); `TurmaHabilitacaoService::isHabilitada(Turma): bool` e
  `missingTypes(Turma): array<string>` (Tasks 3–5 consomem).

- [ ] **Step 1: Teste (falhando)**

```php
<?php

namespace Tests\Feature\Operation;

use App\Domains\Catalog\Models\Course;
use App\Domains\Commercial\Models\Budget;
use App\Domains\Commercial\Models\Quote;
use App\Domains\Identity\Models\User;
use App\Domains\Operation\Enums\TurmaDocumentType;
use App\Domains\Operation\Enums\TurmaStatus;
use App\Domains\Operation\Models\Turma;
use App\Domains\Operation\Services\TurmaHabilitacaoService;
use App\Shared\Files\Models\File;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TurmaHabilitacaoServiceTest extends TestCase
{
    use RefreshDatabase;

    private Turma $turma;

    private TurmaHabilitacaoService $service;

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
            'modalidade' => 'online', 'local_aplicacao' => null,
            'start_date' => '2026-08-01', 'end_date' => '2026-08-10',
        ]);
        $this->service = app(TurmaHabilitacaoService::class);
    }

    private function addDoc(TurmaDocumentType $type): File
    {
        return $this->turma->files()->create([
            'type' => $type->value, 'path' => 'x.pdf', 'original_name' => 'x.pdf',
            'mime' => 'application/pdf', 'size' => 10,
        ]);
    }

    public function test_sem_docs_lista_os_3_tipos_faltantes(): void
    {
        $this->assertFalse($this->service->isHabilitada($this->turma));
        $this->assertSame(
            ['MANUAL', 'PRUEBAS', 'EVALUACION_REDATOR'],
            $this->service->missingTypes($this->turma),
        );
    }

    public function test_doc_parcial_lista_so_o_que_falta(): void
    {
        $this->addDoc(TurmaDocumentType::MANUAL);
        $this->addDoc(TurmaDocumentType::PRUEBAS);

        $this->assertFalse($this->service->isHabilitada($this->turma));
        $this->assertSame(['EVALUACION_REDATOR'], $this->service->missingTypes($this->turma));
    }

    public function test_3_tipos_presentes_habilita(): void
    {
        foreach (TurmaDocumentType::cases() as $type) {
            $this->addDoc($type);
        }

        $this->assertTrue($this->service->isHabilitada($this->turma));
        $this->assertSame([], $this->service->missingTypes($this->turma));
    }

    public function test_doc_soft_deletada_nao_conta(): void
    {
        foreach (TurmaDocumentType::cases() as $type) {
            $this->addDoc($type);
        }
        $this->turma->files()->where('type', TurmaDocumentType::MANUAL->value)
            ->get()->each(fn (File $f) => $f->delete());   // lição #5: por instância

        $this->assertFalse($this->service->isHabilitada($this->turma->fresh()));
        $this->assertSame(['MANUAL'], $this->service->missingTypes($this->turma->fresh()));
    }

    public function test_turma_concluida_nao_e_habilitada(): void
    {
        foreach (TurmaDocumentType::cases() as $type) {
            $this->addDoc($type);
        }
        $this->turma->status = TurmaStatus::Concluida;
        $this->turma->save();

        $this->assertFalse($this->service->isHabilitada($this->turma->fresh()));
    }
}
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `docker compose exec -T app php artisan test --filter=TurmaHabilitacaoServiceTest`
Expected: FAIL (classes inexistentes).

- [ ] **Step 3: Enum**

```php
<?php

namespace App\Domains\Operation\Enums;

/**
 * Tipos de documento da turma (RN-16 — RF-RED-07). Enum do domínio, não
 * global: a `files` polimórfica tem `type` string livre; este enum rotula e
 * restringe os docs de turma (mesmo padrão do RedatorDocumentType).
 */
enum TurmaDocumentType: string
{
    case MANUAL = 'MANUAL';
    case PRUEBAS = 'PRUEBAS';
    case EVALUACION_REDATOR = 'EVALUACION_REDATOR';
}
```

- [ ] **Step 4: Service**

```php
<?php

namespace App\Domains\Operation\Services;

use App\Domains\Operation\Enums\TurmaDocumentType;
use App\Domains\Operation\Enums\TurmaStatus;
use App\Domains\Operation\Models\Turma;

/**
 * Fonte única da RN-16: "documentação completa habilita". Habilitada NÃO é
 * estado persistido (spec 6d, D3) — deriva de haver ≥1 doc ativo de CADA tipo
 * numa turma em andamento. Consumida pelo gate de conclusão e pelo TurmaData.
 */
class TurmaHabilitacaoService
{
    public function isHabilitada(Turma $turma): bool
    {
        return $turma->status === TurmaStatus::EmAndamento
            && $this->missingTypes($turma) === [];
    }

    /** @return array<string> valores de TurmaDocumentType sem doc ativo (soft-delete não conta). */
    public function missingTypes(Turma $turma): array
    {
        $all = array_column(TurmaDocumentType::cases(), 'value');

        $present = $turma->files()
            ->whereIn('type', $all)
            ->distinct()
            ->pluck('type')
            ->all();

        return array_values(array_diff($all, $present));
    }
}
```

- [ ] **Step 5: Rodar (PASS)**

Run: `docker compose exec -T app php artisan test --filter=TurmaHabilitacaoServiceTest`
Expected: 5/5 PASS.

- [ ] **Step 6: Pint + commit**

```bash
cd backend && ./vendor/bin/pint app/Domains/Operation/Enums/TurmaDocumentType.php app/Domains/Operation/Services/TurmaHabilitacaoService.php tests/Feature/Operation/TurmaHabilitacaoServiceTest.php && cd ..
git add backend/app/Domains/Operation/Enums/TurmaDocumentType.php backend/app/Domains/Operation/Services/TurmaHabilitacaoService.php backend/tests/Feature/Operation/TurmaHabilitacaoServiceTest.php
git commit -m "feat(operation): TurmaDocumentType + habilitação derivada RN-16 (6d)"
```

---

### Task 3: Guard RN-15 + Actions de documento da turma

**Files:**
- Modify: `backend/app/Domains/Operation/Models/Turma.php` (método `assertAcademicallyWritable`)
- Create: `backend/app/Domains/Operation/Actions/StoreTurmaDocumentAction.php`
- Create: `backend/app/Domains/Operation/Actions/DeleteTurmaDocumentAction.php`
- Test: `backend/tests/Feature/Operation/TurmaDocumentActionsTest.php`

**Interfaces:**
- Consumes: `TurmaDocumentType` (Task 2), `UploadFileAction::execute(Model $owner, UploadedFile $file, string $type, ?CarbonInterface $validUntil = null, ?string $disk = null): File` (Shared, existente).
- Produces: `Turma::assertAcademicallyWritable(): void` (lança `ValidationException` se
  `Concluida` — o futuro endpoint de notas TAMBÉM chamará isto);
  `StoreTurmaDocumentAction::execute(Turma, TurmaDocumentType, UploadedFile): File`;
  `DeleteTurmaDocumentAction::execute(Turma, File): void`.

- [ ] **Step 1: Teste (falhando)**

```php
<?php

namespace Tests\Feature\Operation;

use App\Domains\Catalog\Models\Course;
use App\Domains\Commercial\Models\Budget;
use App\Domains\Commercial\Models\Quote;
use App\Domains\Identity\Models\User;
use App\Domains\Operation\Actions\DeleteTurmaDocumentAction;
use App\Domains\Operation\Actions\StoreTurmaDocumentAction;
use App\Domains\Operation\Enums\TurmaDocumentType;
use App\Domains\Operation\Enums\TurmaStatus;
use App\Domains\Operation\Models\Turma;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class TurmaDocumentActionsTest extends TestCase
{
    use RefreshDatabase;

    private Turma $turma;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake();
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
            'modalidade' => 'online', 'local_aplicacao' => null,
            'start_date' => '2026-08-01', 'end_date' => '2026-08-10',
        ]);
    }

    private function pdf(): UploadedFile
    {
        return UploadedFile::fake()->create('doc.pdf', 20, 'application/pdf');
    }

    public function test_store_grava_file_do_tipo_e_e_append(): void
    {
        $action = app(StoreTurmaDocumentAction::class);

        $action->execute($this->turma, TurmaDocumentType::PRUEBAS, $this->pdf());
        $action->execute($this->turma, TurmaDocumentType::PRUEBAS, $this->pdf());

        // D8: N por tipo — o 2º upload NÃO substitui o 1º.
        $this->assertSame(2, $this->turma->files()->where('type', 'PRUEBAS')->count());
    }

    public function test_delete_e_soft_e_por_instancia(): void
    {
        $file = app(StoreTurmaDocumentAction::class)
            ->execute($this->turma, TurmaDocumentType::MANUAL, $this->pdf());

        app(DeleteTurmaDocumentAction::class)->execute($this->turma, $file);

        $this->assertSoftDeleted('files', ['id' => $file->id]);
        // lição #5: delete por instância dispara evento → owen-it audita.
        $this->assertDatabaseHas('audits', [
            'auditable_type' => 'file', 'auditable_id' => $file->id, 'event' => 'deleted',
        ]);
    }

    public function test_rn15_store_bloqueado_pos_conclusao(): void
    {
        $this->turma->status = TurmaStatus::Concluida;
        $this->turma->save();

        $this->expectException(ValidationException::class);
        app(StoreTurmaDocumentAction::class)
            ->execute($this->turma, TurmaDocumentType::MANUAL, $this->pdf());
    }

    public function test_rn15_delete_bloqueado_pos_conclusao(): void
    {
        $file = app(StoreTurmaDocumentAction::class)
            ->execute($this->turma, TurmaDocumentType::MANUAL, $this->pdf());
        $this->turma->status = TurmaStatus::Concluida;
        $this->turma->save();

        $this->expectException(ValidationException::class);
        app(DeleteTurmaDocumentAction::class)->execute($this->turma, $file);
    }
}
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `docker compose exec -T app php artisan test --filter=TurmaDocumentActionsTest`
Expected: FAIL (Actions inexistentes).

- [ ] **Step 3: Guard no model `Turma`** (adicionar método + import):

```php
use Illuminate\Validation\ValidationException;

    /**
     * RN-15 — blindagem: turma concluída não aceita mais escrita acadêmica.
     * TODO caminho de escrita acadêmica chama isto: docs da turma (6d) e o
     * futuro endpoint de notas/presença (sprint do redator). Matrícula já é
     * bloqueada pelo gate "só em andamento" do 6c.
     */
    public function assertAcademicallyWritable(): void
    {
        if ($this->status === TurmaStatus::Concluida) {
            throw ValidationException::withMessages([
                'turma' => 'La clase ya fue concluida: el registro académico está bloqueado (RN-15).',
            ]);
        }
    }
```

- [ ] **Step 4: Actions**

`StoreTurmaDocumentAction.php`:

```php
<?php

namespace App\Domains\Operation\Actions;

use App\Domains\Operation\Enums\TurmaDocumentType;
use App\Domains\Operation\Models\Turma;
use App\Shared\Files\Actions\UploadFileAction;
use App\Shared\Files\Models\File;
use Illuminate\Http\UploadedFile;

/**
 * Anexa um documento à turma (RN-16). Append puro — N docs por tipo (D8),
 * sem replace: as provas dos alunos são plural real. Doc de turma não vence
 * (sem valid_until).
 */
class StoreTurmaDocumentAction
{
    public function __construct(private UploadFileAction $uploads) {}

    public function execute(Turma $turma, TurmaDocumentType $type, UploadedFile $file): File
    {
        $turma->assertAcademicallyWritable();   // RN-15

        return $this->uploads->execute($turma, $file, $type->value);
    }
}
```

`DeleteTurmaDocumentAction.php`:

```php
<?php

namespace App\Domains\Operation\Actions;

use App\Domains\Operation\Models\Turma;
use App\Shared\Files\Models\File;

/**
 * Remove (soft) um documento da turma. O binário fica no bucket — o metadado
 * soft-deletado é o rastro (peso legal). O pertencimento file↔turma é
 * garantido pelo scoped binding da rota.
 */
class DeleteTurmaDocumentAction
{
    public function execute(Turma $turma, File $file): void
    {
        $turma->assertAcademicallyWritable();   // RN-15

        $file->delete();   // por instância — audita (lição #5)
    }
}
```

- [ ] **Step 5: Rodar (PASS)**

Run: `docker compose exec -T app php artisan test --filter=TurmaDocumentActionsTest`
Expected: 4/4 PASS.

- [ ] **Step 6: Prova lição #10 (regressão viu o bug)** — comentar a linha
  `$turma->assertAcademicallyWritable();` do `StoreTurmaDocumentAction`, rodar
  `--filter=test_rn15_store_bloqueado_pos_conclusao` e VER FALHAR; descomentar, rodar, PASS.
  Registrar no ledger que a prova foi feita.

- [ ] **Step 7: Pint + commit**

```bash
cd backend && ./vendor/bin/pint app/Domains/Operation/Models/Turma.php app/Domains/Operation/Actions/StoreTurmaDocumentAction.php app/Domains/Operation/Actions/DeleteTurmaDocumentAction.php tests/Feature/Operation/TurmaDocumentActionsTest.php && cd ..
git add backend/app/Domains/Operation/Models/Turma.php backend/app/Domains/Operation/Actions/StoreTurmaDocumentAction.php backend/app/Domains/Operation/Actions/DeleteTurmaDocumentAction.php backend/tests/Feature/Operation/TurmaDocumentActionsTest.php
git commit -m "feat(operation): docs da turma + blindagem RN-15 (6d)"
```

---

### Task 4: `TurmaDocumentController` + rotas + `TurmaDocumentData` + regen tipos

**Files:**
- Create: `backend/app/Domains/Operation/Data/TurmaDocumentData.php`
- Create: `backend/app/Domains/Operation/Http/Controllers/TurmaDocumentController.php`
- Modify: `backend/app/Domains/Operation/routes.php`
- Modify (regen): `frontend/src/shared/types/generated.ts`
- Test: `backend/tests/Feature/Operation/TurmaDocumentApiTest.php`

**Interfaces:**
- Consumes: `StoreTurmaDocumentAction`/`DeleteTurmaDocumentAction` (Task 3),
  `TurmaDocumentType` (Task 2).
- Produces: rotas `GET|POST turmas/{turma}/documents`, `DELETE turmas/{turma}/documents/{file}`
  (scoped); `TurmaDocumentData{id,type,original_name,size,created_at}`.

- [ ] **Step 1: Teste (falhando)**

```php
<?php

namespace Tests\Feature\Operation;

use App\Domains\Catalog\Models\Course;
use App\Domains\Commercial\Models\Budget;
use App\Domains\Commercial\Models\Quote;
use App\Domains\Identity\Models\User;
use App\Domains\Operation\Enums\TurmaModalidade;
use App\Domains\Operation\Models\Turma;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class TurmaDocumentApiTest extends TestCase
{
    use RefreshDatabase;

    private Turma $turma;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake();
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
        ]);
    }

    /** Redator autentica (RN-01) e a role dele TEM submit_docs (D9). */
    private function actingAsRedatorRole(): User
    {
        $this->seed(RolePermissionSeeder::class);
        $user = User::factory()->create(['type' => 'redator', 'is_active' => true]);
        $user->assignRole('redator');
        $this->actingAs($user, 'web');

        return $user;
    }

    private function pdf(): UploadedFile
    {
        return UploadedFile::fake()->create('doc.pdf', 20, 'application/pdf');
    }

    public function test_redator_sobe_doc_201_e_lista(): void
    {
        $this->actingAsRedatorRole();

        $this->postJson("/api/turmas/{$this->turma->id}/documents", [
            'type' => 'MANUAL', 'file' => $this->pdf(),
        ])->assertCreated()->assertJsonPath('type', 'MANUAL');

        $this->getJson("/api/turmas/{$this->turma->id}/documents")
            ->assertOk()->assertJsonCount(1)->assertJsonPath('0.type', 'MANUAL');
    }

    public function test_admin_comum_sem_submit_docs_403(): void
    {
        // Segregação deliberada do seeder (D9): doc é ação do redator.
        $this->actingAsAdmin();

        $this->postJson("/api/turmas/{$this->turma->id}/documents", [
            'type' => 'MANUAL', 'file' => $this->pdf(),
        ])->assertForbidden();
    }

    public function test_superadmin_sobe_doc_201(): void
    {
        $this->actingAsSuperadmin();

        $this->postJson("/api/turmas/{$this->turma->id}/documents", [
            'type' => 'PRUEBAS', 'file' => $this->pdf(),
        ])->assertCreated();
    }

    public function test_tipo_invalido_e_nao_pdf_422(): void
    {
        $this->actingAsSuperadmin();

        $this->postJson("/api/turmas/{$this->turma->id}/documents", [
            'type' => 'CV', 'file' => $this->pdf(),
        ])->assertStatus(422)->assertJsonValidationErrors('type');

        $this->postJson("/api/turmas/{$this->turma->id}/documents", [
            'type' => 'MANUAL',
            'file' => UploadedFile::fake()->create('x.docx', 20, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
        ])->assertStatus(422)->assertJsonValidationErrors('file');
    }

    public function test_delete_204_e_cross_turma_404(): void
    {
        $this->actingAsSuperadmin();
        $fileId = $this->postJson("/api/turmas/{$this->turma->id}/documents", [
            'type' => 'MANUAL', 'file' => $this->pdf(),
        ])->json('id');

        // outra turma (outra quote do mesmo budget) — scoped binding deve dar 404
        $quote2 = Quote::create([
            'budget_id' => $this->turma->quote->budget_id, 'course_id' => $this->turma->course_id,
            'seq_in_budget' => 2, 'student_count' => 5, 'value_uf' => 10, 'status' => 'approved',
        ]);
        $outra = Turma::create([
            'quote_id' => $quote2->id, 'course_id' => $this->turma->course_id,
            'modalidade' => TurmaModalidade::Online, 'local_aplicacao' => null,
            'start_date' => '2026-09-01', 'end_date' => '2026-09-10',
        ]);

        $this->deleteJson("/api/turmas/{$outra->id}/documents/{$fileId}")->assertNotFound();
        $this->deleteJson("/api/turmas/{$this->turma->id}/documents/{$fileId}")->assertNoContent();
        $this->assertSoftDeleted('files', ['id' => $fileId]);
    }
}
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `docker compose exec -T app php artisan test --filter=TurmaDocumentApiTest`
Expected: FAIL (404 — rota inexistente).

- [ ] **Step 3: DTO**

```php
<?php

namespace App\Domains\Operation\Data;

use App\Shared\Files\Models\File;
use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * Documento da turma (leitura). Sem download_url por ora — a listagem serve o
 * checklist RN-16; o download entra com a tela (6-frontend) se necessário.
 */
#[TypeScript]
class TurmaDocumentData extends Data
{
    public function __construct(
        public int $id,
        public string $type,
        public string $original_name,
        public int $size,
        public string $created_at,
    ) {}

    public static function fromModel(File $file): self
    {
        return new self(
            id: $file->id,
            type: $file->type,
            original_name: $file->original_name,
            size: $file->size,
            created_at: $file->created_at->toISOString(),
        );
    }
}
```

- [ ] **Step 4: Controller**

```php
<?php

namespace App\Domains\Operation\Http\Controllers;

use App\Domains\Operation\Actions\DeleteTurmaDocumentAction;
use App\Domains\Operation\Actions\StoreTurmaDocumentAction;
use App\Domains\Operation\Data\TurmaDocumentData;
use App\Domains\Operation\Enums\TurmaDocumentType;
use App\Domains\Operation\Models\Turma;
use App\Http\Controllers\Controller;
use App\Shared\Files\Models\File;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Illuminate\Validation\Rules\Enum;

class TurmaDocumentController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('permission:operation.turma.view', only: ['index']),
            new Middleware('permission:operation.turma.submit_docs', only: ['store', 'destroy']),
        ];
    }

    /** @return array<TurmaDocumentData> */
    public function index(Turma $turma): array
    {
        return $turma->files()
            ->whereIn('type', array_column(TurmaDocumentType::cases(), 'value'))
            ->orderBy('created_at')
            ->get()
            ->map(fn (File $f) => TurmaDocumentData::fromModel($f))
            ->all();
    }

    public function store(Request $request, Turma $turma, StoreTurmaDocumentAction $action): JsonResponse
    {
        $validated = $request->validate([
            'type' => ['required', new Enum(TurmaDocumentType::class)],
            'file' => ['required', 'file', 'mimes:pdf', 'max:10240'],
        ]);

        $file = $action->execute($turma, TurmaDocumentType::from($validated['type']), $request->file('file'));

        return TurmaDocumentData::fromModel($file)->toResponse($request)->setStatusCode(201);
    }

    public function destroy(Turma $turma, File $file, DeleteTurmaDocumentAction $action): Response
    {
        $action->execute($turma, $file);

        return response()->noContent();
    }
}
```

- [ ] **Step 5: Rotas** — dentro do group existente de `Operation/routes.php` (importar o
  controller no topo):

```php
    Route::get('turmas/{turma}/documents', [TurmaDocumentController::class, 'index']);
    Route::post('turmas/{turma}/documents', [TurmaDocumentController::class, 'store']);
    Route::delete('turmas/{turma}/documents/{file}', [TurmaDocumentController::class, 'destroy'])
        ->scopeBindings();   // {file} resolve por $turma->files() — cross-turma = 404
```

- [ ] **Step 6: Rodar (PASS) + suíte**

Run: `docker compose exec -T app php artisan test --filter=TurmaDocumentApiTest` → 5/5 PASS.
Run: `docker compose exec -T app php artisan test` → tudo verde.

- [ ] **Step 7: Regen tipos + build front** (lição #11 — mesmo commit)

```bash
docker compose exec -T app php artisan typescript:transform
cd frontend && pnpm build && cd ..
```
Expected: `generated.ts` ganha `TurmaDocumentData` e o union de `TurmaStatus` perde
`'habilitada'` (Task 1). Sem consumidor front de turma ainda → build verde sem ajuste. Se o
build quebrar, corrigir os consumidores NO MESMO commit.

- [ ] **Step 8: Pint + commit**

```bash
cd backend && ./vendor/bin/pint app/Domains/Operation/Data/TurmaDocumentData.php app/Domains/Operation/Http/Controllers/TurmaDocumentController.php app/Domains/Operation/routes.php tests/Feature/Operation/TurmaDocumentApiTest.php && cd ..
git add backend/app/Domains/Operation/Data/TurmaDocumentData.php backend/app/Domains/Operation/Http/Controllers/TurmaDocumentController.php backend/app/Domains/Operation/routes.php backend/tests/Feature/Operation/TurmaDocumentApiTest.php frontend/src/shared/types/generated.ts
git commit -m "feat(operation): endpoints de documentos da turma (6d)"
```

---

### Task 5: `ConcludeTurmaAction` + rota + `TurmaData` estendido + regen

**Files:**
- Create: `backend/app/Domains/Operation/Actions/ConcludeTurmaAction.php`
- Modify: `backend/app/Domains/Operation/Http/Controllers/TurmaController.php`
- Modify: `backend/app/Domains/Operation/Data/TurmaData.php`
- Modify: `backend/app/Domains/Operation/routes.php`
- Modify (regen): `frontend/src/shared/types/generated.ts`
- Test: `backend/tests/Feature/Operation/ConcludeTurmaTest.php`

**Interfaces:**
- Consumes: `TurmaHabilitacaoService` (Task 2), `concluded_at` (Task 1),
  `StoreTurmaDocumentAction` (Task 3, no teste).
- Produces: `POST /api/turmas/{turma}/conclude` (200, `TurmaData`);
  `TurmaData` com `habilitada: bool`, `missing_document_types: string[]`,
  `concluded_at: ?string` (ISO).

- [ ] **Step 1: Teste (falhando)**

```php
<?php

namespace Tests\Feature\Operation;

use App\Domains\Catalog\Models\Course;
use App\Domains\Commercial\Models\Budget;
use App\Domains\Commercial\Models\Quote;
use App\Domains\Identity\Models\User;
use App\Domains\Operation\Actions\StoreTurmaDocumentAction;
use App\Domains\Operation\Enums\TurmaDocumentType;
use App\Domains\Operation\Enums\TurmaModalidade;
use App\Domains\Operation\Models\Turma;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ConcludeTurmaTest extends TestCase
{
    use RefreshDatabase;

    private Turma $turma;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake();
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
        ]);
    }

    private function completarDocs(): void
    {
        $action = app(StoreTurmaDocumentAction::class);
        foreach (TurmaDocumentType::cases() as $type) {
            $action->execute($this->turma, $type,
                UploadedFile::fake()->create('d.pdf', 10, 'application/pdf'));
        }
    }

    public function test_turma_data_expoe_habilitada_e_faltantes(): void
    {
        $this->actingAsAdmin();

        $this->getJson("/api/turmas/{$this->turma->id}")
            ->assertOk()
            ->assertJsonPath('habilitada', false)
            ->assertJsonPath('missing_document_types', ['MANUAL', 'PRUEBAS', 'EVALUACION_REDATOR'])
            ->assertJsonPath('concluded_at', null);

        $this->completarDocs();

        $this->getJson("/api/turmas/{$this->turma->id}")
            ->assertOk()
            ->assertJsonPath('habilitada', true)
            ->assertJsonPath('missing_document_types', []);
    }

    public function test_concluir_sem_doc_completa_422_com_faltantes(): void
    {
        $this->actingAsAdmin();

        $this->postJson("/api/turmas/{$this->turma->id}/conclude")
            ->assertStatus(422)
            ->assertJsonValidationErrors('documents');

        $this->assertSame('em_andamento', $this->turma->fresh()->status->value);
    }

    public function test_concluir_habilitada_200_e_terminal(): void
    {
        $this->actingAsAdmin();
        $this->completarDocs();

        $this->postJson("/api/turmas/{$this->turma->id}/conclude")
            ->assertOk()
            ->assertJsonPath('status', 'concluida')
            ->assertJsonPath('habilitada', false);   // concluída não é "habilitada"

        $fresh = $this->turma->fresh();
        $this->assertSame('concluida', $fresh->status->value);
        $this->assertNotNull($fresh->concluded_at);

        // terminal (D5): segunda chamada recusa
        $this->postJson("/api/turmas/{$this->turma->id}/conclude")->assertStatus(422);
    }

    public function test_rn15_upload_e_delete_apos_conclusao_422(): void
    {
        $this->actingAsSuperadmin();
        $this->completarDocs();
        $docId = $this->turma->files()->first()->id;

        $this->postJson("/api/turmas/{$this->turma->id}/conclude")->assertOk();

        $this->postJson("/api/turmas/{$this->turma->id}/documents", [
            'type' => 'PRUEBAS',
            'file' => UploadedFile::fake()->create('x.pdf', 10, 'application/pdf'),
        ])->assertStatus(422);

        $this->deleteJson("/api/turmas/{$this->turma->id}/documents/{$docId}")
            ->assertStatus(422);
    }

    public function test_sem_permissao_complete_403(): void
    {
        // usuário autenticado sem role (nenhuma permissão)
        $this->seed(\Database\Seeders\RolePermissionSeeder::class);
        $user = User::factory()->create(['type' => 'redator', 'is_active' => true]);
        $user->assignRole('redator');   // redator NÃO tem operation.turma.complete
        $this->actingAs($user, 'web');

        $this->postJson("/api/turmas/{$this->turma->id}/conclude")->assertForbidden();
    }
}
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `docker compose exec -T app php artisan test --filter=ConcludeTurmaTest`
Expected: FAIL (rota/campos inexistentes).

- [ ] **Step 3: Action**

```php
<?php

namespace App\Domains\Operation\Actions;

use App\Domains\Operation\Enums\TurmaStatus;
use App\Domains\Operation\Models\Turma;
use App\Domains\Operation\Services\TurmaHabilitacaoService;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Conclusão da turma (RN-16: doc habilita, admin confirma). TERMINAL (D5):
 * não existe caminho de reversão — erro raro se corrige via suporte, com
 * auditoria. Habilita a emissão de certificados (RN-08, Sprint 4).
 */
class ConcludeTurmaAction
{
    public function __construct(private TurmaHabilitacaoService $habilitacao) {}

    public function execute(Turma $turma): Turma
    {
        return DB::transaction(function () use ($turma) {
            if ($turma->status !== TurmaStatus::EmAndamento) {
                throw ValidationException::withMessages([
                    'status' => 'La clase ya fue concluida.',
                ]);
            }

            $missing = $this->habilitacao->missingTypes($turma);
            if ($missing !== []) {
                throw ValidationException::withMessages([
                    'documents' => 'Documentación obligatoria incompleta (RN-16). Falta: '.implode(', ', $missing).'.',
                ]);
            }

            $turma->status = TurmaStatus::Concluida;
            $turma->concluded_at = now();
            $turma->save();

            return $turma;
        });
    }
}
```

- [ ] **Step 4: `TurmaData`** — novos campos read-only (depois de `status`, antes de
  `redatores`) + projeção:

```php
        public TurmaStatus|Optional $status,
        public bool|Optional $habilitada,
        /** @var string[] */
        public array|Optional $missing_document_types,
        public string|null|Optional $concluded_at,
        /** @var TurmaRedatorData[] */
        public array|Optional $redatores = [],
```

Em `fromModel`, injetar o service e projetar (imports: `App\Domains\Operation\Services\TurmaHabilitacaoService`):

```php
    public static function fromModel(Turma $turma): self
    {
        $habilitacao = app(TurmaHabilitacaoService::class);

        return new self(
            id: $turma->id,
            quote_id: $turma->quote_id,
            course_id: $turma->course_id,
            modalidade: $turma->modalidade,
            local_aplicacao: $turma->local_aplicacao,
            start_date: $turma->start_date->toDateString(),
            end_date: $turma->end_date->toDateString(),
            status: $turma->status,
            habilitada: $habilitacao->isHabilitada($turma),
            missing_document_types: $habilitacao->missingTypes($turma),
            concluded_at: $turma->concluded_at?->toISOString(),
            redatores: $turma->redatores->map(fn (Redator $r) => TurmaRedatorData::fromModel($r))->all(),
        );
    }
```

- [ ] **Step 5: Controller + rota** — em `TurmaController`: adicionar ao `middleware()`
  `new Middleware('permission:operation.turma.complete', only: ['conclude']),` e o método
  (imports: `ConcludeTurmaAction`):

```php
    public function conclude(Turma $turma, ConcludeTurmaAction $action): JsonResponse
    {
        return TurmaData::fromModel($action->execute($turma)->load('redatores.user'))
            ->toResponse(request())
            ->setStatusCode(200);
    }
```

Em `routes.php`: `Route::post('turmas/{turma}/conclude', [TurmaController::class, 'conclude']);`

- [ ] **Step 6: Rodar (PASS) + suíte**

Run: `docker compose exec -T app php artisan test --filter=ConcludeTurmaTest` → 5/5 PASS.
Run: `docker compose exec -T app php artisan test` → tudo verde.

- [ ] **Step 7: Regen tipos + build**

```bash
docker compose exec -T app php artisan typescript:transform
cd frontend && pnpm build && cd ..
```
Expected: `TurmaData` ganha os 3 campos; build verde (sem consumidor de turma no front).

- [ ] **Step 8: Pint + commit**

```bash
cd backend && ./vendor/bin/pint app/Domains/Operation/Actions/ConcludeTurmaAction.php app/Domains/Operation/Http/Controllers/TurmaController.php app/Domains/Operation/Data/TurmaData.php app/Domains/Operation/routes.php tests/Feature/Operation/ConcludeTurmaTest.php && cd ..
git add backend/app/Domains/Operation/Actions/ConcludeTurmaAction.php backend/app/Domains/Operation/Http/Controllers/TurmaController.php backend/app/Domains/Operation/Data/TurmaData.php backend/app/Domains/Operation/routes.php backend/tests/Feature/Operation/ConcludeTurmaTest.php frontend/src/shared/types/generated.ts
git commit -m "feat(operation): conclusão terminal da turma com gate RN-16 (6d)"
```

---

### Task 6: Manual de classe — Blade + `ManualPdfService` (Gotenberg) + rota

**Files:**
- Modify: `backend/config/services.php` (bloco `gotenberg`)
- Modify: `backend/.env.example` (`GOTENBERG_URL`)
- Create: `backend/resources/views/operation/manual-turma.blade.php`
- Create: `backend/app/Domains/Operation/Services/ManualPdfService.php`
- Modify: `backend/app/Domains/Operation/Http/Controllers/TurmaController.php`
- Modify: `backend/app/Domains/Operation/routes.php`
- Test: `backend/tests/Feature/Operation/ManualTurmaTest.php`

**Interfaces:**
- Consumes: relações existentes `Turma::{course,quote,redatores,enrollments}`,
  `Course::modules()`, `Quote::budget()->client` (`legal_name`),
  `Enrollment::student()->user` (`name`, `rut`).
- Produces: `GET /api/turmas/{turma}/manual` → `application/pdf` inline;
  `ManualPdfService::render(Turma): string` (bytes do PDF).

- [ ] **Step 1: Teste (falhando)**

```php
<?php

namespace Tests\Feature\Operation;

use App\Domains\Catalog\Models\Course;
use App\Domains\Commercial\Models\Budget;
use App\Domains\Commercial\Models\Quote;
use App\Domains\Identity\Models\User;
use App\Domains\Operation\Enums\TurmaModalidade;
use App\Domains\Operation\Models\Turma;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class ManualTurmaTest extends TestCase
{
    use RefreshDatabase;

    private Turma $turma;

    protected function setUp(): void
    {
        parent::setUp();
        $clientId = User::factory()->create(['type' => 'cliente', 'is_active' => false])
            ->client()->create(['legal_name' => 'ACME Chile', 'type' => 'client'])->id;
        $budget = Budget::create(['client_id' => $clientId, 'code' => 'Scap 1']);
        $course = Course::create(['name' => 'Alta Tensión', 'workload_hours' => 8]);
        $course->modules()->create([
            'sort_order' => 0, 'name' => 'Módulo Seguridad', 'learnings' => 'L',
            'contents' => 'C', 'theory_hours' => 4, 'practice_hours' => 4,
        ]);
        $quote = Quote::create([
            'budget_id' => $budget->id, 'course_id' => $course->id, 'seq_in_budget' => 1,
            'student_count' => 5, 'value_uf' => 10, 'status' => 'approved',
        ]);
        $this->turma = Turma::create([
            'quote_id' => $quote->id, 'course_id' => $course->id,
            'modalidade' => TurmaModalidade::Presencial, 'local_aplicacao' => 'Santiago',
            'start_date' => '2026-08-01', 'end_date' => '2026-08-10',
        ]);
    }

    public function test_manual_devolve_pdf_do_gotenberg(): void
    {
        $this->actingAsAdmin();
        Http::preventStrayRequests();
        Http::fake(['*/forms/chromium/convert/html' => Http::response('%PDF-fake')]);

        $response = $this->get("/api/turmas/{$this->turma->id}/manual");

        $response->assertOk()->assertHeader('Content-Type', 'application/pdf');
        $this->assertStringStartsWith('%PDF', $response->getContent());

        // O HTML enviado ao Gotenberg leva os dados reais da turma (RF-TUR-04)
        Http::assertSent(function ($request) {
            $body = (string) $request->body();

            return str_contains($body, 'Alta Tensión')
                && str_contains($body, 'ACME Chile')
                && str_contains($body, 'Módulo Seguridad')
                && str_contains($body, 'Santiago');
        });
    }

    public function test_gotenberg_fora_do_ar_500_rfc7807(): void
    {
        $this->actingAsAdmin();
        Http::preventStrayRequests();
        Http::fake(['*/forms/chromium/convert/html' => Http::response('boom', 503)]);

        $this->getJson("/api/turmas/{$this->turma->id}/manual")->assertStatus(500);
    }

    public function test_manual_exige_turma_view(): void
    {
        // autenticado sem nenhuma permissão → 403
        $user = User::factory()->create(['type' => 'admin', 'is_active' => true]);
        $this->actingAs($user, 'web');

        $this->getJson("/api/turmas/{$this->turma->id}/manual")->assertForbidden();
    }
}
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `docker compose exec -T app php artisan test --filter=ManualTurmaTest`
Expected: FAIL (rota inexistente).

- [ ] **Step 3: Config** — em `config/services.php` adicionar:

```php
    'gotenberg' => [
        // Conversor HTML→PDF (compose service `gotenberg`). Sprint 4 (certificados) reusa.
        'url' => env('GOTENBERG_URL', 'http://gotenberg:3000'),
    ],
```

Em `.env.example` adicionar linha `GOTENBERG_URL=http://gotenberg:3000`. (**Não** editar `.env`
do João — o default do config já cobre o compose.)

- [ ] **Step 4: Service**

```php
<?php

namespace App\Domains\Operation\Services;

use App\Domains\Operation\Models\Turma;
use Illuminate\Support\Facades\Http;
use RuntimeException;

/**
 * Manual de classe (RF-TUR-04): Blade única padronizada (D6) renderizada com
 * os dados ATUAIS e convertida em PDF pelo Gotenberg — nada materializado
 * (D7, mesmo racional do certificado RF-CER-03).
 */
class ManualPdfService
{
    public function render(Turma $turma): string
    {
        $turma->load(['course.modules', 'quote.budget.client', 'redatores.user', 'enrollments.student.user']);

        $html = view('operation.manual-turma', ['turma' => $turma])->render();

        $response = Http::attach('files', $html, 'index.html')
            ->post(rtrim(config('services.gotenberg.url'), '/').'/forms/chromium/convert/html');

        if ($response->failed()) {
            throw new RuntimeException("Gotenberg falhou ao converter o manual (HTTP {$response->status()}).");
        }

        return $response->body();
    }
}
```

- [ ] **Step 5: Blade** — `resources/views/operation/manual-turma.blade.php` (CSS inline
  print-friendly, sem asset externo — o Gotenberg renderiza isolado):

```blade
<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>Manual de Clases — {{ $turma->course->name }}</title>
<style>
    body { font-family: DejaVu Sans, Arial, sans-serif; font-size: 12px; color: #111; margin: 32px; }
    h1 { font-size: 20px; border-bottom: 2px solid #111; padding-bottom: 8px; }
    h2 { font-size: 15px; margin-top: 24px; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th, td { border: 1px solid #999; padding: 6px 8px; text-align: left; vertical-align: top; }
    th { background: #eee; }
    .meta td:first-child { font-weight: bold; width: 30%; background: #f6f6f6; }
</style>
</head>
<body>
    <h1>Manual de Clases — {{ $turma->course->name }}</h1>

    <h2>Datos de la clase</h2>
    <table class="meta">
        <tr><td>Cliente</td><td>{{ $turma->quote->budget->client->legal_name }}</td></tr>
        <tr><td>Curso</td><td>{{ $turma->course->name }} ({{ $turma->course->workload_hours }} h)</td></tr>
        <tr><td>Modalidad</td><td>{{ $turma->modalidade->value }}</td></tr>
        @if ($turma->local_aplicacao)
            <tr><td>Lugar de aplicación</td><td>{{ $turma->local_aplicacao }}</td></tr>
        @endif
        <tr><td>Fecha de inicio</td><td>{{ $turma->start_date->format('d-m-Y') }}</td></tr>
        <tr><td>Fecha de término</td><td>{{ $turma->end_date->format('d-m-Y') }}</td></tr>
        <tr><td>Relator(es)</td><td>{{ $turma->redatores->map(fn ($r) => $r->user->name)->implode(', ') ?: '—' }}</td></tr>
    </table>

    <h2>Contenido programático</h2>
    <table>
        <tr><th>#</th><th>Módulo</th><th>Objetivos</th><th>Contenidos</th><th>Horas T</th><th>Horas P</th></tr>
        @foreach ($turma->course->modules->sortBy('sort_order') as $i => $module)
            <tr>
                <td>{{ $i + 1 }}</td>
                <td>{{ $module->name }}</td>
                <td>{{ $module->learnings }}</td>
                <td>{{ $module->contents }}</td>
                <td>{{ $module->theory_hours }}</td>
                <td>{{ $module->practice_hours }}</td>
            </tr>
        @endforeach
    </table>

    <h2>Participantes</h2>
    <table>
        <tr><th>#</th><th>Nombre</th><th>RUT</th><th>Firma</th></tr>
        @forelse ($turma->enrollments as $i => $enrollment)
            <tr>
                <td>{{ $i + 1 }}</td>
                <td>{{ $enrollment->student->user->name }}</td>
                <td>{{ $enrollment->student->user->rut }}</td>
                <td></td>
            </tr>
        @empty
            <tr><td colspan="4">Sin participantes matriculados.</td></tr>
        @endforelse
    </table>
</body>
</html>
```

- [ ] **Step 6: Controller + rota** — em `TurmaController`: incluir `'manual'` no `only` do
  middleware `operation.turma.view` e adicionar (imports `ManualPdfService`, `Response` já
  importado):

```php
    public function manual(Turma $turma, ManualPdfService $manual): Response
    {
        return response($manual->render($turma), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => "inline; filename=\"manual-turma-{$turma->id}.pdf\"",
        ]);
    }
```

Em `routes.php`: `Route::get('turmas/{turma}/manual', [TurmaController::class, 'manual']);`

- [ ] **Step 7: Rodar (PASS) + suíte**

Run: `docker compose exec -T app php artisan test --filter=ManualTurmaTest` → 3/3 PASS.
Run: `docker compose exec -T app php artisan test` → tudo verde.

- [ ] **Step 8: Pint + commit**

```bash
cd backend && ./vendor/bin/pint config/services.php app/Domains/Operation/Services/ManualPdfService.php app/Domains/Operation/Http/Controllers/TurmaController.php app/Domains/Operation/routes.php tests/Feature/Operation/ManualTurmaTest.php && cd ..
git add backend/config/services.php backend/.env.example backend/resources/views/operation/manual-turma.blade.php backend/app/Domains/Operation/Services/ManualPdfService.php backend/app/Domains/Operation/Http/Controllers/TurmaController.php backend/app/Domains/Operation/routes.php backend/tests/Feature/Operation/ManualTurmaTest.php
git commit -m "feat(operation): manual de classe em PDF via Gotenberg (6d)"
```

---

### Task 7: Prova real (MySQL + Gotenberg) + docs

**Files:**
- Modify: `docs/der-fisico.md` (linha de `turmas`: enum 2 valores + `concluded_at`)
- Modify: `docs/pendencias.md` (P-07 ganha as 2 chaves novas; nova linha RF-CUR-04)

**Interfaces:**
- Consumes: tudo dos Tasks 1–6 mergeado na branch.

- [ ] **Step 1: Prova MySQL (lição #15)**

```bash
docker compose exec -T app php artisan migrate
docker compose exec -T mysql mysql -uroot -proot lotus -e "SHOW CREATE TABLE turmas\G"
```
Expected: migrate DONE sem 1215/1064; `status` = `enum('em_andamento','concluida')` e
`concluded_at` timestamp NULL presentes no DDL real.

- [ ] **Step 2: Prova Gotenberg real** — fluxo completo via nginx com cookie Sanctum (molde do
  e2e do 6c — lembrar `Origin` + `Accept`, lição #12; RUTs válidos: 11.111.111-1 etc.):
  criar turma → subir 3 docs → `GET /api/turmas/{id}` com `habilitada=true` → `conclude` 200 →
  upload extra 422 (RN-15) → `GET /api/turmas/{id}/manual` devolve bytes começando em `%PDF`
  (Gotenberg do compose, sem fake). Registrar o resultado no ledger. Limpar fixtures ao final
  (ou `migrate:fresh --seed` se o João aprovar).

- [ ] **Step 3: `docs/der-fisico.md`** — na seção de tabelas implementadas, atualizar `turmas`:
  `status` vira `enum('em_andamento','concluida') default 'em_andamento'` com nota
  "(`habilitada` é derivada em runtime — TurmaHabilitacaoService, spec 6d D3)" e adicionar
  `concluded_at timestamp NULL — ato do admin (RN-16)`.

- [ ] **Step 4: `docs/pendencias.md`** —
  1. Na linha **P-07**, acrescentar `operation.turma.submit_docs` e `operation.turma.complete`
     à lista de chaves i18n faltantes (mesmo gatilho: Bloco 6-frontend).
  2. Nova linha **P-08**: "RF-CUR-04 promete template de Manual POR CURSO; implementado Blade
     única padronizada (spec 6d D6, respaldo em `modulo-operacao.md`). Schema não tem
     `course_manual_templates`." Gatilho: "Se o contratante pedir manual personalizado por
     curso."

- [ ] **Step 5: Suíte final + commit**

```bash
docker compose exec -T app php artisan test
git add docs/der-fisico.md docs/pendencias.md
git commit -m "docs: der-fisico turmas 6d + pendências P-07/P-08"
```

---

## Self-review (feito na escrita)

- **Cobertura do spec:** §3→Task 1 · §4 enum/service→Task 2 · §4 guard/actions→Task 3 ·
  §6 docs API→Task 4 · §4 conclude + §6 DTO→Task 5 · §5 manual→Task 6 · §7 prova real +
  §8 divergências→Task 7. DoD itens 1–12 mapeados nos testes das Tasks 2–6; prova real na 7.
- **Sem placeholder**; tipos/assinaturas conferidos contra o código real (TurmaController,
  TurmaData, UploadFileAction, seeder, molds de teste).
- **Permissões:** nomes reais do catálogo (`submit_docs`/`complete`) — D9.
