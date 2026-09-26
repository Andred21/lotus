# Config e conteúdo de documento (item 29) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** a data de calendário que o servidor deriva (dia impresso no certificado, "hoje" de vigência) passa a ser a de Santiago sem reinterpretar nada gravado; a URL do QR do certificado ganha chave própria, obrigatória e https em produção; a `P-75` fecha por veredito escrito.

**Architecture:** instantes seguem gravados e comparados em UTC (`config/app.php` literal, por decisão). Nasce `App\Shared\Support\FusoDoNegocio` como dono único do fuso do cliente, e os 14 sítios que derivam data do relógio passam por ele, com catraca estática fechando a porta. A URL de validação ganha dono único em `Certification\Services\CertificateValidationUrl`, que em produção recusa com uma exceção `PublicDetail` (500 nomeado e logado) no PDF e antes da emissão.

**Tech Stack:** Laravel 13 / PHP 8.3, Carbon 3.13 (`setTestNow` é global entre `Carbon` e `CarbonImmutable`), PHPUnit, sqlite `:memory:` na suíte, Poppler + `zxing-cpp` (venv descartável) para decodificar o QR no e2e.

**Spec:** [`specs/2026-09-24-backend-config-e-conteudo-de-documento-design.md`](../../specs/archive/2026-09-24-backend-config-e-conteudo-de-documento-design.md)

## Global Constraints

- Branch `fix/backend-config-e-conteudo-de-documento`, aberta pelo `/executar-bloco` a partir da `main`, **no main tree** (gate P-03 — o compose monta o main tree).
- Backend roda no container: `docker compose exec -T app php artisan test --filter=<Nome>`. Pint roda no host, de dentro de `backend/`, **sempre com argumento**: `cd backend && ./vendor/bin/pint <arquivos>`.
- `config/app.php` mantém `'timezone' => 'UTC'` **literal** — nunca `env('APP_TIMEZONE', ...)` (spec D2).
- `FusoDoNegocio::TIMEZONE = 'America/Santiago'`.
- Mensagem ao usuário sai de `lang/` nos três locales (`en`, `es_CL`, `pt_BR`) — `.claude/rules/backend-ddd.md` §"Mensagem ao usuário". `LocaleParityTest` e `MensagemLiteralTest` verdes.
- A exceção da P-79 é `RuntimeException` + `PublicDetail`, **não** `RecusaDeDominio` (spec D3): sai 500 e vai ao log.
- Nenhuma mudança de contrato: `generated.ts` com diff vazio depois de `typescript:transform`.
- Sonda de catraca: **cópia no scratchpad e restauração por `cp`, nunca `git stash`** (a pilha tem stashes alheios).
- Teste existente só é editado onde uma task o **nomeia** (lição do Q-1 do item 22). Qualquer outra edição em teste existente é STOP: pare e reporte.
- Commits em ASCII, sem acento na mensagem, terminando com `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`.

## Mapa de arquivos

| Arquivo | Responsabilidade | Task |
|---|---|---|
| `backend/app/Shared/Support/FusoDoNegocio.php` (novo) | dono do fuso do negócio: `agora()`, `hoje()`, `dataDe()` | 1 |
| `backend/tests/Unit/Shared/FusoDoNegocioTest.php` (novo) | contrato do seam | 1 |
| `backend/app/Domains/Certification/Enums/CertificateDisplayStatus.php` | passa a delegar | 1 |
| `backend/app/Domains/Certification/Actions/IssueCertificateAction.php` | emissão no dia local (T2); guarda da P-79 (T8) | 2, 8 |
| `backend/tests/Feature/Certification/IssueCertificateTest.php` | +2 testes (T2), +1 teste (T8) | 2, 8 |
| `backend/app/Domains/Identity/Enums/DocumentValidityStatus.php` | "hoje" local | 3 |
| `backend/app/Domains/Identity/Services/StudentClientLinkService.php` | "hoje" local | 3 |
| `backend/app/Domains/Operation/Services/RedatorIdoneidadeService.php` | "hoje" local | 3 |
| `backend/tests/Unit/Identity/DocumentValidityStatusTest.php` | base do relógio + 1 teste | 3 |
| `backend/app/Domains/Dashboard/Services/{IdentityMetricsQuery,RedatorScopeQuery,RedatorLoadQuery,CertificationMetricsQuery,OperationMetricsQuery,DashboardWindows,CommercialMetricsQuery}.php`, `backend/app/Domains/Dashboard/Data/DashboardFilterData.php` | "hoje" local e instante projetado em dia | 4 |
| `backend/tests/Unit/Shared/DataDeCalendarioTest.php` (novo) | catraca | 5 |
| `.claude/rules/backend-ddd.md` | regra escrita da data de calendário | 5 |
| `backend/config/app.php` | comentário da decisão UTC (T6); chave `certificate_validation_url` (T7) | 6, 7 |
| `backend/tests/Feature/Shared/FusoDeArmazenamentoTest.php` (novo) | UTC com `APP_TIMEZONE` no ambiente | 6 |
| `backend/.env.example`, `backend/.env.production.example` | `APP_TIMEZONE` sai (T6); `CERTIFICATE_VALIDATION_URL` entra (T9) | 6, 9 |
| `backend/app/Domains/Certification/Services/CertificateValidationUrl.php` (novo) | dono único da URL do QR | 7 |
| `backend/app/Domains/Certification/Exceptions/ValidacaoDeCertificadoNaoConfigurada.php` (novo) | recusa de configuração | 7 |
| `backend/lang/{en,es_CL,pt_BR}/certification.php` | frase da recusa | 7 |
| `backend/tests/Feature/Certification/CertificateValidationUrlTest.php` (novo) | contrato da URL | 7 |
| `backend/app/Domains/Certification/Services/CertificatePdfService.php` | QR pela chave nova | 8 |
| `backend/tests/Feature/Certification/CertificatePdfTest.php` | +2 testes, 1 linha num existente | 8 |
| `backend/tests/Feature/Certification/BatchIssueTest.php` | +1 teste | 8 |
| `deploy/aws/env.prod.example`, `deploy/aws/README.md` | a regra vira mecanismo | 9 |
| `docs/superpowers/pendencias/abertas.md` | veredito da P-75; `Bloco:` das três | 10 |
| `docs/superpowers/audits/2026-09-24-item29-medicoes.md` (novo) | evidências do gate e do e2e | 11 |

---

### Task 1: `FusoDoNegocio` e a delegação do `CertificateDisplayStatus`

**Files:**
- Create: `backend/app/Shared/Support/FusoDoNegocio.php`
- Create: `backend/tests/Unit/Shared/FusoDoNegocioTest.php`
- Modify: `backend/app/Domains/Certification/Enums/CertificateDisplayStatus.php:5-43`

**Interfaces:**
- Produces:
  - `App\Shared\Support\FusoDoNegocio::TIMEZONE` (`'America/Santiago'`)
  - `FusoDoNegocio::agora(): Carbon\CarbonImmutable` — instante atual, fuso Santiago
  - `FusoDoNegocio::hoje(): Carbon\CarbonImmutable` — data de hoje em Santiago, **meia-noite no fuso da aplicação** (a forma do cast `date`)
  - `FusoDoNegocio::dataDe(?Carbon\CarbonInterface $instante): ?string` — `Y-m-d` em Santiago; não muta o argumento
  - `CertificateDisplayStatus::TIMEZONE` e `::hoje()` mantêm assinatura e forma (meia-noite **em** Santiago)

- [ ] **Step 1: Escrever o teste que falha**

`backend/tests/Unit/Shared/FusoDoNegocioTest.php`:

```php
<?php

namespace Tests\Unit\Shared;

use App\Shared\Support\FusoDoNegocio;
use Carbon\CarbonImmutable;
use Illuminate\Support\Carbon;
use PHPUnit\Framework\TestCase;

class FusoDoNegocioTest extends TestCase
{
    protected function tearDown(): void
    {
        Carbon::setTestNow();

        parent::tearDown();
    }

    /** 02:00 UTC de 25/09 são 23:00 de 24/09 em Santiago (UTC-3, horário de verão). */
    public function test_agora_carrega_o_fuso_do_negocio(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-09-25 02:00:00', 'UTC'));

        $agora = FusoDoNegocio::agora();

        $this->assertSame(FusoDoNegocio::TIMEZONE, $agora->getTimezone()->getName());
        $this->assertSame('2026-09-24 23:00:00', $agora->toDateTimeString());
    }

    /**
     * A trava do relógio é global no Carbon 3: congelar pelo `Carbon` mutável
     * (como fazem os testes de emissão) congela também o `CarbonImmutable` que
     * o seam lê. Sem isto, os testes de emissão provariam o relógio real.
     */
    public function test_agora_obedece_a_trava_do_carbon_mutavel(): void
    {
        Carbon::setTestNow('2026-08-05 14:30:00');

        $this->assertSame('2026-08-05', FusoDoNegocio::agora()->toDateString());
    }

    /**
     * `hoje()` tem a forma do cast `date`: meia-noite no fuso da APLICAÇÃO.
     * Meia-noite de Santiago seria outro instante (03:00 UTC), e comparar
     * instantes marcaria vencido o que vence hoje.
     */
    public function test_hoje_e_o_dia_de_santiago_a_meia_noite_do_fuso_da_aplicacao(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-09-25 02:00:00', 'UTC'));

        $hoje = FusoDoNegocio::hoje();

        $this->assertSame('2026-09-24', $hoje->toDateString());
        $this->assertSame('00:00:00', $hoje->toTimeString());
        $this->assertSame(date_default_timezone_get(), $hoje->getTimezone()->getName());
        $this->assertTrue($hoje->equalTo(CarbonImmutable::parse('2026-09-24')));
    }

    /** No inverno o Chile é UTC-4: 03:30 UTC de 15/07 ainda são 23:30 de 14/07. */
    public function test_hoje_acompanha_o_horario_de_inverno(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-07-15 03:30:00', 'UTC'));

        $this->assertSame('2026-07-14', FusoDoNegocio::hoje()->toDateString());
    }

    public function test_data_de_projeta_o_instante_no_dia_local_sem_mutar_o_argumento(): void
    {
        $instante = Carbon::parse('2026-09-25 01:30:00', 'UTC');

        $this->assertSame('2026-09-24', FusoDoNegocio::dataDe($instante));
        $this->assertSame('UTC', $instante->getTimezone()->getName());
        $this->assertNull(FusoDoNegocio::dataDe(null));
    }
}
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `docker compose exec -T app php artisan test --filter=FusoDoNegocioTest`
Expected: FAIL com `Class "App\Shared\Support\FusoDoNegocio" not found`.

- [ ] **Step 3: Implementar o seam**

`backend/app/Shared/Support/FusoDoNegocio.php`:

```php
<?php

namespace App\Shared\Support;

use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;

/**
 * Dono único do fuso do NEGÓCIO (P-59, spec D1 do item 29).
 *
 * O servidor grava e compara INSTANTES em UTC — `config/app.php` fixa
 * `'timezone' => 'UTC'` por decisão (spec D2), e nada já gravado é
 * reinterpretado. DATA DE CALENDÁRIO é outra coisa: o dia impresso num
 * certificado, o "hoje" de uma vigência, a data de um alerta são os do
 * cliente, em Santiago. Derivados do relógio UTC, eles erram o dia das 21h
 * (horário de verão; 20h no inverno) até a meia-noite locais — um certificado
 * emitido às 23h congelava a data de amanhã e, em 31/12 à noite, o código do
 * ano seguinte.
 *
 * Toda derivação de data a partir do relógio passa por aqui. A catraca
 * `tests/Unit/Shared/DataDeCalendarioTest.php` reprova `today()` e `now()`
 * projetado em data no resto de `app/`.
 */
final class FusoDoNegocio
{
    public const TIMEZONE = 'America/Santiago';

    /** O instante atual expresso no fuso do negócio: `->year` e `->toDateString()` são os locais. */
    public static function agora(): CarbonImmutable
    {
        return CarbonImmutable::now(self::TIMEZONE);
    }

    /**
     * A data de HOJE no fuso do negócio, como meia-noite no fuso da APLICAÇÃO.
     *
     * É a forma com que o cast `date` do Eloquent hidrata `valid_until`,
     * `start_date` e `valido_ate`: comparar `hoje()` com eles é comparar dia com
     * dia. Meia-noite DE Santiago seria outro instante (03:00 ou 04:00 UTC), e
     * `$validUntil->lessThan(...)` chamaria de vencido o documento que vence
     * hoje. Gravado num cast `date`, sai o mesmo `Y-m-d 00:00:00` de antes — só
     * o dia muda.
     */
    public static function hoje(): CarbonImmutable
    {
        return CarbonImmutable::parse(self::agora()->toDateString(), date_default_timezone_get());
    }

    /** A data, no fuso do negócio, em que um INSTANTE (`datetime`) caiu. */
    public static function dataDe(?CarbonInterface $instante): ?string
    {
        return $instante === null
            ? null
            : CarbonImmutable::instance($instante)->setTimezone(self::TIMEZONE)->toDateString();
    }
}
```

- [ ] **Step 4: Delegar o `CertificateDisplayStatus`**

Em `backend/app/Domains/Certification/Enums/CertificateDisplayStatus.php`, troque as linhas 5-8 (imports) por:

```php
use App\Shared\Support\FusoDoNegocio;
use App\Shared\Support\JanelaDeAviso;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
```

e troque o bloco das linhas 31-43 (o docblock D10, a constante e `hoje()`) por:

```php
    /**
     * D10: o fuso é o do `FusoDoNegocio` (P-59, item 29). Esta `hoje()` devolve
     * meia-noite EM Santiago — não a forma de `FusoDoNegocio::hoje()` — porque
     * `for()` reconstrói os dois lados por componentes, e `EmissionPanelRequest`
     * e `CertificateQueryBuilder` já contam com o fuso carregado.
     */
    public const TIMEZONE = FusoDoNegocio::TIMEZONE;

    /** "Hoje" no fuso do cliente, à meia-noite. Comparação é por data pura. */
    public static function hoje(): CarbonImmutable
    {
        return FusoDoNegocio::agora()->startOfDay();
    }
```

- [ ] **Step 5: Rodar o seam e o que já dependia do `CertificateDisplayStatus`**

Run: `docker compose exec -T app php artisan test --filter='FusoDoNegocioTest|CertificateDisplayStatus|CertificatePagination|CertificateListing|PublicCertificate|EmissionPanel'`
Expected: PASS em todos, **sem editar** nenhum desses testes (o `CertificateDisplayStatusTest:140-150` segue exigindo fuso Santiago e meia-noite).

- [ ] **Step 6: Pint e commit**

```bash
cd backend && ./vendor/bin/pint app/Shared/Support/FusoDoNegocio.php app/Domains/Certification/Enums/CertificateDisplayStatus.php tests/Unit/Shared/FusoDoNegocioTest.php
git add backend/app/Shared/Support/FusoDoNegocio.php backend/app/Domains/Certification/Enums/CertificateDisplayStatus.php backend/tests/Unit/Shared/FusoDoNegocioTest.php
git commit -m "feat(shared): FusoDoNegocio e dono unico da data de calendario

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: A emissão congela o dia e o ano de Santiago

**Files:**
- Modify: `backend/app/Domains/Certification/Actions/IssueCertificateAction.php:26-29`
- Test: `backend/tests/Feature/Certification/IssueCertificateTest.php` (dois testes **novos**, depois de `test_emissao_que_atravessa_a_virada_do_ano_usa_um_instante_so`)

**Interfaces:**
- Consumes: `FusoDoNegocio::agora()` (Task 1). `CertificateSnapshotBuilder::build()` já recebe `CarbonInterface $emitidoEm` e faz `->toDateString()`; `CertificateNumberService::next(int $year)`.

- [ ] **Step 1: Escrever os dois testes que falham**

Acrescente em `IssueCertificateTest`, logo depois de `test_emissao_que_atravessa_a_virada_do_ano_usa_um_instante_so`:

```php
    /**
     * P-59: o dia impresso é o de Santiago. 02:00 UTC de 25/09 são 23:00 de
     * 24/09 no Chile (UTC-3, horário de verão) — o relógio UTC congelava a
     * data de amanhã no snapshot e no `valido_ate`.
     */
    public function test_emissao_as_23h_de_santiago_grava_o_dia_local(): void
    {
        $this->actingAsAdmin();
        $this->createTemplate(['validity_months' => 12]);
        Carbon::setTestNow(Carbon::parse('2026-09-25 02:00:00', 'UTC'));

        $this->postJson($this->issueUrl(), $this->validPayload())->assertCreated();

        $certificate = Certificate::query()->sole();

        $this->assertSame('2026-09-24', $certificate->snapshot->emitido_em);
        $this->assertSame('2027-09-24', $certificate->valido_ate->toDateString());
    }

    /**
     * P-59: o ANO do código é o de Santiago. 02:30 UTC de 01/01/2027 ainda são
     * 23:30 de 31/12/2026 no Chile — o relógio UTC emitia `LOT-2027` com data
     * de 2027 para um certificado emitido em 2026.
     */
    public function test_emissao_na_noite_de_31_12_em_santiago_usa_o_ano_local(): void
    {
        $this->actingAsAdmin();
        $this->createTemplate(['validity_months' => 12]);
        Carbon::setTestNow(Carbon::parse('2027-01-01 02:30:00', 'UTC'));

        $this->postJson($this->issueUrl(), $this->validPayload())->assertCreated();

        $certificate = Certificate::query()->sole();

        $this->assertSame('LOT-2026-1000', $certificate->codigo);
        $this->assertSame('2026-12-31', $certificate->snapshot->emitido_em);
        $this->assertSame('2027-12-31', $certificate->valido_ate->toDateString());
    }
```

- [ ] **Step 2: Rodar e ver falhar contra o código atual**

Run: `docker compose exec -T app php artisan test --filter='test_emissao_as_23h_de_santiago_grava_o_dia_local|test_emissao_na_noite_de_31_12_em_santiago_usa_o_ano_local'`
Expected: FAIL nos dois — `'2026-09-24'` esperado contra `'2026-09-25'`, e `'LOT-2026-1000'` esperado contra `'LOT-2027-1000'`. **Registre as duas mensagens** para o audit da Task 11 (é a prova de que os testes reprovam o regresso).

- [ ] **Step 3: Implementar**

Em `IssueCertificateAction.php`, acrescente `use App\Shared\Support\FusoDoNegocio;` aos imports e troque as linhas 26-29 por:

```php
            // Um instante para a emissão inteira. A sequência espera pelo lock,
            // e três `now()` separados deixam uma emissão da virada do ano
            // gravar data de 2027 num código LOT-2026.
            //
            // E o instante no fuso de SANTIAGO (P-59): `->year`, o `emitido_em`
            // do snapshot e o `valido_ate` são datas do documento, e o relógio
            // UTC as adiantava um dia das 21h à meia-noite locais.
            $now = FusoDoNegocio::agora();
```

- [ ] **Step 4: Rodar o arquivo inteiro**

Run: `docker compose exec -T app php artisan test --filter=IssueCertificateTest`
Expected: PASS em todos. Os testes existentes congelam `2026-08-05 14:30:00` e `2026-12-31 23:59:59` UTC, que caem no mesmo dia em Santiago — nenhum deles é editado.

- [ ] **Step 5: Pint e commit**

```bash
cd backend && ./vendor/bin/pint app/Domains/Certification/Actions/IssueCertificateAction.php tests/Feature/Certification/IssueCertificateTest.php
git add backend/app/Domains/Certification/Actions/IssueCertificateAction.php backend/tests/Feature/Certification/IssueCertificateTest.php
git commit -m "fix(certification): emissao congela o dia e o ano de Santiago

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: O "hoje" de Identity e Operation

**Files:**
- Modify: `backend/app/Domains/Identity/Enums/DocumentValidityStatus.php:5-8,38`
- Modify: `backend/app/Domains/Identity/Services/StudentClientLinkService.php:8,26`
- Modify: `backend/app/Domains/Operation/Services/RedatorIdoneidadeService.php:45`
- Test: `backend/tests/Unit/Identity/DocumentValidityStatusTest.php` — **edição autorizada:** as 5 ocorrências de `CarbonImmutable::today()` (linhas 15, 30, 38, 45, 52) viram `FusoDoNegocio::hoje()`; mais **um teste novo**. Nenhuma outra linha muda.

**Interfaces:**
- Consumes: `FusoDoNegocio::hoje()` (Task 1).

**Por que o teste existente muda:** ele não congela o relógio e monta a fixture com o "hoje" UTC. Depois da troca, entre 21h e a meia-noite de Santiago, `today()->subDay()` UTC é o hoje local e o `test_data_passada_e_vencido` reprovaria — o teste ficaria dependente da hora em que roda.

- [ ] **Step 1: Escrever o teste da virada**

Acrescente no fim de `DocumentValidityStatusTest` (antes do `}` final):

```php
    /**
     * P-59: às 22h de Santiago (01:00 UTC do dia seguinte) um documento que
     * vence HOJE no Chile ainda vale. O relógio UTC já o chamava de vencido.
     */
    public function test_vence_hoje_em_santiago_segue_valendo_as_22h_locais(): void
    {
        CarbonImmutable::setTestNow(CarbonImmutable::parse('2026-09-25 01:00:00', 'UTC'));

        try {
            $status = DocumentValidityStatus::for(CarbonImmutable::parse('2026-09-24'), presente: true);
        } finally {
            CarbonImmutable::setTestNow();
        }

        $this->assertSame(DocumentValidityStatus::VenceEmBreve, $status);
    }
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `docker compose exec -T app php artisan test --filter=test_vence_hoje_em_santiago_segue_valendo_as_22h_locais`
Expected: FAIL — `vence_em_breve` esperado, `vencido` recebido. Registre para o audit.

- [ ] **Step 3: Implementar os três sítios**

`DocumentValidityStatus.php`: acrescente `use App\Shared\Support\FusoDoNegocio;` e troque a linha 38 por:

```php
        $hoje = FusoDoNegocio::hoje();
```

`StudentClientLinkService.php`: troque `use Illuminate\Support\Carbon;` (linha 8) por `use App\Shared\Support\FusoDoNegocio;` e a linha 26 por:

```php
            $today = FusoDoNegocio::hoje();
```

`RedatorIdoneidadeService.php`: acrescente `use App\Shared\Support\FusoDoNegocio;` e troque a linha 45 por:

```php
                ->orWhereDate('valid_until', '>=', FusoDoNegocio::hoje()->toDateString()))
```

- [ ] **Step 4: Aplicar a edição autorizada no teste existente**

Em `DocumentValidityStatusTest.php`, acrescente `use App\Shared\Support\FusoDoNegocio;` aos imports e troque as 5 ocorrências de `CarbonImmutable::today()` por `FusoDoNegocio::hoje()` (linhas 15, 30, 38, 45, 52). O import de `CarbonImmutable` continua, porque o teste novo o usa.

- [ ] **Step 5: Rodar tudo o que cobre os três sítios**

Run: `docker compose exec -T app php artisan test --filter='DocumentValidityStatus|StudentClient|RedatorIdoneidade|Designa|ProfileData|RedatorDocument'`
Expected: PASS em todos. Se um filtro não casar com nenhum teste, siga: o que importa é nenhum vermelho.

- [ ] **Step 6: Pint e commit**

```bash
cd backend && ./vendor/bin/pint app/Domains/Identity/Enums/DocumentValidityStatus.php app/Domains/Identity/Services/StudentClientLinkService.php app/Domains/Operation/Services/RedatorIdoneidadeService.php tests/Unit/Identity/DocumentValidityStatusTest.php
git add backend/app/Domains/Identity/Enums/DocumentValidityStatus.php backend/app/Domains/Identity/Services/StudentClientLinkService.php backend/app/Domains/Operation/Services/RedatorIdoneidadeService.php backend/tests/Unit/Identity/DocumentValidityStatusTest.php
git commit -m "fix(identity): vigencia e vinculo usam o hoje de Santiago

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: O Dashboard deriva data no fuso do negócio

**Files (todas em `backend/app/Domains/Dashboard/`):**
- Modify: `Services/IdentityMetricsQuery.php:27`
- Modify: `Services/RedatorScopeQuery.php:53,74,124`
- Modify: `Services/RedatorLoadQuery.php:31,79`
- Modify: `Services/CertificationMetricsQuery.php:41,55`
- Modify: `Services/OperationMetricsQuery.php:31,52`
- Modify: `Services/DashboardWindows.php:21,26`
- Modify: `Services/CommercialMetricsQuery.php:65`
- Modify: `Data/DashboardFilterData.php:73,80`

**Interfaces:**
- Consumes: `FusoDoNegocio::hoje()` e `FusoDoNegocio::dataDe()` (Task 1).

**Fora desta task, por decisão escrita na spec §4:** `AnalyticsQuery` (agrupa instantes por mês em UTC com limites UTC — coerente por dentro; migrar só o balde criaria mês fora do período). Não toque nele.

- [ ] **Step 1: Registrar a linha de base**

Run: `docker compose exec -T app php artisan test tests/Feature/Dashboard`
Expected: PASS. Anote o número de testes; é o mesmo que o Step 4 tem de mostrar. Os testes do Dashboard congelam `2026-08-14 12:00:00` UTC (08:00 em Santiago, mesmo dia), então a troca não muda nenhum resultado deles — e **nenhum deles é editado**.

- [ ] **Step 2: Trocar o "hoje" UTC pelo local**

Em cada arquivo abaixo, acrescente `use App\Shared\Support\FusoDoNegocio;` aos imports e faça exatamente as trocas listadas:

| Arquivo | De | Para |
|---|---|---|
| `IdentityMetricsQuery.php:27` | `CarbonImmutable::today()` | `FusoDoNegocio::hoje()` |
| `RedatorScopeQuery.php:53,74,124` | `CarbonImmutable::today()` | `FusoDoNegocio::hoje()` |
| `RedatorLoadQuery.php:31,79` | `CarbonImmutable::today()` | `FusoDoNegocio::hoje()` |
| `CertificationMetricsQuery.php:55` | `CarbonImmutable::today()` | `FusoDoNegocio::hoje()` |
| `OperationMetricsQuery.php:31,52` | `CarbonImmutable::today()` | `FusoDoNegocio::hoje()` |
| `DashboardFilterData.php:73,80` | `CarbonImmutable::today()` | `FusoDoNegocio::hoje()` |
| `DashboardWindows.php:21,26` | `CarbonImmutable::now()->addDays(` | `FusoDoNegocio::hoje()->addDays(` |

`hoje()` tem a forma do cast `date` (meia-noite no fuso da aplicação), então `whereDate`, `where` direto contra coluna `date`, `isAfter` em memória e `->endOfDay()` seguem se comportando como antes — só o dia muda.

- [ ] **Step 3: Projetar os dois instantes no dia local**

`CommercialMetricsQuery.php:65` — troque:

```php
                date: $quote->approved_at?->toDateString(),
```

por:

```php
                date: FusoDoNegocio::dataDe($quote->approved_at),
```

`CertificationMetricsQuery.php:41` — troque:

```php
                date: $enrollment->turma->concluded_at?->toDateString(),
```

por:

```php
                date: FusoDoNegocio::dataDe($enrollment->turma->concluded_at),
```

(`approved_at` e `concluded_at` são cast `datetime` — medido em `Quote.php:54` e `Turma.php:65` —, por isso levam `dataDe` e não `hoje`.)

- [ ] **Step 4: Rodar o Dashboard inteiro**

Run: `docker compose exec -T app php artisan test tests/Feature/Dashboard`
Expected: PASS, com o mesmo número de testes do Step 1.

- [ ] **Step 5: Pint e commit**

```bash
cd backend && ./vendor/bin/pint app/Domains/Dashboard/Services/IdentityMetricsQuery.php app/Domains/Dashboard/Services/RedatorScopeQuery.php app/Domains/Dashboard/Services/RedatorLoadQuery.php app/Domains/Dashboard/Services/CertificationMetricsQuery.php app/Domains/Dashboard/Services/OperationMetricsQuery.php app/Domains/Dashboard/Services/DashboardWindows.php app/Domains/Dashboard/Services/CommercialMetricsQuery.php app/Domains/Dashboard/Data/DashboardFilterData.php
git add backend/app/Domains/Dashboard
git commit -m "fix(dashboard): hoje e datas de alerta no fuso de Santiago

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

(Se o Pint remover o `use Carbon\CarbonImmutable;` que ficou sem uso em algum arquivo, é o esperado.)

---

### Task 5: A catraca da data de calendário

**Files:**
- Create: `backend/tests/Unit/Shared/DataDeCalendarioTest.php`
- Modify: `.claude/rules/backend-ddd.md` (seção nova, logo antes de `## Mensagem ao usuário sai de \`lang/\`, nunca do código`)

**Interfaces:**
- Consumes: `Tests\Support\ScansPhpSource` (`arquivosPhp()`, `codigoSemComentarios()`); o arquivo `app/Shared/Support/FusoDoNegocio.php` (Task 1).

- [ ] **Step 1: Escrever a catraca**

`backend/tests/Unit/Shared/DataDeCalendarioTest.php`:

```php
<?php

namespace Tests\Unit\Shared;

use PHPUnit\Framework\TestCase;
use Tests\Support\ScansPhpSource;

/**
 * P-59, spec D1 do item 29: data de calendário sai do `FusoDoNegocio`.
 *
 * O servidor roda em UTC, e `today()` ou `now()->toDateString()` devolvem o
 * dia de Londres — um dia adiantado das 21h à meia-noite de Santiago. O
 * certificado congelou esse dia no snapshot até o item 29.
 *
 * Limite conhecido, escrito para não ser descoberto de novo: a catraca lê
 * GRAFIA. `$now = now();` numa linha e `$now->year` noutra passam por ela — é
 * exatamente a forma do defeito da `IssueCertificateAction`, e quem o guarda
 * é o comportamento (`IssueCertificateTest`, os dois testes de Santiago).
 */
class DataDeCalendarioTest extends TestCase
{
    use ScansPhpSource;

    /** Único arquivo de `app/` autorizado a ler o relógio para derivar data. */
    private const DONO = 'Shared/Support/FusoDoNegocio.php';

    /** @var array<string, string> grafia proibida => regex */
    private const GRAFIAS = [
        'today()' => '/(?<![\w$>:])today\s*\(/',
        'Carbon::today()' => '/\b(?:Carbon|CarbonImmutable)::today\s*\(/',
        'now() projetado em data' => '/(?:(?<![\w$>:])now|\b(?:Carbon|CarbonImmutable)::now)\s*\(\s*\)(?:\s*->\s*(?:copy|add\w*|sub\w*)\s*\([^()]*\))*\s*->\s*(?:toDateString|startOfDay|endOfDay)\s*\(/',
    ];

    public function test_nenhum_arquivo_de_app_deriva_data_do_relogio_do_servidor(): void
    {
        $app = dirname(__DIR__, 3).'/app';
        $violacoes = [];

        foreach ($this->arquivosPhp($app) as $arquivo) {
            $relativo = substr($arquivo, strlen($app) + 1);

            if ($relativo === self::DONO) {
                continue;
            }

            $codigo = $this->codigoSemComentarios($arquivo);

            foreach (self::GRAFIAS as $grafia => $regex) {
                if (preg_match($regex, $codigo) === 1) {
                    $violacoes[] = "{$relativo}: {$grafia}";
                }
            }
        }

        $this->assertSame(
            [],
            $violacoes,
            'Data de calendário derivada do relógio UTC. Use App\Shared\Support\FusoDoNegocio (hoje(), agora(), dataDe()).',
        );
    }

    /** O detector tem de reconhecer cada grafia — e só ela. Regex que apodrece aprova tudo. */
    public function test_o_detector_reconhece_as_grafias_e_poupa_os_instantes(): void
    {
        $proibidas = [
            '$d = today();',
            '$d = Carbon::today();',
            '$d = CarbonImmutable::today()->subDay();',
            '$d = now()->toDateString();',
            '$d = CarbonImmutable::now()->addDays(self::DIAS)->endOfDay();',
            '$d = Carbon::now()->startOfDay();',
        ];
        $permitidas = [
            '$d = now();',
            '$d = now()->addSeconds(2);',
            '$d = CarbonImmutable::now()->subMonths(self::MESES);',
            '$d = FusoDoNegocio::hoje();',
            '$d = $relogio->today();',
            '$d = CarbonImmutable::now(self::TIMEZONE);',
        ];

        foreach ($proibidas as $codigo) {
            $this->assertTrue($this->casa($codigo), "Deveria reprovar: {$codigo}");
        }

        foreach ($permitidas as $codigo) {
            $this->assertFalse($this->casa($codigo), "Deveria passar: {$codigo}");
        }
    }

    public function test_o_dono_declarado_existe(): void
    {
        $this->assertFileExists(dirname(__DIR__, 3).'/app/'.self::DONO);
    }

    private function casa(string $codigo): bool
    {
        foreach (self::GRAFIAS as $regex) {
            if (preg_match($regex, $codigo) === 1) {
                return true;
            }
        }

        return false;
    }
}
```

- [ ] **Step 2: Rodar — verde com as Tasks 1-4 aplicadas**

Run: `docker compose exec -T app php artisan test --filter=DataDeCalendarioTest`
Expected: PASS nos três. Se o primeiro reprovar listando um arquivo, é sítio que o levantamento de `main@3ce23023` não viu: **STOP** — reporte o arquivo e a linha ao João antes de migrá-lo (a lista da spec D1 é fechada).

- [ ] **Step 3: Sonda — ver a catraca reprovar**

```bash
SP=/tmp/claude-1000/-home-jvbat-projetos-lotus/99e5c1cc-ef47-4005-9fa4-bc30482e9428/scratchpad
cp backend/app/Domains/Identity/Enums/DocumentValidityStatus.php "$SP/DocumentValidityStatus.php.orig"
sed -i 's/FusoDoNegocio::hoje()/CarbonImmutable::today()/' backend/app/Domains/Identity/Enums/DocumentValidityStatus.php
docker compose exec -T app php artisan test --filter=test_nenhum_arquivo_de_app_deriva_data_do_relogio_do_servidor
cp "$SP/DocumentValidityStatus.php.orig" backend/app/Domains/Identity/Enums/DocumentValidityStatus.php
git diff --stat backend/app/Domains/Identity/Enums/DocumentValidityStatus.php
```

Expected: o `artisan test` FALHA com `Domains/Identity/Enums/DocumentValidityStatus.php: Carbon::today()` na lista; o `git diff --stat` final sai **vazio** (arquivo restaurado). Registre a saída para o audit.

- [ ] **Step 4: Escrever a regra**

Em `.claude/rules/backend-ddd.md`, imediatamente antes da linha `## Mensagem ao usuário sai de \`lang/\`, nunca do código`, insira:

```markdown
## Data de calendário sai do `FusoDoNegocio`

O servidor grava e compara INSTANTES em UTC — `config/app.php` fixa `'timezone' => 'UTC'` como
literal **por decisão** (P-59, item 29): trocá-lo reinterpretaria todo `DATETIME` já gravado. O
**dia do cliente** — o impresso no certificado, o "hoje" de uma vigência, a data de um alerta — sai
de `App\Shared\Support\FusoDoNegocio`:

- `hoje()` para comparar com coluna `date` — tem a mesma forma do cast (meia-noite no fuso da app);
- `agora()` para o instante com calendário local (`->year` do código, `emitido_em`);
- `dataDe($instante)` para projetar um `datetime` (`approved_at`, `concluded_at`) em dia.

**Catraca:** `tests/Unit/Shared/DataDeCalendarioTest.php` reprova `today()` e `now()` projetado em
data no resto de `app/`. Ela lê grafia: `$now = now()` numa linha e `$now->year` noutra passa — o
guarda desse caso é teste de comportamento com o relógio congelado entre 21h e meia-noite de
Santiago.
```

- [ ] **Step 5: Pint e commit**

```bash
cd backend && ./vendor/bin/pint tests/Unit/Shared/DataDeCalendarioTest.php
git add backend/tests/Unit/Shared/DataDeCalendarioTest.php .claude/rules/backend-ddd.md
git commit -m "test(shared): catraca da data de calendario derivada do relogio UTC

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: UTC literal, como decisão escrita e guardada

**Files:**
- Modify: `backend/config/app.php:65-75` (só o comentário; o valor já é `'UTC'`)
- Create: `backend/tests/Feature/Shared/FusoDeArmazenamentoTest.php`
- Modify: `backend/.env.example:13`
- Modify: `backend/.env.production.example:9-10`

**Nota de TDD:** o valor já está certo, então o teste nasce verde — ele guarda uma decisão, não conserta um defeito. A prova de que ele morde é a sonda do Step 4, que troca o literal por `env()` e o vê reprovar.

- [ ] **Step 1: Escrever o teste**

`backend/tests/Feature/Shared/FusoDeArmazenamentoTest.php`:

```php
<?php

namespace Tests\Feature\Shared;

use Tests\TestCase;

/**
 * P-59, spec D2 do item 29: o fuso de ARMAZENAMENTO é UTC, e a chave do
 * ambiente não o alcança.
 *
 * Com `env('APP_TIMEZONE')` no `config/app.php`, bastaria escrever
 * `America/Santiago` no `.env` de produção para reinterpretar em 3–4h todo
 * `DATETIME` já gravado — e tornar ambígua a hora do fim do horário de verão
 * nas auditorias. O fuso do cliente mora no `FusoDoNegocio`.
 */
class FusoDeArmazenamentoTest extends TestCase
{
    protected function tearDown(): void
    {
        unset($_ENV['APP_TIMEZONE'], $_SERVER['APP_TIMEZONE']);
        putenv('APP_TIMEZONE');

        parent::tearDown();
    }

    public function test_fuso_da_aplicacao_e_utc_mesmo_com_app_timezone_no_ambiente(): void
    {
        $_ENV['APP_TIMEZONE'] = $_SERVER['APP_TIMEZONE'] = 'America/Santiago';
        putenv('APP_TIMEZONE=America/Santiago');

        $this->refreshApplication();

        $this->assertSame(
            'America/Santiago',
            env('APP_TIMEZONE'),
            'A sonda não chegou ao ambiente — sem isto o teste não provaria nada.',
        );
        $this->assertSame('UTC', config('app.timezone'));
        $this->assertSame('UTC', date_default_timezone_get());
    }
}
```

- [ ] **Step 2: Rodar — verde**

Run: `docker compose exec -T app php artisan test --filter=FusoDeArmazenamentoTest`
Expected: PASS.

- [ ] **Step 3: Escrever a decisão no config**

Em `backend/config/app.php`, troque o parágrafo do bloco `Application Timezone`:

```php
    | Here you may specify the default timezone for your application, which
    | will be used by the PHP date and date-time functions. The timezone
    | is set to "UTC" by default as it is suitable for most use cases.
```

por:

```php
    | UTC por DECISÃO, não por default (P-59, spec D2 do item 29): é o fuso
    | em que o servidor grava e compara instantes. Literal de propósito, sem
    | env(): America/Santiago aqui reinterpretaria todo DATETIME já gravado,
    | e o Chile tem horário de verão. O dia do cliente (o impresso no
    | certificado, o "hoje" de vigência) sai de App\Shared\Support\FusoDoNegocio.
    | Guarda: tests/Feature/Shared/FusoDeArmazenamentoTest.php.
```

- [ ] **Step 4: Sonda — ver o teste reprovar com `env()`**

```bash
SP=/tmp/claude-1000/-home-jvbat-projetos-lotus/99e5c1cc-ef47-4005-9fa4-bc30482e9428/scratchpad
cp backend/config/app.php "$SP/app.php.orig"
sed -i "s/'timezone' => 'UTC',/'timezone' => env('APP_TIMEZONE', 'UTC'),/" backend/config/app.php
docker compose exec -T app php artisan test --filter=FusoDeArmazenamentoTest
cp "$SP/app.php.orig" backend/config/app.php
docker compose exec -T app php artisan test --filter=FusoDeArmazenamentoTest
```

Expected: a primeira execução FALHA (`'UTC'` esperado, `'America/Santiago'` recebido); depois do `cp`, a segunda PASSA. Se a primeira PASSAR, o ambiente não chegou ao `env()` — **STOP**, o teste é vácuo e precisa de outro mecanismo de sonda; reporte. Registre as duas saídas para o audit.

- [ ] **Step 5: Tirar a promessa falsa dos moldes**

`backend/.env.example` — troque a linha 13:

```
APP_TIMEZONE=America/Santiago
```

por:

```
# Sem APP_TIMEZONE, de propósito: config/app.php fixa 'timezone' => 'UTC' como
# decisão (P-59) e não lê a chave. O fuso do cliente mora em
# App\Shared\Support\FusoDoNegocio.
```

`backend/.env.production.example` — troque as linhas 9-10:

```
#   APP_TIMEZONE     — config/app.php linha 75 fixa 'timezone' => 'UTC' como
#                       literal, não lê env('APP_TIMEZONE'). Chave morta.
```

por:

```
#   APP_TIMEZONE     — config/app.php fixa 'timezone' => 'UTC' como literal
#                       POR DECISÃO (P-59): o fuso do cliente é o FusoDoNegocio.
```

- [ ] **Step 6: Pint e commit**

```bash
cd backend && ./vendor/bin/pint config/app.php tests/Feature/Shared/FusoDeArmazenamentoTest.php
git add backend/config/app.php backend/tests/Feature/Shared/FusoDeArmazenamentoTest.php backend/.env.example backend/.env.production.example
git commit -m "fix(config): UTC literal por decisao escrita, e o molde para de prometer Santiago

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: `CertificateValidationUrl` — a chave própria da P-79

**Files:**
- Modify: `backend/config/app.php:57` (chave nova logo abaixo de `frontend_url`)
- Create: `backend/app/Domains/Certification/Services/CertificateValidationUrl.php`
- Create: `backend/app/Domains/Certification/Exceptions/ValidacaoDeCertificadoNaoConfigurada.php`
- Modify: `backend/lang/es_CL/certification.php`, `backend/lang/pt_BR/certification.php`, `backend/lang/en/certification.php` (chave `validation_url.not_configured` depois de `snapshot`)
- Create: `backend/tests/Feature/Certification/CertificateValidationUrlTest.php`

**Interfaces:**
- Produces:
  - `config('app.certificate_validation_url')` — `?string`, de `env('CERTIFICATE_VALIDATION_URL')`
  - `App\Domains\Certification\Services\CertificateValidationUrl::base(): string` — sem `/` final; lança em produção
  - `CertificateValidationUrl::para(Certificate $certificate): string` — `base().'/validar/'.uuid`
  - `App\Domains\Certification\Exceptions\ValidacaoDeCertificadoNaoConfigurada::emProducao(): self`
  - Frase es-CL (usada nos testes da Task 8): `La dirección de validación de certificados no está configurada con https. Ningún certificado se emite ni se descarga hasta que el administrador del sistema la configure.`

- [ ] **Step 1: Escrever o teste que falha**

`backend/tests/Feature/Certification/CertificateValidationUrlTest.php`:

```php
<?php

namespace Tests\Feature\Certification;

use App\Domains\Certification\Exceptions\ValidacaoDeCertificadoNaoConfigurada;
use App\Domains\Certification\Models\Certificate;
use App\Domains\Certification\Services\CertificateValidationUrl;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

/**
 * P-79, spec D3 do item 29: a base do QR é conteúdo de documento, não
 * endereço de serviço. Fora de produção ela cai no `frontend_url`; em
 * produção é obrigatória e https, e não herda nada.
 */
class CertificateValidationUrlTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        config(['app.frontend_url' => 'http://localhost:5173/']);
    }

    public function test_fora_de_producao_usa_a_chave_quando_preenchida(): void
    {
        config(['app.certificate_validation_url' => 'https://valida.example.test/']);

        $this->assertSame('https://valida.example.test', $this->url()->base());
    }

    public function test_fora_de_producao_sem_chave_cai_no_frontend_url(): void
    {
        config(['app.certificate_validation_url' => null]);

        $this->assertSame('http://localhost:5173', $this->url()->base());
    }

    public function test_em_producao_usa_a_chave_https(): void
    {
        $this->emProducao();
        config(['app.certificate_validation_url' => 'https://app.lotusotec.cl']);

        $this->assertSame('https://app.lotusotec.cl', $this->url()->base());
    }

    /**
     * O `frontend_url` https está posto DE PROPÓSITO: se produção herdasse o
     * fallback, estes casos passariam. Recusar mesmo assim é o que prova que a
     * regra do runbook virou mecanismo.
     */
    #[DataProvider('chavesQueProducaoRecusa')]
    public function test_em_producao_recusa_chave_ausente_vazia_ou_sem_https(?string $chave): void
    {
        $this->emProducao();
        config([
            'app.frontend_url' => 'https://app.lotusotec.cl',
            'app.certificate_validation_url' => $chave,
        ]);

        $this->expectException(ValidacaoDeCertificadoNaoConfigurada::class);

        $this->url()->base();
    }

    /** @return array<string, array{?string}> */
    public static function chavesQueProducaoRecusa(): array
    {
        return [
            'ausente' => [null],
            'vazia' => [''],
            'http cru, o EIP da fase sem DNS' => ['http://18.230.53.197'],
        ];
    }

    public function test_para_aponta_a_rota_publica_de_validacao_com_o_uuid(): void
    {
        config(['app.certificate_validation_url' => 'https://valida.example.test']);
        $certificate = new Certificate;
        $certificate->uuid = '5b0c7c1e-8d1f-4b8e-9d3a-2f6e1c0a9b77';

        $this->assertSame(
            'https://valida.example.test/validar/5b0c7c1e-8d1f-4b8e-9d3a-2f6e1c0a9b77',
            $this->url()->para($certificate),
        );
    }

    private function url(): CertificateValidationUrl
    {
        return $this->app->make(CertificateValidationUrl::class);
    }

    private function emProducao(): void
    {
        $this->app->detectEnvironment(fn (): string => 'production');
    }
}
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `docker compose exec -T app php artisan test --filter=CertificateValidationUrlTest`
Expected: FAIL com `Class "App\Domains\Certification\Exceptions\ValidacaoDeCertificadoNaoConfigurada" not found` (ou o do service).

- [ ] **Step 3: A chave no config**

Em `backend/config/app.php`, logo depois da linha `'frontend_url' => env('FRONTEND_URL', 'http://localhost:5173'),`, insira:

```php

    // Base da URL pública de validação que vai no QR do certificado (P-79).
    // NÃO é endereço de serviço: é conteúdo de documento de peso legal, e a
    // cópia distribuída do PDF carrega o valor para sempre. Por isso não herda
    // o FRONTEND_URL em produção — lá ela é obrigatória e https, e sem ela
    // emitir e baixar recusam (Certification\Services\CertificateValidationUrl).
    'certificate_validation_url' => env('CERTIFICATE_VALIDATION_URL'),
```

- [ ] **Step 4: A exceção**

`backend/app/Domains/Certification/Exceptions/ValidacaoDeCertificadoNaoConfigurada.php`:

```php
<?php

namespace App\Domains\Certification\Exceptions;

use App\Shared\Exceptions\PublicDetail;
use RuntimeException;

/**
 * Produção sem a base https do QR do certificado (P-79, spec D3 do item 29).
 *
 * Mesmo molde da `CorruptedSnapshotException`, e pelo mesmo motivo: documento
 * de peso legal não sai com o que não se sabe — aqui, o endereço que a cópia
 * impressa vai carregar para sempre. Sai 500 pelo `ProblemDetails`.
 *
 * **Não é `RecusaDeDominio`.** Não há regra de negócio recusando o operador:
 * há configuração quebrada, e ela precisa virar chamado. `RecusaDeDominio` está
 * no `dontReport` e sairia 422 sem deixar rastro no log.
 *
 * `PublicDetail`: sem a interface, o `ProblemDetails` trocaria a frase por
 * "erro inesperado" com `APP_DEBUG=false`, e o operador não saberia por que
 * nenhum certificado sai. A frase não nomeia a variável de ambiente — o log
 * tem a classe e o stack trace.
 */
class ValidacaoDeCertificadoNaoConfigurada extends RuntimeException implements PublicDetail
{
    public static function emProducao(): self
    {
        return new self(__('certification.validation_url.not_configured'));
    }
}
```

- [ ] **Step 5: O service**

`backend/app/Domains/Certification/Services/CertificateValidationUrl.php`:

```php
<?php

namespace App\Domains\Certification\Services;

use App\Domains\Certification\Exceptions\ValidacaoDeCertificadoNaoConfigurada;
use App\Domains\Certification\Models\Certificate;

/**
 * Dono único do endereço que vai no QR do certificado (P-79, spec D3 do item 29).
 *
 * O QR era `FRONTEND_URL + /validar/{uuid}`. `FRONTEND_URL` é infra — muda com
 * o host, o DNS e o TLS —, e a cópia distribuída do PDF é imutável: um
 * certificado baixado na fase sem DNS carregaria o EIP cru para sempre. A regra
 * que proibia isso era de procedimento (runbook §7), e dependia de quem opera
 * lembrar.
 *
 * - Fora de produção, a chave vazia cai no `frontend_url`: dev e teste não
 *   precisam dela.
 * - Em produção ela é obrigatória e https, e NÃO herda o `frontend_url`.
 *   Ausente ou `http://`, `base()` lança — no PDF e antes da emissão.
 */
class CertificateValidationUrl
{
    public function base(): string
    {
        $chave = trim((string) config('app.certificate_validation_url'));

        if (app()->isProduction()) {
            if (! str_starts_with($chave, 'https://')) {
                throw ValidacaoDeCertificadoNaoConfigurada::emProducao();
            }

            return rtrim($chave, '/');
        }

        return rtrim($chave !== '' ? $chave : (string) config('app.frontend_url'), '/');
    }

    public function para(Certificate $certificate): string
    {
        return $this->base()."/validar/{$certificate->uuid}";
    }
}
```

- [ ] **Step 6: A frase nos três locales**

Em cada arquivo, troque o fechamento do bloco `snapshot` + `];` final:

`backend/lang/es_CL/certification.php`:

```php
    'snapshot' => [
        'not_presentable' => 'El certificado :codigo no puede presentarse: su documento congelado no tiene los campos :campos.',
    ],
    'validation_url' => [
        'not_configured' => 'La dirección de validación de certificados no está configurada con https. Ningún certificado se emite ni se descarga hasta que el administrador del sistema la configure.',
    ],
];
```

`backend/lang/pt_BR/certification.php`:

```php
    'snapshot' => [
        'not_presentable' => 'O certificado :codigo não pode ser apresentado: seu documento congelado não tem os campos :campos.',
    ],
    'validation_url' => [
        'not_configured' => 'O endereço de validação de certificados não está configurado com https. Nenhum certificado é emitido nem baixado até que o administrador do sistema o configure.',
    ],
];
```

`backend/lang/en/certification.php`:

```php
    'snapshot' => [
        'not_presentable' => 'Certificate :codigo cannot be presented: its frozen document is missing the fields :campos.',
    ],
    'validation_url' => [
        'not_configured' => 'The certificate validation address is not configured with https. No certificate is issued or downloaded until the system administrator configures it.',
    ],
];
```

Não rode `pint` em `lang/` (rule `.claude/rules/backend-lang.md`).

- [ ] **Step 7: Rodar**

Run: `docker compose exec -T app php artisan test --filter='CertificateValidationUrlTest|LocaleParityTest|MensagemLiteralTest'`
Expected: PASS em todos (7 casos no `CertificateValidationUrlTest`, contando os 3 do data provider).

- [ ] **Step 8: Pint e commit**

```bash
cd backend && ./vendor/bin/pint config/app.php app/Domains/Certification/Services/CertificateValidationUrl.php app/Domains/Certification/Exceptions/ValidacaoDeCertificadoNaoConfigurada.php tests/Feature/Certification/CertificateValidationUrlTest.php
git add backend/config/app.php backend/app/Domains/Certification/Services/CertificateValidationUrl.php backend/app/Domains/Certification/Exceptions/ValidacaoDeCertificadoNaoConfigurada.php backend/lang/es_CL/certification.php backend/lang/pt_BR/certification.php backend/lang/en/certification.php backend/tests/Feature/Certification/CertificateValidationUrlTest.php
git commit -m "feat(certification): chave propria da URL de validacao, obrigatoria em producao

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 8: O PDF e a emissão passam pela chave nova

**Files:**
- Modify: `backend/app/Domains/Certification/Services/CertificatePdfService.php:12,27`
- Modify: `backend/app/Domains/Certification/Actions/IssueCertificateAction.php:17-25`
- Test: `backend/tests/Feature/Certification/CertificatePdfTest.php` — **dois testes novos** e **uma edição autorizada**: em `test_qr_aponta_para_frontend_url_e_uuid` (linha 610), o `config([...])` ganha `'app.certificate_validation_url' => null`. Nada mais muda nele.
- Test: `backend/tests/Feature/Certification/IssueCertificateTest.php` — um teste novo
- Test: `backend/tests/Feature/Certification/BatchIssueTest.php` — um teste novo

**Interfaces:**
- Consumes: `CertificateValidationUrl::base()` e `::para()`, `ValidacaoDeCertificadoNaoConfigurada` (Task 7).

**Por que a edição no teste existente:** ele prova o fallback, mas herdaria `CERTIFICATE_VALIDATION_URL` de um `backend/.env` local que a tenha (a Task 11 põe a chave lá para o e2e). Zerar a chave no teste o torna hermético.

- [ ] **Step 1: Confirmar que ninguém constrói as duas classes à mão**

Run: `grep -rn "new CertificatePdfService\|new IssueCertificateAction" backend/app backend/tests`
Expected: nenhuma linha. Se aparecer alguma, **STOP** e reporte: a injeção nova quebraria esse sítio.

- [ ] **Step 2: Escrever os testes que falham**

`CertificatePdfTest.php` — acrescente aos imports:

```php
use App\Domains\Certification\Exceptions\ValidacaoDeCertificadoNaoConfigurada;
use Illuminate\Support\Facades\Exceptions;
use PHPUnit\Framework\Attributes\DataProvider;
```

acrescente a constante logo depois de `private FakeHtmlToPdf $pdf;`:

```php
    private const RECUSA_DE_URL = 'La dirección de validación de certificados no está configurada con https. Ningún certificado se emite ni se descarga hasta que el administrador del sistema la configure.';
```

aplique a edição autorizada na linha 610:

```php
        config([
            'app.frontend_url' => 'https://frontend.example.test/base/',
            'app.certificate_validation_url' => null,
        ]);
```

e acrescente, logo depois de `test_qr_aponta_para_frontend_url_e_uuid`:

```php
    /** P-79: preenchida, a chave própria vence o `frontend_url`. */
    public function test_qr_aponta_para_a_chave_de_validacao_quando_preenchida(): void
    {
        $this->actingAsAdmin();
        config([
            'app.frontend_url' => 'https://frontend.example.test',
            'app.certificate_validation_url' => 'https://valida.example.test/',
        ]);
        $this->fakeGotenberg();
        $expectedQr = base64_encode((string) QrCode::format('svg')
            ->size(180)
            ->margin(0)
            ->generate("https://valida.example.test/validar/{$this->certificate->uuid}"));

        $this->get($this->pdfUrl())->assertOk();

        $this->assertHtml(fn (string $html): bool => str_contains(
            $html,
            "data:image/svg+xml;base64,{$expectedQr}",
        ));
    }

    /**
     * P-79: em produção, sem a base https, o documento não é montado — 500 com
     * a razão no `detail` e registrado no log. O conversor responde 200 de
     * propósito: o 500 só existe porque a recusa vem antes.
     */
    #[DataProvider('chavesQueProducaoRecusa')]
    public function test_pdf_em_producao_sem_chave_https_recusa_com_500_nomeado(?string $chave): void
    {
        $this->app->detectEnvironment(fn (): string => 'production');
        config([
            'app.frontend_url' => 'https://app.lotusotec.cl',
            'app.certificate_validation_url' => $chave,
        ]);
        Exceptions::fake();
        $this->actingAsAdmin();
        Http::fake(['*/forms/chromium/convert/html' => Http::response('%PDF')]);

        $this->getJson($this->pdfUrl())
            ->assertStatus(500)
            ->assertJsonPath('detail', self::RECUSA_DE_URL);

        Http::assertNothingSent();
        Exceptions::assertReported(ValidacaoDeCertificadoNaoConfigurada::class);
    }

    /** @return array<string, array{?string}> */
    public static function chavesQueProducaoRecusa(): array
    {
        return [
            'ausente' => [null],
            'http cru, o EIP da fase sem DNS' => ['http://18.230.53.197'],
        ];
    }
```

`IssueCertificateTest.php` — acrescente depois dos testes da Task 2:

```php
    /**
     * P-79: em produção, sem a base https do QR, o certificado não nasce — um
     * documento que ninguém consegue baixar. Preenchida a chave, a emissão
     * segue e o primeiro número do ano continua livre.
     */
    public function test_emissao_em_producao_sem_chave_https_recusa_e_nao_cria_certificado(): void
    {
        $this->app->detectEnvironment(fn (): string => 'production');
        config([
            'app.frontend_url' => 'https://app.lotusotec.cl',
            'app.certificate_validation_url' => null,
        ]);
        $this->actingAsAdmin();
        $this->createTemplate();

        $this->postJson($this->issueUrl(), $this->validPayload())
            ->assertStatus(500)
            ->assertJsonPath(
                'detail',
                'La dirección de validación de certificados no está configurada con https. Ningún certificado se emite ni se descarga hasta que el administrador del sistema la configure.',
            );

        $this->assertDatabaseCount('certificates', 0);

        config(['app.certificate_validation_url' => 'https://app.lotusotec.cl']);

        $this->postJson($this->issueUrl(), $this->validPayload())
            ->assertCreated()
            ->assertJsonPath('codigo', 'LOT-2026-1000');
    }
```

`BatchIssueTest.php` — acrescente depois de `test_lote_de_dois_emitiveis_emite_ambos_com_codigos_sequenciais`:

```php
    /**
     * P-79: o lote só captura `ValidationException` por item, então a recusa
     * de configuração derruba o lote inteiro antes do primeiro certificado.
     */
    public function test_lote_em_producao_sem_chave_https_recusa_sem_emitir_nenhum(): void
    {
        $this->app->detectEnvironment(fn (): string => 'production');
        config(['app.certificate_validation_url' => null]);
        $this->actingAsAdmin();
        $enrollmentB = $this->segundaMatricula();

        $this->postJson($this->batchUrl(), [
            'enrollment_ids' => [$this->enrollmentA->id, $enrollmentB->id],
            'redator_id' => $this->redator->id,
        ])->assertStatus(500);

        $this->assertDatabaseCount('certificates', 0);
    }
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `docker compose exec -T app php artisan test --filter='test_qr_aponta_para_a_chave_de_validacao_quando_preenchida|test_pdf_em_producao_sem_chave_https_recusa_com_500_nomeado|test_emissao_em_producao_sem_chave_https_recusa_e_nao_cria_certificado|test_lote_em_producao_sem_chave_https_recusa_sem_emitir_nenhum'`
Expected: FAIL nos cinco casos — o QR ainda usa o `frontend_url`; em produção o PDF devolve 200 e a emissão 201. Registre para o audit.

- [ ] **Step 4: Ligar o PDF**

Em `CertificatePdfService.php`, troque o construtor (linha 12):

```php
    public function __construct(
        private readonly HtmlToPdf $pdf,
        private readonly CertificateValidationUrl $validationUrl,
    ) {}
```

e a linha 27:

```php
        $url = rtrim(config('app.frontend_url'), '/')."/validar/{$certificate->uuid}";
```

por:

```php
        // P-79: a base do QR é conteúdo de documento, com dono próprio — em
        // produção, sem ela em https, o PDF não é montado.
        $url = $this->validationUrl->para($certificate);
```

(`CertificateValidationUrl` está no mesmo namespace, `App\Domains\Certification\Services` — sem `use`.)

- [ ] **Step 5: Ligar a emissão**

Em `IssueCertificateAction.php`, acrescente `use App\Domains\Certification\Services\CertificateValidationUrl;`, troque o construtor por:

```php
    public function __construct(
        private readonly CertificateNumberService $numbers,
        private readonly CertificateSnapshotBuilder $snapshots,
        private readonly CertificateEligibility $eligibility,
        private readonly CertificateValidationUrl $validationUrl,
    ) {}
```

e insira como primeira instrução de `execute()`, antes do `return DB::transaction(`:

```php
        // P-79: certificado que ninguém consegue baixar não nasce. A recusa
        // vem antes da transação — nada é gravado, nenhum número é tocado.
        $this->validationUrl->base();

```

- [ ] **Step 6: Rodar a certificação inteira**

Run: `docker compose exec -T app php artisan test tests/Feature/Certification tests/Unit/Certification`
Expected: PASS em todos, incluindo os existentes sem edição além da linha autorizada.

- [ ] **Step 7: Pint e commit**

```bash
cd backend && ./vendor/bin/pint app/Domains/Certification/Services/CertificatePdfService.php app/Domains/Certification/Actions/IssueCertificateAction.php tests/Feature/Certification/CertificatePdfTest.php tests/Feature/Certification/IssueCertificateTest.php tests/Feature/Certification/BatchIssueTest.php
git add backend/app/Domains/Certification/Services/CertificatePdfService.php backend/app/Domains/Certification/Actions/IssueCertificateAction.php backend/tests/Feature/Certification/CertificatePdfTest.php backend/tests/Feature/Certification/IssueCertificateTest.php backend/tests/Feature/Certification/BatchIssueTest.php
git commit -m "fix(certification): QR e emissao passam pela URL de validacao propria

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 9: Moldes e runbook — a regra vira mecanismo

**Files:**
- Modify: `backend/.env.example:44-46`
- Modify: `backend/.env.production.example:83-86`
- Modify: `deploy/aws/env.prod.example:80-90`
- Modify: `deploy/aws/README.md` (§7, perto da linha 170; §11, perto das linhas 331-347)

Sem teste de código: é doc operacional. A verificação é o `grep` do Step 5.

- [ ] **Step 1: `backend/.env.example`**

Troque:

```
# Sobrescrita em dev pelo compose (ver comentário de APP_URL acima). Ver ADR-13.
SANCTUM_STATEFUL_DOMAINS=localhost:5173,localhost:8080
FRONTEND_URL=http://localhost:5173
```

por:

```
# Sobrescrita em dev pelo compose (ver comentário de APP_URL acima). Ver ADR-13.
SANCTUM_STATEFUL_DOMAINS=localhost:5173,localhost:8080
FRONTEND_URL=http://localhost:5173

# Base da URL de validação no QR do certificado (P-79). Vazia em dev: fora de
# produção ela cai para FRONTEND_URL. Em produção é obrigatória e https.
CERTIFICATE_VALIDATION_URL=
```

- [ ] **Step 2: `backend/.env.production.example`**

Troque:

```
# Origem única (spec D2): SPA e API no mesmo host. FRONTEND_URL e
# SANCTUM_STATEFUL_DOMAINS descrevem esse host único.
FRONTEND_URL=
SANCTUM_STATEFUL_DOMAINS=
```

por:

```
# Origem única (spec D2): SPA e API no mesmo host. FRONTEND_URL e
# SANCTUM_STATEFUL_DOMAINS descrevem esse host único.
FRONTEND_URL=
SANCTUM_STATEFUL_DOMAINS=

# Base da URL pública de validação no QR do certificado (P-79). É CONTEÚDO DE
# DOCUMENTO LEGAL, não endereço de serviço: vazia ou sem https, o backend
# recusa emitir e baixar certificado (500 nomeado) — não herda o FRONTEND_URL.
CERTIFICATE_VALIDATION_URL=
```

- [ ] **Step 3: `deploy/aws/env.prod.example`**

Troque o bloco das linhas 80-90 (de `# ATENÇÃO — FRONTEND_URL É CONTEÚDO DE DOCUMENTO LEGAL, não só infra.` até `SANCTUM_STATEFUL_DOMAINS=app.lotusotec.cl`) por:

```
# FRONTEND_URL é infra: muda com o host, o DNS e o TLS. Até o item 29 ele era
# também a base do QR do certificado; não é mais (P-79).
FRONTEND_URL=http://app.lotusotec.cl
SANCTUM_STATEFUL_DOMAINS=app.lotusotec.cl

# ATENÇÃO — CERTIFICATE_VALIDATION_URL É CONTEÚDO DE DOCUMENTO LEGAL.
# É a base do QR do certificado (`<base>/validar/{uuid}`,
# Domains/Certification/Services/CertificateValidationUrl.php), e a cópia
# distribuída do PDF carrega esse endereço para sempre. Por isso ela NÃO herda
# o FRONTEND_URL: vazia ou sem https, o backend RECUSA emitir e baixar
# certificado — 500 com a razão no `detail` e no log.
# FASE SEM DNS: deixe VAZIA. A recusa é o comportamento certo enquanto não
# houver domínio definitivo com TLS — o EIP não tem como chegar a um documento,
# e nem certificado de prova se emite em produção nesta fase. O passo que a
# preenche está no runbook §11.
CERTIFICATE_VALIDATION_URL=https://app.lotusotec.cl   # na fase sem DNS: VAZIA
```

- [ ] **Step 4: `deploy/aws/README.md`**

§7 — troque:

```
`true` no §11, junto com o domínio. E a fase sem DNS tem uma proibição: **nenhum certificado REAL
se emite enquanto o `FRONTEND_URL` for o EIP**, porque o QR do certificado nasce desse campo
(`CertificatePdfService`) e o documento é snapshot imutável — o EIP ficaria congelado no QR de um
papel de peso legal. Certificado de prova nesta fase se apaga junto com a prova.
```

por:

```
`true` no §11, junto com o domínio. E na fase sem DNS o `CERTIFICATE_VALIDATION_URL` fica
**vazio**: o QR do certificado nasce dele (`CertificateValidationUrl`), a cópia distribuída do PDF
o carrega para sempre, e em produção o backend **recusa emitir e baixar certificado** sem ele em
https — 500 com a razão no `detail` e no log. Até o item 29 isto era uma proibição de procedimento
sobre o `FRONTEND_URL`; agora é mecanismo (P-79), e o EIP não tem como chegar a um documento. Nesta
fase nem certificado de prova se emite em produção.
```

§11 — troque `São **cinco** campos, não um:` por `São **seis** campos, não um:`; acrescente à tabela, depois da linha do `FRONTEND_URL`:

```
| `CERTIFICATE_VALIDATION_URL` | vazia | `https://app.lotusotec.cl` |
```

e troque:

```
E `FRONTEND_URL` não é só infra: o QR do certificado é `FRONTEND_URL + /validar/{uuid}`, gravado
para sempre num documento de peso legal — **só depois deste passo se emite certificado real**.
```

por:

```
E o `CERTIFICATE_VALIDATION_URL` não é infra: é a base do QR do certificado, que a cópia
distribuída do PDF carrega para sempre — **só com ele preenchido em https o backend volta a emitir e
a entregar PDF**. Não herda o `FRONTEND_URL`, de propósito (P-79).
```

Depois, rode `grep -n "cinco" deploy/aws/README.md` e ajuste para "seis" **só** as ocorrências que contam os campos do §11. Se houver outra contagem de "cinco" que se refira a esses campos fora do §11, ajuste-a também; qualquer outra fica.

- [ ] **Step 5: Verificar que nenhum molde promete o que o código não faz**

Run: `grep -rn "FRONTEND_URL + /validar\|QR do certificado é \`FRONTEND_URL\|APP_TIMEZONE=" deploy backend/.env.example backend/.env.production.example`
Expected: nenhuma linha.

- [ ] **Step 6: Commit**

```bash
git add backend/.env.example backend/.env.production.example deploy/aws/env.prod.example deploy/aws/README.md
git commit -m "docs(deploy): a base do QR tem chave propria e producao recusa sem ela

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 10: Fichas — veredito da P-75 e o bloco das três

**Files:**
- Modify: `docs/superpowers/pendencias/abertas.md` (fichas `P-75` ~linha 83, `P-79` ~linha 260, `P-59` ~linha 498)

A migração das três para `encerradas.md` e a linha do índice acontecem no `/fechar-sprint`, não aqui.

- [ ] **Step 1: `Bloco:` das três fichas**

Nas três fichas, troque `**Bloco:** —` por `**Bloco:** 29 \`backend-config-e-conteudo-de-documento\``. O resto da linha (gatilho, revisão) fica.

- [ ] **Step 2: Veredito na P-75**

Logo depois do parágrafo que termina em `Aqui a origem legítima nem chega ao 419.`, insira:

```markdown

### Veredito — 2026-09-24, item 29 (`backend-config-e-conteudo-de-documento`)

**A config não diverge do ambiente; a medição de 2026-09-02 bateu na porta errada.** Desde
`03127249` (2026-08-24), o `docker-compose.yml:19` injeta no container
`SANCTUM_STATEFUL_DOMAINS=localhost:${LOTUS_DEV_VITE_PORT},localhost:${LOTUS_DEV_HTTP_PORT}`, e
variável de ambiente real vence o `backend/.env` por desenho — o próprio `backend/.env.example:5-9`
avisa que editar ali não tem efeito. O `.env` da raiz do main tree declara `LOTUS_DEV_VITE_PORT=5174`
com `LOTUS_DEV_HTTP_PORT=8080`, e é exatamente isso que o runtime resolveu
(`['localhost:5174', 'localhost:8080']`). O Vite desta árvore sobe em `:5174` com `strictPort`. A
sonda com `Referer: http://localhost:5173/` saiu de uma porta onde nada desta árvore roda, e o 401
era o comportamento correto para origem não-stateful.

O mecanismo que o gatilho pedia — provar a chave seguindo o ambiente — já existe, no lado que a
produz: `frontend/tests/compose-dev.test.ts` ("injeta no app toda chave de URL que carrega porta,
derivada da mesma variável"). Nenhum código, nenhum teste novo. **Fecha por veredito** no
fechamento do item 29. O offset misto do `.env` local (Vite em +1, HTTP em +0) é arquivo
gitignorado e escolha do João: é a causa da medição, não um defeito do repositório.
```

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/pendencias/abertas.md
git commit -m "docs(pendencias): veredito da P-75 e o item 29 hospeda P-59, P-75 e P-79

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 11: Gate e prova no artefato

**Files:**
- Create: `docs/superpowers/audits/2026-09-24-item29-medicoes.md`

Cada step cola a saída real no audit, em seções numeradas na ordem abaixo. Nenhum resultado é resumido de memória.

- [ ] **Step 1: Suíte inteira**

Run: `docker compose exec -T app php artisan test`
Expected: tudo verde. Anote `passed / skipped` e compare com a `main` (1192 passed / 5 skipped no último fechamento de backend). A diferença tem de bater com os testes novos das Tasks 1-8 — reconcilie task a task no audit.

- [ ] **Step 2: Contrato intacto**

Run: `docker compose exec -T app php artisan typescript:transform && git diff --stat -- frontend/src/shared/api/generated.ts`
Expected: diff vazio. (Se o path do `generated.ts` for outro, ache-o com `git ls-files | grep generated.ts`.)

- [ ] **Step 3: Pint no que o bloco tocou**

Run: `cd backend && ./vendor/bin/pint --test $(git diff --name-only main...HEAD -- . | grep '\.php$' | grep -v '^backend/lang/' | sed 's#^backend/##')`
Expected: `PASS`. (Os paths do `git diff` saem relativos à raiz do repositório, com prefixo `backend/` — por isso o filtro de `lang/` casa o prefixo inteiro, e o `sed` só depois os torna relativos à pasta de onde o Pint roda. `lang/` fica fora pela rule `backend-lang.md`.)

- [ ] **Step 4: As provas de reprovação**

Cole no audit as saídas registradas: os dois FAIL da Task 2, o FAIL da Task 3, a sonda da catraca (Task 5 Step 3), a sonda do UTC (Task 6 Step 4) e os FAIL da Task 8 Step 3.

- [ ] **Step 5: E2E — QR decodificado de um certificado real, com a chave**

Este step depende de uma ação do João, porque o harness nega escrita em `.env`:

1. **Peça ao João** que acrescente ao `backend/.env` a linha `CERTIFICATE_VALIDATION_URL=https://valida.lotus.example` (o compose não sobrescreve essa chave, então o `.env` vale). Espere a confirmação.
2. Autentique como admin contra `http://localhost:8080` (`GET /sanctum/csrf-cookie`, depois `POST /api/login` com `Referer: http://localhost:8080/`; a credencial do admin de dev está no `database/seeders` — `grep -rn "admin@" backend/database/seeders`).
3. `GET /api/certificates/emission-panel` e escolha uma matrícula emitível; `POST /api/enrollments/{id}/certificate` com o `redator_id` da turma → 201. Anote `id`, `codigo` e `uuid`.
4. `GET /api/certificates/{id}/pdf` → salve em `/tmp/item29-com-chave.pdf`.
5. Rasterize e decodifique:

```bash
pdftoppm -png -r 300 -f 1 -l 1 /tmp/item29-com-chave.pdf /tmp/item29-com-chave
python3 -m venv /tmp/item29-qr && /tmp/item29-qr/bin/pip install --quiet zxing-cpp pillow
/tmp/item29-qr/bin/python -c "import sys, zxingcpp; from PIL import Image; print([r.text for r in zxingcpp.read_barcodes(Image.open(sys.argv[1]))])" /tmp/item29-com-chave-1.png
```

Expected: `['https://valida.lotus.example/validar/<uuid>']`, com o `uuid` do passo 3. Se o `pip install` falhar por falta de rede, **STOP** e reporte ao João — não troque a decodificação por leitura de código ou de HTML.

- [ ] **Step 6: E2E — o fallback no mesmo certificado**

1. **Peça ao João** que remova a linha `CERTIFICATE_VALIDATION_URL` do `backend/.env`. Espere a confirmação.
2. `GET /api/certificates/{id}/pdf` do mesmo certificado → `/tmp/item29-sem-chave.pdf`, rasterize e decodifique como acima.

Expected: `['http://localhost:<LOTUS_DEV_VITE_PORT>/validar/<uuid>']` — o `FRONTEND_URL` que o compose deriva do offset da árvore (no main tree de hoje, `5174`). É o fallback exercido no artefato real, e mostra também por que o QR precisava de dono próprio: o mesmo certificado, baixado duas vezes, carregou dois endereços.

- [ ] **Step 7: Devolver o banco de dev**

Revogue o certificado de prova pela API (`POST /api/certificates/{id}/revoke`; o nome do campo do motivo está no DTO de revogação — `grep -rn "reason" backend/app/Domains/Certification/Data`), com motivo `prova do item 29`. Revogação e não delete: o registro de peso legal fica com trilha de auditoria. Anote no audit.

- [ ] **Step 8: Commit do audit**

```bash
git add docs/superpowers/audits/2026-09-24-item29-medicoes.md
git commit -m "docs(audit): medicoes do item 29 e o QR decodificado nos dois sentidos

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

## DoD (da spec §5, com a task que prova cada item)

| # | Critério | Prova |
|---|---|---|
| 1 | Emissão às 23h de Santiago grava o dia local; em 31/12 às 22h, `LOT-<ano local>`; os dois vistos reprovar antes | Task 2, Steps 1-2 e 4 |
| 2 | `config('app.timezone') === 'UTC'` com `APP_TIMEZONE=America/Santiago` no ambiente | Task 6 |
| 3 | Documento que vence hoje segue valendo às 22h de Santiago | Task 3 |
| 4 | Catraca verde e vista reprovar por sonda com `cp` | Task 5, Steps 2-3 |
| 5 | QR com a chave; fallback em `local`; em `production` sem chave e com `http://`, PDF e emissão dão 500 nomeado e nenhum certificado nasce | Tasks 7 e 8 |
| 6 | Certificado real carrega no QR a URL da chave, decodificada do PDF | Task 11, Steps 5-6 |
| 7 | `generated.ts` sem diff, Pint `PASS`, `LocaleParityTest` e `MensagemLiteralTest` verdes, suíte verde | Task 7 Step 7; Task 11, Steps 1-3 |
| 8 | P-59 e P-79 fecham por mecanismo, P-75 por veredito escrito | Task 10 + `/fechar-sprint` |

## Handoff de execução

```yaml
executor: claude
```

**Por que `claude` e não `codex`:** o bloco toca conteúdo de documento de peso legal (`CLAUDE.md` §1) — a data e o ano congelados no snapshot e o endereço do QR —, tem três pontos de STOP que exigem julgamento fora do plano (sítio novo achado pela catraca na Task 5, sonda vácua na Task 6, construção manual de classe na Task 8) e um e2e que depende de duas ações do João no `backend/.env`. Não são tasks mecânicas de paths fechados.
