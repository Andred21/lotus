<?php

namespace Tests\Feature\Identity;

use App\Domains\Identity\Models\Redator;
use App\Domains\Identity\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\CreatesDomainRecords;
use Tests\TestCase;

class StaffUserArchiveEndpointTest extends TestCase
{
    use CreatesDomainRecords;
    use RefreshDatabase;

    public function test_listagem_de_arquivados_traz_data_e_autor_e_nao_vaza_ativo(): void
    {
        $autor = $this->actingAsSuperadmin();
        $autor->update(['name' => 'Ana Torres']);

        $arquivado = User::factory()->create(['type' => 'admin', 'is_active' => true, 'name' => 'Bruno Salas']);
        $arquivado->assignRole('admin');

        $this->deleteJson("/api/users/{$arquivado->id}")->assertNoContent();

        $this->getJson('/api/users/archived')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.user.id', $arquivado->id)
            ->assertJsonPath('0.user.name', 'Bruno Salas')
            ->assertJsonPath('0.archived_by', 'Ana Torres');

        // O autor continua ativo e fora da lista de arquivados.
        $this->getJson('/api/users')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.id', $autor->id);
    }

    public function test_arquivados_nao_vaza_user_de_cliente_arquivado_por_cascata(): void
    {
        // O caso que a spec D10 existe para impedir: `Client::booted()` arquiva o
        // User do cliente junto. Sem o filtro por `type`, ele apareceria na lista
        // de staff — um registro que a tela nem sabe representar, e cuja
        // restauração isolada quebraria a consistência com o agregado pai.
        $this->actingAsSuperadmin();

        $client = $this->makeClientWithUser(['legal_name' => 'Empresa Ltda'], ['rut' => '12.345.678-5']);
        $client->delete();

        $this->assertSoftDeleted('users', ['id' => $client->user_id]);

        $this->getJson('/api/users/archived')
            ->assertOk()
            ->assertJsonCount(0);
    }

    public function test_arquivados_nao_vaza_nem_restaura_user_de_redator_arquivado_por_cascata(): void
    {
        // A outra cascata que desce até `users`, e a mais recente (Task 8):
        // `Redator::booted()` chama `markAndDelete($redator->user)`. Um staff
        // restaurado por esta rota voltaria pelas costas do redator — o pai
        // continuaria arquivado com o filho vivo. O filtro por `type` é o que
        // impede as DUAS pontas: a lista e o restore.
        $this->actingAsSuperadmin();

        $redator = Redator::create(['user_id' => User::factory()->redator()->create()->id]);
        $redator->delete();

        $this->assertSoftDeleted('users', ['id' => $redator->user_id]);

        $this->getJson('/api/users/archived')
            ->assertOk()
            ->assertJsonCount(0);

        $this->postJson("/api/users/{$redator->user_id}/restore")->assertNotFound();
        $this->assertSoftDeleted('users', ['id' => $redator->user_id]);
    }

    public function test_restore_devolve_200_e_reativa_o_usuario(): void
    {
        $this->actingAsSuperadmin();

        $alvo = User::factory()->create(['type' => 'admin', 'is_active' => true]);
        $alvo->assignRole('admin');
        $this->deleteJson("/api/users/{$alvo->id}")->assertNoContent();

        $this->postJson("/api/users/{$alvo->id}/restore")
            ->assertOk()
            ->assertJsonPath('id', $alvo->id)
            ->assertJsonPath('role', 'admin');

        $this->assertNotSoftDeleted('users', ['id' => $alvo->id]);
    }

    public function test_restore_de_user_nao_admin_da_404(): void
    {
        $this->actingAsSuperadmin();

        $client = $this->makeClientWithUser([], ['rut' => '15.678.901-6']);
        $client->delete();

        $this->postJson("/api/users/{$client->user_id}/restore")->assertNotFound();
    }

    public function test_restore_de_user_ativo_da_404(): void
    {
        $autor = $this->actingAsSuperadmin();

        $this->postJson("/api/users/{$autor->id}/restore")->assertNotFound();
    }

    public function test_admin_comum_ve_a_lista_mas_nao_restaura(): void
    {
        // `identity.access.manage` é SEGREGADA: admin não a tem. Ele vê a lista
        // (tem `identity.user.view`) e é recusado no restore, exatamente como já
        // é recusado no arquivar (spec D7).
        $superadmin = $this->actingAsSuperadmin();
        $alvo = User::factory()->create(['type' => 'admin', 'is_active' => true]);
        $alvo->assignRole('admin');
        $this->deleteJson("/api/users/{$alvo->id}")->assertNoContent();

        $admin = User::factory()->create(['type' => 'admin', 'is_active' => true]);
        $admin->assignRole('admin');

        // `forgetGuards()` ANTES do `actingAs`, e não é zelo: `auth:sanctum`
        // resolve por `Illuminate\Auth\RequestGuard`, que cacheia o usuário na
        // primeira resolução e é singleton no container durante todo o método de
        // teste. Sem derrubar os guards, a troca só atinge o guard `web` e as
        // duas chamadas abaixo continuariam autenticando como o SUPERADMIN —
        // medido: o restore passava com 200 e o teste dizia o contrário do que
        // afirma. Mesmo remédio do `test_perfil_nao_faz_n_mais_um`
        // (`ProfileReadTest`).
        $this->app['auth']->forgetGuards();
        $this->actingAs($admin, 'web');

        $this->getJson('/api/users/archived')->assertOk();
        $this->postJson("/api/users/{$alvo->id}/restore")->assertForbidden();

        $this->assertSoftDeleted('users', ['id' => $alvo->id]);
        $this->assertNotNull($superadmin->id);
    }

    public function test_archived_exige_a_permissao_de_view(): void
    {
        $this->seed(RolePermissionSeeder::class);

        $user = User::factory()->redator()->create(['is_active' => true]);
        $user->assignRole('redator');
        $this->actingAs($user, 'web');

        $this->getJson('/api/users/archived')->assertForbidden();
    }

    public function test_id_nao_numerico_da_404_e_nao_500(): void
    {
        // Sem o `whereNumber` da rota, `int $user` estoura `TypeError` antes
        // de qualquer consulta e o handler devolve 500 (Q-6 do review).
        $this->actingAsSuperadmin();

        $this->postJson('/api/users/abc/restore')->assertNotFound();
    }
}
