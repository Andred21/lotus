<?php

namespace Tests\Feature\Cadastros;

use App\Domains\Commercial\Models\ClientContact;
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
}
