<?php

namespace Tests\Feature\Identity;

use App\Domains\Identity\Data\UserData;
use App\Domains\Identity\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StaffUserActionTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);
    }

    public function test_from_model_projeta_roles_e_type(): void
    {
        $user = User::factory()->create(['type' => 'admin', 'is_active' => true]);
        $user->assignRole('admin');

        $data = UserData::fromModel($user->load('roles'));

        $this->assertSame('admin', $data->type);
        $this->assertSame('admin', $data->role);
        $this->assertContains('admin', $data->roles);
    }
}
