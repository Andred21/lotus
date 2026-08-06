<?php

namespace Tests\Feature\Certification;

use App\Domains\Catalog\Models\Course;
use App\Domains\Catalog\Models\CourseCertificateTemplate;
use App\Domains\Certification\Enums\CertificateStatus;
use App\Domains\Certification\Models\Certificate;
use App\Domains\Commercial\Models\Budget;
use App\Domains\Commercial\Models\Quote;
use App\Domains\Identity\Models\Redator;
use App\Domains\Identity\Models\Student;
use App\Domains\Identity\Models\User;
use App\Domains\Operation\Enums\EnrollmentApprovalStatus;
use App\Domains\Operation\Enums\TurmaModalidade;
use App\Domains\Operation\Enums\TurmaStatus;
use App\Domains\Operation\Models\Enrollment;
use App\Domains\Operation\Models\Turma;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;
use Tests\Support\CreatesDomainRecords;
use Tests\TestCase;

class IssueCertificateTest extends TestCase
{
    use CreatesDomainRecords;
    use RefreshDatabase;

    private Course $course;

    private Turma $turma;

    private Enrollment $enrollment;

    private Redator $redator;

    protected function setUp(): void
    {
        parent::setUp();

        Carbon::setTestNow('2026-08-05 14:30:00');

        $client = $this->makeClientWithUser(
            ['legal_name' => 'Empresa Legal SpA'],
            ['name' => 'Empresa Cliente', 'rut' => '76.123.456-7'],
        );
        $budget = Budget::create(['client_id' => $client->id, 'code' => 'Scap 1']);
        $this->course = $this->makeCourse([
            'name' => 'Seguridad en Alta Tensión',
            'technical_name' => 'Operación Segura AT',
            'workload_hours' => 16,
        ]);
        $quote = Quote::create([
            'budget_id' => $budget->id,
            'course_id' => $this->course->id,
            'seq_in_budget' => 1,
            'student_count' => 1,
            'value_uf' => 10,
            'status' => 'approved',
        ]);
        $this->turma = Turma::create([
            'quote_id' => $quote->id,
            'course_id' => $this->course->id,
            'modalidade' => TurmaModalidade::Online,
            'local_aplicacao' => null,
            'start_date' => '2026-07-20',
            'end_date' => '2026-07-24',
            'status' => TurmaStatus::Concluida,
        ]);

        $student = Student::create([
            'user_id' => User::factory()->aluno()->create([
                'name' => 'Juan Pérez',
                'rut' => '12.345.678-5',
            ])->id,
            'current_client_id' => $client->id,
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
        $this->turma->redatores()->attach($this->redator);
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();

        parent::tearDown();
    }

    public function test_admin_emite_certificado_com_codigo_e_snapshot_do_servidor(): void
    {
        $this->actingAsAdmin();
        $this->createTemplate(['validity_months' => null]);

        $this->postJson($this->issueUrl(), [
            'redator_id' => $this->redator->id,
            'snapshot' => ['aluno' => ['name' => 'Dado controlado pelo cliente']],
        ])
            ->assertCreated()
            ->assertJsonPath('codigo', 'LOT-2026-1000')
            ->assertJsonPath('status', 'emitido')
            ->assertJsonPath('valido_ate', null)
            ->assertJsonPath('snapshot.aluno.name', 'Juan Pérez')
            ->assertJsonPath('snapshot.curso.name', 'Seguridad en Alta Tensión')
            ->assertJsonPath('snapshot.cliente.rut', '76.123.456-7')
            ->assertJsonPath('snapshot.redator.name', 'María Relatora')
            ->assertJsonPath('snapshot.template.version', 1)
            ->assertJsonPath('snapshot.template.layout_config.city', 'Santiago')
            ->assertJsonPath('snapshot.ciudad_emision', 'Santiago')
            ->assertJsonPath('snapshot.resultado.grades.final', 6.2)
            ->assertJsonPath('snapshot.resultado.approval_status', 'aprobado')
            ->assertJsonPath('snapshot.emitido_em', '2026-08-05');

        $certificate = Certificate::query()->sole();

        $this->assertSame('Juan Pérez', $certificate->snapshot['aluno']['name']);
        $this->assertSame($this->enrollment->id, $certificate->enrollment_id);
        $this->assertSame($this->course->id, $certificate->course_id);
        $this->assertSame($this->redator->id, $certificate->redator_id);
    }

    public function test_turma_em_andamento_retorna_422_com_rn08(): void
    {
        $this->actingAsAdmin();
        $this->turma->update(['status' => TurmaStatus::EmAndamento]);

        $this->postJson($this->issueUrl(), $this->validPayload())
            ->assertUnprocessable()
            ->assertJsonPath(
                'errors.turma.0',
                'La clase aún no fue concluida: no se puede emitir el certificado (RN-08).',
            );
    }

    public function test_aluno_reprovado_retorna_422(): void
    {
        $this->actingAsAdmin();
        $this->enrollment->update(['approval_status' => EnrollmentApprovalStatus::Reprobado]);

        $this->postJson($this->issueUrl(), $this->validPayload())
            ->assertUnprocessable()
            ->assertJsonPath(
                'errors.enrollment.0',
                'El alumno no fue aprobado: no se puede emitir el certificado.',
            );
    }

    public function test_certificado_vigente_retorna_422_legivel_e_indice_recusa_bypass(): void
    {
        $this->actingAsAdmin();
        $this->createCertificate();

        $this->postJson($this->issueUrl(), $this->validPayload())
            ->assertUnprocessable()
            ->assertJsonPath(
                'errors.enrollment.0',
                'Ya existe un certificado vigente para esta matrícula.',
            );

        $this->expectException(QueryException::class);

        Certificate::query()->getQuery()->insert([
            'uuid' => (string) Str::uuid(),
            'enrollment_id' => $this->enrollment->id,
            'course_id' => $this->course->id,
            'redator_id' => $this->redator->id,
            'codigo' => 'LOT-2026-1001',
            'snapshot' => json_encode(['aluno' => ['name' => 'Juan']], JSON_THROW_ON_ERROR),
            'valido_ate' => null,
            'status' => CertificateStatus::Emitido->value,
            'revoked_at' => null,
            'revocation_reason' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function test_redator_de_outra_turma_retorna_422(): void
    {
        $this->actingAsAdmin();
        $this->createTemplate();
        $otherRedator = Redator::create([
            'user_id' => User::factory()->redator()->create()->id,
        ]);

        $this->postJson($this->issueUrl(), ['redator_id' => $otherRedator->id])
            ->assertUnprocessable()
            ->assertJsonPath(
                'errors.redator_id.0',
                'El redactor no está designado en esta clase.',
            );
    }

    public function test_usuario_sem_permissao_retorna_403(): void
    {
        $this->seed(RolePermissionSeeder::class);
        $user = User::factory()->redator()->create(['is_active' => true]);
        $user->assignRole('redator');
        $this->actingAs($user, 'web');

        $this->postJson($this->issueUrl(), $this->validPayload())->assertForbidden();
    }

    public function test_template_mais_recente_com_validade_define_valido_ate(): void
    {
        $this->actingAsAdmin();
        $this->createTemplate(['version' => 1, 'validity_months' => 3]);
        $this->createTemplate(['version' => 2, 'validity_months' => 12]);
        $deletedTemplate = $this->createTemplate(['version' => 3, 'validity_months' => 24]);
        $deletedTemplate->delete();

        $this->postJson($this->issueUrl(), $this->validPayload())
            ->assertCreated()
            ->assertJsonPath('valido_ate', '2027-08-05');

        $certificate = Certificate::query()->sole();

        $this->assertSame($this->enrollment->id, $certificate->enrollment_id);
        $this->assertSame('2027-08-05', $certificate->valido_ate?->toDateString());
    }

    public function test_sem_template_retorna_422(): void
    {
        $this->actingAsAdmin();

        $this->postJson($this->issueUrl(), $this->validPayload())
            ->assertUnprocessable()
            ->assertJsonPath(
                'errors.template.0',
                'El curso no tiene una plantilla de certificado aprobada.',
            );

        $this->assertDatabaseCount('certificates', 0);
    }

    public function test_template_sem_validade_emite_com_valido_ate_nulo(): void
    {
        $this->actingAsAdmin();
        $this->createTemplate(['validity_months' => null]);

        $this->postJson($this->issueUrl(), $this->validPayload())
            ->assertCreated()
            ->assertJsonPath('valido_ate', null);

        $this->assertNull(Certificate::query()->sole()->valido_ate);
    }

    public function test_turma_online_com_template_sem_city_retorna_422(): void
    {
        $this->actingAsAdmin();
        $this->createTemplate(['layout_config' => ['orientation' => 'landscape']]);

        $this->assertInvalidTemplateCity();
    }

    public function test_turma_online_com_city_nula_no_template_retorna_422(): void
    {
        $this->actingAsAdmin();
        $this->createTemplate(['layout_config' => ['city' => null]]);

        $this->assertInvalidTemplateCity();
    }

    public function test_turma_online_com_city_vazia_no_template_retorna_422(): void
    {
        $this->actingAsAdmin();
        $this->createTemplate(['layout_config' => ['city' => '']]);

        $this->assertInvalidTemplateCity();
    }

    /** @return array{redator_id: int} */
    private function validPayload(): array
    {
        return ['redator_id' => $this->redator->id];
    }

    private function issueUrl(): string
    {
        return "/api/enrollments/{$this->enrollment->id}/certificate";
    }

    private function assertInvalidTemplateCity(): void
    {
        $this->postJson($this->issueUrl(), $this->validPayload())
            ->assertUnprocessable()
            ->assertJsonPath(
                'errors.template.0',
                'La plantilla del curso no define una ciudad de emisión válida.',
            );

        $this->assertDatabaseCount('certificates', 0);
    }

    private function createTemplate(array $overrides = []): CourseCertificateTemplate
    {
        return CourseCertificateTemplate::create([
            'course_id' => $this->course->id,
            'version' => 1,
            'layout_config' => ['city' => 'Santiago'],
            'validity_months' => null,
            ...$overrides,
        ]);
    }

    private function createCertificate(): Certificate
    {
        return Certificate::create([
            'uuid' => (string) Str::uuid(),
            'enrollment_id' => $this->enrollment->id,
            'course_id' => $this->course->id,
            'redator_id' => $this->redator->id,
            'codigo' => 'LOT-2026-0999',
            'snapshot' => ['aluno' => ['name' => 'Juan Pérez']],
            'valido_ate' => null,
            'status' => CertificateStatus::Emitido,
            'revoked_at' => null,
            'revocation_reason' => null,
        ]);
    }
}
