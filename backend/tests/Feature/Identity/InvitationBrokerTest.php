<?php

namespace Tests\Feature\Identity;

use App\Domains\Identity\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Password;
use Tests\TestCase;

class InvitationBrokerTest extends TestCase
{
    use RefreshDatabase;

    public function test_o_broker_de_convite_escreve_na_tabela_propria(): void
    {
        $user = User::factory()->create(['type' => 'redator', 'email' => 'redator@lotus.cl']);

        $token = Password::broker('invites')->createToken($user);

        $this->assertNotEmpty($token);
        $this->assertDatabaseHas('invitation_tokens', ['email' => 'redator@lotus.cl']);
        // A tabela de recuperação NÃO é tocada: um convite pendente não pode
        // ser apagado por um pedido de "esqueci minha senha", e vice-versa.
        $this->assertDatabaseCount('password_reset_tokens', 0);
    }

    /**
     * @param  'invites'|'users'  $broker
     */
    private function statusComIdade(string $broker, string $tabela, string $email, callable $envelhecer): string
    {
        $user = User::factory()->create(['type' => 'redator', 'email' => $email]);
        $token = Password::broker($broker)->createToken($user);

        DB::table($tabela)->where('email', $email)->update(['created_at' => $envelhecer()]);

        return Password::broker($broker)->reset(
            ['email' => $email, 'password' => 'senhaNova123', 'password_confirmation' => 'senhaNova123', 'token' => $token],
            fn () => null,
        );
    }

    /**
     * As bordas de DENTRO são o que prova a separação dos dois TTLs: com
     * `expire` trocado entre os brokers, os dois casos de recusa continuariam
     * verdes e só estes reprovam. Asserir `config(...)` provaria nada — lê o
     * mesmo arquivo que o código lê e passa nos dois estados (lição 10).
     */
    public function test_convite_de_seis_dias_ainda_vale(): void
    {
        $status = $this->statusComIdade('invites', 'invitation_tokens', 'quase@lotus.cl', fn () => now()->subDays(6));

        $this->assertSame(Password::PASSWORD_RESET, $status);
    }

    public function test_token_de_recuperacao_de_cinquenta_e_nove_minutos_ainda_vale(): void
    {
        $status = $this->statusComIdade('users', 'password_reset_tokens', 'fresco@lotus.cl', fn () => now()->subMinutes(59));

        $this->assertSame(Password::PASSWORD_RESET, $status);
    }

    public function test_token_de_recuperacao_expira_em_uma_hora(): void
    {
        $status = $this->statusComIdade('users', 'password_reset_tokens', 'velho-reset@lotus.cl', fn () => now()->subMinutes(61));

        $this->assertSame(Password::INVALID_TOKEN, $status);
    }

    public function test_token_de_convite_expirado_e_recusado(): void
    {
        $status = $this->statusComIdade('invites', 'invitation_tokens', 'velho@lotus.cl', fn () => now()->subDays(8));

        $this->assertSame(Password::INVALID_TOKEN, $status);
    }
}
