<?php

namespace Tests\Feature\Dashboard;

use App\Domains\Catalog\Models\Course;
use App\Domains\Certification\Enums\CertificateStatus;
use App\Domains\Certification\Models\Certificate;
use App\Domains\Commercial\Models\Budget;
use App\Domains\Commercial\Models\Client;
use App\Domains\Commercial\Models\Quote;
use App\Domains\Dashboard\Enums\DashboardAlertType;
use App\Domains\Dashboard\Enums\DashboardSeverity;
use App\Domains\Dashboard\Services\RedatorScopeQuery;
use App\Domains\Identity\Enums\RedatorDocumentType;
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
 * O eixo desta suíte é o NEGATIVO: o payload do redator A não pode conter
 * turma, documento nem certificado exclusivo de B (spec §9, Drive §7.4). Toda
 * asserção positiva vem acompanhada da negativa por id — contar certo com o
 * dado do outro dentro é o vazamento que o teste existe para barrar.
 */
class RedatorScopeQueryTest extends TestCase
{
    use RefreshDatabase;

    private Redator $redatorA;

    private Redator $redatorB;

    private Client $client;

    private Budget $budget;

    private Course $course;

    private int $quoteSequence = 0;

    private int $studentSequence = 0;

    private int $certificateSequence = 0;

    /** Turmas exclusivas de A. */
    private Turma $aEmCurso;

    private Turma $aFutura;

    private Turma $aAtrasada;

    private Turma $aConcluida;

    /** Turma dos dois — precisa aparecer para A E para B. */
    private Turma $compartilhada;

    /** Turmas exclusivas de B — nenhuma pode aparecer para A. */
    private Turma $bEmCurso;

    private Turma $bConcluida;

    private File $docAVencido;

    private File $docAVencendo;

    private File $docBVencido;

    protected function setUp(): void
    {
        parent::setUp();
        CarbonImmutable::setTestNow('2026-08-14 12:00:00');

        $clientUser = User::create([
            'name' => 'Cliente Scope Dashboard',
            'rut' => '76.543.210-3',
            'email' => 'cliente-scope-dashboard@example.test',
            'password' => 'secret',
            'type' => 'cliente',
            'is_active' => false,
        ]);
        $this->client = Client::create([
            'user_id' => $clientUser->id,
            'legal_name' => 'Cliente Scope Dashboard SpA',
            'type' => 'client',
        ]);
        $this->budget = Budget::create([
            'client_id' => $this->client->id,
            'code' => 'Scap Scope Dashboard',
        ]);
        $this->course = Course::create([
            'name' => 'Trabajos en Altura de Alta Tensión',
            'workload_hours' => 20,
        ]);

        $this->redatorA = $this->createRedator('A', '12.345.678-5');
        $this->redatorB = $this->createRedator('B', '11111111-1');

        $today = CarbonImmutable::today();

        $this->aEmCurso = $this->createTurma($today->subDays(2), $today->addDays(3));
        $this->aFutura = $this->createTurma($today->addDays(2), $today->addDays(5));
        $this->aAtrasada = $this->createTurma($today->subDays(10), $today->subDay());
        $this->aConcluida = $this->createTurma(
            $today->subDays(30),
            $today->subDays(20),
            TurmaStatus::Concluida,
        );
        $this->compartilhada = $this->createTurma($today->subDay(), $today->addDays(10));
        $this->bEmCurso = $this->createTurma($today->subDays(2), $today->addDays(3));
        $this->bConcluida = $this->createTurma(
            $today->subDays(30),
            $today->subDays(20),
            TurmaStatus::Concluida,
        );

        foreach ([$this->aEmCurso, $this->aFutura, $this->aAtrasada, $this->aConcluida] as $turma) {
            $turma->redatores()->attach($this->redatorA->id);
        }
        $this->compartilhada->redatores()->attach([$this->redatorA->id, $this->redatorB->id]);
        foreach ([$this->bEmCurso, $this->bConcluida] as $turma) {
            $turma->redatores()->attach($this->redatorB->id);
        }

        // Documentação obrigatória: aEmCurso fica devendo 2 tipos, aFutura os 3,
        // aAtrasada e compartilhada estão completas. bEmCurso também fica
        // devendo — e é justamente o que não pode vazar para A.
        $this->createTurmaDocument($this->aEmCurso, TurmaDocumentType::MANUAL);
        foreach (TurmaDocumentType::cases() as $type) {
            $this->createTurmaDocument($this->aAtrasada, $type);
            $this->createTurmaDocument($this->compartilhada, $type);
        }
        $this->createTurmaDocument($this->bEmCurso, TurmaDocumentType::MANUAL);

        $this->docAVencido = $this->createRedatorDocument(
            $this->redatorA,
            RedatorDocumentType::REUF,
            $today->subDay(),
        );
        $this->docAVencendo = $this->createRedatorDocument(
            $this->redatorA,
            RedatorDocumentType::TITULO,
            $today->addDays(10),
        );
        $this->createRedatorDocument($this->redatorA, RedatorDocumentType::CV, $today->addDays(60));
        $this->docBVencido = $this->createRedatorDocument(
            $this->redatorB,
            RedatorDocumentType::POSTGRADO,
            $today->subDay(),
        );

        // Histórico: a concluída de A tem um certificado vivo e um revogado; a
        // de B tem um vivo, que não pode entrar na conta de A.
        //
        // ARMADILHA DELIBERADA: os TRÊS certificados nascem com
        // `redator_id = redatorA`, inclusive o da turma de B. É o que separa as
        // duas leituras possíveis de "certificados do redator". O plano manda
        // contar "certificados de matrículas de turmas de A" — escopo por
        // `turma_redator`, o mesmo eixo dos outros quatro métodos. Uma
        // implementação que escopasse por `certificates.redator_id` (quem
        // assinou) daria A=2 e B=0 e cairia aqui. Não "conserte" este fixture.
        $this->createCertificate($this->createEnrollment($this->aConcluida), CertificateStatus::Emitido);
        $this->createCertificate($this->createEnrollment($this->aConcluida), CertificateStatus::Revocado);
        $this->createCertificate($this->createEnrollment($this->bConcluida), CertificateStatus::Emitido);
    }

    protected function tearDown(): void
    {
        CarbonImmutable::setTestNow();
        parent::tearDown();
    }

    public function test_resumo_conta_so_as_turmas_e_documentos_do_proprio_redator(): void
    {
        $query = app(RedatorScopeQuery::class);

        // A: 3 começadas (aEmCurso, aAtrasada, compartilhada), 1 futura,
        // 2 pendências documentais (aEmCurso, aFutura), 2 docs no horizonte.
        $this->assertSame([
            'turmas_em_andamento' => 3,
            'proximas_turmas' => 1,
            'pendencias_documentais' => 2,
            'documentos_vencendo' => 2,
        ], $query->resumo($this->redatorA)->toArray());

        // B: 2 começadas (bEmCurso, compartilhada), nenhuma futura, 1 pendência
        // (bEmCurso), 1 doc. Se algum contador de A tivesse vazado para cá — ou
        // vice-versa — os dois resumos não poderiam ser ambos exatos.
        $this->assertSame([
            'turmas_em_andamento' => 2,
            'proximas_turmas' => 0,
            'pendencias_documentais' => 1,
            'documentos_vencendo' => 1,
        ], $query->resumo($this->redatorB)->toArray());
    }

    public function test_agenda_traz_as_turmas_do_redator_e_nenhuma_do_outro(): void
    {
        $agenda = app(RedatorScopeQuery::class)->agenda($this->redatorA)->toArray();

        $this->assertSame([$this->aFutura->id], array_column($agenda['starting_soon'], 'turma_id'));
        $this->assertSame([$this->aEmCurso->id], array_column($agenda['ending_soon'], 'turma_id'));
        $this->assertSame(
            [$this->aEmCurso->id, $this->compartilhada->id],
            array_column($agenda['in_progress'], 'turma_id'),
        );
        $this->assertSame([$this->aAtrasada->id], array_column($agenda['overdue'], 'turma_id'));

        $todosOsIds = collect($agenda)->flatten(1)->pluck('turma_id')->all();
        $this->assertNotContains($this->bEmCurso->id, $todosOsIds);
        $this->assertNotContains($this->bConcluida->id, $todosOsIds);

        // D5: o vazamento de cliente é erro de TIPO, mas provamos também em
        // runtime que a serialização não carrega a chave.
        $this->assertSame(
            ['turma_id', 'course_name', 'start_date', 'end_date'],
            array_keys($agenda['in_progress'][0]),
        );

        // A turma compartilhada é de ambos: aparecer para A não a tira de B.
        $agendaB = app(RedatorScopeQuery::class)->agenda($this->redatorB)->toArray();
        $this->assertContains(
            $this->compartilhada->id,
            array_column($agendaB['in_progress'], 'turma_id'),
        );
        $this->assertNotContains(
            $this->aEmCurso->id,
            collect($agendaB)->flatten(1)->pluck('turma_id')->all(),
        );
    }

    public function test_pendencias_documentais_listam_so_as_turmas_do_redator(): void
    {
        $pendencias = app(RedatorScopeQuery::class)->pendenciasDocumentais($this->redatorA);

        $this->assertSame([
            [
                'turma_id' => $this->aEmCurso->id,
                'course_name' => 'Trabajos en Altura de Alta Tensión',
                'end_date' => '2026-08-17',
                'missing_types' => ['PRUEBAS', 'EVALUACION_REDATOR'],
            ],
            [
                'turma_id' => $this->aFutura->id,
                'course_name' => 'Trabajos en Altura de Alta Tensión',
                'end_date' => '2026-08-19',
                'missing_types' => ['MANUAL', 'PRUEBAS', 'EVALUACION_REDATOR'],
            ],
        ], array_map(fn ($item): array => $item->toArray(), $pendencias));

        $this->assertNotContains(
            $this->bEmCurso->id,
            array_map(fn ($item): int => $item->turma_id, $pendencias),
        );
    }

    public function test_alertas_de_documento_nao_incluem_documento_de_outro_redator(): void
    {
        $alertas = app(RedatorScopeQuery::class)->alertasDocumentos($this->redatorA);

        $this->assertSame([
            [
                'type' => DashboardAlertType::RedatorDocumentExpired,
                'severity' => DashboardSeverity::High,
                'entity_id' => $this->docAVencido->id,
                'date' => '2026-08-13',
            ],
            [
                'type' => DashboardAlertType::RedatorDocumentExpiringSoon,
                'severity' => DashboardSeverity::Medium,
                'entity_id' => $this->docAVencendo->id,
                'date' => '2026-08-24',
            ],
        ], array_map(fn ($alerta): array => [
            'type' => $alerta->type,
            'severity' => $alerta->severity,
            'entity_id' => $alerta->entity_id,
            'date' => $alerta->date,
        ], $alertas));

        $this->assertNotContains(
            $this->docBVencido->id,
            array_map(fn ($alerta): int => $alerta->entity_id, $alertas),
        );
    }

    public function test_historico_conta_so_certificados_de_turmas_do_redator(): void
    {
        $query = app(RedatorScopeQuery::class);

        // A: 1 turma concluída; 2 certificados nela, mas 1 está revogado —
        // revogado não é "emitido", é o que o próprio enum do domínio responde.
        $this->assertSame([
            'turmas_concluidas' => 1,
            'certificados_emitidos' => 1,
        ], $query->historico($this->redatorA)->toArray());

        $this->assertSame([
            'turmas_concluidas' => 1,
            'certificados_emitidos' => 1,
        ], $query->historico($this->redatorB)->toArray());
    }

    private function createRedator(string $sufixo, string $rut): Redator
    {
        $user = User::create([
            'name' => "Redator Scope {$sufixo}",
            'rut' => $rut,
            'email' => 'redator-scope-'.strtolower($sufixo).'@example.test',
            'password' => 'secret',
            'type' => 'redator',
            'is_active' => true,
        ]);

        return Redator::create(['user_id' => $user->id]);
    }

    private function createTurma(
        CarbonImmutable $startDate,
        CarbonImmutable $endDate,
        TurmaStatus $status = TurmaStatus::EmAndamento,
    ): Turma {
        $quote = Quote::create([
            'budget_id' => $this->budget->id,
            'course_id' => $this->course->id,
            'seq_in_budget' => ++$this->quoteSequence,
            'student_count' => 10,
            'value_uf' => '10.0000',
            'status' => 'approved',
            'approved_at' => CarbonImmutable::now(),
        ]);

        return Turma::create([
            'quote_id' => $quote->id,
            'course_id' => $this->course->id,
            'modalidade' => 'online',
            'local_aplicacao' => null,
            'start_date' => $startDate->toDateString(),
            'end_date' => $endDate->toDateString(),
            'status' => $status,
        ]);
    }

    private function createTurmaDocument(Turma $turma, TurmaDocumentType $type): File
    {
        return File::create([
            'fileable_type' => 'turma',
            'fileable_id' => $turma->id,
            'type' => $type->value,
            'path' => "dashboard/scope/turma/{$turma->id}/{$type->value}.pdf",
            'original_name' => "{$type->value}.pdf",
            'mime' => 'application/pdf',
            'size' => 100,
        ]);
    }

    private function createRedatorDocument(
        Redator $redator,
        RedatorDocumentType $type,
        CarbonImmutable $validUntil,
    ): File {
        return File::create([
            'fileable_type' => 'redator',
            'fileable_id' => $redator->id,
            'type' => $type->value,
            'path' => "dashboard/scope/redator/{$redator->id}/{$type->value}.pdf",
            'original_name' => "{$type->value}.pdf",
            'mime' => 'application/pdf',
            'size' => 100,
            'valid_until' => $validUntil->toDateString(),
        ]);
    }

    private function createEnrollment(Turma $turma): Enrollment
    {
        $sequence = ++$this->studentSequence;
        $studentUser = User::create([
            'name' => "Alumno Scope {$sequence}",
            'rut' => str_repeat((string) ($sequence + 1), 8).'-'.($sequence + 1),
            'email' => "alumno-scope-{$sequence}@example.test",
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
            'grades' => ['final' => 6.5],
            'attendance_pct' => '92.00',
            'approval_status' => EnrollmentApprovalStatus::Aprobado,
        ]);
    }

    private function createCertificate(Enrollment $enrollment, CertificateStatus $status): Certificate
    {
        $sequence = ++$this->certificateSequence;

        return Certificate::create([
            'uuid' => (string) Str::uuid(),
            'enrollment_id' => $enrollment->id,
            'course_id' => $this->course->id,
            'redator_id' => $this->redatorA->id,
            'codigo' => "LOT-DASH-SCOPE-{$sequence}",
            'snapshot' => ['aluno' => ['name' => "Alumno Scope {$sequence}"]],
            'valido_ate' => null,
            'status' => $status,
            'revoked_at' => $status === CertificateStatus::Revocado ? CarbonImmutable::now() : null,
            'revocation_reason' => $status === CertificateStatus::Revocado ? 'Documento reemplazado.' : null,
        ]);
    }
}
