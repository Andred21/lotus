<?php

namespace Tests\Feature\Cadastros;

use App\Domains\Identity\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class RedatorCrudTest extends TestCase
{
    use RefreshDatabase;

    private function actingAdmin(): void
    {
        $this->actingAs(User::factory()->create(['type' => 'admin', 'is_active' => true]));
    }

    public function test_cria_redator_com_documento(): void
    {
        Storage::fake('s3');
        $this->actingAdmin();

        $response = $this->postJson('/api/redatores', [
            'name'      => 'Magallanes Acuña',
            'rut'       => '20.347.878-K',
            'email'     => 'mao@lotus.cl',
            'documents' => [UploadedFile::fake()->create('cv.pdf', 400, 'application/pdf')],
        ]);

        $response->assertCreated()->assertJsonPath('name', 'Magallanes Acuña');

        $this->assertDatabaseHas('users', ['email' => 'mao@lotus.cl', 'type' => 'redator']);
        $this->assertDatabaseHas('redatores', ['user_id' => User::where('email', 'mao@lotus.cl')->first()->id]);
        $this->assertDatabaseHas('files', ['fileable_type' => 'redator', 'type' => 'documento']);
    }

    public function test_rut_duplicado_rejeitado(): void
    {
        $this->actingAdmin();
        User::factory()->create(['rut' => '20.347.878-K']);

        $this->postJson('/api/redatores', [
            'name'  => 'Outro',
            'rut'   => '20.347.878-K',
            'email' => 'outro@lotus.cl',
        ])->assertStatus(422)->assertJsonValidationErrors('rut');
    }

    public function test_lista_mostra_remove(): void
    {
        Storage::fake('s3');
        $this->actingAdmin();

        $id = $this->postJson('/api/redatores', [
            'name' => 'Fabián Cifuentes', 'rut' => '12.345.678-5', 'email' => 'fc@lotus.cl',
        ])->json('id');

        $this->getJson('/api/redatores')->assertOk()->assertJsonCount(1);
        $this->getJson("/api/redatores/{$id}")->assertOk()->assertJsonPath('id', $id);
        $this->deleteJson("/api/redatores/{$id}")->assertNoContent();
        $this->assertSoftDeleted('redatores', ['id' => $id]);
    }
}
