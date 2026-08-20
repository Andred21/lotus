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

    public function test_arquivado_mostra_comuna_e_contatos_que_a_cascata_levou(): void
    {
        // Sem o eager load com `withTrashed()` a linha aparece com comuna `—` e
        // `0` contatos — a cascata acabou de arquivar os dois e o global scope
        // os esconde. O operador reconhece o registro por essas colunas antes de
        // restaurar (Q-8 do review de 2026-08-18).
        $this->actingAsAdmin();

        $client = $this->makeClientWithUser(['legal_name' => 'Con Dirección Ltda'], ['rut' => '15.678.901-6']);
        $client->addresses()->create(['commune' => 'Providencia', 'city' => 'Santiago', 'region' => 'RM', 'is_primary' => true]);
        $client->contacts()->create(['name' => 'Vivo', 'email' => 'v@s.cl', 'is_primary' => true]);

        $client->delete();

        $this->getJson('/api/clients/archived')
            ->assertOk()
            ->assertJsonPath('0.client.addresses.0.commune', 'Providencia')
            ->assertJsonCount(1, '0.client.contacts');
    }

    public function test_arquivado_nao_mostra_o_filho_arquivado_antes_do_pai(): void
    {
        // O contorno do teste acima: quem foi arquivado por vontade própria não
        // volta no restore (spec D2), então mostrá-lo aqui prometeria uma
        // restauração que não acontece.
        $this->actingAsAdmin();

        $client = $this->makeClientWithUser(['legal_name' => 'Contato Antigo Ltda'], ['rut' => '16.789.012-0']);
        $client->contacts()->create(['name' => 'Antigo', 'email' => 'a@s.cl', 'is_primary' => false])->delete();
        $client->contacts()->create(['name' => 'Vivo', 'email' => 'v@s.cl', 'is_primary' => true]);

        $client->delete();

        $this->getJson('/api/clients/archived')
            ->assertOk()
            ->assertJsonCount(1, '0.client.contacts')
            ->assertJsonPath('0.client.contacts.0.name', 'Vivo');
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
