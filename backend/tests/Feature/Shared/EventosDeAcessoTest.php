<?php

namespace Tests\Feature\Shared;

use App\Domains\Identity\Models\User;
use App\Shared\Logging\EventoDeSeguranca;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Monolog\Handler\TestHandler;
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
        Log::channel(EventoDeSeguranca::CANAL)->getLogger()->setHandlers([$this->handler]);
    }

    /** @return list<array<string,mixed>> */
    private function eventos(string $evento): array
    {
        return array_values(array_filter(
            array_map(fn ($r) => $r->context, $this->handler->getRecords()),
            fn (array $contexto) => ($contexto['evento'] ?? null) === $evento,
        ));
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
    }

    public function test_sessao_de_conta_desativada_registra_evento(): void
    {
        $user = $this->actingAsAdmin();
        $user->forceFill(['is_active' => false])->save();

        $this->getJson('/api/me')->assertStatus(401);

        $eventos = $this->eventos('sessao.revogada');

        $this->assertCount(1, $eventos);
        $this->assertSame($user->id, $eventos[0]['usuario_id']);
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
