<?php

namespace Tests\Feature\Comercial;

use App\Domains\Catalog\Models\Course;
use App\Domains\Commercial\Models\Budget;
use App\Domains\Commercial\Models\Quote;
use App\Domains\Identity\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class QuoteCrudTest extends TestCase
{
    use RefreshDatabase;

    private int $budgetId;
    private int $courseId;

    private function setUpBudget(): void
    {
        $clientId = User::factory()->create(['type' => 'cliente', 'is_active' => false])
            ->client()->create(['legal_name' => 'ACME', 'type' => 'client'])->id;
        $this->budgetId = Budget::create(['client_id' => $clientId, 'code' => 'Scap 1'])->id;
        $this->courseId = Course::create(['name' => 'C', 'workload_hours' => 8])->id;
    }

    private function payload(): array
    {
        return ['course_id' => $this->courseId, 'student_count' => 12, 'value_uf' => 80.5, 'purchase_order' => 'OC-1'];
    }

    public function test_cria_cotacao_seq_atomico(): void
    {
        $this->actingAsAdmin();
        $this->setUpBudget();

        $r1 = $this->postJson("/api/budgets/{$this->budgetId}/quotes", $this->payload());
        $r1->assertCreated()->assertJsonPath('seq_in_budget', 1)->assertJsonPath('status', 'pending');

        $r2 = $this->postJson("/api/budgets/{$this->budgetId}/quotes", $this->payload());
        $r2->assertCreated()->assertJsonPath('seq_in_budget', 2)
            ->assertJsonPath('code', "Scap {$this->budgetId} - Cot 2");

        $this->assertDatabaseHas('quotes', ['budget_id' => $this->budgetId, 'seq_in_budget' => 1]);
        $this->assertDatabaseHas('quotes', ['budget_id' => $this->budgetId, 'seq_in_budget' => 2]);
    }

    public function test_course_id_obrigatorio(): void
    {
        $this->actingAsAdmin();
        $this->setUpBudget();

        $this->postJson("/api/budgets/{$this->budgetId}/quotes", ['student_count' => 1, 'value_uf' => 1])
            ->assertStatus(422)->assertJsonValidationErrors('course_id');
    }

    public function test_update_reabre_rejected_para_pending(): void
    {
        $this->actingAsAdmin();
        $this->setUpBudget();
        $quote = Quote::create([
            'budget_id' => $this->budgetId, 'course_id' => $this->courseId, 'seq_in_budget' => 1,
            'student_count' => 5, 'value_uf' => 10, 'status' => 'rejected',
        ]);

        $this->putJson("/api/quotes/{$quote->id}", $this->payload())
            ->assertOk()->assertJsonPath('status', 'pending')->assertJsonPath('student_count', 12);
    }

    public function test_update_de_cotacao_aprovada_bloqueado(): void
    {
        $this->actingAsAdmin();
        $this->setUpBudget();
        $quote = Quote::create([
            'budget_id' => $this->budgetId, 'course_id' => $this->courseId, 'seq_in_budget' => 1,
            'student_count' => 5, 'value_uf' => 10, 'status' => 'approved',
        ]);

        $this->putJson("/api/quotes/{$quote->id}", $this->payload())
            ->assertStatus(422)->assertJsonValidationErrors('status');
    }

    public function test_lista_nested_e_remove(): void
    {
        $this->actingAsAdmin();
        $this->setUpBudget();
        $id = $this->postJson("/api/budgets/{$this->budgetId}/quotes", $this->payload())->json('id');

        $this->getJson("/api/budgets/{$this->budgetId}/quotes")->assertOk()->assertJsonCount(1);
        $this->deleteJson("/api/quotes/{$id}")->assertNoContent();
        $this->assertSoftDeleted('quotes', ['id' => $id]);
    }
}
