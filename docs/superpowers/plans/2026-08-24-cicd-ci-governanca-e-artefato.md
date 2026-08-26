# CI de Governança e Artefato Imutável — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** um commit reprovado não gera release promovível; um commit aprovado gera o par de imagens de produção etiquetado pelo SHA completo.

**Architecture:** um único `.github/workflows/ci.yml`, dono-agnóstico (nenhum nome de repositório no YAML), com cinco jobs de correção e um job de publicação condicionado a `push` em `main`. O bloco se prova em duas fatias: a fatia 1 constrói e prova tudo em `Andred21/lotus`; a fatia 2 cria `Gatika-CL/lotus`, empurra, e trava branch protection lida de volta pela API.

**Tech Stack:** GitHub Actions · `shivammathur/setup-php@v2` · `pnpm/action-setup@v4` · `docker/build-push-action@v6` com cache `type=gha` · GHCR autenticado por `GITHUB_TOKEN`.

**Spec:** `docs/superpowers/specs/2026-08-24-cicd-ci-governanca-e-artefato-design.md`
**Context packet:** `docs/superpowers/context-packets/2026-08-24-cicd-ci-governanca-e-artefato.md`

## Global Constraints

Valores medidos nesta árvore em 2026-08-24. Copiados exatos; não re-derivar.

- **PHP 8.3** — `backend/composer.json:9` exige `^8.3`; o container mede `PHP 8.3.33`.
- **Extensões PHP na CI:** `mbstring, gd, zip, intl, bcmath, pdo_sqlite, sqlite3`. As quatro primeiras espelham `docker/Dockerfile.prod:47` (`pdo_mysql gd zip intl bcmath opcache`); `pdo_mysql` e `opcache` não entram porque a suíte usa sqlite e opcache não muda resultado de teste.
- **Node 22** — host mede `v22.23.1`; `docker/Dockerfile.prod:23` usa `node:22-alpine`.
- **pnpm 11.23.0** — versão do host, que é quem escreve o `pnpm-lock.yaml`. Vira `packageManager` na Task 1 e passa a ser a única fonte.
- **Banco da CI:** `sqlite` / `:memory:`, já fixado em `backend/phpunit.xml:26-27`. **Nenhum serviço MySQL na CI.**
- **Sem secret novo.** Só `GITHUB_TOKEN` com `packages: write`.
- **Sem tag `latest`.** Só o SHA completo (`github.sha`), nos dois artefatos.
- **GHCR exige minúsculas.** `github.repository` é `Andred21/lotus` — com maiúscula. Todo nome de imagem passa por conversão explícita; usar `${{ github.repository }}` cru no `tags:` **falha o push**.
- **Nomes de job são contrato.** `backend`, `frontend`, `types-drift`, `audit-prod` viram required checks na Task 9. Renomear job depois exige reconfigurar protection.

## Mapa de arquivos

| Arquivo | Responsabilidade | Task |
|---|---|---|
| `frontend/package.json` | declara `packageManager` — fonte única da versão do pnpm | 1 |
| `docker/Dockerfile.prod` | estágio `spa` passa a ler a versão do `packageManager` em vez de fixá-la | 1 |
| `backend/composer.lock` | sobe `guzzle` e `commonmark` para versões sem advisory | 2 |
| `frontend/pnpm-lock.yaml` | sobe `react-router` para `>=7.18.2` | 3 |
| `.github/workflows/ci.yml` | o workflow inteiro — gates, drift, audits e publicação | 4–7 |
| `docs/superpowers/audits/2026-08-24-cicd-evidencias.md` | evidência datada da sonda D-08, do gate de publicação e do readback | 5, 8, 9 |

---

### Task 1: Fonte única da versão do pnpm

O `docker/Dockerfile.prod:23-26` fixa `pnpm@11.22.0` à mão e o comentário dele nomeia a causa: *"o package.json não declara `packageManager`, então corepack não teria de onde resolver."* O host mede `11.23.0`. A constante já está duplicada e já divergiu — e a CI seria o terceiro lugar a repeti-la. Esta task cria a fonte e faz os dois consumidores lerem dela.

**Files:**
- Modify: `frontend/package.json`
- Modify: `docker/Dockerfile.prod:22-31`

**Interfaces:**
- Consumes: nada.
- Produces: o campo `packageManager: "pnpm@11.23.0"` em `frontend/package.json`. As Tasks 4 e 6 o leem via `pnpm/action-setup@v4` com `package_json_file: frontend/package.json`; a Task 7 o lê via `corepack` dentro do build da imagem.

- [ ] **Step 1: Provar que o problema existe**

```bash
cd /home/jvbat/projetos/lotus-infra
pnpm --version                                   # host
grep -n 'pnpm@' docker/Dockerfile.prod           # imagem
grep -c 'packageManager' frontend/package.json   # fonte
```

Esperado: `11.23.0` no host, `pnpm@11.22.0` na linha 26 do Dockerfile, e `0` ocorrências de `packageManager`. Três lugares, duas versões, nenhuma fonte.

- [ ] **Step 2: Declarar a fonte**

Em `frontend/package.json`, logo após a linha `"type": "module",`, acrescentar:

```json
  "packageManager": "pnpm@11.23.0",
```

- [ ] **Step 3: Fazer a imagem ler a fonte**

Em `docker/Dockerfile.prod`, substituir o estágio `spa` (linhas 22-31) por:

```dockerfile
# ── spa ───────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS spa
WORKDIR /spa
# O package.json vem ANTES do corepack de propósito: `corepack prepare
# --activate` resolve a versão pelo campo `packageManager`, então o arquivo
# precisa existir para ele ler. Antes de 2026-08-24 esta linha fixava
# pnpm@11.22.0 à mão porque o campo não existia; ele existe agora, e a versão
# tem um dono só.
COPY frontend/package.json frontend/pnpm-lock.yaml ./
RUN corepack enable && corepack prepare --activate
RUN pnpm install --frozen-lockfile
COPY frontend/ ./
# VAZIO de propósito (spec D2): com origem única o axios usa caminho relativo,
# e é isso que mantém a imagem agnóstica de ambiente.
ENV VITE_API_URL=""
RUN pnpm build
```

- [ ] **Step 4: Provar que a imagem constrói e usa a versão declarada**

```bash
docker build -f docker/Dockerfile.prod --target spa -t lotus-spa:probe . 2>&1 | tail -20
docker run --rm --entrypoint pnpm lotus-spa:probe --version
```

Esperado: build sai `0`, e a última linha imprime `11.23.0` — a versão do `package.json`, não a que estava fixa no Dockerfile.

- [ ] **Step 5: Provar que o alvo `web` continua inteiro**

`docker/Dockerfile.prod:69` faz `COPY --from=spa /spa/dist /usr/share/nginx/html`. Trocar o
instalador do pnpm não pode ter quebrado a saída do build que alimenta esse `COPY`.

```bash
docker build -f docker/Dockerfile.prod --target web -t lotus-web:probe . 2>&1 | tail -5
docker run --rm --entrypoint ls lotus-web:probe /usr/share/nginx/html
```

Esperado: build sai `0` e a listagem mostra `index.html` e `assets`.

- [ ] **Step 6: Rodar a catraca de composição**

```bash
cd frontend && pnpm test -- compose-prod
```

Esperado: PASS. Esse teste guarda as propriedades do `docker-compose.prod.yml` cuja violação é silenciosa.

- [ ] **Step 7: Commit**

```bash
cd /home/jvbat/projetos/lotus-infra
git add frontend/package.json docker/Dockerfile.prod
git commit -m "build(pnpm): declara packageManager como fonte unica da versao

O estagio spa do Dockerfile.prod fixava pnpm@11.22.0 a mao e o proprio
comentario nomeava a causa -- o package.json nao declarava
packageManager. O host media 11.23.0: a constante ja estava duplicada e
ja tinha divergido, e a CI seria o terceiro lugar a repeti-la.

Agora o campo existe e os dois consumidores leem dele: a imagem por
corepack prepare --activate, e a CI por pnpm/action-setup."
```

---

### Task 2: Destravar o `composer audit --no-dev`

Medido em 2026-08-24: `12 security vulnerability advisories affecting 2 packages` — `guzzlehttp/guzzle` e `league/commonmark`. O job `audit-prod` da Task 6 reprova por desenho, então ele nasceria vermelho e o bloco não teria como fechar. Os dois sobem sem tocar `composer.json`.

**Files:**
- Modify: `backend/composer.lock`

**Interfaces:**
- Consumes: nada.
- Produces: `composer audit --no-dev` saindo `0`. A Task 6 depende disso.

- [ ] **Step 1: Registrar o vermelho de partida**

```bash
cd /home/jvbat/projetos/lotus-infra
docker compose up -d
docker compose exec -T app composer audit --no-dev --format=summary 2>&1 | tail -3
```

Esperado: `Found 12 security vulnerability advisories affecting 2 packages.`

- [ ] **Step 2: Conferir que a subida resolve sem mexer em `composer.json`**

```bash
docker compose exec -T app composer update guzzlehttp/guzzle league/commonmark -W --dry-run 2>&1 | grep -E "Upgrading|Problem"
```

Esperado, sem nenhuma linha `Problem`:

```
  - Upgrading guzzlehttp/guzzle (7.12.3 => 7.15.5)
  - Upgrading guzzlehttp/promises (2.5.0 => 2.5.3)
  - Upgrading guzzlehttp/psr7 (2.12.3 => 2.13.1)
  - Upgrading league/commonmark (2.8.2 => 2.10.0)
  - Upgrading nette/schema (v1.3.5 => v1.3.6)
  - Upgrading nette/utils (v4.1.4 => v4.1.5)
  - Upgrading symfony/deprecation-contracts (v3.7.0 => v3.7.1)
```

- [ ] **Step 3: Aplicar**

```bash
docker compose exec -T app composer update guzzlehttp/guzzle league/commonmark -W
```

- [ ] **Step 4: Provar que o audit ficou verde**

```bash
docker compose exec -T app composer audit --no-dev
```

Esperado: `No security vulnerability advisories found.` e exit `0`.

- [ ] **Step 5: Provar que a suíte não regrediu**

```bash
docker compose exec -T app php artisan test 2>&1 | tail -5
```

Esperado: a mesma contagem de antes da subida, sem falha nova. A referência do último fechamento é `867 passed / 5 skipped`; divergência para MENOS passa a ser achado a investigar, não a aceitar.

- [ ] **Step 6: Confirmar que `composer.json` não mudou**

```bash
git diff --stat -- backend/composer.json backend/composer.lock
```

Esperado: só `backend/composer.lock` aparece. Se `composer.json` mudou, `-W` alargou algo que não devia — reverter e investigar antes de seguir.

- [ ] **Step 7: Commit**

```bash
git add backend/composer.lock
git commit -m "fix(deps): sobe guzzle e commonmark para fora dos advisories

Medido em 2026-08-24: composer audit --no-dev acusava 12 advisories em
2 pacotes, entre eles um high de DoS em quadratico no commonmark
(CVE-2026-71488, corrigido em 2.9.0). O gate audit-prod reprova o que a
imagem de producao carrega, entao nasceria vermelho.

guzzle 7.12.3 => 7.15.5 e commonmark 2.8.2 => 2.10.0, resolvidos com -W.
composer.json intocado -- so o lock."
```

---

### Task 3: Destravar o `pnpm audit --prod`

Medido em 2026-08-24: um advisory `high` em `react-router` — *RSC Mode CSRF Bypass Allows Action Execution Before 400 Response* (`GHSA-qwww-vcr4-c8h2`), afetando `>=7.12.0 <7.18.2`. O lock tem `react-router@7.18.0` e o `package.json` já pede `^7.18.0`, então a correção cabe dentro da faixa declarada.

**Files:**
- Modify: `frontend/pnpm-lock.yaml`

**Interfaces:**
- Consumes: `packageManager` da Task 1 (a subida precisa rodar com a versão que é a fonte).
- Produces: `pnpm audit --prod` saindo `0`. A Task 6 depende disso.

- [ ] **Step 1: Registrar o vermelho de partida**

```bash
cd /home/jvbat/projetos/lotus-infra/frontend
pnpm audit --prod 2>&1 | tail -5
grep -n "react-router@" pnpm-lock.yaml | head -2
```

Esperado: `Severity: 1 high` e `react-router@7.18.0` no lock.

- [ ] **Step 2: Subir dentro da faixa**

```bash
pnpm update react-router-dom
grep -n "react-router@" pnpm-lock.yaml | head -2
```

Esperado: a versão no lock passa a ser `>= 7.18.2`.

- [ ] **Step 3: Provar que o audit ficou verde**

```bash
pnpm audit --prod
```

Esperado: `No known vulnerabilities found` e exit `0`.

- [ ] **Step 4: Provar que `package.json` não mudou**

```bash
cd /home/jvbat/projetos/lotus-infra
git diff --stat -- frontend/package.json frontend/pnpm-lock.yaml
```

Esperado: só `frontend/pnpm-lock.yaml`. A faixa `^7.18.0` já cobria a versão corrigida.

- [ ] **Step 5: Provar que o frontend não regrediu**

```bash
cd frontend
pnpm lint && pnpm test && pnpm build
```

Esperado: os três saem `0`. `react-router` é o roteador da aplicação inteira — se alguma rota quebrou, aparece no `pnpm test` ou no `tsc -b` do build.

- [ ] **Step 6: Commit**

```bash
cd /home/jvbat/projetos/lotus-infra
git add frontend/pnpm-lock.yaml
git commit -m "fix(deps): sobe react-router para fora do advisory de CSRF

GHSA-qwww-vcr4-c8h2, high: RSC Mode CSRF Bypass, afeta >=7.12.0 <7.18.2
e o lock tinha 7.18.0. A auth do Lotus e cookie de sessao Sanctum com
CSRF, entao a classe do advisory toca exatamente o transporte que a
aplicacao usa.

A faixa ^7.18.0 do package.json ja cobria a correcao -- so o lock muda."
```

---

### Task 4: O workflow e os dois gates de correção

Primeira metade do `ci.yml`: os jobs `backend` e `frontend`. Esta task também abre o **PR rascunho** que é o veículo de prova de todas as tasks seguintes — sem ele o workflow não dispara na branch, porque os gatilhos são `pull_request` para `main` e `push` em `main`.

**Files:**
- Create: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: `packageManager` da Task 1.
- Produces: o arquivo `.github/workflows/ci.yml` com o bloco `on:`, `permissions:`, `concurrency:` e os jobs `backend` e `frontend`. As Tasks 5, 6 e 7 acrescentam jobs a este mesmo arquivo, sem alterar o cabeçalho.

- [ ] **Step 1: Criar o workflow com os dois gates**

Criar `.github/workflows/ci.yml`:

```yaml
name: CI

# Branch nao dispara: as worktrees sao locais e o par PR+push duplicaria
# execucao sem informacao nova. O que dispara e o que decide -- a proposta
# de entrar em main, e a entrada em main.
on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

permissions:
  contents: read

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  backend:
    name: backend
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: shivammathur/setup-php@v2
        with:
          php-version: '8.3'
          extensions: mbstring, gd, zip, intl, bcmath, pdo_sqlite, sqlite3
          coverage: none

      - name: Cache do composer
        uses: actions/cache@v4
        with:
          path: ~/.cache/composer/files
          key: composer-${{ hashFiles('backend/composer.lock') }}
          restore-keys: composer-

      - name: Instala dependencias
        working-directory: backend
        run: composer install --no-interaction --prefer-dist --no-progress

      - name: Prepara o ambiente de teste
        working-directory: backend
        run: |
          cp .env.example .env
          php artisan key:generate

      # phpunit.xml ja fixa DB_CONNECTION=sqlite e DB_DATABASE=:memory:
      # (linhas 26-27), entao nenhum servico de banco sobe aqui.
      - name: Suite backend
        working-directory: backend
        run: php artisan test

  frontend:
    name: frontend
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      # Le a versao do campo packageManager de frontend/package.json --
      # a mesma fonte que o estagio spa da imagem de producao usa.
      - uses: pnpm/action-setup@v4
        with:
          package_json_file: frontend/package.json

      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: pnpm
          cache-dependency-path: frontend/pnpm-lock.yaml

      - name: Instala com o lockfile congelado
        working-directory: frontend
        run: pnpm install --frozen-lockfile

      - name: Lint
        working-directory: frontend
        run: pnpm lint

      - name: Testes
        working-directory: frontend
        run: pnpm test

      - name: Build
        working-directory: frontend
        run: pnpm build
```

- [ ] **Step 2: Validar o YAML antes de empurrar**

```bash
cd /home/jvbat/projetos/lotus-infra
python3 -c "import yaml,sys; yaml.safe_load(open('.github/workflows/ci.yml')); print('YAML OK')"
```

Esperado: `YAML OK`. Um erro de sintaxe aqui custa um ciclo de push inteiro para descobrir.

- [ ] **Step 3: Commit e empurrar a branch**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: gates de correcao do backend e do frontend

Um arquivo so, dono-agnostico -- nenhum nome de repositorio no YAML, o
dono sai de github.repository em tempo de execucao. Os gatilhos sao PR
para main e push em main; branch nao dispara porque as worktrees sao
locais e o par PR+push nao traria informacao nova.

O backend testa sem servico de banco: phpunit.xml ja fixa sqlite
:memory:. O frontend le a versao do pnpm do campo packageManager, a
mesma fonte que o estagio spa da imagem usa."
git push -u origin cicd/ci-governanca-e-artefato
```

- [ ] **Step 4: Abrir o PR rascunho — o veículo de prova**

```bash
gh pr create --draft --base main --head cicd/ci-governanca-e-artefato \
  --title "CI de governanca e artefato imutavel (item 11)" \
  --body "Rascunho: veiculo de prova da fatia 1. Cada push reexecuta o workflow. Nao mesclar antes da Task 8."
```

- [ ] **Step 5: Observar a primeira execução**

```bash
gh run watch --exit-status
```

Esperado: `backend` e `frontend` verdes. Se `backend` falhar em `key:generate`, ler o erro — a causa provável é `.env.example` ausente no checkout, e a correção é conferir o path real (`backend/.env.example` existe nesta árvore, medido em 2026-08-24).

- [ ] **Step 6: Registrar o tempo de cada job**

```bash
gh run list --branch cicd/ci-governanca-e-artefato --limit 1 --json databaseId --jq '.[0].databaseId' \
  | xargs -I{} gh run view {} --json jobs --jq '.jobs[] | "\(.name)\t\(.startedAt)\t\(.completedAt)"'
```

Guardar a saída: ela vira a linha "custo medido" do relatório da Task 9, e é o que justifica (ou desmente) o `image` ser condicional.

---

### Task 5: `types-drift` — o mecanismo da lei §5.3 (D-08)

O débito **D-08** exige mecanismo com sonda própria: *"editar `generated.ts` e ver o mecanismo reprovar nomeando o arquivo."* Hoje o único guardião é `globalIgnores` no `eslint.config.js:158`, que só tira o arquivo do corte do lint.

Medido em 2026-08-24: `typescript:transform` roda com `sqlite`/`:memory:`, sai `0`, e **não produz drift** na árvore atual — o gate nasce verde. O comando também cospe avisos sobre `Spatie\LaravelData\Optional` no stdout **e ainda assim sai 0**, então quem julga é `git diff --exit-code`, nunca o texto de saída.

**Files:**
- Modify: `.github/workflows/ci.yml`
- Create: `docs/superpowers/audits/2026-08-24-cicd-evidencias.md`

**Interfaces:**
- Consumes: o cabeçalho `on:`/`permissions:` da Task 4.
- Produces: um job chamado exatamente `types-drift`. A Task 7 o cita em `needs:`; a Task 9 o cita como required check.

- [ ] **Step 1: Acrescentar o job**

Ao final de `.github/workflows/ci.yml`, no mesmo nível de indentação de `frontend:`:

```yaml
  types-drift:
    name: types-drift
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: shivammathur/setup-php@v2
        with:
          php-version: '8.3'
          extensions: mbstring, gd, zip, intl, bcmath, pdo_sqlite, sqlite3
          coverage: none

      - name: Cache do composer
        uses: actions/cache@v4
        with:
          path: ~/.cache/composer/files
          key: composer-${{ hashFiles('backend/composer.lock') }}
          restore-keys: composer-

      - name: Instala dependencias
        working-directory: backend
        run: composer install --no-interaction --prefer-dist --no-progress

      - name: Prepara o ambiente
        working-directory: backend
        run: |
          cp .env.example .env
          php artisan key:generate

      # Medido 2026-08-24: o comando boota o Laravel mas nao toca o banco --
      # sqlite :memory: basta e nenhum servico MySQL sobe.
      - name: Regenera os tipos a partir dos DTOs
        working-directory: backend
        env:
          DB_CONNECTION: sqlite
          DB_DATABASE: ':memory:'
        run: php artisan typescript:transform

      # O comando acima imprime avisos sobre Spatie\LaravelData\Optional e
      # AINDA ASSIM sai 0 -- medido. Por isso quem julga e o diff, nunca o
      # texto da saida. O ::error com `file=` faz o GitHub nomear o arquivo
      # na interface, que e literalmente o que a ficha da D-08 exige.
      - name: Lei 5.3 - generated.ts nao se edita a mao
        run: |
          if ! git diff --exit-code -- frontend/src/shared/types/generated.ts; then
            echo "::error file=frontend/src/shared/types/generated.ts::generated.ts diverge do que typescript:transform produz. Corrija o DTO no backend e regenere; nao edite o arquivo."
            exit 1
          fi
```

- [ ] **Step 2: Validar o YAML**

```bash
cd /home/jvbat/projetos/lotus-infra
python3 -c "import yaml,sys; d=yaml.safe_load(open('.github/workflows/ci.yml')); print(sorted(d['jobs']))"
```

Esperado: `['backend', 'frontend', 'types-drift']`.

- [ ] **Step 3: Empurrar e ver o gate VERDE primeiro**

```bash
git add .github/workflows/ci.yml
git commit -m "ci(types-drift): mecanismo da lei 5.3, pagando a D-08"
git push
gh run watch --exit-status
```

Esperado: `types-drift` verde. Um gate que nunca foi visto verde não prova nada quando fica vermelho — pode estar vermelho por outro motivo.

- [ ] **Step 4: A sonda — quebrar de propósito**

```bash
printf '\nexport type SondaD08 = "editado a mao";\n' >> frontend/src/shared/types/generated.ts
git add frontend/src/shared/types/generated.ts
git commit -m "test(sonda): edita generated.ts a mao para provar a catraca da D-08"
git push
```

- [ ] **Step 5: Ver reprovar, nomeando o arquivo**

```bash
gh run watch --exit-status || true
gh run list --branch cicd/ci-governanca-e-artefato --limit 1 --json databaseId --jq '.[0].databaseId' \
  | xargs -I{} gh run view {} --log-failed | grep -A2 "::error"
```

Esperado: `types-drift` **falha**, e a linha de erro contém `frontend/src/shared/types/generated.ts`. Copiar a linha exata — é a evidência da D-08.

Esperado também: `backend` e `frontend` continuam verdes. Se o `frontend` também falhar, a sonda está provando outra coisa (um erro de tipo, não o drift) — trocar a linha acrescentada por uma que compile.

- [ ] **Step 6: Desfazer a sonda e ver voltar ao verde**

```bash
git revert --no-edit HEAD
git push
gh run watch --exit-status
```

Esperado: os três jobs verdes de novo.

- [ ] **Step 7: Registrar a evidência**

Criar `docs/superpowers/audits/2026-08-24-cicd-evidencias.md`:

```markdown
# Evidências — CI de governança e artefato imutável

> Bloco `cicd-ci-governanca-e-artefato` · item 11 · 2026-08-24
> Cada seção prova um item do DoD da spec §7.

## DoD 1 — sonda da D-08 (lei §5.3)

**Antes:** o único guardião do `generated.ts` era `globalIgnores` no
`eslint.config.js:158`, que só tira o arquivo do corte do lint. Editar à mão passava verde.

| Passo | Run | Resultado |
|---|---|---|
| gate verde de partida | `<url do run do Step 3>` | `types-drift` PASS |
| `generated.ts` editado à mão | `<url do run do Step 5>` | `types-drift` FAIL |
| sonda revertida | `<url do run do Step 6>` | `types-drift` PASS |

Linha de erro exata:

```
<colar a saída do Step 5>
```

**Escopo do que fecha:** somente a §5.3. As §5.1/§5.2 já têm `PersistenceLawsTest` e a §5.6 tem
`no-restricted-imports`; §5.4, §5.5, §5.7 e §5.8 seguem sem guarda e não entram como promessa.
```

- [ ] **Step 8: Commit**

```bash
git add docs/superpowers/audits/2026-08-24-cicd-evidencias.md
git commit -m "docs(audit): evidencia da sonda D-08 -- verde, vermelho nomeando o arquivo, verde"
git push
```

---

### Task 6: Os dois audits

`audit-prod` reprova o que a imagem de produção carrega; `audit-dev` reporta e não reprova. As Tasks 2 e 3 já deixaram os dois lados verdes — sem elas este job nasceria vermelho.

**Files:**
- Modify: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: lock do Task 2, lock do Task 3, `packageManager` da Task 1.
- Produces: os jobs `audit-prod` (reprova) e `audit-dev` (não reprova). A Task 7 cita `audit-prod` em `needs:`; a Task 9 o cita como required check. **`audit-dev` nunca vira required check.**

- [ ] **Step 1: Acrescentar os dois jobs**

Ao final de `.github/workflows/ci.yml`:

```yaml
  # Reprova SO o que a imagem de producao carrega. --locked le o composer.lock
  # sem instalar vendor, e `pnpm audit` le o pnpm-lock.yaml sem node_modules --
  # entao este job nao precisa de nenhuma instalacao.
  audit-prod:
    name: audit-prod
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: shivammathur/setup-php@v2
        with:
          php-version: '8.3'
          extensions: mbstring
          coverage: none

      - uses: pnpm/action-setup@v4
        with:
          package_json_file: frontend/package.json

      - uses: actions/setup-node@v4
        with:
          node-version: '22'

      - name: Advisories nas dependencias PHP de producao
        working-directory: backend
        run: composer audit --no-dev --locked

      - name: Advisories nas dependencias JS de producao
        working-directory: frontend
        run: pnpm audit --prod

  # REPORTA e nao reprova, por decisao explicita: um advisory moderate numa
  # dependencia transitiva de ferramenta de desenvolvimento travaria toda a
  # fila sem uma linha de codigo ter mudado, e a saida pratica disso e
  # desligar o check -- pior que nao te-lo.
  audit-dev:
    name: audit-dev
    runs-on: ubuntu-latest
    continue-on-error: true
    steps:
      - uses: actions/checkout@v4

      - uses: shivammathur/setup-php@v2
        with:
          php-version: '8.3'
          extensions: mbstring
          coverage: none

      - uses: pnpm/action-setup@v4
        with:
          package_json_file: frontend/package.json

      - uses: actions/setup-node@v4
        with:
          node-version: '22'

      - name: Advisories em toda a arvore PHP
        working-directory: backend
        run: composer audit --locked

      - name: Advisories em toda a arvore JS
        working-directory: frontend
        run: pnpm audit
```

- [ ] **Step 2: Validar o YAML**

```bash
cd /home/jvbat/projetos/lotus-infra
python3 -c "import yaml; d=yaml.safe_load(open('.github/workflows/ci.yml')); print(sorted(d['jobs']))"
```

Esperado: `['audit-dev', 'audit-prod', 'backend', 'frontend', 'types-drift']`.

- [ ] **Step 3: Empurrar e observar**

```bash
git add .github/workflows/ci.yml
git commit -m "ci(audit): reprova o que a imagem de producao carrega, reporta o resto"
git push
gh run watch --exit-status
```

Esperado: `audit-prod` **verde** (as Tasks 2 e 3 o destravaram). `audit-dev` pode aparecer vermelho por dentro e **ainda assim não derrubar a execução** — é o `continue-on-error` funcionando.

- [ ] **Step 4: Provar que `audit-dev` não reprova de verdade**

```bash
gh run list --branch cicd/ci-governanca-e-artefato --limit 1 --json databaseId --jq '.[0].databaseId' \
  | xargs -I{} gh run view {} --json conclusion,jobs \
      --jq '{run: .conclusion, jobs: [.jobs[] | {name, conclusion}]}'
```

Esperado: `run` é `success` mesmo que o job `audit-dev` tenha `conclusion` diferente de `success`. Se a execução inteira ficar vermelha por causa dele, o `continue-on-error` está no lugar errado — ele vai no job, não no step.

---

### Task 7: O job de imagem — o par por SHA

`docker-compose.prod.yml:23,36` consome `LOTUS_IMAGE` e `LOTUS_WEB_IMAGE` como variáveis independentes: um release é o **par**, não uma imagem. E `github.repository` é `Andred21/lotus`, com maiúscula — **GHCR só aceita minúscula**, então o nome passa por conversão explícita.

**Files:**
- Modify: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: os jobs `backend`, `frontend`, `types-drift`, `audit-prod` das Tasks 4-6.
- Produces: o job `image`, e o par `ghcr.io/<owner>/<repo>-app:<sha>` + `ghcr.io/<owner>/<repo>-web:<sha>`. A Task 8 prova a publicação; o item 12 do backlog consome esse par.

- [ ] **Step 1: Acrescentar o job**

Ao final de `.github/workflows/ci.yml`:

```yaml
  image:
    name: image
    # Nenhum gate vermelho passa daqui: e isto que faz o DoD
    # "commit reprovado nao gera release promovivel" ser mecanico e nao
    # combinado. audit-dev NAO entra -- ele reporta, nao decide.
    needs: [backend, frontend, types-drift, audit-prod]
    # Sem nome de dono na condicao. Branch e PR rodam so os gates; o custo
    # do bloco esta neste job, e e daqui que vem o "CI rapido".
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v4

      # github.repository e `Andred21/lotus` -- com maiuscula. GHCR recusa
      # nome com maiuscula ("repository name must be lowercase"), entao usar
      # a variavel crua no `tags:` falha o push. Vale para Gatika-CL tambem.
      - name: Nome do repositorio em minusculas
        id: repo
        run: echo "lc=${GITHUB_REPOSITORY,,}" >> "$GITHUB_OUTPUT"

      - uses: docker/setup-buildx-action@v3

      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      # SHA completo e sem `latest`, de proposito: tag movel convida
      # `docker pull latest` no servidor, que e o habito que o item 12
      # existe para substituir.
      - name: Constroi e publica o alvo app
        uses: docker/build-push-action@v6
        with:
          context: .
          file: docker/Dockerfile.prod
          target: app
          push: true
          tags: ghcr.io/${{ steps.repo.outputs.lc }}-app:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

      - name: Constroi e publica o alvo web
        uses: docker/build-push-action@v6
        with:
          context: .
          file: docker/Dockerfile.prod
          target: web
          push: true
          tags: ghcr.io/${{ steps.repo.outputs.lc }}-web:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

- [ ] **Step 2: Validar o YAML e a condição**

```bash
cd /home/jvbat/projetos/lotus-infra
python3 - <<'PY'
import yaml
d = yaml.safe_load(open('.github/workflows/ci.yml'))
img = d['jobs']['image']
assert sorted(img['needs']) == ['audit-prod', 'backend', 'frontend', 'types-drift'], img['needs']
assert 'Gatika' not in open('.github/workflows/ci.yml').read(), 'dono no YAML'
assert 'Andred21' not in open('.github/workflows/ci.yml').read(), 'dono no YAML'
print('jobs:', sorted(d['jobs']))
print('if:', img['if'])
PY
```

Esperado: sem `AssertionError`, seis jobs listados, e a condição impressa. Os dois `assert` de dono guardam a propriedade "dono-agnóstico" da spec §4.1 — que é silenciosa se quebrar.

- [ ] **Step 3: Provar os dois builds localmente, antes de qualquer push**

O job só dispara em `main`. Antes de mesclar, provar que os dois alvos constroem a partir do mesmo contexto:

```bash
docker build -f docker/Dockerfile.prod --target app -t lotus-app:probe . 2>&1 | tail -3
docker build -f docker/Dockerfile.prod --target web -t lotus-web:probe . 2>&1 | tail -3
docker images --format '{{.Repository}}:{{.Tag}}\t{{.Size}}' | grep probe
```

Esperado: os dois saem `0`. A referência do bloco do runtime é `app` ≈ 293MB e `web` ≈ 105MB; divergência grande é achado a investigar, não a aceitar.

- [ ] **Step 4: Empurrar e confirmar que o job NÃO roda no PR**

```bash
git add .github/workflows/ci.yml
git commit -m "ci(image): publica o par app+web por SHA, atras dos quatro gates"
git push
gh run watch --exit-status
```

Esperado: os cinco jobs de correção rodam; `image` aparece como **skipped**. Isso já é meia prova do DoD 2 — o job não roda fora de `main`.

- [ ] **Step 5: Marcar o PR como pronto**

```bash
gh pr ready
```

---

### Task 8: Fatia 1 fecha — publicação provada no GHCR

Mesclar em `Andred21/main` é passo do plano, não do fechamento: é a única forma de disparar o job `image` no gatilho real, e a fatia 2 precisa da CI já provada antes de o repositório corporativo nascer.

**Files:**
- Modify: `docs/superpowers/audits/2026-08-24-cicd-evidencias.md`

**Interfaces:**
- Consumes: o job `image` da Task 7.
- Produces: o par publicado no GHCR pessoal, e as seções de DoD 2 e 3 do relatório.

- [ ] **Step 1: Conferir que tudo está verde antes de mesclar**

```bash
cd /home/jvbat/projetos/lotus-infra
gh pr checks
```

Esperado: `backend`, `frontend`, `types-drift`, `audit-prod` em `pass`. `audit-dev` pode estar em qualquer estado.

- [ ] **Step 2: Mesclar**

```bash
gh pr merge --merge
git checkout main && git pull
```

- [ ] **Step 3: Observar a publicação**

```bash
gh run watch --exit-status
git rev-parse HEAD
```

Esperado: os seis jobs verdes, `image` incluído. Guardar o SHA impresso — é a identidade do release.

- [ ] **Step 4: Provar que o par existe no registry, no mesmo SHA**

```bash
SHA=$(git rev-parse HEAD)
OWNER=$(gh repo view --json nameWithOwner --jq '.nameWithOwner' | tr '[:upper:]' '[:lower:]')
docker manifest inspect "ghcr.io/${OWNER}-app:${SHA}" > /dev/null && echo "app OK"
docker manifest inspect "ghcr.io/${OWNER}-web:${SHA}" > /dev/null && echo "web OK"
```

Esperado: `app OK` e `web OK`. **É o DoD 3.**

- [ ] **Step 5: Provar que não existe tag móvel**

```bash
docker manifest inspect "ghcr.io/${OWNER}-app:latest" 2>&1 | tail -1
```

Esperado: erro de manifesto não encontrado. `latest` não deve existir — se existir, alguém acrescentou tag móvel e a promoção por SHA do item 12 fica ambígua.

- [ ] **Step 6: A sonda do gate de publicação — vermelho não publica**

Com a CI já provada em `main`, quebrar de propósito uma vez:

```bash
printf '\nexport type SondaGate = "vermelho nao publica";\n' >> frontend/src/shared/types/generated.ts
git add frontend/src/shared/types/generated.ts
git commit -m "test(sonda): commit vermelho em main para provar que nada e publicado"
git push
gh run watch --exit-status || true
RED=$(git rev-parse HEAD)
```

- [ ] **Step 7: Ver `image` pulado e o registry intacto**

```bash
gh run list --branch main --limit 1 --json databaseId --jq '.[0].databaseId' \
  | xargs -I{} gh run view {} --json jobs --jq '.jobs[] | "\(.name)\t\(.conclusion)"'
docker manifest inspect "ghcr.io/${OWNER}-app:${RED}" 2>&1 | tail -1
```

Esperado: `types-drift` com `failure`, `image` com `skipped`, e o `docker manifest inspect` do SHA vermelho falhando — **nenhuma imagem foi publicada para o commit reprovado. É o DoD 2.**

- [ ] **Step 8: Reverter a sonda**

```bash
git revert --no-edit HEAD
git push
gh run watch --exit-status
```

Esperado: os seis verdes, e um par novo publicado no SHA do revert.

- [ ] **Step 9: Registrar DoD 2 e 3 no relatório**

Acrescentar a `docs/superpowers/audits/2026-08-24-cicd-evidencias.md`:

```markdown
## DoD 2 — commit reprovado não publica

| SHA | `types-drift` | `image` | Imagem no GHCR |
|---|---|---|---|
| `<SHA verde do Step 3>` | pass | success | par publicado |
| `<SHA vermelho do Step 6>` | **failure** | **skipped** | `manifest unknown` |

O `image` declara `needs: [backend, frontend, types-drift, audit-prod]`, então o gate é mecânico:
nenhuma decisão humana separa o commit reprovado do registry.

## DoD 3 — o par, no mesmo SHA

```
ghcr.io/<owner>/<repo>-app:<sha>
ghcr.io/<owner>/<repo>-web:<sha>
```

`latest` não existe — verificado no Step 5, `manifest unknown`. Release é o par porque
`docker-compose.prod.yml:23,36` consome `LOTUS_IMAGE` e `LOTUS_WEB_IMAGE` como variáveis
independentes.

## DoD 4 — `--frozen-lockfile` sobrevive

O job `frontend` instala com `pnpm install --frozen-lockfile` e passa: o `pnpm-lock.yaml`
commitado é resolvível pela versão declarada em `packageManager`, sem reescrita.

## Custo medido

<colar a tabela de tempos do Step 6 da Task 4>
```

- [ ] **Step 10: Commit**

```bash
git add docs/superpowers/audits/2026-08-24-cicd-evidencias.md
git commit -m "docs(audit): DoD 2, 3 e 4 provados no repositorio pessoal"
git push
```

---

### Task 9: Fatia 2 — `Gatika-CL/lotus`, upstream e protection lida de volta

A ordem não é preferência: **required checks só podem ser exigidos por nome depois que o GitHub viu os jobs rodarem pelo menos uma vez.** Configurar protection antes do primeiro run significa digitar nomes de check à mão e torcer para baterem.

Esta task tem **passo do João** — criar o repositório na conta empresarial não é ação de agente.

**Files:**
- Modify: `docs/superpowers/audits/2026-08-24-cicd-evidencias.md`

**Interfaces:**
- Consumes: os nomes de job `backend`, `frontend`, `types-drift`, `audit-prod`.
- Produces: `Gatika-CL/lotus` com `main` protegida, e a seção de DoD 5 do relatório.

- [ ] **Step 1: PARAR e pedir ao João**

O agente não cria o repositório. Pedir, literalmente:

> Crie `Gatika-CL/lotus` **privado** na conta empresarial, **vazio** — sem README, sem `.gitignore`, sem licença. Um commit inicial criaria uma história divergente e o push da Task 9 exigiria `--force`. Me avise quando existir.

Não seguir sem confirmação.

- [ ] **Step 2: Conferir que existe e está vazio**

```bash
cd /home/jvbat/projetos/lotus-infra
gh repo view Gatika-CL/lotus --json name,visibility,isEmpty
```

Esperado: `"visibility": "PRIVATE"` e `"isEmpty": true`. Se não estiver vazio, PARAR e decidir com o João — não usar `--force`.

- [ ] **Step 3: Configurar o remote e empurrar**

```bash
git remote add upstream git@github.com:Gatika-CL/lotus.git
git remote -v
git checkout main && git pull origin main
git push upstream main
```

Esperado: `git remote -v` lista `origin` (Andred21) e `upstream` (Gatika-CL) — a topologia que a ficha do item 11 descrevia como destino passa a existir.

- [ ] **Step 4: Ver o workflow rodar uma vez no corporativo**

```bash
gh run list --repo Gatika-CL/lotus --limit 1
gh run watch --repo Gatika-CL/lotus --exit-status
```

Esperado: os seis jobs. `image` **roda** — é push em `main` — e publica em `ghcr.io/gatika-cl/lotus-app` e `-web`. É este run que ensina ao GitHub os nomes dos checks.

- [ ] **Step 5: Confirmar que o GitHub aprendeu os nomes**

```bash
gh api repos/Gatika-CL/lotus/commits/main/check-runs --jq '.check_runs[].name' | sort
```

Esperado, exatamente: `audit-dev`, `audit-prod`, `backend`, `frontend`, `image`, `types-drift`. Se algum nome divergir do esperado, **corrigir aqui** — é o último ponto barato; depois da protection, renomear job quebra a régua.

- [ ] **Step 6: Aplicar a protection**

```bash
gh api -X PUT repos/Gatika-CL/lotus/branches/main/protection \
  --input - <<'JSON'
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["backend", "frontend", "types-drift", "audit-prod"]
  },
  "enforce_admins": false,
  "required_pull_request_reviews": {
    "required_approving_review_count": 0,
    "dismiss_stale_reviews": false,
    "require_code_owner_reviews": false
  },
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false
}
JSON
```

`required_approving_review_count: 0` é a decisão da spec §6: o GitHub não permite aprovar o próprio PR, e com um dev exigir aprovação trancaria o merge ou viraria bypass de admin. Quem reprova é a CI. **`audit-dev` fica fora da lista de propósito** — ele reporta, não decide.

- [ ] **Step 7: O readback — ler de volta e comparar**

```bash
gh api repos/Gatika-CL/lotus/branches/main/protection --jq '{
  checks: .required_status_checks.contexts,
  strict: .required_status_checks.strict,
  aprovacoes: .required_pull_request_reviews.required_approving_review_count,
  force_push: .allow_force_pushes.enabled,
  delecao: .allow_deletions.enabled
}'
```

Esperado, exato:

```json
{
  "checks": ["backend", "frontend", "types-drift", "audit-prod"],
  "strict": true,
  "aprovacoes": 0,
  "force_push": false,
  "delecao": false
}
```

Divergência entre o enviado e o lido é achado, não detalhe: o packet exige governança comprovada por leitura, nunca inferida do YAML.

- [ ] **Step 8: Provar que a régua morde**

```bash
git push upstream main --force-with-lease --dry-run
```

Esperado: **recusa** do servidor. Se o push passar, a protection não está valendo — reabrir o Step 6.

- [ ] **Step 9: Registrar DoD 5**

Acrescentar a `docs/superpowers/audits/2026-08-24-cicd-evidencias.md`:

```markdown
## DoD 5 — governança lida de volta

`Gatika-CL/lotus` criado privado e vazio pelo João em 2026-08-24; `upstream` configurado e `main`
empurrada. O workflow rodou uma vez antes de qualquer protection — é o que ensina os nomes dos
checks ao GitHub, e é por isso que a ordem desta fatia não é preferência.

Readback de `GET /repos/Gatika-CL/lotus/branches/main/protection`:

```json
<colar a saída exata do Step 7>
```

`audit-dev` está fora da lista de required checks de propósito: ele reporta e não decide.
Aprovação humana não é exigida — o GitHub não permite aprovar o próprio PR, e com um dev a
exigência trancaria o merge ou viraria bypass de admin, que não distingue "estou sozinho" de
"estou com pressa". Quando entrar segunda pessoa no time, subir `required_approving_review_count`
para 1 é uma linha.

Force-push recusado pelo servidor no Step 8 — a régua morde, não só existe.
```

- [ ] **Step 10: Commit**

```bash
git add docs/superpowers/audits/2026-08-24-cicd-evidencias.md
git commit -m "docs(audit): DoD 5 -- protection de Gatika-CL/main lida de volta pela API"
git push origin main
git push upstream main
```

---

## Cobertura do DoD

| DoD (spec §7) | Onde é provado |
|---|---|
| 1 — sonda D-08 nomeia o arquivo | Task 5, Steps 4-5 |
| 2 — vermelho não publica | Task 8, Steps 6-7 |
| 3 — verde publica o par no mesmo SHA | Task 8, Steps 3-4 |
| 4 — `--frozen-lockfile` sobrevive | Task 4, Step 5 (job `frontend`) |
| 5 — readback da protection | Task 9, Step 7 |

## Handoff de execução

**executor: claude**

Não é task mecânica de paths fechados. Três razões concretas:

1. **A Task 5 paga uma lei do `CLAUDE.md` §5** (a §5.3, via D-08) — o próprio `/planejar-bloco`
   manda `claude` quando a task toca lei do §5.
2. **As Tasks 8 e 9 fazem ação externa irreversível** — merge em `main`, publicação no GHCR e
   escrita de branch protection num repositório da empresa. Cada uma exige julgamento sobre o que
   fazer quando o observado diverge do esperado, e a Task 9 tem um passo que **para e espera o
   João**.
3. **As Tasks 2 e 3 mexem em dependência de produção** de um sistema cujos certificados têm peso
   legal. Subir `react-router` e `guzzle` é mecânico; decidir o que fazer se a suíte regredir não é.

---

## Emenda de 2026-08-25 — a Task 9 sem plano pago

O Step 6 da Task 9 é impossível como escrito: `PUT /repos/Gatika-CL/lotus/branches/main/protection`
responde `403 Upgrade to GitHub Pro or make this repository public`, e `GET /orgs/Gatika-CL` mostra
`plan.name = free`. Rulesets dão o mesmo 403. As duas saídas do plano original — pagar ou abrir o
repositório — foram recusadas: não há orçamento, e abrir o código de um cliente do setor elétrico
regulado troca confidencialidade por régua, que é preço errado.

**Decisão do João em 2026-08-25:** compensar em três camadas, e registrar a lacuna em vez de
fingir que ela não existe.

1. **`.githooks/pre-push`** — prevenção na máquina de onde os pushes saem. Recusa push direto em
   `main` no pessoal (entrada é `gh pr merge`, que roda no servidor e não passa por hook) e push
   manual em `main` no corporativo. Instala com `git config core.hooksPath .githooks`.
2. **Job `procedencia`, dentro do `needs` do `image`** — a compensação que importa. Não impede a
   escrita na ref, mas impede que ela vire artefato: commit que chegou em `main` sem PR mesclado
   não gera imagem, e portanto não é promovível. Reconstrói no artefato a garantia que a protection
   daria na ref. Force-push não é impedido, é detectado e datado.
3. **`scripts/espelhar-corporativo.sh` + `.espelho-exclusoes`** — o corporativo deixa de ser um
   espelho 1:1 e passa a receber uma árvore filtrada, um commit por release, com trailer
   `Source-Commit`. Decisão do João na mesma conversa: o repositório da empresa carrega o que
   constrói, testa e roda o app, não o andaime de desenvolvimento.

**O DoD 5 fica COMPENSADO, não provado.** A diferença é material e está escrita no relatório: nada
impede um push direto em `main`; o que existe é recusa local, detecção no servidor e negação do
artefato. Quando houver orçamento para GitHub Team, o Step 6 acima entra como está e vira a camada
que falta — a única que impede de verdade.
