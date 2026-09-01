<?php

namespace Tests\Feature\Certification;

use App\Domains\Certification\Enums\CertificateStatus;
use App\Domains\Certification\Models\Certificate;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;
use Tests\Support\Certification\IssuableEnrollmentBuilder;
use Tests\TestCase;

class RevokeCertificateTest extends TestCase
{
    use RefreshDatabase;

    private Certificate $certificate;

    protected function setUp(): void
    {
        parent::setUp();

        Carbon::setTestNow('2026-08-05 14:30:00');

        $builder = IssuableEnrollmentBuilder::make()->create();

        $this->certificate = Certificate::create([
            'uuid' => (string) Str::uuid(),
            'enrollment_id' => $builder->enrollmentModel()->id,
            'course_id' => $builder->courseModel()->id,
            'redator_id' => $builder->redatorModel()->id,
            'codigo' => 'LOT-2026-1000',
            'snapshot' => ['aluno' => ['name' => 'Juan Pérez']],
            'valido_ate' => null,
            'status' => CertificateStatus::Emitido,
            'revoked_at' => null,
            'revocation_reason' => null,
        ]);
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();

        parent::tearDown();
    }

    public function test_superadmin_revoga_certificado_sem_deleta_lo(): void
    {
        $this->actingAsSuperadmin();

        $this->postJson($this->revokeUrl(), ['reason' => 'Error en los datos del documento.'])
            ->assertOk()
            ->assertJsonPath('status', 'revocado')
            ->assertJsonPath('revoked_at', '2026-08-05T14:30:00.000000Z')
            ->assertJsonPath('revocation_reason', 'Error en los datos del documento.');

        $this->assertDatabaseHas('certificates', [
            'id' => $this->certificate->id,
            'status' => 'revocado',
            'revocation_reason' => 'Error en los datos del documento.',
        ]);
        $this->assertDatabaseCount('certificates', 1);
    }

    public function test_admin_comum_nao_pode_revogar(): void
    {
        $this->actingAsAdmin();

        $this->postJson($this->revokeUrl(), ['reason' => 'Intento no autorizado.'])
            ->assertForbidden();

        $this->assertSame(CertificateStatus::Emitido, $this->certificate->fresh()->status);
    }

    public function test_revogar_duas_vezes_retorna_422(): void
    {
        $this->actingAsSuperadmin();

        $this->postJson($this->revokeUrl(), ['reason' => 'Primera revocación.'])
            ->assertOk();

        $this->postJson($this->revokeUrl(), ['reason' => 'Segunda revocación.'])
            ->assertUnprocessable()
            ->assertJsonPath('errors.certificate.0', __('certification.certificate.already_revoked'));
    }

    public function test_revogacao_sem_motivo_retorna_422_e_nao_revoga(): void
    {
        $this->actingAsSuperadmin();

        $this->postJson($this->revokeUrl(), [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('reason');

        $this->assertSame(CertificateStatus::Emitido, $this->certificate->fresh()->status);
    }

    public function test_revogacao_grava_auditoria_com_o_usuario_que_revogou(): void
    {
        $superadmin = $this->actingAsSuperadmin();
        $before = $this->certificate->audits()->count();

        $this->postJson($this->revokeUrl(), ['reason' => 'Documento emitido con datos incorrectos.'])
            ->assertOk();

        $this->assertGreaterThan($before, $this->certificate->fresh()->audits()->count());

        // A invariante §4.5 nomeia `user_id`: contar linhas não a prova.
        $audit = $this->certificate->audits()->latest('id')->first();

        $this->assertSame('updated', $audit->event);
        $this->assertSame($superadmin->id, $audit->user_id);
        $this->assertSame('user', $audit->user_type);
        $this->assertSame('revocado', $audit->new_values['status']);
    }

    private function revokeUrl(): string
    {
        return "/api/certificates/{$this->certificate->id}/revoke";
    }
}
