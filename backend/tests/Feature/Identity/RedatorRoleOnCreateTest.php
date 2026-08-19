<?php

namespace Tests\Feature\Identity;

use App\Domains\Identity\Actions\CreateRedatorAction;
use App\Domains\Identity\Data\RedatorData;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RedatorRoleOnCreateTest extends TestCase
{
    use RefreshDatabase;

    public function test_o_cadastro_atribui_a_role_redator(): void
    {
        $this->seed(RolePermissionSeeder::class);

        $redator = app(CreateRedatorAction::class)->execute(RedatorData::from([
            'name' => 'Ana Reyes',
            'rut' => '11.111.111-1',
            'email' => 'ana@lotus.cl',
            'course_ids' => [],
        ]));

        $user = $redator->user->refresh();

        $this->assertTrue($user->hasRole('redator'));
        // RF-ROL-05: a role vem do tipo, e as permissões dela são as do seeder.
        $this->assertTrue($user->can('operation.turma.view'));
        $this->assertFalse($user->can('identity.user.create'));
    }
}
