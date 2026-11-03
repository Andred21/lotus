# Bloco 55 — `backend-borda-http-auth-e-permissao` — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `permission:` declarada só no controller com catraca, escopo staff no binding de `{user}`,
catraca de permissão órfã e 401 (não 500) para `/api/*` sem sessão e sem `Accept`.

**Architecture:** Três catracas novas leem o roteador montado (molde do
`AuthenticatedRouteMiddlewareTest`), não o texto dos arquivos. O escopo staff entra no model `User`
(`staff()` + `resolveRouteBinding`), no molde do `Turma`. O P-91 é um ajuste no `withMiddleware` do
`bootstrap/app.php`.

**Tech Stack:** Laravel 13 / PHP 8.3, spatie/laravel-permission, PHPUnit (sqlite `:memory:`).

**Spec:** `docs/superpowers/blocos/55-backend-borda-http-auth-e-permissao/spec.md`

## Global Constraints

- Nenhuma permissão nova, renomeada ou removida; a permissão de cada rota depois do bloco é a de
  antes (spec §4). Única mudança de resposta admitida: 403→404 do D7a.
- `users/{user}/photo` continua em `identity.user.update`; `courses/{course}/redatores` em
  `catalog.course.update` (spec §4).
- Erros sobem ao handler global RFC 7807; nada de resposta montada à mão (CLAUDE.md §5.4).
- Rota autenticada sem permissão fora da lista D3 → **PARE e reporte ao João** (spec D3). Permissão
  órfã real → **PARE e reporte** (spec D6).
- Cada catraca nova é vista reprovar por sonda; a sonda é revertida e registrada no relatório da task
  (comando, saída vermelha resumida).
- Testes rodam no container da lane: `docker compose exec -T app php artisan test --filter=<Nome>`
  (stack da lane: `docker compose up -d` na raiz da worktree, offset 1, HTTP `:8081`).
- Pint só nos arquivos tocados: `cd backend && ./vendor/bin/pint <arquivos>`.

## Review Focus

1. Mesmo URI com métodos de permissões diferentes (`clients/{client}` GET × PUT): a catraca de
   permissão avalia **por rota (método + URI)**, nunca num mapa indexado só por URI que sobrescreve
   métodos — o `AuthenticatedRouteMiddlewareTest` faz isso e não serve de molde nesse ponto. Teste
   na T3.
2. Método público de controller com `HasMiddleware` fora de todo `only:` fica sem permissão — a
   catraca da T3 tem de pegá-lo (regra 1). Sonda na T3.
3. Formas `permission:a|b` e `permission:a,guard` no parse de nomes (T3 regra 3 e T4). Teste
   unitário do parse na T4.
4. `{user}` não numérico (`/api/users/abc`) dá 404, não 500, com o `resolveRouteBinding` novo. Teste
   na T2.
5. Rota `{user}` com id de user **arquivado** não-staff: tanto as rotas com binding quanto o `restore`
   (que recebe `int`) dão 404. Teste na T2 (laço com id vivo e id arquivado).

---

### Task 1: P-91 — 401 RFC 7807 sem `Accept`

**Files:**
- Modify: `backend/bootstrap/app.php` (bloco `withMiddleware`, linhas ~37–129)
- Create: `backend/tests/Feature/Shared/UnauthenticatedWithoutAcceptTest.php`

**Interfaces:**
- Consumes: nada.
- Produces: nada consumido por outra task.

- [ ] **Step 1: Teste que falha**

```php
public function test_api_sem_sessao_e_sem_accept_devolve_401_problem_json(): void
{
    // `get()` e não `getJson()`: o caso do P-91 é justamente o pedido sem Accept.
    $this->get('/api/courses/archived')
        ->assertStatus(401)
        ->assertHeader('Content-Type', 'application/problem+json');
}

public function test_api_sem_sessao_com_accept_continua_401(): void
{
    $this->getJson('/api/courses/archived')
        ->assertStatus(401)
        ->assertHeader('Content-Type', 'application/problem+json');
}
```

- [ ] **Step 2: Rodar e ver vermelho**

Run: `docker compose exec -T app php artisan test --filter=UnauthenticatedWithoutAcceptTest`
Expected: o primeiro FALHA com 500 (`Route [login] not defined`); o segundo passa.

- [ ] **Step 3: Conserto em `bootstrap/app.php`**

`$middleware->redirectGuestsTo(...)` que devolve `null` para `api/*` (o `Authenticate` então lança
`AuthenticationException` sem tentar `route('login')`, e o `shouldRenderJsonWhen('api/*')` existente
renderiza o 401). Comentário curto citando o P-91. O conserto não pode exigir rota `login` nomeada
(spec D8).

- [ ] **Step 4: Rodar e ver verde** — mesmo comando; Expected: 2 PASS. Rodar também
  `--filter=AuthenticatedRouteMiddlewareTest` e `--filter=EnvelopeLocalizadoTest`: PASS.

- [ ] **Step 5: Pint e commit**

```bash
cd backend && ./vendor/bin/pint bootstrap/app.php tests/Feature/Shared/UnauthenticatedWithoutAcceptTest.php && cd ..
git add backend/bootstrap/app.php backend/tests/Feature/Shared/UnauthenticatedWithoutAcceptTest.php
git commit -m "fix(55): 401 RFC 7807 para /api/* sem sessão e sem Accept (P-91)"
```

---

### Task 2: Escopo staff no binding de `{user}` (card 10)

**Files:**
- Modify: `backend/app/Domains/Identity/Models/User.php`
- Modify: `backend/app/Domains/Identity/Http/Controllers/UserController.php` (index, show, update,
  destroy, archived, restore)
- Modify: `backend/app/Domains/Identity/Http/Controllers/UserPhotoController.php` (store, destroy —
  só os `abort_unless`; NÃO adicione `HasMiddleware` aqui, é da T3)
- Create: `backend/tests/Feature/Identity/StaffUserBindingTest.php`

**Interfaces:**
- Consumes: nada.
- Produces: `User::staff()` (builder com `type = 'admin'`), chamável estático
  (`User::staff()->...`) e em builder existente (`User::query()->staff()`, `->onlyTrashed()->staff()`);
  `User::resolveRouteBinding($value, $field = null): ?static` aplicando `staff()`.

- [ ] **Step 1: Testes que falham** (`StaffUserBindingTest`, ator `actingAsSuperadmin()`)

```php
// Laço sobre o roteador: rota nova com {user} entra sem ninguém lembrar (spec objetivo 4).
public function test_toda_rota_com_user_recusa_id_nao_staff_com_404(): void
{
    $this->actingAsSuperadmin();
    $vivo = User::factory()->create(['type' => 'redator', 'rut' => '12.345.679-3']);
    $arquivado = User::factory()->create(['type' => 'aluno', 'rut' => '12.345.680-7']);
    $arquivado->delete();

    $rotas = $this->rotasComParametroUser(); // [[metodo, uri], ...] de api/*, por rota; exclui HEAD
    $this->assertNotEmpty($rotas);

    foreach ($rotas as [$metodo, $uri]) {
        foreach ([$vivo->id, $arquivado->id] as $id) {
            $this->json($metodo, '/'.str_replace('{user}', (string) $id, $uri))
                ->assertNotFound();   // mensagem: "$metodo $uri id=$id"
        }
    }
}

public function test_controle_positivo_staff_resolve(): void
{
    $this->actingAsSuperadmin();
    $staff = User::factory()->create(['type' => 'admin']);
    $this->getJson("/api/users/{$staff->id}")->assertOk();
}

public function test_user_nao_numerico_da_404(): void
{
    $this->actingAsSuperadmin();
    $this->getJson('/api/users/abc')->assertNotFound();
}

public function test_ator_sem_permissao_e_id_nao_staff_recebe_404_d7a(): void
{
    $this->actingAsRedator();
    $vivo = User::factory()->create(['type' => 'aluno', 'rut' => '12.345.681-5']);
    $this->getJson("/api/users/{$vivo->id}")->assertNotFound();
}

public function test_index_e_archived_listam_so_staff(): void
// cria 1 admin + 1 redator vivos e 1 admin + 1 redator arquivados; index só tem os admins vivos,
// archived só o admin arquivado (por id).
```

- [ ] **Step 2: Rodar e ver vermelho**

Run: `docker compose exec -T app php artisan test --filter=StaffUserBindingTest`
Expected: `test_ator_sem_permissao_e_id_nao_staff_recebe_404_d7a` FALHA (403 hoje). Os demais podem
passar hoje (os `abort_unless` cobrem) — o vermelho que importa para eles é a sonda do Step 5.

- [ ] **Step 3: Implementar**

- `User`: escopo `staff()` (`where('type', 'admin')`) e `resolveRouteBinding` que faz
  `$this->newQuery()->staff()->where($field ?? $this->getRouteKeyName(), $value)->first()` (molde de
  `Turma::resolveRouteBinding`). Docblock curto citando card 10 e D7a.
- `UserController`: apagar os 4 `abort_unless`; `index` → `User::staff()->with(...)`; `archived` →
  `User::onlyTrashed()->staff()`; `restore` → `ArchivedListing::resolveArquivado(User::staff(), $user)`.
  Reescrever os dois comentários que citam o `abort_unless` para citar o escopo.
- `UserPhotoController`: apagar os 2 `abort_unless`; o docblock da classe que cita a guarda passa a
  citar o binding.

- [ ] **Step 4: Rodar e ver verde**

Run: `--filter=StaffUserBindingTest`, depois `--filter='StaffUser|UserPhoto|StaffPut|LastLogin|UniqueIndexCollision'`
Expected: PASS. Se algum teste existente fixar 403 para id não-staff com ator sem permissão, ajuste
para 404 e cite no relatório (DoD 1). `test_redator_nao_gerencia_foto_de_nenhuma_entidade` (alvo
admin) continua 403.

- [ ] **Step 5: Sondas (reverter cada uma)**

1. Remover o `resolveRouteBinding` de `User` → `test_toda_rota_com_user...` FALHA.
2. Trocar `resolveArquivado(User::staff(), ...)` por `User::query()` → o mesmo teste FALHA no
   `POST api/users/{user}/restore` com id arquivado.

- [ ] **Step 6: Pint e commit**

```bash
git commit -m "refactor(55): escopo staff no binding de {user} (card 10)"
```

---

### Task 3: `permission:` só no controller, com catraca

**Files:**
- Create: `backend/tests/Feature/Shared/PermissionRouteMiddlewareTest.php`
- Modify: `backend/app/Domains/Catalog/routes.php`, `backend/app/Domains/Commercial/routes.php`,
  `backend/app/Domains/Identity/routes.php`
- Modify (ganham `implements HasMiddleware` + `middleware()`):
  `backend/app/Domains/Catalog/Http/Controllers/CourseRedatorController.php`,
  `backend/app/Domains/Commercial/Http/Controllers/{ClientAddress,ClientContact,ClientPhoto,BudgetFile,QuoteFile}Controller.php`,
  `backend/app/Domains/Identity/Http/Controllers/{RedatorInvitation,RedatorDocument,UserPhoto,RedatorPhoto,StudentPhoto}Controller.php`

**Interfaces:**
- Consumes: T2 já mexeu no `UserPhotoController` (sem `abort_unless`) — partir do estado dela.
- Produces: nada.

- [ ] **Step 1: Catraca** (`PermissionRouteMiddlewareTest`), lendo `RouteFacade::getRoutes()`, só
  `api/*`, **uma entrada por rota** com chave `"{METODOS} {uri}"` (ex.: `"GET|HEAD api/clients/{client}"`).
  "Autenticada" = middleware resolvido com prefixo `Illuminate\Auth\Middleware\Authenticate`;
  "tem permissão" = algum middleware resolvido começa com `Spatie\Permission\Middleware\PermissionMiddleware:`.

```php
private const SEM_PERMISSAO = [   // chave = URI; vale para todos os métodos dele (spec D3)
    'api/logout' => '…', 'api/me' => '…', 'api/versao' => '…',
    'api/profile' => '…', 'api/profile/photo' => '…', 'api/profile/password' => '…',
    'api/profile/documents' => '…', 'api/dashboard/metricas' => '…', 'api/user' => '…',
];  // motivos > 40 caracteres, tirados da spec D3

public function test_toda_rota_autenticada_declara_permissao(): void
// autenticada, sem permissão e URI fora de SEM_PERMISSAO → lista; assertSame([], lista, msg)

public function test_a_lista_sem_permissao_e_fiel(): void
// URIs reais de rotas autenticadas sem permissão == array_keys(SEM_PERMISSAO); motivo > 40

public function test_permissao_vem_so_do_controller(): void
// rota cujo $rota->middleware() (rota + grupos) contém string iniciada por 'permission:' → lista;
// assertSame([], lista, 'declare em HasMiddleware do controller (spec D1)')

public function test_metodos_do_mesmo_uri_sao_avaliados_separados(): void
// Review Focus 1: as chaves de "PUT|PATCH api/clients/{client}" e "GET|HEAD api/clients/{client}"
// existem as duas no mapa da catraca, com permissões diferentes.
```

- [ ] **Step 2: Rodar e ver vermelho**

Run: `--filter=PermissionRouteMiddlewareTest`
Expected: `test_permissao_vem_so_do_controller` FALHA listando as rotas dos 5 grupos de `routes.php`.
Os outros PASSAM. **Se `test_toda_rota_autenticada_declara_permissao` falhar listando rota fora do
D3, PARE e reporte ao João** (não acrescente à lista).

- [ ] **Step 3: Mover** — apagar os 5 `Route::middleware('permission:…')->group` (as rotas de dentro
  ficam soltas no mesmo lugar, dentro do `auth.active`, com seus `throttle`/`scopeBindings`); dar a cada
  controller da spec D2 `implements HasMiddleware` com `new Middleware('permission:<a mesma>')` sem
  `only:` (todos os métodos públicos estavam no grupo). Reescrever o comentário de
  `Identity/routes.php` (~linha 48) que cita o grupo, e o comentário dos nested de Commercial.

- [ ] **Step 4: Verde** — `--filter=PermissionRouteMiddlewareTest` PASS; depois a suíte inteira
  `docker compose exec -T app php artisan test` PASS, **sem** mudar asserção de status.

- [ ] **Step 5: Sondas (reverter cada uma)**

1. Recolocar um `Route::middleware('permission:commercial.client.update')` em volta de uma rota →
   `test_permissao_vem_so_do_controller` FALHA.
2. Comentar a linha `new Middleware(...)` do `ClientPhotoController` → `test_toda_rota_autenticada_declara_permissao` FALHA.
3. Acrescentar ao `UserController` um método público roteado fora de todo `only:` (ou tirar `'show'`
  do `only:`) → mesma falha (Review Focus 2).

- [ ] **Step 6: Pint e commit**

```bash
git commit -m "refactor(55): permission: declarada só no controller, com catraca"
```

---

### Task 4: Catraca de permissão órfã (D-17)

**Files:**
- Create: `backend/tests/Feature/Identity/PermissionCatalogOrphanTest.php`

**Interfaces:**
- Consumes: `PermissionCatalog::descriptions(): array<string,string>`.
- Produces: nada.

- [ ] **Step 1: Testes**

```php
/** @return list<string> nomes de `permission:` no middleware resolvido de toda rota */
private function permissoesDoRoteador(): array
// de cada middleware 'Spatie\…\PermissionMiddleware:<arg>': corta em ',' (guard) e explode '|'

/** @return list<string> nomes literais checados em código */
private function permissoesEmCodigo(): array
// varre backend/app/**/*.php, exceto Identity/Support/PermissionCatalog.php, por
// /->(?:can|cannot|hasPermissionTo|canAny|hasAnyPermission|checkPermissionTo)\(\s*'([a-z_]+\.[a-z_.]+)'/
// ignorar linha de comentário (começa com * ou //) — QuoteLifecycle.php:20 é docblock

public function test_toda_permissao_do_catalogo_tem_consumidor(): void
// array_diff(array_keys(descriptions()), roteador ∪ código) === []

public function test_toda_permissao_de_rota_existe_no_catalogo(): void
// array_diff(permissoesDoRoteador(), array_keys(descriptions())) === []

public function test_parse_de_permission_com_pipe_e_guard(): void
// Review Focus 3: o helper de parse (extraia-o como método estático privado testável) devolve
// ['a.b.c', 'd.e.f'] para 'PermissionMiddleware:a.b.c|d.e.f' e ['a.b.c'] para '…:a.b.c,web'
```

- [ ] **Step 2: Rodar** — `--filter=PermissionCatalogOrphanTest`. Expected: PASS (medido na
  revisão da spec). **Se `test_toda_permissao_do_catalogo_tem_consumidor` falhar com permissão
  real, PARE e reporte ao João** (spec D6).

- [ ] **Step 3: Sondas (reverter cada uma)**

1. Acrescentar `'identity.sonda.orfa' => 'x'` ao `descriptions()` → teste 1 FALHA citando-a.
2. Trocar uma permissão de controller por `permission:commercial.client.updat` → teste 2 FALHA.

- [ ] **Step 4: Pint e commit**

```bash
git commit -m "test(55): catraca de permissão órfã sobre o PermissionCatalog (D-17)"
```

---

### Task 5: Prova do bloco (sessão)

**Files:**
- Create: `docs/superpowers/blocos/55-backend-borda-http-auth-e-permissao/prova.md`

**Interfaces:**
- Consumes: relatórios das T1–T4 (sondas).

- [ ] **Step 1:** Stack da lane no ar; `curl -s -o /dev/null -w '%{http_code}' http://localhost:8081/api/courses/archived`
  → `401`; com `-H 'Accept: application/json'` → `401`; corpo `application/problem+json`.
- [ ] **Step 2:** `grep -rn "permission:" backend/app/Domains/*/routes.php` → só o comentário reescrito, nenhum `Route::middleware('permission`;
  `grep -rn "abort_unless(\$user->type\|where('type', 'admin')" backend/app/Domains/Identity` → nada.
- [ ] **Step 3:** suíte inteira PASS; Pint `--test` nos arquivos tocados limpo.
- [ ] **Step 4:** `prova.md` com cada item do DoD da spec §9, o comando, a saída, e as sondas das
  T2–T4 (qual mudança, qual teste ficou vermelho, revertida).
- [ ] **Step 5:** commit `docs(55): prova do bloco`.

## Grupos paralelos

| Grupo | Tasks | Files: disjuntos | Aresta Consumes/Produces |
|---|---|---|---|
| G1 | 1, 2, 4 | sim. T1: `bootstrap/app.php` + 1 teste novo; T2: `User.php`, `UserController.php`, `UserPhotoController.php` + 1 teste novo; T4: 1 teste novo | nenhuma entre elas |

Task fora de grupo executa e revisa uma a uma: G1 → 3 → 5. A T3 vem depois da T2 porque as duas
tocam `UserPhotoController.php`.

## Handoff de execução

- `executor: claude`. O bloco toca a lei §5.4 (handler RFC 7807, T1) e fixa padrão de projeto (onde
  mora `permission:`, catracas novas), com dois pontos de parada que pedem julgamento (D3, D6).
- Sessão: `opus`, esforço `high`.
- Papéis (`.claude/papeis.md`):
  - `implementador-mecanico` nas T1 e T4;
  - `implementador-integracao` nas T2 e T3;
  - `revisor-task` por task;
  - `re-revisor` nas rodadas de correção;
  - `corretor-tardio` se uma correção passar da 3ª rodada;
  - `revisor-branch` ao fim.
  - A T5 é da sessão: precisa do stack da lane.
- Para o `/finalizar-bloco`: re-apontar a linha `**Bloco:**` da P-54 para "o próximo bloco que
  escrever migration de permissão"; abrir pendência para remover `api/user` (spec D3); fechar P-91 e
  a metade restante do D-17.
