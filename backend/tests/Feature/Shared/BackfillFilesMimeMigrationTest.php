<?php

namespace Tests\Feature\Shared;

use App\Domains\Commercial\Models\Budget;
use App\Shared\Files\Models\File;
use Illuminate\Filesystem\FilesystemAdapter;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Mockery;
use RuntimeException;
use Tests\Support\CreatesDomainRecords;
use Tests\Support\Files\BuildsRealUploads;
use Tests\TestCase;

/**
 * D5. Toda linha de `files` gravada antes de 2026-08-25 tem em `mime` o que o
 * cliente declarou. Migration é o único mecanismo que alcança linha que já
 * existe — mesmo argumento da P-47, e pelo mesmo motivo o `down()` é no-op.
 */
class BackfillFilesMimeMigrationTest extends TestCase
{
    use BuildsRealUploads;
    use CreatesDomainRecords;
    use RefreshDatabase;

    private function migration(): object
    {
        return require base_path('database/migrations/2026_08_25_000001_backfill_files_mime.php');
    }

    private function arquivoLegado(string $bytes, string $mimeMentiroso): File
    {
        Storage::fake('s3');

        $budget = Budget::create(['client_id' => $this->makeClientWithUser()->id, 'code' => 'Scap 1']);
        $path = 'budget/1/legado.bin';
        Storage::disk('s3')->put($path, $bytes);

        return $budget->files()->create([
            'type' => 'invoice',
            'path' => $path,
            'original_name' => 'fatura.pdf',
            'mime' => $mimeMentiroso,
            'size' => strlen($bytes),
        ]);
    }

    public function test_corrige_a_linha_cujo_mime_divergia_do_objeto(): void
    {
        $file = $this->arquivoLegado($this->pngReal(), 'application/pdf');

        $this->migration()->up();

        $this->assertSame('image/png', $file->fresh()->mime);
    }

    public function test_nao_toca_a_linha_que_ja_estava_certa(): void
    {
        $file = $this->arquivoLegado($this->pdfReal(), 'application/pdf');
        $antes = $file->fresh()->updated_at;

        $this->migration()->up();

        $this->assertSame('application/pdf', $file->fresh()->mime);
        $this->assertEquals($antes, $file->fresh()->updated_at, 'Linha correta não pode ganhar um UPDATE inútil.');
    }

    public function test_objeto_ausente_no_bucket_nao_derruba_a_migration(): void
    {
        $file = $this->arquivoLegado($this->pdfReal(), 'application/pdf');
        Storage::disk('s3')->delete($file->path);

        $this->migration()->up();

        // O valor antigo permanece: sem o objeto não há o que medir, e apagar
        // o que existe seria trocar um dado duvidoso por nenhum.
        $this->assertSame('application/pdf', $file->fresh()->mime);
    }

    public function test_alcanca_linha_soft_deletada(): void
    {
        // Documento substituído continua no bucket e continua sendo rastro de
        // auditoria — o metadado dele mentir é o mesmo problema.
        $file = $this->arquivoLegado($this->pngReal(), 'application/pdf');
        $file->delete();

        $this->migration()->up();

        $this->assertSame('image/png', File::withTrashed()->find($file->id)->mime);
    }

    public function test_down_e_no_op(): void
    {
        $file = $this->arquivoLegado($this->pngReal(), 'application/pdf');
        $this->migration()->up();
        $this->migration()->down();

        $this->assertSame('image/png', $file->fresh()->mime, 'Restaurar um valor que sabidamente mentia não é reversão útil.');
    }

    public function test_armazenamento_fora_do_alcance_aborta_em_vez_de_marcar_como_aplicada(): void
    {
        // S3 fora do ar durante o deploy jogava TODAS as linhas no `catch`, a
        // migration terminava marcada como aplicada e o histórico ficava com o
        // MIME do cliente para sempre, sem caminho de re-execução — o oposto do
        // que este backfill existe para fazer (achado Q-6 do review de
        // 2026-08-25). Falha transitória tem de falhar alto.
        $file = $this->arquivoLegado($this->pngReal(), 'application/pdf');

        $disco = Mockery::mock(FilesystemAdapter::class);
        $disco->shouldReceive('exists')->andReturn(true);
        $disco->shouldReceive('get')->andThrow(new RuntimeException('conexão recusada'));
        Storage::shouldReceive('disk')->andReturn($disco);

        try {
            $this->migration()->up();
            $this->fail('Nenhum objeto legível tinha de abortar a migration.');
        } catch (RuntimeException $e) {
            $this->assertStringContainsString('Backfill de files.mime abortado', $e->getMessage());
        }

        // A linha continua mentindo, e é isso que o próximo deploy vai corrigir.
        $this->assertSame('application/pdf', $file->fresh()->mime);
    }

    public function test_um_objeto_ilegivel_no_meio_nao_derruba_o_resto(): void
    {
        // O corte é COLETIVO: um binário corrompido no bucket não pode travar o
        // deploy para sempre, então basta uma linha ter sido lida.
        $bom = $this->arquivoLegado($this->pngReal(), 'application/pdf');

        $this->migration()->up();

        $this->assertSame('image/png', $bom->fresh()->mime);
    }
}
