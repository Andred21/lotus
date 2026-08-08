<?php

namespace Tests\Feature\Certification;

use App\Domains\Catalog\Models\Course;
use App\Domains\Catalog\Models\CourseCertificateTemplate;
use App\Domains\Certification\Data\EmissionPanelEnrollmentData;
use App\Domains\Certification\Data\EmissionPanelTurmaData;
use App\Domains\Certification\Enums\CertificateStatus;
use App\Domains\Certification\Models\Certificate;
use App\Domains\Certification\Services\CertificateEligibility;
use App\Domains\Certification\Services\CertificateTemplateResolver;
use App\Domains\Certification\Services\EmissionPanelQuery;
use App\Domains\Commercial\Models\Client;
use App\Domains\Identity\Models\Redator;
use App\Domains\Identity\Models\Student;
use App\Domains\Identity\Models\User;
use App\Domains\Operation\Enums\EnrollmentApprovalStatus;
use App\Domains\Operation\Models\Enrollment;
use App\Domains\Operation\Models\Turma;
use Illuminate\Database\Events\QueryExecuted;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Tests\Support\Certification\IssuableEnrollmentBuilder;
use Tests\Support\CreatesDomainRecords;
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
    use CreatesDomainRecords;
    use RefreshDatabase;

    private Client $client;

    private Course $course;

    private Redator $redator;

    /** @var array<string, Turma> */
    private array $reprovadas = [];

    /**
     * A mensagem que CADA porta escreve ao recusar. Sem isto o teste só sabia
     * que "alguma" ValidationException subiu, e passava a ser vacuoso assim que
     * duas portas fechassem no mesmo cenário: provado em 2026-08-08 removendo
     * `assertTurmaConcluida()` da face de emissão — o teste continuava verde,
     * porque a porta 6 (redator não designado) recusava em seguida.
     *
     * @var array<string, string>
     */
    private const MENSAGEM_DA_PORTA = [
        'turma não concluída' => 'La clase aún no fue concluida: no se puede emitir el certificado (RN-08).',
        'matrícula não aprovada' => 'El alumno no fue aprobado: no se puede emitir el certificado.',
        'certificado vigente' => 'Ya existe un certificado vigente para esta matrícula.',
        'curso sem template' => 'El curso no tiene una plantilla de certificado aprobada.',
        'sem cidade de emissão' => 'La plantilla del curso no define una ciudad de emisión válida.',
        'sem redator designado' => 'El redactor no está designado en esta clase.',
    ];

    private Turma $emitivel;

    protected function setUp(): void
    {
        parent::setUp();

        Carbon::setTestNow('2026-08-05 10:00:00');

        // A única que passa nas seis portas.
        $emitivel = IssuableEnrollmentBuilder::make()->create();
        $this->client = $emitivel->clientModel();
        $this->course = $emitivel->courseModel();
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

        $this->reprovadas['curso sem template'] = $this->reprovadaBuilder()
            ->course(['name' => 'Curso sin plantilla'])
            ->semTemplate()
            ->create()
            ->turmaModel();

        $this->reprovadas['sem cidade de emissão'] = $this->reprovadaBuilder()
            ->course(['name' => 'Curso sin ciudad'])
            ->templateSemCidade()
            ->create()
            ->turmaModel();

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
            $this->assertSame('Santiago', $context->ciudadEmision);
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

        $turma = collect(app(EmissionPanelQuery::class)->get())
            ->sole(fn (EmissionPanelTurmaData $t) => $t->turma_id === $this->emitivel->id);

        $this->assertContains(
            $reprovada->id,
            array_map(fn (EmissionPanelEnrollmentData $e) => $e->enrollment_id, $turma->enrollments),
        );
        $this->assertNotContains($reprovada->id, $this->matriculasEmissiveisNoPainel());
    }

    /**
     * O template vigente de UM curso se resolve pela mesma fonte da lista, mas
     * filtrando no SQL: a emissão roda dentro da transação, e carregar a tabela
     * inteira de templates ali era o preço escondido da fonte única (B1).
     */
    public function test_template_de_um_curso_e_filtrado_na_consulta_e_nao_em_php(): void
    {
        $outro = $this->makeCourse(['name' => 'Otro Curso']);
        CourseCertificateTemplate::create([
            'course_id' => $outro->id,
            'version' => 1,
            'layout_config' => ['city' => 'Valparaíso'],
        ]);
        $carregados = [];
        DB::listen(function (QueryExecuted $query) use (&$carregados): void {
            if (str_contains($query->sql, 'from "course_certificate_templates"')) {
                $carregados[] = $query->sql;
            }
        });

        $template = app(CertificateTemplateResolver::class)->latestForCourse($this->course->id);

        $this->assertSame($this->course->id, $template->course_id);
        $this->assertCount(1, $carregados);
        $this->assertStringContainsString('"course_id" = ?', $carregados[0]);
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
        return collect(app(EmissionPanelQuery::class)->get())
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
     * entre os sete cenários deste setUp (o default do builder repetiria o
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
