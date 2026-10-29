<?php

namespace Tests\Feature\Identity;

use App\Domains\Identity\Enums\RedatorDocumentType;
use App\Domains\Identity\Models\Redator;
use App\Domains\Identity\Models\User;
use App\Shared\Files\Models\File;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\Support\Files\BuildsRealUploads;
use Tests\TestCase;

/**
 * Spec D1/D2/D19 do bloco 40: a assinatura do redator é um documento `FIRMA`
 * com a classe de conteúdo própria (PNG, até 1 MB, largura mínima 600 px), sem
 * validade, e a vigente é a que a D19 escolhe.
 */
class RedatorFirmaTest extends TestCase
{
    use BuildsRealUploads;
    use RefreshDatabase;

    private function makeRedator(): Redator
    {
        $user = User::factory()->create(['type' => 'redator', 'is_active' => true]);

        return Redator::create(['user_id' => $user->id]);
    }

    private function actingAsRedator(): Redator
    {
        $this->seed(RolePermissionSeeder::class);
        $redator = $this->makeRedator();
        $redator->user->assignRole('redator');
        $this->actingAs($redator->user, 'web');

        return $redator;
    }

    private function firma(int $redatorId, string $nome = 'firma.png'): File
    {
        return File::create([
            'fileable_type' => 'redator', 'fileable_id' => $redatorId, 'type' => 'FIRMA',
            'path' => "redator/{$redatorId}/{$nome}", 'original_name' => $nome, 'mime' => 'image/png', 'size' => 10,
        ]);
    }

    public function test_admin_sobe_firma_png_e_ela_vira_a_firma_do_redator(): void
    {
        Storage::fake('s3');
        $this->actingAsAdmin();
        $redator = $this->makeRedator();

        $this->postJson("/api/redatores/{$redator->id}/documents", [
            'type' => 'FIRMA',
            'file' => $this->uploadReal($this->pngDeLargura(800, 300), 'firma.png', 'image/png'),
        ])->assertCreated()->assertJsonPath('type', 'FIRMA');

        $this->assertSame('FIRMA', $redator->fresh()->firma->type);
    }

    public function test_redator_sobe_a_propria_firma_pelo_perfil(): void
    {
        Storage::fake('s3');
        $redator = $this->actingAsRedator();

        $this->postJson('/api/profile/documents', [
            'type' => 'FIRMA',
            'file' => $this->uploadReal($this->pngDeLargura(800, 300), 'firma.png', 'image/png'),
        ])->assertCreated()->assertJsonPath('type', 'FIRMA');

        $this->assertSame('FIRMA', $redator->fresh()->firma->type);
    }

    public function test_firma_recusa_jpeg_com_mensagem_nomeada(): void
    {
        Storage::fake('s3');
        $this->actingAsAdmin();
        $redator = $this->makeRedator();

        $this->postJson("/api/redatores/{$redator->id}/documents", [
            'type' => 'FIRMA',
            'file' => $this->uploadReal($this->jpegReal(), 'firma.jpg', 'image/jpeg'),
        ])->assertUnprocessable()->assertJsonValidationErrors('file');

        $this->assertNull($redator->fresh()->firma);
    }

    public function test_firma_recusa_png_acima_de_1mb(): void
    {
        Storage::fake('s3');
        $this->actingAsAdmin();
        $redator = $this->makeRedator();

        // Bytes depois do IEND não mudam o veredicto do finfo nem a largura.
        $grande = $this->pngDeLargura(800, 300).str_repeat("\0", 1100 * 1024);

        $this->postJson("/api/redatores/{$redator->id}/documents", [
            'type' => 'FIRMA',
            'file' => $this->uploadReal($grande, 'firma.png', 'image/png'),
        ])->assertUnprocessable()->assertJsonValidationErrors('file');
    }

    public function test_firma_recusa_png_com_menos_de_600px(): void
    {
        Storage::fake('s3');
        $this->actingAsAdmin();
        $redator = $this->makeRedator();

        $this->postJson("/api/redatores/{$redator->id}/documents", [
            'type' => 'FIRMA',
            'file' => $this->uploadReal($this->pngDeLargura(599, 300), 'firma.png', 'image/png'),
        ])->assertUnprocessable()
            ->assertJsonPath('errors.file.0', __('shared.file.image_too_narrow', ['min' => 600, 'width' => 599]));
    }

    public function test_firma_aceita_exatamente_600px(): void
    {
        Storage::fake('s3');
        $this->actingAsAdmin();
        $redator = $this->makeRedator();

        $this->postJson("/api/redatores/{$redator->id}/documents", [
            'type' => 'FIRMA',
            'file' => $this->uploadReal($this->pngDeLargura(600, 200), 'firma.png', 'image/png'),
        ])->assertCreated();
    }

    public function test_firma_recusa_valid_until(): void
    {
        Storage::fake('s3');
        $this->actingAsAdmin();
        $redator = $this->makeRedator();

        $this->postJson("/api/redatores/{$redator->id}/documents", [
            'type' => 'FIRMA',
            'file' => $this->uploadReal($this->pngDeLargura(800, 300), 'firma.png', 'image/png'),
            'valid_until' => '2030-01-01',
        ])->assertUnprocessable()->assertJsonValidationErrors('valid_until');
    }

    public function test_documento_de_compliance_continua_aceitando_valid_until_e_pdf(): void
    {
        Storage::fake('s3');
        $this->actingAsAdmin();
        $redator = $this->makeRedator();

        $this->postJson("/api/redatores/{$redator->id}/documents", [
            'type' => 'REUF',
            'file' => $this->uploadReal($this->pdfReal(), 'reuf.pdf', 'application/pdf'),
            'valid_until' => '2030-01-01',
        ])->assertCreated();
    }

    public function test_criar_redator_com_firma_no_multipart_aplica_a_regra_da_assinatura(): void
    {
        Storage::fake('s3');
        $this->actingAsAdmin();

        $this->postJson('/api/redatores', [
            'name' => 'Juan Morales', 'rut' => '13.456.789-9', 'email' => 'jm@lotus.cl',
            'documents' => ['FIRMA' => $this->uploadReal($this->jpegReal(), 'firma.jpg', 'image/jpeg')],
        ])->assertUnprocessable()->assertJsonValidationErrors('documents.FIRMA');
    }

    public function test_firma_vigente_segue_a_d19(): void
    {
        // Sem firma: null.
        $this->assertNull($this->makeRedator()->firma);

        // Ativa.
        $ativa = $this->makeRedator();
        $f = $this->firma($ativa->id);
        $this->assertTrue($ativa->fresh()->firma->is($f));

        // Substituída: vale a nova, a antiga fica soft-deletada sem marca.
        $subst = $this->makeRedator();
        $velha = $this->firma($subst->id, 'velha.png');
        $velha->delete();
        $nova = $this->firma($subst->id, 'nova.png');
        $this->assertTrue($subst->fresh()->firma->is($nova));

        // Redator arquivado: vale a que a cascata marcou.
        $arquivado = $this->makeRedator();
        $marcada = $this->firma($arquivado->id);
        $arquivado->delete();
        $this->assertTrue($marcada->fresh()->trashed());
        $this->assertTrue($arquivado->fresh()->firma->is($marcada));

        // Apagada pelo admin ANTES do arquivamento: não volta.
        $apagada = $this->makeRedator();
        $this->firma($apagada->id)->delete();
        $apagada->delete();
        $this->assertNull($apagada->fresh()->firma);

        // Eager-loadable.
        $carregado = Redator::withTrashed()->with('firma')->findOrFail($arquivado->id);
        $this->assertTrue($carregado->relationLoaded('firma'));
        $this->assertTrue($carregado->firma->is($marcada));
    }

    public function test_firma_fica_fora_dos_tipos_de_compliance(): void
    {
        $this->assertSame(['CV', 'REUF', 'TITULO', 'POSTGRADO'], RedatorDocumentType::values());
        $this->assertCount(5, RedatorDocumentType::cases());
        $this->assertFalse(RedatorDocumentType::FIRMA->isCompliance());
        $this->assertTrue(RedatorDocumentType::FIRMA->isSelfService());
        $this->assertFalse(RedatorDocumentType::FIRMA->aceitaValidade());
        $this->assertTrue(RedatorDocumentType::CV->aceitaValidade());
    }
}
