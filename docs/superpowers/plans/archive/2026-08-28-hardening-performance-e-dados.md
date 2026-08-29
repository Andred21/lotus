# Hardening de performance e dados — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** paginar no servidor as três listas que crescem sem teto (`students`, `certificates`, `turmas` ativo e arquivado) com busca, filtro e ordenação em SQL provados por paridade; dar janela por data ao painel de emissão; ligar `preventLazyLoading` globalmente com uma catraca de contagem de queries por rota; medir índices com `EXPLAIN` sobre um cenário de 5k/6k linhas; e dar dono único aos "30 dias" da D-15.

**Architecture:** um contrato de página próprio em `App\Shared\Pagination` (`PageRequest` de entrada, `PageData`/`PageMetaData` de saída e o trait `Paginates` que os `QueryBuilders` custom já existentes ganham) — o controller continua fino e quem sabe buscar, filtrar e ordenar é o builder do agregado, com allowlist de `sort` e paridade por teste entre a classificação de domínio (`CertificateDisplayStatus::for()`, `TurmaHabilitacaoService`) e o SQL do filtro. No frontend, um kit lazy em `shared/` (`pageEndpoint`, `useServerTable`, `SearchableTableFrame`/`AppDataTable` com `totalRecords`) que devolve a MESMA forma que o `useTableFilter`, para as três telas trocarem de fonte sem trocar de moldura. Medição antes de índice: seeder de cenário dev-only, `EXPLAIN` antes/depois no MySQL, e só o índice aprovado entra na migration.

**Tech Stack:** Laravel 13 / PHP 8.3 no container `app`, spatie/laravel-data + typescript-transformer, MySQL 8 (dev) e sqlite `:memory:` (suíte), React 19 + TanStack Query v5 (`keepPreviousData`), PrimeReact `DataTable` em modo `lazy`, Vitest + Testing Library.

## Global Constraints

- **Definition of done = critério de aceite PROVADO** (`CLAUDE.md` §5.8, lição 1). Build verde isolado não fecha task.
- **`docker compose exec -T app php artisan …`** é como o backend roda; o host WSL não tem `mbstring`. Pint é a exceção: `cd backend && ./vendor/bin/pint <arquivos>`, **nunca sem argumento** (lição 9).
- **Toda catraca precisa ser vista reprovando** contra o código sem a proteção (lição 10). Para provar, copie o arquivo para o scratchpad e restaure; **nunca `git stash pop` sem guarda** — a pilha tem stashes alheios.
- **Task que roda `typescript:transform` ajusta os consumidores NO MESMO commit** (lição 11, `.claude/rules/generated-types.md`). `generated.ts` nunca se edita à mão.
- **Migration é provada contra o MySQL real** (lição 15), não só contra o sqlite da suíte. Índice só entra com `EXPLAIN` antes/depois (spec D10).
- **Arquivo com catraca própria não recebe entregável sem asserção no mesmo commit** (lição 19).
- **Nenhum número de política solto:** `PageRequest::PER_PAGE_DEFAULT = 25`, `PageRequest::PER_PAGE_MAX = 100`, `PageRequest::Q_MAX = 100`, `JanelaDeAviso::DIAS = 30`, `EmissionPanelQuery::JANELA_MESES = 12` — cada um num lugar só (spec D3, D7, D13).
- **Erro sobe ao handler global RFC 7807** (`CLAUDE.md` §5.4): `ValidationException::withMessages`, nunca `abort(422)`. Acima do teto é **422, não clamp** (spec D3).
- **Features não importam PrimeReact nem outra feature** (`CLAUDE.md` §5.6); `shared/lib` não importa `shared/api` nem `@tanstack`; `shared/ui` não importa `shared/hooks` (`frontend-fsliced.md`).
- **`DomainDependencyTest`:** `App\Shared` não é aresta; nenhuma task abre linha na matriz. Se um `use` cruzar domínio, a task PARA e declara.
- **Sem cache, sem Redis** (spec D12). **`SignedUrlTransformer` fica como está** (spec D15).
- Idioma: código e commits em português, no formato dos anteriores (`feat:`, `fix:`, `test:`, `refactor:`, `chore:`, `docs:`). Rótulo novo de UI entra nos **três** locales (`en`, `es-CL`, `pt-BR`), `es-CL` como referência.

---

## Desvios declarados em relação à spec

Dez, todos de implementação; nenhum muda o comportamento prometido no §7 da spec. Estão aqui e não escondidos numa task:

1. **`ListSource<T>`/`archivableSource` NÃO ganham `totalRecords?`** (spec §4.5, último item). A tela de Turmas usa UM `useServerTable` que troca a função de fetch conforme o modo (ativo/arquivado) e achata `ArchivedTurmaData` no próprio fetch — a moldura recebe uma fonte só. `archivableSource` continua intacto para as cinco raízes que não paginam; alargá-lo seria API para consumidor que não existe (YAGNI).
2. **O fallback do D14 nasce como hook próprio, `useCrudDialog(items, useOne?)`**, extraído de `useCrudPage` (que passa a compô-lo). Motivo: `useStudentsPage` deixa de usar `useCrudPage` (a lista vem do `useServerTable`), mas continua precisando do dialog por id. `studentsApi.useOne` compartilha chave e endpoint com `useStudentDetail`, então **`StudentDetailData` ganha `photo_url`** para ser superconjunto estrutural de `StudentData` — é o que deixa a resposta do `show` alimentar o dialog da lista sem cast.
3. **`Model::preventLazyLoading()` fica ligado SEMPRE**, e é `Model::handleLazyLoadingViolationUsing` que decide: em produção registra `warning` no log e segue; fora dela lança. A forma da spec (`preventLazyLoading(! isProduction())`) não gera `warning` nenhum em produção — desligada, a guarda não vê violação. O comportamento prometido (D8) é o mesmo; o mecanismo é o que o alcança.
4. **O "12 meses" do painel de emissão existe nos dois lados**: `EmissionPanelQuery::JANELA_MESES` (dono, decide o default do servidor) e `EMISSION_PANEL_WINDOW_MONTHS` em `features/certification/lib/emissionWindow.ts` (preenche o `AppDatePicker` com o mesmo default antes de o primeiro GET voltar). O docblock dos dois aponta um para o outro.
5. **A busca de turmas não varre `quotes.code`**: não existe coluna — `Quote::getCodeAttribute()` monta `"Scap {budget_id} - Cot {seq_in_budget}"` em PHP. `budgets.code` (`'Scap '.id`) cobre a metade que identifica; `courses.name` e o `users.name` do contratante seguem como a spec pede.
6. **`useHistorial.loadError` passa a seguir `loadFailure`** (`{}` quando o interceptor não populou o corpo) em vez de `null`. A rule `frontend-fsliced.md` registra o Historial como exceção deliberada; a exceção acaba aqui porque o `useServerTable` é a home única da política e o Historial passa a consumi-lo. `useEmissionPanelState` continua exceção. A rule é atualizada na Task 13.
7. **`PageRequestTest` é unitário** (`page`, `per_page`, `q`, coerção); a allowlist de `sort` é do builder, então "sort fora da allowlist aceito" é provado por HTTP em `StudentPaginationTest` (422 `application/problem+json`).
8. **`App\Shared\Support\DataSql::literal()`** existe para o CASE de `display_status` e a janela do painel compararem `DATE` do MySQL e o texto `Y-m-d 00:00:00` que o cast `date` grava no sqlite da suíte. Sem ele, ou a paridade mente no sqlite ou o `EXPLAIN` perde o índice no MySQL (`DATE(coluna)`).
9. **`students` não tem filtro nomeado**, então o controller injeta `PageRequest` direto — não nasce `StudentPageRequest` vazio.
10. **`meta.summary` de certificados é calculado por um closure `meta` do `Paginates::page()`**, que recebe o escopo de `q` ANTES do filtro de status — exatamente o que a spec §4.2 pede, sem o trait conhecer certificado.

---

## Estrutura de arquivos

**Criar (backend):**

| Arquivo | Responsabilidade |
|---|---|
| `backend/app/Shared/Support/JanelaDeAviso.php` | dono único dos 30 dias (D13) |
| `backend/app/Shared/Support/DataSql.php` | literal de data comparável por driver (desvio 8) |
| `backend/app/Shared/Pagination/PageRequest.php` | entrada: `page`, `per_page`, `q`, `sort` + regras |
| `backend/app/Shared/Pagination/PageMetaData.php` | saída: `page`, `per_page`, `total`, `last_page`, `total_unfiltered` |
| `backend/app/Shared/Pagination/PageData.php` | envelope `{ data, meta }` |
| `backend/app/Shared/Pagination/Paginates.php` | trait do builder: `page()`, `slice()`, allowlist de `sort` |
| `backend/app/Domains/Identity/QueryBuilders/StudentQueryBuilder.php` | primeiro builder de `Student`: join em `users`, busca, ordenação |
| `backend/app/Domains/Certification/Data/CertificatePageRequest.php` | `PageRequest` + `display_status` |
| `backend/app/Domains/Certification/Data/CertificateSummaryData.php` | contagem por `display_status` |
| `backend/app/Domains/Certification/Data/CertificatePageMetaData.php` | `PageMetaData` + `summary` |
| `backend/app/Domains/Certification/Data/EmissionPanelRequest.php` | `concluidas_desde` com default de 12 meses |
| `backend/app/Domains/Operation/Enums/TurmaDisplayStatus.php` | os três estados de exibição da turma, agora do backend |
| `backend/app/Domains/Operation/Data/TurmaPageRequest.php` | `PageRequest` + `status` |
| `backend/database/seeders/PerformanceScenarioSeeder.php` | cenário de medição dev-only (D11) |
| `backend/database/migrations/2026_08_28_000001_add_performance_indexes.php` | só os índices aprovados pelo `EXPLAIN` (D10) |
| `docs/superpowers/audits/2026-08-28-hardening-performance-e-dados-medicoes.md` | `EXPLAIN`, latências, contagens, DoD no navegador |

**Criar (frontend):**

| Arquivo | Responsabilidade |
|---|---|
| `frontend/src/shared/api/page.ts` | `Page<T,M>`, `PageMeta`, `PageQuery`, `pageEndpoint()` — o único lugar que conhece o envelope |
| `frontend/src/shared/hooks/useServerTable.ts` | estado de busca (debounce), página, sort e filtros sobre `useQuery` |
| `frontend/src/shared/hooks/useCrudDialog.ts` | dialog por id com fallback `useOne` (D14) |
| `frontend/src/shared/hooks/useRestoreAction.ts` | restore com os dois toasts, extraído de `useArchivedPage` |
| `frontend/src/features/certification/lib/emissionWindow.ts` | default do `AppDatePicker` (desvio 4) |

**Modificar:** `DocumentValidityStatus`, `DashboardWindows`, `CertificateDisplayStatus` (Task 1); `Student`, `StudentController`, `StudentData`, `StudentDetailData` (Task 4); `CertificateQueryBuilder`, `CertificateController`, `CertificateData` (Task 6); `TurmaQueryBuilder`, `TurmaController` (Task 8); `EmissionPanelQuery`, `CertificateController::emissionPanel` (Task 10); `AppServiceProvider` e cinco testes que ligavam `preventLazyLoading` à mão (Task 11); `IdentityMetricsQuery`/`RedatorScopeQuery` só se o `EXPLAIN` mandar (Task 12); `SearchableTableFrame`, `AppDataTable`, `useCrudPage`, `useArchivedPage`, `shared/hooks/index.ts` (Task 3); `studentsApi`, `useStudentsPage`, `StudentsTable`, `StudentsTab`, `PeoplePage.test.tsx` (Task 5); `certificatesApi`, `useHistorial`, `HistorialTable` e testes (Task 7); `useTurmas`, `useTurmasPage`, `useTurmasArchived`, `TurmasTable`, `OperationPage`, `turmaStatus.ts`, `TurmaStatusFilter` (Task 9); `useEmissionPanelState`, `EmissionPanel` e os três locales (Task 10); `docs/estrutura-monolito.md`, `docs/der-fisico.md`, `docs/adrs.md`, `.claude/rules/frontend-fsliced.md`, `.claude/rules/backend-ddd.md`, `pendencias/` (Task 12–13).

**Testes:** `tests/Unit/Shared/JanelaDeAvisoTest.php`, `tests/Unit/Shared/PageRequestTest.php`, `tests/Feature/Identity/StudentPaginationTest.php`, `tests/Feature/Certification/CertificateDisplayStatusParityTest.php`, `tests/Feature/Certification/CertificatePaginationTest.php`, `tests/Feature/Operation/TurmaStatusParityTest.php`, `tests/Feature/Operation/TurmaPaginationTest.php`, `tests/Feature/Certification/EmissionPanelWindowTest.php`, `tests/Feature/Shared/ListQueryBudgetTest.php`; no frontend `useServerTable.test.tsx`, `useCrudDialog.test.ts`, `useRestoreAction.test.ts`, mais asserções novas em `AppDataTable.test.tsx`, `SearchableTableFrame.test.tsx`, `certificatesApi.test.tsx`, `HistorialTable.test.tsx`, `EmissionPanel.test.tsx`, `PeoplePage.test.tsx` e a reescrita de `useTurmasPage.test.tsx`.

---

## Task 1: `JanelaDeAviso` — dono único dos 30 dias (D13)

**Files:**
- Create: `backend/app/Shared/Support/JanelaDeAviso.php`
- Modify: `backend/app/Domains/Identity/Enums/DocumentValidityStatus.php:25-31,51`
- Modify: `backend/app/Domains/Dashboard/Services/DashboardWindows.php:14-26`
- Modify: `backend/app/Domains/Certification/Enums/CertificateDisplayStatus.php:30-31,85`
- Modify: `backend/tests/Unit/Identity/DocumentValidityStatusTest.php:44,51`
- Test: `backend/tests/Unit/Shared/JanelaDeAvisoTest.php`

**Interfaces:**
- Produces: `App\Shared\Support\JanelaDeAviso::DIAS` (`int`, 30). As Tasks 6 e 12 leem esta constante.

- [ ] **Step 1: Escrever o teste que reprova**

```php
<?php

namespace Tests\Unit\Shared;

use App\Domains\Certification\Enums\CertificateDisplayStatus;
use App\Domains\Dashboard\Services\DashboardWindows;
use App\Domains\Identity\Enums\DocumentValidityStatus;
use App\Shared\Support\JanelaDeAviso;
use ReflectionClass;
use Tests\TestCase;

/**
 * D-15: eram TRÊS trintas, não dois — Identity, Dashboard e Certification cada
 * um com o seu. Um só dono, em Shared, porque Shared é o único lugar que não
 * abre aresta na matriz do `DomainDependencyTest` (spec D13).
 */
class JanelaDeAvisoTest extends TestCase
{
    /** @var array<class-string, string> classe => nome da constante que ela tinha */
    private const SITIOS_ANTIGOS = [
        DocumentValidityStatus::class => 'DIAS_AVISO',
        DashboardWindows::class => 'EXPIRY_WINDOW_DAYS',
        CertificateDisplayStatus::class => 'POR_VENCER_DIAS',
    ];

    public function test_a_janela_e_de_trinta_dias(): void
    {
        $this->assertSame(30, JanelaDeAviso::DIAS);
    }

    public function test_nenhum_dos_tres_sitios_antigos_tem_constante_propria(): void
    {
        foreach (self::SITIOS_ANTIGOS as $classe => $constante) {
            $reflexao = new ReflectionClass($classe);

            $this->assertFalse(
                $reflexao->hasConstant($constante),
                "{$classe}::{$constante} ainda existe — o dono dos 30 dias é JanelaDeAviso::DIAS.",
            );
            $this->assertStringContainsString(
                'JanelaDeAviso::DIAS',
                (string) file_get_contents((string) $reflexao->getFileName()),
                "{$classe} não lê JanelaDeAviso::DIAS.",
            );
        }
    }
}
```

- [ ] **Step 2: Rodar e ver reprovar**

Run: `docker compose exec -T app php artisan test --filter=JanelaDeAvisoTest`
Expected: FAIL — `Class "App\Shared\Support\JanelaDeAviso" not found`.

- [ ] **Step 3: Criar a classe**

```php
<?php

namespace App\Shared\Support;

/**
 * Dono único da janela de aviso de vencimento (D-15, spec D13 do bloco
 * `hardening-performance-e-dados`).
 *
 * Três domínios avisam "vence em breve" — documento de redator (Identity),
 * alertas do Dashboard (documento E certificado) e estado de exibição do
 * certificado (Certification) — e cada um carregava o próprio `30`. Os três
 * tinham o mesmo valor por coincidência de escrita, não por mecanismo; um deles
 * mudar sozinho faria o Dashboard alertar sobre um certificado que a listagem
 * ainda chama de vigente.
 *
 * Mora em Shared porque é o único lugar que não abre aresta na matriz do
 * `DomainDependencyTest`. Se certificado e documento um dia precisarem de
 * janelas diferentes, a separação nasce AQUI, com duas constantes nomeadas e a
 * regra escrita — não voltando a três literais.
 */
final class JanelaDeAviso
{
    /** Dias antes do vencimento a partir dos quais se avisa. */
    public const DIAS = 30;
}
```

- [ ] **Step 4: Apontar os três sítios para a constante**

`DocumentValidityStatus.php` — remova o bloco `DIAS_AVISO` (linhas 25–31) e troque a linha 51:

```php
use App\Shared\Support\JanelaDeAviso;
// ...
        return $validUntil->lessThanOrEqualTo($hoje->addDays(JanelaDeAviso::DIAS))
            ? self::VenceEmBreve
            : self::Vigente;
```

`DashboardWindows.php` — remova `EXPIRY_WINDOW_DAYS` e:

```php
use App\Shared\Support\JanelaDeAviso;

/**
 * Janelas de tempo fixas do dashboard (spec §4.2). `turmaHorizon()` delimita
 * "encerrando em breve"/"vencendo em breve" de turma; `expiryHorizon()` faz o
 * mesmo para validade de certificado e documento de redator, e os 30 dias dele
 * são os de `JanelaDeAviso::DIAS` (D-15) — o mesmo número que a listagem de
 * certificados e o status do documento de redator usam.
 */
final class DashboardWindows
{
    public const TURMA_WINDOW_DAYS = 7;

    public static function turmaHorizon(): CarbonImmutable
    {
        return CarbonImmutable::now()->addDays(self::TURMA_WINDOW_DAYS)->endOfDay();
    }

    public static function expiryHorizon(): CarbonImmutable
    {
        return CarbonImmutable::now()->addDays(JanelaDeAviso::DIAS)->endOfDay();
    }
}
```

`CertificateDisplayStatus.php` — remova `POR_VENCER_DIAS` (linhas 30–31), acrescente `use App\Shared\Support\JanelaDeAviso;` e troque a linha 85 por `$daysRemaining <= JanelaDeAviso::DIAS`. No docblock da regra 4, troque "faltando de 1 a 30 dias" por "faltando de 1 a `JanelaDeAviso::DIAS` dias".

`tests/Unit/Identity/DocumentValidityStatusTest.php` — linhas 44 e 51: `DocumentValidityStatus::DIAS_AVISO` vira `JanelaDeAviso::DIAS` (com o `use App\Shared\Support\JanelaDeAviso;`).

- [ ] **Step 5: Provar que nenhum `= 30` sobrou e rodar os afetados**

Run: `grep -rn "= 30;" backend/app/Domains/Identity/Enums/DocumentValidityStatus.php backend/app/Domains/Dashboard/Services/DashboardWindows.php backend/app/Domains/Certification/Enums/CertificateDisplayStatus.php`
Expected: nenhuma linha (DoD 8 da spec).

Run: `docker compose exec -T app php artisan test --filter='JanelaDeAvisoTest|DocumentValidityStatusTest|CertificateDisplayStatusTest|DashboardEndpointTest|DomainDependencyTest'`
Expected: PASS em todos.

- [ ] **Step 6: Pint e commit**

```bash
cd backend && ./vendor/bin/pint app/Shared/Support/JanelaDeAviso.php app/Domains/Identity/Enums/DocumentValidityStatus.php app/Domains/Dashboard/Services/DashboardWindows.php app/Domains/Certification/Enums/CertificateDisplayStatus.php tests/Unit/Shared/JanelaDeAvisoTest.php tests/Unit/Identity/DocumentValidityStatusTest.php && cd ..
git add backend/app/Shared/Support/JanelaDeAviso.php backend/app/Domains/Identity/Enums/DocumentValidityStatus.php backend/app/Domains/Dashboard/Services/DashboardWindows.php backend/app/Domains/Certification/Enums/CertificateDisplayStatus.php backend/tests/Unit/Shared/JanelaDeAvisoTest.php backend/tests/Unit/Identity/DocumentValidityStatusTest.php
git commit -m "refactor(shared): JanelaDeAviso e o dono unico dos 30 dias de aviso (D-15)"
```

---

## Task 2: Contrato de página em `App\Shared\Pagination` (D2, D3, D5)

**Files:**
- Create: `backend/app/Shared/Pagination/PageRequest.php`
- Create: `backend/app/Shared/Pagination/PageMetaData.php`
- Create: `backend/app/Shared/Pagination/PageData.php`
- Create: `backend/app/Shared/Pagination/Paginates.php`
- Test: `backend/tests/Unit/Shared/PageRequestTest.php`
- Regenera: `frontend/src/shared/types/generated.ts` (`PageMetaData`, `PageData`)

**Interfaces:**
- Produces: `PageRequest { int $page = 1; int $per_page = 25; ?string $q; ?string $sort }` com `PER_PAGE_DEFAULT`, `PER_PAGE_MAX`, `Q_MAX`; `PageMetaData(page, per_page, total, last_page, total_unfiltered)`; `PageData(array $data, PageMetaData $meta)`; trait `Paginates` exigindo `const SORTABLE`, `const DEFAULT_SORT`, `searchable(string $q): static` e oferecendo `page(PageRequest $r, Closure $present, ?Closure $filter = null, ?Closure $meta = null): PageData` e `slice(PageRequest $r, ?Closure $filter = null, ?Closure $meta = null): array{0: Collection, 1: PageMetaData}`. `$filter(static $q): void` roda DEPOIS de `searchable`; `$meta(PageMetaData $base, static $escopoDeQ): PageMetaData` recebe um clone do escopo de `q` ANTES do filtro.

- [ ] **Step 1: Teste unitário do request**

```php
<?php

namespace Tests\Unit\Shared;

use App\Shared\Pagination\PageRequest;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

/**
 * Catraca do contrato de entrada (spec D3): teto de `per_page` recusa em vez
 * de clampar, `page` começa em 1 e `q` tem tamanho. A allowlist de `sort` é do
 * builder e é provada por HTTP em `StudentPaginationTest`.
 */
class PageRequestTest extends TestCase
{
    public function test_defaults_sao_pagina_um_e_vinte_e_cinco_por_pagina(): void
    {
        $request = PageRequest::validateAndCreate([]);

        $this->assertSame(1, $request->page);
        $this->assertSame(25, $request->per_page);
        $this->assertNull($request->q);
        $this->assertNull($request->sort);
    }

    public function test_query_string_e_coagida_para_inteiro(): void
    {
        $request = PageRequest::validateAndCreate(['page' => '3', 'per_page' => '10', 'q' => 'ana', 'sort' => '-name']);

        $this->assertSame(3, $request->page);
        $this->assertSame(10, $request->per_page);
        $this->assertSame('ana', $request->q);
        $this->assertSame('-name', $request->sort);
    }

    /** @return array<string, array{0: array<string, mixed>}> */
    public static function entradasRecusadas(): array
    {
        return [
            'per_page acima do teto' => [['per_page' => PageRequest::PER_PAGE_MAX + 1]],
            'per_page zero' => [['per_page' => 0]],
            'page zero' => [['page' => 0]],
            'page negativa' => [['page' => -1]],
            'page não numérica' => [['page' => 'abc']],
            'q acima do tamanho' => [['q' => str_repeat('a', PageRequest::Q_MAX + 1)]],
        ];
    }

    /**
     * @dataProvider entradasRecusadas
     *
     * @param  array<string, mixed>  $entrada
     */
    public function test_entrada_fora_do_contrato_e_recusada_por_validacao(array $entrada): void
    {
        $this->expectException(ValidationException::class);

        PageRequest::validateAndCreate($entrada);
    }

    public function test_per_page_no_teto_e_aceito(): void
    {
        $this->assertSame(PageRequest::PER_PAGE_MAX, PageRequest::validateAndCreate(['per_page' => PageRequest::PER_PAGE_MAX])->per_page);
    }
}
```

- [ ] **Step 2: Rodar e ver reprovar**

Run: `docker compose exec -T app php artisan test --filter=PageRequestTest`
Expected: FAIL — classe não encontrada.

- [ ] **Step 3: Escrever `PageRequest`**

```php
<?php

namespace App\Shared\Pagination;

use Spatie\LaravelData\Data;

/**
 * Entrada de toda lista paginada (spec §4.1). Injetado direto no controller
 * (`index(PageRequest $request)`): o laravel-data lê a query string, valida por
 * `rules()` e coage `"10"` para `int` — provado em `PageRequestTest`.
 *
 * Acima do teto é 422, não clamp (spec D3): recusar é o padrão do projeto
 * (RFC 7807, nunca silêncio). O teto existe para a API não voltar a devolver
 * tudo por um parâmetro.
 *
 * A allowlist de `sort` NÃO mora aqui: é de cada lista (`Paginates::SORTABLE`
 * no builder). Os requests com filtro nomeado ESTENDEM esta classe e chamam
 * `parent::rules()` — `CertificatePageRequest`, `TurmaPageRequest`.
 */
class PageRequest extends Data
{
    public const PER_PAGE_DEFAULT = 25;

    public const PER_PAGE_MAX = 100;

    public const Q_MAX = 100;

    public function __construct(
        public int $page = 1,
        public int $per_page = self::PER_PAGE_DEFAULT,
        public ?string $q = null,
        public ?string $sort = null,
    ) {}

    /** @return array<string, array<int, string>> */
    public static function rules(): array
    {
        return [
            'page' => ['sometimes', 'integer', 'min:1'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:'.self::PER_PAGE_MAX],
            'q' => ['sometimes', 'nullable', 'string', 'max:'.self::Q_MAX],
            'sort' => ['sometimes', 'nullable', 'string', 'max:64'],
        ];
    }
}
```

- [ ] **Step 4: Escrever `PageMetaData` e `PageData`**

```php
<?php

namespace App\Shared\Pagination;

use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * O `meta` do envelope (spec D2): pequeno, sem `links/path/from/to` que
 * ninguém lê. `total_unfiltered` (D5) é a contagem do MESMO escopo
 * (`visibleTo`) sem `q` nem filtro — o front mede o EFEITO do filtro por
 * `total !== total_unfiltered`, como o `useTableFilter` sempre mediu.
 */
#[TypeScript]
class PageMetaData extends Data
{
    public function __construct(
        public int $page,
        public int $per_page,
        public int $total,
        public int $last_page,
        public int $total_unfiltered,
    ) {}
}
```

```php
<?php

namespace App\Shared\Pagination;

use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * Envelope `{ data, meta }` de toda lista paginada (spec D2).
 *
 * `data` é `array` cru de propósito: o transformer não emite genérico, então o
 * item é tipado no front por `Page<T>` (`shared/api/page.ts`), que casa `data`
 * com o tipo gerado do item e `meta` com `PageMetaData`. Este DTO nunca é
 * importado pelo front — só o `meta` é. Cada item é um `Data` do agregado
 * (`StudentData`, ...), transformado na resposta como qualquer nested.
 */
#[TypeScript]
class PageData extends Data
{
    /** @param  list<Data>  $data */
    public function __construct(
        /** @var list<mixed> */
        public array $data,
        public PageMetaData $meta,
    ) {}
}
```

- [ ] **Step 5: Escrever o trait `Paginates`**

```php
<?php

namespace App\Shared\Pagination;

use Closure;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;

/**
 * A paginação como método do QueryBuilder custom do agregado (ADR-02: builder,
 * não Repository). O controller continua fino — `Student::query()->...->page()`
 * — e quem sabe buscar, filtrar e ordenar é o builder, que é onde `LISTING` e
 * `visibleTo()` já moram.
 *
 * O builder que usa o trait declara:
 *
 *   public const SORTABLE = ['campo' => 'tabela.coluna', ...];   // allowlist
 *   public const DEFAULT_SORT = '-created_at';                     // `campo` ou `-campo`
 *   public function searchable(string $q): static;                 // o que `q` varre
 *
 * Ordem das medições em `slice()`, que É o contrato (spec §4.1 e §4.2):
 *
 *   1. `sort` é resolvido ANTES de qualquer consulta — fora da allowlist é 422
 *      sem gastar um `count()`;
 *   2. `total_unfiltered` = escopo como chegou (depois de `visibleTo`, antes de
 *      `q` e do filtro);
 *   3. `searchable(q)`;
 *   4. o closure `$meta`, quando existe, recebe um CLONE deste ponto — o escopo
 *      de `q` sem o filtro nomeado (é sobre ele que o Historial soma o resumo);
 *   5. `$filter`;
 *   6. `total`, ordenação com desempate pela chave e `forPage()`.
 *
 * O desempate pela chave primária não é decoração: duas linhas com o mesmo
 * `created_at` sairiam em ordem indefinida do banco e podiam trocar de página
 * entre dois requests — mesma razão do `orderByDesc('id')` do painel de emissão.
 */
trait Paginates
{
    abstract public function searchable(string $q): static;

    /**
     * @param  Closure(Model): mixed  $present  projeta cada linha (o `fromModel` do agregado)
     * @param  Closure(static): void|null  $filter  filtro nomeado, aplicado DEPOIS de `q`
     * @param  Closure(PageMetaData, static): PageMetaData|null  $meta  estende o `meta` a partir do escopo de `q`
     */
    public function page(PageRequest $request, Closure $present, ?Closure $filter = null, ?Closure $meta = null): PageData
    {
        [$items, $metaData] = $this->slice($request, $filter, $meta);

        return new PageData(
            data: $items->map($present)->values()->all(),
            meta: $metaData,
        );
    }

    /**
     * A fatia crua: os models da página e o `meta`. Existe para quem precisa
     * da COLEÇÃO antes de projetar — a lista de arquivados resolve "arquivado
     * por" num lote só (`ArchiveTrailQuery::archivedBy`) sobre os ids da página.
     *
     * @param  Closure(static): void|null  $filter
     * @param  Closure(PageMetaData, static): PageMetaData|null  $meta
     * @return array{0: Collection<int, Model>, 1: PageMetaData}
     */
    public function slice(PageRequest $request, ?Closure $filter = null, ?Closure $meta = null): array
    {
        [$coluna, $direcao] = $this->resolveSort($request->sort);

        $totalUnfiltered = (clone $this)->count();

        $q = trim((string) $request->q);
        if ($q !== '') {
            $this->searchable($q);
        }

        $escopoDeQ = $meta === null ? null : clone $this;

        if ($filter !== null) {
            $filter($this);
        }

        $total = (clone $this)->count();

        $items = $this
            ->orderBy($coluna, $direcao)
            ->orderBy($this->getModel()->getQualifiedKeyName(), $direcao)
            ->forPage($request->page, $request->per_page)
            ->get();

        $base = new PageMetaData(
            page: $request->page,
            per_page: $request->per_page,
            total: $total,
            last_page: max(1, (int) ceil($total / $request->per_page)),
            total_unfiltered: $totalUnfiltered,
        );

        return [$items, $meta === null ? $base : $meta($base, $escopoDeQ)];
    }

    /**
     * `campo` ou `-campo`, só da allowlist. Fora dela é `ValidationException`,
     * que o handler global traduz em 422 `application/problem+json` — nunca
     * `abort(422)` (CLAUDE.md §5.4).
     *
     * @return array{0: string, 1: 'asc'|'desc'}
     */
    private function resolveSort(?string $sort): array
    {
        $sort = ($sort === null || $sort === '') ? static::DEFAULT_SORT : $sort;
        $desc = str_starts_with($sort, '-');
        $campo = $desc ? substr($sort, 1) : $sort;

        if (! array_key_exists($campo, static::SORTABLE)) {
            throw ValidationException::withMessages([
                'sort' => __('validation.in', ['attribute' => 'sort']),
            ]);
        }

        return [static::SORTABLE[$campo], $desc ? 'desc' : 'asc'];
    }
}
```

- [ ] **Step 6: Rodar o teste e regenerar os tipos**

Run: `docker compose exec -T app php artisan test --filter=PageRequestTest`
Expected: PASS (7 testes).

Run: `docker compose exec -T app php artisan typescript:transform && git diff --stat frontend/src/shared/types/generated.ts`
Expected: o diff acrescenta `export type PageMetaData = { page: number; per_page: number; total: number; last_page: number; total_unfiltered: number; };` e `export type PageData = { data: Array<any>; meta: PageMetaData; };` (ou `unknown[]` — anote a forma real no commit; o front não importa `PageData`).

Run: `cd frontend && pnpm build && cd ..`
Expected: verde (nenhum consumidor ainda).

- [ ] **Step 7: Pint e commit**

```bash
cd backend && ./vendor/bin/pint app/Shared/Pagination tests/Unit/Shared/PageRequestTest.php && cd ..
git add backend/app/Shared/Pagination backend/tests/Unit/Shared/PageRequestTest.php frontend/src/shared/types/generated.ts
git commit -m "feat(shared): contrato de pagina PageRequest/PageData e trait Paginates"
```

---
## Task 3: Kit lazy do frontend — `pageEndpoint`, `useServerTable`, moldura e tabela (§4.5)

**Files:**
- Create: `frontend/src/shared/api/page.ts`
- Create: `frontend/src/shared/hooks/useServerTable.ts`
- Create: `frontend/src/shared/hooks/useCrudDialog.ts`
- Create: `frontend/src/shared/hooks/useRestoreAction.ts`
- Modify: `frontend/src/shared/hooks/useCrudPage.ts`
- Modify: `frontend/src/shared/hooks/useArchivedPage.ts`
- Modify: `frontend/src/shared/hooks/index.ts`
- Modify: `frontend/src/shared/ui/SearchableTableFrame/SearchableTableFrame.tsx`
- Modify: `frontend/src/shared/ui/AppDataTable/AppDataTable.tsx:48-62,99-105`
- Test: `frontend/src/shared/hooks/useServerTable.test.tsx`, `frontend/src/shared/hooks/useCrudDialog.test.ts`, `frontend/src/shared/hooks/useRestoreAction.test.ts`, `frontend/src/shared/ui/AppDataTable/AppDataTable.test.tsx`, `frontend/src/shared/ui/SearchableTableFrame/SearchableTableFrame.test.tsx`

**Interfaces:**
- Consumes: `PageMetaData` gerado (Task 2).
- Produces: `Page<T, M>`, `PageMeta`, `PageQuery`, `pageEndpoint<T, M>(url)`; `useServerTable<T, M>(fetchPage, { key, rows = 10, filters?, staleTime?, refetchOnWindowFocus? }): ServerTable<T, M>` (superconjunto estrutural de `SearchableTableState<T>` + `totalRecords`, `meta`, `sortField`, `sortOrder`, `onSort`, `loading`, `error`, `refetch`); `useCrudDialog<T>(items, useOne?)`; `useRestoreAction(mutation)`; props novas de `SearchableTableFrame`: `totalRecords?`, `sortField?`, `sortOrder?`, `onSort?`, `rows?`.

- [ ] **Step 1: `shared/api/page.ts`**

```ts
import { api } from './axios'
import type { PageMetaData } from '@shared/types/generated'

/** O `meta` gerado do backend (`App\Shared\Pagination\PageMetaData`). Alias
 * para as extensões (`CertificatePageMetaData`) entrarem por `M extends PageMeta`. */
export type PageMeta = PageMetaData

/** O envelope `{ data, meta }` de `App\Shared\Pagination\PageData`, tipado à
 * mão porque o transformer não emite genérico (spec §4.1): `data` casa com o
 * tipo gerado do ITEM, `meta` com o gerado do `meta`. Este é o ÚNICO lugar do
 * front que conhece o envelope. */
export interface Page<T, M extends PageMeta = PageMeta> {
  data: T[]
  meta: M
}

/** A query string que o `PageRequest` do backend aceita, mais os filtros
 * nomeados de cada lista (`display_status`, `status`). `undefined` é omitido
 * pelo axios — é assim que "sem filtro" vira "sem parâmetro". */
export type PageQuery = {
  page: number
  per_page: number
  q?: string
  sort?: string
} & Record<string, string | number | undefined>

/** Fábrica do fetch de uma lista paginada. Mora em `shared/api` — e não em
 * `shared/lib` — porque toca o axios; `shared/lib` não importa `shared/api`. */
export function pageEndpoint<T, M extends PageMeta = PageMeta>(url: string) {
  return (query: PageQuery): Promise<Page<T, M>> =>
    api.get<Page<T, M>>(url, { params: query }).then((r) => r.data)
}
```

- [ ] **Step 2: Teste do `useServerTable` que reprova**

```tsx
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import type { Page, PageMeta, PageQuery } from '@shared/api/page'
import { SERVER_TABLE_DEBOUNCE_MS, useServerTable } from './useServerTable'

interface Row {
  id: number
  name: string
}

/** Cliente estável por teste, fora da função de render (padrão `comCliente()`
 * de `useTurmasPage.test.tsx`). Repete o default do `AppProviders`
 * (`refetchOnWindowFocus: false`) para o hook não herdar o do TanStack. */
function comCliente() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } } })
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  )
  return { qc, Wrapper }
}

const meta = (over: Partial<PageMeta> = {}): PageMeta => ({
  page: 1, per_page: 10, total: 2, last_page: 1, total_unfiltered: 2, ...over,
})

const pagina = (rows: Row[], m: Partial<PageMeta> = {}): Page<Row> => ({ data: rows, meta: meta(m) })

const linhas: Row[] = [
  { id: 1, name: 'Ana' },
  { id: 2, name: 'Bruno' },
]

afterEach(() => {
  vi.useRealTimers()
})

describe('useServerTable — a query que sai', () => {
  it('monta page/per_page sem q, sort nem filtro vazio, e devolve as linhas do envelope', async () => {
    const fetchPage = vi.fn((_q: PageQuery) => Promise.resolve(pagina(linhas)))
    const { Wrapper } = comCliente()

    const { result } = renderHook(
      () => useServerTable(fetchPage, { key: ['x'], filters: { status: null } }),
      { wrapper: Wrapper },
    )

    await waitFor(() => expect(result.current.rows).toHaveLength(2))
    expect(fetchPage).toHaveBeenCalledTimes(1)
    expect(fetchPage).toHaveBeenCalledWith({ page: 1, per_page: 10 })
    expect(result.current.totalRecords).toBe(2)
    expect(result.current.error).toBeNull()
  })

  it('onPage pede a página certa a partir de first', async () => {
    const fetchPage = vi.fn((_q: PageQuery) => Promise.resolve(pagina(linhas, { total: 30, last_page: 3, total_unfiltered: 30 })))
    const { Wrapper } = comCliente()
    const { result } = renderHook(() => useServerTable(fetchPage, { key: ['x'] }), { wrapper: Wrapper })
    await waitFor(() => expect(result.current.rows).toHaveLength(2))

    act(() => result.current.onPage({ first: 20 }))

    await waitFor(() => expect(fetchPage).toHaveBeenLastCalledWith({ page: 3, per_page: 10 }))
    expect(result.current.first).toBe(20)
  })

  it('digitar não busca a cada tecla: um GET depois do debounce, com q, na página 1', async () => {
    vi.useFakeTimers()
    const fetchPage = vi.fn((_q: PageQuery) => Promise.resolve(pagina(linhas, { total: 30, last_page: 3, total_unfiltered: 30 })))
    const { Wrapper } = comCliente()
    const { result } = renderHook(() => useServerTable(fetchPage, { key: ['x'] }), { wrapper: Wrapper })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(fetchPage).toHaveBeenCalledTimes(1)

    act(() => result.current.onPage({ first: 20 }))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(fetchPage).toHaveBeenCalledTimes(2)

    act(() => result.current.onFilterChange('a'))
    act(() => result.current.onFilterChange('an'))
    act(() => result.current.onFilterChange('ana '))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(SERVER_TABLE_DEBOUNCE_MS - 1)
    })
    // Ainda nada: o termo só vira query depois da janela inteira.
    expect(fetchPage).toHaveBeenCalledTimes(2)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1)
    })
    expect(fetchPage).toHaveBeenCalledTimes(3)
    // Termo aparado, e a página VOLTOU a 1 — a página 3 do termo antigo não é
    // a página 3 do termo novo.
    expect(fetchPage).toHaveBeenLastCalledWith({ page: 1, per_page: 10, q: 'ana' })
    expect(result.current.first).toBe(0)
    expect(result.current.filter).toBe('ana ')
    expect(result.current.term).toBe('ana')
  })

  it('trocar um filtro nomeado volta à página 1 e manda só os filtros preenchidos', async () => {
    const fetchPage = vi.fn((_q: PageQuery) => Promise.resolve(pagina(linhas, { total: 30, last_page: 3, total_unfiltered: 30 })))
    const { Wrapper } = comCliente()
    const { result, rerender } = renderHook(
      ({ status }: { status: string | null }) => useServerTable(fetchPage, { key: ['x'], filters: { status } }),
      { wrapper: Wrapper, initialProps: { status: null } },
    )
    await waitFor(() => expect(result.current.rows).toHaveLength(2))
    act(() => result.current.onPage({ first: 20 }))
    await waitFor(() => expect(fetchPage).toHaveBeenLastCalledWith({ page: 3, per_page: 10 }))

    rerender({ status: 'habilitada' })

    await waitFor(() => expect(fetchPage).toHaveBeenLastCalledWith({ page: 1, per_page: 10, status: 'habilitada' }))
    expect(result.current.first).toBe(0)
  })

  it('onSort manda `campo`/`-campo`, volta à página 1, e ordem zero tira o sort', async () => {
    const fetchPage = vi.fn((_q: PageQuery) => Promise.resolve(pagina(linhas, { total: 30, last_page: 3, total_unfiltered: 30 })))
    const { Wrapper } = comCliente()
    const { result } = renderHook(() => useServerTable(fetchPage, { key: ['x'] }), { wrapper: Wrapper })
    await waitFor(() => expect(result.current.rows).toHaveLength(2))
    act(() => result.current.onPage({ first: 20 }))

    act(() => result.current.onSort({ sortField: 'name', sortOrder: -1 }))
    await waitFor(() => expect(fetchPage).toHaveBeenLastCalledWith({ page: 1, per_page: 10, sort: '-name' }))
    expect(result.current.sortField).toBe('name')
    expect(result.current.sortOrder).toBe(-1)

    act(() => result.current.onSort({ sortField: 'name', sortOrder: 1 }))
    await waitFor(() => expect(fetchPage).toHaveBeenLastCalledWith({ page: 1, per_page: 10, sort: 'name' }))

    // `removableSort`: o terceiro clique devolve 0 — sem sort, o servidor
    // volta ao DEFAULT_SORT dele.
    act(() => result.current.onSort({ sortField: 'name', sortOrder: 0 }))
    await waitFor(() => expect(fetchPage).toHaveBeenLastCalledWith({ page: 1, per_page: 10 }))
  })
})

describe('useServerTable — filtering mede EFEITO, não presença', () => {
  it('filtro presente que não corta linha não é "filtrando"; o que corta é', async () => {
    const semCorte = vi.fn((_q: PageQuery) => Promise.resolve(pagina(linhas, { total: 2, total_unfiltered: 2 })))
    const a = comCliente()
    const naoCorta = renderHook(() => useServerTable(semCorte, { key: ['a'], filters: { status: 'x' } }), { wrapper: a.Wrapper })
    await waitFor(() => expect(naoCorta.result.current.meta).toBeDefined())
    expect(naoCorta.result.current.filteredByScope).toBe(false)
    expect(naoCorta.result.current.filtering).toBe(false)

    const comCorte = vi.fn((_q: PageQuery) => Promise.resolve(pagina([linhas[0]], { total: 1, total_unfiltered: 2 })))
    const b = comCliente()
    const corta = renderHook(() => useServerTable(comCorte, { key: ['b'], filters: { status: 'x' } }), { wrapper: b.Wrapper })
    await waitFor(() => expect(corta.result.current.meta).toBeDefined())
    expect(corta.result.current.filteredByScope).toBe(true)
    expect(corta.result.current.filtering).toBe(true)
  })

  it('busca conta em filtering mas não em filteredByScope', async () => {
    vi.useFakeTimers()
    const fetchPage = vi.fn((_q: PageQuery) => Promise.resolve(pagina([linhas[0]], { total: 1, total_unfiltered: 2 })))
    const { Wrapper } = comCliente()
    const { result } = renderHook(() => useServerTable(fetchPage, { key: ['x'] }), { wrapper: Wrapper })

    act(() => result.current.onFilterChange('ana'))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(SERVER_TABLE_DEBOUNCE_MS)
    })

    expect(result.current.filtering).toBe(true)
    expect(result.current.filteredByScope).toBe(false)
  })

  it('clear() zera termo e página', async () => {
    vi.useFakeTimers()
    const fetchPage = vi.fn((_q: PageQuery) => Promise.resolve(pagina(linhas, { total: 30, last_page: 3, total_unfiltered: 30 })))
    const { Wrapper } = comCliente()
    const { result } = renderHook(() => useServerTable(fetchPage, { key: ['x'] }), { wrapper: Wrapper })
    act(() => result.current.onFilterChange('ana'))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(SERVER_TABLE_DEBOUNCE_MS)
    })
    act(() => result.current.onPage({ first: 10 }))

    act(() => result.current.clear())
    await act(async () => {
      await vi.advanceTimersByTimeAsync(SERVER_TABLE_DEBOUNCE_MS)
    })

    expect(result.current.filter).toBe('')
    expect(result.current.term).toBe('')
    expect(result.current.first).toBe(0)
  })

  it('clampa first quando a página pedida some (total encolheu)', async () => {
    let total = 30
    const fetchPage = vi.fn((_q: PageQuery) => Promise.resolve(pagina(linhas, { total, last_page: Math.ceil(total / 10), total_unfiltered: total })))
    const { Wrapper } = comCliente()
    const { result } = renderHook(() => useServerTable(fetchPage, { key: ['x'] }), { wrapper: Wrapper })
    await waitFor(() => expect(result.current.meta).toBeDefined())

    total = 5
    act(() => result.current.onPage({ first: 20 }))

    await waitFor(() => expect(result.current.first).toBe(0))
  })

  it('falha sem corpo sobe `{}`, e refetch devolve a promise (Q-14)', async () => {
    const fetchPage = vi.fn((_q: PageQuery) => Promise.reject(undefined))
    const { Wrapper } = comCliente()
    const { result } = renderHook(() => useServerTable(fetchPage, { key: ['x'] }), { wrapper: Wrapper })

    await waitFor(() => expect(result.current.error).not.toBeNull())
    expect(result.current.error).toEqual({})
    expect(result.current.rows).toEqual([])
    expect(result.current.refetch()).toBeInstanceOf(Promise)
  })
})
```

- [ ] **Step 3: Rodar e ver reprovar**

Run: `cd frontend && pnpm test -- useServerTable`
Expected: FAIL — módulo `./useServerTable` inexistente.

- [ ] **Step 4: Escrever `useServerTable.ts`**

```ts
import { useEffect, useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import type { ProblemDetails } from '@shared/api/axios'
import type { Page, PageMeta, PageQuery } from '@shared/api/page'
import type { ScreenDetailSource } from '@shared/lib'
import { loadFailure } from './listSource'

/** Janela entre a última tecla e o GET. Abaixo disso a API recebe um request
 * por letra; acima, a busca parece travada. */
export const SERVER_TABLE_DEBOUNCE_MS = 300

/** `null`/`undefined`/`''` = "sem filtro": a chave é OMITIDA da query, não
 * mandada vazia — é o que deixa o backend ler "ausente" como "todos". */
export type ServerTableFilters = Record<string, string | number | null | undefined>

export interface ServerTableOptions {
  /** Prefixo da query key. A página entra depois dele (`[...key, 'page', query]`),
   * então invalidar o prefixo (`keys.lists()`, `listKey`) repinta toda página. */
  key: readonly unknown[]
  /** Linhas por página — o `per_page` que vai na URL. Default = o do `AppDataTable`. */
  rows?: number
  filters?: ServerTableFilters
  staleTime?: number
  refetchOnWindowFocus?: boolean
}

/** A ordem que o `DataTable` do PrimeReact emite: `1`, `-1` e, com
 * `removableSort`, `0`/`null` no terceiro clique. Declarado por estrutura —
 * `shared/hooks` não importa tipo de `shared/ui` nem de `primereact`. */
export type ServerSortOrder = 1 | 0 | -1 | null | undefined

/**
 * O que o hook devolve: a MESMA forma que `useTableFilter` (`TableFilter<T>`,
 * e por isso `SearchableTableState<T>` da moldura), mais o que só existe no
 * servidor. A moldura não distingue as duas fontes (spec §4.5).
 */
export interface ServerTable<T, M extends PageMeta = PageMeta> {
  filter: string
  term: string
  filtering: boolean
  filteredByScope: boolean
  rows: T[]
  first: number
  onFilterChange: (value: string) => void
  onPage: (event: { first: number }) => void
  resetPage: () => void
  clear: () => void
  /** `meta.total` — o que o paginador e o rodapé contam. `0` antes do primeiro GET. */
  totalRecords: number
  meta: M | undefined
  sortField: string | undefined
  sortOrder: ServerSortOrder
  onSort: (event: { sortField: string; sortOrder: ServerSortOrder }) => void
  /** `isFetching`, não `isLoading`: com `keepPreviousData` a página anterior
   * fica na tela enquanto a próxima chega, e a faixa "carregando" sobre dado
   * válido é o comportamento desejado (spec §8). */
  loading: boolean
  error: ScreenDetailSource | null
  refetch: () => Promise<unknown>
}

/**
 * Estado de uma tabela paginada NO SERVIDOR: termo com debounce, página, sort
 * e filtros nomeados viram a `PageQuery` de um `pageEndpoint`, e o resultado
 * vem por `useQuery` com `placeholderData: keepPreviousData`.
 *
 * `filtering` mede o EFEITO, como o `useTableFilter` (regra do review de
 * 2026-08-04, Q-6): termo digitado OU `meta.total !== meta.total_unfiltered`
 * com filtro nomeado preenchido. `filteredByScope` é só a segunda metade — é
 * o que o botão do vazio usa para prometer "limpar filtros" (UI-09).
 * Aproximação declarada: com termo E filtro, `total` já carrega o corte dos
 * dois, então um filtro que não cortaria nada sozinho conta como cortando
 * enquanto houver termo. Custo: o botão diz "limpar busca e filtros" onde
 * "limpar busca" bastaria — sempre a promessa maior, nunca a menor.
 *
 * Trocar termo ou filtro volta à primeira página DURANTE o render (o mesmo
 * padrão de "adjust state during render" do clamp do `useTableFilter`), e a
 * query deste render já sai com `page: 1` — um `useEffect` pediria a página
 * velha primeiro e a certa depois.
 */
export function useServerTable<T, M extends PageMeta = PageMeta>(
  fetchPage: (query: PageQuery) => Promise<Page<T, M>>,
  { key, rows = 10, filters, staleTime, refetchOnWindowFocus }: ServerTableOptions,
): ServerTable<T, M> {
  const [filter, setFilter] = useState('')
  const [term, setTerm] = useState('')
  const [first, setFirst] = useState(0)
  const [sort, setSort] = useState<{ field: string; order: 1 | -1 } | null>(null)

  useEffect(() => {
    const id = setTimeout(() => setTerm(filter.trim()), SERVER_TABLE_DEBOUNCE_MS)
    return () => clearTimeout(id)
  }, [filter])

  const activeFilters = Object.fromEntries(
    Object.entries(filters ?? {}).filter(([, value]) => value !== null && value !== undefined && value !== ''),
  ) as Record<string, string | number>

  // Termo e filtros formam o "escopo". Escopo novo = página 1, no MESMO render.
  const scope = `${term}|${JSON.stringify(activeFilters)}`
  const [lastScope, setLastScope] = useState(scope)
  const scopeChanged = lastScope !== scope
  if (scopeChanged) {
    setLastScope(scope)
    setFirst(0)
  }
  const currentFirst = scopeChanged ? 0 : first

  const query: PageQuery = {
    page: Math.floor(currentFirst / rows) + 1,
    per_page: rows,
    ...(term !== '' ? { q: term } : {}),
    ...(sort ? { sort: `${sort.order === -1 ? '-' : ''}${sort.field}` } : {}),
    ...activeFilters,
  }

  const result = useQuery<Page<T, M>, ProblemDetails>({
    queryKey: [...key, 'page', query],
    queryFn: () => fetchPage(query),
    placeholderData: keepPreviousData,
    // Só quando pedido: `staleTime: undefined` explícito SOBRESCREVERIA o
    // default do `AppProviders` com o default do TanStack.
    ...(staleTime !== undefined ? { staleTime } : {}),
    ...(refetchOnWindowFocus !== undefined ? { refetchOnWindowFocus } : {}),
  })

  const meta = result.data?.meta
  const total = meta?.total ?? 0

  // Clamp do ESTADO, como no `useTableFilter`: a lista encolheu por baixo da
  // página pedida (deleção na última página, filtro que ficou mais estreito).
  if (currentFirst !== 0 && meta !== undefined && currentFirst >= total) {
    setFirst(0)
  }

  const hasFilters = Object.keys(activeFilters).length > 0
  const filteredByScope = hasFilters && meta !== undefined && meta.total !== meta.total_unfiltered

  return {
    filter,
    term,
    filtering: term !== '' || filteredByScope,
    filteredByScope,
    rows: result.data?.data ?? [],
    first: meta !== undefined && currentFirst >= total ? 0 : currentFirst,
    onFilterChange: (value) => setFilter(value),
    onPage: (event) => setFirst(event.first),
    resetPage: () => setFirst(0),
    clear: () => {
      setFilter('')
      setFirst(0)
    },
    totalRecords: total,
    meta,
    sortField: sort?.field,
    sortOrder: sort?.order ?? 0,
    onSort: (event) => {
      setSort(event.sortOrder === 1 || event.sortOrder === -1 ? { field: event.sortField, order: event.sortOrder } : null)
      setFirst(0)
    },
    loading: result.isFetching,
    error: loadFailure(result),
    refetch: () => result.refetch(),
  }
}
```

- [ ] **Step 5: Rodar o teste até passar**

Run: `cd frontend && pnpm test -- useServerTable`
Expected: PASS (10 testes). Se o lint `react-hooks/set-state-in-effect` apontar o `setTerm` dentro do `setTimeout`, ele NÃO deve — a chamada é assíncrona; se apontar, anote a linha no commit e não desligue a regra: mova o debounce para um `useEffect` que só agenda e um `useState` lido pelo timer.

- [ ] **Step 6: `AppDataTable` — `paginated` por `totalRecords`**

Em `AppDataTable.tsx`, destruture `totalRecords` e troque a linha 62:

```tsx
export function AppDataTable<T extends DataTableValueArray>({
  pt,
  loading,
  emptyMessage,
  footerCount,
  error,
  onRetry,
  value,
  rows = 10,
  totalRecords,
  ...props
}: AppDataTableProps<T>) {
  const { t } = useTranslation()
  const errored = error != null
  const data = (errored ? [] : value) as T | undefined
  // Em modo `lazy` a página tem no máximo `rows` linhas por construção, então
  // `data.length > rows` nunca ligaria os controles: quem sabe quantas linhas
  // existem é `totalRecords`. `hasRows`, logo abaixo, continua por página —
  // largura mínima e cabeçalho são sobre o que está na tela.
  const paginated = (totalRecords ?? data?.length ?? 0) > rows
```

e no `<DataTable>`, logo abaixo de `rows={rows}`:

```tsx
      totalRecords={errored ? 0 : totalRecords}
```

Atualize o docblock do wrapper (linha 29): "paginação/sort/filtro client-side (o index devolve array puro)" vira "paginação/sort/filtro client-side por default; com `lazy` + `totalRecords` (listas que paginam no servidor — `useServerTable`), o DataTable só emite eventos e quem busca é o hook".

- [ ] **Step 7: `SearchableTableFrame` — repasse lazy**

Acrescente à `SearchableTableFrameBaseProps<T>`:

```tsx
  /** Presente = a fonte pagina no SERVIDOR (`useServerTable`): a moldura liga o
   * `lazy` do DataTable e repassa a contagem — sem ela, `data.length > rows`
   * nunca é verdade numa página de 10 e os controles não aparecem. Ausente =
   * client-side, como sempre (`useTableFilter`). */
  totalRecords?: number
  sortField?: string
  sortOrder?: 1 | 0 | -1 | null
  onSort?: (event: { sortField: string; sortOrder: 1 | 0 | -1 | null | undefined }) => void
  /** Linhas por página. Passe o MESMO `rows` que o `useServerTable` usa, senão
   * `first` e `page` desalinham. */
  rows?: number
```

Destruture `totalRecords, sortField, sortOrder, onSort, rows` e no `<AppDataTable>`:

```tsx
      <AppDataTable
        value={table.rows as unknown as DataTableValueArray}
        loading={loading}
        error={error}
        onRetry={onRetry}
        emptyMessage={empty}
        footerCount={footerCount}
        first={table.first}
        onPage={table.onPage}
        rows={rows}
        lazy={totalRecords !== undefined}
        totalRecords={totalRecords}
        sortField={sortField}
        sortOrder={sortOrder}
        onSort={onSort}
      >
```

- [ ] **Step 8: Catracas de UI (`AppDataTable.test.tsx`, `SearchableTableFrame.test.tsx`)**

Em `AppDataTable.test.tsx`, novo `describe`:

```tsx
describe('AppDataTable — modo lazy (spec §5)', () => {
  it('CATRACA: com totalRecords acima de rows, os controles de página aparecem mesmo com uma página só de linhas', () => {
    // A página vem do servidor com 10 linhas no máximo: `data.length > rows`
    // nunca ligaria o paginador, e a lista de 5.000 alunos ficaria presa na
    // primeira página sem botão nenhum.
    render(
      <AppDataTable value={LINHAS} footerCount={<span>1</span>} lazy totalRecords={30} rows={10}>
        <AppColumn field="id" header="id" />
      </AppDataTable>,
    )

    expect(document.querySelector('.p-paginator-next')).not.toBeNull()
  })

  it('sem totalRecords, uma página de linhas segue sem controles (client-side intacto)', () => {
    render(
      <AppDataTable value={LINHAS} footerCount={<span>1</span>} rows={10}>
        <AppColumn field="id" header="id" />
      </AppDataTable>,
    )

    expect(document.querySelector('.p-paginator-next')).toBeNull()
  })

  it('em erro, totalRecords não segura o paginador sobre linhas vazias', () => {
    render(
      <AppDataTable value={LINHAS} footerCount={<span>1</span>} lazy totalRecords={30} rows={10} error={{ detail: 'x' }}>
        <AppColumn field="id" header="id" />
      </AppDataTable>,
    )

    expect(document.querySelector('.p-paginator-next')).toBeNull()
  })
})
```

Em `SearchableTableFrame.test.tsx`, novo `describe` (a fábrica `estado()` continua valendo — os campos lazy são props da moldura, não do estado):

```tsx
describe('SearchableTableFrame — modo lazy', () => {
  it('com totalRecords, liga o paginador do servidor e entrega o sort ao chamador', () => {
    const onSort = vi.fn()
    const table = estado({ filtering: false, rows: [{ id: 1, name: 'Ana' }] })
    render(
      <SearchableTableFrame
        table={table}
        searchPlaceholder="common.search"
        emptyState={<span>vazio de domínio</span>}
        footerCount={<span>30</span>}
        totalRecords={30}
        rows={10}
        onSort={onSort}
      >
        <AppColumn field="name" header="nome" sortable />
      </SearchableTableFrame>,
    )

    expect(document.querySelector('.p-paginator-next')).not.toBeNull()

    fireEvent.click(screen.getByText('nome'))

    expect(onSort).toHaveBeenCalledWith(expect.objectContaining({ sortField: 'name', sortOrder: 1 }))
  })
})
```

Run: `cd frontend && pnpm test -- AppDataTable SearchableTableFrame`
Expected: PASS. **Veja reprovar:** copie `AppDataTable.tsx` para o scratchpad, volte `paginated` para `(data?.length ?? 0) > rows`, rode — a primeira catraca reprova; restaure o arquivo do scratchpad.

- [ ] **Step 9: `useCrudDialog` (D14) e `useCrudPage` compondo-o**

Teste `useCrudDialog.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useCrudDialog } from './useCrudDialog'

interface Item {
  id?: number
  name: string
}

describe('useCrudDialog — a entidade vem da lista, ou do useOne quando a lista não a tem (D14)', () => {
  it('id presente na página: useOne recebe undefined e a entidade é a da lista', () => {
    const useOne = vi.fn((_id: number | undefined) => ({ data: undefined as Item | undefined }))
    const { result } = renderHook(() => useCrudDialog<Item>([{ id: 1, name: 'da lista' }], useOne))

    act(() => result.current.openViewById(1))

    expect(useOne).toHaveBeenLastCalledWith(undefined)
    expect(result.current.dialog?.entity?.name).toBe('da lista')
  })

  it('id fora da página: useOne recebe o id e a entidade é a dele', () => {
    // Com página, o aluno aberto por deep link ou visto na página 3 e depois
    // filtrado para fora não está em `items`; derivar só da lista devolvia
    // `null` e o dialog abria vazio.
    const useOne = vi.fn((id: number | undefined) => ({ data: id === 7 ? { id: 7, name: 'do servidor' } : undefined }))
    const { result } = renderHook(() => useCrudDialog<Item>([{ id: 1, name: 'da lista' }], useOne))

    act(() => result.current.openViewById(7))

    expect(useOne).toHaveBeenLastCalledWith(7)
    expect(result.current.dialog?.entity?.name).toBe('do servidor')
  })

  it('sem useOne, o comportamento antigo fica: fora da lista é null', () => {
    const { result } = renderHook(() => useCrudDialog<Item>([{ id: 1, name: 'da lista' }]))

    act(() => result.current.openViewById(7))

    expect(result.current.dialog?.entity).toBeNull()
  })

  it('startEdit exige entidade, venha ela da lista ou do useOne', () => {
    const useOne = vi.fn((id: number | undefined) => ({ data: id === 7 ? { id: 7, name: 'do servidor' } : undefined }))
    const { result } = renderHook(() => useCrudDialog<Item>([], useOne))

    act(() => result.current.openViewById(7))
    act(() => result.current.startEdit())

    expect(result.current.dialog?.mode).toBe('edit')
  })
})
```

`useCrudDialog.ts`:

```ts
import { useState } from 'react'
import type { DialogMode } from '@shared/lib'

/** O `useOne` de um recurso (`createCrudResource().useOne`), por estrutura.
 * `undefined` = não busque — é o que a fábrica já faz com `enabled: id != null`. */
export type OneResource<T> = (id: number | undefined) => { data?: T | undefined }

/** O fallback quando o recurso não tem `useOne`: hook que não busca nada. Existe
 * para o hook de baixo poder chamar UM hook, sempre, em vez de `useOne?.()` —
 * chamada condicional de hook, que o `rules-of-hooks` reprova com razão. */
function useSemFallback(): { data?: undefined } {
  return {}
}

/**
 * O dialog unificado de uma página CRUD, por ID (nunca por objeto — a
 * entidade é derivada a cada render, então uma invalidação chega ao dialog
 * aberto; era o bug que a task 4.2.2 escondeu).
 *
 * Extraído de `useCrudPage` quando a lista de alunos passou a vir do
 * `useServerTable`: com página, a entidade do `openViewById` (deep link) e a
 * de um "Ver" que ficou fora da página atual não estão em `items` — o
 * fallback `useOne(id)` (spec D14) é o que a busca. `useOne` tem de ser
 * ESTÁVEL entre renders (função do recurso, não seta inline): ele é chamado
 * como hook.
 */
export function useCrudDialog<T extends { id?: number }>(items: T[], useOne?: OneResource<T>) {
  const [dialog, setDialog] = useState<{ mode: DialogMode; id: number | null } | null>(null)

  const naLista = dialog?.id != null ? (items.find((i) => i.id === dialog.id) ?? null) : null
  const useFallback = useOne ?? useSemFallback
  const fallback = useFallback(dialog?.id != null && naLista === null ? dialog.id : undefined)
  const entity = naLista ?? fallback.data ?? null

  return {
    dialog: dialog ? { mode: dialog.mode, entity } : null,
    openCreate: () => setDialog({ mode: 'create', id: null }),
    openView: (item: T) => setDialog({ mode: 'view', id: item.id ?? null }),
    /** Abre `view` a partir de um id solto (deep link vindo de outro módulo). */
    openViewById: (id: number) => setDialog({ mode: 'view', id }),
    /** view -> edit, preservando a entidade aberta. A guarda é a ENTIDADE, não
     * o id (review de 2026-08-04, Q-7). */
    startEdit: () => setDialog((d) => (d && entity ? { ...d, mode: 'edit' } : d)),
    close: () => setDialog(null),
  }
}
```

`useCrudPage.ts` vira:

```ts
import type { ProblemDetails } from '@shared/api/axios'
import { listSource } from './listSource'
import { useCrudDialog, type OneResource } from './useCrudDialog'

/** Opções de query que a PÁGINA pode pedir. Estreito de propósito: quem precisa
 * de `enabled`, `select` ou `queryKey` está usando o recurso direto, não a
 * página, e alargar isto transformaria o hook em porta aberta para o TanStack. */
export interface CrudPageQueryOptions {
  staleTime?: number
}

/** Contrato mínimo que `createCrudResource<T>` satisfaz. Tipado por estrutura
 * para o hook não depender da fábrica inteira. `useOne` é opcional (spec D14):
 * presente, a entidade do dialog que não está na lista vem dele. */
interface ListableResource<T> {
  useList: (options?: CrudPageQueryOptions) => {
    data?: T[]
    isLoading: boolean
    isError: boolean
    error: ProblemDetails | null
    /** `Promise`, não `unknown`: é o refetch do TanStack Query, e a promise é o
     * que o `AppErrorState` aguarda para manter o Reintentar em `loading`
     * (Q-14). */
    refetch: () => Promise<unknown>
  }
  useOne?: OneResource<T>
}

/**
 * Estado de uma página de módulo CRUD: a lista (`listSource`) e o dialog
 * unificado (`useCrudDialog`).
 *
 * `error` sobe junto com `items` porque sem ele a página não distingue "não há
 * registros" de "não deu para perguntar" (spec D16).
 */
export function useCrudPage<T extends { id?: number }>(
  resource: ListableResource<T>,
  options?: CrudPageQueryOptions,
) {
  const query = resource.useList(options)

  return {
    ...listSource(query),
    ...useCrudDialog(query.data ?? [], resource.useOne),
  }
}
```

Run: `cd frontend && pnpm test -- useCrudDialog useCrudPage`
Expected: PASS nos dois — os 9 testes antigos de `useCrudPage` continuam valendo sem mudar uma linha.

- [ ] **Step 10: `useRestoreAction` extraído de `useArchivedPage`**

`useRestoreAction.ts`:

```ts
import type { ProblemDetails } from '@shared/api/axios'
import { useArchiveToasts } from './useArchiveToasts'

/** Callbacks EXTRA da mutation de restore, para quem chama. O toast dos dois
 * lados já é do hook (Q-3 do review de 2026-08-19); estes existem para o
 * chamador que precisa fechar um diálogo ou navegar depois. */
export interface RestoreOptions {
  onSuccess?: () => void
  onError?: (problem: ProblemDetails) => void
}

/** O mínimo da mutation de restaurar — estrutural, como o `ArchiveMutation`
 * do `useArchiveAction`. */
interface RestoreMutation {
  mutate: (id: number, options?: RestoreOptions) => void
  isPending: boolean
}

/**
 * Restaurar com os toasts dos dois lados. Par do `useArchiveAction`, e
 * extraído do `useArchivedPage` quando a lista de turmas arquivadas passou a
 * vir do `useServerTable`: a tela precisa do restore sem precisar do modo e
 * da lista que o `useArchivedPage` carrega junto. O `useArchivedPage` compõe
 * este hook — a política do toast continua tendo um dono só.
 */
export function useRestoreAction(mutation: RestoreMutation) {
  const toasts = useArchiveToasts()

  return {
    /** O toast MORA aqui, nos dois sentidos: sem o de erro, um 403 de quem não
     * tem `*.restore` e os 422 dos gates não mudam nada na tela (Q-2 do review
     * de 2026-08-18). */
    restore: (id: number, options?: RestoreOptions) =>
      mutation.mutate(id, {
        onSuccess: () => {
          toasts.restored()
          options?.onSuccess?.()
        },
        onError: (problem) => {
          toasts.failed(problem)
          options?.onError?.(problem)
        },
      }),
    restoring: mutation.isPending,
  }
}
```

Em `useArchivedPage.ts`: remova a interface `RestoreOptions` local e o import de `useArchiveToasts`; importe `useRestoreAction, type RestoreOptions` de `./useRestoreAction`; re-exporte `export type { RestoreOptions }` (o barrel e os consumidores continuam importando de onde importavam); a interface `ArchivableResource.useRestore` fica igual; o corpo troca `const restore = resource.useRestore(); const toasts = useArchiveToasts();` por `const restore = useRestoreAction(resource.useRestore())` e o retorno troca o bloco `restore:`/`restoring:` por `...restore`.

Teste `useRestoreAction.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import type { ProblemDetails } from '@shared/api/axios'
import { useRestoreAction } from './useRestoreAction'

const toasts = vi.hoisted(() => ({ restored: vi.fn(), failed: vi.fn() }))
vi.mock('./useArchiveToasts', () => ({ useArchiveToasts: () => toasts }))

describe('useRestoreAction', () => {
  it('sucesso: toast de restaurado e o onSuccess do chamador', () => {
    const ok = vi.fn()
    const { result } = renderHook(() =>
      useRestoreAction({ mutate: (_id, options) => options?.onSuccess?.(), isPending: false }),
    )

    act(() => result.current.restore(7, { onSuccess: ok }))

    expect(toasts.restored).toHaveBeenCalled()
    expect(ok).toHaveBeenCalled()
  })

  it('falha: toast de erro com o problema e o onError do chamador', () => {
    const problema = { detail: 'sin permiso' } as ProblemDetails
    const falhou = vi.fn()
    const { result } = renderHook(() =>
      useRestoreAction({ mutate: (_id, options) => options?.onError?.(problema), isPending: false }),
    )

    act(() => result.current.restore(7, { onError: falhou }))

    expect(toasts.failed).toHaveBeenCalledWith(problema)
    expect(falhou).toHaveBeenCalledWith(problema)
  })
})
```

Run: `cd frontend && pnpm test -- useRestoreAction useArchivedPage`
Expected: PASS — os 7 testes de `useArchivedPage` intactos.

- [ ] **Step 11: Barrel**

Em `shared/hooks/index.ts` acrescente:

```ts
export { useServerTable, SERVER_TABLE_DEBOUNCE_MS } from './useServerTable'
export type { ServerTable, ServerTableOptions, ServerSortOrder } from './useServerTable'
export { useCrudDialog } from './useCrudDialog'
export type { OneResource } from './useCrudDialog'
export { useRestoreAction } from './useRestoreAction'
```

e troque `export type { ArchiveMode, RestoreOptions } from './useArchivedPage'` por `export type { ArchiveMode } from './useArchivedPage'` + `export type { RestoreOptions } from './useRestoreAction'`.

- [ ] **Step 12: Gate do frontend e commit**

Run: `cd frontend && pnpm lint && pnpm build && pnpm test`
Expected: lint 0, build verde, suíte verde (contagem de arquivos sobe em 3).

```bash
git add frontend/src/shared/api/page.ts frontend/src/shared/hooks frontend/src/shared/ui/AppDataTable frontend/src/shared/ui/SearchableTableFrame
git commit -m "feat(shared): kit lazy — pageEndpoint, useServerTable, useCrudDialog e moldura com totalRecords"
```

---
## Task 4: `GET /api/students` paginado — `StudentQueryBuilder` (§4.2)

**Files:**
- Create: `backend/app/Domains/Identity/QueryBuilders/StudentQueryBuilder.php`
- Modify: `backend/app/Domains/Identity/Models/Student.php` (`newEloquentBuilder`, `loadListingData`)
- Modify: `backend/app/Domains/Identity/Http/Controllers/StudentController.php:34-50,73-76`
- Modify: `backend/app/Domains/Identity/Data/StudentData.php:83-86`
- Modify: `backend/app/Domains/Identity/Data/StudentDetailData.php` (`photo_url`)
- Modify: `backend/tests/Feature/Identity/StudentDataTest.php:30,47`, `backend/tests/Feature/Shared/SoftDeletedRelationProjectionTest.php:144`, `backend/tests/Feature/Identity/StudentCrudTest.php`, `backend/tests/Feature/Identity/UserPhotoTest.php` (onde leem `/api/students` como array)
- Test: `backend/tests/Feature/Identity/StudentPaginationTest.php`
- Regenera: `generated.ts` (`StudentDetailData.photo_url`)

**Interfaces:**
- Consumes: `PageRequest`, `Paginates`, `PageData` (Task 2).
- Produces: `StudentQueryBuilder::withListingData()` (join em `users` + `select('students.*')` + `with(LISTING)` + `withCount('enrollments')`), `SORTABLE = ['name' => 'users.name', 'rut' => 'users.rut']`, `DEFAULT_SORT = 'name'`, `searchable()` sobre `users.name`/`users.rut`; `Student::loadListingData()`; `GET /api/students` devolve `PageData` de `StudentData`; `StudentDetailData.photo_url`.

- [ ] **Step 1: Teste de endpoint que reprova**

```php
<?php

namespace Tests\Feature\Identity;

use App\Domains\Identity\Models\Student;
use App\Domains\Identity\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\CreatesDomainRecords;
use Tests\TestCase;

/**
 * DoD 1 da spec sobre `GET /api/students`: página, `meta`, busca, ordenação
 * pela allowlist e as três recusas (teto, `page` 0, `sort` fora da lista).
 * A ordenação deixa de ser `sortBy` em PHP sobre a coleção inteira
 * (`StudentController.php:40`) e vira `ORDER BY users.name` por join.
 */
class StudentPaginationTest extends TestCase
{
    use CreatesDomainRecords;
    use RefreshDatabase;

    private const RUTS = ['12.345.678-5', '9.876.543-3', '11.111.111-1'];

    protected function setUp(): void
    {
        parent::setUp();
        $this->actingAsAdmin();

        $client = $this->makeClientWithUser([], ['rut' => '76.123.456-0']);

        // Fora de ordem alfabética de propósito: a ordem da resposta tem de
        // vir do ORDER BY, não da ordem de inserção.
        foreach (['Carla Rojas', 'Ana Soto', 'Bruno Díaz'] as $i => $name) {
            Student::create([
                'user_id' => User::factory()->aluno()->create(['name' => $name, 'rut' => self::RUTS[$i]])->id,
                'current_client_id' => $client->id,
            ]);
        }
    }

    public function test_default_e_pagina_um_de_vinte_e_cinco_ordenada_por_nome(): void
    {
        $response = $this->getJson('/api/students')->assertOk();

        $this->assertSame(['Ana Soto', 'Bruno Díaz', 'Carla Rojas'], array_column($response->json('data'), 'name'));
        $this->assertSame(
            ['page' => 1, 'per_page' => 25, 'total' => 3, 'last_page' => 1, 'total_unfiltered' => 3],
            $response->json('meta'),
        );
        // A projeção continua a de sempre: nada de `enrollments_count` nulo.
        $response->assertJsonPath('data.0.enrollments_count', 0);
        $response->assertJsonPath('data.0.current_client_name', 'ACME');
    }

    public function test_per_page_e_page_fatiam_e_last_page_acompanha(): void
    {
        $response = $this->getJson('/api/students?per_page=2&page=2')->assertOk();

        $this->assertSame(['Carla Rojas'], array_column($response->json('data'), 'name'));
        $response->assertJsonPath('meta.page', 2)
            ->assertJsonPath('meta.per_page', 2)
            ->assertJsonPath('meta.last_page', 2)
            ->assertJsonPath('meta.total', 3);
    }

    public function test_q_varre_nome_e_rut_e_total_unfiltered_fica_no_escopo_inteiro(): void
    {
        $porNome = $this->getJson('/api/students?q=an')->assertOk();
        $this->assertSame(['Ana Soto'], array_column($porNome->json('data'), 'name'));
        $porNome->assertJsonPath('meta.total', 1)->assertJsonPath('meta.total_unfiltered', 3);

        $porRut = $this->getJson('/api/students?q=9.876')->assertOk();
        $this->assertSame(['Bruno Díaz'], array_column($porRut->json('data'), 'name'));
    }

    public function test_sort_com_sinal_inverte_e_rut_esta_na_allowlist(): void
    {
        $desc = $this->getJson('/api/students?sort=-name')->assertOk();
        $this->assertSame(['Carla Rojas', 'Bruno Díaz', 'Ana Soto'], array_column($desc->json('data'), 'name'));

        $porRut = $this->getJson('/api/students?sort=rut')->assertOk();
        $this->assertSame(['11.111.111-1', '12.345.678-5', '9.876.543-3'], array_column($porRut->json('data'), 'rut'));
    }

    /** @return array<string, array{0: string}> */
    public static function queriesRecusadas(): array
    {
        return [
            'sort fora da allowlist' => ['sort=email'],
            'per_page acima do teto' => ['per_page=101'],
            'page zero' => ['page=0'],
        ];
    }

    /** @dataProvider queriesRecusadas */
    public function test_query_fora_do_contrato_e_422_problem_json(string $query): void
    {
        $this->getJson("/api/students?{$query}")
            ->assertStatus(422)
            ->assertHeader('Content-Type', 'application/problem+json');
    }

    public function test_store_e_update_seguem_devolvendo_a_projecao_com_enrollments_count(): void
    {
        $client = $this->makeClientWithUser(['legal_name' => 'Outra'], ['rut' => '77.555.333-2']);

        $criado = $this->postJson('/api/students', [
            'name' => 'Diego Paz', 'rut' => '22.222.222-2', 'email' => 'diego@x.cl', 'phone' => null, 'client_id' => $client->id,
        ])->assertCreated();
        $criado->assertJsonPath('enrollments_count', 0);

        $this->putJson("/api/students/{$criado->json('id')}", [
            'name' => 'Diego Paz Soto', 'rut' => '22.222.222-2', 'email' => 'diego@x.cl', 'phone' => null,
        ])->assertOk()->assertJsonPath('enrollments_count', 0)->assertJsonPath('name', 'Diego Paz Soto');
    }
}
```

- [ ] **Step 2: Rodar e ver reprovar**

Run: `docker compose exec -T app php artisan test --filter=StudentPaginationTest`
Expected: FAIL — `data` ausente (a resposta ainda é array cru).

- [ ] **Step 3: `StudentQueryBuilder`**

```php
<?php

namespace App\Domains\Identity\QueryBuilders;

use App\Shared\Pagination\Paginates;
use Illuminate\Database\Eloquent\Builder;

/**
 * O primeiro builder de `Student` — o único dos três agregados que paginam
 * sem builder. Nasce aqui porque a ordenação por nome saía de um `sortBy` em
 * PHP sobre a coleção inteira (`StudentController::index`, medido em
 * 2026-08-28), o que não sobrevive a uma página.
 *
 * O join em `users` é o que dá `ORDER BY users.name` e a busca por nome/RUT.
 * Sem condição sobre `users.deleted_at` de propósito: `Student::user()` é
 * `withTrashed()` (arquivamento não apaga, lição 16), e o escopo de
 * `SoftDeletes` do próprio Student qualifica `students.deleted_at` sozinho.
 *
 * ORDEM IMPORTA em `withListingData()`: `select('students.*')` vem ANTES de
 * `withCount` — `withAggregate` só põe `students.*` quando ainda não há
 * coluna, e um `select` depois dele apagaria o sub-select da contagem.
 */
class StudentQueryBuilder extends Builder
{
    use Paginates;

    public const LISTING = ['user', 'currentClient'];

    public const SORTABLE = [
        'name' => 'users.name',
        'rut' => 'users.rut',
    ];

    public const DEFAULT_SORT = 'name';

    public function withListingData(): static
    {
        return $this
            ->join('users', 'users.id', '=', 'students.user_id')
            ->select('students.*')
            ->with(self::LISTING)
            ->withCount('enrollments');
    }

    public function searchable(string $q): static
    {
        $like = '%'.addcslashes($q, '%_\\').'%';

        return $this->where(fn (Builder $w) => $w
            ->where('users.name', 'like', $like)
            ->orWhere('users.rut', 'like', $like));
    }
}
```

- [ ] **Step 4: `Student` — builder e contraparte de instância**

Em `Student.php`, acrescente `use App\Domains\Identity\QueryBuilders\StudentQueryBuilder;` e `use Illuminate\Database\Query\Builder as QueryBuilder;`, e ao final da classe:

```php
    /**
     * Contraparte de instância do `withListingData()` — o mesmo molde de
     * `Turma`, `Certificate` e `Quote`. `store`/`update` projetam por aqui;
     * sem o `loadCount`, `StudentData::fromModel` recusa o `null` (D-B3).
     */
    public function loadListingData(): static
    {
        return $this->load(StudentQueryBuilder::LISTING)->loadCount('enrollments');
    }

    /** @param  QueryBuilder  $query */
    public function newEloquentBuilder($query): StudentQueryBuilder
    {
        return new StudentQueryBuilder($query);
    }
```

- [ ] **Step 5: Controller e DTOs**

`StudentController.php`:

```php
use App\Shared\Pagination\PageData;
use App\Shared\Pagination\PageRequest;
// ...
    /**
     * Página de alunos (spec D1): a lista cresce sem teto e ordenava em PHP.
     * `PageRequest` direto porque não há filtro nomeado — quem sabe buscar e
     * ordenar é o `StudentQueryBuilder`.
     *
     * @return PageData<StudentData>
     */
    public function index(PageRequest $request): PageData
    {
        return Student::query()
            ->withListingData()
            ->page($request, fn (Student $student) => StudentData::fromModel($student));
    }

    public function store(StudentData $data, CreateStudentAction $action): StudentData
    {
        return StudentData::fromModel($action->execute($data)->loadListingData());
    }
    // ...
    public function update(StudentData $data, Student $student, UpdateStudentAction $action): StudentData
    {
        return StudentData::fromModel($action->execute($student, $data)->loadListingData());
    }
```

`StudentData.php` — o fallback lazy morre (spec D8):

```php
            // Sem fallback: vem do `withCount()` do builder ou do
            // `loadListingData()` da instância. `enrollments()->count()` aqui
            // era uma query por linha escondida atrás de um `??` — exatamente o
            // que `Model::preventLazyLoading()` (Task 11) não enxerga, porque
            // é query feita NA relação, não lazy load da relação.
            enrollments_count: $student->enrollments_count,
```

`StudentDetailData.php` — `photo_url`, para o detalhe ser superconjunto de `StudentData` (desvio 2):

```php
use App\Shared\Files\Transformers\SignedUrlTransformer;
use Spatie\LaravelData\Attributes\WithTransformer;
// ... no construtor, depois de `$turmas`:
        /** A mesma foto viva de `StudentData`: o `useOne` da lista lê este
         * endpoint quando o aluno aberto não está na página carregada (D14),
         * e o dialog precisa da mesma forma nos dois caminhos. */
        #[WithTransformer(SignedUrlTransformer::class, 60)]
        public ?string $photo_url = null,
// ... em `fromModel`, depois de `turmas:`:
            photo_url: $student->user->photo_path,
```

- [ ] **Step 6: Adaptar os testes que liam a lista como array e os que projetavam sem contagem**

Run: `grep -rn "StudentData::fromModel\|'/api/students'" backend/tests`

Para cada sítio: `->fresh(['user', 'currentClient'])` vira `->fresh()->loadListingData()` (`StudentDataTest:30,47`, `SoftDeletedRelationProjectionTest:144`); `assertJsonCount(N)` sobre `/api/students` vira `assertJsonCount(N, 'data')`; `json('0.…')`/`assertJsonPath('0.…')` viram `'data.0.…'` (`StudentCrudTest`, `UserPhotoTest` onde aplicável).

Run: `docker compose exec -T app php artisan test --filter='StudentPaginationTest|StudentCrudTest|StudentDataTest|UserPhotoTest|SoftDeletedRelationProjectionTest|PageRequestTest'`
Expected: PASS.

- [ ] **Step 7: Regenerar tipos, gate e commit**

Run: `docker compose exec -T app php artisan typescript:transform && git diff --stat frontend/src/shared/types/generated.ts`
Expected: `StudentDetailData` ganha `photo_url?: string | null` (ou `photo_url: string | null`). Nenhum consumidor quebra: campo novo e opcional na leitura.

Run: `cd frontend && pnpm build && cd .. && cd backend && ./vendor/bin/pint app/Domains/Identity/QueryBuilders/StudentQueryBuilder.php app/Domains/Identity/Models/Student.php app/Domains/Identity/Http/Controllers/StudentController.php app/Domains/Identity/Data/StudentData.php app/Domains/Identity/Data/StudentDetailData.php tests/Feature/Identity/StudentPaginationTest.php && cd ..`

```bash
git add backend/app/Domains/Identity backend/tests/Feature/Identity backend/tests/Feature/Shared/SoftDeletedRelationProjectionTest.php frontend/src/shared/types/generated.ts
git commit -m "feat(identity): GET /api/students paginado com StudentQueryBuilder (busca, sort, allowlist)"
```

> Estado intermediário declarado: entre este commit e a Task 5 a aba Alunos do front lê um envelope como se fosse array (tabela vazia). As duas tasks entram no mesmo PR; não há deploy entre elas.

---

## Task 5: Aba Alunos sobre `useServerTable` (§4.6)

**Files:**
- Modify: `frontend/src/shared/api/studentsApi.ts`
- Modify: `frontend/src/features/identity/hooks/useStudentsPage.ts`
- Modify: `frontend/src/features/identity/components/Student/StudentsTable.tsx`
- Modify: `frontend/src/features/identity/components/Student/StudentsTab.tsx`
- Modify: `frontend/src/features/identity/components/PeoplePage.test.tsx:20-26`

**Interfaces:**
- Consumes: `pageEndpoint`, `useServerTable`, `useCrudDialog`, `ServerTable` (Task 3); `studentsApi.useOne` (fábrica).
- Produces: `useStudentsPage(): { table: ServerTable<StudentData>, dialog, openCreate, openView, openViewById, startEdit, close }`; `StudentsTable` recebe `table`.

- [ ] **Step 1: Catraca da D-04 continua e o mock passa a responder o envelope**

Em `PeoplePage.test.tsx`, troque o `beforeEach`:

```tsx
beforeEach(() => {
  gets.length = 0
  vi.spyOn(api, 'get').mockImplementation(((url: string) => {
    gets.push(url)
    // `/api/students` pagina no servidor (spec D1) e responde o envelope
    // `{ data, meta }`; as demais listas seguem array cru.
    if (url === '/api/students') {
      return Promise.resolve({ data: { data: [], meta: { page: 1, per_page: 10, total: 0, last_page: 1, total_unfiltered: 0 } } })
    }
    return Promise.resolve({ data: [] })
  }) as never)
})
```

Os três casos continuam iguais: `gtsDe('students')` conta a URL, e o `params` do axios é o segundo argumento — a contagem não muda.

Run: `cd frontend && pnpm test -- PeoplePage`
Expected: PASS ainda (a página antiga também faz um GET em `/api/students`). O que este passo prova é que a catraca não afrouxa com a mudança seguinte.

- [ ] **Step 2: `studentsApi` ganha o endpoint de página**

```ts
import { createCrudResource } from './createCrudResource'
import { pageEndpoint } from './page'
import type { StudentData } from '@shared/types/generated'

/** Cliente REST do recurso `students`. Camada de dados compartilhada (ADR-18).
 *
 * `page` é a listagem (spec D1: `GET /api/students` pagina no servidor);
 * `useList` da fábrica NÃO é usado — o endpoint devolve `{ data, meta }`, não
 * array. `useOne` É usado, pelo `useCrudDialog` (D14): o detalhe responde
 * `StudentDetailData`, superconjunto estrutural de `StudentData` (mesmos
 * campos mais `links`/`turmas`), sob a MESMA chave que `useStudentDetail` lê
 * (`features/identity/api/useStudentDetail.ts`) — o cache não fragmenta. */
export const studentsApi = {
  ...createCrudResource<StudentData>('students'),
  page: pageEndpoint<StudentData>('/api/students'),
}
```

- [ ] **Step 3: `useStudentsPage`**

```ts
import { useCrudDialog, useServerTable } from '@shared/hooks'
import { studentsApi } from '@shared/api/studentsApi'

/** A página de alunos: lista paginada no servidor + dialog por id.
 *
 * Parece delegação e não é: `useServerTable` chama `useQuery` por dentro,
 * então **este arquivo é o que mantém a query fora do componente**
 * (`no-restricted-syntax`, frontend-fsliced.md). `staleTime` pelo mesmo
 * motivo da `useRedatoresPage` (D-04): a aba desmonta na troca, e sem ele a
 * volta paga GET — catraca em `PeoplePage.test.tsx`. */
export function useStudentsPage() {
  const table = useServerTable(studentsApi.page, { key: studentsApi.keys.lists(), staleTime: 30_000 })
  const dialog = useCrudDialog(table.rows, studentsApi.useOne)

  return { table, ...dialog }
}
```

- [ ] **Step 4: `StudentsTable` recebe `table`**

```tsx
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { ServerTable } from '@shared/hooks'
import { AppColumn, IdentityCell, AppButton, AppEmptyState, SearchableTableFrame, stickyActionsColumn } from '@shared/ui'
import type { StudentData } from '@shared/types/generated'
import { studentWidths } from './studentColumns'

export function StudentsTable({
  table, onView, actions,
}: {
  /** Pronto do `useStudentsPage`: busca, página e sort vivem no servidor. A
   * tabela não instancia `useTableFilter` — filtrar no cliente uma página
   * seria filtrar 10 de 5.000. */
  table: ServerTable<StudentData>
  onView: (s: StudentData) => void
  actions?: ReactNode
}) {
  const { t } = useTranslation()
  const largura = studentWidths()

  return (
    <SearchableTableFrame
      table={table}
      totalRecords={table.totalRecords}
      sortField={table.sortField}
      sortOrder={table.sortOrder}
      onSort={table.onSort}
      searchPlaceholder={t('student.searchPlaceholder')}
      emptyState={
        <AppEmptyState icon="pi pi-user" title={t('student.empty')} description={t('student.emptyHint')} action={actions} />
      }
      footerCount={t('student.count', { count: table.totalRecords })}
      actions={actions}
      loading={table.loading}
      error={table.error}
      onRetry={table.refetch}
    >
      <AppColumn
        field="name"
        header={t('student.name')}
        sortable
        style={largura.name}
        body={(s: StudentData) => (
          <IdentityCell title={s.name} description={s.email} image={s.photo_url} />
        )}
      />
      <AppColumn
        field="rut"
        header={t('common.rut')}
        sortable
        style={largura.rut}
        body={(s: StudentData) => <span className="font-mono text-sm">{s.rut}</span>}
      />
      <AppColumn
        header={t('student.currentClient')}
        style={largura.currentClient}
        body={(s: StudentData) =>
          s.current_client_name ?? (
            <span style={{ color: 'var(--text-color-secondary)' }}>{t('student.noClient')}</span>
          )
        }
      />
      <AppColumn
        header={t('student.turmas')}
        style={largura.turmas}
        body={(s: StudentData) => <span className="font-semibold">{s.enrollments_count}</span>}
      />
      <AppColumn
        body={(s: StudentData) => (
          <AppButton icon="pi pi-eye" text rounded aria-label={t('common.view')} onClick={() => onView(s)} />
        )}
        style={stickyActionsColumn('6rem')}
      />
    </SearchableTableFrame>
  )
}
```

`StudentsTab.tsx` — a tabela troca de props:

```tsx
      <StudentsTable
        table={students.table}
        onView={students.openView}
        actions={
          can('identity.user.create')
            ? <AppButton variant="brandIcon" label={t('student.new')} icon="pi pi-user-plus" onClick={students.openCreate} />
            : undefined
        }
      />
```

O bloco `{students.dialog && <StudentDialog … />}` fica idêntico — `students.dialog.entity` continua `StudentData | null` (ou `StudentDetailData` vindo do `useOne`, que o satisfaz por estrutura).

- [ ] **Step 5: Gate e prova no navegador**

Run: `cd frontend && pnpm lint && pnpm build && pnpm test`
Expected: verde. O lint prova que `StudentsTab` continua sem `useQuery` (o hook mora em `useStudentsPage`).

Com o stack de pé (`docker compose up -d`, `pnpm dev`), em Chromium `es-CL`, `/personas` → aba Alumnos, aba Network: digitar "an" dispara UM `GET /api/students?page=1&per_page=10&q=an` depois da pausa; clicar no cabeçalho "Nombre" dispara `sort=-name`/`sort=name`; a página 2 dispara `page=2`. Anote as URLs em `docs/superpowers/audits/2026-08-28-hardening-performance-e-dados-medicoes.md` (seção "DoD 7 — Students"; o arquivo nasce aqui e a Task 12 o completa).

- [ ] **Step 6: Commit**

```bash
git add frontend/src/shared/api/studentsApi.ts frontend/src/features/identity docs/superpowers/audits/2026-08-28-hardening-performance-e-dados-medicoes.md
git commit -m "feat(identity): aba Alunos paginada no servidor com useServerTable e dialog com fallback useOne"
```

---
## Task 6: `GET /api/certificates` paginado — `display_status` em SQL com paridade (§4.2, §4.3)

**Files:**
- Create: `backend/app/Shared/Support/DataSql.php`
- Create: `backend/app/Domains/Certification/Data/CertificatePageRequest.php`
- Create: `backend/app/Domains/Certification/Data/CertificateSummaryData.php`
- Create: `backend/app/Domains/Certification/Data/CertificatePageMetaData.php`
- Modify: `backend/app/Domains/Certification/QueryBuilders/CertificateQueryBuilder.php`
- Modify: `backend/app/Domains/Certification/Http/Controllers/CertificateController.php:36-45`
- Modify: `backend/app/Domains/Certification/Data/CertificateData.php:51-57` (docblock)
- Modify: `backend/tests/Feature/Certification/CertificateListingTest.php`, `backend/tests/Feature/Certification/CertificateEagerLoadTest.php` (lista como `data`)
- Test: `backend/tests/Feature/Certification/CertificateDisplayStatusParityTest.php`, `backend/tests/Feature/Certification/CertificatePaginationTest.php`
- Regenera: `generated.ts` (`CertificateSummaryData`, `CertificatePageMetaData`)

**Interfaces:**
- Consumes: `Paginates`, `PageRequest`, `PageMetaData`, `PageData` (Task 2); `JanelaDeAviso::DIAS` (Task 1); `CertificateDisplayStatus::hoje()`.
- Produces: `DataSql::literal(Connection $c, CarbonInterface $d): string`; `CertificateQueryBuilder::whereDisplayStatus(?CertificateDisplayStatus)`, `summaryByDisplayStatus(): CertificateSummaryData`, `SORTABLE = ['created_at', 'codigo', 'valido_ate']`, `DEFAULT_SORT = '-created_at'`; `CertificatePageRequest { ?CertificateDisplayStatus $display_status }`; `CertificatePageMetaData extends PageMetaData { CertificateSummaryData $summary }` com `withSummary()`; `CertificateSummaryData { vigente, por_vencer, vencido, revocado }`.

- [ ] **Step 1: Teste de paridade que reprova**

```php
<?php

namespace Tests\Feature\Certification;

use App\Domains\Certification\Enums\CertificateDisplayStatus;
use App\Domains\Certification\Enums\CertificateStatus;
use App\Domains\Certification\Models\Certificate;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;
use Tests\Support\Certification\IssuableEnrollmentBuilder;
use Tests\TestCase;

/**
 * Catraca de paridade (spec D4, §4.3): o `CASE` de `whereDisplayStatus()` e a
 * classificação de domínio `CertificateDisplayStatus::for()` têm de devolver
 * os MESMOS conjuntos — paginar no servidor e filtrar no cliente é
 * contradição, e duas classificações que divergem num documento de peso legal
 * é o que este teste impede.
 *
 * Um certificado em cada ramo, com as bordas: `hoje` (vigente — vencer HOJE
 * ainda é vigente), `hoje + DIAS` (por vencer), `hoje + DIAS + 1` (vigente),
 * `valido_ate` nulo, e revogado com data futura (revogado vence a data).
 */
class CertificateDisplayStatusParityTest extends TestCase
{
    use RefreshDatabase;

    private int $seq = 0;

    protected function setUp(): void
    {
        parent::setUp();
        Carbon::setTestNow('2026-08-05 12:00:00');

        $hoje = CertificateDisplayStatus::hoje();

        $this->certificado(CertificateStatus::Emitido, null);
        $this->certificado(CertificateStatus::Emitido, $hoje->subDay()->toDateString());
        $this->certificado(CertificateStatus::Emitido, $hoje->toDateString());
        $this->certificado(CertificateStatus::Emitido, $hoje->addDay()->toDateString());
        $this->certificado(CertificateStatus::Emitido, $hoje->addDays(30)->toDateString());
        $this->certificado(CertificateStatus::Emitido, $hoje->addDays(31)->toDateString());
        $this->certificado(CertificateStatus::Revocado, $hoje->addDays(10)->toDateString());
        $this->certificado(CertificateStatus::Revocado, null);
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    public function test_o_filtro_sql_devolve_o_mesmo_conjunto_que_a_classificacao_de_dominio(): void
    {
        $hoje = CertificateDisplayStatus::hoje();
        $todos = Certificate::query()->get();
        $this->assertCount(8, $todos);

        foreach (CertificateDisplayStatus::cases() as $status) {
            $esperado = $todos
                ->filter(fn (Certificate $c) => CertificateDisplayStatus::for($c->status, $c->valido_ate, $hoje) === $status)
                ->pluck('id')->sort()->values()->all();

            $sql = Certificate::query()->whereDisplayStatus($status)->pluck('id')->sort()->values()->all();

            $this->assertSame($esperado, $sql, "Divergência em {$status->value}.");
            $this->assertNotSame([], $esperado, "Fixture sem exemplar de {$status->value} — o ramo não foi provado.");
        }
    }

    public function test_o_resumo_conta_cada_ramo_com_o_mesmo_case(): void
    {
        $resumo = Certificate::query()->summaryByDisplayStatus();

        $this->assertSame(
            ['vigente' => 3, 'por_vencer' => 2, 'vencido' => 1, 'revocado' => 2],
            ['vigente' => $resumo->vigente, 'por_vencer' => $resumo->por_vencer, 'vencido' => $resumo->vencido, 'revocado' => $resumo->revocado],
        );
    }

    private function certificado(CertificateStatus $status, ?string $validoAte): Certificate
    {
        $n = ++$this->seq;
        $builder = IssuableEnrollmentBuilder::make()
            ->client(['legal_name' => "Empresa {$n} SpA"], ['rut' => $this->rut(70000000 + $n)])
            ->course(['name' => "Curso {$n}"])
            ->student(['name' => "Alumno {$n}", 'rut' => $this->rut(16000000 + $n)])
            ->redatorUser(['rut' => $this->rut(15000000 + $n)])
            ->create();

        return Certificate::create([
            'uuid' => (string) Str::uuid(),
            'enrollment_id' => $builder->enrollmentModel()->id,
            'course_id' => $builder->courseModel()->id,
            'redator_id' => $builder->redatorModel()->id,
            'codigo' => 'LOT-2026-'.str_pad((string) (1000 + $n), 4, '0', STR_PAD_LEFT),
            'snapshot' => [
                'schema_version' => 2,
                'aluno' => ['name' => "Alumno {$n}", 'rut' => $this->rut(16000000 + $n)],
                'curso' => ['name' => "Curso {$n}"],
                'emissor' => ['name' => 'Lotus'],
            ],
            'valido_ate' => $validoAte,
            'status' => $status,
            'revoked_at' => $status === CertificateStatus::Revocado ? now() : null,
            'revocation_reason' => $status === CertificateStatus::Revocado ? 'teste' : null,
        ]);
    }

    /** RUT válido (módulo 11) a partir do número — nunca DV hardcoded. */
    private function rut(int $numero): string
    {
        foreach ([...range(0, 9), 'K'] as $dv) {
            $candidato = \App\Shared\Support\Rut::parse($numero.$dv);
            if ($candidato->isValid()) {
                return $candidato->format();
            }
        }

        throw new \RuntimeException("Sem DV válido para {$numero}.");
    }
}
```

- [ ] **Step 2: Rodar e ver reprovar**

Run: `docker compose exec -T app php artisan test --filter=CertificateDisplayStatusParityTest`
Expected: FAIL — `whereDisplayStatus` não existe.

- [ ] **Step 3: `DataSql`**

```php
<?php

namespace App\Shared\Support;

use Carbon\CarbonInterface;
use Illuminate\Database\Connection;

/**
 * Uma data como literal comparável a uma coluna `date`, por driver.
 *
 * O cast `date` do Eloquent GRAVA `Y-m-d 00:00:00` (`getDateFormat()`), e no
 * sqlite da suíte a coluna é texto: `valido_ate < '2026-08-05'` compara
 * strings e erra a borda (`'2026-08-05 00:00:00' < '2026-08-05'` é falso). No
 * MySQL a coluna é `DATE` e `'2026-08-05'` é o literal que deixa o índice
 * vivo — `DATE(valido_ate)` (o que `whereDate` gera) o mata.
 *
 * Usado pelo `CASE` de `display_status` e pela janela do painel de emissão.
 * Não é helper de formatação de tela: é a única forma de o mesmo SQL ser
 * verdadeiro nos dois engines sem uma segunda implementação por driver.
 */
final class DataSql
{
    public static function literal(Connection $connection, CarbonInterface $date): string
    {
        return $connection->getDriverName() === 'sqlite'
            ? $date->format('Y-m-d 00:00:00')
            : $date->format('Y-m-d');
    }
}
```

- [ ] **Step 4: Os três DTOs**

`CertificateSummaryData.php`:

```php
<?php

namespace App\Domains\Certification\Data;

use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/** Contagem por `display_status` sobre o escopo de `q` (spec D6) — o rodapé
 * do Historial, que antes somava a lista inteira no cliente. */
#[TypeScript]
class CertificateSummaryData extends Data
{
    public function __construct(
        public int $vigente,
        public int $por_vencer,
        public int $vencido,
        public int $revocado,
    ) {}
}
```

`CertificatePageMetaData.php`:

```php
<?php

namespace App\Domains\Certification\Data;

use App\Shared\Pagination\PageMetaData;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * O `meta` de `/api/certificates`: o contrato de página mais o resumo por
 * estado (spec D6). Extensão tipada, não campo solto — o front casa
 * `Page<CertificateData, CertificatePageMetaData>`.
 */
#[TypeScript]
class CertificatePageMetaData extends PageMetaData
{
    public function __construct(
        int $page,
        int $per_page,
        int $total,
        int $last_page,
        int $total_unfiltered,
        public CertificateSummaryData $summary,
    ) {
        parent::__construct($page, $per_page, $total, $last_page, $total_unfiltered);
    }

    public static function withSummary(PageMetaData $meta, CertificateSummaryData $summary): self
    {
        return new self($meta->page, $meta->per_page, $meta->total, $meta->last_page, $meta->total_unfiltered, $summary);
    }
}
```

`CertificatePageRequest.php`:

```php
<?php

namespace App\Domains\Certification\Data;

use App\Domains\Certification\Enums\CertificateDisplayStatus;
use App\Shared\Pagination\PageRequest;
use Illuminate\Validation\Rule;

/** `PageRequest` + o filtro nomeado do Historial. Valor fora do enum é 422. */
class CertificatePageRequest extends PageRequest
{
    public function __construct(
        int $page = 1,
        int $per_page = PageRequest::PER_PAGE_DEFAULT,
        ?string $q = null,
        ?string $sort = null,
        public ?CertificateDisplayStatus $display_status = null,
    ) {
        parent::__construct($page, $per_page, $q, $sort);
    }

    /** @return array<string, array<int, mixed>> */
    public static function rules(): array
    {
        return [
            ...parent::rules(),
            'display_status' => ['sometimes', 'nullable', Rule::enum(CertificateDisplayStatus::class)],
        ];
    }
}
```

- [ ] **Step 5: `CertificateQueryBuilder`**

```php
<?php

namespace App\Domains\Certification\QueryBuilders;

use App\Domains\Certification\Data\CertificateSummaryData;
use App\Domains\Certification\Enums\CertificateDisplayStatus;
use App\Domains\Certification\Enums\CertificateStatus;
use App\Shared\Pagination\Paginates;
use App\Shared\Support\DataSql;
use App\Shared\Support\JanelaDeAviso;
use Illuminate\Database\Eloquent\Builder;

/**
 * Projeção do certificado: `CertificateData::fromModel` lê a foto VIVA do
 * aluno (`aluno_photo_url`, D4 revertida em 2026-08-14) atravessando
 * matrícula→aluno→user, e a lista do que carregar mora AQUI, não em cada
 * caller (B5).
 *
 * Desde o bloco `hardening-performance-e-dados` também pagina (spec D1): o
 * histórico é arquivo legal que só cresce. `display_status` vira SQL num
 * `CASE` único — o mesmo para o filtro e para o resumo — cuja paridade com
 * `CertificateDisplayStatus::for()` é catraca (`CertificateDisplayStatusParityTest`).
 * A ordem dos `WHEN` É a regra do enum: revogado antes de qualquer data; nulo
 * é vigente; anterior a hoje é vencido; HOJE ainda é vigente; até `DIAS` avisa.
 */
class CertificateQueryBuilder extends Builder
{
    use Paginates;

    public const LISTING = ['enrollment.student.user'];

    public const SORTABLE = [
        'created_at' => 'certificates.created_at',
        'codigo' => 'certificates.codigo',
        'valido_ate' => 'certificates.valido_ate',
    ];

    public const DEFAULT_SORT = '-created_at';

    public function withListingData(): static
    {
        return $this->with(self::LISTING);
    }

    /**
     * `codigo` e o aluno CONGELADO no snapshot (nome e RUT), por JSON path —
     * a listagem mostra o snapshot, então a busca varre o que a tela mostra.
     * Medido com `EXPLAIN` a 6k linhas na Task 12; se degradar, o plano B é
     * coluna gerada indexada (spec §4.2).
     */
    public function searchable(string $q): static
    {
        $like = '%'.addcslashes($q, '%_\\').'%';

        return $this->where(fn (Builder $w) => $w
            ->where('certificates.codigo', 'like', $like)
            ->orWhere('snapshot->aluno->name', 'like', $like)
            ->orWhere('snapshot->aluno->rut', 'like', $like));
    }

    public function whereDisplayStatus(?CertificateDisplayStatus $status): static
    {
        if ($status === null) {
            return $this;
        }

        [$case, $bindings] = $this->displayStatusCase();

        return $this->whereRaw("({$case}) = ?", [...$bindings, $status->value]);
    }

    /**
     * Um `GROUP BY` sobre o escopo atual (sem o filtro de status — o resumo é
     * o que o usuário escolhe A PARTIR dele, spec §4.2). Clone: não mexe na
     * query que vai paginar.
     */
    public function summaryByDisplayStatus(): CertificateSummaryData
    {
        [$case, $bindings] = $this->displayStatusCase();

        $contagens = (clone $this)
            ->reorder()
            ->selectRaw("({$case}) as display_status, count(*) as total", $bindings)
            ->groupBy('display_status')
            ->toBase()
            ->pluck('total', 'display_status');

        return new CertificateSummaryData(
            vigente: (int) ($contagens['vigente'] ?? 0),
            por_vencer: (int) ($contagens['por_vencer'] ?? 0),
            vencido: (int) ($contagens['vencido'] ?? 0),
            revocado: (int) ($contagens['revocado'] ?? 0),
        );
    }

    /**
     * O `CASE` e as bindings dele. `hoje` é calculado UMA vez por chamada, em
     * `America/Santiago`, como o `fromModel` faz.
     *
     * @return array{0: string, 1: list<string>}
     */
    private function displayStatusCase(): array
    {
        $hoje = CertificateDisplayStatus::hoje();
        $conexao = $this->getModel()->getConnection();
        $hojeSql = DataSql::literal($conexao, $hoje);
        $limiteSql = DataSql::literal($conexao, $hoje->addDays(JanelaDeAviso::DIAS));

        $case = 'CASE'
            .' WHEN certificates.status = ? THEN ?'
            .' WHEN certificates.valido_ate IS NULL THEN ?'
            .' WHEN certificates.valido_ate < ? THEN ?'
            .' WHEN certificates.valido_ate = ? THEN ?'
            .' WHEN certificates.valido_ate <= ? THEN ?'
            .' ELSE ? END';

        return [$case, [
            CertificateStatus::Revocado->value, CertificateDisplayStatus::Revocado->value,
            CertificateDisplayStatus::Vigente->value,
            $hojeSql, CertificateDisplayStatus::Vencido->value,
            $hojeSql, CertificateDisplayStatus::Vigente->value,
            $limiteSql, CertificateDisplayStatus::PorVencer->value,
            CertificateDisplayStatus::Vigente->value,
        ]];
    }
}
```

Run: `docker compose exec -T app php artisan test --filter=CertificateDisplayStatusParityTest`
Expected: PASS (2 testes). **Veja reprovar:** troque `valido_ate < ?` por `valido_ate <= ?` no CASE — o ramo `vencido` engole o `hoje` e o teste acusa "Divergência em vencido"; desfaça.

- [ ] **Step 6: Controller e teste de endpoint**

`CertificateController.php`:

```php
use App\Domains\Certification\Data\CertificatePageMetaData;
use App\Domains\Certification\Data\CertificatePageRequest;
use App\Domains\Certification\QueryBuilders\CertificateQueryBuilder;
use App\Shared\Pagination\PageData;
use App\Shared\Pagination\PageMetaData;
// ...
    /**
     * Página do Historial (spec D1, D6): o filtro de estado vai ao SQL e o
     * resumo do rodapé sai do MESMO `CASE`, sobre o escopo de `q`.
     *
     * @return PageData<CertificateData>
     */
    public function index(CertificatePageRequest $request): PageData
    {
        return Certificate::query()
            ->withListingData()
            ->page(
                $request,
                fn (Certificate $certificate) => CertificateData::fromModel($certificate),
                filter: fn (CertificateQueryBuilder $q) => $q->whereDisplayStatus($request->display_status),
                meta: fn (PageMetaData $meta, CertificateQueryBuilder $escopo) => CertificatePageMetaData::withSummary($meta, $escopo->summaryByDisplayStatus()),
            );
    }
```

Em `CertificateData.php:51-57`, troque "A listagem não pagina — o histórico é arquivo legal e só cresce —, e ler duas vezes aqui custava dois decodes por linha." por "A listagem pagina desde o bloco `hardening-performance-e-dados`, mas cada página são até 100 decodes, e ler duas vezes aqui dobrava isso."

`CertificatePaginationTest.php` — reusa a fixture da paridade (copie os métodos `certificado()` e `rut()` — o teste de endpoint prova outra coisa e não depende do de paridade):

```php
<?php

namespace Tests\Feature\Certification;

use App\Domains\Certification\Enums\CertificateDisplayStatus;
use App\Domains\Certification\Enums\CertificateStatus;
use App\Domains\Certification\Models\Certificate;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;
use Tests\Support\Certification\IssuableEnrollmentBuilder;
use Tests\TestCase;

/** DoD 2 da spec sobre `GET /api/certificates`. */
class CertificatePaginationTest extends TestCase
{
    use RefreshDatabase;

    private int $seq = 0;

    protected function setUp(): void
    {
        parent::setUp();
        Carbon::setTestNow('2026-08-05 12:00:00');
        $this->actingAsAdmin();

        $hoje = CertificateDisplayStatus::hoje();
        $this->certificado(CertificateStatus::Emitido, null);                                  // vigente, LOT-2026-1001
        Carbon::setTestNow('2026-08-05 12:00:01');
        $this->certificado(CertificateStatus::Emitido, $hoje->addDays(5)->toDateString());     // por_vencer, 1002
        Carbon::setTestNow('2026-08-05 12:00:02');
        $this->certificado(CertificateStatus::Emitido, $hoje->subDays(5)->toDateString());     // vencido, 1003
        Carbon::setTestNow('2026-08-05 12:00:03');
        $this->certificado(CertificateStatus::Revocado, null);                                 // revocado, 1004
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    public function test_display_status_filtra_e_o_resumo_soma_o_escopo_inteiro(): void
    {
        $response = $this->getJson('/api/certificates?display_status=por_vencer')->assertOk();

        $this->assertSame(['por_vencer'], array_unique(array_column($response->json('data'), 'display_status')));
        $response->assertJsonPath('meta.total', 1)->assertJsonPath('meta.total_unfiltered', 4);

        $summary = $response->json('meta.summary');
        $this->assertSame(['vigente' => 1, 'por_vencer' => 1, 'vencido' => 1, 'revocado' => 1], $summary);
        $this->assertSame($response->json('meta.total_unfiltered'), array_sum($summary));
    }

    public function test_default_ordena_por_created_at_decrescente_e_sort_codigo_inverte(): void
    {
        $this->assertSame(
            ['LOT-2026-1004', 'LOT-2026-1003', 'LOT-2026-1002', 'LOT-2026-1001'],
            array_column($this->getJson('/api/certificates')->assertOk()->json('data'), 'codigo'),
        );
        $this->assertSame(
            ['LOT-2026-1001', 'LOT-2026-1002', 'LOT-2026-1003', 'LOT-2026-1004'],
            array_column($this->getJson('/api/certificates?sort=codigo')->assertOk()->json('data'), 'codigo'),
        );
    }

    public function test_q_varre_codigo_e_o_aluno_do_snapshot_e_o_resumo_segue_o_q(): void
    {
        $porCodigo = $this->getJson('/api/certificates?q=1003')->assertOk();
        $this->assertSame(['LOT-2026-1003'], array_column($porCodigo->json('data'), 'codigo'));
        // O resumo é sobre o escopo de `q`: só o vencido sobrou.
        $porCodigo->assertJsonPath('meta.summary.vencido', 1)->assertJsonPath('meta.summary.vigente', 0);

        $porAluno = $this->getJson('/api/certificates?q=Alumno 2')->assertOk();
        $this->assertSame(['LOT-2026-1002'], array_column($porAluno->json('data'), 'codigo'));
    }

    public function test_display_status_fora_do_enum_e_422(): void
    {
        $this->getJson('/api/certificates?display_status=foo')
            ->assertStatus(422)
            ->assertHeader('Content-Type', 'application/problem+json');
    }

    private function certificado(CertificateStatus $status, ?string $validoAte): Certificate
    {
        // Idêntico ao de CertificateDisplayStatusParityTest (ver lá o porquê da fixture).
        $n = ++$this->seq;
        $builder = IssuableEnrollmentBuilder::make()
            ->client(['legal_name' => "Empresa {$n} SpA"], ['rut' => $this->rut(70000000 + $n)])
            ->course(['name' => "Curso {$n}"])
            ->student(['name' => "Alumno {$n}", 'rut' => $this->rut(16000000 + $n)])
            ->redatorUser(['rut' => $this->rut(15000000 + $n)])
            ->create();

        return Certificate::create([
            'uuid' => (string) Str::uuid(),
            'enrollment_id' => $builder->enrollmentModel()->id,
            'course_id' => $builder->courseModel()->id,
            'redator_id' => $builder->redatorModel()->id,
            'codigo' => 'LOT-2026-'.str_pad((string) (1000 + $n), 4, '0', STR_PAD_LEFT),
            'snapshot' => [
                'schema_version' => 2,
                'aluno' => ['name' => "Alumno {$n}", 'rut' => $this->rut(16000000 + $n)],
                'curso' => ['name' => "Curso {$n}"],
                'emissor' => ['name' => 'Lotus'],
            ],
            'valido_ate' => $validoAte,
            'status' => $status,
            'revoked_at' => $status === CertificateStatus::Revocado ? now() : null,
            'revocation_reason' => $status === CertificateStatus::Revocado ? 'teste' : null,
        ]);
    }

    private function rut(int $numero): string
    {
        foreach ([...range(0, 9), 'K'] as $dv) {
            $candidato = \App\Shared\Support\Rut::parse($numero.$dv);
            if ($candidato->isValid()) {
                return $candidato->format();
            }
        }

        throw new \RuntimeException("Sem DV válido para {$numero}.");
    }
}
```

- [ ] **Step 7: Adaptar os testes que liam a lista como array**

Run: `grep -rn "'/api/certificates'" backend/tests`

`CertificateListingTest` (`assertJsonCount(2)` → `(2, 'data')`, `assertJsonPath('0.id', …)` → `'data.0.id'`, `json('0.…')` → `json('data.0.…')`, e o caso do snapshot corrompido idem) e `CertificateEagerLoadTest` (`assertJsonCount(2, 'data')`, `json('data.0.aluno_photo_url')`).

Run: `docker compose exec -T app php artisan test --filter='Certificate'`
Expected: PASS em toda a pasta.

- [ ] **Step 8: Regenerar tipos, Pint, commit**

Run: `docker compose exec -T app php artisan typescript:transform && git diff --stat frontend/src/shared/types/generated.ts && cd frontend && pnpm build && cd ..`
Expected: `CertificateSummaryData` e `CertificatePageMetaData` novos; build verde (o front ainda tipa `useCertificates` como array — a Task 7 troca; sem deploy entre as duas).

```bash
cd backend && ./vendor/bin/pint app/Shared/Support/DataSql.php app/Domains/Certification tests/Feature/Certification && cd ..
git add backend/app/Shared/Support/DataSql.php backend/app/Domains/Certification backend/tests/Feature/Certification frontend/src/shared/types/generated.ts
git commit -m "feat(certification): GET /api/certificates paginado com display_status em SQL e resumo no meta"
```

---

## Task 7: Historial sobre `useServerTable` (§4.6)

**Files:**
- Modify: `frontend/src/features/certification/api/certificatesApi.ts:11,25-37`
- Modify: `frontend/src/features/certification/api/certificatesApi.test.tsx`
- Modify: `frontend/src/features/certification/hooks/useHistorial.ts`
- Modify: `frontend/src/features/certification/components/Historial/HistorialTable.tsx:33-36,63-72,97-106`
- Modify: `frontend/src/features/certification/components/Historial/HistorialTable.test.tsx:51-64`

**Interfaces:**
- Consumes: `pageEndpoint`, `useServerTable` (Task 3); `CertificatePageMetaData` gerado (Task 6).
- Produces: `certificatesPage`, `listKey` exportado, `certificatesTableOptions`; `useHistorial().table: ServerTable<CertificateData, CertificatePageMetaData>`; `statusSummary` lido de `meta.summary`.

- [ ] **Step 1: A catraca do foco muda de sujeito e reprova**

Reescreva `certificatesApi.test.tsx`:

```tsx
import { describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider, focusManager } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { api } from '@shared/api/axios'
import { useServerTable } from '@shared/hooks'
import { certificatesPage, certificatesTableOptions } from './certificatesApi'

vi.mock('@shared/api/axios', () => ({
  api: { get: vi.fn() },
}))

const get = vi.mocked(api.get)

/**
 * O wrapper repete o default do `AppProviders` de propósito
 * (`refetchOnWindowFocus: false`): sem ele, a query passaria neste teste pelo
 * default do TanStack e a catraca não provaria nada.
 */
function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { refetchOnWindowFocus: false, retry: false } },
  })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

describe('a página do Historial — revalidação do estado derivado', () => {
  /**
   * `display_status` é derivado no servidor a partir do "hoje" de Santiago, e
   * congela no fetch. A aba do Historial fica aberta o dia inteiro: sem
   * revalidar, um certificado que venceu à meia-noite continua com a tag
   * `vigente` até alguém remontar a tela — estado errado sobre documento de
   * peso legal (Q-1 do review de 2026-08-24). Com a lista paginada, a opção
   * viaja em `certificatesTableOptions` e é o `useServerTable` que a entrega
   * ao `useQuery` — é isso que se prova aqui.
   */
  it('revalida quando a janela volta ao foco, contra o default do AppProviders', async () => {
    get.mockResolvedValue({ data: { data: [], meta: { page: 1, per_page: 10, total: 0, last_page: 1, total_unfiltered: 0, summary: { vigente: 0, por_vencer: 0, vencido: 0, revocado: 0 } } } })

    const { result } = renderHook(() => useServerTable(certificatesPage, certificatesTableOptions), { wrapper })

    await waitFor(() => expect(result.current.meta).toBeDefined())
    expect(get).toHaveBeenCalledTimes(1)

    act(() => {
      focusManager.setFocused(false)
      focusManager.setFocused(true)
    })

    await waitFor(() => expect(get).toHaveBeenCalledTimes(2))

    focusManager.setFocused(undefined)
  })
})
```

Run: `cd frontend && pnpm test -- certificatesApi`
Expected: FAIL — `certificatesPage`/`certificatesTableOptions` não existem.

- [ ] **Step 2: `certificatesApi.ts`**

Substitua `useCertificates` (linhas 25–37) e exporte `listKey`:

```ts
import { pageEndpoint } from '@shared/api/page'
import type { CertificatePageMetaData } from '@shared/types/generated'
// ...
const panelKey = ['certificates', 'emission-panel'] as const
export const listKey = ['certificates', 'list'] as const
const detailKey = (id: number) => ['certificates', 'detail', id] as const

/** A página do Historial (spec D1): busca, filtro de estado e ordenação no
 * servidor, resumo por estado no `meta` (D6). */
export const certificatesPage = pageEndpoint<CertificateData, CertificatePageMetaData>('/api/certificates')

/** `refetchOnWindowFocus` vence o default `false` do `AppProviders`: o
 * `display_status` de cada linha é derivado no servidor a partir do "hoje" de
 * Santiago e congela no fetch. Aba do Historial aberta atravessando a
 * meia-noite mostraria `vigente` sobre certificado já vencido (Q-1 do review
 * de 2026-08-24). Catraca em `certificatesApi.test.tsx`. Limite conhecido: a
 * aba que nunca perde o foco só corrige no próximo remonte. */
export const certificatesTableOptions = { key: listKey, refetchOnWindowFocus: true } as const
```

O `useInvalidate()` continua invalidando `listKey` — o prefixo cobre `[...listKey, 'page', query]` de toda página em cache.

- [ ] **Step 3: `useHistorial.ts`**

```ts
import { useState } from 'react'
import { usePermissions, useServerTable } from '@shared/hooks'
import type {
  CertificateData,
  CertificateDisplayStatus,
  CertificatePageMetaData,
  EmissionPanelEnrollmentData,
  EmissionPanelTurmaData,
} from '@shared/types/generated'
import { certificatesPage, certificatesTableOptions, useCertificate, useEmissionPanel } from '../api/certificatesApi'

export type ReissueTarget = { enrollment: EmissionPanelEnrollmentData; turma: EmissionPanelTurmaData }

/**
 * Estado da aba Historial: a página do servidor (`useServerTable` sobre
 * `certificatesPage`, com busca, filtro `display_status` e sort no backend —
 * spec D1/D4) + contagens por estado lidas de `meta.summary` (D6) + a query
 * pontual do `Ver` (`useCertificate`, mesmo padrão do `useEmissionPanelState`)
 * + a localização da matrícula/turma no painel de emissão (`useEmissionPanel`,
 * já em cache pela aba Emisión) para o Reemitir. A query mora aqui, não no
 * componente: `no-restricted-syntax` reprova `useQuery`/`useMutation` sob
 * `features/*\/components/**`.
 *
 * `loadError` segue `loadFailure` (`{}` sem corpo) desde que a lista vem do
 * `useServerTable` — a exceção que a rule registrava para este hook acabou.
 */
export function useHistorial() {
  const { can } = usePermissions()
  // O painel só alimenta o Reemitir, que já exige `issue` — para quem só tem
  // `view`, a query desligada evita um 403 garantido no mount da aba.
  const panel = useEmissionPanel(can('certification.certificate.issue'))

  const [statusFilter, setStatusFilter] = useState<CertificateDisplayStatus | null>(null)
  const [viewingCertificateId, setViewingCertificateId] = useState<number | null>(null)
  const [revoking, setRevoking] = useState<CertificateData | null>(null)
  const [reissuing, setReissuing] = useState<CertificateData | null>(null)
  const viewingCertificate = useCertificate(viewingCertificateId)

  // Trocar o filtro volta à página 1 dentro do hook — não há `resetPage()` a
  // chamar aqui, ao contrário do que `TurmasTable`/`BudgetsTable` faziam à mão.
  const table = useServerTable<CertificateData, CertificatePageMetaData>(certificatesPage, {
    ...certificatesTableOptions,
    filters: { display_status: statusFilter },
  })

  /** Reemissão concluída: fecha a confirmação e abre o diálogo do certificado
   * novo. É UMA transição — enquanto `reissuing` morava no componente e
   * `viewingCertificateId` aqui, ela vivia metade no JSX e metade no hook. */
  const openIssuedCertificate = (certificate: CertificateData) => {
    setReissuing(null)
    setViewingCertificateId(certificate.id)
  }

  // Só o filtro de estado: a composição com a busca é da moldura, que exige
  // este callback junto do `filterSlot` (SearchableTableFrame).
  const clearStatusFilter = () => setStatusFilter(null)

  // Do `meta` (spec D6): contado no servidor sobre o escopo de `q`, com o
  // MESMO `CASE` do filtro. Zeros antes do primeiro GET.
  const statusSummary = {
    vigentes: table.meta?.summary.vigente ?? 0,
    porVencer: table.meta?.summary.por_vencer ?? 0,
    vencidos: table.meta?.summary.vencido ?? 0,
    revocados: table.meta?.summary.revocado ?? 0,
  }

  /** Acha a matrícula/turma do painel de emissão pelo `enrollment_id` do
   * certificado — o painel só sabe falar de matrícula, não de certificado
   * revogado. `null` quando a turma não aparece mais no painel. */
  const findReissueTarget = (certificate: CertificateData): ReissueTarget | null => {
    for (const turma of panel.data ?? []) {
      const enrollment = turma.enrollments.find((e) => e.enrollment_id === certificate.enrollment_id)
      if (enrollment) return { enrollment, turma }
    }
    return null
  }

  return {
    table,
    statusFilter,
    setStatusFilter,
    clearStatusFilter,
    statusSummary,
    loading: table.loading,
    loadError: table.error,
    reload: table.refetch,
    // `can()` é conveniência de interface; a API é que autoriza (ADR-07).
    canRevoke: can('certification.certificate.revoke'),
    canReissue: can('certification.certificate.issue'),
    viewingCertificateId,
    setViewingCertificateId,
    revoking,
    setRevoking,
    reissuing,
    setReissuing,
    openIssuedCertificate,
    viewingCertificate: viewingCertificate.data ?? null,
    viewingCertificateLoading: viewingCertificate.isLoading,
    viewingCertificateError: viewingCertificate.isError ? (viewingCertificate.error ?? null) : null,
    reloadViewingCertificate: (): Promise<unknown> => viewingCertificate.refetch(),
    findReissueTarget,
    reissuePanelLoading: panel.isLoading,
    reissuePanelError: panel.isError ? (panel.error ?? null) : null,
    reissuePanelReload: (): Promise<unknown> => panel.refetch(),
  }
}
```

- [ ] **Step 4: `HistorialTable.tsx` — moldura lazy e colunas ordenáveis**

No `<SearchableTableFrame>`, logo depois de `table={h.table}`:

```tsx
        totalRecords={h.table.totalRecords}
        sortField={h.table.sortField}
        sortOrder={h.table.sortOrder}
        onSort={h.table.onSort}
```

As três colunas da allowlist ganham `field` + `sortable` (o `field` é o nome que vai em `sort=`): `colCodigo` → `field="codigo" sortable`; `colIssuedAt` → `field="created_at" sortable`; `colValidUntil` → `field="valido_ate" sortable`. Nada mais muda no arquivo — a coluna do estado, as ações e os diálogos ficam como estão (é o único arquivo que a `lane-c` também toca; spec §8).

- [ ] **Step 5: `HistorialTable.test.tsx` — a forma do `table`**

No `montar()`, o literal `table` ganha os campos lazy (a moldura os lê como props):

```tsx
    table: {
      filter: '',
      term: '',
      filtering: false,
      filteredByScope: false,
      rows: [c],
      first: 0,
      onFilterChange: () => {},
      onPage: () => {},
      clear: () => {},
      totalRecords: 1,
      sortField: undefined,
      sortOrder: 0,
      onSort: () => {},
    },
```

Run: `cd frontend && pnpm lint && pnpm build && pnpm test`
Expected: verde. `pnpm build` prova que nenhum consumidor de `useCertificates` sobrou (o `grep -rn useCertificates frontend/src` devolve só docblocks — apague a menção em `useEmissionPanelState.ts:25` e `certificatesApi.ts:42`, trocando por "a página inteira do Historial").

- [ ] **Step 6: Prova no navegador e commit**

Chromium `es-CL`, `/certificados` → Historial, aba Network: dropdown "Por vencer" dispara `display_status=por_vencer&page=1`; rodapé conta `meta.summary`; busca por RUT dispara `q=`; cabeçalho "Código" dispara `sort=codigo`. Anote na `audits/…-medicoes.md` (seção "DoD 7 — Historial").

```bash
git add frontend/src/features/certification docs/superpowers/audits/2026-08-28-hardening-performance-e-dados-medicoes.md
git commit -m "feat(certification): Historial paginado no servidor com filtro de estado e resumo do meta"
```

---
## Task 8: `GET /api/turmas` e `/turmas/archived` paginados — `status` em SQL com paridade (§4.2, §4.3)

**Files:**
- Create: `backend/app/Domains/Operation/Enums/TurmaDisplayStatus.php`
- Create: `backend/app/Domains/Operation/Data/TurmaPageRequest.php`
- Modify: `backend/app/Domains/Operation/QueryBuilders/TurmaQueryBuilder.php`
- Modify: `backend/app/Domains/Operation/Http/Controllers/TurmaController.php:49-55,87-101`
- Modify: testes que leem `/api/turmas` ou `/api/turmas/archived` como array: `TurmaArchiveEndpointTest`, `TurmaCrudTest`, `TurmaOwnershipTest`, `TurmaQueryBuilderTest`, `ContratanteEagerLoadTest`
- Test: `backend/tests/Feature/Operation/TurmaStatusParityTest.php`, `backend/tests/Feature/Operation/TurmaPaginationTest.php`
- Regenera: `generated.ts` (`TurmaDisplayStatus`)

**Interfaces:**
- Consumes: `Paginates`, `PageRequest`, `PageData` (Task 2); `TurmaHabilitacaoService`, `HabilitacaoStatus`, `TurmaDocumentType`, `ArchiveTrailQuery::archivedBy`.
- Produces: enum `TurmaDisplayStatus { EmAndamento, Habilitada, Concluida }` (gerado no TS sem atributo, como `CertificateDisplayStatus`); `TurmaQueryBuilder::whereDisplayStatus(?TurmaDisplayStatus, bool $asOfArchiving = false)`, `SORTABLE = ['created_at', 'start_date', 'end_date']`, `DEFAULT_SORT = '-created_at'`, `searchable()`; `TurmaPageRequest { ?TurmaDisplayStatus $status }`; `GET /api/turmas` → `PageData<TurmaData>`, `GET /api/turmas/archived` → `PageData<ArchivedTurmaData>`.

- [ ] **Step 1: Teste de paridade que reprova**

```php
<?php

namespace Tests\Feature\Operation;

use App\Domains\Operation\Enums\TurmaDisplayStatus;
use App\Domains\Operation\Enums\TurmaDocumentType;
use App\Domains\Operation\Enums\TurmaModalidade;
use App\Domains\Operation\Enums\TurmaStatus;
use App\Domains\Operation\Models\Turma;
use App\Domains\Operation\Services\TurmaHabilitacaoService;
use App\Shared\Files\Models\File;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\Certification\IssuableEnrollmentBuilder;
use Tests\TestCase;

/**
 * Catraca de paridade (spec D4, §4.3): `whereDisplayStatus()` em SQL tem de
 * devolver o MESMO conjunto que a derivação de domínio — `concluida` pelo
 * status, `habilitada` pela `HabilitacaoStatus` da RN-16, `em_andamento` o
 * resto. Cinco turmas: concluída; em andamento com os três documentos; com
 * dois; com nenhum; com os três, um deles arquivado (não conta). Mais a lista
 * de arquivados, onde a leitura é "como estava no instante do arquivamento"
 * (`asOfArchiving`): documento levado pela cascata conta, documento arquivado
 * ANTES do pai não.
 */
class TurmaStatusParityTest extends TestCase
{
    use RefreshDatabase;

    private int $seq = 0;

    /** O front derivava assim (`turmaStatus.ts`): concluida > habilitada > em_andamento. */
    private function derivada(Turma $turma): TurmaDisplayStatus
    {
        if ($turma->status === TurmaStatus::Concluida) {
            return TurmaDisplayStatus::Concluida;
        }

        return app(TurmaHabilitacaoService::class)->for($turma)->isHabilitada()
            ? TurmaDisplayStatus::Habilitada
            : TurmaDisplayStatus::EmAndamento;
    }

    public function test_lista_ativa_o_sql_casa_com_a_derivacao_de_dominio(): void
    {
        $this->turma(concluida: true, docs: TurmaDocumentType::cases());
        $this->turma(concluida: false, docs: TurmaDocumentType::cases());
        $this->turma(concluida: false, docs: [TurmaDocumentType::MANUAL, TurmaDocumentType::PRUEBAS]);
        $this->turma(concluida: false, docs: []);
        $comDocArquivado = $this->turma(concluida: false, docs: TurmaDocumentType::cases());
        $comDocArquivado->files()->where('type', TurmaDocumentType::EVALUACION_REDATOR->value)->first()->delete();

        $todas = Turma::query()->withListingData()->get();
        $this->assertCount(5, $todas);

        foreach (TurmaDisplayStatus::cases() as $status) {
            $esperado = $todas->filter(fn (Turma $t) => $this->derivada($t) === $status)->pluck('id')->sort()->values()->all();
            $sql = Turma::query()->whereDisplayStatus($status)->pluck('id')->sort()->values()->all();

            $this->assertSame($esperado, $sql, "Divergência em {$status->value}.");
            $this->assertNotSame([], $esperado, "Fixture sem exemplar de {$status->value}.");
        }
    }

    public function test_lista_arquivada_le_a_documentacao_como_no_instante_do_arquivamento(): void
    {
        // Os três docs vão junto pela cascata: arquivada, continua "habilitada".
        $habilitada = $this->turma(concluida: false, docs: TurmaDocumentType::cases());
        // Um doc arquivado ANTES do pai: não volta com ele e não conta.
        $incompleta = $this->turma(concluida: false, docs: TurmaDocumentType::cases());
        $incompleta->files()->where('type', TurmaDocumentType::MANUAL->value)->first()->delete();
        $concluida = $this->turma(concluida: true, docs: TurmaDocumentType::cases());

        foreach ([$habilitada, $incompleta, $concluida] as $turma) {
            $turma->delete();
        }

        $arquivadas = Turma::onlyTrashed()->withArchivedListingData()->get();
        $this->assertCount(3, $arquivadas);

        foreach (TurmaDisplayStatus::cases() as $status) {
            $esperado = $arquivadas->filter(fn (Turma $t) => $this->derivada($t) === $status)->pluck('id')->sort()->values()->all();
            $sql = Turma::onlyTrashed()->whereDisplayStatus($status, asOfArchiving: true)->pluck('id')->sort()->values()->all();

            $this->assertSame($esperado, $sql, "Divergência em {$status->value} (arquivadas).");
        }

        $this->assertSame([$habilitada->id], Turma::onlyTrashed()->whereDisplayStatus(TurmaDisplayStatus::Habilitada, asOfArchiving: true)->pluck('id')->all());
    }

    /** @param  array<TurmaDocumentType>  $docs */
    private function turma(bool $concluida, array $docs): Turma
    {
        $n = ++$this->seq;
        $builder = IssuableEnrollmentBuilder::make()
            ->client(['legal_name' => "Empresa {$n} SpA"], ['rut' => "1.000.".str_pad((string) $n, 3, '0', STR_PAD_LEFT).'-0'])
            ->course(['name' => "Curso {$n}"])
            ->student(['rut' => "2.000.".str_pad((string) $n, 3, '0', STR_PAD_LEFT).'-0'])
            ->redatorUser(['rut' => "3.000.".str_pad((string) $n, 3, '0', STR_PAD_LEFT).'-0'])
            ->turma(['modalidade' => TurmaModalidade::Presencial, 'local_aplicacao' => 'Santiago']);

        if (! $concluida) {
            $builder->turmaNaoConcluida();
        }

        $turma = $builder->create()->turmaModel();

        foreach ($docs as $type) {
            $turma->files()->create([
                'type' => $type->value, 'path' => 'x.pdf', 'original_name' => 'x.pdf',
                'mime' => 'application/pdf', 'size' => 10,
            ]);
        }

        return $turma;
    }
}
```

> Os RUTs `1.000.NNN-0` seguem o `nextRut()` de `ContratanteEagerLoadTest` — a `ValidRut` não roda em `User::factory()->create()`, e o que importa aqui é a unicidade.

- [ ] **Step 2: Rodar e ver reprovar**

Run: `docker compose exec -T app php artisan test --filter=TurmaStatusParityTest`
Expected: FAIL — `App\Domains\Operation\Enums\TurmaDisplayStatus` não existe.

- [ ] **Step 3: Enum e request**

`TurmaDisplayStatus.php`:

```php
<?php

namespace App\Domains\Operation\Enums;

/**
 * O estado de EXIBIÇÃO da turma, agora do backend. `TurmaStatus` tem dois
 * valores porque é o que o banco guarda; a tela mostra três — `habilitada` é
 * a RN-16 derivada (`TurmaHabilitacaoService`, nunca persistida). O front
 * derivava em `features/operation/lib/turmaStatus.ts`; com a lista paginada o
 * filtro tem de ser SQL (`TurmaQueryBuilder::whereDisplayStatus`), e a
 * paridade entre os dois é catraca (`TurmaStatusParityTest`).
 *
 * Sem `#[TypeScript]`, como `CertificateDisplayStatus`: o transformer já
 * emite os enums de `app/`. Chave i18n: `operation.status.<valor>`.
 */
enum TurmaDisplayStatus: string
{
    case EmAndamento = 'em_andamento';
    case Habilitada = 'habilitada';
    case Concluida = 'concluida';
}
```

`TurmaPageRequest.php`:

```php
<?php

namespace App\Domains\Operation\Data;

use App\Domains\Operation\Enums\TurmaDisplayStatus;
use App\Shared\Pagination\PageRequest;
use Illuminate\Validation\Rule;

/** `PageRequest` + o filtro de estado do hub de turmas (ativo e arquivado). */
class TurmaPageRequest extends PageRequest
{
    public function __construct(
        int $page = 1,
        int $per_page = PageRequest::PER_PAGE_DEFAULT,
        ?string $q = null,
        ?string $sort = null,
        public ?TurmaDisplayStatus $status = null,
    ) {
        parent::__construct($page, $per_page, $q, $sort);
    }

    /** @return array<string, array<int, mixed>> */
    public static function rules(): array
    {
        return [
            ...parent::rules(),
            'status' => ['sometimes', 'nullable', Rule::enum(TurmaDisplayStatus::class)],
        ];
    }
}
```

- [ ] **Step 4: `TurmaQueryBuilder`**

Acrescente `use Paginates;`, as constantes e os métodos (o resto do arquivo fica igual):

```php
use App\Domains\Operation\Enums\TurmaDisplayStatus;
use App\Domains\Operation\Enums\TurmaDocumentType;
use App\Domains\Operation\Enums\TurmaStatus;
use App\Shared\Pagination\Paginates;
// ...
class TurmaQueryBuilder extends Builder
{
    use LoadsCascadedChildren;
    use Paginates;

    // ... LISTING / CASCADED / withListingData / withArchivedListingData / visibleTo intactos ...

    public const SORTABLE = [
        'created_at' => 'turmas.created_at',
        'start_date' => 'turmas.start_date',
        'end_date' => 'turmas.end_date',
    ];

    public const DEFAULT_SORT = '-created_at';

    /**
     * Curso, contratante e código do orçamento (spec §4.2). `quotes.code` não
     * existe como coluna — `Quote::getCodeAttribute()` monta "Scap {budget_id}
     * - Cot {seq}" em PHP —, então a metade que identifica (`budgets.code`,
     * `'Scap '.id`) é o que se varre. `whereHas` respeita os `withTrashed()`
     * das relações: turma de cliente arquivado continua achável.
     */
    public function searchable(string $q): static
    {
        $like = '%'.addcslashes($q, '%_\\').'%';

        return $this->where(fn (Builder $w) => $w
            ->whereHas('course', fn (Builder $c) => $c->where('courses.name', 'like', $like))
            ->orWhereHas('quote.budget', fn (Builder $b) => $b->where('budgets.code', 'like', $like))
            ->orWhereHas('quote.budget.client.user', fn (Builder $u) => $u->where('users.name', 'like', $like)));
    }

    /**
     * O status de exibição em SQL (spec §4.2): `concluida` pelo status;
     * `habilitada` = em andamento E um doc de CADA `TurmaDocumentType`;
     * `em_andamento` = em andamento e algum tipo faltando. É a `HabilitacaoStatus`
     * escrita como `whereHas`, e a paridade é catraca (`TurmaStatusParityTest`).
     *
     * `$asOfArchiving` é a lista de Arquivados: o documento conta como no
     * instante do arquivamento — o predicado de `LoadsCascadedChildren` escrito
     * para `whereHas`, pela mesma razão que `withArchivedListingData()` o
     * reescreve para `withCount`.
     */
    public function whereDisplayStatus(?TurmaDisplayStatus $status, bool $asOfArchiving = false): static
    {
        return match ($status) {
            null => $this,
            TurmaDisplayStatus::Concluida => $this->where('turmas.status', TurmaStatus::Concluida),
            TurmaDisplayStatus::Habilitada => $this
                ->where('turmas.status', TurmaStatus::EmAndamento)
                ->where(function (Builder $w) use ($asOfArchiving): void {
                    foreach (TurmaDocumentType::cases() as $type) {
                        $w->whereHas('documentacaoObrigatoria', fn (Builder $d) => $this->documentoDoTipo($d, $type, $asOfArchiving));
                    }
                }),
            TurmaDisplayStatus::EmAndamento => $this
                ->where('turmas.status', TurmaStatus::EmAndamento)
                ->where(function (Builder $w) use ($asOfArchiving): void {
                    foreach (TurmaDocumentType::cases() as $type) {
                        $w->orWhereDoesntHave('documentacaoObrigatoria', fn (Builder $d) => $this->documentoDoTipo($d, $type, $asOfArchiving));
                    }
                }),
        };
    }

    private function documentoDoTipo(Builder $doc, TurmaDocumentType $type, bool $asOfArchiving): void
    {
        $doc->where('files.type', $type->value);

        if ($asOfArchiving) {
            $doc->withTrashed()->where(fn (Builder $q) => $q
                ->whereNull('files.deleted_at')
                ->orWhere('files.archived_with_parent', true));
        }
    }
}
```

Run: `docker compose exec -T app php artisan test --filter=TurmaStatusParityTest`
Expected: PASS (2 testes). **Veja reprovar:** remova a linha `$doc->withTrashed()...` — o segundo teste acusa "Divergência em habilitada (arquivadas)"; desfaça.

- [ ] **Step 5: Controller**

```php
use App\Domains\Operation\Data\TurmaPageRequest;
use App\Domains\Operation\QueryBuilders\TurmaQueryBuilder;
use App\Shared\Pagination\PageData;
// ...
    /**
     * Página do hub (spec D1). `visibleTo` vem ANTES do `page()`: o
     * `total_unfiltered` do redator é o das turmas dele, não da casa.
     *
     * @return PageData<TurmaData>
     */
    public function index(TurmaPageRequest $page, Request $request, TurmaHabilitacaoService $habilitacao): PageData
    {
        return Turma::query()
            ->visibleTo($request->user())
            ->withListingData()
            ->page(
                $page,
                fn (Turma $t) => TurmaData::fromModel($t, $habilitacao),
                filter: fn (TurmaQueryBuilder $q) => $q->whereDisplayStatus($page->status),
            );
    }

    // ...

    /**
     * A mesma página, sobre as arquivadas. `slice()` e não `page()`: o
     * "arquivado por" é resolvido num lote só sobre os ids DA PÁGINA
     * (`ArchiveTrailQuery::archivedBy`), e a projeção precisa da coleção antes
     * de mapear.
     *
     * @return PageData<ArchivedTurmaData>
     */
    public function archived(TurmaPageRequest $page, Request $request, TurmaHabilitacaoService $habilitacao): PageData
    {
        [$turmas, $meta] = Turma::onlyTrashed()
            ->visibleTo($request->user())
            ->withArchivedListingData()
            ->slice($page, filter: fn (TurmaQueryBuilder $q) => $q->whereDisplayStatus($page->status, asOfArchiving: true));

        $autores = ArchiveTrailQuery::archivedBy(Turma::class, $turmas->pluck('id')->all());

        return new PageData(
            data: $turmas
                ->map(fn (Turma $t) => new ArchivedTurmaData(
                    turma: TurmaData::fromModel($t, $habilitacao),
                    archived_at: $t->deleted_at->toIso8601String(),
                    archived_by: $autores[$t->id] ?? null,
                ))
                ->values()
                ->all(),
            meta: $meta,
        );
    }
```

- [ ] **Step 6: Teste de endpoint**

```php
<?php

namespace Tests\Feature\Operation;

use App\Domains\Identity\Models\Redator;
use App\Domains\Identity\Models\User;
use App\Domains\Operation\Enums\TurmaDocumentType;
use App\Domains\Operation\Enums\TurmaModalidade;
use App\Domains\Operation\Models\Turma;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\Certification\IssuableEnrollmentBuilder;
use Tests\TestCase;

/** DoD 3 da spec sobre `GET /api/turmas` e `/api/turmas/archived`. */
class TurmaPaginationTest extends TestCase
{
    use RefreshDatabase;

    private int $seq = 0;

    public function test_status_habilitada_devolve_so_turmas_com_os_tres_documentos(): void
    {
        $this->actingAsAdmin();
        $habilitada = $this->turma(docs: TurmaDocumentType::cases());
        $this->turma(docs: [TurmaDocumentType::MANUAL]);

        $response = $this->getJson('/api/turmas?status=habilitada')->assertOk();

        $this->assertSame([$habilitada->id], array_column($response->json('data'), 'id'));
        $response->assertJsonPath('data.0.habilitada', true)
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('meta.total_unfiltered', 2);
    }

    public function test_redator_ve_so_as_dele_e_o_total_unfiltered_e_das_dele(): void
    {
        $this->turma(docs: TurmaDocumentType::cases());
        $minha = $this->turma(docs: TurmaDocumentType::cases());
        $this->turma(docs: []);

        $redator = $this->actingAsRedator();
        $minha->redatores()->attach($redator);

        $response = $this->getJson('/api/turmas?status=habilitada')->assertOk();

        $this->assertSame([$minha->id], array_column($response->json('data'), 'id'));
        $response->assertJsonPath('meta.total_unfiltered', 1);
    }

    public function test_q_varre_curso_contratante_e_codigo_do_orcamento(): void
    {
        $this->actingAsAdmin();
        $t1 = $this->turma(docs: [], course: 'Líneas 220kV', cliente: 'Transelec');
        $t2 = $this->turma(docs: [], course: 'Subestaciones', cliente: 'Enel');
        $t1->quote->budget->update(['code' => 'Scap 41']);
        $t2->quote->budget->update(['code' => 'Scap 42']);

        $this->assertSame([$t1->id], array_column($this->getJson('/api/turmas?q=220kV')->json('data'), 'id'));
        $this->assertSame([$t2->id], array_column($this->getJson('/api/turmas?q=enel')->json('data'), 'id'));
        $this->assertSame([$t2->id], array_column($this->getJson('/api/turmas?q=Scap 42')->json('data'), 'id'));
    }

    public function test_sort_start_date_e_a_recusa_fora_da_allowlist(): void
    {
        $this->actingAsAdmin();
        $tarde = $this->turma(docs: [], start: '2026-09-01');
        $cedo = $this->turma(docs: [], start: '2026-07-01');

        $this->assertSame([$cedo->id, $tarde->id], array_column($this->getJson('/api/turmas?sort=start_date')->json('data'), 'id'));
        $this->assertSame([$tarde->id, $cedo->id], array_column($this->getJson('/api/turmas?sort=-start_date')->json('data'), 'id'));

        $this->getJson('/api/turmas?sort=course_name')->assertStatus(422)->assertHeader('Content-Type', 'application/problem+json');
        $this->getJson('/api/turmas?status=foo')->assertStatus(422);
    }

    public function test_archived_pagina_com_o_mesmo_envelope_e_o_arquivado_por(): void
    {
        $this->actingAsAdmin();
        $arquivada = $this->turma(docs: TurmaDocumentType::cases());
        $this->turma(docs: []);
        $arquivada->delete();

        $response = $this->getJson('/api/turmas/archived?status=habilitada')->assertOk();

        $this->assertSame([$arquivada->id], array_column(array_column($response->json('data'), 'turma'), 'id'));
        $response->assertJsonPath('meta.total', 1)->assertJsonPath('meta.total_unfiltered', 1);
        $this->assertNotNull($response->json('data.0.archived_at'));
        $this->assertArrayHasKey('archived_by', $response->json('data.0'));
    }

    private function actingAsRedator(): Redator
    {
        $this->seed(RolePermissionSeeder::class);
        $user = User::factory()->create(['type' => 'redator', 'is_active' => true, 'rut' => '9.999.999-K']);
        $user->assignRole('redator');
        $this->actingAs($user, 'web');

        return Redator::create(['user_id' => $user->id]);
    }

    /** @param  array<TurmaDocumentType>  $docs */
    private function turma(array $docs, string $course = 'Curso', string $cliente = 'Cliente', string $start = '2026-07-20'): Turma
    {
        $n = ++$this->seq;
        $pad = str_pad((string) $n, 3, '0', STR_PAD_LEFT);
        $turma = IssuableEnrollmentBuilder::make()
            ->turmaNaoConcluida()
            ->client(['legal_name' => "{$cliente} {$n} SpA"], ['name' => $cliente, 'rut' => "1.000.{$pad}-0"])
            ->course(['name' => "{$course} {$n}"])
            ->student(['rut' => "2.000.{$pad}-0"])
            ->redatorUser(['rut' => "3.000.{$pad}-0"])
            ->turma(['modalidade' => TurmaModalidade::Presencial, 'local_aplicacao' => 'Santiago', 'start_date' => $start, 'end_date' => '2026-12-31'])
            ->create()
            ->turmaModel();

        foreach ($docs as $type) {
            $turma->files()->create(['type' => $type->value, 'path' => 'x.pdf', 'original_name' => 'x.pdf', 'mime' => 'application/pdf', 'size' => 10]);
        }

        return $turma;
    }
}
```

> No teste do redator, o `IssuableEnrollmentBuilder` já designa o redator PRÓPRIO dele em cada turma; o `attach` acima acrescenta o redator autenticado só na `$minha`. `visibleTo` filtra por `redatores.user_id`, então as outras duas não aparecem.

- [ ] **Step 7: Adaptar os testes que liam a lista como array**

Run: `grep -rn "'/api/turmas'\|'/api/turmas/archived'" backend/tests`

Em cada um (`TurmaArchiveEndpointTest`, `TurmaCrudTest`, `TurmaOwnershipTest`, `TurmaQueryBuilderTest`, `ContratanteEagerLoadTest`): `assertJsonCount(N)` → `assertJsonCount(N, 'data')`; `json('0.…')`/`assertJsonPath('0.…')` → `'data.0.…'`; `collect($response->json())` → `collect($response->json('data'))`. O `test_listagem_de_turmas_nao_lazy_loada_o_user_do_contratante` continua provando o que provava.

Run: `docker compose exec -T app php artisan test --filter='Turma|Contratante|Enrollment'`
Expected: PASS.

- [ ] **Step 8: Regenerar, Pint, commit**

Run: `docker compose exec -T app php artisan typescript:transform && grep -n "export type TurmaDisplayStatus" frontend/src/shared/types/generated.ts`
Expected: `export type TurmaDisplayStatus = 'em_andamento' | 'habilitada' | 'concluida';`. Se não aparecer, acrescente `#[TypeScript]` ao enum e regenere — e anote no commit que `CertificateDisplayStatus` entra por outro caminho.

Run: `cd frontend && pnpm build && cd ..`
Expected: verde (o tipo local `TurmaDisplayStatus` de `turmaStatus.ts` continua compilando; a Task 9 o troca pelo gerado).

```bash
cd backend && ./vendor/bin/pint app/Domains/Operation tests/Feature/Operation tests/Feature/Shared/ContratanteEagerLoadTest.php && cd ..
git add backend/app/Domains/Operation backend/tests/Feature/Operation backend/tests/Feature/Shared/ContratanteEagerLoadTest.php frontend/src/shared/types/generated.ts
git commit -m "feat(operation): GET /api/turmas e /turmas/archived paginados com status em SQL e paridade"
```

---

## Task 9: Hub de turmas sobre `useServerTable` (§4.6)

**Files:**
- Modify: `frontend/src/features/operation/api/useTurmas.ts:24-29,124-138`
- Modify: `frontend/src/features/operation/hooks/useTurmasPage.ts`
- Modify: `frontend/src/features/operation/hooks/useTurmasPage.test.tsx`
- Modify: `frontend/src/features/operation/hooks/useTurmasArchived.ts`
- Modify: `frontend/src/features/operation/lib/turmaStatus.ts:1-3`
- Modify: `frontend/src/features/operation/components/Turma/TurmasTable.tsx`
- Modify: `frontend/src/features/operation/components/OperationPage.tsx`

**Interfaces:**
- Consumes: `pageEndpoint`, `PageQuery`, `useServerTable`, `useRestoreAction`, `useArchiveAction`, `ArchiveMode` (Task 3); `TurmaDisplayStatus` gerado (Task 8).
- Produces: `turmasPage`, `turmasArchivedPage`; `useTurmasPage(mode, status): ServerTable<TurmaRow>`; `useTurmasArchived(): { mode, setMode, restore, restoring, archive, archiving }`; `TurmasTable` recebe `table`, `status`, `onStatusChange`.

- [ ] **Step 1: Reescrever `useTurmasPage.test.tsx` — reprova antes**

```tsx
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { api } from '@shared/api/axios'
import { useTurmasPage } from './useTurmasPage'

vi.mock('@shared/api/axios', () => ({
  api: { get: vi.fn() },
}))

const get = vi.mocked(api.get)

/** Cliente estável por teste: uma fábrica que monta o QueryClient fora da função de render.
 * Se o cliente morasse no corpo da wrapper, cada render remontaria um novo e orfanaria a
 * rejeição da query — vitest reprova com `Unknown Error: undefined` e a test torna timeout. */
function comCliente() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } } })
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  )

  return { qc, Wrapper }
}

const meta = { page: 1, per_page: 10, total: 1, last_page: 1, total_unfiltered: 1 }

describe('useTurmasPage', () => {
  beforeEach(() => {
    get.mockReset()
  })

  it('modo ativo: pede /api/turmas com page/per_page e o status como filtro nomeado', async () => {
    get.mockResolvedValue({ data: { data: [{ id: 7, course_name: 'T-7' }], meta } })

    const { Wrapper } = comCliente()
    const { result } = renderHook(() => useTurmasPage('active', 'habilitada'), { wrapper: Wrapper })

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(get).toHaveBeenCalledWith('/api/turmas', { params: { page: 1, per_page: 10, status: 'habilitada' } })
    expect(result.current.rows).toEqual([{ id: 7, course_name: 'T-7' }])
    expect(result.current.totalRecords).toBe(1)
    expect(result.current.error).toBeNull()
  })

  it('modo arquivado: pede /api/turmas/archived e ACHATA o DTO composto numa forma só', async () => {
    // A tabela não pode ter duas formas (`useArchivedPage`): o agregado sobe
    // ao topo e `archived_at`/`archived_by` ficam ao lado — no fetch, antes de
    // o hook ver a linha.
    get.mockResolvedValue({
      data: {
        data: [{ turma: { id: 9, course_name: 'T-9' }, archived_at: '2026-08-18T10:00:00-03:00', archived_by: 'Ana Torres' }],
        meta,
      },
    })

    const { Wrapper } = comCliente()
    const { result } = renderHook(() => useTurmasPage('archived', null), { wrapper: Wrapper })

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(get).toHaveBeenCalledWith('/api/turmas/archived', { params: { page: 1, per_page: 10 } })
    expect(result.current.rows).toEqual([
      { id: 9, course_name: 'T-9', archived_at: '2026-08-18T10:00:00-03:00', archived_by: 'Ana Torres' },
    ])
  })

  it('devolve rows vazio, e nao undefined, antes de a query voltar', () => {
    get.mockReturnValue(new Promise(() => {}))

    const { Wrapper } = comCliente()
    const { result } = renderHook(() => useTurmasPage('active', null), { wrapper: Wrapper })

    expect(result.current.rows).toEqual([])
    expect(result.current.loading).toBe(true)
  })

  it('devolve o envelope da falha, e `{}` quando o interceptor nao populou o corpo', async () => {
    get.mockRejectedValue(undefined)

    const { Wrapper } = comCliente()
    const { result } = renderHook(() => useTurmasPage('active', null), { wrapper: Wrapper })

    await waitFor(() => expect(result.current.error).not.toBeNull())
    expect(result.current.error).toEqual({})
  })

  it('DEVOLVE a promise do refetch (Q-14)', async () => {
    get.mockResolvedValue({ data: { data: [], meta: { ...meta, total: 0, total_unfiltered: 0 } } })

    const { Wrapper } = comCliente()
    const { result } = renderHook(() => useTurmasPage('active', null), { wrapper: Wrapper })

    await waitFor(() => expect(result.current.loading).toBe(false))
    await expect(result.current.refetch()).resolves.toBeDefined()
  })
})
```

Run: `cd frontend && pnpm test -- useTurmasPage`
Expected: FAIL (assinatura nova).

- [ ] **Step 2: `useTurmas.ts` — endpoints de página no lugar das duas queries de lista**

Remova `useTurmas()` (linhas 24–29) e `useTurmasArchivedList()` (124–138); acrescente:

```ts
import { pageEndpoint } from '@shared/api/page'
// ...
/** A página do hub e a dos arquivados (spec D1). As chaves de query são
 * montadas pelo `useServerTable` sobre `turmaKeys.list()`/`archived()`, que
 * começam em `['turmas']` — o `useInvalidate()` abaixo continua cobrindo as
 * duas. A arquivada devolve o DTO composto; quem achata é `useTurmasPage`. */
export const turmasPage = pageEndpoint<TurmaData>('/api/turmas')
export const turmasArchivedPage = pageEndpoint<ArchivedTurmaData>('/api/turmas/archived')
```

`usePendingQuotes`, `useTurma` e as mutations ficam como estão.

- [ ] **Step 3: `useTurmasPage.ts`**

```ts
import type { PageQuery } from '@shared/api/page'
import { useServerTable, type ArchiveMode, type ServerTable } from '@shared/hooks'
import type { ArchivableRow } from '@shared/lib'
import type { TurmaData, TurmaDisplayStatus } from '@shared/types/generated'
import { turmaKeys, turmasArchivedPage, turmasPage } from '../api/useTurmas'

/** A mesma linha nos dois modos (D-53). */
export type TurmaRow = ArchivableRow<TurmaData>

/** A página arquivada, achatada no FETCH: `{ turma, archived_at, archived_by }`
 * vira `TurmaRow`, e o hook só vê uma forma. O agregado entra por chave
 * EXPLÍCITA (`row.turma`) — a lição do `useArchivedPage` (Q-3 de 2026-08-18):
 * pescar por posição faria um campo novo no DTO trocar o agregado em silêncio. */
const arquivadas = (query: PageQuery) =>
  turmasArchivedPage(query).then((page) => ({
    meta: page.meta,
    data: page.data.map((row): TurmaRow => ({ ...row.turma, archived_at: row.archived_at, archived_by: row.archived_by })),
  }))

/**
 * A página de turmas, ativa OU arquivada, por `useServerTable` (spec D1: a
 * lista do admin cresce sem teto, e `archivableSource` funde as duas numa
 * fonte só — então uma raiz pagina as duas). Um hook, uma moldura: trocar o
 * modo troca o endpoint e a chave; busca, filtro de estado e sort vão na URL.
 *
 * Alias de página no molde dos `useXPage`: é o que mantém a query fora do
 * componente (`no-restricted-syntax`).
 */
export function useTurmasPage(mode: ArchiveMode, status: TurmaDisplayStatus | null): ServerTable<TurmaRow> {
  const archived = mode === 'archived'

  return useServerTable<TurmaRow>(archived ? arquivadas : turmasPage, {
    key: archived ? turmaKeys.archived() : turmaKeys.list(),
    filters: { status },
  })
}
```

- [ ] **Step 4: `useTurmasArchived.ts` — modo e ações, sem lista**

```ts
import { useState } from 'react'
import { useArchiveAction, useRestoreAction, type ArchiveMode } from '@shared/hooks'
import { useArchiveTurma, useRestoreTurma } from '../api/useTurmas'

/**
 * O modo da visão e as duas ações com toast. A LISTA não mora mais aqui: com
 * a paginação no servidor ela vem de `useTurmasPage(mode, status)`, que
 * troca o endpoint pelo modo. `useArchivedPage` (modo + lista + restore) segue
 * servindo as cinco raízes que não paginam; esta é a composição das peças
 * dele para uma raiz que pagina.
 *
 * Os toasts vivem em `shared/` (Q-3 do review de 2026-08-19); aqui o de erro
 * cobre dois 422 próprios: turma concluída na RN-15 ao arquivar, e os gates
 * da spec D1 e do redator arquivado ao restaurar.
 */
export function useTurmasArchived() {
  const [mode, setMode] = useState<ArchiveMode>('active')

  return {
    mode,
    setMode,
    ...useRestoreAction(useRestoreTurma()),
    ...useArchiveAction(useArchiveTurma()),
  }
}
```

- [ ] **Step 5: `turmaStatus.ts` — o tipo vem do backend**

Troque as linhas 1–3:

```ts
import type { TurmaData, TurmaDisplayStatus as GeneratedTurmaDisplayStatus, TurmaModalidade } from '@shared/types/generated'

/** Do backend desde o bloco `hardening-performance-e-dados`: o filtro da lista
 * é SQL (`TurmaQueryBuilder::whereDisplayStatus`) e a paridade com esta
 * derivação é catraca lá (`TurmaStatusParityTest`). O alias fica para os
 * consumidores de célula/cabeçalho não mudarem de import. */
export type TurmaDisplayStatus = GeneratedTurmaDisplayStatus
```

`turmaDisplayStatus()`, `registroAcademicoBloqueado()`, `turmaStatusSeverity()` e `turmaModalidadeTagProps()` continuam iguais — as células ainda derivam o rótulo da linha.

- [ ] **Step 6: `TurmasTable.tsx` e `OperationPage.tsx`**

`TurmasTable.tsx`:

```tsx
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  AppColumn, AppEmptyState, ArchiveSwitch, SearchableTableFrame, archivedColumns, stickyActionsColumn,
} from '@shared/ui'
import type { ArchiveMode, ServerTable } from '@shared/hooks'
import type { TurmaData } from '@shared/types/generated'
import type { TurmaDisplayStatus } from '../../lib/turmaStatus'
import type { TurmaRow } from '../../hooks/useTurmasPage'
import {
  TurmaClientCell, TurmaCodeCell, TurmaModalidadeCell, TurmaRedatoresCell, TurmaStatusCell,
} from './TurmaCells'
import { turmaWidths } from './turmaColumns'
import { TurmaRowActions } from './TurmaRowActions'
import { TurmaStatusFilter } from './TurmaStatusFilter'

export type { TurmaRow }

export function TurmasTable({
  table, status, onStatusChange,
  mode, onModeChange, onArchive, onRestore, busy,
}: {
  /** Pronto do `useTurmasPage`: busca, filtro de estado, página e sort no servidor. */
  table: ServerTable<TurmaRow>
  status: TurmaDisplayStatus | null
  onStatusChange: (status: TurmaDisplayStatus | null) => void
  mode: ArchiveMode
  onModeChange: (mode: ArchiveMode) => void
  onArchive: (turma: TurmaData) => void
  onRestore: (turma: TurmaData) => void
  /** Arquivar/restaurar em voo — trava os botões da linha (Q-2). */
  busy: boolean
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const archived = mode === 'archived'
  const largura = turmaWidths(archived)

  return (
    <SearchableTableFrame
      table={table}
      totalRecords={table.totalRecords}
      sortField={table.sortField}
      sortOrder={table.sortOrder}
      onSort={table.onSort}
      searchPlaceholder={t('operation.table.search')}
      onClearFilter={() => onStatusChange(null)}
      filterSlot={<TurmaStatusFilter value={status} onChange={onStatusChange} />}
      emptyState={
        // Sem ação em nenhuma das duas visões: turma não se cria por botão,
        // nasce de cotação aprovada.
        <AppEmptyState
          icon={archived ? 'pi pi-inbox' : 'pi pi-calendar'}
          title={archived ? t('archive.empty') : t('operation.table.empty')}
          description={archived ? t('archive.emptyHint') : t('operation.table.emptyHint')}
        />
      }
      footerCount={t('operation.table.count', { count: table.totalRecords })}
      viewSwitch={<ArchiveSwitch value={mode} onChange={onModeChange} />}
      loading={table.loading}
      error={table.error}
      onRetry={table.refetch}
    >
```

As colunas ficam idênticas às atuais, com três mudanças: a coluna `operation.table.code` ganha `field="created_at" sortable` (o código é a idade da turma — `created_at` é o que a allowlist ordena); nenhuma outra coluna ganha `sortable` (`course_name`/`client_name` não estão na allowlist e o `DataTable` em `lazy` só emite o evento — sem allowlist seria 422). O `useState` de `status` e o `useTableFilter` saem do arquivo; o `onChange` do filtro não chama mais `table.resetPage()` — a volta à página 1 é do hook.

`OperationPage.tsx`:

```tsx
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ModulePage, AppCard, ArchiveConfirmDialog } from '@shared/ui'
import { usePermissions } from '@shared/hooks'
import type { TurmaData } from '@shared/types/generated'
import type { TurmaDisplayStatus } from '../lib/turmaStatus'
import { useTurmasPage } from '../hooks/useTurmasPage'
import { usePendingQuotesPage } from '../hooks/usePendingQuotesPage'
import { useTurmasArchived } from '../hooks/useTurmasArchived'
import { PendingQuotesPanel } from './Turma/PendingQuotesPanel'
import { TurmasTable } from './Turma/TurmasTable'

export function OperationPage() {
  // `usePendingQuotesPage` dispara sempre; sem `operation.turma.create` o backend
  // responde 403 e o painel simplesmente não é renderizado (o `can()` é RBAC de
  // UI — a API é a fronteira). Query condicional por permissão quebraria a regra
  // de hooks; guarda-se no render.
  const { t } = useTranslation()
  const { can } = usePermissions()
  const pending = usePendingQuotesPage()
  const turmasArchived = useTurmasArchived()
  // O filtro de estado sobe para a página porque é PARÂMETRO da query: vive
  // ao lado do modo, que é o outro parâmetro, e desce pronto para a tabela.
  const [status, setStatus] = useState<TurmaDisplayStatus | null>(null)
  // Uma fonte só, escolhida pelo modo dentro do hook — `archivableSource`
  // fundia duas listas inteiras; com página, a fonte É a URL.
  const turmas = useTurmasPage(turmasArchived.mode, status)
  const [toArchive, setToArchive] = useState<TurmaData | null>(null)
  const canCreate = can('operation.turma.create')

  return (
    <ModulePage title={t('module.operacion.title')} description={t('module.operacion.description')}>
      <div className="space-y-6">
        {canCreate && (
          <PendingQuotesPanel items={pending.items} error={pending.error} onRetry={pending.refetch} />
        )}
        <AppCard>
          <TurmasTable
            table={turmas}
            status={status}
            onStatusChange={setStatus}
            mode={turmasArchived.mode}
            onModeChange={turmasArchived.setMode}
            onArchive={setToArchive}
            onRestore={(turma) => turma.id != null && turmasArchived.restore(turma.id)}
            busy={turmasArchived.restoring || turmasArchived.archiving}
          />
        </AppCard>
      </div>

      {/* Restaurar NÃO pede confirmação: não é destrutivo (molde D9). */}
      <ArchiveConfirmDialog
        target={toArchive}
        pending={turmasArchived.archiving}
        onArchive={turmasArchived.archive}
        onCancel={() => setToArchive(null)}
      />
    </ModulePage>
  )
}
```

- [ ] **Step 7: Gate, navegador, commit**

Run: `cd frontend && pnpm lint && pnpm build && pnpm test`
Expected: verde; `pnpm build` prova que nenhum consumidor de `useTurmas()`/`useTurmasArchivedList()` sobrou (`grep -rn "useTurmas()\|useTurmasArchivedList" frontend/src` vazio, fora de docblock — apague a menção em `OperationPage.tsx:27`, já feito acima).

Chromium `es-CL`, `/operacion`: "Habilitada" no dropdown → `GET /api/turmas?page=1&per_page=10&status=habilitada`; alternar para Arquivadas → `GET /api/turmas/archived?...` e a tabela mostra `archived_at`/`archived_by`; busca por cliente → `q=`; rodapé conta `meta.total`. Como redator (`redator@…` do seed), a lista traz só as dele. Anote na `audits/…-medicoes.md` (seção "DoD 7 — Turmas").

```bash
git add frontend/src/features/operation docs/superpowers/audits/2026-08-28-hardening-performance-e-dados-medicoes.md
git commit -m "feat(operation): hub de turmas paginado no servidor, ativo e arquivado, com filtro de estado na URL"
```

---
## Task 10: Painel de emissão com janela por data (D7)

**Files:**
- Create: `backend/app/Domains/Certification/Data/EmissionPanelRequest.php`
- Modify: `backend/app/Domains/Certification/Services/EmissionPanelQuery.php:32-58`
- Modify: `backend/app/Domains/Certification/Http/Controllers/CertificateController.php:64-69`
- Create: `frontend/src/features/certification/lib/emissionWindow.ts`
- Modify: `frontend/src/features/certification/api/certificatesApi.ts:14-23`
- Modify: `frontend/src/features/certification/hooks/useEmissionPanelState.ts`
- Modify: `frontend/src/features/certification/components/Emission/EmissionPanel.tsx:29-60`
- Modify: `frontend/src/features/certification/components/Emission/EmissionPanel.test.tsx`
- Modify: `frontend/src/shared/config/locales/{en,es-CL,pt-BR}.json` (chave `certificate.concludedSince`)
- Test: `backend/tests/Feature/Certification/EmissionPanelWindowTest.php`

**Interfaces:**
- Consumes: `DataSql::literal` (Task 6); `CertificateDisplayStatus::hoje()`; `AppDatePicker` (`value: string | null` ISO, `onChange`).
- Produces: `EmissionPanelRequest { ?string $concluidas_desde }` com `desde(): CarbonImmutable`; `EmissionPanelQuery::JANELA_MESES = 12` e `get(CarbonImmutable $desde)`; `useEmissionPanel(enabled = true, desde?: string)`; `useEmissionPanelState().desde/setDesde`; `EMISSION_PANEL_WINDOW_MONTHS`, `defaultConcludedSince()`.

- [ ] **Step 1: Teste que reprova**

```php
<?php

namespace Tests\Feature\Certification;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\Support\Certification\IssuableEnrollmentBuilder;
use Tests\TestCase;

/**
 * DoD 4 da spec: o painel de emissão não pagina (lote e dropdown precisam da
 * turma inteira em memória) — ganha janela por data. Sem parâmetro, só as
 * turmas concluídas nos últimos `JANELA_MESES`; com `concluidas_desde`, o que
 * o operador pedir. A forma do payload não muda.
 */
class EmissionPanelWindowTest extends TestCase
{
    use RefreshDatabase;

    private int $seq = 0;

    protected function setUp(): void
    {
        parent::setUp();
        Carbon::setTestNow('2026-08-28 12:00:00');
        $this->actingAsAdmin();
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    public function test_sem_parametro_devolve_so_as_concluidas_nos_ultimos_doze_meses(): void
    {
        $recente = $this->turmaConcluidaEm('2026-07-24');
        $noLimite = $this->turmaConcluidaEm('2025-08-28');
        $this->turmaConcluidaEm('2025-08-27');
        $this->turmaConcluidaEm('2021-03-01');

        $response = $this->getJson('/api/certificates/emission-panel')->assertOk()->assertJsonCount(2);

        // Mais recente primeiro (`end_date` desc), como antes.
        $this->assertSame([$recente->id, $noLimite->id], array_column($response->json(), 'turma_id'));
    }

    public function test_concluidas_desde_abre_a_janela(): void
    {
        $this->turmaConcluidaEm('2026-07-24');
        $this->turmaConcluidaEm('2021-03-01');

        $this->getJson('/api/certificates/emission-panel?concluidas_desde=2021-01-01')->assertOk()->assertJsonCount(2);
        $this->getJson('/api/certificates/emission-panel?concluidas_desde=2026-08-01')->assertOk()->assertJsonCount(0);
    }

    public function test_data_fora_do_formato_e_422(): void
    {
        $this->getJson('/api/certificates/emission-panel?concluidas_desde=01-01-2021')
            ->assertStatus(422)
            ->assertHeader('Content-Type', 'application/problem+json');
    }

    private function turmaConcluidaEm(string $endDate): \App\Domains\Operation\Models\Turma
    {
        $n = ++$this->seq;
        $pad = str_pad((string) $n, 3, '0', STR_PAD_LEFT);

        return IssuableEnrollmentBuilder::make()
            ->client(['legal_name' => "Empresa {$n} SpA"], ['rut' => "1.000.{$pad}-0"])
            ->course(['name' => "Curso {$n}"])
            ->student(['rut' => "2.000.{$pad}-0"])
            ->redatorUser(['rut' => "3.000.{$pad}-0"])
            ->turma(['start_date' => $endDate, 'end_date' => $endDate])
            ->create()
            ->turmaModel();
    }
}
```

Run: `docker compose exec -T app php artisan test --filter=EmissionPanelWindowTest`
Expected: FAIL — o primeiro teste devolve 4.

- [ ] **Step 2: Request e serviço**

`EmissionPanelRequest.php`:

```php
<?php

namespace App\Domains\Certification\Data;

use App\Domains\Certification\Enums\CertificateDisplayStatus;
use App\Domains\Certification\Services\EmissionPanelQuery;
use Carbon\CarbonImmutable;
use Spatie\LaravelData\Data;

/**
 * A janela do painel de emissão (spec D7): `concluidas_desde`, `Y-m-d`.
 * Ausente = hoje (America/Santiago) menos `EmissionPanelQuery::JANELA_MESES`.
 */
class EmissionPanelRequest extends Data
{
    public function __construct(
        public ?string $concluidas_desde = null,
    ) {}

    /** @return array<string, array<int, string>> */
    public static function rules(): array
    {
        return [
            'concluidas_desde' => ['sometimes', 'nullable', 'date_format:Y-m-d'],
        ];
    }

    public function desde(): CarbonImmutable
    {
        if ($this->concluidas_desde !== null && $this->concluidas_desde !== '') {
            return CarbonImmutable::createFromFormat('Y-m-d', $this->concluidas_desde, CertificateDisplayStatus::TIMEZONE)->startOfDay();
        }

        return CertificateDisplayStatus::hoje()->subMonths(EmissionPanelQuery::JANELA_MESES);
    }
}
```

`EmissionPanelQuery.php` — constante, assinatura e o `where`:

```php
use App\Shared\Support\DataSql;
use Carbon\CarbonImmutable;
// ...
class EmissionPanelQuery
{
    /**
     * Default da janela (spec D7): emissão acontece logo depois da conclusão,
     * e turma mais antiga continua alcançável por `concluidas_desde`. O front
     * preenche o seletor com o MESMO número (`emissionWindow.ts`), para a tela
     * mostrar a data antes de o primeiro GET voltar — os dois apontam um para
     * o outro; mudar um sem o outro faz a tela prometer uma janela e a API
     * responder outra.
     */
    public const JANELA_MESES = 12;

    // ... construtor intacto ...

    /** @return array<EmissionPanelTurmaData> */
    public function get(CarbonImmutable $desde): array
    {
        $templates = $this->templates->latestByCourse();

        $turmas = Turma::query()
            ->where('status', TurmaStatus::Concluida)
            // A janela (spec D7). `DataSql::literal`, não `whereDate`: o
            // `DATE(end_date)` que `whereDate` gera cega o índice candidato
            // `turmas(status, end_date)` da Task 12, e o literal cru erra a
            // borda no sqlite da suíte.
            ->where('end_date', '>=', DataSql::literal(Turma::query()->getModel()->getConnection(), $desde))
            ->with([
                // ... o `with` continua idêntico ...
```

Controller:

```php
use App\Domains\Certification\Data\EmissionPanelRequest;
// ...
    /** @return array<EmissionPanelTurmaData> */
    public function emissionPanel(EmissionPanelRequest $request, EmissionPanelQuery $panel): array
    {
        return $panel->get($request->desde());
    }
```

Run: `docker compose exec -T app php artisan test --filter='EmissionPanelWindowTest|EmissionPanel|ContratanteEagerLoadTest|BatchIssue'`
Expected: PASS. Se algum teste antigo do painel semeia turma concluída com `end_date` fora dos 12 meses do "hoje" fixado, ele passa a devolver 0 — corrija a fixture para uma data dentro da janela (o comportamento novo é o certo), nunca o default.

- [ ] **Step 3: Frontend — `emissionWindow.ts`, `useEmissionPanel(enabled, desde)`, estado e painel**

`features/certification/lib/emissionWindow.ts`:

```ts
/** O MESMO 12 de `EmissionPanelQuery::JANELA_MESES` (backend). O dono é o
 * backend — é ele que decide o default quando o parâmetro não vem; este
 * existe para o seletor de data mostrar o default antes do primeiro GET e para
 * "limpar" o seletor voltar a ele. Mudar um sem o outro faz a tela prometer
 * uma janela e a API responder outra (spec D7; desvio 4 do plano). */
export const EMISSION_PANEL_WINDOW_MONTHS = 12

/** Hoje menos a janela, em `YYYY-MM-DD` pelos componentes LOCAIS — a mesma
 * regra anti-fuso do `AppDatePicker`. */
export function defaultConcludedSince(hoje: Date = new Date()): string {
  const d = new Date(hoje.getFullYear(), hoje.getMonth() - EMISSION_PANEL_WINDOW_MONTHS, hoje.getDate())
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
```

`certificatesApi.ts` (linhas 14–23):

```ts
/** `enabled` porque o endpoint exige `certification.certificate.issue`:
 * consumidor que pode montar sem essa permissão (Historial, que só a usa para
 * o Reemitir) desliga a query em vez de colher um 403 garantido.
 * `desde` é a janela (spec D7); ausente, o servidor aplica os 12 meses. A
 * data entra na chave: cada janela é uma página de cache própria, e o
 * `panelKey` continua prefixo de todas para as invalidações. */
export function useEmissionPanel(enabled = true, desde?: string) {
  return useQuery<EmissionPanelTurmaData[], ProblemDetails>({
    queryKey: [...panelKey, desde ?? 'default'],
    queryFn: () =>
      api
        .get<EmissionPanelTurmaData[]>('/api/certificates/emission-panel', {
          params: desde ? { concluidas_desde: desde } : {},
        })
        .then((r) => r.data),
    enabled,
  })
}
```

`useEmissionPanelState.ts` — acrescente o estado da janela (o restante é intacto):

```ts
import { defaultConcludedSince } from '../lib/emissionWindow'
// ...
export function useEmissionPanelState() {
  // O seletor nasce com o default do servidor (12 meses) para a tela dizer
  // desde quando está mostrando antes de o GET voltar. Limpar o seletor
  // volta ao default — nunca "sem janela".
  const [desde, setDesde] = useState<string>(defaultConcludedSince())
  const panel = useEmissionPanel(true, desde)
  // ...
  return {
    desde,
    setDesde: (value: string | null) => setDesde(value ?? defaultConcludedSince()),
    options,
    // ... o resto igual ...
  }
}
```

`EmissionPanel.tsx` — dentro do primeiro `AppCard`, ANTES do rótulo da turma:

```tsx
          <label htmlFor={desdeInputId} className="text-sm" style={{ color: 'var(--text-color-secondary)' }}>
            {t('certificate.concludedSince')}
          </label>
          <AppDatePicker inputId={desdeInputId} value={s.desde} onChange={s.setDesde} />
```

com `const desdeInputId = useId()` ao lado do `turmaInputId` e `AppDatePicker` no import de `@shared/ui`.

Locales — em `certificate`, depois de `"turmaConcluida"`: `es-CL` `"concludedSince": "Turmas concluidas desde"`, `pt-BR` `"concludedSince": "Turmas concluídas desde"`, `en` `"concludedSince": "Classes concluded since"`.

- [ ] **Step 4: Catraca de UI e gate**

Em `EmissionPanel.test.tsx`, o `estado.current` ganha `desde: '2025-08-28', setDesde: () => {}`, e um caso novo no `describe`:

```tsx
  it('mostra o seletor da janela com rótulo associado e o default preenchido', () => {
    montar()

    const seletor = screen.getByLabelText('certificate.concludedSince') as HTMLInputElement
    expect(seletor).toBeTruthy()
    // `dd-mm-yy` é a gramática de `es-CL` do AppDatePicker.
    expect(seletor.value).toBe('28-08-2025')
  })
```

Run: `cd frontend && pnpm lint && pnpm build && pnpm test`
Expected: verde, `parity.test.ts` e `copy.test.ts` inclusive (a chave existe nos três locales).

Chromium `es-CL`, `/certificados` → Emisión: a data default aparece no seletor; mudar para `01-01-2021` dispara `GET /api/certificates/emission-panel?concluidas_desde=2021-01-01` e o dropdown recarrega. Anote na `audits/…-medicoes.md` (seção "DoD 7 — Painel de emissão").

- [ ] **Step 5: Pint e commit**

```bash
cd backend && ./vendor/bin/pint app/Domains/Certification/Data/EmissionPanelRequest.php app/Domains/Certification/Services/EmissionPanelQuery.php app/Domains/Certification/Http/Controllers/CertificateController.php tests/Feature/Certification/EmissionPanelWindowTest.php && cd ..
git add backend/app/Domains/Certification backend/tests/Feature/Certification frontend/src/features/certification frontend/src/shared/config/locales docs/superpowers/audits/2026-08-28-hardening-performance-e-dados-medicoes.md
git commit -m "feat(certification): painel de emissao com janela concluidas_desde, default de 12 meses"
```

---

## Task 11: `preventLazyLoading` global e a catraca `ListQueryBudgetTest` (D8, D9)

**Files:**
- Modify: `backend/app/Providers/AppServiceProvider.php:54-60`
- Modify: `backend/tests/Feature/Operation/EnrollmentResultTest.php:119,137-139`, `backend/tests/Feature/Dashboard/DashboardEndpointTest.php:68,639`, `backend/tests/Feature/Shared/ContratanteEagerLoadTest.php:37-42,50,61,72`, `backend/tests/Feature/Identity/LastLoginEagerLoadTest.php:27-32,43,68`, `backend/tests/Feature/Certification/CertificateEagerLoadTest.php:37-42,50`
- Test: `backend/tests/Feature/Shared/ListQueryBudgetTest.php`

**Interfaces:**
- Consumes: todos os endpoints de lista (Tasks 4, 6, 8, 10) e os que não mudaram.
- Produces: a guarda global; a catraca que reprova rota de lista nova sem declaração.

- [ ] **Step 1: Ligar a guarda global**

Em `AppServiceProvider::boot()`, antes de `RateLimits::register();`:

```php
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\LazyLoadingViolationException;
use Illuminate\Support\Facades\Log;
// ...
        // Mecanismo vence instrução (lição 14, spec D8): nenhum `fromModel`
        // atravessa relação não carregada em silêncio. SEMPRE ligado — é o
        // handler que decide o que a violação custa: em produção, um `warning`
        // e a query (um lazy load que escapou custa uma consulta, não um 500);
        // fora dela, a exceção que a suíte vê. `preventLazyLoading(false)` em
        // produção não avisaria nada, porque desligada a guarda não enxerga.
        //
        // Limite conhecido (`EnrollmentResultTest`): a guarda só marca a
        // instância vinda de um `hydrate()` com MAIS de uma linha, e não vê
        // query feita NA relação (`->enrollments()->count()`). O que fecha
        // esses dois buracos é a contagem de `ListQueryBudgetTest`.
        Model::preventLazyLoading();
        Model::handleLazyLoadingViolationUsing(function (Model $model, string $relation): void {
            if ($this->app->isProduction()) {
                Log::warning(sprintf('Lazy load de [%s] em [%s] — eager-load faltando no LISTING/load() do caminho.', $relation, $model::class));

                return;
            }

            throw new LazyLoadingViolationException($model, $relation);
        });
```

- [ ] **Step 2: Os cinco testes deixam de ligar/desligar à mão**

Remova de cada um o `Model::preventLazyLoading();` (e o `(false)` do `tearDown`/`finally`) e o `use Illuminate\Database\Eloquent\Model;` que sobrar sem uso; os testes continuam existindo e continuam provando o mesmo — agora sob a guarda global. No `EnrollmentResultTest::test_result_nao_lazy_loada_apos_refresh`, o `try/finally` vira o corpo direto. Nos docblocks que dizem "por isso cada cenário aqui materializa DUAS cadeias", acrescente "— a guarda é global desde o bloco `hardening-performance-e-dados`; o que este arquivo garante é a fixture com mais de uma linha, sem a qual ela não marca".

Run: `docker compose exec -T app php artisan test`
Expected: a suíte inteira. **Cada `LazyLoadingViolationException` que aparecer é um eager-load faltando** (spec §8): acrescente a relação ao `LISTING` do builder ou ao `load()` do caminho que projeta, no MESMO commit; nunca desligue a guarda nem envolva o caminho com `withoutLazyLoading`. Liste no corpo do commit cada caminho corrigido (`arquivo:linha — relação`).

- [ ] **Step 3: A catraca de contagem, que reprova antes de existir a lista de cenários**

```php
<?php

namespace Tests\Feature\Shared;

use App\Domains\Catalog\Models\Course;
use App\Domains\Certification\Enums\CertificateStatus;
use App\Domains\Certification\Models\Certificate;
use App\Domains\Commercial\Models\Budget;
use App\Domains\Commercial\Models\Quote;
use App\Domains\Identity\Models\Redator;
use App\Domains\Identity\Models\Student;
use App\Domains\Identity\Models\User;
use App\Domains\Operation\Enums\EnrollmentApprovalStatus;
use App\Domains\Operation\Enums\TurmaDocumentType;
use App\Domains\Operation\Enums\TurmaModalidade;
use App\Domains\Operation\Enums\TurmaStatus;
use App\Domains\Operation\Models\Enrollment;
use App\Domains\Operation\Models\Turma;
use Closure;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Database\Events\QueryExecuted;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Routing\Route;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route as RouteFacade;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Role;
use Tests\Support\Certification\IssuableEnrollmentBuilder;
use Tests\Support\CreatesDomainRecords;
use Tests\TestCase;

/**
 * Catraca de N+1 por ROTA (spec D9): toda rota `GET api/*` de lista é
 * descoberta no roteador montado, semeada com N=2 e depois com N=20 do
 * agregado dela, e a contagem de queries do request tem de ser a MESMA.
 * Silêncio reprova, como em `ThrottledRouteRatchetTest`: rota nova sem
 * cenário aqui nem motivo em `ISENTAS` é vermelho.
 *
 * Por que contagem e não `preventLazyLoading`: a guarda só marca instância
 * vinda de `hydrate()` com mais de uma linha e não vê query feita NA relação
 * (`TurmaQueryBuilderTest:96`, `EnrollmentResultTest:94`). O
 * `RedatorLoadQuery` que o levantamento apontou como "2 count() por redator"
 * era `count()` de Collection carregada — N+1 se prova por contagem, não por
 * leitura (spec §1).
 *
 * As rotas com parâmetro de rota entram por lista explícita com o pai
 * semeado. `dashboard/metricas` entra por papel, com número fixo: o que a
 * spec pede é que o custo do Dashboard seja conhecido, não só constante.
 */
class ListQueryBudgetTest extends TestCase
{
    use CreatesDomainRecords;
    use RefreshDatabase;

    private const N_PEQUENO = 2;

    private const N_GRANDE = 20;

    /**
     * Rotas `GET api/*` sem parâmetro que NÃO são lista, com o motivo ao lado.
     *
     * @var array<string, string>
     */
    private const ISENTAS = [
        'api/user' => 'devolve o usuário autenticado, um registro — não há N que cresça com o uso',
        'api/me' => 'devolve a sessão corrente (usuário, papel, permissões), um registro por request',
        'api/profile' => 'o perfil de quem está logado: um usuário, os documentos dele são bounded pelo enum',
        'api/permissions' => 'catálogo estático de permissões (PermissionCatalog), não cresce com o uso',
    ];

    /**
     * Rotas com parâmetro de rota que SÃO lista: o pai é semeado uma vez e a
     * chave é o padrão de `$rota->uri()`.
     *
     * @var array<string, string>
     */
    private const COM_PAI = [
        'api/budgets/{budget}/quotes' => 'cotações de um orçamento',
        'api/budgets/{budget}/quotes/archived' => 'cotações arquivadas de um orçamento',
        'api/turmas/{turma}/alunos' => 'matrículas de uma turma',
        'api/turmas/{turma}/alunos/archived' => 'matrículas arquivadas de uma turma',
        'api/turmas/{turma}/documents' => 'documentos de uma turma',
    ];

    /**
     * Rotas com parâmetro que não são lista, com motivo.
     *
     * @var array<string, string>
     */
    private const COM_PAI_ISENTAS = [
        'api/turmas/{turma}/alunos/preview' => 'pré-visualização de UMA matrícula por RUT (query `rut`), não lista',
        'api/turmas/{turma}/manual' => 'gera um PDF de uma turma — resposta binária, não lista',
        'api/turmas/{turma}/manual/docx' => 'gera um DOCX de uma turma — resposta binária, não lista',
        'api/certificates/{certificate}/pdf' => 'gera o PDF de um certificado — resposta binária',
        'api/publico/certificados/{uuid}' => 'validação pública de UM certificado pelo uuid',
        'api/turmas/{turma}' => 'detalhe de uma turma',
        'api/certificates/{certificate}' => 'detalhe de um certificado',
        'api/courses/{course}' => 'detalhe de um curso',
        'api/clients/{client}' => 'detalhe de um cliente',
        'api/budgets/{budget}' => 'detalhe de um orçamento',
        'api/quotes/{quote}' => 'detalhe de uma cotação',
        'api/redatores/{redator}' => 'detalhe de um redator',
        'api/users/{user}' => 'detalhe de um usuário',
        'api/students/{student}' => 'detalhe de um aluno',
    ];

    /** Contagem fixa por papel de `dashboard/metricas`. Meça (Step 4) e grave o número real. */
    private const DASHBOARD = ['admin' => 30, 'redator' => 15];

    private int $seq = 0;

    private ?int $paiId = null;

    protected function setUp(): void
    {
        parent::setUp();
        Carbon::setTestNow('2026-08-28 12:00:00');
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    // ------------------------------------------------------------ descoberta

    public function test_toda_rota_get_de_lista_tem_cenario_ou_motivo(): void
    {
        $semCobertura = [];

        foreach ($this->rotasGet() as $uri) {
            $comParametro = str_contains($uri, '{');
            $coberta = $comParametro
                ? array_key_exists($uri, self::COM_PAI) || array_key_exists($uri, self::COM_PAI_ISENTAS)
                : array_key_exists($uri, $this->cenarios()) || array_key_exists($uri, self::ISENTAS) || $uri === 'api/dashboard/metricas';

            if (! $coberta) {
                $semCobertura[] = $uri;
            }
        }

        sort($semCobertura);

        $this->assertSame([], $semCobertura, implode("\n", array_merge(
            ['Rota GET api/* sem cenário em ListQueryBudgetTest nem motivo em ISENTAS/COM_PAI_ISENTAS:'],
            $semCobertura,
        )));
    }

    public function test_as_listas_de_isentas_estao_declaradas_com_motivo_e_sem_sobra(): void
    {
        $existentes = $this->rotasGet();

        foreach ([self::ISENTAS, self::COM_PAI, self::COM_PAI_ISENTAS] as $lista) {
            foreach ($lista as $uri => $motivo) {
                $this->assertContains($uri, $existentes, "Declarada e inexistente no roteador: {$uri}.");
                $this->assertGreaterThan(30, strlen(trim($motivo)), "Motivo curto demais para {$uri}.");
            }
        }
    }

    // --------------------------------------------------------------- orçamento

    /** @return array<string, array{0: string}> */
    public static function rotasSemParametro(): array
    {
        return array_map(fn (string $uri) => [$uri], array_combine(array_keys(self::CENARIOS_URIS), array_keys(self::CENARIOS_URIS)));
    }

    /**
     * @dataProvider rotasSemParametro
     */
    public function test_a_contagem_de_queries_nao_cresce_com_n(string $uri): void
    {
        $this->actingAsAdmin();
        $semear = $this->cenarios()[$uri];

        $semear(self::N_PEQUENO);
        $this->getJson('/'.$uri)->assertOk();          // aquecimento: cache de permissão, sessão
        $comDois = $this->contar($uri);

        $semear(self::N_GRANDE - self::N_PEQUENO);
        $comVinte = $this->contar($uri);

        $this->assertSame($comDois, $comVinte, sprintf(
            "%s custa %d queries com N=%d e %d com N=%d — há consulta por linha.\nÚltimas queries:\n%s",
            $uri, $comDois, self::N_PEQUENO, $comVinte, self::N_GRANDE, implode("\n", $this->ultimas),
        ));
    }

    /** @return array<string, array{0: string}> */
    public static function rotasComPai(): array
    {
        return array_map(fn (string $uri) => [$uri], array_combine(array_keys(self::COM_PAI), array_keys(self::COM_PAI)));
    }

    /**
     * @dataProvider rotasComPai
     */
    public function test_a_contagem_de_queries_das_listas_aninhadas_nao_cresce_com_n(string $padrao): void
    {
        $this->actingAsAdmin();
        [$semearPai, $semearFilhos] = $this->cenariosComPai()[$padrao];

        $semearPai();
        $uri = str_replace(['{budget}', '{turma}'], (string) $this->paiId, $padrao);

        $semearFilhos(self::N_PEQUENO);
        $this->getJson('/'.$uri)->assertOk();
        $comDois = $this->contar($uri);

        $semearFilhos(self::N_GRANDE - self::N_PEQUENO);
        $comVinte = $this->contar($uri);

        $this->assertSame($comDois, $comVinte, "{$padrao}: {$comDois} queries com N=2, {$comVinte} com N=20.\n".implode("\n", $this->ultimas));
    }

    public function test_dashboard_custa_um_numero_fixo_por_papel(): void
    {
        $this->actingAsAdmin();
        $this->semearDashboard(self::N_PEQUENO);
        $this->getJson('/api/dashboard/metricas')->assertOk();
        $adminDois = $this->contar('api/dashboard/metricas');
        $this->semearDashboard(self::N_GRANDE - self::N_PEQUENO);
        $adminVinte = $this->contar('api/dashboard/metricas');

        $this->assertSame($adminDois, $adminVinte, 'Dashboard do admin cresce com N.');
        $this->assertSame(self::DASHBOARD['admin'], $adminVinte, "Dashboard do admin custa {$adminVinte} queries; a constante diz ".self::DASHBOARD['admin'].'. Mudou de propósito? Atualize a constante no mesmo commit.');

        $redator = $this->actingAsRedator();
        Turma::query()->get()->each(fn (Turma $t) => $t->redatores()->syncWithoutDetaching([$redator->id]));
        $this->getJson('/api/dashboard/metricas')->assertOk();
        $redatorVinte = $this->contar('api/dashboard/metricas');

        $this->assertSame(self::DASHBOARD['redator'], $redatorVinte, "Dashboard do redator custa {$redatorVinte} queries; a constante diz ".self::DASHBOARD['redator'].'.');
    }

    // ---------------------------------------------------------------- cenários

    /** Só as chaves, para o data provider (estático) — o corpo está em `cenarios()`. */
    private const CENARIOS_URIS = [
        'api/students' => 1, 'api/certificates' => 1, 'api/certificates/emission-panel' => 1,
        'api/turmas' => 1, 'api/turmas/archived' => 1, 'api/turmas/pendientes-configuracion' => 1,
        'api/courses' => 1, 'api/courses/archived' => 1,
        'api/clients' => 1, 'api/clients/archived' => 1,
        'api/budgets' => 1, 'api/budgets/archived' => 1,
        'api/redatores' => 1, 'api/redatores/archived' => 1,
        'api/users' => 1, 'api/users/archived' => 1,
        'api/roles' => 1,
    ];

    /**
     * Cada closure semeia MAIS `$n` exemplares completos do agregado — chamada
     * duas vezes, acumula 2 e depois 20. Cadeias inteiras (cliente→orçamento→
     * cotação→turma→matrícula), porque é a travessia da projeção que custa.
     *
     * @return array<string, Closure(int): void>
     */
    private function cenarios(): array
    {
        return [
            'api/students' => function (int $n): void {
                $client = $this->cliente();
                for ($i = 0; $i < $n; $i++) {
                    Student::create(['user_id' => $this->aluno()->id, 'current_client_id' => $client->id]);
                }
            },
            'api/certificates' => function (int $n): void {
                for ($i = 0; $i < $n; $i++) {
                    $this->certificado($this->cadeia());
                }
            },
            'api/certificates/emission-panel' => function (int $n): void {
                for ($i = 0; $i < $n; $i++) {
                    $this->cadeia();
                }
            },
            'api/turmas' => function (int $n): void {
                for ($i = 0; $i < $n; $i++) {
                    $this->comDocumentos($this->cadeia(concluida: false)->turmaModel());
                }
            },
            'api/turmas/archived' => function (int $n): void {
                for ($i = 0; $i < $n; $i++) {
                    $this->comDocumentos($this->cadeia(concluida: false)->turmaModel())->delete();
                }
            },
            'api/turmas/pendientes-configuracion' => function (int $n): void {
                for ($i = 0; $i < $n; $i++) {
                    $this->cotacaoAprovadaSemTurma();
                }
            },
            'api/courses' => fn (int $n) => $this->repetir($n, fn () => $this->curso()),
            'api/courses/archived' => fn (int $n) => $this->repetir($n, fn () => $this->curso()->delete()),
            'api/clients' => fn (int $n) => $this->repetir($n, fn () => $this->cliente()),
            'api/clients/archived' => fn (int $n) => $this->repetir($n, fn () => $this->cliente()->delete()),
            'api/budgets' => fn (int $n) => $this->repetir($n, fn () => $this->orcamento()),
            'api/budgets/archived' => fn (int $n) => $this->repetir($n, fn () => $this->orcamento()->delete()),
            'api/redatores' => fn (int $n) => $this->repetir($n, fn () => $this->redator()),
            'api/redatores/archived' => fn (int $n) => $this->repetir($n, fn () => $this->redator()->delete()),
            'api/users' => fn (int $n) => $this->repetir($n, fn () => $this->staff()),
            'api/users/archived' => fn (int $n) => $this->repetir($n, fn () => $this->staff()->delete()),
            'api/roles' => fn (int $n) => $this->repetir($n, fn () => Role::create(['name' => 'papel-'.(++$this->seq), 'guard_name' => 'web'])),
        ];
    }

    /**
     * @return array<string, array{0: Closure(): void, 1: Closure(int): void}>
     */
    private function cenariosComPai(): array
    {
        $orcamento = function (): void {
            $this->paiId = $this->orcamento()->id;
        };
        $turma = function (): void {
            $this->paiId = $this->cadeia(concluida: false)->turmaModel()->id;
        };

        return [
            'api/budgets/{budget}/quotes' => [$orcamento, fn (int $n) => $this->repetir($n, fn () => $this->cotacao(Budget::findOrFail($this->paiId)))],
            'api/budgets/{budget}/quotes/archived' => [$orcamento, fn (int $n) => $this->repetir($n, fn () => $this->cotacao(Budget::findOrFail($this->paiId))->delete())],
            'api/turmas/{turma}/alunos' => [$turma, fn (int $n) => $this->repetir($n, fn () => $this->matricula(Turma::findOrFail($this->paiId)))],
            'api/turmas/{turma}/alunos/archived' => [$turma, fn (int $n) => $this->repetir($n, fn () => $this->matricula(Turma::findOrFail($this->paiId))->delete())],
            'api/turmas/{turma}/documents' => [$turma, fn (int $n) => $this->repetir($n, fn () => $this->documento(Turma::findOrFail($this->paiId)))],
        ];
    }

    private function semearDashboard(int $n): void
    {
        for ($i = 0; $i < $n; $i++) {
            $builder = $this->cadeia();
            $this->certificado($builder);
            $this->comDocumentos($this->cadeia(concluida: false)->turmaModel());
            $this->cotacaoAprovadaSemTurma();
            $builder->redatorModel()->files()->create([
                'type' => 'REUF', 'path' => 'r.pdf', 'original_name' => 'r.pdf', 'mime' => 'application/pdf', 'size' => 10,
                'valid_until' => '2026-09-10',
            ]);
        }
    }

    // ---------------------------------------------------------------- fixtures

    private function cadeia(bool $concluida = true): IssuableEnrollmentBuilder
    {
        $n = ++$this->seq;
        $pad = str_pad((string) $n, 4, '0', STR_PAD_LEFT);
        $builder = IssuableEnrollmentBuilder::make()
            ->client(['legal_name' => "Empresa {$n} SpA"], ['rut' => "1.00{$pad}-0"])
            ->course(['name' => "Curso {$n}"])
            ->student(['rut' => "2.00{$pad}-0"])
            ->redatorUser(['rut' => "3.00{$pad}-0"])
            ->turma(['modalidade' => TurmaModalidade::Presencial, 'local_aplicacao' => 'Santiago', 'start_date' => '2026-07-20', 'end_date' => '2026-07-24']);

        return ($concluida ? $builder : $builder->turmaNaoConcluida())->create();
    }

    private function certificado(IssuableEnrollmentBuilder $builder): Certificate
    {
        $n = ++$this->seq;

        return Certificate::create([
            'uuid' => (string) Str::uuid(),
            'enrollment_id' => $builder->enrollmentModel()->id,
            'course_id' => $builder->courseModel()->id,
            'redator_id' => $builder->redatorModel()->id,
            'codigo' => 'LOT-2026-'.str_pad((string) $n, 4, '0', STR_PAD_LEFT),
            'snapshot' => ['schema_version' => 2, 'aluno' => ['name' => "Alumno {$n}", 'rut' => null], 'curso' => ['name' => "Curso {$n}"], 'emissor' => ['name' => 'Lotus']],
            'valido_ate' => '2026-09-15',
            'status' => CertificateStatus::Emitido,
            'revoked_at' => null,
            'revocation_reason' => null,
        ]);
    }

    private function comDocumentos(Turma $turma): Turma
    {
        foreach (TurmaDocumentType::cases() as $type) {
            $this->documento($turma, $type->value);
        }

        return $turma;
    }

    private function documento(Turma $turma, string $type = 'MANUAL'): \App\Shared\Files\Models\File
    {
        return $turma->files()->create(['type' => $type, 'path' => 'x.pdf', 'original_name' => 'x.pdf', 'mime' => 'application/pdf', 'size' => 10]);
    }

    private function cliente(): \App\Domains\Commercial\Models\Client
    {
        $n = ++$this->seq;

        return $this->makeClientWithUser(['legal_name' => "Cliente {$n} SpA"], ['name' => "Cliente {$n}", 'rut' => '7.'.str_pad((string) $n, 6, '0', STR_PAD_LEFT).'-0']);
    }

    private function curso(): Course
    {
        return $this->makeCourse(['name' => 'Curso '.(++$this->seq)]);
    }

    private function orcamento(): Budget
    {
        $n = ++$this->seq;

        return Budget::create(['client_id' => $this->cliente()->id, 'code' => "Scap {$n}"]);
    }

    private function cotacao(Budget $budget): Quote
    {
        return Quote::forceCreate([
            'budget_id' => $budget->id, 'course_id' => $this->curso()->id,
            'seq_in_budget' => $budget->quotes()->withTrashed()->count() + 1,
            'student_count' => 1, 'value_uf' => 10, 'status' => 'pending',
        ]);
    }

    private function cotacaoAprovadaSemTurma(): Quote
    {
        $quote = $this->cotacao($this->orcamento());
        $quote->forceFill(['status' => 'approved'])->save();

        return $quote;
    }

    private function aluno(): User
    {
        $n = ++$this->seq;

        return User::factory()->aluno()->create(['name' => "Alumno {$n}", 'rut' => '4.'.str_pad((string) $n, 6, '0', STR_PAD_LEFT).'-0']);
    }

    private function matricula(Turma $turma): Enrollment
    {
        $student = Student::create(['user_id' => $this->aluno()->id, 'current_client_id' => $turma->contratanteClient()->id]);

        return Enrollment::create(['turma_id' => $turma->id, 'student_id' => $student->id, 'approval_status' => EnrollmentApprovalStatus::Pendiente]);
    }

    private function redator(): Redator
    {
        $n = ++$this->seq;
        $user = User::factory()->redator()->create(['name' => "Relator {$n}", 'rut' => '5.'.str_pad((string) $n, 6, '0', STR_PAD_LEFT).'-0']);
        $user->loginLogs()->create([]);

        return Redator::create(['user_id' => $user->id]);
    }

    private function staff(): User
    {
        $user = User::factory()->create(['type' => 'admin', 'name' => 'Staff '.(++$this->seq)]);
        $user->loginLogs()->create([]);

        return $user;
    }

    private function actingAsRedator(): Redator
    {
        $this->seed(RolePermissionSeeder::class);
        $user = User::factory()->create(['type' => 'redator', 'is_active' => true, 'rut' => '9.999.999-K']);
        $user->assignRole('redator');
        $this->actingAs($user, 'web');

        return Redator::create(['user_id' => $user->id]);
    }

    private function repetir(int $n, Closure $fn): void
    {
        for ($i = 0; $i < $n; $i++) {
            $fn();
        }
    }

    // ----------------------------------------------------------------- medição

    /** @var list<string> */
    private array $ultimas = [];

    private function contar(string $uri): int
    {
        $queries = [];
        $ouvinte = function (QueryExecuted $query) use (&$queries): void {
            $queries[] = $query->sql;
        };

        DB::listen($ouvinte);
        $this->getJson('/'.$uri)->assertOk();
        $this->ultimas = $queries;

        return count($queries);
    }

    /** @return list<string> uris `GET api/*` do roteador montado */
    private function rotasGet(): array
    {
        $uris = [];

        /** @var Route $rota */
        foreach (RouteFacade::getRoutes() as $rota) {
            if (in_array('GET', $rota->methods(), true) && str_starts_with($rota->uri(), 'api/')) {
                $uris[] = $rota->uri();
            }
        }

        return array_values(array_unique($uris));
    }
}
```

> `DB::listen` acumula ouvintes por processo; cada `contar()` registra o seu e só lê o array próprio, então a soma não vaza entre chamadas. O `$this->ultimas` do assert é diagnóstico: quando reprova, a mensagem traz as queries do request grande.

- [ ] **Step 4: Rodar, medir e gravar os números**

Run: `docker compose exec -T app php artisan test --filter=ListQueryBudgetTest`
Expected na primeira rodada: a descoberta pode acusar rota que este plano não previu (leia a lista e classifique: cenário ou isenta com motivo); `test_dashboard_custa_um_numero_fixo_por_papel` reprova na constante — **leia o número medido na mensagem e grave em `DASHBOARD`**, os dois papéis; qualquer rota cuja contagem cresça com N é um N+1 real: corrija o `LISTING`/`with()` do caminho (nunca o cenário) e liste no commit.

Run novamente até PASS. **Sonda obrigatória (DoD 5):** remova `'enrollment.student.user'` de `CertificateQueryBuilder::LISTING`, rode `--filter='ListQueryBudgetTest::test_a_contagem_de_queries_nao_cresce_com_n'` — `api/certificates` reprova com contagem maior em N=20 —, restaure e rode de novo verde. Anote a sonda (número antes/depois) na `audits/…-medicoes.md`, seção "Catraca de contagem".

- [ ] **Step 5: Suíte inteira, Pint, commit**

Run: `docker compose exec -T app php artisan test`
Expected: verde.

```bash
cd backend && ./vendor/bin/pint app/Providers/AppServiceProvider.php tests/Feature/Shared/ListQueryBudgetTest.php tests/Feature/Operation/EnrollmentResultTest.php tests/Feature/Dashboard/DashboardEndpointTest.php tests/Feature/Shared/ContratanteEagerLoadTest.php tests/Feature/Identity/LastLoginEagerLoadTest.php tests/Feature/Certification/CertificateEagerLoadTest.php && cd ..
git add backend/app backend/tests docs/superpowers/audits/2026-08-28-hardening-performance-e-dados-medicoes.md
git commit -m "test(shared): preventLazyLoading global e ListQueryBudgetTest, catraca de contagem por rota de lista"
```

---
## Task 12: Cenário de medição, `EXPLAIN` e a migration de índices (D10, D11, §4.4, P-66)

**Files:**
- Create: `backend/database/seeders/PerformanceScenarioSeeder.php`
- Create: `backend/database/migrations/2026_08_28_000001_add_performance_indexes.php`
- Modify (condicional ao `EXPLAIN`): `backend/app/Domains/Dashboard/Services/IdentityMetricsQuery.php:35`, `backend/app/Domains/Dashboard/Services/RedatorScopeQuery.php:129`
- Modify: `docs/superpowers/audits/2026-08-28-hardening-performance-e-dados-medicoes.md`
- Modify: `docs/superpowers/pendencias/abertas.md` (P-66 sai), `docs/superpowers/pendencias/encerradas.md` (P-66 entra em rastro), `docs/superpowers/pendencias/README.md` (linha da P-66)

**Interfaces:**
- Consumes: todo o schema (`docs/der-fisico.md`); `Rut` (DV módulo 11); os endpoints das Tasks 4–10.
- Produces: `db:seed --class=PerformanceScenarioSeeder` (dev-only); os índices aprovados; as medições.

- [ ] **Step 1: O seeder**

```php
<?php

namespace Database\Seeders;

use App\Domains\Identity\Models\Student;
use App\Shared\Support\Rut;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * Cenário de MEDIÇÃO (spec D11): ~5.000 alunos, ~200 clientes, ~50 redatores,
 * ~500 turmas em cinco anos, ~8.000 matrículas, ~6.000 certificados e ~20.000
 * logins. Serve ao `EXPLAIN` e à latência da Task 12 — nunca à suíte, que
 * segue com N pequeno.
 *
 * Duas diferenças deliberadas do `OperationDemoSeeder`:
 *
 * 1. **Insert em lote, não Actions.** 5k `bcrypt` por Action inviabiliza; o
 *    hash de senha é UM, calculado uma vez. Não há evento de model, então não
 *    há auditoria — este dado não tem peso legal, é volume.
 * 2. **Não entra no `DatabaseSeeder`.** Só por comando explícito:
 *    `php artisan db:seed --class=PerformanceScenarioSeeder`.
 *
 * O que NÃO é sintético: todo RUT tem DV válido (módulo 11, pelo `Rut`), toda
 * matrícula tem turma e aluno, todo certificado tem matrícula aprovada de
 * turma concluída e `snapshot` apresentável, todo aluno tem vínculo aberto.
 * As contagens que os endpoints mostram batem com as linhas reais.
 */
class PerformanceScenarioSeeder extends Seeder
{
    private const CLIENTES = 200;

    private const REDATORES = 50;

    private const ALUNOS = 5000;

    private const TURMAS = 500;

    private const ANOS = 5;

    private const LOGINS = 20000;

    private const LOTE = 500;

    private const CURSOS = [
        ['Trabajos en líneas energizadas 220kV', 40],
        ['Seguridad en alta tensión', 24],
        ['Mantenimiento de subestaciones', 32],
        ['Operación de redes de distribución', 16],
        ['Rescate en altura', 8],
    ];

    private const NOMES = ['Camila', 'Matías', 'Valentina', 'Sebastián', 'Javiera', 'Diego', 'Antonia', 'Cristóbal', 'Fernanda', 'Nicolás', 'Catalina', 'Ignacio', 'Josefa', 'Vicente', 'Isidora', 'Tomás', 'Martina', 'Benjamín', 'Sofía', 'Lucas'];

    private const SOBRENOMES = ['Aguilera', 'Bustamante', 'Cárdenas', 'Donoso', 'Escobar', 'Fuenzalida', 'Gallardo', 'Hormazábal', 'Inostroza', 'Jaramillo', 'Lagos', 'Maldonado', 'Navarro', 'Ortega', 'Pizarro', 'Quiroga', 'Riquelme', 'Salazar', 'Toledo', 'Urrutia'];

    public function run(): void
    {
        if (! app()->environment(['local', 'demo'])) {
            $this->command?->warn('PerformanceScenarioSeeder ignorado: só roda em local/demo.');

            return;
        }

        if (Student::query()->withTrashed()->count() > 1000) {
            $this->command?->warn('PerformanceScenarioSeeder ignorado: já há mais de 1.000 alunos. Rode `migrate:fresh --seed` antes.');

            return;
        }

        $inicio = microtime(true);
        $senha = Hash::make('senha123');
        $agora = now()->toDateTimeString();
        $seq = (int) (DB::table('users')->max('id') ?? 0) + 1;

        DB::transaction(function () use ($senha, $agora, &$seq): void {
            $cursos = $this->cursos($agora);
            $clientes = $this->clientes($senha, $agora, $seq);
            $redatores = $this->redatores($senha, $agora, $seq);
            $alunos = $this->alunos($senha, $agora, $seq, $clientes);
            [$turmas, $redatorPorTurma] = $this->turmas($agora, $cursos, $clientes, $redatores);
            $matriculas = $this->matriculas($agora, $turmas, $alunos);
            $this->certificados($agora, $turmas, $matriculas, $redatorPorTurma, $alunos, $cursos);
            $this->logins($agora, $redatores);
        });

        $this->command?->info(sprintf('PerformanceScenarioSeeder: %d alunos, %d turmas, %d matrículas, %d certificados em %.1fs.',
            DB::table('students')->count(), DB::table('turmas')->count(), DB::table('enrollments')->count(), DB::table('certificates')->count(), microtime(true) - $inicio));
    }

    /** @return array<int, array{id: int, workload: int}> */
    private function cursos(string $agora): array
    {
        $ids = [];
        foreach (self::CURSOS as [$name, $workload]) {
            $ids[] = ['id' => DB::table('courses')->insertGetId(['name' => $name, 'workload_hours' => $workload, 'created_at' => $agora, 'updated_at' => $agora]), 'workload' => $workload];
        }

        return $ids;
    }

    /** @return list<int> ids de `clients` */
    private function clientes(string $senha, string $agora, int &$seq): array
    {
        $ids = [];
        for ($i = 1; $i <= self::CLIENTES; $i++) {
            $n = $seq++;
            $userId = DB::table('users')->insertGetId([
                'uuid' => (string) Str::uuid(), 'name' => "Empresa Eléctrica {$i} S.A.", 'rut' => $this->rut(76000000 + $n),
                'email' => "empresa{$n}@perf.demo.cl", 'password' => $senha, 'type' => 'cliente', 'is_active' => false,
                'created_at' => $agora, 'updated_at' => $agora,
            ]);
            $ids[] = DB::table('clients')->insertGetId(['user_id' => $userId, 'legal_name' => "Empresa Eléctrica {$i} S.A.", 'type' => 'client', 'created_at' => $agora, 'updated_at' => $agora]);
        }

        return $ids;
    }

    /** @return list<int> ids de `redatores` */
    private function redatores(string $senha, string $agora, int &$seq): array
    {
        $ids = [];
        for ($i = 1; $i <= self::REDATORES; $i++) {
            $n = $seq++;
            $userId = DB::table('users')->insertGetId([
                'uuid' => (string) Str::uuid(), 'name' => $this->nome($n), 'rut' => $this->rut(15000000 + $n),
                'email' => "relator{$n}@perf.demo.cl", 'password' => $senha, 'type' => 'redator', 'is_active' => true,
                'created_at' => $agora, 'updated_at' => $agora,
            ]);
            $ids[] = DB::table('redatores')->insertGetId(['user_id' => $userId, 'created_at' => $agora, 'updated_at' => $agora]);
        }

        return $ids;
    }

    /**
     * @param  list<int>  $clientes
     * @return list<array{id: int, client_id: int, name: string, rut: string}>
     */
    private function alunos(string $senha, string $agora, int &$seq, array $clientes): array
    {
        $alunos = [];
        $lote = [];
        $primeiroUserId = null;

        for ($i = 1; $i <= self::ALUNOS; $i++) {
            $n = $seq++;
            $lote[] = [
                'uuid' => (string) Str::uuid(), 'name' => $this->nome($n), 'rut' => $this->rut(16000000 + $n),
                'email' => "alumno{$n}@perf.demo.cl", 'password' => $senha, 'type' => 'aluno', 'is_active' => false,
                'created_at' => $agora, 'updated_at' => $agora,
            ];
            if (count($lote) === self::LOTE || $i === self::ALUNOS) {
                DB::table('users')->insert($lote);
                $lote = [];
            }
        }

        // Recupera os ids pelos e-mails sintéticos: insert em lote não devolve ids.
        $users = DB::table('users')->where('email', 'like', 'alumno%@perf.demo.cl')->orderBy('id')->get(['id', 'name', 'rut']);
        $students = [];
        foreach ($users as $k => $user) {
            $students[] = ['user_id' => $user->id, 'current_client_id' => $clientes[$k % count($clientes)], 'created_at' => $agora, 'updated_at' => $agora];
        }
        foreach (array_chunk($students, self::LOTE) as $chunk) {
            DB::table('students')->insert($chunk);
        }

        $rows = DB::table('students')->join('users', 'users.id', '=', 'students.user_id')
            ->where('users.email', 'like', 'alumno%@perf.demo.cl')->orderBy('students.id')
            ->get(['students.id', 'students.current_client_id', 'users.name', 'users.rut']);

        $logs = [];
        foreach ($rows as $row) {
            $alunos[] = ['id' => $row->id, 'client_id' => $row->current_client_id, 'name' => $row->name, 'rut' => $row->rut];
            $logs[] = ['student_id' => $row->id, 'client_id' => $row->current_client_id, 'started_on' => '2021-01-04', 'ended_on' => null, 'created_at' => $agora, 'updated_at' => $agora];
        }
        foreach (array_chunk($logs, self::LOTE) as $chunk) {
            DB::table('student_client_logs')->insert($chunk);
        }

        return $alunos;
    }

    /**
     * Cinco anos de turmas: 100 por ano, 70% concluídas (as do passado), com
     * documentação completa em 60% das em andamento. Cada turma nasce de um
     * orçamento do cliente (um `Scap` por cliente, cotações sequenciais).
     *
     * @param  list<array{id: int, workload: int}>  $cursos
     * @param  list<int>  $clientes
     * @param  list<int>  $redatores
     * @return array{0: list<array{id: int, course_id: int, client_id: int, concluida: bool, end: string}>, 1: array<int, int>}
     */
    private function turmas(string $agora, array $cursos, array $clientes, array $redatores): array
    {
        $orcamentoPorCliente = [];
        $seqPorOrcamento = [];
        $turmas = [];
        $redatorPorTurma = [];
        $porAno = intdiv(self::TURMAS, self::ANOS);

        for ($i = 0; $i < self::TURMAS; $i++) {
            $ano = 2021 + intdiv($i, $porAno) % self::ANOS;
            $dia = 1 + ($i * 7) % 340;
            $inicio = \Carbon\CarbonImmutable::create($ano, 1, 1)->addDays($dia);
            $fim = $inicio->addDays(5);
            $concluida = $fim->lessThan(now()->subDays(14));
            $clientId = $clientes[$i % count($clientes)];
            $curso = $cursos[$i % count($cursos)];

            $budgetId = $orcamentoPorCliente[$clientId] ??= DB::table('budgets')->insertGetId([
                'client_id' => $clientId, 'code' => 'Scap '.(1000 + count($orcamentoPorCliente)), 'payment_terms' => '30 días', 'created_at' => $agora, 'updated_at' => $agora,
            ]);
            $seqPorOrcamento[$budgetId] = ($seqPorOrcamento[$budgetId] ?? 0) + 1;

            $quoteId = DB::table('quotes')->insertGetId([
                'budget_id' => $budgetId, 'course_id' => $curso['id'], 'seq_in_budget' => $seqPorOrcamento[$budgetId],
                'student_count' => 16, 'planned_start_date' => $inicio->toDateString(), 'planned_end_date' => $fim->toDateString(),
                'value_uf' => '120.0000', 'status' => 'approved', 'approved_at' => $inicio->subDays(20)->toDateTimeString(),
                'created_at' => $agora, 'updated_at' => $agora,
            ]);

            $turmaId = DB::table('turmas')->insertGetId([
                'quote_id' => $quoteId, 'course_id' => $curso['id'], 'modalidade' => $i % 3 === 0 ? 'online' : 'presencial',
                'local_aplicacao' => $i % 3 === 0 ? null : 'Santiago', 'start_date' => $inicio->toDateString(), 'end_date' => $fim->toDateString(),
                'status' => $concluida ? 'concluida' : 'em_andamento', 'concluded_at' => $concluida ? $fim->addDay()->toDateTimeString() : null,
                'created_at' => $inicio->subDays(10)->toDateTimeString(), 'updated_at' => $agora,
            ]);

            $redatorId = $redatores[$i % count($redatores)];
            DB::table('turma_redator')->insert(['turma_id' => $turmaId, 'redator_id' => $redatorId, 'created_at' => $agora, 'updated_at' => $agora]);
            $redatorPorTurma[$turmaId] = $redatorId;

            $tipos = $concluida || $i % 5 < 3 ? ['MANUAL', 'PRUEBAS', 'EVALUACION_REDATOR'] : ['MANUAL'];
            foreach ($tipos as $tipo) {
                DB::table('files')->insert([
                    'fileable_type' => 'turma', 'fileable_id' => $turmaId, 'type' => $tipo, 'path' => "perf/turma-{$turmaId}-{$tipo}.pdf",
                    'original_name' => strtolower($tipo).'.pdf', 'mime' => 'application/pdf', 'size' => 1024, 'created_at' => $agora, 'updated_at' => $agora,
                ]);
            }

            $turmas[] = ['id' => $turmaId, 'course_id' => $curso['id'], 'client_id' => $clientId, 'concluida' => $concluida, 'end' => $fim->toDateString()];
        }

        return [$turmas, $redatorPorTurma];
    }

    /**
     * 16 alunos por turma (≈8.000), sempre alunos do MESMO cliente da turma —
     * o vínculo é a regra de negócio. `aprobado` em 80% das concluídas.
     *
     * @param  list<array{id: int, course_id: int, client_id: int, concluida: bool, end: string}>  $turmas
     * @param  list<array{id: int, client_id: int, name: string, rut: string}>  $alunos
     * @return array<int, list<array{id: int, student_id: int, aprovada: bool}>> turma_id => matrículas
     */
    private function matriculas(string $agora, array $turmas, array $alunos): array
    {
        $porCliente = [];
        foreach ($alunos as $aluno) {
            $porCliente[$aluno['client_id']][] = $aluno['id'];
        }

        $cursor = [];
        $lote = [];
        $chaves = [];
        foreach ($turmas as $turma) {
            $pool = $porCliente[$turma['client_id']];
            $cursor[$turma['client_id']] = $cursor[$turma['client_id']] ?? 0;
            for ($k = 0; $k < 16; $k++) {
                $studentId = $pool[($cursor[$turma['client_id']]++) % count($pool)];
                $aprovada = $turma['concluida'] && $k % 5 !== 0;
                $lote[] = [
                    'turma_id' => $turma['id'], 'student_id' => $studentId,
                    'approval_status' => $turma['concluida'] ? ($aprovada ? 'aprobado' : 'reprobado') : 'pendiente',
                    'attendance_pct' => $turma['concluida'] ? '90.00' : null, 'grades' => $turma['concluida'] ? json_encode(['final' => $aprovada ? 6.0 : 3.5]) : null,
                    'created_at' => $agora, 'updated_at' => $agora,
                ];
                $chaves[] = [$turma['id'], $studentId, $aprovada];
            }
        }
        foreach (array_chunk($lote, self::LOTE) as $chunk) {
            DB::table('enrollments')->insert($chunk);
        }

        $ids = DB::table('enrollments')->orderBy('id')->get(['id', 'turma_id', 'student_id'])->keyBy(fn ($e) => "{$e->turma_id}:{$e->student_id}");
        $resultado = [];
        foreach ($chaves as [$turmaId, $studentId, $aprovada]) {
            $resultado[$turmaId][] = ['id' => $ids["{$turmaId}:{$studentId}"]->id, 'student_id' => $studentId, 'aprovada' => $aprovada];
        }

        return $resultado;
    }

    /**
     * Um certificado por matrícula aprovada de turma concluída (≈6.000), com
     * validade de 24 meses a partir do fim da turma: assim o cenário tem
     * vigentes, por vencer, vencidos — e 5% revogados.
     *
     * @param  list<array{id: int, course_id: int, client_id: int, concluida: bool, end: string}>  $turmas
     * @param  array<int, list<array{id: int, student_id: int, aprovada: bool}>>  $matriculas
     * @param  array<int, int>  $redatorPorTurma
     * @param  list<array{id: int, client_id: int, name: string, rut: string}>  $alunos
     * @param  list<array{id: int, workload: int}>  $cursos
     */
    private function certificados(string $agora, array $turmas, array $matriculas, array $redatorPorTurma, array $alunos, array $cursos): void
    {
        $alunoPorId = array_column($alunos, null, 'id');
        $cursoPorId = array_column(self::CURSOS, 0);
        $lote = [];
        $seq = 0;

        foreach ($turmas as $turma) {
            if (! $turma['concluida']) {
                continue;
            }
            $ano = substr($turma['end'], 0, 4);
            foreach ($matriculas[$turma['id']] ?? [] as $m) {
                if (! $m['aprovada']) {
                    continue;
                }
                $seq++;
                $revogado = $seq % 20 === 0;
                $aluno = $alunoPorId[$m['student_id']];
                $lote[] = [
                    'uuid' => (string) Str::uuid(), 'enrollment_id' => $m['id'], 'course_id' => $turma['course_id'], 'redator_id' => $redatorPorTurma[$turma['id']],
                    'codigo' => sprintf('LOT-%s-%05d', $ano, $seq),
                    'snapshot' => json_encode([
                        'schema_version' => 2,
                        'aluno' => ['name' => $aluno['name'], 'rut' => $aluno['rut']],
                        'curso' => ['name' => $cursoPorId[array_search($turma['course_id'], array_column($cursos, 'id'), true)], 'workload_hours' => 16, 'modules' => []],
                        'emissor' => ['name' => 'Lotus Capacitación'],
                        'turma' => ['id' => $turma['id'], 'end_date' => $turma['end']],
                    ]),
                    'valido_ate' => \Carbon\CarbonImmutable::parse($turma['end'])->addMonths(24)->toDateString(),
                    'status' => $revogado ? 'revocado' : 'emitido',
                    'revoked_at' => $revogado ? $agora : null, 'revocation_reason' => $revogado ? 'Cenário de medição' : null,
                    'created_at' => \Carbon\CarbonImmutable::parse($turma['end'])->addDays(3)->toDateTimeString(), 'updated_at' => $agora,
                ];
            }
        }
        foreach (array_chunk($lote, self::LOTE) as $chunk) {
            DB::table('certificates')->insert($chunk);
        }
    }

    /**
     * Logins dos redatores espalhados por cinco anos — é o que a poda da
     * P-66 varre por `created_at`.
     *
     * @param  list<int>  $redatores
     */
    private function logins(string $agora, array $redatores): void
    {
        $userIds = DB::table('redatores')->whereIn('id', $redatores)->pluck('user_id')->all();
        $lote = [];
        for ($i = 0; $i < self::LOGINS; $i++) {
            $lote[] = [
                'user_id' => $userIds[$i % count($userIds)], 'ip_address' => '10.0.0.'.($i % 250 + 1), 'user_agent' => 'perf',
                'created_at' => now()->subDays($i % (365 * self::ANOS))->toDateTimeString(),
            ];
            if (count($lote) === self::LOTE) {
                DB::table('login_logs')->insert($lote);
                $lote = [];
            }
        }
        if ($lote !== []) {
            DB::table('login_logs')->insert($lote);
        }
    }

    private function nome(int $n): string
    {
        return self::NOMES[$n % count(self::NOMES)].' '.self::SOBRENOMES[intdiv($n, count(self::NOMES)) % count(self::SOBRENOMES)].' '.self::SOBRENOMES[$n % count(self::SOBRENOMES)];
    }

    /** DV calculado pelo validador do projeto — nunca hardcoded (molde `OperationDemoSeeder::rut`). */
    private function rut(int $number): string
    {
        foreach ([...range(0, 9), 'K'] as $dv) {
            $candidate = Rut::parse($number.$dv);
            if ($candidate->isValid()) {
                return $candidate->format();
            }
        }

        throw new \RuntimeException("Nenhum dígito verificador válido para o RUT {$number}.");
    }
}
```

Run: `docker compose exec -T app php artisan migrate:fresh --seed && docker compose exec -T app php artisan db:seed --class=PerformanceScenarioSeeder`
Expected: a linha `PerformanceScenarioSeeder: 5066 alunos, 505 turmas, ~8000 matrículas, ~6000 certificados em Ns.` (os 66/5 do `OperationDemoSeeder` somam). Se o MySQL recusar uma linha (coluna gerada, FK, unique), o erro aponta a coluna — corrija o seeder, nunca o schema. Rode `docker compose exec -T app php artisan db:seed --class=PerformanceScenarioSeeder` de novo e veja o gate de 1.000 recusar.

- [ ] **Step 2: Medição ANTES — `EXPLAIN` e latência, sem índice**

Crie a seção "Índices — EXPLAIN antes/depois" na `audits/…-medicoes.md`. Para cada candidato (spec D10), rode o `EXPLAIN` da consulta REAL que ele serve, pelo cliente do container do MySQL, e cole `key`, `rows` e `Extra`:

```bash
M='docker compose exec -T mysql mysql -uroot -psecret lotus -e'
$M "EXPLAIN SELECT turmas.* FROM turmas WHERE status='concluida' AND end_date >= '2025-08-28' AND deleted_at IS NULL ORDER BY end_date DESC, id DESC\G"                       # turmas(status, end_date) — painel de emissão
$M "EXPLAIN SELECT turmas.* FROM turmas WHERE start_date BETWEEN '2026-08-28' AND '2026-09-04' AND deleted_at IS NULL\G"                                                       # turmas(start_date) — agenda do Dashboard
$M "EXPLAIN SELECT students.*, (SELECT count(*) FROM enrollments WHERE students.id = enrollments.student_id AND enrollments.deleted_at IS NULL) AS enrollments_count FROM students INNER JOIN users ON users.id = students.user_id WHERE students.deleted_at IS NULL ORDER BY users.name ASC, students.id ASC LIMIT 25\G"   # enrollments(student_id) + users(name) — lista de alunos
$M "EXPLAIN SELECT certificates.* FROM certificates WHERE status='emitido' AND valido_ate <= '2026-09-27'\G"                                                                   # certificates(status, valido_ate) — alertas do Dashboard
$M "EXPLAIN SELECT certificates.* FROM certificates ORDER BY created_at DESC, id DESC LIMIT 25\G"                                                                              # certificates(created_at) — Historial default
$M "EXPLAIN SELECT certificates.* FROM certificates WHERE codigo LIKE '%LOT-2024%' OR json_unquote(json_extract(snapshot,'$.aluno.name')) LIKE '%Camila%' OR json_unquote(json_extract(snapshot,'$.aluno.rut')) LIKE '%16.0%' LIMIT 25\G"   # busca em snapshot (risco §8)
$M "EXPLAIN SELECT files.* FROM files WHERE fileable_type='redator' AND type IN ('REUF') AND date(valid_until) <= '2026-09-27' AND deleted_at IS NULL\G"                        # files(valid_until) COMO ESTÁ (whereDate)
$M "EXPLAIN SELECT files.* FROM files WHERE fileable_type='redator' AND type IN ('REUF') AND valid_until <= '2026-09-27 23:59:59' AND deleted_at IS NULL\G"                     # files(valid_until) sem date()
$M "EXPLAIN DELETE FROM login_logs WHERE created_at < '2025-08-28 00:00:00'\G"                                                                                                  # login_logs(created_at) — P-66
```

(Ajuste `type IN (...)` para os valores reais de `RedatorDocumentType` que `IdentityMetricsQuery`/`RedatorScopeQuery` filtram — leia os dois arquivos.) Latência, com a sessão do admin do seed (lição 12: `Origin` E `Accept`):

```bash
API=http://localhost:8080; J=/tmp/claude-1000/-home-jvbat-projetos-lotus/17e12309-dab7-48d7-96cb-d91fb679ba6d/scratchpad/cookies.txt
curl -s -c $J -H "Origin: http://localhost:5173" $API/sanctum/csrf-cookie
X=$(grep XSRF-TOKEN $J | awk '{print $7}' | python3 -c 'import sys,urllib.parse;print(urllib.parse.unquote(sys.stdin.read().strip()))')
curl -s -b $J -c $J -H "Origin: http://localhost:5173" -H "Accept: application/json" -H "Content-Type: application/json" -H "X-XSRF-TOKEN: $X" -d '{"email":"admin@lotus.cl","password":"senha123"}' $API/api/login
for u in 'api/students?per_page=25' 'api/certificates?per_page=25' 'api/dashboard/metricas' 'api/turmas?per_page=25' 'api/certificates/emission-panel'; do
  for i in 1 2 3 4 5; do curl -s -o /dev/null -w "$u %{time_total}\n" -b $J -H "Origin: http://localhost:5173" -H "Accept: application/json" "$API/$u"; done
done
```

Cole as cinco medições por endpoint (mediana) na seção "Latência — antes".

- [ ] **Step 3: A migration com os candidatos, e a poda dos recusados**

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Índices APROVADOS pelo `EXPLAIN` antes/depois sobre o cenário do
 * `PerformanceScenarioSeeder` (spec D10) — medição em
 * `docs/superpowers/audits/2026-08-28-hardening-performance-e-dados-medicoes.md`.
 * Candidato que o EXPLAIN não usou NÃO está aqui e está lá, como recusado.
 *
 * Um índice por linha, com a consulta que ele serve. Nomes explícitos para o
 * `down()` não depender da convenção.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('turmas', function (Blueprint $table) {
            // Painel de emissão: `status = 'concluida' AND end_date >= ? ORDER BY end_date DESC`.
            $table->index(['status', 'end_date'], 'turmas_status_end_date_index');
            // Agenda do Dashboard: `start_date BETWEEN ? AND ?`.
            $table->index('start_date', 'turmas_start_date_index');
        });

        Schema::table('certificates', function (Blueprint $table) {
            // Alertas de vencimento do Dashboard: `status = 'emitido' AND valido_ate <= ?`.
            $table->index(['status', 'valido_ate'], 'certificates_status_valido_ate_index');
            // Historial, ordem default: `ORDER BY created_at DESC LIMIT 25`.
            $table->index('created_at', 'certificates_created_at_index');
        });

        Schema::table('files', function (Blueprint $table) {
            // Documentos de redator vencendo: `valid_until <= ?` (sem `DATE()` — ver IdentityMetricsQuery).
            $table->index('valid_until', 'files_valid_until_index');
        });

        Schema::table('users', function (Blueprint $table) {
            // Lista de alunos: `ORDER BY users.name LIMIT 25` por join.
            $table->index('name', 'users_name_index');
        });

        Schema::table('login_logs', function (Blueprint $table) {
            // P-66: a poda (`PodarLogins`) recorta `WHERE created_at < ?`; o
            // composto `(user_id, created_at)` não serve consulta sem a coluna líder.
            $table->index('created_at', 'login_logs_created_at_index');
        });

        // `enrollments(student_id)` NÃO entra: `foreignId()->constrained()` já
        // faz o InnoDB criar `enrollments_student_id_foreign`, e o EXPLAIN do
        // sub-select de `withCount('enrollments')` o usa.
    }

    public function down(): void
    {
        Schema::table('turmas', fn (Blueprint $table) => $table->dropIndex('turmas_status_end_date_index'));
        Schema::table('turmas', fn (Blueprint $table) => $table->dropIndex('turmas_start_date_index'));
        Schema::table('certificates', fn (Blueprint $table) => $table->dropIndex('certificates_status_valido_ate_index'));
        Schema::table('certificates', fn (Blueprint $table) => $table->dropIndex('certificates_created_at_index'));
        Schema::table('files', fn (Blueprint $table) => $table->dropIndex('files_valid_until_index'));
        Schema::table('users', fn (Blueprint $table) => $table->dropIndex('users_name_index'));
        Schema::table('login_logs', fn (Blueprint $table) => $table->dropIndex('login_logs_created_at_index'));
    }
};
```

A migration nasce com TODOS os candidatos (menos `enrollments(student_id)`, já coberto pela FK — confirme no `EXPLAIN` do Step 2: `key: enrollments_student_id_foreign`). Rode:

```bash
docker compose exec -T app php artisan migrate
```

e repita cada `EXPLAIN` do Step 2 ("depois"). **Regra de decisão, por candidato:** fica se `key` passou a ser o índice novo E `rows` caiu; sai (apague o `index()` e o `dropIndex()` correspondentes, com um comentário de uma linha "recusado: EXPLAIN não usou — ver audits") se `key` continuou `NULL`/outro ou `rows` não caiu. Se `files(valid_until)` só for usado na forma SEM `date()`, troque em `IdentityMetricsQuery.php:35` e `RedatorScopeQuery.php:129` `->whereDate('valid_until', '<=', DashboardWindows::expiryHorizon())` por `->where('valid_until', '<=', DashboardWindows::expiryHorizon())` (o horizonte é `endOfDay()`, então a comparação por instante é a mesma por data; o `DashboardEndpointTest` continua provando o alerta) e anote. Se `users(name)` não for usado (o otimizador pode preferir filesort sobre 5k linhas), sai. A busca em `snapshot` fica registrada com `rows` e o tempo do `EXPLAIN ANALYZE` — se o custo for full scan acima de 100 ms, abra o plano B da spec (coluna gerada `snapshot_aluno_name` + índice) como pendência nova em `abertas.md`, não como task deste bloco.

Com a migration podada: `docker compose exec -T app php artisan migrate:rollback --step=1 && docker compose exec -T app php artisan migrate` (o `down()` é provado). E a suíte: `docker compose exec -T app php artisan test` (verde no sqlite — que aceita os índices, sem prová-los; a prova é o MySQL acima, lição 15).

- [ ] **Step 4: Medição DEPOIS e a P-66**

Repita o laço de latência do Step 2; cole na seção "Latência — depois", lado a lado com "antes".

P-66 (se `login_logs(created_at)` ficou, que é o esperado): remova a ficha de `abertas.md` (o bloco `## P-66 — …` inteiro) e a linha dela do índice em `pendencias/README.md`; acrescente em `encerradas.md`, sob "## Em rastro (saem no próximo `/fechar-sprint`)", atualizando o parêntese de contagem:

```markdown
### P-66 — a poda de `login_logs` varria `created_at` sem índice

**Fechada em 2026-08-28**, no `hardening-performance-e-dados` (Task 12), por mecanismo: a
migration `2026_08_28_000001_add_performance_indexes` cria `login_logs_created_at_index`, e o
`EXPLAIN DELETE FROM login_logs WHERE created_at < ?` sobre ~20 mil linhas do
`PerformanceScenarioSeeder` passou de full scan (`key: NULL`) para o índice novo — números em
[`audits/2026-08-28-hardening-performance-e-dados-medicoes.md`](../audits/2026-08-28-hardening-performance-e-dados-medicoes.md).
A assimetria com a `audits` (que ganhou o dela no bloco anterior) acabou.
```

- [ ] **Step 5: Pint e commit**

```bash
cd backend && ./vendor/bin/pint database/seeders/PerformanceScenarioSeeder.php database/migrations/2026_08_28_000001_add_performance_indexes.php app/Domains/Dashboard/Services && cd ..
git add backend/database backend/app/Domains/Dashboard docs/superpowers/audits/2026-08-28-hardening-performance-e-dados-medicoes.md docs/superpowers/pendencias
git commit -m "perf(db): indices aprovados por EXPLAIN sobre o PerformanceScenarioSeeder; fecha a P-66"
```

O corpo do commit lista, candidato a candidato: aprovado/recusado, `key` e `rows` antes/depois.

---
## Task 13: Docs, rules e verificação final do bloco

**Files:**
- Modify: `docs/estrutura-monolito.md:53-62` (Shared) e a linha de `Identity/` (QueryBuilders)
- Modify: `docs/der-fisico.md` — fichas de `users`, `login_logs`, `files`, `turmas`, `certificates`
- Modify: `docs/adrs.md` — ADR-22
- Modify: `.claude/rules/frontend-fsliced.md` — parágrafo "Tabela em card" e a linha das "duas exceções deliberadas"
- Modify: `.claude/rules/backend-ddd.md` — parágrafo sobre `Paginates`
- Modify: `docs/superpowers/audits/2026-08-28-hardening-performance-e-dados-medicoes.md` — seção "Gate final"

- [ ] **Step 1: `docs/estrutura-monolito.md`**

Na listagem de `Shared/`, depois de `Support/`:

```
│   ├── Support/                # value objects / helpers puros (Rut, JanelaDeAviso — os 30 dias da D-15, DataSql)
│   ├── Pagination/             # PageRequest (entrada), PageData/PageMetaData (envelope) e o trait Paginates
│   │                           #   que os QueryBuilders custom ganham (students, certificates, turmas — spec D1/D2)
```

Na descrição do domínio (`Identity`), onde a estrutura interna lista `QueryBuilders/`, acrescente "(`StudentQueryBuilder` nasceu no bloco de performance — Student era o único agregado paginado sem builder)".

- [ ] **Step 2: `docs/der-fisico.md`**

Em cada ficha, ao final da frase de índices, só os que a Task 12 APROVOU (copie da migration final):

- `users`: "Índices: `type`, (`type`,`is_active`), `name` (`users_name_index`, ordenação da lista de alunos por join)."
- `login_logs`: "Índice composto (`user_id`,`created_at`) e `login_logs_created_at_index` em `created_at` (poda — P-66, fechada em 2026-08-28)."
- `files`: "Índice: (`fileable_type`,`fileable_id`), `valid_until` (`files_valid_until_index`, alertas de vencimento do Dashboard)."
- `turmas`: "Índice: `status`, (`status`,`end_date`) (painel de emissão) e `start_date` (agenda)."
- `certificates`: acrescente "Índices: (`status`,`valido_ate`) e `created_at` (Historial). A listagem pagina (`GET /api/certificates`, 25 por página, teto 100) desde 2026-08-28."

Índice recusado não entra aqui — entra só na `audits/`.

- [ ] **Step 3: ADR-22**

Ao final de `docs/adrs.md`, no formato dos anteriores:

```markdown
## ADR-22 — Contrato de paginação próprio (`App\Shared\Pagination`), não o `LengthAwarePaginator`

**Contexto (2026-08-28):** nenhum endpoint de lista paginava; três crescem sem teto (alunos,
certificados, turmas). O `LengthAwarePaginator` do Laravel devolve `links/path/from/to` que a
SPA não lê, e o alias TS que o `typescript-transformer` emite para `PaginatedDataCollection`
aponta para a classe do framework sem tipo — o front tiparia à mão de qualquer jeito.

**Decisão:** `PageRequest` (entrada: `page` ≥ 1, `per_page` 1..100 default 25, `q` ≤ 100,
`sort` só da allowlist do builder — fora dela 422, nunca clamp), `PageData { data, meta }` com
`PageMetaData { page, per_page, total, last_page, total_unfiltered }`, e o trait `Paginates` no
QueryBuilder custom do agregado (ADR-02: builder, não Repository). `total_unfiltered` é medido
depois de `visibleTo` e antes de `q`/filtro, para o front medir o EFEITO do filtro. Busca e
filtro nomeado vão para o SQL, com paridade por teste contra a classificação de domínio
(`CertificateDisplayStatusParityTest`, `TurmaStatusParityTest`). Só pagina lista que cresce sem
teto; as bounded continuam devolvendo array.

**Consequências:** o front tem UM lugar que conhece o envelope (`shared/api/page.ts`) e UM hook
(`useServerTable`) com a mesma forma do `useTableFilter`, então a moldura não distingue as duas
fontes. Cursor foi descartado: sem `total`, o paginador e o rodapé de contagem morrem. Cache e
Redis ficam fora por decisão (spec D12), não por adiamento.
```

- [ ] **Step 4: Rules**

`.claude/rules/frontend-fsliced.md` — logo depois do parágrafo "**Tabela em card = `useTableFilter` + `AppCardToolbar` + `footerCount`.**", um parágrafo novo:

```markdown
- **Tabela paginada no SERVIDOR = `useServerTable` + a MESMA `SearchableTableFrame`, com
  `totalRecords`.** Lista que cresce sem teto (alunos, certificados, turmas — ADR-22) não passa
  por `useTableFilter`: filtrar no cliente uma página de 10 seria filtrar 10 de 5.000. O hook
  (`shared/hooks/useServerTable.ts`) devolve a mesma forma do `useTableFilter` mais
  `totalRecords`/`sortField`/`sortOrder`/`onSort`, e a tabela repassa os quatro à moldura — é o
  `totalRecords` que liga o `lazy` do `DataTable` e faz `AppDataTable` decidir `paginated` pela
  contagem do servidor, não por `data.length`. Busca (debounce de 300 ms), filtro nomeado e sort
  vão na URL (`PageQuery`, `shared/api/page.ts`, o único lugar que conhece o envelope); trocar
  qualquer um volta à página 1 dentro do hook — a tela não chama `resetPage()`. Coluna só ganha
  `sortable` se o campo estiver na allowlist do backend (`SORTABLE` do builder): em `lazy` o
  DataTable só emite o evento, e campo fora da lista é 422. `filtering` continua medindo EFEITO
  (`meta.total !== meta.total_unfiltered`), nunca presença. O dialog por id ganha fallback
  `useOne` (`useCrudDialog`): a entidade aberta pode não estar na página carregada.
```

E na linha "**Duas exceções deliberadas:** `useHistorial` e `useEmissionPanelState` devolvem `null`…", troque por "**Uma exceção deliberada:** `useEmissionPanelState` devolve `null` onde esta devolve `{}` — é outra política, e normalizá-la muda o que a tela mostra; não a unifique sem DoD que cubra a mudança. `useHistorial` deixou de ser exceção em 2026-08-28: a lista vem do `useServerTable`, que é a home única da política."

`.claude/rules/backend-ddd.md` — depois do parágrafo que descreve o QueryBuilder custom / `withListingData()` (localize por `grep -n "withListingData" .claude/rules/backend-ddd.md`), acrescente:

```markdown
- **Lista que cresce sem teto pagina pelo trait `Paginates` no builder do agregado (ADR-22).**
  O controller injeta `PageRequest` (ou a extensão com o filtro nomeado — `CertificatePageRequest`,
  `TurmaPageRequest`) e chama `->page($request, $present, filter:, meta:)`; o builder declara
  `SORTABLE` (allowlist, fora dela 422), `DEFAULT_SORT` e `searchable()`. Filtro que o front
  derivava vira SQL COM teste de paridade contra a classificação de domínio — o `CASE`/`whereHas`
  e o `for()`/`Service` são duas respostas esperando para divergir. `total_unfiltered` mede o escopo
  depois de `visibleTo`. Lista bounded (cursos, usuários, redatores, clientes, cotações por
  orçamento, alunos por turma) continua devolvendo array — paginar por simetria é
  sobre-engenharia. Toda rota `GET` de lista entra na catraca `ListQueryBudgetTest` (N=2 e N=20 com a
  mesma contagem de queries) ou declara motivo em `ISENTAS`; `Model::preventLazyLoading()` é
  global (`AppServiceProvider`), com `warning` em produção e exceção fora dela.
```

- [ ] **Step 5: Verificação final do bloco (DoD §7 inteiro, contra a API real)**

Com o `PerformanceScenarioSeeder` aplicado e a migration migrada:

1. `curl` como admin (sessão do Step 2 da Task 12): `GET /api/students?per_page=10&q=Camila&sort=-name` → 10 linhas em `data`, `meta.total` < `meta.total_unfiltered` = 5066; `per_page=101` → 422 `application/problem+json`; `sort=email` → 422.
2. `GET /api/certificates?display_status=por_vencer` → todo `data[].display_status === 'por_vencer'`; `meta.summary` soma `meta.total_unfiltered`.
3. `GET /api/turmas?status=habilitada` como admin → todo `data[].habilitada === true`; o mesmo request como redator (login com um `relatorN@perf.demo.cl` / `senha123` — ative o `is_active` está `true` no seeder) → só as dele, `meta.total_unfiltered` menor.
4. `GET /api/certificates/emission-panel` → só `end_date` ≥ hoje − 12 meses; `?concluidas_desde=2021-01-01` → as cinco safras.
5. `ListQueryBudgetTest` verde e a sonda registrada (Task 11).
6. `EXPLAIN` e latências (Task 12).
7. Navegador (Tasks 5, 7, 9, 10): reconfira com o cenário grande — "Ver" num aluno da página 3 abre o dialog (fallback `useOne`); o rodapé conta `meta.total`.
8. `grep -rn "= 30;" backend/app/Domains/Identity/Enums/DocumentValidityStatus.php backend/app/Domains/Dashboard/Services/DashboardWindows.php backend/app/Domains/Certification/Enums/CertificateDisplayStatus.php` → vazio.
9. Gate:

```bash
docker compose exec -T app php artisan test
docker compose exec -T app php artisan typescript:transform && git status --short frontend/src/shared/types/generated.ts   # vazio
cd frontend && pnpm lint && pnpm build && pnpm test && cd ..
cd backend && ./vendor/bin/pint --test $(git diff --name-only main -- 'backend/**/*.php' | sed 's#^backend/##') && cd ..
```

Registre cada item, com o comando e a saída decisiva, na seção "Gate final" da `audits/…-medicoes.md`.

- [ ] **Step 6: Commit**

```bash
git add docs/estrutura-monolito.md docs/der-fisico.md docs/adrs.md .claude/rules/frontend-fsliced.md .claude/rules/backend-ddd.md docs/superpowers/audits/2026-08-28-hardening-performance-e-dados-medicoes.md
git commit -m "docs: ADR-22, indices no der-fisico, Shared/Pagination na estrutura e rules do kit lazy"
```

---

## Verificação final do bloco

O que `/revisar-sprint` e `/fechar-sprint` vão pedir, e que a Task 13 deixa pronto:

- Backend verde (`docker compose exec -T app php artisan test`), com `ListQueryBudgetTest`, os dois de paridade, `PageRequestTest`, `JanelaDeAvisoTest`, `StudentPaginationTest`, `CertificatePaginationTest`, `TurmaPaginationTest`, `EmissionPanelWindowTest` na lista.
- `typescript:transform` sem diff residual; `pnpm lint` 0; `pnpm build` verde; `pnpm test` verde com `useServerTable`, `useCrudDialog`, `useRestoreAction` e as asserções novas em `AppDataTable`, `SearchableTableFrame`, `certificatesApi`, `HistorialTable`, `EmissionPanel`, `PeoplePage`, `useTurmasPage`.
- `audits/2026-08-28-hardening-performance-e-dados-medicoes.md` com: DoD 7 por tela (URLs da aba Network), sonda da catraca, `EXPLAIN` antes/depois por candidato com aprovado/recusado, latências antes/depois, gate final.
- P-66 em `encerradas.md`; nenhuma pendência nova sem ficha (a busca em `snapshot`, se degradar, ganha a dela).
- `generated.ts` commitado nas Tasks 2, 4, 6 e 8, com consumidores no mesmo commit.

---

## Handoff de execução

**executor: claude**

Não é tarefa mecânica de caminho fechado. Quatro razões, cada uma bastando sozinha:

1. **Toca uma lei do `CLAUDE.md` §5 no ponto de contato com o dado de peso legal.** O `CASE` de `display_status` (Task 6) e o `whereHas` de `habilitada` (Task 8) são a regra de domínio reescrita em SQL; a paridade é catraca, mas quem escreve os dois lados precisa entender POR QUE `hoje` é vigente e `hoje + 31` também — errar aqui não derruba a suíte se a fixture errar junto.
2. **Três números só existem depois de medir.** As contagens de `DASHBOARD` (Task 11) e a lista final de índices (Task 12) são decisão sobre `EXPLAIN` real: candidato aprovado ou recusado é julgamento com o número na mão, escrito no docblock ao lado — e a busca em `snapshot` pode abrir o plano B.
3. **`preventLazyLoading` global (Task 11) pode reprovar caminhos que a suíte não cobria.** Cada reprovação é um eager-load faltando, corrigido no `LISTING` certo — não no teste, não desligando a guarda. É triagem, não execução.
4. **O kit do frontend muda a forma de três telas e um wrapper compartilhado** (`AppDataTable`, `SearchableTableFrame`) que oito tabelas usam. As catracas cobrem o modo lazy; o que só o navegador prova (DoD 7) é que as cinco tabelas client-side continuam iguais.

Onde o Codex ajuda melhor neste bloco é **depois**: revisão independente do resultado, pelo `/revisar-sprint`.

**Árvore:** main tree, pelo precedente de todo bloco de backend (gate P-03 satisfeito: uma lane de backend, no main tree). Branch `feat/hardening-performance-e-dados`, aberta de `main@f584432b`. **Colisão conhecida com a `lane-c` (item 18):** `HistorialTable.tsx` — a Task 7 muda só props da moldura e `sortable` das colunas; célula, `style.ts` e `pt` ficam intactos (spec §8). Rebase antes do merge.

**Ordem das tasks é dependência, não preferência.** A Task 1 vem primeiro porque o `CASE` da Task 6 lê `JanelaDeAviso::DIAS`. A Task 2 vem antes de 4/6/8 porque elas usam o trait, e antes da 3 porque o front tipa `PageMetaData` gerado. A Task 3 vem antes de 5/7/9 porque as três telas usam o kit. As duplas 4→5, 6→7, 8→9 são backend→frontend do mesmo endpoint e fecham cada uma um estado consistente (a tela lê o envelope que o backend passou a devolver). A Task 10 é independente das duplas e vem depois delas só para o `DataSql` (Task 6) existir. A Task 11 vem depois de todas as rotas mudarem, porque a catraca conta as rotas como ficaram. A Task 12 vem depois da 11 porque mede sobre o código final e porque o `EXPLAIN` do painel depende da janela da Task 10. A Task 13 documenta o que as outras doze provaram.
