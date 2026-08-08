<?php

namespace Tests\Feature\Certification;

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
        ])->assertUnprocessable();
    }

    public function test_enrollment_id_inexistente_retorna_422(): void
    {
        $this->actingAsAdmin();

        $this->postJson($this->batchUrl(), [
            'enrollment_ids' => [999999],
            'redator_id' => $this->redator->id,
        ])->assertUnprocessable();
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
