<?php

namespace Tests\Feature\Identity;

use App\Domains\Identity\Actions\CreateRedatorAction;
use App\Domains\Identity\Data\RedatorData;
use App\Domains\Identity\Notifications\RedatorAccessInvitation;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class RedatorInvitationDispatchTest extends TestCase
{
    use RefreshDatabase;

    public function test_cadastrar_redator_dispara_o_convite(): void
    {
        Notification::fake();
        $this->seed(RolePermissionSeeder::class);

        $redator = app(CreateRedatorAction::class)->execute(RedatorData::from([
            'name' => 'Ana Reyes', 'rut' => '11.111.111-1', 'email' => 'ana@lotus.cl', 'course_ids' => [],
        ]));

        Notification::assertSentTo($redator->user, RedatorAccessInvitation::class);
        $this->assertDatabaseHas('invitation_tokens', ['email' => 'ana@lotus.cl']);
    }

    public function test_falha_de_email_nao_desfaz_o_cadastro(): void
    {
        $this->seed(RolePermissionSeeder::class);
        Notification::shouldReceive('send')->andThrow(new \RuntimeException('SMTP caiu'));

        $redator = app(CreateRedatorAction::class)->execute(RedatorData::from([
            'name' => 'Ana Reyes', 'rut' => '11.111.111-1', 'email' => 'ana@lotus.cl', 'course_ids' => [],
        ]));

        // O cadastro sobrevive: o admin reenvia o convite pela tela (Task 8).
        $this->assertDatabaseHas('users', ['email' => 'ana@lotus.cl', 'is_active' => true]);
        $this->assertNotNull($redator->id);
    }
}
