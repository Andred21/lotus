<?php

namespace Tests\Feature\Identity;

use App\Domains\Identity\Data\SessionUserData;
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

    /**
     * O DoD do bloco é "reenviar convite para um redator pré-existente DÁ
     * ACESSO a ele", não "manda e-mail". O redator cadastrado antes deste
     * bloco nasceu sem a role — ela só era atribuída em CreateRedatorAction —
     * e o que a interface gateia é permissão, não `type`: sem isto ele define
     * a senha, autentica e recebe uma sessão com `roles: []`/`permissions: []`.
     */
    public function test_o_reenvio_da_a_role_ao_redator_legado(): void
    {
        Notification::fake();
        $this->actingAsAdmin();
        $redator = $this->redator();

        // O estado do legado: existe, é do tipo redator, e não tem role.
        $this->assertFalse($redator->user->hasRole('redator'));

        $this->postJson("/api/redatores/{$redator->id}/invitation")->assertNoContent();

        $sessao = SessionUserData::fromUser($redator->user->fresh());

        $this->assertSame(['redator'], $sessao->roles);
        $this->assertContains('operation.turma.submit_docs', $sessao->permissions);
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
