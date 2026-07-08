<?php

namespace Tests\Feature\Identity;

use App\Domains\Identity\Exceptions\ImmutableSystemRoleException;
use App\Domains\Identity\Models\Role;
use App\Domains\Identity\Services\SystemRoleGuard;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SystemRoleImmutabilityTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);
    }

    public function test_nao_deleta_role_de_sistema(): void
    {
        $this->expectException(ImmutableSystemRoleException::class);

        Role::findByName('admin')->delete();
    }

    public function test_nao_renomeia_role_de_sistema(): void
    {
        $this->expectException(ImmutableSystemRoleException::class);

        $role = Role::findByName('admin');
        $role->name = 'admin_renomeada';
        $role->save();
    }

    public function test_deleta_role_customizada(): void
    {
        $role = Role::create(['name' => 'temporaria', 'guard_name' => 'web']);

        $role->delete();

        $this->assertDatabaseMissing('roles', ['name' => 'temporaria']);
    }

    public function test_guard_bloqueia_permissoes_de_role_de_sistema(): void
    {
        $this->expectException(ImmutableSystemRoleException::class);

        app(SystemRoleGuard::class)->assertPermissionsMutable(Role::findByName('admin'));
    }

    public function test_guard_permite_permissoes_de_role_customizada(): void
    {
        $role = Role::create(['name' => 'temporaria', 'guard_name' => 'web']);

        app(SystemRoleGuard::class)->assertPermissionsMutable($role);

        $this->assertTrue(true); // não lançou exceção
    }
}
