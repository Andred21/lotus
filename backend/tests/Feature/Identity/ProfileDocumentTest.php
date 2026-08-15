<?php

namespace Tests\Feature\Identity;

use App\Domains\Identity\Models\Redator;
use App\Domains\Identity\Models\User;
use App\Shared\Files\Models\File;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ProfileDocumentTest extends TestCase
{
    use RefreshDatabase;

    private function actingAsRedator(): Redator
    {
        $this->seed(RolePermissionSeeder::class);

        $user = User::factory()->create([
            'type' => 'redator', 'is_active' => true, 'rut' => '12.345.678-5',
        ]);
        $user->assignRole('redator');
        $this->actingAs($user, 'web');

        return Redator::create(['user_id' => $user->id]);
    }

    public function test_redator_envia_o_proprio_cv(): void
    {
        Storage::fake('s3');
        $redator = $this->actingAsRedator();

        $this->postJson('/api/profile/documents', [
            'type' => 'CV',
            'file' => UploadedFile::fake()->create('cv.pdf', 20, 'application/pdf'),
        ])
            ->assertCreated()
            ->assertJsonPath('type', 'CV');

        $this->assertSame(1, $redator->documents()->where('type', 'CV')->count());
    }

    /** Replace (spec D2): o anterior fica soft-deletado, com rastro. */
    public function test_enviar_de_novo_substitui_e_o_anterior_fica_soft_deletado(): void
    {
        Storage::fake('s3');
        $redator = $this->actingAsRedator();

        $this->postJson('/api/profile/documents', [
            'type' => 'CV', 'file' => UploadedFile::fake()->create('velho.pdf', 20, 'application/pdf'),
        ])->assertCreated();
        $velho = $redator->documents()->where('type', 'CV')->sole();

        $this->postJson('/api/profile/documents', [
            'type' => 'CV', 'file' => UploadedFile::fake()->create('novo.pdf', 20, 'application/pdf'),
        ])->assertCreated();

        $this->assertSoftDeleted('files', ['id' => $velho->id]);
        $this->assertSame(1, $redator->documents()->count());
        $this->assertSame('novo.pdf', $redator->documents()->sole()->original_name);
    }

    /**
     * Spec D5. O REUF é a única entrada do gate da RN-09
     * (`RedatorIdoneidadeService`), e a rota aceita `valid_until` do corpo:
     * self-service nele deixaria o redator se auto-habilitar por payload.
     * É entrada inválida para esta superfície, então 422 nomeando o campo —
     * nunca 403, que diria "falta permissão".
     */
    public function test_reuf_reprova_com_422_e_nao_cria_documento(): void
    {
        Storage::fake('s3');
        $redator = $this->actingAsRedator();

        $this->postJson('/api/profile/documents', [
            'type' => 'REUF',
            'file' => UploadedFile::fake()->create('reuf.pdf', 20, 'application/pdf'),
            'valid_until' => '2099-12-31',
        ])
            ->assertStatus(422)
            ->assertJsonPath('errors.type.0', fn (?string $msg) => filled($msg));

        $this->assertSame(0, $redator->documents()->count());
    }

    public function test_valid_until_e_aceito_nos_tipos_liberados(): void
    {
        Storage::fake('s3');
        $redator = $this->actingAsRedator();

        $this->postJson('/api/profile/documents', [
            'type' => 'TITULO',
            'file' => UploadedFile::fake()->create('titulo.pdf', 20, 'application/pdf'),
            'valid_until' => '2030-01-31',
        ])->assertCreated();

        $this->assertSame('2030-01-31', $redator->documents()->sole()->valid_until->toDateString());
    }

    /** Admin não é redator: não há documentação profissional dele para enviar. */
    public function test_admin_recebe_403(): void
    {
        Storage::fake('s3');
        $this->actingAsAdmin();

        $this->postJson('/api/profile/documents', [
            'type' => 'CV', 'file' => UploadedFile::fake()->create('cv.pdf', 20, 'application/pdf'),
        ])->assertForbidden();

        $this->assertSame(0, File::count());
    }

    /** Não existe remoção self-service (spec D2). */
    public function test_nao_existe_rota_de_remocao_self_service(): void
    {
        $redator = $this->actingAsRedator();
        $doc = $redator->documents()->create([
            'type' => 'CV', 'path' => 'p/cv.pdf', 'original_name' => 'cv.pdf',
            'mime' => 'application/pdf', 'size' => 1,
        ]);

        $this->deleteJson("/api/profile/documents/{$doc->id}")->assertNotFound();
        $this->assertNotSoftDeleted('files', ['id' => $doc->id]);
    }
}
