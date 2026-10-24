<?php

namespace Tests\Feature\Operation;

use App\Domains\Operation\Services\ApprovalRule;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\Certification\IssuableEnrollmentBuilder;
use Tests\TestCase;

/**
 * A regra de corte (nota >= 4,0 e presença >= 70 %) tem um único dono:
 * `ApprovalRule`. A turma a expõe no contrato para o front sugerir o resultado.
 */
class ApprovalRuleTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_regra_vale_4_e_70(): void
    {
        $turma = IssuableEnrollmentBuilder::make()->turmaNaoConcluida()->create()->turmaModel();

        $rule = ApprovalRule::forTurma($turma);

        $this->assertSame(4.0, $rule->minGrade);
        $this->assertSame(70.0, $rule->minAttendancePct);
    }

    public function test_turma_data_expoe_a_regra(): void
    {
        $this->actingAsAdmin();
        $turma = IssuableEnrollmentBuilder::make()->turmaNaoConcluida()->create()->turmaModel();

        $response = $this->getJson("/api/turmas/{$turma->id}")->assertOk();

        $this->assertEquals(
            ['min_grade' => 4.0, 'min_attendance_pct' => 70.0],
            $response->json('approval_rule'),
        );
    }
}
