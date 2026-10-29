<?php

namespace Tests\Feature\Certification;

use App\Domains\Catalog\Models\Course;
use App\Domains\Certification\Enums\CertificateStatus;
use App\Domains\Certification\Exceptions\ValidacaoDeCertificadoNaoConfigurada;
use App\Domains\Certification\Models\Certificate;
use App\Domains\Certification\Models\CertificateSettings;
use App\Domains\Certification\Services\CertificatePdfService;
use App\Domains\Certification\Services\CertificatePreviewBuilder;
use App\Domains\Identity\Models\User;
use App\Shared\Files\Models\File;
use App\Shared\Pdf\HtmlToPdf;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Exceptions;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use PHPUnit\Framework\Attributes\DataProvider;
use SimpleSoftwareIO\QrCode\Facades\QrCode;
use Tests\Support\Certification\IssuableEnrollmentBuilder;
use Tests\Support\Files\BuildsRealUploads;
use Tests\Support\Pdf\FakeHtmlToPdf;
use Tests\TestCase;

class CertificatePdfTest extends TestCase
{
    use BuildsRealUploads;
    use RefreshDatabase;

    private const RECUSA_DE_URL = 'La dirección de validación de certificados no está configurada con https. Ningún certificado se emite ni se descarga hasta que el administrador del sistema la configure.';

    private Certificate $certificate;

    private FakeHtmlToPdf $pdf;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake(config('filesystems.default'));

        // A cadeia viva só existe para satisfazer as FKs: cada asserção deste
        // arquivo lê do snapshot congelado abaixo, nunca das relações vivas
        // (D-P9) — os valores da cadeia em si não entram em nenhuma asserção.
        $builder = IssuableEnrollmentBuilder::make()->create();

        $this->certificate = Certificate::create([
            'uuid' => (string) Str::uuid(),
            'enrollment_id' => $builder->enrollmentModel()->id,
            'course_id' => $builder->courseModel()->id,
            'redator_id' => $builder->redatorModel()->id,
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
                    'id' => $builder->turmaModel()->id,
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

        $texto = $this->textoDoDocumento();
        $this->assertStringContainsString('LOT-2026-1000', $texto);
        $this->assertStringContainsString('Juan Pérez Congelado', $texto);
        $this->assertStringContainsString('Seguridad Congelada', $texto);
        $this->assertStringNotContainsString('Alumno Vivo', $texto);
        $this->assertStringNotContainsString('Curso Vivo', $texto);
        $this->assertStringNotContainsString('con nota', $texto);
        $this->assertStringNotContainsString('asistencia de', $texto);
        $this->assertStringNotContainsString('Válido hasta', $texto);

        // Controle positivo: prende as negativas aos rótulos que o Blade usa
        // de fato, para elas não voltarem a passar por vacuidade após reescrita.
        $snapshot = $this->rawSnapshot();
        $snapshot['resultado']['grades'] = ['final' => 6.2];
        $snapshot['resultado']['attendance_pct'] = '87.50';
        $this->certificate->update([
            'snapshot' => $snapshot,
            'valido_ate' => '2027-08-05',
        ]);

        $this->get($this->pdfUrl())->assertOk();

        $texto = $this->textoDoDocumento();
        $this->assertStringContainsString('con nota 6,2 y una asistencia de 87,5 %.', $texto);
        $this->assertStringContainsString('Válido hasta el 5 de agosto de 2027', $texto);
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
                && str_contains($html, 'N° de registro')
                && str_contains($html, 'Instructor')
                && str_contains($html, 'María Relatora Congelada')
                && str_contains($html, 'Temario del curso')
                && str_contains($html, '1. Introducción Congelada')
                && str_contains($html, 'Objetivos congelados')
                && str_contains($html, 'reconocimiento de relación jurídica alguna con la persona identificada')
                // Marca no cabeçalho, embutida — o Gotenberg só recebe o HTML.
                && str_contains($html, 'data:image/png;base64,');
        });
    }

    public function test_html_imprime_periodo_sem_descricao_e_omite_temario_sem_modulos(): void
    {
        $snapshot = $this->rawSnapshot();
        $snapshot['curso']['description'] = null;
        $snapshot['curso']['modules'] = [];
        $this->certificate->update(['snapshot' => $snapshot]);
        $this->actingAsAdmin();
        $this->fakeGotenberg();

        $this->get($this->pdfUrl())->assertOk();

        $this->assertHtml(function (string $html): bool {
            return ! str_contains($html, 'Temario del curso')
                && str_contains(
                    $this->textoDoDocumento(),
                    'La actividad fue realizada entre el 20 y el 24 de julio de 2026.',
                )
                && ! str_contains($html, 'abordó los siguientes contenidos:')
                && str_contains($html, 'CERTIFICADO DE CAPACITACIÓN');
        });
    }

    public function test_html_omite_linha_do_periodo_quando_snapshot_nao_tem_datas(): void
    {
        $snapshot = $this->rawSnapshot();
        $snapshot['turma']['start_date'] = null;
        $snapshot['turma']['end_date'] = null;
        $this->certificate->update(['snapshot' => $snapshot]);
        $this->actingAsAdmin();
        $this->fakeGotenberg();

        $this->get($this->pdfUrl())->assertOk();

        $this->assertHtml(function (string $html): bool {
            return ! str_contains($html, 'La actividad, realizada')
                && ! str_contains($html, 'La actividad fue realizada')
                && str_contains($html, 'La actividad abordó los siguientes contenidos: abordó la narrativa congelada del curso.');
        });
    }

    public function test_html_usa_identidade_do_emissor_congelada_no_snapshot(): void
    {
        $snapshot = $this->rawSnapshot();
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
        $snapshot = $this->rawSnapshot();
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
                    $this->textoDoDocumento(),
                    'La actividad fue realizada entre el 20 y el 24 de julio de 2026.',
                )
                && ! str_contains($html, 'Nombre técnico vivo')
                && ! str_contains($html, 'Operación Segura AT')
                && ! str_contains($html, 'El trabajador de la empresa RUT:')
                && ! str_contains($html, 'abordó los siguientes contenidos:')
                && ! str_contains($html, 'Temario del curso');
        });
    }

    /**
     * Chave PRESENTE com valor `null` é caso diferente de chave ausente, e o
     * default do `data_get` não cobre o primeiro: com `curso.modules: null` o
     * `@foreach` estourava e o PDF vinha 500 (R-1). Num documento da versão 1
     * o emissor `null` cai no fallback de config, em vez de imprimir o
     * certificado sem a OTEC emissora.
     */
    public function test_html_tolera_chaves_do_snapshot_com_valor_null(): void
    {
        $snapshot = $this->rawSnapshot();
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
                && ! str_contains($html, 'Temario del curso')
                && ! str_contains($html, 'El trabajador de la empresa RUT:')
                && str_contains($html, 'CERTIFICADO DE CAPACITACIÓN');
        });
    }

    /**
     * `modules` escalar é a mesma classe do R-1 por outro caminho: a chave
     * existe, o valor não é lista, e `array_values` de uma string é TypeError.
     * A leitura do snapshot não pode estourar — o documento é histórico e não
     * se conserta depois de emitido.
     */
    public function test_html_tolera_modules_do_snapshot_gravado_como_escalar(): void
    {
        $snapshot = $this->rawSnapshot();
        $snapshot['curso']['modules'] = 'Módulo único';
        $this->certificate->update(['snapshot' => $snapshot]);
        $this->actingAsAdmin();
        $this->fakeGotenberg();

        $this->get($this->pdfUrl())->assertOk();

        $this->assertHtml(fn (string $html): bool => ! str_contains($html, 'Temario del curso')
            && str_contains($html, 'CERTIFICADO DE CAPACITACIÓN'));
    }

    /**
     * `enrollments.grades` é validado só como `array`, então a nota chega como
     * o redator a lançou — inclusive `"6,4"`, que é como se escreve nota no
     * Chile. Filtrar por `is_numeric` apagava a nota do documento em silêncio.
     */
    public function test_html_imprime_nota_lancada_com_virgula_e_omite_a_ilegivel(): void
    {
        $snapshot = $this->rawSnapshot();
        $snapshot['resultado']['grades'] = ['final' => '6,4'];
        $this->certificate->update(['snapshot' => $snapshot]);
        $this->actingAsAdmin();
        $this->fakeGotenberg();

        $this->get($this->pdfUrl())->assertOk();

        $this->assertHtml(fn (string $html): bool => str_contains(
            $html,
            'El trabajador logró aprobar el curso con nota 6,4.',
        ));

        // O que não dá para imprimir continua omitindo a linha inteira (D-P7).
        $snapshot['resultado']['grades'] = ['final' => ['parcial' => 5]];
        $this->certificate->update(['snapshot' => $snapshot]);

        $this->get($this->pdfUrl())->assertOk();

        $this->assertHtml(fn (string $html): bool => ! str_contains(
            $html,
            'El trabajador logró aprobar el curso con nota',
        ));
    }

    /**
     * O fallback de config existe para reconstruir a OTEC de um documento da
     * versão 1, que não congelava emissor. Da versão 2 em diante ele carimbaria
     * a OTEC de HOJE num certificado antigo: o snapshot está corrompido, e o
     * documento não sai.
     */
    public function test_documento_da_versao_2_sem_emissor_recusa_em_vez_de_usar_a_config(): void
    {
        $snapshot = $this->rawSnapshot();
        // A fixture desta classe é um documento da versão 1 — sem
        // `schema_version` —, e é a versão que decide se o fallback vale.
        $snapshot['schema_version'] = 2;
        $snapshot['emissor'] = ['name' => null, 'rut' => null];
        $this->certificate->update(['snapshot' => $snapshot]);
        config(['app.certificate_issuer.name' => 'OTEC Nova SpA']);
        $this->actingAsAdmin();
        // O conversor responde: se o documento chegasse a ser montado, a rota
        // devolveria 200. O 500 abaixo só existe porque a recusa vem antes.
        Http::fake(['*/forms/chromium/convert/html' => Http::response('%PDF')]);

        $this->getJson($this->pdfUrl())->assertStatus(500);

        Http::assertNothingSent();
    }

    /**
     * Certificado sem nome de aluno não é documento incompleto — é documento
     * que atesta o que ninguém sabe. Falhar alto vira chamado e conserto; a
     * linha em branco viraria prova falsa.
     */
    public function test_pdf_recusa_snapshot_sem_o_nome_do_aluno(): void
    {
        $snapshot = $this->rawSnapshot();
        $snapshot['aluno']['name'] = '';
        $this->certificate->update(['snapshot' => $snapshot]);
        $this->actingAsAdmin();
        Http::fake(['*/forms/chromium/convert/html' => Http::response('%PDF')]);

        $this->getJson($this->pdfUrl())->assertStatus(500);

        Http::assertNothingSent();
    }

    public function test_temario_remove_marcadores_unicode_sem_corromper_sinais_tecnicos(): void
    {
        $snapshot = $this->rawSnapshot();
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
     * O nome diz o que as asserções provam: as assinaturas e o aviso saem do
     * fluxo do documento, logo abaixo do corpo, e não em posição absoluta.
     * **Comprimento de texto aqui é cenário, não asserção** — HTML falso não
     * pagina. Que a descrição longa não leve nada para fora da página só se
     * prova no PDF real, e essa prova é a inspeção visual e a matriz (R-4).
     */
    public function test_rodape_e_qr_ficam_no_fluxo_e_nao_em_posicao_absoluta(): void
    {
        $snapshot = $this->rawSnapshot();
        $snapshot['curso']['description'] = str_repeat('Contenido técnico extenso. ', 140);
        $this->certificate->update(['snapshot' => $snapshot]);
        $this->actingAsAdmin();
        $this->fakeGotenberg();

        $this->get($this->pdfUrl())->assertOk();

        $this->assertHtml(function (string $html): bool {
            $descriptionPosition = strpos($html, 'Contenido técnico extenso.');
            $registroPosition = strpos($html, 'class="registro');
            $firmasPosition = strpos($html, 'class="firmas"');
            $avisoPosition = strpos($html, 'class="aviso-legal"');

            return $descriptionPosition !== false
                && $descriptionPosition < $registroPosition
                && $registroPosition < $firmasPosition
                && $firmasPosition < $avisoPosition
                // O `margin-top: auto` do aviso o leva ao pé da folha; as
                // assinaturas ficam logo abaixo do corpo, sem ele.
                && preg_match('/\.firmas\s*\{[^}]*margin-top:\s*auto/s', $html) === 0
                && preg_match('/\.(?:firmas|firma|aviso-legal)\s*\{[^}]*position:\s*(?:absolute|fixed)/s', $html) === 0;
        });
    }

    /**
     * Com altura DEFINIDA a folha vira uma caixa que não pagina e o Chromium
     * pinta o excedente POR CIMA da página seguinte: medido em 2026-08-08 com
     * nome de curso de 147 caracteres, o QR, a assinatura e o aviso legal
     * saíram sobrepostos ao temário. Documento corrompido, sem nenhum aviso.
     *
     * A varredura é do documento INTEIRO e não de uma regra, porque a regressão
     * que este teste existe para barrar (`c7585bd`) morava numa regra IRMÃ,
     * `.page--certificado { height: 297mm; }`. Ela COLETA toda propriedade que
     * prende uma altura em 297mm — em regra, em `style=` inline, onde for — e
     * exige que a lista seja vazia: no layout v5 a folha cresce com o conteúdo
     * (`min-height` menor que a página, para o aviso descer ao pé) e o fundo é
     * pintado pela página, nunca por uma caixa de 297mm.
     */
    public function test_nenhuma_regra_do_documento_prende_a_folha_em_297mm(): void
    {
        $this->actingAsAdmin();
        $this->fakeGotenberg();

        $this->get($this->pdfUrl())->assertOk();

        preg_match_all(
            '/([a-z-]*height)\s*:\s*297mm/i',
            $this->pdf->lastHtml(),
            $pinned,
        );

        // A mensagem nomeia o culpado: sem ela a falha vira "false is true" num
        // documento com peso legal, e quem herdar o teste não sabe o que caiu.
        $this->assertSame(
            [],
            $pinned[0],
            'Nenhuma altura do certificado pode ser fixada em 297mm. O documento declara: '
                .implode(' | ', $pinned[0]),
        );

        // A lista vazia sozinha passaria também sem folha nenhuma: a folha tem
        // altura mínima, e é ela que deixa o aviso legal chegar ao pé.
        $this->assertMatchesRegularExpression('/\.hoja\s*\{[^}]*min-height:\s*\d+mm/s', $this->pdf->lastHtml());
    }

    /**
     * A abertura usa a cidade do EMISSOR lida na hora (D13) e a data de emissão
     * por extenso (D9) — não o local da turma congelado em `ciudad_emision`, que
     * só serve de reserva. Emissor e RUT continuam vindo do snapshot.
     */
    public function test_abertura_usa_a_cidade_do_emissor_e_a_data_por_extenso(): void
    {
        $snapshot = $this->rawSnapshot();
        $snapshot['ciudad_emision'] = 'Valparaíso';
        $snapshot['emitido_em'] = '2026-08-05';
        $snapshot['emissor'] = ['name' => 'OTEC Congelada SpA', 'rut' => '76.543.210-3'];
        $snapshot['schema_version'] = 2;
        $this->certificate->update(['snapshot' => $snapshot]);
        config(['app.certificate_issuer.city' => 'Santiago']);
        $this->actingAsAdmin();
        $this->fakeGotenberg();

        $this->get($this->pdfUrl())->assertOk();

        $this->assertStringContainsString(
            'En Santiago, a 5 de agosto de 2026, OTEC Congelada SpA [76.543.210-3] certifica que:',
            $this->textoDoDocumento(),
        );
        $this->assertStringNotContainsString('Valparaíso', $this->textoDoDocumento());
    }

    /** Sem cidade configurada, a reserva é a do snapshot; sem as duas, a frase abre em "A {data}". */
    public function test_abertura_cai_para_a_cidade_do_snapshot_e_depois_para_sem_cidade(): void
    {
        $snapshot = $this->rawSnapshot();
        $snapshot['ciudad_emision'] = 'Valparaíso';
        $snapshot['emitido_em'] = '2026-08-05';
        $this->certificate->update(['snapshot' => $snapshot]);
        config(['app.certificate_issuer.city' => '   ']);
        $this->actingAsAdmin();
        $this->fakeGotenberg();

        $this->get($this->pdfUrl())->assertOk();
        $this->assertStringContainsString('En Valparaíso, a 5 de agosto de 2026, ', $this->textoDoDocumento());

        $snapshot['ciudad_emision'] = null;
        $this->certificate->update(['snapshot' => $snapshot]);

        $this->get($this->pdfUrl())->assertOk();
        $this->assertStringContainsString('A 5 de agosto de 2026, ', $this->textoDoDocumento());
        $this->assertStringNotContainsString('En , a', $this->textoDoDocumento());
    }

    /** A ordem do corpo é a da v5: cada bloco abaixo do anterior. */
    public function test_corpo_segue_a_ordem_da_v5(): void
    {
        $snapshot = $this->rawSnapshot();
        $snapshot['resultado']['grades'] = ['final' => 6.5];
        $this->certificate->update(['snapshot' => $snapshot, 'valido_ate' => '2028-08-05']);
        $this->actingAsAdmin();
        $this->fakeGotenberg();

        $this->get($this->pdfUrl())->assertOk();

        $html = $this->pdf->lastHtml();
        $corpo = substr($html, (int) strpos($html, '<body'));
        $posicoes = [];
        foreach ([
            'título' => 'CERTIFICADO DE CAPACITACIÓN',
            'abertura' => 'certifica que:',
            'aluno' => 'Juan Pérez Congelado',
            'rótulo do curso' => 'El trabajador participó en el curso:',
            'curso' => 'Seguridad Congelada',
            'parágrafo' => 'La actividad, realizada entre',
            'empresa' => 'Empresa Congelada',
            'registro' => 'N° de registro',
        ] as $nome => $trecho) {
            $posicoes[$nome] = strpos($corpo, $trecho);
            $this->assertNotFalse($posicoes[$nome], "{$nome} ({$trecho}) não saiu no documento.");
        }

        $ordenadas = $posicoes;
        asort($ordenadas);
        $this->assertSame(array_keys($posicoes), array_keys($ordenadas), 'O corpo saiu fora da ordem da v5.');
    }

    /** O "%" do resultado não cai sozinho na linha de baixo: o espaço antes dele é duro. */
    public function test_percentual_da_asistencia_nao_quebra_da_linha_do_numero(): void
    {
        $snapshot = $this->rawSnapshot();
        $snapshot['resultado']['attendance_pct'] = '92.50';
        $this->certificate->update(['snapshot' => $snapshot]);
        $this->actingAsAdmin();
        $this->fakeGotenberg();

        $this->get($this->pdfUrl())->assertOk();

        $this->assertStringContainsString("asistencia de 92,5\u{00A0}%.", $this->pdf->lastHtml());
    }

    public function test_registro_traz_codigo_e_validade_por_extenso(): void
    {
        $this->certificate->update(['valido_ate' => '2028-08-05']);
        $this->actingAsAdmin();
        $this->fakeGotenberg();

        $this->get($this->pdfUrl())->assertOk();

        $this->assertStringContainsString(
            'N° de registro LOT-2026-1000 · Válido hasta el 5 de agosto de 2028',
            $this->textoDoDocumento(),
        );

        $this->certificate->update(['valido_ate' => null]);

        $this->get($this->pdfUrl())->assertOk();

        $this->assertStringContainsString('N° de registro LOT-2026-1000', $this->textoDoDocumento());
        $this->assertStringNotContainsString('Válido hasta', $this->textoDoDocumento());
    }

    /**
     * O PDF nunca corta texto (D10, Review Focus 1): nenhuma regra elide, e os
     * campos impressos quebram em qualquer ponto em vez de estourar a coluna.
     * Os termos proibidos ficam fora até dos comentários do CSS.
     */
    public function test_nenhum_texto_do_documento_e_clampado(): void
    {
        $this->actingAsAdmin();
        $this->fakeGotenberg();

        $this->get($this->pdfUrl())->assertOk();

        $this->assertHtml(fn (string $html): bool => ! str_contains($html, 'line-clamp')
            && ! str_contains($html, 'text-overflow')
            && ! str_contains($html, 'overflow: hidden')
            && str_contains($html, 'overflow-wrap: anywhere'));
    }

    public function test_assinaturas_lado_a_lado_com_imagem_quando_existe(): void
    {
        $gerente = $this->pngDeLargura(900, 300);
        $instrutor = $this->pngDeLargura(800, 250);
        $this->subirFirma('certificate_settings', CertificateSettings::atual()->id, CertificateSettings::TIPO_FIRMA, $gerente, 'gerente.png');
        $this->subirFirma('redator', $this->certificate->redator_id, 'FIRMA', $instrutor, 'firma.png');
        CertificateSettings::atual()->update(['manager_name' => 'Ana Gerente', 'manager_title' => 'Directora OTEC']);
        $this->actingAsAdmin();
        $this->fakeGotenberg();

        $this->get($this->pdfUrl())->assertOk();

        $this->assertHtml(function (string $html) use ($gerente, $instrutor): bool {
            $gerenteB64 = 'data:image/png;base64,'.base64_encode($gerente);
            $instrutorB64 = 'data:image/png;base64,'.base64_encode($instrutor);

            return substr_count($html, $gerenteB64) === 1
                && substr_count($html, $instrutorB64) === 1
                // gerente à esquerda do instrutor, nome e cargo de cada um
                && strpos($html, $gerenteB64) < strpos($html, $instrutorB64)
                && strpos($html, 'Ana Gerente') < strpos($html, 'María Relatora Congelada')
                && strpos($html, 'Directora OTEC') < strpos($html, '>Instructor<')
                && preg_match('/\.firma-caja img\s*\{[^}]*mix-blend-mode:\s*multiply/s', $html) === 1;
        });
    }

    /** D6 e Review Focus 5: sem assinatura a caixa fica vazia e traço, nome e cargo ficam. */
    public function test_sem_assinatura_a_caixa_fica_vazia_e_traco_e_nome_ficam(): void
    {
        $this->actingAsAdmin();
        $this->fakeGotenberg();

        $this->get($this->pdfUrl())->assertOk();

        $html = $this->pdf->lastHtml();
        $this->assertSame(2, substr_count($html, '<div class="firma-caja"></div>'));
        $this->assertSame(2, substr_count($html, 'class="firma-linea"'));
        $this->assertStringNotContainsString('alt="Firma', $html);
        $this->assertStringContainsString('Marcia de Batalha', $html);
        $this->assertStringContainsString('Gerente OTEC', $html);
        $this->assertStringContainsString('María Relatora Congelada', $html);
        $this->assertStringContainsString('>Instructor<', $html);
    }

    /** A rota do preview monta um certificado sem redator real: a amostra sem instrutor renderiza. */
    public function test_amostra_sem_instrutor_renderiza(): void
    {
        $this->actingAsAdmin();
        $this->fakeGotenberg();
        $curso = Course::findOrFail($this->certificate->course_id);
        $amostra = app(CertificatePreviewBuilder::class)->build($curso);

        $this->assertNull($amostra->redator_id);
        app(CertificatePdfService::class)->renderMuestra($amostra);

        $html = $this->pdf->lastHtml();
        $this->assertStringContainsString('MUESTRA — SIN VALIDEZ', $html);
        $this->assertSame(2, substr_count($html, '<div class="firma-caja"></div>'));
        $this->assertStringContainsString('NOMBRE DEL RELATOR', $html);
        $this->assertStringContainsString('>Instructor<', $html);
    }

    /** O aviso legal sai uma vez só, no pé da última página — com e sem temário. */
    public function test_aviso_legal_sai_uma_vez(): void
    {
        $this->actingAsAdmin();
        $this->fakeGotenberg();

        $this->get($this->pdfUrl())->assertOk();
        $this->assertSame(1, substr_count($this->pdf->lastHtml(), 'no implica un reconocimiento'));

        $snapshot = $this->rawSnapshot();
        $snapshot['curso']['modules'] = [];
        $this->certificate->update(['snapshot' => $snapshot]);

        $this->get($this->pdfUrl())->assertOk();
        $this->assertSame(1, substr_count($this->pdf->lastHtml(), 'no implica un reconocimiento'));
    }

    /** O rodapé técnico é uma caixa da margem da página: sai em toda página física, com o total certo. */
    public function test_rodape_tecnico_e_uma_caixa_de_margem_com_o_total_de_paginas(): void
    {
        $this->actingAsAdmin();
        $this->fakeGotenberg();

        $this->get($this->pdfUrl())->assertOk();

        $this->assertHtml(fn (string $html): bool => str_contains($html, 'content: "LOT-2026-1000 · Página " counter(page) " de " counter(pages);'));
    }

    /**
     * D5, critério 5: trocar a assinatura muda a reimpressão e NADA no registro.
     * O snapshot e o `valido_ate` ficam byte a byte iguais.
     */
    public function test_trocar_a_firma_muda_a_reimpressao_sem_mudar_o_snapshot(): void
    {
        $this->certificate->update(['valido_ate' => '2028-08-05']);
        $this->actingAsAdmin();
        $this->fakeGotenberg();
        $antes = [
            'snapshot' => $this->certificate->fresh()->getRawOriginal('snapshot'),
            'valido_ate' => $this->certificate->fresh()->getRawOriginal('valido_ate'),
        ];

        $this->get($this->pdfUrl())->assertOk();
        $semFirma = $this->pdf->lastHtml();

        $png = $this->pngDeLargura(800, 250);
        $this->subirFirma('redator', $this->certificate->redator_id, 'FIRMA', $png, 'firma.png');

        $this->get($this->pdfUrl())->assertOk();
        $comFirma = $this->pdf->lastHtml();

        $this->assertStringNotContainsString(base64_encode($png), $semFirma);
        $this->assertStringContainsString(base64_encode($png), $comFirma);
        $this->assertSame($antes, [
            'snapshot' => $this->certificate->fresh()->getRawOriginal('snapshot'),
            'valido_ate' => $this->certificate->fresh()->getRawOriginal('valido_ate'),
        ]);
    }

    public function test_qr_aponta_para_frontend_url_e_uuid(): void
    {
        $this->actingAsAdmin();
        config([
            'app.frontend_url' => 'https://frontend.example.test/base/',
            'app.certificate_validation_url' => null,
        ]);
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

    /** P-79: preenchida, a chave própria vence o `frontend_url`. */
    public function test_qr_aponta_para_a_chave_de_validacao_quando_preenchida(): void
    {
        $this->actingAsAdmin();
        config([
            'app.frontend_url' => 'https://frontend.example.test',
            'app.certificate_validation_url' => 'https://valida.example.test/',
        ]);
        $this->fakeGotenberg();
        $expectedQr = base64_encode((string) QrCode::format('svg')
            ->size(180)
            ->margin(0)
            ->generate("https://valida.example.test/validar/{$this->certificate->uuid}"));

        $this->get($this->pdfUrl())->assertOk();

        $this->assertHtml(fn (string $html): bool => str_contains(
            $html,
            "data:image/svg+xml;base64,{$expectedQr}",
        ));
    }

    /**
     * P-79: em produção, sem a base https, o documento não é montado — 500 com
     * a razão no `detail` e registrado no log. O conversor responde 200 de
     * propósito: o 500 só existe porque a recusa vem antes.
     */
    #[DataProvider('chavesQueProducaoRecusa')]
    public function test_pdf_em_producao_sem_chave_https_recusa_com_500_nomeado(?string $chave): void
    {
        // Resolução do controlador: autentica ANTES de trocar para producao —
        // o seeding do admin pede confirmacao quando o ambiente ja e producao.
        $this->actingAsAdmin();
        $this->app->detectEnvironment(fn (): string => 'production');
        config([
            'app.frontend_url' => 'https://app.lotusotec.cl',
            'app.certificate_validation_url' => $chave,
        ]);
        Exceptions::fake();
        Http::fake(['*/forms/chromium/convert/html' => Http::response('%PDF')]);

        $this->getJson($this->pdfUrl())
            ->assertStatus(500)
            ->assertJsonPath('detail', self::RECUSA_DE_URL);

        Http::assertNothingSent();
        Exceptions::assertReported(ValidacaoDeCertificadoNaoConfigurada::class);
    }

    /** @return array<string, array{?string}> */
    public static function chavesQueProducaoRecusa(): array
    {
        return [
            'ausente' => [null],
            'http cru, o EIP da fase sem DNS' => ['http://18.230.53.197'],
        ];
    }

    /**
     * Invariante §4.7 da spec: o PDF é sempre regerado do snapshot e não é
     * materializado em lugar nenhum — nem disco, nem bucket, nem temporário.
     * Um arquivo persistido envelheceria em silêncio contra o snapshot, que é
     * a única fonte legal do documento.
     *
     * Este é o único teste do documento que NÃO troca o conversor pelo fake: a
     * invariante é sobre a requisição inteira, e o `GotenbergHtmlToPdf` — que
     * manipula os bytes do PDF — precisa estar no caminho para ser provado.
     */
    public function test_pdf_nao_e_materializado_em_disco_bucket_nem_temporario(): void
    {
        $this->actingAsAdmin();
        Http::preventStrayRequests();
        Http::fake(['*/forms/chromium/convert/html' => Http::response('%PDF-1.4 real')]);
        Storage::fake('local');
        Storage::fake('public');
        Storage::fake('s3');
        $tempBefore = $this->tempFiles();

        $this->get($this->pdfUrl())->assertOk();

        // Prende a invariante ao adapter real: sem isto ela passaria por
        // vacuidade se o documento deixasse de atravessar o conversor.
        Http::assertSent(fn ($request): bool => str_contains(
            $request->url(),
            '/forms/chromium/convert/html',
        ));
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

    /**
     * Cada imagem pesada aparece UMA vez no HTML (P-28): o fundo da primeira
     * página, o das continuações e o logo. Duas ocorrências dobram o HTML — e é
     * exatamente essa classe de excesso que produziu o "visualizador travado".
     * O fundo mora numa variável CSS e é reusado pelas caixas da margem; o logo
     * mora no cabeçalho que a tabela repete em toda página física.
     */
    public function test_cada_fundo_e_o_logo_embutidos_uma_unica_vez(): void
    {
        $this->actingAsAdmin();
        $this->fakeGotenberg();

        $this->get($this->pdfUrl())->assertOk();
        $html = $this->pdf->lastHtml();

        foreach ([
            'images/fundo-certificado.jpg' => 'fundo da primeira página',
            'images/fundo-certificado-continuacao.jpg' => 'fundo de continuação',
            'images/lotus-logo.png' => 'logo',
        ] as $arquivo => $nome) {
            $this->assertSame(
                1,
                substr_count($html, base64_encode((string) file_get_contents(resource_path($arquivo)))),
                "O {$nome} não foi embutido uma única vez.",
            );
        }
    }

    /**
     * O fundo com as barras só existe na página 1 e o de continuação, sem elas,
     * em toda outra página física: duas imagens, duas regras de página.
     */
    public function test_fundo_com_barras_so_na_primeira_pagina(): void
    {
        $this->actingAsAdmin();
        $this->fakeGotenberg();

        $this->get($this->pdfUrl())->assertOk();

        $this->assertHtml(fn (string $html): bool => preg_match('/@page\s*:first\s*\{[^@]*@bottom-center/s', $html) === 1
            && str_contains($html, '--fundo-primera-pagina')
            && str_contains($html, '--fundo-continuacion')
            && str_contains($html, 'background-size: 210mm 297mm'));
    }

    /**
     * O bloco de verificação abre a página 1 à esquerda do logo: QR, "N° …",
     * "Emitido el dd-mm-aaaa" e a instrução numa linha só. O que a rota pública
     * valida é o UUID dentro do QR, e ele não muda; esta guarda existe para que
     * a realocação não apague silenciosamente um dos campos de identificação.
     */
    public function test_qr_e_identificacao_formam_um_bloco_no_topo(): void
    {
        $this->actingAsAdmin();
        $this->fakeGotenberg();

        $this->get($this->pdfUrl())->assertOk();
        $html = $this->pdf->lastHtml();

        $this->assertStringContainsString('class="identificacion"', $html);
        $this->assertStringContainsString('N° LOT-2026-1000', $html);
        $this->assertStringContainsString('Emitido el 05-08-2026', $html);
        $this->assertStringContainsString('Verifique la autenticidad escaneando el código.', $html);
        $this->assertStringNotContainsString('Emisión:', $html);

        // O bloco abre a folha, antes do corpo, e o QR sai do SVG embutido.
        $this->assertLessThan(
            strpos($html, 'class="cabecalho"'),
            strpos($html, 'class="identificacion"'),
        );
        $this->assertMatchesRegularExpression('/\.identificacion\s*\{[^}]*left:\s*\d+mm;/s', $html);
        $this->assertMatchesRegularExpression('/\.identificacion img\s*\{[^}]*width:\s*22mm;/s', $html);
        $this->assertMatchesRegularExpression('/class="identificacion">\s*<img src="data:image\/svg\+xml;base64,/', $html);
    }

    /**
     * A tipografia do documento aprovado, embutida e não instalada: um conversor
     * sem a fonte degrada em SILÊNCIO para um fallback, e falha muda em
     * documento com peso legal é o que a decisão D4 recusou.
     */
    public function test_fontes_do_template_embutidas_por_font_face(): void
    {
        $this->actingAsAdmin();
        $this->fakeGotenberg();

        $this->get($this->pdfUrl())->assertOk();
        $html = $this->pdf->lastHtml();

        foreach (['fonts/lexend-latin.woff2', 'fonts/montserrat-800-latin.woff2'] as $font) {
            $b64 = base64_encode((string) file_get_contents(resource_path($font)));
            $this->assertSame(1, substr_count($html, $b64), "{$font} não foi embutida uma única vez.");
        }

        $this->assertHtml(fn (string $h): bool => str_contains($h, "font-family: 'Lexend'")
            && str_contains($h, "font-family: 'Montserrat'")
            && ! str_contains($h, 'DejaVu Sans'));
    }

    /**
     * A barra `.accent` era desenhada em CSS porque o fundo antigo não a tinha.
     * O fundo novo traz as duas. Manter a barra a duplicaria sobre si mesma —
     * e manteria viva a falha de enquadramento de `:130-138`.
     */
    public function test_barras_accent_morreram_com_o_fundo_novo(): void
    {
        $this->actingAsAdmin();
        $this->fakeGotenberg();

        $this->get($this->pdfUrl())->assertOk();

        $this->assertHtml(fn (string $html): bool => ! str_contains($html, 'accent')
            && ! str_contains($html, 'linear-gradient'));
    }

    /** O texto visível do documento: sem tags, entidades decodificadas e espaço normalizado. */
    private function textoDoDocumento(): string
    {
        $corpo = substr($this->pdf->lastHtml(), (int) strpos($this->pdf->lastHtml(), '<body'));

        return (string) preg_replace(
            '/\s+/u',
            ' ',
            str_replace("\u{00A0}", ' ', html_entity_decode(strip_tags($corpo))),
        );
    }

    /** Grava o binário no disco E a linha em `files`, como o upload real faz. */
    private function subirFirma(string $dono, int $donoId, string $tipo, string $bytes, string $nome): void
    {
        $path = "{$dono}/{$donoId}/{$nome}";
        Storage::disk(config('filesystems.default'))->put($path, $bytes);

        File::create([
            'fileable_type' => $dono, 'fileable_id' => $donoId, 'type' => $tipo,
            'path' => $path, 'original_name' => $nome, 'mime' => 'image/png', 'size' => strlen($bytes),
        ]);
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

    /**
     * O snapshot CRU, como o banco guarda. Os testes escrevem array por aqui
     * de propósito: é o que simula documento emitido antes de o tipo existir,
     * e o que prova que a leitura tolera a versão 1 do schema.
     *
     * @return array<string, mixed>
     */
    private function rawSnapshot(): array
    {
        return json_decode(
            (string) $this->certificate->getRawOriginal('snapshot'),
            true,
        );
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
