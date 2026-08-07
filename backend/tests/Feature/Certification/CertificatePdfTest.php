<?php

namespace Tests\Feature\Certification;

use App\Domains\Certification\Enums\CertificateStatus;
use App\Domains\Certification\Models\Certificate;
use App\Domains\Commercial\Models\Budget;
use App\Domains\Commercial\Models\Quote;
use App\Domains\Identity\Models\Redator;
use App\Domains\Identity\Models\Student;
use App\Domains\Identity\Models\User;
use App\Domains\Operation\Enums\EnrollmentApprovalStatus;
use App\Domains\Operation\Enums\TurmaModalidade;
use App\Domains\Operation\Enums\TurmaStatus;
use App\Domains\Operation\Models\Enrollment;
use App\Domains\Operation\Models\Turma;
use App\Shared\Pdf\FakeHtmlToPdf;
use App\Shared\Pdf\HtmlToPdf;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use SimpleSoftwareIO\QrCode\Facades\QrCode;
use Tests\Support\CreatesDomainRecords;
use Tests\TestCase;

class CertificatePdfTest extends TestCase
{
    use CreatesDomainRecords;
    use RefreshDatabase;

    private Certificate $certificate;

    private FakeHtmlToPdf $pdf;

    protected function setUp(): void
    {
        parent::setUp();

        $client = $this->makeClientWithUser(
            ['legal_name' => 'Empresa Viva SpA'],
            ['name' => 'Empresa Viva'],
        );
        $budget = Budget::create(['client_id' => $client->id, 'code' => 'Scap 1']);
        $course = $this->makeCourse([
            'name' => 'Curso Vivo',
            'technical_name' => 'Nombre técnico vivo',
            'workload_hours' => 8,
        ]);
        $quote = Quote::create([
            'budget_id' => $budget->id,
            'course_id' => $course->id,
            'seq_in_budget' => 1,
            'student_count' => 1,
            'value_uf' => 10,
            'status' => 'approved',
        ]);
        $turma = Turma::create([
            'quote_id' => $quote->id,
            'course_id' => $course->id,
            'modalidade' => TurmaModalidade::Presencial,
            'local_aplicacao' => 'Ciudad viva',
            'start_date' => '2026-07-20',
            'end_date' => '2026-07-24',
            'status' => TurmaStatus::Concluida,
        ]);
        $student = Student::create([
            'user_id' => User::factory()->aluno()->create(['name' => 'Alumno Vivo'])->id,
            'current_client_id' => $client->id,
        ]);
        $enrollment = Enrollment::create([
            'turma_id' => $turma->id,
            'student_id' => $student->id,
            'grades' => ['final' => 4.0],
            'attendance_pct' => '50.00',
            'approval_status' => EnrollmentApprovalStatus::Aprobado,
        ]);
        $redator = Redator::create([
            'user_id' => User::factory()->redator()->create(['name' => 'Relator Vivo'])->id,
        ]);

        $this->certificate = Certificate::create([
            'uuid' => (string) Str::uuid(),
            'enrollment_id' => $enrollment->id,
            'course_id' => $course->id,
            'redator_id' => $redator->id,
            'codigo' => 'LOT-2026-1000',
            'snapshot' => [
                'aluno' => ['name' => 'Juan Pérez Congelado', 'rut' => '12.345.678-5'],
                'curso' => [
                    'name' => 'Seguridad Congelada',
                    'technical_name' => 'Operación Segura AT',
                    'workload_hours' => 16,
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
                    'id' => $turma->id,
                    'start_date' => '2026-07-20',
                    'end_date' => '2026-07-24',
                    'modalidade' => 'presencial',
                ],
                'cliente' => ['name' => 'Empresa Congelada', 'rut' => '76.123.456-7'],
                'redator' => ['name' => 'María Relatora Congelada', 'rut' => '9.876.543-3'],
                'resultado' => [
                    'grades' => null,
                    'approval_status' => 'aprobado',
                    'attendance_pct' => null,
                ],
                'template' => [
                    'version' => 2,
                    'layout_config' => [
                        'orientation' => 'landscape',
                        'city' => 'Valparaíso',
                    ],
                ],
                'ciudad_emision' => 'Santiago',
                'emitido_em' => '2026-08-05',
            ],
            'valido_ate' => null,
            'status' => CertificateStatus::Emitido,
            'revoked_at' => null,
            'revocation_reason' => null,
        ]);
    }

    public function test_pdf_devolve_os_bytes_do_conversor(): void
    {
        $this->actingAsAdmin();
        $this->fakeGotenberg();

        $response = $this->get($this->pdfUrl());

        $response
            ->assertOk()
            ->assertHeader('Content-Type', 'application/pdf')
            ->assertHeader(
                'Content-Disposition',
                'inline; filename="certificado-LOT-2026-1000.pdf"',
            );
        $this->assertStringStartsWith('%PDF', $response->getContent());
    }

    /**
     * O A4 nasce de DUAS peças e as duas ficam guardadas aqui: o `@page` do
     * Blade, que declara o tamanho, e o `preferCssPageSize`, sem o qual o
     * Chromium imprime no default do conversor — Letter (612×792 pt). Apagar
     * qualquer uma devolve o documento de peso legal ao papel errado, e antes
     * desta asserção apagar o `@page` mantinha a suíte inteira verde (R-2).
     * Que a opção vire campo do multipart é prova do `HtmlToPdfTest`.
     */
    public function test_certificado_declara_a4_no_css_e_pede_o_papel_do_css(): void
    {
        $this->actingAsAdmin();
        $this->fakeGotenberg();

        $this->get($this->pdfUrl())->assertOk();

        $this->assertTrue($this->pdf->lastOptions()->preferCssPageSize);
        $this->assertHtml(fn (string $html): bool => preg_match(
            '/@page\s*\{[^}]*size:\s*A4\s+portrait;/s',
            $html,
        ) === 1);
    }

    public function test_html_usa_snapshot_e_omite_nota_presenca_e_vigencia_nulas(): void
    {
        $this->actingAsAdmin();
        $this->fakeGotenberg();

        $this->get($this->pdfUrl())->assertOk();

        $this->assertHtml(function (string $html): bool {
            return str_contains($html, 'LOT-2026-1000')
                && str_contains($html, 'Juan Pérez Congelado')
                && str_contains($html, 'Seguridad Congelada')
                && ! str_contains($html, 'Alumno Vivo')
                && ! str_contains($html, 'Curso Vivo')
                && ! str_contains($html, 'El trabajador logró aprobar el curso con nota')
                && ! str_contains($html, 'Asistencia registrada:')
                && ! str_contains($html, 'Este certificado es válido hasta el');
        });

        // Controle positivo: prende as negativas aos rótulos que o Blade usa
        // de fato, para elas não voltarem a passar por vacuidade após reescrita.
        $snapshot = $this->certificate->snapshot;
        $snapshot['resultado']['grades'] = ['final' => 6.2];
        $snapshot['resultado']['attendance_pct'] = '87.50';
        $this->certificate->update([
            'snapshot' => $snapshot,
            'valido_ate' => '2027-08-05',
        ]);

        $this->get($this->pdfUrl())->assertOk();

        $this->assertHtml(function (string $html): bool {
            return str_contains($html, 'El trabajador logró aprobar el curso con nota 6.2.')
                && str_contains($html, 'Asistencia registrada: 87.50%.')
                && str_contains($html, 'Este certificado es válido hasta el')
                && str_contains($html, '05-08-2027');
        });
    }

    /**
     * D-P9: o Blade é o documento oficial (`docs/templates/certificado.pdf`),
     * não um layout genérico. Cada asserção aqui é um campo do original, e todos
     * saem do snapshot congelado — nunca das relações vivas do setUp.
     */
    public function test_html_traz_os_campos_do_documento_oficial(): void
    {
        $this->actingAsAdmin();
        $this->fakeGotenberg();

        $this->get($this->pdfUrl())->assertOk();

        $this->assertHtml(function (string $html): bool {
            return str_contains($html, 'CERTIFICADO DE CAPACITACIÓN')
                // Identidade fixa da OTEC emissora, com o RUT do documento.
                && str_contains($html, '77.510.327-2')
                && str_contains($html, 'Santiago')
                // `{{RUTemp}}`: o RUT da empresa estava no snapshot e não era impresso.
                && str_contains($html, '76.123.456-7')
                && str_contains($html, 'abordó la narrativa congelada del curso.')
                && str_contains($html, 'El N° de Registro de este documento es el')
                && str_contains($html, 'Instructor')
                && str_contains($html, 'María Relatora Congelada')
                && str_contains($html, 'Temario del Curso')
                && str_contains($html, '1. Introducción Congelada')
                && str_contains($html, 'Objetivos congelados')
                && str_contains($html, 'reconocimiento de relación jurídica alguna con la persona identificada')
                // Marca no cabeçalho, embutida — o Gotenberg só recebe o HTML.
                && str_contains($html, 'data:image/png;base64,');
        });
    }

    public function test_html_imprime_periodo_sem_descricao_e_omite_temario_sem_modulos(): void
    {
        $snapshot = $this->certificate->snapshot;
        $snapshot['curso']['description'] = null;
        $snapshot['curso']['modules'] = [];
        $this->certificate->update(['snapshot' => $snapshot]);
        $this->actingAsAdmin();
        $this->fakeGotenberg();

        $this->get($this->pdfUrl())->assertOk();

        $this->assertHtml(function (string $html): bool {
            return ! str_contains($html, 'Temario del Curso')
                && str_contains(
                    $html,
                    'La actividad fue realizada entre el 20-07-2026 y el 24-07-2026.',
                )
                && ! str_contains($html, 'abordó los siguientes contenidos:')
                && str_contains($html, 'CERTIFICADO DE CAPACITACIÓN');
        });
    }

    public function test_html_omite_linha_do_periodo_quando_snapshot_nao_tem_datas(): void
    {
        $snapshot = $this->certificate->snapshot;
        $snapshot['turma']['start_date'] = null;
        $snapshot['turma']['end_date'] = null;
        $this->certificate->update(['snapshot' => $snapshot]);
        $this->actingAsAdmin();
        $this->fakeGotenberg();

        $this->get($this->pdfUrl())->assertOk();

        $this->assertHtml(function (string $html): bool {
            return ! str_contains($html, 'La actividad realizada')
                && ! str_contains($html, 'La actividad fue realizada')
                && str_contains($html, 'abordó la narrativa congelada del curso.');
        });
    }

    public function test_html_usa_identidade_do_emissor_congelada_no_snapshot(): void
    {
        $snapshot = $this->certificate->snapshot;
        $snapshot['emissor'] = [
            'name' => 'OTEC Histórica SpA',
            'rut' => '76.000.000-1',
        ];
        $this->certificate->update(['snapshot' => $snapshot]);
        config([
            'app.certificate_issuer.name' => 'OTEC Nova SpA',
            'app.certificate_issuer.rut' => '77.999.999-9',
        ]);
        $this->actingAsAdmin();
        $this->fakeGotenberg();

        $this->get($this->pdfUrl())->assertOk();

        $this->assertHtml(function (string $html): bool {
            return str_contains($html, 'OTEC Histórica SpA [76.000.000-1] certifica que:')
                && str_contains($html, 'por parte de OTEC Histórica SpA')
                && ! str_contains($html, 'OTEC Nova SpA')
                && ! str_contains($html, '77.999.999-9');
        });
    }

    public function test_html_tolera_snapshot_anterior_ao_schema_do_documento_oficial(): void
    {
        $snapshot = $this->certificate->snapshot;
        unset(
            $snapshot['curso']['description'],
            $snapshot['curso']['modules'],
            $snapshot['curso']['technical_name'],
            $snapshot['cliente']['rut'],
            $snapshot['emissor'],
        );
        $this->certificate->update(['snapshot' => $snapshot]);
        config([
            'app.certificate_issuer.name' => 'OTEC Config Legado SpA',
            'app.certificate_issuer.rut' => '77.111.111-1',
        ]);
        $this->actingAsAdmin();
        $this->fakeGotenberg();

        $this->get($this->pdfUrl())->assertOk();

        $this->assertHtml(function (string $html): bool {
            return str_contains($html, 'OTEC Config Legado SpA [77.111.111-1] certifica que:')
                && str_contains(
                    $html,
                    'La actividad fue realizada entre el 20-07-2026 y el 24-07-2026.',
                )
                && ! str_contains($html, 'Nombre técnico vivo')
                && ! str_contains($html, 'Operación Segura AT')
                && ! str_contains($html, 'El trabajador de la empresa RUT:')
                && ! str_contains($html, 'abordó los siguientes contenidos:')
                && ! str_contains($html, 'Temario del Curso');
        });
    }

    /**
     * Chave PRESENTE com valor `null` é caso diferente de chave ausente, e o
     * default do `data_get` não cobre o primeiro: com `curso.modules: null` o
     * `@foreach` estourava e o PDF vinha 500 (R-1). O emissor `null` cai no
     * fallback de config em vez de imprimir o documento sem a OTEC emissora.
     */
    public function test_html_tolera_chaves_do_snapshot_com_valor_null(): void
    {
        $snapshot = $this->certificate->snapshot;
        $snapshot['curso']['modules'] = null;
        $snapshot['curso']['description'] = null;
        $snapshot['cliente']['rut'] = null;
        $snapshot['emissor'] = ['name' => null, 'rut' => null];
        $this->certificate->update(['snapshot' => $snapshot]);
        config([
            'app.certificate_issuer.name' => 'OTEC Fallback SpA',
            'app.certificate_issuer.rut' => '77.222.222-2',
        ]);
        $this->actingAsAdmin();
        $this->fakeGotenberg();

        $this->get($this->pdfUrl())->assertOk();

        $this->assertHtml(function (string $html): bool {
            return str_contains($html, 'OTEC Fallback SpA [77.222.222-2] certifica que:')
                && ! str_contains($html, 'Temario del Curso')
                && ! str_contains($html, 'El trabajador de la empresa RUT:')
                && str_contains($html, 'CERTIFICADO DE CAPACITACIÓN');
        });
    }

    public function test_temario_remove_marcadores_unicode_sem_corromper_sinais_tecnicos(): void
    {
        $snapshot = $this->certificate->snapshot;
        $snapshot['curso']['modules'][0]['contents'] = implode("\n", [
            '* Asterisco',
            '- Hífen',
            '• Bullet',
            '— Alcance del procedimiento',
            '– Tensión de prueba',
            '-5 kV nominal',
            '–5 kV a 15 kV',
        ]);
        $this->certificate->update(['snapshot' => $snapshot]);
        $this->actingAsAdmin();
        $this->fakeGotenberg();

        $this->get($this->pdfUrl())->assertOk();

        $this->assertHtml(function (string $html): bool {
            return preg_match('//u', $html) === 1
                && ! str_contains($html, '�')
                && str_contains($html, '<li>Asterisco</li>')
                && str_contains($html, '<li>Hífen</li>')
                && str_contains($html, '<li>Bullet</li>')
                && str_contains($html, '<li>Alcance del procedimiento</li>')
                && str_contains($html, '<li>Tensión de prueba</li>')
                && str_contains($html, '<li>-5 kV nominal</li>')
                && str_contains($html, '<li>–5 kV a 15 kV</li>');
        });
    }

    /**
     * O nome diz o que as asserções provam: o rodapé sai do fluxo do documento
     * ou não sai. **Comprimento de texto aqui é cenário, não asserção** — o
     * teste passa igual com uma frase curta (medido), porque HTML falso não
     * pagina. Que a descrição longa não empurre o rodapé para fora da página só
     * se prova no PDF real, e essa prova é do gate (R-4).
     */
    public function test_rodape_e_qr_ficam_no_fluxo_e_nao_em_posicao_absoluta(): void
    {
        $snapshot = $this->certificate->snapshot;
        $snapshot['curso']['description'] = str_repeat('Contenido técnico extenso. ', 140);
        $this->certificate->update(['snapshot' => $snapshot]);
        $this->actingAsAdmin();
        $this->fakeGotenberg();

        $this->get($this->pdfUrl())->assertOk();

        $this->assertHtml(function (string $html): bool {
            $descriptionPosition = strpos($html, 'Contenido técnico extenso.');
            $footerPosition = strpos($html, 'class="certificate-footer"');

            return $descriptionPosition !== false
                && $footerPosition !== false
                && $descriptionPosition < $footerPosition
                && preg_match('/\.page\s*\{[^}]*display:\s*flex;/s', $html) === 1
                && preg_match('/\.certificate-footer\s*\{[^}]*margin-top:\s*auto;/s', $html) === 1
                && preg_match('/\.(?:signature|qr|disclaimer)\s*\{[^}]*position:\s*absolute;/s', $html) === 0;
        });
    }

    public function test_qr_aponta_para_frontend_url_e_uuid(): void
    {
        $this->actingAsAdmin();
        config(['app.frontend_url' => 'https://frontend.example.test/base/']);
        $this->fakeGotenberg();
        $expectedUrl = "https://frontend.example.test/base/validar/{$this->certificate->uuid}";
        $expectedQr = base64_encode((string) QrCode::format('svg')
            ->size(180)
            ->margin(0)
            ->generate($expectedUrl));

        $this->get($this->pdfUrl())->assertOk();

        $this->assertHtml(fn (string $html): bool => str_contains(
            $html,
            "data:image/svg+xml;base64,{$expectedQr}",
        ));
    }

    /**
     * Invariante §4.7 da spec: o PDF é sempre regerado do snapshot e não é
     * materializado em lugar nenhum — nem disco, nem bucket, nem temporário.
     * Um arquivo persistido envelheceria em silêncio contra o snapshot, que é
     * a única fonte legal do documento.
     */
    public function test_pdf_nao_e_materializado_em_disco_bucket_nem_temporario(): void
    {
        $this->actingAsAdmin();
        $this->fakeGotenberg();
        Storage::fake('local');
        Storage::fake('public');
        Storage::fake('s3');
        $tempBefore = $this->tempFiles();

        $this->get($this->pdfUrl())->assertOk();

        $this->assertSame([], Storage::disk('local')->allFiles());
        $this->assertSame([], Storage::disk('public')->allFiles());
        $this->assertSame([], Storage::disk('s3')->allFiles());
        $this->assertSame($tempBefore, $this->tempFiles());
        $this->assertSame(
            ['snapshot'],
            array_values(array_intersect(['snapshot', 'pdf_path', 'file_id'], array_keys(
                $this->certificate->fresh()->getAttributes(),
            ))),
        );
    }

    public function test_conversor_fora_do_ar_retorna_500(): void
    {
        $this->actingAsAdmin();
        Http::preventStrayRequests();
        Http::fake(['*/forms/chromium/convert/html' => Http::response('boom', 503)]);

        $this->getJson($this->pdfUrl())->assertStatus(500);
    }

    public function test_pdf_exige_permissao_de_visualizacao(): void
    {
        $user = User::factory()->create(['type' => 'admin', 'is_active' => true]);
        $this->actingAs($user, 'web');
        Http::preventStrayRequests();

        $this->getJson($this->pdfUrl())->assertForbidden();

        Http::assertNothingSent();
    }

    /** @return array<int, string> */
    private function tempFiles(): array
    {
        $files = glob(sys_get_temp_dir().'/*') ?: [];
        sort($files);

        return $files;
    }

    /**
     * Troca o conversor pelo fake e guarda o HTML que o documento mandou. É o
     * que deixa cada asserção falar do documento — string HTML — em vez de
     * caçar texto dentro de um corpo multipart (B3).
     */
    private function fakeGotenberg(): void
    {
        Http::preventStrayRequests();
        $this->pdf = new FakeHtmlToPdf;
        $this->app->instance(HtmlToPdf::class, $this->pdf);
    }

    private function assertHtml(callable $assertion): void
    {
        $this->assertTrue(
            $assertion($this->pdf->lastHtml()),
            'O HTML do certificado não corresponde ao esperado.',
        );
    }

    private function pdfUrl(): string
    {
        return "/api/certificates/{$this->certificate->id}/pdf";
    }
}
