<?php

namespace Tests\Feature\Cadastros;

use App\Domains\Commercial\Models\Client;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Mesma invariante dos contatos, no endereço: no máximo 1 principal por
 * cliente, garantida na aplicação e nunca em trigger (ADR-02/ADR-08 — trigger
 * enxerga a conexão, não o usuário autenticado, e a auditoria perderia o
 * autor). Cliente SEM principal segue estado válido: ninguém é promovido.
 */
class PrimaryAddressTest extends TestCase
{
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
}
