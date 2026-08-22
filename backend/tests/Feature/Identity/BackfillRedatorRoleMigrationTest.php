<?php

namespace Tests\Feature\Identity;

use App\Domains\Identity\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

/**
 * P-47: os redatores criados ANTES de `e3490d84` (que pôs `syncRoles(['redator'])`
 * no `CreateRedatorAction`) ficaram sem role. O seeder já nasce certo; migration
 * é o único mecanismo que alcança linha já existente — mesmo argumento escrito
 * no docblock da `2026_08_22_000001`.
 *
 * `is_active` NÃO entra no backfill: redator desativado de propósito existe, e
 * reativá-lo em massa seria a P-51 ao contrário.
 */
class BackfillRedatorRoleMigrationTest extends TestCase
{
    use RefreshDatabase;

    private function migration(): object
    {
        return require base_path('database/migrations/2026_08_22_000003_backfill_redator_role.php');
    }

    private function redatorLegado(bool $ativo = true): User
    {
        Role::firstOrCreate(['name' => 'redator', 'guard_name' => 'web']);

        $user = User::factory()->create(['type' => 'redator', 'is_active' => $ativo]);
        $user->redator()->create([]);

        // Estado legado: sem role, como as linhas anteriores ao commit.
        DB::table('model_has_roles')->where('model_id', $user->id)->delete();
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        return $user;
    }

    public function test_up_da_a_role_a_quem_estava_sem(): void
    {
        $user = $this->redatorLegado();
        $this->assertFalse($user->fresh()->hasRole('redator'));

        $this->migration()->up();
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $this->assertTrue($user->fresh()->hasRole('redator'));
    }

    public function test_up_alcanca_redator_desativado_sem_reativa_lo(): void
    {
        $user = $this->redatorLegado(ativo: false);

        $this->migration()->up();
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $this->assertTrue($user->fresh()->hasRole('redator'));
        // A role é capacidade; `is_active` é acesso. O backfill toca a primeira
        // e nunca a segunda.
        $this->assertFalse($user->fresh()->is_active);
    }

    public function test_up_nao_toca_quem_nao_e_redator(): void
    {
        Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);
        Role::firstOrCreate(['name' => 'redator', 'guard_name' => 'web']);

        $admin = User::factory()->create(['type' => 'admin']);
        $admin->assignRole('admin');
        $aluno = User::factory()->create(['type' => 'aluno', 'is_active' => false]);

        $this->migration()->up();
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $this->assertSame(['admin'], $admin->fresh()->getRoleNames()->all());
        $this->assertSame([], $aluno->fresh()->getRoleNames()->all());
    }

    public function test_up_e_idempotente(): void
    {
        $user = $this->redatorLegado();

        $this->migration()->up();
        $this->migration()->up();
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $this->assertSame(
            1,
            DB::table('model_has_roles')->where('model_id', $user->id)->count(),
        );
    }
}
