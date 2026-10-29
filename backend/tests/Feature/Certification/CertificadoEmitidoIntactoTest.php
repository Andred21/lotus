<?php

namespace Tests\Feature\Certification;

use App\Domains\Catalog\Models\CourseCertificateTemplate;
use App\Domains\Certification\Enums\CertificateStatus;
use App\Domains\Certification\Models\Certificate;
use App\Shared\Pdf\HtmlToPdf;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Tests\Support\Certification\IssuableEnrollmentBuilder;
use Tests\Support\CreatesCertificateTemplates;
use Tests\Support\Pdf\FakeHtmlToPdf;
use Tests\TestCase;

/**
 * Guarda do certificado já emitido: documento de peso legal não pode mudar de
 * conteúdo, de PDF nem de linha por causa de nada que o bloco 39 faça com o
 * template, o redator ou o cálculo de vigência.
 */
class CertificadoEmitidoIntactoTest extends TestCase
{
    use CreatesCertificateTemplates;
    use RefreshDatabase;

    /**
     * sha256 do HTML que o layout v5 do bloco 40 gera para este certificado.
     *
     * Valor anterior: `1323f813…94ac`, o HTML de `main@0740843a` (antes do
     * bloco 39). Trocá-lo é decidir que todo certificado já emitido reimprime
     * diferente — e é a decisão do João, de 2026-10-29 (D5 e D8 da spec do bloco
     * 40): todo certificado emitido reimprime no layout v5, com as assinaturas
     * vivas da gerente e do instrutor.
     *
     * O que NÃO muda é o registro: o snapshot e o `valido_ate` seguem
     * imutáveis (D12), e `test_ler_o_certificado_emitido_nao_reescreve_a_linha`
     * é a prova. Só o PDF, que é regerado do snapshot a cada leitura, muda.
     */
    private const HTML_LAYOUT_V5_BLOCO_40 = 'db9181358f5c2cd214bd103d45216037bcacb1a6245eb70f84098033e9e68fd1';

    private const UUID = '3f6c2a1e-8b4d-4c7a-9e2f-5d1b0a9c8e7f';

    private Certificate $certificate;

    private FakeHtmlToPdf $pdf;

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'app.certificate_validation_url' => 'https://valida.lotus.test',
            'app.certificate_issuer.name' => 'OTEC Viva SpA',
            'app.certificate_issuer.rut' => '77.000.000-0',
            // A abertura lê a cidade do emissor na hora (D13): fixa-a para o sha não depender do .env.
            'app.certificate_issuer.city' => 'Santiago',
        ]);

        // A cadeia viva só satisfaz as FKs: tudo o que o teste lê vem do
        // snapshot congelado, e todo campo asserido do snapshot difere do
        // valor vivo do builder (nome técnico, carga, datas e RUTs), para o
        // hash provar a leitura do snapshot e não da cadeia.
        $builder = IssuableEnrollmentBuilder::make()->create();

        $this->makeTemplate($builder->courseModel()->id, [
            'version' => 3,
            'layout_config' => ['city' => 'Valparaíso'],
            'validity_months' => 24,
        ]);

        // Relógio no passado: `updated_at` da linha nasce antigo e qualquer
        // reescrita na leitura mudaria o valor medido.
        Carbon::setTestNow('2026-08-05 10:00:00');

        $this->certificate = Certificate::create([
            'uuid' => self::UUID,
            'enrollment_id' => $builder->enrollmentModel()->id,
            'course_id' => $builder->courseModel()->id,
            'redator_id' => $builder->redatorModel()->id,
            'codigo' => 'LOT-2026-1001',
            'snapshot' => [
                'schema_version' => 2,
                'emissor' => ['name' => 'OTEC Congelada SpA', 'rut' => '76.543.210-3'],
                'aluno' => ['name' => 'Juan Pérez Congelado', 'rut' => '15.555.555-6'],
                'curso' => [
                    'name' => 'Seguridad Congelada',
                    'technical_name' => 'Operación Segura AT Congelado',
                    'workload_hours' => 24,
                    'description' => 'abordó la narrativa congelada del curso.',
                    'modules' => [
                        [
                            'sort_order' => 1,
                            'name' => '1. Introducción Congelada',
                            'contents' => "Objetivos congelados\nMarco congelado",
                        ],
                    ],
                ],
                'turma' => [
                    'id' => $builder->turmaModel()->id,
                    'start_date' => '2026-03-02',
                    'end_date' => '2026-03-06',
                    'modalidade' => 'presencial',
                ],
                'cliente' => ['name' => 'Empresa Congelada', 'rut' => '18.888.888-7'],
                'redator' => ['name' => 'María Relatora Congelada', 'rut' => '13.131.313-6'],
                'resultado' => [
                    'grades' => null,
                    'approval_status' => 'aprobado',
                    'attendance_pct' => null,
                ],
                'template' => ['version' => 3, 'city' => 'Valparaíso'],
                'ciudad_emision' => 'Valparaíso',
                'emitido_em' => '2026-08-05',
            ],
            'valido_ate' => '2028-08-05',
            'status' => CertificateStatus::Emitido,
            'revoked_at' => null,
            'revocation_reason' => null,
        ]);

        Carbon::setTestNow();

        Http::preventStrayRequests();
        $this->pdf = new FakeHtmlToPdf;
        $this->app->instance(HtmlToPdf::class, $this->pdf);
    }

    public function test_html_do_certificado_emitido_e_o_do_layout_v5_do_bloco_40(): void
    {
        $this->actingAsAdmin();

        $this->get($this->pdfUrl())->assertOk();

        $this->assertSame(self::HTML_LAYOUT_V5_BLOCO_40, hash('sha256', $this->pdf->lastHtml()));
    }

    public function test_ler_o_certificado_emitido_nao_consulta_templates(): void
    {
        $this->actingAsAdmin();

        CourseCertificateTemplate::withTrashed()->get()->each->forceDelete();

        $sql = [];
        DB::listen(function ($query) use (&$sql): void {
            $sql[] = $query->sql;
        });

        $show = $this->getJson("/api/certificates/{$this->certificate->id}");
        $show->assertOk();
        $this->getJson('/api/publico/certificados/'.self::UUID)->assertOk();
        $this->get($this->pdfUrl())->assertOk();

        $consultaramTemplates = array_filter(
            $sql,
            fn (string $s): bool => str_contains($s, 'course_certificate_templates'),
        );
        $this->assertSame([], array_values($consultaramTemplates));
        $this->assertSame(self::HTML_LAYOUT_V5_BLOCO_40, hash('sha256', $this->pdf->lastHtml()));
        $show->assertJsonPath('snapshot.template.city', 'Valparaíso');
        $this->assertSame('2028-08-05', $show->json('valido_ate'));
    }

    public function test_ler_o_certificado_emitido_nao_reescreve_a_linha(): void
    {
        $this->actingAsAdmin();
        $campos = ['snapshot', 'valido_ate', 'codigo', 'status', 'updated_at'];
        $antes = $this->crus($campos);

        $this->getJson("/api/certificates/{$this->certificate->id}")->assertOk();
        $this->getJson('/api/publico/certificados/'.self::UUID)->assertOk();
        $this->get($this->pdfUrl())->assertOk();

        $this->assertSame($antes, $this->crus($campos));
    }

    /**
     * @param  list<string>  $campos
     * @return array<string, mixed>
     */
    private function crus(array $campos): array
    {
        $linha = Certificate::query()->findOrFail($this->certificate->id);

        return array_combine($campos, array_map(
            fn (string $campo): mixed => $linha->getRawOriginal($campo),
            $campos,
        ));
    }

    private function pdfUrl(): string
    {
        return "/api/certificates/{$this->certificate->id}/pdf";
    }
}
