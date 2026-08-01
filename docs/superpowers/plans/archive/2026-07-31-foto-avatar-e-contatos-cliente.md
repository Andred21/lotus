# Foto/avatar das entidades derivadas de User + refino dos contatos do cliente — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dar às 4 entidades derivadas de `User` (staff, redator, aluno, cliente) um fluxo completo de foto — expor, subir, substituir e remover — e reestruturar os contatos do cliente em cards com labels, indicação de principal e exclusão.

**Architecture:** A foto vive em `users.photo_path` (coluna já existente), fora da tabela `files`. Um único `UserPhotoService` no domínio Identity concentra `store`/`remove`/`urlFor`; 4 controllers finos o expõem em rotas nested, cada uma sob a permissão do seu módulo. No frontend, `AppPhotoField` (apresentacional) + `useEntityPhoto` (orquestração, em `shared/`) servem os 4 diálogos sem que feature importe feature.

**Tech Stack:** Laravel 13 / PHP 8.3, spatie/laravel-data, spatie/laravel-permission, owen-it/laravel-auditing, S3/MinIO · React 19 + TS, TanStack Query, PrimeReact via `shared/ui`, Tailwind v4.

**Spec:** `docs/superpowers/specs/2026-07-31-foto-avatar-e-contatos-cliente-design.md` (D1–D15)
**Context packet:** `docs/superpowers/context-packets/foto-avatar-e-contatos-cliente.md` (`partial`)

## Global Constraints

- **Backend roda no container.** `docker compose exec -T app php artisan test` — o host WSL não tem mbstring.
- **Pint roda no host, de dentro de `backend/`, SEMPRE com argumento:** `cd backend && ./vendor/bin/pint <arquivos>`. Nunca sem argumento.
- **`generated.ts` não se edita à mão** (lei §5.3). Regenera-se com `docker compose exec -T app php artisan typescript:transform`.
- **Features não importam PrimeReact direto nem outra feature — nem para tipo** (lei §5.6). Componente novo compartilhado vai para `shared/ui` e é reexportado pelo barrel `shared/ui/index.ts`.
- **Erros sobem ao handler global RFC 7807** (lei §5.4). Nunca `abort(422)` nem montar envelope à mão.
- **3 locales com chaves idênticas:** `frontend/src/shared/config/locales/{es-CL,pt-BR,en}.json`. `es-CL` é a referência de rótulo (cliente chileno). Chave que entra num, entra nos três.
- **Limite da foto:** `mimes:jpg,jpeg,png,webp`, `max:5120` (5 MB) — declarado UMA vez em `UserPhotoService::RULES`.
- **Validade da URL pré-assinada da foto:** 60 minutos (spec D6), contra os 10 minutos dos documentos.
- **Teste de regressão só vale depois de você o ver reprovar contra o código antigo** (`git stash` no fix, roda, `git stash pop`).
- **Gate de verificação do frontend:** `pnpm build` + `pnpm lint`, de dentro de `frontend/`.
- **Baseline da suíte antes deste bloco: 321 passed.** Cada task deve deixar a suíte verde.

---

## Estrutura de arquivos

**Backend — criar:**

| Arquivo | Responsabilidade |
|---|---|
| `backend/app/Domains/Identity/Services/UserPhotoService.php` | Única regra de foto: `RULES`, `store`, `remove`, `urlFor` |
| `backend/app/Domains/Identity/Http/Controllers/UserPhotoController.php` | `POST\|DELETE /api/users/{user}/photo` |
| `backend/app/Domains/Identity/Http/Controllers/RedatorPhotoController.php` | `POST\|DELETE /api/redatores/{redator}/photo` |
| `backend/app/Domains/Identity/Http/Controllers/StudentPhotoController.php` | `POST\|DELETE /api/students/{student}/photo` |
| `backend/app/Domains/Commercial/Http/Controllers/ClientPhotoController.php` | `POST\|DELETE /api/clients/{client}/photo` |
| `backend/tests/Feature/Identity/UserPhotoTest.php` | Ciclo de vida do objeto, validação, permissão, `photo_url` |
| `backend/tests/Feature/Comercial/ClientContactMinimumTest.php` | Regressão do `contacts` mínimo 1 |

**Backend — modificar:** `Data/{UserData,RedatorData,StudentData}.php`, `Commercial/Data/ClientData.php`, `Identity/routes.php`, `Commercial/routes.php`.

**Frontend — criar:**

| Arquivo | Responsabilidade |
|---|---|
| `frontend/src/shared/ui/AppPhotoField/AppPhotoField.tsx` + `index.ts` | Avatar grande + ações. Apresentacional puro |
| `frontend/src/shared/api/photoResource.ts` | Fábrica `{ upload, remove }` por recurso |
| `frontend/src/shared/hooks/useEntityPhoto.ts` | Buffer no create, upload em edit, invalidação, erro |

**Frontend — modificar:** `shared/ui/AppAvatar/AppAvatar.tsx`, `shared/ui/AppFileUpload/AppFileUpload.tsx`, `shared/ui/index.ts`, `shared/lib/upload.ts`, `shared/hooks/index.ts`, `shared/types/generated.ts` (regenerado), as 4 tabelas, os 4 diálogos, `ContactFields.tsx`, `useClientForm.ts`, os 3 locales.

---

## Task 1: `UserPhotoService` — a regra de foto e a ordem de escrita

**Files:**
- Create: `backend/app/Domains/Identity/Services/UserPhotoService.php`
- Test: `backend/tests/Feature/Identity/UserPhotoTest.php`

**Interfaces:**
- Consumes: `App\Domains\Identity\Models\User` (já tem `photo_path` em `$fillable`), `config('filesystems.default')`.
- Produces:
  - `UserPhotoService::RULES` — `array<string, array<string>>`, chave `photo`.
  - `store(User $user, UploadedFile $photo): void`
  - `remove(User $user): void`
  - `urlFor(?string $path): ?string`

> **Por que Service e não Action:** `backend-ddd.md` manda "Domain Service = regra compartilhada entre entidades. Não se duplica." Cliente, redator, aluno e staff são extensões 1:1 de `User`; a foto é do `User`. É o mesmo caso do `UserProvisioner`. Spec D2.

- [ ] **Step 1: Escrever os testes que falham**

Criar `backend/tests/Feature/Identity/UserPhotoTest.php`:

```php
<?php

namespace Tests\Feature\Identity;

use App\Domains\Identity\Models\User;
use App\Domains\Identity\Services\UserPhotoService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * Ciclo de vida do objeto de foto. A ordem de escrita é a decisão D4 da spec:
 * banco primeiro, delete do objeto anterior por último. Apagar o antigo antes
 * do update deixaria a linha apontando para objeto morto se o update falhasse.
 */
class UserPhotoTest extends TestCase
{
    use RefreshDatabase;

    public function test_store_grava_photo_path_e_o_objeto_existe(): void
    {
        $storage = Storage::fake('s3');
        $user = User::factory()->create(['type' => 'admin']);

        app(UserPhotoService::class)->store($user, UploadedFile::fake()->image('foto.jpg'));

        $user->refresh();
        $this->assertNotNull($user->photo_path);
        $storage->assertExists($user->photo_path);
    }

    public function test_substituir_foto_apaga_o_objeto_anterior(): void
    {
        $storage = Storage::fake('s3');
        $user = User::factory()->create(['type' => 'admin']);
        $service = app(UserPhotoService::class);

        $service->store($user, UploadedFile::fake()->image('primeira.jpg'));
        $old = $user->refresh()->photo_path;

        $service->store($user, UploadedFile::fake()->image('segunda.jpg'));
        $new = $user->refresh()->photo_path;

        $this->assertNotSame($old, $new);
        $storage->assertExists($new);
        $storage->assertMissing($old);
    }

    public function test_remove_zera_photo_path_e_apaga_o_objeto(): void
    {
        $storage = Storage::fake('s3');
        $user = User::factory()->create(['type' => 'admin']);
        $service = app(UserPhotoService::class);

        $service->store($user, UploadedFile::fake()->image('foto.jpg'));
        $path = $user->refresh()->photo_path;

        $service->remove($user);

        $this->assertNull($user->refresh()->photo_path);
        $storage->assertMissing($path);
    }

    public function test_remove_sem_foto_e_no_op(): void
    {
        Storage::fake('s3');
        $user = User::factory()->create(['type' => 'admin']);

        app(UserPhotoService::class)->remove($user);

        $this->assertNull($user->refresh()->photo_path);
    }

    public function test_url_for_devolve_null_sem_caminho(): void
    {
        Storage::fake('s3');

        $this->assertNull(app(UserPhotoService::class)->urlFor(null));
    }

    public function test_url_for_devolve_url_temporaria(): void
    {
        Storage::fake('s3');
        $user = User::factory()->create(['type' => 'admin']);
        $service = app(UserPhotoService::class);
        $service->store($user, UploadedFile::fake()->image('foto.jpg'));

        $url = $service->urlFor($user->refresh()->photo_path);

        $this->assertIsString($url);
        $this->assertNotSame('', $url);
    }

    public function test_troca_de_foto_gera_registro_de_auditoria(): void
    {
        Storage::fake('s3');
        $user = User::factory()->create(['type' => 'admin']);

        app(UserPhotoService::class)->store($user, UploadedFile::fake()->image('foto.jpg'));

        // `User` é Auditable — a troca de photo_path entra em `audits` sem
        // código de auditoria próprio (spec D3, lei §5.2).
        $this->assertDatabaseHas('audits', [
            'auditable_type' => 'user',
            'auditable_id' => $user->id,
            'event' => 'updated',
        ]);
    }
}
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
docker compose exec -T app php artisan test --filter=UserPhotoTest
```

Esperado: FAIL com `Class "App\Domains\Identity\Services\UserPhotoService" does not exist`.

- [ ] **Step 3: Implementar o serviço**

Criar `backend/app/Domains/Identity/Services/UserPhotoService.php`:

```php
<?php

namespace App\Domains\Identity\Services;

use App\Domains\Identity\Models\User;
use Illuminate\Filesystem\FilesystemAdapter;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Throwable;

/**
 * Foto de perfil das entidades derivadas de User (staff, redator, aluno,
 * cliente). Vive em `users.photo_path`, FORA da tabela `files`: foto não é
 * documento — não vence, não habilita turma, não entra em certificado (spec
 * D3). A auditoria vem de graça porque `User` é Auditable.
 */
class UserPhotoService
{
    /**
     * Regras de validação da foto. Fonte única — os 4 controllers consomem
     * daqui em vez de recopiar (spec D9). 5120 KB = 5 MB; nginx e PHP aceitam
     * 12 MB, então quem rejeita é sempre esta regra, com envelope RFC 7807.
     *
     * @var array<string, array<int, string>>
     */
    public const RULES = [
        'photo' => ['required', 'file', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
    ];

    /**
     * Validade da URL pré-assinada, em minutos. 60 e não os 10 dos documentos:
     * o documento é baixado no clique, a foto fica renderizada numa listagem
     * aberta — com 10 minutos, a tela aberta por 20 passaria a mostrar iniciais
     * no lugar da foto, degradação indistinguível de "não tem foto" (spec D6).
     */
    private const URL_MINUTES = 60;

    /**
     * Sobe a foto, aponta `photo_path` para ela e só então apaga o objeto
     * anterior (spec D4/J-02: delete imediato, sem retenção).
     *
     * A ORDEM não é detalhe. Apagar o antigo antes do update deixa a linha
     * apontando para um objeto morto se o update falhar — referência mentindo.
     * Apagar depois, e falhar, deixa órfão de storage: custo, não mentira.
     * Sem `DB::transaction`: é um UPDATE de uma linha, e envolver delete de
     * storage numa transação é o débito já registrado no `UploadFileAction`.
     */
    public function store(User $user, UploadedFile $photo): void
    {
        $old = $user->photo_path;
        $new = $photo->store("user-photos/{$user->id}", $this->disk());

        try {
            $user->update(['photo_path' => $new]);
        } catch (Throwable $e) {
            // Compensação: o objeto novo já está no bucket e ninguém aponta
            // para ele.
            $this->deleteObject($new);

            throw $e;
        }

        if ($old !== null) {
            $this->deleteObject($old);
        }
    }

    /** Remove a foto. Sem foto, é no-op — não é erro. */
    public function remove(User $user): void
    {
        $old = $user->photo_path;

        if ($old === null) {
            return;
        }

        $user->update(['photo_path' => null]);
        $this->deleteObject($old);
    }

    /** URL pré-assinada temporária (ADR-11). `null` quando não há foto. */
    public function urlFor(?string $path): ?string
    {
        if ($path === null) {
            return null;
        }

        /** @var FilesystemAdapter $storage */
        $storage = Storage::disk($this->disk());

        return $storage->temporaryUrl($path, now()->addMinutes(self::URL_MINUTES));
    }

    private function disk(): string
    {
        return config('filesystems.default');
    }

    /**
     * Falha ao apagar deixa órfão de storage e é registrada, nunca propagada:
     * o update já commitou, e derrubar a requisição aqui faria o usuário achar
     * que a troca não aconteceu quando ela aconteceu.
     */
    private function deleteObject(string $path): void
    {
        try {
            Storage::disk($this->disk())->delete($path);
        } catch (Throwable $e) {
            Log::warning('Falha ao apagar objeto de foto de usuário', [
                'path' => $path,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
```

- [ ] **Step 4: Rodar e ver passar**

```bash
docker compose exec -T app php artisan test --filter=UserPhotoTest
```

Esperado: PASS, 7 testes.

- [ ] **Step 5: Pint e commit**

```bash
cd backend && ./vendor/bin/pint app/Domains/Identity/Services/UserPhotoService.php tests/Feature/Identity/UserPhotoTest.php
cd .. && git add backend/app/Domains/Identity/Services/UserPhotoService.php backend/tests/Feature/Identity/UserPhotoTest.php
git commit -m "feat(identity): adiciona UserPhotoService com delete do objeto anterior"
```

---

## Task 2: Rotas e controllers de foto

**Files:**
- Create: `backend/app/Domains/Identity/Http/Controllers/UserPhotoController.php`
- Create: `backend/app/Domains/Identity/Http/Controllers/RedatorPhotoController.php`
- Create: `backend/app/Domains/Identity/Http/Controllers/StudentPhotoController.php`
- Create: `backend/app/Domains/Commercial/Http/Controllers/ClientPhotoController.php`
- Modify: `backend/app/Domains/Identity/routes.php`
- Modify: `backend/app/Domains/Commercial/routes.php`
- Test: `backend/tests/Feature/Identity/UserPhotoTest.php` (acrescenta casos)

**Interfaces:**
- Consumes: `UserPhotoService::RULES`, `store()`, `remove()` (Task 1).
- Produces: 8 rotas. `POST` devolve `204 No Content`; `DELETE` devolve `204 No Content`. A foto nova é lida na próxima leitura da entidade, via `photo_url` (Task 3).

> **Por que 4 controllers e não um:** cada rota herda a permissão do módulo dono. Uma rota única exigiria escolher UMA permissão para todas as entidades, recriando o acoplamento RBAC cross-módulo já registrado no backlog (spec D1).

- [ ] **Step 1: Escrever os testes que falham**

Acrescentar a `backend/tests/Feature/Identity/UserPhotoTest.php`, dentro da classe:

```php
    /** Redator autenticado: não tem identity.user.* nem commercial.client.*. */
    private function actingAsRedator(): User
    {
        $this->seed(\Database\Seeders\RolePermissionSeeder::class);

        $user = User::factory()->create(['type' => 'redator', 'is_active' => true]);
        $user->assignRole('redator');
        $this->actingAs($user, 'web');

        return $user;
    }

    public function test_post_photo_do_usuario_devolve_204_e_grava(): void
    {
        $storage = Storage::fake('s3');
        $this->actingAsAdmin();
        $target = User::factory()->create(['type' => 'admin']);

        $this->post("/api/users/{$target->id}/photo", [
            'photo' => UploadedFile::fake()->image('foto.jpg'),
        ])->assertNoContent();

        $target->refresh();
        $this->assertNotNull($target->photo_path);
        $storage->assertExists($target->photo_path);
    }

    public function test_delete_photo_do_usuario_devolve_204(): void
    {
        Storage::fake('s3');
        $this->actingAsAdmin();
        $target = User::factory()->create(['type' => 'admin']);
        app(UserPhotoService::class)->store($target, UploadedFile::fake()->image('foto.jpg'));

        $this->deleteJson("/api/users/{$target->id}/photo")->assertNoContent();

        $this->assertNull($target->refresh()->photo_path);
    }

    public function test_photo_com_mime_invalido_da_422_com_envelope_rfc7807(): void
    {
        Storage::fake('s3');
        $this->actingAsAdmin();
        $target = User::factory()->create(['type' => 'admin']);

        $this->post("/api/users/{$target->id}/photo", [
            'photo' => UploadedFile::fake()->create('contrato.pdf', 10, 'application/pdf'),
        ], ['Accept' => 'application/json'])
            ->assertStatus(422)
            ->assertHeader('content-type', 'application/problem+json')
            ->assertJsonPath('errors.photo.0', fn ($m) => is_string($m));
    }

    public function test_photo_acima_de_5mb_da_422(): void
    {
        Storage::fake('s3');
        $this->actingAsAdmin();
        $target = User::factory()->create(['type' => 'admin']);

        // 6 MB em kilobytes — acima do teto de 5120 KB, abaixo dos 12 MB de
        // transporte do nginx/PHP, para que quem rejeite seja o Laravel.
        $this->post("/api/users/{$target->id}/photo", [
            'photo' => UploadedFile::fake()->create('grande.jpg', 6144, 'image/jpeg'),
        ], ['Accept' => 'application/json'])
            ->assertStatus(422)
            ->assertJsonPath('errors.photo.0', fn ($m) => is_string($m));
    }

    public function test_redator_nao_gerencia_foto_de_nenhuma_entidade(): void
    {
        Storage::fake('s3');
        $this->actingAsRedator();

        $target = User::factory()->create(['type' => 'admin']);
        $redator = User::factory()->create(['type' => 'redator'])
            ->redator()->create([]);
        $student = User::factory()->create(['type' => 'aluno'])
            ->student()->create([]);
        $client = User::factory()->create(['type' => 'cliente', 'is_active' => false])
            ->client()->create(['legal_name' => 'ACME', 'type' => 'client']);

        $photo = ['photo' => UploadedFile::fake()->image('foto.jpg')];

        $this->post("/api/users/{$target->id}/photo", $photo)->assertForbidden();
        $this->post("/api/redatores/{$redator->id}/photo", $photo)->assertForbidden();
        $this->post("/api/students/{$student->id}/photo", $photo)->assertForbidden();
        $this->post("/api/clients/{$client->id}/photo", $photo)->assertForbidden();

        $this->deleteJson("/api/users/{$target->id}/photo")->assertForbidden();
        $this->deleteJson("/api/clients/{$client->id}/photo")->assertForbidden();
    }

    public function test_post_photo_das_outras_tres_entidades_grava_no_user_da_entidade(): void
    {
        $storage = Storage::fake('s3');
        $this->actingAsAdmin();

        $redator = User::factory()->create(['type' => 'redator'])->redator()->create([]);
        $student = User::factory()->create(['type' => 'aluno'])->student()->create([]);
        $client = User::factory()->create(['type' => 'cliente', 'is_active' => false])
            ->client()->create(['legal_name' => 'ACME', 'type' => 'client']);

        foreach ([
            "/api/redatores/{$redator->id}/photo" => $redator,
            "/api/students/{$student->id}/photo" => $student,
            "/api/clients/{$client->id}/photo" => $client,
        ] as $url => $entity) {
            $this->post($url, ['photo' => UploadedFile::fake()->image('foto.jpg')])
                ->assertNoContent();

            $path = $entity->user()->first()->photo_path;
            $this->assertNotNull($path, "photo_path nulo depois de POST em {$url}");
            $storage->assertExists($path);
        }
    }
```

> Se `User::factory()` não expuser as relações `redator()`/`student()` como usadas acima, monte as entidades pelo mesmo caminho já usado em `backend/tests/Feature/Cadastros/CadastroAuthorizationTest.php:52-54` — o padrão do repositório é criar o `User` e encadear a relação. Ajuste os campos obrigatórios lendo as migrations de `redatores`/`students`; não invente coluna.

- [ ] **Step 2: Rodar e ver falhar**

```bash
docker compose exec -T app php artisan test --filter=UserPhotoTest
```

Esperado: FAIL com `404` (rotas inexistentes) nos casos novos; os 7 da Task 1 seguem passando.

- [ ] **Step 3: Criar os 4 controllers**

`backend/app/Domains/Identity/Http/Controllers/UserPhotoController.php`:

```php
<?php

namespace App\Domains\Identity\Http\Controllers;

use App\Domains\Identity\Models\User;
use App\Domains\Identity\Services\UserPhotoService;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/**
 * Foto do usuário staff. Controller fino: valida pelas RULES do serviço
 * (fonte única) e delega. A permissão está na rota, junto das demais rotas
 * nested do domínio.
 */
class UserPhotoController extends Controller
{
    public function store(Request $request, User $user, UserPhotoService $service): Response
    {
        $request->validate(UserPhotoService::RULES);
        $service->store($user, $request->file('photo'));

        return response()->noContent();
    }

    public function destroy(User $user, UserPhotoService $service): Response
    {
        $service->remove($user);

        return response()->noContent();
    }
}
```

`backend/app/Domains/Identity/Http/Controllers/RedatorPhotoController.php`:

```php
<?php

namespace App\Domains\Identity\Http\Controllers;

use App\Domains\Identity\Models\Redator;
use App\Domains\Identity\Services\UserPhotoService;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/** Foto do redator. A foto é do `User` por trás dele (spec D3). */
class RedatorPhotoController extends Controller
{
    public function store(Request $request, Redator $redator, UserPhotoService $service): Response
    {
        $request->validate(UserPhotoService::RULES);
        $service->store($redator->user, $request->file('photo'));

        return response()->noContent();
    }

    public function destroy(Redator $redator, UserPhotoService $service): Response
    {
        $service->remove($redator->user);

        return response()->noContent();
    }
}
```

`backend/app/Domains/Identity/Http/Controllers/StudentPhotoController.php` — idêntico ao anterior trocando `Redator $redator` por `Student $student` e o import por `App\Domains\Identity\Models\Student`:

```php
<?php

namespace App\Domains\Identity\Http\Controllers;

use App\Domains\Identity\Models\Student;
use App\Domains\Identity\Services\UserPhotoService;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/** Foto do aluno. A foto é do `User` por trás dele (spec D3). */
class StudentPhotoController extends Controller
{
    public function store(Request $request, Student $student, UserPhotoService $service): Response
    {
        $request->validate(UserPhotoService::RULES);
        $service->store($student->user, $request->file('photo'));

        return response()->noContent();
    }

    public function destroy(Student $student, UserPhotoService $service): Response
    {
        $service->remove($student->user);

        return response()->noContent();
    }
}
```

`backend/app/Domains/Commercial/Http/Controllers/ClientPhotoController.php` — mora em Commercial porque a permissão é `commercial.client.update`, mas usa o mesmo serviço de Identity:

```php
<?php

namespace App\Domains\Commercial\Http\Controllers;

use App\Domains\Commercial\Models\Client;
use App\Domains\Identity\Services\UserPhotoService;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/**
 * Foto (logo) do cliente. Vive em Commercial porque a permissão é
 * `commercial.client.update`; a regra continua sendo a de Identity — cliente é
 * extensão 1:1 de `User`, como redator e aluno (spec D1/D2).
 */
class ClientPhotoController extends Controller
{
    public function store(Request $request, Client $client, UserPhotoService $service): Response
    {
        $request->validate(UserPhotoService::RULES);
        $service->store($client->user, $request->file('photo'));

        return response()->noContent();
    }

    public function destroy(Client $client, UserPhotoService $service): Response
    {
        $service->remove($client->user);

        return response()->noContent();
    }
}
```

- [ ] **Step 4: Registrar as rotas**

Em `backend/app/Domains/Identity/routes.php`, acrescentar os imports:

```php
use App\Domains\Identity\Http\Controllers\RedatorPhotoController;
use App\Domains\Identity\Http\Controllers\StudentPhotoController;
use App\Domains\Identity\Http\Controllers\UserPhotoController;
```

e, dentro do grupo `Route::middleware('permission:identity.user.update')->group(function () { ... })` que já existe (hoje só com as rotas de documento do redator), acrescentar:

```php
        Route::post('users/{user}/photo', [UserPhotoController::class, 'store']);
        Route::delete('users/{user}/photo', [UserPhotoController::class, 'destroy']);

        Route::post('redatores/{redator}/photo', [RedatorPhotoController::class, 'store']);
        Route::delete('redatores/{redator}/photo', [RedatorPhotoController::class, 'destroy']);

        Route::post('students/{student}/photo', [StudentPhotoController::class, 'store']);
        Route::delete('students/{student}/photo', [StudentPhotoController::class, 'destroy']);
```

Em `backend/app/Domains/Commercial/routes.php`, acrescentar o import:

```php
use App\Domains\Commercial\Http\Controllers\ClientPhotoController;
```

e, dentro do grupo `Route::middleware('permission:commercial.client.update')->group(...)` que já existe (endereços e contatos), acrescentar:

```php
        Route::post('clients/{client}/photo', [ClientPhotoController::class, 'store']);
        Route::delete('clients/{client}/photo', [ClientPhotoController::class, 'destroy']);
```

- [ ] **Step 5: Rodar e ver passar**

```bash
docker compose exec -T app php artisan route:list --path=photo
docker compose exec -T app php artisan test --filter=UserPhotoTest
```

Esperado: `route:list` mostra 8 rotas; o teste PASSA com 13 casos.

- [ ] **Step 6: Suíte completa, Pint e commit**

```bash
docker compose exec -T app php artisan test
cd backend && ./vendor/bin/pint app/Domains/Identity/Http/Controllers/UserPhotoController.php app/Domains/Identity/Http/Controllers/RedatorPhotoController.php app/Domains/Identity/Http/Controllers/StudentPhotoController.php app/Domains/Commercial/Http/Controllers/ClientPhotoController.php app/Domains/Identity/routes.php app/Domains/Commercial/routes.php tests/Feature/Identity/UserPhotoTest.php
cd .. && git add backend/
git commit -m "feat(identity): expoe upload e remocao de foto em 4 rotas nested"
```

---

## Task 3: `photo_url` nos 4 DTOs

**Files:**
- Modify: `backend/app/Domains/Identity/Data/UserData.php`
- Modify: `backend/app/Domains/Identity/Data/RedatorData.php`
- Modify: `backend/app/Domains/Identity/Data/StudentData.php`
- Modify: `backend/app/Domains/Commercial/Data/ClientData.php`
- Modify: `frontend/src/shared/types/generated.ts` (REGENERADO, não editado)
- Test: `backend/tests/Feature/Identity/UserPhotoTest.php` (acrescenta casos)

**Interfaces:**
- Consumes: `UserPhotoService::urlFor()` (Task 1).
- Produces: campo `photo_url: string | null` nos tipos TS `UserData`, `RedatorData`, `StudentData`, `ClientData` — consumido pelas Tasks 8, 9 e 10.

- [ ] **Step 1: Escrever os testes que falham**

Acrescentar a `backend/tests/Feature/Identity/UserPhotoTest.php`:

```php
    public function test_photo_url_e_null_sem_foto_e_string_com_foto(): void
    {
        Storage::fake('s3');
        $this->actingAsAdmin();

        $target = User::factory()->create(['type' => 'admin']);
        $target->assignRole('admin');

        $this->getJson("/api/users/{$target->id}")
            ->assertOk()
            ->assertJsonPath('photo_url', null);

        $this->post("/api/users/{$target->id}/photo", [
            'photo' => UploadedFile::fake()->image('foto.jpg'),
        ])->assertNoContent();

        $url = $this->getJson("/api/users/{$target->id}")->assertOk()->json('photo_url');
        $this->assertIsString($url);
    }

    public function test_photo_url_aparece_nas_outras_tres_entidades(): void
    {
        Storage::fake('s3');
        $this->actingAsAdmin();

        $redator = User::factory()->create(['type' => 'redator'])->redator()->create([]);
        $student = User::factory()->create(['type' => 'aluno'])->student()->create([]);
        $client = User::factory()->create(['type' => 'cliente', 'is_active' => false])
            ->client()->create(['legal_name' => 'ACME', 'type' => 'client']);

        foreach ([
            "/api/redatores/{$redator->id}" => "/api/redatores/{$redator->id}/photo",
            "/api/students/{$student->id}" => "/api/students/{$student->id}/photo",
            "/api/clients/{$client->id}" => "/api/clients/{$client->id}/photo",
        ] as $showUrl => $photoUrl) {
            $this->getJson($showUrl)->assertOk()->assertJsonPath('photo_url', null);

            $this->post($photoUrl, ['photo' => UploadedFile::fake()->image('foto.jpg')])
                ->assertNoContent();

            $this->assertIsString(
                $this->getJson($showUrl)->assertOk()->json('photo_url'),
                "photo_url ausente em {$showUrl} depois do upload",
            );
        }
    }
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
docker compose exec -T app php artisan test --filter=UserPhotoTest
```

Esperado: FAIL — `Unable to find JSON path [photo_url]`.

- [ ] **Step 3: Acrescentar o campo aos 4 DTOs**

Em cada DTO, o campo é `#[Computed]` (só saída — a foto entra pelas rotas da Task 2, nunca pelo payload da entidade) e é derivado no `fromModel`.

`UserData.php` — acrescentar o import `use Spatie\LaravelData\Attributes\Computed;` e `use App\Domains\Identity\Services\UserPhotoService;`, o parâmetro ao final do construtor:

```php
        #[Computed]
        public ?string $photo_url = null,
```

e, no `fromModel`, o argumento:

```php
            photo_url: app(UserPhotoService::class)->urlFor($user->photo_path),
```

`RedatorData.php` — mesmo import de `UserPhotoService` (`Computed` já está importado), parâmetro ao final do construtor:

```php
        #[Computed]
        public ?string $photo_url = null,
```

e no `fromModel`:

```php
            photo_url: app(UserPhotoService::class)->urlFor($redator->user->photo_path),
```

`StudentData.php` — mesmo import, parâmetro ao final do construtor:

```php
        #[Computed]
        public ?string $photo_url = null,
```

e no `fromModel`:

```php
            photo_url: app(UserPhotoService::class)->urlFor($student->user->photo_path),
```

`ClientData.php` — acrescentar `use App\Domains\Identity\Services\UserPhotoService;` e `use Spatie\LaravelData\Attributes\Computed;`, parâmetro ao final do construtor:

```php
        #[Computed]
        public ?string $photo_url = null,
```

e no `fromModel`:

```php
            photo_url: app(UserPhotoService::class)->urlFor($client->user->photo_path),
```

> `RedatorData` tem `prepareForPipeline()` que remove `documents` do payload de escrita. `photo_url` não precisa do mesmo tratamento: não existe campo homônimo de escrita, e `#[Computed]` já o mantém fora da entrada.

- [ ] **Step 4: Rodar, regenerar tipos e verificar**

```bash
docker compose exec -T app php artisan test --filter=UserPhotoTest
docker compose exec -T app php artisan typescript:transform
git diff --stat frontend/src/shared/types/generated.ts
```

Esperado: testes PASSAM (15 casos); o diff de `generated.ts` mostra `photo_url` nas 4 interfaces e **nada mais** — se aparecer outra mudança, investigue antes de commitar.

- [ ] **Step 5: Suíte, Pint e commit**

```bash
docker compose exec -T app php artisan test
cd backend && ./vendor/bin/pint app/Domains/Identity/Data/UserData.php app/Domains/Identity/Data/RedatorData.php app/Domains/Identity/Data/StudentData.php app/Domains/Commercial/Data/ClientData.php tests/Feature/Identity/UserPhotoTest.php
cd .. && git add backend/ frontend/src/shared/types/generated.ts
git commit -m "feat(identity): expoe photo_url nos contratos de user, redator, aluno e cliente"
```

---

## Task 4: Mínimo de 1 contato no cliente

**Files:**
- Modify: `backend/app/Domains/Commercial/Data/ClientData.php`
- Test: `backend/tests/Feature/Comercial/ClientContactMinimumTest.php`

**Interfaces:**
- Produces: `PUT`/`POST /api/clients` passa a devolver `422` com `errors.contacts` quando `contacts` é `[]` ou ausente. Consumido pela Task 11 (a UI desabilita o botão de excluir o último contato para que o usuário não chegue nesse 422).

> **É mudança de contrato.** A API aceitava coleção vazia; o Drive (`entidade-contato-cliente.md`) define um ou mais contatos, e o João ratificou (spec D13, fonte `[J-02]`).

- [ ] **Step 1: Escrever o teste que falha**

Criar `backend/tests/Feature/Comercial/ClientContactMinimumTest.php`:

```php
<?php

namespace Tests\Feature\Comercial;

use App\Domains\Commercial\Models\Client;
use App\Domains\Identity\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * O cliente tem UM OU MAIS contatos (fonte canônica: Drive,
 * `entidade-contato-cliente.md`; ratificado pelo João em 2026-07-31). A API
 * aceitava coleção vazia — divergência real, fechada aqui.
 *
 * Interação com a regra de coleção nested: `ClientData::$contacts` é
 * `array = []`, não `Optional`, e o update faz replace-total. Antes desta
 * regra, um PUT que OMITIA `contacts` apagava a coleção em silêncio. Com
 * `required`, a omissão vira 422 em vez de apagamento mudo.
 */
class ClientContactMinimumTest extends TestCase
{
    use RefreshDatabase;

    private function client(): Client
    {
        $client = User::factory()->create(['type' => 'cliente', 'is_active' => false])
            ->client()->create(['legal_name' => 'ACME', 'type' => 'client']);

        $client->contacts()->create(['name' => 'Ana', 'is_primary' => true]);

        return $client;
    }

    private function payload(array $override = []): array
    {
        return array_merge([
            'name' => 'ACME',
            'legal_name' => 'ACME',
            'rut' => '13.456.789-9',
            'email' => 'acme@lotus.cl',
            'type' => 'client',
            'contacts' => [['name' => 'Ana', 'is_primary' => true]],
        ], $override);
    }

    public function test_update_com_contacts_vazio_da_422(): void
    {
        $this->actingAsAdmin();
        $client = $this->client();

        $this->putJson("/api/clients/{$client->id}", $this->payload(['contacts' => []]))
            ->assertStatus(422)
            ->assertJsonPath('errors.contacts.0', fn ($m) => is_string($m));

        // O contato existente NÃO foi apagado pelo replace-total.
        $this->assertSame(1, $client->contacts()->count());
    }

    public function test_update_sem_a_chave_contacts_da_422_em_vez_de_apagar(): void
    {
        $this->actingAsAdmin();
        $client = $this->client();
        $payload = $this->payload();
        unset($payload['contacts']);

        $this->putJson("/api/clients/{$client->id}", $payload)
            ->assertStatus(422)
            ->assertJsonPath('errors.contacts.0', fn ($m) => is_string($m));

        $this->assertSame(1, $client->contacts()->count());
    }

    public function test_store_sem_contato_da_422(): void
    {
        $this->actingAsAdmin();

        $this->postJson('/api/clients', $this->payload(['contacts' => []]))
            ->assertStatus(422)
            ->assertJsonPath('errors.contacts.0', fn ($m) => is_string($m));
    }

    public function test_update_com_um_contato_continua_passando(): void
    {
        $this->actingAsAdmin();
        $client = $this->client();

        $this->putJson("/api/clients/{$client->id}", $this->payload([
            'contacts' => [['name' => 'Beatriz', 'is_primary' => true]],
        ]))->assertOk()->assertJsonPath('contacts.0.name', 'Beatriz');
    }
}
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
docker compose exec -T app php artisan test --filter=ClientContactMinimumTest
```

Esperado: os 3 primeiros casos FALHAM (recebem `200`/`201` em vez de `422`); o quarto já passa. **É este o estado que prova o valor do teste** — anote a saída antes de seguir.

- [ ] **Step 3: Acrescentar a regra**

Em `backend/app/Domains/Commercial/Data/ClientData.php`, no método `rules()`:

```php
    public static function rules(): array
    {
        return [
            'rut' => ['required', 'string', new ValidRut],
            // Um ou mais contatos (Drive `entidade-contato-cliente.md`,
            // ratificado em 2026-07-31). `required` também fecha o buraco do
            // replace-total: antes, omitir a chave apagava a coleção em
            // silêncio, porque $contacts é `array = []` e não `Optional`.
            'contacts' => ['required', 'array', 'min:1'],
        ];
    }
```

- [ ] **Step 4: Rodar e ver passar**

```bash
docker compose exec -T app php artisan test --filter=ClientContactMinimumTest
```

Esperado: PASS, 4 casos.

- [ ] **Step 5: Confirmar a reprovação contra o código antigo**

Sem esta prova, o teste não vale nada.

```bash
git stash push backend/app/Domains/Commercial/Data/ClientData.php
docker compose exec -T app php artisan test --filter=ClientContactMinimumTest
git stash pop
```

Esperado: com o stash aplicado, 3 casos FALHAM. Se todos passarem, o teste não está provando a regra — pare e corrija o teste.

- [ ] **Step 6: Suíte completa**

```bash
docker compose exec -T app php artisan test
```

Esperado: verde. Se algum teste pré-existente de cliente quebrar por não mandar `contacts`, **corrija o teste** (o payload dele passa a precisar de contato) — não relaxe a regra.

- [ ] **Step 7: Pint e commit**

```bash
cd backend && ./vendor/bin/pint app/Domains/Commercial/Data/ClientData.php tests/Feature/Comercial/ClientContactMinimumTest.php
cd .. && git add backend/
git commit -m "feat(commercial): exige ao menos um contato no cadastro de cliente"
```

---

## Task 5: `AppAvatar` cai para iniciais quando a imagem falha

**Files:**
- Modify: `frontend/src/shared/ui/AppAvatar/AppAvatar.tsx`

**Interfaces:**
- Produces: `AppAvatar` com o mesmo contrato de props de hoje (`name`, `image?`, + props do Prime), mas tolerante a `image` quebrada. Consumido pelas Tasks 6, 8, 9 e 10.

> Hoje o componente decide só por `image` estar presente. URL pré-assinada expirada, objeto apagado ou rede caída renderizam o avatar vazio do Prime. O bloco pede literalmente "sem foto **ou com imagem indisponível**, exibir as duas iniciais" (spec D7).

- [ ] **Step 1: Reescrever o componente**

Substituir o conteúdo de `frontend/src/shared/ui/AppAvatar/AppAvatar.tsx`:

```tsx
import { useState } from 'react'
import { Avatar } from 'primereact/avatar'
import type { AvatarProps } from 'primereact/avatar'
import { initialsFromName } from '@shared/lib'

export interface AppAvatarProps extends Omit<AvatarProps, 'label' | 'image'> {
  name: string
  image?: string | null
}

/**
 * Avatar com fallback duplo: sem imagem OU com imagem que não carrega, mostra
 * as duas iniciais do nome.
 *
 * O segundo caso não é hipotético: a URL da foto é pré-assinada e expira
 * (spec D6), então uma listagem aberta o bastante passa a receber 403 do
 * bucket. Sem este fallback o Prime renderiza um círculo vazio, que é pior que
 * as iniciais — parece defeito, não "sem foto".
 *
 * `key={image}` no <Avatar> reinicia o estado de falha quando a URL muda: sem
 * isso, trocar a foto depois de um erro manteria as iniciais para sempre.
 */
export function AppAvatar({ name, image, ...props }: AppAvatarProps) {
  const [failed, setFailed] = useState<string | null>(null)

  if (image && failed !== image) {
    return (
      <Avatar
        key={image}
        image={image}
        shape="circle"
        imageAlt={name}
        onImageError={() => setFailed(image)}
        {...props}
      />
    )
  }

  return (
    <Avatar
      label={initialsFromName(name)}
      shape="circle"
      style={{ backgroundColor: '#25A5E4', color: '#fff' }}
      {...props}
    />
  )
}
```

- [ ] **Step 2: Verificar o build e o lint**

```bash
cd frontend && pnpm build && pnpm lint
```

Esperado: ambos verdes. `image?: string | null` aceita o `photo_url` do DTO sem `?? undefined` no chamador.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/shared/ui/AppAvatar/AppAvatar.tsx
git commit -m "fix(shared-ui): AppAvatar cai para iniciais quando a imagem nao carrega"
```

---

## Task 6: `AppPhotoField` + teto de 5 MB no `AppFileUpload`

**Files:**
- Create: `frontend/src/shared/ui/AppPhotoField/AppPhotoField.tsx`
- Create: `frontend/src/shared/ui/AppPhotoField/index.ts`
- Modify: `frontend/src/shared/ui/AppFileUpload/AppFileUpload.tsx`
- Modify: `frontend/src/shared/lib/upload.ts`
- Modify: `frontend/src/shared/ui/index.ts`
- Modify: `frontend/src/shared/config/locales/{es-CL,pt-BR,en}.json`

**Interfaces:**
- Consumes: `AppAvatar` (Task 5), `AppFileUpload`, `AppButton`.
- Produces:
  ```ts
  export interface AppPhotoFieldProps {
    name: string
    url?: string | null
    readOnly?: boolean
    pending?: boolean
    error?: string | null
    onSelect: (file: File) => void
    onRemove: () => void
    onRetry?: () => void
  }
  ```
  Consumido pelas Tasks 9 e 10.
- Produces: `MAX_PHOTO_BYTES` em `shared/lib/upload.ts`.

- [ ] **Step 1: Acrescentar o teto da foto ao `shared/lib/upload.ts`**

Logo abaixo de `MAX_UPLOAD_BYTES`:

```ts
/** Teto lógico da FOTO de perfil: 5 MB. É o MESMO valor do `max:5120` (KB) do
 * `UserPhotoService::RULES` — 5120 * 1024. Menor que o dos documentos de
 * propósito (spec D9): foto de perfil não precisa de 10 MB, e o teto menor
 * barra o upload acidental de foto de câmera crua. */
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024
```

- [ ] **Step 2: Tornar o teto do `AppFileUpload` parametrizável**

Hoje `AppFileUpload` fixa `MAX_UPLOAD_BYTES`. A foto tem outro teto, e escrever uma segunda checagem de tamanho seria duplicar a guarda pré-requisição da spec D4 do bloco anterior. Em `frontend/src/shared/ui/AppFileUpload/AppFileUpload.tsx`:

Trocar a assinatura do tipo:

```ts
export type AppFileUploadOwnProps = FileUploadProps & {
  /** Recebe a mensagem já traduzida quando o arquivo excede o teto. O chamador
   * decide onde exibi-la (banner do diálogo, erro da seção). */
  onSizeReject?: (message: string) => void
  /** Teto em bytes. Default: o dos documentos (10 MB). A foto de perfil passa
   * `MAX_PHOTO_BYTES` (5 MB) — spec D9. */
  maxBytes?: number
}
```

Trocar a assinatura da função e o uso dentro de `guarded`:

```tsx
export function AppFileUpload({ uploadHandler, onSizeReject, maxBytes = MAX_UPLOAD_BYTES, ...props }: AppFileUploadOwnProps) {
  const { t } = useTranslation()

  const guarded = (e: FileUploadHandlerEvent) => {
    const file = e.files[0]
    if (file && file.size > maxBytes) {
      e.options.clear()
      onSizeReject?.(
        t('common.fileTooLarge', {
          size: formatFileSize(file.size),
          limit: formatFileSize(maxBytes),
        }),
      )
      return
    }
    uploadHandler?.(e)
  }

  return <FileUpload mode="basic" auto {...props} uploadHandler={guarded} customUpload />
}
```

Nada mais muda: `customUpload` continua pinado após o spread.

- [ ] **Step 3: Criar o componente**

`frontend/src/shared/ui/AppPhotoField/AppPhotoField.tsx`:

```tsx
import { useTranslation } from 'react-i18next'
import { AppAvatar } from '../AppAvatar'
import { AppButton } from '../AppButton'
import { AppFileUpload } from '../AppFileUpload'
import type { FileUploadHandlerEvent } from '../AppFileUpload'
import { MAX_PHOTO_BYTES } from '@shared/lib/upload'

export interface AppPhotoFieldProps {
  /** Nome da pessoa/empresa — vira as duas iniciais quando não há foto. */
  name: string
  url?: string | null
  readOnly?: boolean
  pending?: boolean
  /** Mensagem de erro do upload/remoção, já traduzida. */
  error?: string | null
  onSelect: (file: File) => void
  onRemove: () => void
  /** Recebe a mensagem já traduzida quando o arquivo passa do teto, antes de
   * qualquer requisição. O hook a exibe no mesmo lugar do erro do backend. */
  onSizeReject?: (message: string) => void
  /** Quando presente, mostra "Reintentar" ao lado do erro. */
  onRetry?: () => void
}

/**
 * Campo de foto do corpo dos diálogos de cadastro. Apresentacional puro: não
 * conhece rota, mutation nem modo do diálogo — quem orquestra é
 * `useEntityPhoto` (spec D8).
 *
 * O rótulo do botão muda com o estado ("Seleccionar" vs "Reemplazar") porque
 * substituir apaga a foto anterior de forma irreversível (spec D4) — o texto é
 * o único aviso disso na tela.
 */
export function AppPhotoField({
  name, url, readOnly = false, pending = false, error, onSelect, onRemove, onSizeReject, onRetry,
}: AppPhotoFieldProps) {
  const { t } = useTranslation()

  const handleUpload = (e: FileUploadHandlerEvent) => {
    const file = e.files[0]
    e.options.clear()
    if (file) onSelect(file)
  }

  return (
    <div className="flex items-start gap-4">
      <AppAvatar name={name} image={url} size="xlarge" />

      <div className="flex flex-col gap-2">
        <span className="text-sm" style={{ color: 'var(--text-color-secondary)' }}>
          {t('photo.label')}
        </span>

        {!readOnly && (
          <div className="flex flex-wrap items-center gap-2">
            <AppFileUpload
              accept="image/jpeg,image/png,image/webp"
              maxBytes={MAX_PHOTO_BYTES}
              disabled={pending}
              chooseLabel={url ? t('photo.replace') : t('photo.select')}
              chooseOptions={{ icon: 'pi pi-camera' }}
              uploadHandler={handleUpload}
              onSizeReject={onSizeReject}
            />
            {url && (
              <AppButton
                label={t('photo.remove')}
                icon="pi pi-trash"
                text
                disabled={pending}
                onClick={onRemove}
              />
            )}
          </div>
        )}

        {error && (
          <p
            className="flex items-center gap-2 text-xs"
            style={{ color: 'color-mix(in srgb, var(--red-500) 70%, var(--text-color))' }}
          >
            <span>{error}</span>
            {onRetry && <AppButton label={t('common.retry')} text onClick={onRetry} />}
          </p>
        )}
      </div>
    </div>
  )
}
```

`frontend/src/shared/ui/AppPhotoField/index.ts`:

```ts
export * from './AppPhotoField'
```

- [ ] **Step 4: Registrar no barrel**

Em `frontend/src/shared/ui/index.ts`, em ordem alfabética, entre `./AppPassword` e `./AppRadioButton`:

```ts
export * from './AppPhotoField'
```

- [ ] **Step 5: Acrescentar as chaves de i18n nos 3 locales**

`es-CL.json` (referência de rótulo):

```json
  "photo": {
    "label": "Foto",
    "select": "Seleccionar foto",
    "replace": "Reemplazar",
    "remove": "Eliminar foto",
    "createUploadFailed": "El registro fue creado, pero la foto no se subió."
  },
```

`pt-BR.json`:

```json
  "photo": {
    "label": "Foto",
    "select": "Selecionar foto",
    "replace": "Substituir",
    "remove": "Remover foto",
    "createUploadFailed": "O cadastro foi criado, mas a foto não subiu."
  },
```

`en.json`:

```json
  "photo": {
    "label": "Photo",
    "select": "Select photo",
    "replace": "Replace",
    "remove": "Remove photo",
    "createUploadFailed": "The record was created, but the photo was not uploaded."
  },
```

- [ ] **Step 6: Verificar**

```bash
cd frontend && pnpm build && pnpm lint
```

Esperado: verdes. Confirme também que as 3 chaves `photo.*` existem nos 3 arquivos com os mesmos nomes:

```bash
cd frontend && for f in es-CL pt-BR en; do echo "$f:"; grep -c '"select"\|"replace"\|"remove"\|"createUploadFailed"\|"label"' src/shared/config/locales/$f.json; done
```

- [ ] **Step 7: Commit**

```bash
git add frontend/src/shared/ui/AppPhotoField frontend/src/shared/ui/AppFileUpload/AppFileUpload.tsx frontend/src/shared/ui/index.ts frontend/src/shared/lib/upload.ts frontend/src/shared/config/locales
git commit -m "feat(shared-ui): adiciona AppPhotoField e teto de foto no AppFileUpload"
```

---

## Task 7: `photoResource` + `useEntityPhoto`

**Files:**
- Create: `frontend/src/shared/api/photoResource.ts`
- Create: `frontend/src/shared/hooks/useEntityPhoto.ts`
- Modify: `frontend/src/shared/hooks/index.ts`

**Interfaces:**
- Consumes: `api` de `@shared/api/axios`, `ProblemDetails`, `MAX_PHOTO_BYTES`.
- Produces:
  ```ts
  // photoResource.ts
  export function photoResource(resource: 'users' | 'redatores' | 'students' | 'clients'): {
    upload: (id: number, file: File) => Promise<void>
    remove: (id: number) => Promise<void>
  }

  // useEntityPhoto.ts
  export function useEntityPhoto(opts: {
    resource: 'users' | 'redatores' | 'students' | 'clients'
    id: number | null
    mode: DialogMode
    url?: string | null
    invalidateKey: readonly unknown[]
  }): {
    url: string | null          // preview local no create, photo_url nos demais
    pending: boolean
    error: string | null
    onSelect: (file: File) => void
    onRemove: () => void
    onSizeReject: (message: string) => void
    onRetry: () => void
    flush: (createdId: number) => Promise<void>  // sobe o buffer após o create
    hasBufferedFailure: boolean
  }
  ```
  Consumido pelas Tasks 9 e 10.

> **Por que em `shared/` e não na feature:** os consumidores estão em `identity` **e** em `commercial`, e feature não importa feature — nem para tipo (lei §5.6). O cliente REST nasce sempre em `shared/api` (ADR-18); a mutation e o estado saem do componente e vão para o hook (`frontend-fsliced.md`).

- [ ] **Step 1: Criar o cliente REST**

`frontend/src/shared/api/photoResource.ts`:

```ts
import { api } from './axios'

/** Os 4 recursos que têm foto. Fechado de propósito: recurso novo com foto
 * exige rota nova no backend, então a lista é a documentação de quem já tem. */
export type PhotoResource = 'users' | 'redatores' | 'students' | 'clients'

/**
 * Cliente das rotas nested de foto (spec D1). Uma rota por entidade, cada uma
 * sob a permissão do seu módulo — por isso o recurso é parâmetro, não um
 * endpoint único.
 *
 * O axios NÃO fixa Content-Type (`shared/api/axios.ts`): o FormData vira
 * multipart+boundary sozinho. Fixar json aqui faria o File virar `{}` e o
 * upload chegar vazio com 204 silencioso.
 */
export function photoResource(resource: PhotoResource) {
  return {
    upload: (id: number, file: File): Promise<void> => {
      const fd = new FormData()
      fd.append('photo', file)

      return api.post(`/api/${resource}/${id}/photo`, fd).then(() => undefined)
    },
    remove: (id: number): Promise<void> =>
      api.delete(`/api/${resource}/${id}/photo`).then(() => undefined),
  }
}
```

- [ ] **Step 2: Criar o hook**

`frontend/src/shared/hooks/useEntityPhoto.ts`:

```ts
import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { ProblemDetails } from '@shared/api/axios'
import { photoResource, type PhotoResource } from '@shared/api/photoResource'
import type { DialogMode } from '@shared/lib'

export interface UseEntityPhotoOptions {
  resource: PhotoResource
  /** `null` em `create` — ainda não existe entidade para pendurar a foto. */
  id: number | null
  mode: DialogMode
  /** `photo_url` vindo do DTO. */
  url?: string | null
  /** Query key a invalidar depois de subir/remover (a do recurso pai). */
  invalidateKey: readonly unknown[]
}

/**
 * Orquestra a foto de um diálogo de cadastro.
 *
 * Em `create` não há id, então o arquivo é BUFFERIZADO e mostrado por
 * `URL.createObjectURL` — nenhuma requisição sai. O diálogo chama `flush(id)`
 * no `onSuccess` do create para subir a foto guardada (spec D10).
 *
 * Em `edit`/`view` o upload é imediato e invalida a query do recurso, para que
 * o `photo_url` novo chegue na próxima leitura.
 */
export function useEntityPhoto({ resource, id, mode, url, invalidateKey }: UseEntityPhotoOptions) {
  const qc = useQueryClient()
  const client = photoResource(resource)

  const [buffered, setBuffered] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [sizeError, setSizeError] = useState<string | null>(null)
  const [bufferedFailure, setBufferedFailure] = useState(false)

  // Object URL é recurso do browser: sem o revoke, cada troca de foto no
  // create vaza um blob até o reload da aba.
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])

  const invalidate = () => qc.invalidateQueries({ queryKey: invalidateKey })

  const upload = useMutation<void, ProblemDetails, { id: number; file: File }>({
    mutationFn: ({ id: entityId, file }) => client.upload(entityId, file),
    onSuccess: invalidate,
  })

  const remove = useMutation<void, ProblemDetails, number>({
    mutationFn: (entityId) => client.remove(entityId),
    onSuccess: invalidate,
  })

  function onSelect(file: File) {
    setSizeError(null)
    setBufferedFailure(false)

    if (id === null) {
      if (preview) URL.revokeObjectURL(preview)
      setBuffered(file)
      setPreview(URL.createObjectURL(file))
      return
    }

    upload.mutate({ id, file })
  }

  function onRemove() {
    setSizeError(null)
    setBufferedFailure(false)

    if (id === null) {
      if (preview) URL.revokeObjectURL(preview)
      setBuffered(null)
      setPreview(null)
      return
    }

    remove.mutate(id)
  }

  /**
   * Sobe a foto bufferizada depois que o create devolveu a entidade. Não
   * lança: a entidade JÁ existe, e propagar o erro faria o diálogo fechar
   * como se tudo tivesse dado certo. O chamador lê `hasBufferedFailure`.
   */
  async function flush(createdId: number): Promise<void> {
    if (!buffered) return

    try {
      await upload.mutateAsync({ id: createdId, file: buffered })
      setBuffered(null)
      if (preview) URL.revokeObjectURL(preview)
      setPreview(null)
    } catch {
      setBufferedFailure(true)
    }
  }

  const mutationError = upload.error?.detail
    ?? Object.values(upload.error?.errors ?? {})[0]?.[0]
    ?? remove.error?.detail
    ?? Object.values(remove.error?.errors ?? {})[0]?.[0]
    ?? null

  return {
    url: mode === 'create' ? preview : (url ?? null),
    pending: upload.isPending || remove.isPending,
    error: sizeError ?? mutationError,
    onSelect,
    onRemove,
    onSizeReject: (message: string) => setSizeError(message),
    onRetry: () => {
      if (id !== null && buffered) upload.mutate({ id, file: buffered })
    },
    flush,
    hasBufferedFailure: bufferedFailure,
  }
}
```

- [ ] **Step 3: Exportar no barrel**

Em `frontend/src/shared/hooks/index.ts`, em ordem alfabética:

```ts
export { useEntityPhoto } from './useEntityPhoto'
export type { UseEntityPhotoOptions } from './useEntityPhoto'
```

- [ ] **Step 4: Verificar**

```bash
cd frontend && pnpm build && pnpm lint
```

Esperado: verdes. Se o lint reclamar de `react-hooks/set-state-in-effect`, o `useEffect` acima só faz cleanup (`return () => ...`) e não chama `setState` no corpo — confira que não introduziu um `setState` direto no efeito.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/shared/api/photoResource.ts frontend/src/shared/hooks/useEntityPhoto.ts frontend/src/shared/hooks/index.ts
git commit -m "feat(shared): adiciona photoResource e useEntityPhoto com buffer no create"
```

---

## Task 8: Avatar na primeira coluna das 4 tabelas

**Files:**
- Modify: `frontend/src/features/identity/components/Student/StudentsTable.tsx`
- Modify: `frontend/src/features/identity/components/Admin/UsersTable.tsx`
- Modify: `frontend/src/features/identity/components/Redator/RedatoresTable.tsx`
- Modify: `frontend/src/features/commercial/components/Client/ClientsTable.tsx`

**Interfaces:**
- Consumes: `AppAvatar` (Task 5), `photo_url` nos DTOs (Task 3).

- [ ] **Step 1: `StudentsTable` — só ligar a imagem**

Já tem o avatar. Em `frontend/src/features/identity/components/Student/StudentsTable.tsx`, na coluna `name`, trocar:

```tsx
              <AppAvatar name={s.name} size="normal" />
```

por:

```tsx
              <AppAvatar name={s.name} image={s.photo_url} size="normal" />
```

- [ ] **Step 2: `UsersTable` — acrescentar o avatar**

Acrescentar `AppAvatar` ao import de `@shared/ui` e trocar o `body` da coluna `name`:

```tsx
          body={(u: UserData) => (
            <div className="flex items-center gap-3">
              <AppAvatar name={u.name} image={u.photo_url} size="normal" />
              <div>
                <p className="font-medium">{u.name}</p>
                <p className="text-xs" style={{ color: 'var(--text-color-secondary)' }}>{u.email}</p>
              </div>
            </div>
          )}
```

- [ ] **Step 3: `RedatoresTable` — acrescentar o avatar**

Acrescentar `AppAvatar` ao import de `@shared/ui` e trocar o `body` da coluna `name`:

```tsx
          body={(r: RedatorData) => (
            <div className="flex items-center gap-3">
              <AppAvatar name={r.name} image={r.photo_url} size="normal" />
              <div>
                <p className="font-medium">{r.name}</p>
                <p className="text-xs" style={{ color: 'var(--text-color-secondary)' }}>{r.email}</p>
              </div>
            </div>
          )}
```

- [ ] **Step 4: `ClientsTable` — acrescentar o avatar**

A coluna hoje é `<AppColumn field="legal_name" header={t('client.legalName')} sortable />`, sem `body`. Acrescentar `AppAvatar` ao import de `@shared/ui` e trocar por:

```tsx
        <AppColumn
          field="legal_name"
          header={t('client.legalName')}
          sortable
          body={(c: ClientData) => (
            <div className="flex items-center gap-3">
              <AppAvatar name={c.legal_name} image={c.photo_url} size="normal" />
              <span className="font-medium">{c.legal_name}</span>
            </div>
          )}
        />
```

> `field` permanece: é o que faz o `sortable` ordenar o CONJUNTO no `DataTable`. Fatiar ou ordenar fora do `DataTable` é regressão silenciosa (`frontend-fsliced.md`).

- [ ] **Step 5: Verificar e commitar**

```bash
cd frontend && pnpm build && pnpm lint
cd .. && git add frontend/src/features
git commit -m "feat(frontend): mostra avatar na primeira coluna das 4 tabelas de cadastro"
```

---

## Task 9: `StudentDialog` — foto no corpo, avatar fora do header

**Files:**
- Modify: `frontend/src/features/identity/components/Student/StudentDialog.tsx`
- Modify: `frontend/src/features/identity/hooks/useStudentForm.ts`

**Interfaces:**
- Consumes: `AppPhotoField` (Task 6), `useEntityPhoto` (Task 7), `studentsApi.keys.all`.
- Produces: o padrão de integração que as Tasks 10 repetem nos outros 3 diálogos — **implemente este primeiro e copie a forma.**

> Esta task carrega três decisões de uma vez: `AppPhotoField` no corpo (D8), remoção do avatar do header (D15) e o fluxo bufferizado com falha visível (D10/D11).

- [ ] **Step 1: `useStudentForm` aceita um passo pós-create**

Em `frontend/src/features/identity/hooks/useStudentForm.ts`, trocar a assinatura e o `submit`. A função recebe um callback opcional que roda **entre** o 201 e o fechamento:

```ts
export function useStudentForm(
  student: StudentData | null,
  mode: DialogMode,
  onDone: () => void,
  afterCreate?: (created: StudentData) => Promise<void>,
) {
```

e o `submit`:

```ts
  function submit() {
    if (mode === 'create') {
      create.mutate(
        { name: form.name, rut: form.rut, email: form.email, phone: form.phone, client_id: form.client_id },
        {
          // A foto escolhida no create sobe DEPOIS do 201, quando o id existe
          // (spec D10). `afterCreate` nunca lança — se o upload falhar, o
          // diálogo continua aberto mostrando o motivo (spec D11).
          onSuccess: async (created) => {
            await afterCreate?.(created)
            onDone()
          },
        },
      )
      return
    }
    // client_id não vai no update: trocar de empresa é ato da matrícula (D3).
    update.mutate(
      { id: student!.id as number, payload: { name: form.name, rut: form.rut, email: form.email, phone: form.phone } },
      { onSuccess: onDone },
    )
  }
```

- [ ] **Step 2: Integrar no `StudentDialog`**

Em `frontend/src/features/identity/components/Student/StudentDialog.tsx`:

Acrescentar `AppPhotoField` ao import de `@shared/ui`, e:

```tsx
import { useEntityPhoto } from '@shared/hooks'
import { studentsApi } from '@shared/api/studentsApi'
```

Dentro do componente, antes do `return`, montar o hook e ligar o pós-create:

```tsx
  const photo = useEntityPhoto({
    resource: 'students',
    id: mode === 'create' ? null : (student?.id ?? null),
    mode,
    url: student?.photo_url,
    invalidateKey: studentsApi.keys.all,
  })

  // `flush` sobe a foto bufferizada com o id recém-criado. Não lança: a
  // entidade já existe, e fechar o diálogo aqui esconderia a falha (D11).
  const { form, set, readOnly, submit, pending, fieldErrors, generalError } =
    useStudentForm(student, mode, onHide, (created) => photo.flush(created.id as number))
```

> Substitua a chamada atual de `useStudentForm(student, mode, onHide)` por esta. A ordem importa: `photo` precisa ser declarado antes, porque o callback o referencia.

Trocar a prop do `CrudDialog` que hoje põe o avatar no header — **remover** a linha:

```tsx
      headerExtra={mode !== 'create' ? <AppAvatar name={form.name} size="normal" /> : null}
```

e remover `AppAvatar` do import de `@shared/ui` (o componente deixa de ser usado neste arquivo).

Logo depois de `<FormErrorBanner message={generalError} />`, acrescentar o banner da falha bufferizada e, dentro da `<section>`, o campo de foto no topo:

```tsx
      <FormErrorBanner message={generalError} />
      {photo.hasBufferedFailure && <FormErrorBanner message={t('photo.createUploadFailed')} />}

      <section className="space-y-4">
        <AppPhotoField
          name={form.name}
          url={photo.url}
          readOnly={readOnly}
          pending={photo.pending}
          error={photo.error}
          onSelect={photo.onSelect}
          onRemove={photo.onRemove}
          onSizeReject={photo.onSizeReject}
          onRetry={photo.hasBufferedFailure ? photo.onRetry : undefined}
        />

        <FormSection title={t('student.sectionPersonal')} />
```

O restante da seção segue inalterado.

- [ ] **Step 3: Verificar**

```bash
cd frontend && pnpm build && pnpm lint
```

Esperado: verdes. Se o TS reclamar que `created.id` é `number | undefined`, o cast `as number` do Step 2 resolve — o backend sempre devolve `id` no 201.

- [ ] **Step 4: Prova na tela**

Com `docker compose up -d` e `pnpm dev`, em `/personas` → aba *Alumnos*:

1. Abrir um aluno em *edit*, selecionar uma foto → o avatar troca sem recarregar a página; a mesma foto aparece na primeira coluna da tabela.
2. *Substituir* por outra → a nova aparece.
3. *Remover* → volta às iniciais.
4. Criar um aluno novo escolhendo foto **antes** de salvar → depois do save, o aluno aparece na tabela **com** a foto.
5. Abrir em *view* → sem botões de foto, sem avatar no header do diálogo.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/identity/components/Student/StudentDialog.tsx frontend/src/features/identity/hooks/useStudentForm.ts
git commit -m "feat(identity): adiciona campo de foto ao dialogo de aluno"
```

---

## Task 10: Foto nos outros 3 diálogos

**Files:**
- Modify: `frontend/src/features/identity/components/Admin/StaffUserDialog.tsx`
- Modify: `frontend/src/features/identity/hooks/useStaffUserForm.ts`
- Modify: `frontend/src/features/identity/components/Redator/RedatorDialog.tsx`
- Modify: `frontend/src/features/identity/hooks/useRedatorForm.ts`
- Modify: `frontend/src/features/commercial/components/Client/ClientDialog.tsx`
- Modify: `frontend/src/features/commercial/hooks/useClientForm.ts`

**Interfaces:**
- Consumes: exatamente o mesmo par `AppPhotoField` + `useEntityPhoto` da Task 9. Repita a forma; não invente uma segunda.

- [ ] **Step 1: `StaffUserDialog` (recurso `users`)**

Em `useStaffUserForm.ts`, acrescentar o 4º parâmetro e usar no `onSuccess` do create, exatamente como na Task 9:

```ts
export function useStaffUserForm(
  user: UserData | null,
  mode: DialogMode,
  onDone: () => void,
  afterCreate?: (created: UserData) => Promise<void>,
) {
```

```ts
    if (mode === 'create') {
      create.mutate(
        { ...base, password: form.password },
        {
          onSuccess: async (created) => {
            await afterCreate?.(created)
            onDone()
          },
        },
      )
      return
    }
```

Em `StaffUserDialog.tsx`, acrescentar `AppPhotoField` ao import de `@shared/ui`, mais:

```tsx
import { useEntityPhoto } from '@shared/hooks'
import { usersApi } from '@shared/api/usersApi'
```

```tsx
  const photo = useEntityPhoto({
    resource: 'users',
    id: mode === 'create' ? null : (user?.id ?? null),
    mode,
    url: user?.photo_url,
    invalidateKey: usersApi.keys.all,
  })

  const { form, set, readOnly, submit, pending, fieldErrors, generalError } =
    useStaffUserForm(user, mode, onHide, (created) => photo.flush(created.id as number))
```

e, no JSX, depois do `<FormErrorSummary ... />` e antes do `<FormSection title={t('admin.sectionUser')} />`:

```tsx
      {photo.hasBufferedFailure && <FormErrorBanner message={t('photo.createUploadFailed')} />}

      <section className="space-y-4">
        <AppPhotoField
          name={form.name}
          url={photo.url}
          readOnly={readOnly}
          pending={photo.pending}
          error={photo.error}
          onSelect={photo.onSelect}
          onRemove={photo.onRemove}
          onSizeReject={photo.onSizeReject}
          onRetry={photo.hasBufferedFailure ? photo.onRetry : undefined}
        />

        <FormSection title={t('admin.sectionUser')} />
```

> Se o nome do módulo de API divergir (`usersApi`, `staffUsersApi`), confirme lendo `frontend/src/shared/api/` — não invente o nome.

- [ ] **Step 2: `RedatorDialog` (recurso `redatores`)**

Mesma forma. Em `useRedatorForm.ts`, acrescentar o parâmetro `afterCreate?: (created: RedatorData) => Promise<void>` e envolver o `onSuccess` do create do mesmo jeito. Em `RedatorDialog.tsx`:

```tsx
import { useEntityPhoto } from '@shared/hooks'
import { redatoresApi } from '@shared/api/redatoresApi'
```

```tsx
  const photo = useEntityPhoto({
    resource: 'redatores',
    id: mode === 'create' ? null : (redator?.id ?? null),
    mode,
    url: redator?.photo_url,
    invalidateKey: redatoresApi.keys.all,
  })
```

E o `<AppPhotoField ... name={form.name} ... />` no topo da primeira `<section>` do corpo, com as mesmas props da Task 9.

> **Cuidado:** o redator já sobe documentos por mutação própria. A foto é um caminho separado (`/photo`), e o `RedatorData` tem `prepareForPipeline` mexendo em `documents` — nada disso é afetado. Não misture os dois fluxos.

- [ ] **Step 3: `ClientDialog` (recurso `clients`)**

Em `useClientForm.ts`, acrescentar o parâmetro e usar no create:

```ts
export function useClientForm(
  client: ClientData | null,
  mode: ClientDialogMode,
  onDone: () => void,
  afterCreate?: (created: ClientData) => Promise<void>,
) {
```

```ts
    if (mode === 'create') {
      create.mutate(payload, {
        onSuccess: async (created) => {
          await afterCreate?.(created)
          onDone()
        },
      })
      return
    }
```

Em `ClientDialog.tsx`:

```tsx
import { useEntityPhoto } from '@shared/hooks'
import { clientsApi } from '@shared/api/clientsApi'
```

```tsx
  const photo = useEntityPhoto({
    resource: 'clients',
    id: mode === 'create' ? null : (client?.id ?? null),
    mode,
    url: client?.photo_url,
    invalidateKey: clientsApi.keys.all,
  })
```

O `AppPhotoField` usa `form.legal_name` como nome — cliente é empresa, e é a razón social que aparece na tabela:

```tsx
      {photo.hasBufferedFailure && <FormErrorBanner message={t('photo.createUploadFailed')} />}

      <section className="space-y-4">
        <AppPhotoField
          name={form.legal_name}
          url={photo.url}
          readOnly={readOnly}
          pending={photo.pending}
          error={photo.error}
          onSelect={photo.onSelect}
          onRemove={photo.onRemove}
          onSizeReject={photo.onSizeReject}
          onRetry={photo.hasBufferedFailure ? photo.onRetry : undefined}
        />

        <FormSection title={t('client.sectionGeneral')} />
```

- [ ] **Step 4: Verificar**

```bash
cd frontend && pnpm build && pnpm lint
```

- [ ] **Step 5: Prova na tela**

Repetir os 5 passos da Task 9 §4 em `/usuarios` (staff), `/personas` → *Redactores*, e `/clientes`.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/features
git commit -m "feat(frontend): adiciona campo de foto aos dialogos de staff, redator e cliente"
```

---

## Task 11: Contatos do cliente em cards

**Files:**
- Modify: `frontend/src/features/commercial/components/Client/ContactFields.tsx`
- Modify: `frontend/src/features/commercial/hooks/useClientForm.ts`
- Modify: `frontend/src/features/commercial/components/Client/ClientDialog.tsx`
- Modify: `frontend/src/shared/config/locales/{es-CL,pt-BR,en}.json`

**Interfaces:**
- Consumes: `AppCard`, `AppTag`, `AppButton`, `FormField`, `AppRadioButton`, `AppInputText`.
- Produces: `useClientForm` passa a expor `removeContact(i: number): void`.

- [ ] **Step 1: Acrescentar `removeContact` ao hook**

Em `frontend/src/features/commercial/hooks/useClientForm.ts`, junto dos outros manipuladores de array (a manipulação vive no hook, não solta no JSX — `frontend-fsliced.md`):

```ts
  /** Remove o contato do índice. Não deixa a lista vazia: o backend exige ao
   * menos um (spec D13) e a UI desabilita o botão nesse caso — esta guarda é
   * a rede, não a regra. Se o removido era o principal, o primeiro que sobra
   * assume, para a lista nunca ficar sem principal por efeito colateral. */
  const removeContact = (i: number) =>
    setForm((f) => {
      if (f.contacts.length <= 1) return f

      const rest = f.contacts.filter((_, idx) => idx !== i)
      const hasPrimary = rest.some((c) => c.is_primary)

      return {
        ...f,
        contacts: hasPrimary ? rest : rest.map((c, idx) => ({ ...c, is_primary: idx === 0 })),
      }
    })
```

e acrescentá-lo ao objeto de retorno, junto de `addContact`:

```ts
    setAddr, patchContact, setPrimaryContact, addContact, removeContact,
```

- [ ] **Step 2: Reescrever `ContactFields`**

Substituir o conteúdo de `frontend/src/features/commercial/components/Client/ContactFields.tsx`:

```tsx
import { useTranslation } from 'react-i18next'
import { AppButton, AppCard, AppInputText, AppRadioButton, AppTag, FormField } from '@shared/ui'
import type { ClientData } from '@shared/types/generated'

/** Lista de contatos do cliente. `key={i}` (não `id`): o backend replace-total
 * recria os nested e o id muda a cada save — o índice é a identidade estável.
 *
 * Cada contato é um card (spec D12). O principal usa `tone="info"` do próprio
 * AppCard mais um AppTag: antes, "principal" era só um radio com `title`,
 * invisível sem hover. Os campos usam FormField (label + erro) e não
 * NestedField, que por contrato não tem label — o rótulo só existia como
 * placeholder, que some ao digitar. */
export function ContactFields({
  contacts, readOnly, fieldErrors, onPatch, onSetPrimary, onAdd, onRemove,
}: {
  contacts: ClientData['contacts']
  readOnly: boolean
  fieldErrors?: Record<string, string[]> | null
  onPatch: (i: number, patch: Partial<ClientData['contacts'][number]>) => void
  onSetPrimary: (i: number) => void
  onAdd: () => void
  onRemove: (i: number) => void
}) {
  const { t } = useTranslation()
  const isLast = contacts.length <= 1

  return (
    <div className="space-y-3">
      {contacts.map((c, i) => (
        <AppCard key={i} tone={c.is_primary ? 'info' : 'neutral'}>
          <div className="space-y-3 p-4">
            <div className="flex items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-sm">
                <AppRadioButton
                  name="primaryContact"
                  checked={c.is_primary}
                  disabled={readOnly}
                  aria-label={t('client.contactPrimary')}
                  onChange={() => onSetPrimary(i)}
                />
                <span>{t('client.contactPrimary')}</span>
                {c.is_primary && <AppTag value={t('client.contactPrimaryTag')} severity="info" />}
              </label>

              {!readOnly && (
                <span title={isLast ? t('client.lastContactHint') : t('client.removeContact')}>
                  <AppButton
                    icon="pi pi-trash"
                    text
                    rounded
                    severity="danger"
                    disabled={isLast}
                    aria-label={t('client.removeContact')}
                    onClick={() => onRemove(i)}
                  />
                </span>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label={t('client.contactName')} error={fieldErrors?.[`contacts.${i}.name`]?.[0]}>
                <AppInputText value={c.name} disabled={readOnly} onChange={(e) => onPatch(i, { name: e.target.value })} className="w-full" />
              </FormField>
              <FormField label={t('client.contactJobTitle')} error={fieldErrors?.[`contacts.${i}.job_title`]?.[0]}>
                <AppInputText value={c.job_title ?? ''} disabled={readOnly} onChange={(e) => onPatch(i, { job_title: e.target.value })} className="w-full" />
              </FormField>
              <FormField label={t('common.email')} error={fieldErrors?.[`contacts.${i}.email`]?.[0]}>
                <AppInputText value={c.email ?? ''} disabled={readOnly} onChange={(e) => onPatch(i, { email: e.target.value })} className="w-full" />
              </FormField>
              <FormField label={t('common.phone')} error={fieldErrors?.[`contacts.${i}.phone`]?.[0]}>
                <AppInputText value={c.phone ?? ''} disabled={readOnly} onChange={(e) => onPatch(i, { phone: e.target.value })} className="w-full" />
              </FormField>
            </div>
          </div>
        </AppCard>
      ))}

      {!readOnly && (
        <AppButton label={t('client.addContact')} icon="pi pi-user-plus" text onClick={onAdd} />
      )}
    </div>
  )
}
```

> O `<span title=...>` envolvendo o botão não é decoração: um `<button disabled>` não dispara eventos de mouse na maioria dos browsers, então o `title` no próprio botão nunca apareceria — e o motivo de não poder excluir ficaria invisível, que é a falha escondida que este bloco evita.

- [ ] **Step 3: Ligar `onRemove` no `ClientDialog`**

Em `frontend/src/features/commercial/components/Client/ClientDialog.tsx`, acrescentar `removeContact` à desestruturação do hook e passá-lo ao componente:

```tsx
  const { form, set, readOnly, submit, pending, fieldErrors, generalError, setAddr, patchContact, setPrimaryContact, addContact, removeContact } =
    useClientForm(client, mode, onHide, (created) => photo.flush(created.id as number))
```

```tsx
        <ContactFields
          contacts={form.contacts}
          readOnly={readOnly}
          fieldErrors={fieldErrors}
          onPatch={patchContact}
          onSetPrimary={setPrimaryContact}
          onAdd={addContact}
          onRemove={removeContact}
        />
```

- [ ] **Step 4: Acrescentar as chaves de i18n**

Dentro do objeto `client` dos 3 locales.

`es-CL.json`:

```json
    "contactPrimaryTag": "Principal",
    "removeContact": "Eliminar contacto",
    "lastContactHint": "El cliente debe tener al menos un contacto",
```

`pt-BR.json`:

```json
    "contactPrimaryTag": "Principal",
    "removeContact": "Remover contato",
    "lastContactHint": "O cliente precisa de ao menos um contato",
```

`en.json`:

```json
    "contactPrimaryTag": "Primary",
    "removeContact": "Remove contact",
    "lastContactHint": "The client must have at least one contact",
```

- [ ] **Step 5: Verificar**

```bash
cd frontend && pnpm build && pnpm lint
```

- [ ] **Step 6: Prova na tela**

Em `/clientes`, abrir um cliente em *edit*:

1. Cada contato aparece como card; o principal está tingido e com a tag *Principal*.
2. Todo campo tem label visível **antes** de digitar.
3. Trocar o principal move o tom e a tag para o outro card.
4. *Adicionar* cria um card novo; o botão de excluir dele fica ativo.
5. Excluir até restar um → o botão fica desabilitado e o `title` diz o motivo.
6. A 768px os campos caem para 1 coluna e a página não rola na horizontal.
7. Em *view*, nem excluir nem adicionar aparecem.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/features/commercial frontend/src/shared/config/locales
git commit -m "feat(commercial): reestrutura contatos do cliente em cards com exclusao"
```

---

## Task 12: DoD end-to-end

**Files:** nenhum. Esta task só prova.

- [ ] **Step 1: Suíte, Pint e build**

```bash
docker compose exec -T app php artisan test
cd backend && ./vendor/bin/pint --test app/Domains/Identity app/Domains/Commercial
cd ../frontend && pnpm build && pnpm lint
```

Esperado: suíte verde (baseline 321 + os casos novos), Pint sem diff, build e lint verdes.

- [ ] **Step 2: Prova contra a API real, com sessão Sanctum autenticada**

Com `docker compose up -d` e o front logado, no console do browser (usa o cookie de sessão e o CSRF já inicializados):

```js
// 1. Upload de 200 KB numa entidade real → 204
const ok = new File([new Uint8Array(200 * 1024)], 'foto.jpg', { type: 'image/jpeg' })
const fd = new FormData(); fd.append('photo', ok)
await fetch('/api/students/1/photo', { method: 'POST', body: fd, credentials: 'include',
  headers: { 'X-XSRF-TOKEN': decodeURIComponent(document.cookie.match(/XSRF-TOKEN=([^;]+)/)[1]) } })
  .then(r => r.status)   // 204

// 2. photo_url não-nulo na leitura seguinte
await fetch('/api/students/1', { credentials: 'include' }).then(r => r.json()).then(d => d.photo_url)

// 3. Arquivo de 6 MB → 422 application/problem+json com errors.photo
const big = new File([new Uint8Array(6 * 1024 * 1024)], 'grande.jpg', { type: 'image/jpeg' })
const fd2 = new FormData(); fd2.append('photo', big)
const r = await fetch('/api/students/1/photo', { method: 'POST', body: fd2, credentials: 'include',
  headers: { 'X-XSRF-TOKEN': decodeURIComponent(document.cookie.match(/XSRF-TOKEN=([^;]+)/)[1]) } })
r.status                              // 422
r.headers.get('content-type')         // application/problem+json
await r.json()                        // { errors: { photo: [...] } }

// 4. Remoção → 204 e photo_url volta a null
```

Registre as respostas reais. `413` em vez de `422` significa que uma camada de transporte cortou antes do Laravel — pare e investigue, não normalize.

- [ ] **Step 3: Prova visual do João**

Nos dois temas, a 1400px e a 768px:

- as 4 tabelas com avatar na primeira coluna — foto quando há, iniciais quando não há;
- os 4 diálogos com `AppPhotoField` no corpo: selecionar, substituir e remover;
- `StudentDialog` **sem** avatar no header;
- foto escolhida no create aparecendo depois do save;
- imagem indisponível caindo para iniciais — para forçar, edite `photo_url` na resposta pelas devtools ou espere a URL expirar;
- contatos em cards com labels, principal destacado, exclusão funcionando e o botão desabilitado com motivo quando resta um só contato.

- [ ] **Step 4: Comparar com as 4 imagens de referência**

`alumnos-exemplo-avatar`, `client-no-component-photo`, `redator-no-component-photo`, `alumnos-component-wrong-photo` — caller-held, fornecidas pelo João na sessão. Elas calibram o visual; divergência entre elas e o implementado é decisão do João, não ajuste silencioso.

---

## Handoff de execução

**executor: split**

- **Tasks 1–4 (backend + tipos gerados): `codex`.** Paths fechados, verificação executável (`artisan test`, `pint`), zero julgamento visual. Mesma divisão que funcionou no bloco anterior.

  `paths_autorizados`:
  ```
  backend/app/Domains/Identity/Services/UserPhotoService.php
  backend/app/Domains/Identity/Http/Controllers/UserPhotoController.php
  backend/app/Domains/Identity/Http/Controllers/RedatorPhotoController.php
  backend/app/Domains/Identity/Http/Controllers/StudentPhotoController.php
  backend/app/Domains/Commercial/Http/Controllers/ClientPhotoController.php
  backend/app/Domains/Identity/routes.php
  backend/app/Domains/Commercial/routes.php
  backend/app/Domains/Identity/Data/UserData.php
  backend/app/Domains/Identity/Data/RedatorData.php
  backend/app/Domains/Identity/Data/StudentData.php
  backend/app/Domains/Commercial/Data/ClientData.php
  backend/tests/Feature/**
  frontend/src/shared/types/generated.ts
  ```

- **Tasks 5–12 (frontend): `claude`.** Não há test runner no frontend — a prova é visual e exige julgamento sobre a tela. A Task 11 ainda depende das imagens de referência caller-held.

**Revisão de risco:** a Parte A toca contrato de escrita (`contacts` mínimo 1) e apaga objeto de storage de forma irreversível. Como no bloco anterior, o review pede **segunda lente independente** sobre o intervalo de commits da Parte A antes do fechamento.

---

## Autorrevisão do plano

**Cobertura da spec:** D1→Task 2 · D2→Task 1 · D3→Tasks 1, 3 · D4→Task 1 (steps 1, 3) · D5→Task 3 · D6→Task 1 (`URL_MINUTES`) · D7→Task 5 · D8→Tasks 6, 7 · D9→Tasks 1 (`RULES`), 6 (`MAX_PHOTO_BYTES`) · D10→Tasks 7 (`flush`), 9 · D11→Tasks 7 (`hasBufferedFailure`), 9, 10 · D12→Task 11 · D13→Tasks 4, 11 · D14→Task 11 (sem `ConfirmDialog`) · D15→Task 9 (remoção do `headerExtra`). §7 da spec (testes) → Tasks 1–4 e 12. §8 (DoD) → Task 12.

**Consistência de tipos:** `UserPhotoService::RULES`/`store`/`remove`/`urlFor` idênticos nas Tasks 1, 2, 3. `photoResource`/`useEntityPhoto` idênticos nas Tasks 7, 9, 10. `AppPhotoFieldProps` da Task 6 bate com o uso nas Tasks 9 e 10 — incluindo `onSizeReject`, que a Task 6 corrige no Step 3.

**Riscos conhecidos:**

- A Task 2 assume que `User::factory()` encadeia `redator()`/`student()`/`client()`. O padrão do repositório está em `CadastroAuthorizationTest.php:52-54`; se as colunas obrigatórias divergirem, leia as migrations — não invente coluna.
- A Task 10 assume os nomes `usersApi` e `redatoresApi` em `shared/api/`. Confirme antes de escrever.
- Se um teste pré-existente de cliente quebrar na Task 4 por não mandar `contacts`, o certo é corrigir o teste, não relaxar a regra.
