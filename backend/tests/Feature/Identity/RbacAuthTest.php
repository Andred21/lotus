<?php

namespace Tests\Feature\Identity;

use App\Domains\Identity\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Route;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class RbacAuthTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);
    }

    public function test_login_expoe_roles_e_permissions(): void
    {
        $user = User::factory()->redator()->create([
            'email'    => 'red@lotus.cl',
            'password' => Hash::make('senha123'),
        ]);
        $user->assignRole('redator');

        $res = $this->postJson('/api/login', [
            'email'    => 'red@lotus.cl',
            'password' => 'senha123',
        ])->assertOk()->assertJson(['roles' => ['redator']]);

        $perms = $res->json('permissions');
        $this->assertContains('operation.turma.view', $perms);
        $this->assertNotContains('identity.access.manage', $perms);
    }

    public function test_me_expoe_roles_e_permissions(): void
    {
        $user = User::factory()->create();
        $user->assignRole('admin');

        Sanctum::actingAs($user);

        $this->getJson('/api/me')
            ->assertOk()
            ->assertJson(['roles' => ['admin']]);
    }

    public function test_middleware_permission_bloqueia_sem_permissao(): void
    {
        Route::middleware('permission:identity.access.manage')
            ->get('/_test/rbac', fn () => response()->json(['ok' => true]));

        $user = User::factory()->create();
        $user->assignRole('admin'); // admin NÃO tem identity.access.manage

        $this->actingAs($user, 'web')
            ->getJson('/_test/rbac')
            ->assertForbidden();
    }

    public function test_middleware_permission_libera_com_permissao(): void
    {
        Route::middleware('permission:identity.access.manage')
            ->get('/_test/rbac', fn () => response()->json(['ok' => true]));

        $user = User::factory()->create();
        $user->assignRole('superadmin'); // superadmin TEM identity.access.manage

        $this->actingAs($user, 'web')
            ->getJson('/_test/rbac')
            ->assertOk();
    }
}
