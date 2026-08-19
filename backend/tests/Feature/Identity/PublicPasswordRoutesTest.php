<?php

namespace Tests\Feature\Identity;

use App\Domains\Identity\Models\User;
use App\Domains\Identity\Notifications\PasswordResetLink;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;
use Tests\TestCase;

class PublicPasswordRoutesTest extends TestCase
{
    use RefreshDatabase;

    private function linhaDeSessao(string $id, int $userId): void
    {
        DB::table('sessions')->insert([
            'id' => $id,
            'user_id' => $userId,
            'ip_address' => '127.0.0.1',
            'user_agent' => 'phpunit',
            'payload' => 'x',
            'last_activity' => 1_755_000_000,
        ]);
    }

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

    /**
     * RN-01: cliente e aluno não autenticam e nascem `is_active=false`. Sem o
     * filtro do broker, esta rota ANÔNIMA dispara "defina sua senha" para o
     * contato comercial de um cliente — que definiria a senha e seria
     * recusado no login.
     */
    public function test_forgot_nao_manda_link_para_quem_nao_autentica(): void
    {
        Notification::fake();
        User::factory()->create(['type' => 'cliente', 'email' => 'contato@empresa.cl', 'is_active' => false]);
        $ativo = User::factory()->create(['type' => 'redator', 'email' => 'ana@lotus.cl', 'is_active' => true]);

        $this->postJson('/api/password/forgot', ['email' => 'contato@empresa.cl'])->assertOk();
        $this->postJson('/api/password/forgot', ['email' => 'ana@lotus.cl'])->assertOk();

        // Uma só: a do redator. O cliente existe em `users` com e-mail real e
        // é justamente por isso que o teste precisa dele em cena.
        Notification::assertSentTo($ativo, PasswordResetLink::class);
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

    /**
     * O corpo do 422 não pode distinguir "e-mail sem conta" de "token errado":
     * `PasswordBroker::validateReset` resolve o usuário ANTES de checar o
     * token, então mensagens distintas fariam de QUALQUER token inventado um
     * oráculo de enumeração — o mesmo que a spec §5 fecha no `forgot`.
     */
    public function test_o_reset_responde_igual_para_email_com_e_sem_conta(): void
    {
        User::factory()->create(['email' => 'existe@lotus.cl']);

        $payload = [
            'token' => 'nao-e-token',
            'password' => 'senhaNova123',
            'password_confirmation' => 'senhaNova123',
        ];

        $comConta = $this->postJson('/api/password/reset', $payload + ['email' => 'existe@lotus.cl']);
        $semConta = $this->postJson('/api/password/reset', $payload + ['email' => 'ninguem@lotus.cl']);

        $this->assertSame($comConta->status(), $semConta->status());
        $this->assertSame($comConta->json(), $semConta->json());
    }

    /**
     * Trocar a senha e deixar a sessão antiga viva anula o motivo de
     * recuperar: `auth:sanctum` não reconsulta senha nem `is_active` a cada
     * request, então só o purge derruba quem já está dentro.
     *
     * A suíte roda com `SESSION_DRIVER=array` (`phpunit.xml`): sem escrever as
     * linhas à mão a tabela fica vazia, o purge é no-op e o teste passaria
     * verde sem exercitar nada.
     */
    public function test_recuperar_a_senha_encerra_as_sessoes_vivas(): void
    {
        $user = User::factory()->create(['email' => 'ana@lotus.cl', 'is_active' => true]);
        $terceiro = User::factory()->create(['email' => 'outro@lotus.cl', 'is_active' => true]);
        $token = Password::broker('users')->createToken($user);

        $this->linhaDeSessao('sessao-do-invasor', $user->id);
        $this->linhaDeSessao('de-terceiro', $terceiro->id);

        $this->postJson('/api/password/reset', [
            'token' => $token,
            'email' => 'ana@lotus.cl',
            'password' => 'senhaNova123',
            'password_confirmation' => 'senhaNova123',
        ])->assertNoContent();

        $this->assertDatabaseMissing('sessions', ['id' => 'sessao-do-invasor']);
        $this->assertDatabaseHas('sessions', ['id' => 'de-terceiro']);
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
