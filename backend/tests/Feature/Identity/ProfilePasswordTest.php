<?php

namespace Tests\Feature\Identity;

use App\Domains\Identity\Actions\PurgeOtherSessionsAction;
use App\Domains\Identity\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class ProfilePasswordTest extends TestCase
{
    use RefreshDatabase;

    private function linhaDeSessao(string $id, ?int $userId): void
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

    public function test_troca_a_propria_senha(): void
    {
        $user = $this->actingAsAdmin();

        $this->putJson('/api/profile/password', [
            'current_password' => 'password',
            'password' => 'senhaNova123',
            'password_confirmation' => 'senhaNova123',
        ])->assertNoContent();

        $this->assertTrue(Hash::check('senhaNova123', $user->refresh()->password));
    }

    public function test_senha_atual_errada_reprova_nomeando_o_campo(): void
    {
        $user = $this->actingAsAdmin();

        $this->putJson('/api/profile/password', [
            'current_password' => 'nao-e-essa',
            'password' => 'senhaNova123',
            'password_confirmation' => 'senhaNova123',
        ])
            ->assertStatus(422)
            ->assertJsonPath('errors.current_password.0', fn (?string $msg) => filled($msg));

        $this->assertTrue(Hash::check('password', $user->refresh()->password));
    }

    public function test_confirmacao_divergente_reprova(): void
    {
        $this->actingAsAdmin();

        $this->putJson('/api/profile/password', [
            'current_password' => 'password',
            'password' => 'senhaNova123',
            'password_confirmation' => 'outraCoisa123',
        ])->assertStatus(422);
    }

    /** Mesma força já vigente em `UserData.php:58`. Política nova não se inventa. */
    public function test_senha_curta_reprova(): void
    {
        $this->actingAsAdmin();

        $this->putJson('/api/profile/password', [
            'current_password' => 'password',
            'password' => 'curta',
            'password_confirmation' => 'curta',
        ])->assertStatus(422);
    }

    /** Hash nunca entra em `audits`: `password` não está em `$auditInclude`. */
    public function test_a_troca_de_senha_nao_grava_hash_na_auditoria(): void
    {
        $user = $this->actingAsAdmin();

        $this->putJson('/api/profile/password', [
            'current_password' => 'password',
            'password' => 'senhaNova123',
            'password_confirmation' => 'senhaNova123',
        ])->assertNoContent();

        foreach (DB::table('audits')->where('auditable_id', $user->id)->get() as $linha) {
            $this->assertStringNotContainsString('password', (string) $linha->old_values);
            $this->assertStringNotContainsString('password', (string) $linha->new_values);
        }
    }

    /**
     * Prova 1 de 2, contra a TABELA: sobram a sessão corrente e a de terceiro.
     *
     * A ação lê `sessions` direto porque a suíte roda com
     * `SESSION_DRIVER=array` (`phpunit.xml`): sem escrever as linhas à mão, a
     * tabela ficaria vazia e o teste passaria verde sem exercitar nada —
     * cobertura fantasma.
     */
    public function test_purge_apaga_as_outras_sessoes_do_usuario_e_so_elas(): void
    {
        $user = User::factory()->create();
        $terceiro = User::factory()->create();

        $this->linhaDeSessao('corrente', $user->id);
        $this->linhaDeSessao('outra-do-mesmo', $user->id);
        $this->linhaDeSessao('mais-uma-do-mesmo', $user->id);
        $this->linhaDeSessao('de-terceiro', $terceiro->id);
        $this->linhaDeSessao('anonima', null);

        $apagadas = app(PurgeOtherSessionsAction::class)->execute($user, 'corrente');

        $this->assertSame(2, $apagadas);
        $this->assertEqualsCanonicalizing(
            ['corrente', 'de-terceiro', 'anonima'],
            DB::table('sessions')->pluck('id')->all(),
        );
    }

    /**
     * Prova 2 de 2, contra o HTTP: o controller preserva a sessão CERTA. A
     * prova 1 não sabe qual id ele passa ao purge; esta sabe.
     *
     * `config(['session.driver' => 'database'])` é obrigatório e é o ponto
     * inteiro do teste: `phpunit.xml` define `SESSION_DRIVER=array`, então sem
     * o override a tabela `sessions` fica vazia, o purge é no-op e o teste
     * passa verde sem exercitar nada. O login por HTTP é o que grava a linha
     * da sessão corrente com `user_id` preenchido — `actingAs()` não grava
     * linha nenhuma, e por isso não serve aqui.
     *
     * `withCredentials()` + replay do cookie de sessão são obrigatórios, e
     * medidos, não copiados do plano. Duas camadas, as duas comprovadas:
     * 1) `postJson`/`putJson`/`getJson` passam por `json()`, que resolve
     *    cookies por `prepareCookiesForJsonRequest()` — devolve array VAZIO a
     *    menos que `withCredentials()` esteja ligado (mimetiza
     *    `fetch(..., {credentials: 'include'})` do browser real). Sem isso,
     *    o PUT sai sem NENHUM cookie, `ALL_COOKIES=[]` medido.
     * 2) Com `withCredentials()` ligado, `prepareCookiesForRequest()`
     *    CRIPTOGRAFA sozinho o valor de `withCookie()` — ele espera o ID de
     *    sessão em texto puro, não o `Set-Cookie` já criptografado que
     *    `getCookie(..., decrypt: false)` devolveria; por isso o `getCookie()`
     *    aqui usa o decrypt padrão (`true`).
     * Sem os dois, o PUT ainda autentica (o guard `sanctum` fica cacheado no
     * container do processo de teste, mesma mecânica de
     * `test_perfil_nao_faz_n_mais_um`), mas o `StartSession` da request boota
     * uma sessão NOVA, com ID diferente do gravado no login — o purge então
     * não encontra a "sessão corrente" na tabela e apaga a linha real do
     * login junto com a de terceiro, zerando a contagem em vez de deixar 1.
     */
    public function test_a_sessao_corrente_sobrevive_e_a_do_outro_dispositivo_morre(): void
    {
        config(['session.driver' => 'database']);

        $user = User::factory()->create(['type' => 'admin', 'is_active' => true]);

        $this->withCredentials();
        $login = $this->postJson('/api/login', ['email' => $user->email, 'password' => 'password'])->assertOk();
        $sessionId = $login->getCookie(config('session.cookie'))->getValue();
        $this->withCookie(config('session.cookie'), $sessionId);

        $this->linhaDeSessao('outro-dispositivo', $user->id);

        $this->putJson('/api/profile/password', [
            'current_password' => 'password',
            'password' => 'senhaNova123',
            'password_confirmation' => 'senhaNova123',
        ])->assertNoContent();

        $this->assertDatabaseMissing('sessions', ['id' => 'outro-dispositivo']);
        $this->assertSame(1, DB::table('sessions')->where('user_id', $user->id)->count());

        // E quem trocou continua navegando.
        $this->getJson('/api/profile')->assertOk();
    }
}
