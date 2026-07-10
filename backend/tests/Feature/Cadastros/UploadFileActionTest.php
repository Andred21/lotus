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
}
