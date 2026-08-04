<?php

namespace Tests\Feature\Cadastros;

use App\Domains\Commercial\Models\Client;
use App\Domains\Commercial\Models\ClientContact;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\CreatesDomainRecords;
use Tests\TestCase;

class PrimaryContactTest extends TestCase
{
    use CreatesDomainRecords;
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

    public function test_update_com_dois_principais_mantem_apenas_o_ultimo(): void
    {
        $this->actingAsAdmin();

        $id = $this->postJson('/api/clients', $this->payload([
            ['name' => 'Contato A', 'is_primary' => true],
            ['name' => 'Contato B', 'is_primary' => false],
        ]))->assertCreated()->json('id');

        $this->putJson("/api/clients/{$id}", $this->payload([
            ['name' => 'Contato A', 'is_primary' => true],
            ['name' => 'Contato B', 'is_primary' => true],
        ]))->assertOk();

        $this->assertSame(1, ClientContact::where('client_id', $id)
            ->where('is_primary', true)
            ->count());
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

    public function test_rota_nested_marcar_novo_principal_desmarca_o_anterior(): void
    {
        $this->actingAsAdmin();
        $client = $this->makeClientWithUser(['legal_name' => 'ACME Ltda']);
        $client->contacts()->create(['name' => 'Contato A', 'is_primary' => true]);

        $this->postJson("/api/clients/{$client->id}/contacts", [
            'name' => 'Contato B', 'is_primary' => true,
        ])->assertCreated();

        $this->assertDatabaseHas('client_contacts', ['name' => 'Contato A', 'is_primary' => false]);
        $this->assertDatabaseHas('client_contacts', ['name' => 'Contato B', 'is_primary' => true]);
    }

    public function test_rota_nested_update_marcando_principal_desmarca_o_anterior(): void
    {
        $this->actingAsAdmin();
        $client = $this->makeClientWithUser(['legal_name' => 'ACME Ltda']);
        $client->contacts()->create(['name' => 'Contato A', 'is_primary' => true]);
        $b = $client->contacts()->create(['name' => 'Contato B', 'is_primary' => false]);

        $this->putJson("/api/contacts/{$b->id}", [
            'name' => 'Contato B', 'is_primary' => true,
        ])->assertOk();

        $this->assertDatabaseHas('client_contacts', ['name' => 'Contato A', 'is_primary' => false]);
        $this->assertDatabaseHas('client_contacts', ['name' => 'Contato B', 'is_primary' => true]);
    }

    public function test_rota_nested_update_desmarcando_o_principal_nao_promove_ninguem(): void
    {
        $this->actingAsAdmin();
        $client = $this->makeClientWithUser(['legal_name' => 'ACME Ltda']);
        $client->contacts()->create(['name' => 'Contato A', 'is_primary' => true]);
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

    public function test_rota_nested_update_promove_a_via_winner_mesmo_b_tendo_id_maior(): void
    {
        // A (id menor, não principal) e B (id maior, principal). Ao promover A
        // explicitamente, o $winner do ensureSingle deve prevalecer sobre o
        // "último por id" (que seria B) — senão o serviço desmarcaria o contato
        // que o caller acabou de pedir para promover.
        $this->actingAsAdmin();
        $client = $this->makeClientWithUser(['legal_name' => 'ACME Ltda']);
        $a = $client->contacts()->create(['name' => 'Contato A', 'is_primary' => false]);
        $b = $client->contacts()->create(['name' => 'Contato B', 'is_primary' => true]);

        $this->putJson("/api/contacts/{$a->id}", [
            'name' => 'Contato A', 'is_primary' => true,
        ])->assertOk();

        $this->assertDatabaseHas('client_contacts', ['id' => $a->id, 'is_primary' => true]);
        $this->assertDatabaseHas('client_contacts', ['id' => $b->id, 'is_primary' => false]);
    }

    public function test_rota_nested_contato_novo_nao_principal_nao_mexe_no_anterior(): void
    {
        $this->actingAsAdmin();
        $client = $this->makeClientWithUser(['legal_name' => 'ACME Ltda']);
        $client->contacts()->create(['name' => 'Contato A', 'is_primary' => true]);

        $this->postJson("/api/clients/{$client->id}/contacts", [
            'name' => 'Contato B', 'is_primary' => false,
        ])->assertCreated();

        $this->assertDatabaseHas('client_contacts', ['name' => 'Contato A', 'is_primary' => true]);
        $this->assertDatabaseHas('client_contacts', ['name' => 'Contato B', 'is_primary' => false]);
    }

    /**
     * `is_primary` era `bool = false`, não `Optional`: um PUT que não mandava o
     * campo rebaixava o principal em silêncio, porque `toArray()` devolvia
     * `false` para uma chave que o cliente nunca enviou.
     */
    public function test_put_de_contato_sem_is_primary_mantem_o_principal(): void
    {
        $this->actingAsAdmin();

        $id = $this->postJson('/api/clients', $this->payload([
            ['name' => 'Contato A', 'is_primary' => true],
        ]))->assertCreated()->json('id');

        $contatoId = Client::findOrFail($id)->contacts()->firstOrFail()->id;

        $this->putJson("/api/contacts/{$contatoId}", ['name' => 'Contato A editado'])
            ->assertOk();

        $this->assertDatabaseHas('client_contacts', [
            'id' => $contatoId,
            'name' => 'Contato A editado',
            'is_primary' => true,
        ]);
    }

    public function test_contato_criado_sem_is_primary_nasce_nao_principal(): void
    {
        $this->actingAsAdmin();

        $this->postJson('/api/clients', $this->payload([
            ['name' => 'Contato A', 'is_primary' => true],
            ['name' => 'Contato B'],
        ]))->assertCreated();

        $this->assertDatabaseHas('client_contacts', ['name' => 'Contato B', 'is_primary' => false]);
    }
}
