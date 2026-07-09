# Sprint 1 · Cadastros Frontend + Documentos tipados — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar o frontend dos cadastros de Cliente e Redator (hooks CRUD abstraídos + template de módulo + telas), e a extensão de backend de documentos tipados do redator.

**Architecture:** Backend primeiro (documentos tipados, TDD contra sqlite `:memory:`), depois a camada `shared` do front (fábrica `createCrudResource` + wrappers PrimeReact), depois as telas de cliente e redator (dialog unificado view=edit=create). Cada fase é verificável antes da próxima.

**Tech Stack:** Laravel 13 / PHP 8.3 · spatie/laravel-data · owen-it/laravel-auditing · React 19 + TypeScript · TanStack Query · PrimeReact (via `shared/ui`) · Tailwind v4.

## Global Constraints

- **DDD-lite, sem Repository.** Regra de escrita → Action; CRUD sem regra → controller direto (ADR-02).
- **`files` NÃO muda de schema.** Enum de tipo é por entidade (`RedatorDocumentType`), só valida/rotula o campo `type` string.
- **Tipos TS são gerados** do backend (`#[TypeScript]` → `frontend/src/shared/types/generated.ts`). Nunca editar `generated.ts` à mão; regenerar após mudar `Data`.
- **Features não importam PrimeReact direto** (só via `shared/ui`) **nem outra feature** (ADR-05). Tipo compartilhado de `shared/types` é permitido.
- **Auth = cookie Sanctum + CSRF.** `initCsrf()` antes da primeira mutação. Controllers deixam exceção subir (handler global RFC 7807).
- **Backend:** rodar testes com `docker compose run --rm app php artisan test` (ou `php artisan test` se PHP local). Regenerar tipos: `php artisan typescript:transform`.
- **Frontend não tem test runner.** Verificação de cada task de front = `pnpm build` (tsc type-check) **e** `pnpm lint` limpos, mais checagem manual no browser (`pnpm dev`, http://localhost:5173). Onde o plano diz "verificar", rode os dois comandos de `frontend/`.
- **Commits frequentes**, conventional commits, em PT. Terminar mensagem de commit com `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

---

## FASE A — Backend: documentos tipados do redator

### Task A1: Enum `RedatorDocumentType` + `File` auditável + morph map

**Files:**
- Create: `backend/app/Domains/Identity/Enums/RedatorDocumentType.php`
- Modify: `backend/app/Shared/Files/Models/File.php`
- Modify: `backend/app/Providers/AppServiceProvider.php:35` (bloco `enforceMorphMap`)
- Test: `backend/tests/Feature/Cadastros/RedatorDocumentTest.php` (novo, usado nas tasks A1–A3)

**Interfaces:**
- Produces: `RedatorDocumentType` enum (string-backed) com cases `CV`, `REUF`, `TITULO`, `POSTGRADO`. `File` passa a ser `Auditable`. Alias de morph map `'file'`.

- [ ] **Step 1: Escrever o teste que falha**

Adicionar em `backend/tests/Feature/Cadastros/RedatorDocumentTest.php`:

```php
<?php

namespace Tests\Feature\Cadastros;

use App\Domains\Identity\Enums\RedatorDocumentType;
use App\Shared\Files\Models\File;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Foundation\Testing\RefreshDatabase;
use OwenIt\Auditing\Contracts\Auditable;
use Tests\TestCase;

class RedatorDocumentTest extends TestCase
{
    use RefreshDatabase;

    public function test_enum_tem_os_quatro_tipos(): void
    {
        $this->assertSame(
            ['CV', 'REUF', 'TITULO', 'POSTGRADO'],
            array_map(fn (RedatorDocumentType $t) => $t->value, RedatorDocumentType::cases()),
        );
    }

    public function test_file_e_auditavel_e_esta_no_morph_map(): void
    {
        $this->assertInstanceOf(Auditable::class, new File());
        $this->assertSame('file', (new File())->getMorphClass());
        $this->assertArrayHasKey('file', Relation::$morphMap);
    }
}
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `docker compose run --rm app php artisan test --filter=RedatorDocumentTest`
Expected: FAIL (`RedatorDocumentType` não existe).

- [ ] **Step 3: Criar o enum**

`backend/app/Domains/Identity/Enums/RedatorDocumentType.php`:

```php
<?php

namespace App\Domains\Identity\Enums;

/**
 * Tipos de documento de idoneidade do redator. Vive no domínio (não é global):
 * a tabela `files` é polimórfica e o `type` é string livre; este enum só
 * restringe/rotula os documentos de redator. Turma terá o seu no futuro.
 */
enum RedatorDocumentType: string
{
    case CV = 'CV';
    case REUF = 'REUF';
    case TITULO = 'TITULO';
    case POSTGRADO = 'POSTGRADO';
}
```

- [ ] **Step 4: Tornar `File` auditável**

Em `backend/app/Shared/Files/Models/File.php`, trocar a declaração da classe e imports:

```php
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use OwenIt\Auditing\Auditable as AuditableTrait;
use OwenIt\Auditing\Contracts\Auditable;

class File extends Model implements Auditable
{
    use AuditableTrait, SoftDeletes;

    protected $auditInclude = [
        'fileable_type', 'fileable_id', 'type', 'path', 'valid_until',
    ];
```

(o resto do model — `$fillable`, `$casts`, `fileable()` — fica igual.)

- [ ] **Step 5: Registrar alias no morph map**

Em `backend/app/Providers/AppServiceProvider.php`, dentro do `enforceMorphMap([...])`, acrescentar a linha:

```php
            'file'            => \App\Shared\Files\Models\File::class,
```

- [ ] **Step 6: Rodar e ver passar**

Run: `docker compose run --rm app php artisan test --filter=RedatorDocumentTest`
Expected: PASS (2 testes).

- [ ] **Step 7: Commit**

```bash
git add backend/app/Domains/Identity/Enums/RedatorDocumentType.php backend/app/Shared/Files/Models/File.php backend/app/Providers/AppServiceProvider.php backend/tests/Feature/Cadastros/RedatorDocumentTest.php
git commit -m "feat(identity): enum RedatorDocumentType + File auditavel no morph map

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task A2: Upload tipado + expor documentos no `RedatorData`

**Files:**
- Create: `backend/app/Domains/Identity/Data/RedatorDocumentData.php`
- Modify: `backend/app/Domains/Identity/Data/RedatorData.php`
- Modify: `backend/app/Shared/Files/Actions/UploadFileAction.php` (assinatura `execute`)
- Modify: `backend/app/Domains/Identity/Actions/CreateRedatorAction.php`
- Modify: `backend/app/Domains/Identity/Actions/UpdateRedatorAction.php`
- Modify: `backend/app/Domains/Identity/Http/Controllers/RedatorController.php` (store/update)
- Modify: `backend/tests/Feature/Cadastros/RedatorCrudTest.php` (docs agora tipados)
- Modify: `backend/tests/Feature/Cadastros/UploadFileActionTest.php` (assinatura)

**Interfaces:**
- Consumes: `RedatorDocumentType` (A1).
- Produces: `RedatorDocumentData` (`id:int, type:string, original_name:string, valid_until:?string, download_url:string`). `RedatorData` ganha `documents: array<RedatorDocumentData>`. `UploadFileAction::execute(Model $owner, UploadedFile $file, string $type, ?CarbonInterface $validUntil = null, ?string $disk = null): File`. Actions de redator recebem `array<string,UploadedFile>` (chave = valor do enum).

- [ ] **Step 1: Escrever o teste que falha**

Acrescentar em `backend/tests/Feature/Cadastros/RedatorDocumentTest.php`:

```php
    public function test_cria_redator_com_documento_tipado_e_expoe_no_dto(): void
    {
        \Illuminate\Support\Facades\Storage::fake('s3');
        $this->actingAsAdmin();

        $response = $this->postJson('/api/redatores', [
            'name' => 'Juan Morales',
            'rut' => '13.456.789-0',
            'email' => 'jm@lotus.cl',
            'documents' => [
                'CV' => \Illuminate\Http\UploadedFile::fake()->create('cv.pdf', 100, 'application/pdf'),
            ],
        ]);

        $response->assertCreated()
            ->assertJsonPath('documents.0.type', 'CV')
            ->assertJsonPath('documents.0.original_name', 'cv.pdf');

        $this->assertDatabaseHas('files', ['fileable_type' => 'redator', 'type' => 'CV']);
        $this->assertStringContainsString('http', $response->json('documents.0.download_url'));
    }
```

(Adicionar no topo do arquivo o `use Tests\TestCase;` já existe; garantir imports usados.)

- [ ] **Step 2: Rodar e ver falhar**

Run: `docker compose run --rm app php artisan test --filter=RedatorDocumentTest`
Expected: FAIL (chave `documents.0.type` inexistente; `type` gravado é `'documento'`).

- [ ] **Step 3: Criar `RedatorDocumentData`**

`backend/app/Domains/Identity/Data/RedatorDocumentData.php`:

```php
<?php

namespace App\Domains\Identity\Data;

use App\Shared\Files\Actions\UploadFileAction;
use App\Shared\Files\Models\File;
use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * Documento de idoneidade do redator (leitura). O status (vigente/por vencer/
 * vencido) é derivado no front a partir de valid_until.
 */
#[TypeScript]
class RedatorDocumentData extends Data
{
    public function __construct(
        public int $id,
        public string $type,
        public string $original_name,
        public ?string $valid_until,
        public string $download_url,
    ) {}

    public static function fromModel(File $file): self
    {
        return new self(
            id: $file->id,
            type: $file->type,
            original_name: $file->original_name,
            valid_until: $file->valid_until?->toDateString(),
            download_url: app(UploadFileAction::class)->temporaryUrl($file),
        );
    }
}
```

- [ ] **Step 4: Expor `documents` no `RedatorData`**

Em `backend/app/Domains/Identity/Data/RedatorData.php`, acrescentar a propriedade (após `course_ids`) e mapear no `fromModel`:

```php
use Spatie\LaravelData\Attributes\Computed;
// ...
        /** @var array<int> */
        public array|Optional $course_ids,
        /** @var array<RedatorDocumentData> */
        #[Computed]
        public array $documents = [],
    ) {}
```

No `fromModel`, acrescentar o argumento:

```php
            course_ids: $redator->courses->pluck('id')->all(),
            documents: $redator->documents->map(
                fn ($f) => RedatorDocumentData::fromModel($f)
            )->all(),
```

> **Por que `#[Computed]`:** o payload de escrita usa o campo multipart `documents` (arquivos, lidos pelo controller via `$request->file('documents')`). Sem `#[Computed]`, o spatie/laravel-data tentaria hidratar esta propriedade `documents` (esperando `RedatorDocumentData[]`) a partir dos arquivos do request e quebraria. `#[Computed]` tira a propriedade do input: na escrita fica `[]`; a leitura é preenchida só pelo `new self(...)` do `fromModel`. A anotação `@var array<RedatorDocumentData>` guia o typescript-transformer. Não entra em `rules()`.

- [ ] **Step 5: `UploadFileAction` aceita `valid_until`**

Em `backend/app/Shared/Files/Actions/UploadFileAction.php`, trocar a assinatura e o `create`:

```php
use Carbon\CarbonInterface;
// ...
    public function execute(Model $owner, UploadedFile $file, string $type, ?CarbonInterface $validUntil = null, ?string $disk = null): File
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
            'valid_until'   => $validUntil,
        ]);
    }
```

- [ ] **Step 6: Actions de redator recebem docs tipados por chave**

Em `CreateRedatorAction::execute`, trocar o loop de documentos:

```php
            foreach ($documents as $type => $document) {
                $this->uploads->execute($redator, $document, $type);
            }
```

Idem em `UpdateRedatorAction::execute` (mesmo loop `$type => $document`). As docblocks `@param array<UploadedFile>` viram `@param array<string,UploadedFile>`.

- [ ] **Step 7: Controller valida chaves e passa o array tipado**

Em `RedatorController::store` e `::update`, trocar a leitura dos arquivos. Substituir `$request->file('documents', [])` por uma leitura validada:

```php
use App\Domains\Identity\Enums\RedatorDocumentType;
// ...
    private function documentsFromRequest(Request $request): array
    {
        $files = $request->file('documents', []);
        foreach (array_keys($files) as $type) {
            if (RedatorDocumentType::tryFrom((string) $type) === null) {
                abort(422, "Tipo de documento inválido: {$type}");
            }
        }

        return $files;
    }
```

E nos métodos: `$action->execute($data, $this->documentsFromRequest($request))` (store) e `$action->execute($redator, $data, $this->documentsFromRequest($request))` (update).

- [ ] **Step 8: Atualizar os testes existentes que assumiam `type => 'documento'`**

Em `RedatorCrudTest.php`, nos dois testes que enviam `documents`, trocar `'documents' => [UploadedFile::fake()...]` por `'documents' => ['CV' => UploadedFile::fake()->create('cv.pdf', 400, 'application/pdf')]`, e a asserção `'type' => 'documento'` por `'type' => 'CV'`. Em `UploadFileActionTest.php`, a chamada `->execute($redator, $upload, 'cv', 's3')` vira `->execute($redator, $upload, 'cv', null, 's3')`.

- [ ] **Step 9: Regenerar tipos TS**

Run: `docker compose run --rm app php artisan typescript:transform`
Expected: `frontend/src/shared/types/generated.ts` passa a conter `RedatorDocumentData` e `RedatorData.documents`.

- [ ] **Step 10: Rodar toda a suíte de cadastros e ver passar**

Run: `docker compose run --rm app php artisan test --filter=Cadastros`
Expected: PASS (inclui RedatorDocumentTest, RedatorCrudTest, UploadFileActionTest).

- [ ] **Step 11: Commit**

```bash
git add backend/ frontend/src/shared/types/generated.ts
git commit -m "feat(identity): upload de documento tipado + documents[] no RedatorData

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task A3: Rotas nested de documento — replace e soft-delete

**Files:**
- Create: `backend/app/Domains/Identity/Actions/StoreRedatorDocumentAction.php`
- Create: `backend/app/Domains/Identity/Http/Controllers/RedatorDocumentController.php`
- Modify: `backend/app/Domains/Identity/routes.php`
- Test: `backend/tests/Feature/Cadastros/RedatorDocumentTest.php`

**Interfaces:**
- Consumes: `RedatorDocumentType` (A1), `UploadFileAction` (A2).
- Produces: `POST api/redatores/{redator}/documents` (campos `type`, `file`, `valid_until?`) → `RedatorDocumentData`; `DELETE api/documents/{document}` → 204. `StoreRedatorDocumentAction::execute(Redator, RedatorDocumentType, UploadedFile, ?CarbonInterface): File` (replace: soft-delete doc ativo do mesmo tipo antes de criar).

- [ ] **Step 1: Escrever os testes que falham**

Acrescentar em `RedatorDocumentTest.php`:

```php
    public function test_substitui_documento_do_mesmo_tipo(): void
    {
        \Illuminate\Support\Facades\Storage::fake('s3');
        $this->actingAsAdmin();

        $id = $this->postJson('/api/redatores', [
            'name' => 'Juan', 'rut' => '13.456.789-0', 'email' => 'jm@lotus.cl',
            'documents' => ['CV' => \Illuminate\Http\UploadedFile::fake()->create('cv1.pdf', 100, 'application/pdf')],
        ])->json('id');

        $this->postJson("/api/redatores/{$id}/documents", [
            'type' => 'CV',
            'file' => \Illuminate\Http\UploadedFile::fake()->create('cv2.pdf', 100, 'application/pdf'),
            'valid_until' => '2027-01-01',
        ])->assertCreated()->assertJsonPath('original_name', 'cv2.pdf');

        // só 1 CV ativo; o antigo foi soft-deletado
        $this->assertSame(1, \App\Shared\Files\Models\File::where('fileable_id', $id)->where('type', 'CV')->count());
        $this->assertSame(1, \App\Shared\Files\Models\File::onlyTrashed()->where('fileable_id', $id)->count());
    }

    public function test_remove_documento_faz_soft_delete_sem_apagar_arquivo(): void
    {
        $storage = \Illuminate\Support\Facades\Storage::fake('s3');
        $this->actingAsAdmin();

        $id = $this->postJson('/api/redatores', [
            'name' => 'Juan', 'rut' => '13.456.789-0', 'email' => 'jm@lotus.cl',
            'documents' => ['CV' => \Illuminate\Http\UploadedFile::fake()->create('cv.pdf', 100, 'application/pdf')],
        ])->json('id');
        $file = \App\Shared\Files\Models\File::where('fileable_id', $id)->first();

        $this->deleteJson("/api/documents/{$file->id}")->assertNoContent();

        $this->assertSoftDeleted('files', ['id' => $file->id]);
        $storage->assertExists($file->path); // arquivo permanece no bucket
    }
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `docker compose run --rm app php artisan test --filter=RedatorDocumentTest`
Expected: FAIL (rotas 404).

- [ ] **Step 3: Criar a Action de replace**

`backend/app/Domains/Identity/Actions/StoreRedatorDocumentAction.php`:

```php
<?php

namespace App\Domains\Identity\Actions;

use App\Domains\Identity\Enums\RedatorDocumentType;
use App\Domains\Identity\Models\Redator;
use App\Shared\Files\Actions\UploadFileAction;
use App\Shared\Files\Models\File;
use Carbon\CarbonInterface;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;

/**
 * Adiciona ou substitui um documento do redator. Se já existe um doc ativo do
 * mesmo tipo, ele é soft-deletado antes (replace) — o binário fica no bucket,
 * rastreável pela auditoria.
 */
class StoreRedatorDocumentAction
{
    public function __construct(private UploadFileAction $uploads) {}

    public function execute(Redator $redator, RedatorDocumentType $type, UploadedFile $file, ?CarbonInterface $validUntil = null): File
    {
        return DB::transaction(function () use ($redator, $type, $file, $validUntil) {
            $redator->documents()->where('type', $type->value)->delete();

            return $this->uploads->execute($redator, $file, $type->value, $validUntil);
        });
    }
}
```

- [ ] **Step 4: Criar o controller nested**

`backend/app/Domains/Identity/Http/Controllers/RedatorDocumentController.php`:

```php
<?php

namespace App\Domains\Identity\Http\Controllers;

use App\Domains\Identity\Actions\StoreRedatorDocumentAction;
use App\Domains\Identity\Data\RedatorDocumentData;
use App\Domains\Identity\Enums\RedatorDocumentType;
use App\Domains\Identity\Models\Redator;
use App\Http\Controllers\Controller;
use App\Shared\Files\Models\File;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Validation\Rules\Enum;

class RedatorDocumentController extends Controller
{
    public function store(Request $request, Redator $redator, StoreRedatorDocumentAction $action): RedatorDocumentData
    {
        $validated = $request->validate([
            'type' => ['required', new Enum(RedatorDocumentType::class)],
            'file' => ['required', 'file', 'max:10240'],
            'valid_until' => ['nullable', 'date'],
        ]);

        $file = $action->execute(
            $redator,
            RedatorDocumentType::from($validated['type']),
            $request->file('file'),
            isset($validated['valid_until']) ? \Carbon\Carbon::parse($validated['valid_until']) : null,
        );

        return RedatorDocumentData::fromModel($file);
    }

    public function destroy(File $document): Response
    {
        $document->delete();

        return response()->noContent();
    }
}
```

- [ ] **Step 5: Registrar as rotas nested**

Em `backend/app/Domains/Identity/routes.php`, dentro do grupo `auth:sanctum`, após o `apiResource('redatores')`, acrescentar:

```php
    use App\Domains\Identity\Http\Controllers\RedatorDocumentController;
    // (adicionar o import no topo do arquivo)

    Route::middleware('permission:identity.user.update')->group(function () {
        Route::post('redatores/{redator}/documents', [RedatorDocumentController::class, 'store']);
        Route::delete('documents/{document}', [RedatorDocumentController::class, 'destroy']);
    });
```

(O import `use` vai no topo com os outros, não dentro do grupo.)

- [ ] **Step 6: Rodar e ver passar**

Run: `docker compose run --rm app php artisan test --filter=RedatorDocumentTest`
Expected: PASS (todos).

- [ ] **Step 7: Rodar a suíte inteira (garantir zero regressão)**

Run: `docker compose run --rm app php artisan test`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add backend/
git commit -m "feat(identity): rotas nested de documento do redator (replace + soft-delete)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## FASE B — Frontend: camada compartilhada (fábrica + wrappers)

> Verificação de cada task desta fase: `cd frontend && pnpm build && pnpm lint`.

### Task B1: Fábrica `createCrudResource`

**Files:**
- Create: `frontend/src/shared/api/crud.ts`
- Create: `frontend/src/shared/api/createCrudResource.ts`
- Modify: `frontend/src/shared/api/` — (sem barrel novo; importar por caminho)

**Interfaces:**
- Consumes: `api` e `ProblemDetails` de `@shared/api/axios`.
- Produces: `createCrudResource<T>(resource: string)` → `{ keys, endpoints, useList, useOne, useCreate, useUpdate, useRemove }`. `keys = { all: [resource], lists(): [resource,'list'], detail(id): [resource,'detail',id] }`.

- [ ] **Step 1: Endpoints axios genéricos**

`frontend/src/shared/api/crud.ts`:

```ts
import { api } from './axios'

/** Funções axios CRUD por recurso REST. Payload `unknown`: quando é FormData,
 * o axios negocia multipart sozinho; senão vai como JSON. */
export function crudEndpoints<T>(resource: string) {
  return {
    list: () => api.get<T[]>(`/${resource}`).then((r) => r.data),
    get: (id: number | string) => api.get<T>(`/${resource}/${id}`).then((r) => r.data),
    create: (payload: unknown) => api.post<T>(`/${resource}`, payload).then((r) => r.data),
    update: (id: number | string, payload: unknown) =>
      api.put<T>(`/${resource}/${id}`, payload).then((r) => r.data),
    remove: (id: number | string) => api.delete(`/${resource}/${id}`).then(() => undefined),
  }
}
```

- [ ] **Step 2: Fábrica de hooks**

`frontend/src/shared/api/createCrudResource.ts`:

```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { UseQueryOptions } from '@tanstack/react-query'
import type { ProblemDetails } from './axios'
import { crudEndpoints } from './crud'

/** Fábrica de hooks CRUD sobre TanStack Query para um recurso REST padrão
 * (index/show/store/update/destroy). Sub-recursos aninhados ficam fora daqui,
 * como hooks pequenos por feature que invalidam `keys.all`. */
export function createCrudResource<T>(resource: string) {
  const keys = {
    all: [resource] as const,
    lists: () => [resource, 'list'] as const,
    detail: (id: number | string) => [resource, 'detail', id] as const,
  }
  const endpoints = crudEndpoints<T>(resource)

  function useList(options?: Partial<UseQueryOptions<T[], ProblemDetails>>) {
    return useQuery<T[], ProblemDetails>({ queryKey: keys.lists(), queryFn: endpoints.list, ...options })
  }

  function useOne(id: number | string | undefined, options?: Partial<UseQueryOptions<T, ProblemDetails>>) {
    return useQuery<T, ProblemDetails>({
      queryKey: keys.detail(id ?? 'none'),
      queryFn: () => endpoints.get(id as number | string),
      enabled: id != null,
      ...options,
    })
  }

  function useCreate() {
    const qc = useQueryClient()
    return useMutation<T, ProblemDetails, unknown>({
      mutationFn: (payload) => endpoints.create(payload),
      onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
    })
  }

  function useUpdate() {
    const qc = useQueryClient()
    return useMutation<T, ProblemDetails, { id: number | string; payload: unknown }>({
      mutationFn: ({ id, payload }) => endpoints.update(id, payload),
      onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
    })
  }

  function useRemove() {
    const qc = useQueryClient()
    return useMutation<void, ProblemDetails, number | string>({
      mutationFn: (id) => endpoints.remove(id),
      onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
    })
  }

  return { keys, endpoints, useList, useOne, useCreate, useUpdate, useRemove }
}
```

- [ ] **Step 3: Verificar type-check**

Run: `cd frontend && pnpm build`
Expected: build OK (sem uso ainda, só compila).

- [ ] **Step 4: Commit**

```bash
git add frontend/src/shared/api/crud.ts frontend/src/shared/api/createCrudResource.ts
git commit -m "feat(shared): fabrica createCrudResource (TanStack Query)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task B2: Wrappers de apresentação (`AppDataTable`, `AppDialog`, `AppDropdown`, `AppTag`, `PageHeader`, `AppTabView`)

**Files:**
- Create: `frontend/src/shared/ui/AppDataTable/AppDataTable.tsx` (+ `index.ts`)
- Create: `frontend/src/shared/ui/AppDialog/AppDialog.tsx` (+ `index.ts`)
- Create: `frontend/src/shared/ui/AppDropdown/AppDropdown.tsx` (+ `index.ts`)
- Create: `frontend/src/shared/ui/AppTag/AppTag.tsx` (+ `index.ts`)
- Create: `frontend/src/shared/ui/AppFileUpload/AppFileUpload.tsx` (+ `index.ts`)
- Create: `frontend/src/shared/ui/PageHeader/PageHeader.tsx` (+ `index.ts`)
- Create: `frontend/src/shared/ui/AppTabView/AppTabView.tsx` (+ `index.ts`)
- Modify: `frontend/src/shared/ui/index.ts` (barrel)

**Interfaces:**
- Produces: `AppDataTable` (reexporta `Column` do Prime como `AppColumn`), `AppDialog` (props herdam `DialogProps`, default `maximizable`), `AppDropdown`, `AppTag`, `AppFileUpload` (wrapper do `FileUpload` do PrimeReact, default `mode="basic" auto customUpload`), `PageHeader` (`{ title, description?, actions? }`), `AppTabView` (reexporta `TabPanel` como `AppTabPanel`).

- [ ] **Step 1: `AppDataTable`**

`frontend/src/shared/ui/AppDataTable/AppDataTable.tsx`:

```tsx
import { DataTable } from 'primereact/datatable'
import type { DataTableProps, DataTableValueArray } from 'primereact/datatable'
import { Column } from 'primereact/column'

/** Wrapper do DataTable: paginação/sort/filtro client-side (o index devolve
 * array puro), dark. Colunas via <AppColumn/>. */
export function AppDataTable<T extends DataTableValueArray>(props: DataTableProps<T>) {
  return (
    <DataTable
      dataKey="id"
      removableSort
      paginator
      rows={10}
      className="text-sm"
      {...props}
    />
  )
}

export { Column as AppColumn }
export type { ColumnProps as AppColumnProps } from 'primereact/column'
```

`frontend/src/shared/ui/AppDataTable/index.ts`:

```ts
export { AppDataTable, AppColumn } from './AppDataTable'
export type { AppColumnProps } from './AppDataTable'
```

- [ ] **Step 2: `AppDialog`**

`frontend/src/shared/ui/AppDialog/AppDialog.tsx`:

```tsx
import { Dialog } from 'primereact/dialog'
import type { DialogProps } from 'primereact/dialog'

/** Wrapper do Dialog: maximizable por default, largo/alto. Usado para os
 * dialogs unificados de cadastro/visualização/edição. */
export function AppDialog(props: DialogProps) {
  return (
    <Dialog
      maximizable
      dismissableMask
      style={{ width: '48rem' }}
      breakpoints={{ '960px': '90vw' }}
      contentClassName="dark:bg-slate-900 dark:text-slate-100"
      headerClassName="dark:bg-slate-900 dark:text-slate-100"
      {...props}
    />
  )
}
```

`frontend/src/shared/ui/AppDialog/index.ts`:

```ts
export { AppDialog } from './AppDialog'
```

- [ ] **Step 3: `AppDropdown`**

`frontend/src/shared/ui/AppDropdown/AppDropdown.tsx`:

```tsx
import { Dropdown } from 'primereact/dropdown'
import type { DropdownProps } from 'primereact/dropdown'

export function AppDropdown(props: DropdownProps) {
  return (
    <Dropdown
      className="w-full dark:bg-slate-800 dark:border-slate-600"
      {...props}
    />
  )
}
```

`frontend/src/shared/ui/AppDropdown/index.ts`:

```ts
export { AppDropdown } from './AppDropdown'
```

- [ ] **Step 4: `AppTag`**

`frontend/src/shared/ui/AppTag/AppTag.tsx`:

```tsx
import { Tag } from 'primereact/tag'
import type { TagProps } from 'primereact/tag'

export function AppTag(props: TagProps) {
  return <Tag {...props} />
}
```

`frontend/src/shared/ui/AppTag/index.ts`:

```ts
export { AppTag } from './AppTag'
```

- [ ] **Step 4b: `AppFileUpload`**

`frontend/src/shared/ui/AppFileUpload/AppFileUpload.tsx`:

```tsx
import { FileUpload } from 'primereact/fileupload'
import type { FileUploadProps } from 'primereact/fileupload'

/** Wrapper do FileUpload do PrimeReact. Default: modo básico, upload
 * automático via customUpload (o chamador trata em `uploadHandler`, subindo
 * pela API própria em vez do endpoint embutido do Prime). */
export function AppFileUpload(props: FileUploadProps) {
  return <FileUpload mode="basic" auto customUpload {...props} />
}
```

`frontend/src/shared/ui/AppFileUpload/index.ts`:

```ts
export { AppFileUpload } from './AppFileUpload'
```

- [ ] **Step 5: `PageHeader`**

`frontend/src/shared/ui/PageHeader/PageHeader.tsx`:

```tsx
import type { ReactNode } from 'react'

/** Cabeçalho de módulo: título + descrição + ações à direita. Presentational
 * puro (não conhece feature). */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string
  description?: string
  actions?: ReactNode
}) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{title}</h2>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 gap-2">{actions}</div>}
    </div>
  )
}
```

`frontend/src/shared/ui/PageHeader/index.ts`:

```ts
export { PageHeader } from './PageHeader'
```

- [ ] **Step 6: `AppTabView`**

`frontend/src/shared/ui/AppTabView/AppTabView.tsx`:

```tsx
import { TabView, TabPanel } from 'primereact/tabview'
import type { TabViewProps } from 'primereact/tabview'

export function AppTabView(props: TabViewProps) {
  return <TabView {...props} />
}

export { TabPanel as AppTabPanel }
```

`frontend/src/shared/ui/AppTabView/index.ts`:

```ts
export { AppTabView, AppTabPanel } from './AppTabView'
```

- [ ] **Step 7: Exportar tudo no barrel**

Acrescentar em `frontend/src/shared/ui/index.ts`:

```ts
export * from './AppDataTable'
export * from './AppDialog'
export * from './AppDropdown'
export * from './AppTag'
export * from './AppFileUpload'
export * from './PageHeader'
export * from './AppTabView'
```

- [ ] **Step 8: Verificar**

Run: `cd frontend && pnpm build && pnpm lint`
Expected: OK.

- [ ] **Step 9: Commit**

```bash
git add frontend/src/shared/ui/
git commit -m "feat(shared/ui): wrappers DataTable/Dialog/Dropdown/Tag/TabView/PageHeader

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task B3: Dataset estático de regiões do Chile

**Files:**
- Create: `frontend/src/shared/lib/chileRegions.ts`
- Modify: `frontend/src/shared/lib/index.ts` (barrel)

**Interfaces:**
- Produces: `CHILE_REGIONS: { label: string; value: string }[]` (16 regiões).

- [ ] **Step 1: Criar o dataset**

`frontend/src/shared/lib/chileRegions.ts`:

```ts
/** 16 regiões do Chile para o dropdown de endereço do cliente. value = label
 * (texto persistido em client_addresses.region). */
const NAMES = [
  'Arica y Parinacota', 'Tarapacá', 'Antofagasta', 'Atacama', 'Coquimbo',
  'Valparaíso', "Región Metropolitana de Santiago", "Libertador General Bernardo O'Higgins",
  'Maule', 'Ñuble', 'Biobío', 'La Araucanía', 'Los Ríos', 'Los Lagos',
  'Aysén del General Carlos Ibáñez del Campo', 'Magallanes y de la Antártica Chilena',
]

export const CHILE_REGIONS = NAMES.map((n) => ({ label: n, value: n }))
```

- [ ] **Step 2: Exportar no barrel**

Acrescentar em `frontend/src/shared/lib/index.ts`:

```ts
export { CHILE_REGIONS } from './chileRegions'
```

- [ ] **Step 3: Verificar e commitar**

```bash
cd frontend && pnpm build
git add frontend/src/shared/lib/
git commit -m "feat(shared): dataset estatico de regioes do Chile

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## FASE C — Frontend: Cliente (módulo Comercial)

> Verificação: `pnpm build && pnpm lint` + checagem manual em `/comercial`.

### Task C1: API do cliente (hook + nested)

**Files:**
- Create: `frontend/src/features/commercial/api/clientsApi.ts`
- Create: `frontend/src/features/commercial/api/useClientNested.ts`

**Interfaces:**
- Consumes: `createCrudResource` (B1), `api` (axios), tipos `ClientData`/`ClientAddressData`/`ClientContactData` de `@shared/types/generated`.
- Produces: `clientsApi` (createCrudResource). `useAddContact/useUpdateContact/useRemoveContact` e `useAddAddress/useUpdateAddress/useRemoveAddress` — mutations que batem nas rotas nested e invalidam `clientsApi.keys.all`.

- [ ] **Step 1: `clientsApi`**

`frontend/src/features/commercial/api/clientsApi.ts`:

```ts
import { createCrudResource } from '@shared/api/createCrudResource'
import type { ClientData } from '@shared/types/generated'

export const clientsApi = createCrudResource<ClientData>('clients')
```

- [ ] **Step 2: hooks nested**

`frontend/src/features/commercial/api/useClientNested.ts`:

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@shared/api/axios'
import type { ProblemDetails } from '@shared/api/axios'
import type { ClientAddressData, ClientContactData } from '@shared/types/generated'
import { clientsApi } from './clientsApi'

function useInvalidateClients() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: clientsApi.keys.all })
}

export function useAddContact() {
  const invalidate = useInvalidateClients()
  return useMutation<ClientContactData, ProblemDetails, { clientId: number; payload: ClientContactData }>({
    mutationFn: ({ clientId, payload }) =>
      api.post(`/clients/${clientId}/contacts`, payload).then((r) => r.data),
    onSuccess: invalidate,
  })
}

export function useUpdateContact() {
  const invalidate = useInvalidateClients()
  return useMutation<ClientContactData, ProblemDetails, { contactId: number; payload: ClientContactData }>({
    mutationFn: ({ contactId, payload }) =>
      api.put(`/contacts/${contactId}`, payload).then((r) => r.data),
    onSuccess: invalidate,
  })
}

export function useRemoveContact() {
  const invalidate = useInvalidateClients()
  return useMutation<void, ProblemDetails, number>({
    mutationFn: (contactId) => api.delete(`/contacts/${contactId}`).then(() => undefined),
    onSuccess: invalidate,
  })
}

export function useAddAddress() {
  const invalidate = useInvalidateClients()
  return useMutation<ClientAddressData, ProblemDetails, { clientId: number; payload: ClientAddressData }>({
    mutationFn: ({ clientId, payload }) =>
      api.post(`/clients/${clientId}/addresses`, payload).then((r) => r.data),
    onSuccess: invalidate,
  })
}

export function useUpdateAddress() {
  const invalidate = useInvalidateClients()
  return useMutation<ClientAddressData, ProblemDetails, { addressId: number; payload: ClientAddressData }>({
    mutationFn: ({ addressId, payload }) =>
      api.put(`/addresses/${addressId}`, payload).then((r) => r.data),
    onSuccess: invalidate,
  })
}

export function useRemoveAddress() {
  const invalidate = useInvalidateClients()
  return useMutation<void, ProblemDetails, number>({
    mutationFn: (addressId) => api.delete(`/addresses/${addressId}`).then(() => undefined),
    onSuccess: invalidate,
  })
}
```

- [ ] **Step 3: Verificar e commitar**

```bash
cd frontend && pnpm build
git add frontend/src/features/commercial/api/
git commit -m "feat(commercial): clientsApi + hooks nested de endereco/contato

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task C2: Dialog unificado de cliente

**Files:**
- Create: `frontend/src/features/commercial/components/ClientDialog.tsx`
- Create: `frontend/src/features/commercial/hooks/useClientForm.ts`

**Interfaces:**
- Consumes: `AppDialog`, `AppInputText`, `AppDropdown`, `AppButton` (`shared/ui`); `clientsApi`, nested hooks (C1); `CHILE_REGIONS`; `ClientData`.
- Produces: `ClientDialog({ visible, mode, client, onHide })` onde `mode: 'view' | 'edit' | 'create'`. `useClientForm(client, mode)` gerencia estado do form + submit.

- [ ] **Step 1: hook do form**

`frontend/src/features/commercial/hooks/useClientForm.ts`:

```ts
import { useEffect, useState } from 'react'
import type { ClientData } from '@shared/types/generated'
import { clientsApi } from '../api/clientsApi'

export type ClientDialogMode = 'view' | 'edit' | 'create'

const EMPTY: ClientData = {
  id: undefined, name: '', rut: '', email: '', phone: null,
  legal_name: '', type: 'client', business_activity: null,
  addresses: [{ id: undefined, line1: null, line2: null, number: null, commune: null, city: null, region: null, zip_code: null, is_primary: true }],
  contacts: [{ id: undefined, name: '', email: null, phone: null, is_primary: true }],
}

export function useClientForm(client: ClientData | null, mode: ClientDialogMode, onDone: () => void) {
  const [form, setForm] = useState<ClientData>(EMPTY)
  const create = clientsApi.useCreate()
  const update = clientsApi.useUpdate()

  useEffect(() => {
    setForm(client ? structuredClone(client) : structuredClone(EMPTY))
  }, [client, mode])

  const readOnly = mode === 'view'
  const set = <K extends keyof ClientData>(k: K, v: ClientData[K]) => setForm((f) => ({ ...f, [k]: v }))

  function submit() {
    const mutation = mode === 'create' ? create : update
    const vars = mode === 'create' ? form : { id: client!.id!, payload: form }
    mutation.mutate(vars as never, { onSuccess: onDone })
  }

  return { form, set, setForm, readOnly, submit, pending: create.isPending || update.isPending, error: (create.error ?? update.error) }
}
```

- [ ] **Step 2: componente do dialog**

`frontend/src/features/commercial/components/ClientDialog.tsx`:

```tsx
import { AppDialog, AppButton, AppInputText, AppDropdown } from '@shared/ui'
import { CHILE_REGIONS } from '@shared/lib'
import type { ClientData } from '@shared/types/generated'
import { useClientForm, type ClientDialogMode } from '../hooks/useClientForm'

const TYPES = [
  { label: 'Cliente', value: 'client' },
  { label: 'Proveedor', value: 'provider' },
  { label: 'Otro', value: 'other' },
]

export function ClientDialog({
  visible, mode, client, onHide,
}: {
  visible: boolean
  mode: ClientDialogMode
  client: ClientData | null
  onHide: () => void
}) {
  const { form, set, setForm, readOnly, submit, pending } = useClientForm(client, mode, onHide)
  const title = mode === 'create' ? 'Nuevo cliente' : form.legal_name || form.name

  const addr = form.addresses[0]
  const setAddr = (patch: Partial<typeof addr>) =>
    setForm((f) => ({ ...f, addresses: [{ ...f.addresses[0], ...patch }] }))

  const footer = readOnly ? null : (
    <div className="flex justify-end gap-2">
      <AppButton label="Cancelar" text onClick={onHide} />
      <AppButton label={mode === 'create' ? 'Registrar cliente' : 'Guardar'} icon="pi pi-check" loading={pending} onClick={submit} />
    </div>
  )

  return (
    <AppDialog header={title} visible={visible} onHide={onHide} footer={footer}>
      <section className="space-y-4">
        <h3 className="text-xs font-semibold uppercase text-slate-500">Datos generales</h3>
        <Field label="Razón social">
          <AppInputText value={form.legal_name} disabled={readOnly} onChange={(e) => set('legal_name', e.target.value)} className="w-full" />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="RUT">
            <AppInputText value={form.rut} disabled={readOnly} onChange={(e) => set('rut', e.target.value)} className="w-full" />
          </Field>
          <Field label="Tipo">
            <AppDropdown value={form.type} options={TYPES} disabled={readOnly} onChange={(e) => set('type', e.value)} />
          </Field>
        </div>
        <Field label="Giro">
          <AppInputText value={form.business_activity ?? ''} disabled={readOnly} onChange={(e) => set('business_activity', e.target.value)} className="w-full" />
        </Field>

        <h3 className="pt-2 text-xs font-semibold uppercase text-slate-500">Dirección</h3>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Región">
            <AppDropdown value={addr.region} options={CHILE_REGIONS} disabled={readOnly} onChange={(e) => setAddr({ region: e.value })} />
          </Field>
          <Field label="Comuna">
            <AppInputText value={addr.commune ?? ''} disabled={readOnly} onChange={(e) => setAddr({ commune: e.target.value })} className="w-full" />
          </Field>
          <Field label="Ciudad">
            <AppInputText value={addr.city ?? ''} disabled={readOnly} onChange={(e) => setAddr({ city: e.target.value })} className="w-full" />
          </Field>
          <Field label="Calle">
            <AppInputText value={addr.line1 ?? ''} disabled={readOnly} onChange={(e) => setAddr({ line1: e.target.value })} className="w-full" />
          </Field>
          <Field label="Número">
            <AppInputText value={addr.number ?? ''} disabled={readOnly} onChange={(e) => setAddr({ number: e.target.value })} className="w-full" />
          </Field>
        </div>

        <h3 className="pt-2 text-xs font-semibold uppercase text-slate-500">Personas de contacto</h3>
        {form.contacts.map((c, i) => (
          <div key={i} className="grid grid-cols-3 gap-2">
            <AppInputText placeholder="Nombre" value={c.name} disabled={readOnly} onChange={(e) => patchContact(setForm, i, { name: e.target.value })} />
            <AppInputText placeholder="Email" value={c.email ?? ''} disabled={readOnly} onChange={(e) => patchContact(setForm, i, { email: e.target.value })} />
            <AppInputText placeholder="Teléfono" value={c.phone ?? ''} disabled={readOnly} onChange={(e) => patchContact(setForm, i, { phone: e.target.value })} />
          </div>
        ))}
        {!readOnly && (
          <AppButton
            label="Agregar contacto"
            icon="pi pi-user-plus"
            text
            onClick={() => setForm((f) => ({ ...f, contacts: [...f.contacts, { id: undefined, name: '', email: null, phone: null, is_primary: false }] }))}
          />
        )}
      </section>
    </AppDialog>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-slate-600 dark:text-slate-300">{label}</span>
      {children}
    </label>
  )
}

function patchContact(
  setForm: React.Dispatch<React.SetStateAction<ClientData>>,
  i: number,
  patch: Partial<ClientData['contacts'][number]>,
) {
  setForm((f) => ({ ...f, contacts: f.contacts.map((c, idx) => (idx === i ? { ...c, ...patch } : c)) }))
}
```

> Nota: no `mode='create'` o cliente vai num único submit com addresses/contacts embutidos (o backend aceita via `ClientData`). Em `edit`, a edição fina de contato/endereço individual usa os hooks nested (C1) — ligar quando o critério de aceite pedir edição granular; para o Sprint 1, o submit único cobre criar e editar.

- [ ] **Step 3: Verificar e commitar**

```bash
cd frontend && pnpm build && pnpm lint
git add frontend/src/features/commercial/components/ClientDialog.tsx frontend/src/features/commercial/hooks/useClientForm.ts
git commit -m "feat(commercial): dialog unificado de cliente (view/edit/create)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task C3: Página do módulo Comercial (lista + tab)

**Files:**
- Create: `frontend/src/features/commercial/components/ClientsTable.tsx`
- Create: `frontend/src/features/commercial/components/CommercialPage.tsx`
- Create: `frontend/src/features/commercial/hooks/useClientsPage.ts`
- Modify: `frontend/src/app/router/AppRouter.tsx` (rota `/comercial`)

**Interfaces:**
- Consumes: `clientsApi.useList` (C1), `ClientDialog` (C2), wrappers (B2).
- Produces: `CommercialPage` (default do módulo). `useClientsPage()` → estado de dialog/seleção/busca.

- [ ] **Step 1: hook da página**

`frontend/src/features/commercial/hooks/useClientsPage.ts`:

```ts
import { useState } from 'react'
import type { ClientData } from '@shared/types/generated'
import { clientsApi } from '../api/clientsApi'
import type { ClientDialogMode } from './useClientForm'

export function useClientsPage() {
  const query = clientsApi.useList()
  const [dialog, setDialog] = useState<{ mode: ClientDialogMode; client: ClientData | null } | null>(null)

  return {
    clients: query.data ?? [],
    loading: query.isLoading,
    dialog,
    openCreate: () => setDialog({ mode: 'create', client: null }),
    openView: (client: ClientData) => setDialog({ mode: 'view', client }),
    close: () => setDialog(null),
  }
}
```

- [ ] **Step 2: tabela**

`frontend/src/features/commercial/components/ClientsTable.tsx`:

```tsx
import { useState } from 'react'
import { AppDataTable, AppColumn, AppTag, AppInputText, AppButton } from '@shared/ui'
import type { ClientData } from '@shared/types/generated'

const TYPE_LABEL: Record<string, string> = { client: 'Cliente', provider: 'Proveedor', other: 'Otro' }

export function ClientsTable({
  clients, loading, onView,
}: {
  clients: ClientData[]
  loading: boolean
  onView: (c: ClientData) => void
}) {
  const [filter, setFilter] = useState('')

  return (
    <div className="space-y-3">
      <AppInputText
        leftIcon="pi pi-search"
        placeholder="Buscar por razón social o RUT..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />
      <AppDataTable
        value={clients}
        loading={loading}
        globalFilter={filter}
        globalFilterFields={['legal_name', 'rut']}
        emptyMessage="Sin clientes"
      >
        <AppColumn field="legal_name" header="Razón social" sortable />
        <AppColumn field="rut" header="RUT" />
        <AppColumn header="Tipo" body={(c: ClientData) => <AppTag value={TYPE_LABEL[c.type] ?? c.type} />} />
        <AppColumn header="Comuna" body={(c: ClientData) => c.addresses[0]?.commune ?? '—'} />
        <AppColumn header="Contactos" body={(c: ClientData) => c.contacts.length} />
        <AppColumn
          body={(c: ClientData) => <AppButton icon="pi pi-eye" text rounded onClick={() => onView(c)} />}
          style={{ width: '4rem' }}
        />
      </AppDataTable>
      <p className="text-sm text-slate-500">{clients.length} clientes</p>
    </div>
  )
}
```

- [ ] **Step 3: página com tab**

`frontend/src/features/commercial/components/CommercialPage.tsx`:

```tsx
import { PageHeader, AppButton, AppTabView, AppTabPanel } from '@shared/ui'
import { useClientsPage } from '../hooks/useClientsPage'
import { ClientsTable } from './ClientsTable'
import { ClientDialog } from './ClientDialog'

export function CommercialPage() {
  const page = useClientsPage()

  return (
    <div>
      <PageHeader
        title="Comercial"
        description="Gestión de clientes y presupuestos de capacitación"
        actions={<AppButton label="Nuevo cliente" icon="pi pi-user-plus" onClick={page.openCreate} />}
      />
      <AppTabView>
        <AppTabPanel header="Clientes">
          <ClientsTable clients={page.clients} loading={page.loading} onView={page.openView} />
        </AppTabPanel>
        <AppTabPanel header="Presupuestos">
          <p className="p-4 text-sm text-slate-500">Módulo de presupuestos — próxima sprint.</p>
        </AppTabPanel>
      </AppTabView>

      {page.dialog && (
        <ClientDialog
          visible
          mode={page.dialog.mode}
          client={page.dialog.client}
          onHide={page.close}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 4: ligar a rota**

Em `frontend/src/app/router/AppRouter.tsx`, importar e trocar a rota `/comercial`:

```tsx
import { CommercialPage } from '@features/commercial/components/CommercialPage'
// ...
          <Route path="/comercial" element={<CommercialPage />} />
```

(remover o `ModulePlaceholder` só dessa linha.)

- [ ] **Step 5: Verificar (build + lint + manual)**

Run: `cd frontend && pnpm build && pnpm lint`
Depois `pnpm dev`, logar, ir em `/comercial`: a tabela lista clientes reais da API; "Nuevo cliente" abre dialog vazio; ícone de olho abre dialog preenchido; criar persiste e a lista atualiza (invalidação).
Expected: comportamento acima confirmado.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/features/commercial/ frontend/src/app/router/AppRouter.tsx
git commit -m "feat(commercial): tela do modulo Comercial (lista de clientes + dialog)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## FASE D — Frontend: Redator (módulo Personas)

> Verificação: `pnpm build && pnpm lint` + checagem manual em `/personas`.

### Task D1: API do redator (hook + documentos)

**Files:**
- Create: `frontend/src/features/identity/api/redatoresApi.ts`
- Create: `frontend/src/features/identity/api/coursesApi.ts`
- Create: `frontend/src/features/identity/api/useRedatorDocuments.ts`

**Interfaces:**
- Consumes: `createCrudResource` (B1), `api`, tipos `RedatorData`/`CourseData`/`RedatorDocumentData`.
- Produces: `redatoresApi`, `coursesApi` (read-only na feature identity — só `useList`), `useUploadDocument()` (`{ redatorId, type, file, valid_until? }` → multipart), `useRemoveDocument()` (`{ redatorId, fileId }`). Invalidam `redatoresApi.keys.all`.

> **Contrato do DELETE (decidido na Task A3):** a rota é aninhada — `DELETE /redatores/{redator}/documents/{document}` — e o backend valida a posse do documento (404 se o doc não for daquele redator). Por isso `useRemoveDocument` precisa do `redatorId`, não só do `fileId`.

> A feature identity instancia `coursesApi` com a fábrica compartilhada e o tipo `CourseData` de `shared/types` — **não** importa a feature `catalog` (respeita ADR-05).

- [ ] **Step 1: `redatoresApi` e `coursesApi`**

`frontend/src/features/identity/api/redatoresApi.ts`:

```ts
import { createCrudResource } from '@shared/api/createCrudResource'
import type { RedatorData } from '@shared/types/generated'

export const redatoresApi = createCrudResource<RedatorData>('redatores')
```

`frontend/src/features/identity/api/coursesApi.ts`:

```ts
import { createCrudResource } from '@shared/api/createCrudResource'
import type { CourseData } from '@shared/types/generated'

/** Só leitura aqui: o dialog do redator lista cursos para as habilitações.
 * Não importa a feature catalog — usa a fábrica shared + o tipo shared. */
export const coursesApi = createCrudResource<CourseData>('courses')
```

- [ ] **Step 2: hooks de documento**

`frontend/src/features/identity/api/useRedatorDocuments.ts`:

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@shared/api/axios'
import type { ProblemDetails } from '@shared/api/axios'
import type { RedatorDocumentData } from '@shared/types/generated'
import { redatoresApi } from './redatoresApi'

function useInvalidate() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: redatoresApi.keys.all })
}

export function useUploadDocument() {
  const invalidate = useInvalidate()
  return useMutation<RedatorDocumentData, ProblemDetails, { redatorId: number; type: string; file: File; valid_until?: string | null }>({
    mutationFn: ({ redatorId, type, file, valid_until }) => {
      const fd = new FormData()
      fd.append('type', type)
      fd.append('file', file)
      if (valid_until) fd.append('valid_until', valid_until)
      return api.post<RedatorDocumentData>(`/redatores/${redatorId}/documents`, fd).then((r) => r.data)
    },
    onSuccess: invalidate,
  })
}

export function useRemoveDocument() {
  const invalidate = useInvalidate()
  return useMutation<void, ProblemDetails, { redatorId: number; fileId: number }>({
    mutationFn: ({ redatorId, fileId }) =>
      api.delete(`/redatores/${redatorId}/documents/${fileId}`).then(() => undefined),
    onSuccess: invalidate,
  })
}
```

- [ ] **Step 3: Verificar e commitar**

```bash
cd frontend && pnpm build
git add frontend/src/features/identity/api/redatoresApi.ts frontend/src/features/identity/api/coursesApi.ts frontend/src/features/identity/api/useRedatorDocuments.ts
git commit -m "feat(identity): redatoresApi + coursesApi (read) + hooks de documento

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task D2: Derivações de status/idoneidade + dialog do redator

**Files:**
- Create: `frontend/src/features/identity/lib/redatorStatus.ts`
- Create: `frontend/src/features/identity/hooks/useRedatorForm.ts`
- Create: `frontend/src/features/identity/components/RedatorDialog.tsx`

**Interfaces:**
- Consumes: `redatoresApi`, `coursesApi`, `useUploadDocument`/`useRemoveDocument` (D1); wrappers.
- Produces: `docStatus(valid_until): 'vigente'|'por_vencer'|'vencido'|'sin_venc'`; `idoneidade(redator): 'idoneo'|'por_vencer'|'no_idoneo'`; `RedatorDialog({ visible, mode, redator, onHide })`.

- [ ] **Step 1: derivações**

`frontend/src/features/identity/lib/redatorStatus.ts`:

```ts
import type { RedatorData, RedatorDocumentData } from '@shared/types/generated'

const WARN_DAYS = 30

export type DocStatus = 'sin_venc' | 'vigente' | 'por_vencer' | 'vencido'

export function docStatus(validUntil: string | null): DocStatus {
  if (!validUntil) return 'sin_venc'
  const days = (new Date(validUntil).getTime() - Date.now()) / 86_400_000
  if (days < 0) return 'vencido'
  if (days < WARN_DAYS) return 'por_vencer'
  return 'vigente'
}

/** Idoneidade provisória (visual). Regra canônica + gate por policy = futuro (RN-09). */
export function idoneidade(r: RedatorData): 'idoneo' | 'por_vencer' | 'no_idoneo' {
  const docs = r.documents ?? []
  const statuses = docs.map((d: RedatorDocumentData) => docStatus(d.valid_until))
  if (statuses.includes('vencido') || (r.course_ids as number[]).length === 0) return 'no_idoneo'
  if (statuses.includes('por_vencer')) return 'por_vencer'
  return 'idoneo'
}
```

- [ ] **Step 2: hook do form**

`frontend/src/features/identity/hooks/useRedatorForm.ts`:

```ts
import { useEffect, useState } from 'react'
import type { RedatorData } from '@shared/types/generated'
import { redatoresApi } from '../api/redatoresApi'
import type { ClientDialogMode } from '@features/commercial/hooks/useClientForm'

export type RedatorDialogMode = ClientDialogMode

const EMPTY: RedatorData = {
  id: undefined, name: '', rut: '', email: '', phone: null, course_ids: [], documents: [],
}

export function useRedatorForm(redator: RedatorData | null, mode: RedatorDialogMode, onDone: () => void) {
  const [form, setForm] = useState<RedatorData>(EMPTY)
  const create = redatoresApi.useCreate()
  const update = redatoresApi.useUpdate()

  useEffect(() => {
    setForm(redator ? structuredClone(redator) : structuredClone(EMPTY))
  }, [redator, mode])

  const readOnly = mode === 'view'
  const set = <K extends keyof RedatorData>(k: K, v: RedatorData[K]) => setForm((f) => ({ ...f, [k]: v }))
  const toggleCourse = (id: number) =>
    setForm((f) => {
      const ids = f.course_ids as number[]
      return { ...f, course_ids: ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id] }
    })

  function submit() {
    const payload = { name: form.name, rut: form.rut, email: form.email, phone: form.phone, course_ids: form.course_ids }
    const mutation = mode === 'create' ? create : update
    const vars = mode === 'create' ? payload : { id: redator!.id!, payload }
    mutation.mutate(vars as never, { onSuccess: onDone })
  }

  return { form, set, toggleCourse, readOnly, submit, pending: create.isPending || update.isPending }
}
```

> `@features/commercial/hooks/useClientForm` é importado só pelo **tipo** `ClientDialogMode` (type-only import não cria acoplamento de runtime). Se preferir zero import cruzado, duplicar o union `'view'|'edit'|'create'` num `shared/types`. Manter o type-only por ora.

- [ ] **Step 3: componente do dialog**

`frontend/src/features/identity/components/RedatorDialog.tsx`:

```tsx
import { AppDialog, AppButton, AppInputText, AppTag, AppFileUpload } from '@shared/ui'
import type { FileUploadHandlerEvent } from '@shared/ui'
import type { RedatorData } from '@shared/types/generated'
import { coursesApi } from '../api/coursesApi'
import { useUploadDocument, useRemoveDocument } from '../api/useRedatorDocuments'
import { useRedatorForm, type RedatorDialogMode } from '../hooks/useRedatorForm'
import { docStatus, idoneidade } from '../lib/redatorStatus'

const DOC_TYPES = [
  { type: 'CV', label: 'Currículum (CV)' },
  { type: 'REUF', label: 'Certificado REUF' },
  { type: 'TITULO', label: 'Título universitario' },
  { type: 'POSTGRADO', label: 'Post-Grado' },
]

const STATUS_TAG: Record<string, { value: string; severity: 'success' | 'warning' | 'danger' | 'info' }> = {
  sin_venc: { value: 'Sin vencimiento', severity: 'success' },
  vigente: { value: 'Vigente', severity: 'success' },
  por_vencer: { value: 'Por vencer', severity: 'warning' },
  vencido: { value: 'Vencido', severity: 'danger' },
}

export function RedatorDialog({
  visible, mode, redator, onHide,
}: {
  visible: boolean
  mode: RedatorDialogMode
  redator: RedatorData | null
  onHide: () => void
}) {
  const { form, set, toggleCourse, readOnly, submit, pending } = useRedatorForm(redator, mode, onHide)
  const courses = coursesApi.useList()
  const upload = useUploadDocument()
  const removeDoc = useRemoveDocument()

  const title = mode === 'create' ? 'Nuevo redactor' : form.name
  const existing = form.documents ?? []
  const courseIds = form.course_ids as number[]

  function handleUpload(type: string, e: FileUploadHandlerEvent) {
    const file = e.files[0]
    if (file && redator?.id) {
      upload.mutate({ redatorId: redator.id, type, file })
    }
    e.options.clear()
  }

  const footer = readOnly ? null : (
    <div className="flex justify-end gap-2">
      <AppButton label="Cancelar" text onClick={onHide} />
      <AppButton label={mode === 'create' ? 'Registrar redactor' : 'Guardar'} icon="pi pi-check" loading={pending} onClick={submit} />
    </div>
  )

  return (
    <AppDialog header={title} visible={visible} onHide={onHide} footer={footer}>
      {mode !== 'create' && (
        <div className="mb-4">
          <AppTag value={`Idoneidad: ${idoneidade(form)}`} severity={idoneidade(form) === 'idoneo' ? 'success' : idoneidade(form) === 'por_vencer' ? 'warning' : 'danger'} />
        </div>
      )}

      <section className="space-y-4">
        <h3 className="text-xs font-semibold uppercase text-slate-500">Datos de usuario</h3>
        <Field label="Nombre completo">
          <AppInputText value={form.name} disabled={readOnly} onChange={(e) => set('name', e.target.value)} className="w-full" />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="RUT">
            <AppInputText value={form.rut} disabled={readOnly} onChange={(e) => set('rut', e.target.value)} className="w-full" />
          </Field>
          <Field label="Email">
            <AppInputText value={form.email} disabled={readOnly} onChange={(e) => set('email', e.target.value)} className="w-full" />
          </Field>
        </div>
        <Field label="Teléfono">
          <AppInputText value={form.phone ?? ''} disabled={readOnly} onChange={(e) => set('phone', e.target.value)} className="w-full" />
        </Field>

        {/* Documentos: só quando o redator já existe (precisa de id). No create,
            salvar primeiro e reabrir em edição. */}
        {mode !== 'create' && (
          <>
            <h3 className="pt-2 text-xs font-semibold uppercase text-slate-500">Documentos</h3>
            {DOC_TYPES.map((dt) => {
              const doc = existing.find((d) => d.type === dt.type)
              const st = doc ? STATUS_TAG[docStatus(doc.valid_until)] : null
              return (
                <div key={dt.type} className="flex items-center justify-between rounded border border-slate-200 p-2 dark:border-slate-700">
                  <div>
                    <p className="text-sm font-medium">{dt.label}</p>
                    <p className="text-xs text-slate-500">{doc ? doc.original_name : 'No cargado'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {st && <AppTag value={st.value} severity={st.severity} />}
                    {doc && <a href={doc.download_url} target="_blank" rel="noreferrer"><AppButton icon="pi pi-download" text rounded /></a>}
                    <AppFileUpload
                      chooseOptions={{ icon: 'pi pi-upload', className: 'p-button-text p-button-rounded' }}
                      chooseLabel=""
                      disabled={upload.isPending}
                      uploadHandler={(e) => handleUpload(dt.type, e)}
                    />
                    {doc && redator?.id && <AppButton icon="pi pi-trash" text rounded severity="danger" onClick={() => removeDoc.mutate({ redatorId: redator.id!, fileId: doc.id })} />}
                  </div>
                </div>
              )
            })}
          </>
        )}

        <h3 className="pt-2 text-xs font-semibold uppercase text-slate-500">Cursos habilitados</h3>
        <div className="space-y-1">
          {(courses.data ?? []).map((c) => (
            <label key={c.id} className="flex items-center gap-2 rounded p-2 hover:bg-slate-50 dark:hover:bg-slate-800">
              <input
                type="checkbox"
                disabled={readOnly}
                checked={courseIds.includes(c.id as number)}
                onChange={() => toggleCourse(c.id as number)}
              />
              <span className="text-sm">{c.name}</span>
            </label>
          ))}
        </div>
      </section>
    </AppDialog>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-slate-600 dark:text-slate-300">{label}</span>
      {children}
    </label>
  )
}
```

- [ ] **Step 4: Verificar e commitar**

```bash
cd frontend && pnpm build && pnpm lint
git add frontend/src/features/identity/lib/redatorStatus.ts frontend/src/features/identity/hooks/useRedatorForm.ts frontend/src/features/identity/components/RedatorDialog.tsx
git commit -m "feat(identity): dialog do redator (dados + documentos tipados + cursos)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task D3: Página do módulo Personas (lista + tab)

**Files:**
- Create: `frontend/src/features/identity/components/RedatoresTable.tsx`
- Create: `frontend/src/features/identity/components/PersonasPage.tsx`
- Create: `frontend/src/features/identity/hooks/useRedatoresPage.ts`
- Modify: `frontend/src/app/router/AppRouter.tsx` (rota `/personas`)

**Interfaces:**
- Consumes: `redatoresApi.useList`, `RedatorDialog` (D2), derivações (D2), wrappers.
- Produces: `PersonasPage`, `useRedatoresPage()`.

- [ ] **Step 1: hook da página**

`frontend/src/features/identity/hooks/useRedatoresPage.ts`:

```ts
import { useState } from 'react'
import type { RedatorData } from '@shared/types/generated'
import { redatoresApi } from '../api/redatoresApi'
import type { RedatorDialogMode } from './useRedatorForm'

export function useRedatoresPage() {
  const query = redatoresApi.useList()
  const [dialog, setDialog] = useState<{ mode: RedatorDialogMode; redator: RedatorData | null } | null>(null)

  return {
    redatores: query.data ?? [],
    loading: query.isLoading,
    dialog,
    openCreate: () => setDialog({ mode: 'create', redator: null }),
    openView: (redator: RedatorData) => setDialog({ mode: 'view', redator }),
    close: () => setDialog(null),
  }
}
```

- [ ] **Step 2: tabela**

`frontend/src/features/identity/components/RedatoresTable.tsx`:

```tsx
import { useState } from 'react'
import { AppDataTable, AppColumn, AppTag, AppInputText, AppButton } from '@shared/ui'
import type { RedatorData } from '@shared/types/generated'
import { idoneidade } from '../lib/redatorStatus'

const IDON_TAG: Record<string, { value: string; severity: 'success' | 'warning' | 'danger' }> = {
  idoneo: { value: 'Idóneo', severity: 'success' },
  por_vencer: { value: 'Por vencer', severity: 'warning' },
  no_idoneo: { value: 'No idóneo', severity: 'danger' },
}

export function RedatoresTable({
  redatores, loading, onView,
}: {
  redatores: RedatorData[]
  loading: boolean
  onView: (r: RedatorData) => void
}) {
  const [filter, setFilter] = useState('')

  return (
    <div className="space-y-3">
      <AppInputText leftIcon="pi pi-search" placeholder="Buscar por nombre o RUT..." value={filter} onChange={(e) => setFilter(e.target.value)} />
      <AppDataTable value={redatores} loading={loading} globalFilter={filter} globalFilterFields={['name', 'rut']} emptyMessage="Sin redactores">
        <AppColumn field="name" header="Nombre" sortable body={(r: RedatorData) => (
          <div>
            <p className="font-medium">{r.name}</p>
            <p className="text-xs text-slate-500">{r.email}</p>
          </div>
        )} />
        <AppColumn field="rut" header="RUT" />
        <AppColumn header="Cursos habilitados" body={(r: RedatorData) => (r.course_ids as number[]).length} />
        <AppColumn header="Idoneidad" body={(r: RedatorData) => {
          const t = IDON_TAG[idoneidade(r)]
          return <AppTag value={t.value} severity={t.severity} />
        }} />
        <AppColumn body={(r: RedatorData) => <AppButton icon="pi pi-eye" text rounded onClick={() => onView(r)} />} style={{ width: '4rem' }} />
      </AppDataTable>
      <p className="text-sm text-slate-500">{redatores.length} redactores</p>
    </div>
  )
}
```

- [ ] **Step 3: página com tab**

`frontend/src/features/identity/components/PersonasPage.tsx`:

```tsx
import { PageHeader, AppButton, AppTabView, AppTabPanel } from '@shared/ui'
import { useRedatoresPage } from '../hooks/useRedatoresPage'
import { RedatoresTable } from './RedatoresTable'
import { RedatorDialog } from './RedatorDialog'

export function PersonasPage() {
  const page = useRedatoresPage()

  return (
    <div>
      <PageHeader
        title="Personas"
        description="Registro canónico de alumnos y redactores"
        actions={<AppButton label="Nuevo redactor" icon="pi pi-user-plus" onClick={page.openCreate} />}
      />
      <AppTabView>
        <AppTabPanel header="Alumnos">
          <p className="p-4 text-sm text-slate-500">Módulo de alumnos — próxima sprint.</p>
        </AppTabPanel>
        <AppTabPanel header="Redactores">
          <RedatoresTable redatores={page.redatores} loading={page.loading} onView={page.openView} />
        </AppTabPanel>
      </AppTabView>

      {page.dialog && (
        <RedatorDialog visible mode={page.dialog.mode} redator={page.dialog.redator} onHide={page.close} />
      )}
    </div>
  )
}
```

- [ ] **Step 4: ligar a rota**

Em `frontend/src/app/router/AppRouter.tsx`, importar e trocar a rota `/personas`:

```tsx
import { PersonasPage } from '@features/identity/components/PersonasPage'
// ...
          <Route path="/personas" element={<PersonasPage />} />
```

- [ ] **Step 5: Verificar (build + lint + manual)**

Run: `cd frontend && pnpm build && pnpm lint`
Depois `pnpm dev`, em `/personas` → tab Redactores: lista redatores reais; "Nuevo redactor" cria (dados básicos + cursos); abrir um existente mostra documentos por tipo com estado, subir/baixar/remover documento reflete na hora; idoneidade aparece na tabela e no dialog.
Expected: comportamento acima confirmado.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/features/identity/ frontend/src/app/router/AppRouter.tsx
git commit -m "feat(identity): tela do modulo Personas (lista de redatores + dialog)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Verificação final (DoD do plano)

- [ ] `docker compose run --rm app php artisan test` — toda a suíte verde (documentos tipados provados).
- [ ] `cd frontend && pnpm build && pnpm lint` — limpos.
- [ ] Manual: `/comercial` lista/cria/edita cliente; `/personas` lista/cria redator, sobe/substitui/remove documento tipado, marca cursos habilitados.
- [ ] `generated.ts` contém `RedatorDocumentData` e `RedatorData.documents` (não editado à mão).

## Notas de escopo (do spec §7 — NÃO implementar aqui)
- Tabs `Presupuestos`/`Alumnos` são placeholders; históricos e coluna `ALUMNOS` omitidos.
- Idoneidade é visual/provisória; policy que bloqueia designação a turma = futuro (RN-09).
- Sem test runner de front — verificação por build/lint/manual.
- i18n: strings inline em ES nesta entrega (protótipo é `es-CL`); mover para os locales quando o ADR-15 fechar (follow-up).
- Upload de documento usa o wrapper `AppFileUpload` (FileUpload do PrimeReact, `mode="basic" customUpload`) — o binário sobe pela API própria no `uploadHandler`, não pelo endpoint embutido do Prime.
