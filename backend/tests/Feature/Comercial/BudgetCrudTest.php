<?php

namespace Tests\Feature\Comercial;

use App\Domains\Identity\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BudgetCrudTest extends TestCase
{
    use RefreshDatabase;

    private function clientId(): int
    {
        return User::factory()->create(['type' => 'cliente', 'is_active' => false])
            ->client()->create(['legal_name' => 'ACME', 'type' => 'client'])->id;
    }

    public function test_cria_orcamento_gera_code_scap(): void
    {
        $this->actingAsAdmin();
        $clientId = $this->clientId();

        $response = $this->postJson('/api/budgets', [
            'client_id' => $clientId,
            'payment_terms' => '50% antecipado',
        ]);

        $id = $response->assertCreated()
            ->assertJsonPath('status', 'pending')       // derivado: sem cotações
            ->assertJsonPath('total_value_uf', 0)
            ->json('id');

        $this->assertSame("Scap {$id}", $response->json('code'));
        $this->assertDatabaseHas('budgets', ['id' => $id, 'code' => "Scap {$id}", 'payment_terms' => '50% antecipado']);
    }

    public function test_client_id_obrigatorio(): void
    {
        $this->actingAsAdmin();

        $this->postJson('/api/budgets', [])
            ->assertStatus(422)
            ->assertJsonValidationErrors('client_id');
    }

    public function test_lista_mostra_edita_remove(): void
    {
        $this->actingAsAdmin();
        $clientId = $this->clientId();

        $id = $this->postJson('/api/budgets', ['client_id' => $clientId])->json('id');

        $this->getJson('/api/budgets')->assertOk()->assertJsonCount(1);
        $this->getJson("/api/budgets/{$id}")->assertOk()->assertJsonPath('id', $id);

        // update: payment_terms muda; code e client_id são imutáveis MESMO se
        // o payload mandar valores forjados diferentes dos reais.
        $forgedClientId = $this->clientId();
        $this->putJson("/api/budgets/{$id}", [
            'client_id' => $forgedClientId,
            'code' => 'Scap 999',
            'payment_terms' => 'à vista',
        ])
            ->assertOk()
            ->assertJsonPath('payment_terms', 'à vista')
            ->assertJsonPath('code', "Scap {$id}")
            ->assertJsonPath('client_id', $clientId);

        $this->assertDatabaseHas('budgets', ['id' => $id, 'client_id' => $clientId, 'code' => "Scap {$id}"]);

        $this->deleteJson("/api/budgets/{$id}")->assertNoContent();
        $this->assertSoftDeleted('budgets', ['id' => $id]);
    }
}
