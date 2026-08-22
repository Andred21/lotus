<?php

namespace Tests\Feature\Identity;

use App\Domains\Identity\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

/**
 * `is_active` era conferido SÓ no login (`AuthController:52`): sessão viva
 * sobrevivia à desativação até o cookie expirar. Duas pontas fecham a janela —
 * a transição (purge na Action) e o request (este middleware). Nenhuma das
 * duas resolve o caso da outra (spec D5).
 */
class AccountDeactivationMidSessionTest extends TestCase
{
    use RefreshDatabase;

    public function test_desativar_staff_pela_action_derruba_as_sessoes(): void
    {
        $this->actingAsSuperadmin();

        $alvo = User::factory()->create(['type' => 'admin', 'is_active' => true, 'email' => 'alvo@lotus.cl']);
        $alvo->assignRole('admin');

        foreach (['sess-a', 'sess-b'] as $id) {
            DB::table('sessions')->insert([
                'id' => $id, 'user_id' => $alvo->id, 'ip_address' => '127.0.0.1',
                'user_agent' => 'phpunit', 'payload' => 'x', 'last_activity' => 1_755_000_000,
            ]);
        }

        $this->putJson("/api/users/{$alvo->id}", [
            'name' => 'Alvo', 'email' => 'alvo@lotus.cl', 'role' => 'admin', 'is_active' => false,
        ])->assertOk();

        $this->assertFalse($alvo->refresh()->is_active);
        $this->assertSame(0, DB::table('sessions')->where('user_id', $alvo->id)->count());
    }

    public function test_reenviar_false_para_quem_ja_estava_inativo_nao_purga(): void
    {
        $this->actingAsSuperadmin();

        $alvo = User::factory()->create(['type' => 'admin', 'is_active' => false, 'email' => 'alvo@lotus.cl']);
        $alvo->assignRole('admin');

        DB::table('sessions')->insert([
            'id' => 'sess-c', 'user_id' => $alvo->id, 'ip_address' => '127.0.0.1',
            'user_agent' => 'phpunit', 'payload' => 'x', 'last_activity' => 1_755_000_000,
        ]);

        $this->putJson("/api/users/{$alvo->id}", [
            'name' => 'Alvo', 'email' => 'alvo@lotus.cl', 'role' => 'admin', 'is_active' => false,
        ])->assertOk();

        // Revogação é TRANSIÇÃO, não estado — mesma forma do
        // `UpdateRedatorAction`. Reenviar `false` não derruba sessão nenhuma.
        $this->assertSame(1, DB::table('sessions')->where('user_id', $alvo->id)->count());
    }

    /**
     * Login REAL, não `actingAs`: o `actingAs` fixa uma instância em memória e
     * a reusa em todo request do teste, então um UPDATE por fora não seria
     * visto e o teste passaria verde sem provar nada. Com sessão de verdade o
     * `SessionGuard` refaz o `retrieveById` a cada request.
     */
    private function logar(User $user): void
    {
        $user->forceFill(['password' => Hash::make('senha123')])->save();

        $this->postJson('/api/login', ['email' => $user->email, 'password' => 'senha123'])
            ->assertOk();
    }

    public function test_conta_desativada_por_fora_perde_acesso_no_request_seguinte(): void
    {
        $this->seed(RolePermissionSeeder::class);
        $user = User::factory()->create(['type' => 'admin', 'is_active' => true]);
        $user->assignRole('admin');
        $this->logar($user);

        $this->getJson('/api/me')->assertOk();

        // Por fora da Action, que é o caso que o purge não alcança: seed, SQL
        // direto, Action futura.
        DB::table('users')->where('id', $user->id)->update(['is_active' => false]);

        // `forgetGuards()` — mesmo remédio do `ProfileReadTest::test_perfil_nao_faz_n_mais_um`
        // e do `StaffUserArchiveEndpointTest::test_admin_comum_ve_a_lista_mas_nao_restaura`:
        // o guard `sanctum` cacheia o usuário na primeira resolução e é singleton
        // no container durante todo o método de teste. Sem derrubá-lo aqui, a
        // segunda chamada devolveria o objeto velho (is_active=true, do cache) e
        // o teste passaria verde sem provar nada — artefato do container
        // persistir entre chamadas de teste, não do comportamento em produção:
        // lá cada request boota o guard do zero.
        $this->app['auth']->forgetGuards();

        $this->getJson('/api/me')
            ->assertStatus(401)
            ->assertHeader('Content-Type', 'application/problem+json');
    }

    public function test_type_fora_de_admin_e_redator_perde_acesso(): void
    {
        $this->seed(RolePermissionSeeder::class);
        $user = User::factory()->create(['type' => 'admin', 'is_active' => true]);
        $user->assignRole('admin');
        $this->logar($user);

        $this->getJson('/api/me')->assertOk();

        // RN-01 aplicada por REQUEST e não só na porta: cliente e aluno nascem
        // `is_active = false` e já não logam, mas um `type` trocado por SQL
        // atravessava tudo.
        DB::table('users')->where('id', $user->id)->update(['type' => 'cliente']);

        // Mesmo motivo do teste anterior: guard cacheado precisa cair antes
        // do request seguinte.
        $this->app['auth']->forgetGuards();

        $this->getJson('/api/me')->assertStatus(401);
    }
}
