# Contrato de entrada: identidade e coleção nested — Plano de implementação

> **Para executores agênticos:** SUB-SKILL OBRIGATÓRIA — use `superpowers:subagent-driven-development`
> (recomendada) ou `superpowers:executing-plans` para executar task a task. Os passos usam checkbox
> (`- [ ]`) para rastreio.

**Goal:** fechar o invariante de identidade (RUT + e-mail) numa porta única no `UserProvisioner`, e
fazer as coleções nested do `ClientData` pararem de apagar dados por omissão.

**Architecture:** o `UserProvisioner` ganha `ensureIdentityAvailable()` como única checagem pública e
os nove caminhos de escrita de identidade passam por ela; `ClientData::$addresses`/`$contacts` viram
`Optional` no molde do `CourseData`, com a obrigatoriedade de contato no POST migrando de `rules()`
para a `CreateClientAction`; e a lei "coleção nested read-write nasce `Optional`" ganha guarda
estática com a exceção read-only declarada por atributo no sítio.

**Tech Stack:** Laravel 13 / PHP 8.3 · spatie/laravel-data + typescript-transformer · PHPUnit
(sqlite `:memory:`) · React 19 + TS · Vitest.

**Spec:** `docs/superpowers/specs/2026-08-13-contrato-de-entrada-identidade-e-nested-design.md`

## Global Constraints

- **Backend roda no container:** `docker compose exec -T app php artisan test`. O host WSL não tem
  mbstring.
- **Pint roda no host, de dentro de `backend/`, SEMPRE com argumentos:**
  `cd backend && ./vendor/bin/pint <arquivos>`. Nunca sem argumento.
- **`frontend/src/shared/types/generated.ts` NÃO se edita à mão** (CLAUDE.md §5.3). Corrige-se o DTO
  e regenera com `docker compose exec -T app php artisan typescript:transform`.
- **A task que regenera ajusta os consumidores no MESMO commit** (`.claude/rules/generated-types.md`).
- **Teste de regressão só vale depois de visto reprovando contra o código antigo.** `git stash` no
  fix, roda, `git stash pop`. Teste que passa nos dois estados prova nada (lição 10).
- **Mensagens de validação em PT-BR**, como a vizinhança. A Q-6 (idioma canônico) está travada em
  decisão do João e este bloco não a reabre.
- **Um commit por task**, no main tree, na branch `feat/contrato-de-entrada-identidade-e-nested`.
- **Baseline medido em 2026-08-13, não herdado:** backend **573 passed, 5 skipped (2104 assertions)**;
  frontend **28 arquivos / 138 testes**, `pnpm lint` limpo, `pnpm build` verde.
- **Projeção deste plano: 590 casos no backend** (573 + 17). O frontend não ganha teste novo — o
  runner cobre hooks de `shared/` e `useClientForm` é hook de feature (spec §5).

---

## Mapa de arquivos

**Criados**

| Path | Responsabilidade |
|---|---|
| `backend/tests/Feature/Identity/EnsureIdentityAvailableTest.php` | unidade do helper: agregação, arquivado, RUT nulo, `exceptUserId` |
| `backend/tests/Feature/Identity/ContratoDeIdentidadeTest.php` | HTTP: e-mail duplicado nos quatro caminhos que hoje devolvem 500 |
| `backend/app/Shared/Data/Attributes/ReadOnlyCollection.php` | marcador de coleção nested que só existe na saída |

**Modificados**

| Path | O quê |
|---|---|
| `backend/app/Domains/Identity/Services/UserProvisioner.php` | `ensureIdentityAvailable` + `duplicateStatus`; `provision` fecha o invariante; os dois `ensure*` antigos morrem |
| `backend/app/Domains/Identity/Actions/CreateStudentAction.php` | remove a checagem redundante de e-mail |
| `backend/app/Domains/Identity/Services/StudentResolver.php` | remove a checagem redundante de e-mail |
| `backend/app/Domains/Identity/Actions/CreateStaffUserAction.php` | passa pela porta única |
| `backend/app/Domains/Identity/Actions/UpdateStaffUserAction.php` | passa pela porta única |
| `backend/app/Domains/Identity/Actions/UpdateStudentAction.php` | passa pela porta única |
| `backend/app/Domains/Identity/Actions/UpdateRedatorAction.php` | passa pela porta única (fecha o e-mail) |
| `backend/app/Domains/Commercial/Actions/UpdateClientAction.php` | porta única + guarda `Optional` nos dois nested |
| `backend/app/Domains/Commercial/Actions/CreateClientAction.php` | guarda `Optional` + obrigatoriedade de contato no POST |
| `backend/app/Domains/Commercial/Data/ClientData.php` | `addresses`/`contacts` viram `Optional`; `contacts` vira `sometimes` |
| `backend/app/Domains/Commercial/Data/BudgetData.php` | `$quotes` e `$files` recebem `#[ReadOnlyCollection]` |
| `backend/tests/Feature/Shared/UniquenessInsideTransactionTest.php` | filtro de SQL novo; cliente e redator passam a exigir `['rut','email']` |
| `backend/tests/Feature/Comercial/ClientContactMinimumTest.php` | um caso é **invertido**; os outros seis ficam |
| `backend/tests/Feature/Shared/PersistenceLawsTest.php` | guarda da lei de coleção nested |
| `frontend/src/shared/types/generated.ts` | regenerado (nunca editado à mão) |
| `frontend/src/features/commercial/hooks/useClientForm.ts` | tipo de formulário estreitado + normalização na fronteira |
| `frontend/src/features/commercial/components/Client/ContactFields.tsx` | tipa por `ClientContactData`, não por `ClientData['contacts']` |
| `frontend/src/features/commercial/components/Client/ContactCard.tsx` | idem |
| `frontend/src/features/commercial/components/Client/ClientsTable.tsx` | `?.` nos dois sítios de listagem |
| `.claude/rules/generated-types.md` · `docs/der-fisico.md` | a lei passa a apontar para a guarda |

---

## Task 1: `ensureIdentityAvailable` nasce, sem call-site

Introduz a porta única e as quatro mensagens. **Nenhum dos nove caminhos muda ainda** — os dois
métodos antigos seguem intactos e públicos, então o comportamento externo é idêntico. Isolar assim é
o que permite ao revisor rejeitar a forma do helper sem rejeitar a migração, e vice-versa.

**Files:**
- Modify: `backend/app/Domains/Identity/Services/UserProvisioner.php`
- Test: `backend/tests/Feature/Identity/EnsureIdentityAvailableTest.php` (criar)

**Interfaces:**
- Consumes: nada.
- Produces: `UserProvisioner::ensureIdentityAvailable(?string $rut, string $email, ?int $exceptUserId = null): ?string`
  — devolve o RUT já normalizado por `Rut::parse()->format()`, ou `null` quando `$rut` veio `null`.
  Lança `Illuminate\Validation\ValidationException` com as chaves `rut` e/ou `email`.

- [ ] **Step 1: Escrever o teste que falha**

Criar `backend/tests/Feature/Identity/EnsureIdentityAvailableTest.php`:

```php
<?php

namespace Tests\Feature\Identity;

use App\Domains\Identity\Models\User;
use App\Domains\Identity\Services\UserProvisioner;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

/**
 * Porta única da checagem de identidade. O invariante é RUT **e** e-mail: até
 * este bloco, `provision()` fechava só o RUT e quatro dos nove caminhos de
 * escrita esqueciam a outra metade — a colisão de e-mail subia QueryException e
 * virava 500 genérico no `ProblemDetails`.
 *
 * O `withTrashed` é a razão de a checagem existir: os índices únicos de
 * `users.rut` e `users.email` não distinguem `deleted_at`, então sem ela o
 * conflito com um cadastro ARQUIVADO também viraria 500.
 */
class EnsureIdentityAvailableTest extends TestCase
{
    use RefreshDatabase;

    private function provisioner(): UserProvisioner
    {
        return app(UserProvisioner::class);
    }

    /** @return array<string, array<int, string>> */
    private function erros(callable $operacao): array
    {
        try {
            $operacao();
        } catch (ValidationException $e) {
            return $e->errors();
        }

        $this->fail('esperava ValidationException');
    }

    public function test_devolve_o_rut_formatado_quando_nao_ha_colisao(): void
    {
        $rut = $this->provisioner()->ensureIdentityAvailable('13.456.789-9', 'novo@lotus.cl');

        $this->assertSame('13.456.789-9', $rut);
    }

    public function test_rut_vivo_e_email_vivo_sobem_juntos_no_mesmo_422(): void
    {
        User::factory()->create(['rut' => '13.456.789-9', 'email' => 'ana@lotus.cl']);

        $erros = $this->erros(fn () => $this->provisioner()
            ->ensureIdentityAvailable('13.456.789-9', 'ana@lotus.cl'));

        $this->assertSame(['rut', 'email'], array_keys($erros));
        $this->assertSame('Este RUT já está cadastrado.', $erros['rut'][0]);
        $this->assertSame('Este e-mail já está cadastrado.', $erros['email'][0]);
    }

    public function test_duplicado_arquivado_tem_mensagem_propria_nos_dois_campos(): void
    {
        $user = User::factory()->create(['rut' => '13.456.789-9', 'email' => 'ana@lotus.cl']);
        $user->delete();

        $erros = $this->erros(fn () => $this->provisioner()
            ->ensureIdentityAvailable('13.456.789-9', 'ana@lotus.cl'));

        $this->assertSame(
            'Este RUT pertence a um cadastro arquivado. Restaure-o em vez de criar outro.',
            $erros['rut'][0],
        );
        $this->assertSame(
            'Este e-mail pertence a um cadastro arquivado. Restaure-o em vez de criar outro.',
            $erros['email'][0],
        );
    }

    public function test_rut_nulo_pula_a_checagem_de_rut_e_nao_pula_a_de_email(): void
    {
        User::factory()->create(['rut' => null, 'email' => 'ana@lotus.cl']);

        $this->assertNull($this->provisioner()->ensureIdentityAvailable(null, 'livre@lotus.cl'));

        $erros = $this->erros(fn () => $this->provisioner()
            ->ensureIdentityAvailable(null, 'ana@lotus.cl'));

        $this->assertSame(['email'], array_keys($erros));
    }

    public function test_except_user_id_ignora_o_proprio_registro(): void
    {
        $user = User::factory()->create(['rut' => '13.456.789-9', 'email' => 'ana@lotus.cl']);

        $rut = $this->provisioner()
            ->ensureIdentityAvailable('13.456.789-9', 'ana@lotus.cl', $user->id);

        $this->assertSame('13.456.789-9', $rut);
    }

    public function test_colisao_so_de_email_nao_reclama_do_rut(): void
    {
        User::factory()->create(['rut' => '12.345.678-5', 'email' => 'ana@lotus.cl']);

        $erros = $this->erros(fn () => $this->provisioner()
            ->ensureIdentityAvailable('13.456.789-9', 'ana@lotus.cl'));

        $this->assertSame(['email'], array_keys($erros));
    }
}
```

- [ ] **Step 2: Rodar e ver reprovar**

```bash
docker compose exec -T app php artisan test --filter=EnsureIdentityAvailableTest
```

Esperado: FAIL nos seis casos, com `Call to undefined method
App\Domains\Identity\Services\UserProvisioner::ensureIdentityAvailable()`.

- [ ] **Step 3: Implementar o helper**

Em `backend/app/Domains/Identity/Services/UserProvisioner.php`, acrescentar os dois métodos **abaixo**
de `ensureEmailAvailable` (que fica intacto nesta task) e importar `Illuminate\Database\Eloquent\Model`
não é necessário — só o que já está importado:

```php
    /**
     * Porta única da checagem de identidade: RUT **e** e-mail, na mesma
     * chamada. Existe porque a metade era esquecível — `provision()` fechava só
     * o RUT e quatro dos nove caminhos de escrita não chamavam a outra, o que
     * transformava colisão de e-mail em 500 genérico.
     *
     * As duas checagens rodam SEMPRE e os erros sobem juntos: quem cadastrou um
     * registro repetido inteiro corrige os dois campos num passe, em vez de
     * descobrir o e-mail depois de consertar o RUT.
     *
     * `$rut` nulo significa "esta entidade não tem RUT" (staff) — pula a
     * checagem de RUT e NUNCA a de e-mail.
     *
     * @param  int|null  $exceptUserId  id do próprio user, ignorado na checagem (update)
     * @return string|null o RUT já formatado, ou null quando não havia RUT
     */
    public function ensureIdentityAvailable(?string $rut, string $email, ?int $exceptUserId = null): ?string
    {
        $erros = [];
        $formatado = null;

        if ($rut !== null) {
            $formatado = Rut::parse($rut)->format();

            if ($estado = $this->duplicateStatus('rut', $formatado, $exceptUserId)) {
                $erros['rut'] = $estado === 'arquivado'
                    ? 'Este RUT pertence a um cadastro arquivado. Restaure-o em vez de criar outro.'
                    : 'Este RUT já está cadastrado.';
            }
        }

        if ($estado = $this->duplicateStatus('email', $email, $exceptUserId)) {
            $erros['email'] = $estado === 'arquivado'
                ? 'Este e-mail pertence a um cadastro arquivado. Restaure-o em vez de criar outro.'
                : 'Este e-mail já está cadastrado.';
        }

        if ($erros !== []) {
            throw ValidationException::withMessages($erros);
        }

        return $formatado;
    }

    /**
     * `withTrashed` porque os índices únicos de `users.rut` e `users.email` não
     * distinguem `deleted_at`: sem ele o conflito com um arquivado viraria 500.
     * A coluna vem na projeção — e não uma segunda consulta — porque o operador
     * precisa saber que o caminho é RESTAURAR, não criar outro. Como as duas
     * colunas são únicas, há no máximo uma linha por valor.
     *
     * @return 'vivo'|'arquivado'|null
     */
    private function duplicateStatus(string $coluna, string $valor, ?int $exceptUserId): ?string
    {
        $duplicado = User::withTrashed()
            ->where($coluna, $valor)
            ->when($exceptUserId !== null, fn ($q) => $q->where('id', '!=', $exceptUserId))
            ->first(['id', 'deleted_at']);

        if ($duplicado === null) {
            return null;
        }

        return $duplicado->deleted_at === null ? 'vivo' : 'arquivado';
    }
```

- [ ] **Step 4: Rodar e ver passar**

```bash
docker compose exec -T app php artisan test --filter=EnsureIdentityAvailableTest
```

Esperado: PASS, 6 casos.

- [ ] **Step 5: Rodar a suíte inteira — nada pode ter mudado de comportamento**

```bash
docker compose exec -T app php artisan test
```

Esperado: **579 passed, 5 skipped** (573 + 6). Nenhuma falha nova: os nove caminhos ainda usam os
métodos antigos.

- [ ] **Step 6: Pint e commit**

```bash
cd backend && ./vendor/bin/pint app/Domains/Identity/Services/UserProvisioner.php tests/Feature/Identity/EnsureIdentityAvailableTest.php
cd .. && git add backend/app/Domains/Identity/Services/UserProvisioner.php backend/tests/Feature/Identity/EnsureIdentityAvailableTest.php
git commit -m "feat(identity): ensureIdentityAvailable como porta unica de RUT e e-mail"
```

---

## Task 2: `provision()` fecha os creates

`provision()` passa a checar as duas colunas, o que fecha `CreateClientAction` e `CreateRedatorAction`
de uma vez, e torna redundantes as duas chamadas soltas de e-mail que os caminhos de aluno faziam.

**Files:**
- Modify: `backend/app/Domains/Identity/Services/UserProvisioner.php:23-41` (corpo de `provision`)
- Modify: `backend/app/Domains/Identity/Actions/CreateStudentAction.php:49`
- Modify: `backend/app/Domains/Identity/Services/StudentResolver.php:63`
- Test: `backend/tests/Feature/Identity/ContratoDeIdentidadeTest.php` (criar)

**Interfaces:**
- Consumes: `UserProvisioner::ensureIdentityAvailable(?string, string, ?int): ?string` (Task 1).
- Produces: `provision()` mantém a mesma assinatura
  `provision(string $type, string $name, string $rut, string $email, ?string $phone = null): User`
  — o que muda é que ela agora recusa e-mail duplicado.

- [ ] **Step 1: Escrever o teste que falha**

Criar `backend/tests/Feature/Identity/ContratoDeIdentidadeTest.php`:

```php
<?php

namespace Tests\Feature\Identity;

use App\Domains\Identity\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\CreatesDomainRecords;
use Tests\TestCase;

/**
 * O invariante de identidade visto pela porta HTTP, nos quatro caminhos que o
 * esqueciam. Antes deste bloco, e-mail duplicado nestes quatro subia
 * QueryException do índice único e caía no `default` do match do
 * `ProblemDetails` — 500 genérico, sem campo, onde o operador precisava de 422
 * dizendo QUAL campo.
 */
class ContratoDeIdentidadeTest extends TestCase
{
    use CreatesDomainRecords;
    use RefreshDatabase;

    /** @return array<string, mixed> */
    private function clientPayload(array $override = []): array
    {
        return array_merge([
            'name' => 'ACME',
            'legal_name' => 'ACME',
            'rut' => '13.456.789-9',
            'email' => 'acme@lotus.cl',
            'type' => 'client',
            'contacts' => [['name' => 'Ana', 'is_primary' => true]],
        ], $override);
    }

    /** @return array<string, mixed> */
    private function redatorPayload(array $override = []): array
    {
        return array_merge([
            'name' => 'Bruno',
            'rut' => '13.456.789-9',
            'email' => 'bruno@lotus.cl',
        ], $override);
    }

    public function test_post_de_cliente_com_email_duplicado_da_422_e_nao_500(): void
    {
        $this->actingAsAdmin();
        User::factory()->create(['email' => 'ocupado@lotus.cl']);

        $this->postJson('/api/clients', $this->clientPayload(['email' => 'ocupado@lotus.cl']))
            ->assertStatus(422)
            ->assertHeader('Content-Type', 'application/problem+json')
            ->assertJsonPath('errors.email.0', 'Este e-mail já está cadastrado.');

        $this->assertDatabaseMissing('clients', ['legal_name' => 'ACME']);
    }

    public function test_post_de_redator_com_email_duplicado_da_422_e_nao_500(): void
    {
        $this->actingAsAdmin();
        User::factory()->create(['email' => 'ocupado@lotus.cl']);

        $this->postJson('/api/redatores', $this->redatorPayload(['email' => 'ocupado@lotus.cl']))
            ->assertStatus(422)
            ->assertHeader('Content-Type', 'application/problem+json')
            ->assertJsonPath('errors.email.0', 'Este e-mail já está cadastrado.');

        $this->assertSame(0, User::where('type', 'redator')->count());
    }
}
```

- [ ] **Step 2: Rodar e ver reprovar — e conferir que reprova pelo motivo certo**

```bash
docker compose exec -T app php artisan test --filter=ContratoDeIdentidadeTest
```

Esperado: FAIL nos dois, com `Expected response status code [422] but received 500`. **Se algum
reprovar com 201, pare:** significa que o e-mail do payload não colidiu e o teste não está medindo o
que promete.

- [ ] **Step 3: Fechar o invariante dentro do `provision`**

Em `backend/app/Domains/Identity/Services/UserProvisioner.php`, trocar a linha 30:

```php
        $rut = $this->ensureRutAvailable($rut);
```

por

```php
        $rut = $this->ensureIdentityAvailable($rut, $email);
```

E atualizar o docblock da classe (linhas 9-20), trocando a frase
`Normaliza o RUT, garante unicidade (incluindo soft-deletados, ...)` por:

```
 * Normaliza o RUT, garante unicidade de RUT **e** e-mail (incluindo
 * soft-deletados, pois os índices únicos de users.rut/users.email não
 * distinguem deleted_at) e cria o User inativo com senha placeholder: atores
 * não logam até o fluxo de ativação (RN-01).
```

- [ ] **Step 4: Remover as duas chamadas redundantes**

Em `backend/app/Domains/Identity/Actions/CreateStudentAction.php`, apagar a linha 49 e a linha em
branco que a segue:

```php
            $this->provisioner->ensureEmailAvailable($data->email);

```

Em `backend/app/Domains/Identity/Services/StudentResolver.php`, apagar a linha 63:

```php
                $this->provisioner->ensureEmailAvailable($email);
```

- [ ] **Step 5: Rodar os dois casos novos**

```bash
docker compose exec -T app php artisan test --filter=ContratoDeIdentidadeTest
```

Esperado: PASS, 2 casos.

- [ ] **Step 6: Rodar a suíte inteira**

```bash
docker compose exec -T app php artisan test
```

Esperado: **581 passed, 5 skipped** (579 + 2). Atenção especial a
`CreateStudentActionTest` e aos testes de importação de matrícula, que exercitam
`CreateStudentAction` e `StudentResolver` — se algum reprovar, a remoção do Step 4 mudou
comportamento e não só apagou repetição.

- [ ] **Step 7: Pint e commit**

```bash
cd backend && ./vendor/bin/pint app/Domains/Identity/Services/UserProvisioner.php app/Domains/Identity/Services/StudentResolver.php app/Domains/Identity/Actions/CreateStudentAction.php tests/Feature/Identity/ContratoDeIdentidadeTest.php
cd .. && git add backend/app/Domains/Identity backend/tests/Feature/Identity/ContratoDeIdentidadeTest.php
git commit -m "fix(identity): provision passa a checar e-mail, fechando os dois creates"
```

---

## Task 3: os cinco caminhos restantes migram, e os métodos antigos morrem

Os quatro updates e o `CreateStaffUserAction` passam pela porta única, e
`ensureRutAvailable`/`ensureEmailAvailable` são **deletados** — é a privatização da D5 na forma mais
forte: o método não fica privado, deixa de existir, então nenhum caminho consegue checar metade do
invariante.

**Files:**
- Modify: `backend/app/Domains/Identity/Services/UserProvisioner.php` (apagar os dois métodos)
- Modify: `backend/app/Domains/Identity/Actions/CreateStaffUserAction.php:30-34`
- Modify: `backend/app/Domains/Identity/Actions/UpdateStaffUserAction.php:43-47`
- Modify: `backend/app/Domains/Identity/Actions/UpdateStudentAction.php:25-26`
- Modify: `backend/app/Domains/Identity/Actions/UpdateRedatorAction.php:57`
- Modify: `backend/app/Domains/Commercial/Actions/UpdateClientAction.php:35`
- Modify: `backend/tests/Feature/Shared/UniquenessInsideTransactionTest.php`
- Test: `backend/tests/Feature/Identity/ContratoDeIdentidadeTest.php` (acrescentar 4 casos)

**Interfaces:**
- Consumes: `UserProvisioner::ensureIdentityAvailable(?string, string, ?int): ?string` (Task 1).
- Produces: `UserProvisioner` expõe **apenas** `provision()` e `ensureIdentityAvailable()`.

- [ ] **Step 1: Escrever os casos que faltam**

Acrescentar a `backend/tests/Feature/Identity/ContratoDeIdentidadeTest.php`, antes do fecha-chaves da
classe:

```php
    public function test_put_de_cliente_com_email_duplicado_da_422_e_nao_500(): void
    {
        $this->actingAsAdmin();
        User::factory()->create(['email' => 'ocupado@lotus.cl']);
        $client = $this->makeClientWithUser([], ['rut' => '13.456.789-9']);
        $client->contacts()->create(['name' => 'Ana', 'is_primary' => true]);

        $this->putJson("/api/clients/{$client->id}", $this->clientPayload([
            'email' => 'ocupado@lotus.cl',
        ]))
            ->assertStatus(422)
            ->assertJsonPath('errors.email.0', 'Este e-mail já está cadastrado.');

        $this->assertSame($client->user->email, $client->user->fresh()->email);
    }

    public function test_put_de_redator_com_email_duplicado_da_422_e_nao_500(): void
    {
        $this->actingAsAdmin();
        User::factory()->create(['email' => 'ocupado@lotus.cl']);
        // `CreatesDomainRecords` não tem helper de redator; esta é a forma usada
        // em `UniquenessInsideTransactionTest:85-87`.
        $redator = Redator::create([
            'user_id' => User::factory()->redator()->create(['rut' => '13.456.789-9'])->id,
        ]);

        $this->putJson("/api/redatores/{$redator->id}", $this->redatorPayload([
            'email' => 'ocupado@lotus.cl',
        ]))
            ->assertStatus(422)
            ->assertJsonPath('errors.email.0', 'Este e-mail já está cadastrado.');
    }

    /**
     * Os dois campos colidindo sobem juntos, pela porta HTTP e não só na
     * unidade: é o que o operador lê quando duplicou o cadastro inteiro.
     */
    public function test_rut_e_email_duplicados_sobem_no_mesmo_422(): void
    {
        $this->actingAsAdmin();
        User::factory()->create(['rut' => '13.456.789-9', 'email' => 'ocupado@lotus.cl']);

        $this->postJson('/api/clients', $this->clientPayload(['email' => 'ocupado@lotus.cl']))
            ->assertStatus(422)
            ->assertJsonPath('errors.rut.0', 'Este RUT já está cadastrado.')
            ->assertJsonPath('errors.email.0', 'Este e-mail já está cadastrado.');
    }

    /**
     * Staff é o caminho que a porta única mudou SEM ter defeito: `users.rut` é
     * nullable e as duas Actions decidiam entre null e a checagem por ternário.
     * O comportamento tem de sair idêntico.
     */
    public function test_staff_sem_rut_continua_sendo_aceito(): void
    {
        $this->actingAsAdmin();

        $this->postJson('/api/users', [
            'name' => 'Carla',
            'email' => 'carla@lotus.cl',
            'rut' => null,
            'role' => 'admin',
            'is_active' => true,
            'password' => 'senha123',
        ])->assertStatus(201);

        $this->assertDatabaseHas('users', ['email' => 'carla@lotus.cl', 'rut' => null]);
    }
```

Acrescentar `use App\Domains\Identity\Models\Redator;` aos imports do arquivo.

Os dois pontos que o desenho dependia foram conferidos no repositório: `CreatesDomainRecords` tem só
`makeClientWithUser` e `makeCourse` (nada de redator — daí o `Redator::create` acima), e a rota de
staff é `Route::apiResource('users', UserController::class)` em `app/Domains/Identity/routes.php:30`,
ou seja `POST /api/users`.

- [ ] **Step 2: Rodar e ver reprovar**

```bash
docker compose exec -T app php artisan test --filter=ContratoDeIdentidadeTest
```

Esperado: os dois `put_*` reprovam com `Expected response status code [422] but received 500`; o
`rut_e_email` reprova por faltar `errors.email`; o `staff_sem_rut` **passa** (é o controle — ele
mede o que não pode mudar).

- [ ] **Step 3: Migrar os cinco caminhos**

`backend/app/Domains/Commercial/Actions/UpdateClientAction.php` — trocar a linha 35 e o comentário
acima dela por:

```php
            // Unicidade DENTRO da transação que escreve, pelas duas colunas: o
            // e-mail faltava aqui e a colisão virava 500 (achado 4).
            $rut = $this->users->ensureIdentityAvailable($data->rut, $data->email, $client->user_id);
```

`backend/app/Domains/Identity/Actions/UpdateRedatorAction.php` — trocar a linha 57 por:

```php
                $rut = $this->users->ensureIdentityAvailable($data->rut, $data->email, $redator->user_id);
```

`backend/app/Domains/Identity/Actions/UpdateStudentAction.php` — trocar as linhas 25-26 por:

```php
            $rut = $this->provisioner->ensureIdentityAvailable($data->rut, $data->email, $user->id);
```

`backend/app/Domains/Identity/Actions/CreateStaffUserAction.php` — trocar as linhas 30-34 por:

```php
            $rut = $this->users->ensureIdentityAvailable(
                ($data->rut instanceof Optional || $data->rut === null) ? null : $data->rut,
                $data->email,
            );
```

`backend/app/Domains/Identity/Actions/UpdateStaffUserAction.php` — trocar as linhas 40-47
(comentário incluído) por:

```php
            // Unicidade DENTRO da transação: fora dela, check e write são duas
            // operações independentes. Porta única — RUT nulo (staff pode não
            // ter) pula só a checagem de RUT, nunca a de e-mail.
            $rut = $this->users->ensureIdentityAvailable(
                ($data->rut instanceof Optional || $data->rut === null) ? null : $data->rut,
                $data->email,
                $user->id,
            );
```

- [ ] **Step 4: Apagar os dois métodos antigos**

Em `backend/app/Domains/Identity/Services/UserProvisioner.php`, remover `ensureRutAvailable`
(linhas 43-66, docblock incluído) e `ensureEmailAvailable` (linhas 68-83, docblock incluído).

Conferir que sobrou zero chamador:

```bash
grep -rn "ensureRutAvailable\|ensureEmailAvailable" backend/app backend/tests
```

Esperado: só o comentário de `backend/tests/Feature/Cadastros/RedatorDocumentRollbackTest.php:176`,
que cita o nome em prosa. Trocar esse comentário para citar `ensureIdentityAvailable` — a lição 13 é
sobre doc que aponta para nome morto, e a guarda de paths não pega nome de método.

- [ ] **Step 5: Ajustar o `UniquenessInsideTransactionTest`**

O filtro atual casa `select exists`, e `duplicateStatus` compila `select "id", "deleted_at" from
"users" ... limit 1`. Substituir o corpo do listener em
`backend/tests/Feature/Shared/UniquenessInsideTransactionTest.php:115-125` por:

```php
        DB::listen(function (QueryExecuted $query) use (&$niveis, $colunas): void {
            // A checagem projeta `deleted_at` (é ela que distingue "já
            // cadastrado" de "cadastro arquivado"), e o UPDATE de `users`
            // também contém `rut = ?` — daí o filtro por SELECT + a coluna
            // projetada, em vez de pelo nome da coluna sozinho. O caractere de
            // citação muda entre sqlite e MySQL, então nada de aspas no match.
            if (! str_starts_with($query->sql, 'select') || ! str_contains($query->sql, 'deleted_at')) {
                return;
            }

            foreach ($colunas as $coluna) {
                if (str_contains($query->sql, $coluna)) {
                    $niveis[$coluna][] = $query->connection->transactionLevel();
                }
            }
        });
```

E, porque a assimetria que o teste registrava deixou de existir, trocar as duas chamadas de cliente
e redator para exigir as duas colunas:

- linha 68: `$niveis = $this->niveisDeUnicidade(['rut', 'email'], fn () => ...` e, depois do
  `assertChecouDentroDaTransacao($niveis, 'rut')`, acrescentar
  `$this->assertChecouDentroDaTransacao($niveis, 'email');`
- linha 89: idem para o redator.

Atualizar o docblock da classe (linhas 20-32), trocando a frase que descreve os irmãos que já faziam
certo por:

```
 * Desde o bloco `contrato-de-entrada-identidade-e-nested`, os NOVE caminhos de
 * escrita de identidade passam pela mesma porta (`ensureIdentityAvailable`), e
 * os três aqui exercem as duas colunas — a assimetria que este arquivo
 * registrava (staff com ['rut','email'], cliente e redator só com ['rut'])
 * deixou de existir.
```

- [ ] **Step 6: Rodar tudo**

```bash
docker compose exec -T app php artisan test
```

Esperado: **585 passed, 5 skipped** (581 + 4). `UniquenessInsideTransactionTest` verde com seis
asserções de nível em vez de quatro.

- [ ] **Step 7: Provar que os casos novos discriminam (lição 10)**

Desfazer só a migração do cliente e ver o teste do PUT reprovar:

```bash
cd /home/jvbat/projetos/lotus
git stash push backend/app/Domains/Commercial/Actions/UpdateClientAction.php
```

Isso deixa o arquivo chamando `ensureRutAvailable`, que já não existe — o vermelho esperado é
`Call to undefined method`. Se em vez disso o teste **passar**, pare: o caso não está medindo o
caminho que promete.

```bash
docker compose exec -T app php artisan test --filter=test_put_de_cliente_com_email_duplicado
git stash pop
git status --porcelain   # tem de voltar limpo, sem o stash
```

- [ ] **Step 8: Pint e commit**

```bash
cd backend && ./vendor/bin/pint app/Domains/Identity/Services/UserProvisioner.php app/Domains/Identity/Actions/CreateStaffUserAction.php app/Domains/Identity/Actions/UpdateStaffUserAction.php app/Domains/Identity/Actions/UpdateStudentAction.php app/Domains/Identity/Actions/UpdateRedatorAction.php app/Domains/Commercial/Actions/UpdateClientAction.php tests/Feature/Shared/UniquenessInsideTransactionTest.php tests/Feature/Identity/ContratoDeIdentidadeTest.php tests/Feature/Cadastros/RedatorDocumentRollbackTest.php
cd .. && git add backend/
git commit -m "refactor(identity): os nove caminhos passam pela porta unica"
```

---

## Task 4: `ClientData` nested vira `Optional`, e os consumidores no mesmo commit

A única task que atravessa backend e frontend, e ela atravessa por regra, não por conveniência:
regenerar `generated.ts` sem corrigir os consumidores deixa o build vermelho
(`.claude/rules/generated-types.md`).

**Files:**
- Modify: `backend/app/Domains/Commercial/Data/ClientData.php:40-45,51-61`
- Modify: `backend/app/Domains/Commercial/Actions/CreateClientAction.php:45-51`
- Modify: `backend/app/Domains/Commercial/Actions/UpdateClientAction.php:52-60`
- Modify: `backend/tests/Feature/Comercial/ClientContactMinimumTest.php:54-67`
- Modify: `frontend/src/shared/types/generated.ts` (regenerado)
- Modify: `frontend/src/features/commercial/hooks/useClientForm.ts`
- Modify: `frontend/src/features/commercial/components/Client/ContactFields.tsx`
- Modify: `frontend/src/features/commercial/components/Client/ContactCard.tsx`
- Modify: `frontend/src/features/commercial/components/Client/ClientsTable.tsx`
- Test: `backend/tests/Feature/Cadastros/ClientCrudTest.php` (acrescentar 4 casos)

**Interfaces:**
- Consumes: nada das tasks anteriores.
- Produces: `ClientData::$addresses` e `$contacts` passam a ser `array|Optional`; no TS,
  `ClientData['addresses']` e `['contacts']` passam a ser `X[] | undefined`. Nasce o tipo exportado
  `ClientFormFields` em `useClientForm.ts`, que é o tipo do formulário — `addresses` e `contacts`
  sempre arrays.

- [ ] **Step 1: Escrever os casos que faltam**

Acrescentar a `backend/tests/Feature/Cadastros/ClientCrudTest.php`, antes do fecha-chaves:

```php
    /**
     * Achado 5. `ClientData::$addresses` era `array = []` e o update faz
     * replace-total: a chave ausente soft-deletava todos os endereços em
     * silêncio. Ausente = não mexe; `[]` = apaga.
     */
    public function test_update_sem_a_chave_addresses_preserva_os_enderecos(): void
    {
        $this->actingAsAdmin();
        $id = $this->postJson('/api/clients', $this->payload())->json('id');
        $antes = ClientAddress::where('client_id', $id)->pluck('id')->all();

        $payload = $this->payload();
        unset($payload['addresses']);

        $this->putJson("/api/clients/{$id}", $payload)->assertOk();

        $this->assertSame($antes, ClientAddress::where('client_id', $id)->pluck('id')->all());
    }

    public function test_update_com_addresses_vazio_apaga(): void
    {
        $this->actingAsAdmin();
        $id = $this->postJson('/api/clients', $this->payload())->json('id');

        $this->putJson("/api/clients/{$id}", $this->payload(['addresses' => []]))->assertOk();

        $this->assertSame(0, ClientAddress::where('client_id', $id)->count());
    }

    /**
     * A regra do Drive (`entidade-contato-cliente.md`, ratificada 2026-07-31)
     * muda de casa, não de valor: sai de `rules()`, que agora precisa aceitar a
     * omissão no PUT, e entra na Action do create.
     */
    public function test_store_sem_a_chave_contacts_da_422(): void
    {
        $this->actingAsAdmin();
        $payload = $this->payload();
        unset($payload['contacts']);

        $this->postJson('/api/clients', $payload)
            ->assertStatus(422)
            ->assertJsonPath('errors.contacts.0', 'O cliente precisa de ao menos um contato.');
    }

    public function test_store_sem_a_chave_addresses_cria_sem_endereco(): void
    {
        $this->actingAsAdmin();
        $payload = $this->payload();
        unset($payload['addresses']);

        $id = $this->postJson('/api/clients', $payload)->assertStatus(201)->json('id');

        $this->assertSame(0, ClientAddress::where('client_id', $id)->count());
    }
```

Nada a importar: `ClientCrudTest.php:6` já traz `use App\Domains\Commercial\Models\ClientAddress;`, e
o `payload()` do arquivo (linhas 15-27) já monta `addresses` e `contacts` — conferido, não suposto.

- [ ] **Step 2: Inverter o caso que a D6 contradiz**

Em `backend/tests/Feature/Comercial/ClientContactMinimumTest.php`, o caso das linhas 54-67
(`test_update_sem_a_chave_contacts_da_422_em_vez_de_apagar`) afirma exatamente o comportamento que
este bloco muda. Substituí-lo por:

```php
    /**
     * A omissão deixou de ser 422 e passou a ser preservação: `contacts` é
     * `Optional`, e ausente significa "não mexi na coleção". O `min:1` continua
     * valendo para quando a chave VIER — o caso acima prova isso —, e a
     * obrigatoriedade no create mora na `CreateClientAction`.
     */
    public function test_update_sem_a_chave_contacts_preserva_a_colecao(): void
    {
        $this->actingAsAdmin();
        $client = $this->makeClientWithUser();
        $ana = $client->contacts()->create(['name' => 'Ana', 'is_primary' => true]);
        $payload = $this->payload();
        unset($payload['contacts']);

        $this->putJson("/api/clients/{$client->id}", $payload)->assertOk();

        $this->assertSame([$ana->id], $client->contacts()->pluck('id')->all());
    }
```

E atualizar o docblock da classe (linhas 13-22), trocando o parágrafo sobre a interação com a regra
de coleção nested por:

```
 * Interação com a regra de coleção nested: `ClientData::$contacts` é
 * `Optional` desde o bloco `contrato-de-entrada-identidade-e-nested`. Ausente =
 * não mexe (o caso de preservação abaixo); `[]` = apaga, e aí o `min:1`
 * recusa. A obrigatoriedade no create mora na `CreateClientAction`, porque
 * `rules()` é estático e não distingue verbo.
```

- [ ] **Step 3: Rodar e ver reprovar**

```bash
docker compose exec -T app php artisan test --filter="ClientCrudTest|ClientContactMinimumTest"
```

Esperado: `test_update_sem_a_chave_addresses_preserva_os_enderecos` reprova (os ids somem),
`test_store_sem_a_chave_contacts_da_422` reprova pela **mensagem** (hoje vem a do `required` do
Laravel), `test_store_sem_a_chave_addresses_cria_sem_endereco` passa (controle), e
`test_update_sem_a_chave_contacts_preserva_a_colecao` reprova com 422.

- [ ] **Step 4: `ClientData` — tipo, docblock e `rules()`**

Em `backend/app/Domains/Commercial/Data/ClientData.php`, trocar as linhas 40-45 por:

```php
        /** @var array<ClientAddressData>|Optional */
        #[DataCollectionOf(ClientAddressData::class)]
        public array|Optional $addresses = new Optional,
        /** @var array<ClientContactData>|Optional */
        #[DataCollectionOf(ClientContactData::class)]
        public array|Optional $contacts = new Optional,
```

O `|Optional` no `@var` **não é estilo**: é ele que faz o `| undefined` aparecer no `generated.ts`.
`BudgetData::$files` é `array|Optional = []` com `@var FileData[]` e sai sem o `| undefined`.

Trocar `rules()` (linhas 51-61) por:

```php
    public static function rules(): array
    {
        return [
            'rut' => ['required', 'string', new ValidRut],
            // `sometimes`, não `required`: a coleção é `Optional`, e omitir a
            // chave num PUT significa "não mexi nos contatos" — antes apagava
            // todos em silêncio. `min:1` segue valendo quando a chave VEM, e a
            // obrigatoriedade do create mora na CreateClientAction, porque
            // rules() é estático e não distingue verbo (Drive
            // `entidade-contato-cliente.md`, ratificado em 2026-07-31).
            'contacts' => ['sometimes', 'array', 'min:1'],
        ];
    }
```

E atualizar o docblock da classe (linhas 18-22), acrescentando ao fim:

```
 * `addresses` e `contacts` são `Optional` na ENTRADA: ausente = não mexe na
 * coleção; `[]` = apaga tudo (explícito). A saída (`fromModel`) sempre preenche
 * as duas.
```

- [ ] **Step 5: As duas Actions**

Em `backend/app/Domains/Commercial/Actions/CreateClientAction.php`, trocar as linhas 45-51 por:

```php
            // A regra "um ou mais contatos" (Drive, ratificada 2026-07-31) mora
            // aqui, e não em rules(): a coleção precisa ser Optional para o PUT
            // parar de apagá-la por omissão, e rules() é estático — não sabe o
            // verbo. Precedente: CreateStudentAction, que também exige na Action
            // o que o DTO não consegue exigir sozinho.
            if ($data->contacts instanceof Optional || $data->contacts === []) {
                throw ValidationException::withMessages([
                    'contacts' => 'O cliente precisa de ao menos um contato.',
                ]);
            }

            if (! $data->addresses instanceof Optional) {
                foreach ($data->addresses as $address) {
                    $client->addresses()->create($address->toArray());
                }
            }

            foreach ($data->contacts as $contact) {
                $client->contacts()->create($contact->toArray());
            }
```

**A guarda de contatos entra antes do `$user = $this->users->provision(...)`?** Não: ela fica onde o
bloco acima está, depois da criação do client, dentro da mesma `DB::transaction` — a exceção desfaz
tudo. Manter a ordem do arquivo. Acrescentar o import
`use Illuminate\Validation\ValidationException;` no topo.

Em `backend/app/Domains/Commercial/Actions/UpdateClientAction.php`, trocar as linhas 50-60 por:

```php
            // Replace dos nested. Soft-delete por instância para a auditoria
            // registrar o que saiu (o builder emitiria UPDATE sem eventos).
            // Coleção `Optional` (ausente do payload) NÃO entra no replace: quem
            // não mandou a coleção não pediu para apagá-la (achado 5).
            if (! $data->addresses instanceof Optional) {
                $client->addresses()->get()->each(fn (ClientAddress $a) => $a->delete());
                foreach ($data->addresses as $address) {
                    $client->addresses()->create($address->toArray());
                }
            }

            if (! $data->contacts instanceof Optional) {
                $client->contacts()->get()->each(fn (ClientContact $c) => $c->delete());
                foreach ($data->contacts as $contact) {
                    $client->contacts()->create($contact->toArray());
                }
            }
```

- [ ] **Step 6: Rodar o backend inteiro**

```bash
docker compose exec -T app php artisan test
```

Esperado: **589 passed, 5 skipped** (585 + 4). Atenção a `ClientDataValidationTest:37-38`, que lê
`$data->addresses[0]` — ele manda `addresses` no payload, então continua array e segue verde. Se
reprovar, o `Optional` vazou para um caminho que manda a chave, e o desenho está errado, não o teste.

- [ ] **Step 7: Regenerar os tipos**

```bash
docker compose exec -T app php artisan typescript:transform
git diff --stat frontend/src/shared/types/generated.ts
```

Esperado: `addresses` e `contacts` de `ClientData` passam a `ClientAddressData[] | undefined` e
`ClientContactData[] | undefined`. **Nenhuma outra linha do arquivo pode mudar** — se mudar, algum
DTO foi tocado sem querer.

- [ ] **Step 8: Ver o build quebrar, com a conta exata**

```bash
cd frontend && pnpm build 2>&1 | grep "error TS" | wc -l
```

Esperado: **17**. É o número medido na spec (§1.4). Se vier diferente, o repositório mudou desde a
medição e a lista de arquivos do Step 9 precisa ser reconferida antes de editar.

- [ ] **Step 9: Corrigir os quatro consumidores**

`frontend/src/features/commercial/hooks/useClientForm.ts` — trocar o topo do arquivo (linhas 1-23)
por:

```ts
import { useCrudForm } from '@shared/hooks'
import type { ClientAddressData, ClientContactData, ClientData } from '@shared/types/generated'
import type { DialogMode } from '@shared/lib'
import { clientsApi } from '@shared/api/clientsApi'

export type ClientDialogMode = DialogMode

/**
 * O que o formulário edita. `addresses` e `contacts` são `Optional` no contrato
 * (ausente = não mexe), mas aqui são array sempre: esta tela é a dona das duas
 * coleções e manda as duas inteiras. Mesmo padrão de `CourseFormFields`.
 */
export type ClientFormFields = Omit<ClientData, 'addresses' | 'contacts'> & {
  addresses: ClientAddressData[]
  contacts: ClientContactData[]
}

const EMPTY_ADDRESS: ClientAddressData = {
  id: undefined, line1: null, line2: null, number: null, commune: null, city: null, region: null, zip_code: null, is_primary: true,
}

const EMPTY_CONTACT: ClientContactData = {
  id: undefined, name: '', job_title: null, email: null, phone: null, is_primary: false,
}

const EMPTY: ClientFormFields = {
  id: undefined, name: '', rut: '', email: '', phone: null,
  legal_name: '', type: 'client', business_activity: null,
  photo_url: null,
  addresses: [{ ...EMPTY_ADDRESS }],
  contacts: [{ ...EMPTY_CONTACT, is_primary: true }],
}
```

e, dentro de `useClientForm`, trocar a abertura (linhas 24-33 do arquivo original) por:

```ts
export function useClientForm(
  client: ClientData | null,
  mode: ClientDialogMode,
  onDone: () => void,
  afterCreate?: (created: ClientData) => Promise<void>,
) {
  // A resposta da API sempre traz as duas coleções; o `| undefined` do tipo é
  // do lado da ENTRADA (Optional). Normaliza aqui para o form não carregar o
  // undefined.
  const entity: ClientFormFields | null = client
    ? { ...client, addresses: client.addresses ?? [], contacts: client.contacts ?? [] }
    : null

  const { crud, setForm } = useCrudForm<ClientFormFields, ClientData>(clientsApi, {
    entity,
```

O resto do arquivo não muda: `patchContact`, `setPrimaryContact`, `addContact`, `removeContact`,
`setAddr` e `addr: crud.form.addresses[0] ?? EMPTY_ADDRESS` já operam sobre `ClientFormFields`, onde
as coleções são array.

`frontend/src/features/commercial/components/Client/ContactFields.tsx` — trocar o import da linha 3 e
as duas assinaturas:

```ts
import type { ClientContactData } from '@shared/types/generated'
```

```ts
  contacts: ClientContactData[]
```

```ts
  onPatch: (i: number, patch: Partial<ClientContactData>) => void
```

`frontend/src/features/commercial/components/Client/ContactCard.tsx` — mesma troca de import e:

```ts
  contact: ClientContactData
```

```ts
  onPatch: (patch: Partial<ClientContactData>) => void
```

`frontend/src/features/commercial/components/Client/ClientsTable.tsx` — linhas 82 e 87:

```tsx
        body={(c: ClientData) => c.addresses?.[0]?.commune ?? "—"}
```

```tsx
          <span className="font-semibold">{c.contacts?.length ?? 0}</span>
```

Em `ClientsTable` o `?.` é o certo e não um curativo: a listagem consome a resposta da API, cujo tipo
agora admite `undefined` pelo lado da entrada. O `?? 0` diz a verdade sobre um cliente sem contatos.

- [ ] **Step 10: Build, lint e testes do frontend**

```bash
cd frontend && pnpm build && pnpm lint && pnpm test
```

Esperado: build verde, lint limpo, **28 arquivos / 138 testes** — o mesmo baseline; nenhum teste novo
no frontend (spec §5).

- [ ] **Step 11: Provar que o caso de `addresses` discrimina (lição 10)**

```bash
cd /home/jvbat/projetos/lotus
git stash push backend/app/Domains/Commercial/Actions/UpdateClientAction.php
docker compose exec -T app php artisan test --filter=test_update_sem_a_chave_addresses_preserva_os_enderecos
git stash pop
git status --porcelain
```

Esperado: com a Action antiga de volta, o caso **reprova** (os endereços são apagados). Árvore limpa
depois do `pop`.

- [ ] **Step 12: Pint e commit**

```bash
cd backend && ./vendor/bin/pint app/Domains/Commercial/Data/ClientData.php app/Domains/Commercial/Actions/CreateClientAction.php app/Domains/Commercial/Actions/UpdateClientAction.php tests/Feature/Cadastros/ClientCrudTest.php tests/Feature/Comercial/ClientContactMinimumTest.php
cd .. && git add backend/ frontend/
git commit -m "fix(commercial): colecao nested do cliente para de apagar por omissao"
```

---

## Task 5: a lei ganha guarda, com a exceção declarada no sítio

`der-fisico.md:103-106` é lei desde o Bloco 5 e o `ClientData` a violou mesmo assim. A guarda é o que
transforma a decisão em mecanismo. Ela **nasce verde** — e por isso precisa ser vista reprovando.

**Files:**
- Create: `backend/app/Shared/Data/Attributes/ReadOnlyCollection.php`
- Modify: `backend/app/Domains/Commercial/Data/BudgetData.php:33-38`
- Modify: `backend/tests/Feature/Shared/PersistenceLawsTest.php`
- Modify: `.claude/rules/generated-types.md` · `docs/der-fisico.md`

**Interfaces:**
- Consumes: `ClientData::$addresses`/`$contacts` já `Optional` (Task 4) — sem isso a guarda nasce
  vermelha.
- Produces: `App\Shared\Data\Attributes\ReadOnlyCollection` (atributo sem parâmetros).

- [ ] **Step 1: Criar o atributo**

`backend/app/Shared/Data/Attributes/ReadOnlyCollection.php`:

```php
<?php

namespace App\Shared\Data\Attributes;

use Attribute;

/**
 * Marca uma coleção nested que só existe na SAÍDA: o `fromModel` a preenche, e
 * nenhuma Action a lê da entrada.
 *
 * A lei "coleção nested read-write nasce `Optional`" (`der-fisico.md`, ADR-04)
 * fala de coleção que a escrita consome — o `#[DataCollectionOf]` sozinho não
 * distingue os dois sentidos. Sem este marcador, a guarda de
 * `PersistenceLawsTest` reprovaria projeções que não violam lei nenhuma; com
 * ele, a exceção fica onde quem lê o DTO a vê, em vez de numa lista dentro do
 * teste.
 */
#[Attribute(Attribute::TARGET_PROPERTY | Attribute::TARGET_PARAMETER)]
class ReadOnlyCollection {}
```

- [ ] **Step 2: Escrever a guarda**

Acrescentar a `backend/tests/Feature/Shared/PersistenceLawsTest.php`, antes do fecha-chaves da classe:

```php
    /**
     * Coleção nested read-write nasce `Optional` (`der-fisico.md`, ADR-04).
     *
     * `array = []` faz o replace-total da Action apagar a coleção de quem só
     * OMITIU o campo — em silêncio, com peso legal. A lei existia desde o Bloco
     * 5 e o `ClientData` a violou mesmo assim, em duas propriedades: convenção
     * sem mecanismo depende de alguém lembrar.
     *
     * A varredura usa reflexão, e não regex, porque a pergunta é sobre o TIPO
     * ("admite Optional?"), que o texto do arquivo responde mal — o default e a
     * união podem estar em linhas diferentes do atributo.
     *
     * `#[ReadOnlyCollection]` é a única saída, e é declarada no sítio: o
     * atributo sozinho não sabe o sentido da coleção, e uma guarda que
     * reprovasse projeção de saída (`BudgetData::$quotes`, `$files` — nenhuma
     * Action as lê) prometeria cobrir uma lei que não é essa.
     *
     * Nasce VERDE: as quatro read-write (`ClientData` ×2, `CourseData` ×2) são
     * `Optional` e as duas de saída estão marcadas.
     */
    public function test_colecao_nested_read_write_nasce_optional(): void
    {
        $encontrados = [];

        foreach ($this->arquivosPhp(base_path('app')) as $arquivo) {
            $local = str_replace(base_path().'/', '', $arquivo);

            if (! str_contains($local, '/Data/')) {
                continue;
            }

            $classe = 'App\\'.str_replace('/', '\\', substr($local, strlen('app/'), -strlen('.php')));

            if (! class_exists($classe)) {
                continue;
            }

            $construtor = (new ReflectionClass($classe))->getConstructor();

            if ($construtor === null) {
                continue;
            }

            foreach ($construtor->getParameters() as $parametro) {
                if ($parametro->getAttributes(DataCollectionOf::class) === []) {
                    continue;
                }

                if ($parametro->getAttributes(ReadOnlyCollection::class) !== []) {
                    continue;
                }

                if ($this->admiteOptional($parametro->getType())) {
                    continue;
                }

                $encontrados[] = "{$classe}::\${$parametro->getName()}";
            }
        }

        sort($encontrados);

        $this->assertSame([], $encontrados, implode("\n", array_merge(
            [
                'Colecao nested read-write nasce Optional (ADR-04, der-fisico.md).',
                'Ausente = nao mexe; [] = apaga. Com `array = []`, o replace-total da Action',
                'apaga a colecao de quem so omitiu o campo — em silencio.',
                'Se a colecao so existe na SAIDA, marque com #[ReadOnlyCollection]. Ocorrencias:',
            ],
            $encontrados,
        )));
    }

    /** O tipo admite `Optional` — direto ou como parte de uma união. */
    private function admiteOptional(?ReflectionType $tipo): bool
    {
        if ($tipo instanceof ReflectionNamedType) {
            return $tipo->getName() === Optional::class;
        }

        if ($tipo instanceof ReflectionUnionType) {
            foreach ($tipo->getTypes() as $parte) {
                if ($parte instanceof ReflectionNamedType && $parte->getName() === Optional::class) {
                    return true;
                }
            }
        }

        return false;
    }
```

E acrescentar os imports no topo do arquivo, abaixo de `use Tests\Support\ScansPhpSource;`:

```php
use App\Shared\Data\Attributes\ReadOnlyCollection;
use ReflectionClass;
use ReflectionNamedType;
use ReflectionType;
use ReflectionUnionType;
use Spatie\LaravelData\Attributes\DataCollectionOf;
use Spatie\LaravelData\Optional;
```

- [ ] **Step 3: Rodar e ver reprovar nas duas de `BudgetData`**

```bash
docker compose exec -T app php artisan test --filter=test_colecao_nested_read_write_nasce_optional
```

Esperado: FAIL nomeando `App\Domains\Commercial\Data\BudgetData::$files` e
`App\Domains\Commercial\Data\BudgetData::$quotes` — e **mais nada**. Se aparecer alguma propriedade
de `ClientData` ou `CourseData`, a Task 4 não fechou o que prometeu.

- [ ] **Step 4: Marcar as duas projeções de saída**

Em `backend/app/Domains/Commercial/Data/BudgetData.php`, trocar as linhas 33-38 por:

```php
        /**
         * Projeção de SAÍDA: o `fromModel` a preenche e nenhuma Action a lê da
         * entrada — cotação se escreve por `POST /budgets/{budget}/quotes`.
         * Por isso `#[ReadOnlyCollection]` em vez de `Optional`.
         *
         * @var array<QuoteData>
         */
        #[DataCollectionOf(QuoteData::class)]
        #[ReadOnlyCollection]
        public array $quotes = [],
        public string|Optional|null $payment_terms = null,
        /**
         * Projeção de SAÍDA, mesma razão de `$quotes`: arquivo se anexa pela
         * rota própria.
         *
         * @var FileData[]
         */
        #[ReadOnlyCollection]
        public array|Optional $files = [],
```

E acrescentar `use App\Shared\Data\Attributes\ReadOnlyCollection;` aos imports.

- [ ] **Step 5: Rodar e ver passar**

```bash
docker compose exec -T app php artisan test --filter=test_colecao_nested_read_write_nasce_optional
```

Esperado: PASS.

- [ ] **Step 6: Sonda — a guarda tem de reprovar de verdade (lição 10)**

Criar `backend/app/Domains/Commercial/Data/SondaColecaoData.php`:

```php
<?php

namespace App\Domains\Commercial\Data;

use Spatie\LaravelData\Attributes\DataCollectionOf;
use Spatie\LaravelData\Data;

class SondaColecaoData extends Data
{
    public function __construct(
        /** @var array<ClientContactData> */
        #[DataCollectionOf(ClientContactData::class)]
        public array $itens = [],
    ) {}
}
```

```bash
docker compose exec -T app php artisan test --filter=test_colecao_nested_read_write_nasce_optional
```

Esperado: **FAIL** nomeando `App\Domains\Commercial\Data\SondaColecaoData::$itens`.

Agora acrescentar `#[ReadOnlyCollection]` abaixo do `#[DataCollectionOf]` da sonda (com o import) e
rodar de novo — esperado: **PASS**. Isso prova as duas direções: a guarda vê a violação, e o
marcador é o que a silencia.

```bash
rm backend/app/Domains/Commercial/Data/SondaColecaoData.php
git status --porcelain    # nenhum arquivo de sonda pode sobrar
```

- [ ] **Step 7: A lei passa a apontar para a guarda**

Em `.claude/rules/generated-types.md`, na seção "Regras de forma do DTO", trocar a linha da coleção
nested por:

```markdown
- **Coleção nested read-write nasce `Optional`** (`array|Optional = new Optional`), com `|Optional`
  **no docblock `@var` também** — é ele que produz o `| undefined` no `generated.ts`. Ausente = não
  mexe; `[]` = apaga. Default `array = []` apaga a coleção de quem só omitiu o campo — em silêncio,
  com peso legal. Ref.: `CourseData::$templates`/`$modules`, `ClientData::$addresses`/`$contacts`.
  **Coleção que só existe na saída leva `#[ReadOnlyCollection]`** (`App\Shared\Data\Attributes`).
  Guarda: `tests/Feature/Shared/PersistenceLawsTest.php`.
```

Em `docs/der-fisico.md`, na linha da lei (bloco "Coleção nested no DTO é `Optional`, não `array = []`"),
acrescentar ao fim do parágrafo:

```markdown
  Desde 2026-08-13 a lei tem mecanismo, e não só convenção:
  `tests/Feature/Shared/PersistenceLawsTest.php` reprova coleção nested sem `Optional`, e projeção
  de saída se declara com `#[ReadOnlyCollection]` em vez de entrar numa allowlist.
```

- [ ] **Step 8: Suíte inteira, incluindo a guarda de doc**

```bash
docker compose exec -T app php artisan test
cd frontend && pnpm test
```

Esperado backend: **590 passed, 5 skipped** (589 + 1). Esperado frontend: 28/138 — e atenção ao
`repo-docs-refs.test.ts`, que confere que todo path citado em doc normativo existe: os dois textos
novos citam `tests/Feature/Shared/PersistenceLawsTest.php` e `App\Shared\Data\Attributes`, e o
primeiro é path (existe), o segundo é namespace (não é path, não entra na varredura).

- [ ] **Step 9: Pint e commit**

```bash
cd backend && ./vendor/bin/pint app/Shared/Data/Attributes/ReadOnlyCollection.php app/Domains/Commercial/Data/BudgetData.php tests/Feature/Shared/PersistenceLawsTest.php
cd .. && git add backend/ .claude/rules/generated-types.md docs/der-fisico.md
git commit -m "test(shared): guarda da lei de colecao nested, excecao no sitio"
```

---

## Task 6: gate

Verificação pura. **Nenhum commit de código** — se algo reprovar, o conserto é uma emenda à task que
o causou, não um commit de gate.

**Files:** nenhum modificado.

- [ ] **Step 1: Ferramentas**

```bash
docker compose exec -T app php artisan test
cd frontend && pnpm test && pnpm lint && pnpm build
```

Esperado: backend **590 passed, 5 skipped**; frontend **28 arquivos / 138 testes**, lint limpo, build
verde. Anotar o número de assertions — a projeção do plano é de casos, não de asserções.

- [ ] **Step 2: Pint em todos os `.php` do bloco**

```bash
cd backend && ./vendor/bin/pint --test $(cd .. && git diff main...HEAD --name-only | grep '^backend/.*\.php$' | sed 's|^backend/||')
```

Esperado: `{"tool":"pint","result":"passed"}`.

- [ ] **Step 3: `generated.ts` sem diff depois de regenerar**

```bash
docker compose exec -T app php artisan typescript:transform
git status --porcelain frontend/
```

Esperado: vazio.

- [ ] **Step 4: Sem sonda no diff**

```bash
git diff main...HEAD -- backend/app frontend/src | grep -nE "^\+.*(dd\(|dump\(|console\.log|SONDA|Sonda)"
```

Esperado: nada. Conferir também que `backend/app/Domains/Commercial/Data/SondaColecaoData.php` não
existe.

- [ ] **Step 5: Órfãos e leis**

```bash
grep -rn "ensureRutAvailable\|ensureEmailAvailable" backend/app backend/tests
grep -rn "ensureIdentityAvailable" backend/app | wc -l
grep -rn "ReadOnlyCollection" backend/app | wc -l
git diff main...HEAD --stat -- backend/database/
```

Esperado: zero ocorrência dos dois métodos mortos; **seis** chamadas de `ensureIdentityAvailable`
(a declaração, a de dentro do `provision` e os cinco call-sites diretos — conferir a conta e nomear
os arquivos); três de `ReadOnlyCollection` (a classe e as duas marcações); e `backend/database/`
**sem uma linha** — este bloco não toca schema.

- [ ] **Step 6: E2E contra a API real**

Subir a stack, logar com sessão Sanctum (cookie + CSRF, `Origin` e `Accept` nos dois lados) e provar,
com o corpo da resposta e não só o status:

1. `POST /api/clients` com e-mail de um usuário existente → **422 `application/problem+json`** com
   `errors.email`.
2. `PUT /api/clients/{id}` com o e-mail de outro → **422**, e o e-mail do cliente **não mudou** no
   banco.
3. `POST /api/redatores` e `PUT /api/redatores/{id}` com e-mail ocupado → **422** com `errors.email`.
4. RUT **e** e-mail ocupados no mesmo POST → **422** com as **duas** chaves.
5. Um usuário soft-deletado com RUT/e-mail conhecidos → o 422 traz a mensagem de **arquivado**,
   distinta da de vivo, nos dois campos.
6. `PUT /api/clients/{id}` **sem** `addresses` → **200**, e os ids dos endereços no banco são os
   mesmos de antes.
7. `PUT /api/clients/{id}` **sem** `contacts` → **200**, contatos preservados.
8. `POST /api/clients` sem `contacts` → **422** com a mensagem da Action.
9. `PUT /api/clients/{id}` com `addresses: []` → **200** e a coleção vazia.
10. Um `POST` e um `PUT` **normais** (com as duas coleções) seguem funcionando — o fail-closed não
    pode fechar o caminho da tela.
11. `POST`/`PUT` de staff **sem RUT** seguem aceitos.

- [ ] **Step 7: Declarar a mutação no banco de dev**

Anotar, nomeando ids: clientes/redatores/usuários criados no e2e, o usuário arquivado usado no caso 5
e os endereços/contatos tocados. **Nada de `migrate:fresh`, `refresh`, `reset` ou seeder** — o banco
carrega o `LOT-2026-1001` corrompido de propósito e ele tem de continuar intocado.

- [ ] **Step 8: Escrever o que o gate NÃO provou**

Sem maquiagem, no relatório de execução: a corrida de unicidade concorrente segue aberta (a suíte
roda sqlite, onde não há corrida, e a defesa é o `unique` do MySQL); nenhuma tela vista renderizada
(o frontend só mudou de tipo); e o frontend não ganhou teste automatizado, então a regressão de
`useClientForm` é pega por `tsc`, não por caso.

---

## Handoff de execução

**`executor: claude`**, sem `paths_autorizados`.

Três razões, todas de lei ou julgamento:

1. **`generated.ts`** (CLAUDE.md §5.3) é regenerado na Task 4, e a mesma task decide a forma dos
   consumidores TS — decisão de tipagem, não edição mecânica.
2. **A forma do erro HTTP muda em quatro rotas** (500 → 422 com campo), e o envelope RFC 7807 é lei
   §5.4. A escolha de mensagem por campo e por estado (vivo/arquivado) é conteúdo, não transformação.
3. **Três tasks fecham por sonda vista reprovando** (3, 4 e 5), e sonda é julgamento: o Step 7 da
   Task 3 e o Step 6 da Task 5 exigem ler o vermelho e decidir se ele prova o que promete — foi
   exatamente aí que os dois blocos anteriores acharam teste que passava contra o código velho.

---

## Auto-revisão do plano

**Cobertura da spec, seção a seção:**

| Spec | Task |
|---|---|
| §3.1 interface do helper | 1 |
| §3.2 os nove caminhos | 2 (creates via `provision`) + 3 (os cinco restantes) |
| §3.3 forma do 422 (D7+D8) | 1 (unidade) + 3 (HTTP) |
| §3.4 ruído do `UniquenessInsideTransactionTest` | 3, Step 5 |
| §4.1 DTO `Optional` + docblock | 4, Step 4 |
| §4.2 guarda `Optional` nas Actions | 4, Step 5 |
| §4.3 obrigatoriedade do POST na Action | 4, Step 5 |
| §4.4 matriz de comportamento | 4, Steps 1-2 (as seis linhas viram caso ou já existem) |
| §5 frontend, 17 erros | 4, Steps 8-10 |
| §6 guarda da lei + `#[ReadOnlyCollection]` | 5 |
| §7 DoD, itens 1-12 | 6 (Steps 1-6), com 3/6/7 medidos também na suíte |
| §8 risco ALTO | fora do plano — entra no `/revisar-sprint` |
| §9 fora de escopo | nenhuma task o toca |

**Consistência de tipos:** `ensureIdentityAvailable(?string, string, ?int): ?string` é a mesma
assinatura na Task 1 (declaração), Task 2 (`provision`) e Task 3 (cinco call-sites).
`duplicateStatus` é privado e só a Task 1 o cita. `ClientFormFields` nasce na Task 4 e nenhuma task
posterior o usa. `ReadOnlyCollection` nasce na Task 5 e é usado no mesmo commit.

**Contagem:** 573 → 579 (T1, +6) → 581 (T2, +2) → 585 (T3, +4) → 589 (T4, +4) → **590** (T5, +1). A
Task 4 inverte um caso existente sem somar.
