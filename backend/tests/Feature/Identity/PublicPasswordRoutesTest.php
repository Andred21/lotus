<?php

namespace Tests\Feature\Identity;

use App\Domains\Identity\Models\User;
use App\Domains\Identity\Notifications\PasswordResetLink;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;
use Tests\TestCase;

class PublicPasswordRoutesTest extends TestCase
{
    use RefreshDatabase;

    public function test_forgot_responde_igual_para_email_existente_e_inexistente(): void
    {
        Notification::fake();
        $user = User::factory()->create(['email' => 'existe@lotus.cl', 'is_active' => true]);

        $comConta = $this->postJson('/api/password/forgot', ['email' => 'existe@lotus.cl']);
        $semConta = $this->postJson('/api/password/forgot', ['email' => 'ninguem@lotus.cl']);

        // Resposta idêntica: a rota é pública e não pode virar enumerador.
        $this->assertSame($comConta->status(), $semConta->status());
        $this->assertSame($comConta->json(), $semConta->json());
        // Resposta igual não pode virar "não faz nada nos dois casos": quem
        // tem conta recebe o link, e é o silêncio da resposta que é genérico.
        Notification::assertSentTo($user, PasswordResetLink::class);
        Notification::assertSentTimes(PasswordResetLink::class, 1);
    }

    public function test_aceitar_o_convite_define_a_senha(): void
    {
        $user = User::factory()->create(['type' => 'redator', 'email' => 'ana@lotus.cl', 'is_active' => true]);
        $token = Password::broker('invites')->createToken($user);

        $this->postJson('/api/invitation/accept', [
            'token' => $token,
            'email' => 'ana@lotus.cl',
            'password' => 'senhaNova123',
            'password_confirmation' => 'senhaNova123',
        ])->assertNoContent();

        $this->assertTrue(Hash::check('senhaNova123', $user->refresh()->password));
        $this->assertDatabaseCount('invitation_tokens', 0);
    }

    public function test_token_invalido_sobe_422_pelo_envelope(): void
    {
        User::factory()->create(['email' => 'ana@lotus.cl']);

        $this->postJson('/api/password/reset', [
            'token' => 'nao-e-token',
            'email' => 'ana@lotus.cl',
            'password' => 'senhaNova123',
            'password_confirmation' => 'senhaNova123',
        ])
            ->assertStatus(422)
            ->assertJsonPath('errors.token.0', fn (?string $msg) => filled($msg));
    }

    public function test_o_token_de_convite_nao_serve_na_rota_de_recuperacao(): void
    {
        $user = User::factory()->create(['email' => 'ana@lotus.cl']);
        $token = Password::broker('invites')->createToken($user);

        // Cada fluxo tem sua tabela: usar o token do outro é token inválido,
        // e é isso que impede o convite de 7 dias de virar reset de 7 dias.
        $this->postJson('/api/password/reset', [
            'token' => $token, 'email' => 'ana@lotus.cl',
            'password' => 'senhaNova123', 'password_confirmation' => 'senhaNova123',
        ])->assertStatus(422);
    }

    public function test_a_rota_publica_tem_throttle(): void
    {
        for ($i = 0; $i < 7; $i++) {
            $response = $this->postJson('/api/password/forgot', ['email' => 'existe@lotus.cl']);
        }

        $response->assertStatus(429);
    }
}
