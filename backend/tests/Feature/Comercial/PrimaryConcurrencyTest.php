<?php

namespace Tests\Feature\Comercial;

use App\Domains\Commercial\Actions\UpdateClientAddressAction;
use App\Domains\Commercial\Actions\UpdateClientContactAction;
use App\Domains\Commercial\Data\ClientAddressData;
use App\Domains\Commercial\Data\ClientContactData;
use App\Domains\Commercial\Models\ClientAddress;
use App\Domains\Commercial\Models\ClientContact;
use Illuminate\Database\Connection;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Str;
use Symfony\Component\Process\Process;
use Tests\Support\CreatesDomainRecords;
use Tests\Support\ProbesMysqlConcurrency;
use Tests\TestCase;

/**
 * A invariante "no máximo 1 principal por cliente" sob concorrência, em DUAS
 * camadas, porque nenhuma das duas basta sozinha:
 *
 * 1. sqlite (`test_*_roda_dentro_de_transacao`) — prova que o rebaixamento
 *    acontece DENTRO da transação da Action, que é a condição sem a qual o lock
 *    não teria efeito nem em MySQL. NÃO prova serialização:
 *    `SQLiteGrammar::compileLock()` devolve `''` e `lockForUpdate()` é no-op.
 * 2. MySQL (`test_*_no_mysql`) — dois processos concorrentes promovendo
 *    contatos/endereços distintos do MESMO cliente, com o gate confirmando pelo
 *    `performance_schema` que eles realmente disputaram.
 *
 * A sonda do MySQL é guarda das DUAS formas de quebrar o mecanismo, e as duas
 * foram medidas em 2026-08-11: apagar o mutex deixa dois principais vivos
 * (a asserção final reprova), e tomá-lo DEPOIS da escrita inverte a ordem dos
 * locks e produz `SQLSTATE[40001] ... 1213 Deadlock found when trying to get
 * lock` (o filho morre e a asserção de exit code reprova).
 */
class PrimaryConcurrencyTest extends TestCase
{
    use CreatesDomainRecords;
    use ProbesMysqlConcurrency;
    use RefreshDatabase;

    public function test_rebaixamento_de_contato_roda_dentro_de_transacao(): void
    {
        $client = $this->makeClientWithUser();
        $ana = $client->contacts()->create(['name' => 'Ana', 'is_primary' => true]);
        $bruno = $client->contacts()->create(['name' => 'Bruno', 'is_primary' => false]);

        $niveis = [];
        // Só o REBAIXAMENTO interessa. Escutar qualquer `updating` mediria a
        // escrita da própria Action, que roda dentro da transação de qualquer
        // jeito — a guarda passaria verde com o `ensureSingle` do lado de fora.
        Event::listen('eloquent.updating: '.ClientContact::class, function (ClientContact $c) use (&$niveis, $ana): void {
            if ($c->is($ana)) {
                $niveis[] = DB::transactionLevel();
            }
        });

        app(UpdateClientContactAction::class)->execute(
            $bruno,
            ClientContactData::from(['name' => 'Bruno', 'is_primary' => true]),
        );

        $this->assertNotEmpty($niveis, 'o principal anterior não foi rebaixado');
        // 2, não 1: o `RefreshDatabase` já mantém uma transação aberta durante o
        // teste inteiro. Asserir `> 0` mediria o RefreshDatabase, não o código
        // sob teste.
        $this->assertSame(2, $niveis[0], 'o rebaixamento rodou fora da transação da Action');
        $this->assertSame(['Bruno'], $client->contacts()->where('is_primary', true)->pluck('name')->all());
    }

    public function test_rebaixamento_de_endereco_roda_dentro_de_transacao(): void
    {
        $client = $this->makeClientWithUser();
        $primeiro = $client->addresses()->create(['line1' => 'Rua A', 'is_primary' => true]);
        $segundo = $client->addresses()->create(['line1' => 'Rua B', 'is_primary' => false]);

        $niveis = [];
        Event::listen('eloquent.updating: '.ClientAddress::class, function (ClientAddress $a) use (&$niveis, $primeiro): void {
            if ($a->is($primeiro)) {
                $niveis[] = DB::transactionLevel();
            }
        });

        app(UpdateClientAddressAction::class)->execute(
            $segundo,
            ClientAddressData::from(['line1' => 'Rua B', 'is_primary' => true]),
        );

        $this->assertNotEmpty($niveis, 'o principal anterior não foi rebaixado');
        $this->assertSame(2, $niveis[0], 'o rebaixamento rodou fora da transação da Action');
        $this->assertSame(['Rua B'], $client->addresses()->where('is_primary', true)->pluck('line1')->all());
    }

    public function test_promocoes_concorrentes_de_contato_deixam_um_unico_principal_no_mysql(): void
    {
        $this->skipUnlessMysql();

        $gate = $this->mysqlGateConnection('primary_contact_gate');
        $processes = [];

        try {
            [$clientId, $ids] = $this->seedContactProbe($gate);
            $processes = [
                $this->contactProbeProcess($ids['B']),
                $this->contactProbeProcess($ids['C']),
            ];

            $gate->beginTransaction();
            // O gate segura as duas linhas que os filhos vão promover: P1 entra
            // na região crítica (toma o mutex do cliente) e para no próprio
            // UPDATE; P2, iniciado depois, para ANTES, no mutex que P1 segura.
            $gate->table('client_contacts')
                ->whereIn('id', [$ids['B'], $ids['C']])
                ->lockForUpdate()
                ->get();

            $this->startAndBudget($processes[0], 'primeiro');
            // P1 bloqueado = mutex do cliente JÁ tomado. Iniciar P2 antes disso
            // deixaria a ordem dos locks ao acaso, e a sonda deixaria de ser
            // determinística.
            $this->waitUntilProcessesAreWaitingForMysqlLock($gate, [$processes[0]], 1);

            $this->startAndBudget($processes[1], 'segundo');
            $waiting = $this->waitUntilProcessesAreWaitingForMysqlLock($gate, $processes, 2);
            $this->assertGreaterThanOrEqual(2, $waiting, 'os dois processos não chegaram a disputar lock nenhum');

            $gate->commit();

            foreach ($processes as $index => $process) {
                // Exit != 0 aqui é o deadlock que a ordem errada dos locks
                // produz (mutex tomado DEPOIS da escrita).
                $this->assertSame(0, $process->wait(), "processo {$index}:\n".$process->getErrorOutput());
            }

            $primaries = $gate->table('client_contacts')
                ->where('client_id', $clientId)
                ->where('is_primary', true)
                ->whereNull('deleted_at')
                ->orderBy('id')
                ->pluck('name')
                ->all();

            // P2 é o último a entrar na região crítica, porque só entra quando
            // P1 commita e solta o mutex — a ordem é construída, não sorteada.
            $this->assertSame(['SONDA-C'], $primaries, 'mais de um contato principal sobreviveu à disputa');
        } finally {
            $this->tearDownProbe($gate, $processes, 'primary_contact_gate', fn () => $this->cleanContactProbe($gate));
        }
    }

    public function test_promocoes_concorrentes_de_endereco_deixam_um_unico_principal_no_mysql(): void
    {
        $this->skipUnlessMysql();

        $gate = $this->mysqlGateConnection('primary_address_gate');
        $processes = [];

        try {
            [$clientId, $ids] = $this->seedAddressProbe($gate);
            $processes = [
                $this->addressProbeProcess($ids['B']),
                $this->addressProbeProcess($ids['C']),
            ];

            $gate->beginTransaction();
            $gate->table('client_addresses')
                ->whereIn('id', [$ids['B'], $ids['C']])
                ->lockForUpdate()
                ->get();

            $this->startAndBudget($processes[0], 'primeiro');
            $this->waitUntilProcessesAreWaitingForMysqlLock($gate, [$processes[0]], 1);

            $this->startAndBudget($processes[1], 'segundo');
            $waiting = $this->waitUntilProcessesAreWaitingForMysqlLock($gate, $processes, 2);
            $this->assertGreaterThanOrEqual(2, $waiting, 'os dois processos não chegaram a disputar lock nenhum');

            $gate->commit();

            foreach ($processes as $index => $process) {
                $this->assertSame(0, $process->wait(), "processo {$index}:\n".$process->getErrorOutput());
            }

            $primaries = $gate->table('client_addresses')
                ->where('client_id', $clientId)
                ->where('is_primary', true)
                ->whereNull('deleted_at')
                ->orderBy('id')
                ->pluck('line1')
                ->all();

            $this->assertSame(['SONDA-C'], $primaries, 'mais de um endereço principal sobreviveu à disputa');
        } finally {
            $this->tearDownProbe($gate, $processes, 'primary_address_gate', fn () => $this->cleanAddressProbe($gate));
        }
    }

    private function startAndBudget(Process $process, string $rotulo): void
    {
        $process->start();

        $this->assertTrue(
            $process->waitUntil(fn (string $type, string $output): bool => str_contains($output, "READY\n")),
            "{$rotulo} processo não bootou:\n"
            ."stdout:\n{$process->getOutput()}\n"
            ."stderr:\n{$process->getErrorOutput()}",
        );

        // Depois do bootstrap, a espera pelo lock ganha orçamento próprio; o
        // idle timeout ainda detecta processo pendurado.
        $process->setTimeout(null);
        $process->setIdleTimeout(60);
    }

    /** @param  array<int, Process>  $processes */
    private function tearDownProbe(Connection $gate, array $processes, string $connectionName, callable $limpeza): void
    {
        if ($gate->transactionLevel() > 0) {
            $gate->rollBack();
        }

        foreach ($processes as $process) {
            if ($process->isRunning()) {
                $process->stop();
            }
        }

        $limpeza();
        DB::disconnect($connectionName);
    }

    /**
     * A fixture nasce pela conexão do GATE, não por factory: o que a transação
     * do `RefreshDatabase` cria, os processos filhos não enxergam.
     *
     * @return array{0: int, 1: array<string, int>}
     */
    private function seedContactProbe(Connection $gate): array
    {
        $this->cleanContactProbe($gate);
        $clientId = $this->insertProbeClient($gate, 'SONDA-CONTATO', 'sonda-contato@lotus.cl');
        $ids = [];

        foreach ([['A', 1], ['B', 0], ['C', 0]] as [$sufixo, $primary]) {
            $ids[$sufixo] = $gate->table('client_contacts')->insertGetId([
                'client_id' => $clientId,
                'name' => "SONDA-{$sufixo}",
                'is_primary' => $primary,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        return [$clientId, $ids];
    }

    /** @return array{0: int, 1: array<string, int>} */
    private function seedAddressProbe(Connection $gate): array
    {
        $this->cleanAddressProbe($gate);
        $clientId = $this->insertProbeClient($gate, 'SONDA-ENDERECO', 'sonda-endereco@lotus.cl');
        $ids = [];

        foreach ([['A', 1], ['B', 0], ['C', 0]] as [$sufixo, $primary]) {
            $ids[$sufixo] = $gate->table('client_addresses')->insertGetId([
                'client_id' => $clientId,
                'line1' => "SONDA-{$sufixo}",
                'is_primary' => $primary,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        return [$clientId, $ids];
    }

    private function insertProbeClient(Connection $gate, string $legalName, string $email): int
    {
        $userId = $gate->table('users')->insertGetId([
            'uuid' => (string) Str::uuid(),
            'name' => $legalName,
            'email' => $email,
            'password' => bin2hex(random_bytes(16)),
            'type' => 'cliente',
            'is_active' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return $gate->table('clients')->insertGetId([
            'user_id' => $userId,
            'legal_name' => $legalName,
            'type' => 'client',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    private function cleanContactProbe(Connection $gate): void
    {
        $gate->table('users')->where('email', 'sonda-contato@lotus.cl')->delete();
    }

    private function cleanAddressProbe(Connection $gate): void
    {
        $gate->table('users')->where('email', 'sonda-endereco@lotus.cl')->delete();
    }

    private function contactProbeProcess(int $contactId): Process
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
$contact = App\Domains\Commercial\Models\ClientContact::findOrFail((int) $argv[2]);
$app->make(App\Domains\Commercial\Actions\UpdateClientContactAction::class)->execute(
    $contact,
    App\Domains\Commercial\Data\ClientContactData::from(['name' => $contact->name, 'is_primary' => true]),
);
fwrite(STDOUT, "DONE\n");
PHP;

        return $this->mysqlChildProcess($script, [(string) $contactId]);
    }

    private function addressProbeProcess(int $addressId): Process
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
$address = App\Domains\Commercial\Models\ClientAddress::findOrFail((int) $argv[2]);
$app->make(App\Domains\Commercial\Actions\UpdateClientAddressAction::class)->execute(
    $address,
    App\Domains\Commercial\Data\ClientAddressData::from(['line1' => $address->line1, 'is_primary' => true]),
);
fwrite(STDOUT, "DONE\n");
PHP;

        return $this->mysqlChildProcess($script, [(string) $addressId]);
    }
}
