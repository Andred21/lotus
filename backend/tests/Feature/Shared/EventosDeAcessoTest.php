<?php

namespace Tests\Feature\Shared;

use App\Domains\Identity\Models\User;
use App\Shared\Logging\EventoDeSeguranca;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Monolog\Handler\AbstractProcessingHandler;
use Monolog\Handler\TestHandler;
use Monolog\LogRecord;
use Tests\TestCase;

/**
 * DoD 8 da spec. Os três pontos de captura existiam e eram SILENCIOSOS: senha
 * errada só contava no balde do throttle, sessão de conta desativada devolvia
 * 401 sem registro, e 403 saía pelo handler global sem deixar rastro.
 */
class EventosDeAcessoTest extends TestCase
{
    use RefreshDatabase;

    private TestHandler $handler;

    protected function setUp(): void
    {
        parent::setUp();

        $this->handler = new TestHandler;
        $logger = Log::channel(EventoDeSeguranca::CANAL)->getLogger();
        $logger->setHandlers([$this->handler]);

        // Processor de Monolog: roda no INSTANTE em que a linha é gravada
        // (dentro do próprio request síncrono), então carimba no registro se
        // o guard 'web' ainda estava autenticado NAQUELE momento. É o que
        // prova ordem, não só existência — se o evento saísse DEPOIS de
        // `Auth::guard('web')->logout()`/`session()->invalidate()`, o valor
        // carimbado viraria `false` e a asserção de ordem em
        // `test_logout_registra_evento` e
        // `test_sessao_de_conta_desativada_registra_evento` reprovaria.
        $logger->pushProcessor(function (LogRecord $record): LogRecord {
            $record->extra['guard_web_check_no_momento_do_log'] = Auth::guard('web')->check();

            return $record;
        });
    }

    /** @return list<array<string,mixed>> */
    private function eventos(string $evento): array
    {
        return array_values(array_filter(
            array_map(fn ($r) => $r->context, $this->handler->getRecords()),
            fn (array $contexto) => ($contexto['evento'] ?? null) === $evento,
        ));
    }

    /**
     * Prova de ORDEM, não só de existência: devolve o `Auth::guard('web')->check()`
     * carimbado pelo processor no exato instante em que o evento `$evento` foi
     * logado. `true` só é possível se o log saiu ANTES da chamada que mata a
     * sessão (`logout()`/`invalidate()`); depois dela o guard já responde `false`.
     */
    private function autenticadoNoMomentoDoEvento(string $evento): bool
    {
        $registro = null;

        foreach ($this->handler->getRecords() as $r) {
            if (($r->context['evento'] ?? null) === $evento) {
                $registro = $r;

                break;
            }
        }

        $this->assertNotNull($registro, "Nenhum registro de log encontrado para o evento [$evento].");

        return $registro->extra['guard_web_check_no_momento_do_log'];
    }

    public function test_login_bem_sucedido_registra_evento(): void
    {
        $user = User::factory()->create([
            'type' => 'admin',
            'is_active' => true,
            'password' => Hash::make('segredo-do-teste'),
        ]);

        $this->postJson('/api/login', ['email' => $user->email, 'password' => 'segredo-do-teste'])
            ->assertOk();

        $eventos = $this->eventos('login.concedido');

        $this->assertCount(1, $eventos);
        $this->assertSame($user->id, $eventos[0]['usuario_id']);
        $this->assertSame('admin', $eventos[0]['usuario_tipo']);
    }

    public function test_login_recusado_registra_evento_sem_o_email_em_claro(): void
    {
        User::factory()->create([
            'email' => 'vazamento@exemplo.cl',
            'type' => 'admin',
            'is_active' => true,
            'password' => Hash::make('segredo-do-teste'),
        ]);

        $this->postJson('/api/login', ['email' => 'vazamento@exemplo.cl', 'password' => 'errada'])
            ->assertStatus(422);

        $eventos = $this->eventos('login.recusado');

        $this->assertCount(1, $eventos);
        $this->assertArrayHasKey('chave_hash', $eventos[0]);
        $this->assertStringNotContainsString('vazamento@exemplo.cl', json_encode($eventos[0]));
    }

    public function test_logout_registra_evento(): void
    {
        $user = $this->actingAsAdmin();

        $this->postJson('/api/logout')->assertOk();

        $eventos = $this->eventos('login.encerrado');

        $this->assertCount(1, $eventos);
        $this->assertSame($user->id, $eventos[0]['usuario_id']);

        // Ordem, não só existência: o evento tem que sair ANTES de
        // `Auth::guard('web')->logout()` em `AuthController::logout()` — se um
        // refactor futuro inverter a ordem, o guard já estaria deslogado no
        // instante do log e isto vira `false`.
        $this->assertTrue(
            $this->autenticadoNoMomentoDoEvento('login.encerrado'),
            'login.encerrado precisa ser registrado ANTES de Auth::guard(\'web\')->logout() em AuthController::logout().',
        );
    }

    public function test_sessao_de_conta_desativada_registra_evento(): void
    {
        $user = $this->actingAsAdmin();
        $user->forceFill(['is_active' => false])->save();

        $this->getJson('/api/me')->assertStatus(401);

        $eventos = $this->eventos('sessao.revogada');

        $this->assertCount(1, $eventos);
        $this->assertSame($user->id, $eventos[0]['usuario_id']);

        // Ordem, não só existência: o evento tem que sair ANTES de
        // `session()->invalidate()`/`Auth::guard('web')->logout()` em
        // `EnsureAccountIsActive::handle()` — se um refactor futuro inverter a
        // ordem, o guard já estaria deslogado no instante do log e isto vira
        // `false`.
        $this->assertTrue(
            $this->autenticadoNoMomentoDoEvento('sessao.revogada'),
            'sessao.revogada precisa ser registrado ANTES de session()->invalidate()/Auth::guard(\'web\')->logout() em EnsureAccountIsActive::handle().',
        );
    }

    public function test_403_registra_evento_com_a_rota(): void
    {
        $this->seed(RolePermissionSeeder::class);

        $user = User::factory()->create(['type' => 'redator', 'is_active' => true]);
        $user->assignRole('redator');
        $this->actingAs($user, 'web');

        // Rota de administração de usuários: o redator não tem a permissão.
        $this->getJson('/api/users')->assertStatus(403);

        $eventos = $this->eventos('acesso.negado');

        $this->assertCount(1, $eventos);
        $this->assertSame($user->id, $eventos[0]['usuario_id']);
        $this->assertSame('api/users', $eventos[0]['rota']);
    }

    /**
     * `RegistraEventoDeErro::handle()` roda dentro do `render()` global,
     * ANTES de `ProblemDetails::fromException()` (`bootstrap/app.php:114`) —
     * sem proteção, um canal de log quebrado converteria a resposta 403 que
     * o cliente devia receber numa exceção não tratada no meio do próprio
     * handler de erro. Achado do review final de 2026-08-26; mesma catraca 5
     * da spec que já protegia só o envio de e-mail do alerta.
     */
    public function test_falha_ao_registrar_evento_nao_derruba_a_resposta_de_erro(): void
    {
        $this->seed(RolePermissionSeeder::class);

        $user = User::factory()->create(['type' => 'redator', 'is_active' => true]);
        $user->assignRole('redator');
        $this->actingAs($user, 'web');

        Log::channel(EventoDeSeguranca::CANAL)->getLogger()->setHandlers([
            new class extends AbstractProcessingHandler
            {
                protected function write(LogRecord $record): void
                {
                    throw new \RuntimeException('canal de seguranca fora do ar');
                }
            },
        ]);

        $this->getJson('/api/users')
            ->assertStatus(403)
            ->assertJsonStructure(['type', 'title', 'status', 'detail']);
    }

    public function test_429_registra_evento(): void
    {
        User::factory()->create([
            'email' => 'alvo@exemplo.cl',
            'type' => 'admin',
            'is_active' => true,
            'password' => Hash::make('segredo-do-teste'),
        ]);

        // O limitador `login` é 5/min por `email|ip`; a sexta tentativa estoura.
        for ($i = 0; $i < 6; $i++) {
            $resposta = $this->postJson('/api/login', ['email' => 'alvo@exemplo.cl', 'password' => 'errada']);
        }

        $resposta->assertStatus(429);

        $this->assertCount(1, $this->eventos('taxa.excedida'));
    }
}
