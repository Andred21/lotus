# BD-7 · `last_login` — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** gravar um histórico de logins bem-sucedidos em tabela própria e exibir o último acesso nas telas de Usuários e Redatores.

**Architecture:** uma linha em `login_logs` por login concedido, escrita por `RecordLoginAction` **depois** do gate de `is_active` do `AuthController`. O "último acesso" é **derivado** por `User::latestLogin()` (`hasOne(...)->latestOfMany()`), eager-loaded pelos controllers e projetado como ISO 8601 por `UserData` e `RedatorData`. Nenhuma coluna nova em `users`, nenhuma escrita em `users` no login.

**Tech Stack:** Laravel 13 / PHP 8.3 · MySQL 8 (suíte em sqlite `:memory:`) · spatie/laravel-data + typescript-transformer · React 19 + TS · vitest.

**Spec:** `docs/superpowers/specs/2026-08-12-last-login-design.md`

## Global Constraints

- **Backend roda no container:** `docker compose exec -T app php artisan …`. O host WSL não tem mbstring.
- **Pint roda no host, de dentro de `backend/`, SEMPRE com argumentos:** `cd backend && ./vendor/bin/pint <arquivos>`. Nunca sem argumento — reformata o repositório inteiro. A lista de arquivos nunca vem por substituição de comando (lista vazia = Pint sem argumento).
- **`frontend/src/shared/types/generated.ts` não se edita à mão** (Lei §5.3). Corrige-se o DTO e regenera.
- **Features não importam PrimeReact direto** (só via `shared/ui`) **nem outra feature** (Lei §5.6).
- **Auditoria só na aplicação, nunca em trigger de banco** (Lei §5.2).
- **i18n: os três locales (`pt-BR`, `es-CL`, `en`) têm chaves idênticas.** `es-CL` é a referência de rótulo.
- **Teste de regressão só vale depois de visto REPROVAR contra o código antigo.** Onde o plano manda ver vermelho, o texto exato do vermelho vai para o ledger.
- **Nada de `migrate:fresh --seed`:** o banco de dev carrega o `LOT-2026-1001` corrompido de propósito, esperando o checkpoint visual do João.
- **Branch:** `feat/last-login`, main tree (P-03). Um commit por task.

## Baseline medido em 2026-08-12 (não herdado)

| Métrica | Valor |
|---|---|
| Backend (sqlite `:memory:`) | **538 passed, 5 skipped (1999 assertions)** |
| Frontend (`pnpm test`) | **16 arquivos / 82 testes** |

> O registro de fechamento do BD-1 dizia "16 arquivos / 79 testes". O medido hoje é **82**. O plano parte do medido.

**Projeção deste plano:** backend **+9 casos** → **547 passed, 5 skipped**; frontend **+1 arquivo, +4 casos** → **17 arquivos / 86 testes**. Total de assertions é **registrado no gate, não projetado**.

## File Structure

**Criar:**

| Arquivo | Responsabilidade |
|---|---|
| `backend/database/migrations/2026_08_12_000001_create_login_logs_table.php` | tabela `login_logs` |
| `backend/app/Domains/Identity/Models/LoginLog.php` | model append-only do log |
| `backend/app/Domains/Identity/Actions/RecordLoginAction.php` | única escrita do log |
| `backend/tests/Feature/Identity/LoginLogTest.php` | captura: grava, não grava, ordem contra o gate |
| `backend/tests/Feature/Identity/LastLoginProjectionTest.php` | projeção nos dois DTOs |
| `backend/tests/Feature/Identity/LastLoginEagerLoadTest.php` | guarda de N+1 nas duas listagens |
| `frontend/src/shared/lib/datetime.test.ts` | unit de `formatDateTime` |

**Modificar:**

| Arquivo | Mudança |
|---|---|
| `backend/app/Domains/Identity/Models/User.php` | relações `loginLogs()` e `latestLogin()` |
| `backend/app/Domains/Identity/Http/Controllers/AuthController.php:18-51` | injeta e chama a Action após o gate |
| `backend/app/Domains/Identity/Data/UserData.php` | propriedade + linha no `fromModel` |
| `backend/app/Domains/Identity/Data/RedatorData.php` | propriedade + linha no `fromModel` |
| `backend/app/Domains/Identity/Http/Controllers/UserController.php:34,48` | eager-load `latestLogin` |
| `backend/app/Domains/Identity/Http/Controllers/RedatorController.php:33,45` | eager-load `user.latestLogin` |
| `frontend/src/shared/types/generated.ts` | **gerado**, nunca à mão |
| `frontend/src/shared/lib/datetime.ts` | `formatDateTime` |
| `frontend/src/features/identity/components/Admin/UsersTable.tsx` | coluna |
| `frontend/src/features/identity/components/Redator/RedatoresTable.tsx` | coluna |
| `frontend/src/shared/config/locales/{pt-BR,es-CL,en}.json` | `common.lastLogin` |
| `docs/der-fisico.md` | tabela nova |
| `docs/pendencias.md` | retenção de `ip_address`/`user_agent` |

---

### Task 0: Baseline

**Files:** nenhum. Task de medição, **sem commit**.

- [ ] **Step 1: Confirmar a árvore limpa e a branch**

Run: `git status --porcelain && git branch --show-current`
Expected: saída vazia do `status`; branch `feat/last-login`.

- [ ] **Step 2: Reproduzir o baseline do backend**

Run: `docker compose exec -T app php artisan test`
Expected: `5 skipped, 538 passed (1999 assertions)`.

Se divergir, **PARE** e reporte antes de tocar em código — o plano inteiro projeta a partir daqui.

- [ ] **Step 3: Reproduzir o baseline do frontend**

Run: `cd frontend && pnpm test`
Expected: `Test Files 16 passed (16)` / `Tests 82 passed (82)`.

---

### Task 1: Tabela, model e relações

**Files:**
- Create: `backend/database/migrations/2026_08_12_000001_create_login_logs_table.php`
- Create: `backend/app/Domains/Identity/Models/LoginLog.php`
- Modify: `backend/app/Domains/Identity/Models/User.php` (relações, depois de `student()` na linha 89)
- Modify: `docs/der-fisico.md`
- Modify: `docs/pendencias.md`

**Interfaces:**
- Produces: `App\Domains\Identity\Models\LoginLog` com `$fillable = ['user_id','ip_address','user_agent']` e `created_at` cast para `datetime`; `User::loginLogs(): HasMany`; `User::latestLogin(): HasOne`.

- [ ] **Step 1: Escrever a migration**

Criar `backend/database/migrations/2026_08_12_000001_create_login_logs_table.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('login_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->timestamp('created_at')->nullable();

            // Exatamente o acesso do `latestOfMany()`: filtra por usuário e
            // ordena por data. Com `user_id` à esquerda, o MySQL também o usa
            // para a FK, sem precisar de índice próprio.
            $table->index(['user_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('login_logs');
    }
};
```

- [ ] **Step 2: Escrever o model**

Criar `backend/app/Domains/Identity/Models/LoginLog.php`:

```php
<?php

namespace App\Domains\Identity\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Log append-only de logins bem-sucedidos. Uma linha por acesso concedido.
 *
 * NÃO é `Auditable` e não entra no morph map (ADR-10): não é polimórfico, e
 * auditar um log append-only seria guardar rastro de que o rastro nasceu.
 *
 * Sem `updated_at`: a linha nasce e não muda. Registro de tentativa FALHA e de
 * logout ficaram fora por decisão registrada (D2 da spec) — tentativa falha é
 * feature de segurança com regra própria, e o par login/logout ficaria
 * incompleto em silêncio porque expiração de sessão não passa pelo controller.
 */
class LoginLog extends Model
{
    public const UPDATED_AT = null;

    protected $fillable = [
        'user_id',
        'ip_address',
        'user_agent',
    ];

    protected function casts(): array
    {
        return [
            'created_at' => 'datetime',
        ];
    }
}
```

- [ ] **Step 3: Adicionar as relações ao `User`**

Em `backend/app/Domains/Identity/Models/User.php`, depois do método `student()` (linha 89), acrescentar:

```php
    public function loginLogs(): HasMany
    {
        return $this->hasMany(LoginLog::class);
    }

    /**
     * Último acesso, DERIVADO do histórico — não existe coluna `last_login`.
     *
     * `latestOfMany()` e não `withMax(...)` por MODO DE FALHA, não por custo: o
     * `withMax` é mais barato (subselect, zero query extra) mas projeta `null`
     * quando o chamador esquece a carga, e a tela diria "nunca acessou" para
     * todo mundo sem erro em lugar nenhum. Esta relação estoura no
     * `Model::preventLazyLoading()`. Mesma direção da D-B3 de
     * `turma-habilitacao-listagem`, que matou um `??` por esconder query atrás
     * de fallback silencioso.
     *
     * As colunas são NOMEADAS de propósito. `latestOfMany()` sem argumento usa
     * `id` (conferido no vendor: `CanBeOneOfMany::latestOfMany($column = 'id')`),
     * e o campo se chama "último ACESSO" — ordenar por `created_at` é o que o
     * nome promete, e é o que o índice composto de `login_logs` serve. O `id`
     * entra como desempate porque `MAX` numa coluna só devolve DUAS linhas
     * quando dois logins caem no mesmo segundo, o que acontece em retry.
     */
    public function latestLogin(): HasOne
    {
        return $this->hasOne(LoginLog::class)->latestOfMany(['created_at', 'id']);
    }
```

Acrescentar `use Illuminate\Database\Eloquent\Relations\HasMany;` aos imports (o `HasOne` já está importado na linha 8).

- [ ] **Step 4: Rodar a migration e conferir o schema**

Run:
```bash
docker compose exec -T app php artisan migrate
docker compose exec -T app php artisan db:table login_logs
```
Expected: a migration aplica; a tabela lista as colunas `id`, `user_id`, `ip_address`, `user_agent`, `created_at` e o índice composto.

- [ ] **Step 5: Provar que a tabela grava (DoD da rule `migrations.md`)**

Run:
```bash
docker compose exec -T app php artisan tinker --execute="
\$u = App\Domains\Identity\Models\User::first();
\$log = \$u->loginLogs()->create(['ip_address' => '1.2.3.4', 'user_agent' => 'sonda']);
echo 'criado id=' . \$log->id . ' created_at=' . \$log->created_at . PHP_EOL;
echo 'latestLogin=' . \$u->fresh()->latestLogin?->created_at . PHP_EOL;
\$log->forceDelete();
echo 'sobrou=' . App\Domains\Identity\Models\LoginLog::count() . PHP_EOL;
"
```
Expected: `criado id=1` com `created_at` preenchido, `latestLogin` com a mesma data, e `sobrou=0`.

Migration criada não é migration provada — o `laravel-auditing` já foi instalado sem a migration rodar e falhou em silêncio.

- [ ] **Step 6: Atualizar o DER**

Em `docs/der-fisico.md`, na lista de tabelas (ao lado da entrada `users` da linha 24), acrescentar:

```markdown
- **login_logs** — `id PK`, `user_id FK` → users cascade, `ip_address` (nullable, 45), `user_agent` (nullable, text), `created_at`. Índice composto (`user_id`,`created_at`). Log **append-only** de logins bem-sucedidos (sem `updated_at`, sem soft-delete, não Auditable). O "último acesso" das telas de Usuários e Redatores é derivado daqui por `User::latestLogin()` — **não existe coluna `users.last_login`**. Bloco `last-login` (BD-7).
```

- [ ] **Step 7: Registrar a retenção como pendência**

Em `docs/pendencias.md`, acrescentar uma linha à tabela, no formato das existentes. **O ID é `P-30`** — o maior em uso é `P-29`, conferido em 2026-08-12. (O `P-28` aparece **duas vezes** no arquivo; é divergência conhecida e **reportada, não corrigida** no fechamento do BD-2 — renumerar quebra referência e é decisão do João. Não mexer nela aqui.)

```markdown
| P-30 | `login_logs.ip_address` e `login_logs.user_agent` são dado pessoal e a tabela não tem política de retenção | Bloco `last-login` (BD-7, 2026-08-12): o log é append-only por desenho e o volume não é o problema (~10 usuários internos) — a retenção é. Fica junto da **P-02**, que já está aberta pela mesma razão para `audits` | Fecha junto com a P-02, ou antes de subir para produção |
```

- [ ] **Step 8: Pint e suíte**

Run:
```bash
cd backend && ./vendor/bin/pint app/Domains/Identity/Models/LoginLog.php app/Domains/Identity/Models/User.php database/migrations/2026_08_12_000001_create_login_logs_table.php
docker compose exec -T app php artisan test
```
Expected: Pint `passed`; suíte segue **538 passed, 5 skipped** — esta task não acrescenta caso.

- [ ] **Step 9: Commit**

```bash
git add backend/database/migrations/2026_08_12_000001_create_login_logs_table.php backend/app/Domains/Identity/Models/LoginLog.php backend/app/Domains/Identity/Models/User.php docs/der-fisico.md docs/pendencias.md
git commit -m "feat(identity): tabela login_logs e relacao latestLogin no User"
```

---

### Task 2: A captura no login

**Files:**
- Create: `backend/app/Domains/Identity/Actions/RecordLoginAction.php`
- Create: `backend/tests/Feature/Identity/LoginLogTest.php`
- Modify: `backend/app/Domains/Identity/Http/Controllers/AuthController.php:18-51`

**Interfaces:**
- Consumes: `User::loginLogs()` (Task 1).
- Produces: `RecordLoginAction::execute(User $user, ?string $ipAddress, ?string $userAgent): void`.

- [ ] **Step 1: Escrever os testes que reprovam**

Criar `backend/tests/Feature/Identity/LoginLogTest.php`:

```php
<?php

namespace Tests\Feature\Identity;

use App\Domains\Identity\Models\LoginLog;
use App\Domains\Identity\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

/**
 * A captura de login. Três casos de porta (grava / não grava) e um de
 * não-efeito colateral.
 *
 * O caso do usuário INATIVO é o que discrimina a ORDEM: o gate de `is_active`
 * roda depois do `attempt()`, então uma captura anterior a ele gravaria acesso
 * concedido a quem a API recusou com 422 — e nada reclamaria, porque a linha é
 * um insert válido.
 */
class LoginLogTest extends TestCase
{
    use RefreshDatabase;

    private function makeUser(bool $active = true): User
    {
        $factory = $active ? User::factory() : User::factory()->inactive();

        return $factory->create([
            'email'    => 'admin@lotus.cl',
            'password' => Hash::make('senha123'),
            'type'     => 'admin',
        ]);
    }

    public function test_login_ok_grava_uma_linha_com_ip_e_user_agent(): void
    {
        $user = $this->makeUser();

        $this->withHeaders(['User-Agent' => 'SondaAgent/1.0'])
            ->postJson('/api/login', ['email' => 'admin@lotus.cl', 'password' => 'senha123'])
            ->assertOk();

        $this->assertSame(1, LoginLog::count());

        $log = LoginLog::first();
        $this->assertSame($user->id, $log->user_id);
        $this->assertSame('SondaAgent/1.0', $log->user_agent);
        $this->assertNotNull($log->ip_address);
        $this->assertNotNull($log->created_at);
    }

    public function test_login_ok_nao_toca_o_usuario_nem_a_auditoria(): void
    {
        $user = $this->makeUser();
        $updatedAntes = $user->updated_at;
        $auditsAntes = DB::table('audits')->count();

        $this->postJson('/api/login', ['email' => 'admin@lotus.cl', 'password' => 'senha123'])
            ->assertOk();

        // O bloco PROMETE não escrever em `users` no login. Isso se afirma,
        // não se presume de "não escrevi lá": foi exatamente a escrita nesta
        // linha que o desenho anterior tinha, e ela produzia audit de diff
        // vazio a cada login.
        $this->assertEquals($updatedAntes, $user->fresh()->updated_at);
        $this->assertSame($auditsAntes, DB::table('audits')->count());
    }

    public function test_usuario_inativo_nao_grava_login(): void
    {
        $this->makeUser(active: false);

        $this->postJson('/api/login', ['email' => 'admin@lotus.cl', 'password' => 'senha123'])
            ->assertStatus(422);

        $this->assertSame(0, LoginLog::count());
    }

    public function test_senha_errada_nao_grava_login(): void
    {
        $this->makeUser();

        $this->postJson('/api/login', ['email' => 'admin@lotus.cl', 'password' => 'errada'])
            ->assertStatus(422);

        $this->assertSame(0, LoginLog::count());
    }
}
```

- [ ] **Step 2: Rodar e ver o vermelho**

Run: `docker compose exec -T app php artisan test --filter=LoginLogTest`
Expected: FAIL. Os dois casos de "grava" reprovam com `Failed asserting that 0 is identical to 1.`; os dois de "não grava" **passam** (não há captura ainda) — é o esperado, eles guardam a Task, não a criam.

Registrar o texto exato no ledger.

- [ ] **Step 3: Escrever a Action**

Criar `backend/app/Domains/Identity/Actions/RecordLoginAction.php`:

```php
<?php

namespace App\Domains\Identity\Actions;

use App\Domains\Identity\Models\User;

/**
 * Grava uma linha de `login_logs` por login BEM-SUCEDIDO.
 *
 * **Sem `DB::transaction`, e é exceção declarada à regra de Action da
 * `backend-ddd.md`:** é um insert só, não há duas escritas a atomizar.
 * Precedente de exceção escrita e justificada no código:
 * `BatchIssueCertificatesAction`.
 *
 * Recebe IP e user-agent como DADO, não a `Request`: a fronteira da Action é
 * domínio, não transporte — igual às 10 irmãs do domínio.
 *
 * Quem chama é responsável por chamar DEPOIS do gate de `is_active` do
 * `AuthController`. Ver `LoginLogTest::test_usuario_inativo_nao_grava_login`.
 */
class RecordLoginAction
{
    public function execute(User $user, ?string $ipAddress, ?string $userAgent): void
    {
        $user->loginLogs()->create([
            'ip_address' => $ipAddress,
            'user_agent' => $userAgent,
        ]);
    }
}
```

- [ ] **Step 4: Fiar no `AuthController`**

Em `backend/app/Domains/Identity/Http/Controllers/AuthController.php`:

Acrescentar o import `use App\Domains\Identity\Actions\RecordLoginAction;`.

Trocar a assinatura do `login` e acrescentar a chamada depois do gate de `is_active`:

```php
    public function login(Request $request, RecordLoginAction $recordLogin): SessionUserData
    {
```

…e, entre o bloco do `is_active` (que termina na linha 48) e o `return`:

```php
        // DEPOIS do gate de `is_active`, nunca antes: o `attempt()` já
        // sucedeu neste ponto, mas o acesso só está concedido depois do gate.
        // Capturar antes gravaria acesso de quem a API recusa com 422.
        $recordLogin->execute($user, $request->ip(), $request->userAgent());

        return SessionUserData::fromUser($user);
```

- [ ] **Step 5: Rodar e ver o verde**

Run: `docker compose exec -T app php artisan test --filter=LoginLogTest`
Expected: PASS, `4 passed`.

- [ ] **Step 6: Provar que o teste da ORDEM discrimina (obrigatório)**

Mover a linha `$recordLogin->execute(...)` para **antes** do bloco `if (! $user->is_active)`.

Run: `docker compose exec -T app php artisan test --filter=LoginLogTest`
Expected: FAIL em `test_usuario_inativo_nao_grava_login` com `Failed asserting that 1 is identical to 0.`

Registrar o texto exato no ledger e **desfazer o movimento**. Sem esta prova o caso não vale nada — ele passa tanto com a ordem certa quanto sem captura nenhuma.

- [ ] **Step 7: Suíte cheia e Pint**

Run:
```bash
docker compose exec -T app php artisan test
cd backend && ./vendor/bin/pint app/Domains/Identity/Actions/RecordLoginAction.php app/Domains/Identity/Http/Controllers/AuthController.php tests/Feature/Identity/LoginLogTest.php
```
Expected: `5 skipped, 542 passed` (538 + 4). Pint `passed`.

- [ ] **Step 8: Commit**

```bash
git add backend/app/Domains/Identity/Actions/RecordLoginAction.php backend/app/Domains/Identity/Http/Controllers/AuthController.php backend/tests/Feature/Identity/LoginLogTest.php
git commit -m "feat(identity): RecordLoginAction grava o login apos o gate de is_active"
```

---

### Task 3: Projeção nos dois DTOs

**Files:**
- Create: `backend/tests/Feature/Identity/LastLoginProjectionTest.php`
- Modify: `backend/app/Domains/Identity/Data/UserData.php`
- Modify: `backend/app/Domains/Identity/Data/RedatorData.php`
- Modify: `backend/app/Domains/Identity/Http/Controllers/UserController.php:34,48`
- Modify: `backend/app/Domains/Identity/Http/Controllers/RedatorController.php:33,45`
- Modify: `frontend/src/shared/types/generated.ts` (**gerado**)

**Interfaces:**
- Consumes: `User::latestLogin()` (Task 1); `RecordLoginAction` (Task 2).
- Produces: chave `last_login` (`?string`, ISO 8601 ou `null`) em `UserData` e `RedatorData`; tipo TS `last_login: string | null` em `generated.ts`.

- [ ] **Step 1: Escrever os testes que reprovam**

Criar `backend/tests/Feature/Identity/LastLoginProjectionTest.php`:

```php
<?php

namespace Tests\Feature\Identity;

use App\Domains\Identity\Models\Redator;
use App\Domains\Identity\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * A projeção do último acesso nos dois DTOs.
 *
 * O caso dos DOIS logins é o que discrimina `latestOfMany()` de um `hasOne`
 * qualquer: uma implementação que devolvesse a linha MAIS ANTIGA passaria em
 * todos os outros casos deste arquivo.
 */
class LastLoginProjectionTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_data_projeta_o_login_mais_recente_em_iso(): void
    {
        $this->actingAsAdmin();

        $user = User::factory()->create(['type' => 'admin', 'name' => 'Alvo Staff']);
        // `created_at` NÃO é `$fillable` de propósito (a data do acesso não se
        // forja por mass assignment), então backdatar em teste é `forceFill`.
        // Passar a chave no `create()` seria descartado em SILÊNCIO e as duas
        // linhas nasceriam com a mesma data — o caso pararia de discriminar.
        $user->loginLogs()->create([])
            ->forceFill(['created_at' => '2026-01-10 08:00:00'])->save();
        $recente = $user->loginLogs()->create([]);
        $recente->forceFill(['created_at' => '2026-08-12 14:32:00'])->save();
        $recente->refresh();

        $linha = collect($this->getJson('/api/users')->assertOk()->json())
            ->firstWhere('id', $user->id);

        $this->assertSame(
            $recente->created_at->toISOString(),
            $linha['last_login'],
        );
    }

    public function test_user_data_projeta_null_para_quem_nunca_acessou(): void
    {
        $this->actingAsAdmin();

        $user = User::factory()->create(['type' => 'admin', 'name' => 'Nunca Acessou']);

        $linha = collect($this->getJson('/api/users')->assertOk()->json())
            ->firstWhere('id', $user->id);

        $this->assertNull($linha['last_login']);
    }

    public function test_redator_data_projeta_o_login_do_usuario(): void
    {
        $this->actingAsAdmin();

        $user = User::factory()->redator()->create();
        $redator = Redator::create(['user_id' => $user->id]);
        $recente = $user->loginLogs()->create([]);
        $recente->forceFill(['created_at' => '2026-08-12 09:15:00'])->save();
        $recente->refresh();

        $linha = collect($this->getJson('/api/redatores')->assertOk()->json())
            ->firstWhere('id', $redator->id);

        $this->assertSame($recente->created_at->toISOString(), $linha['last_login']);
    }
}
```

- [ ] **Step 2: Rodar e ver o vermelho**

Run: `docker compose exec -T app php artisan test --filter=LastLoginProjectionTest`
Expected: FAIL com `Undefined array key "last_login"` nos três casos.

- [ ] **Step 3: Acrescentar a propriedade ao `UserData`**

Em `backend/app/Domains/Identity/Data/UserData.php`, depois de `$photo_url` (linha 45), dentro do construtor:

```php
        /**
         * Último acesso, DERIVADO de `login_logs` — não existe coluna
         * `users.last_login`. ISO 8601 ou `null` para quem nunca acessou.
         */
        #[Computed]
        public ?string $last_login = null,
```

E no `fromModel`, depois de `photo_url: $user->photo_path,`:

```php
            last_login: $user->latestLogin?->created_at?->toISOString(),
```

- [ ] **Step 4: Acrescentar a propriedade ao `RedatorData`**

Em `backend/app/Domains/Identity/Data/RedatorData.php`, depois de `$photo_url` (linha 44), dentro do construtor:

```php
        /** Último acesso do usuário-redator. Ver `UserData::$last_login`. */
        #[Computed]
        public ?string $last_login = null,
```

E no `fromModel`, depois de `photo_url: $redator->user->photo_path,`:

```php
            last_login: $redator->user->latestLogin?->created_at?->toISOString(),
```

- [ ] **Step 5: Acrescentar o eager-load nos dois controllers**

`UserController.php` linha 34 — trocar `->with('roles')` por:

```php
        return User::where('type', 'admin')->with(['roles', 'latestLogin'])->orderBy('name')->get()
```

`UserController.php` linha 48 — trocar `$user->load('roles')` por:

```php
        return UserData::fromModel($user->load(['roles', 'latestLogin']));
```

`RedatorController.php` linha 33 — trocar `Redator::with(['user', 'courses', 'documents'])` por:

```php
        return Redator::with(['user.latestLogin', 'courses', 'documents'])->get()
```

`RedatorController.php` linha 45 — trocar o `load` por:

```php
        return RedatorData::fromModel($redator->load(['user.latestLogin', 'courses', 'documents']));
```

> `user.latestLogin` carrega o `user` junto — não é preciso listar os dois.
>
> **Os caminhos de `store` e `update` (`UserController:41,55`, `RedatorController:40,50`) ficam sem eager-load de propósito.** O model volta da Action como instância única, que o `Builder::hydrate()` não marca com `preventsLazyLoading` (só marca com `count($items) > 1`), então a leitura resolve com uma query extra em vez de estourar. É uma escrita de registro único, não listagem — o custo é 1 query e a resposta fica correta.

- [ ] **Step 6: Rodar e ver o verde**

Run: `docker compose exec -T app php artisan test --filter=LastLoginProjectionTest`
Expected: PASS, `3 passed`.

- [ ] **Step 7: Provar que o caso dos dois logins discrimina (obrigatório)**

Em `User::latestLogin()`, trocar `->latestOfMany(['created_at', 'id'])` por `->oldestOfMany(['created_at', 'id'])`.

Run: `docker compose exec -T app php artisan test --filter=LastLoginProjectionTest`
Expected: FAIL em `test_user_data_projeta_o_login_mais_recente_em_iso`, com a data de `2026-01-10` no lugar da de `2026-08-12`.

Registrar o texto exato e **desfazer**.

- [ ] **Step 8: Regenerar os tipos**

Run: `docker compose exec -T app php artisan typescript:transform`
Expected: `generated.ts` ganha `last_login: string | null;` em `UserData` e em `RedatorData`.

Conferir que **só** isso mudou: `git diff --stat frontend/src/shared/types/generated.ts`.

- [ ] **Step 9: Conferir que a regeneração não quebrou consumidor**

Run: `cd frontend && pnpm build`
Expected: verde. O campo é **aditivo e só de leitura** — `StaffUserFormFields` é um `Pick<>` que não o inclui e `toPayload` lista as chaves à mão, então a classificação obrigatória do `useCrudForm` não é afetada. Se algo reprovar, corrigir **neste commit** (regra da `generated-types.md`).

- [ ] **Step 10: Suíte cheia e Pint**

Run:
```bash
docker compose exec -T app php artisan test
cd backend && ./vendor/bin/pint app/Domains/Identity/Data/UserData.php app/Domains/Identity/Data/RedatorData.php app/Domains/Identity/Http/Controllers/UserController.php app/Domains/Identity/Http/Controllers/RedatorController.php tests/Feature/Identity/LastLoginProjectionTest.php
```
Expected: `5 skipped, 545 passed` (542 + 3). Pint `passed`.

- [ ] **Step 11: Commit**

```bash
git add backend/app/Domains/Identity/Data/UserData.php backend/app/Domains/Identity/Data/RedatorData.php backend/app/Domains/Identity/Http/Controllers/UserController.php backend/app/Domains/Identity/Http/Controllers/RedatorController.php backend/tests/Feature/Identity/LastLoginProjectionTest.php frontend/src/shared/types/generated.ts
git commit -m "feat(identity): projeta last_login em UserData e RedatorData"
```

---

### Task 4: Guarda de N+1

> Task própria e não um passo da Task 3 **porque é o risco central declarado da spec** (§5.1), com precedente medido: o seam do B4 custou N+1 em quatro listagens em 2026-08-08. Um revisor pode reprovar esta guarda aprovando a projeção.

**Files:**
- Create: `backend/tests/Feature/Identity/LastLoginEagerLoadTest.php`

**Interfaces:**
- Consumes: eager-load da Task 3.

- [ ] **Step 1: Escrever a guarda**

Criar `backend/tests/Feature/Identity/LastLoginEagerLoadTest.php`:

```php
<?php

namespace Tests\Feature\Identity;

use App\Domains\Identity\Models\Redator;
use App\Domains\Identity\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Companheiro de RUNTIME da projeção de `last_login`.
 *
 * Concentrar a leitura numa relação troca duplicação visível por N+1 invisível
 * se a carga ficar para trás — medido em 2026-08-08 no seam do B4: 4 turmas
 * custaram 4 SELECTs extras em `users`, um por turma.
 *
 * `Model::preventLazyLoading()` só marca a instância quando ela vem de um
 * `hydrate()` com MAIS de uma linha (`Builder::hydrate()`, condicional a
 * `count($items) > 1`) — por isso cada cenário aqui materializa DUAS linhas, e
 * não uma.
 */
class LastLoginEagerLoadTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        Model::preventLazyLoading(false);

        parent::tearDown();
    }

    public function test_listagem_de_usuarios_nao_lazy_loada_o_ultimo_login(): void
    {
        $this->actingAsAdmin();

        foreach (['Staff Um', 'Staff Dois'] as $nome) {
            $user = User::factory()->create(['type' => 'admin', 'name' => $nome]);
            $user->loginLogs()->create([]);
        }

        Model::preventLazyLoading();

        $this->getJson('/api/users')->assertOk();
    }

    public function test_listagem_de_redatores_nao_lazy_loada_o_ultimo_login(): void
    {
        $this->actingAsAdmin();

        for ($i = 0; $i < 2; $i++) {
            $user = User::factory()->redator()->create();
            Redator::create(['user_id' => $user->id]);
            $user->loginLogs()->create([]);
        }

        Model::preventLazyLoading();

        $this->getJson('/api/redatores')->assertOk()->assertJsonCount(2);
    }
}
```

- [ ] **Step 2: Rodar e ver o verde**

Run: `docker compose exec -T app php artisan test --filter=LastLoginEagerLoadTest`
Expected: PASS, `2 passed`.

- [ ] **Step 3: Provar que a guarda discrimina (obrigatório — é o ponto da task)**

Desfazer o eager-load: em `UserController.php`, voltar `->with(['roles', 'latestLogin'])` para `->with('roles')`; em `RedatorController.php`, voltar `'user.latestLogin'` para `'user'`.

Run: `docker compose exec -T app php artisan test --filter=LastLoginEagerLoadTest`
Expected: FAIL nos dois casos com `Illuminate\Database\LazyLoadingViolationException: Attempted to lazy load [latestLogin] on model [App\Domains\Identity\Models\User]`.

Registrar o texto exato e **desfazer**.

> Esta é a prova de que a D4 da spec entregou o que prometeu: com `withMax` no lugar da relação, este mesmo mutante ficaria **verde** e a tela mentiria em silêncio.

- [ ] **Step 4: Suíte cheia e Pint**

Run:
```bash
docker compose exec -T app php artisan test
cd backend && ./vendor/bin/pint tests/Feature/Identity/LastLoginEagerLoadTest.php
```
Expected: `5 skipped, 547 passed` (545 + 2). Pint `passed`.

- [ ] **Step 5: Commit**

```bash
git add backend/tests/Feature/Identity/LastLoginEagerLoadTest.php
git commit -m "test(identity): guarda de N+1 do latestLogin nas duas listagens"
```

---

### Task 5: Frontend

**Files:**
- Create: `frontend/src/shared/lib/datetime.test.ts`
- Modify: `frontend/src/shared/lib/datetime.ts`
- Modify: `frontend/src/features/identity/components/Admin/UsersTable.tsx:56`
- Modify: `frontend/src/features/identity/components/Redator/RedatoresTable.tsx`
- Modify: `frontend/src/shared/config/locales/{pt-BR,es-CL,en}.json`

**Interfaces:**
- Consumes: `last_login: string | null` de `generated.ts` (Task 3).
- Produces: `formatDateTime(date: Date): string` exportado de `@shared/lib`.

- [ ] **Step 1: Escrever o teste que reprova**

Criar `frontend/src/shared/lib/datetime.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { formatDate, formatTime, formatDateTime } from './datetime'

describe('formatDateTime', () => {
  const d = new Date(2026, 7, 12, 14, 32)

  it('compõe data e hora do idioma ativo, nesta ordem', () => {
    expect(formatDateTime(d)).toBe(`${formatDate(d)} ${formatTime(d)}`)
  })

  it('inclui a hora — não é formatDate disfarçado', () => {
    expect(formatDateTime(d)).not.toBe(formatDate(d))
    expect(formatDateTime(d)).toContain(formatTime(d))
  })

  it('preserva a data de um horário de meia-noite', () => {
    const meiaNoite = new Date(2026, 7, 12, 0, 0)
    expect(formatDateTime(meiaNoite)).toContain(formatDate(meiaNoite))
  })

  it('formata ISO vindo do backend sem perder o dia', () => {
    const doBackend = new Date('2026-08-12T14:32:00.000Z')
    expect(formatDateTime(doBackend)).toBe(`${formatDate(doBackend)} ${formatTime(doBackend)}`)
  })
})
```

> As asserções comparam contra os próprios `formatDate`/`formatTime` **de propósito**: fixar a string `"12-08-2026 14:32"` amarraria o teste ao locale ativo e ao fuso do runner, e o arquivo existe justamente porque o locale é dinâmico (`activeLocale()`).

- [ ] **Step 2: Rodar e ver o vermelho**

Run: `cd frontend && pnpm test datetime`
Expected: FAIL. `formatDateTime is not a function` (ou erro de import).

- [ ] **Step 3: Escrever o formatter**

Em `frontend/src/shared/lib/datetime.ts`, depois de `formatDate`:

```ts
/**
 * Data + hora no formato curto do idioma ativo ("12-08-2026 14:32" em es-CL).
 * Usado no "último acesso" das tabelas de Usuários e Redatores.
 *
 * Compõe os dois formatters acima em vez de chamar `Intl` de novo: o locale
 * ativo já é resolvido por eles, num lugar só.
 */
export function formatDateTime(date: Date): string {
  return `${formatDate(date)} ${formatTime(date)}`
}
```

**O barrel não muda:** `frontend/src/shared/lib/index.ts:1` já é `export * from './datetime'` (conferido em 2026-08-12), então o símbolo novo sai por `@shared/lib` sem uma linha de edição.

- [ ] **Step 4: Rodar e ver o verde**

Run: `cd frontend && pnpm test datetime`
Expected: PASS, `4 passed`.

- [ ] **Step 5: Acrescentar a chave nos três locales**

Em cada um de `frontend/src/shared/config/locales/es-CL.json`, `pt-BR.json` e `en.json`, dentro do bloco `"common"`:

- `es-CL.json`: `"lastLogin": "Último acceso",`
- `pt-BR.json`: `"lastLogin": "Último acesso",`
- `en.json`: `"lastLogin": "Last login",`

> Chave em `common` e não em `admin`/`redator`: as duas tabelas vivem em namespaces diferentes e o rótulo é o mesmo. `common.rut` já é o precedente entre exatamente essas duas telas.

- [ ] **Step 6: Coluna na `UsersTable`**

Em `frontend/src/features/identity/components/Admin/UsersTable.tsx`, entre a coluna de estado (termina na linha 56) e a de ações, acrescentar:

```tsx
      <AppColumn
        field="last_login"
        header={t('common.lastLogin')}
        sortable
        body={(u: UserData) => (u.last_login ? formatDateTime(new Date(u.last_login)) : '—')}
      />
```

`UsersTable.tsx` **não tem** import de `@shared/lib` hoje — acrescentar a linha nova depois do import de `@shared/types/generated` (linha 5):

```tsx
import { formatDateTime } from '@shared/lib'
```

- [ ] **Step 7: Coluna na `RedatoresTable`**

Em `frontend/src/features/identity/components/Redator/RedatoresTable.tsx`, entre a coluna de idoneidade (`redator.suitability`, começa na linha 56) e a de ações, acrescentar a **mesma** coluna, com o tipo do item daquela tabela:

```tsx
      <AppColumn
        field="last_login"
        header={t('common.lastLogin')}
        sortable
        body={(r: RedatorData) => (r.last_login ? formatDateTime(new Date(r.last_login)) : '—')}
      />
```

`RedatoresTable.tsx:6` **já importa** de `@shared/lib` — acrescentar o símbolo à linha existente, sem criar import novo:

```tsx
import { idoneidade, IDONEIDADE_SEVERITY, formatDateTime } from '@shared/lib'
```

- [ ] **Step 8: Gate do frontend**

Run: `cd frontend && pnpm test && pnpm lint && pnpm build`
Expected: `Test Files 17 passed (17)` / `Tests 86 passed (86)`; lint limpo; build verde.

- [ ] **Step 9: Conferir a paridade dos três locales**

Run:
```bash
cd frontend && node -e "
const l=['es-CL','pt-BR','en'].map(n=>[n,require('./src/shared/config/locales/'+n+'.json')]);
for (const [n,j] of l) console.log(n, 'common.lastLogin =', JSON.stringify(j.common.lastLogin));
"
```
Expected: as três chaves presentes e preenchidas, nenhuma `undefined`.

- [ ] **Step 10: Commit**

```bash
git add frontend/src/shared/lib/datetime.ts frontend/src/shared/lib/datetime.test.ts frontend/src/features/identity/components/Admin/UsersTable.tsx frontend/src/features/identity/components/Redator/RedatoresTable.tsx frontend/src/shared/config/locales/es-CL.json frontend/src/shared/config/locales/pt-BR.json frontend/src/shared/config/locales/en.json
git commit -m "feat(identity): coluna de ultimo acesso nas tabelas de usuarios e redatores"
```

---

### Task 6: Gate

**Files:** nenhum arquivo de produção. Task de verificação; commit só se algo precisar de ajuste.

- [ ] **Step 1: Suíte completa**

Run: `docker compose exec -T app php artisan test`
Expected: **547 passed, 5 skipped**. Registrar o total de assertions **medido** (não projetado).

- [ ] **Step 2: Frontend completo**

Run: `cd frontend && pnpm test && pnpm lint && pnpm build`
Expected: **17 arquivos / 86 testes**; lint limpo; build verde.

- [ ] **Step 3: Pint na lista fechada do bloco**

Run:
```bash
cd backend && git diff --name-only main...HEAD -- '*.php' | sed 's|^backend/||'
```
Copiar a lista **à mão** para o comando seguinte. **Nunca** por substituição de comando — lista vazia vira Pint sem argumento, que reformata o repositório inteiro.

Run: `cd backend && ./vendor/bin/pint --test <arquivos copiados>`
Expected: `{"tool":"pint","result":"passed"}`.

- [ ] **Step 4: `generated.ts` gerado, não editado**

Run: `docker compose exec -T app php artisan typescript:transform && git status --porcelain frontend/src/shared/types/generated.ts`
Expected: saída vazia — regenerar não produz diff.

- [ ] **Step 5: Nenhuma sonda sobrevivente**

Run:
```bash
git status --porcelain
git diff main...HEAD -- backend/app/ | grep -nE 'SONDA|dd\(|dump\(|ray\(' || echo "sem sonda"
git diff main...HEAD --stat -- frontend/src/features/commercial/ frontend/src/features/catalog/ frontend/src/features/operation/ frontend/src/features/certification/
```
Expected: `status` vazio; `sem sonda`; diff das outras features **vazio** (o bloco só toca `identity` e `shared`).

- [ ] **Step 6: Leis do §5 conferidas**

Run:
```bash
grep -rn "class .*Repository" backend/app/ || echo "sem Repository"
grep -rn "CREATE TRIGGER\|DB::unprepared" backend/database/ backend/app/ || echo "sem trigger"
grep -rn "from 'primereact" frontend/src/features/ || echo "sem PrimeReact direto em feature"
```
Expected: as três negativas.

- [ ] **Step 7: E2E contra a API real (o DoD do bloco — lição 12)**

Sem `migrate:fresh`. Contra o banco de dev, com sessão Sanctum por cookie + CSRF:

1. `GET /sanctum/csrf-cookie` → `POST /api/login` com um usuário staff real.
2. SQL cru: `SELECT id, user_id, ip_address, LEFT(user_agent,40), created_at FROM login_logs ORDER BY id DESC LIMIT 3;` → a linha do login recém-feito, com IP e user-agent preenchidos.
3. SQL cru: `updated_at` daquele `users.id` **igual** ao valor de antes do login, e `SELECT COUNT(*) FROM audits` **igual** ao de antes.
4. `GET /api/users` → o usuário logado com `last_login` preenchido em ISO; algum outro com `null`.
5. `GET /api/redatores` → `last_login` presente na forma esperada.
6. Segundo login do mesmo usuário → **segunda** linha em `login_logs`, e `GET /api/users` passa a projetar a data nova.

Registrar cada resultado. **Suíte verde não fecha este bloco** — o DoD é comportamento na API real.

- [ ] **Step 8: Conferir o banco de dev intocado no que importa**

Run:
```bash
docker compose exec -T mysql mysql -uroot -psecret lotus -e "SELECT codigo, JSON_EXTRACT(snapshot,'$.aluno.name') AS aluno FROM certificates WHERE codigo='LOT-2026-1001';"
```
Expected: o `LOT-2026-1001` segue com `snapshot.aluno.name` vazio — corrompido de propósito, esperando o checkpoint visual do João.

- [ ] **Step 9: Registrar o que o gate NÃO provou**

Escrever, sem maquiagem, no relatório de fechamento:
- Nenhuma tela foi vista renderizada se o browser seguir indisponível no WSL — a prova é API real, suíte, lint e build. O checkpoint visual das duas colunas fica com o João.
- O bloco **não** registra tentativas de login falhas nem logout (D2 da spec, recusa registrada).
- A retenção de `ip_address`/`user_agent` fica aberta na pendência criada na Task 1.

---

## Handoff de execução

**`executor: claude`**

Critério: o bloco toca **auth** (`AuthController`, caminho de sessão Sanctum) e **schema**, e as Tasks 2, 3 e 4 fecham por **prova de mutação** — o teste tem de ser visto reprovar contra o código antigo, e a leitura do vermelho (ordem de captura, `oldestOfMany`, `LazyLoadingViolationException`) é julgamento, não passo mecânico. A D4 da spec inteira existe porque um dos dois mecanismos falha em silêncio; um executor que só verifique "verde no fim" não distingue os dois.

Não há `paths_autorizados` a declarar — nada é delegado ao Codex nesta execução.

## Desvios do plano

*(preenchido durante a execução — cada desvio com a medição que o motivou)*

Nenhum até aqui.
