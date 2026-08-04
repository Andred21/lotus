<?php

namespace Tests\Feature\Cadastros;

use App\Domains\Commercial\Models\Client;
use App\Domains\Commercial\Models\ClientAddress;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\CreatesDomainRecords;
use Tests\TestCase;

/**
 * Mesma invariante dos contatos, no endereço: no máximo 1 principal por
 * cliente, garantida na aplicação e nunca em trigger (ADR-02/ADR-08 — trigger
 * enxerga a conexão, não o usuário autenticado, e a auditoria perderia o
 * autor). Cliente SEM principal segue estado válido: ninguém é promovido.
 */
class PrimaryAddressTest extends TestCase
{
    use CreatesDomainRecords;
    use RefreshDatabase;

    private function payload(array $addresses): array
    {
        return [
            'name' => 'Switch Chile',
            'rut' => '12.345.678-5',
            'email' => 'info@switch.cl',
            'legal_name' => 'Switch Chile Ltda',
            'type' => 'client',
            'addresses' => $addresses,
            'contacts' => [['name' => 'Contato A', 'is_primary' => true]],
        ];
    }

    public function test_create_com_dois_principais_mantem_apenas_o_ultimo(): void
    {
        $this->actingAsAdmin();

        $this->postJson('/api/clients', $this->payload([
            ['commune' => 'Providencia', 'city' => 'Santiago', 'is_primary' => true],
            ['commune' => 'Las Condes', 'city' => 'Santiago', 'is_primary' => true],
        ]))->assertCreated();

        $this->assertDatabaseHas('client_addresses', ['commune' => 'Providencia', 'is_primary' => false]);
        $this->assertDatabaseHas('client_addresses', ['commune' => 'Las Condes', 'is_primary' => true]);
    }

    public function test_rebaixamento_deixa_rastro_em_audits(): void
    {
        $this->actingAsAdmin();

        $this->postJson('/api/clients', $this->payload([
            ['commune' => 'Providencia', 'city' => 'Santiago', 'is_primary' => true],
            ['commune' => 'Las Condes', 'city' => 'Santiago', 'is_primary' => true],
        ]))->assertCreated();

        $rebaixado = Client::firstOrFail()->addresses()->where('commune', 'Providencia')->firstOrFail();

        $this->assertDatabaseHas('audits', [
            'auditable_type' => 'client_address',
            'auditable_id' => $rebaixado->id,
            'event' => 'updated',
        ]);
    }

    public function test_update_com_um_principal_nao_mexe_em_ninguem(): void
    {
        $this->actingAsAdmin();

        $id = $this->postJson('/api/clients', $this->payload([
            ['commune' => 'Providencia', 'city' => 'Santiago', 'is_primary' => true],
        ]))->assertCreated()->json('id');

        $this->putJson("/api/clients/{$id}", $this->payload([
            ['commune' => 'Providencia', 'city' => 'Santiago', 'is_primary' => true],
            ['commune' => 'Ñuñoa', 'city' => 'Santiago'],
        ]))->assertOk();

        $this->assertDatabaseHas('client_addresses', ['commune' => 'Providencia', 'is_primary' => true]);
        $this->assertDatabaseHas('client_addresses', ['commune' => 'Ñuñoa', 'is_primary' => false]);
    }

    /**
     * A rota nested de endereço (`ClientAddressController`) já existia antes
     * deste serviço (`5bc1d87`) — sem passar por `PrimaryAddressService`, um
     * POST aqui deixava dois endereços principais. Achado no review do bloco.
     */
    public function test_rota_nested_marcar_novo_principal_desmarca_o_anterior(): void
    {
        $this->actingAsAdmin();
        $client = $this->makeClientWithUser(['legal_name' => 'ACME Ltda']);
        $client->addresses()->create(['commune' => 'Providencia', 'city' => 'Santiago', 'is_primary' => true]);

        $this->postJson("/api/clients/{$client->id}/addresses", [
            'commune' => 'Las Condes', 'city' => 'Santiago', 'is_primary' => true,
        ])->assertCreated();

        $this->assertDatabaseHas('client_addresses', ['commune' => 'Providencia', 'is_primary' => false]);
        $this->assertDatabaseHas('client_addresses', ['commune' => 'Las Condes', 'is_primary' => true]);
    }

    public function test_rota_nested_update_marcando_principal_desmarca_o_anterior(): void
    {
        $this->actingAsAdmin();
        $client = $this->makeClientWithUser(['legal_name' => 'ACME Ltda']);
        $client->addresses()->create(['commune' => 'Providencia', 'city' => 'Santiago', 'is_primary' => true]);
        $b = $client->addresses()->create(['commune' => 'Las Condes', 'city' => 'Santiago', 'is_primary' => false]);

        $this->putJson("/api/addresses/{$b->id}", [
            'commune' => 'Las Condes', 'is_primary' => true,
        ])->assertOk();

        $this->assertDatabaseHas('client_addresses', ['commune' => 'Providencia', 'is_primary' => false]);
        $this->assertDatabaseHas('client_addresses', ['commune' => 'Las Condes', 'is_primary' => true]);
    }

    public function test_rota_nested_update_desmarcando_o_principal_nao_promove_ninguem(): void
    {
        $this->actingAsAdmin();
        $client = $this->makeClientWithUser(['legal_name' => 'ACME Ltda']);
        $client->addresses()->create(['commune' => 'Providencia', 'city' => 'Santiago', 'is_primary' => true]);
        $a = $client->addresses()->firstOrFail();

        $this->putJson("/api/addresses/{$a->id}", [
            'commune' => 'Providencia', 'is_primary' => false,
        ])->assertOk();

        $this->assertSame(0, ClientAddress::where('client_id', $client->id)
            ->where('is_primary', true)
            ->count());
    }

    /**
     * A (id menor, não principal) e B (id maior, principal). Promover A
     * explicitamente tem que prevalecer sobre o "último por id" (que seria
     * B) — senão o serviço desmarcaria o endereço que o caller acabou de
     * pedir para promover.
     */
    public function test_rota_nested_update_promove_a_via_winner_mesmo_b_tendo_id_maior(): void
    {
        $this->actingAsAdmin();
        $client = $this->makeClientWithUser(['legal_name' => 'ACME Ltda']);
        $a = $client->addresses()->create(['commune' => 'Providencia', 'city' => 'Santiago', 'is_primary' => false]);
        $b = $client->addresses()->create(['commune' => 'Las Condes', 'city' => 'Santiago', 'is_primary' => true]);

        $this->putJson("/api/addresses/{$a->id}", [
            'commune' => 'Providencia', 'is_primary' => true,
        ])->assertOk();

        $this->assertDatabaseHas('client_addresses', ['id' => $a->id, 'is_primary' => true]);
        $this->assertDatabaseHas('client_addresses', ['id' => $b->id, 'is_primary' => false]);
    }

    public function test_rota_nested_endereco_novo_nao_principal_nao_mexe_no_anterior(): void
    {
        $this->actingAsAdmin();
        $client = $this->makeClientWithUser(['legal_name' => 'ACME Ltda']);
        $client->addresses()->create(['commune' => 'Providencia', 'city' => 'Santiago', 'is_primary' => true]);

        $this->postJson("/api/clients/{$client->id}/addresses", [
            'commune' => 'Las Condes', 'city' => 'Santiago', 'is_primary' => false,
        ])->assertCreated();

        $this->assertDatabaseHas('client_addresses', ['commune' => 'Providencia', 'is_primary' => true]);
        $this->assertDatabaseHas('client_addresses', ['commune' => 'Las Condes', 'is_primary' => false]);
    }
}
