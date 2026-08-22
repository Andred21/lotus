# Spec — Infra de produção: o runtime (`infra-producao-runtime-e-aws`)

> Bloco: item 10 da fila priorizada do `backlog.md`.
> Context Packet: `docs/superpowers/context-packets/2026-08-22-infra-producao-runtime-e-aws.md`.
> Base: `infra/producao-runtime-e-aws` a partir de `c8480eee`; worktree `lotus-infra`.

## 1. O recorte, e por que ele existe

O item 10 do backlog junta duas naturezas de trabalho. Uma é **artefato versionado** — Dockerfile,
Compose, Nginx, `memory_limit`, secrets, `APP_DEBUG` — que nasce e se prova nesta máquina. A outra é
**provisionamento em conta AWS real** — EC2, RDS, S3/IAM, SES, DNS, TLS, CloudWatch — que depende de
credenciais que não estão aqui e das quatro decisões que o Context Packet registrou como abertas:
região (`sa-east-1` × `us-east-1`), tamanho final da EC2, controle do DNS de `lotus.cl` mais a saída
do sandbox do SES, e o teto de custo.

**Decisão do João (2026-08-22): este bloco entrega só a primeira metade.** O slug segue
`infra-producao-runtime-e-aws`, porque é o `active_work_item` já promovido e commitado; o que muda é
o escopo, declarado aqui e não descoberto na execução. Registrar a metade de provisionamento como
item próprio do backlog é ato do `/fechar-sprint`, não do planejamento — o `/planejar-bloco` proíbe
mexer na fila durante `planning`.

**A consequência honesta desse recorte está na §9 e não é maquiada:** nada de AWS fica provado por
este bloco. MinIO não é S3 e Mailpit não é SES.

## 2. Decisões

| ID | Decisão | Alternativa recusada, e o custo medido |
|---|---|---|
| **D1** | **Escopo = runtime versionado.** Provisionamento AWS sai do bloco. | Bloco inteiro do backlog: exigiria decidir região, sizing, domínio e orçamento agora, sem fonte que os feche, e produziria DoD por leitura de console. |
| **D2** | **Origem única.** O Nginx serve o SPA e roteia `/api`, `/sanctum` e `/up` ao PHP-FPM no mesmo host. | Dois hosts (`lotus.cl` + `api.lotus.cl`, como o Drive registra): `VITE_API_URL` é lido por `import.meta.env` em `axios.ts:25`, logo entra **dentro do bundle no build** — a imagem passaria a ser por ambiente, contra o artefato único por SHA que o item 11 precisa promover. |
| **D3** | **Duas imagens, não uma.** `app` (PHP-FPM + código + vendor) e `nginx` (SPA + conf). | Uma imagem só, ou volume compartilhando o `dist/`: obrigaria o Nginx a enxergar a árvore PHP, e volume de código é exatamente o que a DoD do item 10 proíbe. |
| **D4** | **Overlay de sonda separado** (`docker-compose.prod-probe.yml`) para MySQL, MinIO e Mailpit. | `profiles:` dentro do arquivo de produção: o arquivo que vai ao servidor carregaria a definição do MySQL de dev, que o escopo do item 10 proíbe em texto. Apontar para o compose de dev já no ar: a prova passaria a depender de outra stack estar viva. |
| **D5** | **`memory_limit` separado por SAPI**, cada número medido. CLI no `conf.d`, FPM no `php_admin_value` do pool. | Valor único: produção herdaria o teto que existe por causa da suíte de testes. Medir só o CLI: deixaria sem medição justamente a metade que vai a produção. |
| **D6** | **Secrets por `env_file` no servidor** (`/opt/lotus/.env`, `chmod 600`), com `.env.production.example` versionado de valores vazios. | SSM Parameter Store: atenderia o `RNF-SEC-03` pela forma, mas não é provável neste bloco — exige a conta AWS que a D1 tirou do escopo. O caminho fica registrado como evolução, sem promessa aqui. |
| **D7** | **O entrypoint não migra.** Ele valida env, roda os três `*:cache` e sobe o PHP-FPM. | `migrate` no arranque: o item 12 já fixou `compose pull → migrate → up`, e migrar no boot faria réplicas do mesmo container competirem pela migração. |
| **D8** | **`config:cache`/`route:cache`/`view:cache` no boot, não no build.** | Cachear no build congelaria as variáveis do estágio de build dentro da imagem — o oposto do artefato agnóstico que a D2 compra. |
| **D9** | **`LOG_CHANNEL=stderr` em produção.** | `stack` (arquivo): exigiria volume de log só para não perder a linha, e o coletor natural do próximo bloco é o Docker mais CloudWatch. |

## 3. A imagem (D3)

`docker/php/Dockerfile.prod`, multi-stage, na ordem que o ADR-13 fixa:

1. **vendor** — `composer:2`, `--no-dev --optimize-autoloader`;
2. **spa** — `node:22-alpine` (host mede Node `v22.23.1` e pnpm `11.22.0`; `pnpm-lock.yaml` é
   `lockfileVersion: '9.0'`), `pnpm install --frozen-lockfile` e `pnpm build`, com `VITE_API_URL`
   **vazio** (D2). Saída em `dist/`, que é o default do Vite — `vite.config.ts` não declara `outDir`;
3. **final** — `php:8.3-fpm-alpine` com as mesmas extensões do Dockerfile de dev
   (`pdo_mysql gd zip intl bcmath`, mais `libzip-dev icu-dev oniguruma-dev libpng-dev`), o código e o
   vendor **copiados**, usuário não-root e **sem** Composer.

`poppler-utils` está no Dockerfile de dev por causa da inspeção visual de PDF do `CLAUDE.md` §6, que
é ferramenta de desenvolvimento. **A execução mede se algum código de `backend/app/` o invoca**; sem
consumidor, ele não entra na imagem de produção, e o resultado da medição vai ao plano.

A segunda imagem é `nginx:alpine` mais o `dist/` do estágio **spa** e a conf de produção. Ela não
recebe a árvore PHP.

**Emenda à D3, decidida ao escrever o plano:** as duas imagens saem de **um único arquivo**,
`docker/Dockerfile.prod`, com quatro estágios (`vendor`, `spa`, `app`, `web`) e dois alvos de build,
em vez de dois Dockerfiles. O motivo é o estágio `spa`: a imagem do Nginx precisa do `dist/` que ele
produz, e com arquivos separados esse estágio teria de existir duas vezes — duas cópias do mesmo
build de frontend, livres para divergir. A D3 continua valendo no que ela decide (duas imagens, o
Nginx sem a árvore PHP); o que muda é o número de arquivos.

## 4. Origem única e o roteamento (D2)

**Medição, não suposição:** `routes/api.php` agrega os domínios por `glob(app_path('Domains/*/routes.php'))`
e todas essas rotas entram sob o prefixo `api/`; fora delas existem apenas `/sanctum/csrf-cookie`
(Sanctum) e `/up` (`bootstrap/app.php:14`). `routes/web.php` declara uma única rota, `/`, que devolve
a view `welcome`.

Roteamento do Nginx de produção:

- `/api`, `/sanctum`, `/up` → `fastcgi_pass app:9000`, com `SCRIPT_FILENAME` apontando para o
  front-controller `/var/www/public/index.php`. É esse `SCRIPT_FILENAME` fixo que permite ao Nginx
  não ter a árvore PHP (D3);
- todo o resto → `try_files $uri /index.html`, servindo o SPA.

`client_max_body_size` permanece **12m**, o valor que a conf de dev já carrega com o motivo escrito
no arquivo: o envelope multipart soma boundary e headers ao teto lógico de 10 MB, e igualar os dois
faria o Nginx cortar um arquivo de exatos 10 MB com um 413 que não passa pelo Laravel.

**Duas consequências declaradas:**

1. **Diverge do Drive**, que registra `lotus.cl` + `api.lotus.cl`. A divergência é de topologia e a
   base da escolha é medida (`VITE_API_URL` é build-time). Vai à tabela da §8 como **resolvida por
   decisão do João em 2026-08-22**, não como omissão.
2. **A view `welcome` fica inalcançável em produção**, porque o SPA toma a raiz. Nenhum código é
   removido neste bloco — a rota segue servindo o ambiente de dev.

**O que a origem única apaga:** `cors.php:23` deriva `allowed_origins` de `FRONTEND_URL`, e
`sanctum.php:21` deriva `stateful` de `SANCTUM_STATEFUL_DOMAINS`. Same-origin, nenhuma requisição do
SPA é cross-origin — a resposta do login não deve trazer `Access-Control-Allow-Origin`, e isso é item
de DoD (§7), não inferência.

## 5. Compose (D4, D7, D9)

`docker-compose.prod.yml` — três serviços, nada mais:

- **`app`** — imagem `${LOTUS_IMAGE:-lotus-app:local}`. O default deixa o bloco provável agora; a
  variável é o gancho por onde o item 12 promove por SHA sem editar o arquivo. `restart: unless-stopped`,
  `env_file` (D6), sem volume de código;
- **`nginx`** — a segunda imagem da D3, portas publicadas, `restart: unless-stopped`, **healthcheck
  que atravessa o fastcgi até `/up`**. É a cadeia inteira que o healthcheck prova, e por isso o `app`
  não ganha healthcheck próprio — decisão consciente, registrada aqui;
- **`gotenberg`** — `gotenberg/gotenberg:8`, serviço requerido pelo ADR-12 (certificado por Chromium
  **e** manual por LibreOffice saem do mesmo container), com healthcheck próprio.

**O que a medição tirou da stack, e não a suposição:** `backend/.env.example` traz `SESSION_DRIVER`,
`CACHE_STORE` e `QUEUE_CONNECTION` todos em `database`, e `grep -rn "ShouldQueue" backend/app`
devolve uma única linha, que é um **comentário** explicando que as notificações de senha são
síncronas. Logo: sem volume de sessão, sem volume de cache e **sem worker de fila** no compose de
produção. Se um `ShouldQueue` nascer depois, o worker nasce com ele.

`docker-compose.prod-probe.yml` acrescenta MySQL 8, MinIO (mais o job `createbuckets`) e Mailpit,
**só** para a prova da §7. O arquivo que vai ao servidor é o primeiro, e o que ele não tem fica
visível no diff.

## 6. Entrypoint e P-50 (D5, D7, D8)

O entrypoint valida as variáveis obrigatórias e falha com mensagem nomeando a que faltou — um
container que sobe sem `APP_KEY` e só quebra na primeira request é pior do que um que não sobe. Em
seguida roda `config:cache`, `route:cache` e `view:cache` (D8) e entrega o processo ao PHP-FPM.

**P-50 — dois números, os dois medidos.** A ficha exige resolver o `memory_limit` por medição, e o
gatilho dela é literal: "o João decidir o `memory_limit` da imagem (a mesma que roda em produção), ou
o primeiro bloco que tocar `docker/php/`". Este bloco faz as duas coisas.

- **CLI** — arquivo próprio em `conf.d`, **copiado pelas duas imagens, a de dev e a de produção**.
  Isso é necessário e não zelo: quem roda a suíte é o container de dev, então um limite que vivesse
  só na imagem de produção deixaria a P-50 aberta exatamente onde ela dói. O número sai do pico real
  da suíte, medido nesta execução e não herdado: a ficha registra picos de **127,00 MB** e
  **129,00 MB** em medições diferentes, contra o default de 128M, e é essa margem inexistente que
  mata o comando documentado do `CLAUDE.md` §6.
- **FPM** — `php_admin_value[memory_limit]` no pool `www`. O número sai de
  `memory_get_peak_usage(true)` nas três rotas mais pesadas do produto — manual `.docx`
  (`App\Shared\Office`), PDF do certificado (Gotenberg via Chromium) e importação OpenSpout —, com a
  margem declarada sobre o pico medido.

O `uploads.ini` de hoje (12M em `upload_max_filesize` e `post_max_size`, com o motivo escrito no
arquivo) continua valendo nas duas SAPIs e não é tocado.

## 7. Definition of Done — oito provas, todas nesta máquina

Nenhuma delas é "ferramenta verde": cada uma prova comportamento.

1. **Build do zero** — `docker build --no-cache` das duas imagens termina verde, partindo de uma
   árvore sem `vendor/` e sem `node_modules/` copiados.
2. **Healthcheck** — com a stack de produção mais o overlay de sonda no ar, `/up` responde **200** e
   o healthcheck do Nginx entra em `healthy`.
3. **Origem única funcionando** — login real pelo navegador na porta publicada: o SPA carrega da
   raiz, `/sanctum/csrf-cookie` e `/api/login` saem **relativos**, o cookie de sessão é gravado e a
   resposta **não** traz `Access-Control-Allow-Origin`. A ausência do header é a prova de que a
   origem é única de fato.
4. **Sem bind mount** — alterar um arquivo de `backend/app/` no host **não** muda o comportamento do
   container. É a metade da DoD do item 10 que fala em "não depender do working tree do servidor".
5. **`APP_DEBUG=false`** — um erro forçado devolve envelope RFC 7807 **sem stack trace** e sem
   caminho de arquivo do servidor.
6. **Serviços externos por env** — um certificado é gerado pelo Gotenberg e gravado no MinIO da
   sonda, e um e-mail de convite chega ao Mailpit. Prova que a app fala com storage e SMTP externos
   por configuração, que é o mecanismo que S3 e SES vão usar.
7. **P-50 fechada** — os dois picos medidos e registrados, e
   `docker compose exec -T app php artisan test` (o comando do `CLAUDE.md` §6, que hoje morre) volta
   a fechar verde no container de dev.
8. **Imagem sem segredo** — a imagem final não contém `.env`, e o `docker history` não revela valor
   sensível.

## 8. Divergências

| Tópico | Fonte externa | Decisão deste bloco | Base |
|---|---|---|---|
| Topologia de host | Drive `arquitetura-aws-lotus.md` registra `lotus.cl` + `api.lotus.cl` | Origem única (D2) | Instrução explícita do João em 2026-08-22, sobre a medição de que `VITE_API_URL` é build-time (`axios.ts:25`) |
| `RNF-DIS-02` × ADR-14 | O requisito exige servidor redundante; o Drive o rebaixa para "recuperação rápida sem failover"; Notion `11.1.3` o associa a restore de snapshot | **`unresolved`** — nenhuma das duas leituras é aceita, e o bloco não declara EC2 única como atendimento do RNF | Gate de arquitetura do item 13 do backlog; decisão é do João |
| Secrets em cofre (`RNF-SEC-03`) | Requisito pede segredo fora do código, em cofre | `env_file` no servidor (D6), com o caminho para Parameter Store registrado e não prometido | A D1 tirou a conta AWS do escopo; prometer cofre sem poder prová-lo seria DoD falsa |

## 9. Limitações declaradas

- **Nada de AWS é provado aqui.** MinIO não é S3 e Mailpit não é SES: a prova 6 mostra que a app fala
  com storage e SMTP **externos por configuração**, não que os serviços da AWS estão corretos.
- **TLS não entra.** Let's Encrypt/Certbot depende do DNS de `lotus.cl`, que é decisão aberta do
  packet. O Nginx nasce em HTTP; o TLS é do bloco de provisionamento.
- **O sizing da EC2 continua aberto.** O `memory_limit` do FPM medido aqui é insumo dessa decisão,
  não a decisão.
- **P-03 não dispara hoje, e isso foi medido:** o main tree está com `feedbacks-resolver-escopo` em
  `context_required`, sem código. **Se ele entrar em `executing`, o gatilho é reavaliado antes de
  qualquer prova deste bloco que dependa do compose.**

## 10. Medições da execução

Escrita ao fechar a execução (2026-08-22). Tudo abaixo foi **medido nesta máquina**, não estimado.
Onde a execução divergiu do texto do plano, o motivo está junto.

### 10.1 Memória: os dois picos e os dois valores derivados

| Alvo | Pico medido | Valor derivado | Onde vive |
|---|---|---|---|
| CLI (`artisan test`, suíte inteira) | `Memory: 129.00 MB` | `memory_limit = 320M` | `docker/php/memory-cli.ini:10` |
| PHP-FPM (pior request medido) | `11,09 MB` | `php_admin_value[memory_limit] = 256M` | `docker/php/www.conf:30` |

Picos por operação no FPM, todos com resposta `200` confirmada:

| Operação | Pico |
|---|---|
| manual `.docx`, turma do seed | 6,00 MB |
| manual `.docx`, mesma turma com +72 alunos | **11,09 MB** — o único que escala com o dado |
| PDF do certificado (Gotenberg) | 6,00 MB |
| importação OpenSpout, 800 linhas | 4,00 MB — streaming, não escala |
| boot do Laravel no CLI, sem opcache | 26,00 MB — referência do argumento |
| `pm.max_children` default da imagem base | 5 |

**Emenda à regra do plano (decisão do João, 2026-08-22):** a regra crua de derivação dava **64M**
para o pool FPM — abaixo do default `128M` do próprio PHP — porque o opcache tira o bytecode do heap
do request e o pico medido é pequeno. Um limite abaixo do default do PHP não é sizing, é armadilha.
A regra passa a ter **piso de 256M**.

As medições iniciais do FPM vieram em parte de respostas `401`: o Sanctum só trata a requisição como
stateful com `Referer` da origem configurada. Refeitas com sessão real e `Referer`, todas em `200`.

### 10.2 `poppler-utils` — medição da §3

Nenhum consumidor. `grep -rniE 'pdftoppm|pdfinfo|pdftotext|pdfunite|pdftocairo|poppler'` em
`backend/app/`, `backend/config/` e `backend/routes/` retorna **zero hits**. O pacote existe só em
`docker/php/Dockerfile:2`, como ferramenta de desenvolvimento do `CLAUDE.md` §6. **Não entra na
imagem de produção.**

### 10.3 Healthchecks

| Serviço | Decisão | Motivo medido |
|---|---|---|
| `nginx` | `wget --spider -q http://127.0.0.1/up` | `localhost` **nunca passa**: o busybox wget da imagem resolve `localhost` para `::1`, o `prod.conf` só declara `listen 80`, e o comando sai com `Connection refused`. Trocado sem tocar o `prod.conf` da Task 3. Provado em rede isolada com PHP-FPM real: `200`/exit 0 com o `app` vivo, `502`/exit 1 com o `app` morto |
| `gotenberg` | `curl -f http://localhost:3000/health` | A imagem **tem** `curl` — medido, não assumido |
| `mysql` (só no overlay de sonda) | `mysqladmin ping -h 127.0.0.1 -psecret` | Sem `-h`, o `mysqladmin` fala pelo **socket Unix**, que a imagem oficial do MySQL 8 abre **antes** do listener TCP. O healthcheck ficava verde com a porta 3306 ainda recusando. Provado com 3 ciclos `up -d` + `migrate --force` sem `sleep`: exit 0 nos três |

### 10.4 Desvios do texto literal do plano

| Desvio | Motivo |
|---|---|
| `composer install --ignore-platform-reqs` no estágio `vendor` | A imagem `composer:2` não tem `ext-gd`, exigida por `simplesoftwareio/simple-qrcode`. O `dump-autoload` roda `post-autoload-dump` → `package:discover`, que boota o Laravel inteiro. Esse script é **load-bearing**: ele reescreve `bootstrap/cache/packages.php`, que o `COPY` traz do host com providers dev-only (`laravel/pail`, `collision`, `laravel-lang`). Sem ele a imagem bootaria com class-not-found — por isso **não** se usa `--no-scripts` |
| Headers `-dev` via `apk add --virtual .build-deps` + `apk del .build-deps` na **mesma** instrução `RUN` | Emenda à Global Constraint, decidida pelo João. A constraint significa "as mesmas extensões", não "os mesmos headers na camada final". Em `RUN` separado a camada anterior guardaria os arquivos. Redução medida: 306MB → 293MB (~3%) |
| Catraca `frontend/tests/compose-prod.test.ts` reforçada além do plano | As asserções do plano deixavam passar quatro regressões reais: bind mount `- .:/var/www`, segredo inline, remoção do `depends_on` e `image` hardcoded. O reforço prova **propriedade, não sintaxe**: 12/12 mutações negativas pegas, 6/6 formas legítimas aceitas |
| `key:generate` precisa de `--entrypoint php` | Impasse circular real: o gate do entrypoint exige `APP_KEY` para bootar, e gerar `APP_KEY` exige bootar. **Um servidor novo bate no mesmo impasse — a receita precisa entrar no runbook do bloco de deploy** |
| `depends_on` do overlay de sonda em forma longa | A forma curta normaliza para `condition: service_started`, então o healthcheck do MySQL existia e ninguém o consumia. `up -d` + `migrate --force` sem `sleep` dava `SQLSTATE[HY000] [2002] Connection refused` |
| Prova 8 (`docker history` sem segredo) precisa filtrar uma linha | O comando literal do plano devolve `1`, não `0`. O único hit é `--with-password-argon2`, do `./configure` da imagem base `php:8.3-fpm-alpine`. Filtrada essa linha: **`0` — sem segredo no histórico** |

### 10.5 Divergências entre a DoD escrita e o comportamento medido

Duas provas do §7 esperavam um sinal que o sistema real não produz. A **substância** de cada uma foi
provada; o que estava errado era o proxy escolhido.

**Prova 3 — cabeçalhos CORS.** O plano esperava **ausência** de `Access-Control-Allow-Origin` como
evidência de origem única. Medido: `POST http://localhost:8081/api/login` responde `200`, mesma
origem, `referer: http://localhost:8081/login`, cookies `XSRF-TOKEN` e `lotus-session` gravados — e
**com** `access-control-allow-origin: http://localhost:8081` e `access-control-allow-credentials:
true`. Causa: `backend/config/cors.php:22` usa `FRONTEND_URL` como `allowed_origins`, e o
`HandleCors` do Laravel emite o cabeçalho sempre que a requisição carrega `Origin` — o que um XHR
same-origin também faz. **A origem única está provada** (uma porta, um host, cookie aceito); a
ausência do cabeçalho era um proxy errado para ela.

**Prova 6 — o PDF no bucket.** O plano esperava o PDF do certificado gravado no S3/MinIO.
`CertificatePdfService` renderiza **sob demanda** via `HtmlToPdf` (Gotenberg) e **nunca persiste** —
não é regressão, é o desenho. O mecanismo real foi provado inteiro, através da stack de produção:
certificado emitido pela UI (`POST /api/enrollments/22/certificate` → `201`), PDF obtido em
`GET /api/certificates/1/pdf` → `200 | application/pdf | bytes=198279 | magic="%PDF-1.4"`, upload
gravando objeto no MinIO (`redator/1/YDRoJhjs….txt`, 31B) e convite entregue ao Mailpit
(`Subject: "Acceso a la plataforma Lotus"`, para `juan.morales@lotus.cl`). Storage e SMTP externos
por configuração: provado. O certificado no bucket: não existe para ser provado.

### 10.6 Provas restantes, como fecharam

| Prova | Resultado |
|---|---|
| 1 — stack de produção sobe | `nginx` fica `(healthy)`; `curl http://localhost:8081/up` → `200`; 24 migrations `DONE`; `createbuckets` criou `local/lotus` |
| 2 — SPA na raiz | `curl http://localhost:8081/` → `200` |
| 4 — imagem imutável | `AUSENTE ANTES` e `AUSENTE DEPOIS`: sonda instalada no host (`grep -c` = 1), ausente no container, revertida, árvore limpa |
| 5 — erro sem vazamento | Sem sessão: `401` RFC 7807. Autenticado: `404` RFC 7807. Sem `trace`, sem `file`, sem caminho absoluto. O `detail` do `404` nomeia a classe do model (`App\Domains\Operation\Models\Turma`) — mensagem default do Laravel, não stack trace |
| 7 — P-50 | `docker compose exec -T app php artisan test` → `Tests: 5 skipped, 867 passed (3095 assertions)`, `Duration: 59.01s`. Sem estouro de memória |
| Gate do Step 6 | `pnpm lint` exit 0 · `pnpm build` exit 0 (`✓ built in 1.85s`) · `pnpm test` → `Test Files 88 passed (88)` / `Tests 499 passed (499)` · `git diff --name-only main...HEAD -- backend/app frontend/src/shared/types/generated.ts` vazio, logo Pint e `typescript:transform` não se aplicam **por medição** |

### 10.7 Ambiente devolvido

Stack de sonda derrubada com `down -v` (projeto `lotus-probe`: zero containers, zero volumes, zero
redes). Volumes de dev (`lotus_*`, `lotus-bd15_*`, `lotus-infra_*`) intactos. Árvore de trabalho
limpa.
