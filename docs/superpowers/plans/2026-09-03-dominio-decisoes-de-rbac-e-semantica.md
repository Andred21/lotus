# Decisões de domínio, RBAC e semântica — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** as quatro fichas travadas em decisão — `D-09`, `D-10`, `D-11` e `D-16` — saem com veredito escrito **e** o código que cada veredito pede, provado por comportamento.

**Architecture:** duas frentes independentes. Em RBAC (`D-10`, `D-11`), cada endpoint rico fica com o gate sensível e nasce um endpoint de lookup enxuto carregando o gate de quem o consome — `GET /api/roles/assignable` e `GET /api/students/client-options`, cada um com DTO próprio. Em domínio, o funil ganha um sétimo balde exclusivo (`D-16`) e a invariante do contato principal passa a ser garantida pela aplicação: entrada explícita sem principal recusa, zero por efeito colateral promove (`D-09`).

**Tech Stack:** Laravel 13 / PHP 8.3, spatie/laravel-data + typescript-transformer, spatie/laravel-permission, PHPUnit, Pint · React 19 + TS, TanStack Query, Vitest.

## Global Constraints

- Spec: [`docs/superpowers/specs/2026-09-03-dominio-decisoes-de-rbac-e-semantica-design.md`](../specs/2026-09-03-dominio-decisoes-de-rbac-e-semantica-design.md). Divergência entre plano e spec bloqueia a task.
- **Bloco de backend roda no main tree** (pendência P-03), branch `refactor/backend-decisoes-de-rbac-e-semantica`, aberta de `main@182be2ab`.
- Backend roda **no container**: `docker compose exec -T app php artisan test [--filter=X]`.
- Pint roda **no host, de dentro de `backend/`, sempre com argumentos**: `cd backend && ./vendor/bin/pint <arquivos>`. **Nunca sobre `lang/`** (`.claude/rules/backend-lang.md`).
- Frontend roda nativo, de `frontend/`: `pnpm lint`, `pnpm build`, `pnpm test`.
- **DTO novo regenera tipos no mesmo commit**: `docker compose exec -T app php artisan typescript:transform` e `frontend/src/shared/types/generated.ts` commitado junto. `generated.ts` **nunca** se edita à mão (lei §5.3).
- Os três locales do backend são exatamente `en`, `es_CL`, `pt_BR`; os do frontend, `en`, `es-CL`, `pt-BR`. Chave nova entra nos três no mesmo commit (`LocaleParityTest` reprova o contrário no backend).
- **Este plano autoriza editar exatamente quatro testes existentes**, nomeados nas Tasks 1 e 5. Qualquer outro teste que precise de edição significa contrato quebrado: PARE e reporte.
- Recusa de domínio sobe pelo handler global RFC 7807 (lei §5.4), nunca `abort()`.
- Sonda de arquivo se prova copiando para o scratchpad (`/tmp/claude-1000/-home-jvbat-projetos-lotus/3d8dfeff-2994-461d-b0ba-006c7078b39d/scratchpad`) e restaurando de lá. **Nunca `git stash`** — a pilha tem stashes alheios.
- Feature não importa PrimeReact direto nem outra feature (lei §5.6).

## Estrutura de arquivos

**Criar**
- `backend/app/Domains/Identity/Data/RoleOptionData.php` — role sem permissões, para o select do form de usuário.
- `backend/app/Domains/Identity/Data/StudentClientOptionData.php` — empresa reduzida a `id` + `legal_name`, para o dropdown do create de aluno.
- `backend/app/Domains/Commercial/Rules/UmContatoPrincipal.php` — a regra "exatamente um `is_primary`" da coleção enviada.
- `backend/app/Domains/Commercial/Actions/DeleteClientAddressAction.php` — a exclusão de endereço passa a respeitar a invariante do principal.
- `backend/tests/Feature/Identity/StudentClientOptionsTest.php` — gates e conteúdo do lookup de empresa.
- `backend/tests/Feature/Commercial/ContatoPrincipalTest.php` — recusa de entrada e promoção por efeito colateral.
- `frontend/src/features/identity/components/Admin/RolesTab.tsx` — a aba de roles inteira (tabela + diálogo), montada só sob `canManage`.
- `docs/superpowers/audits/2026-09-03-item22-medicoes.md` — as medições do DoD.

**Modificar**
- `backend/app/Domains/Identity/Http/Controllers/RoleController.php` — gate do `index` sobe; método `assignable`.
- `backend/app/Domains/Identity/Http/Controllers/StudentController.php` — método `clientOptions` e o gate dele.
- `backend/app/Domains/Identity/routes.php` — duas rotas novas, ambas **antes** do `apiResource` correspondente.
- `backend/app/Domains/Dashboard/Enums/PipelineStage.php` — caso `ConcludedWithoutIssuance`.
- `backend/app/Domains/Dashboard/Services/PipelineQuery.php` — a partição nova e o docblock dela.
- `backend/app/Domains/Commercial/Services/PrimaryCollectionService.php` — `ensureSingle` vira `ensureExactlyOne`, com emenda datada no docblock.
- `backend/app/Domains/Commercial/Services/{PrimaryContactService,PrimaryAddressService}.php` — docblock ("no máximo 1" vira "exatamente 1").
- `backend/app/Domains/Commercial/Actions/{CreateClientAction,UpdateClientAction,CreateClientContactAction,UpdateClientContactAction,DeleteClientContactAction,CreateClientAddressAction,UpdateClientAddressAction}.php` — chamada renomeada; `Update`/`Delete` de contato ganham comportamento novo.
- `backend/app/Domains/Commercial/Data/ClientData.php` — a regra nova em `contacts`.
- `backend/lang/{en,es_CL,pt_BR}/commercial.php` — chave `client.primary_contact_required`.
- `backend/tests/Feature/Identity/RolePermissionCrudTest.php` — casos novos de gate.
- `backend/tests/Feature/Identity/StaffUserCrudTest.php:75` — **teste autorizado a mudar** (`test_get_roles_lista_com_flag_de_sistema`).
- `backend/tests/Feature/Shared/ListQueryBudgetTest.php:278,332` — **teste autorizado a mudar** (a rota medida troca de nome).
- `backend/tests/Feature/Dashboard/PipelineQueryTest.php` — **teste autorizado a mudar** (caso 7 e a lista de etapas).
- `backend/tests/Feature/Dashboard/DashboardEndpointTest.php` — **teste autorizado a mudar**, se e somente se afirmar a lista de etapas.
- `frontend/src/shared/api/rolesApi.ts`, `frontend/src/shared/api/studentsApi.ts`
- `frontend/src/features/identity/hooks/{useStaffRoleOptions,useStudentClients,useRolesPage}.ts`
- `frontend/src/features/identity/components/AdministracionPage.tsx`
- `frontend/src/app/pages/Dashboard/admin/PipelineFunnel.tsx` — só o comentário que conta seis barras.
- `frontend/src/shared/config/locales/{en,es-CL,pt-BR}.json` — rótulo do balde novo.
- `frontend/src/shared/types/generated.ts` — **gerado**, nunca editado à mão.

---

### Task 1: `D-10` — o índice de roles sobe de gate e nasce o lookup

**Files:**
- Create: `backend/app/Domains/Identity/Data/RoleOptionData.php`
- Modify: `backend/app/Domains/Identity/Http/Controllers/RoleController.php`
- Modify: `backend/app/Domains/Identity/routes.php:80`
- Test: `backend/tests/Feature/Identity/RolePermissionCrudTest.php`
- Test: `backend/tests/Feature/Identity/StaffUserCrudTest.php:75`
- Test: `backend/tests/Feature/Shared/ListQueryBudgetTest.php:278,332`

**Interfaces:**
- Produces: `App\Domains\Identity\Data\RoleOptionData` com `public int $id` e `public string $name`, mais `RoleOptionData::fromModel(Role $role): self`; rota `GET /api/roles/assignable`; tipo TS `RoleOptionData` em `generated.ts` (consumido pela Task 2).

- [ ] **Step 1: Escrever os testes que falham**

Acrescente ao final de `backend/tests/Feature/Identity/RolePermissionCrudTest.php`, dentro da classe:

```php
    public function test_admin_comum_nao_lista_roles_com_permissoes(): void
    {
        $this->actingAsAdmin();

        $this->getJson('/api/roles')->assertForbidden();
    }

    public function test_admin_comum_lista_roles_atribuiveis_sem_permissoes(): void
    {
        $this->actingAsAdmin();

        $response = $this->getJson('/api/roles/assignable')->assertOk();

        $admin = collect($response->json())->firstWhere('name', 'admin');

        $this->assertNotNull($admin, 'A role admin não veio na lista de atribuíveis.');
        $this->assertArrayHasKey('id', $admin);
        $this->assertArrayNotHasKey('permissions', $admin, 'O lookup de roles não pode enumerar permissão.');
        $this->assertArrayNotHasKey('is_system', $admin);
    }

    public function test_superadmin_segue_listando_roles_com_permissoes(): void
    {
        $this->actingAsSuperadmin();

        $response = $this->getJson('/api/roles')->assertOk();

        $admin = collect($response->json())->firstWhere('name', 'admin');

        $this->assertTrue($admin['is_system']);
        $this->assertNotEmpty($admin['permissions']);
    }
```

- [ ] **Step 2: Rodar os testes e ver os três falharem**

Run: `docker compose exec -T app php artisan test --filter=RolePermissionCrudTest`
Expected: FAIL — `test_admin_comum_nao_lista_roles_com_permissoes` recebe 200 onde espera 403, e os dois de `assignable` recebem 404 (rota inexistente).

- [ ] **Step 3: Criar o DTO**

Crie `backend/app/Domains/Identity/Data/RoleOptionData.php`:

```php
<?php

namespace App\Domains\Identity\Data;

use App\Domains\Identity\Models\Role;
use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * Role reduzida ao que o SELECT do form de usuário precisa: id e nome.
 *
 * Existe para o índice rico não ser a única porta: `RoleData` carrega o
 * conjunto de permissões de TODA role, inclusive a do superadmin, e o gate
 * dele era o brando `identity.user.view` (D-10). Quem só monta um dropdown não
 * precisa saber o que cada role pode fazer.
 */
#[TypeScript]
class RoleOptionData extends Data
{
    public function __construct(
        public int $id,
        public string $name,
    ) {}

    public static function fromModel(Role $role): self
    {
        return new self(id: $role->id, name: $role->name);
    }
}
```

- [ ] **Step 4: Subir o gate do índice e publicar o lookup**

Em `backend/app/Domains/Identity/Http/Controllers/RoleController.php`, troque o docblock da classe, o `middleware()` e acrescente o método:

```php
/**
 * Roles: `index` devolve nome, permissões e flag de sistema para a tela de
 * Roles y Permisos, e por isso vive sob o gate sensível `access.manage` — o
 * mesmo de `/api/permissions` e da escrita. `assignable` é o lookup do select
 * do form de usuário (gate brando `user.view`) e não enumera permissão
 * nenhuma. System roles são imutáveis (guard).
 */
class RoleController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('permission:identity.user.view', only: ['assignable']),
            new Middleware('permission:identity.access.manage', only: ['index', 'store', 'update']),
        ];
    }

    /** @return array<RoleOptionData> */
    public function assignable(): array
    {
        return Role::query()->orderBy('name')->get(['id', 'name'])
            ->map(fn (Role $r) => RoleOptionData::fromModel($r))
            ->all();
    }
```

Acrescente o `use App\Domains\Identity\Data\RoleOptionData;` junto dos outros imports. O `index()`, o `store()` e o `update()` ficam como estão.

- [ ] **Step 5: Declarar a rota antes do `apiResource`**

Em `backend/app/Domains/Identity/routes.php`, substitua a linha do `apiResource('roles', ...)` por:

```php
    // ANTES do apiResource: `roles/{role}` casaria com `assignable` e o binding
    // daria 404 tentando resolver a palavra como id — mesma razão de
    // `redatores/archived` e `users/archived` acima.
    Route::get('roles/assignable', [RoleController::class, 'assignable']);

    Route::apiResource('roles', RoleController::class)->only(['index', 'store', 'update']);
```

- [ ] **Step 6: Rodar os testes novos e ver passarem**

Run: `docker compose exec -T app php artisan test --filter=RolePermissionCrudTest`
Expected: PASS em todos, inclusive os três novos.

- [ ] **Step 7: Consertar os dois testes que o gate novo derruba**

Rode a suíte inteira primeiro, para ver o estrago com os próprios olhos:

Run: `docker compose exec -T app php artisan test`
Expected: FAIL em `StaffUserCrudTest::test_get_roles_lista_com_flag_de_sistema` (403) e nos cenários de `ListQueryBudgetTest` que medem `api/roles` (403).

Em `backend/tests/Feature/Identity/StaffUserCrudTest.php`, o teste passa a exercitar o gate certo — **é o registro da decisão nova, não conserto de bug**:

```php
    public function test_get_roles_lista_com_flag_de_sistema(): void
    {
        // O índice rico é do superadmin desde a D-10: ele devolve as permissões
        // de toda role, e admin comum enumerava as do superadmin por aqui.
        $this->actingAsSuperadmin();

        $response = $this->getJson('/api/roles')->assertOk();

        $admin = collect($response->json())->firstWhere('name', 'admin');
        $this->assertTrue($admin['is_system']);
    }
```

Em `backend/tests/Feature/Shared/ListQueryBudgetTest.php`, a rota medida troca de nome nos dois pontos — a lista roda como admin, e é `assignable` que o admin agora chama. Na constante (linha 278):

```php
        'api/roles/assignable' => 1,
```

E na closure de semeadura (linha 332):

```php
            'api/roles/assignable' => fn (int $n) => $this->repetir($n, fn () => Role::create(['name' => 'papel-'.(++$this->seq), 'guard_name' => 'web'])),
```

- [ ] **Step 8: Rodar a suíte inteira**

Run: `docker compose exec -T app php artisan test`
Expected: PASS. A contagem sobe em relação à `main` (1175 passed / 5 skipped) pelos três testes novos.

- [ ] **Step 9: Regenerar os tipos e formatar**

```bash
docker compose exec -T app php artisan typescript:transform
cd backend && ./vendor/bin/pint app/Domains/Identity/Data/RoleOptionData.php app/Domains/Identity/Http/Controllers/RoleController.php app/Domains/Identity/routes.php tests/Feature/Identity/RolePermissionCrudTest.php tests/Feature/Identity/StaffUserCrudTest.php tests/Feature/Shared/ListQueryBudgetTest.php
```

Expected: `pint` termina em `PASS`; `git diff --stat frontend/src/shared/types/generated.ts` mostra `RoleOptionData` acrescentado.

- [ ] **Step 10: Commit**

```bash
git add backend/app/Domains/Identity backend/tests/Feature/Identity backend/tests/Feature/Shared/ListQueryBudgetTest.php frontend/src/shared/types/generated.ts
git commit -m "feat(rbac): o indice de roles sobe para access.manage e nasce o lookup atribuivel"
```

---

### Task 2: `D-10` — o front consome o lookup e a aba de roles só monta sob gate

**Files:**
- Modify: `frontend/src/shared/api/rolesApi.ts`
- Modify: `frontend/src/features/identity/hooks/useStaffRoleOptions.ts`
- Create: `frontend/src/features/identity/components/Admin/RolesTab.tsx`
- Modify: `frontend/src/features/identity/components/AdministracionPage.tsx`

**Interfaces:**
- Consumes: tipo TS `RoleOptionData` e a rota `GET /api/roles/assignable` (Task 1).
- Produces: `rolesApi.useAssignable()` devolvendo `UseQueryResult<RoleOptionData[], ProblemDetails>`; componente `RolesTab` sem props.

- [ ] **Step 1: Publicar o lookup na camada de dados**

Substitua `frontend/src/shared/api/rolesApi.ts` inteiro:

```ts
import { useQuery } from '@tanstack/react-query'
import { createCrudResource } from './createCrudResource'
import { api } from './axios'
import type { ProblemDetails } from './axios'
import type { RoleData, RoleOptionData } from '@shared/types/generated'

/** Cliente REST do recurso `roles`.
 *
 * `useList` alimenta a tabela de Roles y Permisos e `useCreate`/`useUpdate` a
 * escrita — os três sob `identity.access.manage`, porque o índice devolve as
 * permissões de toda role. O select do form de usuário usa `useAssignable`,
 * que fala com o lookup enxuto sob `identity.user.view` (D-10): quem monta um
 * dropdown não precisa enumerar permissão. */
export const rolesApi = {
  ...createCrudResource<RoleData>('roles'),
  useAssignable: () =>
    useQuery<RoleOptionData[], ProblemDetails>({
      queryKey: ['roles', 'assignable'] as const,
      queryFn: () => api.get<RoleOptionData[]>('/api/roles/assignable').then((r) => r.data),
    }),
}
```

- [ ] **Step 2: Trocar a fonte do select**

Em `frontend/src/features/identity/hooks/useStaffRoleOptions.ts`, troque só a linha da query:

```ts
  const roles = rolesApi.useAssignable()
```

O `filter`/`map` abaixo fica idêntico: o filtro de `redator` continua no front por decisão da spec (D3).

- [ ] **Step 3: Extrair a aba de roles**

Crie `frontend/src/features/identity/components/Admin/RolesTab.tsx`:

```tsx
import { useRolesPage } from '../../hooks/useRolesPage'
import { RolesTable } from './RolesTable'
import { RoleDialog } from './RoleDialog'
import { useTranslation } from 'react-i18next'
import { AppButton } from '@shared/ui'

/** A aba de roles inteira — tabela e diálogo.
 *
 * Existe para a query NÃO rodar fora do gate: `useRolesPage` chama
 * `GET /api/roles`, que desde a D-10 é `identity.access.manage`, e a
 * `AdministracionPage` a montava incondicionalmente — admin comum abriria a
 * tela com um 403 em voo. O componente só é renderizado sob `canManage`, então
 * o hook nem existe para quem não pode.
 *
 * `canManage` não entra como prop: quem monta este componente já provou a
 * permissão, e passá-la de volta permitiria montar sem ela. */
export function RolesTab() {
  const { t } = useTranslation()
  const rolesPage = useRolesPage()

  return (
    <>
      <RolesTable
        roles={rolesPage.items}
        loading={rolesPage.loading}
        error={rolesPage.error}
        onRetry={rolesPage.refetch}
        onView={rolesPage.openView}
        actions={<AppButton variant="primary" label={t('role.new')} icon="pi pi-plus" onClick={rolesPage.openCreate} />}
      />

      {rolesPage.dialog && (
        <RoleDialog
          visible
          mode={rolesPage.dialog.mode}
          role={rolesPage.dialog.entity}
          canManage
          onHide={rolesPage.close}
          onEdit={rolesPage.startEdit}
        />
      )}
    </>
  )
}
```

- [ ] **Step 4: Enxugar a página**

Em `frontend/src/features/identity/components/AdministracionPage.tsx`: remova o import de `useRolesPage`, `RolesTable` e `RoleDialog`, acrescente `import { RolesTab } from './Admin/RolesTab'`, apague a linha `const rolesPage = useRolesPage()`, apague o bloco `{rolesPage.dialog && (<RoleDialog ... />)}` e troque o conteúdo da aba:

```tsx
          {canManage && (
            <ModuleTab header={t('admin.tabRoles')}>
              <RolesTab />
            </ModuleTab>
          )}
```

- [ ] **Step 5: Provar que a query não roda sem gate**

Run: `cd frontend && pnpm lint && pnpm build && pnpm test`
Expected: lint 0, build verde, suíte verde.

A prova de comportamento é de navegador e roda na Task 9 — aqui vale a estática: `grep -rn "useRolesPage" frontend/src` deve devolver **duas** linhas (a definição e o `RolesTab`), nenhuma delas em `AdministracionPage.tsx`.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/shared/api/rolesApi.ts frontend/src/features/identity
git commit -m "feat(rbac): o select de role usa o lookup e a aba de roles so monta sob gate"
```

---

### Task 3: `D-11` — o lookup de empresa nasce em Identity

**Files:**
- Create: `backend/app/Domains/Identity/Data/StudentClientOptionData.php`
- Modify: `backend/app/Domains/Identity/Http/Controllers/StudentController.php`
- Modify: `backend/app/Domains/Identity/routes.php`
- Test: `backend/tests/Feature/Identity/StudentClientOptionsTest.php`

**Interfaces:**
- Produces: `App\Domains\Identity\Data\StudentClientOptionData` com `public int $id` e `public string $legal_name`; rota `GET /api/students/client-options`; tipo TS `StudentClientOptionData` (consumido pela Task 4).

- [ ] **Step 1: Escrever o teste que falha**

Crie `backend/tests/Feature/Identity/StudentClientOptionsTest.php`:

```php
<?php

namespace Tests\Feature\Identity;

use App\Domains\Commercial\Models\Client;
use App\Domains\Identity\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

/**
 * O dropdown de empresa do create de aluno chamava `GET /api/clients`
 * (`commercial.client.view`) dentro de um módulo gated por `identity.user.*`
 * (D-11): quem tinha permissão de criar aluno mas não de ver cliente criava
 * pela API e não pela tela. O lookup carrega o gate de quem o usa.
 */
class StudentClientOptionsTest extends TestCase
{
    use RefreshDatabase;

    /** Role customizada com o mínimo do cadastro de aluno e NADA de comercial. */
    private function actingAsCadastradorDeAluno(): User
    {
        $this->seed(RolePermissionSeeder::class);

        $role = Role::create(['name' => 'cadastrador', 'guard_name' => 'web']);
        $role->syncPermissions(['identity.user.view', 'identity.user.create']);

        $user = User::factory()->create(['type' => 'admin', 'is_active' => true]);
        $user->assignRole($role);
        $this->actingAs($user, 'web');

        return $user;
    }

    /** Não há `ClientFactory` no repositório: cliente nasce de User + Client,
     * como no `PipelineQueryTest`. `is_active: false` porque cliente não
     * autentica (RN-01). */
    private function criarCliente(string $legalName, string $rut): Client
    {
        $user = User::create([
            'name' => $legalName,
            'rut' => $rut,
            'email' => Str::slug($legalName).'@example.test',
            'password' => 'secret',
            'type' => 'cliente',
            'is_active' => false,
        ]);

        return Client::create([
            'user_id' => $user->id,
            'legal_name' => $legalName,
            'type' => 'client',
        ]);
    }

    public function test_quem_cria_aluno_lista_empresas_sem_permissao_comercial(): void
    {
        $this->actingAsCadastradorDeAluno();
        $client = $this->criarCliente('Transmisora Andina SpA', '76.543.210-3');

        $this->getJson('/api/clients')->assertForbidden();

        $this->getJson('/api/students/client-options')
            ->assertOk()
            ->assertJsonFragment(['id' => $client->id, 'legal_name' => 'Transmisora Andina SpA'])
            ->assertJsonCount(1);
    }

    public function test_sem_permissao_de_criar_aluno_o_lookup_e_403(): void
    {
        $this->seed(RolePermissionSeeder::class);

        $role = Role::create(['name' => 'so-leitura', 'guard_name' => 'web']);
        $role->syncPermissions(['identity.user.view']);

        $user = User::factory()->create(['type' => 'admin', 'is_active' => true]);
        $user->assignRole($role);
        $this->actingAs($user, 'web');

        $this->getJson('/api/students/client-options')->assertForbidden();
    }

    public function test_o_lookup_nao_lista_empresa_arquivada(): void
    {
        $this->actingAsCadastradorDeAluno();
        $this->criarCliente('Viva SpA', '77.111.222-3');
        $this->criarCliente('Arquivada SpA', '78.222.333-4')->delete();

        $this->getJson('/api/students/client-options')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonFragment(['legal_name' => 'Viva SpA']);
    }
}
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `docker compose exec -T app php artisan test --filter=StudentClientOptionsTest`
Expected: FAIL — 404 nos três (rota inexistente).

- [ ] **Step 3: Criar o DTO**

Crie `backend/app/Domains/Identity/Data/StudentClientOptionData.php`:

```php
<?php

namespace App\Domains\Identity\Data;

use App\Domains\Commercial\Models\Client;
use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * Empresa reduzida ao que o dropdown do create de aluno precisa: id e razón
 * social.
 *
 * Identity ler `Commercial\Models\Client` não é acoplamento novo — `Student`,
 * `User`, `CreateStudentAction`, `StudentResolver`, `StudentResolution`,
 * `StudentClientLinkService` e `StudentClientLog` já leem. O que é novo é o
 * gate: o lookup responde a `identity.user.create`, e não a
 * `commercial.client.view` (D-11).
 */
#[TypeScript]
class StudentClientOptionData extends Data
{
    public function __construct(
        public int $id,
        public string $legal_name,
    ) {}

    public static function fromModel(Client $client): self
    {
        return new self(id: $client->id, legal_name: $client->legal_name);
    }
}
```

- [ ] **Step 4: Publicar o método no controller**

Em `backend/app/Domains/Identity/Http/Controllers/StudentController.php`, acrescente ao `middleware()` e o método logo depois do `index()`:

```php
            new Middleware('permission:identity.user.create', only: ['store', 'clientOptions']),
```

```php
    /**
     * As empresas atribuíveis a um aluno no create.
     *
     * Gate `identity.user.create`, o da ação que o dropdown serve: o campo só
     * é editável no create, e fora dele a tela mostra `current_client_name`,
     * que já vem no `StudentData` (D-11).
     *
     * @return array<StudentClientOptionData>
     */
    public function clientOptions(): array
    {
        return Client::query()
            ->orderBy('legal_name')
            ->get(['id', 'legal_name'])
            ->map(fn (Client $client) => StudentClientOptionData::fromModel($client))
            ->all();
    }
```

Acrescente os imports `use App\Domains\Commercial\Models\Client;` e `use App\Domains\Identity\Data\StudentClientOptionData;`.

- [ ] **Step 5: Declarar a rota antes do `apiResource`**

Em `backend/app/Domains/Identity/routes.php`, substitua a linha do `apiResource('students', ...)` por:

```php
    // ANTES do apiResource, pela razão de sempre: `students/{student}` casaria
    // com `client-options` e o binding daria 404 na palavra.
    Route::get('students/client-options', [StudentController::class, 'clientOptions']);

    Route::apiResource('students', StudentController::class)
        ->only(['index', 'store', 'show', 'update']);
```

- [ ] **Step 6: Rodar e ver passar**

Run: `docker compose exec -T app php artisan test --filter=StudentClientOptionsTest`
Expected: PASS nos três.

- [ ] **Step 7: Suíte, tipos e formatação**

```bash
docker compose exec -T app php artisan test
docker compose exec -T app php artisan typescript:transform
cd backend && ./vendor/bin/pint app/Domains/Identity/Data/StudentClientOptionData.php app/Domains/Identity/Http/Controllers/StudentController.php app/Domains/Identity/routes.php tests/Feature/Identity/StudentClientOptionsTest.php
```

Expected: suíte PASS, `pint` PASS, `generated.ts` ganha `StudentClientOptionData`.

- [ ] **Step 8: Commit**

```bash
git add backend/app/Domains/Identity backend/tests/Feature/Identity/StudentClientOptionsTest.php frontend/src/shared/types/generated.ts
git commit -m "feat(rbac): o lookup de empresa do create de aluno nasce em Identity"
```

---

### Task 4: `D-11` — o dropdown para de atravessar o gate comercial

**Files:**
- Modify: `frontend/src/shared/api/studentsApi.ts`
- Modify: `frontend/src/features/identity/hooks/useStudentClients.ts`

**Interfaces:**
- Consumes: tipo TS `StudentClientOptionData` e a rota `GET /api/students/client-options` (Task 3).
- Produces: `studentsApi.useClientOptions(enabled: boolean)` devolvendo `UseQueryResult<StudentClientOptionData[], ProblemDetails>`.

- [ ] **Step 1: Publicar o lookup na camada de dados**

Em `frontend/src/shared/api/studentsApi.ts`, acrescente os imports e a chave nova ao objeto:

```ts
import { useQuery } from '@tanstack/react-query'
import { createCrudResource } from './createCrudResource'
import { pageEndpoint } from './page'
import { api } from './axios'
import type { ProblemDetails } from './axios'
import type { StudentClientOptionData, StudentData } from '@shared/types/generated'
```

```ts
  /** As empresas do dropdown do create. `enabled` é PARÂMETRO: fora do create o
   * campo é texto e não há lista a buscar (mesma lição da D-04). */
  useClientOptions: (enabled: boolean) =>
    useQuery<StudentClientOptionData[], ProblemDetails>({
      queryKey: ['students', 'client-options'] as const,
      queryFn: () => api.get<StudentClientOptionData[]>('/api/students/client-options').then((r) => r.data),
      enabled,
    }),
```

- [ ] **Step 2: Trocar a fonte do hook**

Em `frontend/src/features/identity/hooks/useStudentClients.ts`, troque o import de `clientsApi` por `studentsApi`, a linha da query e o docblock que citava o gate antigo:

```ts
import { useLoadState } from '@shared/hooks'
import { studentsApi } from '@shared/api/studentsApi'
import type { DialogMode } from '@shared/lib'

/** Clientes do dropdown de empresa do aluno.
 *
 * Só busca no create: view/edit mostram `current_client_name` (já vem no
 * StudentData), sem chamada extra. Desde a D-11 a fonte é
 * `GET /api/students/client-options`, sob `identity.user.create` — o gate da
 * ação que o dropdown serve. Antes era `GET /api/clients`
 * (`commercial.client.view`), e quem tinha permissão de criar aluno sem a
 * comercial via o campo travado com o motivo na tela. */
export function useStudentClients(mode: DialogMode) {
  const isCreate = mode === 'create'
  const load = useLoadState(studentsApi.useClientOptions(isCreate))
```

O corpo do `return` fica igual, com uma simplificação obrigatória: `StudentClientOptionData.id` é `number` (não `undefined | number`), então o `flatMap` que descartava o impossível vira `map`:

```ts
  return {
    ...load,
    /** `id` aqui é `number` de verdade: o DTO do lookup não serve create e
     * edit ao mesmo tempo, então não há `Optional` a descartar — era o que o
     * `flatMap` fazia enquanto a fonte era `ClientData`. */
    options: load.data.map((c) => ({ label: c.legal_name, value: c.id })),
    /** Fora do create não há query nem dropdown para travar: o campo é texto. */
    unusable: isCreate && load.unusable,
  }
}
```

- [ ] **Step 3: Verificar**

Run: `cd frontend && pnpm lint && pnpm build && pnpm test`
Expected: lint 0, build verde (o `tsc -b` é quem prova que `options` continua `{label: string, value: number}[]` para o `StudentClientField`), suíte verde.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/shared/api/studentsApi.ts frontend/src/features/identity/hooks/useStudentClients.ts
git commit -m "feat(rbac): o dropdown de empresa do aluno consome o lookup de Identity"
```

---

### Task 5: `D-16` — o funil ganha o sétimo balde

**Files:**
- Modify: `backend/app/Domains/Dashboard/Enums/PipelineStage.php`
- Modify: `backend/app/Domains/Dashboard/Services/PipelineQuery.php:70-92`
- Test: `backend/tests/Feature/Dashboard/PipelineQueryTest.php:110-150`
- Test: `backend/tests/Feature/Dashboard/DashboardEndpointTest.php:97-108,186-189,345`

**Interfaces:**
- Produces: `PipelineStage::ConcludedWithoutIssuance` com valor `'concluded_without_issuance'`, último do enum e último do array devolvido por `PipelineQuery::stages()`; a chave i18n `dashboard.pipeline.stage.concluded_without_issuance` que a Task 6 preenche.

- [ ] **Step 1: Mudar a assertiva do caso 7 e ver falhar**

Em `backend/tests/Feature/Dashboard/PipelineQueryTest.php`, o comentário do caso 7 e o mapa esperado mudam. **Esta é a mudança de decisão, não um conserto:** o caso 7 (turma concluída com matrícula reprovada) sai de `fully_issued`.

Troque o comentário do caso 7 por:

```php
        // 7. concluída SEM nenhuma matrícula aprovada — balde próprio desde a
        // D-16: não há o que emitir, e "Totalmente emitida" afirmava emissão
        // onde não houve nenhuma.
```

E o mapa esperado por:

```php
        $this->assertSame([
            'quote_pending' => 1,
            'quote_approved_without_turma' => 1,
            'turma_in_progress' => 1,
            'turma_ready_for_conclusion' => 1,
            'concluded_pending_issuance' => 1,
            'fully_issued' => 1,
            'concluded_without_issuance' => 1,
        ], $stages);
```

A asserção de soma (`assertSame(7, array_sum($stages))`) **fica como está** — é ela que prova a exclusividade, e o total não muda.

No segundo teste (`test_sem_gate_comercial_o_funil_perde_so_as_etapas_de_cotacao`), acrescente a etapa nova ao fim das duas listas:

```php
        $this->assertSame([
            PipelineStage::TurmaInProgress,
            PipelineStage::TurmaReadyForConclusion,
            PipelineStage::ConcludedPendingIssuance,
            PipelineStage::FullyIssued,
            PipelineStage::ConcludedWithoutIssuance,
        ], array_map(fn ($row): PipelineStage => $row->stage, $stages));
```

```php
        $this->assertSame(
            [1, 0, 0, 0, 0],
            array_map(fn ($row): int => $row->count, $stages),
        );
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `docker compose exec -T app php artisan test --filter=PipelineQueryTest`
Expected: FAIL — o mapa volta sem a chave `concluded_without_issuance` e com `fully_issued => 2`.

- [ ] **Step 3: Acrescentar o caso ao enum**

Em `backend/app/Domains/Dashboard/Enums/PipelineStage.php`, acrescente **por último**:

```php
    case FullyIssued = 'fully_issued';
    /** Concluída sem nenhuma matrícula aprovada: zero matrículas, ou todas
     * reprovadas. Balde terminal alternativo — não é etapa por onde a turma
     * passa a caminho da emissão (D-16). */
    case ConcludedWithoutIssuance = 'concluded_without_issuance';
```

- [ ] **Step 4: Particionar a conclusão em três**

Em `backend/app/Domains/Dashboard/Services/PipelineQuery.php`, troque a linha do docblock que descreve a partição:

```php
 *   concluída    = com emissão pendente (`ConcludedPendingIssuance`) + emitida
 *                  (`FullyIssued`) + sem nada a emitir (`ConcludedWithoutIssuance`)
```

E, no corpo de `stages()`, acrescente a contagem junto das outras e corrija o balde de emitidas:

```php
        $habilitadas = $turmaKpis['conclusoes_por_confirmar'];
        $concluidas = Turma::query()->where('status', TurmaStatus::Concluida)->count();
        // Uma linha por turma concluída com matrícula aprovada sem certificado
        // — o `CertificationMetricsQuery` já agrega por turma, que é a unidade
        // do funil.
        $emissaoPendente = count($certificationPendencias);
        // Concluída sem nenhuma matrícula APROVADA (D-16). Cai aqui tanto a
        // turma sem matrícula quanto a que só tem reprovados: a pergunta do
        // funil é uma só — há algo a emitir?
        $semNadaAEmitir = Turma::query()
            ->where('status', TurmaStatus::Concluida)
            ->whereDoesntHave(
                'enrollments',
                fn (Builder $query): Builder => $query->where('approval_status', EnrollmentApprovalStatus::Aprobado),
            )
            ->count();
```

E o balde de emitidas passa a descontar as duas:

```php
        $stages[] = new PipelineStageCountData(
            stage: PipelineStage::FullyIssued,
            count: $concluidas - $emissaoPendente - $semNadaAEmitir,
        );
        $stages[] = new PipelineStageCountData(
            stage: PipelineStage::ConcludedWithoutIssuance,
            count: $semNadaAEmitir,
        );
```

Acrescente os imports que faltam ao topo do arquivo:

```php
use App\Domains\Operation\Enums\EnrollmentApprovalStatus;
use Illuminate\Database\Eloquent\Builder;
```

- [ ] **Step 5: Rodar e ver passar**

Run: `docker compose exec -T app php artisan test --filter=PipelineQueryTest`
Expected: PASS nos dois testes.

- [ ] **Step 6: Consertar as três asserções do endpoint**

Run: `docker compose exec -T app php artisan test --filter=DashboardEndpointTest`
Expected: FAIL em três pontos — o mapa completo, a lista de etapas sem gate comercial e o funil vazio.

Em `backend/tests/Feature/Dashboard/DashboardEndpointTest.php`, acrescente a chave nova ao mapa (linha ~107, o cenário não tem turma concluída vazia, então a contagem é zero e a soma de 5 fica intacta):

```php
            'fully_issued' => 0,
            'concluded_without_issuance' => 0,
        ], $pipeline);
```

Na lista de etapas sem gate comercial (linha ~186):

```php
        $this->assertSame(
            ['turma_in_progress', 'turma_ready_for_conclusion', 'concluded_pending_issuance', 'fully_issued', 'concluded_without_issuance'],
            array_column($response->json('pipeline'), 'stage'),
        );
```

E no funil vazio (linha ~345), o comentário e a contagem passam a sete:

```php
        // Funil vazio ainda declara as sete etapas: gráfico com eixo, não
        // ausência de gráfico.
        $this->assertSame([0, 0, 0, 0, 0, 0, 0], array_column($response->json('pipeline'), 'count'));
```

- [ ] **Step 7: Suíte, tipos e formatação**

```bash
docker compose exec -T app php artisan test
docker compose exec -T app php artisan typescript:transform
cd backend && ./vendor/bin/pint app/Domains/Dashboard tests/Feature/Dashboard
```

Expected: suíte PASS, `pint` PASS, `generated.ts` com o valor novo no enum `PipelineStage`.

- [ ] **Step 8: Commit**

```bash
git add backend/app/Domains/Dashboard backend/tests/Feature/Dashboard frontend/src/shared/types/generated.ts
git commit -m "feat(dashboard): turma concluida sem nada a emitir ganha balde proprio"
```

---

### Task 6: `D-16` — o rótulo do balde novo nos três locales

**Files:**
- Modify: `frontend/src/shared/config/locales/es-CL.json:366`
- Modify: `frontend/src/shared/config/locales/pt-BR.json:366`
- Modify: `frontend/src/shared/config/locales/en.json:366`
- Modify: `frontend/src/app/pages/Dashboard/admin/PipelineFunnel.tsx:15`

**Interfaces:**
- Consumes: `PipelineStage::ConcludedWithoutIssuance` (Task 5). O componente já renderiza por `t(\`dashboard.pipeline.stage.${etapa.stage}\`)`, então **nenhuma mudança estrutural é necessária** — só a chave.

- [ ] **Step 1: Acrescentar a chave nos três locales**

Em `frontend/src/shared/config/locales/es-CL.json`, dentro de `dashboard.pipeline.stage`:

```json
        "fully_issued": "Totalmente emitida",
        "concluded_without_issuance": "Concluida, nada por emitir"
```

Em `pt-BR.json`:

```json
        "fully_issued": "Totalmente emitida",
        "concluded_without_issuance": "Concluída, nada a emitir"
```

Em `en.json`:

```json
        "fully_issued": "Fully issued",
        "concluded_without_issuance": "Concluded, nothing to issue"
```

- [ ] **Step 2: Corrigir a contagem no comentário do funil**

Em `frontend/src/app/pages/Dashboard/admin/PipelineFunnel.tsx`, o comentário do estado vazio conta barras:

```tsx
        // Todas as etapas em zero é funil VAZIO, não funil quebrado: sete barras
        // de largura nula seriam indistinguíveis de um erro de render.
```

- [ ] **Step 3: Verificar**

Run: `cd frontend && pnpm lint && pnpm build && pnpm test`
Expected: lint 0, build verde, suíte verde.

Prova estática de que nenhum locale ficou para trás:

```bash
grep -c "concluded_without_issuance" frontend/src/shared/config/locales/*.json
```

Expected: `1` para cada um dos três arquivos.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/shared/config/locales frontend/src/app/pages/Dashboard/admin/PipelineFunnel.tsx
git commit -m "feat(dashboard): o setimo balde do funil ganha rotulo nos tres locales"
```

---

### Task 7: `D-09` — a coleção passa a garantir exatamente um principal

**Files:**
- Modify: `backend/app/Domains/Commercial/Services/PrimaryCollectionService.php`
- Modify: `backend/app/Domains/Commercial/Services/PrimaryContactService.php`
- Modify: `backend/app/Domains/Commercial/Services/PrimaryAddressService.php`
- Modify: `backend/app/Domains/Commercial/Actions/{CreateClientAction,UpdateClientAction,CreateClientContactAction,UpdateClientContactAction,DeleteClientContactAction,CreateClientAddressAction,UpdateClientAddressAction}.php`
- Create: `backend/app/Domains/Commercial/Actions/DeleteClientAddressAction.php`
- Modify: `backend/app/Domains/Commercial/Http/Controllers/ClientAddressController.php:25`
- Test: `backend/tests/Feature/Commercial/ContatoPrincipalTest.php`

**Interfaces:**
- Produces: `PrimaryCollectionService::ensureExactlyOne(Client $client, ?Model $winner = null): void`. **O nome `ensureSingle` deixa de existir** — a Task 8 chama o nome novo.

- [ ] **Step 1: Escrever o teste da promoção**

Crie `backend/tests/Feature/Commercial/ContatoPrincipalTest.php`:

```php
<?php

namespace Tests\Feature\Commercial;

use App\Domains\Commercial\Models\Client;
use App\Domains\Commercial\Models\ClientContact;
use App\Domains\Identity\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * A invariante do contato principal, decidida na D-09: entrada explícita sem
 * principal RECUSA; zero principal por efeito colateral PROMOVE. A tela já se
 * comportava assim; este bloco fez o contrato dizer o mesmo.
 */
class ContatoPrincipalTest extends TestCase
{
    use RefreshDatabase;

    private Client $client;

    protected function setUp(): void
    {
        parent::setUp();
        $this->actingAsSuperadmin();

        $user = User::create([
            'name' => 'Contacto SpA',
            'rut' => '76.111.000-1',
            'email' => 'contacto@example.test',
            'password' => 'secret',
            'type' => 'cliente',
            'is_active' => false,
        ]);

        $this->client = Client::create([
            'user_id' => $user->id,
            'legal_name' => 'Contacto SpA',
            'type' => 'client',
        ]);
    }

    private function contato(string $name, bool $primary): ClientContact
    {
        return $this->client->contacts()->create(['name' => $name, 'is_primary' => $primary]);
    }

    public function test_apagar_o_principal_promove_o_mais_antigo_dos_restantes(): void
    {
        $principal = $this->contato('Ana', true);
        $segundo = $this->contato('Bruno', false);
        $terceiro = $this->contato('Carla', false);

        $this->deleteJson("/api/contacts/{$principal->id}")
            ->assertNoContent();

        $this->assertTrue($segundo->fresh()->is_primary, 'O mais antigo dos restantes devia assumir.');
        $this->assertFalse($terceiro->fresh()->is_primary);
    }

    public function test_apagar_contato_comum_nao_move_o_principal(): void
    {
        $principal = $this->contato('Ana', true);
        $segundo = $this->contato('Bruno', false);

        $this->deleteJson("/api/contacts/{$segundo->id}")
            ->assertNoContent();

        $this->assertTrue($principal->fresh()->is_primary);
    }

    /** D20 da spec: o serviço é compartilhado, então endereço herda a PROMOÇÃO
     * — não a recusa de entrada, que fica só em contatos porque `contacts` é
     * obrigatório e endereço não é. */
    public function test_endereco_tambem_promove_quando_fica_sem_principal(): void
    {
        $principal = $this->client->addresses()->create(['line1' => 'Av. Uno 1', 'is_primary' => true]);
        $segundo = $this->client->addresses()->create(['line1' => 'Av. Dos 2', 'is_primary' => false]);

        $this->deleteJson("/api/addresses/{$principal->id}")
            ->assertNoContent();

        $this->assertTrue($segundo->fresh()->is_primary);
    }
}
```

As rotas nested são `PUT|DELETE /api/contacts/{contact}` e
`PUT|DELETE /api/addresses/{address}` — **sem** o prefixo do cliente, que só
existe no `POST` de criação. Confira em
`backend/app/Domains/Commercial/routes.php:41-46` antes de escrever a URL.

- [ ] **Step 2: Rodar e ver falhar**

Run: `docker compose exec -T app php artisan test --filter=ContatoPrincipalTest`
Expected: FAIL em `test_apagar_o_principal_promove_o_mais_antigo_dos_restantes` — hoje o delete não promove ninguém e `Bruno` volta com `is_primary` false.

- [ ] **Step 3: O serviço passa a garantir exatamente um**

Substitua o método em `backend/app/Domains/Commercial/Services/PrimaryCollectionService.php` — e emende o docblock da classe, cuja terceira linha afirmava o contrário:

```php
 * Garante a invariante "EXATAMENTE 1 principal por cliente" na camada de
 * aplicação, nunca em trigger (ADR-02/ADR-08: trigger enxerga a conexão, não o
 * usuário autenticado — a auditoria perderia o autor).
 *
 * **Emenda de 2026-09-03 (D-09).** Até aqui a regra era "no máximo 1", e o
 * docblock declarava que cliente SEM principal era estado válido: o serviço
 * não promovia ninguém. A tela nunca produziu esse estado — o rádio não
 * desmarca e a remoção re-promove —, e a assimetria entre as duas camadas era
 * a ficha D-09. O veredito: quem cede é o backend. Coleção que ficou sem
 * principal por EFEITO COLATERAL (exclusão do principal) promove o mais antigo
 * aqui; entrada EXPLÍCITA sem principal é recusada na validação, que é assunto
 * do DTO e da Action, não deste serviço.
```

```php
    /**
     * @param  Model|null  $winner  Item que deve permanecer principal. Null (ou
     *                              um item que não está mais marcado) → vence o
     *                              último por id, que é o "último marcado" no
     *                              replace-total.
     */
    public function ensureExactlyOne(Client $client, ?Model $winner = null): void
    {
        $items = $this->collection($client)
            ->orderBy('id')
            // Leitura TRAVADA, não comum: em REPEATABLE READ o SELECT comum volta
            // do snapshot da transação e NÃO enxerga o principal que a transação
            // concorrente já commitou. A contagem daria 1, o early-return abaixo
            // dispararia e os dois principais sobreviveriam — medido em
            // 2026-08-11. Isto faz a transação ENXERGAR; quem SERIALIZA é o
            // `Client::lockForWrite()` que a Action toma antes de escrever.
            ->lockForUpdate()
            ->get();

        // Coleção vazia não tem principal a garantir. Quem exige ao menos um
        // ITEM é a validação (`contacts.min:1`), não esta invariante.
        if ($items->isEmpty()) {
            return;
        }

        $primaries = $items->where('is_primary', true);

        // Zero principais só acontece por efeito colateral — a entrada
        // explícita já foi recusada antes de chegar aqui (D-09). Promove o mais
        // antigo, que é o que a tela faz ao remover o principal.
        if ($primaries->isEmpty()) {
            $items->first()->update(['is_primary' => true]);

            return;
        }

        if ($primaries->count() === 1) {
            return;
        }

        $keep = $winner !== null && $primaries->contains(fn (Model $m) => $m->is($winner))
            ? $winner
            : $primaries->last();

        // update() por INSTÂNCIA, não pelo query builder: só o evento do model
        // dispara a auditoria (lei §5.2). Um ->where(...)->update(...) aqui
        // desmarcaria o principal sem deixar rastro — peso legal.
        $primaries
            ->reject(fn (Model $m) => $m->is($keep))
            ->each(fn (Model $m) => $m->update(['is_primary' => false]));
    }
```

- [ ] **Step 4: Renomear as sete chamadas**

Nas duas subclasses, o docblock diz "no máximo 1" e passa a dizer "exatamente 1":

```php
/**
 * "EXATAMENTE 1 contato principal por cliente". A regra inteira vive na
 * `PrimaryCollectionService`; aqui fica só qual coleção é a coleção.
```

```php
/**
 * "EXATAMENTE 1 endereço principal por cliente". A regra inteira vive na
 * `PrimaryCollectionService`; aqui fica só qual coleção é a coleção.
```

Troque `->ensureSingle(` por `->ensureExactlyOne(` nas sete chamadas:

```bash
grep -rln "ensureSingle" backend/app | xargs sed -i 's/ensureSingle(/ensureExactlyOne(/g'
grep -rn "ensureSingle" backend/app backend/tests
```

Expected do segundo comando: **nenhuma linha**. Se alguma sobrar, ela é a que o `sed` não alcançou — corrija à mão.

- [ ] **Step 5: Fazer a exclusão chamar a invariante**

Em `backend/app/Domains/Commercial/Actions/DeleteClientContactAction.php`, acrescente a chamada depois do delete e o parágrafo de docblock:

```php
 * Depois do delete, a invariante roda: apagar o PRINCIPAL deixaria a coleção
 * sem nenhum, e desde a D-09 zero-por-efeito-colateral promove o mais antigo
 * dos restantes, em vez de recusar. Recusar aqui obrigaria o usuário a
 * promover outro contato antes de excluir — fricção sem ganho.
```

```php
    public function __construct(private PrimaryContactService $primaryContacts) {}
```

```php
            $contact->delete();

            $this->primaryContacts->ensureExactlyOne($contact->client);
```

Acrescente o import `use App\Domains\Commercial\Services\PrimaryContactService;`.

- [ ] **Step 6: Dar Action à exclusão de endereço**

`ClientAddressController::destroy` apaga direto, sem Action e sem o serviço — medido em 2026-09-03.
Sem isto a D20 seria falsa justamente no caminho que a D-09 nomeia.

Crie `backend/app/Domains/Commercial/Actions/DeleteClientAddressAction.php`:

```php
<?php

namespace App\Domains\Commercial\Actions;

use App\Domains\Commercial\Models\Client;
use App\Domains\Commercial\Models\ClientAddress;
use App\Domains\Commercial\Services\PrimaryAddressService;
use Illuminate\Support\Facades\DB;

/**
 * Exclui um endereço pela rota nested.
 *
 * Simétrica à de contato, com UMA diferença deliberada: não há mínimo a
 * guardar, porque endereço não é obrigatório (`contacts` tem `min:1`, endereço
 * não tem). O que ela existe para garantir é a invariante do principal: apagar
 * o endereço principal deixava o cliente sem principal em silêncio, porque o
 * `destroy` apagava direto no controller, sem passar pelo serviço (D-09/D20).
 *
 * Mutex do cliente PRIMEIRO, como nas outras Actions da coleção: a varredura
 * `FOR UPDATE` do `ensureExactlyOne` adquire as linhas incrementalmente, e
 * inverter a ordem dos locks foi o deadlock medido em 2026-08-11 (Q-2).
 */
class DeleteClientAddressAction
{
    public function __construct(private PrimaryAddressService $primaryAddresses) {}

    public function execute(ClientAddress $address): void
    {
        DB::transaction(function () use ($address) {
            Client::lockForWrite($address->client_id);

            $address->delete();

            $this->primaryAddresses->ensureExactlyOne($address->client);
        });
    }
}
```

Em `backend/app/Domains/Commercial/Http/Controllers/ClientAddressController.php`, o `destroy` passa a
delegar — mesmo molde do `ClientContactController`:

```php
    public function destroy(ClientAddress $address, DeleteClientAddressAction $action): Response
    {
        $action->execute($address);

        return response()->noContent();
    }
```

Acrescente o import `use App\Domains\Commercial\Actions\DeleteClientAddressAction;`.

- [ ] **Step 7: Rodar e ver passar**

Run: `docker compose exec -T app php artisan test --filter=ContatoPrincipalTest`
Expected: PASS nos três (contato promovido, contato comum sem efeito, endereço promovido).

- [ ] **Step 8: Suíte inteira**

Run: `docker compose exec -T app php artisan test`
Expected: PASS. Nenhum teste existente pode quebrar aqui: a promoção só age onde antes ficava zero, e nenhum teste afirmava zero.

- [ ] **Step 9: Formatar e commitar**

```bash
cd backend && ./vendor/bin/pint app/Domains/Commercial tests/Feature/Commercial/ContatoPrincipalTest.php
git add backend/app/Domains/Commercial backend/tests/Feature/Commercial/ContatoPrincipalTest.php
git commit -m "feat(clientes): a colecao garante exatamente um principal e a exclusao promove"
```

---

### Task 8: `D-09` — entrada explícita sem principal recusa

**Files:**
- Create: `backend/app/Domains/Commercial/Rules/UmContatoPrincipal.php`
- Modify: `backend/app/Domains/Commercial/Data/ClientData.php:56-80`
- Modify: `backend/app/Domains/Commercial/Actions/UpdateClientContactAction.php`
- Modify: `backend/lang/en/commercial.php`, `backend/lang/es_CL/commercial.php`, `backend/lang/pt_BR/commercial.php`
- Test: `backend/tests/Feature/Commercial/ContatoPrincipalTest.php`

**Interfaces:**
- Consumes: `PrimaryContactService::ensureExactlyOne` (Task 7).
- Produces: chave de tradução `commercial.client.primary_contact_required` nos três locales; regra `App\Domains\Commercial\Rules\UmContatoPrincipal`.

- [ ] **Step 1: Escrever os testes de recusa**

Acrescente a `backend/tests/Feature/Commercial/ContatoPrincipalTest.php`, dentro da classe:

```php
    /** O payload de replace-total que o cadastro manda, com os contatos dados. */
    private function payload(array $contacts): array
    {
        return [
            'name' => 'Contacto SpA',
            'legal_name' => 'Contacto SpA',
            'rut' => '76.111.000-1',
            'email' => 'contacto@example.test',
            'type' => 'client',
            'contacts' => $contacts,
        ];
    }

    public function test_atualizar_sem_nenhum_principal_e_422(): void
    {
        $this->contato('Ana', true);

        $this->putJson("/api/clients/{$this->client->id}", $this->payload([
            ['name' => 'Ana', 'is_primary' => false],
            ['name' => 'Bruno', 'is_primary' => false],
        ]))->assertStatus(422)->assertJsonPath('errors.contacts.0', 'El cliente necesita exactamente un contacto principal.');
    }

    public function test_atualizar_com_dois_principais_e_422(): void
    {
        $this->contato('Ana', true);

        $this->putJson("/api/clients/{$this->client->id}", $this->payload([
            ['name' => 'Ana', 'is_primary' => true],
            ['name' => 'Bruno', 'is_primary' => true],
        ]))->assertStatus(422);
    }

    public function test_atualizar_com_exatamente_um_principal_passa(): void
    {
        $this->contato('Ana', true);

        $this->putJson("/api/clients/{$this->client->id}", $this->payload([
            ['name' => 'Ana', 'is_primary' => true],
            ['name' => 'Bruno', 'is_primary' => false],
        ]))->assertOk();

        $this->assertSame(1, $this->client->contacts()->where('is_primary', true)->count());
    }

    public function test_desmarcar_o_unico_principal_pela_rota_nested_e_422(): void
    {
        $principal = $this->contato('Ana', true);
        $this->contato('Bruno', false);

        $this->putJson("/api/contacts/{$principal->id}", [
            'name' => 'Ana', 'is_primary' => false,
        ])->assertStatus(422);

        $this->assertTrue($principal->fresh()->is_primary, 'O principal não podia ter sido desmarcado.');
    }

    public function test_promover_outro_pela_rota_nested_passa(): void
    {
        $principal = $this->contato('Ana', true);
        $segundo = $this->contato('Bruno', false);

        $this->putJson("/api/contacts/{$segundo->id}", [
            'name' => 'Bruno', 'is_primary' => true,
        ])->assertOk();

        $this->assertTrue($segundo->fresh()->is_primary);
        $this->assertFalse($principal->fresh()->is_primary);
    }
```

O teste do 422 compara com a frase **es-CL**, que é o fallback do `.env.example` e do `phpunit.xml` (ADR-15).

- [ ] **Step 2: Rodar e ver falhar**

Run: `docker compose exec -T app php artisan test --filter=ContatoPrincipalTest`
Expected: FAIL nos três primeiros novos (200 onde espera 422; e o de dois principais passa hoje porque o serviço rebaixa em silêncio) e no `test_desmarcar_o_unico_principal_pela_rota_nested_e_422`.

- [ ] **Step 3: A frase, nos três locales**

Em `backend/lang/es_CL/commercial.php`, sob `'client' => [`, logo depois de `contact_required`:

```php
        'primary_contact_required' => 'El cliente necesita exactamente un contacto principal.',
```

Em `backend/lang/en/commercial.php`:

```php
        'primary_contact_required' => 'The client needs exactly one primary contact.',
```

Em `backend/lang/pt_BR/commercial.php`:

```php
        'primary_contact_required' => 'O cliente precisa de exatamente um contato principal.',
```

**`lang/` não passa por `pint`** (`.claude/rules/backend-lang.md`).

- [ ] **Step 4: Escrever a regra**

Crie `backend/app/Domains/Commercial/Rules/UmContatoPrincipal.php`:

```php
<?php

namespace App\Domains\Commercial\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * "A coleção enviada tem EXATAMENTE um `is_primary` verdadeiro" (D-09).
 *
 * Mora na validação, e não no `PrimaryCollectionService`, porque é sobre a
 * ENTRADA: o serviço garante a invariante do estado persistido e promove
 * quando a coleção fica sem principal por efeito colateral; aqui recusa-se o
 * payload que pede zero (ou dois) de propósito. Item sem a chave `is_primary`
 * conta como não-principal — o DTO a declara `Optional`, e ausente significa
 * "não marquei".
 */
class UmContatoPrincipal implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_array($value)) {
            return;   // `array` e `min:1` já reprovam o resto.
        }

        $principais = count(array_filter(
            $value,
            fn (mixed $item): bool => is_array($item) && ($item['is_primary'] ?? false) === true,
        ));

        if ($principais !== 1) {
            $fail(__('commercial.client.primary_contact_required'));
        }
    }
}
```

- [ ] **Step 5: Ligar a regra ao DTO**

Em `backend/app/Domains/Commercial/Data/ClientData.php`, acrescente a regra à lista de `contacts` e o comentário que a explica:

```php
            // `sometimes`, não `required`: a coleção é `Optional`, e omitir a
            // chave num PUT significa "não mexi nos contatos" — antes apagava
            // todos em silêncio. `min:1` segue valendo quando a chave VEM, e a
            // obrigatoriedade do create mora na CreateClientAction, porque
            // rules() é estático e não distingue verbo (Drive
            // `entidade-contato-cliente.md`, ratificado em 2026-07-31).
            // `UmContatoPrincipal` fecha a D-09: quando a coleção vem, ela vem
            // com exatamente um principal — a tela já mandava assim, e o
            // contrato passou a dizer o mesmo em 2026-09-03.
            'contacts' => ['sometimes', 'array', 'min:1', new UmContatoPrincipal],
```

Acrescente o import `use App\Domains\Commercial\Rules\UmContatoPrincipal;`.

- [ ] **Step 6: Fechar a porta nested**

Em `backend/app/Domains/Commercial/Actions/UpdateClientContactAction.php`, o docblock estava certo sobre o comportamento antigo e passa a descrever o novo:

```php
/**
 * Atualiza um contato pela rota nested, mantendo a invariante de principal
 * único.
 *
 * Desmarcar o ÚNICO principal é entrada explícita, e desde a D-09 é recusada
 * com 422: fechar a regra só no DTO do pai deixaria esta rota esvaziando o
 * principal pela porta dos fundos, que é exatamente o buraco que a
 * `DeleteClientContactAction` já teve de tapar para o mínimo de um contato.
 */
```

E o corpo, dentro da transação e depois do lock:

```php
        return DB::transaction(function () use ($contact, $data) {
            Client::lockForWrite($contact->client_id);

            $desmarcandoPrincipal = $data->is_primary === false && $contact->is_primary;

            if ($desmarcandoPrincipal) {
                // `lockForUpdate` pela mesma razão da contagem da exclusão: sem
                // ele, duas desmarcações concorrentes leem "há outro principal"
                // e as duas passam.
                $outros = $contact->client->contacts()
                    ->where('id', '!=', $contact->id)
                    ->where('is_primary', true)
                    ->lockForUpdate()
                    ->count();

                if ($outros === 0) {
                    throw ValidationException::withMessages([
                        'is_primary' => __('commercial.client.primary_contact_required'),
                    ]);
                }
            }

            $contact->update($data->toArray());

            $this->primaryContacts->ensureExactlyOne($contact->client, $contact);

            return $contact->fresh();
        });
```

Acrescente o import `use Illuminate\Validation\ValidationException;`.

- [ ] **Step 7: Rodar e ver passar**

Run: `docker compose exec -T app php artisan test --filter=ContatoPrincipalTest`
Expected: PASS nos sete.

- [ ] **Step 8: Suíte inteira, e ler o que quebrar**

Run: `docker compose exec -T app php artisan test`
Expected: PASS. **Se algum teste de cliente quebrar por mandar contatos sem principal, PARE**: significa que a suíte documentava o estado que a D-09 acabou de proibir, e a decisão de editá-lo é do João — este plano não autoriza.

- [ ] **Step 9: Paridade de locale, formatação e commit**

```bash
docker compose exec -T app php artisan test --filter=LocaleParityTest
cd backend && ./vendor/bin/pint app/Domains/Commercial tests/Feature/Commercial/ContatoPrincipalTest.php
```

Expected: `LocaleParityTest` PASS (a chave nova existe nos três locales), `pint` PASS. **`lang/` fora do comando do pint, de propósito.**

```bash
git add backend/app/Domains/Commercial backend/lang backend/tests/Feature/Commercial/ContatoPrincipalTest.php
git commit -m "feat(clientes): contatos sem principal (ou com dois) sao recusados com 422"
```

---

### Task 9: A prova de comportamento e o audit

**Files:**
- Create: `docs/superpowers/audits/2026-09-03-item22-medicoes.md`

**Interfaces:**
- Consumes: tudo. Esta task não escreve código de produção.

- [ ] **Step 1: Subir a stack e conferir o gate verde**

```bash
docker compose up -d
docker compose exec -T app php artisan test
cd frontend && pnpm lint && pnpm build && pnpm test
cd backend && ./vendor/bin/pint --test app tests
docker compose exec -T app php artisan typescript:transform && git diff --stat frontend/src/shared/types/generated.ts
```

Expected: suíte backend PASS acima de 1175 passed / 5 skipped (a `main`), lint 0, build verde, suíte front verde, `pint --test` PASS, `generated.ts` **sem diff residual** (já foi commitado nas Tasks 1, 3 e 5).

- [ ] **Step 2: Provar a `D-10` contra a API real**

Com a sessão de um usuário `admin` (não superadmin) no navegador, pelo console em http://localhost:5173:

```js
await fetch('/api/roles', { credentials: 'include' }).then((r) => r.status)          // 403
await fetch('/api/roles/assignable', { credentials: 'include' }).then((r) => r.json())  // [{id, name}], sem `permissions`
```

E na tela: `/administracion` abre sem erro para o admin comum, a aba "Roles y Permisos" não aparece, e o select de role do diálogo de usuário continua populado. Repita com superadmin: a aba aparece e a tabela lista as roles com a contagem de permissões.

- [ ] **Step 3: Provar a `D-11` contra a API real**

Como superadmin, crie uma role customizada com `identity.user.view` e `identity.user.create` e **sem** `commercial.client.view`; atribua-a a um usuário de teste e entre com ele. Abra o create de aluno: o dropdown de empresa **lista**. No console:

```js
await fetch('/api/clients', { credentials: 'include' }).then((r) => r.status)                 // 403
await fetch('/api/students/client-options', { credentials: 'include' }).then((r) => r.json()) // [{id, legal_name}]
```

- [ ] **Step 4: Provar a `D-16` na tela**

Conclua (ou semeie) uma turma sem nenhuma matrícula aprovada, abra o Dashboard como admin e confirme: a barra **Concluida, nada por emitir** aparece com a contagem, e a de "Totalmente emitida" não a inclui. Some as sete contagens e compare com o total de itens do funil.

- [ ] **Step 5: Provar a `D-09` contra a API real**

Autenticado como superadmin, no console de http://localhost:5173. O Sanctum
exige o header de CSRF, que sai do cookie que a própria sessão já tem:

```js
const csrf = () => decodeURIComponent(document.cookie.match(/XSRF-TOKEN=([^;]+)/)[1])
const cliente = await fetch('/api/clients/1', { credentials: 'include' }).then((r) => r.json())

// 422 com a frase localizada em es-CL
await fetch('/api/clients/1', {
  method: 'PUT',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json', 'X-XSRF-TOKEN': csrf() },
  body: JSON.stringify({ ...cliente, contacts: cliente.contacts.map((c) => ({ ...c, is_primary: false })) }),
}).then(async (r) => [r.status, await r.json()])

// 204; o GET seguinte mostra OUTRO contato como principal
await fetch(`/api/contacts/${cliente.contacts.find((c) => c.is_primary).id}`, {
  method: 'DELETE',
  credentials: 'include',
  headers: { 'X-XSRF-TOKEN': csrf() },
}).then((r) => r.status)

await fetch('/api/clients/1', { credentials: 'include' })
  .then((r) => r.json())
  .then((c) => c.contacts.map((x) => [x.name, x.is_primary]))
```

Use um cliente de dev com **pelo menos dois** contatos; se não houver, crie o
segundo pela tela antes.

Devolva o banco de dev ao estado anterior ao fim.

- [ ] **Step 6: Escrever o audit e commitar**

Crie `docs/superpowers/audits/2026-09-03-item22-medicoes.md` com: a contagem da suíte antes e depois, as saídas cruas dos Steps 2 a 5, o print (ou a linha de contagem) do funil com o balde novo e o diff vazio do `generated.ts`.

```bash
git add docs/superpowers/audits/2026-09-03-item22-medicoes.md
git commit -m "docs(audit): as medicoes das quatro decisoes do item 22"
```

---

## Handoff de execução

**executor: claude**

O bloco mexe em **RBAC** — a lei §5.5 do `CLAUDE.md` governa quem autentica, e as Tasks 1 e 3 recalibram gates de permissão, onde errar o alvo abre acesso em vez de fechá-lo. Três tasks exigem julgamento que o plano não fecha sozinho:

- a **Task 1** e a **Task 5** derrubam testes verdes de propósito, e é preciso reconhecer quais quedas são a decisão nova aparecendo (as quatro nomeadas) e quais seriam contrato quebrado;
- a **Task 8** manda **PARAR** se a suíte quebrar fora do previsto, porque a alternativa — editar o teste — é decisão do João;
- a **Task 9** lê resposta crua da API e a tela contra o critério de aceite, incluindo a criação de uma role customizada só para provar o gate.

`paths_autorizados`: não se aplica.
