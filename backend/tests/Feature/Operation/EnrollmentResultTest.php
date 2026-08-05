<?php

namespace Tests\Feature\Operation;

use App\Domains\Commercial\Models\Budget;
use App\Domains\Commercial\Models\Quote;
use App\Domains\Identity\Models\User;
use App\Domains\Operation\Actions\EnrollStudentAction;
use App\Domains\Operation\Enums\EnrollmentApprovalStatus;
use App\Domains\Operation\Enums\TurmaModalidade;
use App\Domains\Operation\Enums\TurmaStatus;
use App\Domains\Operation\Models\Enrollment;
use App\Domains\Operation\Models\Turma;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\CreatesDomainRecords;
use Tests\TestCase;

class EnrollmentResultTest extends TestCase
{
    use CreatesDomainRecords;
    use RefreshDatabase;

    private Enrollment $enrollment;

    private Turma $turma;

    protected function setUp(): void
    {
        parent::setUp();

        $client = $this->makeClientWithUser();
        $budget = Budget::create(['client_id' => $client->id, 'code' => 'Scap 1']);
        $course = $this->makeCourse();
        $quote = Quote::create([
            'budget_id' => $budget->id,
            'course_id' => $course->id,
            'seq_in_budget' => 1,
            'student_count' => 5,
            'value_uf' => 10,
            'status' => 'approved',
        ]);
        $this->turma = Turma::create([
            'quote_id' => $quote->id,
            'course_id' => $course->id,
            'modalidade' => TurmaModalidade::Online,
            'local_aplicacao' => null,
            'start_date' => '2026-08-01',
            'end_date' => '2026-08-10',
            'status' => TurmaStatus::EmAndamento,
        ]);
        $this->enrollment = app(EnrollStudentAction::class)->execute(
            $this->turma,
            '11.111.111-1',
            'Juan Soto',
            'juan@acme.cl',
            null,
        )->enrollment;
    }

    public function test_admin_registra_resultado_academico(): void
    {
        $this->actingAsAdmin();

        $this->putJson($this->resultUrl(), [
            'grades' => ['final' => 6.5],
            'attendance_pct' => '92.50',
            'approval_status' => 'aprobado',
        ])
            ->assertOk()
            ->assertJsonPath('grades.final', 6.5)
            ->assertJsonPath('attendance_pct', '92.50')
            ->assertJsonPath('approval_status', 'aprobado');

        $fresh = $this->enrollment->fresh();
        $this->assertSame(['final' => 6.5], $fresh->grades);
        $this->assertSame('92.50', $fresh->attendance_pct);
        $this->assertSame(EnrollmentApprovalStatus::Aprobado, $fresh->approval_status);
    }

    public function test_turma_concluida_recusa_resultado_com_rn15(): void
    {
        $this->actingAsAdmin();
        $this->turma->update(['status' => TurmaStatus::Concluida]);

        $this->putJson($this->resultUrl(), $this->validPayload())
            ->assertUnprocessable()
            ->assertJsonPath(
                'errors.turma.0',
                'La clase ya fue concluida: el registro académico está bloqueado (RN-15).',
            );
    }

    public function test_presenca_fora_do_intervalo_recusa(): void
    {
        $this->actingAsAdmin();

        $this->putJson($this->resultUrl(), [
            ...$this->validPayload(),
            'attendance_pct' => '100.01',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('attendance_pct');
    }

    public function test_status_de_aprovacao_fora_do_enum_recusa(): void
    {
        $this->actingAsAdmin();

        $this->putJson($this->resultUrl(), [
            ...$this->validPayload(),
            'approval_status' => 'dispensado',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('approval_status');
    }

    public function test_matricula_de_outra_turma_retorna_404(): void
    {
        $this->actingAsAdmin();

        $otherQuote = Quote::create([
            'budget_id' => $this->turma->quote->budget_id,
            'course_id' => $this->turma->course_id,
            'seq_in_budget' => 2,
            'student_count' => 5,
            'value_uf' => 10,
            'status' => 'approved',
        ]);
        $otherTurma = Turma::create([
            'quote_id' => $otherQuote->id,
            'course_id' => $this->turma->course_id,
            'modalidade' => TurmaModalidade::Online,
            'local_aplicacao' => null,
            'start_date' => '2026-09-01',
            'end_date' => '2026-09-10',
            'status' => TurmaStatus::EmAndamento,
        ]);

        $this->putJson(
            "/api/turmas/{$otherTurma->id}/alunos/{$this->enrollment->id}/resultado",
            $this->validPayload(),
        )->assertNotFound();
    }

    public function test_usuario_sem_permissao_retorna_403(): void
    {
        $this->seed(RolePermissionSeeder::class);
        $user = User::factory()->redator()->create(['is_active' => true]);
        $user->assignRole('redator');
        $this->actingAs($user, 'web');

        $this->putJson($this->resultUrl(), $this->validPayload())->assertForbidden();
    }

    /** @return array{grades: array{final: float}, attendance_pct: string, approval_status: string} */
    private function validPayload(): array
    {
        return [
            'grades' => ['final' => 6.5],
            'attendance_pct' => '92.50',
            'approval_status' => 'aprobado',
        ];
    }

    private function resultUrl(): string
    {
        return "/api/turmas/{$this->turma->id}/alunos/{$this->enrollment->id}/resultado";
    }
}
