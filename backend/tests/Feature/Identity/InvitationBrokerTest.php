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

    public function test_convite_vale_sete_dias_e_recuperacao_uma_hora(): void
    {
        $this->assertSame(10080, config('auth.passwords.invites.expire'));
        $this->assertSame(60, config('auth.passwords.users.expire'));
        $this->assertSame('invitation_tokens', config('auth.passwords.invites.table'));
    }

    public function test_token_de_convite_expirado_e_recusado(): void
    {
        $user = User::factory()->create(['type' => 'redator', 'email' => 'velho@lotus.cl']);
        $token = Password::broker('invites')->createToken($user);

        DB::table('invitation_tokens')
            ->where('email', 'velho@lotus.cl')
            ->update(['created_at' => now()->subDays(8)]);

        $status = Password::broker('invites')->reset(
            ['email' => 'velho@lotus.cl', 'password' => 'senhaNova123', 'password_confirmation' => 'senhaNova123', 'token' => $token],
            fn () => null,
        );

        $this->assertSame(Password::INVALID_TOKEN, $status);
    }
}
