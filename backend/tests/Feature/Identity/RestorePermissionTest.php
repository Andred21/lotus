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

    /** As duas do molde (Client e Course). */
    private const MOLDE = [
        'commercial.client.restore',
        'catalog.course.restore',
    ];

    /** As cinco que este bloco cria. As duas do molde ficam nas listas acima. */
    private const NOVAS = [
        'commercial.budget.restore',
        'commercial.quote.restore',
        'identity.user.restore',
        'operation.turma.restore',
        'operation.enrollment.restore',
    ];

    public function test_catalogo_expoe_as_permissoes_de_restore(): void
    {
        $nomes = array_keys(PermissionCatalog::descriptions());

        foreach (self::MOLDE as $permissao) {
            $this->assertContains($permissao, $nomes, "catálogo sem $permissao");
        }
    }

    public function test_admin_e_superadmin_recebem_restore(): void
    {
        $this->seed(RolePermissionSeeder::class);

        foreach (['admin', 'superadmin'] as $nome) {
            $role = Role::findByName($nome, 'web');
            foreach (self::MOLDE as $permissao) {
                $this->assertTrue($role->hasPermissionTo($permissao), "$nome sem $permissao");
            }
        }
    }

    public function test_restore_nao_e_segregada(): void
    {
        // Segregar tiraria o restore do admin e o prenderia ao superadmin. A
        // decisão do João foi o contrário: admin restaura (spec D6).
        foreach (self::MOLDE as $permissao) {
            $this->assertNotContains($permissao, PermissionCatalog::SEGREGATED);
        }
    }

    public function test_redator_nao_recebe_restore(): void
    {
        $this->seed(RolePermissionSeeder::class);

        $role = Role::findByName('redator', 'web');
        foreach (self::MOLDE as $permissao) {
            $this->assertFalse($role->hasPermissionTo($permissao), "redator com $permissao");
        }
    }

    public function test_catalogo_expoe_as_cinco_permissoes_novas_de_restore(): void
    {
        $nomes = array_keys(PermissionCatalog::descriptions());

        foreach (self::NOVAS as $permissao) {
            $this->assertContains($permissao, $nomes, "catálogo sem $permissao");
        }
    }

    public function test_admin_e_superadmin_recebem_as_cinco(): void
    {
        $this->seed(RolePermissionSeeder::class);

        foreach (['admin', 'superadmin'] as $nome) {
            $role = Role::findByName($nome, 'web');
            foreach (self::NOVAS as $permissao) {
                $this->assertTrue($role->hasPermissionTo($permissao), "$nome sem $permissao");
            }
        }
    }

    public function test_nenhuma_das_cinco_e_segregada(): void
    {
        // Segregar prenderia o restore ao superadmin. A decisão foi o contrário
        // (D7): admin restaura. `identity.access.manage` continua segregada e é
        // ela quem guarda o restore do USUÁRIO staff — sem permissão nova.
        foreach (self::NOVAS as $permissao) {
            $this->assertNotContains($permissao, PermissionCatalog::SEGREGATED);
        }
    }

    public function test_nao_existe_permissao_de_restore_de_usuario_staff(): void
    {
        // D7: `identity.user.restore` cobre o REDATOR. O staff continua sob
        // `identity.access.manage`, senão restaurar ficaria mais frouxo que
        // arquivar — alguém devolveria um usuário que nunca poderia ter
        // arquivado.
        $this->assertNotContains('identity.access.restore', array_keys(PermissionCatalog::descriptions()));
    }

    public function test_redator_nao_recebe_nenhuma_das_cinco(): void
    {
        $this->seed(RolePermissionSeeder::class);

        $role = Role::findByName('redator', 'web');
        foreach (self::NOVAS as $permissao) {
            $this->assertFalse($role->hasPermissionTo($permissao), "redator com $permissao");
        }
    }
}
