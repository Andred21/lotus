<?php

namespace Tests\Feature\Certification;

use App\Domains\Catalog\Models\Course;
use App\Domains\Certification\Enums\CertificateStatus;
use App\Domains\Certification\Models\Certificate;
use App\Domains\Identity\Models\User;
use App\Shared\Pdf\HtmlToPdf;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Tests\Support\Certification\IssuableEnrollmentBuilder;
use Tests\Support\CreatesDomainRecords;
use Tests\Support\Pdf\FakeHtmlToPdf;
use Tests\TestCase;

/**
 * Muestra do certificado do curso (bloco 39): o PDF que o admin vê ANTES de
 * haver turma, com a marca "MUESTRA — SIN VALIDEZ". Nada é gravado, auditado
 * nem numerado, e o documento real nunca carrega a marca.
 */
class CertificatePreviewTest extends TestCase
{
    use CreatesDomainRecords;
    use RefreshDatabase;

    private const MARCA = 'MUESTRA — SIN VALIDEZ';

    private FakeHtmlToPdf $pdf;

    protected function setUp(): void
    {
        parent::setUp();

        config(['app.certificate_issuer.city' => 'Temuco']);

        Http::preventStrayRequests();
        $this->pdf = new FakeHtmlToPdf;
        $this->app->instance(HtmlToPdf::class, $this->pdf);
    }

    public function test_preview_devolve_pdf_inline_com_a_marca_e_os_dados_do_curso(): void
    {
        $this->actingAsAdmin();
        $course = $this->cursoComModulos();

        $response = $this->get("/api/courses/{$course->id}/certificate-preview");

        $response
            ->assertOk()
            ->assertHeader('Content-Type', 'application/pdf')
            ->assertHeader(
                'Content-Disposition',
                "inline; filename=\"certificado-muestra-{$course->id}.pdf\"",
            );

        $html = $this->pdf->lastHtml();
        $this->assertStringContainsString(self::MARCA, $html);
        $this->assertStringContainsString('N° MUESTRA', $html);
        $this->assertStringContainsString('Seguridad en Alta Tensión', $html);
        $this->assertStringContainsString('1. Fundamentos', $html);
        $this->assertStringContainsString('2. Maniobras', $html);
        $this->assertStringContainsString('Temuco', $html);
        $this->assertStringNotContainsString('/validar/', $html);
    }

    public function test_preview_nao_grava_nem_consome_numero(): void
    {
        $this->actingAsAdmin();
        $course = $this->cursoComModulos();
        $antes = $this->contagens();

        $this->get("/api/courses/{$course->id}/certificate-preview")->assertOk();

        $this->assertSame($antes, $this->contagens());
    }

    public function test_preview_sem_permissao_retorna_403(): void
    {
        $this->seed(RolePermissionSeeder::class);
        $user = User::factory()->create(['type' => 'redator', 'is_active' => true]);
        $user->assignRole('redator');
        $this->actingAs($user, 'web');
        $course = $this->cursoComModulos();

        $this->getJson("/api/courses/{$course->id}/certificate-preview")->assertForbidden();
    }

    public function test_preview_de_curso_arquivado_retorna_404(): void
    {
        $this->actingAsAdmin();
        $course = $this->cursoComModulos();
        $course->delete();

        $this->getJson("/api/courses/{$course->id}/certificate-preview")->assertNotFound();
    }

    public function test_preview_de_curso_sem_descricao_e_sem_modulos_renderiza(): void
    {
        $this->actingAsAdmin();
        $course = $this->makeCourse(['name' => 'Curso Pelado', 'description' => null]);

        $this->get("/api/courses/{$course->id}/certificate-preview")->assertOk();

        $html = $this->pdf->lastHtml();
        $this->assertStringContainsString(self::MARCA, $html);
        // `temario-head` existe sempre no CSS; a marcação é a tabela e o rótulo.
        $this->assertStringNotContainsString('<table class="temario-head">', $html);
        $this->assertStringNotContainsString('Temario del Curso', $html);
    }

    public function test_pdf_de_certificado_real_nao_carrega_a_marca(): void
    {
        $this->actingAsAdmin();
        config(['app.certificate_validation_url' => 'https://valida.lotus.test']);
        $builder = IssuableEnrollmentBuilder::make()->create();
        $certificate = Certificate::create([
            'uuid' => (string) Str::uuid(),
            'enrollment_id' => $builder->enrollmentModel()->id,
            'course_id' => $builder->courseModel()->id,
            'redator_id' => $builder->redatorModel()->id,
            'codigo' => 'LOT-2026-2000',
            'snapshot' => [
                'schema_version' => 2,
                'aluno' => ['name' => 'Juan Pérez', 'rut' => '12.345.678-5'],
                'curso' => ['name' => 'Curso Real', 'workload_hours' => 8, 'modules' => []],
                'turma' => ['id' => $builder->turmaModel()->id],
                'cliente' => ['name' => 'Empresa', 'rut' => '76.123.456-7'],
                'emissor' => ['name' => 'OTEC LOTUS SpA', 'rut' => '77.510.327-2'],
                'redator' => ['name' => 'Relator', 'rut' => '9.876.543-3'],
                'resultado' => ['grades' => null, 'approval_status' => 'aprobado', 'attendance_pct' => null],
                'template' => ['version' => null, 'city' => null],
                'ciudad_emision' => 'Santiago',
                'emitido_em' => '2026-08-05',
            ],
            'valido_ate' => null,
            'status' => CertificateStatus::Emitido,
        ]);

        $this->get("/api/certificates/{$certificate->id}/pdf")->assertOk();

        $html = $this->pdf->lastHtml();
        $this->assertStringContainsString('LOT-2026-2000', $html);
        $this->assertStringNotContainsString(self::MARCA, $html);
        $this->assertStringNotContainsString('MUESTRA', $html);
    }

    private function cursoComModulos(): Course
    {
        $course = $this->makeCourse([
            'name' => 'Seguridad en Alta Tensión',
            'technical_name' => 'Operación Segura AT',
            'description' => 'abordó la narrativa del curso.',
        ]);
        $course->modules()->create(['sort_order' => 2, 'name' => '2. Maniobras', 'contents' => 'Maniobra uno']);
        $course->modules()->create(['sort_order' => 1, 'name' => '1. Fundamentos', 'contents' => 'Base uno']);

        return $course;
    }

    /** @return array{certificates: int, audits: int, certificate_sequences: int} */
    private function contagens(): array
    {
        return [
            'certificates' => DB::table('certificates')->count(),
            'audits' => DB::table('audits')->count(),
            'certificate_sequences' => DB::table('certificate_sequences')->count(),
        ];
    }
}
