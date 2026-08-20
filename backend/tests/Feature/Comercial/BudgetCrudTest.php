<?php

namespace Tests\Feature\Comercial;

use App\Domains\Commercial\Models\Budget;
use App\Domains\Commercial\Models\Quote;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\CreatesDomainRecords;
use Tests\TestCase;

class BudgetCrudTest extends TestCase
{
    use CreatesDomainRecords;
    use RefreshDatabase;

    public function test_cria_orcamento_gera_code_scap(): void
    {
        $this->actingAsAdmin();
        $clientId = $this->makeClientWithUser()->id;

        $response = $this->postJson('/api/budgets', [
            'client_id' => $clientId,
            'payment_terms' => '50% antecipado',
        ]);

        $id = $response->assertCreated()
            ->assertJsonPath('status', 'pending')       // derivado: sem cotações
            ->assertJsonPath('total_value_uf', '0.0000')   // string decimal, não float
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
        $clientId = $this->makeClientWithUser()->id;

        $id = $this->postJson('/api/budgets', ['client_id' => $clientId])->json('id');

        $this->getJson('/api/budgets')->assertOk()->assertJsonCount(1);
        $this->getJson("/api/budgets/{$id}")->assertOk()->assertJsonPath('id', $id);

        // update: payment_terms muda; code e client_id são imutáveis MESMO se
        // o payload mandar valores forjados diferentes dos reais.
        $forgedClientId = $this->makeClientWithUser()->id;
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

    public function test_destroy_com_cotacao_aprovada_bloqueado(): void
    {
        $this->actingAsAdmin();
        $budget = Budget::create(['client_id' => $this->makeClientWithUser()->id, 'code' => 'Scap 1']);
        Quote::forceCreate([
            'budget_id' => $budget->id,
            'course_id' => $this->makeCourse()->id,
            'seq_in_budget' => 1, 'student_count' => 5, 'value_uf' => 10, 'status' => 'approved',
        ]);

        $this->deleteJson("/api/budgets/{$budget->id}")
            ->assertStatus(422)->assertJsonValidationErrors('status');

        $this->assertDatabaseHas('budgets', ['id' => $budget->id, 'deleted_at' => null]);
    }
}
