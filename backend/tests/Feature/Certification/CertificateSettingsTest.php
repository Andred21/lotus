<?php

namespace Tests\Feature\Certification;

use App\Domains\Certification\Models\CertificateSettings;
use App\Domains\Identity\Support\PermissionCatalog;
use App\Shared\Files\Models\File;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Spatie\Permission\Models\Role;
use Tests\Support\Files\BuildsRealUploads;
use Tests\TestCase;

/**
 * Spec D3/D5/D16 do bloco 40: Configuración › Certificados é um singleton
 * (`certificate_settings`) com o nome, o cargo e a assinatura da gerente. Só o
 * superadmin acessa.
 */
class CertificateSettingsTest extends TestCase
{
    use BuildsRealUploads;
    use RefreshDatabase;

    private function assinatura(int $largura = 900): UploadedFile
    {
        return $this->uploadReal($this->pngDeLargura($largura, 300), 'gerente.png', 'image/png');
    }

    public function test_superadmin_le_as_configuracoes_com_a_gerente_semeada(): void
    {
        $this->actingAsSuperadmin();

        $this->getJson('/api/certificate-settings')
            ->assertOk()
            ->assertJsonPath('manager_name', 'Marcia de Batalha')
            ->assertJsonPath('manager_title', 'Gerente OTEC')
            ->assertJsonPath('signature', null);
    }

    public function test_superadmin_salva_nome_e_cargo_e_gera_auditoria(): void
    {
        $this->actingAsSuperadmin();

        $this->putJson('/api/certificate-settings', [
            'manager_name' => 'Ana Pérez',
            'manager_title' => 'Directora OTEC',
        ])->assertOk()
            ->assertJsonPath('manager_name', 'Ana Pérez')
            ->assertJsonPath('manager_title', 'Directora OTEC');

        $this->assertSame('Ana Pérez', CertificateSettings::atual()->manager_name);

        $audit = DB::table('audits')
            ->where('auditable_type', 'certificate_settings')
            ->where('event', 'updated')
            ->first();

        $this->assertNotNull($audit);
        $this->assertSame('Ana Pérez', json_decode($audit->new_values, true)['manager_name']);
    }

    public function test_nome_e_cargo_sao_obrigatorios(): void
    {
        $this->actingAsSuperadmin();

        $this->putJson('/api/certificate-settings', ['manager_name' => '', 'manager_title' => ''])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['manager_name', 'manager_title']);
    }

    public function test_superadmin_sobe_troca_e_remove_a_assinatura(): void
    {
        Storage::fake('s3');
        $this->actingAsSuperadmin();

        $this->postJson('/api/certificate-settings/signature', ['file' => $this->assinatura()])
            ->assertCreated()
            ->assertJsonPath('signature.original_name', 'gerente.png');

        $primeira = File::where('type', CertificateSettings::TIPO_FIRMA)->firstOrFail();

        $this->postJson('/api/certificate-settings/signature', ['file' => $this->assinatura()])
            ->assertCreated();

        $this->assertSoftDeleted('files', ['id' => $primeira->id]);
        $this->assertSame(1, File::where('type', CertificateSettings::TIPO_FIRMA)->count());
        $this->assertNotNull(
            $this->getJson('/api/certificate-settings')->json('signature.download_url'),
        );

        $this->deleteJson('/api/certificate-settings/signature')->assertOk()
            ->assertJsonPath('signature', null);

        $this->assertSame(0, File::where('type', CertificateSettings::TIPO_FIRMA)->count());
        $this->assertNull($this->getJson('/api/certificate-settings')->json('signature'));
    }

    public function test_subir_trocar_e_remover_a_assinatura_da_gerente_gera_auditoria_do_arquivo(): void
    {
        Storage::fake('s3');
        $this->actingAsSuperadmin();

        $this->postJson('/api/certificate-settings/signature', ['file' => $this->assinatura()])->assertCreated();
        $primeira = File::where('type', CertificateSettings::TIPO_FIRMA)->firstOrFail();

        $criada = DB::table('audits')
            ->where('auditable_type', 'file')
            ->where('auditable_id', $primeira->id)
            ->where('event', 'created')
            ->first();
        $this->assertNotNull($criada);
        $this->assertSame(CertificateSettings::TIPO_FIRMA, json_decode($criada->new_values, true)['type']);

        $this->postJson('/api/certificate-settings/signature', ['file' => $this->assinatura()])->assertCreated();
        $segunda = File::where('type', CertificateSettings::TIPO_FIRMA)->firstOrFail();

        $this->assertSame(1, DB::table('audits')
            ->where('auditable_type', 'file')->where('auditable_id', $primeira->id)->where('event', 'deleted')->count());
        $this->assertSame(1, DB::table('audits')
            ->where('auditable_type', 'file')->where('auditable_id', $segunda->id)->where('event', 'created')->count());

        $this->deleteJson('/api/certificate-settings/signature')->assertOk();

        $this->assertSame(1, DB::table('audits')
            ->where('auditable_type', 'file')->where('auditable_id', $segunda->id)->where('event', 'deleted')->count());
    }

    public function test_assinatura_vigente_ignora_arquivo_mais_novo_de_outro_tipo_ou_apagado(): void
    {
        Storage::fake('s3');
        $this->actingAsSuperadmin();
        $settings = CertificateSettings::atual();

        $vigente = File::create([
            'fileable_type' => 'certificate_settings', 'fileable_id' => $settings->id,
            'type' => CertificateSettings::TIPO_FIRMA, 'path' => 'certificate_settings/1/a.png',
            'original_name' => 'vigente.png', 'mime' => 'image/png', 'size' => 10,
        ]);
        File::create([
            'fileable_type' => 'certificate_settings', 'fileable_id' => $settings->id,
            'type' => 'OUTRO', 'path' => 'certificate_settings/1/b.png',
            'original_name' => 'outro.png', 'mime' => 'image/png', 'size' => 10,
        ]);
        File::create([
            'fileable_type' => 'certificate_settings', 'fileable_id' => $settings->id,
            'type' => CertificateSettings::TIPO_FIRMA, 'path' => 'certificate_settings/1/c.png',
            'original_name' => 'apagada.png', 'mime' => 'image/png', 'size' => 10,
        ])->delete();

        $this->assertSame($vigente->id, $settings->fresh()->signature?->id);
        $this->getJson('/api/certificate-settings')
            ->assertJsonPath('signature.original_name', 'vigente.png');
    }

    public function test_assinatura_da_gerente_passa_pela_mesma_validacao_da_firma(): void
    {
        Storage::fake('s3');
        $this->actingAsSuperadmin();

        $this->postJson('/api/certificate-settings/signature', [
            'file' => $this->uploadReal($this->jpegReal(), 'gerente.jpg', 'image/jpeg'),
        ])->assertUnprocessable();

        $this->postJson('/api/certificate-settings/signature', ['file' => $this->assinatura(599)])
            ->assertUnprocessable()
            ->assertJsonPath('errors.file.0', __('shared.file.image_too_narrow', ['min' => 600, 'width' => 599]));

        $this->assertSame(0, File::where('type', CertificateSettings::TIPO_FIRMA)->count());
    }

    public function test_admin_recebe_403_em_toda_rota(): void
    {
        Storage::fake('s3');
        $this->actingAsAdmin();

        $this->getJson('/api/certificate-settings')->assertForbidden();
        $this->putJson('/api/certificate-settings', ['manager_name' => 'X', 'manager_title' => 'Y'])->assertForbidden();
        $this->postJson('/api/certificate-settings/signature', ['file' => $this->assinatura()])->assertForbidden();
        $this->deleteJson('/api/certificate-settings/signature')->assertForbidden();
    }

    public function test_permissao_e_so_do_superadmin(): void
    {
        $this->seed(RolePermissionSeeder::class);
        $permissao = 'certification.settings.manage';

        $this->assertTrue(Role::findByName('superadmin', 'web')->hasPermissionTo($permissao));
        $this->assertFalse(Role::findByName('admin', 'web')->hasPermissionTo($permissao));
        $this->assertFalse(Role::findByName('redator', 'web')->hasPermissionTo($permissao));
        $this->assertContains($permissao, PermissionCatalog::SEGREGATED);
    }

    public function test_alias_de_morph(): void
    {
        $this->assertSame(CertificateSettings::class, Relation::getMorphedModel('certificate_settings'));
    }
}
