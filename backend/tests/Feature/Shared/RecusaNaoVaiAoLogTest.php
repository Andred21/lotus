<?php

namespace Tests\Feature\Shared;

use App\Domains\Certification\Exceptions\CorruptedSnapshotException;
use App\Domains\Identity\Exceptions\RedatorOnlyActionException;
use App\Domains\Operation\Exceptions\TurmaConfiguracaoException;
use Illuminate\Foundation\Exceptions\Handler;
use PHPUnit\Framework\Attributes\Test;
use Psr\Log\LoggerInterface;
use Psr\Log\LoggerTrait;
use Stringable;
use Tests\TestCase;

/**
 * Recusa de domínio não polui o log; falha de documento continua poluindo.
 *
 * Enquanto as quatro recusas estendiam `HttpException`, o
 * `$internalDontReport` do `Handler` do Laravel as calava de graça. Sair para
 * `RecusaDeDominio extends RuntimeException` derrubou essa carona EM SILÊNCIO
 * — nenhum teste reprovou, e o `bootstrap/app.php` passou a gravar `error` +
 * stack trace a cada cotação não aprovada (Q-1 do review de 2026-09-03). Esta
 * catraca é a que faltava: reprova contra o `dontReport()` removido.
 *
 * **Behavioral e não por `shouldntReport()`:** o método é protegido, e o que
 * importa não é o predicado, é a linha não chegar ao logger.
 *
 * O handler vem do container por `Handler::class` e não pelo contrato porque
 * em teste o contrato resolve o adaptador do Collision; o `afterResolving` do
 * `withExceptions()` casa com a classe concreta, que é a que roda em produção.
 */
class RecusaNaoVaiAoLogTest extends TestCase
{
    /** @var list<string> */
    private array $niveis = [];

    private function handlerComLoggerEspiao(): Handler
    {
        $espiao = new class($this->niveis) implements LoggerInterface
        {
            use LoggerTrait;

            /** @param  list<string>  $niveis */
            public function __construct(private array &$niveis) {}

            /** @param  array<string, mixed>  $context */
            public function log($level, string|Stringable $message, array $context = []): void
            {
                $this->niveis[] = (string) $level;
            }
        };

        $this->app->instance(LoggerInterface::class, $espiao);

        return $this->app->make(Handler::class);
    }

    #[Test]
    public function recusa_de_dominio_nao_chega_ao_log(): void
    {
        $handler = $this->handlerComLoggerEspiao();

        $handler->report(TurmaConfiguracaoException::cotacaoNaoAprovada());
        $handler->report(new RedatorOnlyActionException);

        $this->assertSame(
            [],
            $this->niveis,
            'Recusa esperada de domínio foi reportada como erro: '.implode(', ', $this->niveis),
        );
    }

    /**
     * A contra-prova: a supressão é da BASE `RecusaDeDominio`, não de
     * `PublicDetail`, que as duas compartilham. Snapshot corrompido é 500 e
     * significa documento de peso legal que não pode ser apresentado —
     * silenciá-lo seria trocar um defeito por outro.
     */
    #[Test]
    public function snapshot_corrompido_continua_chegando_ao_log(): void
    {
        $handler = $this->handlerComLoggerEspiao();

        $handler->report(CorruptedSnapshotException::missingFields('LOT-2026-1001', ['aluno.name']));

        $this->assertSame(['error'], $this->niveis);
    }
}
