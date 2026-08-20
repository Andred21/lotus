# BD-14 · Contrato de entrada — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** fechar D-13, D-12, P-29 e P-35 — o corpo da requisição passa a ter uma resposta única para
o que pode escrever, o que não pode, e o que acontece quando ele omite.

**Architecture:** duas funções pequenas em `App\Shared\Data` viram fonte única de duas leis
(`Optional` não apaga; chave computada não entra), o `UserProvisioner` ganha a tradução de colisão de
índice em 422, e `Quote` fica simétrico ao template de certificado no ADR-17.

**Tech Stack:** Laravel 13 / PHP 8.3, spatie/laravel-data, PHPUnit sobre sqlite `:memory:`, Pint.

**Spec:** `docs/superpowers/specs/2026-08-20-bd14-contrato-de-entrada-design.md`

## Global Constraints

- **Main tree.** Bloco de backend não usa worktree linkada (P-03). Trabalhe em
  `/home/jvbat/projetos/lotus`, branch `feat/bd14-contrato-de-entrada`.
- **Testes rodam no container:** `docker compose exec -T app php artisan test --filter=NomeTest`.
  A suíte inteira pode estourar o `memory_limit` de 128M (P-50); nesse caso rode por diretório
  (`--testsuite` ou `tests/Feature/<Dominio>`) e declare isso no fechamento.
- **Pint roda no host, de dentro de `backend/`, sempre com os arquivos como argumento:**
  `cd backend && ./vendor/bin/pint app/Shared/Data/WritableAttributes.php` — NUNCA sem argumento.
- **`generated.ts` não se edita à mão** (lei §5.3). `missing` é regra de validação e não muda tipo
  emitido; a Task 9 prova que o diff é zero em vez de presumir.
- **Idioma:** classes e métodos em inglês, comentários e mensagens de validação em português,
  como o resto de `app/`.
- **Um commit por task.** Mensagem em Conventional Commits.

---

### Task 1: `WritableAttributes` — a lei da omissão num lugar só

**Files:**
- Create: `backend/app/Shared/Data/WritableAttributes.php`
- Test: `backend/tests/Feature/Shared/WritableAttributesTest.php`

**Interfaces:**
- Consumes: nada.
- Produces: `App\Shared\Data\WritableAttributes::from(array $attributes): array` — devolve o mesmo
  array sem as chaves cujo valor é `Spatie\LaravelData\Optional`. Usado pelas Tasks 2-5.

- [ ] **Step 1: Write the failing test**

```php
<?php

namespace Tests\Feature\Shared;

use App\Shared\Data\WritableAttributes;
use Spatie\LaravelData\Optional;
use Tests\TestCase;

class WritableAttributesTest extends TestCase
{
    public function test_chave_optional_sai_do_array(): void
    {
        $attrs = WritableAttributes::from([
            'name' => 'Ana',
            'phone' => new Optional,
        ]);

        $this->assertSame(['name' => 'Ana'], $attrs);
    }

    public function test_null_explicito_fica_e_apaga(): void
    {
        $attrs = WritableAttributes::from(['phone' => null]);

        $this->assertArrayHasKey('phone', $attrs);
        $this->assertNull($attrs['phone']);
    }

    /**
     * `array_filter` sem callback derrubaria `false`, `0` e `''` — e
     * `is_active => false` é o caso vivo (revogar acesso).
     */
    public function test_valores_falsy_sobrevivem(): void
    {
        $attrs = WritableAttributes::from([
            'is_active' => false,
            'student_count' => 0,
            'phone' => '',
        ]);

        $this->assertSame(['is_active' => false, 'student_count' => 0, 'phone' => ''], $attrs);
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `docker compose exec -T app php artisan test --filter=WritableAttributesTest`
Expected: FAIL — `Class "App\Shared\Data\WritableAttributes" not found`.

- [ ] **Step 3: Write minimal implementation**

```php
<?php

namespace App\Shared\Data;

use Spatie\LaravelData\Optional;

/**
 * Tradução única de `Optional` para atributo gravável (BD-14, D1/D2).
 *
 * A lei: **ausente não é nulo.** `Optional` significa "o corpo não falou deste
 * campo", e um PUT que não fala de um campo não pode apagá-lo. `null` explícito
 * continua sendo a única forma de limpar o valor guardado.
 *
 * Existe como função separada, e não como método de um `Data` base, porque
 * vários DTOs têm propriedades que NÃO são coluna (`role`, `course_ids`,
 * `templates`, `files`): quem decide o que vai para o `update()` é a Action,
 * não o DTO.
 */
class WritableAttributes
{
    /**
     * @param  array<string,mixed>  $attributes
     * @return array<string,mixed>
     */
    public static function from(array $attributes): array
    {
        return array_filter(
            $attributes,
            fn ($value) => ! $value instanceof Optional,
        );
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `docker compose exec -T app php artisan test --filter=WritableAttributesTest`
Expected: PASS (3 tests).

- [ ] **Step 5: Pint e commit**

```bash
cd backend && ./vendor/bin/pint app/Shared/Data/WritableAttributes.php tests/Feature/Shared/WritableAttributesTest.php
cd /home/jvbat/projetos/lotus
git add backend/app/Shared/Data/WritableAttributes.php backend/tests/Feature/Shared/WritableAttributesTest.php
git commit -m "feat(shared): WritableAttributes traduz Optional para atributo gravavel"
```

---

### Task 2: staff — omitir `rut` ou `phone` deixa de apagar

**Files:**
- Modify: `backend/app/Domains/Identity/Actions/UpdateStaffUserAction.php:40-59`
- Test: `backend/tests/Feature/Identity/OmissaoPreservaStaffTest.php` (create)

**Interfaces:**
- Consumes: `WritableAttributes::from()` (Task 1).
- Produces: nada novo — comportamento de `PUT /api/users/{user}`.

- [ ] **Step 1: Write the failing test**

```php
<?php

namespace Tests\Feature\Identity;

use App\Domains\Identity\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * D-13: a omissão preserva; só `null` explícito apaga. O par é o teste — só o
 * ramo do `null` deixaria a regressão passar verde.
 */
class OmissaoPreservaStaffTest extends TestCase
{
    use RefreshDatabase;

    private function alvo(): User
    {
        $alvo = User::factory()->create([
            'type' => 'admin',
            'rut' => '13.456.789-9',
            'phone' => '+56 9 1111 1111',
            'email' => 'alvo@lotus.cl',
        ]);
        $alvo->assignRole('admin');

        return $alvo;
    }

    public function test_put_sem_rut_mantem_o_rut_guardado(): void
    {
        $this->actingAsSuperadmin();
        $alvo = $this->alvo();

        $this->putJson("/api/users/{$alvo->id}", [
            'name' => 'Alvo Editado',
            'email' => 'alvo@lotus.cl',
            'role' => 'admin',
            'is_active' => true,
        ])->assertOk();

        $this->assertSame('13.456.789-9', $alvo->refresh()->rut);
    }

    public function test_put_sem_phone_mantem_o_telefone_guardado(): void
    {
        $this->actingAsSuperadmin();
        $alvo = $this->alvo();

        $this->putJson("/api/users/{$alvo->id}", [
            'name' => 'Alvo Editado',
            'email' => 'alvo@lotus.cl',
            'role' => 'admin',
            'is_active' => true,
        ])->assertOk();

        $this->assertSame('+56 9 1111 1111', $alvo->refresh()->phone);
    }

    public function test_null_explicito_continua_apagando(): void
    {
        $this->actingAsSuperadmin();
        $alvo = $this->alvo();

        $this->putJson("/api/users/{$alvo->id}", [
            'name' => 'Alvo Editado',
            'email' => 'alvo@lotus.cl',
            'rut' => null,
            'phone' => null,
            'role' => 'admin',
            'is_active' => true,
        ])->assertOk();

        $alvo->refresh();
        $this->assertNull($alvo->rut);
        $this->assertNull($alvo->phone);
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `docker compose exec -T app php artisan test --filter=OmissaoPreservaStaffTest`
Expected: FAIL nos dois primeiros — `Failed asserting that null is identical to '13.456.789-9'`
(e o mesmo para o telefone). O terceiro já passa.

- [ ] **Step 3: Write minimal implementation**

Em `UpdateStaffUserAction.php`, troque o bloco `$attrs = [...]` (linhas 49-55) por:

```php
            $attrs = WritableAttributes::from([
                'name' => $data->name,
                'email' => $data->email,
                // `rut` omitido não vira null: o `Optional` segue adiante e a
                // chave sai do array. Só o `null` explícito apaga (D1).
                'rut' => $data->rut instanceof Optional ? $data->rut : $rut,
                'phone' => $data->phone,
                'is_active' => $data->is_active,
            ]);

            // `password` NÃO entra no helper: aqui `''` também significa
            // "mantém a atual", e isso é regra de senha, não de omissão.
            if (! ($data->password instanceof Optional) && $data->password !== '') {
                $attrs['password'] = $data->password;
            }
```

E adicione o import `use App\Shared\Data\WritableAttributes;`.

A chamada de unicidade (linhas 43-47) continua exatamente como está: `rut` omitido chama
`ensureIdentityAvailable(null, ...)`, que pula só a checagem de RUT e mantém a de e-mail (D1c).

- [ ] **Step 4: Run test to verify it passes**

Run: `docker compose exec -T app php artisan test --filter=OmissaoPreservaStaffTest`
Expected: PASS (3 tests).

- [ ] **Step 5: Rodar os testes vizinhos que já existiam**

Run: `docker compose exec -T app php artisan test --filter=StaffUserCrudTest`
Run: `docker compose exec -T app php artisan test --filter=StaffUserActionTest`
Run: `docker compose exec -T app php artisan test --filter=UniquenessInsideTransactionTest`
Expected: PASS nos três — em especial `test_update_sem_senha_preserva_login`, que exercita o `if` do
password que ficou fora do helper.

- [ ] **Step 6: Pint e commit**

```bash
cd backend && ./vendor/bin/pint app/Domains/Identity/Actions/UpdateStaffUserAction.php tests/Feature/Identity/OmissaoPreservaStaffTest.php
cd /home/jvbat/projetos/lotus
git add backend/app/Domains/Identity/Actions/UpdateStaffUserAction.php backend/tests/Feature/Identity/OmissaoPreservaStaffTest.php
git commit -m "fix(identity): PUT que omite rut ou phone do staff nao apaga o valor"
```

---

### Task 3: redator, aluno e perfil — as três grafias divergentes convergem

**Files:**
- Modify: `backend/app/Domains/Identity/Actions/UpdateRedatorAction.php:67-73`
- Modify: `backend/app/Domains/Identity/Actions/UpdateStudentAction.php:27-32`
- Modify: `backend/app/Domains/Identity/Actions/UpdateProfileAction.php:19-27`
- Test: `backend/tests/Feature/Identity/OmissaoPreservaRedatorEAlunoTest.php` (create)

**Interfaces:**
- Consumes: `WritableAttributes::from()` (Task 1).
- Produces: nada novo.

- [ ] **Step 1: Write the failing test**

```php
<?php

namespace Tests\Feature\Identity;

use App\Domains\Identity\Models\Redator;
use App\Domains\Identity\Models\Student;
use App\Domains\Identity\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OmissaoPreservaRedatorEAlunoTest extends TestCase
{
    use RefreshDatabase;

    public function test_put_de_redator_sem_phone_mantem_o_telefone(): void
    {
        $this->actingAsSuperadmin();

        $user = User::factory()->redator()->create([
            'rut' => '12.345.678-5',
            'email' => 'red@lotus.cl',
            'phone' => '+56 9 3333 3333',
        ]);
        $redator = $user->redator()->create([]);

        $this->putJson("/api/redatores/{$redator->id}", [
            'name' => 'Redator Editado',
            'rut' => '12.345.678-5',
            'email' => 'red@lotus.cl',
        ])->assertOk();

        $this->assertSame('+56 9 3333 3333', $user->refresh()->phone);
    }

    public function test_put_de_redator_com_phone_null_apaga(): void
    {
        $this->actingAsSuperadmin();

        $user = User::factory()->redator()->create([
            'rut' => '12.345.678-5',
            'email' => 'red@lotus.cl',
            'phone' => '+56 9 3333 3333',
        ]);
        $redator = $user->redator()->create([]);

        $this->putJson("/api/redatores/{$redator->id}", [
            'name' => 'Redator Editado',
            'rut' => '12.345.678-5',
            'email' => 'red@lotus.cl',
            'phone' => null,
        ])->assertOk();

        $this->assertNull($user->refresh()->phone);
    }

    /**
     * `is_active` do redator já preservava por spread condicional. O teste
     * existe para a convergência ao helper não regredir a revogação.
     */
    public function test_put_de_redator_sem_is_active_nao_revoga_acesso(): void
    {
        $this->actingAsSuperadmin();

        $user = User::factory()->redator()->create([
            'rut' => '12.345.678-5',
            'email' => 'red@lotus.cl',
            'is_active' => true,
        ]);
        $redator = $user->redator()->create([]);

        $this->putJson("/api/redatores/{$redator->id}", [
            'name' => 'Redator Editado',
            'rut' => '12.345.678-5',
            'email' => 'red@lotus.cl',
        ])->assertOk();

        $this->assertTrue($user->refresh()->is_active);
    }

    public function test_put_de_aluno_sem_phone_mantem_o_telefone(): void
    {
        $this->actingAsAdmin();

        $user = User::factory()->create([
            'type' => 'aluno',
            'is_active' => false,
            'rut' => '13.456.789-9',
            'email' => 'aluno@lotus.cl',
            'phone' => '+56 9 4444 4444',
        ]);
        /** @var Student $student */
        $student = $user->student()->create([]);

        $this->putJson("/api/students/{$student->id}", [
            'name' => 'Aluno Editado',
            'rut' => '13.456.789-9',
            'email' => 'aluno@lotus.cl',
        ])->assertOk();

        $this->assertSame('+56 9 4444 4444', $user->refresh()->phone);
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `docker compose exec -T app php artisan test --filter=OmissaoPreservaRedatorEAlunoTest`
Expected: FAIL só em `test_put_de_redator_sem_phone_mantem_o_telefone`
(`Failed asserting that null is identical to '+56 9 3333 3333'`). Os outros três já passam — o aluno
porque `UpdateStudentAction:31` já preservava, e o `is_active` pelo spread.

> Se algum dos três "já passa" falhar por payload (RUT inválido, rota, permissão), corrija o teste —
> não a Action. Só o primeiro caso é defeito.

- [ ] **Step 3: Write minimal implementation**

`UpdateRedatorAction.php` — troque o `$redator->user->update([...])` (linhas 67-73) por:

```php
                $redator->user->update(WritableAttributes::from([
                    'name' => $data->name,
                    'rut' => $rut,
                    'email' => $data->email,
                    'phone' => $data->phone,
                    'is_active' => $data->is_active,
                ]));
```

`UpdateStudentAction.php` — troque o `$user->update([...])` (linhas 27-32) por:

```php
            $user->update(WritableAttributes::from([
                'name' => $data->name,
                'rut' => $rut,
                'email' => $data->email,
                'phone' => $data->phone,
            ]));
```

`UpdateProfileAction.php` — troque o corpo do método (linhas 19-27) por:

```php
        // Ausente não é nulo: `Optional` significa "não mandou", e apagar o
        // telefone de quem só omitiu o campo seria perda silenciosa. A regra
        // mora em WritableAttributes (D2).
        $campos = WritableAttributes::from([
            'name' => $data->name,
            'phone' => $data->phone,
        ]);

        DB::transaction(fn () => $user->update($campos));
```

Em cada um dos três arquivos, adicione `use App\Shared\Data\WritableAttributes;` e remova o import
`use Spatie\LaravelData\Optional;` **apenas se** o arquivo não usar mais `Optional` — no
`UpdateRedatorAction` ele continua sendo usado em `:63` (`$revogando`) e em `:79` (`course_ids`),
então lá o import fica.

- [ ] **Step 4: Run test to verify it passes**

Run: `docker compose exec -T app php artisan test --filter=OmissaoPreservaRedatorEAlunoTest`
Expected: PASS (4 tests).

- [ ] **Step 5: Rodar os testes vizinhos**

Run: `docker compose exec -T app php artisan test --filter=ProfileUpdateTest`
Run: `docker compose exec -T app php artisan test --filter=UpdateStudentActionTest`
Run: `docker compose exec -T app php artisan test --filter=RedatorAccessRevocationTest`
Run: `docker compose exec -T app php artisan test --filter=RedatorCrudTest`
Expected: PASS nos quatro. `RedatorAccessRevocationTest` é o que prova que revogar continua
derrubando sessão.

- [ ] **Step 6: Pint e commit**

```bash
cd backend && ./vendor/bin/pint app/Domains/Identity/Actions/UpdateRedatorAction.php app/Domains/Identity/Actions/UpdateStudentAction.php app/Domains/Identity/Actions/UpdateProfileAction.php tests/Feature/Identity/OmissaoPreservaRedatorEAlunoTest.php
cd /home/jvbat/projetos/lotus
git add backend/app/Domains/Identity/Actions/Update{Redator,Student,Profile}Action.php backend/tests/Feature/Identity/OmissaoPreservaRedatorEAlunoTest.php
git commit -m "refactor(identity): redator, aluno e perfil respondem a omissao pela fonte unica"
```

---

### Task 4: cliente e curso — `phone`, `business_activity`, `technical_name`, `description`

**Files:**
- Modify: `backend/app/Domains/Commercial/Actions/UpdateClientAction.php:38-49`
- Modify: `backend/app/Domains/Catalog/Actions/UpdateCourseAction.php:28-33`
- Test: `backend/tests/Feature/Cadastros/OmissaoPreservaClienteECursoTest.php` (create)

**Interfaces:**
- Consumes: `WritableAttributes::from()` (Task 1).
- Produces: nada novo.

- [ ] **Step 1: Write the failing test**

```php
<?php

namespace Tests\Feature\Cadastros;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\CreatesDomainRecords;
use Tests\TestCase;

class OmissaoPreservaClienteECursoTest extends TestCase
{
    use CreatesDomainRecords;
    use RefreshDatabase;

    public function test_put_de_cliente_sem_phone_e_sem_business_activity_preserva_os_dois(): void
    {
        $this->actingAsAdmin();

        $client = $this->makeClientWithUser(
            ['legal_name' => 'ACME', 'type' => 'client', 'business_activity' => 'Montagem elétrica'],
            ['rut' => '12.345.678-5', 'email' => 'acme@lotus.cl', 'phone' => '+56 9 5555 5555'],
        );

        $this->putJson("/api/clients/{$client->id}", [
            'name' => 'ACME Editada',
            'rut' => '12.345.678-5',
            'email' => 'acme@lotus.cl',
            'legal_name' => 'ACME S.A.',
            'type' => 'client',
        ])->assertOk();

        $client->refresh();
        $this->assertSame('+56 9 5555 5555', $client->user->phone);
        $this->assertSame('Montagem elétrica', $client->business_activity);
    }

    public function test_put_de_cliente_com_null_explicito_apaga_os_dois(): void
    {
        $this->actingAsAdmin();

        $client = $this->makeClientWithUser(
            ['legal_name' => 'ACME', 'type' => 'client', 'business_activity' => 'Montagem elétrica'],
            ['rut' => '12.345.678-5', 'email' => 'acme@lotus.cl', 'phone' => '+56 9 5555 5555'],
        );

        $this->putJson("/api/clients/{$client->id}", [
            'name' => 'ACME Editada',
            'rut' => '12.345.678-5',
            'email' => 'acme@lotus.cl',
            'legal_name' => 'ACME S.A.',
            'type' => 'client',
            'phone' => null,
            'business_activity' => null,
        ])->assertOk();

        $client->refresh();
        $this->assertNull($client->user->phone);
        $this->assertNull($client->business_activity);
    }

    public function test_put_de_curso_sem_technical_name_e_description_preserva_os_dois(): void
    {
        $this->actingAsAdmin();

        $course = $this->makeCourse([
            'name' => 'Alta Tensão',
            'technical_name' => 'AT-001',
            'description' => 'Curso regulado',
        ]);

        $this->putJson("/api/courses/{$course->id}", [
            'name' => 'Alta Tensão II',
            'workload_hours' => 12,
        ])->assertOk();

        $course->refresh();
        $this->assertSame('AT-001', $course->technical_name);
        $this->assertSame('Curso regulado', $course->description);
    }

    public function test_put_de_curso_com_null_explicito_apaga_os_dois(): void
    {
        $this->actingAsAdmin();

        $course = $this->makeCourse([
            'name' => 'Alta Tensão',
            'technical_name' => 'AT-001',
            'description' => 'Curso regulado',
        ]);

        $this->putJson("/api/courses/{$course->id}", [
            'name' => 'Alta Tensão II',
            'workload_hours' => 12,
            'technical_name' => null,
            'description' => null,
        ])->assertOk();

        $course->refresh();
        $this->assertNull($course->technical_name);
        $this->assertNull($course->description);
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `docker compose exec -T app php artisan test --filter=OmissaoPreservaClienteECursoTest`
Expected: FAIL nos dois testes de preservação (`Failed asserting that null is identical to …`);
PASS nos dois de `null` explícito.

- [ ] **Step 3: Write minimal implementation**

`UpdateClientAction.php` — troque os dois `update([...])` (linhas 38-49) por:

```php
            $client->user->update(WritableAttributes::from([
                'name' => $data->name,
                'rut' => $rut,
                'email' => $data->email,
                'phone' => $data->phone,
            ]));

            $client->update(WritableAttributes::from([
                'legal_name' => $data->legal_name,
                'type' => $data->type,
                'business_activity' => $data->business_activity,
            ]));
```

`UpdateCourseAction.php` — troque o `$course->update([...])` (linhas 28-33) por:

```php
            $course->update(WritableAttributes::from([
                'name' => $data->name,
                'technical_name' => $data->technical_name,
                'description' => $data->description,
                'workload_hours' => $data->workload_hours,
            ]));
```

Adicione `use App\Shared\Data\WritableAttributes;` nos dois. O import de `Optional` fica: os dois
arquivos continuam usando `instanceof Optional` nas coleções nested (cliente: `:55`, `:62`;
curso: `:37`, `:46`), e esse ramo **não muda** — coleção ausente já não entrava no replace.

- [ ] **Step 4: Run test to verify it passes**

Run: `docker compose exec -T app php artisan test --filter=OmissaoPreservaClienteECursoTest`
Expected: PASS (4 tests).

- [ ] **Step 5: Rodar os testes vizinhos**

Run: `docker compose exec -T app php artisan test --filter=ClientCrudTest`
Run: `docker compose exec -T app php artisan test --filter=ClientNestedTest`
Run: `docker compose exec -T app php artisan test --filter=CourseCrudTest`
Run: `docker compose exec -T app php artisan test --filter=CourseModuleCrudTest`
Expected: PASS nos quatro.

- [ ] **Step 6: Pint e commit**

```bash
cd backend && ./vendor/bin/pint app/Domains/Commercial/Actions/UpdateClientAction.php app/Domains/Catalog/Actions/UpdateCourseAction.php tests/Feature/Cadastros/OmissaoPreservaClienteECursoTest.php
cd /home/jvbat/projetos/lotus
git add backend/app/Domains/Commercial/Actions/UpdateClientAction.php backend/app/Domains/Catalog/Actions/UpdateCourseAction.php backend/tests/Feature/Cadastros/OmissaoPreservaClienteECursoTest.php
git commit -m "fix(cadastros): omissao no PUT de cliente e curso deixa de apagar campo"
```

---

### Task 5: cotação — `purchase_order` e as duas datas planejadas

**Files:**
- Modify: `backend/app/Domains/Commercial/Actions/UpdateQuoteAction.php:26-34`
- Test: `backend/tests/Feature/Comercial/OmissaoPreservaCotacaoTest.php` (create)

**Interfaces:**
- Consumes: `WritableAttributes::from()` (Task 1).
- Produces: nada novo.

- [ ] **Step 1: Write the failing test**

```php
<?php

namespace Tests\Feature\Comercial;

use App\Domains\Commercial\Models\Budget;
use App\Domains\Commercial\Models\Quote;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\CreatesDomainRecords;
use Tests\TestCase;

class OmissaoPreservaCotacaoTest extends TestCase
{
    use CreatesDomainRecords;
    use RefreshDatabase;

    private function cotacao(): Quote
    {
        $client = $this->makeClientWithUser();
        $budget = Budget::create(['client_id' => $client->id, 'code' => 'Scap 1']);

        return Quote::create([
            'budget_id' => $budget->id,
            'course_id' => $this->makeCourse()->id,
            'seq_in_budget' => 1,
            'student_count' => 5,
            'value_uf' => '10.0000',
            'purchase_order' => 'OC-123',
            'planned_start_date' => '2026-09-01',
            'planned_end_date' => '2026-09-30',
            'status' => 'pending',
        ]);
    }

    public function test_put_sem_purchase_order_e_datas_preserva_os_tres(): void
    {
        $this->actingAsAdmin();
        $quote = $this->cotacao();

        $this->putJson("/api/quotes/{$quote->id}", [
            'course_id' => $quote->course_id,
            'student_count' => 8,
            'value_uf' => '12.0000',
        ])->assertOk();

        $quote->refresh();
        $this->assertSame('OC-123', $quote->purchase_order);
        $this->assertSame('2026-09-01', $quote->planned_start_date?->toDateString());
        $this->assertSame('2026-09-30', $quote->planned_end_date?->toDateString());
    }

    public function test_put_com_null_explicito_apaga_os_tres(): void
    {
        $this->actingAsAdmin();
        $quote = $this->cotacao();

        $this->putJson("/api/quotes/{$quote->id}", [
            'course_id' => $quote->course_id,
            'student_count' => 8,
            'value_uf' => '12.0000',
            'purchase_order' => null,
            'planned_start_date' => null,
            'planned_end_date' => null,
        ])->assertOk();

        $quote->refresh();
        $this->assertNull($quote->purchase_order);
        $this->assertNull($quote->planned_start_date);
        $this->assertNull($quote->planned_end_date);
    }
}
```

> `planned_start_date` e `planned_end_date` são `'date'` em `Quote::$casts:51-52`, então
> `?->toDateString()` é a leitura certa — medido, não suposto.

- [ ] **Step 2: Run test to verify it fails**

Run: `docker compose exec -T app php artisan test --filter=OmissaoPreservaCotacaoTest`
Expected: FAIL em `test_put_sem_purchase_order_e_datas_preserva_os_tres`; PASS no outro.

- [ ] **Step 3: Write minimal implementation**

```php
        $quote->update(WritableAttributes::from([
            'course_id' => $data->course_id,
            'student_count' => $data->student_count,
            'value_uf' => $data->value_uf,
            'purchase_order' => $data->purchase_order,
            'planned_start_date' => $data->planned_start_date,
            'planned_end_date' => $data->planned_end_date,
            'status' => QuoteStatus::Pending,   // reabre recusada; mantém pendente
        ]));
```

Adicione `use App\Shared\Data\WritableAttributes;` e remova `use Spatie\LaravelData\Optional;` —
neste arquivo `Optional` deixa de ser usado.

- [ ] **Step 4: Run test to verify it passes**

Run: `docker compose exec -T app php artisan test --filter=OmissaoPreservaCotacaoTest`
Expected: PASS (2 tests).

- [ ] **Step 5: Rodar os testes vizinhos**

Run: `docker compose exec -T app php artisan test --filter=QuoteCrudTest`
Run: `docker compose exec -T app php artisan test --filter=QuoteApprovalTest`
Expected: PASS nos dois.

- [ ] **Step 6: Pint e commit**

```bash
cd backend && ./vendor/bin/pint app/Domains/Commercial/Actions/UpdateQuoteAction.php tests/Feature/Comercial/OmissaoPreservaCotacaoTest.php
cd /home/jvbat/projetos/lotus
git add backend/app/Domains/Commercial/Actions/UpdateQuoteAction.php backend/tests/Feature/Comercial/OmissaoPreservaCotacaoTest.php
git commit -m "fix(comercial): omissao no PUT de cotacao deixa de apagar OC e datas"
```

---

### Task 6: chave computada no corpo vira 422 (D-12)

**Files:**
- Create: `backend/app/Shared/Data/ComputedFields.php`
- Modify: `backend/app/Domains/Identity/Data/UserData.php:54-61` (`rules()`)
- Modify: `backend/app/Domains/Identity/Data/StudentData.php` (`rules()`)
- Modify: `backend/app/Domains/Identity/Data/RedatorData.php` (`rules()`)
- Modify: `backend/app/Domains/Commercial/Data/ClientData.php` (`rules()`)
- Modify: `backend/app/Domains/Operation/Data/TurmaData.php` (`rules()`) — campo `client_photo_url`
- Modify: `backend/app/Domains/Operation/Data/EnrollmentData.php` (`rules()`)
- Test: `backend/tests/Feature/Shared/ChaveComputadaNoCorpoTest.php` (create)

**Interfaces:**
- Consumes: nada.
- Produces: `App\Shared\Data\ComputedFields::rejected(string ...$fields): array` — devolve
  `['<campo>' => ['missing'], ...]` para espalhar dentro de `rules()`.

- [ ] **Step 1: Write the failing test**

```php
<?php

namespace Tests\Feature\Shared;

use App\Domains\Identity\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\Support\CreatesDomainRecords;
use Tests\TestCase;

/**
 * D-12: `photo_url` é `#[Computed]` e tem rota própria de upload. Mandá-la no
 * corpo devolvia 200 e era engolida — a promoção no construtor do DTO desvia do
 * `CannotSetComputedValue`.
 *
 * `missing`, não `prohibited`: `validateProhibited` é `! validateRequired` no
 * vendor, então o campo presente mas VAZIO passava. É por isso que o segundo
 * ramo (`null`) existe aqui — o precedente é `ProfileUpdateData:28-35`.
 */
class ChaveComputadaNoCorpoTest extends TestCase
{
    use CreatesDomainRecords;
    use RefreshDatabase;

    #[DataProvider('valoresForjados')]
    public function test_photo_url_no_corpo_do_staff_e_422(mixed $valor): void
    {
        $this->actingAsSuperadmin();

        $alvo = User::factory()->create(['type' => 'admin', 'email' => 'alvo@lotus.cl']);
        $alvo->assignRole('admin');

        $this->putJson("/api/users/{$alvo->id}", [
            'name' => 'Alvo',
            'email' => 'alvo@lotus.cl',
            'role' => 'admin',
            'is_active' => true,
            'photo_url' => $valor,
        ])->assertStatus(422)->assertJsonPath('errors.photo_url.0', fn ($m) => $m !== null);
    }

    public static function valoresForjados(): array
    {
        return [
            'url forjada' => ['http://evil/x.png'],
            'null' => [null],
            'string vazia' => [''],
        ];
    }

    public function test_photo_url_no_corpo_do_cliente_e_422(): void
    {
        $this->actingAsAdmin();

        $client = $this->makeClientWithUser(
            [],
            ['rut' => '12.345.678-5', 'email' => 'acme@lotus.cl'],
        );

        $this->putJson("/api/clients/{$client->id}", [
            'name' => 'ACME',
            'rut' => '12.345.678-5',
            'email' => 'acme@lotus.cl',
            'legal_name' => 'ACME S.A.',
            'type' => 'client',
            'photo_url' => 'http://evil/x.png',
        ])->assertStatus(422);
    }

    /**
     * Arch test: todo campo de foto dos DTOs é `#[Computed]`. Cobre também os
     * DTOs que só SAEM, onde `rules()` nunca roda.
     */
    public function test_todo_campo_de_foto_de_dto_e_computed(): void
    {
        $arquivos = glob(app_path('Domains/*/Data/*.php'));
        $faltando = [];

        foreach ($arquivos as $arquivo) {
            $fonte = file_get_contents($arquivo);

            if (! preg_match_all('/^\s*(#\[[^\]]+\]\s*)*public \?string \$(\w*photo_url) =/m', $fonte, $m)) {
                continue;
            }

            foreach ($m[2] as $campo) {
                $trecho = substr($fonte, 0, strpos($fonte, "\$$campo ="));

                if (! str_contains(substr($trecho, -400), '#[Computed]')) {
                    $faltando[] = basename($arquivo).'::'.$campo;
                }
            }
        }

        $this->assertSame([], $faltando, 'Campo de foto sem #[Computed]: '.implode(', ', $faltando));
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `docker compose exec -T app php artisan test --filter=ChaveComputadaNoCorpoTest`
Expected: FAIL nos quatro casos de 422 (`Expected response status code [422] but received [200]`).
O arch test já passa — hoje os 11 campos têm `#[Computed]`; ele existe para não regredir.

- [ ] **Step 3: Write minimal implementation**

Crie `backend/app/Shared/Data/ComputedFields.php`:

```php
<?php

namespace App\Shared\Data;

/**
 * Chaves de SAÍDA computada que um corpo de escrita não pode carregar (BD-14,
 * D3). Fonte única da lista, para o `rules()` de cada DTO não divergir por
 * cópia.
 *
 * `missing`, e não `prohibited`: `validateProhibited` é `! validateRequired`
 * no vendor (`ValidatesAttributes.php`), então o campo presente mas vazio
 * (`null`, `''`, `[]`) passa com 200 silencioso. `missing` reprova a mera
 * presença da chave. O precedente é `ProfileUpdateData::rules()`.
 */
class ComputedFields
{
    /**
     * @return array<string,array<string>>
     */
    public static function rejected(string ...$fields): array
    {
        return array_map(fn () => ['missing'], array_flip($fields));
    }
}
```

Em cada um dos seis DTOs de entrada, espalhe a regra no início do `rules()`. Em `UserData`:

```php
    public static function rules(): array
    {
        return [
            ...ComputedFields::rejected('photo_url'),
            'rut' => ['nullable', 'string', new ValidRut],
            'password' => ['sometimes', 'string', 'min:8'],
            'role' => ['required', 'string', 'exists:roles,name', Rule::notIn(['redator'])],
        ];
    }
```

Repita a mesma linha `...ComputedFields::rejected('photo_url'),` como PRIMEIRA entrada do array
devolvido por `rules()` em `StudentData`, `RedatorData`, `ClientData` e `EnrollmentData`. Em
`TurmaData` o campo tem outro nome: `...ComputedFields::rejected('client_photo_url'),`.

Adicione `use App\Shared\Data\ComputedFields;` nos seis arquivos. Se algum deles não tiver
`rules()`, crie o método com só essa linha dentro do array.

- [ ] **Step 4: Run test to verify it passes**

Run: `docker compose exec -T app php artisan test --filter=ChaveComputadaNoCorpoTest`
Expected: PASS (5 tests).

- [ ] **Step 5: Rodar as suítes dos domínios tocados**

Run: `docker compose exec -T app php artisan test tests/Feature/Identity`
Run: `docker compose exec -T app php artisan test tests/Feature/Cadastros`
Run: `docker compose exec -T app php artisan test tests/Feature/Operation`
Expected: PASS. Um teste antigo que mandava `photo_url` no corpo agora recebe 422 — se aparecer,
**o teste é que está errado**: remova a chave do payload dele e registre no commit.

- [ ] **Step 6: Pint e commit**

```bash
cd backend && ./vendor/bin/pint app/Shared/Data/ComputedFields.php app/Domains/Identity/Data/UserData.php app/Domains/Identity/Data/StudentData.php app/Domains/Identity/Data/RedatorData.php app/Domains/Commercial/Data/ClientData.php app/Domains/Operation/Data/TurmaData.php app/Domains/Operation/Data/EnrollmentData.php tests/Feature/Shared/ChaveComputadaNoCorpoTest.php
cd /home/jvbat/projetos/lotus
git add backend/app/Shared/Data/ComputedFields.php backend/app/Domains backend/tests/Feature/Shared/ChaveComputadaNoCorpoTest.php
git commit -m "fix(shared): chave computada no corpo de escrita vira 422"
```

---

### Task 7: colisão de índice único vira 422 com o campo nomeado (P-29)

**Files:**
- Modify: `backend/app/Domains/Identity/Services/UserProvisioner.php`
- Modify: `backend/app/Domains/Identity/Actions/UpdateStaffUserAction.php` (envolver a escrita)
- Modify: `backend/app/Domains/Commercial/Actions/UpdateClientAction.php`
- Modify: `backend/app/Domains/Identity/Actions/UpdateRedatorAction.php`
- Modify: `backend/app/Domains/Identity/Actions/UpdateStudentAction.php`
- Test: `backend/tests/Feature/Identity/ColisaoDeIndiceVira422Test.php` (create)

**Interfaces:**
- Consumes: `UserProvisioner` já injetado nas quatro Actions.
- Produces: `UserProvisioner::writing(Closure $write): mixed` — executa a escrita e traduz violação
  de índice único de `users` em `ValidationException` do campo (`rut` ou `email`).

- [ ] **Step 1: Write the failing test**

```php
<?php

namespace Tests\Feature\Identity;

use App\Domains\Identity\Models\User;
use App\Domains\Identity\Services\UserProvisioner;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

/**
 * P-29: o check de unicidade roda dentro da transação, mas não trava linha
 * inexistente — dois cadastros simultâneos do mesmo RUT passam os dois pelo
 * check e o perdedor estoura no índice único. O handler devolvia 500 mascarado.
 */
class ColisaoDeIndiceVira422Test extends TestCase
{
    use RefreshDatabase;

    /** MySQL é o banco de produção; a suíte roda sqlite. As duas grafias contam. */
    public function test_traduz_a_mensagem_do_mysql(): void
    {
        $e = new QueryException(
            'mysql',
            'update `users` set `email` = ?',
            [],
            new \RuntimeException("Duplicate entry 'ana@lotus.cl' for key 'users_email_unique'"),
        );

        try {
            app(UserProvisioner::class)->writing(fn () => throw $e);
            $this->fail('esperava ValidationException');
        } catch (ValidationException $validacao) {
            $this->assertArrayHasKey('email', $validacao->errors());
        }
    }

    public function test_traduz_a_mensagem_do_sqlite(): void
    {
        $e = new QueryException(
            'sqlite',
            'update "users" set "rut" = ?',
            [],
            new \RuntimeException('UNIQUE constraint failed: users.rut'),
        );

        try {
            app(UserProvisioner::class)->writing(fn () => throw $e);
            $this->fail('esperava ValidationException');
        } catch (ValidationException $validacao) {
            $this->assertArrayHasKey('rut', $validacao->errors());
        }
    }

    /** Violação de OUTRA tabela continua subindo como está — 500 honesto. */
    public function test_nao_sequestra_violacao_de_outra_tabela(): void
    {
        $e = new QueryException(
            'sqlite',
            'insert into "quotes"',
            [],
            new \RuntimeException('UNIQUE constraint failed: quotes.budget_id, quotes.seq_in_budget'),
        );

        $this->expectException(QueryException::class);

        app(UserProvisioner::class)->writing(fn () => throw $e);
    }

    /**
     * Prova pelo caminho HTTP: a linha colidente nasce DEPOIS do check, dentro
     * da mesma transação, então o UPDATE é que estoura no índice.
     */
    public function test_colisao_real_no_update_devolve_422_com_o_campo(): void
    {
        $this->actingAsSuperadmin();

        $alvo = User::factory()->create(['type' => 'admin', 'email' => 'alvo@lotus.cl']);
        $alvo->assignRole('admin');

        $jaInseriu = false;
        User::updating(function () use (&$jaInseriu) {
            if ($jaInseriu) {
                return;
            }
            $jaInseriu = true;
            User::factory()->create(['type' => 'admin', 'email' => 'corrida@lotus.cl']);
        });

        $this->putJson("/api/users/{$alvo->id}", [
            'name' => 'Alvo',
            'email' => 'corrida@lotus.cl',
            'role' => 'admin',
            'is_active' => true,
        ])->assertStatus(422)->assertJsonPath('errors.email.0', fn ($m) => $m !== null);
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `docker compose exec -T app php artisan test --filter=ColisaoDeIndiceVira422Test`
Expected: FAIL — `Call to undefined method …UserProvisioner::writing()` nos três primeiros e 500 no
quarto.

- [ ] **Step 3: Write minimal implementation**

Em `UserProvisioner.php`, adicione os imports `use Closure;` e
`use Illuminate\Database\QueryException;`, extraia as mensagens do caso "vivo" para constante e
acrescente os dois métodos:

```php
    private const DUPLICADO = [
        'rut' => 'Este RUT já está cadastrado.',
        'email' => 'Este e-mail já está cadastrado.',
    ];
```

Use a constante nos dois pontos de `ensureIdentityAvailable` que hoje têm a string literal do ramo
`'vivo'` (`$erros['rut'] = …` e `$erros['email'] = …`), mantendo as mensagens do ramo `'arquivado'`
como estão.

```php
    /**
     * Executa a escrita traduzindo colisão de índice único de `users` em 422 do
     * campo — a MESMA resposta que `ensureIdentityAvailable` dá quando ganha a
     * corrida (P-29). O check não trava linha inexistente, então duas escritas
     * concorrentes passam as duas por ele e o perdedor estoura no índice.
     *
     * A detecção é pela mensagem, e não pelo SQLSTATE: `QueryException::getCode`
     * carrega o código da PDOException por baixo, cuja forma varia por driver.
     * Cobrimos as duas grafias — sqlite (`users.rut`) porque é onde a suíte
     * roda, MySQL (`users_rut_unique`) porque é onde o cliente está.
     *
     * @template T
     *
     * @param  Closure():T  $write
     * @return T
     */
    public function writing(Closure $write): mixed
    {
        try {
            return $write();
        } catch (QueryException $e) {
            $coluna = $this->duplicateColumn($e);

            if ($coluna === null) {
                throw $e;
            }

            throw ValidationException::withMessages([$coluna => self::DUPLICADO[$coluna]]);
        }
    }

    private function duplicateColumn(QueryException $e): ?string
    {
        $mensagem = $e->getMessage();

        foreach (array_keys(self::DUPLICADO) as $coluna) {
            if (str_contains($mensagem, "users_{$coluna}_unique") || str_contains($mensagem, "users.{$coluna}")) {
                return $coluna;
            }
        }

        return null;
    }
```

Nas quatro Actions que escrevem identidade, envolva **a escrita do User** (não a transação inteira):

- `UpdateStaffUserAction`: `$this->users->writing(fn () => $user->update($attrs));`
- `UpdateClientAction` (em `Commercial/Actions`): `$this->users->writing(fn () => $client->user->update(WritableAttributes::from([...])));`
- `UpdateRedatorAction`: `$this->users->writing(fn () => $redator->user->update(WritableAttributes::from([...])));`
- `UpdateStudentAction`: `$this->users->writing(fn () => $user->update(WritableAttributes::from([...])));`

O caminho de create já escreve **dentro** do provisioner (`provision()`), então envolva ali o
`User::create([...])` pela mesma chamada e ele fica coberto por dentro (D4b).

- [ ] **Step 4: Run test to verify it passes**

Run: `docker compose exec -T app php artisan test --filter=ColisaoDeIndiceVira422Test`
Expected: PASS (4 tests).

- [ ] **Step 5: Rodar os testes de identidade inteiros**

Run: `docker compose exec -T app php artisan test tests/Feature/Identity`
Run: `docker compose exec -T app php artisan test --filter=EnsureIdentityAvailableTest`
Run: `docker compose exec -T app php artisan test --filter=UniquenessInsideTransactionTest`
Expected: PASS. `EnsureIdentityAvailableTest` é quem prova que as mensagens não mudaram ao virar
constante.

- [ ] **Step 6: Pint e commit**

```bash
cd backend && ./vendor/bin/pint app/Domains/Identity/Services/UserProvisioner.php app/Domains/Identity/Actions/UpdateStaffUserAction.php app/Domains/Identity/Actions/UpdateRedatorAction.php app/Domains/Identity/Actions/UpdateStudentAction.php app/Domains/Commercial/Actions/UpdateClientAction.php tests/Feature/Identity/ColisaoDeIndiceVira422Test.php
cd /home/jvbat/projetos/lotus
git add backend/app backend/tests/Feature/Identity/ColisaoDeIndiceVira422Test.php
git commit -m "fix(identity): colisao de indice unico de users devolve 422 com o campo"
```

---

### Task 8: `seq_in_budget` sai do `$fillable` (P-35)

**Files:**
- Modify: `backend/app/Domains/Commercial/Models/Quote.php:29-40` (`$fillable`)
- Modify: `backend/app/Domains/Commercial/Actions/CreateQuoteAction.php:27-37`
- Modify: os arquivos de teste que criam `Quote` por mass assignment (lista no Step 3)
- Test: `backend/tests/Feature/Comercial/SeqInBudgetNaoEMassAssignmentTest.php` (create)

**Interfaces:**
- Consumes: nada.
- Produces: nada novo — `CreateQuoteAction::execute()` mantém assinatura e retorno.

- [ ] **Step 1: Write the failing test**

```php
<?php

namespace Tests\Feature\Comercial;

use App\Domains\Commercial\Models\Budget;
use App\Domains\Commercial\Models\Quote;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\CreatesDomainRecords;
use Tests\TestCase;

/**
 * ADR-17: o número derivado sob lock não pode ser vencido por payload. O
 * `version` do template já era assim (`CreateCertificateTemplateAction`); o
 * `seq_in_budget` era a metade que faltava (P-35).
 */
class SeqInBudgetNaoEMassAssignmentTest extends TestCase
{
    use CreatesDomainRecords;
    use RefreshDatabase;

    public function test_seq_in_budget_nao_e_mass_assignable(): void
    {
        $this->assertNotContains('seq_in_budget', (new Quote)->getFillable());
    }

    public function test_payload_com_seq_in_budget_nao_vence_a_derivacao(): void
    {
        $this->actingAsAdmin();

        $client = $this->makeClientWithUser();
        $budget = Budget::create(['client_id' => $client->id, 'code' => 'Scap 1']);
        $courseId = $this->makeCourse()->id;

        $this->postJson("/api/budgets/{$budget->id}/quotes", [
            'course_id' => $courseId,
            'student_count' => 5,
            'value_uf' => '10.0000',
            'seq_in_budget' => 99,
        ])->assertCreated()->assertJsonPath('seq_in_budget', 1);

        $this->postJson("/api/budgets/{$budget->id}/quotes", [
            'course_id' => $courseId,
            'student_count' => 5,
            'value_uf' => '10.0000',
        ])->assertCreated()->assertJsonPath('seq_in_budget', 2);
    }
}
```

> A rota de criação é aninhada — `POST /api/budgets/{budget}/quotes`
> (`Commercial/routes.php:32`); o `apiResource('quotes')` (`:35`) só declara `show`, `update` e
> `destroy`.

- [ ] **Step 2: Run test to verify it fails**

Run: `docker compose exec -T app php artisan test --filter=SeqInBudgetNaoEMassAssignmentTest`
Expected: FAIL em `test_seq_in_budget_nao_e_mass_assignable`
(`Failed asserting that an array does not contain 'seq_in_budget'`). O segundo já passa — hoje a
Action sobrescreve o valor do payload, e o teste existe para isso não regredir.

- [ ] **Step 3: Write minimal implementation**

Em `Quote.php`, remova `'seq_in_budget',` do `$fillable` e documente no lugar, seguindo o precedente
de `archived_with_parent` (`:54`):

```php
    // FORA do `$fillable`: `seq_in_budget` é derivado sob lock na
    // CreateQuoteAction (ADR-17). Payload que chega com o número não pode
    // vencer a derivação — mesmo arranjo do `version` do template de
    // certificado. `$auditInclude` mantém o campo: sair do fillable não tira
    // da auditoria.
```

Em `CreateQuoteAction.php`, troque o `Quote::create([...])` por atribuição explícita:

```php
            $quote = new Quote;
            $quote->budget_id = $budget->id;
            $quote->course_id = $data->course_id;
            $quote->seq_in_budget = $seq;
            $quote->student_count = $data->student_count;
            $quote->value_uf = $data->value_uf;
            $quote->purchase_order = $data->purchase_order instanceof Optional ? null : $data->purchase_order;
            $quote->planned_start_date = $data->planned_start_date instanceof Optional ? null : $data->planned_start_date;
            $quote->planned_end_date = $data->planned_end_date instanceof Optional ? null : $data->planned_end_date;
            $quote->status = QuoteStatus::Pending;
            $quote->save();

            return $quote;
```

> `Create*Action` **não** é caso da D-13: não há valor anterior a apagar, então o `? null :` fica.

- [ ] **Step 4: Consertar os testes que criavam Quote por mass assignment**

`Quote::create([... 'seq_in_budget' => N ...])` passa a gravar `null` e estoura no NOT NULL. A troca
é `create` → `forceCreate`, que é o idiom da casa para escrever campo fora do `$fillable` em teste
(mesmo motivo do `forceFill` em `LastLoginProjectionTest:27`).

Ache os sítios e troque:

```bash
cd /home/jvbat/projetos/lotus/backend
grep -rln "seq_in_budget" tests/
grep -rn "Quote::create(" tests/ app/
sed -i 's/Quote::create(/Quote::forceCreate(/g' $(grep -rl "seq_in_budget" tests/)
grep -rn "Quote::create(" tests/ app/   # deve sobrar SÓ o que não escreve seq
```

- [ ] **Step 5: Run test to verify it passes**

Run: `docker compose exec -T app php artisan test --filter=SeqInBudgetNaoEMassAssignmentTest`
Run: `docker compose exec -T app php artisan test tests/Feature/Comercial`
Run: `docker compose exec -T app php artisan test tests/Feature/Operation`
Expected: PASS nos três. `tests/Feature/Operation` entra porque turma nasce de cotação aprovada.

- [ ] **Step 6: Pint e commit**

```bash
cd backend && ./vendor/bin/pint app/Domains/Commercial/Models/Quote.php app/Domains/Commercial/Actions/CreateQuoteAction.php tests/Feature/Comercial
cd /home/jvbat/projetos/lotus
git add backend/app/Domains/Commercial backend/tests
git commit -m "fix(comercial): seq_in_budget sai do fillable e e escrito pela Action"
```

---

### Task 9: prova de fechamento do bloco

**Files:**
- Modify: nenhum, salvo o que a própria verificação reprovar.

**Interfaces:**
- Consumes: tudo das Tasks 1-8.
- Produces: a evidência que o DoD da spec exige.

- [ ] **Step 1: Suíte inteira**

Run: `docker compose exec -T app php artisan test`
Expected: PASS. Se estourar `memory_limit` (P-50), rode por diretório —
`tests/Feature/Identity`, `tests/Feature/Cadastros`, `tests/Feature/Comercial`,
`tests/Feature/Operation`, `tests/Feature/Certification`, `tests/Feature/Dashboard`,
`tests/Feature/Shared` — e registre no commit de fechamento que foi assim.

- [ ] **Step 2: Pint no diff do bloco**

```bash
cd /home/jvbat/projetos/lotus/backend
./vendor/bin/pint $(git diff main...HEAD --name-only -- 'backend/**/*.php' | sed 's|^backend/||')
```
Expected: `PASS` sem arquivo reformatado. NUNCA rode `pint` sem argumento.

- [ ] **Step 3: `generated.ts` inalterado**

```bash
docker compose exec -T app php artisan typescript:transform
cd /home/jvbat/projetos/lotus && git status --short frontend/src/shared/types/generated.ts
```
Expected: saída vazia. `missing` é regra, não tipo — se houver diff, PARE e reporte antes de commitar
(lei §5.3: não se edita à mão, e diff inesperado significa que o contrato mudou sem decisão).

- [ ] **Step 4: DoD item a item, contra a spec**

Confirme, com o nome do teste que prova cada um:
1. omissão preserva nos 10 campos — `OmissaoPreservaStaffTest`, `OmissaoPreservaRedatorEAlunoTest`,
   `OmissaoPreservaClienteECursoTest`, `OmissaoPreservaCotacaoTest`;
2. `rut` omitido no staff mantém o RUT — `OmissaoPreservaStaffTest::test_put_sem_rut_mantem_o_rut_guardado`;
3. `photo_url` no corpo é 422, inclusive `null` — `ChaveComputadaNoCorpoTest`;
4. colisão de índice é 422 com o campo — `ColisaoDeIndiceVira422Test`;
5. `seq_in_budget` do payload não vence a derivação — `SeqInBudgetNaoEMassAssignmentTest`.

- [ ] **Step 5: Commit de fechamento**

```bash
git add -A
git commit -m "test(bd14): prova do DoD do bloco de contrato de entrada"
```

---

## Handoff de execução

**executor: claude**

As Tasks 2-7 decidem contrato de entrada e mensagem de erro — julgamento fora do plano, e a Task 7
mexe na porta única de identidade, que nove caminhos de escrita atravessam.

A **Task 8, Step 4** (a varredura `Quote::create` → `Quote::forceCreate` nos arquivos de teste) é
mecânica, com verificação executável e paths fechados; se for delegada ao Codex, os
`paths_autorizados` são:

```
backend/tests/Feature/Comercial/**
backend/tests/Feature/Operation/**
```
