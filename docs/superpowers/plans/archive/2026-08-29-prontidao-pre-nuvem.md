# Prontidão pré-nuvem — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** vermelho no CI volta a significar "bloqueia" (o `audit-dev` decide e segura a imagem, com zero advisory), `Gatika-CL/main` volta a espelhar o tip de `Andred21/main`, e o par `ghcr.io/gatika-cl/lotus-{app,web}:<sha>` é puxado e executado nesta máquina por script versionado — tudo sem tocar em nuvem.

**Architecture:** duas mudanças no `.github/workflows/ci.yml` (sai o `continue-on-error` do `audit-dev`; ele entra no `needs` do `image`) e um bump só de lockfile fecham a fatia de CI. Um `scripts/provar-release.sh <sha>` executa a sequência que o host fará (`login → pull → migrate → up → /up`) sobre `docker-compose.prod.yml` + overlay de sonda, num projeto Compose próprio, e derruba tudo ao sair. A fatia 2 é ação externa em ordem obrigatória: merge da PR 1 → espelho → CI corporativo → prova do par corporativo → evidência.

**Tech Stack:** GitHub Actions · pnpm 11.23.0 / Node 22 · Docker Compose v5.4.0 · GHCR (PAT clássico `read:packages`) · bash · vitest (catraca textual).

**Spec:** `docs/superpowers/specs/2026-08-29-prontidao-pre-nuvem-design.md`
**Context packet:** nenhum (`Contexto: não`; medições na spec §3)

## Global Constraints

Valores medidos em 2026-08-29 nesta árvore (`../lotus-infra`, branch `chore/prontidao-pre-nuvem`). Copiados exatos; não re-derivar.

- **Refs de partida:** `origin/main@37e0e2d42d88a6e6775d6ef9b3afa17e991dd539`; `upstream/main@3d158773e92ee7cd25abe0b03c8464f05d629eb9` (espelho de `24c2105d`, onze PRs atrás: #75–#85). Remotes: `origin` = `git@github.com:Andred21/lotus.git`, `upstream` = `git@github.com:Gatika-CL/lotus.git`.
- **Par pessoal é público:** `docker manifest inspect ghcr.io/andred21/lotus-app:37e0e2d4…` e `-web:…` respondem sem credencial. **Par corporativo é privado:** `ghcr.io/gatika-cl/lotus-app:3d158773…` responde `denied` — o credential store do Docker (`credsStore: desktop.exe`) **já tem** uma entrada `ghcr.io` para `Andred21`, e ela não lê o pacote corporativo. Um `docker login` novo a sobrescreve.
- **Advisories (7, todos transitivos de devDeps, `pnpm audit --prod` limpo):** `brace-expansion@5.0.6` → ≥ 5.0.9 (chega por `minimatch@10.2.5` → `10.2.6`, que pede `^5.0.8`); `nanoid@3.3.15` → ≥ 3.3.18; `postcss@8.5.15` → ≥ 8.5.23 (registry hoje: `8.5.26`). Nenhum range em `frontend/package.json` muda (D2). Sem `pnpm.overrides`.
- **`audit-dev` é nome de contrato.** Não renomear job: `P-62` e o `CONTRIBUINDO.md` o citam como required check futuro.
- **Comentários em `ci.yml` e nos scripts são ASCII** (sem acento), como os arquivos já são.
- **Gates por gatilho, depois da D1:** `pull_request` roda cinco (`backend`, `frontend`, `types-drift`, `audit-prod`, `audit-dev`) e todos decidem; `push` em `main` acrescenta `procedencia`, e `image` só roda atrás dos seis.
- **Healthcheck do `nginx`:** `start_period: 30s`, `interval: 15s`, `retries: 5` → teto de espera no script: **150 s** (30 × 5 s).
- **Portas da sonda:** `8081` (nginx), `9002` (MinIO), `8026` (Mailpit) — as do offset +1, que **é o desta worktree** (`.env`). A stack de dev desta árvore fica **derrubada** durante qualquer execução do script; colisão faz o Compose falhar alto com `port is already allocated` (ADR-13).
- **`migrate` não mora no entrypoint** (`docker/php/entrypoint.sh`, item 10 D7): o fluxo de deploy é `pull → migrate → up`, e o script o reproduz.
- **Atravessa o espelho:** `scripts/provar-release.sh` e `frontend/tests/provar-release.test.ts`. **Não atravessa:** `CONTRIBUINDO.md`, `.githooks/`, `docs/` (`.espelho-exclusoes`).
- **Git:** nunca `git push origin main` (o `pre-push` recusa; `main` entra por `gh pr merge --merge`); espelho **só** por `scripts/espelhar-corporativo.sh`; nunca `git stash` sem tag (pilha compartilhada entre árvores).
- **PAT:** clássico, escopo **só** `read:packages`, criado pelo João, vive no credential store do Docker; **nunca** em arquivo do repositório, nem em saída de comando colada em `audits/`.

## Mapa de arquivos

| Arquivo | Responsabilidade | Task |
|---|---|---|
| `.github/workflows/ci.yml` | `audit-dev` decide; `image` depende dele; comentários registram a reversão datada | 1 |
| `frontend/pnpm-lock.yaml` | sobe `brace-expansion`, `minimatch`, `nanoid`, `postcss` dentro dos ranges | 2 |
| `scripts/provar-release.sh` | a sequência do host, executável e repetível: `login → pull → migrate → up → /up`, `down -v` sempre | 3 |
| `frontend/tests/provar-release.test.ts` | catraca textual das propriedades que fazem o script ser prova (lição 19) | 3 |
| `CONTRIBUINDO.md` | seções "Como ler o CI" e "Provar um release"; "cinco gates" ganha "todos decidem" | 4 |
| `.githooks/pre-push` | mensagem: "quatro gates verdes" → "cinco" | 4 |
| `docs/superpowers/pendencias/abertas.md` (`P-62`) e `pendencias/README.md` | emenda datada: o pessoal está público; gatilho inclui a decisão; required checks passam a cinco | 4 |
| `docs/superpowers/audits/2026-08-29-prontidao-pre-nuvem.md` | evidência datada: runs, SHAs, árvore, digests, saída do script | 5–8 |

**Duas fatias, uma PR cada.** Tasks 1–4 são a PR 1 (código + docs) e **precisam mesclar antes** das Tasks 6–7: o espelho publica a árvore do merge, e a prova do par corporativo só existe depois dele. Tasks 5–8 são ação externa e evidência; a PR 2 (fechamento: `audits/`, `progress.md`, `state.md`) nasce no `finishing-a-development-branch`, fora deste plano, e não gera segundo espelho — `docs/` não atravessa, a árvore filtrada é a mesma e o script responde "já tem esta árvore".

**A sonda do DoD 1 é a ordem das tasks, não um commit sintético.** A spec §7.1 pede provar que o `continue-on-error` saiu vendo o run ficar `failure`. A Task 1 muda o workflow **antes** do bump da Task 2, e faz push nesse estado: o run da PR reprova com `audit-dev` `failure` pelos sete advisories reais. A Task 2 leva ao verde. Mesma evidência, zero commit de lockfile rebaixado para reverter.

---

### Task 1: `audit-dev` decide — e a PR nasce vermelha de propósito

**Files:**
- Modify: `.github/workflows/ci.yml` (job `audit-dev`, linhas 187–194; job `image`, linhas 324–331)

**Interfaces:**
- Consumes: nada.
- Produces: o job `audit-dev` sem `continue-on-error`; `image.needs` = `[backend, frontend, types-drift, audit-prod, audit-dev, procedencia]`. A PR desta branch, aberta aqui, é onde as Tasks 2–4 continuam.

- [ ] **Step 1: Medir o ponto de partida**

```bash
cd /home/jvbat/projetos/lotus-infra
git status --short                                   # limpo
docker compose ps --format '{{.Service}}' | wc -l    # 0 -- a stack de dev desta arvore esta fora
grep -n "continue-on-error" .github/workflows/ci.yml
grep -n "needs:" .github/workflows/ci.yml
```

Esperado: `continue-on-error: true` uma vez, no `audit-dev`; `needs: [backend, frontend, types-drift, audit-prod, procedencia]` uma vez, no `image`.

- [ ] **Step 2: O job `audit-dev` passa a decidir**

Substituir o bloco do comentário + cabeçalho do job (de `# REPORTA e nao reprova` até `continue-on-error: true`) por:

```yaml
  # REPROVA, desde 2026-08-29 (item 20). Ate entao este job rodava em
  # `continue-on-error: true` -- "reporta e nao reprova", decisao do item 11
  # para que uma advisory transitiva de ferramenta nao travasse a fila sem uma
  # linha de codigo ter mudado. O efeito medido foi o oposto do pretendido: o
  # job aparecia vermelho em TODO run, sem decidir nada, e vermelho deixou de
  # significar alguma coisa. Decisao do Joao: advisory em qualquer arvore
  # reprova, e este job entra no `needs` do `image`. O risco que a decisao
  # anterior evitava fica assumido -- a fila trava ate o bump do lockfile, que
  # e a saida certa (`pnpm update <pacote>`; ver CONTRIBUINDO.md, "Como ler o
  # CI"). Desligar o check nunca e.
  audit-dev:
    name: audit-dev
    runs-on: ubuntu-latest
    steps:
```

O resto do job (checkout, setup-php, pnpm, node, os dois `audit`) fica como está.

- [ ] **Step 3: O `image` passa a depender dele**

Substituir o comentário e o `needs` do job `image` por:

```yaml
  image:
    name: image
    # Nenhum gate vermelho passa daqui: e isto que faz o DoD
    # "commit reprovado nao gera release promovivel" ser mecanico e nao
    # combinado. audit-dev entra desde 2026-08-29 -- antes reportava sem
    # decidir, e um run vermelho com par publicado era exatamente a
    # incoerencia que este `needs` existe para impedir. procedencia entra
    # porque, sem branch protection, ele e a unica coisa entre um push direto
    # em main e um artefato publicado.
    needs: [backend, frontend, types-drift, audit-prod, audit-dev, procedencia]
```

- [ ] **Step 4: Provar a forma do arquivo**

```bash
python3 - <<'EOF'
import yaml
ci = yaml.safe_load(open('.github/workflows/ci.yml'))
jobs = ci['jobs']
assert 'continue-on-error' not in jobs['audit-dev'], 'continue-on-error ainda esta no audit-dev'
assert jobs['image']['needs'] == ['backend', 'frontend', 'types-drift', 'audit-prod', 'audit-dev', 'procedencia'], jobs['image']['needs']
assert list(jobs) == ['backend', 'frontend', 'types-drift', 'audit-prod', 'audit-dev', 'procedencia', 'image'], list(jobs)
print('ci.yml ok:', jobs['image']['needs'])
EOF
grep -c "continue-on-error" .github/workflows/ci.yml
```

Esperado: `ci.yml ok: [...]` com os seis nomes, e `0` no `grep -c`.

- [ ] **Step 5: Commit**

O `/executar-bloco` acrescenta a transição `workflow_state: executing` do `state.md` **neste mesmo commit** (é a primeira task durável).

```bash
git add .github/workflows/ci.yml docs/superpowers/state.md
git commit -m "ci: audit-dev passa a reprovar e a segurar a imagem

Sai o continue-on-error do job e ele entra no needs do image. Reverte a
decisao 'reporta e nao reprova' do item 11: medido, o job ficava vermelho em
todo run sem decidir nada. Decisao do Joao em 2026-08-29 (spec do item 20, D1)."
```

- [ ] **Step 6: Abrir a PR e ver o vermelho que agora decide**

```bash
git push -u origin chore/prontidao-pre-nuvem
gh pr create --base main --title "chore: prontidao pre-nuvem -- audit-dev decide, release provado por script" \
  --body "Bloco prontidao-pre-nuvem (item 20, lane-b). Spec: docs/superpowers/specs/2026-08-29-prontidao-pre-nuvem-design.md

- audit-dev deixa de ser continue-on-error e entra no needs do image (D1)
- bump dos sete advisories transitivos no pnpm-lock.yaml, package.json intacto (D2)
- scripts/provar-release.sh: login -> pull -> migrate -> up -> /up do par publicado, down -v sempre (D3)
- CONTRIBUINDO.md: 'Como ler o CI' e 'Provar um release'; pre-push com cinco gates; P-62 emendada

O primeiro run desta PR e VERMELHO de proposito: e a sonda do DoD 1 (workflow muda antes do bump)."
sleep 20
RUN=$(gh run list --branch chore/prontidao-pre-nuvem --limit 1 --json databaseId --jq '.[0].databaseId')
gh run watch "$RUN" --exit-status || true
gh run view "$RUN" --json conclusion,jobs --jq '"run: \(.conclusion)", (.jobs[] | "\(.name)\t\(.conclusion)")'
echo "RUN_SONDA=$RUN"
```

Esperado: `run: failure`; `audit-dev	failure`; `backend`, `frontend`, `types-drift`, `audit-prod` em `success`; `procedencia` e `image` ausentes (só existem em `push`). **É a prova de que o `continue-on-error` saiu.** Guardar `RUN_SONDA` para a evidência (Task 8). Se `audit-dev` sair `success` aqui, alguém já subiu o lockfile — conferir `pnpm audit` antes de seguir, porque a sonda deixou de provar.

---

### Task 2: Os sete advisories — bump só no lockfile

**Files:**
- Modify: `frontend/pnpm-lock.yaml`

**Interfaces:**
- Consumes: a PR aberta na Task 1.
- Produces: `pnpm audit` em zero; `pnpm install --frozen-lockfile` passando; o run da PR verde com `audit-dev` `success`.

- [ ] **Step 1: Ver o vermelho localmente**

```bash
cd /home/jvbat/projetos/lotus-infra/frontend
pnpm audit 2>&1 | tail -2
grep -nE "^  (brace-expansion|minimatch|nanoid|postcss)@" pnpm-lock.yaml
```

Esperado: `7 vulnerabilities found` / `Severity: 1 moderate | 6 high`; e `brace-expansion@5.0.6`, `minimatch@10.2.5`, `nanoid@3.3.15`, `postcss@8.5.15`.

- [ ] **Step 2: Subir os quatro, dentro dos ranges**

```bash
pnpm update brace-expansion minimatch nanoid postcss
git -C .. diff --stat
grep -nE "^  (brace-expansion|minimatch|nanoid|postcss)@" pnpm-lock.yaml
```

Esperado: `git diff --stat` lista **só** `frontend/pnpm-lock.yaml` (`package.json` intacto — D2); no lockfile, `brace-expansion@5.0.9` (ou maior), `minimatch@10.2.6`, `nanoid@3.3.18`, `postcss@8.5.26` (ou maior). Se `package.json` aparecer no diff, `git checkout -- package.json` e repetir; se algum dos quatro **não** subir, PARE — o range declarado não cobre a correção e `overrides` é decisão do João (D2), não deste plano.

- [ ] **Step 3: O que o CI roda**

```bash
pnpm install --frozen-lockfile
pnpm audit
pnpm lint && pnpm test && pnpm build
```

Esperado: install sem reescrever o lockfile; `No known vulnerabilities found`; lint, suíte (inclui `compose-prod.test.ts` e `repo-docs-refs.test.ts`) e build verdes.

- [ ] **Step 4: Commit e push**

```bash
cd /home/jvbat/projetos/lotus-infra
git add frontend/pnpm-lock.yaml
git commit -m "fix(deps): sobe brace-expansion, minimatch, nanoid e postcss no lockfile

Sete advisories transitivas de devDeps (pnpm audit), todas com correcao
dentro dos ranges ja declarados; package.json intacto. E o que o audit-dev,
agora decidindo, exige para a PR ficar verde."
git push
sleep 20
RUN=$(gh run list --branch chore/prontidao-pre-nuvem --limit 1 --json databaseId --jq '.[0].databaseId')
gh run watch "$RUN" --exit-status
gh run view "$RUN" --json conclusion,jobs --jq '"run: \(.conclusion)", (.jobs[] | "\(.name)\t\(.conclusion)")'
echo "RUN_VERDE=$RUN"
```

Esperado: `run: success`, os cinco jobs `success`, `audit-dev` incluído. Guardar `RUN_VERDE`.

---

### Task 3: `scripts/provar-release.sh` — a sequência do host, executável

**Files:**
- Create: `scripts/provar-release.sh` (modo `100755`)
- Create: `frontend/tests/provar-release.test.ts`

**Interfaces:**
- Consumes: `docker-compose.prod.yml` (variáveis `LOTUS_IMAGE`, `LOTUS_WEB_IMAGE`, `LOTUS_ENV_FILE`, `LOTUS_HTTP_PORT`), `docker-compose.prod-probe.yml`, `docker/probe.env` — entregues no item 10, **não alterados**.
- Produces: `scripts/provar-release.sh <sha>` — exit `0` só com `nginx` `healthy` e `GET /up` 200 pelo par pedido; `2` para uso errado; `1` para pré-condição ou prova que falha. Variável `LOTUS_RELEASE_OWNER` sobrescreve o dono lido do remote `upstream`. As Tasks 6 e 7 o executam.

- [ ] **Step 1: A catraca, antes do script**

Criar `frontend/tests/provar-release.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

/**
 * `scripts/provar-release.sh` é a especificação executável da sequência que o
 * servidor fará no deploy (login → pull → migrate → up → /up). Ele atravessa
 * o espelho e roda contra o registry corporativo, então as propriedades que o
 * tornam PROVA — e não só mais um `up` — ganham catraca (lição 19): nada é
 * construído localmente, nada é puxado por baixo dos panos no `up`, o projeto
 * Compose é próprio, o env é o de sonda e a máquina volta ao que era.
 *
 * Conferência textual pelo mesmo motivo do compose-prod.test.ts: o
 * comportamento se prova rodando o script (o plano do bloco faz isso, duas
 * vezes); a catraca existe para a regressão silenciosa — alguém tirar o
 * `--pull never` "porque estava lento" e a prova passar a rodar outra imagem.
 */
const RAIZ = resolve(__dirname, '..', '..')
const CAMINHO = join(RAIZ, 'scripts', 'provar-release.sh')
const SCRIPT = readFileSync(CAMINHO, 'utf8')
const semComentarios = SCRIPT.split(/\r?\n/)
  .filter((linha) => !/^\s*#/.test(linha))
  .join('\n')

describe('scripts/provar-release.sh', () => {
  it('é executável', () => {
    expect(statSync(CAMINHO).mode & 0o111).not.toBe(0)
  })

  it('falha alto em erro, variável indefinida e pipe quebrado', () => {
    expect(semComentarios).toMatch(/^set -euo pipefail$/m)
  })

  it('sobe num projeto Compose próprio, com o compose de produção e o overlay de sonda', () => {
    expect(semComentarios).toContain('PROJETO=lotus-release')
    expect(semComentarios).toContain(
      'docker compose -p "$PROJETO" -f docker-compose.prod.yml -f docker-compose.prod-probe.yml',
    )
  })

  it('aponta o app para o env de sonda e a porta 8081', () => {
    expect(semComentarios).toContain('LOTUS_ENV_FILE=docker/probe.env')
    expect(semComentarios).toContain('PORTA=8081')
    expect(semComentarios).toContain('LOTUS_HTTP_PORT="$PORTA"')
  })

  it('exige os dois manifestos antes de tocar o Docker local', () => {
    expect(semComentarios).toContain('docker manifest inspect')
  })

  it('reproduz o fluxo de deploy: pull, migrate, up — e o up não constrói nem puxa nada', () => {
    const pull = semComentarios.indexOf('compose pull')
    const migrate = semComentarios.indexOf('php artisan migrate --force')
    const up = semComentarios.indexOf('up -d --no-build --pull never')
    expect(pull).toBeGreaterThan(-1)
    expect(migrate).toBeGreaterThan(pull)
    expect(up).toBeGreaterThan(migrate)
  })

  it('julga por GET /up 200 e imprime os dois RepoDigests', () => {
    expect(semComentarios).toContain('/up')
    expect(semComentarios).toContain('RepoDigests')
  })

  it('derruba o projeto com down -v em trap, com sucesso ou sem', () => {
    expect(semComentarios).toContain('down -v')
    expect(semComentarios).toMatch(/^trap limpar EXIT$/m)
  })
})
```

- [ ] **Step 2: Ver a catraca reprovar**

```bash
cd /home/jvbat/projetos/lotus-infra/frontend
pnpm vitest run tests/provar-release.test.ts
```

Esperado: FAIL — `ENOENT ... scripts/provar-release.sh` (o `readFileSync` de topo lança antes de qualquer `it`).

- [ ] **Step 3: O script**

Criar `scripts/provar-release.sh`:

```bash
#!/usr/bin/env bash
#
# Prova que o par de imagens publicado no GHCR para um SHA SOBE e responde,
# pela mesma sequencia que o servidor de producao fara:
#
#   login -> pull -> migrate -> up -> /up
#
# Por que existe: o job `image` verde diz que o par EXISTE no registry, nao que
# ele roda. Ate 2026-08-29 ninguem tinha puxado o par corporativo -- as provas
# do runtime (item 10) usaram imagem construida localmente. Este script e a
# especificacao executavel do que o host fara no deploy (item 12), e roda aqui,
# sem nuvem: MySQL, MinIO e Mailpit vem do overlay de sonda.
#
# O que ele NAO faz, de proposito: nao constroi imagem (`--no-build`), nao puxa
# nada por baixo dos panos no `up` (`--pull never`), nao toca a stack de dev
# (projeto Compose proprio, `lotus-release`) e nao deixa nada para tras
# (`down -v` em trap, com sucesso ou sem).
#
# Uso:
#   scripts/provar-release.sh <sha de 40 hexadecimais>
#
# O dono do registry sai do remote `upstream` (o corporativo, em minusculas,
# como o job `image` escreve). Para provar o par de outro dono:
#   LOTUS_RELEASE_OWNER=andred21 scripts/provar-release.sh <sha>
#
# Credencial: o pacote corporativo e privado. Antes de rodar, `docker login
# ghcr.io -u <usuario> --password-stdin` com um PAT classico de escopo
# `read:packages`. O token vive no credential store do Docker, nunca em
# arquivo do repositorio.
#
# Portas: a sonda ocupa 8081 (nginx), 9002 (MinIO) e 8026 (Mailpit) -- as do
# offset +1 do .env.example. Ocupadas, o Compose falha alto com "port is
# already allocated" (ADR-13) e o trap limpa o que chegou a subir.
set -euo pipefail

SHA="${1:-}"
if [ ${#SHA} -ne 40 ] || [ -n "$(printf '%s' "$SHA" | tr -d '0-9a-f')" ]; then
  echo "uso: scripts/provar-release.sh <sha de 40 hexadecimais>" >&2
  exit 2
fi

RAIZ=$(git rev-parse --show-toplevel)
cd "$RAIZ"

if [ -n "${LOTUS_RELEASE_OWNER:-}" ]; then
  DONO="$LOTUS_RELEASE_OWNER"
else
  DONO=$(git remote get-url upstream 2>/dev/null \
    | sed -E 's#^git@github\.com:##; s#^https://github\.com/##; s#/.*$##') || DONO=""
fi
DONO="${DONO,,}"
if [ -z "$DONO" ]; then
  echo "erro: nao ha remote upstream para ler o dono do registry; informe LOTUS_RELEASE_OWNER=<dono>." >&2
  exit 2
fi

APP="ghcr.io/$DONO/lotus-app:$SHA"
WEB="ghcr.io/$DONO/lotus-web:$SHA"
PROJETO=lotus-release
PORTA=8081

compose() {
  LOTUS_IMAGE="$APP" LOTUS_WEB_IMAGE="$WEB" LOTUS_ENV_FILE=docker/probe.env LOTUS_HTTP_PORT="$PORTA" \
    docker compose -p "$PROJETO" -f docker-compose.prod.yml -f docker-compose.prod-probe.yml "$@"
}

limpar() {
  echo "==> derrubando o projeto $PROJETO (down -v)"
  compose down -v --remove-orphans >/dev/null 2>&1 || true
}
trap limpar EXIT

# ── pre-condicao: os dois manifestos, antes de tocar o Docker local ──────────
echo "==> conferindo os manifestos de $SHA em ghcr.io/$DONO"
for alvo in "$APP" "$WEB"; do
  if ! docker manifest inspect "$alvo" >/dev/null 2>&1; then
    echo "erro: nao foi possivel ler $alvo." >&2
    echo "      ou o par nao existe para este SHA (o job image nao terminou verde para ele)," >&2
    echo "      ou falta credencial de leitura: PAT classico com escopo read:packages e" >&2
    echo "        docker login ghcr.io -u <usuario> --password-stdin" >&2
    exit 1
  fi
done
echo "    app e web existem."

# ── a sequencia do host ──────────────────────────────────────────────────────
echo "==> pull"
compose pull --quiet

# `migrate` nao mora no entrypoint (item 10, D7): o fluxo de deploy e
# pull -> migrate -> up, e e ele que se prova aqui. `run` sobe as dependencias
# do app (mysql ate healthy, minio, gotenberg, clamav) antes de executar.
echo "==> migrate"
compose run --rm app php artisan migrate --force

echo "==> up"
compose up -d --no-build --pull never

# O healthcheck do nginx atravessa nginx -> FPM -> /up do Laravel; esperar por
# ele e esperar pela cadeia inteira. Teto de 150 s: start_period 30 s + 5
# tentativas x 15 s = 105 s no compose, com folga.
echo "==> esperando o nginx ficar healthy (ate 150 s)"
NGINX=$(compose ps -q nginx)
ESTADO="?"
for _ in $(seq 1 30); do
  ESTADO=$(docker inspect --format '{{.State.Health.Status}}' "$NGINX" 2>/dev/null || echo "?")
  [ "$ESTADO" = "healthy" ] && break
  if [ "$ESTADO" = "unhealthy" ]; then
    echo "erro: nginx unhealthy." >&2
    compose logs --tail 50 nginx app >&2 || true
    exit 1
  fi
  sleep 5
done
if [ "$ESTADO" != "healthy" ]; then
  echo "erro: nginx nao ficou healthy em 150 s (ultimo estado: $ESTADO)." >&2
  compose logs --tail 50 nginx app >&2 || true
  exit 1
fi

CODIGO=$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$PORTA/up" || echo "000")
if [ "$CODIGO" != "200" ]; then
  echo "erro: GET /up respondeu $CODIGO, esperado 200." >&2
  compose logs --tail 50 nginx app >&2 || true
  exit 1
fi

# O que esta rodando e o que foi puxado? O ID da imagem do container tem de
# ser o ID da imagem puxada por tag -- sem isso, um lotus-app antigo poderia
# estar respondendo o /up.
ID_APP=$(docker image inspect --format '{{.Id}}' "$APP")
ID_RODANDO=$(docker inspect --format '{{.Image}}' "$(compose ps -q app)")
if [ "$ID_APP" != "$ID_RODANDO" ]; then
  echo "erro: o container app roda $ID_RODANDO, mas a imagem puxada e $ID_APP." >&2
  exit 1
fi

echo ""
echo "==> RELEASE PROVADO: $SHA"
echo "    app  $(docker image inspect --format '{{index .RepoDigests 0}}' "$APP")"
echo "    web  $(docker image inspect --format '{{index .RepoDigests 0}}' "$WEB")"
echo "    GET http://127.0.0.1:$PORTA/up -> $CODIGO"
```

```bash
chmod +x /home/jvbat/projetos/lotus-infra/scripts/provar-release.sh
```

- [ ] **Step 4: Catraca verde**

```bash
cd /home/jvbat/projetos/lotus-infra/frontend
pnpm vitest run tests/provar-release.test.ts
pnpm lint
```

Esperado: 8 testes PASS; lint verde.

- [ ] **Step 5: As saídas de erro, sem tocar o Docker**

```bash
cd /home/jvbat/projetos/lotus-infra
scripts/provar-release.sh; echo "exit=$?"
scripts/provar-release.sh abc; echo "exit=$?"
scripts/provar-release.sh 0000000000000000000000000000000000000000; echo "exit=$?"
docker compose -p lotus-release ps -q | wc -l
```

Esperado: as duas primeiras imprimem `uso: scripts/provar-release.sh <sha de 40 hexadecimais>` e `exit=2` (sem a linha de "derrubando" — o trap ainda não foi armado); a terceira imprime `conferindo os manifestos de 0000… em ghcr.io/gatika-cl`, `erro: nao foi possivel ler ghcr.io/gatika-cl/lotus-app:0000…`, as três linhas de orientação, depois `derrubando o projeto lotus-release (down -v)` e `exit=1`; e `0` containers no projeto.

- [ ] **Step 6: A prova real, contra o par pessoal (público — não precisa de PAT)**

Pré-condição: `docker compose ps` desta árvore vazio (offset +1 colide com a sonda).

```bash
cd /home/jvbat/projetos/lotus-infra
docker compose ps --format '{{.Service}}' | wc -l      # 0
LOTUS_RELEASE_OWNER=andred21 scripts/provar-release.sh 37e0e2d42d88a6e6775d6ef9b3afa17e991dd539 \
  2>&1 | tee /tmp/claude-1000/-home-jvbat-projetos-lotus-infra/d8bddda0-76e0-4c0c-ac28-9f7d27c38d7f/scratchpad/prova-pessoal-37e0e2d4.log
echo "exit=${PIPESTATUS[0]}"
docker compose -p lotus-release ps -q | wc -l
```

Esperado (3–6 min: pull do par + arranque do MySQL + migrate + healthcheck): `app e web existem.`, `pull`, `migrate` com a lista de migrations `DONE`, `up`, `esperando o nginx…`, e no fim

```
==> RELEASE PROVADO: 37e0e2d42d88a6e6775d6ef9b3afa17e991dd539
    app  ghcr.io/andred21/lotus-app@sha256:…
    web  ghcr.io/andred21/lotus-web@sha256:…
    GET http://127.0.0.1:8081/up -> 200
==> derrubando o projeto lotus-release (down -v)
```

`exit=0` e `0` containers depois. Se falhar por `port is already allocated`, a stack de dev desta árvore está de pé: `docker compose down` e repetir. Se `migrate` falhar em `Connection refused`, o `service_healthy` do overlay não segurou — é achado do item 10, registrar e parar.

- [ ] **Step 7: Commit e push**

```bash
git add scripts/provar-release.sh frontend/tests/provar-release.test.ts
git commit -m "feat(release): scripts/provar-release.sh puxa e executa o par publicado por SHA

login -> pull -> migrate -> up -> /up sobre docker-compose.prod.yml + overlay de
sonda, projeto Compose proprio, --no-build e --pull never, down -v em trap.
Exit 0 so com nginx healthy e /up 200 pelo par pedido; imprime os RepoDigests.
Catraca textual em frontend/tests (licao 19). Provado contra o par pessoal
37e0e2d4 nesta maquina."
git push
```

O run da PR deve seguir verde (o `frontend` roda a catraca nova).

---

### Task 4: Docs — o CI passa a ser legível, e a `P-62` diz a verdade

**Files:**
- Modify: `CONTRIBUINDO.md` (linha 28 e fim do arquivo)
- Modify: `.githooks/pre-push:68`
- Modify: `docs/superpowers/pendencias/abertas.md` (ficha `P-62`, linhas 602–634)
- Modify: `docs/superpowers/pendencias/README.md:65`

**Interfaces:**
- Consumes: o contrato do script da Task 3 (nome, variável `LOTUS_RELEASE_OWNER`, portas, exit codes).
- Produces: as duas seções que a spec §4.4 pede; nada de código.

- [ ] **Step 1: `CONTRIBUINDO.md` — "cinco gates" ganha "todos decidem"**

Substituir a linha 28–29 (`**1. Trabalho e branch.** Push de branch é livre; o CI roda os cinco gates no` / `` `pull_request`. ``) por:

```markdown
**1. Trabalho e branch.** Push de branch é livre e **não dispara CI**; abrir a PR
roda os cinco gates (`backend`, `frontend`, `types-drift`, `audit-prod`,
`audit-dev`), e **todos decidem** — ver "Como ler o CI", abaixo.
```

- [ ] **Step 2: `CONTRIBUINDO.md` — as duas seções, no fim do arquivo**

Acrescentar após o último parágrafo ("Nada disso é substituto de branch protection…"):

````markdown

## Como ler o CI

Um workflow só, `.github/workflows/ci.yml`, com sete jobs e dois gatilhos —
`pull_request` para `main` e `push` em `main`. Nada mais dispara nada: push de
branch sem PR não roda job nenhum.

| Job | Decide o quê | Roda em |
|---|---|---|
| `backend` | `php artisan test` (sqlite `:memory:`) | PR e push |
| `frontend` | `pnpm install --frozen-lockfile`, `lint`, `test`, `build` | PR e push |
| `types-drift` | `generated.ts` é o que `typescript:transform` produz (lei §5.3) | PR e push |
| `audit-prod` | advisory em dependência de **produção** (`composer audit --no-dev`, `pnpm audit --prod`) | PR e push |
| `audit-dev` | advisory em **qualquer** dependência, inclusive de ferramenta | PR e push |
| `procedencia` | o commit entrou por PR mesclado, ou é espelho com `Source-Commit` conferido | só push |
| `image` | constrói e publica `ghcr.io/<repo>-app:<sha>` e `-web:<sha>` | só push em `main`, atrás dos seis |

**Todo job que roda decide.** Em `pull_request` rodam cinco e qualquer vermelho
reprova o run. Em `push` em `main` entra o sexto, `procedencia`, e o `image` só
roda com os seis verdes — **o par de imagens só existe para SHA que passou em
tudo.**

Cor por cor:

- **verde** — o commit pode entrar em `main` (PR) ou virou par publicado (push).
- **vermelho** — bloqueia o merge e, em `main`, segura a imagem. Não existe
  vermelho "informativo": até 2026-08-29 o `audit-dev` rodava em
  `continue-on-error` e pintava o X em todo run sem decidir nada. Acabou, por
  decisão registrada no comentário do job.
- **`cancelled`** numa PR — você fez push novo na mesma PR e o run antigo foi
  cancelado (`concurrency` com `cancel-in-progress`). Não é falha; olhe o run
  mais novo. Em `push` para `main` nada é cancelado, de propósito: um segundo
  push cancelaria a publicação do primeiro no meio.
- **`skipped`** em `image` ou `procedencia` numa PR — esperado; só existem em
  `push`.

`audit-dev` vermelho é advisory em dependência transitiva, quase sempre de
ferramenta. A saída é o bump no lockfile, nunca desligar o check:

```bash
cd frontend
pnpm audit                                    # quem, por qual caminho, corrigido em qual versão
pnpm update <pacote> [<pacote>...]            # só o lockfile muda; package.json fica intacto
pnpm install --frozen-lockfile && pnpm audit  # exatamente o que o CI roda
```

Se a correção exigir versão fora do range declarado em `package.json`, é
decisão sobre a dependência direta — não se resolve com `pnpm.overrides` por
conta própria (D2 do bloco `prontidao-pre-nuvem`).

## Provar um release

`image` verde diz que o par existe no GHCR. Não diz que ele sobe. A prova é
puxar e executar o par **pela mesma sequência que o servidor fará**
(`login → pull → migrate → up → /up`), e ela está versionada:

```bash
scripts/provar-release.sh <sha-de-40-hex>
```

O dono do registry sai do remote `upstream` (`gatika-cl`, em minúsculas, como
o job `image` escreve); `LOTUS_RELEASE_OWNER=andred21` prova o par pessoal. O
script sobe o projeto Compose `lotus-release` com `docker-compose.prod.yml` +
`docker-compose.prod-probe.yml` (MySQL, MinIO e Mailpit de sonda,
`docker/probe.env`) na porta **8081**, com `--no-build` e `--pull never` —
nenhuma `lotus-*:local` é construída; o que roda é o par pedido, e o script
confere o ID da imagem em execução contra o ID puxado. Termina `0` só com o
`nginx` `healthy` e `GET /up` 200; imprime os dois `RepoDigest`; e derruba
tudo com `down -v` ao sair, com sucesso ou sem.

**Credencial.** O pacote corporativo é privado. Leitura pede PAT **clássico**
com escopo `read:packages` (fine-grained não lê GHCR), de usuário com acesso a
`Gatika-CL/lotus`:

```bash
docker login ghcr.io -u <usuario> --password-stdin   # cole o PAT, Enter, Ctrl-D
docker manifest inspect ghcr.io/gatika-cl/lotus-app:<sha> > /dev/null && echo ok
```

O token vive no credential store do Docker desta máquina e **nunca** num
arquivo do repositório. O servidor terá credencial própria, só de leitura.

**Portas.** A sonda ocupa `8081`, `9002` e `8026` — as do offset +1 do
`.env.example`. A árvore que usa esse offset derruba a stack de dev antes;
colisão faz o Compose falhar alto com `port is already allocated`, e o `trap`
limpa o que chegou a subir.
````

- [ ] **Step 3: `.githooks/pre-push` — cinco gates**

Na linha 68, trocar `O merge roda no servidor, com os quatro gates verdes antes.` por `O merge roda no servidor, com os cinco gates verdes antes.`

Provar pela própria mensagem, simulando o que o git manda pelo stdin:

```bash
cd /home/jvbat/projetos/lotus-infra
printf 'refs/heads/x %s refs/heads/main 0000000000000000000000000000000000000000\n' "$(git rev-parse HEAD)" \
  | .githooks/pre-push origin git@github.com:Andred21/lotus.git; echo "exit=$?"
```

Esperado: `pre-push RECUSOU: push direto para main em 'origin'`, a linha `O merge roda no servidor, com os cinco gates verdes antes.` e `exit=1`. Nada foi enviado — o hook só leu o stdin.

- [ ] **Step 4: `P-62` — a emenda datada**

Em `docs/superpowers/pendencias/abertas.md`, na ficha `## P-62`:

(a) trocar a linha do gatilho

```markdown
**Bloco:** — (fora de bloco) · **Quem decide:** João · **Gatilho:** orçamento para GitHub Team (ou
decisão de tornar o repositório público), ou **2026-10-31**, o que vier primeiro.
```

por

```markdown
**Bloco:** — (fora de bloco) · **Quem decide:** João · **Gatilho:** orçamento para GitHub Team, ou
a decisão do João sobre a visibilidade de `Andred21/lotus` (emenda de 2026-08-29, abaixo), ou
**2026-10-31**, o que vier primeiro.
```

(b) no parágrafo "**Fecha quando**", trocar `os quatro` / `required checks (`backend`, `frontend`, `types-drift`, `audit-prod`)` por `os cinco` / `required checks (`backend`, `frontend`, `types-drift`, `audit-prod`, `audit-dev`)`.

(c) acrescentar, **antes** de `## P-30`, o parágrafo:

```markdown
**Emenda de 2026-08-29 (bloco `prontidao-pre-nuvem`, item 20).** A ficha diz "a `main` dos dois
repositórios não tem branch protection — plano free recusa a API". Medido nesta data: `GET
/repos/Andred21/lotus` responde `"visibility": "public"`, e `ghcr.io/andred21/lotus-app:<sha>`
entrega manifesto **sem autenticação**. O 403 foi medido só em `Gatika-CL/lotus`; **no pessoal,
público, a API aceitaria** — protection é grátis em repositório público. Ou seja: o repositório que
esta ficha registra como fechado por confidencialidade está aberto, e a régua que ele teria de graça
não foi ligada. O João **adiou** a decisão (tornar privado; manter público e ligar protection; ou
manter como está) e o bloco não mudou visibilidade nem protection. Quando protection for ligada onde
couber, os required checks são **cinco**: `audit-dev` decide desde 2026-08-29 (D1 da spec do item
20) — o `image` já depende dele.
```

- [ ] **Step 5: Índice das pendências**

Em `docs/superpowers/pendencias/README.md:65`, trocar a célula de gatilho `orçamento para GitHub Team (ou decisão de abrir o repositório); revisar 2026-10-31` por `orçamento para GitHub Team, ou decisão do João sobre a visibilidade de `Andred21/lotus` (público hoje, medido em 2026-08-29); revisar 2026-10-31`.

- [ ] **Step 6: Catracas e commit**

```bash
cd /home/jvbat/projetos/lotus-infra/frontend && pnpm test
cd /home/jvbat/projetos/lotus-infra
grep -n "quatro gates" CONTRIBUINDO.md .githooks/pre-push; echo "(vazio acima = ok)"
git add CONTRIBUINDO.md .githooks/pre-push docs/superpowers/pendencias/abertas.md docs/superpowers/pendencias/README.md
git commit -m "docs: como ler o CI, como provar um release, e a P-62 diz que o pessoal esta publico

CONTRIBUINDO.md ganha as duas secoes; 'cinco gates' passa a dizer que todos
decidem; o pre-push troca quatro por cinco. P-62 registra, datada, a
divergencia medida em 2026-08-29 (repositorio pessoal publico, protection
possivel de graca) com a decisao adiada pelo Joao."
git push
sleep 20
RUN=$(gh run list --branch chore/prontidao-pre-nuvem --limit 1 --json databaseId --jq '.[0].databaseId')
gh run watch "$RUN" --exit-status
```

Esperado: suíte verde (`repo-docs-refs` não lê `CONTRIBUINDO.md`, mas lê `docs/README.md`, intacto); `grep` vazio; run da PR verde.

---

### Task 5: Fatia 1 fecha — merge, e o `image` atrás do `audit-dev` em `main`

Mesclar é passo do plano, não do fechamento: é a única forma de disparar o run `push` que a spec §7.1 pede, e o espelho (Task 7) publica a árvore **deste** merge. Mesmo precedente do item 11 (Task 8 do plano arquivado).

**Files:** nenhum nesta árvore até o Step 5.

**Interfaces:**
- Consumes: a PR das Tasks 1–4, verde.
- Produces: `origin/main` = merge da PR 1, com run `push` `success` e par pessoal publicado; a branch desta árvore com a `main` mesclada para dentro, pronta para a PR 2.

- [ ] **Step 1: Tudo verde antes de mesclar**

```bash
cd /home/jvbat/projetos/lotus-infra
gh pr checks
```

Esperado: `backend`, `frontend`, `types-drift`, `audit-prod`, **`audit-dev`** em `pass`. Qualquer outro estado → não mesclar.

- [ ] **Step 2: Mesclar (sem apagar a branch — a PR 2 sai dela)**

```bash
gh pr merge --merge
```

- [ ] **Step 3: O run `push` em `main`**

```bash
sleep 20
RUN=$(gh run list --branch main --limit 1 --json databaseId,headSha --jq '.[0] | "\(.databaseId) \(.headSha)"')
echo "$RUN"
gh run watch "${RUN%% *}" --exit-status
gh run view "${RUN%% *}" --json conclusion,jobs --jq '"run: \(.conclusion)", (.jobs[] | "\(.name)\t\(.conclusion)")'
echo "RUN_MAIN=${RUN%% *}  SHA_MERGE=${RUN##* }"
```

Esperado (10–15 min pelo build da imagem): `run: success`; sete jobs `success`, `audit-dev` e `image` incluídos. Guardar `RUN_MAIN` e `SHA_MERGE`. A dependência `image ← audit-dev` não aparece na API de jobs: a evidência é o `needs:` no `ci.yml` **desse SHA** mais o run verde —

```bash
git fetch --quiet origin main
git show "origin/main:.github/workflows/ci.yml" | grep -n "needs:"
```

Esperado: `needs: [backend, frontend, types-drift, audit-prod, audit-dev, procedencia]`.

- [ ] **Step 4: O par pessoal do merge existe**

```bash
SHA_MERGE=$(git rev-parse origin/main)
docker manifest inspect "ghcr.io/andred21/lotus-app:$SHA_MERGE" >/dev/null && echo "app OK"
docker manifest inspect "ghcr.io/andred21/lotus-web:$SHA_MERGE" >/dev/null && echo "web OK"
```

Esperado: `app OK` e `web OK`.

- [ ] **Step 5: Trazer a `main` mesclada para a branch desta árvore**

```bash
git status --short          # limpo
git merge --no-edit origin/main
git log --oneline -3
```

Esperado: um merge commit (ou fast-forward) sem conflito — a `main` só tem o merge da própria PR por cima do que a branch já tinha. A branch segue viva para a PR 2.

---

### Task 6: A credencial, e o script contra o par corporativo que já existe

Duas coisas se provam aqui, separadas de propósito: que a **credencial** lê o pacote corporativo, e que o **script** funciona contra um par corporativo — o de `3d158773…`, que existe desde 2026-08-25 e ninguém nunca puxou. Só depois disso (Task 7) o espelho novo entra; se algo falhar aqui, o achado é da credencial ou do script, não do espelho.

**Files:** nenhum.

**Interfaces:**
- Consumes: `scripts/provar-release.sh` (Task 3); o par `ghcr.io/gatika-cl/lotus-{app,web}:3d158773e92ee7cd25abe0b03c8464f05d629eb9`.
- Produces: credencial de leitura no credential store do Docker; primeira execução do script contra o corporativo, com saída guardada para a Task 8.

- [ ] **Step 1: PARE — passo do João**

O João cria, em GitHub → Settings → Developer settings → Personal access tokens → **Tokens (classic)**, um token com **um** escopo: `read:packages`. Expiração curta (30 dias basta para este bloco; o host do item 10/12 terá credencial própria). Depois, nesta máquina:

```bash
docker login ghcr.io -u Andred21 --password-stdin    # cola o PAT, Enter, Ctrl-D
```

Isso **sobrescreve** a entrada `ghcr.io` que já existe no credential store (`desktop.exe`) e que hoje responde `denied` para o corporativo. O token não é colado em terminal com histórico compartilhado, não vai para `audits/`, não vai para arquivo nenhum do repositório.

- [ ] **Step 2: Readback — a credencial lê o pacote corporativo**

```bash
docker manifest inspect ghcr.io/gatika-cl/lotus-app:3d158773e92ee7cd25abe0b03c8464f05d629eb9 >/dev/null && echo "app OK"
docker manifest inspect ghcr.io/gatika-cl/lotus-web:3d158773e92ee7cd25abe0b03c8464f05d629eb9 >/dev/null && echo "web OK"
```

Esperado: `app OK` e `web OK`. Se ainda for `denied` com o PAT novo, o problema não é escopo, é **acesso ao pacote**: em `github.com/orgs/Gatika-CL/packages`, o pacote `lotus-app`/`lotus-web` precisa estar ligado ao repositório `Gatika-CL/lotus` (herda o acesso) ou dar `read` explícito ao usuário. Registrar o que foi medido e parar até o João ajustar.

- [ ] **Step 3: O script contra o par corporativo existente**

Pré-condição: `docker compose ps` desta árvore vazio.

```bash
cd /home/jvbat/projetos/lotus-infra
docker compose ps --format '{{.Service}}' | wc -l      # 0
scripts/provar-release.sh 3d158773e92ee7cd25abe0b03c8464f05d629eb9 \
  2>&1 | tee /tmp/claude-1000/-home-jvbat-projetos-lotus-infra/d8bddda0-76e0-4c0c-ac28-9f7d27c38d7f/scratchpad/prova-corp-3d158773.log
echo "exit=${PIPESTATUS[0]}"
docker compose -p lotus-release ps -q | wc -l
```

Esperado: `==> RELEASE PROVADO: 3d158773e92ee7cd25abe0b03c8464f05d629eb9`, dois digests `ghcr.io/gatika-cl/lotus-app@sha256:…` / `lotus-web@sha256:…`, `GET … /up -> 200`, `exit=0`, `0` containers depois. **Metade do DoD 3.**

---

### Task 7: Espelho de onze PRs, CI corporativo, e a prova que o DoD pede

**Files:** nenhum nesta árvore. Um commit de espelho em `Gatika-CL/main`.

**Interfaces:**
- Consumes: `origin/main` = merge da Task 5, com run `success`; credencial da Task 6.
- Produces: `upstream/main` com a árvore filtrada do merge; par corporativo `<sha-corp>` publicado; segunda execução do script, com saída guardada.

- [ ] **Step 1: Simular — a árvore que iria**

```bash
cd /home/jvbat/projetos/lotus-infra
git fetch --quiet origin main
scripts/espelhar-corporativo.sh --simular 2>&1 | tee /tmp/claude-1000/-home-jvbat-projetos-lotus-infra/d8bddda0-76e0-4c0c-ac28-9f7d27c38d7f/scratchpad/espelho-simular.log
```

Esperado: `CI verde.`; `==> arvore filtrada de <sha-merge-curto> (<hash-da-arvore>)`; a lista da raiz **sem** `.claude`, `.agents`, `.githooks`, `docs`, `CONTRIBUINDO.md`, `CLAUDE.md`, e **com** `scripts` (só `provar-release.sh` — `espelhar-corporativo.sh` está na exclusão); totais na casa de 1270 arquivos filtrados de ~1540. Guardar `<hash-da-arvore>`:

```bash
ARVORE=$(grep -oE '\(([0-9a-f]{40})\)' /tmp/claude-1000/-home-jvbat-projetos-lotus-infra/d8bddda0-76e0-4c0c-ac28-9f7d27c38d7f/scratchpad/espelho-simular.log | tr -d '()')
git ls-tree -r --name-only "$ARVORE" scripts frontend/tests | grep -E "provar-release|espelhar|repo-docs-refs"
```

Esperado: `scripts/provar-release.sh` e `frontend/tests/provar-release.test.ts` presentes; `espelhar-corporativo.sh` e `repo-docs-refs.test.ts` ausentes.

- [ ] **Step 2: Publicar — um commit, onze PRs**

Ação externa. O João está presente (o plano foi aprovado com este passo declarado).

```bash
scripts/espelhar-corporativo.sh 2>&1 | tee /tmp/claude-1000/-home-jvbat-projetos-lotus-infra/d8bddda0-76e0-4c0c-ac28-9f7d27c38d7f/scratchpad/espelho-publicar.log
git fetch --quiet upstream main
SHA_CORP=$(git rev-parse upstream/main)
echo "SHA_CORP=$SHA_CORP"
git log -1 --format='%s%n%(trailers:key=Source-Commit)' upstream/main
```

Esperado: `==> commit de espelho <sha> (fonte <sha-merge-curto>)` e `==> publicado em Gatika-CL/lotus`; o trailer `Source-Commit: <sha-merge-completo>`. Guardar `SHA_CORP`.

- [ ] **Step 3: DoD 2 — a árvore é a mesma**

```bash
[ "$(git rev-parse "upstream/main^{tree}")" = "$ARVORE" ] && echo "arvore identica: $ARVORE"
```

Esperado: `arvore identica: <hash>`.

- [ ] **Step 4: CI corporativo — `procedencia` e `image`**

```bash
sleep 20
RUN_CORP=$(gh run list -R Gatika-CL/lotus --branch main --limit 1 --json databaseId,headSha --jq '.[0] | select(.headSha == "'"$SHA_CORP"'") | .databaseId')
echo "RUN_CORP=$RUN_CORP"
gh run watch -R Gatika-CL/lotus "$RUN_CORP" --exit-status
gh run view -R Gatika-CL/lotus "$RUN_CORP" --json conclusion,jobs --jq '"run: \(.conclusion)", (.jobs[] | "\(.name)\t\(.conclusion)")'
```

Esperado (10–15 min): `run: success`; sete jobs `success`; no log do `procedencia`: `release de espelho. Fonte: Andred21/lotus@<sha-merge> (identical em relacao a main de Andred21/lotus).` Se `procedencia` reprovar por "arvore carrega arquivo de desenvolvimento", a exclusão mudou entre a origem e o destino — parar e ler o log; nada foi publicado.

- [ ] **Step 5: DoD 3 — o par corporativo novo, puxado e executado aqui**

```bash
docker compose ps --format '{{.Service}}' | wc -l      # 0
scripts/provar-release.sh "$SHA_CORP" \
  2>&1 | tee "/tmp/claude-1000/-home-jvbat-projetos-lotus-infra/d8bddda0-76e0-4c0c-ac28-9f7d27c38d7f/scratchpad/prova-corp-${SHA_CORP:0:8}.log"
echo "exit=${PIPESTATUS[0]}"
docker compose -p lotus-release ps -q | wc -l
```

Esperado: `==> RELEASE PROVADO: <SHA_CORP>`, os dois digests `ghcr.io/gatika-cl/…@sha256:…`, `GET … /up -> 200`, `exit=0`, `0` containers depois.

---

### Task 8: Evidência datada e handoff

**Files:**
- Create: `docs/superpowers/audits/2026-08-29-prontidao-pre-nuvem.md`
- Modify: `docs/superpowers/state.md` (transição do `/executar-bloco`, "Ao concluir")

**Interfaces:**
- Consumes: `RUN_SONDA`, `RUN_VERDE` (Tasks 1–2), `RUN_MAIN` e `SHA_MERGE` (Task 5), `ARVORE`, `SHA_CORP`, `RUN_CORP` (Task 7) e os quatro logs do scratchpad.
- Produces: o relatório que o `/revisar-sprint` e o `/fechar-sprint` leem; `state.md` em `ready_for_review`.

- [ ] **Step 1: O relatório**

Criar `docs/superpowers/audits/2026-08-29-prontidao-pre-nuvem.md` com os valores reais no lugar dos `<…>`. Digests e SHAs **completos**; nenhum token, nenhuma linha de `docker login`.

```markdown
# Evidências — Prontidão pré-nuvem

> Bloco `prontidao-pre-nuvem` · item 20 · lane-b · 2026-08-29
> Cada seção prova um item do DoD da spec §7. Logs completos das quatro execuções do script ficaram
> no scratchpad da sessão; aqui entra o trecho decisivo de cada um.

## DoD 1 — CI legível: `audit-dev` decide e segura a imagem

| Passo | Run | Resultado |
|---|---|---|
| workflow mudado, lockfile ainda com 7 advisories (**sonda**) | [<RUN_SONDA>](https://github.com/Andred21/lotus/actions/runs/<RUN_SONDA>) | run `failure`, `audit-dev` **failure**, os outros quatro `success` |
| lockfile subido (`brace-expansion`, `minimatch`, `nanoid`, `postcss`) | [<RUN_VERDE>](https://github.com/Andred21/lotus/actions/runs/<RUN_VERDE>) | run `success`, cinco jobs `success` |
| merge em `main` — `push` | [<RUN_MAIN>](https://github.com/Andred21/lotus/actions/runs/<RUN_MAIN>) | sete jobs `success`; `image` com `needs` incluindo `audit-dev` no `ci.yml` de `<SHA_MERGE>` |

A sonda é a ordem das tasks (workflow antes do bump), não um commit sintético: o vermelho do
primeiro run é o mesmo vermelho que o `continue-on-error` escondia — agora ele reprova.
`pnpm audit` local depois do bump: `No known vulnerabilities found`; `pnpm install --frozen-lockfile`
passa com o lockfile novo; `package.json` sem diff.

## DoD 2 — espelho

- `origin/main@<SHA_MERGE>` (merge da PR 1) → `upstream/main@<SHA_CORP>`, trailer `Source-Commit: <SHA_MERGE>`.
- Árvore filtrada (`--simular`): `<ARVORE>` · `git rev-parse upstream/main^{tree}` = `<ARVORE>` ✔
- Arquivos: <N> no espelho, <M> na origem; raiz sem `.claude/`, `.agents/`, `.githooks/`, `docs/`, `CONTRIBUINDO.md`.
- CI corporativo: [<RUN_CORP>](https://github.com/Gatika-CL/lotus/actions/runs/<RUN_CORP>) — `procedencia` `success`
  (`release de espelho. Fonte: Andred21/lotus@<SHA_MERGE> (identical …)`), `image` `success`.

## DoD 3 — release provado

Três execuções de `scripts/provar-release.sh`, todas `exit 0`, todas com `docker compose -p lotus-release ps` vazio depois:

| Par | SHA | `app` digest | `web` digest | `/up` |
|---|---|---|---|---|
| pessoal (público; valida o script antes de qualquer credencial) | `37e0e2d42d88a6e6775d6ef9b3afa17e991dd539` | `sha256:<…>` | `sha256:<…>` | 200 |
| corporativo, par pré-existente (2026-08-25; nunca puxado até hoje) | `3d158773e92ee7cd25abe0b03c8464f05d629eb9` | `sha256:<…>` | `sha256:<…>` | 200 |
| corporativo, espelho novo | `<SHA_CORP>` | `sha256:<…>` | `sha256:<…>` | 200 |

Credencial: PAT clássico `read:packages`, criado pelo João em 2026-08-29, no credential store do
Docker desta máquina. Antes dele, `docker manifest inspect` do corporativo respondia `denied`.
Sequência executada em cada linha: `manifest inspect` (os dois) → `compose pull` → `run app php
artisan migrate --force` → `up -d --no-build --pull never` → `nginx` `healthy` em <t> s → `GET
http://127.0.0.1:8081/up` → ID da imagem do container = ID puxado → `down -v`.

## DoD 4 — catracas

`pnpm lint`, `pnpm test` (<K> arquivos, inclui `compose-prod`, `repo-docs-refs` e o novo
`provar-release`) e `pnpm build` verdes de `frontend/` no SHA `<SHA_MERGE>`; `pnpm install
--frozen-lockfile` passa.

## DoD 5 — docs

`CONTRIBUINDO.md` com "Como ler o CI" e "Provar um release"; `.githooks/pre-push` diz cinco gates;
`P-62` emendada em 2026-08-29 (pessoal público, decisão adiada; required checks passam a cinco);
`pendencias/README.md` com o gatilho novo. `state.md`, `backlog.md` e `progress.md` fecham na PR 2.

## O que NÃO foi provado

- Nada de AWS: MySQL, MinIO e Mailpit são os substitutos de dev do overlay.
- A régua de `main` segue compensada (`P-62`); o pessoal segue público.
- O item 12 continua sem host; o que ele herda daqui é a sequência executada e versionada.
```

- [ ] **Step 2: Handoff**

Conforme `/executar-bloco`, "Ao concluir": evidência no ledger, working tree coerente, e `state.md` (topo e `lanes.lane-b`) para

```yaml
workflow_state: ready_for_review
next_owner: claude
next_action: request_code_review
```

```bash
cd /home/jvbat/projetos/lotus-infra
git add docs/superpowers/audits/2026-08-29-prontidao-pre-nuvem.md docs/superpowers/state.md
git commit -m "docs(audit): evidencia da prontidao pre-nuvem -- sonda, espelho e tres releases provados

state.md: lane-b em ready_for_review."
git push
```

A revisão e a PR 2 (fechamento) são instruções posteriores.

---

## DoD end-to-end — spec §7 → onde se prova

| DoD | Onde |
|---|---|
| 1 — `audit-dev` verde, sonda reprova com run `failure`, `image` atrás dele em `main` | Task 1 Step 6 (sonda), Task 2 Step 4 (verde), Task 5 Step 3 (`push`) |
| 2 — `upstream/main^{tree}` = árvore filtrada; `procedencia` e `image` verdes no corporativo | Task 7 Steps 3–4 |
| 3 — script `0` com `/up` 200 e digests, contra `3d158773…` e o espelho novo; `ps` vazio depois | Task 6 Step 3, Task 7 Step 5 (mais o par pessoal na Task 3 Step 6) |
| 4 — `pnpm lint`/`test`/`build` verdes; `--frozen-lockfile` passa | Task 2 Step 3, Task 3 Step 4, Task 4 Step 6, e o job `frontend` em todo run |
| 5 — `CONTRIBUINDO.md`, `P-62`, `audits/`; estado coerente | Task 4, Task 8; `progress.md`/`backlog.md` no `/fechar-sprint` |

## Handoff de execução

**executor: claude**

Não é task mecânica de paths fechados:

1. **Tasks 5, 6 e 7 são ação externa e irreversível** — merge em `main`, publicação no GHCR pessoal, um commit de espelho no repositório da empresa e a publicação do par corporativo. Cada uma pede julgamento quando o observado diverge do esperado, e a Task 6 tem um passo que **para e espera o João** (o PAT).
2. **A Task 2 mexe em dependência**, ainda que de desenvolvimento, e tem uma saída que é decisão do João (range que não cobre a correção → D2).
3. **As Tasks 3, 6 e 7 sobem e derrubam stacks Docker nesta máquina**, com portas que colidem com a stack de dev desta árvore.

Não há `paths_autorizados`: o executor é Claude, com o ciclo Superpowers normal.
