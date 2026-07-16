<?php

namespace Tests\Feature\Cadastros;

use App\Domains\Commercial\Models\Client;
use App\Domains\Commercial\Models\ClientContact;
use App\Domains\Identity\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PrimaryContactTest extends TestCase
{
    use RefreshDatabase;

    private function payload(array $contacts): array
    {
        return [
            'name' => 'Switch Chile',
            'rut' => '12.345.678-5',
            'email' => 'info@switch.cl',
            'legal_name' => 'Switch Chile Ltda',
            'type' => 'client',
            'addresses' => [['commune' => 'Providencia', 'city' => 'Santiago', 'region' => 'RM', 'is_primary' => true]],
            'contacts' => $contacts,
        ];
    }

    public function test_create_com_dois_principais_mantem_apenas_o_ultimo(): void
    {
        $this->actingAsAdmin();

        $this->postJson('/api/clients', $this->payload([
            ['name' => 'Contato A', 'is_primary' => true],
            ['name' => 'Contato B', 'is_primary' => true],
        ]))->assertCreated();

        $this->assertDatabaseHas('client_contacts', ['name' => 'Contato A', 'is_primary' => false]);
        $this->assertDatabaseHas('client_contacts', ['name' => 'Contato B', 'is_primary' => true]);
    }

    public function test_update_marcando_b_desmarca_a(): void
    {
        $this->actingAsAdmin();

        $id = $this->postJson('/api/clients', $this->payload([
            ['name' => 'Contato A', 'is_primary' => true],
            ['name' => 'Contato B', 'is_primary' => false],
        ]))->assertCreated()->json('id');

        $this->putJson("/api/clients/{$id}", $this->payload([
            ['name' => 'Contato A', 'is_primary' => false],
            ['name' => 'Contato B', 'is_primary' => true],
        ]))->assertOk();

        $this->assertDatabaseHas('client_contacts', ['name' => 'Contato A', 'is_primary' => false, 'deleted_at' => null]);
        $this->assertDatabaseHas('client_contacts', ['name' => 'Contato B', 'is_primary' => true, 'deleted_at' => null]);
    }

    public function test_cliente_sem_principal_e_valido(): void
    {
        $this->actingAsAdmin();

        $this->postJson('/api/clients', $this->payload([
            ['name' => 'Contato A', 'is_primary' => false],
            ['name' => 'Contato B', 'is_primary' => false],
        ]))->assertCreated();

        // 0 principais é estado válido: o serviço não promove ninguém.
        $this->assertDatabaseHas('client_contacts', ['name' => 'Contato A', 'is_primary' => false]);
        $this->assertDatabaseHas('client_contacts', ['name' => 'Contato B', 'is_primary' => false]);
    }

    public function test_nunca_mais_de_um_principal_com_tres_contatos(): void
    {
        $this->actingAsAdmin();

        $id = $this->postJson('/api/clients', $this->payload([
            ['name' => 'Contato A', 'is_primary' => true],
            ['name' => 'Contato B', 'is_primary' => true],
            ['name' => 'Contato C', 'is_primary' => true],
        ]))->assertCreated()->json('id');

        $this->assertSame(1, ClientContact::where('client_id', $id)
            ->where('is_primary', true)
            ->count());
    }

    public function test_desmarcar_principal_e_auditado(): void
    {
        $this->actingAsAdmin();

        // A auditoria só existe se o unmark passar pelo evento do model. Um
        // ->where(...)->update(...) no query builder gravaria sem rastro (lei §5.2).
        $this->postJson('/api/clients', $this->payload([
            ['name' => 'Contato A', 'is_primary' => true],
            ['name' => 'Contato B', 'is_primary' => true],
        ]))->assertCreated();

        $a = ClientContact::where('name', 'Contato A')->firstOrFail();

        $this->assertDatabaseHas('audits', [
            'auditable_type' => 'client_contact',
            'auditable_id' => $a->id,
            'event' => 'updated',
        ]);
    }

    private function makeClientWithPrimary(): Client
    {
        $this->actingAsAdmin();
        $user = User::factory()->create(['type' => 'cliente', 'is_active' => false]);
        $client = $user->client()->create(['legal_name' => 'ACME Ltda', 'type' => 'client']);
        $client->contacts()->create(['name' => 'Contato A', 'is_primary' => true]);

        return $client;
    }

    public function test_rota_nested_marcar_novo_principal_desmarca_o_anterior(): void
    {
        $client = $this->makeClientWithPrimary();

        $this->postJson("/api/clients/{$client->id}/contacts", [
            'name' => 'Contato B', 'is_primary' => true,
        ])->assertCreated();

        $this->assertDatabaseHas('client_contacts', ['name' => 'Contato A', 'is_primary' => false]);
        $this->assertDatabaseHas('client_contacts', ['name' => 'Contato B', 'is_primary' => true]);
    }

    public function test_rota_nested_update_marcando_principal_desmarca_o_anterior(): void
    {
        $client = $this->makeClientWithPrimary();
        $b = $client->contacts()->create(['name' => 'Contato B', 'is_primary' => false]);

        $this->putJson("/api/contacts/{$b->id}", [
            'name' => 'Contato B', 'is_primary' => true,
        ])->assertOk();

        $this->assertDatabaseHas('client_contacts', ['name' => 'Contato A', 'is_primary' => false]);
        $this->assertDatabaseHas('client_contacts', ['name' => 'Contato B', 'is_primary' => true]);
    }

    public function test_rota_nested_update_desmarcando_o_principal_nao_promove_ninguem(): void
    {
        $client = $this->makeClientWithPrimary();
        $a = $client->contacts()->firstOrFail();

        $this->putJson("/api/contacts/{$a->id}", [
            'name' => 'Contato A', 'is_primary' => false,
        ])->assertOk();

        // 0 principais é estado válido: desmarcar o único principal não pode
        // promover ninguém (ensureSingle faz early-return com primaries.count() == 0).
        $this->assertSame(0, ClientContact::where('client_id', $client->id)
            ->where('is_primary', true)
            ->count());
    }

    public function test_rota_nested_contato_novo_nao_principal_nao_mexe_no_anterior(): void
    {
        $client = $this->makeClientWithPrimary();

        $this->postJson("/api/clients/{$client->id}/contacts", [
            'name' => 'Contato B', 'is_primary' => false,
        ])->assertCreated();

        $this->assertDatabaseHas('client_contacts', ['name' => 'Contato A', 'is_primary' => true]);
        $this->assertDatabaseHas('client_contacts', ['name' => 'Contato B', 'is_primary' => false]);
    }
}
