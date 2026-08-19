# Ativação de acesso do redator — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** um redator cadastrado pelo admin recebe por e-mail um link, define a própria senha, autentica com a role `redator` — e o admin pode tirar esse acesso depois.

**Architecture:** um token por e-mail serve dois fluxos com TTLs diferentes, cada um com sua tabela e seu broker: convite (`invitation_tokens`, 7 dias) e recuperação (`password_reset_tokens`, 60 min). O cadastro passa a criar o redator ativo, com role, e a disparar o convite depois do commit. Duas telas públicas no SPA consomem os endpoints; o admin liga/desliga o acesso no formulário do redator e pode reenviar o convite.

**Tech Stack:** Laravel 13 (broker `Illuminate\Auth\Passwords`, Notifications, Sanctum sessão), MySQL 8, Mailpit (dev), React 19 + TS, TanStack Query, PrimeReact via `shared/ui`, vitest.

## Global Constraints

- Backend roda **no container**: `docker compose exec -T app php artisan test --filter=Nome`. O host WSL não tem mbstring.
- Pint roda **no host**, de dentro de `backend/`, **sempre com paths exatos**: `./vendor/bin/pint app/Domains/Identity/...`. Nunca sem argumento.
- `frontend/src/shared/types/generated.ts` **não se edita à mão** (lei §5.3) — corrige-se o DTO e roda `docker compose exec -T app php artisan typescript:transform`.
- Features não importam `primereact` direto (só via `@shared/ui`) nem outra feature, nem para tipo (lei §5.6).
- Erro sobe pelo handler global RFC 7807; nunca `abort(422)` (lei §5.4/ADR-03).
- Senha: `min:8` + `confirmed`. É a régua vigente em `ProfilePasswordData.php:35` e `UserData.php:58`. **Política de senha nova não se inventa neste bloco.**
- i18n: 3 locales no frontend (`src/shared/config/locales/{es-CL,pt-BR,en}.json`), 4 no backend (`lang/{es_CL,es,pt_BR,en}`).
- RN-01 (lei §5.5): **cliente e aluno continuam `is_active=false`**. Só o redator muda de default.
- Um commit por task, Conventional Commits.

## Correção de desenho feita no planejamento (a spec foi emendada)

A spec dizia "dois brokers sobre a **mesma** tabela". **Não funciona, e o motivo é mecânico:** o `expire` é aplicado na *validação*, pelo broker que valida — com uma tabela só, o endpoint de reset não tem como saber se aquele token nasceu convite (7 dias) ou recuperação (60 min), e validar pelo broker errado dá ao token de recuperação a janela de 7 dias. Pior: a tabela tem **uma linha por e-mail**, então pedir recuperação apagaria o convite pendente do mesmo usuário.

**Desenho corrigido:** duas tabelas, dois brokers, dois endpoints. `POST /api/invitation/accept` valida pelo broker `invites`; `POST /api/password/reset` valida pelo broker `users`. A tela pública é a mesma; o link do e-mail carrega `?flow=invite|reset` e o hook escolhe o endpoint.

---

### Task 1: Tabela e broker do convite

**Files:**
- Create: `backend/database/migrations/2026_08_18_200000_create_invitation_tokens_table.php`
- Modify: `backend/config/auth.php:96-103`
- Test: `backend/tests/Feature/Identity/InvitationBrokerTest.php`

**Interfaces:**
- Produces: broker `invites` resolvível por `Password::broker('invites')`, sobre a tabela `invitation_tokens`, `expire` 10080 minutos.

- [ ] **Step 1: Write the failing test**

```php
<?php

namespace Tests\Feature\Identity;

use App\Domains\Identity\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Password;
use Tests\TestCase;

class InvitationBrokerTest extends TestCase
{
    use RefreshDatabase;

    public function test_o_broker_de_convite_escreve_na_tabela_propria(): void
    {
        $user = User::factory()->create(['type' => 'redator', 'email' => 'redator@lotus.cl']);

        $token = Password::broker('invites')->createToken($user);

        $this->assertNotEmpty($token);
        $this->assertDatabaseHas('invitation_tokens', ['email' => 'redator@lotus.cl']);
        // A tabela de recuperação NÃO é tocada: um convite pendente não pode
        // ser apagado por um pedido de "esqueci minha senha", e vice-versa.
        $this->assertDatabaseCount('password_reset_tokens', 0);
    }

    public function test_convite_vale_sete_dias_e_recuperacao_uma_hora(): void
    {
        $this->assertSame(10080, config('auth.passwords.invites.expire'));
        $this->assertSame(60, config('auth.passwords.users.expire'));
        $this->assertSame('invitation_tokens', config('auth.passwords.invites.table'));
    }

    public function test_token_de_convite_expirado_e_recusado(): void
    {
        $user = User::factory()->create(['type' => 'redator', 'email' => 'velho@lotus.cl']);
        $token = Password::broker('invites')->createToken($user);

        DB::table('invitation_tokens')
            ->where('email', 'velho@lotus.cl')
            ->update(['created_at' => now()->subDays(8)]);

        $status = Password::broker('invites')->reset(
            ['email' => 'velho@lotus.cl', 'password' => 'senhaNova123', 'password_confirmation' => 'senhaNova123', 'token' => $token],
            fn () => null,
        );

        $this->assertSame(Password::INVALID_TOKEN, $status);
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `docker compose exec -T app php artisan test --filter=InvitationBrokerTest`
Expected: FAIL — `Password store [invites] is not defined.`

- [ ] **Step 3: Create the migration**

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tabela própria do convite de primeiro acesso, separada de
 * `password_reset_tokens` de propósito: o TTL é aplicado na validação, pelo
 * broker que valida, e com uma tabela só não há como distinguir um token de
 * 7 dias de um de 60 minutos. Além disso a chave é o e-mail — uma linha por
 * usuário —, então compartilhar a tabela faria um "esqueci minha senha"
 * apagar o convite pendente do mesmo redator.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('invitation_tokens', function (Blueprint $table) {
            $table->string('email')->primary();
            $table->string('token');
            $table->timestamp('created_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('invitation_tokens');
    }
};
```

- [ ] **Step 4: Add the broker**

Em `backend/config/auth.php`, dentro de `'passwords' => [`, depois do bloco `'users'`:

```php
        // Convite de primeiro acesso. Tabela própria e janela longa: o admin
        // cadastra e o redator costuma abrir o e-mail no dia seguinte. A
        // recuperação segue com os 60 minutos padrão, que é janela de ataque.
        'invites' => [
            'provider' => 'users',
            'table' => 'invitation_tokens',
            'expire' => 10080,
            'throttle' => 60,
        ],
```

- [ ] **Step 5: Run test to verify it passes**

Run: `docker compose exec -T app php artisan test --filter=InvitationBrokerTest`
Expected: PASS (3 testes)

- [ ] **Step 6: Format and commit**

```bash
cd backend && ./vendor/bin/pint config/auth.php database/migrations/2026_08_18_200000_create_invitation_tokens_table.php tests/Feature/Identity/InvitationBrokerTest.php
cd .. && git add backend/config/auth.php backend/database/migrations/2026_08_18_200000_create_invitation_tokens_table.php backend/tests/Feature/Identity/InvitationBrokerTest.php
git commit -m "feat(identity): broker e tabela do convite de primeiro acesso"
```

---

### Task 2: `is_active` deixa de ser `false` fixo

**Files:**
- Modify: `backend/app/Domains/Identity/Services/UserProvisioner.php:26-41`
- Test: `backend/tests/Feature/Identity/UserProvisionerAccessDefaultTest.php`

**Interfaces:**
- Produces: `UserProvisioner::provision()` grava `is_active=true` para `type=redator` e `false` para os demais atores. Assinatura inalterada.

- [ ] **Step 1: Write the failing test**

```php
<?php

namespace Tests\Feature\Identity;

use App\Domains\Identity\Services\UserProvisioner;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UserProvisionerAccessDefaultTest extends TestCase
{
    use RefreshDatabase;

    public function test_redator_nasce_ativo(): void
    {
        $user = app(UserProvisioner::class)->provision(
            type: 'redator', name: 'Ana', rut: '11.111.111-1', email: 'ana@lotus.cl',
        );

        $this->assertTrue($user->is_active);
    }

    public function test_cliente_e_aluno_seguem_inativos(): void
    {
        $cliente = app(UserProvisioner::class)->provision(
            type: 'cliente', name: 'Empresa', rut: '22.222.222-2', email: 'empresa@lotus.cl',
        );
        $aluno = app(UserProvisioner::class)->provision(
            type: 'aluno', name: 'Aluno', rut: '33.333.333-3', email: 'aluno@lotus.cl',
        );

        $this->assertFalse($cliente->is_active);
        $this->assertFalse($aluno->is_active);
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `docker compose exec -T app php artisan test --filter=UserProvisionerAccessDefaultTest`
Expected: FAIL no primeiro teste — `Failed asserting that false is true.`

- [ ] **Step 3: Implement**

Em `UserProvisioner::provision()`, troque `'is_active' => false,` por `'is_active' => $this->accessDefaultFor($type),` e acrescente ao final da classe:

```php
    /**
     * O default de acesso depende do ator (RN-01). Redator autentica, então
     * nasce ativo e o gate real dele passa a ser SABER a senha — que só chega
     * pelo convite. Cliente e aluno não logam e continuam inativos.
     */
    private function accessDefaultFor(string $type): bool
    {
        return $type === 'redator';
    }
```

Atualize o docblock da classe: a frase "cria o User inativo com senha placeholder" passa a "cria o User com senha placeholder e o acesso que o tipo permite (RN-01)".

- [ ] **Step 4: Run test to verify it passes**

Run: `docker compose exec -T app php artisan test --filter=UserProvisionerAccessDefaultTest`
Expected: PASS (2 testes)

- [ ] **Step 5: Run the Identity suite for regression**

Run: `docker compose exec -T app php artisan test --filter=Identity`
Expected: PASS. Um teste que afirmava redator inativo é **esperado** falhar aqui — corrija-o para a regra nova, não reverta a implementação.

- [ ] **Step 6: Format and commit**

```bash
cd backend && ./vendor/bin/pint app/Domains/Identity/Services/UserProvisioner.php tests/Feature/Identity/UserProvisionerAccessDefaultTest.php
cd .. && git add backend/app/Domains/Identity/Services/UserProvisioner.php backend/tests/Feature/Identity/UserProvisionerAccessDefaultTest.php
git commit -m "feat(identity): redator nasce ativo, cliente e aluno seguem inativos"
```

---

### Task 3: Role `redator` atribuída no cadastro

**Files:**
- Modify: `backend/app/Domains/Identity/Actions/CreateRedatorAction.php:50-60`
- Test: `backend/tests/Feature/Identity/RedatorRoleOnCreateTest.php`

**Interfaces:**
- Consumes: `UserProvisioner::provision()` da Task 2.
- Produces: usuário-redator com role `redator` (Spatie) ao sair de `CreateRedatorAction::execute()`.

- [ ] **Step 1: Write the failing test**

```php
<?php

namespace Tests\Feature\Identity;

use App\Domains\Identity\Actions\CreateRedatorAction;
use App\Domains\Identity\Data\RedatorData;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RedatorRoleOnCreateTest extends TestCase
{
    use RefreshDatabase;

    public function test_o_cadastro_atribui_a_role_redator(): void
    {
        $this->seed(RolePermissionSeeder::class);

        $redator = app(CreateRedatorAction::class)->execute(RedatorData::from([
            'name' => 'Ana Reyes',
            'rut' => '11.111.111-1',
            'email' => 'ana@lotus.cl',
            'course_ids' => [],
        ]));

        $user = $redator->user->refresh();

        $this->assertTrue($user->hasRole('redator'));
        // RF-ROL-05: a role vem do tipo, e as permissões dela são as do seeder.
        $this->assertTrue($user->can('operation.turma.view'));
        $this->assertFalse($user->can('identity.user.create'));
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `docker compose exec -T app php artisan test --filter=RedatorRoleOnCreateTest`
Expected: FAIL — `Failed asserting that false is true.` (nenhuma role é atribuída hoje)

- [ ] **Step 3: Implement**

Em `CreateRedatorAction::execute()`, logo depois do `$user = $this->users->provision(...)`, dentro da transação:

```php
                // RF-ROL-05: a role corresponde ao tipo e é associada no
                // cadastro. Sem isto o redator autentica e não enxerga nada —
                // o gate de todo módulo é permissão, não `type`.
                $user->syncRoles(['redator']);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `docker compose exec -T app php artisan test --filter=RedatorRoleOnCreateTest`
Expected: PASS

- [ ] **Step 5: Format and commit**

```bash
cd backend && ./vendor/bin/pint app/Domains/Identity/Actions/CreateRedatorAction.php tests/Feature/Identity/RedatorRoleOnCreateTest.php
cd .. && git add backend/app/Domains/Identity/Actions/CreateRedatorAction.php backend/tests/Feature/Identity/RedatorRoleOnCreateTest.php
git commit -m "feat(identity): role redator atribuida no cadastro (RF-ROL-05)"
```

---

### Task 4: As duas notificações e o texto em 4 locales

**Files:**
- Create: `backend/app/Domains/Identity/Notifications/RedatorAccessInvitation.php`
- Create: `backend/app/Domains/Identity/Notifications/PasswordResetLink.php`
- Create: `backend/lang/es_CL/identity.php`, `backend/lang/es/identity.php`, `backend/lang/pt_BR/identity.php`, `backend/lang/en/identity.php`
- Modify: `backend/app/Domains/Identity/Models/User.php` (acrescenta `sendPasswordResetNotification`)
- Test: `backend/tests/Feature/Identity/AccessEmailContentTest.php`

**Interfaces:**
- Produces: `RedatorAccessInvitation(string $token)` e `PasswordResetLink(string $token)`, ambas `via: ['mail']`, com URL `{app.frontend_url}/definir-clave/{token}?email=...&flow=invite|reset`.

- [ ] **Step 1: Write the failing test**

```php
<?php

namespace Tests\Feature\Identity;

use App\Domains\Identity\Models\User;
use App\Domains\Identity\Notifications\PasswordResetLink;
use App\Domains\Identity\Notifications\RedatorAccessInvitation;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AccessEmailContentTest extends TestCase
{
    use RefreshDatabase;

    public function test_o_convite_aponta_para_a_tela_publica_com_flow_invite(): void
    {
        $user = User::factory()->create(['email' => 'ana@lotus.cl']);

        $mail = (new RedatorAccessInvitation('tok-123'))->toMail($user);
        $url = $mail->actionUrl;

        $this->assertStringContainsString(rtrim(config('app.frontend_url'), '/').'/definir-clave/tok-123', $url);
        $this->assertStringContainsString('flow=invite', $url);
        $this->assertStringContainsString('email=ana%40lotus.cl', $url);
    }

    public function test_a_recuperacao_usa_flow_reset(): void
    {
        $user = User::factory()->create(['email' => 'ana@lotus.cl']);

        $this->assertStringContainsString('flow=reset', (new PasswordResetLink('tok-456'))->toMail($user)->actionUrl);
    }

    public function test_o_texto_sai_de_chave_traduzida_e_nao_de_literal(): void
    {
        // Todas as 4 locales respondem: nenhuma chave órfã e nenhum literal
        // dentro da Notification (a D-36 nasceu exatamente desse padrão).
        foreach (['es_CL', 'es', 'pt_BR', 'en'] as $locale) {
            $this->assertIsString(__('identity.invitation.subject', [], $locale));
            $this->assertStringNotContainsString('identity.invitation', __('identity.invitation.subject', [], $locale));
        }
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `docker compose exec -T app php artisan test --filter=AccessEmailContentTest`
Expected: FAIL — `Class "App\Domains\Identity\Notifications\RedatorAccessInvitation" not found`

- [ ] **Step 3: Write the notifications**

`RedatorAccessInvitation.php`:

```php
<?php

namespace App\Domains\Identity\Notifications;

use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Convite de primeiro acesso do redator. O destinatário não tem sessão nem
 * `Accept-Language`, então o idioma não pode vir da request: quem envia fixa
 * `es_CL` com `->locale()`, e o texto sai de `lang/*/identity.php`.
 */
class RedatorAccessInvitation extends Notification
{
    public function __construct(private string $token) {}

    /** @return array<int,string> */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $url = sprintf(
            '%s/definir-clave/%s?email=%s&flow=invite',
            rtrim((string) config('app.frontend_url'), '/'),
            $this->token,
            urlencode($notifiable->email),
        );

        return (new MailMessage)
            ->subject(__('identity.invitation.subject'))
            ->greeting(__('identity.invitation.greeting', ['name' => $notifiable->name]))
            ->line(__('identity.invitation.line'))
            ->action(__('identity.invitation.action'), $url)
            ->line(__('identity.invitation.expiry'));
    }
}
```

`PasswordResetLink.php`:

```php
<?php

namespace App\Domains\Identity\Notifications;

use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Link de recuperação de senha. Mesma tela de destino do convite, `flow`
 * diferente: o endpoint que valida o token é outro, porque o TTL é outro.
 */
class PasswordResetLink extends Notification
{
    public function __construct(private string $token) {}

    /** @return array<int,string> */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $url = sprintf(
            '%s/definir-clave/%s?email=%s&flow=reset',
            rtrim((string) config('app.frontend_url'), '/'),
            $this->token,
            urlencode($notifiable->email),
        );

        return (new MailMessage)
            ->subject(__('identity.reset.subject'))
            ->greeting(__('identity.reset.greeting', ['name' => $notifiable->name]))
            ->line(__('identity.reset.line'))
            ->action(__('identity.reset.action'), $url)
            ->line(__('identity.reset.expiry'));
    }
}
```

- [ ] **Step 4: Write the four lang files**

`backend/lang/es_CL/identity.php`:

```php
<?php

return [
    'invitation' => [
        'subject' => 'Acceso a la plataforma Lotus',
        'greeting' => 'Hola :name,',
        'line' => 'Tu cuenta de relator fue creada. Define tu clave para entrar.',
        'action' => 'Definir mi clave',
        'expiry' => 'Este enlace vence en 7 días. Si vence, puedes pedir uno nuevo en "Olvidé mi clave".',
    ],
    'reset' => [
        'subject' => 'Recuperación de clave — Lotus',
        'greeting' => 'Hola :name,',
        'line' => 'Recibimos una solicitud para cambiar tu clave.',
        'action' => 'Cambiar mi clave',
        'expiry' => 'Este enlace vence en 60 minutos. Si no fuiste tú, ignora este correo.',
    ],
];
```

`lang/es/identity.php` recebe o mesmo conteúdo. `lang/pt_BR/identity.php` e `lang/en/identity.php` recebem a tradução equivalente, com as **mesmas chaves** — a paridade é o que o terceiro teste cobre.

- [ ] **Step 5: Hook the reset notification on the model**

Em `User.php`, acrescente:

```php
    /**
     * O broker chama este método no `sendResetLink`. Sobrescrito para usar a
     * notificação do domínio (texto traduzido, URL do SPA) em vez da default
     * do framework, que aponta para uma rota web inexistente aqui.
     */
    public function sendPasswordResetNotification($token): void
    {
        $this->notify((new PasswordResetLink($token))->locale('es_CL'));
    }
```

- [ ] **Step 6: Run test to verify it passes**

Run: `docker compose exec -T app php artisan test --filter=AccessEmailContentTest`
Expected: PASS (3 testes)

- [ ] **Step 7: Format and commit**

```bash
cd backend && ./vendor/bin/pint app/Domains/Identity/Notifications app/Domains/Identity/Models/User.php lang/es_CL/identity.php lang/es/identity.php lang/pt_BR/identity.php lang/en/identity.php tests/Feature/Identity/AccessEmailContentTest.php
cd .. && git add backend/app/Domains/Identity/Notifications backend/app/Domains/Identity/Models/User.php backend/lang backend/tests/Feature/Identity/AccessEmailContentTest.php
git commit -m "feat(identity): notificacoes de convite e recuperacao, texto em 4 locales"
```

---

### Task 5: O convite dispara no cadastro

**Files:**
- Create: `backend/app/Domains/Identity/Actions/SendRedatorAccessInvitationAction.php`
- Modify: `backend/app/Domains/Identity/Actions/CreateRedatorAction.php`
- Test: `backend/tests/Feature/Identity/RedatorInvitationDispatchTest.php`

**Interfaces:**
- Consumes: broker `invites` (Task 1), `RedatorAccessInvitation` (Task 4).
- Produces: `SendRedatorAccessInvitationAction::execute(User $user): void` — cria o token e notifica. É a fonte única do disparo, usada pelo cadastro e pelo reenvio (Task 8).

- [ ] **Step 1: Write the failing test**

```php
<?php

namespace Tests\Feature\Identity;

use App\Domains\Identity\Actions\CreateRedatorAction;
use App\Domains\Identity\Data\RedatorData;
use App\Domains\Identity\Notifications\RedatorAccessInvitation;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class RedatorInvitationDispatchTest extends TestCase
{
    use RefreshDatabase;

    public function test_cadastrar_redator_dispara_o_convite(): void
    {
        Notification::fake();
        $this->seed(RolePermissionSeeder::class);

        $redator = app(CreateRedatorAction::class)->execute(RedatorData::from([
            'name' => 'Ana Reyes', 'rut' => '11.111.111-1', 'email' => 'ana@lotus.cl', 'course_ids' => [],
        ]));

        Notification::assertSentTo($redator->user, RedatorAccessInvitation::class);
        $this->assertDatabaseHas('invitation_tokens', ['email' => 'ana@lotus.cl']);
    }

    public function test_falha_de_email_nao_desfaz_o_cadastro(): void
    {
        $this->seed(RolePermissionSeeder::class);
        Notification::shouldReceive('send')->andThrow(new \RuntimeException('SMTP caiu'));

        $redator = app(CreateRedatorAction::class)->execute(RedatorData::from([
            'name' => 'Ana Reyes', 'rut' => '11.111.111-1', 'email' => 'ana@lotus.cl', 'course_ids' => [],
        ]));

        // O cadastro sobrevive: o admin reenvia o convite pela tela (Task 8).
        $this->assertDatabaseHas('users', ['email' => 'ana@lotus.cl', 'is_active' => true]);
        $this->assertNotNull($redator->id);
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `docker compose exec -T app php artisan test --filter=RedatorInvitationDispatchTest`
Expected: FAIL — nenhuma notificação enviada.

- [ ] **Step 3: Write the Action**

```php
<?php

namespace App\Domains\Identity\Actions;

use App\Domains\Identity\Models\User;
use App\Domains\Identity\Notifications\RedatorAccessInvitation;
use Illuminate\Support\Facades\Password;

/**
 * Fonte única do convite de primeiro acesso: cria o token no broker `invites`
 * (7 dias, tabela própria) e notifica. Usada pelo cadastro e pelo reenvio —
 * duplicar o par token+notificação faria os dois caminhos divergirem.
 */
class SendRedatorAccessInvitationAction
{
    public function execute(User $user): void
    {
        $token = Password::broker('invites')->createToken($user);

        $user->notify((new RedatorAccessInvitation($token))->locale('es_CL'));
    }
}
```

- [ ] **Step 4: Wire it into the cadastro**

Em `CreateRedatorAction`: injete `private SendRedatorAccessInvitationAction $invitations` no construtor e, **depois** do bloco `try/catch` que hoje envolve a transação (fora dele), antes do `return`, troque o retorno direto por:

```php
        // Disparo FORA da transação e fora do try/catch dos uploads: e-mail
        // que falha não desfaz cadastro nem descarta binário já subido. Se
        // cair, o admin reenvia o convite pela tela — é justamente por isso
        // que o reenvio existe.
        try {
            $this->invitations->execute($redator->user);
        } catch (Throwable $e) {
            report($e);
        }

        return $redator;
```

Para isso, a transação passa a atribuir `$redator = DB::transaction(...)` em vez de `return DB::transaction(...)`.

- [ ] **Step 5: Run test to verify it passes**

Run: `docker compose exec -T app php artisan test --filter=RedatorInvitationDispatchTest`
Expected: PASS (2 testes)

- [ ] **Step 6: Format and commit**

```bash
cd backend && ./vendor/bin/pint app/Domains/Identity/Actions/SendRedatorAccessInvitationAction.php app/Domains/Identity/Actions/CreateRedatorAction.php tests/Feature/Identity/RedatorInvitationDispatchTest.php
cd .. && git add backend/app/Domains/Identity/Actions backend/tests/Feature/Identity/RedatorInvitationDispatchTest.php
git commit -m "feat(identity): cadastro de redator dispara o convite de acesso"
```

---

### Task 6: Mailpit no compose

**Files:**
- Modify: `docker-compose.yml`
- Modify: `backend/.env.example:61-66`

**Interfaces:**
- Produces: SMTP em `mailpit:1025` dentro da rede do compose, UI em `http://localhost:8025`.

- [ ] **Step 1: Add the service**

Em `docker-compose.yml`, ao lado de `gotenberg`:

```yaml
  mailpit:
    image: axllent/mailpit
    ports: ["8025:8025"]
```

- [ ] **Step 2: Point the app at it**

Em `backend/.env.example`:

```
MAIL_MAILER=smtp
MAIL_SCHEME=null
MAIL_HOST=mailpit
MAIL_PORT=1025
MAIL_USERNAME=null
MAIL_PASSWORD=null
MAIL_FROM_ADDRESS="no-reply@lotus.cl"
MAIL_FROM_NAME="${APP_NAME}"
```

Espelhe as mesmas chaves no seu `backend/.env` local — `.env` não é versionado, então o compose sozinho não muda o que a app usa.

- [ ] **Step 3: Verify it is up**

```bash
docker compose up -d mailpit
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8025
```
Expected: `200`

- [ ] **Step 4: Prove a real delivery**

```bash
docker compose exec -T app php artisan tinker --execute="Illuminate\Support\Facades\Mail::raw('sonda', fn (\$m) => \$m->to('sonda@lotus.cl')->subject('sonda'));"
curl -s http://localhost:8025/api/v1/messages | head -c 200
```
Expected: o JSON lista a mensagem `sonda`. **Se vier vazio, o `.env` local ainda está em `log` — corrija antes de seguir.**

- [ ] **Step 5: Commit**

```bash
git add docker-compose.yml backend/.env.example
git commit -m "chore(dev): mailpit no compose para provar o e-mail de acesso"
```

---

### Task 7: As duas rotas públicas

**Files:**
- Create: `backend/app/Domains/Identity/Http/Controllers/PasswordResetController.php`
- Create: `backend/app/Domains/Identity/Data/ForgotPasswordData.php`
- Create: `backend/app/Domains/Identity/Data/ResetPasswordData.php`
- Modify: `backend/app/Domains/Identity/routes.php:21`
- Test: `backend/tests/Feature/Identity/PublicPasswordRoutesTest.php`

**Interfaces:**
- Consumes: brokers `users` e `invites`.
- Produces: `POST /api/password/forgot`, `POST /api/password/reset`, `POST /api/invitation/accept` — todas públicas, com `throttle:6,1`.

- [ ] **Step 1: Write the failing test**

```php
<?php

namespace Tests\Feature\Identity;

use App\Domains\Identity\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;
use Tests\TestCase;

class PublicPasswordRoutesTest extends TestCase
{
    use RefreshDatabase;

    public function test_forgot_responde_igual_para_email_existente_e_inexistente(): void
    {
        Notification::fake();
        User::factory()->create(['email' => 'existe@lotus.cl', 'is_active' => true]);

        $comConta = $this->postJson('/api/password/forgot', ['email' => 'existe@lotus.cl']);
        $semConta = $this->postJson('/api/password/forgot', ['email' => 'ninguem@lotus.cl']);

        // Resposta idêntica: a rota é pública e não pode virar enumerador.
        $this->assertSame($comConta->status(), $semConta->status());
        $this->assertSame($comConta->json(), $semConta->json());
    }

    public function test_aceitar_o_convite_define_a_senha(): void
    {
        $user = User::factory()->create(['type' => 'redator', 'email' => 'ana@lotus.cl', 'is_active' => true]);
        $token = Password::broker('invites')->createToken($user);

        $this->postJson('/api/invitation/accept', [
            'token' => $token,
            'email' => 'ana@lotus.cl',
            'password' => 'senhaNova123',
            'password_confirmation' => 'senhaNova123',
        ])->assertNoContent();

        $this->assertTrue(Hash::check('senhaNova123', $user->refresh()->password));
        $this->assertDatabaseCount('invitation_tokens', 0);
    }

    public function test_token_invalido_sobe_422_pelo_envelope(): void
    {
        User::factory()->create(['email' => 'ana@lotus.cl']);

        $this->postJson('/api/password/reset', [
            'token' => 'nao-e-token',
            'email' => 'ana@lotus.cl',
            'password' => 'senhaNova123',
            'password_confirmation' => 'senhaNova123',
        ])
            ->assertStatus(422)
            ->assertJsonPath('errors.token.0', fn (?string $msg) => filled($msg));
    }

    public function test_o_token_de_convite_nao_serve_na_rota_de_recuperacao(): void
    {
        $user = User::factory()->create(['email' => 'ana@lotus.cl']);
        $token = Password::broker('invites')->createToken($user);

        // Cada fluxo tem sua tabela: usar o token do outro é token inválido,
        // e é isso que impede o convite de 7 dias de virar reset de 7 dias.
        $this->postJson('/api/password/reset', [
            'token' => $token, 'email' => 'ana@lotus.cl',
            'password' => 'senhaNova123', 'password_confirmation' => 'senhaNova123',
        ])->assertStatus(422);
    }

    public function test_a_rota_publica_tem_throttle(): void
    {
        for ($i = 0; $i < 7; $i++) {
            $response = $this->postJson('/api/password/forgot', ['email' => 'existe@lotus.cl']);
        }

        $response->assertStatus(429);
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `docker compose exec -T app php artisan test --filter=PublicPasswordRoutesTest`
Expected: FAIL — 404 nas rotas.

- [ ] **Step 3: Write the DTOs**

`ForgotPasswordData.php`:

```php
<?php

namespace App\Domains\Identity\Data;

use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/** Entrada de `POST /api/password/forgot`. */
#[TypeScript]
class ForgotPasswordData extends Data
{
    public function __construct(public string $email) {}

    /** @return array<string,array<int,string>> */
    public static function rules(): array
    {
        return ['email' => ['required', 'email']];
    }
}
```

`ResetPasswordData.php`: `token`, `email`, `password`, `password_confirmation`, com regras `['required','string']`, `['required','email']`, `['required','string','min:8','confirmed']`, `['required','string']` — a mesma régua de `ProfilePasswordData`.

- [ ] **Step 4: Write the controller**

```php
<?php

namespace App\Domains\Identity\Http\Controllers;

use App\Domains\Identity\Data\ForgotPasswordData;
use App\Domains\Identity\Data\ResetPasswordData;
use App\Domains\Identity\Models\User;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Password;
use Illuminate\Validation\ValidationException;

class PasswordResetController extends Controller
{
    /**
     * Resposta genérica SEMPRE, exista o e-mail ou não: distinguir os dois
     * casos transformaria uma rota pública em enumerador de usuários. O
     * status do broker é deliberadamente descartado.
     */
    public function forgot(ForgotPasswordData $data): JsonResponse
    {
        Password::broker('users')->sendResetLink(['email' => $data->email]);

        return response()->json(['message' => __('identity.reset.requested')]);
    }

    public function reset(ResetPasswordData $data): Response
    {
        return $this->consume('users', $data);
    }

    public function accept(ResetPasswordData $data): Response
    {
        return $this->consume('invites', $data);
    }

    /**
     * Um broker por fluxo, e nunca o outro: é o que mantém os TTLs separados
     * (7 dias no convite, 60 minutos na recuperação). Token recusado sobe 422
     * pelo handler global — nunca `abort()`.
     */
    private function consume(string $broker, ResetPasswordData $data): Response
    {
        $status = Password::broker($broker)->reset(
            [
                'email' => $data->email,
                'password' => $data->password,
                'password_confirmation' => $data->password_confirmation,
                'token' => $data->token,
            ],
            function (User $user, string $password): void {
                // O hash sai do cast 'password' => 'hashed' do model, como em
                // ChangeOwnPasswordAction. Nenhum Hash::make aqui.
                $user->update(['password' => $password]);
            },
        );

        if ($status !== Password::PASSWORD_RESET) {
            throw ValidationException::withMessages(['token' => __($status)]);
        }

        return response()->noContent();
    }
}
```

Acrescente a chave `'requested'` ao array `reset` das 4 `lang/*/identity.php`.

- [ ] **Step 5: Register the routes**

Em `app/Domains/Identity/routes.php`, junto do `POST /login`:

```php
// Públicas por definição: quem pede acesso ainda não tem sessão. `throttle`
// porque são as únicas rotas anônimas que escrevem — 6 tentativas por minuto
// por IP.
Route::middleware('throttle:6,1')->group(function () {
    Route::post('/password/forgot', [PasswordResetController::class, 'forgot']);
    Route::post('/password/reset', [PasswordResetController::class, 'reset']);
    Route::post('/invitation/accept', [PasswordResetController::class, 'accept']);
});
```

- [ ] **Step 6: Run test to verify it passes**

Run: `docker compose exec -T app php artisan test --filter=PublicPasswordRoutesTest`
Expected: PASS (5 testes)

- [ ] **Step 7: Format and commit**

```bash
cd backend && ./vendor/bin/pint app/Domains/Identity/Http/Controllers/PasswordResetController.php app/Domains/Identity/Data/ForgotPasswordData.php app/Domains/Identity/Data/ResetPasswordData.php app/Domains/Identity/routes.php lang tests/Feature/Identity/PublicPasswordRoutesTest.php
cd .. && git add backend/app backend/lang backend/tests/Feature/Identity/PublicPasswordRoutesTest.php
git commit -m "feat(identity): rotas publicas de convite e recuperacao de senha"
```

---

### Task 8: Reenvio de convite pelo admin

**Files:**
- Create: `backend/app/Domains/Identity/Http/Controllers/RedatorInvitationController.php`
- Modify: `backend/app/Domains/Identity/routes.php` (grupo `permission:identity.user.update`)
- Test: `backend/tests/Feature/Identity/RedatorInvitationResendTest.php`

**Interfaces:**
- Consumes: `SendRedatorAccessInvitationAction` (Task 5).
- Produces: `POST /api/redatores/{redator}/invitation` → 204, sob `permission:identity.user.update`.

- [ ] **Step 1: Write the failing test**

```php
<?php

namespace Tests\Feature\Identity;

use App\Domains\Identity\Models\Redator;
use App\Domains\Identity\Models\User;
use App\Domains\Identity\Notifications\RedatorAccessInvitation;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class RedatorInvitationResendTest extends TestCase
{
    use RefreshDatabase;

    private function redator(): Redator
    {
        $user = User::factory()->create(['type' => 'redator', 'email' => 'ana@lotus.cl', 'is_active' => true]);

        return $user->redator()->create([]);
    }

    public function test_admin_reenvia_o_convite(): void
    {
        Notification::fake();
        $this->actingAsAdmin();
        $redator = $this->redator();

        $this->postJson("/api/redatores/{$redator->id}/invitation")->assertNoContent();

        Notification::assertSentTo($redator->user, RedatorAccessInvitation::class);
    }

    public function test_sem_permissao_o_reenvio_e_recusado(): void
    {
        Notification::fake();
        $user = User::factory()->create(['type' => 'admin', 'is_active' => true]);
        $this->actingAs($user, 'web');
        $redator = $this->redator();

        $this->postJson("/api/redatores/{$redator->id}/invitation")->assertStatus(403);

        Notification::assertNothingSent();
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `docker compose exec -T app php artisan test --filter=RedatorInvitationResendTest`
Expected: FAIL — 404.

- [ ] **Step 3: Write the controller**

```php
<?php

namespace App\Domains\Identity\Http\Controllers;

use App\Domains\Identity\Actions\SendRedatorAccessInvitationAction;
use App\Domains\Identity\Models\Redator;
use App\Http\Controllers\Controller;
use Illuminate\Http\Response;

/**
 * Reenvio do convite de primeiro acesso. Existe porque os redatores
 * cadastrados antes deste bloco nasceram sem credencial utilizável: sem esta
 * rota não há caminho para dar acesso a eles.
 */
class RedatorInvitationController extends Controller
{
    public function store(Redator $redator, SendRedatorAccessInvitationAction $action): Response
    {
        $action->execute($redator->user);

        return response()->noContent();
    }
}
```

- [ ] **Step 4: Register the route**

Dentro do grupo `Route::middleware('permission:identity.user.update')` que já existe em `routes.php`:

```php
        Route::post('redatores/{redator}/invitation', [RedatorInvitationController::class, 'store']);
```

- [ ] **Step 5: Run test to verify it passes**

Run: `docker compose exec -T app php artisan test --filter=RedatorInvitationResendTest`
Expected: PASS (2 testes)

- [ ] **Step 6: Format and commit**

```bash
cd backend && ./vendor/bin/pint app/Domains/Identity/Http/Controllers/RedatorInvitationController.php app/Domains/Identity/routes.php tests/Feature/Identity/RedatorInvitationResendTest.php
cd .. && git add backend/app backend/tests/Feature/Identity/RedatorInvitationResendTest.php
git commit -m "feat(identity): reenvio de convite de acesso pelo admin"
```

---

### Task 9: Revogação — `is_active` no contrato do redator e purga total de sessões

**Files:**
- Modify: `backend/app/Domains/Identity/Data/RedatorData.php`
- Modify: `backend/app/Domains/Identity/Actions/UpdateRedatorAction.php`
- Modify: `backend/app/Domains/Identity/Actions/PurgeOtherSessionsAction.php`
- Test: `backend/tests/Feature/Identity/RedatorAccessRevocationTest.php`

**Interfaces:**
- Produces: `RedatorData::$is_active` (`bool|Optional`, default `true` no create); `PurgeOtherSessionsAction::all(User $user): int`.

- [ ] **Step 1: Write the failing test**

```php
<?php

namespace Tests\Feature\Identity;

use App\Domains\Identity\Actions\UpdateRedatorAction;
use App\Domains\Identity\Data\RedatorData;
use App\Domains\Identity\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class RedatorAccessRevocationTest extends TestCase
{
    use RefreshDatabase;

    public function test_desligar_o_acesso_derruba_todas_as_sessoes(): void
    {
        $user = User::factory()->create(['type' => 'redator', 'email' => 'ana@lotus.cl', 'is_active' => true]);
        $redator = $user->redator()->create([]);

        foreach (['sess-a', 'sess-b'] as $id) {
            DB::table('sessions')->insert([
                'id' => $id, 'user_id' => $user->id, 'ip_address' => '127.0.0.1',
                'user_agent' => 'phpunit', 'payload' => 'x', 'last_activity' => 1_755_000_000,
            ]);
        }

        app(UpdateRedatorAction::class)->execute($redator, RedatorData::from([
            'name' => 'Ana Reyes', 'rut' => $user->rut, 'email' => 'ana@lotus.cl', 'is_active' => false,
        ]));

        $this->assertFalse($user->refresh()->is_active);
        // Nenhuma sobrevive: revogar com sessão viva deixaria o redator
        // navegando até o cookie expirar.
        $this->assertSame(0, DB::table('sessions')->where('user_id', $user->id)->count());
    }

    public function test_a_omissao_de_is_active_nao_revoga(): void
    {
        $user = User::factory()->create(['type' => 'redator', 'email' => 'ana@lotus.cl', 'is_active' => true]);
        $redator = $user->redator()->create([]);

        app(UpdateRedatorAction::class)->execute($redator, RedatorData::from([
            'name' => 'Ana Reyes', 'rut' => $user->rut, 'email' => 'ana@lotus.cl',
        ]));

        // D-13 do backlog é exatamente esta classe de defeito: omissão que
        // vira apagamento. Aqui ela custaria o acesso de quem já tinha.
        $this->assertTrue($user->refresh()->is_active);
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `docker compose exec -T app php artisan test --filter=RedatorAccessRevocationTest`
Expected: FAIL — `is_active` não existe em `RedatorData`.

- [ ] **Step 3: Add the field to the DTO**

Em `RedatorData::__construct`, depois de `$phone`:

```php
        /**
         * Acesso do redator. `Optional` de propósito: um PUT que não fala de
         * acesso não pode revogá-lo (é a classe de defeito da D-13).
         */
        public bool|Optional $is_active,
```

Em `fromModel`, passe `is_active: $redator->user->is_active`.

- [ ] **Step 4: Implement in the Action**

Dentro da transação de `UpdateRedatorAction`, o `$redator->user->update([...])` ganha o campo, e a purga roda quando o acesso cai:

```php
                $revogando = ! $data->is_active instanceof Optional
                    && $data->is_active === false
                    && $redator->user->is_active === true;

                $redator->user->update([
                    'name' => $data->name,
                    'rut' => $rut,
                    'email' => $data->email,
                    'phone' => $data->phone instanceof Optional ? null : $data->phone,
                    ...($data->is_active instanceof Optional ? [] : ['is_active' => $data->is_active]),
                ]);

                if ($revogando) {
                    $this->sessions->all($redator->user);
                }
```

Injete `private PurgeOtherSessionsAction $sessions` no construtor.

- [ ] **Step 5: Add the "purge all" path**

Em `PurgeOtherSessionsAction`:

```php
    /**
     * Encerra TODAS as sessões do usuário. Usado na revogação de acesso, onde
     * não há sessão a preservar — o `execute()` preserva a corrente porque
     * nasceu para a troca da própria senha.
     *
     * @return int quantas sessões foram encerradas
     */
    public function all(User $user): int
    {
        return DB::table('sessions')->where('user_id', $user->id)->delete();
    }
```

- [ ] **Step 6: Run test to verify it passes**

Run: `docker compose exec -T app php artisan test --filter=RedatorAccessRevocationTest`
Expected: PASS (2 testes)

- [ ] **Step 7: Full backend suite**

Run: `docker compose exec -T app php artisan test`
Expected: PASS. Falha em teste de redator que assumia `is_active=false` é esperada — corrija o teste para a regra nova.

- [ ] **Step 8: Format and commit**

```bash
cd backend && ./vendor/bin/pint app/Domains/Identity/Data/RedatorData.php app/Domains/Identity/Actions/UpdateRedatorAction.php app/Domains/Identity/Actions/PurgeOtherSessionsAction.php tests/Feature/Identity/RedatorAccessRevocationTest.php
cd .. && git add backend/app backend/tests
git commit -m "feat(identity): admin revoga acesso do redator e derruba as sessoes"
```

---

### Task 10: Regenerar os tipos

**Files:**
- Modify: `frontend/src/shared/types/generated.ts` (**gerado, nunca editado à mão** — lei §5.3)

- [ ] **Step 1: Regenerate**

```bash
docker compose exec -T app php artisan typescript:transform
```

- [ ] **Step 2: Verify the diff is only what the block changed**

```bash
git diff --stat frontend/src/shared/types/generated.ts
git diff frontend/src/shared/types/generated.ts | grep -E '^\+' | head -20
```
Expected: `RedatorData` ganha `is_active`; nascem `ForgotPasswordData` e `ResetPasswordData`. Qualquer outra mudança significa DTO tocado sem querer — investigue antes de commitar.

- [ ] **Step 3: Type-check**

```bash
cd frontend && pnpm build
```
Expected: verde. Se `RedatorFormFields` reclamar do campo novo, a Task 13 é quem o consome — deixe o erro para lá **só** se o build passar; se quebrar, ajuste o tipo do form nesta task.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/shared/types/generated.ts
git commit -m "chore(types): regenera generated.ts com o contrato de acesso do redator"
```

---

### Task 11: Cliente HTTP e hooks das telas públicas

**Files:**
- Create: `frontend/src/features/identity/api/passwordApi.ts`
- Create: `frontend/src/features/identity/hooks/useForgotPassword.ts`
- Create: `frontend/src/features/identity/hooks/useSetPassword.ts`
- Test: `frontend/src/features/identity/hooks/useSetPassword.test.tsx`

**Interfaces:**
- Produces: `useForgotPassword()` → `{ email, setEmail, submit, isSubmitting, sent }`; `useSetPassword(token, flow)` → `{ password, setPassword, confirmation, setConfirmation, submit, isSubmitting, fieldErrors, tokenRejected }`.

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useSetPassword } from './useSetPassword'
import { api } from '@shared/api/axios'

vi.mock('@shared/api/axios', async () => ({
  ...(await vi.importActual<typeof import('@shared/api/axios')>('@shared/api/axios')),
  api: { post: vi.fn() },
}))

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

describe('useSetPassword', () => {
  beforeEach(() => vi.clearAllMocks())

  it('manda o convite para /api/invitation/accept e a recuperação para /api/password/reset', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: null } as never)

    const convite = renderHook(() => useSetPassword('tok', 'invite', 'ana@lotus.cl'), { wrapper })
    act(() => convite.result.current.submit())
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/api/invitation/accept', expect.anything()))

    const reset = renderHook(() => useSetPassword('tok', 'reset', 'ana@lotus.cl'), { wrapper })
    act(() => reset.result.current.submit())
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/api/password/reset', expect.anything()))
  })

  it('marca tokenRejected quando o 422 nomeia o token', async () => {
    vi.mocked(api.post).mockRejectedValue({ status: 422, errors: { token: ['inválido'] } })

    const { result } = renderHook(() => useSetPassword('tok', 'invite', 'ana@lotus.cl'), { wrapper })
    act(() => result.current.submit())

    // É este ramo que manda o usuário para "olvidé mi clave" em vez de deixá-lo
    // preso numa tela que nunca vai funcionar.
    await waitFor(() => expect(result.current.tokenRejected).toBe(true))
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && pnpm test -- useSetPassword`
Expected: FAIL — módulo não encontrado.

- [ ] **Step 3: Write the api module**

```ts
import { useMutation } from '@tanstack/react-query'
import { api } from '@shared/api/axios'
import type { ProblemDetails } from '@shared/api/axios'
import { initCsrf } from '@shared/api/csrf'

export type PasswordFlow = 'invite' | 'reset'

interface SetPasswordVars {
  token: string
  email: string
  password: string
  password_confirmation: string
}

/** Convite e recuperação são endpoints distintos de propósito: cada fluxo tem
 *  seu broker e seu TTL no backend (7 dias × 60 minutos). */
const ROTA: Record<PasswordFlow, string> = {
  invite: '/api/invitation/accept',
  reset: '/api/password/reset',
}

export function useSetPasswordMutation(flow: PasswordFlow) {
  return useMutation<void, ProblemDetails, SetPasswordVars>({
    mutationFn: async (vars) => {
      await initCsrf()
      await api.post(ROTA[flow], vars)
    },
  })
}

export function useForgotPasswordMutation() {
  return useMutation<void, ProblemDetails, { email: string }>({
    mutationFn: async (vars) => {
      await initCsrf()
      await api.post('/api/password/forgot', vars)
    },
  })
}
```

- [ ] **Step 4: Write the hooks**

`useSetPassword.ts`:

```ts
import { useState } from 'react'
import { useSetPasswordMutation, type PasswordFlow } from '../api/passwordApi'

export function useSetPassword(token: string, flow: PasswordFlow, email: string) {
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const mutation = useSetPasswordMutation(flow)

  const fieldErrors = mutation.error?.errors ?? null
  const tokenRejected = Boolean(fieldErrors?.token)

  function submit() {
    mutation.mutate({ token, email, password, password_confirmation: confirmation })
  }

  return {
    password, setPassword,
    confirmation, setConfirmation,
    submit,
    isSubmitting: mutation.isPending,
    succeeded: mutation.isSuccess,
    fieldErrors,
    tokenRejected,
  }
}
```

`useForgotPassword.ts`: mesmo molde sobre `useForgotPasswordMutation`, expondo `sent: mutation.isSuccess` — **a tela mostra a mesma mensagem tendo ou não conta**, espelhando a resposta genérica do backend.

- [ ] **Step 5: Run test to verify it passes**

Run: `cd frontend && pnpm test -- useSetPassword`
Expected: PASS (2 testes)

- [ ] **Step 6: Commit**

```bash
git add frontend/src/features/identity/api/passwordApi.ts frontend/src/features/identity/hooks/useSetPassword.ts frontend/src/features/identity/hooks/useForgotPassword.ts frontend/src/features/identity/hooks/useSetPassword.test.tsx
git commit -m "feat(identity): hooks das telas publicas de senha"
```

---

### Task 12: As duas telas públicas e as rotas

**Files:**
- Create: `frontend/src/features/identity/components/Password/SetPasswordPage.tsx`
- Create: `frontend/src/features/identity/components/Password/ForgotPasswordPage.tsx`
- Modify: `frontend/src/app/router/AppRouter.tsx:29-35`
- Modify: `frontend/src/features/identity/components/Login/LoginForm.tsx`
- Modify: `frontend/src/shared/config/locales/{es-CL,pt-BR,en}.json`

**Interfaces:**
- Consumes: `useSetPassword`, `useForgotPassword` (Task 11).
- Produces: rotas `/definir-clave/:token` e `/recuperar-clave`, públicas.

- [ ] **Step 1: Write `SetPasswordPage.tsx`**

```tsx
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { AppButton, AppPassword, FormErrorBanner } from '@shared/ui'
import { dangerText } from '@shared/styles/tokens'
import { useSetPassword } from '../../hooks/useSetPassword'
import type { PasswordFlow } from '../../api/passwordApi'

export function SetPasswordPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { token = '' } = useParams()
  const [params] = useSearchParams()
  const email = params.get('email') ?? ''
  const flow: PasswordFlow = params.get('flow') === 'reset' ? 'reset' : 'invite'

  const {
    password, setPassword, confirmation, setConfirmation,
    submit, isSubmitting, succeeded, fieldErrors, tokenRejected,
  } = useSetPassword(token, flow, email)

  // Link vencido não deixa o usuário preso: a saída é pedir outro.
  if (tokenRejected) {
    return (
      <main className="flex flex-col gap-4 w-full max-w-sm mx-auto p-8 text-left">
        <h1 className="font-display text-2xl font-semibold tracking-tight" style={{ color: 'var(--text-color)' }}>
          {t('password.expired')}
        </h1>
        <AppButton label={t('password.expiredAction')} onClick={() => navigate('/recuperar-clave')} />
      </main>
    )
  }

  if (succeeded) {
    return (
      <main className="flex flex-col gap-4 w-full max-w-sm mx-auto p-8 text-left">
        <h1 className="font-display text-2xl font-semibold tracking-tight" style={{ color: 'var(--text-color)' }}>
          {t('password.success')}
        </h1>
        <AppButton label={t('password.successAction')} onClick={() => navigate('/login')} />
      </main>
    )
  }

  return (
    <main className="p-8">
      <form
        onSubmit={(e) => { e.preventDefault(); submit() }}
        className="flex flex-col gap-4 w-full max-w-sm mx-auto text-left"
      >
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight" style={{ color: 'var(--text-color)' }}>
            {t('password.title')}
          </h1>
          <p style={{ color: 'var(--text-color-secondary)' }}>{t('password.subtitle')}</p>
        </div>

        <FormErrorBanner message={fieldErrors?.email?.[0] ?? null} variant="inline" />

        {/* Rótulo por htmlFor, nunca embrulhando o campo: o olho do AppPassword
            tem nome acessível próprio e seria somado ao do input (UI-03). */}
        <div className="flex flex-col gap-1">
          <label htmlFor="set-password" className="font-medium" style={{ color: 'var(--text-color)' }}>
            {t('password.newPassword')}
          </label>
          <AppPassword
            id="set-password"
            value={password}
            autoComplete="new-password"
            onChange={(e) => setPassword(e.target.value)}
            invalid={!!fieldErrors?.password}
            aria-invalid={!!fieldErrors?.password}
            aria-describedby={fieldErrors?.password ? 'set-password-error' : undefined}
          />
          {fieldErrors?.password && (
            <small id="set-password-error" style={{ color: dangerText }}>{fieldErrors.password[0]}</small>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="set-password-confirmation" className="font-medium" style={{ color: 'var(--text-color)' }}>
            {t('password.confirmation')}
          </label>
          <AppPassword
            id="set-password-confirmation"
            value={confirmation}
            autoComplete="new-password"
            onChange={(e) => setConfirmation(e.target.value)}
          />
        </div>

        <AppButton type="submit" label={t('password.submit')} loading={isSubmitting} />
      </form>
    </main>
  )
}
```

- [ ] **Step 1b: Write `ForgotPasswordPage.tsx`**

```tsx
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { AppButton, AppInputText } from '@shared/ui'
import { useForgotPassword } from '../../hooks/useForgotPassword'

export function ForgotPasswordPage() {
  const { t } = useTranslation()
  const { email, setEmail, submit, isSubmitting, sent } = useForgotPassword()

  return (
    <main className="p-8">
      <form
        onSubmit={(e) => { e.preventDefault(); submit() }}
        className="flex flex-col gap-4 w-full max-w-sm mx-auto text-left"
      >
        <h1 className="font-display text-2xl font-semibold tracking-tight" style={{ color: 'var(--text-color)' }}>
          {t('password.forgotTitle')}
        </h1>

        {/* Mensagem IDÊNTICA exista ou não a conta: a tela não pode desmentir a
            resposta genérica do backend e virar enumerador de usuários. */}
        {sent ? (
          <p style={{ color: 'var(--text-color-secondary)' }}>{t('password.forgotSent')}</p>
        ) : (
          <>
            <div className="flex flex-col gap-1">
              <label htmlFor="forgot-email" className="font-medium" style={{ color: 'var(--text-color)' }}>
                {t('login.email')}
              </label>
              <AppInputText
                id="forgot-email"
                type="email"
                leftIcon="pi pi-envelope"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <AppButton type="submit" label={t('password.forgotSubmit')} loading={isSubmitting} />
          </>
        )}

        <Link to="/login" className="text-sm" style={{ color: 'var(--text-color-secondary)' }}>
          {t('password.backToLogin')}
        </Link>
      </form>
    </main>
  )
}
```

- [ ] **Step 2: Register the public routes**

Em `AppRouter.tsx`, ao lado de `/validar/:uuid` e **fora** do `SessionBootstrap` — quem define a senha ainda não tem sessão e não deve disparar `GET /api/me`:

```tsx
        {/* Primeiro acesso e recuperação: públicas, sem cookie de sessão. O
            `flow` da query decide o endpoint (convite × recuperação). */}
        <Route path="/definir-clave/:token" element={<SetPasswordPage />} />
        <Route path="/recuperar-clave" element={<ForgotPasswordPage />} />
```

- [ ] **Step 3: Link it from the login**

Em `LoginForm.tsx`, abaixo do campo de senha:

```tsx
      <Link to="/recuperar-clave" className="text-sm self-end" style={{ color: 'var(--text-color-secondary)' }}>
        {t('login.forgotPassword')}
      </Link>
```

- [ ] **Step 4: Add the keys to the three locales**

Em cada `locales/*.json`, o bloco `password` (`title`, `subtitle`, `newPassword`, `confirmation`, `submit`, `expired`, `expiredAction`, `success`, `successAction`, `forgotTitle`, `forgotSubmit`, `forgotSent`, `backToLogin`) e a chave `login.forgotPassword`. **As três locales recebem as mesmas chaves** — chave órfã ou faltando reprova no gate.

- [ ] **Step 5: Verify**

```bash
cd frontend && pnpm lint && pnpm build && pnpm test
```
Expected: os três verdes.

- [ ] **Step 6: Prove it in the browser**

Com `pnpm dev` no ar, abra `http://localhost:5173/recuperar-clave` **deslogado**: a tela renderiza sem redirecionar para `/login` e sem disparar `GET /api/me` (confira a aba Network).

- [ ] **Step 7: Commit**

```bash
git add frontend/src
git commit -m "feat(identity): telas publicas de primeiro acesso e recuperacao"
```

---

### Task 13: Estado do acesso e reenvio na tela do redator

**Files:**
- Modify: `frontend/src/features/identity/hooks/useRedatorForm.ts`
- Modify: `frontend/src/features/identity/components/Redator/RedatorUserSection.tsx`
- Modify: `frontend/src/features/identity/components/Redator/RedatoresTable.tsx`
- Create: `frontend/src/features/identity/hooks/useRedatorInvitation.ts`
- Modify: `frontend/src/shared/config/locales/{es-CL,pt-BR,en}.json`

**Interfaces:**
- Consumes: `RedatorData.is_active` do `generated.ts` (Task 10); `POST /api/redatores/{id}/invitation` (Task 8).

- [ ] **Step 1: Add the state control**

`is_active` entra em `RedatorFormFields` com default `true`, e ganha controle em `RedatorUserSection` **no molde já existente do staff** (`StaffUserDialog.tsx:118-130`): `FormField` + `AppDropdown` com as opções Activo/Inactivo. Não existe `AppSwitch` em `shared/ui`, e feature não importa PrimeReact direto (lei §5.6) — copiar o molde é o caminho, inventar componente não é.

- [ ] **Step 2: Add the resend hook**

```ts
import { useMutation } from '@tanstack/react-query'
import { api } from '@shared/api/axios'
import type { ProblemDetails } from '@shared/api/axios'

/** Reenvia o convite de primeiro acesso. Existe para os redatores cadastrados
 *  antes deste bloco, que nasceram sem credencial utilizável. */
export function useRedatorInvitation() {
  return useMutation<void, ProblemDetails, number>({
    mutationFn: async (redatorId) => {
      await api.post(`/api/redatores/${redatorId}/invitation`)
    },
  })
}
```

- [ ] **Step 3: Wire the button**

Em `RedatoresTable.tsx`, uma ação por linha ("Reenviar invitación") que chama o hook e mostra `AppToast` de sucesso/erro. Estado `pending` desabilita o botão da linha.

- [ ] **Step 4: Add the keys to the three locales**

`redator.accessState`, `redator.resendInvitation`, `redator.invitationSent`, `redator.invitationFailed`.

- [ ] **Step 5: Verify**

```bash
cd frontend && pnpm lint && pnpm build && pnpm test
```
Expected: verdes.

- [ ] **Step 6: Commit**

```bash
git add frontend/src
git commit -m "feat(identity): estado de acesso e reenvio de convite na tela do redator"
```

---

### Task 14: Gate do bloco — o DoD provado, não afirmado

**Files:** nenhum. Esta task **prova**; se algo falhar, o conserto vira commit próprio.

- [ ] **Step 1: Suítes e catracas**

```bash
docker compose exec -T app php artisan test
cd backend && ./vendor/bin/pint --test app database tests
cd ../frontend && pnpm lint && pnpm build && pnpm test
cd .. && docker compose exec -T app php artisan typescript:transform && git diff --exit-code frontend/src/shared/types/generated.ts
```
Expected: tudo verde, e o `git diff --exit-code` **sem saída** — se `generated.ts` mudar aqui, alguém o editou à mão (lei §5.3).

- [ ] **Step 2: Primeiro acesso ponta a ponta, no navegador**

1. Logado como admin, cadastre um redator com e-mail novo.
2. Abra `http://localhost:8025`, abra a mensagem, clique o botão do e-mail.
3. Defina a senha na tela `/definir-clave/...`.
4. Autentique com esse e-mail e a senha definida.
5. Confirme que cai na view `redator` do Dashboard.

- [ ] **Step 3: Revogação**

Como admin, mude o estado do redator para Inactivo. Depois: (a) o login dele é recusado; (b) a aba onde ele estava logado perde a sessão na próxima request. Prove (b) com a aba aberta antes da revogação.

- [ ] **Step 4: Recuperação e resposta genérica**

Peça recuperação em `/recuperar-clave` com o e-mail do redator **e** com um e-mail inexistente. A tela mostra a mesma mensagem nos dois casos, e só o primeiro chega ao Mailpit.

- [ ] **Step 5: Reenvio**

Para um redator cadastrado **antes** deste bloco (sem senha utilizável), reenvie o convite pela tabela e complete o primeiro acesso.

- [ ] **Step 6: RN-01 não afrouxou**

```bash
docker compose exec -T app php artisan tinker --execute="echo App\Domains\Identity\Models\User::whereIn('type',['cliente','aluno'])->where('is_active',true)->count();"
```
Expected: `0`.

- [ ] **Step 7: Registrar o resultado**

Atualize `docs/superpowers/state.md` para `ready_for_review` e commite junto do resultado do gate.

---

## Handoff de execução

**executor: claude**

Critério do `/executar-bloco`: o bloco toca lei do §5 em três pontos — §5.3 (`generated.ts` regenerado, Task 10), §5.4 (Sanctum e sessão: rotas públicas novas, purga de sessões, `sendPasswordResetNotification`) e §5.5 (RN-01: o default de `is_active` deixa de ser único). Também decide contrato de API em duas Tasks (7 e 9). Nenhuma delas é mecânica com paths fechados, então **não** vai para o Codex.

`paths_autorizados`: N/A (executor `claude`).
