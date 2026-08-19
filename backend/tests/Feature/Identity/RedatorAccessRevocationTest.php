<?php

namespace Tests\Feature\Identity;

use App\Domains\Identity\Actions\UpdateRedatorAction;
use App\Domains\Identity\Data\RedatorData;
use App\Domains\Identity\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class RedatorAccessRevocationTest extends TestCase
{
    use RefreshDatabase;

    public function test_desligar_o_acesso_derruba_todas_as_sessoes(): void
    {
        $user = User::factory()->create([
            'type' => 'redator', 'email' => 'ana@lotus.cl', 'is_active' => true, 'rut' => '11.111.111-1',
        ]);
        $redator = $user->redator()->create([]);

        foreach (['sess-a', 'sess-b'] as $id) {
            DB::table('sessions')->insert([
                'id' => $id, 'user_id' => $user->id, 'ip_address' => '127.0.0.1',
                'user_agent' => 'phpunit', 'payload' => 'x', 'last_activity' => 1_755_000_000,
            ]);
        }

        app(UpdateRedatorAction::class)->execute($redator, RedatorData::from([
            'name' => 'Ana Reyes', 'rut' => $user->rut, 'email' => 'ana@lotus.cl', 'is_active' => false,
        ]));

        $this->assertFalse($user->refresh()->is_active);
        // Nenhuma sobrevive: revogar com sessão viva deixaria o redator
        // navegando até o cookie expirar.
        $this->assertSame(0, DB::table('sessions')->where('user_id', $user->id)->count());
    }

    public function test_a_omissao_de_is_active_nao_revoga(): void
    {
        $user = User::factory()->create([
            'type' => 'redator', 'email' => 'ana@lotus.cl', 'is_active' => true, 'rut' => '11.111.111-1',
        ]);
        $redator = $user->redator()->create([]);

        app(UpdateRedatorAction::class)->execute($redator, RedatorData::from([
            'name' => 'Ana Reyes', 'rut' => $user->rut, 'email' => 'ana@lotus.cl',
        ]));

        // D-13 do backlog é exatamente esta classe de defeito: omissão que
        // vira apagamento. Aqui ela custaria o acesso de quem já tinha.
        $this->assertTrue($user->refresh()->is_active);
    }
}
