<?php

namespace Tests\Feature\Comercial;

use App\Domains\Commercial\Models\Budget;
use App\Domains\Commercial\Models\Quote;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\CreatesDomainRecords;
use Tests\TestCase;

/**
 * ADR-17: o número derivado sob lock não pode ser vencido por payload. O
 * `version` do template já era assim (`CreateCertificateTemplateAction`); o
 * `seq_in_budget` era a metade que faltava (P-35).
 */
class SeqInBudgetNotMassAssignableTest extends TestCase
{
    use CreatesDomainRecords;
    use RefreshDatabase;

    public function test_seq_in_budget_nao_e_mass_assignable(): void
    {
        $this->assertNotContains('seq_in_budget', (new Quote)->getFillable());
    }

    public function test_payload_com_seq_in_budget_nao_vence_a_derivacao(): void
    {
        $this->actingAsAdmin();

        $client = $this->makeClientWithUser();
        $budget = Budget::create(['client_id' => $client->id, 'code' => 'Scap 1']);
        $courseId = $this->makeCourse()->id;

        $this->postJson("/api/budgets/{$budget->id}/quotes", [
            'course_id' => $courseId,
            'student_count' => 5,
            'value_uf' => '10.0000',
            'seq_in_budget' => 99,
        ])->assertCreated()->assertJsonPath('seq_in_budget', 1);

        $this->postJson("/api/budgets/{$budget->id}/quotes", [
            'course_id' => $courseId,
            'student_count' => 5,
            'value_uf' => '10.0000',
        ])->assertCreated()->assertJsonPath('seq_in_budget', 2);
    }
}
