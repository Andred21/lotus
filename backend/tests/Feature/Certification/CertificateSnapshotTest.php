<?php

namespace Tests\Feature\Certification;

use App\Domains\Catalog\Models\Course;
use App\Domains\Certification\Enums\CertificateStatus;
use App\Domains\Certification\Models\Certificate;
use App\Domains\Certification\Services\CertificateSnapshotBuilder;
use App\Domains\Commercial\Models\Budget;
use App\Domains\Commercial\Models\Client;
use App\Domains\Commercial\Models\Quote;
use App\Domains\Identity\Models\Redator;
use App\Domains\Identity\Models\Student;
use App\Domains\Identity\Models\User;
use App\Domains\Operation\Enums\EnrollmentApprovalStatus;
use App\Domains\Operation\Enums\TurmaModalidade;
use App\Domains\Operation\Enums\TurmaStatus;
use App\Domains\Operation\Models\Enrollment;
use App\Domains\Operation\Models\Turma;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;
use Tests\Support\CreatesDomainRecords;
use Tests\TestCase;

class CertificateSnapshotTest extends TestCase
{
    use CreatesDomainRecords;
    use RefreshDatabase;

    private Client $client;

    private Budget $budget;

    private Quote $quote;

    private Course $course;

    private Turma $turma;

    private Enrollment $enrollment;

    private Redator $redator;

    protected function setUp(): void
    {
        parent::setUp();

        Carbon::setTestNow('2026-08-05 14:30:00');

        $this->client = $this->makeClientWithUser(
            ['legal_name' => 'Empresa Legal SpA'],
            ['name' => 'Empresa Cliente', 'rut' => '76.123.456-7'],
        );
        $this->budget = Budget::create([
            'client_id' => $this->client->id,
            'code' => 'Scap 1',
        ]);
        $this->course = $this->makeCourse([
            'name' => 'Seguridad en Alta Tensión',
            'technical_name' => 'Operación Segura AT',
            'workload_hours' => 16,
        ]);
        $this->quote = Quote::create([
            'budget_id' => $this->budget->id,
            'course_id' => $this->course->id,
            'seq_in_budget' => 1,
            'student_count' => 1,
            'value_uf' => 10,
            'status' => 'approved',
        ]);
        $this->turma = Turma::create([
            'quote_id' => $this->quote->id,
            'course_id' => $this->course->id,
            'modalidade' => TurmaModalidade::Presencial,
            'local_aplicacao' => 'Santiago',
            'start_date' => '2026-07-20',
            'end_date' => '2026-07-24',
            'status' => TurmaStatus::Concluida,
        ]);

        $student = Student::create([
            'user_id' => User::factory()->aluno()->create([
                'name' => 'Juan Pérez',
                'rut' => '12.345.678-5',
            ])->id,
            'current_client_id' => $this->client->id,
        ]);
        $this->enrollment = Enrollment::create([
            'turma_id' => $this->turma->id,
            'student_id' => $student->id,
            'grades' => ['final' => 6.2],
            'attendance_pct' => '87.50',
            'approval_status' => EnrollmentApprovalStatus::Aprobado,
        ]);
        $this->redator = Redator::create([
            'user_id' => User::factory()->redator()->create([
                'name' => 'María Relatora',
                'rut' => '9.876.543-3',
            ])->id,
        ]);
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();

        parent::tearDown();
    }

    public function test_snapshot_tem_exatamente_as_chaves_e_valores_dos_models(): void
    {
        $snapshot = app(CertificateSnapshotBuilder::class)->build($this->enrollment, $this->redator);

        $this->assertSame([
            'aluno' => ['name' => 'Juan Pérez', 'rut' => '12.345.678-5'],
            'curso' => [
                'name' => 'Seguridad en Alta Tensión',
                'technical_name' => 'Operación Segura AT',
                'workload_hours' => 16,
            ],
            'turma' => [
                'id' => $this->turma->id,
                'start_date' => '2026-07-20',
                'end_date' => '2026-07-24',
                'modalidade' => 'presencial',
            ],
            'cliente' => ['name' => 'Empresa Cliente'],
            'redator' => ['name' => 'María Relatora', 'rut' => '9.876.543-3'],
            'resultado' => ['approval_status' => 'aprobado', 'attendance_pct' => '87.50'],
            'emitido_em' => '2026-08-05',
        ], $snapshot);
    }

    public function test_snapshot_persistido_nao_muda_quando_curso_e_renomeado_depois(): void
    {
        $snapshot = app(CertificateSnapshotBuilder::class)->build($this->enrollment, $this->redator);
        $certificate = Certificate::create([
            'uuid' => (string) Str::uuid(),
            'enrollment_id' => $this->enrollment->id,
            'course_id' => $this->course->id,
            'redator_id' => $this->redator->id,
            'codigo' => 'LOT-2026-1000',
            'snapshot' => $snapshot,
            'valido_ate' => null,
            'status' => CertificateStatus::Emitido,
            'revoked_at' => null,
            'revocation_reason' => null,
        ]);

        $this->course->update(['name' => 'Nombre Alterado Después']);

        $reloaded = Certificate::query()->findOrFail($certificate->id);

        $this->assertSame('Nombre Alterado Después', $this->course->fresh()->name);
        $this->assertSame('Seguridad en Alta Tensión', $reloaded->snapshot['curso']['name']);
        $this->assertSame($snapshot, $reloaded->snapshot);
    }

    public function test_datas_do_snapshot_sao_strings_em_y_m_d(): void
    {
        $snapshot = app(CertificateSnapshotBuilder::class)->build($this->enrollment, $this->redator);

        $this->assertSame('2026-07-20', $snapshot['turma']['start_date']);
        $this->assertSame('2026-07-24', $snapshot['turma']['end_date']);
        $this->assertSame('2026-08-05', $snapshot['emitido_em']);
        $this->assertIsString($snapshot['turma']['start_date']);
        $this->assertIsString($snapshot['turma']['end_date']);
        $this->assertIsString($snapshot['emitido_em']);
    }

    public function test_cliente_com_user_e_caminho_arquivados_ainda_resolve_o_nome(): void
    {
        $clientUserId = $this->client->user->id;

        $this->turma->delete();
        $this->budget->delete();
        $this->client->delete();

        $this->assertSoftDeleted('turmas', ['id' => $this->turma->id]);
        $this->assertSoftDeleted('quotes', ['id' => $this->quote->id]);
        $this->assertSoftDeleted('budgets', ['id' => $this->budget->id]);
        $this->assertSoftDeleted('clients', ['id' => $this->client->id]);
        $this->assertSoftDeleted('users', ['id' => $clientUserId]);

        $freshEnrollment = Enrollment::query()->findOrFail($this->enrollment->id);
        $snapshot = app(CertificateSnapshotBuilder::class)->build($freshEnrollment, $this->redator->fresh());

        $this->assertSame('Empresa Cliente', $snapshot['cliente']['name']);
    }
}
