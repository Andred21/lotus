# Arquivados e restauração de soft-delete — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** dar caminho de volta ao soft-delete de `Client` e `Course` — restaurar o agregado e exatamente os filhos que a cascata arquivou —, com visão de Arquivados, autor e data, e o botão de arquivar que hoje não existe na UI.

**Architecture:** o arquivamento já existe em hooks `deleting` instância a instância, transacionados e auditados. Este plano adiciona a coluna `archived_with_parent` que dá identidade à cascata, os hooks `restored` que a consomem, duas Actions transacionais, quatro endpoints por domínio, duas permissões e a alternância Ativos/Arquivados na própria tabela.

**Tech Stack:** Laravel 13 / PHP 8.3 · spatie/laravel-data + typescript-transformer · spatie/laravel-permission · owen-it/laravel-auditing · React 19 + TS · TanStack Query · PrimeReact via `shared/ui` · vitest/jsdom · PHPUnit (sqlite `:memory:`)

**Spec:** `docs/superpowers/specs/2026-08-18-arquivados-e-restauracao-design.md`
**Context Packet:** `docs/superpowers/context-packets/2026-08-18-arquivados-e-restauracao.md`

## Global Constraints

- **Backend roda no container.** `docker compose exec -T app php artisan ...`. O host WSL não tem mbstring.
- **Pint roda no host, de dentro de `backend/`, SEMPRE com argumentos:** `cd backend && ./vendor/bin/pint <arquivos>`. Nunca sem argumento — reformata o repo inteiro.
- **`generated.ts` não se edita à mão** (ADR-04). Corrige-se o DTO e roda `php artisan typescript:transform`.
- **Features não importam PrimeReact direto** (só via `shared/ui`) **nem outra feature — nem para tipo** (ADR-05).
- **`shared/ui` não importa `shared/hooks` nem `shared/api`** em nenhuma direção. O que a moldura precisa chega como prop estrutural ou `ReactNode`.
- **Auditoria só na aplicação** (ADR-08). Soft-delete e restore pelo *builder* não auditam — por isso tudo é instância a instância.
- **`archived_with_parent` fica FORA do `$fillable`** em todos os models. Quem escreve é hook, nunca payload.
- **Nenhuma `ValidationException` nova neste bloco.** Registro ativo no restore resolve como **404** pelo binding. Isto mantém o bloco fora da **D-07** (idioma canônico de mensagem, travado em decisão do João).
- **`backend/config/cors.php` está modificado no working tree e NÃO é deste bloco.** Fica fora de todo `git add`; os commits usam paths exatos.
- **Copy nova em 3 locales:** `es-CL`, `pt-BR`, `en`.

## Correção de mecanismo em relação à spec

A spec (D2/D3) diz hook **`restoring`**. O plano usa **`restored`**, e a razão é ordem: `restoring` roda com o pai ainda soft-deletado, então os filhos voltariam a ativos sob um pai arquivado. `restored` roda com o pai já ativo. O par correto é **`deleting` (antes) / `restored` (depois)** — os filhos saem antes do pai e voltam depois dele. Nada mais da spec muda.

---

## File Structure

**Backend**

| Arquivo | Responsabilidade |
|---|---|
| `database/migrations/2026_08_18_000001_add_archived_with_parent_columns.php` | coluna boolean em 5 tabelas |
| `app/Domains/Commercial/Models/Client.php` | marca no `deleting`, restaura no `restored`, `lockRow` extraído |
| `app/Domains/Commercial/Models/ClientAddress.php`, `ClientContact.php` | cast boolean |
| `app/Domains/Identity/Models/User.php` | cast boolean |
| `app/Domains/Catalog/Models/Course.php` | marca no `deleting`, restaura no `restored` |
| `app/Domains/Catalog/Models/CourseModule.php`, `CourseCertificateTemplate.php` | cast boolean |
| `app/Domains/Commercial/Actions/RestoreClientAction.php` | restore transacional sob lock |
| `app/Domains/Catalog/Actions/RestoreCourseAction.php` | restore transacional |
| `app/Shared/Audit/ArchiveTrailQuery.php` | leitura em lote da última audit `deleted` |
| `app/Domains/Commercial/Data/ArchivedClientData.php` | DTO por composição |
| `app/Domains/Catalog/Data/ArchivedCourseData.php` | DTO por composição |
| `app/Domains/Identity/Support/PermissionCatalog.php` | 2 permissões novas |
| `database/seeders/RolePermissionSeeder.php` | concessão a admin |
| `app/Domains/{Commercial,Catalog}/Http/Controllers/` | `archived` + `restore` |
| `app/Domains/{Commercial,Catalog}/routes.php` | 2 rotas cada, `archived` ANTES do `apiResource` |

**Frontend**

| Arquivo | Responsabilidade |
|---|---|
| `src/shared/api/crud.ts` | `archived()` e `restore(id)` |
| `src/shared/api/createCrudResource.ts` | `useArchivedList()`, `useRestore()`, 2º parâmetro de tipo |
| `src/shared/api/{clientsApi,coursesApi}.ts` | declaram o tipo arquivado |
| `src/shared/hooks/useArchivedPage.ts` | modo, lista, restore, achatamento |
| `src/shared/ui/ArchiveSwitch/` | segmentado Ativos/Arquivados |
| `src/shared/ui/SearchableTableFrame/SearchableTableFrame.tsx` | prop `viewSwitch` |
| `src/features/commercial/hooks/useClientsArchived.ts` | alias de página |
| `src/features/commercial/components/Client/ClientsTable.tsx` | colunas, Arquivar, Restaurar |
| `src/features/commercial/components/CommercialPage.tsx` | fiação do modo |
| `src/features/catalog/hooks/useCoursesArchived.ts` | alias de página |
| `src/features/catalog/components/Course/CoursesTable.tsx` | colunas, Arquivar, Restaurar |
| `src/features/catalog/components/CatalogPage.tsx` | fiação do modo |
| `src/shared/config/locales/{es-CL,pt-BR,en}.json` | chaves `archive.*` |

---

### Task 1: Coluna marcadora e a marcação na cascata

**Files:**
- Create: `backend/database/migrations/2026_08_18_000001_add_archived_with_parent_columns.php`
- Modify: `backend/app/Domains/Commercial/Models/Client.php:39-55`
- Modify: `backend/app/Domains/Catalog/Models/Course.php:39-47`
- Modify: `backend/app/Domains/Commercial/Models/ClientAddress.php`, `ClientContact.php`, `backend/app/Domains/Identity/Models/User.php`, `backend/app/Domains/Catalog/Models/CourseModule.php`, `CourseCertificateTemplate.php` (só `$casts`)
- Test: `backend/tests/Feature/Cadastros/ArchiveCascadeMarkTest.php`

**Interfaces:**
- Consumes: nada.
- Produces: coluna `archived_with_parent` (boolean, default `false`) em `client_addresses`, `client_contacts`, `users`, `course_modules`, `course_certificate_templates`. Invariante: `true` **somente** em filho arquivado pela cascata do pai.

- [ ] **Step 1: Write the failing test**

```php
<?php

namespace Tests\Feature\Cadastros;

use App\Domains\Catalog\Models\Course;
use App\Domains\Commercial\Models\Client;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\CreatesDomainRecords;
use Tests\TestCase;

/**
 * A coluna marcadora dá IDENTIDADE à cascata. Sem ela, restaurar o pai não
 * consegue distinguir o filho que a cascata arquivou do filho que já estava
 * arquivado antes — e `deleted_at` é `timestamp` de precisão 0, então empatar
 * por segundo não é identidade (spec D2).
 */
class ArchiveCascadeMarkTest extends TestCase
{
    use CreatesDomainRecords;
    use RefreshDatabase;

    public function test_cascata_do_cliente_marca_so_os_filhos_que_ela_arquiva(): void
    {
        $client = $this->makeClientWithUser(['legal_name' => 'Switch Chile Ltda']);

        $antigo = $client->contacts()->create(['name' => 'Antigo', 'email' => 'a@s.cl', 'is_primary' => false]);
        $vivo = $client->contacts()->create(['name' => 'Vivo', 'email' => 'v@s.cl', 'is_primary' => true]);
        $endereco = $client->addresses()->create(['commune' => 'Providencia', 'city' => 'Santiago', 'region' => 'RM', 'is_primary' => true]);

        // Arquivado ANTES do pai, por vontade própria: a cascata não pode marcá-lo.
        $antigo->delete();

        $client->delete();

        $this->assertDatabaseHas('client_contacts', ['id' => $antigo->id, 'archived_with_parent' => false]);
        $this->assertDatabaseHas('client_contacts', ['id' => $vivo->id, 'archived_with_parent' => true]);
        $this->assertDatabaseHas('client_addresses', ['id' => $endereco->id, 'archived_with_parent' => true]);
        $this->assertDatabaseHas('users', ['id' => $client->user_id, 'archived_with_parent' => true]);
    }

    public function test_cascata_do_curso_marca_so_os_filhos_que_ela_arquiva(): void
    {
        $course = $this->makeCourse(['name' => 'Alta Tensión']);

        $antigo = $course->certificateTemplates()->create(['version' => 1, 'body' => 'v1']);
        $vivo = $course->certificateTemplates()->create(['version' => 2, 'body' => 'v2']);
        $modulo = $course->modules()->create(['name' => 'Módulo 1', 'order' => 1]);

        $antigo->delete();

        $course->delete();

        $this->assertDatabaseHas('course_certificate_templates', ['id' => $antigo->id, 'archived_with_parent' => false]);
        $this->assertDatabaseHas('course_certificate_templates', ['id' => $vivo->id, 'archived_with_parent' => true]);
        $this->assertDatabaseHas('course_modules', ['id' => $modulo->id, 'archived_with_parent' => true]);
    }

    public function test_filho_arquivado_sozinho_nunca_e_marcado(): void
    {
        $client = $this->makeClientWithUser();
        $contato = $client->contacts()->create(['name' => 'Solo', 'email' => 's@s.cl', 'is_primary' => true]);

        $contato->delete();

        $this->assertDatabaseHas('client_contacts', ['id' => $contato->id, 'archived_with_parent' => false]);
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `docker compose exec -T app php artisan test --filter=ArchiveCascadeMarkTest`
Expected: FAIL — `SQLSTATE ... no such column: archived_with_parent`

- [ ] **Step 3: Write the migration**

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Identidade da cascata de arquivamento (spec D2). SEM índice de propósito: a
 * coluna só é lida dentro de relação já escopada por FK (`$client->contacts()`),
 * e o índice de `client_id` que já existe faz o trabalho.
 */
return new class extends Migration
{
    private const TABLES = [
        'client_addresses',
        'client_contacts',
        'users',
        'course_modules',
        'course_certificate_templates',
    ];

    public function up(): void
    {
        foreach (self::TABLES as $table) {
            Schema::table($table, function (Blueprint $t) {
                $t->boolean('archived_with_parent')->default(false);
            });
        }
    }

    public function down(): void
    {
        foreach (self::TABLES as $table) {
            Schema::table($table, function (Blueprint $t) {
                $t->dropColumn('archived_with_parent');
            });
        }
    }
};
```

- [ ] **Step 4: Add the cast to the five child models**

Em `ClientAddress`, `ClientContact`, `User`, `CourseModule` e `CourseCertificateTemplate`, adicione a chave ao array devolvido por `casts()` (ou ao `$casts`, conforme o que o model já usa):

```php
'archived_with_parent' => 'boolean',
```

**NÃO adicione a `$fillable`.** Quem escreve é hook, nunca payload — atribuível em massa daria a qualquer `update` o poder de mentir sobre a origem do arquivamento.

- [ ] **Step 5: Mark in the Client cascade**

Substitua o corpo do `static::deleting` em `Client::booted()`:

```php
static::deleting(function (Client $client) {
    if (! $client->isForceDeleting()) {
        // Instância a instância: soft-delete pelo builder não audita.
        //
        // ENUMERA-E-APAGA: sem transação e sem mutex isto é check-then-act
        // — um contato criado depois do `get()` sobrevive ATIVO sob um
        // cliente arquivado. Quem fecha a janela é a `DeleteClientAction`,
        // que abre a transação e toma `Client::lockForWrite()` antes de
        // chamar `$client->delete()`. Não arquive cliente por fora dela.
        //
        // `markAndDelete` grava a marca com `saveQuietly()` ANTES do delete:
        // `SoftDeletes::runSoftDelete()` só persiste `deleted_at`/`updated_at`,
        // então um atributo sujo não chegaria ao banco pelo `delete()`. O
        // `saveQuietly` não emite evento, e por isso não polui a trilha com um
        // `updated` por filho — o evento que importa é o `deleted`, que o
        // `delete()` logo abaixo audita normalmente (ADR-08).
        $client->addresses()->get()->each(fn (ClientAddress $a) => self::markAndDelete($a));
        $client->contacts()->get()->each(fn (ClientContact $c) => self::markAndDelete($c));

        if ($client->user !== null) {
            self::markAndDelete($client->user);
        }
    }
});
```

E adicione o helper ao mesmo model:

```php
/** Marca o filho como cascateado e o arquiva. Ver a nota no `deleting`. */
private static function markAndDelete(Model $child): void
{
    $child->archived_with_parent = true;
    $child->saveQuietly();
    $child->delete();
}
```

`Model` vem de `Illuminate\Database\Eloquent\Model` — adicione o `use`.

- [ ] **Step 6: Mark in the Course cascade**

Em `Course::booted()`, mesma forma:

```php
static::deleting(function (Course $course) {
    if (! $course->isForceDeleting()) {
        // Instância a instância: soft-delete pelo builder não audita.
        // `markAndDelete` grava a marca com `saveQuietly()` antes do delete —
        // ver a nota gêmea em `Client::booted()`.
        $course->certificateTemplates()->get()->each(fn (CourseCertificateTemplate $t) => self::markAndDelete($t));
        $course->modules()->get()->each(fn (CourseModule $m) => self::markAndDelete($m));
    }
});

/** Marca o filho como cascateado e o arquiva. Ver a nota no `deleting`. */
private static function markAndDelete(Model $child): void
{
    $child->archived_with_parent = true;
    $child->saveQuietly();
    $child->delete();
}
```

- [ ] **Step 7: Run the test to verify it passes**

Run: `docker compose exec -T app php artisan test --filter=ArchiveCascadeMarkTest`
Expected: PASS — 3 testes

- [ ] **Step 8: Run the full suite to prove nothing regressed**

Run: `docker compose exec -T app php artisan test`
Expected: PASS. A cascata mudou de forma e é exercida por `ClientModelTest`, `ClientNestedTest`, `CourseModelTest` e `CourseTemplateTest` — se alguma quebrar, o defeito é do Step 5/6, não do teste.

- [ ] **Step 9: Format and commit**

```bash
cd backend && ./vendor/bin/pint app/Domains/Commercial/Models/Client.php app/Domains/Catalog/Models/Course.php app/Domains/Commercial/Models/ClientAddress.php app/Domains/Commercial/Models/ClientContact.php app/Domains/Identity/Models/User.php app/Domains/Catalog/Models/CourseModule.php app/Domains/Catalog/Models/CourseCertificateTemplate.php database/migrations/2026_08_18_000001_add_archived_with_parent_columns.php
cd .. && git add backend/database/migrations/2026_08_18_000001_add_archived_with_parent_columns.php backend/app/Domains/Commercial/Models/Client.php backend/app/Domains/Catalog/Models/Course.php backend/app/Domains/Commercial/Models/ClientAddress.php backend/app/Domains/Commercial/Models/ClientContact.php backend/app/Domains/Identity/Models/User.php backend/app/Domains/Catalog/Models/CourseModule.php backend/app/Domains/Catalog/Models/CourseCertificateTemplate.php backend/tests/Feature/Cadastros/ArchiveCascadeMarkTest.php
git commit -m "feat(archive): coluna archived_with_parent da identidade a cascata"
```

---

### Task 2: Restore em cascata

**Files:**
- Modify: `backend/app/Domains/Commercial/Models/Client.php` (hook `restored`, `lockRow` extraído)
- Modify: `backend/app/Domains/Catalog/Models/Course.php` (hook `restored`)
- Create: `backend/app/Domains/Commercial/Actions/RestoreClientAction.php`
- Create: `backend/app/Domains/Catalog/Actions/RestoreCourseAction.php`
- Test: `backend/tests/Feature/Cadastros/RestoreCascadeTest.php`

**Interfaces:**
- Consumes: `archived_with_parent` da Task 1.
- Produces: `RestoreClientAction::execute(Client $client): Client` e `RestoreCourseAction::execute(Course $course): Course`, ambas idempotentes sobre registro já ativo. `Client::lockRow(int $clientId): static` — trava a linha `withTrashed()` sem julgar estado.

- [ ] **Step 1: Write the failing test**

```php
<?php

namespace Tests\Feature\Cadastros;

use App\Domains\Catalog\Actions\RestoreCourseAction;
use App\Domains\Commercial\Actions\RestoreClientAction;
use App\Domains\Commercial\Models\Client;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\CreatesDomainRecords;
use Tests\TestCase;

/**
 * O teste que PROVA a spec D2. Sem ele o bloco é indistinguível de
 * "restaura todos os filhos arquivados", que ressuscita em silêncio o filho
 * arquivado de propósito antes do pai.
 */
class RestoreCascadeTest extends TestCase
{
    use CreatesDomainRecords;
    use RefreshDatabase;

    public function test_restaurar_cliente_traz_so_os_filhos_da_cascata(): void
    {
        $client = $this->makeClientWithUser(['legal_name' => 'Switch Chile Ltda']);

        $antigo = $client->contacts()->create(['name' => 'Antigo', 'email' => 'a@s.cl', 'is_primary' => false]);
        $vivo = $client->contacts()->create(['name' => 'Vivo', 'email' => 'v@s.cl', 'is_primary' => true]);
        $endereco = $client->addresses()->create(['commune' => 'Providencia', 'city' => 'Santiago', 'region' => 'RM', 'is_primary' => true]);

        $antigo->delete();
        $client->delete();

        app(RestoreClientAction::class)->execute($client);

        $this->assertNull(Client::withTrashed()->find($client->id)->deleted_at);

        // Voltou: arquivado PELA cascata.
        $this->assertDatabaseHas('client_contacts', ['id' => $vivo->id, 'deleted_at' => null, 'archived_with_parent' => false]);
        $this->assertDatabaseHas('client_addresses', ['id' => $endereco->id, 'deleted_at' => null, 'archived_with_parent' => false]);
        $this->assertDatabaseHas('users', ['id' => $client->user_id, 'deleted_at' => null, 'archived_with_parent' => false]);

        // NÃO voltou: já estava arquivado antes.
        $this->assertNotNull($antigo->fresh()->deleted_at);
    }

    public function test_restaurar_curso_traz_so_os_filhos_da_cascata(): void
    {
        $course = $this->makeCourse(['name' => 'Alta Tensión']);

        $antigo = $course->certificateTemplates()->create(['version' => 1, 'body' => 'v1']);
        $vivo = $course->certificateTemplates()->create(['version' => 2, 'body' => 'v2']);
        $modulo = $course->modules()->create(['name' => 'Módulo 1', 'order' => 1]);

        $antigo->delete();
        $course->delete();

        app(RestoreCourseAction::class)->execute($course);

        $this->assertDatabaseHas('course_certificate_templates', ['id' => $vivo->id, 'deleted_at' => null, 'archived_with_parent' => false]);
        $this->assertDatabaseHas('course_modules', ['id' => $modulo->id, 'deleted_at' => null, 'archived_with_parent' => false]);
        $this->assertNotNull($antigo->fresh()->deleted_at);
    }

    public function test_restaurar_registro_ativo_e_no_op_e_nao_lanca(): void
    {
        // A rota resolve por `onlyTrashed()`, então o caso normal é 404. Isto
        // cobre a CORRIDA: alguém restaurou entre o binding e o lock. Restore é
        // idempotente por natureza — no-op, não erro, e sem mensagem nova
        // (que abriria a D-07).
        $client = $this->makeClientWithUser();

        app(RestoreClientAction::class)->execute($client);

        $this->assertNull($client->fresh()->deleted_at);
    }

    public function test_restore_e_auditado_no_pai_e_em_cada_filho(): void
    {
        $client = $this->makeClientWithUser();
        $contato = $client->contacts()->create(['name' => 'Vivo', 'email' => 'v@s.cl', 'is_primary' => true]);

        $client->delete();
        app(RestoreClientAction::class)->execute($client);

        $this->assertDatabaseHas('audits', [
            'auditable_type' => Client::class,
            'auditable_id' => $client->id,
            'event' => 'restored',
        ]);
        $this->assertDatabaseHas('audits', [
            'auditable_type' => \App\Domains\Commercial\Models\ClientContact::class,
            'auditable_id' => $contato->id,
            'event' => 'restored',
        ]);
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `docker compose exec -T app php artisan test --filter=RestoreCascadeTest`
Expected: FAIL — `Target class [App\Domains\Commercial\Actions\RestoreClientAction] does not exist.`

- [ ] **Step 3: Extract `lockRow` from `lockForWrite`**

`Client::lockForWrite()` **recusa cliente arquivado** — é o comportamento certo para escrita e o errado para restore. Separe a trava do julgamento, em `Client.php`:

```php
/**
 * Trava a linha SEM julgar estado. `withTrashed()` porque o lock tem de ser
 * tomado mesmo sobre cliente arquivado: pular a linha faria a operação seguir
 * SEM mutex nenhum.
 *
 * No-op SILENCIOSO em sqlite (`SQLiteGrammar::compileLock()` devolve `''`).
 * Quem prova que ele funciona é `PrimaryConcurrencyTest`, em MySQL.
 */
public static function lockRow(int $clientId): static
{
    /** @var static $client */
    $client = static::withTrashed()->whereKey($clientId)->lockForUpdate()->firstOrFail();

    return $client;
}
```

E reescreva `lockForWrite` sobre ela, preservando o doc block existente e a guarda:

```php
public static function lockForWrite(int $clientId): static
{
    $client = static::lockRow($clientId);

    if ($client->trashed()) {
        throw ValidationException::withMessages([
            'client' => 'Este cliente foi arquivado e não aceita mais alterações.',
        ]);
    }

    return $client;
}
```

- [ ] **Step 4: Add the `restored` hook to Client**

Dentro de `Client::booted()`, depois do `static::deleting`:

```php
static::restored(function (Client $client) {
    // `restored`, não `restoring`: com `restoring` os filhos voltariam a
    // ativos enquanto o PAI ainda está arquivado. O par correto é
    // `deleting` (antes) / `restored` (depois) — os filhos saem antes do pai
    // e voltam depois dele.
    //
    // `onlyTrashed()` + a marca: só volta quem ESTA cascata arquivou. Filho
    // arquivado por vontade própria antes do pai não tem a marca e fica onde
    // está (spec D2).
    $client->addresses()->onlyTrashed()->where('archived_with_parent', true)->get()
        ->each(fn (ClientAddress $a) => self::restoreAndUnmark($a));
    $client->contacts()->onlyTrashed()->where('archived_with_parent', true)->get()
        ->each(fn (ClientContact $c) => self::restoreAndUnmark($c));

    $user = $client->user()->first();
    if ($user !== null && $user->trashed() && $user->archived_with_parent) {
        self::restoreAndUnmark($user);
    }
});
```

E o helper gêmeo do `markAndDelete`:

```php
/**
 * Restaura o filho e apaga a marca. `restore()` audita (ADR-08); o
 * `saveQuietly()` que limpa a marca não emite evento, pela mesma razão do
 * `markAndDelete`: o evento que importa é o `restored`.
 */
private static function restoreAndUnmark(Model $child): void
{
    $child->restore();
    $child->archived_with_parent = false;
    $child->saveQuietly();
}
```

- [ ] **Step 5: Add the `restored` hook to Course**

Dentro de `Course::booted()`:

```php
static::restored(function (Course $course) {
    // Ver a nota gêmea em `Client::booted()`: `restored` e não `restoring`,
    // e só o filho que ESTA cascata arquivou.
    $course->certificateTemplates()->onlyTrashed()->where('archived_with_parent', true)->get()
        ->each(fn (CourseCertificateTemplate $t) => self::restoreAndUnmark($t));
    $course->modules()->onlyTrashed()->where('archived_with_parent', true)->get()
        ->each(fn (CourseModule $m) => self::restoreAndUnmark($m));
});

/** Restaura o filho e apaga a marca. Ver a nota gêmea em `Client`. */
private static function restoreAndUnmark(Model $child): void
{
    $child->restore();
    $child->archived_with_parent = false;
    $child->saveQuietly();
}
```

- [ ] **Step 6: Write `RestoreClientAction`**

```php
<?php

namespace App\Domains\Commercial\Actions;

use App\Domains\Commercial\Models\Client;
use Illuminate\Support\Facades\DB;

/**
 * Restaura o cliente e, pelo hook `restored` do model, os filhos que a cascata
 * de arquivamento marcou.
 *
 * Simétrica da `DeleteClientAction`, e pelo mesmo motivo: o
 * enumera-e-restaura tem a mesma janela de check-then-act do enumera-e-apaga.
 * A trava é `lockRow`, não `lockForWrite` — esta recusa cliente arquivado, que
 * é exatamente o estado de quem vai ser restaurado.
 */
class RestoreClientAction
{
    public function execute(Client $client): Client
    {
        return DB::transaction(function () use ($client) {
            $locked = Client::lockRow($client->id);

            // No-op idempotente: a rota resolve por `onlyTrashed()`, então
            // chegar aqui com registro ativo significa que alguém restaurou
            // entre o binding e o lock. Restaurar duas vezes não é erro.
            if (! $locked->trashed()) {
                return $locked->loadListingData();
            }

            $locked->restore();

            return $locked->loadListingData();
        });
    }
}
```

- [ ] **Step 7: Write `RestoreCourseAction`**

```php
<?php

namespace App\Domains\Catalog\Actions;

use App\Domains\Catalog\Models\Course;
use Illuminate\Support\Facades\DB;

/**
 * Restaura o curso e, pelo hook `restored` do model, os filhos que a cascata
 * marcou.
 *
 * SEM lock, e isto é simétrico e deliberado: `Course` não tem mutex no lado do
 * delete tampouco. Dar um só ao restore criaria a ilusão de proteção sobre uma
 * janela que continua aberta no arquivamento. A assimetria com `Client` é do
 * código que já existe, não deste bloco.
 */
class RestoreCourseAction
{
    public function execute(Course $course): Course
    {
        return DB::transaction(function () use ($course) {
            if (! $course->trashed()) {
                return $course->loadListingData();
            }

            $course->restore();

            return $course->loadListingData();
        });
    }
}
```

- [ ] **Step 8: Run the test to verify it passes**

Run: `docker compose exec -T app php artisan test --filter=RestoreCascadeTest`
Expected: PASS — 4 testes

- [ ] **Step 9: Run the full suite**

Run: `docker compose exec -T app php artisan test`
Expected: PASS

- [ ] **Step 10: Format and commit**

```bash
cd backend && ./vendor/bin/pint app/Domains/Commercial/Models/Client.php app/Domains/Catalog/Models/Course.php app/Domains/Commercial/Actions/RestoreClientAction.php app/Domains/Catalog/Actions/RestoreCourseAction.php
cd .. && git add backend/app/Domains/Commercial/Models/Client.php backend/app/Domains/Catalog/Models/Course.php backend/app/Domains/Commercial/Actions/RestoreClientAction.php backend/app/Domains/Catalog/Actions/RestoreCourseAction.php backend/tests/Feature/Cadastros/RestoreCascadeTest.php
git commit -m "feat(archive): restore em cascata restaura so o que a cascata arquivou"
```

---

### Task 3: Permissões `*.restore`

**Files:**
- Modify: `backend/app/Domains/Identity/Support/PermissionCatalog.php:36-67`
- Test: `backend/tests/Feature/Identity/RestorePermissionTest.php`

**Interfaces:**
- Consumes: nada.
- Produces: permissões `commercial.client.restore` e `catalog.course.restore`, concedidas a `admin` e `superadmin`, **fora** de `SEGREGATED`.

- [ ] **Step 1: Write the failing test**

```php
<?php

namespace Tests\Feature\Identity;

use App\Domains\Identity\Support\PermissionCatalog;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class RestorePermissionTest extends TestCase
{
    use RefreshDatabase;

    public function test_catalogo_expoe_as_permissoes_de_restore(): void
    {
        $nomes = array_keys(PermissionCatalog::descriptions());

        $this->assertContains('commercial.client.restore', $nomes);
        $this->assertContains('catalog.course.restore', $nomes);
    }

    public function test_admin_e_superadmin_recebem_restore(): void
    {
        $this->seed(RolePermissionSeeder::class);

        foreach (['admin', 'superadmin'] as $nome) {
            $role = Role::findByName($nome, 'web');
            $this->assertTrue($role->hasPermissionTo('commercial.client.restore'), "$nome sem client.restore");
            $this->assertTrue($role->hasPermissionTo('catalog.course.restore'), "$nome sem course.restore");
        }
    }

    public function test_restore_nao_e_segregada(): void
    {
        // Segregar tiraria o restore do admin e o prenderia ao superadmin. A
        // decisão do João foi o contrário: admin restaura (spec D6).
        $this->assertNotContains('commercial.client.restore', PermissionCatalog::SEGREGATED);
        $this->assertNotContains('catalog.course.restore', PermissionCatalog::SEGREGATED);
    }

    public function test_redator_nao_recebe_restore(): void
    {
        $this->seed(RolePermissionSeeder::class);

        $role = Role::findByName('redator', 'web');
        $this->assertFalse($role->hasPermissionTo('commercial.client.restore'));
        $this->assertFalse($role->hasPermissionTo('catalog.course.restore'));
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `docker compose exec -T app php artisan test --filter=RestorePermissionTest`
Expected: FAIL — `Failed asserting that an array contains 'commercial.client.restore'`

- [ ] **Step 3: Add the two permissions to the catalog**

Em `PermissionCatalog::descriptions()`, imediatamente depois de cada `*.delete` correspondente:

```php
'commercial.client.delete' => 'Remover clientes',
'commercial.client.restore' => 'Restaurar clientes arquivados',
```

```php
'catalog.course.delete' => 'Remover cursos',
'catalog.course.restore' => 'Restaurar cursos arquivados',
```

**Nada muda no `RolePermissionSeeder`:** `superadminPermissions()` devolve `array_keys` do catálogo inteiro, e `adminPermissions()` devolve tudo menos as quatro exceções nomeadas. As duas permissões novas entram nos dois papéis sozinhas. O `redator` tem lista fixa e não as recebe.

- [ ] **Step 4: Run the test to verify it passes**

Run: `docker compose exec -T app php artisan test --filter=RestorePermissionTest`
Expected: PASS — 4 testes

- [ ] **Step 5: Run the permission-catalog suite**

Run: `docker compose exec -T app php artisan test --filter=Permission`
Expected: PASS. Testes de contagem de catálogo, se existirem, quebram aqui — o número de permissões subiu de 2.

- [ ] **Step 6: Format and commit**

```bash
cd backend && ./vendor/bin/pint app/Domains/Identity/Support/PermissionCatalog.php
cd .. && git add backend/app/Domains/Identity/Support/PermissionCatalog.php backend/tests/Feature/Identity/RestorePermissionTest.php
git commit -m "feat(rbac): permissoes commercial.client.restore e catalog.course.restore"
```

---

### Task 4: `ArchiveTrailQuery` — o primeiro caminho de leitura de `audits`

**Files:**
- Create: `backend/app/Shared/Audit/ArchiveTrailQuery.php`
- Test: `backend/tests/Feature/Shared/ArchiveTrailQueryTest.php`

**Interfaces:**
- Consumes: tabela `audits` (`user_type`, `user_id`, `event`, `auditable_type`, `auditable_id`, `created_at`).
- Produces: `ArchiveTrailQuery::archivedBy(string $auditableType, array $ids): array` — mapa `id => nome do autor|null`. Ids sem audit `deleted` **não aparecem** no mapa.

- [ ] **Step 1: Write the failing test**

```php
<?php

namespace Tests\Feature\Shared;

use App\Domains\Commercial\Models\Client;
use App\Domains\Identity\Models\User;
use App\Shared\Audit\ArchiveTrailQuery;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\CreatesDomainRecords;
use Tests\TestCase;

class ArchiveTrailQueryTest extends TestCase
{
    use CreatesDomainRecords;
    use RefreshDatabase;

    public function test_devolve_o_autor_da_ultima_audit_deleted(): void
    {
        $autor = $this->actingAsAdmin();
        $autor->update(['name' => 'Ana Torres']);

        $client = $this->makeClientWithUser();
        $client->delete();

        $mapa = ArchiveTrailQuery::archivedBy(Client::class, [$client->id]);

        $this->assertSame('Ana Torres', $mapa[$client->id]);
    }

    public function test_id_sem_audit_deleted_nao_aparece_no_mapa(): void
    {
        $this->actingAsAdmin();
        $client = $this->makeClientWithUser();

        // Nunca foi arquivado: não há audit `deleted`.
        $mapa = ArchiveTrailQuery::archivedBy(Client::class, [$client->id]);

        $this->assertArrayNotHasKey($client->id, $mapa);
    }

    public function test_autor_nulo_quando_a_audit_nao_tem_usuario(): void
    {
        // Arquivado sem sessão (seeder, console): a audit existe, o autor não.
        $client = $this->makeClientWithUser();
        $client->delete();

        $mapa = ArchiveTrailQuery::archivedBy(Client::class, [$client->id]);

        $this->assertArrayHasKey($client->id, $mapa);
        $this->assertNull($mapa[$client->id]);
    }

    public function test_le_varios_ids_de_uma_vez(): void
    {
        $autor = $this->actingAsAdmin();
        $autor->update(['name' => 'Ana Torres']);

        $a = $this->makeClientWithUser(['legal_name' => 'A']);
        $b = $this->makeClientWithUser(['legal_name' => 'B']);
        $a->delete();
        $b->delete();

        $mapa = ArchiveTrailQuery::archivedBy(Client::class, [$a->id, $b->id]);

        $this->assertSame('Ana Torres', $mapa[$a->id]);
        $this->assertSame('Ana Torres', $mapa[$b->id]);
    }

    public function test_lista_de_ids_vazia_nao_consulta_e_devolve_vazio(): void
    {
        $this->assertSame([], ArchiveTrailQuery::archivedBy(Client::class, []));
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `docker compose exec -T app php artisan test --filter=ArchiveTrailQueryTest`
Expected: FAIL — `Class "App\Shared\Audit\ArchiveTrailQuery" not found`

- [ ] **Step 3: Write the query**

```php
<?php

namespace App\Shared\Audit;

use Illuminate\Support\Facades\DB;

/**
 * PRIMEIRO caminho de LEITURA de `audits` no projeto — a tabela era write-only,
 * com 16 models `Auditable`. Serve a coluna "arquivado por" da visão de
 * Arquivados (spec D7).
 *
 * Em lote de propósito: uma listagem de N arquivados faria N consultas se a
 * assinatura fosse por instância. Se a tabela crescer, o índice a olhar é
 * `(auditable_type, auditable_id, event)`.
 *
 * NÃO substitui a auditoria nem a reinterpreta: lê o que o `owen-it` já grava
 * (ADR-08), sem trigger de banco (lei §2).
 */
class ArchiveTrailQuery
{
    /**
     * Autor da última audit `deleted` de cada id.
     *
     * @param  array<int>  $ids
     * @return array<int, string|null>  id => nome, ou `null` quando a audit não
     *                                  tem usuário (seeder, console). Id sem
     *                                  audit `deleted` NÃO aparece no mapa.
     */
    public static function archivedBy(string $auditableType, array $ids): array
    {
        if ($ids === []) {
            return [];
        }

        $ultimas = DB::table('audits')
            ->selectRaw('auditable_id, MAX(id) as audit_id')
            ->where('auditable_type', $auditableType)
            ->where('event', 'deleted')
            ->whereIn('auditable_id', $ids)
            ->groupBy('auditable_id');

        $linhas = DB::table('audits')
            ->joinSub($ultimas, 'ultimas', fn ($join) => $join->on('audits.id', '=', 'ultimas.audit_id'))
            ->leftJoin('users', 'users.id', '=', 'audits.user_id')
            ->get(['audits.auditable_id', 'users.name']);

        $mapa = [];
        foreach ($linhas as $linha) {
            $mapa[(int) $linha->auditable_id] = $linha->name;
        }

        return $mapa;
    }
}
```

`MAX(id)` e não `MAX(created_at)`: `created_at` é `timestamp` de segundo inteiro e dois `deleted` no mesmo segundo empatariam. O id é monotônico.

- [ ] **Step 4: Run the test to verify it passes**

Run: `docker compose exec -T app php artisan test --filter=ArchiveTrailQueryTest`
Expected: PASS — 5 testes

- [ ] **Step 5: Format and commit**

```bash
cd backend && ./vendor/bin/pint app/Shared/Audit/ArchiveTrailQuery.php
cd .. && git add backend/app/Shared/Audit/ArchiveTrailQuery.php backend/tests/Feature/Shared/ArchiveTrailQueryTest.php
git commit -m "feat(audit): ArchiveTrailQuery le o autor do arquivamento em lote"
```

---

### Task 5: Endpoints de `Client`

**Files:**
- Create: `backend/app/Domains/Commercial/Data/ArchivedClientData.php`
- Modify: `backend/app/Domains/Commercial/Http/Controllers/ClientController.php`
- Modify: `backend/app/Domains/Commercial/routes.php:14`
- Test: `backend/tests/Feature/Cadastros/ClientArchiveEndpointTest.php`

**Interfaces:**
- Consumes: `RestoreClientAction` (Task 2), `ArchiveTrailQuery::archivedBy` (Task 4), permissão `commercial.client.restore` (Task 3).
- Produces: `GET /api/clients/archived` → `array<ArchivedClientData>`; `POST /api/clients/{client}/restore` → `ClientData`. DTO `ArchivedClientData { ClientData $client, string $archived_at, ?string $archived_by }`.

- [ ] **Step 1: Write the failing test**

```php
<?php

namespace Tests\Feature\Cadastros;

use App\Domains\Identity\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\CreatesDomainRecords;
use Tests\TestCase;

class ClientArchiveEndpointTest extends TestCase
{
    use CreatesDomainRecords;
    use RefreshDatabase;

    public function test_listagem_de_arquivados_nao_vaza_ativo_e_traz_data_e_autor(): void
    {
        $autor = $this->actingAsAdmin();
        $autor->update(['name' => 'Ana Torres']);

        $ativo = $this->makeClientWithUser(['legal_name' => 'Vivo Ltda']);
        $arquivado = $this->makeClientWithUser(['legal_name' => 'Arquivado Ltda']);
        $arquivado->delete();

        $this->getJson('/api/clients/archived')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.client.id', $arquivado->id)
            ->assertJsonPath('0.client.legal_name', 'Arquivado Ltda')
            ->assertJsonPath('0.archived_by', 'Ana Torres');

        $this->getJson('/api/clients')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.id', $ativo->id);
    }

    public function test_archived_by_e_nulo_sem_audit_de_usuario(): void
    {
        $arquivado = $this->makeClientWithUser(['legal_name' => 'Sem Autor']);
        $arquivado->delete();

        $this->actingAsAdmin();

        $this->getJson('/api/clients/archived')
            ->assertOk()
            ->assertJsonPath('0.archived_by', null);
    }

    public function test_restaura_e_devolve_o_cliente(): void
    {
        $this->actingAsAdmin();
        $client = $this->makeClientWithUser(['legal_name' => 'Volta Ltda']);
        $client->delete();

        $this->postJson("/api/clients/{$client->id}/restore")
            ->assertOk()
            ->assertJsonPath('legal_name', 'Volta Ltda');

        $this->assertNull($client->fresh()->deleted_at);
    }

    public function test_restaurar_cliente_ativo_da_404(): void
    {
        // O binding resolve por `onlyTrashed()`: ativo não existe para esta rota.
        $this->actingAsAdmin();
        $client = $this->makeClientWithUser();

        $this->postJson("/api/clients/{$client->id}/restore")->assertNotFound();
    }

    public function test_sem_a_permissao_de_restore_da_403(): void
    {
        $this->seed(RolePermissionSeeder::class);

        $user = User::factory()->create(['type' => 'admin', 'is_active' => true]);
        $user->givePermissionTo('commercial.client.view');
        $this->actingAs($user, 'web');

        $client = $this->makeClientWithUser();
        $client->delete();

        // Vê a lista (tem a `view`)...
        $this->getJson('/api/clients/archived')->assertOk();
        // ...mas não restaura.
        $this->postJson("/api/clients/{$client->id}/restore")->assertForbidden();
    }

    public function test_archived_exige_a_permissao_de_view(): void
    {
        $this->seed(RolePermissionSeeder::class);

        $user = User::factory()->redator()->create(['is_active' => true]);
        $user->assignRole('redator');
        $this->actingAs($user, 'web');

        $this->getJson('/api/clients/archived')->assertForbidden();
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `docker compose exec -T app php artisan test --filter=ClientArchiveEndpointTest`
Expected: FAIL — 404 em `/api/clients/archived` (a rota não existe)

- [ ] **Step 3: Write `ArchivedClientData`**

```php
<?php

namespace App\Domains\Commercial\Data;

use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * Composição, não extensão: `ClientData` NÃO muda, então o contrato da listagem
 * ativa fica intacto e nenhum campo anulável de arquivamento o polui (spec D8).
 */
#[TypeScript]
class ArchivedClientData extends Data
{
    public function __construct(
        public ClientData $client,
        public string $archived_at,
        /** `null` quando a audit `deleted` não tem usuário (seeder, console). */
        public ?string $archived_by,
    ) {}
}
```

- [ ] **Step 4: Add `archived` and `restore` to the controller**

Em `ClientController`, adicione ao array de `middleware()`:

```php
new Middleware('permission:commercial.client.view', only: ['index', 'show', 'archived']),
new Middleware('permission:commercial.client.restore', only: ['restore']),
```

A primeira linha **substitui** a que hoje diz `only: ['index', 'show']`.

E os dois métodos:

```php
/** @return array<ArchivedClientData> */
public function archived(): array
{
    $clients = Client::onlyTrashed()->withListingData()->get();

    $autores = ArchiveTrailQuery::archivedBy(Client::class, $clients->pluck('id')->all());

    return $clients
        ->map(fn (Client $c) => new ArchivedClientData(
            client: ClientData::fromModel($c),
            archived_at: $c->deleted_at->toIso8601String(),
            archived_by: $autores[$c->id] ?? null,
        ))
        ->all();
}

public function restore(int $client, RestoreClientAction $action): ClientData
{
    // Resolvido à mão, não por binding: o binding padrão aplica o global scope
    // de SoftDeletes e nunca acharia um arquivado. `onlyTrashed()` também dá o
    // 404 de graça sobre registro ATIVO, que é o comportamento da spec D5.
    $model = Client::onlyTrashed()->whereKey($client)->firstOrFail();

    return ClientData::fromModel($action->execute($model));
}
```

Adicione os `use` de `ArchivedClientData`, `RestoreClientAction` e `App\Shared\Audit\ArchiveTrailQuery`.

- [ ] **Step 5: Declare the routes BEFORE the apiResource**

Em `Commercial/routes.php`, dentro do grupo `auth:sanctum`, **acima** da linha `Route::apiResource('clients', ClientController::class);`:

```php
// ANTES do apiResource, senão `clients/archived` casa como `clients/{client}`.
Route::get('clients/archived', [ClientController::class, 'archived']);
Route::post('clients/{client}/restore', [ClientController::class, 'restore']);
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `docker compose exec -T app php artisan test --filter=ClientArchiveEndpointTest`
Expected: PASS — 6 testes

- [ ] **Step 7: Prove the route order with `route:list`**

Run: `docker compose exec -T app php artisan route:list --path=clients`
Expected: `api/clients/archived` aparece ANTES de `api/clients/{client}` na saída.

- [ ] **Step 8: Format and commit**

```bash
cd backend && ./vendor/bin/pint app/Domains/Commercial/Data/ArchivedClientData.php app/Domains/Commercial/Http/Controllers/ClientController.php app/Domains/Commercial/routes.php
cd .. && git add backend/app/Domains/Commercial/Data/ArchivedClientData.php backend/app/Domains/Commercial/Http/Controllers/ClientController.php backend/app/Domains/Commercial/routes.php backend/tests/Feature/Cadastros/ClientArchiveEndpointTest.php
git commit -m "feat(archive): GET /clients/archived e POST /clients/{client}/restore"
```

---

### Task 6: Endpoints de `Course` e regeneração dos tipos

**Files:**
- Create: `backend/app/Domains/Catalog/Data/ArchivedCourseData.php`
- Modify: `backend/app/Domains/Catalog/Http/Controllers/CourseController.php`
- Modify: `backend/app/Domains/Catalog/routes.php`
- Modify: `frontend/src/shared/types/generated.ts` (gerado, nunca à mão)
- Test: `backend/tests/Feature/Cadastros/CourseArchiveEndpointTest.php`

**Interfaces:**
- Consumes: `RestoreCourseAction` (Task 2), `ArchiveTrailQuery::archivedBy` (Task 4), permissão `catalog.course.restore` (Task 3).
- Produces: `GET /api/courses/archived` → `array<ArchivedCourseData>`; `POST /api/courses/{course}/restore` → `CourseData`. Tipos TS `ArchivedClientData` e `ArchivedCourseData` em `generated.ts`.

- [ ] **Step 1: Write the failing test**

```php
<?php

namespace Tests\Feature\Cadastros;

use App\Domains\Identity\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\CreatesDomainRecords;
use Tests\TestCase;

class CourseArchiveEndpointTest extends TestCase
{
    use CreatesDomainRecords;
    use RefreshDatabase;

    public function test_listagem_de_arquivados_nao_vaza_ativo_e_traz_data_e_autor(): void
    {
        $autor = $this->actingAsAdmin();
        $autor->update(['name' => 'Ana Torres']);

        $ativo = $this->makeCourse(['name' => 'Vivo']);
        $arquivado = $this->makeCourse(['name' => 'Arquivado']);
        $arquivado->delete();

        $this->getJson('/api/courses/archived')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.course.id', $arquivado->id)
            ->assertJsonPath('0.course.name', 'Arquivado')
            ->assertJsonPath('0.archived_by', 'Ana Torres');

        $this->getJson('/api/courses')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.id', $ativo->id);
    }

    public function test_restaura_e_devolve_o_curso(): void
    {
        $this->actingAsAdmin();
        $course = $this->makeCourse(['name' => 'Volta']);
        $course->delete();

        $this->postJson("/api/courses/{$course->id}/restore")
            ->assertOk()
            ->assertJsonPath('name', 'Volta');

        $this->assertNull($course->fresh()->deleted_at);
    }

    public function test_restaurar_curso_ativo_da_404(): void
    {
        $this->actingAsAdmin();
        $course = $this->makeCourse();

        $this->postJson("/api/courses/{$course->id}/restore")->assertNotFound();
    }

    public function test_sem_a_permissao_de_restore_da_403(): void
    {
        $this->seed(RolePermissionSeeder::class);

        $user = User::factory()->create(['type' => 'admin', 'is_active' => true]);
        $user->givePermissionTo('catalog.course.view');
        $this->actingAs($user, 'web');

        $course = $this->makeCourse();
        $course->delete();

        $this->getJson('/api/courses/archived')->assertOk();
        $this->postJson("/api/courses/{$course->id}/restore")->assertForbidden();
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `docker compose exec -T app php artisan test --filter=CourseArchiveEndpointTest`
Expected: FAIL — 404 em `/api/courses/archived`

- [ ] **Step 3: Write `ArchivedCourseData`**

```php
<?php

namespace App\Domains\Catalog\Data;

use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * Composição, não extensão: `CourseData` NÃO muda (spec D8). Gêmeo de
 * `ArchivedClientData`.
 */
#[TypeScript]
class ArchivedCourseData extends Data
{
    public function __construct(
        public CourseData $course,
        public string $archived_at,
        /** `null` quando a audit `deleted` não tem usuário (seeder, console). */
        public ?string $archived_by,
    ) {}
}
```

- [ ] **Step 4: Add `archived` and `restore` to `CourseController`**

Adicione ao `middleware()` do controller as duas entradas (a primeira substitui a de `view` existente, acrescentando `archived` à lista de `only`):

```php
new Middleware('permission:catalog.course.view', only: ['index', 'show', 'archived']),
new Middleware('permission:catalog.course.restore', only: ['restore']),
```

E os métodos:

```php
/** @return array<ArchivedCourseData> */
public function archived(): array
{
    $courses = Course::onlyTrashed()->withListingData()->get();

    $autores = ArchiveTrailQuery::archivedBy(Course::class, $courses->pluck('id')->all());

    return $courses
        ->map(fn (Course $c) => new ArchivedCourseData(
            course: CourseData::fromModel($c),
            archived_at: $c->deleted_at->toIso8601String(),
            archived_by: $autores[$c->id] ?? null,
        ))
        ->all();
}

public function restore(int $course, RestoreCourseAction $action): CourseData
{
    // Ver a nota gêmea em `ClientController::restore`: `onlyTrashed()` à mão,
    // porque o binding padrão nunca acha um arquivado — e dá o 404 sobre ativo.
    $model = Course::onlyTrashed()->whereKey($course)->firstOrFail();

    return CourseData::fromModel($action->execute($model));
}
```

`withListingData()` existe no builder de `Course` e é o que o `index` do próprio controller usa
(`Course::query()->withListingData()`), então `Course::onlyTrashed()->withListingData()` é o mesmo
caminho de carga — não crie um segundo.

- [ ] **Step 5: Declare the routes BEFORE the apiResource**

Em `Catalog/routes.php`, **acima** da declaração de `courses`:

```php
// ANTES do apiResource, senão `courses/archived` casa como `courses/{course}`.
Route::get('courses/archived', [CourseController::class, 'archived']);
Route::post('courses/{course}/restore', [CourseController::class, 'restore']);
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `docker compose exec -T app php artisan test --filter=CourseArchiveEndpointTest`
Expected: PASS — 4 testes

- [ ] **Step 7: Regenerate the TypeScript types**

Run: `docker compose exec -T app php artisan typescript:transform`
Expected: `frontend/src/shared/types/generated.ts` ganha `ArchivedClientData` e `ArchivedCourseData`.

Verifique que **`ClientData` e `CourseData` não mudaram**:

Run: `git diff frontend/src/shared/types/generated.ts`
Expected: só adições. Qualquer alteração em `ClientData`/`CourseData` contraria a spec D8 — pare e investigue o DTO.

- [ ] **Step 8: Run the full suite and the frontend type-check**

Run: `docker compose exec -T app php artisan test`
Expected: PASS

Run: `cd frontend && pnpm build`
Expected: PASS (`tsc -b` verde com os tipos novos)

- [ ] **Step 9: Format and commit**

```bash
cd backend && ./vendor/bin/pint app/Domains/Catalog/Data/ArchivedCourseData.php app/Domains/Catalog/Http/Controllers/CourseController.php app/Domains/Catalog/routes.php
cd .. && git add backend/app/Domains/Catalog/Data/ArchivedCourseData.php backend/app/Domains/Catalog/Http/Controllers/CourseController.php backend/app/Domains/Catalog/routes.php backend/tests/Feature/Cadastros/CourseArchiveEndpointTest.php frontend/src/shared/types/generated.ts
git commit -m "feat(archive): endpoints de course e regeneracao dos tipos"
```

---

### Task 7: Camada de dados do frontend

**Files:**
- Modify: `frontend/src/shared/api/crud.ts`
- Modify: `frontend/src/shared/api/createCrudResource.ts`
- Modify: `frontend/src/shared/api/clientsApi.ts`, `coursesApi.ts`
- Create: `frontend/src/shared/hooks/useArchivedPage.ts`
- Modify: `frontend/src/shared/hooks/index.ts`
- Test: `frontend/src/shared/hooks/useArchivedPage.test.ts`, `frontend/src/shared/api/createCrudResource.test.ts`

**Interfaces:**
- Consumes: `ArchivedClientData` / `ArchivedCourseData` de `generated.ts` (Task 6).
- Produces: `createCrudResource<T, TArchived = T>` com `useArchivedList(enabled: boolean)` e `useRestore()`. `useArchivedPage(resource)` devolve `{ mode, setMode, items, loading, error, refetch, restore, restoring }`, onde `items` é `TArchived` **achatado** para `T & { archived_at, archived_by }`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useArchivedPage } from './useArchivedPage'
import type { ProblemDetails } from '@shared/api/axios'

interface Item {
  id?: number
  name: string
}
interface Archived {
  client: Item
  archived_at: string
  archived_by: string | null
}

/** Estrutural, como `useCrudPage.test.ts`: sem TanStack no teste. */
function fakeResource(state: {
  data?: Archived[]
  isLoading?: boolean
  isError?: boolean
  error?: ProblemDetails | null
  onEnabled?: (enabled: boolean) => void
  onRestore?: (id: number) => void
}) {
  return {
    useArchivedList: (enabled: boolean) => {
      state.onEnabled?.(enabled)
      return {
        data: state.data,
        isLoading: state.isLoading ?? false,
        isError: state.isError ?? false,
        error: state.error ?? null,
        refetch: () => Promise.resolve(),
      }
    },
    useRestore: () => ({
      mutate: (id: number) => state.onRestore?.(id),
      isPending: false,
    }),
  }
}

describe('useArchivedPage', () => {
  it('não busca em modo active e busca ao trocar para archived (D10)', () => {
    // A lição da D-04: buscar as duas visões na montagem dobra a rede sem ganho.
    const enabled: boolean[] = []
    const { result } = renderHook(() =>
      useArchivedPage(fakeResource({ data: [], onEnabled: (e) => enabled.push(e) })),
    )

    expect(result.current.mode).toBe('active')
    expect(enabled.at(-1)).toBe(false)

    act(() => result.current.setMode('archived'))

    expect(enabled.at(-1)).toBe(true)
  })

  it('achata o DTO composto para uma forma só', () => {
    // A tabela não pode ter duas formas: o achatamento vive aqui, não na tela.
    const { result } = renderHook(() =>
      useArchivedPage(
        fakeResource({
          data: [{ client: { id: 7, name: 'Switch' }, archived_at: '2026-08-18T10:00:00-03:00', archived_by: 'Ana Torres' }],
        }),
      ),
    )

    act(() => result.current.setMode('archived'))

    expect(result.current.items).toEqual([
      { id: 7, name: 'Switch', archived_at: '2026-08-18T10:00:00-03:00', archived_by: 'Ana Torres' },
    ])
  })

  it('distingue lista vazia de GET falho', () => {
    const vazio = renderHook(() => useArchivedPage(fakeResource({ data: [] })))
    expect(vazio.result.current.items).toEqual([])
    expect(vazio.result.current.error).toBeNull()

    const falho = renderHook(() => useArchivedPage(fakeResource({ isError: true, error: { detail: 'boom' } as ProblemDetails })))
    expect(falho.result.current.error?.detail).toBe('boom')
  })

  it('restore repassa o id', () => {
    const onRestore = vi.fn()
    const { result } = renderHook(() => useArchivedPage(fakeResource({ data: [], onRestore })))

    act(() => result.current.restore(7))

    expect(onRestore).toHaveBeenCalledWith(7)
  })

  it('refetch devolve a promise (Q-14)', () => {
    const { result } = renderHook(() => useArchivedPage(fakeResource({ data: [] })))

    expect(result.current.refetch()).toBeInstanceOf(Promise)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && pnpm test -- useArchivedPage`
Expected: FAIL — `Failed to resolve import "./useArchivedPage"`

- [ ] **Step 3: Add the two endpoints to `crud.ts`**

No objeto devolvido por `crudEndpoints<T>`, adicione um 2º parâmetro de tipo e as duas funções:

```ts
export function crudEndpoints<T, TArchived = T>(resource: string) {
  const base = `/api/${resource}`

  return {
    list: () => api.get<T[]>(base).then((r) => r.data),
    get: (id: number | string) => api.get<T>(`${base}/${id}`).then((r) => r.data),
    create: (payload: unknown) => api.post<T>(base, payload).then((r) => r.data),
    update: (id: number | string, payload: unknown) =>
      api.put<T>(`${base}/${id}`, payload).then((r) => r.data),
    remove: (id: number | string) => api.delete(`${base}/${id}`).then(() => undefined),
    archived: () => api.get<TArchived[]>(`${base}/archived`).then((r) => r.data),
    restore: (id: number | string) => api.post<T>(`${base}/${id}/restore`).then((r) => r.data),
  }
}
```

- [ ] **Step 4: Add the two hooks to `createCrudResource.ts`**

```ts
export function createCrudResource<T, TArchived = T>(resource: string) {
  const keys = {
    all: [resource] as const,
    lists: () => [resource, 'list'] as const,
    archived: () => [resource, 'archived'] as const,
    detail: (id: number | string) => [resource, 'detail', id] as const,
  }
  const endpoints = crudEndpoints<T, TArchived>(resource)
```

e, junto dos demais hooks:

```ts
  /**
   * `enabled` é PARÂMETRO, não default: a visão de arquivados não pode buscar
   * na montagem. É a lição medida na D-04 — carregar as duas visões de uma vez
   * dobra a rede sem ganho nenhum.
   */
  function useArchivedList(enabled: boolean) {
    return useQuery<TArchived[], ProblemDetails>({
      queryKey: keys.archived(),
      queryFn: endpoints.archived,
      enabled,
    })
  }

  /**
   * Invalida `keys.all`, que é `[resource]` e cobre a lista ativa E a de
   * arquivados. `useRemove` já invalida o mesmo, então arquivar atualiza a
   * lista de arquivados sem código novo.
   */
  function useRestore() {
    const qc = useQueryClient()
    return useMutation<T, ProblemDetails, number | string>({
      mutationFn: (id) => endpoints.restore(id),
      onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
    })
  }

  return { keys, endpoints, useList, useOne, useCreate, useUpdate, useRemove, useArchivedList, useRestore }
}
```

- [ ] **Step 5: Declare the archived type in the two resources**

`clientsApi.ts`:

```ts
import type { ClientData, ArchivedClientData } from '@shared/types/generated'

export const clientsApi = createCrudResource<ClientData, ArchivedClientData>('clients')
```

`coursesApi.ts`: o mesmo par com `CourseData` e `ArchivedCourseData`.

- [ ] **Step 6: Write `useArchivedPage`**

```ts
import { useMemo, useState } from 'react'
import type { ProblemDetails } from '@shared/api/axios'

export type ArchiveMode = 'active' | 'archived'

/** Contrato mínimo, tipado por estrutura — o hook não depende da fábrica
 * inteira, mesmo molde do `ListableResource` de `useCrudPage`. */
interface ArchivableResource<TArchived> {
  useArchivedList: (enabled: boolean) => {
    data?: TArchived[]
    isLoading: boolean
    isError: boolean
    error: ProblemDetails | null
    refetch: () => Promise<unknown>
  }
  useRestore: () => {
    mutate: (id: number) => void
    isPending: boolean
  }
}

/**
 * Estado da visão de Arquivados: o modo, a lista e o restore.
 *
 * O ACHATAMENTO vive aqui de propósito. O backend devolve o DTO composto
 * (`{ client, archived_at, archived_by }`) porque `ClientData` não muda (spec
 * D8); a tabela, porém, não pode ter duas formas. Achatar na tela obrigaria
 * cada tabela a repetir a mesma desestruturação.
 */
export function useArchivedPage<TArchived extends Record<string, unknown>>(
  resource: ArchivableResource<TArchived>,
) {
  const [mode, setMode] = useState<ArchiveMode>('active')
  const query = resource.useArchivedList(mode === 'archived')
  const restore = resource.useRestore()

  const items = useMemo(() => {
    return (query.data ?? []).map((row) => {
      const { archived_at, archived_by, ...resto } = row
      // A única chave restante é o agregado (`client` ou `course`): o DTO tem
      // exatamente três campos.
      const agregado = Object.values(resto)[0] as Record<string, unknown>

      return { ...agregado, archived_at, archived_by }
    })
  }, [query.data])

  return {
    mode,
    setMode,
    items,
    loading: query.isLoading,
    /** `null` em sucesso, inclusive com lista vazia — vazio não é erro (D16). */
    error: query.isError ? (query.error ?? ({} as ProblemDetails)) : null,
    /** Devolve a promise: o `AppErrorState` a aguarda para manter o Reintentar
     * em `loading` enquanto o GET está em voo (Q-14). */
    refetch: () => query.refetch(),
    restore: (id: number) => restore.mutate(id),
    restoring: restore.isPending,
  }
}
```

- [ ] **Step 7: Export it from the hooks barrel**

Adicione a `frontend/src/shared/hooks/index.ts`:

```ts
export { useArchivedPage } from './useArchivedPage'
export type { ArchiveMode } from './useArchivedPage'
```

- [ ] **Step 8: Prove the invalidation reaches BOTH lists**

O `useRestore` invalida `keys.all`. A afirmação de que isso alcança a lista ativa **e** a de
arquivados é sobre o PREFIXO das chaves, e o fake estrutural do Step 1 não a exercita. Prove-a na
fábrica real, sem TanStack.

Create: `frontend/src/shared/api/createCrudResource.test.ts`

```ts
import { describe, expect, it } from 'vitest'
import { createCrudResource } from './createCrudResource'

describe('createCrudResource keys', () => {
  it('keys.all é prefixo das duas listas, então invalidá-la alcança ambas', () => {
    // `invalidateQueries({ queryKey: keys.all })` casa por PREFIXO. Se a chave
    // de arquivados não começasse por `[resource]`, arquivar e restaurar
    // deixariam a outra visão obsoleta — e o defeito só apareceria na tela.
    const { keys } = createCrudResource<{ id: number }>('clients')

    expect(keys.all).toEqual(['clients'])
    expect(keys.lists().slice(0, keys.all.length)).toEqual([...keys.all])
    expect(keys.archived().slice(0, keys.all.length)).toEqual([...keys.all])
    expect(keys.archived()).not.toEqual(keys.lists())
  })
})
```

Run: `cd frontend && pnpm test -- createCrudResource`
Expected: PASS — 1 teste

- [ ] **Step 9: Run the test to verify it passes**

Run: `cd frontend && pnpm test -- useArchivedPage`
Expected: PASS — 5 testes

- [ ] **Step 10: Run the full frontend gate**

Run: `cd frontend && pnpm test && pnpm lint && pnpm build`
Expected: PASS nos três

- [ ] **Step 11: Commit**

```bash
git add frontend/src/shared/api/crud.ts frontend/src/shared/api/createCrudResource.ts frontend/src/shared/api/createCrudResource.test.ts frontend/src/shared/api/clientsApi.ts frontend/src/shared/api/coursesApi.ts frontend/src/shared/hooks/useArchivedPage.ts frontend/src/shared/hooks/useArchivedPage.test.ts frontend/src/shared/hooks/index.ts
git commit -m "feat(archive): camada de dados de arquivados e restore no frontend"
```

---

### Task 8: `ArchiveSwitch` e a moldura

**Files:**
- Create: `frontend/src/shared/ui/ArchiveSwitch/ArchiveSwitch.tsx`, `index.ts`, `ArchiveSwitch.test.tsx`
- Modify: `frontend/src/shared/ui/index.ts`
- Modify: `frontend/src/shared/ui/SearchableTableFrame/SearchableTableFrame.tsx`
- Modify: `frontend/src/shared/config/locales/es-CL.json`, `pt-BR.json`, `en.json`

**Interfaces:**
- Consumes: `ArchiveMode` de `shared/hooks` — **como tipo estrutural local, NÃO por import.** `shared/ui` não importa `shared/hooks` em nenhuma direção.
- Produces: `<ArchiveSwitch value={mode} onChange={fn} />` — duas props, `value: 'active' | 'archived'` e `onChange: (mode) => void` — e a prop `viewSwitch?: ReactNode` de `SearchableTableFrame`.

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ArchiveSwitch } from './ArchiveSwitch'

describe('ArchiveSwitch', () => {
  it('marca o modo corrente e avisa a troca', async () => {
    const onChange = vi.fn()
    render(<ArchiveSwitch value="active" onChange={onChange} />)

    const arquivados = screen.getByRole('button', { name: /archive\.archived|Archivados|Arquivados|Archived/i })
    await userEvent.click(arquivados)

    expect(onChange).toHaveBeenCalledWith('archived')
  })

  it('não avisa quando clicam no modo que já está ativo', async () => {
    const onChange = vi.fn()
    render(<ArchiveSwitch value="active" onChange={onChange} />)

    const ativos = screen.getByRole('button', { name: /archive\.active|Activos|Ativos|Active/i })
    await userEvent.click(ativos)

    expect(onChange).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && pnpm test -- ArchiveSwitch`
Expected: FAIL — `Failed to resolve import "./ArchiveSwitch"`

- [ ] **Step 3: Write the component**

`frontend/src/shared/ui/ArchiveSwitch/ArchiveSwitch.tsx`:

```tsx
import { useTranslation } from 'react-i18next'
import { AppButton } from '../AppButton'

/** Estrutural de propósito: `shared/ui` NÃO importa `shared/hooks`, em nenhuma
 * direção. O mesmo motivo do `SearchableTableState`. */
type Mode = 'active' | 'archived'

/**
 * Alterna a FONTE DE DADOS da tabela entre ativos e arquivados.
 *
 * Não é filtro, e por isso não entra pelo `filterSlot`: filtro corta as linhas
 * que a moldura já tem, isto troca de onde elas vêm. Confundir os dois quebraria
 * o `clear()` composto (spec D11).
 */
export function ArchiveSwitch({ value, onChange }: { value: Mode; onChange: (mode: Mode) => void }) {
  const { t } = useTranslation()

  return (
    <div className="inline-flex gap-1" role="group">
      <AppButton
        label={t('archive.active')}
        size="small"
        text={value !== 'active'}
        onClick={() => value !== 'active' && onChange('active')}
      />
      <AppButton
        label={t('archive.archived')}
        icon="pi pi-inbox"
        size="small"
        text={value !== 'archived'}
        onClick={() => value !== 'archived' && onChange('archived')}
      />
    </div>
  )
}
```

`frontend/src/shared/ui/ArchiveSwitch/index.ts`:

```ts
export { ArchiveSwitch } from './ArchiveSwitch'
```

E acrescente a linha correspondente a `frontend/src/shared/ui/index.ts`, seguindo a ordem alfabética que o arquivo já usa.

- [ ] **Step 4: Add the `viewSwitch` prop to the frame**

Em `SearchableTableFrameBaseProps<T>`, junto de `actions`:

```ts
  /** Alternância de FONTE de dados (ativos × arquivados). Prop própria, FORA da
   * união `filterSlot`/`onClearFilter`: não é filtro, e tratá-la como um
   * quebraria o `clear()` composto (spec D11). */
  viewSwitch?: ReactNode
```

E renderize-a no `AppCardToolbar`, imediatamente antes de `{actions}`:

```tsx
{viewSwitch}
```

Adicione `viewSwitch` à desestruturação de props do componente.

- [ ] **Step 5: Add the copy to the three locales**

Objeto `archive` de primeiro nível, em `es-CL.json`:

```json
"archive": {
  "active": "Activos",
  "archived": "Archivados",
  "archiveAction": "Archivar",
  "restoreAction": "Restaurar",
  "archivedAt": "Archivado el",
  "archivedBy": "Archivado por",
  "unknownAuthor": "—",
  "confirmArchiveTitle": "¿Archivar este registro?",
  "confirmArchiveBody": "Saldrá de la lista activa. Podrás restaurarlo desde Archivados.",
  "archivedToast": "Registro archivado.",
  "restoredToast": "Registro restaurado.",
  "empty": "No hay registros archivados",
  "emptyHint": "Lo que archives aparecerá aquí y podrás restaurarlo."
}
```

`pt-BR.json`:

```json
"archive": {
  "active": "Ativos",
  "archived": "Arquivados",
  "archiveAction": "Arquivar",
  "restoreAction": "Restaurar",
  "archivedAt": "Arquivado em",
  "archivedBy": "Arquivado por",
  "unknownAuthor": "—",
  "confirmArchiveTitle": "Arquivar este registro?",
  "confirmArchiveBody": "Ele sai da lista ativa. Você poderá restaurá-lo em Arquivados.",
  "archivedToast": "Registro arquivado.",
  "restoredToast": "Registro restaurado.",
  "empty": "Nenhum registro arquivado",
  "emptyHint": "O que você arquivar aparece aqui e pode ser restaurado."
}
```

`en.json`:

```json
"archive": {
  "active": "Active",
  "archived": "Archived",
  "archiveAction": "Archive",
  "restoreAction": "Restore",
  "archivedAt": "Archived on",
  "archivedBy": "Archived by",
  "unknownAuthor": "—",
  "confirmArchiveTitle": "Archive this record?",
  "confirmArchiveBody": "It leaves the active list. You can restore it from Archived.",
  "archivedToast": "Record archived.",
  "restoredToast": "Record restored.",
  "empty": "No archived records",
  "emptyHint": "Anything you archive shows up here and can be restored."
}
```

**Não toque em `budget.confirmDeleteBody` nem em `quote.confirmDeleteBody`.** Para orçamento e cotação, *"Esta acción no se puede deshacer."* é verdade hoje — o restore deles não existe (spec D9).

- [ ] **Step 6: Run the test to verify it passes**

Run: `cd frontend && pnpm test -- ArchiveSwitch`
Expected: PASS — 2 testes

- [ ] **Step 7: Run the full frontend gate**

Run: `cd frontend && pnpm test && pnpm lint && pnpm build`
Expected: PASS nos três

- [ ] **Step 8: Commit**

```bash
git add frontend/src/shared/ui/ArchiveSwitch frontend/src/shared/ui/index.ts frontend/src/shared/ui/SearchableTableFrame/SearchableTableFrame.tsx frontend/src/shared/config/locales/es-CL.json frontend/src/shared/config/locales/pt-BR.json frontend/src/shared/config/locales/en.json
git commit -m "feat(archive): ArchiveSwitch e a prop viewSwitch da moldura"
```

---

### Task 9: Arquivar e restaurar cliente na tela

**Files:**
- Create: `frontend/src/features/commercial/hooks/useClientsArchived.ts`
- Modify: `frontend/src/features/commercial/components/Client/ClientsTable.tsx`
- Modify: `frontend/src/features/commercial/components/CommercialPage.tsx:26-37`

**Interfaces:**
- Consumes: `useArchivedPage` (Task 7), `ArchiveSwitch` e chaves `archive.*` (Task 8), `clientsApi.useRemove` (já existe, hoje sem consumidores).
- Produces: nada consumido por tarefas posteriores.

- [ ] **Step 1: Write the feature alias**

`frontend/src/features/commercial/hooks/useClientsArchived.ts`:

```ts
import { useArchivedPage } from '@shared/hooks'
import { clientsApi } from '@shared/api/clientsApi'

/** Mesma razão do `useClientsPage`: é este arquivo que mantém a query fora do
 * componente. Eliminá-lo moveria `clientsApi` para dentro de `CommercialPage`. */
export function useClientsArchived() {
  return useArchivedPage(clientsApi)
}
```

- [ ] **Step 2: Add the mode, the columns and the two actions to `ClientsTable`**

Acrescente às props:

```ts
  mode: 'active' | 'archived'
  onModeChange: (mode: 'active' | 'archived') => void
  onArchive: (c: ClientData) => void
  onRestore: (c: ClientData) => void
```

Passe a alternância à moldura:

```tsx
viewSwitch={<ArchiveSwitch value={mode} onChange={onModeChange} />}
```

Em modo `archived`, renderize as duas colunas extras e o Restaurar; em `active`, o Arquivar. Ambas as ações sob permissão — esconder botão é conveniência de interface, **a autorização real é do backend** (ADR-07):

```tsx
{mode === 'archived' && (
  <>
    <AppColumn field="archived_at" header={t('archive.archivedAt')}
      body={(row) => new Date(row.archived_at).toLocaleDateString()} />
    <AppColumn field="archived_by" header={t('archive.archivedBy')}
      body={(row) => row.archived_by ?? t('archive.unknownAuthor')} />
    <AppColumn body={(row) => can('commercial.client.restore') ? (
      <AppButton label={t('archive.restoreAction')} icon="pi pi-undo" text size="small"
        onClick={() => onRestore(row)} />
    ) : null} />
  </>
)}

{mode === 'active' && can('commercial.client.delete') && (
  <AppColumn body={(row) => (
    <AppButton label={t('archive.archiveAction')} icon="pi pi-inbox" text size="small"
      onClick={() => onArchive(row)} />
  )} />
)}
```

`can` vem de `usePermissions()` de `@shared/hooks`. O `AppEmptyState` da moldura em modo `archived` usa `archive.empty` / `archive.emptyHint`.

- [ ] **Step 3: Wire it in `CommercialPage`**

```tsx
const clients = useClientsPage()
const clientsArchived = useClientsArchived()
const archiveClient = clientsApi.useRemove()
const [toArchive, setToArchive] = useState<ClientData | null>(null)
```

`ClientsTable` recebe a lista conforme o modo:

```tsx
<ClientsTable
  clients={clientsArchived.mode === 'archived' ? clientsArchived.items : clients.items}
  loading={clientsArchived.mode === 'archived' ? clientsArchived.loading : clients.loading}
  error={clientsArchived.mode === 'archived' ? clientsArchived.error : clients.error}
  onRetry={clientsArchived.mode === 'archived' ? clientsArchived.refetch : clients.refetch}
  mode={clientsArchived.mode}
  onModeChange={clientsArchived.setMode}
  onArchive={setToArchive}
  onRestore={(c) => c.id != null && clientsArchived.restore(c.id)}
  onView={clients.openView}
  actions={
    can('commercial.client.create')
      ? <AppButton variant="brandIcon" label={t('client.new')} icon="pi pi-user-plus" onClick={clients.openCreate} />
      : undefined
  }
/>
```

E o `ConfirmDialog` do arquivar, no mesmo nível dos dialogs que a página já tem:

```tsx
{toArchive && (
  <ConfirmDialog
    visible
    title={t('archive.confirmArchiveTitle')}
    message={t('archive.confirmArchiveBody')}
    confirmLabel={t('archive.archiveAction')}
    severity="danger"
    pending={archiveClient.isPending}
    onConfirm={() => toArchive.id != null && archiveClient.mutate(toArchive.id, { onSuccess: () => setToArchive(null) })}
    onCancel={() => setToArchive(null)}
  />
)}
```

Restaurar **não** pede confirmação: não é destrutivo (spec D9).

- [ ] **Step 4: Run the frontend gate**

Run: `cd frontend && pnpm test && pnpm lint && pnpm build`
Expected: PASS nos três

- [ ] **Step 5: Prove it in the browser**

Suba `pnpm dev` e o stack. Em `/comercial`, na aba Clientes: arquive um cliente → ele sai da lista → alterne para Arquivados → ele aparece com data e autor → Restaurar → volta para Ativos.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/features/commercial/hooks/useClientsArchived.ts frontend/src/features/commercial/components/Client/ClientsTable.tsx frontend/src/features/commercial/components/CommercialPage.tsx
git commit -m "feat(archive): arquivar e restaurar cliente na tela"
```

---

### Task 10: Arquivar e restaurar curso na tela

**Files:**
- Create: `frontend/src/features/catalog/hooks/useCoursesArchived.ts`
- Modify: `frontend/src/features/catalog/components/Course/CoursesTable.tsx`
- Modify: `frontend/src/features/catalog/components/CatalogPage.tsx`

**Interfaces:**
- Consumes: `useArchivedPage` (Task 7), `ArchiveSwitch` e chaves `archive.*` (Task 8), `coursesApi.useRemove`.
- Produces: nada.

- [ ] **Step 1: Write the feature alias**

`frontend/src/features/catalog/hooks/useCoursesArchived.ts`:

```ts
import { useArchivedPage } from '@shared/hooks'
import { coursesApi } from '@shared/api/coursesApi'

/** Mesma razão do `useCoursesPage`: mantém a query fora do componente. */
export function useCoursesArchived() {
  return useArchivedPage(coursesApi)
}
```

- [ ] **Step 2: Add the mode, the columns and the two actions to `CoursesTable`**

Acrescente às props:

```ts
  mode: 'active' | 'archived'
  onModeChange: (mode: 'active' | 'archived') => void
  onArchive: (c: CourseData) => void
  onRestore: (c: CourseData) => void
```

Passe `viewSwitch={<ArchiveSwitch value={mode} onChange={onModeChange} />}` à moldura e renderize as colunas e ações exatamente como na Task 9, trocando as permissões:

```tsx
{mode === 'archived' && (
  <>
    <AppColumn field="archived_at" header={t('archive.archivedAt')}
      body={(row) => new Date(row.archived_at).toLocaleDateString()} />
    <AppColumn field="archived_by" header={t('archive.archivedBy')}
      body={(row) => row.archived_by ?? t('archive.unknownAuthor')} />
    <AppColumn body={(row) => can('catalog.course.restore') ? (
      <AppButton label={t('archive.restoreAction')} icon="pi pi-undo" text size="small"
        onClick={() => onRestore(row)} />
    ) : null} />
  </>
)}

{mode === 'active' && can('catalog.course.delete') && (
  <AppColumn body={(row) => (
    <AppButton label={t('archive.archiveAction')} icon="pi pi-inbox" text size="small"
      onClick={() => onArchive(row)} />
  )} />
)}
```

- [ ] **Step 3: Wire it in `CatalogPage`**

Mesma fiação da Task 9, com `useCoursesArchived()`, `coursesApi.useRemove()` e o `ConfirmDialog` de arquivar. `CatalogPage` não tem abas — a alternância entra na própria `CoursesTable`, que é o único conteúdo da página.

- [ ] **Step 4: Run the frontend gate**

Run: `cd frontend && pnpm test && pnpm lint && pnpm build`
Expected: PASS nos três

- [ ] **Step 5: Prove it in the browser**

Em `/catalogo`: arquive um curso que tenha módulo → alterne para Arquivados → Restaurar → o curso volta **com os módulos**.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/features/catalog/hooks/useCoursesArchived.ts frontend/src/features/catalog/components/Course/CoursesTable.tsx frontend/src/features/catalog/components/CatalogPage.tsx
git commit -m "feat(archive): arquivar e restaurar curso na tela"
```

---

### Task 11: DoD end-to-end

**Files:** nenhum. Esta task **prova**, não implementa.

**Interfaces:**
- Consumes: tudo.
- Produces: o registro do DoD provado.

- [ ] **Step 1: Run the whole backend suite**

Run: `docker compose exec -T app php artisan test`
Expected: PASS

- [ ] **Step 2: Run the whole frontend gate**

Run: `cd frontend && pnpm test && pnpm lint && pnpm build`
Expected: PASS nos três

- [ ] **Step 3: Prove the DoD in the browser, with a client that has a contact archived beforehand**

Este é o roteiro que separa a spec D2 de "restaura todos os filhos". Faça na ordem:

1. Em `/comercial`, abra um cliente com **dois contatos** e um endereço.
2. Arquive **um** dos contatos pela ficha do cliente.
3. Arquive o cliente.
4. A lista ativa não o mostra mais.
5. Alterne para **Arquivados**: ele aparece, com data e com o **seu nome** em "Arquivado por".
6. Restaure.
7. Abra a ficha: o endereço voltou, o contato que estava vivo voltou, e **o contato que você arquivou no passo 2 continua arquivado**.

- [ ] **Step 4: Prove the 403 with a role without the permission**

Com um usuário que tenha `commercial.client.view` mas **não** `commercial.client.restore`: a lista de Arquivados abre e o botão Restaurar não aparece.

- [ ] **Step 5: Record the proof in the state file**

Registre em `docs/superpowers/state.md`, na seção do trabalho ativo, o que foi provado e o que não foi — inclusive qualquer passo que tenha falhado. Build verde isolado não é DoD (lei §8).

- [ ] **Step 6: Commit**

```bash
git add docs/superpowers/state.md
git commit -m "docs(state): DoD do bloco arquivados-e-restauracao provado no navegador"
```

---

## Handoff de execução

**executor: claude**

O bloco não é mecânico. Toca **três leis do §5** e uma pendência:

- **Lei 3** — regenera `generated.ts` (Task 6).
- **Lei 6** — mexe em `shared/ui`, e a prop `viewSwitch` tem de ficar fora da união discriminada por razão de desenho, não de compilação (Task 8).
- **ADR-07/ADR-08** — cria permissões e abre o primeiro caminho de leitura de `audits` (Tasks 3 e 4).
- **P-03** — o bloco roda na **main tree** (`/home/jvbat/projetos/lotus`), por decisão do João na seleção. Não migre para worktree: o stack monta a árvore principal e o teste rodaria contra o código errado.

Além disso, a Task 2 **reescreve `Client::lockForWrite`**, que é mutex de concorrência com história documentada em review (Q-2, Q-5). Extrair errado ali não quebra teste em sqlite — `SQLiteGrammar::compileLock()` devolve string vazia — e só apareceria em produção.
