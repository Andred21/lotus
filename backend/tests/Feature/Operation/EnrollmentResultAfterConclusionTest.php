<?php

namespace Tests\Feature\Operation;

use App\Domains\Certification\Actions\IssueCertificateAction;
use App\Domains\Certification\Enums\CertificateStatus;
use App\Domains\Certification\Models\Certificate;
use App\Domains\Identity\Models\Student;
use App\Domains\Identity\Models\User;
use App\Domains\Operation\Data\EnrollmentData;
use App\Domains\Operation\Enums\EnrollmentApprovalStatus;
use App\Domains\Operation\Models\Enrollment;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\Certification\IssuableEnrollmentBuilder;
use Tests\TestCase;

/**
 * Bloco 41: depois da conclusão da turma, o ADMIN ainda corrige o resultado
 * acadêmico enquanto a matrícula não tem certificado vigente; o redator não.
 * Certificado emitido tranca; revogado destranca.
 */
class EnrollmentResultAfterConclusionTest extends TestCase
{
    use RefreshDatabase;

    private IssuableEnrollmentBuilder $cenario;

    protected function setUp(): void
    {
        parent::setUp();

        $this->cenario = IssuableEnrollmentBuilder::make()->create();
    }

    public function test_admin_corrige_resultado_sem_certificado_e_gera_audit(): void
    {
        $this->actingAsAdmin();

        $this->putJson($this->resultUrl(), $this->correcao())
            ->assertOk()
            ->assertJsonPath('grades.final', '5,5')
            ->assertJsonPath('result_locked', false);

        $audit = $this->cenario->enrollmentModel()->audits()->latest('id')->first();
        // A auditoria serializa a coluna JSON como texto.
        $grades = $audit->new_values['grades'];
        $grades = is_string($grades) ? json_decode($grades, true) : $grades;
        $this->assertSame('5,5', $grades['final']);
    }

    public function test_redator_nao_corrige_turma_concluida(): void
    {
        $this->seed(RolePermissionSeeder::class);
        $user = $this->cenario->redatorModel()->user;
        $user->assignRole('redator');
        $this->actingAs($user, 'web');

        $this->putJson($this->resultUrl(), $this->correcao())
            ->assertUnprocessable()
            ->assertJsonPath('errors.turma.0', __('operation.turma.concluded_locked'));

        $this->assertSame(['final' => 6.2], $this->cenario->enrollmentModel()->fresh()->grades);
    }

    public function test_certificado_emitido_tranca(): void
    {
        $this->emitir();
        $this->actingAsAdmin();

        $this->putJson($this->resultUrl(), $this->correcao())
            ->assertUnprocessable()
            ->assertJsonPath('errors.enrollment.0', __('operation.enrollment.result_locked'));

        $fresh = $this->cenario->enrollmentModel()->fresh();
        $this->assertSame(['final' => 6.2], $fresh->grades);
        $this->assertSame('87.50', $fresh->attendance_pct);
    }

    public function test_certificado_revogado_destrava(): void
    {
        $certificado = $this->emitir();
        $certificado->update([
            'status' => CertificateStatus::Revocado,
            'revoked_at' => now(),
            'revocation_reason' => 'erro',
        ]);
        $this->actingAsAdmin();

        $this->putJson($this->resultUrl(), $this->correcao())->assertOk();

        $this->assertSame(['final' => '5,5'], $this->cenario->enrollmentModel()->fresh()->grades);
    }

    public function test_listagem_expoe_result_locked(): void
    {
        $emitida = $this->cenario->enrollmentModel();
        $outra = Enrollment::create([
            'turma_id' => $this->cenario->turmaModel()->id,
            'student_id' => Student::create([
                'user_id' => User::factory()->aluno()->create(['rut' => '11.111.111-1'])->id,
            ])->id,
            'grades' => ['final' => 6.0],
            'attendance_pct' => '90.00',
            'approval_status' => EnrollmentApprovalStatus::Aprobado,
        ]);
        $this->emitir();
        $this->actingAsAdmin();

        $resposta = $this->getJson("/api/turmas/{$this->cenario->turmaModel()->id}/alunos")
            ->assertOk()
            ->json();

        $porId = collect($resposta)->keyBy('id');
        $this->assertTrue($porId[$emitida->id]['result_locked']);
        $this->assertFalse($porId[$outra->id]['result_locked']);
    }

    public function test_matricular_e_remover_em_turma_concluida_seguem_422(): void
    {
        $this->actingAsAdmin();
        $turmaId = $this->cenario->turmaModel()->id;

        $this->postJson("/api/turmas/{$turmaId}/alunos", [
            'rut' => '22.222.222-2', 'name' => 'Pedro Diaz', 'email' => 'pedro@acme.cl',
        ])
            ->assertUnprocessable()
            ->assertJsonPath('errors.turma.0', __('operation.turma.concluded_locked'));

        $this->deleteJson("/api/turmas/{$turmaId}/alunos/{$this->cenario->enrollmentModel()->id}")
            ->assertUnprocessable()
            ->assertJsonPath('errors.turma.0', __('operation.turma.concluded_locked'));
    }

    public function test_from_model_sem_projecao_recusa(): void
    {
        $this->expectException(\LogicException::class);

        EnrollmentData::fromModel(Enrollment::query()->first());
    }

    private function emitir(): Certificate
    {
        return app(IssueCertificateAction::class)->execute(
            $this->cenario->enrollmentModel(),
            $this->cenario->redatorModel(),
        );
    }

    /** @return array{grades: array{final: string}, attendance_pct: string, approval_status: string} */
    private function correcao(): array
    {
        return [
            'grades' => ['final' => '5,5'],
            'attendance_pct' => '80',
            'approval_status' => 'aprobado',
        ];
    }

    private function resultUrl(): string
    {
        return "/api/turmas/{$this->cenario->turmaModel()->id}/alunos/{$this->cenario->enrollmentModel()->id}/resultado";
    }
}
