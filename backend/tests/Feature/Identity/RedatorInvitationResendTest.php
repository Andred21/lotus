<?php

namespace Tests\Feature\Identity;

use App\Domains\Identity\Models\Redator;
use App\Domains\Identity\Models\User;
use App\Domains\Identity\Notifications\RedatorAccessInvitation;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class RedatorInvitationResendTest extends TestCase
{
    use RefreshDatabase;

    private function redator(): Redator
    {
        $user = User::factory()->create(['type' => 'redator', 'email' => 'ana@lotus.cl', 'is_active' => true]);

        return $user->redator()->create([]);
    }

    public function test_admin_reenvia_o_convite(): void
    {
        Notification::fake();
        $this->actingAsAdmin();
        $redator = $this->redator();

        $this->postJson("/api/redatores/{$redator->id}/invitation")->assertNoContent();

        Notification::assertSentTo($redator->user, RedatorAccessInvitation::class);
    }

    public function test_sem_permissao_o_reenvio_e_recusado(): void
    {
        Notification::fake();
        $user = User::factory()->create(['type' => 'admin', 'is_active' => true]);
        $this->actingAs($user, 'web');
        $redator = $this->redator();

        $this->postJson("/api/redatores/{$redator->id}/invitation")->assertStatus(403);

        Notification::assertNothingSent();
    }
}
