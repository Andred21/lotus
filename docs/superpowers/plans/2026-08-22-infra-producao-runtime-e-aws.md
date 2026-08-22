# Runtime de produção — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** entregar o runtime versionado de produção do Lotus — imagem multi-stage, Nginx de origem única, Compose sem serviço de dev, entrypoint e os dois `memory_limit` medidos da P-50 — provado nesta máquina, sem tocar em conta AWS.

**Architecture:** um `docker/Dockerfile.prod` com quatro estágios (`vendor`, `spa`, `app`, `web`) produz duas imagens: `app` (PHP-FPM com código e vendor copiados) e `web` (Nginx com o `dist/` do SPA). O Nginx serve o SPA na raiz e roteia `/api`, `/sanctum` e `/up` ao PHP-FPM do mesmo host, o que apaga CORS e deixa `VITE_API_URL` vazio. `docker-compose.prod.yml` tem três serviços e nenhum volume de código; um overlay separado acrescenta MySQL, MinIO e Mailpit só para a prova local.

**Tech Stack:** Docker multi-stage (`composer:2`, `node:22-alpine`, `php:8.3-fpm-alpine`, `nginx:alpine`), Docker Compose v2, PHP-FPM pool config, Vitest (catraca de composição), Gotenberg 8.

## Global Constraints

- **Spec:** `docs/superpowers/specs/2026-08-22-infra-producao-runtime-e-aws-design.md`. Toda decisão D1–D9 vale como requisito.
- **Escopo:** só runtime versionado. **Nenhuma** task provisiona EC2, RDS, S3, SES, DNS, TLS ou CloudWatch (D1).
- **Sem secret no repo e sem secret na imagem** (D6). `.env.production.example` tem toda chave presente e **todo valor vazio**.
- **Sem volume de código** no `docker-compose.prod.yml` (DoD do item 10).
- **Sem MySQL, MinIO ou Mailpit** no `docker-compose.prod.yml` (D4). Gotenberg permanece (ADR-12).
- **Versões medidas no host, não supostas:** Node `v22.23.1`, pnpm `11.22.0`, `pnpm-lock.yaml` em `lockfileVersion: '9.0'`, PHP `^8.3` (`backend/composer.json:9`).
- **Extensões PHP** iguais às de dev: `pdo_mysql gd zip intl bcmath`, sobre `libzip-dev icu-dev oniguruma-dev libpng-dev`.
- **`client_max_body_size` permanece `12m`**, com o motivo já escrito em `docker/nginx/default.conf:5-9`.
- **Pint** roda **no host, de dentro de `backend/`, sempre com argumento** (`CLAUDE.md` §6). Nenhuma task deste plano edita PHP de `backend/app/`, então Pint é N/A salvo medição em contrário.
- **`generated.ts` não é tocado.** Nenhuma task altera DTO, então `typescript:transform` é N/A por escopo — a ser **medido** no gate, não suposto.
- **Um commit por task.**

---

### Task 1: `memory_limit` do CLI medido, e a P-50 pela metade que dói

**Files:**
- Create: `docker/php/memory-cli.ini`
- Modify: `docker/php/Dockerfile` (imagem de dev — acrescentar o `COPY` da conf nova)

**Interfaces:**
- Produces: `docker/php/memory-cli.ini`, arquivo de `conf.d` copiado por **ambas** as imagens (a de dev nesta task, a de produção na Task 4). É a conf que vale para o SAPI `cli`; o pool da Task 2 sobrescreve o valor para o FPM.

- [ ] **Step 1: Medir o pico real da suíte, sem herdar número de ficha**

```bash
cd /home/jvbat/projetos/lotus-infra
docker compose up -d
docker compose exec -T app php -d memory_limit=1G vendor/bin/phpunit 2>&1 | tail -5
```

Esperado: a suíte fecha verde e a última linha traz `Memory: NNN.NN MB`. **Anote o número.** A P-50 registra picos de 127,00 MB e 129,00 MB em medições anteriores; o que vale é o desta árvore.

- [ ] **Step 2: Ver o comando documentado morrer, para provar que a task tem alvo**

```bash
docker compose exec -T app php artisan test 2>&1 | grep -c "Allowed memory size"
```

Esperado: número **maior que zero** — é o `Fatal error: Allowed memory size of 134217728 bytes exhausted` que a P-50 descreve. Se vier `0`, **pare e registre**: o gatilho da ficha mudou e o plano precisa ser reavaliado.

- [ ] **Step 3: Derivar o valor por regra, não por gosto**

Regra: **o menor múltiplo de 64M que seja ≥ 2× o pico medido no Step 1.** Com um pico de 129 MB, isso dá `320M` (2 × 129 = 258 → o múltiplo de 64 acima é 320). Recalcule com o número medido; não copie o exemplo.

Crie `docker/php/memory-cli.ini` (substituindo `320M` pelo valor derivado):

```ini
; Teto de memória do SAPI **cli**. O valor é medido, não arbitrário (P-50): é o
; menor múltiplo de 64M acima do DOBRO do pico real da suíte, que roda no
; container e é o maior consumidor de CLI do projeto. O default de 128M ficava
; ABAIXO do pico (medições de 127,00 e 129,00 MB), e por isso o comando
; documentado no CLAUDE.md §6 morria com "Allowed memory size exhausted" no
; meio da corrida — sem que teste nenhum estivesse errado.
;
; O PHP-FPM NÃO usa este número: o pool (docker/php/www.conf) o sobrescreve com
; php_admin_value, porque produção e suíte de teste têm consumidores diferentes.
memory_limit = 320M
```

- [ ] **Step 4: Copiar a conf na imagem de dev**

Em `docker/php/Dockerfile`, logo abaixo da linha que copia `uploads.ini`:

```dockerfile
COPY docker/php/uploads.ini /usr/local/etc/php/conf.d/zz-uploads.ini
COPY docker/php/memory-cli.ini /usr/local/etc/php/conf.d/zz-memory-cli.ini
```

- [ ] **Step 5: Reconstruir e provar que o comando documentado voltou**

```bash
docker compose build app && docker compose up -d
docker compose exec -T app php -i | grep "^memory_limit"
docker compose exec -T app php artisan test 2>&1 | tail -5
```

Esperado: `memory_limit => 320M => 320M` (ou o valor derivado) e a suíte fechando verde **pelo comando do `CLAUDE.md` §6**, sem nenhum `Allowed memory size`.

- [ ] **Step 6: Commit**

```bash
git add docker/php/memory-cli.ini docker/php/Dockerfile
git commit -m "fix(infra): memory_limit do CLI medido, e o comando do §6 volta a fechar"
```

---

### Task 2: `memory_limit` do FPM medido por sonda efêmera

**Files:**
- Create: `docker/php/www.conf`
- Temporário e **revertido dentro da própria task**: `backend/public/index.php`

**Interfaces:**
- Consumes: `docker/php/memory-cli.ini` da Task 1 — o pool existe justamente para o FPM **não** herdar aquele número.
- Produces: `docker/php/www.conf`, copiado para `/usr/local/etc/php-fpm.d/zz-www.conf` pela Task 4.

- [ ] **Step 1: Instalar a sonda de pico no front-controller (patch efêmero)**

A medição é o artefato desta task; o código da sonda **não** fica. Em `backend/public/index.php`, logo após a linha `<?php`, acrescente:

```php
// SONDA EFÊMERA DA TASK 2 — REMOVER NO STEP 5. Não commitar.
register_shutdown_function(static function (): void {
    error_log(sprintf(
        'MEMPROBE %s %s peak=%.2fMB',
        $_SERVER['REQUEST_METHOD'] ?? '-',
        $_SERVER['REQUEST_URI'] ?? '-',
        memory_get_peak_usage(true) / 1048576
    ));
});
```

- [ ] **Step 2: Exercitar as três rotas mais pesadas do produto**

As rotas foram medidas no repositório, não supostas: manual `.docx` (`app/Domains/Operation/routes.php:33`), certificado em lote e PDF (`app/Domains/Certification/routes.php:13-14`) e importação OpenSpout (`app/Domains/Operation/routes.php:47`).

Pelo navegador em `http://localhost:5173`, com sessão de admin, exercite:

1. baixar o manual `.docx` de uma turma existente (`GET /api/turmas/{turma}/manual/docx`);
2. abrir o PDF de um certificado emitido (`GET /api/certificates/{certificate}/pdf`);
3. importar uma planilha de alunos numa turma (`POST /api/turmas/{turma}/alunos/importar`).

Depois leia os picos:

```bash
docker compose logs app | grep MEMPROBE
```

Esperado: uma linha por request, com `peak=NN.NNMB`. **Anote o maior.**

- [ ] **Step 3: Derivar o valor do pool pela mesma regra da Task 1**

Regra idêntica: **menor múltiplo de 64M ≥ 2× o maior pico medido.** Crie `docker/php/www.conf`:

```ini
[www]
; Teto de memória do SAPI **fpm**, separado do CLI de propósito (spec D5). O
; número é medido: menor múltiplo de 64M acima do dobro do maior pico real
; entre as três rotas mais pesadas do produto — manual .docx (OOXML montado em
; Blade), PDF do certificado (Gotenberg) e importação OpenSpout.
;
; php_admin_value (e não php_value) porque só ele impede que a aplicação suba o
; próprio teto em runtime: um ini_set() que vence o limite operacional é a
; forma de o processo estourar a memória da EC2 sem que ninguém tenha decidido.
php_admin_value[memory_limit] = 256M
```

Substitua `256M` pelo valor derivado do Step 2.

- [ ] **Step 4: Provar que a sonda mede o que se pensa que mede**

```bash
docker compose exec -T app php -r 'echo round(memory_get_peak_usage(true)/1048576, 2), " MB\n";'
```

Esperado: um número pequeno (poucos MB) — é o controle de que `memory_get_peak_usage(true)` reporta memória alocada real, e que os picos do Step 2 vieram do trabalho das rotas e não do runtime vazio.

- [ ] **Step 5: Reverter a sonda e confirmar que nada dela sobrou**

```bash
cd /home/jvbat/projetos/lotus-infra
git checkout -- backend/public/index.php
git diff --name-only -- backend/
grep -rn "MEMPROBE" backend/ || echo "SEM SONDA"
```

Esperado: `git diff` devolve **zero arquivo** em `backend/`, e o grep imprime `SEM SONDA`.

- [ ] **Step 6: Commit**

```bash
git add docker/php/www.conf
git commit -m "feat(infra): pool do php-fpm com memory_limit proprio, medido nas rotas pesadas"
```

---

### Task 3: Nginx de origem única

**Files:**
- Create: `docker/nginx/prod.conf`

**Interfaces:**
- Produces: `docker/nginx/prod.conf`, copiada para `/etc/nginx/conf.d/default.conf` no estágio `web` da Task 4. Espera o serviço PHP-FPM alcançável como `app:9000` e o SPA em `/usr/share/nginx/html`.

- [ ] **Step 1: Reconferir que o roteamento cobre TODAS as rotas do backend**

```bash
cd /home/jvbat/projetos/lotus-infra/backend
grep -n "glob" routes/api.php
grep -rn "Route::" routes/web.php
grep -n "health:" bootstrap/app.php
```

Esperado: `routes/api.php` agrega os domínios por `glob(app_path('Domains/*/routes.php'))` — todas sob o prefixo `api/`; `routes/web.php` declara apenas `/`; `bootstrap/app.php` declara `health: '/up'`. Fora disso, só `/sanctum/csrf-cookie`, do próprio Sanctum. **Se aparecer rota de topo nova, o `location` do Step 2 precisa incluí-la antes de seguir.**

- [ ] **Step 2: Escrever a conf**

```nginx
# Origem única (spec D2): este servidor entrega o SPA e a API no MESMO host.
# Com isso o SPA fala por caminho relativo, `VITE_API_URL` sai vazio do build e
# a imagem deixa de carregar a URL do ambiente — que é o que permite ao bloco de
# CI/CD promover a MESMA imagem por SHA. Efeito colateral desejado: nenhuma
# requisição do SPA é cross-origin, então CORS deixa de participar.
server {
    listen 80;
    server_name _;

    root /usr/share/nginx/html;
    index index.html;

    # Teto de transporte com folga sobre o limite lógico de 10 MB (spec D2 da
    # certificação): o envelope multipart soma boundary e headers ao arquivo.
    # Igualar os dois faria o nginx cortar um arquivo de exatos 10 MB com 413 —
    # resposta que não passa pelo Laravel, logo sem envelope RFC 7807.
    client_max_body_size 12m;

    # As TRÊS entradas do backend, medidas e não supostas: todas as rotas de
    # domínio entram sob `api/` (routes/api.php agrega por glob), `/sanctum`
    # é do próprio Sanctum e `/up` é o health do bootstrap/app.php.
    location ~ ^/(api|sanctum|up)(/|$) {
        fastcgi_pass app:9000;
        include fastcgi_params;

        # Front-controller FIXO. É esta linha que permite ao container do nginx
        # NÃO ter a árvore PHP: ele nunca resolve um caminho de arquivo, só
        # nomeia o índice que o container `app` já tem.
        fastcgi_param SCRIPT_FILENAME /var/www/public/index.php;
        fastcgi_param SCRIPT_NAME /index.php;

        # 120s espelha o timeout do axios (shared/api/axios.ts:39), que é largo
        # por causa do upload de documento. Um teto menor aqui cortaria em 504
        # exatamente a requisição que o cliente ainda está esperando.
        fastcgi_read_timeout 120s;
    }

    # Tudo o mais é o SPA. O fallback para /index.html é o que faz rota de
    # cliente (ex.: /validar/:uuid, pública) sobreviver a um F5.
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

- [ ] **Step 3: Provar que a sintaxe é válida antes de existir imagem**

```bash
cd /home/jvbat/projetos/lotus-infra
docker run --rm -v "$PWD/docker/nginx/prod.conf:/etc/nginx/conf.d/default.conf:ro" nginx:alpine nginx -t
```

Esperado: `syntax is ok` e `test is successful`.

- [ ] **Step 4: Commit**

```bash
git add docker/nginx/prod.conf
git commit -m "feat(infra): nginx de producao com origem unica para SPA e API"
```

---

### Task 4: A imagem — quatro estágios, duas saídas

**Files:**
- Create: `docker/Dockerfile.prod`
- Create: `docker/php/entrypoint.sh`
- Create: `docker/php/opcache.ini`
- Create: `.dockerignore`

**Interfaces:**
- Consumes: `docker/php/memory-cli.ini` (Task 1), `docker/php/www.conf` (Task 2), `docker/nginx/prod.conf` (Task 3).
- Produces: dois alvos de build — `--target app` (PHP-FPM, `ENTRYPOINT entrypoint`, `CMD php-fpm`) e `--target web` (Nginx + SPA). A Task 5 os consome pelo `build.target` do Compose.

- [ ] **Step 1: `.dockerignore` primeiro — é ele que sustenta a prova 8 da DoD**

Sem este arquivo, um `.env` de desenvolvimento presente na árvore entraria na imagem pelo `COPY`. Crie `.dockerignore` na raiz:

```gitignore
# O que NUNCA pode entrar na imagem. A primeira linha é a que sustenta o item 8
# da DoD (imagem sem segredo): o `.env` não é versionado, mas existe na árvore
# de quem builda, e um COPY o levaria para dentro da camada.
**/.env
**/.env.*

# Dependências e artefatos: os estágios `vendor` e `spa` os produzem de novo,
# do lockfile. Copiar os do host tornaria a imagem dependente da máquina que
# buildou — o oposto do artefato reproduzível.
backend/vendor
frontend/node_modules
frontend/dist

# Nada disto roda em produção.
.git
.claude
.agents
.codex
docs
backend/storage/logs
backend/storage/framework/cache
```

- [ ] **Step 2: Medir se `poppler-utils` tem consumidor no código, antes de decidir se ele entra**

O Dockerfile de dev instala `poppler-utils` por causa da inspeção visual de PDF do `CLAUDE.md` §6,
que é ferramenta de desenvolvimento. A pergunta é se algum código de aplicação o invoca:

```bash
cd /home/jvbat/projetos/lotus-infra
grep -rnE "pdftoppm|pdfinfo|pdftotext|poppler" backend/app backend/config || echo "SEM CONSUMIDOR"
```

Se imprimir `SEM CONSUMIDOR`, o pacote **não** entra na imagem de produção (é o ramo esperado, e o
Step 4 já está escrito assim). Se aparecer chamada real, acrescente `poppler-utils` ao `apk add` do
estágio `app` e registre o sítio encontrado na seção de medições da Task 7.

- [ ] **Step 3: Escrever o entrypoint**

Crie `docker/php/entrypoint.sh`:

```sh
#!/bin/sh
# Entrypoint do container `app` em produção.
#
# Duas responsabilidades, e nenhuma terceira: falhar cedo quando falta
# configuração, e aquecer os caches que dependem de env. `migrate` NÃO mora
# aqui (spec D7) — o fluxo de deploy é `compose pull → migrate → up`, e migrar
# no arranque faria containers do mesmo serviço competirem pela migração.
set -e

for var in APP_KEY APP_URL DB_HOST DB_DATABASE DB_USERNAME DB_PASSWORD; do
    eval value="\$$var"
    if [ -z "$value" ]; then
        echo "entrypoint: variável obrigatória ausente: $var" >&2
        exit 1
    fi
done

# No BOOT e não no build (spec D8): cachear durante o build congelaria as
# variáveis do estágio de build dentro da imagem, e a mesma imagem precisa
# servir qualquer ambiente.
php artisan config:cache
php artisan route:cache
php artisan view:cache

exec "$@"
```

- [ ] **Step 4: Escrever a conf do opcache**

Crie `docker/php/opcache.ini`:

```ini
; Opcache de produção. `validate_timestamps=0` é seguro AQUI e não seria em dev:
; o código é copiado para dentro da imagem e não muda enquanto o container vive,
; então revalidar o mtime de cada arquivo a cada request seria trabalho puro.
; Um deploy troca o container inteiro, o que invalida o cache por construção.
opcache.enable = 1
opcache.validate_timestamps = 0
opcache.memory_consumption = 128
opcache.max_accelerated_files = 20000
```

- [ ] **Step 5: Escrever o Dockerfile**

Crie `docker/Dockerfile.prod`:

```dockerfile
# syntax=docker/dockerfile:1

# ── vendor ────────────────────────────────────────────────────────────────────
FROM composer:2 AS vendor
WORKDIR /app
COPY backend/composer.json backend/composer.lock ./
RUN composer install --no-dev --no-scripts --no-autoloader --prefer-dist --no-interaction
COPY backend/ ./
RUN composer dump-autoload --optimize --classmap-authoritative --no-dev

# ── spa ───────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS spa
WORKDIR /spa
# pnpm por versão exata (host mede 11.22.0) e não por corepack: o package.json
# não declara `packageManager`, então corepack não teria de onde resolver.
RUN npm install -g pnpm@11.22.0
COPY frontend/package.json frontend/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY frontend/ ./
# VAZIO de propósito (spec D2): com origem única o axios usa caminho relativo,
# e é isso que mantém a imagem agnóstica de ambiente.
ENV VITE_API_URL=""
RUN pnpm build

# ── app ───────────────────────────────────────────────────────────────────────
FROM php:8.3-fpm-alpine AS app
RUN apk add --no-cache libzip-dev icu-dev oniguruma-dev libpng-dev \
 && docker-php-ext-install pdo_mysql gd zip intl bcmath opcache

COPY docker/php/uploads.ini /usr/local/etc/php/conf.d/zz-uploads.ini
COPY docker/php/memory-cli.ini /usr/local/etc/php/conf.d/zz-memory-cli.ini
COPY docker/php/opcache.ini /usr/local/etc/php/conf.d/zz-opcache.ini
COPY docker/php/www.conf /usr/local/etc/php-fpm.d/zz-www.conf
COPY docker/php/entrypoint.sh /usr/local/bin/entrypoint

RUN addgroup -g 1000 appuser && adduser -D -u 1000 -G appuser appuser
WORKDIR /var/www
# Código COPIADO, nunca montado — é a metade "não depende do working tree do
# servidor" da DoD do item 10.
COPY --from=vendor --chown=appuser:appuser /app /var/www
RUN chmod +x /usr/local/bin/entrypoint \
 && chown -R appuser:appuser /var/www/storage /var/www/bootstrap/cache
USER appuser
ENTRYPOINT ["entrypoint"]
CMD ["php-fpm"]

# ── web ───────────────────────────────────────────────────────────────────────
FROM nginx:alpine AS web
COPY docker/nginx/prod.conf /etc/nginx/conf.d/default.conf
COPY --from=spa /spa/dist /usr/share/nginx/html
```

- [ ] **Step 6: Build das duas imagens, do zero**

```bash
cd /home/jvbat/projetos/lotus-infra
docker build --no-cache -f docker/Dockerfile.prod --target app -t lotus-app:local .
docker build -f docker/Dockerfile.prod --target web -t lotus-web:local .
```

Esperado: os dois builds terminam sem erro. O segundo reaproveita o cache do estágio `spa`.

- [ ] **Step 7: Provar as três propriedades da imagem que a DoD cobra**

```bash
docker run --rm lotus-app:local sh -c 'ls -a /var/www | grep -c "^\.env$" || echo "SEM ENV"'
docker run --rm lotus-app:local php -i | grep -E "^memory_limit|^opcache.validate_timestamps"
docker run --rm lotus-app:local sh -c 'php-fpm -tt 2>&1 | grep memory_limit'
docker run --rm lotus-app:local whoami
docker run --rm lotus-web:local ls /usr/share/nginx/html/index.html
```

Esperado: `SEM ENV`; `memory_limit` com o valor do CLI (Task 1) e `opcache.validate_timestamps => 0 => 0`; o dump do pool mostrando o valor do FPM (Task 2), **diferente** do anterior; `appuser`; e o `index.html` do SPA presente.

- [ ] **Step 8: Commit**

```bash
git add .dockerignore docker/Dockerfile.prod docker/php/entrypoint.sh docker/php/opcache.ini
git commit -m "feat(infra): imagem multi-stage de producao, app e web em quatro estagios"
```

---

### Task 5: `docker-compose.prod.yml` e a catraca que o guarda

**Files:**
- Create: `docker-compose.prod.yml`
- Create: `frontend/tests/compose-prod.test.ts`

**Interfaces:**
- Consumes: os alvos `app` e `web` da Task 4.
- Produces: os serviços `app`, `nginx` e `gotenberg`, e as variáveis de gancho `LOTUS_IMAGE`, `LOTUS_WEB_IMAGE`, `LOTUS_ENV_FILE` e `LOTUS_HTTP_PORT`, que a Task 6 usa para a prova local e o bloco de CI/CD usará para promover por SHA.

- [ ] **Step 1: Escrever a catraca ANTES do arquivo**

`frontend/tests/` é o único runner do projeto com acesso à raiz (o container `app` monta só `./backend` e `./frontend`). Crie `frontend/tests/compose-prod.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

/**
 * O compose de produção tem duas propriedades que build, lint e suíte não veem,
 * e cuja violação é silenciosa: um serviço de dev que reaparece e um volume de
 * código que volta. As duas negam a DoD do bloco ("sem MySQL/MinIO/Mailpit de
 * dev em produção", "não depende do working tree do servidor") sem quebrar
 * nada — o `docker compose up` fica verde dos dois jeitos.
 *
 * A conferência é TEXTUAL de propósito: o projeto não tem parser de YAML, e
 * acrescentar dependência de runtime ao frontend por causa de arquivo de infra
 * seria acoplamento na direção errada. O custo está declarado: um serviço
 * escrito em fluxo YAML (`{mysql: ...}`) escaparia. Ninguém escreve compose
 * assim aqui, e a alternativa custava uma dependência nova.
 */
const RAIZ = resolve(__dirname, '..', '..')
const PROD = readFileSync(join(RAIZ, 'docker-compose.prod.yml'), 'utf8')

const SERVICOS_DE_DEV = ['mysql', 'minio', 'createbuckets', 'mailpit']

describe('docker-compose.prod.yml', () => {
  it.each(SERVICOS_DE_DEV)('não declara o serviço de dev %s', (servico) => {
    expect(PROD).not.toMatch(new RegExp(`^\\s{2}${servico}:`, 'm'))
  })

  it('não monta o working tree em serviço nenhum', () => {
    expect(PROD).not.toMatch(/-\s*\.\/(backend|frontend)/)
  })

  it('lê os segredos de um env_file, nunca de valores inline', () => {
    expect(PROD).toMatch(/env_file:/)
  })

  it('deixa a imagem trocável por variável, que é o gancho da promoção por SHA', () => {
    expect(PROD).toMatch(/\$\{LOTUS_IMAGE/)
    expect(PROD).toMatch(/\$\{LOTUS_WEB_IMAGE/)
  })

  it('mantém o Gotenberg, que o ADR-12 exige', () => {
    expect(PROD).toMatch(/^\s{2}gotenberg:/m)
  })
})
```

O `describe` do overlay entra na Task 6, junto com o arquivo que ele mede — escrevê-lo aqui deixaria
esta task terminando com a suíte vermelha por um arquivo que ela não é responsável por criar.

- [ ] **Step 2: Rodar e ver reprovar pelo motivo certo**

```bash
cd /home/jvbat/projetos/lotus-infra/frontend
pnpm test compose-prod 2>&1 | tail -20
```

Esperado: FALHA com `ENOENT` em `docker-compose.prod.yml` — o arquivo ainda não existe. É a reprova esperada; o overlay da Task 6 fará o segundo `describe` continuar vermelho até lá.

- [ ] **Step 3: Escrever o compose de produção**

Crie `docker-compose.prod.yml`:

```yaml
# Runtime de PRODUÇÃO. O compose de dev (docker-compose.yml) continua existindo
# e não é tocado: são arquivos com públicos diferentes.
#
# O que este arquivo NÃO tem é tão deliberado quanto o que ele tem — sem MySQL
# (RDS), sem MinIO (S3), sem Mailpit (SES), sem volume de código e sem worker de
# fila. O último foi medido, não suposto: SESSION_DRIVER, CACHE_STORE e
# QUEUE_CONNECTION são `database`, e nenhuma classe implementa ShouldQueue.
services:
  app:
    image: ${LOTUS_IMAGE:-lotus-app:local}
    build:
      context: .
      dockerfile: docker/Dockerfile.prod
      target: app
    # Os segredos vivem SÓ no servidor (spec D6). O default aponta para o
    # caminho de produção; a prova local sobrescreve a variável.
    env_file: ${LOTUS_ENV_FILE:-/opt/lotus/.env}
    restart: unless-stopped
    depends_on: [gotenberg]

  nginx:
    image: ${LOTUS_WEB_IMAGE:-lotus-web:local}
    build:
      context: .
      dockerfile: docker/Dockerfile.prod
      target: web
    ports: ["${LOTUS_HTTP_PORT:-80}:80"]
    restart: unless-stopped
    depends_on: [app]
    # O healthcheck atravessa o fastcgi até o /up do Laravel, então prova a
    # CADEIA inteira — nginx, socket do FPM e boot da aplicação. É por isso que
    # o serviço `app` não ganha healthcheck próprio: um que respondesse sem
    # passar pelo nginx provaria menos.
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost/up"]
      interval: 15s
      timeout: 5s
      retries: 5
      start_period: 30s

  gotenberg:
    image: gotenberg/gotenberg:8
    restart: unless-stopped
```

- [ ] **Step 4: Medir se o Gotenberg pode ganhar healthcheck, em vez de supor**

```bash
docker run --rm --entrypoint sh gotenberg/gotenberg:8 -c 'command -v curl || command -v wget || echo SEM SONDA'
```

Se imprimir um caminho, acrescente ao serviço `gotenberg` (ajustando o binário encontrado):

```yaml
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 5s
      retries: 3
```

Se imprimir `SEM SONDA`, **não invente healthcheck** — acrescente ao arquivo o comentário abaixo, acima do serviço:

```yaml
  # Sem healthcheck: a imagem de terceiro não traz curl nem wget, e um teste que
  # não pode rodar é pior que a ausência dele. Medido nesta task.
```

- [ ] **Step 5: Validar a composição**

```bash
cd /home/jvbat/projetos/lotus-infra
LOTUS_ENV_FILE=backend/.env.example docker compose -f docker-compose.prod.yml config >/dev/null && echo "COMPOSE OK"
```

Esperado: `COMPOSE OK`.

- [ ] **Step 6: Commit**

```bash
git add docker-compose.prod.yml frontend/tests/compose-prod.test.ts
git commit -m "feat(infra): compose de producao com tres servicos e catraca de composicao"
```

---

### Task 6: Overlay de sonda, `.env.production.example` e a stack de pé

**Files:**
- Create: `docker-compose.prod-probe.yml`
- Create: `backend/.env.production.example`
- Create: `docker/probe.env`

**Interfaces:**
- Consumes: `docker-compose.prod.yml` (Task 5) e as duas imagens (Task 4).
- Produces: a stack local completa, sobre a qual a Task 7 prova a DoD.

- [ ] **Step 1: Escrever o exemplo de produção, com todo valor vazio**

Crie `backend/.env.production.example` a partir das chaves reais de `backend/.env.example` (leia o arquivo; não invente chave). Toda chave presente, **todo segredo vazio**:

```dotenv
# Molde do .env de PRODUÇÃO. Este arquivo é versionado e NÃO carrega valor
# sensível: o arquivo real vive só no servidor, em /opt/lotus/.env, com
# chmod 600 (spec D6). Chave vazia aqui é intencional — o entrypoint recusa
# subir sem as obrigatórias, então falta de valor vira falha imediata e não
# comportamento estranho meia hora depois.
APP_NAME=Lotus
APP_ENV=production
APP_KEY=
APP_DEBUG=false
APP_URL=

# stderr e não `stack`: em produção quem coleta é o Docker, e log em arquivo
# exigiria volume só para não se perder.
LOG_CHANNEL=stderr
LOG_LEVEL=warning

# RDS — nunca um container (ADR-09).
DB_CONNECTION=mysql
DB_HOST=
DB_PORT=3306
DB_DATABASE=
DB_USERNAME=
DB_PASSWORD=

# Os três em `database` é medição do repositório, não default herdado: é o que
# dispensa volume de sessão, volume de cache e worker de fila.
SESSION_DRIVER=database
SESSION_DOMAIN=
CACHE_STORE=database
QUEUE_CONNECTION=database

# Origem única (spec D2): SPA e API no mesmo host. FRONTEND_URL e
# SANCTUM_STATEFUL_DOMAINS descrevem esse host único.
FRONTEND_URL=
SANCTUM_STATEFUL_DOMAINS=

# S3 real: sem AWS_ENDPOINT (aquilo é MinIO de dev) e sem path-style.
FILESYSTEM_DISK=s3
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_DEFAULT_REGION=
AWS_BUCKET=
AWS_URL=

MAIL_MAILER=smtp
MAIL_HOST=
MAIL_PORT=587
MAIL_USERNAME=
MAIL_PASSWORD=
MAIL_FROM_ADDRESS=
MAIL_FROM_NAME=Lotus
```

Confira contra o arquivo real e acrescente o que faltar:

```bash
cd /home/jvbat/projetos/lotus-infra/backend
diff <(grep -oE "^[A-Z_]+" .env.example | sort -u) <(grep -oE "^[A-Z_]+" .env.production.example | sort -u)
```

Toda chave que aparecer só à esquerda: decida **explicitamente** se entra (acrescente) ou se é de dev (registre o motivo no comentário do arquivo). Não deixe chave passar em silêncio.

- [ ] **Step 2: Escrever o env da sonda**

`docker/probe.env` é o `.env` **da prova local**, com valores de sonda — não é segredo e por isso pode ser versionado:

```dotenv
# Valores de SONDA. Este arquivo existe para a prova local do runtime de
# produção e aponta para os serviços do overlay (MySQL, MinIO e Mailpit), não
# para AWS. Nada aqui é segredo: as credenciais são as mesmas públicas do
# compose de desenvolvimento.
APP_NAME=Lotus
APP_ENV=production
APP_KEY=base64:PREENCHER_NO_STEP_3
APP_DEBUG=false
APP_URL=http://localhost:8081

LOG_CHANNEL=stderr
LOG_LEVEL=debug

DB_CONNECTION=mysql
DB_HOST=mysql
DB_PORT=3306
DB_DATABASE=lotus
DB_USERNAME=root
DB_PASSWORD=secret

SESSION_DRIVER=database
SESSION_DOMAIN=localhost
CACHE_STORE=database
QUEUE_CONNECTION=database

FRONTEND_URL=http://localhost:8081
SANCTUM_STATEFUL_DOMAINS=localhost:8081

FILESYSTEM_DISK=s3
AWS_ACCESS_KEY_ID=lotus
AWS_SECRET_ACCESS_KEY=lotus-secret
AWS_DEFAULT_REGION=us-east-1
AWS_BUCKET=lotus
AWS_ENDPOINT=http://minio:9000
AWS_ENDPOINT_PUBLIC=http://localhost:9002
AWS_URL=http://localhost:9002/lotus
AWS_USE_PATH_STYLE_ENDPOINT=true

MAIL_MAILER=smtp
MAIL_HOST=mailpit
MAIL_PORT=1025
MAIL_FROM_ADDRESS=lotus@lotus.cl
MAIL_FROM_NAME=Lotus
```

- [ ] **Step 3: Gerar a `APP_KEY` da sonda**

```bash
cd /home/jvbat/projetos/lotus-infra
docker run --rm lotus-app:local php artisan key:generate --show
```

Copie a saída (`base64:...`) para `APP_KEY` em `docker/probe.env`.

- [ ] **Step 4: Escrever o overlay**

Crie `docker-compose.prod-probe.yml`:

```yaml
# Overlay de SONDA. Existe só para provar o runtime de produção nesta máquina:
# acrescenta os três serviços que produção NÃO tem, porque lá eles são RDS, S3 e
# SES. Arquivo separado e não `profiles:` de propósito (spec D4) — assim o
# arquivo que vai ao servidor nunca carrega a definição de um MySQL de dev, e o
# que ele não tem fica visível no diff.
#
# Uso:
#   LOTUS_ENV_FILE=./docker/probe.env LOTUS_HTTP_PORT=8081 \
#     docker compose -f docker-compose.prod.yml -f docker-compose.prod-probe.yml up -d
services:
  app:
    depends_on: [gotenberg, mysql, minio]

  mysql:
    image: mysql:8.0
    environment:
      MYSQL_DATABASE: lotus
      MYSQL_ROOT_PASSWORD: secret
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-psecret"]
      interval: 10s
      retries: 5

  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: lotus
      MINIO_ROOT_PASSWORD: lotus-secret
    # 9002 no host para não brigar com o MinIO do compose de dev, que já ocupa
    # 9000/9001 nesta máquina.
    ports: ["9002:9000"]

  createbuckets:
    image: minio/mc
    depends_on: [minio]
    entrypoint: >
      /bin/sh -c "
      until (/usr/bin/mc alias set local http://minio:9000 lotus lotus-secret) do echo waiting for minio; sleep 2; done;
      /usr/bin/mc mb -p local/lotus;
      exit 0;
      "

  mailpit:
    image: axllent/mailpit
    ports: ["8026:8025"]
```

- [ ] **Step 5: Subir a stack e provar o healthcheck**

```bash
cd /home/jvbat/projetos/lotus-infra
export LOTUS_ENV_FILE=./docker/probe.env LOTUS_HTTP_PORT=8081
docker compose -f docker-compose.prod.yml -f docker-compose.prod-probe.yml up -d
docker compose -f docker-compose.prod.yml -f docker-compose.prod-probe.yml exec -T app php artisan migrate --force
sleep 40
docker compose -f docker-compose.prod.yml -f docker-compose.prod-probe.yml ps --format '{{.Service}} {{.Status}}'
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8081/up
```

Esperado: o serviço `nginx` em `(healthy)` e o `curl` devolvendo **200**.

- [ ] **Step 6: Acrescentar o `describe` do overlay à catraca**

Ao final de `frontend/tests/compose-prod.test.ts`, acrescente:

```ts
describe('docker-compose.prod-probe.yml', () => {
  const PROBE = readFileSync(join(RAIZ, 'docker-compose.prod-probe.yml'), 'utf8')

  it.each(SERVICOS_DE_DEV)('acrescenta %s, que só existe para a prova local', (servico) => {
    expect(PROBE).toMatch(new RegExp(`^\\s{2}${servico}:`, 'm'))
  })

  it('não redefine env_file: a prova troca o arquivo pela variável LOTUS_ENV_FILE', () => {
    expect(PROBE).not.toMatch(/env_file:/)
  })
})
```

O segundo caso guarda uma armadilha real: a semântica de merge de `env_file` entre dois arquivos de
Compose não é a mesma de `ports` e `volumes`, e sobrescrever ali daria um resultado que depende da
versão do Compose. Por isso a prova troca o arquivo pela variável, e a catraca impede que alguém
"simplifique" de volta.

- [ ] **Step 7: Rodar a catraca inteira, agora verde**

```bash
cd /home/jvbat/projetos/lotus-infra/frontend
pnpm test compose-prod 2>&1 | tail -10
```

Esperado: todos os testes dos dois `describe` passando.

- [ ] **Step 8: Commit**

```bash
cd /home/jvbat/projetos/lotus-infra
git add docker-compose.prod-probe.yml backend/.env.production.example docker/probe.env frontend/tests/compose-prod.test.ts
git commit -m "feat(infra): overlay de sonda e molde de env de producao"
```

---

### Task 7: DoD end-to-end e gate do bloco

**Files:**
- Modify: `docs/superpowers/specs/2026-08-22-infra-producao-runtime-e-aws-design.md` (seção nova `## 10. Medições da execução`)
- Modify: `docs/superpowers/state.md`

**Interfaces:**
- Consumes: a stack de pé da Task 6.

- [ ] **Step 1: Prova 3 — origem única, com o cookie e sem CORS**

Com a stack no ar em `http://localhost:8081`, abra o navegador, faça login com uma conta de admin do seed e, no DevTools:

```
Network → /api/login → Headers
```

Esperado, os três juntos: a requisição sai para `http://localhost:8081/api/login` (**mesma origem**, não `:8080`); a resposta grava o cookie de sessão; e **não existe** header `Access-Control-Allow-Origin`. A ausência dele é a prova de que a origem é única de fato — com dois hosts ele seria obrigatório.

- [ ] **Step 2: Prova 4 — o working tree não alcança o container**

```bash
cd /home/jvbat/projetos/lotus-infra
docker compose -f docker-compose.prod.yml -f docker-compose.prod-probe.yml exec -T app grep -c "SONDA_BIND_MOUNT" /var/www/public/index.php || echo "AUSENTE ANTES"
printf '\n// SONDA_BIND_MOUNT\n' >> backend/public/index.php
docker compose -f docker-compose.prod.yml -f docker-compose.prod-probe.yml exec -T app grep -c "SONDA_BIND_MOUNT" /var/www/public/index.php || echo "AUSENTE DEPOIS"
git checkout -- backend/public/index.php
```

Esperado: `AUSENTE ANTES` **e** `AUSENTE DEPOIS`. Se a segunda linha achar a sonda, existe bind mount e a DoD está negada.

- [ ] **Step 3: Prova 5 — `APP_DEBUG=false` não vaza stack trace**

```bash
curl -s -H "Accept: application/json" http://localhost:8081/api/turmas/999999 | head -c 400
```

Esperado: envelope RFC 7807 (`type`, `title`, `status`, `detail`), **sem** `trace`, sem `file` e sem caminho absoluto do servidor.

- [ ] **Step 4: Prova 6 — storage e SMTP externos, por configuração**

Pelo navegador, na stack de sonda: emita um certificado de uma matrícula concluída e abra o PDF; depois reenvie o convite de acesso de um redator.

```bash
docker run --rm --network container:$(docker compose -f docker-compose.prod.yml -f docker-compose.prod-probe.yml ps -q minio) \
  minio/mc sh -c "mc alias set p http://localhost:9000 lotus lotus-secret >/dev/null && mc ls -r p/lotus | tail -5"
curl -s http://localhost:8026/api/v1/messages | head -c 300
```

Esperado: o PDF do certificado listado no bucket, e a mensagem de convite presente no Mailpit. É a prova de que a app fala com storage e SMTP **externos por env** — o mecanismo que S3 e SES vão usar, não os serviços em si.

- [ ] **Step 5: Prova 8 — a imagem não carrega segredo**

```bash
docker run --rm lotus-app:local sh -c 'find /var/www -maxdepth 2 -name ".env*" | wc -l'
docker history --no-trunc lotus-app:local | grep -ciE "APP_KEY|SECRET|PASSWORD" || echo "SEM SEGREDO NO HISTORICO"
```

Esperado: `0` arquivos `.env` na imagem, e `SEM SEGREDO NO HISTORICO`.

- [ ] **Step 6: Gate do bloco**

```bash
cd /home/jvbat/projetos/lotus-infra/frontend
pnpm lint && pnpm build && pnpm test 2>&1 | tail -8
cd /home/jvbat/projetos/lotus-infra
docker compose exec -T app php artisan test 2>&1 | tail -5
git diff --name-only main...HEAD -- backend/app frontend/src/shared/types/generated.ts
```

Esperado: lint exit 0, build verde, a suíte do frontend verde com os testes novos de `compose-prod`, e o `php artisan test` **pelo comando documentado** fechando verde (é a P-50 paga). O `git diff` deve devolver **zero arquivo** — o que torna Pint e `typescript:transform` N/A **por medição**, não por suposição. Se devolver arquivo, rode os dois.

- [ ] **Step 7: Devolver o ambiente ao estado anterior**

```bash
cd /home/jvbat/projetos/lotus-infra
docker compose -f docker-compose.prod.yml -f docker-compose.prod-probe.yml down -v
docker compose ps --format '{{.Service}} {{.Status}}'
git status --short
```

Esperado: a stack de sonda derrubada com os volumes dela, o compose de dev intacto e a árvore limpa. A P-44 existe por gates que esqueceram o próprio rastro.

- [ ] **Step 8: Registrar as medições na spec e fechar o estado**

Acrescente à spec uma seção `## 10. Medições da execução` com: os dois picos medidos (CLI e FPM), os dois valores derivados, o resultado da medição do `poppler-utils` (§3 da spec), a decisão sobre o healthcheck do Gotenberg e qualquer desvio deste plano com o motivo. Em `state.md`, transicione para `ready_for_review`.

- [ ] **Step 9: Commit**

```bash
git add docs/superpowers/specs/2026-08-22-infra-producao-runtime-e-aws-design.md docs/superpowers/state.md
git commit -m "docs(state): runtime de producao provado end-to-end, bloco em ready_for_review"
```

---

## Handoff de execução

**executor: claude**

O bloco não é mecânico com paths fechados. Três razões, cada uma medida:

1. **Dois números do plano são resultado de medição, não valor escrito** — os `memory_limit` do CLI e do FPM saem de picos observados nas Tasks 1 e 2, e a regra de derivação precisa de julgamento se o pico vier fora da faixa esperada.
2. **A Task 2 instala e reverte um patch em `backend/public/index.php`**, arquivo de peso operacional. Um executor com paths fechados ou erraria a reversão ou não teria autorização para tocá-lo.
3. **Três passos decidem por medição em vez de seguir instrução** — o healthcheck do Gotenberg (Task 5, Step 4), a entrada ou não do `poppler-utils` na imagem (Task 4) e o diff de chaves entre os dois `.env.example` (Task 6, Step 1). Cada um pode terminar em qualquer dos dois ramos.

A DoD depende de navegador contra a API real (provas 3, 4 e 6), que é trabalho de sessão com contexto, não de execução delegada.
