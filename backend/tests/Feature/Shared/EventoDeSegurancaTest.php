<?php

namespace Tests\Feature\Shared;

use App\Shared\Logging\EventoDeSeguranca;
use Illuminate\Support\Facades\Log;
use Monolog\Handler\TestHandler;
use ReflectionClass;
use ReflectionMethod;
use Tests\TestCase;

/**
 * Catraca 4 da spec (§5). O log de segurança tem UM caminho de escrita, e cada
 * evento é um método com parâmetros tipados — não existe array livre de
 * contexto por onde senha, token ou e-mail possam entrar. Este teste é a prova
 * de que continua assim: método público novo sem entrada em `METODOS` reprova.
 */
class EventoDeSegurancaTest extends TestCase
{
    /** Todo método público da fachada. Silêncio reprova. */
    private const METODOS = [
        'loginConcedido',
        'loginRecusado',
        'logout',
        'sessaoRevogada',
        'acessoNegado',
        'taxaExcedida',
        'podaExecutada',
        'alertaDeAcessoSuspeito',
    ];

    private const SENTINELAS = ['vazamento@exemplo.cl', 'senha-secreta-123', 'token-abcdef'];

    private function capturar(): TestHandler
    {
        $handler = new TestHandler;
        Log::channel(EventoDeSeguranca::CANAL)->getLogger()->setHandlers([$handler]);

        return $handler;
    }

    public function test_a_fachada_nao_ganhou_metodo_publico_sem_ser_declarado_aqui(): void
    {
        $publicos = array_map(
            fn (ReflectionMethod $m) => $m->getName(),
            (new ReflectionClass(EventoDeSeguranca::class))->getMethods(ReflectionMethod::IS_PUBLIC),
        );
        $publicos = array_values(array_filter($publicos, fn (string $n) => ! str_starts_with($n, '__')));

        sort($publicos);
        $esperados = self::METODOS;
        sort($esperados);

        $this->assertSame($esperados, $publicos);
    }

    public function test_cada_evento_emite_uma_linha_no_canal_com_a_forma_fixa(): void
    {
        $handler = $this->capturar();

        EventoDeSeguranca::loginConcedido(1, 'admin', '203.0.113.9');
        EventoDeSeguranca::loginRecusado('abc123', '203.0.113.9');
        EventoDeSeguranca::logout(1, 'admin', '203.0.113.9');
        EventoDeSeguranca::sessaoRevogada(1, 'admin', '203.0.113.9');
        EventoDeSeguranca::acessoNegado(1, '203.0.113.9', 'api/users');
        EventoDeSeguranca::taxaExcedida(1, '203.0.113.9', 'api/login');
        EventoDeSeguranca::podaExecutada('audits', 'anonimizacao', 42);
        EventoDeSeguranca::alertaDeAcessoSuspeito('login_falho_repetido', 1, '203.0.113.9', 15);

        $registros = $handler->getRecords();
        $this->assertCount(count(self::METODOS), $registros);

        foreach ($registros as $registro) {
            $this->assertArrayHasKey('evento', $registro->context);
            $this->assertNotSame('', $registro->context['evento']);
        }
    }

    public function test_nenhum_evento_carrega_senha_token_ou_email(): void
    {
        $handler = $this->capturar();

        EventoDeSeguranca::loginConcedido(1, 'admin', '203.0.113.9');
        EventoDeSeguranca::loginRecusado(hash('sha256', 'vazamento@exemplo.cl|203.0.113.9'), '203.0.113.9');
        EventoDeSeguranca::logout(1, 'admin', '203.0.113.9');
        EventoDeSeguranca::sessaoRevogada(1, 'admin', '203.0.113.9');
        EventoDeSeguranca::acessoNegado(1, '203.0.113.9', 'api/users');
        EventoDeSeguranca::taxaExcedida(1, '203.0.113.9', 'api/login');
        EventoDeSeguranca::podaExecutada('audits', 'descarte', 7);
        EventoDeSeguranca::alertaDeAcessoSuspeito('sessao_de_conta_desativada', 1, '203.0.113.9', 1);

        $serializado = json_encode(
            array_map(fn ($r) => ['message' => $r->message, 'context' => $r->context], $handler->getRecords()),
        );

        foreach (self::SENTINELAS as $sentinela) {
            $this->assertStringNotContainsString($sentinela, $serializado);
        }

        foreach (['password', 'senha', 'token', 'email', 'old_values', 'new_values'] as $proibida) {
            $this->assertStringNotContainsString('"'.$proibida.'"', $serializado);
        }
    }

    public function test_alerta_sai_em_nivel_warning_e_o_resto_em_info(): void
    {
        $handler = $this->capturar();

        EventoDeSeguranca::loginConcedido(1, 'admin', null);
        EventoDeSeguranca::alertaDeAcessoSuspeito('sequencia_de_403', 1, null, 20);

        $niveis = array_map(fn ($r) => $r->level->getName(), $handler->getRecords());

        $this->assertSame(['INFO', 'WARNING'], $niveis);
    }
}
