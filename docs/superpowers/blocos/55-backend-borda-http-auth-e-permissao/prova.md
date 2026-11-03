# Bloco 55 — prova

Medido em 2026-11-03 na lane 55 (offset 1, HTTP `:8081`), HEAD `b36ffdd6` mais esta prova.
Commits do bloco: `0b40be13` (T1), `373208ec` (T2), `c6475628` e `c5f48e01` (T3), `b36ffdd6` (T4).

## DoD da spec §9

### 1. `permission:` fora dos `routes.php`, 11 controllers com `HasMiddleware`, suíte verde

```
$ grep -rn "permission:" backend/app/Domains/*/routes.php
(nenhuma saída)
```

O plano (T5 Step 2) previa sobrar o comentário reescrito de `Identity/routes.php`. A correção da T3
(`c5f48e01`) reescreveu esse comentário sem a string `permission:`, então o grep volta vazio.

```
$ grep -ln "implements HasMiddleware" <os 11 controllers da spec D2> | wc -l
11
```

```
$ docker compose exec -T app php artisan test
Tests:    7 skipped, 1811 passed (13559 assertions)
```

Nenhuma asserção de status de teste existente mudou. Nenhum teste fixava 403 para id não-staff com
ator sem permissão (relatório da T2), então a troca 403→404 do D7a não alterou teste antigo. Os
diffs das T1–T4 só criam testes novos: `UnauthenticatedWithoutAcceptTest`, `StaffUserBindingTest`,
`PermissionRouteMiddlewareTest` e `PermissionCatalogOrphanTest`.

Duas respostas mudaram, as duas da mesma raiz do D7a. `PUT api/users/{user}` com id não-staff e corpo
inválido era 422 e agora é 404; `POST api/users/{user}/photo` com id não-staff e upload inválido era 422
e agora é 404. O binding staff recusa antes da validação do Data, e antes o `abort_unless` ficava no
corpo do método, depois da validação. A spec §7 (`spec.md:155-156`) previu a ordem: "o binding roda
antes da validação do Data, então o 404 vem antes de 422". Nenhum teste antigo fixava esses 422. A
troca vai pedir o ok do João na aceitação.

A permissão por método+URI das 130 rotas `api/*` ficou idêntica antes e depois da T3. O
implementador comparou `route:list --json` e o revisor da T3 conferiu o estado final.

### 2. Catraca de permissão de rota vista reprovar (T3)

Cada sonda foi revertida por cópia de backup, sem stash.

| Sonda | Teste vermelho | Saída |
|---|---|---|
| `Route::middleware('permission:commercial.client.update')->group` em volta de `DELETE clients/{client}/photo` | `test_permissao_vem_so_do_controller` | lista `DELETE api/clients/{client}/photo (permission:commercial.client.update)` |
| `new Middleware(...)` do `ClientPhotoController` comentado (rota autenticada sem permissão) | `test_toda_rota_autenticada_declara_permissao` | lista `DELETE` e `POST api/clients/{client}/photo` |
| `'show'` tirado do `only:` de `identity.user.view` no `UserController` (Review Focus 2) | `test_toda_rota_autenticada_declara_permissao` | lista `GET\|HEAD api/users/{user}` |
| `PermissionMiddleware::using('commercial.client.update')` numa rota (correção da T3) | `test_permissao_vem_so_do_controller` | matcher antigo: 4 passed; matcher novo: 1 failed |
| `Route::delete('/me', ...)` autenticada e sem permissão, ao lado de `GET me` (exceção por método+URI) | `test_toda_rota_autenticada_declara_permissao` e `test_a_lista_sem_permissao_e_fiel` | lista `DELETE api/me`; com a chave só por URI passava calado |

O vermelho antes de mover (T3 Step 2) foi `1 failed, 3 passed`. O teste
`permissao_vem_so_do_controller` listou as 22 rotas dos 5 grupos.

### 3. Guardas do escopo staff removidas; catraca de `{user}` vista reprovar (T2)

```
$ grep -rn "abort_unless(\$user->type\|where('type', 'admin')" backend/app/Domains/Identity
backend/app/Domains/Identity/Models/User.php:92:        $query->where('type', 'admin');
```

A única ocorrência é o próprio escopo `User::staff()`, que agora é a fonte única. Os 6 `abort_unless`
(4 no `UserController`, 2 no `UserPhotoController`) e os 2 `where('type', 'admin')` dos controllers
saíram. O plano previa grep vazio sem contar o escopo novo que ele mesmo cria.

| Sonda | Teste vermelho | Saída |
|---|---|---|
| `resolveRouteBinding` removido de `User` | `test_toda_rota_com_user_recusa_id_nao_staff_com_404` e `test_ator_sem_permissao_e_id_nao_staff_recebe_404_d7a` | "Expected 404 but received 200" / "… received 403" |
| `resolveArquivado(User::staff(), …)` trocado por `User::query()` no `restore` | `test_toda_rota_com_user_recusa_id_nao_staff_com_404` | "Expected 404 but received 200" em `POST api/users/{user}/restore` (id arquivado) |

### 4. Catraca de órfã vista reprovar nos dois sentidos e verde (T4)

| Sonda | Teste vermelho | Saída |
|---|---|---|
| `'identity.sonda.orfa' => 'x'` no `descriptions()` | `test_toda_permissao_do_catalogo_tem_consumidor` | cita `identity.sonda.orfa` |
| `permission:commercial.client.updat` no `ClientContactController` | `test_toda_permissao_de_rota_existe_no_catalogo` | cita `commercial.client.updat` |

Estado do bloco: `PermissionCatalogOrphanTest` 3 passed. Catálogo 43, roteador 42, código 9: não há
órfã nem fantasma.

### 5. 401 RFC 7807 sem `Accept` (T1)

O vermelho antes do conserto foi `1 failed, 1 passed`, com 500 `Route [login] not defined`
(relatório da T1). Contra o stack da lane:

```
$ curl -s -i http://localhost:8081/api/courses/archived
HTTP/1.1 401 Unauthorized
Content-Type: application/problem+json
{"type":"https:\/\/lotus.cl\/errors\/unauthenticated","title":"No autenticado","status":401,...}

$ curl -s -i -H 'Accept: application/json' http://localhost:8081/api/courses/archived
HTTP/1.1 401 Unauthorized
Content-Type: application/problem+json
```

### 6. Pint

`./vendor/bin/pint --test` nos 21 arquivos de `backend/` tocados pelo bloco: `passed`.

## Verificação externa

Fica pendente até o deploy da `main`: `producao GET /api/courses/archived -> 401`.
