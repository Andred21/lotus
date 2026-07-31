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

        app(UserPhotoService::class)->store($user, UploadedFile::fake()->image('foto.png'));

        $user->refresh();
        $this->assertNotNull($user->photo_path);
        $storage->assertExists($user->photo_path);
    }

    public function test_substituir_foto_apaga_o_objeto_anterior(): void
    {
        $storage = Storage::fake('s3');
        $user = User::factory()->create(['type' => 'admin']);
        $service = app(UserPhotoService::class);

        $service->store($user, UploadedFile::fake()->image('primeira.png'));
        $old = $user->refresh()->photo_path;

        $service->store($user, UploadedFile::fake()->image('segunda.png'));
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

        $service->store($user, UploadedFile::fake()->image('foto.png'));
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
        $service->store($user, UploadedFile::fake()->image('foto.png'));

        $url = $service->urlFor($user->refresh()->photo_path);

        $this->assertIsString($url);
        $this->assertNotSame('', $url);
    }

    public function test_troca_de_foto_gera_registro_de_auditoria(): void
    {
        Storage::fake('s3');
        $user = User::factory()->create(['type' => 'admin']);

        app(UserPhotoService::class)->store($user, UploadedFile::fake()->image('foto.png'));

        // `User` é Auditable — a troca de photo_path entra em `audits` sem
        // código de auditoria próprio (spec D3, lei §5.2).
        $this->assertDatabaseHas('audits', [
            'auditable_type' => 'user',
            'auditable_id' => $user->id,
            'event' => 'updated',
        ]);
    }
}
