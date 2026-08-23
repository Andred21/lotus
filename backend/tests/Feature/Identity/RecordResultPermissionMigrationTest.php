<?php

namespace Tests\Feature\Identity;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

/**
 * A suíte nasce com o catálogo JÁ contendo a permissão, então rodar a migration
 * sobre o estado da suíte provaria nada. O teste RECRIA o estado legado — as
 * três roles sem a permissão — e executa `up()` sobre ele, mesmo molde do
 * `RemoveOrphanFeedbackPermissionsMigrationTest`.
 */
class RecordResultPermissionMigrationTest extends TestCase
{
    use RefreshDatabase;

    private const PERMISSAO = 'operation.enrollment.record_result';

    private function migration(): object
    {
        return require base_path('database/migrations/2026_08_22_000002_add_record_result_permission.php');
    }

    /** @return array<string,Role> */
    private function semearEstadoLegado(): array
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        Permission::where('name', self::PERMISSAO)->delete();

        $roles = [];
        foreach (['superadmin', 'admin', 'redator'] as $nome) {
            $roles[$nome] = Role::firstOrCreate(['name' => $nome, 'guard_name' => 'web']);
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();

        return $roles;
    }

    public function test_up_cria_a_permissao_e_vincula_as_tres_roles(): void
    {
        $roles = $this->semearEstadoLegado();

        $this->migration()->up();
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $permissao = Permission::where('name', self::PERMISSAO)->where('guard_name', 'web')->first();
        $this->assertNotNull($permissao);

        foreach ($roles as $nome => $role) {
            $this->assertTrue(
                $role->fresh()->hasPermissionTo(self::PERMISSAO),
                "A role {$nome} ficou sem a permissão.",
            );
        }
    }

    public function test_up_e_idempotente(): void
    {
        $this->semearEstadoLegado();

        $this->migration()->up();
        $this->migration()->up();
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $this->assertSame(1, Permission::where('name', self::PERMISSAO)->count());
    }

    public function test_down_apaga_a_permissao_e_os_vinculos(): void
    {
        $roles = $this->semearEstadoLegado();

        $this->migration()->up();
        $id = Permission::where('name', self::PERMISSAO)->value('id');
        $this->migration()->down();
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $this->assertSame(0, Permission::where('name', self::PERMISSAO)->count());
        $this->assertSame(
            0,
            DB::table(config('permission.table_names.role_has_permissions'))
                ->where('permission_id', $id)
                ->count(),
        );
        // hasPermissionTo() lança PermissionDoesNotExist para permissão que não
        // existe mais, em vez de devolver false — confere pela relação
        // (que só reflete o pivot, já vazio) em vez do helper do registrar.
        $this->assertFalse($roles['redator']->fresh()->permissions->contains('name', self::PERMISSAO));
    }
}
