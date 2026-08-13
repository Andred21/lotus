# BD-8 · Rastro, unicidade e gate no eixo de peso legal — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** dar rastro auditável às duas portas de emissão (`turma_redator` e `course_redator`), tirar o número de versão do template de certificado das mãos do cliente e blindar a turma concluída com um gate único.

**Architecture:** um helper estático `App\Shared\Audit\PivotAudit` vira a fonte única de escrita de pivot — compara antes de gravar (no-op não audita) e delega ao `auditSync`/`auditDetach` do owen-it; uma guarda estática no `PersistenceLawsTest` impede o próximo `->sync(` cru em `app/`. O `version` do template passa a ser derivado por `MAX(version)+1` sob `lockForUpdate` numa Action única (padrão literal do `seq_in_budget`, ADR-17), com `UNIQUE(course_id, version)` no banco e `version` fora do `$fillable`. O gate `Turma::assertAcademicallyWritable()` — nome e mensagem intocados — passa a ser chamado por onze caminhos, e as quatro grafias inline morrem.

**Tech Stack:** Laravel 13 / PHP 8.3 · MySQL 8 (suíte em sqlite `:memory:`) · owen-it/laravel-auditing · spatie/laravel-data + typescript-transformer.

**Spec:** `docs/superpowers/specs/archive/2026-08-12-rastro-unicidade-e-gates-design.md` (D1–D16)

## Global Constraints

- **Backend roda no container:** `docker compose exec -T app php artisan …`. O host WSL não tem mbstring.
- **Pint roda no host, de dentro de `backend/`, SEMPRE com argumentos:** `cd backend && ./vendor/bin/pint <arquivos>`. Nunca sem argumento — reformata o repositório inteiro. A lista de arquivos nunca vem por substituição de comando (lista vazia = Pint sem argumento).
- **`frontend/src/shared/types/generated.ts` não se edita à mão** (Lei §5.3). Corrige-se o DTO e regenera com `php artisan typescript:transform`.
- **Auditoria só na aplicação, nunca em trigger de banco** (Lei §5.2 / ADR-08).
- **Sem Repository sobre Eloquent** (Lei §5.1 / ADR-02): regra de escrita mora em Action, consulta reaproveitada em QueryBuilder.
- **Definition of done = critério de aceite PROVADO** (Lei §5.8). Onde o plano manda ver vermelho, o texto exato do vermelho vai para o ledger.
- **A mensagem do gate é imutável neste bloco (D14):** `'La clase ya fue concluida: el registro académico está bloqueado (RN-15).'`, byte a byte, e o método segue chamando `assertAcademicallyWritable()`. Se um teste existente precisar de edição por causa do texto, a D14 foi violada — pare.
- **Nada de `migrate:fresh --seed`:** o banco de dev carrega o `LOT-2026-1001` corrompido de propósito, esperando o checkpoint visual do João.
- **Branch:** `feat/rastro-unicidade-e-gates`, **main tree** (P-03 — bloco de backend com schema). Um commit por task.

## Baseline medido em 2026-08-12 (não herdado)

| Métrica | Valor |
|---|---|
| Backend (sqlite `:memory:`) | **548 passed, 5 skipped (2025 assertions)** |
| Ocorrências de escrita crua de pivot em `app/` | **5** (as cinco da §1.1 da spec) |
| Ocorrências de `auditSync` em `app/` | **0** |

**Projeção deste plano:** backend **+21 casos** → **569 passed, 5 skipped**. Total de assertions é **registrado no gate, não projetado**.

## File Structure

**Criar:**

| Arquivo | Responsabilidade |
|---|---|
| `backend/app/Shared/Audit/PivotAudit.php` | fonte única da escrita de pivot auditada (compara antes de gravar) |
| `backend/app/Domains/Catalog/Actions/CreateCertificateTemplateAction.php` | escritor único do `version` (derivação sob lock) |
| `backend/database/migrations/2026_08_12_000002_add_unique_to_course_certificate_templates.php` | `UNIQUE(course_id, version)` |
| `backend/tests/Feature/Shared/PivotAuditTest.php` | o helper: grava o diff, não grava o no-op |
| `backend/tests/Support/CreatesCertificateTemplates.php` | criação de template em teste sem mass assignment de `version` |

**Modificar:**

| Arquivo | Mudança |
|---|---|
| `backend/app/Domains/Operation/Actions/DesignateRedatorAction.php:20` | pivot pelo helper + gate RN-15 antes da idoneidade |
| `backend/app/Domains/Operation/Actions/RemoveRedatorAction.php:13` | pivot pelo helper + gate RN-15 |
| `backend/app/Domains/Catalog/Http/Controllers/CourseRedatorController.php:18` | pivot pelo helper |
| `backend/app/Domains/Identity/Actions/CreateRedatorAction.php:61` | pivot pelo helper, dentro da transação |
| `backend/app/Domains/Identity/Actions/UpdateRedatorAction.php:66` | pivot pelo helper, dentro da transação |
| `backend/tests/Feature/Shared/PersistenceLawsTest.php` | terceiro caso: escrita de pivot sem auditoria |
| `backend/app/Domains/Catalog/Models/CourseCertificateTemplate.php:21-26` | `version` sai do `$fillable` (segue no `$auditInclude`) |
| `backend/app/Domains/Catalog/Data/CertificateTemplateData.php:19-20` | `#[Required] public int $version` → `public int\|Optional $version` |
| `backend/app/Domains/Catalog/Http/Controllers/CourseTemplateController.php:17-29` | `store` delega à Action; `update` ignora `id` e `version` |
| `backend/app/Domains/Catalog/Actions/CreateCourseAction.php:28-32` | laço delega à Action |
| `backend/app/Domains/Catalog/Actions/UpdateCourseAction.php:35-40` | soft-delete + laço delegando à Action |
| `backend/app/Domains/Operation/Models/Turma.php:107-112` | docblock do gate (nome e mensagem intactos) |
| `backend/app/Domains/Operation/Actions/UpdateTurmaAction.php` | ganha o gate |
| `backend/app/Domains/Operation/Actions/DeleteTurmaAction.php` | ganha o gate (o docblock já reservava o lugar) |
| `backend/app/Domains/Operation/Actions/ConcludeTurmaAction.php:23-27` | adota o gate (chave `status` → `turma`) |
| `backend/app/Domains/Operation/Actions/EnrollStudentAction.php:24-28` | adota o gate |
| `backend/app/Domains/Operation/Actions/ImportStudentsAction.php:29-33` | adota o gate |
| `backend/app/Domains/Operation/Actions/RemoveEnrollmentAction.php:13-17` | adota o gate |
| `backend/tests/Feature/Operation/TurmaDesignationTest.php` | audit da designação/remoção, no-op, gate, ordem |
| `backend/tests/Feature/Cadastros/HabilitacaoTest.php` | audit da habilitação pelos dois lados |
| `backend/tests/Feature/Cadastros/CourseTemplateTest.php` | derivação, `version` ignorada no PUT, duplicata recusada |
| `backend/tests/Feature/Operation/TurmaCrudTest.php` | gate no `PUT`/`DELETE` de turma |
| `backend/tests/Feature/Operation/EnrollmentApiTest.php` | gate na remoção de matrícula (caminho sem teste hoje) |
| `backend/tests/Feature/Cadastros/CourseModelTest.php:25,45` | template sem mass assignment de `version` |
| `backend/tests/Feature/Certification/IssueCertificateTest.php:320` | idem |
| `backend/tests/Feature/Certification/CertificateListingTest.php:254,430` | idem |
| `backend/tests/Feature/Certification/CertificateEligibilityTest.php:223` | idem |
| `backend/tests/Support/Certification/IssuableEnrollmentBuilder.php:251` | idem |
| `frontend/src/shared/types/generated.ts` | **gerado**, nunca à mão |
| `docs/der-fisico.md:35` | `course_certificate_templates` ganha o `UNIQUE(course_id, version)` |
| `docs/adrs.md` (ADR-17) | uma linha: segundo consumidor do padrão |

---

### Task 1: `PivotAudit` — a fonte única da escrita de pivot

**Files:**
- Create: `backend/app/Shared/Audit/PivotAudit.php`
- Test: `backend/tests/Feature/Shared/PivotAuditTest.php`

**Interfaces:**
- Consumes: nada (primeira task).
- Produces: `App\Shared\Audit\PivotAudit` com três métodos estáticos, consumidos pela Task 2 e permitidos pela guarda da Task 3:
  ```php
  PivotAudit::sync(Model&Auditable $model, string $relation, array $ids): void
  PivotAudit::syncWithoutDetaching(Model&Auditable $model, string $relation, array $ids): void
  PivotAudit::detach(Model&Auditable $model, string $relation, int|array $ids): void
  ```

**Por que o teste do helper existe separado dos call-sites:** o no-op da D12 é a única parte deste bloco que o pacote faz **errado por padrão** — `Auditable::auditSync` dispara o evento mesmo com diff vazio (`vendor/owen-it/laravel-auditing/src/Auditable.php:831-840`) e `config/audit.php:104` tem `empty_values => true`. Testar isso no call-site misturaria a falha do helper com a falha da Action.

- [ ] **Step 1: Escrever o teste que reprova**

Criar `backend/tests/Feature/Shared/PivotAuditTest.php`:

```php
<?php

namespace Tests\Feature\Shared;

use App\Domains\Catalog\Models\Course;
use App\Domains\Identity\Models\Redator;
use App\Domains\Identity\Models\User;
use App\Shared\Audit\PivotAudit;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\Support\CreatesDomainRecords;
use Tests\TestCase;

/**
 * O helper é a fonte única da escrita de pivot auditada (spec D1/D12).
 * O pacote audita o pivot, mas grava linha VAZIA quando o sync não muda nada;
 * o helper compara antes e só delega quando há diferença.
 */
class PivotAuditTest extends TestCase
{
    use CreatesDomainRecords;
    use RefreshDatabase;

    private Course $course;

    protected function setUp(): void
    {
        parent::setUp();
        $this->course = $this->makeCourse();
    }

    private function redator(string $rut = '12.345.678-5'): Redator
    {
        return Redator::create([
            'user_id' => User::factory()->redator()->create(['rut' => $rut])->id,
        ]);
    }

    /** @return int quantas audits o curso tem hoje */
    private function auditsDoCurso(): int
    {
        return DB::table('audits')
            ->where('auditable_type', 'course')
            ->where('auditable_id', $this->course->id)
            ->count();
    }

    public function test_sync_grava_audit_com_o_diff(): void
    {
        $r = $this->redator();

        PivotAudit::sync($this->course, 'redatores', [$r->id]);

        $this->assertDatabaseHas('audits', [
            'auditable_type' => 'course',
            'auditable_id' => $this->course->id,
            'event' => 'sync',
        ]);

        $audit = DB::table('audits')->where('auditable_type', 'course')->latest('id')->first();
        $this->assertNotEmpty(json_decode((string) $audit->new_values, true));
    }

    public function test_sync_sem_diferenca_nao_grava_segunda_audit(): void
    {
        $r = $this->redator();

        PivotAudit::sync($this->course, 'redatores', [$r->id]);
        PivotAudit::sync($this->course, 'redatores', [$r->id]);

        $this->assertSame(1, $this->auditsDoCurso());
    }

    public function test_sync_ignora_ordem_e_repeticao_do_payload(): void
    {
        $r1 = $this->redator('12.345.678-5');
        $r2 = $this->redator('20.347.878-K');

        PivotAudit::sync($this->course, 'redatores', [$r1->id, $r2->id]);
        PivotAudit::sync($this->course, 'redatores', [$r2->id, $r1->id, $r2->id]);

        $this->assertSame(1, $this->auditsDoCurso());
    }

    public function test_sync_without_detaching_grava_so_o_primeiro(): void
    {
        $r = $this->redator();

        PivotAudit::syncWithoutDetaching($this->course, 'redatores', [$r->id]);
        PivotAudit::syncWithoutDetaching($this->course, 'redatores', [$r->id]);

        $this->assertSame(1, $this->auditsDoCurso());
        $this->assertSame(1, $this->course->redatores()->count());
    }

    public function test_detach_grava_audit_com_evento_detach(): void
    {
        $r = $this->redator();
        PivotAudit::sync($this->course, 'redatores', [$r->id]);

        PivotAudit::detach($this->course, 'redatores', $r->id);

        $this->assertDatabaseHas('audits', [
            'auditable_type' => 'course',
            'auditable_id' => $this->course->id,
            'event' => 'detach',
        ]);
        $this->assertDatabaseMissing('course_redator', [
            'course_id' => $this->course->id, 'redator_id' => $r->id,
        ]);
    }

    public function test_detach_de_quem_nao_esta_ligado_nao_grava(): void
    {
        $r = $this->redator();

        PivotAudit::detach($this->course, 'redatores', $r->id);

        $this->assertSame(0, $this->auditsDoCurso());
    }
}
```

- [ ] **Step 2: Rodar e ver o vermelho**

Run: `docker compose exec -T app php artisan test --filter=PivotAuditTest`
Expected: FAIL — `Class "App\Shared\Audit\PivotAudit" not found`. Copiar a linha exata para o ledger.

- [ ] **Step 3: Escrever o helper**

Criar `backend/app/Shared/Audit/PivotAudit.php`:

```php
<?php

namespace App\Shared\Audit;

use Illuminate\Database\Eloquent\Model;
use OwenIt\Auditing\Contracts\Auditable;

/**
 * Fonte única da escrita de pivot auditada (spec `rastro-unicidade-e-gates`,
 * D1/D12). `turma_redator` e `course_redator` são portas de emissão de
 * certificado — quem assina e quem pode ser designado —, e o pacote não audita
 * pivot sozinho: `sync`/`attach`/`detach` crus não deixam rastro nenhum.
 *
 * O que este helper acrescenta ao `auditSync` do pacote é a COMPARAÇÃO: o
 * `Auditable::auditSync` dispara o evento mesmo quando o diff é vazio
 * (vendor/owen-it/laravel-auditing/src/Auditable.php:831-840) e o
 * `config/audit.php:104` tem `empty_values => true` — então um `sync` que não
 * muda nada gravava uma linha de audit com os dois lados vazios. O
 * `UpdateRedatorAction` roda `courses()->sync` em TODA edição de redator: seria
 * uma linha de ruído por salvada, numa tabela cuja retenção segue aberta
 * (P-02/P-30).
 *
 * A audit cai no model que o usuário TOCOU (D13): `course_redator` é auditado
 * como `course` quando a habilitação vem pela tela de curso e como `redator`
 * quando vem pela ficha do redator. Não se unifica de propósito — a audit
 * registra o ato de quem agiu.
 *
 * O tipo é a interseção `Model&Auditable`: quem não implementa o contrato do
 * pacote não compila. A guarda estática do `PersistenceLawsTest` reprova
 * qualquer `->sync(`/`->attach(`/`->detach(` cru em `app/` fora deste arquivo.
 */
final class PivotAudit
{
    /** Substituição total do conjunto. @param  array<int|string>  $ids */
    public static function sync(Model&Auditable $model, string $relation, array $ids): void
    {
        $desejado = self::normalizar($ids);

        if (self::atuais($model, $relation) === $desejado) {
            return;
        }

        $model->auditSync($relation, $desejado);
    }

    /** Acréscimo idempotente ao conjunto. @param  array<int|string>  $ids */
    public static function syncWithoutDetaching(Model&Auditable $model, string $relation, array $ids): void
    {
        $novos = array_diff(self::normalizar($ids), self::atuais($model, $relation));

        if ($novos === []) {
            return;
        }

        $model->auditSyncWithoutDetaching($relation, array_values($novos));
    }

    /** @param  int|array<int|string>  $ids */
    public static function detach(Model&Auditable $model, string $relation, int|array $ids): void
    {
        $alvo = self::normalizar(is_array($ids) ? $ids : [$ids]);

        if (array_intersect($alvo, self::atuais($model, $relation)) === []) {
            return;
        }

        $model->auditDetach($relation, $alvo);
    }

    /** @return list<int> ids ligados hoje, normalizados */
    private static function atuais(Model&Auditable $model, string $relation): array
    {
        return self::normalizar($model->{$relation}()->get()->modelKeys());
    }

    /**
     * Ordem e repetição do payload não são diferença de conjunto — sem isto,
     * `[2,1]` depois de `[1,2]` gravaria audit sem nada ter mudado.
     *
     * @param  array<int|string>  $ids
     * @return list<int>
     */
    private static function normalizar(array $ids): array
    {
        $normalizados = array_values(array_unique(array_map(intval(...), $ids)));
        sort($normalizados);

        return $normalizados;
    }
}
```

- [ ] **Step 4: Rodar e ver o verde**

Run: `docker compose exec -T app php artisan test --filter=PivotAuditTest`
Expected: **6 passed**.

- [ ] **Step 5: Pint e commit**

Run:
```bash
cd backend && ./vendor/bin/pint app/Shared/Audit/PivotAudit.php tests/Feature/Shared/PivotAuditTest.php
```
Expected: `{"tool":"pint","result":"passed"}` ou os arquivos reformatados.

```bash
git add backend/app/Shared/Audit/PivotAudit.php backend/tests/Feature/Shared/PivotAuditTest.php
git commit -m "feat(audit): PivotAudit como fonte unica da escrita de pivot auditada"
```

---

### Task 2: Os cinco call-sites passam pelo helper

**Files:**
- Modify: `backend/app/Domains/Operation/Actions/DesignateRedatorAction.php:20`
- Modify: `backend/app/Domains/Operation/Actions/RemoveRedatorAction.php:13`
- Modify: `backend/app/Domains/Catalog/Http/Controllers/CourseRedatorController.php:18`
- Modify: `backend/app/Domains/Identity/Actions/CreateRedatorAction.php:61`
- Modify: `backend/app/Domains/Identity/Actions/UpdateRedatorAction.php:66`
- Test: `backend/tests/Feature/Operation/TurmaDesignationTest.php` (casos novos)
- Test: `backend/tests/Feature/Cadastros/HabilitacaoTest.php` (casos novos)

**Interfaces:**
- Consumes: `App\Shared\Audit\PivotAudit::{sync,syncWithoutDetaching,detach}` (Task 1).
- Produces: zero `->sync(`/`->syncWithoutDetaching(`/`->detach(` cru em `app/` — pré-condição da guarda da Task 3, que **nasce verde** por causa desta task.

**A asserção é sobre `audits`, nunca sobre o pivot.** `assertDatabaseHas('turma_redator', …)` já passa hoje, com o código antigo: um teste assim não discrimina nada (risco 2 da §5 da spec).

- [ ] **Step 1: Escrever os testes que reprovam — designação**

Em `backend/tests/Feature/Operation/TurmaDesignationTest.php`, acrescentar ao fim da classe:

```php
    public function test_designacao_grava_audit_na_turma(): void
    {
        $this->actingAsAdmin();
        $this->setUpTurma();
        $r = $this->makeRedator(habilitado: true, reufValidUntil: '2030-01-01');

        $this->postJson("/api/turmas/{$this->turma->id}/redatores/{$r->id}")->assertOk();

        $this->assertDatabaseHas('audits', [
            'auditable_type' => 'turma',
            'auditable_id' => $this->turma->id,
            'event' => 'sync',
        ]);
    }

    public function test_designacao_repetida_nao_grava_segunda_audit(): void
    {
        $this->actingAsAdmin();
        $this->setUpTurma();
        $r = $this->makeRedator(habilitado: true, reufValidUntil: '2030-01-01');

        $this->postJson("/api/turmas/{$this->turma->id}/redatores/{$r->id}")->assertOk();
        $this->postJson("/api/turmas/{$this->turma->id}/redatores/{$r->id}")->assertOk();

        $this->assertSame(1, DB::table('audits')
            ->where('auditable_type', 'turma')
            ->where('auditable_id', $this->turma->id)
            ->count());
    }

    public function test_remocao_grava_audit_de_detach(): void
    {
        $this->actingAsAdmin();
        $this->setUpTurma();
        $r = $this->makeRedator(habilitado: true, reufValidUntil: '2030-01-01');
        $this->turma->redatores()->attach($r->id);

        $this->deleteJson("/api/turmas/{$this->turma->id}/redatores/{$r->id}")->assertOk();

        $this->assertDatabaseHas('audits', [
            'auditable_type' => 'turma',
            'auditable_id' => $this->turma->id,
            'event' => 'detach',
        ]);
    }
```

Acrescentar o import no topo do arquivo:

```php
use Illuminate\Support\Facades\DB;
```

- [ ] **Step 2: Escrever os testes que reprovam — habilitação pelos dois lados (D13)**

Em `backend/tests/Feature/Cadastros/HabilitacaoTest.php`, acrescentar ao fim da classe:

```php
    public function test_habilitacao_pelo_lado_do_curso_grava_audit_no_curso(): void
    {
        $this->actingAsAdmin();
        $course = $this->makeCourse();
        $redator = $this->redator();

        $this->putJson("/api/courses/{$course->id}/redatores", [
            'redator_ids' => [$redator->id],
        ])->assertOk();

        $this->assertDatabaseHas('audits', [
            'auditable_type' => 'course',
            'auditable_id' => $course->id,
            'event' => 'sync',
        ]);
    }

    public function test_habilitacao_pelo_lado_do_redator_grava_audit_no_redator(): void
    {
        $this->actingAsAdmin();
        $course = $this->makeCourse();
        $redator = $this->redator();

        $this->putJson("/api/redatores/{$redator->id}", [
            'name' => 'Fabián Cifuentes',
            'rut' => '12.345.678-5',
            'email' => 'fc@lotus.cl',
            'course_ids' => [$course->id],
        ])->assertOk();

        $this->assertDatabaseHas('audits', [
            'auditable_type' => 'redator',
            'auditable_id' => $redator->id,
            'event' => 'sync',
        ]);
    }

    public function test_edicao_de_redator_sem_mudar_curso_nao_grava_audit_de_sync(): void
    {
        $this->actingAsAdmin();
        $course = $this->makeCourse();
        $redator = $this->redator();
        $redator->courses()->attach($course->id);

        $this->putJson("/api/redatores/{$redator->id}", [
            'name' => 'Fabián Cifuentes',
            'rut' => '12.345.678-5',
            'email' => 'fc@lotus.cl',
            'course_ids' => [$course->id],
        ])->assertOk();

        $this->assertSame(0, DB::table('audits')
            ->where('auditable_type', 'redator')
            ->where('event', 'sync')
            ->count());
    }
```

Acrescentar o import no topo do arquivo:

```php
use Illuminate\Support\Facades\DB;
```

- [ ] **Step 3: Rodar e ver o vermelho**

Run: `docker compose exec -T app php artisan test --filter="TurmaDesignationTest|HabilitacaoTest"`
Expected: FAIL nos 6 casos novos — nenhuma linha em `audits`. Copiar o vermelho de um deles para o ledger (`Failed asserting that a row in the table [audits] matches the attributes`).

- [ ] **Step 4: Converter os cinco call-sites**

`backend/app/Domains/Operation/Actions/DesignateRedatorAction.php` — trocar a linha 20 e o import:

```php
use App\Shared\Audit\PivotAudit;
```

```php
        $this->idoneidade->assertEligible($redator, $turma->course);
        PivotAudit::syncWithoutDetaching($turma, 'redatores', [$redator->id]);
```

`backend/app/Domains/Operation/Actions/RemoveRedatorAction.php` — trocar a linha 13 e o import:

```php
use App\Shared\Audit\PivotAudit;
```

```php
        PivotAudit::detach($turma, 'redatores', $redator->id);
```

`backend/app/Domains/Catalog/Http/Controllers/CourseRedatorController.php` — trocar a linha 18 e o import:

```php
use App\Shared\Audit\PivotAudit;
```

```php
        PivotAudit::sync($course, 'redatores', $data->redator_ids);
```

`backend/app/Domains/Identity/Actions/CreateRedatorAction.php` — trocar a linha 61 (segue **dentro** da transação) e o import:

```php
use App\Shared\Audit\PivotAudit;
```

```php
                if (! $data->course_ids instanceof Optional) {
                    PivotAudit::sync($redator, 'courses', $data->course_ids);
                }
```

`backend/app/Domains/Identity/Actions/UpdateRedatorAction.php` — trocar a linha 66 (segue **dentro** da transação) e o import:

```php
use App\Shared\Audit\PivotAudit;
```

```php
                if (! $data->course_ids instanceof Optional) {
                    PivotAudit::sync($redator, 'courses', $data->course_ids);
                }
```

- [ ] **Step 5: Rodar e ver o verde**

Run: `docker compose exec -T app php artisan test --filter="TurmaDesignationTest|HabilitacaoTest|RedatorCrudTest|PivotAuditTest"`
Expected: todos passam, incluindo os 6 casos novos.

- [ ] **Step 6: Conferir que a escrita crua sumiu de `app/`**

Run:
```bash
cd backend && grep -rnE '\->\s*(sync|syncWithoutDetaching|attach|detach|toggle|updateExistingPivot)\s*\(' app/ || echo "sem pivot cru em app/"
```
Expected: `sem pivot cru em app/`.

- [ ] **Step 7: Suíte completa, Pint e commit**

Run: `docker compose exec -T app php artisan test`
Expected: **560 passed, 5 skipped** (548 + 6 da Task 1 + 6 desta).

Run:
```bash
cd backend && ./vendor/bin/pint app/Domains/Operation/Actions/DesignateRedatorAction.php app/Domains/Operation/Actions/RemoveRedatorAction.php app/Domains/Catalog/Http/Controllers/CourseRedatorController.php app/Domains/Identity/Actions/CreateRedatorAction.php app/Domains/Identity/Actions/UpdateRedatorAction.php tests/Feature/Operation/TurmaDesignationTest.php tests/Feature/Cadastros/HabilitacaoTest.php
```

```bash
git add backend/app backend/tests
git commit -m "feat(audit): rastro nas duas portas de emissao (turma_redator e course_redator)"
```

---

### Task 3: A guarda estática que impede a próxima violação

**Files:**
- Modify: `backend/tests/Feature/Shared/PersistenceLawsTest.php`

**Interfaces:**
- Consumes: `Tests\Support\ScansPhpSource` (`arquivosPhp`, `codigoSemComentarios`) e a ausência de pivot cru em `app/` garantida pela Task 2.
- Produces: nada consumido por outra task.

**A guarda nasce verde e por isso a prova é por sonda** — reintroduzir a violação e ver o caso reprovar nomeando o arquivo. É a lição literal do próprio arquivo: a primeira escrita da guarda de trigger só pegava `->` e deixava passar a forma idiomática que a lei nomeia.

- [ ] **Step 1: Escrever o caso**

Em `backend/tests/Feature/Shared/PersistenceLawsTest.php`, acrescentar ao fim da classe:

```php
    /**
     * Escrita de pivot sem auditoria (spec `rastro-unicidade-e-gates`, D3).
     *
     * `turma_redator` e `course_redator` são portas de emissão de certificado,
     * e o pacote NÃO audita pivot sozinho: `sync`/`attach`/`detach` crus não
     * deixam rastro nenhum. A correção sem catraca volta na primeira Action
     * nova — a guarda é o que transforma a decisão em lei.
     *
     * Só a seta entra no regex, e é de propósito: `PivotAudit::sync(...)` é a
     * chamada LEGÍTIMA, e ela usa `::`. `->auditSync(` também fica fora, pelo
     * prefixo. A allowlist tem um arquivo — o helper —, que é onde a chamada
     * crua passa a ser o comportamento correto.
     *
     * Nasceu VERDE em 2026-08-12: as cinco ocorrências que existiam (as duas
     * Actions de designação, o controller de habilitação e as duas Actions de
     * redator) foram convertidas na task anterior deste mesmo bloco.
     */
    public function test_nenhuma_escrita_de_pivot_sem_auditoria(): void
    {
        $permitidos = ['app/Shared/Audit/PivotAudit.php'];
        $metodos = ['sync', 'syncWithoutDetaching', 'attach', 'detach', 'toggle', 'updateExistingPivot'];
        $encontrados = [];

        foreach ($this->arquivosPhp(base_path('app')) as $arquivo) {
            $local = str_replace(base_path().'/', '', $arquivo);

            if (in_array($local, $permitidos, true)) {
                continue;
            }

            $codigo = $this->codigoSemComentarios($arquivo);

            foreach ($metodos as $metodo) {
                if (preg_match('/->\s*'.$metodo.'\s*\(/', $codigo) === 1) {
                    $encontrados[] = "{$local}: ->{$metodo}()";
                }
            }
        }

        sort($encontrados);

        $this->assertSame([], $encontrados, implode("\n", array_merge(
            [
                'Escrita de pivot sem auditoria (ADR-08): o pacote nao audita pivot sozinho.',
                'Use App\Shared\Audit\PivotAudit — ele compara antes de gravar e delega ao auditSync.',
                'Ocorrencias:',
            ],
            $encontrados,
        )));
    }
```

- [ ] **Step 2: Rodar e ver o verde**

Run: `docker compose exec -T app php artisan test --filter=PersistenceLawsTest`
Expected: **3 passed**.

- [ ] **Step 3: A sonda — reintroduzir a violação e ver a guarda pegar**

Editar `backend/app/Domains/Operation/Actions/RemoveRedatorAction.php`, trocando a linha da chamada por:

```php
        $turma->redatores()->detach($redator->id);   // SONDA — desfazer no Step 5
```

Run: `docker compose exec -T app php artisan test --filter=test_nenhuma_escrita_de_pivot_sem_auditoria`
Expected: FAIL nomeando `app/Domains/Operation/Actions/RemoveRedatorAction.php: ->detach()`. Copiar a linha exata para o ledger.

- [ ] **Step 4: Segunda sonda — a forma que a allowlist NÃO cobre**

Editar `backend/app/Domains/Catalog/Http/Controllers/CourseRedatorController.php`, acrescentando na linha seguinte à chamada do helper:

```php
        $course->redatores()->syncWithoutDetaching([]);   // SONDA — desfazer no Step 5
```

Run: `docker compose exec -T app php artisan test --filter=test_nenhuma_escrita_de_pivot_sem_auditoria`
Expected: FAIL com **duas** linhas — `RemoveRedatorAction.php: ->detach()` e `CourseRedatorController.php: ->syncWithoutDetaching()`. Duas, não uma: é isso que prova que o regex cobre cada método da lista e não só o primeiro.

- [ ] **Step 5: Desfazer as duas sondas**

Run:
```bash
cd /home/jvbat/projetos/lotus && git checkout -- backend/app/Domains/Operation/Actions/RemoveRedatorAction.php backend/app/Domains/Catalog/Http/Controllers/CourseRedatorController.php
git status --porcelain backend/app/
```
Expected: saída vazia para `backend/app/` — nenhuma sonda sobreviveu.

Run: `docker compose exec -T app php artisan test --filter=PersistenceLawsTest`
Expected: **3 passed**.

- [ ] **Step 6: Pint e commit**

Run: `cd backend && ./vendor/bin/pint tests/Feature/Shared/PersistenceLawsTest.php`

```bash
git add backend/tests/Feature/Shared/PersistenceLawsTest.php
git commit -m "test(guarda): escrita de pivot sem auditoria reprova em app/"
```

---

### Task 4: `UNIQUE(course_id, version)` no banco

**Files:**
- Create: `backend/database/migrations/2026_08_12_000002_add_unique_to_course_certificate_templates.php`
- Test: `backend/tests/Feature/Cadastros/CourseTemplateTest.php` (caso novo)
- Modify: `docs/der-fisico.md:35`

**Interfaces:**
- Consumes: nada.
- Produces: o índice `course_certificate_templates_course_id_version_unique`, que a Task 5 assume existir (a derivação com `withTrashed()` existe para não colidir com ele).

**A migration original não é editada.** O banco de dev já rodou a `2026_07_08_172639_courses.php`; reescrever migration aplicada é o caminho para dois ambientes com schemas diferentes. O `000001` do mesmo dia é a `login_logs` — daí o `000002`.

**Conferido em 2026-08-12:** o banco de dev tem 1 template e zero duplicatas; a migration sobe limpa. Nenhum teste da suíte cria dois templates com o mesmo par.

- [ ] **Step 1: Escrever o teste que reprova**

Em `backend/tests/Feature/Cadastros/CourseTemplateTest.php`, acrescentar ao fim da classe:

```php
    /**
     * O duplicado entra por INSERT DIRETO, não pela API: pela API a derivação
     * (D4/D11) torna a duplicata inalcançável, e é exatamente esse o ponto —
     * o índice é a defesa de integridade que sobrevive a um caminho novo.
     */
    public function test_banco_recusa_par_course_id_version_duplicado(): void
    {
        $course = $this->makeCourse();

        $linha = [
            'course_id' => $course->id,
            'version' => 1,
            'layout_config' => '{}',
            'created_at' => now(),
            'updated_at' => now(),
        ];

        DB::table('course_certificate_templates')->insert($linha);

        $this->expectException(QueryException::class);
        DB::table('course_certificate_templates')->insert($linha);
    }
```

Acrescentar os imports no topo do arquivo:

```php
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
```

- [ ] **Step 2: Rodar e ver o vermelho**

Run: `docker compose exec -T app php artisan test --filter=test_banco_recusa_par_course_id_version_duplicado`
Expected: FAIL — a segunda inserção passa, e o caso reprova por exceção não lançada. Copiar a linha exata.

- [ ] **Step 3: Escrever a migration**

Criar `backend/database/migrations/2026_08_12_000002_add_unique_to_course_certificate_templates.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * `course_certificate_templates` era o ÚNICO par sequência-por-pai do schema
 * sem índice: `(budget_id, seq_in_budget)`, `(turma_id, student_id)`,
 * `(turma_id, redator_id)` e `(course_id, redator_id)` já tinham o seu. Com
 * empate, o resolver escolhia o template pela ordem que o banco devolvesse — e
 * é esse template que decide a vigência e a cidade de emissão do certificado.
 *
 * O índice é CRU, sem `deleted_at` na chave: número de versão não se reaproveita
 * depois de arquivar (mesmo argumento do ADR-17 para `seq_in_budget`). Por isso
 * a derivação do número conta os arquivados (`withTrashed`).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('course_certificate_templates', function (Blueprint $table) {
            $table->unique(['course_id', 'version']);
        });
    }

    public function down(): void
    {
        Schema::table('course_certificate_templates', function (Blueprint $table) {
            $table->dropUnique('course_certificate_templates_course_id_version_unique');
        });
    }
};
```

- [ ] **Step 4: Rodar e ver o verde**

Run: `docker compose exec -T app php artisan test --filter=CourseTemplateTest`
Expected: todos passam, incluindo o caso novo.

- [ ] **Step 5: Aplicar no banco de dev (sem `fresh`)**

Run: `docker compose exec -T app php artisan migrate`
Expected: `2026_08_12_000002_add_unique_to_course_certificate_templates ... DONE`.

Run:
```bash
docker compose exec -T mysql mysql -uroot -psecret lotus -e "SHOW INDEX FROM course_certificate_templates WHERE Key_name='course_certificate_templates_course_id_version_unique';"
```
Expected: duas linhas (`course_id` e `version`), `Non_unique = 0`.

- [ ] **Step 6: Atualizar o `der-fisico.md`**

Em `docs/der-fisico.md:35`, a linha de `course_certificate_templates` passa a terminar com o índice. Trocar:

```
- **course_certificate_templates** — `id PK`, `course_id FK` → courses cascade, `version` (int), `layout_config` (json), `validity_months` (smallint, nullable, vigência), `deleted_at`.
```

por:

```
- **course_certificate_templates** — `id PK`, `course_id FK` → courses cascade, `version` (int, **derivado** por `MAX+1` sob `lockForUpdate` na Action — nunca input do cliente, mesmo padrão do `seq_in_budget`/ADR-17), `layout_config` (json), `validity_months` (smallint, nullable, vigência), `deleted_at`. **`UNIQUE(course_id, version)`** — índice cru, sem `deleted_at` na chave: número arquivado não se reaproveita, então a derivação conta os arquivados.
```

- [ ] **Step 7: Suíte completa, Pint e commit**

Run: `docker compose exec -T app php artisan test`
Expected: **562 passed, 5 skipped** (560 + 1 da guarda da Task 3 + 1 desta).

Run:
```bash
cd backend && ./vendor/bin/pint database/migrations/2026_08_12_000002_add_unique_to_course_certificate_templates.php tests/Feature/Cadastros/CourseTemplateTest.php
```

```bash
git add backend/database/migrations backend/tests/Feature/Cadastros/CourseTemplateTest.php docs/der-fisico.md
git commit -m "feat(db): UNIQUE(course_id, version) em course_certificate_templates"
```

---

### Task 5: `version` derivada — escritor único, e o número sai do payload

**Files:**
- Create: `backend/app/Domains/Catalog/Actions/CreateCertificateTemplateAction.php`
- Create: `backend/tests/Support/CreatesCertificateTemplates.php`
- Modify: `backend/app/Domains/Catalog/Models/CourseCertificateTemplate.php:21-26`
- Modify: `backend/app/Domains/Catalog/Data/CertificateTemplateData.php:19-20`
- Modify: `backend/app/Domains/Catalog/Http/Controllers/CourseTemplateController.php:17-29`
- Modify: `backend/app/Domains/Catalog/Actions/CreateCourseAction.php:28-32`
- Modify: `backend/app/Domains/Catalog/Actions/UpdateCourseAction.php:35-40`
- Modify: `backend/tests/Feature/Cadastros/CourseTemplateTest.php` (casos novos + o PUT existente)
- Modify: `backend/tests/Feature/Cadastros/CourseModelTest.php:25,45`
- Modify: `backend/tests/Feature/Certification/IssueCertificateTest.php:320`
- Modify: `backend/tests/Feature/Certification/CertificateListingTest.php:254,430`
- Modify: `backend/tests/Feature/Certification/CertificateEligibilityTest.php:223`
- Modify: `backend/tests/Support/Certification/IssuableEnrollmentBuilder.php:251`
- Modify: `frontend/src/shared/types/generated.ts` (**gerado**)
- Modify: `docs/adrs.md` (ADR-17)

**Interfaces:**
- Consumes: o índice da Task 4.
- Produces:
  ```php
  App\Domains\Catalog\Actions\CreateCertificateTemplateAction::execute(
      Course $course, CertificateTemplateData $data
  ): CourseCertificateTemplate
  ```
  e o trait de teste `Tests\Support\CreatesCertificateTemplates::makeTemplate(int $courseId, array $atributos = []): CourseCertificateTemplate`.

**Consequência medida e aceita:** com `version` fora do `$fillable`, **todo** `create(['version' => …])` para de gravar o número — inclusive nos testes. São 7 sítios de teste, e é por isso que o trait de suporte nasce nesta task. Um sítio que continuar mass-assigning grava `version` nulo e o INSERT quebra: o vermelho é ruidoso, não silencioso.

- [ ] **Step 1: Escrever os testes que reprovam — derivação e `version` ignorada**

Em `backend/tests/Feature/Cadastros/CourseTemplateTest.php`, acrescentar ao fim da classe:

```php
    public function test_version_e_derivada_e_o_payload_e_ignorado(): void
    {
        $this->actingAsAdmin();
        $course = $this->makeCourse();

        $this->postJson("/api/courses/{$course->id}/templates", [
            'version' => 99,
            'layout_config' => ['orientation' => 'portrait'],
        ])->assertCreated()->assertJsonPath('version', 1);

        $this->postJson("/api/courses/{$course->id}/templates", [
            'layout_config' => ['orientation' => 'portrait'],
        ])->assertCreated()->assertJsonPath('version', 2);

        $this->postJson("/api/courses/{$course->id}/templates", [
            'layout_config' => ['orientation' => 'portrait'],
        ])->assertCreated()->assertJsonPath('version', 3);
    }

    /**
     * O caso que discrimina o `withTrashed()` (D11): sem ele o MAX volta a 1
     * depois do arquivamento, e o `unique` cru recusa a próxima criação. É o
     * caminho real do `UpdateCourseAction`, que soft-deleta todos e recria.
     */
    public function test_derivacao_conta_os_arquivados(): void
    {
        $this->actingAsAdmin();
        $course = $this->makeCourse();

        foreach (range(1, 3) as $esperado) {
            $id = $this->postJson("/api/courses/{$course->id}/templates", [
                'layout_config' => [],
            ])->assertCreated()->assertJsonPath('version', $esperado)->json('id');

            $this->deleteJson("/api/templates/{$id}")->assertNoContent();
        }

        $this->postJson("/api/courses/{$course->id}/templates", [
            'layout_config' => [],
        ])->assertCreated()->assertJsonPath('version', 4);
    }

    public function test_put_edita_in_place_e_nao_muda_a_version(): void
    {
        $this->actingAsAdmin();
        $course = $this->makeCourse();

        $id = $this->postJson("/api/courses/{$course->id}/templates", [
            'layout_config' => ['orientation' => 'portrait'],
        ])->assertCreated()->json('id');

        $this->putJson("/api/templates/{$id}", [
            'version' => 7,
            'layout_config' => ['orientation' => 'landscape'],
        ])->assertOk()
            ->assertJsonPath('id', $id)
            ->assertJsonPath('version', 1)
            ->assertJsonPath('layout_config.orientation', 'landscape');

        $this->assertDatabaseHas('course_certificate_templates', [
            'id' => $id, 'version' => 1,
        ]);
    }
```

- [ ] **Step 2: Ajustar o caso existente que afirmava o contrário**

`backend/tests/Feature/Cadastros/CourseTemplateTest.php:30-34` afirma hoje que o PUT muda a versão — é exatamente o comportamento que a D9 fecha. Trocar:

```php
        $this->putJson("/api/templates/{$templateId}", [
            'version' => 2,
            'layout_config' => ['orientation' => 'landscape'],
        ])->assertOk()->assertJsonPath('version', 2)
            ->assertJsonPath('layout_config.orientation', 'landscape');
```

por:

```php
        // `version` no payload é ignorado (D9): o PUT edita a mesma linha e o
        // número nasce no create.
        $this->putJson("/api/templates/{$templateId}", [
            'version' => 2,
            'layout_config' => ['orientation' => 'landscape'],
        ])->assertOk()->assertJsonPath('version', 1)
            ->assertJsonPath('layout_config.orientation', 'landscape');
```

- [ ] **Step 3: Rodar e ver o vermelho**

Run: `docker compose exec -T app php artisan test --filter=CourseTemplateTest`
Expected: FAIL nos 4 casos — o `version: 99` é gravado como 99, e o PUT muda para 2. Copiar duas linhas exatas (`Failed asserting that 99 matches expected 1`, e a do PUT).

- [ ] **Step 4: Escrever a Action**

Criar `backend/app/Domains/Catalog/Actions/CreateCertificateTemplateAction.php`:

```php
<?php

namespace App\Domains\Catalog\Actions;

use App\Domains\Catalog\Data\CertificateTemplateData;
use App\Domains\Catalog\Models\Course;
use App\Domains\Catalog\Models\CourseCertificateTemplate;
use Illuminate\Support\Facades\DB;
use Spatie\LaravelData\Optional;

/**
 * Escritor ÚNICO do `version` do template de certificado (spec D4/D10/D11).
 *
 * O número era input do cliente nos três caminhos de escrita, sem índice que
 * garantisse unicidade — e é ele que decide qual template o resolver escolhe,
 * logo a vigência (`valido_ate`) e a cidade de emissão do certificado. Peso
 * legal não se decide pela ordem que o banco devolve.
 *
 * A derivação é a forma literal do `seq_in_budget` (ADR-17, `CreateQuoteAction`):
 * `MAX+1` sob `lockForUpdate` DENTRO da transação, com o `UNIQUE(course_id,
 * version)` como defesa extra. `withTrashed()` não é detalhe: o
 * `UpdateCourseAction` soft-deleta todos os templates e recria, então sem os
 * arquivados na conta o MAX voltaria a 1 e o índice recusaria a segunda salvada.
 *
 * `version` e `course_id` são gravados por atribuição EXPLÍCITA. O `version`
 * está fora do `$fillable` do model de propósito: o bypass morre no model, não
 * na convenção — mesmo precedente do `created_at` de `LoginLog`.
 */
class CreateCertificateTemplateAction
{
    public function execute(Course $course, CertificateTemplateData $data): CourseCertificateTemplate
    {
        return DB::transaction(function () use ($course, $data) {
            $template = new CourseCertificateTemplate;
            $template->course_id = $course->id;
            $template->version = $this->nextVersionFor($course);
            $template->layout_config = $data->layout_config;
            $template->validity_months = $data->validity_months instanceof Optional
                ? null
                : $data->validity_months;
            $template->save();

            return $template;
        });
    }

    /** Conta os ARQUIVADOS: número de versão não se reaproveita (D5/D11). */
    private function nextVersionFor(Course $course): int
    {
        return (int) CourseCertificateTemplate::withTrashed()
            ->where('course_id', $course->id)
            ->lockForUpdate()
            ->max('version') + 1;
    }
}
```

- [ ] **Step 5: Tirar `version` do `$fillable`**

Em `backend/app/Domains/Catalog/Models/CourseCertificateTemplate.php`, trocar o bloco `$fillable` (linhas 21-26) por:

```php
    /**
     * `version` fica FORA de propósito (spec D10): o número é derivado pelo
     * `CreateCertificateTemplateAction`, sob lock, e gravado por atribuição
     * explícita. Fora do fillable, `create(['version' => 2])` de qualquer outro
     * ponto simplesmente não grava o número — o bypass morre no model. Mesmo
     * precedente do `created_at` de `LoginLog`: a data do acesso não se forja
     * por mass assignment, e o número de versão de um documento legal também
     * não. Segue no `$auditInclude` abaixo — não ser fillable não é não ser
     * auditável.
     */
    protected $fillable = [
        'course_id',
        'layout_config',
        'validity_months',
    ];
```

O `$auditInclude` (linhas 28-33) **não muda**.

- [ ] **Step 6: `version` vira `Optional` no DTO**

Em `backend/app/Domains/Catalog/Data/CertificateTemplateData.php`, trocar as linhas 19-20:

```php
        #[Required]
        public int $version,
```

por:

```php
        // Derivada no backend (D4): o número que venha no payload é ignorado.
        // Optional na ENTRADA; a saída sempre traz o número, porque vem do model.
        public int|Optional $version,
```

Remover o import que ficou sem uso:

```php
use Spatie\LaravelData\Attributes\Validation\Required;
```

- [ ] **Step 7: Os três chamadores delegam à Action**

`backend/app/Domains/Catalog/Http/Controllers/CourseTemplateController.php` — trocar `store` e `update` (linhas 17-29):

```php
    public function store(
        CertificateTemplateData $data,
        Course $course,
        CreateCertificateTemplateAction $action,
    ): CertificateTemplateData {
        return CertificateTemplateData::from($action->execute($course, $data));
    }

    /**
     * Edita a MESMA linha (D9): `layout_config` e `validity_months`. `version`
     * é imutável e `id` nunca vem do corpo — mesma leitura do `sort_order` de
     * módulo, que também é ignorado quando chega no payload.
     */
    public function update(CertificateTemplateData $data, CourseCertificateTemplate $template): CertificateTemplateData
    {
        $template->update($data->except('id', 'version')->toArray());

        return CertificateTemplateData::from($template->fresh());
    }
```

Acrescentar o import:

```php
use App\Domains\Catalog\Actions\CreateCertificateTemplateAction;
```

`backend/app/Domains/Catalog/Actions/CreateCourseAction.php` — trocar o laço (linhas 28-32):

```php
            if (! $data->templates instanceof Optional) {
                foreach ($data->templates as $template) {
                    $this->templates->execute($course, $template);
                }
            }
```

e acrescentar o construtor:

```php
    public function __construct(private CreateCertificateTemplateAction $templates) {}
```

> **Sem import nas duas Actions de curso:** elas já vivem em `App\Domains\Catalog\Actions`, o mesmo namespace da Action nova — o `use` seria redundante e o Pint o remove. O import vale só para o `CourseTemplateController`, que está em `Http\Controllers`.
>
> As duas Actions são injetadas por method injection nos controllers (`CourseController:35,45`), então o construtor novo é resolvido pelo container sem nenhuma outra mudança.

`backend/app/Domains/Catalog/Actions/UpdateCourseAction.php` — trocar o bloco de templates (linhas 35-40):

```php
            if (! $data->templates instanceof Optional) {
                $course->certificateTemplates()->get()->each(fn (CourseCertificateTemplate $t) => $t->delete());
                foreach ($data->templates as $template) {
                    $this->templates->execute($course, $template);
                }
            }
```

e acrescentar o construtor:

```php
    public function __construct(private CreateCertificateTemplateAction $templates) {}
```

- [ ] **Step 8: Rodar e ver o novo vermelho — os testes que mass-assignavam `version`**

Run: `docker compose exec -T app php artisan test`
Expected: os 4 casos novos passam; falham os casos que criam template por mass assignment (`CourseModelTest`, `IssueCertificateTest`, `CertificateListingTest`, `CertificateEligibilityTest` e tudo que passa pelo `IssuableEnrollmentBuilder`) com `NOT NULL constraint failed: course_certificate_templates.version`. Copiar a linha exata.

- [ ] **Step 9: Trait de suporte para os testes**

Criar `backend/tests/Support/CreatesCertificateTemplates.php`:

```php
<?php

namespace Tests\Support;

use App\Domains\Catalog\Models\CourseCertificateTemplate;

/**
 * Criação de template em teste. Existe porque `version` saiu do `$fillable`
 * (spec D10): `CourseCertificateTemplate::create(['version' => 2, …])` para de
 * gravar o número e o INSERT quebra. O teste que precisa de uma versão
 * ESPECÍFICA (o resolver escolhe a mais nova, e isso é a regra sob teste) a
 * declara aqui, por atribuição explícita — o mesmo caminho da Action.
 */
trait CreatesCertificateTemplates
{
    /** @param  array<string,mixed>  $atributos */
    protected function makeTemplate(int $courseId, array $atributos = []): CourseCertificateTemplate
    {
        $template = new CourseCertificateTemplate;
        $template->course_id = $courseId;
        $template->version = $atributos['version'] ?? 1;
        $template->layout_config = $atributos['layout_config'] ?? [];
        $template->validity_months = $atributos['validity_months'] ?? null;
        $template->save();

        return $template;
    }
}
```

- [ ] **Step 10: Converter os sete sítios de teste**

`backend/tests/Feature/Cadastros/CourseModelTest.php` — `use Tests\Support\CreatesCertificateTemplates;` no topo e `use CreatesCertificateTemplates;` na classe. Trocar a linha 25:

```php
        $this->makeTemplate($course->id, [
            'version' => 1,
            'layout_config' => ['orientation' => 'landscape'],
            'validity_months' => 24,
        ]);
```

e a linha 45:

```php
        $template = $this->makeTemplate($course->id, ['version' => 1, 'layout_config' => []]);
```

`backend/tests/Feature/Certification/IssueCertificateTest.php:318-327` — a classe passa a usar o trait, e `createTemplate` delega:

```php
    private function createTemplate(array $overrides = []): CourseCertificateTemplate
    {
        return $this->makeTemplate($this->course->id, [
            'version' => 1,
            'layout_config' => ['city' => 'Santiago'],
            'validity_months' => null,
            ...$overrides,
        ]);
    }
```

`backend/tests/Feature/Certification/CertificateListingTest.php:254` (trait na classe):

```php
        $this->makeTemplate($this->course->id, [
            'version' => 2,
            'layout_config' => ['city' => 'Santiago'],
            'validity_months' => 24,
        ]);
```

e `:430`:

```php
        $this->makeTemplate($courseOnline->id, [
            'version' => 1,
            'layout_config' => [],
            'validity_months' => null,
        ]);
```

`backend/tests/Feature/Certification/CertificateEligibilityTest.php:223` (trait na classe):

```php
        $this->makeTemplate($outro->id, [
            'version' => 1,
            'layout_config' => ['city' => 'Valparaíso'],
        ]);
```

`backend/tests/Support/Certification/IssuableEnrollmentBuilder.php:251` — a classe passa a usar `use CreatesCertificateTemplates;` (o trait não depende de `TestCase`), e o bloco vira:

```php
            $this->template = $this->makeTemplate($this->course->id, [
                'version' => 1,
                'layout_config' => $layoutConfig,
                'validity_months' => null,
                ...$this->templateOverrides,
            ]);
```

> Se o `makeTemplate` do trait ficar `protected` e o builder precisar dele em contexto estático, **não** troque a visibilidade: o builder é instanciado, então `protected` basta. Um erro de visibilidade aqui é sinal de que a chamada foi parar num contexto estático — corrija a chamada, não o trait.

Remover de cada arquivo o import de `CourseCertificateTemplate` que ficar sem uso (o PHPStan/Pint não reclama, mas o `use` órfão é ruído).

- [ ] **Step 11: Rodar e ver o verde**

Run: `docker compose exec -T app php artisan test`
Expected: **565 passed, 5 skipped** (562 + 3 casos novos; o quarto ajuste do Step 2 é edição de caso existente, não caso novo).

- [ ] **Step 12: Regenerar o contrato TypeScript**

Run: `docker compose exec -T app php artisan typescript:transform`

Run: `cd /home/jvbat/projetos/lotus && git diff --stat frontend/src/shared/types/generated.ts`
Expected: **uma** linha alterada — `version: number` vira `version: undefined | number`.

Run: `cd frontend && pnpm build`
Expected: build verde. O tipo não é consumido por nenhuma tela (`templates` fica fora do payload da tela de curso, `useCourseForm.ts:13-14`).

- [ ] **Step 13: Registrar o segundo consumidor no ADR-17**

Em `docs/adrs.md`, na regra do ADR-17, acrescentar ao fim da lista de bullets:

```
- `course_certificate_templates.version` (int) = **segundo consumidor do mesmo padrão** (2026-08-12):
  `MAX(version)+1` com `lockForUpdate()` em transação no `CreateCertificateTemplateAction`, índice
  `UNIQUE(course_id, version)` como defesa extra, e `withTrashed()` na conta porque o replace nested
  do `UpdateCourseAction` arquiva e recria. Não é ADR nova: é este ADR aplicado de novo.
```

- [ ] **Step 14: Pint e commit**

Run:
```bash
cd backend && ./vendor/bin/pint app/Domains/Catalog/Actions/CreateCertificateTemplateAction.php app/Domains/Catalog/Actions/CreateCourseAction.php app/Domains/Catalog/Actions/UpdateCourseAction.php app/Domains/Catalog/Models/CourseCertificateTemplate.php app/Domains/Catalog/Data/CertificateTemplateData.php app/Domains/Catalog/Http/Controllers/CourseTemplateController.php tests/Support/CreatesCertificateTemplates.php tests/Support/Certification/IssuableEnrollmentBuilder.php tests/Feature/Cadastros/CourseTemplateTest.php tests/Feature/Cadastros/CourseModelTest.php tests/Feature/Certification/IssueCertificateTest.php tests/Feature/Certification/CertificateListingTest.php tests/Feature/Certification/CertificateEligibilityTest.php
```

```bash
git add backend/app backend/tests frontend/src/shared/types/generated.ts docs/adrs.md
git commit -m "feat(catalog): version do template derivada sob lock, fora do payload"
```

---

### Task 6: O gate da turma concluída, em onze caminhos

**Files:**
- Modify: `backend/app/Domains/Operation/Models/Turma.php:107-112` (só o docblock)
- Modify: `backend/app/Domains/Operation/Actions/UpdateTurmaAction.php`
- Modify: `backend/app/Domains/Operation/Actions/DeleteTurmaAction.php`
- Modify: `backend/app/Domains/Operation/Actions/DesignateRedatorAction.php`
- Modify: `backend/app/Domains/Operation/Actions/RemoveRedatorAction.php`
- Modify: `backend/app/Domains/Operation/Actions/ConcludeTurmaAction.php:23-27`
- Modify: `backend/app/Domains/Operation/Actions/EnrollStudentAction.php:24-28`
- Modify: `backend/app/Domains/Operation/Actions/ImportStudentsAction.php:29-33`
- Modify: `backend/app/Domains/Operation/Actions/RemoveEnrollmentAction.php:13-17`
- Test: `backend/tests/Feature/Operation/TurmaCrudTest.php` (caso novo)
- Test: `backend/tests/Feature/Operation/TurmaDesignationTest.php` (casos novos)
- Test: `backend/tests/Feature/Operation/EnrollmentApiTest.php` (caso novo — a recusa da remoção de matrícula não tinha teste)

**Interfaces:**
- Consumes: `Turma::assertAcademicallyWritable(): void` — **já existe**, e o nome e a mensagem não mudam (D14).
- Produces: nada consumido por outra task.

**As quatro grafias inline morrem.** Hoje `EnrollStudentAction`, `ImportStudentsAction`, `RemoveEnrollmentAction` e `ConcludeTurmaAction` testam `status !== TurmaStatus::EmAndamento` com quatro mensagens diferentes, três em PT-BR num app es-CL. O `TurmaStatus` tem **exatamente dois** casos (`EmAndamento`, `Concluida`), então `!== EmAndamento` e `=== Concluida` são a mesma condição — a troca não muda o que é recusado, só a mensagem e a chave.

**Consequência declarada:** `ConcludeTurmaAction` troca a chave de erro `status` por `turma`. Medido: nenhum teste afirma `errors.status` para turma, e o `FormErrorSummary.tsx:62-67` renderiza qualquer chave sem input mapeado — a mensagem continua visível na tela.

- [ ] **Step 1: Escrever os testes que reprovam — os quatro caminhos novos**

`TurmaCrudTest` cria turma pela API, a partir de `makeQuote()` + `payload()` (linhas 19-36). O caso novo reaproveita os dois. Acrescentar ao fim da classe:

```php
    public function test_turma_concluida_recusa_put_e_delete(): void
    {
        $this->actingAsAdmin();
        $quote = $this->makeQuote('approved');

        $id = $this->postJson("/api/quotes/{$quote->id}/turma", $this->payload())
            ->assertCreated()->json('id');

        Turma::findOrFail($id)->update([
            'status' => TurmaStatus::Concluida,
            'concluded_at' => now(),
        ]);

        $this->putJson("/api/turmas/{$id}", $this->payload(['local_aplicacao' => 'Arica']))
            ->assertStatus(422)
            ->assertJsonPath(
                'errors.turma.0',
                'La clase ya fue concluida: el registro académico está bloqueado (RN-15).',
            );

        $this->deleteJson("/api/turmas/{$id}")
            ->assertStatus(422)
            ->assertJsonPath(
                'errors.turma.0',
                'La clase ya fue concluida: el registro académico está bloqueado (RN-15).',
            );

        $this->assertDatabaseHas('turmas', [
            'id' => $id, 'deleted_at' => null, 'local_aplicacao' => 'Santiago',
        ]);
    }
```

A última asserção é o que prova a D6: o `local_aplicacao` continua `'Santiago'` (o do create), e não `'Arica'` — a primeira fonte da cidade do certificado não se move depois da conclusão.

Acrescentar o import no topo do arquivo:

```php
use App\Domains\Operation\Enums\TurmaStatus;
```

> **Não** extraia o setup de turma para `CreatesDomainRecords`: Budget/Quote/Turma ficam fora daquele trait de propósito — o valor criado costuma ser a própria regra sob teste, e extraí-lo esconderia a regra.

Em `backend/tests/Feature/Operation/TurmaDesignationTest.php`, acrescentar:

```php
    public function test_turma_concluida_recusa_designacao_e_remocao(): void
    {
        $this->actingAsAdmin();
        $this->setUpTurma();
        $r = $this->makeRedator(habilitado: true, reufValidUntil: '2030-01-01');
        $this->turma->redatores()->attach($r->id);
        $this->turma->update(['status' => TurmaStatus::Concluida, 'concluded_at' => now()]);

        $this->postJson("/api/turmas/{$this->turma->id}/redatores/{$r->id}")
            ->assertStatus(422)
            ->assertJsonPath(
                'errors.turma.0',
                'La clase ya fue concluida: el registro académico está bloqueado (RN-15).',
            );

        $this->deleteJson("/api/turmas/{$this->turma->id}/redatores/{$r->id}")
            ->assertStatus(422)
            ->assertJsonPath(
                'errors.turma.0',
                'La clase ya fue concluida: el registro académico está bloqueado (RN-15).',
            );

        $this->assertDatabaseHas('turma_redator', [
            'turma_id' => $this->turma->id, 'redator_id' => $r->id,
        ]);
    }

    /**
     * A ORDEM importa: turma concluída recusa por ESTADO, sem avaliar a
     * idoneidade do redator. A asserção é sobre a mensagem — é ela que
     * discrimina qual gate falou primeiro.
     */
    public function test_turma_concluida_recusa_antes_de_avaliar_idoneidade(): void
    {
        $this->actingAsAdmin();
        $this->setUpTurma();
        $r = $this->makeRedator(habilitado: false, reufValidUntil: false);
        $this->turma->update(['status' => TurmaStatus::Concluida, 'concluded_at' => now()]);

        $this->postJson("/api/turmas/{$this->turma->id}/redatores/{$r->id}")
            ->assertStatus(422)
            ->assertJsonPath(
                'errors.turma.0',
                'La clase ya fue concluida: el registro académico está bloqueado (RN-15).',
            );
    }
```

- [ ] **Step 2: Rodar e ver o vermelho**

Run: `docker compose exec -T app php artisan test --filter="TurmaCrudTest|TurmaDesignationTest"`
Expected: FAIL nos 3 casos novos — hoje o PUT devolve 200, o DELETE devolve 204, e a designação recusa por idoneidade (`errors.redator…`). Copiar as linhas exatas.

- [ ] **Step 3: Os quatro caminhos novos ganham o gate**

`backend/app/Domains/Operation/Actions/UpdateTurmaAction.php` — primeira linha do `execute`:

```php
    public function execute(Turma $turma, TurmaData $data): Turma
    {
        $turma->assertAcademicallyWritable();

        $turma->update([
```

`backend/app/Domains/Operation/Actions/DeleteTurmaAction.php` — o docblock deixa de prometer e passa a cumprir:

```php
/**
 * Soft delete da turma. Guarda do 6d aplicada (RN-15): turma concluída não se
 * arquiva — o certificado emitido aponta para o registro, e esconder o registro
 * cria contradição entre documento e banco. Financeiro segue sem bloquear (lei §7).
 */
class DeleteTurmaAction
{
    public function execute(Turma $turma): void
    {
        $turma->assertAcademicallyWritable();

        $turma->delete();
    }
}
```

`backend/app/Domains/Operation/Actions/DesignateRedatorAction.php` — o gate vem **antes** da idoneidade:

```php
    public function execute(Turma $turma, Redator $redator): Turma
    {
        $turma->assertAcademicallyWritable();
        $this->idoneidade->assertEligible($redator, $turma->course);
        PivotAudit::syncWithoutDetaching($turma, 'redatores', [$redator->id]);

        return $turma;
    }
```

`backend/app/Domains/Operation/Actions/RemoveRedatorAction.php`:

```php
    public function execute(Turma $turma, Redator $redator): Turma
    {
        $turma->assertAcademicallyWritable();
        PivotAudit::detach($turma, 'redatores', $redator->id);

        return $turma;
    }
```

- [ ] **Step 4: Rodar e ver o verde dos três casos novos**

Run: `docker compose exec -T app php artisan test --filter="TurmaCrudTest|TurmaDesignationTest"`
Expected: todos passam.

- [ ] **Step 5: O teste que falta para os caminhos antigos (prova 11)**

Dos sete caminhos que já recusavam, seis têm teste: `EnrollStudentActionTest:69` e `ImportStudentsActionTest:101` afirmam só a `ValidationException` (seguem verdes, a mensagem não é asserção); `EnrollmentResultTest:150-151` e `IssueCertificateTest:107` afirmam o texto **literal** da RN-15 (seguem verdes porque a D14 congela o texto); os dois de documento estão no `ConcludeTurmaTest:131`. **`RemoveEnrollmentAction` não tem nenhum** — a recusa dele nunca foi provada, e é justamente uma das três mensagens PT-BR que morrem aqui.

Em `backend/tests/Feature/Operation/EnrollmentApiTest.php`, acrescentar ao fim da classe:

```php
    public function test_turma_concluida_recusa_remocao_de_matricula(): void
    {
        $this->actingAsAdmin();
        $this->postJson("/api/turmas/{$this->turma->id}/alunos", [
            'rut' => '11.111.111-1', 'name' => 'Juan Soto', 'email' => 'juan@acme.cl',
        ])->assertCreated();
        $enrollment = Enrollment::sole();

        $this->turma->update([
            'status' => TurmaStatus::Concluida,
            'concluded_at' => now(),
        ]);

        $this->deleteJson("/api/turmas/{$this->turma->id}/alunos/{$enrollment->id}")
            ->assertStatus(422)
            ->assertJsonPath(
                'errors.turma.0',
                'La clase ya fue concluida: el registro académico está bloqueado (RN-15).',
            );

        $this->assertDatabaseHas('enrollments', ['id' => $enrollment->id, 'deleted_at' => null]);
    }
```

Run: `docker compose exec -T app php artisan test --filter=test_turma_concluida_recusa_remocao_de_matricula`
Expected: FAIL — a recusa acontece, mas com a mensagem PT-BR antiga (`Remoção de matrícula só é permitida com a turma em andamento.`). Copiar a linha exata: é ela que prova que a mensagem mudou de verdade no Step 6.

- [ ] **Step 6: Os quatro caminhos inline adotam o método**

`backend/app/Domains/Operation/Actions/EnrollStudentAction.php` — trocar as linhas 24-28 por:

```php
        $turma->assertAcademicallyWritable();
```

`backend/app/Domains/Operation/Actions/ImportStudentsAction.php` — trocar as linhas 29-33 por:

```php
        // O gate fica no topo mesmo com o EnrollStudentAction gateando por
        // linha: recusar a planilha inteira de uma vez é a resposta certa, e
        // não é o mesmo que recusar 40 linhas uma a uma.
        $turma->assertAcademicallyWritable();
```

`backend/app/Domains/Operation/Actions/RemoveEnrollmentAction.php` — trocar as linhas 13-17 por:

```php
        $enrollment->turma->assertAcademicallyWritable();
```

`backend/app/Domains/Operation/Actions/ConcludeTurmaAction.php` — trocar as linhas 23-27 por:

```php
            $turma->assertAcademicallyWritable();
```

Em cada um dos quatro, remover os imports que ficarem sem uso (`TurmaStatus`, `ValidationException`) — conferir arquivo a arquivo, porque `ConcludeTurmaAction` **continua** usando os dois (o `TurmaStatus::Concluida` que grava e o `ValidationException` da documentação incompleta).

- [ ] **Step 7: Atualizar o docblock do gate (nome e mensagem intactos)**

Em `backend/app/Domains/Operation/Models/Turma.php:107-112`, trocar o docblock por:

```php
    /**
     * RN-15 — blindagem: turma concluída não aceita mais escrita. ONZE caminhos
     * chamam isto, e é a única mensagem: edição e arquivamento da própria turma,
     * designação e remoção de redator, documentos do 6d (store e delete),
     * matrícula individual, import, remoção de matrícula, resultado de
     * matrícula e a própria conclusão (que assim recusa concluir duas vezes).
     *
     * As quatro grafias inline que testavam `status !== EmAndamento` à mão, com
     * quatro mensagens diferentes — três em PT-BR num app es-CL —, morreram no
     * bloco `rastro-unicidade-e-gates`. O `TurmaStatus` tem dois casos, então a
     * condição é a mesma; o que mudou foi haver uma resposta só.
     *
     * A mensagem é imutável: dois testes a afirmam literalmente
     * (`EnrollmentResultTest`, `IssueCertificateTest`).
     */
```

- [ ] **Step 8: Rodar a suíte inteira**

Run: `docker compose exec -T app php artisan test`
Expected: **569 passed, 5 skipped** (565 + 4 novos). Os dois testes que afirmam o texto literal do gate (`EnrollmentResultTest:150-151`, `IssueCertificateTest:107`) passam **sem edição** — se precisarem de edição, a D14 foi violada: pare e reporte.

- [ ] **Step 9: Conferir que nenhuma grafia inline sobreviveu**

Run:
```bash
cd backend && grep -rn "TurmaStatus::EmAndamento" app/Domains/Operation/Actions/ || echo "sem gate inline nas Actions"
```
Expected: `sem gate inline nas Actions` — o `ConcludeTurmaAction` grava `TurmaStatus::Concluida`, não compara com `EmAndamento`.

- [ ] **Step 10: Pint e commit**

Run:
```bash
cd backend && ./vendor/bin/pint app/Domains/Operation/Models/Turma.php app/Domains/Operation/Actions/UpdateTurmaAction.php app/Domains/Operation/Actions/DeleteTurmaAction.php app/Domains/Operation/Actions/DesignateRedatorAction.php app/Domains/Operation/Actions/RemoveRedatorAction.php app/Domains/Operation/Actions/ConcludeTurmaAction.php app/Domains/Operation/Actions/EnrollStudentAction.php app/Domains/Operation/Actions/ImportStudentsAction.php app/Domains/Operation/Actions/RemoveEnrollmentAction.php tests/Feature/Operation/TurmaCrudTest.php tests/Feature/Operation/TurmaDesignationTest.php tests/Feature/Operation/EnrollmentApiTest.php
```

```bash
git add backend/app backend/tests
git commit -m "feat(operation): gate RN-15 unico em onze caminhos de escrita da turma"
```

---

### Task 7: Gate de fechamento — a prova é comportamento na API real

**Files:** nenhum arquivo de produção. Esta task **mede**.

**Interfaces:**
- Consumes: tudo das Tasks 1-6.
- Produces: o relatório de fechamento, com cada resultado **medido**, não projetado.

- [ ] **Step 1: Suíte completa**

Run: `docker compose exec -T app php artisan test`
Expected: **569 passed, 5 skipped**. Registrar o total de assertions **medido**.

- [ ] **Step 2: Frontend**

Run: `cd frontend && pnpm test && pnpm lint && pnpm build`
Expected: os três verdes. Este bloco não toca `frontend/src/` além do `generated.ts` regenerado.

- [ ] **Step 3: Pint na lista fechada do bloco**

Run:
```bash
cd /home/jvbat/projetos/lotus && git diff --name-only main...HEAD -- '*.php' | sed 's|^backend/||'
```
Copiar a lista **à mão** para o comando seguinte. **Nunca** por substituição de comando — lista vazia vira Pint sem argumento, que reformata o repositório inteiro.

Run: `cd backend && ./vendor/bin/pint --test <arquivos copiados>`
Expected: `{"tool":"pint","result":"passed"}`.

- [ ] **Step 4: `generated.ts` gerado, não editado**

Run:
```bash
docker compose exec -T app php artisan typescript:transform && cd /home/jvbat/projetos/lotus && git status --porcelain frontend/src/shared/types/generated.ts
```
Expected: saída vazia — regenerar não produz diff.

- [ ] **Step 5: Nenhuma sonda sobrevivente**

Run:
```bash
cd /home/jvbat/projetos/lotus
git status --porcelain
git diff main...HEAD -- backend/app/ | grep -nE 'SONDA|dd\(|dump\(|ray\(' || echo "sem sonda"
git diff main...HEAD --stat -- frontend/src/features/
```
Expected: `status` vazio; `sem sonda`; diff de `frontend/src/features/` **vazio**.

- [ ] **Step 6: Leis do §5 conferidas**

Run:
```bash
cd /home/jvbat/projetos/lotus
grep -rn "class .*Repository" backend/app/ || echo "sem Repository"
grep -rn "CREATE TRIGGER\|DB::unprepared" backend/database/ backend/app/ || echo "sem trigger"
grep -rnE '\->\s*(sync|syncWithoutDetaching|attach|detach|toggle|updateExistingPivot)\s*\(' backend/app/ | grep -v 'Shared/Audit/PivotAudit.php' || echo "sem pivot cru fora do helper"
```
Expected: as três negativas.

- [ ] **Step 7: E2E contra a API real (o DoD do bloco — lição 12)**

Sem `migrate:fresh`. Contra o banco de dev, com sessão Sanctum por cookie + CSRF (`GET /sanctum/csrf-cookie` → `POST /api/login` com um usuário staff real):

1. `POST /api/courses/{id}/templates` **sem** `version` no corpo → `201` com `version: 1`; repetir → `version: 2`.
2. `POST` com `version: 99` → `201` com a versão **derivada**, não 99.
3. `PUT /api/templates/{id}` com `version: 7` → `200` com a versão **original** e o `layout_config` novo.
4. SQL cru, duas vezes a mesma linha:
   ```bash
   docker compose exec -T mysql mysql -uroot -psecret lotus \
     -e "INSERT INTO course_certificate_templates (course_id, version, layout_config, created_at, updated_at) VALUES (<curso>, 1, '{}', NOW(), NOW());"
   ```
   → a segunda recusada com `Duplicate entry ... for key 'course_certificate_templates_course_id_version_unique'`.
5. `POST /api/turmas/{id}/redatores/{redator}` numa turma **em andamento** → linha nova em `audits` com `auditable_type='turma'`, `event='sync'` e `new_values` **não vazio**; repetir a mesma designação → **nenhuma** linha nova.
6. `PUT /api/courses/{id}/redatores` → audit com `auditable_type='course'`; `PUT /api/redatores/{id}` mudando `course_ids` → audit com `auditable_type='redator'` (a D13 na API real).
7. Numa turma **concluída**: `PUT /api/turmas/{id}`, `POST` e `DELETE /api/turmas/{id}/redatores/{redator}`, e `DELETE /api/turmas/{id}` → os quatro `422`, `Content-Type: application/problem+json`, com a mensagem da RN-15.

Registrar cada resultado. **Suíte verde não fecha este bloco** — o DoD é comportamento na API real.

- [ ] **Step 8: Conferir o banco de dev intocado no que importa**

Run:
```bash
docker compose exec -T mysql mysql -uroot -psecret lotus -e "SELECT codigo, JSON_EXTRACT(snapshot,'$.aluno.name') AS aluno FROM certificates WHERE codigo='LOT-2026-1001';"
```
Expected: o `LOT-2026-1001` segue com `snapshot.aluno.name` vazio — corrompido de propósito, esperando o checkpoint visual do João.

- [ ] **Step 9: Registrar o que o gate NÃO provou**

Escrever, sem maquiagem, no relatório de fechamento:
- **Sem backfill (D2):** o rastro dos dois pivots começa no deploy. Toda designação e habilitação anterior a este bloco segue sem audit, e isso não é recuperável — audit sintética inventaria autor e data.
- **Sem sonda de concorrência MySQL (D16):** a derivação do `version` não tem prova de corrida. O `lockForUpdate` é no-op em SQLite, e a suíte roda em SQLite. O `unique` é a defesa de integridade: sem lock, a corrida vira 500, não duplicata. Escolha declarada, não esquecimento — o `seq_in_budget`, mesmo padrão e mesmo ADR, também não tem sonda.
- **`PUT /api/courses/{id}` COM `templates` no payload faz a versão subir a cada salvada** (v1 arquivada, v2 nova), porque o replace nested cria linhas novas. Hoje é caminho de API, não de tela (`useCourseForm.ts:13-14` não manda `templates`).
- **Investigar "quem habilitou este redator" exige ler os dois lados** (D13): `course_redator` tem dois `auditable_type`.
- **Retenção de `audits` segue aberta** (P-02/P-30) — este bloco aumenta o volume da tabela.
- Nenhuma tela foi vista renderizada: o bloco é backend. A prova é API real, suíte, lint e build.

---

## Handoff de execução

**`executor: claude`**

Critério: o bloco toca **três** gatilhos de lei do `CLAUDE.md` §5 — auditoria (§5.2/ADR-08), schema com peso legal, e `generated.ts` (§5.3) — e fecha por **prova de mutação** em quatro pontos onde o vermelho é o único juiz:

- a guarda estática da Task 3 é sonda de duas formas, e a leitura do vermelho ("duas linhas, não uma") é o que distingue uma guarda que cobre de uma que promete cobrir;
- o `withTrashed()` da Task 5 não quebra nenhum caminho feliz — só o caminho de arquivar-e-recriar. Um executor que verifique apenas "verde no fim" não distingue a derivação certa da que regride em silêncio;
- a Task 5 quebra sete sítios de teste de propósito, e distinguir esse vermelho esperado de um vermelho real exige julgamento;
- a ordem do gate no `DesignateRedatorAction` (Task 6) só se prova pela **mensagem**, não pelo status.

Não há `paths_autorizados` a declarar — nada é delegado ao Codex nesta execução.

## Desvios do plano

*(preenchido durante a execução — cada desvio com a medição que o motivou)*

Nenhum até aqui.
