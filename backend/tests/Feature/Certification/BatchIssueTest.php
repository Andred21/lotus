<?php

namespace Tests\Feature\Certification;

use App\Domains\Certification\Actions\IssueCertificateAction;
use App\Domains\Certification\Models\Certificate;
use App\Domains\Identity\Models\Redator;
use App\Domains\Identity\Models\Student;
use App\Domains\Identity\Models\User;
use App\Domains\Operation\Enums\EnrollmentApprovalStatus;
use App\Domains\Operation\Models\Enrollment;
use App\Domains\Operation\Models\Turma;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\Support\Certification\IssuableEnrollmentBuilder;
use Tests\TestCase;

class BatchIssueTest extends TestCase
{
    use RefreshDatabase;

    private Turma $turma;

    private Enrollment $enrollmentA;

    private Redator $redator;

    protected function setUp(): void
    {
        parent::setUp();

        Carbon::setTestNow('2026-08-05 14:30:00');
        config([
            'app.certificate_issuer.name' => 'OTEC Configurada SpA',
            'app.certificate_issuer.rut' => '76.900.900-9',
        ]);

        $builder = IssuableEnrollmentBuilder::make()->create();
        $this->turma = $builder->turmaModel();
        $this->enrollmentA = $builder->enrollmentModel();
        $this->redator = $builder->redatorModel();
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();

        parent::tearDown();
    }

    /** Segunda matrícula emitível na MESMA turma do setUp, aluno novo. */
    private function segundaMatricula(): Enrollment
    {
        $student = Student::create([
            'user_id' => User::factory()->aluno()->create()->id,
            'current_client_id' => $this->turma->quote->budget->client_id,
        ]);

        return Enrollment::create([
            'turma_id' => $this->turma->id,
            'student_id' => $student->id,
            'grades' => ['final' => 6.2],
            'attendance_pct' => '87.50',
            'approval_status' => EnrollmentApprovalStatus::Aprobado,
        ]);
    }

    public function test_lote_de_dois_emitiveis_emite_ambos_com_codigos_sequenciais(): void
    {
        $admin = $this->actingAsAdmin();
        $enrollmentB = $this->segundaMatricula();

        $response = $this->postJson($this->batchUrl(), [
            'enrollment_ids' => [$this->enrollmentA->id, $enrollmentB->id],
            'redator_id' => $this->redator->id,
        ])->assertOk();

        $response->assertJsonPath('0.ok', true)
            ->assertJsonPath('0.enrollment_id', $this->enrollmentA->id)
            ->assertJsonPath('1.ok', true)
            ->assertJsonPath('1.enrollment_id', $enrollmentB->id);

        $codigos = collect($response->json())->pluck('codigo');
        $this->assertSame(['LOT-2026-1000', 'LOT-2026-1001'], $codigos->all());

        $this->assertDatabaseCount('certificates', 2);

        Certificate::query()->get()->each(function (Certificate $certificate) use ($admin) {
            $audit = $certificate->audits()->sole();
            $this->assertSame('created', $audit->event);
            $this->assertSame($admin->id, $audit->user_id);
        });
    }

    public function test_lote_com_um_ja_emitido_reporta_falha_do_item_sem_impedir_o_outro(): void
    {
        $this->actingAsAdmin();
        $enrollmentB = $this->segundaMatricula();
        $this->emitirIndividualmente($enrollmentB);

        $response = $this->postJson($this->batchUrl(), [
            'enrollment_ids' => [$this->enrollmentA->id, $enrollmentB->id],
            'redator_id' => $this->redator->id,
        ])->assertOk();

        $response->assertJsonPath('0.ok', true)
            ->assertJsonPath('0.enrollment_id', $this->enrollmentA->id)
            ->assertJsonPath('1.ok', false)
            ->assertJsonPath('1.enrollment_id', $enrollmentB->id)
            ->assertJsonPath('1.codigo', null)
            ->assertJsonPath('1.certificate_id', null);

        $this->assertStringContainsString(
            'Ya existe un certificado vigente',
            $response->json('1.error'),
        );

        // 1 do emitirIndividualmente() + 1 do item ok do lote = 2. O item
        // falho NÃO cria um terceiro registro.
        $this->assertDatabaseCount('certificates', 2);
    }

    public function test_item_falho_nao_consome_numero_sequencial(): void
    {
        $this->actingAsAdmin();
        $enrollmentB = $this->segundaMatricula();
        $this->emitirIndividualmente($enrollmentB);

        // enrollmentB já emitido acima como LOT-2026-1000. O lote abaixo tem
        // enrollmentA (emitível) e enrollmentB (já emitido, falha).
        $this->postJson($this->batchUrl(), [
            'enrollment_ids' => [$this->enrollmentA->id, $enrollmentB->id],
            'redator_id' => $this->redator->id,
        ])->assertOk();

        $enrollmentC = $this->segundaMatricula();

        $response = $this->postJson($this->issueUrl($enrollmentC), [
            'redator_id' => $this->redator->id,
        ])->assertCreated();

        // O item falho não avançou a sequência: o próximo código emitido é
        // contíguo ao último emitido com sucesso (LOT-2026-1000 do
        // emitirIndividualmente, LOT-2026-1001 do enrollmentA no lote).
        $response->assertJsonPath('codigo', 'LOT-2026-1002');
    }

    public function test_enrollment_ids_vazio_retorna_422(): void
    {
        $this->actingAsAdmin();

        $this->postJson($this->batchUrl(), [
            'enrollment_ids' => [],
            'redator_id' => $this->redator->id,
        ])->assertStatus(422)->assertJsonValidationErrors('enrollment_ids');
    }

    public function test_enrollment_id_inexistente_retorna_422(): void
    {
        $this->actingAsAdmin();

        $this->postJson($this->batchUrl(), [
            'enrollment_ids' => [999999],
            'redator_id' => $this->redator->id,
        ])->assertStatus(422)->assertJsonValidationErrors('enrollment_ids.0');
    }

    public function test_redator_id_inexistente_retorna_422(): void
    {
        $this->actingAsAdmin();

        $this->postJson($this->batchUrl(), [
            'enrollment_ids' => [$this->enrollmentA->id],
            'redator_id' => 999999,
        ])->assertStatus(422)->assertJsonValidationErrors('redator_id');
    }

    /**
     * Discriminante do Finding 1: `exists:enrollments,id` consulta a tabela
     * crua e não respeita soft delete — a matrícula soft-deletada ainda
     * "existe" para a regra do DTO, mas `Enrollment::query()` (com o global
     * scope do `SoftDeletes`) não a encontra. Contra o controller sem o
     * fix, isso estoura `ModelNotFoundException` dentro do `map()`, sem
     * `catch`, e a exceção sobe como 404 — escondendo o certificado do item
     * 1, que JÁ foi commitado (não há transação externa). O relatório por
     * item existe exatamente para impedir isto.
     */
    public function test_lote_com_enrollment_id_soft_deletado_reporta_falha_do_item_sem_impedir_o_outro(): void
    {
        $this->actingAsAdmin();
        $enrollmentDeletada = $this->segundaMatricula();
        $enrollmentDeletada->delete();

        $response = $this->postJson($this->batchUrl(), [
            'enrollment_ids' => [$this->enrollmentA->id, $enrollmentDeletada->id],
            'redator_id' => $this->redator->id,
        ])->assertOk();

        $response->assertJsonPath('0.ok', true)
            ->assertJsonPath('0.enrollment_id', $this->enrollmentA->id)
            ->assertJsonPath('1.ok', false)
            ->assertJsonPath('1.enrollment_id', $enrollmentDeletada->id)
            ->assertJsonPath('1.codigo', null)
            ->assertJsonPath('1.certificate_id', null);

        $this->assertSame('LOT-2026-1000', $response->json('0.codigo'));
        $this->assertNotNull($response->json('1.error'));

        // O item 1 já foi commitado (sem transação externa) e deve estar
        // visível no relatório e no banco, mesmo com o item 2 irresolúvel.
        $this->assertDatabaseCount('certificates', 1);
        $this->assertDatabaseHas('certificates', [
            'enrollment_id' => $this->enrollmentA->id,
            'codigo' => 'LOT-2026-1000',
        ]);
    }

    public function test_usuario_sem_permissao_issue_retorna_403(): void
    {
        $this->seed(RolePermissionSeeder::class);
        $user = User::factory()->redator()->create(['is_active' => true]);
        $user->assignRole('redator');
        $this->actingAs($user, 'web');

        $this->postJson($this->batchUrl(), [
            'enrollment_ids' => [$this->enrollmentA->id],
            'redator_id' => $this->redator->id,
        ])->assertForbidden();
    }

    public function test_redator_nao_designado_reporta_falha_em_todos_os_itens(): void
    {
        $this->actingAsAdmin();
        $enrollmentB = $this->segundaMatricula();

        // Redator real, mas nunca designado NESTA turma (porta 6).
        $outroRedator = Redator::create([
            'user_id' => User::factory()->redator()->create()->id,
        ]);

        $response = $this->postJson($this->batchUrl(), [
            'enrollment_ids' => [$this->enrollmentA->id, $enrollmentB->id],
            'redator_id' => $outroRedator->id,
        ])->assertOk();

        $response->assertJsonPath('0.ok', false)
            ->assertJsonPath('1.ok', false);

        $this->assertStringContainsString(
            'El redactor no está designado en esta clase.',
            $response->json('0.error'),
        );

        $this->assertDatabaseCount('certificates', 0);
    }

    public function test_falha_inesperada_no_meio_do_lote_preserva_o_que_ja_saiu(): void
    {
        $this->actingAsAdmin();
        $enrollmentB = $this->segundaMatricula();

        // O lote roda item a item, SEM transação externa — está escrito no
        // comentário do `CertificateController::batch` e é o que faz um item
        // recusado virar linha do relatório em vez de derrubar o request.
        // Esta guarda existe porque o resto da suíte não vê a diferença:
        // envolver o loop inteiro num `DB::transaction` deixa os nove testes
        // verdes (medido em 2026-08-08, no gate do bloco) e ainda assim apaga
        // um certificado já emitido quando o item seguinte estoura — um
        // documento com peso legal desaparecendo em silêncio.
        $real = app(IssueCertificateAction::class);
        $fake = \Mockery::mock(IssueCertificateAction::class);
        $fake->shouldReceive('execute')->once()->ordered()
            ->andReturnUsing(fn (Enrollment $e, Redator $r) => $real->execute($e, $r));
        $fake->shouldReceive('execute')->once()->ordered()
            ->andThrow(new \RuntimeException('falha inesperada no meio do lote'));
        $this->instance(IssueCertificateAction::class, $fake);

        $this->postJson($this->batchUrl(), [
            'enrollment_ids' => [$this->enrollmentA->id, $enrollmentB->id],
            'redator_id' => $this->redator->id,
        ])->assertStatus(500);

        $this->assertDatabaseCount('certificates', 1);
    }

    private function emitirIndividualmente(Enrollment $enrollment): void
    {
        $this->postJson($this->issueUrl($enrollment), [
            'redator_id' => $this->redator->id,
        ])->assertCreated();
    }

    private function issueUrl(Enrollment $enrollment): string
    {
        return "/api/enrollments/{$enrollment->id}/certificate";
    }

    private function batchUrl(): string
    {
        return '/api/certificates/batch';
    }
}
