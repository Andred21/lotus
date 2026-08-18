<?php

namespace Tests\Feature\Cadastros;

use App\Domains\Identity\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\CreatesDomainRecords;
use Tests\TestCase;

class ClientArchiveEndpointTest extends TestCase
{
    use CreatesDomainRecords;
    use RefreshDatabase;

    public function test_listagem_de_arquivados_nao_vaza_ativo_e_traz_data_e_autor(): void
    {
        $autor = $this->actingAsAdmin();
        $autor->update(['name' => 'Ana Torres']);

        $ativo = $this->makeClientWithUser(['legal_name' => 'Vivo Ltda'], ['rut' => '11.111.111-1']);
        $arquivado = $this->makeClientWithUser(['legal_name' => 'Arquivado Ltda'], ['rut' => '12.345.678-5']);
        $arquivado->delete();

        $this->getJson('/api/clients/archived')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.client.id', $arquivado->id)
            ->assertJsonPath('0.client.legal_name', 'Arquivado Ltda')
            ->assertJsonPath('0.archived_by', 'Ana Torres');

        $this->getJson('/api/clients')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.id', $ativo->id);
    }

    public function test_archived_by_e_nulo_sem_audit_de_usuario(): void
    {
        $arquivado = $this->makeClientWithUser(['legal_name' => 'Sem Autor'], ['rut' => '13.456.789-9']);
        $arquivado->delete();

        $this->actingAsAdmin();

        $this->getJson('/api/clients/archived')
            ->assertOk()
            ->assertJsonPath('0.archived_by', null);
    }

    public function test_restaura_e_devolve_o_cliente(): void
    {
        $this->actingAsAdmin();
        $client = $this->makeClientWithUser(['legal_name' => 'Volta Ltda'], ['rut' => '14.567.890-2']);
        $client->delete();

        $this->postJson("/api/clients/{$client->id}/restore")
            ->assertOk()
            ->assertJsonPath('legal_name', 'Volta Ltda');

        $this->assertNull($client->fresh()->deleted_at);
    }

    public function test_restaurar_cliente_ativo_da_404(): void
    {
        // O binding resolve por `onlyTrashed()`: ativo não existe para esta rota.
        $this->actingAsAdmin();
        $client = $this->makeClientWithUser([], ['rut' => '15.678.901-6']);

        $this->postJson("/api/clients/{$client->id}/restore")->assertNotFound();
    }

    public function test_sem_a_permissao_de_restore_da_403(): void
    {
        $this->seed(RolePermissionSeeder::class);

        $user = User::factory()->create(['type' => 'admin', 'is_active' => true]);
        $user->givePermissionTo('commercial.client.view');
        $this->actingAs($user, 'web');

        $client = $this->makeClientWithUser([], ['rut' => '16.789.012-0']);
        $client->delete();

        // Vê a lista (tem a `view`)...
        $this->getJson('/api/clients/archived')->assertOk();
        // ...mas não restaura.
        $this->postJson("/api/clients/{$client->id}/restore")->assertForbidden();
    }

    public function test_archived_exige_a_permissao_de_view(): void
    {
        $this->seed(RolePermissionSeeder::class);

        $user = User::factory()->redator()->create(['is_active' => true]);
        $user->assignRole('redator');
        $this->actingAs($user, 'web');

        $this->getJson('/api/clients/archived')->assertForbidden();
    }
}
