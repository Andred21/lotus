<?php

namespace Tests\Feature\Comercial;

use App\Domains\Catalog\Models\Course;
use App\Domains\Commercial\Models\Budget;
use App\Domains\Commercial\Models\Quote;
use App\Domains\Identity\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class QuoteApprovalTest extends TestCase
{
    use RefreshDatabase;

    private function quote(string $status = 'pending'): Quote
    {
        $clientId = User::factory()->create(['type' => 'cliente', 'is_active' => false])
            ->client()->create(['legal_name' => 'ACME', 'type' => 'client'])->id;
        $budgetId = Budget::create(['client_id' => $clientId, 'code' => 'Scap 1'])->id;
        $courseId = Course::create(['name' => 'C', 'workload_hours' => 8])->id;

        return Quote::create([
            'budget_id' => $budgetId, 'course_id' => $courseId, 'seq_in_budget' => 1,
            'student_count' => 5, 'value_uf' => 10, 'status' => $status,
        ]);
    }

    public function test_superadmin_aprova_e_budget_deriva_aprovado(): void
    {
        $this->actingAsSuperadmin();
        $quote = $this->quote();

        $this->postJson("/api/quotes/{$quote->id}/approve")
            ->assertOk()->assertJsonPath('status', 'approved');

        $this->assertNotNull($quote->fresh()->approved_at);

        // o orçamento agora deriva 'approved'
        $this->getJson("/api/budgets/{$quote->budget_id}")
            ->assertOk()->assertJsonPath('status', 'approved');
    }

    public function test_superadmin_recusa_todas_budget_deriva_recusado(): void
    {
        $this->actingAsSuperadmin();
        $quote = $this->quote();

        $this->postJson("/api/quotes/{$quote->id}/reject")
            ->assertOk()->assertJsonPath('status', 'rejected');

        $this->assertNull($quote->fresh()->approved_at);
        $this->getJson("/api/budgets/{$quote->budget_id}")
            ->assertOk()->assertJsonPath('status', 'rejected');
    }

    public function test_admin_nao_pode_aprovar(): void
    {
        $this->actingAsAdmin();          // admin NÃO tem commercial.quote.approve
        $quote = $this->quote();

        $this->postJson("/api/quotes/{$quote->id}/approve")->assertForbidden();
        $this->postJson("/api/quotes/{$quote->id}/reject")->assertForbidden();
    }

    public function test_admin_tenta_apagar_cotacao_aprovada_da_422_e_ela_continua_viva(): void
    {
        $quote = $this->quote('approved');
        $this->actingAsAdmin();

        $this->deleteJson("/api/quotes/{$quote->id}")
            ->assertStatus(422)
            ->assertJsonValidationErrors('status');

        $this->assertDatabaseHas('quotes', ['id' => $quote->id, 'deleted_at' => null]);
    }

    public function test_superadmin_recusa_cotacao_aprovada_e_entao_apaga(): void
    {
        $quote = $this->quote('approved');
        $this->actingAsSuperadmin();

        $this->postJson("/api/quotes/{$quote->id}/reject")->assertOk()->assertJsonPath('status', 'rejected');
        $this->deleteJson("/api/quotes/{$quote->id}")->assertNoContent();

        $this->assertSoftDeleted('quotes', ['id' => $quote->id]);
    }
}
