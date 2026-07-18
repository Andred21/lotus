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

    public function test_catalogo_de_permissoes_so_para_superadmin(): void
    {
        $this->actingAsAdmin();
        $this->getJson('/api/permissions')->assertForbidden();

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
}
