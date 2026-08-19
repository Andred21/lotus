<?php

namespace Tests\Feature\Identity;

use App\Domains\Identity\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\Certification\IssuableEnrollmentBuilder;
use Tests\TestCase;

class RedatorArchiveEndpointTest extends TestCase
{
    use RefreshDatabase;

    public function test_listagem_de_arquivados_nao_vaza_ativo_e_traz_data_e_autor(): void
    {
        $autor = $this->actingAsAdmin();
        $autor->update(['name' => 'Ana Torres']);

        $vivo = IssuableEnrollmentBuilder::make()->create()->redatorModel();

        // Segunda cadeia no MESMO teste: os RUTs do default do builder são
        // literais fixos e o índice único de `users.rut` recusa a repetição.
        // Mesmo remédio do `reprovadaBuilder()` do `CertificateEligibilityTest`
        // — com uma diferença: o redator NÃO pode sair com RUT nulo, porque
        // `RedatorData::$rut` é `string` não-nulo e a projeção é o que este
        // teste lê.
        $arquivado = IssuableEnrollmentBuilder::make()
            ->client([], ['rut' => null])
            ->student(['rut' => null])
            ->redatorUser(['rut' => '5.555.555-5'])
            ->create()
            ->redatorModel();
        $arquivado->delete();

        $this->getJson('/api/redatores/archived')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.redator.id', $arquivado->id)
            ->assertJsonPath('0.archived_by', 'Ana Torres');

        $this->getJson('/api/redatores')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.id', $vivo->id);
    }

    public function test_arquivado_mostra_os_documentos_que_a_cascata_levou(): void
    {
        // Sem o eager load com `withTrashed()` a linha aparece com ZERO
        // documentos — a cascata acabou de arquivá-los e o global scope os
        // esconde. O operador reconhece o redator por eles antes de restaurar
        // (Q-8 do review de 2026-08-18).
        $this->actingAsAdmin();
        $redator = IssuableEnrollmentBuilder::make()->create()->redatorModel();

        $redator->documents()->create([
            'type' => 'cv',
            'path' => 'redatores/1/cv.pdf',
            'original_name' => 'cv.pdf',
            'mime' => 'application/pdf',
            'size' => 2048,
        ]);

        $redator->delete();

        $this->getJson('/api/redatores/archived')
            ->assertOk()
            ->assertJsonCount(1, '0.redator.documents');
    }

    public function test_arquivado_nao_mostra_o_documento_arquivado_antes_do_pai(): void
    {
        $this->actingAsAdmin();
        $redator = IssuableEnrollmentBuilder::make()->create()->redatorModel();

        $antigo = $redator->documents()->create([
            'type' => 'cv',
            'path' => 'redatores/1/antigo.pdf',
            'original_name' => 'antigo.pdf',
            'mime' => 'application/pdf',
            'size' => 1024,
        ]);
        $antigo->delete();

        $redator->delete();

        $this->getJson('/api/redatores/archived')
            ->assertOk()
            ->assertJsonCount(0, '0.redator.documents');
    }

    public function test_restore_devolve_200_e_traz_user_e_documentos_de_volta(): void
    {
        $this->actingAsAdmin();
        $redator = IssuableEnrollmentBuilder::make()->create()->redatorModel();

        $documento = $redator->documents()->create([
            'type' => 'cv',
            'path' => 'redatores/1/cv.pdf',
            'original_name' => 'cv.pdf',
            'mime' => 'application/pdf',
            'size' => 2048,
        ]);

        $redator->delete();

        $this->postJson("/api/redatores/{$redator->id}/restore")
            ->assertOk()
            ->assertJsonPath('id', $redator->id);

        $this->assertNotSoftDeleted('redatores', ['id' => $redator->id]);
        $this->assertDatabaseHas('files', ['id' => $documento->id, 'deleted_at' => null, 'archived_with_parent' => false]);
        $this->assertDatabaseHas('users', ['id' => $redator->user_id, 'deleted_at' => null, 'archived_with_parent' => false]);
    }

    public function test_restore_nao_traz_de_volta_o_documento_arquivado_antes(): void
    {
        $this->actingAsAdmin();
        $redator = IssuableEnrollmentBuilder::make()->create()->redatorModel();

        $antigo = $redator->documents()->create([
            'type' => 'cv',
            'path' => 'redatores/1/antigo.pdf',
            'original_name' => 'antigo.pdf',
            'mime' => 'application/pdf',
            'size' => 1024,
        ]);
        $antigo->delete();

        $redator->delete();
        $this->postJson("/api/redatores/{$redator->id}/restore")->assertOk();

        $this->assertSoftDeleted('files', ['id' => $antigo->id]);
    }

    public function test_restore_de_redator_ativo_da_404(): void
    {
        $this->actingAsAdmin();
        $redator = IssuableEnrollmentBuilder::make()->create()->redatorModel();

        $this->postJson("/api/redatores/{$redator->id}/restore")->assertNotFound();
    }

    public function test_sem_a_permissao_de_restore_da_403(): void
    {
        $this->seed(RolePermissionSeeder::class);

        $user = User::factory()->create(['type' => 'admin', 'is_active' => true]);
        $user->givePermissionTo('identity.user.view');
        $this->actingAs($user, 'web');

        $redator = IssuableEnrollmentBuilder::make()->create()->redatorModel();
        $redator->delete();

        // Vê a lista (tem a `view`)...
        $this->getJson('/api/redatores/archived')->assertOk();
        // ...mas não restaura.
        $this->postJson("/api/redatores/{$redator->id}/restore")->assertForbidden();
    }

    public function test_archived_exige_a_permissao_de_view(): void
    {
        $this->seed(RolePermissionSeeder::class);

        $user = User::factory()->redator()->create(['is_active' => true]);
        $user->assignRole('redator');
        $this->actingAs($user, 'web');

        $this->getJson('/api/redatores/archived')->assertForbidden();
    }
}
