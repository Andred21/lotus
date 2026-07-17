# Bloco 3 · `course_modules` 1:N (backend) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Modelar o quadro de módulos da proposta comercial como entidade `course_modules` 1:N de `courses` — item ordenado, nome, aprendizagens, conteúdos, horas teóricas/práticas — com totais derivados em runtime e nenhuma coluna de total.

**Architecture:** Módulos são **nested do `CourseData`**, como `addresses`/`contacts` do Client: sem rota nova, sem permissão nova. `Create/UpdateCourseAction` sincronizam por **replace instância-a-instância** dentro da transação já existente, gravando `sort_order` = índice do array (1..N). Totais (`total_hours` por módulo, `modules_total_hours` do curso) são derivados em `fromModel`.

**Tech Stack:** Laravel 13 / PHP 8.3, Eloquent + SoftDeletes, owen-it/laravel-auditing, spatie/laravel-data + typescript-transformer, PHPUnit sobre sqlite `:memory:`.

**Spec:** `docs/superpowers/specs/2026-07-16-bloco3-course-modules-backend-design.md` · **Notion:** CR.2.2 · **ADR:** 02, 04, 08, 10.

## Global Constraints

- **Backend roda no container.** Todo comando `artisan`/`test` é `docker compose exec -T app <cmd>` a partir da raiz do repo. O host WSL não tem mbstring.
- **`pint` só com argumento:** `./vendor/bin/pint <arquivos>` — nunca sem, reformata o repo inteiro.
- **Nenhuma coluna de total** — nem por módulo, nem no curso. Totais são derivados em `fromModel`.
- **`courses.workload_hours` não muda** e não é validado contra a soma dos módulos. Divergência é aviso do front (Bloco 4) — §5.7: registro não bloqueia ação.
- **Cascata/replace é instância-a-instância** (`->get()->each(fn ($m) => $m->delete())`). Delete pelo query builder **não audita** (ADR-08) — lei inviolável.
- **`generated.ts` nunca se edita à mão** (ADR-04): corrige-se o DTO e regenera.
- **`git add` só os caminhos da task.** O working tree pode ter WIP do João — nunca `git add -A`, nunca `git commit -a`.
- **Schema em inglês.** Exceção do projeto: `redator` (nome próprio do domínio) — não se aplica aqui.
- **Cada task roda a suíte inteira antes do commit:** `docker compose exec -T app php artisan test`.

---

### Task 1: Migration + Model `CourseModule` (schema, auditoria, cascata)

**Files:**
- Create: `backend/database/migrations/2026_07_16_000000_course_modules.php`
- Create: `backend/app/Domains/Catalog/Models/CourseModule.php`
- Modify: `backend/app/Providers/AppServiceProvider.php` (morph map, após a linha do alias `course_certificate_template`)
- Modify: `backend/app/Domains/Catalog/Models/Course.php` (relação `modules()` + cascata no `booted()`)
- Test: `backend/tests/Feature/Cadastros/SchemaTest.php` (modificar), `backend/tests/Feature/Cadastros/CourseModelTest.php` (modificar)

**Interfaces:**
- Consumes: nada (primeira task).
- Produces: `App\Domains\Catalog\Models\CourseModule` com `$fillable = ['sort_order','name','learnings','contents','theory_hours','practice_hours']`; `Course::modules(): HasMany` já ordenado por `sort_order`; alias de morph map `course_module`.

- [ ] **Step 1: Escrever os testes que falham**

Em `backend/tests/Feature/Cadastros/SchemaTest.php`, adicionar logo após o bloco `course_redator` (hoje encerra o método, ~linha 44-46):

```php
        $this->assertTrue(Schema::hasTable('course_modules'));
        $this->assertTrue(Schema::hasColumns('course_modules', [
            'course_id', 'sort_order', 'name', 'learnings', 'contents',
            'theory_hours', 'practice_hours', 'deleted_at',
        ]));
```

Em `backend/tests/Feature/Cadastros/CourseModelTest.php`, adicionar os dois testes ao final da classe (o `use App\Domains\Catalog\Models\Course;` já existe no topo):

```php
    public function test_modules_vem_ordenado_por_sort_order(): void
    {
        $course = Course::create(['name' => 'Curso X', 'workload_hours' => 8]);

        // Inseridos fora de ordem de propósito: a relação é que ordena.
        $course->modules()->create(['sort_order' => 2, 'name' => 'Segundo', 'theory_hours' => 3, 'practice_hours' => 1]);
        $course->modules()->create(['sort_order' => 1, 'name' => 'Primeiro', 'theory_hours' => 2, 'practice_hours' => 2]);

        $this->assertSame(['Primeiro', 'Segundo'], $course->modules()->pluck('name')->all());
    }

    public function test_soft_delete_do_curso_cascateia_para_modules_e_audita(): void
    {
        $course = Course::create(['name' => 'Curso X', 'workload_hours' => 8]);
        $module = $course->modules()->create(['sort_order' => 1, 'name' => 'Módulo 1']);

        $course->delete();

        $this->assertSoftDeleted('courses', ['id' => $course->id]);
        $this->assertSoftDeleted('course_modules', ['id' => $module->id]);

        // A prova de que a cascata não passou pelo query builder (ADR-08).
        $this->assertDatabaseHas('audits', [
            'auditable_type' => 'course_module',
            'auditable_id' => $module->id,
            'event' => 'deleted',
        ]);
    }
```

- [ ] **Step 2: Rodar os testes e confirmar que falham**

```bash
docker compose exec -T app php artisan test --filter=SchemaTest
docker compose exec -T app php artisan test --filter=CourseModelTest
```

Esperado: FAIL. `SchemaTest` falha no `assertTrue(Schema::hasTable('course_modules'))`; `CourseModelTest` falha com `Call to undefined method ... Course::modules()` (ou `BadMethodCallException`).

- [ ] **Step 3: Criar a migration**

`backend/database/migrations/2026_07_16_000000_course_modules.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Quadro de módulos da proposta comercial. Sem coluna de total: horas do
        // módulo e soma do curso são derivadas em runtime (CourseModuleData/CourseData).
        Schema::create('course_modules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('course_id')->constrained('courses')->cascadeOnDelete();
            $table->unsignedSmallInteger('sort_order');       // o "Item" (1..N)
            $table->string('name');
            $table->text('learnings')->nullable();            // Aprendizajes
            $table->text('contents')->nullable();             // Contenidos (texto livre)
            $table->unsignedSmallInteger('theory_hours')->default(0);
            $table->unsignedSmallInteger('practice_hours')->default(0);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['course_id', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('course_modules');
    }
};
```

- [ ] **Step 4: Criar o model `CourseModule`**

`backend/app/Domains/Catalog/Models/CourseModule.php`:

```php
<?php

namespace App\Domains\Catalog\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use OwenIt\Auditing\Auditable as AuditableTrait;
use OwenIt\Auditing\Contracts\Auditable;

/**
 * Módulo do curso (o "Item" do quadro da proposta). `contents` é texto livre —
 * a numeração 1.1/1.2 é conteúdo autoral, não dado consultável. Horas totais
 * NÃO são persistidas: derivam em CourseModuleData.
 */
class CourseModule extends Model implements Auditable
{
    use AuditableTrait, SoftDeletes;

    protected $fillable = [
        'sort_order',
        'name',
        'learnings',
        'contents',
        'theory_hours',
        'practice_hours',
    ];

    protected $auditInclude = [
        'sort_order',
        'name',
        'learnings',
        'contents',
        'theory_hours',
        'practice_hours',
    ];

    protected function casts(): array
    {
        return [
            'sort_order' => 'integer',
            'theory_hours' => 'integer',
            'practice_hours' => 'integer',
        ];
    }

    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class);
    }
}
```

- [ ] **Step 5: Registrar o alias no morph map**

Em `backend/app/Providers/AppServiceProvider.php`, dentro do `Relation::enforceMorphMap([...])`, adicionar após a linha `'course_certificate_template' => ...`:

```php
            'course_module'   => \App\Domains\Catalog\Models\CourseModule::class,
```

- [ ] **Step 6: Ligar a relação e a cascata em `Course`**

Em `backend/app/Domains/Catalog/Models/Course.php`, dentro do `static::deleting` do `booted()`, adicionar a linha de módulos logo após a de templates:

```php
                $course->modules()->get()->each(fn (CourseModule $m) => $m->delete());
```

E adicionar o método após `certificateTemplates()`:

```php
    public function modules(): HasMany
    {
        return $this->hasMany(CourseModule::class)->orderBy('sort_order');
    }
```

`HasMany` já está importado no arquivo. `CourseModule` está no mesmo namespace (`App\Domains\Catalog\Models`) — sem `use` novo.

- [ ] **Step 7: Rodar a suíte inteira**

```bash
docker compose exec -T app php artisan test
```

Esperado: PASS, incluindo `test_modules_vem_ordenado_por_sort_order` e `test_soft_delete_do_curso_cascateia_para_modules_e_audita`. Se a suíte não subir o schema, o `RefreshDatabase` migra sozinho — nenhum `migrate` manual é necessário.

- [ ] **Step 8: Pint + commit**

```bash
docker compose exec -T app ./vendor/bin/pint app/Domains/Catalog/Models/CourseModule.php app/Domains/Catalog/Models/Course.php app/Providers/AppServiceProvider.php database/migrations/2026_07_16_000000_course_modules.php
git add backend/database/migrations/2026_07_16_000000_course_modules.php backend/app/Domains/Catalog/Models/CourseModule.php backend/app/Domains/Catalog/Models/Course.php backend/app/Providers/AppServiceProvider.php backend/tests/Feature/Cadastros/SchemaTest.php backend/tests/Feature/Cadastros/CourseModelTest.php
git commit -m "feat(catalog): course_modules — schema, model auditável e cascata do curso"
```

---

### Task 2: DTOs — `CourseModuleData` + totais derivados em `CourseData`

**Files:**
- Create: `backend/app/Domains/Catalog/Data/CourseModuleData.php`
- Modify: `backend/app/Domains/Catalog/Data/CourseData.php`
- Test: `backend/tests/Feature/Cadastros/CourseModuleDataTest.php` (criar)

**Interfaces:**
- Consumes: `CourseModule` (Task 1, `$fillable` acima), `Course::modules()`.
- Produces: `CourseModuleData` com campos `id`, `name`, `learnings`, `contents`, `theory_hours`, `practice_hours`, `sort_order` (saída), `total_hours` (saída) e `fromModel(CourseModule $m): self`; `CourseData` com `modules: array<CourseModuleData>` (entrada+saída) e `modules_total_hours` (saída). Task 3 consome `$data->modules` nas Actions.

- [ ] **Step 1: Escrever o teste que falha**

`backend/tests/Feature/Cadastros/CourseModuleDataTest.php`:

```php
<?php

namespace Tests\Feature\Cadastros;

use App\Domains\Catalog\Data\CourseData;
use App\Domains\Catalog\Models\Course;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CourseModuleDataTest extends TestCase
{
    use RefreshDatabase;

    public function test_totais_sao_derivados_do_model_sem_coluna(): void
    {
        $course = Course::create(['name' => 'Curso X', 'workload_hours' => 40]);
        $course->modules()->create(['sort_order' => 1, 'name' => 'M1', 'theory_hours' => 6, 'practice_hours' => 2]);
        $course->modules()->create(['sort_order' => 2, 'name' => 'M2', 'theory_hours' => 4, 'practice_hours' => 0]);

        $data = CourseData::fromModel($course->load(['certificateTemplates', 'redatores', 'modules']));

        $this->assertSame(8, $data->modules[0]->total_hours);
        $this->assertSame(4, $data->modules[1]->total_hours);
        $this->assertSame(12, $data->modules_total_hours);
        // Total do curso é contratado, independente da soma — não se ajusta.
        $this->assertSame(40, $data->workload_hours);
    }

    public function test_curso_sem_modulos_soma_zero(): void
    {
        $course = Course::create(['name' => 'Curso Y', 'workload_hours' => 8]);

        $data = CourseData::fromModel($course->load(['certificateTemplates', 'redatores', 'modules']));

        $this->assertSame([], $data->modules);
        $this->assertSame(0, $data->modules_total_hours);
    }
}
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

```bash
docker compose exec -T app php artisan test --filter=CourseModuleDataTest
```

Esperado: FAIL com `Class "App\Domains\Catalog\Data\CourseModuleData" not found` ou `Undefined property ... $modules_total_hours`.

- [ ] **Step 3: Criar `CourseModuleData`**

`backend/app/Domains/Catalog/Data/CourseModuleData.php`:

```php
<?php

namespace App\Domains\Catalog\Data;

use App\Domains\Catalog\Models\CourseModule;
use Spatie\LaravelData\Attributes\Validation\Min;
use Spatie\LaravelData\Attributes\Validation\Required;
use Spatie\LaravelData\Data;
use Spatie\LaravelData\Optional;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * Módulo do curso (nested de CourseData). `sort_order` NÃO é entrada: a Action
 * deriva do índice do array. `total_hours` é derivado — não existe coluna.
 */
#[TypeScript]
class CourseModuleData extends Data
{
    public function __construct(
        public int|Optional $id,
        #[Required]
        public string $name,
        public string|Optional|null $learnings = null,
        public string|Optional|null $contents = null,
        #[Min(0)]
        public int $theory_hours = 0,
        #[Min(0)]
        public int $practice_hours = 0,
        public int|Optional $sort_order = new Optional,
        public int|Optional $total_hours = new Optional,
    ) {}

    public static function fromModel(CourseModule $module): self
    {
        return new self(
            id: $module->id,
            name: $module->name,
            learnings: $module->learnings,
            contents: $module->contents,
            theory_hours: $module->theory_hours,
            practice_hours: $module->practice_hours,
            sort_order: $module->sort_order,
            total_hours: $module->theory_hours + $module->practice_hours,
        );
    }
}
```

- [ ] **Step 4: Ligar os módulos em `CourseData`**

Em `backend/app/Domains/Catalog/Data/CourseData.php`:

Adicionar ao construtor, depois de `$templates` e antes de `$redator_ids`:

```php
        /** @var array<CourseModuleData> */
        #[DataCollectionOf(CourseModuleData::class)]
        public array $modules = [],
```

Adicionar como último parâmetro do construtor (depois de `$redator_ids`):

```php
        public int|Optional $modules_total_hours = new Optional,
```

E no `fromModel`, adicionar os dois argumentos correspondentes:

```php
            modules: CourseModuleData::collect($course->modules->all()),
            redator_ids: $course->redatores->pluck('id')->all(),
            modules_total_hours: $course->modules->sum(
                fn ($m) => $m->theory_hours + $m->practice_hours
            ),
```

O import `Spatie\LaravelData\Attributes\DataCollectionOf` e `Spatie\LaravelData\Optional` já existem no arquivo. Atualizar o docblock da classe para citar que `modules` é nested read-write e que os totais são derivados.

- [ ] **Step 5: Rodar o teste e confirmar que passa**

```bash
docker compose exec -T app php artisan test --filter=CourseModuleDataTest
```

Esperado: PASS (2 testes).

- [ ] **Step 6: Rodar a suíte inteira**

```bash
docker compose exec -T app php artisan test
```

Esperado: PASS. Nenhum teste antigo quebra — `modules` tem default `[]` e os totais são `Optional` na entrada.

- [ ] **Step 7: Pint + commit**

```bash
docker compose exec -T app ./vendor/bin/pint app/Domains/Catalog/Data/CourseModuleData.php app/Domains/Catalog/Data/CourseData.php
git add backend/app/Domains/Catalog/Data/CourseModuleData.php backend/app/Domains/Catalog/Data/CourseData.php backend/tests/Feature/Cadastros/CourseModuleDataTest.php
git commit -m "feat(catalog): CourseModuleData nested + totais de horas derivados"
```

---

### Task 3: Actions sincronizam módulos (replace + `sort_order` do índice)

**Files:**
- Modify: `backend/app/Domains/Catalog/Actions/CreateCourseAction.php`
- Modify: `backend/app/Domains/Catalog/Actions/UpdateCourseAction.php`
- Modify: `backend/app/Domains/Catalog/Http/Controllers/CourseController.php` (eager loads de `index`/`show`)
- Test: `backend/tests/Feature/Cadastros/CourseModuleCrudTest.php` (criar)

**Interfaces:**
- Consumes: `CourseData->modules` (array de `CourseModuleData`, Task 2), `Course::modules()` (Task 1).
- Produces: comportamento HTTP final — `POST/PUT /api/courses` aceitam `modules[]`; a resposta traz `modules` ordenado com `sort_order` 1..N, `total_hours` e `modules_total_hours`.

- [ ] **Step 1: Escrever os testes que falham**

`backend/tests/Feature/Cadastros/CourseModuleCrudTest.php`:

```php
<?php

namespace Tests\Feature\Cadastros;

use App\Domains\Catalog\Models\Course;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CourseModuleCrudTest extends TestCase
{
    use RefreshDatabase;

    public function test_cria_curso_com_modulos_ordenados_pelo_indice_do_array(): void
    {
        $this->actingAsAdmin();

        $response = $this->postJson('/api/courses', [
            'name' => 'Alta Tensão NR-10',
            'workload_hours' => 40,
            'modules' => [
                ['name' => 'Introducción a los Riesgos Eléctricos', 'learnings' => 'Identificar riscos', 'contents' => "1.1 Riscos\n1.2 EPP", 'theory_hours' => 6, 'practice_hours' => 2],
                ['name' => 'Maniobras en Terreno', 'theory_hours' => 4, 'practice_hours' => 8],
            ],
        ]);

        $response->assertCreated()
            ->assertJsonPath('modules.0.name', 'Introducción a los Riesgos Eléctricos')
            ->assertJsonPath('modules.0.sort_order', 1)
            ->assertJsonPath('modules.0.total_hours', 8)
            ->assertJsonPath('modules.1.sort_order', 2)
            ->assertJsonPath('modules.1.total_hours', 12)
            ->assertJsonPath('modules_total_hours', 20);

        $this->assertDatabaseHas('course_modules', [
            'name' => 'Maniobras en Terreno', 'sort_order' => 2, 'theory_hours' => 4, 'practice_hours' => 8,
        ]);
    }

    public function test_sort_order_do_payload_e_ignorado(): void
    {
        $this->actingAsAdmin();

        $this->postJson('/api/courses', [
            'name' => 'Curso X', 'workload_hours' => 8,
            'modules' => [
                ['name' => 'Primeiro', 'sort_order' => 99],
                ['name' => 'Segundo', 'sort_order' => 1],
            ],
        ])->assertCreated()
            ->assertJsonPath('modules.0.name', 'Primeiro')
            ->assertJsonPath('modules.0.sort_order', 1)
            ->assertJsonPath('modules.1.sort_order', 2);
    }

    public function test_update_reordena_reescrevendo_sort_order(): void
    {
        $this->actingAsAdmin();

        $id = $this->postJson('/api/courses', [
            'name' => 'Curso X', 'workload_hours' => 8,
            'modules' => [
                ['name' => 'A', 'theory_hours' => 2],
                ['name' => 'B', 'theory_hours' => 3],
            ],
        ])->json('id');

        // Array invertido = reordenação.
        $this->putJson("/api/courses/{$id}", [
            'name' => 'Curso X', 'workload_hours' => 8,
            'modules' => [
                ['name' => 'B', 'theory_hours' => 3],
                ['name' => 'A', 'theory_hours' => 2],
            ],
        ])->assertOk()
            ->assertJsonPath('modules.0.name', 'B')
            ->assertJsonPath('modules.0.sort_order', 1)
            ->assertJsonPath('modules.1.name', 'A')
            ->assertJsonPath('modules.1.sort_order', 2);

        // Replace não deixa módulo ativo órfão.
        $this->assertSame(2, Course::find($id)->modules()->count());
    }

    public function test_update_que_remove_modulos_audita_a_saida(): void
    {
        $this->actingAsAdmin();

        $id = $this->postJson('/api/courses', [
            'name' => 'Curso X', 'workload_hours' => 8,
            'modules' => [['name' => 'A'], ['name' => 'B']],
        ])->json('id');

        $antigo = Course::find($id)->modules()->firstOrFail();

        $this->putJson("/api/courses/{$id}", [
            'name' => 'Curso X', 'workload_hours' => 8,
            'modules' => [['name' => 'Único']],
        ])->assertOk()->assertJsonCount(1, 'modules');

        $this->assertSame(1, Course::find($id)->modules()->count());
        $this->assertDatabaseHas('audits', [
            'auditable_type' => 'course_module',
            'auditable_id' => $antigo->id,
            'event' => 'deleted',
        ]);
    }

    public function test_modulo_cem_por_cento_teorico_ou_pratico_e_valido(): void
    {
        $this->actingAsAdmin();

        $this->postJson('/api/courses', [
            'name' => 'Curso X', 'workload_hours' => 10,
            'modules' => [
                ['name' => 'Só teoria', 'theory_hours' => 6, 'practice_hours' => 0],
                ['name' => 'Só prática', 'theory_hours' => 0, 'practice_hours' => 4],
            ],
        ])->assertCreated()->assertJsonPath('modules_total_hours', 10);
    }

    public function test_soma_divergente_da_carga_do_curso_nao_bloqueia(): void
    {
        $this->actingAsAdmin();

        // workload_hours 40 vs. 2h de módulos: é aviso do front, nunca gate (§5.7).
        $this->postJson('/api/courses', [
            'name' => 'Curso X', 'workload_hours' => 40,
            'modules' => [['name' => 'A', 'theory_hours' => 2]],
        ])->assertCreated()
            ->assertJsonPath('workload_hours', 40)
            ->assertJsonPath('modules_total_hours', 2);
    }

    public function test_nome_do_modulo_e_obrigatorio(): void
    {
        $this->actingAsAdmin();

        $this->postJson('/api/courses', [
            'name' => 'Curso X', 'workload_hours' => 8,
            'modules' => [['theory_hours' => 2]],
        ])->assertStatus(422)->assertJsonValidationErrors('modules.0.name');
    }

    public function test_curso_sem_modulos_continua_valido(): void
    {
        $this->actingAsAdmin();

        $this->postJson('/api/courses', ['name' => 'Curso X', 'workload_hours' => 8])
            ->assertCreated()
            ->assertJsonPath('modules', [])
            ->assertJsonPath('modules_total_hours', 0);
    }
}
```

- [ ] **Step 2: Rodar os testes e confirmar que falham**

```bash
docker compose exec -T app php artisan test --filter=CourseModuleCrudTest
```

Esperado: FAIL — os módulos não são persistidos, então `modules.0.name` não existe na resposta (`assertJsonPath` falha). `test_curso_sem_modulos_continua_valido` e `test_nome_do_modulo_e_obrigatorio` podem já passar (o DTO da Task 2 valida) — é aceitável.

- [ ] **Step 3: Sincronizar módulos no `CreateCourseAction`**

Em `backend/app/Domains/Catalog/Actions/CreateCourseAction.php`, dentro da transação, após o `foreach` dos templates e antes do `return`:

```php
            // sort_order é derivado do índice: reordenar = mandar o array na ordem
            // nova. O sort_order que venha no payload é ignorado de propósito.
            foreach (array_values($data->modules) as $i => $module) {
                $course->modules()->create([
                    ...$module->except('id', 'sort_order', 'total_hours')->toArray(),
                    'sort_order' => $i + 1,
                ]);
            }
```

Atualizar o `return` para carregar a relação:

```php
            return $course->load(['certificateTemplates', 'redatores', 'modules']);
```

E o docblock da classe, para citar os módulos junto dos templates.

- [ ] **Step 4: Sincronizar módulos no `UpdateCourseAction` (replace)**

Em `backend/app/Domains/Catalog/Actions/UpdateCourseAction.php`, após o bloco de replace dos templates:

```php
            $course->modules()->get()->each(fn (CourseModule $m) => $m->delete());
            foreach (array_values($data->modules) as $i => $module) {
                $course->modules()->create([
                    ...$module->except('id', 'sort_order', 'total_hours')->toArray(),
                    'sort_order' => $i + 1,
                ]);
            }
```

Adicionar o import `use App\Domains\Catalog\Models\CourseModule;` e atualizar o `return`:

```php
            return $course->fresh()->load(['certificateTemplates', 'redatores', 'modules']);
```

- [ ] **Step 5: Eager load no controller**

Em `backend/app/Domains/Catalog/Http/Controllers/CourseController.php`, incluir `'modules'` nos dois `with`/`load` (`index` e `show`):

```php
        return Course::with(['certificateTemplates', 'redatores', 'modules'])
```

```php
        return CourseData::fromModel($course->load(['certificateTemplates', 'redatores', 'modules']));
```

- [ ] **Step 6: Rodar os testes e confirmar que passam**

```bash
docker compose exec -T app php artisan test --filter=CourseModuleCrudTest
```

Esperado: PASS (8 testes). Se `except(...)` deixar passar `Optional` para o `create`, o erro aparece como coluna inexistente — nesse caso, montar o array explicitamente (`'name' => $module->name, 'learnings' => $module->learnings instanceof Optional ? null : $module->learnings, ...`), seguindo o tratamento de `Optional` que as Actions já usam.

- [ ] **Step 7: Rodar a suíte inteira**

```bash
docker compose exec -T app php artisan test
```

Esperado: PASS. `CourseCrudTest` e `CourseTemplateTest` continuam verdes — cursos sem `modules` seguem válidos.

- [ ] **Step 8: Pint + commit**

```bash
docker compose exec -T app ./vendor/bin/pint app/Domains/Catalog/Actions/CreateCourseAction.php app/Domains/Catalog/Actions/UpdateCourseAction.php app/Domains/Catalog/Http/Controllers/CourseController.php
git add backend/app/Domains/Catalog/Actions/CreateCourseAction.php backend/app/Domains/Catalog/Actions/UpdateCourseAction.php backend/app/Domains/Catalog/Http/Controllers/CourseController.php backend/tests/Feature/Cadastros/CourseModuleCrudTest.php
git commit -m "feat(catalog): Create/UpdateCourseAction sincronizam módulos (replace, sort_order do índice)"
```

---

### Task 4: Tipos gerados, DER e prova end-to-end contra a API real

**Files:**
- Modify: `frontend/src/shared/types/generated.ts` (GERADO — nunca à mão)
- Modify: `docs/der-fisico.md`
- Modify: `docs/superpowers/progress.md`

**Interfaces:**
- Consumes: `CourseModuleData` e `CourseData` (Task 2) — os `#[TypeScript]` que o transformer varre.
- Produces: `CourseModuleData` em `generated.ts`, disponível para o Bloco 4 (frontend).

- [ ] **Step 1: Regenerar os tipos**

```bash
docker compose exec -T app php artisan typescript:transform
```

Esperado: saída confirmando os DTOs transformados. Conferir que `frontend/src/shared/types/generated.ts` passou a ter `CourseModuleData` e que `CourseData` ganhou `modules` e `modules_total_hours`. Se algo estiver errado no tipo, **corrija o DTO e regenere** — o arquivo gerado não se edita (ADR-04).

- [ ] **Step 2: Type-check do frontend**

```bash
cd frontend && pnpm build
```

Esperado: PASS. Os campos são aditivos; nenhum consumidor atual de `CourseData` quebra.

- [ ] **Step 3: Documentar no DER**

Em `docs/der-fisico.md`, adicionar após a linha de `course_redator` (~linha 33):

```markdown
- **course_modules** — `id PK`, `course_id FK` → courses cascade, `sort_order` (smallint, o "Item" 1..N — derivado do índice do array na Action, nunca do payload), `name`, `learnings` (text, nullable), `contents` (text, nullable, tópicos 1.1/1.2 em texto livre), `theory_hours` / `practice_hours` (smallint, default 0), `deleted_at`. Índice: `(course_id, sort_order)`. **Sem coluna de total** — horas do módulo e soma do curso são derivadas em runtime (`CourseModuleData`/`CourseData`); `courses.workload_hours` é a carga contratada, independente da soma (divergência é aviso de tela, não gate).
```

Atualizar a linha de relações (~77) para incluir `course_modules`:

```markdown
- `courses` 1:N → `course_certificate_templates`, `course_modules`, `course_redator`, `quotes`, e (planejadas) `turmas`, `certificates`.
```

E a contagem de implementadas (~93): incluir `course_modules` na lista e atualizar a data para 2026-07-16.

- [ ] **Step 4: Prova end-to-end contra a API real (DoD — não pule)**

Suíte verde não é DoD (CLAUDE.md §4). Subir e exercitar a API de verdade:

```bash
docker compose up -d
docker compose exec -T app php artisan migrate
docker compose exec -T app php artisan db:seed
```

Autenticar e criar um curso com módulos (sessão Sanctum, cookie + CSRF — nunca token):

```bash
curl -s -c /tmp/lotus.jar http://localhost:8080/sanctum/csrf-cookie -o /dev/null
TOKEN=$(grep XSRF-TOKEN /tmp/lotus.jar | cut -f7 | sed 's/%3D/=/g')
curl -s -b /tmp/lotus.jar -c /tmp/lotus.jar -H "X-XSRF-TOKEN: $TOKEN" -H 'Content-Type: application/json' \
  -d '{"email":"admin@lotus.cl","password":"senha123"}' \
  http://localhost:8080/api/login -o /dev/null -w '%{http_code}\n'

TOKEN=$(grep XSRF-TOKEN /tmp/lotus.jar | cut -f7 | sed 's/%3D/=/g')
curl -s -b /tmp/lotus.jar -H "X-XSRF-TOKEN: $TOKEN" -H 'Content-Type: application/json' \
  -d '{"name":"E2E Alta Tensão","workload_hours":40,"modules":[{"name":"Riscos","theory_hours":6,"practice_hours":2},{"name":"Terreno","theory_hours":4,"practice_hours":8}]}' \
  http://localhost:8080/api/courses
```

Verificar na resposta: `modules[0].sort_order` = 1, `modules[1].sort_order` = 2, `total_hours` 8 e 12, `modules_total_hours` = 20, `workload_hours` = 40 (não ajustado). Depois, `PUT` no mesmo curso com o array invertido e confirmar que `sort_order` foi reescrito. Colar o resultado observado no relato — o DoD é o comportamento provado, não o `curl` executado.

- [ ] **Step 5: Atualizar o índice `progress.md`**

Em `docs/superpowers/progress.md`: adicionar a linha do Bloco 3 na tabela (Data 2026-07-16, Status Entregue, resultado em 1 linha com o que **não** se deve refazer: `sort_order` derivado do índice, nenhum total persistido, `workload_hours` intocado) e **remover** o Bloco 3 do backlog. Mover plano e spec para `plans/archive/` e `specs/archive/` com `git mv`, ajustando os caminhos citados na tabela.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/shared/types/generated.ts docs/der-fisico.md docs/superpowers/progress.md docs/superpowers/plans/archive/2026-07-16-bloco3-course-modules-backend.md docs/superpowers/specs/archive/2026-07-16-bloco3-course-modules-backend-design.md
git commit -m "docs(catalog): course_modules no DER + tipos gerados; fecha Bloco 3"
```

---

## Ordem e dependências

Task 1 → 2 → 3 → 4, estritamente sequencial: o model é pré-requisito do DTO, que é pré-requisito das Actions, que são pré-requisito da prova end-to-end. Nenhuma paraleliza.

## Fora de escopo (não fazer neste plano)

- Qualquer arquivo de `frontend/src/features/catalog/` — UI dos módulos, `AppTextarea`, aviso de divergência são o Bloco 4 (CR.2.1/CR.2.3). A única mudança no front aqui é `generated.ts`, que é gerado.
- Mudança em `courses.workload_hours` ou validação da soma no backend.
- Rota ou permissão nova para módulos.
- Remontagem `"Módulo {sort_order}: {name}"` na geração de documento (Sprint 4).
