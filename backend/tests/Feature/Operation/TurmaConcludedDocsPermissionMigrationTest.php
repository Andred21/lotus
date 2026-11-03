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
 * provisionado ficaria sem `operation.turma.manage_concluded_docs` e o
 * superadmin levaria 403 em turma concluída. A suíte nasce com o catálogo JÁ
 * contendo a permissão, então o teste RECRIA o estado legado (roles sem ela) e
 * executa `up()` sobre ele — mesmo molde do `CertificateSettingsPermissionMigrationTest`.
 *
 * Cobre também as duas assertivas da P-54: o filtro `guard_name = 'web'` (uma
 * permissão homônima em outro guard fica intocada) e o
 * `forgetCachedPermissions()` (o cache aquecido antes do `up()` não pode
 * sobreviver a ele).
 */
class TurmaConcludedDocsPermissionMigrationTest extends TestCase
{
    use RefreshDatabase;

    private const PERMISSAO = 'operation.turma.manage_concluded_docs';

    private function migration(): object
    {
        return require base_path('database/migrations/2026_11_02_000001_add_turma_concluded_docs_permission.php');
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

    /** Permissão homônima em outro guard, inserida direto (o guard não existe na config). */
    private function semearHomonimaEmOutroGuard(): int
    {
        return DB::table(config('permission.table_names.permissions'))->insertGetId([
            'name' => self::PERMISSAO,
            'guard_name' => 'api',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
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

    public function test_permissao_homonima_em_outro_guard_fica_intocada_pelo_up_e_pelo_down(): void
    {
        $roles = $this->semearEstadoLegado();
        $homonimaId = $this->semearHomonimaEmOutroGuard();
        $pivot = config('permission.table_names.role_has_permissions');

        $this->migration()->up();

        // O `up()` criou a permissão `web` própria e vinculou ela, não a homônima.
        $web = Permission::where('name', self::PERMISSAO)->where('guard_name', 'web')->first();
        $this->assertNotNull($web);
        $this->assertNotSame($homonimaId, $web->id);
        $this->assertSame(0, DB::table($pivot)->where('permission_id', $homonimaId)->count());
        $this->assertSame(
            1,
            DB::table($pivot)->where('permission_id', $web->id)->where('role_id', $roles['superadmin']->id)->count(),
        );

        $this->migration()->down();

        // O `down()` apagou só a `web`.
        $this->assertSame(0, Permission::where('name', self::PERMISSAO)->where('guard_name', 'web')->count());
        $this->assertSame(
            1,
            Permission::where('name', self::PERMISSAO)->where('guard_name', 'api')->where('id', $homonimaId)->count(),
        );
    }

    public function test_up_esquece_o_cache_do_spatie_e_o_superadmin_passa_a_poder(): void
    {
        $roles = $this->semearEstadoLegado();

        $superadmin = User::factory()->create();
        $superadmin->assignRole($roles['superadmin']);

        // Aquece o cache do registrar sem a permissão: um `up()` que não o esquecesse devolveria este estado.
        $this->assertFalse($superadmin->can(self::PERMISSAO));
        app(PermissionRegistrar::class)->getPermissions();

        $this->migration()->up();

        $this->assertTrue($superadmin->fresh()->can(self::PERMISSAO));
    }
}
