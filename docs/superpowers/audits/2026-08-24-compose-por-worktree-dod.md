# DoD — `compose-por-worktree` (paga a P-03)

> Bloco da `lane-b`, árvore `../lotus-infra`, branch `infra/compose-por-worktree`.
> Medido em 2026-08-24, com a stack do main tree (projeto `lotus`) **no ar durante toda a prova**.
> Saídas literais, sem paráfrase. O que a P-03 dizia não existir — duas árvores servindo a stack
> ao mesmo tempo, sem receita manual — está provado abaixo.

Offset desta árvore (`.env` da raiz, gitignored):

```
LOTUS_DEV_HTTP_PORT=8081
LOTUS_DEV_DB_PORT=3308
LOTUS_DEV_MAILPIT_PORT=8026
LOTUS_DEV_MINIO_PORT=9002
LOTUS_DEV_MINIO_CONSOLE_PORT=9003
LOTUS_DEV_VITE_PORT=5174
```

`git status --short .env` não lista nada — a linha `/.env` do `.gitignore` cobre.

## Step 1 — main tree de pé nas portas históricas

```
$ docker ps --format '{{.Names}}\t{{.Ports}}' | grep '^lotus-'
lotus-app-1	9000/tcp
lotus-nginx-1	0.0.0.0:8080->80/tcp, [::]:8080->80/tcp
lotus-mysql-1	0.0.0.0:3307->3306/tcp, [::]:3307->3306/tcp
lotus-minio-1	0.0.0.0:9000-9001->9000-9001/tcp, [::]:9000-9001->9000-9001/tcp
lotus-mailpit-1	0.0.0.0:8025->8025/tcp, [::]:8025->8025/tcp
lotus-gotenberg-1	3000/tcp

$ curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8080/up
200
```

## Step 3 — a stack desta árvore sobe no offset, sem derrubar a outra

```
$ docker compose ps --format '{{.Name}}\t{{.Ports}}'
lotus-infra-app-1	9000/tcp
lotus-infra-createbuckets-1	
lotus-infra-gotenberg-1	3000/tcp
lotus-infra-mailpit-1	0.0.0.0:8026->8025/tcp, [::]:8026->8025/tcp
lotus-infra-minio-1	0.0.0.0:9002->9000/tcp, [::]:9002->9000/tcp, 0.0.0.0:9003->9001/tcp, [::]:9003->9001/tcp
lotus-infra-mysql-1	0.0.0.0:3308->3306/tcp, [::]:3308->3306/tcp
lotus-infra-nginx-1	0.0.0.0:8081->80/tcp, [::]:8081->80/tcp
```

## Step 4 — banco próprio da árvore

```
$ docker compose exec -T app php artisan migrate --seed --force
  2026_08_22_000003_backfill_redator_role ....................... 24.44ms DONE
   INFO  Seeding database.
  Database\Seeders\RolePermissionSeeder .......................... 169 ms DONE
  Database\Seeders\OperationDemoSeeder ............................ 27 ms DONE
OperationDemoSeeder ignorado: já existem clientes. Rode `migrate:fresh --seed` para recriar o cenário.

$ docker volume ls | grep lotus
...
local     lotus-infra_lotus-db
local     lotus-infra_lotus-minio
...
local     lotus_lotus-db
local     lotus_lotus-minio
```

`lotus-infra_lotus-db` ao lado de `lotus_lotus-db`: o dado do main tree não foi tocado.

## Step 5 — Prova 1: as duas portas respondendo ao mesmo tempo

```
$ curl -s -o /dev/null -w 'main  %{http_code}\n' http://localhost:8080/up
main  200
$ curl -s -o /dev/null -w 'infra %{http_code}\n' http://localhost:8081/up
infra 200
```

## Step 6 — Prova 2: a injeção chegou à aplicação

```
$ docker compose exec -T app php artisan tinker --execute="echo config('app.url'), ' | ', implode(',', config('sanctum.stateful')), ' | ', config('filesystems.disks.s3.url');"
http://localhost:8081 | localhost:5174,localhost:8081 | http://localhost:9002/lotus
```

`backend/.env` desta árvore continua com `APP_URL=http://localhost:8080` — o `environment:` do
serviço `app` venceu, como a medição da Task 1 previu.

## Step 7 — Prova 3: login real ponta a ponta na porta alternativa

```
$ curl -s -c ... -o /dev/null -w 'csrf   %{http_code}\n' http://localhost:8081/sanctum/csrf-cookie
csrf   204
$ curl ... -d 'email=admin@lotus.cl&password=senha123' -o /dev/null -w 'login  %{http_code}\n' http://localhost:8081/api/login
login  200
```

Cookie de sessão gravado no jar, **com o nome real `laravel-session`** (o plano supôs
`lotus-session`; é o único desvio de texto do plano nesta task, e não é da parametrização):

```
#HttpOnly_.localhost	TRUE	/	FALSE	1787613143	laravel-session	eyJpdiI6Ik5EQkZPbFB5...
```

`config('session.cookie')` = `laravel-session`, `domain='localhost'`.

**Prova discriminante** de que foi o `SANCTUM_STATEFUL_DOMAINS` injetado que decidiu — o Sanctum
só trata o request como stateful quando a origem está na lista:

```
$ curl ... -H 'Origin: http://localhost:5174' http://localhost:8081/api/me
me(origin 5174, na lista injetada)       200
$ curl ... -H 'Origin: http://localhost:8081' http://localhost:8081/api/me
me(origin 8081, na lista injetada)       200
$ curl ... -H 'Origin: http://localhost:5173' http://localhost:8081/api/me
me(origin 5173, FORA da lista injetada)  401
```

A porta 5173 é a do main tree: fora da lista desta árvore, ela é recusada. Um `/api/me` sem
`Origin`/`Referer` também dá 401 — comportamento do Sanctum, não da parametrização.

## Step 8 — Prova 4: arquivo no MinIO da porta alternativa

```
$ docker compose exec -T app php artisan tinker --execute="Storage::disk('s3')->put('sonda-p03.txt', 'ok-arvore-infra'); ..."
true conteudo=ok-arvore-infra url=http://localhost:9002/lotus/sonda-p03.txt

$ docker exec -i lotus-app-1 php artisan tinker --execute="echo var_export(Storage::disk('s3')->exists('sonda-p03.txt'),true), ' url=', Storage::disk('s3')->url('sonda-p03.txt');"
false url=http://localhost:9000/lotus/sonda-p03.txt
```

O objeto existe no MinIO desta árvore, com URL pública em `:9002`, e **não existe** no do main
tree, cuja URL segue em `:9000`. Sonda apagada em seguida (`apagada: true`).

Nota medida: `GET` anônimo no objeto devolve **403** nas duas portas — o bucket não é público, então
o código HTTP sozinho não distinguiria as árvores. Por isso a prova é por `exists`/conteúdo, e não
por `curl` anônimo como o plano sugeria. `temporaryUrl()` assina contra `AWS_ENDPOINT`
(`http://minio:9000`, rede interna) e por isso não serve de prova de porta host — é exatamente o
motivo pelo qual `AWS_ENDPOINT` ficou fora da injeção.

## Step 9 — Prova 5: Vite na porta derivada, falando com a API da árvore certa

```
$ pnpm dev
  VITE v8.1.0  ready in 1079 ms
  ➜  Local:   http://localhost:5174/
```

O módulo servido pelo próprio dev server já traz a derivação:

```
$ curl -s http://localhost:5174/src/shared/api/axios.ts | grep -n "localhost\|baseURL"
1:import.meta.env = {..., "VITE_API_URL": "http://localhost:8081"};...
10:	baseURL: import.meta.env.VITE_API_URL,
```

**Login pela UI, no navegador** (`playwright-cli`, Chromium): formulário preenchido com
`admin@lotus.cl` / `senha123` em `http://localhost:5174/login`, botão "Sign in". Requisições
observadas na aba de rede:

```
465. [GET]  http://localhost:8081/api/me                  => [401] Unauthorized   (sonda de sessão, antes do login)
474. [GET]  http://localhost:8081/sanctum/csrf-cookie     => [204] No Content
475. [POST] http://localhost:8081/api/login               => [200] OK
477. [GET]  http://localhost:8081/api/dashboard/metricas… => [200] OK

ocorrências de "localhost:8080" nas requisições: 0
```

Tela autenticada:

```
ADMINISTRATOR … AL Admin Lotus SuperAdmin Welcome, Admin Lotus
```

Vite em 5174 e main tree em 5173 no ar ao mesmo tempo (`curl` 200 nos dois).

## Step 11 — Gate do bloco

```
$ pnpm lint     # eslint ., exit 0, sem saída
$ pnpm build    # tsc -b && vite build → ✓ built in 5.03s
$ pnpm test
 Test Files  101 passed (101)
      Tests  566 passed (566)
```

A suíte rodou **com o `.env` de offset presente na raiz** — condição que, antes do fix `4bc827f9`,
deixava dois casos da catraca vermelhos.

```
$ git diff main...HEAD --stat
 .env.example                                       |  27 +
 .gitignore                                         |   2 +
 CLAUDE.md                                          |   8 +-
 README.md                                          |   4 +-
 docker-compose.yml                                 |  23 +-
 docs/adrs.md                                       |   2 +
 docs/superpowers/pendencias/README.md              |   5 +-
 docs/superpowers/pendencias/abertas.md             |  32 +-
 .../plans/2026-08-24-compose-por-worktree.md       | 781 +++++++++++++++++++++
 .../2026-08-24-compose-por-worktree-design.md      | 174 +++++
 docs/superpowers/state.md                          |  59 +-
 frontend/.env.example                              |   5 +-
 frontend/tests/compose-dev.test.ts                 | 318 +++++++++
 frontend/vite.config.ts                            |  65 +-
 14 files changed, 1448 insertions(+), 57 deletions(-)
```

Nenhum `backend/`, `frontend/src/`, `docker-compose.prod.yml`, `docker-compose.prod-probe.yml`,
`docker/Dockerfile.prod`, `docker/probe.env` ou `docker/nginx/prod.conf` no diff. Com `backend/`
vazio, **`pint` e `typescript:transform` são N/A por escopo medido** — o `--stat` acima é a prova.

Bundle de produção limpo, e construído justamente com o `.env` de offset presente:

```
$ grep -rc "localhost:808" frontend/dist/assets/*.js
(nenhuma ocorrência)
```

É a garantia do D8: o `define` de `VITE_API_URL` não é emitido no `build`.

## Veredicto

Os sete critérios da §8 da spec estão provados. A P-03 pode fechar no `/fechar-sprint` deste bloco:
duas árvores servem a stack de desenvolvimento ao mesmo tempo, com banco, bucket, sessão e dev
server próprios, e o único passo manual que sobrou é escolher um número de offset no `.env` — que
o `.env.example` documenta e que o `docker compose up` valida sozinho, falhando alto com
`port is already allocated`.
