<?php

namespace Tests\Feature\Certification;

use App\Domains\Certification\Enums\CertificateStatus;
use App\Shared\Pdf\HtmlToPdf;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Tests\Support\Certification\CertificadoPublico;
use Tests\Support\Pdf\FakeHtmlToPdf;
use Tests\TestCase;

/**
 * PDF público pelo `uuid` (bloco 61): o QR é o papel. Sem `actingAs` em
 * nenhum teste, e o conversor sempre falso: aqui se prova a rota, não o PDF.
 */
class PublicCertificatePdfTest extends TestCase
{
    use CertificadoPublico;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake(config('filesystems.default'));
        Carbon::setTestNow('2026-08-05 14:30:00');

        Http::preventStrayRequests();
        $this->app->instance(HtmlToPdf::class, new FakeHtmlToPdf);
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();

        parent::tearDown();
    }

    public function test_pdf_publico_de_certificado_valido_baixa_como_anexo(): void
    {
        $certificate = $this->certificadoPublico();

        $response = $this->get($this->pdfUrl($certificate->uuid));

        $response
            ->assertOk()
            ->assertHeader('Content-Type', 'application/pdf')
            ->assertHeader(
                'Content-Disposition',
                'attachment; filename="certificado-LOT-2026-1000.pdf"',
            )
            ->assertHeader('X-Robots-Tag', 'noindex');
        $this->assertStringContainsString('no-store', (string) $response->headers->get('Cache-Control'));
        $this->assertStringStartsWith('%PDF', $response->getContent());
    }

    public function test_pdf_publico_de_certificado_vencido_baixa(): void
    {
        $certificate = $this->certificadoPublico(atributos: [
            'valido_ate' => now()->subDay()->toDateString(),
        ]);

        $this->get($this->pdfUrl($certificate->uuid))
            ->assertOk()
            ->assertHeader('Content-Type', 'application/pdf');
    }

    public function test_pdf_publico_de_certificado_revogado_devolve_410_sem_pdf(): void
    {
        $certificate = $this->certificadoPublico(atributos: [
            'status' => CertificateStatus::Revocado,
            'revoked_at' => now(),
            'revocation_reason' => 'Documento emitido con datos incorrectos.',
        ]);

        $response = $this->getJson($this->pdfUrl($certificate->uuid));

        $response
            ->assertStatus(410)
            ->assertJsonPath('type', 'https://lotus.cl/errors/gone');
        $this->assertStringStartsNotWith('%PDF', $response->getContent());
    }

    public function test_a_recusa_do_revogado_sai_localizada_nos_tres_locales(): void
    {
        $certificate = $this->certificadoPublico(atributos: [
            'status' => CertificateStatus::Revocado,
            'revoked_at' => now(),
            'revocation_reason' => 'Documento emitido con datos incorrectos.',
        ]);

        $detalhes = [];

        foreach (['es-CL', 'pt-BR', 'en'] as $locale) {
            $corpo = $this->withHeaders(['Accept-Language' => $locale])
                ->getJson($this->pdfUrl($certificate->uuid))
                ->assertStatus(410)
                ->json();

            $this->assertStringNotContainsString('certification.', $corpo['detail']);
            $this->assertStringNotContainsString('problem.', $corpo['title']);
            $detalhes[] = $corpo['detail'];
        }

        $this->assertCount(3, array_unique($detalhes), 'Os três locales devolveram o mesmo detail.');
    }

    public function test_pdf_publico_de_uuid_inexistente_devolve_404(): void
    {
        $this->getJson($this->pdfUrl((string) Str::uuid()))->assertNotFound();
    }

    public function test_rotas_publicas_recusam_o_que_nao_e_uuid(): void
    {
        $this->getJson('/api/publico/certificados/nao-e-uuid')->assertNotFound();
        $this->getJson('/api/publico/certificados/nao-e-uuid/pdf')->assertNotFound();
    }

    public function test_o_11o_pdf_do_mesmo_ip_no_minuto_recebe_429(): void
    {
        $certificate = $this->certificadoPublico();

        for ($i = 0; $i < 10; $i++) {
            $this->get($this->pdfUrl($certificate->uuid))->assertOk();
        }

        $this->getJson($this->pdfUrl($certificate->uuid))->assertStatus(429);
    }

    private function pdfUrl(string $uuid): string
    {
        return "/api/publico/certificados/{$uuid}/pdf";
    }
}
