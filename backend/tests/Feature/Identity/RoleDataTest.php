<?php

namespace Tests\Feature\Identity;

use App\Domains\Identity\Data\RoleData;
use App\Domains\Identity\Models\Role;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RoleDataTest extends TestCase
{
    use RefreshDatabase;

    public function test_from_model_projeta_permissoes_e_flag_de_sistema(): void
    {
        $this->seed(RolePermissionSeeder::class);

        $data = RoleData::fromModel(Role::findByName('admin')->load('permissions'));

        $this->assertSame('admin', $data->name);
        $this->assertTrue($data->is_system);
        $this->assertContains('commercial.client.view', $data->permissions);
        $this->assertNotContains('identity.access.manage', $data->permissions); // admin não tem
    }
}
