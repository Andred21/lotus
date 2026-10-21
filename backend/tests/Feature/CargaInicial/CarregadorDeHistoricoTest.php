<?php

namespace Tests\Feature\CargaInicial;

use App\Console\CargaInicial\Cadastros;
use App\Console\CargaInicial\CarregadorDeCadastros;
use App\Console\CargaInicial\CarregadorDeHistorico;
use App\Console\CargaInicial\Contagem;
use App\Console\CargaInicial\Instante;
use App\Domains\Certification\Enums\CertificateStatus;
use App\Domains\Certification\Models\Certificate;
use App\Domains\Certification\Models\CertificateSequence;
use App\Domains\Commercial\Enums\QuoteStatus;
use App\Domains\Commercial\Models\Budget;
use App\Domains\Commercial\Models\Quote;
use App\Domains\Operation\Enums\EnrollmentApprovalStatus;
use App\Domains\Operation\Enums\TurmaStatus;
use App\Domains\Operation\Models\Enrollment;
use App\Domains\Operation\Models\Turma;
use App\Shared\Pdf\HtmlToPdf;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Tests\Support\CargaInicial\CargaSintetica;
use Tests\Support\CreatesDomainRecords;
use Tests\Support\Pdf\FakeHtmlToPdf;
use Tests\TestCase;

/**
 * O histórico contorna as Actions do fluxo vivo (orçamento, cotação, turma,
 * designação, emissão). O que ele NÃO pode contornar é a auditoria, a
 * unicidade e o "nunca sobrescreve" — e o certificado importado tem de abrir
 * no `/validar` e no PDF como qualquer outro.
 */
class CarregadorDeHistoricoTest extends TestCase
{
    use CreatesDomainRecords, RefreshDatabase;

    private string $pasta;

    private Cadastros $cadastros;

    private Contagem $contagem;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);
        Storage::fake('s3');
        Notification::fake();
        Mail::fake();

        $this->pasta = sys_get_temp_dir().'/carga-hist-'.bin2hex(random_bytes(6));
        CargaSintetica::gravarEm($this->pasta);

    }

    /** A carga sintética inteira, uma vez: os testes de leitura partem daqui. */
    private function carregarPadrao(): void
    {
        $this->contagem = new Contagem;
        $this->cadastros = $this->carregarCadastros($this->contagem);
        $this->carregarHistorico($this->cadastros, $this->contagem);
    }

    protected function tearDown(): void
    {
        $this->apagar($this->pasta);

        parent::tearDown();
    }

    private function apagar(string $caminho): void
    {
        if (is_dir($caminho)) {
            foreach (scandir($caminho) as $item) {
                if ($item !== '.' && $item !== '..') {
                    $this->apagar($caminho.'/'.$item);
                }
            }
            rmdir($caminho);
        } elseif (file_exists($caminho)) {
            unlink($caminho);
        }
    }

    /** @param  array<string, mixed>|null  $payload */
    private function carregarCadastros(Contagem $contagem, ?array $payload = null): Cadastros
    {
        return app(CarregadorDeCadastros::class)->carregar($payload ?? CargaSintetica::payload(), $this->pasta, true, $contagem);
    }

    /** @param  array<string, mixed>|null  $payload */
    private function carregarHistorico(Cadastros $cadastros, Contagem $contagem, ?array $payload = null): void
    {
        app(CarregadorDeHistorico::class)->carregar($payload ?? CargaSintetica::payload(), $cadastros, $contagem);
    }

    private function carregarDeNovo(): Contagem
    {
        $contagem = new Contagem;
        $this->carregarHistorico($this->carregarCadastros($contagem), $contagem);

        return $contagem;
    }

    public function test_orcamento_nasce_com_id_da_scap_e_codigo_coerente(): void
    {
        $this->carregarPadrao();
        $this->assertSame('Scap 176', Budget::findOrFail(176)->code);
        $this->assertSame('Scap 176 - Cot 1', Quote::where('budget_id', 176)->sole()->code);
        $this->assertTrue(Budget::findOrFail(176)->created_at->equalTo(Instante::meioDia('2026-02-13')));
        $this->assertSame($this->cadastros->cliente->id, Budget::findOrFail(176)->client_id);
    }

    public function test_cotacao_com_turma_aprovada_e_sem_turma_pendente(): void
    {
        $this->carregarPadrao();
        $aprovada = Quote::where('budget_id', 176)->sole();
        $this->assertSame(QuoteStatus::Approved, $aprovada->status);
        $this->assertTrue($aprovada->approved_at->equalTo(Instante::meioDia('2026-02-13')));
        $this->assertSame(1, $aprovada->seq_in_budget);
        $this->assertSame($this->cadastros->cursos['A#']->id, $aprovada->course_id);
        $pendente = Quote::where('budget_id', 177)->sole();
        $this->assertSame(QuoteStatus::Pending, $pendente->status);
        $this->assertNull($pendente->approved_at);
        $this->assertSame(0, Turma::where('quote_id', $pendente->id)->count());
    }

    public function test_turma_concluida_de_dois_dias_com_redator(): void
    {
        $this->carregarPadrao();
        $turma = Turma::whereHas('quote', fn ($q) => $q->where('budget_id', 176))->sole();
        $this->assertSame(TurmaStatus::Concluida, $turma->status);
        $this->assertSame('2026-02-14', $turma->end_date->toDateString());
        $this->assertTrue($turma->concluded_at->equalTo(Instante::meioDia('2026-02-14')));
        $this->assertTrue($turma->created_at->equalTo(Instante::meioDia('2026-02-13')));
        $this->assertSame([$this->cadastros->redatores['R1']->id], $turma->redatores()->pluck('redatores.id')->all());
        $this->assertSame(1, $turma->audits()->where('event', 'sync')->count());
    }

    public function test_matricula_com_nota_e_sem_nota(): void
    {
        $this->carregarPadrao();
        $uno = Certificate::where('codigo', 'LOT-2026-001')->sole()->enrollment;
        $dos = Certificate::where('codigo', 'LOT-2026-002')->sole()->enrollment;
        $this->assertSame(['final' => 7], $uno->grades);
        $this->assertNull($dos->grades);
        $this->assertSame(EnrollmentApprovalStatus::Aprobado, $dos->approval_status);
        $this->assertNull($dos->attendance_pct);
        $this->assertTrue($dos->created_at->equalTo(Instante::meioDia('2026-02-13')));
    }

    public function test_certificado_preserva_codigo_e_monta_snapshot_da_linha(): void
    {
        $this->carregarPadrao();
        $c = Certificate::where('codigo', 'LOT-2026-001')->sole();
        $s = $c->snapshot;
        $this->assertSame(CertificateStatus::Emitido, $c->status);
        $this->assertTrue(Str::isUuid($c->uuid));
        $this->assertSame('2028-01-13', $c->valido_ate->toDateString());
        $this->assertSame($this->cadastros->redatores['R1']->id, $c->redator_id);
        $this->assertSame($this->cadastros->cursos['A#']->id, $c->course_id);
        $this->assertSame(2, $s->schema_version);
        $this->assertSame('ALUMNO UNO', $s->aluno->name);
        $this->assertSame(CargaSintetica::rut(16111111), $s->aluno->rut);
        $this->assertSame('Nombre Técnico A', $s->curso->name);
        $this->assertNull($s->curso->technical_name);
        $this->assertSame(16, $s->curso->workload_hours);
        $this->assertSame(['Módulo 1', 'Módulo 2'], array_map(fn ($m) => $m->name, $s->curso->modules));
        $this->assertSame('2026-02-13', $s->turma->start_date);
        $this->assertSame('2026-02-14', $s->turma->end_date);
        $this->assertSame('presencial', $s->turma->modalidade);
        $this->assertSame('EMPRESA PRUEBA LTDA.', $s->cliente->name);
        $this->assertSame(CargaSintetica::rut(76111111), $s->cliente->rut);
        $this->assertSame('Relator P.', $s->redator->name);
        $this->assertSame(CargaSintetica::rut(15111111), $s->redator->rut);
        $this->assertSame(config('app.certificate_issuer.name'), $s->emissor->name);
        $this->assertSame(['final' => 7], $s->resultado->grades);
        $this->assertNull($s->template->version);
        $this->assertSame('Talca', $s->template->city);
        $this->assertSame('Talca', $s->ciudad_emision);
        $this->assertSame('2026-02-20', $s->emitido_em);
        $this->assertTrue($s->isPresentable());
        $this->assertTrue($c->created_at->equalTo(Instante::meioDia('2026-02-20')));
        $this->assertSame(0, CertificateSequence::count());
    }

    public function test_snapshot_imprime_o_curso_como_na_linha_da_planilha(): void
    {
        $this->carregarPadrao();
        $s = Certificate::where('codigo', 'LOT-2026-003')->sole()->snapshot;
        $this->assertSame('Curso B', $s->curso->name);
        $this->assertSame(4, $s->curso->workload_hours);
        $this->assertSame('Descripción B', $s->curso->description);
        $this->assertSame([], $s->curso->modules);
        $this->assertSame('Santiago', $s->ciudad_emision);
    }

    public function test_certificado_importado_abre_no_validar_e_no_pdf(): void
    {
        $this->carregarPadrao();
        $c = Certificate::where('codigo', 'LOT-2026-002')->sole(); // o sem nota
        $this->getJson("/api/publico/certificados/{$c->uuid}")->assertOk()->assertJsonPath('codigo', 'LOT-2026-002');
        $this->actingAsAdmin();
        Http::preventStrayRequests();
        $this->app->instance(HtmlToPdf::class, $pdf = new FakeHtmlToPdf);
        $this->get("/api/certificates/{$c->id}/pdf")->assertOk();
        $this->assertStringContainsString('LOT-2026-002', $pdf->lastHtml());
    }

    public function test_orcamento_existente_de_outro_cliente_e_conflito_e_pula_dependentes(): void
    {
        $outro = $this->makeClientWithUser();
        (new Budget)->forceFill(['id' => 176, 'client_id' => $outro->id, 'code' => 'Scap 176'])->save();

        $contagem = new Contagem;
        $this->carregarHistorico($this->carregarCadastros($contagem), $contagem);

        $this->assertTrue($contagem->temConflito());
        $this->assertStringContainsString('176', implode("\n", $contagem->conflitos()));
        $this->assertSame(0, Certificate::whereIn('codigo', ['LOT-2026-001', 'LOT-2026-002'])->count());
        $this->assertSame(0, Quote::where('budget_id', 176)->count());
        $this->assertSame(1, Certificate::where('codigo', 'LOT-2026-003')->count());
    }

    public function test_codigo_ja_usado_por_outra_matricula_e_conflito(): void
    {
        $this->carregarPadrao();
        $p = CargaSintetica::payload();
        // o aluno do LOT-2026-003 passa a carregar o código do LOT-2026-001
        $p['orcamentos'][1]['turma']['matriculas'][0]['certificado']['codigo'] = 'LOT-2026-001';
        $contagem = new Contagem;
        $this->carregarHistorico($this->carregarCadastros($contagem, $p), $contagem, $p);
        $this->assertStringContainsString('LOT-2026-001', implode("\n", $contagem->conflitos()));
        $this->assertSame(3, Certificate::count());
    }

    public function test_matricula_que_ja_tem_certificado_com_outro_codigo_e_conflito(): void
    {
        $this->carregarPadrao();
        $p = CargaSintetica::payload();
        $p['orcamentos'][0]['turma']['matriculas'][0]['certificado']['codigo'] = 'LOT-2026-901';
        $contagem = new Contagem;
        $this->carregarHistorico($this->carregarCadastros($contagem, $p), $contagem, $p);
        $this->assertStringContainsString('LOT-2026-901', implode("\n", $contagem->conflitos()));
        $this->assertSame(0, Certificate::where('codigo', 'LOT-2026-901')->count());
    }

    public function test_snapshot_sem_aluno_impresso_e_conflito_e_nao_grava_o_certificado(): void
    {
        $p = CargaSintetica::payload();
        $p['orcamentos'][0]['turma']['matriculas'][0]['certificado']['aluno_impresso'] = '';
        $contagem = new Contagem;
        $this->carregarHistorico($this->carregarCadastros($contagem, $p), $contagem, $p);
        $this->assertTrue($contagem->temConflito());
        $this->assertSame(0, Certificate::where('codigo', 'LOT-2026-001')->count());
        $this->assertSame(1, Certificate::where('codigo', 'LOT-2026-002')->count());
    }

    public function test_segunda_carga_nao_cria_nada(): void
    {
        $this->carregarPadrao();
        $contagem = $this->carregarDeNovo();
        $this->assertFalse($contagem->temConflito());
        $this->assertContains(['certificados', 0, 3], $contagem->linhas());
        foreach ($contagem->linhas() as [$entidade, $criados]) {
            $this->assertSame(0, $criados, $entidade);
        }
    }

    public function test_primeira_carga_conta_o_que_criou(): void
    {
        $this->carregarPadrao();
        $linhas = $this->contagem->linhas();
        $this->assertContains(['orcamentos', 3, 0], $linhas);
        $this->assertContains(['cotacoes', 3, 0], $linhas);
        $this->assertContains(['turmas', 2, 0], $linhas);
        $this->assertContains(['matriculas', 3, 0], $linhas);
        $this->assertContains(['certificados', 3, 0], $linhas);
        $this->assertSame(3, Enrollment::count());
        Notification::assertNothingSent();
        Mail::assertNothingSent();
    }
}
