<?php

namespace Tests\Feature\Identity;

use App\Domains\Identity\Models\LoginLog;
use App\Domains\Identity\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

/**
 * A captura de login. Três casos de porta (grava / não grava) e um de
 * não-efeito colateral.
 *
 * O caso do usuário INATIVO é o que discrimina a ORDEM: o gate de `is_active`
 * roda depois do `attempt()`, então uma captura anterior a ele gravaria acesso
 * concedido a quem a API recusou com 422 — e nada reclamaria, porque a linha é
 * um insert válido.
 */
class LoginLogTest extends TestCase
{
    use RefreshDatabase;

    private function makeUser(bool $active = true): User
    {
        $factory = $active ? User::factory() : User::factory()->inactive();

        return $factory->create([
            'email' => 'admin@lotus.cl',
            'password' => Hash::make('senha123'),
            'type' => 'admin',
        ]);
    }

    public function test_login_ok_grava_uma_linha_com_ip_e_user_agent(): void
    {
        $user = $this->makeUser();

        $this->withHeaders(['User-Agent' => 'SondaAgent/1.0'])
            ->postJson('/api/login', ['email' => 'admin@lotus.cl', 'password' => 'senha123'])
            ->assertOk();

        $this->assertSame(1, LoginLog::count());

        $log = LoginLog::first();
        $this->assertSame($user->id, $log->user_id);
        $this->assertSame('SondaAgent/1.0', $log->user_agent);
        $this->assertNotNull($log->ip_address);
        $this->assertNotNull($log->created_at);
    }

    public function test_login_ok_nao_toca_o_usuario_nem_a_auditoria(): void
    {
        $user = $this->makeUser();
        $updatedAntes = $user->updated_at;
        $auditsAntes = DB::table('audits')->count();

        $this->postJson('/api/login', ['email' => 'admin@lotus.cl', 'password' => 'senha123'])
            ->assertOk();

        // O bloco PROMETE não escrever em `users` no login. Isso se afirma,
        // não se presume de "não escrevi lá": foi exatamente a escrita nesta
        // linha que o desenho anterior tinha, e ela produzia audit de diff
        // vazio a cada login.
        $this->assertEquals($updatedAntes, $user->fresh()->updated_at);
        $this->assertSame($auditsAntes, DB::table('audits')->count());
    }

    public function test_usuario_inativo_nao_grava_login(): void
    {
        $this->makeUser(active: false);

        $this->postJson('/api/login', ['email' => 'admin@lotus.cl', 'password' => 'senha123'])
            ->assertStatus(422);

        $this->assertSame(0, LoginLog::count());
    }

    public function test_senha_errada_nao_grava_login(): void
    {
        $this->makeUser();

        $this->postJson('/api/login', ['email' => 'admin@lotus.cl', 'password' => 'errada'])
            ->assertStatus(422);

        $this->assertSame(0, LoginLog::count());
    }
}
