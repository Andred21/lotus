<?php

namespace Tests\Feature\Shared;

use App\Domains\Identity\Models\User;
use App\Shared\Alerts\DetectorDeAcessoSuspeito;
use App\Shared\Logging\EventoDeSeguranca;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Log\Events\MessageLogged;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\RateLimiter;
use Monolog\Handler\AbstractProcessingHandler;
use Monolog\LogRecord;
use RuntimeException;
use Tests\TestCase;

/**
 * A catraca 5 da spec ("alerta que quebra não pode derrubar a resposta") medida
 * no caminho que mais importa: o de autenticação.
 *
 * `EventosDeAcessoTest::test_falha_ao_registrar_evento_nao_derruba_a_resposta_de_erro`
 * já prova a costura do handler global (403). Este arquivo prova os OUTROS
 * sítios de captura — `AuthController::login()`/`logout()` e o middleware
 * `EnsureAccountIsActive` —, que ficaram sem guarda até o review de 2026-08-28
 * (achado Q-1). O caso do middleware é o mais caro dos dois: lá a linha de
 * observabilidade sai ANTES de `session()->invalidate()` (ordem exigida por
 * `EventosDeAcessoTest`), então sem contenção a exceção sobe com a sessão da
 * conta desativada ainda VIVA — o oposto exato do que o middleware existe para
 * fazer.
 *
 * A contenção mora dentro do `EventoDeSeguranca` e do `DetectorDeAcessoSuspeito`,
 * não em cada chamador: por isso os cenários aqui quebram a DEPENDÊNCIA real
 * (o canal de log, o balde do limitador, o cache) e não a classe contida — um
 * duble que lança de propósito provaria a guarda do sítio, não a do componente,
 * e passaria verde com a contenção removida de dentro dele.
 */
class ObservabilidadeContidaTest extends TestCase
{
    use RefreshDatabase;

    /** Instala no canal `seguranca` um handler que explode a cada escrita. */
    private function quebrarCanalDeSeguranca(): void
    {
        Log::channel(EventoDeSeguranca::CANAL)->getLogger()->setHandlers([
            new class extends AbstractProcessingHandler
            {
                protected function write(LogRecord $record): void
                {
                    throw new RuntimeException('canal de seguranca fora do ar');
                }
            },
        ]);
    }

    /** @param list<MessageLogged> $capturado */
    private function escutarLog(array &$capturado): void
    {
        Log::listen(function (MessageLogged $registro) use (&$capturado) {
            $capturado[] = $registro;
        });
    }

    private function admin(bool $ativo = true): User
    {
        return User::factory()->create([
            'type' => 'admin',
            'is_active' => $ativo,
            'password' => Hash::make('segredo-do-teste'),
        ]);
    }

    public function test_login_com_senha_errada_continua_422_com_o_canal_quebrado(): void
    {
        $user = $this->admin();
        $capturado = [];
        $this->escutarLog($capturado);
        $this->quebrarCanalDeSeguranca();

        $this->postJson('/api/login', ['email' => $user->email, 'password' => 'errada'])
            ->assertStatus(422);

        // A contenção não pode ser silenciosa: a falha do canal `seguranca`
        // aparece no canal default, sem a mensagem crua da exceção.
        $mensagens = array_map(fn (MessageLogged $r) => $r->message, $capturado);
        $this->assertContains('Falha ao gravar evento no canal de seguranca', $mensagens);
    }

    public function test_login_de_conta_inativa_continua_422_com_o_canal_quebrado(): void
    {
        $user = $this->admin(ativo: false);
        $this->quebrarCanalDeSeguranca();

        $this->postJson('/api/login', ['email' => $user->email, 'password' => 'segredo-do-teste'])
            ->assertStatus(422);
    }

    public function test_login_valido_continua_200_com_o_canal_quebrado(): void
    {
        $user = $this->admin();
        $this->quebrarCanalDeSeguranca();

        $this->postJson('/api/login', ['email' => $user->email, 'password' => 'segredo-do-teste'])
            ->assertOk();
    }

    public function test_logout_continua_200_com_o_canal_quebrado(): void
    {
        $this->actingAs($this->admin(), 'web');
        $this->quebrarCanalDeSeguranca();

        $this->postJson('/api/logout')->assertOk();
    }

    public function test_sessao_de_conta_desativada_morre_mesmo_com_o_canal_quebrado(): void
    {
        $user = $this->admin();
        $this->actingAs($user, 'web');
        $user->forceFill(['is_active' => false])->save();

        $this->quebrarCanalDeSeguranca();

        $this->getJson('/api/me')->assertStatus(401);

        // A asserção que carrega o achado: sem contenção a exceção sobe ANTES
        // de `session()->invalidate()`/`logout()` e o guard continua populado —
        // a conta desativada seguiria autenticada até o cookie expirar.
        $this->assertGuest('web');
    }

    public function test_detector_nao_propaga_falha_do_limitador(): void
    {
        $capturado = [];
        $this->escutarLog($capturado);

        RateLimiter::swap(new class
        {
            public function hit($chave, $decaimento = 60)
            {
                throw new RuntimeException('balde do limitador fora do ar');
            }
        });

        app(DetectorDeAcessoSuspeito::class)->loginFalho('chave-fixa', '203.0.113.9');

        $this->assertContains(
            'Falha ao avaliar acesso suspeito',
            array_map(fn (MessageLogged $r) => $r->message, $capturado),
        );
    }

    public function test_detector_nao_propaga_falha_do_cache(): void
    {
        $capturado = [];
        $this->escutarLog($capturado);

        Cache::swap(new class
        {
            public function add($chave, $valor = null, $ttl = null)
            {
                throw new RuntimeException('cache fora do ar');
            }
        });

        app(DetectorDeAcessoSuspeito::class)->sessaoDeContaDesativada(4242, '203.0.113.9');

        $this->assertContains(
            'Falha ao avaliar acesso suspeito',
            array_map(fn (MessageLogged $r) => $r->message, $capturado),
        );
    }
}
