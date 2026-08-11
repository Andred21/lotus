<?php

namespace Tests\Feature\Certification;

use App\Domains\Certification\Services\CertificateNumberService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Symfony\Component\Process\Process;
use Tests\Support\ProbesMysqlConcurrency;
use Tests\TestCase;

class CertificateNumberTest extends TestCase
{
    use ProbesMysqlConcurrency;
    use RefreshDatabase;

    public function test_primeiro_numero_do_ano_comeca_em_1000_e_o_seguinte_incrementa(): void
    {
        $service = app(CertificateNumberService::class);

        $this->assertSame('LOT-2026-1000', $service->next(2026));
        $this->assertSame('LOT-2026-1001', $service->next(2026));
        $this->assertDatabaseHas('certificate_sequences', [
            'year' => 2026,
            'last_seq' => 1001,
        ]);
    }

    public function test_ano_diferente_reinicia_em_1000_sem_alterar_a_sequencia_anterior(): void
    {
        $service = app(CertificateNumberService::class);

        $this->assertSame('LOT-2026-1000', $service->next(2026));
        $this->assertSame('LOT-2027-1000', $service->next(2027));
        $this->assertDatabaseHas('certificate_sequences', [
            'year' => 2026,
            'last_seq' => 1000,
        ]);
        $this->assertDatabaseHas('certificate_sequences', [
            'year' => 2027,
            'last_seq' => 1000,
        ]);
    }

    public function test_duas_primeiras_emissoes_concorrentes_recebem_numeros_distintos_no_mysql(): void
    {
        $this->skipUnlessMysql();

        $year = 2028;
        $connectionName = 'certificate_number_gate';
        $gate = $this->mysqlGateConnection($connectionName);
        $processes = [
            $this->certificateNumberProcess($year),
            $this->certificateNumberProcess($year),
        ];

        try {
            $gate->table('certificate_sequences')->where('year', $year)->delete();
            $gate->beginTransaction();

            // O gap lock mantém os dois INSERTs esperando até ambos estarem
            // concorrendo pela primeira linha do ano, em conexões distintas.
            $gate->table('certificate_sequences')
                ->where('year', $year)
                ->lockForUpdate()
                ->first();

            foreach ($processes as $process) {
                // O bootstrap é serial; a concorrência começa na região
                // crítica, com o processo anterior já esperando no gate.
                $process->start();
                $this->assertTrue(
                    $process->waitUntil(fn (string $type, string $output): bool => str_contains($output, 'ENTERING_NEXT')),
                    "processo concorrente não chegou ao next():\n"
                    ."stdout:\n{$process->getOutput()}\n"
                    ."stderr:\n{$process->getErrorOutput()}",
                );

                $this->assertStringContainsString("READY\n", $process->getOutput());
                // Depois do bootstrap e da conexão, o lock ganha orçamento
                // próprio. Idle timeout ainda detecta processo pendurado.
                $process->setTimeout(null);
                $process->setIdleTimeout(60);
            }

            $waitingCount = $this->waitUntilProcessesAreWaitingForMysqlLock(
                $gate,
                $processes,
                count($processes),
                'certificate_sequences',
            );
            $this->assertGreaterThanOrEqual(2, $waitingCount);

            foreach ($processes as $process) {
                $this->assertDoesNotMatchRegularExpression('/LOT-2028-\d+/', $process->getOutput());
            }

            $gate->commit();

            $numbers = [];

            foreach ($processes as $process) {
                $exitCode = $process->wait();
                $this->assertSame(0, $exitCode, $process->getErrorOutput());
                $this->assertSame(1, preg_match('/LOT-2028-\d+/', $process->getOutput(), $matches));
                $numbers[] = $matches[0];
            }

            sort($numbers);

            $this->assertSame(['LOT-2028-1000', 'LOT-2028-1001'], $numbers);
        } finally {
            if ($gate->transactionLevel() > 0) {
                $gate->rollBack();
            }

            foreach ($processes as $process) {
                if ($process->isRunning()) {
                    $process->stop();
                }
            }

            $gate->table('certificate_sequences')->where('year', $year)->delete();
            DB::disconnect($connectionName);
        }
    }

    private function certificateNumberProcess(int $year): Process
    {
        $script = <<<'PHP'
require $argv[1].'/vendor/autoload.php';
$app = require $argv[1].'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
Illuminate\Support\Facades\DB::purge();
Illuminate\Support\Facades\DB::connection()->getPdo();
Illuminate\Support\Facades\DB::statement('SET SESSION innodb_lock_wait_timeout = 90');
fwrite(STDOUT, "READY\n");
fflush(STDOUT);
fwrite(STDOUT, "ENTERING_NEXT\n");
fflush(STDOUT);
fwrite(STDOUT, $app->make(App\Domains\Certification\Services\CertificateNumberService::class)->next((int) $argv[2])."\n");
PHP;

        return $this->mysqlChildProcess($script, [(string) $year]);
    }
}
