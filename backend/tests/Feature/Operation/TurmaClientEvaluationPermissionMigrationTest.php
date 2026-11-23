<?php

namespace Tests\Feature\Operation;

use App\Domains\Identity\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

/**
 * Seeder só corrige quem o roda, e o deploy não roda `db:seed`: banco já
 * provisionado ficaria sem `operation.turma.submit_client_evaluation` e o admin
 * levaria 403 ao subir a evaluación do cliente. O teste RECRIA o estado legado
 * (roles sem ela) e executa `up()` sobre ele — molde do
 * `TurmaConcludedDocsPermissionMigrationTest`, mas aqui a permissão vai para
 * `admin` e `superadmin` (não é segregada) e nunca para `redator`.
 */
class TurmaClientEvaluationPermissionMigrationTest extends TestCase
{
    use RefreshDatabase;

    private const PERMISSAO = 'operation.turma.submit_client_evaluation';

    private function migration(): object
    {
        return require base_path('database/migrations/2026_11_22_000003_add_turma_client_evaluation_permission.php');
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

    public function test_up_cria_a_permissao_e_vincula_admin_e_superadmin_nao_o_redator(): void
    {
        $roles = $this->semearEstadoLegado();

        $this->migration()->up();
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $this->assertNotNull(
            Permission::where('name', self::PERMISSAO)->where('guard_name', 'web')->first(),
        );
        $this->assertTrue($roles['superadmin']->fresh()->hasPermissionTo(self::PERMISSAO));
        $this->assertTrue($roles['admin']->fresh()->hasPermissionTo(self::PERMISSAO));
        $this->assertFalse($roles['redator']->fresh()->hasPermissionTo(self::PERMISSAO));
    }

    public function test_up_e_idempotente(): void
    {
        $roles = $this->semearEstadoLegado();

        $this->migration()->up();
        $this->migration()->up();
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $id = Permission::where('name', self::PERMISSAO)->value('id');
        $pivot = config('permission.table_names.role_has_permissions');

        $this->assertSame(1, Permission::where('name', self::PERMISSAO)->count());
        foreach (['superadmin', 'admin'] as $nome) {
            $this->assertSame(
                1,
                DB::table($pivot)->where('permission_id', $id)->where('role_id', $roles[$nome]->id)->count(),
            );
        }
    }

    public function test_down_apaga_a_permissao_e_os_vinculos(): void
    {
        $this->semearEstadoLegado();

        $this->migration()->up();
        $id = Permission::where('name', self::PERMISSAO)->value('id');
        $this->migration()->down();
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $this->assertSame(0, Permission::where('name', self::PERMISSAO)->count());
        $this->assertSame(
            0,
            DB::table(config('permission.table_names.role_has_permissions'))->where('permission_id', $id)->count(),
        );
    }

    public function test_permissao_homonima_em_outro_guard_fica_intocada(): void
    {
        $roles = $this->semearEstadoLegado();
        $pivot = config('permission.table_names.role_has_permissions');
        $homonimaId = DB::table(config('permission.table_names.permissions'))->insertGetId([
            'name' => self::PERMISSAO, 'guard_name' => 'api', 'created_at' => now(), 'updated_at' => now(),
        ]);

        $this->migration()->up();

        $web = Permission::where('name', self::PERMISSAO)->where('guard_name', 'web')->first();
        $this->assertNotNull($web);
        $this->assertNotSame($homonimaId, $web->id);
        $this->assertSame(0, DB::table($pivot)->where('permission_id', $homonimaId)->count());
        $this->assertSame(
            1,
            DB::table($pivot)->where('permission_id', $web->id)->where('role_id', $roles['admin']->id)->count(),
        );

        $this->migration()->down();

        $this->assertSame(0, Permission::where('name', self::PERMISSAO)->where('guard_name', 'web')->count());
        $this->assertSame(1, Permission::where('name', self::PERMISSAO)->where('guard_name', 'api')->count());
    }

    public function test_up_esquece_o_cache_do_spatie_e_o_admin_passa_a_poder(): void
    {
        $roles = $this->semearEstadoLegado();

        $admin = User::factory()->create();
        $admin->assignRole($roles['admin']);

        $this->assertFalse($admin->can(self::PERMISSAO));
        app(PermissionRegistrar::class)->getPermissions();

        $this->migration()->up();

        $this->assertTrue($admin->fresh()->can(self::PERMISSAO));
    }
}
