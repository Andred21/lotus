<?php

namespace Tests\Feature\Certification;

use App\Domains\Catalog\Models\Course;
use App\Domains\Certification\Enums\CertificateStatus;
use App\Domains\Certification\Models\Certificate;
use App\Domains\Certification\Services\CertificateSpreadsheet;
use App\Domains\Commercial\Models\Budget;
use App\Domains\Commercial\Models\Client;
use App\Domains\Commercial\Models\Quote;
use App\Domains\Identity\Models\Redator;
use App\Domains\Identity\Models\Student;
use App\Domains\Identity\Models\User;
use App\Domains\Operation\Enums\EnrollmentApprovalStatus;
use App\Domains\Operation\Enums\TurmaModalidade;
use App\Domains\Operation\Enums\TurmaStatus;
use App\Domains\Operation\Models\Enrollment;
use App\Domains\Operation\Models\Turma;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;
use Illuminate\Testing\TestResponse;
use OpenSpout\Common\Entity\Cell;
use OpenSpout\Common\Entity\Cell\FormulaCell;
use OpenSpout\Reader\XLSX\Reader;
use Tests\Support\Certification\IssuableEnrollmentBuilder;
use Tests\Support\CreatesDomainRecords;
use Tests\TestCase;
use ZipArchive;

/**
 * Exportação do Historial (spec §5.3 e §5.4): o N do aviso e as linhas da
 * planilha saem do MESMO escopo, e revogado não entra em nenhum dos dois.
 */
class CertificateExportTest extends TestCase
{
    use CreatesDomainRecords;
    use RefreshDatabase;

    private const CABECALHO = ['Código', 'Fecha Curso', 'RUT', 'Nombre Completo', 'Curso', 'Link Descarga'];

    private Client $client;

    private Budget $budget;

    private Course $course;

    private Turma $turma;

    private Redator $redator;

    private int $seqCotacao = 1;

    protected function setUp(): void
    {
        parent::setUp();

        Carbon::setTestNow('2026-08-05 10:00:00');

        $builder = IssuableEnrollmentBuilder::make()->create();
        $this->client = $builder->clientModel();
        $this->course = $builder->courseModel();
        $this->turma = $builder->turmaModel();
        $this->redator = $builder->redatorModel();
        $this->budget = $this->turma->quote->budget;
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();

        parent::tearDown();
    }

    public function test_resumo_conta_o_mesmo_conjunto_da_planilha(): void
    {
        $this->actingAsAdmin();
        $outraTurma = $this->criarTurma();

        // No conjunto: cotação A + busca "Pérez" + vencido.
        $this->emitir('LOT-2026-0001', nome: 'Juan Pérez', validoAte: '2026-01-01');
        $this->emitir('LOT-2026-0002', nome: 'Ana Pérez', validoAte: '2026-01-01');
        // Fora, um filtro de cada vez.
        $this->emitir('LOT-2026-0003', nome: 'Juan Pérez', validoAte: '2099-01-01');
        $this->emitir('LOT-2026-0004', nome: 'Luis García', validoAte: '2026-01-01');
        $this->emitir('LOT-2026-0005', nome: 'Juan Pérez', validoAte: '2026-01-01', turma: $outraTurma);

        $query = '?q=P%C3%A9rez&display_status=vencido&quote_id='.$this->turma->quote_id;

        $this->getJson('/api/certificates/export/summary'.$query)
            ->assertOk()
            ->assertExactJson(['total' => 2, 'revocados' => 0]);

        $linhas = $this->lerPlanilha($this->get('/api/certificates/export/planilha'.$query)->assertOk());

        $this->assertSame(['LOT-2026-0001', 'LOT-2026-0002'], array_column($linhas['dados'], 0));
    }

    /**
     * A composição dos filtros mora em dois lugares (a listagem e o escopo da
     * exportação). Este teste os compara de ponta a ponta, com `q`,
     * `display_status` e `quote_id` juntos: se um mudar sem o outro, o N do
     * aviso deixa de ser o que a tela lista.
     */
    public function test_exportacao_com_os_tres_filtros_e_o_conjunto_da_listagem(): void
    {
        $this->actingAsAdmin();
        $outraTurma = $this->criarTurma();

        $this->emitir('LOT-2026-0301', nome: 'Juan Pérez', validoAte: '2026-01-01');
        $this->emitir('LOT-2026-0302', nome: 'Ana Pérez', validoAte: '2026-01-01');
        // Cada um fica fora por um filtro: estado, busca, cotação.
        $this->emitir('LOT-2026-0303', nome: 'Juan Pérez', validoAte: '2099-01-01');
        $this->emitir('LOT-2026-0304', nome: 'Luis García', validoAte: '2026-01-01');
        $this->emitir('LOT-2026-0305', nome: 'Juan Pérez', validoAte: '2026-01-01', turma: $outraTurma);
        // Revogado: nunca é "vencido" na listagem, então sai dos dois lados.
        $this->emitir('LOT-2026-0306', nome: 'Juan Pérez', validoAte: '2026-01-01', status: CertificateStatus::Revocado);

        $this->assertExportacaoIgualListagem(
            'q=P%C3%A9rez&display_status=vencido&quote_id='.$this->turma->quote_id,
            esperados: ['LOT-2026-0301', 'LOT-2026-0302'],
        );
    }

    /** Sem `display_status` o revogado entra na listagem: `total + revocados` fecha com o `meta.total`. */
    public function test_total_mais_revogados_da_exportacao_fecha_com_a_listagem(): void
    {
        $this->actingAsAdmin();
        $outraTurma = $this->criarTurma();

        $this->emitir('LOT-2026-0311', nome: 'Juan Pérez', validoAte: '2026-01-01');
        $this->emitir('LOT-2026-0312', nome: 'Ana Pérez', validoAte: '2099-01-01');
        $this->emitir('LOT-2026-0313', nome: 'Rosa Pérez', status: CertificateStatus::Revocado);
        $this->emitir('LOT-2026-0314', nome: 'Luis García');
        $this->emitir('LOT-2026-0315', nome: 'Juan Pérez', turma: $outraTurma);

        $this->assertExportacaoIgualListagem(
            'q=P%C3%A9rez&quote_id='.$this->turma->quote_id,
            esperados: ['LOT-2026-0311', 'LOT-2026-0312'],
            revogados: 1,
        );
    }

    public function test_revogado_fica_fora_e_e_contado(): void
    {
        $this->actingAsAdmin();
        $this->emitir('LOT-2026-0101');
        $this->emitir('LOT-2026-0102');
        $this->emitir('LOT-2026-0103');
        $this->emitir('LOT-2026-0104', status: CertificateStatus::Revocado);

        $this->getJson('/api/certificates/export/summary')
            ->assertOk()
            ->assertExactJson(['total' => 3, 'revocados' => 1]);

        $linhas = $this->lerPlanilha($this->get('/api/certificates/export/planilha')->assertOk());

        $this->assertSame(
            ['LOT-2026-0101', 'LOT-2026-0102', 'LOT-2026-0103'],
            array_column($linhas['dados'], 0),
        );
    }

    /** Vencido e por vencer entram (bloco 61, decisão 9): o documento existiu e vale como histórico. */
    public function test_vencido_entra(): void
    {
        $this->actingAsAdmin();
        $this->emitir('LOT-2026-0201', validoAte: '2026-01-01');
        $this->emitir('LOT-2026-0202', validoAte: '2026-08-20');

        $this->getJson('/api/certificates/export/summary')
            ->assertOk()
            ->assertJsonPath('total', 2);

        $linhas = $this->lerPlanilha($this->get('/api/certificates/export/planilha')->assertOk());

        $this->assertCount(2, $linhas['dados']);
    }

    public function test_conjunto_vazio_e_422(): void
    {
        $this->actingAsAdmin();
        $this->emitir('LOT-2026-0301');
        $this->emitir('LOT-2026-0302', status: CertificateStatus::Revocado);

        // Filtrar pelos revogados deixa o conjunto exportável vazio: o N do
        // aviso é 0 e o arquivo vazio não é entregue.
        $this->getJson('/api/certificates/export/summary?display_status=revocado')
            ->assertOk()
            ->assertExactJson(['total' => 0, 'revocados' => 1]);

        $this->getJson('/api/certificates/export/planilha?display_status=revocado')
            ->assertStatus(422)
            ->assertHeader('Content-Type', 'application/problem+json')
            ->assertJsonPath('detail', 'No hay certificados para exportar con los filtros aplicados.');
    }

    public function test_planilha_tem_as_seis_colunas_na_ordem(): void
    {
        $this->actingAsAdmin();
        $this->emitir('LOT-2026-0401');

        $linhas = $this->lerPlanilha($this->get('/api/certificates/export/planilha')->assertOk());

        $this->assertSame(self::CABECALHO, $linhas['cabecalho']);
    }

    public function test_linha_vem_do_snapshot(): void
    {
        $this->actingAsAdmin();
        $certificado = $this->emitir(
            'LOT-2026-0501',
            nome: 'Juan Pérez Congelado',
            rut: '12.345.678-5',
            curso: 'Seguridad en Alta Tensión',
            fim: '2026-10-12',
        );

        // O cadastro vivo muda depois da emissão: a planilha é o documento, não o cadastro.
        $certificado->enrollment->student->user->update(['name' => 'Nome Novo', 'rut' => '30.000.001-0']);
        $this->course->update(['name' => 'Curso Renomeado']);

        $linhas = $this->lerPlanilha($this->get('/api/certificates/export/planilha')->assertOk());

        $this->assertSame(
            ['LOT-2026-0501', '12/10/26', '12.345.678-5', 'Juan Pérez Congelado', 'Seguridad en Alta Tensión'],
            array_slice($linhas['dados'][0], 0, 5),
        );
    }

    public function test_link_aponta_para_o_pdf_publico_do_uuid(): void
    {
        $this->actingAsAdmin();
        $certificado = $this->emitir('LOT-2026-0601');

        $linhas = $this->lerPlanilha($this->get('/api/certificates/export/planilha')->assertOk());

        // openspout 5 não tem célula de hiperlink: o texto clicável é a fórmula HYPERLINK.
        $url = config('app.url')."/api/publico/certificados/{$certificado->uuid}/pdf";
        $this->assertSame("=HYPERLINK(\"{$url}\",\"ABRIR\")", $linhas['dados'][0][5]);
    }

    /**
     * Nome, RUT e curso são texto digitado ou importado: o que começa com `=` é
     * texto, não fórmula (o `Cell::fromValue` do openspout o promoveria a fórmula).
     */
    public function test_texto_que_comeca_com_igual_nao_vira_formula(): void
    {
        $this->actingAsAdmin();
        $this->emitir(
            'LOT-2026-0651',
            nome: '=HYPERLINK("http://x","clique")',
            rut: '=1+1',
            curso: '=2+2',
        );

        $linhas = $this->lerPlanilha($this->get('/api/certificates/export/planilha')->assertOk());

        $this->assertSame(
            ['=1+1', '=HYPERLINK("http://x","clique")', '=2+2'],
            [$linhas['dados'][0][2], $linhas['dados'][0][3], $linhas['dados'][0][4]],
        );
        // O que o Reader devolve também promove `=…` a fórmula na LEITURA, então a
        // prova é o XML gravado: o texto fica como texto e nenhuma célula além
        // do link tem `<f>`.
        $this->assertStringContainsString('<t>=1+1</t>', $linhas['xml']);
        $this->assertStringContainsString('<t>=2+2</t>', $linhas['xml']);
        // A única fórmula da linha é o link: nenhuma outra célula executa nada.
        $this->assertSame(1, substr_count($linhas['xml'], '<f>'));
    }

    /**
     * O valor em cache: leitor que não recalcula (Modo Protegido, prévia de
     * e-mail, Quick Look) mostra `ABRIR` em vez de uma célula vazia.
     */
    public function test_link_grava_o_valor_em_cache_para_quem_nao_recalcula(): void
    {
        $this->actingAsAdmin();
        $primeiro = $this->emitir('LOT-2026-0661');
        $this->emitir('LOT-2026-0662');

        $linhas = $this->lerPlanilha($this->get('/api/certificates/export/planilha')->assertOk());

        $url = config('app.url')."/api/publico/certificados/{$primeiro->uuid}/pdf";
        $this->assertSame(2, preg_match_all('#<c r="F[23]" s="\d+" t="str"><f>[^<]*</f><v>ABRIR</v></c>#', $linhas['xml']));
        $this->assertStringContainsString(htmlspecialchars("HYPERLINK(\"{$url}\",\"ABRIR\")", ENT_XML1 | ENT_COMPAT), $linhas['xml']);
        // Só as células de dados da coluna F: o cabeçalho segue como texto.
        $this->assertSame(2, substr_count($linhas['xml'], '<f>'));
        $this->assertSame(2, substr_count($linhas['xml'], '<v>ABRIR</v>'));

        $this->assertInstanceOf(FormulaCell::class, $linhas['celulas'][0][5]);
        $this->assertSame('ABRIR', $linhas['celulas'][0][5]->getComputedValue());
    }

    public function test_linhas_em_ordem_de_codigo(): void
    {
        $this->actingAsAdmin();
        $this->emitir('LOT-2026-0703');
        $this->emitir('LOT-2026-0701');
        $this->emitir('LOT-2026-0702');

        $linhas = $this->lerPlanilha($this->get('/api/certificates/export/planilha')->assertOk());

        $this->assertSame(
            ['LOT-2026-0701', 'LOT-2026-0702', 'LOT-2026-0703'],
            array_column($linhas['dados'], 0),
        );
    }

    /** Estrangeiro sem RUT e snapshot sem nome: a planilha é lista, não documento — célula vazia, não 500. */
    public function test_snapshot_sem_rut_e_sem_nome_nao_derruba(): void
    {
        $this->actingAsAdmin();
        $this->emitir('LOT-2026-0801', nome: null, rut: null, curso: null, fim: null);

        $linhas = $this->lerPlanilha($this->get('/api/certificates/export/planilha')->assertOk());

        $this->assertSame('LOT-2026-0801', $linhas['dados'][0][0]);
        $this->assertSame(['', '', '', ''], array_slice($linhas['dados'][0], 1, 4));
        $this->assertStringContainsString('ABRIR', (string) $linhas['dados'][0][5]);
    }

    public function test_acima_do_teto_e_422(): void
    {
        $this->actingAsAdmin();
        $this->emitir('LOT-2026-0901');
        $this->emitir('LOT-2026-0902');
        $this->emitir('LOT-2026-0903');
        // O teto real (1000) custaria mil matrículas por teste: o limite entra pelo construtor.
        $this->app->instance(CertificateSpreadsheet::class, new CertificateSpreadsheet(teto: 2));

        $this->getJson('/api/certificates/export/planilha')
            ->assertStatus(422)
            ->assertHeader('Content-Type', 'application/problem+json')
            ->assertJsonPath('detail', 'La exportación tiene 3 certificados y el máximo es 2. Aplica un filtro más estrecho.');

        // O resumo ainda conta: é ele que avisa quanto passou.
        $this->getJson('/api/certificates/export/summary')->assertOk()->assertJsonPath('total', 3);
    }

    public function test_o_teto_padrao_e_mil(): void
    {
        $this->assertSame(1000, CertificateSpreadsheet::TETO_LINHAS);
        $this->assertSame(1000, app(CertificateSpreadsheet::class)->teto);
    }

    public function test_nome_do_arquivo(): void
    {
        $this->actingAsAdmin();
        $this->emitir('LOT-2026-1001');
        $quote = $this->turma->quote;

        $this->get('/api/certificates/export/planilha?quote_id='.$quote->id)
            ->assertOk()
            ->assertDownload("certificados-scap-{$this->budget->id}-r{$quote->seq_in_budget}.xlsx");

        $this->get('/api/certificates/export/planilha')
            ->assertOk()
            ->assertDownload('certificados-2026-08-05.xlsx');
    }

    public function test_quote_id_inexistente_e_422(): void
    {
        $this->actingAsAdmin();

        $this->getJson('/api/certificates/export/summary?quote_id=999999')
            ->assertStatus(422)
            ->assertJsonValidationErrors('quote_id');
    }

    public function test_display_status_invalido_e_422(): void
    {
        $this->actingAsAdmin();

        $this->getJson('/api/certificates/export/planilha?display_status=nada')
            ->assertStatus(422)
            ->assertJsonValidationErrors('display_status');
    }

    public function test_exige_permissao_de_ver(): void
    {
        $this->seed(RolePermissionSeeder::class);
        $semPermissao = User::factory()->create(['type' => 'admin', 'is_active' => true]);
        $this->actingAs($semPermissao, 'web');
        $this->emitir('LOT-2026-1101');

        $this->getJson('/api/certificates/export/summary')->assertForbidden();
        $this->getJson('/api/certificates/export/planilha')->assertForbidden();

        $semPermissao->givePermissionTo('certification.certificate.view');

        $this->getJson('/api/certificates/export/summary')->assertOk();
        $this->get('/api/certificates/export/planilha')->assertOk();
    }

    // ------------------------------------------------------------ helpers

    /**
     * Lê o xlsx que a resposta aponta (o arquivo temporário só some quando a
     * resposta é ENVIADA, e o teste não a envia) e o apaga em seguida.
     *
     * `celulas` são as células tipadas (o que o Reader entende por texto ou
     * fórmula) e `xml` é o `sheet1.xml` cru, para o que o Reader não distingue.
     *
     * @return array{cabecalho: list<mixed>, dados: list<list<mixed>>, celulas: list<list<Cell>>, xml: string}
     */
    private function lerPlanilha(TestResponse $resposta): array
    {
        $this->assertSame(
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            $resposta->headers->get('Content-Type'),
        );
        $this->assertStringStartsWith('attachment', (string) $resposta->headers->get('Content-Disposition'));

        $caminho = $resposta->baseResponse->getFile()->getPathname();
        $reader = new Reader;
        $reader->open($caminho);

        $linhas = [];
        $celulas = [];
        foreach ($reader->getSheetIterator() as $planilha) {
            foreach ($planilha->getRowIterator() as $linha) {
                $linhas[] = array_map(fn ($valor) => $valor ?? '', $linha->toArray());
                $celulas[] = $linha->cells;
            }
            break;
        }
        $reader->close();

        $zip = new ZipArchive;
        $zip->open($caminho);
        $xml = (string) $zip->getFromName('xl/worksheets/sheet1.xml');
        $zip->close();
        @unlink($caminho);

        array_shift($celulas);

        return ['cabecalho' => array_shift($linhas), 'dados' => $linhas, 'celulas' => $celulas, 'xml' => $xml];
    }

    /**
     * Os mesmos filtros nas duas portas: `summary.total + summary.revocados` é o
     * `meta.total` da listagem, e os códigos da planilha são os da listagem
     * menos os revogados.
     *
     * @param  list<string>  $esperados  códigos da planilha, em ordem (evita um teste que passa com tudo vazio)
     */
    private function assertExportacaoIgualListagem(string $query, array $esperados, int $revogados = 0): void
    {
        $listagem = $this->getJson('/api/certificates?per_page=100&'.$query)->assertOk();
        $resumo = $this->getJson('/api/certificates/export/summary?'.$query)->assertOk();
        $planilha = $this->lerPlanilha($this->get('/api/certificates/export/planilha?'.$query)->assertOk());

        $this->assertSame($listagem->json('meta.total'), $resumo->json('total') + $resumo->json('revocados'));
        $this->assertSame($revogados, $resumo->json('revocados'));

        $codigosDaListagem = collect($listagem->json('data'))
            ->reject(fn (array $c) => $c['status'] === CertificateStatus::Revocado->value)
            ->pluck('codigo')
            ->sort()
            ->values()
            ->all();

        $this->assertSame($esperados, $codigosDaListagem);
        $this->assertSame($codigosDaListagem, array_column($planilha['dados'], 0));
    }

    private function criarTurma(): Turma
    {
        $quote = Quote::forceCreate([
            'budget_id' => $this->budget->id,
            'course_id' => $this->course->id,
            'seq_in_budget' => ++$this->seqCotacao,
            'student_count' => 1,
            'value_uf' => 10,
            'status' => 'approved',
        ]);

        return Turma::create([
            'quote_id' => $quote->id,
            'course_id' => $this->course->id,
            'modalidade' => TurmaModalidade::Presencial,
            'local_aplicacao' => 'Santiago',
            'start_date' => '2026-07-20',
            'end_date' => '2026-07-24',
            'status' => TurmaStatus::Concluida,
        ]);
    }

    /**
     * Emite um certificado numa matrícula NOVA da turma (uma por certificado:
     * o índice admite um só `emitido` por matrícula).
     */
    private function emitir(
        string $codigo,
        ?string $nome = 'Juan Pérez',
        ?string $rut = '11.111.111-1',
        ?string $curso = 'Seguridad en Alta Tensión',
        ?string $fim = '2026-07-24',
        ?string $validoAte = null,
        CertificateStatus $status = CertificateStatus::Emitido,
        ?Turma $turma = null,
    ): Certificate {
        $turma ??= $this->turma;
        $student = Student::create([
            'user_id' => User::factory()->aluno()->create([
                'name' => $nome ?? 'Alumno Vivo',
                'rut' => $this->rutVivo(),
            ])->id,
            'current_client_id' => $this->client->id,
        ]);
        $matricula = Enrollment::create([
            'turma_id' => $turma->id,
            'student_id' => $student->id,
            'grades' => ['final' => 6.2],
            'attendance_pct' => '87.50',
            'approval_status' => EnrollmentApprovalStatus::Aprobado,
        ]);

        return Certificate::create([
            'uuid' => (string) Str::uuid(),
            'enrollment_id' => $matricula->id,
            'course_id' => $this->course->id,
            'redator_id' => $this->redator->id,
            'codigo' => $codigo,
            'snapshot' => [
                'aluno' => array_filter(['name' => $nome, 'rut' => $rut], fn ($v) => $v !== null),
                'curso' => array_filter(['name' => $curso], fn ($v) => $v !== null),
                'turma' => array_filter(['end_date' => $fim], fn ($v) => $v !== null),
            ],
            'valido_ate' => $validoAte,
            'status' => $status,
            'revoked_at' => $status === CertificateStatus::Revocado ? now() : null,
            'revocation_reason' => $status === CertificateStatus::Revocado ? 'Documento reemplazado.' : null,
        ]);
    }

    private function rutVivo(): string
    {
        static $n = 20_000_000;

        // Só precisa ser único: o DV não é validado na criação do usuário de teste.
        return number_format(++$n, 0, '', '.').'-0';
    }
}
