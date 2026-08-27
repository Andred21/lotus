<?php

namespace Tests\Feature\Shared;

use App\Domains\Identity\Models\User;
use App\Shared\Alerts\AlertThresholds;
use App\Shared\Alerts\DetectorDeAcessoSuspeito;
use App\Shared\Alerts\Notifications\AcessoSuspeito;
use App\Shared\Logging\EventoDeSeguranca;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Notifications\ChannelManager;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;
use Monolog\Handler\TestHandler;
use Tests\TestCase;

/**
 * DoD 9 e 10 da spec. As três famílias são a resposta ao `RNF-SEC-07`, que
 * pede "parâmetro de identificação definido" — cada uma tem condição
 * mensurável, destino e expectativa temporal, e é isso que estes testes
 * provam.
 *
 * A expectativa temporal é "no mesmo request que cruza o limiar" (D7), porque
 * produção não tem worker de fila. O teste de resiliência é o que compra essa
 * escolha: alerta que quebra não pode derrubar a resposta.
 */
class AcessoSuspeitoTest extends TestCase
{
    use RefreshDatabase;

    private TestHandler $handler;

    protected function setUp(): void
    {
        parent::setUp();

        $this->handler = new TestHandler;
        Log::channel(EventoDeSeguranca::CANAL)->getLogger()->setHandlers([$this->handler]);

        Notification::fake();
    }

    private function admin(): User
    {
        return User::factory()->create(['type' => 'admin', 'is_active' => true]);
    }

    private function alertas(): array
    {
        return array_values(array_filter(
            array_map(fn ($r) => $r->context, $this->handler->getRecords()),
            fn (array $c) => ($c['evento'] ?? null) === 'acesso.suspeito',
        ));
    }

    public function test_login_falho_alerta_ao_cruzar_o_limiar_e_nao_antes(): void
    {
        $admin = $this->admin();
        $detector = app(DetectorDeAcessoSuspeito::class);

        for ($i = 1; $i < AlertThresholds::LOGIN_FALHO_LIMIAR; $i++) {
            $detector->loginFalho('chave-fixa', '203.0.113.9');
        }

        $this->assertCount(0, $this->alertas(), 'Abaixo do limiar não pode alertar.');

        $detector->loginFalho('chave-fixa', '203.0.113.9');

        $alertas = $this->alertas();
        $this->assertCount(1, $alertas);
        $this->assertSame('login_falho_repetido', $alertas[0]['familia']);

        Notification::assertSentTo($admin, AcessoSuspeito::class);
    }

    public function test_login_falho_alerta_uma_vez_por_janela(): void
    {
        $this->admin();
        $detector = app(DetectorDeAcessoSuspeito::class);

        for ($i = 0; $i < AlertThresholds::LOGIN_FALHO_LIMIAR + 5; $i++) {
            $detector->loginFalho('chave-fixa', '203.0.113.9');
        }

        $this->assertCount(1, $this->alertas());
    }

    public function test_chaves_diferentes_nao_se_somam(): void
    {
        $this->admin();
        $detector = app(DetectorDeAcessoSuspeito::class);

        for ($i = 0; $i < AlertThresholds::LOGIN_FALHO_LIMIAR; $i++) {
            $detector->loginFalho('chave-a', '203.0.113.9');
            $detector->loginFalho('chave-b', '203.0.113.10');
        }

        $this->assertCount(2, $this->alertas());
    }

    public function test_sessao_de_conta_desativada_alerta_na_primeira_ocorrencia(): void
    {
        $admin = $this->admin();
        $detector = app(DetectorDeAcessoSuspeito::class);

        $detector->sessaoDeContaDesativada(4242, '203.0.113.9');
        $detector->sessaoDeContaDesativada(4242, '203.0.113.9');
        $detector->sessaoDeContaDesativada(4242, '203.0.113.9');

        $alertas = $this->alertas();

        $this->assertCount(1, $alertas);
        $this->assertSame('sessao_de_conta_desativada', $alertas[0]['familia']);

        Notification::assertSentTo($admin, AcessoSuspeito::class);
    }

    public function test_403_alerta_ao_cruzar_o_limiar(): void
    {
        $this->admin();
        $detector = app(DetectorDeAcessoSuspeito::class);

        for ($i = 1; $i < AlertThresholds::ACESSO_NEGADO_LIMIAR; $i++) {
            $detector->acessoNegado(4242, '203.0.113.9');
        }

        $this->assertCount(0, $this->alertas());

        $detector->acessoNegado(4242, '203.0.113.9');

        $alertas = $this->alertas();
        $this->assertCount(1, $alertas);
        $this->assertSame('sequencia_de_403', $alertas[0]['familia']);
    }

    public function test_alerta_so_vai_para_admin_ativo(): void
    {
        $ativo = $this->admin();
        $inativo = User::factory()->create(['type' => 'admin', 'is_active' => false]);
        $redator = User::factory()->create(['type' => 'redator', 'is_active' => true]);

        app(DetectorDeAcessoSuspeito::class)->sessaoDeContaDesativada(4242, null);

        Notification::assertSentTo($ativo, AcessoSuspeito::class);
        Notification::assertNotSentTo($inativo, AcessoSuspeito::class);
        Notification::assertNotSentTo($redator, AcessoSuspeito::class);
    }

    public function test_falha_no_envio_nao_derruba_o_request(): void
    {
        $this->admin();

        // Desfaz o `Notification::fake()` e instala um canal que explode.
        Notification::swap(new class extends ChannelManager
        {
            public function __construct() {}

            public function send($notifiables, $notification)
            {
                throw new \RuntimeException('SES fora do ar');
            }
        });

        app(DetectorDeAcessoSuspeito::class)->sessaoDeContaDesativada(4242, '203.0.113.9');

        // O alerta foi registrado no log mesmo com o envio quebrado, e nenhuma
        // exceção escapou.
        $this->assertCount(1, $this->alertas());
    }

    public function test_403_real_pela_api_dispara_a_familia(): void
    {
        $this->admin();
        $this->seed(RolePermissionSeeder::class);

        $redator = User::factory()->create(['type' => 'redator', 'is_active' => true]);
        $redator->assignRole('redator');
        $this->actingAs($redator, 'web');

        for ($i = 0; $i < AlertThresholds::ACESSO_NEGADO_LIMIAR; $i++) {
            $this->getJson('/api/users')->assertStatus(403);
        }

        $this->assertCount(1, $this->alertas());
    }

    /**
     * `test_login_falho_alerta_ao_cruzar_o_limiar_e_nao_antes` acima chama o
     * detector direto — não prova que `AuthController::login()` de fato liga
     * a chamada (lição 10 do `docs/README.md`: catraca precisa reprovar sem a
     * proteção). Esta atravessa `/api/login` de verdade.
     *
     * `throttle:login` (`RateLimits::LOGIN` = 5/min por `email|ip`) impede
     * fazer as 15 tentativas de uma vez — a 6ª de cada janela tomaria 429
     * antes de chegar no controller. `$this->travel(61)->seconds()` pula pra
     * frente entre janelas, e como o `CACHE_STORE` de teste é `array`
     * (calcula expiração por `Carbon::now()`), o salto expira o balde do
     * throttle igual uma janela de verdade expiraria. As janelas de 61s são
     * bem menos que os 900s da janela do `login_falho`
     * (`AlertThresholds::LOGIN_FALHO_JANELA_SEGUNDOS`), então as 15 falhas
     * caem juntas na MESMA janela da família.
     *
     * `freezeTime()` congela o relógio ANTES do primeiro lote — sem isso, só
     * esse lote corria contra o relógio de verdade (os demais já ficam
     * congelados pelo `travel()` seguinte). E cada lote usa **4**, não 5, para
     * sobrar folga contra o teto de `RateLimits::LOGIN` — um lote exato no
     * teto não tem margem para um futuro ajuste de `RateLimits::LOGIN` ou
     * `AlertThresholds::LOGIN_FALHO_LIMIAR` sem quebrar o teste em silêncio
     * (achado do review final de 2026-08-26).
     */
    public function test_login_falho_real_pela_api_dispara_a_familia(): void
    {
        $this->freezeTime();

        $admin = $this->admin();

        $alvo = User::factory()->create([
            'type' => 'admin',
            'is_active' => true,
            'password' => Hash::make('senha-correta'),
        ]);

        $credenciaisErradas = ['email' => $alvo->email, 'password' => 'senha-errada'];

        foreach ([4, 4, 4] as $lote) {
            for ($i = 0; $i < $lote; $i++) {
                $this->postJson('/api/login', $credenciaisErradas)->assertStatus(422);
            }

            $this->travel(61)->seconds();
        }

        // 12 até aqui, abaixo do limiar de 15.
        $this->assertCount(0, $this->alertas(), 'Abaixo do limiar não pode alertar.');

        // 13ª, 14ª e 15ª desta janela — ainda dentro do teto de 5/min.
        for ($i = 0; $i < 3; $i++) {
            $this->postJson('/api/login', $credenciaisErradas)->assertStatus(422);
        }

        $alertas = $this->alertas();
        $this->assertCount(1, $alertas);
        $this->assertSame('login_falho_repetido', $alertas[0]['familia']);

        Notification::assertSentTo($admin, AcessoSuspeito::class);
    }

    /**
     * `test_sessao_de_conta_desativada_alerta_na_primeira_ocorrencia` acima
     * chama o detector direto — não prova que `EnsureAccountIsActive` de fato
     * liga a chamada. Esta espelha o round-trip real de
     * `EventosDeAcessoTest::test_sessao_de_conta_desativada_registra_evento`
     * (`GET /api/me` com conta desativada em sessão já aberta) e soma a
     * asserção do alerta.
     */
    public function test_sessao_de_conta_desativada_real_pela_api_dispara_a_familia(): void
    {
        $admin = $this->admin();

        $user = $this->actingAsAdmin();
        $user->forceFill(['is_active' => false])->save();

        $this->getJson('/api/me')->assertStatus(401);

        $alertas = $this->alertas();
        $this->assertCount(1, $alertas);
        $this->assertSame('sessao_de_conta_desativada', $alertas[0]['familia']);

        Notification::assertSentTo($admin, AcessoSuspeito::class);
    }
}
