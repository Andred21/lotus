<?php

namespace Tests\Feature\Certification;

use App\Domains\Catalog\Models\Course;
use App\Domains\Catalog\Models\CourseCertificateTemplate;
use App\Domains\Certification\Enums\CertificateStatus;
use App\Domains\Certification\Models\Certificate;
use App\Domains\Certification\Services\CertificateNumberService;
use App\Domains\Identity\Models\Redator;
use App\Domains\Identity\Models\User;
use App\Domains\Operation\Enums\EnrollmentApprovalStatus;
use App\Domains\Operation\Enums\TurmaStatus;
use App\Domains\Operation\Models\Enrollment;
use App\Domains\Operation\Models\Turma;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;
use Tests\Support\Certification\IssuableEnrollmentBuilder;
use Tests\Support\CreatesCertificateTemplates;
use Tests\TestCase;

class IssueCertificateTest extends TestCase
{
    use CreatesCertificateTemplates;
    use RefreshDatabase;

    private Course $course;

    private Turma $turma;

    private Enrollment $enrollment;

    private Redator $redator;

    protected function setUp(): void
    {
        parent::setUp();

        Carbon::setTestNow('2026-08-05 14:30:00');
        // Diferente do default de `config/app.php` de propósito: é o que prova
        // que a identidade da OTEC congelada vem da config, não de literal (R-3).
        config([
            'app.certificate_issuer.name' => 'OTEC Configurada SpA',
            'app.certificate_issuer.rut' => '76.900.900-9',
        ]);

        // Sem template: cada teste decide a própria via `createTemplate()`
        // (inclusive `test_sem_template_retorna_422`, que exige a ausência).
        $builder = IssuableEnrollmentBuilder::make()->semTemplate()->create();
        $this->course = $builder->courseModel();
        $this->turma = $builder->turmaModel();
        $this->enrollment = $builder->enrollmentModel();
        $this->redator = $builder->redatorModel();
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();

        parent::tearDown();
    }

    public function test_admin_emite_certificado_com_codigo_e_snapshot_do_servidor(): void
    {
        $this->actingAsAdmin();
        $this->createTemplate(['validity_months' => null]);

        $this->postJson($this->issueUrl(), [
            'redator_id' => $this->redator->id,
            'snapshot' => ['aluno' => ['name' => 'Dado controlado pelo cliente']],
        ])
            ->assertCreated()
            ->assertJsonPath('codigo', 'LOT-2026-1000')
            ->assertJsonPath('status', 'emitido')
            ->assertJsonPath('valido_ate', null)
            ->assertJsonPath('snapshot.aluno.name', 'Juan Pérez')
            ->assertJsonPath('snapshot.curso.name', 'Seguridad en Alta Tensión')
            ->assertJsonPath('snapshot.cliente.rut', '76.123.456-7')
            ->assertJsonPath('snapshot.emissor.name', 'OTEC Configurada SpA')
            ->assertJsonPath('snapshot.emissor.rut', '76.900.900-9')
            ->assertJsonPath('snapshot.redator.name', 'María Relatora')
            ->assertJsonPath('snapshot.schema_version', 2)
            ->assertJsonPath('snapshot.template.version', 1)
            ->assertJsonPath('snapshot.template.city', 'Santiago')
            ->assertJsonPath('snapshot.ciudad_emision', 'Santiago')
            ->assertJsonPath('snapshot.resultado.grades.final', 6.2)
            ->assertJsonPath('snapshot.resultado.approval_status', 'aprobado')
            ->assertJsonPath('snapshot.emitido_em', '2026-08-05');

        $certificate = Certificate::query()->sole();

        $this->assertSame('Juan Pérez', $certificate->snapshot->aluno->name);
        $this->assertSame($this->enrollment->id, $certificate->enrollment_id);
        $this->assertSame($this->course->id, $certificate->course_id);
        $this->assertSame($this->redator->id, $certificate->redator_id);
    }

    public function test_turma_em_andamento_retorna_422_com_rn08(): void
    {
        $this->actingAsAdmin();
        $this->turma->update(['status' => TurmaStatus::EmAndamento]);

        $this->postJson($this->issueUrl(), $this->validPayload())
            ->assertUnprocessable()
            ->assertJsonPath(
                'errors.turma.0',
                'La clase aún no fue concluida: no se puede emitir el certificado (RN-08).',
            );
    }

    public function test_aluno_reprovado_retorna_422(): void
    {
        $this->actingAsAdmin();
        $this->enrollment->update(['approval_status' => EnrollmentApprovalStatus::Reprobado]);

        $this->postJson($this->issueUrl(), $this->validPayload())
            ->assertUnprocessable()
            ->assertJsonPath(
                'errors.enrollment.0',
                'El alumno no fue aprobado: no se puede emitir el certificado.',
            );
    }

    public function test_certificado_vigente_retorna_422_legivel_e_indice_recusa_bypass(): void
    {
        $this->actingAsAdmin();
        $this->createCertificate();

        $this->postJson($this->issueUrl(), $this->validPayload())
            ->assertUnprocessable()
            ->assertJsonPath(
                'errors.enrollment.0',
                'Ya existe un certificado vigente para esta matrícula.',
            );

        $this->expectException(QueryException::class);

        Certificate::query()->getQuery()->insert([
            'uuid' => (string) Str::uuid(),
            'enrollment_id' => $this->enrollment->id,
            'course_id' => $this->course->id,
            'redator_id' => $this->redator->id,
            'codigo' => 'LOT-2026-1001',
            'snapshot' => json_encode(['aluno' => ['name' => 'Juan']], JSON_THROW_ON_ERROR),
            'valido_ate' => null,
            'status' => CertificateStatus::Emitido->value,
            'revoked_at' => null,
            'revocation_reason' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function test_redator_de_outra_turma_retorna_422(): void
    {
        $this->actingAsAdmin();
        $this->createTemplate();
        $otherRedator = Redator::create([
            'user_id' => User::factory()->redator()->create()->id,
        ]);

        $this->postJson($this->issueUrl(), ['redator_id' => $otherRedator->id])
            ->assertUnprocessable()
            ->assertJsonPath(
                'errors.redator_id.0',
                'El redactor no está designado en esta clase.',
            );
    }

    /**
     * Spec §5.2: arquivar o redator não pode derrubar a emissão de uma turma
     * que ele JÁ ministrou. Quem autoriza a emissão é a porta 6 — designação na
     * turma —, e a designação sobrevive ao arquivamento: `turma_redator` não
     * tem `deleted_at`. O `findOrFail` do controller, escopado por
     * `SoftDeletes`, recusava com 404 ANTES de o `CertificateEligibility`
     * chegar a rodar.
     */
    public function test_redator_arquivado_ainda_emite_certificado_da_turma_que_ministrou(): void
    {
        $this->actingAsAdmin();
        $this->createTemplate();

        $this->redator->delete();

        $this->postJson($this->issueUrl(), $this->validPayload())->assertCreated();

        $this->assertDatabaseHas('certificates', [
            'enrollment_id' => $this->enrollment->id,
            'redator_id' => $this->redator->id,
        ]);
    }

    public function test_usuario_sem_permissao_retorna_403(): void
    {
        $this->seed(RolePermissionSeeder::class);
        $user = User::factory()->redator()->create(['is_active' => true]);
        $user->assignRole('redator');
        $this->actingAs($user, 'web');

        $this->postJson($this->issueUrl(), $this->validPayload())->assertForbidden();
    }

    public function test_template_mais_recente_com_validade_define_valido_ate(): void
    {
        $this->actingAsAdmin();
        $this->createTemplate(['version' => 1, 'validity_months' => 3]);
        $this->createTemplate(['version' => 2, 'validity_months' => 12]);
        $deletedTemplate = $this->createTemplate(['version' => 3, 'validity_months' => 24]);
        $deletedTemplate->delete();

        $this->postJson($this->issueUrl(), $this->validPayload())
            ->assertCreated()
            ->assertJsonPath('valido_ate', '2027-08-05');

        $certificate = Certificate::query()->sole();

        $this->assertSame($this->enrollment->id, $certificate->enrollment_id);
        $this->assertSame('2027-08-05', $certificate->valido_ate?->toDateString());
    }

    public function test_sem_template_retorna_422(): void
    {
        $this->actingAsAdmin();

        $this->postJson($this->issueUrl(), $this->validPayload())
            ->assertUnprocessable()
            ->assertJsonPath(
                'errors.template.0',
                'El curso no tiene una plantilla de certificado aprobada.',
            );

        $this->assertDatabaseCount('certificates', 0);
    }

    public function test_template_sem_validade_emite_com_valido_ate_nulo(): void
    {
        $this->actingAsAdmin();
        $this->createTemplate(['validity_months' => null]);

        $this->postJson($this->issueUrl(), $this->validPayload())
            ->assertCreated()
            ->assertJsonPath('valido_ate', null);

        $this->assertNull(Certificate::query()->sole()->valido_ate);
    }

    public function test_turma_online_com_template_sem_city_retorna_422(): void
    {
        $this->actingAsAdmin();
        $this->createTemplate(['layout_config' => ['orientation' => 'landscape']]);

        $this->assertInvalidTemplateCity();
    }

    public function test_turma_online_com_city_nula_no_template_retorna_422(): void
    {
        $this->actingAsAdmin();
        $this->createTemplate(['layout_config' => ['city' => null]]);

        $this->assertInvalidTemplateCity();
    }

    public function test_turma_online_com_city_vazia_no_template_retorna_422(): void
    {
        $this->actingAsAdmin();
        $this->createTemplate(['layout_config' => ['city' => '']]);

        $this->assertInvalidTemplateCity();
    }

    /**
     * A emissão espera pelo lock da sequência. Se cada campo consultar o
     * relógio por conta própria, uma emissão que atravessa a virada do ano
     * grava data de emissão de 2027 num código LOT-2026 — num documento legal.
     */
    public function test_emissao_que_atravessa_a_virada_do_ano_usa_um_instante_so(): void
    {
        $this->actingAsAdmin();
        $this->createTemplate(['validity_months' => 12]);
        Carbon::setTestNow('2026-12-31 23:59:59');

        // Simula a espera no lockForUpdate: o relógio anda entre o instante em
        // que a emissão começa e o instante em que a sequência responde.
        $this->app->bind(CertificateNumberService::class, fn () => new class extends CertificateNumberService
        {
            public function next(int $year): string
            {
                Carbon::setTestNow(now()->addSeconds(2));

                return sprintf('LOT-%d-1000', $year);
            }
        });

        $this->postJson($this->issueUrl(), $this->validPayload())->assertCreated();

        $certificate = Certificate::query()->sole();

        $this->assertSame('LOT-2026-1000', $certificate->codigo);
        $this->assertSame('2026-12-31', $certificate->snapshot->emitido_em);
        $this->assertSame('2027-12-31', $certificate->valido_ate->toDateString());
    }

    public function test_emissao_grava_auditoria_com_o_usuario_que_emitiu(): void
    {
        $admin = $this->actingAsAdmin();
        $this->createTemplate();

        $this->postJson($this->issueUrl(), $this->validPayload())->assertCreated();

        $audit = Certificate::query()->sole()->audits()->sole();

        $this->assertSame('created', $audit->event);
        $this->assertSame($admin->id, $audit->user_id);
        $this->assertSame('user', $audit->user_type);
    }

    /** @return array{redator_id: int} */
    private function validPayload(): array
    {
        return ['redator_id' => $this->redator->id];
    }

    private function issueUrl(): string
    {
        return "/api/enrollments/{$this->enrollment->id}/certificate";
    }

    private function assertInvalidTemplateCity(): void
    {
        $this->postJson($this->issueUrl(), $this->validPayload())
            ->assertUnprocessable()
            ->assertJsonPath(
                'errors.template.0',
                'La plantilla del curso no define una ciudad de emisión válida.',
            );

        $this->assertDatabaseCount('certificates', 0);
    }

    private function createTemplate(array $overrides = []): CourseCertificateTemplate
    {
        return $this->makeTemplate($this->course->id, [
            'version' => 1,
            'layout_config' => ['city' => 'Santiago'],
            'validity_months' => null,
            ...$overrides,
        ]);
    }

    private function createCertificate(): Certificate
    {
        return Certificate::create([
            'uuid' => (string) Str::uuid(),
            'enrollment_id' => $this->enrollment->id,
            'course_id' => $this->course->id,
            'redator_id' => $this->redator->id,
            'codigo' => 'LOT-2026-0999',
            'snapshot' => ['aluno' => ['name' => 'Juan Pérez']],
            'valido_ate' => null,
            'status' => CertificateStatus::Emitido,
            'revoked_at' => null,
            'revocation_reason' => null,
        ]);
    }
}
