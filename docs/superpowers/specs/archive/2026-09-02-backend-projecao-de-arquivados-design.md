# Design — `backend-projecao-de-arquivados`

> Item 24 da fila (`docs/superpowers/backlog.md`), `lane-a`, main tree, branch
> `refactor/backend-projecao-de-arquivados`. Context Packet: **não** — o item é `Contexto: não` e a
> fonte única (a revisão de arquitetura de 2026-09-02, candidato 1) vive no repositório em
> `docs/superpowers/audits/2026-09-02-arquitetura-deepening.html`.
> Base de medição: `main@8efd85f2`. A branch sai de `main@14b25b6c`, que acrescenta só documentação
> (README e o próprio item 24 + audit) — **o código de `backend/` é byte-idêntico entre os dois**.

## 1. Problema

O audit mediu; esta spec **remediu tudo contra o código** antes de decidir, e três números do card
do backlog saíram diferentes. O que ficou de pé:

- **Oito controllers têm `archived()` e `restore()`** — `CourseController` (Catalog),
  `ClientController`, `BudgetController`, `QuoteController` (Commercial), `RedatorController`,
  `UserController` (Identity), `TurmaController`, `EnrollmentController` (Operation). Confirmado.
- **A montagem do `archived()` é idêntica nos oito.** A mesma sequência em todos:
  `pluck('id')->all()` → `ArchiveTrailQuery::archivedBy($model, $ids)` → `map()` →
  `deleted_at->toIso8601String()` → `$autores[$id] ?? null`. Só o DTO de saída e a query de entrada
  variam. Confirmado.
- **O comentário que explica por que o `restore()` resolve o model à mão está copiado em 7 dos 8
  arquivos**, com redação quase idêntica. `CourseController` é o oitavo, e não tem comentário
  nenhum — o motivo mora nos outros sete e falta exatamente onde alguém leria primeiro.
- **`ArchiveTrailQuery::archivedBy` é citado em 10 lugares de `app/` fora do próprio arquivo:** as
  8 chamadas reais mais **duas menções em docblock** (`Shared/Pagination/Paginates.php:60` e
  `Operation/Http/Controllers/TurmaController.php:103`). Isso decide a forma da catraca (§5).

### 1.1 Os três números que o card errou

| Afirmação do card | Medido em `main@8efd85f2` |
|---|---|
| `toResponse(request())->setStatusCode(...)` **17× em 10 controllers** | `setStatusCode` aparece **17× em 10** arquivos; `toResponse(request())` aparece **16× em 9**. O card somou duas medições diferentes num número só. |
| a briga contra o 201 tem uma grafia | Tem **duas**: `setStatusCode(Response::HTTP_OK)` **10×** e `setStatusCode(200)` **4×** — 14 sítios com a mesma intenção. Os outros 3 (`setStatusCode(201)`) empurram na direção **oposta** e não são deste bloco. |
| o `firstOrFail` está atrás do seam | A interface fechada do audit (`lista` + `respostaDeRestauracao`) **não o alcança**. O texto do audit e o desenho dele divergem; a divergência foi resolvida por decisão (§3.1). |

### 1.2 O inventário do 200

Os 14 sítios que desfazem o 201 que `ResponsableData::calculateResponseStatus` força em POST:

| Grafia | Sítios |
|---|---|
| `setStatusCode(Response::HTTP_OK)` | os 8 `restore()` · `QuoteController::approve` · `QuoteController::reject` |
| `setStatusCode(200)` | `EnrollmentController::import` · `TurmaController::designateRedator` · `TurmaController::conclude` · `CertificateController::revoke` |

O comentário que explica o porquê está escrito uma vez, em `QuoteController.php:99-101`, e vale
para os 14.

## 2. O que a fonte canônica exige

- **ADR-02 / lei §5.1 — DDD-lite, SEM Repository sobre Eloquent.** Regra de escrita em Action,
  consulta reaproveitada em `QueryBuilders/`, CRUD sem regra direto do controller ao Eloquent.
  Nenhuma das duas peças deste bloco pode virar Repository (§4.3).
- **`PersistenceLawsTest::test_nenhuma_classe_repository_sobre_eloquent`** varre `app/` **inteiro** e
  reprova basename terminado em `Repository`. A isenção existente é só `/QueryBuilders/`; **não há
  exceção para `Shared/`**, e a spec não pede uma.
- **ADR-04 / lei §5.3 — tipos TS gerados do backend.** Os 8 `Archived*Data` emitem um tipo nominal
  cada um em `generated.ts`, consumido pelo front. Colapsá-los quebraria o contrato; este bloco
  **não toca DTO nenhum** e o `generated.ts` fecha com diff vazio (§7).
- **ADR-08 / lei §5.2 — auditoria só na aplicação.** `ArchiveTrailQuery` lê o que o `owen-it` grava.
  O module não reinterpreta auditoria nem acrescenta caminho de escrita.
- **`docs/estrutura-monolito.md`** — `Shared/` é transversal e **não é domínio**. Já hospeda
  `Exceptions/`, `Files/`, `Rules/`, `Support/`, `Pagination/`, `Retention/`, `Logging/`, `Alerts/`,
  `Http/Middleware/` e `Audit/`. Peça nova de `Shared/` entra por pasta com propósito nomeado.
- **`DomainDependencyTest`** enxerga só `app/Domains/`. **`App\Shared\*` não é varrido por ele** —
  por isso a catraca do §5 é a única régua estrutural que este module terá.
- **Lição 10 — teste que nunca viu o bug é cobertura fantasma.** Catraca vale depois de ser vista
  reprovar contra o código antigo.
- **Lição 3 — YAGNI com critério.** Nada de entrada especulativa: as três entradas desta spec
  existem porque 8, 8 e 14 sítios as chamam hoje.
- **Lição 13 — doc afirma o que é.** O audit fonte **está versionado** (decisão de 2026-09-02), e a
  linha `Fonte:` do item 24 aponta para arquivo que o repositório tem.

## 3. Decisões

### 3.1 O `firstOrFail` fica atrás do seam — três entradas, não duas

**Decidido pelo João em 2026-09-02.** O audit escreve, em *Atrás do seam*, "o `firstOrFail` sobre
`onlyTrashed` (404 sobre ativo)", mas a interface fechada dele só tem `lista()` e
`respostaDeRestauracao()` — nenhuma resolve o model. E é **a resolução** que carrega o comentário
copiado em 7 arquivos, que é o defeito que o objetivo do item nomeia. Duas entradas entregariam
metade do bloco e deixariam a próxima leitura reabrir a mesma medição.

A origem entra **pronta**, como a query do `archived()`: `resolveArquivado(Builder|Relation, int)`.
É o que preserva as duas diferenças reais — `Enrollment` resolve por `$turma->enrollments()` (a
relação escopada mantém a posse: matrícula de outra turma segue 404) e os demais por
`Model::query()`.

**Recusado:** uma entrada única que orquestra (`restaura($origem, $id, $acao, $projeta)`). As
Actions divergem em assinatura (`Budget` precisa de `BudgetSummaryService`, `Turma` do presenter com
`TurmaHabilitacaoService`), e engolir a chamada da Action levaria orquestração de domínio para
`Shared/` — é a forma que mais se aproxima do que a lei §5.1 recusa.

### 3.2 O carimbo do 200 mora em `Shared/Http`, não em `Shared/Audit`

**Decidido pelo João em 2026-09-02.** A entrada não tem nada a ver com auditoria: desfaz o 201 que
`ResponsableData` força em POST. Em `Shared/Audit` ela seria uma responsabilidade deslocada e não
alcançaria `QuoteController::approve`/`::reject`, que fazem exatamente a mesma coisa e não são
restauração.

`app/Shared/Http/` já existe (hospeda `Middleware/SetLocale.php`), então a pasta não nasce
especulativa.

### 3.3 A catraca do 200 casa as DUAS grafias e fecha sem exceção

**Decidido pelo João em 2026-09-02.** `RespostaDeRecurso::ok()` cobre os **14** sítios — os 10 de
`Response::HTTP_OK` e os 4 de `200` literal. Régua que pega uma grafia e não a outra é a porta por
onde a dívida volta; é a lição que as catracas de frontend `GRAFIA_LITERAL` e `RAIO_LITERAL` já
compraram. Fechando os 14, a lista de exceções nasce **vazia** — não há débito declarado a alguém
encolher depois.

Custo aceito: o bloco toca `CertificateController::revoke`, em Certification — domínio que não
entraria de outro jeito. O método tem teste de endpoint próprio (`RevokeCertificateTest`), então a
mesma prova de contrato do §7.1 vale para ele.

### 3.4 `Collection`, não `iterable`

O card escreve `lista(iterable $registros, ...)`. A spec usa
`Illuminate\Database\Eloquent\Collection` porque o corpo chama `pluck()`, `map()` e `values()`:
`iterable` obrigaria uma conversão interna e prometeria no contrato uma liberdade que a
implementação não tem. Desvio declarado, não silencioso.

### 3.5 O que **não** entra, por medição

- **As 8 `Restore*Action`.** Não são gêmeas — divergem em quatro eixos medidos: lock (`Client`,
  `Redator` e `Turma` travam; cinco não), gate 422 (`Quote` recusa sob orçamento arquivado; `Turma`
  tem dois; `Enrollment` aplica a RN-15 **fora** do `if`), limpeza de `archived_with_parent` (só
  `Quote` e `Enrollment`) e retorno (`Turma` devolve cru, `StaffUser` faz `load` inline).
- **A query de cada agregado.** `Turma` pagina e filtra por `visibleTo`; `User` não tem builder e
  filtra `type = 'admin'` (spec D10); `Enrollment` usa `withListingData()` + `orderByStudentName()`;
  `Budget` injeta `BudgetSummaryService`; `Quote` é escopada pelo pai. É por isso que a query entra
  **pronta** na interface.
- **O `abort_unless($model->type === 'admin', 404)` do `UserController`.** Vocabulário de Identity,
  e o mesmo gate já vive em `show`, `update` e `destroy`. Fica no controller, **depois** do resolve.
- **Os 8 `Archived*Data`.** Contrato TS (ADR-04).
- **Os 3 `setStatusCode(201)`** (`EnrollmentController::store`, `TurmaDocumentController` linha 49,
  `CertificateController` linha 110). Forçam criação — direção oposta.

## 4. Arquitetura

### 4.1 `app/Shared/Audit/ArchivedListing.php`

Ao lado do `ArchiveTrailQuery`, seu único colaborador.

```php
/**
 * @param  Collection<int, Model>  $registros   já materializados pela query do agregado
 * @param  class-string<Model>     $model       tipo passado ao ArchiveTrailQuery
 * @param  Closure(Model, string, ?string): mixed  $montar  (registro, archived_at, archived_by)
 * @return list<mixed>
 */
public static function lista(Collection $registros, string $model, Closure $montar): array;

/** O arquivado, ou 404 — sobre registro ATIVO e sobre inexistente. A origem entra PRONTA. */
public static function resolveArquivado(Builder|Relation $origem, int $id): Model;
```

`lista()` absorve, uma vez: `pluck('id')->all()`, a chamada ao `ArchiveTrailQuery`, o `map`, o
`deleted_at->toIso8601String()`, o `$autores[$id] ?? null`, e o `values()->all()` — que hoje só o
`TurmaController` escreve, e que passa a valer para os oito.

`resolveArquivado()` absorve `onlyTrashed()->whereKey($id)->firstOrFail()` e **o comentário**, que
passa a existir uma vez, no docblock do método.

### 4.2 `app/Shared/Http/RespostaDeRecurso.php`

```php
/** Desfaz o 201 que ResponsableData::calculateResponseStatus força em POST. */
public static function ok(Data $projetado): JsonResponse;
```

### 4.3 Por que nenhuma das duas é Repository (lei §5.1)

- `lista()` **recebe** o resultado do Eloquent já materializado. Não constrói query, não conhece
  agregado, não tem método por entidade. É projeção de leitura, não acesso a dados.
- `resolveArquivado()` é a mais próxima da linha: acrescenta três chamadas a um builder que **o
  chamador escolheu e passou**. Não esconde o Eloquent (o tipo do parâmetro é o próprio builder),
  não tem uma entrada por agregado, e devolve `Model` — não uma abstração.
- `RespostaDeRecurso` não toca persistência.
- Nenhum basename termina em `Repository`, e a spec não pede isenção no `PersistenceLawsTest`.

### 4.4 Os controllers depois

O molde, em `CourseController`:

```php
public function archived(): array
{
    return ArchivedListing::lista(
        Course::onlyTrashed()->withArchivedListingData()->get(),
        Course::class,
        fn (Course $c, string $em, ?string $por) => new ArchivedCourseData(
            course: CourseData::fromModel($c), archived_at: $em, archived_by: $por,
        ),
    );
}

public function restore(int $course, RestoreCourseAction $action): JsonResponse
{
    $model = ArchivedListing::resolveArquivado(Course::query(), $course);

    return RespostaDeRecurso::ok(CourseData::fromModel($action->execute($model)));
}
```

Os quatro que fogem do molde, e o que **fica** em cada um:

| Controller | Desvio | Permanece no controller |
|---|---|---|
| `TurmaController` | `lista()` devolve o `array` que entra em `PageData(data:)`; perde o `->values()` próprio | `slice()`, `visibleTo()`, `whereDisplayStatus(asOfArchiving: true)`, `present()` |
| `EnrollmentController` | `resolveArquivado($turma->enrollments(), $enrollment)` — a relação escopada preserva a posse | `withListingData()`, `orderByStudentName()` |
| `UserController` | molde | o `abort_unless(type === 'admin', 404)` **depois** do resolve; o filtro `type = 'admin'` no `archived()` |
| `BudgetController` | molde | `BudgetSummaryService` nos dois lados |

Os seis sítios de 200 que não são `restore()` trocam só o carimbo por `RespostaDeRecurso::ok()`.

### 4.5 Ordem de trabalho

As duas peças e a suíte unitária nascem **antes** de qualquer controller migrar; as catracas ligam
**por último**, depois de o último sítio migrar — catraca que nasce vermelha por dívida ainda não
paga trava o próprio bloco (o motivo escrito na P-67).

## 5. Catracas

Duas, no molde do `MensagemLiteralTest`: varredura estática sobre `app/`, **comentário removido
antes da varredura** — como o `o_problem_details_nao_tem_texto_literal` já faz com
`preg_replace('#/\*.*?\*/|//[^\n]*#s', '', $fonte)`.

1. **`ArchiveTrailQuery::archivedBy` citado fora de `app/Shared/Audit/` reprova.** Sem a remoção de
   comentário a régua nasceria vermelha por dois docblocks (`Paginates.php:60`,
   `TurmaController.php:103`) que só **mencionam** o método. `tests/` fica fora da varredura, então
   o `ArchiveTrailQueryTest` continua chamando o método direto, como deve.
2. **`setStatusCode(Response::HTTP_OK)` e `setStatusCode(200)` fora de `app/Shared/Http/`
   reprovam.** As duas grafias, lista de exceções **vazia**.

Ambas moram em `tests/Unit/Shared/`, como o `MensagemLiteralTest` — são varredura de fonte, não
exercitam banco.

## 6. Fora de escopo

Além do §3.5: nenhuma rota muda, nenhum DTO muda, nenhuma migration, nenhum arquivo de `frontend/`.
`ListQueryBudgetTest` e `ParentLockOnChildWriteTest` **não devem precisar mudar** — se precisarem, o
desenho saiu do lugar (§7.5).

## 7. Definition of Done

1. **Os 70 testes de endpoint de arquivamento passam sem edição.** São caixa-preta sobre JSON, e
   passarem intactos é o que prova que o contrato não mudou. Medidos: `ClientArchiveEndpointTest` 8,
   `CourseArchiveEndpointTest` 8, `BudgetArchiveEndpointTest` 8, `QuoteArchiveEndpointTest` 9,
   `RedatorArchiveEndpointTest` 9, `StaffUserArchiveEndpointTest` 9,
   `EnrollmentArchiveEndpointTest` 10, `TurmaArchiveEndpointTest` 9 = **70**.
2. **Os testes dos seis sítios de 200 que não são `restore()` passam sem edição** — as provas de
   `approve`/`reject`, `import`, `designateRedator`, `conclude` e `revoke`.
3. **`tests/Unit/Shared/ArchivedListingTest.php` novo**, sobre registros montados à mão, sem
   round-trip HTTP: hoje a montagem só é alcançável por HTTP. Cobre no mínimo id sem audit `deleted`
   (`archived_by` → `null`), coleção vazia, e a ordem preservada.
4. **As duas catracas vistas reprovar** contra o código atual antes de valerem (lição 10). A prova é
   por **cópia no scratchpad e restauração**, nunca por `git stash` — a pilha de stashes desta
   máquina tem entradas alheias.
5. **`ListQueryBudgetTest` e `ParentLockOnChildWriteTest` sem diff.** O primeiro guarda 1 query por
   unidade nas oito rotas de arquivados; o segundo tem allowlist por path de Action, e nenhuma Action
   é tocada.
6. **`generated.ts` com diff vazio**, com `typescript:transform` re-rodado — nenhum DTO muda.
7. **Suíte backend verde** (a `main` mede 1149 passed / 5 skipped) e **Pint `passed`** nos arquivos
   PHP tocados.
8. **`grep` de fechamento:** zero `ArchiveTrailQuery::archivedBy` em `app/` fora de `Shared/Audit/`
   (código, não comentário) e zero `setStatusCode(Response::HTTP_OK)`/`setStatusCode(200)` fora de
   `Shared/Http/`.

## 8. Riscos

- **`resolveArquivado()` devolve `Model` e as Actions recebem tipo concreto.** Em runtime o PHP
  checa e passa; não há phpstan/larastan no `require-dev` (só Pint), então nada estático reprova.
  Mitigação: docblock genérico no método e o teste de endpoint, que exercita os oito caminhos reais.
- **`Course::query()` no lugar de `Course::onlyTrashed()`.** O `onlyTrashed()` passa para dentro do
  module; se um chamador passar um builder que **já** filtrou por `deleted_at IS NULL`, o resolve
  nunca acha. Nenhum dos oito faz isso hoje, e o teste de endpoint pega — mas é a armadilha a vigiar
  na revisão.
- **`EnrollmentController` é o único cuja origem é uma `Relation`.** Se o parâmetro for tipado só
  como `Builder`, o caso aninhado quebra e leva junto a posse declarada. O tipo é
  `Builder|Relation` por causa dele.
- **`CertificateController::revoke` arrasta Certification para o diff** por causa da decisão 3.3.
  Domínio fora da frente do bloco; a mitigação é a prova §7.2 e nada mais tocado ali.
