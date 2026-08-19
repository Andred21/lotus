# Arquivados e restauração nos roots restantes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** dar caminho de volta ao soft-delete dos seis roots restantes — `Budget`, `Quote`, `User` (staff), `Redator`, `Turma`, `Enrollment` —, fechando de passagem os dois defeitos que a medição encontrou: o 500 alcançável no restore de turma e a recusa silenciosa de emissão de certificado quando o redator é arquivado.

**Architecture:** o molde já existe e não se reescreve. `ArchivesChildren`, `LoadsCascadedChildren`, `ArchiveTrailQuery`, `useArchivedPage`, `ArchiveSwitch` e `createCrudResource.archived/restore` estão no branch base e **não mudam**. Este plano replica o padrão nos seis roots (coluna marcadora, hook `deleting`/`restored`, Action de restore transacional, dois endpoints, uma permissão, alternância na tabela) e acrescenta o que só estes roots exigem: dois gates de negócio novos (conflito de UNIQUE no restore de turma, turma em andamento no arquivamento de redator), a cascata que `Turma` e `Quote` nunca tiveram, e duas superfícies de arquivados aninhadas no detalhe do pai.

**Tech Stack:** Laravel 13 / PHP 8.3 · spatie/laravel-data + typescript-transformer · spatie/laravel-permission · owen-it/laravel-auditing · React 19 + TS · TanStack Query · PrimeReact via `shared/ui` · vitest/jsdom · PHPUnit (sqlite `:memory:`)

**Spec:** `docs/superpowers/specs/2026-08-18-arquivados-roots-restantes-design.md`
**Molde:** `docs/superpowers/specs/archive/2026-08-18-arquivados-e-restauracao-design.md` (D1–D11 valem e não se reabrem)
**Context Packet:** `docs/superpowers/context-packets/2026-08-18-arquivados-e-restauracao.md` (herdado)
**Branch:** `feat/arquivados-roots-restantes`, de `feat/arquivados-e-restauracao@6fd0ad8` — **não de `main`**, porque o molde só existe lá.

## Global Constraints

- **Backend roda no container.** `docker compose exec -T app php artisan ...`. O host WSL não tem mbstring.
- **Pint roda no host, de dentro de `backend/`, SEMPRE com argumentos:** `cd backend && ./vendor/bin/pint <arquivos>`. Nunca sem argumento — reformata o repo inteiro.
- **`generated.ts` não se edita à mão** (ADR-04). Corrige-se o DTO e roda `docker compose exec -T app php artisan typescript:transform`. O manifesto do transformer vai no MESMO commit.
- **Features não importam PrimeReact direto** (só via `shared/ui`) **nem outra feature — nem para tipo** (ADR-05, lei §6).
- **`shared/ui` não importa `shared/hooks` nem `shared/api`** em nenhuma direção. O que a moldura precisa chega como prop estrutural ou `ReactNode`.
- **Auditoria só na aplicação** (ADR-08). Soft-delete e restore pelo *builder* não auditam — tudo é instância a instância.
- **`archived_with_parent` fica FORA do `$fillable`** em todos os models. Quem escreve é hook, nunca payload. Cast `boolean`. Sem índice.
- **`ArchivesChildren`, `LoadsCascadedChildren` e `ArchiveTrailQuery` NÃO mudam.** A guarda do filho já arquivado (Q-1 do review anterior) mora no trait e vale de graça para os roots novos. Task que precisar alterar um deles PARA e pergunta.
- **Restore resolve por `onlyTrashed()` à mão, nunca pelo binding padrão** — o binding aplica o global scope de `SoftDeletes` e nunca acharia um arquivado. Nas rotas aninhadas, `$pai->filhos()->onlyTrashed()`, explicitamente.
- **`whereNumber` em toda rota de restore.** Sem ele um id não numérico estoura `TypeError` (500) na assinatura `int $x` antes de qualquer consulta, em vez do 404 (Q-6 do review anterior).
- **Restore devolve 200, não 201.** `Data::toResponse()` força 201 em qualquer POST (`ResponsableData::calculateResponseStatus`) e restaurar não cria recurso. Mesmo precedente de `QuoteController::approve`.
- **Copy nova em 3 locales:** `es-CL`, `pt-BR`, `en`.
- **`backend/config/cors.php` já está commitado neste branch** (`6fd0ad8`) e não pertence a nenhuma task. Não o inclua em `git add`; os commits usam paths exatos.
- **Idioma das mensagens de validação novas: es-CL.** Ver a decisão derivada P2 abaixo.

---

## Decisões derivadas na escrita do plano

A spec fixou D1–D12. Escrever o plano contra o código exigiu oito decisões que ela não tinha como tomar. Estão aqui, declaradas, e não em comentário perdido no meio de uma task.

**P1 — o path de frontend da spec §4 não existe.** A spec escreve `features/commercial/api/useBudgetQuotes.ts`. O arquivo real é **`features/commercial/api/useQuotes.ts`** (`useCreateQuote`, `useUpdateQuote`, `useRemoveQuote`, `useApproveQuote`, `useRejectQuote`). Os hooks de arquivados de cotação entram **nele**, não num arquivo novo — criar `useBudgetQuotes.ts` ao lado partiria a família de hooks da cotação em dois.

**P2 — as mensagens dos gates D1 e D3 saem em es-CL.** A spec §6 registra que este é o primeiro texto de validação novo desde a D-07 (idioma canônico travado em decisão do João) e que o bloco escreve um por necessidade medida. A escolha é **es-CL**, e o motivo é precedente, não gosto: o gate mais recente do projeto, `Turma::assertAcademicallyWritable()` (`Turma.php:141-148`), está em es-CL, é o único do seu caminho e tem dois testes que o afirmam literalmente. Escrever os novos em PT-BR (como `DeleteBudgetAction`) daria três idiomas na mesma tela. **Se o João decidir a D-07 no outro sentido, são duas linhas em dois arquivos** — `ArchiveRedatorAction` e `RestoreTurmaAction`, mais as duas asserções que as citam.

**P3 — `RestoreEnrollmentAction` aplica a RN-15.** A spec não diz. `RemoveEnrollmentAction:12` chama `$enrollment->turma->assertAcademicallyWritable()`, e restaurar matrícula é escrita acadêmica pela mesma definição que remover. Sem o gate, uma turma concluída aceitaria ganhar aluno de volta depois do certificado emitido — a contradição documento↔banco que a RN-15 existe para impedir.

**P4 — nascem dois QueryBuilders e dois métodos de projeção arquivada.** `Budget` e `Redator` **não têm** custom builder (`Budget` monta `with([...])` solto no controller; `Identity/QueryBuilders/` está vazio). A lição Q-8 do review anterior — a lista de Arquivados tem de mostrar o registro **como ele estava no instante do arquivamento**, senão o operador vê `0 cotações` e não reconhece o que vai restaurar — exige `asOfArchiving`, que é método do trait `LoadsCascadedChildren` e mora em builder. Então: **`BudgetQueryBuilder` e `RedatorQueryBuilder` nascem**, e `QuoteQueryBuilder` e `TurmaQueryBuilder` ganham `withArchivedListingData()`. `EnrollmentQueryBuilder` **não ganha**: matrícula é folha, não tem filho cascateado, e `withListingData()` já serve a lista de arquivados.

**P5 — `Redator::turmas()` nasce.** O gate D3 pergunta se o redator tem turma em andamento, e hoje a relação só existe do lado da turma (`Turma::redatores()`). O inverso é `belongsToMany(Turma::class, 'turma_redator')`.

**P7 — Identity e a turma ganham o botão de ARQUIVAR junto com a visão de Arquivados.** Medido: **três telas expõem a rota de arquivar sem ter botão nenhum**. `DELETE /api/redatores/{redator}`, `DELETE /api/users/{user}` e `DELETE /api/turmas/{turma}` existem no backend, mas não há `useRemove` nem botão em `RedatoresTable`, `Admin/UsersTable` ou `TurmasTable` — `grep` por `useRemove|pi-trash|confirmDelete` em `features/identity/` só devolve foto de perfil e documento de redator, e `api/useTurmas.ts` não tem mutação de DELETE de turma. (A matrícula é a exceção: `useRemoveEnrollment` já existe.)

Uma visão de Arquivados sozinha nasceria **impossível de exercitar pela interface**: nada chega lá, e o DoD da lei §8 — critério de aceite PROVADO no navegador — não teria como ser cumprido.

Então as Tasks 10 e 14 replicam **as duas metades** do molde `ClientRowActions`/`CommercialPage`: o botão `pi pi-inbox` com `ConfirmDialog` (guardado por `identity.user.delete` no redator, `identity.access.manage` no staff e `operation.turma.delete` na turma) e o botão Restaurar na visão de arquivados. É replicação do padrão que `Client` e `Course` já provaram, não desenho novo — mas **é escopo que a spec não pediu explicitamente**, e por isso está declarado aqui e repetido no `## Handoff de execução`. Se o João preferir o escopo estrito, as Tasks 10 e 14 perdem o botão de arquivar e o DoD daquelas fases passa a ser provado por `curl`/tinker em vez de navegador.

**P8 — `lockRow` entra em `Redator` e `Turma`, e não entra em `Budget`, `Quote`, `User` e `Enrollment`.** A spec D9 manda transação em toda cascata e em todo restore, mas não fala de mutex. O critério aplicado é **simetria com o caminho de arquivar que já existe**, não gosto por consistência:

| Root | Arquivar hoje | Restore neste plano |
|---|---|---|
| `Redator` | `delete()` cru, sem transação nenhuma | nasce transação **+ `lockRow`** (Task 7), e o restore usa o mesmo (Task 8) |
| `Turma` | `delete()` cru, sem transação nenhuma | nasce transação **+ `lockRow`** (Task 11), e o restore usa o mesmo (Task 12) |
| `Budget` | `DeleteBudgetAction` já tem `DB::transaction`, **sem lock** | transação, **sem lock** (Task 3) |
| `Quote` | ganha `DB::transaction`, sem lock (Task 2) | transação, **sem lock** (Task 4) |
| `User`, `Enrollment` | folhas | transação, sem lock (Tasks 9 e 13) |

Onde a cascata nasce inteira neste bloco (`Redator`, `Turma`), o par transação+mutex nasce junto, no molde do `Client`. Onde o caminho de arquivar já existia com transação e sem lock (`Budget`), acrescentar mutex só no restore criaria uma assimetria pior que a que resolve — a janela de check-then-act continuaria aberta do lado de arquivar, e o plano diria por comentário que está fechada. Fechar as duas pontas do `Budget` é trabalho legítimo, mas é de outro bloco: nenhuma linha da spec pede.

**P6 — a lista de turmas arquivadas conta as matrículas como elas estavam.** `TurmaData::fromModel` lê `enrolled_count: $turma->enrollments_count` **sem fallback** (D-B3: sem a carga o construtor recusa `null` em vez de pagar uma query por turma em silêncio), e `withCount('enrollments')` conta só ativas — depois da cascata D2, toda turma arquivada apareceria com `0 alunos`. É exatamente o Q-8, aplicado a um `withCount` em vez de a um eager load.

---

## File Structure

**Backend — transversal**

| Arquivo | Responsabilidade |
|---|---|
| `database/migrations/2026_08_18_000002_add_archived_with_parent_to_more_tables.php` | coluna boolean em `quotes`, `files`, `enrollments` |
| `app/Domains/Identity/Support/PermissionCatalog.php` | 5 permissões novas (D7) |
| `database/seeders/RolePermissionSeeder.php` | nada a mudar — consome `array_keys` do catálogo |

**Backend — fase 1 (Commercial)**

| Arquivo | Responsabilidade |
|---|---|
| `app/Domains/Commercial/Models/Budget.php` | `ArchivesChildren`, cascata `quotes`+`files`, `restored`, builder |
| `app/Domains/Commercial/Models/Quote.php` | `ArchivesChildren`, cascata `files` (hook novo), cast |
| `app/Domains/Commercial/QueryBuilders/BudgetQueryBuilder.php` | projeção ativa e arquivada do orçamento (P4) |
| `app/Domains/Commercial/QueryBuilders/QuoteQueryBuilder.php` | ganha `withArchivedListingData()` |
| `app/Domains/Commercial/Actions/DeleteQuoteAction.php` | ganha `DB::transaction` (D9) |
| `app/Domains/Commercial/Actions/RestoreBudgetAction.php` | restore transacional do orçamento |
| `app/Domains/Commercial/Actions/RestoreQuoteAction.php` | restore transacional da cotação |
| `app/Domains/Commercial/Data/ArchivedBudgetData.php` | DTO por composição |
| `app/Domains/Commercial/Data/ArchivedQuoteData.php` | DTO por composição |
| `app/Domains/Commercial/Http/Controllers/BudgetController.php` | `archived` + `restore` + middleware |
| `app/Domains/Commercial/Http/Controllers/QuoteController.php` | `archived` (por orçamento) + `restore` + middleware |
| `app/Domains/Commercial/routes.php` | 4 rotas |

**Backend — fase 2 (Identity)**

| Arquivo | Responsabilidade |
|---|---|
| `app/Domains/Identity/Models/Redator.php` | `ArchivesChildren`, marca em `documents`+`user`, `restored`, `turmas()`, builder |
| `app/Domains/Identity/Models/User.php` | nada — já tem o cast, do molde |
| `app/Domains/Identity/QueryBuilders/RedatorQueryBuilder.php` | projeção ativa e arquivada do redator (P4) |
| `app/Domains/Operation/Models/Turma.php` | `redatores()` → `withTrashed()` (D3) |
| `app/Domains/Identity/Actions/ArchiveRedatorAction.php` | gate de turma em andamento + transação (D3) |
| `app/Domains/Identity/Actions/RestoreRedatorAction.php` | restore transacional |
| `app/Domains/Identity/Actions/RestoreStaffUserAction.php` | restore transacional do staff |
| `app/Domains/Identity/Data/ArchivedRedatorData.php` · `ArchivedUserData.php` | DTOs por composição |
| `app/Domains/Identity/Http/Controllers/RedatorController.php` | `archived` + `restore` + `destroy` pela Action |
| `app/Domains/Identity/Http/Controllers/UserController.php` | `archived` filtrando `type=admin` (D10) + `restore` |
| `app/Domains/Identity/routes.php` | 4 rotas |

**Backend — fase 3 (Operation)**

| Arquivo | Responsabilidade |
|---|---|
| `app/Domains/Operation/Models/Turma.php` | `ArchivesChildren`, cascata `enrollments`+`files` (D2) |
| `app/Domains/Operation/Models/Enrollment.php` | cast |
| `app/Domains/Operation/QueryBuilders/TurmaQueryBuilder.php` | `withArchivedListingData()` com o count as-of (P6) |
| `app/Domains/Operation/Actions/DeleteTurmaAction.php` | ganha `DB::transaction` (D9) |
| `app/Domains/Operation/Actions/RestoreTurmaAction.php` | gate de conflito de UNIQUE (D1) |
| `app/Domains/Operation/Actions/RestoreEnrollmentAction.php` | restore com RN-15 (P3) |
| `app/Domains/Operation/Data/ArchivedTurmaData.php` · `ArchivedEnrollmentData.php` | DTOs por composição |
| `app/Domains/Operation/Http/Controllers/TurmaController.php` | `archived` + `restore` + middleware |
| `app/Domains/Operation/Http/Controllers/EnrollmentController.php` | `archived` (por turma) + `restore` + middleware |
| `app/Domains/Operation/routes.php` | 4 rotas |

**Frontend**

| Arquivo | Responsabilidade |
|---|---|
| `src/shared/api/{budgetsApi,redatoresApi,usersApi}.ts` | 2º genérico `ArchivedXData` (D12) |
| `src/features/commercial/hooks/useBudgetsArchived.ts` | alias de página do orçamento (toast + restore) |
| `src/features/commercial/api/useQuotes.ts` | `useQuotesArchived(budgetId, enabled)` + `useRestoreQuote()` (P1) |
| `src/features/commercial/hooks/useBudgetQuotesArchived.ts` | monta o `ArchivableResource` da cotação à mão |
| `src/features/commercial/components/Budget/BudgetsTable.tsx` · `BudgetRowActions.tsx` | switch, colunas do rastreio, ações de linha |
| `src/features/commercial/components/Budget/QuotesList.tsx` · `ArchivedQuotesList.tsx` | switch local e lista das arquivadas (D5) |
| `src/features/commercial/components/Budget/BudgetDetailPage.tsx` · `CommercialPage.tsx` | fiação do modo |
| `src/features/identity/hooks/useRedatoresArchived.ts` · `useUsersArchived.ts` | aliases de página (arquivar + restaurar, P7) |
| `src/features/identity/components/Redator/RedatoresTable.tsx` · `RedatorRowActions.tsx` | switch, colunas, ações |
| `src/features/identity/components/Admin/UsersTable.tsx` · `UserRowActions.tsx` | switch, colunas, ações (guard único, D7) |
| `src/features/identity/components/PeoplePage.tsx` · `AdministracionPage.tsx` | fiação do modo + ConfirmDialog |
| `src/features/operation/api/useTurmas.ts` | `useTurmasArchivedList` + `useArchiveTurma` + `useRestoreTurma` (artesanal, D12/P7) |
| `src/features/operation/hooks/useTurmasArchived.ts` | monta o `ArchivableResource` da turma à mão |
| `src/features/operation/api/useEnrollments.ts` | `useEnrollmentsArchivedList(turmaId, enabled)` + `useRestoreEnrollment(turmaId)` |
| `src/features/operation/hooks/useEnrollmentsArchived.ts` | idem, com o id do pai no closure |
| `src/features/operation/components/Turma/TurmasTable.tsx` · `TurmaRowActions.tsx` | switch, colunas, ações |
| `src/features/operation/components/Enrollment/EnrollmentSection.tsx` · `ArchivedEnrollmentsList.tsx` | switch local e lista das arquivadas (D5) |
| `src/features/operation/components/OperationPage.tsx` | fiação do modo + ConfirmDialog |
| `src/shared/config/locales/{es-CL,pt-BR,en}.json` | **só a D11** — os dois `confirmDeleteBody`. Nenhuma chave nova: `archive.*` já cobre tudo |
| `src/shared/types/generated.ts` | 6 DTOs novos, gerados (ADR-04), commit próprio na Task 15 |

---

### Task 1: Coluna marcadora nas três tabelas novas e as cinco permissões

**Files:**
- Create: `backend/database/migrations/2026_08_18_000002_add_archived_with_parent_to_more_tables.php`
- Modify: `backend/app/Domains/Commercial/Models/Quote.php` (só `$casts`)
- Modify: `backend/app/Shared/Files/Models/File.php` (só `$casts`)
- Modify: `backend/app/Domains/Operation/Models/Enrollment.php` (só `$casts`)
- Modify: `backend/app/Domains/Identity/Support/PermissionCatalog.php:36-84`
- Test: `backend/tests/Feature/Identity/RestorePermissionTest.php` (estende o existente)

**Interfaces:**
- Consumes: `archived_with_parent` já existe em `client_addresses`, `client_contacts`, `users`, `course_modules`, `course_certificate_templates` (migration `2026_08_18_000001`).
- Produces: a mesma coluna (`boolean`, default `false`, sem índice, fora do `$fillable`) em `quotes`, `files`, `enrollments`. E cinco permissões no catálogo: `commercial.budget.restore`, `commercial.quote.restore`, `identity.user.restore`, `operation.turma.restore`, `operation.enrollment.restore` — todas **fora** de `SEGREGATED`, concedidas a `admin` e `superadmin` pelo seeder que já existe.

- [ ] **Step 1: Write the failing test**

Acrescente ao arquivo existente `backend/tests/Feature/Identity/RestorePermissionTest.php`, dentro da classe, e troque as asserções dos quatro testes já lá por listas — as duas do molde continuam valendo:

```php
    /** As cinco que este bloco cria. As duas do molde ficam nos testes acima. */
    private const NOVAS = [
        'commercial.budget.restore',
        'commercial.quote.restore',
        'identity.user.restore',
        'operation.turma.restore',
        'operation.enrollment.restore',
    ];

    public function test_catalogo_expoe_as_cinco_permissoes_novas_de_restore(): void
    {
        $nomes = array_keys(PermissionCatalog::descriptions());

        foreach (self::NOVAS as $permissao) {
            $this->assertContains($permissao, $nomes, "catálogo sem $permissao");
        }
    }

    public function test_admin_e_superadmin_recebem_as_cinco(): void
    {
        $this->seed(RolePermissionSeeder::class);

        foreach (['admin', 'superadmin'] as $nome) {
            $role = Role::findByName($nome, 'web');
            foreach (self::NOVAS as $permissao) {
                $this->assertTrue($role->hasPermissionTo($permissao), "$nome sem $permissao");
            }
        }
    }

    public function test_nenhuma_das_cinco_e_segregada(): void
    {
        // Segregar prenderia o restore ao superadmin. A decisão foi o contrário
        // (D7): admin restaura. `identity.access.manage` continua segregada e é
        // ela quem guarda o restore do USUÁRIO staff — sem permissão nova.
        foreach (self::NOVAS as $permissao) {
            $this->assertNotContains($permissao, PermissionCatalog::SEGREGATED);
        }
    }

    public function test_nao_existe_permissao_de_restore_de_usuario_staff(): void
    {
        // D7: `identity.user.restore` cobre o REDATOR. O staff continua sob
        // `identity.access.manage`, senão restaurar ficaria mais frouxo que
        // arquivar — alguém devolveria um usuário que nunca poderia ter
        // arquivado.
        $this->assertNotContains('identity.access.restore', array_keys(PermissionCatalog::descriptions()));
    }

    public function test_redator_nao_recebe_nenhuma_das_cinco(): void
    {
        $this->seed(RolePermissionSeeder::class);

        $role = Role::findByName('redator', 'web');
        foreach (self::NOVAS as $permissao) {
            $this->assertFalse($role->hasPermissionTo($permissao), "redator com $permissao");
        }
    }
```

E o teste de schema, arquivo novo `backend/tests/Feature/Cadastros/ArchivedWithParentColumnsTest.php`:

```php
<?php

namespace Tests\Feature\Cadastros;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

/**
 * A coluna marcadora dá IDENTIDADE à cascata (spec D2 do molde). As cinco
 * primeiras tabelas vieram na migration de 2026-08-18; estas três são as que os
 * roots deste bloco cascateiam. `files` é POLIMÓRFICA: a coluna vale de uma vez
 * para budget, quote, redator e turma.
 */
class ArchivedWithParentColumnsTest extends TestCase
{
    use RefreshDatabase;

    public function test_as_tres_tabelas_novas_tem_a_coluna(): void
    {
        foreach (['quotes', 'files', 'enrollments'] as $tabela) {
            $this->assertTrue(
                Schema::hasColumn($tabela, 'archived_with_parent'),
                "$tabela sem archived_with_parent",
            );
        }
    }

    public function test_a_coluna_nasce_falsa_e_nao_e_massa_atribuivel(): void
    {
        // Quem escreve a marca é hook, nunca payload: fora do `$fillable` em
        // todos os models (constraint global).
        $quote = new \App\Domains\Commercial\Models\Quote;
        $file = new \App\Shared\Files\Models\File;
        $enrollment = new \App\Domains\Operation\Models\Enrollment;

        foreach ([$quote, $file, $enrollment] as $model) {
            $this->assertNotContains('archived_with_parent', $model->getFillable(), $model::class);
        }
    }
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `docker compose exec -T app php artisan test --filter=ArchivedWithParentColumnsTest`
Expected: FAIL — `quotes sem archived_with_parent`.

Run: `docker compose exec -T app php artisan test --filter=RestorePermissionTest`
Expected: FAIL — `catálogo sem commercial.budget.restore`.

- [ ] **Step 3: Write the migration**

`backend/database/migrations/2026_08_18_000002_add_archived_with_parent_to_more_tables.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Segunda leva da coluna de identidade da cascata (spec D8). Mesmas regras da
 * primeira (`2026_08_18_000001`), e pelos mesmos motivos:
 *
 * SEM ÍNDICE — a coluna só é lida dentro de relação já escopada por FK
 * (`$budget->quotes()`, `$turma->enrollments()`, `$x->files()`), e o índice da
 * FK já faz o trabalho.
 *
 * SEM BACKFILL, e é escolha, não esquecimento: casar por `deleted_at` é o que a
 * spec D2 recusou (`timestamp` de precisão 0 não é identidade), e marcar todo
 * filho arquivado ressuscitaria em silêncio o que alguém arquivou de propósito.
 * O buraco alcança só bancos de desenvolvimento já semeados; o gatilho é o
 * primeiro deploy e vive na D-34.
 *
 * `files` é POLIMÓRFICA: uma coluna serve as cascatas de budget, quote, redator
 * e turma de uma vez. Um erro na marca alcança quatro agregados — é o risco
 * declarado na §6 da spec.
 */
return new class extends Migration
{
    private const TABLES = ['quotes', 'files', 'enrollments'];

    public function up(): void
    {
        foreach (self::TABLES as $table) {
            Schema::table($table, function (Blueprint $t) {
                $t->boolean('archived_with_parent')->default(false);
            });
        }
    }

    public function down(): void
    {
        foreach (self::TABLES as $table) {
            Schema::table($table, function (Blueprint $t) {
                $t->dropColumn('archived_with_parent');
            });
        }
    }
};
```

- [ ] **Step 4: Add the three casts**

Em `backend/app/Domains/Commercial/Models/Quote.php`, dentro de `$casts`, acrescente a última linha:

```php
    protected $casts = [
        'status' => QuoteStatus::class,
        'approved_at' => 'datetime',
        'planned_start_date' => 'date',
        'planned_end_date' => 'date',
        'value_uf' => 'decimal:4',
        // Marca da cascata (spec D8). FORA do `$fillable`: quem escreve é hook.
        'archived_with_parent' => 'boolean',
    ];
```

Em `backend/app/Shared/Files/Models/File.php`:

```php
    protected $casts = [
        'valid_until' => 'date',
        'size'        => 'integer',
        // Marca da cascata (spec D8). Polimórfica: serve budget, quote,
        // redator e turma. FORA do `$fillable`.
        'archived_with_parent' => 'boolean',
    ];
```

Em `backend/app/Domains/Operation/Models/Enrollment.php`:

```php
    protected $casts = [
        'grades' => 'array',
        'attendance_pct' => 'decimal:2',
        'approval_status' => EnrollmentApprovalStatus::class,
        // Marca da cascata (spec D8). FORA do `$fillable`.
        'archived_with_parent' => 'boolean',
    ];
```

- [ ] **Step 5: Add the five permissions**

Em `backend/app/Domains/Identity/Support/PermissionCatalog.php`, dentro de `descriptions()`, acrescente **uma linha logo abaixo da permissão de `delete` correspondente** — o catálogo é lido por humanos e a ordem agrupa por recurso:

```php
            // ---- Identity ----
            'identity.user.delete' => 'Remover (soft delete) usuários',
            // Cobre o REDATOR, não o staff (D7): o `destroy` do RedatorController
            // é guardado por `identity.user.delete`, e o restore espelha o guard
            // do arquivar. O staff continua sob `identity.access.manage`, que é
            // SEGREGADA — dar-lhe uma permissão normal deixaria restaurar mais
            // frouxo que arquivar.
            'identity.user.restore' => 'Restaurar redatores arquivados',
```

```php
            'commercial.budget.delete' => 'Remover orçamentos',
            'commercial.budget.restore' => 'Restaurar orçamentos arquivados',
```

```php
            'commercial.quote.delete' => 'Remover cotações',
            'commercial.quote.restore' => 'Restaurar cotações arquivadas',
```

```php
            'operation.turma.delete' => 'Remover turmas',
            'operation.turma.restore' => 'Restaurar turmas arquivadas',
            'operation.enrollment.manage' => 'Matricular alunos / importar planilha (Fluxo 3)',
            'operation.enrollment.restore' => 'Restaurar matrículas arquivadas',
```

`SEGREGATED` **não muda** e `RolePermissionSeeder` **não muda**: ele semeia `array_keys($permissions)` e o `adminPermissions()` subtrai uma lista fixa que não contém nenhuma das cinco.

- [ ] **Step 6: Run the migration and the tests**

Run: `docker compose exec -T app php artisan test --filter='ArchivedWithParentColumnsTest|RestorePermissionTest'`
Expected: PASS (todos).

- [ ] **Step 7: Format and commit**

```bash
cd backend && ./vendor/bin/pint \
  database/migrations/2026_08_18_000002_add_archived_with_parent_to_more_tables.php \
  app/Domains/Commercial/Models/Quote.php \
  app/Shared/Files/Models/File.php \
  app/Domains/Operation/Models/Enrollment.php \
  app/Domains/Identity/Support/PermissionCatalog.php \
  tests/Feature/Cadastros/ArchivedWithParentColumnsTest.php \
  tests/Feature/Identity/RestorePermissionTest.php
```

```bash
git add backend/database/migrations/2026_08_18_000002_add_archived_with_parent_to_more_tables.php \
        backend/app/Domains/Commercial/Models/Quote.php \
        backend/app/Shared/Files/Models/File.php \
        backend/app/Domains/Operation/Models/Enrollment.php \
        backend/app/Domains/Identity/Support/PermissionCatalog.php \
        backend/tests/Feature/Cadastros/ArchivedWithParentColumnsTest.php \
        backend/tests/Feature/Identity/RestorePermissionTest.php
git commit -m "feat(archive): coluna marcadora em quotes/files/enrollments e as 5 permissoes de restore"
```

---

### Task 2: A cascata de orçamento e cotação, e a transação que ela obriga

**Files:**
- Modify: `backend/app/Domains/Commercial/Models/Budget.php:36-43` (o `booted`) e o bloco de `use`
- Modify: `backend/app/Domains/Commercial/Models/Quote.php` (ganha `booted` e `ArchivesChildren`)
- Modify: `backend/app/Domains/Commercial/Actions/DeleteQuoteAction.php`
- Test: `backend/tests/Feature/Comercial/BudgetArchiveCascadeTest.php`

**Interfaces:**
- Consumes: `archived_with_parent` (Task 1); `ArchivesChildren::markAndDelete`/`restoreAndUnmark` (já existem, não mudam).
- Produces: arquivar `Budget` arquiva suas cotações **e os anexos delas** com a marca; restaurar devolve os três níveis. Arquivar `Quote` sozinha arquiva os anexos dela. Filho arquivado antes do pai fica onde está.

- [ ] **Step 1: Write the failing test**

`backend/tests/Feature/Comercial/BudgetArchiveCascadeTest.php`:

```php
<?php

namespace Tests\Feature\Comercial;

use App\Domains\Commercial\Actions\DeleteBudgetAction;
use App\Domains\Commercial\Actions\DeleteQuoteAction;
use App\Domains\Commercial\Models\Budget;
use App\Domains\Commercial\Models\Quote;
use App\Shared\Files\Models\File;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use RuntimeException;
use Tests\Support\CreatesDomainRecords;
use Tests\TestCase;

/**
 * A cadeia de TRÊS níveis (spec §5.5): orçamento → cotações → anexos das
 * cotações. Ela encadeia sozinha — cada `$quote->delete()` do hook do orçamento
 * dispara o hook da cotação, que arquiva os anexos dela.
 */
class BudgetArchiveCascadeTest extends TestCase
{
    use CreatesDomainRecords;
    use RefreshDatabase;

    private function makeBudget(): Budget
    {
        $client = $this->makeClientWithUser([], ['rut' => '21.222.333-4']);

        return Budget::create(['client_id' => $client->id, 'code' => 'Scap 1']);
    }

    private function makeQuote(Budget $budget, int $seq = 1): Quote
    {
        return Quote::create([
            'budget_id' => $budget->id,
            'course_id' => $this->makeCourse(['name' => "C{$seq}"])->id,
            'seq_in_budget' => $seq,
            'student_count' => 5,
            'value_uf' => 10,
            'status' => 'pending',
        ]);
    }

    private function makeFile(Quote|Budget $owner, string $name): File
    {
        return $owner->files()->create([
            'type' => 'invoice',
            'path' => "docs/{$name}.pdf",
            'original_name' => "{$name}.pdf",
            'mime' => 'application/pdf',
            'size' => 1024,
        ]);
    }

    public function test_arquivar_orcamento_desce_os_tres_niveis_com_a_marca(): void
    {
        $budget = $this->makeBudget();
        $quote = $this->makeQuote($budget);
        $anexoDaCotacao = $this->makeFile($quote, 'cotacao');
        $anexoDoOrcamento = $this->makeFile($budget, 'orcamento');

        app(DeleteBudgetAction::class)->execute($budget);

        $this->assertSoftDeleted('budgets', ['id' => $budget->id]);
        $this->assertDatabaseHas('quotes', ['id' => $quote->id, 'archived_with_parent' => true]);
        $this->assertNotNull(Quote::withTrashed()->find($quote->id)->deleted_at);
        $this->assertDatabaseHas('files', ['id' => $anexoDaCotacao->id, 'archived_with_parent' => true]);
        $this->assertDatabaseHas('files', ['id' => $anexoDoOrcamento->id, 'archived_with_parent' => true]);
    }

    public function test_restaurar_orcamento_devolve_os_tres_niveis(): void
    {
        $budget = $this->makeBudget();
        $quote = $this->makeQuote($budget);
        $anexo = $this->makeFile($quote, 'cotacao');

        app(DeleteBudgetAction::class)->execute($budget);
        $budget->restore();

        $this->assertDatabaseHas('quotes', [
            'id' => $quote->id, 'deleted_at' => null, 'archived_with_parent' => false,
        ]);
        $this->assertDatabaseHas('files', [
            'id' => $anexo->id, 'deleted_at' => null, 'archived_with_parent' => false,
        ]);
    }

    public function test_anexo_arquivado_antes_do_pai_nao_volta(): void
    {
        // A regra que a marca existe para sustentar (spec D2 do molde): quem
        // foi arquivado por vontade própria fica onde está.
        $budget = $this->makeBudget();
        $quote = $this->makeQuote($budget);
        $antigo = $this->makeFile($quote, 'antigo');
        $vivo = $this->makeFile($quote, 'vivo');

        $antigo->delete();
        app(DeleteBudgetAction::class)->execute($budget);
        $budget->restore();

        $this->assertDatabaseHas('files', ['id' => $vivo->id, 'deleted_at' => null]);
        $this->assertNotNull(File::withTrashed()->find($antigo->id)->deleted_at, 'o anexo antigo voltou');
        $this->assertDatabaseHas('files', ['id' => $antigo->id, 'archived_with_parent' => false]);
    }

    public function test_arquivar_cotacao_sozinha_leva_os_anexos_dela(): void
    {
        $budget = $this->makeBudget();
        $quote = $this->makeQuote($budget);
        $anexo = $this->makeFile($quote, 'cotacao');

        app(DeleteQuoteAction::class)->execute($quote);

        $this->assertSoftDeleted('quotes', ['id' => $quote->id]);
        $this->assertDatabaseHas('files', ['id' => $anexo->id, 'archived_with_parent' => true]);
        // A cotação foi arquivada por vontade própria: ela NÃO ganha a marca.
        $this->assertDatabaseHas('quotes', ['id' => $quote->id, 'archived_with_parent' => false]);
    }

    public function test_cascata_da_cotacao_roda_dentro_de_uma_transacao(): void
    {
        // D9: `DeleteQuoteAction` era escrita única e não tinha transação. A
        // cascata nova muda isso — enumerar-e-apagar sem transação é
        // check-then-act (nota de `Client::booted()`).
        $budget = $this->makeBudget();
        $quote = $this->makeQuote($budget);
        $this->makeFile($quote, 'cotacao');

        $niveis = [];
        Event::listen('eloquent.deleting: '.File::class, function () use (&$niveis): void {
            $niveis[] = DB::transactionLevel();
        });

        app(DeleteQuoteAction::class)->execute($quote);

        $this->assertNotEmpty($niveis, 'a cascata não apagou o anexo');
        // 2, não 1: o `RefreshDatabase` já mantém uma transação aberta durante o
        // teste inteiro. Asserir `> 0` mediria o RefreshDatabase, não a Action.
        $this->assertSame(2, $niveis[0], 'a cascata rodou fora da transação da Action');
    }

    public function test_falha_no_meio_da_cascata_desfaz_tudo(): void
    {
        // Sem transação, cada `delete()` do hook autocommita e a falha deixa o
        // anexo arquivado sob uma cotação que continua ativa.
        $budget = $this->makeBudget();
        $quote = $this->makeQuote($budget);
        $anexo = $this->makeFile($quote, 'cotacao');

        Event::listen('eloquent.deleting: '.File::class, function () {
            throw new RuntimeException('falha no meio da cascata');
        });

        try {
            app(DeleteQuoteAction::class)->execute($quote);
            $this->fail('a cascata deveria ter estourado');
        } catch (RuntimeException) {
            // esperado
        }

        $this->assertNull($quote->fresh()->deleted_at, 'a cotação ficou arquivada apesar da falha');
        $this->assertNull($anexo->fresh()->deleted_at);
    }
}
```

- [ ] **Step 2: Run to verify it fails**

Run: `docker compose exec -T app php artisan test --filter=BudgetArchiveCascadeTest`
Expected: FAIL — `Failed asserting that a row in table 'files' matches the attributes { archived_with_parent: 1 }`, porque `Quote` não tem hook e `Budget` não marca.

- [ ] **Step 3: Budget marca e restaura**

Em `backend/app/Domains/Commercial/Models/Budget.php`, acrescente o `use` do trait no topo e troque o `booted()` inteiro:

```php
use App\Shared\Concerns\ArchivesChildren;
```

```php
class Budget extends Model implements Auditable
{
    use ArchivesChildren, AuditableTrait, SoftDeletes;
```

```php
    protected static function booted(): void
    {
        static::deleting(function (Budget $budget) {
            if (! $budget->isForceDeleting()) {
                // Instância a instância: soft-delete pelo builder não audita (ADR-08).
                //
                // `markAndDelete` (trait `ArchivesChildren`) grava a marca antes
                // do delete e IGNORA filho já arquivado — sem a guarda, a
                // cotação arquivada de propósito voltaria junto no restore e
                // ainda teria o `deleted_at` reescrito.
                //
                // A cadeia desce sozinha: cada `$quote->delete()` dispara o
                // `deleting` da cotação, que arquiva os anexos DELA. Este hook
                // não enxerga o terceiro nível e não precisa.
                $budget->quotes()->get()->each(fn (Quote $q) => self::markAndDelete($q));
                $budget->files()->get()->each(fn (File $f) => self::markAndDelete($f));
            }
        });

        static::restored(function (Budget $budget) {
            // `restored`, não `restoring`: com `restoring` os filhos voltariam a
            // ativos enquanto o PAI ainda está arquivado. O par correto é
            // `deleting` (antes) / `restored` (depois).
            //
            // `onlyTrashed()` + a marca: só volta quem ESTA cascata arquivou.
            $budget->quotes()->onlyTrashed()->where('archived_with_parent', true)->get()
                ->each(fn (Quote $q) => self::restoreAndUnmark($q));
            $budget->files()->onlyTrashed()->where('archived_with_parent', true)->get()
                ->each(fn (File $f) => self::restoreAndUnmark($f));
        });
    }
```

- [ ] **Step 4: Quote ganha o hook que nunca teve**

Em `backend/app/Domains/Commercial/Models/Quote.php`, acrescente o `use` e o `booted()` logo após os `$casts`:

```php
use App\Shared\Concerns\ArchivesChildren;
```

```php
class Quote extends Model implements Auditable
{
    use ArchivesChildren, AuditableTrait, SoftDeletes;
```

```php
    /**
     * Hook NOVO (spec D9): a cotação não tinha cascata nenhuma, então arquivá-la
     * deixava os anexos ATIVOS sob um pai que ninguém mais alcança — o mesmo
     * modo de falha que a `DeleteClientAction` existe para impedir.
     *
     * Roda nas duas entradas: `DeleteQuoteAction` (arquivar a cotação sozinha) e
     * a cascata do orçamento, que chama `$quote->delete()`.
     */
    protected static function booted(): void
    {
        static::deleting(function (Quote $quote) {
            if (! $quote->isForceDeleting()) {
                $quote->files()->get()->each(fn (File $f) => self::markAndDelete($f));
            }
        });

        static::restored(function (Quote $quote) {
            $quote->files()->onlyTrashed()->where('archived_with_parent', true)->get()
                ->each(fn (File $f) => self::restoreAndUnmark($f));
        });
    }
```

- [ ] **Step 5: DeleteQuoteAction ganha transação**

`backend/app/Domains/Commercial/Actions/DeleteQuoteAction.php` inteira:

```php
<?php

namespace App\Domains\Commercial\Actions;

use App\Domains\Commercial\Enums\QuoteStatus;
use App\Domains\Commercial\Models\Quote;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Exclui (soft-delete) uma cotação e cascateia para os anexos (hook do model,
 * auditado instância a instância — ADR-08). Cotação aprovada é imutável
 * (excluir desincronizaria a futura turma) → 422; recuse antes.
 *
 * A TRANSAÇÃO chegou com a cascata (spec D9): enquanto isto era escrita única
 * ela não fazia falta, mas enumerar-e-apagar sem transação é check-then-act — a
 * falha no meio deixa anexo arquivado sob cotação ativa. Em sqlite o lock é
 * no-op, então errar aqui só apareceria em MySQL.
 */
class DeleteQuoteAction
{
    public function execute(Quote $quote): void
    {
        if ($quote->status === QuoteStatus::Approved) {
            throw ValidationException::withMessages([
                'status' => 'Cotação aprovada não pode ser excluída. Recuse-a antes.',
            ]);
        }

        DB::transaction(fn () => $quote->delete());
    }
}
```

- [ ] **Step 6: Run to verify it passes**

Run: `docker compose exec -T app php artisan test --filter=BudgetArchiveCascadeTest`
Expected: PASS (6 testes).

Run: `docker compose exec -T app php artisan test`
Expected: nenhuma regressão. A suíte inteira, porque a cascata nova alcança todo teste que arquiva orçamento ou cotação.

- [ ] **Step 7: Format and commit**

```bash
cd backend && ./vendor/bin/pint \
  app/Domains/Commercial/Models/Budget.php \
  app/Domains/Commercial/Models/Quote.php \
  app/Domains/Commercial/Actions/DeleteQuoteAction.php \
  tests/Feature/Comercial/BudgetArchiveCascadeTest.php
```

```bash
git add backend/app/Domains/Commercial/Models/Budget.php \
        backend/app/Domains/Commercial/Models/Quote.php \
        backend/app/Domains/Commercial/Actions/DeleteQuoteAction.php \
        backend/tests/Feature/Comercial/BudgetArchiveCascadeTest.php
git commit -m "feat(archive): cascata marcada de orcamento e cotacao, com a transacao que ela obriga"
```

---

### Task 3: Arquivados e restauração do orçamento (endpoints)

**Files:**
- Create: `backend/app/Domains/Commercial/QueryBuilders/BudgetQueryBuilder.php`
- Create: `backend/app/Domains/Commercial/Actions/RestoreBudgetAction.php`
- Create: `backend/app/Domains/Commercial/Data/ArchivedBudgetData.php`
- Modify: `backend/app/Domains/Commercial/Models/Budget.php` (ganha `loadListingData` e `newEloquentBuilder`)
- Modify: `backend/app/Domains/Commercial/Http/Controllers/BudgetController.php`
- Modify: `backend/app/Domains/Commercial/routes.php:22`
- Test: `backend/tests/Feature/Comercial/BudgetArchiveEndpointTest.php`

**Interfaces:**
- Consumes: `ArchiveTrailQuery::archivedBy(string $auditableType, array $ids): array<int, string|null>`; `LoadsCascadedChildren::asOfArchiving(array $relations): array<string, Closure>`; a cascata da Task 2.
- Produces:
  - `BudgetQueryBuilder::withListingData(): static` e `::withArchivedListingData(): static`
  - `Budget::loadListingData(): static`
  - `RestoreBudgetAction::execute(Budget $budget): Budget`
  - `ArchivedBudgetData(BudgetData $budget, string $archived_at, ?string $archived_by)` → TS `ArchivedBudgetData`
  - `GET /api/budgets/archived` (`commercial.budget.view`) e `POST /api/budgets/{budget}/restore` (`commercial.budget.restore`)

- [ ] **Step 1: Write the failing test**

`backend/tests/Feature/Comercial/BudgetArchiveEndpointTest.php`:

```php
<?php

namespace Tests\Feature\Comercial;

use App\Domains\Commercial\Models\Budget;
use App\Domains\Commercial\Models\Quote;
use App\Domains\Identity\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\CreatesDomainRecords;
use Tests\TestCase;

class BudgetArchiveEndpointTest extends TestCase
{
    use CreatesDomainRecords;
    use RefreshDatabase;

    private function makeBudget(string $code = 'Scap 1', string $rut = '21.222.333-4'): Budget
    {
        $client = $this->makeClientWithUser([], ['rut' => $rut]);

        return Budget::create(['client_id' => $client->id, 'code' => $code]);
    }

    private function makeQuote(Budget $budget, int $seq = 1): Quote
    {
        return Quote::create([
            'budget_id' => $budget->id,
            'course_id' => $this->makeCourse(['name' => "C{$seq}"])->id,
            'seq_in_budget' => $seq,
            'student_count' => 5,
            'value_uf' => 10,
            'status' => 'pending',
        ]);
    }

    public function test_listagem_de_arquivados_nao_vaza_ativo_e_traz_data_e_autor(): void
    {
        $autor = $this->actingAsAdmin();
        $autor->update(['name' => 'Ana Torres']);

        $ativo = $this->makeBudget('Scap 1', '21.222.333-4');
        $arquivado = $this->makeBudget('Scap 2', '22.333.444-5');
        $arquivado->delete();

        $this->getJson('/api/budgets/archived')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.budget.id', $arquivado->id)
            ->assertJsonPath('0.budget.code', 'Scap 2')
            ->assertJsonPath('0.archived_by', 'Ana Torres');

        $this->getJson('/api/budgets')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.id', $ativo->id);
    }

    public function test_arquivado_mostra_as_cotacoes_que_a_cascata_levou(): void
    {
        // Q-8 do review anterior: com a projeção normal a linha aparece com
        // `0 cotações` e total `0`, porque a cascata acabou de arquivá-las e o
        // global scope as esconde. O operador reconhece o orçamento por essas
        // colunas antes de restaurar.
        $this->actingAsAdmin();

        $budget = $this->makeBudget();
        $this->makeQuote($budget);
        $budget->delete();

        $this->getJson('/api/budgets/archived')
            ->assertOk()
            ->assertJsonCount(1, '0.budget.quotes')
            ->assertJsonPath('0.budget.total_students', 5);
    }

    public function test_arquivado_nao_mostra_a_cotacao_arquivada_antes_do_pai(): void
    {
        $this->actingAsAdmin();

        $budget = $this->makeBudget();
        $this->makeQuote($budget, 1)->delete();
        $this->makeQuote($budget, 2);
        $budget->delete();

        $this->getJson('/api/budgets/archived')
            ->assertOk()
            ->assertJsonCount(1, '0.budget.quotes')
            ->assertJsonPath('0.budget.quotes.0.seq_in_budget', 2);
    }

    public function test_restaura_e_devolve_o_orcamento(): void
    {
        $this->actingAsAdmin();
        $budget = $this->makeBudget('Scap 9');
        $budget->delete();

        $this->postJson("/api/budgets/{$budget->id}/restore")
            ->assertOk()
            ->assertJsonPath('code', 'Scap 9');

        $this->assertNull($budget->fresh()->deleted_at);
    }

    public function test_restaurar_orcamento_ativo_da_404(): void
    {
        // O restore resolve por `onlyTrashed()`: ativo não existe para esta rota.
        $this->actingAsAdmin();
        $budget = $this->makeBudget();

        $this->postJson("/api/budgets/{$budget->id}/restore")->assertNotFound();
    }

    public function test_id_nao_numerico_da_404_e_nao_500(): void
    {
        // Sem o `whereNumber` da rota, `int $budget` estoura `TypeError` antes
        // de qualquer consulta e o handler devolve 500 (Q-6 do review anterior).
        $this->actingAsAdmin();

        $this->postJson('/api/budgets/abc/restore')->assertNotFound();
    }

    public function test_sem_a_permissao_de_restore_da_403(): void
    {
        $this->seed(RolePermissionSeeder::class);

        $user = User::factory()->create(['type' => 'admin', 'is_active' => true]);
        $user->givePermissionTo('commercial.budget.view');
        $this->actingAs($user, 'web');

        $budget = $this->makeBudget();
        $budget->delete();

        // Vê a lista (tem a `view`)...
        $this->getJson('/api/budgets/archived')->assertOk();
        // ...mas não restaura.
        $this->postJson("/api/budgets/{$budget->id}/restore")->assertForbidden();
    }

    public function test_archived_exige_a_permissao_de_view(): void
    {
        $this->seed(RolePermissionSeeder::class);

        $user = User::factory()->redator()->create(['is_active' => true]);
        $user->assignRole('redator');
        $this->actingAs($user, 'web');

        $this->getJson('/api/budgets/archived')->assertForbidden();
    }
}
```

- [ ] **Step 2: Run to verify it fails**

Run: `docker compose exec -T app php artisan test --filter=BudgetArchiveEndpointTest`
Expected: FAIL — 404 em `/api/budgets/archived` (a rota casa como `budgets/{budget}`).

- [ ] **Step 3: The query builder**

`backend/app/Domains/Commercial/QueryBuilders/BudgetQueryBuilder.php`:

```php
<?php

namespace App\Domains\Commercial\QueryBuilders;

use App\Shared\Concerns\LoadsCascadedChildren;
use Illuminate\Database\Eloquent\Builder;

/**
 * Projeção do orçamento: `BudgetData::fromModel` lê `quotes` (e o
 * `BudgetSummaryService` soma sobre a COLEÇÃO CARREGADA) e `files`, com os
 * anexos de cada cotação por dentro.
 *
 * Nasce neste bloco porque a lista de Arquivados precisa de `asOfArchiving`, que
 * é método do trait `LoadsCascadedChildren` e só existe em builder — o
 * `with([...])` solto que o controller fazia não tem onde recebê-lo (P4 do
 * plano). Os três caminhos ativos passaram a usar `withListingData()`, então a
 * lista do que carregar deixou de estar copiada em quatro sítios (B5).
 */
class BudgetQueryBuilder extends Builder
{
    use LoadsCascadedChildren;

    public const LISTING = ['quotes.files', 'files'];

    /**
     * TUDO é cascateado aqui, ao contrário de `Client`/`Course`: a cascata do
     * orçamento leva as cotações, e a de cada cotação leva os anexos dela. A
     * chave aninhada `quotes.files` recebe a MESMA restrição — sem ela a
     * cotação arquivada apareceria sem anexo nenhum.
     */
    private const CASCADED = ['quotes', 'quotes.files', 'files'];

    public function withListingData(): static
    {
        return $this->with(self::LISTING);
    }

    /** Ver `LoadsCascadedChildren::asOfArchiving()` — por que a lista de arquivados não usa `withListingData()`. */
    public function withArchivedListingData(): static
    {
        return $this->with(self::asOfArchiving(self::CASCADED));
    }
}
```

- [ ] **Step 4: Budget ganha o builder**

Em `backend/app/Domains/Commercial/Models/Budget.php`, acrescente os `use` e os dois métodos no fim da classe:

```php
use App\Domains\Commercial\QueryBuilders\BudgetQueryBuilder;
use Illuminate\Database\Query\Builder as QueryBuilder;
```

```php
    /**
     * Contraparte de instância do `withListingData()` — o mesmo molde de
     * `Client`, `Quote`, `Course`, `Turma` e `Enrollment`. É daqui que o
     * controller e as Actions carregam a projeção.
     */
    public function loadListingData(): static
    {
        return $this->load(BudgetQueryBuilder::LISTING);
    }

    /** @param  QueryBuilder  $query */
    public function newEloquentBuilder($query): BudgetQueryBuilder
    {
        return new BudgetQueryBuilder($query);
    }
```

- [ ] **Step 5: The restore Action**

`backend/app/Domains/Commercial/Actions/RestoreBudgetAction.php`:

```php
<?php

namespace App\Domains\Commercial\Actions;

use App\Domains\Commercial\Models\Budget;
use Illuminate\Support\Facades\DB;

/**
 * Restaura o orçamento e, pelo hook `restored` do model, as cotações que a
 * cascata marcou — e, por dentro do `restore()` de cada cotação, os anexos dela.
 *
 * SEM lock, e isto é simétrico e deliberado: `Budget` não tem mutex no lado do
 * delete tampouco (`DeleteBudgetAction` abre transação, não toma lock). Dar um
 * só ao restore criaria a ilusão de proteção sobre uma janela que continua
 * aberta no arquivamento. Mesma leitura da `RestoreCourseAction`.
 */
class RestoreBudgetAction
{
    public function execute(Budget $budget): Budget
    {
        return DB::transaction(function () use ($budget) {
            // No-op idempotente: a rota resolve por `onlyTrashed()`, então
            // chegar aqui com registro ativo significa que alguém restaurou
            // entre o binding e a transação. Restaurar duas vezes não é erro.
            if (! $budget->trashed()) {
                return $budget->loadListingData();
            }

            $budget->restore();

            return $budget->loadListingData();
        });
    }
}
```

- [ ] **Step 6: The DTO**

`backend/app/Domains/Commercial/Data/ArchivedBudgetData.php`:

```php
<?php

namespace App\Domains\Commercial\Data;

use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * Composição, não extensão: `BudgetData` NÃO muda, então o contrato da listagem
 * ativa fica intacto e nenhum campo anulável de arquivamento o polui (D8 do
 * molde). Gêmeo de `ArchivedClientData`.
 */
#[TypeScript]
class ArchivedBudgetData extends Data
{
    public function __construct(
        public BudgetData $budget,
        public string $archived_at,
        /** `null` quando a audit `deleted` não tem usuário (seeder, console). */
        public ?string $archived_by,
    ) {}
}
```

- [ ] **Step 7: The controller**

Em `backend/app/Domains/Commercial/Http/Controllers/BudgetController.php`, acrescente os `use`, os dois métodos de middleware e os dois handlers, e troque os `with([...])` soltos por `withListingData()`/`loadListingData()`:

```php
use App\Domains\Commercial\Actions\RestoreBudgetAction;
use App\Domains\Commercial\Data\ArchivedBudgetData;
use App\Shared\Audit\ArchiveTrailQuery;
use Illuminate\Http\JsonResponse;
```

```php
    public static function middleware(): array
    {
        return [
            new Middleware('permission:commercial.budget.view', only: ['index', 'show', 'archived']),
            new Middleware('permission:commercial.budget.create', only: ['store']),
            new Middleware('permission:commercial.budget.update', only: ['update']),
            new Middleware('permission:commercial.budget.delete', only: ['destroy']),
            new Middleware('permission:commercial.budget.restore', only: ['restore']),
        ];
    }

    /** @return array<BudgetData> */
    public function index(BudgetSummaryService $summary): array
    {
        return Budget::query()->withListingData()
            ->get()
            ->map(fn (Budget $b) => BudgetData::fromModel($b, $summary))
            ->all();
    }

    /** @return array<ArchivedBudgetData> */
    public function archived(BudgetSummaryService $summary): array
    {
        $budgets = Budget::onlyTrashed()->withArchivedListingData()->get();

        $autores = ArchiveTrailQuery::archivedBy(Budget::class, $budgets->pluck('id')->all());

        return $budgets
            ->map(fn (Budget $b) => new ArchivedBudgetData(
                budget: BudgetData::fromModel($b, $summary),
                archived_at: $b->deleted_at->toIso8601String(),
                archived_by: $autores[$b->id] ?? null,
            ))
            ->all();
    }

    // 200 e não 201: `Data::toResponse()` força 201 em qualquer POST
    // (`ResponsableData::calculateResponseStatus`), e restaurar não cria
    // recurso. Mesmo precedente de `QuoteController::approve`.
    public function restore(int $budget, RestoreBudgetAction $action, BudgetSummaryService $summary): JsonResponse
    {
        // Resolvido à mão, não por binding: o binding padrão aplica o global
        // scope de `SoftDeletes` e nunca acharia um arquivado. `onlyTrashed()`
        // também dá o 404 de graça sobre registro ATIVO.
        $model = Budget::onlyTrashed()->whereKey($budget)->firstOrFail();

        return BudgetData::fromModel($action->execute($model), $summary)
            ->toResponse(request())
            ->setStatusCode(Response::HTTP_OK);
    }
```

E nos três métodos que restam, troque `->load(['quotes.files', 'files'])` por `->loadListingData()`:

```php
    public function store(BudgetData $data, CreateBudgetAction $action, BudgetSummaryService $summary): BudgetData
    {
        return BudgetData::fromModel($action->execute($data)->loadListingData(), $summary);
    }

    public function show(Budget $budget, BudgetSummaryService $summary): BudgetData
    {
        return BudgetData::fromModel($budget->loadListingData(), $summary);
    }

    public function update(BudgetData $data, Budget $budget, BudgetSummaryService $summary): BudgetData
    {
        // `code` e `client_id` são imutáveis: só payment_terms muda por aqui.
        $budget->update([
            'payment_terms' => $data->payment_terms instanceof Optional ? null : $data->payment_terms,
        ]);

        return BudgetData::fromModel($budget->loadListingData(), $summary);
    }
```

- [ ] **Step 8: The routes**

Em `backend/app/Domains/Commercial/routes.php`, substitua a linha `Route::apiResource('budgets', BudgetController::class);` por:

```php
    // ANTES do apiResource, senão `budgets/archived` casa como `budgets/{budget}`.
    Route::get('budgets/archived', [BudgetController::class, 'archived']);
    // `whereNumber`: sem ele um id não numérico estoura `TypeError` (500) na
    // assinatura `int $budget` antes de qualquer consulta, em vez do 404.
    Route::post('budgets/{budget}/restore', [BudgetController::class, 'restore'])->whereNumber('budget');

    Route::apiResource('budgets', BudgetController::class);
```

- [ ] **Step 9: Run to verify it passes**

Run: `docker compose exec -T app php artisan test --filter=BudgetArchiveEndpointTest`
Expected: PASS (8 testes).

Run: `docker compose exec -T app php artisan test --filter=Comercial`
Expected: PASS — o `withListingData()` trocou a projeção em três caminhos ativos.

- [ ] **Step 10: Format and commit**

```bash
cd backend && ./vendor/bin/pint \
  app/Domains/Commercial/QueryBuilders/BudgetQueryBuilder.php \
  app/Domains/Commercial/Models/Budget.php \
  app/Domains/Commercial/Actions/RestoreBudgetAction.php \
  app/Domains/Commercial/Data/ArchivedBudgetData.php \
  app/Domains/Commercial/Http/Controllers/BudgetController.php \
  app/Domains/Commercial/routes.php \
  tests/Feature/Comercial/BudgetArchiveEndpointTest.php
```

```bash
git add backend/app/Domains/Commercial/QueryBuilders/BudgetQueryBuilder.php \
        backend/app/Domains/Commercial/Models/Budget.php \
        backend/app/Domains/Commercial/Actions/RestoreBudgetAction.php \
        backend/app/Domains/Commercial/Data/ArchivedBudgetData.php \
        backend/app/Domains/Commercial/Http/Controllers/BudgetController.php \
        backend/app/Domains/Commercial/routes.php \
        backend/tests/Feature/Comercial/BudgetArchiveEndpointTest.php
git commit -m "feat(archive): arquivados e restauracao de orcamento"
```

---

### Task 4: Arquivados e restauração da cotação, escopados pelo orçamento

**Files:**
- Create: `backend/app/Domains/Commercial/Actions/RestoreQuoteAction.php`
- Create: `backend/app/Domains/Commercial/Data/ArchivedQuoteData.php`
- Modify: `backend/app/Domains/Commercial/QueryBuilders/QuoteQueryBuilder.php`
- Modify: `backend/app/Domains/Commercial/Http/Controllers/QuoteController.php`
- Modify: `backend/app/Domains/Commercial/routes.php`
- Test: `backend/tests/Feature/Comercial/QuoteArchiveEndpointTest.php`

**Interfaces:**
- Consumes: `ArchiveTrailQuery::archivedBy`; `asOfArchiving`; a cascata da Task 2.
- Produces:
  - `QuoteQueryBuilder::withArchivedListingData(): static`
  - `RestoreQuoteAction::execute(Quote $quote): Quote`
  - `ArchivedQuoteData(QuoteData $quote, string $archived_at, ?string $archived_by)` → TS `ArchivedQuoteData`
  - `GET /api/budgets/{budget}/quotes/archived` (`commercial.quote.view`) e `POST /api/quotes/{quote}/restore` (`commercial.quote.restore`)

- [ ] **Step 1: Write the failing test**

`backend/tests/Feature/Comercial/QuoteArchiveEndpointTest.php`:

```php
<?php

namespace Tests\Feature\Comercial;

use App\Domains\Commercial\Models\Budget;
use App\Domains\Commercial\Models\Quote;
use App\Domains\Identity\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\CreatesDomainRecords;
use Tests\TestCase;

/**
 * Cotação não tem lista de topo: vive no detalhe do orçamento. A lista de
 * arquivados é ESCOPADA PELO PAI (spec D5) — sem ela, a cotação arquivada
 * individualmente fica inalcançável para sempre, que é a assimetria que o bloco
 * existe para fechar.
 */
class QuoteArchiveEndpointTest extends TestCase
{
    use CreatesDomainRecords;
    use RefreshDatabase;

    private function makeBudget(string $code = 'Scap 1', string $rut = '31.222.333-4'): Budget
    {
        $client = $this->makeClientWithUser([], ['rut' => $rut]);

        return Budget::create(['client_id' => $client->id, 'code' => $code]);
    }

    private function makeQuote(Budget $budget, int $seq = 1, string $status = 'pending'): Quote
    {
        return Quote::create([
            'budget_id' => $budget->id,
            'course_id' => $this->makeCourse(['name' => "C{$budget->id}-{$seq}"])->id,
            'seq_in_budget' => $seq,
            'student_count' => 5,
            'value_uf' => 10,
            'status' => $status,
        ]);
    }

    public function test_lista_so_as_arquivadas_do_orcamento_pedido(): void
    {
        $autor = $this->actingAsAdmin();
        $autor->update(['name' => 'Ana Torres']);

        $a = $this->makeBudget('Scap 1', '31.222.333-4');
        $b = $this->makeBudget('Scap 2', '32.333.444-5');

        $daA = $this->makeQuote($a, 1);
        $vivaDaA = $this->makeQuote($a, 2);
        $daB = $this->makeQuote($b, 1);

        $daA->delete();
        $daB->delete();

        $this->getJson("/api/budgets/{$a->id}/quotes/archived")
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.quote.id', $daA->id)
            ->assertJsonPath('0.archived_by', 'Ana Torres');

        // A ativa do mesmo orçamento continua só na lista ativa.
        $this->getJson("/api/budgets/{$a->id}/quotes")
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.id', $vivaDaA->id);
    }

    public function test_arquivada_mostra_os_anexos_que_a_cascata_levou(): void
    {
        $this->actingAsAdmin();

        $budget = $this->makeBudget();
        $quote = $this->makeQuote($budget);
        $quote->files()->create([
            'type' => 'invoice', 'path' => 'docs/a.pdf', 'original_name' => 'a.pdf',
            'mime' => 'application/pdf', 'size' => 1024,
        ]);

        $quote->delete();

        $this->getJson("/api/budgets/{$budget->id}/quotes/archived")
            ->assertOk()
            ->assertJsonCount(1, '0.quote.files');
    }

    public function test_restaura_e_devolve_a_cotacao(): void
    {
        $this->actingAsAdmin();
        $budget = $this->makeBudget();
        $quote = $this->makeQuote($budget, 3);
        $quote->delete();

        $this->postJson("/api/quotes/{$quote->id}/restore")
            ->assertOk()
            ->assertJsonPath('seq_in_budget', 3);

        $this->assertNull($quote->fresh()->deleted_at);
    }

    public function test_seq_in_budget_nao_colide_no_restore(): void
    {
        // O contraste medido da spec D1: `CreateQuoteAction` deriva o número com
        // `Quote::withTrashed()->max(...)`, então a cotação arquivada continua
        // ocupando o seu e o restore nunca colide. É o oposto de `Turma`.
        $this->actingAsAdmin();
        $budget = $this->makeBudget();

        $primeira = $this->makeQuote($budget, 1);
        $primeira->delete();

        $this->postJson("/api/budgets/{$budget->id}/quotes", [
            'course_id' => $this->makeCourse(['name' => 'Nova'])->id,
            'student_count' => 3, 'value_uf' => '5.0000',
        ])->assertCreated()->assertJsonPath('seq_in_budget', 2);

        $this->postJson("/api/quotes/{$primeira->id}/restore")->assertOk();
    }

    public function test_restaurar_cotacao_ativa_da_404(): void
    {
        $this->actingAsAdmin();
        $budget = $this->makeBudget();
        $quote = $this->makeQuote($budget);

        $this->postJson("/api/quotes/{$quote->id}/restore")->assertNotFound();
    }

    public function test_id_nao_numerico_da_404_e_nao_500(): void
    {
        $this->actingAsAdmin();

        $this->postJson('/api/quotes/abc/restore')->assertNotFound();
    }

    public function test_sem_a_permissao_de_restore_da_403(): void
    {
        $this->seed(RolePermissionSeeder::class);

        $user = User::factory()->create(['type' => 'admin', 'is_active' => true]);
        $user->givePermissionTo('commercial.quote.view');
        $this->actingAs($user, 'web');

        $budget = $this->makeBudget();
        $quote = $this->makeQuote($budget);
        $quote->delete();

        $this->getJson("/api/budgets/{$budget->id}/quotes/archived")->assertOk();
        $this->postJson("/api/quotes/{$quote->id}/restore")->assertForbidden();
    }
}
```

- [ ] **Step 2: Run to verify it fails**

Run: `docker compose exec -T app php artisan test --filter=QuoteArchiveEndpointTest`
Expected: FAIL — 404 em `/api/budgets/{id}/quotes/archived`.

- [ ] **Step 3: The query builder gains the archived projection**

Em `backend/app/Domains/Commercial/QueryBuilders/QuoteQueryBuilder.php`, acrescente o trait e o método:

```php
<?php

namespace App\Domains\Commercial\QueryBuilders;

use App\Shared\Concerns\LoadsCascadedChildren;
use Illuminate\Database\Eloquent\Builder;

/**
 * Projeção da cotação: `QuoteData::fromModel` lê `files`, e a lista do que
 * carregar mora AQUI, não em cada caller — o `->load('files')` se repetia
 * solto pelo QuoteController (B5).
 */
class QuoteQueryBuilder extends Builder
{
    use LoadsCascadedChildren;

    public const LISTING = ['files'];

    /** A única coleção que a cascata da cotação leva junto (spec D9). */
    private const CASCADED = ['files'];

    public function withListingData(): static
    {
        return $this->with(self::LISTING);
    }

    /** Ver `LoadsCascadedChildren::asOfArchiving()` — a lista de arquivadas tem
     * de mostrar os anexos que a cascata acabou de esconder (Q-8). */
    public function withArchivedListingData(): static
    {
        return $this->with(self::asOfArchiving(self::CASCADED));
    }
}
```

- [ ] **Step 4: The restore Action**

`backend/app/Domains/Commercial/Actions/RestoreQuoteAction.php`:

```php
<?php

namespace App\Domains\Commercial\Actions;

use App\Domains\Commercial\Models\Quote;
use Illuminate\Support\Facades\DB;

/**
 * Restaura a cotação e, pelo hook `restored` do model, os anexos que a cascata
 * marcou.
 *
 * SEM gate de unicidade, e o contraste é medido (spec D1): `seq_in_budget` é
 * derivado com `Quote::withTrashed()->max(...)` em `CreateQuoteAction:22`, então
 * a cotação arquivada continua ocupando o número e nenhuma nova o reaproveita.
 * `Turma` é o único root onde o conflito é alcançável.
 *
 * SEM gate de status tampouco: cotação aprovada nem chega a ser arquivada
 * (`DeleteQuoteAction` recusa antes), então não existe arquivada aprovada para
 * restaurar.
 */
class RestoreQuoteAction
{
    public function execute(Quote $quote): Quote
    {
        return DB::transaction(function () use ($quote) {
            // No-op idempotente: alguém restaurou entre o binding e a transação.
            if (! $quote->trashed()) {
                return $quote->loadListingData();
            }

            $quote->restore();

            return $quote->loadListingData();
        });
    }
}
```

- [ ] **Step 5: The DTO**

`backend/app/Domains/Commercial/Data/ArchivedQuoteData.php`:

```php
<?php

namespace App\Domains\Commercial\Data;

use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/** Composição, não extensão — gêmeo de `ArchivedBudgetData` (D8 do molde). */
#[TypeScript]
class ArchivedQuoteData extends Data
{
    public function __construct(
        public QuoteData $quote,
        public string $archived_at,
        /** `null` quando a audit `deleted` não tem usuário (seeder, console). */
        public ?string $archived_by,
    ) {}
}
```

- [ ] **Step 6: The controller**

Em `backend/app/Domains/Commercial/Http/Controllers/QuoteController.php`, acrescente os `use` e os dois handlers, e estenda o middleware:

```php
use App\Domains\Commercial\Actions\RestoreQuoteAction;
use App\Domains\Commercial\Data\ArchivedQuoteData;
use App\Shared\Audit\ArchiveTrailQuery;
```

```php
    public static function middleware(): array
    {
        return [
            new Middleware('permission:commercial.quote.view', only: ['index', 'show', 'archived']),
            new Middleware('permission:commercial.quote.create', only: ['store']),
            new Middleware('permission:commercial.quote.update', only: ['update']),
            new Middleware('permission:commercial.quote.delete', only: ['destroy']),
            new Middleware('permission:commercial.quote.restore', only: ['restore']),
            new Middleware('permission:commercial.quote.approve', only: ['approve', 'reject']),
        ];
    }

    /**
     * Escopada pelo orçamento (spec D5): a cotação não tem lista de topo, e a
     * superfície de arquivados nasce onde a de ativas já vive.
     *
     * @return array<ArchivedQuoteData>
     */
    public function archived(Budget $budget): array
    {
        $quotes = $budget->quotes()->onlyTrashed()->withArchivedListingData()->get();

        $autores = ArchiveTrailQuery::archivedBy(Quote::class, $quotes->pluck('id')->all());

        return $quotes
            ->map(fn (Quote $q) => new ArchivedQuoteData(
                quote: QuoteData::fromModel($q),
                archived_at: $q->deleted_at->toIso8601String(),
                archived_by: $autores[$q->id] ?? null,
            ))
            ->all();
    }

    // 200 e não 201, pelo mesmo motivo de `approve`.
    public function restore(int $quote, RestoreQuoteAction $action): JsonResponse
    {
        // Resolvido à mão: o binding padrão aplica o global scope de
        // `SoftDeletes` e nunca acharia uma arquivada.
        $model = Quote::onlyTrashed()->whereKey($quote)->firstOrFail();

        return QuoteData::fromModel($action->execute($model))
            ->toResponse(request())
            ->setStatusCode(Response::HTTP_OK);
    }
```

- [ ] **Step 7: The routes**

Em `backend/app/Domains/Commercial/routes.php`, logo abaixo de `Route::post('budgets/{budget}/quotes', ...)`:

```php
    Route::get('budgets/{budget}/quotes/archived', [QuoteController::class, 'archived']);
    Route::post('quotes/{quote}/restore', [QuoteController::class, 'restore'])->whereNumber('quote');
```

A rota de `archived` fica **antes** do `apiResource('quotes', ...)`; a de `restore` também, senão `quotes/{quote}` a engoliria.

- [ ] **Step 8: Run to verify it passes**

Run: `docker compose exec -T app php artisan test --filter=QuoteArchiveEndpointTest`
Expected: PASS (7 testes).

Run: `docker compose exec -T app php artisan test`
Expected: fase 1 do backend fechada, sem regressão.

- [ ] **Step 9: Format and commit**

```bash
cd backend && ./vendor/bin/pint \
  app/Domains/Commercial/QueryBuilders/QuoteQueryBuilder.php \
  app/Domains/Commercial/Actions/RestoreQuoteAction.php \
  app/Domains/Commercial/Data/ArchivedQuoteData.php \
  app/Domains/Commercial/Http/Controllers/QuoteController.php \
  app/Domains/Commercial/routes.php \
  tests/Feature/Comercial/QuoteArchiveEndpointTest.php
```

```bash
git add backend/app/Domains/Commercial/QueryBuilders/QuoteQueryBuilder.php \
        backend/app/Domains/Commercial/Actions/RestoreQuoteAction.php \
        backend/app/Domains/Commercial/Data/ArchivedQuoteData.php \
        backend/app/Domains/Commercial/Http/Controllers/QuoteController.php \
        backend/app/Domains/Commercial/routes.php \
        backend/tests/Feature/Comercial/QuoteArchiveEndpointTest.php
git commit -m "feat(archive): arquivados e restauracao de cotacao, escopados pelo orcamento"
```

---

### Task 5: Frontend do orçamento — a segunda visão da tabela e a dívida de copy

**Files:**
- Modify: `frontend/src/shared/api/budgetsApi.ts`
- Create: `frontend/src/features/commercial/hooks/useBudgetsArchived.ts`
- Create: `frontend/src/features/commercial/components/Budget/BudgetRowActions.tsx`
- Modify: `frontend/src/features/commercial/components/Budget/BudgetsTable.tsx`
- Modify: `frontend/src/features/commercial/components/CommercialPage.tsx`
- Modify: `frontend/src/shared/config/locales/es-CL.json`
- Modify: `frontend/src/shared/config/locales/pt-BR.json`
- Modify: `frontend/src/shared/config/locales/en.json`

**Interfaces:**
- Consumes: `ArchivedBudgetData` da Task 3 (`{ budget: BudgetData; archived_at: string; archived_by: string | null }`),
  já em `@shared/types/generated` depois do `typescript:transform` da Task 15 — mas o executor
  **roda `docker compose exec -T app php artisan typescript:transform` no início desta task**, senão
  `tsc -b` não conhece o tipo. O commit do `generated.ts` é da Task 15; aqui ele só existe no working
  tree.
- Produces: `useBudgetsArchived()` → `{ mode, setMode, items: BudgetRow[], loading, error, refetch,
  restore(id), restoring }`. `BudgetRow` = `BudgetData & { archived_at?: string; archived_by?: string | null }`,
  exportado de `BudgetsTable.tsx` (mesmo lugar de `ClientRow`).

**Por que não há vitest novo aqui.** O molde não escreveu teste de hook de feature para
`useClientsArchived` nem de componente para `ClientsTable`: o que está testado é o hook compartilhado
(`useArchivedPage.test.ts`) e o `ArchiveSwitch` (`ArchiveSwitch.test.tsx`), ambos já verdes e
intocados por esta task. A prova desta task é o DoD de navegador do passo 8 — que é o que a lei §8
exige. Inventar um teste de renderização aqui divergiria do bloco anterior sem cobrir nada novo.

- [ ] **Step 1: Regenerar os tipos para o `tsc` enxergar `ArchivedBudgetData`**

```bash
docker compose exec -T app php artisan typescript:transform
grep -n 'ArchivedBudgetData' frontend/src/shared/types/generated.ts
```

Esperado: uma linha `export type ArchivedBudgetData = {` com `budget: BudgetData`, `archived_at: string`
e `archived_by: string | null`. Se não aparecer, a Task 3 não está completa — pare e volte a ela.

- [ ] **Step 2: Segundo genérico em `budgetsApi`**

`frontend/src/shared/api/budgetsApi.ts` inteiro:

```ts
import { createCrudResource } from './createCrudResource'
import type { ArchivedBudgetData, BudgetData } from '@shared/types/generated'

/** Cliente REST do recurso `budgets`. Como `BudgetData` já embute `quotes[]` e
 * `files[]` (o backend eager-loada os dois), esta é a ÚNICA leitura do módulo:
 * lista e detalhe descem daqui, e toda mutação de cotação/anexo invalida
 * `keys.all` para repintar totais e status agregado de uma vez.
 *
 * O segundo genérico é o que faz `useArchivedList`/`useRestore` falarem o DTO
 * composto de arquivados. A fábrica já expunha os dois hooks; o que faltava era
 * o tipo (spec D12). */
export const budgetsApi = createCrudResource<BudgetData, ArchivedBudgetData>('budgets')
```

- [ ] **Step 3: O hook da página de arquivados**

Criar `frontend/src/features/commercial/hooks/useBudgetsArchived.ts`:

```ts
import { useTranslation } from 'react-i18next'
import { useArchivedPage } from '@shared/hooks'
import { useToast } from '@shared/ui'
import { budgetsApi } from '@shared/api/budgetsApi'
import { problemMessage } from '@shared/api/problemMessage'
import type { ArchivedBudgetData, BudgetData } from '@shared/types/generated'

/** Gêmeo do `useClientsArchived`, e pela mesma razão de fronteira: é este arquivo
 * que mantém `budgetsApi` fora de `CommercialPage` (lint `no-restricted-syntax`).
 *
 * NÃO existe `archive` aqui. Arquivar orçamento continua sendo ação da tela de
 * detalhe (`useBudgetDetail.askDeleteBudget`), que já mostra o ConfirmDialog e já
 * invalida `budgetsApi.keys.all` — a mesma chave que a lista de arquivados usa.
 * Duplicar o arquivar na tabela seria um segundo caminho para a mesma mutação.
 *
 * O TOAST mora aqui, nos dois sentidos: sem o `onError` um 403 de quem não tem
 * `commercial.budget.restore` não muda nada na tela (Q-2 do review de 2026-08-18). */
export function useBudgetsArchived() {
  const { t } = useTranslation()
  const toast = useToast()
  const page = useArchivedPage<BudgetData, ArchivedBudgetData>(budgetsApi, (row) => row.budget)

  return {
    ...page,
    restore: (id: number) =>
      page.restore(id, {
        onSuccess: () => toast.success(t('archive.restoredToast')),
        onError: (problem) => {
          const message = problemMessage(problem)
          if (message) toast.error(message)
        },
      }),
  }
}
```

- [ ] **Step 4: As ações de linha**

Criar `frontend/src/features/commercial/components/Budget/BudgetRowActions.tsx`:

```tsx
import { useTranslation } from 'react-i18next'
import { usePermissions } from '@shared/hooks'
import { AppButton } from '@shared/ui'
import type { BudgetData } from '@shared/types/generated'

/**
 * Ações por linha da tabela de orçamentos. Extraído da `BudgetsTable` pela mesma
 * razão do `ClientRowActions`: a célula ramifica por modo e a régua de 150 linhas
 * de `features/<x>/components/` vale sem exceção.
 *
 * Em `archived` o olho SAI. A rota de detalhe (`GET /api/budgets/{budget}`) usa o
 * binding padrão e não enxerga registro soft-deletado: o botão levaria a uma tela
 * de 404. Restaurar primeiro, abrir depois.
 *
 * Esconder o botão é conveniência de interface — a autorização real é da API
 * (ADR-07).
 */
export function BudgetRowActions({
  budget,
  archived,
  busy,
  onView,
  onRestore,
}: {
  budget: BudgetData
  archived: boolean
  /** Restore em voo: sem isto o clique duplo dispara dois POSTs (Q-2). */
  busy: boolean
  onView: (b: BudgetData) => void
  onRestore: (b: BudgetData) => void
}) {
  const { t } = useTranslation()
  const { can } = usePermissions()

  if (archived) {
    return can('commercial.budget.restore') ? (
      <AppButton
        label={t('archive.restoreAction')}
        icon="pi pi-undo"
        text
        size="small"
        disabled={busy}
        onClick={() => onRestore(budget)}
      />
    ) : null
  }

  return (
    <AppButton
      icon="pi pi-eye"
      text
      rounded
      aria-label={t('common.view')}
      onClick={() => onView(budget)}
    />
  )
}
```

- [ ] **Step 5: A tabela serve as duas fontes**

Em `frontend/src/features/commercial/components/Budget/BudgetsTable.tsx`:

**5a.** Trocar o bloco de imports do topo (linhas 1-13) por:

```tsx
import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  AppColumn, AppDropdown, AppTag, IdentityCell,
  AppEmptyState, ArchiveSwitch, SearchableTableFrame,
} from '@shared/ui'
import { useTableFilter } from '@shared/hooks'
import type { ArchiveMode } from '@shared/hooks'
import type { BudgetData, QuoteStatus } from '@shared/types/generated'
import { quoteStatusSeverity } from '../../lib/quoteStatus'
import { formatUf } from '@shared/lib'
import { useCommercialClients } from '../../hooks/useCommercialClients'
import { BudgetRowActions } from './BudgetRowActions'

const STATUSES: QuoteStatus[] = ['pending', 'approved', 'rejected']

/** A mesma tabela serve as duas fontes. Em `archived` as duas colunas do rastreio
 * vêm preenchidas pelo achatamento do `useArchivedPage`; em `active` elas nem são
 * renderizadas. Molde: `ClientRow`. */
export type BudgetRow = BudgetData & {
  archived_at?: string
  archived_by?: string | null
}
```

`AppButton` sai dos imports — o único uso dele na tabela era o olho, que foi para o
`BudgetRowActions`. Deixá-lo importado quebra o `pnpm lint` (`no-unused-vars`).

**5b.** Trocar a assinatura (o `export function BudgetsTable({...}: {...})` inteiro) por:

```tsx
export function BudgetsTable({
  budgets, loading, actions, error, onRetry,
  mode, onModeChange, onRestore, busy,
}: {
  budgets: BudgetRow[]
  loading: boolean
  mode: ArchiveMode
  onModeChange: (mode: ArchiveMode) => void
  onRestore: (b: BudgetData) => void
  /** Restore em voo — trava os botões da linha (Q-2). */
  busy: boolean
  actions?: ReactNode
  error?: { detail?: string | null } | null
  /** Devolver a promise do refetch faz o Reintentar do AppErrorState esperar
   * por ela (Q-14). Tipar `() => void` aqui compilaria — TS aceita descartar o
   * retorno — e faria o tipo mentir sobre o contrato. */
  onRetry?: () => void | Promise<unknown>
}) {
```

**5c.** Logo após `const clients = useCommercialClients()`, acrescentar:

```tsx
  const archived = mode === 'archived'
```

**5d.** Trocar o `busy` derivado (`const busy = loading || clients.isLoading`) por outro nome — o
prop novo tomou a palavra:

```tsx
  /** Carregando é qualquer uma das duas queries: a tabela só está "vazia"
   * depois que as duas responderam. */
  const carregando = loading || clients.isLoading
```

e, no JSX, `loading={busy}` vira `loading={carregando}`.

**5e.** No `<SearchableTableFrame>`, trocar `emptyState`, `actions` e acrescentar `viewSwitch`:

```tsx
      emptyState={
        <AppEmptyState
          icon={archived ? 'pi pi-inbox' : 'pi pi-file'}
          title={archived ? t('archive.empty') : t('budget.empty')}
          description={archived ? t('archive.emptyHint') : t('budget.emptyHint')}
          action={archived ? undefined : actions}
        />
      }
      footerCount={t('budget.count', { count: table.rows.length })}
      actions={archived ? undefined : actions}
      viewSwitch={<ArchiveSwitch value={mode} onChange={onModeChange} />}
      loading={carregando}
```

**5f.** Antes da última `<AppColumn>` (a do olho), acrescentar as duas colunas do rastreio:

```tsx
      {archived && (
        <AppColumn
          field="archived_at"
          header={t('archive.archivedAt')}
          body={(b: BudgetRow) => (b.archived_at ? new Date(b.archived_at).toLocaleDateString() : '—')}
        />
      )}
      {archived && (
        <AppColumn
          field="archived_by"
          header={t('archive.archivedBy')}
          body={(b: BudgetRow) => b.archived_by ?? t('archive.unknownAuthor')}
        />
      )}
```

**5g.** Trocar a última `<AppColumn>` (a que hoje renderiza o `AppButton` do olho) por:

```tsx
      <AppColumn
        body={(b: BudgetRow) => (
          <BudgetRowActions
            budget={b}
            archived={archived}
            busy={busy}
            onView={(x) => navigate(`/comercial/presupuestos/${x.id}`)}
            onRestore={onRestore}
          />
        )}
        style={{ width: '8rem' }}
      />
```

> **A coluna Cliente do arquivado depende do cliente estar ativo.** `useCommercialClients` lê a
> lista viva; arquivar um cliente NÃO arquiva os orçamentos dele (não é filho dele), então o caso
> normal resolve. Um orçamento cujo cliente foi arquivado depois mostra `—` na coluna, igual à visão
> ativa faria — comportamento existente, não regressão desta task.

- [ ] **Step 6: Ligar na página**

Em `frontend/src/features/commercial/components/CommercialPage.tsx`:

**6a.** Depois de `import { useBudgetsPage } from '../hooks/useBudgetsPage'`, acrescentar:

```tsx
import { useBudgetsArchived } from '../hooks/useBudgetsArchived'
```

**6b.** Depois de `const budgets = useBudgetsPage()`, acrescentar:

```tsx
  const budgetsArchived = useBudgetsArchived()
```

**6c.** Depois de `const archived = clientsArchived.mode === 'archived'`, acrescentar:

```tsx
  const budgetArchived = budgetsArchived.mode === 'archived'
```

**6d.** Trocar o `<BudgetsTable ... />` inteiro por:

```tsx
            <BudgetsTable
              budgets={budgetArchived ? budgetsArchived.items : budgets.items}
              loading={budgetArchived ? budgetsArchived.loading : budgets.loading}
              error={budgetArchived ? budgetsArchived.error : budgets.error}
              onRetry={budgetArchived ? budgetsArchived.refetch : budgets.refetch}
              mode={budgetsArchived.mode}
              onModeChange={budgetsArchived.setMode}
              onRestore={(b) => b.id != null && budgetsArchived.restore(b.id)}
              busy={budgetsArchived.restoring}
              actions={
                can('commercial.budget.create')
                  ? <AppButton variant="brandIcon" label={t('budget.new')} icon="pi pi-file" onClick={budgets.openCreate} />
                  : undefined
              }
            />
```

- [ ] **Step 7: Pagar a dívida de copy (D11), nos três locales**

As duas chaves dizem *"não pode ser desfeito"* desde o molde, e a partir da Task 3/Task 4 isso é
**falso**: orçamento e cotação restauram. Trocar **só o `confirmDeleteBody`** de `budget` e `quote`
— os títulos ficam, porque o botão que abre o diálogo continua sendo `common.delete`.

`frontend/src/shared/config/locales/es-CL.json`:

```json
    "confirmDeleteBody": "Sus cotizaciones se archivarán junto con él. Podrás restaurarlo desde Archivados.",
```
```json
    "confirmDeleteBody": "Podrás restaurarla desde Archivados.",
```

`frontend/src/shared/config/locales/pt-BR.json`:

```json
    "confirmDeleteBody": "As cotações dele são arquivadas junto. Você poderá restaurá-lo em Arquivados.",
```
```json
    "confirmDeleteBody": "Você poderá restaurá-la em Arquivados.",
```

`frontend/src/shared/config/locales/en.json`:

```json
    "confirmDeleteBody": "Its quotes are archived along with it. You can restore it from Archived.",
```
```json
    "confirmDeleteBody": "You can restore it from Archived.",
```

A primeira de cada par é a de `budget`, a segunda a de `quote`. **Nenhuma chave nova** — a visão de
arquivados do orçamento usa o bloco `archive.*`, que já existe nos três arquivos e já passa no
`parity.test.ts`.

- [ ] **Step 8: Verificar**

```bash
cd frontend && pnpm lint && pnpm test && pnpm build
```

Esperado: lint sem erro, vitest verde (inclusive `locales/parity.test.ts`, que compara as chaves dos
três arquivos), `tsc -b` sem erro.

DoD de navegador (com `pnpm dev` + `docker compose up -d` de pé, logado como admin):

1. `/comercial` → aba **Presupuestos**. O par **Activos | Archivados** aparece à direita da busca.
2. Abrir um orçamento com pelo menos uma cotação, `Eliminar`. O diálogo agora diz *"…Podrás
   restaurarlo desde Archivados."* Confirmar → volta para a lista e o orçamento sumiu dos ativos.
3. Clicar **Archivados** → o orçamento está lá, com **Archivado el** = hoje, **Archivado por** = seu
   nome, e a coluna **Cotizaciones** mostrando o número que ele tinha (não `0` — é a prova de tela
   do `asOfArchiving` da Task 3).
4. Clicar **Restaurar** → toast *"Registro restaurado."*, a linha some dos arquivados e reaparece em
   **Activos** com o mesmo número de cotações.
5. Abrir o orçamento restaurado: as cotações e os anexos estão lá.

- [ ] **Step 9: Commit**

```bash
git add frontend/src/shared/api/budgetsApi.ts \
        frontend/src/features/commercial/hooks/useBudgetsArchived.ts \
        frontend/src/features/commercial/components/Budget/BudgetRowActions.tsx \
        frontend/src/features/commercial/components/Budget/BudgetsTable.tsx \
        frontend/src/features/commercial/components/CommercialPage.tsx \
        frontend/src/shared/config/locales/es-CL.json \
        frontend/src/shared/config/locales/pt-BR.json \
        frontend/src/shared/config/locales/en.json
git commit -m "feat(archive): visao de arquivados do orcamento e copy do confirmar"
```

`frontend/src/shared/types/generated.ts` **não entra neste commit** — ele é da Task 15, junto com o
manifesto do transformer, pelo mesmo motivo do bloco anterior.

---

### Task 6: Frontend da cotação — arquivados dentro do detalhe do orçamento (D5)

**Files:**
- Modify: `frontend/src/features/commercial/api/useQuotes.ts`
- Create: `frontend/src/features/commercial/hooks/useBudgetQuotesArchived.ts`
- Create: `frontend/src/features/commercial/components/Budget/ArchivedQuotesList.tsx`
- Modify: `frontend/src/features/commercial/components/Budget/QuotesList.tsx`
- Modify: `frontend/src/features/commercial/components/Budget/BudgetDetailPage.tsx`
- Test: `frontend/src/features/commercial/components/Budget/QuotesList.test.tsx` (já existe — estender)

**Interfaces:**
- Consumes: `ArchivedQuoteData` da Task 4 (`{ quote: QuoteData; archived_at: string; archived_by: string | null }`);
  `useArchivedPage` de `@shared/hooks`; `ArchiveSwitch` de `@shared/ui`.
- Produces: `useQuotesArchived(budgetId, enabled)` e `useRestoreQuote()` em `api/useQuotes.ts`;
  `useBudgetQuotesArchived(budgetId)` → `{ mode, setMode, items: QuoteRow[], loading, error, refetch,
  restore(id), restoring }`. `QuoteRow` = `QuoteData & { archived_at?: string; archived_by?: string | null }`,
  exportado de `ArchivedQuotesList.tsx`.

> **P1 aplicado.** A spec §4 aponta `features/commercial/api/useBudgetQuotes.ts`. Esse arquivo não
> existe: a família de hooks de cotação mora em **`features/commercial/api/useQuotes.ts`**
> (`useCreateQuote`, `useUpdateQuote`, `useRemoveQuote`, `useApproveQuote`, `useRejectQuote`). Os dois
> hooks novos entram lá; criar um arquivo novo partiria a família em dois.

- [ ] **Step 1: Os dois hooks de rede, ao lado dos irmãos**

Em `frontend/src/features/commercial/api/useQuotes.ts`:

**1a.** Trocar as duas primeiras linhas de import por:

```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@shared/api/axios'
import type { ProblemDetails } from '@shared/api/axios'
import type { ArchivedQuoteData, QuoteData } from '@shared/types/generated'
import { budgetsApi } from '@shared/api/budgetsApi'
```

**1b.** No fim do arquivo, acrescentar:

```ts
/**
 * Cotações arquivadas DE UM orçamento. Escopada pelo pai porque a cotação não
 * tem lista de topo — ela vive dentro do detalhe (spec D5).
 *
 * A chave começa em `budgetsApi.keys.detail(budgetId)`, que por sua vez começa em
 * `['budgets']` — o mesmo prefixo que `useInvalidate()` invalida. Efeito: arquivar
 * uma cotação repinta a lista de arquivados sem código novo, igual ao molde.
 *
 * `enabled` é PARÂMETRO, não default, pela mesma lição da fábrica: a visão de
 * arquivados não pode buscar na montagem.
 */
export function useQuotesArchived(budgetId: number, enabled: boolean) {
  return useQuery<ArchivedQuoteData[], ProblemDetails>({
    queryKey: [...budgetsApi.keys.detail(budgetId), 'quotes', 'archived'],
    queryFn: () =>
      api.get<ArchivedQuoteData[]>(`/api/budgets/${budgetId}/quotes/archived`).then((r) => r.data),
    enabled,
  })
}

/** O restore NÃO é escopado pelo pai: a rota é `POST /api/quotes/{quote}/restore`,
 * plana, porque a cotação já é identificada globalmente pelo id (spec D5). */
export function useRestoreQuote() {
  const invalidate = useInvalidate()
  return useMutation<QuoteData, ProblemDetails, number>({
    mutationFn: (quoteId) => api.post<QuoteData>(`/api/quotes/${quoteId}/restore`).then((r) => r.data),
    onSuccess: invalidate,
  })
}
```

- [ ] **Step 2: O hook de página, satisfazendo o contrato estrutural à mão**

Criar `frontend/src/features/commercial/hooks/useBudgetQuotesArchived.ts`:

```ts
import { useTranslation } from 'react-i18next'
import { useArchivedPage } from '@shared/hooks'
import { useToast } from '@shared/ui'
import { problemMessage } from '@shared/api/problemMessage'
import type { ArchivedQuoteData, QuoteData } from '@shared/types/generated'
import { useQuotesArchived, useRestoreQuote } from '../api/useQuotes'

/**
 * `useArchivedPage` exige `ArchivableResource<TArchived>` — contrato ESTRUTURAL
 * (`useArchivedList(enabled)` + `useRestore()`), não a fábrica `createCrudResource`
 * (spec D12). Cotação não tem fábrica: o recurso é montado aqui, com o id do pai
 * fechado no closure. O `mutate(id)` do contrato continua bastando.
 *
 * As duas propriedades são FUNÇÕES NOMEADAS começando em `use`, e isso não é
 * estilo: o `react-hooks/rules-of-hooks` decide pelo nome do que está sendo
 * definido. Seta anônima numa propriedade não é reconhecida como hook e o lint
 * reprova a chamada de `useQuery` lá dentro.
 */
function recursoDeCotacoes(budgetId: number) {
  return {
    useArchivedList: function useArchivedList(enabled: boolean) {
      return useQuotesArchived(budgetId, enabled)
    },
    useRestore: function useRestore() {
      return useRestoreQuote()
    },
  }
}

/** Molde: `useClientsArchived`. O toast mora aqui nos dois sentidos — sem o
 * `onError` um 403 de quem não tem `commercial.quote.restore` não muda nada na
 * tela (Q-2 do review de 2026-08-18).
 *
 * Não há `archive` aqui: arquivar cotação continua sendo o `onRemove` do
 * `QuotesList`, que já passa pelo ConfirmDialog do `useBudgetDetail`. */
export function useBudgetQuotesArchived(budgetId: number) {
  const { t } = useTranslation()
  const toast = useToast()
  const page = useArchivedPage<QuoteData, ArchivedQuoteData>(
    recursoDeCotacoes(budgetId),
    (row) => row.quote,
  )

  return {
    ...page,
    restore: (id: number) =>
      page.restore(id, {
        onSuccess: () => toast.success(t('archive.restoredToast')),
        onError: (problem) => {
          const message = problemMessage(problem)
          if (message) toast.error(message)
        },
      }),
  }
}
```

- [ ] **Step 3: A lista das arquivadas**

Criar `frontend/src/features/commercial/components/Budget/ArchivedQuotesList.tsx`:

```tsx
import { useTranslation } from 'react-i18next'
import { usePermissions } from '@shared/hooks'
import { AppButton, InlineLoadState } from '@shared/ui'
import { formatUf } from '@shared/lib'
import type { QuoteData } from '@shared/types/generated'

/** Molde `ClientRow`: a mesma forma achatada pelo `useArchivedPage`. */
export type QuoteRow = QuoteData & {
  archived_at?: string
  archived_by?: string | null
}

/**
 * Cotações arquivadas do orçamento. Componente próprio, e não um modo do
 * `QuoteRow`: a linha ativa carrega aprovar/rejeitar/editar/excluir e um input de
 * upload por linha, nada disso aplicável a um registro fora da lista. Ramificar o
 * `QuoteRow` por modo deixaria sete `onX` opcionais mortos na metade dos casos.
 *
 * A linha mostra o que o operador precisa para RECONHECER a cotação antes de
 * restaurá-la (Q-8): código, curso, valor e o rastreio de quem arquivou quando.
 */
export function ArchivedQuotesList({
  quotes,
  courseName,
  loading,
  error,
  onRetry,
  onRestore,
  restoring,
}: {
  quotes: QuoteRow[]
  courseName: (id: number) => string
  loading: boolean
  error?: { detail?: string | null } | null
  onRetry: () => void | Promise<unknown>
  onRestore: (id: number) => void
  /** Restore em voo — trava os botões (Q-2). */
  restoring: boolean
}) {
  const { t } = useTranslation()
  const { can } = usePermissions()

  if (loading || error) {
    return (
      <div className="m-4">
        <InlineLoadState
          error={error ? (error.detail ?? t('common.loadErrorHint')) : null}
          retryLabel={t('common.retry')}
          onRetry={onRetry}
        />
        {loading && !error && (
          <p className="text-sm" style={{ color: 'var(--text-color-secondary)' }}>{t('common.loading')}</p>
        )}
      </div>
    )
  }

  if (quotes.length === 0) {
    return (
      <p className="p-4 text-sm" style={{ color: 'var(--text-color-secondary)' }}>{t('archive.empty')}</p>
    )
  }

  return (
    <div>
      {quotes.map((q, i) => (
        <div
          key={q.id}
          className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t p-4 first:border-t-0"
          style={{
            borderColor: 'var(--surface-border)',
            background: i % 2 === 1 ? 'var(--surface-section)' : 'transparent',
          }}
        >
          <div className="min-w-64 flex-1">
            <span className="font-medium">{courseName(q.course_id)}</span>
            <p className="text-sm" style={{ color: 'var(--text-color-secondary)' }}>{q.code}</p>
          </div>
          <span className="font-semibold">{formatUf(q.value_uf ?? '0')} UF</span>
          <span className="text-sm" style={{ color: 'var(--text-color-secondary)' }}>
            {t('archive.archivedAt')}: {q.archived_at ? new Date(q.archived_at).toLocaleDateString() : '—'}
          </span>
          <span className="text-sm" style={{ color: 'var(--text-color-secondary)' }}>
            {t('archive.archivedBy')}: {q.archived_by ?? t('archive.unknownAuthor')}
          </span>
          {can('commercial.quote.restore') && (
            <AppButton
              label={t('archive.restoreAction')}
              icon="pi pi-undo"
              text
              size="small"
              disabled={restoring}
              onClick={() => q.id != null && onRestore(q.id)}
            />
          )}
        </div>
      ))}
    </div>
  )
}
```

> **Conferir antes de escrever:** `formatUf` e `InlineLoadState` são os mesmos que `QuoteRow.tsx` e
> `QuotesList.tsx` já importam (`@shared/lib` e `@shared/ui`). Se o `tsc` reclamar do caminho, copie o
> import do irmão — não invente outro.

- [ ] **Step 4: O switch é local, dentro do `QuotesList`**

Em `frontend/src/features/commercial/components/Budget/QuotesList.tsx`:

**4a.** Trocar o bloco de imports por:

```tsx
import { useTranslation } from 'react-i18next'
import { ArchiveSwitch, FormErrorBanner, InlineLoadState } from '@shared/ui'
import type { ArchiveMode } from '@shared/hooks'
import type { QuoteData } from '@shared/types/generated'
import { useQuoteFiles } from '../../hooks/useQuoteFiles'
import { useQuotesListCourses } from '../../hooks/useQuotesListCourses'
import { QuoteRow } from './QuoteRow'
import { ArchivedQuotesList, type QuoteRow as ArchivedRow } from './ArchivedQuotesList'
```

**4b.** Trocar a assinatura por:

```tsx
export function QuotesList({
  quotes, onEdit, onRemove, onApprove, onReject,
  mode, onModeChange, archived, onRestore,
}: {
  quotes: QuoteData[]
  onEdit?: (q: QuoteData) => void
  onRemove?: (q: QuoteData) => void
  onApprove?: (q: QuoteData) => void
  onReject?: (q: QuoteData) => void
  /** Arquivados da cotação é visão LOCAL desta lista, não da página (spec D5). */
  mode: ArchiveMode
  onModeChange: (mode: ArchiveMode) => void
  archived: {
    items: ArchivedRow[]
    loading: boolean
    error: { detail?: string | null } | null
    refetch: () => void | Promise<unknown>
    restoring: boolean
  }
  onRestore: (id: number) => void
}) {
```

**4c.** Logo depois de `const files = useQuoteFiles()`, acrescentar:

```tsx
  const arquivados = mode === 'archived'
```

**4d.** Trocar o early-return de lista vazia por uma versão que **não** engole o switch — hoje ele
sai antes de tudo e, sem esta mudança, um orçamento sem cotação ativa nunca deixaria o usuário
alcançar as arquivadas:

```tsx
  const cabecalho = (
    <div className="flex justify-end px-4 pt-4">
      <ArchiveSwitch value={mode} onChange={onModeChange} />
    </div>
  )

  if (arquivados) {
    return (
      <div>
        {cabecalho}
        <ArchivedQuotesList
          quotes={archived.items}
          courseName={courses.courseName}
          loading={archived.loading}
          error={archived.error}
          onRetry={archived.refetch}
          onRestore={onRestore}
          restoring={archived.restoring}
        />
      </div>
    )
  }

  if (quotes.length === 0) {
    return (
      <div>
        {cabecalho}
        <p className="p-4 text-sm" style={{ color: 'var(--text-color-secondary)' }}>{t('budget.noQuotes')}</p>
      </div>
    )
  }
```

**4e.** No `return` final, acrescentar `{cabecalho}` como primeiro filho da `<div>` externa, antes
da `<div className="m-4 empty:m-0">`.

- [ ] **Step 5: Ligar no detalhe do orçamento**

Em `frontend/src/features/commercial/components/Budget/BudgetDetailPage.tsx`:

**5a.** Depois de `import { useBudgetDetail } from '../../hooks/useBudgetDetail'`, acrescentar:

```tsx
import { useBudgetQuotesArchived } from '../../hooks/useBudgetQuotesArchived'
```

**5b.** Depois de `const d = useBudgetDetail(budgetId)`, acrescentar:

```tsx
  const quotesArchived = useBudgetQuotesArchived(budgetId)
```

Esta linha fica **acima** dos três `if` de ramo (`loading`, `loadError`, `!d.budget`): hook antes de
qualquer return, sempre.

**5c.** Trocar o `<QuotesList ... />` por:

```tsx
          <QuotesList
            quotes={budget.quotes}
            onEdit={(q) => d.openWizard(q)}
            onRemove={(q) => d.askConfirm('remove', q)}
            onApprove={d.canApprove ? (q) => d.askConfirm('approve', q) : undefined}
            onReject={d.canApprove ? (q) => d.askConfirm('reject', q) : undefined}
            mode={quotesArchived.mode}
            onModeChange={quotesArchived.setMode}
            archived={{
              items: quotesArchived.items,
              loading: quotesArchived.loading,
              error: quotesArchived.error,
              refetch: quotesArchived.refetch,
              restoring: quotesArchived.restoring,
            }}
            onRestore={quotesArchived.restore}
          />
```

- [ ] **Step 6: Estender o teste que já existe**

`frontend/src/features/commercial/components/Budget/QuotesList.test.tsx` renderiza a lista hoje e
**vai quebrar**, porque os quatro props novos são obrigatórios. Corrigir o setup existente
acrescentando-os e, no mesmo arquivo, um caso novo que prova o único comportamento desta task que não
é cascata de props — o switch continuar alcançável com zero cotações ativas:

```tsx
const arquivadoVazio = {
  items: [],
  loading: false,
  error: null,
  refetch: () => undefined,
  restoring: false,
}

it('mostra o switch de arquivados mesmo sem cotação ativa', () => {
  render(
    <QuotesList
      quotes={[]}
      mode="active"
      onModeChange={() => {}}
      archived={arquivadoVazio}
      onRestore={() => {}}
    />,
  )

  expect(screen.getByRole('button', { name: /archivados/i })).toBeInTheDocument()
})
```

O `render` deste arquivo já vem com os providers do projeto (i18n + QueryClient); reutilize o helper
que o teste existente usa em vez de montar um novo. Se o teste existente monta `QuotesList` mais de
uma vez, os quatro props novos entram em **todas** as montagens.

- [ ] **Step 7: Verificar**

```bash
cd frontend && pnpm lint && pnpm test && pnpm build
```

Esperado: verde nos três. Um erro `react-hooks/rules-of-hooks` apontando
`useBudgetQuotesArchived.ts` significa que as funções nomeadas do Step 2 viraram setas — volte e
restaure a forma `function useArchivedList(...)`.

DoD de navegador:

1. Abrir um orçamento com **duas ou mais** cotações. O par **Activos | Archivados** aparece no topo
   do card de cotações.
2. Excluir uma cotação (o diálogo agora diz *"Podrás restaurarla desde Archivados."*). Ela sai da
   lista; os três totais no topo (`Cotizado`/`Aprobado`/`Rechazado`) recalculam sem ela.
3. Clicar **Archivados** → a cotação está lá, com curso, código, valor, data e autor.
4. Clicar **Restaurar** → toast *"Registro restaurado."*; voltar a **Activos** e ela está de volta,
   com os anexos que tinha, e os totais recalculados de novo.
5. Excluir **todas** as cotações de um orçamento e conferir que o switch continua clicável na lista
   vazia (é o que o teste do Step 6 fixa).

- [ ] **Step 8: Commit**

```bash
git add frontend/src/features/commercial/api/useQuotes.ts \
        frontend/src/features/commercial/hooks/useBudgetQuotesArchived.ts \
        frontend/src/features/commercial/components/Budget/ArchivedQuotesList.tsx \
        frontend/src/features/commercial/components/Budget/QuotesList.tsx \
        frontend/src/features/commercial/components/Budget/QuotesList.test.tsx \
        frontend/src/features/commercial/components/Budget/BudgetDetailPage.tsx
git commit -m "feat(archive): arquivados da cotacao dentro do detalhe do orcamento"
```

**Fim da fase 1 (Commercial).** As duas listas de arquivados do módulo comercial existem, provadas no
navegador. A fase 2 (Identity) começa na Task 7.

---

## Fase 2 — Identity

### Task 7: O gate do redator e o `withTrashed()` que salva a emissão do certificado (D3)

**Files:**
- Create: `backend/app/Domains/Identity/Actions/ArchiveRedatorAction.php`
- Modify: `backend/app/Domains/Identity/Models/Redator.php`
- Modify: `backend/app/Domains/Operation/Models/Turma.php:81-84`
- Modify: `backend/app/Domains/Identity/Http/Controllers/RedatorController.php:53-58`
- Test: `backend/tests/Feature/Identity/RedatorArchiveTest.php`

**Interfaces:**
- Consumes: `ArchivesChildren` (`markAndDelete`/`restoreAndUnmark`, Task 2 já provou o trait em três
  níveis); a coluna `files.archived_with_parent` da Task 1.
- Produces: `ArchiveRedatorAction::execute(Redator $redator): void`; `Redator::lockRow(int $id): static`;
  `Redator::turmas(): BelongsToMany`. A Task 8 consome os três.

> **Esta é a task com peso legal do bloco.** `Turma::redatores()` é `belongsToMany` sem
> `withTrashed`, e o pivot `turma_redator` **não tem `deleted_at`**. Arquivar um redator hoje deixa a
> linha do pivot viva e faz o redator sumir de três sítios — o pior deles é
> `CertificateEligibility:118`, que passa a **recusar a emissão do certificado** de uma turma já
> concluída. É a lei §5.8 invertida: o arquivamento de um cadastro quebrando um documento com valor
> legal, em silêncio.

- [ ] **Step 1: Escrever os testes que falham**

Criar `backend/tests/Feature/Identity/RedatorArchiveTest.php`:

```php
<?php

namespace Tests\Feature\Identity;

use App\Domains\Identity\Models\Redator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\Support\Certification\IssuableEnrollmentBuilder;
use Tests\TestCase;

/**
 * O arquivamento do redator, nas duas pontas que a spec D3 separa: o gate cobre
 * turma EM ANDAMENTO; o `withTrashed()` da relação cobre turma CONCLUÍDA, que é
 * onde a emissão do certificado acontece. Nenhum resolve o caso do outro.
 */
class RedatorArchiveTest extends TestCase
{
    use RefreshDatabase;

    public function test_redator_com_turma_em_andamento_nao_arquiva(): void
    {
        $this->actingAsAdmin();
        $builder = IssuableEnrollmentBuilder::make()->turmaNaoConcluida()->create();
        $redator = $builder->redatorModel();

        $this->deleteJson("/api/redatores/{$redator->id}")
            ->assertUnprocessable()
            ->assertJsonPath(
                'errors.redator.0',
                'El redactor tiene clases en curso: concluye o reasigna antes de archivarlo.',
            );

        $this->assertNotSoftDeleted('redatores', ['id' => $redator->id]);
    }

    public function test_redator_de_turma_concluida_arquiva_e_leva_user_e_documentos(): void
    {
        $this->actingAsAdmin();
        $builder = IssuableEnrollmentBuilder::make()->create();
        $redator = $builder->redatorModel();

        $documento = $redator->documents()->create([
            'type' => 'cv',
            'path' => 'redatores/1/cv.pdf',
            'original_name' => 'cv.pdf',
            'mime' => 'application/pdf',
            'size' => 2048,
        ]);

        $this->deleteJson("/api/redatores/{$redator->id}")->assertNoContent();

        $this->assertSoftDeleted('redatores', ['id' => $redator->id]);
        $this->assertSoftDeleted('files', ['id' => $documento->id]);
        $this->assertDatabaseHas('files', ['id' => $documento->id, 'archived_with_parent' => true]);
        $this->assertSoftDeleted('users', ['id' => $redator->user_id]);
        $this->assertDatabaseHas('users', ['id' => $redator->user_id, 'archived_with_parent' => true]);
    }

    public function test_documento_arquivado_antes_do_redator_nao_e_marcado(): void
    {
        $this->actingAsAdmin();
        $builder = IssuableEnrollmentBuilder::make()->create();
        $redator = $builder->redatorModel();

        $antigo = $redator->documents()->create([
            'type' => 'cv',
            'path' => 'redatores/1/antigo.pdf',
            'original_name' => 'antigo.pdf',
            'mime' => 'application/pdf',
            'size' => 1024,
        ]);
        $antigo->delete();

        $this->deleteJson("/api/redatores/{$redator->id}")->assertNoContent();

        $this->assertDatabaseHas('files', ['id' => $antigo->id, 'archived_with_parent' => false]);
    }

    public function test_certificado_continua_emitindo_com_o_redator_arquivado(): void
    {
        // O CASO COM PESO LEGAL (spec D3). A turma está concluída, o aluno
        // aprovado e o template existe — a emissão é legítima. Sem o
        // `withTrashed()` em `Turma::redatores()` o pivot fica vivo, o redator
        // some da turma e `CertificateEligibility:118` recusa com 422.
        $this->actingAsAdmin();
        $builder = IssuableEnrollmentBuilder::make()->create();
        $redator = $builder->redatorModel();

        $this->deleteJson("/api/redatores/{$redator->id}")->assertNoContent();

        $this->postJson(
            "/api/enrollments/{$builder->enrollmentModel()->id}/certificate",
            ['redator_id' => $redator->id],
        )->assertCreated();
    }

    public function test_turma_enxerga_o_redator_arquivado_na_relacao(): void
    {
        $builder = IssuableEnrollmentBuilder::make()->create();
        $redator = $builder->redatorModel();
        $turma = $builder->turmaModel();

        $redator->delete();

        $this->assertTrue($turma->redatores()->whereKey($redator->id)->exists());
        $this->assertCount(1, $turma->fresh()->redatores);
    }

    public function test_a_cascata_roda_dentro_de_uma_transacao(): void
    {
        // `RefreshDatabase` já segura UMA transação; a da Action é a segunda.
        // Mesmo idioma da Task 2.
        $this->actingAsAdmin();
        $builder = IssuableEnrollmentBuilder::make()->create();
        $redator = $builder->redatorModel();

        $niveis = [];
        Redator::deleting(function () use (&$niveis) {
            $niveis[] = DB::transactionLevel();
        });

        $this->deleteJson("/api/redatores/{$redator->id}")->assertNoContent();

        $this->assertSame([2], $niveis);
    }
}
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
docker compose exec -T app php artisan test --filter=RedatorArchiveTest
```

Esperado: os seis vermelhos. O primeiro falha com `204` no lugar de `422` (não há gate),
`test_certificado_continua_emitindo…` com `422` no lugar de `201` (é o bug que a task conserta), e
`test_a_cascata_roda_dentro_de_uma_transacao` com `[1]` no lugar de `[2]`.

- [ ] **Step 3: `Turma::redatores()` passa a enxergar o arquivado**

Em `backend/app/Domains/Operation/Models/Turma.php`, trocar o método `redatores()` inteiro por:

```php
    /**
     * Arquivamento não apaga, e AQUI isso tem peso legal. O pivot `turma_redator`
     * não tem `deleted_at`: sem o `withTrashed()`, arquivar um redator deixa a
     * linha do pivot viva e o redator DESAPARECE da turma — a listagem passa a
     * exibir turma sem redator (`TurmaQueryBuilder::LISTING`), o painel a trata
     * como sem redator (`EmissionPanelQuery`) e `CertificateEligibility` RECUSA a
     * emissão do certificado de uma turma já concluída (spec D3).
     *
     * O gate da `ArchiveRedatorAction` cobre turma em andamento; este
     * `withTrashed` cobre a concluída, que é onde a emissão acontece. Os dois são
     * necessários — nenhum resolve o caso do outro.
     *
     * `withTrashed()` não é método de `BelongsToMany`: é a macro que o
     * `SoftDeletingScope` instala no Builder, e `Relation::__call` a encaminha e
     * devolve a própria relação. Por isso encadeia.
     */
    public function redatores(): BelongsToMany
    {
        return $this->belongsToMany(Redator::class, 'turma_redator')->withTimestamps()->withTrashed();
    }
```

- [ ] **Step 4: A cascata marcada e os dois membros novos do `Redator`**

Em `backend/app/Domains/Identity/Models/Redator.php`:

**4a.** Trocar o bloco de `use` do topo por:

```php
use App\Domains\Catalog\Models\Course;
use App\Domains\Operation\Models\Turma;
use App\Shared\Concerns\ArchivesChildren;
use App\Shared\Files\Models\File;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use OwenIt\Auditing\Auditable as AuditableTrait;
use OwenIt\Auditing\Contracts\Auditable;
```

**4b.** Trocar `use AuditableTrait, SoftDeletes;` por:

```php
    use ArchivesChildren, AuditableTrait, SoftDeletes;
```

**4c.** Trocar o `booted()` inteiro por:

```php
    protected static function booted(): void
    {
        static::deleting(function (Redator $redator) {
            if (! $redator->isForceDeleting()) {
                // Instância a instância: soft-delete pelo builder não audita.
                //
                // ENUMERA-E-APAGA, logo check-then-act: quem fecha a janela é a
                // `ArchiveRedatorAction`, que abre a transação e toma
                // `Redator::lockRow()` antes de chamar `delete()`. Não arquive
                // redator por fora dela.
                //
                // `markAndDelete` ignora filho já arquivado — `user()` é
                // `withTrashed()` e traria um User arquivado ANTES do redator
                // para dentro desta cascata (mesma armadilha do `Client`).
                $redator->documents()->get()->each(fn (File $f) => self::markAndDelete($f));

                if ($redator->user !== null) {
                    self::markAndDelete($redator->user);
                }
            }
        });

        static::restored(function (Redator $redator) {
            // `restored`, não `restoring`: os filhos saem ANTES do pai e voltam
            // DEPOIS dele. `onlyTrashed()` + a marca fazem voltar só quem ESTA
            // cascata arquivou.
            $redator->documents()->onlyTrashed()->where('archived_with_parent', true)->get()
                ->each(fn (File $f) => self::restoreAndUnmark($f));

            $user = $redator->user()->first();
            if ($user !== null && $user->trashed() && $user->archived_with_parent) {
                self::restoreAndUnmark($user);
            }
        });
    }
```

**4d.** Depois de `courses()`, acrescentar a relação e o lock:

```php
    /**
     * Turmas em que este redator está designado — inversa de `Turma::redatores()`.
     *
     * Identity aponta para Operation aqui pela mesma razão que `Student` já
     * aponta (`Student::enrollments()`): a pergunta "este redator tem trabalho
     * pendente?" é do arquivamento do redator, e um service em Operation só
     * empurraria a mesma travessia para outro lugar.
     *
     * SEM `withTrashed()`, ao contrário do lado de lá: turma arquivada não é
     * trabalho pendente e não pode bloquear o arquivamento do redator.
     */
    public function turmas(): BelongsToMany
    {
        return $this->belongsToMany(Turma::class, 'turma_redator')->withTimestamps();
    }

    /**
     * Trava a linha SEM julgar estado. `withTrashed()` porque o lock tem de ser
     * tomado mesmo sobre redator arquivado — é o estado de quem vai ser
     * restaurado, e pular a linha faria a operação seguir SEM mutex nenhum.
     *
     * No-op SILENCIOSO em sqlite (`SQLiteGrammar::compileLock()` devolve `''`).
     * Molde: `Client::lockRow()`.
     */
    public static function lockRow(int $redatorId): static
    {
        /** @var static $redator */
        $redator = static::withTrashed()->whereKey($redatorId)->lockForUpdate()->firstOrFail();

        return $redator;
    }
```

- [ ] **Step 5: A Action com o gate**

Criar `backend/app/Domains/Identity/Actions/ArchiveRedatorAction.php`:

```php
<?php

namespace App\Domains\Identity\Actions;

use App\Domains\Identity\Models\Redator;
use App\Domains\Operation\Enums\TurmaStatus;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Arquiva o redator (soft-delete), cascateando para documentos e User — o que o
 * hook `deleting` do model faz.
 *
 * Nasce com transação porque a cascata ENUMERA-E-APAGA (spec D9): sem ela, um
 * documento criado entre o `get()` e o commit sobrevive ATIVO sob um redator
 * arquivado. O `lockRow` fecha a outra ponta, entre duas requisições concorrentes.
 *
 * O GATE recusa redator com turma em andamento: trabalho pendente não some da
 * operação sem aviso (spec D3). Turma CONCLUÍDA não bloqueia — arquivar quem já
 * terminou é o caso normal, e é o `withTrashed()` de `Turma::redatores()` que
 * garante que o certificado dela continua emitindo.
 *
 * A mensagem é es-CL pelo mesmo precedente de `Turma::assertAcademicallyWritable()`:
 * a UI do cliente é es-CL e mensagem de validação chega à tela.
 */
class ArchiveRedatorAction
{
    public function execute(Redator $redator): void
    {
        DB::transaction(function () use ($redator) {
            $locked = Redator::lockRow($redator->id);

            // No-op idempotente: arquivar duas vezes não é erro, e o `deleting`
            // não roda de novo sobre registro já soft-deletado.
            if ($locked->trashed()) {
                return;
            }

            if ($locked->turmas()->where('status', TurmaStatus::EmAndamento)->exists()) {
                throw ValidationException::withMessages([
                    'redator' => 'El redactor tiene clases en curso: concluye o reasigna antes de archivarlo.',
                ]);
            }

            $locked->delete();
        });
    }
}
```

- [ ] **Step 6: O controller para de chamar `delete()` cru**

Em `backend/app/Domains/Identity/Http/Controllers/RedatorController.php`:

**6a.** Acrescentar ao bloco de `use`, em ordem alfabética (antes de `CreateRedatorAction`):

```php
use App\Domains\Identity\Actions\ArchiveRedatorAction;
```

**6b.** Trocar o `destroy()` inteiro por:

```php
    public function destroy(Redator $redator, ArchiveRedatorAction $action): Response
    {
        $action->execute($redator);

        return response()->noContent();
    }
```

- [ ] **Step 7: Rodar os testes**

```bash
docker compose exec -T app php artisan test --filter=RedatorArchiveTest
```

Esperado: 6 passed.

Depois, a suíte inteira — esta task muda uma relação lida por Operation e Certification, e é aí que
uma regressão apareceria:

```bash
docker compose exec -T app php artisan test
```

Esperado: verde. Se `CertificateEligibilityTest` ou `EmissionPanelQuery` virar vermelho, a causa é o
`withTrashed()` novo — leia a asserção antes de mexer: teste que exigia turma **sem** redator depois
de arquivar o redator estava fixando o bug, e a spec D3 o revoga; teste que conta redatores numa
turma com redator ativo não deveria mudar.

- [ ] **Step 8: Pint e commit**

```bash
cd backend && ./vendor/bin/pint \
  app/Domains/Identity/Actions/ArchiveRedatorAction.php \
  app/Domains/Identity/Models/Redator.php \
  app/Domains/Identity/Http/Controllers/RedatorController.php \
  app/Domains/Operation/Models/Turma.php \
  tests/Feature/Identity/RedatorArchiveTest.php
```

```bash
git add backend/app/Domains/Identity/Actions/ArchiveRedatorAction.php \
        backend/app/Domains/Identity/Models/Redator.php \
        backend/app/Domains/Identity/Http/Controllers/RedatorController.php \
        backend/app/Domains/Operation/Models/Turma.php \
        backend/tests/Feature/Identity/RedatorArchiveTest.php
git commit -m "feat(archive): gate de turma em andamento no redator e relacao com withTrashed"
```

---

### Task 8: Arquivados e restauração do redator (endpoints)

**Files:**
- Create: `backend/app/Domains/Identity/QueryBuilders/RedatorQueryBuilder.php`
- Create: `backend/app/Domains/Identity/Actions/RestoreRedatorAction.php`
- Create: `backend/app/Domains/Identity/Data/ArchivedRedatorData.php`
- Modify: `backend/app/Domains/Identity/Models/Redator.php`
- Modify: `backend/app/Domains/Identity/Http/Controllers/RedatorController.php`
- Modify: `backend/app/Domains/Identity/routes.php`
- Test: `backend/tests/Feature/Identity/RedatorArchiveEndpointTest.php`

**Interfaces:**
- Consumes: `Redator::lockRow()` e a cascata marcada da Task 7; `LoadsCascadedChildren::asOfArchiving()`;
  `ArchiveTrailQuery::archivedBy()`.
- Produces: `RedatorQueryBuilder::LISTING`; `Redator::loadListingData(): static`;
  `RestoreRedatorAction::execute(Redator $redator): Redator`; `ArchivedRedatorData`
  (`{ redator: RedatorData, archived_at: string, archived_by: ?string }`), consumido pela Task 10 no
  frontend.

> **P4 aplicado.** `app/Domains/Identity/QueryBuilders/` existe e está **vazio** — `Redator` nunca teve
> builder próprio; o `index` faz `Redator::with([...])` com a lista inline. A lista passa a morar no
> builder porque a listagem de arquivados precisa da MESMA lista com `asOfArchiving` por cima, e duas
> cópias da lista divergiriam no primeiro campo novo (B5).

- [ ] **Step 1: Escrever os testes que falham**

Criar `backend/tests/Feature/Identity/RedatorArchiveEndpointTest.php`:

```php
<?php

namespace Tests\Feature\Identity;

use App\Domains\Identity\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\Certification\IssuableEnrollmentBuilder;
use Tests\TestCase;

class RedatorArchiveEndpointTest extends TestCase
{
    use RefreshDatabase;

    public function test_listagem_de_arquivados_nao_vaza_ativo_e_traz_data_e_autor(): void
    {
        $autor = $this->actingAsAdmin();
        $autor->update(['name' => 'Ana Torres']);

        $vivo = IssuableEnrollmentBuilder::make()->create()->redatorModel();
        $arquivado = IssuableEnrollmentBuilder::make()->create()->redatorModel();
        $arquivado->delete();

        $this->getJson('/api/redatores/archived')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.redator.id', $arquivado->id)
            ->assertJsonPath('0.archived_by', 'Ana Torres');

        $this->getJson('/api/redatores')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.id', $vivo->id);
    }

    public function test_arquivado_mostra_os_documentos_que_a_cascata_levou(): void
    {
        // Sem o eager load com `withTrashed()` a linha aparece com ZERO
        // documentos — a cascata acabou de arquivá-los e o global scope os
        // esconde. O operador reconhece o redator por eles antes de restaurar
        // (Q-8 do review de 2026-08-18).
        $this->actingAsAdmin();
        $redator = IssuableEnrollmentBuilder::make()->create()->redatorModel();

        $redator->documents()->create([
            'type' => 'cv',
            'path' => 'redatores/1/cv.pdf',
            'original_name' => 'cv.pdf',
            'mime' => 'application/pdf',
            'size' => 2048,
        ]);

        $redator->delete();

        $this->getJson('/api/redatores/archived')
            ->assertOk()
            ->assertJsonCount(1, '0.redator.documents');
    }

    public function test_arquivado_nao_mostra_o_documento_arquivado_antes_do_pai(): void
    {
        $this->actingAsAdmin();
        $redator = IssuableEnrollmentBuilder::make()->create()->redatorModel();

        $antigo = $redator->documents()->create([
            'type' => 'cv',
            'path' => 'redatores/1/antigo.pdf',
            'original_name' => 'antigo.pdf',
            'mime' => 'application/pdf',
            'size' => 1024,
        ]);
        $antigo->delete();

        $redator->delete();

        $this->getJson('/api/redatores/archived')
            ->assertOk()
            ->assertJsonCount(0, '0.redator.documents');
    }

    public function test_restore_devolve_200_e_traz_user_e_documentos_de_volta(): void
    {
        $this->actingAsAdmin();
        $redator = IssuableEnrollmentBuilder::make()->create()->redatorModel();

        $documento = $redator->documents()->create([
            'type' => 'cv',
            'path' => 'redatores/1/cv.pdf',
            'original_name' => 'cv.pdf',
            'mime' => 'application/pdf',
            'size' => 2048,
        ]);

        $redator->delete();

        $this->postJson("/api/redatores/{$redator->id}/restore")
            ->assertOk()
            ->assertJsonPath('id', $redator->id);

        $this->assertNotSoftDeleted('redatores', ['id' => $redator->id]);
        $this->assertDatabaseHas('files', ['id' => $documento->id, 'deleted_at' => null, 'archived_with_parent' => false]);
        $this->assertDatabaseHas('users', ['id' => $redator->user_id, 'deleted_at' => null, 'archived_with_parent' => false]);
    }

    public function test_restore_nao_traz_de_volta_o_documento_arquivado_antes(): void
    {
        $this->actingAsAdmin();
        $redator = IssuableEnrollmentBuilder::make()->create()->redatorModel();

        $antigo = $redator->documents()->create([
            'type' => 'cv',
            'path' => 'redatores/1/antigo.pdf',
            'original_name' => 'antigo.pdf',
            'mime' => 'application/pdf',
            'size' => 1024,
        ]);
        $antigo->delete();

        $redator->delete();
        $this->postJson("/api/redatores/{$redator->id}/restore")->assertOk();

        $this->assertSoftDeleted('files', ['id' => $antigo->id]);
    }

    public function test_restore_de_redator_ativo_da_404(): void
    {
        $this->actingAsAdmin();
        $redator = IssuableEnrollmentBuilder::make()->create()->redatorModel();

        $this->postJson("/api/redatores/{$redator->id}/restore")->assertNotFound();
    }

    public function test_sem_a_permissao_de_restore_da_403(): void
    {
        $this->seed(RolePermissionSeeder::class);

        $user = User::factory()->create(['type' => 'admin', 'is_active' => true]);
        $user->givePermissionTo('identity.user.view');
        $this->actingAs($user, 'web');

        $redator = IssuableEnrollmentBuilder::make()->create()->redatorModel();
        $redator->delete();

        // Vê a lista (tem a `view`)...
        $this->getJson('/api/redatores/archived')->assertOk();
        // ...mas não restaura.
        $this->postJson("/api/redatores/{$redator->id}/restore")->assertForbidden();
    }

    public function test_archived_exige_a_permissao_de_view(): void
    {
        $this->seed(RolePermissionSeeder::class);

        $user = User::factory()->redator()->create(['is_active' => true]);
        $user->assignRole('redator');
        $this->actingAs($user, 'web');

        $this->getJson('/api/redatores/archived')->assertForbidden();
    }
}
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
docker compose exec -T app php artisan test --filter=RedatorArchiveEndpointTest
```

Esperado: 8 vermelhos. Os de `/api/redatores/archived` falham com **404** — a rota não existe e
`redatores/{redator}` tenta resolver `archived` como id.

- [ ] **Step 3: O builder**

Criar `backend/app/Domains/Identity/QueryBuilders/RedatorQueryBuilder.php`:

```php
<?php

namespace App\Domains\Identity\QueryBuilders;

use App\Shared\Concerns\LoadsCascadedChildren;
use Illuminate\Database\Eloquent\Builder;

/**
 * Projeção do redator: `RedatorData::fromModel` achata os campos do `user`, lê
 * `courses` e `documents`, e o último acesso vem de `user.latestLogin`. A lista
 * do que carregar mora AQUI, não inline no controller (B5) — a listagem de
 * arquivados precisa da MESMA lista com `asOfArchiving` por cima.
 */
class RedatorQueryBuilder extends Builder
{
    use LoadsCascadedChildren;

    public const LISTING = ['user.latestLogin', 'courses', 'documents'];

    /**
     * As coleções que a cascata de arquivamento leva junto. `user` fica fora
     * porque a relação já é `withTrashed()` e nunca some da projeção; `courses`
     * é pivot de habilitação, que a cascata não toca.
     */
    private const CASCADED = ['documents'];

    public function withListingData(): static
    {
        return $this->with(self::LISTING);
    }

    /** Ver `LoadsCascadedChildren::asOfArchiving()` — por que a lista de arquivados não usa `withListingData()`. */
    public function withArchivedListingData(): static
    {
        return $this
            ->with(array_values(array_diff(self::LISTING, self::CASCADED)))
            ->with(self::asOfArchiving(self::CASCADED));
    }
}
```

- [ ] **Step 4: O model aponta para o builder**

Em `backend/app/Domains/Identity/Models/Redator.php`:

**4a.** Acrescentar aos `use` do topo:

```php
use App\Domains\Identity\QueryBuilders\RedatorQueryBuilder;
use Illuminate\Database\Query\Builder as QueryBuilder;
```

**4b.** No fim da classe, depois de `lockRow()`:

```php
    /**
     * Contraparte de instância do `withListingData()` — mesmo molde de `Client`,
     * `Course` e `Turma`. É daqui que o controller e a `RestoreRedatorAction`
     * carregam, e por isso a carga da projeção tem um dono só.
     */
    public function loadListingData(): static
    {
        return $this->load(RedatorQueryBuilder::LISTING);
    }

    /** @param  QueryBuilder  $query */
    public function newEloquentBuilder($query): RedatorQueryBuilder
    {
        return new RedatorQueryBuilder($query);
    }
```

- [ ] **Step 5: A Action de restore**

Criar `backend/app/Domains/Identity/Actions/RestoreRedatorAction.php`:

```php
<?php

namespace App\Domains\Identity\Actions;

use App\Domains\Identity\Models\Redator;
use Illuminate\Support\Facades\DB;

/**
 * Restaura o redator e, pelo hook `restored` do model, os documentos e o User
 * que a cascata de arquivamento marcou.
 *
 * Simétrica da `ArchiveRedatorAction`, e pelo mesmo motivo: o enumera-e-restaura
 * tem a mesma janela de check-then-act do enumera-e-apaga.
 *
 * NÃO tem gate. O gate do arquivar pergunta por turma em andamento, que é razão
 * para não SAIR da operação; voltar para ela nunca é o problema. Molde:
 * `RestoreClientAction`.
 */
class RestoreRedatorAction
{
    public function execute(Redator $redator): Redator
    {
        return DB::transaction(function () use ($redator) {
            $locked = Redator::lockRow($redator->id);

            // No-op idempotente: a rota resolve por `onlyTrashed()`, então chegar
            // aqui com registro ativo significa que alguém restaurou entre o
            // binding e o lock. Restaurar duas vezes não é erro.
            if (! $locked->trashed()) {
                return $locked->loadListingData();
            }

            $locked->restore();

            return $locked->loadListingData();
        });
    }
}
```

- [ ] **Step 6: O DTO composto**

Criar `backend/app/Domains/Identity/Data/ArchivedRedatorData.php`:

```php
<?php

namespace App\Domains\Identity\Data;

use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * Composição, não extensão: `RedatorData` NÃO muda, então o contrato da listagem
 * ativa fica intacto e nenhum campo anulável de arquivamento o polui (molde D8).
 */
#[TypeScript]
class ArchivedRedatorData extends Data
{
    public function __construct(
        public RedatorData $redator,
        public string $archived_at,
        /** `null` quando a audit `deleted` não tem usuário (seeder, console). */
        public ?string $archived_by,
    ) {}
}
```

- [ ] **Step 7: Os dois endpoints**

Em `backend/app/Domains/Identity/Http/Controllers/RedatorController.php`:

**7a.** Acrescentar aos `use`:

```php
use App\Domains\Identity\Actions\RestoreRedatorAction;
use App\Domains\Identity\Data\ArchivedRedatorData;
use App\Shared\Audit\ArchiveTrailQuery;
use Illuminate\Http\JsonResponse;
```

**7b.** Trocar as duas linhas de `middleware()` por:

```php
            new Middleware('permission:identity.user.view', only: ['index', 'show', 'archived']),
            new Middleware('permission:identity.user.create', only: ['store']),
            new Middleware('permission:identity.user.update', only: ['update']),
            new Middleware('permission:identity.user.delete', only: ['destroy']),
            new Middleware('permission:identity.user.restore', only: ['restore']),
```

**7c.** Trocar o `index()` por (a lista inline vai para o builder):

```php
    /** @return array<RedatorData> */
    public function index(): array
    {
        return Redator::query()->withListingData()->get()
            ->map(fn (Redator $r) => RedatorData::fromModel($r))
            ->all();
    }
```

**7d.** Trocar o `show()` por:

```php
    public function show(Redator $redator): RedatorData
    {
        return RedatorData::fromModel($redator->loadListingData());
    }
```

`store()` e `update()` **não mudam**: as Actions devolvem o model já hidratado pelo caminho de
escrita, e trocá-lo aqui seria mexer em código que esta task não precisa tocar.

**7e.** Depois de `destroy()`, acrescentar:

```php
    /** @return array<ArchivedRedatorData> */
    public function archived(): array
    {
        $redatores = Redator::onlyTrashed()->withArchivedListingData()->get();

        $autores = ArchiveTrailQuery::archivedBy(Redator::class, $redatores->pluck('id')->all());

        return $redatores
            ->map(fn (Redator $r) => new ArchivedRedatorData(
                redator: RedatorData::fromModel($r),
                archived_at: $r->deleted_at->toIso8601String(),
                archived_by: $autores[$r->id] ?? null,
            ))
            ->all();
    }

    public function restore(int $redator, RestoreRedatorAction $action): JsonResponse
    {
        // Resolvido à mão, não por binding: o binding padrão aplica o global
        // scope de SoftDeletes e nunca acharia um arquivado. `onlyTrashed()`
        // também dá o 404 de graça sobre registro ATIVO (molde D5).
        $model = Redator::onlyTrashed()->whereKey($redator)->firstOrFail();

        // 200, não 201: restaurar devolve um registro que já existia.
        return RedatorData::fromModel($action->execute($model))
            ->toResponse(request())
            ->setStatusCode(Response::HTTP_OK);
    }
```

- [ ] **Step 8: As rotas**

Em `backend/app/Domains/Identity/routes.php`, **antes** do `Route::apiResource('redatores', ...)`:

```php
    // ANTES do apiResource: `redatores/{redator}` casaria com `archived` e o
    // binding daria 404 tentando resolver a palavra como id.
    Route::get('redatores/archived', [RedatorController::class, 'archived']);
    Route::post('redatores/{redator}/restore', [RedatorController::class, 'restore'])
        ->whereNumber('redator');
```

`whereNumber` pelo mesmo motivo do Q-6 do review anterior: `restore(int $redator, ...)` estoura
`TypeError` → 500 antes de qualquer consulta se a rota aceitar texto.

- [ ] **Step 9: Rodar os testes**

```bash
docker compose exec -T app php artisan test --filter=RedatorArchiveEndpointTest
docker compose exec -T app php artisan test --filter=Identity
```

Esperado: 8 passed no primeiro, verde no segundo.

- [ ] **Step 10: Pint e commit**

```bash
cd backend && ./vendor/bin/pint \
  app/Domains/Identity/QueryBuilders/RedatorQueryBuilder.php \
  app/Domains/Identity/Actions/RestoreRedatorAction.php \
  app/Domains/Identity/Data/ArchivedRedatorData.php \
  app/Domains/Identity/Models/Redator.php \
  app/Domains/Identity/Http/Controllers/RedatorController.php \
  app/Domains/Identity/routes.php \
  tests/Feature/Identity/RedatorArchiveEndpointTest.php
```

```bash
git add backend/app/Domains/Identity/QueryBuilders/RedatorQueryBuilder.php \
        backend/app/Domains/Identity/Actions/RestoreRedatorAction.php \
        backend/app/Domains/Identity/Data/ArchivedRedatorData.php \
        backend/app/Domains/Identity/Models/Redator.php \
        backend/app/Domains/Identity/Http/Controllers/RedatorController.php \
        backend/app/Domains/Identity/routes.php \
        backend/tests/Feature/Identity/RedatorArchiveEndpointTest.php
git commit -m "feat(archive): arquivados e restauracao do redator"
```

---

### Task 9: Arquivados e restauração do usuário staff, filtrando `type === 'admin'` (D10)

**Files:**
- Create: `backend/app/Domains/Identity/Actions/RestoreStaffUserAction.php`
- Create: `backend/app/Domains/Identity/Data/ArchivedUserData.php`
- Modify: `backend/app/Domains/Identity/Http/Controllers/UserController.php`
- Modify: `backend/app/Domains/Identity/routes.php`
- Test: `backend/tests/Feature/Identity/StaffUserArchiveEndpointTest.php`

**Interfaces:**
- Consumes: `ArchiveTrailQuery::archivedBy()`; `UserData::fromModel()`.
- Produces: `RestoreStaffUserAction::execute(User $user): User`; `ArchivedUserData`
  (`{ user: UserData, archived_at: string, archived_by: ?string }`), consumido pela Task 10.

> **Sem permissão nova, e o motivo é medido (D7).** O `destroy` do staff é guardado por
> `identity.access.manage`, que está em `PermissionCatalog::SEGREGATED` — exclusiva do superadmin, não
> compõe role customizada (ADR-07). Um `identity.user.restore` normal deixaria **restaurar mais frouxo
> que arquivar**. O `restore` entra na MESMA linha de `Middleware` do `destroy`.

> **`User` é folha.** Não cascateia para ninguém: quem cascateia PARA ele é `Client` e `Redator`. Por
> isso não há `QueryBuilder` novo, nem `asOfArchiving`, nem `lockRow` — a Action abre transação só
> para o `restore()` e a audit `restored` serem atômicos.

- [ ] **Step 1: Escrever os testes que falham**

Criar `backend/tests/Feature/Identity/StaffUserArchiveEndpointTest.php`:

```php
<?php

namespace Tests\Feature\Identity;

use App\Domains\Identity\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\CreatesDomainRecords;
use Tests\TestCase;

class StaffUserArchiveEndpointTest extends TestCase
{
    use CreatesDomainRecords;
    use RefreshDatabase;

    public function test_listagem_de_arquivados_traz_data_e_autor_e_nao_vaza_ativo(): void
    {
        $autor = $this->actingAsSuperadmin();
        $autor->update(['name' => 'Ana Torres']);

        $arquivado = User::factory()->create(['type' => 'admin', 'is_active' => true, 'name' => 'Bruno Salas']);
        $arquivado->assignRole('admin');

        $this->deleteJson("/api/users/{$arquivado->id}")->assertNoContent();

        $this->getJson('/api/users/archived')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.user.id', $arquivado->id)
            ->assertJsonPath('0.user.name', 'Bruno Salas')
            ->assertJsonPath('0.archived_by', 'Ana Torres');

        // O autor continua ativo e fora da lista de arquivados.
        $this->getJson('/api/users')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.id', $autor->id);
    }

    public function test_arquivados_nao_vaza_user_de_cliente_arquivado_por_cascata(): void
    {
        // O caso que a spec D10 existe para impedir: `Client::booted()` arquiva o
        // User do cliente junto. Sem o filtro por `type`, ele apareceria na lista
        // de staff — um registro que a tela nem sabe representar, e cuja
        // restauração isolada quebraria a consistência com o agregado pai.
        $this->actingAsSuperadmin();

        $client = $this->makeClientWithUser(['legal_name' => 'Empresa Ltda'], ['rut' => '12.345.678-5']);
        $client->delete();

        $this->assertSoftDeleted('users', ['id' => $client->user_id]);

        $this->getJson('/api/users/archived')
            ->assertOk()
            ->assertJsonCount(0);
    }

    public function test_restore_devolve_200_e_reativa_o_usuario(): void
    {
        $this->actingAsSuperadmin();

        $alvo = User::factory()->create(['type' => 'admin', 'is_active' => true]);
        $alvo->assignRole('admin');
        $this->deleteJson("/api/users/{$alvo->id}")->assertNoContent();

        $this->postJson("/api/users/{$alvo->id}/restore")
            ->assertOk()
            ->assertJsonPath('id', $alvo->id)
            ->assertJsonPath('role', 'admin');

        $this->assertNotSoftDeleted('users', ['id' => $alvo->id]);
    }

    public function test_restore_de_user_nao_admin_da_404(): void
    {
        $this->actingAsSuperadmin();

        $client = $this->makeClientWithUser([], ['rut' => '15.678.901-6']);
        $client->delete();

        $this->postJson("/api/users/{$client->user_id}/restore")->assertNotFound();
    }

    public function test_restore_de_user_ativo_da_404(): void
    {
        $autor = $this->actingAsSuperadmin();

        $this->postJson("/api/users/{$autor->id}/restore")->assertNotFound();
    }

    public function test_admin_comum_ve_a_lista_mas_nao_restaura(): void
    {
        // `identity.access.manage` é SEGREGADA: admin não a tem. Ele vê a lista
        // (tem `identity.user.view`) e é recusado no restore, exatamente como já
        // é recusado no arquivar (spec D7).
        $superadmin = $this->actingAsSuperadmin();
        $alvo = User::factory()->create(['type' => 'admin', 'is_active' => true]);
        $alvo->assignRole('admin');
        $this->deleteJson("/api/users/{$alvo->id}")->assertNoContent();

        $admin = User::factory()->create(['type' => 'admin', 'is_active' => true]);
        $admin->assignRole('admin');
        $this->actingAs($admin, 'web');

        $this->getJson('/api/users/archived')->assertOk();
        $this->postJson("/api/users/{$alvo->id}/restore")->assertForbidden();

        $this->assertSoftDeleted('users', ['id' => $alvo->id]);
        $this->assertNotNull($superadmin->id);
    }

    public function test_archived_exige_a_permissao_de_view(): void
    {
        $this->seed(RolePermissionSeeder::class);

        $user = User::factory()->redator()->create(['is_active' => true]);
        $user->assignRole('redator');
        $this->actingAs($user, 'web');

        $this->getJson('/api/users/archived')->assertForbidden();
    }
}
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
docker compose exec -T app php artisan test --filter=StaffUserArchiveEndpointTest
```

Esperado: 7 vermelhos, os de `/api/users/archived` com **404** (a rota não existe e
`users/{user}` tenta resolver `archived` como id).

- [ ] **Step 3: A Action de restore**

Criar `backend/app/Domains/Identity/Actions/RestoreStaffUserAction.php`:

```php
<?php

namespace App\Domains\Identity\Actions;

use App\Domains\Identity\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Restaura o usuário staff arquivado.
 *
 * SEM cascata e SEM lock de linha: `User` é folha do arquivamento — quem
 * cascateia PARA ele é `Client` e `Redator`, nunca o contrário. Não há
 * enumera-e-restaura, logo não há a janela de check-then-act que obriga o mutex
 * em `RestoreClientAction`/`RestoreRedatorAction`.
 *
 * A transação fica pelo outro motivo: o `restore()` escreve a linha E a audit
 * `restored` (ADR-08), e as duas ou entram juntas ou não entram.
 *
 * SEM guard, também: o `SuperadminGuard` da `DeleteStaffUserAction` existe para
 * impedir que o último superadmin ativo SAIA. Voltar nunca é esse problema.
 */
class RestoreStaffUserAction
{
    public function execute(User $user): User
    {
        return DB::transaction(function () use ($user) {
            // No-op idempotente: a rota resolve por `onlyTrashed()`, então chegar
            // aqui com registro ativo significa que alguém restaurou entre o
            // binding e esta linha. Restaurar duas vezes não é erro.
            if ($user->trashed()) {
                $user->restore();
            }

            return $user->load(['roles', 'latestLogin']);
        });
    }
}
```

- [ ] **Step 4: O DTO composto**

Criar `backend/app/Domains/Identity/Data/ArchivedUserData.php`:

```php
<?php

namespace App\Domains\Identity\Data;

use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * Composição, não extensão: `UserData` NÃO muda, então o contrato da listagem
 * ativa fica intacto e nenhum campo anulável de arquivamento o polui (molde D8).
 */
#[TypeScript]
class ArchivedUserData extends Data
{
    public function __construct(
        public UserData $user,
        public string $archived_at,
        /** `null` quando a audit `deleted` não tem usuário (seeder, console). */
        public ?string $archived_by,
    ) {}
}
```

- [ ] **Step 5: Os dois endpoints**

Em `backend/app/Domains/Identity/Http/Controllers/UserController.php`:

**5a.** Acrescentar aos `use`:

```php
use App\Domains\Identity\Actions\RestoreStaffUserAction;
use App\Domains\Identity\Data\ArchivedUserData;
use App\Shared\Audit\ArchiveTrailQuery;
use Illuminate\Http\JsonResponse;
```

**5b.** Trocar as duas linhas de `middleware()` por:

```php
            new Middleware('permission:identity.user.view', only: ['index', 'show', 'archived']),
            // `restore` entra na MESMA linha do `destroy`, e não numa permissão
            // própria: `identity.access.manage` é SEGREGADA (ADR-07), e um
            // `identity.user.restore` normal deixaria restaurar mais frouxo que
            // arquivar — alguém devolveria um staff que nunca teria podido
            // arquivar (spec D7).
            new Middleware('permission:identity.access.manage', only: ['store', 'update', 'destroy', 'restore']),
```

**5c.** No fim da classe, depois de `destroy()`:

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

        $autores = ArchiveTrailQuery::archivedBy(User::class, $users->pluck('id')->all());

        return $users
            ->map(fn (User $u) => new ArchivedUserData(
                user: UserData::fromModel($u),
                archived_at: $u->deleted_at->toIso8601String(),
                archived_by: $autores[$u->id] ?? null,
            ))
            ->all();
    }

    public function restore(int $user, RestoreStaffUserAction $action): JsonResponse
    {
        // Resolvido à mão, não por binding: o binding padrão aplica o global
        // scope de SoftDeletes e nunca acharia um arquivado. `onlyTrashed()`
        // também dá o 404 de graça sobre registro ATIVO (molde D5).
        $model = User::onlyTrashed()->whereKey($user)->firstOrFail();

        // O mesmo `abort_unless` de show/update/destroy: user de cliente/redator/
        // aluno arquivado por cascata não é restaurável por esta rota.
        abort_unless($model->type === 'admin', 404);

        // 200, não 201: restaurar devolve um registro que já existia.
        return UserData::fromModel($action->execute($model))
            ->toResponse(request())
            ->setStatusCode(Response::HTTP_OK);
    }
```

`Response` já está importado no arquivo (é o retorno de `destroy()`), então `Response::HTTP_OK`
resolve sem import novo.

- [ ] **Step 6: As rotas**

Em `backend/app/Domains/Identity/routes.php`, **antes** do `Route::apiResource('users', ...)`:

```php
    // ANTES do apiResource, pelo mesmo motivo de `redatores/archived`.
    Route::get('users/archived', [UserController::class, 'archived']);
    Route::post('users/{user}/restore', [UserController::class, 'restore'])
        ->whereNumber('user');
```

- [ ] **Step 7: Rodar os testes**

```bash
docker compose exec -T app php artisan test --filter=StaffUserArchiveEndpointTest
docker compose exec -T app php artisan test --filter=Identity
```

Esperado: 7 passed no primeiro, verde no segundo.

**Fim do backend da fase 2.** Rode a suíte inteira antes de seguir:

```bash
docker compose exec -T app php artisan test
```

- [ ] **Step 8: Pint e commit**

```bash
cd backend && ./vendor/bin/pint \
  app/Domains/Identity/Actions/RestoreStaffUserAction.php \
  app/Domains/Identity/Data/ArchivedUserData.php \
  app/Domains/Identity/Http/Controllers/UserController.php \
  app/Domains/Identity/routes.php \
  tests/Feature/Identity/StaffUserArchiveEndpointTest.php
```

```bash
git add backend/app/Domains/Identity/Actions/RestoreStaffUserAction.php \
        backend/app/Domains/Identity/Data/ArchivedUserData.php \
        backend/app/Domains/Identity/Http/Controllers/UserController.php \
        backend/app/Domains/Identity/routes.php \
        backend/tests/Feature/Identity/StaffUserArchiveEndpointTest.php
git commit -m "feat(archive): arquivados e restauracao do usuario staff filtrando admin"
```

---

### Task 10: Frontend do Identity — arquivar e restaurar redator e usuário staff

**Files:**
- Modify: `frontend/src/shared/api/redatoresApi.ts`
- Modify: `frontend/src/shared/api/usersApi.ts`
- Create: `frontend/src/features/identity/hooks/useRedatoresArchived.ts`
- Create: `frontend/src/features/identity/hooks/useUsersArchived.ts`
- Create: `frontend/src/features/identity/components/Redator/RedatorRowActions.tsx`
- Create: `frontend/src/features/identity/components/Admin/UserRowActions.tsx`
- Modify: `frontend/src/features/identity/components/Redator/RedatoresTable.tsx`
- Modify: `frontend/src/features/identity/components/Admin/UsersTable.tsx`
- Modify: `frontend/src/features/identity/components/PeoplePage.tsx`
- Modify: `frontend/src/features/identity/components/AdministracionPage.tsx`

**Interfaces:**
- Consumes: `ArchivedRedatorData` (Task 8) e `ArchivedUserData` (Task 9), em
  `@shared/types/generated` depois do `typescript:transform`; `useArchivedPage`, `ArchiveSwitch`,
  `ConfirmDialog`.
- Produces: `RedatorRow` (exportado de `RedatoresTable.tsx`) e `UserRow` (de `UsersTable.tsx`),
  ambos `TData & { archived_at?: string; archived_by?: string | null }`.

> **P7 aplicado — esta task traz as DUAS metades.** Nenhuma tela de Identity expõe hoje o
> arquivamento; só a visão de Arquivados nasceria impossível de exercitar. O botão `pi pi-inbox` +
> `ConfirmDialog` entra junto, no molde exato de `ClientRowActions`/`CommercialPage`. **Nenhuma chave
> de locale nova** — `archive.*` já cobre confirmar, toast, colunas e ações nos três arquivos.

- [ ] **Step 1: Regenerar os tipos**

```bash
docker compose exec -T app php artisan typescript:transform
grep -n 'ArchivedRedatorData\|ArchivedUserData' frontend/src/shared/types/generated.ts
```

Esperado: os dois tipos presentes. Ausentes → as Tasks 8/9 não estão completas.

- [ ] **Step 2: Segundo genérico nos dois clientes REST**

`frontend/src/shared/api/redatoresApi.ts` inteiro:

```ts
import { createCrudResource } from './createCrudResource'
import type { ArchivedRedatorData, RedatorData } from '@shared/types/generated'

/** Cliente REST do recurso `redatores`. Camada de dados compartilhada (ADR-18):
 * o catálogo lista redatores para exibir/habilitar e a feature identity edita.
 * Glue burro sobre a rota pública — regra e telas ficam nas features.
 *
 * O segundo genérico é o que faz `useArchivedList`/`useRestore` falarem o DTO
 * composto de arquivados (spec D12). */
export const redatoresApi = createCrudResource<RedatorData, ArchivedRedatorData>('redatores')
```

`frontend/src/shared/api/usersApi.ts` inteiro:

```ts
import { createCrudResource } from './createCrudResource'
import type { ArchivedUserData, UserData } from '@shared/types/generated'

/** Cliente REST do recurso `users` (staff, type=admin). Camada compartilhada
 * (ADR-18): a feature identity edita; glue burro sobre a rota REST.
 *
 * O segundo genérico é o que faz `useArchivedList`/`useRestore` falarem o DTO
 * composto de arquivados (spec D12). */
export const usersApi = createCrudResource<UserData, ArchivedUserData>('users')
```

- [ ] **Step 3: Os dois hooks de página**

Criar `frontend/src/features/identity/hooks/useRedatoresArchived.ts`:

```ts
import { useTranslation } from 'react-i18next'
import { useArchivedPage } from '@shared/hooks'
import { useToast } from '@shared/ui'
import { redatoresApi } from '@shared/api/redatoresApi'
import { problemMessage } from '@shared/api/problemMessage'
import type { ArchivedRedatorData, RedatorData } from '@shared/types/generated'

/** Molde: `useClientsArchived`. É este arquivo que mantém `redatoresApi` fora de
 * `PeoplePage` (lint `no-restricted-syntax`).
 *
 * O TOAST mora aqui nos DOIS sentidos, e no redator o `onError` não é
 * conveniência: o arquivar tem gate de turma em andamento (spec D3) e devolve
 * **422** com a frase do que fazer. Sem o `onError`, o clique não muda nada na
 * tela e o operador não descobre por que (Q-2 do review de 2026-08-18). */
export function useRedatoresArchived() {
  const { t } = useTranslation()
  const toast = useToast()
  const page = useArchivedPage<RedatorData, ArchivedRedatorData>(redatoresApi, (row) => row.redator)
  const archiveMutation = redatoresApi.useRemove()

  const falhou = (problem: Parameters<typeof problemMessage>[0]) => {
    const message = problemMessage(problem)
    if (message) toast.error(message)
  }

  return {
    ...page,
    restore: (id: number) =>
      page.restore(id, {
        onSuccess: () => toast.success(t('archive.restoredToast')),
        onError: falhou,
      }),
    /** `onSuccess` do chamador fecha o ConfirmDialog — ele só fecha no sucesso,
     * para o 422 do gate ter onde pousar. */
    archive: (id: number, options?: { onSuccess?: () => void }) =>
      archiveMutation.mutate(id, {
        onSuccess: () => {
          toast.success(t('archive.archivedToast'))
          options?.onSuccess?.()
        },
        onError: falhou,
      }),
    archiving: archiveMutation.isPending,
  }
}
```

Criar `frontend/src/features/identity/hooks/useUsersArchived.ts` — **o mesmo arquivo com outros
nomes**. Repetido inteiro de propósito: quem implementar a task pode estar lendo só esta.

```ts
import { useTranslation } from 'react-i18next'
import { useArchivedPage } from '@shared/hooks'
import { useToast } from '@shared/ui'
import { usersApi } from '@shared/api/usersApi'
import { problemMessage } from '@shared/api/problemMessage'
import type { ArchivedUserData, UserData } from '@shared/types/generated'

/** Molde: `useClientsArchived`. É este arquivo que mantém `usersApi` fora de
 * `AdministracionPage` (lint `no-restricted-syntax`).
 *
 * O `onError` importa em especial aqui: arquivar o último superadmin ativo é
 * recusado com 422 pelo `SuperadminGuard`, e sem o toast o clique fica mudo. */
export function useUsersArchived() {
  const { t } = useTranslation()
  const toast = useToast()
  const page = useArchivedPage<UserData, ArchivedUserData>(usersApi, (row) => row.user)
  const archiveMutation = usersApi.useRemove()

  const falhou = (problem: Parameters<typeof problemMessage>[0]) => {
    const message = problemMessage(problem)
    if (message) toast.error(message)
  }

  return {
    ...page,
    restore: (id: number) =>
      page.restore(id, {
        onSuccess: () => toast.success(t('archive.restoredToast')),
        onError: falhou,
      }),
    archive: (id: number, options?: { onSuccess?: () => void }) =>
      archiveMutation.mutate(id, {
        onSuccess: () => {
          toast.success(t('archive.archivedToast'))
          options?.onSuccess?.()
        },
        onError: falhou,
      }),
    archiving: archiveMutation.isPending,
  }
}
```

- [ ] **Step 4: As ações de linha**

Criar `frontend/src/features/identity/components/Redator/RedatorRowActions.tsx`:

```tsx
import { useTranslation } from 'react-i18next'
import { usePermissions } from '@shared/hooks'
import { AppButton } from '@shared/ui'
import type { RedatorData } from '@shared/types/generated'

/**
 * Ações por linha da tabela de redatores. Molde exato do `ClientRowActions`:
 * extraído da tabela porque a célula ramifica por modo, e a régua de 150 linhas
 * de `features/<x>/components/` vale sem exceção.
 *
 * Em `archived` o olho SAI: `GET /api/redatores/{redator}` usa o binding padrão e
 * não enxerga soft-deletado — o botão levaria a um diálogo vazio.
 *
 * Esconder o botão é conveniência de interface — a autorização real é da API
 * (ADR-07).
 */
export function RedatorRowActions({
  redator,
  archived,
  busy,
  onView,
  onArchive,
  onRestore,
}: {
  redator: RedatorData
  archived: boolean
  /** Arquivar/restaurar em voo — trava os botões da linha (Q-2). */
  busy: boolean
  onView: (r: RedatorData) => void
  onArchive: (r: RedatorData) => void
  onRestore: (r: RedatorData) => void
}) {
  const { t } = useTranslation()
  const { can } = usePermissions()

  if (archived) {
    return can('identity.user.restore') ? (
      <AppButton
        label={t('archive.restoreAction')}
        icon="pi pi-undo"
        text
        size="small"
        disabled={busy}
        onClick={() => onRestore(redator)}
      />
    ) : null
  }

  return (
    <div className="flex justify-end gap-1">
      {can('identity.user.delete') && (
        <AppButton
          icon="pi pi-inbox"
          text
          rounded
          aria-label={t('archive.archiveAction')}
          disabled={busy}
          onClick={() => onArchive(redator)}
        />
      )}
      <AppButton
        icon="pi pi-eye"
        text
        rounded
        aria-label={t('common.view')}
        onClick={() => onView(redator)}
      />
    </div>
  )
}
```

Criar `frontend/src/features/identity/components/Admin/UserRowActions.tsx`:

```tsx
import { useTranslation } from 'react-i18next'
import { usePermissions } from '@shared/hooks'
import { AppButton } from '@shared/ui'
import type { UserData } from '@shared/types/generated'

/**
 * Ações por linha da tabela de usuários staff. Gêmeo do `RedatorRowActions`, com
 * UMA diferença: as duas ações são guardadas pela MESMA permissão,
 * `identity.access.manage`. Não é descuido — é a spec D7: essa permissão é
 * SEGREGADA (só superadmin), e dar ao restore um guard mais frouxo deixaria
 * alguém devolver um staff que nunca teria podido arquivar.
 */
export function UserRowActions({
  user,
  archived,
  busy,
  onView,
  onArchive,
  onRestore,
}: {
  user: UserData
  archived: boolean
  /** Arquivar/restaurar em voo — trava os botões da linha (Q-2). */
  busy: boolean
  onView: (u: UserData) => void
  onArchive: (u: UserData) => void
  onRestore: (u: UserData) => void
}) {
  const { t } = useTranslation()
  const { can } = usePermissions()
  const canManage = can('identity.access.manage')

  if (archived) {
    return canManage ? (
      <AppButton
        label={t('archive.restoreAction')}
        icon="pi pi-undo"
        text
        size="small"
        disabled={busy}
        onClick={() => onRestore(user)}
      />
    ) : null
  }

  return (
    <div className="flex justify-end gap-1">
      {canManage && (
        <AppButton
          icon="pi pi-inbox"
          text
          rounded
          aria-label={t('archive.archiveAction')}
          disabled={busy}
          onClick={() => onArchive(user)}
        />
      )}
      <AppButton
        icon="pi pi-eye"
        text
        rounded
        aria-label={t('common.view')}
        onClick={() => onView(user)}
      />
    </div>
  )
}
```

- [ ] **Step 5: As duas tabelas servem as duas fontes**

Em `frontend/src/features/identity/components/Redator/RedatoresTable.tsx`:

**5a.** Trocar o bloco de imports do topo (linhas 1-6) por:

```tsx
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useTableFilter } from '@shared/hooks'
import type { ArchiveMode } from '@shared/hooks'
import { AppColumn, IdentityCell, AppTag, AppEmptyState, ArchiveSwitch, SearchableTableFrame } from '@shared/ui'
import type { RedatorData } from '@shared/types/generated'
import { idoneidade, IDONEIDADE_SEVERITY, formatDateTime } from '@shared/lib'
import { RedatorRowActions } from './RedatorRowActions'

/** A mesma tabela serve as duas fontes. Em `archived` as duas colunas do rastreio
 * vêm preenchidas pelo achatamento do `useArchivedPage`; em `active` elas nem são
 * renderizadas. Molde: `ClientRow`. */
export type RedatorRow = RedatorData & {
  archived_at?: string
  archived_by?: string | null
}
```

`AppButton` sai — o único uso era o olho, que foi para o `RedatorRowActions`.

**5b.** Trocar a assinatura por:

```tsx
export function RedatoresTable({
  redatores, loading, onView, actions, error, onRetry,
  mode, onModeChange, onArchive, onRestore, busy,
}: {
  redatores: RedatorRow[]
  loading: boolean
  onView: (r: RedatorData) => void
  mode: ArchiveMode
  onModeChange: (mode: ArchiveMode) => void
  onArchive: (r: RedatorData) => void
  onRestore: (r: RedatorData) => void
  /** Arquivar/restaurar em voo — trava os botões da linha (Q-2). */
  busy: boolean
  actions?: ReactNode
  error?: { detail?: string | null } | null
  /** Repassa o refetch da página: é a promise que mantém o Reintentar do
   * AppErrorState em `loading` (Q-14). Tipar `() => void` aqui compilaria e
   * faria a camada do meio mentir sobre o contrato. */
  onRetry?: () => void | Promise<unknown>
}) {
  const { t } = useTranslation()
  const archived = mode === 'archived'
  const table = useTableFilter(redatores, (r) => [r.name, r.rut])
```

**5c.** Trocar `emptyState`/`actions` e acrescentar `viewSwitch`:

```tsx
      emptyState={
        <AppEmptyState
          icon={archived ? 'pi pi-inbox' : 'pi pi-users'}
          title={archived ? t('archive.empty') : t('redator.empty')}
          description={archived ? t('archive.emptyHint') : t('redator.emptyHint')}
          action={archived ? undefined : actions}
        />
      }
      footerCount={t('redator.count', { count: table.rows.length })}
      actions={archived ? undefined : actions}
      viewSwitch={<ArchiveSwitch value={mode} onChange={onModeChange} />}
```

**5d.** Antes da última `<AppColumn>`, acrescentar as duas colunas do rastreio:

```tsx
      {archived && (
        <AppColumn
          field="archived_at"
          header={t('archive.archivedAt')}
          body={(r: RedatorRow) => (r.archived_at ? new Date(r.archived_at).toLocaleDateString() : '—')}
        />
      )}
      {archived && (
        <AppColumn
          field="archived_by"
          header={t('archive.archivedBy')}
          body={(r: RedatorRow) => r.archived_by ?? t('archive.unknownAuthor')}
        />
      )}
```

**5e.** Trocar a última `<AppColumn>` por:

```tsx
      <AppColumn
        body={(r: RedatorRow) => (
          <RedatorRowActions
            redator={r}
            archived={archived}
            busy={busy}
            onView={onView}
            onArchive={onArchive}
            onRestore={onRestore}
          />
        )}
        style={{ width: '8rem' }}
      />
```

Em `frontend/src/features/identity/components/Admin/UsersTable.tsx`, as cinco mudanças equivalentes,
escritas por extenso.

**5f.** Trocar os imports do topo (linhas 1-6) por:

```tsx
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useTableFilter } from '@shared/hooks'
import type { ArchiveMode } from '@shared/hooks'
import { AppColumn, IdentityCell, AppTag, AppEmptyState, ArchiveSwitch, SearchableTableFrame } from '@shared/ui'
import type { UserData } from '@shared/types/generated'
import { formatDateTime } from '@shared/lib'
import { UserRowActions } from './UserRowActions'

/** A mesma tabela serve as duas fontes. Molde: `ClientRow`. */
export type UserRow = UserData & {
  archived_at?: string
  archived_by?: string | null
}
```

`AppButton` sai — o único uso era o olho, que foi para o `UserRowActions`.

**5g.** Trocar a assinatura por:

```tsx
export function UsersTable({
  users, loading, onView, actions, error, onRetry,
  mode, onModeChange, onArchive, onRestore, busy,
}: {
  users: UserRow[]
  loading: boolean
  onView: (u: UserData) => void
  mode: ArchiveMode
  onModeChange: (mode: ArchiveMode) => void
  onArchive: (u: UserData) => void
  onRestore: (u: UserData) => void
  /** Arquivar/restaurar em voo — trava os botões da linha (Q-2). */
  busy: boolean
  actions?: ReactNode
  error?: { detail?: string | null } | null
  /** Repassa o refetch da página: é a promise que mantém o Reintentar do
   * AppErrorState em `loading` (Q-14). Tipar `() => void` aqui compilaria e
   * faria a camada do meio mentir sobre o contrato. */
  onRetry?: () => void | Promise<unknown>
}) {
  const { t } = useTranslation()
  const archived = mode === 'archived'
  const table = useTableFilter(users, (u) => [u.name, u.email])
```

**5h.** Trocar `emptyState`/`actions` e acrescentar `viewSwitch`:

```tsx
      emptyState={
        <AppEmptyState
          icon={archived ? 'pi pi-inbox' : 'pi pi-users'}
          title={archived ? t('archive.empty') : t('admin.empty')}
          description={archived ? t('archive.emptyHint') : t('admin.emptyHint')}
          action={archived ? undefined : actions}
        />
      }
      footerCount={t('admin.count', { count: table.rows.length })}
      actions={archived ? undefined : actions}
      viewSwitch={<ArchiveSwitch value={mode} onChange={onModeChange} />}
```

**5i.** Antes da última `<AppColumn>`, acrescentar as duas colunas do rastreio:

```tsx
      {archived && (
        <AppColumn
          field="archived_at"
          header={t('archive.archivedAt')}
          body={(u: UserRow) => (u.archived_at ? new Date(u.archived_at).toLocaleDateString() : '—')}
        />
      )}
      {archived && (
        <AppColumn
          field="archived_by"
          header={t('archive.archivedBy')}
          body={(u: UserRow) => u.archived_by ?? t('archive.unknownAuthor')}
        />
      )}
```

**5j.** Trocar a última `<AppColumn>` (a do olho) por:

```tsx
      <AppColumn
        body={(u: UserRow) => (
          <UserRowActions
            user={u}
            archived={archived}
            busy={busy}
            onView={onView}
            onArchive={onArchive}
            onRestore={onRestore}
          />
        )}
        style={{ width: '8rem' }}
      />
```

- [ ] **Step 6: Ligar nas duas páginas**

Em `frontend/src/features/identity/components/PeoplePage.tsx`:

**6a.** Acrescentar aos imports:

```tsx
import { ConfirmDialog } from '@shared/ui'
import type { RedatorData } from '@shared/types/generated'
import { useRedatoresArchived } from '../hooks/useRedatoresArchived'
```

`ConfirmDialog` entra na mesma desestruturação de `@shared/ui` que já existe na linha 4 — não crie
um segundo `import` do mesmo módulo (o `pnpm lint` reprova `no-duplicate-imports`).

**6b.** Depois de `const students = useStudentsPage()`:

```tsx
  const redatoresArchived = useRedatoresArchived()
  const [toArchive, setToArchive] = useState<RedatorData | null>(null)
  const archived = redatoresArchived.mode === 'archived'
```

`useState` já está importado no arquivo.

**6c.** Trocar o `<RedatoresTable ... />` por:

```tsx
            <RedatoresTable
              redatores={archived ? redatoresArchived.items : page.items}
              loading={archived ? redatoresArchived.loading : page.loading}
              error={archived ? redatoresArchived.error : page.error}
              onRetry={archived ? redatoresArchived.refetch : page.refetch}
              mode={redatoresArchived.mode}
              onModeChange={redatoresArchived.setMode}
              onArchive={setToArchive}
              onRestore={(r) => r.id != null && redatoresArchived.restore(r.id)}
              busy={redatoresArchived.restoring || redatoresArchived.archiving}
              onView={page.openView}
              actions={
                can('identity.user.create')
                  ? <AppButton variant="brandIcon" label={t('redator.new')} icon="pi pi-user-plus" onClick={page.openCreate} />
                  : undefined
              }
            />
```

**6d.** Antes do fechamento `</ModulePage>`, acrescentar:

```tsx
      {/* Restaurar NÃO pede confirmação: não é destrutivo (molde D9). */}
      {toArchive && (
        <ConfirmDialog
          visible
          title={t('archive.confirmArchiveTitle')}
          message={t('archive.confirmArchiveBody')}
          confirmLabel={t('archive.archiveAction')}
          severity="danger"
          pending={redatoresArchived.archiving}
          onConfirm={() =>
            toArchive.id != null &&
            redatoresArchived.archive(toArchive.id, { onSuccess: () => setToArchive(null) })
          }
          onCancel={() => setToArchive(null)}
        />
      )}
```

**6e.** Em `frontend/src/features/identity/components/AdministracionPage.tsx`, os mesmos quatro
passos. Acrescentar aos imports:

```tsx
import { ConfirmDialog } from '@shared/ui'
import type { UserData } from '@shared/types/generated'
import { useUsersArchived } from '../hooks/useUsersArchived'
```

(`ConfirmDialog` entra na desestruturação de `@shared/ui` que já existe na linha 3.)

**6f.** Depois de `const rolesPage = useRolesPage()`:

```tsx
  const usersArchived = useUsersArchived()
  const [toArchive, setToArchive] = useState<UserData | null>(null)
  const archived = usersArchived.mode === 'archived'
```

**6g.** Trocar o `<UsersTable ... />` por:

```tsx
            <UsersTable
              users={archived ? usersArchived.items : page.items}
              loading={archived ? usersArchived.loading : page.loading}
              error={archived ? usersArchived.error : page.error}
              onRetry={archived ? usersArchived.refetch : page.refetch}
              mode={usersArchived.mode}
              onModeChange={usersArchived.setMode}
              onArchive={setToArchive}
              onRestore={(u) => u.id != null && usersArchived.restore(u.id)}
              busy={usersArchived.restoring || usersArchived.archiving}
              onView={page.openView}
              actions={
                canManage
                  ? <AppButton variant="brandIcon" label={t('admin.new')} icon="pi pi-user-plus" onClick={page.openCreate} />
                  : undefined
              }
            />
```

**6h.** Antes do fechamento `</ModulePage>`, acrescentar:

```tsx
      {/* Restaurar NÃO pede confirmação: não é destrutivo (molde D9). */}
      {toArchive && (
        <ConfirmDialog
          visible
          title={t('archive.confirmArchiveTitle')}
          message={t('archive.confirmArchiveBody')}
          confirmLabel={t('archive.archiveAction')}
          severity="danger"
          pending={usersArchived.archiving}
          onConfirm={() =>
            toArchive.id != null &&
            usersArchived.archive(toArchive.id, { onSuccess: () => setToArchive(null) })
          }
          onCancel={() => setToArchive(null)}
        />
      )}
```

- [ ] **Step 7: Verificar**

```bash
cd frontend && pnpm lint && pnpm test && pnpm build
```

Esperado: verde nos três.

DoD de navegador — **duas contas**, porque a fase 2 é onde as permissões divergem:

*Como superadmin:*

1. `/personas` → aba **Redactores**. O par **Activos | Archivados** aparece; cada linha ganhou o
   ícone de caixa.
2. Arquivar um redator **sem turma em andamento** → toast *"Registro archivado."*, some da lista.
3. **Archivados** → ele está lá, com data, autor e a contagem de cursos habilitados. **Restaurar** →
   volta para Activos com os documentos intactos (abrir o diálogo e conferir).
4. Arquivar um redator **com turma em andamento** → o diálogo **não fecha** e sai o toast vermelho
   *"El redactor tiene clases en curso: concluye o reasigna antes de archivarlo."* — a prova de tela
   do gate D3.
5. `/administracion` → aba **Usuarios**: mesmo par, mesmo fluxo. Arquivar e restaurar um admin comum.
6. Arquivar um **cliente** em `/comercial` e voltar a `/administracion` → **Archivados** de usuários
   **não** mostra o usuário daquele cliente. É a prova de tela da D10.

*Como admin comum (sem `identity.access.manage`):*

7. `/administracion` → **Archivados** lista, mas a linha **não tem** botão Restaurar nem caixa de
   arquivar. Em `/personas` os dois botões aparecem (o redator é guardado por `identity.user.*`).

- [ ] **Step 8: Commit**

```bash
git add frontend/src/shared/api/redatoresApi.ts \
        frontend/src/shared/api/usersApi.ts \
        frontend/src/features/identity/hooks/useRedatoresArchived.ts \
        frontend/src/features/identity/hooks/useUsersArchived.ts \
        frontend/src/features/identity/components/Redator/RedatorRowActions.tsx \
        frontend/src/features/identity/components/Redator/RedatoresTable.tsx \
        frontend/src/features/identity/components/Admin/UserRowActions.tsx \
        frontend/src/features/identity/components/Admin/UsersTable.tsx \
        frontend/src/features/identity/components/PeoplePage.tsx \
        frontend/src/features/identity/components/AdministracionPage.tsx
git commit -m "feat(archive): arquivar e restaurar redator e usuario staff na interface"
```

**Fim da fase 2 (Identity).** A fase 3 (Operation) começa na Task 11.

---

## Fase 3 — Operation

### Task 11: A cascata que a turma nunca teve, e a transação que ela obriga (D2, D9)

**Files:**
- Modify: `backend/app/Domains/Operation/Models/Turma.php`
- Modify: `backend/app/Domains/Operation/Actions/DeleteTurmaAction.php`
- Test: `backend/tests/Feature/Operation/TurmaArchiveCascadeTest.php`

**Interfaces:**
- Consumes: `ArchivesChildren`; as colunas `enrollments.archived_with_parent` e
  `files.archived_with_parent` da Task 1.
- Produces: `Turma::lockRow(int $turmaId): static`, consumido pela Task 12.

> **O pivot `turma_redator` fica FORA da cascata (D2).** Ele não tem `deleted_at`, e designação não é
> registro com ciclo de vida próprio: desfazê-la e refazê-la faria o `auditSync` da designação
> registrar uma remoção que ninguém pediu. Quem cuida do redator arquivado é o `withTrashed()` da
> Task 7, não esta cascata.

- [ ] **Step 1: Escrever os testes que falham**

Criar `backend/tests/Feature/Operation/TurmaArchiveCascadeTest.php`:

```php
<?php

namespace Tests\Feature\Operation;

use App\Domains\Operation\Enums\TurmaStatus;
use App\Domains\Operation\Models\Enrollment;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\Support\Certification\IssuableEnrollmentBuilder;
use Tests\TestCase;

/**
 * `Turma` e `Enrollment` não tinham `booted()`: arquivar uma turma deixava
 * matrículas e documentos ATIVOS sob um pai que ninguém mais alcança — o mesmo
 * modo de falha que a `DeleteClientAction` existe para impedir (spec D2).
 */
class TurmaArchiveCascadeTest extends TestCase
{
    use RefreshDatabase;

    public function test_arquivar_turma_leva_matriculas_e_documentos_marcados(): void
    {
        $builder = IssuableEnrollmentBuilder::make()->turmaNaoConcluida()->create();
        $turma = $builder->turmaModel();
        $enrollment = $builder->enrollmentModel();

        $documento = $turma->files()->create([
            'type' => 'manual',
            'path' => 'turmas/1/manual.pdf',
            'original_name' => 'manual.pdf',
            'mime' => 'application/pdf',
            'size' => 4096,
        ]);

        $turma->delete();

        $this->assertSoftDeleted('enrollments', ['id' => $enrollment->id]);
        $this->assertDatabaseHas('enrollments', ['id' => $enrollment->id, 'archived_with_parent' => true]);
        $this->assertSoftDeleted('files', ['id' => $documento->id]);
        $this->assertDatabaseHas('files', ['id' => $documento->id, 'archived_with_parent' => true]);
    }

    public function test_restaurar_turma_devolve_so_o_que_a_cascata_levou(): void
    {
        $builder = IssuableEnrollmentBuilder::make()->turmaNaoConcluida()->create();
        $turma = $builder->turmaModel();
        $enrollment = $builder->enrollmentModel();

        $antigo = $turma->files()->create([
            'type' => 'manual',
            'path' => 'turmas/1/antigo.pdf',
            'original_name' => 'antigo.pdf',
            'mime' => 'application/pdf',
            'size' => 1024,
        ]);
        $antigo->delete();

        $turma->delete();
        $turma->restore();

        $this->assertDatabaseHas('enrollments', ['id' => $enrollment->id, 'deleted_at' => null, 'archived_with_parent' => false]);
        // Arquivado ANTES do pai, por vontade própria: não volta (spec D2).
        $this->assertSoftDeleted('files', ['id' => $antigo->id]);
        $this->assertDatabaseHas('files', ['id' => $antigo->id, 'archived_with_parent' => false]);
    }

    public function test_o_pivot_de_redator_nao_e_tocado(): void
    {
        $builder = IssuableEnrollmentBuilder::make()->turmaNaoConcluida()->create();
        $turma = $builder->turmaModel();
        $redator = $builder->redatorModel();

        $turma->delete();

        // A designação continua lá: o pivot não tem `deleted_at` e desfazê-la
        // registraria no `auditSync` uma remoção que ninguém pediu (spec D2).
        $this->assertDatabaseHas('turma_redator', [
            'turma_id' => $turma->id,
            'redator_id' => $redator->id,
        ]);
    }

    public function test_a_cascata_roda_dentro_de_uma_transacao(): void
    {
        // `RefreshDatabase` já segura UMA transação; a da Action é a segunda.
        $this->actingAsAdmin();
        $turma = IssuableEnrollmentBuilder::make()->turmaNaoConcluida()->create()->turmaModel();

        $niveis = [];
        Enrollment::deleting(function () use (&$niveis) {
            $niveis[] = DB::transactionLevel();
        });

        $this->deleteJson("/api/turmas/{$turma->id}")->assertNoContent();

        $this->assertSame([2], $niveis);
    }

    public function test_turma_concluida_continua_recusando_o_arquivamento(): void
    {
        // A RN-15 é anterior a este bloco e não muda: o certificado emitido
        // aponta para o registro, e esconder o registro cria contradição entre
        // documento e banco.
        $this->actingAsAdmin();
        $turma = IssuableEnrollmentBuilder::make()->create()->turmaModel();

        $this->assertSame(TurmaStatus::Concluida, $turma->status);

        $this->deleteJson("/api/turmas/{$turma->id}")
            ->assertUnprocessable()
            ->assertJsonPath(
                'errors.turma.0',
                'La clase ya fue concluida: el registro académico está bloqueado (RN-15).',
            );
    }
}
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
docker compose exec -T app php artisan test --filter=TurmaArchiveCascadeTest
```

Esperado: os quatro primeiros vermelhos (não há cascata nem transação); o quinto **já passa** — a
RN-15 é anterior a este bloco e o teste está aqui como guarda de não-regressão.

- [ ] **Step 3: A cascata e o lock no model**

Em `backend/app/Domains/Operation/Models/Turma.php`:

**3a.** Acrescentar aos `use` do topo:

```php
use App\Shared\Concerns\ArchivesChildren;
```

**3b.** Trocar `use AuditableTrait, SoftDeletes;` por:

```php
    use ArchivesChildren, AuditableTrait, SoftDeletes;
```

**3c.** Logo **antes** de `public function quote(): BelongsTo`, acrescentar:

```php
    protected static function booted(): void
    {
        static::deleting(function (Turma $turma) {
            if (! $turma->isForceDeleting()) {
                // Instância a instância: soft-delete pelo builder não audita.
                //
                // ENUMERA-E-APAGA, logo check-then-act: quem fecha a janela é a
                // `DeleteTurmaAction`, que abre a transação e toma
                // `Turma::lockRow()` antes de chamar `delete()`. Não arquive
                // turma por fora dela.
                //
                // O pivot `turma_redator` fica FORA: não tem `deleted_at`, e
                // designação não é registro com ciclo de vida próprio — desfazê-la
                // faria o `auditSync` registrar uma remoção que ninguém pediu
                // (spec D2).
                $turma->enrollments()->get()->each(fn (Enrollment $e) => self::markAndDelete($e));
                $turma->files()->get()->each(fn (File $f) => self::markAndDelete($f));
            }
        });

        static::restored(function (Turma $turma) {
            // `restored`, não `restoring`: os filhos saem ANTES do pai e voltam
            // DEPOIS dele. `onlyTrashed()` + a marca fazem voltar só quem ESTA
            // cascata arquivou (spec D2).
            $turma->enrollments()->onlyTrashed()->where('archived_with_parent', true)->get()
                ->each(fn (Enrollment $e) => self::restoreAndUnmark($e));
            $turma->files()->onlyTrashed()->where('archived_with_parent', true)->get()
                ->each(fn (File $f) => self::restoreAndUnmark($f));
        });
    }
```

**Imports:** `File` já está no topo do arquivo (`App\Shared\Files\Models\File`, usado por `files()`).
`Enrollment` **não precisa de `use`** — está no mesmo namespace `App\Domains\Operation\Models`, como
`Turma::enrollments()` já demonstra. Não acrescente import de classe do próprio namespace.

**3d.** No fim da classe, **antes** de `newEloquentBuilder`, acrescentar:

```php
    /**
     * Trava a linha SEM julgar estado. `withTrashed()` porque o lock tem de ser
     * tomado mesmo sobre turma arquivada — é o estado de quem vai ser
     * restaurado, e pular a linha faria a operação seguir SEM mutex nenhum.
     *
     * No-op SILENCIOSO em sqlite (`SQLiteGrammar::compileLock()` devolve `''`).
     * Molde: `Client::lockRow()`.
     */
    public static function lockRow(int $turmaId): static
    {
        /** @var static $turma */
        $turma = static::withTrashed()->whereKey($turmaId)->lockForUpdate()->firstOrFail();

        return $turma;
    }
```

- [ ] **Step 4: A transação na Action**

`backend/app/Domains/Operation/Actions/DeleteTurmaAction.php` inteiro:

```php
<?php

namespace App\Domains\Operation\Actions;

use App\Domains\Operation\Models\Turma;
use Illuminate\Support\Facades\DB;

/**
 * Soft delete da turma, cascateando para matrículas e documentos — o que o hook
 * `deleting` do model faz (spec D2).
 *
 * Guarda do 6d aplicada (RN-15): turma concluída não se arquiva — o certificado
 * emitido aponta para o registro, e esconder o registro cria contradição entre
 * documento e banco. Financeiro segue sem bloquear (lei §7).
 *
 * A TRANSAÇÃO é nova, e é consequência da cascata (spec D9): o enumera-e-apaga
 * sem transação é check-then-act — uma matrícula criada entre o `get()` e o
 * commit sobreviveria ATIVA sob uma turma arquivada. O `lockRow` fecha a outra
 * ponta, entre duas requisições concorrentes.
 *
 * A guarda roda DENTRO da transação, depois do lock, pelo mesmo motivo da
 * `DeleteStaffUserAction`: leitura de guarda solta no autocommit não protege
 * nada.
 */
class DeleteTurmaAction
{
    public function execute(Turma $turma): void
    {
        DB::transaction(function () use ($turma) {
            $locked = Turma::lockRow($turma->id);

            // No-op idempotente: arquivar duas vezes não é erro, e o `deleting`
            // não roda de novo sobre registro já soft-deletado.
            if ($locked->trashed()) {
                return;
            }

            $locked->assertAcademicallyWritable();

            $locked->delete();
        });
    }
}
```

- [ ] **Step 5: Rodar os testes**

```bash
docker compose exec -T app php artisan test --filter=TurmaArchiveCascadeTest
docker compose exec -T app php artisan test --filter=Operation
```

Esperado: 5 passed no primeiro, verde no segundo.

- [ ] **Step 6: Pint e commit**

```bash
cd backend && ./vendor/bin/pint \
  app/Domains/Operation/Models/Turma.php \
  app/Domains/Operation/Actions/DeleteTurmaAction.php \
  tests/Feature/Operation/TurmaArchiveCascadeTest.php
```

```bash
git add backend/app/Domains/Operation/Models/Turma.php \
        backend/app/Domains/Operation/Actions/DeleteTurmaAction.php \
        backend/tests/Feature/Operation/TurmaArchiveCascadeTest.php
git commit -m "feat(archive): cascata de matriculas e documentos no arquivamento da turma"
```

---

### Task 12: Arquivados e restauração da turma, com o gate de conflito de banco (D1)

**Files:**
- Create: `backend/app/Domains/Operation/Actions/RestoreTurmaAction.php`
- Create: `backend/app/Domains/Operation/Data/ArchivedTurmaData.php`
- Modify: `backend/app/Domains/Operation/QueryBuilders/TurmaQueryBuilder.php`
- Modify: `backend/app/Domains/Operation/Http/Controllers/TurmaController.php`
- Modify: `backend/app/Domains/Operation/routes.php`
- Test: `backend/tests/Feature/Operation/TurmaArchiveEndpointTest.php`

**Interfaces:**
- Consumes: `Turma::lockRow()` e a cascata da Task 11; `LoadsCascadedChildren::asOfArchiving()`;
  `ArchiveTrailQuery::archivedBy()`; `TurmaHabilitacaoService`.
- Produces: `TurmaQueryBuilder::withArchivedListingData()`;
  `RestoreTurmaAction::execute(Turma $turma): Turma`; `ArchivedTurmaData`
  (`{ turma: TurmaData, archived_at: string, archived_by: ?string }`), consumido pela Task 14.

> **O gate D1 é o único do bloco que existe por causa de uma coluna gerada.**
> `turmas.active_quote_id` é `CASE WHEN deleted_at IS NULL THEN quote_id END` com `UNIQUE`, e
> `CreateTurmaAction` checa `$quote->turma()->exists()` sobre um `hasOne` **sem** `withTrashed`. Logo:
> arquivo A (cotação Q) → crio B da mesma Q (permitido) → restauro A → `SQLSTATE[23000]` → **500** numa
> operação de usuário sobre dado com peso legal. O gate transforma isso em **422** com frase legível.

- [ ] **Step 1: Escrever os testes que falham**

Criar `backend/tests/Feature/Operation/TurmaArchiveEndpointTest.php`:

```php
<?php

namespace Tests\Feature\Operation;

use App\Domains\Identity\Models\User;
use App\Domains\Operation\Models\Turma;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\Certification\IssuableEnrollmentBuilder;
use Tests\TestCase;

class TurmaArchiveEndpointTest extends TestCase
{
    use RefreshDatabase;

    public function test_listagem_de_arquivados_nao_vaza_ativa_e_traz_data_e_autor(): void
    {
        $autor = $this->actingAsAdmin();
        $autor->update(['name' => 'Ana Torres']);

        $viva = IssuableEnrollmentBuilder::make()->turmaNaoConcluida()->create()->turmaModel();
        $arquivada = IssuableEnrollmentBuilder::make()->turmaNaoConcluida()->create()->turmaModel();

        $this->deleteJson("/api/turmas/{$arquivada->id}")->assertNoContent();

        $this->getJson('/api/turmas/archived')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.turma.id', $arquivada->id)
            ->assertJsonPath('0.archived_by', 'Ana Torres');

        $this->getJson('/api/turmas')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.id', $viva->id);
    }

    public function test_arquivada_conta_os_alunos_que_a_cascata_levou(): void
    {
        // Sem a contagem as-of-archiving, TODA turma arquivada aparece com
        // `0 alumnos` — a cascata da Task 11 acabou de arquivar as matrículas e
        // o global scope as esconde do `withCount` (Q-8, aplicado a um count).
        $this->actingAsAdmin();
        $turma = IssuableEnrollmentBuilder::make()->turmaNaoConcluida()->create()->turmaModel();

        $this->deleteJson("/api/turmas/{$turma->id}")->assertNoContent();

        $this->getJson('/api/turmas/archived')
            ->assertOk()
            ->assertJsonPath('0.turma.enrolled_count', 1);
    }

    public function test_restore_devolve_200_e_traz_as_matriculas_de_volta(): void
    {
        $this->actingAsAdmin();
        $builder = IssuableEnrollmentBuilder::make()->turmaNaoConcluida()->create();
        $turma = $builder->turmaModel();
        $enrollment = $builder->enrollmentModel();

        $this->deleteJson("/api/turmas/{$turma->id}")->assertNoContent();

        $this->postJson("/api/turmas/{$turma->id}/restore")
            ->assertOk()
            ->assertJsonPath('id', $turma->id);

        $this->assertNotSoftDeleted('turmas', ['id' => $turma->id]);
        $this->assertDatabaseHas('enrollments', ['id' => $enrollment->id, 'deleted_at' => null, 'archived_with_parent' => false]);
    }

    public function test_restore_com_outra_turma_viva_na_mesma_cotacao_da_422_e_nao_500(): void
    {
        // A sequência da spec D1, inteira. Sem o gate, o UNIQUE da coluna gerada
        // `active_quote_id` recusa no banco e a rota devolve 500.
        $this->actingAsAdmin();
        $builder = IssuableEnrollmentBuilder::make()->turmaNaoConcluida()->create();
        $turmaA = $builder->turmaModel();
        $quoteId = $turmaA->quote_id;

        $this->deleteJson("/api/turmas/{$turmaA->id}")->assertNoContent();

        // B nasce da MESMA cotação — permitido, porque A está arquivada.
        $turmaB = Turma::create([
            'quote_id' => $quoteId,
            'course_id' => $turmaA->course_id,
            'modalidade' => $turmaA->modalidade,
            'local_aplicacao' => null,
            'start_date' => '2026-09-01',
            'end_date' => '2026-09-05',
        ]);

        $this->postJson("/api/turmas/{$turmaA->id}/restore")
            ->assertUnprocessable()
            ->assertJsonPath(
                'errors.turma.0',
                'Ya existe una clase activa para esta cotización: archívala antes de restaurar esta.',
            );

        $this->assertSoftDeleted('turmas', ['id' => $turmaA->id]);
        $this->assertNotSoftDeleted('turmas', ['id' => $turmaB->id]);
    }

    public function test_restore_de_turma_ativa_da_404(): void
    {
        $this->actingAsAdmin();
        $turma = IssuableEnrollmentBuilder::make()->turmaNaoConcluida()->create()->turmaModel();

        $this->postJson("/api/turmas/{$turma->id}/restore")->assertNotFound();
    }

    public function test_sem_a_permissao_de_restore_da_403(): void
    {
        $this->seed(RolePermissionSeeder::class);

        $turma = IssuableEnrollmentBuilder::make()->turmaNaoConcluida()->create()->turmaModel();
        $turma->delete();

        $user = User::factory()->create(['type' => 'admin', 'is_active' => true]);
        $user->givePermissionTo('operation.turma.view');
        $this->actingAs($user, 'web');

        // Vê a lista (tem a `view`)...
        $this->getJson('/api/turmas/archived')->assertOk();
        // ...mas não restaura.
        $this->postJson("/api/turmas/{$turma->id}/restore")->assertForbidden();
    }

    public function test_archived_exige_a_permissao_de_view(): void
    {
        $this->seed(RolePermissionSeeder::class);

        $user = User::factory()->redator()->create(['is_active' => true]);
        $user->assignRole('redator');
        $this->actingAs($user, 'web');

        $this->getJson('/api/turmas/archived')->assertForbidden();
    }
}
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
docker compose exec -T app php artisan test --filter=TurmaArchiveEndpointTest
```

Esperado: 7 vermelhos. `test_restore_com_outra_turma_viva…` falha com **500** (`SQLSTATE[23000]`) —
é literalmente o bug que o gate conserta.

- [ ] **Step 3: A projeção arquivada no builder**

Em `backend/app/Domains/Operation/QueryBuilders/TurmaQueryBuilder.php`:

**3a.** Trocar o `use` do topo por:

```php
use App\Shared\Concerns\LoadsCascadedChildren;
use Illuminate\Database\Eloquent\Builder;
```

**3b.** Trocar `class TurmaQueryBuilder extends Builder\n{` pela abertura com o trait:

```php
class TurmaQueryBuilder extends Builder
{
    use LoadsCascadedChildren;
```

**3c.** Depois da constante `LISTING`, acrescentar:

```php
    /**
     * As coleções que a cascata de arquivamento leva junto (spec D2).
     * `redatores.user`, `course` e `quote.budget.client.user` ficam fora: nenhum
     * é filho desta cascata, e as três relações já são `withTrashed()` do lado do
     * model.
     */
    private const CASCADED = ['documentacaoObrigatoria'];
```

**3d.** Depois de `withListingData()`, acrescentar:

```php
    /**
     * A projeção da lista de Arquivados. Duas diferenças da ativa, e as duas são
     * o mesmo Q-8: a lista existe para o operador RECONHECER a turma antes de
     * restaurá-la, e a projeção normal mostra o contrário do que aconteceu.
     *
     * 1. `documentacaoObrigatoria` entra por `asOfArchiving` — sem isso a turma
     *    arquivada aparece sem nenhum documento e a habilitação da RN-16 é lida
     *    ao contrário.
     * 2. A CONTAGEM de matrículas é reescrita. `withCount('enrollments')` conta
     *    só ativas, e depois da cascata TODA turma arquivada mostraria
     *    `0 alumnos`. O predicado é o mesmo do trait, escrito à mão porque
     *    `asOfArchiving()` devolve closures para `with()`, não para `withCount()`.
     */
    public function withArchivedListingData(): static
    {
        return $this
            ->with(array_values(array_diff(self::LISTING, self::CASCADED)))
            ->with(self::asOfArchiving(self::CASCADED))
            ->withCount(['enrollments' => fn ($query) => $query
                ->withTrashed()
                ->where(fn ($q) => $q
                    ->whereNull('enrollments.deleted_at')
                    ->orWhere('enrollments.archived_with_parent', true)
                ),
            ]);
    }
```

- [ ] **Step 4: A Action com o gate de conflito**

Criar `backend/app/Domains/Operation/Actions/RestoreTurmaAction.php`:

```php
<?php

namespace App\Domains\Operation\Actions;

use App\Domains\Operation\Models\Turma;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Restaura a turma e, pelo hook `restored` do model, as matrículas e documentos
 * que a cascata de arquivamento marcou (spec D2).
 *
 * O GATE é o único do bloco que existe por causa de uma COLUNA DE BANCO.
 * `turmas.active_quote_id` é gerada STORED — `CASE WHEN deleted_at IS NULL THEN
 * quote_id END` — e tem `UNIQUE`. Como `CreateTurmaAction` checa
 * `$quote->turma()->exists()` sobre um `hasOne` SEM `withTrashed`, esta sequência
 * é alcançável hoje:
 *
 *     arquivo A (cotação Q) → crio B da mesma Q (permitido) → restauro A
 *         → active_quote_id = Q nas duas → SQLSTATE[23000] → 500
 *
 * Deixar o banco recusar significa 500 numa operação de usuário sobre dado com
 * peso legal. O gate faz a mesma pergunta ANTES e devolve 422 com o que fazer.
 *
 * `$turma->quote->turma()` é exatamente a checagem certa: `Quote::turma()` é
 * `hasOne` sem `withTrashed`, então só enxerga turma VIVA — que é o que o
 * `UNIQUE` da coluna gerada também enxerga.
 *
 * Contraste que vale registrar: `seq_in_budget` da cotação NÃO tem esse
 * problema, porque `CreateQuoteAction` deriva com
 * `Quote::withTrashed()->max(...) + 1`. A D4 do molde ("conflito de unicidade
 * não é alcançável") continua verdadeira para `Client`, `Course` e `Quote`; é
 * falsa só para `Turma` (spec D1).
 */
class RestoreTurmaAction
{
    public function execute(Turma $turma): Turma
    {
        return DB::transaction(function () use ($turma) {
            $locked = Turma::lockRow($turma->id);

            // No-op idempotente: a rota resolve por `onlyTrashed()`, então chegar
            // aqui com registro ativo significa que alguém restaurou entre o
            // binding e o lock. Restaurar duas vezes não é erro.
            if (! $locked->trashed()) {
                return $locked;
            }

            if ($locked->quote->turma()->exists()) {
                throw ValidationException::withMessages([
                    'turma' => 'Ya existe una clase activa para esta cotización: archívala antes de restaurar esta.',
                ]);
            }

            $locked->restore();

            return $locked;
        });
    }
}
```

- [ ] **Step 5: O DTO composto**

Criar `backend/app/Domains/Operation/Data/ArchivedTurmaData.php`:

```php
<?php

namespace App\Domains\Operation\Data;

use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * Composição, não extensão: `TurmaData` NÃO muda, então o contrato da listagem
 * ativa fica intacto e nenhum campo anulável de arquivamento o polui (molde D8).
 */
#[TypeScript]
class ArchivedTurmaData extends Data
{
    public function __construct(
        public TurmaData $turma,
        public string $archived_at,
        /** `null` quando a audit `deleted` não tem usuário (seeder, console). */
        public ?string $archived_by,
    ) {}
}
```

- [ ] **Step 6: Os dois endpoints**

Em `backend/app/Domains/Operation/Http/Controllers/TurmaController.php`:

**6a.** Acrescentar aos `use`:

```php
use App\Domains\Operation\Actions\RestoreTurmaAction;
use App\Domains\Operation\Data\ArchivedTurmaData;
use App\Shared\Audit\ArchiveTrailQuery;
```

`JsonResponse` já está importado (é o retorno de `designateRedator`).

**6b.** Trocar as duas primeiras linhas de `middleware()` por:

```php
            new Middleware('permission:operation.turma.view', only: ['index', 'show', 'manual', 'manualDocx', 'archived']),
            new Middleware('permission:operation.turma.create', only: ['store', 'pending']),
            new Middleware('permission:operation.turma.update', only: ['update']),
            new Middleware('permission:operation.turma.delete', only: ['destroy']),
            new Middleware('permission:operation.turma.restore', only: ['restore']),
```

(as linhas de `assign_redator` e `complete` ficam como estão)

**6c.** Depois de `destroy()`, acrescentar:

```php
    /** @return array<ArchivedTurmaData> */
    public function archived(TurmaHabilitacaoService $habilitacao): array
    {
        $turmas = Turma::onlyTrashed()->withArchivedListingData()->latest()->get();

        $autores = ArchiveTrailQuery::archivedBy(Turma::class, $turmas->pluck('id')->all());

        return $turmas
            ->map(fn (Turma $t) => new ArchivedTurmaData(
                turma: TurmaData::fromModel($t, $habilitacao),
                archived_at: $t->deleted_at->toIso8601String(),
                archived_by: $autores[$t->id] ?? null,
            ))
            ->all();
    }

    public function restore(int $turma, RestoreTurmaAction $action, TurmaHabilitacaoService $habilitacao): JsonResponse
    {
        // Resolvido à mão, não por binding: o binding padrão aplica o global
        // scope de SoftDeletes e nunca acharia uma arquivada. `onlyTrashed()`
        // também dá o 404 de graça sobre registro ATIVO (molde D5).
        $model = Turma::onlyTrashed()->whereKey($turma)->firstOrFail();

        // 200, não 201: restaurar devolve um registro que já existia.
        return $this->present($action->execute($model), $habilitacao)
            ->toResponse(request())
            ->setStatusCode(Response::HTTP_OK);
    }
```

`archived()` **não** chama `present()`: `present()` faz `loadListingData()`, que é a projeção ATIVA e
desfaria o `asOfArchiving` que o builder acabou de aplicar.

- [ ] **Step 7: As rotas**

Em `backend/app/Domains/Operation/routes.php`, a linha `Route::get('turmas/{turma}', ...)` **já vem
depois** de `turmas/pendientes-configuracion`; as novas entram no mesmo lugar, antes dela:

```php
    Route::get('turmas/archived', [TurmaController::class, 'archived']);
    Route::post('turmas/{turma}/restore', [TurmaController::class, 'restore'])
        ->whereNumber('turma');
```

`whereNumber` pelo mesmo motivo do Q-6 do review anterior: `restore(int $turma, ...)` estoura
`TypeError` → 500 se a rota aceitar texto.

- [ ] **Step 8: Rodar os testes**

```bash
docker compose exec -T app php artisan test --filter=TurmaArchiveEndpointTest
docker compose exec -T app php artisan test --filter=Operation
```

Esperado: 7 passed no primeiro, verde no segundo.

- [ ] **Step 9: Pint e commit**

```bash
cd backend && ./vendor/bin/pint \
  app/Domains/Operation/Actions/RestoreTurmaAction.php \
  app/Domains/Operation/Data/ArchivedTurmaData.php \
  app/Domains/Operation/QueryBuilders/TurmaQueryBuilder.php \
  app/Domains/Operation/Http/Controllers/TurmaController.php \
  app/Domains/Operation/routes.php \
  tests/Feature/Operation/TurmaArchiveEndpointTest.php
```

```bash
git add backend/app/Domains/Operation/Actions/RestoreTurmaAction.php \
        backend/app/Domains/Operation/Data/ArchivedTurmaData.php \
        backend/app/Domains/Operation/QueryBuilders/TurmaQueryBuilder.php \
        backend/app/Domains/Operation/Http/Controllers/TurmaController.php \
        backend/app/Domains/Operation/routes.php \
        backend/tests/Feature/Operation/TurmaArchiveEndpointTest.php
git commit -m "feat(archive): arquivados e restauracao da turma com gate de cotacao ativa"
```

---

### Task 13: Arquivados e restauração da matrícula, escopados pela turma (D5, P3, D4)

**Files:**
- Create: `backend/app/Domains/Operation/Actions/RestoreEnrollmentAction.php`
- Create: `backend/app/Domains/Operation/Data/ArchivedEnrollmentData.php`
- Modify: `backend/app/Domains/Operation/Http/Controllers/EnrollmentController.php`
- Modify: `backend/app/Domains/Operation/routes.php`
- Test: `backend/tests/Feature/Operation/EnrollmentArchiveEndpointTest.php`

**Interfaces:**
- Consumes: `EnrollmentQueryBuilder::withListingData()`/`orderByStudentName()` (existentes, **não
  mudam** — matrícula é folha, não tem filho cascateado, e a projeção ativa já serve a lista de
  arquivados, P4); `Turma::assertAcademicallyWritable()`; `ArchiveTrailQuery::archivedBy()`.
- Produces: `RestoreEnrollmentAction::execute(Enrollment $enrollment): Enrollment`;
  `ArchivedEnrollmentData` (`{ enrollment: EnrollmentData, archived_at: string, archived_by: ?string }`),
  consumido pela Task 14.

> **Três decisões convergem nesta task.**
> **P3** — a Action aplica a RN-15. `RemoveEnrollmentAction:12` chama
> `$enrollment->turma->assertAcademicallyWritable()`, e restaurar matrícula é escrita acadêmica pela
> mesma definição que remover. Sem o gate, uma turma concluída ganharia aluno de volta **depois do
> certificado emitido**.
> **D5** — a rota de restore resolve `{enrollment}` por `$turma->enrollments()->onlyTrashed()`, à mão.
> `->scopeBindings()` resolveria por `$turma->enrollments()`, escopada por `deleted_at IS NULL`: uma
> matrícula arquivada daria **404 antes de chegar à Action**.
> **D4** — `EnrollStudentAction:38` continua restaurando a matrícula na re-matrícula **sem exigir**
> `operation.enrollment.restore`. Exceção declarada, com teste que a prova.

> **Sem gate de unicidade, e desta vez é medido.** `enrollments_turma_student_unique` é UNIQUE sobre
> `(turma_id, student_id)` e **não exclui soft-deletados** — existe no máximo uma linha por par, que é
> justamente a que está sendo restaurada. É o mesmo raciocínio do `seq_in_budget` da Task 4, e o
> oposto do `active_quote_id` da Task 12, onde o índice enxerga só as vivas.

- [ ] **Step 1: Escrever os testes que falham**

Criar `backend/tests/Feature/Operation/EnrollmentArchiveEndpointTest.php`:

```php
<?php

namespace Tests\Feature\Operation;

use App\Domains\Identity\Models\User;
use App\Domains\Operation\Enums\TurmaStatus;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\Certification\IssuableEnrollmentBuilder;
use Tests\TestCase;

class EnrollmentArchiveEndpointTest extends TestCase
{
    use RefreshDatabase;

    public function test_lista_de_arquivadas_e_escopada_pela_turma(): void
    {
        $autor = $this->actingAsAdmin();
        $autor->update(['name' => 'Ana Torres']);

        $a = IssuableEnrollmentBuilder::make()->turmaNaoConcluida()->create();
        $b = IssuableEnrollmentBuilder::make()->turmaNaoConcluida()->create();

        $this->deleteJson("/api/turmas/{$a->turmaModel()->id}/alunos/{$a->enrollmentModel()->id}")
            ->assertNoContent();
        $this->deleteJson("/api/turmas/{$b->turmaModel()->id}/alunos/{$b->enrollmentModel()->id}")
            ->assertNoContent();

        $this->getJson("/api/turmas/{$a->turmaModel()->id}/alunos/archived")
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.enrollment.id', $a->enrollmentModel()->id)
            ->assertJsonPath('0.archived_by', 'Ana Torres');

        // A lista ativa da mesma turma ficou vazia.
        $this->getJson("/api/turmas/{$a->turmaModel()->id}/alunos")
            ->assertOk()
            ->assertJsonCount(0);
    }

    public function test_restore_devolve_200_e_reativa_a_matricula(): void
    {
        $this->actingAsAdmin();
        $builder = IssuableEnrollmentBuilder::make()->turmaNaoConcluida()->create();
        $turma = $builder->turmaModel();
        $enrollment = $builder->enrollmentModel();

        $this->deleteJson("/api/turmas/{$turma->id}/alunos/{$enrollment->id}")->assertNoContent();

        $this->postJson("/api/turmas/{$turma->id}/alunos/{$enrollment->id}/restore")
            ->assertOk()
            ->assertJsonPath('id', $enrollment->id)
            ->assertJsonPath('name', 'Juan Pérez');

        $this->assertNotSoftDeleted('enrollments', ['id' => $enrollment->id]);
    }

    public function test_restore_em_turma_concluida_recusa_com_a_rn15(): void
    {
        // P3: restaurar matrícula é escrita acadêmica pela mesma definição que
        // remover. Sem o gate, uma turma concluída ganharia aluno de volta
        // DEPOIS do certificado emitido.
        $this->actingAsAdmin();
        $builder = IssuableEnrollmentBuilder::make()->turmaNaoConcluida()->create();
        $turma = $builder->turmaModel();
        $enrollment = $builder->enrollmentModel();

        $this->deleteJson("/api/turmas/{$turma->id}/alunos/{$enrollment->id}")->assertNoContent();

        $turma->update(['status' => TurmaStatus::Concluida]);

        $this->postJson("/api/turmas/{$turma->id}/alunos/{$enrollment->id}/restore")
            ->assertUnprocessable()
            ->assertJsonPath(
                'errors.turma.0',
                'La clase ya fue concluida: el registro académico está bloqueado (RN-15).',
            );

        $this->assertSoftDeleted('enrollments', ['id' => $enrollment->id]);
    }

    public function test_matricula_de_outra_turma_da_404(): void
    {
        $this->actingAsAdmin();
        $a = IssuableEnrollmentBuilder::make()->turmaNaoConcluida()->create();
        $b = IssuableEnrollmentBuilder::make()->turmaNaoConcluida()->create();

        $this->deleteJson("/api/turmas/{$b->turmaModel()->id}/alunos/{$b->enrollmentModel()->id}")
            ->assertNoContent();

        // Posse: a matrícula de B não se restaura pela rota de A.
        $this->postJson("/api/turmas/{$a->turmaModel()->id}/alunos/{$b->enrollmentModel()->id}/restore")
            ->assertNotFound();
    }

    public function test_restore_de_matricula_ativa_da_404(): void
    {
        $this->actingAsAdmin();
        $builder = IssuableEnrollmentBuilder::make()->turmaNaoConcluida()->create();

        $this->postJson(
            "/api/turmas/{$builder->turmaModel()->id}/alunos/{$builder->enrollmentModel()->id}/restore",
        )->assertNotFound();
    }

    public function test_rematricula_restaura_sem_exigir_a_permissao_de_restore(): void
    {
        // A EXCEÇÃO DECLARADA da spec D4. `EnrollStudentAction` restaura a
        // matrícula ao reencontrar o par turma+aluno. A permissão guarda a AÇÃO
        // Restaurar da tela de Arquivados, que é intenção explícita; re-matricular
        // é outra intenção, que por acaso reaproveita a linha. Exigir a permissão
        // faria a re-matrícula falhar com 403 para quem tem
        // `operation.enrollment.manage` — e o motivo não seria legível na tela.
        $this->seed(RolePermissionSeeder::class);

        $builder = IssuableEnrollmentBuilder::make()->turmaNaoConcluida()->create();
        $turma = $builder->turmaModel();
        $enrollment = $builder->enrollmentModel();
        $enrollment->delete();

        $operador = User::factory()->create(['type' => 'admin', 'is_active' => true]);
        $operador->givePermissionTo('operation.enrollment.manage');
        $this->actingAs($operador, 'web');

        $this->assertFalse($operador->can('operation.enrollment.restore'));

        $this->postJson("/api/turmas/{$turma->id}/alunos", [
            'rut' => '12.345.678-5',
            'name' => 'Juan Pérez',
        ])->assertCreated();

        $this->assertNotSoftDeleted('enrollments', ['id' => $enrollment->id]);
    }

    public function test_sem_a_permissao_de_restore_da_403(): void
    {
        $this->seed(RolePermissionSeeder::class);

        $builder = IssuableEnrollmentBuilder::make()->turmaNaoConcluida()->create();
        $turma = $builder->turmaModel();
        $enrollment = $builder->enrollmentModel();
        $enrollment->delete();

        $user = User::factory()->create(['type' => 'admin', 'is_active' => true]);
        $user->givePermissionTo('operation.turma.view');
        $this->actingAs($user, 'web');

        // Vê a lista (a lista é guardada por `operation.turma.view`)...
        $this->getJson("/api/turmas/{$turma->id}/alunos/archived")->assertOk();
        // ...mas não restaura.
        $this->postJson("/api/turmas/{$turma->id}/alunos/{$enrollment->id}/restore")->assertForbidden();
    }
}
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
docker compose exec -T app php artisan test --filter=EnrollmentArchiveEndpointTest
```

Esperado: 6 vermelhos e **1 verde** — `test_rematricula_restaura_sem_exigir_a_permissao_de_restore`
já passa hoje. Ele está aqui como guarda da exceção D4: se alguém acrescentar a permissão ao caminho
de re-matrícula, ele vira vermelho.

- [ ] **Step 3: A Action com a RN-15**

Criar `backend/app/Domains/Operation/Actions/RestoreEnrollmentAction.php`:

```php
<?php

namespace App\Domains\Operation\Actions;

use App\Domains\Operation\Models\Enrollment;
use Illuminate\Support\Facades\DB;

/**
 * Restaura a matrícula arquivada.
 *
 * A RN-15 se aplica, e a spec não precisava dizer: `RemoveEnrollmentAction`
 * chama `assertAcademicallyWritable()` antes de remover, e restaurar é escrita
 * acadêmica pela MESMA definição. Sem o gate, uma turma concluída ganharia aluno
 * de volta depois do certificado emitido — a contradição documento↔banco que a
 * RN-15 existe para impedir.
 *
 * SEM cascata e SEM lock: `Enrollment` é folha do arquivamento. Quem cascateia
 * PARA ela é `Turma` (spec D2), e essa volta acontece pelo hook `restored` da
 * turma, não por aqui. A transação fica porque `restore()` escreve a linha E a
 * audit `restored` (ADR-08), e as duas ou entram juntas ou não entram.
 *
 * SEM gate de unicidade: `enrollments_turma_student_unique` cobre também as
 * soft-deletadas, então existe no máximo uma linha por par turma+aluno — a que
 * está voltando. Contraste com `Turma`, onde o índice enxerga só as vivas (D1).
 */
class RestoreEnrollmentAction
{
    public function execute(Enrollment $enrollment): Enrollment
    {
        return DB::transaction(function () use ($enrollment) {
            $enrollment->turma->assertAcademicallyWritable();

            // No-op idempotente: a rota resolve por `onlyTrashed()`, então chegar
            // aqui com registro ativo significa que alguém restaurou entre o
            // binding e esta linha.
            if ($enrollment->trashed()) {
                $enrollment->restore();
            }

            return $enrollment->loadListingData();
        });
    }
}
```

- [ ] **Step 4: O DTO composto**

Criar `backend/app/Domains/Operation/Data/ArchivedEnrollmentData.php`:

```php
<?php

namespace App\Domains\Operation\Data;

use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * Composição, não extensão: `EnrollmentData` NÃO muda, então o contrato da
 * listagem ativa fica intacto e nenhum campo anulável de arquivamento o polui
 * (molde D8).
 */
#[TypeScript]
class ArchivedEnrollmentData extends Data
{
    public function __construct(
        public EnrollmentData $enrollment,
        public string $archived_at,
        /** `null` quando a audit `deleted` não tem usuário (seeder, console). */
        public ?string $archived_by,
    ) {}
}
```

- [ ] **Step 5: Os dois endpoints**

Em `backend/app/Domains/Operation/Http/Controllers/EnrollmentController.php`:

**5a.** Acrescentar aos `use`:

```php
use App\Domains\Operation\Actions\RestoreEnrollmentAction;
use App\Domains\Operation\Data\ArchivedEnrollmentData;
use App\Shared\Audit\ArchiveTrailQuery;
```

**5b.** Trocar as duas linhas de `middleware()` por:

```php
            new Middleware('permission:operation.turma.view', only: ['index', 'archived']),
            new Middleware('permission:operation.enrollment.manage', only: ['store', 'import', 'destroy', 'preview', 'result']),
            new Middleware('permission:operation.enrollment.restore', only: ['restore']),
```

A lista de arquivadas fica sob `operation.turma.view`, igual à lista ativa (spec D5): ver a turma é
ver quem esteve nela.

**5c.** Depois de `index()`, acrescentar:

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

        $autores = ArchiveTrailQuery::archivedBy(Enrollment::class, $enrollments->pluck('id')->all());

        return $enrollments
            ->map(fn (Enrollment $e) => new ArchivedEnrollmentData(
                enrollment: EnrollmentData::fromModel($e),
                archived_at: $e->deleted_at->toIso8601String(),
                archived_by: $autores[$e->id] ?? null,
            ))
            ->all();
    }
```

**5d.** Depois de `destroy()`, acrescentar:

```php
    public function restore(Turma $turma, int $enrollment, RestoreEnrollmentAction $action): JsonResponse
    {
        // Resolvido à mão, e o motivo dobra no aninhado: `->scopeBindings()`
        // resolveria `{enrollment}` por `$turma->enrollments()`, que é escopada
        // por `deleted_at IS NULL` — uma matrícula arquivada daria 404 ANTES de
        // chegar à Action. `onlyTrashed()` sobre a MESMA relação mantém a posse
        // declarada (matrícula de outra turma continua 404) e ainda dá o 404 de
        // graça sobre registro ativo (spec D5).
        $model = $turma->enrollments()->onlyTrashed()->whereKey($enrollment)->firstOrFail();

        // 200, não 201: restaurar devolve um registro que já existia.
        return EnrollmentData::fromModel($action->execute($model))
            ->toResponse(request())
            ->setStatusCode(Response::HTTP_OK);
    }
```

- [ ] **Step 6: As rotas**

Em `backend/app/Domains/Operation/routes.php`, junto do bloco de alunos:

```php
    Route::get('turmas/{turma}/alunos/archived', [EnrollmentController::class, 'archived']);
    // `withoutScopedBindings` porque `{enrollment}` NÃO é binding de model aqui:
    // é `int`, resolvido no controller por `$turma->enrollments()->onlyTrashed()`.
    // O escopo por posse continua declarado — só que na consulta, não no
    // container (spec D5). O guardrail NestedRouteOwnershipTest exige a
    // declaração explícita, e é esta.
    Route::post('turmas/{turma}/alunos/{enrollment}/restore', [EnrollmentController::class, 'restore'])
        ->whereNumber('enrollment')
        ->withoutScopedBindings();
```

`turmas/{turma}/alunos/archived` entra **junto de `alunos/preview`**, antes de qualquer rota GET com
segundo parâmetro. Hoje não existe `GET turmas/{turma}/alunos/{enrollment}`, então não há colisão —
mas manter a ordem evita criar uma amanhã.

- [ ] **Step 7: Rodar os testes**

```bash
docker compose exec -T app php artisan test --filter=EnrollmentArchiveEndpointTest
docker compose exec -T app php artisan test --filter=NestedRouteOwnershipTest
docker compose exec -T app php artisan test
```

Esperado: 7 passed, o guardrail verde, e a suíte inteira verde. **Este é o fim do backend do bloco.**

- [ ] **Step 8: Pint e commit**

```bash
cd backend && ./vendor/bin/pint \
  app/Domains/Operation/Actions/RestoreEnrollmentAction.php \
  app/Domains/Operation/Data/ArchivedEnrollmentData.php \
  app/Domains/Operation/Http/Controllers/EnrollmentController.php \
  app/Domains/Operation/routes.php \
  tests/Feature/Operation/EnrollmentArchiveEndpointTest.php
```

```bash
git add backend/app/Domains/Operation/Actions/RestoreEnrollmentAction.php \
        backend/app/Domains/Operation/Data/ArchivedEnrollmentData.php \
        backend/app/Domains/Operation/Http/Controllers/EnrollmentController.php \
        backend/app/Domains/Operation/routes.php \
        backend/tests/Feature/Operation/EnrollmentArchiveEndpointTest.php
git commit -m "feat(archive): arquivados e restauracao da matricula escopados pela turma"
```

---

### Task 14: Frontend do Operation — turma e matrícula

**Files:**
- Modify: `frontend/src/features/operation/api/useTurmas.ts`
- Modify: `frontend/src/features/operation/api/useEnrollments.ts`
- Create: `frontend/src/features/operation/hooks/useTurmasArchived.ts`
- Create: `frontend/src/features/operation/hooks/useEnrollmentsArchived.ts`
- Create: `frontend/src/features/operation/components/Turma/TurmaRowActions.tsx`
- Create: `frontend/src/features/operation/components/Enrollment/ArchivedEnrollmentsList.tsx`
- Modify: `frontend/src/features/operation/components/Turma/TurmasTable.tsx`
- Modify: `frontend/src/features/operation/components/OperationPage.tsx`
- Modify: `frontend/src/features/operation/components/Enrollment/EnrollmentSection.tsx`

**Interfaces:**
- Consumes: `ArchivedTurmaData` (Task 12) e `ArchivedEnrollmentData` (Task 13).
- Produces: `useTurmasArchived()` e `useEnrollmentsArchived(turmaId)`, ambos com a forma do
  `useArchivedPage` mais `archive`/`archiving`; `TurmaRow` (exportado de `TurmasTable.tsx`).

> **D12: a turma NÃO migra para `createCrudResource`.** `api/useTurmas.ts` é artesanal — tem `pending`,
> `manual`, `manualDocx`, `conclude`, `designateRedator` — e o contrato de `useArchivedPage` é
> **estrutural**: basta `useArchivedList(enabled)` + `useRestore()`. Os dois nascem ao lado dos irmãos.
> **P7 vale aqui também:** `useTurmas.ts` não tinha DELETE de turma; o `useArchiveTurma` entra junto.

- [ ] **Step 1: Regenerar os tipos**

```bash
docker compose exec -T app php artisan typescript:transform
grep -n 'ArchivedTurmaData\|ArchivedEnrollmentData' frontend/src/shared/types/generated.ts
```

- [ ] **Step 2: Os três hooks de rede da turma**

Em `frontend/src/features/operation/api/useTurmas.ts`:

**2a.** Trocar a linha de import de tipos por:

```ts
import type { ArchivedTurmaData, PendingQuoteData, TurmaData, TurmaModalidade } from '@shared/types/generated'
```

**2b.** Acrescentar `archived` a `turmaKeys`:

```ts
export const turmaKeys = {
  all: ['turmas'] as const,
  list: () => ['turmas', 'list'] as const,
  archived: () => ['turmas', 'archived'] as const,
  detail: (id: number) => ['turmas', 'detail', id] as const,
  pending: () => ['turmas', 'pending'] as const,
}
```

**2c.** No fim do arquivo, acrescentar:

```ts
/**
 * Turmas arquivadas. `enabled` é PARÂMETRO, não default, pela mesma lição da
 * fábrica `createCrudResource`: a visão de arquivados não pode buscar na
 * montagem — carregar as duas visões de uma vez dobra a rede sem ganho.
 *
 * A chave começa em `['turmas']`, o mesmo prefixo que `useInvalidate()` invalida:
 * arquivar ou restaurar repinta as duas listas sem código novo.
 */
export function useTurmasArchivedList(enabled: boolean) {
  return useQuery<ArchivedTurmaData[], ProblemDetails>({
    queryKey: turmaKeys.archived(),
    queryFn: () => api.get<ArchivedTurmaData[]>('/api/turmas/archived').then((r) => r.data),
    enabled,
  })
}

/** O arquivar da turma, que não existia no frontend até aqui (P7). O backend
 * recusa turma concluída com 422 (RN-15) — o toast do hook de página é o que
 * torna essa recusa visível. */
export function useArchiveTurma() {
  const invalidate = useInvalidate()
  return useMutation<void, ProblemDetails, number>({
    mutationFn: (turmaId) => api.delete(`/api/turmas/${turmaId}`).then(() => undefined),
    onSuccess: invalidate,
  })
}

export function useRestoreTurma() {
  const invalidate = useInvalidate()
  return useMutation<TurmaData, ProblemDetails, number>({
    mutationFn: (turmaId) => api.post<TurmaData>(`/api/turmas/${turmaId}/restore`).then((r) => r.data),
    onSuccess: invalidate,
  })
}
```

- [ ] **Step 3: Os dois hooks de rede da matrícula**

Em `frontend/src/features/operation/api/useEnrollments.ts`:

**3a.** Trocar a linha de import de tipos por:

```ts
import type { ArchivedEnrollmentData, EnrollmentData, EnrollmentResultData } from '@shared/types/generated'
```

**3b.** Acrescentar `archived` a `enrollmentKeys`:

```ts
export const enrollmentKeys = {
  all: ['enrollments'] as const,
  list: (turmaId: number) => ['enrollments', 'list', turmaId] as const,
  archived: (turmaId: number) => ['enrollments', 'archived', turmaId] as const,
}
```

**3c.** No fim do arquivo, acrescentar:

```ts
/** Matrículas arquivadas DA turma. Escopada pelo pai porque a matrícula não tem
 * lista de topo — ela vive dentro do detalhe da turma (spec D5). */
export function useEnrollmentsArchivedList(turmaId: number, enabled: boolean) {
  return useQuery<ArchivedEnrollmentData[], ProblemDetails>({
    queryKey: enrollmentKeys.archived(turmaId),
    queryFn: () =>
      api.get<ArchivedEnrollmentData[]>(`/api/turmas/${turmaId}/alunos/archived`).then((r) => r.data),
    enabled: enabled && Number.isFinite(turmaId),
  })
}

/** O id da turma fica FECHADO no hook, e é o que faz o `mutate(id)` do contrato
 * de `useArchivedPage` bastar (spec D12). */
export function useRestoreEnrollment(turmaId: number) {
  const qc = useQueryClient()
  return useMutation<EnrollmentData, ProblemDetails, number>({
    mutationFn: (enrollmentId) =>
      api
        .post<EnrollmentData>(`/api/turmas/${turmaId}/alunos/${enrollmentId}/restore`)
        .then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: enrollmentKeys.list(turmaId) })
      qc.invalidateQueries({ queryKey: enrollmentKeys.archived(turmaId) })
      qc.invalidateQueries({ queryKey: turmaKeys.all })
    },
  })
}
```

Acrescente também a invalidação da lista de arquivadas em `useRemoveEnrollment`, senão arquivar não
repinta a segunda visão:

```ts
    onSuccess: (_data, { turmaId }) => {
      qc.invalidateQueries({ queryKey: enrollmentKeys.list(turmaId) })
      qc.invalidateQueries({ queryKey: enrollmentKeys.archived(turmaId) })
      qc.invalidateQueries({ queryKey: turmaKeys.all })
    },
```

- [ ] **Step 4: Os dois hooks de página**

Criar `frontend/src/features/operation/hooks/useTurmasArchived.ts`:

```ts
import { useTranslation } from 'react-i18next'
import { useArchivedPage } from '@shared/hooks'
import { useToast } from '@shared/ui'
import { problemMessage } from '@shared/api/problemMessage'
import type { ArchivedTurmaData, TurmaData } from '@shared/types/generated'
import { useArchiveTurma, useRestoreTurma, useTurmasArchivedList } from '../api/useTurmas'

/**
 * `useArchivedPage` exige `ArchivableResource<TArchived>` — contrato ESTRUTURAL,
 * não a fábrica `createCrudResource` (spec D12). `useTurmas.ts` é artesanal e não
 * migra; o recurso é montado aqui.
 *
 * As propriedades são FUNÇÕES NOMEADAS começando em `use`: o
 * `react-hooks/rules-of-hooks` decide pelo nome do que está sendo definido, e
 * seta anônima numa propriedade não é reconhecida como hook.
 */
const recursoDeTurmas = {
  useArchivedList: function useArchivedList(enabled: boolean) {
    return useTurmasArchivedList(enabled)
  },
  useRestore: function useRestore() {
    return useRestoreTurma()
  },
}

/** Molde: `useClientsArchived`. O `onError` do arquivar NÃO é conveniência aqui:
 * turma concluída é recusada com 422 pela RN-15, e sem o toast o clique fica
 * mudo (Q-2 do review de 2026-08-18). O do restaurar cobre o gate D1 —
 * "ya existe una clase activa para esta cotización". */
export function useTurmasArchived() {
  const { t } = useTranslation()
  const toast = useToast()
  const page = useArchivedPage<TurmaData, ArchivedTurmaData>(recursoDeTurmas, (row) => row.turma)
  const archiveMutation = useArchiveTurma()

  const falhou = (problem: Parameters<typeof problemMessage>[0]) => {
    const message = problemMessage(problem)
    if (message) toast.error(message)
  }

  return {
    ...page,
    restore: (id: number) =>
      page.restore(id, {
        onSuccess: () => toast.success(t('archive.restoredToast')),
        onError: falhou,
      }),
    /** `onSuccess` do chamador fecha o ConfirmDialog — ele só fecha no sucesso,
     * para o 422 da RN-15 ter onde pousar. */
    archive: (id: number, options?: { onSuccess?: () => void }) =>
      archiveMutation.mutate(id, {
        onSuccess: () => {
          toast.success(t('archive.archivedToast'))
          options?.onSuccess?.()
        },
        onError: falhou,
      }),
    archiving: archiveMutation.isPending,
  }
}
```

Criar `frontend/src/features/operation/hooks/useEnrollmentsArchived.ts`:

```ts
import { useTranslation } from 'react-i18next'
import { useArchivedPage } from '@shared/hooks'
import { useToast } from '@shared/ui'
import { problemMessage } from '@shared/api/problemMessage'
import type { ArchivedEnrollmentData, EnrollmentData } from '@shared/types/generated'
import { useEnrollmentsArchivedList, useRestoreEnrollment } from '../api/useEnrollments'

/** Mesma construção do `useTurmasArchived`, com o id do pai fechado no closure —
 * por isso a fábrica é função e não constante de módulo. */
function recursoDeMatriculas(turmaId: number) {
  return {
    useArchivedList: function useArchivedList(enabled: boolean) {
      return useEnrollmentsArchivedList(turmaId, enabled)
    },
    useRestore: function useRestore() {
      return useRestoreEnrollment(turmaId)
    },
  }
}

/** Não há `archive` aqui: arquivar matrícula continua sendo o `remove` do
 * `useEnrollmentSection`, que já tem ConfirmDialog e banner de erro próprios. */
export function useEnrollmentsArchived(turmaId: number) {
  const { t } = useTranslation()
  const toast = useToast()
  const page = useArchivedPage<EnrollmentData, ArchivedEnrollmentData>(
    recursoDeMatriculas(turmaId),
    (row) => row.enrollment,
  )

  return {
    ...page,
    restore: (id: number) =>
      page.restore(id, {
        onSuccess: () => toast.success(t('archive.restoredToast')),
        onError: (problem) => {
          const message = problemMessage(problem)
          if (message) toast.error(message)
        },
      }),
  }
}
```

- [ ] **Step 5: As ações de linha da turma**

Criar `frontend/src/features/operation/components/Turma/TurmaRowActions.tsx`:

```tsx
import { useTranslation } from 'react-i18next'
import { usePermissions } from '@shared/hooks'
import { AppButton } from '@shared/ui'
import type { TurmaData } from '@shared/types/generated'

/**
 * Ações por linha da tabela de turmas. Molde do `ClientRowActions`.
 *
 * Em `archived` o olho SAI: `GET /api/turmas/{turma}` usa o binding padrão e não
 * enxerga soft-deletada — o botão levaria a uma tela de 404.
 *
 * Esconder o botão é conveniência de interface — a autorização real é da API
 * (ADR-07). O 422 da RN-15 (turma concluída) continua vindo do servidor e
 * aparecendo no toast: `operation.turma.delete` não é a mesma pergunta.
 */
export function TurmaRowActions({
  turma,
  archived,
  busy,
  onView,
  onArchive,
  onRestore,
}: {
  turma: TurmaData
  archived: boolean
  /** Arquivar/restaurar em voo — trava os botões da linha (Q-2). */
  busy: boolean
  onView: (t: TurmaData) => void
  onArchive: (t: TurmaData) => void
  onRestore: (t: TurmaData) => void
}) {
  const { t } = useTranslation()
  const { can } = usePermissions()

  if (archived) {
    return can('operation.turma.restore') ? (
      <AppButton
        label={t('archive.restoreAction')}
        icon="pi pi-undo"
        text
        size="small"
        disabled={busy}
        onClick={() => onRestore(turma)}
      />
    ) : null
  }

  return (
    <div className="flex justify-end gap-1">
      {can('operation.turma.delete') && (
        <AppButton
          icon="pi pi-inbox"
          text
          rounded
          aria-label={t('archive.archiveAction')}
          disabled={busy}
          onClick={() => onArchive(turma)}
        />
      )}
      <AppButton
        icon="pi pi-eye"
        text
        rounded
        aria-label={t('common.view')}
        onClick={() => onView(turma)}
      />
    </div>
  )
}
```

- [ ] **Step 6: A tabela de turmas serve as duas fontes**

Em `frontend/src/features/operation/components/Turma/TurmasTable.tsx`:

**6a.** Trocar os imports do topo (linhas 1-12) por:

```tsx
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  AppColumn, AppDropdown, AppTag, IdentityCell,
  AppEmptyState, ArchiveSwitch, SearchableTableFrame,
} from '@shared/ui'
import { useTableFilter } from '@shared/hooks'
import type { ArchiveMode } from '@shared/hooks'
import type { TurmaData } from '@shared/types/generated'
import {
  turmaDisplayStatus, turmaStatusSeverity, turmaModalidadeTagProps, type TurmaDisplayStatus,
} from '../../lib/turmaStatus'
import { TurmaRowActions } from './TurmaRowActions'

const STATUSES: TurmaDisplayStatus[] = ['em_andamento', 'habilitada', 'concluida']

/** A mesma tabela serve as duas fontes. Em `archived` as duas colunas do rastreio
 * vêm preenchidas pelo achatamento do `useArchivedPage`. Molde: `ClientRow`. */
export type TurmaRow = TurmaData & {
  archived_at?: string
  archived_by?: string | null
}
```

`AppButton` sai — o único uso era o olho, que foi para o `TurmaRowActions`. Deixá-lo importado quebra
o `pnpm lint`.

**6b.** Trocar a assinatura por:

```tsx
export function TurmasTable({
  turmas, loading, error, onRetry,
  mode, onModeChange, onArchive, onRestore, busy,
}: {
  turmas: TurmaRow[]
  loading: boolean
  mode: ArchiveMode
  onModeChange: (mode: ArchiveMode) => void
  onArchive: (turma: TurmaData) => void
  onRestore: (turma: TurmaData) => void
  /** Arquivar/restaurar em voo — trava os botões da linha (Q-2). */
  busy: boolean
  error?: { detail?: string | null } | null
  /** A promise é o que mantém o Reintentar em `loading` (Q-14); `() => void`
   * compilaria e faria esta camada mentir sobre o contrato. */
  onRetry?: () => void | Promise<unknown>
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [status, setStatus] = useState<TurmaDisplayStatus | null>(null)
  const archived = mode === 'archived'
```

(o `useTableFilter` logo abaixo não muda)

**6c.** Trocar o `emptyState` e acrescentar `viewSwitch` — **não** acrescente `actions`: a
`TurmasTable` não recebe esse prop hoje, porque turma não se cria por botão (nasce de cotação
aprovada), e inventá-lo aqui seria escopo novo.

```tsx
      emptyState={
        // Sem ação em nenhuma das duas visões: turma não se cria por botão,
        // nasce de cotação aprovada.
        <AppEmptyState
          icon={archived ? 'pi pi-inbox' : 'pi pi-calendar'}
          title={archived ? t('archive.empty') : t('operation.table.empty')}
          description={archived ? t('archive.emptyHint') : t('operation.table.emptyHint')}
        />
      }
      footerCount={t('operation.table.count', { count: table.rows.length })}
      viewSwitch={<ArchiveSwitch value={mode} onChange={onModeChange} />}
      loading={loading}
```

O `filterSlot` de estado continua servindo as duas visões: turma arquivada continua tendo estado.

**6d.** Antes da última `<AppColumn>` (a do olho), acrescentar as duas colunas do rastreio. **Note o
nome do parâmetro:** o corpo das colunas deste arquivo usa `turma`, porque `t` já é o `useTranslation`.

```tsx
      {archived && (
        <AppColumn
          field="archived_at"
          header={t('archive.archivedAt')}
          body={(turma: TurmaRow) =>
            turma.archived_at ? new Date(turma.archived_at).toLocaleDateString() : '—'
          }
        />
      )}
      {archived && (
        <AppColumn
          field="archived_by"
          header={t('archive.archivedBy')}
          body={(turma: TurmaRow) => turma.archived_by ?? t('archive.unknownAuthor')}
        />
      )}
```

**6e.** Trocar a última `<AppColumn>` por:

```tsx
      <AppColumn
        body={(turma: TurmaRow) => (
          <TurmaRowActions
            turma={turma}
            archived={archived}
            busy={busy}
            onView={(x) => navigate(`/operacion/turmas/${x.id}`)}
            onArchive={onArchive}
            onRestore={onRestore}
          />
        )}
        style={{ width: '8rem' }}
      />
```

- [ ] **Step 7: Ligar na `OperationPage`**

Em `frontend/src/features/operation/components/OperationPage.tsx`:

```tsx
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ModulePage, AppCard, ConfirmDialog } from '@shared/ui'
import { usePermissions } from '@shared/hooks'
import type { TurmaData } from '@shared/types/generated'
import { useTurmas, usePendingQuotes } from '../api/useTurmas'
import { useTurmasArchived } from '../hooks/useTurmasArchived'
import { PendingQuotesPanel } from './Turma/PendingQuotesPanel'
import { TurmasTable } from './Turma/TurmasTable'

export function OperationPage() {
  // `usePendingQuotes` dispara sempre; sem `operation.turma.create` o backend
  // responde 403 e o painel simplesmente não é renderizado (o `can()` é RBAC de
  // UI — a API é a fronteira). Query condicional por permissão quebraria a regra
  // de hooks; guarda-se no render.
  const { t } = useTranslation()
  const { can } = usePermissions()
  const turmas = useTurmas()
  const pending = usePendingQuotes()
  const turmasArchived = useTurmasArchived()
  const [toArchive, setToArchive] = useState<TurmaData | null>(null)
  const canCreate = can('operation.turma.create')
  const archived = turmasArchived.mode === 'archived'

  return (
    <ModulePage title={t('module.operacion.title')} description={t('module.operacion.description')}>
      <div className="space-y-6">
        {canCreate && (
          <PendingQuotesPanel
            items={pending.data ?? []}
            error={pending.isError ? (pending.error ?? {}) : null}
            onRetry={pending.refetch}
          />
        )}
        <AppCard>
          <TurmasTable
            turmas={archived ? turmasArchived.items : (turmas.data ?? [])}
            loading={archived ? turmasArchived.loading : turmas.isLoading}
            error={archived ? turmasArchived.error : turmas.isError ? (turmas.error ?? {}) : null}
            onRetry={archived ? turmasArchived.refetch : turmas.refetch}
            mode={turmasArchived.mode}
            onModeChange={turmasArchived.setMode}
            onArchive={setToArchive}
            onRestore={(turma) => turma.id != null && turmasArchived.restore(turma.id)}
            busy={turmasArchived.restoring || turmasArchived.archiving}
          />
        </AppCard>
      </div>

      {/* Restaurar NÃO pede confirmação: não é destrutivo (molde D9). */}
      {toArchive && (
        <ConfirmDialog
          visible
          title={t('archive.confirmArchiveTitle')}
          message={t('archive.confirmArchiveBody')}
          confirmLabel={t('archive.archiveAction')}
          severity="danger"
          pending={turmasArchived.archiving}
          onConfirm={() =>
            toArchive.id != null &&
            turmasArchived.archive(toArchive.id, { onSuccess: () => setToArchive(null) })
          }
          onCancel={() => setToArchive(null)}
        />
      )}
    </ModulePage>
  )
}
```

- [ ] **Step 8: A lista de matrículas arquivadas**

Criar `frontend/src/features/operation/components/Enrollment/ArchivedEnrollmentsList.tsx`:

```tsx
import { useTranslation } from 'react-i18next'
import { usePermissions, useTableFilter } from '@shared/hooks'
import { AppButton, AppColumn, AppDataTable, AppEmptyState, IdentityCell } from '@shared/ui'
import type { EnrollmentData } from '@shared/types/generated'

/** Molde `ClientRow`: a forma achatada pelo `useArchivedPage`. */
export type ArchivedEnrollmentRow = EnrollmentData & {
  archived_at?: string
  archived_by?: string | null
}

/**
 * Matrículas arquivadas da turma. Componente próprio, e não um modo da
 * `EnrollmentTable`: a linha ativa carrega registrar resultado, remover e o badge
 * de estado acadêmico — nada disso aplicável a quem está fora da turma. A
 * `EnrollmentTable` já tem 150 linhas de ramificação por permissão; um segundo
 * modo por dentro dela dobraria isso.
 *
 * `AppDataTable` com `error`/`onRetry`/`footerCount`/`emptyMessage` é a mesma
 * composição da irmã ativa — inclusive o `useTableFilter` sem seletor, que aqui
 * serve só à paginação (a aba é sem busca, decisão do protótipo).
 */
export function ArchivedEnrollmentsList({
  enrollments,
  loading,
  error,
  onRetry,
  onRestore,
  restoring,
}: {
  enrollments: ArchivedEnrollmentRow[]
  loading: boolean
  error?: { detail?: string | null } | null
  onRetry: () => void | Promise<unknown>
  onRestore: (id: number) => void
  /** Restore em voo — trava os botões (Q-2). */
  restoring: boolean
}) {
  const { t } = useTranslation()
  const { can } = usePermissions()
  const table = useTableFilter(enrollments)

  return (
    <AppDataTable
      value={table.rows}
      loading={loading}
      error={error}
      onRetry={onRetry}
      first={table.first}
      onPage={table.onPage}
      footerCount={t('operation.enrollment.footerCount', { count: table.rows.length })}
      emptyMessage={
        <AppEmptyState icon="pi pi-inbox" title={t('archive.empty')} description={t('archive.emptyHint')} />
      }
    >
      <AppColumn
        header={t('operation.enrollment.table.name')}
        body={(e: ArchivedEnrollmentRow) => (
          <IdentityCell title={e.name} description={e.email} image={e.photo_url} />
        )}
      />
      <AppColumn header={t('operation.enrollment.table.rut')} field="rut" />
      <AppColumn
        field="archived_at"
        header={t('archive.archivedAt')}
        body={(e: ArchivedEnrollmentRow) =>
          e.archived_at ? new Date(e.archived_at).toLocaleDateString() : '—'
        }
      />
      <AppColumn
        field="archived_by"
        header={t('archive.archivedBy')}
        body={(e: ArchivedEnrollmentRow) => e.archived_by ?? t('archive.unknownAuthor')}
      />
      <AppColumn
        body={(e: ArchivedEnrollmentRow) =>
          can('operation.enrollment.restore') ? (
            <AppButton
              label={t('archive.restoreAction')}
              icon="pi pi-undo"
              text
              size="small"
              disabled={restoring}
              onClick={() => e.id != null && onRestore(e.id)}
            />
          ) : null
        }
        style={{ width: '8rem' }}
      />
    </AppDataTable>
  )
}
```

**Nenhuma chave de locale nova.** `operation.enrollment.table.name`, `.table.rut` e `.footerCount` são
as que a `EnrollmentTable` já usa; o resto vem do bloco `archive.*`.

- [ ] **Step 9: O switch local na aba Alumnos (D5)**

Em `frontend/src/features/operation/components/Enrollment/EnrollmentSection.tsx`:

**9a.** Acrescentar aos imports:

```tsx
import { ArchiveSwitch } from '@shared/ui'
import { useEnrollmentsArchived } from '../../hooks/useEnrollmentsArchived'
import { ArchivedEnrollmentsList } from './ArchivedEnrollmentsList'
```

`ArchiveSwitch` entra na desestruturação de `@shared/ui` que já existe na linha 3.

**9b.** Depois de `const s = useEnrollmentSection(turma)`:

```tsx
  const arquivadas = useEnrollmentsArchived(turma.id!)
  const emArquivados = arquivadas.mode === 'archived'
```

**9c.** No `AppCardToolbar`, o switch entra à direita e os dois botões só aparecem na visão ativa:

```tsx
      <AppCardToolbar
        start={
          s.loadError || emArquivados ? undefined : (
            <>
              <AppButton
                variant="brandIcon"
                label={t('operation.enrollment.importSheet')}
                icon="pi pi-upload"
                onClick={() => setImportOpen(true)}
              />
              <AppButton
                label={t('operation.enrollment.addStudent')}
                icon="pi pi-user-plus"
                outlined
                onClick={() => setAddOpen(true)}
              />
            </>
          )
        }
        end={<ArchiveSwitch value={arquivadas.mode} onChange={arquivadas.setMode} />}
      />
```

`end` é a prop do lado direito do `AppCardToolbar` (`AppCard.tsx`: `start` = busca/filtros/grupo de
botões, `end` = ação primária ou contagem). Nenhuma prop nova entra no `shared/ui` por causa desta task.

**9d.** Trocar o `<EnrollmentTable ... />` por uma bifurcação:

```tsx
      {emArquivados ? (
        <ArchivedEnrollmentsList
          enrollments={arquivadas.items}
          loading={arquivadas.loading}
          error={arquivadas.error}
          onRetry={arquivadas.refetch}
          onRestore={arquivadas.restore}
          restoring={arquivadas.restoring}
        />
      ) : (
        <EnrollmentTable
          turmaId={turma.id!}
          enrollments={s.enrollments}
          loading={s.loading}
          onRemove={s.remove}
          removing={s.removing}
          removeError={s.error}
          onResetRemove={s.resetRemove}
          error={s.loadError}
          onRetry={s.reload}
        />
      )}
```

- [ ] **Step 10: Verificar**

```bash
cd frontend && pnpm lint && pnpm test && pnpm build
```

Esperado: verde nos três. `TurmaDetailPage.test.tsx` pode quebrar se montar `EnrollmentSection` sem
QueryClient para as novas queries — a query de arquivadas nasce `enabled: false`, então não dispara;
se quebrar, é por import faltando no setup do teste, não por comportamento.

DoD de navegador:

1. `/operacion` → o par **Activos | Archivados** aparece na tabela; cada linha ganhou o ícone de caixa.
2. Arquivar uma turma **em andamento** com alunos matriculados → toast *"Registro archivado."*
3. **Archivados** → a turma está lá, com data, autor e a coluna **Alumnos** mostrando **o número que
   ela tinha**, não `0` — é a prova de tela da contagem as-of-archiving (P6).
4. **Restaurar** → volta para Activos; abrir o detalhe e conferir que os alunos e os documentos
   voltaram.
5. Tentar arquivar uma turma **concluída** → o diálogo não fecha e sai o toast vermelho
   *"La clase ya fue concluida: el registro académico está bloqueado (RN-15)."*
6. **O gate D1, na tela:** arquive a turma A; em `/operacion` crie uma turma nova a partir da MESMA
   cotação (o painel *Cotizaciones pendientes* volta a oferecê-la); tente restaurar A → toast vermelho
   *"Ya existe una clase activa para esta cotización: archívala antes de restaurar esta."* — e
   **não** uma tela de erro 500.
7. No detalhe de uma turma em andamento → aba **Alumnos**: o par **Activos | Archivados** aparece na
   barra. Remover um aluno, ir a **Archivados**, **Restaurar**, voltar a **Activos** e vê-lo de novo.
8. Concluir a turma e tentar restaurar um aluno arquivado → toast vermelho com a frase da RN-15.

- [ ] **Step 11: Commit**

```bash
git add frontend/src/features/operation/api/useTurmas.ts \
        frontend/src/features/operation/api/useEnrollments.ts \
        frontend/src/features/operation/hooks/useTurmasArchived.ts \
        frontend/src/features/operation/hooks/useEnrollmentsArchived.ts \
        frontend/src/features/operation/components/Turma/TurmaRowActions.tsx \
        frontend/src/features/operation/components/Turma/TurmasTable.tsx \
        frontend/src/features/operation/components/OperationPage.tsx \
        frontend/src/features/operation/components/Enrollment/ArchivedEnrollmentsList.tsx \
        frontend/src/features/operation/components/Enrollment/EnrollmentSection.tsx
git commit -m "feat(archive): arquivados e restauracao de turma e matricula na interface"
```

---

### Task 15: Fechamento — tipos, suítes, banco de desenvolvimento e o DoD inteiro

**Files:**
- Modify: `frontend/src/shared/types/generated.ts` (gerado, nunca à mão — ADR-04)
- Modify: o manifesto do typescript-transformer que acompanha o `generated.ts`

**Interfaces:** nenhuma nova. Esta task não escreve lógica; ela **prova** o que as catorze anteriores
escreveram.

> **Por que os tipos gerados têm commit próprio no fim.** As Tasks 5, 10 e 14 rodam
> `typescript:transform` para o `tsc` enxergar os DTOs novos, mas **não commitam** o `generated.ts`.
> Se cada uma commitasse, o arquivo apareceria em três commits com três estados intermediários — e o
> manifesto do transformer, que anda junto (precedente: commit `738c098`), ficaria fora de sincronia
> em dois deles. Um commit, no fim, com os seis tipos novos de uma vez.

- [ ] **Step 1: Regenerar e conferir os seis tipos**

```bash
docker compose exec -T app php artisan typescript:transform
cd frontend && grep -n 'ArchivedBudgetData\|ArchivedQuoteData\|ArchivedRedatorData\|ArchivedUserData\|ArchivedTurmaData\|ArchivedEnrollmentData' src/shared/types/generated.ts
```

Esperado: **seis** declarações `export type Archived…Data = {`, cada uma com o agregado, `archived_at:
string` e `archived_by: string | null`.

- [ ] **Step 2: Conferir que o `generated.ts` não foi editado à mão**

```bash
git diff --stat frontend/src/shared/types/generated.ts
```

Esperado: só adições dos seis tipos. Qualquer linha removida ou alterada fora deles significa que
alguém editou o arquivo — corrija o DTO e regenere (lei §3), nunca o arquivo.

- [ ] **Step 3: As duas suítes, inteiras**

```bash
docker compose exec -T app php artisan test
```

Esperado: verde. **Se der 12 failed com `RuntimeException: Session store not set on request.`**, é a
P-45 — já encerrada em 2026-08-18 com o `explode` + `[0]` em `backend/tests/TestCase.php`. Confira que
a correção está no arquivo antes de investigar qualquer outra coisa.

```bash
cd frontend && pnpm lint && pnpm test && pnpm build
```

Esperado: verde nos três, incluindo `src/shared/config/locales/parity.test.ts` — **nenhuma chave nova
entrou no bloco**; o que mudou foram os dois `confirmDeleteBody` da Task 5, presentes nos três
arquivos.

- [ ] **Step 4: O banco de desenvolvimento (MySQL), não só o sqlite dos testes**

A suíte roda em sqlite `:memory:`. A migration da Task 1 e as cinco permissões da Task 1 precisam
existir no MySQL de desenvolvimento para o DoD de navegador valer:

```bash
docker compose exec -T app php artisan migrate
docker compose exec -T app php artisan db:seed --class=RolePermissionSeeder
```

Esperado: a migration `2026_08_18_000002_add_archived_with_parent_to_more_tables` aplicada, e o seeder
concedendo as cinco permissões novas a `admin` e `superadmin`. **Faça logout e login de novo** antes
do DoD: o `can()` do frontend lê as permissões da sessão.

- [ ] **Step 5: O DoD de navegador, as três fases de uma vez**

Refaça, em sequência e na mesma sessão, os roteiros dos Steps 8/7 da Task 5, Step 7 da Task 6, Step 7
da Task 10 e Step 10 da Task 14. O que esta passagem final acrescenta é o **encadeamento**, que
nenhuma task isolada prova:

1. Em `/comercial`, arquive um **orçamento** com cotação e anexo.
2. Vá a **Archivados** e confira que a linha mostra a contagem de cotações que ele tinha.
3. Restaure. Abra o detalhe: cotações e anexos voltaram, e os três totais em UF batem com o que eram
   antes.
4. Em `/personas`, arquive um **redator** de uma turma **concluída**. Vá a `/certificados` e emita o
   certificado dessa turma → **funciona**. É o caso com peso legal da D3, provado na tela.
5. Restaure o redator; confira que os documentos de idoneidade voltaram.
6. Em `/operacion`, arquive uma **turma em andamento** com alunos. Confira em Archivados que ela
   mostra o número de alunos. Restaure; abra o detalhe; os alunos estão lá.
7. Em `/administracion`, confira que a lista de **Archivados** de usuários **não** mostra o usuário do
   cliente que você arquivou no passo 1.

- [ ] **Step 6: Commit dos tipos**

```bash
git add frontend/src/shared/types/generated.ts
git status --short
```

Se o manifesto do transformer também mudou (o precedente é o commit `738c098`), acrescente-o **ao
mesmo commit** — ele acompanha o `generated.ts` e separá-los deixa um dos dois desatualizado:

```bash
git add <caminho-do-manifesto-que-o-git-status-mostrar>
git commit -m "chore(types): dtos de arquivados dos seis roots no generated.ts"
```

> **`backend/config/cors.php` NÃO entra em nenhum `git add` deste bloco.** Ele já está commitado no
> branch e a modificação no working tree é WIP do João (multi-origin). Por isso todo `git add` deste
> plano usa caminhos exatos — nunca `git add -A`, nunca `git add backend/`.

- [ ] **Step 7: Conferir o que o bloco entregou**

```bash
git log --oneline main..HEAD
git diff --stat main...HEAD -- backend/config/cors.php
```

Esperado: quinze commits (um por task, sendo os de fase agrupados como escritos acima), e **zero
linhas** de diferença em `cors.php`.

---

## Handoff de execução

**executor: claude**

`paths_autorizados`: não se aplica (o campo só existe quando `executor: codex`).

**Por que não é do Codex.** O critério do `/planejar-bloco` é: `codex` para tasks mecânicas com
verificação executável e paths fechados; `claude` quando a task toca lei do `CLAUDE.md` §5, decisão de
arquitetura ou exige julgamento fora do plano. Este bloco toca **quatro** leis do §5, em tasks
diferentes:

| Lei §5 | Onde |
|---|---|
| §3 — tipos TS gerados do backend | Tasks 5, 10, 14 e 15 (seis DTOs novos, `generated.ts` + manifesto) |
| §5/§8 — RBAC e DoD provado | Task 1 (cinco permissões), Tasks 8/9/12/13 (guards), Task 15 (DoD de navegador) |
| §6 — features não importam outra feature | Tasks 5, 6, 10 e 14 (todo componente novo) |
| §8 — DoD = critério de aceite PROVADO | O bloco inteiro; a Task 7 é a única do projeto até hoje cujo DoD é *"o certificado ainda emite"* |

Além disso, três pontos exigem julgamento que o plano não consegue fechar por escrito:

1. **A Task 7 muda uma relação lida por Operation e Certification** (`Turma::redatores()` →
   `withTrashed()`). O Step 7 manda rodar a suíte inteira e **ler a asserção** de qualquer teste que
   virar vermelho: teste que exigia turma sem redator depois de arquivar o redator estava fixando o
   bug e a spec D3 o revoga; teste que conta redatores de uma turma com redator ativo não deveria
   mudar. Essa distinção não é mecânica.
2. **P7 é escopo declarado, não pedido.** O botão de arquivar em Identity e na turma resolve um DoD
   impossível, mas é decisão do João aceitá-lo ou cortá-lo. Quem executa precisa reconhecer o ponto e
   perguntar se ele reaparecer no review.
3. **P2 reabre a D-07** (idioma canônico de mensagem de erro). As duas frases novas saem em es-CL por
   precedente medido; se o João decidir a D-07 no outro sentido, são duas linhas em dois arquivos mais
   as duas asserções que as citam.

**Risco projetado: ALTO.** Três módulos, seis aggregate roots, uma migration, cinco permissões, uma
mudança de relação com efeito sobre emissão de certificado, e um gate que hoje é 500 em produção.

**Ordem obrigatória.** As fases são sequenciais (D6): Commercial (1-6) → Identity (7-10) → Operation
(11-14) → fechamento (15). Dentro de cada fase o backend precede o frontend, porque o frontend depende
do `typescript:transform` dos DTOs daquela fase. A Task 1 precede tudo: as três colunas e as cinco
permissões são pré-requisito de todas as outras.
