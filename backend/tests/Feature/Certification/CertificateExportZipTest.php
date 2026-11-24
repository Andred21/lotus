<?php

namespace Tests\Feature\Certification;

use App\Domains\Catalog\Models\Course;
use App\Domains\Certification\Enums\CertificateStatus;
use App\Domains\Certification\Models\Certificate;
use App\Domains\Certification\Services\CertificateZip;
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
use App\Shared\Pdf\HtmlToPdf;
use App\Shared\Pdf\PdfRenderException;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Exceptions;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Illuminate\Testing\TestResponse;
use RuntimeException;
use Tests\Support\Certification\IssuableEnrollmentBuilder;
use Tests\Support\CreatesDomainRecords;
use Tests\Support\Pdf\FakeHtmlToPdf;
use Tests\TestCase;
use ZipArchive;

/**
 * ZIP do Historial (spec §5.5): um PDF por certificado não revogado da
 * cotação, tudo ou nada, montado em arquivo temporário que não sobra.
 */
class CertificateExportZipTest extends TestCase
{
    use CreatesDomainRecords;
    use RefreshDatabase;

    private Client $client;

    private Budget $budget;

    private Course $course;

    private Turma $turma;

    private Redator $redator;

    private FakeHtmlToPdf $pdf;

    private int $seqCotacao = 1;

    protected function setUp(): void
    {
        parent::setUp();

        Carbon::setTestNow('2026-08-05 10:00:00');
        Http::preventStrayRequests();
        $this->pdf = new FakeHtmlToPdf;
        $this->app->instance(HtmlToPdf::class, $this->pdf);

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

    public function test_sem_quote_id_e_422_em_quote_id(): void
    {
        $this->actingAsAdmin();
        $this->emitir('LOT-2026-0001');

        $this->getJson('/api/certificates/export/zip')
            ->assertStatus(422)
            ->assertJsonValidationErrors('quote_id');

        $this->assertSame(0, $this->pdf->callCount());
    }

    public function test_um_pdf_por_certificado_nao_revogado(): void
    {
        $this->actingAsAdmin();
        $this->emitir('LOT-2026-0003');
        $this->emitir('LOT-2026-0001');
        $this->emitir('LOT-2026-0002');
        $this->emitir('LOT-2026-0004', status: CertificateStatus::Revocado);

        $query = '?quote_id='.$this->turma->quote_id;
        $total = $this->getJson('/api/certificates/export/summary'.$query)->json('total');

        $resposta = $this->get('/api/certificates/export/zip'.$query)->assertOk();
        $nomes = $this->nomesDoZip($resposta);

        $this->assertSame(
            ['certificado-LOT-2026-0001.pdf', 'certificado-LOT-2026-0002.pdf', 'certificado-LOT-2026-0003.pdf'],
            $nomes,
        );
        $this->assertCount($total, $nomes);
        $this->assertSame(3, $this->pdf->callCount());
    }

    public function test_cada_entrada_leva_o_pdf_do_proprio_certificado(): void
    {
        $this->actingAsAdmin();
        $this->emitir('LOT-2026-0011');

        $resposta = $this->get('/api/certificates/export/zip?quote_id='.$this->turma->quote_id)->assertOk();

        $this->assertSame('%PDF-fake', $this->conteudoDoZip($resposta, 'certificado-LOT-2026-0011.pdf'));
    }

    public function test_cabecalhos_e_nome_do_arquivo(): void
    {
        $this->actingAsAdmin();
        $this->emitir('LOT-2026-0021');
        $quote = $this->turma->quote;

        $resposta = $this->get('/api/certificates/export/zip?quote_id='.$quote->id)
            ->assertOk()
            ->assertDownload("certificados-scap-{$this->budget->id}-r{$quote->seq_in_budget}.zip");

        $this->assertSame('application/zip', $resposta->headers->get('Content-Type'));
    }

    public function test_respeita_q_e_display_status_junto_com_quote_id(): void
    {
        $this->actingAsAdmin();
        $outraTurma = $this->criarTurma();

        $this->emitir('LOT-2026-0031', nome: 'Juan Pérez', validoAte: '2026-01-01');
        $this->emitir('LOT-2026-0032', nome: 'Ana Pérez', validoAte: '2026-01-01');
        $this->emitir('LOT-2026-0033', nome: 'Juan Pérez', validoAte: '2099-01-01');
        $this->emitir('LOT-2026-0034', nome: 'Luis García', validoAte: '2026-01-01');
        $this->emitir('LOT-2026-0035', nome: 'Juan Pérez', validoAte: '2026-01-01', turma: $outraTurma);

        $query = '?q=P%C3%A9rez&display_status=vencido&quote_id='.$this->turma->quote_id;
        $total = $this->getJson('/api/certificates/export/summary'.$query)->json('total');

        $nomes = $this->nomesDoZip($this->get('/api/certificates/export/zip'.$query)->assertOk());

        $this->assertSame(['certificado-LOT-2026-0031.pdf', 'certificado-LOT-2026-0032.pdf'], $nomes);
        $this->assertSame($total, count($nomes));
    }

    public function test_acima_do_teto_e_422(): void
    {
        $this->actingAsAdmin();
        $this->emitir('LOT-2026-0041');
        $this->emitir('LOT-2026-0042');
        $this->emitir('LOT-2026-0043');
        $this->app->instance(CertificateZip::class, new CertificateZip(teto: 2));

        $this->getJson('/api/certificates/export/zip?quote_id='.$this->turma->quote_id)
            ->assertStatus(422)
            ->assertHeader('Content-Type', 'application/problem+json')
            ->assertJsonPath('detail', 'La exportación tiene 3 certificados y el máximo es 2. Aplica un filtro más estrecho.');

        // O teto vale ANTES de gastar o conversor.
        $this->assertSame(0, $this->pdf->callCount());
    }

    public function test_o_teto_padrao_e_70(): void
    {
        $this->assertSame(70, CertificateZip::TETO);
        $this->assertSame(70, app(CertificateZip::class)->teto);
    }

    public function test_conjunto_vazio_e_422(): void
    {
        $this->actingAsAdmin();
        $this->emitir('LOT-2026-0051', status: CertificateStatus::Revocado);

        $this->getJson('/api/certificates/export/zip?quote_id='.$this->turma->quote_id)
            ->assertStatus(422)
            ->assertHeader('Content-Type', 'application/problem+json')
            ->assertJsonPath('detail', 'No hay certificados para exportar con los filtros aplicados.');
    }

    public function test_uma_nova_tentativa_salva_o_item_e_o_zip_sai_completo(): void
    {
        $this->actingAsAdmin();
        $this->emitir('LOT-2026-0061');
        $this->emitir('LOT-2026-0062');
        $this->pdf->failTimes('LOT-2026-0062', 1);

        $nomes = $this->nomesDoZip($this->get('/api/certificates/export/zip?quote_id='.$this->turma->quote_id)->assertOk());

        $this->assertSame(['certificado-LOT-2026-0061.pdf', 'certificado-LOT-2026-0062.pdf'], $nomes);
    }

    /**
     * O certificado não está errado — o conversor é que caiu —, então a recusa
     * é 503 com `Retry-After` (molde do scanner), e a causa NÃO some: a
     * `PdfRenderException` é reportada, com os códigos, para quem opera.
     */
    public function test_falha_persistente_derruba_e_nomeia_o_codigo(): void
    {
        Exceptions::fake();
        $this->actingAsAdmin();
        $this->emitir('LOT-2026-0071');
        $this->emitir('LOT-2026-0072');
        $this->emitir('LOT-2026-0073');
        $this->pdf->failTimes('LOT-2026-0072', 2);
        $antes = $this->temporarios();

        $resposta = $this->getJson('/api/certificates/export/zip?quote_id='.$this->turma->quote_id)
            ->assertStatus(503)
            ->assertHeader('Content-Type', 'application/problem+json');

        $this->assertNotNull($resposta->headers->get('Retry-After'));
        $detail = (string) $resposta->json('detail');
        $this->assertStringContainsString('LOT-2026-0072', $detail);
        $this->assertStringNotContainsString('LOT-2026-0071', $detail);
        // Nada de texto do conversor: a recusa é de `lang/`, não de `getMessage()`.
        $this->assertSame('No se pudo generar el PDF de: LOT-2026-0072. No se entregó ningún archivo; inténtalo de nuevo.', $detail);
        // Nenhum ZIP: nada sobra no diretório temporário.
        $this->assertSame($antes, $this->temporarios());
        // A causa chega a quem opera: a falha do conversor é reportada, nomeando o código.
        Exceptions::assertReported(fn (PdfRenderException $e) => $e->failedKeys === ['LOT-2026-0072']);
    }

    /**
     * O limitador por usuário não segura dois usuários ao mesmo tempo, e o
     * Gotenberg não aguenta mais de um ZIP em voo: o lock é global, e quem não
     * pega a vaga recebe 503 com `Retry-After` — sem gastar o conversor.
     */
    public function test_com_o_lock_global_ocupado_a_resposta_e_503_com_retry_after(): void
    {
        $this->actingAsAdmin();
        $this->emitir('LOT-2026-0101');
        $outroZip = Cache::lock('certificate-zip', 150);
        $this->assertTrue($outroZip->get());
        $antes = $this->temporarios();

        $resposta = $this->getJson('/api/certificates/export/zip?quote_id='.$this->turma->quote_id)
            ->assertStatus(503)
            ->assertHeader('Content-Type', 'application/problem+json')
            ->assertJsonPath('detail', 'Hay otra descarga de ZIP en curso. Inténtalo de nuevo en unos segundos.');

        $this->assertNotNull($resposta->headers->get('Retry-After'));
        $this->assertSame(0, $this->pdf->callCount());
        $this->assertSame($antes, $this->temporarios());
        // O lock de quem já gerava segue dele.
        $this->assertFalse(Cache::lock('certificate-zip', 150)->get());
        $outroZip->release();
    }

    public function test_o_lock_global_e_liberado_ao_fim_do_zip_e_na_falha(): void
    {
        $this->actingAsAdmin();
        $this->emitir('LOT-2026-0111');
        $url = '/api/certificates/export/zip?quote_id='.$this->turma->quote_id;

        $this->get($url)->assertOk();
        $this->assertTrue($this->lockLivre(), 'o lock sobrou depois de um ZIP que deu certo');

        $this->pdf->failTimes('LOT-2026-0111', 99);
        $this->getJson($url)->assertStatus(503);
        $this->assertTrue($this->lockLivre(), 'o lock sobrou depois de uma falha do conversor');
    }

    public function test_so_revogados_no_zip_e_422_como_na_planilha(): void
    {
        $this->actingAsAdmin();
        $this->emitir('LOT-2026-0121');
        $this->emitir('LOT-2026-0122', status: CertificateStatus::Revocado);

        $this->getJson('/api/certificates/export/zip?quote_id='.$this->turma->quote_id.'&display_status=revocado')
            ->assertStatus(422)
            ->assertJsonPath('detail', 'No hay certificados para exportar con los filtros aplicados.');

        $this->assertSame(0, $this->pdf->callCount());
    }

    public function test_snapshot_nao_apresentavel_derruba_e_nomeia_o_codigo(): void
    {
        $this->actingAsAdmin();
        $this->emitir('LOT-2026-0081');
        $this->emitir('LOT-2026-0082', nome: null);
        $this->emitir('LOT-2026-0083', curso: null);

        $resposta = $this->getJson('/api/certificates/export/zip?quote_id='.$this->turma->quote_id)
            ->assertStatus(422)
            ->assertHeader('Content-Type', 'application/problem+json');

        $detail = (string) $resposta->json('detail');
        $this->assertStringContainsString('LOT-2026-0082', $detail);
        $this->assertStringContainsString('LOT-2026-0083', $detail);
        $this->assertStringNotContainsString('LOT-2026-0081', $detail);
        // Recusa ANTES de gastar Chromium num lote que já não fecha.
        $this->assertSame(0, $this->pdf->callCount());
    }

    public function test_arquivo_temporario_e_apagado_depois_do_envio(): void
    {
        $this->actingAsAdmin();
        $this->emitir('LOT-2026-0091');
        $antes = $this->temporarios();

        $resposta = $this->get('/api/certificates/export/zip?quote_id='.$this->turma->quote_id)->assertOk();
        $caminho = $resposta->baseResponse->getFile()->getPathname();

        $this->assertFileExists($caminho);
        $this->assertSame(sys_get_temp_dir(), dirname($caminho));

        ob_start();
        $resposta->baseResponse->sendContent();
        ob_end_clean();

        $this->assertFileDoesNotExist($caminho);
        $this->assertSame($antes, $this->temporarios());
    }

    public function test_falha_na_montagem_apaga_o_temporario(): void
    {
        $this->actingAsAdmin();
        $this->emitir('LOT-2026-0095');
        $this->app->instance(CertificateZip::class, new class extends CertificateZip
        {
            public function build(array $pdfs, string $path): void
            {
                file_put_contents($path, 'meio escrito');

                throw new RuntimeException('disco cheio');
            }
        });
        $antes = $this->temporarios();

        $this->getJson('/api/certificates/export/zip?quote_id='.$this->turma->quote_id)->assertStatus(500);

        $this->assertSame($antes, $this->temporarios());
    }

    private function lockLivre(): bool
    {
        $lock = Cache::lock('certificate-zip', 150);
        $livre = $lock->get();
        if ($livre) {
            $lock->release();
        }

        return $livre;
    }

    public function test_exige_permissao_de_ver(): void
    {
        $this->seed(RolePermissionSeeder::class);
        $semPermissao = User::factory()->create(['type' => 'admin', 'is_active' => true]);
        $this->actingAs($semPermissao, 'web');
        $this->emitir('LOT-2026-0101');
        $query = '?quote_id='.$this->turma->quote_id;

        $this->getJson('/api/certificates/export/zip'.$query)->assertForbidden();

        $semPermissao->givePermissionTo('certification.certificate.view');

        $this->get('/api/certificates/export/zip'.$query)->assertOk();
    }

    // ------------------------------------------------------------ helpers

    /** @return list<string> os arquivos que o ZIP deixa no diretório temporário */
    private function temporarios(): array
    {
        $achados = glob(sys_get_temp_dir().'/lotus-zip-*') ?: [];
        sort($achados);

        return $achados;
    }

    /** @return list<string> */
    private function nomesDoZip(TestResponse $resposta): array
    {
        $zip = $this->abrir($resposta);
        $nomes = [];
        for ($i = 0; $i < $zip->numFiles; $i++) {
            $nomes[] = $zip->getNameIndex($i);
        }
        $zip->close();
        sort($nomes);

        return $nomes;
    }

    private function conteudoDoZip(TestResponse $resposta, string $nome): string
    {
        $zip = $this->abrir($resposta);
        $conteudo = (string) $zip->getFromName($nome);
        $zip->close();

        return $conteudo;
    }

    private function abrir(TestResponse $resposta): ZipArchive
    {
        $this->assertStringStartsWith('attachment', (string) $resposta->headers->get('Content-Disposition'));

        $zip = new ZipArchive;
        $this->assertTrue($zip->open($resposta->baseResponse->getFile()->getPathname(), ZipArchive::RDONLY));

        return $zip;
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

    private function emitir(
        string $codigo,
        ?string $nome = 'Juan Pérez',
        ?string $curso = 'Seguridad en Alta Tensión',
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
                'aluno' => array_filter(['name' => $nome, 'rut' => '11.111.111-1'], fn ($v) => $v !== null),
                'curso' => array_filter(['name' => $curso], fn ($v) => $v !== null),
                'turma' => ['end_date' => '2026-07-24'],
            ],
            'valido_ate' => $validoAte,
            'status' => $status,
            'revoked_at' => $status === CertificateStatus::Revocado ? now() : null,
            'revocation_reason' => $status === CertificateStatus::Revocado ? 'Documento reemplazado.' : null,
        ]);
    }

    private function rutVivo(): string
    {
        static $n = 40_000_000;

        return number_format(++$n, 0, '', '.').'-0';
    }
}
