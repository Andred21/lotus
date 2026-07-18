<?php

namespace Tests\Feature\Identity;

use App\Domains\Identity\Actions\CreateRoleAction;
use App\Domains\Identity\Data\RoleData;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class CreateRoleActionTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);
    }

    public function test_cria_role_customizada_com_permissoes(): void
    {
        $role = app(CreateRoleAction::class)->execute(
            RoleData::from(['name' => 'coordinador', 'permissions' => ['commercial.client.view', 'catalog.course.view']]),
        );

        $this->assertSame('coordinador', $role->name);
        $this->assertTrue($role->hasPermissionTo('commercial.client.view'));
        $this->assertTrue($role->hasPermissionTo('catalog.course.view'));
    }

    public function test_rejeita_permissao_segregada(): void
    {
        $this->expectException(ValidationException::class);
        app(CreateRoleAction::class)->execute(
            RoleData::from(['name' => 'x', 'permissions' => ['identity.access.manage']]),
        );
    }

    public function test_rejeita_nome_duplicado(): void
    {
        $this->expectException(ValidationException::class);
        app(CreateRoleAction::class)->execute(
            RoleData::from(['name' => 'admin', 'permissions' => []]),
        );
    }
}
