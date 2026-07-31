<?php

namespace Tests\Feature\Cadastros;

use App\Domains\Identity\Models\Redator;
use App\Domains\Identity\Models\User;
use App\Shared\Files\Actions\UploadFileAction;
use Illuminate\Filesystem\FilesystemAdapter;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
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
}
