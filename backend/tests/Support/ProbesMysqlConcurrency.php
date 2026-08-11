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
     * Espera até `$minimum` transações estarem BLOQUEADAS num lock do schema
     * observado. É o que separa "os processos disputaram" de "os processos
     * rodaram em fila": sem esta confirmação a sonda passaria verde mesmo sem
     * concorrência nenhuma. `$table` restringe o universo quando se sabe em qual
     * tabela a espera acontece; `null` observa o schema inteiro, que é o caso
     * quando processos distintos esperam em tabelas distintas.
     *
     * @param  array<int, Process>  $processes  processos JÁ INICIADOS
     */
    protected function waitUntilProcessesAreWaitingForMysqlLock(
        Connection $observer,
        array $processes,
        int $minimum,
        ?string $table = null,
    ): int {
        $deadline = hrtime(true) + 30_000_000_000;
        $waitingCount = 0;

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

            $bindings = [$observer->getDatabaseName()];
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
WHERE requested.OBJECT_SCHEMA = ?{$tableFilter}
SQL,
                $bindings,
            );
            $waitingCount = (int) $row->waiting_count;

            if ($waitingCount >= $minimum) {
                return $waitingCount;
            }

            usleep(20_000);
        } while (hrtime(true) < $deadline);

        $this->fail("MySQL não registrou {$minimum} processo(s) esperando pelo lock; observados: {$waitingCount}");
    }
}
