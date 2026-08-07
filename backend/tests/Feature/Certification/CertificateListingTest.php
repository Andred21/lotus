<?php

namespace Tests\Feature\Certification;

use App\Domains\Catalog\Models\Course;
use App\Domains\Catalog\Models\CourseCertificateTemplate;
use App\Domains\Certification\Enums\CertificateStatus;
use App\Domains\Certification\Models\Certificate;
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
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Database\Events\QueryExecuted;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\Support\CreatesDomainRecords;
use Tests\TestCase;

class CertificateListingTest extends TestCase
{
    use CreatesDomainRecords;
    use RefreshDatabase;

    private Client $client;

    private Budget $budget;

    private Course $course;

    private Turma $turma;

    private Enrollment $enrollment;

    private Redator $redator;

    protected function setUp(): void
    {
        parent::setUp();

        Carbon::setTestNow('2026-08-05 10:00:00');

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
        $this->turma = $this->createTurma(TurmaStatus::Concluida, 1);
        $this->enrollment = $this->createEnrollment(
            $this->turma,
            EnrollmentApprovalStatus::Aprobado,
            'Juan Pérez',
            '12.345.678-5',
        );
        $this->redator = Redator::create([
            'user_id' => User::factory()->redator()->create([
                'name' => 'María Relatora',
                'rut' => '9.876.543-3',
            ])->id,
        ]);
        $this->turma->redatores()->attach($this->redator);
        CourseCertificateTemplate::create([
            'course_id' => $this->course->id,
            'version' => 1,
            'layout_config' => ['city' => 'Santiago'],
            'validity_months' => null,
        ]);
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();

        parent::tearDown();
    }

    public function test_index_lista_certificados_por_created_at_decrescente(): void
    {
        $this->actingAsAdmin();
        $older = $this->createCertificate(CertificateStatus::Revocado, 'LOT-2026-1000');

        Carbon::setTestNow('2026-08-05 11:00:00');
        $newer = $this->createCertificate(CertificateStatus::Emitido, 'LOT-2026-1001');

        $this->getJson('/api/certificates')
            ->assertOk()
            ->assertJsonCount(2)
            ->assertJsonPath('0.id', $newer->id)
            ->assertJsonPath('1.id', $older->id);
    }

    public function test_show_devolve_o_snapshot_persistido(): void
    {
        $this->actingAsAdmin();
        $certificate = $this->createCertificate(
            CertificateStatus::Emitido,
            'LOT-2026-1000',
            ['aluno' => ['name' => 'Nombre Congelado']],
        );

        $this->getJson("/api/certificates/{$certificate->id}")
            ->assertOk()
            ->assertJsonPath('id', $certificate->id)
            ->assertJsonPath('codigo', 'LOT-2026-1000')
            ->assertJsonPath('snapshot.aluno.name', 'Nombre Congelado');
    }

    public function test_issuable_filtra_e_faz_matricula_reaparecer_depois_da_revogacao(): void
    {
        $this->actingAsSuperadmin();

        $inProgress = $this->createTurma(TurmaStatus::EmAndamento, 2);
        $this->createEnrollment(
            $inProgress,
            EnrollmentApprovalStatus::Aprobado,
            'Alumno En Curso',
            '11.111.111-1',
        );

        $withRejectedStudent = $this->createTurma(TurmaStatus::Concluida, 3);
        $this->createEnrollment(
            $withRejectedStudent,
            EnrollmentApprovalStatus::Reprobado,
            'Alumno Reprobado',
            '22.222.222-2',
        );

        $this->getJson('/api/certificates/issuable')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.turma_id', $this->turma->id)
            ->assertJsonPath('0.course_name', 'Seguridad en Alta Tensión')
            ->assertJsonPath('0.client_name', 'Empresa Legal SpA')
            ->assertJsonPath('0.end_date', '2026-07-24')
            ->assertJsonPath('0.enrollments.0.enrollment_id', $this->enrollment->id)
            ->assertJsonPath('0.enrollments.0.student_name', 'Juan Pérez')
            ->assertJsonPath('0.enrollments.0.student_rut', '12.345.678-5')
            ->assertJsonPath('0.redatores.0.redator_id', $this->redator->id)
            ->assertJsonPath('0.redatores.0.name', 'María Relatora');

        $certificateId = $this->postJson(
            "/api/enrollments/{$this->enrollment->id}/certificate",
            ['redator_id' => $this->redator->id],
        )
            ->assertCreated()
            ->json('id');

        $this->getJson('/api/certificates/issuable')
            ->assertOk()
            ->assertJsonCount(0);

        $this->postJson("/api/certificates/{$certificateId}/revoke", [
            'reason' => 'Error en los datos del documento.',
        ])->assertOk();

        $this->getJson('/api/certificates/issuable')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.enrollments.0.enrollment_id', $this->enrollment->id);
    }

    /**
     * As matrículas com certificado vigente se resolvem UMA vez por chamada. O
     * mesmo closure filtra o `whereHas` e o eager-load, e recalcular a lista
     * entre os dois não só consultava `certificates` de novo como abria a
     * janela para a turma sair na tela com `enrollments` vazio, se um
     * certificado fosse emitido no meio.
     */
    public function test_issuable_consulta_os_certificados_vigentes_uma_vez_so(): void
    {
        $this->actingAsSuperadmin();
        $consultas = 0;
        DB::listen(function (QueryExecuted $query) use (&$consultas): void {
            if (str_contains($query->sql, 'from "certificates"')) {
                $consultas++;
            }
        });

        $this->getJson('/api/certificates/issuable')->assertOk()->assertJsonCount(1);

        $this->assertSame(1, $consultas);
    }

    public function test_issuable_sem_permissao_de_emissao_retorna_403(): void
    {
        $this->seed(RolePermissionSeeder::class);
        $viewer = User::factory()->create(['type' => 'admin', 'is_active' => true]);
        $viewer->givePermissionTo('certification.certificate.view');
        $this->actingAs($viewer, 'web');

        $this->getJson('/api/certificates/issuable')->assertForbidden();
    }

    public function test_issuable_oculta_turma_cujo_curso_nao_tem_template(): void
    {
        $this->actingAsAdmin();
        $courseWithoutTemplate = $this->makeCourse(['name' => 'Curso sin plantilla']);
        $turmaWithoutTemplate = $this->createTurma(
            TurmaStatus::Concluida,
            2,
            $courseWithoutTemplate,
        );
        $this->createEnrollment(
            $turmaWithoutTemplate,
            EnrollmentApprovalStatus::Aprobado,
            'Alumno sin plantilla',
            '33.333.333-3',
        );

        $this->getJson('/api/certificates/issuable')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.turma_id', $this->turma->id)
            ->assertJsonMissing(['turma_id' => $turmaWithoutTemplate->id]);
    }

    /**
     * O `issuable` existe para a UI não re-derivar as portas da emissão
     * (D-P1). Listar uma turma que o POST recusa com 422 desfaz exatamente
     * isso: o admin clica e leva erro numa tela que prometia sucesso.
     */
    public function test_issuable_oculta_turma_online_sem_cidade_valida_no_template(): void
    {
        $this->actingAsAdmin();
        $courseOnline = $this->makeCourse(['name' => 'Curso online sin ciudad']);
        CourseCertificateTemplate::create([
            'course_id' => $courseOnline->id,
            'version' => 1,
            'layout_config' => [],
            'validity_months' => null,
        ]);
        $turmaOnline = $this->createTurma(TurmaStatus::Concluida, 2, $courseOnline);
        $turmaOnline->update([
            'modalidade' => TurmaModalidade::Online,
            'local_aplicacao' => null,
        ]);
        $turmaOnline->redatores()->attach($this->redator);
        $this->createEnrollment(
            $turmaOnline,
            EnrollmentApprovalStatus::Aprobado,
            'Alumno sin ciudad',
            '44.444.444-4',
        );

        $this->getJson('/api/certificates/issuable')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.turma_id', $this->turma->id);
    }

    public function test_issuable_oculta_turma_sem_redator_designado(): void
    {
        $this->actingAsAdmin();
        $turmaSemRedator = $this->createTurma(TurmaStatus::Concluida, 3);
        $this->createEnrollment(
            $turmaSemRedator,
            EnrollmentApprovalStatus::Aprobado,
            'Alumno sin relator',
            '55.555.555-5',
        );

        $this->getJson('/api/certificates/issuable')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.turma_id', $this->turma->id);
    }

    private function createTurma(
        TurmaStatus $status,
        int $seq,
        ?Course $course = null,
    ): Turma {
        $course ??= $this->course;
        $quote = Quote::create([
            'budget_id' => $this->budget->id,
            'course_id' => $course->id,
            'seq_in_budget' => $seq,
            'student_count' => 1,
            'value_uf' => 10,
            'status' => 'approved',
        ]);

        return Turma::create([
            'quote_id' => $quote->id,
            'course_id' => $course->id,
            'modalidade' => TurmaModalidade::Presencial,
            'local_aplicacao' => 'Santiago',
            'start_date' => '2026-07-20',
            'end_date' => '2026-07-24',
            'status' => $status,
        ]);
    }

    private function createEnrollment(
        Turma $turma,
        EnrollmentApprovalStatus $status,
        string $name,
        string $rut,
    ): Enrollment {
        $student = Student::create([
            'user_id' => User::factory()->aluno()->create([
                'name' => $name,
                'rut' => $rut,
            ])->id,
            'current_client_id' => $this->client->id,
        ]);

        return Enrollment::create([
            'turma_id' => $turma->id,
            'student_id' => $student->id,
            'grades' => ['final' => 6.2],
            'attendance_pct' => '87.50',
            'approval_status' => $status,
        ]);
    }

    /** @param array<string, mixed> $snapshot */
    private function createCertificate(
        CertificateStatus $status,
        string $codigo,
        array $snapshot = ['aluno' => ['name' => 'Juan Pérez']],
    ): Certificate {
        return Certificate::create([
            'uuid' => (string) Str::uuid(),
            'enrollment_id' => $this->enrollment->id,
            'course_id' => $this->course->id,
            'redator_id' => $this->redator->id,
            'codigo' => $codigo,
            'snapshot' => $snapshot,
            'valido_ate' => null,
            'status' => $status,
            'revoked_at' => $status === CertificateStatus::Revocado ? now() : null,
            'revocation_reason' => $status === CertificateStatus::Revocado ? 'Documento reemplazado.' : null,
        ]);
    }
}
