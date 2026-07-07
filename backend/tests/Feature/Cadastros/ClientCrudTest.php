<?php

namespace Tests\Feature\Cadastros;

use App\Domains\Identity\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ClientCrudTest extends TestCase
{
    use RefreshDatabase;

    private function actingAdmin(): User
    {
        $admin = User::factory()->create(['type' => 'admin', 'is_active' => true]);
        $this->actingAs($admin);

        return $admin;
    }

    private function payload(array $override = []): array
    {
        return array_merge([
            'name'              => 'Switch Chile',
            'rut'               => '12.345.678-5',
            'email'             => 'info@switch.cl',
            'legal_name'        => 'Switch Chile Ltda',
            'type'              => 'client',
            'business_activity' => 'Instalaciones Eléctricas',
            'addresses'         => [['commune' => 'Providencia', 'city' => 'Santiago', 'region' => 'RM', 'is_primary' => true]],
            'contacts'          => [['name' => 'Parris Barrios', 'email' => 'p@switch.cl', 'is_primary' => true]],
        ], $override);
    }

    public function test_cria_cliente_completo(): void
    {
        $this->actingAdmin();

        $this->postJson('/api/clients', $this->payload())
            ->assertCreated()
            ->assertJsonPath('legal_name', 'Switch Chile Ltda')
            ->assertJsonPath('addresses.0.commune', 'Providencia')
            ->assertJsonPath('contacts.0.name', 'Parris Barrios');

        $this->assertDatabaseHas('users', ['email' => 'info@switch.cl', 'type' => 'cliente', 'is_active' => false]);
        $this->assertDatabaseHas('clients', ['legal_name' => 'Switch Chile Ltda']);
        $this->assertDatabaseHas('client_addresses', ['commune' => 'Providencia']);
        $this->assertDatabaseHas('client_contacts', ['name' => 'Parris Barrios']);
    }

    public function test_rut_duplicado_rejeitado(): void
    {
        $this->actingAdmin();
        User::factory()->create(['rut' => '12.345.678-5']);

        $this->postJson('/api/clients', $this->payload())
            ->assertStatus(422)
            ->assertJsonValidationErrors('rut');
    }

    public function test_lista_mostra_e_atualiza_e_remove(): void
    {
        $this->actingAdmin();

        $id = $this->postJson('/api/clients', $this->payload())->json('id');

        $this->getJson('/api/clients')->assertOk()->assertJsonCount(1);
        $this->getJson("/api/clients/{$id}")->assertOk()->assertJsonPath('id', $id);

        $this->putJson("/api/clients/{$id}", $this->payload(['legal_name' => 'Switch Chile SpA']))
            ->assertOk()
            ->assertJsonPath('legal_name', 'Switch Chile SpA');

        $this->deleteJson("/api/clients/{$id}")->assertNoContent();
        $this->assertSoftDeleted('clients', ['id' => $id]);
    }

    public function test_exige_autenticacao(): void
    {
        $this->postJson('/api/clients', $this->payload())->assertStatus(401);
    }
}
