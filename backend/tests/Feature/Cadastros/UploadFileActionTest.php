<?php

namespace Tests\Feature\Cadastros;

use App\Domains\Identity\Models\Redator;
use App\Domains\Identity\Models\User;
use App\Shared\Files\Actions\UploadFileAction;
use Illuminate\Filesystem\FilesystemAdapter;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Mockery;
use RuntimeException;
use Tests\TestCase;

class UploadFileActionTest extends TestCase
{
    use RefreshDatabase;

    public function test_upload_grava_no_disco_e_registra_em_files(): void
    {
        /** @var FilesystemAdapter $storage */
        $storage = Storage::fake('s3');

        $redator = Redator::create(['user_id' => User::factory()->redator()->create()->id]);
        $upload = UploadedFile::fake()->create('cv.pdf', 500, 'application/pdf');

        $file = app(UploadFileAction::class)->execute($redator, $upload, 'cv', null, 's3');

        $storage->assertExists($file->path);
        $this->assertDatabaseHas('files', [
            'fileable_type' => 'redator',
            'fileable_id' => $redator->id,
            'type' => 'cv',
            'original_name' => 'cv.pdf',
        ]);
        $this->assertSame('redator', $file->fileable_type);
    }

    /**
     * Achado real (2026-07-31): `AWS_ENDPOINT` precisa apontar pro hostname
     * interno do Docker (`minio`) pra escrita real funcionar de dentro do
     * container, mas uma URL pré-assinada com esse host não é alcançável
     * pelo navegador. `publicDiskFor()` resolve isso escolhendo, só pra
     * ASSINAR a URL de leitura, o disco `{disco}_public` quando ele existir
     * na config — nunca usado para put/delete.
     */
    public function test_public_disk_for_usa_variante_public_quando_configurada(): void
    {
        config(['filesystems.disks.s3_public' => ['driver' => 'local', 'root' => sys_get_temp_dir()]]);

        $this->assertSame('s3_public', UploadFileAction::publicDiskFor('s3'));
    }

    public function test_public_disk_for_cai_no_mesmo_disco_sem_variante_public(): void
    {
        $this->assertSame('local', UploadFileAction::publicDiskFor('local'));
    }

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
}
