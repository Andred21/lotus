<?php

namespace Tests\Feature\Shared;

use App\Domains\Catalog\Models\Course;
use App\Domains\Certification\Data\CertificateData;
use App\Domains\Certification\Enums\CertificateStatus;
use App\Domains\Certification\Models\Certificate;
use App\Domains\Commercial\Data\BudgetData;
use App\Domains\Commercial\Data\ClientData;
use App\Domains\Commercial\Models\Budget;
use App\Domains\Commercial\Models\Client;
use App\Domains\Commercial\Services\BudgetSummaryService;
use App\Domains\Identity\Data\RedatorData;
use App\Domains\Identity\Data\StudentData;
use App\Domains\Identity\Data\StudentDetailData;
use App\Domains\Identity\Models\Student;
use App\Domains\Identity\Models\User;
use App\Domains\Operation\Data\EnrollmentData;
use App\Domains\Operation\Data\PendingQuoteData;
use App\Domains\Operation\Data\TurmaData;
use App\Domains\Operation\Enums\TurmaModalidade;
use App\Domains\Operation\Enums\TurmaStatus;
use App\Domains\Operation\Models\Enrollment;
use App\Domains\Operation\Models\Turma;
use App\Domains\Operation\Services\TurmaHabilitacaoService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;
use Tests\Support\CreatesDomainRecords;
use Tests\TestCase;

/**
 * Projeção de leitura sobrevive a relação soft-deletada.
 *
 * Um soft delete é arquivamento, não desaparecimento: o registro que aponta
 * para ele continua existindo e continua sendo lido. Sem `withTrashed()` na
 * relação, o `belongsTo` devolve null e a projeção estoura — a tela inteira
 * cai em 500 por causa de um registro arquivado, e o histórico com peso legal
 * some. Cada caso aqui reprovava antes da correção.
 *
 * Ref.: incidente de 2026-07-27 — o soft delete de um cliente cascateou para o
 * `User` e derrubou o módulo Comercial com "Attempt to read property name on null".
 */
class SoftDeletedRelationProjectionTest extends TestCase
{
    use CreatesDomainRecords;
    use RefreshDatabase;

    private int $rutSeq = 0;

    /** RUT único por usuário — a UserFactory não define um, e a projeção exige string. */
    private function nextRut(): string
    {
        return '1.000.'.str_pad((string) ++$this->rutSeq, 3, '0', STR_PAD_LEFT).'-0';
    }

    private function course(string $name = 'Alta Tensión'): Course
    {
        return $this->makeCourse([
            'name' => $name,
            'technical_name' => $name,
            'description' => 'x',
            'workload_hours' => 8,
        ]);
    }

    private function turma(Client $client, Course $course): Turma
    {
        $budget = Budget::create(['client_id' => $client->id, 'code' => 'PRE-1']);

        $quote = $budget->quotes()->forceCreate([
            'seq_in_budget' => 1,
            'course_id' => $course->id,
            'student_count' => 5,
            'value_uf' => 10,
            'status' => 'approved',
        ]);

        return Turma::create([
            'quote_id' => $quote->id,
            'course_id' => $course->id,
            'modalidade' => TurmaModalidade::Presencial,
            'local_aplicacao' => 'Santiago',
            'start_date' => '2026-03-01',
            'end_date' => '2026-03-05',
            'status' => TurmaStatus::EmAndamento,
        ]);
    }

    private function student(): Student
    {
        return Student::create([
            'user_id' => User::factory()->aluno()->create(['rut' => $this->nextRut()])->id,
        ]);
    }

    public function test_client_data_projeta_cliente_com_user_arquivado(): void
    {
        $client = $this->makeClientWithUser(['legal_name' => 'Enel Distribución'], ['rut' => $this->nextRut()]);
        $client->user->delete();

        $data = ClientData::fromModel($client->fresh(['user', 'addresses', 'contacts']));

        $this->assertSame('Enel Distribución', $data->legal_name);
        $this->assertNotSame('', $data->name);
    }

    public function test_budget_data_projeta_orcamento_de_cliente_arquivado(): void
    {
        $client = $this->makeClientWithUser(['legal_name' => 'Transelec'], ['rut' => $this->nextRut()]);
        $budget = Budget::create(['client_id' => $client->id, 'code' => 'PRE-9']);

        $client->delete();

        $data = BudgetData::fromModel($budget->fresh(['client', 'quotes', 'files']), app(BudgetSummaryService::class));

        $this->assertSame('PRE-9', $data->code);
    }

    public function test_redator_data_projeta_redator_com_user_arquivado(): void
    {
        $user = User::factory()->create([
            'type' => 'redator',
            'name' => 'Ana Rojas',
            'rut' => $this->nextRut(),
        ]);
        $redator = $user->redator()->create([]);
        $user->delete();

        $data = RedatorData::fromModel($redator->fresh(['user', 'courses', 'documents']));

        $this->assertSame('Ana Rojas', $data->name);
    }

    public function test_student_data_mostra_cliente_atual_mesmo_arquivado(): void
    {
        $student = $this->student();
        $client = $this->makeClientWithUser(['legal_name' => 'Colbún'], ['rut' => $this->nextRut()]);
        $student->update(['current_client_id' => $client->id]);

        $client->delete();

        $data = StudentData::fromModel($student->fresh(['user', 'currentClient']));

        $this->assertSame($client->id, $data->current_client_id);
        $this->assertSame('Colbún', $data->current_client_name);
    }

    public function test_student_detail_projeta_historico_com_cliente_arquivado(): void
    {
        $student = $this->student();
        $client = $this->makeClientWithUser(['legal_name' => 'CGE'], ['rut' => $this->nextRut()]);
        $student->logs()->create([
            'client_id' => $client->id,
            'started_on' => '2025-01-01',
        ]);

        $client->delete();

        $data = StudentDetailData::fromModel(
            $student->fresh(['user', 'currentClient', 'logs.client']),
            new Collection,
        );

        $this->assertCount(1, $data->links);
        $this->assertSame('CGE', $data->links[0]->client_name);
    }

    public function test_student_detail_projeta_turma_com_curso_arquivado(): void
    {
        $student = $this->student();
        $course = $this->course('Trabajo en Altura');
        $client = $this->makeClientWithUser(['legal_name' => 'Transelec'], ['rut' => $this->nextRut()]);
        $turma = $this->turma($client, $course);
        Enrollment::create(['turma_id' => $turma->id, 'student_id' => $student->id]);

        $course->delete();

        $data = StudentDetailData::fromModel(
            $student->fresh(['user', 'currentClient', 'logs.client', 'enrollments.turma.quote', 'enrollments.turma.course']),
            new Collection,
        );

        $this->assertCount(1, $data->turmas);
        $this->assertSame('Trabajo en Altura', $data->turmas[0]->course_name);
    }

    public function test_turma_data_projeta_turma_com_curso_e_cliente_arquivados(): void
    {
        $course = $this->course();
        $client = $this->makeClientWithUser(['legal_name' => 'Saesa'], ['rut' => $this->nextRut()]);
        $turma = $this->turma($client, $course);

        $quoteCode = $turma->quote->code;

        $course->delete();
        $client->delete();
        $turma->quote->delete();

        $data = TurmaData::fromModel(
            $turma->fresh(['quote.budget.client', 'course', 'redatores', 'documentacaoObrigatoria'])
                ->loadCount('enrollments'),
            app(TurmaHabilitacaoService::class),
        );

        $this->assertSame('Alta Tensión', $data->course_name);
        $this->assertSame('Saesa', $data->client_name);
        $this->assertSame($quoteCode, $data->quote_code);
        $this->assertSame('PRE-1', $data->budget_code);
    }

    public function test_enrollment_data_projeta_matricula_com_aluno_arquivado(): void
    {
        $student = $this->student();
        $student->user->update(['name' => 'Pedro Soto']);
        $client = $this->makeClientWithUser(['legal_name' => 'Transelec'], ['rut' => $this->nextRut()]);
        $turma = $this->turma($client, $this->course());
        $enrollment = Enrollment::create(['turma_id' => $turma->id, 'student_id' => $student->id]);

        $student->user->delete();

        $data = EnrollmentData::fromModel($enrollment->fresh(['student.user']));

        $this->assertSame('Pedro Soto', $data->name);
    }

    public function test_certificate_data_projeta_certificado_de_aluno_arquivado(): void
    {
        $student = $this->student();
        $student->user->update(['photo_path' => 'user-photos/1/foto.jpg']);
        $client = $this->makeClientWithUser(['legal_name' => 'Enel'], ['rut' => $this->nextRut()]);
        $course = $this->course();
        $turma = $this->turma($client, $course);
        $enrollment = Enrollment::create(['turma_id' => $turma->id, 'student_id' => $student->id]);
        $redator = User::factory()->create(['type' => 'redator', 'rut' => $this->nextRut()])
            ->redator()->create([]);

        $certificate = Certificate::create([
            'uuid' => (string) Str::uuid(),
            'enrollment_id' => $enrollment->id,
            'course_id' => $course->id,
            'redator_id' => $redator->id,
            'codigo' => 'LOT-2026-9000',
            'snapshot' => ['aluno' => ['name' => 'Juan Congelado'], 'curso' => ['name' => 'Alta Tensión']],
            'valido_ate' => null,
            'status' => CertificateStatus::Emitido,
        ]);

        $student->user->delete();
        $student->delete();

        $data = CertificateData::fromModel($certificate->fresh(['enrollment.student.user']));

        // O DTO carrega o PATH; a URL assinada nasce só na serialização.
        $this->assertSame('user-photos/1/foto.jpg', $data->aluno_photo_url);
        $this->assertSame('Juan Congelado', $data->snapshot->aluno->name);
    }

    public function test_pending_quote_data_projeta_cotacao_de_cliente_arquivado(): void
    {
        $client = $this->makeClientWithUser(['legal_name' => 'Frontel'], ['rut' => $this->nextRut()]);
        $course = $this->course('Rescate');
        $budget = Budget::create(['client_id' => $client->id, 'code' => 'PRE-7']);
        $quote = $budget->quotes()->forceCreate([
            'seq_in_budget' => 1,
            'course_id' => $course->id,
            'student_count' => 3,
            'value_uf' => 5,
            'status' => 'approved',
        ]);

        $client->delete();
        $course->delete();

        $data = PendingQuoteData::fromModel($quote->fresh(['budget.client', 'course']));

        $this->assertSame('Frontel', $data->client_name);
        $this->assertSame('Rescate', $data->course_name);
    }
}
