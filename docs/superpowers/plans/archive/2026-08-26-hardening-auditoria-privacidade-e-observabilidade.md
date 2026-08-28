# Hardening de auditoria, privacidade e observabilidade — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** dar mecanismo executável às três lacunas de segurança medidas na spec — retenção com poda agendada de `audits` e `login_logs`, log centralizado das ações dentro do monólito e alerta mensurável de acesso suspeito — mais rotação de segredos documentada e a revisão formal do `RNF-SEC-05`.

**Architecture:** a política de retenção e os limiares de alerta viram **peças únicas de constante** (`Shared/Retention/RetentionPolicy`, `Shared/Alerts/AlertThresholds`), no mesmo idioma do `Shared/RateLimiting/RateLimits` que já existe — nenhum número mora no comando, na migration ou na rota. Dois comandos Artisan (os primeiros do projeto, que fazem nascer `app/Console/`) executam a poda em chunk por consulta crua, e um serviço `scheduler` no compose de produção é quem os roda. Um canal de log próprio mais uma fachada de métodos nomeados (`Shared/Logging/EventoDeSeguranca`) são o único caminho de escrita de evento de segurança, o que torna o não-vazamento de PII mecânico e não instrução. O detector de acesso suspeito conta nos mesmos baldes de cache que o throttle já usa e notifica por e-mail no request que cruza o limiar.

**Tech Stack:** Laravel 13 / PHP 8.3, MySQL 8, Monolog (`JsonFormatter`, `StreamHandler`), `Illuminate\Support\Facades\Schedule`, `Illuminate\Support\Facades\RateLimiter` e `Cache` sobre `CACHE_STORE=database`, `Illuminate\Notifications`, Docker Compose. Testes: PHPUnit sobre sqlite `:memory:` (`phpunit.xml`), mais prova de schema contra o MySQL real do compose de dev.

## Global Constraints

- **Auditoria só na camada de aplicação, nunca em trigger de banco** — `CLAUDE.md` §5.2, ADR-08.
- **Nenhum número de política em `routes.php`, no comando ou na migration.** Janela, limiar e chunk moram na peça única do próprio assunto — precedente `app/Shared/RateLimiting/RateLimits.php`.
- **`docker compose exec -T app php artisan …`** é como o backend roda; o host WSL não tem `mbstring`. Pint é a exceção: `cd backend && ./vendor/bin/pint <arquivos>`, **nunca sem argumento**.
- **Migration é provada contra MySQL real**, não só contra o sqlite da suíte — lição 15 de `docs/README.md`.
- **Toda catraca precisa ser vista reprovando** contra o código sem a proteção — lição 10 de `docs/README.md`.
- **`config/audit.php` mantém `console => true`** (spec D9). Nenhuma task o altera.
- **Retenção fixada pelo João:** `audits` anonimiza aos **12 meses** e é descartada aos **5 anos**; `login_logs` é descartado aos **12 meses**.
- Idiomas: dicionário novo entra nos **quatro** locales (`lang/en`, `lang/es`, `lang/es_CL`, `lang/pt_BR`) — ADR-15.
- Commits em português, no formato dos anteriores (`feat:`, `test:`, `chore:`, `docs:`).

---

## Desvios declarados em relação à spec

Dois, ambos de implementação e nenhum de escopo. Estão aqui e não escondidos numa task:

1. **Ordem de execução das fases da `audits` é descarte → anonimização**, embora a spec numere anonimização como fase 1. Rodar o descarte primeiro tira da tabela as linhas com mais de 5 anos antes que a anonimização precise tocá-las. As janelas e o resultado final são idênticos; muda só o trabalho gasto. Fica escrito no docblock do comando.
2. **O canal de log novo escreve em `stderr` por definição própria**, e é sempre endereçado por nome (`Log::channel('seguranca')`). A spec §4.5 diz "produção passa a apontar para ele"; endereçar por nome chega ao mesmo destino sem depender de `LOG_CHANNEL`/`LOG_STACK`, é determinístico no teste e faz o desenvolvimento ganhar o mesmo canal. Nenhum `.env` precisa mudar.

---

## Estrutura de arquivos

**Criar:**

| Arquivo | Responsabilidade |
|---|---|
| `backend/app/Shared/Retention/RetentionPolicy.php` | fonte única das três janelas e do tamanho de chunk |
| `backend/database/migrations/2026_08_26_000001_add_created_at_index_to_audits_table.php` | índice de `audits.created_at` |
| `backend/config/logging.php` (canal `seguranca`) | **modificar** — canal JSON sobre `stderr` |
| `backend/app/Shared/Logging/EventoDeSeguranca.php` | único caminho de escrita de evento de segurança, um método nomeado por evento |
| `backend/app/Shared/Logging/RegistraEventoDeErro.php` | traduz 403 e 429 do handler global em evento e em sinal de suspeição |
| `backend/app/Console/Commands/PodarAuditoria.php` | poda de `audits`, duas fases |
| `backend/app/Console/Commands/PodarLogins.php` | poda de `login_logs` |
| `backend/app/Shared/Alerts/AlertThresholds.php` | fonte única dos limiares e janelas das três famílias |
| `backend/app/Shared/Alerts/DetectorDeAcessoSuspeito.php` | conta ocorrências e dispara o alerta ao cruzar o limiar |
| `backend/app/Shared/Alerts/Notifications/AcessoSuspeito.php` | e-mail ao admin |
| `backend/lang/{en,es,es_CL,pt_BR}/seguranca.php` | textos do e-mail de alerta |
| `docs/operacao-segredos.md` | inventário e rotação de segredos |

**Modificar:**

| Arquivo | O que muda |
|---|---|
| `backend/routes/console.php` | agendamento dos dois comandos |
| `backend/bootstrap/app.php` | uma linha no `render()` chamando `RegistraEventoDeErro` |
| `backend/app/Domains/Identity/Http/Controllers/AuthController.php` | eventos de login concedido, recusado e logout |
| `backend/app/Shared/Http/Middleware/EnsureAccountIsActive.php` | evento e sinal de sessão revogada |
| `backend/app/Shared/RateLimiting/RateLimits.php` | `chaveDeLogin()` de `private` para `public` |
| `docker-compose.prod.yml` | serviço `scheduler` |
| `docs/adrs.md` | ADR-21 |
| `docs/der-fisico.md` | fichas de `audits` e `login_logs` ganham a retenção |
| `docs/estrutura-monolito.md` | `Console/` deixa de ser "planejado, NÃO existe ainda" |
| `docs/superpowers/pendencias/abertas.md` e `encerradas.md` | P-02 e P-33 fecham; P-62 abre |

**Testes:**

`backend/tests/Unit/Shared/RetentionPolicyTest.php`,
`backend/tests/Feature/Shared/EventoDeSegurancaTest.php`,
`backend/tests/Feature/Shared/PodaDeAuditoriaTest.php`,
`backend/tests/Feature/Shared/PodaDeLoginsTest.php`,
`backend/tests/Feature/Shared/PodaAgendadaRatchetTest.php`,
`backend/tests/Feature/Shared/EventosDeAcessoTest.php`,
`backend/tests/Feature/Shared/AcessoSuspeitoTest.php`.

---

## Task 1: Política de retenção e índice de `created_at`

**Files:**
- Create: `backend/app/Shared/Retention/RetentionPolicy.php`
- Create: `backend/database/migrations/2026_08_26_000001_add_created_at_index_to_audits_table.php`
- Test: `backend/tests/Unit/Shared/RetentionPolicyTest.php`

**Interfaces:**
- Consumes: nada.
- Produces: `RetentionPolicy::AUDITS_ANONIMIZAR_MESES` (int), `RetentionPolicy::AUDITS_DESCARTAR_MESES` (int), `RetentionPolicy::LOGIN_LOGS_DESCARTAR_MESES` (int), `RetentionPolicy::CHUNK` (int), `RetentionPolicy::limiteDeAnonimizacaoDeAudits(): CarbonImmutable`, `RetentionPolicy::limiteDeDescarteDeAudits(): CarbonImmutable`, `RetentionPolicy::limiteDeDescarteDeLoginLogs(): CarbonImmutable`.

- [ ] **Step 1: Escrever o teste que falha**

Criar `backend/tests/Unit/Shared/RetentionPolicyTest.php`:

```php
<?php

namespace Tests\Unit\Shared;

use App\Shared\Retention\RetentionPolicy;
use Illuminate\Support\Carbon;
use PHPUnit\Framework\TestCase;

/**
 * A política é peça única (spec §4.1). Este teste prova as três janelas e a
 * relação entre elas — anonimizar SEMPRE antes de descartar, senão a fase 1
 * nunca alcança linha nenhuma.
 */
class RetentionPolicyTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        Carbon::setTestNow('2026-08-26 12:00:00');
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    public function test_janelas_sao_as_decididas_pelo_joao(): void
    {
        $this->assertSame(12, RetentionPolicy::AUDITS_ANONIMIZAR_MESES);
        $this->assertSame(60, RetentionPolicy::AUDITS_DESCARTAR_MESES);
        $this->assertSame(12, RetentionPolicy::LOGIN_LOGS_DESCARTAR_MESES);
    }

    public function test_limites_sao_calculados_a_partir_de_agora(): void
    {
        $this->assertSame('2025-08-26', RetentionPolicy::limiteDeAnonimizacaoDeAudits()->toDateString());
        $this->assertSame('2021-08-26', RetentionPolicy::limiteDeDescarteDeAudits()->toDateString());
        $this->assertSame('2025-08-26', RetentionPolicy::limiteDeDescarteDeLoginLogs()->toDateString());
    }

    public function test_anonimizacao_vem_antes_do_descarte(): void
    {
        $this->assertTrue(
            RetentionPolicy::limiteDeDescarteDeAudits()->lessThan(RetentionPolicy::limiteDeAnonimizacaoDeAudits()),
            'A janela de descarte precisa ser mais antiga que a de anonimização.',
        );
    }

    public function test_chunk_e_positivo(): void
    {
        $this->assertGreaterThan(0, RetentionPolicy::CHUNK);
    }
}
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `docker compose exec -T app php artisan test --filter=RetentionPolicyTest`
Expected: FAIL com `Class "App\Shared\Retention\RetentionPolicy" not found`.

- [ ] **Step 3: Escrever a peça**

Criar `backend/app/Shared/Retention/RetentionPolicy.php`:

```php
<?php

namespace App\Shared\Retention;

use Illuminate\Support\CarbonImmutable;

/**
 * Fonte única da política de retenção (spec §4.1). Nenhum prazo mora no
 * comando, na migration ou no `routes/console.php`: quem quer saber a política
 * lê ESTE arquivo. Mesmo idioma do `Shared/RateLimiting/RateLimits`.
 *
 * As janelas foram decididas pelo João em 2026-08-26 e NÃO saem de requisito
 * escrito: nenhum RNF-SEC fixa prazo (Context Packet, key fact 2). Trocar um
 * número aqui é decisão de negócio com peso legal, não refatoração.
 *
 * `audits` tem DUAS janelas porque guarda duas coisas com valores diferentes:
 * a trilha de quem/o quê/valor antigo/novo, que o RNF-SEC-04 exige e que
 * acompanha o peso legal do certificado (5 anos), e `ip_address`/`user_agent`/
 * `url`, que são PII pura e saem na mesma janela do `login_logs` (12 meses).
 * Sem a primeira janela, o IP sobreviveria 5 anos pela porta da auditoria —
 * era exatamente o buraco que a P-33 apontava no `login_logs`.
 */
final class RetentionPolicy
{
    /** Fase 1 da `audits`: apaga `ip_address`, `user_agent` e `url`, preserva o resto. */
    public const AUDITS_ANONIMIZAR_MESES = 12;

    /** Fase 2 da `audits`: apaga a linha. 5 anos, acompanhando o peso legal do certificado. */
    public const AUDITS_DESCARTAR_MESES = 60;

    /** `login_logs` é PII pura e não tem trilha a preservar: descarte direto. */
    public const LOGIN_LOGS_DESCARTAR_MESES = 12;

    /**
     * Linhas por passada. Existe para que a poda não segure a tabela numa
     * sentença só — a `audits` cresceu 5513 linhas em 15 dias de DESENVOLVIMENTO
     * (medição da spec §1), e produção roda com usuários acordados de manhã.
     */
    public const CHUNK = 1000;

    public static function limiteDeAnonimizacaoDeAudits(): CarbonImmutable
    {
        return CarbonImmutable::now()->subMonths(self::AUDITS_ANONIMIZAR_MESES);
    }

    public static function limiteDeDescarteDeAudits(): CarbonImmutable
    {
        return CarbonImmutable::now()->subMonths(self::AUDITS_DESCARTAR_MESES);
    }

    public static function limiteDeDescarteDeLoginLogs(): CarbonImmutable
    {
        return CarbonImmutable::now()->subMonths(self::LOGIN_LOGS_DESCARTAR_MESES);
    }
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `docker compose exec -T app php artisan test --filter=RetentionPolicyTest`
Expected: PASS, 4 testes.

- [ ] **Step 5: Escrever a migration do índice**

Criar `backend/database/migrations/2026_08_26_000001_add_created_at_index_to_audits_table.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * A `audits` veio do stub do vendor sem uma linha alterada e tem índice em
 * `(auditable_type, auditable_id)` e `(user_id, user_type)` — nenhum em
 * `created_at`. As duas fases da poda recortam por DATA, então sem este índice
 * elas varrem 100% da tabela toda madrugada.
 *
 * Conexão e nome da tabela saem do `config/audit.php`, como na migration
 * original: quem trocar o destino da auditoria não fica com um índice órfão.
 */
return new class extends Migration
{
    public function up(): void
    {
        $connection = config('audit.drivers.database.connection', config('database.default'));
        $table = config('audit.drivers.database.table', 'audits');

        Schema::connection($connection)->table($table, function (Blueprint $table) {
            $table->index('created_at', 'audits_created_at_index');
        });
    }

    public function down(): void
    {
        $connection = config('audit.drivers.database.connection', config('database.default'));
        $table = config('audit.drivers.database.table', 'audits');

        Schema::connection($connection)->table($table, function (Blueprint $table) {
            $table->dropIndex('audits_created_at_index');
        });
    }
};
```

- [ ] **Step 6: Provar a migration contra o MySQL real**

Lição 15: migration verde em sqlite pode reprovar em MySQL.

Run:
```bash
docker compose exec -T app php artisan migrate
docker compose exec -T app php artisan tinker --execute="dump(collect(DB::select('SHOW INDEX FROM audits'))->pluck('Key_name')->unique()->values()->all());"
```
Expected: a lista contém `audits_created_at_index`.

- [ ] **Step 7: Provar que o índice é USADO no recorte por data**

Run:
```bash
docker compose exec -T app php artisan tinker --execute="dump(DB::select('EXPLAIN SELECT id FROM audits WHERE created_at < ?', ['2020-01-01 00:00:00']));"
```
Expected: a linha do `EXPLAIN` traz `key` = `audits_created_at_index` (e não `NULL` com `type` = `ALL`).

Se vier `NULL`: a tabela de dev tem poucas linhas e o otimizador pode preferir varredura. Repetir com uma data que selecione uma fatia pequena de uma tabela populada, ou usar `EXPLAIN SELECT ... FORCE INDEX (audits_created_at_index)` apenas para confirmar que o índice é elegível, registrando no commit qual das duas provas valeu.

- [ ] **Step 8: Rodar a suíte inteira**

Run: `docker compose exec -T app php artisan test`
Expected: verde. A migration nova roda em toda `RefreshDatabase`.

- [ ] **Step 9: Formatar e commitar**

```bash
cd backend && ./vendor/bin/pint app/Shared/Retention/RetentionPolicy.php database/migrations/2026_08_26_000001_add_created_at_index_to_audits_table.php tests/Unit/Shared/RetentionPolicyTest.php
cd .. && git add backend/app/Shared/Retention backend/database/migrations/2026_08_26_000001_add_created_at_index_to_audits_table.php backend/tests/Unit/Shared/RetentionPolicyTest.php
git commit -m "feat(retencao): politica de retencao como peca unica e indice de created_at na audits"
```

---

## Task 2: Canal de log e fachada de evento de segurança

**Files:**
- Modify: `backend/config/logging.php` (acrescentar o canal `seguranca` ao array `channels`)
- Create: `backend/app/Shared/Logging/EventoDeSeguranca.php`
- Test: `backend/tests/Feature/Shared/EventoDeSegurancaTest.php`

**Interfaces:**
- Consumes: nada.
- Produces: `EventoDeSeguranca::CANAL` (string `'seguranca'`) e oito métodos estáticos, todos `void`:
  `loginConcedido(int $usuarioId, string $usuarioTipo, ?string $ip)`,
  `loginRecusado(string $chaveHash, ?string $ip)`,
  `logout(int $usuarioId, string $usuarioTipo, ?string $ip)`,
  `sessaoRevogada(int $usuarioId, string $usuarioTipo, ?string $ip)`,
  `acessoNegado(?int $usuarioId, ?string $ip, string $rota)`,
  `taxaExcedida(?int $usuarioId, ?string $ip, string $rota)`,
  `podaExecutada(string $tabela, string $fase, int $linhas)`,
  `alertaDeAcessoSuspeito(string $familia, ?int $usuarioId, ?string $ip, int $ocorrencias)`.

- [ ] **Step 1: Escrever o teste que falha**

Criar `backend/tests/Feature/Shared/EventoDeSegurancaTest.php`:

```php
<?php

namespace Tests\Feature\Shared;

use App\Shared\Logging\EventoDeSeguranca;
use Monolog\Handler\TestHandler;
use ReflectionClass;
use ReflectionMethod;
use Illuminate\Support\Facades\Log;
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

        $this->assertSame(['Info', 'Warning'], $niveis);
    }
}
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `docker compose exec -T app php artisan test --filter=EventoDeSegurancaTest`
Expected: FAIL com `Class "App\Shared\Logging\EventoDeSeguranca" not found`.

- [ ] **Step 3: Acrescentar o canal ao `config/logging.php`**

No topo do arquivo, junto dos outros `use`:

```php
use Monolog\Formatter\JsonFormatter;
```

Dentro do array `'channels' => [ … ]`, logo depois do canal `'stderr'`:

```php
        /*
         * Canal dos eventos de segurança (RNF-SEC-05). Endereçado SEMPRE pelo
         * nome, em `Shared/Logging/EventoDeSeguranca` — nunca pelo canal
         * default —, então não depende de `LOG_CHANNEL` nem de `LOG_STACK` e
         * vale igual em desenvolvimento e em produção.
         *
         * `stderr` porque é para lá que o runtime de produção manda tudo, e o
         * Docker aplica o teto `json-file` 10 MB × 3 do `docker-compose.prod.yml`
         * — essa rotação É a política de retenção deste log, não um acidente de
         * default.
         *
         * `JsonFormatter` porque linha de log de segurança é para ser LIDA por
         * máquina: quem procurar "todo 403 do usuário 7 ontem" precisa filtrar
         * por campo, não por regex sobre prosa.
         */
        'seguranca' => [
            'driver' => 'monolog',
            'level' => env('LOG_LEVEL', 'debug'),
            'handler' => StreamHandler::class,
            'handler_with' => [
                'stream' => 'php://stderr',
            ],
            'formatter' => JsonFormatter::class,
        ],
```

- [ ] **Step 4: Escrever a fachada**

Criar `backend/app/Shared/Logging/EventoDeSeguranca.php`:

```php
<?php

namespace App\Shared\Logging;

use Illuminate\Support\Facades\Log;

/**
 * Único caminho de escrita de evento de segurança (spec §4.5). A centralização
 * que o `RNF-SEC-05` pede é ESTA — dentro do monólito, por decisão registrada
 * do João em 2026-08-26, com o requisito revisado formalmente no ADR-21.
 *
 * **Um método nomeado por evento, com parâmetros tipados, e nenhum array livre
 * de contexto.** É de propósito e é o mecanismo da catraca 4: não existe
 * assinatura por onde senha, token, e-mail ou `old_values` entrem, então o
 * não-vazamento não depende de ninguém lembrar da regra (lição 14).
 *
 * Pelo mesmo motivo o login recusado recebe a chave já em HASH: o balde do
 * limitador é `email|ip` (`RateLimits::chaveDeLogin`), e o e-mail em claro num
 * log de segurança é justamente o dado que não pode estar lá.
 */
final class EventoDeSeguranca
{
    public const CANAL = 'seguranca';

    public static function loginConcedido(int $usuarioId, string $usuarioTipo, ?string $ip): void
    {
        self::info('login.concedido', [
            'usuario_id' => $usuarioId,
            'usuario_tipo' => $usuarioTipo,
            'ip' => $ip,
        ]);
    }

    public static function loginRecusado(string $chaveHash, ?string $ip): void
    {
        self::info('login.recusado', [
            'chave_hash' => $chaveHash,
            'ip' => $ip,
        ]);
    }

    public static function logout(int $usuarioId, string $usuarioTipo, ?string $ip): void
    {
        self::info('login.encerrado', [
            'usuario_id' => $usuarioId,
            'usuario_tipo' => $usuarioTipo,
            'ip' => $ip,
        ]);
    }

    public static function sessaoRevogada(int $usuarioId, string $usuarioTipo, ?string $ip): void
    {
        self::info('sessao.revogada', [
            'usuario_id' => $usuarioId,
            'usuario_tipo' => $usuarioTipo,
            'ip' => $ip,
        ]);
    }

    public static function acessoNegado(?int $usuarioId, ?string $ip, string $rota): void
    {
        self::info('acesso.negado', [
            'usuario_id' => $usuarioId,
            'ip' => $ip,
            'rota' => $rota,
        ]);
    }

    public static function taxaExcedida(?int $usuarioId, ?string $ip, string $rota): void
    {
        self::info('taxa.excedida', [
            'usuario_id' => $usuarioId,
            'ip' => $ip,
            'rota' => $rota,
        ]);
    }

    public static function podaExecutada(string $tabela, string $fase, int $linhas): void
    {
        self::info('retencao.poda', [
            'tabela' => $tabela,
            'fase' => $fase,
            'linhas' => $linhas,
        ]);
    }

    public static function alertaDeAcessoSuspeito(string $familia, ?int $usuarioId, ?string $ip, int $ocorrencias): void
    {
        Log::channel(self::CANAL)->warning('lotus.seguranca', [
            'evento' => 'acesso.suspeito',
            'familia' => $familia,
            'usuario_id' => $usuarioId,
            'ip' => $ip,
            'ocorrencias' => $ocorrencias,
        ]);
    }

    /** @param array<string,scalar|null> $dados */
    private static function info(string $evento, array $dados): void
    {
        Log::channel(self::CANAL)->info('lotus.seguranca', ['evento' => $evento] + $dados);
    }
}
```

- [ ] **Step 5: Rodar e ver passar**

Run: `docker compose exec -T app php artisan test --filter=EventoDeSegurancaTest`
Expected: PASS, 4 testes.

- [ ] **Step 6: Ver a catraca reprovar (lição 10)**

Acrescentar temporariamente à fachada um método público novo:

```php
    public static function vazamento(string $email): void
    {
        self::info('teste', ['email' => $email]);
    }
```

Run: `docker compose exec -T app php artisan test --filter=test_a_fachada_nao_ganhou_metodo_publico_sem_ser_declarado_aqui`
Expected: FAIL — o array de públicos traz `vazamento`.

**Remover o método antes de seguir.** Rodar de novo e ver PASS.

- [ ] **Step 7: Formatar e commitar**

```bash
cd backend && ./vendor/bin/pint app/Shared/Logging/EventoDeSeguranca.php config/logging.php tests/Feature/Shared/EventoDeSegurancaTest.php
cd .. && git add backend/app/Shared/Logging backend/config/logging.php backend/tests/Feature/Shared/EventoDeSegurancaTest.php
git commit -m "feat(observabilidade): canal de seguranca em JSON e fachada de evento com catraca de nao-vazamento"
```

---

## Task 3: Comando de poda da `audits`

**Files:**
- Create: `backend/app/Console/Commands/PodarAuditoria.php`
- Test: `backend/tests/Feature/Shared/PodaDeAuditoriaTest.php`

**Interfaces:**
- Consumes: `RetentionPolicy` (Task 1), `EventoDeSeguranca::podaExecutada()` (Task 2).
- Produces: comando Artisan `lotus:podar-auditoria`, sem argumentos nem opções, saindo com `Command::SUCCESS`.

- [ ] **Step 1: Escrever o teste que falha**

Criar `backend/tests/Feature/Shared/PodaDeAuditoriaTest.php`:

```php
<?php

namespace Tests\Feature\Shared;

use App\Domains\Identity\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * DoD 1, 2 e 5 da spec. A `audits` guarda DUAS coisas com valores diferentes:
 * a trilha que o RNF-SEC-04 exige, que vive 5 anos, e `ip_address`/`user_agent`/
 * `url`, que são PII pura e saem aos 12 meses. Este teste prova as duas janelas
 * separadamente — e prova que podar não gera trilha nova, que é o oposto exato
 * da lição 5 e precisa estar escrito como asserção.
 */
class PodaDeAuditoriaTest extends TestCase
{
    use RefreshDatabase;

    private function plantar(string $criadaEm, array $extra = []): int
    {
        return DB::table('audits')->insertGetId(array_merge([
            'user_type' => 'user',
            'user_id' => 1,
            'event' => 'updated',
            'auditable_type' => 'client',
            'auditable_id' => 99,
            'old_values' => '{"name":"antes"}',
            'new_values' => '{"name":"depois"}',
            'url' => 'https://lotus.cl/api/clients/99',
            'ip_address' => '203.0.113.9',
            'user_agent' => 'Mozilla/5.0',
            'tags' => null,
            'created_at' => $criadaEm,
            'updated_at' => $criadaEm,
        ], $extra));
    }

    public function test_linha_entre_12_meses_e_5_anos_perde_a_pii_e_conserva_a_trilha(): void
    {
        $id = $this->plantar(now()->subMonths(18)->toDateTimeString());

        $this->artisan('lotus:podar-auditoria')->assertSuccessful();

        $linha = DB::table('audits')->find($id);

        $this->assertNotNull($linha, 'A linha de 18 meses não pode ser apagada: o descarte é aos 5 anos.');
        $this->assertNull($linha->ip_address);
        $this->assertNull($linha->user_agent);
        $this->assertNull($linha->url);

        $this->assertSame(1, (int) $linha->user_id);
        $this->assertSame('user', $linha->user_type);
        $this->assertSame('updated', $linha->event);
        $this->assertSame('client', $linha->auditable_type);
        $this->assertSame(99, (int) $linha->auditable_id);
        $this->assertSame('{"name":"antes"}', $linha->old_values);
        $this->assertSame('{"name":"depois"}', $linha->new_values);
    }

    public function test_linha_com_mais_de_5_anos_e_apagada(): void
    {
        $id = $this->plantar(now()->subYears(6)->toDateTimeString());

        $this->artisan('lotus:podar-auditoria')->assertSuccessful();

        $this->assertNull(DB::table('audits')->find($id));
    }

    public function test_linha_com_menos_de_12_meses_fica_intocada(): void
    {
        $id = $this->plantar(now()->subMonths(6)->toDateTimeString());

        $this->artisan('lotus:podar-auditoria')->assertSuccessful();

        $linha = DB::table('audits')->find($id);

        $this->assertSame('203.0.113.9', $linha->ip_address);
        $this->assertSame('Mozilla/5.0', $linha->user_agent);
        $this->assertSame('https://lotus.cl/api/clients/99', $linha->url);
    }

    public function test_podar_nao_gera_trilha_nova(): void
    {
        $this->plantar(now()->subMonths(18)->toDateTimeString());
        $this->plantar(now()->subYears(6)->toDateTimeString());
        $this->plantar(now()->subMonths(6)->toDateTimeString());

        $antes = DB::table('audits')->count();

        $this->artisan('lotus:podar-auditoria')->assertSuccessful();

        // Uma linha some (a de 6 anos) e NENHUMA nasce. Se a poda gravasse
        // auditoria de si mesma, a conta daria 3 ou mais.
        $this->assertSame($antes - 1, DB::table('audits')->count());
    }

    public function test_poda_atravessa_mais_de_um_chunk(): void
    {
        for ($i = 0; $i < 5; $i++) {
            $this->plantar(now()->subYears(6)->toDateTimeString());
        }

        $this->artisan('lotus:podar-auditoria')->assertSuccessful();

        $this->assertSame(0, DB::table('audits')->count());
    }

    public function test_usuario_real_auditado_continua_sendo_auditado_depois_da_poda(): void
    {
        $user = User::factory()->create(['type' => 'admin', 'is_active' => true]);

        $this->artisan('lotus:podar-auditoria')->assertSuccessful();

        $user->update(['name' => 'Nome novo']);

        $this->assertGreaterThan(
            0,
            DB::table('audits')->where('auditable_type', 'user')->where('auditable_id', $user->id)->count(),
            'A poda não pode desligar a auditoria (ADR-08).',
        );
    }
}
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `docker compose exec -T app php artisan test --filter=PodaDeAuditoriaTest`
Expected: FAIL com `The command "lotus:podar-auditoria" does not exist.`

- [ ] **Step 3: Escrever o comando**

Criar `backend/app/Console/Commands/PodarAuditoria.php`:

```php
<?php

namespace App\Console\Commands;

use App\Shared\Logging\EventoDeSeguranca;
use App\Shared\Retention\RetentionPolicy;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Poda da `audits` em duas fases (spec §4.2). PRIMEIRO comando Artisan do
 * projeto — é ele que faz nascer `app/Console/`, exatamente como o
 * `docs/estrutura-monolito.md` previa.
 *
 * **Fase 1 (12 meses): anonimizar.** `ip_address`, `user_agent` e `url` viram
 * `NULL`. Todo o resto fica: `user_id`, `user_type`, `event`, `auditable_*`,
 * `old_values`, `new_values`, `tags` e `created_at` são o quem/o quê/valor
 * anterior/valor novo que o `RNF-SEC-04` exige e que a `ArchiveTrailQuery` lê.
 *
 * **Fase 2 (5 anos): descartar.** A linha inteira sai.
 *
 * **A ordem de EXECUÇÃO é a inversa da numeração, de propósito:** descartar
 * primeiro tira da tabela as linhas com mais de 5 anos antes que a
 * anonimização precise tocá-las. Janelas e resultado final são idênticos;
 * muda só o trabalho gasto.
 *
 * **Consulta crua, não Eloquent, e isso é o requisito e não um atalho.** A
 * lição 5 do `docs/README.md` manda usar `$model->delete()` para que o
 * `owen-it` registre a exclusão; aqui o requisito é o OPOSTO — apagar trilha
 * não pode gerar trilha nova. Nem `Audit` nem `LoginLog` são `Auditable`, e o
 * `PodaDeAuditoriaTest::test_podar_nao_gera_trilha_nova` guarda isso.
 *
 * Em chunk porque produção roda com gente acordada: a `audits` cresceu 5513
 * linhas em 15 dias de DESENVOLVIMENTO.
 */
class PodarAuditoria extends Command
{
    protected $signature = 'lotus:podar-auditoria';

    protected $description = 'Anonimiza a PII da audits aos 12 meses e descarta a linha aos 5 anos (spec de retenção).';

    public function handle(): int
    {
        $conexao = config('audit.drivers.database.connection') ?: config('database.default');
        $tabela = config('audit.drivers.database.table', 'audits');

        $descartadas = $this->descartar($conexao, $tabela);
        $anonimizadas = $this->anonimizar($conexao, $tabela);

        EventoDeSeguranca::podaExecutada($tabela, 'descarte', $descartadas);
        EventoDeSeguranca::podaExecutada($tabela, 'anonimizacao', $anonimizadas);

        $this->info("Poda da `{$tabela}`: {$descartadas} descartada(s), {$anonimizadas} anonimizada(s).");

        return self::SUCCESS;
    }

    private function descartar(string $conexao, string $tabela): int
    {
        $limite = RetentionPolicy::limiteDeDescarteDeAudits();
        $total = 0;

        do {
            $afetadas = DB::connection($conexao)
                ->table($tabela)
                ->where('created_at', '<', $limite)
                ->limit(RetentionPolicy::CHUNK)
                ->delete();

            $total += $afetadas;
        } while ($afetadas > 0);

        return $total;
    }

    private function anonimizar(string $conexao, string $tabela): int
    {
        $limite = RetentionPolicy::limiteDeAnonimizacaoDeAudits();
        $total = 0;

        do {
            // O filtro dos três campos não é adorno: sem ele a consulta
            // reencontra as MESMAS linhas já anonimizadas em toda passada e o
            // laço nunca termina.
            $afetadas = DB::connection($conexao)
                ->table($tabela)
                ->where('created_at', '<', $limite)
                ->where(function ($consulta) {
                    $consulta->whereNotNull('ip_address')
                        ->orWhereNotNull('user_agent')
                        ->orWhereNotNull('url');
                })
                ->limit(RetentionPolicy::CHUNK)
                ->update([
                    'ip_address' => null,
                    'user_agent' => null,
                    'url' => null,
                ]);

            $total += $afetadas;
        } while ($afetadas > 0);

        return $total;
    }
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `docker compose exec -T app php artisan test --filter=PodaDeAuditoriaTest`
Expected: PASS, 6 testes.

- [ ] **Step 5: Provar a poda contra o MySQL real**

O sqlite compila `update … limit` de outro jeito que o MySQL (lição 15), então a poda em chunk precisa ser vista rodando no banco de verdade.

Run:
```bash
docker compose exec -T app php artisan tinker --execute="
DB::table('audits')->insert([
 ['user_type'=>'user','user_id'=>1,'event'=>'updated','auditable_type'=>'client','auditable_id'=>1,'url'=>'x','ip_address'=>'203.0.113.9','user_agent'=>'ua','created_at'=>now()->subMonths(18),'updated_at'=>now()->subMonths(18)],
 ['user_type'=>'user','user_id'=>1,'event'=>'updated','auditable_type'=>'client','auditable_id'=>2,'url'=>'x','ip_address'=>'203.0.113.9','user_agent'=>'ua','created_at'=>now()->subYears(6),'updated_at'=>now()->subYears(6)],
]);
dump(DB::table('audits')->where('auditable_id','<=',2)->get(['auditable_id','ip_address','created_at'])->all());
"
docker compose exec -T app php artisan lotus:podar-auditoria
docker compose exec -T app php artisan tinker --execute="dump(DB::table('audits')->where('auditable_id','<=',2)->get(['auditable_id','ip_address','url','user_agent','old_values','event'])->all());"
```
Expected: a linha de `auditable_id = 2` não existe mais; a de `auditable_id = 1` existe com `ip_address`, `url` e `user_agent` em `null` e `event` intacto.

Limpar o resíduo do experimento:
```bash
docker compose exec -T app php artisan tinker --execute="DB::table('audits')->where('auditable_type','client')->whereIn('auditable_id',[1,2])->where('user_agent',null)->delete();"
```

- [ ] **Step 6: Rodar a suíte inteira**

Run: `docker compose exec -T app php artisan test`
Expected: verde.

- [ ] **Step 7: Formatar e commitar**

```bash
cd backend && ./vendor/bin/pint app/Console/Commands/PodarAuditoria.php tests/Feature/Shared/PodaDeAuditoriaTest.php
cd .. && git add backend/app/Console backend/tests/Feature/Shared/PodaDeAuditoriaTest.php
git commit -m "feat(retencao): poda da audits em duas fases, anonimiza aos 12 meses e descarta aos 5 anos"
```

---

## Task 4: Comando de poda da `login_logs`

**Files:**
- Create: `backend/app/Console/Commands/PodarLogins.php`
- Test: `backend/tests/Feature/Shared/PodaDeLoginsTest.php`

**Interfaces:**
- Consumes: `RetentionPolicy` (Task 1), `EventoDeSeguranca::podaExecutada()` (Task 2).
- Produces: comando Artisan `lotus:podar-logins`, sem argumentos nem opções, saindo com `Command::SUCCESS`.

- [ ] **Step 1: Escrever o teste que falha**

Criar `backend/tests/Feature/Shared/PodaDeLoginsTest.php`:

```php
<?php

namespace Tests\Feature\Shared;

use App\Domains\Identity\Models\LoginLog;
use App\Domains\Identity\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * DoD 3 da spec. `login_logs` é PII pura sem trilha a preservar (P-33), então
 * descarte direto aos 12 meses — sem fase de anonimização, que não teria o que
 * conservar.
 *
 * O último teste registra a consequência ACEITA e declarada na spec §8: conta
 * sem login há mais de 12 meses passa a não ter "último acesso". O frontend já
 * imprime `—` para `last_login` nulo (`UsersTable.tsx:83`,
 * `RedatoresTable.tsx:101`), então não há mudança de tela neste bloco.
 */
class PodaDeLoginsTest extends TestCase
{
    use RefreshDatabase;

    private function plantar(User $user, string $criadoEm): int
    {
        return DB::table('login_logs')->insertGetId([
            'user_id' => $user->id,
            'ip_address' => '203.0.113.9',
            'user_agent' => 'Mozilla/5.0',
            'created_at' => $criadoEm,
        ]);
    }

    public function test_linha_com_mais_de_12_meses_e_apagada(): void
    {
        $user = User::factory()->create();
        $id = $this->plantar($user, now()->subMonths(13)->toDateTimeString());

        $this->artisan('lotus:podar-logins')->assertSuccessful();

        $this->assertNull(DB::table('login_logs')->find($id));
    }

    public function test_linha_com_menos_de_12_meses_fica_intocada(): void
    {
        $user = User::factory()->create();
        $id = $this->plantar($user, now()->subMonths(11)->toDateTimeString());

        $this->artisan('lotus:podar-logins')->assertSuccessful();

        $linha = DB::table('login_logs')->find($id);

        $this->assertNotNull($linha);
        $this->assertSame('203.0.113.9', $linha->ip_address);
    }

    public function test_poda_atravessa_mais_de_um_chunk(): void
    {
        $user = User::factory()->create();
        for ($i = 0; $i < 5; $i++) {
            $this->plantar($user, now()->subMonths(13)->toDateTimeString());
        }

        $this->artisan('lotus:podar-logins')->assertSuccessful();

        $this->assertSame(0, LoginLog::query()->count());
    }

    public function test_podar_login_logs_nao_gera_trilha_em_audits(): void
    {
        $user = User::factory()->create();
        $this->plantar($user, now()->subMonths(13)->toDateTimeString());

        $antes = DB::table('audits')->count();

        $this->artisan('lotus:podar-logins')->assertSuccessful();

        $this->assertSame($antes, DB::table('audits')->count());
    }

    public function test_conta_sem_acesso_recente_fica_sem_ultimo_acesso(): void
    {
        $user = User::factory()->create();
        $this->plantar($user, now()->subMonths(13)->toDateTimeString());

        $this->artisan('lotus:podar-logins')->assertSuccessful();

        // Consequência aceita e declarada (spec §8): o "último acesso" some
        // junto com a PII. Preservar a última linha por usuário manteria IP e
        // user agent indefinidos numa conta abandonada.
        $this->assertNull($user->fresh()->latestLogin);
    }
}
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `docker compose exec -T app php artisan test --filter=PodaDeLoginsTest`
Expected: FAIL com `The command "lotus:podar-logins" does not exist.`

- [ ] **Step 3: Escrever o comando**

Criar `backend/app/Console/Commands/PodarLogins.php`:

```php
<?php

namespace App\Console\Commands;

use App\Shared\Logging\EventoDeSeguranca;
use App\Shared\Retention\RetentionPolicy;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Poda da `login_logs` (spec §4.2). Fase única: a tabela é PII pura —
 * `ip_address` e `user_agent` — e não guarda trilha de mudança nenhuma, então
 * não há o que anonimizar e preservar. É a ficha P-33 sendo paga por
 * mecanismo.
 *
 * Consulta crua pelo mesmo motivo do `PodarAuditoria`: `LoginLog` não é
 * `Auditable`, e apagar log de segurança não pode gerar linha de auditoria.
 *
 * Consequência ACEITA e declarada (spec §8): conta sem login há mais de 12
 * meses perde o "último acesso" que o `User::latestLogin()` serve ao
 * `UserData` e ao `RedatorData`. Preservar sempre a última linha por usuário
 * manteria PII indefinida numa conta abandonada, contra a decisão do João.
 */
class PodarLogins extends Command
{
    protected $signature = 'lotus:podar-logins';

    protected $description = 'Descarta linhas de login_logs com mais de 12 meses (spec de retenção).';

    public function handle(): int
    {
        $limite = RetentionPolicy::limiteDeDescarteDeLoginLogs();
        $total = 0;

        do {
            $afetadas = DB::table('login_logs')
                ->where('created_at', '<', $limite)
                ->limit(RetentionPolicy::CHUNK)
                ->delete();

            $total += $afetadas;
        } while ($afetadas > 0);

        EventoDeSeguranca::podaExecutada('login_logs', 'descarte', $total);

        $this->info("Poda da `login_logs`: {$total} descartada(s).");

        return self::SUCCESS;
    }
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `docker compose exec -T app php artisan test --filter=PodaDeLoginsTest`
Expected: PASS, 5 testes.

- [ ] **Step 5: Provar contra o MySQL real**

Run:
```bash
docker compose exec -T app php artisan tinker --execute="
\$id = DB::table('users')->value('id');
DB::table('login_logs')->insert(['user_id'=>\$id,'ip_address'=>'203.0.113.9','user_agent'=>'ua-antiga','created_at'=>now()->subMonths(13)]);
dump(DB::table('login_logs')->where('user_agent','ua-antiga')->count());
"
docker compose exec -T app php artisan lotus:podar-logins
docker compose exec -T app php artisan tinker --execute="dump(DB::table('login_logs')->where('user_agent','ua-antiga')->count());"
```
Expected: `1` antes, `0` depois.

- [ ] **Step 6: Rodar a suíte inteira e commitar**

```bash
docker compose exec -T app php artisan test
cd backend && ./vendor/bin/pint app/Console/Commands/PodarLogins.php tests/Feature/Shared/PodaDeLoginsTest.php
cd .. && git add backend/app/Console/Commands/PodarLogins.php backend/tests/Feature/Shared/PodaDeLoginsTest.php
git commit -m "feat(retencao): poda da login_logs aos 12 meses, pagando a P-33 por mecanismo"
```

---

## Task 5: Agendamento e catraca

**Files:**
- Modify: `backend/routes/console.php`
- Test: `backend/tests/Feature/Shared/PodaAgendadaRatchetTest.php`

**Interfaces:**
- Consumes: os comandos `lotus:podar-auditoria` (Task 3) e `lotus:podar-logins` (Task 4).
- Produces: duas entradas no `Schedule`, diárias, no fuso `America/Santiago`.

- [ ] **Step 1: Escrever a catraca que falha**

Criar `backend/tests/Feature/Shared/PodaAgendadaRatchetTest.php`:

```php
<?php

namespace Tests\Feature\Shared;

use Illuminate\Support\Facades\Artisan;
use Tests\TestCase;

/**
 * Catraca 1 da spec (§5). O bloco descobriu que o projeto NÃO agenda nada —
 * sem `app/Console/`, sem um único `Schedule::`, sem cron ou supervisor em
 * compose nenhum. Poda que não roda é código morto que parece proteção.
 *
 * Lê o `schedule:list` REAL e não o texto do `routes/console.php`: o que
 * interessa é o agendador montado, venha a entrada de onde vier. Molde e razão:
 * `AuthenticatedRouteMiddlewareTest` e `ThrottledRouteRatchetTest`.
 *
 * Comando de poda novo entra em `PODAS` por escrita explícita, ou a catraca
 * barra. Silêncio reprova.
 */
class PodaAgendadaRatchetTest extends TestCase
{
    /** @var array<string,string> comando => por que ele precisa estar agendado */
    private const PODAS = [
        'lotus:podar-auditoria' => 'Retenção da audits: anonimiza aos 12 meses, descarta aos 5 anos.',
        'lotus:podar-logins' => 'Retenção da login_logs: descarta aos 12 meses (P-33).',
    ];

    private function agendamento(): string
    {
        Artisan::call('schedule:list');

        return Artisan::output();
    }

    public function test_toda_poda_esta_agendada(): void
    {
        $saida = $this->agendamento();

        foreach (self::PODAS as $comando => $motivo) {
            $this->assertStringContainsString(
                $comando,
                $saida,
                "O comando `{$comando}` não está agendado. {$motivo}",
            );
        }
    }

    public function test_o_agendador_tem_pelo_menos_as_podas(): void
    {
        $this->assertNotSame(
            '',
            trim($this->agendamento()),
            'O `schedule:list` voltou vazio: nenhuma tarefa agendada.',
        );
    }
}
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `docker compose exec -T app php artisan test --filter=PodaAgendadaRatchetTest`
Expected: FAIL — `schedule:list` reporta que não há tarefas agendadas.

- [ ] **Step 3: Agendar**

Acrescentar ao fim de `backend/routes/console.php`:

```php
use App\Console\Commands\PodarAuditoria;
use App\Console\Commands\PodarLogins;
use Illuminate\Support\Facades\Schedule;

/*
 * Retenção (spec §4.4). Quem roda isto em produção é o serviço `scheduler` do
 * `docker-compose.prod.yml` — antes deste bloco o projeto não agendava NADA, e
 * o comando existiria sem nunca executar.
 *
 * `timezone('America/Santiago')` porque `config/app.php` fixa `UTC` e o cliente
 * é chileno: sem isto a "madrugada" da poda cairia no meio da tarde local.
 *
 * Horários separados de propósito: as duas podas varrem tabelas diferentes e
 * não precisam competir por I/O na mesma janela.
 *
 * `withoutOverlapping()` protege contra a passada anterior ainda estar viva
 * numa tabela grande; o lock vai para o `CACHE_STORE=database`, que já é o do
 * projeto.
 */
Schedule::command(PodarAuditoria::class)
    ->timezone('America/Santiago')
    ->dailyAt('03:10')
    ->withoutOverlapping();

Schedule::command(PodarLogins::class)
    ->timezone('America/Santiago')
    ->dailyAt('03:40')
    ->withoutOverlapping();
```

- [ ] **Step 4: Rodar e ver passar**

Run: `docker compose exec -T app php artisan test --filter=PodaAgendadaRatchetTest`
Expected: PASS, 2 testes.

- [ ] **Step 5: Conferir o agendamento à mão**

Run: `docker compose exec -T app php artisan schedule:list`
Expected: as duas entradas, com expressão cron `10 3 * * *` e `40 3 * * *` e o fuso `America/Santiago`.

- [ ] **Step 6: Ver a catraca reprovar (lição 10)**

Comentar as duas chamadas `Schedule::command(...)` do `routes/console.php`.

Run: `docker compose exec -T app php artisan test --filter=PodaAgendadaRatchetTest`
Expected: FAIL nas duas asserções, com a mensagem que nomeia o comando ausente.

**Descomentar antes de seguir.** Rodar de novo e ver PASS.

- [ ] **Step 7: Formatar e commitar**

```bash
cd backend && ./vendor/bin/pint routes/console.php tests/Feature/Shared/PodaAgendadaRatchetTest.php
cd .. && git add backend/routes/console.php backend/tests/Feature/Shared/PodaAgendadaRatchetTest.php
git commit -m "feat(retencao): agenda as duas podas e cria a catraca que impede poda sem agendamento"
```

---

## Task 6: Serviço `scheduler` no runtime de produção

**Files:**
- Modify: `docker-compose.prod.yml`

**Interfaces:**
- Consumes: o agendamento de Task 5.
- Produces: serviço `scheduler` no compose de produção.

- [ ] **Step 1: Provar que hoje não existe**

Run:
```bash
LOTUS_ENV_FILE=./docker/probe.env docker compose -f docker-compose.prod.yml config --services
```
Expected: `app`, `nginx`, `gotenberg`, `clamav` — **sem** `scheduler`.

- [ ] **Step 2: Acrescentar o serviço**

Em `docker-compose.prod.yml`, depois do serviço `app`:

```yaml
  # O runner do agendador (spec §4.4). Antes deste bloco NADA agendava nada no
  # projeto: sem `app/Console/`, sem um único `Schedule::`, e sem cron ou
  # supervisor em compose nenhum nem no entrypoint. A poda de retenção existiria
  # como código que nunca executa.
  #
  # Container próprio e não cron do host: o item 10 comprou "o runtime não
  # depende do working tree do servidor" COPIANDO o código para dentro da
  # imagem, e um crontab no host devolveria essa dependência pela porta dos
  # fundos. Mesma imagem, mesmo env_file, mesmo entrypoint — inclusive o gate de
  # variável obrigatória, que aqui vale igual: scheduler que sobe sem DB_HOST
  # falharia toda madrugada em silêncio.
  #
  # `schedule:work` e não `schedule:run` num laço: é o processo de longa duração
  # que o Laravel publica para exatamente este caso, e o `restart` do Compose
  # cobre a queda dele.
  #
  # Sem `ports` e sem healthcheck: não atende ninguém. A contrapartida está
  # declarada como risco na spec §8 — travamento silencioso do processo não é
  # coberto por `restart`, e a ficha de dívida registra isso.
  scheduler:
    image: ${LOTUS_IMAGE:-lotus-app:local}
    build:
      context: .
      dockerfile: docker/Dockerfile.prod
      target: app
    env_file: ${LOTUS_ENV_FILE:-/opt/lotus/.env}
    command: ["php", "artisan", "schedule:work"]
    restart: unless-stopped
    depends_on: [app]
    logging: *logging
```

- [ ] **Step 3: Provar que o compose é válido e traz o serviço**

Run:
```bash
LOTUS_ENV_FILE=./docker/probe.env docker compose -f docker-compose.prod.yml config --services
```
Expected: `app`, `nginx`, `gotenberg`, `clamav`, `scheduler`.

- [ ] **Step 4: Provar que o serviço herda o teto de log e o env_file**

Run:
```bash
LOTUS_ENV_FILE=./docker/probe.env docker compose -f docker-compose.prod.yml config | sed -n '/^  scheduler:/,/^  [a-z]/p'
```
Expected: o bloco traz `command` com `schedule:work`, `restart: unless-stopped`, `logging` com `max-size: 10m` e `max-file: "3"`, e o `env_file` resolvido.

- [ ] **Step 5: Provar o serviço de pé, contra a sonda**

Run:
```bash
LOTUS_ENV_FILE=./docker/probe.env LOTUS_HTTP_PORT=8081 \
  docker compose -f docker-compose.prod.yml -f docker-compose.prod-probe.yml up -d --build
docker compose -f docker-compose.prod.yml -f docker-compose.prod-probe.yml ps scheduler
docker compose -f docker-compose.prod.yml -f docker-compose.prod-probe.yml logs --tail=20 scheduler
```
Expected: o serviço em `running`, e o log mostrando o `schedule:work` ativo.

Derrubar a sonda ao terminar:
```bash
LOTUS_ENV_FILE=./docker/probe.env LOTUS_HTTP_PORT=8081 \
  docker compose -f docker-compose.prod.yml -f docker-compose.prod-probe.yml down -v
```

- [ ] **Step 6: Commitar**

```bash
git add docker-compose.prod.yml
git commit -m "feat(infra): serviço scheduler no runtime de produção, o runner que a poda precisava"
```

---

## Task 7: Eventos de acesso nos três pontos de captura

**Files:**
- Create: `backend/app/Shared/Logging/RegistraEventoDeErro.php`
- Modify: `backend/app/Domains/Identity/Http/Controllers/AuthController.php`
- Modify: `backend/app/Shared/Http/Middleware/EnsureAccountIsActive.php`
- Modify: `backend/app/Shared/RateLimiting/RateLimits.php` (`chaveDeLogin` de `private` para `public`)
- Modify: `backend/bootstrap/app.php`
- Test: `backend/tests/Feature/Shared/EventosDeAcessoTest.php`

**Interfaces:**
- Consumes: `EventoDeSeguranca` (Task 2).
- Produces: `RateLimits::chaveDeLogin(Request $request): string` agora **pública**; `RegistraEventoDeErro::handle(Throwable $e, Request $request): void`.

- [ ] **Step 1: Escrever o teste que falha**

Criar `backend/tests/Feature/Shared/EventosDeAcessoTest.php`:

```php
<?php

namespace Tests\Feature\Shared;

use App\Domains\Identity\Models\User;
use App\Shared\Logging\EventoDeSeguranca;
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
        $this->seed(\Database\Seeders\RolePermissionSeeder::class);

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
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `docker compose exec -T app php artisan test --filter=EventosDeAcessoTest`
Expected: FAIL nos seis testes — nenhum evento é emitido hoje.

Se o teste de 403 falhar por a rota `api/users` não devolver 403 ao redator, trocar a rota pela primeira rota `api/*` que o `RolePermissionSeeder` negue ao papel `redator`, conferindo com `docker compose exec -T app php artisan route:list --path=api`. **Registrar a troca no docblock do teste.**

- [ ] **Step 3: Tornar `chaveDeLogin` pública**

Em `backend/app/Shared/RateLimiting/RateLimits.php`, trocar a assinatura e acrescentar ao docblock existente:

```php
    /**
     * … (o docblock atual continua igual) …
     *
     * **Pública desde o bloco de observabilidade:** o detector de acesso
     * suspeito conta na MESMA chave em que o limitador conta. Duas definições
     * de "mesma chave" divergiriam na primeira vez que uma delas mudasse de
     * normalização, e o alerta passaria a falar de um agrupamento que o
     * throttle não usa.
     */
    public static function chaveDeLogin(Request $request): string
```

- [ ] **Step 4: Ligar o `AuthController`**

Em `backend/app/Domains/Identity/Http/Controllers/AuthController.php`, acrescentar aos `use`:

```php
use App\Shared\Logging\EventoDeSeguranca;
use App\Shared\RateLimiting\RateLimits;
```

No braço de falha do `attempt()`, antes do `throw`:

```php
        if (! Auth::guard('web')->attempt($credentials)) {
            // A chave vai em HASH: é `email|ip` (a mesma do limitador), e
            // e-mail em claro é justamente o que não pode estar num log.
            EventoDeSeguranca::loginRecusado(
                hash('sha256', RateLimits::chaveDeLogin($request)),
                $request->ip(),
            );

            throw ValidationException::withMessages([
                'email' => __('auth.failed'),
            ]);
        }
```

No gate de `is_active`, antes do `throw` (é login recusado por conta desligada, não sessão revogada — a sessão nem chegou a existir):

```php
        if (! $user->is_active) {
            Auth::guard('web')->logout();

            EventoDeSeguranca::loginRecusado(
                hash('sha256', RateLimits::chaveDeLogin($request)),
                $request->ip(),
            );

            throw ValidationException::withMessages([
                'email' => __('auth.inactive'),
            ]);
        }
```

Depois do `$recordLogin->execute(...)`:

```php
        EventoDeSeguranca::loginConcedido($user->id, $user->type, $request->ip());
```

No `logout()`, **antes** do `Auth::guard('web')->logout()` (depois dele não há mais usuário para nomear):

```php
    public function logout(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user !== null) {
            EventoDeSeguranca::logout($user->id, $user->type, $request->ip());
        }

        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json(['message' => 'Sessão encerrada.']);
    }
```

- [ ] **Step 5: Ligar o `EnsureAccountIsActive`**

Em `backend/app/Shared/Http/Middleware/EnsureAccountIsActive.php`, acrescentar ao `use`:

```php
use App\Shared\Logging\EventoDeSeguranca;
```

Dentro do `if` de recusa, **antes** de invalidar a sessão:

```php
        if (! $user->is_active || ! in_array($user->type, self::TIPOS_ELEGIVEIS, true)) {
            EventoDeSeguranca::sessaoRevogada($user->id, $user->type, $request->ip());

            if ($request->hasSession()) {
                $request->session()->invalidate();
            }

            Auth::guard('web')->logout();

            throw new AuthenticationException(__('auth.inactive'));
        }
```

- [ ] **Step 6: Escrever o registrador de erro do handler global**

Criar `backend/app/Shared/Logging/RegistraEventoDeErro.php`:

```php
<?php

namespace App\Shared\Logging;

use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Http\Exceptions\ThrottleRequestsException;
use Illuminate\Http\Request;
use Throwable;

/**
 * Traduz em evento de segurança os dois erros do handler global que são sinal
 * de acesso, não de defeito: `403` (autorização negada) e `429` (taxa
 * excedida).
 *
 * **Mora aqui e não num `$exceptions->report()`:** o `Handler` do Laravel traz
 * `AuthorizationException`, `HttpException` e `ValidationException` na lista
 * interna de "não reportar", então um `report()` NUNCA veria estes dois. O
 * `render()` do `bootstrap/app.php` já é o ponto que o projeto possui para
 * comportamento transversal de erro de API — é dele que esta classe é chamada.
 *
 * Não formata resposta e não decide status: quem faz isso é o `ProblemDetails`.
 * Esta classe só registra.
 */
class RegistraEventoDeErro
{
    public static function handle(Throwable $e, Request $request): void
    {
        $usuarioId = $request->user()?->getAuthIdentifier();
        $rota = $request->path();

        if ($e instanceof AuthorizationException) {
            EventoDeSeguranca::acessoNegado($usuarioId, $request->ip(), $rota);

            return;
        }

        if ($e instanceof ThrottleRequestsException) {
            EventoDeSeguranca::taxaExcedida($usuarioId, $request->ip(), $rota);
        }
    }
}
```

- [ ] **Step 7: Chamar do `bootstrap/app.php`**

Acrescentar ao `use`:

```php
use App\Shared\Logging\RegistraEventoDeErro;
```

E dentro do `render()`, antes do `return`:

```php
        $exceptions->render(function (Throwable $e, Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                // 403 e 429 são sinal de ACESSO e não de defeito, e a lista
                // interna de "não reportar" do Handler impede que um
                // `$exceptions->report()` os enxergue. Registrar aqui é o único
                // ponto que vê os dois sem duplicar a classificação.
                RegistraEventoDeErro::handle($e, $request);

                return ProblemDetails::fromException($e, $request);
            }

            return null;
        });
```

- [ ] **Step 8: Rodar e ver passar**

Run: `docker compose exec -T app php artisan test --filter=EventosDeAcessoTest`
Expected: PASS, 6 testes.

- [ ] **Step 9: Rodar a suíte inteira**

Run: `docker compose exec -T app php artisan test`
Expected: verde. Atenção especial a `AccountDeactivationMidSessionTest`, `LoginLogTest`, `RateLimitTest` e `AuthenticatedRouteMiddlewareTest`, que tocam os mesmos arquivos.

- [ ] **Step 10: Formatar e commitar**

```bash
cd backend && ./vendor/bin/pint app/Shared/Logging app/Domains/Identity/Http/Controllers/AuthController.php app/Shared/Http/Middleware/EnsureAccountIsActive.php app/Shared/RateLimiting/RateLimits.php bootstrap/app.php tests/Feature/Shared/EventosDeAcessoTest.php
cd .. && git add backend/app backend/bootstrap/app.php backend/tests/Feature/Shared/EventosDeAcessoTest.php
git commit -m "feat(observabilidade): registra login, logout, sessao revogada, 403 e 429 no canal de seguranca"
```

---

## Task 8: As três famílias de acesso suspeito

**Files:**
- Create: `backend/app/Shared/Alerts/AlertThresholds.php`
- Create: `backend/app/Shared/Alerts/DetectorDeAcessoSuspeito.php`
- Create: `backend/app/Shared/Alerts/Notifications/AcessoSuspeito.php`
- Create: `backend/lang/en/seguranca.php`, `backend/lang/es/seguranca.php`, `backend/lang/es_CL/seguranca.php`, `backend/lang/pt_BR/seguranca.php`
- Modify: `backend/app/Domains/Identity/Http/Controllers/AuthController.php`
- Modify: `backend/app/Shared/Http/Middleware/EnsureAccountIsActive.php`
- Modify: `backend/app/Shared/Logging/RegistraEventoDeErro.php`
- Test: `backend/tests/Feature/Shared/AcessoSuspeitoTest.php`

**Interfaces:**
- Consumes: `EventoDeSeguranca::alertaDeAcessoSuspeito()` (Task 2), `RateLimits::chaveDeLogin()` público (Task 7).
- Produces: `AlertThresholds::LOGIN_FALHO_LIMIAR`, `AlertThresholds::LOGIN_FALHO_JANELA_SEGUNDOS`, `AlertThresholds::SESSAO_REVOGADA_JANELA_SEGUNDOS`, `AlertThresholds::ACESSO_NEGADO_LIMIAR`, `AlertThresholds::ACESSO_NEGADO_JANELA_SEGUNDOS`; `DetectorDeAcessoSuspeito::loginFalho(string $chave, ?string $ip): void`, `::sessaoDeContaDesativada(int $usuarioId, ?string $ip): void`, `::acessoNegado(int $usuarioId, ?string $ip): void`; notification `AcessoSuspeito`.

- [ ] **Step 1: Escrever o teste que falha**

Criar `backend/tests/Feature/Shared/AcessoSuspeitoTest.php`:

```php
<?php

namespace Tests\Feature\Shared;

use App\Domains\Identity\Models\User;
use App\Shared\Alerts\AlertThresholds;
use App\Shared\Alerts\DetectorDeAcessoSuspeito;
use App\Shared\Alerts\Notifications\AcessoSuspeito;
use App\Shared\Logging\EventoDeSeguranca;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;
use Monolog\Handler\TestHandler;
use Tests\TestCase;

/**
 * DoD 9 e 10 da spec. As três famílias são a resposta ao `RNF-SEC-07`, que
 * pede "parâmetro de identificação definido" — cada uma tem condição
 * mensurável, destino e expectativa temporal, e é isso que estes testes
 * provam.
 *
 * A expectativa temporal é "no mesmo request que cruza o limiar" (D7), porque
 * produção não tem worker de fila. O teste de resiliência é o que compra essa
 * escolha: alerta que quebra não pode derrubar a resposta.
 */
class AcessoSuspeitoTest extends TestCase
{
    use RefreshDatabase;

    private TestHandler $handler;

    protected function setUp(): void
    {
        parent::setUp();

        $this->handler = new TestHandler;
        Log::channel(EventoDeSeguranca::CANAL)->getLogger()->setHandlers([$this->handler]);

        Notification::fake();
    }

    private function admin(): User
    {
        return User::factory()->create(['type' => 'admin', 'is_active' => true]);
    }

    private function alertas(): array
    {
        return array_values(array_filter(
            array_map(fn ($r) => $r->context, $this->handler->getRecords()),
            fn (array $c) => ($c['evento'] ?? null) === 'acesso.suspeito',
        ));
    }

    public function test_login_falho_alerta_ao_cruzar_o_limiar_e_nao_antes(): void
    {
        $admin = $this->admin();
        $detector = app(DetectorDeAcessoSuspeito::class);

        for ($i = 1; $i < AlertThresholds::LOGIN_FALHO_LIMIAR; $i++) {
            $detector->loginFalho('chave-fixa', '203.0.113.9');
        }

        $this->assertCount(0, $this->alertas(), 'Abaixo do limiar não pode alertar.');

        $detector->loginFalho('chave-fixa', '203.0.113.9');

        $alertas = $this->alertas();
        $this->assertCount(1, $alertas);
        $this->assertSame('login_falho_repetido', $alertas[0]['familia']);

        Notification::assertSentTo($admin, AcessoSuspeito::class);
    }

    public function test_login_falho_alerta_uma_vez_por_janela(): void
    {
        $this->admin();
        $detector = app(DetectorDeAcessoSuspeito::class);

        for ($i = 0; $i < AlertThresholds::LOGIN_FALHO_LIMIAR + 5; $i++) {
            $detector->loginFalho('chave-fixa', '203.0.113.9');
        }

        $this->assertCount(1, $this->alertas());
    }

    public function test_chaves_diferentes_nao_se_somam(): void
    {
        $this->admin();
        $detector = app(DetectorDeAcessoSuspeito::class);

        for ($i = 0; $i < AlertThresholds::LOGIN_FALHO_LIMIAR; $i++) {
            $detector->loginFalho('chave-a', '203.0.113.9');
            $detector->loginFalho('chave-b', '203.0.113.10');
        }

        $this->assertCount(2, $this->alertas());
    }

    public function test_sessao_de_conta_desativada_alerta_na_primeira_ocorrencia(): void
    {
        $admin = $this->admin();
        $detector = app(DetectorDeAcessoSuspeito::class);

        $detector->sessaoDeContaDesativada(4242, '203.0.113.9');
        $detector->sessaoDeContaDesativada(4242, '203.0.113.9');
        $detector->sessaoDeContaDesativada(4242, '203.0.113.9');

        $alertas = $this->alertas();

        $this->assertCount(1, $alertas);
        $this->assertSame('sessao_de_conta_desativada', $alertas[0]['familia']);

        Notification::assertSentTo($admin, AcessoSuspeito::class);
    }

    public function test_403_alerta_ao_cruzar_o_limiar(): void
    {
        $this->admin();
        $detector = app(DetectorDeAcessoSuspeito::class);

        for ($i = 1; $i < AlertThresholds::ACESSO_NEGADO_LIMIAR; $i++) {
            $detector->acessoNegado(4242, '203.0.113.9');
        }

        $this->assertCount(0, $this->alertas());

        $detector->acessoNegado(4242, '203.0.113.9');

        $alertas = $this->alertas();
        $this->assertCount(1, $alertas);
        $this->assertSame('sequencia_de_403', $alertas[0]['familia']);
    }

    public function test_alerta_so_vai_para_admin_ativo(): void
    {
        $ativo = $this->admin();
        $inativo = User::factory()->create(['type' => 'admin', 'is_active' => false]);
        $redator = User::factory()->create(['type' => 'redator', 'is_active' => true]);

        app(DetectorDeAcessoSuspeito::class)->sessaoDeContaDesativada(4242, null);

        Notification::assertSentTo($ativo, AcessoSuspeito::class);
        Notification::assertNotSentTo($inativo, AcessoSuspeito::class);
        Notification::assertNotSentTo($redator, AcessoSuspeito::class);
    }

    public function test_falha_no_envio_nao_derruba_o_request(): void
    {
        $this->admin();

        // Desfaz o `Notification::fake()` e instala um canal que explode.
        Notification::swap(new class extends \Illuminate\Notifications\ChannelManager
        {
            public function __construct() {}

            public function send($notifiables, $notification)
            {
                throw new \RuntimeException('SES fora do ar');
            }
        });

        app(DetectorDeAcessoSuspeito::class)->sessaoDeContaDesativada(4242, '203.0.113.9');

        // O alerta foi registrado no log mesmo com o envio quebrado, e nenhuma
        // exceção escapou.
        $this->assertCount(1, $this->alertas());
    }

    public function test_403_real_pela_api_dispara_a_familia(): void
    {
        $this->admin();
        $this->seed(\Database\Seeders\RolePermissionSeeder::class);

        $redator = User::factory()->create(['type' => 'redator', 'is_active' => true]);
        $redator->assignRole('redator');
        $this->actingAs($redator, 'web');

        for ($i = 0; $i < AlertThresholds::ACESSO_NEGADO_LIMIAR; $i++) {
            $this->getJson('/api/users')->assertStatus(403);
        }

        $this->assertCount(1, $this->alertas());
    }
}
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `docker compose exec -T app php artisan test --filter=AcessoSuspeitoTest`
Expected: FAIL com `Class "App\Shared\Alerts\AlertThresholds" not found`.

O teste `test_403_real_pela_api_dispara_a_familia` depende do teto global `throttle:api`, que é 240/min para usuário autenticado — 20 requisições cabem. Se o limiar de `ACESSO_NEGADO_LIMIAR` for revisado para acima de 240 no Step 3, este teste precisa exercitar o detector direto em vez da API; **registrar a troca no docblock**.

- [ ] **Step 3: Escrever os limiares**

Criar `backend/app/Shared/Alerts/AlertThresholds.php`:

```php
<?php

namespace App\Shared\Alerts;

/**
 * Fonte única dos limiares de acesso suspeito (spec §4.6). Mesmo idioma do
 * `Shared/RateLimiting/RateLimits` e do `Shared/Retention/RetentionPolicy`:
 * quem quer saber quando o alerta dispara lê ESTE arquivo.
 *
 * É o "parâmetro de identificação definido" que o `RNF-SEC-07` pede
 * nominalmente — a fonte canônica exige que exista e NÃO diz qual é.
 *
 * Os números saem do desenho de contenção que já está no ar, não de palpite:
 * o limitador `login` é 5 por minuto na chave `email|ip`
 * (`RateLimits::LOGIN`), então 15 falhas em 15 minutos é alguém que continuou
 * tentando depois de tomar 429 — persistência, e não dedo errado. O teto
 * autenticado é 240 por minuto (`RateLimits::API_AUTENTICADO`), então 20
 * negações de autorização em 10 minutos é varredura de permissão, e não a
 * pessoa clicando num botão que não devia estar visível.
 *
 * Sessão de conta desativada não tem limiar de contagem: a primeira já é o
 * evento. A janela existe só para não repetir o mesmo alerta enquanto a aba
 * aberta da pessoa segue tentando.
 */
final class AlertThresholds
{
    /** Falhas na MESMA chave `email|ip` que disparam o alerta. */
    public const LOGIN_FALHO_LIMIAR = 15;

    /** 15 minutos. */
    public const LOGIN_FALHO_JANELA_SEGUNDOS = 900;

    /** 24 horas: um alerta por conta por dia, não um por request da aba aberta. */
    public const SESSAO_REVOGADA_JANELA_SEGUNDOS = 86400;

    /** Negações de autorização do mesmo usuário que disparam o alerta. */
    public const ACESSO_NEGADO_LIMIAR = 20;

    /** 10 minutos. */
    public const ACESSO_NEGADO_JANELA_SEGUNDOS = 600;
}
```

- [ ] **Step 4: Escrever os dicionários**

Criar `backend/lang/es_CL/seguranca.php`:

```php
<?php

return [
    'alerta' => [
        'subject' => 'Lotus — alerta de acceso sospechoso',
        'greeting' => 'Alerta de seguridad',
        'familia' => [
            'login_falho_repetido' => 'Intentos de inicio de sesión fallidos repetidos desde la misma clave de origen.',
            'sessao_de_conta_desativada' => 'Uso de una sesión de una cuenta desactivada.',
            'sequencia_de_403' => 'Secuencia de accesos denegados por autorización.',
        ],
        'ocorrencias' => 'Ocurrencias registradas: :ocorrencias',
        'ip' => 'Dirección IP: :ip',
        'usuario' => 'Usuario involucrado: :usuario',
        'sem_usuario' => 'Sin usuario autenticado identificado.',
        'rodape' => 'Este aviso lo genera el propio sistema. Revise el registro de seguridad para el detalle.',
    ],
];
```

Criar `backend/lang/es/seguranca.php` com o **mesmo conteúdo** do `es_CL`.

Criar `backend/lang/pt_BR/seguranca.php`:

```php
<?php

return [
    'alerta' => [
        'subject' => 'Lotus — alerta de acesso suspeito',
        'greeting' => 'Alerta de segurança',
        'familia' => [
            'login_falho_repetido' => 'Tentativas de login malsucedidas repetidas a partir da mesma chave de origem.',
            'sessao_de_conta_desativada' => 'Uso de sessão de uma conta desativada.',
            'sequencia_de_403' => 'Sequência de acessos negados por autorização.',
        ],
        'ocorrencias' => 'Ocorrências registradas: :ocorrencias',
        'ip' => 'Endereço IP: :ip',
        'usuario' => 'Usuário envolvido: :usuario',
        'sem_usuario' => 'Sem usuário autenticado identificado.',
        'rodape' => 'Este aviso é gerado pelo próprio sistema. Consulte o log de segurança para o detalhe.',
    ],
];
```

Criar `backend/lang/en/seguranca.php`:

```php
<?php

return [
    'alerta' => [
        'subject' => 'Lotus — suspicious access alert',
        'greeting' => 'Security alert',
        'familia' => [
            'login_falho_repetido' => 'Repeated failed sign-in attempts from the same origin key.',
            'sessao_de_conta_desativada' => 'Use of a session belonging to a deactivated account.',
            'sequencia_de_403' => 'Sequence of authorization denials.',
        ],
        'ocorrencias' => 'Recorded occurrences: :ocorrencias',
        'ip' => 'IP address: :ip',
        'usuario' => 'User involved: :usuario',
        'sem_usuario' => 'No authenticated user identified.',
        'rodape' => 'This notice is generated by the system itself. Check the security log for details.',
    ],
];
```

- [ ] **Step 5: Escrever a notificação**

Criar `backend/app/Shared/Alerts/Notifications/AcessoSuspeito.php`:

```php
<?php

namespace App\Shared\Alerts\Notifications;

use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Aviso ao admin de que uma das três famílias de acesso suspeito cruzou o
 * limiar (spec §4.6). Idioma fixado por quem envia, como no
 * `RedatorAccessInvitation`: o destinatário não está numa request e não tem
 * `Accept-Language`.
 *
 * NÃO carrega e-mail alheio, senha nem token — só id de usuário, IP e
 * contagem, que é o mesmo conteúdo da linha do canal de segurança.
 */
class AcessoSuspeito extends Notification
{
    public function __construct(
        private string $familia,
        private ?int $usuarioId,
        private ?string $ip,
        private int $ocorrencias,
    ) {}

    /** @return array<int,string> */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject(__('seguranca.alerta.subject'))
            ->greeting(__('seguranca.alerta.greeting'))
            ->line(__('seguranca.alerta.familia.'.$this->familia))
            ->line(__('seguranca.alerta.ocorrencias', ['ocorrencias' => $this->ocorrencias]))
            ->line(__('seguranca.alerta.ip', ['ip' => $this->ip ?? '—']))
            ->line($this->usuarioId === null
                ? __('seguranca.alerta.sem_usuario')
                : __('seguranca.alerta.usuario', ['usuario' => $this->usuarioId]))
            ->line(__('seguranca.alerta.rodape'));
    }
}
```

- [ ] **Step 6: Escrever o detector**

Criar `backend/app/Shared/Alerts/DetectorDeAcessoSuspeito.php`:

```php
<?php

namespace App\Shared\Alerts;

use App\Domains\Identity\Models\User;
use App\Shared\Alerts\Notifications\AcessoSuspeito;
use App\Shared\Logging\EventoDeSeguranca;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\RateLimiter;
use Throwable;

/**
 * As três famílias de acesso suspeito do `RNF-SEC-07` (spec §4.6), cada uma
 * com condição mensurável, destino e expectativa temporal.
 *
 * Conta nos MESMOS baldes de cache que o throttle já usa: nenhuma infra nova
 * sobe, e a contagem morre sozinha no fim da janela. `RateLimiter::hit()`
 * devolve a contagem depois do incremento, e o alerta dispara na IGUALDADE ao
 * limiar — não em `>=` —, o que dá exatamente um alerta por janela em vez de um
 * por request a partir do limiar.
 *
 * **Síncrono, no request que cruza o limiar (D7).** Produção não tem worker de
 * fila; assíncrono exigiria subir um, e isso é outro bloco. Cruzar limiar é
 * raro por construção e o caminho já é resposta de erro.
 *
 * O envio vai dentro de `try`: alerta que quebra NÃO pode derrubar a resposta.
 * A linha do canal de segurança sai ANTES do e-mail pelo mesmo motivo — ela é
 * o registro que sobrevive a SES fora do ar.
 */
class DetectorDeAcessoSuspeito
{
    public function loginFalho(string $chave, ?string $ip): void
    {
        $ocorrencias = RateLimiter::hit(
            'suspeito:login-falho:'.hash('sha256', $chave),
            AlertThresholds::LOGIN_FALHO_JANELA_SEGUNDOS,
        );

        if ($ocorrencias === AlertThresholds::LOGIN_FALHO_LIMIAR) {
            $this->alertar('login_falho_repetido', null, $ip, $ocorrencias);
        }
    }

    public function sessaoDeContaDesativada(int $usuarioId, ?string $ip): void
    {
        // Sem contagem: a primeira ocorrência JÁ é o evento. O `Cache::add`
        // devolve `true` só para quem chegou primeiro na janela, e é isso que
        // impede uma aba aberta de gerar um alerta por request.
        $primeira = Cache::add(
            'suspeito:sessao-revogada:'.$usuarioId,
            true,
            AlertThresholds::SESSAO_REVOGADA_JANELA_SEGUNDOS,
        );

        if ($primeira) {
            $this->alertar('sessao_de_conta_desativada', $usuarioId, $ip, 1);
        }
    }

    public function acessoNegado(int $usuarioId, ?string $ip): void
    {
        $ocorrencias = RateLimiter::hit(
            'suspeito:403:'.$usuarioId,
            AlertThresholds::ACESSO_NEGADO_JANELA_SEGUNDOS,
        );

        if ($ocorrencias === AlertThresholds::ACESSO_NEGADO_LIMIAR) {
            $this->alertar('sequencia_de_403', $usuarioId, $ip, $ocorrencias);
        }
    }

    private function alertar(string $familia, ?int $usuarioId, ?string $ip, int $ocorrencias): void
    {
        EventoDeSeguranca::alertaDeAcessoSuspeito($familia, $usuarioId, $ip, $ocorrencias);

        try {
            $admins = User::query()
                ->where('type', 'admin')
                ->where('is_active', true)
                ->get();

            if ($admins->isEmpty()) {
                return;
            }

            Notification::send(
                $admins,
                (new AcessoSuspeito($familia, $usuarioId, $ip, $ocorrencias))->locale('es_CL'),
            );
        } catch (Throwable $e) {
            Log::error('Falha ao enviar alerta de acesso suspeito', [
                'familia' => $familia,
                'erro' => $e->getMessage(),
            ]);
        }
    }
}
```

- [ ] **Step 7: Ligar as três famílias aos pontos de captura**

Em `AuthController`, logo depois do `EventoDeSeguranca::loginRecusado(...)` do braço de `attempt()` falho — e **também** no braço de `is_active`, que é a mesma chave:

```php
            app(DetectorDeAcessoSuspeito::class)->loginFalho(
                RateLimits::chaveDeLogin($request),
                $request->ip(),
            );
```

com `use App\Shared\Alerts\DetectorDeAcessoSuspeito;` no topo.

Em `EnsureAccountIsActive`, logo depois do `EventoDeSeguranca::sessaoRevogada(...)`:

```php
            app(DetectorDeAcessoSuspeito::class)->sessaoDeContaDesativada($user->id, $request->ip());
```

com o mesmo `use`.

Em `RegistraEventoDeErro`, dentro do braço de `AuthorizationException`, depois do evento:

```php
        if ($e instanceof AuthorizationException) {
            EventoDeSeguranca::acessoNegado($usuarioId, $request->ip(), $rota);

            // Só há família de "sequência de 403" quando existe usuário para
            // sequenciar: 403 anônimo é ruído de varredura externa, coberto
            // pelo limitador de IP e não por alerta nominal.
            if ($usuarioId !== null) {
                app(DetectorDeAcessoSuspeito::class)->acessoNegado((int) $usuarioId, $request->ip());
            }

            return;
        }
```

com `use App\Shared\Alerts\DetectorDeAcessoSuspeito;` no topo.

- [ ] **Step 8: Rodar e ver passar**

Run: `docker compose exec -T app php artisan test --filter=AcessoSuspeitoTest`
Expected: PASS, 8 testes.

- [ ] **Step 9: Rodar a suíte inteira**

Run: `docker compose exec -T app php artisan test`
Expected: verde.

- [ ] **Step 10: Revisar os limiares com a suíte na mão**

Se algum teste existente passou a alertar sem que devesse (por exemplo, um teste de permissão que faz muitos 403 seguidos), isso é **medição** e não incômodo: registrar o número real observado e decidir. Trocar um limiar aqui é permitido, **desde que o número novo entre com a razão ao lado no docblock do `AlertThresholds`** — nenhum número sem justificativa escrita.

- [ ] **Step 11: Formatar e commitar**

```bash
cd backend && ./vendor/bin/pint app/Shared/Alerts app/Shared/Logging/RegistraEventoDeErro.php app/Domains/Identity/Http/Controllers/AuthController.php app/Shared/Http/Middleware/EnsureAccountIsActive.php lang tests/Feature/Shared/AcessoSuspeitoTest.php
cd .. && git add backend/app backend/lang backend/tests/Feature/Shared/AcessoSuspeitoTest.php
git commit -m "feat(seguranca): tres familias de acesso suspeito com limiar, destino e expectativa temporal"
```

---

## Task 9: Segredos, ADR-21 e sincronização dos docs

**Files:**
- Create: `docs/operacao-segredos.md`
- Modify: `docs/adrs.md` (ADR-21 e a pendência aberta de pruning)
- Modify: `docs/der-fisico.md` (fichas de `audits` e `login_logs`)
- Modify: `docs/estrutura-monolito.md` (linha do `Console/`)
- Modify: `docs/superpowers/pendencias/abertas.md`, `docs/superpowers/pendencias/encerradas.md`, `docs/superpowers/pendencias/README.md`

**Interfaces:**
- Consumes: tudo que as Tasks 1–8 entregaram.
- Produces: nenhum símbolo de código.

- [ ] **Step 1: Escrever `docs/operacao-segredos.md`**

O documento precisa ter, nesta ordem:

1. **Onde os segredos vivem hoje.** `env_file: ${LOTUS_ENV_FILE:-/opt/lotus/.env}` no `docker-compose.prod.yml`, fora da imagem e fora do repositório. O `docker/Dockerfile.prod` COPIA o código, nunca monta, e o `docker/php/entrypoint.sh` recusa o arranque se faltar `APP_KEY`, `APP_URL`, `DB_HOST`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`, `SESSION_DOMAIN`, `FRONTEND_URL` ou `SANCTUM_STATEFUL_DOMAINS`.
2. **Por que não há cofre gerenciado ainda.** Decisão do João de 2026-08-26: cofre real depende de conta AWS e está no item 10 (`infra-producao-provisionamento-aws`). O `RNF-SEC-03` pede "fora do código, em cofre de segredos"; a metade "fora do código" está cumprida, a outra metade está datada e atribuída.
3. **Inventário**, uma linha por segredo: `APP_KEY`, `DB_PASSWORD`, credenciais de SES, credenciais de S3, `SANCTUM_STATEFUL_DOMAINS`/`SESSION_DOMAIN` (não são segredo, mas quebram o login se errados e entram como nota).
4. **Procedimento de rotação por segredo**, cada um com o passo a passo e o efeito colateral.
5. **O aviso do `APP_KEY`, em destaque:** rotacionar invalida TODA sessão viva e TODO valor cifrado pela chave antiga. A rotação passa por `APP_PREVIOUS_KEYS`, mantendo a chave velha na lista até ter certeza de que nada cifrado com ela sobrou — não por trocar a linha e reiniciar o container.
6. **Cadência**, e o gatilho de rotação fora de cadência (saída de pessoa com acesso, suspeita de vazamento, alerta de acesso suspeito confirmado).

- [ ] **Step 2: Escrever o ADR-21**

Acrescentar ao fim de `docs/adrs.md`, no formato dos ADRs existentes:

`## ADR-21 — Logs de ações centralizados no monólito, sem microserviço em nuvem`

Precisa conter: que o `RNF-SEC-05` pede literalmente "Micro-serviço em nuvem com logs das ações do software"; que a decisão do João de 2026-08-26 é centralizar dentro do monólito; o porquê (≈10 usuários internos, uma EC2, nenhum worker de fila — microserviço próprio seria mais superfície de operação que de proteção); o que se perde (o log morre com a instância se o coletor não estiver de pé, e a retenção é o teto `json-file` 10 MB × 3); e a frase explícita de que **isto substitui a forma escrita no requisito**, com a revisão a ser replicada no Drive, que é a fonte canônica.

Atualizar também a linha de pendência aberta de `docs/adrs.md:296` ("Estratégia fina de pruning da auditoria (ADR-08)"): ela está paga por este bloco e vira ponteiro para o `RetentionPolicy` e para os dois comandos.

- [ ] **Step 3: Atualizar `docs/der-fisico.md`**

Nas fichas de `audits` e `login_logs`, acrescentar a retenção: `audits` anonimiza `ip_address`/`user_agent`/`url` aos 12 meses e descarta a linha aos 5 anos; `login_logs` descarta aos 12 meses. Citar `app/Shared/Retention/RetentionPolicy.php` como a fonte dos números e o índice novo `audits_created_at_index`.

- [ ] **Step 4: Atualizar `docs/estrutura-monolito.md`**

A linha do `Console/` diz "planejado, NÃO existe ainda — comandos (ex: pruning da auditoria, ADR-08) nascem quando a poda entrar em desenvolvimento". Ela agora está errada: trocar pela descrição do que existe, com os dois comandos nomeados.

Acrescentar `Shared/Retention/`, `Shared/Logging/` e `Shared/Alerts/` à listagem de `app/Shared/`.

- [ ] **Step 5: Fechar P-02 e P-33, abrir P-62**

Em `docs/superpowers/pendencias/`:

- **P-02** ("ADR-08 pruning/retenção da auditoria segue aberto") e **P-33** ("`login_logs.ip_address`/`user_agent` são dado pessoal sem política de retenção") saem de `abertas.md` para `encerradas.md`, cada uma apontando o mecanismo que a pagou: `RetentionPolicy`, `PodarAuditoria`, `PodarLogins`, o índice e a catraca de agendamento. **Fechar por mecanismo, nunca por promessa.**
- **P-62** entra em `abertas.md`: "A revisão do `RNF-SEC-05` está no ADR-21 mas ainda não foi replicada no Drive". Dono: João Victor. Gatilho: a fonte canônica vence os `/docs` (`CLAUDE.md` §3), então enquanto o Drive disser "Micro-serviço em nuvem" a divergência é real e uma sessão futura pode reabrir a decisão sem saber que ela já foi tomada.
- Atualizar o índice `README.md` de `pendencias/`.

- [ ] **Step 6: Conferir a coerência dos docs contra o código**

Run: `/auditar-docs`
Expected: nenhuma divergência nova introduzida por este bloco. Divergência preexistente que a auditoria encontre vira ficha nova, **não conserto aqui**.

- [ ] **Step 7: Commitar**

```bash
git add docs/
git commit -m "docs(seguranca): ADR-21, operacao de segredos, retencao no DER e fechamento da P-02 e da P-33"
```

---

## Verificação final do bloco

Rodar antes de pedir revisão. Cada linha aqui é um item da DoD da spec §7.

- [ ] `docker compose exec -T app php artisan test` — suíte inteira verde.
- [ ] `cd backend && ./vendor/bin/pint --test app` — formatação limpa.
- [ ] `docker compose exec -T app php artisan schedule:list` — as duas podas listadas.
- [ ] `LOTUS_ENV_FILE=./docker/probe.env docker compose -f docker-compose.prod.yml config --services` — traz `scheduler`.
- [ ] `docker compose exec -T app php artisan lotus:podar-auditoria` e `lotus:podar-logins` rodam contra o MySQL de dev e imprimem a contagem por fase.
- [ ] `EXPLAIN` do recorte por data usa `audits_created_at_index`.
- [ ] `cd frontend && pnpm build` — **nenhuma mudança de frontend é esperada neste bloco**; o build é a prova de que nada quebrou por tabela. `generated.ts` não muda porque nenhum DTO mudou.
- [ ] As três catracas foram vistas REPROVANDO contra o código sem a proteção (Task 2 Step 6, Task 5 Step 6, e a asserção de "podar não gera trilha" conferida invertendo-a uma vez).
- [ ] `docs/operacao-segredos.md`, ADR-21 e P-62 existem; P-02 e P-33 estão em `encerradas.md`.

---

## Handoff de execução

**executor: claude**

Não é tarefa mecânica de caminho fechado. Três razões, cada uma bastando sozinha:

1. **Toca duas leis do `CLAUDE.md` §5 no ponto exato em que elas se contradizem na superfície.** A §5.2 (auditoria só na aplicação) e a lição 5 do `docs/README.md` (usar `$model->delete()`, nunca delete de builder) mandam preservar trilha; a poda existe para apagá-la. A escrita crua das Tasks 3 e 4 **parece** violação das duas e é o oposto disso — quem executa precisa entender por que, não seguir a instrução. Errar aqui não quebra teste: gera auditoria da auditoria em produção, silenciosamente.
2. **Cinco números ainda podem mudar durante a execução.** Os limiares das três famílias e as duas janelas de alerta têm gatilho explícito de revisão no Step 10 da Task 8, e o `EXPLAIN` da Task 1 pode não confirmar o índice numa tabela pequena e exigir uma segunda forma de prova. Trocar um número medido por outro medido é decisão, e a decisão precisa ficar escrita no docblock ao lado do número.
3. **Duas tasks alteram o caminho de autenticação em produção.** A Task 7 mexe no `AuthController`, no `EnsureAccountIsActive` e no `render()` do handler global — os três arquivos que o bloco anterior deixou com comentário de risco medido. Um evento emitido na ordem errada (depois do `logout()`, antes do gate de `is_active`) registra a coisa errada sem falhar nenhum teste.

Onde o Codex ajuda melhor neste bloco é **depois**: revisão independente do resultado, pelo `/revisar-sprint`.

**Árvore:** main tree, pelo precedente de todo bloco de backend e porque a P-03 foi paga pelo `compose-por-worktree` — é escolha, não imposição do compose. Branch `feat/hardening-auditoria-privacidade-e-observabilidade`, já criada a partir de `main@038b4a70`.

**Ordem das tasks é dependência, não preferência.** A Task 1 vem primeiro porque as duas podas leem a política dela. A Task 2 vem antes das podas porque elas registram o resultado no canal, e antes da Task 7 porque é a fachada que os pontos de captura chamam. A Task 5 vem depois das duas podas porque a catraca dela nomeia comandos que precisam existir. A Task 6 vem depois da 5 porque um `schedule:work` sem agendamento nenhum é um container que não faz nada. A Task 8 vem depois da 7 porque as três famílias penduram no mesmo ponto de captura em que os eventos já estão, e porque ela consome a `chaveDeLogin()` que a Task 7 torna pública. A Task 9 vem por último porque documenta o que as outras oito provaram.
