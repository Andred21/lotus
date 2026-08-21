<?php

namespace Tests\Feature\Operation;

use App\Domains\Commercial\Models\Budget;
use App\Domains\Commercial\Models\Quote;
use App\Domains\Identity\Models\Student;
use App\Domains\Identity\Models\User;
use App\Domains\Operation\Enums\TurmaModalidade;
use App\Domains\Operation\Models\Enrollment;
use App\Domains\Operation\Models\Turma;
use App\Domains\Operation\Services\ManualDocumentService;
use App\Shared\Office\DocxToPdf;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\Support\CreatesDomainRecords;
use Tests\Support\Office\FakeDocxToPdf;
use Tests\TestCase;
use ZipArchive;

class ManualTurmaTest extends TestCase
{
    use CreatesDomainRecords;
    use RefreshDatabase;

    private Turma $turma;

    protected function setUp(): void
    {
        parent::setUp();
        $clientId = $this->makeClientWithUser(['legal_name' => 'ACME Chile'], ['rut' => '33.444.555-0'])->id;
        $budget = Budget::create(['client_id' => $clientId, 'code' => 'Scap 1']);
        $course = $this->makeCourse(['name' => 'Alta Tensión', 'workload_hours' => 8]);
        $course->modules()->create([
            'sort_order' => 0, 'name' => 'Módulo Seguridad', 'learnings' => 'L',
            'contents' => 'C', 'theory_hours' => 4, 'practice_hours' => 4,
        ]);
        $quote = Quote::forceCreate([
            'budget_id' => $budget->id, 'course_id' => $course->id, 'seq_in_budget' => 1,
            'student_count' => 5, 'value_uf' => 10, 'status' => 'approved',
        ]);
        $this->turma = Turma::create([
            'quote_id' => $quote->id, 'course_id' => $course->id,
            'modalidade' => TurmaModalidade::Presencial, 'local_aplicacao' => 'Santiago',
            'start_date' => '2026-08-01', 'end_date' => '2026-08-10',
        ]);
    }

    public function test_manual_devolve_pdf_convertido_do_docx(): void
    {
        $this->actingAsAdmin();
        $fake = new FakeDocxToPdf;
        $this->app->instance(DocxToPdf::class, $fake);

        $response = $this->get("/api/turmas/{$this->turma->id}/manual");

        $response->assertOk()->assertHeader('Content-Type', 'application/pdf');
        $this->assertStringStartsWith('%PDF', $response->getContent());

        // DoD 9: o PDF veio do MESMO pacote que o download entrega — o que o
        // conversor recebeu começa com a assinatura de ZIP, não com `<!doctype`.
        $this->assertStringStartsWith('PK', $fake->lastDocx());
        $this->assertSame(1, $fake->timesCalled());
    }

    /**
     * O nome deste teste promete o envelope, então ele afirma o envelope: só o
     * status deixaria passar um 500 em HTML puro, que é exatamente a classe de
     * regressão que o `ProblemDetails` já apresentou uma vez (mascaramento do
     * `detail` visto no bloco anterior).
     */
    public function test_conversor_fora_do_ar_500_rfc7807(): void
    {
        $this->actingAsAdmin();
        Http::preventStrayRequests();
        Http::fake(['*/forms/libreoffice/convert' => Http::response('boom', 503)]);

        $this->getJson("/api/turmas/{$this->turma->id}/manual")
            ->assertStatus(500)
            ->assertHeader('content-type', 'application/problem+json')
            ->assertJsonPath('type', 'https://lotus.cl/errors/server')
            ->assertJsonPath('title', 'Erro interno')
            ->assertJsonPath('status', 500)
            ->assertJsonPath(
                'detail',
                'O conversor de documentos falhou ao converter o manual (HTTP 503).',
            );
    }

    public function test_manual_exige_turma_view(): void
    {
        // autenticado sem nenhuma permissão → 403
        $user = User::factory()->create(['type' => 'admin', 'is_active' => true]);
        $this->actingAs($user, 'web');

        $this->getJson("/api/turmas/{$this->turma->id}/manual")->assertForbidden();
        $this->getJson("/api/turmas/{$this->turma->id}/manual/docx")->assertForbidden();
    }

    public function test_manual_docx_devolve_o_pacote_para_download(): void
    {
        $this->actingAsAdmin();

        $response = $this->get("/api/turmas/{$this->turma->id}/manual/docx");

        $response->assertOk()->assertHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        );
        $this->assertSame(
            "attachment; filename=\"manual-turma-{$this->turma->id}.docx\"",
            $response->headers->get('Content-Disposition'),
        );
        $this->assertStringStartsWith('PK', $response->getContent());
    }

    /**
     * O DOCX é o pacote, não uma conversão dele: conversor fora do ar não pode
     * derrubar o download. `preventStrayRequests` sem nenhum `fake` prova isso
     * — qualquer chamada HTTP faria o teste estourar.
     */
    public function test_docx_nao_depende_do_conversor(): void
    {
        $this->actingAsAdmin();
        Http::preventStrayRequests();

        $this->get("/api/turmas/{$this->turma->id}/manual/docx")->assertOk();
    }

    /** DoD 3: o `.docx` é um pacote OOXML válido, no papel do template. */
    public function test_docx_e_pacote_ooxml_valido_em_oficio_paisagem(): void
    {
        $docx = app(ManualDocumentService::class)->docx($this->turma);
        $file = tempnam(sys_get_temp_dir(), 'manual');
        file_put_contents($file, $docx);

        $zip = new ZipArchive;
        $this->assertTrue($zip->open($file) === true);
        foreach (['[Content_Types].xml', '_rels/.rels', 'word/document.xml',
            'word/_rels/document.xml.rels', 'word/media/lotus-logo.png'] as $part) {
            $this->assertNotFalse($zip->locateName($part), "part ausente: {$part}");
        }
        $zip->close();
        unlink($file);

        $xml = $this->documentXml();

        // A declaração vem do `@xmlDecl`: escrita literal na Blade, ela vira
        // tag curta na compilação (`short_open_tag` está On) e o arquivo nem
        // chega a renderizar.
        $this->assertStringStartsWith('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>', $xml);
        $this->assertStringContainsString('<w:pgSz w:w="20183" w:h="12246" w:orient="landscape"/>', $xml);
    }

    /**
     * DoD 3, a metade que o LibreOffice não cobra: o Word identifica cada
     * desenho pelo `id` do `<wp:docPr>` e pede reparo do arquivo quando ele
     * repete. O `docs/templates/manual.docx`, escrito pelo próprio Word, numera
     * os seus dez desenhos de 1 a 10 sem repetir — e escreve `id="0"` nos dez
     * `<pic:cNvPr>`, porque ali o id é interno à figura. O cabeçalho é um
     * partial incluído cinco vezes; sem contador, sairiam cinco ids iguais.
     */
    public function test_cada_desenho_do_pacote_tem_id_unico(): void
    {
        preg_match_all('/<wp:docPr id="(\d+)"/', $this->documentXml(), $desenhos);

        $this->assertCount(5, $desenhos[1], 'um cabeçalho por página');
        $this->assertSame($desenhos[1], array_values(array_unique($desenhos[1])));
    }

    /**
     * O manual numera linha a linha e é ASSINADO por linha, e o PDF e o DOCX
     * são dois requests. Sem ORDER BY a mesma turma podia sair numerada de dois
     * jeitos — o defeito que o `EnrollmentQueryBuilder::orderByStudentName` já
     * documenta para a tela, aqui com peso de documento.
     */
    public function test_as_tres_grades_saem_em_ordem_de_nome(): void
    {
        foreach (['Zoe Zapata', 'Ana Alvarez', 'Bruno Bravo'] as $nombre) {
            $this->matricular($nombre);
        }

        preg_match_all('/>(Ana Alvarez|Bruno Bravo|Zoe Zapata)<\/w:t>/', $this->documentXml(), $orden);

        $this->assertSame([
            'Ana Alvarez', 'Bruno Bravo', 'Zoe Zapata',
            'Ana Alvarez', 'Bruno Bravo', 'Zoe Zapata',
            'Ana Alvarez', 'Bruno Bravo', 'Zoe Zapata',
        ], $orden[1]);
    }

    /**
     * DoD 4: preenchimento provado por CONTAGEM.
     *
     * Cada aluno aparece três vezes — Antecedentes, Asistencia e Evaluaciones —
     * e o formulário impresso não encolhe: 85 linhas com 10 alunos, que são
     * 5 cabeçalhos de página + 7 (Datos) + 1+22 (Antecedentes) + 1+20
     * (Asistencia) + 1 (notas) + 1+5+1 (Temas) + 1+20 (Evaluaciones).
     *
     * A contagem só fecha porque a Blade escreve TODA linha como `<w:tr>` sem
     * atributo, com as propriedades em `<w:trPr>`. É convenção do arquivo, e
     * esta asserção é quem a cobra.
     */
    public function test_cada_matricula_vira_uma_linha_nas_tres_grades(): void
    {
        $this->enroll(10);
        $xml = $this->documentXml();

        for ($i = 1; $i <= 10; $i++) {
            $this->assertSame(3, substr_count($xml, ">Alumno {$i}</w:t>"), "Alumno {$i}");
        }

        $this->assertSame(85, substr_count($xml, '<w:tr>'));
    }

    /** Turma maior que o formulário ESTENDE a grade em vez de esconder aluno. */
    public function test_turma_maior_que_o_formulario_estende_as_grades(): void
    {
        $this->enroll(25);
        $xml = $this->documentXml();

        $this->assertSame(3, substr_count($xml, '>Alumno 25</w:t>'));
        // 5 + 7 + (1+25) + (1+25) + 1 + (1+5+1) + (1+25) = 98.
        $this->assertSame(98, substr_count($xml, '<w:tr>'));
    }

    /** DoD 4: o total de horas é SOMA dos módulos, não campo digitado. */
    public function test_total_de_horas_soma_os_modulos(): void
    {
        $this->turma->course->modules()->create([
            'sort_order' => 1, 'name' => 'Módulo Práctico', 'learnings' => 'L2',
            'contents' => 'C2', 'theory_hours' => 2, 'practice_hours' => 6,
        ]);

        $xml = $this->documentXml();

        // 4+2 teóricas e 4+6 práticas. Ancorado no rótulo do total: "6" e "10"
        // soltos também são número de linha e coluna de dia na Asistencia.
        $total = substr($xml, (int) strpos($xml, 'Total de Horas Capacitadas'));
        $this->assertMatchesRegularExpression('/>6<\/w:t>.*?>10<\/w:t>/s', substr($total, 0, 4000));
    }

    /** DoD 6: dado hostil não corrompe o pacote. */
    public function test_escape_hostil_nao_corrompe_o_pacote(): void
    {
        $this->turma->course->update(['name' => "A & B <c> \"d\" \x00\x08"]);

        $xml = $this->documentXml();

        $this->assertStringContainsString('A &amp; B &lt;c&gt; &quot;d&quot;', $xml);
        $this->assertNotFalse(simplexml_load_string($xml), 'O document.xml deixou de ser XML válido.');
    }

    /**
     * A Blade OOXML não pode INTERPOLAR com `{{ }}` (escapa para HTML e deixa
     * passar caractere de controle) nem com `{!! !!}` (não escapa nada). Só
     * `@xml` e `@xmlLines`. Comentário Blade some na compilação e não chega ao
     * pacote, então sai da conta: o que a guarda persegue é interpolação.
     *
     * Os testes acima provam o COMPORTAMENTO; este impede o próximo campo de
     * nascer desprotegido.
     */
    public function test_blades_do_manual_so_interpolam_pelas_diretivas_de_xml(): void
    {
        $blades = array_merge(
            glob(resource_path('views/operation/manual/*.blade.php')) ?: [],
            glob(resource_path('views/operation/manual/partials/*.blade.php')) ?: [],
        );

        $this->assertNotEmpty($blades);

        foreach ($blades as $blade) {
            $semComentario = preg_replace('/\{\{--.*?--\}\}/s', '', (string) file_get_contents($blade));

            $this->assertStringNotContainsString('{{', (string) $semComentario, $blade);
            $this->assertStringNotContainsString('{!!', (string) $semComentario, $blade);
        }
    }

    /** Idioma do `EnrollmentModelTest`: aluno é User inativo + Student (RN-01). */
    private function enroll(int $n): void
    {
        for ($i = 1; $i <= $n; $i++) {
            $this->matricular("Alumno {$i}");
        }
    }

    private function matricular(string $nombre): void
    {
        $student = Student::create([
            'user_id' => User::factory()->create([
                'type' => 'aluno', 'is_active' => false, 'name' => $nombre,
            ])->id,
        ]);

        Enrollment::create(['turma_id' => $this->turma->id, 'student_id' => $student->id]);
    }

    private function documentXml(): string
    {
        $docx = app(ManualDocumentService::class)->docx($this->turma->fresh());
        $file = tempnam(sys_get_temp_dir(), 'manual');
        file_put_contents($file, $docx);

        $zip = new ZipArchive;
        $zip->open($file);
        $xml = (string) $zip->getFromName('word/document.xml');
        $zip->close();
        unlink($file);

        return $xml;
    }
}
