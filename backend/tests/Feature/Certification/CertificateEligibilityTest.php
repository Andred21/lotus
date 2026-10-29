<?php

namespace Tests\Feature\Certification;

use App\Domains\Certification\Data\EmissionPanelEnrollmentData;
use App\Domains\Certification\Data\EmissionPanelTurmaData;
use App\Domains\Certification\Enums\CertificateStatus;
use App\Domains\Certification\Enums\EmissionBlockReason;
use App\Domains\Certification\Models\Certificate;
use App\Domains\Certification\Services\CertificateEligibility;
use App\Domains\Certification\Services\EmissionPanelQuery;
use App\Domains\Commercial\Models\Client;
use App\Domains\Identity\Models\Redator;
use App\Domains\Identity\Models\Student;
use App\Domains\Identity\Models\User;
use App\Domains\Operation\Enums\EnrollmentApprovalStatus;
use App\Domains\Operation\Enums\TurmaModalidade;
use App\Domains\Operation\Models\Enrollment;
use App\Domains\Operation\Models\Turma;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Tests\Support\Certification\IssuableEnrollmentBuilder;
use Tests\TestCase;

/**
 * A prova de que a tela e a emissão concordam (B1). Não é teste de endpoint:
 * é a invariante que mata a classe de bug "a lista promete um certificado que
 * o POST recusa com 422", nos DOIS sentidos — o que o `EmissionPanelQuery`
 * apresenta como emissível passa nas portas de `CertificateEligibility`, e o
 * que as portas recusam nunca aparece emissível no painel.
 */
class CertificateEligibilityTest extends TestCase
{
    use RefreshDatabase;

    private Client $client;

    private Redator $redator;

    /** @var array<string, Turma> */
    private array $reprovadas = [];

    /**
     * A mensagem que CADA porta escreve ao recusar. Sem isto o teste só sabia
     * que "alguma" ValidationException subiu, e passava a ser vacuoso assim que
     * duas portas fechassem no mesmo cenário: provado em 2026-08-08 removendo
     * `assertTurmaConcluida()` da face de emissão — o teste continuava verde,
     * porque a porta 5 (redator não designado) recusava em seguida.
     *
     * @var array<string, string>
     */
    private const MENSAGEM_DA_PORTA = [
        'turma não concluída' => 'La clase aún no fue concluida: no se puede emitir el certificado (RN-08).',
        'matrícula não aprovada' => 'El alumno no fue aprobado: no se puede emitir el certificado.',
        'certificado vigente' => 'Ya existe un certificado vigente para esta matrícula.',
        'sem redator designado' => 'El relator no está designado en esta clase.',
    ];

    private Turma $emitivel;

    protected function setUp(): void
    {
        parent::setUp();

        Carbon::setTestNow('2026-08-05 10:00:00');
        // Diferente do default (`Santiago`): prova que a cidade vem da config.
        config(['app.certificate_issuer.city' => 'Temuco']);

        // A única que passa nas cinco portas.
        $emitivel = IssuableEnrollmentBuilder::make()->create();
        $this->client = $emitivel->clientModel();
        $this->redator = $emitivel->redatorModel();
        $this->emitivel = $emitivel->turmaModel();

        // Uma por porta fechada, e cada nome é a porta que ela fecha. Cada
        // cenário nasce da própria cadeia — client/course/redator distintos
        // do `emitivel` e entre si — e não importa (nenhuma asserção lê essas
        // identidades para as reprovadas). D-P4: "certificado vigente" (porta
        // 3) não tem desvio nomeado no builder — é o teste que emite direto.
        $this->reprovadas['turma não concluída'] = $this->reprovadaBuilder()
            ->turmaNaoConcluida()
            ->create()
            ->turmaModel();

        // Não "reprovada": o desvio grava `Pendiente`, e a porta 2 recusa os
        // dois. `Reprobado` segue coberto em
        // `test_lista_traz_a_turma_sem_as_matriculas_que_nao_passam`.
        $this->reprovadas['matrícula não aprovada'] = $this->reprovadaBuilder()
            ->resultadoPendiente()
            ->create()
            ->turmaModel();

        $certificadoVigente = $this->reprovadaBuilder()->create();
        Certificate::create([
            'uuid' => (string) Str::uuid(),
            'enrollment_id' => $certificadoVigente->enrollmentModel()->id,
            'course_id' => $certificadoVigente->courseModel()->id,
            'redator_id' => $certificadoVigente->redatorModel()->id,
            'codigo' => 'LOT-2026-1000',
            'snapshot' => ['aluno' => ['name' => 'Ya certificado']],
            'valido_ate' => null,
            'status' => CertificateStatus::Emitido,
            'revoked_at' => null,
            'revocation_reason' => null,
        ]);
        $this->reprovadas['certificado vigente'] = $certificadoVigente->turmaModel();

        $this->reprovadas['sem redator designado'] = $this->reprovadaBuilder()
            ->semRedator()
            ->create()
            ->turmaModel();
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();

        parent::tearDown();
    }

    /**
     * Sentido 1 — o que o painel apresenta como emissível, a emissão cumpre.
     * Sem isto o admin clica no Emitir que a tela ofereceu e leva 422.
     */
    public function test_toda_matricula_emissivel_no_painel_passa_nas_portas_da_emissao(): void
    {
        $eligibility = app(CertificateEligibility::class);
        $emissiveis = $this->matriculasEmissiveisNoPainel();

        $this->assertSame([$this->emitivel->enrollments()->sole()->id], $emissiveis);

        foreach ($emissiveis as $enrollmentId) {
            $context = $eligibility->assert(Enrollment::query()->findOrFail($enrollmentId), $this->redator);

            $this->assertSame($this->emitivel->id, $context->turma->id);
            $this->assertSame('Temuco', $context->ciudadEmision);
        }
    }

    /**
     * Sentido 2 — o que a emissão recusa, o painel nunca apresenta como
     * emissível. Uma turma por porta, para uma porta esquecida num dos lados
     * aparecer como falha nomeada.
     */
    public function test_toda_matricula_que_a_emissao_recusa_nao_aparece_emissivel_no_painel(): void
    {
        $eligibility = app(CertificateEligibility::class);
        $emissiveis = $this->matriculasEmissiveisNoPainel();

        foreach ($this->reprovadas as $porta => $turma) {
            $enrollment = $turma->enrollments()->sole();

            $this->assertNotContains(
                $enrollment->id,
                $emissiveis,
                "O painel apresentou como emissível a matrícula da porta: {$porta}.",
            );

            try {
                $eligibility->assert($enrollment, $this->redator);
                $this->fail("A emissão aceitou a turma que fecha a porta: {$porta}.");
            } catch (ValidationException $exception) {
                // A porta NOMEADA tem de ser a que recusou. Aceitar qualquer
                // ValidationException deixa outra porta mascarar a que o
                // cenário existe para provar.
                $this->assertContains(
                    self::MENSAGEM_DA_PORTA[$porta],
                    array_merge(...array_values($exception->errors())),
                    "A recusa não veio da porta: {$porta}.",
                );
            }
        }
    }

    /**
     * A matrícula reprovada da turma emitível APARECE no painel (D-P3: linha
     * ausente não explica nada), mas nunca como emissível.
     */
    public function test_painel_mostra_a_matricula_reprovada_sem_apresenta_la_como_emissivel(): void
    {
        $reprovada = $this->makeEnrollment($this->emitivel, EnrollmentApprovalStatus::Reprobado);

        $turma = collect($this->painel())
            ->sole(fn (EmissionPanelTurmaData $t) => $t->turma_id === $this->emitivel->id);

        $this->assertContains(
            $reprovada->id,
            array_map(fn (EmissionPanelEnrollmentData $e) => $e->enrollment_id, $turma->enrollments),
        );
        $this->assertNotContains($reprovada->id, $this->matriculasEmissiveisNoPainel());
    }

    /**
     * Spec D9 (bloco 40): a frase do certificado usa só a cidade do emissor,
     * então sem ela painel e emissão recusam JUNTOS (`SinCiudad` ↔
     * `emission_city_missing`) — online ou presencial. O `local_aplicacao`
     * deixou de abrir a porta: antes (D2 do bloco 39) a presencial seguia.
     */
    public function test_sem_cidade_do_emissor_painel_e_emissao_concordam_inclusive_na_presencial(): void
    {
        config(['app.certificate_issuer.city' => '']);
        $eligibility = app(CertificateEligibility::class);

        $presencial = $this->reprovadaBuilder()
            ->turma(['modalidade' => TurmaModalidade::Presencial, 'local_aplicacao' => 'Rancagua'])
            ->create();

        $painel = collect($this->painel());

        foreach ([$this->emitivel->id, $presencial->turmaModel()->id] as $turmaId) {
            $this->assertSame(
                EmissionBlockReason::SinCiudad,
                $painel->sole(fn (EmissionPanelTurmaData $t) => $t->turma_id === $turmaId)->emission_blocked,
            );
        }

        $enrollments = [
            'online' => [$this->emitivel->enrollments()->sole(), $this->redator],
            'presencial' => [$presencial->enrollmentModel(), $presencial->redatorModel()],
        ];

        foreach ($enrollments as $modalidade => [$enrollment, $redator]) {
            try {
                $eligibility->assert($enrollment, $redator);
                $this->fail("A emissão aceitou a turma {$modalidade} sem cidade do emissor.");
            } catch (ValidationException $exception) {
                // A porta 4 recusou, e não outra: a mensagem é a nomeada.
                $this->assertSame(
                    [__('certification.eligibility.emission_city_missing')],
                    $exception->errors()['turma'] ?? null,
                    "A turma {$modalidade} foi recusada por outra porta.",
                );
            }
        }
    }

    /**
     * O `ciudad_emision` do snapshot continua vindo do `local_aplicacao` quando
     * a turma tem (D12 do bloco 40: o snapshot é imutável e segue o que já
     * gravava); só a PORTA é que olha a cidade do emissor.
     */
    public function test_com_cidade_do_emissor_a_presencial_segue_e_o_snapshot_guarda_o_local(): void
    {
        config(['app.certificate_issuer.city' => 'Santiago']);

        $presencial = $this->reprovadaBuilder()
            ->turma(['modalidade' => TurmaModalidade::Presencial, 'local_aplicacao' => 'Rancagua'])
            ->create();

        $context = app(CertificateEligibility::class)
            ->assert($presencial->enrollmentModel(), $presencial->redatorModel());

        $this->assertSame('Rancagua', $context->ciudadEmision);
    }

    /**
     * O painel com a janela escancarada: este teste é sobre elegibilidade, não
     * sobre a janela por data (spec D7, coberta em `EmissionPanelWindowTest`).
     * A data é fixa e não "hoje menos algo" para o dia de amanhã não empurrar
     * a fixture (`end_date` 2026-07-24) para fora do default de 12 meses.
     *
     * @return array<EmissionPanelTurmaData>
     */
    private function painel(): array
    {
        return app(EmissionPanelQuery::class)->get(CarbonImmutable::parse('2000-01-01'));
    }

    /**
     * O que o painel apresenta como EMISSÍVEL — o contrato que o botão Emitir
     * da tela lê (`rowCertKind` no front): turma sem `emission_blocked`,
     * matrícula aprovada e sem certificado vigente. É contra ISTO que as
     * portas têm de concordar; o resto do painel é reporte, não promessa.
     *
     * @return array<int> `enrollment_id`s
     */
    private function matriculasEmissiveisNoPainel(): array
    {
        return collect($this->painel())
            ->filter(fn (EmissionPanelTurmaData $turma) => $turma->emission_blocked === null)
            ->flatMap(fn (EmissionPanelTurmaData $turma) => collect($turma->enrollments)
                ->filter(fn (EmissionPanelEnrollmentData $e) => $e->approval_status === EnrollmentApprovalStatus::Aprobado
                    && $e->certificate === null)
                ->map(fn (EmissionPanelEnrollmentData $e) => $e->enrollment_id))
            ->values()
            ->all();
    }

    /** Um RUT de aluno por cadeia reprovada — ver `reprovadaBuilder`. */
    private int $studentRutSeq = 0;

    /**
     * Cada reprovada nasce da própria cadeia via o builder. Cliente e redator
     * saem com RUT nulo para não colidir com o índice único de `users.rut`
     * entre os cinco cenários deste setUp (o default do builder repetiria o
     * mesmo RUT em cada instância). O ALUNO não pode: o `EmissionPanelQuery`
     * projeta toda turma concluída — as reprovadas inclusive — e
     * `EmissionPanelEnrollmentData::$student_rut` é `string` não-nulo, então
     * cada cadeia ganha um RUT próprio, sequencial.
     */
    private function reprovadaBuilder(): IssuableEnrollmentBuilder
    {
        $seq = ++$this->studentRutSeq;

        return IssuableEnrollmentBuilder::make()
            ->client([], ['rut' => null])
            ->student(['rut' => sprintf('66.666.66%d-%d', $seq, $seq)])
            ->redatorUser(['rut' => null]);
    }

    /** Matrícula extra na turma `$turma`, fora da cadeia do builder. */
    private function makeEnrollment(
        Turma $turma,
        EnrollmentApprovalStatus $status = EnrollmentApprovalStatus::Aprobado,
    ): Enrollment {
        $student = Student::create([
            // RUT presente pelo mesmo motivo do `reprovadaBuilder`: a projeção
            // do painel exige `student_rut` string.
            'user_id' => User::factory()->aluno()->create(['rut' => '77.777.777-7'])->id,
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
}
