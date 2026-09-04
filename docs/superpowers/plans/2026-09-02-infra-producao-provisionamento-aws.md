# Plano — `infra-producao-provisionamento-aws` (v2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (executor: claude,
> nesta sessão/árvore) para implementar task a task. Passos usam checkbox (`- [ ]`).

**Goal:** provisionar a base de produção na AWS (EC2 t4g.small + MySQL em container + S3 real) e
provar a imagem corporativa promovida por SHA rodando sobre ela, com backup restaurável e billing
alarm — HTTPS condicionado ao registro A de terceiro.

**Architecture:** conta Gatika como está; VPC default `sa-east-1`; EC2 `t4g.small` ARM com swap e
cloud-init versionado; `mysql` entra no `docker-compose.prod.yml` (revisão do ADR-09) com backup
`mysqldump → S3` provado por restore; S3 com instance role; CI vira multi-arch; deploy manual por
SHA (`deploy.sh`); TLS pronto esperando o registro A.

**Tech Stack:** Docker Compose, GitHub Actions (buildx/QEMU), AWS (EC2, S3, IAM, CloudWatch
billing), certbot, mysqldump, vitest (catracas).

## Global Constraints

- Spec: `docs/superpowers/specs/2026-09-02-infra-producao-provisionamento-aws-design.md` (v2).
- Teto de custo: **US$ 30/mês** (D8). Região: **`sa-east-1`** (D3). Compute: **`t4g.small`** (D4).
- `docker-compose.prod.yml` e overlays têm catraca (`frontend/tests/compose-prod.test.ts`) — toda
  mudança soma asserção **no mesmo commit** (lição 19).
- Segredo nunca entra em arquivo do repositório nem em valor literal de compose.
- Credencial AWS não entra nesta máquina: ações de console/CloudShell são do João, guiadas.
- Frontend tests rodam de `frontend/`: `pnpm test` (vitest). Backend não é tocado (P-03 N/A).
- Commits terminam com `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- Orçamento de memória medido (2026-09-02, dev, base carregada): clamav 264 MiB, mysql 146 MiB,
  gotenberg 6 MiB idle. Critério de resize para `t4g.medium`: OOM-kill em lote de PDF ou swap
  sustentado em uso normal.

---

## Fase A — artefatos de repositório (WSL, sem AWS)

### Task 1: Pedido do registro A à Lotus/agência (terceiro — disparar primeiro)

**Files:** nenhum (ação do João; o rastro entra na Task 20).

**Interfaces:**
- Produces: pedido enviado; quando atendido, `app.lotusotec.cl` → EIP (consumido pela Task 19).

- [ ] **Step 1: João envia o pedido.** Texto pronto (o IP elástico só existe após a Task 14 — o
  pedido já avisa que o IP segue em mensagem posterior, para o terceiro ir abrindo o chamado):

  > Precisamos de um único registro DNS na zona de `lotusotec.cl` (painel StackCP/stackdns):
  > tipo **A**, nome **`app`** (`app.lotusotec.cl`), TTL 300, apontando para o IP que enviaremos
  > em seguida (IP fixo de servidor na AWS). Nada mais muda na zona — site, e-mail e demais
  > registros ficam como estão.

- [ ] **Step 2: registrar data/canal do pedido** (para a ficha de fallback da Task 19, se precisar).

### Task 2: CI multi-arch (`linux/amd64,linux/arm64`)

**Files:**
- Modify: `.github/workflows/ci.yml` (job `image`, ~linhas 356–435)

**Interfaces:**
- Produces: par `ghcr.io/<dono>/lotus-{app,web}:<sha>` como **manifest list** com os dois
  platforms, para SHAs novos após merge no corporativo (consumido pelas Tasks 15+).

- [ ] **Step 1: acrescentar QEMU antes do buildx.** Logo acima de
  `- uses: docker/setup-buildx-action@v3`:

  ```yaml
      # QEMU para o build arm64: o host de produção é t4g (Graviton). O par
      # passa a ser manifest list amd64+arm64 — o preço é build ~2x mais
      # lento, aceito na spec v2 do item 10 (D5).
      - uses: docker/setup-qemu-action@v3
        with:
          platforms: arm64
  ```

- [ ] **Step 2: `platforms` nos 4 passos de build/push.** Em cada um dos passos
  `Constroi o alvo app`, `Constroi o alvo web`, `Publica o alvo app`, `Publica o alvo web`,
  acrescentar dentro de `with:`:

  ```yaml
          platforms: linux/amd64,linux/arm64
  ```

- [ ] **Step 3: validar sintaxe.**
  `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/ci.yml'))"`
  Expected: sem saída, exit 0. A prova real é a Task 11 (`imagetools inspect` mostrando os dois
  platforms).

- [ ] **Step 4: commit**

  ```bash
  git add .github/workflows/ci.yml
  git commit -m "ci(image): par multi-arch amd64+arm64 para o t4g (item 10 v2, D5)"
  ```

### Task 3: `mysql` no compose de produção — catraca primeiro (TDD)

**Files:**
- Modify: `frontend/tests/compose-prod.test.ts`
- Modify: `docker-compose.prod.yml`
- Modify: `docker-compose.prod-probe.yml`
- Modify: `docker/probe.env`

**Interfaces:**
- Produces: serviço `mysql` (host interno `mysql:3306`, sem porta publicada), volume nomeado
  `mysql-data`, `app`/`scheduler` esperando `service_healthy`. O host usa `DB_HOST=mysql` no
  `.env` (Task 8) e o backup usa `docker exec` no serviço (Task 6).

- [ ] **Step 1: mudar a catraca (vai reprovar).** Em `compose-prod.test.ts`:

  1. `mysql` sai da lista compartilhada de dev — o describe do PROD deixa de proibi-lo e o do
  PROBE deixa de exigi-lo (o `it.each` dos dois usa a mesma lista):

  ```ts
  const SERVICOS_DE_DEV = ['minio', 'createbuckets', 'mailpit']
  ```

  2. Novas asserções no describe de `docker-compose.prod.yml`:

  ```ts
  it('declara o mysql com imagem fixada por digest, sem porta publicada e com dado em volume nomeado — a revisão 2026-09 do ADR-09', () => {
    const bloco = blocoDoServico('mysql')
    expect(bloco).toMatch(/^ {4}image: mysql:8\.0@sha256:[0-9a-f]{64}$/m)
    // 3306 NUNCA publicada: porta só na rede interna do Compose.
    expect(regioesDaChave(bloco, 'ports')).toHaveLength(0)
    // Dado persistente em volume NOMEADO (bind mount já é proibido acima).
    const [volumes] = regioesDaChave(bloco, 'volumes')
    expect(volumes ?? '').toMatch(/mysql-data:\/var\/lib\/mysql/)
    // Env trocável, como app/scheduler — MYSQL_* vem do env_file do servidor.
    const [envFile] = regioesDaChave(bloco, 'env_file')
    expect(envFile ?? '').toMatch(/\$\{LOTUS_ENV_FILE\b/)
  })

  it('força TCP no healthcheck do mysql e lê a senha do ambiente — socket Unix abre antes do listener e senha literal é segredo em repo', () => {
    const [health] = regioesDaChave(blocoDoServico('mysql'), 'healthcheck')
    expect(health ?? '').toMatch(/-h["',\s]+127\.0\.0\.1/)
    expect(health ?? '').toMatch(/MYSQL_ROOT_PASSWORD/)
    expect(health ?? '').not.toMatch(/-p['"]?secret/)
  })

  it('faz app e scheduler esperarem o mysql por service_healthy — a corrida do migrate contra o listener TCP foi medida', () => {
    for (const servico of ['app', 'scheduler']) {
      const [dependsOn] = regioesDaChave(blocoDoServico(servico), 'depends_on')
      expect(dependsOn ?? '').toMatch(/mysql:\s*\{?\s*condition:\s*service_healthy\b/)
    }
  })

  it('põe teto de memória em todo serviço — t4g.small tem 2 GiB e OOM sem teto derruba o vizinho, não o culpado', () => {
    for (const servico of ['app', 'scheduler', 'nginx', 'mysql', 'gotenberg', 'clamav']) {
      expect(blocoDoServico(servico)).toMatch(/^ {4}mem_limit: /m)
    }
  })
  ```

  3. No describe do PROBE: **remover** o it `espera o mysql por service_healthy…` (a asserção
  mudou de arquivo — está no item 2 acima) e acrescentar:

  ```ts
  it('não redeclara o mysql — desde a revisão 2026-09 do ADR-09 ele mora no compose de produção', () => {
    expect(PROBE).not.toMatch(/^\s{2}mysql:/m)
  })
  ```

- [ ] **Step 2: rodar e ver reprovar.**
  `cd frontend && pnpm test -- tests/compose-prod.test.ts`
  Expected: FAIL — `serviço "mysql" não encontrado` nas asserções novas do PROD.

- [ ] **Step 3: resolver o digest multi-arch do mysql:8.0** (o digest do ÍNDICE, não de uma
  arquitetura):

  ```bash
  docker buildx imagetools inspect mysql:8.0 | head -20
  ```

  Expected: linha `Digest: sha256:<64 hex>` com `MediaType` de manifest list/index, e as
  plataformas `linux/amd64` **e** `linux/arm64/v8` listadas abaixo. Sem o arm64, o serviço não
  sobe no t4g — parar e escolher tag que tenha os dois.

- [ ] **Step 4: editar `docker-compose.prod.yml`.**

  1. Reescrever o comentário de cabeçalho (linhas 4–7): o arquivo agora TEM MySQL por decisão
  (revisão 2026-09 do ADR-09, spec v2 do item 10); continua sem MinIO (S3), sem Mailpit
  (`MAIL_MAILER=log` até o bloco de SES), sem volume de código e sem worker de fila.

  2. Serviço novo (após `scheduler`), com o digest do Step 3 no lugar de `<DIGEST>`:

  ```yaml
    # MySQL em container no host único — revisão 2026-09 do ADR-09 (spec v2 do
    # item 10, D2): o teto de custo (US$ 30/mês) descartou o RDS. A mitigação
    # mora em deploy/bin/backup-db.sh (dump diário para o S3, restore provado)
    # e o gatilho de reversão está escrito na própria revisão do ADR.
    # 3306 NÃO é publicada: só a rede interna do Compose alcança o banco.
    mysql:
      image: mysql:8.0@sha256:<DIGEST>
      env_file: ${LOTUS_ENV_FILE:-/opt/lotus/.env}
      restart: unless-stopped
      mem_limit: 512m
      logging: *logging
      volumes:
        - mysql-data:/var/lib/mysql
      healthcheck:
        # -h 127.0.0.1 força TCP: a imagem abre o socket Unix ANTES do listener
        # TCP e o healthcheck ficaria verde com o app ainda tomando Connection
        # refused (medido em 2026-08-29, no overlay de sonda). A senha vem do
        # ambiente do container ($$ escapa do interpolador do Compose).
        test: ["CMD-SHELL", "mysqladmin ping -h 127.0.0.1 -p\"$$MYSQL_ROOT_PASSWORD\" --silent"]
        interval: 10s
        timeout: 5s
        retries: 5
        start_period: 30s
  ```

  3. `app`: `depends_on: [gotenberg, clamav]` vira forma longa + mysql healthy, e ganha teto:

  ```yaml
      mem_limit: 768m
      depends_on:
        gotenberg: {condition: service_started}
        clamav: {condition: service_started}
        mysql: {condition: service_healthy}
  ```

  4. `scheduler`: `depends_on: [app]` vira:

  ```yaml
      mem_limit: 384m
      depends_on:
        app: {condition: service_started}
        mysql: {condition: service_healthy}
  ```

  5. Tetos nos demais (valores sobre a medição do cabeçalho deste plano; a soma dos tetos excede
  2 GiB de propósito — teto é forro individual, não reserva; o swap absorve pico):
  `nginx` `mem_limit: 128m`, `gotenberg` `mem_limit: 768m`, `clamav` `mem_limit: 768m`.

  6. Volume nomeado no fim do arquivo:

  ```yaml
  volumes:
    mysql-data:
  ```

- [ ] **Step 5: enxugar o overlay de sonda.** Em `docker-compose.prod-probe.yml`: remover o
  serviço `mysql` inteiro e, no `app`, deixar só o acréscimo do minio (merge de mapas soma ao
  `depends_on` do arquivo base):

  ```yaml
  services:
    app:
      depends_on:
        minio: {condition: service_started}
  ```

  Atualizar o comentário de cabeçalho: a sonda acrescenta o que produção não tem — MinIO e
  Mailpit (o MySQL saiu daqui em 2026-09, revisão do ADR-09: agora é de produção).

- [ ] **Step 6: `docker/probe.env` ganha as chaves que o serviço de produção lê** (a sonda usa o
  mesmo env_file para todos os serviços). Junto de `DB_*`:

  ```bash
  MYSQL_DATABASE=lotus
  MYSQL_ROOT_PASSWORD=secret
  ```

- [ ] **Step 7: rodar e ver passar.**
  `cd frontend && pnpm test -- tests/compose-prod.test.ts`
  Expected: PASS, todos os its.

- [ ] **Step 8: config válido de fato (lição 15 — texto verde não é compose válido):**

  ```bash
  LOTUS_ENV_FILE=docker/probe.env docker compose -f docker-compose.prod.yml config --quiet
  LOTUS_ENV_FILE=docker/probe.env docker compose -f docker-compose.prod.yml -f docker-compose.prod-probe.yml config --quiet
  ```

  Expected: exit 0, sem warnings.

- [ ] **Step 9: commit**

  ```bash
  git add frontend/tests/compose-prod.test.ts docker-compose.prod.yml docker-compose.prod-probe.yml docker/probe.env
  git commit -m "feat(compose): mysql entra no compose de produção com teto de memória — revisão 2026-09 do ADR-09"
  ```

### Task 4: prova local end-to-end do compose novo

**Files:** nenhum (execução de `scripts/provar-release.sh`, inalterado).

**Interfaces:**
- Consumes: compose da Task 3; par corporativo amd64 já publicado (conferir o tip com
  `git ls-remote upstream main`).

- [ ] **Step 1:** derrubar a stack de dev desta árvore se estiver de pé (`docker compose down`),
  ou usar `LOTUS_RELEASE_PORT` livre.
- [ ] **Step 2:** login no GHCR com PAT `read:packages` (credential store, nunca arquivo).
- [ ] **Step 3:** rodar `scripts/provar-release.sh <sha-corporativo-40hex>`.
  Expected: `RELEASE PROVADO`, `/up → 200`, dois digests, exit 0 — agora com o MySQL vindo do
  compose de produção (o overlay só põe MinIO/Mailpit). Falha aqui = Task 3 quebrou o arranjo;
  consertar antes de seguir.
- [ ] **Step 4:** registrar a saída (colada na Task 20).

### Task 5: `deploy/bin/deploy.sh` — deploy por SHA no host

**Files:**
- Create: `deploy/bin/deploy.sh` (chmod +x)

**Interfaces:**
- Consumes: `/opt/lotus/{docker-compose.prod.yml,docker-compose.prod-tls.yml,.env}` no host
  (Tasks 8/10/15), PAT em `/opt/lotus/ghcr.token`.
- Produces: containers do par `<sha>` no ar, `/opt/lotus/CURRENT_SHA` gravado. Rollback =
  `deploy.sh <sha-anterior>`.

- [ ] **Step 1: escrever o script.** Derivado do `provar-release.sh` (mesma sequência
  login → pull → migrate → up → health → digests), com as diferenças do host:

  ```bash
  #!/usr/bin/env bash
  #
  # Deploy por SHA no host de produção (spec v2 do item 10, §11).
  # Sequência: login -> pull -> migrate -> up -> /up -> digests -> CURRENT_SHA.
  # Rollback: rodar de novo com o SHA anterior (migration incompatível é limite
  # declarado — estratégia é do item 12).
  #
  # Uso:  deploy.sh <sha de 40 hexadecimais>
  # Pré:  /opt/lotus/.env, /opt/lotus/ghcr.token (PAT read:packages),
  #       /opt/lotus/docker-compose.prod.yml (e o overlay TLS, se ativo).
  set -euo pipefail

  SHA="${1:-}"
  if [ ${#SHA} -ne 40 ] || [ -n "$(printf '%s' "$SHA" | tr -d '0-9a-f')" ]; then
    echo "uso: deploy.sh <sha de 40 hexadecimais>" >&2
    exit 2
  fi

  BASE=/opt/lotus
  DONO="${LOTUS_RELEASE_OWNER:-gatika-cl}"
  APP="ghcr.io/$DONO/lotus-app:$SHA"
  WEB="ghcr.io/$DONO/lotus-web:$SHA"

  ARQUIVOS=(-f "$BASE/docker-compose.prod.yml")
  # O overlay TLS entra sozinho quando o cert já foi emitido (runbook §11).
  if [ -f "$BASE/nginx/tls.conf" ] && [ -d /etc/letsencrypt/live ]; then
    ARQUIVOS+=(-f "$BASE/docker-compose.prod-tls.yml")
  fi

  compose() {
    LOTUS_IMAGE="$APP" LOTUS_WEB_IMAGE="$WEB" LOTUS_ENV_FILE="$BASE/.env" \
      docker compose -p lotus --project-directory "$BASE" "${ARQUIVOS[@]}" "$@"
  }

  echo "==> login ghcr.io"
  docker login ghcr.io -u "$DONO" --password-stdin < "$BASE/ghcr.token" >/dev/null

  echo "==> manifestos de $SHA"
  docker manifest inspect "$APP" >/dev/null
  docker manifest inspect "$WEB" >/dev/null

  echo "==> pull"
  compose pull --quiet

  echo "==> migrate"
  compose run --rm app php artisan migrate --force

  echo "==> up"
  compose up -d --no-build --pull never

  echo "==> esperando o nginx ficar healthy (até 150 s)"
  NGINX=$(compose ps -q nginx)
  ESTADO="?"
  for _ in $(seq 1 30); do
    ESTADO=$(docker inspect --format '{{.State.Health.Status}}' "$NGINX" 2>/dev/null || echo "?")
    [ "$ESTADO" = "healthy" ] && break
    [ "$ESTADO" = "unhealthy" ] && { compose logs --tail 50 nginx app >&2; exit 1; }
    sleep 5
  done
  [ "$ESTADO" = "healthy" ] || { echo "erro: nginx $ESTADO após 150 s" >&2; exit 1; }

  CODIGO=$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1/up" || echo 000)
  [ "$CODIGO" = "200" ] || { echo "erro: /up respondeu $CODIGO" >&2; exit 1; }

  for PAR in "app:$APP" "nginx:$WEB"; do
    SERVICO="${PAR%%:*}"; ALVO="${PAR#*:}"
    ID_PUXADO=$(docker image inspect --format '{{.Id}}' "$ALVO")
    ID_RODANDO=$(docker inspect --format '{{.Image}}' "$(compose ps -q "$SERVICO")")
    [ "$ID_PUXADO" = "$ID_RODANDO" ] || { echo "erro: $SERVICO roda imagem diferente da puxada" >&2; exit 1; }
  done

  echo "$SHA" > "$BASE/CURRENT_SHA"
  echo "==> DEPLOY OK: $SHA"
  ```

- [ ] **Step 2:** `bash -n deploy/bin/deploy.sh` — Expected: exit 0.
- [ ] **Step 3: commit**

  ```bash
  git add deploy/bin/deploy.sh
  git commit -m "feat(deploy): deploy manual por SHA no host, sobre o precedente do provar-release"
  ```

### Task 6: `deploy/bin/backup-db.sh` — dump diário para o S3

**Files:**
- Create: `deploy/bin/backup-db.sh` (chmod +x)

**Interfaces:**
- Consumes: serviço `mysql` do projeto compose `lotus`; AWS CLI do host com instance role
  (Task 13); `LOTUS_BACKUP_BUCKET` e `MYSQL_ROOT_PASSWORD` lidos de `/opt/lotus/.env`.
- Produces: `s3://<bucket>/backups/lotus-YYYY-MM-DDTHH-MM.sql.gz`; consumido pela prova de
  restore (Task 17).

- [ ] **Step 1: escrever o script.**

  ```bash
  #!/usr/bin/env bash
  #
  # Backup do MySQL de produção para o S3 (spec v2 do item 10, §8) — a
  # mitigação escrita na revisão 2026-09 do ADR-09. Roda pelo CRON DO HOST
  # (o scheduler vive dentro do container e não alcança `docker exec`).
  # Retenção: lifecycle rule do bucket expira backups/ em 30 dias (runbook §3).
  set -euo pipefail

  BASE=/opt/lotus
  # Só a chave que este script consome — sem `source` do .env inteiro.
  BUCKET=$(grep -E '^LOTUS_BACKUP_BUCKET=' "$BASE/.env" | cut -d= -f2-)
  [ -n "$BUCKET" ] || { echo "erro: LOTUS_BACKUP_BUCKET ausente do .env" >&2; exit 1; }

  MYSQL=$(docker compose -p lotus --project-directory "$BASE" -f "$BASE/docker-compose.prod.yml" ps -q mysql)
  [ -n "$MYSQL" ] || { echo "erro: serviço mysql não está de pé" >&2; exit 1; }

  ARQ="lotus-$(date -u +%Y-%m-%dT%H-%M).sql.gz"
  # --single-transaction: dump consistente sem travar o InnoDB. A senha vem do
  # ambiente do PRÓPRIO container — não passa pela linha de comando do host.
  docker exec "$MYSQL" sh -c 'exec mysqldump --single-transaction --routines --triggers -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"' \
    | gzip > "/tmp/$ARQ"

  # Dump vazio é falha, não backup: schema + seed mínimo já passam de 10 KiB.
  [ "$(stat -c %s "/tmp/$ARQ")" -gt 10240 ] || { echo "erro: dump suspeito de vazio ($(stat -c %s "/tmp/$ARQ") bytes)" >&2; exit 1; }

  aws s3 cp "/tmp/$ARQ" "s3://$BUCKET/backups/$ARQ" --only-show-errors
  rm -f "/tmp/$ARQ"
  echo "backup ok: s3://$BUCKET/backups/$ARQ"
  ```

- [ ] **Step 2:** `bash -n deploy/bin/backup-db.sh` — Expected: exit 0.
- [ ] **Step 3: commit**

  ```bash
  git add deploy/bin/backup-db.sh
  git commit -m "feat(deploy): backup diário do mysql para o S3 — a mitigação da revisão do ADR-09"
  ```

### Task 7: TLS pronto — conf 443 + overlay + catraca

**Files:**
- Create: `deploy/nginx/tls.conf`
- Create: `docker-compose.prod-tls.yml`
- Modify: `frontend/tests/compose-prod.test.ts`

**Interfaces:**
- Consumes: `docker/nginx/prod.conf` (o bloco 443 espelha o proxy dele).
- Produces: overlay que a Task 19 ativa quando o cert existir; `deploy.sh` (Task 5) já o inclui
  sozinho.

- [ ] **Step 1: catraca primeiro.** Novo describe em `compose-prod.test.ts` (reusa
  `blocoDoServico`/`regioesDaChave` passando o texto do overlay):

  ```ts
  describe('docker-compose.prod-tls.yml', () => {
    const TLS = readFileSync(join(RAIZ, 'docker-compose.prod-tls.yml'), 'utf8')

    it('publica 443 e mantém 80 — o redirect vive no tls.conf, não na retirada da porta', () => {
      const [ports] = regioesDaChave(blocoDoServico('nginx', TLS), 'ports')
      expect(ports ?? '').toMatch(/443:443/)
      expect(ports ?? '').toMatch(/80\}?:80/)
    })

    it('monta certificado e conf como read-only — o container serve TLS, não administra certificado', () => {
      const [volumes] = regioesDaChave(blocoDoServico('nginx', TLS), 'volumes')
      expect(volumes ?? '').toMatch(/\/etc\/letsencrypt:\/etc\/letsencrypt:ro/)
      expect(volumes ?? '').toMatch(/tls\.conf:\/etc\/nginx\/conf\.d\/default\.conf:ro/)
      expect(volumes ?? '').toMatch(/certbot-webroot/)
    })

    it('só toca o serviço nginx — app, mysql e o resto não mudam sob TLS', () => {
      expect(TLS).not.toMatch(/^ {2}(app|mysql|scheduler|gotenberg|clamav):/m)
    })
  })
  ```

  Rodar `cd frontend && pnpm test -- tests/compose-prod.test.ts`.
  Expected: FAIL — `ENOENT … docker-compose.prod-tls.yml`.

- [ ] **Step 2: `deploy/nginx/tls.conf`.** O bloco 443 repete o proxy do `prod.conf` **por
  inteiro** (o mount substitui `default.conf`; este arquivo passa a ser A conf do nginx):

  ```nginx
  # Substitui docker/nginx/prod.conf VIA BIND MOUNT quando o TLS está ativo
  # (docker-compose.prod-tls.yml). Duplica deliberadamente o proxy do
  # prod.conf: o mount troca o arquivo inteiro, então este é autossuficiente.
  # Mudou o proxy lá? Muda aqui no mesmo commit.
  server {
      listen 80;
      server_name _;

      # Renovação do certbot por webroot — sem derrubar o nginx.
      location /.well-known/acme-challenge/ {
          root /var/www/certbot;
      }

      location / {
          return 301 https://$host$request_uri;
      }
  }

  server {
      listen 443 ssl;
      http2 on;
      server_name app.lotusotec.cl;

      ssl_certificate     /etc/letsencrypt/live/app.lotusotec.cl/fullchain.pem;
      ssl_certificate_key /etc/letsencrypt/live/app.lotusotec.cl/privkey.pem;
      ssl_protocols TLSv1.2 TLSv1.3;

      root /usr/share/nginx/html;
      index index.html;
      client_max_body_size 12m;

      location ~ ^/(api|sanctum|up)(/|$) {
          fastcgi_pass app:9000;
          include fastcgi_params;
          fastcgi_param SCRIPT_FILENAME /var/www/public/index.php;
          fastcgi_param SCRIPT_NAME /index.php;
          fastcgi_read_timeout 120s;
          fastcgi_param HTTP_X_FORWARDED_FOR "";
          fastcgi_param HTTP_X_FORWARDED_PROTO "";
          fastcgi_param HTTP_X_FORWARDED_HOST "";
          fastcgi_param HTTP_X_FORWARDED_PORT "";
          fastcgi_param HTTP_FORWARDED "";
      }

      location /assets/ {
          add_header Cache-Control "public, max-age=31536000, immutable";
          try_files $uri =404;
      }

      location / {
          add_header Cache-Control "no-cache";
          try_files $uri $uri/ /index.html;
      }
  }
  ```

- [ ] **Step 3: `docker-compose.prod-tls.yml`.**

  ```yaml
  # Overlay de TLS. Entra ao lado do compose de produção QUANDO o certificado
  # existe (deploy.sh detecta /opt/lotus/nginx/tls.conf + /etc/letsencrypt).
  # Só o nginx muda: ganha a 443 e a conf que redireciona a 80. Bind mounts
  # aqui são de CONFIGURAÇÃO do host (cert, conf, webroot do challenge) —
  # nunca de código; a catraca do working tree segue valendo no arquivo base.
  services:
    nginx:
      ports:
        - "${LOTUS_HTTP_PORT:-80}:80"
        - "443:443"
      volumes:
        - /etc/letsencrypt:/etc/letsencrypt:ro
        - /opt/lotus/nginx/tls.conf:/etc/nginx/conf.d/default.conf:ro
        - certbot-webroot:/var/www/certbot:ro

  volumes:
    certbot-webroot:
  ```

- [ ] **Step 4: rodar e ver passar.** `cd frontend && pnpm test -- tests/compose-prod.test.ts`
  Expected: PASS. E validar o merge:
  `LOTUS_ENV_FILE=docker/probe.env docker compose -f docker-compose.prod.yml -f docker-compose.prod-tls.yml config --quiet`
  Expected: exit 0 (mount de `/etc/letsencrypt` só falharia no `up`, não no `config`).

- [ ] **Step 5: commit**

  ```bash
  git add deploy/nginx/tls.conf docker-compose.prod-tls.yml frontend/tests/compose-prod.test.ts
  git commit -m "feat(tls): conf 443 e overlay prontos — a emissão espera o registro A de terceiro"
  ```

### Task 8: cloud-init + molde do `.env` de produção

**Files:**
- Create: `deploy/aws/user-data.sh`
- Create: `deploy/aws/env.prod.example`

**Interfaces:**
- Produces: user-data colado no launch da EC2 (Task 14); molde preenchido à mão no host
  (Task 15). Chaves novas que compose/backup leem: `MYSQL_DATABASE`, `MYSQL_ROOT_PASSWORD`,
  `LOTUS_BACKUP_BUCKET`.

- [ ] **Step 1: `deploy/aws/user-data.sh`.**

  ```bash
  #!/usr/bin/env bash
  #
  # user-data da EC2 de produção (Ubuntu 24.04 arm64) — spec v2 do item 10, §6.
  # Reproduzível: host novo + este arquivo + runbook = ambiente igual.
  set -euxo pipefail

  # Docker Engine + compose plugin (repositório oficial do Docker) + AWS CLI
  # (o backup-db.sh fala com o S3 pela instance role).
  apt-get update
  apt-get install -y ca-certificates curl gnupg awscli
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  echo "deb [arch=arm64 signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu noble stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

  # Swap de 2 GiB — obrigatório (t4g.small tem 2 GiB; o swap absorve pico de
  # PDF/reload do clamav; swap SUSTENTADO é critério de resize, não de mais
  # swap).
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab

  # Árvore de operação. Os artefatos (compose, scripts, conf) chegam pelo
  # runbook (§7) — user-data não clona repositório: produção não depende de
  # working tree (DoD 8).
  mkdir -p /opt/lotus/nginx /opt/lotus/bin
  chmod 750 /opt/lotus
  ```

- [ ] **Step 2: `deploy/aws/env.prod.example`** — molde SEM segredo real; cada `<...>` é
  preenchido à mão no host, nunca commitado preenchido:

  ```bash
  # Molde do /opt/lotus/.env de PRODUÇÃO (spec v2 do item 10). Copie para o
  # host, preencha os <...> e proteja: chmod 600, dono root.
  APP_NAME=Lotus
  APP_ENV=production
  # Gere no host (herança da spec do runtime: key:generate exige --entrypoint php):
  #   docker run --rm --entrypoint php ghcr.io/gatika-cl/lotus-app:<sha> artisan key:generate --show
  APP_KEY=<base64:...>
  APP_DEBUG=false
  APP_URL=http://app.lotusotec.cl

  LOG_CHANNEL=stderr
  LOG_LEVEL=info

  DB_CONNECTION=mysql
  DB_HOST=mysql
  DB_PORT=3306
  DB_DATABASE=lotus
  DB_USERNAME=root
  DB_PASSWORD=<senha forte>
  # Lidas pelo serviço mysql do compose (init do volume) e pelo healthcheck.
  # MYSQL_ROOT_PASSWORD deve ser IGUAL a DB_PASSWORD; MYSQL_DATABASE igual a
  # DB_DATABASE.
  MYSQL_DATABASE=lotus
  MYSQL_ROOT_PASSWORD=<a mesma senha forte>

  SESSION_DRIVER=database
  SESSION_DOMAIN=app.lotusotec.cl
  CACHE_STORE=database
  QUEUE_CONNECTION=database

  FRONTEND_URL=http://app.lotusotec.cl
  SANCTUM_STATEFUL_DOMAINS=app.lotusotec.cl

  # S3 REAL com instance role: sem AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY de
  # propósito — o SDK cai na chain do IMDSv2 (hop limit 2, runbook §6). Sem
  # AWS_ENDPOINT: o endpoint é o da própria AWS.
  FILESYSTEM_DISK=s3
  AWS_DEFAULT_REGION=sa-east-1
  AWS_BUCKET=<lotus-prod-ACCOUNTID>
  AWS_USE_PATH_STYLE_ENDPOINT=false

  # Bucket dos dumps do backup-db.sh (pode ser o mesmo AWS_BUCKET).
  LOTUS_BACKUP_BUCKET=<lotus-prod-ACCOUNTID>

  # E-mail fica em log até o bloco de SES (spec §3).
  MAIL_MAILER=log
  MAIL_FROM_ADDRESS=lotus@lotusotec.cl
  MAIL_FROM_NAME=Lotus
  ```

- [ ] **Step 3:** `bash -n deploy/aws/user-data.sh` — Expected: exit 0.
- [ ] **Step 4: commit**

  ```bash
  git add deploy/aws/user-data.sh deploy/aws/env.prod.example
  git commit -m "feat(aws): cloud-init do host e molde do env de produção"
  ```

### Task 9: revisão 2026-09 do ADR-09

**Files:**
- Modify: `docs/adrs.md` (seção ADR-09, ~linha 71)

- [ ] **Step 1: acrescentar a revisão SOB a regra original (que fica — datada, não apagada):**

  ```markdown
  **Revisão 2026-09 (spec v2 do item 10, decisão D2 do brainstorming de 2026-09-02):** MySQL 8 em
  **container no host único de produção** (`docker-compose.prod.yml`), não em RDS. O que mudou: o
  teto de custo do bloco é US$ 30/mês (D8) e o RDS custaria ~US$ 15–20/mês — mais da metade do
  teto para ~10 usuários de baixa concorrência. O que NÃO mudou: a porta 3306 nunca é publicada
  (rede interna do Compose), o dado vive em volume nomeado, e a persistência segura continua
  sendo requisito — paga por `deploy/bin/backup-db.sh` (dump diário `--single-transaction` → S3,
  lifecycle de 30 dias, retenção mínima de 7 atendida) com **restore provado** no DoD do bloco.
  **Gatilho de reversão a RDS** (qualquer um): restore provado falhar; backup > 7 dias sem
  sucesso; cliente exigir RPO menor que o dump diário. RTO/RPO desta revisão: até 24 h de perda
  potencial + restore manual pelo runbook — aceito por decisão explícita do João em 2026-09-02.
  ```

- [ ] **Step 2: commit**

  ```bash
  git add docs/adrs.md
  git commit -m "docs(adr): revisão 2026-09 do ADR-09 — mysql em container com backup provado"
  ```

### Task 10: runbook `deploy/aws/README.md`

**Files:**
- Create: `deploy/aws/README.md`

**Interfaces:**
- Consumes: tudo das Tasks 5–9. Produces: o passo-a-passo que as Tasks 12–19 executam — as
  seções são 1:1 com elas.

- [ ] **Step 1: escrever o runbook** com estas 12 seções (conteúdo = os passos exatos abaixo,
  para o host ser reproduzível sem o plano aberto):

  1. **Fase 0 — usuário IAM** (spec §4): console → IAM → Users → Create `lotus-infra`, console
     access, política `AdministratorAccess`, MFA próprio. **Fallback:** MFA com o cliente
     indisponível → seguir com o acesso atual e abrir ficha "criar `lotus-infra`" (gatilho: MFA
     disponível).
  2. **Medição SCP:** CloudShell → `aws organizations describe-organization`. AccessDenied
     também é resposta — colar a saída literal no audit. Recusa de SCP a recurso do bloco =
     blocker.
  3. **S3:** bucket `lotus-prod-<ACCOUNT_ID>` em `sa-east-1`, Block Public Access total,
     versioning ON, lifecycle rule `expira-backups`: prefixo `backups/`, expiração 30 dias.
  4. **IAM role da EC2:** role `lotus-ec2` (trust: ec2.amazonaws.com) com política inline
     (substituir `<BUCKET>`):

     ```json
     {"Version": "2012-10-17", "Statement": [
       {"Effect": "Allow", "Action": ["s3:ListBucket"], "Resource": "arn:aws:s3:::<BUCKET>"},
       {"Effect": "Allow", "Action": ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"],
        "Resource": "arn:aws:s3:::<BUCKET>/*"}
     ]}
     ```

  5. **Security Group `lotus-web`** na VPC default de `sa-east-1`: inbound 22/tcp só do IP do
     João (`/32`), 80/tcp e 443/tcp de `0.0.0.0/0`; outbound liberado.
  6. **EC2:** `t4g.small`, AMI Ubuntu Server 24.04 LTS **arm64**, EBS gp3 20 GiB, key pair novo
     (`.pem` fora do repo), instance profile `lotus-ec2`, SG `lotus-web`, user-data = conteúdo
     de `deploy/aws/user-data.sh`, **Metadata: IMDSv2 required + hop limit 2** (sem hop 2,
     container não alcança credencial de role — timeout silencioso de ~10 s por request).
     Alocar **Elastic IP** e associar.
  7. **Artefatos no host:** `scp` de `docker-compose.prod.yml`, `docker-compose.prod-tls.yml`
     para `/opt/lotus/`; `deploy/bin/*.sh` para `/opt/lotus/bin/`; `deploy/nginx/tls.conf` para
     `/opt/lotus/nginx/`; `.env` do molde `env.prod.example` preenchido, `chmod 600`; PAT
     `read:packages` em `/opt/lotus/ghcr.token`, `chmod 600`.
  8. **Deploy:** `sudo /opt/lotus/bin/deploy.sh <sha>`; rollback = SHA anterior. Admin inicial:
     comando de seed/tinker documentado aqui na execução (medir qual seeder existe).
  9. **Backup:** `sudo crontab -e` →
     `10 6 * * * /opt/lotus/bin/backup-db.sh >> /var/log/lotus-backup.log 2>&1`
     (06:10 UTC = 03:10 Chile). Prova de restore: comandos da Task 17.
  10. **Billing alarm:** console em **us-east-1** (métrica de billing só existe lá — não
      "corrigir" a região) → CloudWatch → Billing → `EstimatedCharges > 30 USD` → SNS → e-mail
      do João → **confirmar a subscription**.
  11. **TLS quando o registro A chegar:** conferir `dig +short app.lotusotec.cl` == EIP (o
      curinga `*.lotusotec.cl` faz qualquer nome "resolver" — só a igualdade prova);
      `sudo apt-get install -y certbot`; primeira emissão:

      ```bash
      docker compose -p lotus --project-directory /opt/lotus -f /opt/lotus/docker-compose.prod.yml stop nginx
      sudo certbot certonly --standalone -d app.lotusotec.cl --agree-tos -m <email>
      sudo /opt/lotus/bin/deploy.sh "$(cat /opt/lotus/CURRENT_SHA)"
      ```

      (o deploy.sh detecta o cert e sobe com o overlay). Renovação: timer systemd do certbot +
      hook `/etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh` com
      `docker compose -p lotus --project-directory /opt/lotus -f /opt/lotus/docker-compose.prod.yml -f /opt/lotus/docker-compose.prod-tls.yml restart nginx`;
      validar com `sudo certbot renew --dry-run` (webroot servido pelo tls.conf).
  12. **Critério de resize** (spec §6): OOM-kill em lote de PDF ou swap sustentado em uso normal
      → stop → change type `t4g.medium` → start. Medição: `docker stats --no-stream` + `free -m`
      no audit.

- [ ] **Step 2: commit**

  ```bash
  git add deploy/aws/README.md
  git commit -m "docs(aws): runbook de provisionamento e operação do host"
  ```

### Task 11: PR da Fase A + espelho corporativo

**Files:** nenhum novo.

- [ ] **Step 1: gate local completo:** `cd frontend && pnpm lint && pnpm build && pnpm test`.
  Expected: lint 0, build verde, suíte verde.
- [ ] **Step 2: push + PR** `infra/producao-provisionamento-aws` → `main` (pessoal). Título:
  `infra: base AWS do item 10 v2 — mysql no compose, CI multi-arch, deploy por SHA`. **Merge só
  com aprovação do João.** (Atenção P-73: `audit-dev` vermelho na `main` bloqueia o `image` —
  se ainda estiver vermelho, o João decide o bump antes do espelho.)
- [ ] **Step 3: após o merge, espelhar:** `scripts/espelhar-corporativo.sh` (CONTRIBUINDO.md).
  Registrar o SHA corporativo novo — é ele que a Task 15 implanta.
- [ ] **Step 4: par multi-arch provado:**

  ```bash
  docker buildx imagetools inspect ghcr.io/gatika-cl/lotus-app:<sha-corporativo>
  ```

  Expected: manifest list com `linux/amd64` **e** `linux/arm64`. Idem `lotus-web`.

---

## Fase B — provisionamento e prova na AWS (João no console, guiado)

### Task 12: Fase 0 — usuário IAM + medição SCP

- [ ] **Step 1:** runbook §1 (usuário `lotus-infra` + MFA). MFA indisponível → fallback:
  prosseguir e abrir ficha em `docs/superpowers/pendencias/abertas.md` (gatilho: MFA
  disponível) + linha no índice.
- [ ] **Step 2:** runbook §2 (CloudShell, `aws organizations describe-organization`); saída
  literal para o audit da Task 20. Recusa por SCP a recurso das Tasks 13–14 → `blocked` no
  `state.md` com a mensagem literal.

### Task 13: S3 + IAM role

- [ ] **Step 1:** runbook §3 (bucket, versioning, Block Public Access, lifecycle `backups/` 30d).
- [ ] **Step 2:** runbook §4 (role `lotus-ec2` + política inline).
- [ ] **Step 3: prova:** Properties → versioning `Enabled`; Management → lifecycle presente.
  Registro para o audit.

### Task 14: SG + EC2 + EIP

- [ ] **Step 1:** runbook §5 (SG `lotus-web`).
- [ ] **Step 2:** runbook §6 (launch com user-data, IMDSv2 hop limit 2, instance profile, EIP).
- [ ] **Step 3: prova do cloud-init** via SSH:

  ```bash
  docker --version && docker compose version && free -m | grep -i swap && ls -ld /opt/lotus
  ```

  Expected: Docker instalado, `Swap: 2047` (±), `/opt/lotus` existente. Falhou →
  `sudo cat /var/log/cloud-init-output.log`.
- [ ] **Step 4: enviar o EIP à Lotus/agência** (completa o pedido da Task 1).

### Task 15: artefatos no host + primeiro deploy

- [ ] **Step 1:** runbook §7 (scp dos artefatos; `.env` preenchido — `APP_KEY` com
  `--entrypoint php`; PAT em `ghcr.token`; `chmod 600` nos dois).
- [ ] **Step 2:** `sudo /opt/lotus/bin/deploy.sh <sha-corporativo-da-Task-11>`.
  Expected: `DEPLOY OK: <sha>`, exit 0.
- [ ] **Step 3: prova externa:** do WSL,
  `curl -s -o /dev/null -w '%{http_code}' http://<EIP>/up` — Expected: `200`. (DoD 2.)
- [ ] **Step 4: arquitetura de fato:** no host,
  `docker image inspect --format '{{.Architecture}}' ghcr.io/gatika-cl/lotus-app:<sha>` —
  Expected: `arm64`.

### Task 16: provas funcionais — S3 real, PDF, memória

- [ ] **Step 1: admin inicial** conforme runbook §8 (seeder de produção se existir; senão tinker
  — medir na execução e documentar o comando usado).
- [ ] **Step 2: upload real:** login na UI por `http://<EIP>`, subir um documento. Prova: objeto
  novo no bucket (console S3) **e** download pela URL pré-assinada. Isso prova a chain do
  IMDSv2 (sem access key no `.env`). Falha de credencial → conferir hop limit 2; persistindo,
  fallback da spec §9 (IAM user dedicado), registrado como desvio. (DoD 3.)
- [ ] **Step 3: PDF:** emitir certificado de teste pela UI. Expected: PDF gerado;
  `dmesg | grep -i oom` limpo. (DoD 4.)
- [ ] **Step 4: memória sob carga:** `docker stats --no-stream` + `free -m` no audit.

### Task 17: backup + restore provado

- [ ] **Step 1:** cron do runbook §9 instalado; rodar uma vez à mão:
  `sudo /opt/lotus/bin/backup-db.sh` — Expected: `backup ok: s3://…`.
- [ ] **Step 2: restore em container limpo** (no host):

  ```bash
  aws s3 cp "s3://<BUCKET>/backups/<arquivo-mais-recente>" /tmp/dump.sql.gz
  docker run -d --name restore-prova -e MYSQL_ROOT_PASSWORD=prova -e MYSQL_DATABASE=lotus mysql:8.0
  sleep 40
  gunzip -c /tmp/dump.sql.gz | docker exec -i restore-prova mysql -uroot -pprova lotus
  docker exec restore-prova mysql -uroot -pprova -N -e \
    "SELECT 'certificates', COUNT(*) FROM lotus.certificates UNION ALL SELECT 'audits', COUNT(*) FROM lotus.audits"
  ```

  Expected: contagens **iguais** às da origem (mesmo `SELECT` no mysql de produção). Limpar:
  `docker rm -f restore-prova && rm /tmp/dump.sql.gz`. (DoD 5.)

### Task 18: billing alarm

- [ ] **Step 1:** runbook §10 (us-east-1, `EstimatedCharges > 30`, SNS e-mail confirmado).
- [ ] **Step 2: prova:** subscription `Confirmed` + e-mail de confirmação recebido. (DoD 6.)

### Task 19: TLS — condicional ao registro A

- [ ] **Step 1:** `dig +short app.lotusotec.cl` == EIP? (curinga torna "resolve" inconclusivo —
  só a igualdade prova).
- [ ] **Step 2 (se chegou):** runbook §11 — emissão standalone, redeploy (overlay entra
  sozinho), `curl -s -o /dev/null -w '%{http_code}' https://app.lotusotec.cl/up` == `200`,
  `sudo certbot renew --dry-run` verde. (DoD 7, ramo provado.)
- [ ] **Step 2 (se NÃO chegou):** ficha em `pendencias/abertas.md` — gatilho: "registro A
  `app.lotusotec.cl` → <EIP> criado"; ação: runbook §11. A prova HTTP da Task 15 fecha o bloco.
  (DoD 7, ramo ficha.)

### Task 20: evidências + fechamento da execução

- [ ] **Step 1:** criar `docs/superpowers/audits/2026-09-XX-item10-v2-provisionamento.md` com:
  `describe-organization` (Task 12), saída do `provar-release.sh` (Task 4), `imagetools
  inspect` (Task 11), `DEPLOY OK` + `/up` 200 (Task 15), provas S3/PDF/memória (Task 16),
  restore com contagens (Task 17), billing alarm (Task 18), ramo do TLS (Task 19), custo
  estimado vs teto.
- [ ] **Step 2: gate de fechamento:** `pnpm lint` 0, `pnpm build` verde, `pnpm test` verde;
  `git diff main...HEAD -- backend/ frontend/src/shared/api/generated.ts` vazio (pint e
  `typescript:transform` N/A por escopo, provados).
- [ ] **Step 3: commit das evidências + `state.md`** da lane-b → `ready_for_review`.

---

## Handoff de execução

```yaml
executor: claude
```

Justificativa: o bloco toca decisão de arquitetura (revisão de ADR), credencial/console AWS e
julgamento fora do plano (fallbacks de MFA, SCP e DNS). Nenhuma task é mecânica com paths
fechados — Codex não recebe fatia deste plano.

Ordem com dependência externa: Task 1 dispara primeiro (terceiro); Tasks 2–10 são locais e
sequenciais; Task 11 atravessa PR + espelho; a Fase B depende do par multi-arch da Task 11 e das
ações de console do João. `/executar-bloco infra-producao-provisionamento-aws` exige instrução
posterior do João.
