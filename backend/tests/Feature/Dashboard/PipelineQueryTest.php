<?php

namespace Tests\Feature\Dashboard;

use App\Domains\Catalog\Models\Course;
use App\Domains\Certification\Enums\CertificateStatus;
use App\Domains\Certification\Models\Certificate;
use App\Domains\Commercial\Models\Budget;
use App\Domains\Commercial\Models\Client;
use App\Domains\Commercial\Models\Quote;
use App\Domains\Dashboard\Data\PipelineStageCountData;
use App\Domains\Dashboard\Enums\PipelineStage;
use App\Domains\Dashboard\Services\CertificationMetricsQuery;
use App\Domains\Dashboard\Services\CommercialMetricsQuery;
use App\Domains\Dashboard\Services\OperationMetricsQuery;
use App\Domains\Dashboard\Services\PipelineQuery;
use App\Domains\Identity\Models\Redator;
use App\Domains\Identity\Models\Student;
use App\Domains\Identity\Models\User;
use App\Domains\Operation\Enums\EnrollmentApprovalStatus;
use App\Domains\Operation\Enums\TurmaDocumentType;
use App\Domains\Operation\Enums\TurmaStatus;
use App\Domains\Operation\Models\Enrollment;
use App\Domains\Operation\Models\Turma;
use App\Shared\Files\Models\File;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

/**
 * O funil exige classificação NÃO AMBÍGUA (spec §4.3): cada cotação/turma cai
 * em exatamente um balde. A asserção que prova isso não é a contagem por
 * balde — é a soma: sete exemplares entram, sete são contados. Um exemplar em
 * dois baldes, ou em nenhum, quebra a soma mesmo com todas as contagens
 * individuais parecendo plausíveis.
 */
class PipelineQueryTest extends TestCase
{
    use RefreshDatabase;

    private Budget $budget;

    private Course $course;

    private Client $client;

    private Redator $redator;

    private int $quoteSequence = 0;

    private int $studentSequence = 0;

    private int $certificateSequence = 0;

    protected function setUp(): void
    {
        parent::setUp();
        CarbonImmutable::setTestNow('2026-08-14 12:00:00');

        $clientUser = User::create([
            'name' => 'Cliente Pipeline',
            'rut' => '76.543.210-3',
            'email' => 'cliente-pipeline@example.test',
            'password' => 'secret',
            'type' => 'cliente',
            'is_active' => false,
        ]);
        $this->client = Client::create([
            'user_id' => $clientUser->id,
            'legal_name' => 'Cliente Pipeline SpA',
            'type' => 'client',
        ]);
        $this->budget = Budget::create([
            'client_id' => $this->client->id,
            'code' => 'Scap Pipeline',
        ]);
        $this->course = Course::create([
            'name' => 'Maniobras en Media Tensión',
            'workload_hours' => 12,
        ]);

        $redatorUser = User::create([
            'name' => 'Redator Pipeline',
            'rut' => '12.345.678-5',
            'email' => 'redator-pipeline@example.test',
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

    public function test_cada_exemplar_cai_em_exatamente_um_balde(): void
    {
        // 1. cotação pendente
        $this->createQuote('pending');

        // 2. cotação aprovada sem turma
        $this->createQuote('approved');

        // 3. turma em andamento NÃO habilitada (falta documentação)
        $naoHabilitada = $this->createTurma(TurmaStatus::EmAndamento);
        $this->createTurmaDocument($naoHabilitada, TurmaDocumentType::MANUAL);

        // 4. turma em andamento habilitada (documentação completa)
        $habilitada = $this->createTurma(TurmaStatus::EmAndamento);
        foreach (TurmaDocumentType::cases() as $type) {
            $this->createTurmaDocument($habilitada, $type);
        }

        // 5. concluída com matrícula aprovada sem certificado
        $concluidaPendente = $this->createTurma(TurmaStatus::Concluida);
        $this->createEnrollment($concluidaPendente, EnrollmentApprovalStatus::Aprobado);

        // 6. concluída com tudo emitido
        $concluidaEmitida = $this->createTurma(TurmaStatus::Concluida);
        $this->createCertificate(
            $this->createEnrollment($concluidaEmitida, EnrollmentApprovalStatus::Aprobado),
        );

        // 7. concluída SEM nenhuma matrícula aprovada — a spec §4.3 manda cair
        // em `fully_issued`: não há o que emitir, então não há pendência.
        $concluidaSemMatricula = $this->createTurma(TurmaStatus::Concluida);
        $this->createEnrollment($concluidaSemMatricula, EnrollmentApprovalStatus::Reprobado);

        $stages = collect($this->stages(includeQuoteStages: true))
            ->mapWithKeys(fn ($row): array => [$row->stage->value => $row->count])
            ->all();

        $this->assertSame([
            'quote_pending' => 1,
            'quote_approved_without_turma' => 1,
            'turma_in_progress' => 1,
            'turma_ready_for_conclusion' => 1,
            'concluded_pending_issuance' => 1,
            'fully_issued' => 2,
        ], $stages);

        // A prova de exclusividade: 2 cotações fora de turma + 5 turmas = 7.
        // As 5 cotações que originaram turmas não entram em balde de cotação —
        // a turma delas é que responde por elas.
        $this->assertSame(7, array_sum($stages));
    }

    public function test_sem_gate_comercial_o_funil_perde_so_as_etapas_de_cotacao(): void
    {
        $this->createQuote('pending');
        $this->createQuote('approved');
        $turma = $this->createTurma(TurmaStatus::EmAndamento);
        $this->createTurmaDocument($turma, TurmaDocumentType::MANUAL);

        $stages = $this->stages(includeQuoteStages: false);

        $this->assertSame([
            PipelineStage::TurmaInProgress,
            PipelineStage::TurmaReadyForConclusion,
            PipelineStage::ConcludedPendingIssuance,
            PipelineStage::FullyIssued,
        ], array_map(fn ($row): PipelineStage => $row->stage, $stages));

        // As etapas de turma seguem intactas — o gate tira etapa, não altera
        // a contagem das que ficam.
        $this->assertSame(
            [1, 0, 0, 0],
            array_map(fn ($row): int => $row->count, $stages),
        );
    }

    /**
     * O funil recebe as contagens prontas dos serviços donos de cada pergunta —
     * ele particiona, não consulta (menos a contagem de concluídas, que é a
     * partição em si). Este helper monta a chamada como o assembler a monta.
     *
     * @return PipelineStageCountData[]
     */
    private function stages(bool $includeQuoteStages): array
    {
        $commercial = app(CommercialMetricsQuery::class);

        return app(PipelineQuery::class)->stages(
            turmaKpis: app(OperationMetricsQuery::class)->kpis(),
            certificationPendencias: app(CertificationMetricsQuery::class)->pendencias(),
            quoteKpis: $includeQuoteStages ? $commercial->quoteKpis() : null,
            commercialPendencias: $includeQuoteStages ? $commercial->pendencias() : [],
        );
    }

    private function createQuote(string $status): Quote
    {
        return Quote::create([
            'budget_id' => $this->budget->id,
            'course_id' => $this->course->id,
            'seq_in_budget' => ++$this->quoteSequence,
            'student_count' => 10,
            'value_uf' => '10.0000',
            'status' => $status,
            'approved_at' => $status === 'approved' ? CarbonImmutable::now() : null,
            'planned_start_date' => CarbonImmutable::today()->addDays(15)->toDateString(),
        ]);
    }

    private function createTurma(TurmaStatus $status): Turma
    {
        $today = CarbonImmutable::today();

        return Turma::create([
            'quote_id' => $this->createQuote('approved')->id,
            'course_id' => $this->course->id,
            'modalidade' => 'online',
            'local_aplicacao' => null,
            'start_date' => $today->subDays(5)->toDateString(),
            'end_date' => $status === TurmaStatus::Concluida
                ? $today->subDay()->toDateString()
                : $today->addDays(5)->toDateString(),
            'status' => $status,
        ]);
    }

    private function createTurmaDocument(Turma $turma, TurmaDocumentType $type): File
    {
        return File::create([
            'fileable_type' => 'turma',
            'fileable_id' => $turma->id,
            'type' => $type->value,
            'path' => "dashboard/pipeline/{$turma->id}/{$type->value}.pdf",
            'original_name' => "{$type->value}.pdf",
            'mime' => 'application/pdf',
            'size' => 100,
        ]);
    }

    private function createEnrollment(Turma $turma, EnrollmentApprovalStatus $status): Enrollment
    {
        $sequence = ++$this->studentSequence;
        $studentUser = User::create([
            'name' => "Alumno Pipeline {$sequence}",
            'rut' => str_repeat((string) $sequence, 8).'-'.$sequence,
            'email' => "alumno-pipeline-{$sequence}@example.test",
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
            'grades' => ['final' => 6.0],
            'attendance_pct' => '90.00',
            'approval_status' => $status,
        ]);
    }

    private function createCertificate(Enrollment $enrollment): Certificate
    {
        $sequence = ++$this->certificateSequence;

        return Certificate::create([
            'uuid' => (string) Str::uuid(),
            'enrollment_id' => $enrollment->id,
            'course_id' => $this->course->id,
            'redator_id' => $this->redator->id,
            'codigo' => "LOT-DASH-PIPE-{$sequence}",
            'snapshot' => ['aluno' => ['name' => "Alumno Pipeline {$sequence}"]],
            'valido_ate' => null,
            'status' => CertificateStatus::Emitido,
            'revoked_at' => null,
            'revocation_reason' => null,
        ]);
    }
}
