<?php

namespace Tests\Feature\Certification;

use App\Domains\Certification\Enums\CertificateStatus;
use App\Domains\Certification\Models\Certificate;
use App\Domains\Identity\Models\User;
use App\Shared\Pdf\HtmlToPdf;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use SimpleSoftwareIO\QrCode\Facades\QrCode;
use Tests\Support\Certification\IssuableEnrollmentBuilder;
use Tests\Support\Pdf\FakeHtmlToPdf;
use Tests\TestCase;

class CertificatePdfTest extends TestCase
{
    use RefreshDatabase;

    private Certificate $certificate;

    private FakeHtmlToPdf $pdf;

    protected function setUp(): void
    {
        parent::setUp();

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
        $snapshot = $this->rawSnapshot();
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
        $snapshot = $this->rawSnapshot();
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
        $snapshot = $this->rawSnapshot();
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
                && ! str_contains($html, 'Temario del Curso')
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

        $this->assertHtml(fn (string $html): bool => ! str_contains($html, 'Temario del Curso')
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
     * O nome diz o que as asserções provam: o rodapé sai do fluxo do documento
     * ou não sai. **Comprimento de texto aqui é cenário, não asserção** — o
     * teste passa igual com uma frase curta (medido), porque HTML falso não
     * pagina. Que a descrição longa não empurre o rodapé para fora da página só
     * se prova no PDF real, e essa prova é do gate (R-4).
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
            $footerPosition = strpos($html, 'class="certificate-footer"');

            return $descriptionPosition !== false
                && $footerPosition !== false
                && $descriptionPosition < $footerPosition
                && preg_match('/\.page\s*\{[^}]*display:\s*flex;/s', $html) === 1
                && preg_match('/\.certificate-footer\s*\{[^}]*margin-top:\s*auto;/s', $html) === 1
                && preg_match('/\.(?:signature|qr|disclaimer)\s*\{[^}]*position:\s*absolute;/s', $html) === 0;
        });
    }

    /**
     * 297mm é a altura da folha A4, e só `min-height` pode carregá-la. Com
     * `height` a folha vira uma caixa que não pagina e o Chromium pinta o
     * excedente POR CIMA da página seguinte: medido em 2026-08-08 com nome de
     * curso de 147 caracteres, o QR, a assinatura e o aviso legal saíram
     * sobrepostos ao temário. Documento corrompido, sem nenhum aviso.
     *
     * A varredura é do documento INTEIRO, e não da regra `.page`, porque a
     * regressão que este teste existe para barrar (`c7585bd`) não morava no
     * `.page` — ele seguia com `min-height: 297mm`. Morava numa regra IRMÃ,
     * `.page--certificado { height: 297mm; }`, aplicada à primeira `<section>`.
     * Guarda que só inspecionasse `.page` passaria contra exatamente o código
     * que ela deve pegar.
     *
     * `max-height: 297mm` recorta igual e entra na mesma rede. Por isso o teste
     * não procura uma proibição nomeada: ele COLETA toda propriedade que prende
     * a folha em 297mm — em regra, em `style=` inline, onde for — e exige que a
     * lista inteira seja `min-height`. A lista vazia também reprova; sem isso,
     * apagar a altura mínima passaria batido.
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
            ['min-height'],
            array_values(array_unique($pinned[1])),
            'Só `min-height` pode prender a folha do certificado em 297mm. '
                .'O documento declara: '
                .(implode(' | ', $pinned[0]) ?: '(nenhuma altura de 297mm)'),
        );
    }

    /**
     * A elisão da descrição é o único corte tolerado no documento, e tem de ser
     * VISÍVEL. `-webkit-line-clamp` com inteiro é o único mecanismo que este
     * Chromium marca com reticências (medido: `line-clamp: auto`,
     * `block-ellipsis` e `text-overflow` cortam mudos, no meio do glifo).
     *
     * O clamp mora em `.narrative--contenidos`, NÃO em `.narrative`: nota,
     * assistência e vigência também são `.narrative` e nenhuma delas pode ser
     * cortada. Mover o clamp para a classe genérica é uma regressão de peso
     * legal, e a última asserção é o que a pega.
     */
    public function test_so_a_descricao_do_curso_e_elidida_e_a_elisao_e_marcada(): void
    {
        $snapshot = $this->rawSnapshot();
        $snapshot['resultado']['grades'] = ['final' => '6,4'];
        $snapshot['resultado']['attendance_pct'] = '95.00';
        $this->certificate->update(['snapshot' => $snapshot]);
        $this->actingAsAdmin();
        $this->fakeGotenberg();

        $this->get($this->pdfUrl())->assertOk();

        $this->assertHtml(function (string $html): bool {
            preg_match('/\.narrative--contenidos\s*\{([^}]*)\}/s', $html, $clamped);
            preg_match('/\.narrative\s*\{([^}]*)\}/s', $html, $generic);
            $clampedBody = $clamped[1] ?? '';
            $genericBody = $generic[1] ?? '';

            return preg_match('/-webkit-line-clamp:\s*\d+;/', $clampedBody) === 1
                && preg_match('/display:\s*-webkit-box;/', $clampedBody) === 1
                && preg_match('/overflow:\s*hidden;/', $clampedBody) === 1
                // a descrição do curso é o único parágrafo que leva o clamp
                && preg_match_all('/class="narrative narrative--contenidos/', $html) === 1
                // nota e assistência saem, e saem SEM clamp
                && str_contains($html, 'nota 6,4')
                && str_contains($html, 'Asistencia registrada: 95.00%')
                // a regra genérica TEM de existir: renomeá-la faria a negativa
                // abaixo passar contra um corpo vazio, que é o modo de falha
                // que ela existe para pegar
                && str_contains($genericBody, 'line-height')
                && preg_match('/-webkit-line-clamp|overflow:\s*hidden/', $genericBody) === 0;
        });
    }

    /**
     * O clamp (CSS) e o limiar de caracteres (PHP) são UM ajuste só: o limiar
     * troca o corpo para 9px antes de o clamp de 11px morder. Se divergirem, uma
     * descrição logo abaixo do limiar é clampada a 11px e perde texto que o tier
     * de 9px mostraria inteiro.
     *
     * Os números estão fixados aqui de propósito. 546 = 7 linhas × 78 caracteres,
     * e o 78 saiu de medição no PDF real (busca binária do comprimento da
     * descrição até as reticências aparecerem, 2026-08-10, com o corpo já em
     * Lexend): DENTRO do espanhol real a menor capacidade das 7 linhas de 11px é
     * 548 caracteres (palavras de 24; 25, a ordem das mais longas do idioma,
     * comporta 566); prosa comum comporta 871. Fora desse perfil o modelo não
     * vale — com palavras de 33 caracteres a capacidade é 505 e a descrição é
     * elidida ainda a 11px, com reticências —, e o Blade registra essa faixa de
     * validade junto do número. Mexer no clamp, na fonte ou no limiar sem
     * remedir quebra este teste, que é o ponto.
     */
    public function test_limiar_troca_o_corpo_antes_de_o_clamp_de_11px_morder(): void
    {
        $this->actingAsAdmin();

        $noLimiar = $this->renderComDescricaoDe(546);
        $acimaDoLimiar = $this->renderComDescricaoDe(547);

        // o clamp impresso no CSS é o mesmo que deriva o limiar
        $this->assertMatchesRegularExpression(
            '/\.narrative--contenidos\s*\{[^}]*-webkit-line-clamp:\s*7;/s',
            $noLimiar,
        );
        $this->assertMatchesRegularExpression(
            '/\.narrative--compact\s*\{[^}]*-webkit-line-clamp:\s*10;/s',
            $noLimiar,
        );
        $this->assertStringNotContainsString('narrative--compact"', $noLimiar);
        $this->assertStringContainsString('narrative--compact"', $acimaDoLimiar);
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
     * O base64 do fundo aparece UMA vez. Duas ocorrências dobram o HTML, e é
     * exatamente essa classe de excesso que produziu o "visualizador travado".
     * `background-image` num `.page` compartilhado é o que garante a unicidade;
     * um `<img>` por página a quebraria — e reintroduziria a ancoragem absoluta
     * que a `.accent-bottom` já provou frágil.
     */
    public function test_fundo_embutido_uma_unica_vez(): void
    {
        $this->actingAsAdmin();
        $this->fakeGotenberg();

        $this->get($this->pdfUrl())->assertOk();

        $jpeg = base64_encode((string) file_get_contents(resource_path('images/fundo-certificado.jpg')));

        $this->assertSame(
            1,
            substr_count($this->pdf->lastHtml(), $jpeg),
            'O fundo foi embutido mais de uma vez.',
        );
        $this->assertHtml(fn (string $html): bool => str_contains($html, 'background-repeat: repeat-y')
            && str_contains($html, 'background-size: 100% 297mm'));
    }

    /**
     * O QR sobe para o topo direito e leva o par código/emissão junto — mudança
     * de LUGAR, não de conteúdo. O que a rota pública valida é o UUID dentro do
     * QR, e ele não muda; esta guarda existe para que a realocação não apague
     * silenciosamente um dos dois campos de identificação.
     */
    public function test_qr_e_identificacao_formam_um_bloco_no_topo(): void
    {
        $this->actingAsAdmin();
        $this->fakeGotenberg();

        $this->get($this->pdfUrl())->assertOk();
        $html = $this->pdf->lastHtml();

        $this->assertStringContainsString('class="identificacion"', $html);
        $this->assertStringContainsString('N° LOT-2026-1000', $html);
        $this->assertStringContainsString('Emisión:', $html);

        // O QR encolheu: 32mm no rodapé viram 22mm no topo.
        $this->assertMatchesRegularExpression('/\.identificacion img\s*\{[^}]*width:\s*22mm;/s', $html);

        // O bloco abre a folha, antes do logo; o rodapé fica só com a assinatura.
        $this->assertLessThan(
            strpos($html, 'class="brand"'),
            strpos($html, 'class="identificacion"'),
        );
        $this->assertStringNotContainsString('class="qr"', $html);
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

    /**
     * Renderiza o documento com uma descrição de comprimento exato, para o
     * teste do limiar poder falar em caracteres.
     */
    private function renderComDescricaoDe(int $chars): string
    {
        $snapshot = $this->rawSnapshot();
        $snapshot['curso']['description'] = mb_substr(
            str_repeat('Contenido técnico del curso de alta tensión. ', 40),
            0,
            $chars,
        );
        $this->certificate->update(['snapshot' => $snapshot]);
        $this->fakeGotenberg();

        $this->get($this->pdfUrl())->assertOk();

        return $this->pdf->lastHtml();
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
