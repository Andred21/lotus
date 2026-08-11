<?php

namespace Tests\Support;

use Illuminate\Database\Connection;
use Illuminate\Support\Facades\DB;
use Symfony\Component\Process\Process;

/**
 * Sonda de concorrência real contra MySQL. Existe porque a suíte roda sqlite
 * `:memory:`, onde `SQLiteGrammar::compileLock()` devolve `''`: `lockForUpdate()`
 * é no-op SILENCIOSO e nenhum teste da suíte pode provar serialização.
 *
 * Extraído do `CertificateNumberTest` em 2026-08-11 sem mudança de
 * comportamento — o caso do certificado continua sendo o mesmo teste, com o
 * mesmo alinhamento e o mesmo placar.
 */
trait ProbesMysqlConcurrency
{
    /** Fora do MySQL o lock não existe: o caso é pulado, não maquiado. */
    protected function skipUnlessMysql(): void
    {
        if (DB::connection()->getDriverName() !== 'mysql') {
            $this->markTestSkipped('lockForUpdate é no-op em sqlite; este caso exige MySQL real.');
        }
    }

    /**
     * Conexão de gate própria, clonada da `mysql`. Tem de ser separada da
     * conexão do teste: aquela está dentro da transação do `RefreshDatabase`, e
     * nada do que ela escreve é visível para os processos filhos.
     */
    protected function mysqlGateConnection(string $name): Connection
    {
        config()->set("database.connections.{$name}", config('database.connections.mysql'));

        return DB::connection($name);
    }

    /**
     * Preâmbulo dos processos filhos: boot do Laravel, conexão própria e o
     * handshake `READY`. O handshake carrega o `CONNECTION_ID()` porque é ele
     * que correlaciona a espera vista no `performance_schema` com ESTE processo
     * — ver `waitUntilProcessesAreWaitingForMysqlLock()`.
     *
     * Concatene a região crítica depois dele; `$argv[1]` é o `base_path()` e os
     * argumentos do teste entram a partir de `$argv[2]`.
     */
    protected function mysqlChildPreamble(): string
    {
        return <<<'PHP'
require $argv[1].'/vendor/autoload.php';
$app = require $argv[1].'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
Illuminate\Support\Facades\DB::purge();
Illuminate\Support\Facades\DB::connection()->getPdo();
Illuminate\Support\Facades\DB::statement('SET SESSION innodb_lock_wait_timeout = 90');
fwrite(STDOUT, 'READY '.Illuminate\Support\Facades\DB::selectOne('SELECT CONNECTION_ID() AS id')->id."\n");
fflush(STDOUT);

PHP;
    }

    /** Padrão do handshake do preâmbulo, para o teste esperar por ele. */
    protected function mysqlReadyPattern(): string
    {
        return '/READY (\d+)\n/';
    }

    /**
     * Processo filho com bootstrap próprio do Laravel, apontado para o MESMO
     * banco do teste. `$script` roda em `php -r`; `$argv[1]` é o `base_path()` e
     * os `$args` entram a partir de `$argv[2]`.
     *
     * @param  array<int, string>  $args
     */
    protected function mysqlChildProcess(string $script, array $args = []): Process
    {
        $process = new Process(
            [PHP_BINARY, '-r', $script, base_path(), ...$args],
            base_path(),
            [
                'APP_ENV' => 'testing',
                'DB_CONNECTION' => 'mysql',
                'DB_DATABASE' => DB::connection()->getDatabaseName(),
            ],
            null,
            120,
        );

        $process->setIdleTimeout(60);

        return $process;
    }

    /**
     * Espera até `$minimum` dos processos filhos estarem BLOQUEADOS num lock. É
     * o que separa "os processos disputaram" de "os processos rodaram em fila":
     * sem esta confirmação a sonda passaria verde mesmo sem concorrência
     * nenhuma.
     *
     * A contagem é CORRELACIONADA com os processos, pelo `CONNECTION_ID()` que
     * cada um imprime no handshake `READY`. Filtrar só por schema (como esta
     * sonda fazia até 2026-08-11, Q-6) contava qualquer transação em espera no
     * banco — inclusive alheia à disputa —, e o gate podia liberar antes de a
     * disputa existir, deixando a asserção final passar por ordenação acidental.
     *
     * `$table` restringe ainda mais, quando se sabe em qual tabela a espera tem
     * de acontecer — e aí a sonda também prova ONDE o processo travou, não só
     * que travou. `null` aceita qualquer tabela, para quando processos distintos
     * esperam em tabelas distintas.
     *
     * @param  array<int, Process>  $processes  processos JÁ INICIADOS, já com o READY impresso
     */
    protected function waitUntilProcessesAreWaitingForMysqlLock(
        Connection $observer,
        array $processes,
        int $minimum,
        ?string $table = null,
    ): int {
        $deadline = hrtime(true) + 30_000_000_000;
        $waitingCount = 0;
        $connectionIds = array_map(fn (Process $p) => $this->mysqlConnectionIdOf($p), $processes);
        $placeholders = implode(', ', array_fill(0, count($connectionIds), '?'));

        do {
            foreach ($processes as $process) {
                if (! $process->isRunning()) {
                    $this->fail(
                        "processo terminou antes do commit do gate:\n"
                        ."stdout:\n{$process->getOutput()}\n"
                        ."stderr:\n{$process->getErrorOutput()}",
                    );
                }
            }

            $bindings = [$observer->getDatabaseName(), ...$connectionIds];
            $tableFilter = '';

            if ($table !== null) {
                $tableFilter = ' AND requested.OBJECT_NAME = ?';
                $bindings[] = $table;
            }

            $row = $observer->selectOne(
                <<<SQL
SELECT COUNT(DISTINCT waits.REQUESTING_ENGINE_TRANSACTION_ID) AS waiting_count
FROM performance_schema.data_lock_waits AS waits
INNER JOIN performance_schema.data_locks AS requested
    ON requested.ENGINE_LOCK_ID = waits.REQUESTING_ENGINE_LOCK_ID
INNER JOIN performance_schema.threads AS requester
    ON requester.THREAD_ID = requested.THREAD_ID
WHERE requested.OBJECT_SCHEMA = ?
  AND requester.PROCESSLIST_ID IN ({$placeholders}){$tableFilter}
SQL,
                $bindings,
            );
            $waitingCount = (int) $row->waiting_count;

            if ($waitingCount >= $minimum) {
                return $waitingCount;
            }

            usleep(20_000);
        } while (hrtime(true) < $deadline);

        $alvo = $table === null ? 'pelo lock' : "pelo lock de `{$table}`";
        $this->fail("MySQL não registrou {$minimum} processo(s) esperando {$alvo}; observados: {$waitingCount}");
    }

    /** O `CONNECTION_ID()` que o filho imprimiu no handshake `READY`. */
    private function mysqlConnectionIdOf(Process $process): int
    {
        if (preg_match($this->mysqlReadyPattern(), $process->getOutput(), $matches) !== 1) {
            $this->fail(
                "processo não imprimiu o handshake READY com o CONNECTION_ID:\n"
                ."stdout:\n{$process->getOutput()}\n"
                ."stderr:\n{$process->getErrorOutput()}",
            );
        }

        return (int) $matches[1];
    }
}
