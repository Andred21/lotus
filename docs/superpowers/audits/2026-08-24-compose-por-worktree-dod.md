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

## Step 10 — Prova 6 (correção pós-revisão final): as sondas de reprovação vistas, por task

O §8.7 da spec pede "catraca verde, com as quatro asserções vistas reprovando" — este documento,
na primeira versão, mostrava só o lado verde (Step 11) e concluía "provado" sem a prova junto, o
que a revisão final marcou como o único passo auto-confirmatório do DoD (CLAUDE.md §5 nº8 proíbe
"provado" sem prova ao lado). As reprovações aconteceram de fato, task a task, durante a execução —
registradas em `.superpowers/sdd/progress.md` e nos relatórios `.superpowers/sdd/task-*-report.md`.
Colado abaixo, por asserção:

**1 — porta literal em `nginx.ports`** (task 2, sonda 1 — trocado `${LOTUS_DEV_HTTP_PORT:-8080}:80`
por `8080:80`):

```
FAIL  tests/compose-dev.test.ts > docker-compose.yml > publica toda porta host por variável LOTUS_DEV_*, nunca literal
AssertionError: expected '8080:80' to match /^\$\{LOTUS_DEV_[A-Z_]+:-\d+\}:\d+$/
```

**2 — default histórico trocado** (task 2, sonda 2 — mesma edição, contra o caso de default):

```
FAIL  tests/compose-dev.test.ts > docker-compose.yml > usa a porta histórica como default de LOTUS_DEV_HTTP_PORT
AssertionError: expected 'services:\n  app:\n    build: { conte…' to match /\$\{LOTUS_DEV_HTTP_PORT:-8080\}/
```

**3 — chave de URL injetada removida** (task 3 — linha `AWS_URL` apagada do `environment:`):

```
FAIL  tests/compose-dev.test.ts > docker-compose.yml > injeta no app toda chave de URL que carrega porta, derivada da mesma variável
AssertionError: expected '    environment:\n      APP_URL: http…' to match /^\s*AWS_URL:.*\$\{LOTUS_DEV_MINIO_PO…/m
```

**4 — `vite.config.ts` sem o comportamento derivado** (task 4, duas sondas sobre o mesmo caso):

```
FAIL  tests/compose-dev.test.ts > vite.config.ts > serve a porta do offset da árvore, com strictPort ligado
AssertionError: expected false to be true // Object.is equality

FAIL  tests/compose-dev.test.ts > vite.config.ts > deriva VITE_API_URL no serve e NÃO emite o define no build
```

Todas as quatro foram revertidas antes de seguir, com a suíte de volta a verde — a mecânica está em
`.superpowers/sdd/task-2-report.md` (Step 7), `task-3-report.md` (Step 5) e `task-4-report.md`
(Step 6 e Addendum 2).

## Achados A–C — melhorias trazidas pela revisão final (pós-medição deste documento)

A revisão final de 2026-08-24 mediu, além do que este documento cobre, três lacunas que a medição
original não via porque a stack no ar não as exercitava:

- **A — `SESSION_COOKIE` derivado do offset.** O cookie de sessão não é isolado por porta pelo
  navegador: as duas árvores emitiam `laravel-session` em `domain=localhost`, então logar na
  árvore B sobrescrevia o cookie da A — 401 silencioso na aba da A. Corrigido injetando
  `SESSION_COOKIE: lotus_session_${LOTUS_DEV_HTTP_PORT:-8080}` no `environment:` do `app`.
- **B — `??` → `||` em `frontend/vite.config.ts`.** `??` só cai no default com a variável UNSET; o
  Compose lê o MESMO `.env` com `${VAR:-default}`, que cai no default também com a variável VAZIA.
  Desvio de texto do plano, aprovado explicitamente pelo João.
- **C — receita de árvore nova no `.env.example` da raiz.** `frontend/.env` copiado de outra árvore
  traz `VITE_API_URL` literal; sem comentá-lo, o dev server da árvore nova conversa com a API da
  árvore de origem, banco errado, sem erro visível.

Nenhum dos três estava coberto pelos Steps 1–9 acima — a stack do main tree ficou no ar durante
toda a medição original, então o conflito de cookie (A) e a receita de árvore nova (C) não tinham
como se manifestar num único login, e a lacuna do `??` (B) só aparece com a variável explicitamente
vazia, cenário que a medição original não plantou.

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
$ git diff main...HEAD --name-only
.env.example
.gitignore
CLAUDE.md
README.md
backend/.env.example
docker-compose.yml
docs/adrs.md
docs/superpowers/audits/2026-08-24-compose-por-worktree-dod.md
docs/superpowers/pendencias/README.md
docs/superpowers/pendencias/abertas.md
docs/superpowers/plans/2026-08-24-compose-por-worktree.md
docs/superpowers/specs/2026-08-24-compose-por-worktree-design.md
docs/superpowers/state.md
frontend/.env.example
frontend/tests/compose-dev.test.ts
frontend/vite.config.ts
```

`--name-only`, e não `--stat`: a primeira versão desta seção colou um `--stat` de 14 arquivos que
**envelheceu em três commits** — o `backend/.env.example`, este próprio documento e as linhas
acrescentadas ao molde e à catraca ficaram de fora, e a conclusão passou a se apoiar numa contagem
que não era mais a do diff (achado Q-2 do review de 2026-08-24). A lista de NOMES é estável: o
número de linhas muda a cada correção, o conjunto de arquivos tocados não.

Nenhum `frontend/src/`, `docker-compose.prod.yml`, `docker-compose.prod-probe.yml`,
`docker/Dockerfile.prod`, `docker/probe.env` ou `docker/nginx/prod.conf` no diff. O único
`backend/` da lista é `backend/.env.example`, que são **comentários** apontando para o ADR-13 —
nenhum `.php`, nenhum DTO, nenhum `generated.ts`. Por isso **`pint` e `typescript:transform`
seguem N/A por escopo medido**, agora com a lista acima como prova.

Bundle de produção limpo, e construído justamente com o `.env` de offset presente:

```
$ grep -rc "localhost:808" frontend/dist/assets/*.js
(nenhuma ocorrência)
```

É a garantia do D8: o `define` de `VITE_API_URL` não é emitido no `build`.

## Veredicto

Seis dos sete critérios da §8 da spec (1 a 6) estão provados diretamente pelos Steps 1–9 acima,
com a stack do main tree no ar durante toda a medição. O sétimo (§8.7, "catraca verde, com as
quatro asserções vistas reprovando") não estava provado NESTE documento na primeira versão — só o
lado verde (Step 11) aparecia, sem as reprovações ao lado, que é o único passo auto-confirmatório
do DoD. As quatro reprovações aconteceram de fato durante a execução, task a task; o Step 10 acima
cola as linhas de falha das sondas, com o ponteiro para `.superpowers/sdd/progress.md` e os
`task-*-report.md` onde a mecânica completa (sonda aplicada → falha vista → revertida → suíte
verde de novo) está registrada por task.

Com o Step 10, os sete critérios da §8 estão provados. A P-03 pode fechar no `/fechar-sprint` deste
bloco: duas árvores servem a stack de desenvolvimento ao mesmo tempo, com banco, bucket, sessão e
dev server próprios, e o único passo manual que sobrou é escolher um número de offset no `.env` —
que o `.env.example` documenta e que o `docker compose up` valida sozinho, falhando alto com
`port is already allocated`. Os achados A–C da revisão final (acima) somam sobre isso: cookie de
sessão isolado por offset, o `vite.config.ts` correto sobre variável vazia, e a receita de árvore
nova documentada.

---

## Apêndice — re-prova depois do `SESSION_COOKIE` (2026-08-24, pós-review final)

A revisão final achou que o bloco destravava duas árvores servindo a stack, mas deixava as duas
**disputando o mesmo cookie de sessão**: cookies não são isolados por porta, e as duas emitiam
`laravel-session` em `domain=localhost`. Logar na segunda derrubava a sessão da primeira. O commit
`3c9f46c0` injeta `SESSION_COOKIE: lotus_session_${LOTUS_DEV_HTTP_PORT:-8080}` pelo mesmo mecanismo
da D3. Como isso muda o comportamento de sessão que o DoD havia provado, as provas 3 e 5 foram
**refeitas** contra o desenho novo.

```
$ docker compose exec -T app php artisan tinker --execute="echo config('session.cookie'), PHP_EOL;"
lotus_session_8081
```

**Coexistência das duas sessões no MESMO jar de cookies** — o equivalente às duas árvores abertas no
mesmo navegador, que é o cenário que a P-03 destrava e que antes se derrubava sozinho:

```
login :8081 200
login :8080 200
--- apos logar nas DUAS, com o mesmo jar ---
me    :8081 200
me    :8080 200
--- cookies de sessao no jar ---
laravel-session
lotus_session_8081
```

As duas continuam autenticadas depois de a outra logar. Os dois nomes são distintos porque o main
tree ainda roda o compose da `main`, sem a injeção — quando ele adotar esta branch, passará a
`lotus_session_8080`, e a distinção se mantém pelo offset.

**Login pela UI, no navegador, sob o cookie novo** (`playwright-cli`, Chromium, `pnpm dev` em 5174):

```
- Page URL: http://localhost:5174/
"Skip to content ADMINISTRATOR Dashboard Commercial Operations Courses Certificates Peopl…"

465. [GET]  http://localhost:8081/api/me    => [401] Unauthorized   (sonda de sessão, antes do login)
474. [POST] http://localhost:8081/api/login => [200] OK

ocorrências de "localhost:8080" nas requisições: 0
```

**Veredicto do apêndice:** as provas 3 e 5 da §8 seguem válidas sob o desenho corrigido, e o furo de
uso simultâneo que a revisão final encontrou está fechado com evidência própria.

---

## Apêndice 2 — o que o isolamento NÃO cobre: `XSRF-TOKEN` (review de 2026-08-24)

O apêndice acima prova a coexistência das duas sessões com `GET /api/me`. **`GET` não passa pelo
CSRF** (`PreventRequestForgery::isReading()`), então aquela prova não diz nada sobre ESCRITA — e é
na escrita que sobra um furo, medido no review deste bloco:

```
csrf8081 204 | login8081(token proprio) 200
csrf8080(main tree) 204 → XSRF SOBRESCRITO pelo main tree
write8081 apos clobber 419
```

Motivo: o nome `XSRF-TOKEN` é **cravado** no framework
(`PreventRequestForgery::newCookie()` monta `new Cookie('XSRF-TOKEN', …)` com `path`/`domain` de
`config('session')`), e cookie não é isolado por porta — não há chave de config que faça por ele o
que `SESSION_COOKIE` fez pela sessão. A sessão de cada árvore continua íntegra; quem volta 419 é o
`POST/PUT/DELETE` da aba que não pediu o csrf-cookie por último, sem recuperação automática
(`initCsrf()` só roda no login e no fluxo de senha).

**Consequência para o veredicto:** os sete critérios da §8 seguem provados — nenhum deles afirma
escrita simultânea nas duas árvores. O que muda é o alcance da frase "sessão própria": ela vale para
autenticação e leitura, não para escrita concorrente no MESMO navegador. A limitação está escrita na
receita do `.env.example` da raiz (um perfil de navegador por árvore) e aberta como **P-56**, cuja
saída — isolar por host em vez de por porta — muda o desenho que este documento provou e é decisão
do João.


---

## Apêndice — re-prova no `/fechar-sprint` (2026-08-24)

O gate de fechamento §0 exige provar o critério de aceite **deste** bloco contra a API real, não
higiene genérica. A stack desta árvore tinha sido derrubada no Step 12; foi religada e as cinco
provas correram de novo, com o main tree no ar o tempo todo.

```
$ docker compose up -d && docker compose ps --format '{{.Name}}\t{{.Ports}}'
lotus-infra-mailpit-1	0.0.0.0:8026->8025/tcp
lotus-infra-minio-1	0.0.0.0:9002->9000/tcp, 0.0.0.0:9003->9001/tcp
lotus-infra-mysql-1	0.0.0.0:3308->3306/tcp
lotus-infra-nginx-1	0.0.0.0:8081->80/tcp

$ curl -s -o /dev/null -w 'main  %{http_code}\n' http://localhost:8080/up
main  200
$ curl -s -o /dev/null -w 'infra %{http_code}\n' http://localhost:8081/up
infra 200

$ docker volume ls | grep lotus
local     lotus-infra_lotus-db
local     lotus-infra_lotus-minio
local     lotus_lotus-db
local     lotus_lotus-minio

$ docker compose exec -T app php artisan tinker --execute="echo config('app.url'), ' | ', implode(',', config('sanctum.stateful')), ' | ', config('filesystems.disks.s3.url');"
http://localhost:8081 | localhost:5174,localhost:8081 | http://localhost:9002/lotus

$ curl ... http://localhost:8081/sanctum/csrf-cookie
csrf   204
$ curl ... -d 'email=admin@lotus.cl&password=senha123' http://localhost:8081/api/login
login  200
--- cookie de sessao gravado no jar ---
lotus_session_8081
$ curl -b jar -H 'Accept: application/json' -H 'Origin: http://localhost:5174' http://localhost:8081/api/me
me     200   {"id":1,"name":"Admin Lotus","email":"admin@lotus.cl","type":"admin","roles":["superadmin"], ...}

$ docker compose exec -T app php artisan tinker --execute="Storage::disk('s3')->put('sonda-p03.txt','ok-arvore-infra'); ..."
infra exists=true url=http://localhost:9002/lotus/sonda-p03.txt
$ docker exec -i lotus-app-1 php artisan tinker --execute="..."
main  exists=false url=http://localhost:9000/lotus/sonda-p03.txt
$ docker compose exec -T app php artisan tinker --execute="... delete ..."
apagada=true

--- coexistencia das duas sessoes no MESMO jar ---
login :8081 200
login :8080 200
me    :8081 200
me    :8080 200
cookies de sessao no jar: laravel-session, lotus_session_8081
```

**Nota medida sobre o `Origin` no `/api/me`.** Sem `-H 'Origin:'` a chamada volta **401** RFC 7807
(`https://lotus.cl/errors/unauthenticated`), não 200: sem `Origin` o Sanctum não trata a request como
stateful e o cookie de sessão do jar não é consumido. É o que o próprio `/fechar-sprint` avisa sobre
prova e2e por `curl`, e não é falha da parametrização — o Step 7 do plano omitia o cabeçalho nesta
terceira chamada. Com `Origin` presente, **200** com o admin do seed.

**Prova 5 — Vite.** A porta 5174 desta árvore estava **ocupada por um dev server de outra árvore**
(`/home/jvbat/projetos/lotus`, o main tree, que subiu ali por não ter `strictPort` na `main`), e a
5173 pelo `../fix-frontend`. O `pnpm dev` desta árvore **recusou-se a subir**, que é o comportamento
desenhado:

```
$ pnpm dev
error when starting dev server:
Error: Port 5174 is already in use
```

Processos de outras lanes não são derrubados por este fechamento, então a derivação de
`VITE_API_URL` foi provada em porta livre, **sem tocar no offset de HTTP**:

```
$ LOTUS_DEV_VITE_PORT=5179 pnpm dev
  ➜  Local:   http://localhost:5179/
$ curl -s http://localhost:5179/src/shared/api/axios.ts | grep -o 'VITE_API_URL": "[^"]*"'
VITE_API_URL": "http://localhost:8081"
```

O dev server derivou a API da **própria** árvore (`:8081`) mesmo servindo em porta emprestada — a
derivação vem de `LOTUS_DEV_HTTP_PORT`, independente da porta do Vite, como o desenho previa.

**Gate de higiene do fechamento:**

```
$ docker compose exec -T app php artisan test
Tests:    5 skipped, 906 passed (3227 assertions)   Duration: 98.81s
$ pnpm lint     # eslint ., exit 0, sem saída
$ pnpm build    # tsc -b && vite build → ✓ built in 1.13s
$ pnpm test
 Test Files  101 passed (101)
      Tests  567 passed (567)
```

`pint` e `typescript:transform` seguem **N/A por escopo medido**: `git diff main...HEAD --name-only`
sobre `backend/` devolve só `backend/.env.example`, e `generated.ts` não aparece no diff.
