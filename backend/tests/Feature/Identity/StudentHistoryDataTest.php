<?php

namespace Tests\Feature\Identity;

use App\Domains\Commercial\Models\Budget;
use App\Domains\Commercial\Models\Quote;
use App\Domains\Identity\Data\StudentClientLogData;
use App\Domains\Identity\Data\StudentTurmaData;
use App\Domains\Identity\Models\Student;
use App\Domains\Identity\Models\User;
use App\Domains\Operation\Enums\EnrollmentApprovalStatus;
use App\Domains\Operation\Enums\TurmaModalidade;
use App\Domains\Operation\Enums\TurmaStatus;
use App\Domains\Operation\Models\Enrollment;
use App\Domains\Operation\Models\Turma;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\CreatesDomainRecords;
use Tests\TestCase;

class StudentHistoryDataTest extends TestCase
{
    use CreatesDomainRecords;
    use RefreshDatabase;

    private function student(): Student
    {
        return Student::create([
            'user_id' => User::factory()->aluno()->create()->id,
        ]);
    }

    public function test_log_data_achata_o_nome_do_cliente_e_o_periodo(): void
    {
        $student = $this->student();
        $client = $this->makeClientWithUser(['legal_name' => 'Transelec']);

        $log = $student->logs()->create([
            'client_id' => $client->id,
            'started_on' => '2024-01-15',
            'ended_on' => '2025-02-28',
        ]);

        $data = StudentClientLogData::fromModel($log->fresh('client'));

        $this->assertSame($client->id, $data->client_id);
        $this->assertSame('Transelec', $data->client_name);
        $this->assertSame('2024-01-15', $data->started_on);
        $this->assertSame('2025-02-28', $data->ended_on);
    }

    public function test_log_data_mantem_vinculo_aberto_com_ended_on_nulo(): void
    {
        $student = $this->student();
        $client = $this->makeClientWithUser(['legal_name' => 'Enel Distribución']);

        $log = $student->logs()->create([
            'client_id' => $client->id,
            'started_on' => '2025-03-01',
            'ended_on' => null,
        ]);

        $this->assertNull(StudentClientLogData::fromModel($log->fresh('client'))->ended_on);
    }

    public function test_turma_data_projeta_matricula_com_codigo_da_cotacao(): void
    {
        $student = $this->student();
        $client = $this->makeClientWithUser(['legal_name' => 'Subestación Norte S.A.']);
        $budget = Budget::create(['client_id' => $client->id, 'code' => 'Scap 9']);
        $course = $this->makeCourse(['name' => 'Trabajos en líneas energizadas 220kV', 'workload_hours' => 40]);
        $quote = Quote::forceCreate([
            'budget_id' => $budget->id, 'course_id' => $course->id, 'seq_in_budget' => 1,
            'student_count' => 5, 'value_uf' => 10, 'status' => 'approved',
        ]);
        $turma = Turma::create([
            'quote_id' => $quote->id, 'course_id' => $course->id,
            'modalidade' => TurmaModalidade::Presencial, 'local_aplicacao' => 'Santiago',
            'start_date' => '2026-06-01', 'end_date' => '2026-06-10',
            'status' => TurmaStatus::EmAndamento,
        ]);
        $enrollment = Enrollment::create([
            'turma_id' => $turma->id,
            'student_id' => $student->id,
            'approval_status' => 'aprobado',
        ]);

        $data = StudentTurmaData::fromModel($enrollment->fresh(['turma.quote', 'turma.course']), null);

        $this->assertSame($turma->id, $data->turma_id);
        $this->assertSame($quote->fresh()->code, $data->quote_code);
        $this->assertSame('Trabajos en líneas energizadas 220kV', $data->course_name);
        $this->assertSame('2026-06-01', $data->start_date);
        $this->assertSame(EnrollmentApprovalStatus::Aprobado, $data->approval_status);
        $this->assertNull($data->certificate);
        $this->assertSame(0, $data->superseded_count);
    }

    public function test_student_navega_para_as_proprias_matriculas(): void
    {
        $student = $this->student();
        $client = $this->makeClientWithUser();
        $budget = Budget::create(['client_id' => $client->id, 'code' => 'Scap 10']);
        $course = $this->makeCourse();
        $quote = Quote::forceCreate([
            'budget_id' => $budget->id, 'course_id' => $course->id, 'seq_in_budget' => 1,
            'student_count' => 5, 'value_uf' => 10, 'status' => 'approved',
        ]);
        $turma = Turma::create([
            'quote_id' => $quote->id, 'course_id' => $course->id,
            'modalidade' => TurmaModalidade::Online, 'local_aplicacao' => null,
            'start_date' => '2026-08-01', 'end_date' => '2026-08-10',
            'status' => TurmaStatus::EmAndamento,
        ]);
        Enrollment::create(['turma_id' => $turma->id, 'student_id' => $student->id]);

        $this->assertCount(1, $student->fresh()->enrollments);
    }
}
