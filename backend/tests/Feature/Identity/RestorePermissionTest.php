<?php

namespace Tests\Feature\Identity;

use App\Domains\Identity\Support\PermissionCatalog;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class RestorePermissionTest extends TestCase
{
    use RefreshDatabase;

    public function test_catalogo_expoe_as_permissoes_de_restore(): void
    {
        $nomes = array_keys(PermissionCatalog::descriptions());

        $this->assertContains('commercial.client.restore', $nomes);
        $this->assertContains('catalog.course.restore', $nomes);
    }

    public function test_admin_e_superadmin_recebem_restore(): void
    {
        $this->seed(RolePermissionSeeder::class);

        foreach (['admin', 'superadmin'] as $nome) {
            $role = Role::findByName($nome, 'web');
            $this->assertTrue($role->hasPermissionTo('commercial.client.restore'), "$nome sem client.restore");
            $this->assertTrue($role->hasPermissionTo('catalog.course.restore'), "$nome sem course.restore");
        }
    }

    public function test_restore_nao_e_segregada(): void
    {
        // Segregar tiraria o restore do admin e o prenderia ao superadmin. A
        // decisão do João foi o contrário: admin restaura (spec D6).
        $this->assertNotContains('commercial.client.restore', PermissionCatalog::SEGREGATED);
        $this->assertNotContains('catalog.course.restore', PermissionCatalog::SEGREGATED);
    }

    public function test_redator_nao_recebe_restore(): void
    {
        $this->seed(RolePermissionSeeder::class);

        $role = Role::findByName('redator', 'web');
        $this->assertFalse($role->hasPermissionTo('commercial.client.restore'));
        $this->assertFalse($role->hasPermissionTo('catalog.course.restore'));
    }
}
