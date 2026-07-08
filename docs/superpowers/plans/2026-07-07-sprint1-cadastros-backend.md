# Sprint 1 · Cadastros — Backend (Clientes + Redatores) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar o backend dos cadastros de Cliente (empresa) e Redator (professor) — schema, models, DTOs, validação de RUT, actions, controllers e rotas — com comportamento provado por teste de integração sqlite `:memory:`.

**Architecture:** DDD-lite (ADR-02): regra de negócio em Actions single-action dentro de transação; CRUD sem regra direto no Controller ao Eloquent. Cliente e Redator são extensões 1:1 do `User` via `user_id` (não subclasses). Documentos do redator via relação polimórfica (`files`, ADR-10). Tipos TS gerados dos DTOs `spatie/laravel-data` (ADR-04). Erros sobem para o handler global RFC 7807 (ADR-03).

**Tech Stack:** Laravel (PHP 8.3), spatie/laravel-data ^4.23, spatie/laravel-typescript-transformer ^3.3, owen-it/laravel-auditing, league/flysystem-aws-s3-v3 ^3.35, PHPUnit ^12.5 (sqlite `:memory:`).

## Global Constraints

- **Idioma do schema = inglês** (decisão 2026-07-07). Nomes de coluna/tabela em inglês; exceção: `redator`/`redatores`/`redator_id` são nome próprio do domínio (mantidos em PT p/ casar com morph map e FKs futuras).
- **Sem `company_rut`**: o RUT da empresa vive em `users.rut` (1:1 users↔clients). "RUT único" recai sobre `users.rut` (já `unique`).
- **Enums carregam `other`**: `clients.type = enum('client','provider','other') default 'client'`.
- **DDD-lite, sem Repository** (ADR-02). Regra → Action/Service; CRUD puro → Controller→Eloquent. Testes de integração contra sqlite `:memory:`, sem mock.
- **Cliente e redator NÃO logam com senha de verdade nesta sprint**: cliente `is_active=false` (RN-01, não loga). Redator loga (RN-01: admin+redator autenticam) — mas o cadastro não define senha aqui; `is_active=false` até ativação.
- **Auth = cookie Sanctum + CSRF** (ADR-06). Rotas de cadastro sob `auth:sanctum`.
- **Tipos TS gerados, nunca à mão** (ADR-04). `frontend/src/shared/types/generated.ts` é saída, não fonte.
- **Controllers deixam exceções subirem** (ADR-03) — não montam resposta de erro à mão.
- **DoD = comportamento provado** (não pacote instalado): cada task fecha com teste verde.
- **Migrations são globais** (`database/migrations/`), não por domínio.
- Commits frequentes, um por task, conventional commits em pt-br.
- Rodar testes: `docker compose run --rm app php artisan test` (ou `php artisan test` se PHP 8.3 local, de `backend/`). Os comandos abaixo assumem execução de `backend/`.

---

### Task 1: Wiring de rotas por domínio (fundação)

Hoje as rotas estão inline em `routes/api.php` e não existe o mecanismo de `Domains/*/routes.php`. Esta task introduz o carregamento agregado e move as rotas de auth para o domínio Identity, sem quebrar o comportamento atual.

**Files:**
- Modify: `backend/routes/api.php`
- Create: `backend/app/Domains/Identity/routes.php`
- Test: `backend/tests/Feature/Identity/AuthTest.php` (regressão — já existe, não alterar)

**Interfaces:**
- Produces: convenção `app/Domains/<Dominio>/routes.php` agregado em `routes/api.php` via `glob`. Rotas do domínio herdam prefixo `api/` e middleware `api` (statefulApi).

- [ ] **Step 1: Rodar a suíte atual para baseline verde**

Run: `php artisan test --filter=AuthTest`
Expected: PASS (3 testes de auth passam).

- [ ] **Step 2: Criar o routes.php do Identity com as rotas de auth**

Create `backend/app/Domains/Identity/routes.php`:

```php
<?php

use App\Domains\Identity\Http\Controllers\AuthController;
use Illuminate\Support\Facades\Route;

// Rotas do domínio Identity. Já entram sob prefixo `api/` e middleware `api`
// (agregadas por routes/api.php).
Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);
});
```

- [ ] **Step 3: Reescrever routes/api.php para agregar os domínios**

Replace o conteúdo de `backend/routes/api.php` por:

```php
<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/user', fn (Request $request) => $request->user())
    ->middleware('auth:sanctum');

// Cada domínio declara suas próprias rotas em app/Domains/<Dominio>/routes.php.
// RouteServiceProvider planejado (estrutura-monolito.md) ainda não existe;
// agregamos por glob aqui — routes/api.php fica só como esqueleto.
foreach (glob(app_path('Domains/*/routes.php')) as $routeFile) {
    require $routeFile;
}
```

- [ ] **Step 4: Rodar a suíte de auth (verifica que login/logout/me continuam resolvendo)**

Run: `php artisan test --filter=AuthTest`
Expected: PASS (as 3 rotas agora vêm do Identity/routes.php).

- [ ] **Step 5: Commit**

```bash
git add backend/routes/api.php backend/app/Domains/Identity/routes.php
git commit -m "refactor(routing): agrega routes.php por domínio; move auth p/ Identity"
```

---

### Task 2: Value object Rut + regra de validação ValidRut

**Files:**
- Create: `backend/app/Shared/Support/Rut.php`
- Create: `backend/app/Shared/Rules/ValidRut.php`
- Test: `backend/tests/Unit/Shared/RutTest.php`

**Interfaces:**
- Produces:
  - `App\Shared\Support\Rut` com `static parse(string $raw): self`, `isValid(): bool`, `format(): string`, props `readonly string $number`, `readonly string $dv`.
  - `App\Shared\Rules\ValidRut implements Illuminate\Contracts\Validation\ValidationRule` — usada como `new ValidRut` em regras de validação.

- [ ] **Step 1: Escrever o teste do value object**

Create `backend/tests/Unit/Shared/RutTest.php`:

```php
<?php

namespace Tests\Unit\Shared;

use App\Shared\Support\Rut;
use PHPUnit\Framework\TestCase;

class RutTest extends TestCase
{
    public function test_rut_valido_com_pontos_e_traco(): void
    {
        $this->assertTrue(Rut::parse('12.345.678-5')->isValid());
    }

    public function test_rut_valido_sem_formatacao(): void
    {
        $this->assertTrue(Rut::parse('123456785')->isValid());
    }

    public function test_dv_k_maiusculo_ou_minusculo(): void
    {
        $this->assertTrue(Rut::parse('20.347.878-K')->isValid());
        $this->assertTrue(Rut::parse('20347878-k')->isValid());
    }

    public function test_dv_incorreto_invalido(): void
    {
        $this->assertFalse(Rut::parse('12.345.678-9')->isValid());
    }

    public function test_lixo_invalido(): void
    {
        $this->assertFalse(Rut::parse('abc')->isValid());
        $this->assertFalse(Rut::parse('')->isValid());
    }

    public function test_format_normaliza(): void
    {
        $this->assertSame('12.345.678-5', Rut::parse('123456785')->format());
    }
}
```

- [ ] **Step 2: Rodar o teste (deve falhar — classe não existe)**

Run: `php artisan test --filter=RutTest`
Expected: FAIL ("Class App\Shared\Support\Rut not found").

- [ ] **Step 3: Implementar o value object**

Create `backend/app/Shared/Support/Rut.php`:

```php
<?php

namespace App\Shared\Support;

/**
 * RUT chileno (Rol Único Tributario). Value object: normaliza a entrada e
 * valida o dígito verificador (módulo 11). Serve para pessoa e empresa —
 * o formato/DV é o mesmo.
 */
final class Rut
{
    public function __construct(
        public readonly string $number,
        public readonly string $dv,
    ) {}

    public static function parse(string $raw): self
    {
        $clean = strtoupper((string) preg_replace('/[^0-9kK]/', '', $raw));

        if ($clean === '') {
            return new self('', '');
        }

        return new self(substr($clean, 0, -1), substr($clean, -1));
    }

    public function isValid(): bool
    {
        if ($this->number === '' || ! ctype_digit($this->number)) {
            return false;
        }

        return $this->computeDv($this->number) === $this->dv;
    }

    public function format(): string
    {
        return number_format((int) $this->number, 0, '', '.').'-'.$this->dv;
    }

    private function computeDv(string $number): string
    {
        $sum = 0;
        $factor = 2;

        for ($i = strlen($number) - 1; $i >= 0; $i--) {
            $sum += (int) $number[$i] * $factor;
            $factor = $factor === 7 ? 2 : $factor + 1;
        }

        $mod = 11 - ($sum % 11);

        return match ($mod) {
            11 => '0',
            10 => 'K',
            default => (string) $mod,
        };
    }
}
```

- [ ] **Step 4: Rodar o teste (deve passar)**

Run: `php artisan test --filter=RutTest`
Expected: PASS.

- [ ] **Step 5: Implementar a regra de validação**

Create `backend/app/Shared/Rules/ValidRut.php`:

```php
<?php

namespace App\Shared\Rules;

use App\Shared\Support\Rut;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * Valida a ESTRUTURA/dígito verificador do RUT. Unicidade é checagem
 * separada (regra unique / verificação na Action) — não é responsabilidade
 * desta regra.
 */
final class ValidRut implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_string($value) || ! Rut::parse($value)->isValid()) {
            $fail('O RUT informado é inválido.');
        }
    }
}
```

- [ ] **Step 6: Commit**

```bash
git add backend/app/Shared/Support/Rut.php backend/app/Shared/Rules/ValidRut.php backend/tests/Unit/Shared/RutTest.php
git commit -m "feat(shared): value object Rut (DV módulo 11) + regra ValidRut"
```

---

### Task 3: Migrations em inglês (clients, addresses, contacts, redatores, files)

Edita as migrations já escritas à mão (banco de dev é descartável — editar é preferível a empilhar migration de alteração).

**Files:**
- Modify: `backend/database/migrations/2026_07_06_141820_clients.php`
- Modify: `backend/database/migrations/2026_07_06_181659_redactor.php`
- Modify: `backend/database/migrations/2026_07_06_184711_files.php`
- Test: `backend/tests/Feature/Cadastros/SchemaTest.php`

**Interfaces:**
- Produces: tabelas `clients`(user_id UK, legal_name, type, business_activity), `client_addresses`(line1,line2,number,commune,city,region,zip_code,is_primary), `client_contacts`(name,email,phone,is_primary), `redatores`(user_id UK), `files`(+ índice composto). Todas com FK `cascade` e softDeletes.

- [ ] **Step 1: Escrever o teste de schema**

Create `backend/tests/Feature/Cadastros/SchemaTest.php`:

```php
<?php

namespace Tests\Feature\Cadastros;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class SchemaTest extends TestCase
{
    use RefreshDatabase;

    public function test_tabelas_de_cadastro_existem_com_colunas(): void
    {
        $this->assertTrue(Schema::hasTable('clients'));
        $this->assertTrue(Schema::hasColumns('clients', [
            'user_id', 'legal_name', 'type', 'business_activity', 'deleted_at',
        ]));

        $this->assertTrue(Schema::hasColumns('client_addresses', [
            'client_id', 'line1', 'line2', 'number', 'commune', 'city', 'region', 'zip_code', 'is_primary',
        ]));

        $this->assertTrue(Schema::hasColumns('client_contacts', [
            'client_id', 'name', 'email', 'phone', 'is_primary',
        ]));

        $this->assertTrue(Schema::hasTable('redatores'));
        $this->assertTrue(Schema::hasColumns('redatores', ['user_id', 'deleted_at']));

        $this->assertTrue(Schema::hasColumns('files', [
            'fileable_type', 'fileable_id', 'type', 'path', 'original_name', 'mime', 'size', 'valid_until',
        ]));
    }
}
```

- [ ] **Step 2: Rodar o teste (deve falhar — colunas em inglês/`redatores` ainda não existem)**

Run: `php artisan test --filter=SchemaTest`
Expected: FAIL (`redatores` não existe; colunas divergem).

- [ ] **Step 3: Reescrever a migration de clients**

Replace o conteúdo de `backend/database/migrations/2026_07_06_141820_clients.php` por:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('clients', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained('users')->cascadeOnDelete();
            $table->string('legal_name');                       // razón social
            $table->enum('type', ['client', 'provider', 'other'])->default('client');
            $table->string('business_activity')->nullable();    // giro
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('client_addresses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_id')->constrained('clients')->cascadeOnDelete();
            $table->string('line1')->nullable();          // Dirección
            $table->string('line2')->nullable();          // complemento
            $table->string('number')->nullable();         // número
            $table->string('commune')->nullable();        // comuna
            $table->string('city')->nullable();           // ciudad
            $table->string('region')->nullable();         // región
            $table->string('zip_code')->nullable();
            $table->boolean('is_primary')->default(false);
            $table->timestamps();
            $table->softDeletes();

            $table->index('is_primary');
        });

        Schema::create('client_contacts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_id')->constrained('clients')->cascadeOnDelete();
            $table->string('name');
            $table->string('email')->nullable();
            $table->string('phone', 30)->nullable();
            $table->boolean('is_primary')->default(false);
            $table->timestamps();
            $table->softDeletes();

            $table->index('is_primary');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('client_contacts');
        Schema::dropIfExists('client_addresses');
        Schema::dropIfExists('clients');
    }
};
```

- [ ] **Step 4: Reescrever a migration de redatores**

Replace o conteúdo de `backend/database/migrations/2026_07_06_181659_redactor.php` por:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('redatores', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained('users')->cascadeOnDelete();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('redatores');
    }
};
```

- [ ] **Step 5: Adicionar índice composto na migration de files**

Em `backend/database/migrations/2026_07_06_184711_files.php`, dentro do `Schema::create('files', ...)`, logo após a linha `$table->softDeletes();`, adicionar:

```php
            $table->index(['fileable_type', 'fileable_id']);
```

- [ ] **Step 6: Rodar o teste (deve passar)**

Run: `php artisan test --filter=SchemaTest`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add backend/database/migrations/2026_07_06_141820_clients.php backend/database/migrations/2026_07_06_181659_redactor.php backend/database/migrations/2026_07_06_184711_files.php backend/tests/Feature/Cadastros/SchemaTest.php
git commit -m "feat(db): schema de cadastros em inglês (clients/addresses/contacts, redatores, files idx)"
```

---

### Task 4: Model File (Shared/Files) + morphTo

**Files:**
- Create: `backend/app/Shared/Files/Models/File.php`
- Test: `backend/tests/Feature/Cadastros/FileModelTest.php`

**Interfaces:**
- Produces: `App\Shared\Files\Models\File` com `fileable(): MorphTo`, `$fillable = ['fileable_type','fileable_id','type','path','original_name','mime','size','valid_until']`, cast `valid_until => date`, softDeletes. Alias morph `'user'` já existe no map.

- [ ] **Step 1: Escrever o teste**

Create `backend/tests/Feature/Cadastros/FileModelTest.php`:

```php
<?php

namespace Tests\Feature\Cadastros;

use App\Domains\Identity\Models\User;
use App\Shared\Files\Models\File;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FileModelTest extends TestCase
{
    use RefreshDatabase;

    public function test_file_resolve_o_dono_via_morph(): void
    {
        $user = User::factory()->create();

        $file = File::create([
            'fileable_type'  => 'user',
            'fileable_id'    => $user->id,
            'type'           => 'cv',
            'path'           => 'docs/cv.pdf',
            'original_name'  => 'cv.pdf',
            'mime'           => 'application/pdf',
            'size'           => 1234,
        ]);

        $this->assertInstanceOf(User::class, $file->fresh()->fileable);
        $this->assertSame($user->id, $file->fileable->id);
    }
}
```

- [ ] **Step 2: Rodar o teste (deve falhar — model não existe)**

Run: `php artisan test --filter=FileModelTest`
Expected: FAIL ("Class App\Shared\Files\Models\File not found").

- [ ] **Step 3: Implementar o model File**

Create `backend/app/Shared/Files/Models/File.php`:

```php
<?php

namespace App\Shared\Files\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Arquivo polimórfico (S3). Um único registro central; o dono é resolvido
 * via morph map (ADR-10). Foto de perfil NÃO usa esta tabela (coluna
 * users.photo_path).
 */
class File extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'fileable_type',
        'fileable_id',
        'type',
        'path',
        'original_name',
        'mime',
        'size',
        'valid_until',
    ];

    protected $casts = [
        'valid_until' => 'date',
        'size'        => 'integer',
    ];

    public function fileable(): MorphTo
    {
        return $this->morphTo();
    }
}
```

- [ ] **Step 4: Rodar o teste (deve passar)**

Run: `php artisan test --filter=FileModelTest`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/app/Shared/Files/Models/File.php backend/tests/Feature/Cadastros/FileModelTest.php
git commit -m "feat(files): model File polimórfico (morphTo fileable)"
```

---

### Task 5: Models Client + ClientAddress + ClientContact (corrige extends/PSR-4)

**Files:**
- Modify: `backend/app/Domains/Commercial/Models/Client.php`
- Rename+Modify: `backend/app/Domains/Commercial/Models/ClientAddresses.php` → `ClientAddress.php`
- Rename+Modify: `backend/app/Domains/Commercial/Models/ClientContacts.php` → `ClientContact.php`
- Test: `backend/tests/Feature/Cadastros/ClientModelTest.php`

**Interfaces:**
- Consumes: `App\Domains\Identity\Models\User`.
- Produces:
  - `Client` (`extends Model`): `user(): BelongsTo`, `addresses(): HasMany`, `contacts(): HasMany`. Fillable `['user_id','legal_name','type','business_activity']`.
  - `ClientAddress`, `ClientContact` (`extends Model`): `client(): BelongsTo`, cast `is_primary => bool`.

- [ ] **Step 1: Escrever o teste**

Create `backend/tests/Feature/Cadastros/ClientModelTest.php`:

```php
<?php

namespace Tests\Feature\Cadastros;

use App\Domains\Commercial\Models\Client;
use App\Domains\Commercial\Models\ClientAddress;
use App\Domains\Commercial\Models\ClientContact;
use App\Domains\Identity\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ClientModelTest extends TestCase
{
    use RefreshDatabase;

    public function test_client_navega_user_addresses_contacts(): void
    {
        $user = User::factory()->create(['type' => 'cliente', 'is_active' => false]);

        $client = Client::create([
            'user_id'           => $user->id,
            'legal_name'        => 'Switch Chile Ltda',
            'type'              => 'client',
            'business_activity' => 'Instalaciones Eléctricas',
        ]);

        $client->addresses()->create([
            'commune'    => 'Providencia',
            'city'       => 'Santiago',
            'region'     => 'RM',
            'is_primary' => true,
        ]);

        $client->contacts()->create([
            'name'       => 'Parris Barrios',
            'email'      => 'info@switch-chile.cl',
            'is_primary' => true,
        ]);

        $client->refresh();

        $this->assertInstanceOf(User::class, $client->user);
        $this->assertCount(1, $client->addresses);
        $this->assertInstanceOf(ClientAddress::class, $client->addresses->first());
        $this->assertTrue($client->addresses->first()->is_primary);
        $this->assertInstanceOf(ClientContact::class, $client->contacts->first());
        $this->assertSame('Parris Barrios', $client->contacts->first()->name);
    }
}
```

- [ ] **Step 2: Rodar o teste (deve falhar)**

Run: `php artisan test --filter=ClientModelTest`
Expected: FAIL (classes `ClientAddress`/`ClientContact` não carregam; `Client` extends User).

- [ ] **Step 3: Renomear os arquivos dos models nested**

```bash
git mv backend/app/Domains/Commercial/Models/ClientAddresses.php backend/app/Domains/Commercial/Models/ClientAddress.php
git mv backend/app/Domains/Commercial/Models/ClientContacts.php backend/app/Domains/Commercial/Models/ClientContact.php
```

- [ ] **Step 4: Reescrever o model Client**

Replace o conteúdo de `backend/app/Domains/Commercial/Models/Client.php` por:

```php
<?php

namespace App\Domains\Commercial\Models;

use App\Domains\Identity\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use OwenIt\Auditing\Auditable as AuditableTrait;
use OwenIt\Auditing\Contracts\Auditable;

/**
 * Cliente = empresa contratante. Extensão 1:1 do User via user_id
 * (NÃO subclasse de User). O RUT da empresa vive em users.rut.
 */
class Client extends Model implements Auditable
{
    use AuditableTrait, SoftDeletes;

    protected $fillable = [
        'user_id',
        'legal_name',
        'type',
        'business_activity',
    ];

    protected $auditInclude = [
        'user_id',
        'legal_name',
        'type',
        'business_activity',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function addresses(): HasMany
    {
        return $this->hasMany(ClientAddress::class);
    }

    public function contacts(): HasMany
    {
        return $this->hasMany(ClientContact::class);
    }
}
```

- [ ] **Step 5: Reescrever ClientAddress**

Replace o conteúdo de `backend/app/Domains/Commercial/Models/ClientAddress.php` por:

```php
<?php

namespace App\Domains\Commercial\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use OwenIt\Auditing\Auditable as AuditableTrait;
use OwenIt\Auditing\Contracts\Auditable;

class ClientAddress extends Model implements Auditable
{
    use AuditableTrait, SoftDeletes;

    protected $fillable = [
        'client_id',
        'line1',
        'line2',
        'number',
        'commune',
        'city',
        'region',
        'zip_code',
        'is_primary',
    ];

    protected $auditInclude = [
        'client_id',
        'line1',
        'line2',
        'number',
        'commune',
        'city',
        'region',
        'zip_code',
        'is_primary',
    ];

    protected $casts = [
        'is_primary' => 'boolean',
    ];

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }
}
```

- [ ] **Step 6: Reescrever ClientContact**

Replace o conteúdo de `backend/app/Domains/Commercial/Models/ClientContact.php` por:

```php
<?php

namespace App\Domains\Commercial\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use OwenIt\Auditing\Auditable as AuditableTrait;
use OwenIt\Auditing\Contracts\Auditable;

class ClientContact extends Model implements Auditable
{
    use AuditableTrait, SoftDeletes;

    protected $fillable = [
        'client_id',
        'name',
        'email',
        'phone',
        'is_primary',
    ];

    protected $auditInclude = [
        'client_id',
        'name',
        'email',
        'phone',
        'is_primary',
    ];

    protected $casts = [
        'is_primary' => 'boolean',
    ];

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }
}
```

- [ ] **Step 7: Rodar o teste (deve passar)**

Run: `php artisan test --filter=ClientModelTest`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add backend/app/Domains/Commercial/Models/ backend/tests/Feature/Cadastros/ClientModelTest.php
git commit -m "fix(commercial): Client extends Model + belongsTo(User); corrige PSR-4 dos nested"
```

---

### Task 6: Model Redator + morphMany documentos + relações no User

**Files:**
- Delete: `backend/app/Domains/Identity/Models/Redactors.php`
- Create: `backend/app/Domains/Identity/Models/Redator.php`
- Modify: `backend/app/Domains/Identity/Models/User.php`
- Test: `backend/tests/Feature/Cadastros/RedatorModelTest.php`

**Interfaces:**
- Consumes: `App\Shared\Files\Models\File`, `App\Domains\Identity\Models\User`.
- Produces:
  - `Redator` (`extends Model`): `user(): BelongsTo`, `documents(): MorphMany` (File, `fileable`). Fillable `['user_id']`.
  - `User`: `client(): HasOne`, `redator(): HasOne`.
- Morph map (`AppServiceProvider`) já mapeia `'redator' => Redator::class`. Adicionar `'user' => User::class` já existe; garantir que aponta para a classe certa.

- [ ] **Step 1: Escrever o teste**

Create `backend/tests/Feature/Cadastros/RedatorModelTest.php`:

```php
<?php

namespace Tests\Feature\Cadastros;

use App\Domains\Identity\Models\Redator;
use App\Domains\Identity\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RedatorModelTest extends TestCase
{
    use RefreshDatabase;

    public function test_redator_navega_user_e_documentos_polimorficos(): void
    {
        $user = User::factory()->redator()->create();

        $redator = Redator::create(['user_id' => $user->id]);

        $redator->documents()->create([
            'type'          => 'cv',
            'path'          => 'redatores/1/cv.pdf',
            'original_name' => 'cv.pdf',
            'mime'          => 'application/pdf',
            'size'          => 2048,
        ]);

        $redator->refresh();

        $this->assertInstanceOf(User::class, $redator->user);
        $this->assertCount(1, $redator->documents);
        $this->assertSame('redator', $redator->documents->first()->fileable_type);
        $this->assertTrue($user->redator->is($redator));
    }
}
```

- [ ] **Step 2: Rodar o teste (deve falhar)**

Run: `php artisan test --filter=RedatorModelTest`
Expected: FAIL ("Class App\Domains\Identity\Models\Redator not found").

- [ ] **Step 3: Remover o stub vazio e criar o model Redator**

```bash
git rm backend/app/Domains/Identity/Models/Redactors.php
```

Create `backend/app/Domains/Identity/Models/Redator.php`:

```php
<?php

namespace App\Domains\Identity\Models;

use App\Shared\Files\Models\File;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use OwenIt\Auditing\Auditable as AuditableTrait;
use OwenIt\Auditing\Contracts\Auditable;

/**
 * Redator = professor. Extensão 1:1 do User via user_id. Documentos de
 * idoneidade (CV, REUF, título, pós) via relação polimórfica (files, ADR-10).
 */
class Redator extends Model implements Auditable
{
    use AuditableTrait, SoftDeletes;

    protected $table = 'redatores';

    protected $fillable = ['user_id'];

    protected $auditInclude = ['user_id'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function documents(): MorphMany
    {
        return $this->morphMany(File::class, 'fileable');
    }
}
```

- [ ] **Step 4: Adicionar as relações hasOne no User**

Em `backend/app/Domains/Identity/Models/User.php`, adicionar os imports no topo (após os `use` existentes):

```php
use App\Domains\Commercial\Models\Client;
use Illuminate\Database\Eloquent\Relations\HasOne;
```

E adicionar os dois métodos dentro da classe `User`, logo antes do método `newFactory()`:

```php
    public function client(): HasOne
    {
        return $this->hasOne(Client::class);
    }

    public function redator(): HasOne
    {
        return $this->hasOne(Redator::class);
    }
```

- [ ] **Step 5: Rodar o teste (deve passar)**

Run: `php artisan test --filter=RedatorModelTest`
Expected: PASS.

- [ ] **Step 6: Rodar a suíte inteira (regressão do morph map + models)**

Run: `php artisan test`
Expected: PASS (nada quebra; morph map `'redator' => Redator::class` agora resolve para classe existente).

- [ ] **Step 7: Commit**

```bash
git add backend/app/Domains/Identity/Models/ backend/tests/Feature/Cadastros/RedatorModelTest.php
git commit -m "feat(identity): model Redator (redatores) + docs polimórficos; hasOne no User"
```

---

### Task 7: DTOs (ClientData, ClientAddressData, ClientContactData, RedatorData)

**Files:**
- Create: `backend/app/Domains/Commercial/Data/ClientAddressData.php`
- Create: `backend/app/Domains/Commercial/Data/ClientContactData.php`
- Modify: `backend/app/Domains/Commercial/Data/ClientData.php` (hoje vazio)
- Delete: `backend/app/Domains/Commercial/Data/ClientAddressesData.php`, `ClientContactsData.php` (stubs vazios)
- Create: `backend/app/Domains/Identity/Data/RedatorData.php`
- Test: `backend/tests/Feature/Cadastros/ClientDataValidationTest.php`

**Interfaces:**
- Produces:
  - `ClientData` (`#[TypeScript]`) com campos do user (`name`,`rut`,`email`,`phone`) + client (`legal_name`,`type`,`business_activity`) + `#[DataCollectionOf(ClientAddressData::class)] array $addresses` + `#[DataCollectionOf(ClientContactData::class)] array $contacts`. `rules()` aplica `ValidRut` em `rut`.
  - `ClientAddressData`, `ClientContactData`, `RedatorData` (`#[TypeScript]`).
- Consumes: `App\Shared\Rules\ValidRut`.

> **Nota sobre unicidade:** a regra `unique:users,rut` NÃO vai no DTO (quebraria no update, onde o RUT do próprio user já existe). A unicidade é verificada nas Actions (Task 8/11). O DTO cobre só a validade estrutural (`ValidRut`).

- [ ] **Step 1: Escrever o teste de validação do DTO**

Create `backend/tests/Feature/Cadastros/ClientDataValidationTest.php`:

```php
<?php

namespace Tests\Feature\Cadastros;

use App\Domains\Commercial\Data\ClientData;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class ClientDataValidationTest extends TestCase
{
    public function test_rut_invalido_e_rejeitado(): void
    {
        $this->expectException(ValidationException::class);

        ClientData::validate([
            'name'       => 'Switch Chile',
            'rut'        => '12.345.678-9', // DV errado
            'email'      => 'info@switch.cl',
            'legal_name' => 'Switch Chile Ltda',
            'type'       => 'client',
        ]);
    }

    public function test_payload_valido_passa(): void
    {
        $data = ClientData::validateAndCreate([
            'name'       => 'Switch Chile',
            'rut'        => '12.345.678-5', // DV correto
            'email'      => 'info@switch.cl',
            'legal_name' => 'Switch Chile Ltda',
            'type'       => 'client',
            'addresses'  => [['commune' => 'Providencia', 'city' => 'Santiago', 'region' => 'RM', 'is_primary' => true]],
            'contacts'   => [['name' => 'Parris Barrios', 'email' => 'p@switch.cl', 'is_primary' => true]],
        ]);

        $this->assertSame('Switch Chile Ltda', $data->legal_name);
        $this->assertCount(1, $data->addresses);
        $this->assertSame('Providencia', $data->addresses[0]->commune);
    }
}
```

- [ ] **Step 2: Rodar o teste (deve falhar — DTOs vazios)**

Run: `php artisan test --filter=ClientDataValidationTest`
Expected: FAIL (`ClientData` não tem `validate`/campos).

- [ ] **Step 3: Remover os stubs vazios**

```bash
git rm backend/app/Domains/Commercial/Data/ClientAddressesData.php backend/app/Domains/Commercial/Data/ClientContactsData.php
```

- [ ] **Step 4: Criar ClientAddressData**

Create `backend/app/Domains/Commercial/Data/ClientAddressData.php`:

```php
<?php

namespace App\Domains\Commercial\Data;

use Spatie\LaravelData\Data;
use Spatie\LaravelData\Optional;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

#[TypeScript]
class ClientAddressData extends Data
{
    public function __construct(
        public int|Optional $id,
        public string|Optional|null $line1,
        public string|Optional|null $line2,
        public string|Optional|null $number,
        public string|Optional|null $commune,
        public string|Optional|null $city,
        public string|Optional|null $region,
        public string|Optional|null $zip_code,
        public bool $is_primary = false,
    ) {}
}
```

- [ ] **Step 5: Criar ClientContactData**

Create `backend/app/Domains/Commercial/Data/ClientContactData.php`:

```php
<?php

namespace App\Domains\Commercial\Data;

use Spatie\LaravelData\Data;
use Spatie\LaravelData\Optional;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

#[TypeScript]
class ClientContactData extends Data
{
    public function __construct(
        public int|Optional $id,
        public string $name,
        public string|Optional|null $email,
        public string|Optional|null $phone,
        public bool $is_primary = false,
    ) {}
}
```

- [ ] **Step 6: Escrever ClientData**

Replace o conteúdo de `backend/app/Domains/Commercial/Data/ClientData.php` por:

```php
<?php

namespace App\Domains\Commercial\Data;

use App\Shared\Rules\ValidRut;
use Spatie\LaravelData\Attributes\DataCollectionOf;
use Spatie\LaravelData\Attributes\Validation\Email;
use Spatie\LaravelData\Attributes\Validation\In;
use Spatie\LaravelData\Attributes\Validation\Required;
use Spatie\LaravelData\Data;
use Spatie\LaravelData\Optional;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * Contrato do cadastro de cliente. Carrega os campos do usuário-empresa
 * (name/rut/email/phone) + os do próprio client + nested addresses/contacts.
 * A unicidade do RUT é checada na Action (não aqui — ver nota no plano).
 */
#[TypeScript]
class ClientData extends Data
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
        #[Required]
        public string $legal_name,
        #[In('client', 'provider', 'other')]
        public string $type = 'client',
        public string|Optional|null $business_activity = null,
        /** @var array<ClientAddressData> */
        #[DataCollectionOf(ClientAddressData::class)]
        public array $addresses = [],
        /** @var array<ClientContactData> */
        #[DataCollectionOf(ClientContactData::class)]
        public array $contacts = [],
    ) {}

    public static function rules(): array
    {
        return [
            'rut' => ['required', 'string', new ValidRut],
        ];
    }

    /**
     * Hidrata o DTO do model, achatando os campos do user (name/rut/email/
     * phone) para o topo. Usado nas respostas do ClientController.
     */
    public static function fromModel(\App\Domains\Commercial\Models\Client $client): self
    {
        return new self(
            id: $client->id,
            name: $client->user->name,
            rut: $client->user->rut,
            email: $client->user->email,
            phone: $client->user->phone,
            legal_name: $client->legal_name,
            type: $client->type,
            business_activity: $client->business_activity,
            addresses: ClientAddressData::collect($client->addresses->all()),
            contacts: ClientContactData::collect($client->contacts->all()),
        );
    }
}
```

- [ ] **Step 7: Criar RedatorData**

Create `backend/app/Domains/Identity/Data/RedatorData.php`:

```php
<?php

namespace App\Domains\Identity\Data;

use App\Shared\Rules\ValidRut;
use Spatie\LaravelData\Attributes\Validation\Email;
use Spatie\LaravelData\Attributes\Validation\Required;
use Spatie\LaravelData\Data;
use Spatie\LaravelData\Optional;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * Contrato do cadastro de redator (professor). Campos do usuário-redator.
 * Documentos de idoneidade sobem em multipart, tratados no controller.
 */
#[TypeScript]
class RedatorData extends Data
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
    ) {}

    public static function rules(): array
    {
        return [
            'rut' => ['required', 'string', new ValidRut],
        ];
    }
}
```

- [ ] **Step 8: Rodar o teste (deve passar)**

Run: `php artisan test --filter=ClientDataValidationTest`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add backend/app/Domains/Commercial/Data/ backend/app/Domains/Identity/Data/RedatorData.php backend/tests/Feature/Cadastros/ClientDataValidationTest.php
git commit -m "feat(data): DTOs ClientData/AddressData/ContactData/RedatorData + validação RUT"
```

---

### Task 8: CreateClientAction + UpdateClientAction + ClientController (CRUD) + rotas

**Files:**
- Create: `backend/app/Domains/Commercial/Actions/CreateClientAction.php`
- Create: `backend/app/Domains/Commercial/Actions/UpdateClientAction.php`
- Create: `backend/app/Domains/Commercial/Http/Controllers/ClientController.php`
- Create: `backend/app/Domains/Commercial/routes.php`
- Test: `backend/tests/Feature/Cadastros/ClientCrudTest.php`

**Interfaces:**
- Consumes: `ClientData`, `Client`, `User`, `App\Shared\Support\Rut`.
- Produces:
  - `CreateClientAction::execute(ClientData $data): Client` — transação: cria User(type=cliente, is_active=false) + Client + addresses + contacts. Rejeita RUT duplicado (`ValidationException` no campo `rut`).
  - `UpdateClientAction::execute(Client $client, ClientData $data): Client` — atualiza User+Client+nested (substitui nested). Rejeita RUT duplicado ignorando o próprio user.
  - `ClientController` com `index/store/show/update/destroy` retornando `ClientData`.
  - Rotas resource `api/clients` sob `auth:sanctum`.

- [ ] **Step 1: Escrever o teste de CRUD**

Create `backend/tests/Feature/Cadastros/ClientCrudTest.php`:

```php
<?php

namespace Tests\Feature\Cadastros;

use App\Domains\Identity\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ClientCrudTest extends TestCase
{
    use RefreshDatabase;

    private function actingAdmin(): User
    {
        $admin = User::factory()->create(['type' => 'admin', 'is_active' => true]);
        $this->actingAs($admin);

        return $admin;
    }

    private function payload(array $override = []): array
    {
        return array_merge([
            'name'              => 'Switch Chile',
            'rut'               => '12.345.678-5',
            'email'             => 'info@switch.cl',
            'legal_name'        => 'Switch Chile Ltda',
            'type'              => 'client',
            'business_activity' => 'Instalaciones Eléctricas',
            'addresses'         => [['commune' => 'Providencia', 'city' => 'Santiago', 'region' => 'RM', 'is_primary' => true]],
            'contacts'          => [['name' => 'Parris Barrios', 'email' => 'p@switch.cl', 'is_primary' => true]],
        ], $override);
    }

    public function test_cria_cliente_completo(): void
    {
        $this->actingAdmin();

        $this->postJson('/api/clients', $this->payload())
            ->assertCreated()
            ->assertJsonPath('legal_name', 'Switch Chile Ltda')
            ->assertJsonPath('addresses.0.commune', 'Providencia')
            ->assertJsonPath('contacts.0.name', 'Parris Barrios');

        $this->assertDatabaseHas('users', ['email' => 'info@switch.cl', 'type' => 'cliente', 'is_active' => false]);
        $this->assertDatabaseHas('clients', ['legal_name' => 'Switch Chile Ltda']);
        $this->assertDatabaseHas('client_addresses', ['commune' => 'Providencia']);
        $this->assertDatabaseHas('client_contacts', ['name' => 'Parris Barrios']);
    }

    public function test_rut_duplicado_rejeitado(): void
    {
        $this->actingAdmin();
        User::factory()->create(['rut' => '12.345.678-5']);

        $this->postJson('/api/clients', $this->payload())
            ->assertStatus(422)
            ->assertJsonValidationErrors('rut');
    }

    public function test_lista_mostra_e_atualiza_e_remove(): void
    {
        $this->actingAdmin();

        $id = $this->postJson('/api/clients', $this->payload())->json('id');

        $this->getJson('/api/clients')->assertOk()->assertJsonCount(1);
        $this->getJson("/api/clients/{$id}")->assertOk()->assertJsonPath('id', $id);

        $this->putJson("/api/clients/{$id}", $this->payload(['legal_name' => 'Switch Chile SpA']))
            ->assertOk()
            ->assertJsonPath('legal_name', 'Switch Chile SpA');

        $this->deleteJson("/api/clients/{$id}")->assertNoContent();
        $this->assertSoftDeleted('clients', ['id' => $id]);
    }

    public function test_exige_autenticacao(): void
    {
        $this->postJson('/api/clients', $this->payload())->assertStatus(401);
    }
}
```

- [ ] **Step 2: Rodar o teste (deve falhar — rotas/controller não existem)**

Run: `php artisan test --filter=ClientCrudTest`
Expected: FAIL (404/500 — sem rota `api/clients`).

- [ ] **Step 3: Implementar CreateClientAction**

Create `backend/app/Domains/Commercial/Actions/CreateClientAction.php`:

```php
<?php

namespace App\Domains\Commercial\Actions;

use App\Domains\Commercial\Data\ClientData;
use App\Domains\Commercial\Models\Client;
use App\Domains\Identity\Models\User;
use App\Shared\Support\Rut;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Cria o cliente completo (usuário-empresa + client + nested) numa transação.
 * O usuário-cliente não loga (RN-01): is_active=false, senha placeholder.
 */
class CreateClientAction
{
    public function execute(ClientData $data): Client
    {
        $rut = Rut::parse($data->rut)->format();

        if (User::where('rut', $rut)->exists()) {
            throw ValidationException::withMessages(['rut' => 'Este RUT já está cadastrado.']);
        }

        return DB::transaction(function () use ($data, $rut) {
            $user = User::create([
                'name'      => $data->name,
                'rut'       => $rut,
                'email'     => $data->email,
                'phone'     => $data->phone instanceof \Spatie\LaravelData\Optional ? null : $data->phone,
                'password'  => bin2hex(random_bytes(16)), // placeholder; cliente não loga
                'type'      => 'cliente',
                'is_active' => false,
            ]);

            $client = $user->client()->create([
                'legal_name'        => $data->legal_name,
                'type'              => $data->type,
                'business_activity' => $data->business_activity instanceof \Spatie\LaravelData\Optional ? null : $data->business_activity,
            ]);

            foreach ($data->addresses as $address) {
                $client->addresses()->create($address->toArray());
            }

            foreach ($data->contacts as $contact) {
                $client->contacts()->create($contact->toArray());
            }

            return $client->load(['user', 'addresses', 'contacts']);
        });
    }
}
```

- [ ] **Step 4: Implementar UpdateClientAction**

Create `backend/app/Domains/Commercial/Actions/UpdateClientAction.php`:

```php
<?php

namespace App\Domains\Commercial\Actions;

use App\Domains\Commercial\Data\ClientData;
use App\Domains\Commercial\Models\Client;
use App\Domains\Identity\Models\User;
use App\Shared\Support\Rut;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Spatie\LaravelData\Optional;

/**
 * Atualiza usuário-empresa + client + nested. Nested são substituídos
 * (replace) — simples e previsível para ~10 usuários internos.
 */
class UpdateClientAction
{
    public function execute(Client $client, ClientData $data): Client
    {
        $rut = Rut::parse($data->rut)->format();

        $duplicate = User::where('rut', $rut)
            ->where('id', '!=', $client->user_id)
            ->exists();

        if ($duplicate) {
            throw ValidationException::withMessages(['rut' => 'Este RUT já está cadastrado.']);
        }

        return DB::transaction(function () use ($client, $data, $rut) {
            $client->user->update([
                'name'  => $data->name,
                'rut'   => $rut,
                'email' => $data->email,
                'phone' => $data->phone instanceof Optional ? null : $data->phone,
            ]);

            $client->update([
                'legal_name'        => $data->legal_name,
                'type'              => $data->type,
                'business_activity' => $data->business_activity instanceof Optional ? null : $data->business_activity,
            ]);

            $client->addresses()->delete();
            foreach ($data->addresses as $address) {
                $client->addresses()->create($address->toArray());
            }

            $client->contacts()->delete();
            foreach ($data->contacts as $contact) {
                $client->contacts()->create($contact->toArray());
            }

            return $client->fresh()->load(['user', 'addresses', 'contacts']);
        });
    }
}
```

- [ ] **Step 5: Implementar ClientController**

Create `backend/app/Domains/Commercial/Http/Controllers/ClientController.php` (usa `ClientData::fromModel` — Task 7 — para achatar os campos do user):

```php
<?php

namespace App\Domains\Commercial\Http\Controllers;

use App\Domains\Commercial\Actions\CreateClientAction;
use App\Domains\Commercial\Actions\UpdateClientAction;
use App\Domains\Commercial\Data\ClientData;
use App\Domains\Commercial\Models\Client;
use App\Http\Controllers\Controller;
use Illuminate\Http\Response;

class ClientController extends Controller
{
    /** @return array<ClientData> */
    public function index(): array
    {
        return Client::with(['user', 'addresses', 'contacts'])
            ->get()
            ->map(fn (Client $c) => ClientData::fromModel($c))
            ->all();
    }

    public function store(ClientData $data, CreateClientAction $action): ClientData
    {
        return ClientData::fromModel($action->execute($data));
    }

    public function show(Client $client): ClientData
    {
        return ClientData::fromModel($client->load(['user', 'addresses', 'contacts']));
    }

    public function update(ClientData $data, Client $client, UpdateClientAction $action): ClientData
    {
        return ClientData::fromModel($action->execute($client, $data));
    }

    public function destroy(Client $client): Response
    {
        $client->delete();

        return response()->noContent();
    }
}
```

- [ ] **Step 6: Declarar as rotas do domínio Commercial**

Create `backend/app/Domains/Commercial/routes.php`:

```php
<?php

use App\Domains\Commercial\Http\Controllers\ClientController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth:sanctum')->group(function () {
    Route::apiResource('clients', ClientController::class);
});
```

- [ ] **Step 7: Rodar o teste (deve passar)**

Run: `php artisan test --filter=ClientCrudTest`
Expected: PASS (4 testes).

- [ ] **Step 8: Commit**

```bash
git add backend/app/Domains/Commercial/ backend/tests/Feature/Cadastros/ClientCrudTest.php
git commit -m "feat(commercial): CRUD de cliente (Create/Update actions + controller + rotas)"
```

---

### Task 9: Endpoints nested de endereços e contatos (3.1.5)

Endpoints para gerenciar endereços/contatos de um cliente individualmente (além do payload completo do cliente).

**Files:**
- Create: `backend/app/Domains/Commercial/Http/Controllers/ClientAddressController.php`
- Create: `backend/app/Domains/Commercial/Http/Controllers/ClientContactController.php`
- Modify: `backend/app/Domains/Commercial/routes.php`
- Test: `backend/tests/Feature/Cadastros/ClientNestedTest.php`

**Interfaces:**
- Consumes: `Client`, `ClientAddressData`, `ClientContactData`, `ClientAddress`, `ClientContact`.
- Produces: rotas nested `api/clients/{client}/addresses` e `api/clients/{client}/contacts` (store), `api/addresses/{address}` e `api/contacts/{contact}` (update/destroy).

- [ ] **Step 1: Escrever o teste**

Create `backend/tests/Feature/Cadastros/ClientNestedTest.php`:

```php
<?php

namespace Tests\Feature\Cadastros;

use App\Domains\Commercial\Models\Client;
use App\Domains\Identity\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ClientNestedTest extends TestCase
{
    use RefreshDatabase;

    private function makeClient(): Client
    {
        $this->actingAs(User::factory()->create(['type' => 'admin', 'is_active' => true]));
        $user = User::factory()->create(['type' => 'cliente', 'is_active' => false]);

        return $user->client()->create([
            'legal_name' => 'ACME Ltda',
            'type'       => 'client',
        ]);
    }

    public function test_adiciona_endereco_aninhado(): void
    {
        $client = $this->makeClient();

        $this->postJson("/api/clients/{$client->id}/addresses", [
            'commune' => 'Ñuñoa', 'city' => 'Santiago', 'region' => 'RM', 'is_primary' => true,
        ])->assertCreated()->assertJsonPath('commune', 'Ñuñoa');

        $this->assertDatabaseHas('client_addresses', ['client_id' => $client->id, 'commune' => 'Ñuñoa']);
    }

    public function test_adiciona_contato_aninhado(): void
    {
        $client = $this->makeClient();

        $this->postJson("/api/clients/{$client->id}/contacts", [
            'name' => 'Nelson Gonzalez', 'email' => 'n@acme.cl',
        ])->assertCreated()->assertJsonPath('name', 'Nelson Gonzalez');

        $this->assertDatabaseHas('client_contacts', ['client_id' => $client->id, 'name' => 'Nelson Gonzalez']);
    }
}
```

- [ ] **Step 2: Rodar o teste (deve falhar)**

Run: `php artisan test --filter=ClientNestedTest`
Expected: FAIL (rotas nested não existem).

- [ ] **Step 3: Implementar ClientAddressController**

Create `backend/app/Domains/Commercial/Http/Controllers/ClientAddressController.php`:

```php
<?php

namespace App\Domains\Commercial\Http\Controllers;

use App\Domains\Commercial\Data\ClientAddressData;
use App\Domains\Commercial\Models\Client;
use App\Domains\Commercial\Models\ClientAddress;
use App\Http\Controllers\Controller;
use Illuminate\Http\Response;

class ClientAddressController extends Controller
{
    public function store(ClientAddressData $data, Client $client): ClientAddressData
    {
        $address = $client->addresses()->create($data->toArray());

        return ClientAddressData::from($address);
    }

    public function update(ClientAddressData $data, ClientAddress $address): ClientAddressData
    {
        $address->update($data->toArray());

        return ClientAddressData::from($address->fresh());
    }

    public function destroy(ClientAddress $address): Response
    {
        $address->delete();

        return response()->noContent();
    }
}
```

- [ ] **Step 4: Implementar ClientContactController**

Create `backend/app/Domains/Commercial/Http/Controllers/ClientContactController.php`:

```php
<?php

namespace App\Domains\Commercial\Http\Controllers;

use App\Domains\Commercial\Data\ClientContactData;
use App\Domains\Commercial\Models\Client;
use App\Domains\Commercial\Models\ClientContact;
use App\Http\Controllers\Controller;
use Illuminate\Http\Response;

class ClientContactController extends Controller
{
    public function store(ClientContactData $data, Client $client): ClientContactData
    {
        $contact = $client->contacts()->create($data->toArray());

        return ClientContactData::from($contact);
    }

    public function update(ClientContactData $data, ClientContact $contact): ClientContactData
    {
        $contact->update($data->toArray());

        return ClientContactData::from($contact->fresh());
    }

    public function destroy(ClientContact $contact): Response
    {
        $contact->delete();

        return response()->noContent();
    }
}
```

- [ ] **Step 5: Adicionar as rotas nested**

Replace o conteúdo de `backend/app/Domains/Commercial/routes.php` por:

```php
<?php

use App\Domains\Commercial\Http\Controllers\ClientAddressController;
use App\Domains\Commercial\Http\Controllers\ClientContactController;
use App\Domains\Commercial\Http\Controllers\ClientController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth:sanctum')->group(function () {
    Route::apiResource('clients', ClientController::class);

    // Nested: gerenciar endereços/contatos de um cliente individualmente.
    Route::post('clients/{client}/addresses', [ClientAddressController::class, 'store']);
    Route::put('addresses/{address}', [ClientAddressController::class, 'update']);
    Route::delete('addresses/{address}', [ClientAddressController::class, 'destroy']);

    Route::post('clients/{client}/contacts', [ClientContactController::class, 'store']);
    Route::put('contacts/{contact}', [ClientContactController::class, 'update']);
    Route::delete('contacts/{contact}', [ClientContactController::class, 'destroy']);
});
```

- [ ] **Step 6: Rodar o teste (deve passar)**

Run: `php artisan test --filter=ClientNestedTest`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add backend/app/Domains/Commercial/Http/Controllers/ClientAddressController.php backend/app/Domains/Commercial/Http/Controllers/ClientContactController.php backend/app/Domains/Commercial/routes.php backend/tests/Feature/Cadastros/ClientNestedTest.php
git commit -m "feat(commercial): endpoints nested de endereços e contatos (3.1.5)"
```

---

### Task 10: MinIO no dev + UploadFileAction (S3 + URL pré-assinada)

Setup do MinIO (S3-compatível) para o dev espelhar prod (ADR-11), + a Action de upload. Decisão confirmada: MinIO no dev (não disco local).

**Files:**
- Modify: `docker-compose.yml`
- Modify: `backend/.env.example`
- Modify: `backend/phpunit.xml`
- Create: `backend/app/Shared/Files/Actions/UploadFileAction.php`
- Test: `backend/tests/Feature/Cadastros/UploadFileActionTest.php`

**Interfaces:**
- Consumes: `App\Shared\Files\Models\File`, `Illuminate\Http\UploadedFile`, `Illuminate\Database\Eloquent\Model` (dono morph).
- Produces: `UploadFileAction::execute(Model $owner, UploadedFile $file, string $type, ?string $disk = null): File` — grava no disco (default `config('filesystems.default')`), cria o registro `files`, retorna o `File`. `temporaryUrl(File $file, int $minutes = 10, ?string $disk = null): string` gera URL pré-assinada.
- Config: disco default de dev/teste = `s3` (MinIO no dev; `Storage::fake('s3')` nos testes).

- [ ] **Step 1: Adicionar MinIO ao docker-compose**

Em `docker-compose.yml`: adicionar o serviço `minio` + o helper `createbuckets` (dentro de `services:`), incluir `minio` no `depends_on` do `app`, e declarar o volume `lotus-minio`.

Serviços a acrescentar:

```yaml
  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: lotus
      MINIO_ROOT_PASSWORD: lotus-secret
    ports: ["9000:9000", "9001:9001"]
    volumes:
      - lotus-minio:/data

  createbuckets:
    image: minio/mc
    depends_on: [minio]
    entrypoint: >
      /bin/sh -c "
      until (/usr/bin/mc alias set local http://minio:9000 lotus lotus-secret) do echo waiting for minio; sleep 2; done;
      /usr/bin/mc mb -p local/lotus;
      exit 0;
      "
```

Alterar o `depends_on` do `app` para `depends_on: [mysql, gotenberg, minio]` e o bloco final de volumes para:

```yaml
volumes:
  lotus-db:
  lotus-minio:
```

- [ ] **Step 2: Configurar o disco s3 (MinIO) no .env.example**

Em `backend/.env.example`, trocar `FILESYSTEM_DISK=local` por `FILESYSTEM_DISK=s3` e substituir o bloco AWS por (endpoint interno `minio:9000` para o app; `AWS_URL` público em `localhost:9000` para o browser):

```dotenv
FILESYSTEM_DISK=s3
AWS_ACCESS_KEY_ID=lotus
AWS_SECRET_ACCESS_KEY=lotus-secret
AWS_DEFAULT_REGION=us-east-1
AWS_BUCKET=lotus
AWS_ENDPOINT=http://minio:9000
AWS_URL=http://localhost:9000/lotus
AWS_USE_PATH_STYLE_ENDPOINT=true
```

Replicar `FILESYSTEM_DISK=s3` + as chaves AWS no seu `backend/.env` local (não versionado).

- [ ] **Step 3: Forçar o disco s3 nos testes (fake alinhado com a Action)**

Em `backend/phpunit.xml`, dentro do bloco `<php>`, adicionar junto às outras `<env>`:

```xml
        <env name="FILESYSTEM_DISK" value="s3"/>
```

Assim `config('filesystems.default')` = `s3` nos testes, e `Storage::fake('s3')` casa com o disco que a Action usa por padrão.

- [ ] **Step 4: Subir MinIO e confirmar o bucket**

Run: `docker compose up -d minio createbuckets`
Then: `docker compose run --rm app php -r "var_dump((bool) @fsockopen('minio', 9000));"`
Expected: `bool(true)` (app enxerga o MinIO). Console web em http://localhost:9001 (login lotus / lotus-secret) mostra o bucket `lotus`.

- [ ] **Step 5: Escrever o teste (com Storage::fake)**

Create `backend/tests/Feature/Cadastros/UploadFileActionTest.php`:

```php
<?php

namespace Tests\Feature\Cadastros;

use App\Domains\Identity\Models\Redator;
use App\Domains\Identity\Models\User;
use App\Shared\Files\Actions\UploadFileAction;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class UploadFileActionTest extends TestCase
{
    use RefreshDatabase;

    public function test_upload_grava_no_disco_e_registra_em_files(): void
    {
        Storage::fake('s3');

        $redator = Redator::create(['user_id' => User::factory()->redator()->create()->id]);
        $upload = UploadedFile::fake()->create('cv.pdf', 500, 'application/pdf');

        $file = app(UploadFileAction::class)->execute($redator, $upload, 'cv', 's3');

        Storage::disk('s3')->assertExists($file->path);
        $this->assertDatabaseHas('files', [
            'fileable_type' => 'redator',
            'fileable_id'   => $redator->id,
            'type'          => 'cv',
            'original_name' => 'cv.pdf',
        ]);
        $this->assertSame('redator', $file->fileable_type);
    }
}
```

- [ ] **Step 6: Rodar o teste (deve falhar)**

Run: `php artisan test --filter=UploadFileActionTest`
Expected: FAIL ("Class App\Shared\Files\Actions\UploadFileAction not found").

- [ ] **Step 7: Implementar UploadFileAction**

Create `backend/app/Shared/Files/Actions/UploadFileAction.php`:

```php
<?php

namespace App\Shared\Files\Actions;

use App\Shared\Files\Models\File;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

/**
 * Sobe um arquivo para o disco (S3 em prod; MinIO/local em dev) e registra
 * em `files` (polimórfico). O binário NÃO passa a ser servido pela app — o
 * acesso é por URL pré-assinada temporária (ADR-11).
 */
class UploadFileAction
{
    public function execute(Model $owner, UploadedFile $file, string $type, ?string $disk = null): File
    {
        $disk ??= config('filesystems.default');

        $morphType = $owner->getMorphClass();
        $path = $file->store("{$morphType}/{$owner->getKey()}", $disk);

        return $owner->morphMany(File::class, 'fileable')->create([
            'type'          => $type,
            'path'          => $path,
            'original_name' => $file->getClientOriginalName(),
            'mime'          => $file->getClientMimeType(),
            'size'          => $file->getSize(),
        ]);
    }

    /**
     * URL pré-assinada temporária. Funciona no driver s3 (S3 real ou MinIO);
     * o driver `local` NÃO suporta — nesse caso o teste de expiração fica
     * pendente para o ambiente com MinIO (ver spec §8).
     */
    public function temporaryUrl(File $file, int $minutes = 10, ?string $disk = null): string
    {
        $disk ??= config('filesystems.default');

        return Storage::disk($disk)->temporaryUrl($file->path, now()->addMinutes($minutes));
    }
}
```

- [ ] **Step 8: Rodar o teste (deve passar)**

Run: `php artisan test --filter=UploadFileActionTest`
Expected: PASS.

> Nota: `Storage::fake('s3')` usa um driver local que não assina URL — por isso o `temporaryUrl()` é verificado de verdade contra o MinIO no próximo step.

- [ ] **Step 9: Verificar a URL pré-assinada real contra o MinIO (fecha o ADR-11)**

Run (de `backend/`, com MinIO no ar):

```bash
docker compose run --rm app php artisan tinker --execute="
use Illuminate\Support\Facades\Storage;
Storage::disk('s3')->put('smoke/test.txt', 'ok');
\$url = Storage::disk('s3')->temporaryUrl('smoke/test.txt', now()->addMinutes(5));
echo \$url, PHP_EOL;
echo file_get_contents(str_replace('localhost:9000', 'minio:9000', \$url)), PHP_EOL;
"
```

Expected: imprime uma URL assinada (com `X-Amz-Signature`) e, na linha seguinte, `ok` (o conteúdo baixado via URL temporária de dentro da rede do compose). Comprova upload + presigned funcionando. (Do browser no host, a URL usa `localhost:9000`; de dentro do container, `minio:9000` — split-horizon esperado do MinIO em dev.)

- [ ] **Step 10: Commit**

```bash
git add docker-compose.yml backend/.env.example backend/phpunit.xml backend/app/Shared/Files/Actions/UploadFileAction.php backend/tests/Feature/Cadastros/UploadFileActionTest.php
git commit -m "feat(files): MinIO no dev + UploadFileAction (store + presigned, ADR-11)"
```

---

### Task 11: CreateRedatorAction + RedatorController (CRUD) + rotas

**Files:**
- Create: `backend/app/Domains/Identity/Actions/CreateRedatorAction.php`
- Create: `backend/app/Domains/Identity/Http/Controllers/RedatorController.php`
- Modify: `backend/app/Domains/Identity/routes.php`
- Test: `backend/tests/Feature/Cadastros/RedatorCrudTest.php`

**Interfaces:**
- Consumes: `RedatorData`, `Redator`, `User`, `UploadFileAction`, `App\Shared\Support\Rut`.
- Produces:
  - `CreateRedatorAction::execute(RedatorData $data, array $documents = []): Redator` — transação: cria User(type=redator, is_active=false) + Redator + sobe documentos. Rejeita RUT duplicado.
  - `RedatorController` com `index/store/show/destroy` retornando `RedatorData`.
  - Rotas `api/redatores` sob `auth:sanctum`.

- [ ] **Step 1: Escrever o teste**

Create `backend/tests/Feature/Cadastros/RedatorCrudTest.php`:

```php
<?php

namespace Tests\Feature\Cadastros;

use App\Domains\Identity\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class RedatorCrudTest extends TestCase
{
    use RefreshDatabase;

    private function actingAdmin(): void
    {
        $this->actingAs(User::factory()->create(['type' => 'admin', 'is_active' => true]));
    }

    public function test_cria_redator_com_documento(): void
    {
        Storage::fake('s3');
        $this->actingAdmin();

        $response = $this->postJson('/api/redatores', [
            'name'      => 'Magallanes Acuña',
            'rut'       => '20.347.878-K',
            'email'     => 'mao@lotus.cl',
            'documents' => [UploadedFile::fake()->create('cv.pdf', 400, 'application/pdf')],
        ]);

        $response->assertCreated()->assertJsonPath('name', 'Magallanes Acuña');

        $this->assertDatabaseHas('users', ['email' => 'mao@lotus.cl', 'type' => 'redator']);
        $this->assertDatabaseHas('redatores', ['user_id' => User::where('email', 'mao@lotus.cl')->first()->id]);
        $this->assertDatabaseHas('files', ['fileable_type' => 'redator', 'type' => 'documento']);
    }

    public function test_rut_duplicado_rejeitado(): void
    {
        $this->actingAdmin();
        User::factory()->create(['rut' => '20.347.878-K']);

        $this->postJson('/api/redatores', [
            'name'  => 'Outro',
            'rut'   => '20.347.878-K',
            'email' => 'outro@lotus.cl',
        ])->assertStatus(422)->assertJsonValidationErrors('rut');
    }

    public function test_lista_mostra_remove(): void
    {
        Storage::fake('s3');
        $this->actingAdmin();

        $id = $this->postJson('/api/redatores', [
            'name' => 'Fabián Cifuentes', 'rut' => '12.345.678-5', 'email' => 'fc@lotus.cl',
        ])->json('id');

        $this->getJson('/api/redatores')->assertOk()->assertJsonCount(1);
        $this->getJson("/api/redatores/{$id}")->assertOk()->assertJsonPath('id', $id);
        $this->deleteJson("/api/redatores/{$id}")->assertNoContent();
        $this->assertSoftDeleted('redatores', ['id' => $id]);
    }
}
```

- [ ] **Step 2: Rodar o teste (deve falhar)**

Run: `php artisan test --filter=RedatorCrudTest`
Expected: FAIL (sem rota `api/redatores`).

- [ ] **Step 3: Implementar CreateRedatorAction**

Create `backend/app/Domains/Identity/Actions/CreateRedatorAction.php`:

```php
<?php

namespace App\Domains\Identity\Actions;

use App\Domains\Identity\Data\RedatorData;
use App\Domains\Identity\Models\Redator;
use App\Domains\Identity\Models\User;
use App\Shared\Files\Actions\UploadFileAction;
use App\Shared\Support\Rut;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Spatie\LaravelData\Optional;

/**
 * Cria o redator (usuário-redator + redator + documentos) numa transação.
 * is_active=false até ativação (definição de senha é fluxo à parte).
 *
 * @param  array<UploadedFile>  $documents
 */
class CreateRedatorAction
{
    public function __construct(private UploadFileAction $uploads) {}

    public function execute(RedatorData $data, array $documents = []): Redator
    {
        $rut = Rut::parse($data->rut)->format();

        if (User::where('rut', $rut)->exists()) {
            throw ValidationException::withMessages(['rut' => 'Este RUT já está cadastrado.']);
        }

        return DB::transaction(function () use ($data, $rut, $documents) {
            $user = User::create([
                'name'      => $data->name,
                'rut'       => $rut,
                'email'     => $data->email,
                'phone'     => $data->phone instanceof Optional ? null : $data->phone,
                'password'  => bin2hex(random_bytes(16)), // placeholder até ativação
                'type'      => 'redator',
                'is_active' => false,
            ]);

            $redator = $user->redator()->create([]);

            foreach ($documents as $document) {
                $this->uploads->execute($redator, $document, 'documento');
            }

            return $redator->load(['user', 'documents']);
        });
    }
}
```

- [ ] **Step 4: Implementar RedatorController**

Create `backend/app/Domains/Identity/Http/Controllers/RedatorController.php`:

```php
<?php

namespace App\Domains\Identity\Http\Controllers;

use App\Domains\Identity\Actions\CreateRedatorAction;
use App\Domains\Identity\Data\RedatorData;
use App\Domains\Identity\Models\Redator;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class RedatorController extends Controller
{
    public function index(): array
    {
        return Redator::with('user')->get()
            ->map(fn (Redator $r) => RedatorData::from([
                'id'    => $r->id,
                'name'  => $r->user->name,
                'rut'   => $r->user->rut,
                'email' => $r->user->email,
                'phone' => $r->user->phone,
            ]))
            ->all();
    }

    public function store(RedatorData $data, Request $request, CreateRedatorAction $action): RedatorData
    {
        $redator = $action->execute($data, $request->file('documents', []));

        return RedatorData::from([
            'id'    => $redator->id,
            'name'  => $redator->user->name,
            'rut'   => $redator->user->rut,
            'email' => $redator->user->email,
            'phone' => $redator->user->phone,
        ]);
    }

    public function show(Redator $redator): RedatorData
    {
        $redator->load('user');

        return RedatorData::from([
            'id'    => $redator->id,
            'name'  => $redator->user->name,
            'rut'   => $redator->user->rut,
            'email' => $redator->user->email,
            'phone' => $redator->user->phone,
        ]);
    }

    public function destroy(Redator $redator): Response
    {
        $redator->delete();

        return response()->noContent();
    }
}
```

- [ ] **Step 5: Adicionar as rotas de redator no Identity/routes.php**

Replace o conteúdo de `backend/app/Domains/Identity/routes.php` por:

```php
<?php

use App\Domains\Identity\Http\Controllers\AuthController;
use App\Domains\Identity\Http\Controllers\RedatorController;
use Illuminate\Support\Facades\Route;

Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);

    Route::apiResource('redatores', RedatorController::class)->only(['index', 'store', 'show', 'destroy']);
});
```

- [ ] **Step 6: Rodar o teste (deve passar)**

Run: `php artisan test --filter=RedatorCrudTest`
Expected: PASS.

- [ ] **Step 7: Rodar a suíte inteira (regressão geral)**

Run: `php artisan test`
Expected: PASS (todas as suítes, incluindo auth/RBAC anteriores).

- [ ] **Step 8: Commit**

```bash
git add backend/app/Domains/Identity/Actions/CreateRedatorAction.php backend/app/Domains/Identity/Http/Controllers/RedatorController.php backend/app/Domains/Identity/routes.php backend/tests/Feature/Cadastros/RedatorCrudTest.php
git commit -m "feat(identity): CRUD de redator (Create action + upload de documentos + rotas)"
```

---

### Task 12: Regenerar tipos TS + verificação final

**Files:**
- Modify (gerado): `frontend/src/shared/types/generated.ts`

**Interfaces:**
- Consumes: DTOs `#[TypeScript]` das tasks 7.
- Produces: tipos TS `ClientData`, `ClientAddressData`, `ClientContactData`, `RedatorData` em `generated.ts`.

- [ ] **Step 1: Rodar o transformer**

Run (de `backend/`): `php artisan typescript:transform`
Expected: sem erro; menciona os DTOs transformados.

- [ ] **Step 2: Verificar que os tipos apareceram**

Run: `grep -E "ClientData|ClientAddressData|ClientContactData|RedatorData" frontend/src/shared/types/generated.ts`
Expected: as 4 interfaces aparecem.

- [ ] **Step 3: Type-check do frontend (garante que generated.ts é válido)**

Run (de `frontend/`): `pnpm build`
Expected: `tsc -b` sem erros.

- [ ] **Step 4: Rodar a suíte backend inteira uma última vez**

Run (de `backend/`): `php artisan test`
Expected: PASS (tudo verde).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/shared/types/generated.ts
git commit -m "chore(types): regenera tipos TS dos DTOs de cadastro (ADR-04)"
```

---

## Notas de escopo / follow-ups (fora deste plano)

- **Sincronizar o canônico do Drive** (`lotus_modelo_fisico.sql`, `modelo-fisico-e-diagramas.md`) e `docs/der-fisico.md` para o schema em inglês — pendente de autorização do João Victor (write externo).
- **Atualizar Status** das tasks 3.1.x / 4.1.x no Notion para "Concluída" conforme cada uma fecha.
- ~~Decisão MinIO vs local para dev~~ → **MinIO** (Task 10). Presigned verificado contra MinIO no dev.
- **Frontend Sprint 1** (telas/formulários de cliente e redator) — plano separado.
- **RBAC fino por policy** nos controllers de cadastro (hoje só `auth:sanctum`).
- **Fluxo de ativação/senha** do redator (define senha + is_active=true) — não coberto pelo cadastro.

## Self-Review (cobertura do spec)

- Spec §4 (schema) → Task 3. §5 (models) → Tasks 4,5,6. §6/§7 (DTOs + RUT) → Tasks 2,7. §8 (upload S3) → Task 10. §9 (controllers/rotas/wiring) → Tasks 1,8,9,11. §10 (actions) → Tasks 8,10,11. §11 (verificação) → testes em cada task + Task 12. §3 (correções C1–C5) → Tasks 3,5,6. Tasks Notion 3.1.1→T3, 3.1.2→T5, 3.1.3→T7, 3.1.4→T8, 3.1.5→T9, 4.1.1→T3, 4.1.2→T6, 4.1.3→T10, 4.1.4→T11. Sem lacunas.
