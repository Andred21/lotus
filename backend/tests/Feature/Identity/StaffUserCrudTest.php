<?php

namespace Tests\Feature\Identity;

use App\Domains\Identity\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class StaffUserCrudTest extends TestCase
{
    use RefreshDatabase;

    public function test_index_lista_so_staff_type_admin(): void
    {
        $this->actingAsSuperadmin();
        $redator = User::factory()->redator()->create();
        $redator->redator()->create([]);

        $response = $this->getJson('/api/users')->assertOk();

        $types = collect($response->json())->pluck('type')->unique()->all();
        $this->assertSame(['admin'], $types);
    }

    public function test_superadmin_cria_staff_e_ele_loga(): void
    {
        $this->actingAsSuperadmin();

        $this->postJson('/api/users', [
            'name' => 'Nuevo Admin', 'email' => 'nuevo@lotus.cl',
            'password' => 'secret123', 'role' => 'admin', 'is_active' => true,
        ])->assertCreated()->assertJsonPath('type', 'admin')->assertJsonPath('role', 'admin');

        $this->assertDatabaseHas('users', ['email' => 'nuevo@lotus.cl', 'type' => 'admin', 'is_active' => 1]);

        // prova e2e: o staff recém-criado autentica com a senha definida
        $this->postJson('/api/login', ['email' => 'nuevo@lotus.cl', 'password' => 'secret123'])
            ->assertOk()->assertJsonPath('email', 'nuevo@lotus.cl');
    }

    public function test_update_sem_senha_preserva_login(): void
    {
        $this->actingAsSuperadmin();
        $target = User::factory()->create([
            'email' => 'keep@lotus.cl',
            'password' => Hash::make('mantida1'),
        ]);
        $target->assignRole('admin');

        $this->putJson("/api/users/{$target->id}", [
            'name' => 'Editado', 'email' => 'keep@lotus.cl', 'role' => 'admin', 'is_active' => true,
        ])->assertOk();

        $this->postJson('/api/login', ['email' => 'keep@lotus.cl', 'password' => 'mantida1'])->assertOk();
    }

    public function test_admin_comum_ve_lista_mas_nao_escreve(): void
    {
        $this->actingAsAdmin();

        $this->getJson('/api/users')->assertOk();
        $this->postJson('/api/users', [
            'name' => 'X', 'email' => 'x@lotus.cl', 'password' => 'secret123', 'role' => 'admin',
        ])->assertForbidden();
    }

    public function test_deletar_ultimo_superadmin_e_422(): void
    {
        $sa = $this->actingAsSuperadmin(); // é o único superadmin

        $this->deleteJson("/api/users/{$sa->id}")->assertStatus(422);
    }

    public function test_get_roles_lista_com_flag_de_sistema(): void
    {
        $this->actingAsAdmin();

        $response = $this->getJson('/api/roles')->assertOk();

        $admin = collect($response->json())->firstWhere('name', 'admin');
        $this->assertTrue($admin['is_system']);
    }
}
