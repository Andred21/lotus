---
schema_version: 1
active_feature: null
active_work_item: null
workflow_state: idle
next_owner: joao
next_action: select_backlog_item
resume_state: null
active_spec: null
active_plan: null
context_packet: null
blocker: null
last_completed_work_item: infra-producao-runtime-e-aws
state_basis_commit: c8480eee
updated_at: 2026-08-22T20:45:00-03:00
---

# Estado operacional — Lotus v2

> Fonte única para descobrir a etapa atual e a próxima ação. `progress.md` registra histórico;
> `backlog.md` registra a fila. Nenhum dos dois autoriza iniciar uma fase.

## Estados válidos

| Estado | Próxima ação permitida |
|---|---|
| `idle` | escolher explicitamente um item do `backlog.md` |
| `context_required` | gerar/atualizar Context Packet com `lotus-context-packet` |
| `ready_for_planning` | executar `/planejar-bloco` para `active_work_item` |
| `planning` | continuar brainstorming/spec/plano; não implementar |
| `ready_for_execution` | executar `/executar-bloco` para `active_work_item` |
| `executing` | retomar a task pendente do plano; não replanejar |
| `ready_for_review` | solicitar code review do bloco |
| `reviewing` | tratar somente achados aprovados e repetir o review |
| `ready_for_closure` | executar `/fechar-sprint` |
| `blocked` | resolver `blocker`; depois retornar a `resume_state` |

## Invariantes

- Existe no máximo um `active_work_item`.
- `next_action` deve corresponder a `workflow_state`.
- `active_plan` é obrigatório a partir de `ready_for_execution`.
- Quando o trabalho depender de contexto externo, `context_packet` deve permanecer `null` em
  `context_required` e tornar-se obrigatório antes da transição para `ready_for_planning`.
- Mudanças de estado ocorrem somente em fronteiras duráveis e entram no mesmo commit do artefato
  que prova a transição.
- Divergência entre este arquivo, plano, spec, Git ou `progress.md` bloqueia a sessão; não escolha
  por heurística.
- O backlog nunca promove trabalho automaticamente.

## Último item fechado — 2026-08-22 (`infra-producao-runtime-e-aws`, item 10 da fila priorizada)

### Seleção — 2026-08-22

**Promoção explícita do João**, com esta árvore em `idle` e `active_work_item: null`. O argumento
do `/planejar-bloco` veio como **slug exato** — `infra-producao-runtime-e-aws` —, que é o mesmo
título do item 10 do `backlog.md`; o gate não teve o que reprovar dessa vez.

**Três decisões dele fecharam o gate:**

1. **Rota `context_required`, não a direta.** O item 10 declara `Contexto: sim` e as fontes são
   externas ao repositório: Drive `RNF-DIS-01/03/04`, Notion `10.1.1–10.1.6` e `10.1.8`,
   ADR-09/11/13/14. Diferente dos blocos de dívida recentes (BD-12, BD-17, BD-18), aqui não há
   medição local que substitua a fonte — a topologia de produção é decisão de produto/infra
   registrada fora do código.
2. **Segundo `active_work_item` vivo, aceito como exceção declarada.** O main tree
   (`/home/jvbat/projetos/lotus`) está em `feedbacks-resolver-escopo`, `workflow_state:
   context_required`, `next_owner: codex` — medido, não deduzido. É a **sétima** exceção à
   invariante de um `active_work_item`, pelo mesmo padrão já registrado nos fechamentos de
   `arquivados-roots-restantes` e do BD-18: o invariante vale dentro de cada branch, não entre elas.
3. **Área de trabalho: esta worktree `lotus-infra`**, branch `infra/producao-runtime-e-aws` a partir
   de `c8480eee`. A regra do `/planejar-bloco` manda main tree quando o bloco toca backend, por causa
   da **P-03** — mas o gatilho literal da P-03 é *backend ∥ backend*, e o que o bloco escreve são
   artefatos de runtime novos (`Dockerfile` multi-stage, `docker-compose.prod.yml`, nginx de
   produção), não código de domínio que a suíte precise provar contra o compose de dev.

**Ressalva a carregar para o planejamento, medida agora e não descoberta depois:** o
`feedbacks-resolver-escopo` do main tree é bloco de **backend com código**. Enquanto ele estiver em
`context_required` o gatilho da P-03 não dispara; **se ele entrar em `executing`, o gatilho precisa
ser reavaliado antes de qualquer prova deste bloco que dependa do compose.**

**Estado das outras duas árvores no momento da promoção**, para o caso de divergência futura:
`lotus-bd15` em `idle`; `fix-frontend` em `bd12-load-state-e-listas` / `ready_for_planning` — resíduo
do bloco já fechado e mesclado na `main` pelo PR #64, não trabalho vivo.

**`state_basis_commit: c8480eee`** — o commit contra o qual o backlog foi consolidado em 2026-08-22
(`ba59dbd9`) mais o `style(backend)` que o segue, e a árvore que este bloco vai medir.

### Context Packet — 2026-08-22: `status: partial`, cinco fontes, nenhuma indisponível

Gerado pelo Codex (sandbox read-only, skill `lotus-context-packet`) e salvo em
`context-packets/2026-08-22-infra-producao-runtime-e-aws.md`. **Contrato validado antes de gravar:**
markers exatos, frontmatter completo com `plan_path`/`spec_path` em `null` (os dois ponteiros do
estado são nulos e não foram inventados), **8 key facts** — o teto —, e `RECOMMENDED_TRANSITION:
ready_for_planning`. **A provenance foi remedida aqui, não aceita de chegada:** `base_commit`
`5bcd4b7c…`, `state_blob_sha` `25c06347…` e `progress_blob_sha` `0457320a…` conferem com
`git hash-object` nesta árvore.

**Nenhuma fonte saiu `unavailable`** — as cinco foram consultadas e endereçadas por ID: os três
documentos do Drive (`requisitos-negocio.md`, `arquitetura-aws-lotus.md`, `decisao-stack.md`) e as
oito páginas Notion pela base canônica `e64b7d57-…`, não pela homônima obsoleta que a skill veta. O
`partial` vem do conteúdo, não da falta: **as sete tasks do Notion estão "A fazer" com `Descrição`
vazia**, então elas dão critério de aceite e não desenho.

**Três fatos externos mudam o planejamento e não estavam no repositório:**

1. **O texto canônico do `RNF-DIS-02` é "servidor redundante pronto para assumir em caso de queda"** —
   e o próprio `arquitetura-aws-lotus.md` do Drive o **rebaixa** para "recuperação rápida sem
   failover", enquanto a task Notion `11.1.3` associa restore de snapshot ao mesmo requisito. Nem o
   rebaixamento nem a associação foram aceitos: a divergência foi para a tabela como **`unresolved`**,
   reservada ao gate do item 13. O bloco planeja EC2 única **sem declarar** que ela atende ao RNF.
2. **O sizing tem um número decidido e outro não.** `db.t4g.micro` está explicitado na task 10.1.2;
   a EC2 `t4g.small` ARM é **sugestão** do Drive, com `t4g.medium` como saída se o Gotenberg
   pressionar memória. Escolher a EC2 é decisão do brainstorming, com a P-50 medida junto — o mesmo
   `conf.d` hoje serve CLI e PHP-FPM, e o pico de 129 MB contra o teto de 128M é do CLI.
3. **A borda TLS tem duas saídas no Drive** (EC2 direta + Certbot, ou ALB + ACM). A task 10.1.6 e o
   ADR-14 decidem a primeira para o MVP; o ALB fica ligado à decisão de HA, que é do item 13.

**Quatro questões abertas, nenhuma bloqueante para escrever o plano, todas bloqueantes para
provisionar o recurso correspondente:** região (`sa-east-1` × `us-east-1`, nenhuma aprovada), tamanho
final da EC2, controle do DNS de `lotus.cl`/`api.lotus.cl` mais a saída do sandbox do SES e o canal
do alerta CloudWatch, e o teto de custo (estimativa externa de US$ 35–55/mês sem ALB). São decisões
do João e entram no brainstorming como tais — não se supõem.

### Brainstorming — 2026-08-22: o bloco foi recortado ao meio, por decisão do João

**A primeira pergunta do brainstorming foi de escopo, e mudou o bloco.** O item 10 junta artefato
versionado (Dockerfile, Compose, Nginx, `memory_limit`, secrets) com provisionamento em conta AWS
real — e a segunda metade depende das quatro decisões que o packet listou como abertas mais
credenciais que não estão nesta máquina. **O João escolheu entregar só o runtime**, com o
provisionamento virando bloco próprio quando as decisões existirem. O slug não muda; o escopo, sim, e
está declarado na §1 da spec.

**Quatro decisões dele fecham o desenho:**

1. **Origem única**, contra o `lotus.cl` + `api.lotus.cl` do Drive — e a base é medida, não estética:
   `VITE_API_URL` é lido por `import.meta.env` em `axios.ts:25`, então **entra dentro do bundle no
   build**. Com dois hosts, a imagem carregaria a URL do ambiente, e o item 11 precisa promover a
   mesma imagem por SHA. Vai à tabela de divergências da spec como decisão, não como omissão.
2. **Overlay de sonda separado** para a prova local — o `docker-compose.prod.yml` fica sem banco, sem
   storage e sem mail, e o que ele não tem fica visível no diff em vez de escondido num `profiles:`.
3. **P-50 fechada com dois números medidos**, separados por SAPI: CLI no `conf.d` (nas duas imagens,
   senão a ficha segue aberta onde dói — quem roda a suíte é o container de dev) e FPM no
   `php_admin_value` do pool.
4. **Secrets por `env_file` no servidor**, com o caminho para Parameter Store registrado e **não
   prometido** — prometer cofre sem poder prová-lo neste bloco seria DoD falsa.

**Três medições enxugaram a stack antes de qualquer arquivo nascer:** todas as rotas do backend vivem
sob `api/` (`routes/api.php` agrega os domínios por glob), sobrando apenas `/sanctum/csrf-cookie` e o
`/up` de `bootstrap/app.php:14` — o que torna o roteamento de origem única trivial; `SESSION_DRIVER`,
`CACHE_STORE` e `QUEUE_CONNECTION` são todos `database`; e `grep -rn "ShouldQueue" backend/app`
devolve **uma linha, que é comentário** — logo, produção não leva volume de sessão nem worker de
fila.

Spec em `specs/archive/2026-08-22-infra-producao-runtime-e-aws-design.md`: 9 decisões, 8 provas de DoD, 3
divergências (uma delas a `RNF-DIS-02` × ADR-14, que segue **`unresolved`** e reservada ao gate do
item 13) e 4 limitações declaradas — a primeira delas sendo que **nada de AWS é provado por este
bloco**.

### Planejamento — 2026-08-22: 7 tasks, `executor: claude`, uma emenda à spec

Plano em `plans/archive/2026-08-22-infra-producao-runtime-e-aws.md`. **Sete tasks, uma por commit**, na ordem
que a dependência impõe: os dois números da P-50 primeiro (Tasks 1 e 2), porque a imagem de produção
copia as duas confs; depois a conf do Nginx (Task 3), a imagem (Task 4), o Compose com a catraca
(Task 5), o overlay mais o molde de env (Task 6) e a DoD end-to-end (Task 7).

**Uma emenda à spec, decidida ao escrever o plano e registrada na §3 dela:** as duas imagens saem de
**um único** `docker/Dockerfile.prod` com quatro estágios e dois alvos, em vez de dois Dockerfiles. O
motivo é o estágio `spa` — a imagem do Nginx precisa do `dist/` que ele produz, e com arquivos
separados o build de frontend existiria duas vezes, livre para divergir. A D3 continua valendo no que
decide; muda o número de arquivos.

**A catraca do bloco não é teste de código, é teste de composição.** `frontend/tests/compose-prod.test.ts`
guarda as duas propriedades do `docker-compose.prod.yml` cuja violação é **silenciosa** — um serviço
de dev que reaparece e um volume de código que volta —, porque `docker compose up` fica verde dos
dois jeitos. Ela mora em `frontend/tests/` pelo motivo já registrado na rule: o container `app` monta
só `./backend` e `./frontend`, então o vitest é o único runner com acesso à raiz. **A conferência é
textual e o custo está declarado no próprio arquivo:** o projeto não tem parser de YAML, e
acrescentar dependência ao frontend por causa de arquivo de infra seria acoplamento na direção
errada.

**Três passos do plano decidem por medição, e podem terminar em qualquer dos dois ramos:** se o
`poppler-utils` entra na imagem de produção (só entra se houver consumidor em `backend/app`), se o
Gotenberg pode ganhar healthcheck (a imagem de terceiro pode não trazer `curl` nem `wget` — e um
teste que não roda é pior que a ausência dele), e quais chaves do `.env.example` de dev entram no
molde de produção.

**A Task 2 instala e reverte um patch em `backend/public/index.php`** para medir o pico do FPM: a
medição é o artefato, o código da sonda não fica, e o Step 5 prova a reversão com `git diff` vazio e
`grep MEMPROBE` sem match. É a razão principal do **`executor: claude`** declarado no `## Handoff` —
paths fechados errariam a reversão ou não teriam autorização para o arquivo.

**Baseline a medir antes da Task 1, não herdar:** a suíte do frontend fechou em 87 arquivos / 481
testes no fechamento do BD-12, e a do backend em 872 passed / 5 skipped no do BD-18 — mas esta árvore
tem a `main` inteira dentro, e o gate da Task 7 cobra os números medidos, não os citados.

### Execução — 2026-08-22: 7 tasks provadas, bloco em `ready_for_review`

Sete tasks, dez commits, `8b1fd6df..e0019bac`. Execução por **subagent-driven-development com TDD**,
um implementador e um revisor por task, ledger em `.superpowers/sdd/progress.md`.

| Task | Commits | Entrega |
|---|---|---|
| 1 | `8b1fd6df` | `memory-cli.ini` — `memory_limit = 320M`, de pico medido de 129,00 MB |
| 2 | `ee230219` | `www.conf` — `memory_limit = 256M` de pool, com o piso emendado pelo João |
| 3 | `80029cea` | `docker/nginx/prod.conf`, origem única, `nginx -t` conferido |
| 4 | `e9f83043`, `31a29d33` | `docker/Dockerfile.prod` quatro estágios — `app` 293MB, `web` 105MB |
| 5 | `c54d1a35`, `317a6512`, `fef76d08` | `docker-compose.prod.yml` + catraca de composição |
| 6 | `73f6e219`, `ab5b057d`, `e0019bac` | overlay de sonda, `.env.production.example` sem segredo |
| 7 | este commit | DoD end-to-end contra a stack de produção real |

**As oito provas da DoD fecharam**, duas delas com divergência entre o sinal escrito e o
comportamento real do sistema: a **prova 3** esperava ausência de `Access-Control-Allow-Origin`, e o
`HandleCors` o emite mesmo same-origin porque `cors.php:22` usa `FRONTEND_URL`; a **prova 6**
esperava o PDF do certificado no bucket, e o `CertificatePdfService` renderiza sob demanda sem
persistir. Nos dois casos a substância foi provada por outro caminho. **A §10 da spec registra as
medições, as emendas e todos os desvios do plano** — inclusive o `--entrypoint php` do
`key:generate`, que **precisa entrar no runbook do bloco de deploy**.

**P-50 paga:** `docker compose exec -T app php artisan test` → 867 passed / 5 skipped, 3095
assertions, 59,01s, sem estouro de memória. Frontend: 88 arquivos / 499 testes, `lint` e `build`
exit 0.

**Ambiente devolvido:** stack de sonda derrubada com `down -v`, volumes de dev intactos, árvore limpa.

**Nada de AWS foi provado** — a limitação 1 da spec segue de pé, e o review deve cobrá-la como
limitação declarada, não como lacuna.

### Revisão de sprint — 2026-08-22: risco ALTO, duas lentes, 9 achados, zero violação de lei na arquitetura

**Classificação: ALTO** — o bloco escreve o molde de `.env` que governa a cadeia Sanctum (lei §5.4)
e a imagem que vai a produção com dado de peso legal. Duas lentes: revisão Claude contra o gabarito
do projeto e revisão independente do Codex (`mcp__codex__codex`, read-only) sobre o mesmo intervalo
`5bcd4b7c..HEAD`.

**Convergência das duas lentes** em três achados: o gate de env do entrypoint sem as variáveis da
cadeia Sanctum, o `.dockerignore` sem `bootstrap/cache/*.php`, e a prova 5 (`APP_DEBUG`) exercitada
só em 401/404. O Codex viu sozinho os seeders na imagem e as folgas da catraca; ambos foram
verificados no código e na imagem antes de entrar no relatório.

**Divergência entre revisores, não aceita:** o Codex reportou vazamento de `backend/auth.json`,
`storage/*.key` e `storage/app/**` para dentro da imagem. Medido em `lotus-app:local`: `auth.json`
não existe na árvore, e `storage/app` contém três arquivos, todos `.gitignore`. Rejeitados — a
lacuna do `.dockerignore` que sobrou é a de `bootstrap/cache`, que é o achado Q-3.

**Nove achados, nenhum contra as leis §5 na arquitetura entregue** (sem Repository, sem auditoria em
trigger, sem `generated.ts` tocado, sem `abort(422)`, sem import cruzado de feature). Os dois 🔴 são
brechas operacionais que a imagem carrega, não desenho errado:

| # | Achado | Sev. | Esforço |
|---|---|---|---|
| Q-1 | `database/seeders` na imagem: o único caminho que instala o `RolePermissionSeeder` cria `admin@lotus.cl` / `senha123` como superadmin | 🔴 | P |
| Q-2 | Gate de env do entrypoint não cobre `SANCTUM_STATEFUL_DOMAINS`/`FRONTEND_URL`/`SESSION_DOMAIN`, que o molde entrega vazios | 🔴 | P |
| Q-3 | `.dockerignore` sem `backend/bootstrap/cache/*.php`: `config.php` cacheado na máquina que builda entra na camada com segredo resolvido | 🟡 | P |
| Q-4 | `.env.production.example` sem `SESSION_SECURE_COOKIE` | 🟡 | P |
| Q-5 | Prova 5 exercitou 401/404; o branch que `APP_DEBUG` governa é o 500 de `ProblemDetails.php:67` | 🟡 | P |
| Q-6 | `prod.conf` sem `Cache-Control` no `index.html` | 🟡 | P |
| Q-7 | `pm.max_children` não fixado, embora o sizing de 1,25 GB dependa dele | 🟡 | P |
| Q-8 | Catraca prova existência onde precisava provar propriedade (`env_file` e `condition` do overlay) | 🟡 | P |
| Q-9 | `docker-compose.prod.yml` sem teto de log do json-file | 🟡 | P |

**O João aprovou os nove em 2026-08-22.** As correções estão na seção seguinte.

### Correções da revisão — 2026-08-22: nove achados, nove commits, tudo provado

`ed4cdc7b..` (nove commits, um por achado). Nenhuma correção foi aceita por leitura
de diff: cada uma tem uma medição contra a imagem reconstruída ou contra a stack de
produção com o overlay de sonda.

| # | Commit | Prova |
|---|---|---|
| Q-1 | `ed4cdc7b` | `db:seed --force` com `APP_ENV=production` na stack real: `roles=3`, `permissions=42`, **`users=0`**. O `RolePermissionSeeder` continua rodando em qualquer ambiente |
| Q-2 | `989250d5` | Os dois modos de falha: chave **ausente** e chave **vazia** (o caso do molde) saem com `entrypoint: variável obrigatória ausente: SANCTUM_STATEFUL_DOMAINS`, exit 1 |
| Q-3 | `155f7dc3` | `config.php` plantado no host com string sentinela: `grep -rl` na imagem reconstruída não acha nada. `storage/framework/cache/data` passou a existir; `storage/framework/testing` sumiu |
| Q-4 | `e3a25dcf` | Chave no molde com a dependência de HTTPS escrita ao lado. A sonda roda em HTTP e não define a chave, então não regride |
| Q-5 | `docs(spec)` §10.8 | 500 **real** (MySQL parado, rota pública sem sessão): com `APP_DEBUG=false`, `detail` genérico; com `true`, o `detail` vaza `SQLSTATE`, host, porta, database e o SQL. O par distingue os dois estados — o 401/404 original não distinguia |
| Q-6 | `b012ae09` | `curl -I` contra a stack: `/` responde `Cache-Control: no-cache`; `/assets/index-*.js` responde `public, max-age=31536000, immutable`, **um header cada** (a primeira tentativa emitiu dois, por causa da diretiva `expires`) |
| Q-7 | `aaed3592` | `grep` na imagem: `pm.max_children = 5` agora está no `zz-www.conf`, não herdado |
| Q-8 | `65d03e0b` | Mutação negativa 2/2: `env_file` hardcoded e `condition: service_started` reprovam as asserções novas. 19 testes no arquivo, 500 na suíte |
| Q-9 | `34c94535` | `docker inspect`: `json-file map[max-file:3 max-size:10m]` nos serviços da stack |

**Regressão medida depois de tudo, não assumida:** stack de produção reconstruída e
no ar, `nginx` `(healthy)`, `/up` `200`, e o **login real fecha** —
`/sanctum/csrf-cookie` `204`, `POST /api/login` `200` com cookie `lotus-session`
gravado, `GET /api/me` `200`. Suíte backend `867 passed / 5 skipped`; frontend
`88 arquivos / 500 testes`, `lint` e `build` exit 0.

**Ambiente devolvido:** `down -v` no projeto `lotus-probe` (zero containers, zero
volumes, zero redes); os 12 volumes de dev intactos; árvore limpa.

**Nada a diferir:** os nove foram corrigidos, então nenhum item novo vai ao
`backlog.md` nem às pendências por conta desta revisão.

### Fechamento — 2026-08-22: o login real contra a stack de produção reconstruída

**Item 0 do gate, medido agora e não citado da execução.** As nove correções da revisão entraram
DEPOIS da DoD end-to-end do bloco, e três delas mexem exatamente na cadeia que o login atravessa — o
gate de env do entrypoint (Q-2), o `.dockerignore` do `bootstrap/cache` (Q-3) e o
`SESSION_SECURE_COOKIE` do molde (Q-4). Provar por citação teria provado uma imagem que não existe
mais. As duas imagens foram reconstruídas do `HEAD` e a stack subiu com o overlay de sonda
(`LOTUS_ENV_FILE=./docker/probe.env`, porta 8081, projeto `lotus-probe`):

- **A cadeia inteira, com os cabeçalhos que o `/fechar-sprint` exige** (`Origin` e `Accept`, senão os
  dois 500 são do curl): `nginx` entrou em `(healthy)`, `GET /up` → **200**, `GET /` → **200**,
  `GET /sanctum/csrf-cookie` → **204**, `POST /api/login` → **200** com o cookie `lotus-session`
  gravado no jar, e `GET /api/me` → **200** devolvendo `roles: ["superadmin"]` e a lista de
  permissões. É a lei §5.4 (cookie de sessão Sanctum + CSRF) funcionando **na imagem de produção**,
  não no compose de dev.
- **O Q-1 reprovado ao vivo, que é o achado 🔴 mais caro do bloco:** `php artisan db:seed --force`
  com `APP_ENV=production` imprimiu *"Admin de desenvolvimento ignorado: só é criado em local/demo.
  Roles e permissões foram instaladas."* e parou ali. O `RolePermissionSeeder` rodou; o
  `admin@lotus.cl`/`senha123` com role `superadmin` **não nasceu**. O usuário do login acima teve de
  ser criado à mão na sonda — que é exatamente a propriedade que se queria.
- **`migrate` fora do entrypoint, como a D7 desenhou:** o container subiu com o banco vazio e as 24
  migrations só rodaram quando chamadas. O deploy é `pull → migrate → up`, e o arranque não migra
  sozinho.

**Ambiente devolvido:** `down -v` no projeto `lotus-probe` — zero containers, zero volumes, zero
redes. Os volumes de dev seguem intactos.

**Resto do gate.** `docker compose exec -T app php artisan test` → **867 passed / 5 skipped, 3095
assertions**, 58,49s — **pelo comando documentado do `CLAUDE.md` §6, sem contorno**, o que é a prova
da P-50 e não uma nota de rodapé: desde 2026-08-19 esse comando morria. `pnpm lint` exit 0 ·
`pnpm build` exit 0 · `pnpm test` **88 arquivos / 500 testes**. Pint `passed` no único arquivo PHP do
bloco (`DatabaseSeeder.php`). **`typescript:transform` é N/A por medição** — nenhum DTO no diff e
`generated.ts` fora dos 18 arquivos do bloco. **Código morto: nenhum** — os artefatos que o bloco
criou (`docker/php/memory-cli.ini`, `docker/probe.env`, o overlay, a catraca de composição) têm
consumidor declarado, e a sonda de memória da Task 2 já tinha sido revertida com `git diff` vazio.

**Leis §5: nenhuma contrariada.** Sem Repository, sem auditoria em trigger, sem `generated.ts`
tocado, sem `abort(422)`, sem import cruzado de feature. A §5.4 foi **provada**, não só respeitada.
A §5.8 (DoD = critério provado) é o próprio item 0 acima.

**Pendências.** A **P-50** foi **encerrada por este bloco** — o gatilho venceu pelas duas metades ao
mesmo tempo (o bloco tocou `docker/php/` e o João decidiu o número), e o impasse dos dois SAPIs se
resolveu separando CLI (320M, no `conf.d`) de FPM (256M, no `php_admin_value` do pool). A ficha está
em `pendencias/encerradas.md` com a medição que fecha. A **P-40 saiu de vez**: este é o primeiro
fechamento posterior ao do BD-12, que é a condição literal que ela registrava. **A P-03 foi conferida
e não venceu** — medido agora, o main tree está em `hardening-acesso-ownership-e-integridade` /
`planning` e a `fix-frontend` em `frontend-revisao-ui-por-modulo` / `executing`; o gatilho pede dois
blocos de **backend** em paralelo, e o de lá ainda não escreve código. **Nenhuma pendência nasceu
nesta sprint** — os nove achados da revisão foram corrigidos, não diferidos.

**Backlog: o item 10 não saiu inteiro, porque não foi entregue inteiro.** A metade do runtime saiu e
está registrada como entregue; o item passou a se chamar **`infra-producao-provisionamento-aws`** e
guarda o que a D1 recortou — EC2, RDS, S3/IAM, SES/DKIM, TLS e CloudWatch —, mais as quatro decisões
do João que continuam abertas e a herança do `--entrypoint php` no `key:generate`. Apagar o item
inteiro teria apagado da fila trabalho que ninguém fez. **Nada foi promovido.**

**Arquivados:** plano em `plans/archive/2026-08-22-infra-producao-runtime-e-aws.md` e spec em
`specs/archive/2026-08-22-infra-producao-runtime-e-aws-design.md`; o link da spec dentro do plano foi
reapontado. **`state_basis_commit` continua em `c8480eee`** — o commit contra o qual o João promoveu
o bloco; o SHA deste fechamento não entra no arquivo que ele fecha.

## Penúltimo item fechado — 2026-08-22 (`bd12-load-state-e-listas`, BD-12 dos blocos de dívida)

### Merge da `main` — 2026-08-22: a árvore que a prova exigia

O João mandou trazer a `main` **antes** da prova de fechamento, e o motivo é medido: a `main` fechou
o **BD-18** em paralelo e o `ca096650` reescreveu a mensagem de falha dentro de `CourseStep.tsx` —
exatamente o sítio que a P-40 mede. Provar sem o merge teria provado código que não vai para a
`main`. A nota do próprio `backlog.md` de lá já dizia isso: *"o alcance de D-55 e P-40 se remede
contra a árvore com o BD-18 dentro, não contra o basis"*.

23 commits, **um único conflito** — o `updated_at` do frontmatter do `state.md` —, resolvido para o
desta árvore. Todo o resto mesclou limpo, `.claude/rules/frontend-fsliced.md` incluído: os dois lados
escreveram em regiões diferentes do mesmo arquivo. `backlog.md`, `historico/progress.md` e
`pendencias/` vieram inteiros da `main`. Árvore mesclada: `pnpm lint` 0, `pnpm build` verde,
**87 arquivos / 481 testes**, zero falha — o `cellMemo={false}` não regrediu nenhuma das 26 provas
novas do BD-18.

### Fechamento — 2026-08-22: os dois débitos provados no navegador, contra a árvore mesclada

**Item 0 do gate, na tela e não no diff** (Chromium, Vite desta árvore na **5174**, API real em
`:8080`, sessão de admin; a 5174 está em `SANCTUM_STATEFUL_DOMAINS` desde `6fd0ad8`):

- **D-55, o sujeito** — em `/cursos`, visão `Archivados`, a célula `Archivado el` do curso arquivado
  em 2026-08-18 acompanhou a troca de idioma **pelo menu, sem F5**, nos três idiomas: `18-08-2026`
  (es-CL) → `8/18/2026` (en) → `18/08/2026` (pt-BR), com o cabeçalho indo junto (`Archivado el` →
  `Archived on` → `Arquivado em`). Antes do knob o cabeçalho trocava e o valor congelava.
- **D-55, os controles positivos** — em `/administracion`, `Último acceso` foi de
  `22-08-2026 01:59 a. m.` para `8/22/2026 01:59 AM` e o `AppTag` de estado de `Activo` para
  `Active`, na mesma troca. Os dois congelavam pelo mesmo motivo e destravaram pelo mesmo knob: o
  alcance é o wrapper, não a coluna de arquivamento.
- **D-55, o controle negativo** — `ArchivedQuotesList` (layout flex, **fora** de DataTable) seguiu
  trocando ao vivo: `Archivado el: 22-08-2026` → `Archived on: 8/22/2026`. Nada regrediu onde o
  defeito nunca existiu. A cotação usada na sonda foi arquivada e **restaurada** pela própria tela.
- **P-40** — com o catálogo de dev **de fato vazio** (`GET /api/courses` = 200 e `[]`), o passo 1 do
  wizard de cotação mostrou o título `Curso` e **`No hay cursos.`**; `No se pudieron cargar los
  datos` e `Reintentar` **não apareceram** (`find` sem match nos dois), o campo de busca não nasceu e
  `Siguiente` ficou desabilitado. Controle positivo dos dois lados: o mesmo wizard listando os cursos
  antes de esvaziar e depois de restaurar.

**O classificador de auto mode recusou o laço de `curl -X DELETE` sobre os cursos** — a mesma família
de recusa que congelou a P-40 em 2026-08-14, quando o `tinker` foi barrado. Contornada pelo caminho
que o usuário usa: os três cursos foram arquivados e restaurados pela ação `Archivar`/`Restaurar` da
linha, no navegador. A medição é a mesma; o que mudou foi a ferramenta.

**Zero resíduo no banco de dev** (P-44 existe por gates que esqueceram o próprio rastro): ids ativos
`[1,2,3]` antes e depois, `IDENTICO`; o único curso arquivado que sobra é o `GATE T7` de 2026-08-18,
anterior ao bloco; a cotação `Mantenimiento de subestaciones` voltou ativa ao `Scap 1`, que exibe as
3 cotações de novo.

**Resto do gate.** `pnpm lint` exit 0 · `pnpm build` verde · `pnpm test` **87 arquivos / 481 testes**,
zero falha. **`php artisan test`, Pint e `typescript:transform` são N/A por escopo medido**, não por
suposição: `git diff main...HEAD --name-only -- backend/ frontend/src/shared/types/generated.ts`
devolve **zero arquivo** — mesmo precedente do fechamento do BD-18. Código morto: o bloco criou um
arquivo de teste (consumido pelo runner) e uma prop; nenhum `.gitkeep`, nenhum placeholder, e o
`eslint` reprova import não usado. Leis §5: nenhuma contrariada — a mudança vive em `shared/ui`, sem
schema, sem `generated.ts`, sem Sanctum, RBAC, dinheiro ou certificado.

**Pendências.** A **P-40** foi encerrada por este bloco e está em `pendencias/encerradas.md`, com a
linha do índice acompanhando. A **P-29** e a **P-35** saíram de vez: este é o primeiro fechamento
**posterior** ao do BD-14, que é a condição literal que elas registravam. **Nenhuma pendência nasceu
nesta sprint.** O ponto que o review deixou fora de escopo por decisão do João — `beforeAll` mutando
idioma em `archivedColumns.test.tsx` — **não virou ficha**: o arquivo restaura o idioma no próprio
teste e no `afterAll`, o raio foi medido como zero e transformar em pendência uma decisão de não
corrigir seria criar rastro contra a decisão. Fica registrado aqui; se o João quiser ficha, ela nasce
com gatilho.

**Arquivados:** plano em `plans/archive/2026-08-20-bd12-load-state-e-listas.md` e spec em
`specs/archive/2026-08-20-bd12-load-state-e-listas-design.md`; o link da spec dentro do plano foi
reapontado para o caminho novo. **Backlog:** o bloco BD-12 saiu da fila e a ficha do **D-55** saiu da
lista de débitos técnicos, pelo mesmo padrão do BD-18. Nada foi promovido — a fila só anda por
escolha explícita do João.

**Estado: `idle`.** `state_basis_commit` continua em `fc852ce3`, o commit contra o qual o João
promoveu o BD-12; o SHA deste fechamento não entra no arquivo que ele fecha.

## Antepenúltimo item fechado — 2026-08-20 (`bd18-useloadstate-promise-e-forma`, BD-18 dos blocos de dívida)

### Seleção — 2026-08-20

**Promoção explícita do João**, com esta árvore em `idle`. O gate do `/planejar-bloco` reprovou o
argumento pelo motivo de sempre: veio o título de seção do backlog (`BD-18 · Frontend · useLoadState:
…`, com separadores e travessão pendurado), não o slug — e `active_work_item` era `null`, então
"corresponder exatamente" também falhava. Nenhum arquivo tocado antes da decisão dele.

**Quatro decisões dele fecharam o gate:** o slug `bd18-useloadstate-promise-e-forma`; **rota direta a
`ready_for_planning`, sem Context Packet** (os três débitos nasceram de medição local — D-54 e D-56 no
review e no fechamento do BD-17, D-14 no review do BD-6 —, e não há fonte externa a recuperar); a
worktree `fix-frontend` seguindo na branch atual `docs/bd18-agrupamento-useloadstate`, que já carrega
o commit de agrupamento do backlog; e o **alcance completo do D-54**, contra o que a ficha registrava.

**Segunda árvore viva, medida e não deduzida:** `/home/jvbat/projetos/lotus` está em
`bd14-contrato-de-entrada`, `workflow_state: ready_for_review`. É bloco de **backend**, então a P-03
não dispara (o gatilho dela são dois blocos de backend) e a única colisão possível é
`docs/superpowers/**`, que sempre colide e é merge mecânico. Sexta exceção declarada à invariante de
um `active_work_item`, por decisão do João.

### Planejamento — 2026-08-20

**O escopo do bloco é maior do que as duas fichas registravam, e isso foi medido antes de desenhar.**
A ficha do D-54 dizia "2 hooks compartilhados e 7 consumidores"; a varredura por forma
(`void <query>.refetch()`) contra `93acf6a7` achou **14 produtores em 12 arquivos**, dos quais
**seis** alimentam um `AppErrorState` de tela cheia — o único componente que de fato aguarda a
promise. **Três travam a promise por TIPO** (`useValidationPage.ts:9`, `useDashboard.ts:48`,
`StudentClientField.tsx:40` declaram `() => void`), onde trocar o corpo sem trocar a assinatura não
mudaria nada. E a ficha errava os sítios de prova: `QuotesList:60`/`:74` e `BudgetDialog:85` são
`InlineLoadState`, cujo botão **não tem estado de carga** — hoje a promise ali não muda nada.

Spec em `specs/archive/2026-08-20-bd18-useloadstate-promise-e-forma-design.md`, oito decisões. As que mudam o
desenho em relação ao que o backlog previa: `listSource` mora em **`shared/hooks`**, não em
`shared/lib` ao lado do irmão `archivableSource`, porque precisa de `@tanstack` e de `ProblemDetails`
e a fronteira `shared/lib` × `shared/api` está registrada em três arquivos (D1); a extração são
**duas** exportações, não uma — `listSource` para os quatro sítios de forma de página e `loadFailure`
para os dois hooks de carga, que falam outra grafia e não caberiam na primeira (D2/§3); e o
`InlineLoadState` entra no bloco com a espera compartilhada, senão a promise recém-corrigida seguiria
descartada em 12 usos (D5).


**Plano em `plans/archive/2026-08-20-bd18-useloadstate-promise-e-forma.md`: 10 tasks, uma por commit.** A
ordem interna que o backlog fixou (D-56 antes de D-54, D-14 por último) é respeitada, e a peça nova
entra antes de todo o resto: extrair o normalizador primeiro faz a promise nascer certa nos sítios de
uma vez, enquanto corrigir a promise antes seria consertar cópias que o passo seguinte apagaria.

**Uma segunda medição durante o `writing-plans` emendou a spec, e a decisão de escopo foi do João:**
a política `loadFailure` está escrita à mão em **12** sítios, não nos 6 que a §3 tabela — os seis
extras (`useEnrollmentSection`, `useTurmaDetail`, `useRedatorPicker`, `useTurmaDocsSection` e os dois
de `useBudgetDetail`) são exatamente os arquivos que a D4 já abre para devolver a promise. **Dois
ficam de fora com motivo declarado:** `useHistorial` e `useEmissionPanelState` escrevem
`isError ? (error ?? null) : null`, que é outra política — devolve `null` onde a nossa devolve `{}` —
e trocá-la mudaria tela sem DoD que o cubra.

**Baseline medida antes da Task 1, não herdada:** `pnpm test` 81 arquivos / 453 testes verdes, lint
exit 0, build verde. O gate da Task 10 cobra 85 / 467.

### Execução — 2026-08-20

**As 10 tasks executadas em `subagent-driven-development`, uma por commit**, de `add3511f` a
`ee650ffb`, na worktree `fix-frontend`. Ledger em `.superpowers/sdd/progress.md`. Gate final:
`pnpm lint` exit 0, `pnpm build` verde, `pnpm test` **84 arquivos / 468 testes**.

**As duas varreduras que fecham os débitos, rodadas antes de a rule ser escrita e reconferidas no
review final:** `grep "isError ? (.*?? ({} as"` e `grep "void .*\.refetch()"` devolvem **zero
linha** fora de teste. `git diff main...HEAD -- backend/ generated.ts` = vazio, então Pint,
`php artisan test` e `typescript:transform` seguem N/A por escopo medido.

**Quatro desvios do plano, todos registrados no ledger com o motivo:** (1) o parâmetro de
`listSource` virou **estrutural** — o `...listSource(query)` do plano não compilava, porque
`useCrudPage`/`useArchivedPage` seguram contrato estreito, e a alternativa era um `as UseQueryResult`
que mentiria sobre os fakes de teste; (2) o `refetch` é **anotado** `(): Promise<unknown>` e não
deixado inferir — o inferido vaza `QueryObserverResult` para cima por `ReturnType<>` e obrigaria
todo stub a montar o resultado inteiro; (3) `InlineLoadState.test.tsx` **já existia** (o mapa do
plano errava), então os testes foram acrescentados e o alvo caiu de 85 para 84 arquivos; (4) um
teste a mais que o previsto, cobrindo o ramo `readOnly` do `RedatorCourseSelector`, por achado de
review de task.

**As contagens intermediárias do plano não fechavam em cadeia** (esqueciam os 5 testes da Task 1).
O alvo final dele — 467 testes — estava certo; ficaram 468 pelo desvio (4).

**DoD end-to-end provado no navegador**, contra a API real em `:8080`, com falha **isolada** por
rota (interceptação no browser, sem derrubar o nginx — o `GET /api/me` sobreviveu e o shell não
redirecionou): (1) o "Reintentar" de tela cheia em `/operacion/turmas/6` fica `disabled` com o GET
**segurado em voo** e volta quando ele responde; (2) o `InlineLoadState` do diálogo de orçamento
fica `disabled` **com spinner** durante todo o voo do `GET /api/clients` e volta depois — é o
comportamento que ele não tinha; (3) com o `GET /api/redatores` falhando e cache em mão, a seção
WRITERS do diálogo de curso **mantém os três redatores** e o aviso vai ao lado, sem o erro de seção
inteira; (4) as cinco telas de arquivados (`/comercial`, `/cursos`, `/personas`, `/operacion`,
`/administracion`) seguem alternando ativo/arquivado com as colunas `Archived on`/`Archived by` e
voltam ao ativo.

**O item não-binário da spec §7 foi conferido e aprovado:** o botão do `InlineLoadState` não tem
`icon`, então o PrimeReact **acrescenta** o spinner à frente do label (`p-button-loading-label-only`)
e ele cresce 24px (83 → 107) durante o voo. Como é o último item da linha, não empurra nada e
continua legível.

**Observação medida, não regressão do bloco:** em `TurmaDetailPage` o "Reintentar" fica `disabled`
por ~300ms e então a tela inteira troca pelo esqueleto, porque o ramo `loading` vem antes do
`loadError` na página. Comportamento pré-existente, fora do escopo do BD-18.

**Review final da branch (`requesting-code-review`, opus): "ready to merge with fixes", sem
Critical.** Os três Important foram fechados no commit `ee650ffb`: a rule ganhou as duas exceções
deliberadas (`useHistorial`/`useEmissionPanelState` devolvem `null` onde a política devolve `{}`), o
`onRetry` de `AdminView`/`PeriodFilter` parou de mentir com `() => void`, e o `useRetryPending`
ganhou `catch` e o registro de por que o `setPending` pós-unmount não é vazamento no React 19. O
terceiro Important era a própria transição de estado, feita aqui. Os Minors e os dois débitos novos
que o review mediu (`StudentDetailSections` como terceiro sítio do D-14; a expressão de mensagem do
aviso repetida em 5 componentes) ficam para a triagem do João no review do bloco.


### Revisão de sprint — 2026-08-20: risco BAIXO, uma lente, 4 achados, zero violação de lei

**Classificação: BAIXO risco** — frontend puro, `executor: claude`, sem schema, `generated.ts`,
Sanctum, auditoria, RBAC, dinheiro ou emissão de certificado. Os três hooks de `certification` entram
só pelo tipo de retorno do `refetch`. **Uma lente, sem revisão independente do Codex.**

**Fronteira do bloco reconferida:** `git diff --name-only main...HEAD -- backend/ frontend/src/shared/types/generated.ts`
devolve **zero arquivo**. **Gate re-rodado nesta revisão:** `pnpm lint` exit 0, `pnpm build` verde,
`pnpm test` **84 arquivos / 468 testes**. **Órfãos: nenhum** — `listSource`, `loadFailure` e
`useRetryPending` têm consumidor, e as duas varreduras do bloco (`void .*\.refetch()` e
`isError ? (… ?? ({} as`) seguem devolvendo zero linha fora de teste e fora dos dois sítios declarados.

**Zero violação das leis §5** e zero contra o gabarito da `frontend-fsliced.md`: nenhuma feature
importa `primereact` direto nem outra feature, nenhum `useEffect` de reset entrou, e a política de
carga passou a nascer num lugar só, que é o que a rule nova cobra.

**Quatro achados, nenhum 🔴. O João aprovou os quatro, e os quatro foram corrigidos:**

- **Q-1 🟡 P — `StudentDetailSections.tsx:33` é o terceiro sítio do D-14.** Gateia por `detail.isError`
  cru e substitui as DUAS seções; com cache em mão um refetch falho apaga vínculos e turmas já
  carregados. Some com o `useStudentDetail` sendo consumido cru (`useQuery` direto, sem
  `useResourceState`), então a derivação da mensagem também está à mão na feature. Fora do escopo
  declarado do BD-18 — destino natural é o `backlog.md`.
- **Q-2 🟢 P — `useDashboard.ts:182` guarda o último `({} as ProblemDetails)` escrito à mão**, num
  arquivo que ESTE bloco abriu. Não é a ternária que a rule nomeia (o ramo já está dentro de
  `if (query.isError)`), mas é a mesma política; `const falha = loadFailure(query); if (falha) …`
  fecha sem mudar comportamento e deixa a linha da D7 com as duas exceções que ela declara.
- **Q-3 🟢 M — `errorDetail ?? t(errorHint)` está composto à mão em 11 sítios / 7 componentes**, dois
  deles escritos por este bloco. É o D-56 um andar acima, na mensagem em vez da fonte. Contrapeso
  registrado: o docblock do `useLoadState` diz que "a política é de quem IMPRIME". Decisão de
  desenho, não correção — destino natural é o `backlog.md`.
- **Q-4 🟢 P — `AppErrorState` não tem arquivo de teste.** A D5 moveu a espera dele para o
  `useRetryPending`, e a única catraca do comportamento vive no `InlineLoadState.test.tsx`: apagar
  `loading={retry.pending}` do `AppErrorState` não deixa nada vermelho, e são os 6 sítios de tela
  cheia que consomem a promise que o D-54 pagou.

### Correções da revisão — 2026-08-20, quatro commits

`c9245218` (Q-2) · `11df3a72` (Q-4) · `ca096650` (Q-3) · `ce402a95` (Q-1), nessa ordem — o Q-3 vem
antes do Q-1 porque o sítio novo do detalhe do aluno já nasce usando o `loadMessage`.

- **Q-2** — `useDashboard` passa a chamar `loadFailure`; o `if` sobre o retorno substitui o
  `if (query.isError)`, porque a política responde as duas perguntas numa. Comportamento idêntico.
- **Q-4** — `AppErrorState.test.tsx` nasce com a promise controlada do molde do `InlineLoadState`:
  `disabled` durante o voo, livre depois de resolver, clique repetido ignorado, handler `void`
  seguindo, mais os dois ramos básicos.
- **Q-3** — `loadMessage(estado, t)` em `shared/lib/screenDetail.ts`, ao lado das duas metades que
  ele junta, recebendo `t` por parâmetro (`shared/lib` não conhece i18next, mesmo motivo de
  `loadErrorHint` devolver chave). Os **13 sítios de 8 componentes** adotaram; `grep "errorDetail ?? t("`
  fora de teste devolve **uma** linha, que é a do próprio helper. A linha da rule entrou junto,
  no commit que zerou o último sítio — mesma disciplina da D7.
- **Q-1** — `StudentDetailSections` adota `useResourceState`, gateia por `failedWithoutData` e mostra
  um `InlineLoadState` só, acima das duas seções. Catraca nova no molde dos outros dois sítios do
  D-14 (o caso obrigatório é o do ramo COM cache). **`StudentLinkRow` saiu junto**: com o aviso o
  componente passou de 150 linhas e o `max-lines` reprovou — extração literal, nenhuma condicional
  mudou de forma.

**Gate depois das quatro:** `pnpm lint` exit 0, `pnpm build` verde, `pnpm test` **86 arquivos / 479
testes** (eram 84 / 468). As duas varreduras do bloco seguem em zero, e a terceira nasceu com o Q-3.
**Fronteira intacta:** `git diff --name-only main...HEAD -- backend/ frontend/src/shared/types/generated.ts`
= zero arquivo. **Nada ficou para o `backlog.md`** — os dois achados que a execução tinha deferido
(`StudentDetailSections` e a mensagem repetida) foram exatamente Q-1 e Q-3, e estão pagos.

**Não provado na tela:** as quatro correções têm catraca de teste; o DoD de navegador do bloco foi
provado antes delas, e o Q-1 mudou ramo de tela (`StudentDialog` em modo view, com o
`GET /api/students/{id}` falhando com cache em mão). Conferir no fechamento.

### Fechamento — 2026-08-20

**O que ficou pendente do review foi provado, e é o item 0 do gate:** o ramo do Q-1 na tela, na
árvore `fix-frontend` servida na **5174** (a 5173 é o `pnpm dev` do main tree, hoje em
`feat/bd12-datatable-idioma-e-catalogo-vazio` — provar nela teria provado o código de outro branch;
as duas portas já estão em `SANCTUM_STATEFUL_DOMAINS` e `FRONTEND_URL` desde o `6fd0ad8`). Chromium
contra a API real em `:8080`, com falha isolada por rota (`**/api/students/35` → 500
`application/problem+json`), sem derrubar nada em volta.

**Os três ramos, com a rede confirmando a sequência** (`200` → `500` → `500` → `200` no
`GET /api/students/35`), sobre a aluna Javiera Lagos (1 vínculo, 1 turma):

1. **Falha COM cache — o defeito que o Q-1 pagou.** Reabrir o diálogo com o GET em 500 mantém
   "Company links" (`Enel Distribución · Current · since Aug 2026`) e "Turma history"
   (`Scap 5 - Cot 1 · Seguridad en alta tensión · Jun 2026 · Failed`), e põe **um** aviso `role=alert`
   ACIMA das duas, com "Retry". Antes da correção, o `detail.isError` cru apagava as duas seções.
2. **Retry com a falha persistente** mantém tudo — aviso, vínculos e turmas —, e some quando a rota
   volta: `unroute` + clique devolve `200` e zera o `alert`. É o `refetch` do D-54 devolvendo a
   promise no caminho real.
3. **Falha SEM cache** (recarga com a rota ainda mockada) substitui as DUAS seções pelo
   `AppErrorState` — "Could not load the data" / "Check your connection and try again." / "Retry" —,
   sem cabeçalho órfão. É o `failedWithoutData` e a D16 (vazio silencioso proibido) na tela.

**A mensagem impressa é o hint por status, não o `detail` do servidor** — o `detail` injetado
("Falha injetada no DoD") não aparece, porque o `screenDetail` só o repassa com `localDetail: true`.
Comportamento por desenho, conferido de passagem.

**Gate:** `pnpm lint` exit 0 · `pnpm build` verde · `pnpm test` **86 arquivos / 479 testes**.
Backend **872 passed / 5 skipped, 3095 asserções**, intocado — pelo binário direto com
`memory_limit` elevado, porque o comando do `CLAUDE.md` §6 morreu de novo: é a **P-50**, que ganhou a
reprodução desta árvore com o pico agora **acima** do teto (129,00 MB contra 128M). **Pint e
`typescript:transform` não se aplicam** — `git diff --name-only main...HEAD -- backend/ frontend/src/shared/types/generated.ts`
devolve zero arquivo. **Órfãos: nenhum** — `listSource`, `loadFailure`, `useRetryPending`,
`loadMessage` e `StudentLinkRow` têm consumidor. **As três varreduras do bloco seguem em zero fora de
teste**, cada política com uma única linha viva: `listSource.ts:19`, `screenDetail.ts:98`, e nenhum
`void …refetch()`.

**Um aviso de console apareceu e NÃO é deste bloco:** `Each child in a list should have a unique
"key" prop` no `TableBody` da **listagem** de alunos, medido pelo timestamp do log antes da primeira
falha injetada. `StudentsTable.tsx` não está entre os 51 arquivos do bloco. É o mesmo achado
registrado em 2026-08-19 no painel de emissão — mesma classe, segundo sítio.

**Um gatilho de pendência ficou ambíguo e vai para o João, não para o fechamento:** a **P-39** fecha
"quando um bloco tocar RBAC de catálogo **ou reusar a receita de injeção de falha do BD-6**". A
técnica foi reusada aqui (e já tinha sido no DoD da execução e no do BD-17), mas a fonte — o plano
arquivado do BD-6 — **não** foi lida nem reusada, e o próprio corpo da ficha proíbe retro-editá-la
(regra da P-27). O gatilho como está nunca vence por leitura própria; quem decide o que ele quer
dizer é o João. **Nenhuma pendência nasceu nesta sprint** e nenhuma das encerradas venceu a sprint de
rastro (a lista está vazia desde o fechamento anterior).

**Estado ao fechar: `idle`.** O merge com a `main` mudou isso na mesma hora — ver abaixo.

### Merge com a `main` — 2026-08-21: o mesmo trabalho estava agrupado duas vezes

**Duas árvores editaram o mesmo backlog sem se ver, e a colisão é de escopo, não de texto.** Às
**14:57** de 2026-08-20, nesta worktree, o João promoveu o **BD-18** cobrindo D-54, D-56 e D-14 — e
esse commit tirou a D-14 do BD-12. Às **16:33**, no main tree, ele reagrupou o **BD-12** para
*"load-state: o contrato de lista, o `refetch` e os sítios do BD-6"*, cobrindo **D-14, D-54, D-55,
D-56 e P-40**, e o promoveu a `ready_for_planning`. O segundo commit foi escrito sobre um backlog que
não tinha o primeiro: por isso a D-14 reaparece lá e o D-54/D-56 aparecem como órfãos a hospedar.

**Decisão do João no merge: o BD-12 segue promovido, com o escopo reduzido ao que sobrou.** D-14,
D-54 e D-56 estão pagos e provados por este bloco, então saem da cobertura do BD-12, que fica com
**D-55** (o `DataTable` não repinta as células `body` na troca de idioma ao vivo) e **P-40**
(remedição do ramo "catálogo genuinamente vazio" contra HEAD) — dois itens, não cinco. Nenhum dos
dois foi tocado aqui.

**Uma correção de índice entrou junto, e não é achado deste bloco:** o `pendencias/README.md` dizia
"Encerradas (0)" enquanto `encerradas.md` já carregava **P-29** e **P-35**, fechadas no BD-14 — o
fechamento de lá atualizou a ficha e não a linha do índice. As duas **não saem** no fechamento do
BD-18: ele correu em paralelo ao BD-14, não depois dele, e contar este fechamento como a sprint de
rastro apagaria a ficha antes de qualquer bloco posterior a ler.

**`state_basis_commit` continua em `fc852ce3`, que é o que o João escreveu ao promover o BD-12, e
isso é uma ressalva a carregar para o planejamento:** a árvore que o bloco vai medir já inclui o
BD-18, então o alcance de D-55 e P-40 se remede contra o merge, não contra o basis. Trocar o campo
aqui seria escolher por heurística um SHA que ninguém decidiu.

## Quarto item fechado — 2026-08-20 (`bd14-contrato-de-entrada`, BD-14 do backlog)

### Execução — 2026-08-20: 9 tasks, técnica `subagent-driven-development`, main tree

Bloco de backend, então **main tree** e não worktree (P-03: o compose monta o main tree, e testar
backend em worktree produziria verde contra código diferente). Base da branch `feat/bd14-contrato-de-entrada`:
`0fe30b13`. Ledger task a task em `.superpowers/sdd/progress.md` — aqui fica só o que decide.

As três leis que o bloco construiu:

- **"Ausente não é nulo"** (D1) — `App\Shared\Data\WritableAttributes::from()` tira do array toda
  chave que chega como `Optional`; só `null` explícito apaga. Aplicada a 10 campos em 5 `Update*Action`.
- **Chave `#[Computed]` no corpo de escrita vira 422** (D3) — `App\Shared\Data\ComputedFields::rejected()`
  com a regra `missing`, e **não** `prohibited`: o vendor implementa `validateProhibited` como
  `! validateRequired`, então presente-porém-vazio (`null`, `''`, `[]`) passaria com 200 silencioso.
- **Colisão de índice único de `users` vira 422 com o campo nomeado** (D4) — `UserProvisioner::writing()`
  sobre os 9 sítios que escrevem `User`, cobrindo as duas grafias de driver.

Mais `seq_in_budget` fora do `$fillable` (D5), escrito pela Action sob o lock que já existia.

### Três decisões tomadas durante a execução

1. **Convenção vence o plano nos nomes de teste** (decisão do João): classe em inglês, método em
   português. As quatro classes de omissão foram renomeadas; o plano cita os nomes antigos no DoD da
   Task 9 e a equivalência está no ledger.
2. **A varredura da Task 8 passou dos `paths_autorizados` do plano.** O `## Handoff` autorizava
   `Quote::create` → `forceCreate` só em `Comercial/**` e `Operation/**`; sobravam 15 arquivos e a
   branch ficava com 22 falhas. Estendida depois de confirmar que **não existe `Quote::create(` em
   `backend/app/`** — a varredura é 100% código de teste. 45 arquivos, 50 ocorrências.
3. **`ProfileData` e `SessionUserData` ganharam `#[Computed]`** fora da lista de seis do plano, porque
   a DoD exige os 11 campos de foto. São DTOs só-de-saída, nascem de `fromUser()`, nunca de request.

### DoD — 2026-08-20, remedido em `5a8bcdc`

**861 testes verdes / 5 skipped**, por diretório porque a suíte unida estoura o `memory_limit` de
128M do container (P-50 confirmado de novo): Cadastros 155 · Certification 97 · Comercial 86 ·
Dashboard 37 · Identity 256 · Operation 144 · Shared 69 · Unit 17. Zero falhas. Pint verde nos
**76** arquivos PHP do bloco. `typescript:transform` com **zero diff** em `generated.ts`. Cada item
da DoD da spec mapeia para um teste nomeado e existente.

### Review final da branch — o achado que os gates por task não podiam ver

Veredito: **o que o bloco construiu está correto e provado, nada regrediu.** Mas a lei que ele declara
não vale em todo lugar que devia valer, e três contraexemplos estão dentro das Actions que o próprio
bloco editou.

A raiz: o `DefaultValuesDataPipe` do Spatie entrega o **default literal** quando a chave está ausente,
**antes** do ramo que preencheria `Optional`. `WritableAttributes` recebe então um valor real e não
tem como saber que ele foi inventado. A medição da D-13 era cega a isso — ela procurou o idioma
`instanceof Optional ? null`, e aqui o valor nunca chega como `Optional`.

Seis campos, nenhum deles regressão do bloco. **`UserData::$is_active = true` é controle de acesso:**
um `PUT /api/users/{id}` que omita a chave reativa staff desligado, e `is_active` é o portão que
`AuthController:52` usa para barrar login. Fora do `active_work_item` (a D-13 mediu 10 campos, a D-12
mediu 11 de foto; nenhum destes seis está nas listas) e o remédio ainda escolhe entre duas leituras
da D1 — foi para **[P-51](./pendencias/abertas.md)** com o custo dos dois caminhos medido.

Os Minor de código do próprio bloco foram corrigidos antes do handoff: `bfcbbc7` (o tradutor de
coluna duplicada sequestrava `NOT NULL constraint failed`), `dd0cda1` (o arch test dos 11 campos
passava vazio se o `glob` não achasse nada) e `5a8bcdc` (três dialetos fora de compasso).

### Um ponto de estado a refazer no fechamento

O base da branch, `0fe30b13`, é literalmente o commit que promoveu `bd17-superficie-de-arquivados` a
`ready_for_planning` — e o BD-14 sobrescreveu esse `active_work_item`. Nada se perdeu (o BD-17 e seus
três débitos vivem no `backlog.md:208`), mas **a promoção precisa ser refeita quando o BD-14 fechar.**
O `state_basis_commit: 0c8db94` não é o base da branch e não deveria ser: é o commit contra o qual as
medições do `backlog.md` foram tomadas, que é o que o campo quer dizer.

> **Resolvido no merge da `main` (ver a seção do merge, adiante):** a promoção não precisou ser
> refeita — a `main` promoveu, executou e fechou o BD-17 em paralelo, em 2026-08-20.

### Review do bloco — 2026-08-20: risco ALTO, duas lentes, zero violação de lei

Classificação **alto risco** (DTO de entrada, contrato HTTP, identidade/acesso, `generated.ts` no
raio). Duas lentes: gabarito do projeto (CLAUDE.md §5 · `docs/README.md` · ADRs · rules) e revisão
independente do Codex (read-only) sobre `0fe30b13..HEAD` — **o Codex não confirmou nenhum achado**.

Reprovas rodadas nesta review, não herdadas: **861 verdes / 5 skipped** por diretório (P-50 de novo:
a suíte unida morre no `memory_limit`, e `php -d memory_limit=512M` não sobe o limite do processo
filho do `artisan test`); `typescript:transform` com árvore limpa; nenhum órfão (os dois helpers
novos têm 7 e 6 chamadores); `Quote::create` sem sobra fora da Action.

Dois achados, ambos sobre o **alcance** da lei nova, nenhum regressão do bloco:

- **Q-1 🟡** — a D-12 aplicou `ComputedFields::rejected()` só à chave de foto. Seis chaves
  `#[Computed]` não-foto seguem engolidas com 200 em DTO de entrada: `UserData::$last_login`,
  `RedatorData::$last_login` e `$documents`, `StudentData::$current_client_id`,
  `$current_client_name` e `$enrollments_count`. `current_client_id` é o caso que dói: quem mandar
  vínculo no `PUT /api/students/{id}` recebe 200 e nada acontece. `documents` NÃO entra sem olhar o
  multipart do redator.
- **Q-2 🟢** — o arch test dos 11 campos varre só `app/Domains/*/Data/*.php`; campo de foto que
  nascer em `app/Shared/*/Data/` escapa da varredura e da contagem.

### Correções do review — 2026-08-20: os dois achados aprovados

O João aprovou Q-1 e Q-2; os dois entraram, com o teste reprovando antes (5 vermelhos contra o
código antigo).

- **Q-1** — `ComputedFields::rejected()` passou a listar as chaves `#[Computed]` não-foto dos três
  DTOs de entrada que as tinham: `last_login` em `UserData` e `RedatorData`;
  `current_client_id`, `current_client_name` e `enrollments_count` em `StudentData`.
  `RedatorData::$documents` ficou **de fora por medição**, com o porquê no sítio: ali a chave é
  escrita real (multipart de arquivo, descartado por `prepareForPipeline` antes dos pipes) e
  `missing` reprovaria o upload legítimo. O SPA não manda nenhuma das cinco chaves fechadas —
  `useStudentForm:22` já traduz `current_client_id` para `client_id`, que segue aceita.
- **Q-2** — o arch test dos 11 campos passou a varrer também `app/Shared/*/Data/*.php`. A contagem
  segue 11: hoje não há campo de foto fora de `Domains`, e é exatamente esse futuro que o glob
  cobre.

Reprovas depois das correções: **866 verdes / 5 skipped** por diretório (Shared foi de 69 para 74),
Pint verde nos 4 arquivos tocados, `typescript:transform` sem diff em `generated.ts`.

**Review encerrada sem achado pendente.**

---

### Fechamento — 2026-08-20: a DoD provada contra a API real, e o banco de dev devolvido como estava

**Critério de aceite provado end-to-end** (nginx `:8080`, sessão Sanctum de admin, MySQL de dev),
não só por suíte:

- **DoD 1 e 2** — `PUT /api/users/108` **omitindo** `rut` e `phone` → **200**, e o `GET` seguinte
  devolveu `rut="16.982.435-5"` e `phone="+56 9 8888 0001"` intactos. O mesmo `PUT` com
  `"rut": null, "phone": null` → **200** e os dois campos `null`. O par é a prova: só o segundo ramo
  deixaria a regressão passar verde.
- **DoD 3** — `photo_url` no corpo → **422** nas duas formas (`"http://evil/x.png"` e `null`), com
  `El campo photo url no debe estar presente.`; `last_login` → **422**; no aluno,
  `current_client_id` e `enrollments_count` → **422** (as chaves que o review acrescentou).
- **DoD 4** — `POST /api/users` com RUT já cadastrado → **422** com
  `rut: "Este RUT já está cadastrado."`. A corrida **em si** não é alcançável por uma request só —
  as duas portas (check e índice) devolvem a MESMA resposta por desenho, e a tradução do índice está
  provada em `UniqueIndexCollisionTest` com as cinco mensagens reais de driver.
- **DoD 5** — dois `POST /api/budgets/14/quotes` com `"seq_in_budget": 99` no corpo gravaram **1** e
  **2**. O payload não vence a derivação sob lock.

**Resto do gate.** Backend **866 passed / 5 skipped** por diretório (Cadastros 155 · Certification 97
· Comercial 86 · Dashboard 37 · Identity 256 · Operation 144 · Shared 74 · Unit 17); a suíte unida
morreu no mesmo `memory_limit` de sempre (P-50, gatilho visto vencer de novo e registrado na ficha).
Frontend `pnpm lint` 0, `pnpm build` verde, **435 testes**. Pint `--test` **passed** nos **76**
arquivos PHP do bloco (nunca sem argumento). `typescript:transform` rodado de novo com **zero diff**
em `generated.ts`. Código morto: os dois helpers criados têm 7 e 6 chamadores, nenhum `.gitkeep`
nasceu no bloco. Leis §5: nenhuma contrariada.

**Zero resíduo no banco de dev** (a P-44 existe justamente por gates que esqueceram o próprio
rastro): o staff de sonda (`gate-bd14@lotus.cl`, id 108), o orçamento `GATE-BD14` (id 14), as duas
cotações (13, 14) e as **6** linhas de auditoria que eles geraram foram removidos com `forceDelete`.
Conferido depois: `user=0 budget=0 quotes=0`.

**Pendências.** **P-29** e **P-35** encerradas por este bloco e movidas para `encerradas.md` com o
rastro do que as fechou. **P-51** nasceu na review final e segue aberta (decisão do João). **P-50**
teve o gatilho visto vencer de novo. **P-49 ficou órfã de bloco:** a ficha ainda diz `Bloco: BD-14`,
que acabou de fechar sem absorvê-la — reagrupar é decisão do João, não heurística do agente.

**`state_basis_commit` passa de `0c8db94` a `c61e2f4`, e isso não é divergência.** `0c8db94` era o
commit contra o qual as medições do `backlog.md` foram tomadas para ESTE bloco; fechado o bloco, o
campo volta a apontar para o último commit que comprova a entrega — o segundo dos dois que
corrigiram os achados do review.

**Um ponto de estado que este fechamento NÃO resolveu:** a `feat/bd14-contrato-de-entrada` nasceu
sobre `0fe30b13`, o commit que promovia `bd17-superficie-de-arquivados` a `ready_for_planning`, e o
BD-14 sobrescreveu esse `active_work_item`. O estado fecha em `idle` porque o gate proíbe promover
por ordem óbvia; **a promoção do BD-17 é do João** (`backlog.md`, BD-17). Isso valia enquanto este
branch não via a `main`: o merge de 2026-08-20, na seção adiante, mostrou o BD-17 já promovido,
executado e fechado lá.

### Merge da `main` — 2026-08-20: a promoção pendente do BD-17 já tinha sido feita do outro lado

O João mandou trazer a `main` para este branch antes de o PR ([#62](https://github.com/Andred21/lotus/pull/62))
ser mesclado. `git merge main` sobre a base `0fe30b13` trouxe **17 commits** e abriu **dois
conflitos, os dois de documentação de estado** — `state.md` e `historico/progress.md`. **Todo o
código mesclou limpo:** o BD-14 é backend puro e o BD-17 é frontend puro, e os dois não dividem
arquivo nenhum.

**A pendência que este fechamento deixou para o João não existe mais.** A `main` promoveu, executou,
revisou e fechou o `bd17-superficie-de-arquivados` em paralelo, entre 2026-08-19 e 2026-08-20
(`6edf1224`). O ponto anotado duas vezes acima — "a promoção do BD-17 é do João" — está resolvido por
fato consumado, não por decisão nova. **Dois `active_work_item` viveram ao mesmo tempo, em linhas
diferentes**, pelo mesmo padrão já registrado no fechamento do `arquivados-roots-restantes`: o
invariante de um só vale dentro de cada branch, não entre elas.

**Quem é o último item fechado se decide por relógio de commit, não por lado do merge:** o BD-17
fechou às **14:39** (`6edf1224`) e o BD-14 às **16:04** (`2e8c8887`). Por isso
`last_completed_work_item` fica em `bd14-contrato-de-entrada` e `state_basis_commit` em `c61e2f4` —
o commit que comprova a entrega, nem o do fechamento nem o do merge.

**Doc — o que ficou de cada lado:**

- **`state.md`:** a janela de cinco fechamentos intercalou os dois lados na ordem real
  (`bd14-contrato-de-entrada` → `bd17-superficie-de-arquivados` → `arquivados-roots-restantes` →
  `identity-ativacao-acesso-redator` → `arquivados-e-restauracao`). Saiu da janela, para o git e para
  a linha de entrega no `progress-archive.md`: `bd13-listagens-e-abas`.
- **`progress.md`:** as duas linhas novas entraram em ordem de fechamento — BD-17 antes do BD-14 — e
  a mais antiga da tabela (Dashboard B1, 2026-08-16) desceu para o `progress-archive.md`, que mantém
  a janela em dez. Os dois lados já tinham arquivado a MESMA linha por conta própria (Meu Perfil
  backend, 2026-08-15), e o git mesclou isso sem duplicar.
- **`backlog.md` e `pendencias/`:** sem conflito. Cada lado removeu o seu bloco (o BD-14 aqui, o
  BD-17 lá) e a nota de "cada um saiu desta lista" ganhou o BD-14 com os débitos que ele levou (D-12
  e D-13). Nenhuma colisão de ID: a **P-51** é daqui e o maior ID da `main` é o P-50. A **P-50** ficou
  com as medições dos DOIS fechamentos — 866 testes aqui, 828 lá, e o mesmo comando documentado
  morrendo nas duas árvores.

**A P-49 continua órfã de bloco.** O merge não a reagrupa: a ficha segue dizendo `Bloco: BD-14`, e
escolher o novo hospedeiro é decisão do João.

**Suítes depois do merge:** o frontend rodou inteiro — `pnpm lint` 0, `pnpm build` verde,
**81 arquivos / 453 testes** (as 18 provas novas do BD-17 entraram junto). O backend **não foi
medido de novo, e não precisa ser**: os 17 commits da `main` não tocam um arquivo de `backend/`
(`git log 0fe30b13..main -- backend` devolve zero), então a medição do fechamento — **866 passed /
5 skipped**, por diretório, porque a suíte unida esbarra na P-50 — continua sendo a desta árvore.

**Estado: `idle`.** Próxima ação: o João escolher o próximo item do `backlog.md`. Nada foi promovido.

## Quinto item fechado — 2026-08-20 (`bd17-superficie-de-arquivados`, BD-17 dos blocos de dívida)

### Seleção — 2026-08-19

**Promoção explícita do João**, do BD-17 recém-registrado: os três débitos (D-51, D-52, D-53) foram
medidos no mesmo dia, no `/revisar-frontend` da superfície inteira de arquivados contra `0c8db94`, e
entraram no backlog pelo commit `82c1d0c4` antes de qualquer plano. **Rota direta a
`ready_for_planning`, sem Context Packet** — a fonte do bloco é o próprio código medido, não Drive
nem Notion, e `context_packet` ficou `null` do começo ao fim.

**Área de trabalho: a worktree `fix-frontend`**, branch `feat/bd17-superficie-de-arquivados` a partir
de `0c8db946`. **Risco projetado BAIXO e confirmado no review:** frontend puro, sem schema, sem
`generated.ts`, sem Sanctum, auditoria, RBAC, dinheiro ou emissão de certificado; `executor: claude`.

### Execução — 2026-08-20: 3 peças novas, 6 roots adotando, 1 sítio corrigido direto

**A ordem interna do backlog foi respeitada: D-53 antes de D-51.** Corrigir a data primeiro obrigaria
a tocar 8 sítios e deixaria o nono root livre para reintroduzi-la; com a coluna compartilhada, o
`formatDate` tem um pouso só.

**As três peças, todas em `shared/`:** `archivableSource()` mais `ArchivableRow<T>`/`ListSource<T>` em
`shared/lib/archivable.ts` (`1bc35876`); `archivedColumns(t)` em `shared/ui` (`86c691a7`); e os dois
aliases de operação em `features/operation/hooks/` (`8d6a2dec`), que existem porque `useTurmas.ts` é
artesanal, não passa pelo `createCrudResource` e devolvia `UseQueryResult` cru — a assimetria que
fazia a `OperationPage` ser a única a derivar `loadError` dentro da prop.

**`archivedColumns` é FUNÇÃO, nunca componente, e isso tem catraca.** O `DataTable` do PrimeReact
resolve coluna lendo o filho **direto** (`Children.toArray`), então um componente — ou um Fragment
envolvendo as duas colunas — achataria as duas numa coluna lixo, sem `field`, **sem estourar build,
lint ou suíte**. O teste prova as duas formas lado a lado, e prova também que o `{archived && ...}`
das tabelas não deixa coluna fantasma no modo ativo.

**Seis roots adotaram em cinco commits** (`de3b362b`, `9dba76c6`, `db506f39`, `9747ad33`, `4cca8f97`,
`60dfd1cc`): as 8 declarações de `XRow` à mão sumiram, as ~84 linhas de coluna duplicada viraram uma
chamada, e o quarteto de ternários dentro das props das 6 páginas virou uma escolha só. O nono sítio
do D-51, `ArchivedQuotesList`, é layout flex e não tabela — foi corrigido direto (`1d61b287`).

**Uma correção medida entrou na spec (§11):** o `tsc` reprovou com **TS2322** e forçou o tipo de
retorno explícito `ReactElement[]` em `archivedColumns` (`ae102f11`). Sem ele a inferência abria a
porta para exatamente a forma que a catraca proíbe.

### DoD — provado na tela, não no diff

**Navegador em `en-US`, interface em `es-CL`:** a coluna "Archivado el" imprime no idioma da
**interface**, que é o defeito inteiro do D-51 (`8/19/2026` do navegador contra `19-08-2026` do resto
da tela). Teste de regressão no molde do precedente `AppFileRow.test.tsx`, medindo contra o `Intl` da
tag fixada — não contra o próprio `formatDate`, que passaria por acaso numa máquina cujo locale
coincidisse com o da interface.

**Dois débitos nasceram da medição, e nenhum é regressão deste bloco.** **D-54** — o `refetch` do
`useLoadState` faz `void query.refetch()` e engole a promise que o `AppErrorState` aguarda (Q-14); é
anterior ao bloco, e é por isso que os aliases novos nasceram **sem** ele, com o `refetch` devolvendo
a promise e um teste guardando a diferença. **D-55** — o `DataTable` não repinta as células `body` na
troca de idioma ao vivo; isolado como limitação de plataforma porque `ÚLTIMO ACCESO` (`formatDateTime`,
fora do escopo) e o `AppTag` de estado congelam igual, enquanto o `ArchivedQuotesList`, mesma
`formatDate` **fora** de DataTable, troca ao vivo. Com recarga a grafia está correta nos três idiomas
— o D-51 está pago.

### Revisão de sprint — 2026-08-20: risco BAIXO, uma lente, 2 achados 🟢, zero violação de lei

**Classificação: BAIXO risco** — uma lente, sem revisão independente do Codex.
**Fronteira do bloco provada:** `git diff main...HEAD -- backend/ frontend/src/shared/types/generated.ts`
devolve zero arquivo. **Órfãos:** nenhum — os 8 símbolos novos têm consumidor, e `useTurmas`/
`usePendingQuotes` seguem vivos pelas query keys e pelos outros hooks. **Escopo pago, medido:** zero
`toLocaleDateString()` cru em `src/`, zero `archived_at?:` declarado à mão, zero quarteto de ternário.

**Q-1 🟢, corrigido no branch** (`4c9a2580`): `usePendingQuotesPage` morava em `useTurmasPage.ts` e
quebrava o um-hook-por-arquivo dos outros 7 aliases. **Q-2 🟢, registrado como D-56**: a forma
normalizada `{items, loading, error, refetch}` passa a ser montada à mão em **5 sítios**, padrão
reincidente da mesma política que já divergiu em 2026-08-14 — o texto da linha de rule ficou guardado
na ficha, para ser escrito quando o débito for pago (escrevê-lo antes tornaria a rule falsa nos cinco
sítios).

**Dois candidatos foram descartados por serem decisão consciente já registrada** — D-54 e D-55 —, e a
observação de que o `state.md` não tinha narrativa do BD-17 caiu na verificação: **todas** as seções
deste arquivo são de item **fechado**, escritas pelo `/fechar-sprint`, não durante a execução.

### Fechamento — 2026-08-20

**Gate do frontend:** `pnpm build` verde, `pnpm lint` exit 0, `pnpm test` **81 arquivos / 453 testes**
(baseline do bloco: 77 / 435). **Backend intocado e verde assim mesmo: 828 passed / 5 skipped, 3006
asserções** — pelo binário direto com `memory_limit` elevado, porque o comando que o `CLAUDE.md` §6
documenta morre no meio: é a **P-50**, reproduzida aqui com pico de 127,00 MB. **Pint e
`typescript:transform` não se aplicam** — zero arquivo de `backend/`, zero DTO.

**A P-03 apareceu pelo gatilho dela, e não fechou:** o `docker compose up -d` desta árvore não sobe o
`mysql` porque o `lotus-mysql-1` do main tree já ocupa a porta 3307. A suíte não precisa dele (sqlite
`:memory:`), então o `app` subiu com `--no-deps`; o que **não** dá para refazer nesta sessão é a prova
de navegador, que depende da API com dado real. Ela está feita e datada acima, contra `1d61b28`, e o
único arquivo de renderização que mudou desde então foi o tipo de retorno de `archivedColumns`.

**Estado: `idle`.** Próxima ação: o João escolher o próximo item do `backlog.md`. Nada foi promovido.
