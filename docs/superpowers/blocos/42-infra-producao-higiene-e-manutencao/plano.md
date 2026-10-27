# Higiene e manutenção da produção — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** limpar a produção e fechar as lacunas de higiene do que roda sozinho: poda de imagens no
deploy, retry do backup, consulta de backup que não confunde falha com bucket vazio, journald e apt,
reboot automático, política e lifecycle do S3, Q-1 e pnpm no portão.

**Architecture:** os scripts de `deploy/bin/` e o `user-data.sh` mudam com catraca em
`frontend/tests/`, provada por execução onde há gate (lição 19). A política e o lifecycle do S3
viram JSON versionado em `deploy/aws/`. O runbook e os ADRs registram as decisões. A produção é
mexida pelo João em duas tasks finais, e Claude confere só com leitura.

**Tech Stack:** bash (`set -euo pipefail`); vitest no projeto `repo` (ambiente `node`), com
`spawnSync` e falsos no `PATH`; AWS CLI v2; Docker 29 com o image store do containerd; Ubuntu 24.04
arm64 (`unattended-upgrades`, systemd-journald).

**Spec:** `docs/superpowers/blocos/42-infra-producao-higiene-e-manutencao/spec.md`

## Como este plano é despachado

- Cada task de código (1 a 8) vai para um subagente que vê **só** três coisas: o texto da task, o
  `## Global Constraints` e o `## Contexto comum dos implementadores`. O controlador cola as três no
  despacho. A task traz tudo o que o implementador precisa, e o bloco **Interfaces** diz o que os
  vizinhos esperam dela.
- As Tasks 9 e 10 são produção. Rodam na sessão principal, com o João.
- Ordem: G1 (Tasks 1, 2, 4, 5, 6 e 7, com pipeline de profundidade 1) → Task 3 → Task 8 → portão
  (`revisor-branch` sobre as Tasks 1 a 8) → Task 9 → Task 10. O detalhe está em
  `## Grupos paralelos` e `## Handoff de execução`.

## Decisões deste plano (Claude)

São escolhas que a spec deixou ao builder. O João pode vetar ao ler.

1. **Poda: quais imagens são candidatas.** Só tag de 40 hexadecimais nos três repositórios do
   Lotus. `latest`, `<none>` e qualquer outro repositório ficam. O que não tem tag sai pelo
   `docker image prune -f` do fim.
2. **Poda: falhas.** `docker image ls` que falha faz a poda sair 1 sem remover nada. `prune` que
   falha também sai 1. O deploy só avisa nos dois casos.
3. **Poda: onde entra no deploy.** Logo depois do `mv` do `CURRENT_SHA` e antes do `DEPLOY OK`,
   com a linha `==> poda de imagens`.
4. **Backup: espera entre tentativas.** 30 s, depois 60 s. A variável `LOTUS_BACKUP_ESPERA_S` existe
   para o teste e é validada como inteiro. Com três falhas, nenhuma chave é publicada em
   `LOTUS_BACKUP_SAIDA`.
5. **`verificar-backup.sh`: a consulta muda.** Passa a usar ``sort_by(Contents || `[]`, &LastModified)``.
   Foi medido em 2026-10-25, só leitura, num prefixo vazio do bucket de produção: a consulta atual
   sai 255 (`In function sort_by(), invalid type for value: None`), e a nova devolve `None` com
   saída 0. Sem essa troca, separar falha de vazio faria o bucket vazio ser lido como "consulta
   falhou".
6. **`user-data.sh`: como grava.** Uma função `gravar_se_mudou` grava cada arquivo só quando o
   conteúdo muda. O journald reinicia só quando o arquivo dele muda.
7. **S3: a catraca.** Asserção exata em `frontend/tests/s3-bucket.test.ts`, sem validador genérico.
8. **Docs além da lista da spec.**
   - O README ganha dois acréscimos que a spec não lista:
     - um parágrafo no §9 sobre o retry e a mensagem nova do `verificar-backup.sh`;
     - o §14.6 (alarme de disco) passa a apontar a poda do §16.1.
   - A lição 19 do `docs/README.md` ganha a emenda dos pares nominais novos, como os blocos 31, 32,
     34 e 13 fizeram.
9. **Limpeza única no host.** Roda o script por `sudo sh -c`. Sem isso, o `$(cat /opt/lotus/CURRENT_SHA)`
   expande no shell do `ubuntu`, que não lê o `/opt/lotus`, e a poda sai 2. O plano anterior tinha
   esse erro.
10. **Portão antes da produção.** Antes da Task 9, um `revisor-branch` revisa as Tasks 1 a 8. Achado
    Crítico ou Importante para a Task 9.

## Global Constraints

- **Lane.** Todo trabalho acontece na worktree `/home/jvbat/projetos/lotus-42-infra-producao-higiene-e-manutencao`,
  branch `infra/42-infra-producao-higiene-e-manutencao`.
- **Bucket.** `lotus-prod-760144413534`, em `sa-east-1`.
- **App.** `arn:aws:iam::760144413534:role/lotus-ec2`.
- **Infra.** `arn:aws:iam::760144413534:user/lotus-infra`, perfil `lotus` da AWS CLI local.
- **Prazos do S3.**
  - Documento: versão antiga em 7 dias.
  - `user-photos/`: 1 dia.
  - `backups/`: sem mudança (atual em 30 dias, versão antiga em 7, multipart em 7).
- **Imagens do Lotus.** `ghcr.io/gatika-cl/lotus-app`, `ghcr.io/gatika-cl/lotus-web` e
  `ghcr.io/gatika-cl/lotus-clamav`, com tag igual ao SHA de 40 hexadecimais minúsculos. Nunca
  `docker image rm -f`.
- **Host.**
  - journald com `SystemMaxUse=200M`.
  - apt com `APT::Periodic::AutocleanInterval "7";`.
  - Reboot automático às `08:30`, no relógio do host, que é UTC.
- **Backup.** Três tentativas de upload. IMDS com `AWS_METADATA_SERVICE_NUM_ATTEMPTS=3` e
  `AWS_METADATA_SERVICE_TIMEOUT=5`.
- **Lição 19 do `docs/README.md`.**
  - Todo gate tem uma sonda que reprova a catraca: `|| true` no gate, ou o `exit` apagado.
  - `indexOf`/`toContain` não contam como catraca de gate.
- **Produção.** Toda escrita em produção é do João. Claude confere por SSH (`ubuntu@18.230.53.197`,
  chave `~/.ssh/lotus-prod.pem`) e pela AWS CLI, só leitura.
- **Escopo proibido.** Nada em `backend/` nem em `frontend/src/`. Nenhuma dependência nova: nem
  pacote npm, nem pacote no host, nem `jq`.
- **Mensagens.** Texto que o plano fixa entre crases (mensagem, nome de arquivo, valor) é exato.

## Contexto comum dos implementadores

- **Onde.** A raiz da lane é `/home/jvbat/projetos/lotus-42-infra-producao-higiene-e-manutencao`.
  Os comandos abaixo partem dela. Nunca rode nada no main tree nem em outra lane.
- **Antes de editar:** rode `git status`. Arquivo sujo que não é seu → pare e reporte.
- **Testes do repositório.** Ficam em `frontend/tests/*.test.ts`, no projeto `repo` do vitest, em
  ambiente `node`.
  - Um arquivo: `cd frontend && pnpm exec vitest run tests/<arquivo>.test.ts`.
  - Todos: `cd frontend && pnpm exec vitest run --project repo`.
  - Os testes passam pelo `tsc`: o `frontend/tsconfig.node.json` inclui `tests/`, com
    `noUnusedLocals` e `noUnusedParameters`. Toda task que mexe em teste roda também
    `cd frontend && pnpm exec tsc -p tsconfig.node.json --noEmit` (sai 0, sem saída) e
    `cd frontend && pnpm exec eslint tests/<arquivo>.test.ts` (sai 0).
  - Não rode `pnpm install`: o `node_modules` da lane já existe.
- **Testes do harness.** `bash .claude/tests/run-all.sh`, da raiz da lane. O veredito está na última
  linha: `OK: …` ou `FALHOU: …`.
- **Teste por execução** (lição 19; o molde é `frontend/tests/conferir-golive.test.ts`).
  - `spawnSync('bash', [script])` com os falsos de `frontend/tests/fixtures/<nome>/` na frente do
    `PATH`.
  - Um `LOTUS_BASE` temporário, criado com `mkdtempSync(join(tmpdir(), …))` e apagado no
    `afterAll`.
  - O falso de fixture tem um cabeçalho dizendo de qual teste ele é. Ele anota cada chamada no log
    do caso, responde só o que o script lê e sai 1 com `nao previsto` para o resto.
  - Script e falso novos são executáveis: `chmod +x` antes do `git add`. Depois do commit, o
    `git ls-files -s` mostra `100755`.
- **Estilo de script.** Vale para `deploy/bin/*.sh` e `deploy/aws/user-data.sh`.
  - `set -euo pipefail` (o `user-data.sh` usa `-euxo`).
  - Comentário em português dizendo o **porquê**, como os vizinhos fazem.
  - Erros e avisos vão para o stderr, com os prefixos `erro:` e `aviso:`.
- **Sonda (lição 19), depois do commit da task.**
  1. Aplique a sonda que a task lista.
  2. Rode o teste e veja **FALHAR** no caso indicado.
  3. Desfaça com `git checkout -- <arquivo>`.
  4. Rode de novo, veja **PASSAR** e confira que o `git status` está limpo.

  Uma sonda que não reprova mostra uma catraca fraca. Nesse caso, corrija o teste, faça um commit
  novo `test(42): …` e repita a sonda.
- **Commit.** `git add` só nos paths exatos da task, nunca `-A` nem `.`. Use o assunto que a task
  fixa, mais o trailer `Co-Authored-By` do modelo que commita.
- **Report final.**
  - O que mudou.
  - A saída real do teste vermelho e a do verde.
  - A saída de cada sonda.
  - O SHA do commit.
  - Qualquer decisão que o plano não cobria, com o porquê.

## Review Focus

São os cinco casos que a spec implica e que mais provavelmente quebrariam alguém. Cada um tem um
teste numa task.

1. **Prefixo `backups/` vazio.** O CLI real sai 255 no `sort_by` sobre `null`. Com falha e vazio
   separados, o vazio tem de continuar lendo "nenhum backup", o gatilho do ADR-09.
   - Task 5: a consulta com ``Contents || `[]` ``. A catraca é textual, porque o falso não reproduz
     o CLI.
   - Task 5: o caso `bucket vazio segue com o gatilho do ADR-09`.
2. **Mesmo SHA promovido de novo, e rollback.** O anterior sai do ledger, nunca do `CURRENT_SHA`.
   Task 2, casos `mesmo SHA promovido de novo…` e `rollback…`.
3. **Docker fora durante a poda.** Se o `docker image ls` falha, a poda sai 1 sem remover nada. Um
   `done < <(docker …)` engoliria a falha e sairia 0. Task 2, caso `docker image ls falhando…`.
4. **Três falhas de upload.** O script sai 1, o dump some do `/tmp` e nenhuma chave vai para
   `LOTUS_BACKUP_SAIDA`. Sem isso, o deploy gravaria no ledger a chave de um dump que não existe.
   Task 4, caso `três falhas…`.
5. **Reexecutar o `user-data.sh` no host vivo.** Não reinicia o journald, não deixa `.novo` para
   trás, e arquivo igual não derruba o `set -e`. Task 6, caso de execução `higiene: grava…`.

## Mapa de arquivos

| Arquivo | Task | Responsabilidade |
|---|---|---|
| `.claude/scripts/lane.sh` | 1 | checagem 8 do portão do `abrir`: o pnpm existe |
| `.claude/tests/lane-abrir.tests.sh` | 1 | caso do pnpm fora do PATH |
| `CLAUDE.md` | 1 | linha do `corepack enable pnpm` no §6 |
| `deploy/bin/podar-imagens.sh` (novo) | 2 | a poda: guarda o SHA atual e o anterior |
| `frontend/tests/fixtures/podar-imagens/docker` (novo) | 2 | docker falso |
| `frontend/tests/podar-imagens.test.ts` (novo) | 2 | catraca por execução |
| `deploy/bin/deploy.sh` | 3 | chama a poda depois do `CURRENT_SHA` |
| `frontend/tests/deploy-sh.test.ts` | 3 | catraca textual da chamada |
| `deploy/bin/backup-db.sh` | 4 | retry do upload, folga de IMDS, `LOTUS_BASE` |
| `frontend/tests/backup-db.test.ts` | 4 | `describe` novo, por execução |
| `frontend/tests/fixtures/backup-db/docker` e `aws` (novos) | 4 | falsos |
| `deploy/bin/verificar-backup.sh` | 5 | consulta que falha ≠ bucket vazio; folga de IMDS |
| `frontend/tests/verificar-backup.test.ts` | 5 | casos novos e a asserção da consulta |
| `frontend/tests/fixtures/verificar-backup/aws` | 5 | cenário de consulta que falha; IMDS no log |
| `deploy/aws/user-data.sh` | 6 | os três arquivos de higiene do host |
| `frontend/tests/user-data.test.ts` | 6 | execução do trecho novo |
| `deploy/aws/s3-politica.json` e `s3-lifecycle.json` (novos) | 7 | configuração versionada do bucket |
| `frontend/tests/s3-bucket.test.ts` (novo) | 7 | catraca dos dois JSON |
| `deploy/aws/README.md` | 8 | §3, §3.1 (nova), §7, §9, §14.6, §15 e §16 (nova) |
| `docs/adrs.md` | 8 | emendas dos ADR-11 e ADR-14 |
| `docs/README.md` | 8 | emenda da lição 19 |
| `frontend/tests/runbook-higiene.test.ts` (novo) | 8 | catraca do runbook |
| `docs/superpowers/blocos/42-infra-producao-higiene-e-manutencao/execucao-producao.md` (novo) | 9, 10 | registro da produção |
| `docs/superpowers/blocos/42-infra-producao-higiene-e-manutencao/aceitacao.md` | 9, 10 | itens 1 a 5 |

---

### Task 1: pnpm no portão do `lane.sh abrir`

**Papel:** `implementador-mecanico`. O código vem pronto abaixo.

**Files:**
- Modify: `.claude/scripts/lane.sh:322-326` (no verbo_abrir, entre a checagem 7 e o printf do PORTAO OK)
- Modify: `.claude/tests/lane-abrir.tests.sh:148` (bloco novo entre o caso 7 e o portao limpo)
- Modify: `CLAUDE.md:163` (§6, logo depois do bloco de comandos do frontend)

**Interfaces:**
- Consumes:
  - `PNPM=${LANE_PNPM:-pnpm}` (`lane.sh:24`).
  - `recusar` (`lane.sh:34-37`), que imprime `PORTAO RECUSOU: <motivo>` no stderr e sai 1.
  - No teste: `criar_main_lane`, `registrar_descarte` e `rodar_lane` (que injeta
    `LANE_PNPM=${FAKE_PNPM:-true}`), em `.claude/tests/_lane.sh`; `assert_recusa`, `assert_contem` e
    `nada_criado` (`lane-abrir.tests.sh:8-17`).
- Produces: com o pnpm ausente, o `abrir` sai 1 com
  `PORTAO RECUSOU: pnpm ausente no PATH (<valor de $PNPM>): rode corepack enable pnpm e abra de novo`,
  antes de qualquer `git worktree add`. O `verbo_aceitar` não muda, porque não roda `pnpm install`.

- [ ] **Step 1: Escrever o teste que falha.** Em `.claude/tests/lane-abrir.tests.sh`, entre a linha
  `nada_criado "$_ab7" 'sem offset livre'` e o comentário `# --- portao limpo`:

```bash
# --- 8. pnpm no PATH (bloco 42): sem ele a lane nascia pela metade, com
# branch e arvore criadas antes do pnpm install falhar
_ab8=$(criar_main_lane); registrar_descarte "$(dirname "$_ab8")"
FAKE_PNPM=/nao/existe/pnpm rodar_lane "$_ab8" abrir 33 chore harness-sinal-de-contexto-cheio
assert_recusa 'pnpm ausente no PATH (/nao/existe/pnpm)' 'pnpm fora do PATH'
assert_contem "$SAIDA_LANE" 'rode corepack enable pnpm' 'pnpm fora do PATH: diz como resolver'
nada_criado "$_ab8" 'pnpm fora do PATH'
```

- [ ] **Step 2: Rodar e ver falhar.** `bash .claude/tests/run-all.sh` → a última linha é
  `FALHOU: N asercao(oes)`. Falham:
  - `FALHA pnpm fora do PATH: pelo portao`;
  - `FALHA pnpm fora do PATH: pelo motivo certo`;
  - `FALHA pnpm fora do PATH: diz como resolver`;
  - `FALHA pnpm fora do PATH: nenhuma branch criada`;
  - `FALHA pnpm fora do PATH: a arvore foi criada`.

  Hoje o `abrir` passa no portão, cria a branch e a árvore e só morre no `pnpm install`, com
  `LANE PELA METADE`.

- [ ] **Step 3: Implementar.** Em `.claude/scripts/lane.sh`, **só no `verbo_abrir`**: depois do bloco
  `# 7. offset livre de 1 a 3` (linhas 322-324) e antes do `printf 'PORTAO OK: ...'` (linha 326). O
  `verbo_aceitar` tem um bloco idêntico nas linhas 451-455 e fica como está, porque não roda
  `pnpm install`.

```bash
  # 8. o pnpm existe. O pnpm install so roda depois de criar branch e arvore, e
  # sem pnpm a lane nascia pela metade (bloco 42: node novo no nvm vem sem ele).
  command -v "$PNPM" >/dev/null 2>&1 \
    || recusar "pnpm ausente no PATH ($PNPM): rode corepack enable pnpm e abra de novo"
```

- [ ] **Step 4: Rodar e ver passar.** `bash .claude/tests/run-all.sh` → `OK: N arquivo(s) de teste, nenhuma falha`.
  O caso `falha no meio` continua passando: o pnpm falso dele existe no PATH e só falha no install.

- [ ] **Step 5: A linha do CLAUDE.md.** No `CLAUDE.md`, depois do bloco de comandos do frontend (o
  que termina na linha `pnpm test     # vitest run (jsdom) …` e no fechamento do bloco), deixe uma
  linha em branco e acrescente:

```markdown
Node novo no nvm vem sem o pnpm: rode `corepack enable pnpm` (a versão sai do `packageManager` de
`frontend/package.json`). Sem ele, o `lane.sh abrir` recusa no portão.
```

  O `CLAUDE.md` é doc normativo, e a guarda de paths o confere:
  `cd frontend && pnpm exec vitest run tests/repo-docs-refs.test.ts` → PASS.

- [ ] **Step 6: Commit.**

```bash
git add .claude/scripts/lane.sh .claude/tests/lane-abrir.tests.sh CLAUDE.md
git commit -m "chore(42): lane.sh confere o pnpm antes do portao"
```

- [ ] **Step 7: Sonda.** Troque a linha `|| recusar "pnpm ausente …"` por `|| true`.
  `bash .claude/tests/run-all.sh` sai `FALHOU`, nas mesmas asserções do Step 2. Depois,
  `git checkout -- .claude/scripts/lane.sh`, e o `run-all.sh` volta a `OK`.

### Task 2: `podar-imagens.sh`

**Papel:** `implementador-integracao`. São três arquivos novos: o teste e o falso vêm prontos, e o
script vem por contrato.

**Files:**
- Create: `frontend/tests/fixtures/podar-imagens/docker` (executável)
- Create: `frontend/tests/podar-imagens.test.ts`
- Create: `deploy/bin/podar-imagens.sh` (executável)

**Interfaces:**
- Consumes: o ledger `releases.jsonl`. O `deploy/bin/deploy.sh` o escreve em append, uma linha por
  evento, sem espaços:
  - `inicio` (`deploy.sh:190`):
    `{"ts":"…","evento":"inicio","sha":"<40 hex>","sha_anterior":"<40 hex>"|null,"migrations":[…],"schema_a_frente":[…],"dump":…,"ator":"…"}`;
  - `fim` (`deploy.sh:92` e `:94`, no trap de saída):
    `{"ts":"…","evento":"fim","sha":"<40 hex>","resultado":"ok","etapa":"ok"}`, ou
    `…"resultado":"falha","etapa":"<etapa>"}`.

  Na hora da poda (Task 3), a linha `fim` da promoção corrente **ainda não existe**: o trap a
  escreve depois.
- Produces (as Tasks 3, 8 e 9 dependem disto):
  - **Chamada.** `podar-imagens.sh <sha_atual>`: um argumento, um SHA de 40 hexadecimais
    minúsculos.
  - **Ambiente.** `LOTUS_BASE`, com default `/opt/lotus`. O script lê `$LOTUS_BASE/releases.jsonl`.
  - **stdout.** A primeira linha é `mantidas: <sha_atual> <sha_anterior|nenhum>`. Depois vem uma
    linha `removida: <repositório>:<tag>` para cada imagem que saiu.
  - **stderr.**
    - `recusada: <repositório>:<tag>` para cada remoção que o docker recusou, junto da mensagem do
      próprio docker;
    - `erro: docker image ls falhou`;
    - `uso: podar-imagens.sh <sha de 40 hexadecimais>`.
  - **Saída.**
    - `0`: nada recusado.
    - `1`: alguma remoção recusada (as outras seguem), o `docker image prune` falhou ou a
      listagem falhou.
    - `2`: uso.

**Regras (já decididas):**
- **Candidatas.** São as linhas de `docker image ls --format '{{.Repository}}:{{.Tag}}'` cujo
  repositório é **exatamente** um dos três do Lotus e cuja tag tem 40 hexadecimais minúsculos. O
  resto fica: outros repositórios, `latest`, `<none>`.
- **O que fica.** A tag igual ao `sha_atual` ou ao `sha_anterior`.
- **O anterior.** `sha_anterior` é o `sha` da **última** linha do ledger que tem `"evento":"fim"` e
  `"resultado":"ok"` e cujo `sha` difere do `sha_atual`. É `nenhum` quando não há ledger ou não há
  linha assim. Nunca vem do `CURRENT_SHA`: quando o mesmo SHA é promovido de novo, ele já é o atual.
- **Remoção.** Uma chamada `docker image rm <ref>` por candidata, **sem** `-f` nem `--force`, e o
  laço segue depois de uma recusa.
- **Dangling.** No fim, `docker image prune -f`. Ele só remove imagem sem tag; o `-f` aqui só
  dispensa a confirmação.
- **Listagem.** É capturada numa variável antes do laço. Um `done < <(docker image ls …)` engoliria a
  falha do docker, e a poda sairia 0 sem ter olhado nada.
- **Sem `jq`.** O host não garante o `jq`. O ledger se lê com `grep` e `sed` sobre a forma fixa que o
  `deploy.sh` grava.

- [ ] **Step 1: O `docker` falso.** Crie `frontend/tests/fixtures/podar-imagens/docker` e rode `chmod +x`:

```bash
#!/usr/bin/env bash
#
# `docker` de mentira do frontend/tests/podar-imagens.test.ts. Registra cada
# chamada em $FAKE_LOG (uma linha `---` e um argumento por linha) e responde o
# minimo que o deploy/bin/podar-imagens.sh le:
# - `image ls` imprime $FAKE_IMAGENS, uma `repositorio:tag` por linha;
# - `image rm <ref>` recusa as refs de $FAKE_RM_RECUSA, como o daemon recusa
#   imagem presa a conteiner;
# - FAKE_LS_FALHA=1 e FAKE_PRUNE_FALHA=1 derrubam a listagem e o prune.
{
  printf '%s\n' '---'
  printf '%s\n' "$@"
} >> "$FAKE_LOG"

case "${1:-} ${2:-}" in
  'image ls')
    [ "${FAKE_LS_FALHA:-}" != 1 ] || { echo 'Cannot connect to the Docker daemon at unix:///var/run/docker.sock' >&2; exit 1; }
    cat "$FAKE_IMAGENS"
    ;;
  'image rm')
    ref="${*: -1}"
    if grep -qxF -- "$ref" "$FAKE_RM_RECUSA"; then
      echo "Error response from daemon: conflict: unable to remove repository reference \"$ref\" (must force) - container 0123456789ab is using its referenced image" >&2
      exit 1
    fi
    echo "Untagged: $ref"
    ;;
  'image prune')
    [ "${FAKE_PRUNE_FALHA:-}" != 1 ] || exit 1
    echo 'Total reclaimed space: 0B'
    ;;
  *) echo "docker falso: nao previsto: $*" >&2; exit 1 ;;
esac
```

- [ ] **Step 2: Escrever o teste que falha.** Crie `frontend/tests/podar-imagens.test.ts`:

```ts
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

/**
 * `deploy/bin/podar-imagens.sh` apaga, depois de uma promoção aprovada, as
 * imagens do Lotus que não são do SHA atual nem do anterior (bloco 42, spec §4).
 * Até aqui o deploy nunca apagava nada, e o disco do host chegou a 87% com 14
 * SHAs guardados. As falhas que importam são silenciosas: apagar o alvo de
 * rollback quando o mesmo SHA é promovido de novo, tocar imagem de terceiros,
 * forçar a remoção de imagem em uso, ou sair 0 com o docker fora.
 *
 * Por EXECUÇÃO (lição 19): cada caso roda o script com o `docker` falso de
 * fixtures/podar-imagens/ e um LOTUS_BASE temporário com o ledger do caso.
 */
const RAIZ = resolve(__dirname, '..', '..')
const CAMINHO = join(RAIZ, 'deploy', 'bin', 'podar-imagens.sh')
const FAKES = join(__dirname, 'fixtures', 'podar-imagens')

const REPOS = ['ghcr.io/gatika-cl/lotus-app', 'ghcr.io/gatika-cl/lotus-web', 'ghcr.io/gatika-cl/lotus-clamav']
const A = 'a'.repeat(40)
const B = 'b'.repeat(40)
const C = 'c'.repeat(40)
const D = 'd'.repeat(40)
const TERCEIROS = ['gotenberg/gotenberg:8', 'mysql:8.0', `ghcr.io/gatika-cl/outra:${A}`, `ghcr.io/outro-dono/lotus-app:${A}`]
const NAO_SHA = ['ghcr.io/gatika-cl/lotus-app:latest', 'ghcr.io/gatika-cl/lotus-app:<none>', '<none>:<none>']

/** As duas formas de linha que o deploy.sh grava no ledger, sem espaços. */
const inicio = (sha: string, anterior: string | null) =>
  JSON.stringify({ ts: '2026-10-25T00:00:00Z', evento: 'inicio', sha, sha_anterior: anterior, migrations: [], schema_a_frente: [], dump: null, ator: 'teste' })
const fim = (sha: string, resultado: 'ok' | 'falha' = 'ok') =>
  JSON.stringify({ ts: '2026-10-25T00:00:00Z', evento: 'fim', sha, resultado, etapa: resultado === 'ok' ? 'ok' : 'up' })

/** Toda tag dos três repositórios para os SHAs dados, em ordem alfabética. */
const doLotus = (...shas: string[]) => REPOS.flatMap((r) => shas.map((s) => `${r}:${s}`)).sort()

let base: string
let contador = 0

beforeAll(() => {
  base = mkdtempSync(join(tmpdir(), 'podar-imagens-'))
})

afterAll(() => {
  rmSync(base, { recursive: true, force: true })
})

type Caso = {
  ledger?: string[] | null // null = sem releases.jsonl
  imagens?: string[] // default: A, B, C e D nos três repositórios, mais os de terceiros
  recusa?: string[] // refs que o daemon recusa remover
  env?: Record<string, string>
}
type Execucao = { status: number | null; stdout: string; stderr: string; chamadas: string[][] }

const rodar = (args: string[], caso: Caso = {}): Execucao => {
  contador += 1
  const dir = join(base, `caso-${contador}`)
  const lotus = join(dir, 'lotus')
  mkdirSync(lotus, { recursive: true })
  const linhas = (xs: string[]) => xs.map((x) => `${x}\n`).join('')
  if (caso.ledger !== null) writeFileSync(join(lotus, 'releases.jsonl'), linhas(caso.ledger ?? []))
  const imagens = join(dir, 'imagens')
  writeFileSync(imagens, linhas(caso.imagens ?? [...doLotus(A, B, C, D), ...TERCEIROS]))
  const recusa = join(dir, 'recusa')
  writeFileSync(recusa, linhas(caso.recusa ?? []))
  const log = join(dir, 'chamadas.log')
  writeFileSync(log, '')
  const r = spawnSync('bash', [CAMINHO, ...args], {
    env: {
      ...process.env,
      LOTUS_BASE: lotus,
      FAKE_LOG: log,
      FAKE_IMAGENS: imagens,
      FAKE_RM_RECUSA: recusa,
      ...caso.env,
      PATH: `${FAKES}:${process.env.PATH ?? ''}`,
    },
    encoding: 'utf8',
  })
  const chamadas = readFileSync(log, 'utf8')
    .split('---\n')
    .filter(Boolean)
    .map((bloco) => bloco.split('\n').filter(Boolean))
  return { status: r.status, stdout: r.stdout, stderr: r.stderr, chamadas }
}

/** As refs que o script mandou o docker remover, em ordem alfabética. */
const removidas = (e: Execucao) =>
  e.chamadas.filter((c) => c[0] === 'image' && c[1] === 'rm').map((c) => c[c.length - 1]).sort()
const mantidas = (e: Execucao) => e.stdout.split('\n')[0]

describe('deploy/bin/podar-imagens.sh — forma', () => {
  it('é executável e falha alto', () => {
    expect(statSync(CAMINHO).mode & 0o111).not.toBe(0)
    expect(readFileSync(CAMINHO, 'utf8')).toMatch(/^set -euo pipefail$/m)
  })

  it('o docker falso é executável', () => {
    expect(statSync(join(FAKES, 'docker')).mode & 0o111).not.toBe(0)
  })
})

describe('deploy/bin/podar-imagens.sh — o que fica', () => {
  it('guarda o atual e o anterior e remove o resto dos três repositórios', () => {
    const e = rodar([C], { ledger: [inicio(A, null), fim(A), inicio(B, A), fim(B), inicio(C, B)] })
    expect(e.status, e.stderr).toBe(0)
    expect(mantidas(e)).toBe(`mantidas: ${C} ${B}`)
    expect(removidas(e)).toEqual(doLotus(A, D))
    for (const ref of doLotus(A, D)) expect(e.stdout).toContain(`removida: ${ref}\n`)
  })

  it('mesmo SHA promovido de novo: o anterior sai do ledger, não do CURRENT_SHA', () => {
    const e = rodar([C], { ledger: [fim(B), inicio(C, B), fim(C), inicio(C, C)] })
    expect(mantidas(e)).toBe(`mantidas: ${C} ${B}`)
    expect(removidas(e)).toEqual(doLotus(A, D))
  })

  it('rollback: promover o anterior guarda o SHA que acabou de sair', () => {
    const e = rodar([B], { ledger: [fim(B), inicio(C, B), fim(C), inicio(B, C)] })
    expect(mantidas(e)).toBe(`mantidas: ${B} ${C}`)
    expect(removidas(e)).toEqual(doLotus(A, D))
  })

  it('fim com falha não conta como anterior', () => {
    const e = rodar([C], { ledger: [fim(A), inicio(B, A), fim(B, 'falha'), inicio(C, A)] })
    expect(mantidas(e)).toBe(`mantidas: ${C} ${A}`)
    expect(removidas(e)).toEqual(doLotus(B, D))
  })

  it('o sha_anterior de uma linha inicio não vira anterior', () => {
    const e = rodar([C], { ledger: [fim(B), inicio(C, D)] })
    expect(mantidas(e)).toBe(`mantidas: ${C} ${B}`)
  })

  it('ledger sem promoção anterior: guarda só o atual e sai 0', () => {
    const e = rodar([C], { ledger: [inicio(C, null)] })
    expect(e.status, e.stderr).toBe(0)
    expect(mantidas(e)).toBe(`mantidas: ${C} nenhum`)
    expect(removidas(e)).toEqual(doLotus(A, B, D))
  })

  it('sem releases.jsonl: guarda só o atual, sai 0 e não reclama do arquivo', () => {
    const e = rodar([C], { ledger: null })
    expect(e.status, e.stderr).toBe(0)
    expect(mantidas(e)).toBe(`mantidas: ${C} nenhum`)
    expect(e.stderr).toBe('')
  })
})

describe('deploy/bin/podar-imagens.sh — o que nunca sai', () => {
  it('imagem fora dos três repositórios do Lotus fica', () => {
    const e = rodar([C], { ledger: [fim(B), inicio(C, B)], imagens: [...doLotus(B, C), ...TERCEIROS] })
    expect(e.status, e.stderr).toBe(0)
    expect(removidas(e)).toEqual([])
  })

  it('tag que não é SHA fica; o que não tem tag sai pelo prune do fim', () => {
    const e = rodar([C], { ledger: [fim(B), inicio(C, B)], imagens: [...doLotus(B, C), ...NAO_SHA] })
    expect(removidas(e)).toEqual([])
    expect(e.chamadas.at(-1)).toEqual(['image', 'prune', '-f'])
  })

  it('nunca força: todo image rm é só `image rm <ref>`', () => {
    const e = rodar([C], { ledger: [fim(B), inicio(C, B)] })
    const rms = e.chamadas.filter((c) => c[0] === 'image' && c[1] === 'rm')
    expect(rms.length).toBeGreaterThan(0)
    for (const c of rms) expect(c).toHaveLength(3)
  })
})

describe('deploy/bin/podar-imagens.sh — falhas', () => {
  it('remoção recusada: as outras saem, a recusa vai ao stderr e o script sai 1', () => {
    const presa = `ghcr.io/gatika-cl/lotus-app:${A}`
    const e = rodar([C], { ledger: [fim(B), inicio(C, B)], recusa: [presa] })
    expect(e.status).toBe(1)
    expect(removidas(e)).toEqual(doLotus(A, D)) // tentou todas, a presa inclusive
    expect(e.stdout).not.toContain(`removida: ${presa}`)
    expect(e.stdout).toContain(`removida: ghcr.io/gatika-cl/lotus-web:${A}`)
    expect(e.stderr).toContain(`recusada: ${presa}`)
  })

  it('docker image ls falhando: sai 1 sem remover nada', () => {
    const e = rodar([C], { ledger: [fim(B), inicio(C, B)], env: { FAKE_LS_FALHA: '1' } })
    expect(e.status).toBe(1)
    expect(e.stderr).toContain('erro: docker image ls falhou')
    expect(removidas(e)).toEqual([])
  })

  it('prune falhando: as remoções valem e o script sai 1', () => {
    const e = rodar([C], { ledger: [fim(B), inicio(C, B)], env: { FAKE_PRUNE_FALHA: '1' } })
    expect(e.status).toBe(1)
    expect(removidas(e)).toEqual(doLotus(A, D))
  })

  const usos: Array<[string, string[]]> = [
    ['sem argumento', []],
    ['39 hexadecimais', ['c'.repeat(39)]],
    ['maiúscula', ['C'.repeat(40)]],
    ['dois argumentos', [C, B]],
  ]
  it.each(usos)('uso (%s): sai 2 sem chamar o docker', (_nome, args) => {
    const e = rodar(args, { ledger: [fim(B)] })
    expect(e.status).toBe(2)
    expect(e.stderr).toContain('uso: podar-imagens.sh <sha de 40 hexadecimais>')
    expect(e.chamadas).toEqual([])
  })
})
```

- [ ] **Step 3: Rodar e ver falhar.** `cd frontend && pnpm exec vitest run tests/podar-imagens.test.ts` →
  FAIL. A forma falha com `ENOENT` no `statSync`, e os casos por execução saem com status `127`,
  porque o script não existe.

- [ ] **Step 4: Implementar `deploy/bin/podar-imagens.sh`** e rodar `chmod +x`. O contrato está nas
  **Interfaces** e nas **Regras**. O que o teste não fixa:
  - **Cabeçalho.** No molde do `deploy/bin/verificar-backup.sh`, com:
    - por que o script existe: o deploy nunca apagava imagem, e o disco chegou a 87% com 14 SHAs
      (spec do bloco 42, §4);
    - quem o chama: o `deploy.sh`, depois do `CURRENT_SHA`;
    - a regra do anterior, e por que nunca usar `-f`;
    - os blocos `Uso:`, `Ambiente:` e `Saída:`, como os de `deploy.sh:10-15`.
  - `set -euo pipefail`.
  - **Validação do argumento**, antes de tocar em qualquer coisa:

```bash
if [ $# -ne 1 ] || [ ${#1} -ne 40 ] || [ -n "$(printf '%s' "$1" | tr -d '0-9a-f')" ]; then
  echo "uso: podar-imagens.sh <sha de 40 hexadecimais>" >&2
  exit 2
fi
```

  - **O anterior.** O `|| true` não é enfeite: com `pipefail`, um grep sem linha mataria o script.
    É o mesmo motivo de `deploy.sh:73-75`.

```bash
ANTERIOR=''
if [ -f "$LEDGER" ]; then
  ANTERIOR=$(grep -F '"evento":"fim"' "$LEDGER" | grep -F '"resultado":"ok"' \
    | sed -n 's/.*"sha":"\([0-9a-f]\{40\}\)".*/\1/p' | grep -vxF "$ATUAL" | tail -n 1 || true)
fi
```

  - **A listagem.**
    `IMAGENS=$(docker image ls --format '{{.Repository}}:{{.Tag}}') || { echo "erro: docker image ls falhou" >&2; exit 1; }`.
    O laço lê `done < <(printf '%s\n' "$IMAGENS" | sort -u)`.
  - **A remoção.** Cada `docker image rm "$REF"` manda o stdout do docker para `/dev/null`: a saída
    da poda é a do contrato.

- [ ] **Step 5: Rodar e ver passar.**
  - `cd frontend && pnpm exec vitest run tests/podar-imagens.test.ts` → PASS em todos os casos.
  - `cd frontend && pnpm exec tsc -p tsconfig.node.json --noEmit` → sai 0.
  - `cd frontend && pnpm exec eslint tests/podar-imagens.test.ts` → sai 0.

- [ ] **Step 6: Commit.**

```bash
git add deploy/bin/podar-imagens.sh frontend/tests/fixtures/podar-imagens/docker frontend/tests/podar-imagens.test.ts
git commit -m "feat(42): podar-imagens.sh guarda o SHA atual e o anterior"
git ls-files -s deploy/bin/podar-imagens.sh frontend/tests/fixtures/podar-imagens/docker   # os dois 100755
```

- [ ] **Step 7: Sondas.** Aplique uma por vez. Cada uma reprova o caso indicado. Depois de cada
  uma, desfaça com `git checkout -- deploy/bin/podar-imagens.sh` e veja o arquivo de teste inteiro
  voltar a PASS.
  1. O `exit` final trocado por `exit 0` → reprova `remoção recusada…` e `prune falhando…`.
  2. O `grep -vxF "$ATUAL"` apagado → reprova `mesmo SHA promovido de novo…`.
  3. O `grep -F '"resultado":"ok"'` apagado → reprova `fim com falha não conta como anterior`.
  4. O `|| { echo "erro: docker image ls falhou" >&2; exit 1; }` trocado por `|| true` → reprova
     `docker image ls falhando…`.
  5. A comparação com o `$ANTERIOR` tirada da condição de manter → reprova `guarda o atual e o anterior…`.

### Task 3: o `deploy.sh` chama a poda

**Papel:** `implementador-mecanico`. O código vem pronto.

**Files:**
- Modify: `deploy/bin/deploy.sh:4-6` (a linha Sequência do cabeçalho) e `deploy/bin/deploy.sh:230-231` (entre o mv do CURRENT_SHA e o DEPLOY OK)
- Modify: `frontend/tests/deploy-sh.test.ts:62` (it novo depois de grava CURRENT_SHA por mv atômico)

**Interfaces:**
- Consumes (Task 2): `"$BASE/bin/podar-imagens.sh" <sha>`, que sai ≠ 0 quando alguma remoção falha.
  O script também pode estar ausente no host: o `||` cobre o 127.
- Produces: na saída do deploy, a linha `==> poda de imagens`, seguida das linhas `mantidas:` e
  `removida:` da poda. Se a poda falhar, sai no stderr a linha
  `aviso: a poda de imagens falhou; a promocao segue OK`, e o deploy sai 0.

- [ ] **Step 1: Escrever o teste que falha.** Em `frontend/tests/deploy-sh.test.ts`, depois do
  `it('grava CURRENT_SHA por mv atômico, nunca por redirecionamento', …)`:

```ts
  it('poda as imagens depois do CURRENT_SHA, e a falha da poda vira aviso', () => {
    // Spec do bloco 42, §4: antes do CURRENT_SHA a promoção ainda pode falhar e a
    // imagem antiga é a rede; depois dele, falha da poda não derruba a promoção.
    // O deploy.sh não roda em teste (BASE fixo), então a catraca prende a linha
    // inteira: tirar o `||`, ou trocar o aviso por `exit`, reprova.
    const mv = indiceDe('mv -f "$NOVO" "$BASE/CURRENT_SHA"')
    const poda = indiceDe('"$BASE/bin/podar-imagens.sh"')
    expect(mv).toBeGreaterThan(-1)
    expect(poda).toBeGreaterThan(mv)
    expect(poda).toBeLessThan(indiceDe('DEPLOY OK'))
    expect(linhas[poda].trim()).toBe(
      '"$BASE/bin/podar-imagens.sh" "$SHA" || echo "aviso: a poda de imagens falhou; a promocao segue OK" >&2',
    )
    expect(linhas.filter((linha) => linha.includes('podar-imagens.sh'))).toHaveLength(1)
  })
```

- [ ] **Step 2: Rodar e ver falhar.** `cd frontend && pnpm exec vitest run tests/deploy-sh.test.ts` → FAIL
  em `expect(poda).toBeGreaterThan(mv)`, com `poda` em -1.

- [ ] **Step 3: Implementar.** Em `deploy/bin/deploy.sh`, troque as duas últimas linhas
  (`mv -f "$NOVO" "$BASE/CURRENT_SHA"` e `echo "==> DEPLOY OK: $SHA"`) por:

```bash
mv -f "$NOVO" "$BASE/CURRENT_SHA"

# Poda das imagens velhas (bloco 42): so depois do CURRENT_SHA, porque antes
# disso a promocao ainda pode falhar e a imagem antiga e a rede. A falha da poda
# vira aviso: a promocao ja aconteceu, e o trap registra o `fim` como ok.
echo "==> poda de imagens"
"$BASE/bin/podar-imagens.sh" "$SHA" || echo "aviso: a poda de imagens falhou; a promocao segue OK" >&2
echo "==> DEPLOY OK: $SHA"
```

  No cabeçalho, a linha ``# digests -> CURRENT_SHA -> ledger `fim`.`` passa a ser
  ``# digests -> CURRENT_SHA -> poda de imagens -> ledger `fim`.``.

- [ ] **Step 4: Rodar e ver passar.** `cd frontend && pnpm exec vitest run tests/deploy-sh.test.ts` → PASS
  em todos os casos (o do `mv` atômico e o do trap continuam verdes). `bash -n deploy/bin/deploy.sh` → sai 0.

- [ ] **Step 5: Commit.**

```bash
git add deploy/bin/deploy.sh frontend/tests/deploy-sh.test.ts
git commit -m "feat(42): deploy.sh poda imagens depois da promocao"
```

- [ ] **Step 6: Sondas.** Desfaça cada uma com `git checkout -- deploy/bin/deploy.sh`.
  1. Tirar o `|| echo "aviso: …" >&2` da linha → o caso novo reprova.
  2. Mover a chamada para antes do `mv -f` → o caso novo reprova.

### Task 4: retry no `backup-db.sh`

**Papel:** `implementador-integracao`. Os falsos e o teste vêm prontos, e os trechos do script
também.

**Files:**
- Modify: `deploy/bin/backup-db.sh:14-16` (exports e BASE), `deploy/bin/backup-db.sh:40` (validação da espera) e `deploy/bin/backup-db.sh:60` (laço do upload)
- Modify: `frontend/tests/backup-db.test.ts` (imports e describe novo no fim; os testes textuais ficam)
- Create: `frontend/tests/fixtures/backup-db/docker` (executável)
- Create: `frontend/tests/fixtures/backup-db/aws` (executável)

**Interfaces:**
- Consumes: nada de outra task.
- Produces:
  - **Contrato mantido.** O stdout `backup ok: s3://…`, o `LOTUS_BACKUP_SAIDA`, o
    `LOTUS_BACKUP_ROTULO` e as saídas `0`/`1` continuam como estão.
  - **Ambiente novo.**
    - `LOTUS_BASE`, com default `/opt/lotus`.
    - `LOTUS_BACKUP_ESPERA_S`, com default `30`, inteiro, só para o teste.
  - **stderr novo.**
    - `aviso: upload falhou (tentativa N de 3)`, uma linha por falha, com N de 1 a 3.
    - Depois da terceira falha, `erro: upload falhou 3 vezes` e saída 1.
  - **Exporta** `AWS_METADATA_SERVICE_NUM_ATTEMPTS=3` e `AWS_METADATA_SERVICE_TIMEOUT=5`.
  - O `deploy.sh:180` chama o script do mesmo jeito e herda o retry.

- [ ] **Step 1: Os falsos.** Crie os dois arquivos e rode `chmod +x` nos dois.

  `frontend/tests/fixtures/backup-db/docker`:

```bash
#!/usr/bin/env bash
#
# `docker` de mentira do frontend/tests/backup-db.test.ts. Responde o `ps -q
# mysql` do compose e o `exec` do mysqldump com um dump que passa nas duas
# guardas do script: mais de 10 KiB e o rodape do mysqldump.
case " $* " in
  *" ps -q mysql "*) echo mysql-falso ;;
  *" exec mysql-falso "*)
    for i in $(seq 1 300); do echo "INSERT INTO t VALUES ($i, 'linha de dump falso para passar do piso de 10 KiB');"; done
    echo '-- Dump completed on 2026-10-25  6:10:00'
    ;;
  *) echo "docker falso: nao previsto: $*" >&2; exit 1 ;;
esac
```

  `frontend/tests/fixtures/backup-db/aws`:

```bash
#!/usr/bin/env bash
#
# `aws` de mentira do frontend/tests/backup-db.test.ts. Anota cada chamada em
# $FAKE_DIR/aws.log, com a folga de IMDS que recebeu, e falha como o CLI falhou
# no backup de 2026-10-07 enquanto o numero da chamada for <= $FAKE_FALHAS.
printf '%s|imds=%s/%s\n' "$*" "${AWS_METADATA_SERVICE_NUM_ATTEMPTS:-}" "${AWS_METADATA_SERVICE_TIMEOUT:-}" >> "$FAKE_DIR/aws.log"
n=$(wc -l < "$FAKE_DIR/aws.log")
if [ "$n" -le "${FAKE_FALHAS:-0}" ]; then
  echo 'Unable to locate credentials. You can configure credentials by running "aws configure".' >&2
  exit 255
fi
case " $* " in
  *" s3 cp "*) ;;
  *) echo "aws falso: nao previsto: $*" >&2; exit 1 ;;
esac
```

- [ ] **Step 2: Escrever o teste que falha.** Em `frontend/tests/backup-db.test.ts`, troque os
  imports por:

```ts
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
```

  Depois, no fim do arquivo:

```ts
/**
 * Execução de verdade, com `docker` e `aws` falsos no PATH (bloco 42, spec §9).
 * O backup de 2026-10-07 caiu num soluço do IMDS (`Unable to locate
 * credentials`): tentou uma vez, e ninguém soube. O upload agora tenta três
 * vezes, e o CLI recebe mais folga no IMDS. O script grava no /tmp fixo do host;
 * cada caso usa um rótulo único para achar os próprios arquivos lá.
 */
describe('deploy/bin/backup-db.sh — upload com retry', () => {
  const FAKES = join(__dirname, 'fixtures', 'backup-db')
  let base: string
  let contador = 0

  beforeAll(() => {
    base = mkdtempSync(join(tmpdir(), 'backup-db-'))
    writeFileSync(join(base, '.env'), 'LOTUS_BACKUP_BUCKET=balde-falso\n')
  })

  afterAll(() => {
    rmSync(base, { recursive: true, force: true })
  })

  const rodar = (falhas: number, extra: Record<string, string> = {}) => {
    contador += 1
    const dir = join(base, `caso-${contador}`)
    mkdirSync(dir)
    const rotulo = `t42-${process.pid}-${contador}`
    const saida = join(dir, 'chave')
    const r = spawnSync('bash', [CAMINHO], {
      env: {
        ...process.env,
        LOTUS_BASE: base,
        LOTUS_BACKUP_ESPERA_S: '0',
        LOTUS_BACKUP_ROTULO: rotulo,
        LOTUS_BACKUP_SAIDA: saida,
        FAKE_DIR: dir,
        FAKE_FALHAS: String(falhas),
        ...extra,
        PATH: `${FAKES}:${process.env.PATH ?? ''}`,
      },
      encoding: 'utf8',
    })
    const log = join(dir, 'aws.log')
    return {
      status: r.status,
      stdout: r.stdout,
      stderr: r.stderr,
      aws: existsSync(log) ? readFileSync(log, 'utf8').split('\n').filter(Boolean) : [],
      saida,
      rotulo,
      sobras: readdirSync('/tmp').filter((nome) => nome.includes(rotulo)),
    }
  }

  it('os falsos são executáveis', () => {
    for (const nome of ['docker', 'aws']) expect(statSync(join(FAKES, nome)).mode & 0o111, nome).not.toBe(0)
  })

  it('duas falhas e o upload sai na terceira', () => {
    const e = rodar(2)
    expect(e.status, e.stderr).toBe(0)
    expect(e.aws).toHaveLength(3)
    expect(e.stderr).toContain('aviso: upload falhou (tentativa 1 de 3)')
    expect(e.stderr).toContain('aviso: upload falhou (tentativa 2 de 3)')
    expect(e.stderr).not.toContain('tentativa 3 de 3')
    expect(e.stderr).not.toContain('erro:')
    const chave = new RegExp(`^s3://balde-falso/backups/lotus-[0-9T-]+-${e.rotulo}\\.sql\\.gz$`)
    expect(e.stdout.trim().replace(/^backup ok: /, '')).toMatch(chave)
    expect(readFileSync(e.saida, 'utf8').trim()).toMatch(chave)
    expect(e.sobras).toEqual([])
  })

  it('três falhas: sai 1, não publica chave e não deixa o dump no /tmp', () => {
    const e = rodar(3)
    expect(e.status).toBe(1)
    expect(e.aws).toHaveLength(3)
    for (const n of [1, 2, 3]) expect(e.stderr).toContain(`aviso: upload falhou (tentativa ${n} de 3)`)
    expect(e.stderr).toContain('erro: upload falhou 3 vezes')
    expect(e.stdout).not.toContain('backup ok')
    expect(existsSync(e.saida)).toBe(false)
    expect(e.sobras).toEqual([])
  })

  it('o upload sai com a folga de IMDS: 3 tentativas de 5 s', () => {
    const e = rodar(1)
    expect(e.aws).toHaveLength(2)
    for (const linha of e.aws) expect(linha.endsWith('|imds=3/5'), linha).toBe(true)
  })

  it('espera fora de [0-9] sai 1 antes do dump', () => {
    const e = rodar(0, { LOTUS_BACKUP_ESPERA_S: 'trinta' })
    expect(e.status).toBe(1)
    expect(e.stderr).toContain('erro: LOTUS_BACKUP_ESPERA_S fora de [0-9]: trinta')
    expect(e.aws).toEqual([])
  })
})
```

- [ ] **Step 3: Rodar e ver falhar.** `cd frontend && pnpm exec vitest run tests/backup-db.test.ts` →
  os textuais antigos passam e o `describe` novo falha. Hoje o `BASE=/opt/lotus` fixo faz o script
  ler o `.env` errado e sair 1 antes do dump.

- [ ] **Step 4: Implementar.** Em `deploy/bin/backup-db.sh`:
  - Depois do `umask 077`:

```bash

# O CLI desiste do IMDS no default (1 tentativa de 1 s) e sai com `Unable to
# locate credentials`: foi assim que o backup de 2026-10-07 falhou, sem retry e
# sem aviso. Tres tentativas de 5 s cobrem o soluco do IMDS. O deploy.sh chama
# este script para o dump pre-deploy e herda a folga.
export AWS_METADATA_SERVICE_NUM_ATTEMPTS=3 AWS_METADATA_SERVICE_TIMEOUT=5
```

  - Troque `BASE=/opt/lotus` por:

```bash
# Mesmo gancho do verificar-backup.sh: o default e o caminho de producao, e a
# prova local sobrescreve a variavel para EXECUTAR o script com falsos.
BASE="${LOTUS_BASE:-/opt/lotus}"
```

  - Logo depois do `case "$ROTULO" in … esac`:

```bash
# Espera antes da segunda tentativa; dobra antes da terceira. So o teste a muda.
ESPERA="${LOTUS_BACKUP_ESPERA_S:-30}"
case "$ESPERA" in
  ''|*[!0-9]*) echo "erro: LOTUS_BACKUP_ESPERA_S fora de [0-9]: $ESPERA" >&2; exit 1 ;;
esac
```

  - Troque a linha `aws s3 cp "/tmp/$ARQ" "s3://$BUCKET/backups/$ARQ" --only-show-errors` por:

```bash
# Ate tres tentativas, com espera crescente (30 s, depois 60 s). O dump ja esta
# no /tmp e o trap so o apaga no fim, entao so o upload se repete. Cada falha vai
# para o stderr, que o cron manda para o /var/log/lotus-backup.log.
TENTATIVA=1
until aws s3 cp "/tmp/$ARQ" "s3://$BUCKET/backups/$ARQ" --only-show-errors; do
  echo "aviso: upload falhou (tentativa $TENTATIVA de 3)" >&2
  if [ "$TENTATIVA" -ge 3 ]; then
    echo "erro: upload falhou 3 vezes" >&2
    exit 1
  fi
  sleep "$ESPERA"
  ESPERA=$(( ESPERA * 2 ))
  TENTATIVA=$(( TENTATIVA + 1 ))
done
```

- [ ] **Step 5: Rodar e ver passar.**
  - `cd frontend && pnpm exec vitest run tests/backup-db.test.ts` → PASS no arquivo inteiro. Os
    textuais antigos continuam verdes: o `aws s3 cp` vem antes da chave, o `gzip` antes do envio, o
    trap e o umask estão no lugar.
  - `cd frontend && pnpm exec tsc -p tsconfig.node.json --noEmit` → sai 0.
  - `cd frontend && pnpm exec eslint tests/backup-db.test.ts` → sai 0.

- [ ] **Step 6: Commit.**

```bash
git add deploy/bin/backup-db.sh frontend/tests/backup-db.test.ts frontend/tests/fixtures/backup-db/docker frontend/tests/fixtures/backup-db/aws
git commit -m "fix(42): backup-db.sh tenta o upload tres vezes"
```

- [ ] **Step 7: Sondas.** Desfaça cada uma com `git checkout -- deploy/bin/backup-db.sh`.
  1. O `exit 1` depois de `erro: upload falhou 3 vezes` trocado por `exit 0` → reprova `três falhas…`.
  2. O laço `until … done` trocado de volta pela linha única do `aws s3 cp` → reprova
     `duas falhas e o upload sai na terceira`.
  3. A linha `export AWS_METADATA_SERVICE_…` apagada → reprova `o upload sai com a folga de IMDS…`.

### Task 5: `verificar-backup.sh` separa consulta que falha de bucket vazio

**Papel:** `implementador-integracao`. O código e o teste vêm prontos.

**Files:**
- Modify: `deploy/bin/verificar-backup.sh:25` (export depois do umask) e `deploy/bin/verificar-backup.sh:60-64` (a consulta)
- Modify: `frontend/tests/verificar-backup.test.ts:41-45` (asserção da consulta) e o describe novo no fim
- Modify: `frontend/tests/fixtures/verificar-backup/aws`

**Interfaces:**
- Consumes: nada de outra task.
- Produces:
  - **Consulta que falha.** Se o `aws s3api list-objects-v2` sai ≠ 0, o script grita
    `Lotus: a consulta dos backups em s3://$BUCKET/backups/ falhou. Nao da para afirmar que ha copia; confira as credenciais da instancia.`
    e sai 1, publicando no SNS como hoje.
  - **Bucket vazio.** `None` mantém a mensagem atual do ADR-09
    (`Lotus: nenhum backup em s3://$BUCKET/backups/. …`).
  - **Exporta** as duas variáveis de IMDS do `## Global Constraints`.
  - **Fato medido em 2026-10-25, só leitura, num prefixo vazio do bucket de produção.** A consulta
    `sort_by(Contents,&LastModified)[-1].LastModified` sai 255 com
    `In function sort_by(), invalid type for value: None`. A consulta
    ``sort_by(Contents || `[]`, &LastModified)[-1].LastModified`` devolve `None` e sai 0.

- [ ] **Step 1: O cenário no `aws` falso.** Troque o conteúdo de
  `frontend/tests/fixtures/verificar-backup/aws` por:

```bash
#!/usr/bin/env bash
#
# `aws` de mentira do frontend/tests/verificar-backup.test.ts. Registra a chamada
# em $FAKE_LOG, com a folga de IMDS que recebeu, e devolve o LastModified que o
# cenario pede; o publish so fica no log. FAKE_CONSULTA_FALHA=1 faz a consulta
# falhar como o CLI falhou no backup de 2026-10-07.
{
  printf '%s\n' '---'
  printf '%s\n' "$@"
  printf 'imds=%s/%s\n' "${AWS_METADATA_SERVICE_NUM_ATTEMPTS:-}" "${AWS_METADATA_SERVICE_TIMEOUT:-}"
} >> "$FAKE_LOG"

case " $* " in
  *" s3api list-objects-v2 "*)
    if [ "${FAKE_CONSULTA_FALHA:-}" = 1 ]; then
      echo 'Unable to locate credentials. You can configure credentials by running "aws configure".' >&2
      exit 255
    fi
    echo "${FAKE_ULTIMO_BACKUP:-None}"
    ;;
  *" sns publish "*) ;;
  *) echo "aws falso: nao previsto: $*" >&2; exit 1 ;;
esac
```

- [ ] **Step 2: Escrever os testes que falham.** Em `frontend/tests/verificar-backup.test.ts`:
  - No `it('olha o EFEITO no S3, não o log local nem o processo', …)`, troque a asserção
    `expect(semComentarios).toContain('sort_by(Contents,&LastModified)[-1].LastModified')` por:

```ts
    // `Contents || []`: sem ele, o prefixo vazio faz o sort_by receber null e o
    // CLI sair 255 (medido em 2026-10-25), e o vazio viraria "consulta falhou".
    expect(semComentarios).toContain('sort_by(Contents || `[]`, &LastModified)[-1].LastModified')
```

  - No fim do arquivo, sem import novo:

```ts
/**
 * Consulta que falha não é bucket vazio (bloco 42, spec §9). Até o bloco 42 o
 * `|| echo None` lia qualquer falha da consulta (credencial, rede, permissão)
 * como "nenhum backup", o alerta mais grave do ADR-09, e o backup de 2026-10-07
 * mostrou que a falha de credencial acontece. Os dois casos alertam e saem 1;
 * o que muda é o que o João lê no e-mail.
 */
describe('deploy/bin/verificar-backup.sh — consulta que falha e bucket vazio', () => {
  const FAKES = join(__dirname, 'fixtures', 'verificar-backup')
  let base: string
  let contador = 0

  beforeAll(() => {
    base = mkdtempSync(join(tmpdir(), 'verificar-backup-consulta-'))
    writeFileSync(
      join(base, '.env'),
      'LOTUS_BACKUP_BUCKET=bucket-falso\nLOTUS_ALERT_TOPIC_ARN=arn:aws:sns:sa-east-1:000000000000:lotus-alertas\n',
    )
  })

  afterAll(() => {
    rmSync(base, { recursive: true, force: true })
  })

  const rodar = (cenario: Record<string, string>) => {
    contador += 1
    const log = join(base, `chamadas-${contador}.log`)
    writeFileSync(log, '')
    const r = spawnSync('bash', [CAMINHO], {
      env: { ...process.env, LOTUS_BASE: base, FAKE_LOG: log, ...cenario, PATH: `${FAKES}:${process.env.PATH ?? ''}` },
      encoding: 'utf8',
    })
    return { status: r.status, stderr: r.stderr, log: readFileSync(log, 'utf8') }
  }

  it('consulta que falha alerta a consulta, nunca "nenhum backup"', () => {
    const e = rodar({ FAKE_CONSULTA_FALHA: '1' })
    expect(e.status).toBe(1)
    expect(e.stderr).toContain(
      'Lotus: a consulta dos backups em s3://bucket-falso/backups/ falhou. Nao da para afirmar que ha copia; confira as credenciais da instancia.',
    )
    expect(e.stderr).not.toContain('nenhum backup')
    expect(e.log).toContain('a consulta dos backups em s3://bucket-falso/backups/ falhou')
  })

  it('bucket vazio segue com o gatilho do ADR-09', () => {
    const e = rodar({ FAKE_ULTIMO_BACKUP: 'None' })
    expect(e.status).toBe(1)
    expect(e.stderr).toContain('Lotus: nenhum backup em s3://bucket-falso/backups/')
    expect(e.log).toContain('publish')
  })

  it('a consulta e o publish saem com a folga de IMDS', () => {
    const e = rodar({ FAKE_CONSULTA_FALHA: '1' })
    const chamadas = e.log.split('---\n').filter(Boolean)
    expect(chamadas).toHaveLength(2)
    for (const c of chamadas) expect(c).toContain('imds=3/5')
  })
})
```

- [ ] **Step 3: Rodar e ver falhar.** `cd frontend && pnpm exec vitest run tests/verificar-backup.test.ts` → FAIL em:
  - a asserção da consulta;
  - `consulta que falha…`, porque hoje a mensagem é "nenhum backup";
  - `…folga de IMDS`, porque hoje o log mostra `imds=/`.

  Os casos de 47 h e 50 h continuam verdes.

- [ ] **Step 4: Implementar.** Em `deploy/bin/verificar-backup.sh`:
  - Depois do `umask 077`:

```bash

# Mesma folga de IMDS do backup-db.sh: o default do CLI (1 tentativa de 1 s)
# derrubou o backup de 2026-10-07 com `Unable to locate credentials`.
export AWS_METADATA_SERVICE_NUM_ATTEMPTS=3 AWS_METADATA_SERVICE_TIMEOUT=5
```

  - Troque o bloco do `QUANDO=$(aws s3api list-objects-v2 … || echo None)` por:

```bash
# Consulta que falha nao e bucket vazio. Ate o bloco 42 o `|| echo None` lia
# qualquer falha (credencial, rede, permissao) como "nenhum backup", o alerta
# mais grave do ADR-09. O `Contents || []` mantem o vazio legivel: sem ele o
# sort_by recebe null e o CLI sai 255 com o prefixo vazio (medido em
# 2026-10-25), e o vazio viraria "consulta falhou". O stderr do CLI segue para o
# log do cron, que e onde se le o motivo.
if ! QUANDO=$(aws s3api list-objects-v2 --bucket "$BUCKET" --prefix backups/ \
    --query 'sort_by(Contents || `[]`, &LastModified)[-1].LastModified' --output text); then
  gritar "Lotus: a consulta dos backups em s3://$BUCKET/backups/ falhou. Nao da para afirmar que ha copia; confira as credenciais da instancia."
fi
```

  O teste seguinte, `[ -n "$QUANDO" ] && [ "$QUANDO" != "None" ] || gritar "Lotus: nenhum backup …"`,
  fica como está.

- [ ] **Step 5: Rodar e ver passar.**
  - `cd frontend && pnpm exec vitest run tests/verificar-backup.test.ts` → PASS no arquivo inteiro.
  - `cd frontend && pnpm exec tsc -p tsconfig.node.json --noEmit` → sai 0.
  - `cd frontend && pnpm exec eslint tests/verificar-backup.test.ts` → sai 0.

- [ ] **Step 6: Commit.**

```bash
git add deploy/bin/verificar-backup.sh frontend/tests/verificar-backup.test.ts frontend/tests/fixtures/verificar-backup/aws
git commit -m "fix(42): verificar-backup.sh nao le consulta falha como bucket vazio"
```

- [ ] **Step 7: Sondas.** Desfaça cada uma com `git checkout -- deploy/bin/verificar-backup.sh`.
  1. O `if ! QUANDO=$(…); then gritar …; fi` trocado por `QUANDO=$(…) || QUANDO=None` → reprova
     `consulta que falha…`.
  2. O ``|| `[]` `` tirado da consulta → reprova a asserção da consulta. É a âncora textual de um
     fato medido, porque o falso não reproduz o CLI.

### Task 6: journald, apt e reboot automático no `user-data.sh`

**Papel:** `implementador-mecanico`. O código e o teste vêm prontos.

**Files:**
- Modify: `deploy/aws/user-data.sh:181` (trecho novo no fim do arquivo)
- Modify: `frontend/tests/user-data.test.ts` (import e dois it novos no fim do describe)

**Interfaces:**
- Consumes: nada de outra task.
- Produces (as Tasks 8 e 9 usam estes nomes e conteúdos):
  - `/etc/systemd/journald.conf.d/lotus.conf`, com `[Journal]` e `SystemMaxUse=200M`;
  - `/etc/apt/apt.conf.d/52lotus-limpeza`, com `APT::Periodic::AutocleanInterval "7";`;
  - `/etc/apt/apt.conf.d/53lotus-reboot`, com `Unattended-Upgrade::Automatic-Reboot "true";` e
    `Unattended-Upgrade::Automatic-Reboot-Time "08:30";`.

  São arquivos separados porque, no host vivo, o reboot só liga depois da janela manual (Task 9).
  Cada arquivo é gravado só quando o conteúdo muda, e o journald só reinicia quando o arquivo dele
  muda.

- [ ] **Step 1: Escrever os testes que falham.** Em `frontend/tests/user-data.test.ts`:
  - Acrescente `readdirSync` ao import de `node:fs`, que fica:
    `import { chmodSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'`.
  - No fim do `describe('deploy/aws/user-data.sh', …)`, antes do `})` final:

```ts
  // O trecho da higiene RODA (bloco 42), com o `set` do topo, os caminhos de
  // /etc trocados por um diretório temporário e um `systemctl` que só anota.
  // É ele que prova que reexecutar no host vivo não reinicia o journald à toa
  // e que arquivo igual não derruba o `set -e`.
  it('higiene: grava os três arquivos e só reinicia o journald quando o dele muda', () => {
    const set = LINHAS.find((l) => /^set -/.test(l))
    const inicio = indice((l) => l === 'gravar_se_mudou() {')
    const fim = indice((l) => l === 'REBOOT', inicio)
    expect(set).toBeDefined()
    expect(inicio).toBeGreaterThan(-1)
    expect(fim).toBeGreaterThan(inicio)

    const dir = mkdtempSync(join(tmpdir(), 'user-data-higiene-'))
    try {
      const bin = join(dir, 'bin')
      const journald = join(dir, 'journald.conf.d')
      const apt = join(dir, 'apt.conf.d')
      const log = join(dir, 'systemctl.log')
      mkdirSync(bin)
      mkdirSync(apt)
      writeFileSync(join(bin, 'systemctl'), `#!/usr/bin/env bash\necho "$*" >> '${log}'\n`)
      chmodSync(join(bin, 'systemctl'), 0o755)
      const trecho = LINHAS.slice(inicio, fim + 1)
        .join('\n')
        .replace(/\/etc\/systemd\/journald\.conf\.d/g, journald)
        .replace(/\/etc\/apt\/apt\.conf\.d/g, apt)
      const rodar = () =>
        spawnSync('bash', ['-c', `${set}\n${trecho}\n`], {
          encoding: 'utf8',
          env: { ...process.env, PATH: `${bin}:${process.env.PATH}` },
        })
      const reinicios = () => (existsSync(log) ? readFileSync(log, 'utf8').split('\n').filter(Boolean) : [])
      const JOURNAL = '[Journal]\nSystemMaxUse=200M\n'

      const primeira = rodar()
      expect(primeira.status, primeira.stderr).toBe(0)
      expect(readFileSync(join(journald, 'lotus.conf'), 'utf8')).toBe(JOURNAL)
      expect(readFileSync(join(apt, '52lotus-limpeza'), 'utf8')).toBe('APT::Periodic::AutocleanInterval "7";\n')
      expect(readFileSync(join(apt, '53lotus-reboot'), 'utf8')).toBe(
        'Unattended-Upgrade::Automatic-Reboot "true";\nUnattended-Upgrade::Automatic-Reboot-Time "08:30";\n',
      )
      expect(reinicios()).toEqual(['restart systemd-journald'])

      // Reexecução no host vivo: nada muda, nada reinicia, nenhum .novo sobra.
      const segunda = rodar()
      expect(segunda.status, segunda.stderr).toBe(0)
      expect(reinicios()).toEqual(['restart systemd-journald'])
      expect(readdirSync(apt).sort()).toEqual(['52lotus-limpeza', '53lotus-reboot'])
      expect(readdirSync(journald)).toEqual(['lotus.conf'])

      // Alguém mexeu no teto: a reexecução devolve o valor e reinicia de novo.
      writeFileSync(join(journald, 'lotus.conf'), '[Journal]\nSystemMaxUse=999M\n')
      const terceira = rodar()
      expect(terceira.status, terceira.stderr).toBe(0)
      expect(readFileSync(join(journald, 'lotus.conf'), 'utf8')).toBe(JOURNAL)
      expect(reinicios()).toEqual(['restart systemd-journald', 'restart systemd-journald'])
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('higiene: o reboot automático não abre origem nova nem sobe pacote fora da janela', () => {
    // O unattended-upgrades segue só com noble-security: o Docker fica fora (o
    // upgrade dele derruba os contêineres) e o user-data não faz upgrade geral.
    expect(semComentarios).not.toContain('Allowed-Origins')
    expect(semComentarios).not.toMatch(/apt-get\s+(-y\s+)?(dist-|full-)?upgrade/)
  })
```

- [ ] **Step 2: Rodar e ver falhar.** `cd frontend && pnpm exec vitest run tests/user-data.test.ts` → FAIL
  em `higiene: grava…`, porque o `inicio` é -1. O segundo caso já passa: ele prende uma ausência.

- [ ] **Step 3: Implementar.** No fim de `deploy/aws/user-data.sh`, depois de
  `systemctl enable --now lotus-sonda.timer`:

```bash

# Higiene do host (bloco 42, spec §6 e §7). Tres arquivos proprios, cada um
# gravado so quando o conteudo muda: reexecutar no host vivo nao mexe em nada.
# - O journal usava o teto default (cerca de 10% do disco) e chegou a 183 MB.
# - O cache do apt (332 MB) nunca era limpo; a limpeza passa a semanal.
# - O kernel novo esperava reboot desde a instalacao. O unattended-upgrades segue
#   so com a origem de seguranca (o repositorio do Docker fica fora: o upgrade
#   dele reinicia o daemon e derruba os conteineres) e passa a reiniciar sozinho
#   as 08:30 do relogio do host, que e UTC: depois do backup (06:10), da
#   conferencia (06:40), das podas do banco (03:10 e 03:40 em Santiago) e do
#   apt-daily-upgrade. O 53 vence o 50unattended-upgrades pela ordem do nome.
gravar_se_mudou() {
  # $1 = destino; o conteudo vem pelo stdin. Devolve 0 se gravou, 1 se ja estava igual.
  cat > "$1.novo"
  if cmp -s "$1.novo" "$1"; then
    rm -f "$1.novo"
    return 1
  fi
  mv "$1.novo" "$1"
}
install -d -m 0755 /etc/systemd/journald.conf.d
if gravar_se_mudou /etc/systemd/journald.conf.d/lotus.conf <<'JOURNAL'
[Journal]
SystemMaxUse=200M
JOURNAL
then
  systemctl restart systemd-journald
fi
gravar_se_mudou /etc/apt/apt.conf.d/52lotus-limpeza <<'LIMPEZA' || true
APT::Periodic::AutocleanInterval "7";
LIMPEZA
gravar_se_mudou /etc/apt/apt.conf.d/53lotus-reboot <<'REBOOT' || true
Unattended-Upgrade::Automatic-Reboot "true";
Unattended-Upgrade::Automatic-Reboot-Time "08:30";
REBOOT
```

- [ ] **Step 4: Rodar e ver passar.**
  - `cd frontend && pnpm exec vitest run tests/user-data.test.ts` → PASS no arquivo inteiro.
  - `bash -n deploy/aws/user-data.sh` → sai 0.
  - `cd frontend && pnpm exec tsc -p tsconfig.node.json --noEmit` → sai 0.
  - `cd frontend && pnpm exec eslint tests/user-data.test.ts` → sai 0.

- [ ] **Step 5: Commit.**

```bash
git add deploy/aws/user-data.sh frontend/tests/user-data.test.ts
git commit -m "feat(42): user-data com teto do journal, limpeza do apt e reboot automatico"
```

- [ ] **Step 6: Sondas.** Desfaça cada uma com `git checkout -- deploy/aws/user-data.sh`.
  1. O `if cmp -s "$1.novo" "$1"; then` trocado por `if false; then` → reprova `higiene: grava…`,
     porque a segunda execução reinicia o journald.
  2. O `|| true` da linha do `52lotus-limpeza` apagado → reprova `higiene: grava…`, porque a segunda
     execução sai 1.

### Task 7: política e lifecycle do S3 versionados

**Papel:** `implementador-mecanico`. Os dois JSON e o teste vêm prontos.

**Files:**
- Create: `deploy/aws/s3-politica.json`
- Create: `deploy/aws/s3-lifecycle.json`
- Create: `frontend/tests/s3-bucket.test.ts`

**Interfaces:**
- Consumes: nada de outra task.
- Produces (as Tasks 8 e 10 usam):
  - `deploy/aws/s3-politica.json`, com quatro `Deny` de `Sid` `SoHttps`, `NinguemApagaDeVez`,
    `ApagarSoAppEInfra` e `ProtecaoSoInfra`;
  - `deploy/aws/s3-lifecycle.json`, com as regras `expira-backups`, `fotos` e `documentos`.

  Os dois são aplicados com `file://` a partir da raiz do repositório. JSON não tem comentário: o
  porquê de cada regra mora no teste e no runbook (Task 8, §3). A regra `documentos` tem filtro
  vazio e se sobrepõe às de prefixo. A página da AWS confirma que vale o prazo menor: *"if two
  expiration policies overlap, the shorter expiration policy is honored"*
  (https://docs.aws.amazon.com/AmazonS3/latest/userguide/lifecycle-conflicts.html, lida em
  2026-10-25).

- [ ] **Step 1: Escrever o teste que falha.** Crie `frontend/tests/s3-bucket.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

/**
 * Política e lifecycle do bucket de produção (bloco 42, spec §8). O bucket
 * guarda documento de peso legal: apagar tem de poder ser desfeito, e só quem o
 * João autorizou apaga. JSON não tem comentário, então o porquê de cada regra
 * mora aqui e no runbook `deploy/aws/README.md` §3.
 *
 * Asserção exata, e não presença: uma regra que ganha um principal na exceção,
 * perde uma ação ou vira `Allow` continua sendo JSON válido, e a política passa
 * a proteger menos sem nada quebrar.
 */
const RAIZ = resolve(__dirname, '..', '..')
const ler = (nome: string) => JSON.parse(readFileSync(join(RAIZ, 'deploy', 'aws', nome), 'utf8'))

type Regra = {
  Sid: string
  Effect: string
  Principal: unknown
  Action: string | string[]
  Resource: string | string[]
  Condition?: unknown
}
const POLITICA: { Version: string; Statement: Regra[] } = ler('s3-politica.json')
const LIFECYCLE: { Rules: Array<Record<string, unknown>> } = ler('s3-lifecycle.json')

const BUCKET = 'arn:aws:s3:::lotus-prod-760144413534'
const APP = 'arn:aws:iam::760144413534:role/lotus-ec2'
const INFRA = 'arn:aws:iam::760144413534:user/lotus-infra'
const GOVERNANCA = [
  's3:PutBucketPolicy',
  's3:DeleteBucketPolicy',
  's3:PutBucketVersioning',
  's3:PutLifecycleConfiguration',
  's3:PutBucketPublicAccessBlock',
  's3:PutEncryptionConfiguration',
  's3:PutBucketOwnershipControls',
  's3:DeleteBucket',
]

const regra = (sid: string): Regra => {
  const achada = POLITICA.Statement.find((s) => s.Sid === sid)
  if (!achada) throw new Error(`regra ${sid} ausente de deploy/aws/s3-politica.json`)
  return achada
}
const lista = (valor: string | string[]) => (Array.isArray(valor) ? valor : [valor])
const doLifecycle = (id: string) => LIFECYCLE.Rules.find((r) => r.ID === id)

describe('deploy/aws/s3-politica.json', () => {
  it('quatro regras, todas Deny para qualquer principal: a política só tira, nunca concede', () => {
    expect(POLITICA.Version).toBe('2012-10-17')
    expect(POLITICA.Statement.map((s) => s.Sid)).toEqual(['SoHttps', 'NinguemApagaDeVez', 'ApagarSoAppEInfra', 'ProtecaoSoInfra'])
    for (const s of POLITICA.Statement) {
      expect(s.Effect, s.Sid).toBe('Deny')
      expect(s.Principal, s.Sid).toBe('*')
    }
  })

  it('SoHttps: nada passa sem TLS, nem no bucket nem nos objetos', () => {
    const r = regra('SoHttps')
    expect(r.Action).toBe('s3:*')
    expect([...lista(r.Resource)].sort()).toEqual([BUCKET, `${BUCKET}/*`])
    expect(r.Condition).toEqual({ Bool: { 'aws:SecureTransport': 'false' } })
  })

  it('NinguemApagaDeVez: DeleteObjectVersion negado a todos, sem exceção nenhuma', () => {
    const r = regra('NinguemApagaDeVez')
    expect(r.Action).toBe('s3:DeleteObjectVersion')
    expect(r.Resource).toBe(`${BUCKET}/*`)
    expect(r.Condition).toBeUndefined()
  })

  it('ApagarSoAppEInfra: só o app e o lotus-infra apagam, e o apagar vira marca', () => {
    const r = regra('ApagarSoAppEInfra')
    expect(r.Action).toBe('s3:DeleteObject')
    expect(r.Resource).toBe(`${BUCKET}/*`)
    expect(r.Condition).toEqual({ ArnNotEquals: { 'aws:PrincipalArn': [APP, INFRA] } })
  })

  it('ProtecaoSoInfra: só o lotus-infra mexe na proteção do bucket', () => {
    const r = regra('ProtecaoSoInfra')
    expect(r.Resource).toBe(BUCKET)
    expect(r.Condition).toEqual({ ArnNotEquals: { 'aws:PrincipalArn': INFRA } })
    // Pode ganhar ação de governança, nunca perder uma destas (spec §8.1, regra 4).
    for (const acao of GOVERNANCA) expect(lista(r.Action), acao).toContain(acao)
  })
})

describe('deploy/aws/s3-lifecycle.json', () => {
  it('três regras: os backups, as fotos e o resto do bucket', () => {
    expect(LIFECYCLE.Rules.map((r) => r.ID)).toEqual(['expira-backups', 'fotos', 'documentos'])
  })

  it('expira-backups igual à medida em 2026-10-25: o bloco não mexe na retenção do backup', () => {
    expect(doLifecycle('expira-backups')).toEqual({
      ID: 'expira-backups',
      Status: 'Enabled',
      Filter: { Prefix: 'backups/' },
      Expiration: { Days: 30 },
      NoncurrentVersionExpiration: { NoncurrentDays: 7 },
      AbortIncompleteMultipartUpload: { DaysAfterInitiation: 7 },
    })
  })

  it('fotos: versão antiga em 1 dia, o mínimo do S3, e a marca que sobra sozinha sai', () => {
    expect(doLifecycle('fotos')).toEqual({
      ID: 'fotos',
      Status: 'Enabled',
      Filter: { Prefix: 'user-photos/' },
      Expiration: { ExpiredObjectDeleteMarker: true },
      NoncurrentVersionExpiration: { NoncurrentDays: 1 },
    })
  })

  it('documentos: filtro vazio cobre todo prefixo, inclusive os que o app ainda vai criar', () => {
    expect(doLifecycle('documentos')).toEqual({
      ID: 'documentos',
      Status: 'Enabled',
      Filter: {},
      Expiration: { ExpiredObjectDeleteMarker: true },
      NoncurrentVersionExpiration: { NoncurrentDays: 7 },
      AbortIncompleteMultipartUpload: { DaysAfterInitiation: 7 },
    })
  })
})
```

- [ ] **Step 2: Rodar e ver falhar.** `cd frontend && pnpm exec vitest run tests/s3-bucket.test.ts` → FAIL
  na carga do módulo, com `ENOENT` em `deploy/aws/s3-politica.json`.

- [ ] **Step 3: Escrever `deploy/aws/s3-politica.json`:**

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "SoHttps",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:*",
      "Resource": [
        "arn:aws:s3:::lotus-prod-760144413534",
        "arn:aws:s3:::lotus-prod-760144413534/*"
      ],
      "Condition": { "Bool": { "aws:SecureTransport": "false" } }
    },
    {
      "Sid": "NinguemApagaDeVez",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:DeleteObjectVersion",
      "Resource": "arn:aws:s3:::lotus-prod-760144413534/*"
    },
    {
      "Sid": "ApagarSoAppEInfra",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:DeleteObject",
      "Resource": "arn:aws:s3:::lotus-prod-760144413534/*",
      "Condition": {
        "ArnNotEquals": {
          "aws:PrincipalArn": [
            "arn:aws:iam::760144413534:role/lotus-ec2",
            "arn:aws:iam::760144413534:user/lotus-infra"
          ]
        }
      }
    },
    {
      "Sid": "ProtecaoSoInfra",
      "Effect": "Deny",
      "Principal": "*",
      "Action": [
        "s3:PutBucketPolicy",
        "s3:DeleteBucketPolicy",
        "s3:PutBucketVersioning",
        "s3:PutLifecycleConfiguration",
        "s3:PutBucketPublicAccessBlock",
        "s3:PutEncryptionConfiguration",
        "s3:PutBucketOwnershipControls",
        "s3:DeleteBucket"
      ],
      "Resource": "arn:aws:s3:::lotus-prod-760144413534",
      "Condition": {
        "ArnNotEquals": { "aws:PrincipalArn": "arn:aws:iam::760144413534:user/lotus-infra" }
      }
    }
  ]
}
```

- [ ] **Step 4: Escrever `deploy/aws/s3-lifecycle.json`:**

```json
{
  "Rules": [
    {
      "ID": "expira-backups",
      "Status": "Enabled",
      "Filter": { "Prefix": "backups/" },
      "Expiration": { "Days": 30 },
      "NoncurrentVersionExpiration": { "NoncurrentDays": 7 },
      "AbortIncompleteMultipartUpload": { "DaysAfterInitiation": 7 }
    },
    {
      "ID": "fotos",
      "Status": "Enabled",
      "Filter": { "Prefix": "user-photos/" },
      "Expiration": { "ExpiredObjectDeleteMarker": true },
      "NoncurrentVersionExpiration": { "NoncurrentDays": 1 }
    },
    {
      "ID": "documentos",
      "Status": "Enabled",
      "Filter": {},
      "Expiration": { "ExpiredObjectDeleteMarker": true },
      "NoncurrentVersionExpiration": { "NoncurrentDays": 7 },
      "AbortIncompleteMultipartUpload": { "DaysAfterInitiation": 7 }
    }
  ]
}
```

- [ ] **Step 5: Rodar e ver passar.**
  - `cd frontend && pnpm exec vitest run tests/s3-bucket.test.ts` → PASS.
  - `cd frontend && pnpm exec tsc -p tsconfig.node.json --noEmit` → sai 0.
  - `cd frontend && pnpm exec eslint tests/s3-bucket.test.ts` → sai 0.

- [ ] **Step 6: Commit.**

```bash
git add deploy/aws/s3-politica.json deploy/aws/s3-lifecycle.json frontend/tests/s3-bucket.test.ts
git commit -m "feat(42): politica e lifecycle do bucket versionados"
```

- [ ] **Step 7: Sondas.** Desfaça cada uma com `git checkout -- deploy/aws/`.
  1. Acrescentar `"arn:aws:iam::760144413534:user/JoaoVBA"` à exceção do `ApagarSoAppEInfra` →
     reprova `ApagarSoAppEInfra…`.
  2. `"NoncurrentDays": 30` na regra `documentos` → reprova `documentos…`.
  3. `"Effect": "Allow"` no `NinguemApagaDeVez` → reprova `quatro regras…`.

### Task 8: runbook, Q-1, ADRs e lição 19

**Papel:** `implementador-integracao`. Os blocos de comando e os textos de ADR vêm prontos. A prosa
do runbook segue o estilo do arquivo.

**Files:**
- Create: `frontend/tests/runbook-higiene.test.ts`
- Modify: `deploy/aws/README.md` (§3, §3.1 nova, §7, §9, §14.6, §15 e §16 nova; as linhas estão no Step 3)
- Modify: `docs/adrs.md:104` (emenda do ADR-11) e `docs/adrs.md:233` (emenda do ADR-14, antes do ADR-15)
- Modify: `docs/README.md:127` (emenda da lição 19)

**Interfaces:**
- Consumes:
  - `deploy/bin/podar-imagens.sh` e o contrato de saída dele (Task 2).
  - O aviso `aviso: a poda de imagens falhou; a promocao segue OK` (Task 3).
  - As mensagens novas do backup (Tasks 4 e 5).
  - Os três arquivos do host (Task 6).
  - `deploy/aws/s3-politica.json` e `deploy/aws/s3-lifecycle.json` (Task 7).
- Produces:
  - o §3.1 (desfazer), que a Task 10 segue;
  - o §16 (manutenção do host), que a Task 9 segue.

  O `docs/adrs.md` e o `docs/README.md` são docs normativos. A guarda `repo-docs-refs.test.ts`
  confere que todo path citado entre crases existe. Todos os que este texto cita existem depois das
  Tasks 2, 4, 6 e 7.

- [ ] **Step 1: Escrever o teste que falha.** Crie `frontend/tests/runbook-higiene.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

/**
 * O runbook `deploy/aws/README.md` depois do bloco 42 (higiene da produção).
 * Q-1 do bloco 13: `docker rm` sem `-v` deixou no host um volume anônimo com uma
 * cópia do banco de produção. O §7 é a lista do que vai ao host: script de
 * `deploy/bin/` fora dela trava o botão no sha256 de `bin/` (item 31). E o §3 é
 * a ordem de aplicar a política do bucket, com a saída de emergência antes.
 */
const RAIZ = resolve(__dirname, '..', '..')
const RUNBOOK = readFileSync(join(RAIZ, 'deploy', 'aws', 'README.md'), 'utf8')
const secao = (inicio: string, fim: string): string => {
  const a = RUNBOOK.indexOf(inicio)
  expect(a, inicio).toBeGreaterThan(-1)
  const b = fim === '' ? RUNBOOK.length : RUNBOOK.indexOf(fim, a + 1)
  expect(b, fim).toBeGreaterThan(a)
  return RUNBOOK.slice(a, b)
}

describe('deploy/aws/README.md — higiene da produção (bloco 42)', () => {
  it('Q-1: contêiner descartável sai com o volume anônimo, no runbook inteiro', () => {
    expect(RUNBOOK).not.toMatch(/docker rm -f\s/)
    expect(RUNBOOK.match(/docker rm -fv /g)?.length ?? 0).toBeGreaterThanOrEqual(3)
  })

  it('§7 leva o podar-imagens.sh ao host — sem ele o botão trava no sha256 de bin/', () => {
    const s7 = secao('\n## 7. ', '\n## 8. ')
    expect(s7).toMatch(/^scp .*deploy\/bin\/podar-imagens\.sh/m)
    expect(s7).toMatch(/^sudo mv .*\/tmp\/podar-imagens\.sh/m)
  })

  it('§3: lifecycle, login da raiz e só então a política, dos arquivos versionados', () => {
    const s3 = secao('\n## 3. ', '\n### 3.1 ')
    const lifecycle = s3.indexOf('--lifecycle-configuration file://deploy/aws/s3-lifecycle.json')
    const raiz = s3.indexOf('login da raiz')
    const politica = s3.indexOf('--policy file://deploy/aws/s3-politica.json')
    expect(lifecycle).toBeGreaterThan(-1)
    expect(raiz).toBeGreaterThan(lifecycle)
    expect(politica).toBeGreaterThan(raiz)
    expect(s3).toContain('https://docs.aws.amazon.com/AmazonS3/latest/userguide/lifecycle-conflicts.html')
    expect(s3).toContain('Permissions → Bucket policy → Delete')
  })

  it('§3.1 desfaz um apagão copiando a versão anterior por cima da chave', () => {
    const s31 = secao('\n### 3.1 ', '\n## 4. ')
    expect(s31).toContain('aws s3api list-object-versions')
    expect(s31).toContain('--copy-source "lotus-prod-760144413534/<chave>?versionId=<id>"')
    expect(s31).toContain('s3:DeleteObjectVersion')
  })

  it('§14.6: o alarme de disco aponta a poda do §16.1', () => {
    const disco = secao('**`lotus-prod-disco`.**', '**`lotus-prod-certificado`.**')
    expect(disco).toContain('§16.1')
    expect(disco).toContain('aviso: a poda de imagens falhou')
  })

  it('§16: a poda à mão, os três arquivos do user-data e a janela manual', () => {
    const s16 = secao('\n## 16. ', '')
    expect(s16).toContain(`sudo sh -c '/opt/lotus/bin/podar-imagens.sh "$(cat /opt/lotus/CURRENT_SHA)"'`)
    for (const arquivo of [
      '/etc/systemd/journald.conf.d/lotus.conf',
      '/etc/apt/apt.conf.d/52lotus-limpeza',
      '/etc/apt/apt.conf.d/53lotus-reboot',
    ]) {
      expect(s16).toContain(arquivo)
    }
    expect(s16).toContain('08:30')
    expect(s16).toContain('§14.7')
    expect(s16).toContain('apt list --upgradable')
  })
})
```

- [ ] **Step 2: Rodar e ver falhar.** `cd frontend && pnpm exec vitest run tests/runbook-higiene.test.ts` →
  FAIL nos seis casos. O Q-1 acha os três `docker rm -f `, e as outras seções ainda não existem ou
  não citam o que se pede.

- [ ] **Step 3: Editar o `deploy/aws/README.md`.**

  **(a) §3, linhas 38 a 64.** Troque do bullet que começa em "- **Lifecycle rule** `expira-backups`" até o fim
  do parágrafo `Prova:` (antes do `## 4.`) por:

````markdown
- **Lifecycle**: `deploy/aws/s3-lifecycle.json`, três regras.

  | Regra | Filtro | Versão atual | Versão antiga | Outras |
  |---|---|---|---|---|
  | `expira-backups` | `backups/` | expira em 30 dias | 7 dias | multipart incompleto em 7 dias |
  | `fotos` | `user-photos/` | — | 1 dia | a marca de exclusão que sobra sozinha sai |
  | `documentos` | vazio: o bucket inteiro | — | 7 dias | a marca de exclusão que sobra sozinha sai; multipart incompleto em 7 dias |

  **Com versioning ligado, `Expiration` sozinha não apaga nada**: ela só põe delete marker, e a
  versão antiga fica ocupando (e custando) para sempre. Medido em 2026-09-04; por isso a regra dos
  backups tem as três cláusulas (o requisito de retenção mínima é 7 dias, e os 30 são folga
  deliberada). A regra `documentos` tem filtro vazio e alcança também `backups/`, `user-photos/` e
  qualquer prefixo que o app venha a criar. Na sobreposição vale o prazo menor: *"if two expiration
  policies overlap, the shorter expiration policy is honored"*
  (https://docs.aws.amazon.com/AmazonS3/latest/userguide/lifecycle-conflicts.html). É por isso que
  a foto expira em 1 dia, e não em 7.
- **Bucket policy**: `deploy/aws/s3-politica.json`, quatro `Deny` e nenhum `Allow`:
  - `SoHttps`: nada passa sem TLS, nem no bucket nem nos objetos;
  - `NinguemApagaDeVez`: `s3:DeleteObjectVersion` é negado a todos, o `lotus-infra` inclusive. Quem
    apaga versão é só o lifecycle, que não passa pela política. Todo apagar vira marca de exclusão
    e se desfaz pelo §3.1 enquanto a versão anterior existir: 7 dias para documento, 1 dia para
    foto;
  - `ApagarSoAppEInfra`: só o app (`lotus-ec2`) e o `lotus-infra` apagam. `gabriel`, `JoaoVBA` e as
    roles `OrganizationAccountAccessRole` e `administrador`, da conta-mãe, leem e gravam, mas não
    apagam. É o pedido do João (spec do bloco 42);
  - `ProtecaoSoInfra`: política, versioning, lifecycle, bloqueio público, criptografia, ownership e
    apagar o bucket são só do `lotus-infra`, que por enquanto age sem MFA (decisão do João,
    2026-10-25).
- **CORS**: nenhum. Upload passa pela API e download é URL pré-assinada por GET simples; só uma
  medição que prove necessidade justifica acrescentar.

Aplicar da raiz do repositório, com o perfil `lotus` (`lotus-infra`), nesta ordem:

```bash
aws s3api put-bucket-lifecycle-configuration --bucket lotus-prod-760144413534 \
  --lifecycle-configuration file://deploy/aws/s3-lifecycle.json --profile lotus
# antes da política: login da raiz da conta 760144413534 no console, com MFA (a saída de emergência)
aws s3api put-bucket-policy --bucket lotus-prod-760144413534 \
  --policy file://deploy/aws/s3-politica.json --profile lotus
```

**Saída de emergência.** A raiz da conta sempre consegue apagar a política de um bucket, mesmo
quando a política a nega. Perder o `lotus-infra` (a chave, o usuário ou a permissão) cai aqui:
console como raiz, com MFA → S3 → `lotus-prod-760144413534` → Permissions → Bucket policy → Delete.
Por isso o login da raiz é conferido antes de toda aplicação da política.

Prova: `get-bucket-versioning` → `Enabled`; `get-public-access-block` → os quatro `true`;
`get-bucket-lifecycle-configuration` e `get-bucket-policy` → iguais aos dois arquivos;
`get-bucket-location` → `sa-east-1`.
Pela CLI, `create-bucket` em `sa-east-1` **exige** `--create-bucket-configuration
LocationConstraint=sa-east-1`; sem isso o bucket nasce em `us-east-1`.
````

  **(b) §3.1, nova, logo antes do `## 4.`:**

````markdown
### 3.1 Desfazer um apagão

Apagar sem versão (`aws s3 rm`, ou o app) põe uma marca de exclusão por cima da chave, e a versão
anterior fica guardada: 7 dias para documento, 1 dia para foto (§3). Para trazer de volta, copia-se
a versão anterior por cima da chave, e a cópia vira a versão atual. Remover a marca de exclusão
exigiria `s3:DeleteObjectVersion`, que a política nega a todos.

```bash
aws s3api list-object-versions --bucket lotus-prod-760144413534 --prefix '<chave>' --profile lotus \
  --query '{versoes: Versions[].[Key,VersionId,LastModified,IsLatest], marcas: DeleteMarkers[].[Key,VersionId,LastModified,IsLatest]}'
aws s3api copy-object --bucket lotus-prod-760144413534 --key '<chave>' --profile lotus \
  --copy-source "lotus-prod-760144413534/<chave>?versionId=<id>"
aws s3 cp 's3://lotus-prod-760144413534/<chave>' /tmp/conferir --profile lotus
```

O `<id>` é o `VersionId` da versão de `LastModified` mais recente entre as `versoes`, a que a marca
cobriu. O `--prefix` traz também as chaves que começam igual: confira a `Key`. Chave com caractere
fora de `[A-Za-z0-9/._-]` vai URL-encoded no `--copy-source`. Só dê por desfeito depois de conferir
o conteúdo baixado em `/tmp/conferir`, e apague a cópia local.

O objeto volta ao S3, não ao banco: se a linha em `files` (ou o `photo_path` do usuário) também
saiu, o app não o enxerga até a linha voltar. O desfazer cobre o apagão no bucket: um órfão
removido por engano, um `aws s3 rm` errado.
````

  **(c) §7, linhas 201 e 210.** A lista do `scp` e a do `mv` ganham o script novo:

```bash
scp -i "$PEM" deploy/bin/deploy.sh deploy/bin/backup-db.sh deploy/bin/verificar-backup.sh deploy/bin/recarregar-nginx.sh deploy/bin/sondar-saude.sh deploy/bin/conferir-golive.sh deploy/bin/podar-imagens.sh ubuntu@<EIP>:/tmp/
```

```bash
sudo mv /tmp/deploy.sh /tmp/backup-db.sh /tmp/verificar-backup.sh /tmp/recarregar-nginx.sh /tmp/sondar-saude.sh /tmp/conferir-golive.sh /tmp/podar-imagens.sh /opt/lotus/bin/ && sudo sh -c 'chmod +x /opt/lotus/bin/*.sh'
```

  **(d) §9, três mudanças.**
  - Depois do parágrafo `06:10 UTC = 03:10 no Chile. Rodar uma vez à mão para provar: …`, um
    parágrafo novo:

```markdown
O upload tenta três vezes, com 30 s e depois 60 s de espera, e cada falha deixa no log a linha
`aviso: upload falhou (tentativa N de 3)`. Três falhas saem 1 com `erro: upload falhou 3 vezes`. O
script também dá ao CLI três tentativas de 5 s no IMDS: o backup de 2026-10-07 caiu num soluço
dele, com `Unable to locate credentials`.
```

  - Depois do parágrafo que começa em "O `verificar-backup.sh` olha o **efeito**, não o processo", um
    parágrafo novo:

```markdown
Consulta que falha não vira "nenhum backup". Se o S3 não responde (credencial, rede, permissão), o
e-mail diz que **a consulta falhou** e que não dá para afirmar que há cópia: é a instância que não
alcança o S3, não o backup que sumiu. Comece pelas credenciais da instance role
(`aws sts get-caller-identity` no host).
```

  - Linha 533: `docker rm -f restore-prova` passa a `docker rm -fv restore-prova`.

  **(e) §14.6, linhas 1298 a 1300, alarme de disco.** O parágrafo que começa em
  `Os logs dos contêineres têm teto` passa a ser:

```markdown
Os logs dos contêineres têm teto (10 MB × 3 cada), o journal tem teto de 200 MB (§16.2) e o swap é
fixo. Desde o bloco 42 o deploy guarda só as imagens do SHA atual e do anterior (§16.1), e o que
cresce é o volume do MySQL. Imagem velha acumulada quer dizer poda falhando: procure
`aviso: a poda de imagens falhou` na saída do último deploy e rode a poda à mão (§16.1).
```

  **(f) §15, linhas 1433 e 1465.** `sudo docker rm -f lotus-golive-prova` passa a
  `sudo docker rm -fv lotus-golive-prova`, e `sudo docker rm -f lotus-restore-ensaio` passa a
  `sudo docker rm -fv lotus-restore-ensaio`. Depois, `grep -n 'docker rm -f ' deploy/aws/README.md`
  tem de sair vazio. Não escreva o literal `docker rm -f ` (com espaço depois do `f`) em lugar
  nenhum do runbook, nem em prosa: a catraca do Q-1 o recusa.

  **(g) §16, nova, no fim do arquivo:**

````markdown
## 16. Manutenção do host

O que acontece sozinho: o backup (§9), a poda do banco (agendada no app), a renovação do
certificado (§11.5), a poda das imagens a cada deploy (16.1) e as atualizações de segurança, com
reboot automático (16.3). O que passa pela mão do João é a atualização fora de segurança, numa
janela (16.4). Avisar que há pendência é papel do painel central de observabilidade, que é ficha
própria.

### 16.1 Imagens

O `deploy.sh` chama o `podar-imagens.sh` depois de gravar o `CURRENT_SHA`, e o host guarda as
imagens de dois SHAs: o atual e o anterior, que é o alvo do rollback do §8.1. O anterior sai do
ledger (§8.2), e não do `CURRENT_SHA`: promover o mesmo SHA de novo não apaga o alvo de rollback.
Imagem fora de `lotus-app`, `lotus-web` e `lotus-clamav` não sai. A falha da poda vira a linha
`aviso: a poda de imagens falhou; a promocao segue OK`, e a promoção continua registrada como ok.
Rollback para um SHA mais antigo volta por `docker pull`: o GHCR guarda todos.

À mão, com a mesma regra:

```bash
sudo sh -c '/opt/lotus/bin/podar-imagens.sh "$(cat /opt/lotus/CURRENT_SHA)"'
```

O `sudo sh -c` não é enfeite: o `/opt/lotus` é `750 root:root`, e o `$(cat …)` expandido no shell
do `ubuntu` chegaria vazio. A primeira linha diz o que fica (`mantidas: <atual> <anterior>`), e
cada `removida:` é uma imagem que saiu. Saída 1 quer dizer imagem presa a contêiner, mesmo parado,
e `sudo docker ps -a --format '{{.Names}} {{.Image}} {{.Status}}'` mostra qual. Nunca
`docker image rm -f`. O espaço pode demorar a aparecer no `df`, porque o containerd solta os
snapshots depois (`sudo docker system df`).

### 16.2 Journal e cache do apt

Os dois ficam versionados no `deploy/aws/user-data.sh`:

- `/etc/systemd/journald.conf.d/lotus.conf`, com `SystemMaxUse=200M`. Para conferir:
  `journalctl --disk-usage`.
- `/etc/apt/apt.conf.d/52lotus-limpeza`, com `APT::Periodic::AutocleanInterval "7";`, a limpeza
  semanal do cache. Para conferir: `apt-config dump | grep AutocleanInterval`.

### 16.3 Reboot automático

O `/etc/apt/apt.conf.d/53lotus-reboot` liga o reboot do `unattended-upgrades` às 08:30 do relógio
do host, que é UTC (`timedatectl`): 05:30 em Santiago no horário de verão e 04:30 no de inverno.
Fica depois do backup (06:10), da conferência (06:40), das podas do banco (03:10 e 03:40 em
Santiago) e do `apt-daily-upgrade`. O host só reinicia quando a atualização pede
(`/var/run/reboot-required`). O 53 vence o `50unattended-upgrades` pela ordem do nome. Só a origem
de segurança entra: o repositório do Docker fica fora, porque o upgrade dele reinicia o daemon e
derruba os contêineres. Os contêineres voltam sozinhos depois do boot, porque todo serviço do
compose de produção tem `restart: unless-stopped`.

O `lotus-prod-up` só dispara com 3 minutos sem resposta em 5, e um reboot normal passa sem alarme.
O tempo fora medido na primeira janela está no `execucao-producao.md` do bloco 42
(`docs/superpowers/blocos/42-infra-producao-higiene-e-manutencao/`). Um reboot agendado aparece em
`/run/systemd/shutdown/scheduled`, e `sudo shutdown -c` o cancela.

### 16.4 Janela manual: atualização de versão

Quando o João decidir aplicar o que não é de segurança:

1. Listar o pendente: `apt list --upgradable`.
2. Desligar as ações dos alarmes (§14.7).
3. Aplicar: `sudo apt-get update && sudo apt-get -y upgrade`. Pergunta de arquivo de configuração
   fica com a versão instalada (o default). O que ficar retido (`apt list --upgradable` de novo) vai
   para o registro e para o João decidir. O upgrade do Docker reinicia os contêineres no meio: é
   por isso que os alarmes estão desligados.
4. Reiniciar, se `ls /var/run/reboot-required` mostrar o arquivo: `sudo reboot`.
5. Conferir:

   ```bash
   uname -r
   sudo docker ps --filter label=com.docker.compose.project=lotus --format '{{.Names}} {{.Status}}'
   curl -s -o /dev/null -w '%{http_code}\n' https://app.lotusotec.cl/up
   sudo docker logs --since 20m "$(sudo docker ps -qf label=com.docker.compose.service=mysql)" 2>&1 \
     | grep -iE 'crash recovery|not shut ?down normally'
   ```

   Os seis contêineres (`app`, `scheduler`, `mysql`, `nginx`, `gotenberg`, `clamav`) em `Up`, o
   `/up` em 200 e nenhuma linha do `grep`: o MySQL parou limpo, sem recuperação do InnoDB no boot.
6. Religar as ações dos alarmes (§14.7) e conferir o `ActionsEnabled`.
````

- [ ] **Step 4: As emendas dos ADRs.** Em `docs/adrs.md`:
  - Depois do parágrafo `**Porquê:**` do ADR-11 (linha 104), com uma linha em branco antes:

```markdown
**Emenda (2026-10-25, bloco `infra-producao-higiene-e-manutencao`).** O bucket de produção ganha
política e retenção versionadas, `deploy/aws/s3-politica.json` e `deploy/aws/s3-lifecycle.json`,
aplicadas pelo runbook `deploy/aws/README.md` §3:
- **Ninguém apaga de vez.** `s3:DeleteObjectVersion` é negado a todos, o `lotus-infra` inclusive.
  Quem apaga versão é só o lifecycle, que não passa pela política.
- **Todo apagar se desfaz.** Apagar vira marca de exclusão, e a versão anterior fica 7 dias para
  documento e 1 dia para foto: a spec J-02 já mandava apagar foto sem retenção, e 1 dia é o mínimo
  do S3. O passo a passo está no runbook, §3.1.
- **Quem apaga:** só o app (`lotus-ec2`) e o `lotus-infra`. Os outros admins da conta e as roles da
  conta-mãe leem e gravam, mas não apagam.
- **Quem mexe na proteção:** só o `lotus-infra` (política, versioning, lifecycle, bloqueio
  público, criptografia, ownership e apagar o bucket), sem MFA por enquanto. A saída de
  emergência é a raiz da conta, que sempre consegue apagar a política.

Decisão do João na spec do bloco 42.
```

  - No fim do ADR-14, depois da emenda de 2026-10-06 (que termina em
    `…(RTO medido, custo estimado, data e tamanho).`) e antes do `## ADR-15`:

```markdown
**Emenda (2026-10-25, bloco `infra-producao-higiene-e-manutencao`).** Duas partes do *patching SO*
e da operação passam a acontecer sozinhas:
- **Reboot automático.** O `unattended-upgrades` segue só com a origem de segurança. O repositório
  do Docker fica fora, porque o upgrade dele reinicia o daemon e derruba os contêineres. Quando a
  atualização pede reboot, o host reinicia sozinho às 08:30 UTC, depois do backup e da
  conferência. Atualização fora de segurança continua manual, numa janela pelo runbook
  `deploy/aws/README.md` §16.4.
- **Poda de imagens no deploy.** O `deploy/bin/deploy.sh` chama o `deploy/bin/podar-imagens.sh`
  depois de gravar o `CURRENT_SHA`. O host guarda as imagens do SHA atual e do anterior, que é o
  alvo de rollback. A falha da poda vira aviso e não derruba a promoção. Rollback para um SHA mais
  antigo volta por `docker pull`, porque o GHCR guarda todos.

O teto de 200 MB do journal e a limpeza semanal do cache do apt também passam a ser versionados no
`deploy/aws/user-data.sh`.
```

- [ ] **Step 5: A emenda da lição 19.** Em `docs/README.md`, a linha 127 é o parágrafo inteiro da
  lição 19. Acrescente ao fim dele, depois de
  `…a mesma catraca prende o §7 e o §15 do runbook ao script.`, na mesma linha, depois de um espaço:

```markdown
**Emenda de 2026-10-25 (item 42):** pares nominais novos `deploy/bin/podar-imagens.sh` ↔ `frontend/tests/podar-imagens.test.ts`, provado por execução com o `docker` falso de `frontend/tests/fixtures/podar-imagens/`, e `deploy/aws/s3-politica.json` com `deploy/aws/s3-lifecycle.json` ↔ `frontend/tests/s3-bucket.test.ts`. O `deploy/bin/backup-db.sh` passa a ser provado também por execução, com os falsos de `frontend/tests/fixtures/backup-db/`, e o runbook `deploy/aws/README.md` ganha a catraca `frontend/tests/runbook-higiene.test.ts`.
```

- [ ] **Step 6: Rodar e ver passar.**
  - `cd frontend && pnpm exec vitest run tests/runbook-higiene.test.ts tests/conferir-golive.test.ts tests/repo-docs-refs.test.ts`
    → PASS. O `conferir-golive` prende a mesma linha `scp` do §7, e o §15 dele agora se estende até
    o §16. O `repo-docs-refs` confere os paths das emendas.
  - Depois, o projeto inteiro: `cd frontend && pnpm exec vitest run --project repo` → PASS.
  - `cd frontend && pnpm exec tsc -p tsconfig.node.json --noEmit` → sai 0.
  - `cd frontend && pnpm exec eslint tests/runbook-higiene.test.ts` → sai 0.

- [ ] **Step 7: Commit.**

```bash
git add deploy/aws/README.md docs/adrs.md docs/README.md frontend/tests/runbook-higiene.test.ts
git commit -m "docs(42): runbook da higiene, Q-1 e emendas dos ADR-11 e ADR-14"
```

- [ ] **Step 8: Sondas.** Desfaça cada uma com `git checkout -- deploy/aws/README.md`.
  1. Voltar o `-fv` da linha 1433 para `-f` → reprova `Q-1…`.
  2. Tirar o `deploy/bin/podar-imagens.sh` da linha `scp` → reprova `§7…` (e o `conferir-golive`
     continua verde, porque ele prende outro script).

### Task 9: produção — o host (o João roda, Claude confere)

**Papel:** sessão principal, com o João. Sem subagente.

**Pré-requisitos:**
- As Tasks 1 a 8 estão commitadas.
- O `revisor-branch` do portão não deixou achado Crítico ou Importante aberto.

**Files:**
- Create: `docs/superpowers/blocos/42-infra-producao-higiene-e-manutencao/execucao-producao.md`
- Modify: `docs/superpowers/blocos/42-infra-producao-higiene-e-manutencao/aceitacao.md` (itens 1 a 4)

**Interfaces:**
- Consumes:
  - o `deploy/bin/podar-imagens.sh` da lane e o contrato de saída dele (Task 2);
  - o conteúdo exato dos três arquivos do host (Task 6);
  - os §14.7 e §16 do runbook (Task 8).
- Produces: o registro da execução, que a Task 10 continua no mesmo arquivo.

**Notação.** **[João]** marca escrita em produção: só o João roda. **[Claude]** marca leitura: SSH
com `ssh -i ~/.ssh/lotus-prod.pem ubuntu@18.230.53.197 '<comando>'` ou AWS CLI com
`--profile lotus`. Os comandos de Claude ficam simples, sem variável de shell. Um comando longo vira
script no rascunho da sessão. `<rascunho>` é o diretório de rascunho da sessão.

**O registro.** O `execucao-producao.md` nasce com este esqueleto. Cada seção recebe a data e hora
UTC, os comandos, a saída resumida e o resultado.

```markdown
# Bloco 42 — execução em produção

## Host
### Medição antes
### Limpeza única
### journald e apt
### Janela manual
### Reboot automático

## S3
### Lifecycle
### Login da raiz
### Política
### Negações
### Órfãos
### Desfazer
### Leitura de volta
```

- [ ] **Step 1: Medição antes [Claude].**

```bash
ssh -i ~/.ssh/lotus-prod.pem ubuntu@18.230.53.197 'df -h /; sudo docker image ls --format "{{.Repository}}:{{.Tag}} {{.Size}}" | sort; sudo docker volume ls -qf dangling=true; sudo docker ps -a --format "{{.Names}} {{.Image}} {{.Status}}"; uname -r; ls /var/run/reboot-required; apt list --upgradable 2>/dev/null | tail -n +2; timedatectl | grep "Time zone"; journalctl --disk-usage; sudo du -sh /var/cache/apt; sudo cat /opt/lotus/CURRENT_SHA; sudo tail -n 8 /opt/lotus/releases.jsonl; sudo ls -l /opt/lotus/prova-certificado.php'
aws cloudwatch describe-alarms --region sa-east-1 --alarm-names lotus-prod-up lotus-prod-5xx lotus-prod-disco lotus-prod-certificado --query 'MetricAlarms[].[AlarmName,StateValue,ActionsEnabled]' --output text --profile lotus
```

  Vai para o registro:
  - o `CURRENT_SHA`;
  - o anterior que a poda vai guardar: o último `fim` ok de outro SHA no ledger;
  - o ID **completo** do volume dangling (`901f0f78…`);
  - os SHAs por repositório;
  - o disco, o kernel e o pendente do apt.

  A medição de 2026-10-25 é a referência
  (`docs/superpowers/audits/2026-10-25-saude-infra.md`). O que mudou desde então fica dito.

- [ ] **Step 2: Limpeza única [João].** Da raiz da lane:

```bash
scp -i ~/.ssh/lotus-prod.pem deploy/bin/podar-imagens.sh ubuntu@18.230.53.197:/tmp/
ssh -i ~/.ssh/lotus-prod.pem ubuntu@18.230.53.197
```

  No host:

```bash
sudo sh -c 'bash /tmp/podar-imagens.sh "$(cat /opt/lotus/CURRENT_SHA)"'; echo "saida=$?"
sudo docker ps -a --filter volume=<ID completo do Step 1> --format '{{.Names}}'   # tem de sair vazio
sudo docker volume rm <ID completo do Step 1>
sudo rm /opt/lotus/prova-certificado.php /tmp/podar-imagens.sh
```

  - **Esperado.**
    - A primeira linha é `mantidas: <CURRENT_SHA> <anterior do Step 1>`.
    - Há uma `removida:` por imagem fora dos dois SHAs. A medição previa 12 SHAs nos três
      repositórios.
    - A última linha é `saida=0`.
  - **Se der `saida=1`, pare.** Leia o `recusada:` e o `docker ps -a` do Step 1 e decida com o
    João. Nunca use `-f`.
  - **O `sudo sh -c`** expande o `$(cat …)` como root. Fora dele, o shell do `ubuntu` não lê o
    `/opt/lotus` (`750`), e a poda sairia 2.
  - **[Claude] confere depois:**
    - dois SHAs por repositório;
    - `sudo docker volume ls -qf dangling=true` vazio;
    - `df -h /` abaixo de 80%.

    Se o `df` não cair, confira `sudo docker system df` e
    `sudo du -sh /var/lib/containerd /var/lib/docker`: os snapshots do containerd soltam depois
    (spec §13). Em 10 a 15 minutos, o `describe-alarms` mostra o `lotus-prod-disco` em `OK` (dois
    períodos de 5 minutos abaixo de 80%).

- [ ] **Step 3: journald e apt [João].** No host. **Não rode o `user-data.sh` inteiro aqui**: ele
  grava também o `53lotus-reboot`, que só entra no Step 5.

```bash
sudo install -d -m 0755 /etc/systemd/journald.conf.d
printf '[Journal]\nSystemMaxUse=200M\n' | sudo tee /etc/systemd/journald.conf.d/lotus.conf
sudo systemctl restart systemd-journald
sudo journalctl --vacuum-size=200M
printf 'APT::Periodic::AutocleanInterval "7";\n' | sudo tee /etc/apt/apt.conf.d/52lotus-limpeza
sudo apt-get clean
```

  **[Claude] confere:**
  - `journalctl --disk-usage` em 200M ou menos;
  - `apt-config dump | grep AutocleanInterval` → `APT::Periodic::AutocleanInterval "7";`;
  - `sudo du -sh /var/cache/apt` caiu;
  - os dois arquivos, lidos com `sudo cat`, iguais ao trecho do `deploy/aws/user-data.sh`.

- [ ] **Step 4: Janela manual.**
  1. **[Claude]** Registra o `apt list --upgradable` completo (eram 40 em 2026-10-25), o `uname -r` e
     o `uptime`.
  2. **[João]** Desliga as ações dos alarmes (§14.7):
     `aws cloudwatch disable-alarm-actions --region sa-east-1 --alarm-names lotus-prod-up lotus-prod-5xx --profile lotus`.
  3. **[Claude]** Deixa a sonda do tempo fora rodando em segundo plano, por 15 minutos, gravada em
     `<rascunho>/sondar-janela.sh` e rodada com `bash`. O script faz 180 vezes: imprime
     `date -u +%T` e o código de
     `curl -s -o /dev/null -m 3 -w '%{http_code}' https://app.lotusotec.cl/up`, e espera 5 s. A
     saída vai para `<rascunho>/janela-up.log`.
  4. **[João]** No host:
     - `sudo apt-get update && sudo apt-get -y upgrade`. Pergunta de arquivo de configuração fica
       com a versão instalada, que é o default. O upgrade do `docker-ce` reinicia os contêineres no
       meio, e isso é esperado com as ações desligadas.
     - `apt list --upgradable`. O que ficar retido vai para o registro e para o João decidir.
     - `ls /var/run/reboot-required` mostra o arquivo → `sudo reboot`.
  5. **[Claude]** Depois que o `/up` voltar:

```bash
ssh -i ~/.ssh/lotus-prod.pem ubuntu@18.230.53.197 'uname -r; uptime; ls /var/run/reboot-required; sudo docker ps --filter label=com.docker.compose.project=lotus --format "{{.Names}} {{.Status}}"; sudo docker logs --since 20m "$(sudo docker ps -qf label=com.docker.compose.service=mysql)" 2>&1 | grep -iE "crash recovery|not shut ?down normally"; apt list --upgradable 2>/dev/null | tail -n +2'
```

     **Esperado:**
     - kernel `7.0.0-1014-aws` ou mais novo;
     - os seis contêineres em `Up` (`app`, `scheduler`, `mysql`, `nginx`, `gotenberg`, `clamav`);
     - nenhuma linha de recuperação do InnoDB;
     - `/var/run/reboot-required` ausente.

     O tempo fora vai do primeiro código diferente de 200 ao primeiro 200 de volta, no
     `janela-up.log`.
  6. **[João]** Religa as ações (§14.7):
     `aws cloudwatch enable-alarm-actions --region sa-east-1 --alarm-names lotus-prod-up lotus-prod-5xx --profile lotus`.
     **[Claude]** confere no `describe-alarms` o `ActionsEnabled` `True` nos quatro alarmes.
  7. **Paradas.**
     - **Tempo fora acima de 3 minutos.** Registre e volte ao João antes do Step 5: o reboot
       automático dispararia o `lotus-prod-up`.
     - **Linha de recuperação do InnoDB.** Registre e volte ao João. O remédio da spec §13 é um
       `stop_grace_period` no serviço `mysql` do `docker-compose.prod.yml`, com asserção no
       `frontend/tests/compose-prod.test.ts` (lição 19). Seria uma task nova, decidida com ele
       antes do Step 5.

- [ ] **Step 5: Reboot automático [João].** No host, só depois da janela:

```bash
printf 'Unattended-Upgrade::Automatic-Reboot "true";\nUnattended-Upgrade::Automatic-Reboot-Time "08:30";\n' | sudo tee /etc/apt/apt.conf.d/53lotus-reboot
```

  **[Claude] confere:**
  - `apt-config dump | grep -i 'Automatic-Reboot'` mostra `Unattended-Upgrade::Automatic-Reboot "true";`
    e `Unattended-Upgrade::Automatic-Reboot-Time "08:30";`.
  - `timedatectl` mostra `Time zone: Etc/UTC (UTC, +0000)`. Outro fuso → pare. O `08:30` do
    `user-data.sh` (Task 6) e o do runbook (Task 8) mudam juntos, decididos com o João.
  - `ls /var/run/reboot-required` está ausente. O arquivo que existia saiu com o reboot da janela,
    então nada fica agendado agora (spec §7). Registre isso.

- [ ] **Step 6: Registro e commit.**
  - O `execucao-producao.md` recebe as seções do Host.
  - No `aceitacao.md`, os itens 1 a 4 recebem `Resultado` e `Data` (`AAAA-MM-DD`) com o texto que o
    João aprovar.
  - O item 3 tem prova automática: `bash .claude/scripts/aceitacao.sh conferir 42` mede o `GET /up`
    e escreve o resultado dele.

```bash
git add docs/superpowers/blocos/42-infra-producao-higiene-e-manutencao/execucao-producao.md docs/superpowers/blocos/42-infra-producao-higiene-e-manutencao/aceitacao.md
git commit -m "docs(42): execucao do host em producao"
```

### Task 10: produção — o S3 (o João roda, Claude confere)

**Papel:** sessão principal, com o João. Sem subagente. A notação **[João]**/**[Claude]** é a da
Task 9. Todo comando roda da raiz da lane, porque os `file://` são relativos a ela.

**Files:**
- Modify: `docs/superpowers/blocos/42-infra-producao-higiene-e-manutencao/execucao-producao.md` (seções do S3)
- Modify: `docs/superpowers/blocos/42-infra-producao-higiene-e-manutencao/aceitacao.md` (item 5)

**Interfaces:**
- Consumes:
  - os dois JSON (Task 7);
  - o §3 e o §3.1 do runbook (Task 8);
  - o `execucao-producao.md` (Task 9).

- [ ] **Step 1: Lifecycle [João].**

```bash
aws s3api put-bucket-lifecycle-configuration --bucket lotus-prod-760144413534 --lifecycle-configuration file://deploy/aws/s3-lifecycle.json --profile lotus
```

  **[Claude]** confere com
  `aws s3api get-bucket-lifecycle-configuration --bucket lotus-prod-760144413534 --profile lotus`:
  saem as três regras.

- [ ] **Step 2: Login da raiz [João].** Login na raiz da conta `760144413534`, no console, com MFA.
  Registre a data e a hora UTC. Sem o login confirmado, o Step 3 não roda: é a saída de emergência
  da política.

- [ ] **Step 3: Política [João].**

```bash
aws s3api put-bucket-policy --bucket lotus-prod-760144413534 --policy file://deploy/aws/s3-politica.json --profile lotus
```

  Depois, o João abre um documento no app (URL pré-assinada, por HTTPS) e confere que abre. O app
  não muda de comportamento (spec §8.1).

- [ ] **Step 4: Negações.**
  - **[Claude] Simulador.** Duas chamadas por principal, sem escrever nada. Primeiro, as ações de
    objeto:

```bash
aws iam simulate-principal-policy --profile lotus \
  --policy-source-arn arn:aws:iam::760144413534:<principal> \
  --action-names s3:DeleteObject s3:DeleteObjectVersion \
  --resource-arns arn:aws:s3:::lotus-prod-760144413534/probes/simulacao.txt \
  --resource-policy file://deploy/aws/s3-politica.json \
  --resource-owner arn:aws:iam::760144413534:root \
  --context-entries ContextKeyName=aws:SecureTransport,ContextKeyValues=true,ContextKeyType=boolean ContextKeyName=aws:PrincipalArn,ContextKeyValues=arn:aws:iam::760144413534:<principal>,ContextKeyType=string \
  --query 'EvaluationResults[].[EvalActionName,EvalDecision]' --output text
```

    Depois, a mesma chamada com `--action-names s3:PutBucketPolicy` e
    `--resource-arns arn:aws:s3:::lotus-prod-760144413534`. Se o ARN de uma role tiver caminho, use
    o que `aws iam get-role --role-name <nome> --profile lotus` devolver.

    | `<principal>` | DeleteObject | DeleteObjectVersion | PutBucketPolicy |
    |---|---|---|---|
    | `user/gabriel` | explicitDeny | explicitDeny | explicitDeny |
    | `user/JoaoVBA` | explicitDeny | explicitDeny | explicitDeny |
    | `role/OrganizationAccountAccessRole` | explicitDeny | explicitDeny | explicitDeny |
    | `role/administrador` | explicitDeny | explicitDeny | explicitDeny |
    | `role/lotus-ec2` | allowed | explicitDeny | explicitDeny |
    | `user/lotus-infra` | allowed | explicitDeny | allowed |

    Divergência de qualquer célula → pare e relate.
  - **[João] Chamada real.** Tem de voltar `AccessDenied`:

```bash
printf 'bloco 42 %s\n' "$(date -u +%FT%TZ)" > /tmp/bloco42-teste.txt
aws s3 cp /tmp/bloco42-teste.txt s3://lotus-prod-760144413534/probes/bloco42-teste.txt --profile lotus
aws s3api list-object-versions --bucket lotus-prod-760144413534 --prefix probes/bloco42-teste.txt --query 'Versions[].[VersionId,IsLatest]' --output text --profile lotus
aws s3api delete-object --bucket lotus-prod-760144413534 --key probes/bloco42-teste.txt --version-id <VersionId de cima> --profile lotus
```

    **Esperado:** `An error occurred (AccessDenied) when calling the DeleteObject operation`, com
    *explicit deny in a resource-based policy*. Qualquer outra resposta → pare: a versão saiu, e a
    política não está valendo.

- [ ] **Step 5: Órfãos.**
  1. **[Claude] As chaves do S3.** Rode
     `aws s3api list-objects-v2 --bucket lotus-prod-760144413534 --query 'Contents[].Key' --output text --profile lotus > <rascunho>/s3-chaves.txt`.
     Depois, num script do rascunho: troque tab por quebra de linha, tire os prefixos `backups/` e
     `probes/` e ordene com `LC_ALL=C sort -u`. O resultado vai para `<rascunho>/s3-atuais.txt`.
  2. **[Claude] Os caminhos do banco.** Só leitura, pelo SSH, com o comando remoto num heredoc:

```bash
ssh -i ~/.ssh/lotus-prod.pem ubuntu@18.230.53.197 bash -s > <rascunho>/db-bruto.txt <<'REMOTO'
sudo docker exec "$(sudo docker ps -qf label=com.docker.compose.service=mysql)" sh -c 'exec mysql -N -B -uroot -p"$MYSQL_ROOT_PASSWORD" -e "SELECT path FROM files UNION SELECT photo_path FROM users WHERE photo_path IS NOT NULL" "$MYSQL_DATABASE"'
REMOTO
```

     A consulta pega todas as linhas, arquivadas inclusive. Ordene com `LC_ALL=C sort -u` em
     `<rascunho>/db-caminhos.txt`.
  3. **[Claude] A lista.** `LC_ALL=C comm -23 <rascunho>/s3-atuais.txt <rascunho>/db-caminhos.txt`
     dá os órfãos. Mostre a lista ao João, comparada com os 12 da medição: o bloco 38 carregou
     dados depois dela.
  4. **[João] A remoção.** Uma chave por vez:
     `aws s3 rm "s3://lotus-prod-760144413534/<chave>" --profile lotus`. Cada remoção deixa uma
     marca, desfazível por 7 dias (1 dia em `user-photos/`). Recalcule e remova na mesma sessão,
     fora do horário de uso no Chile.
  5. **[Claude] A conferência.** Recalcule: a lista sai vazia. A lista removida vai para o
     registro.

- [ ] **Step 6: Desfazer [João], pelo §3.1 do runbook.** Use o objeto de teste do Step 4:

```bash
aws s3 rm s3://lotus-prod-760144413534/probes/bloco42-teste.txt --profile lotus
aws s3api head-object --bucket lotus-prod-760144413534 --key probes/bloco42-teste.txt --profile lotus   # 404: a marca está por cima
aws s3api list-object-versions --bucket lotus-prod-760144413534 --prefix probes/bloco42-teste.txt --profile lotus --query '{versoes: Versions[].[Key,VersionId,LastModified,IsLatest], marcas: DeleteMarkers[].[Key,VersionId,LastModified,IsLatest]}'
aws s3api copy-object --bucket lotus-prod-760144413534 --key probes/bloco42-teste.txt --copy-source "lotus-prod-760144413534/probes/bloco42-teste.txt?versionId=<id>" --profile lotus
aws s3 cp s3://lotus-prod-760144413534/probes/bloco42-teste.txt - --profile lotus   # o mesmo texto de /tmp/bloco42-teste.txt
aws s3 rm s3://lotus-prod-760144413534/probes/bloco42-teste.txt --profile lotus     # fica para o lifecycle
rm /tmp/bloco42-teste.txt
```

- [ ] **Step 7: Leitura de volta [Claude].**
  - **Política.** `aws s3api get-bucket-policy --bucket lotus-prod-760144413534 --query Policy --output text --profile lotus > <rascunho>/politica-lida.json`.
    Depois,
    `python3 -c 'import json,sys; a,b=(json.load(open(p)) for p in sys.argv[1:]); print("igual" if a==b else "DIFERENTE")' <rascunho>/politica-lida.json deploy/aws/s3-politica.json`
    → `igual`.
  - **Lifecycle.** `aws s3api get-bucket-lifecycle-configuration --bucket lotus-prod-760144413534 --profile lotus > <rascunho>/lifecycle-lido.json`.
    Compare regra a regra pelo `ID`. Diferença só de normalização da AWS é aceita e registrada: o
    filtro vazio lido como `{"Prefix": ""}`, ou uma chave a mais como
    `TransitionDefaultMinimumObjectSize`.

- [ ] **Step 8: Registro e commit.**
  - O `execucao-producao.md` recebe as seções do S3.
  - O item 5 do `aceitacao.md` recebe `Resultado` e `Data`, com o texto que o João aprovar.

```bash
git add docs/superpowers/blocos/42-infra-producao-higiene-e-manutencao/execucao-producao.md docs/superpowers/blocos/42-infra-producao-higiene-e-manutencao/aceitacao.md
git commit -m "docs(42): execucao do S3 em producao"
```

Depois do merge, a lane de aceitação cobre os itens 6 a 8 da `## Verificação externa`: reinstalar os
scripts pelo §7, uma promoção real com a poda e o backup do dia seguinte. Não são tasks deste plano.

## Grupos paralelos

| Grupo | Tasks | Files: disjuntos | Aresta Consumes/Produces |
|---|---|---|---|
| G1 | 1, 2, 4, 5, 6, 7 | sim (veja o Mapa de arquivos) | nenhuma entre elas |

As tasks fora de grupo executam e são revisadas uma de cada vez:

- **Task 3** consome a 2: o nome e a saída do `podar-imagens.sh`.
- **Task 8** consome 2, 4, 5, 6 e 7: os paths citados nos docs, as mensagens novas e a catraca de
  refs.
- **Task 9** consome 2, 6 e 8.
- **Task 10** consome 7 e 8, e divide o `execucao-producao.md` com a 9.

A ordem sugerida dentro do G1 é 1, 2, 4, 5, 6, 7, com uma revisão em segundo plano por vez.

## Handoff de execução

- **`executor: claude`.** O bloco mexe na política de segurança de um bucket de peso legal e na
  produção. As Tasks 9 e 10 pedem julgamento fora do plano.
- **Sessão:** `opus`, esforço `high`.
- **Papéis** (`.claude/papeis.md`), despachados por `subagent_type`:
  - `implementador-mecanico`: Tasks 1, 3, 6 e 7, com o código pronto no plano;
  - `implementador-integracao`: Tasks 2, 4, 5 e 8, com vários arquivos ou um contrato a cumprir;
  - `revisor-task`: depois de cada task de código, na worktree destacada do commit dela;
  - `re-revisor` e `corretor-tardio`: nas rodadas de correção, pela regra da SDD;
  - `revisor-branch`: duas vezes. Primeiro, como **portão da produção**, depois da Task 8 e sobre as
    Tasks 1 a 8. Achado Crítico ou Importante corrige antes da Task 9. Depois, no fim, como manda a
    SDD.
- **O despacho.** Cada implementador recebe o `## Global Constraints`, o
  `## Contexto comum dos implementadores` e o texto inteiro da task dele. O primeiro despacho leva
  também o `estado.md` no commit, pelo Passo 4 do `/executar-bloco`.
- **Tasks 9 e 10.** Sessão principal, com o João, sem subagente. Escrita em produção só pela mão
  dele.
- **`paths_autorizados`:** não se aplica (`executor: claude`).
