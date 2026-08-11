# `integridade-e-concorrencia-backend` — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fechar a janela de concorrência que deixa dois principais por cliente, mover a checagem de unicidade para dentro da transação que escreve e cobrir com teste quatro portas que hoje passam sem prova.

**Architecture:** O item 1 é lock em duas peças — mutex por cliente tomado **antes de qualquer escrita** (nas Actions) e leitura travada da coleção de principais (nos serviços) — provado por sonda de dois processos contra MySQL real, porque `SQLiteGrammar::compileLock()` devolve `''` e a suíte anula o lock em silêncio. O harness da sonda sai do `CertificateNumberTest` para `tests/Support/`. Os itens 2, 3 e 4 são movimentos pequenos em arquivos existentes, cada um com o teste que o justifica visto vermelho antes.

**Tech Stack:** Laravel 13 / PHP 8.3 · PHPUnit sobre `Tests\TestCase` (sqlite `:memory:` no container `app`) · MySQL 8 InnoDB `REPEATABLE READ` para as sondas (`performance_schema.data_lock_waits`) · `Symfony\Component\Process` para os processos concorrentes.

**Spec:** `docs/superpowers/specs/archive/2026-08-11-integridade-e-concorrencia-backend-design.md`

## Global Constraints

- **Backend roda no container.** `docker compose exec -T app php artisan test …`. O host WSL não tem mbstring.
- **Pint roda no host, de `backend/`, sempre com argumento.** `cd backend && ./vendor/bin/pint <arquivos>` — nunca sem, que reformata o repositório inteiro.
- **Zero schema.** `git diff main...HEAD -- backend/database/` termina o bloco vazio.
- **Zero frontend.** `git diff main...HEAD -- frontend/` termina o bloco vazio. Nenhum DTO muda de forma; `typescript:transform` sai sem diff em `generated.ts`.
- **Nada de `migrate:fresh --seed` no banco de dev.** O `LOT-2026-1001` está corrompido de propósito, esperando o checkpoint visual do João (spec §7).
- **Escrita auditada não muda de forma (lei §5.2 / ADR-08).** Os `update()` por instância continuam por instância. O lock entra como **leitura**; nenhum caminho novo de escrita nasce neste bloco.
- **Linha de base da suíte:** backend **524 passed, 1 skipped (1963 assertions)**. Contra MySQL, `CertificateNumberTest` dá **3 passed (20 assertions)**.
- **Projeção ao fim do bloco:** backend **532 passed, 3 skipped** em sqlite (+8 casos, +2 skipped); contra MySQL, `CertificateNumberTest` **inalterado em 3 passed / 20 assertions** e `PrimaryConcurrencyTest` **4 passed**. O total de assertions é **registrado no gate, não projetado** — casos novos com laço de espera não têm contagem previsível.
- **Comando do MySQL** (banco `lotus_test`, já migrado):
  ```bash
  docker compose exec -T -e DB_CONNECTION=mysql -e DB_DATABASE=lotus_test app php artisan test --filter=<Classe>
  ```
- **Cada teste é visto reprovando contra o defeito ou contra seu mutante** (lição 10). O texto da reprovação vai no corpo do commit; a sonda/mutante é desfeita antes do commit.
- **Um commit por task**, mensagem sem acento, `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>` ao final.
- **Main tree, branch `hardening/integridade-e-concorrencia-backend`.** Sem worktree (P-03).

## File Structure

| Arquivo | Responsabilidade | Task |
|---|---|---|
| `backend/tests/Support/ProbesMysqlConcurrency.php` | trait: skip fora do MySQL, conexão de gate, processo filho, espera por lock | 1 |
| `backend/tests/Feature/Certification/CertificateNumberTest.php` | passa a consumir o trait, com comportamento idêntico | 1 |
| `backend/app/Domains/Commercial/Models/Client.php` | `lockForWrite()` — o mutex por cliente, num lugar só | 2 |
| `backend/app/Domains/Commercial/Services/PrimaryContactService.php` | leitura da coleção de principais passa a ser travada | 2 |
| `backend/app/Domains/Commercial/Services/PrimaryAddressService.php` | espelho exato, sobre `addresses()` | 2 |
| `backend/app/Domains/Commercial/Actions/UpdateClientAction.php` | mutex antes de qualquer escrita; unicidade de RUT para dentro | 2, 3 |
| `backend/app/Domains/Commercial/Actions/CreateClientContactAction.php` | mutex antes de qualquer escrita | 2 |
| `backend/app/Domains/Commercial/Actions/UpdateClientContactAction.php` | mutex antes de qualquer escrita | 2 |
| `backend/app/Domains/Commercial/Actions/CreateClientAddressAction.php` | mutex antes de qualquer escrita | 2 |
| `backend/app/Domains/Commercial/Actions/UpdateClientAddressAction.php` | mutex antes de qualquer escrita | 2 |
| `backend/app/Domains/Commercial/Actions/CreateClientAction.php` | comentário: por que ESTA não toma mutex | 2 |
| `backend/tests/Feature/Comercial/PrimaryConcurrencyTest.php` | as duas camadas de prova do item 1 | 2 |
| `backend/app/Domains/Identity/Actions/UpdateStaffUserAction.php` | unicidade de RUT/e-mail para dentro da transação | 3 |
| `backend/app/Domains/Identity/Actions/UpdateRedatorAction.php` | unicidade de RUT para dentro da transação | 3 |
| `backend/tests/Feature/Shared/UniquenessInsideTransactionTest.php` | guarda dos três sítios | 3 |
| `backend/app/Domains/Identity/Data/UserData.php` | `getRoleNames()` uma vez só | 4 |
| `backend/tests/Feature/Identity/SuperadminGuardTest.php` | superadmin inativo não conta | 5 |
| `backend/tests/Feature/Identity/StaffUserActionTest.php` | auto-colisão + a porta que recusa `redator` | 5 |
| `backend/tests/Feature/Identity/CreateRoleActionTest.php` | error-bag: `name` e `permissions` | 5 |
| `backend/tests/Feature/Identity/UpdateRoleActionTest.php` | error-bag: `name` e `permissions` | 5 |
| `docs/superpowers/state.md` | transições de estado | 2, 6 |

---

### Task 0: Baseline reconferido, não herdado

**Files:** nenhum. **Sem commit.**

- [ ] **Step 1: Suíte em sqlite**

```bash
docker compose exec -T app php artisan test
```

Esperado: `Tests: 1 skipped, 524 passed (1963 assertions)`. Divergiu → **PARE** e reporte; o plano inteiro compara contra este número.

- [ ] **Step 2: O harness existente, contra MySQL real**

```bash
docker compose exec -T -e DB_CONNECTION=mysql -e DB_DATABASE=lotus_test app php artisan test --filter=CertificateNumberTest
```

Esperado: `Tests: 3 passed (20 assertions)`. Este é o placar que a Task 1 tem de reproduzir depois da extração.

Falhou por banco ausente → **PARE**. `lotus_test` tem de existir e estar migrado; **não** rode `migrate:fresh` no banco de dev.

- [ ] **Step 3: Árvore limpa e branch certa**

```bash
git status --porcelain && git branch --show-current
```

Esperado: saída vazia na primeira, `hardening/integridade-e-concorrencia-backend` na segunda.

---

### Task 1: O harness da sonda sai do `CertificateNumberTest`

**Files:**
- Create: `backend/tests/Support/ProbesMysqlConcurrency.php`
- Modify: `backend/tests/Feature/Certification/CertificateNumberTest.php`

**Interfaces:**
- Consumes: nada.
- Produces: o trait `Tests\Support\ProbesMysqlConcurrency`, com quatro métodos protegidos que a Task 2 usa:
  - `skipUnlessMysql(): void`
  - `mysqlGateConnection(string $name): \Illuminate\Database\Connection`
  - `mysqlChildProcess(string $script, array $args = []): \Symfony\Component\Process\Process`
  - `waitUntilProcessesAreWaitingForMysqlLock(\Illuminate\Database\Connection $observer, array $processes, int $minimum, ?string $table = null): int`

**Critério desta task: comportamento idêntico.** Extração não é refatoração de teste — o caso do certificado tem de sair com o **mesmo placar** do Step 2 da Task 0.

- [ ] **Step 1: Criar o trait**

Arquivo `backend/tests/Support/ProbesMysqlConcurrency.php`:

```php
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
```

- [ ] **Step 2: Migrar o `CertificateNumberTest` para o trait**

Em `backend/tests/Feature/Certification/CertificateNumberTest.php`:

Trocar o bloco de `use` do topo do arquivo:

```php
use App\Domains\Certification\Services\CertificateNumberService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Symfony\Component\Process\Process;
use Tests\Support\ProbesMysqlConcurrency;
use Tests\TestCase;
```

(saem `Illuminate\Database\Connection` — o método que o usava foi para o trait.)

Trocar a declaração de traits da classe:

```php
class CertificateNumberTest extends TestCase
{
    use ProbesMysqlConcurrency;
    use RefreshDatabase;
```

Trocar a abertura do caso concorrente:

```php
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
```

Trocar a chamada da espera (era `waitUntilBothProcessesAreWaitingForMysqlLock`):

```php
            $waitingCount = $this->waitUntilProcessesAreWaitingForMysqlLock(
                $gate,
                $processes,
                count($processes),
                'certificate_sequences',
            );
            $this->assertGreaterThanOrEqual(2, $waitingCount);
```

Trocar a construção do processo, mantendo o script byte a byte:

```php
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
```

**Apagar** por inteiro o método privado `waitUntilBothProcessesAreWaitingForMysqlLock` e o `use Illuminate\Database\Connection;`. Todo o resto do arquivo — o gate, o laço de `start()`/`waitUntil`, as asserções, o `finally` — fica **inalterado**.

- [ ] **Step 3: O caso do certificado, contra MySQL**

```bash
docker compose exec -T -e DB_CONNECTION=mysql -e DB_DATABASE=lotus_test app php artisan test --filter=CertificateNumberTest
```

Esperado: `Tests: 3 passed (20 assertions)` — **o mesmo placar** do Step 2 da Task 0. Qualquer divergência de contagem significa que a extração mudou o teste; **PARE** e desfaça.

- [ ] **Step 4: A suíte em sqlite não regrediu**

```bash
docker compose exec -T app php artisan test
```

Esperado: `Tests: 1 skipped, 524 passed (1963 assertions)`. O trait ainda não é consumido por ninguém além do certificado.

- [ ] **Step 5: Pint e commit**

```bash
cd backend && ./vendor/bin/pint tests/Support/ProbesMysqlConcurrency.php tests/Feature/Certification/CertificateNumberTest.php
```

Esperado: `PASS`.

```bash
git add backend/tests/Support/ProbesMysqlConcurrency.php backend/tests/Feature/Certification/CertificateNumberTest.php
git commit -m "$(cat <<'EOF'
refactor(test): extrai o harness de concorrencia MySQL para tests/Support

Placar do CertificateNumberTest identico ao baseline: 3 passed (20 assertions).
A espera ganha minimo explicito e filtro de tabela opcional; o caso do
certificado passa count($processes) e 'certificate_sequences', que e o
comportamento anterior.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: O lock — mutex por cliente e leitura travada da coleção

**Files:**
- Create: `backend/tests/Feature/Comercial/PrimaryConcurrencyTest.php`
- Modify: `backend/app/Domains/Commercial/Models/Client.php`
- Modify: `backend/app/Domains/Commercial/Services/PrimaryContactService.php:24-27`
- Modify: `backend/app/Domains/Commercial/Services/PrimaryAddressService.php:30-33`
- Modify: `backend/app/Domains/Commercial/Actions/UpdateClientAction.php:31`
- Modify: `backend/app/Domains/Commercial/Actions/CreateClientContactAction.php:21`
- Modify: `backend/app/Domains/Commercial/Actions/UpdateClientContactAction.php:21`
- Modify: `backend/app/Domains/Commercial/Actions/CreateClientAddressAction.php:21`
- Modify: `backend/app/Domains/Commercial/Actions/UpdateClientAddressAction.php:21`
- Modify: `backend/app/Domains/Commercial/Actions/CreateClientAction.php:27`
- Modify: `docs/superpowers/state.md`

**Interfaces:**
- Consumes: `Tests\Support\ProbesMysqlConcurrency` (Task 1).
- Produces: `App\Domains\Commercial\Models\Client::lockForWrite(int $clientId): void` — estático, sem retorno, consumido pelas cinco Actions.

**Um commit só.** O Q-16 pede os dois serviços no mesmo commit, e o mutex sem a leitura travada é mecanismo que promete e não fecha (spec §3.1).

`DeleteClientContactAction` **não** é tocado: ele já carrega lock próprio (Q-5) e não decide quem é principal.

- [ ] **Step 1: Escrever o teste das duas camadas**

Arquivo `backend/tests/Feature/Comercial/PrimaryConcurrencyTest.php`:

```php
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
```

A limpeza apaga só o `users` da sonda: `clients` e os nested caem por FK `cascadeOnDelete` (delete pelo query builder é DELETE de verdade, não soft-delete).

- [ ] **Step 2: Ver o defeito, contra MySQL real**

```bash
docker compose exec -T -e DB_CONNECTION=mysql -e DB_DATABASE=lotus_test app php artisan test --filter=PrimaryConcurrencyTest
```

Esperado: **2 failed, 2 passed**. Os dois casos de MySQL reprovam na asserção final, nomeando os dois principais que sobreviveram:

```
Failed asserting that two arrays are identical.
- 'SONDA-C'
+ 'SONDA-B'
+ 'SONDA-C'
```

Os dois casos de sqlite (que também rodam aqui) passam — o `ensureSingle` já roda dentro da transação hoje; eles são guarda, não correção.

Reprovou por timeout ou por `MySQL não registrou 1 processo(s) esperando pelo lock` → o alinhamento não pegou; **PARE** e reporte antes de mexer em produção.

- [ ] **Step 3: O mutex, num lugar só**

Em `backend/app/Domains/Commercial/Models/Client.php`, acrescentar depois de `loadListingData()`:

```php
    /**
     * Mutex por cliente: serializa as regiões críticas que decidem qual contato
     * ou endereço fica `is_primary`. Tem de ser tomado ANTES de qualquer escrita
     * da transação — tomá-lo depois inverte a ordem dos locks e produz
     * `SQLSTATE[40001] ... 1213 Deadlock found when trying to get lock`, medido
     * em 2026-08-11 contra MySQL real.
     *
     * `withTrashed()` porque isto não é consulta: cliente arquivado não pode
     * virar "sem mutex" em silêncio.
     *
     * No-op SILENCIOSO em sqlite (`SQLiteGrammar::compileLock()` devolve `''`).
     * Quem prova que ele funciona é `PrimaryConcurrencyTest`, em MySQL.
     */
    public static function lockForWrite(int $clientId): void
    {
        static::withTrashed()->whereKey($clientId)->lockForUpdate()->first();
    }
```

- [ ] **Step 4: Leitura travada nos dois serviços**

Em `backend/app/Domains/Commercial/Services/PrimaryContactService.php`, trocar a leitura de `ensureSingle()`:

```php
        $primaries = $client->contacts()
            ->where('is_primary', true)
            ->orderBy('id')
            // Leitura TRAVADA, não comum: em REPEATABLE READ o SELECT comum volta
            // do snapshot da transação e NÃO enxerga o principal que a transação
            // concorrente já commitou. A contagem daria 1, o early-return abaixo
            // dispararia e os dois principais sobreviveriam — medido em
            // 2026-08-11. Isto faz a transação ENXERGAR; quem SERIALIZA é o
            // `Client::lockForWrite()` que a Action toma antes de escrever.
            ->lockForUpdate()
            ->get();
```

Acrescentar ao docblock da classe, antes do fecho `*/`:

```php
 *
 * Concorrência: este serviço NÃO serializa nada sozinho. Quem chama abre a
 * transação E toma `Client::lockForWrite()` antes de qualquer escrita.
```

Em `backend/app/Domains/Commercial/Services/PrimaryAddressService.php`, o espelho exato sobre `$client->addresses()` — mesmo comentário, mesma cláusula no docblock.

- [ ] **Step 5: O mutex nas cinco Actions**

`backend/app/Domains/Commercial/Actions/UpdateClientAction.php` — primeira linha dentro da transação:

```php
        return DB::transaction(function () use ($client, $data, $rut) {
            // Mutex ANTES de qualquer escrita: depois inverteria a ordem dos
            // locks e produziria deadlock (ver Client::lockForWrite).
            Client::lockForWrite($client->id);

            $client->user->update([
```

`backend/app/Domains/Commercial/Actions/CreateClientContactAction.php`:

```php
        return DB::transaction(function () use ($client, $data) {
            Client::lockForWrite($client->id);

            $contact = $client->contacts()->create($data->toArray());
```

`backend/app/Domains/Commercial/Actions/UpdateClientContactAction.php` — acrescentar `use App\Domains\Commercial\Models\Client;` ao bloco de imports:

```php
        return DB::transaction(function () use ($contact, $data) {
            Client::lockForWrite($contact->client_id);

            $contact->update($data->toArray());
```

`backend/app/Domains/Commercial/Actions/CreateClientAddressAction.php`:

```php
        return DB::transaction(function () use ($client, $data) {
            Client::lockForWrite($client->id);

            $address = $client->addresses()->create($data->toArray());
```

`backend/app/Domains/Commercial/Actions/UpdateClientAddressAction.php` — acrescentar `use App\Domains\Commercial\Models\Client;`:

```php
        return DB::transaction(function () use ($address, $data) {
            Client::lockForWrite($address->client_id);

            $address->update($data->toArray());
```

`backend/app/Domains/Commercial/Actions/CreateClientAction.php` — **sem mutex**, com a razão escrita, logo dentro da transação:

```php
        return DB::transaction(function () use ($data) {
            // Sem `Client::lockForWrite()`: o cliente nasce aqui. Não existe
            // transação concorrente disputando um id que ainda não foi gerado.
            $user = $this->users->provision(
```

- [ ] **Step 6: Verde contra MySQL**

```bash
docker compose exec -T -e DB_CONNECTION=mysql -e DB_DATABASE=lotus_test app php artisan test --filter=PrimaryConcurrencyTest
```

Esperado: `Tests: 4 passed`.

Saiu `SQLSTATE[40001] ... 1213 Deadlock found` no `getErrorOutput()` de um dos processos → o mutex ficou depois de alguma escrita. Confira a ordem no Step 5; **não** relaxe a asserção de exit code.

- [ ] **Step 7: Verde em sqlite, com o placar novo**

```bash
docker compose exec -T app php artisan test
```

Esperado: `Tests: 3 skipped, 526 passed`. Os 3 skipped são os dois casos de MySQL deste arquivo mais o do certificado; os 526 são os 524 do baseline mais as duas guardas de transação.

- [ ] **Step 8: Ver as guardas de sqlite reprovando contra o mutante**

Mutante: em `UpdateClientContactAction`, mover `$this->primaryContacts->ensureSingle($contact->client, $contact);` para **depois** do fecho de `DB::transaction(...)`, operando sobre o contato retornado.

```bash
docker compose exec -T app php artisan test --filter=PrimaryConcurrencyTest
```

Esperado: `test_rebaixamento_de_contato_roda_dentro_de_transacao` **reprova**, com `Failed asserting that 1 is identical to 2` e a mensagem `o rebaixamento rodou fora da transação da Action`.

Desfaça o mutante e confirme a árvore limpa:

```bash
git diff --stat backend/app/Domains/Commercial/Actions/UpdateClientContactAction.php
```

Esperado: só a linha do mutex do Step 5 no diff.

- [ ] **Step 9: Estado para `executing`**

Em `docs/superpowers/state.md`, no frontmatter:

```yaml
workflow_state: executing
next_owner: claude
next_action: continue_active_plan
updated_at: 2026-08-11T<hh:mm>-03:00
```

Esta é a primeira task durável do bloco; a transição entra no mesmo commit dela, como o `/executar-bloco` manda (a etapa foi pulada no bloco anterior e o registro do `state.md` diz isso).

- [ ] **Step 10: Pint e commit**

```bash
cd backend && ./vendor/bin/pint app/Domains/Commercial/Models/Client.php app/Domains/Commercial/Services/PrimaryContactService.php app/Domains/Commercial/Services/PrimaryAddressService.php app/Domains/Commercial/Actions/CreateClientAction.php app/Domains/Commercial/Actions/UpdateClientAction.php app/Domains/Commercial/Actions/CreateClientContactAction.php app/Domains/Commercial/Actions/UpdateClientContactAction.php app/Domains/Commercial/Actions/CreateClientAddressAction.php app/Domains/Commercial/Actions/UpdateClientAddressAction.php tests/Feature/Comercial/PrimaryConcurrencyTest.php
```

Esperado: `PASS`.

```bash
git add backend/app/Domains/Commercial backend/tests/Feature/Comercial/PrimaryConcurrencyTest.php docs/superpowers/state.md
git commit -m "$(cat <<'EOF'
fix(comercial): fecha a janela de dois principais por cliente (Q-16)

Mutex por cliente (Client::lockForWrite) tomado antes de qualquer escrita nas
cinco Actions que disputam, mais leitura travada da colecao de principais nos
dois servicos. So o mutex nao basta: em REPEATABLE READ o SELECT comum volta do
snapshot e a contagem daria 1, com early-return e dois principais vivos.

Visto vermelho contra MySQL real antes do fix: principais ao fim
["SONDA-B","SONDA-C"], com o performance_schema confirmando os dois processos
em disputa. Depois: ["SONDA-C"].

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Unicidade de RUT/e-mail para dentro da transação

**Files:**
- Create: `backend/tests/Feature/Shared/UniquenessInsideTransactionTest.php`
- Modify: `backend/app/Domains/Identity/Actions/UpdateStaffUserAction.php:34-40`
- Modify: `backend/app/Domains/Commercial/Actions/UpdateClientAction.php:29-31`
- Modify: `backend/app/Domains/Identity/Actions/UpdateRedatorAction.php:33`

**Interfaces:**
- Consumes: `Tests\Support\CreatesDomainRecords` (`makeClientWithUser`), já no repositório.
- Produces: nada consumido por tasks seguintes.

**Limitação declarada, não esquecida (spec §4):** mover para dentro dá atomicidade de check+write; **não** fecha a corrida. Duas escritas concorrentes com o mesmo RUT continuam colidindo no índice único de `users.rut` e subindo **500**, não 422. Converter isso em 422 foi recusado na D3.

- [ ] **Step 1: Escrever a guarda dos três sítios**

Arquivo `backend/tests/Feature/Shared/UniquenessInsideTransactionTest.php`:

```php
<?php

namespace Tests\Feature\Shared;

use App\Domains\Commercial\Actions\UpdateClientAction;
use App\Domains\Commercial\Data\ClientData;
use App\Domains\Identity\Actions\UpdateRedatorAction;
use App\Domains\Identity\Actions\UpdateStaffUserAction;
use App\Domains\Identity\Data\RedatorData;
use App\Domains\Identity\Data\UserData;
use App\Domains\Identity\Models\Redator;
use App\Domains\Identity\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Database\Events\QueryExecuted;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\Support\CreatesDomainRecords;
use Tests\TestCase;

/**
 * A checagem de unicidade (RUT/e-mail) tem de rodar DENTRO da transação que
 * escreve. Fora dela, check e write são duas operações independentes e a janela
 * entre as duas é real. Os irmãos que já fazem certo — `CreateStaffUserAction`,
 * `CreateStudentAction`, `UpdateStudentAction` — são a referência.
 *
 * A suíte roda sqlite `:memory:`: este teste NÃO fecha a corrida. Ele prova a
 * atomicidade de check+write, que é a condição sem a qual nada mais adianta. A
 * corrida em si continua aberta e declarada (spec §4): duas escritas
 * concorrentes com o mesmo RUT colidem no índice único de `users.rut` — que não
 * distingue `deleted_at`, razão de o check existir com `withTrashed` — e sobem
 * 500, não 422.
 */
class UniquenessInsideTransactionTest extends TestCase
{
    use CreatesDomainRecords;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);
    }

    public function test_unicidade_do_staff_roda_dentro_da_transacao(): void
    {
        $user = User::factory()->create(['rut' => '12.345.678-5', 'email' => 'ana@lotus.cl']);
        $user->assignRole('admin');

        $niveis = $this->niveisDeUnicidade(['rut', 'email'], fn () => app(UpdateStaffUserAction::class)->execute(
            $user,
            UserData::from([
                'name' => 'Ana Renomeada',
                'email' => 'ana@lotus.cl',
                'rut' => '12.345.678-5',
                'role' => 'admin',
                'is_active' => true,
            ]),
        ));

        $this->assertChecouDentroDaTransacao($niveis, 'rut');
        $this->assertChecouDentroDaTransacao($niveis, 'email');
    }

    public function test_unicidade_do_cliente_roda_dentro_da_transacao(): void
    {
        $client = $this->makeClientWithUser([], ['rut' => '13.456.789-9']);

        $niveis = $this->niveisDeUnicidade(['rut'], fn () => app(UpdateClientAction::class)->execute(
            $client,
            ClientData::from([
                'name' => 'ACME',
                'legal_name' => 'ACME',
                'rut' => '13.456.789-9',
                'email' => $client->user->email,
                'type' => 'client',
                'contacts' => [['name' => 'Ana', 'is_primary' => true]],
            ]),
        ));

        $this->assertChecouDentroDaTransacao($niveis, 'rut');
    }

    public function test_unicidade_do_redator_roda_dentro_da_transacao(): void
    {
        $redator = Redator::create([
            'user_id' => User::factory()->redator()->create(['rut' => '13.456.789-9'])->id,
        ]);

        $niveis = $this->niveisDeUnicidade(['rut'], fn () => app(UpdateRedatorAction::class)->execute(
            $redator,
            RedatorData::from([
                'name' => $redator->user->name,
                'rut' => '13.456.789-9',
                'email' => $redator->user->email,
            ]),
        ));

        $this->assertChecouDentroDaTransacao($niveis, 'rut');
    }

    /**
     * Níveis de transação observados em cada `select exists(...)` que cita a
     * coluna, na ordem em que rodaram. Casar `select exists` em vez da coluna
     * entre aspas é de propósito: o UPDATE de `users` também contém `rut = ?`, e
     * o caractere de citação muda entre sqlite e MySQL. Só `->exists()` compila
     * `select exists`.
     *
     * @param  array<int, string>  $colunas
     * @return array<string, array<int, int>>
     */
    private function niveisDeUnicidade(array $colunas, callable $operacao): array
    {
        $niveis = [];

        DB::listen(function (QueryExecuted $query) use (&$niveis, $colunas): void {
            if (! str_starts_with($query->sql, 'select exists')) {
                return;
            }

            foreach ($colunas as $coluna) {
                if (str_contains($query->sql, $coluna)) {
                    $niveis[$coluna][] = $query->connection->transactionLevel();
                }
            }
        });

        $operacao();

        return $niveis;
    }

    /** @param  array<string, array<int, int>>  $niveis */
    private function assertChecouDentroDaTransacao(array $niveis, string $coluna): void
    {
        $this->assertArrayHasKey($coluna, $niveis, "a checagem de unicidade de {$coluna} não rodou");
        // 2, não 1: o `RefreshDatabase` já mantém uma transação aberta durante o
        // teste inteiro. Asserir `> 0` mediria o RefreshDatabase, não o código
        // sob teste.
        $this->assertSame(2, $niveis[$coluna][0], "a unicidade de {$coluna} foi checada FORA da transação que escreve");
    }
}
```

- [ ] **Step 2: Ver os três reprovando**

```bash
docker compose exec -T app php artisan test --filter=UniquenessInsideTransactionTest
```

Esperado: `Tests: 3 failed`, cada um com `Failed asserting that 1 is identical to 2` e a mensagem `a unicidade de rut foi checada FORA da transação que escreve`.

- [ ] **Step 3: `UpdateStaffUserAction` — checagem para dentro**

Trocar o miolo de `execute()` (o guard do superadmin fica onde está — ele barra ANTES de qualquer escrita e não é unicidade):

```php
        return DB::transaction(function () use ($user, $data) {
            // Unicidade DENTRO da transação: fora dela, check e write são duas
            // operações independentes. Molde dos irmãos que já faziam certo
            // (CreateStaffUserAction, Create/UpdateStudentAction).
            $rut = ($data->rut instanceof Optional || $data->rut === null)
                ? null
                : $this->users->ensureRutAvailable($data->rut, $user->id);

            $this->users->ensureEmailAvailable($data->email, $user->id);

            $attrs = [
                'name' => $data->name,
                'email' => $data->email,
                'rut' => $rut,
                'phone' => $data->phone instanceof Optional ? null : $data->phone,
                'is_active' => $data->is_active,
            ];
```

As duas chamadas somem de cima da transação, e `$rut` sai do `use (...)`.

- [ ] **Step 4: `UpdateClientAction` — checagem para dentro**

```php
    public function execute(Client $client, ClientData $data): Client
    {
        return DB::transaction(function () use ($client, $data) {
            // Mutex ANTES de qualquer escrita: depois inverteria a ordem dos
            // locks e produziria deadlock (ver Client::lockForWrite).
            Client::lockForWrite($client->id);

            // Unicidade DENTRO da transação que escreve.
            $rut = $this->users->ensureRutAvailable($data->rut, $client->user_id);

            $client->user->update([
```

A linha 29 (`$rut = ...` acima do `DB::transaction`) some, e `$rut` sai do `use (...)`.

- [ ] **Step 5: `UpdateRedatorAction` — checagem para dentro**

A linha 33 (`$rut = ...`) some; dentro da transação:

```php
            return DB::transaction(function () use ($redator, $data, $uploaded) {
                // Unicidade DENTRO da transação que escreve. Consequência
                // aceita: os binários já subiram (eles ficam fora da transação
                // por decisão registrada, D3 da spec do redator), então um RUT
                // duplicado agora sobe e descarta. O `catch` abaixo já é a
                // fonte única desse descarte — RedatorDocumentRollbackTest.
                $rut = $this->users->ensureRutAvailable($data->rut, $redator->user_id);

                $redator->user->update([
```

`$rut` sai do `use (...)`. O laço de upload e o `catch`/`discard()` **não mudam**.

- [ ] **Step 6: Verde**

```bash
docker compose exec -T app php artisan test --filter=UniquenessInsideTransactionTest
docker compose exec -T app php artisan test
```

Esperado: `Tests: 3 passed` no primeiro; `Tests: 3 skipped, 529 passed` no segundo.

- [ ] **Step 7: Pint e commit**

```bash
cd backend && ./vendor/bin/pint app/Domains/Identity/Actions/UpdateStaffUserAction.php app/Domains/Identity/Actions/UpdateRedatorAction.php app/Domains/Commercial/Actions/UpdateClientAction.php tests/Feature/Shared/UniquenessInsideTransactionTest.php
```

```bash
git add backend/app/Domains backend/tests/Feature/Shared/UniquenessInsideTransactionTest.php
git commit -m "$(cat <<'EOF'
fix(identity): unicidade de RUT/email dentro da transacao que escreve

Tres sitios, nao um: UpdateStaffUserAction, UpdateClientAction e
UpdateRedatorAction checavam antes de abrir DB::transaction. Os irmaos
CreateStaffUserAction, CreateStudentAction e UpdateStudentAction ja checavam de
dentro.

Guarda nova vista vermelha nos tres antes do fix (nivel 1 no lugar de 2).
Nao fecha a corrida: colisao concorrente segue subindo 500 pelo indice unico,
recusa registrada na D3 da spec.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: `UserData::fromModel` chama `getRoleNames()` uma vez

**Files:**
- Modify: `backend/app/Domains/Identity/Data/UserData.php:61-76`

**Interfaces:** nada consumido, nada produzido.

**Sem teste novo, e a razão é medida:** `StaffUserActionTest::test_from_model_projeta_roles_e_type` já assere `role` e `roles`, e reprovaria se a dedução mudasse o valor. E o item **não economiza query**: `getRoleNames()` faz `loadMissing('roles')` e a segunda chamada lê a relação em cache — a dedução é de `pluck`, não de `SELECT` (D4 da spec).

- [ ] **Step 1: Guardar a coleção**

```php
    public static function fromModel(User $user): self
    {
        // Uma chamada só. A segunda não custava SELECT (a relação já vem de
        // `loadMissing`), custava um `pluck` — e escondia que as duas
        // projeções vêm da MESMA fonte.
        $roles = $user->getRoleNames();

        return new self(
            id: $user->id,
            uuid: $user->uuid,
            name: $user->name,
            email: $user->email,
            rut: $user->rut,
            phone: $user->phone,
            role: $roles->first() ?? '',
            is_active: $user->is_active,
            type: $user->type,
            roles: $roles->all(),
            photo_url: $user->photo_path,
        );
    }
```

- [ ] **Step 2: A projeção não mudou**

```bash
docker compose exec -T app php artisan test --filter=StaffUserActionTest
```

Esperado: `Tests: 11 passed`.

- [ ] **Step 3: `generated.ts` intocado**

```bash
docker compose exec -T app php artisan typescript:transform && git diff --stat frontend/src/shared/types/generated.ts
```

Esperado: saída vazia no `git diff` — a forma do DTO é a mesma.

- [ ] **Step 4: Pint e commit**

```bash
cd backend && ./vendor/bin/pint app/Domains/Identity/Data/UserData.php
```

```bash
git add backend/app/Domains/Identity/Data/UserData.php
git commit -m "$(cat <<'EOF'
refactor(identity): UserData::fromModel chama getRoleNames uma vez

Deducao de pluck, nao de SELECT: getRoleNames faz loadMissing e a segunda
chamada le a relacao em cache. generated.ts sem diff.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Os quatro testes que faltam

**Files:**
- Modify: `backend/tests/Feature/Identity/SuperadminGuardTest.php`
- Modify: `backend/tests/Feature/Identity/StaffUserActionTest.php`
- Modify: `backend/tests/Feature/Identity/CreateRoleActionTest.php`
- Modify: `backend/tests/Feature/Identity/UpdateRoleActionTest.php`

**Interfaces:** nada consumido, nada produzido.

Cada um nasce com o mutante que o justifica, **visto reprovando antes de virar verde**. Chaves conferidas no código, não supostas: `PermissionCatalog::assertAssignable()` lança em `permissions`; as duas Role Actions lançam em `name`; o `SuperadminGuard` lança em `role`.

- [ ] **Step 1: Superadmin inativo não conta**

Acrescentar a `SuperadminGuardTest`, junto do `use Illuminate\Validation\ValidationException;` que já existe:

```php
    /**
     * O `->where('is_active', true)` do guard é o que impede o lock-out real:
     * um superadmin inativo não loga (RN-01), então ele não é saída de
     * emergência nenhuma. Sem este caso, remover o filtro deixa a suíte inteira
     * verde e o sistema pode ficar sem NENHUM superadmin capaz de entrar.
     */
    public function test_outro_superadmin_inativo_nao_conta_como_ativo(): void
    {
        $sa1 = User::factory()->create();
        $sa1->assignRole('superadmin');
        $sa2 = User::factory()->inactive()->create();
        $sa2->assignRole('superadmin');

        try {
            app(SuperadminGuard::class)->assertNotLastActiveSuperadmin($sa1);
            $this->fail('esperava ValidationException: o outro superadmin está inativo');
        } catch (ValidationException $e) {
            $this->assertArrayHasKey('role', $e->errors());
        }
    }
```

- [ ] **Step 2: Ver reprovando contra o mutante**

Mutante: apagar `->where('is_active', true)` de `SuperadminGuard::assertNotLastActiveSuperadmin`.

```bash
docker compose exec -T app php artisan test --filter=SuperadminGuardTest
```

Esperado: `test_outro_superadmin_inativo_nao_conta_como_ativo` reprova com `esperava ValidationException: o outro superadmin está inativo`. Desfaça o mutante.

- [ ] **Step 3: Auto-colisão de RUT/e-mail no próprio update**

Acrescentar a `StaffUserActionTest`:

```php
    /**
     * O próprio usuário não colide consigo mesmo. Mutante: remover o
     * `when($exceptUserId !== null, ...)` do `UserProvisioner` — todo update que
     * mantém RUT e e-mail passaria a dar 422, e a tela de edição travaria para
     * qualquer usuário que só troca o nome.
     */
    public function test_update_com_o_proprio_rut_e_email_nao_colide(): void
    {
        $user = User::factory()->create(['rut' => '12.345.678-5', 'email' => 'ana@lotus.cl']);
        $user->assignRole('admin');

        app(UpdateStaffUserAction::class)->execute($user, UserData::from([
            'name' => 'Ana Renomeada',
            'email' => 'ana@lotus.cl',
            'rut' => '12.345.678-5',
            'role' => 'admin',
            'is_active' => true,
        ]));

        $fresh = $user->fresh();
        $this->assertSame('Ana Renomeada', $fresh->name);
        $this->assertSame('12.345.678-5', $fresh->rut);
        $this->assertSame('ana@lotus.cl', $fresh->email);
    }
```

- [ ] **Step 4: A porta que recusa `role: redator`**

Trocar o corpo de `StaffUserActionTest::test_role_redator_rejeitada_na_validacao`, mantendo o comentário existente sobre `validateAndCreate` e acrescentando `use App\Domains\Identity\Models\Role;` aos imports:

```php
    public function test_role_redator_rejeitada_na_validacao(): void
    {
        // validateAndCreate (não from): config('data.validation_strategy') é
        // 'only_requests' (default do pacote) — from() com array puro não roda
        // rules(), só um Request de verdade dispara (fluxo real do controller).
        // validateAndCreate força a validação aqui para provar UserData::rules().
        //
        // Guarda de porta múltipla (`.claude/rules/backend-ddd.md`): `role` tem
        // TRÊS regras — `required`, `exists:roles,name` e `notIn` — e as três
        // reprovam com a mesma chave E a mesma mensagem do Laravel. Afirmar a
        // chave não discrimina nada. O que discrimina é provar que a role
        // `redator` EXISTE: isso fecha a porta do `exists` e deixa só o `notIn`
        // podendo recusar.
        $this->assertTrue(
            Role::where('name', 'redator')->exists(),
            'o seeder não criou a role redator; o exists reprovaria no lugar do notIn',
        );

        try {
            UserData::validateAndCreate([
                'name' => 'X', 'email' => 'x@lotus.cl',
                'password' => 'secret123', 'role' => 'redator',
            ]);
            $this->fail('esperava ValidationException');
        } catch (ValidationException $e) {
            $this->assertArrayHasKey('role', $e->errors());
        }
    }
```

- [ ] **Step 5: Ver os dois de `StaffUserActionTest` reprovando**

Mutante A: apagar o `->when($exceptUserId !== null, fn ($q) => $q->where('id', '!=', $exceptUserId))` de `UserProvisioner::ensureRutAvailable`.

```bash
docker compose exec -T app php artisan test --filter=StaffUserActionTest
```

Esperado: `test_update_com_o_proprio_rut_e_email_nao_colide` reprova com `Illuminate\Validation\ValidationException: Este RUT já está cadastrado.` Desfaça.

Mutante B: apagar `Rule::notIn(['redator'])` de `UserData::rules()`.

```bash
docker compose exec -T app php artisan test --filter=StaffUserActionTest
```

Esperado: `test_role_redator_rejeitada_na_validacao` reprova com `esperava ValidationException`. Desfaça.

- [ ] **Step 6: Error-bag das duas Role Actions**

Em `CreateRoleActionTest`, trocar os dois casos que hoje só afirmam a classe:

```php
    public function test_rejeita_permissao_segregada(): void
    {
        try {
            app(CreateRoleAction::class)->execute(
                RoleData::from(['name' => 'x', 'permissions' => ['identity.access.manage']]),
            );
            $this->fail('esperava ValidationException');
        } catch (ValidationException $e) {
            // A chave é o que a tela lê para destacar o campo. `expectException`
            // sozinho passaria com QUALQUER outra porta recusando primeiro.
            $this->assertArrayHasKey('permissions', $e->errors());
        }
    }

    public function test_rejeita_nome_duplicado(): void
    {
        try {
            app(CreateRoleAction::class)->execute(
                RoleData::from(['name' => 'admin', 'permissions' => []]),
            );
            $this->fail('esperava ValidationException');
        } catch (ValidationException $e) {
            $this->assertArrayHasKey('name', $e->errors());
        }
    }
```

Em `UpdateRoleActionTest`, trocar o caso de colisão e acrescentar o de permissão:

```php
    public function test_rejeita_colisao_de_nome_com_outra_role(): void
    {
        app(CreateRoleAction::class)->execute(
            RoleData::from(['name' => 'coordinador', 'permissions' => []]),
        );

        $supervisor = app(CreateRoleAction::class)->execute(
            RoleData::from(['name' => 'supervisor', 'permissions' => []]),
        );

        try {
            app(UpdateRoleAction::class)->execute(
                $supervisor,
                RoleData::from(['name' => 'coordinador', 'permissions' => []]),
            );
            $this->fail('esperava ValidationException');
        } catch (ValidationException $e) {
            $this->assertArrayHasKey('name', $e->errors());
        }
    }

    public function test_rejeita_permissao_segregada(): void
    {
        $role = app(CreateRoleAction::class)->execute(
            RoleData::from(['name' => 'coordinador', 'permissions' => []]),
        );

        try {
            app(UpdateRoleAction::class)->execute(
                $role,
                RoleData::from(['name' => 'coordinador', 'permissions' => ['identity.access.manage']]),
            );
            $this->fail('esperava ValidationException');
        } catch (ValidationException $e) {
            $this->assertArrayHasKey('permissions', $e->errors());
        }
    }
```

O `$coordinador` que o teste de colisão criava sem usar some — a variável nunca foi lida.

- [ ] **Step 7: Ver os quatro error-bags reprovando**

Mutante: trocar a chave `'name'` por `'nome'` nas duas `ValidationException::withMessages` (`CreateRoleAction`, `UpdateRoleAction`) e `'permissions'` por `'permissoes'` em `PermissionCatalog::assertAssignable`.

```bash
docker compose exec -T app php artisan test --filter='CreateRoleActionTest|UpdateRoleActionTest'
```

Esperado: **4 failed**, cada um com `Failed asserting that an array has the key 'name'` ou `'permissions'`. Desfaça os três mutantes.

- [ ] **Step 8: Verde e placar**

```bash
docker compose exec -T app php artisan test
```

Esperado: `Tests: 3 skipped, 532 passed`.

- [ ] **Step 9: Pint e commit**

```bash
cd backend && ./vendor/bin/pint tests/Feature/Identity/SuperadminGuardTest.php tests/Feature/Identity/StaffUserActionTest.php tests/Feature/Identity/CreateRoleActionTest.php tests/Feature/Identity/UpdateRoleActionTest.php
```

```bash
git add backend/tests/Feature/Identity
git commit -m "$(cat <<'EOF'
test(identity): as quatro portas que passavam sem prova

Superadmin inativo nao conta como ativo; auto-colisao de RUT/email no proprio
update; a recusa de role redator prova que o exists estava aberto; error-bag das
duas Role Actions afirma name e permissions.

Cada um visto vermelho contra seu mutante antes do verde.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Gate do bloco

**Files:**
- Modify: `docs/superpowers/state.md`

**Nenhum código muda aqui.** Se algum item do gate reprovar, a correção é uma task própria, não um remendo dentro do gate.

- [ ] **Step 1: A suíte em sqlite**

```bash
docker compose exec -T app php artisan test
```

Esperado: `Tests: 3 skipped, 532 passed`. Registre o total de assertions observado.

- [ ] **Step 2: As duas sondas, contra MySQL real**

```bash
docker compose exec -T -e DB_CONNECTION=mysql -e DB_DATABASE=lotus_test app php artisan test --filter='CertificateNumberTest|PrimaryConcurrencyTest'
```

Esperado: `Tests: 7 passed` — os 3 do certificado (harness extraído sem afrouxar o caso) mais os 4 do bloco.

- [ ] **Step 3: Pint em tudo que o bloco tocou**

```bash
cd backend && ./vendor/bin/pint --test \
  app/Domains/Commercial/Models/Client.php \
  app/Domains/Commercial/Services/PrimaryContactService.php \
  app/Domains/Commercial/Services/PrimaryAddressService.php \
  app/Domains/Commercial/Actions/CreateClientAction.php \
  app/Domains/Commercial/Actions/UpdateClientAction.php \
  app/Domains/Commercial/Actions/CreateClientContactAction.php \
  app/Domains/Commercial/Actions/UpdateClientContactAction.php \
  app/Domains/Commercial/Actions/CreateClientAddressAction.php \
  app/Domains/Commercial/Actions/UpdateClientAddressAction.php \
  app/Domains/Identity/Actions/UpdateStaffUserAction.php \
  app/Domains/Identity/Actions/UpdateRedatorAction.php \
  app/Domains/Identity/Data/UserData.php \
  tests/Support/ProbesMysqlConcurrency.php \
  tests/Feature/Certification/CertificateNumberTest.php \
  tests/Feature/Comercial/PrimaryConcurrencyTest.php \
  tests/Feature/Shared/UniquenessInsideTransactionTest.php \
  tests/Feature/Identity/SuperadminGuardTest.php \
  tests/Feature/Identity/StaffUserActionTest.php \
  tests/Feature/Identity/CreateRoleActionTest.php \
  tests/Feature/Identity/UpdateRoleActionTest.php
```

Esperado: `PASS`. Os 20 arquivos são a lista fechada do bloco — confira contra `git diff --name-only main...HEAD -- '*.php'`. **Nunca** alimente o Pint por substituição de comando: lista vazia vira Pint sem argumento, que reformata o repositório inteiro.

- [ ] **Step 4: Contratos e fronteiras**

```bash
docker compose exec -T app php artisan typescript:transform
git diff --stat frontend/src/shared/types/generated.ts
git diff --stat main...HEAD -- backend/database/ frontend/
```

Esperado: as três saídas **vazias**.

- [ ] **Step 5: Nenhuma sonda sobrevivente**

```bash
git status --porcelain
git diff main...HEAD -- backend/app/ | grep -n 'SONDA\|dd(\|dump(' || echo 'limpo'
```

Esperado: primeira vazia, segunda `limpo`.

- [ ] **Step 6: Banco de dev intocado**

```bash
docker compose exec -T mysql mysql -uroot -psecret -N -e "SELECT codigo FROM lotus.certificates WHERE codigo='LOT-2026-1001';"
```

(a coluna é `codigo`, não `number` — conferido no schema do banco de dev.)

Esperado: `LOT-2026-1001` — o registro corrompido de propósito segue lá, esperando o checkpoint visual do João. Ausente → alguém rodou `migrate:fresh`; **PARE** e reporte.

- [ ] **Step 7: Estado para `ready_for_review`**

Em `docs/superpowers/state.md`, frontmatter:

```yaml
workflow_state: ready_for_review
next_owner: claude
next_action: request_code_review
active_plan: docs/superpowers/plans/2026-08-11-integridade-e-concorrencia-backend.md
updated_at: 2026-08-11T<hh:mm>-03:00
```

E, na seção `## Item ativo`, uma subseção `### Execução — 2026-08-11` com: os commits na ordem do plano, o placar reconferido dos Steps 1 e 2, o texto exato da reprovação vista antes de cada correção, os desvios que a execução produziu, e **o que o gate NÃO provou** — a corrida de unicidade segue aberta (500, não 422) e a suíte sqlite segue sem enxergar lock nenhum.

- [ ] **Step 8: Commit do gate**

```bash
git add docs/superpowers/state.md
git commit -m "$(cat <<'EOF'
docs(state): integridade-e-concorrencia-backend executado, ready_for_review

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

Review, fechamento, push e PR **não** rodam automaticamente.

---

## Desvios do plano

Nove medições feitas ao escrever este plano mudaram o que a spec dizia. Registradas em vez de silenciadas.

**D-P1 — o mutex sai do `ensureSingle` e vai para as Actions; cinco Actions mudam, não zero.** A spec §3.2 põe as duas peças do lock no topo de `ensureSingle()` e afirma "Nenhuma Action muda". Medido contra MySQL real: nessa forma o mutex é tomado **depois** de a Action já ter escrito (o `UPDATE` do próprio contato/endereço), o que inverte a ordem dos locks entre as duas transações e produz `SQLSTATE[40001]: Serialization failure: 1213 Deadlock found when trying to get lock` em `select * from clients ... for update`, matando um dos processos (exit 255) — em produção, 500 para o perdedor. A forma correta toma o mutex **antes de qualquer escrita**, o que só é possível na Action. Remedido: 2 processos esperando, os dois com exit 0, exatamente 1 principal. `CreateClientAction` fica de fora com a razão escrita no código: o cliente nasce ali, não existe concorrente disputando um id que ainda não foi gerado.

**D-P2 — o harness é trait com mínimo explícito e filtro de tabela opcional.** A spec §3.4 descreve a espera como "até N processos estarem bloqueados **na tabela observada**". O alinhamento medido precisa de **duas** esperas com limiares diferentes (1, depois 2), e a segunda **não pode** filtrar por tabela: P1 espera em `client_contacts` e P2 espera em `clients`. Daí `int $minimum` e `?string $table = null`. O `CertificateNumberTest` preserva o comportamento antigo passando `count($processes)` e `'certificate_sequences'`.

**D-P3 — o alinhamento é por `performance_schema`, não por marcador dentro do filho.** A spec §3.3 nomeia dois candidatos: gate segurando as linhas, ou sinal externo entre os processos depois do `UPDATE`. Nenhum dos dois sobrevive à exigência de o filho exercitar a **Action real** — não há onde emitir marcador entre o mutex e a escrita, porque as duas coisas estão dentro de uma chamada só. A saída medida: iniciar P1, esperar até ele estar **bloqueado** (o que só acontece depois de ele ter tomado o mutex) e só então iniciar P2. O gate segurando as linhas continua sendo a peça que cria o bloqueio.

**D-P4 — a sonda é a guarda da ORDEM dos locks, e por isso nenhuma guarda extra nasce.** As duas formas de quebrar o mecanismo têm reprovação distinta e medida: apagar o mutex deixa dois principais e a asserção final reprova; movê-lo para depois da escrita mata o filho por deadlock e `assertSame(0, $process->wait())` reprova. Uma varredura de código que tentasse provar a ordem seria promessa que a varredura não entrega — o risco central que a §8 da spec declara.

**D-P5 — a guarda de transação do item 1 escuta o REBAIXAMENTO, não qualquer `updating`.** A forma ingênua (capturar todo `eloquent.updating`) é cega: a escrita da própria Action dispara primeiro e sempre de dentro da transação, então `$niveis[0]` valeria 2 mesmo com o `ensureSingle` do lado de fora. O listener filtra pelo model que perde o `is_primary`. Sem esse filtro a guarda passaria verde contra seu próprio mutante.

**D-P6 — a guarda do item 2 casa `select exists`, não a coluna entre aspas.** A spec §4 descreve a captura como "no momento do `select ... from users where rut = ?`". Medido: o `UPDATE` de `users` do `UpdateClientAction` **também** contém `rut = ?`, e o caractere de citação muda entre sqlite (`"`) e MySQL (`` ` ``). `str_starts_with($sql, 'select exists')` é driver-agnóstico e só `->exists()` o produz.

**D-P7 — no `UpdateRedatorAction`, os binários passam a subir ANTES da checagem de RUT.** Consequência, não mudança de decisão: os uploads ficam fora da transação por decisão registrada (D3 da spec do redator), e a spec §4 deste bloco manda mover só a checagem. Um RUT duplicado agora sobe o arquivo e descarta em seguida. O `catch`/`discard()` que já existe é a fonte única desse descarte, e `RedatorDocumentRollbackTest` já o prova.

**D-P8 — três sítios, quatro asserções, três casos.** O sítio do staff checa RUT **e** e-mail; um caso assere os dois. Mantém o "um caso por alvo" do DoD (cinco casos ao todo: dois do item 1, três do item 2) sem perder a segunda checagem.

**D-P9 — o teste de `role: redator` prova a porta abrindo as outras, não afirmando a chave.** A spec §6 diz que o teste "afirma a chave `role`". Medido no código: as três regras de `role` (`required`, `exists:roles,name`, `Rule::notIn`) reprovam com a **mesma chave** e, no Laravel, com a **mesma mensagem** ("The selected role is invalid."). Afirmar a chave não discrimina porta nenhuma — seria exatamente o defeito que o item 4 existe para corrigir, reintroduzido dentro da correção. O que discrimina é asserir que a role `redator` **existe** em `roles` (o `RolePermissionSeeder` a cria), o que fecha a porta do `exists` e deixa só o `notIn` podendo recusar. A asserção da chave fica, agora como confirmação e não como prova.

## Handoff de execução

**`executor: claude`**

Critério: as Tasks 3, 4 e 5 são mecânicas e delegáveis, mas a Task 2 não é, e ela é o bloco. Ela fecha por **laço de medição contra MySQL com alinhamento de processos**: o vermelho e o verde só existem se os dois filhos realmente disputarem, e "não disputou" se manifesta como timeout do `performance_schema`, não como asserção falhando — julgar essa diferença exige ler `stdout`/`stderr` do filho, não só o placar. Soma-se a isso que o modo de falha do desenho **é um deadlock** (`SQLSTATE[40001] ... 1213`), que aparece como exit code do processo filho e precisa ser lido como sintoma de ordem de lock, não como flakiness a ser contornada com retry. E a task toca caminho de escrita auditado (lei §5.2 / ADR-08): o lock não pode mudar quem vence nem trocar o `update()` por instância — julgamento fora do texto do plano.
