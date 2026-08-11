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
 *
 * Há uma terceira forma, achada no review de 2026-08-11 (Q-2): um escritor que
 * simplesmente NÃO pede o mutex. As promoções acima não o pegam — quem o pega
 * são os `test_*_espera_pelo_mutex_do_cliente_no_mysql`, que asseram ONDE o
 * processo travou, não só que travou.
 */
class PrimaryConcurrencyTest extends TestCase
{
    use CreatesDomainRecords;
    use ProbesMysqlConcurrency;
    use RefreshDatabase;

    /**
     * O que difere entre a sonda de contato e a de endereço é SÓ isto — a regra
     * sob teste é a mesma, e escrevê-la duas vezes já deixou o par divergir
     * (review de 2026-08-11, Q-4).
     */
    private const PROBES = [
        'contato' => [
            'connection' => 'primary_contact_gate',
            'table' => 'client_contacts',
            'column' => 'name',
            'email' => 'sonda-contato@lotus.cl',
            'legal' => 'SONDA-CONTATO',
            'rotulo' => 'contato',
            'model' => ClientContact::class,
            'action' => UpdateClientContactAction::class,
            'data' => ClientContactData::class,
        ],
        'endereco' => [
            'connection' => 'primary_address_gate',
            'table' => 'client_addresses',
            'column' => 'line1',
            'email' => 'sonda-endereco@lotus.cl',
            'legal' => 'SONDA-ENDERECO',
            'rotulo' => 'endereço',
            'model' => ClientAddress::class,
            'action' => UpdateClientAddressAction::class,
            'data' => ClientAddressData::class,
        ],
        'exclusao' => [
            'connection' => 'delete_contact_gate',
            'table' => 'client_contacts',
            'column' => 'name',
            'email' => 'sonda-exclusao@lotus.cl',
            'legal' => 'SONDA-EXCLUSAO',
        ],
        'arquivamento' => [
            'connection' => 'archive_client_gate',
            'table' => 'client_contacts',
            'column' => 'name',
            'email' => 'sonda-arquivamento@lotus.cl',
            'legal' => 'SONDA-ARQUIVAMENTO',
        ],
    ];

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
        $this->assertPromocoesConcorrentesDeixamUmUnicoPrincipal(self::PROBES['contato']);
    }

    public function test_promocoes_concorrentes_de_endereco_deixam_um_unico_principal_no_mysql(): void
    {
        $this->assertPromocoesConcorrentesDeixamUmUnicoPrincipal(self::PROBES['endereco']);
    }

    /**
     * A `DeleteClientContactAction` era a única escritora que ia direto na
     * coleção sem pedir o mutex — ordem invertida em relação às outras cinco,
     * ciclo de lock possível, `SQLSTATE[40001] ... 1213` virando 500
     * (review de 2026-08-11, Q-2).
     *
     * Sem o `Client::lockForWrite()` na Action, o filho não pede nada em
     * `clients`, termina antes do commit do gate e a sonda reprova com
     * "processo terminou antes do commit do gate".
     */
    public function test_exclusao_de_contato_espera_pelo_mutex_do_cliente_no_mysql(): void
    {
        $this->skipUnlessMysql();

        $probe = self::PROBES['exclusao'];
        $gate = $this->mysqlGateConnection($probe['connection']);
        $processes = [];

        try {
            [$clientId, $ids] = $this->seedProbe($gate, $probe);
            $processes = [$this->childProcess(<<<'PHP'
$contact = App\Domains\Commercial\Models\ClientContact::findOrFail((int) $argv[2]);
$app->make(App\Domains\Commercial\Actions\DeleteClientContactAction::class)->execute($contact);
fwrite(STDOUT, "DONE\n");
PHP, [(string) $ids['C']])];

            $this->runBlockedOnClientMutex($gate, $clientId, $processes[0]);

            $vivos = $gate->table('client_contacts')
                ->where('client_id', $clientId)
                ->whereNull('deleted_at')
                ->orderBy('id')
                ->pluck('name')
                ->all();

            $this->assertSame(['SONDA-A', 'SONDA-B'], $vivos, 'a exclusão não apagou exatamente o contato alvo');
        } finally {
            $this->tearDownProbe($gate, $processes, $probe['connection'], fn () => $this->cleanProbe($gate, $probe));
        }
    }

    /**
     * O arquivamento do cliente enumera-e-apaga a coleção no hook `deleting` do
     * model. Sem a `DeleteClientAction` (transação + mutex), cada `delete()`
     * autocommitava e um contato criado entre a enumeração e o fim sobrevivia
     * ATIVO sob cliente arquivado (review de 2026-08-11, Q-2).
     *
     * A prova é a mesma da exclusão de contato: o escritor tem de PARAR no
     * mutex, em `clients`, antes de tocar em qualquer coisa.
     */
    public function test_arquivamento_de_cliente_espera_pelo_mutex_no_mysql(): void
    {
        $this->skipUnlessMysql();

        $probe = self::PROBES['arquivamento'];
        $gate = $this->mysqlGateConnection($probe['connection']);
        $processes = [];

        try {
            [$clientId] = $this->seedProbe($gate, $probe);
            $processes = [$this->childProcess(<<<'PHP'
$client = App\Domains\Commercial\Models\Client::findOrFail((int) $argv[2]);
$app->make(App\Domains\Commercial\Actions\DeleteClientAction::class)->execute($client);
fwrite(STDOUT, "DONE\n");
PHP, [(string) $clientId])];

            $this->runBlockedOnClientMutex($gate, $clientId, $processes[0], function () use ($gate, $clientId): void {
                // O escritor está parado no mutex. Se a cascata já tivesse
                // começado, os contatos apareceriam apagados AQUI, na conexão do
                // gate — sem transação, cada `delete()` do hook autocommita e a
                // janela do Q-2 está aberta. Com o mutex tomado antes de tudo,
                // ele ainda não tocou em nada.
                $this->assertSame(
                    3,
                    $gate->table('client_contacts')->where('client_id', $clientId)->whereNull('deleted_at')->count(),
                    'a cascata começou ANTES do mutex: o hook apagou contatos enquanto o escritor ainda esperava',
                );
            });

            $this->assertSame(
                0,
                $gate->table('client_contacts')->where('client_id', $clientId)->whereNull('deleted_at')->count(),
                'contato sobreviveu ativo sob cliente arquivado',
            );
            $this->assertSame(
                0,
                $gate->table('clients')->where('id', $clientId)->whereNull('deleted_at')->count(),
                'o cliente não foi arquivado',
            );
        } finally {
            $this->tearDownProbe($gate, $processes, $probe['connection'], fn () => $this->cleanProbe($gate, $probe));
        }
    }

    /** @param array<string, string> $probe */
    private function assertPromocoesConcorrentesDeixamUmUnicoPrincipal(array $probe): void
    {
        $this->skipUnlessMysql();

        $gate = $this->mysqlGateConnection($probe['connection']);
        $processes = [];

        try {
            [$clientId, $ids] = $this->seedProbe($gate, $probe);
            $processes = [
                $this->promoteProcess($probe, $ids['B']),
                $this->promoteProcess($probe, $ids['C']),
            ];

            $gate->beginTransaction();
            // O gate segura as duas linhas que os filhos vão promover: P1 entra
            // na região crítica (toma o mutex do cliente) e para no próprio
            // UPDATE; P2, iniciado depois, para ANTES, no mutex que P1 segura.
            $gate->table($probe['table'])
                ->whereIn('id', [$ids['B'], $ids['C']])
                ->lockForUpdate()
                ->get();

            $this->startAndBudget($processes[0], 'primeiro');
            // P1 bloqueado NA COLEÇÃO = ele já passou pelo mutex do cliente e o
            // está segurando. Iniciar P2 antes disso deixaria a ordem dos locks
            // ao acaso, e a sonda deixaria de ser determinística.
            $this->waitUntilProcessesAreWaitingForMysqlLock($gate, [$processes[0]], 1, $probe['table']);

            $this->startAndBudget($processes[1], 'segundo');
            // Sem tabela: P1 espera na coleção e P2 espera em `clients`.
            $waiting = $this->waitUntilProcessesAreWaitingForMysqlLock($gate, $processes, 2);
            $this->assertGreaterThanOrEqual(2, $waiting, 'os dois processos não chegaram a disputar lock nenhum');

            $gate->commit();

            foreach ($processes as $index => $process) {
                // Exit != 0 aqui é o deadlock que a ordem errada dos locks
                // produz (mutex tomado DEPOIS da escrita).
                $this->assertSame(0, $process->wait(), "processo {$index}:\n".$process->getErrorOutput());
            }

            $primaries = $gate->table($probe['table'])
                ->where('client_id', $clientId)
                ->where('is_primary', true)
                ->whereNull('deleted_at')
                ->orderBy('id')
                ->pluck($probe['column'])
                ->all();

            // P2 é o último a entrar na região crítica, porque só entra quando
            // P1 commita e solta o mutex — a ordem é construída, não sorteada.
            $this->assertSame(['SONDA-C'], $primaries, "mais de um {$probe['rotulo']} principal sobreviveu à disputa");
        } finally {
            $this->tearDownProbe($gate, $processes, $probe['connection'], fn () => $this->cleanProbe($gate, $probe));
        }
    }

    /**
     * Prova que o escritor PAROU no mutex do cliente antes de tocar em qualquer
     * outra coisa: o gate segura a linha de `clients` e a sonda exige que a
     * espera do filho seja em `clients` — não em outra tabela, não em nenhuma.
     */
    private function runBlockedOnClientMutex(
        Connection $gate,
        int $clientId,
        Process $process,
        ?callable $enquantoBloqueado = null,
    ): void {
        $gate->beginTransaction();
        $gate->table('clients')->where('id', $clientId)->lockForUpdate()->first();

        $this->startAndBudget($process, 'escritor');
        $this->waitUntilProcessesAreWaitingForMysqlLock($gate, [$process], 1, 'clients');

        // Janela para asserir o que o escritor JÁ tinha feito quando parou. É
        // aqui que se separa "parou no mutex, antes de tudo" de "parou no
        // próprio UPDATE de `clients`, depois de já ter mexido na coleção".
        if ($enquantoBloqueado !== null) {
            $enquantoBloqueado();
        }

        $gate->commit();

        $this->assertSame(0, $process->wait(), $process->getErrorOutput());
    }

    private function startAndBudget(Process $process, string $rotulo): void
    {
        $process->start();

        $this->assertTrue(
            $process->waitUntil(fn (): bool => preg_match($this->mysqlReadyPattern(), $process->getOutput()) === 1),
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
     * @param  array<string, string>  $probe
     * @return array{0: int, 1: array<string, int>}
     */
    private function seedProbe(Connection $gate, array $probe): array
    {
        $this->cleanProbe($gate, $probe);
        $clientId = $this->insertProbeClient($gate, $probe['legal'], $probe['email']);
        $ids = [];

        foreach ([['A', 1], ['B', 0], ['C', 0]] as [$sufixo, $primary]) {
            $ids[$sufixo] = $gate->table($probe['table'])->insertGetId([
                'client_id' => $clientId,
                $probe['column'] => "SONDA-{$sufixo}",
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

    /** @param  array<string, string>  $probe */
    private function cleanProbe(Connection $gate, array $probe): void
    {
        $gate->table('users')->where('email', $probe['email'])->delete();
    }

    /**
     * Promove o item a principal pela Action nested da própria entidade. Classes
     * e coluna chegam por `$argv` em vez de interpolação: o script é nowdoc, o
     * mesmo texto para contato e endereço.
     *
     * @param  array<string, string>  $probe
     */
    private function promoteProcess(array $probe, int $id): Process
    {
        return $this->childProcess(<<<'PHP'
$item = $argv[3]::findOrFail((int) $argv[2]);
$app->make($argv[4])->execute(
    $item,
    $argv[5]::from([$argv[6] => $item->{$argv[6]}, 'is_primary' => true]),
);
fwrite(STDOUT, "DONE\n");
PHP, [(string) $id, $probe['model'], $probe['action'], $probe['data'], $probe['column']]);
    }

    /** @param  array<int, string>  $args */
    private function childProcess(string $regiaoCritica, array $args): Process
    {
        return $this->mysqlChildProcess($this->mysqlChildPreamble().$regiaoCritica, $args);
    }
}
