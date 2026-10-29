<?php

namespace Tests\Feature\Certification;

use App\Domains\Certification\Models\Certificate;
use App\Domains\Certification\Models\CertificateSettings;
use App\Domains\Certification\Services\CertificateSignatures;
use App\Domains\Identity\Models\Redator;
use App\Domains\Identity\Models\User;
use App\Shared\Files\Models\File;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Exceptions;
use Illuminate\Support\Facades\Storage;
use Tests\Support\Files\BuildsRealUploads;
use Tests\TestCase;

/**
 * Spec D5/D6/D14/D19 e §4.3 do bloco 40: as assinaturas saem VIVAS na hora de
 * imprimir (gerente da configuração, firma vigente do instrutor), o nome do
 * instrutor vem do snapshot, e a falta de uma imagem nunca derruba o PDF.
 */
class CertificateSignaturesTest extends TestCase
{
    use BuildsRealUploads;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake(config('filesystems.default'));
    }

    private function makeRedator(): Redator
    {
        $user = User::factory()->create(['type' => 'redator', 'is_active' => true]);

        return Redator::create(['user_id' => $user->id]);
    }

    /** Grava o binário no disco E a linha em `files`, como o upload real faz. */
    private function subirFirma(string $dono, int $donoId, string $tipo, string $bytes, string $nome): File
    {
        $path = "{$dono}/{$donoId}/{$nome}";
        Storage::disk(config('filesystems.default'))->put($path, $bytes);

        return File::create([
            'fileable_type' => $dono, 'fileable_id' => $donoId, 'type' => $tipo,
            'path' => $path, 'original_name' => $nome, 'mime' => 'image/png', 'size' => strlen($bytes),
        ]);
    }

    private function certificado(?int $redatorId, string $nomeNoSnapshot = 'María Relatora Congelada'): Certificate
    {
        return new Certificate([
            'redator_id' => $redatorId,
            'snapshot' => [
                'redator' => ['name' => $nomeNoSnapshot, 'rut' => '9.876.543-3'],
            ],
        ]);
    }

    private function para(Certificate $certificate)
    {
        return app(CertificateSignatures::class)->para($certificate);
    }

    public function test_gerente_vem_da_configuracao_viva(): void
    {
        $settings = CertificateSettings::atual();
        $settings->update(['manager_name' => 'Ana Pérez', 'manager_title' => 'Directora OTEC']);

        $gerente = $this->para($this->certificado(null))->gerente;

        $this->assertSame('Ana Pérez', $gerente->nome);
        $this->assertSame('Directora OTEC', $gerente->cargo);

        $settings->update(['manager_name' => 'Luisa Soto']);

        $this->assertSame('Luisa Soto', $this->para($this->certificado(null))->gerente->nome);
    }

    public function test_imagem_da_gerente_e_do_instrutor_em_base64(): void
    {
        $bytesGerente = $this->pngDeLargura(900, 300);
        $bytesInstrutor = $this->pngDeLargura(800, 250);
        $redator = $this->makeRedator();

        $this->subirFirma('certificate_settings', CertificateSettings::atual()->id, CertificateSettings::TIPO_FIRMA, $bytesGerente, 'gerente.png');
        $this->subirFirma('redator', $redator->id, 'FIRMA', $bytesInstrutor, 'firma.png');

        $assinaturas = $this->para($this->certificado($redator->id));

        $this->assertSame(base64_encode($bytesGerente), $assinaturas->gerente->pngBase64);
        $this->assertSame(base64_encode($bytesInstrutor), $assinaturas->instrutor->pngBase64);
        $this->assertSame('Instructor', $assinaturas->instrutor->cargo);
    }

    public function test_nome_do_instrutor_vem_do_snapshot_e_nao_do_redator_vivo(): void
    {
        $redator = $this->makeRedator();
        $redator->user->update(['name' => 'Nome Vivo Renomeado']);

        $instrutor = $this->para($this->certificado($redator->id, 'María Relatora Congelada'))->instrutor;

        $this->assertSame('María Relatora Congelada', $instrutor->nome);
    }

    public function test_redator_arquivado_mantem_a_firma_que_a_cascata_arquivou(): void
    {
        $bytes = $this->pngDeLargura(800, 250);
        $redator = $this->makeRedator();
        $this->subirFirma('redator', $redator->id, 'FIRMA', $bytes, 'firma.png');

        $redator->delete();

        $this->assertTrue(File::withTrashed()->where('fileable_id', $redator->id)->firstOrFail()->trashed());
        $this->assertSame(
            base64_encode($bytes),
            $this->para($this->certificado($redator->id))->instrutor->pngBase64,
        );
    }

    public function test_sem_assinaturas_as_imagens_sao_nulas(): void
    {
        $redator = $this->makeRedator();

        $assinaturas = $this->para($this->certificado($redator->id));

        $this->assertNull($assinaturas->gerente->pngBase64);
        $this->assertNull($assinaturas->instrutor->pngBase64);
    }

    public function test_binario_ausente_no_disco_vira_imagem_nula_sem_excecao(): void
    {
        Exceptions::fake();
        $redator = $this->makeRedator();
        // A linha existe; o objeto nunca foi (ou foi apagado do bucket).
        File::create([
            'fileable_type' => 'redator', 'fileable_id' => $redator->id, 'type' => 'FIRMA',
            'path' => "redator/{$redator->id}/sumiu.png", 'original_name' => 'sumiu.png',
            'mime' => 'image/png', 'size' => 10,
        ]);
        $this->subirFirma('certificate_settings', CertificateSettings::atual()->id, CertificateSettings::TIPO_FIRMA, $this->pngDeLargura(900, 300), 'gerente.png');

        $assinaturas = $this->para($this->certificado($redator->id));

        $this->assertNull($assinaturas->instrutor->pngBase64);
        $this->assertNotNull($assinaturas->gerente->pngBase64);
        Exceptions::assertReported(fn (\RuntimeException $e) => str_contains($e->getMessage(), "redator/{$redator->id}/sumiu.png"));
    }

    public function test_certificado_sem_redator_sai_sem_imagem_do_instrutor(): void
    {
        $assinaturas = $this->para($this->certificado(null, 'NOMBRE DEL RELATOR'));

        $this->assertSame('NOMBRE DEL RELATOR', $assinaturas->instrutor->nome);
        $this->assertNull($assinaturas->instrutor->pngBase64);
    }
}
