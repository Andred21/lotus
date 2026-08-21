<?php

namespace Tests\Feature\Dashboard;

use App\Domains\Catalog\Models\Course;
use App\Domains\Certification\Enums\CertificateStatus;
use App\Domains\Certification\Models\Certificate;
use App\Domains\Commercial\Models\Budget;
use App\Domains\Commercial\Models\Client;
use App\Domains\Commercial\Models\Quote;
use App\Domains\Dashboard\Services\AnalyticsQuery;
use App\Domains\Identity\Models\Redator;
use App\Domains\Identity\Models\Student;
use App\Domains\Identity\Models\User;
use App\Domains\Operation\Enums\EnrollmentApprovalStatus;
use App\Domains\Operation\Enums\TurmaStatus;
use App\Domains\Operation\Models\Enrollment;
use App\Domains\Operation\Models\Turma;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class AnalyticsQueryTest extends TestCase
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
            'name' => 'Cliente Analytics Dashboard',
            'rut' => '76.543.210-3',
            'email' => 'cliente-analytics-dashboard@example.test',
            'password' => 'secret',
            'type' => 'cliente',
            'is_active' => false,
        ]);
        $this->client = Client::create([
            'user_id' => $clientUser->id,
            'legal_name' => 'Cliente Analytics Dashboard SpA',
            'type' => 'client',
        ]);
        $this->budget = Budget::create([
            'client_id' => $this->client->id,
            'code' => 'Scap Analytics Dashboard',
        ]);
        $this->course = Course::create([
            'name' => 'Analítica de Seguridad Eléctrica',
            'workload_hours' => 24,
        ]);

        $redatorUser = User::create([
            'name' => 'Redator Analytics Dashboard',
            'rut' => '12.345.678-5',
            'email' => 'redator-analytics-dashboard@example.test',
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

    public function test_bucketiza_as_cinco_series_e_rankings_no_periodo(): void
    {
        $januaryFirst = $this->createConcludedTurma(
            approvedAt: '2026-01-05 09:00:00',
            valueUf: '100.1250',
            startDate: '2026-01-10',
            endDate: '2026-01-20',
            concludedAt: '2026-01-20 18:00:00',
        );
        $januarySecond = $this->createConcludedTurma(
            approvedAt: '2026-01-25 09:00:00',
            valueUf: '200.2355',
            startDate: '2026-01-25',
            endDate: '2026-02-01',
            concludedAt: '2026-02-01 18:00:00',
        );
        $february = $this->createConcludedTurma(
            approvedAt: '2026-02-10 09:00:00',
            valueUf: '50.5000',
            startDate: '2026-02-10',
            endDate: '2026-02-20',
            concludedAt: '2026-02-20 18:00:00',
        );
        $outsidePeriod = $this->createConcludedTurma(
            approvedAt: '2025-12-15 09:00:00',
            valueUf: '999.9999',
            startDate: '2025-12-20',
            endDate: '2025-12-30',
            concludedAt: '2025-12-30 18:00:00',
        );

        $januaryFirstEnrollment = $this->createEnrollment($januaryFirst, '2026-01-10 10:00:00');
        $this->createEnrollment($januaryFirst, '2026-01-11 10:00:00');
        $januarySecondEnrollment = $this->createEnrollment($januarySecond, '2026-01-25 10:00:00');
        $februaryEnrollment = $this->createEnrollment($february, '2026-02-10 10:00:00');
        $outsideEnrollment = $this->createEnrollment($outsidePeriod, '2025-12-20 10:00:00');

        $this->createCertificate($januaryFirstEnrollment, '2026-01-20 19:00:00');
        $this->createCertificate($januarySecondEnrollment, '2026-02-01 19:00:00');
        $this->createCertificate($februaryEnrollment, '2026-02-20 19:00:00');
        $this->createCertificate($outsideEnrollment, '2025-12-30 19:00:00');

        $start = CarbonImmutable::parse('2026-01-01')->startOfDay();
        $end = CarbonImmutable::parse('2026-02-28')->endOfDay();
        $query = app(AnalyticsQuery::class);

        $series = $this->series($query, $start, $end);
        $this->assertSame([
            'turmas_iniciadas' => [
                ['month' => '2026-01', 'count' => 2],
                ['month' => '2026-02', 'count' => 1],
            ],
            'turmas_concluidas' => [
                ['month' => '2026-01', 'count' => 1],
                ['month' => '2026-02', 'count' => 2],
            ],
            'certificados_emitidos' => [
                ['month' => '2026-01', 'count' => 1],
                ['month' => '2026-02', 'count' => 2],
            ],
            'matriculas' => [
                ['month' => '2026-01', 'count' => 3],
                ['month' => '2026-02', 'count' => 1],
            ],
            'uf_aprovada' => [
                ['month' => '2026-01', 'total_uf' => '300.3605'],
                ['month' => '2026-02', 'total_uf' => '50.5000'],
            ],
        ], $series);
        $this->assertNotContains(
            '2025-12',
            array_column($series['turmas_iniciadas'], 'month'),
        );

        $this->assertSame([
            'courses' => [[
                'id' => $this->course->id,
                'name' => 'Analítica de Seguridad Eléctrica',
                'turmas' => 3,
                'matriculas' => 4,
                'certificados' => 3,
                'uf_aprovada' => '350.8605',
            ]],
            'clients' => [[
                'id' => $this->client->id,
                'name' => 'Cliente Analytics Dashboard SpA',
                'turmas' => 3,
                'matriculas' => 4,
                'certificados' => 3,
                'uf_aprovada' => '350.8605',
            ]],
        ], $query->rankings($start, $end, true)->toArray());

        $this->assertSame([
            'courses' => [[
                'id' => $this->course->id,
                'name' => 'Analítica de Seguridad Eléctrica',
                'turmas' => 3,
                'matriculas' => 4,
                'certificados' => 3,
                'uf_aprovada' => null,
            ]],
            'clients' => [[
                'id' => $this->client->id,
                'name' => 'Cliente Analytics Dashboard SpA',
                'turmas' => 3,
                'matriculas' => 4,
                'certificados' => 3,
                'uf_aprovada' => null,
            ]],
        ], $query->rankings($start, $end, false)->toArray());
    }

    /**
     * Soft delete é arquivamento, não desaparecimento. `rankingRows()` itera os
     * NOMES, então resolver o nome sem `withTrashed()` apagava a linha inteira —
     * e a série do mesmo payload seguia contando a turma do curso arquivado, um
     * ranking que não fecha com a própria série (Q-4).
     */
    public function test_curso_e_cliente_arquivados_mantem_a_linha_do_ranking(): void
    {
        $turma = $this->createConcludedTurma(
            approvedAt: '2026-01-05 09:00:00',
            valueUf: '100.0000',
            startDate: '2026-01-10',
            endDate: '2026-01-20',
            concludedAt: '2026-01-20 18:00:00',
        );
        $this->createCertificate($this->createEnrollment($turma, '2026-01-10 10:00:00'), '2026-01-20 19:00:00');

        $start = CarbonImmutable::parse('2026-01-01')->startOfDay();
        $end = CarbonImmutable::parse('2026-02-28')->endOfDay();

        $this->course->delete();
        $this->client->delete();

        $rankings = app(AnalyticsQuery::class)->rankings($start, $end, true)->toArray();

        $this->assertSame([[
            'id' => $this->course->id,
            'name' => 'Analítica de Seguridad Eléctrica',
            'turmas' => 1,
            'matriculas' => 1,
            'certificados' => 1,
            'uf_aprovada' => '100.0000',
        ]], $rankings['courses']);
        $this->assertSame([[
            'id' => $this->client->id,
            'name' => 'Cliente Analytics Dashboard SpA',
            'turmas' => 1,
            'matriculas' => 1,
            'certificados' => 1,
            'uf_aprovada' => '100.0000',
        ]], $rankings['clients']);

        // A prova de que a linha não sumiu por acaso: a série que a alimenta
        // segue contando a mesma turma.
        $this->assertSame(
            [['month' => '2026-01', 'count' => 1]],
            $this->series(app(AnalyticsQuery::class), $start, $end)['turmas_iniciadas'],
        );
    }

    /**
     * "Certificados emitidos", uma definição só (Q-5): o histórico do redator
     * conta apenas `Emitido`, e a série e o ranking do admin precisam contar o
     * mesmo — senão o mesmo rótulo sai com dois números no mesmo payload.
     */
    public function test_certificado_revogado_nao_conta_como_emitido_em_serie_nem_ranking(): void
    {
        $turma = $this->createConcludedTurma(
            approvedAt: '2026-01-05 09:00:00',
            valueUf: '100.0000',
            startDate: '2026-01-10',
            endDate: '2026-01-20',
            concludedAt: '2026-01-20 18:00:00',
        );
        $emitido = $this->createCertificate(
            $this->createEnrollment($turma, '2026-01-10 10:00:00'),
            '2026-01-20 19:00:00',
        );
        $revogado = $this->createCertificate(
            $this->createEnrollment($turma, '2026-01-11 10:00:00'),
            '2026-01-21 19:00:00',
        );
        $revogado->forceFill([
            'status' => CertificateStatus::Revocado,
            'revoked_at' => '2026-02-01 10:00:00',
            'revocation_reason' => 'Error en el nombre.',
        ])->saveQuietly();

        $start = CarbonImmutable::parse('2026-01-01')->startOfDay();
        $end = CarbonImmutable::parse('2026-02-28')->endOfDay();
        $query = app(AnalyticsQuery::class);

        $this->assertSame(
            [['month' => '2026-01', 'count' => 1]],
            $this->series($query, $start, $end)['certificados_emitidos'],
            "Os dois certificados existem; só o {$emitido->codigo} segue emitido.",
        );

        $rankings = $query->rankings($start, $end, true)->toArray();
        $this->assertSame(1, $rankings['courses'][0]['certificados']);
        $this->assertSame(1, $rankings['clients'][0]['certificados']);
    }

    /**
     * As séries com todos os gates abertos. O recorte por gate é do assembler e
     * tem prova própria no `DashboardEndpointTest`.
     */
    private function series(AnalyticsQuery $query, CarbonImmutable $start, CarbonImmutable $end): array
    {
        return $query->series(
            $start,
            $end,
            includeOperation: true,
            includeCertification: true,
            includeUf: true,
        )->toArray();
    }

    private function createConcludedTurma(
        string $approvedAt,
        string $valueUf,
        string $startDate,
        string $endDate,
        string $concludedAt,
    ): Turma {
        $quote = Quote::forceCreate([
            'budget_id' => $this->budget->id,
            'course_id' => $this->course->id,
            'seq_in_budget' => ++$this->quoteSequence,
            'student_count' => 10,
            'value_uf' => $valueUf,
            'status' => 'approved',
            'approved_at' => $approvedAt,
        ]);
        $turma = Turma::create([
            'quote_id' => $quote->id,
            'course_id' => $this->course->id,
            'modalidade' => 'online',
            'local_aplicacao' => null,
            'start_date' => $startDate,
            'end_date' => $endDate,
            'status' => TurmaStatus::Concluida,
        ]);
        $turma->forceFill(['concluded_at' => $concludedAt])->saveQuietly();

        return $turma;
    }

    private function createEnrollment(Turma $turma, string $createdAt): Enrollment
    {
        $sequence = ++$this->studentSequence;
        $rut = str_repeat((string) $sequence, 8).'-'.$sequence;
        $studentUser = User::create([
            'name' => "Alumno Analytics {$sequence}",
            'rut' => $rut,
            'email' => "alumno-analytics-{$sequence}@example.test",
            'password' => 'secret',
            'type' => 'aluno',
            'is_active' => false,
        ]);
        $student = Student::create([
            'user_id' => $studentUser->id,
            'current_client_id' => $this->client->id,
        ]);
        $enrollment = Enrollment::create([
            'turma_id' => $turma->id,
            'student_id' => $student->id,
            'grades' => ['final' => 6.2],
            'attendance_pct' => '87.50',
            'approval_status' => EnrollmentApprovalStatus::Aprobado,
        ]);
        $enrollment->forceFill([
            'created_at' => $createdAt,
            'updated_at' => $createdAt,
        ])->saveQuietly();

        return $enrollment;
    }

    private function createCertificate(Enrollment $enrollment, string $createdAt): Certificate
    {
        $sequence = ++$this->certificateSequence;
        $certificate = Certificate::create([
            'uuid' => (string) Str::uuid(),
            'enrollment_id' => $enrollment->id,
            'course_id' => $this->course->id,
            'redator_id' => $this->redator->id,
            'codigo' => "LOT-DASH-ANALYTICS-{$sequence}",
            'snapshot' => ['aluno' => ['name' => "Alumno Analytics {$sequence}"]],
            'valido_ate' => null,
            'status' => CertificateStatus::Emitido,
            'revoked_at' => null,
            'revocation_reason' => null,
        ]);
        $certificate->forceFill([
            'created_at' => $createdAt,
            'updated_at' => $createdAt,
        ])->saveQuietly();

        return $certificate;
    }
}
