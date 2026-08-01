# Hardening · Débitos de integridade — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fechar seis débitos em que o estado gravado pode divergir do estado que o sistema afirma ter gravado, sem que ninguém veja a divergência.

**Architecture:** Backend-only. O upload sai de dentro das transações e passa a ter compensação explícita no choke point compartilhado (`UploadFileAction`); o UPDATE da foto entra em transação para que a compensação existente volte a ser verdadeira; a contagem de contatos passa a rodar sob lock; `is_primary` vira `Optional` nos dois DTOs nested; endereço ganha o serviço de principal único que os contatos já têm; e um teste passa a guardar a paridade entre o catálogo de permissões e as três locales do frontend.

**Tech Stack:** Laravel 13 / PHP 8.3, spatie/laravel-data, owen-it/laravel-auditing, PHPUnit (sqlite `:memory:`), Storage fake/S3-MinIO, spatie/typescript-transformer.

**Spec:** `docs/superpowers/specs/2026-08-01-hardening-debitos-integridade-design.md`

## Global Constraints

- **Backend roda no container.** Toda suíte: `docker compose exec -T app php artisan test`. Teste único: `docker compose exec -T app php artisan test --filter=NomeTest`.
- **Pint roda no host, de dentro de `backend/`, sempre com argumentos:** `cd backend && ./vendor/bin/pint <arquivos>`. Nunca sem argumento.
- **Main tree, nunca worktree** (P-03: o compose monta o main tree; um worktree rodaria teste contra o código errado).
- **`generated.ts` não se edita à mão** (lei §5.3). Regenera-se com `docker compose exec -T app php artisan typescript:transform`.
- **Auditoria só na aplicação, nunca em trigger** (lei §5.2). Todo `update()` que rebaixa `is_primary` é por **instância** de model, nunca pelo query builder — o builder emite UPDATE sem eventos e a linha em `audits` não nasce.
- **Erro de domínio é `ValidationException`** e sobe ao handler global RFC 7807; nunca `abort(422)` (lei §5.4).
- **Baseline da suíte:** 347 passed / 1083 assertions. Qualquer tarefa que a derrube não está pronta.
- **Nenhuma migration neste bloco.** Se uma tarefa parecer exigir schema, PARE e confirme com o João.

---

### Task 1: `UploadFileAction` — `put` / `register` / `discard`

Quebra o choke point de upload em três operações, para que a escrita no disco possa acontecer **fora** da transação e ser desfeita se o banco recusar. Fecha também o `false` silencioso do `store()` — o mesmo bug que o `UserPhotoService` já levou em dev (`9197d08`).

**Files:**
- Modify: `backend/app/Shared/Files/Actions/UploadFileAction.php`
- Test: `backend/tests/Feature/Cadastros/UploadFileActionTest.php`

**Interfaces:**
- Consumes: nada de tarefas anteriores.
- Produces:
  - `UploadFileAction::put(Model $owner, UploadedFile $file, ?string $disk = null): string` — grava em `{morph}/{id}` e devolve o path; lança `RuntimeException` se o disco recusar.
  - `UploadFileAction::putTo(string $directory, UploadedFile $file, ?string $disk = null): string` — mesma coisa, com diretório explícito. Existe para quem sobe o binário **antes** de o dono existir (`CreateRedatorAction`, Task 2), quando ainda não há id para compor o caminho.
  - `UploadFileAction::metadataOf(UploadedFile $file): array` — `array{original_name: string, mime: string, size: int}`, capturado **antes** da escrita.
  - `UploadFileAction::register(Model $owner, string $path, array $meta, string $type, ?CarbonInterface $validUntil = null): File` — só o insert em `files`.
  - `UploadFileAction::discard(string $path, ?string $disk = null): void` — compensação; loga e nunca propaga.
  - `UploadFileAction::execute(...)` — assinatura inalterada, agora implementada como `metadataOf` + `put` + `register`.

- [ ] **Step 1: Escrever os testes que falham**

Adicione ao final de `backend/tests/Feature/Cadastros/UploadFileActionTest.php` (dentro da classe):

```php
    public function test_put_grava_no_disco_e_devolve_o_path(): void
    {
        /** @var FilesystemAdapter $storage */
        $storage = Storage::fake('s3');
        $redator = Redator::create(['user_id' => User::factory()->redator()->create()->id]);

        $path = app(UploadFileAction::class)->put($redator, UploadedFile::fake()->create('cv.pdf', 10, 'application/pdf'), 's3');

        $this->assertStringStartsWith("redator/{$redator->id}/", $path);
        $storage->assertExists($path);
    }

    /**
     * `putFile()` devolve `false` (não lança) quando a escrita falha e o disco
     * não está configurado com `throw`. Sem esta guarda o `false` vira string
     * na coluna `path` e o sistema segue como se tivesse gravado — foi assim
     * que `photo_path` virou `'0'` em dev (2026-08-01).
     */
    public function test_put_lanca_quando_o_disco_recusa_a_escrita(): void
    {
        $redator = Redator::create(['user_id' => User::factory()->redator()->create()->id]);

        $disk = Mockery::mock(FilesystemAdapter::class);
        $disk->shouldReceive('putFile')->once()->andReturn(false);
        Storage::shouldReceive('disk')->with('s3')->andReturn($disk);

        $this->expectException(RuntimeException::class);

        app(UploadFileAction::class)->put($redator, UploadedFile::fake()->create('cv.pdf', 10, 'application/pdf'), 's3');
    }

    public function test_put_to_grava_no_diretorio_informado(): void
    {
        /** @var FilesystemAdapter $storage */
        $storage = Storage::fake('s3');

        $path = app(UploadFileAction::class)->putTo('redator', UploadedFile::fake()->create('cv.pdf', 10, 'application/pdf'), 's3');

        $this->assertStringStartsWith('redator/', $path);
        $storage->assertExists($path);
    }

    public function test_register_insere_a_linha_com_os_metadados_capturados(): void
    {
        Storage::fake('s3');
        $redator = Redator::create(['user_id' => User::factory()->redator()->create()->id]);
        $upload = UploadedFile::fake()->create('cv.pdf', 10, 'application/pdf');
        $action = app(UploadFileAction::class);

        $meta = $action->metadataOf($upload);
        $file = $action->register($redator, 'redator/1/fake.pdf', $meta, 'CV');

        $this->assertSame('cv.pdf', $file->original_name);
        $this->assertSame('redator/1/fake.pdf', $file->path);
        $this->assertDatabaseHas('files', ['fileable_type' => 'redator', 'fileable_id' => $redator->id, 'type' => 'CV']);
    }

    public function test_discard_apaga_o_objeto(): void
    {
        /** @var FilesystemAdapter $storage */
        $storage = Storage::fake('s3');
        $redator = Redator::create(['user_id' => User::factory()->redator()->create()->id]);
        $action = app(UploadFileAction::class);
        $path = $action->put($redator, UploadedFile::fake()->create('cv.pdf', 10, 'application/pdf'), 's3');

        $action->discard($path, 's3');

        $storage->assertMissing($path);
    }

    /**
     * Faxina que falha NÃO derruba a requisição: o erro que interessa é o do
     * chamador, e trocar um pelo outro faria o usuário achar que a operação
     * falhou quando o que falhou foi só a limpeza.
     */
    public function test_discard_nao_propaga_falha_do_disco(): void
    {
        $disk = Mockery::mock(FilesystemAdapter::class);
        $disk->shouldReceive('delete')->once()->andThrow(new RuntimeException('disco fora'));
        Storage::shouldReceive('disk')->with('s3')->andReturn($disk);

        app(UploadFileAction::class)->discard('redator/1/fake.pdf', 's3');

        $this->assertTrue(true); // não lançou
    }
```

E complete os `use` no topo do arquivo (mantendo os que já existem):

```php
use Mockery;
use RuntimeException;
```

- [ ] **Step 2: Rodar os testes e ver falhar**

Run: `docker compose exec -T app php artisan test --filter=UploadFileActionTest`
Expected: FAIL — `Call to undefined method App\Shared\Files\Actions\UploadFileAction::put()`

- [ ] **Step 3: Implementar**

Em `backend/app/Shared/Files/Actions/UploadFileAction.php`, substitua o método `execute()` pelo bloco abaixo, mantendo `temporaryUrl()` e `publicDiskFor()` como estão:

```php
    /**
     * Sobe e registra numa chamada. Continua servindo os chamadores que NÃO
     * estão dentro de transação (`StoreTurmaDocumentAction`, `QuoteFileController`,
     * `BudgetFileController`). Quem abre transação usa `put`/`register`/`discard`
     * separados — ver `StoreRedatorDocumentAction`.
     */
    public function execute(Model $owner, UploadedFile $file, string $type, ?CarbonInterface $validUntil = null, ?string $disk = null): File
    {
        $meta = $this->metadataOf($file);
        $path = $this->put($owner, $file, $disk);

        return $this->register($owner, $path, $meta, $type, $validUntil);
    }

    /**
     * Metadados do upload, capturados ANTES da escrita: depois dela o arquivo
     * temporário já cumpriu seu papel e ler dele de novo é dependência
     * desnecessária do driver.
     *
     * @return array{original_name: string, mime: string, size: int}
     */
    public function metadataOf(UploadedFile $file): array
    {
        return [
            'original_name' => $file->getClientOriginalName(),
            'mime' => $file->getClientMimeType(),
            'size' => $file->getSize(),
        ];
    }

    /**
     * Grava o binário e devolve o path. NUNCA chame isto dentro de uma
     * transação: rollback derruba a linha e deixa o objeto no bucket —
     * documento sem linha em `files` é documento sem auditoria e sem rastro,
     * e aqui o dado tem peso legal.
     *
     * `putFile()` devolve `false` em vez de lançar quando o disco não está
     * configurado com `throw`. Tratar `false` como path faria o sistema seguir
     * como se tivesse gravado (achado real de 2026-08-01 no `UserPhotoService`).
     */
    public function put(Model $owner, UploadedFile $file, ?string $disk = null): string
    {
        return $this->putTo("{$owner->getMorphClass()}/{$owner->getKey()}", $file, $disk);
    }

    /**
     * Grava num diretório explícito. Serve a quem sobe o binário ANTES de o
     * dono existir — `CreateRedatorAction` sobe os documentos fora da
     * transação que cria o redator, então ainda não há id para compor
     * `redator/{id}`. O vínculo real do arquivo é a linha em `files`, não o
     * caminho; o caminho é só organização de bucket.
     */
    public function putTo(string $directory, UploadedFile $file, ?string $disk = null): string
    {
        $disk ??= config('filesystems.default');

        $path = Storage::disk($disk)->putFile($directory, $file);

        if ($path === false) {
            throw new RuntimeException("Falha ao gravar arquivo em {$directory} no disco {$disk}.");
        }

        return $path;
    }

    /**
     * Só o insert em `files`. Roda DENTRO da transação do chamador — é a parte
     * que o rollback pode desfazer sem deixar lixo.
     *
     * @param  array{original_name: string, mime: string, size: int}  $meta
     */
    public function register(Model $owner, string $path, array $meta, string $type, ?CarbonInterface $validUntil = null): File
    {
        return $owner->morphMany(File::class, 'fileable')->create([
            'type' => $type,
            'path' => $path,
            'original_name' => $meta['original_name'],
            'mime' => $meta['mime'],
            'size' => $meta['size'],
            'valid_until' => $validUntil,
        ]);
    }

    /**
     * Compensação: apaga um objeto que ficou sem dono porque a transação do
     * chamador não commitou. Loga e NUNCA propaga — quem chama isto já está
     * lançando o erro que interessa.
     */
    public function discard(string $path, ?string $disk = null): void
    {
        $disk ??= config('filesystems.default');

        try {
            Storage::disk($disk)->delete($path);
        } catch (Throwable $e) {
            Log::warning('Falha ao descartar objeto órfão de upload', [
                'path' => $path,
                'error' => $e->getMessage(),
            ]);
        }
    }
```

Adicione aos `use` do arquivo:

```php
use Illuminate\Support\Facades\Log;
use RuntimeException;
use Throwable;
```

- [ ] **Step 4: Rodar os testes e ver passar**

Run: `docker compose exec -T app php artisan test --filter=UploadFileActionTest`
Expected: PASS — 6 testes (os 3 que já existiam + os 5 novos; total 8)

- [ ] **Step 5: Rodar os testes que dependem do choke point**

Run: `docker compose exec -T app php artisan test --filter="RedatorDocumentTest|CommercialFilesTest|TurmaDocumentActionsTest|TurmaDocumentApiTest|UploadSizeLimitTest"`
Expected: PASS — `execute()` manteve o comportamento

- [ ] **Step 6: Pint e commit**

```bash
cd backend && ./vendor/bin/pint app/Shared/Files/Actions/UploadFileAction.php tests/Feature/Cadastros/UploadFileActionTest.php
cd /home/jvbat/projetos/lotus
git add backend/app/Shared/Files/Actions/UploadFileAction.php backend/tests/Feature/Cadastros/UploadFileActionTest.php
git commit -m "refactor(files): quebra UploadFileAction em put/register/discard

Escrita no disco passa a poder acontecer fora da transacao, com compensacao
explicita. put() aborta quando putFile devolve false, em vez de gravar o
false como path (D1/D2 da spec)."
```

---

### Task 2: Documento de redator — upload antes da transação, `discard` no rollback

**Files:**
- Modify: `backend/app/Domains/Identity/Actions/StoreRedatorDocumentAction.php`
- Modify: `backend/app/Domains/Identity/Actions/CreateRedatorAction.php`
- Test: `backend/tests/Feature/Cadastros/RedatorDocumentRollbackTest.php` (criar)

**Interfaces:**
- Consumes: `UploadFileAction::{metadataOf, put, register, discard}` (Task 1).
- Produces: `StoreRedatorDocumentAction::registerUploaded(Redator $redator, RedatorDocumentType $type, string $path, array $meta, ?CarbonInterface $validUntil = null): File` — para chamadores que **já** seguram a transação e **já** fizeram o `put`.

- [ ] **Step 1: Escrever o teste que falha**

Crie `backend/tests/Feature/Cadastros/RedatorDocumentRollbackTest.php`:

```php
<?php

namespace Tests\Feature\Cadastros;

use App\Domains\Identity\Actions\CreateRedatorAction;
use App\Domains\Identity\Actions\StoreRedatorDocumentAction;
use App\Domains\Identity\Data\RedatorData;
use App\Domains\Identity\Enums\RedatorDocumentType;
use App\Domains\Identity\Models\Redator;
use App\Domains\Identity\Models\User;
use App\Shared\Files\Models\File;
use Illuminate\Filesystem\FilesystemAdapter;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Storage;
use RuntimeException;
use Tests\TestCase;

/**
 * O upload grava no bucket ANTES da transação (D1/D3 da spec). Se a transação
 * não commitar, o objeto tem de sair junto: binário sem linha em `files` é
 * documento sem auditoria e sem rastro — e documento de redator tem peso legal.
 *
 * A falha é forçada por listener no evento `creating` de `File`, que é o ponto
 * exato onde a transação passa a não poder mais concluir.
 */
class RedatorDocumentRollbackTest extends TestCase
{
    use RefreshDatabase;

    private function failOnFileInsert(): void
    {
        Event::listen('eloquent.creating: '.File::class, function (): void {
            throw new RuntimeException('insert recusado');
        });
    }

    private function redator(): Redator
    {
        return Redator::create(['user_id' => User::factory()->redator()->create()->id]);
    }

    public function test_falha_no_insert_nao_deixa_objeto_no_disco(): void
    {
        /** @var FilesystemAdapter $storage */
        $storage = Storage::fake('s3');
        config(['filesystems.default' => 's3']);
        $redator = $this->redator();
        $this->failOnFileInsert();

        try {
            app(StoreRedatorDocumentAction::class)->execute($redator, RedatorDocumentType::CV, UploadedFile::fake()->create('cv.pdf', 10, 'application/pdf'));
            $this->fail('esperava RuntimeException');
        } catch (RuntimeException) {
            // esperado
        }

        $this->assertSame([], $storage->allFiles(), 'objeto órfão ficou no bucket');
        $this->assertDatabaseCount('files', 0);
    }

    public function test_falha_no_insert_durante_create_redator_limpa_todos_os_documentos(): void
    {
        /** @var FilesystemAdapter $storage */
        $storage = Storage::fake('s3');
        config(['filesystems.default' => 's3']);
        $this->failOnFileInsert();

        $data = RedatorData::from([
            'name' => 'Juan Morales',
            'rut' => '13.456.789-9',
            'email' => 'jm@lotus.cl',
        ]);

        try {
            app(CreateRedatorAction::class)->execute($data, [
                'CV' => UploadedFile::fake()->create('cv.pdf', 10, 'application/pdf'),
                'REUF' => UploadedFile::fake()->create('reuf.pdf', 10, 'application/pdf'),
            ]);
            $this->fail('esperava RuntimeException');
        } catch (RuntimeException) {
            // esperado
        }

        $this->assertSame([], $storage->allFiles(), 'objeto órfão ficou no bucket');
        $this->assertDatabaseCount('files', 0);
        $this->assertDatabaseCount('redatores', 0);
    }

    public function test_caminho_feliz_segue_gravando_e_registrando(): void
    {
        /** @var FilesystemAdapter $storage */
        $storage = Storage::fake('s3');
        config(['filesystems.default' => 's3']);
        $redator = $this->redator();

        $file = app(StoreRedatorDocumentAction::class)->execute($redator, RedatorDocumentType::CV, UploadedFile::fake()->create('cv.pdf', 10, 'application/pdf'));

        $storage->assertExists($file->path);
        $this->assertSame('cv.pdf', $file->original_name);
    }
}
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `docker compose exec -T app php artisan test --filter=RedatorDocumentRollbackTest`
Expected: FAIL nos dois primeiros testes com "objeto órfão ficou no bucket" — o binário sobreviveu ao rollback

- [ ] **Step 3: Reescrever `StoreRedatorDocumentAction`**

Substitua o corpo da classe em `backend/app/Domains/Identity/Actions/StoreRedatorDocumentAction.php`:

```php
class StoreRedatorDocumentAction
{
    public function __construct(private UploadFileAction $uploads) {}

    public function execute(Redator $redator, RedatorDocumentType $type, UploadedFile $file, ?CarbonInterface $validUntil = null): File
    {
        // Escrita no disco ANTES da transação (spec D1/D3): dentro dela, um
        // rollback derrubaria a linha e deixaria o binário no bucket — documento
        // sem rastro. Aqui, o que sobra em caso de falha é objeto órfão, que o
        // `discard` abaixo apaga.
        $meta = $this->uploads->metadataOf($file);
        $path = $this->uploads->put($redator, $file);

        try {
            return DB::transaction(fn () => $this->registerUploaded($redator, $type, $path, $meta, $validUntil));
        } catch (Throwable $e) {
            $this->uploads->discard($path);

            throw $e;
        }
    }

    /**
     * Para quem JÁ segura a transação e JÁ fez o `put` — hoje, o
     * `CreateRedatorAction`. Faz o replace do documento ativo do mesmo tipo e
     * registra o novo.
     *
     * @param  array{original_name: string, mime: string, size: int}  $meta
     */
    public function registerUploaded(Redator $redator, RedatorDocumentType $type, string $path, array $meta, ?CarbonInterface $validUntil = null): File
    {
        // Soft-delete por instância, não pelo query builder: `->delete()` no
        // builder emite um UPDATE direto, sem eventos de model — e sem
        // eventos o owen-it não grava a linha em `audits`. A rastreabilidade
        // do documento removido é requisito (o binário fica no bucket).
        $redator->documents()->where('type', $type->value)->get()
            ->each(fn (File $antigo) => $antigo->delete());

        return $this->uploads->register($redator, $path, $meta, $type->value, $validUntil);
    }
}
```

Ajuste os `use` do arquivo para:

```php
use App\Domains\Identity\Enums\RedatorDocumentType;
use App\Domains\Identity\Models\Redator;
use App\Shared\Files\Actions\UploadFileAction;
use App\Shared\Files\Models\File;
use Carbon\CarbonInterface;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Throwable;
```

- [ ] **Step 4: Reescrever `CreateRedatorAction`**

Em `backend/app/Domains/Identity/Actions/CreateRedatorAction.php`, substitua o método `execute()`:

```php
    public function execute(RedatorData $data, array $documents = []): Redator
    {
        // Todos os binários sobem ANTES da transação (spec D3). Guardamos
        // path + metadados para registrar lá dentro; se a transação cair,
        // `discard` limpa cada objeto que ficou sem dono.
        $uploaded = [];

        try {
            foreach ($documents as $type => $document) {
                $uploaded[$type] = [
                    'meta' => $this->uploads->metadataOf($document),
                    // `putTo` e não `put`: o redator ainda não existe, então
                    // não há id para compor `redator/{id}`. O vínculo do
                    // arquivo é a linha em `files`, não o caminho.
                    'path' => $this->uploads->putTo('redator', $document),
                ];
            }

            return DB::transaction(function () use ($data, $uploaded) {
                $user = $this->users->provision(
                    type: 'redator',
                    name: $data->name,
                    rut: $data->rut,
                    email: $data->email,
                    phone: $data->phone instanceof Optional ? null : $data->phone,
                );

                $redator = $user->redator()->create([]);

                if (! $data->course_ids instanceof Optional) {
                    $redator->courses()->sync($data->course_ids);
                }

                foreach ($uploaded as $type => $upload) {
                    $this->documents->registerUploaded($redator, RedatorDocumentType::from($type), $upload['path'], $upload['meta']);
                }

                return $redator->load(['user', 'documents', 'courses']);
            });
        } catch (Throwable $e) {
            foreach ($uploaded as $upload) {
                $this->uploads->discard($upload['path']);
            }

            throw $e;
        }
    }
```

Ajuste o construtor e os `use`:

```php
    public function __construct(
        private UserProvisioner $users,
        private StoreRedatorDocumentAction $documents,
        private UploadFileAction $uploads,
    ) {}
```

```php
use App\Shared\Files\Actions\UploadFileAction;
use Throwable;
```

- [ ] **Step 5: Rodar e ver passar**

Run: `docker compose exec -T app php artisan test --filter=RedatorDocumentRollbackTest`
Expected: PASS — 3 testes

- [ ] **Step 6: Rodar a regressão do domínio**

Run: `docker compose exec -T app php artisan test --filter="RedatorDocumentTest|RedatorCrudTest|UploadSizeLimitTest"`
Expected: PASS

- [ ] **Step 7: Pint e commit**

```bash
cd backend && ./vendor/bin/pint app/Domains/Identity/Actions/StoreRedatorDocumentAction.php app/Domains/Identity/Actions/CreateRedatorAction.php tests/Feature/Cadastros/RedatorDocumentRollbackTest.php
cd /home/jvbat/projetos/lotus
git add backend/app/Domains/Identity/Actions/StoreRedatorDocumentAction.php backend/app/Domains/Identity/Actions/CreateRedatorAction.php backend/tests/Feature/Cadastros/RedatorDocumentRollbackTest.php
git commit -m "fix(identity): documento de redator nao deixa objeto orfao em rollback

Binario sobe antes da transacao e e descartado se ela nao commitar. Fecha o
debito de arquivo orfao no MinIO para os dois caminhos de requisicao (D3)."
```

---

### Task 3: P-24 — o UPDATE da foto entra em transação

**Files:**
- Modify: `backend/app/Domains/Identity/Services/UserPhotoService.php`
- Test: `backend/tests/Feature/Identity/UserPhotoTest.php`

**Interfaces:**
- Consumes: nada das tarefas anteriores.
- Produces: nada consumido adiante. `UserPhotoService::store()` mantém a assinatura.

- [ ] **Step 1: Escrever os testes que falham**

Adicione a `backend/tests/Feature/Identity/UserPhotoTest.php` (dentro da classe):

```php
    /**
     * P-24. O evento `updated` do owen-it dispara DEPOIS do SQL UPDATE, dentro
     * da mesma chamada. Sem transação, uma auditoria que lança deixa a coluna
     * já gravada e a compensação apaga um objeto que o banco REFERENCIA — o
     * comentário "ninguém aponta para ele" vira falso. Com transação, o
     * rollback desfaz o UPDATE e a compensação volta a ser verdadeira.
     */
    public function test_falha_na_auditoria_desfaz_o_update_e_apaga_o_objeto_novo(): void
    {
        /** @var FilesystemAdapter $storage */
        $storage = Storage::fake('s3');
        $user = User::factory()->create(['type' => 'admin']);
        Event::listen('eloquent.updated: '.User::class, function (): void {
            throw new RuntimeException('auditoria fora do ar');
        });

        try {
            app(UserPhotoService::class)->store($user, UploadedFile::fake()->image('foto.png'));
            $this->fail('esperava RuntimeException');
        } catch (RuntimeException) {
            // esperado
        }

        $this->assertNull($user->fresh()->photo_path);
        $this->assertSame([], $storage->allFiles(), 'objeto novo ficou no bucket sem ninguém apontar para ele');
    }

    public function test_falha_na_auditoria_preserva_a_foto_anterior(): void
    {
        /** @var FilesystemAdapter $storage */
        $storage = Storage::fake('s3');
        $user = User::factory()->create(['type' => 'admin']);
        $service = app(UserPhotoService::class);

        $service->store($user, UploadedFile::fake()->image('primeira.png'));
        $old = $user->fresh()->photo_path;

        Event::listen('eloquent.updated: '.User::class, function (): void {
            throw new RuntimeException('auditoria fora do ar');
        });

        try {
            $service->store($user->fresh(), UploadedFile::fake()->image('segunda.png'));
            $this->fail('esperava RuntimeException');
        } catch (RuntimeException) {
            // esperado
        }

        $this->assertSame($old, $user->fresh()->photo_path);
        $storage->assertExists($old);
        $this->assertCount(1, $storage->allFiles(), 'sobrou objeto além da foto anterior');
    }
```

Complete os `use` do arquivo de teste com:

```php
use Illuminate\Filesystem\FilesystemAdapter;
use Illuminate\Support\Facades\Event;
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `docker compose exec -T app php artisan test --filter=UserPhotoTest`
Expected: FAIL nos dois testes novos — `photo_path` fica gravado (não é `null`) porque o UPDATE já commitou antes de a auditoria lançar

- [ ] **Step 3: Implementar**

Em `backend/app/Domains/Identity/Services/UserPhotoService.php`, substitua o docblock e o corpo de `store()`:

```php
    /**
     * Sobe a foto, aponta `photo_path` para ela e só então apaga o objeto
     * anterior (spec D4/J-02: delete imediato, sem retenção).
     *
     * A ORDEM não é detalhe. Apagar o antigo antes do update deixa a linha
     * apontando para um objeto morto se o update falhar — referência mentindo.
     * Apagar depois, e falhar, deixa órfão de storage: custo, não mentira.
     *
     * O UPDATE roda em `DB::transaction` (P-24): a auditoria é síncrona
     * (`audit.queue.enable = false`) e o evento `updated` do owen-it dispara
     * DEPOIS do SQL UPDATE, dentro da mesma chamada. Sem transação, uma
     * auditoria que lança deixava a coluna gravada e a compensação apagava um
     * objeto que o banco já referenciava. A transação cobre UPDATE + auditoria
     * e NUNCA o delete de storage — esse é o débito do `UploadFileAction`,
     * fechado com `put`/`discard`, não com transação em volta do disco.
     */
    public function store(User $user, UploadedFile $photo): void
    {
        $old = $user->photo_path;
        $new = $photo->store("user-photos/{$user->id}", $this->disk());

        // `UploadedFile::store()` devolve `false` (não lança) quando a
        // escrita falha e o disco não está configurado com `throw`. Achado
        // real (2026-07-31): sem esta guarda, `false` virava `photo_path =
        // '0'` no banco (coerção de tipo) e o objeto ANTERIOR — que ainda
        // funcionava — era apagado, porque o código seguia como se o update
        // tivesse sido bem-sucedido. Abortar aqui, antes do update, é o que
        // preserva a garantia de D4: falha nunca corrompe o estado atual.
        if ($new === false) {
            throw new RuntimeException("Falha ao gravar a foto do usuário {$user->id} no disco.");
        }

        try {
            DB::transaction(fn () => $user->update(['photo_path' => $new]));
        } catch (Throwable $e) {
            // Compensação: o rollback desfez o UPDATE, então o objeto novo
            // está no bucket e ninguém aponta para ele.
            $this->deleteObject($new);

            throw $e;
        }

        if ($old !== null) {
            $this->deleteObject($old);
        }
    }
```

Adicione aos `use`:

```php
use Illuminate\Support\Facades\DB;
```

- [ ] **Step 4: Rodar e ver passar**

Run: `docker compose exec -T app php artisan test --filter=UserPhotoTest`
Expected: PASS — todos os testes do arquivo

- [ ] **Step 5: Pint e commit**

```bash
cd backend && ./vendor/bin/pint app/Domains/Identity/Services/UserPhotoService.php tests/Feature/Identity/UserPhotoTest.php
cd /home/jvbat/projetos/lotus
git add backend/app/Domains/Identity/Services/UserPhotoService.php backend/tests/Feature/Identity/UserPhotoTest.php
git commit -m "fix(identity): update da foto em transacao fecha o P-24

Auditoria sincrona entra na mesma transacao: se ela lancar, o rollback desfaz
o UPDATE e a compensacao volta a ser verdadeira em vez de apagar objeto que o
banco referencia (D5)."
```

---

### Task 4: Q-5 — contagem de contatos sob lock

**Files:**
- Modify: `backend/app/Domains/Commercial/Actions/DeleteClientContactAction.php`
- Test: `backend/tests/Feature/Comercial/ClientContactMinimumTest.php`

**Interfaces:**
- Consumes: nada.
- Produces: nada. `DeleteClientContactAction::execute(ClientContact $contact): void` mantém a assinatura.

- [ ] **Step 1: Escrever o teste que falha**

Adicione a `backend/tests/Feature/Comercial/ClientContactMinimumTest.php` (dentro da classe):

```php
    /**
     * Q-5. A suíte roda sqlite `:memory:`, onde `lockForUpdate()` é no-op —
     * este teste NÃO prova serialização. Prova o que dá para provar aqui: que
     * a contagem e o delete acontecem dentro de uma transação, que é a
     * condição sem a qual o lock não teria efeito nem em MySQL. A serialização
     * real é provada à mão contra MySQL no gate de fechamento.
     */
    public function test_exclusao_roda_dentro_de_transacao(): void
    {
        $client = $this->client();
        $client->contacts()->create(['name' => 'Bruno']);
        $client->contacts()->create(['name' => 'Carla']);
        $alvo = $client->contacts()->where('name', 'Carla')->firstOrFail();

        $niveis = [];
        Event::listen('eloquent.deleting: '.ClientContact::class, function () use (&$niveis): void {
            $niveis[] = DB::transactionLevel();
        });

        app(DeleteClientContactAction::class)->execute($alvo);

        $this->assertNotEmpty($niveis, 'o evento de delete não disparou');
        // 2, não 1: o `RefreshDatabase` já mantém uma transação aberta durante
        // o teste inteiro. Asserir `> 0` passaria sem o Action abrir transação
        // nenhuma — mediria o RefreshDatabase, não o código sob teste.
        $this->assertSame(2, $niveis[0], 'o delete não abriu transação própria sobre a do RefreshDatabase');
    }
```

Complete os `use` do arquivo de teste com:

```php
use App\Domains\Commercial\Actions\DeleteClientContactAction;
use App\Domains\Commercial\Models\ClientContact;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
```

> Nota: `RefreshDatabase` já mantém uma transação aberta por teste, então o nível de dentro do Action será ≥ 2. A asserção é `> 0` de propósito: o que importa é existir transação, não o número.

- [ ] **Step 2: Rodar e ver falhar**

Run: `docker compose exec -T app php artisan test --filter=ClientContactMinimumTest`
Expected: FAIL em `test_exclusao_roda_dentro_de_transacao` com `Failed asserting that 1 is identical to 2` — o Action ainda não abre transação, e o único nível é o do `RefreshDatabase`

- [ ] **Step 3: Implementar**

Substitua o corpo do método em `backend/app/Domains/Commercial/Actions/DeleteClientContactAction.php`:

```php
    public function execute(ClientContact $contact): void
    {
        DB::transaction(function () use ($contact) {
            // `lockForUpdate` na contagem (Q-5): sem ele, duas exclusões
            // concorrentes leem 2 contatos e apagam os 2, deixando o cliente
            // sem nenhum — estado que o cadastro recusa. Em sqlite (suíte) o
            // lock é no-op; a serialização real vale em MySQL.
            $restantes = $contact->client->contacts()->lockForUpdate()->count();

            if ($restantes <= 1) {
                throw ValidationException::withMessages([
                    'contacts' => 'O cliente precisa ter ao menos um contato.',
                ]);
            }

            $contact->delete();
        });
    }
```

Ajuste o docblock da classe: a frase "Escrita única: sem transação, mesmo padrão do `DeleteQuoteAction`" deixou de valer. Troque por:

```php
 * A checagem e o delete rodam na MESMA transação, com a contagem sob
 * `lockForUpdate` (Q-5): fora dela, o par count/delete é check-then-act e duas
 * exclusões concorrentes esvaziam a coleção.
```

E adicione aos `use`:

```php
use Illuminate\Support\Facades\DB;
```

- [ ] **Step 4: Rodar e ver passar**

Run: `docker compose exec -T app php artisan test --filter=ClientContactMinimumTest`
Expected: PASS — inclusive os testes já existentes de 422 com um contato e 204 com vários

- [ ] **Step 5: Pint e commit**

```bash
cd backend && ./vendor/bin/pint app/Domains/Commercial/Actions/DeleteClientContactAction.php tests/Feature/Comercial/ClientContactMinimumTest.php
cd /home/jvbat/projetos/lotus
git add backend/app/Domains/Commercial/Actions/DeleteClientContactAction.php backend/tests/Feature/Comercial/ClientContactMinimumTest.php
git commit -m "fix(commercial): contagem do minimo de contatos sob lock (Q-5)

count e delete passam a rodar na mesma transacao com lockForUpdate. sqlite
nao serializa: o teste prova a transacao, a serializacao e provada em MySQL
no gate de fechamento (D6)."
```

---

### Task 5: `is_primary` vira `Optional` em contato e endereço

**Files:**
- Modify: `backend/app/Domains/Commercial/Data/ClientContactData.php`
- Modify: `backend/app/Domains/Commercial/Data/ClientAddressData.php`
- Modify: `frontend/src/shared/api/generated.ts` (regenerado, nunca à mão)
- Test: `backend/tests/Feature/Cadastros/PrimaryContactTest.php`

**Interfaces:**
- Consumes: nada.
- Produces: `ClientContactData::$is_primary` e `ClientAddressData::$is_primary` passam a ser `bool|Optional`; o `toArray()` do spatie omite a chave quando ela não veio no payload.

- [ ] **Step 1: Escrever o teste que falha**

Adicione a `backend/tests/Feature/Cadastros/PrimaryContactTest.php` (dentro da classe):

```php
    /**
     * `is_primary` era `bool = false`, não `Optional`: um PUT que não mandava o
     * campo rebaixava o principal em silêncio, porque `toArray()` devolvia
     * `false` para uma chave que o cliente nunca enviou.
     */
    public function test_put_de_contato_sem_is_primary_mantem_o_principal(): void
    {
        $this->actingAsAdmin();

        $id = $this->postJson('/api/clients', $this->payload([
            ['name' => 'Contato A', 'is_primary' => true],
        ]))->assertCreated()->json('id');

        $contatoId = Client::findOrFail($id)->contacts()->firstOrFail()->id;

        $this->putJson("/api/contacts/{$contatoId}", ['name' => 'Contato A editado'])
            ->assertOk();

        $this->assertDatabaseHas('client_contacts', [
            'id' => $contatoId,
            'name' => 'Contato A editado',
            'is_primary' => true,
        ]);
    }

    public function test_contato_criado_sem_is_primary_nasce_nao_principal(): void
    {
        $this->actingAsAdmin();

        $this->postJson('/api/clients', $this->payload([
            ['name' => 'Contato A', 'is_primary' => true],
            ['name' => 'Contato B'],
        ]))->assertCreated();

        $this->assertDatabaseHas('client_contacts', ['name' => 'Contato B', 'is_primary' => false]);
    }
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `docker compose exec -T app php artisan test --filter=PrimaryContactTest`
Expected: FAIL em `test_put_de_contato_sem_is_primary_mantem_o_principal` — a linha fica com `is_primary = 0`

- [ ] **Step 3: Implementar**

Em `backend/app/Domains/Commercial/Data/ClientContactData.php`, troque a propriedade:

```php
        public bool|Optional $is_primary = false,
```

Em `backend/app/Domains/Commercial/Data/ClientAddressData.php`, a mesma troca:

```php
        public bool|Optional $is_primary = false,
```

Acrescente ao topo de cada classe (acima do `class`) o motivo, para o próximo leitor não "consertar" de volta:

```php
/**
 * `is_primary` é `Optional` de propósito: sem isso, um PUT que não manda o
 * campo rebaixa o principal em silêncio, porque o DTO preenche `false` por
 * uma chave que o cliente nunca enviou. Com `Optional`, o `toArray()` omite a
 * chave e o valor atual da coluna permanece.
 */
```

- [ ] **Step 4: Rodar e ver passar**

Run: `docker compose exec -T app php artisan test --filter="PrimaryContactTest|ClientNestedTest|ClientCrudTest|ClientDataValidationTest|ClientContactMinimumTest"`
Expected: PASS

- [ ] **Step 5: Regenerar os tipos**

Run: `docker compose exec -T app php artisan typescript:transform`
Then: `git diff --stat frontend/src/shared/api/generated.ts`
Expected: diff **apenas** em `ClientContactData.is_primary` e `ClientAddressData.is_primary`, que passam a `is_primary?: boolean`. Qualquer outra linha no diff é sinal de que o `generated.ts` estava desatualizado — PARE e reporte ao João antes de commitar.

- [ ] **Step 6: Verificar o frontend**

```bash
cd frontend && pnpm build && pnpm lint
```
Expected: ambos verdes. Se o `tsc` reclamar de `is_primary` possivelmente `undefined` em algum consumidor, corrija no consumidor (`?? false` na leitura), nunca no `generated.ts`.

- [ ] **Step 7: Pint e commit**

```bash
cd backend && ./vendor/bin/pint app/Domains/Commercial/Data/ClientContactData.php app/Domains/Commercial/Data/ClientAddressData.php tests/Feature/Cadastros/PrimaryContactTest.php
cd /home/jvbat/projetos/lotus
git add backend/app/Domains/Commercial/Data/ClientContactData.php backend/app/Domains/Commercial/Data/ClientAddressData.php backend/tests/Feature/Cadastros/PrimaryContactTest.php frontend/src/shared/api/generated.ts
git commit -m "fix(commercial): is_primary Optional em contato e endereco

PUT sem o campo deixa de rebaixar o principal em silencio. generated.ts
regenerado com typescript:transform (D7)."
```

---

### Task 6: `PrimaryAddressService` — principal único também em endereço

**Files:**
- Create: `backend/app/Domains/Commercial/Services/PrimaryAddressService.php`
- Modify: `backend/app/Domains/Commercial/Actions/CreateClientAction.php`
- Modify: `backend/app/Domains/Commercial/Actions/UpdateClientAction.php`
- Test: `backend/tests/Feature/Cadastros/PrimaryAddressTest.php` (criar)

**Interfaces:**
- Consumes: nada das tarefas anteriores.
- Produces: `PrimaryAddressService::ensureSingle(Client $client): void` — sem parâmetro `winner`, que só existe nos contatos por causa da rota nested.

- [ ] **Step 1: Escrever o teste que falha**

Crie `backend/tests/Feature/Cadastros/PrimaryAddressTest.php`:

```php
<?php

namespace Tests\Feature\Cadastros;

use App\Domains\Commercial\Models\Client;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Mesma invariante dos contatos, no endereço: no máximo 1 principal por
 * cliente, garantida na aplicação e nunca em trigger (ADR-02/ADR-08 — trigger
 * enxerga a conexão, não o usuário autenticado, e a auditoria perderia o
 * autor). Cliente SEM principal segue estado válido: ninguém é promovido.
 */
class PrimaryAddressTest extends TestCase
{
    use RefreshDatabase;

    private function payload(array $addresses): array
    {
        return [
            'name' => 'Switch Chile',
            'rut' => '12.345.678-5',
            'email' => 'info@switch.cl',
            'legal_name' => 'Switch Chile Ltda',
            'type' => 'client',
            'addresses' => $addresses,
            'contacts' => [['name' => 'Contato A', 'is_primary' => true]],
        ];
    }

    public function test_create_com_dois_principais_mantem_apenas_o_ultimo(): void
    {
        $this->actingAsAdmin();

        $this->postJson('/api/clients', $this->payload([
            ['commune' => 'Providencia', 'city' => 'Santiago', 'is_primary' => true],
            ['commune' => 'Las Condes', 'city' => 'Santiago', 'is_primary' => true],
        ]))->assertCreated();

        $this->assertDatabaseHas('client_addresses', ['commune' => 'Providencia', 'is_primary' => false]);
        $this->assertDatabaseHas('client_addresses', ['commune' => 'Las Condes', 'is_primary' => true]);
    }

    public function test_rebaixamento_deixa_rastro_em_audits(): void
    {
        $this->actingAsAdmin();

        $this->postJson('/api/clients', $this->payload([
            ['commune' => 'Providencia', 'city' => 'Santiago', 'is_primary' => true],
            ['commune' => 'Las Condes', 'city' => 'Santiago', 'is_primary' => true],
        ]))->assertCreated();

        $rebaixado = Client::firstOrFail()->addresses()->where('commune', 'Providencia')->firstOrFail();

        $this->assertDatabaseHas('audits', [
            'auditable_type' => 'client_address',
            'auditable_id' => $rebaixado->id,
            'event' => 'updated',
        ]);
    }

    public function test_update_com_um_principal_nao_mexe_em_ninguem(): void
    {
        $this->actingAsAdmin();

        $id = $this->postJson('/api/clients', $this->payload([
            ['commune' => 'Providencia', 'city' => 'Santiago', 'is_primary' => true],
        ]))->assertCreated()->json('id');

        $this->putJson("/api/clients/{$id}", $this->payload([
            ['commune' => 'Providencia', 'city' => 'Santiago', 'is_primary' => true],
            ['commune' => 'Ñuñoa', 'city' => 'Santiago'],
        ]))->assertOk();

        $this->assertDatabaseHas('client_addresses', ['commune' => 'Providencia', 'is_primary' => true]);
        $this->assertDatabaseHas('client_addresses', ['commune' => 'Ñuñoa', 'is_primary' => false]);
    }
}
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `docker compose exec -T app php artisan test --filter=PrimaryAddressTest`
Expected: FAIL em `test_create_com_dois_principais_mantem_apenas_o_ultimo` — os dois endereços ficam `is_primary = 1`

- [ ] **Step 3: Criar o serviço**

Crie `backend/app/Domains/Commercial/Services/PrimaryAddressService.php`:

```php
<?php

namespace App\Domains\Commercial\Services;

use App\Domains\Commercial\Models\Client;
use App\Domains\Commercial\Models\ClientAddress;

/**
 * Garante a invariante "no máximo 1 endereço principal por cliente" na camada
 * de aplicação, nunca em trigger (ADR-02/ADR-08: trigger enxerga a conexão,
 * não o usuário autenticado — a auditoria perderia o autor).
 * Cliente SEM principal é estado válido: o serviço não promove ninguém.
 *
 * Espelha o `PrimaryContactService`, sem o parâmetro `winner`: endereço não
 * tem rota nested, então o único desempate possível é o do replace-total —
 * vence o último por id, que é o "último marcado" no payload.
 */
class PrimaryAddressService
{
    public function ensureSingle(Client $client): void
    {
        $primaries = $client->addresses()
            ->where('is_primary', true)
            ->orderBy('id')
            ->get();

        if ($primaries->count() <= 1) {
            return;
        }

        $keep = $primaries->last();

        // update() por INSTÂNCIA, não pelo query builder: só o evento do model
        // dispara a auditoria (lei §5.2). Um ->where(...)->update(...) aqui
        // desmarcaria o principal sem deixar rastro — peso legal.
        $primaries
            ->reject(fn (ClientAddress $a) => $a->is($keep))
            ->each(fn (ClientAddress $a) => $a->update(['is_primary' => false]));
    }
}
```

- [ ] **Step 4: Ligar nos dois Actions**

Em `backend/app/Domains/Commercial/Actions/CreateClientAction.php`, acrescente a dependência e a chamada:

```php
    public function __construct(
        private UserProvisioner $users,
        private PrimaryContactService $primaryContacts,
        private PrimaryAddressService $primaryAddresses,
    ) {}
```

e, logo antes de `$this->primaryContacts->ensureSingle($client);`:

```php
            $this->primaryAddresses->ensureSingle($client);
```

Em `backend/app/Domains/Commercial/Actions/UpdateClientAction.php`, a mesma dependência:

```php
    public function __construct(
        private UserProvisioner $users,
        private PrimaryContactService $primaryContacts,
        private PrimaryAddressService $primaryAddresses,
    ) {}
```

e, logo antes de `$this->primaryContacts->ensureSingle($client);`:

```php
            $this->primaryAddresses->ensureSingle($client);
```

Adicione em ambos os arquivos:

```php
use App\Domains\Commercial\Services\PrimaryAddressService;
```

- [ ] **Step 5: Rodar e ver passar**

Run: `docker compose exec -T app php artisan test --filter="PrimaryAddressTest|PrimaryContactTest|ClientCrudTest|ClientNestedTest"`
Expected: PASS

- [ ] **Step 6: Pint e commit**

```bash
cd backend && ./vendor/bin/pint app/Domains/Commercial/Services/PrimaryAddressService.php app/Domains/Commercial/Actions/CreateClientAction.php app/Domains/Commercial/Actions/UpdateClientAction.php tests/Feature/Cadastros/PrimaryAddressTest.php
cd /home/jvbat/projetos/lotus
git add backend/app/Domains/Commercial/Services/PrimaryAddressService.php backend/app/Domains/Commercial/Actions/CreateClientAction.php backend/app/Domains/Commercial/Actions/UpdateClientAction.php backend/tests/Feature/Cadastros/PrimaryAddressTest.php
git commit -m "feat(commercial): principal unico tambem em endereco de cliente

PrimaryAddressService espelha o de contatos, rebaixando por instancia para a
auditoria registrar quem saiu (D8)."
```

---

### Task 7: Guardrail de paridade permissão ↔ i18n

Hoje as 35 permissões do catálogo têm as 35 chaves `perm.*` nas três locales. O teste existe para que a **próxima** permissão não renderize chave crua no picker.

**Files:**
- Create: `backend/tests/Feature/Identity/PermissionI18nParityTest.php`

**Interfaces:**
- Consumes: `PermissionCatalog::descriptions()` (já existe).
- Produces: nada consumido adiante.

- [ ] **Step 1: Escrever o teste**

Crie `backend/tests/Feature/Identity/PermissionI18nParityTest.php`:

```php
<?php

namespace Tests\Feature\Identity;

use App\Domains\Identity\Support\PermissionCatalog;
use Tests\TestCase;

/**
 * O catálogo de permissões vive no backend; o texto que o usuário lê no picker
 * vive nas locales do front (`perm.<name>`, com `.` trocado por `_`). Nada
 * ligava os dois: permissão nova sem tradução renderizava a chave crua.
 *
 * Sem banco e sem `markTestSkipped`. Um teste que passa porque não conseguiu
 * ler o arquivo é a lição 10 de novo — se o caminho não resolver, o teste
 * REPROVA.
 *
 * `base_path('../frontend/...')` resolve nos dois ambientes: no host é
 * `backend/../frontend`; no container é `/var/www/../frontend` = `/frontend`,
 * que o compose já monta.
 */
class PermissionI18nParityTest extends TestCase
{
    private const LOCALES = ['en', 'es-CL', 'pt-BR'];

    public function test_todas_as_locales_cobrem_o_catalogo_de_permissoes(): void
    {
        $esperadas = array_map(
            fn (string $perm) => str_replace('.', '_', $perm),
            array_keys(PermissionCatalog::descriptions()),
        );
        sort($esperadas);

        foreach (self::LOCALES as $locale) {
            $path = base_path("../frontend/src/shared/config/locales/{$locale}.json");
            $this->assertFileExists($path, "Locale {$locale} não encontrado em {$path}");

            $json = json_decode((string) file_get_contents($path), true, 512, JSON_THROW_ON_ERROR);
            $this->assertArrayHasKey('perm', $json, "Locale {$locale} não tem o namespace `perm`");

            $chaves = array_keys($json['perm']);
            sort($chaves);

            $this->assertSame(
                $esperadas,
                $chaves,
                "Locale {$locale}: chaves `perm.*` divergem de PermissionCatalog::descriptions(). ".
                'Faltando: '.implode(', ', array_diff($esperadas, $chaves)).'. '.
                'Sobrando: '.implode(', ', array_diff($chaves, $esperadas)).'.',
            );

            foreach ($json['perm'] as $chave => $texto) {
                $this->assertIsString($texto, "Locale {$locale}: `perm.{$chave}` não é string");
                $this->assertNotSame('', trim($texto), "Locale {$locale}: `perm.{$chave}` está vazio");
            }
        }
    }
}
```

- [ ] **Step 2: Rodar e ver passar**

Run: `docker compose exec -T app php artisan test --filter=PermissionI18nParityTest`
Expected: PASS

- [ ] **Step 3: Ver o teste REPROVANDO — obrigatório**

Um teste que nunca foi visto falhando não prova nada (lição 10, que reapareceu dentro do próprio fix dela no bloco anterior).

```bash
cd /home/jvbat/projetos/lotus
python3 - <<'PY'
import json, collections
p = 'frontend/src/shared/config/locales/es-CL.json'
d = json.load(open(p), object_pairs_hook=collections.OrderedDict)
d['perm'].pop('identity_user_view')
json.dump(d, open(p, 'w'), ensure_ascii=False, indent=2)
PY
docker compose exec -T app php artisan test --filter=PermissionI18nParityTest
```
Expected: FAIL com `Locale es-CL: chaves perm.* divergem ... Faltando: identity_user_view.`

Agora restaure e confirme que volta ao verde:

```bash
git checkout -- frontend/src/shared/config/locales/es-CL.json
docker compose exec -T app php artisan test --filter=PermissionI18nParityTest
```
Expected: PASS, e `git status` sem alteração em `es-CL.json`

- [ ] **Step 4: Pint e commit**

```bash
cd backend && ./vendor/bin/pint tests/Feature/Identity/PermissionI18nParityTest.php
cd /home/jvbat/projetos/lotus
git add backend/tests/Feature/Identity/PermissionI18nParityTest.php
git commit -m "test(identity): paridade permissao<->i18n nas 3 locales

Sem markTestSkipped: se o caminho das locales nao resolver, o teste reprova.
Visto reprovando com uma chave removida a mao antes de valer como prova (D9)."
```

---

### Task 8: Gate do bloco

Nada aqui é "rodar por precaução": cada item é um critério do DoD da spec §7.

**Files:** nenhum arquivo de produção.

- [ ] **Step 1: Suíte cheia**

Run: `docker compose exec -T app php artisan test`
Expected: PASS. Baseline eram 347 passed / 1083 assertions; agora deve haver ~13 testes a mais e nenhum a menos. Anote o número exato.

- [ ] **Step 2: Pint em tudo que o bloco tocou**

```bash
cd backend && ./vendor/bin/pint --test app/Shared/Files/Actions/UploadFileAction.php app/Domains/Identity/Actions/StoreRedatorDocumentAction.php app/Domains/Identity/Actions/CreateRedatorAction.php app/Domains/Identity/Services/UserPhotoService.php app/Domains/Commercial/Actions/DeleteClientContactAction.php app/Domains/Commercial/Actions/CreateClientAction.php app/Domains/Commercial/Actions/UpdateClientAction.php app/Domains/Commercial/Data/ClientContactData.php app/Domains/Commercial/Data/ClientAddressData.php app/Domains/Commercial/Services/PrimaryAddressService.php tests/Feature/Cadastros/UploadFileActionTest.php tests/Feature/Cadastros/RedatorDocumentRollbackTest.php tests/Feature/Cadastros/PrimaryContactTest.php tests/Feature/Cadastros/PrimaryAddressTest.php tests/Feature/Comercial/ClientContactMinimumTest.php tests/Feature/Identity/UserPhotoTest.php tests/Feature/Identity/PermissionI18nParityTest.php
```
Expected: `PASS` sem arquivo listado para reformatação

- [ ] **Step 3: Tipos regenerados e estáveis**

```bash
docker compose exec -T app php artisan typescript:transform
git diff --stat frontend/src/shared/api/generated.ts
```
Expected: **sem diff** — o arquivo já foi regenerado e commitado na Task 5. Diff aqui significa que algo ficou de fora.

- [ ] **Step 4: Frontend verde**

```bash
cd frontend && pnpm build && pnpm lint
```
Expected: ambos verdes

- [ ] **Step 5: Nenhum resíduo de `false` silencioso**

```bash
cd /home/jvbat/projetos/lotus/backend
grep -rn '\->store(' app/ --include=*.php
```
Expected: só `UserPhotoService::store()` (que já tem a guarda de `false`). Qualquer outro `->store(` de `UploadedFile` sem checagem de `false` é o mesmo bug e deve ser reportado ao João antes do fechamento.

- [ ] **Step 6: Prova manual da serialização do Q-5 (MySQL, duas sessões)**

A suíte roda sqlite, onde `lockForUpdate()` é no-op — esta é a única prova real do D6. Com o stack de pé e um cliente que tenha exatamente 2 contatos:

```sql
-- sessão A
START TRANSACTION;
SELECT COUNT(*) FROM client_contacts WHERE client_id = 1 AND deleted_at IS NULL FOR UPDATE;
-- sessão B (outro terminal), deve BLOQUEAR aqui até A commitar:
START TRANSACTION;
SELECT COUNT(*) FROM client_contacts WHERE client_id = 1 AND deleted_at IS NULL FOR UPDATE;
```

```bash
docker compose exec -T mysql mysql -uroot -psecret lotus -e "SELECT id, client_id, name FROM client_contacts WHERE deleted_at IS NULL;"
```

Expected: a sessão B fica bloqueada enquanto A não commita. **Se não bloquear, o Q-5 não está fechado** — volta ao `backlog.md` em vez de ser dado como resolvido, como a spec §7 determina.

- [ ] **Step 7: Reportar ao João para a prova de aceite**

Entregue: número final da suíte, saída do `pint --test`, confirmação de `generated.ts` sem diff, e o resultado do Step 6. O bloco só vai a review depois disso.

---

## Notas de execução

**Desvio consciente da spec (D1).** A spec descreve `register(...)` recebendo `originalName`, `mime` e `size` soltos. O plano usa `metadataOf(UploadedFile): array{original_name, mime, size}` + `register(..., array $meta, ...)`: mesmo efeito — metadados capturados antes da escrita — com menos parâmetros e um só lugar extraindo-os. Se o review preferir a assinatura literal da spec, é troca mecânica.

**Ordem das tarefas importa.** A Task 2 depende da Task 1 (`put`/`register`/`discard`). As Tasks 3–7 são independentes entre si e podem ser executadas em qualquer ordem depois da Task 2.

**Risco de review.** `generated.ts` muda (Task 5), o que tira o bloco da faixa de baixo risco: o review pede segunda lente do Codex (`mcp__codex__codex`, read-only) além do `/revisar-sprint` — spec §8.

**O que este bloco NÃO fecha.** O `OperationDemoSeeder` segue capaz de orfanar objeto, porque envolve os Actions numa transação externa (spec D4, decisão consciente). Débitos de UI, minors de 5.2a/5.2b e as decisões de Q-6/P-20/P-21 seguem abertos.
