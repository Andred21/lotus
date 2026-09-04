# Envelope de erro e recusa de domínio — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** a exceção de domínio declara a recusa e o `ProblemDetails` traduz recusa em status e em frase localizada, fechando `P-71`, `P-72` e a metade de comportamento da `P-60`.

**Architecture:** uma classe base `App\Shared\Exceptions\RecusaDeDominio` e um enum `TipoDeRecusa` concentram o mapa recusa→status/título/tipo. As quatro exceções de domínio param de estender `HttpException`; `ProblemDetails` ganha um braço para a base e `RegistraEventoDeErro` passa a consultar o mesmo mapa. As cinco frases literais migram para `lang/` nos três locales, o 419 ganha `problem.detail.csrf`, e o veredito da `P-60` (continuar estourando) vira teste.

**Tech Stack:** Laravel 13 / PHP 8.3, PHPUnit, `lang/{en,es_CL,pt_BR}`, Pint.

## Global Constraints

- Spec: [`docs/superpowers/specs/2026-09-02-backend-envelope-de-erro-e-recusa-de-dominio-design.md`](../../specs/archive/2026-09-02-backend-envelope-de-erro-e-recusa-de-dominio-design.md). Divergência entre plano e spec bloqueia a task.
- **Bloco de backend roda no main tree** (pendência P-03), branch `refactor/backend-envelope-de-erro-e-recusa-de-dominio`.
- Backend roda **no container**: `docker compose exec -T app php artisan test [--filter=X]`.
- Pint roda **no host, de dentro de `backend/`, sempre com argumentos**: `cd backend && ./vendor/bin/pint <arquivos>`.
- **Nenhum teste de endpoint existente pode ser editado.** Eles passando intactos é o que prova que o contrato HTTP não mudou. Teste que precisa de edição = contrato quebrado, PARE e reporte.
- **Nenhum DTO muda** — `generated.ts` fecha o bloco com diff vazio.
- Os três locales são exatamente `en`, `es_CL`, `pt_BR`. Chave nova entra nos três no mesmo commit (`LocaleParityTest` reprova o contrário).
- Sonda de catraca se prova copiando o arquivo para o scratchpad (`/tmp/claude-1000/-home-jvbat-projetos-lotus/75aa1e61-ac59-4bed-a9ff-9f5d25c823bb/scratchpad`) e restaurando de lá. **Nunca `git stash`** — a pilha tem stashes alheios.
- Lei §5.4 do `CLAUDE.md`: erro sobe ao handler global RFC 7807, nunca `abort(422)`. Este bloco mexe no mecanismo dela — mudança de desenho fora do que a spec fixa exige decisão do João.

## Estrutura de arquivos

**Criar**
- `backend/app/Shared/Exceptions/TipoDeRecusa.php` — o enum e o mapa tipo→status/título/tipo-URI. Dono único da tradução recusa→HTTP.
- `backend/app/Shared/Exceptions/RecusaDeDominio.php` — base abstrata das recusas de domínio.
- `backend/tests/Unit/Shared/RecusaDeDominioTest.php` — catraca estática: domínio não conhece HTTP.

**Modificar**
- `backend/app/Shared/Exceptions/ProblemDetails.php` — braço da base; poda do comentário do `isForbidden`.
- `backend/app/Shared/Logging/RegistraEventoDeErro.php` — `isAcessoNegado()` consulta o mapa.
- `backend/app/Domains/Operation/Exceptions/{TurmaConfiguracaoException,RedatorNaoElegivelException}.php`
- `backend/app/Domains/Identity/Exceptions/{ImmutableSystemRoleException,RedatorOnlyActionException}.php`
- `backend/app/Domains/Certification/Exceptions/CorruptedSnapshotException.php`
- `backend/lang/{en,es_CL,pt_BR}/{operation,certification,problem}.php`
- `backend/tests/Unit/Shared/MensagemLiteralTest.php` — `DEBITO_CONHECIDO` encolhe cinco linhas.
- `backend/tests/Feature/Certification/CertificateListingTest.php:191,220` — as duas asserções de frase inteira passam a comparar contra `__()`. **São as únicas asserções de teste que este plano autoriza editar.**
- `backend/tests/Feature/Shared/EventosDeAcessoTest.php` — teste comportamental novo.
- `backend/tests/Feature/Shared/EnvelopeLocalizadoTest.php` — 419 e 500 público nos três locales.
- `backend/tests/Feature/Certification/MensagemDeCertificadoLocalizadaTest.php` — chave nova na lista.

---

### Task 1: O mapa da recusa e o braço do envelope

**Files:**
- Create: `backend/app/Shared/Exceptions/TipoDeRecusa.php`
- Create: `backend/app/Shared/Exceptions/RecusaDeDominio.php`
- Modify: `backend/app/Shared/Exceptions/ProblemDetails.php:22-31`
- Test: `backend/tests/Feature/Shared/EnvelopeLocalizadoTest.php`

**Interfaces:**
- Consumes: `App\Shared\Exceptions\PublicDetail` (interface existente, vazia).
- Produces: `TipoDeRecusa::{RegraDeNegocio,AcaoProibida}` com `status(): int`, `tituloChave(): string`, `tipoUri(): string`; `RecusaDeDominio` abstrata com `abstract public function tipo(): TipoDeRecusa`. As Tasks 2, 3 e 4 dependem desses nomes exatos.

**Por que o `detailFor()` não muda:** `RecusaDeDominio` implementa `PublicDetail`, e o `if ($e instanceof PublicDetail || $e instanceof ValidationException)` de `ProblemDetails.php:78` já devolve `getMessage()`. Medido contra o código atual em 2026-09-02: é o mesmo `detail` que as quatro exceções produzem hoje. Braço novo ali seria código morto.

- [ ] **Step 1: Escrever o teste que reprova**

Acrescente ao fim de `backend/tests/Feature/Shared/EnvelopeLocalizadoTest.php`, antes do `}` final da classe:

```php
    /**
     * O envelope de uma recusa de domínio sai do MAPA, não de um status que a
     * exceção fixou. As duas recusas do enum são medidas pela mesma porta:
     * `RegraDeNegocio` mantém o par 422/`problem.title.http` que o braço
     * `HttpExceptionInterface` produzia, e `AcaoProibida` mantém o par
     * 403/`problem.title.forbidden` que o `isForbidden()` produzia — é o
     * contrato que os testes de endpoint existentes afirmam.
     */
    #[Test]
    public function a_recusa_de_dominio_tira_status_titulo_e_tipo_do_mapa(): void
    {
        $regra = new class extends \App\Shared\Exceptions\RecusaDeDominio
        {
            public function tipo(): \App\Shared\Exceptions\TipoDeRecusa
            {
                return \App\Shared\Exceptions\TipoDeRecusa::RegraDeNegocio;
            }
        };

        $proibida = new class extends \App\Shared\Exceptions\RecusaDeDominio
        {
            public function tipo(): \App\Shared\Exceptions\TipoDeRecusa
            {
                return \App\Shared\Exceptions\TipoDeRecusa::AcaoProibida;
            }
        };

        $envelope = fn (\Throwable $e) => \App\Shared\Exceptions\ProblemDetails::fromException(
            $e,
            \Illuminate\Http\Request::create('/api/qualquer'),
        )->getData(true);

        $este = $envelope($regra);
        $this->assertSame(422, $este['status']);
        $this->assertSame(__('problem.title.http'), $este['title']);
        $this->assertSame('https://lotus.cl/errors/http', $este['type']);

        $aquele = $envelope($proibida);
        $this->assertSame(403, $aquele['status']);
        $this->assertSame(__('problem.title.forbidden'), $aquele['title']);
        $this->assertSame('https://lotus.cl/errors/forbidden', $aquele['type']);
    }
```

- [ ] **Step 2: Rodar e ver reprovar**

```bash
docker compose exec -T app php artisan test --filter=EnvelopeLocalizadoTest
```

Esperado: FAIL com `Class "App\Shared\Exceptions\RecusaDeDominio" not found`.

- [ ] **Step 3: Criar o enum**

`backend/app/Shared/Exceptions/TipoDeRecusa.php`:

```php
<?php

namespace App\Shared\Exceptions;

/**
 * O tipo da recusa que um domínio pode emitir, e o único lugar que traduz
 * recusa em HTTP.
 *
 * Antes deste enum a tradução estava em quatro exceções de domínio (cada uma
 * fixando `new self(422|403, ...)`) mais o `isForbidden()` do
 * `ProblemDetails`, que precisava farejar o status de volta para escolher o
 * título. O domínio decidia o transporte e o envelope adivinhava.
 *
 * `tituloChave()` e `tipoUri()` moram aqui, e não no `ProblemDetails`, porque
 * é o que mantém o par status/título indivisível: os valores abaixo são
 * exatamente os que os braços antigos produziam, e mudá-los muda contrato
 * afirmado por teste de endpoint.
 */
enum TipoDeRecusa
{
    /** Regra de negócio recusou a operação. */
    case RegraDeNegocio;

    /** A ação é proibida para quem a pediu. */
    case AcaoProibida;

    public function status(): int
    {
        return match ($this) {
            self::RegraDeNegocio => 422,
            self::AcaoProibida => 403,
        };
    }

    public function tituloChave(): string
    {
        return match ($this) {
            self::RegraDeNegocio => 'problem.title.http',
            self::AcaoProibida => 'problem.title.forbidden',
        };
    }

    public function tipoUri(): string
    {
        return match ($this) {
            self::RegraDeNegocio => 'https://lotus.cl/errors/http',
            self::AcaoProibida => 'https://lotus.cl/errors/forbidden',
        };
    }
}
```

- [ ] **Step 4: Criar a base**

`backend/app/Shared/Exceptions/RecusaDeDominio.php`:

```php
<?php

namespace App\Shared\Exceptions;

use RuntimeException;

/**
 * Recusa emitida por uma regra de domínio.
 *
 * **Não estende `HttpException` de propósito:** o domínio declara O QUE
 * recusou (`tipo()`), e quem conhece HTTP é o `TipoDeRecusa` — consultado pelo
 * `ProblemDetails` (envelope) e pelo `RegistraEventoDeErro` (evento de
 * segurança). Exceção de domínio que volte a citar status reprova no
 * `RecusaDeDominioTest`.
 *
 * **É `PublicDetail` por construção**, não por escolha caso a caso: a
 * mensagem de uma recusa é escrita para quem lê a resposta, e sem a marca o
 * `detailFor()` a trocaria pelo genérico de `lang/`. A obrigação que a
 * interface impõe vale inteira — a frase sai de `lang/`, no idioma do
 * usuário, e não vaza caminho, SQL nem dado de terceiro.
 *
 * **O que se perde:** `ProblemDetails::fromException()` só monta headers a
 * partir de `HttpExceptionInterface`. Recusa que precise de header próprio
 * (`Retry-After`, por exemplo) não cabe aqui sem desenho novo.
 */
abstract class RecusaDeDominio extends RuntimeException implements PublicDetail
{
    abstract public function tipo(): TipoDeRecusa;
}
```

- [ ] **Step 5: Ligar o braço no `ProblemDetails`**

Em `backend/app/Shared/Exceptions/ProblemDetails.php`, dentro do `match (true)` de `fromException()`, insira o braço **imediatamente antes** da linha `self::isForbidden($e) =>`:

```php
            $e instanceof RecusaDeDominio => [
                $e->tipo()->status(),
                __($e->tipo()->tituloChave()),
                $e->tipo()->tipoUri(),
            ],
```

- [ ] **Step 6: Rodar e ver passar**

```bash
docker compose exec -T app php artisan test --filter=EnvelopeLocalizadoTest
```

Esperado: PASS, 4 testes.

- [ ] **Step 7: Pint e commit**

```bash
cd backend && ./vendor/bin/pint app/Shared/Exceptions/TipoDeRecusa.php app/Shared/Exceptions/RecusaDeDominio.php app/Shared/Exceptions/ProblemDetails.php tests/Feature/Shared/EnvelopeLocalizadoTest.php
cd /home/jvbat/projetos/lotus
git add backend/app/Shared/Exceptions backend/tests/Feature/Shared/EnvelopeLocalizadoTest.php
git commit -m "feat(erros): o tipo da recusa nasce e o envelope o consulta"
```

---

### Task 2: As duas recusas de Operation

**Files:**
- Modify: `backend/app/Domains/Operation/Exceptions/TurmaConfiguracaoException.php`
- Modify: `backend/app/Domains/Operation/Exceptions/RedatorNaoElegivelException.php`
- Modify: `backend/lang/{en,es_CL,pt_BR}/operation.php`
- Modify: `backend/tests/Unit/Shared/MensagemLiteralTest.php` (`DEBITO_CONHECIDO`, quatro linhas saem)
- Test: `backend/tests/Feature/Operation/MensagemDeOperacaoLocalizadaTest.php` (criar)

**Interfaces:**
- Consumes: `RecusaDeDominio`, `TipoDeRecusa::RegraDeNegocio` (Task 1).
- Produces: as chaves `operation.turma.quote_not_approved`, `operation.turma.already_exists`, `operation.redator.not_qualified`, `operation.redator.reuf_invalid`.

**Contrato que não pode mudar:** os `throw` continuam em `CreateTurmaAction:34,37` e `RedatorIdoneidadeService:21,24`, com as mesmas factories (`cotacaoNaoAprovada`, `turmaJaExiste`, `naoHabilitado`, `reufInvalido`) e o mesmo 422. `TurmaCrudTest` e `TurmaDesignationTest` não são tocados.

- [ ] **Step 1: Escrever o teste que reprova**

Criar `backend/tests/Feature/Operation/MensagemDeOperacaoLocalizadaTest.php`:

```php
<?php

namespace Tests\Feature\Operation;

use App\Domains\Operation\Exceptions\RedatorNaoElegivelException;
use App\Domains\Operation\Exceptions\TurmaConfiguracaoException;
use App\Shared\Exceptions\TipoDeRecusa;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

/**
 * As quatro recusas de Operation falam os três idiomas e declaram o tipo em
 * vez do status. Molde do `MensagemDeIdentidadeLocalizadaTest`.
 */
class MensagemDeOperacaoLocalizadaTest extends TestCase
{
    private const CHAVES = [
        'operation.turma.quote_not_approved',
        'operation.turma.already_exists',
        'operation.redator.not_qualified',
        'operation.redator.reuf_invalid',
    ];

    #[Test]
    public function as_quatro_recusas_tem_tres_traducoes_distintas(): void
    {
        foreach (self::CHAVES as $chave) {
            $valores = [];
            foreach (['es_CL', 'pt_BR', 'en'] as $locale) {
                app()->setLocale($locale);
                $valor = __($chave);
                $this->assertNotSame($chave, $valor, "{$chave} falta em {$locale}.");
                $valores[] = $valor;
            }
            $this->assertCount(3, array_unique($valores), "{$chave} repete texto entre locales.");
        }
    }

    #[Test]
    public function a_frase_da_recusa_sai_de_lang_no_locale_corrente(): void
    {
        app()->setLocale('es_CL');

        $this->assertSame(
            __('operation.turma.quote_not_approved'),
            TurmaConfiguracaoException::cotacaoNaoAprovada()->getMessage(),
        );
        $this->assertSame(
            __('operation.turma.already_exists'),
            TurmaConfiguracaoException::turmaJaExiste()->getMessage(),
        );
        $this->assertSame(
            __('operation.redator.not_qualified'),
            RedatorNaoElegivelException::naoHabilitado()->getMessage(),
        );
        $this->assertSame(
            __('operation.redator.reuf_invalid'),
            RedatorNaoElegivelException::reufInvalido()->getMessage(),
        );
    }

    #[Test]
    public function as_quatro_recusam_por_regra_de_negocio(): void
    {
        foreach ([
            TurmaConfiguracaoException::cotacaoNaoAprovada(),
            TurmaConfiguracaoException::turmaJaExiste(),
            RedatorNaoElegivelException::naoHabilitado(),
            RedatorNaoElegivelException::reufInvalido(),
        ] as $recusa) {
            $this->assertSame(TipoDeRecusa::RegraDeNegocio, $recusa->tipo());
            $this->assertSame(422, $recusa->tipo()->status());
        }
    }
}
```

- [ ] **Step 2: Rodar e ver reprovar**

```bash
docker compose exec -T app php artisan test --filter=MensagemDeOperacaoLocalizadaTest
```

Esperado: FAIL — `operation.turma.quote_not_approved falta em es_CL.`

- [ ] **Step 3: Escrever as chaves nos três locales**

Em `backend/lang/es_CL/operation.php`, dentro do array `'turma' => [...]`, acrescente ao fim:

```php
        'quote_not_approved' => 'La cotización debe estar aprobada para configurar la clase.',
        'already_exists' => 'Esta cotización ya tiene una clase configurada.',
```

e, como irmão de `'turma'`, o bloco novo:

```php
    'redator' => [
        'not_qualified' => 'El relator no está habilitado para dictar este curso.',
        'reuf_invalid' => 'El relator no tiene REUF válido (documento ausente o vencido).',
    ],
```

Em `backend/lang/pt_BR/operation.php`, mesmas posições:

```php
        'quote_not_approved' => 'A cotação precisa estar aprovada para configurar a turma.',
        'already_exists' => 'Esta cotação já tem uma turma configurada.',
```

```php
    'redator' => [
        'not_qualified' => 'Redator não está habilitado a ministrar este curso.',
        'reuf_invalid' => 'Redator não possui REUF válido (documento ausente ou vencido).',
    ],
```

Em `backend/lang/en/operation.php`:

```php
        'quote_not_approved' => 'The quote must be approved before configuring the class.',
        'already_exists' => 'This quote already has a class configured.',
```

```php
    'redator' => [
        'not_qualified' => 'The instructor is not qualified to teach this course.',
        'reuf_invalid' => 'The instructor has no valid REUF (document missing or expired).',
    ],
```

- [ ] **Step 4: Migrar as duas exceções**

`backend/app/Domains/Operation/Exceptions/TurmaConfiguracaoException.php` inteiro:

```php
<?php

namespace App\Domains\Operation\Exceptions;

use App\Shared\Exceptions\RecusaDeDominio;
use App\Shared\Exceptions\TipoDeRecusa;

/**
 * Configuração de turma inválida (cotação não aprovada ou turma já existente).
 * Recusa de regra de negócio: o `ProblemDetails` a traduz em 422.
 */
class TurmaConfiguracaoException extends RecusaDeDominio
{
    public function tipo(): TipoDeRecusa
    {
        return TipoDeRecusa::RegraDeNegocio;
    }

    public static function cotacaoNaoAprovada(): self
    {
        return new self(__('operation.turma.quote_not_approved'));
    }

    public static function turmaJaExiste(): self
    {
        return new self(__('operation.turma.already_exists'));
    }
}
```

`backend/app/Domains/Operation/Exceptions/RedatorNaoElegivelException.php` inteiro:

```php
<?php

namespace App\Domains\Operation\Exceptions;

use App\Shared\Exceptions\RecusaDeDominio;
use App\Shared\Exceptions\TipoDeRecusa;

/**
 * Redator não pode ser designado à turma (gate RN-09). Recusa de regra de
 * negócio: o `ProblemDetails` a traduz em 422. Chave distinta por causa para
 * o front diferenciar (não-habilitado vs REUF ausente/vencido).
 */
class RedatorNaoElegivelException extends RecusaDeDominio
{
    public function tipo(): TipoDeRecusa
    {
        return TipoDeRecusa::RegraDeNegocio;
    }

    public static function naoHabilitado(): self
    {
        return new self(__('operation.redator.not_qualified'));
    }

    public static function reufInvalido(): self
    {
        return new self(__('operation.redator.reuf_invalid'));
    }
}
```

- [ ] **Step 5: Encolher a `DEBITO_CONHECIDO`**

Em `backend/tests/Unit/Shared/MensagemLiteralTest.php`, apague as quatro linhas:

```php
        'RedatorNaoElegivelException.php:16' => 'HttpException(422) em pt-BR; frente Operation.',
        'RedatorNaoElegivelException.php:21' => 'HttpException(422) em pt-BR; frente Operation.',
        'TurmaConfiguracaoException.php:15' => 'HttpException(422) em pt-BR; frente Operation.',
        'TurmaConfiguracaoException.php:20' => 'HttpException(422) em pt-BR; frente Operation.',
```

A linha `'CorruptedSnapshotException.php:42'` fica — ela sai na Task 5.

- [ ] **Step 6: Rodar as três frentes**

```bash
docker compose exec -T app php artisan test --filter=MensagemDeOperacaoLocalizadaTest
docker compose exec -T app php artisan test --filter="MensagemLiteralTest|LocaleParityTest"
docker compose exec -T app php artisan test --filter="TurmaCrudTest|TurmaDesignationTest|RedatorIdoneidadeServiceTest"
```

Esperado: PASS nas três, **sem nenhuma edição** nos arquivos de teste da terceira linha. Se algum reprovar, o contrato mudou — PARE e reporte.

- [ ] **Step 7: Pint e commit**

```bash
cd backend && ./vendor/bin/pint app/Domains/Operation/Exceptions lang tests/Feature/Operation/MensagemDeOperacaoLocalizadaTest.php tests/Unit/Shared/MensagemLiteralTest.php
cd /home/jvbat/projetos/lotus
git add backend/app/Domains/Operation/Exceptions backend/lang backend/tests
git commit -m "feat(operation): as quatro recusas declaram o tipo e leem lang/"
```

---

### Task 3: As duas recusas de Identity e o evento de acesso negado

**Files:**
- Modify: `backend/app/Domains/Identity/Exceptions/ImmutableSystemRoleException.php`
- Modify: `backend/app/Domains/Identity/Exceptions/RedatorOnlyActionException.php`
- Modify: `backend/app/Shared/Logging/RegistraEventoDeErro.php:100-105`
- Test: `backend/tests/Feature/Shared/EventosDeAcessoTest.php`

**Interfaces:**
- Consumes: `RecusaDeDominio`, `TipoDeRecusa::AcaoProibida` (Task 1).
- Produces: nada novo — as duas exceções mantêm o construtor `__construct(?string $message = null)`, porque `SystemRoleGuard:23` e `Role.php:31,41` passam mensagem própria já vinda de `lang/`.

**O defeito que esta task existe para impedir:** `isAcessoNegado()` casa hoje `HttpExceptionInterface && getStatusCode() === 403`. Sair de `HttpException` tira as duas do evento `acesso.negado` **em silêncio**.

- [ ] **Step 1: Escrever o teste que reprova**

Acrescente a `backend/tests/Feature/Shared/EventosDeAcessoTest.php`, antes do `}` final da classe:

```php
    /**
     * O 403 que nasce de RECUSA DE DOMÍNIO também é acesso negado.
     *
     * `RedatorOnlyActionException` deixou de estender `HttpException` no bloco
     * do envelope; o teto por `getStatusCode() === 403` do
     * `RegistraEventoDeErro` não a alcança mais, e sem o braço do
     * `TipoDeRecusa` este evento sumiria sem nenhum teste reprovar. É a razão
     * de este teste existir.
     */
    public function test_recusa_de_dominio_403_registra_evento(): void
    {
        $this->seed(RolePermissionSeeder::class);

        $admin = User::factory()->create(['type' => 'admin', 'is_active' => true]);
        $admin->assignRole('admin');
        $this->actingAs($admin, 'web');

        // Admin não tem perfil de redator: a ação self-service recusa com
        // `RedatorOnlyActionException`.
        $this->postJson('/api/profile/documents')->assertStatus(403);

        $eventos = $this->eventos('acesso.negado');

        $this->assertCount(1, $eventos);
        $this->assertSame($admin->id, $eventos[0]['usuario_id']);
        $this->assertSame('api/profile/documents', $eventos[0]['rota']);
    }
```

- [ ] **Step 2: Rodar e ver PASSAR (ainda pelo caminho antigo)**

```bash
docker compose exec -T app php artisan test --filter=test_recusa_de_dominio_403_registra_evento
```

Esperado: PASS. Hoje a exceção ainda é `HttpException(403)`. É a linha de base: a Step 4 vai fazê-lo reprovar.

- [ ] **Step 3: Migrar as duas exceções**

`backend/app/Domains/Identity/Exceptions/ImmutableSystemRoleException.php` inteiro:

```php
<?php

namespace App\Domains\Identity\Exceptions;

use App\Shared\Exceptions\RecusaDeDominio;
use App\Shared\Exceptions\TipoDeRecusa;

/**
 * Tentativa de mutar uma role de sistema (superadmin/admin/redator).
 * Recusa de ação proibida: o `ProblemDetails` a traduz em 403.
 *
 * O default é `null` e não a frase (Q-2 do review de 2026-08-30): parâmetro
 * default de construtor é expressão constante e não aceita `__()`, então a
 * frase nascia literal em português. Resolver o texto no corpo é o que põe
 * esta recusa dentro de `lang/` como as outras. Os chamadores que passam
 * mensagem própria (`SystemRoleGuard`, `Role`) já a trazem de `lang/`.
 */
class ImmutableSystemRoleException extends RecusaDeDominio
{
    public function __construct(?string $message = null)
    {
        parent::__construct($message ?? __('identity.errors.system_role_immutable'));
    }

    public function tipo(): TipoDeRecusa
    {
        return TipoDeRecusa::AcaoProibida;
    }
}
```

`backend/app/Domains/Identity/Exceptions/RedatorOnlyActionException.php` inteiro:

```php
<?php

namespace App\Domains\Identity\Exceptions;

use App\Shared\Exceptions\RecusaDeDominio;
use App\Shared\Exceptions\TipoDeRecusa;

/**
 * Ação self-service de redator alcançada por um usuário sem perfil de redator
 * (ex.: admin em `POST /api/profile/documents`). Recusa de ação proibida: o
 * `ProblemDetails` a traduz em 403.
 *
 * Default `null` em vez da frase pelo mesmo motivo da irmã
 * `ImmutableSystemRoleException` (Q-2 do review de 2026-08-30).
 */
class RedatorOnlyActionException extends RecusaDeDominio
{
    public function __construct(?string $message = null)
    {
        parent::__construct($message ?? __('identity.errors.redator_only_action'));
    }

    public function tipo(): TipoDeRecusa
    {
        return TipoDeRecusa::AcaoProibida;
    }
}
```

- [ ] **Step 4: Rodar e ver o teste da Step 1 reprovar**

```bash
docker compose exec -T app php artisan test --filter=test_recusa_de_dominio_403_registra_evento
```

Esperado: FAIL — `Failed asserting that actual size 0 matches expected size 1`. É o defeito em silêncio, visível.

- [ ] **Step 5: Ligar o logger ao mapa**

Em `backend/app/Shared/Logging/RegistraEventoDeErro.php`, troque o método `isAcessoNegado()` por:

```php
    private static function isAcessoNegado(Throwable $e): bool
    {
        if ($e instanceof AuthorizationException) {
            return true;
        }

        // A recusa de domínio não estende `HttpException`: quem sabe que ela é
        // 403 é o `TipoDeRecusa`, o MESMO mapa que o `ProblemDetails` consulta
        // para montar o envelope. Sem este braço, `ImmutableSystemRoleException`
        // e `RedatorOnlyActionException` sairiam 403 para o cliente e mudas
        // para o canal de segurança.
        if ($e instanceof RecusaDeDominio) {
            return $e->tipo() === TipoDeRecusa::AcaoProibida;
        }

        return $e instanceof HttpExceptionInterface && $e->getStatusCode() === 403;
    }
```

e acrescente os dois `use` no topo do arquivo:

```php
use App\Shared\Exceptions\RecusaDeDominio;
use App\Shared\Exceptions\TipoDeRecusa;
```

- [ ] **Step 6: Rodar as duas frentes**

```bash
docker compose exec -T app php artisan test --filter=EventosDeAcessoTest
docker compose exec -T app php artisan test --filter="SystemRoleImmutabilityTest|UpdateRoleActionTest|MensagemDeIdentidadeLocalizadaTest|EnvelopeLocalizadoTest"
```

Esperado: PASS nas duas, sem edição nos testes de endpoint.

- [ ] **Step 7: Pint e commit**

```bash
cd backend && ./vendor/bin/pint app/Domains/Identity/Exceptions app/Shared/Logging/RegistraEventoDeErro.php tests/Feature/Shared/EventosDeAcessoTest.php
cd /home/jvbat/projetos/lotus
git add backend/app/Domains/Identity/Exceptions backend/app/Shared/Logging backend/tests/Feature/Shared/EventosDeAcessoTest.php
git commit -m "feat(identity): as duas recusas de 403 saem do mapa, e o evento junto"
```

---

### Task 4: A catraca estática e a poda do `isForbidden`

**Files:**
- Create: `backend/tests/Unit/Shared/RecusaDeDominioTest.php`
- Modify: `backend/app/Shared/Exceptions/ProblemDetails.php:96-112` (docblock do `isForbidden`)

**Interfaces:**
- Consumes: `Tests\Support\ScansPhpSource` (`arquivosPhp(string $pasta): array`, `codigoSemComentarios(string $arquivo): string`), `RecusaDeDominio`.
- Produces: nada consumido por task posterior.

**A porta que ela fecha:** exceção de domínio nova voltar a estender `HttpException` ou a escrever `403`/`422` no corpo. `InactiveAccountException` passa — estende `AuthenticationException`, que não é `HttpException`, e é 401 por desenho (D6 da spec).

- [ ] **Step 1: Escrever a catraca**

Criar `backend/tests/Unit/Shared/RecusaDeDominioTest.php`:

```php
<?php

namespace Tests\Unit\Shared;

use PHPUnit\Framework\Attributes\Test;
use Tests\Support\ScansPhpSource;
use Tests\TestCase;

/**
 * Exceção de domínio não conhece HTTP.
 *
 * O bloco do envelope tirou o status de dentro de quatro exceções e o pôs no
 * `TipoDeRecusa`. Sem esta régua, a quinta nasce estendendo `HttpException`
 * com `422` no corpo e a decisão volta a ficar repartida — que é exatamente
 * o estado que o candidato 6 do review de 2026-09-02 mediu.
 *
 * Régua ESTÁTICA de propósito: o teste comportamental prova o que existe, e
 * esta prova o que não pode existir.
 */
class RecusaDeDominioTest extends TestCase
{
    use ScansPhpSource;

    /** @return list<string> paths de `app/Domains/*/Exceptions/*.php` */
    private function excecoesDeDominio(): array
    {
        $saida = [];

        foreach (glob(base_path('app/Domains/*/Exceptions'), GLOB_ONLYDIR) as $pasta) {
            $saida = array_merge($saida, $this->arquivosPhp($pasta));
        }

        return $saida;
    }

    #[Test]
    public function nenhuma_excecao_de_dominio_estende_http_exception(): void
    {
        $ofensores = [];

        foreach ($this->excecoesDeDominio() as $arquivo) {
            $codigo = $this->codigoSemComentarios($arquivo);

            if (preg_match('/extends\s+HttpException\b/', $codigo)
                || preg_match('/extends\s+\\\\?Symfony\\\\Component\\\\HttpKernel\\\\Exception\\\\HttpException\b/', $codigo)) {
                $ofensores[] = basename($arquivo);
            }
        }

        $this->assertSame([], $ofensores, "Exceção de domínio estendendo HttpException:\n".implode("\n", $ofensores));
    }

    #[Test]
    public function nenhuma_excecao_de_dominio_escreve_status_http(): void
    {
        $ofensores = [];

        foreach ($this->excecoesDeDominio() as $arquivo) {
            $codigo = $this->codigoSemComentarios($arquivo);

            if (preg_match('/\b(?:400|401|403|404|409|422|429|500)\b/', $codigo, $achado)) {
                $ofensores[] = basename($arquivo).'  '.$achado[0];
            }
        }

        $this->assertSame([], $ofensores, "Status HTTP escrito dentro do domínio:\n".implode("\n", $ofensores));
    }

    #[Test]
    public function toda_recusa_de_dominio_declara_um_tipo(): void
    {
        foreach ($this->excecoesDeDominio() as $arquivo) {
            $classe = 'App\\Domains\\'.str_replace(
                '/',
                '\\',
                trim(substr($arquivo, strlen(base_path('app/Domains/')), -4), '/'),
            );

            if (! class_exists($classe) || ! is_subclass_of($classe, \App\Shared\Exceptions\RecusaDeDominio::class)) {
                continue;
            }

            $metodo = new \ReflectionMethod($classe, 'tipo');
            $this->assertFalse(
                $metodo->isAbstract(),
                "{$classe} estende RecusaDeDominio sem declarar tipo().",
            );
        }
    }
}
```

- [ ] **Step 2: Rodar e ver passar**

```bash
docker compose exec -T app php artisan test --filter=RecusaDeDominioTest
```

Esperado: PASS, 3 testes.

- [ ] **Step 3: Ver a catraca reprovar por sonda**

```bash
SCRATCH=/tmp/claude-1000/-home-jvbat-projetos-lotus/75aa1e61-ac59-4bed-a9ff-9f5d25c823bb/scratchpad
cp backend/app/Domains/Operation/Exceptions/TurmaConfiguracaoException.php $SCRATCH/TurmaConfiguracaoException.php.bak
```

Edite `backend/app/Domains/Operation/Exceptions/TurmaConfiguracaoException.php` para estender `\Symfony\Component\HttpKernel\Exception\HttpException` e voltar `new self(422, ...)` numa factory. Rode:

```bash
docker compose exec -T app php artisan test --filter=RecusaDeDominioTest
```

Esperado: FAIL nos dois primeiros testes, nomeando `TurmaConfiguracaoException.php`. Restaure:

```bash
cp $SCRATCH/TurmaConfiguracaoException.php.bak backend/app/Domains/Operation/Exceptions/TurmaConfiguracaoException.php
docker compose exec -T app php artisan test --filter=RecusaDeDominioTest
```

Esperado: PASS de novo. Registre os dois números no relato da task.

- [ ] **Step 4: Podar o docblock do `isForbidden`**

Em `backend/app/Shared/Exceptions/ProblemDetails.php`, substitua o docblock de `isForbidden()` por:

```php
    /**
     * O 403 que sobra depois do braço `RecusaDeDominio`: o do RBAC do
     * spatie/laravel-permission (`UnauthorizedException`, que estende
     * `HttpException` e não `AuthorizationException`) e o de um
     * `abort_unless(..., 403, ...)` solto. Sem este teto, esses 403 reais
     * cairiam no braço genérico de `HttpExceptionInterface` — título errado
     * (`problem.title.http`) e `detail` cru do pacote, em inglês.
     *
     * As quatro recusas de domínio saíram daqui: elas declaram
     * `TipoDeRecusa::AcaoProibida` e o braço da base as atende antes. O sniff
     * por STATUS continua vivo porque o 403 do pacote de terceiro não tem
     * outro sinal — nunca por inspeção do TEXTO (D5).
     */
```

O corpo do método não muda.

- [ ] **Step 5: Rodar o envelope inteiro**

```bash
docker compose exec -T app php artisan test --filter="EnvelopeLocalizadoTest|ProblemDetailsHeadersTest|SetLocaleTest|MensagemLiteralTest"
```

Esperado: PASS.

- [ ] **Step 6: Pint e commit**

```bash
cd backend && ./vendor/bin/pint app/Shared/Exceptions/ProblemDetails.php tests/Unit/Shared/RecusaDeDominioTest.php
cd /home/jvbat/projetos/lotus
git add backend/app/Shared/Exceptions/ProblemDetails.php backend/tests/Unit/Shared/RecusaDeDominioTest.php
git commit -m "test(erros): a catraca fecha a porta do status dentro do dominio"
```

---

### Task 5: A frase do snapshot corrompido e o veredito da `P-60`

**Files:**
- Modify: `backend/app/Domains/Certification/Exceptions/CorruptedSnapshotException.php`
- Modify: `backend/lang/{en,es_CL,pt_BR}/certification.php`
- Modify: `backend/tests/Unit/Shared/MensagemLiteralTest.php` (última linha da dívida sai)
- Modify: `backend/tests/Feature/Certification/CertificateListingTest.php:191,220`
- Modify: `backend/tests/Feature/Certification/MensagemDeCertificadoLocalizadaTest.php`
- Test: `backend/tests/Feature/Certification/PublicCertificateTest.php` (teste novo, sem editar os existentes)

**Interfaces:**
- Consumes: nada da Task 1 — a exceção **não** vira `RecusaDeDominio` (D5 da spec: o veredito da `P-60` é 500).
- Produces: a chave `certification.snapshot.not_presentable` com os parâmetros `:codigo` e `:campos`.

**Veredito da `P-60` (D4 da spec):** continua estourando. O gate `assertPresentable()` não muda; `show`, PDF e rota pública do QR seguem recusando juntos. Só o idioma da frase muda.

- [ ] **Step 1: Escrever as chaves nos três locales**

Em `backend/lang/es_CL/certification.php`, como irmão de `'certificate'`:

```php
    'snapshot' => [
        'not_presentable' => 'El certificado :codigo no puede presentarse: su documento congelado no tiene los campos :campos.',
    ],
```

Em `backend/lang/pt_BR/certification.php`:

```php
    'snapshot' => [
        'not_presentable' => 'O certificado :codigo não pode ser apresentado: seu documento congelado não tem os campos :campos.',
    ],
```

Em `backend/lang/en/certification.php`:

```php
    'snapshot' => [
        'not_presentable' => 'Certificate :codigo cannot be presented: its frozen document is missing the fields :campos.',
    ],
```

- [ ] **Step 2: Acrescentar a chave à lista do teste de locales**

Em `backend/tests/Feature/Certification/MensagemDeCertificadoLocalizadaTest.php`, o `foreach` passa a:

```php
        foreach ([
            'certification.certificate.already_revoked',
            'certification.enrollment.not_found',
            'certification.snapshot.not_presentable',
        ] as $chave) {
```

- [ ] **Step 3: Rodar e ver passar**

```bash
docker compose exec -T app php artisan test --filter="MensagemDeCertificadoLocalizadaTest|LocaleParityTest"
```

Esperado: PASS.

- [ ] **Step 4: Trocar o `sprintf` pela chave**

Em `backend/app/Domains/Certification/Exceptions/CorruptedSnapshotException.php`, o método `missingFields()` passa a:

```php
    /** @param  list<string>  $fields */
    public static function missingFields(string $codigo, array $fields): self
    {
        return new self(__('certification.snapshot.not_presentable', [
            'codigo' => $codigo,
            'campos' => implode(', ', $fields),
        ]));
    }
```

Acrescente ao docblock da classe, depois do parágrafo que já fala de `PublicDetail`:

```php
 * **Ela NÃO é `RecusaDeDominio`** (spec de 2026-09-02, D5): o veredito da
 * `P-60` é que a rota pública do QR continua estourando 500, e herdar da base
 * a arrastaria para o mapa 422/403. Documento de peso legal não atesta o que
 * não sabe; quem escaneia um certificado com snapshot corrompido vê a recusa,
 * não uma página que inventa o que falta.
```

- [ ] **Step 5: Encolher a última linha da dívida**

Em `backend/tests/Unit/Shared/MensagemLiteralTest.php`, apague:

```php
        'CorruptedSnapshotException.php:42' => 'PublicDetail em es_CL; frente Certification.',
```

e o parágrafo do docblock da constante que fala das "TRÊS que chegam ao usuário" — a `DEBITO_CONHECIDO` volta a ser só diagnóstico interno. Deixe o docblock dizendo:

```php
    /**
     * O que ficou literal, com o motivo. Cada linha aqui é dívida declarada, e
     * some quando o sítio passar a ler `lang/`. As entradas restantes são
     * diagnóstico interno: viram 500 mascarado em produção (`ProblemDetails`
     * §detailFor) e nunca chegam ao usuário, então traduzir seria trabalho para
     * ninguém ler. As cinco que CHEGAVAM ao usuário saíram no bloco
     * `backend-envelope-de-erro-e-recusa-de-dominio` (2026-09-02); a lista é
     * inventário, não permissão, e ela só encolhe.
     */
```

- [ ] **Step 6: Apontar as duas asserções para o dono novo da frase**

Em `backend/tests/Feature/Certification/CertificateListingTest.php`, linha 191:

```php
            ->assertJsonPath(
                'detail',
                __('certification.snapshot.not_presentable', [
                    'codigo' => 'LOT-2026-1002',
                    'campos' => 'aluno.name',
                ]),
            );
```

e linha 220:

```php
            ->assertJsonPath(
                'detail',
                __('certification.snapshot.not_presentable', [
                    'codigo' => 'LOT-2026-1003',
                    'campos' => 'aluno.name, curso.name',
                ]),
            );
```

**São as únicas duas asserções de teste que este plano autoriza editar** (§4 da spec). Nenhuma outra.

- [ ] **Step 7: Escrever o teste do veredito da `P-60`**

Acrescente a `backend/tests/Feature/Certification/PublicCertificateTest.php`, antes do `}` final da classe:

```php
    /**
     * O VEREDITO da P-60, em teste: a rota pública do QR continua estourando
     * diante de snapshot corrompido, e agora a recusa fala o idioma de quem
     * escaneou. Degradar (200 com o que o snapshot tem) foi recusado no
     * brainstorming de 2026-09-02 — documento de peso legal não atesta o que
     * não sabe.
     */
    public function test_a_recusa_publica_sai_localizada_nos_tres_locales(): void
    {
        $snapshot = json_decode((string) $this->certificate->getRawOriginal('snapshot'), true);
        $snapshot['aluno']['name'] = '';
        $this->certificate->update(['snapshot' => $snapshot]);

        $detalhes = [];

        foreach (['es-CL', 'pt-BR', 'en'] as $locale) {
            $corpo = $this->withHeaders(['Accept-Language' => $locale])
                ->getJson($this->publicUrl())
                ->assertStatus(500)
                ->json();

            $this->assertStringNotContainsString('certification.', $corpo['detail']);
            $this->assertStringContainsString($this->certificate->codigo, $corpo['detail']);
            $this->assertStringContainsString('aluno.name', $corpo['detail']);
            $detalhes[] = $corpo['detail'];
        }

        $this->assertCount(3, array_unique($detalhes), 'Os três locales devolveram o mesmo detail.');
    }
```

- [ ] **Step 8: Rodar a frente de Certification inteira**

```bash
docker compose exec -T app php artisan test --filter="Certification"
docker compose exec -T app php artisan test --filter="MensagemLiteralTest|LocaleParityTest"
```

Esperado: PASS. Se o `test_o_detalhe_da_recusa_sobrevive_ao_debug_desligado` reprovar, a marca `PublicDetail` se perdeu — PARE.

- [ ] **Step 9: Pint e commit**

```bash
cd backend && ./vendor/bin/pint app/Domains/Certification/Exceptions/CorruptedSnapshotException.php lang tests/Feature/Certification tests/Unit/Shared/MensagemLiteralTest.php
cd /home/jvbat/projetos/lotus
git add backend/app/Domains/Certification backend/lang backend/tests
git commit -m "feat(certification): a recusa do snapshot sai de lang/ e o QR segue recusando"
```

---

### Task 6: O 419 (`P-72`)

**Files:**
- Modify: `backend/app/Shared/Exceptions/ProblemDetails.php` (`detailFor()`)
- Modify: `backend/lang/{en,es_CL,pt_BR}/problem.php`
- Test: `backend/tests/Feature/Shared/EnvelopeLocalizadoTest.php`

**Interfaces:**
- Consumes: nada das tasks anteriores.
- Produces: a chave `problem.detail.csrf`.

**A exceção que o handler enxerga NÃO é a `TokenMismatchException`.** Medido no vendor em
2026-09-02: `Illuminate\Foundation\Exceptions\Handler::prepareException()` (`:774`) faz
`$e instanceof TokenMismatchException => new HttpException(419, $e->getMessage(), $e)`, e roda na
linha `:716` — **antes** de `renderViaCallbacks()` na `:718`. O que chega ao
`ProblemDetails::fromException()` é um `HttpException(419)` com a `TokenMismatchException` como
`getPrevious()`. É por isso que a `P-72` mediu `title` = `problem.title.http`: o braço genérico de
`HttpExceptionInterface` já a atendia. O braço novo casa pela **causa**, não pelo texto (D5).

- [ ] **Step 1: Escrever o teste que reprova**

Acrescente a `backend/tests/Feature/Shared/EnvelopeLocalizadoTest.php`, antes do `}` final:

```php
    /**
     * O 419 devolvia `CSRF token mismatch.` cru nos três locales (P-72): o
     * `title` caía no genérico já traduzido, mas o `default` do `detailFor()`
     * é `$e->getMessage() ?: ...`, e frase não vazia vence o fallback.
     *
     * A exceção montada aqui é a que o handler REALMENTE entrega: o
     * `prepareException()` do Laravel embrulha a `TokenMismatchException` num
     * `HttpException(419)` e a põe como `previous` antes de qualquer render
     * callback rodar. Testar com a `TokenMismatchException` crua provaria um
     * caminho que a aplicação não percorre.
     */
    #[Test]
    public function o_419_tem_detail_localizado_nos_tres_locales(): void
    {
        $detalhes = [];

        foreach (['es_CL', 'pt_BR', 'en'] as $locale) {
            app()->setLocale($locale);

            $comoOHandlerEntrega = new \Symfony\Component\HttpKernel\Exception\HttpException(
                419,
                'CSRF token mismatch.',
                new \Illuminate\Session\TokenMismatchException('CSRF token mismatch.'),
            );

            $corpo = \App\Shared\Exceptions\ProblemDetails::fromException(
                $comoOHandlerEntrega,
                \Illuminate\Http\Request::create('/api/turmas/3', 'PUT'),
            )->getData(true);

            $this->assertSame(419, $corpo['status']);
            $this->assertNotSame('CSRF token mismatch.', $corpo['detail']);
            $this->assertStringNotContainsString('problem.', $corpo['detail']);
            $detalhes[] = $corpo['detail'];
        }

        $this->assertCount(3, array_unique($detalhes), 'Os três locales devolveram o mesmo detail no 419.');
    }
```

- [ ] **Step 2: Rodar e ver reprovar**

```bash
docker compose exec -T app php artisan test --filter=o_419_tem_detail_localizado_nos_tres_locales
```

Esperado: FAIL — `Failed asserting that 'CSRF token mismatch.' is not identical to 'CSRF token mismatch.'`.

- [ ] **Step 3: Escrever a chave nos três locales**

Em `backend/lang/es_CL/problem.php`, dentro de `'detail'`:

```php
        'csrf' => 'Tu sesión expiró o el formulario perdió validez. Recarga la página e inténtalo de nuevo.',
```

Em `backend/lang/pt_BR/problem.php`:

```php
        'csrf' => 'Sua sessão expirou ou o formulário perdeu validade. Recarregue a página e tente de novo.',
```

Em `backend/lang/en/problem.php`:

```php
        'csrf' => 'Your session expired or the form is no longer valid. Reload the page and try again.',
```

- [ ] **Step 4: Ligar o braço**

Em `backend/app/Shared/Exceptions/ProblemDetails.php`, dentro do `match (true)` de `detailFor()`,
insira como **primeiro** braço:

```php
            $e->getPrevious() instanceof TokenMismatchException => __('problem.detail.csrf'),
```

e o `use` no topo do arquivo:

```php
use Illuminate\Session\TokenMismatchException;
```

Acrescente ao docblock do `detailFor()`, no fim:

```php
     * O 419 é o terceiro caso com `detail` próprio, e casa pela CAUSA: o
     * handler do Laravel embrulha a `TokenMismatchException` num
     * `HttpException(419)` antes de qualquer callback, então o tipo que
     * interessa está em `getPrevious()`. Sem este braço, o `default` devolve
     * o `CSRF token mismatch.` do framework nos três locales (P-72).
```

- [ ] **Step 5: Rodar e ver passar**

```bash
docker compose exec -T app php artisan test --filter="EnvelopeLocalizadoTest|LocaleParityTest"
```

Esperado: PASS.

- [ ] **Step 6: Pint e commit**

```bash
cd backend && ./vendor/bin/pint app/Shared/Exceptions/ProblemDetails.php lang tests/Feature/Shared/EnvelopeLocalizadoTest.php
cd /home/jvbat/projetos/lotus
git add backend/app/Shared/Exceptions/ProblemDetails.php backend/lang backend/tests/Feature/Shared/EnvelopeLocalizadoTest.php
git commit -m "fix(erros): o 419 para de responder em ingles nos tres locales"
```

---

### Task 7: Gate do bloco e DoD contra a API real

**Files:**
- Nenhum arquivo de produção muda. Esta task **mede**.

**Interfaces:**
- Consumes: tudo das Tasks 1–6.
- Produces: `docs/superpowers/audits/2026-09-02-item26-medicoes.md` com os números e as respostas cruas.

- [ ] **Step 1: Suíte inteira**

```bash
docker compose exec -T app php artisan test
```

Esperado: verde. A `main` mede **1162 passed / 5 skipped** — anote o número deste bloco e a diferença.

- [ ] **Step 2: Provar que nenhum teste de endpoint foi editado**

```bash
git diff --stat main...HEAD -- backend/tests/Feature
```

Esperado: as únicas linhas de `Feature/` alteradas são `Certification/CertificateListingTest.php` (2 asserções, §4 da spec), `Certification/PublicCertificateTest.php` (teste novo), `Certification/MensagemDeCertificadoLocalizadaTest.php` (chave nova), `Shared/EnvelopeLocalizadoTest.php` (dois testes novos), `Shared/EventosDeAcessoTest.php` (teste novo) e `Operation/MensagemDeOperacaoLocalizadaTest.php` (novo). Qualquer outro arquivo de `Feature/` no diff = contrato quebrado, PARE.

- [ ] **Step 3: `generated.ts` e Pint**

```bash
docker compose exec -T app php artisan typescript:transform
git diff --stat -- frontend/src/shared/types/generated.ts
cd backend && ./vendor/bin/pint --test app/Shared app/Domains/Operation/Exceptions app/Domains/Identity/Exceptions app/Domains/Certification/Exceptions lang tests
```

Esperado: diff **vazio** no `generated.ts`; Pint `PASS`.

- [ ] **Step 4: O 419 contra a API real, nos três locales**

Suba o stack (`docker compose up -d`), autentique na API pelo navegador ou por `curl` com cookie de sessão válido, e dispare um `PUT /api/turmas/3` com `X-XSRF-TOKEN` inválido, uma vez por locale:

```bash
curl -s -X PUT http://localhost:8080/api/turmas/3 \
  -H 'Accept: application/json' -H 'Accept-Language: es-CL' \
  -H 'X-XSRF-TOKEN: invalido' -b cookies.txt | jq '{status,title,detail}'
```

Repita com `Accept-Language: pt-BR` e `en`. Esperado: `status` 419, `title` localizado (como já era) e `detail` **em três frases distintas**, nenhuma delas `CSRF token mismatch.`. Cole as três respostas cruas no audit.

- [ ] **Step 5: A recusa 422 e a 403 contra a API real**

Uma de cada, no locale `es-CL`: `POST /api/quotes/<id-de-cotacao-nao-aprovada>/turma` (espera 422 com `detail` = `operation.turma.quote_not_approved` em es-CL) e `POST /api/profile/documents` como admin (espera 403 com `detail` = `identity.errors.redator_only_action`). Cole as duas respostas no audit e devolva o banco de dev ao estado anterior.

- [ ] **Step 6: Escrever o audit e commitar**

Crie `docs/superpowers/audits/2026-09-02-item26-medicoes.md` com: número da suíte antes/depois, saída dos dois testes de sonda da Task 4 (reprovando e passando), as três respostas do 419, as duas do Step 5 e o diff vazio do `generated.ts`.

```bash
git add docs/superpowers/audits/2026-09-02-item26-medicoes.md
git commit -m "docs(audit): as medicoes do envelope de erro contra a API real"
```

---

## Handoff de execução

**executor: claude**

O bloco toca a **lei §5.4 do `CLAUDE.md`** (erro sobe ao handler global RFC 7807) no seu mecanismo, e a Task 3 depende de um julgamento que o plano não consegue fechar sozinho: reconhecer que um teste verde virando vermelho é o defeito aparecendo, e não o plano errado. A Task 4 exige sonda com restauração de arquivo, e a Task 7 exige leitura de resposta crua da API contra o critério de aceite. Nenhuma delas é mecânica de path fechado.

`paths_autorizados`: não se aplica.
