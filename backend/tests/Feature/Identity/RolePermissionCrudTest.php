<?php

namespace Tests\Feature\Identity;

use App\Domains\Identity\Models\Role;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RolePermissionCrudTest extends TestCase
{
    use RefreshDatabase;

    public function test_superadmin_cria_role_customizada(): void
    {
        $this->actingAsSuperadmin();

        $this->postJson('/api/roles', [
            'name' => 'coordinador',
            'permissions' => ['commercial.client.view', 'catalog.course.view'],
        ])->assertCreated()
            ->assertJsonPath('name', 'coordinador')
            ->assertJsonPath('is_system', false)
            ->assertJsonCount(2, 'permissions');
    }

    public function test_rejeita_permissao_segregada(): void
    {
        $this->actingAsSuperadmin();

        $this->postJson('/api/roles', [
            'name' => 'x', 'permissions' => ['identity.access.manage'],
        ])->assertStatus(422);
    }

    public function test_rejeita_nome_de_sistema(): void
    {
        $this->actingAsSuperadmin();

        $this->postJson('/api/roles', ['name' => 'admin', 'permissions' => []])
            ->assertStatus(422);
    }

    public function test_edita_role_customizada(): void
    {
        $this->actingAsSuperadmin();
        $role = Role::create(['name' => 'coordinador', 'guard_name' => 'web']);

        $this->putJson("/api/roles/{$role->id}", [
            'name' => 'coordinador', 'permissions' => ['catalog.course.view'],
        ])->assertOk()->assertJsonCount(1, 'permissions');
    }

    public function test_editar_role_de_sistema_e_403(): void
    {
        $this->actingAsSuperadmin();
        $admin = Role::findByName('admin');

        $this->putJson("/api/roles/{$admin->id}", [
            'name' => 'admin', 'permissions' => ['catalog.course.view'],
        ])->assertStatus(403);
    }

    public function test_admin_comum_nao_ve_catalogo_de_permissoes(): void
    {
        $this->actingAsAdmin();

        $this->getJson('/api/permissions')->assertForbidden();
    }

    public function test_superadmin_ve_catalogo_de_permissoes(): void
    {
        $this->actingAsSuperadmin();

        $this->getJson('/api/permissions')->assertOk()
            ->assertJsonFragment(['name' => 'identity.access.manage', 'segregated' => true]);
    }

    public function test_role_customizada_e_atribuivel_a_staff(): void
    {
        $this->actingAsSuperadmin();
        Role::create(['name' => 'coordinador', 'guard_name' => 'web']);

        $this->postJson('/api/users', [
            'name' => 'Coord', 'email' => 'coord@lotus.cl',
            'password' => 'secret123', 'role' => 'coordinador', 'is_active' => true,
        ])->assertCreated()->assertJsonPath('role', 'coordinador');
    }

    public function test_admin_comum_nao_lista_roles_com_permissoes(): void
    {
        $this->actingAsAdmin();

        $this->getJson('/api/roles')->assertForbidden();
    }

    public function test_admin_comum_lista_roles_atribuiveis_sem_permissoes(): void
    {
        $this->actingAsAdmin();

        $response = $this->getJson('/api/roles/assignable')->assertOk();

        $admin = collect($response->json())->firstWhere('name', 'admin');

        $this->assertNotNull($admin, 'A role admin não veio na lista de atribuíveis.');
        $this->assertArrayHasKey('id', $admin);
        $this->assertArrayNotHasKey('permissions', $admin, 'O lookup de roles não pode enumerar permissão.');
        $this->assertArrayNotHasKey('is_system', $admin);
    }

    public function test_superadmin_segue_listando_roles_com_permissoes(): void
    {
        $this->actingAsSuperadmin();

        $response = $this->getJson('/api/roles')->assertOk();

        $admin = collect($response->json())->firstWhere('name', 'admin');

        $this->assertTrue($admin['is_system']);
        $this->assertNotEmpty($admin['permissions']);
    }
}
