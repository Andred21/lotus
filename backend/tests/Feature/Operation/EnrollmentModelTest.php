<?php

namespace Tests\Feature\Operation;

use App\Domains\Commercial\Models\Budget;
use App\Domains\Commercial\Models\Quote;
use App\Domains\Identity\Models\Student;
use App\Domains\Identity\Models\User;
use App\Domains\Operation\Enums\EnrollmentApprovalStatus;
use App\Domains\Operation\Enums\TurmaModalidade;
use App\Domains\Operation\Enums\TurmaStatus;
use App\Domains\Operation\Models\Enrollment;
use App\Domains\Operation\Models\Turma;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\CreatesDomainRecords;
use Tests\TestCase;

class EnrollmentModelTest extends TestCase
{
    use CreatesDomainRecords;
    use RefreshDatabase;

    private Turma $turma;

    private Student $student;

    protected function setUp(): void
    {
        parent::setUp();
        $clientId = $this->makeClientWithUser()->id;
        $budget = Budget::create(['client_id' => $clientId, 'code' => 'Scap 1']);
        $course = $this->makeCourse();
        $quote = Quote::create([
            'budget_id' => $budget->id, 'course_id' => $course->id, 'seq_in_budget' => 1,
            'student_count' => 5, 'value_uf' => 10, 'status' => 'approved',
        ]);
        $this->turma = Turma::create([
            'quote_id' => $quote->id, 'course_id' => $course->id,
            'modalidade' => TurmaModalidade::Online, 'local_aplicacao' => null,
            'start_date' => '2026-08-01', 'end_date' => '2026-08-10',
            'status' => TurmaStatus::EmAndamento,
        ]);
        $this->student = Student::create([
            'user_id' => User::factory()->create(['type' => 'aluno', 'is_active' => false])->id,
        ]);
    }

    public function test_matricula_nasce_pendiente_e_relaciona(): void
    {
        $e = Enrollment::create(['turma_id' => $this->turma->id, 'student_id' => $this->student->id]);

        $this->assertSame(EnrollmentApprovalStatus::Pendiente, $e->approval_status);
        $this->assertNull($e->grades);
        $this->assertSame($this->student->id, $e->student->id);
        $this->assertSame(1, $this->turma->enrollments()->count());
    }

    public function test_unique_turma_student_rejeita_duplicata_no_banco(): void
    {
        Enrollment::create(['turma_id' => $this->turma->id, 'student_id' => $this->student->id]);

        $this->expectException(QueryException::class);
        // insert direto: prova o MECANISMO de banco, não a regra de aplicação
        Enrollment::query()->getQuery()->insert([
            'turma_id' => $this->turma->id, 'student_id' => $this->student->id,
            'created_at' => now(), 'updated_at' => now(),
        ]);
    }
}
