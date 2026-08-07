<?php

namespace Tests\Feature\Certification;

use App\Domains\Catalog\Models\Course;
use App\Domains\Catalog\Models\CourseCertificateTemplate;
use App\Domains\Certification\Enums\CertificateStatus;
use App\Domains\Certification\Models\Certificate;
use App\Domains\Certification\Services\CertificateEligibility;
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
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
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

    private Budget $budget;

    private Course $course;

    private Redator $redator;

    private int $seq = 0;

    /** @var array<string, Turma> */
    private array $reprovadas = [];

    private Turma $emitivel;

    protected function setUp(): void
    {
        parent::setUp();

        Carbon::setTestNow('2026-08-05 10:00:00');

        $this->client = $this->makeClientWithUser(
            ['legal_name' => 'Empresa Legal SpA'],
            ['name' => 'Empresa Cliente', 'rut' => '76.123.456-7'],
        );
        $this->budget = Budget::create(['client_id' => $this->client->id, 'code' => 'Scap 1']);
        $this->course = $this->makeCourse(['name' => 'Seguridad en Alta Tensión']);
        CourseCertificateTemplate::create([
            'course_id' => $this->course->id,
            'version' => 1,
            'layout_config' => ['city' => 'Santiago'],
            'validity_months' => null,
        ]);
        $this->redator = Redator::create([
            'user_id' => User::factory()->redator()->create(['name' => 'María Relatora'])->id,
        ]);

        // A única que passa nas seis portas.
        $this->emitivel = $this->makeTurma();
        $this->makeEnrollment($this->emitivel);

        // Uma por porta fechada, e cada nome é a porta que ela fecha.
        $this->reprovadas['turma não concluída'] = tap(
            $this->makeTurma(),
            fn (Turma $turma) => $this->makeEnrollment($turma),
        );
        $this->reprovadas['turma não concluída']->update(['status' => TurmaStatus::EmAndamento]);

        $this->reprovadas['matrícula reprovada'] = tap(
            $this->makeTurma(),
            fn (Turma $turma) => $this->makeEnrollment($turma, EnrollmentApprovalStatus::Reprobado),
        );

        $this->reprovadas['certificado vigente'] = tap(
            $this->makeTurma(),
            function (Turma $turma): void {
                $enrollment = $this->makeEnrollment($turma);
                Certificate::create([
                    'uuid' => (string) Str::uuid(),
                    'enrollment_id' => $enrollment->id,
                    'course_id' => $turma->course_id,
                    'redator_id' => $this->redator->id,
                    'codigo' => 'LOT-2026-1000',
                    'snapshot' => ['aluno' => ['name' => 'Ya certificado']],
                    'valido_ate' => null,
                    'status' => CertificateStatus::Emitido,
                    'revoked_at' => null,
                    'revocation_reason' => null,
                ]);
            },
        );

        $cursoSemTemplate = $this->makeCourse(['name' => 'Curso sin plantilla']);
        $this->reprovadas['curso sem template'] = tap(
            $this->makeTurma($cursoSemTemplate),
            fn (Turma $turma) => $this->makeEnrollment($turma),
        );

        $cursoSemCidade = $this->makeCourse(['name' => 'Curso sin ciudad']);
        CourseCertificateTemplate::create([
            'course_id' => $cursoSemCidade->id,
            'version' => 1,
            'layout_config' => [],
            'validity_months' => null,
        ]);
        $this->reprovadas['sem cidade de emissão'] = tap(
            $this->makeTurma($cursoSemCidade),
            fn (Turma $turma) => $this->makeEnrollment($turma),
        );
        $this->reprovadas['sem cidade de emissão']->update([
            'modalidade' => TurmaModalidade::Online,
            'local_aplicacao' => null,
        ]);

        $this->reprovadas['sem redator designado'] = tap(
            $this->makeTurma(designaRedator: false),
            fn (Turma $turma) => $this->makeEnrollment($turma),
        );
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

    private function makeTurma(?Course $course = null, bool $designaRedator = true): Turma
    {
        $course ??= $this->course;
        $quote = Quote::create([
            'budget_id' => $this->budget->id,
            'course_id' => $course->id,
            'seq_in_budget' => ++$this->seq,
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

        if ($designaRedator) {
            $turma->redatores()->attach($this->redator);
        }

        return $turma;
    }

    private function makeEnrollment(
        Turma $turma,
        EnrollmentApprovalStatus $status = EnrollmentApprovalStatus::Aprobado,
    ): Enrollment {
        $student = Student::create([
            'user_id' => User::factory()->aluno()->create([
                'name' => 'Alumno '.++$this->seq,
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
}
