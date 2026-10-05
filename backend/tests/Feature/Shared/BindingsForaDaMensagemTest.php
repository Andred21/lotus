<?php

namespace Tests\Feature\Shared;

use App\Domains\Identity\Models\User;
use App\Domains\Identity\Services\UserProvisioner;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Exceptions\Handler;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use PHPUnit\Framework\Attributes\Test;
use Psr\Log\LoggerInterface;
use Psr\Log\LoggerTrait;
use Stringable;
use Tests\TestCase;

/**
 * D-74, pago pelo item 34 (D12 da spec do bloco): a mensagem da
 * `QueryException` não leva os valores da consulta.
 *
 * Sem `mask_bindings_in_exception_messages`, o Laravel interpola os bindings na
 * SQL da mensagem (`Str::replaceArray`), e qualquer `report()` grava no log
 * default o e-mail, o RUT ou o nome que a consulta carregava. Desde o item 34
 * esse log fica 30 dias no CloudWatch Logs (ADR-21, emenda de 2026-10-04).
 *
 * Resíduo que esta catraca NÃO cobre, declarado na spec §4.8: o texto de erro
 * do próprio MySQL (`Duplicate entry '<valor>' for key ...`) continua trazendo o
 * valor — a máscara troca só a SQL que o Laravel monta.
 *
 * O handler vem do container por `Handler::class`, com um logger espião no
 * lugar do `LoggerInterface` — o mesmo padrão do `RecusaNaoVaiAoLogTest`.
 */
class BindingsForaDaMensagemTest extends TestCase
{
    use RefreshDatabase;

    private const SENTINELA = 'sentinela-d74@example.com';

    private function consultaQueFalha(): QueryException
    {
        try {
            DB::select('select * from tabela_que_nao_existe where email = ?', [self::SENTINELA]);
        } catch (QueryException $e) {
            return $e;
        }

        $this->fail('a consulta numa tabela inexistente deveria lançar QueryException');
    }

    #[Test]
    public function a_mensagem_traz_a_sql_sem_o_valor(): void
    {
        $mensagem = $this->consultaQueFalha()->getMessage();

        $this->assertStringNotContainsString(self::SENTINELA, $mensagem);
        // A SQL continua no diagnóstico, com o marcador no lugar do valor.
        $this->assertStringContainsString('where email = ?', $mensagem);
    }

    #[Test]
    public function o_log_do_handler_nao_traz_o_valor(): void
    {
        $linhas = [];
        $espiao = new class($linhas) implements LoggerInterface
        {
            use LoggerTrait;

            /** @param  list<string>  $linhas */
            public function __construct(private array &$linhas) {}

            /** @param  array<string, mixed>  $context */
            public function log($level, string|Stringable $message, array $context = []): void
            {
                $this->linhas[] = (string) $message;
            }
        };
        $this->app->instance(LoggerInterface::class, $espiao);

        $this->app->make(Handler::class)->report($this->consultaQueFalha());

        $this->assertNotSame([], $linhas, 'a QueryException deveria chegar ao log');
        foreach ($linhas as $linha) {
            $this->assertStringNotContainsString(self::SENTINELA, $linha);
        }
    }

    #[Test]
    public function a_conexao_de_producao_mascara(): void
    {
        // A suíte roda em sqlite; a produção, em mysql. Sem esta asserção, tirar
        // a chave só da conexão de produção passaria verde.
        $this->assertTrue(config('database.connections.mysql.mask_bindings_in_exception_messages'));
        $this->assertTrue(config('database.connections.sqlite.mask_bindings_in_exception_messages'));
    }

    #[Test]
    public function a_colisao_real_de_unicidade_continua_virando_422(): void
    {
        // O UserProvisioner reconhece a colisão pela MENSAGEM da QueryException
        // (`UNIQUE constraint failed` / `Duplicate entry`). A máscara troca só a
        // SQL do Laravel, e o marcador mora no texto do banco. Este caso prova
        // isso com uma colisão de verdade, não com uma exceção montada à mão.
        User::factory()->create(['email' => self::SENTINELA]);

        try {
            app(UserProvisioner::class)->writing(fn () => User::factory()->create(['email' => self::SENTINELA]));
            $this->fail('esperava ValidationException');
        } catch (ValidationException $e) {
            $this->assertArrayHasKey('email', $e->errors());
        }
    }
}
