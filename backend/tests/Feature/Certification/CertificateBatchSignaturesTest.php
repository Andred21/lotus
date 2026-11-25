<?php

namespace Tests\Feature\Certification;

use App\Domains\Certification\Enums\CertificateStatus;
use App\Domains\Certification\Models\Certificate;
use App\Domains\Certification\Models\CertificateSettings;
use App\Domains\Certification\Services\CertificatePdfService;
use App\Domains\Identity\Models\Redator;
use App\Domains\Identity\Models\Student;
use App\Domains\Identity\Models\User;
use App\Domains\Operation\Enums\EnrollmentApprovalStatus;
use App\Domains\Operation\Models\Enrollment;
use App\Domains\Operation\Models\Turma;
use App\Shared\Files\Models\File;
use App\Shared\Pdf\HtmlToPdf;
use Illuminate\Filesystem\FilesystemAdapter;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Tests\Support\Certification\IssuableEnrollmentBuilder;
use Tests\Support\Pdf\FakeHtmlToPdf;
use Tests\TestCase;

/**
 * Um lote lê as assinaturas UMA vez pelo que é igual para todos (configuração
 * e firma da gerente) e UMA vez por relator distinto — não uma vez por
 * certificado. O documento não muda: o que muda é quantas leituras o lote paga.
 */
class CertificateBatchSignaturesTest extends TestCase
{
    use RefreshDatabase;

    private Turma $turma;

    private FakeHtmlToPdf $pdf;

    private object $disco;

    private Redator $relatorA;

    private Redator $relatorB;

    protected function setUp(): void
    {
        parent::setUp();

        Http::preventStrayRequests();
        $this->pdf = new FakeHtmlToPdf;
        $this->app->instance(HtmlToPdf::class, $this->pdf);

        // O disco do teste conta as leituras: é o custo de rede que o S3 de
        // produção cobra por objeto lido.
        $fake = Storage::fake(config('filesystems.default'));
        $this->disco = new class($fake->getDriver(), $fake->getAdapter(), $fake->getConfig()) extends FilesystemAdapter
        {
            public int $leituras = 0;

            public function get($path)
            {
                $this->leituras++;

                return parent::get($path);
            }
        };
        Storage::set(config('filesystems.default'), $this->disco);

        $this->turma = IssuableEnrollmentBuilder::make()->create()->turmaModel();
        $this->relatorA = $this->redator();
        $this->relatorB = $this->redator();

        $settings = CertificateSettings::atual();
        $settings->update(['manager_name' => 'Ana Gerente']);
        $this->firma('certificate_settings', $settings->id, CertificateSettings::TIPO_FIRMA, 'gerente.png');
        $this->firma('redator', $this->relatorA->id, 'FIRMA', 'a.png');
        $this->firma('redator', $this->relatorB->id, 'FIRMA', 'b.png');
    }

    public function test_o_lote_le_configuracao_e_firma_da_gerente_uma_vez_e_cada_relator_uma_vez(): void
    {
        $lote = [
            $this->emitir('LOT-2026-0001', $this->relatorA),
            $this->emitir('LOT-2026-0002', $this->relatorA),
            $this->emitir('LOT-2026-0003', $this->relatorB),
            $this->emitir('LOT-2026-0004', $this->relatorA),
            $this->emitir('LOT-2026-0005', $this->relatorB),
        ];

        $consultas = [];
        DB::listen(function ($q) use (&$consultas) {
            $consultas[] = $q->sql;
        });

        app(CertificatePdfService::class)->renderMany($lote);

        $de = fn (string $tabela): int => count(array_filter($consultas, fn ($sql) => str_contains($sql, 'from "'.$tabela.'"')));

        $this->assertSame(1, $de('certificate_settings'), 'a configuração foi relida por certificado');
        $this->assertSame(2, $de('redatores'), 'o relator foi relido por certificado, não por relator distinto');
        // gerente (1) + relator A (1) + relator B (1)
        $this->assertSame(3, $this->disco->leituras, 'o binário da firma foi lido por certificado');
    }

    public function test_cada_certificado_continua_com_a_firma_do_proprio_relator(): void
    {
        $lote = [
            $this->emitir('LOT-2026-0001', $this->relatorA),
            $this->emitir('LOT-2026-0002', $this->relatorB),
        ];

        app(CertificatePdfService::class)->renderMany($lote);

        $this->assertSame(2, $this->pdf->callCount());
        $a = base64_encode('png:a.png');
        $b = base64_encode('png:b.png');
        $gerente = base64_encode('png:gerente.png');
        foreach ($this->pdf->htmls() as $html) {
            $doPrimeiro = str_contains($html, 'LOT-2026-0001');
            $this->assertStringContainsString($gerente, $html);
            $this->assertStringContainsString($doPrimeiro ? $a : $b, $html);
            $this->assertStringNotContainsString($doPrimeiro ? $b : $a, $html);
        }
    }

    /** O que se resolve uma vez vale para UM lote: o seguinte lê de novo e vê a configuração nova. */
    public function test_a_resolucao_nao_sobrevive_ao_lote(): void
    {
        $certificado = $this->emitir('LOT-2026-0001', $this->relatorA);
        $servico = app(CertificatePdfService::class);

        $servico->renderMany([$certificado]);
        $this->assertStringContainsString('Ana Gerente', $this->pdf->lastHtml());

        CertificateSettings::atual()->update(['manager_name' => 'Luisa Nova']);
        $servico->renderMany([$certificado]);

        $this->assertStringContainsString('Luisa Nova', $this->pdf->lastHtml());
        $this->assertStringNotContainsString('Ana Gerente', $this->pdf->lastHtml());
    }

    // ------------------------------------------------------------ helpers

    private function redator(): Redator
    {
        return Redator::create([
            'user_id' => User::factory()->create(['type' => 'redator', 'is_active' => true])->id,
        ]);
    }

    /** O binário (`png:<nome>`) no disco E a linha em `files`, como o upload real. */
    private function firma(string $dono, int $donoId, string $tipo, string $nome): void
    {
        $path = "{$dono}/{$donoId}/{$nome}";
        Storage::disk(config('filesystems.default'))->put($path, 'png:'.$nome);

        File::create([
            'fileable_type' => $dono, 'fileable_id' => $donoId, 'type' => $tipo,
            'path' => $path, 'original_name' => $nome, 'mime' => 'image/png', 'size' => 10,
        ]);
    }

    private function emitir(string $codigo, Redator $relator): Certificate
    {
        static $rut = 42_000_000;

        $student = Student::create([
            'user_id' => User::factory()->aluno()->create([
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
            'redator_id' => $relator->id,
            'codigo' => $codigo,
            'snapshot' => [
                'aluno' => ['name' => 'Juan Pérez', 'rut' => '11.111.111-1'],
                'curso' => ['name' => 'Seguridad en Alta Tensión'],
                'turma' => ['end_date' => '2026-07-24'],
                'redator' => ['name' => 'Relator Congelado', 'rut' => '9.876.543-3'],
            ],
            'status' => CertificateStatus::Emitido,
        ]);
    }
}
