# Projeção de arquivados — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** a montagem da listagem de arquivados deixa de existir oito vezes e passa a existir uma, e o carimbo do 200 contra o 201 do `ResponsableData` deixa de existir catorze vezes e passa a existir uma.

**Architecture:** duas peças novas em `app/Shared/`. `Audit/ArchivedListing` recebe a coleção que a query do agregado já materializou e projeta (`lista`), e resolve o registro arquivado a partir de uma origem que o chamador escolhe (`resolveArquivado`). `Http/RespostaDeRecurso::ok` carimba o 200. Nenhuma Action, nenhum DTO, nenhuma rota e nenhuma query de agregado se move. Duas catracas estáticas fecham as portas depois que o último sítio migra.

**Tech Stack:** Laravel 13 / PHP 8.3 · `spatie/laravel-data` · `owen-it/laravel-auditing` · PHPUnit (sqlite `:memory:`) · Pint.

## Global Constraints

- **Lei §5.1 / ADR-02** — DDD-lite, **sem Repository sobre Eloquent**. Nenhuma peça deste plano constrói query de agregado nem tem método por entidade.
- **`PersistenceLawsTest`** varre `app/` inteiro e reprova basename terminado em `Repository`. A única isenção existente é `/QueryBuilders/`; este plano **não pede exceção nova**.
- **Lei §5.3 / ADR-04** — nenhum DTO muda; `generated.ts` fecha com diff **vazio**.
- **Lei §5.2 / ADR-08** — auditoria só na aplicação. `ArchiveTrailQuery` é lido, nunca reescrito.
- **Backend roda no container:** `docker compose exec -T app php artisan test`. O host WSL não tem mbstring.
- **Pint roda no host, de dentro de `backend/`, sempre com argumento:** `./vendor/bin/pint <arquivos>` — nunca sem, que reformata o repositório inteiro.
- **Catraca só vale depois de ser vista reprovar** (lição 10). A prova é por **cópia no scratchpad e restauração** — `cp` para `/tmp/claude-1000/-home-jvbat-projetos-lotus/f6ebda23-c0da-4554-a2dc-437bb3793953/scratchpad/`, nunca `git stash`: a pilha desta máquina tem stashes alheios.
- **Ordem obrigatória:** as peças (Tasks 1–3) nascem antes de qualquer migração; as catracas (Task 7) ligam depois do último sítio migrado. Catraca que nasce vermelha por dívida ainda não paga trava o próprio bloco.
- **Árvore:** main tree, branch `refactor/backend-projecao-de-arquivados`, a partir de `main@14b25b6c`.

---

## Estrutura de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `backend/app/Shared/Audit/ArchivedListing.php` | **Criar.** Projeção da listagem de arquivados (`lista`) e resolução do registro arquivado (`resolveArquivado`). Colaborador único: `ArchiveTrailQuery`. |
| `backend/app/Shared/Http/RespostaDeRecurso.php` | **Criar.** `ok(Data): JsonResponse` — desfaz o 201 que `ResponsableData::calculateResponseStatus` força em POST. |
| `backend/tests/Feature/Shared/ArchivedListingTest.php` | **Criar.** Comportamento das duas entradas do module, com banco e **sem round-trip HTTP**. |
| `backend/tests/Feature/Shared/RespostaDeRecursoTest.php` | **Criar.** O status carimbado, sem passar por rota. |
| `backend/tests/Unit/Shared/ProjecaoDeArquivadosTest.php` | **Criar.** As duas catracas estáticas. |
| 8 controllers de `app/Domains/*/Http/Controllers/` | **Modificar.** `archived()` e `restore()` passam a consumir o module. |
| `CertificateController.php`, `TurmaDocumentController.php` | **Modificar.** Só o carimbo do 200 (nenhum é de arquivamento). |

---

### Task 1: `ArchivedListing::lista()`

**Files:**
- Create: `backend/app/Shared/Audit/ArchivedListing.php`
- Test: `backend/tests/Feature/Shared/ArchivedListingTest.php`

**Interfaces:**
- Consumes: `App\Shared\Audit\ArchiveTrailQuery::archivedBy(string $auditableType, array $ids): array<int, string|null>` (já existe).
- Produces: `ArchivedListing::lista(Collection $registros, string $model, Closure $montar): array` — `$montar` recebe `(Model $registro, string $archivedAt, ?string $archivedBy)` e devolve o DTO do agregado. A saída é reindexada (`values()`).

- [ ] **Step 1: Write the failing test**

Criar `backend/tests/Feature/Shared/ArchivedListingTest.php`:

```php
<?php

namespace Tests\Feature\Shared;

use App\Domains\Commercial\Models\Client;
use App\Shared\Audit\ArchivedListing;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\CreatesDomainRecords;
use Tests\TestCase;

class ArchivedListingTest extends TestCase
{
    use CreatesDomainRecords;
    use RefreshDatabase;

    public function test_monta_cada_registro_com_a_data_iso_e_o_autor(): void
    {
        $autor = $this->actingAsAdmin();
        $autor->update(['name' => 'Ana Torres']);

        $client = $this->makeClientWithUser();
        $client->delete();

        $arquivados = Client::onlyTrashed()->get();

        $saida = ArchivedListing::lista(
            $arquivados,
            Client::class,
            fn (Client $c, string $em, ?string $por) => [
                'id' => $c->id, 'archived_at' => $em, 'archived_by' => $por,
            ],
        );

        $this->assertCount(1, $saida);
        $this->assertSame($client->id, $saida[0]['id']);
        $this->assertSame('Ana Torres', $saida[0]['archived_by']);
        $this->assertSame(
            $client->fresh()->deleted_at->toIso8601String(),
            $saida[0]['archived_at'],
        );
    }

    public function test_autor_ausente_vira_null_sem_estourar(): void
    {
        // Arquivado sem sessão (seeder, console): não há audit com usuário.
        $client = $this->makeClientWithUser();
        $client->delete();

        $saida = ArchivedListing::lista(
            Client::onlyTrashed()->get(),
            Client::class,
            fn (Client $c, string $em, ?string $por) => $por,
        );

        $this->assertSame([null], $saida);
    }

    public function test_colecao_vazia_devolve_array_vazio(): void
    {
        $saida = ArchivedListing::lista(
            Client::onlyTrashed()->get(),
            Client::class,
            fn (Client $c, string $em, ?string $por) => $c->id,
        );

        $this->assertSame([], $saida);
    }

    public function test_a_saida_e_reindexada_do_zero(): void
    {
        $this->actingAsAdmin();

        $a = $this->makeClientWithUser(['legal_name' => 'A']);
        $b = $this->makeClientWithUser(['legal_name' => 'B']);
        $a->delete();
        $b->delete();

        // `keyBy` produz chaves não sequenciais; a saída tem de ser uma list.
        $arquivados = Client::onlyTrashed()->get()->keyBy('id');

        $saida = ArchivedListing::lista(
            $arquivados,
            Client::class,
            fn (Client $c, string $em, ?string $por) => $c->id,
        );

        $this->assertSame([0, 1], array_keys($saida));
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
docker compose exec -T app php artisan test --filter=ArchivedListingTest
```

Esperado: FAIL com `Class "App\Shared\Audit\ArchivedListing" not found`.

- [ ] **Step 3: Write minimal implementation**

Criar `backend/app/Shared/Audit/ArchivedListing.php`:

```php
<?php

namespace App\Shared\Audit;

use Closure;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;

/**
 * A projeção da visão de Arquivados, uma vez em vez de oito.
 *
 * Oito controllers repetiam a MESMA sequência — `pluck('id')`,
 * `ArchiveTrailQuery::archivedBy`, `map`, `deleted_at->toIso8601String()`,
 * `$autores[$id] ?? null` — e só o DTO de saída variava.
 *
 * NÃO é Repository (lei §5.1, ADR-02): não constrói query, não conhece
 * agregado e não tem método por entidade. Recebe o resultado que o Eloquent já
 * materializou e o projeta. A query de cada agregado continua no controller,
 * porque elas divergem de verdade — `Turma` pagina e filtra por `visibleTo`,
 * `User` não tem builder, `Enrollment` ordena por nome do aluno.
 */
class ArchivedListing
{
    /**
     * Projeta a listagem de arquivados de um agregado.
     *
     * @param  Collection<int, Model>  $registros  já materializados pela query do agregado
     * @param  class-string<Model>  $model  tipo passado ao `ArchiveTrailQuery`
     * @param  Closure(Model, string, ?string): mixed  $montar  (registro, archived_at, archived_by)
     * @return list<mixed>
     */
    public static function lista(Collection $registros, string $model, Closure $montar): array
    {
        $autores = ArchiveTrailQuery::archivedBy($model, $registros->pluck('id')->all());

        return $registros
            ->map(fn (Model $registro) => $montar(
                $registro,
                $registro->deleted_at->toIso8601String(),
                $autores[$registro->id] ?? null,
            ))
            ->values()
            ->all();
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
docker compose exec -T app php artisan test --filter=ArchivedListingTest
```

Esperado: PASS, 4 testes.

- [ ] **Step 5: Commit**

```bash
cd backend && ./vendor/bin/pint app/Shared/Audit/ArchivedListing.php tests/Feature/Shared/ArchivedListingTest.php && cd ..
git add backend/app/Shared/Audit/ArchivedListing.php backend/tests/Feature/Shared/ArchivedListingTest.php
git commit -m "feat(audit): ArchivedListing::lista projeta a visao de arquivados"
```

---

### Task 2: `ArchivedListing::resolveArquivado()`

**Files:**
- Modify: `backend/app/Shared/Audit/ArchivedListing.php`
- Test: `backend/tests/Feature/Shared/ArchivedListingTest.php`

**Interfaces:**
- Produces: `ArchivedListing::resolveArquivado(Builder|Relation $origem, int $id): Model` — devolve o arquivado; lança `ModelNotFoundException` (404 na camada HTTP) sobre registro **ativo** e sobre inexistente. O tipo aceita `Relation` por causa do caso aninhado (`$turma->enrollments()`), que é o que preserva a posse declarada.

- [ ] **Step 1: Write the failing test**

Acrescentar a `backend/tests/Feature/Shared/ArchivedListingTest.php` o import e os quatro testes:

```php
use App\Domains\Operation\Models\Turma;
use Illuminate\Database\Eloquent\ModelNotFoundException;
```

```php
    public function test_resolve_encontra_o_arquivado_pela_classe(): void
    {
        $client = $this->makeClientWithUser();
        $client->delete();

        $achado = ArchivedListing::resolveArquivado(Client::query(), $client->id);

        $this->assertTrue($achado->is($client));
        $this->assertNotNull($achado->deleted_at);
    }

    public function test_resolve_da_404_sobre_registro_ativo(): void
    {
        // O ponto do `onlyTrashed()`: o binding padrão do Laravel acharia este
        // registro e a Action restauraria o que nunca foi arquivado.
        $client = $this->makeClientWithUser();

        $this->expectException(ModelNotFoundException::class);

        ArchivedListing::resolveArquivado(Client::query(), $client->id);
    }

    public function test_resolve_da_404_sobre_id_inexistente(): void
    {
        $this->expectException(ModelNotFoundException::class);

        ArchivedListing::resolveArquivado(Client::query(), 999999);
    }

    public function test_resolve_por_relacao_mantem_a_posse_do_pai(): void
    {
        $this->actingAsAdmin();

        $turma = $this->makeTurma();
        $outra = $this->makeTurma();

        $matricula = $this->makeEnrollment($turma);
        $matricula->delete();

        // A MESMA matrícula arquivada, pedida pela turma errada, não aparece.
        $this->expectException(ModelNotFoundException::class);

        ArchivedListing::resolveArquivado($outra->enrollments(), $matricula->id);
    }
```

> Se `CreatesDomainRecords` não expuser `makeTurma()`/`makeEnrollment()` com essas assinaturas, leia o trait em `backend/tests/Support/CreatesDomainRecords.php` e use os helpers que existem — o teste que importa é *matrícula arquivada da turma A não é resolvível pela turma B*.

- [ ] **Step 2: Run test to verify it fails**

```bash
docker compose exec -T app php artisan test --filter=ArchivedListingTest
```

Esperado: FAIL com `Call to undefined method App\Shared\Audit\ArchivedListing::resolveArquivado()`.

- [ ] **Step 3: Write minimal implementation**

Acrescentar a `ArchivedListing` os imports e o método:

```php
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\Relation;
```

```php
    /**
     * O registro ARQUIVADO, ou 404.
     *
     * Resolvido à mão, não por route binding: o binding padrão aplica o global
     * scope de `SoftDeletes` e nunca acharia um arquivado. `onlyTrashed()`
     * também dá o 404 de graça sobre registro ATIVO, que é o comportamento da
     * spec D5. Este docblock existia copiado VERBATIM em 7 dos 8 controllers.
     *
     * A origem entra pronta, e por isso o parâmetro aceita `Relation`: o caso
     * aninhado passa `$turma->enrollments()`, e resolver sobre a MESMA relação
     * é o que mantém a posse declarada — matrícula de outra turma segue 404.
     *
     * @param  Builder<covariant Model>|Relation<Model, Model, mixed>  $origem
     */
    public static function resolveArquivado(Builder|Relation $origem, int $id): Model
    {
        return $origem->onlyTrashed()->whereKey($id)->firstOrFail();
    }
```

- [ ] **Step 4: Run test to verify it passes**

```bash
docker compose exec -T app php artisan test --filter=ArchivedListingTest
```

Esperado: PASS, 8 testes.

- [ ] **Step 5: Commit**

```bash
cd backend && ./vendor/bin/pint app/Shared/Audit/ArchivedListing.php tests/Feature/Shared/ArchivedListingTest.php && cd ..
git add backend/app/Shared/Audit/ArchivedListing.php backend/tests/Feature/Shared/ArchivedListingTest.php
git commit -m "feat(audit): resolveArquivado absorve o firstOrFail e o comentario copiado 7x"
```

---

### Task 3: `RespostaDeRecurso::ok()`

**Files:**
- Create: `backend/app/Shared/Http/RespostaDeRecurso.php`
- Test: `backend/tests/Feature/Shared/RespostaDeRecursoTest.php`

**Interfaces:**
- Produces: `RespostaDeRecurso::ok(Data $projetado): JsonResponse` — status 200, corpo idêntico ao que `$projetado->toResponse(request())` produz.

- [ ] **Step 1: Write the failing test**

Criar `backend/tests/Feature/Shared/RespostaDeRecursoTest.php`:

```php
<?php

namespace Tests\Feature\Shared;

use App\Domains\Commercial\Data\ClientData;
use App\Shared\Http\RespostaDeRecurso;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\CreatesDomainRecords;
use Tests\TestCase;

class RespostaDeRecursoTest extends TestCase
{
    use CreatesDomainRecords;
    use RefreshDatabase;

    public function test_carimba_200_onde_o_data_forcaria_201(): void
    {
        $this->actingAsAdmin();
        $client = $this->makeClientWithUser();

        // `ResponsableData::calculateResponseStatus` devolve 201 em POST.
        $this->post('/api/__sonda-resposta', []);

        $resposta = RespostaDeRecurso::ok(ClientData::fromModel($client));

        $this->assertSame(200, $resposta->getStatusCode());
    }

    public function test_o_corpo_e_o_mesmo_do_to_response(): void
    {
        $this->actingAsAdmin();
        $client = $this->makeClientWithUser();

        $data = ClientData::fromModel($client);

        $this->assertSame(
            $data->toResponse(request())->getContent(),
            RespostaDeRecurso::ok($data)->getContent(),
        );
    }
}
```

> O primeiro teste **não depende** de a rota `/api/__sonda-resposta` existir — um 404 serve, porque o que ele afirma é o status da resposta que `RespostaDeRecurso::ok` devolve, não o da sonda. Se o ruído incomodar, remova a linha do `post()`: o valor do teste está no `assertSame(200, ...)`.

- [ ] **Step 2: Run test to verify it fails**

```bash
docker compose exec -T app php artisan test --filter=RespostaDeRecursoTest
```

Esperado: FAIL com `Class "App\Shared\Http\RespostaDeRecurso" not found`.

- [ ] **Step 3: Write minimal implementation**

Criar `backend/app/Shared/Http/RespostaDeRecurso.php`:

```php
<?php

namespace App\Shared\Http;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;
use Spatie\LaravelData\Data;

/**
 * O status HTTP de uma decisão sobre recurso que JÁ EXISTE.
 *
 * `Data::toResponse()` força 201 em qualquer POST
 * (`ResponsableData::calculateResponseStatus`). Correto para `store()`, que
 * cria; errado para restaurar, aprovar, rejeitar, importar, designar, concluir
 * e revogar — catorze sítios em dez controllers refaziam esta mesma linha, em
 * DUAS grafias (`Response::HTTP_OK` e `200` literal).
 *
 * Mora em `Shared/Http` e não em `Shared/Audit` de propósito: não tem nada a
 * ver com auditoria, e metade dos sítios não é arquivamento.
 */
class RespostaDeRecurso
{
    public static function ok(Data $projetado): JsonResponse
    {
        return $projetado->toResponse(request())->setStatusCode(Response::HTTP_OK);
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
docker compose exec -T app php artisan test --filter=RespostaDeRecursoTest
```

Esperado: PASS, 2 testes.

- [ ] **Step 5: Commit**

```bash
cd backend && ./vendor/bin/pint app/Shared/Http/RespostaDeRecurso.php tests/Feature/Shared/RespostaDeRecursoTest.php && cd ..
git add backend/app/Shared/Http/RespostaDeRecurso.php backend/tests/Feature/Shared/RespostaDeRecursoTest.php
git commit -m "feat(http): RespostaDeRecurso::ok centraliza o 200 contra o 201 do Data"
```

---

### Task 4: os oito `archived()` consomem `lista()`

**Files:**
- Modify: `backend/app/Domains/Catalog/Http/Controllers/CourseController.php`
- Modify: `backend/app/Domains/Commercial/Http/Controllers/ClientController.php`
- Modify: `backend/app/Domains/Commercial/Http/Controllers/BudgetController.php`
- Modify: `backend/app/Domains/Commercial/Http/Controllers/QuoteController.php`
- Modify: `backend/app/Domains/Identity/Http/Controllers/RedatorController.php`
- Modify: `backend/app/Domains/Identity/Http/Controllers/UserController.php`
- Modify: `backend/app/Domains/Operation/Http/Controllers/TurmaController.php`
- Modify: `backend/app/Domains/Operation/Http/Controllers/EnrollmentController.php`

**Interfaces:**
- Consumes: `ArchivedListing::lista()` (Task 1).

**Não há teste novo nesta task.** A prova é que os **70 testes de endpoint existentes passam sem edição** — são caixa-preta sobre JSON, e é isso que demonstra que o contrato não mudou.

- [ ] **Step 1: Confirmar o verde de partida**

```bash
docker compose exec -T app php artisan test --filter='ArchiveEndpointTest'
```

Esperado: PASS, **70 testes**. Se este número não bater, PARE — a base de medição do plano mudou.

- [ ] **Step 2: `CourseController::archived()`**

Trocar o corpo por:

```php
    /** @return array<ArchivedCourseData> */
    public function archived(): array
    {
        return ArchivedListing::lista(
            Course::onlyTrashed()->withArchivedListingData()->get(),
            Course::class,
            fn (Course $c, string $em, ?string $por) => new ArchivedCourseData(
                course: CourseData::fromModel($c),
                archived_at: $em,
                archived_by: $por,
            ),
        );
    }
```

Trocar o import `use App\Shared\Audit\ArchiveTrailQuery;` por `use App\Shared\Audit\ArchivedListing;`.

- [ ] **Step 3: `ClientController::archived()`**

```php
    /** @return array<ArchivedClientData> */
    public function archived(): array
    {
        return ArchivedListing::lista(
            Client::onlyTrashed()->withArchivedListingData()->get(),
            Client::class,
            fn (Client $c, string $em, ?string $por) => new ArchivedClientData(
                client: ClientData::fromModel($c),
                archived_at: $em,
                archived_by: $por,
            ),
        );
    }
```

Mesma troca de import.

- [ ] **Step 4: `BudgetController::archived()`**

O `BudgetSummaryService` continua injetado e entra no `fromModel`:

```php
    /** @return array<ArchivedBudgetData> */
    public function archived(BudgetSummaryService $summary): array
    {
        return ArchivedListing::lista(
            Budget::onlyTrashed()->withArchivedListingData()->get(),
            Budget::class,
            fn (Budget $b, string $em, ?string $por) => new ArchivedBudgetData(
                budget: BudgetData::fromModel($b, $summary),
                archived_at: $em,
                archived_by: $por,
            ),
        );
    }
```

Mesma troca de import.

- [ ] **Step 5: `QuoteController::archived()`**

A query continua escopada pelo pai:

```php
    /** @return array<ArchivedQuoteData> */
    public function archived(Budget $budget): array
    {
        return ArchivedListing::lista(
            $budget->quotes()->onlyTrashed()->withArchivedListingData()->get(),
            Quote::class,
            fn (Quote $q, string $em, ?string $por) => new ArchivedQuoteData(
                quote: QuoteData::fromModel($q),
                archived_at: $em,
                archived_by: $por,
            ),
        );
    }
```

Mesma troca de import.

- [ ] **Step 6: `RedatorController::archived()`**

```php
    /** @return array<ArchivedRedatorData> */
    public function archived(): array
    {
        return ArchivedListing::lista(
            Redator::onlyTrashed()->withArchivedListingData()->get(),
            Redator::class,
            fn (Redator $r, string $em, ?string $por) => new ArchivedRedatorData(
                redator: RedatorData::fromModel($r),
                archived_at: $em,
                archived_by: $por,
            ),
        );
    }
```

Mesma troca de import.

- [ ] **Step 7: `UserController::archived()`**

**O comentário do filtro `type` FICA** — é vocabulário de Identity e explica a spec D10:

```php
    /** @return array<ArchivedUserData> */
    public function archived(): array
    {
        // `type === 'admin'` espelha o `abort_unless` de show/update/destroy: a
        // rota de staff só lida com admin. Sem o filtro, os users de CLIENTE,
        // REDATOR e ALUNO arquivados pelas cascatas de `Client`, `Redator` e
        // `Student` vazariam nesta lista (spec D10).
        $users = User::onlyTrashed()
            ->where('type', 'admin')
            ->with(['roles', 'latestLogin'])
            ->orderBy('name')
            ->get();

        return ArchivedListing::lista(
            $users,
            User::class,
            fn (User $u, string $em, ?string $por) => new ArchivedUserData(
                user: UserData::fromModel($u),
                archived_at: $em,
                archived_by: $por,
            ),
        );
    }
```

Mesma troca de import.

- [ ] **Step 8: `TurmaController::archived()`**

O único que devolve `PageData`. O `->values()` sai daqui — `lista()` já reindexa:

```php
    public function archived(TurmaPageRequest $page, Request $request, TurmaHabilitacaoService $habilitacao): PageData
    {
        [$turmas, $meta] = Turma::onlyTrashed()
            ->visibleTo($request->user())
            ->withArchivedListingData()
            ->slice($page, filter: fn (TurmaQueryBuilder $q) => $q->whereDisplayStatus($page->status, asOfArchiving: true));

        return new PageData(
            data: ArchivedListing::lista(
                $turmas,
                Turma::class,
                fn (Turma $t, string $em, ?string $por) => new ArchivedTurmaData(
                    turma: TurmaData::fromModel($t, $habilitacao),
                    archived_at: $em,
                    archived_by: $por,
                ),
            ),
            meta: $meta,
        );
    }
```

O docblock da linha 103, que **menciona** `ArchiveTrailQuery::archivedBy` em prosa, precisa ser reescrito para não citar o método — a catraca da Task 7 remove comentários antes de varrer, mas um comentário que descreve mecânica que saiu do arquivo é doc que envelheceu (lição 13). Reescreva-o para explicar por que a coleção é materializada antes da projeção, sem nomear o método.

Mesma troca de import.

- [ ] **Step 9: `EnrollmentController::archived()`**

O comentário do `withListingData()` **fica** — explica a decisão P4, que não é deste bloco:

```php
    /** @return array<ArchivedEnrollmentData> */
    public function archived(Turma $turma): array
    {
        // `withListingData()` sem `asOfArchiving`: matrícula é FOLHA — não tem
        // filho que a cascata leve junto, então a projeção ativa já mostra a
        // linha como ela estava (P4). O `student` é `withTrashed()` no model.
        $enrollments = $turma->enrollments()->onlyTrashed()
            ->withListingData()
            ->orderByStudentName()
            ->get();

        return ArchivedListing::lista(
            $enrollments,
            Enrollment::class,
            fn (Enrollment $e, string $em, ?string $por) => new ArchivedEnrollmentData(
                enrollment: EnrollmentData::fromModel($e),
                archived_at: $em,
                archived_by: $por,
            ),
        );
    }
```

Mesma troca de import.

- [ ] **Step 10: Verificar que os 70 passam sem edição**

```bash
git diff --stat -- backend/tests/
```

Esperado: **vazio**. Se algum teste precisou mudar, o contrato mudou — PARE e reporte.

```bash
docker compose exec -T app php artisan test --filter='ArchiveEndpointTest'
```

Esperado: PASS, **70 testes**.

- [ ] **Step 11: Verificar que o `archivedBy` sumiu dos oito**

```bash
cd backend && grep -rn "ArchiveTrailQuery" app/Domains/ ; cd ..
```

Esperado: **nenhuma linha de código**. Se sobrar, é comentário — trate como no Step 8.

- [ ] **Step 12: Commit**

```bash
cd backend && ./vendor/bin/pint app/Domains/Catalog/Http/Controllers/CourseController.php app/Domains/Commercial/Http/Controllers/ClientController.php app/Domains/Commercial/Http/Controllers/BudgetController.php app/Domains/Commercial/Http/Controllers/QuoteController.php app/Domains/Identity/Http/Controllers/RedatorController.php app/Domains/Identity/Http/Controllers/UserController.php app/Domains/Operation/Http/Controllers/TurmaController.php app/Domains/Operation/Http/Controllers/EnrollmentController.php && cd ..
git add backend/app/Domains/
git commit -m "refactor(arquivados): os 8 archived() consomem ArchivedListing::lista"
```

---

### Task 5: os oito `restore()` consomem `resolveArquivado()` e `RespostaDeRecurso::ok()`

**Files:** os mesmos oito controllers da Task 4.

**Interfaces:**
- Consumes: `ArchivedListing::resolveArquivado()` (Task 2), `RespostaDeRecurso::ok()` (Task 3).

**Não há teste novo.** A prova continua sendo os 70 testes de endpoint intactos.

- [ ] **Step 1: `CourseController::restore()`**

```php
    public function restore(int $course, RestoreCourseAction $action): JsonResponse
    {
        $model = ArchivedListing::resolveArquivado(Course::query(), $course);

        return RespostaDeRecurso::ok(CourseData::fromModel($action->execute($model)));
    }
```

Acrescentar `use App\Shared\Http\RespostaDeRecurso;`.

- [ ] **Step 2: `ClientController::restore()`**

O comentário verbatim sai — ele agora mora no docblock de `resolveArquivado()`:

```php
    public function restore(int $client, RestoreClientAction $action): JsonResponse
    {
        $model = ArchivedListing::resolveArquivado(Client::query(), $client);

        return RespostaDeRecurso::ok(ClientData::fromModel($action->execute($model)));
    }
```

- [ ] **Step 3: `BudgetController::restore()`**

```php
    public function restore(int $budget, RestoreBudgetAction $action, BudgetSummaryService $summary): JsonResponse
    {
        $model = ArchivedListing::resolveArquivado(Budget::query(), $budget);

        return RespostaDeRecurso::ok(BudgetData::fromModel($action->execute($model), $summary));
    }
```

- [ ] **Step 4: `QuoteController::restore()`**

Atenção: o `restore` da cotação **não** é escopado pelo orçamento hoje (só o `archived()` é). Mantenha assim — mudar isso é alteração de contrato, fora deste bloco:

```php
    public function restore(int $quote, RestoreQuoteAction $action): JsonResponse
    {
        $model = ArchivedListing::resolveArquivado(Quote::query(), $quote);

        return RespostaDeRecurso::ok(QuoteData::fromModel($action->execute($model)));
    }
```

- [ ] **Step 5: `RedatorController::restore()`**

```php
    public function restore(int $redator, RestoreRedatorAction $action): JsonResponse
    {
        $model = ArchivedListing::resolveArquivado(Redator::query(), $redator);

        return RespostaDeRecurso::ok(RedatorData::fromModel($action->execute($model)));
    }
```

- [ ] **Step 6: `UserController::restore()`**

O `abort_unless` **fica**, e **depois** do resolve — é vocabulário de Identity:

```php
    public function restore(int $user, RestoreStaffUserAction $action): JsonResponse
    {
        $model = ArchivedListing::resolveArquivado(User::query(), $user);

        // O mesmo `abort_unless` de show/update/destroy: user de cliente/redator/
        // aluno arquivado por cascata não é restaurável por esta rota.
        abort_unless($model->type === 'admin', 404);

        return RespostaDeRecurso::ok(UserData::fromModel($action->execute($model)));
    }
```

- [ ] **Step 7: `TurmaController::restore()`**

O `present()` privado continua sendo quem projeta:

```php
    public function restore(int $turma, RestoreTurmaAction $action, TurmaHabilitacaoService $habilitacao): JsonResponse
    {
        $model = ArchivedListing::resolveArquivado(Turma::query(), $turma);

        return RespostaDeRecurso::ok($this->present($action->execute($model), $habilitacao));
    }
```

- [ ] **Step 8: `EnrollmentController::restore()`**

O único que resolve por **relação**. O comentário sobre a posse **fica**, porque explica a escolha da origem, que é decisão deste sítio:

```php
    public function restore(Turma $turma, int $enrollment, RestoreEnrollmentAction $action): JsonResponse
    {
        // A origem é a relação, não a classe: resolver sobre `$turma->enrollments()`
        // mantém a posse declarada — matrícula de outra turma continua 404.
        $model = ArchivedListing::resolveArquivado($turma->enrollments(), $enrollment);

        return RespostaDeRecurso::ok(EnrollmentData::fromModel($action->execute($model)));
    }
```

- [ ] **Step 9: Rodar os 70 e conferir que os testes não mudaram**

```bash
git diff --stat -- backend/tests/
docker compose exec -T app php artisan test --filter='ArchiveEndpointTest'
```

Esperado: diff **vazio** e PASS com **70 testes**.

- [ ] **Step 10: Limpar imports órfãos**

Para cada um dos oito controllers, conferir se `Response` e `ArchiveTrailQuery` ainda são usados:

```bash
cd backend && for f in app/Domains/*/Http/Controllers/{Course,Client,Budget,Quote,Redator,User,Turma,Enrollment}Controller.php; do
  [ -f "$f" ] || continue
  grep -q 'Response::' "$f" || grep -n 'use Illuminate\\Http\\Response;' "$f" | sed "s|^|ORFAO $f:|"
done; cd ..
```

Remover só os imports que a saída apontar. **Não** remova `Response` de arquivo que ainda o use como tipo de retorno (`QuoteController::destroy` devolve `Response`).

- [ ] **Step 11: Commit**

```bash
cd backend && ./vendor/bin/pint app/Domains/Catalog/Http/Controllers/CourseController.php app/Domains/Commercial/Http/Controllers/ClientController.php app/Domains/Commercial/Http/Controllers/BudgetController.php app/Domains/Commercial/Http/Controllers/QuoteController.php app/Domains/Identity/Http/Controllers/RedatorController.php app/Domains/Identity/Http/Controllers/UserController.php app/Domains/Operation/Http/Controllers/TurmaController.php app/Domains/Operation/Http/Controllers/EnrollmentController.php && cd ..
git add backend/app/Domains/
git commit -m "refactor(arquivados): os 8 restore() resolvem pelo module e carimbam o 200 num lugar so"
```

---

### Task 6: os seis sítios de 200 que não são `restore()`

**Files:**
- Modify: `backend/app/Domains/Commercial/Http/Controllers/QuoteController.php` (`approve`, `reject`)
- Modify: `backend/app/Domains/Operation/Http/Controllers/EnrollmentController.php` (`import`)
- Modify: `backend/app/Domains/Operation/Http/Controllers/TurmaController.php` (`designateRedator`, `conclude`)
- Modify: `backend/app/Domains/Certification/Http/Controllers/CertificateController.php` (`revoke`)

**Interfaces:**
- Consumes: `RespostaDeRecurso::ok()` (Task 3).

**Não há teste novo.** A prova são as suítes de endpoint que já cobrem os seis métodos.

- [ ] **Step 1: Confirmar o verde de partida dos seis**

```bash
docker compose exec -T app php artisan test --filter='QuoteApprovalTest|RevokeCertificateTest|TurmaArchiveEndpointTest|EnrollmentArchiveEndpointTest'
```

Anote o total. Se algum destes arquivos não cobrir `import`, `designateRedator` ou `conclude`, localize a suíte que cobre com:

```bash
cd backend && grep -rln "designateRedator\|/conclude\|alunos/import\|redactores" tests/Feature/ ; cd ..
```

- [ ] **Step 2: `QuoteController::approve` e `::reject`**

O comentário de três linhas que explicava o 201 sai — ele agora mora no docblock de `RespostaDeRecurso`:

```php
    public function approve(Quote $quote, ApproveQuoteAction $action): JsonResponse
    {
        return RespostaDeRecurso::ok(
            QuoteData::fromModel($action->execute($quote)->loadListingData()),
        );
    }

    public function reject(Quote $quote, RejectQuoteAction $action): JsonResponse
    {
        return RespostaDeRecurso::ok(
            QuoteData::fromModel($action->execute($quote)->loadListingData()),
        );
    }
```

- [ ] **Step 3: `EnrollmentController::import`, `TurmaController::designateRedator` e `::conclude`, `CertificateController::revoke`**

Nos quatro, trocar o par de linhas

```php
            ->toResponse(request())
            ->setStatusCode(200);
```

pela chamada equivalente — o argumento é a mesma expressão `Data` que já estava sendo montada. Exemplo, em `TurmaController::conclude`:

```php
    public function conclude(Turma $turma, ConcludeTurmaAction $action, TurmaHabilitacaoService $habilitacao): JsonResponse
    {
        return RespostaDeRecurso::ok($this->present($action->execute($turma), $habilitacao));
    }
```

Acrescentar `use App\Shared\Http\RespostaDeRecurso;` em `CertificateController.php` (os outros três já o terão da Task 5).

- [ ] **Step 4: Conferir que sobrou zero carimbo de 200 fora do module**

```bash
cd backend && grep -rn "setStatusCode(Response::HTTP_OK)\|setStatusCode(200)" app/ ; cd ..
```

Esperado: **nenhuma linha**. Os três `setStatusCode(201)` continuam — são a direção oposta e não são deste bloco.

- [ ] **Step 5: Rodar a suíte inteira**

```bash
docker compose exec -T app php artisan test
```

Esperado: verde. A `main` mede **1149 passed / 5 skipped**; este bloco acrescenta os testes das Tasks 1–3.

- [ ] **Step 6: Commit**

```bash
cd backend && ./vendor/bin/pint app/Domains/Commercial/Http/Controllers/QuoteController.php app/Domains/Operation/Http/Controllers/EnrollmentController.php app/Domains/Operation/Http/Controllers/TurmaController.php app/Domains/Certification/Http/Controllers/CertificateController.php && cd ..
git add backend/app/Domains/
git commit -m "refactor(http): approve, reject, import, designate, conclude e revoke usam RespostaDeRecurso"
```

---

### Task 7: as duas catracas

**Files:**
- Create: `backend/tests/Unit/Shared/ProjecaoDeArquivadosTest.php`

**Interfaces:**
- Consumes: nada em runtime — é varredura de fonte, no molde do `MensagemLiteralTest`.

- [ ] **Step 1: Escrever as duas catracas**

Criar `backend/tests/Unit/Shared/ProjecaoDeArquivadosTest.php`:

```php
<?php

namespace Tests\Unit\Shared;

use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

/**
 * As duas portas por onde a projeção de arquivados voltaria a existir oito
 * vezes. Régua estática de propósito: o teste comportamental prova o que
 * EXISTE, esta prova o que NÃO PODE existir.
 *
 * `App\Shared\*` não é varrido pelo `DomainDependencyTest`, cuja matriz só
 * enxerga `app/Domains/` — então esta é a única régua estrutural do module.
 */
class ProjecaoDeArquivadosTest extends TestCase
{
    /** @return list<string> */
    private function arquivosPhp(string $diretorio): array
    {
        $saida = [];
        $it = new \RecursiveIteratorIterator(new \RecursiveDirectoryIterator(base_path($diretorio)));
        foreach ($it as $arquivo) {
            if ($arquivo->isFile() && $arquivo->getExtension() === 'php') {
                $saida[] = $arquivo->getPathname();
            }
        }

        return $saida;
    }

    /**
     * Só as linhas de código: docblock e comentário podem citar o método.
     * Sem isto a régua nasceria vermelha por dois docblocks que apenas o
     * MENCIONAM (`Shared/Pagination/Paginates.php` e o `TurmaController`).
     */
    private function codigoSemComentario(string $caminho): string
    {
        return preg_replace('#/\*.*?\*/|//[^\n]*#s', '', file_get_contents($caminho));
    }

    #[Test]
    public function o_archive_trail_query_so_e_chamado_de_dentro_do_module(): void
    {
        $ofensores = [];

        foreach ($this->arquivosPhp('app') as $caminho) {
            if (str_contains($caminho, '/app/Shared/Audit/')) {
                continue;
            }

            if (str_contains($this->codigoSemComentario($caminho), 'ArchiveTrailQuery::archivedBy')) {
                $ofensores[] = str_replace(base_path().'/', '', $caminho);
            }
        }

        $this->assertSame([], $ofensores, implode("\n", array_merge(
            [
                'A montagem da listagem de arquivados mora em App\Shared\Audit\ArchivedListing::lista().',
                'Chamar `ArchiveTrailQuery::archivedBy` fora do module é reconstruir as seis linhas',
                'que existiam oito vezes. Arquivos encontrados:',
            ],
            $ofensores,
        )));
    }

    /**
     * As DUAS grafias. Régua que pega uma e não a outra é a porta por onde a
     * dívida volta — foi a lição que as catracas `GRAFIA_LITERAL` e
     * `RAIO_LITERAL` do frontend compraram. A lista de exceções é VAZIA: os
     * catorze sítios migraram, e sítio novo nasce vermelho e escolhe.
     */
    #[Test]
    public function o_200_contra_o_201_mora_num_lugar_so(): void
    {
        $ofensores = [];

        foreach ($this->arquivosPhp('app') as $caminho) {
            if (str_contains($caminho, '/app/Shared/Http/')) {
                continue;
            }

            if (preg_match('/setStatusCode\(\s*(?:Response::HTTP_OK|200)\s*\)/', $this->codigoSemComentario($caminho))) {
                $ofensores[] = str_replace(base_path().'/', '', $caminho);
            }
        }

        $this->assertSame([], $ofensores, implode("\n", array_merge(
            [
                'O 200 contra o 201 que o `ResponsableData` força em POST mora em',
                'App\Shared\Http\RespostaDeRecurso::ok(). Arquivos encontrados:',
            ],
            $ofensores,
        )));
    }
}
```

- [ ] **Step 2: Ver as duas passarem contra o código atual**

```bash
docker compose exec -T app php artisan test --filter=ProjecaoDeArquivadosTest
```

Esperado: PASS, 2 testes. Verde aqui é necessário, **não suficiente** — o Step 3 é que prova que a régua morde.

- [ ] **Step 3: Ver as duas REPROVAR por sonda negativa**

Guardar os originais **fora do Git** e reintroduzir cada defeito:

```bash
SCRATCH=/tmp/claude-1000/-home-jvbat-projetos-lotus/f6ebda23-c0da-4554-a2dc-437bb3793953/scratchpad
cp backend/app/Domains/Catalog/Http/Controllers/CourseController.php "$SCRATCH/CourseController.php.orig"
cp backend/app/Domains/Commercial/Http/Controllers/QuoteController.php "$SCRATCH/QuoteController.php.orig"
```

Sonda 1 — reintroduzir a chamada ao `archivedBy` em `CourseController::archived()`, acrescentando dentro do método a linha:

```php
        $autores = \App\Shared\Audit\ArchiveTrailQuery::archivedBy(Course::class, []);
```

```bash
docker compose exec -T app php artisan test --filter=o_archive_trail_query_so_e_chamado_de_dentro_do_module
```

Esperado: **FAIL**, nomeando `app/Domains/Catalog/Http/Controllers/CourseController.php`.

Sonda 2 — reintroduzir o carimbo em `QuoteController::approve`, trocando a chamada por:

```php
        return QuoteData::fromModel($action->execute($quote)->loadListingData())
            ->toResponse(request())
            ->setStatusCode(Response::HTTP_OK);
```

```bash
docker compose exec -T app php artisan test --filter=o_200_contra_o_201_mora_num_lugar_so
```

Esperado: **FAIL**, nomeando `app/Domains/Commercial/Http/Controllers/QuoteController.php`.

Sonda 3 — a **outra grafia**, no mesmo sítio: trocar `Response::HTTP_OK` por `200`.

```bash
docker compose exec -T app php artisan test --filter=o_200_contra_o_201_mora_num_lugar_so
```

Esperado: **FAIL** de novo. Uma régua que só pegasse a primeira grafia passaria aqui — é este passo que prova que ela pega as duas.

- [ ] **Step 4: Restaurar do scratchpad e confirmar o verde**

```bash
SCRATCH=/tmp/claude-1000/-home-jvbat-projetos-lotus/f6ebda23-c0da-4554-a2dc-437bb3793953/scratchpad
cp "$SCRATCH/CourseController.php.orig" backend/app/Domains/Catalog/Http/Controllers/CourseController.php
cp "$SCRATCH/QuoteController.php.orig" backend/app/Domains/Commercial/Http/Controllers/QuoteController.php
git diff --stat -- backend/app/Domains/
```

Esperado: diff **vazio** — os arquivos voltaram byte a byte.

```bash
docker compose exec -T app php artisan test --filter=ProjecaoDeArquivadosTest
```

Esperado: PASS, 2 testes.

- [ ] **Step 5: Commit**

```bash
cd backend && ./vendor/bin/pint tests/Unit/Shared/ProjecaoDeArquivadosTest.php && cd ..
git add backend/tests/Unit/Shared/ProjecaoDeArquivadosTest.php
git commit -m "test(arch): duas catracas fecham a montagem de arquivados e o carimbo do 200"
```

---

### Task 8: gate do bloco

**Files:** nenhum novo. É a prova de que o bloco fecha.

- [ ] **Step 1: Suíte inteira**

```bash
docker compose exec -T app php artisan test
```

Esperado: verde, com contagem **acima** de 1149 passed (os testes das Tasks 1–3 e 7 entram).

- [ ] **Step 2: `ListQueryBudgetTest` e `ParentLockOnChildWriteTest` sem diff**

```bash
git diff --stat main...HEAD -- backend/tests/Feature/Shared/ListQueryBudgetTest.php backend/tests/Feature/Shared/ParentLockOnChildWriteTest.php
```

Esperado: **vazio**. Se algum precisou mudar, o desenho saiu do lugar — PARE e reporte.

- [ ] **Step 3: Contrato TS intacto**

```bash
docker compose exec -T app php artisan typescript:transform
git diff --stat -- frontend/src/shared/types/generated.ts
```

Esperado: diff **vazio**.

- [ ] **Step 4: Os 70 continuam intactos**

```bash
git diff --stat main...HEAD -- backend/tests/Feature/Cadastros/ClientArchiveEndpointTest.php backend/tests/Feature/Cadastros/CourseArchiveEndpointTest.php backend/tests/Feature/Comercial/BudgetArchiveEndpointTest.php backend/tests/Feature/Comercial/QuoteArchiveEndpointTest.php backend/tests/Feature/Identity/RedatorArchiveEndpointTest.php backend/tests/Feature/Identity/StaffUserArchiveEndpointTest.php backend/tests/Feature/Operation/EnrollmentArchiveEndpointTest.php backend/tests/Feature/Operation/TurmaArchiveEndpointTest.php
```

Esperado: **vazio**.

- [ ] **Step 5: Greps de fechamento**

```bash
cd backend
grep -rn "ArchiveTrailQuery::archivedBy" app/ | grep -v "app/Shared/Audit/"
grep -rn "setStatusCode(Response::HTTP_OK)\|setStatusCode(200)" app/ | grep -v "app/Shared/Http/"
grep -rln "Repository.php" app/ | grep -v QueryBuilders
cd ..
```

Esperado: as três saídas **vazias**.

- [ ] **Step 6: Pint nos arquivos do bloco**

```bash
cd backend && ./vendor/bin/pint --test $(git diff --name-only main...HEAD -- '*.php' | sed 's|^backend/||') ; cd ..
```

Esperado: `PASS`.

- [ ] **Step 7: Frontend não foi tocado**

```bash
git diff --stat main...HEAD -- frontend/
```

Esperado: **vazio** (o bump da P-73 mora na PR #93, não neste bloco).

- [ ] **Step 8: Commit do fechamento do gate**

Se algum passo acima obrigou correção, commite-a. Se nada mudou, não há commit nesta task — o gate é medição, não entrega.

---

## Self-review

- **Cobertura da spec:** §4.1 → Tasks 1–2 · §4.2 → Task 3 · §4.4 → Tasks 4–6 · §5 → Task 7 · §7.1 → Task 4 Step 10 e Task 8 Step 4 · §7.2 → Task 6 · §7.3 → Tasks 1–2 · §7.4 → Task 7 Step 3 · §7.5 → Task 8 Step 2 · §7.6 → Task 8 Step 3 · §7.7 → Task 8 Steps 1 e 6 · §7.8 → Task 8 Step 5.
- **Consistência de tipos:** `lista(Collection, string, Closure): array` e `resolveArquivado(Builder|Relation, int): Model` aparecem com a mesma assinatura na Task 1, na Task 2 e em todos os call sites das Tasks 4–5. `RespostaDeRecurso::ok(Data): JsonResponse` idem nas Tasks 3, 5 e 6.
- **Risco declarado que o executor precisa vigiar:** passar para `resolveArquivado()` um builder que **já** filtrou `deleted_at IS NULL` faz o resolve nunca achar. Nenhum dos oito faz isso; é a armadilha da revisão (spec §8).

## Handoff de execução

**executor: `claude`**

Não é task mecânica. O bloco cria um module novo em `App\Shared\` sob a lei §5.1 (ADR-02, sem Repository sobre Eloquent), e o §4.3 da spec é um argumento de fronteira — `resolveArquivado()` é, por escrito, "a mais próxima da linha". Decidir se a implementação escrita ainda está do lado certo dessa fronteira é julgamento fora do plano, e a lei §5 do `CLAUDE.md` manda PARAR e confirmar com o João diante de dúvida. Some-se a isso que a Task 4 pede julgamento textual (quais comentários ficam, quais saem, e a reescrita do docblock do `TurmaController`) e que a Task 5 Step 10 depende de ler cada arquivo antes de remover import.

`paths_autorizados`: não se aplica.
