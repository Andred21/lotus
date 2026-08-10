# `turma-habilitacao-listagem` — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** matar o 2N+1 de `GET /api/turmas` — 15 queries para 4 turmas, 7 delas em `files` — dando
uma relação nomeada à documentação obrigatória, uma resposta única (`HabilitacaoStatus`) à pergunta
da RN-16, e terminando o seam de listagem que a Turma nunca teve.

**Architecture:** `Turma::documentacaoObrigatoria()` vira relação de verdade e entra no
`TurmaQueryBuilder::LISTING`, o que transforma N queries por linha em 1 para a listagem inteira.
`TurmaHabilitacaoService::for(Turma): HabilitacaoStatus` substitui os dois métodos públicos que a
projeção chamava separadamente. `Turma::loadListingData()` nasce no molde dos outros quatro models e
o `present()` do controller perde o `findOrFail`.

**Tech Stack:** Laravel 13 / PHP 8.3, Eloquent com custom Builder (não Repository — ADR-02),
spatie/laravel-data, PHPUnit sobre sqlite `:memory:`.

**Spec:** `docs/superpowers/specs/2026-08-10-turma-habilitacao-listagem-design.md`

## Global Constraints

- **Backend puro.** `git diff main...HEAD -- frontend/` tem de ficar **vazio** no fim.
- **Zero schema.** `git diff main...HEAD -- backend/database/` tem de ficar **vazio**; ADR e DER não
  abrem.
- **Zero mudança de contrato HTTP, em forma e em valor.** Nenhum DTO muda de forma →
  `typescript:transform` não produz diff em `generated.ts`. `habilitada` de turma **concluída**
  continua `false` (D-B1).
- **Baseline medida em `4ae4c91`:** backend **500 passed, 1 skipped (1858 assertions)**.
- Backend roda **no container**: `docker compose exec -T app php artisan test …`. Pint roda **no
  host, de dentro de `backend/`, sempre com argumentos** (lição 9).
- Branch `refactor/turma-habilitacao-listagem`, **main tree, sem worktree (P-03)**. Já criada a
  partir de `4ae4c91`; commits de seleção (`31576c7`) e spec (`cb4c626`) já estão nela.
- Toda guarda nova é **vista reprovar antes de valer** (lição 10). Onde o RED natural não existe, o
  mutante é aplicado, visto vermelho com a mensagem literal, e revertido no mesmo passo.

---

### Task 0: Baseline

**Files:** nenhum. Task de medição.

- [ ] **Step 1: Confirmar a suíte**

Run: `docker compose exec -T app php artisan test`
Expected: `Tests: 1 skipped, 500 passed (1858 assertions)`

- [ ] **Step 2: Confirmar que `generated.ts` está em dia**

```bash
docker compose exec -T app php artisan typescript:transform
git diff --stat -- frontend/src/shared/types/generated.ts
```
Expected: `git diff` **sem saída** (nenhuma linha). Se houver diff aqui, PARE: o baseline já está
sujo e o bloco não pode afirmar "sem diff" no fim.

- [ ] **Step 3: Confirmar a árvore limpa**

Run: `git status --porcelain`
Expected: sem saída.

Sem commit — a task não produz artefato.

---

### Task 1: `Turma::documentacaoObrigatoria()` e o fim da segunda cópia do `whereIn`

Hoje o `whereIn` dos três tipos obrigatórios está soletrado em **dois** lugares
(`TurmaHabilitacaoService::missingTypes()` e `TurmaDocumentController::index()`). A relação nomeada
dá dono único à pergunta **e** é o que permite a documentação entrar no eager-load — `with()` só
aceita nome de relação.

**Files:**
- Modify: `backend/app/Domains/Operation/Models/Turma.php`
- Modify: `backend/app/Domains/Operation/Http/Controllers/TurmaDocumentController.php:30-37`
- Test: `backend/tests/Feature/Operation/TurmaModelTest.php`

**Interfaces:**
- Produces: `Turma::documentacaoObrigatoria(): MorphMany` — `files()` restrita aos valores de
  `TurmaDocumentType`, soft-delete fora pelo default do `morphMany`. Consumida pelas Tasks 2 e 3.

- [ ] **Step 1: Escrever o teste que falha**

Em `backend/tests/Feature/Operation/TurmaModelTest.php`, acrescente o import
`use App\Domains\Operation\Enums\TurmaDocumentType;` e o método abaixo ao fim da classe:

```php
    public function test_documentacao_obrigatoria_filtra_tipo_fora_do_enum_e_doc_arquivada(): void
    {
        $quote = $this->makeApprovedQuote();
        $turma = Turma::create([
            'quote_id' => $quote->id, 'course_id' => $quote->course_id,
            'modalidade' => TurmaModalidade::Online, 'local_aplicacao' => null,
            'start_date' => '2026-08-01', 'end_date' => '2026-08-10',
        ]);

        foreach (TurmaDocumentType::cases() as $type) {
            $turma->files()->create([
                'type' => $type->value, 'path' => 'x.pdf', 'original_name' => 'x.pdf',
                'mime' => 'application/pdf', 'size' => 10,
            ]);
        }
        // Tipo livre na `files` polimórfica: NÃO é documentação obrigatória da turma.
        $turma->files()->create([
            'type' => 'OTRO', 'path' => 'y.pdf', 'original_name' => 'y.pdf',
            'mime' => 'application/pdf', 'size' => 10,
        ]);
        $turma->files()->where('type', TurmaDocumentType::PRUEBAS->value)
            ->get()->each(fn ($f) => $f->delete());   // lição 5: por instância

        $tipos = $turma->documentacaoObrigatoria()->pluck('type')->all();

        sort($tipos);
        $this->assertSame(['EVALUACION_REDATOR', 'MANUAL'], $tipos);
    }
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `docker compose exec -T app php artisan test --filter=TurmaModelTest`
Expected: FAIL com `Call to undefined method App\Domains\Operation\Models\Turma::documentacaoObrigatoria()`

- [ ] **Step 3: Implementar a relação**

Em `backend/app/Domains/Operation/Models/Turma.php`, adicione o import
`use App\Domains\Operation\Enums\TurmaDocumentType;` (junto dos outros `Enums`) e o método logo
abaixo de `files()`:

```php
    /**
     * Os documentos que a RN-16 exige — `files()` restrita aos tipos do
     * `TurmaDocumentType`. Relação NOMEADA e não `whereIn` solto por dois
     * motivos: a pergunta tinha duas cópias (o service da habilitação e a
     * listagem de documentos), e `with()`/`LISTING` só aceitam nome de relação
     * — é o que deixa a documentação obrigatória entrar no eager-load da
     * listagem e matar o N+1. Soft-delete fica de fora pelo default do
     * `morphMany`: doc arquivada não conta (RN-16).
     */
    public function documentacaoObrigatoria(): MorphMany
    {
        return $this->files()->whereIn('type', array_column(TurmaDocumentType::cases(), 'value'));
    }
```

- [ ] **Step 4: Rodar e ver passar**

Run: `docker compose exec -T app php artisan test --filter=TurmaModelTest`
Expected: PASS (5 testes)

- [ ] **Step 5: Trocar a segunda cópia do `whereIn` pela relação**

Em `backend/app/Domains/Operation/Http/Controllers/TurmaDocumentController.php`, o corpo de
`index()` passa a ser:

```php
    /** @return array<TurmaDocumentData> */
    public function index(Turma $turma): array
    {
        return $turma->documentacaoObrigatoria()
            ->orderBy('created_at')
            ->get()
            ->map(fn (File $f) => TurmaDocumentData::fromModel($f))
            ->all();
    }
```

O import `use App\Domains\Operation\Enums\TurmaDocumentType;` **fica**: `store()` ainda o usa em
`new Enum(TurmaDocumentType::class)` e `TurmaDocumentType::from(...)`.

- [ ] **Step 6: Rodar a regressão do endpoint de documentos**

Run: `docker compose exec -T app php artisan test --filter=TurmaDocumentApiTest`
Expected: PASS, 6 testes, **sem editar nenhuma asserção** — a listagem responde o mesmo.

- [ ] **Step 7: Pint e commit**

```bash
cd backend && ./vendor/bin/pint \
  app/Domains/Operation/Models/Turma.php \
  app/Domains/Operation/Http/Controllers/TurmaDocumentController.php \
  tests/Feature/Operation/TurmaModelTest.php
cd .. && git add backend/app/Domains/Operation/Models/Turma.php \
  backend/app/Domains/Operation/Http/Controllers/TurmaDocumentController.php \
  backend/tests/Feature/Operation/TurmaModelTest.php
git commit -m "refactor(operation): documentacao obrigatoria da turma vira relacao nomeada"
```

**DoD:** a listagem de documentos da turma responde exatamente o que respondia (os 6 testes do
`TurmaDocumentApiTest` verdes sem edição), e a pergunta "quais tipos são obrigatórios" tem **um**
dono no código.

---

### Task 2: `HabilitacaoStatus` — uma pergunta, uma resposta

`TurmaData::fromModel` chama `isHabilitada()` e `missingTypes()` separadamente, e cada um abre a
própria query. O VO responde as duas metades de uma leitura só. O gate de status entra **no VO**
(D-B1): sem ele, toda turma concluída passaria a responder `habilitada: true`.

**Files:**
- Create: `backend/app/Domains/Operation/Services/HabilitacaoStatus.php`
- Modify: `backend/app/Domains/Operation/Services/TurmaHabilitacaoService.php`
- Modify: `backend/app/Domains/Operation/Data/TurmaData.php:56-78`
- Modify: `backend/app/Domains/Operation/Actions/ConcludeTurmaAction.php:29`
- Test: `backend/tests/Feature/Operation/TurmaHabilitacaoServiceTest.php`

**Interfaces:**
- Consumes: `Turma::documentacaoObrigatoria()` (Task 1).
- Produces:
  - `App\Domains\Operation\Services\HabilitacaoStatus`, construtor
    `__construct(TurmaStatus $status, array $missingTypes)`, métodos `isHabilitada(): bool` e
    `missingTypes(): array<string>`;
  - `TurmaHabilitacaoService::for(Turma $turma): HabilitacaoStatus` — **único** método público do
    service. `isHabilitada(Turma)` e `missingTypes(Turma)` deixam de existir.

- [ ] **Step 1: Migrar os 5 testes para o `for()` — nenhuma asserção muda**

Em `backend/tests/Feature/Operation/TurmaHabilitacaoServiceTest.php`, troque **só a forma da
chamada**, mantendo cada `assert*` idêntico:

```php
    public function test_sem_docs_lista_os_3_tipos_faltantes(): void
    {
        $status = $this->service->for($this->turma);

        $this->assertFalse($status->isHabilitada());
        $this->assertSame(['MANUAL', 'PRUEBAS', 'EVALUACION_REDATOR'], $status->missingTypes());
    }

    public function test_doc_parcial_lista_so_o_que_falta(): void
    {
        $this->addDoc(TurmaDocumentType::MANUAL);
        $this->addDoc(TurmaDocumentType::PRUEBAS);

        $status = $this->service->for($this->turma);

        $this->assertFalse($status->isHabilitada());
        $this->assertSame(['EVALUACION_REDATOR'], $status->missingTypes());
    }

    public function test_3_tipos_presentes_habilita(): void
    {
        foreach (TurmaDocumentType::cases() as $type) {
            $this->addDoc($type);
        }

        $status = $this->service->for($this->turma);

        $this->assertTrue($status->isHabilitada());
        $this->assertSame([], $status->missingTypes());
    }

    public function test_doc_soft_deletada_nao_conta(): void
    {
        foreach (TurmaDocumentType::cases() as $type) {
            $this->addDoc($type);
        }
        $this->turma->files()->where('type', TurmaDocumentType::MANUAL->value)
            ->get()->each(fn (File $f) => $f->delete());   // lição #5: por instância

        $status = $this->service->for($this->turma->fresh());

        $this->assertFalse($status->isHabilitada());
        $this->assertSame(['MANUAL'], $status->missingTypes());
    }

    public function test_turma_concluida_nao_e_habilitada(): void
    {
        foreach (TurmaDocumentType::cases() as $type) {
            $this->addDoc($type);
        }
        $this->turma->status = TurmaStatus::Concluida;
        $this->turma->save();

        // D-B1: documentação completa NÃO habilita turma concluída. Esta é a
        // guarda que trava o gate de status dentro do VO — se ele sair de lá,
        // este teste reprova.
        $this->assertFalse($this->service->for($this->turma->fresh())->isHabilitada());
    }
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `docker compose exec -T app php artisan test --filter=TurmaHabilitacaoServiceTest`
Expected: FAIL com `Call to undefined method App\Domains\Operation\Services\TurmaHabilitacaoService::for()`

- [ ] **Step 3: Criar o VO**

Crie `backend/app/Domains/Operation/Services/HabilitacaoStatus.php`:

```php
<?php

namespace App\Domains\Operation\Services;

use App\Domains\Operation\Enums\TurmaStatus;

/**
 * Resposta única da RN-16 sobre uma turma: quais tipos obrigatórios faltam e,
 * a partir disso, se ela está habilitada.
 *
 * O status entra no VO de propósito (D-B1): "habilitada" nunca foi só
 * documentação — turma concluída não é habilitada, ainda que tenha os três
 * documentos (e ela sempre tem, porque concluir exige documentação completa).
 * Deixar o gate de status fora daqui devolveria a regra a dois donos, que é
 * exatamente o que este bloco existe para desfazer.
 */
final class HabilitacaoStatus
{
    /** @param  array<string>  $missingTypes  valores de TurmaDocumentType sem doc ativo. */
    public function __construct(
        private TurmaStatus $status,
        private array $missingTypes,
    ) {}

    public function isHabilitada(): bool
    {
        return $this->status === TurmaStatus::EmAndamento && $this->missingTypes === [];
    }

    /** @return array<string> */
    public function missingTypes(): array
    {
        return $this->missingTypes;
    }
}
```

- [ ] **Step 4: Reescrever o service**

`backend/app/Domains/Operation/Services/TurmaHabilitacaoService.php` inteiro passa a ser:

```php
<?php

namespace App\Domains\Operation\Services;

use App\Domains\Operation\Enums\TurmaDocumentType;
use App\Domains\Operation\Models\Turma;

/**
 * Fonte única da RN-16: "documentação completa habilita". Habilitada NÃO é
 * estado persistido (spec 6d, D3) — deriva de haver ≥1 doc ativo de CADA tipo
 * numa turma em andamento.
 *
 * UMA pergunta, UMA resposta: `for()` devolve o `HabilitacaoStatus` inteiro. Os
 * dois métodos públicos anteriores eram lidos em sequência pelo `TurmaData` e
 * abriam uma query cada — 2 por turma na listagem.
 *
 * Lê `documentacaoObrigatoria` como RELAÇÃO: carregada (listagem, `present()`),
 * custa zero; não carregada (`ConcludeTurmaAction`, que recebe o model do
 * route-binding), o Eloquent busca — que é a leitura fresca que o gate de
 * conclusão precisa ter dentro da transação.
 */
class TurmaHabilitacaoService
{
    public function for(Turma $turma): HabilitacaoStatus
    {
        $all = array_column(TurmaDocumentType::cases(), 'value');
        $present = $turma->documentacaoObrigatoria->pluck('type')->unique()->all();

        return new HabilitacaoStatus($turma->status, array_values(array_diff($all, $present)));
    }
}
```

- [ ] **Step 5: Rodar e ver passar**

Run: `docker compose exec -T app php artisan test --filter=TurmaHabilitacaoServiceTest`
Expected: PASS, 5 testes.

- [ ] **Step 6: Os dois chamadores passam pelo VO**

Em `backend/app/Domains/Operation/Data/TurmaData.php`, `fromModel` chama `for()` **uma vez**:

```php
    public static function fromModel(Turma $turma, TurmaHabilitacaoService $habilitacao): self
    {
        $habilitacaoStatus = $habilitacao->for($turma);

        return new self(
            id: $turma->id,
            quote_id: $turma->quote_id,
            course_id: $turma->course_id,
            modalidade: $turma->modalidade,
            local_aplicacao: $turma->local_aplicacao,
            start_date: $turma->start_date->toDateString(),
            end_date: $turma->end_date->toDateString(),
            status: $turma->status,
            habilitada: $habilitacaoStatus->isHabilitada(),
            missing_document_types: $habilitacaoStatus->missingTypes(),
            concluded_at: $turma->concluded_at?->toISOString(),
            redatores: $turma->redatores->map(fn (Redator $r) => TurmaRedatorData::fromModel($r))->all(),
            course_name: $turma->course->name,
            client_name: $turma->contratante()->name,
            enrolled_count: $turma->enrollments_count ?? $turma->enrollments()->count(),
            quote_code: $turma->quote->code,
            budget_code: $turma->quote->budget->code,
            budget_id: $turma->quote->budget->id,
        );
    }
```

(O `??` do `enrolled_count` sai na Task 3, junto do `loadCount` que o torna desnecessário.)

Em `backend/app/Domains/Operation/Actions/ConcludeTurmaAction.php`, a linha 29 vira:

```php
            $missing = $this->habilitacao->for($turma)->missingTypes();
```

- [ ] **Step 7: Rodar a suíte inteira**

Run: `docker compose exec -T app php artisan test`
Expected: `1 skipped, 500 passed (1858 assertions)` — mesmo placar do baseline. Esta task não
acrescenta teste; ela troca a forma de perguntar.

- [ ] **Step 8: Pint e commit**

```bash
cd backend && ./vendor/bin/pint \
  app/Domains/Operation/Services/HabilitacaoStatus.php \
  app/Domains/Operation/Services/TurmaHabilitacaoService.php \
  app/Domains/Operation/Data/TurmaData.php \
  app/Domains/Operation/Actions/ConcludeTurmaAction.php \
  tests/Feature/Operation/TurmaHabilitacaoServiceTest.php
cd .. && git add backend/app/Domains/Operation/Services/HabilitacaoStatus.php \
  backend/app/Domains/Operation/Services/TurmaHabilitacaoService.php \
  backend/app/Domains/Operation/Data/TurmaData.php \
  backend/app/Domains/Operation/Actions/ConcludeTurmaAction.php \
  backend/tests/Feature/Operation/TurmaHabilitacaoServiceTest.php
git commit -m "refactor(operation): habilitacao da turma responde por um VO unico"
```

**DoD:** o service tem **um** método público, `grep -rn "isHabilitada(\$\|missingTypes(\$" backend/app`
volta vazio, e o placar da suíte é idêntico ao baseline — o comportamento não mudou, só o número de
perguntas.

---

### Task 3: O seam de listagem

**Files:**
- Modify: `backend/app/Domains/Operation/QueryBuilders/TurmaQueryBuilder.php`
- Modify: `backend/app/Domains/Operation/Models/Turma.php`
- Modify: `backend/app/Domains/Operation/Http/Controllers/TurmaController.php:109-112`
- Modify: `backend/app/Domains/Operation/Actions/UpdateTurmaAction.php:22`
- Modify: `backend/app/Domains/Operation/Data/TurmaData.php:73`
- Test: `backend/tests/Feature/Shared/SoftDeletedRelationProjectionTest.php:193`

**Interfaces:**
- Consumes: `Turma::documentacaoObrigatoria()` (Task 1).
- Produces:
  - `TurmaQueryBuilder::LISTING` — `array<string>`, os nomes de relação da projeção;
  - `Turma::loadListingData(): static` — `load(LISTING)` + `loadCount('enrollments')`.

- [ ] **Step 1: `LISTING` como array de strings, no molde dos outros quatro models**

`backend/app/Domains/Operation/QueryBuilders/TurmaQueryBuilder.php` inteiro:

```php
<?php

namespace App\Domains\Operation\QueryBuilders;

use Illuminate\Database\Eloquent\Builder;

/**
 * QueryBuilder da Turma. Concentra a projeção de listagem/detalhe: eager-load das
 * relações que o TurmaData achata (curso, cotação→orçamento→cliente, redatores,
 * documentação obrigatória) e a contagem de matrículas ativas — evita N+1 no hub.
 * Custom Eloquent Builder (não Repository — ADR-02).
 */
class TurmaQueryBuilder extends Builder
{
    /**
     * `.client.user`, não só `.client`: o seam `Turma::contratante()` lê o RUT
     * do User do contratante (B4). Parar em `.client` deixa um SELECT por turma
     * — guarda em `ContratanteEagerLoadTest`.
     *
     * `documentacaoObrigatoria` é o que faz a RN-16 custar UMA query para a
     * listagem inteira em vez de uma por linha — guarda de contagem em
     * `TurmaQueryBuilderTest`.
     */
    public const LISTING = ['redatores.user', 'course', 'quote.budget.client.user', 'documentacaoObrigatoria'];

    public function withListingData(): static
    {
        return $this->with(self::LISTING)->withCount('enrollments');
    }
}
```

- [ ] **Step 2: `loadListingData()` no model**

Em `backend/app/Domains/Operation/Models/Turma.php`, adicione logo acima de `newEloquentBuilder`:

```php
    /**
     * Contraparte de instância do `withListingData()` — o mesmo molde de
     * `Client`, `Quote`, `Course` e `Enrollment`. É daqui que o `present()` do
     * controller carrega, e por isso as Actions não pré-carregam nada: a carga
     * da projeção tem um dono só.
     */
    public function loadListingData(): static
    {
        return $this->load(TurmaQueryBuilder::LISTING)->loadCount('enrollments');
    }
```

- [ ] **Step 3: `present()` perde o `findOrFail`, e o `UpdateTurmaAction` perde a carga parcial**

Em `backend/app/Domains/Operation/Http/Controllers/TurmaController.php`:

```php
    private function present(Turma $turma, TurmaHabilitacaoService $habilitacao): TurmaData
    {
        return TurmaData::fromModel($turma->loadListingData(), $habilitacao);
    }
```

Em `backend/app/Domains/Operation/Actions/UpdateTurmaAction.php`, a última linha do `execute` vira:

```php
        return $turma;
```

- [ ] **Step 4: O `??` do `enrolled_count` morre (D-B3)**

Em `backend/app/Domains/Operation/Data/TurmaData.php`, a linha do `enrolled_count` vira:

```php
            enrolled_count: $turma->enrollments_count,
```

Fallback silencioso é a mesma classe de defeito que o resto do bloco mata: quem esquecer o
`loadCount` passava a pagar uma query por turma sem ninguém perceber. Sem ele, esquecer estoura.

- [ ] **Step 5: Consertar a fixture que monta o model à mão**

Em `backend/tests/Feature/Shared/SoftDeletedRelationProjectionTest.php`, o `fresh()` do
`test_turma_data_projeta_turma_com_curso_e_cliente_arquivados` passa a pedir a relação nova e a
contagem:

```php
        $data = TurmaData::fromModel(
            $turma->fresh(['quote.budget.client', 'course', 'redatores', 'documentacaoObrigatoria'])
                ->loadCount('enrollments'),
            app(TurmaHabilitacaoService::class),
        );
```

Nenhuma asserção do teste muda.

- [ ] **Step 6: Rodar a suíte inteira**

Run: `docker compose exec -T app php artisan test`
Expected: `1 skipped, 500 passed (1858 assertions)`.

- [ ] **Step 7: Pint e commit**

```bash
cd backend && ./vendor/bin/pint \
  app/Domains/Operation/QueryBuilders/TurmaQueryBuilder.php \
  app/Domains/Operation/Models/Turma.php \
  app/Domains/Operation/Http/Controllers/TurmaController.php \
  app/Domains/Operation/Actions/UpdateTurmaAction.php \
  app/Domains/Operation/Data/TurmaData.php \
  tests/Feature/Shared/SoftDeletedRelationProjectionTest.php
cd .. && git add backend/app/Domains/Operation/QueryBuilders/TurmaQueryBuilder.php \
  backend/app/Domains/Operation/Models/Turma.php \
  backend/app/Domains/Operation/Http/Controllers/TurmaController.php \
  backend/app/Domains/Operation/Actions/UpdateTurmaAction.php \
  backend/app/Domains/Operation/Data/TurmaData.php \
  backend/tests/Feature/Shared/SoftDeletedRelationProjectionTest.php
git commit -m "refactor(operation): seam de listagem da turma com LISTING e loadListingData"
```

**DoD:** `show`, `store`, `update`, `conclude` e as duas rotas de redator respondem o mesmo payload
(a suíte inteira verde prova), e a carga da projeção tem um dono só — nenhuma Action pré-carrega
relação.

---

### Task 4: A guarda de contagem (D-B2)

`preventLazyLoading` não serve aqui, e é por isso que o `ContratanteEagerLoadTest` passava com o
defeito vivo: `$turma->files()->…` era query **na relação**. Contagem de queries pega as duas
classes de regressão — perder o eager-load **e** reintroduzir query por linha por outro caminho.

**Files:**
- Test: `backend/tests/Feature/Operation/TurmaQueryBuilderTest.php`

**Interfaces:**
- Consumes: `TurmaQueryBuilder::LISTING` (Task 3), `Turma::documentacaoObrigatoria()` (Task 1).

- [ ] **Step 1: Escrever a guarda**

Em `backend/tests/Feature/Operation/TurmaQueryBuilderTest.php`, acrescente aos imports:

```php
use App\Domains\Operation\Enums\TurmaDocumentType;
use App\Domains\Operation\Enums\TurmaModalidade;
use App\Domains\Operation\Enums\TurmaStatus;
use Illuminate\Database\Events\QueryExecuted;
use Illuminate\Support\Facades\DB;
```

e ao fim da classe:

```php
    private int $seq = 0;

    /**
     * Cadeia comercial completa e distinta das demais (`users.rut` é `unique`),
     * com os tipos de documento que o teste mandar.
     *
     * @param  array<TurmaDocumentType>  $docs
     */
    private function makeTurmaComDocs(array $docs): Turma
    {
        $n = ++$this->seq;
        $client = $this->makeClientWithUser(
            ['legal_name' => "Empresa Legal {$n} SpA"],
            ['name' => "Empresa Cliente {$n}", 'rut' => '1.000.'.str_pad((string) $n, 3, '0', STR_PAD_LEFT).'-0'],
        );
        $budget = Budget::create(['client_id' => $client->id, 'code' => "Scap {$n}"]);
        $course = $this->makeCourse(['name' => "Curso {$n}"]);
        $quote = Quote::create([
            'budget_id' => $budget->id, 'course_id' => $course->id, 'seq_in_budget' => 1,
            'student_count' => 5, 'value_uf' => 10, 'status' => 'approved',
        ]);
        $turma = Turma::create([
            'quote_id' => $quote->id, 'course_id' => $course->id,
            'modalidade' => TurmaModalidade::Online, 'local_aplicacao' => null,
            'start_date' => '2026-08-01', 'end_date' => '2026-08-10',
            'status' => TurmaStatus::EmAndamento,
        ]);

        foreach ($docs as $type) {
            $turma->files()->create([
                'type' => $type->value, 'path' => 'x.pdf', 'original_name' => 'x.pdf',
                'mime' => 'application/pdf', 'size' => 10,
            ]);
        }

        return $turma;
    }

    /**
     * O 2N+1 que este bloco matou: a documentação obrigatória custava uma query
     * por turma (duas, nas em andamento — `habilitada` perguntava e
     * `missing_document_types` perguntava de novo). Contagem, e não
     * `preventLazyLoading`: aquilo não enxerga query FEITA NA relação, que era
     * a forma antiga, e é por isso que o `ContratanteEagerLoadTest` passava com
     * o defeito vivo.
     *
     * As duas turmas têm documentação DIFERENTE de propósito: uma query só para
     * as duas ainda tem de devolver a resposta certa para cada uma.
     */
    public function test_listagem_pergunta_a_documentacao_uma_vez_para_todas_as_turmas(): void
    {
        $this->actingAsAdmin();
        $completa = $this->makeTurmaComDocs(TurmaDocumentType::cases());
        $incompleta = $this->makeTurmaComDocs([TurmaDocumentType::MANUAL]);

        $consultas = 0;
        DB::listen(function (QueryExecuted $query) use (&$consultas): void {
            if (str_contains($query->sql, 'from "files"')) {
                $consultas++;
            }
        });

        $res = $this->getJson('/api/turmas')->assertOk()->assertJsonCount(2);

        $this->assertSame(1, $consultas);

        $linhas = collect($res->json());
        $this->assertTrue($linhas->firstWhere('id', $completa->id)['habilitada']);
        $this->assertSame([], $linhas->firstWhere('id', $completa->id)['missing_document_types']);
        $this->assertFalse($linhas->firstWhere('id', $incompleta->id)['habilitada']);
        $this->assertSame(
            ['PRUEBAS', 'EVALUACION_REDATOR'],
            $linhas->firstWhere('id', $incompleta->id)['missing_document_types'],
        );
    }
```

- [ ] **Step 2: Rodar e ver passar**

Run: `docker compose exec -T app php artisan test --filter=TurmaQueryBuilderTest`
Expected: PASS, 2 testes.

- [ ] **Step 3: Mutante 1 — tirar a relação do eager-load, ver vermelho**

Em `TurmaQueryBuilder::LISTING`, remova `'documentacaoObrigatoria'`.

Run: `docker compose exec -T app php artisan test --filter=TurmaQueryBuilderTest`
Expected: FAIL com `Failed asserting that 2 is identical to 1.` — uma query por turma volta.

**Reverta o mutante** (devolva `'documentacaoObrigatoria'` a `LISTING`) e rode de novo:
Expected: PASS.

- [ ] **Step 4: Mutante 2 — tirar o `loadCount`, ver a falha ficar ALTA (prova da D-B3)**

Em `Turma::loadListingData()`, troque o corpo por `return $this->load(TurmaQueryBuilder::LISTING);`.

Run: `docker compose exec -T app php artisan test --filter=TurmaShowTest`
Expected: FAIL — `enrolled_count` chega `null` num parâmetro `int|Optional`. Sem a remoção do `??`
(D-B3) este mesmo mutante ficaria **verde**, pagando uma query por turma em silêncio: é exatamente
essa a diferença que a D-B3 compra.

**Reverta o mutante** e rode de novo:
Expected: PASS.

- [ ] **Step 5: Registrar o que a guarda NÃO pega, sem maquiagem**

Acrescente ao docblock do teste, como último parágrafo:

```php
     * O que esta guarda NÃO pega, e não tem como: chamar `for()` duas vezes de
     * novo no `fromModel`. Com a relação carregada, a segunda leitura é de
     * memória e não custa query nenhuma — a classe de defeito deixou de
     * existir, em vez de passar a ser vigiada.
```

- [ ] **Step 6: Rodar a suíte inteira**

Run: `docker compose exec -T app php artisan test`
Expected: `1 skipped, 501 passed (1865 assertions)` — **+1 teste e +7 asserções** sobre o baseline,
uma por asserção do teste novo (`assertOk`, `assertJsonCount`, a contagem, e as 4 do payload). Se o
número medido divergir, **pare e ache o motivo** antes de commitar: asserção a mais ou a menos aqui
significa que o teste não é o que este plano escreveu.

- [ ] **Step 7: Confirmar a árvore limpa dos mutantes**

Run: `git status --porcelain`
Expected: só `backend/tests/Feature/Operation/TurmaQueryBuilderTest.php` modificado. Se
`TurmaQueryBuilder.php` ou `Turma.php` aparecerem, um mutante ficou para trás — reverta antes de
commitar.

- [ ] **Step 8: Pint e commit**

```bash
cd backend && ./vendor/bin/pint tests/Feature/Operation/TurmaQueryBuilderTest.php
cd .. && git add backend/tests/Feature/Operation/TurmaQueryBuilderTest.php
git commit -m "test(operation): guarda de contagem para a documentacao da listagem"
```

**DoD:** a guarda foi **vista reprovando** com a mensagem literal contra o eager-load removido, e a
árvore está limpa dos dois mutantes.

---

### Task 5: Gate do bloco

Executado por quem conduz o bloco, não delegado: é a prova do DoD, e o DoD pede comportamento contra
a API real (lição 12), não suíte verde.

**Files:** nenhum de produção. Produz o registro no `state.md`.

- [ ] **Step 1: Ferramentas**

```bash
docker compose exec -T app php artisan test
docker compose exec -T app php artisan typescript:transform
git diff --stat -- frontend/src/shared/types/generated.ts
git diff main...HEAD --stat -- backend/database/
git diff main...HEAD --stat -- frontend/
cd backend && ./vendor/bin/pint --test \
  app/Domains/Operation/Models/Turma.php \
  app/Domains/Operation/QueryBuilders/TurmaQueryBuilder.php \
  app/Domains/Operation/Services/HabilitacaoStatus.php \
  app/Domains/Operation/Services/TurmaHabilitacaoService.php \
  app/Domains/Operation/Data/TurmaData.php \
  app/Domains/Operation/Actions/ConcludeTurmaAction.php \
  app/Domains/Operation/Actions/UpdateTurmaAction.php \
  app/Domains/Operation/Http/Controllers/TurmaController.php \
  app/Domains/Operation/Http/Controllers/TurmaDocumentController.php \
  tests/Feature/Operation/TurmaModelTest.php \
  tests/Feature/Operation/TurmaQueryBuilderTest.php \
  tests/Feature/Operation/TurmaHabilitacaoServiceTest.php \
  tests/Feature/Shared/SoftDeletedRelationProjectionTest.php
```

Expected: suíte `1 skipped, 501 passed (1865 assertions)`; os três `git diff` **sem saída**; Pint
`passed` nos 13
arquivos (a lista é explícita para o `--test` nunca cair sem argumento — lição 9).

- [ ] **Step 2: Código morto e leis §5**

```bash
grep -rn "isHabilitada(\$\|missingTypes(\$" backend/app/
grep -rn "whereIn('type', array_column(TurmaDocumentType" backend/app/
grep -rn "Repository" backend/app/Domains/Operation/
grep -rn "abort(" backend/app/Domains/Operation/
```

Expected: os dois primeiros **vazios** (a API antiga morreu; o `whereIn` tem um dono só, dentro da
relação). Terceiro vazio. Quarto: nenhuma ocorrência **nova** — compare com `git show main:` se
houver hit.

- [ ] **Step 3: E2e contra a API real**

`migrate:fresh --seed` no MySQL, sessão Sanctum por cookie + CSRF (lição 12: `Origin` e `Accept`
obrigatórios, `XSRF-TOKEN` reextraído do jar depois do login, que o rotaciona).

Provar, nesta ordem:

1. `GET /api/turmas` → **200**, 4 turmas, cada uma com `habilitada` e `missing_document_types`
   coerentes com os documentos que o seed criou.
2. **A D-B1 medida onde o usuário vive:** a turma **concluída** do seed (id 3, com os três
   documentos) responde **`habilitada: false`** e `missing_document_types: []`.
3. **A contagem medida na API, não só na suíte:** com o `DB::listen` do tinker ou o log de query
   ligado, `GET /api/turmas` faz **1** query em `files` — contra as 7 medidas em `4ae4c91` para as
   mesmas 4 turmas.
4. `GET /api/turmas/{id}` de uma turma em andamento → **200** com `enrolled_count` inteiro (o
   caminho sem o `??`).
5. `GET /api/turmas/{id}/documentos` → **200** com a mesma lista de antes (a relação substituiu o
   `whereIn` do controller).
6. `POST /api/turmas/{id}/documentos` subindo o tipo que falta e, em seguida, `GET /api/turmas` →
   a turma passa a `habilitada: true` — a leitura pela relação não congelou a resposta.

- [ ] **Step 4: Revisar pendências**

Ler `docs/pendencias.md` e declarar, por escrito, quais gatilhos venceram, quais fecharam e quais
nasceram. P-03 (main tree) e P-04 (reavaliar 2026-08-15) são as candidatas conhecidas.

- [ ] **Step 5: Registrar e transicionar**

Escrever o resultado do gate no `state.md` — números medidos, o que foi provado e **o que não foi**,
sem maquiagem — e transicionar:

```yaml
workflow_state: ready_for_review
next_owner: claude
next_action: request_block_review
```

Commit: `docs(state): gate do turma-habilitacao-listagem provado; bloco vai a ready_for_review`

**DoD:** o e2e provou os 6 pontos contra a API real, e a redução de 7 para 1 query foi medida **na
API**, no mesmo banco onde os 7 foram medidos na abertura do bloco.

---

## Desvios contra a spec aprovada

Nenhum. As três decisões novas do brainstorming (D-B1, D-B2, D-B3) entraram na spec antes desta
escrita, e as 5 decisões do item do backlog entraram sem reabertura.

Duas observações que a escrita do plano fixou e que a spec deixava em aberto:

- **D-P1 — o mutante do "chamar `for()` duas vezes" não reproduz, e o plano diz isso em vez de
  fingir que a guarda o cobre.** Com a relação eager-loaded, a segunda leitura é de memória: a
  classe de defeito deixou de existir em vez de passar a ser vigiada. A guarda de contagem protege o
  **eager-load**, que é o que pode regredir.
- **D-P2 — a guarda mora no `TurmaQueryBuilderTest`, não num arquivo novo.** O assunto do arquivo é
  exatamente a projeção de listagem, e é onde um leitor procura. Segue o precedente do
  `CertificateListingTest`, que guarda a contagem dentro do próprio arquivo da listagem.

## Handoff de execução

`executor: claude`

Backend com decisão de arquitetura (VO de domínio, fronteira de service, seam de listagem) e leis do
§5 no caminho — DDD-lite sem Repository, projeção única pelo `fromModel`. Não é task mecânica de
paths fechados; fica com a lente que carrega o gabarito do projeto.
