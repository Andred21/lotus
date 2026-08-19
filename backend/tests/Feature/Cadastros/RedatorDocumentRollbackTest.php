<?php

namespace Tests\Feature\Cadastros;

use App\Domains\Identity\Actions\CreateRedatorAction;
use App\Domains\Identity\Actions\StoreRedatorDocumentAction;
use App\Domains\Identity\Actions\UpdateRedatorAction;
use App\Domains\Identity\Data\RedatorData;
use App\Domains\Identity\Enums\RedatorDocumentType;
use App\Domains\Identity\Models\Redator;
use App\Domains\Identity\Models\User;
use App\Shared\Files\Models\File;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Filesystem\FilesystemAdapter;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
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

    /**
     * Falha só a partir do SEGUNDO `File::create()`. Necessário para provar o
     * bug do update: se a falha fosse já no primeiro (como `failOnFileInsert`
     * faz), o próprio catch do `StoreRedatorDocumentAction::execute()` já
     * descartaria o binário daquele documento sozinho, sem nunca chegar no
     * segundo — o cenário não exercitaria o rollback da transação externa
     * desfazendo o registro do PRIMEIRO documento (já bem-sucedido) sem
     * descartar o binário dele.
     */
    private function failOnSecondFileInsert(): void
    {
        $insercoes = 0;

        Event::listen('eloquent.creating: '.File::class, function () use (&$insercoes): void {
            $insercoes++;

            if ($insercoes >= 2) {
                throw new RuntimeException('insert recusado');
            }
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
        // O cadastro passou a exigir a role `redator` (RF-ROL-05), então o
        // cenário precisa do seeder — sem ele a falha vem da role ausente e
        // não do insert que este teste quer provar.
        $this->seed(RolePermissionSeeder::class);
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

    public function test_falha_no_insert_durante_update_redator_limpa_todos_os_documentos(): void
    {
        /** @var FilesystemAdapter $storage */
        $storage = Storage::fake('s3');
        config(['filesystems.default' => 's3']);
        $redator = $this->redator();
        $data = RedatorData::from([
            'name' => $redator->user->name,
            // O factory não seta rut (coluna nullable) — $redator->user->rut
            // viria null e RedatorData::from() rejeitaria antes de chegar na
            // Action. Um RUT válido qualquer serve: o teste é sobre o
            // rollback do upload, não sobre o valor do RUT.
            'rut' => '13.456.789-9',
            'email' => $redator->user->email,
        ]);
        $this->failOnSecondFileInsert();

        try {
            app(UpdateRedatorAction::class)->execute($redator, $data, [
                'CV' => UploadedFile::fake()->create('cv.pdf', 10, 'application/pdf'),
                'REUF' => UploadedFile::fake()->create('reuf.pdf', 10, 'application/pdf'),
            ]);
            $this->fail('esperava RuntimeException');
        } catch (RuntimeException) {
            // esperado
        }

        $this->assertSame([], $storage->allFiles(), 'objeto órfão ficou no bucket');
        $this->assertDatabaseCount('files', 0);
    }

    /**
     * A outra saída da transação, e a que o bloco de 2026-08-11 abriu: a
     * unicidade de RUT passou para DENTRO da transação, então um RUT duplicado
     * agora aborta DEPOIS de os binários já terem subido. Os casos acima só
     * injetam `RuntimeException` no insert de `File` — o caminho da
     * `ValidationException` ficava afirmado no plano (D-P7) e não provado
     * (review de 2026-08-11, Q-3).
     *
     * Sem o `catch (Throwable)` da Action — com um `catch` só de RuntimeException,
     * por exemplo — este caso reprova e os outros três continuam verdes.
     */
    public function test_rut_duplicado_no_update_descarta_os_binarios_ja_enviados(): void
    {
        /** @var FilesystemAdapter $storage */
        $storage = Storage::fake('s3');
        config(['filesystems.default' => 's3']);

        // O RUT já pertence a outro usuário: o ensureIdentityAvailable recusa
        // DENTRO da transação, com os dois binários já no bucket.
        User::factory()->create(['rut' => '13.456.789-9']);
        $redator = $this->redator();
        $data = RedatorData::from([
            'name' => $redator->user->name,
            'rut' => '13.456.789-9',
            'email' => $redator->user->email,
        ]);

        try {
            app(UpdateRedatorAction::class)->execute($redator, $data, [
                'CV' => UploadedFile::fake()->create('cv.pdf', 10, 'application/pdf'),
                'REUF' => UploadedFile::fake()->create('reuf.pdf', 10, 'application/pdf'),
            ]);
            $this->fail('esperava ValidationException: o RUT já está cadastrado');
        } catch (ValidationException $e) {
            $this->assertArrayHasKey('rut', $e->errors());
        }

        $this->assertSame([], $storage->allFiles(), 'objeto órfão ficou no bucket');
        $this->assertDatabaseCount('files', 0);
    }
}
