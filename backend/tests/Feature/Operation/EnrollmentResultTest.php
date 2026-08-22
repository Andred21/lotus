<?php

namespace Tests\Feature\Operation;

use App\Domains\Commercial\Models\Budget;
use App\Domains\Commercial\Models\Quote;
use App\Domains\Identity\Models\User;
use App\Domains\Operation\Actions\EnrollStudentAction;
use App\Domains\Operation\Actions\RecordEnrollmentResultAction;
use App\Domains\Operation\Data\EnrollmentResultData;
use App\Domains\Operation\Enums\EnrollmentApprovalStatus;
use App\Domains\Operation\Enums\TurmaModalidade;
use App\Domains\Operation\Enums\TurmaStatus;
use App\Domains\Operation\Http\Controllers\EnrollmentController;
use App\Domains\Operation\Models\Enrollment;
use App\Domains\Operation\Models\Turma;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\Support\CreatesDomainRecords;
use Tests\TestCase;

class EnrollmentResultTest extends TestCase
{
    use CreatesDomainRecords;
    use RefreshDatabase;

    private Enrollment $enrollment;

    private Turma $turma;

    protected function setUp(): void
    {
        parent::setUp();

        $client = $this->makeClientWithUser();
        $budget = Budget::create(['client_id' => $client->id, 'code' => 'Scap 1']);
        $course = $this->makeCourse();
        $quote = Quote::forceCreate([
            'budget_id' => $budget->id,
            'course_id' => $course->id,
            'seq_in_budget' => 1,
            'student_count' => 5,
            'value_uf' => 10,
            'status' => 'approved',
        ]);
        $this->turma = Turma::create([
            'quote_id' => $quote->id,
            'course_id' => $course->id,
            'modalidade' => TurmaModalidade::Online,
            'local_aplicacao' => null,
            'start_date' => '2026-08-01',
            'end_date' => '2026-08-10',
            'status' => TurmaStatus::EmAndamento,
        ]);
        $this->enrollment = app(EnrollStudentAction::class)->execute(
            $this->turma,
            '11.111.111-1',
            'Juan Soto',
            'juan@acme.cl',
            null,
        )->enrollment;
    }

    public function test_admin_registra_resultado_academico(): void
    {
        $this->actingAsAdmin();

        $this->putJson($this->resultUrl(), [
            'grades' => ['final' => 6.5],
            'attendance_pct' => '92.50',
            'approval_status' => 'aprobado',
        ])
            ->assertOk()
            ->assertJsonPath('grades.final', 6.5)
            ->assertJsonPath('attendance_pct', '92.50')
            ->assertJsonPath('approval_status', 'aprobado');

        $fresh = $this->enrollment->fresh();
        $this->assertSame(['final' => 6.5], $fresh->grades);
        $this->assertSame('92.50', $fresh->attendance_pct);
        $this->assertSame(EnrollmentApprovalStatus::Aprobado, $fresh->approval_status);
    }

    /**
     * B5 — `refresh()` dentro de `RecordEnrollmentResultAction` derruba as
     * relações carregadas, e o `result` nunca re-carregava `turma`/
     * `student.user` antes de montar o DTO. Em produção isso lazy-loada em
     * silêncio (o teste HTTP acima passa mesmo com o bug); é exatamente o
     * tipo de N+1 silencioso que o projeto quer pegar.
     *
     * Por isso este teste chama o controller diretamente (em vez de
     * `putJson`): o `Model::preventLazyLoading()` do Eloquent só marca
     * `preventsLazyLoading = true` na instância quando ela vem de um
     * `hydrate()` com MAIS de uma linha (`Builder::hydrate()`, condicional a
     * `count($items) > 1` — ver vendor/laravel/framework
     * .../Eloquent/Builder.php:477). Um fetch singular — como o
     * route-model-binding de `{enrollment}` deste endpoint, sempre 1 linha —
     * nunca ativa a proteção, então via HTTP puro o teste nunca reproduziria
     * o bug (confirmado empiricamente: passa igual nos dois estados do
     * código). Aqui a matrícula é hidratada via `get()` com >1 linha — o
     * mesmo padrão que dispararia a proteção num cenário real de N+1 em
     * lote — antes de entrar no MESMO caminho de código do controller.
     */
    public function test_result_nao_lazy_loada_apos_refresh(): void
    {
        $this->actingAsAdmin();

        // Segunda matrícula só para o hydrate() abaixo vir com >1 linha.
        app(EnrollStudentAction::class)->execute(
            $this->turma,
            '22.222.222-2',
            'Pedro Diaz',
            'pedro@acme.cl',
            null,
        );

        Model::preventLazyLoading();

        try {
            $enrollment = Enrollment::query()->get()->firstWhere('id', $this->enrollment->id);

            $result = app(EnrollmentController::class)->result(
                new EnrollmentResultData(
                    grades: ['final' => 6.5],
                    attendance_pct: '92.50',
                    approval_status: EnrollmentApprovalStatus::Aprobado,
                ),
                $this->turma,
                $enrollment,
                app(RecordEnrollmentResultAction::class),
            );

            $this->assertSame('Juan Soto', $result->name);
            $this->assertSame('11.111.111-1', $result->rut);
        } finally {
            Model::preventLazyLoading(false);
        }
    }

    public function test_turma_concluida_recusa_resultado_com_rn15(): void
    {
        $this->actingAsAdmin();
        $this->turma->update(['status' => TurmaStatus::Concluida]);

        $this->putJson($this->resultUrl(), $this->validPayload())
            ->assertUnprocessable()
            ->assertJsonPath(
                'errors.turma.0',
                'La clase ya fue concluida: el registro académico está bloqueado (RN-15).',
            );
    }

    public function test_presenca_fora_do_intervalo_recusa(): void
    {
        $this->actingAsAdmin();

        $this->putJson($this->resultUrl(), [
            ...$this->validPayload(),
            'attendance_pct' => '100.01',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('attendance_pct');
    }

    public function test_status_de_aprovacao_fora_do_enum_recusa(): void
    {
        $this->actingAsAdmin();

        $this->putJson($this->resultUrl(), [
            ...$this->validPayload(),
            'approval_status' => 'dispensado',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('approval_status');
    }

    public function test_matricula_de_outra_turma_retorna_404(): void
    {
        $this->actingAsAdmin();

        $otherQuote = Quote::forceCreate([
            'budget_id' => $this->turma->quote->budget_id,
            'course_id' => $this->turma->course_id,
            'seq_in_budget' => 2,
            'student_count' => 5,
            'value_uf' => 10,
            'status' => 'approved',
        ]);
        $otherTurma = Turma::create([
            'quote_id' => $otherQuote->id,
            'course_id' => $this->turma->course_id,
            'modalidade' => TurmaModalidade::Online,
            'local_aplicacao' => null,
            'start_date' => '2026-09-01',
            'end_date' => '2026-09-10',
            'status' => TurmaStatus::EmAndamento,
        ]);

        $this->putJson(
            "/api/turmas/{$otherTurma->id}/alunos/{$this->enrollment->id}/resultado",
            $this->validPayload(),
        )->assertNotFound();
    }

    public function test_usuario_sem_permissao_retorna_403(): void
    {
        $this->seed(RolePermissionSeeder::class);
        // Designado à turma (passa o binding da Task 2) mas sem role nenhuma
        // (nenhuma permissão) — senão a checagem de ownership 404 antes da de
        // permissão rodar, e o teste provaria a porta errada.
        $user = User::factory()->create(['type' => 'redator', 'is_active' => true]);
        $redator = $user->redator()->create([]);
        $this->turma->redatores()->attach($redator->id);
        $this->actingAs($user, 'web');

        $this->putJson($this->resultUrl(), $this->validPayload())->assertForbidden();
    }

    public function test_redator_pode_registrar_resultado_na_turma_designada(): void
    {
        $this->seed(RolePermissionSeeder::class);
        $user = User::factory()->redator()->create(['is_active' => true]);
        $user->assignRole('redator');
        $redator = $user->redator()->create([]);
        $this->turma->redatores()->attach($redator->id);
        $this->actingAs($user, 'web');

        $this->putJson($this->resultUrl(), $this->validPayload())->assertOk();
    }

    /**
     * B6 — o que não dá para imprimir no certificado é recusado NA ESCRITA,
     * não só filtrado na leitura do snapshot (`SnapshotResultData::finalGrade`).
     *
     * @return iterable<string, array{0: mixed}>
     */
    public static function notaNaoImprimivelProvider(): iterable
    {
        yield 'array' => [['parcial' => 5]];
        yield 'booleano false' => [false];
        yield 'booleano true' => [true];
        yield 'string vazia' => [''];
        yield 'string só espaço' => ['   '];
        yield 'null explícito' => [null];
    }

    #[DataProvider('notaNaoImprimivelProvider')]
    public function test_nota_final_nao_imprimivel_reprova_a_escrita(mixed $notaNaoImprimivel): void
    {
        $this->actingAsAdmin();

        $this->putJson($this->resultUrl(), [
            ...$this->validPayload(),
            'grades' => ['final' => $notaNaoImprimivel],
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors([
                'grades.final' => 'La nota final debe ser un número o un texto no vacío.',
            ]);
    }

    /**
     * B6 — a vírgula chilena (`"6,4"`) continua aceita, junto com float e int:
     * a regra é sobre IMPRIMIBILIDADE, não sobre um formato numérico único.
     *
     * @return iterable<string, array{0: mixed}>
     */
    public static function notaImprimivelProvider(): iterable
    {
        yield 'string com vírgula chilena' => ['6,4'];
        yield 'float' => [6.4];
        yield 'int' => [6];
    }

    #[DataProvider('notaImprimivelProvider')]
    public function test_nota_final_imprimivel_aceita_virgula_chilena_float_e_int(mixed $notaImprimivel): void
    {
        $this->actingAsAdmin();

        $this->putJson($this->resultUrl(), [
            ...$this->validPayload(),
            'grades' => ['final' => $notaImprimivel],
        ])->assertOk();
    }

    /**
     * `grades` é nullable/opcional (RN do 6d): faltar por inteiro continua
     * válido — só quando `final` é ENVIADO explicitamente a regra entra.
     */
    public function test_resultado_sem_grades_permanece_valido(): void
    {
        $this->actingAsAdmin();

        $payload = $this->validPayload();
        unset($payload['grades']);

        $this->putJson($this->resultUrl(), $payload)->assertOk();
    }

    /** @return array{grades: array{final: float}, attendance_pct: string, approval_status: string} */
    private function validPayload(): array
    {
        return [
            'grades' => ['final' => 6.5],
            'attendance_pct' => '92.50',
            'approval_status' => 'aprobado',
        ];
    }

    private function resultUrl(): string
    {
        return "/api/turmas/{$this->turma->id}/alunos/{$this->enrollment->id}/resultado";
    }
}
