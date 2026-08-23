# Hardening de acesso, ownership e integridade — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** fechar a autorização por DADO no backend — redator só alcança turma em que está designado, conta desligada perde acesso no meio da sessão, redator ganha lançar nota/presença sem ganhar o Fluxo 3, e os escritores de filho tomam o lock do pai com catraca permanente.

**Architecture:** o ownership mora no `TurmaQueryBuilder` e entra por dois pontos — `visibleTo()` nas duas listagens e `Turma::resolveRouteBinding()` nas 20 rotas com `{turma}`, o que faz turma alheia devolver **404**. A revogação fecha nas duas pontas: purge de sessão na Action e um middleware por request no grupo `auth:sanctum`. A integridade ganha `lockForWrite()` em `Turma` e `Redator` (molde `Client::lockForWrite`), tomado por cinco escritores de filho, com um arch test de lista dupla onde silêncio reprova.

**Tech Stack:** Laravel 13 / PHP 8.3, spatie/laravel-permission, spatie/laravel-data + typescript-transformer, Sanctum SPA cookie/CSRF, MySQL 8 (dev) + sqlite `:memory:` (suíte), React 19 + TS.

**Spec:** [`docs/superpowers/specs/2026-08-22-hardening-acesso-ownership-e-integridade-design.md`](../../specs/archive/2026-08-22-hardening-acesso-ownership-e-integridade-design.md)
**Packet:** [`docs/superpowers/context-packets/2026-08-22-hardening-acesso-ownership-e-integridade.md`](../../context-packets/2026-08-22-hardening-acesso-ownership-e-integridade.md)
**Lane:** `lane-a`, main tree, branch `feat/hardening-acesso-ownership-e-integridade`, base `f6649297`.

## Global Constraints

- **Backend roda no container.** `docker compose exec -T app php artisan ...`. O host WSL não tem mbstring.
- **A suíte unida morre no `memory_limit` de 128M (P-50).** Rode por arquivo com `php artisan test --filter=...`; a varredura final do gate usa o binário direto: `docker compose exec -T app php -d memory_limit=1G vendor/bin/phpunit`.
- **Pint roda no host, de dentro de `backend/`, SEMPRE com argumento:** `cd backend && ./vendor/bin/pint <arquivos>`. Nunca sem argumento — reformata o repo inteiro.
- **`generated.ts` não se edita à mão** (lei §5.3). Corrige-se o DTO e roda `docker compose exec -T app php artisan typescript:transform`. Neste bloco o diff dele é **entregável**, não drift.
- **Erro sobe pelo handler global RFC 7807** (lei §5.4). Nunca `abort(422)` / `abort(401)` cru: lance exceção (`ValidationException`, `AuthenticationException`) e deixe o `ProblemDetails` traduzir.
- **Sem Repository sobre Eloquent** (lei §5.1, ADR-02). Consulta reaproveitada mora em `QueryBuilders/`; regra de escrita mora em Action.
- **Auditoria só na aplicação** (lei §5.2, ADR-08). Soft-delete por instância, nunca pelo query builder.
- **RBAC via seeder, roles de sistema imutáveis, `forgetCachedPermissions()` depois de mudar** (ADR-07).
- **Mensagem de domínio nova é es-CL** (a UI é es-CL, ADR-15). Ver `Turma::assertAcademicallyWritable()` como molde.
- **A suíte não prova lock:** `SQLiteGrammar::compileLock()` devolve string vazia. Nenhum teste deste plano tenta provar bloqueio real; a prova de corrida é o passo 11 do DoD, no MySQL de dev.
- Turma alheia devolve **404, nunca 403** (spec D3) — 403 confirmaria que a turma existe.
- Este bloco **não** toca o payload do Dashboard (D-34 fora), **não** reimplementa a RN-15 (já existe, 12 chamadores) e **não** mexe nos outros cinco campos com default literal da P-51.

---

## File Structure

**Backend — criados**

| Arquivo | Responsabilidade |
|---|---|
| `backend/app/Shared/Http/Middleware/EnsureAccountIsActive.php` | Ponta B da revogação: derruba a sessão e responde 401 quando `is_active` cai ou o `type` sai de `{admin, redator}`. |
| `backend/database/migrations/2026_08_22_000002_add_record_result_permission.php` | Cria `operation.enrollment.record_result` e a vincula a `superadmin`, `admin` e `redator` em banco já provisionado. |
| `backend/database/migrations/2026_08_22_000003_backfill_redator_role.php` | P-47: dá a role `redator` a todo `users.type = 'redator'` que não a tenha. |
| `backend/tests/Feature/Operation/TurmaOwnershipTest.php` | Ownership pelas duas entradas: listagem filtrada e 404 no binding. |
| `backend/tests/Feature/Identity/AccountDeactivationMidSessionTest.php` | Ponta B: sessão viva morre no request seguinte. |
| `backend/tests/Feature/Shared/ParentLockOnChildWriteTest.php` | Catraca permanente da P-49: lista dupla, silêncio reprova. |
| `backend/tests/Feature/Identity/RecordResultPermissionMigrationTest.php` | A migration da permissão nova, sobre estado legado. |
| `backend/tests/Feature/Identity/BackfillRedatorRoleMigrationTest.php` | A migration do backfill, sobre estado legado. |

**Backend — modificados**

| Arquivo | O que muda |
|---|---|
| `backend/app/Domains/Operation/QueryBuilders/TurmaQueryBuilder.php` | ganha `visibleTo(User $user)`. |
| `backend/app/Domains/Operation/Models/Turma.php` | ganha `resolveRouteBinding()` e `lockForWrite()`. |
| `backend/app/Domains/Identity/Models/Redator.php` | ganha `lockForWrite()`. |
| `backend/app/Domains/Operation/Http/Controllers/TurmaController.php` | `index()` e `archived()` passam por `visibleTo()`. |
| `backend/app/Domains/Operation/Http/Controllers/EnrollmentController.php` | `result` sai de `enrollment.manage` e vai para a permissão nova. |
| `backend/app/Domains/Identity/Support/PermissionCatalog.php` | catálogo ganha `operation.enrollment.record_result`. |
| `backend/database/seeders/RolePermissionSeeder.php` | `redatorPermissions()` vai de 2 para 3; o comentário mentiroso sobre a `TurmaPolicy` morre. |
| `backend/app/Domains/Identity/Data/UserData.php` | `is_active` vira `bool\|Optional` sem default. |
| `backend/app/Domains/Identity/Actions/UpdateStaffUserAction.php` | ganha o purge de sessão na transição ativo → inativo. |
| `backend/bootstrap/app.php` | registra o middleware novo no grupo da API. |
| `backend/app/Domains/Identity/Actions/StoreRedatorDocumentAction.php` | `Redator::lockForWrite()` dentro da transação. |
| `backend/app/Domains/Identity/Actions/UpdateRedatorAction.php` | `Redator::lockForWrite()` dentro da transação. |
| `backend/app/Domains/Operation/Actions/DesignateRedatorAction.php` | passa a abrir transação e toma `Redator::lockForWrite()`. |
| `backend/app/Domains/Operation/Actions/EnrollStudentAction.php` | `Turma::lockForWrite()` dentro da transação. |
| `backend/app/Domains/Operation/Actions/StoreTurmaDocumentAction.php` | passa a abrir transação e toma `Turma::lockForWrite()`; upload fica fora. |

**Frontend — modificados**

| Arquivo | O que muda |
|---|---|
| `frontend/src/shared/types/generated.ts` | regenerado (`is_active` de `UserData` vira opcional). |
| `frontend/src/features/identity/hooks/useStaffUserForm.ts` | narrowing `?? true`, molde do `useRedatorForm`. |
| `frontend/src/shared/config/locales/{en,es-CL,pt-BR}.json` | `perm.operation_enrollment_record_result`. |

---

### Task 1: Ownership na listagem — `visibleTo()`

O escopo nasce aqui e cobre `index` e `archived`. O binding vem na Task 2; até lá, turma alheia some da lista mas ainda abre pelo id — é esperado, e o teste desta task não afirma o contrário.

**Files:**
- Modify: `backend/app/Domains/Operation/QueryBuilders/TurmaQueryBuilder.php`
- Modify: `backend/app/Domains/Operation/Http/Controllers/TurmaController.php:49-53` (`index`) e `:88-102` (`archived`)
- Test: `backend/tests/Feature/Operation/TurmaOwnershipTest.php` (criar)

**Interfaces:**
- Consumes: nada de tasks anteriores.
- Produces: `TurmaQueryBuilder::visibleTo(\App\Domains\Identity\Models\User $user): static` — devolve o próprio builder inalterado para quem não é `type === 'redator'`; para redator, filtra por `whereHas('redatores', fn ($q) => $q->where('redatores.user_id', $user->id))`. A Task 2 chama exatamente este método.

- [ ] **Step 1: Escrever o teste que reprova**

Criar `backend/tests/Feature/Operation/TurmaOwnershipTest.php`:

```php
<?php

namespace Tests\Feature\Operation;

use App\Domains\Catalog\Models\Course;
use App\Domains\Commercial\Models\Budget;
use App\Domains\Commercial\Models\Client;
use App\Domains\Commercial\Models\Quote;
use App\Domains\Identity\Models\Redator;
use App\Domains\Identity\Models\User;
use App\Domains\Operation\Models\Turma;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Ownership por DADO, não por permissão. `operation.turma.view` concede o
 * direito de ver turmas; quais turmas é escopo de query (spec D1) — Policy
 * não filtra `index`, e ter as duas fontes divergiria.
 */
class TurmaOwnershipTest extends TestCase
{
    use RefreshDatabase;

    /** Redator ativo, com a role, designado às turmas passadas. */
    private function redatorCom(Turma ...$turmas): User
    {
        $user = User::factory()->create(['type' => 'redator', 'is_active' => true]);
        $user->assignRole('redator');
        $redator = $user->redator()->create([]);

        foreach ($turmas as $turma) {
            $turma->redatores()->attach($redator->id);
        }

        return $user;
    }

    private function turma(): Turma
    {
        $client = Client::factory()->create();
        $budget = Budget::factory()->create(['client_id' => $client->id]);
        $course = Course::factory()->create();
        $quote = Quote::factory()->create(['budget_id' => $budget->id, 'course_id' => $course->id]);

        return Turma::factory()->create(['quote_id' => $quote->id, 'course_id' => $course->id]);
    }

    public function test_redator_lista_somente_as_turmas_em_que_esta_designado(): void
    {
        $this->seed(RolePermissionSeeder::class);
        $minha = $this->turma();
        $alheia = $this->turma();
        $user = $this->redatorCom($minha);

        $ids = $this->actingAs($user, 'web')
            ->getJson('/api/turmas')
            ->assertOk()
            ->json('*.id');

        $this->assertSame([$minha->id], $ids);
        $this->assertNotContains($alheia->id, $ids);
    }

    public function test_admin_continua_listando_todas(): void
    {
        $this->actingAsAdmin();
        $a = $this->turma();
        $b = $this->turma();

        $ids = $this->getJson('/api/turmas')->assertOk()->json('*.id');

        $this->assertContains($a->id, $ids);
        $this->assertContains($b->id, $ids);
    }

    public function test_a_lista_de_arquivadas_usa_o_mesmo_escopo(): void
    {
        $this->seed(RolePermissionSeeder::class);
        $minha = $this->turma();
        $alheia = $this->turma();
        $user = $this->redatorCom($minha);

        $minha->delete();
        $alheia->delete();

        $ids = $this->actingAs($user, 'web')
            ->getJson('/api/turmas/archived')
            ->assertOk()
            ->json('*.turma.id');

        $this->assertSame([$minha->id], $ids);
    }
}
```

- [ ] **Step 2: Rodar o teste e ver reprovar**

Run: `docker compose exec -T app php artisan test --filter=TurmaOwnershipTest`
Expected: **FAIL** nos dois testes de redator — a lista vem com as duas turmas, `assertSame([$minha->id], $ids)` reprova. `test_admin_continua_listando_todas` já passa (é o controle positivo).

Se `Turma::factory()`, `Quote::factory()` ou `Budget::factory()` não existirem com essas colunas, ajuste o helper `turma()` ao que os testes vizinhos já usam — `TurmaCrudTest` e `TurmaQueryBuilderTest` são o molde. **Não** invente coluna.

- [ ] **Step 3: Escrever o `visibleTo()`**

Em `backend/app/Domains/Operation/QueryBuilders/TurmaQueryBuilder.php`, adicionar o `use` e o método depois de `withArchivedListingData()`:

```php
use App\Domains\Identity\Models\User;
```

```php
    /**
     * Ownership por DADO (spec D1). Admin e superadmin atravessam sem consulta
     * extra — o `if` sai antes do `whereHas`, e o custo do escopo é zero para
     * quem vê tudo.
     *
     * O filtro casa por `redatores.user_id` e não por `redatores.id` porque
     * quem autentica é o `User`; o `Redator` é o perfil pendurado nele.
     *
     * Não é Policy: Policy não filtra lista, então `index` precisaria de escopo
     * de query de qualquer jeito e o bloco nasceria com duas fontes de verdade
     * que podem divergir.
     */
    public function visibleTo(User $user): static
    {
        if ($user->type !== 'redator') {
            return $this;
        }

        return $this->whereHas('redatores', fn ($q) => $q->where('redatores.user_id', $user->id));
    }
```

- [ ] **Step 4: Ligar as duas listagens**

Em `backend/app/Domains/Operation/Http/Controllers/TurmaController.php`, `index()`:

```php
    /** @return array<TurmaData> */
    public function index(Request $request, TurmaHabilitacaoService $habilitacao): array
    {
        return Turma::query()->visibleTo($request->user())->withListingData()->latest()->get()
            ->map(fn (Turma $t) => TurmaData::fromModel($t, $habilitacao))
            ->all();
    }
```

E `archived()`:

```php
        $turmas = Turma::onlyTrashed()->visibleTo($request->user())->withArchivedListingData()->latest()->get();
```

com a assinatura passando a receber o request:

```php
    public function archived(Request $request, TurmaHabilitacaoService $habilitacao): array
```

Adicionar `use Illuminate\Http\Request;` ao topo do controller.

- [ ] **Step 5: Rodar o teste e ver passar**

Run: `docker compose exec -T app php artisan test --filter=TurmaOwnershipTest`
Expected: **PASS**, 3 testes.

- [ ] **Step 6: Rodar os vizinhos que a mudança podia quebrar**

Run:
```bash
docker compose exec -T app php artisan test --filter=TurmaCrudTest
docker compose exec -T app php artisan test --filter=TurmaArchiveEndpointTest
docker compose exec -T app php artisan test --filter=TurmaQueryBuilderTest
```
Expected: **PASS** nos três. Eles autenticam como admin, e para admin o escopo é inerte.

- [ ] **Step 7: Pint e commit**

```bash
cd backend && ./vendor/bin/pint app/Domains/Operation/QueryBuilders/TurmaQueryBuilder.php app/Domains/Operation/Http/Controllers/TurmaController.php tests/Feature/Operation/TurmaOwnershipTest.php
```

```bash
git add backend/app/Domains/Operation/QueryBuilders/TurmaQueryBuilder.php backend/app/Domains/Operation/Http/Controllers/TurmaController.php backend/tests/Feature/Operation/TurmaOwnershipTest.php
git commit -m "feat(operation): redator lista so as turmas em que esta designado"
```

---

### Task 2: Ownership no binding — 404 nas 20 rotas com `{turma}`

`resolveRouteBinding` é o que faz o escopo alcançar a superfície inteira de uma vez, e faz rota nova nascer coberta. `{turma}` aparece em **20** rotas de `app/Domains/Operation/routes.php` (contado, não estimado).

**Files:**
- Modify: `backend/app/Domains/Operation/Models/Turma.php` (adicionar `resolveRouteBinding` antes de `newEloquentBuilder`)
- Test: `backend/tests/Feature/Operation/TurmaOwnershipTest.php` (acrescentar casos)

**Interfaces:**
- Consumes: `TurmaQueryBuilder::visibleTo(User $user): static` da Task 1.
- Produces: `Turma::resolveRouteBinding($value, $field = null): ?static` — devolve `null` para turma fora do escopo, o que faz o `SubstituteBindings` lançar `NotFoundHttpException` (404 pelo `ProblemDetails`).

- [ ] **Step 1: Escrever os testes que reprovam**

Acrescentar a `backend/tests/Feature/Operation/TurmaOwnershipTest.php`:

```php
    public function test_turma_alheia_da_404_no_show(): void
    {
        $this->seed(RolePermissionSeeder::class);
        $minha = $this->turma();
        $alheia = $this->turma();
        $user = $this->redatorCom($minha);

        $this->actingAs($user, 'web')->getJson("/api/turmas/{$alheia->id}")->assertNotFound();
        $this->actingAs($user, 'web')->getJson("/api/turmas/{$minha->id}")->assertOk();
    }

    public function test_turma_alheia_da_404_e_nao_403(): void
    {
        $this->seed(RolePermissionSeeder::class);
        $alheia = $this->turma();
        $user = $this->redatorCom();

        // 403 confirmaria que a turma existe. O redator nao deve distinguir
        // "turma alheia" de "turma inexistente" (spec D3).
        $this->actingAs($user, 'web')
            ->getJson("/api/turmas/{$alheia->id}")
            ->assertNotFound();
    }

    public function test_turma_alheia_da_404_nas_rotas_derivadas_que_o_redator_alcanca(): void
    {
        $this->seed(RolePermissionSeeder::class);
        $alheia = $this->turma();
        $user = $this->redatorCom();

        $this->actingAs($user, 'web')->getJson("/api/turmas/{$alheia->id}/alunos")->assertNotFound();
        $this->actingAs($user, 'web')->getJson("/api/turmas/{$alheia->id}/documents")->assertNotFound();
        $this->actingAs($user, 'web')->postJson("/api/turmas/{$alheia->id}/documents", [])->assertNotFound();
    }

    public function test_admin_nao_e_afetado_pelo_binding(): void
    {
        $this->actingAsAdmin();
        $turma = $this->turma();

        $this->getJson("/api/turmas/{$turma->id}")->assertOk();
        $this->getJson("/api/turmas/{$turma->id}/alunos")->assertOk();
    }
```

- [ ] **Step 2: Rodar e ver reprovar**

Run: `docker compose exec -T app php artisan test --filter=TurmaOwnershipTest`
Expected: **FAIL** nos três testes novos de redator — hoje o binding resolve qualquer turma e a resposta é 200 (ou 422 no `POST /documents` sem arquivo), não 404. `test_admin_nao_e_afetado_pelo_binding` passa desde já.

- [ ] **Step 3: Implementar o `resolveRouteBinding`**

Em `backend/app/Domains/Operation/Models/Turma.php`, adicionar `use Illuminate\Support\Facades\Auth;` ao topo e o método logo antes de `newEloquentBuilder()`:

```php
    /**
     * O ownership da spec D1 alcança a superfície inteira por AQUI, e não rota
     * a rota: `{turma}` aparece em 20 rotas de `Operation/routes.php`, nenhuma
     * precisa lembrar de filtrar, e rota nova nasce coberta.
     *
     * Devolve `null` (e não `firstOrFail`) porque é o contrato do
     * `SubstituteBindings`: com `null` ele lança `NotFoundHttpException`, que o
     * `ProblemDetails` traduz em 404 RFC 7807. Turma alheia é indistinguível de
     * turma inexistente de propósito — 403 confirmaria que ela existe (D3).
     *
     * `Auth::user()` já está populado: `Authenticate` implementa
     * `AuthenticatesRequests` e o `$middlewarePriority` do framework o coloca
     * ANTES do `SubstituteBindings`. Rota sem auth cai no `null` e o escopo não
     * se aplica — não existe nenhuma hoje com `{turma}`, e se nascer uma, ela
     * nasce pública por escrita explícita e não por acidente deste método.
     *
     * As rotas aninhadas seguem intactas: `scopeBindings()` resolve o FILHO
     * dentro do `{turma}` já escopado, e as duas com `withoutScopedBindings()`
     * (`designateRedator`, `removeRedator`) isentam o `{redator}`, não o
     * `{turma}`.
     */
    public function resolveRouteBinding($value, $field = null): ?static
    {
        $user = Auth::user();

        return $this->newQuery()
            ->when($user !== null, fn (TurmaQueryBuilder $q) => $q->visibleTo($user))
            ->where($field ?? $this->getRouteKeyName(), $value)
            ->first();
    }
```

- [ ] **Step 4: Rodar e ver passar**

Run: `docker compose exec -T app php artisan test --filter=TurmaOwnershipTest`
Expected: **PASS**, 7 testes.

- [ ] **Step 5: Rodar toda a superfície de Operation**

Run:
```bash
docker compose exec -T app php artisan test --filter=Operation
```
Expected: **PASS**. Se algum teste de Certification/Operation reprovar por 404, verifique se ele autentica como admin — para admin o escopo é inerte, e um 404 novo ali significa que o `if` do `visibleTo` não está saindo cedo.

Run também: `docker compose exec -T app php artisan test --filter=NestedRouteOwnershipTest`
Expected: **PASS** — nenhuma rota mudou de declaração.

- [ ] **Step 6: Pint e commit**

```bash
cd backend && ./vendor/bin/pint app/Domains/Operation/Models/Turma.php tests/Feature/Operation/TurmaOwnershipTest.php
```

```bash
git add backend/app/Domains/Operation/Models/Turma.php backend/tests/Feature/Operation/TurmaOwnershipTest.php
git commit -m "feat(operation): turma alheia da 404 nas 20 rotas com {turma}"
```

---

### Task 3: Permissão própria para nota e presença

`operation.enrollment.manage` inteiro traria matricular, importar planilha e remover matrícula junto — o Fluxo 3 é do admin, e a RN-02 separa responsabilidades (spec D6). A permissão nova **não** é segregada: o `array_diff` do `adminPermissions()` a herda sozinho.

**Files:**
- Modify: `backend/app/Domains/Identity/Support/PermissionCatalog.php` (bloco `---- Operation ----`)
- Modify: `backend/database/seeders/RolePermissionSeeder.php:62-75`
- Modify: `backend/app/Domains/Operation/Http/Controllers/EnrollmentController.php:31-37`
- Create: `backend/database/migrations/2026_08_22_000002_add_record_result_permission.php`
- Create: `backend/tests/Feature/Identity/RecordResultPermissionMigrationTest.php`
- Modify: `frontend/src/shared/config/locales/en.json`, `es-CL.json`, `pt-BR.json`
- Test: `backend/tests/Feature/Operation/TurmaOwnershipTest.php` (acrescentar casos)

**Interfaces:**
- Consumes: o binding escopado da Task 2 — é ele que limita o lançamento à turma do redator, sem nenhuma checagem extra no controller.
- Produces: a permissão literal `operation.enrollment.record_result`, consumida pelo middleware do `EnrollmentController` e pela Task 9 (prova 12 do DoD).

- [ ] **Step 1: Escrever os testes que reprovam**

Acrescentar a `backend/tests/Feature/Operation/TurmaOwnershipTest.php`:

```php
    public function test_redator_lanca_resultado_na_turma_dele(): void
    {
        $this->seed(RolePermissionSeeder::class);
        $minha = $this->turma();
        $user = $this->redatorCom($minha);
        $enrollment = $this->matricula($minha);

        $this->actingAs($user, 'web')
            ->putJson("/api/turmas/{$minha->id}/alunos/{$enrollment->id}/resultado", [
                'grade' => 6.0,
                'attendance_pct' => 100,
            ])
            ->assertOk();
    }

    public function test_redator_nao_lanca_resultado_em_turma_alheia(): void
    {
        $this->seed(RolePermissionSeeder::class);
        $alheia = $this->turma();
        $user = $this->redatorCom();
        $enrollment = $this->matricula($alheia);

        $this->actingAs($user, 'web')
            ->putJson("/api/turmas/{$alheia->id}/alunos/{$enrollment->id}/resultado", [
                'grade' => 6.0,
                'attendance_pct' => 100,
            ])
            ->assertNotFound();
    }

    public function test_redator_continua_sem_o_fluxo_3(): void
    {
        $this->seed(RolePermissionSeeder::class);
        $minha = $this->turma();
        $user = $this->redatorCom($minha);

        // A permissao nova cobre SO o resultado. Matricular, importar planilha
        // e remover matricula seguem no `enrollment.manage`, que e do admin.
        $this->actingAs($user, 'web')
            ->postJson("/api/turmas/{$minha->id}/alunos", [
                'rut' => '11.111.111-1', 'name' => 'Aluno', 'email' => null, 'phone' => null,
            ])
            ->assertForbidden();
    }
```

E o helper de matrícula, junto dos outros:

```php
    private function matricula(Turma $turma): \App\Domains\Operation\Models\Enrollment
    {
        $aluno = User::factory()->create(['type' => 'aluno', 'is_active' => false]);
        $student = $aluno->student()->create([]);

        return \App\Domains\Operation\Models\Enrollment::create([
            'turma_id' => $turma->id,
            'student_id' => $student->id,
        ]);
    }
```

Se o payload de `EnrollmentResultData` ou a criação de `Student` divergirem, copie a forma exata de `EnrollmentResultTest` — ele já monta esse cenário.

- [ ] **Step 2: Rodar e ver reprovar**

Run: `docker compose exec -T app php artisan test --filter=TurmaOwnershipTest`
Expected: **FAIL** em `test_redator_lanca_resultado_na_turma_dele` com **403** — hoje `result` está sob `operation.enrollment.manage`, que a role `redator` não tem. Os outros dois passam desde já (o 404 vem da Task 2, o 403 do `store` é o estado atual e o desejado).

- [ ] **Step 3: Acrescentar a permissão ao catálogo**

Em `backend/app/Domains/Identity/Support/PermissionCatalog.php`, dentro do bloco `---- Operation ----`, logo depois de `operation.enrollment.manage`:

```php
            'operation.enrollment.record_result' => 'Lançar nota e presença da matrícula (RN-02 — ação do redator)',
```

- [ ] **Step 4: Dar a permissão ao redator no seeder**

Em `backend/database/seeders/RolePermissionSeeder.php`, substituir o docblock e o corpo de `redatorPermissions()`:

```php
    /**
     * redator = mínimo do Fluxo 7 (interface própria).
     *
     * A restrição "só as turmas que ele ministra" NÃO mora aqui: é escopo de
     * DADO, e vive em `TurmaQueryBuilder::visibleTo()` mais o
     * `Turma::resolveRouteBinding()` (spec D1). O comentário anterior prometia
     * uma `TurmaPolicy` numa "Task de Policies" que nunca existiu — o
     * repositório tem zero classes `Policy`, e a promessa ficou de pé por
     * quatro meses.
     *
     * `record_result` é permissão própria e não `enrollment.manage`: o Fluxo 3
     * (matricular, importar, remover) é do admin, e a RN-02 separa
     * responsabilidades (spec D6).
     */
    private function redatorPermissions(array $permissions): array
    {
        return [
            'operation.turma.view',
            'operation.turma.submit_docs',
            'operation.enrollment.record_result',
        ];
    }
```

- [ ] **Step 5: Mover `result` no controller**

Em `backend/app/Domains/Operation/Http/Controllers/EnrollmentController.php`:

```php
    public static function middleware(): array
    {
        return [
            new Middleware('permission:operation.turma.view', only: ['index', 'archived']),
            new Middleware('permission:operation.enrollment.manage', only: ['store', 'import', 'destroy', 'preview']),
            // Separada de `manage` de propósito: o redator lança nota e presença
            // sem ganhar matricular/importar/remover (RN-02, spec D6). O escopo
            // por turma vem do binding, não daqui.
            new Middleware('permission:operation.enrollment.record_result', only: ['result']),
            new Middleware('permission:operation.enrollment.restore', only: ['restore']),
        ];
    }
```

- [ ] **Step 6: Escrever a migration**

Criar `backend/database/migrations/2026_08_22_000002_add_record_result_permission.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\PermissionRegistrar;

/**
 * `operation.enrollment.record_result` separa lançar nota/presença do resto do
 * Fluxo 3 (RN-02, spec D6). O seeder já a cria a partir do catálogo, mas seeder
 * só corrige quem o roda: banco já provisionado ficaria com o `result` atrás de
 * uma permissão que ninguém tem — inclusive o admin, que HOJE consegue lançar
 * pelo `enrollment.manage`. Perder capacidade numa migration seria regressão,
 * então o `up()` vincula às três roles de sistema.
 *
 * Filtro `guard_name = 'web'` em toda consulta: é o único guard da aplicação, e
 * sem o filtro a migration alcançaria linha de outro guard se um dia existir.
 *
 * `down()` apaga a permissão — o FK de `role_has_permissions` é
 * `onDelete('cascade')` (ver `create_permission_tables`), então os vínculos caem
 * junto e reverter não devolve capacidade a role nenhuma.
 */
return new class extends Migration
{
    private const PERMISSAO = 'operation.enrollment.record_result';

    private const ROLES = ['superadmin', 'admin', 'redator'];

    public function up(): void
    {
        $permissoes = config('permission.table_names.permissions');
        $roles = config('permission.table_names.roles');
        $pivot = config('permission.table_names.role_has_permissions');
        $agora = now();

        $id = DB::table($permissoes)
            ->where('name', self::PERMISSAO)
            ->where('guard_name', 'web')
            ->value('id');

        if ($id === null) {
            $id = DB::table($permissoes)->insertGetId([
                'name' => self::PERMISSAO,
                'guard_name' => 'web',
                'created_at' => $agora,
                'updated_at' => $agora,
            ]);
        }

        foreach (self::ROLES as $nome) {
            $roleId = DB::table($roles)->where('name', $nome)->where('guard_name', 'web')->value('id');

            if ($roleId === null) {
                continue;   // banco sem essa role de sistema: o seeder a cria com a permissão junto
            }

            $vinculado = DB::table($pivot)
                ->where('permission_id', $id)
                ->where('role_id', $roleId)
                ->exists();

            if (! $vinculado) {
                DB::table($pivot)->insert(['permission_id' => $id, 'role_id' => $roleId]);
            }
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    public function down(): void
    {
        DB::table(config('permission.table_names.permissions'))
            ->where('name', self::PERMISSAO)
            ->where('guard_name', 'web')
            ->delete();

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }
};
```

- [ ] **Step 7: Escrever o teste da migration**

Criar `backend/tests/Feature/Identity/RecordResultPermissionMigrationTest.php`:

```php
<?php

namespace Tests\Feature\Identity;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

/**
 * A suíte nasce com o catálogo JÁ contendo a permissão, então rodar a migration
 * sobre o estado da suíte provaria nada. O teste RECRIA o estado legado — as
 * três roles sem a permissão — e executa `up()` sobre ele, mesmo molde do
 * `RemoveOrphanFeedbackPermissionsMigrationTest`.
 */
class RecordResultPermissionMigrationTest extends TestCase
{
    use RefreshDatabase;

    private const PERMISSAO = 'operation.enrollment.record_result';

    private function migration(): object
    {
        return require base_path('database/migrations/2026_08_22_000002_add_record_result_permission.php');
    }

    /** @return array<string,Role> */
    private function semearEstadoLegado(): array
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        Permission::where('name', self::PERMISSAO)->delete();

        $roles = [];
        foreach (['superadmin', 'admin', 'redator'] as $nome) {
            $roles[$nome] = Role::firstOrCreate(['name' => $nome, 'guard_name' => 'web']);
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();

        return $roles;
    }

    public function test_up_cria_a_permissao_e_vincula_as_tres_roles(): void
    {
        $roles = $this->semearEstadoLegado();

        $this->migration()->up();
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $permissao = Permission::where('name', self::PERMISSAO)->where('guard_name', 'web')->first();
        $this->assertNotNull($permissao);

        foreach ($roles as $nome => $role) {
            $this->assertTrue(
                $role->fresh()->hasPermissionTo(self::PERMISSAO),
                "A role {$nome} ficou sem a permissão.",
            );
        }
    }

    public function test_up_e_idempotente(): void
    {
        $this->semearEstadoLegado();

        $this->migration()->up();
        $this->migration()->up();
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $this->assertSame(1, Permission::where('name', self::PERMISSAO)->count());
    }

    public function test_down_apaga_a_permissao_e_os_vinculos(): void
    {
        $roles = $this->semearEstadoLegado();

        $this->migration()->up();
        $id = Permission::where('name', self::PERMISSAO)->value('id');
        $this->migration()->down();
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $this->assertSame(0, Permission::where('name', self::PERMISSAO)->count());
        $this->assertSame(
            0,
            DB::table(config('permission.table_names.role_has_permissions'))
                ->where('permission_id', $id)
                ->count(),
        );
        $this->assertFalse($roles['redator']->fresh()->hasPermissionTo(self::PERMISSAO));
    }
}
```

- [ ] **Step 8: Rodar as três locales para vermelho**

Run: `docker compose exec -T app php artisan test --filter=PermissionI18nParityTest`
Expected: **FAIL** — `Locale en: chaves `perm.*` divergem de PermissionCatalog::descriptions(). Faltando: operation_enrollment_record_result.` A catraca morde antes de alguém ver a chave crua na tela.

- [ ] **Step 9: Traduzir nas três locales**

Em cada arquivo, dentro do objeto `perm`, logo depois de `operation_enrollment_manage`:

`frontend/src/shared/config/locales/es-CL.json`:
```json
    "operation_enrollment_record_result": "Registrar nota y asistencia de la matrícula (RN-02 — acción del redactor)",
```

`frontend/src/shared/config/locales/pt-BR.json`:
```json
    "operation_enrollment_record_result": "Lançar nota e presença da matrícula (RN-02 — ação do redator)",
```

`frontend/src/shared/config/locales/en.json`:
```json
    "operation_enrollment_record_result": "Record enrollment grade and attendance (RN-02 — editor action)",
```

- [ ] **Step 10: Rodar tudo e ver passar**

Run:
```bash
docker compose exec -T app php artisan test --filter=PermissionI18nParityTest
docker compose exec -T app php artisan test --filter=RecordResultPermissionMigrationTest
docker compose exec -T app php artisan test --filter=TurmaOwnershipTest
docker compose exec -T app php artisan test --filter=PermissionCatalogTest
docker compose exec -T app php artisan test --filter=RbacAuthTest
docker compose exec -T app php artisan test --filter=EnrollmentApiTest
docker compose exec -T app php artisan test --filter=EnrollmentResultTest
```
Expected: **PASS** em todos. `EnrollmentResultTest` e `EnrollmentApiTest` autenticam como admin, e o admin herda a permissão nova pelo `array_diff`.

- [ ] **Step 11: Pint e commit**

```bash
cd backend && ./vendor/bin/pint app/Domains/Identity/Support/PermissionCatalog.php database/seeders/RolePermissionSeeder.php app/Domains/Operation/Http/Controllers/EnrollmentController.php database/migrations/2026_08_22_000002_add_record_result_permission.php tests/Feature/Identity/RecordResultPermissionMigrationTest.php tests/Feature/Operation/TurmaOwnershipTest.php
```

```bash
git add backend/app/Domains/Identity/Support/PermissionCatalog.php backend/database/seeders/RolePermissionSeeder.php backend/app/Domains/Operation/Http/Controllers/EnrollmentController.php backend/database/migrations/2026_08_22_000002_add_record_result_permission.php backend/tests/Feature/Identity/RecordResultPermissionMigrationTest.php backend/tests/Feature/Operation/TurmaOwnershipTest.php frontend/src/shared/config/locales/en.json frontend/src/shared/config/locales/es-CL.json frontend/src/shared/config/locales/pt-BR.json
git commit -m "feat(identity): permissao propria para nota e presenca do redator"
```

---

### Task 4: P-51 — omitir `is_active` não reativa staff

`['present','boolean']` faria a omissão virar 422, o que contradiz a **D1 da spec do BD-14** (2026-08-20): "omissão preserva". Reabrir decisão de dois dias atrás para economizar um diff de `generated.ts` não paga (spec D4).

**Files:**
- Modify: `backend/app/Domains/Identity/Data/UserData.php:39`
- Modify: `frontend/src/shared/types/generated.ts` (regenerado, nunca à mão)
- Modify: `frontend/src/features/identity/hooks/useStaffUserForm.ts:34,53`
- Test: `backend/tests/Feature/Identity/StaffPutOmissionTest.php` (acrescentar caso)

**Interfaces:**
- Consumes: nada.
- Produces: `UserData::$is_active` passa a ser `bool|Optional`; em TS, `is_active: undefined | boolean`. A Task 5 depende disso para que o purge só dispare em transição real.

- [ ] **Step 1: Escrever o teste que reprova**

Acrescentar a `backend/tests/Feature/Identity/StaffPutOmissionTest.php`:

```php
    public function test_put_sem_is_active_nao_reativa_staff_desligado(): void
    {
        $this->actingAsSuperadmin();
        $alvo = $this->alvo();
        $alvo->update(['is_active' => false]);

        // P-51: o default literal `= true` da propriedade entrega `true` ANTES
        // do ramo do `Optional`, e o `WritableAttributes::from()` recebe um
        // valor de verdade em vez de uma chave ausente — omitir reativava.
        $this->putJson("/api/users/{$alvo->id}", [
            'name' => 'Alvo Editado',
            'email' => 'alvo@lotus.cl',
            'role' => 'admin',
        ])->assertOk();

        $this->assertFalse($alvo->refresh()->is_active);
    }
```

- [ ] **Step 2: Rodar e ver reprovar**

Run: `docker compose exec -T app php artisan test --filter=StaffPutOmissionTest`
Expected: **FAIL** no teste novo — `Failed asserting that true is false`. Os três antigos passam.

- [ ] **Step 3: Tirar o default literal do DTO**

Em `backend/app/Domains/Identity/Data/UserData.php`, na assinatura do construtor:

```php
        public string $role,
        /**
         * `Optional` sem default, espelhando `RedatorData::$is_active` — que
         * acerta pela mesma forma. Com `= true` o `DefaultValuesDataPipe`
         * entrega o literal ANTES de o ramo do `Optional` existir, e um PUT que
         * não fala de acesso reativava conta desligada (P-51). A lei "ausente
         * não é nulo" não alcança propriedade com default literal.
         *
         * NÃO é `['present','boolean']`: omissão viraria 422, contra a D1 da
         * spec do BD-14 (omissão preserva).
         */
        public bool|Optional $is_active,
        public string|Optional $password = new Optional,
```

Atenção à ordem dos parâmetros: `is_active` perde o default, então precisa vir **antes** de qualquer parâmetro com default. Ele já vem antes de `$password` — mantenha a posição.

- [ ] **Step 4: Rodar o teste e ver passar**

Run: `docker compose exec -T app php artisan test --filter=StaffPutOmissionTest`
Expected: **PASS**, 4 testes.

- [ ] **Step 5: Regenerar os tipos**

Run: `docker compose exec -T app php artisan typescript:transform`

Verificar o diff:
```bash
git diff --stat frontend/src/shared/types/generated.ts
git diff frontend/src/shared/types/generated.ts
```
Expected: **uma** linha muda — `is_active: boolean,` vira `is_active: undefined | boolean,` no `UserData`. É a grafia que a linha do `RedatorData` já carrega. Se outra coisa mudar, PARE: o diff deste bloco é só esse.

- [ ] **Step 6: Ver o `pnpm build` reprovar**

Run: `cd frontend && pnpm build`
Expected: **FAIL** — `tsc -b` acusa `boolean | undefined` onde o form espera `boolean`, em `useStaffUserForm.ts` e/ou nos sítios que consomem `form.is_active`.

Se o build passar, o narrowing não é necessário e o Step 7 vira no-op — registre isso e siga; **não** invente mudança para justificar o passo.

- [ ] **Step 7: Narrowing no molde do redator**

Em `frontend/src/features/identity/hooks/useStaffUserForm.ts`, linha 34 (mapeamento da entidade):

```ts
        is_active: user.is_active ?? true,
```

e linha 53 (montagem do payload):

```ts
        is_active: form.is_active ?? true,
```

O idioma é o do `useRedatorForm.ts:28,90`, que já resolve `undefined` como ativo — é o default do cadastro.

- [ ] **Step 8: Rodar o front inteiro**

Run:
```bash
cd frontend && pnpm build
cd frontend && pnpm lint
cd frontend && pnpm test
```
Expected: **PASS** nos três.

- [ ] **Step 9: Rodar o contrato do backend**

Run:
```bash
docker compose exec -T app php artisan test --filter=ContratoDeIdentidadeTest
docker compose exec -T app php artisan test --filter=StaffUserCrudTest
docker compose exec -T app php artisan test --filter=StaffUserActionTest
docker compose exec -T app php artisan test --filter=RedatorAndStudentPutOmissionTest
```
Expected: **PASS**.

- [ ] **Step 10: Pint e commit**

```bash
cd backend && ./vendor/bin/pint app/Domains/Identity/Data/UserData.php tests/Feature/Identity/StaffPutOmissionTest.php
```

```bash
git add backend/app/Domains/Identity/Data/UserData.php backend/tests/Feature/Identity/StaffPutOmissionTest.php frontend/src/shared/types/generated.ts frontend/src/features/identity/hooks/useStaffUserForm.ts
git commit -m "fix(identity): omitir is_active nao reativa staff desligado (P-51)"
```

---

### Task 5: Revogação nas duas pontas

Só o purge fecha apenas o caminho que passa pela Action — conta desligada por seed, por SQL direto ou por Action futura mantém sessão viva. Só o middleware deixa a linha em `sessions` viva até expirar. As duas (spec D5).

**Files:**
- Modify: `backend/app/Domains/Identity/Actions/UpdateStaffUserAction.php`
- Create: `backend/app/Shared/Http/Middleware/EnsureAccountIsActive.php`
- Modify: `backend/bootstrap/app.php:29-32`
- Test: `backend/tests/Feature/Identity/AccountDeactivationMidSessionTest.php` (criar)

**Interfaces:**
- Consumes: `UserData::$is_active` como `bool|Optional` (Task 4) — é o que faz o teste da transição distinguir omissão de `false` explícito. `PurgeOtherSessionsAction::all(User $user): int`, que já existe.
- Produces: o middleware `EnsureAccountIsActive`, apendado ao grupo `api` — vale para toda rota autenticada, sem lista.

- [ ] **Step 1: Escrever os testes que reprovam**

Criar `backend/tests/Feature/Identity/AccountDeactivationMidSessionTest.php`:

```php
<?php

namespace Tests\Feature\Identity;

use App\Domains\Identity\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

/**
 * `is_active` era conferido SÓ no login (`AuthController:52`): sessão viva
 * sobrevivia à desativação até o cookie expirar. Duas pontas fecham a janela —
 * a transição (purge na Action) e o request (este middleware). Nenhuma das
 * duas resolve o caso da outra (spec D5).
 */
class AccountDeactivationMidSessionTest extends TestCase
{
    use RefreshDatabase;

    public function test_desativar_staff_pela_action_derruba_as_sessoes(): void
    {
        $this->actingAsSuperadmin();

        $alvo = User::factory()->create(['type' => 'admin', 'is_active' => true, 'email' => 'alvo@lotus.cl']);
        $alvo->assignRole('admin');

        foreach (['sess-a', 'sess-b'] as $id) {
            DB::table('sessions')->insert([
                'id' => $id, 'user_id' => $alvo->id, 'ip_address' => '127.0.0.1',
                'user_agent' => 'phpunit', 'payload' => 'x', 'last_activity' => 1_755_000_000,
            ]);
        }

        $this->putJson("/api/users/{$alvo->id}", [
            'name' => 'Alvo', 'email' => 'alvo@lotus.cl', 'role' => 'admin', 'is_active' => false,
        ])->assertOk();

        $this->assertFalse($alvo->refresh()->is_active);
        $this->assertSame(0, DB::table('sessions')->where('user_id', $alvo->id)->count());
    }

    public function test_reenviar_false_para_quem_ja_estava_inativo_nao_purga(): void
    {
        $this->actingAsSuperadmin();

        $alvo = User::factory()->create(['type' => 'admin', 'is_active' => false, 'email' => 'alvo@lotus.cl']);
        $alvo->assignRole('admin');

        DB::table('sessions')->insert([
            'id' => 'sess-c', 'user_id' => $alvo->id, 'ip_address' => '127.0.0.1',
            'user_agent' => 'phpunit', 'payload' => 'x', 'last_activity' => 1_755_000_000,
        ]);

        $this->putJson("/api/users/{$alvo->id}", [
            'name' => 'Alvo', 'email' => 'alvo@lotus.cl', 'role' => 'admin', 'is_active' => false,
        ])->assertOk();

        // Revogação é TRANSIÇÃO, não estado — mesma forma do
        // `UpdateRedatorAction`. Reenviar `false` não derruba sessão nenhuma.
        $this->assertSame(1, DB::table('sessions')->where('user_id', $alvo->id)->count());
    }

    /**
     * Login REAL, não `actingAs`: o `actingAs` fixa uma instância em memória e
     * a reusa em todo request do teste, então um UPDATE por fora não seria
     * visto e o teste passaria verde sem provar nada. Com sessão de verdade o
     * `SessionGuard` refaz o `retrieveById` a cada request.
     */
    private function logar(User $user): void
    {
        $user->forceFill(['password' => Hash::make('senha123')])->save();

        $this->postJson('/api/login', ['email' => $user->email, 'password' => 'senha123'])
            ->assertOk();
    }

    public function test_conta_desativada_por_fora_perde_acesso_no_request_seguinte(): void
    {
        $this->seed(\Database\Seeders\RolePermissionSeeder::class);
        $user = User::factory()->create(['type' => 'admin', 'is_active' => true]);
        $user->assignRole('admin');
        $this->logar($user);

        $this->getJson('/api/me')->assertOk();

        // Por fora da Action, que é o caso que o purge não alcança: seed, SQL
        // direto, Action futura.
        DB::table('users')->where('id', $user->id)->update(['is_active' => false]);

        $this->getJson('/api/me')
            ->assertStatus(401)
            ->assertHeader('Content-Type', 'application/problem+json');
    }

    public function test_type_fora_de_admin_e_redator_perde_acesso(): void
    {
        $this->seed(\Database\Seeders\RolePermissionSeeder::class);
        $user = User::factory()->create(['type' => 'admin', 'is_active' => true]);
        $user->assignRole('admin');
        $this->logar($user);

        $this->getJson('/api/me')->assertOk();

        // RN-01 aplicada por REQUEST e não só na porta: cliente e aluno nascem
        // `is_active = false` e já não logam, mas um `type` trocado por SQL
        // atravessava tudo.
        DB::table('users')->where('id', $user->id)->update(['type' => 'cliente']);

        $this->getJson('/api/me')->assertStatus(401);
    }
}
```

- [ ] **Step 2: Rodar e ver reprovar**

Run: `docker compose exec -T app php artisan test --filter=AccountDeactivationMidSessionTest`
Expected: **FAIL** em três dos quatro. `test_reenviar_false...` passa por acidente (hoje não há purge nenhum) — é o controle que impede a correção de virar purga incondicional.

- [ ] **Step 3: Purge na Action**

Em `backend/app/Domains/Identity/Actions/UpdateStaffUserAction.php`, injetar a Action de sessões:

```php
    public function __construct(
        private UserProvisioner $users,
        private SuperadminGuard $guard,
        private PurgeOtherSessionsAction $sessions,
    ) {}
```

Dentro do `DB::transaction`, calcular a transição **antes** do `update` e purgar **depois** dele — mesma forma medida no `UpdateRedatorAction:70-83`:

```php
            // Revogação é transição, não estado: só purga quem estava ativo e
            // passou a inativo. Reenviar `false` para conta já desligada não
            // derruba sessão nenhuma. Forma copiada do `UpdateRedatorAction`,
            // que já acertava — o staff é que não tinha a metade dele.
            $revogando = ! $data->is_active instanceof Optional
                && $data->is_active === false
                && $user->is_active === true;

            $attrs = WritableAttributes::from([
                // ... inalterado
            ]);

            // `password` NÃO entra no helper: ... (comentário existente inalterado)
            if (! ($data->password instanceof Optional) && $data->password !== '') {
                $attrs['password'] = $data->password;
            }

            $this->users->writing(fn () => $user->update($attrs));

            if ($revogando) {
                $this->sessions->all($user);
            }

            $user->syncRoles([$data->role]);
```

- [ ] **Step 4: Escrever o middleware**

Criar `backend/app/Shared/Http/Middleware/EnsureAccountIsActive.php`:

```php
<?php

namespace App\Shared\Http\Middleware;

use Closure;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

/**
 * A RN-01 aplicada por REQUEST, não só na porta. `AuthController:52` confere
 * `is_active` no login e mais nada: uma sessão viva sobrevivia à desativação
 * até o cookie expirar.
 *
 * É a ponta B da spec D5. A ponta A (purge de sessão na Action) fecha o caminho
 * que passa pela Action; esta fecha o resto — conta desligada por seed, por SQL
 * direto ou por uma Action que ainda não existe.
 *
 * Não custa consulta: o Sanctum já carregou o `User` para popular
 * `$request->user()`, e este middleware lê o objeto em mão.
 *
 * `AuthenticationException` e não `abort(401)`: o erro sobe ao handler global e
 * sai como RFC 7807 `application/problem+json` (lei §5.4, ADR-03). A sessão é
 * invalidada ANTES de lançar — deixar a linha viva devolveria 401 a cada
 * request até o cookie expirar, com a sessão ainda no banco.
 */
class EnsureAccountIsActive
{
    /** Os únicos tipos que autenticam (RN-01). Cliente e aluno não logam. */
    private const TIPOS_ELEGIVEIS = ['admin', 'redator'];

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user === null) {
            return $next($request);   // rota pública: a autenticação decide, não este middleware
        }

        if (! $user->is_active || ! in_array($user->type, self::TIPOS_ELEGIVEIS, true)) {
            if ($request->hasSession()) {
                $request->session()->invalidate();
            }

            Auth::guard('web')->logout();

            throw new AuthenticationException(__('auth.inactive'));
        }

        return $next($request);
    }
}
```

Verifique que a chave `auth.inactive` existe nos quatro locales de `backend/lang/` — o `AuthController` já a usa, então deve existir. Se faltar em algum, acrescente com o mesmo texto do vizinho.

- [ ] **Step 5: Registrar o middleware**

Em `backend/bootstrap/app.php`, no bloco `$middleware->api(append: [...])`:

```php
        // Localização por request: Accept-Language -> locale (i18n front↔back, ADR-15).
        $middleware->api(append: [
            \App\Shared\Http\Middleware\SetLocale::class,
            // Ponta B da revogação (spec D5): conta desligada ou com `type`
            // fora de {admin, redator} perde acesso no request seguinte, e não
            // só no próximo login. Apendado ao grupo, não listado por rota —
            // rota autenticada nova nasce coberta.
            \App\Shared\Http\Middleware\EnsureAccountIsActive::class,
        ]);
```

**Risco conhecido de ordem, e como medi-lo em vez de supor.** Middleware de grupo sem prioridade
declarada roda ANTES do `auth:sanctum` da rota, que está no `$middlewarePriority` do framework. Na
prática `$request->user()` já resolve nesse ponto — o `statefulApi()` prepende
`EnsureFrontendRequestsAreStateful` e o `StartSession` (que TEM prioridade) roda antes de tudo, então
o guard de sessão responde sob demanda. **Se** os dois testes de login real do Step 1 vierem 200 em
vez de 401, é isto: o middleware está lendo `null` e passando reto. O conserto então NÃO é mexer na
ordem do grupo — é declarar a prioridade dele logo depois do `Authenticate`:

```php
$middleware->priority([
    // ... lista do framework, com esta linha logo APÓS
    // \Illuminate\Contracts\Auth\Middleware\AuthenticatesRequests::class
    \App\Shared\Http\Middleware\EnsureAccountIsActive::class,
]);
```

Meça antes de escolher. A prova 8 do DoD (Task 9) é a que decide de verdade: ela roda contra sessão
real na API em `:8080`, sem `actingAs` nenhum no meio.

- [ ] **Step 6: Rodar e ver passar**

Run: `docker compose exec -T app php artisan test --filter=AccountDeactivationMidSessionTest`
Expected: **PASS**, 4 testes.

- [ ] **Step 7: Rodar a superfície autenticada inteira**

Run:
```bash
docker compose exec -T app php artisan test --filter=AuthTest
docker compose exec -T app php artisan test --filter=RbacAuthTest
docker compose exec -T app php artisan test --filter=Identity
docker compose exec -T app php artisan test --filter=Operation
```
Expected: **PASS**. O `UserFactory` já nasce `type => 'admin'`, `is_active => true`, então a maioria dos fixtures atravessa. O risco está nos que usam `->aluno()`, `->inactive()` ou `->cliente()` e mesmo assim batem em rota autenticada: se algum reprovar com **401**, é o middleware mordendo um fixture que nunca deveria autenticar, e o conserto é o fixture. Se o fixture estiver correto e o 401 for indevido, PARE e reveja o middleware — não relaxe a condição para fazer o teste passar.

- [ ] **Step 8: Pint e commit**

```bash
cd backend && ./vendor/bin/pint app/Domains/Identity/Actions/UpdateStaffUserAction.php app/Shared/Http/Middleware/EnsureAccountIsActive.php bootstrap/app.php tests/Feature/Identity/AccountDeactivationMidSessionTest.php
```

```bash
git add backend/app/Domains/Identity/Actions/UpdateStaffUserAction.php backend/app/Shared/Http/Middleware/EnsureAccountIsActive.php backend/bootstrap/app.php backend/tests/Feature/Identity/AccountDeactivationMidSessionTest.php
git commit -m "feat(identity): revogacao fecha nas duas pontas — purge e middleware por request"
```

---

### Task 6: A catraca da P-49 — arch test de lista dupla

O teste vem **antes** das correções, e é ele que produz a evidência que a P-49 pede. Não é lista de pares inferida: o universo é medido, e silêncio reprova (idioma do `NestedRouteOwnershipTest`).

**Files:**
- Create: `backend/tests/Feature/Shared/ParentLockOnChildWriteTest.php`

**Interfaces:**
- Consumes: nada.
- Produces: duas constantes de classe que a Task 7 satisfaz — `TOMAM_LOCK` (Action FQCN => classe do pai) e `ISENTAS` (Action FQCN => motivo).

- [ ] **Step 1: Medir o universo antes de escrever a lista**

Run:
```bash
docker compose exec -T app sh -lc 'for f in $(find app/Domains -path "*/Actions/*.php" | sort); do grep -v "^\s*\*\|^\s*//\|^\s*/\*" "$f" | grep -qE "(Turma|Redator) \\\$" && echo "$f"; done'
```
Expected: **16 arquivos**. É a mesma medição feita no planejamento contra `f6649297`. Se vierem mais ou menos de 16, a lista abaixo está desatualizada — reconcilie antes de seguir, não force.

- [ ] **Step 2: Escrever o arch test**

Criar `backend/tests/Feature/Shared/ParentLockOnChildWriteTest.php`:

```php
<?php

namespace Tests\Feature\Shared;

use Tests\Support\ScansPhpSource;
use Tests\TestCase;

/**
 * P-49: `lockRow` de um lado só é meio mutex. `ArchiveRedatorAction` e
 * `DeleteTurmaAction` abrem transação e travam o pai antes da cascata; os
 * escritores de filho não travavam nada, e um filho criado na janela sobrevivia
 * ATIVO sob pai arquivado — o modo de falha que a cascata existe para impedir.
 *
 * A suíte roda em sqlite e `SQLiteGrammar::compileLock()` devolve string vazia:
 * NENHUM teste deste repositório prova lock. Este aqui não tenta — ele lê
 * CÓDIGO. A corrida real é prova de DoD, uma vez, no MySQL de dev.
 *
 * O universo é medido, não escolhido: toda Action sob `app/Domains/*\/Actions/`
 * cujo código sem comentários recebe `Turma $` ou `Redator $`. Cada uma está em
 * `TOMAM_LOCK` ou em `ISENTAS`, e **silêncio reprova** — mesmo idioma do
 * `NestedRouteOwnershipTest`. Action nova entra por escrita explícita, e o
 * motivo da isenção fica onde alguém o lê ao editar a Action.
 *
 * O lock é `lockForWrite()` e não `lockRow()`: `lockRow` SERIALIZA (B espera A
 * commitar) e depois deixa B pousar o filho sob o pai recém-arquivado. Quem
 * RECUSA é o `trashed()` de dentro do `lockForWrite`. Molde: `Client`, cujos
 * seis escritores de filho chamam `Client::lockForWrite()`.
 */
class ParentLockOnChildWriteTest extends TestCase
{
    use ScansPhpSource;

    /** Action => classe do pai cujo `lockForWrite()` ela deve tomar. */
    private const TOMAM_LOCK = [
        'Identity/Actions/StoreRedatorDocumentAction.php' => 'Redator',
        'Identity/Actions/UpdateRedatorAction.php' => 'Redator',
        'Operation/Actions/DesignateRedatorAction.php' => 'Redator',
        'Operation/Actions/EnrollStudentAction.php' => 'Turma',
        'Operation/Actions/StoreTurmaDocumentAction.php' => 'Turma',
    ];

    /** Action => por que ela NÃO toma o lock do pai. */
    private const ISENTAS = [
        'Identity/Actions/ArchiveRedatorAction.php' =>
            'É o lado que ARQUIVA: toma `Redator::lockRow()` cru, sobre linha em vias de ser arquivada.',
        'Identity/Actions/RestoreRedatorAction.php' =>
            'É o lado que RESTAURA: toma `Redator::lockRow()` cru, sobre linha arquivada — `lockForWrite` a recusaria.',
        'Operation/Actions/DeleteTurmaAction.php' =>
            'É o lado que ARQUIVA: toma `Turma::lockRow()` cru, sobre linha em vias de ser arquivada.',
        'Operation/Actions/RestoreTurmaAction.php' =>
            'É o lado que RESTAURA: toma `Turma::lockRow()` cru, sobre linha arquivada — `lockForWrite` a recusaria.',
        'Operation/Actions/ImportStudentsAction.php' =>
            'Não abre transação: a transação do import é POR LINHA e mora no `EnrollStudentAction`, que toma o lock. '.
            '`lockForUpdate()` fora de transação é solto no autocommit da própria consulta — o lock aqui seria teatro.',
        'Operation/Actions/UpdateTurmaAction.php' =>
            'Escreve o PRÓPRIO pai (`$turma->update`), não filho. A corrida pai-vs-pai é outra e está fora do escopo da P-49.',
        'Operation/Actions/ConcludeTurmaAction.php' =>
            'Escreve o PRÓPRIO pai (`status`/`concluded_at`), não filho. Mesmo motivo do `UpdateTurmaAction`.',
        'Operation/Actions/RemoveRedatorAction.php' =>
            'O `detach` REDUZ vínculo. A janela da P-49 é pousar filho ATIVO sob pai arquivado; remover não pousa nada.',
        'Operation/Actions/DeleteTurmaDocumentAction.php' =>
            'O `delete()` REDUZ. Mesmo motivo do `RemoveRedatorAction`.',
        'Certification/Actions/IssueCertificateAction.php' =>
            'Certificado não é filho de nenhuma das duas cascatas: `Turma::booted` varre `enrollments` e `files`, '.
            '`Redator::booted` varre `documents` e `user`. O `Redator` aqui é LIDO pelas seis portas, não escrito.',
        'Certification/Actions/BatchIssueCertificatesAction.php' =>
            'Não escreve: delega item a item ao `IssueCertificateAction`, que já está declarado acima.',
    ];

    /** @return array<string,string> caminho relativo a `app/Domains` => código sem comentários */
    private function universo(): array
    {
        $encontrados = [];

        foreach ($this->arquivosPhp(app_path('Domains')) as $arquivo) {
            if (! str_contains($arquivo, '/Actions/')) {
                continue;
            }

            $codigo = $this->codigoSemComentarios($arquivo);

            if (preg_match('/(Turma|Redator) \$/', $codigo) !== 1) {
                continue;
            }

            $encontrados[str_replace(app_path('Domains').'/', '', $arquivo)] = $codigo;
        }

        return $encontrados;
    }

    public function test_toda_action_que_recebe_turma_ou_redator_esta_declarada(): void
    {
        $declaradas = array_merge(array_keys(self::TOMAM_LOCK), array_keys(self::ISENTAS));
        $indefinidas = array_values(array_diff(array_keys($this->universo()), $declaradas));
        sort($indefinidas);

        $this->assertSame([], $indefinidas, implode("\n", array_merge(
            [
                'P-49: Action que recebe `Turma $` ou `Redator $` sem declarar o que faz com o lock do pai.',
                'Declare em TOMAM_LOCK (e chame `<Pai>::lockForWrite()` dentro da transação) ou',
                'em ISENTAS, com o motivo escrito ao lado. Silêncio reprova de propósito.',
                'Actions:',
            ],
            $indefinidas,
        )));
    }

    public function test_nenhuma_declaracao_aponta_para_arquivo_que_sumiu(): void
    {
        $universo = array_keys($this->universo());
        $orfas = array_values(array_diff(
            array_merge(array_keys(self::TOMAM_LOCK), array_keys(self::ISENTAS)),
            $universo,
        ));
        sort($orfas);

        // Sem isto a lista envelhece em silêncio: Action renomeada some do
        // universo e a declaração dela vira decoração.
        $this->assertSame([], $orfas, 'Declaração aponta para Action inexistente: '.implode(', ', $orfas));
    }

    public function test_quem_toma_lock_chama_lockforwrite_dentro_de_transacao(): void
    {
        $faltando = [];
        $universo = $this->universo();

        foreach (self::TOMAM_LOCK as $arquivo => $pai) {
            $codigo = $universo[$arquivo] ?? null;

            if ($codigo === null) {
                $faltando[] = "{$arquivo}: saiu do universo (renomeada ou assinatura mudou)";

                continue;
            }

            if (! str_contains($codigo, "{$pai}::lockForWrite(")) {
                $faltando[] = "{$arquivo}: não chama `{$pai}::lockForWrite(`";
            }

            if (! str_contains($codigo, 'DB::transaction')) {
                $faltando[] = "{$arquivo}: não abre `DB::transaction` — lock fora de transação é solto no autocommit";
            }
        }

        sort($faltando);

        $this->assertSame([], $faltando, implode("\n", array_merge(
            [
                'P-49: escritor de filho sem o lock do pai, ou com o lock fora de transação.',
                'Um lock de linha só fecha janela se os DOIS lados o tomarem, e só RECUSA',
                'se for `lockForWrite()` — `lockRow()` cru serializa e deixa passar. Achados:',
            ],
            $faltando,
        )));
    }

    public function test_todo_motivo_de_isencao_esta_escrito(): void
    {
        foreach (self::ISENTAS as $arquivo => $motivo) {
            $this->assertNotSame('', trim($motivo), "Isenção de {$arquivo} sem motivo.");
            $this->assertGreaterThan(
                40,
                strlen(trim($motivo)),
                "Isenção de {$arquivo} com motivo curto demais para ser um motivo.",
            );
        }
    }
}
```

- [ ] **Step 3: Rodar e ver reprovar**

Run: `docker compose exec -T app php artisan test --filter=ParentLockOnChildWriteTest`
Expected: **FAIL** em `test_quem_toma_lock_chama_lockforwrite_dentro_de_transacao`, listando os cinco:
```
Identity/Actions/StoreRedatorDocumentAction.php: não chama `Redator::lockForWrite(`
Identity/Actions/UpdateRedatorAction.php: não chama `Redator::lockForWrite(`
Operation/Actions/DesignateRedatorAction.php: não abre `DB::transaction` — ...
Operation/Actions/DesignateRedatorAction.php: não chama `Redator::lockForWrite(`
Operation/Actions/EnrollStudentAction.php: não chama `Turma::lockForWrite(`
Operation/Actions/StoreTurmaDocumentAction.php: não abre `DB::transaction` — ...
Operation/Actions/StoreTurmaDocumentAction.php: não chama `Turma::lockForWrite(`
```
Os outros três testes passam. **Esta é a evidência que a P-49 pede** — a catraca vista reprovar antes de existir a correção.

- [ ] **Step 4: Pint e commit (vermelho, de propósito)**

O teste entra vermelho e a Task 7 o fecha. Commitar aqui deixa a evidência no histórico em vez de só na tela.

```bash
cd backend && ./vendor/bin/pint tests/Feature/Shared/ParentLockOnChildWriteTest.php
```

```bash
git add backend/tests/Feature/Shared/ParentLockOnChildWriteTest.php
git commit -m "test(shared): catraca da P-49 — escritor de filho declara o lock do pai"
```

---

### Task 7: `lockForWrite()` nos dois roots e nos cinco escritores

**Files:**
- Modify: `backend/app/Domains/Operation/Models/Turma.php` (depois de `lockRow`)
- Modify: `backend/app/Domains/Identity/Models/Redator.php` (depois de `lockRow`)
- Modify: `backend/app/Domains/Identity/Actions/StoreRedatorDocumentAction.php`
- Modify: `backend/app/Domains/Identity/Actions/UpdateRedatorAction.php`
- Modify: `backend/app/Domains/Operation/Actions/DesignateRedatorAction.php`
- Modify: `backend/app/Domains/Operation/Actions/EnrollStudentAction.php`
- Modify: `backend/app/Domains/Operation/Actions/StoreTurmaDocumentAction.php`

**Interfaces:**
- Consumes: as constantes `TOMAM_LOCK` / `ISENTAS` da Task 6.
- Produces: `Turma::lockForWrite(int $turmaId): static` e `Redator::lockForWrite(int $redatorId): static` — travam a linha e lançam `ValidationException` se o pai estiver arquivado. Molde exato: `Client::lockForWrite()` (`Client.php:139-148`).

- [ ] **Step 1: Escrever os dois `lockForWrite`**

Em `backend/app/Domains/Operation/Models/Turma.php`, logo depois de `lockRow()`:

```php
    /**
     * Trava a linha E RECUSA turma arquivada. É o que o escritor de filho toma;
     * `lockRow()` cru fica para quem arquiva ou restaura.
     *
     * A diferença é a P-49 inteira: `lockRow` sozinho SERIALIZA (o escritor
     * espera o arquivador commitar) e depois deixa o filho pousar sob a turma
     * recém-arquivada. Quem recusa é este `trashed()`.
     *
     * NÃO substitui `assertAcademicallyWritable()`: aquele pergunta pelo
     * `status` (RN-15), este pelo `deleted_at`. Turma arquivada mantém
     * `status = em_andamento`, então nenhum dos dois cobre o outro.
     *
     * Molde: `Client::lockForWrite()`.
     */
    public static function lockForWrite(int $turmaId): static
    {
        $turma = static::lockRow($turmaId);

        if ($turma->trashed()) {
            throw ValidationException::withMessages([
                'turma' => 'Esta clase fue archivada y ya no acepta cambios.',
            ]);
        }

        return $turma;
    }
```

`ValidationException` já está importada em `Turma.php`.

Em `backend/app/Domains/Identity/Models/Redator.php`, logo depois de `lockRow()`:

```php
    /**
     * Trava a linha E RECUSA redator arquivado. Ver `Turma::lockForWrite()` e
     * o molde `Client::lockForWrite()` — a diferença para o `lockRow()` cru é a
     * recusa, e é ela que fecha a P-49.
     */
    public static function lockForWrite(int $redatorId): static
    {
        $redator = static::lockRow($redatorId);

        if ($redator->trashed()) {
            throw ValidationException::withMessages([
                'redator' => 'Este redactor fue archivado y ya no acepta cambios.',
            ]);
        }

        return $redator;
    }
```

Adicionar `use Illuminate\Validation\ValidationException;` ao topo de `Redator.php` se ainda não estiver lá.

- [ ] **Step 2: `EnrollStudentAction` — o mais simples primeiro**

Em `backend/app/Domains/Operation/Actions/EnrollStudentAction.php`, primeira linha de dentro da transação:

```php
        return DB::transaction(function () use ($turma, $rut, $name, $email, $phone) {
            // Mutex do pai ANTES de qualquer escrita (P-49): a cascata de
            // `DeleteTurmaAction` enumera e apaga `enrollments`, e sem este lock
            // uma matrícula criada na janela sobrevive ATIVA sob turma
            // arquivada. `lockForWrite` também RECUSA turma já arquivada — o
            // `lockRow` cru só serializaria.
            Turma::lockForWrite($turma->id);

            $client = $turma->contratanteClient(); // RF-TUR-03: cliente da cotação
```

- [ ] **Step 3: `UpdateRedatorAction`**

Em `backend/app/Domains/Identity/Actions/UpdateRedatorAction.php`, primeira linha de dentro da transação, **antes** do `ensureIdentityAvailable`:

```php
            return DB::transaction(function () use ($redator, $data, $uploaded) {
                // Mutex do pai ANTES de qualquer escrita (P-49): `users` e
                // `redatores` são varridos pela cascata de `ArchiveRedatorAction`.
                Redator::lockForWrite($redator->id);

                // Unicidade DENTRO da transação que escreve. ... (comentário existente inalterado)
```

- [ ] **Step 4: `StoreRedatorDocumentAction`**

O `put()` fica **fora** da transação — é a D3 da spec do redator e não se reabre (spec §7). O lock entra como primeira operação de dentro dela, guardando o INSERT, que é o que a P-49 mede.

Em `backend/app/Domains/Identity/Actions/StoreRedatorDocumentAction.php`, no `execute()`:

```php
        try {
            return DB::transaction(function () use ($redator, $type, $path, $meta, $validUntil) {
                // Mutex do pai (P-49) guardando o INSERT, não o upload: o
                // binário fora da transação é decisão registrada (D3 da spec do
                // redator) e não se reabre. A janela que a ficha mede é entre
                // "o binding resolveu um redator vivo" e "INSERT em `files`" —
                // é essa que este lock fecha.
                Redator::lockForWrite($redator->id);

                return $this->registerUploaded($redator, $type, $path, $meta, $validUntil);
            });
        } catch (Throwable $e) {
            $this->uploads->discard($path);

            throw $e;
        }
```

O `registerUploaded()` **não** ganha lock: ele é o caminho de quem já segura a transação (`CreateRedatorAction`, `UpdateRedatorAction`), e o `CreateRedatorAction` cria o redator ali mesmo — não há pai preexistente a travar.

- [ ] **Step 5: `DesignateRedatorAction` — passa a abrir transação**

Em `backend/app/Domains/Operation/Actions/DesignateRedatorAction.php`:

```php
<?php

namespace App\Domains\Operation\Actions;

use App\Domains\Identity\Models\Redator;
use App\Domains\Operation\Models\Turma;
use App\Domains\Operation\Services\RedatorIdoneidadeService;
use App\Shared\Audit\PivotAudit;
use Illuminate\Support\Facades\DB;

/**
 * Designa 1 redator à turma após o gate RN-09. Idempotente
 * (syncWithoutDetaching + unique do pivot). Multi-redator = múltiplas chamadas.
 *
 * Abre transação por causa da P-49: sem ela o `lockForWrite` seria solto no
 * autocommit da própria consulta. O lock é do REDATOR — a janela que a ficha
 * nomeia é "uma designação concorrente pousa um redator arquivado numa turma
 * viva". É aresta de lock cruzando domínio (Operation trava um agregado de
 * Identity), e é deliberada: a aresta de CÓDIGO já existe (`TurmaController`
 * importa `Identity\Models\Redator`), então o `DomainDependencyTest` não muda
 * de conjunto.
 */
class DesignateRedatorAction
{
    public function __construct(private RedatorIdoneidadeService $idoneidade) {}

    public function execute(Turma $turma, Redator $redator): Turma
    {
        $turma->assertAcademicallyWritable();

        return DB::transaction(function () use ($turma, $redator) {
            Redator::lockForWrite($redator->id);

            $this->idoneidade->assertEligible($redator, $turma->course);
            PivotAudit::syncWithoutDetaching($turma, 'redatores', [$redator->id]);

            return $turma;
        });
    }
}
```

- [ ] **Step 6: `StoreTurmaDocumentAction` — transação com o upload fora**

Em `backend/app/Domains/Operation/Actions/StoreTurmaDocumentAction.php`:

```php
<?php

namespace App\Domains\Operation\Actions;

use App\Domains\Operation\Enums\TurmaDocumentType;
use App\Domains\Operation\Models\Turma;
use App\Shared\Files\Actions\UploadFileAction;
use App\Shared\Files\Models\File;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Throwable;

/**
 * Anexa um documento à turma (RN-16). Append puro — N docs por tipo (D8),
 * sem replace: as provas dos alunos são plural real. Doc de turma não vence
 * (sem valid_until).
 *
 * O `uploads->execute()` de uma chamada só virou put/register separados por
 * causa da P-49: o INSERT em `files` precisa da transação para o
 * `Turma::lockForWrite()` valer, e o binário NÃO pode entrar nela — rollback
 * derrubaria a linha e deixaria o objeto no bucket, documento sem rastro (D3 da
 * spec do redator, e aqui o dado tem peso legal). Molde exato:
 * `StoreRedatorDocumentAction`.
 */
class StoreTurmaDocumentAction
{
    public function __construct(private UploadFileAction $uploads) {}

    public function execute(Turma $turma, TurmaDocumentType $type, UploadedFile $file): File
    {
        $turma->assertAcademicallyWritable();   // RN-15

        $meta = $this->uploads->metadataOf($file);
        $path = $this->uploads->put($turma, $file);

        try {
            return DB::transaction(function () use ($turma, $type, $path, $meta) {
                Turma::lockForWrite($turma->id);

                return $this->uploads->register($turma, $path, $meta, $type->value);
            });
        } catch (Throwable $e) {
            $this->uploads->discard($path);

            throw $e;
        }
    }
}
```

- [ ] **Step 7: Rodar a catraca e ver passar**

Run: `docker compose exec -T app php artisan test --filter=ParentLockOnChildWriteTest`
Expected: **PASS**, 4 testes.

- [ ] **Step 8: A sonda — ver a catraca morder de novo, e reverter**

Remova temporariamente a linha `Turma::lockForWrite($turma->id);` de `EnrollStudentAction`:

Run: `docker compose exec -T app php artisan test --filter=ParentLockOnChildWriteTest`
Expected: **FAIL** com ``Operation/Actions/EnrollStudentAction.php: não chama `Turma::lockForWrite(` ``.

Devolva a linha e rode de novo:
Run: `docker compose exec -T app php artisan test --filter=ParentLockOnChildWriteTest`
Expected: **PASS**.

Confirme que a árvore voltou ao estado anterior:
Run: `git diff --stat backend/app/Domains/Operation/Actions/EnrollStudentAction.php`
Expected: o diff mostra **só** a adição do lock, sem resto de sonda.

- [ ] **Step 9: Rodar tudo que toca esses cinco caminhos**

Run:
```bash
docker compose exec -T app php artisan test --filter=EnrollStudentActionTest
docker compose exec -T app php artisan test --filter=ImportStudentsActionTest
docker compose exec -T app php artisan test --filter=TurmaDocumentActionsTest
docker compose exec -T app php artisan test --filter=TurmaDocumentApiTest
docker compose exec -T app php artisan test --filter=TurmaDesignationTest
docker compose exec -T app php artisan test --filter=RedatorArchiveTest
docker compose exec -T app php artisan test --filter=RedatorDocument
docker compose exec -T app php artisan test --filter=TurmaArchiveCascadeTest
docker compose exec -T app php artisan test --filter=DomainDependencyTest
```
Expected: **PASS** em todos. `DomainDependencyTest` é o que prova que a aresta cruzando domínio não abriu conjunto novo.

- [ ] **Step 10: Pint e commit**

```bash
cd backend && ./vendor/bin/pint app/Domains/Operation/Models/Turma.php app/Domains/Identity/Models/Redator.php app/Domains/Identity/Actions/StoreRedatorDocumentAction.php app/Domains/Identity/Actions/UpdateRedatorAction.php app/Domains/Operation/Actions/DesignateRedatorAction.php app/Domains/Operation/Actions/EnrollStudentAction.php app/Domains/Operation/Actions/StoreTurmaDocumentAction.php
```

```bash
git add backend/app/Domains/Operation/Models/Turma.php backend/app/Domains/Identity/Models/Redator.php backend/app/Domains/Identity/Actions/StoreRedatorDocumentAction.php backend/app/Domains/Identity/Actions/UpdateRedatorAction.php backend/app/Domains/Operation/Actions/DesignateRedatorAction.php backend/app/Domains/Operation/Actions/EnrollStudentAction.php backend/app/Domains/Operation/Actions/StoreTurmaDocumentAction.php
git commit -m "fix(shared): escritor de filho toma lockForWrite do pai (P-49)"
```

---

### Task 8: P-47 — backfill da role `redator`

**Medido em 2026-08-22, e diferente do que a ficha supunha:** o seeder já está certo. `OperationDemoSeeder::seedRedatores()` cria por `CreateRedatorAction`, que faz `syncRoles(['redator'])` desde `e3490d84`, e `UserProvisioner::accessDefaultFor()` já faz o redator nascer ativo. O que está velho é o DADO: dos 7 redatores do banco de dev, só o user 2 (Juan Morales) tem a role, e só porque a prova e2e de 2026-08-19 reenviou o convite dele.

**Files:**
- Create: `backend/database/migrations/2026_08_22_000003_backfill_redator_role.php`
- Create: `backend/tests/Feature/Identity/BackfillRedatorRoleMigrationTest.php`

**Interfaces:**
- Consumes: nada de tasks anteriores. É pré-requisito de dado para as provas 1–6 do DoD (Task 9).
- Produces: nenhuma API nova.

- [ ] **Step 1: Escrever o teste que reprova**

Criar `backend/tests/Feature/Identity/BackfillRedatorRoleMigrationTest.php`:

```php
<?php

namespace Tests\Feature\Identity;

use App\Domains\Identity\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

/**
 * P-47: os redatores criados ANTES de `e3490d84` (que pôs `syncRoles(['redator'])`
 * no `CreateRedatorAction`) ficaram sem role. O seeder já nasce certo; migration
 * é o único mecanismo que alcança linha já existente — mesmo argumento escrito
 * no docblock da `2026_08_22_000001`.
 *
 * `is_active` NÃO entra no backfill: redator desativado de propósito existe, e
 * reativá-lo em massa seria a P-51 ao contrário.
 */
class BackfillRedatorRoleMigrationTest extends TestCase
{
    use RefreshDatabase;

    private function migration(): object
    {
        return require base_path('database/migrations/2026_08_22_000003_backfill_redator_role.php');
    }

    private function redatorLegado(bool $ativo = true): User
    {
        Role::firstOrCreate(['name' => 'redator', 'guard_name' => 'web']);

        $user = User::factory()->create(['type' => 'redator', 'is_active' => $ativo]);
        $user->redator()->create([]);

        // Estado legado: sem role, como as linhas anteriores ao commit.
        DB::table('model_has_roles')->where('model_id', $user->id)->delete();
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        return $user;
    }

    public function test_up_da_a_role_a_quem_estava_sem(): void
    {
        $user = $this->redatorLegado();
        $this->assertFalse($user->fresh()->hasRole('redator'));

        $this->migration()->up();
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $this->assertTrue($user->fresh()->hasRole('redator'));
    }

    public function test_up_alcanca_redator_desativado_sem_reativa_lo(): void
    {
        $user = $this->redatorLegado(ativo: false);

        $this->migration()->up();
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $this->assertTrue($user->fresh()->hasRole('redator'));
        // A role é capacidade; `is_active` é acesso. O backfill toca a primeira
        // e nunca a segunda.
        $this->assertFalse($user->fresh()->is_active);
    }

    public function test_up_nao_toca_quem_nao_e_redator(): void
    {
        Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);
        Role::firstOrCreate(['name' => 'redator', 'guard_name' => 'web']);

        $admin = User::factory()->create(['type' => 'admin']);
        $admin->assignRole('admin');
        $aluno = User::factory()->create(['type' => 'aluno', 'is_active' => false]);

        $this->migration()->up();
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $this->assertSame(['admin'], $admin->fresh()->getRoleNames()->all());
        $this->assertSame([], $aluno->fresh()->getRoleNames()->all());
    }

    public function test_up_e_idempotente(): void
    {
        $user = $this->redatorLegado();

        $this->migration()->up();
        $this->migration()->up();
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $this->assertSame(
            1,
            DB::table('model_has_roles')->where('model_id', $user->id)->count(),
        );
    }
}
```

- [ ] **Step 2: Rodar e ver reprovar**

Run: `docker compose exec -T app php artisan test --filter=BackfillRedatorRoleMigrationTest`
Expected: **FAIL** já no `require` — o arquivo da migration não existe.

- [ ] **Step 3: Escrever a migration**

Criar `backend/database/migrations/2026_08_22_000003_backfill_redator_role.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\PermissionRegistrar;

/**
 * P-47. `CreateRedatorAction` atribui a role `redator` desde `e3490d84`
 * (RF-ROL-05) e `SendRedatorAccessInvitationAction` a atribui no reenvio de
 * convite — mas nenhum dos dois alcança linha que já existe no banco sem
 * convite reenviado. Medido no MySQL de dev em 2026-08-22: dos 7 redatores do
 * `OperationDemoSeeder`, só o user 2 tem a role, e só porque a prova e2e de
 * 2026-08-19 reenviou o convite dele.
 *
 * A ficha era cosmética enquanto o gate do redator fosse `user->type`. Com o
 * ownership deste bloco a ROLE decide acesso, e redator sem role vira conta sem
 * permissão nenhuma — é o gatilho literal da ficha ("o primeiro gate aplicado
 * sobre rota de redator").
 *
 * `is_active` NÃO entra: redator desativado de propósito existe, e reativá-lo em
 * massa seria a P-51 ao contrário. Role é capacidade; `is_active` é acesso.
 *
 * `model_type = 'user'` porque o morph map está enforced
 * (`AppServiceProvider::boot`); ler `config('auth.providers.users.model')` aqui
 * gravaria o FQCN e produziria linha que o Spatie não encontra.
 *
 * `down()` é no-op declarado: reverter não pode TIRAR a role de quem a ganhou
 * por cadastro ou por convite, e esta migration não sabe distinguir os dois.
 */
return new class extends Migration
{
    public function up(): void
    {
        $roleId = DB::table(config('permission.table_names.roles'))
            ->where('name', 'redator')
            ->where('guard_name', 'web')
            ->value('id');

        if ($roleId === null) {
            return;   // banco sem a role: o `RolePermissionSeeder` a cria, e o cadastro a atribui
        }

        $pivot = config('permission.table_names.model_has_roles');

        $semRole = DB::table('users')
            ->where('type', 'redator')
            ->whereNotExists(fn ($q) => $q
                ->selectRaw(1)
                ->from($pivot)
                ->whereColumn($pivot.'.model_id', 'users.id')
                ->where($pivot.'.model_type', 'user')
                ->where($pivot.'.role_id', $roleId)
            )
            ->pluck('id');

        foreach ($semRole as $userId) {
            DB::table($pivot)->insert([
                'role_id' => $roleId,
                'model_type' => 'user',
                'model_id' => $userId,
            ]);
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    public function down(): void
    {
        // No-op declarado: não há como distinguir a role que ESTA migration deu
        // da que veio do cadastro ou do convite. Tirar as duas revogaria acesso
        // legítimo; tirar nenhuma é a escolha conservadora e é esta.
    }
};
```

- [ ] **Step 4: Rodar e ver passar**

Run: `docker compose exec -T app php artisan test --filter=BackfillRedatorRoleMigrationTest`
Expected: **PASS**, 4 testes.

Se `model_type` na sua base for outro valor, meça antes de mudar o código:
```bash
docker compose exec -T mysql mysql -uroot -psecret lotus -e "SELECT model_type, COUNT(*) FROM model_has_roles GROUP BY model_type;"
```
Expected: `user`.

- [ ] **Step 5: Aplicar no banco de dev e medir o resultado**

Run: `docker compose exec -T app php artisan migrate`
Expected: as duas migrations deste bloco rodam (`..._000002_add_record_result_permission`, `..._000003_backfill_redator_role`).

Run:
```bash
docker compose exec -T mysql mysql -uroot -psecret lotus -e "SELECT u.id, u.name, u.is_active, IFNULL(GROUP_CONCAT(r.name),'(sem role)') AS roles FROM users u LEFT JOIN model_has_roles mhr ON mhr.model_id = u.id LEFT JOIN roles r ON r.id = mhr.role_id WHERE u.type = 'redator' GROUP BY u.id;"
```
Expected: **todos** com `redator` na coluna `roles`. A coluna `is_active` continua como estava — os 6 seguem `0`, e a Task 9 ativa dois deles pela API.

- [ ] **Step 6: Pint e commit**

```bash
cd backend && ./vendor/bin/pint database/migrations/2026_08_22_000003_backfill_redator_role.php tests/Feature/Identity/BackfillRedatorRoleMigrationTest.php
```

```bash
git add backend/database/migrations/2026_08_22_000003_backfill_redator_role.php backend/tests/Feature/Identity/BackfillRedatorRoleMigrationTest.php
git commit -m "fix(identity): backfill da role redator em banco ja provisionado (P-47)"
```

---

### Task 9: DoD — as 12 provas contra a API real

Build verde não é definition of done (lei §5.8). As provas rodam **fora da suíte**, contra a API em `http://localhost:8080` e o MySQL de dev.

**Files:**
- Modify: `docs/superpowers/pendencias/abertas.md` (abrir a ficha do Q-4)
- Modify: `docs/superpowers/pendencias/README.md` (linha de índice da ficha nova)

**Interfaces:**
- Consumes: tudo das Tasks 1–8.
- Produces: as evidências do gate e a ficha `P-*` do Q-4.

- [ ] **Step 1: Subir o stack e preparar o dado**

```bash
docker compose up -d
docker compose ps
```
Expected: `app`, `nginx`, `mysql`, `gotenberg`, `minio` de pé. **`nginx` é obrigatório** — sem ele não há `:8080` e as provas não rodam.

Ative dois redatores pelo caminho real da API (sessão de superadmin, `PUT /api/redatores/{id}` com `is_active: true`), escolhendo dois designados a turmas DIFERENTES. Medido em 2026-08-22, `Juan Morales` (redator 1, turmas 1/4/5/6) e `Pedro Soto` (redator 2, turma 2) servem — reconfirme contra o banco antes de usar:
```bash
docker compose exec -T mysql mysql -uroot -psecret lotus -e "SELECT tr.turma_id, r.id AS redator_id, u.id AS user_id, u.name, u.is_active FROM turma_redator tr JOIN redatores r ON r.id = tr.redator_id JOIN users u ON u.id = r.user_id ORDER BY tr.turma_id;"
```

Defina a senha dos dois por `php artisan tinker` (`$u->password = Hash::make('senha123'); $u->save();`) para poder logar — a senha do seed é aleatória por desenho (`UserProvisioner::provision`).

- [ ] **Step 2: Rodar as 12 provas e anotar cada resposta**

Faça login com cookie de sessão (`POST /api/sanctum/csrf-cookie` → `POST /api/login`), guarde o jar por usuário, e registre status + trecho decisivo do corpo de cada prova:

| # | Prova | Esperado |
|---|---|---|
| 1 | Sessão de Redator A em `GET /api/turmas` | só as turmas em que A está designado |
| 2 | Redator A em `GET` e `PUT` de turma do Redator B | **404** |
| 3 | Redator A nos 20 caminhos com `{turma}` de turma alheia | **404** em todos |
| 4 | Redator A em `POST /api/turmas/{alheia}/documents` | **404** |
| 5 | Redator A em `PUT /api/turmas/{própria}/alunos/{id}/resultado` | **200** |
| 6 | Redator A no mesmo caminho, turma alheia | **404** |
| 7 | Admin em tudo acima | **200**, inalterado |
| 8 | Staff desativado com sessão viva, request seguinte | **401** `application/problem+json` |
| 9 | `PUT /api/users/{id}` omitindo `is_active` sobre staff desligado | segue desligado |
| 10 | Sonda do `ParentLockOnChildWriteTest` | reprovou antes de passar, e foi revertida (Task 7, Step 8) |
| 11 | Corrida do lock, MySQL de dev, duas conexões | B bloqueia até o COMMIT de A, e depois **recusa** |
| 12 | `GET /api/permissions` com sessão de superadmin | contém `operation.enrollment.record_result` |

Para a prova 3, enumere os 20 caminhos a partir da própria fonte, sem digitá-los de memória:
```bash
grep "{turma}" backend/app/Domains/Operation/routes.php | grep "Route::"
```

- [ ] **Step 3: A prova 11 — a corrida real**

A conexão A é um cliente MySQL cru e não uma segunda Action: o ponto é o estado da LINHA do pai, e a interleave precisa ser determinística.

Terminal 1 — segura o lock e arquiva:
```bash
docker compose exec -it mysql mysql -uroot -psecret lotus
```
```sql
BEGIN;
SELECT id, deleted_at FROM turmas WHERE id = <TURMA> FOR UPDATE;
-- NÃO commite ainda; vá ao terminal 2
```

Terminal 2 — o escritor de filho bloqueia:
```bash
docker compose exec -T app php artisan tinker --execute="\App\Domains\Operation\Actions\EnrollStudentAction::class; app(\App\Domains\Operation\Actions\EnrollStudentAction::class)->execute(\App\Domains\Operation\Models\Turma::find(<TURMA>), '<RUT_VALIDO>', 'Prova Lock', null, null);"
```
Expected: o comando **fica parado**. É o `lockForWrite` esperando.

Terminal 1 — arquiva e commita:
```sql
UPDATE turmas SET deleted_at = NOW() WHERE id = <TURMA>;
COMMIT;
```

Expected no terminal 2: o comando destrava e **falha** com a mensagem `Esta clase fue archivada y ya no acepta cambios.` As duas metades ficam provadas de uma vez — o lock bloqueou (senão a matrícula teria entrado imediatamente) e a recusa aconteceu (senão a matrícula entraria ativa sob turma arquivada, que é o modo de falha da P-49).

Desfaça o arquivamento depois de anotar a evidência:
```sql
UPDATE turmas SET deleted_at = NULL WHERE id = <TURMA>;
```

- [ ] **Step 4: Rodar os gates de suíte**

```bash
docker compose exec -T app php -d memory_limit=1G vendor/bin/phpunit
cd frontend && pnpm lint
cd frontend && pnpm build
cd frontend && pnpm test
docker compose exec -T app php artisan typescript:transform && git diff --stat frontend/src/shared/types/generated.ts
```
Expected: suíte **verde**; `lint`, `build`, `test` verdes; e o `typescript:transform` **sem diff novo** — o diff do `is_active` já foi commitado na Task 4. Diff aqui significa DTO fora de sincronia.

- [ ] **Step 5: Abrir a ficha do Q-4**

O Q-4 do review de `feedbacks-resolver-escopo` saiu do escopo por decisão do João em 2026-08-22. Ele **não** vira pendência silenciosa (spec §7).

Acrescentar a `docs/superpowers/pendencias/abertas.md`, no molde das fichas vizinhas:

```markdown
## P-54 — os testes da migration de permissões de feedback não cobrem o filtro `guard_name` nem o `forgetCachedPermissions()`

**Bloco:** — · **Gatilho:** o próximo bloco que escrever migration de permissão e puder absorver as
duas assertivas. Revisar em **2026-10-31**.

Medido no review de `feedbacks-resolver-escopo` (2026-08-22, achado Q-4): o
`RemoveOrphanFeedbackPermissionsMigrationTest` tem quatro testes e nenhum deles morde se você apagar
o `->where('guard_name', 'web')` ou o `app(PermissionRegistrar::class)->forgetCachedPermissions()` do
`up()` da `2026_08_22_000001_remove_orphan_feedback_permissions.php`. A suíte fica verde nos dois
casos — é a lição 10 outra vez: teste que passa por não conseguir observar a diferença.

Deferido para o `hardening-acesso-ownership-e-integridade` e depois tirado do escopo dele por decisão
do João em 2026-08-22. **O bloco escreveu duas migrations de permissão** (`..._000002` e
`..._000003`) e não aproveitou a oportunidade — o que é exatamente a informação que faz esta ficha
valer alguma coisa para o próximo bloco.

O conserto tem forma conhecida: semear uma permissão homônima em outro `guard_name` e provar que ela
sobrevive ao `up()`; e provar o cache lendo a permissão pelo registrar ANTES do `up()`, para que um
`up()` sem `forgetCachedPermissions()` devolva o estado obsoleto.
```

E a linha correspondente no índice `docs/superpowers/pendencias/README.md`, no mesmo formato das outras.

- [ ] **Step 6: Commit do DoD**

```bash
git add docs/superpowers/pendencias/abertas.md docs/superpowers/pendencias/README.md
git commit -m "docs(pendencias): P-54 — o Q-4 sai do bloco com ficha e gatilho, nao em silencio"
```

- [ ] **Step 7: Transicionar o estado para review**

Em `docs/superpowers/state.md`, no espelho do topo e em `lanes.lane-a`:

```yaml
workflow_state: ready_for_review
next_owner: claude
next_action: request_code_review
```

Atualize `updated_at` com a saída de `date -Iseconds` (não digite a data de cabeça) e `state_basis_commit` com o HEAD da branch.

```bash
git add docs/superpowers/state.md
git commit -m "chore(state): lane-a fecha a execucao do item 3 e vai a review"
```

---

## Handoff de execução

**executor: `claude`**

Não é task mecânica de paths fechados. Quatro razões, cada uma suficiente sozinha:

1. **Toca três leis do `CLAUDE.md` §5.** A §5.3 (`generated.ts` regenerado, nunca editado — Task 4), a §5.4 (401 pelo handler RFC 7807, nunca `abort()` — Task 5) e a §5.1/§5.2 (o escopo mora no QueryBuilder, não em Repository; soft-delete por instância — Tasks 1, 6, 7).
2. **A Task 6 é decisão de arquitetura embutida em teste.** As duas listas do arch test são artefato permanente: um motivo de isenção escrito errado vira permissão silenciosa para a próxima Action. Não é preenchimento de template.
3. **A Task 7 mexe na ordem de escrita de três Actions** e reencosta na D3 da spec do redator (binário fora da transação). Errar a ordem entre `put()`, lock e INSERT reabre exatamente a janela que o bloco fecha.
4. **A Task 9 é julgamento contra a API viva**, com interleave manual de duas conexões e leitura de evidência — não tem verificação executável que a substitua.

O plano já corrige três medições que a spec trazia erradas (o lock é `lockForWrite` e não `lockRow`; `ImportStudentsAction` sai da lista dos seis; o seeder da P-47 já está certo e o problema é dado). Um executor sem contexto do bloco reintroduziria as três a partir do texto original das fichas — que é a classe de erro que a própria P-49 registra: *"o plano não é fonte sobre o que o código faz."*
