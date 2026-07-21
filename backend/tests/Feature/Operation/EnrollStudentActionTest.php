<?php

namespace Tests\Feature\Operation;

use App\Domains\Catalog\Models\Course;
use App\Domains\Commercial\Models\Budget;
use App\Domains\Commercial\Models\Quote;
use App\Domains\Identity\Enums\StudentResolutionOutcome;
use App\Domains\Identity\Models\User;
use App\Domains\Operation\Actions\EnrollStudentAction;
use App\Domains\Operation\Enums\TurmaModalidade;
use App\Domains\Operation\Enums\TurmaStatus;
use App\Domains\Operation\Models\Enrollment;
use App\Domains\Operation\Models\Turma;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class EnrollStudentActionTest extends TestCase
{
    use RefreshDatabase;

    private Turma $turma;

    protected function setUp(): void
    {
        parent::setUp();
        $clientId = User::factory()->create(['type' => 'cliente', 'is_active' => false])
            ->client()->create(['legal_name' => 'ACME', 'type' => 'client'])->id;
        $budget = Budget::create(['client_id' => $clientId, 'code' => 'Scap 1']);
        $course = Course::create(['name' => 'AT', 'workload_hours' => 8]);
        $quote = Quote::create([
            'budget_id' => $budget->id, 'course_id' => $course->id, 'seq_in_budget' => 1,
            'student_count' => 2, 'value_uf' => 10, 'status' => 'approved',
        ]);
        $this->turma = Turma::create([
            'quote_id' => $quote->id, 'course_id' => $course->id,
            'modalidade' => TurmaModalidade::Online, 'local_aplicacao' => null,
            'start_date' => '2026-08-01', 'end_date' => '2026-08-10',
            'status' => TurmaStatus::EmAndamento,
        ]);
    }

    private function action(): EnrollStudentAction
    {
        return app(EnrollStudentAction::class);
    }

    public function test_rut_novo_cria_aluno_vinculo_e_matricula(): void
    {
        $outcome = $this->action()->execute($this->turma, '11.111.111-1', 'Juan Soto', 'juan@acme.cl', null);

        $this->assertSame(StudentResolutionOutcome::Created, $outcome->resolution->outcome);
        $this->assertFalse($outcome->alreadyEnrolled);
        $user = $outcome->resolution->student->user;
        $this->assertSame('aluno', $user->type);
        $this->assertFalse((bool) $user->is_active);
        $this->assertSame(1, $this->turma->enrollments()->count());
    }

    public function test_repetido_e_idempotente_already_enrolled(): void
    {
        $this->action()->execute($this->turma, '11.111.111-1', 'Juan Soto', 'juan@acme.cl', null);
        $outcome = $this->action()->execute($this->turma, '11.111.111-1', 'Juan Soto', null, null);

        $this->assertTrue($outcome->alreadyEnrolled);
        $this->assertSame(1, $this->turma->enrollments()->count());
    }

    public function test_turma_fora_de_andamento_recusa_422(): void
    {
        $this->turma->update(['status' => TurmaStatus::Concluida]);

        $this->expectException(ValidationException::class);
        $this->action()->execute($this->turma, '11.111.111-1', 'Juan Soto', 'juan@acme.cl', null);
    }

    public function test_rematricula_restaura_o_mesmo_registro(): void
    {
        $first = $this->action()->execute($this->turma, '11.111.111-1', 'Juan Soto', 'juan@acme.cl', null);
        $first->enrollment->delete(); // remoção (soft)

        $again = $this->action()->execute($this->turma, '11.111.111-1', 'Juan Soto', null, null);

        $this->assertSame($first->enrollment->id, $again->enrollment->id);
        $this->assertNull($again->enrollment->fresh()->deleted_at);
        $this->assertSame(1, Enrollment::withTrashed()->count()); // nunca 2º registro (unique/D7)
    }
}
