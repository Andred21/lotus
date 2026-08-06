<?php

namespace Tests\Feature\Certification;

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
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;
use Tests\Support\CreatesDomainRecords;
use Tests\TestCase;

class RevokeCertificateTest extends TestCase
{
    use CreatesDomainRecords;
    use RefreshDatabase;

    private Certificate $certificate;

    protected function setUp(): void
    {
        parent::setUp();

        Carbon::setTestNow('2026-08-05 14:30:00');

        $client = $this->makeClientWithUser();
        $budget = Budget::create(['client_id' => $client->id, 'code' => 'Scap 1']);
        $course = $this->makeCourse(['name' => 'Trabajo en Altura']);
        $quote = Quote::create([
            'budget_id' => $budget->id,
            'course_id' => $course->id,
            'seq_in_budget' => 1,
            'student_count' => 1,
            'value_uf' => 10,
            'status' => 'approved',
        ]);
        $turma = Turma::create([
            'quote_id' => $quote->id,
            'course_id' => $course->id,
            'modalidade' => TurmaModalidade::Presencial,
            'local_aplicacao' => 'Santiago',
            'start_date' => '2026-07-20',
            'end_date' => '2026-07-24',
            'status' => TurmaStatus::Concluida,
        ]);
        $student = Student::create([
            'user_id' => User::factory()->aluno()->create()->id,
            'current_client_id' => $client->id,
        ]);
        $enrollment = Enrollment::create([
            'turma_id' => $turma->id,
            'student_id' => $student->id,
            'approval_status' => EnrollmentApprovalStatus::Aprobado,
        ]);
        $redator = Redator::create([
            'user_id' => User::factory()->redator()->create()->id,
        ]);
        $turma->redatores()->attach($redator);

        $this->certificate = Certificate::create([
            'uuid' => (string) Str::uuid(),
            'enrollment_id' => $enrollment->id,
            'course_id' => $course->id,
            'redator_id' => $redator->id,
            'codigo' => 'LOT-2026-1000',
            'snapshot' => ['aluno' => ['name' => 'Juan Pérez']],
            'valido_ate' => null,
            'status' => CertificateStatus::Emitido,
            'revoked_at' => null,
            'revocation_reason' => null,
        ]);
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();

        parent::tearDown();
    }

    public function test_superadmin_revoga_certificado_sem_deleta_lo(): void
    {
        $this->actingAsSuperadmin();

        $this->postJson($this->revokeUrl(), ['reason' => 'Error en los datos del documento.'])
            ->assertOk()
            ->assertJsonPath('status', 'revocado')
            ->assertJsonPath('revoked_at', '2026-08-05T14:30:00.000000Z')
            ->assertJsonPath('revocation_reason', 'Error en los datos del documento.');

        $this->assertDatabaseHas('certificates', [
            'id' => $this->certificate->id,
            'status' => 'revocado',
            'revocation_reason' => 'Error en los datos del documento.',
        ]);
        $this->assertDatabaseCount('certificates', 1);
    }

    public function test_admin_comum_nao_pode_revogar(): void
    {
        $this->actingAsAdmin();

        $this->postJson($this->revokeUrl(), ['reason' => 'Intento no autorizado.'])
            ->assertForbidden();

        $this->assertSame(CertificateStatus::Emitido, $this->certificate->fresh()->status);
    }

    public function test_revogar_duas_vezes_retorna_422(): void
    {
        $this->actingAsSuperadmin();

        $this->postJson($this->revokeUrl(), ['reason' => 'Primera revocación.'])
            ->assertOk();

        $this->postJson($this->revokeUrl(), ['reason' => 'Segunda revocación.'])
            ->assertUnprocessable()
            ->assertJsonPath('errors.certificate.0', 'El certificado ya fue revocado.');
    }

    public function test_revogacao_aumenta_a_auditoria_do_certificado(): void
    {
        $this->actingAsSuperadmin();
        $before = $this->certificate->audits()->count();

        $this->postJson($this->revokeUrl(), ['reason' => 'Documento emitido con datos incorrectos.'])
            ->assertOk();

        $this->assertGreaterThan($before, $this->certificate->fresh()->audits()->count());
    }

    private function revokeUrl(): string
    {
        return "/api/certificates/{$this->certificate->id}/revoke";
    }
}
