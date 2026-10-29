<?php

namespace Tests\Feature\Certification;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

/**
 * Seeder só corrige quem o roda, e o deploy não roda `db:seed`: banco já
 * provisionado ficaria sem `certification.settings.manage` e o superadmin
 * levaria 403 nas quatro rotas. A suíte nasce com o catálogo JÁ contendo a
 * permissão, então o teste RECRIA o estado legado (roles sem ela) e executa
 * `up()` sobre ele — mesmo molde do `RecordResultPermissionMigrationTest`.
 */
class CertificateSettingsPermissionMigrationTest extends TestCase
{
    use RefreshDatabase;

    private const PERMISSAO = 'certification.settings.manage';

    private function migration(): object
    {
        return require base_path('database/migrations/2026_10_29_000002_add_certification_settings_permission.php');
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

    public function test_up_cria_a_permissao_e_vincula_so_o_superadmin(): void
    {
        $roles = $this->semearEstadoLegado();

        $this->migration()->up();
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $this->assertNotNull(
            Permission::where('name', self::PERMISSAO)->where('guard_name', 'web')->first(),
        );
        $this->assertTrue($roles['superadmin']->fresh()->hasPermissionTo(self::PERMISSAO));
        $this->assertFalse($roles['admin']->fresh()->hasPermissionTo(self::PERMISSAO));
        $this->assertFalse($roles['redator']->fresh()->hasPermissionTo(self::PERMISSAO));
    }

    public function test_up_e_idempotente(): void
    {
        $roles = $this->semearEstadoLegado();

        $this->migration()->up();
        $this->migration()->up();
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $id = Permission::where('name', self::PERMISSAO)->value('id');

        $this->assertSame(1, Permission::where('name', self::PERMISSAO)->count());
        $this->assertSame(
            1,
            DB::table(config('permission.table_names.role_has_permissions'))
                ->where('permission_id', $id)
                ->where('role_id', $roles['superadmin']->id)
                ->count(),
        );
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
        $this->assertFalse($roles['superadmin']->fresh()->permissions->contains('name', self::PERMISSAO));
    }
}
