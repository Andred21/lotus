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
