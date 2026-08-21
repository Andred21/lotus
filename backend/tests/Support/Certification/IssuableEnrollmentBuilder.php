<?php

namespace Tests\Support\Certification;

use App\Domains\Catalog\Models\Course;
use App\Domains\Catalog\Models\CourseCertificateTemplate;
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
use Tests\Support\CreatesCertificateTemplates;
use Tests\Support\CreatesDomainRecords;

/**
 * Cenário "matrícula emitível" nomeado pelas portas do `CertificateEligibility`
 * (B7). O default de `make()->create()` passa nas seis portas; cada método de
 * desvio nomeia a porta que ele fecha, uma de cada vez — é o que deixa um
 * teste dizer "este cenário falha por CAUSA DESTA porta" em vez de re-derivar
 * a cadeia inteira à mão.
 *
 * "Já emitido" fica de fora de propósito (D-P4, plano B4-B7): não existe
 * `jaEmitido()`. Certificado vigente é ato do teste — via o Action real ou
 * `Certificate::create()` direto no corpo — nunca estado canned de setup.
 */
final class IssuableEnrollmentBuilder
{
    use CreatesCertificateTemplates;
    use CreatesDomainRecords;

    /** @var array<string, mixed> */
    private array $clientOverrides = [];

    /** @var array<string, mixed> */
    private array $clientUserOverrides = [];

    /** @var array<string, mixed> */
    private array $courseOverrides = [];

    /** @var array<string, mixed> */
    private array $turmaOverrides = [];

    /** @var array<string, mixed> */
    private array $studentUserOverrides = [];

    /** @var array<string, mixed> */
    private array $redatorUserOverrides = [];

    /** @var array<string, mixed> */
    private array $templateOverrides = [];

    private bool $turmaConcluida = true;

    private bool $matriculaAprovada = true;

    private bool $comTemplate = true;

    private bool $templateComCidade = true;

    private bool $redatorDesignado = true;

    private ?Client $client = null;

    private ?Course $course = null;

    private ?Turma $turma = null;

    private ?Enrollment $enrollment = null;

    private ?Redator $redator = null;

    private ?CourseCertificateTemplate $template = null;

    public static function make(): self
    {
        return new self;
    }

    // ── desvios de porta — cada um fecha UMA porta do CertificateEligibility ──

    /** Porta 1 (RN-08): turma não concluída. */
    public function turmaNaoConcluida(): self
    {
        $this->turmaConcluida = false;

        return $this;
    }

    /** Porta 2: matrícula sem approval_status aprobado. */
    public function resultadoPendiente(): self
    {
        $this->matriculaAprovada = false;

        return $this;
    }

    /** Porta 4: curso sem template de certificado. */
    public function semTemplate(): self
    {
        $this->comTemplate = false;

        return $this;
    }

    /** Porta 5 (turma online sem city): template sem cidade de emissão válida. */
    public function templateSemCidade(): self
    {
        $this->templateComCidade = false;

        return $this;
    }

    /** Porta 6: redator não designado na turma. */
    public function semRedator(): self
    {
        $this->redatorDesignado = false;

        return $this;
    }

    // ── overrides pontuais — o dado às vezes É a asserção (CreatesDomainRecords) ──

    public function client(array $overrides = [], array $userOverrides = []): self
    {
        $this->clientOverrides = $overrides;
        $this->clientUserOverrides = $userOverrides;

        return $this;
    }

    public function course(array $overrides = []): self
    {
        $this->courseOverrides = $overrides;

        return $this;
    }

    public function turma(array $overrides = []): self
    {
        $this->turmaOverrides = $overrides;

        return $this;
    }

    public function student(array $userOverrides = []): self
    {
        $this->studentUserOverrides = $userOverrides;

        return $this;
    }

    public function redatorUser(array $userOverrides = []): self
    {
        $this->redatorUserOverrides = $userOverrides;

        return $this;
    }

    public function template(array $overrides = []): self
    {
        $this->templateOverrides = $overrides;

        return $this;
    }

    // ── materialização ──────────────────────────────────────────────────────

    public function create(): self
    {
        $this->assertSemColisaoDePorta();

        $this->client = $this->makeClientWithUser(
            ['legal_name' => 'Empresa Legal SpA', ...$this->clientOverrides],
            ['name' => 'Empresa Cliente', 'rut' => '76.123.456-7', ...$this->clientUserOverrides],
        );

        // `code` fica null de propósito: é `unique`, e nenhuma asserção nos
        // 8 arquivos lê o código do orçamento — só o `client_id` importa aqui.
        // Um literal fixo colidiria assim que um teste materializasse mais de
        // uma cadeia (ex.: CertificateEligibilityTest, sete cadeias por setUp).
        $budget = Budget::create([
            'client_id' => $this->client->id,
            'code' => null,
        ]);

        $this->course = $this->makeCourse([
            'name' => 'Seguridad en Alta Tensión',
            'technical_name' => 'Operación Segura AT',
            'workload_hours' => 16,
            ...$this->courseOverrides,
        ]);

        $quote = Quote::forceCreate([
            'budget_id' => $budget->id,
            'course_id' => $this->course->id,
            'seq_in_budget' => 1,
            'student_count' => 1,
            'value_uf' => 10,
            'status' => 'approved',
        ]);

        $this->turma = Turma::create([
            'quote_id' => $quote->id,
            'course_id' => $this->course->id,
            'modalidade' => TurmaModalidade::Online,
            'local_aplicacao' => null,
            'start_date' => '2026-07-20',
            'end_date' => '2026-07-24',
            'status' => $this->turmaConcluida ? TurmaStatus::Concluida : TurmaStatus::EmAndamento,
            ...$this->turmaOverrides,
        ]);

        $student = Student::create([
            'user_id' => User::factory()->aluno()->create([
                'name' => 'Juan Pérez',
                'rut' => '12.345.678-5',
                ...$this->studentUserOverrides,
            ])->id,
            'current_client_id' => $this->client->id,
        ]);

        $this->enrollment = Enrollment::create([
            'turma_id' => $this->turma->id,
            'student_id' => $student->id,
            'grades' => ['final' => 6.2],
            'attendance_pct' => '87.50',
            'approval_status' => $this->matriculaAprovada
                ? EnrollmentApprovalStatus::Aprobado
                : EnrollmentApprovalStatus::Pendiente,
        ]);

        $this->redator = Redator::create([
            'user_id' => User::factory()->redator()->create([
                'name' => 'María Relatora',
                'rut' => '9.876.543-3',
                ...$this->redatorUserOverrides,
            ])->id,
        ]);

        if ($this->redatorDesignado) {
            $this->turma->redatores()->attach($this->redator);
        }

        if ($this->comTemplate) {
            $layoutConfig = $this->templateComCidade ? ['city' => 'Santiago'] : [];

            $this->template = $this->makeTemplate($this->course->id, [
                'version' => 1,
                'layout_config' => $layoutConfig,
                'validity_months' => null,
                ...$this->templateOverrides,
            ]);
        }

        return $this;
    }

    /**
     * Override e desvio de porta escrevem a MESMA chave, e o override é
     * aplicado por último — `->turmaNaoConcluida()->turma(['status' => X])`
     * desligava a porta em silêncio, e o teste passava a provar outra coisa.
     * Colisão vira erro alto: o cenário se declara por um caminho só.
     */
    private function assertSemColisaoDePorta(): void
    {
        $colisoes = [
            'turmaNaoConcluida()' => ! $this->turmaConcluida && array_key_exists('status', $this->turmaOverrides),
            'templateSemCidade()' => ! $this->templateComCidade && array_key_exists('layout_config', $this->templateOverrides),
        ];

        foreach (array_filter($colisoes) as $desvio => $_) {
            throw new \LogicException(
                "IssuableEnrollmentBuilder: {$desvio} já define essa chave; o override a sobrescreveria em silêncio. Use um dos dois.",
            );
        }
    }

    // ── acessores pós-create ────────────────────────────────────────────────

    public function turmaModel(): Turma
    {
        return $this->turma;
    }

    public function enrollmentModel(): Enrollment
    {
        return $this->enrollment;
    }

    public function redatorModel(): Redator
    {
        return $this->redator;
    }

    public function courseModel(): Course
    {
        return $this->course;
    }

    public function clientModel(): Client
    {
        return $this->client;
    }

    public function templateModel(): ?CourseCertificateTemplate
    {
        return $this->template;
    }
}
