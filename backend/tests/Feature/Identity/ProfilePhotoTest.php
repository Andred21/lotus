<?php

namespace Tests\Feature\Identity;

use App\Domains\Identity\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ProfilePhotoTest extends TestCase
{
    use RefreshDatabase;

    private function actingAsRedator(): User
    {
        $this->seed(RolePermissionSeeder::class);

        $user = User::factory()->create([
            'type' => 'redator', 'is_active' => true, 'rut' => '12.345.678-5',
        ]);
        $user->assignRole('redator');
        $this->actingAs($user, 'web');

        return $user;
    }

    public function test_grava_a_propria_foto(): void
    {
        $storage = Storage::fake('s3');
        $user = $this->actingAsAdmin();

        $this->postJson('/api/profile/photo', ['photo' => UploadedFile::fake()->image('eu.png')])
            ->assertNoContent();

        $user->refresh();
        $this->assertNotNull($user->photo_path);
        $storage->assertExists($user->photo_path);
    }

    /**
     * O redator não tem `identity.user.update` e mesmo assim troca a própria
     * foto: a rota self-service não passa pelo gate administrativo (D7).
     */
    public function test_redator_sem_permissao_administrativa_troca_a_propria_foto(): void
    {
        Storage::fake('s3');
        $user = $this->actingAsRedator();

        $this->postJson('/api/profile/photo', ['photo' => UploadedFile::fake()->image('eu.png')])
            ->assertNoContent();

        $this->assertNotNull($user->refresh()->photo_path);
    }

    public function test_remove_a_propria_foto(): void
    {
        $storage = Storage::fake('s3');
        $user = $this->actingAsAdmin();
        $this->postJson('/api/profile/photo', ['photo' => UploadedFile::fake()->image('eu.png')])->assertNoContent();
        $path = $user->refresh()->photo_path;

        $this->deleteJson('/api/profile/photo')->assertNoContent();

        $this->assertNull($user->refresh()->photo_path);
        $storage->assertMissing($path);
    }

    /** Sem foto, remover é no-op — não é erro. */
    public function test_remover_sem_foto_e_no_op(): void
    {
        Storage::fake('s3');
        $this->actingAsAdmin();

        $this->deleteJson('/api/profile/photo')->assertNoContent();
    }

    /** A validação é a MESMA do cadastro: `UserPhotoService::RULES`, fonte única. */
    public function test_arquivo_que_nao_e_imagem_reprova_com_422(): void
    {
        Storage::fake('s3');
        $this->actingAsAdmin();

        $this->postJson('/api/profile/photo', ['photo' => UploadedFile::fake()->create('curriculo.pdf', 10, 'application/pdf')])
            ->assertStatus(422)
            ->assertJsonPath('errors.photo.0', fn (?string $msg) => filled($msg));
    }

    public function test_visitante_nao_autenticado_recebe_401(): void
    {
        $this->postJson('/api/profile/photo')->assertUnauthorized();
    }
}
