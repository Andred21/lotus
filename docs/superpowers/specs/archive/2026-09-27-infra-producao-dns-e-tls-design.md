# Spec — `infra-producao-dns-e-tls` — 2026-09-27

> Item 32 do backlog, promovido pelo João em 2026-09-27 na lane-b. Paga a **P-77** e destrava a
> **P-79** em produção: hoje o backend recusa emitir certificado porque `CERTIFICATE_VALIDATION_URL`
> está vazio, e ele só se preenche com um domínio em HTTPS. `Contexto: sim` — packet em
> `docs/superpowers/context-packets/2026-09-27-infra-producao-dns-e-tls.md` (gerado pelo Codex via
> plugin, porque o MCP `mcp__codex__codex` não existia na sessão; isso virou a Task 1, §4.1). O nome
> público da intranet foi decidido pelo João **antes** do brainstorming e está na emenda de
> 2026-09-27 do ADR-14: **`app.lotusotec.cl`**. Esta spec não o reabre.

## 1. Contexto

### 1.1 O que já existe

- **No host** (`/opt/lotus`, runbook §7): os dois composes, `nginx/tls.conf`, `bin/deploy.sh`,
  `bin/backup-db.sh`, `bin/verificar-backup.sh` e o `.env` na "fase sem DNS" do §11
  (`SESSION_DOMAIN=null`, `SESSION_SECURE_COOKIE=false`, `CERTIFICATE_VALIDATION_URL` vazio; os
  campos de host no EIP). Produção atende em `http://18.230.53.197`.
- **`deploy/nginx/tls.conf`**: servidor 80 com o webroot do challenge (`/.well-known/acme-challenge/`
  → `/var/www/certbot`), `/up` isento do redirect por match exato e `return 301 https://$host…` no
  resto; servidor 443 com `server_name app.lotusotec.cl`, certificado em
  `/etc/letsencrypt/live/app.lotusotec.cl/`, TLS 1.2 e 1.3, e três locations: o proxy
  `~ ^/(api|sanctum|up)(/|$)` (sem `add_header`), `/assets/` e `/` (as duas com `add_header
  Cache-Control`). **Não há HSTS.** Guardado por `frontend/tests/nginx-conf.test.ts`, que compara os
  blocos com `docker/nginx/prod.conf`.
- **`docker-compose.prod-tls.yml`**: só o nginx muda — 80 e 443, `/etc/letsencrypt:ro`, o `tls.conf`
  como `default.conf` e `/opt/lotus/certbot:/var/www/certbot:ro`.
- **`deploy/bin/deploy.sh:112`** liga o overlay quando `$BASE/nginx/tls.conf` existe **e**
  `/etc/letsencrypt/live` é diretório.
- **O botão** (item 31) confere o host antes de promover: composes e `tls.conf` contra o SHA alvo,
  **todo** `deploy/bin/*.sh` contra a `main`, nomes das chaves do `.env` contra `env.prod.example`.
  Arquivo diferente ou ausente reprova.
- **Runbook §11** ("TLS — quando o registro A chegar"): quatro passos — `certbot certonly
  --standalone` com o nginx parado; seis campos do `.env`; redeploy; troca para webroot com hook de
  reload e `certbot renew --dry-run` como gate. O hook existe **só como texto** no runbook, fora do
  repositório e da conferência de alinhamento.
- **`deploy/aws/env.prod.example`**: `SESSION_DOMAIN`, `SANCTUM_STATEFUL_DOMAINS`,
  `SESSION_SECURE_COOKIE=true` e `CERTIFICATE_VALIDATION_URL=https://app.lotusotec.cl` já no
  formato final — mas **`APP_URL` e `FRONTEND_URL` estão em `http://`** (linhas 15 e 82), contra o
  próprio §11. Nada guarda os valores do molde.
- **Zona `lotusotec.cl`** no Route 53 desde 2026-09-26: stack `lotus-dns` (`us-east-1`, repo
  `Andred21/lotus-site`, `infra/lotus-dns.yaml`), catraca offline `scripts/infra/zona.test.mjs`
  dentro de `pnpm check`, conferência viva `pnpm infra:conferir-zona --pos-delegacao`. Sem wildcard,
  sem CAA. `sistema.` é registro explícito apontando para o WordPress. Não há `app.` — medido em
  2026-09-27: não resolve.
- **Backend**: `IssueCertificateAction` recusa antes da transação quando
  `CertificateValidationUrl->base()` não é https (P-79, item 29). O QR é
  `base() + /validar/{uuid}`; o PDF é renderizado sob demanda.

### 1.2 O que falta

1. O registro `A app.lotusotec.cl → 18.230.53.197`.
2. Certificado emitido, `.env` virado, overlay exercido com certificado real — o §11 inteiro, que
   nunca rodou.
3. HSTS decidido e implementado (nenhum doc decidia).
4. Hook de renovação versionado e sob a conferência de alinhamento.
5. Runbook §11 e P-77 sem o texto morto (agência, StackDNS, wildcard).
6. Os três pontos de chamada do Codex tolerarem a ausência do MCP.

### 1.3 Achado do brainstorming — a zona viva está à frente da `main` do lotus-site

Medido em 2026-09-27 com `aws cloudformation get-template`: o template **vivo** do `lotus-dns` é o
da branch `feat/4-1-7-7-1-3-7-1-4-contato-ses-lambda` (B2, `7177f4f`, em `ready_for_review`, **não
mesclada**), com seis registros do SES (três CNAME de DKIM, MX e TXT de `ses.`, TXT `_dmarc`) que a
`origin/main@1535720` não tem. A conferência `docs/infra/conferencia-zona-2026-09-26-pos-ses.md`
daquela branch os mostra servidos. Uma PR aberta da `main` de hoje e deployada **apagaria os seis**
— `RecordSetGroup` remove o que some do template — e o formulário de contato perderia DKIM. Isto
decide a base da PR (D6). Termination protection segue `False` (D-52 aberta).

## 2. Decisões do brainstorming

| # | Decisão | Alternativas recusadas |
|---|---|---|
| D1 | **Repositório antes da produção, em duas fases.** Fase A: PRs no `lotus-infra` e no `lotus-site` mescladas e espelhadas. Fase B: produção, com escrita do João e leitura minha. | (B) host primeiro, à mão: a primeira promoção pelo botão depois disso é recusada (host divergente da `main`), e o runbook volta a descrever o que ninguém executou (lição 13). (C) dois blocos, DNS e TLS: dois ciclos, e o de DNS sozinho entrega `app` resolvendo para um nginx sem certificado. |
| D2 | **A PR do `lotus-site` é deste bloco**: registro A, inventário e catraca de lá, e o `Retain` da D-52. O João liga a termination protection, faz o deploy do stack e o merge. | Pedir a PR à sessão do site: o gatilho da D-52 é "o próximo bloco que fizer deploy do `lotus-dns`", e esse bloco é este. |
| D3 | **HSTS `max-age=31536000`**, sem `includeSubDomains` (a zona tem WordPress, e-mail e o que B5 decidir) e sem `preload` (irreversível na prática). Liga **no mesmo deploy** que liga o TLS, repetido em toda location do 443 que tenha `add_header`, com `always`. | Ligar depois, num segundo deploy: um deploy a mais para um header de uma linha. `max-age` curto "para testar": o teste é o mesmo, e o valor curto só adia o que se quer. |
| D4 | **Prova do DoD "certificado com QR em https": emitir e revogar.** Um certificado sobre dado marcado como teste, PDF baixado, QR decodificado, página de validação aberta, e `RevokeCertificateAction` em seguida. | Confiar em teste de unidade da URL: não prova o `.env` de produção. Emitir sobre dado real da Lotus: não há. |
| D5 | **Hook de renovação versionado** em `deploy/bin/recarregar-nginx.sh`, com `nginx -t && nginx -s reload` dentro do container, ligado ao certbot por **symlink** em `/etc/letsencrypt/renewal-hooks/deploy/`. Por morar em `deploy/bin/`, a conferência de alinhamento o cobre sem mudança no script do botão. | `restart nginx` como o §11 dizia: queda a cada renovação. Hook copiado à mão para `renewal-hooks/`: mais um arquivo fora da conferência, o defeito que o item 31 acabou de medir. |
| D6 | **Base da PR do `lotus-site`: a `main` de lá depois do merge do B2.** A fase do DNS espera esse merge; a PR do `lotus-infra` não. | Empilhar sobre a branch B2: amarra a revisão dela à nossa. Abrir da `main` de hoje: apaga os seis registros do SES (§1.3). |
| D7 | **`app` entra no `INVENTARIO`** de `scripts/infra/lib/zona.mjs`, como o B2 fez com o SES: pós-delegação, "inventário" é o que a zona declara. **`sistema` não muda** — o destino dele é B5/8.2.1, e ele é servido pelo certificado da D-51. | Retarget de `sistema`: fora da decisão do João e dentro da janela da D-51. |
| D8 | **Sem AAAA e sem CAA.** O EIP não tem IPv6. A CAA é a D-49 do site, com a restrição cruzada registrada nos dois repositórios: quando existir, lista `letsencrypt.org` além de `amazon.com`, e continua listando depois que o wildcard do WordPress morrer, porque `app` renova por HTTP-01 com Let's Encrypt. | Publicar CAA aqui: bloco com prova própria, do site. |
| D9 | **Task 1 — Codex por MCP primeiro, plugin depois**, nos três pontos que hoje só citam o MCP: `.claude/commands/planejar-bloco.md`, `.claude/commands/executar-bloco.md` e `.claude/skills/revisar-sprint/SKILL.md`. Sem `--write` o plugin é read-only, o que basta para packet e revisão. | Só o plugin: o MCP, quando existe, dá o contrato de ferramenta. Só o MCP: foi o que travou esta sessão. |
| D10 | **`executor: claude`.** O bloco é cross-repo, toca produção e a fase B exige julgamento fora do plano. | `codex`: nenhuma task tem path fechado e verificação executável sem a produção. |
| D11 | **A PR do `lotus-site` entra fora do ciclo supervisionado de lá**: branch curta de infra, `pnpm check` verde na CI, merge do João. Não toca o `state.md` do site, que é de outra sessão. | Abrir um work item no harness do site para nove linhas de template: o custo do ciclo é maior que a mudança. O João pode reverter esta decisão na revisão da spec. |

## 3. Escopo

**Dentro:**

- `lotus-infra`: Task 1 (D9); HSTS no `tls.conf` com catraca (§4.2); hook versionado com catraca
  (§4.3); `env.prod.example` em https com catraca (§4.4); runbook §7 e §11, P-77, lição 19 e a
  restrição da CAA (§4.5); prova local do HSTS (§4.6).
- `lotus-site`: parâmetro e registro `A app`; `Retain` em `Registros`; `INVENTARIO`, leitor de
  políticas e testes; inventário `zona-dns-lotusotec.md`; emenda do ADR-SITE-006; D-49 e D-52 no
  backlog de lá (§5).
- Produção: a sequência do §6 inteira, executada pelo João, com as provas em `audits/`.

**Fora:** e-mail (item 33); alarmes, inclusive de expiração de certificado (item 34); cutover do
site (B5); o wildcard do WordPress (D-51); CAA (D-49); `sistema.`; IPv6; alterar o script de
conferência de alinhamento ou o workflow do botão.

## 4. Fase A — `lotus-infra`

### 4.1 Task 1 — chamada do Codex com fallback

Nos três pontos, o passo "carregue `mcp__codex__codex` via ToolSearch" vira:

1. `ToolSearch "select:mcp__codex__codex"`. Achou: invoca como hoje.
2. Não achou: roda o plugin `codex-companion` por Bash, em background, com `--fresh`:
   `node ~/.claude/plugins/cache/openai-codex/codex/<versão>/scripts/codex-companion.mjs task
   --fresh "<prompt>"`. Sem `--write` o sandbox é `read-only` — é o modo do packet
   (`planejar-bloco`) e da revisão independente (`revisar-sprint`). Na execução delegada do
   `executar-bloco` (`executor: codex`), `--write` entra, e o resto do gate (diff real contra
   `paths_autorizados`, verificação própria) continua igual.
3. O prompt é o mesmo nos dois caminhos: exige a skill de `.agents/skills/`, informa item, spec,
   branch e commit. O contrato de saída (markers, `RECOMMENDED_TRANSITION`) não muda; quem valida é
   Claude, como hoje.
4. O caminho do plugin tem versão no nome; o texto cita o glob e manda usar a mais nova instalada.

O agente `codex:codex-rescue` **não** é o fallback: em background ele pede permissão de Bash que
ninguém responde (foi o que falhou em 2026-09-27). `.agents/skills/lotus-context-packet` não muda.

### 4.2 HSTS no `tls.conf`

No servidor 443:

```nginx
add_header Strict-Transport-Security "max-age=31536000" always;
```

no nível do `server` **e repetido** dentro de `location /assets/` e `location /`, porque um
`add_header` numa location cancela os do nível de cima — e as duas têm `Cache-Control`. O proxy
`api|sanctum|up` não tem `add_header`, então herda. `always` faz o header sair também em 401, 419,
422 e 500 do Laravel. O servidor 80 e o `prod.conf` não recebem nada: HSTS em resposta HTTP é
ignorado pelo navegador, e o `prod.conf` é o do ambiente sem TLS.

A catraca `nginx-conf.test.ts` muda em dois sentidos. As comparações de `/assets/` e `/` com o
`prod.conf` passam a **descontar a linha do HSTS** (um filtro que remove exatamente essa diretiva
antes de comparar, e nada mais). E entram asserções novas:

- o servidor 443 tem a diretiva no nível do `server`, com `max-age=31536000` e `always`;
- **toda** location do 443 que contém `add_header` contém também a diretiva de HSTS (a asserção
  enumera as locations, não uma lista fixa: uma location nova com `add_header` e sem HSTS reprova);
- o proxy segue sem `add_header` nenhum;
- o arquivo não contém `includeSubDomains` nem `preload`;
- o servidor 80 e o `prod.conf` não contêm `Strict-Transport-Security`.

### 4.3 Hook de renovação — `deploy/bin/recarregar-nginx.sh`

```bash
#!/usr/bin/env bash
# Deploy hook do certbot (runbook §11): certificado novo em /etc/letsencrypt,
# nginx recarrega sem cair. Ligado por symlink em
# /etc/letsencrypt/renewal-hooks/deploy/. Reload, nunca restart: o -t barra a
# troca se o certificado ou a conf estiverem quebrados, e o nginx segue com o
# certificado anterior — que ainda tem ~30 dias.
set -euo pipefail
BASE=/opt/lotus
docker compose -p lotus --project-directory "$BASE" \
  -f "$BASE/docker-compose.prod.yml" -f "$BASE/docker-compose.prod-tls.yml" \
  exec -T nginx sh -c 'nginx -t && nginx -s reload'
```

O `-p lotus` e os dois arquivos são os mesmos do `compose()` do `deploy.sh`; sem eles o compose
não acha o serviço. Não usa as variáveis de imagem porque `exec` não cria container.

Catraca `frontend/tests/recarregar-nginx.test.ts`, textual, no molde do `deploy-sh.test.ts`:
executável; `set -euo pipefail`; `-p lotus`; os dois composes; `nginx -t` **antes** de `-s reload`
no mesmo comando; nenhuma ocorrência de `restart`, `stop`, `down` ou `up`. Como todo script de
`deploy/bin/`, a conferência de alinhamento passa a exigi-lo no host — o merge trava o botão até a
reinstalação do §7, que é o desejado.

No host: `ln -s /opt/lotus/bin/recarregar-nginx.sh
/etc/letsencrypt/renewal-hooks/deploy/recarregar-nginx.sh`. A conferência vê o arquivo em `bin/`;
o symlink fica declarado como limite (§9).

### 4.4 `env.prod.example` em https, com catraca

`APP_URL` e `FRONTEND_URL` passam a `https://app.lotusotec.cl`. Catraca nova
`frontend/tests/env-prod-example.test.ts`: os seis campos do §11 têm exatamente estes valores —
`APP_URL=https://app.lotusotec.cl`, `FRONTEND_URL=https://app.lotusotec.cl`,
`SESSION_DOMAIN=app.lotusotec.cl`, `SANCTUM_STATEFUL_DOMAINS=app.lotusotec.cl`,
`SESSION_SECURE_COOKIE=true`, `CERTIFICATE_VALIDATION_URL=https://app.lotusotec.cl`; nenhuma linha
de valor é multilinha (o limite que o §7 já declara); nenhuma chave duplicada. O molde é a
referência de **nomes** do botão e de **valores** do humano que instala; a catraca fecha o segundo.

### 4.5 Documentos

- **Runbook §7**: `scp` e `mv` incluem `recarregar-nginx.sh`; o symlink do hook entra como passo do
  §11, não do §7 (só faz sentido com o certbot instalado).
- **Runbook §11**, reescrito de ponta a ponta na ordem do §6 desta spec: registro por PR no
  `lotus-site` (nunca no console, nunca "à agência"); os dois portões antes de parar o nginx;
  `--standalone`; os seis campos; promoção **pelo botão**; troca para webroot com o `grep` do
  `authenticator`; symlink do hook e a prova de executá-lo; `renew --dry-run`; as provas de fora; o
  recuo de emergência (§7). Some tudo sobre StackDNS, wildcard e pedido a terceiros.
- **Restrição da CAA** (D8): parágrafo próprio no §11, e a mesma frase na D-49 do site.
- **P-77**: reescrita agora (dono João; gatilho = registro + §11; medição de 2026-09-27; sem
  wildcard, sem agência). Encerra em `encerradas.md` no fechamento, com a medição de `audits/`.
- **Lição 19**: dois pares nominais novos, `deploy/bin/recarregar-nginx.sh ↔
  frontend/tests/recarregar-nginx.test.ts` e `deploy/aws/env.prod.example ↔
  frontend/tests/env-prod-example.test.ts`.
- **ADR-14**: nada além da emenda já feita.

### 4.6 Prova de comportamento do HSTS, local

Catraca textual não prova herança de `add_header`. Antes da PR: `nginx:alpine` com o `tls.conf`
montado como `default.conf`, certificado autoassinado em
`/etc/letsencrypt/live/app.lotusotec.cl/{fullchain,privkey}.pem`, sem `app` (o fastcgi devolve 502)
e um webroot vazio. `nginx -t` passa; `curl -sk -D -` em `/`, `/assets/nada` e `/api/nada` mostra
`Strict-Transport-Security: max-age=31536000` nas três respostas (200, 404 e 502 — o 502 prova o
`always`); `curl -sI http://…/qualquer` dá 301 sem o header. Saída resumida vai para o audit.

## 5. Fase A — PR no `lotus-site`

### 5.1 Base e forma

Worktree próprio (`/home/jvbat/projetos/lotus-site-dns`), branch aberta de `origin/main` **depois
do merge do B2** (D6). Portão antes de abrir: `git show origin/main:infra/lotus-dns.yaml` contém os
seis registros do SES. A PR não toca `docs/superpowers/state.md` do site (D11).

### 5.2 `infra/lotus-dns.yaml`

- Parâmetro `IpDaIntranet`, `Type: String`, `Default: 18.230.53.197`, descrição: EIP da EC2 do
  Lotus em `sa-east-1` (ADR-14 do repo `lotus-infra`, emenda de 2026-09-27).
- Em `RecordSets`: `A app.${NomeDaZona}.`, `TTL: !Ref TtlPadrao`, valor `!Ref IpDaIntranet`, com
  comentário de que não há AAAA porque o EIP não tem IPv6, e de que `sistema` continua no WordPress.
- `Registros` ganha `DeletionPolicy: Retain` e `UpdateReplacePolicy: Retain` (D-52).

### 5.3 `scripts/infra/lib/zona.mjs` e `zona.test.mjs`

- `INVENTARIO` ganha `{ nome: 'app.lotusotec.cl.', tipo: 'A', valores: ['18.230.53.197'] }` com
  comentário datado. A asserção "um RecordSet por linha do inventário" e a do TTL continuam
  valendo sem mudança.
- `lerPoliticasDaZona` vira `lerPoliticasDoRecurso(texto, nome)`, com `lerPoliticasDaZona` mantida
  como chamada de `Zona`. Testes: `Registros` com as duas políticas `Retain`; `Zona` como antes;
  `IpDaIntranet` lido do `Default`; **nenhum** `AAAA` para `app`.
- O relatório de `pnpm infra:conferir-zona --pos-delegacao` passa a incluir `app` sozinho, porque
  itera o `INVENTARIO`.

### 5.4 Documentos do site

- `docs/infra/zona-dns-lotusotec.md`: linha de `app`, marcada como nascida no Route 53 na data do
  deploy, fora do inventário do painel.
- `docs/adr/ADR-SITE-006.md`: emenda datada — a intranet do Lotus é `app.`, por decisão do João de
  2026-09-27 (ADR-14 do `lotus-infra`); `sistema` segue como está até B5/8.2.1.
- `docs/superpowers/backlog.md`: D-49 recebe a restrição da CAA (D8); D-52 recebe a evidência e
  fecha depois do deploy (proteção ligada + `Retain` mesclado + catraca).
- A conferência gerada (`docs/infra/conferencia-zona-<data>.md`) entra na PR.

### 5.5 Deploy do stack — escrita do João, leitura minha

1. `update-termination-protection --enable-termination-protection` (comando da D-52).
   `describe-stacks` mostra `EnableTerminationProtection: True`.
2. `detect-stack-drift` → `IN_SYNC`.
3. **Portão de base:** `get-template` do stack vivo comparado ao template da PR — a diferença é só
   o parâmetro, o registro `app` e as duas políticas.
4. Change set (`aws cloudformation deploy --no-execute-changeset` ou `create-change-set`): um único
   recurso, `Registros`, ação `Modify`, `Replacement: False`. Qualquer outra linha aborta (§7).
5. Execução até `UPDATE_COMPLETE`.
6. `pnpm infra:conferir-zona --pos-delegacao`: `app` = `18.230.53.197`, os seis do SES intactos,
   nenhuma divergência fora das esperadas. Commit na PR.
7. `pnpm check` verde na CI; merge do João.

## 6. Fase B — produção

Pré-requisitos: PR do `lotus-infra` mesclada e espelhada no corporativo, CI verde, três imagens do
SHA `X` no GHCR; PR do `lotus-site` mesclada e stack em `UPDATE_COMPLETE`.

1. **SG `lotus-web`**: `describe-security-groups` mostra 80 e 443 em `0.0.0.0/0` (§5 do runbook).
   Só confere; não alarga.
2. **DNS de fora**: DoH em `dns.google` e consulta direta aos quatro NS da zona devolvem `A app` =
   exatamente `18.230.53.197` e `AAAA` vazio. Sem isto, nada de nginx parado.
3. **Reinstalação §7** a partir de árvore igual à `main` do corporativo (`git diff --quiet
   upstream/main -- deploy/bin`): composes, `tls.conf` com HSTS e os **quatro** scripts. Containers
   seguem rodando; só arquivos.
4. **Certificado**: `apt-get install -y certbot`; `docker compose … stop nginx` — **a queda
   começa**; `certbot certonly --standalone -d app.lotusotec.cl --agree-tos -m <e-mail>
   --non-interactive`. Portão de saída: `live/app.lotusotec.cl/fullchain.pem` existe. O `deploy.sh`
   testa só o diretório `live/`; um `live/` vazio ligaria o overlay com o nginx morrendo.
5. **`.env`**: os seis campos do §11, valores iguais aos do molde (§4.4).
6. **Botão promove `X`**: a conferência de alinhamento passa; o `deploy.sh` vê `live/` e liga o
   overlay; o nginx sobe em 80 e 443 já com HSTS. **A queda termina.** Janela estimada: minutos.
7. **Webroot**: `certbot reconfigure --cert-name app.lotusotec.cl --webroot -w /opt/lotus/certbot`
   (sem `-d`; ensaia em dry-run pelo webroot e só grava se passar). Portão: `grep 'authenticator =
   webroot' /etc/letsencrypt/renewal/app.lotusotec.cl.conf`. Emenda do review final: o `certonly
   --keep-until-expiring` com o certificado longe do vencimento não reescreve a configuração.
8. **Hook**: symlink (§4.3); prova é **executar o symlink** — saída 0, `nginx -t` ok, e um `curl`
   em `https://…/up` durante e depois responde 200. `renew --dry-run` não roda deploy hook.
9. **Renovação**: `certbot renew --dry-run` com o nginx de pé, saída 0; `systemctl status
   certbot.timer` ativo.

**Provas, do WSL, de fora** (todas no audit com comando, saída curta e hora):

- `curl -sI http://app.lotusotec.cl/inicio` → `301` com `Location: https://app.lotusotec.cl/inicio`;
  `curl -sI http://app.lotusotec.cl/up` → `200`.
- `curl -sI https://app.lotusotec.cl/up` → `200` com `Strict-Transport-Security:
  max-age=31536000`; o mesmo header em `/`, num `/assets/<arquivo real do build>` e num
  `/api/<rota autenticada>` sem sessão (401/419) — herança, repetição e `always`.
- `openssl s_client -connect app.lotusotec.cl:443 -servername app.lotusotec.cl | openssl x509
  -noout -issuer -subject -dates`: emissor Let's Encrypt, SAN `app.lotusotec.cl`.
- `curl -si https://app.lotusotec.cl/sanctum/csrf-cookie`: `Set-Cookie` com `secure` e
  `domain=app.lotusotec.cl`.
- Login real no navegador, pelo João.
- **QR (D4)**: o João emite um certificado sobre dado marcado `TESTE item 32` e baixa o PDF;
  `pdftoppm -png -r 144 -f 1 -l 1` e `zbarimg` (`zbar-tools`, a instalar no WSL) decodificam o QR;
  a URL começa com `https://app.lotusotec.cl/validar/` e a página responde 200; em seguida
  `RevokeCertificateAction` pela UI, e a página passa a mostrar o certificado como revogado.

## 7. Falhas e recuo

| Onde | Sintoma | Recuo |
|---|---|---|
| Change set (§5.5.4) | Qualquer recurso além de `Registros Modify / Replacement: False` | Não executa; apaga o change set; investiga a base. |
| Deploy do stack | `UPDATE_ROLLBACK_COMPLETE` | Rollback automático do CloudFormation; `conferir-zona` prova os seis do SES intactos. |
| `certbot --standalone` (§6.4) | Falha de validação ou de porta | `start nginx`; nada mudou no host. Os portões 1 e 2 existem para não queimar as 5 validações falhas por hora do Let's Encrypt. |
| Botão (§6.6) | Conferência reprova | Reinstala pelo §7 e promove de novo; nenhum navegador viu HSTS. |
| Deploy TLS | nginx `unhealthy`, `deploy.sh` aborta com logs | Emergência: `mv nginx/tls.conf nginx/tls.conf.off`, seis campos de volta aos valores da §7, `deploy.sh X` à mão. O botão passa a recusar por `tls.conf` ausente — esperado até o conserto. Escrito no §11. |
| Depois do primeiro 443 servido | TLS quebrado | **Não há volta a HTTP**: navegadores que viram o HSTS recusam `http://` por até um ano. O recuo é consertar o TLS. Declarado (§9). |
| Renovação real (a partir de ~dia 60) | Hook falha no `nginx -t` | Reload não acontece; nginx segue com o certificado anterior; sobram ~30 dias e nenhum alarme (item 34). |

## 8. Catracas (lição 19)

| Arquivo | Catraca | O que muda |
|---|---|---|
| `deploy/nginx/tls.conf` | `frontend/tests/nginx-conf.test.ts` | §4.2 |
| `deploy/bin/recarregar-nginx.sh` | `frontend/tests/recarregar-nginx.test.ts` (nova) | §4.3 |
| `deploy/aws/env.prod.example` | `frontend/tests/env-prod-example.test.ts` (nova) | §4.4 |
| `.github/scripts/conferir-alinhamento.sh` | `frontend/tests/conferir-alinhamento.test.ts` | nada: já itera `deploy/bin/*.sh` da `main` |
| `infra/lotus-dns.yaml` (site) | `scripts/infra/zona.test.mjs` | §5.3 |
| `.claude/commands/*.md`, `revisar-sprint/SKILL.md` | nenhuma | declarado: prosa de comando, sem catraca no projeto |

Sonda da emenda de 2026-09-26: na catraca do hook, trocar `nginx -t && nginx -s reload` por
`nginx -s reload` tem de reprovar; na do HSTS, remover o `always` ou a repetição em `/assets/` tem
de reprovar.

## 9. Limites e riscos declarados

- **HSTS é compromisso de um ano** com o TLS de `app.lotusotec.cl` (D3, §7).
- **Sem alarme de expiração** até o item 34. Entre uma renovação falhada e o vencimento há ~30 dias
  que ninguém mede. O `certbot.timer` e o hook são a única automação.
- **A fase do DNS depende do merge do B2** (D6). Se ele atrasar, a fase A do `lotus-infra` conclui
  sozinha e o bloco espera; não se abre PR da `main` pré-B2.
- **O symlink do hook não está na conferência** do botão — só o arquivo em `bin/`. Um symlink
  removido só aparece na renovação. O §11 manda provar executando-o.
- **`renew --dry-run` não exercita o deploy hook**; por isso a prova do hook é execução direta.
- **Janela de queda** durante `--standalone`: minutos, uma vez. Aceita pelo João no brainstorming.
- **O caminho do plugin do Codex é versionado** (`…/codex/1.0.6/…`); o texto do fallback usa glob.
- **`zbar-tools` não está no WSL**; instalação pelo João antes da prova do QR.
- **A PR do site entra fora do ciclo supervisionado de lá** (D11), por decisão desta spec.
- A conferência de alinhamento compara conteúdo, não permissão: o `chmod +x` do hook segue sendo
  passo humano do §7.

## 10. Definition of Done — comportamento provado

1. `pnpm test` verde no `lotus-infra` com as três catracas novas/alteradas, e a prova local do HSTS
   (§4.6) registrada.
2. `pnpm check` verde no `lotus-site`; stack `lotus-dns` em `UPDATE_COMPLETE` com change set de um
   recurso; `EnableTerminationProtection: True`; `conferir-zona --pos-delegacao` sem divergência.
3. `app.lotusotec.cl` resolve **exatamente** `18.230.53.197`, sem AAAA, de fora.
4. `http://app.lotusotec.cl/inicio` → 301; `http://…/up` → 200; `https://…/up` → 200 com HSTS
   `max-age=31536000`, também em `/`, `/assets/*` e num erro de `/api/*`.
5. Certificado Let's Encrypt para `app.lotusotec.cl`; renovação por webroot (`authenticator =
   webroot`); hook executado com saída 0 sem queda; `certbot renew --dry-run` verde com o nginx de
   pé.
6. Cookie de sessão com `Secure` e `Domain=app.lotusotec.cl`; login real feito pelo João.
7. Um certificado emitido em produção com QR decodificado para `https://app.lotusotec.cl/validar/…`,
   validação 200, e revogado em seguida.
8. Botão de promoção verde depois de tudo (host alinhado com os quatro scripts e o `tls.conf` novo).
9. Tudo medido em `docs/superpowers/audits/<data>-infra-producao-dns-e-tls.md`; P-77 encerrada
   com a medição; D-52 fechada no site.

## 11. Handoff

`executor: claude`. As escritas na AWS, no host e o login/emissão são do João (memória:
escrita remota em produção bloqueada); eu confiro por leitura e escrevo o audit. A ordem é a do
§5.5 e do §6; nenhum passo da fase B começa antes da fase A mesclada.
