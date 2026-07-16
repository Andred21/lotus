# Bloco 2 · CR Cliente — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar cargo do contato (`job_title`), garantir no máximo 1 contato principal por cliente na camada de aplicação, e expor complemento/cargo/seleção de principal no `ClientDialog`.

**Architecture:** Coluna nova via migration incremental. A invariante de principal único vive num Domain Service (`PrimaryContactService`) chamado pelos **dois** caminhos de escrita: as Client Actions (replace total dos nested — o caminho da tela) e Actions novas do `ClientContactController` (rotas REST nested, hoje sem tela). A UI usa radio (exclusão mútua) e nunca emite payload inconsistente; o serviço é a rede de segurança da API.

**Tech Stack:** Laravel 13 / PHP 8.3, spatie/laravel-data, owen-it/laravel-auditing, PHPUnit (sqlite `:memory:`), React 19 + TS, PrimeReact via `shared/ui`, i18next.

**Spec:** `docs/superpowers/specs/2026-07-16-bloco2-cr-cliente-design.md` (aprovado 2026-07-16)
**Notion:** CR.1.1, CR.1.2, CR.1.3

## Global Constraints

- **Coluna chama `job_title`, nunca `role`** — `role` já é RBAC (spatie) neste projeto. Desvio do texto literal da CR, decidido no spec.
- **Migration nova** (`Schema::table`), **não** editar `2026_07_06_141820_clients.php`.
- **Auditoria só na aplicação (lei §5.2):** desmarcar principal usa `$model->update([...])` **por instância**. Query builder (`->where(...)->update(...)`) não dispara evento = não audita. Nunca trigger.
- **`generated.ts` é gerado (lei §5.3):** nunca editar à mão; corrige-se o DTO e roda `php artisan typescript:transform`.
- **Features não importam PrimeReact direto (lei §5.6):** só via `shared/ui`.
- **Cliente sem contato principal é estado válido** — o serviço não promove ninguém.
- **`client_addresses.is_primary` está FORA deste bloco.** Não tocar.
- **Não deletar** `ClientContactController` nem as rotas nested (CLAUDE.md §6: dead code alheio se menciona, não se deleta).
- **i18n:** 3 locales (`pt-BR`, `es-CL`, `en`) com chaves **idênticas**; `es-CL` é a referência de rótulo.
- **Backend roda no container:** `docker compose exec -T app php artisan ...`. Pint **sempre com argumento**: `./vendor/bin/pint <arquivos>`.
- **Antes de editar qualquer arquivo:** `git status`; se sujo, `git diff <arquivo>` + Read fresco imediatamente antes. O working tree do João é intocável; `git add` só os caminhos da task.

---

### Task 1: Coluna `job_title` em `client_contacts` (CR.1.1)

**Files:**
- Create: `backend/database/migrations/<timestamp>_add_job_title_to_client_contacts.php`
- Modify: `backend/app/Domains/Commercial/Models/ClientContact.php`
- Modify: `backend/app/Domains/Commercial/Data/ClientContactData.php`
- Modify: `frontend/src/shared/types/generated.ts` (GERADO — via artisan, nunca à mão)
- Modify: `docs/der-fisico.md:27`
- Test: `backend/tests/Feature/Cadastros/SchemaTest.php:24-26`, `backend/tests/Feature/Cadastros/ClientCrudTest.php`

**Interfaces:**
- Consumes: nada (primeira task).
- Produces: coluna `client_contacts.job_title` (string, nullable); `ClientContactData::$job_title` do tipo `string|Optional|null`; tipo TS `ClientContactData.job_title?: string | null`.

- [ ] **Step 1: Write the failing tests**

Em `backend/tests/Feature/Cadastros/SchemaTest.php`, a asserção existente (linhas 24-26) ganha a coluna:

```php
        $this->assertTrue(Schema::hasColumns('client_contacts', [
            'client_id', 'name', 'email', 'phone', 'is_primary', 'job_title',
        ]));
```

Em `backend/tests/Feature/Cadastros/ClientCrudTest.php`, adicione ao final da classe:

```php
    public function test_cargo_do_contato_persiste_no_create_e_volta_na_resposta(): void
    {
        $this->actingAdmin();

        $this->postJson('/api/clients', $this->payload([
            'contacts' => [['name' => 'Parris Barrios', 'email' => 'p@switch.cl', 'job_title' => 'Jefe de Operaciones', 'is_primary' => true]],
        ]))
            ->assertCreated()
            ->assertJsonPath('contacts.0.job_title', 'Jefe de Operaciones');

        $this->assertDatabaseHas('client_contacts', [
            'name' => 'Parris Barrios',
            'job_title' => 'Jefe de Operaciones',
        ]);
    }

    public function test_cargo_do_contato_persiste_no_update(): void
    {
        $this->actingAdmin();
        $id = $this->postJson('/api/clients', $this->payload())->json('id');

        $this->putJson("/api/clients/{$id}", $this->payload([
            'contacts' => [['name' => 'Parris Barrios', 'job_title' => 'Gerente Técnico', 'is_primary' => true]],
        ]))
            ->assertOk()
            ->assertJsonPath('contacts.0.job_title', 'Gerente Técnico');
    }

    public function test_cargo_do_contato_e_opcional(): void
    {
        $this->actingAdmin();

        $this->postJson('/api/clients', $this->payload())
            ->assertCreated()
            ->assertJsonPath('contacts.0.job_title', null);
    }
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
docker compose exec -T app php artisan test --filter=SchemaTest
docker compose exec -T app php artisan test --filter=ClientCrudTest
```

Expected: FAIL. `SchemaTest` falha na asserção `hasColumns` (coluna não existe). Os 3 testes novos do `ClientCrudTest` falham — `job_title` não chega ao banco nem à resposta.

- [ ] **Step 3: Create the migration**

```bash
docker compose exec -T app php artisan make:migration add_job_title_to_client_contacts --table=client_contacts
```

Conteúdo do arquivo gerado (`backend/database/migrations/<timestamp>_add_job_title_to_client_contacts.php`):

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('client_contacts', function (Blueprint $table) {
            // Cargo/área de atuação do contato. `job_title`, não `role`: `role`
            // já é RBAC (spatie) no resto do projeto.
            $table->string('job_title')->nullable()->after('phone');
        });
    }

    public function down(): void
    {
        Schema::table('client_contacts', function (Blueprint $table) {
            $table->dropColumn('job_title');
        });
    }
};
```

- [ ] **Step 4: Model — `$fillable` E `$auditInclude`**

Em `backend/app/Domains/Commercial/Models/ClientContact.php`, os **dois** arrays. Fora do `$auditInclude`, a auditoria não registra a mudança de cargo (peso legal):

```php
    protected $fillable = [
        'client_id',
        'name',
        'email',
        'phone',
        'job_title',
        'is_primary',
    ];

    protected $auditInclude = [
        'client_id',
        'name',
        'email',
        'phone',
        'job_title',
        'is_primary',
    ];
```

- [ ] **Step 5: DTO**

Em `backend/app/Domains/Commercial/Data/ClientContactData.php`, o campo entra com a mesma forma de `email`/`phone` (nullable + Optional na entrada):

```php
#[TypeScript]
class ClientContactData extends Data
{
    public function __construct(
        public int|Optional $id,
        public string $name,
        public string|Optional|null $email,
        public string|Optional|null $phone,
        public string|Optional|null $job_title,
        public bool $is_primary = false,
    ) {}
}
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
docker compose exec -T app php artisan test --filter=SchemaTest
docker compose exec -T app php artisan test --filter=ClientCrudTest
```

Expected: PASS, todos.

- [ ] **Step 7: Regenerate TS types (lei §5.3 — nunca editar à mão)**

```bash
docker compose exec -T app php artisan typescript:transform
git diff --stat frontend/src/shared/types/generated.ts
```

Expected: `ClientContactData` em `generated.ts` ganha `job_title?: string | null`. Se o diff sair vazio ou errado, o problema está no DTO — **não** edite o arquivo gerado.

- [ ] **Step 8: Update `docs/der-fisico.md`**

Linha 27 (`client_contacts`) — a coluna entra em inglês, 1:1 com a migration, na posição em que a migration a coloca (após `phone`):

```
- **client_contacts** — `id PK`, `client_id FK` → clients cascade, `name`, `email` (nullable), `phone` (nullable, 30), `job_title` (nullable, cargo/área do contato — `job_title` e não `role` porque `role` é RBAC), `is_primary` (bool, default false), `deleted_at`. Índice: `is_primary`. 1:N.
```

- [ ] **Step 9: Apply migration to the dev DB and format**

```bash
docker compose exec -T app php artisan migrate
./vendor/bin/pint backend/app/Domains/Commercial/Models/ClientContact.php backend/app/Domains/Commercial/Data/ClientContactData.php backend/database/migrations/*_add_job_title_to_client_contacts.php
```

Expected: `migrate` roda só a migration nova (não é `fresh` — os dados locais ficam).

- [ ] **Step 10: Commit**

```bash
git add backend/database/migrations/*_add_job_title_to_client_contacts.php \
        backend/app/Domains/Commercial/Models/ClientContact.php \
        backend/app/Domains/Commercial/Data/ClientContactData.php \
        backend/tests/Feature/Cadastros/SchemaTest.php \
        backend/tests/Feature/Cadastros/ClientCrudTest.php \
        frontend/src/shared/types/generated.ts \
        docs/der-fisico.md
git commit -m "feat(client): cargo do contato (job_title) em client_contacts

Contratante pediu a área/cargo de atuação do contato. Coluna chama job_title,
não role (Notion CR.1.1): role já é RBAC (spatie) no resto do projeto e
ClientContactData.role conviveria com User->roles. Campo entra no fillable e
no auditInclude — fora do auditInclude o cargo mudaria sem rastro.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: `PrimaryContactService` + caminho replace-total (CR.1.2)

**Files:**
- Create: `backend/app/Domains/Commercial/Services/PrimaryContactService.php`
- Modify: `backend/app/Domains/Commercial/Actions/CreateClientAction.php`
- Modify: `backend/app/Domains/Commercial/Actions/UpdateClientAction.php`
- Test: `backend/tests/Feature/Cadastros/PrimaryContactTest.php` (create)

**Interfaces:**
- Consumes: `ClientContactData::$job_title` e a coluna da Task 1 (não obrigatório para a regra, mas os testes usam o mesmo payload).
- Produces: `PrimaryContactService::ensureSingle(Client $client, ?ClientContact $winner = null): void` — usado pela Task 3.

- [ ] **Step 1: Write the failing test**

Create `backend/tests/Feature/Cadastros/PrimaryContactTest.php`:

```php
<?php

namespace Tests\Feature\Cadastros;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PrimaryContactTest extends TestCase
{
    use RefreshDatabase;

    private function payload(array $contacts): array
    {
        return [
            'name' => 'Switch Chile',
            'rut' => '12.345.678-5',
            'email' => 'info@switch.cl',
            'legal_name' => 'Switch Chile Ltda',
            'type' => 'client',
            'addresses' => [['commune' => 'Providencia', 'city' => 'Santiago', 'region' => 'RM', 'is_primary' => true]],
            'contacts' => $contacts,
        ];
    }

    public function test_create_com_dois_principais_mantem_apenas_o_ultimo(): void
    {
        $this->actingAsAdmin();

        $this->postJson('/api/clients', $this->payload([
            ['name' => 'Contato A', 'is_primary' => true],
            ['name' => 'Contato B', 'is_primary' => true],
        ]))->assertCreated();

        $this->assertDatabaseHas('client_contacts', ['name' => 'Contato A', 'is_primary' => false]);
        $this->assertDatabaseHas('client_contacts', ['name' => 'Contato B', 'is_primary' => true]);
    }

    public function test_update_marcando_b_desmarca_a(): void
    {
        $this->actingAsAdmin();

        $id = $this->postJson('/api/clients', $this->payload([
            ['name' => 'Contato A', 'is_primary' => true],
            ['name' => 'Contato B', 'is_primary' => false],
        ]))->assertCreated()->json('id');

        $this->putJson("/api/clients/{$id}", $this->payload([
            ['name' => 'Contato A', 'is_primary' => false],
            ['name' => 'Contato B', 'is_primary' => true],
        ]))->assertOk();

        $this->assertDatabaseHas('client_contacts', ['name' => 'Contato A', 'is_primary' => false, 'deleted_at' => null]);
        $this->assertDatabaseHas('client_contacts', ['name' => 'Contato B', 'is_primary' => true, 'deleted_at' => null]);
    }

    public function test_cliente_sem_principal_e_valido(): void
    {
        $this->actingAsAdmin();

        $this->postJson('/api/clients', $this->payload([
            ['name' => 'Contato A', 'is_primary' => false],
            ['name' => 'Contato B', 'is_primary' => false],
        ]))->assertCreated();

        // 0 principais é estado válido: o serviço não promove ninguém.
        $this->assertDatabaseHas('client_contacts', ['name' => 'Contato A', 'is_primary' => false]);
        $this->assertDatabaseHas('client_contacts', ['name' => 'Contato B', 'is_primary' => false]);
    }

    public function test_nunca_mais_de_um_principal_com_tres_contatos(): void
    {
        $this->actingAsAdmin();

        $id = $this->postJson('/api/clients', $this->payload([
            ['name' => 'Contato A', 'is_primary' => true],
            ['name' => 'Contato B', 'is_primary' => true],
            ['name' => 'Contato C', 'is_primary' => true],
        ]))->assertCreated()->json('id');

        $this->assertSame(1, \App\Domains\Commercial\Models\ClientContact::where('client_id', $id)
            ->where('is_primary', true)
            ->count());
    }

    public function test_desmarcar_principal_e_auditado(): void
    {
        $this->actingAsAdmin();

        // A auditoria só existe se o unmark passar pelo evento do model. Um
        // ->where(...)->update(...) no query builder gravaria sem rastro (lei §5.2).
        $this->postJson('/api/clients', $this->payload([
            ['name' => 'Contato A', 'is_primary' => true],
            ['name' => 'Contato B', 'is_primary' => true],
        ]))->assertCreated();

        $a = \App\Domains\Commercial\Models\ClientContact::where('name', 'Contato A')->firstOrFail();

        $this->assertDatabaseHas('audits', [
            'auditable_type' => 'client_contact',
            'auditable_id' => $a->id,
            'event' => 'updated',
        ]);
    }
}
```

> **Nota sobre `auditable_type`:** o valor é o alias do morph map, não o FQCN. `'client_contact'` está confirmado em `backend/app/Providers/AppServiceProvider.php:27` (`Relation::enforceMorphMap`, ADR-10).

- [ ] **Step 2: Run test to verify it fails**

```bash
docker compose exec -T app php artisan test --filter=PrimaryContactTest
```

Expected: FAIL. `test_create_com_dois_principais_mantem_apenas_o_ultimo` falha porque hoje os 2 contatos ficam `is_primary = true` — nada garante a unicidade.

- [ ] **Step 3: Write the service**

Create `backend/app/Domains/Commercial/Services/PrimaryContactService.php`:

```php
<?php

namespace App\Domains\Commercial\Services;

use App\Domains\Commercial\Models\Client;
use App\Domains\Commercial\Models\ClientContact;

/**
 * Garante a invariante "no máximo 1 contato principal por cliente" na camada de
 * aplicação, nunca em trigger (ADR-02/ADR-08: trigger enxerga a conexão, não o
 * usuário autenticado — a auditoria perderia o autor).
 * Cliente SEM principal é estado válido: o serviço não promove ninguém.
 */
class PrimaryContactService
{
    /**
     * @param  ClientContact|null  $winner  Contato que deve permanecer principal.
     *                                      Null (ou um contato que não está mais
     *                                      marcado) → vence o último por id, que é
     *                                      o "último marcado" no replace-total.
     */
    public function ensureSingle(Client $client, ?ClientContact $winner = null): void
    {
        $primaries = $client->contacts()
            ->where('is_primary', true)
            ->orderBy('id')
            ->get();

        if ($primaries->count() <= 1) {
            return;
        }

        $keep = $winner !== null && $primaries->contains(fn (ClientContact $c) => $c->is($winner))
            ? $winner
            : $primaries->last();

        // update() por INSTÂNCIA, não pelo query builder: só o evento do model
        // dispara a auditoria (lei §5.2). Um ->where(...)->update(...) aqui
        // desmarcaria o principal sem deixar rastro — peso legal.
        $primaries
            ->reject(fn (ClientContact $c) => $c->is($keep))
            ->each(fn (ClientContact $c) => $c->update(['is_primary' => false]));
    }
}
```

- [ ] **Step 4: Wire into `CreateClientAction`**

Em `backend/app/Domains/Commercial/Actions/CreateClientAction.php` — o construtor ganha o serviço, e a chamada entra **dentro** da transação existente, depois do loop de contatos:

```php
use App\Domains\Commercial\Services\PrimaryContactService;
```

```php
    public function __construct(
        private UserProvisioner $users,
        private PrimaryContactService $primaryContacts,
    ) {}
```

```php
            foreach ($data->contacts as $contact) {
                $client->contacts()->create($contact->toArray());
            }

            $this->primaryContacts->ensureSingle($client);

            return $client->load(['user', 'addresses', 'contacts']);
```

- [ ] **Step 5: Wire into `UpdateClientAction`**

Em `backend/app/Domains/Commercial/Actions/UpdateClientAction.php`, mesma forma. A chamada vai depois do replace dos contatos, ainda dentro da transação, antes do `fresh()`:

```php
use App\Domains\Commercial\Services\PrimaryContactService;
```

```php
    public function __construct(
        private UserProvisioner $users,
        private PrimaryContactService $primaryContacts,
    ) {}
```

```php
            $client->contacts()->get()->each(fn (ClientContact $c) => $c->delete());
            foreach ($data->contacts as $contact) {
                $client->contacts()->create($contact->toArray());
            }

            $this->primaryContacts->ensureSingle($client);

            return $client->fresh()->load(['user', 'addresses', 'contacts']);
```

> `$client->contacts()` é uma query nova (não a relação em cache) e o SoftDeletes exclui os recém-deletados — o serviço só enxerga os contatos vivos.

- [ ] **Step 6: Run tests to verify they pass**

```bash
docker compose exec -T app php artisan test --filter=PrimaryContactTest
docker compose exec -T app php artisan test --filter=ClientCrudTest
```

Expected: PASS. `ClientCrudTest` continua verde — a regra não pode ter quebrado o CRUD existente.

- [ ] **Step 7: Format and commit**

```bash
./vendor/bin/pint backend/app/Domains/Commercial/Services/PrimaryContactService.php \
                  backend/app/Domains/Commercial/Actions/CreateClientAction.php \
                  backend/app/Domains/Commercial/Actions/UpdateClientAction.php \
                  backend/tests/Feature/Cadastros/PrimaryContactTest.php
git add backend/app/Domains/Commercial/Services/PrimaryContactService.php \
        backend/app/Domains/Commercial/Actions/CreateClientAction.php \
        backend/app/Domains/Commercial/Actions/UpdateClientAction.php \
        backend/tests/Feature/Cadastros/PrimaryContactTest.php
git commit -m "feat(client): regra de contato principal único no caminho da tela

is_primary existia sem nada garantindo a unicidade: N contatos podiam ser
principais. PrimaryContactService normaliza — 2+ principais mantêm o último
marcado, 0 principais é estado válido (não promove ninguém). Regra na camada
de aplicação, nunca em trigger (ADR-08: trigger não enxerga o usuário, a
auditoria perderia o autor). O unmark usa update() por instância; pelo query
builder não dispararia evento e o principal mudaria sem rastro.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Caminho REST nested pelas Actions (CR.1.2)

**Files:**
- Create: `backend/app/Domains/Commercial/Actions/CreateClientContactAction.php`
- Create: `backend/app/Domains/Commercial/Actions/UpdateClientContactAction.php`
- Modify: `backend/app/Domains/Commercial/Http/Controllers/ClientContactController.php`
- Test: `backend/tests/Feature/Cadastros/PrimaryContactTest.php` (modify — adiciona os casos do caminho nested)

**Interfaces:**
- Consumes: `PrimaryContactService::ensureSingle(Client $client, ?ClientContact $winner = null): void` (Task 2).
- Produces: `CreateClientContactAction::execute(Client $client, ClientContactData $data): ClientContact`; `UpdateClientContactAction::execute(ClientContact $contact, ClientContactData $data): ClientContact`.

> **Contexto:** nenhuma tela chama estas rotas hoje (o front grava contato só pelo payload do cliente), mas elas estão sob `auth:sanctum` + `permission:commercial.client.update` e conseguem criar um 2º principal. Fechar aqui é o que torna a invariante real em vez de nominal (decisão 2 do spec).

- [ ] **Step 1: Write the failing tests**

Adicione ao final da classe `PrimaryContactTest` (`backend/tests/Feature/Cadastros/PrimaryContactTest.php`):

```php
    private function makeClientWithPrimary(): \App\Domains\Commercial\Models\Client
    {
        $this->actingAsAdmin();
        $user = \App\Domains\Identity\Models\User::factory()->create(['type' => 'cliente', 'is_active' => false]);
        $client = $user->client()->create(['legal_name' => 'ACME Ltda', 'type' => 'client']);
        $client->contacts()->create(['name' => 'Contato A', 'is_primary' => true]);

        return $client;
    }

    public function test_rota_nested_marcar_novo_principal_desmarca_o_anterior(): void
    {
        $client = $this->makeClientWithPrimary();

        $this->postJson("/api/clients/{$client->id}/contacts", [
            'name' => 'Contato B', 'is_primary' => true,
        ])->assertCreated();

        $this->assertDatabaseHas('client_contacts', ['name' => 'Contato A', 'is_primary' => false]);
        $this->assertDatabaseHas('client_contacts', ['name' => 'Contato B', 'is_primary' => true]);
    }

    public function test_rota_nested_update_marcando_principal_desmarca_o_anterior(): void
    {
        $client = $this->makeClientWithPrimary();
        $b = $client->contacts()->create(['name' => 'Contato B', 'is_primary' => false]);

        $this->putJson("/api/contacts/{$b->id}", [
            'name' => 'Contato B', 'is_primary' => true,
        ])->assertOk();

        $this->assertDatabaseHas('client_contacts', ['name' => 'Contato A', 'is_primary' => false]);
        $this->assertDatabaseHas('client_contacts', ['name' => 'Contato B', 'is_primary' => true]);
    }

    public function test_rota_nested_contato_novo_nao_principal_nao_mexe_no_anterior(): void
    {
        $client = $this->makeClientWithPrimary();

        $this->postJson("/api/clients/{$client->id}/contacts", [
            'name' => 'Contato B', 'is_primary' => false,
        ])->assertCreated();

        $this->assertDatabaseHas('client_contacts', ['name' => 'Contato A', 'is_primary' => true]);
        $this->assertDatabaseHas('client_contacts', ['name' => 'Contato B', 'is_primary' => false]);
    }
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
docker compose exec -T app php artisan test --filter=PrimaryContactTest
```

Expected: FAIL nos 2 primeiros testes novos — o controller escreve direto no Eloquent, então "Contato A" continua `is_primary = true` junto com "Contato B". O terceiro já passa (é o caso de controle).

- [ ] **Step 3: Write `CreateClientContactAction`**

Create `backend/app/Domains/Commercial/Actions/CreateClientContactAction.php`:

```php
<?php

namespace App\Domains\Commercial\Actions;

use App\Domains\Commercial\Data\ClientContactData;
use App\Domains\Commercial\Models\Client;
use App\Domains\Commercial\Models\ClientContact;
use App\Domains\Commercial\Services\PrimaryContactService;
use Illuminate\Support\Facades\DB;

/**
 * Cria um contato pela rota nested. Existe para a regra de principal único
 * valer em toda a API, não só no replace-total do cadastro de cliente.
 */
class CreateClientContactAction
{
    public function __construct(private PrimaryContactService $primaryContacts) {}

    public function execute(Client $client, ClientContactData $data): ClientContact
    {
        return DB::transaction(function () use ($client, $data) {
            $contact = $client->contacts()->create($data->toArray());

            $this->primaryContacts->ensureSingle($client, $contact);

            return $contact->fresh();
        });
    }
}
```

- [ ] **Step 4: Write `UpdateClientContactAction`**

Create `backend/app/Domains/Commercial/Actions/UpdateClientContactAction.php`:

```php
<?php

namespace App\Domains\Commercial\Actions;

use App\Domains\Commercial\Data\ClientContactData;
use App\Domains\Commercial\Models\ClientContact;
use App\Domains\Commercial\Services\PrimaryContactService;
use Illuminate\Support\Facades\DB;

/**
 * Atualiza um contato pela rota nested, mantendo a invariante de principal
 * único. Se o payload desmarcou este contato, o serviço ignora o `winner`
 * (ele não está mais entre os principais) e resolve pelo último marcado.
 */
class UpdateClientContactAction
{
    public function __construct(private PrimaryContactService $primaryContacts) {}

    public function execute(ClientContact $contact, ClientContactData $data): ClientContact
    {
        return DB::transaction(function () use ($contact, $data) {
            $contact->update($data->toArray());

            $this->primaryContacts->ensureSingle($contact->client, $contact);

            return $contact->fresh();
        });
    }
}
```

- [ ] **Step 5: Wire the controller**

Em `backend/app/Domains/Commercial/Http/Controllers/ClientContactController.php` — `store`/`update` injetam a Action; `destroy` **não muda** (delete não cria 2º principal). A forma da resposta é a mesma de antes:

```php
<?php

namespace App\Domains\Commercial\Http\Controllers;

use App\Domains\Commercial\Actions\CreateClientContactAction;
use App\Domains\Commercial\Actions\UpdateClientContactAction;
use App\Domains\Commercial\Data\ClientContactData;
use App\Domains\Commercial\Models\Client;
use App\Domains\Commercial\Models\ClientContact;
use App\Http\Controllers\Controller;
use Illuminate\Http\Response;

class ClientContactController extends Controller
{
    public function store(ClientContactData $data, Client $client, CreateClientContactAction $action): ClientContactData
    {
        return ClientContactData::from($action->execute($client, $data));
    }

    public function update(ClientContactData $data, ClientContact $contact, UpdateClientContactAction $action): ClientContactData
    {
        return ClientContactData::from($action->execute($contact, $data));
    }

    public function destroy(ClientContact $contact): Response
    {
        $contact->delete();

        return response()->noContent();
    }
}
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
docker compose exec -T app php artisan test --filter=PrimaryContactTest
docker compose exec -T app php artisan test --filter=ClientNestedTest
```

Expected: PASS. `ClientNestedTest` (que já cobria estas rotas) continua verde — o status e a forma da resposta não mudaram.

- [ ] **Step 7: Full suite, format, commit**

```bash
docker compose exec -T app php artisan test
./vendor/bin/pint backend/app/Domains/Commercial/Actions/CreateClientContactAction.php \
                  backend/app/Domains/Commercial/Actions/UpdateClientContactAction.php \
                  backend/app/Domains/Commercial/Http/Controllers/ClientContactController.php \
                  backend/tests/Feature/Cadastros/PrimaryContactTest.php
git add backend/app/Domains/Commercial/Actions/CreateClientContactAction.php \
        backend/app/Domains/Commercial/Actions/UpdateClientContactAction.php \
        backend/app/Domains/Commercial/Http/Controllers/ClientContactController.php \
        backend/tests/Feature/Cadastros/PrimaryContactTest.php
git commit -m "feat(client): principal único também nas rotas nested de contato

Nenhuma tela chama POST clients/{client}/contacts nem PUT contacts/{contact},
mas as rotas estão sob auth e escreviam direto no Eloquent — criariam um 2º
principal e a invariante seria só nominal. Escrita com regra passa a ter
Action, como manda o padrão de entidade. destroy segue direto: delete não
cria 2º principal.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: `AppRadioButton` em `shared/ui`

**Files:**
- Create: `frontend/src/shared/ui/AppRadioButton/AppRadioButton.tsx`
- Create: `frontend/src/shared/ui/AppRadioButton/index.ts`
- Modify: `frontend/src/shared/ui/index.ts`

**Interfaces:**
- Consumes: nada.
- Produces: `AppRadioButton` e o tipo `AppRadioButtonProps`, exportados pelo barrel raiz `@shared/ui`. Props relevantes (de `RadioButtonProps` do PrimeReact): `checked: boolean`, `name?: string`, `value?: any`, `disabled?: boolean`, `onChange?(e: RadioButtonChangeEvent): void`, `inputId?: string`.

> Não existe wrapper de radio hoje — o barrel raiz não tem `AppRadioButton`. A Task 5 precisa dele: feature não importa PrimeReact direto (lei §5.6).

- [ ] **Step 1: Write the wrapper**

Create `frontend/src/shared/ui/AppRadioButton/AppRadioButton.tsx`. Segue a forma do `AppDropdown` (componente função simples, reexportando o tipo de props) e **não** a do `AppInputText`: o `RadioButton` do Prime é class component (`extends React.Component`), então `forwardRef<HTMLInputElement>` não tipa — e nenhum consumidor precisa de ref aqui.

```tsx
import { RadioButton } from 'primereact/radiobutton'
import type { RadioButtonProps } from 'primereact/radiobutton'

export type { RadioButtonProps as AppRadioButtonProps } from 'primereact/radiobutton'

/** Wrapper do RadioButton. Cores vêm da folha de tema do Prime (ADR-16) — não
 * empilhe `dark:` aqui. Sem forwardRef: o RadioButton do Prime é class
 * component e nenhum consumidor precisa da ref. */
export function AppRadioButton(props: RadioButtonProps) {
  return <RadioButton {...props} />
}
```

- [ ] **Step 2: Write the folder barrel**

Create `frontend/src/shared/ui/AppRadioButton/index.ts`:

```ts
export * from './AppRadioButton'
```

- [ ] **Step 3: Wire the root barrel**

Em `frontend/src/shared/ui/index.ts`, o export entra na ordem alfabética existente, entre `AppPassword` e `AppSidebar`:

```ts
export * from './AppPassword'
export * from './AppRadioButton'
export * from './AppSidebar'
```

- [ ] **Step 4: Verify it type-checks**

```bash
cd frontend && pnpm build
```

Expected: build verde (`tsc -b` passa). Wrapper sem consumidor ainda — a Task 5 o usa.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/shared/ui/AppRadioButton/ frontend/src/shared/ui/index.ts
git commit -m "feat(ui): AppRadioButton em shared/ui

Não havia wrapper de radio; o ClientDialog precisa de um para a seleção de
contato principal, e feature não importa PrimeReact direto. Sem forwardRef
(o RadioButton do Prime é class component, e ninguém precisa da ref) —
segue a forma do AppDropdown, não a do AppInputText.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: `ClientDialog` — complemento, cargo e seleção de principal (CR.1.3)

**Files:**
- Modify: `frontend/src/features/commercial/components/Client/ClientDialog.tsx`
- Modify: `frontend/src/shared/config/locales/es-CL.json`
- Modify: `frontend/src/shared/config/locales/pt-BR.json`
- Modify: `frontend/src/shared/config/locales/en.json`

**Interfaces:**
- Consumes: `AppRadioButton` de `@shared/ui` (Task 4); `ClientContactData.job_title` do `generated.ts` (Task 1); a normalização do backend (Tasks 2-3) como rede de segurança.
- Produces: nada (última task).

> **Sem test runner no frontend** — a prova é o DoD manual do Step 6, contra a API real.

- [ ] **Step 1: Add the i18n keys — 3 locales, chaves idênticas**

`frontend/src/shared/config/locales/es-CL.json`, dentro de `"client"` (referência de rótulo — cliente chileno):

```json
    "complement": "Depto. / Oficina",
    "contactJobTitle": "Cargo",
    "contactPrimary": "Contacto principal",
```

`frontend/src/shared/config/locales/pt-BR.json`, dentro de `"client"`:

```json
    "complement": "Complemento",
    "contactJobTitle": "Cargo",
    "contactPrimary": "Contato principal",
```

`frontend/src/shared/config/locales/en.json`, dentro de `"client"`:

```json
    "complement": "Unit / Office",
    "contactJobTitle": "Job title",
    "contactPrimary": "Primary contact",
```

- [ ] **Step 2: Render `line2` (complemento)**

Em `frontend/src/features/commercial/components/Client/ClientDialog.tsx`, no grid de endereço: o campo entra entre `client.street` (`line1`) e `client.number`. Banco, DTO e `EMPTY_ADDRESS` já têm `line2` — a tela é a única peça faltando:

```tsx
          <FormField label={t('client.street')}>
            <AppInputText value={addr.line1 ?? ''} disabled={readOnly} onChange={(e) => setAddr({ line1: e.target.value })} className="w-full" />
          </FormField>
          <FormField label={t('client.complement')}>
            <AppInputText value={addr.line2 ?? ''} disabled={readOnly} onChange={(e) => setAddr({ line2: e.target.value })} className="w-full" />
          </FormField>
          <FormField label={t('client.number')}>
            <AppInputText value={addr.number ?? ''} disabled={readOnly} onChange={(e) => setAddr({ number: e.target.value })} className="w-full" />
          </FormField>
```

- [ ] **Step 3: Import `AppRadioButton`**

Mesmo arquivo, a linha 3 do import de `@shared/ui` ganha o componente (barrel raiz é a única porta):

```tsx
import { CrudDialog, AppButton, AppInputText, AppDropdown, AppRadioButton, FormField, NestedField, FormErrorSummary, FormErrorBanner } from '@shared/ui'
```

- [ ] **Step 4: Contact row — radio + cargo**

Substitua o bloco `form.contacts.map(...)` (hoje `grid-cols-3`, nome/email/telefone) por:

```tsx
        {form.contacts.map((c, i) => (
          <div key={i} className="grid grid-cols-[auto_1fr_1fr_1fr_1fr] items-start gap-2">
            <div className="flex h-[42px] items-center" title={t('client.contactPrimary')}>
              <AppRadioButton
                name="primaryContact"
                checked={c.is_primary}
                disabled={readOnly}
                aria-label={t('client.contactPrimary')}
                onChange={() => setPrimaryContact(setForm, i)}
              />
            </div>
            <NestedField error={fieldErrors?.[`contacts.${i}.name`]?.[0]}>
              <AppInputText placeholder={t('client.contactName')} value={c.name} disabled={readOnly} onChange={(e) => patchContact(setForm, i, { name: e.target.value })} />
            </NestedField>
            <NestedField error={fieldErrors?.[`contacts.${i}.job_title`]?.[0]}>
              <AppInputText placeholder={t('client.contactJobTitle')} value={c.job_title ?? ''} disabled={readOnly} onChange={(e) => patchContact(setForm, i, { job_title: e.target.value })} />
            </NestedField>
            <NestedField error={fieldErrors?.[`contacts.${i}.email`]?.[0]}>
              <AppInputText placeholder={t('common.email')} value={c.email ?? ''} disabled={readOnly} onChange={(e) => patchContact(setForm, i, { email: e.target.value })} />
            </NestedField>
            <NestedField error={fieldErrors?.[`contacts.${i}.phone`]?.[0]}>
              <AppInputText placeholder={t('common.phone')} value={c.phone ?? ''} disabled={readOnly} onChange={(e) => patchContact(setForm, i, { phone: e.target.value })} />
            </NestedField>
          </div>
        ))}
```

> `h-[42px]` alinha o radio com a altura do `AppInputText` (o `items-start` do grid mantém os erros dos `NestedField` empurrando para baixo sem desalinhar a linha). Se a altura do input do tema divergir, ajuste este valor — é layout, Tailwind resolve (ADR-16: cor vem do tema, layout vem do utility).

- [ ] **Step 5: Write `setPrimaryContact`**

No mesmo arquivo, junto de `patchContact` (final do arquivo). **Exclusão mútua real**: marca `i` e desmarca todos os outros no mesmo `setForm`, então a UI nunca emite payload com 2 principais:

```tsx
function setPrimaryContact(setForm: Dispatch<SetStateAction<ClientData>>, i: number) {
  setForm((f) => ({
    ...f,
    contacts: f.contacts.map((c, idx) => ({ ...c, is_primary: idx === i })),
  }))
}
```

> O `PrimaryContactService` do backend é a rede da API, não a única defesa: a tela já entrega o payload consistente.

- [ ] **Step 6: Verify — build, lint, e comportamento contra a API real (DoD)**

```bash
cd frontend && pnpm build && pnpm lint
```

Expected: ambos verdes.

Depois, com `docker compose up -d` e `pnpm dev` rodando, contra a API real:

1. Abrir `/clientes` → novo cliente.
2. Preencher os dados gerais e o endereço, **incluindo o complemento**.
3. Adicionar um 2º contato; preencher **cargo** nos dois.
4. Marcar o **1º** como principal, depois marcar o **2º** — o radio do 1º desmarca na hora (exclusão mútua na UI).
5. Salvar. Reabrir o cliente.
6. **Provar:** complemento voltou; os 2 cargos voltaram; só o 2º contato está marcado como principal.

Expected: todos os 6 passos conferem. Se o cargo voltar vazio, o problema é o `generated.ts`/DTO (Task 1), não a tela.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/features/commercial/components/Client/ClientDialog.tsx \
        frontend/src/shared/config/locales/es-CL.json \
        frontend/src/shared/config/locales/pt-BR.json \
        frontend/src/shared/config/locales/en.json
git commit -m "feat(client): complemento, cargo e seleção de principal no ClientDialog

line2 existia no banco, no DTO e no EMPTY_ADDRESS — só a tela não renderizava.
Cargo é o campo da CR.1.1. O principal usa radio (exclusão mútua), não
checkbox independente: a UI deixa de emitir payload com 2 principais em vez
de depender só da normalização do backend.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Fechamento do bloco

- [ ] **Suíte + build verdes**

```bash
docker compose exec -T app php artisan test
cd frontend && pnpm build && pnpm lint
```

- [ ] **`docs/superpowers/progress.md`:** move o Bloco 2 do backlog para a tabela, com o resultado em 1 linha. Registrar o que a próxima sessão não pode redescobrir sozinha:
  - coluna é **`job_title`, não `role`** (desvio do card do Notion — `role` é RBAC);
  - `PrimaryContactService` cobre os **2 caminhos** de escrita; não reintroduzir escrita de contato direto no Eloquent;
  - **cliente sem principal é estado válido** (não auto-promover);
  - `client_addresses.is_primary` segue com o mesmo gap, **de propósito** — está no backlog;
  - `AppRadioButton` existe em `shared/ui`; não importar `RadioButton` do Prime na feature.
- [ ] **Backlog do `progress.md`:** adicionar `Unicidade de client_addresses.is_primary` e `Consolidar migrations adicionais nas originais (pré-produção)`.
- [ ] **Notion:** CR.1.1, CR.1.2 e CR.1.3 → "Concluída". No card da CR.1.1, anotar o desvio `role` → `job_title` e o porquê.
