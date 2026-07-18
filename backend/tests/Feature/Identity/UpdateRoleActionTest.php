<?php

namespace Tests\Feature\Identity;

use App\Domains\Identity\Actions\CreateRoleAction;
use App\Domains\Identity\Actions\UpdateRoleAction;
use App\Domains\Identity\Data\RoleData;
use App\Domains\Identity\Exceptions\ImmutableSystemRoleException;
use App\Domains\Identity\Models\Role;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class UpdateRoleActionTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);
    }

    public function test_edita_permissoes_de_role_customizada(): void
    {
        $role = app(CreateRoleAction::class)->execute(
            RoleData::from(['name' => 'coordinador', 'permissions' => ['commercial.client.view']]),
        );

        $updated = app(UpdateRoleAction::class)->execute(
            $role,
            RoleData::from(['name' => 'coordinador', 'permissions' => ['catalog.course.view']]),
        );

        $this->assertTrue($updated->hasPermissionTo('catalog.course.view'));
        $this->assertFalse($updated->hasPermissionTo('commercial.client.view'));
    }

    public function test_bloqueia_edicao_de_role_de_sistema(): void
    {
        $this->expectException(ImmutableSystemRoleException::class);
        app(UpdateRoleAction::class)->execute(
            Role::findByName('admin'),
            RoleData::from(['name' => 'admin', 'permissions' => ['catalog.course.view']]),
        );
    }

    public function test_renomeia_role_customizada(): void
    {
        $role = app(CreateRoleAction::class)->execute(
            RoleData::from(['name' => 'coordinador', 'permissions' => []]),
        );

        $updated = app(UpdateRoleAction::class)->execute(
            $role,
            RoleData::from(['name' => 'coordinador_regional', 'permissions' => []]),
        );

        $this->assertSame('coordinador_regional', $updated->name);
    }

    public function test_rejeita_colisao_de_nome_com_outra_role(): void
    {
        $coordinador = app(CreateRoleAction::class)->execute(
            RoleData::from(['name' => 'coordinador', 'permissions' => []]),
        );

        $supervisor = app(CreateRoleAction::class)->execute(
            RoleData::from(['name' => 'supervisor', 'permissions' => []]),
        );

        $this->expectException(ValidationException::class);
        app(UpdateRoleAction::class)->execute(
            $supervisor,
            RoleData::from(['name' => 'coordinador', 'permissions' => []]),
        );
    }
}
