<?php

namespace Tests\Feature\Identity;

use App\Domains\Identity\Models\User;
use App\Domains\Identity\Services\SuperadminGuard;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class SuperadminGuardTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);
    }

    public function test_bloqueia_ultimo_superadmin_ativo(): void
    {
        $sa = User::factory()->create();
        $sa->assignRole('superadmin');

        $this->expectException(ValidationException::class);
        app(SuperadminGuard::class)->assertNotLastActiveSuperadmin($sa);
    }

    public function test_permite_quando_existe_outro_superadmin_ativo(): void
    {
        $sa1 = User::factory()->create();
        $sa1->assignRole('superadmin');
        $sa2 = User::factory()->create();
        $sa2->assignRole('superadmin');

        app(SuperadminGuard::class)->assertNotLastActiveSuperadmin($sa1);

        $this->assertTrue(true); // não lançou
    }

    public function test_ignora_alvo_que_nao_e_superadmin(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('admin');

        app(SuperadminGuard::class)->assertNotLastActiveSuperadmin($admin);

        $this->assertTrue(true); // não lançou
    }
}
