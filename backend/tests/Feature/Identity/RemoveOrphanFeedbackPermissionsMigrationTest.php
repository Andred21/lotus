<?php

namespace Tests\Feature\Identity;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

/**
 * A migration é o único mecanismo que alcança banco já provisionado: o seeder
 * só corrige quem o roda. A suíte nasce com o banco limpo e com o catálogo já
 * sem as duas permissões, então a migration rodaria sobre o vazio e provaria
 * nada — por isso o teste RECRIA o estado legado (as duas linhas mais o vínculo
 * com a role `redator`) e executa `up()` diretamente sobre ele.
 */
class RemoveOrphanFeedbackPermissionsMigrationTest extends TestCase
{
    use RefreshDatabase;

    private const ORFAS = ['feedback.feedback.view', 'feedback.feedback.manage'];

    private function migration(): object
    {
        return require base_path('database/migrations/2026_08_22_000001_remove_orphan_feedback_permissions.php');
    }

    private function semearEstadoLegado(): Role
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $role = Role::firstOrCreate(['name' => 'redator', 'guard_name' => 'web']);

        foreach (self::ORFAS as $nome) {
            $permissao = Permission::firstOrCreate(['name' => $nome, 'guard_name' => 'web']);
            $role->givePermissionTo($permissao);
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();

        return $role;
    }

    public function test_up_apaga_as_duas_linhas_e_o_vinculo_da_role(): void
    {
        $role = $this->semearEstadoLegado();

        $this->assertSame(2, Permission::whereIn('name', self::ORFAS)->count());
        $this->assertSame(2, DB::table('role_has_permissions')->where('role_id', $role->id)->count());

        $this->migration()->up();
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $this->assertSame(0, Permission::whereIn('name', self::ORFAS)->count());
        $this->assertSame(0, DB::table('role_has_permissions')->where('role_id', $role->id)->count());
    }

    public function test_up_nao_toca_nenhuma_outra_permissao(): void
    {
        $this->semearEstadoLegado();
        $outra = Permission::firstOrCreate(['name' => 'operation.turma.submit_docs', 'guard_name' => 'web']);

        $antes = Permission::count();

        $this->migration()->up();
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $this->assertSame($antes - 2, Permission::count());
        $this->assertDatabaseHas('permissions', ['id' => $outra->id, 'name' => 'operation.turma.submit_docs']);
    }

    public function test_up_e_idempotente(): void
    {
        $this->semearEstadoLegado();

        $this->migration()->up();
        $this->migration()->up();
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $this->assertSame(0, Permission::whereIn('name', self::ORFAS)->count());
    }

    public function test_down_recria_as_duas_linhas_sem_vinculo(): void
    {
        $role = $this->semearEstadoLegado();

        $this->migration()->up();
        $this->migration()->down();
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $this->assertSame(2, Permission::whereIn('name', self::ORFAS)->count());
        $this->assertSame(0, DB::table('role_has_permissions')->where('role_id', $role->id)->count());
    }
}
