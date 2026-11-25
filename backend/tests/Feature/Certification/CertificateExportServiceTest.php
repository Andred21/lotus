<?php

namespace Tests\Feature\Certification;

use App\Domains\Certification\Data\CertificateExportQueryData;
use App\Domains\Certification\Enums\CertificateStatus;
use App\Domains\Certification\Exceptions\CertificateExportException;
use App\Domains\Certification\Models\Certificate;
use App\Domains\Certification\Services\CertificateExport;
use App\Domains\Certification\Services\CertificateSpreadsheet;
use App\Domains\Certification\Services\CertificateZip;
use App\Domains\Identity\Models\Student;
use App\Domains\Identity\Models\User;
use App\Domains\Operation\Enums\EnrollmentApprovalStatus;
use App\Domains\Operation\Models\Enrollment;
use App\Domains\Operation\Models\Turma;
use App\Shared\Pdf\HtmlToPdf;
use App\Shared\Pdf\PdfUnavailableException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Tests\Support\Certification\IssuableEnrollmentBuilder;
use Tests\Support\Pdf\FakeHtmlToPdf;
use Tests\TestCase;
use ZipArchive;

/**
 * As regras da exportação (spec §5.3/§5.5) vivem no `CertificateExport`, não no
 * controller: aqui o serviço é chamado SEM HTTP, e as recusas valem para qualquer
 * segundo ponto de entrada (comando, job) sem reescrever nada.
 */
class CertificateExportServiceTest extends TestCase
{
    use RefreshDatabase;

    private Turma $turma;

    private int $redatorId;

    private FakeHtmlToPdf $pdf;

    /** @var list<string> */
    private array $temporarios = [];

    protected function setUp(): void
    {
        parent::setUp();

        Carbon::setTestNow('2026-08-05 10:00:00');
        Http::preventStrayRequests();
        $this->pdf = new FakeHtmlToPdf;
        $this->app->instance(HtmlToPdf::class, $this->pdf);

        $builder = IssuableEnrollmentBuilder::make()->create();
        $this->turma = $builder->turmaModel();
        $this->redatorId = $builder->redatorModel()->id;
    }

    protected function tearDown(): void
    {
        foreach ($this->temporarios as $caminho) {
            @unlink($caminho);
        }
        Carbon::setTestNow();

        parent::tearDown();
    }

    private function servico(): CertificateExport
    {
        return $this->app->make(CertificateExport::class);
    }

    private function filtros(bool $comQuote = true): CertificateExportQueryData
    {
        return new CertificateExportQueryData(quote_id: $comQuote ? $this->turma->quote_id : null);
    }

    public function test_planilha_sem_certificados_e_recusada_pelo_servico(): void
    {
        $this->expectException(CertificateExportException::class);
        $this->expectExceptionMessage(__('certification.export.empty'));

        $this->servico()->planilha($this->filtros());
    }

    public function test_planilha_acima_do_teto_e_recusada_pelo_servico(): void
    {
        $this->emitir('LOT-2026-0001');
        $this->emitir('LOT-2026-0002');
        $this->app->instance(CertificateSpreadsheet::class, new CertificateSpreadsheet(teto: 1));

        $this->expectException(CertificateExportException::class);
        $this->expectExceptionMessage(__('certification.export.over_limit', ['total' => 2, 'teto' => 1]));

        $this->servico()->planilha($this->filtros());
    }

    public function test_planilha_devolve_o_caminho_de_um_xlsx(): void
    {
        $this->emitir('LOT-2026-0001');

        $caminho = $this->temporarios[] = $this->servico()->planilha($this->filtros());

        $this->assertFileExists($caminho);
        $zip = new ZipArchive;
        $this->assertTrue($zip->open($caminho, ZipArchive::RDONLY));
        $this->assertNotFalse($zip->locateName('xl/worksheets/sheet1.xml'));
        $zip->close();
    }

    public function test_zip_sem_quote_id_e_recusado_pelo_servico(): void
    {
        $this->emitir('LOT-2026-0001');

        try {
            $this->servico()->zip($this->filtros(comQuote: false));
            $this->fail('O serviço deveria recusar o ZIP sem quote_id.');
        } catch (ValidationException $e) {
            $this->assertArrayHasKey('quote_id', $e->errors());
        }

        $this->assertSame(0, $this->pdf->callCount());
    }

    public function test_zip_vazio_e_recusado_antes_do_conversor(): void
    {
        $this->expectException(CertificateExportException::class);
        $this->expectExceptionMessage(__('certification.export.empty'));

        try {
            $this->servico()->zip($this->filtros());
        } finally {
            $this->assertSame(0, $this->pdf->callCount());
        }
    }

    public function test_zip_acima_do_teto_e_recusado_antes_do_conversor(): void
    {
        $this->emitir('LOT-2026-0001');
        $this->emitir('LOT-2026-0002');
        $this->app->instance(CertificateZip::class, new CertificateZip(teto: 1));

        $this->expectException(CertificateExportException::class);
        $this->expectExceptionMessage(__('certification.export.over_limit', ['total' => 2, 'teto' => 1]));

        try {
            $this->servico()->zip($this->filtros());
        } finally {
            $this->assertSame(0, $this->pdf->callCount());
        }
    }

    public function test_zip_com_snapshot_nao_apresentavel_nomeia_o_codigo(): void
    {
        $this->emitir('LOT-2026-0001');
        $this->emitir('LOT-2026-0002', nome: null);

        try {
            $this->servico()->zip($this->filtros());
            $this->fail('O serviço deveria recusar o snapshot não apresentável.');
        } catch (CertificateExportException $e) {
            $this->assertStringContainsString('LOT-2026-0002', $e->getMessage());
            $this->assertStringNotContainsString('LOT-2026-0001', $e->getMessage());
        }

        $this->assertSame(0, $this->pdf->callCount());
    }

    public function test_zip_sem_vaga_no_lock_global_e_503_e_o_lock_alheio_segue_dele(): void
    {
        $this->emitir('LOT-2026-0001');
        $outro = Cache::lock('certificate-zip', 150);
        $this->assertTrue($outro->get());

        try {
            $this->servico()->zip($this->filtros());
            $this->fail('O serviço deveria recusar sem vaga no lock.');
        } catch (PdfUnavailableException $e) {
            $this->assertSame(__('certification.export.zip_busy'), $e->getMessage());
        }

        $this->assertSame(0, $this->pdf->callCount());
        $this->assertFalse(Cache::lock('certificate-zip', 150)->get());
        $outro->release();
    }

    public function test_zip_com_falha_persistente_do_conversor_vira_503_e_solta_o_lock(): void
    {
        $this->emitir('LOT-2026-0001');
        $this->pdf->failTimes('LOT-2026-0001', 99);

        try {
            $this->servico()->zip($this->filtros());
            $this->fail('O serviço deveria traduzir a falha do conversor.');
        } catch (PdfUnavailableException $e) {
            $this->assertStringContainsString('LOT-2026-0001', $e->getMessage());
        }

        $lock = Cache::lock('certificate-zip', 150);
        $this->assertTrue($lock->get(), 'o lock sobrou depois da falha');
        $lock->release();
    }

    public function test_zip_devolve_o_caminho_de_um_zip_com_um_pdf_por_certificado(): void
    {
        $this->emitir('LOT-2026-0001');
        $this->emitir('LOT-2026-0002');

        $caminho = $this->temporarios[] = $this->servico()->zip($this->filtros());

        $zip = new ZipArchive;
        $this->assertTrue($zip->open($caminho, ZipArchive::RDONLY));
        $nomes = [];
        for ($i = 0; $i < $zip->numFiles; $i++) {
            $nomes[] = $zip->getNameIndex($i);
        }
        $zip->close();
        sort($nomes);

        $this->assertSame(['certificado-LOT-2026-0001.pdf', 'certificado-LOT-2026-0002.pdf'], $nomes);
    }

    private function emitir(string $codigo, ?string $nome = 'Juan Pérez'): Certificate
    {
        static $rut = 41_000_000;

        $student = Student::create([
            'user_id' => User::factory()->aluno()->create([
                'name' => $nome ?? 'Alumno Vivo',
                'rut' => number_format(++$rut, 0, '', '.').'-0',
            ])->id,
            'current_client_id' => $this->turma->quote->budget->client_id,
        ]);
        $matricula = Enrollment::create([
            'turma_id' => $this->turma->id,
            'student_id' => $student->id,
            'grades' => ['final' => 6.2],
            'attendance_pct' => '87.50',
            'approval_status' => EnrollmentApprovalStatus::Aprobado,
        ]);

        return Certificate::create([
            'uuid' => (string) Str::uuid(),
            'enrollment_id' => $matricula->id,
            'course_id' => $this->turma->course_id,
            'redator_id' => $this->redatorId,
            'codigo' => $codigo,
            'snapshot' => [
                'aluno' => array_filter(['name' => $nome, 'rut' => '11.111.111-1'], fn ($v) => $v !== null),
                'curso' => ['name' => 'Seguridad en Alta Tensión'],
                'turma' => ['end_date' => '2026-07-24'],
            ],
            'status' => CertificateStatus::Emitido,
        ]);
    }
}
