<?php

namespace Tests\Feature\Certification;

use App\Domains\Catalog\Models\Course;
use App\Domains\Catalog\Models\CourseCertificateTemplate;
use App\Domains\Certification\Enums\CertificateStatus;
use App\Domains\Certification\Models\Certificate;
use App\Domains\Certification\Services\CertificateEligibility;
use App\Domains\Certification\Services\CertificateTemplateResolver;
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
 * A prova de que as duas faces das seis portas concordam (B1). Não é teste de
 * endpoint: é a invariante que mata a classe de bug "a lista promete um
 * certificado que o POST recusa com 422", nos DOIS sentidos.
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

        $this->reprovadas['matrícula reprovada'] = $this->reprovadaBuilder()
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
     * Sentido 1 — o que a lista promete, a emissão cumpre. Sem isto o admin
     * clica numa turma que a tela ofereceu e leva 422.
     */
    public function test_toda_matricula_listada_passa_nas_portas_da_emissao(): void
    {
        $eligibility = app(CertificateEligibility::class);
        $turmas = $eligibility->issuableTurmas();

        $this->assertCount(1, $turmas);
        $this->assertSame($this->emitivel->id, $turmas->first()->id);

        foreach ($turmas as $turma) {
            $this->assertNotEmpty($turma->enrollments);

            foreach ($turma->enrollments as $enrollment) {
                $context = $eligibility->assert($enrollment, $this->redator);

                $this->assertSame($turma->id, $context->turma->id);
                $this->assertSame('Santiago', $context->ciudadEmision);
            }
        }
    }

    /**
     * Sentido 2 — o que a emissão recusa, a lista esconde. Uma turma por porta,
     * para uma porta esquecida numa das faces aparecer como falha nomeada.
     */
    public function test_toda_turma_que_a_emissao_recusa_fica_fora_da_lista(): void
    {
        $eligibility = app(CertificateEligibility::class);
        $listadas = $eligibility->issuableTurmas()->pluck('id')->all();

        foreach ($this->reprovadas as $porta => $turma) {
            $this->assertNotContains($turma->id, $listadas, "A lista mostrou a turma que fecha a porta: {$porta}.");

            $enrollment = $turma->enrollments()->sole();

            try {
                $eligibility->assert($enrollment, $this->redator);
                $this->fail("A emissão aceitou a turma que fecha a porta: {$porta}.");
            } catch (ValidationException $exception) {
                $this->assertNotEmpty($exception->errors());
            }
        }
    }

    /**
     * A lista devolve a turma, mas só com as matrículas emitíveis dentro: uma
     * matrícula reprovada na mesma turma não pode chegar à tela de emissão.
     */
    public function test_lista_traz_a_turma_sem_as_matriculas_que_nao_passam(): void
    {
        $reprovada = $this->makeEnrollment($this->emitivel, EnrollmentApprovalStatus::Reprobado);

        $turma = app(CertificateEligibility::class)->issuableTurmas()->sole();

        $this->assertNotContains(
            $reprovada->id,
            $turma->enrollments->pluck('id')->all(),
        );
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
     * Cada reprovada nasce da própria cadeia via o builder — só o RUT sai
     * nulo, para não colidir com o índice único de `users.rut` entre os sete
     * cenários criados neste setUp (o default do builder repetiria o mesmo
     * RUT em cada instância).
     */
    private function reprovadaBuilder(): IssuableEnrollmentBuilder
    {
        return IssuableEnrollmentBuilder::make()
            ->client([], ['rut' => null])
            ->student(['rut' => null])
            ->redatorUser(['rut' => null]);
    }

    /** Matrícula extra na turma `$turma`, fora da cadeia do builder. */
    private function makeEnrollment(
        Turma $turma,
        EnrollmentApprovalStatus $status = EnrollmentApprovalStatus::Aprobado,
    ): Enrollment {
        $student = Student::create([
            'user_id' => User::factory()->aluno()->create()->id,
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
