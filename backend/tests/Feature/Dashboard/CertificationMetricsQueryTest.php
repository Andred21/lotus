<?php

namespace Tests\Feature\Dashboard;

use App\Domains\Catalog\Models\Course;
use App\Domains\Certification\Enums\CertificateStatus;
use App\Domains\Certification\Models\Certificate;
use App\Domains\Commercial\Models\Budget;
use App\Domains\Commercial\Models\Client;
use App\Domains\Commercial\Models\Quote;
use App\Domains\Dashboard\Enums\DashboardAlertType;
use App\Domains\Dashboard\Enums\DashboardModule;
use App\Domains\Dashboard\Enums\DashboardSeverity;
use App\Domains\Dashboard\Enums\PendingItemType;
use App\Domains\Dashboard\Services\CertificationMetricsQuery;
use App\Domains\Identity\Enums\RedatorDocumentType;
use App\Domains\Identity\Models\Redator;
use App\Domains\Identity\Models\Student;
use App\Domains\Identity\Models\User;
use App\Domains\Operation\Enums\EnrollmentApprovalStatus;
use App\Domains\Operation\Enums\TurmaStatus;
use App\Domains\Operation\Models\Enrollment;
use App\Domains\Operation\Models\Turma;
use App\Shared\Files\Models\File;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class CertificationMetricsQueryTest extends TestCase
{
    use RefreshDatabase;

    private Budget $budget;

    private Course $course;

    private Client $client;

    private Redator $redator;

    private int $certificateSequence = 0;

    private int $quoteSequence = 0;

    private int $studentSequence = 0;

    protected function setUp(): void
    {
        parent::setUp();
        CarbonImmutable::setTestNow('2026-08-14 12:00:00');

        $clientUser = User::create([
            'name' => 'Cliente Certificación Dashboard',
            'rut' => '76.543.210-3',
            'email' => 'cliente-certification-dashboard@example.test',
            'password' => 'secret',
            'type' => 'cliente',
            'is_active' => false,
        ]);
        $this->client = Client::create([
            'user_id' => $clientUser->id,
            'legal_name' => 'Cliente Certificación Dashboard SpA',
            'type' => 'client',
        ]);
        $this->budget = Budget::create([
            'client_id' => $this->client->id,
            'code' => 'Scap Certificación Dashboard',
        ]);
        $this->course = Course::create([
            'name' => 'Certificación de Trabajos Eléctricos',
            'workload_hours' => 16,
        ]);

        $redatorUser = User::create([
            'name' => 'Redator Certificación Dashboard',
            'rut' => '12.345.678-5',
            'email' => 'redator-certification-dashboard@example.test',
            'password' => 'secret',
            'type' => 'redator',
            'is_active' => true,
        ]);
        $this->redator = Redator::create(['user_id' => $redatorUser->id]);
    }

    protected function tearDown(): void
    {
        CarbonImmutable::setTestNow();
        parent::tearDown();
    }

    public function test_conta_aprovados_sem_qualquer_certificado_e_nao_reabre_revogado(): void
    {
        $turma = $this->createConcludedTurma();
        $this->createEnrollment($turma, EnrollmentApprovalStatus::Aprobado);
        $revokedEnrollment = $this->createEnrollment($turma, EnrollmentApprovalStatus::Aprobado);
        $this->createEnrollment($turma, EnrollmentApprovalStatus::Reprobado);
        $this->createCertificate($revokedEnrollment, CertificateStatus::Revocado);

        $query = app(CertificationMetricsQuery::class);

        $this->assertSame(1, $query->certificadosAEmitir());
        $this->assertSame([
            [
                'module' => DashboardModule::Certification,
                'type' => PendingItemType::EnrollmentAwaitingCertificate,
                'severity' => DashboardSeverity::Normal,
                'entity_id' => $turma->id,
                'navigation' => ['turma_id' => $turma->id],
            ],
        ], $this->pendingProjection($query->pendencias()));
    }

    public function test_pendencias_agregam_uma_linha_por_turma(): void
    {
        $firstTurma = $this->createConcludedTurma();
        $this->createEnrollment($firstTurma, EnrollmentApprovalStatus::Aprobado);
        $this->createEnrollment($firstTurma, EnrollmentApprovalStatus::Aprobado);

        $secondTurma = $this->createConcludedTurma();
        $this->createEnrollment($secondTurma, EnrollmentApprovalStatus::Aprobado);

        $query = app(CertificationMetricsQuery::class);

        $this->assertSame([
            [
                'module' => DashboardModule::Certification,
                'type' => PendingItemType::EnrollmentAwaitingCertificate,
                'severity' => DashboardSeverity::Normal,
                'entity_id' => $firstTurma->id,
                'navigation' => ['turma_id' => $firstTurma->id],
            ],
            [
                'module' => DashboardModule::Certification,
                'type' => PendingItemType::EnrollmentAwaitingCertificate,
                'severity' => DashboardSeverity::Normal,
                'entity_id' => $secondTurma->id,
                'navigation' => ['turma_id' => $secondTurma->id],
            ],
        ], $this->pendingProjection($query->pendencias()));
    }

    /**
     * Documento de relator NÃO sai por aqui — é dado de Identity e responde a
     * `identity.user.view` (`IdentityMetricsQueryTest`). A asserção nomeada
     * abaixo é a que prova a separação: o documento existe no banco deste
     * cenário e não pode aparecer nesta lista.
     */
    public function test_alerta_certificados_vencidos_ou_vencendo_na_janela(): void
    {
        $turma = $this->createConcludedTurma();
        $expiredCertificate = $this->createCertificate(
            $this->createEnrollment($turma, EnrollmentApprovalStatus::Aprobado),
            CertificateStatus::Emitido,
            CarbonImmutable::today()->subDay(),
        );
        $expiringCertificate = $this->createCertificate(
            $this->createEnrollment($turma, EnrollmentApprovalStatus::Aprobado),
            CertificateStatus::Emitido,
            CarbonImmutable::today()->addDays(10),
        );
        $outsideWindowCertificate = $this->createCertificate(
            $this->createEnrollment($turma, EnrollmentApprovalStatus::Aprobado),
            CertificateStatus::Emitido,
            CarbonImmutable::today()->addDays(60),
        );
        $revokedExpiredCertificate = $this->createCertificate(
            $this->createEnrollment($turma, EnrollmentApprovalStatus::Aprobado),
            CertificateStatus::Revocado,
            CarbonImmutable::today()->subDay(),
        );

        $this->createRedatorDocument(
            RedatorDocumentType::REUF,
            CarbonImmutable::today()->subDay(),
        );

        $alerts = collect(app(CertificationMetricsQuery::class)->alertas())
            ->sortBy(fn ($alert): string => $alert->type->value)
            ->values();

        $this->assertSame([
            [
                'type' => DashboardAlertType::CertificateExpired,
                'severity' => DashboardSeverity::High,
                'entity_id' => $expiredCertificate->id,
                'date' => '2026-08-13',
            ],
            [
                'type' => DashboardAlertType::CertificateExpiringSoon,
                'severity' => DashboardSeverity::Medium,
                'entity_id' => $expiringCertificate->id,
                'date' => '2026-08-24',
            ],
        ], $alerts
            ->map(fn ($alert): array => [
                'type' => $alert->type,
                'severity' => $alert->severity,
                'entity_id' => $alert->entity_id,
                'date' => $alert->date,
            ])
            ->all());
        $this->assertFalse($alerts->contains(
            fn ($alert): bool => $alert->type === DashboardAlertType::CertificateExpiringSoon
                && $alert->entity_id === $outsideWindowCertificate->id,
        ));
        $this->assertFalse($alerts->contains(
            fn ($alert): bool => in_array($alert->type, [
                DashboardAlertType::CertificateExpired,
                DashboardAlertType::CertificateExpiringSoon,
            ], true) && $alert->entity_id === $revokedExpiredCertificate->id,
        ));
        $this->assertFalse($alerts->contains(
            fn ($alert): bool => $alert->type === DashboardAlertType::TurmaOverdue,
        ));

        // A separação por gate (Q-1): o documento vencido existe no banco deste
        // cenário e não sai por aqui.
        $this->assertFalse($alerts->contains(
            fn ($alert): bool => in_array($alert->type, [
                DashboardAlertType::RedatorDocumentExpired,
                DashboardAlertType::RedatorDocumentExpiringSoon,
            ], true),
        ));
    }

    /** @param array<int, mixed> $items */
    private function pendingProjection(array $items): array
    {
        return collect($items)
            ->sortBy('entity_id')
            ->map(fn ($item): array => [
                'module' => $item->module,
                'type' => $item->type,
                'severity' => $item->severity,
                'entity_id' => $item->entity_id,
                'navigation' => $item->navigation,
            ])
            ->values()
            ->all();
    }

    private function createConcludedTurma(): Turma
    {
        $quote = Quote::forceCreate([
            'budget_id' => $this->budget->id,
            'course_id' => $this->course->id,
            'seq_in_budget' => ++$this->quoteSequence,
            'student_count' => 10,
            'value_uf' => '10.0000',
            'status' => 'approved',
            'approved_at' => CarbonImmutable::now(),
        ]);
        $turma = Turma::create([
            'quote_id' => $quote->id,
            'course_id' => $this->course->id,
            'modalidade' => 'online',
            'local_aplicacao' => null,
            'start_date' => '2026-07-01',
            'end_date' => '2026-07-31',
            'status' => TurmaStatus::Concluida,
        ]);
        $turma->forceFill(['concluded_at' => '2026-08-01 10:00:00'])->saveQuietly();

        return $turma;
    }

    private function createEnrollment(
        Turma $turma,
        EnrollmentApprovalStatus $status,
    ): Enrollment {
        $sequence = ++$this->studentSequence;
        $rut = str_repeat((string) $sequence, 8).'-'.$sequence;
        $studentUser = User::create([
            'name' => "Alumno Certificación {$sequence}",
            'rut' => $rut,
            'email' => "alumno-certification-{$sequence}@example.test",
            'password' => 'secret',
            'type' => 'aluno',
            'is_active' => false,
        ]);
        $student = Student::create([
            'user_id' => $studentUser->id,
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

    private function createCertificate(
        Enrollment $enrollment,
        CertificateStatus $status,
        ?CarbonImmutable $validUntil = null,
    ): Certificate {
        $sequence = ++$this->certificateSequence;

        return Certificate::create([
            'uuid' => (string) Str::uuid(),
            'enrollment_id' => $enrollment->id,
            'course_id' => $this->course->id,
            'redator_id' => $this->redator->id,
            'codigo' => "LOT-DASH-CERT-{$sequence}",
            'snapshot' => ['aluno' => ['name' => "Alumno Certificación {$sequence}"]],
            'valido_ate' => $validUntil?->toDateString(),
            'status' => $status,
            'revoked_at' => $status === CertificateStatus::Revocado ? CarbonImmutable::now() : null,
            'revocation_reason' => $status === CertificateStatus::Revocado
                ? 'Documento reemplazado.'
                : null,
        ]);
    }

    private function createRedatorDocument(
        RedatorDocumentType $type,
        CarbonImmutable $validUntil,
    ): File {
        return File::create([
            'fileable_type' => 'redator',
            'fileable_id' => $this->redator->id,
            'type' => $type->value,
            'path' => "dashboard/redatores/{$this->redator->id}/{$type->value}.pdf",
            'original_name' => "{$type->value}.pdf",
            'mime' => 'application/pdf',
            'size' => 100,
            'valid_until' => $validUntil->toDateString(),
        ]);
    }
}
