# Promoção, deploy e rollback por SHA — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** dar à release já aprovada no GHCR um botão de promoção governado e um rollback auditável, sem abrir porta nova no host e sem criar credencial de longa duração.

**Architecture:** a GitHub Actions do repositório **corporativo** assume uma role AWS por OIDC e chama `ssm send-command`, que executa no host o **mesmo** `deploy/bin/deploy.sh` que o João roda por SSH — uma sequência, uma verdade. O `deploy.sh` ganha quatro coisas: cadeado (`flock`), gate de compatibilidade de schema que **recusa** alvo cujo banco já ultrapassou, dump pré-deploy amarrado à release e um ledger append-only `releases.jsonl`.

**Tech Stack:** Bash 5 (host Ubuntu 24.04 arm64), GitHub Actions, AWS IAM/OIDC/SSM (`sa-east-1`), Docker Compose v2, MySQL 8, Vitest (projeto `repo`, ambiente node) para as catracas.

**Spec:** [`specs/2026-09-21-cicd-promocao-deploy-e-rollback-design.md`](../specs/2026-09-21-cicd-promocao-deploy-e-rollback-design.md)
**Context Packet:** [`context-packets/2026-09-20-cicd-promocao-deploy-e-rollback.md`](../context-packets/2026-09-20-cicd-promocao-deploy-e-rollback.md) (`status: partial`; as duas lacunas foram fechadas no brainstorming — spec §1.3)

## Global Constraints

- **Árvore:** worktree `../lotus-infra`, branch `cicd/promocao-deploy-e-rollback`. Rodar tudo daqui; **nunca** `cd` para o repositório original.
- **Testes de repositório:** rodam de `frontend/`, projeto `repo` — `pnpm test --project repo tests/<arquivo>.test.ts`. Ambiente `node`, sem DOM.
- **Lição 19:** arquivo com catraca não recebe entregável sem asserção **no mesmo commit**. Neste bloco vale para `deploy/bin/backup-db.sh` (já tem catraca) e passa a valer para `deploy/bin/deploy.sh`, `.github/workflows/deploy.yml` e `deploy/aws/criar-oidc-e-role.sh`, cujas catracas nascem aqui.
- **Lição 14:** mecanismo, não recado. Nada deste bloco é garantido por comentário.
- **Escrita em produção é do João.** A sessão **lê** o host e **confere**; quem executa comando de escrita no host e na conta AWS é o João. Toda task de host traz o comando exato para ele e a conferência exata para a sessão.
- **Nada de identificador de infra no fonte.** `.espelho-exclusoes` não exclui `.github/`, então o workflow existe também no repositório **público** `Andred21/lotus`. ARN de role e `InstanceId` entram por *repository secret* do corporativo, nunca literais no YAML.
- **DONO das imagens:** `ghcr.io/gatika-cl/lotus-{app,web,clamav}:<sha>`, com `LOTUS_RELEASE_OWNER` sobrepondo o default `gatika-cl`.
- **Região:** `sa-east-1`. **Host:** EC2 `t4g.small`, EIP `18.230.53.197`, runtime em `/opt/lotus` (`750 root:root`).
- **Commits:** terminam com `Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>`.
- **Não usar `git stash` puro** — a pilha é compartilhada com outras árvores.

## Mapa de arquivos

| Arquivo | Responsabilidade | Task |
|---|---|---|
| `deploy/bin/deploy.sh` (modificar) | única sequência de deploy: cadeado, gate, dump, ledger, promoção | 1, 2, 4 |
| `deploy/bin/backup-db.sh` (modificar) | dump para o S3; passa a publicar a chave sem obrigar a parsear texto | 3 |
| `frontend/tests/deploy-sh.test.ts` (criar) | catraca do `deploy.sh` | 1, 2, 4 |
| `frontend/tests/backup-db.test.ts` (modificar) | catraca do `backup-db.sh`, estendida | 3 |
| `.github/workflows/deploy.yml` (criar) | o botão: validação, OIDC, `ssm send-command`, polling | 5 |
| `frontend/tests/workflow-deploy.test.ts` (criar) | catraca do workflow (guarda de dono, serialização, sem literais) | 5 |
| `deploy/aws/criar-oidc-e-role.sh` (criar) | provider OIDC, role `lotus-deploy`, SSM na `lotus-ec2`, readback | 6 |
| `frontend/tests/criar-oidc-role.test.ts` (criar) | catraca do script de IAM | 6 |
| `docs/adrs.md` (modificar) | emenda datada do ADR-14 | 7 |
| `deploy/aws/README.md` (modificar) | runbook: §4, §8 reescrita, seção nova do ledger | 7 |
| `docs/README.md` (modificar) | lição 19 com os pares novos | 7 |
| `deploy/aws/user-data.sh` (modificar, condicional) | garantir o agente SSM num host reconstruído | 8 |
| `docs/superpowers/audits/2026-09-21-cicd-promocao-deploy-e-rollback.md` (criar) | evidências das provas ao vivo | 8–12 |

---

### Task 1: Cadeado no host e `CURRENT_SHA` atômico

Dois defeitos pequenos e independentes do `deploy.sh` atual, e o nascimento da catraca que a lição 19 já devia ter cobrado: nada impede dois deploys simultâneos, e `echo "$SHA" > CURRENT_SHA` pode deixar o arquivo truncado se o processo morrer entre o `open` e o `write`.

**Files:**
- Modify: `deploy/bin/deploy.sh`
- Create: `frontend/tests/deploy-sh.test.ts`

**Interfaces:**
- Produces: `/opt/lotus/.deploy.lock` (arquivo de cadeado, aberto em append no fd 9) e `/opt/lotus/.deploy.pid` (PID do detentor). Código de saída **3** = cadeado ocupado. As tasks 2 e 4 acrescentam etapas **depois** do cadeado e **antes** do `login`.

- [ ] **Step 1: Escrever a catraca que falha**

Criar `frontend/tests/deploy-sh.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

/**
 * `deploy/bin/deploy.sh` é a única sequência de deploy do projeto: o botão do
 * item 12 não a reescreve, ele a INVOCA por SSM. Até 2026-09-21 o script não
 * tinha catraca nenhuma, embora a lição 19 já listasse `deploy/bin/*.sh` entre
 * os pares guardados — glob na lição não é asserção no arquivo.
 *
 * Conferência textual pelo mesmo motivo do backup-db.test.ts: o comportamento se
 * prova rodando contra a produção (tasks 9 a 12 do plano); a catraca guarda a
 * regressão silenciosa.
 */
const RAIZ = resolve(__dirname, '..', '..')
const CAMINHO = join(RAIZ, 'deploy', 'bin', 'deploy.sh')
const SCRIPT = readFileSync(CAMINHO, 'utf8')
const semComentarios = SCRIPT.split(/\r?\n/)
  .filter((linha) => !/^\s*#/.test(linha))
  .join('\n')
const linhas = semComentarios.split(/\r?\n/)
const indiceDe = (agulha: string) => linhas.findIndex((linha) => linha.includes(agulha))

describe('deploy/bin/deploy.sh', () => {
  it('é executável', () => {
    expect(statSync(CAMINHO).mode & 0o111).not.toBe(0)
  })

  it('falha alto em erro, variável indefinida e pipe quebrado', () => {
    expect(semComentarios).toMatch(/^set -euo pipefail$/m)
  })

  it('pega o cadeado sem bloquear e antes de qualquer escrita', () => {
    expect(semComentarios).toMatch(/flock -n 9/)
    const cadeado = indiceDe('flock -n 9')
    expect(cadeado).toBeGreaterThan(-1)
    expect(cadeado).toBeLessThan(indiceDe('docker login'))
  })

  it('abre o cadeado em APPEND — truncar apagaria o PID do detentor', () => {
    expect(semComentarios).toMatch(/exec 9>>/)
    expect(semComentarios).not.toMatch(/exec 9>[^>]/)
  })

  it('grava CURRENT_SHA por mv atômico, nunca por redirecionamento', () => {
    expect(semComentarios).toMatch(/mv -f .* "\$BASE\/CURRENT_SHA"/)
    expect(semComentarios).not.toMatch(/> "\$BASE\/CURRENT_SHA"/)
  })

  it('mantém a conferência de digest puxado contra digest em execução', () => {
    expect(semComentarios).toContain('ID_PUXADO')
    expect(semComentarios).toContain('ID_RODANDO')
    expect(indiceDe('ID_RODANDO')).toBeLessThan(indiceDe('CURRENT_SHA'))
  })

  it('exige os três manifestos antes de puxar', () => {
    expect(semComentarios.match(/docker manifest inspect/g)).toHaveLength(3)
    expect(indiceDe('docker manifest inspect')).toBeLessThan(indiceDe('compose pull'))
  })
})
```

- [ ] **Step 2: Rodar e ver reprovar**

```bash
cd /home/jvbat/projetos/lotus-infra/frontend && pnpm test --project repo tests/deploy-sh.test.ts
```

Esperado: FAIL em quatro testes — `flock -n 9` ausente, `exec 9>>` ausente, `mv -f` ausente e o `> "$BASE/CURRENT_SHA"` proibido presente. Os três testes de comportamento preexistente (`set -euo pipefail`, digests, manifestos) passam.

- [ ] **Step 3: Pôr o cadeado no `deploy.sh`**

Logo depois da validação do SHA e da definição de `BASE`, antes de `DONO=`:

```bash
BASE=/opt/lotus

# Um deploy por vez NO HOST. O `concurrency` do workflow enfileira dois runs da
# Actions, mas não sabe que o João pode estar rodando este script por SSH ao
# mesmo tempo — e o inverso também vale. As duas camadas cobrem coisas
# diferentes; nenhuma sozinha cobre as duas.
# O fd abre em APPEND de propósito: `exec 9>` truncaria o arquivo ANTES do
# flock, e quem chegasse segundo apagaria o PID de quem chegou primeiro,
# justamente a informação que a mensagem de recusa precisa dar.
exec 9>>"$BASE/.deploy.lock"
if ! flock -n 9; then
  echo "erro: outro deploy ja esta rodando (pid $(cat "$BASE/.deploy.pid" 2>/dev/null || echo '?'))" >&2
  exit 3
fi
printf '%s\n' "$$" > "$BASE/.deploy.pid"
```

- [ ] **Step 4: Trocar a escrita do `CURRENT_SHA`**

Substituir a última linha de escrita:

```bash
echo "$SHA" > "$BASE/CURRENT_SHA"
```

por:

```bash
# `>` trunca e só depois escreve: processo morto entre as duas coisas deixa o
# host sem saber que SHA está rodando. `mv` dentro do mesmo sistema de arquivos
# é rename(2), que é atômico — ou o arquivo é o antigo, ou é o novo.
NOVO=$(mktemp "$BASE/.current_sha.XXXXXX")
printf '%s\n' "$SHA" > "$NOVO"
chmod 644 "$NOVO"
mv -f "$NOVO" "$BASE/CURRENT_SHA"
```

- [ ] **Step 5: Rodar e ver passar**

```bash
cd /home/jvbat/projetos/lotus-infra/frontend && pnpm test --project repo tests/deploy-sh.test.ts
```

Esperado: PASS nos sete testes.

- [ ] **Step 6: Commit**

```bash
cd /home/jvbat/projetos/lotus-infra
git add deploy/bin/deploy.sh frontend/tests/deploy-sh.test.ts
git commit -m "feat(deploy): o deploy.sh ganha cadeado e catraca propria

Dois deploys simultaneos no host eram possiveis: o do SSH e o que o item 12
vai disparar pela Actions. O flock cobre o que o \`concurrency\` do workflow
nao alcanca. O CURRENT_SHA passa a ser escrito por rename(2).

A catraca nasce junto porque a licao 19 ja listava \`deploy/bin/*.sh\` entre os
pares guardados e o deploy.sh nunca teve asserção nenhuma.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Gate de compatibilidade de schema

O coração do rollback auditável (spec §6). Mede dois conjuntos e recusa o alvo que o banco já ultrapassou, em vez de deixar a decisão na cabeça de quem digita.

**Files:**
- Modify: `deploy/bin/deploy.sh`
- Modify: `frontend/tests/deploy-sh.test.ts`

**Interfaces:**
- Consumes: o cadeado da Task 1; as imagens já puxadas (`compose pull`).
- Produces: a variável `PENDENTES` (uma migration por linha, possivelmente vazia), consumida pelas tasks 4 (ledger e dump). Código de saída **4** = schema à frente. Variável de escape `LOTUS_ACEITAR_SCHEMA_A_FRENTE=1`.

- [ ] **Step 1: Escrever as asserções que falham**

Acrescentar ao `describe` de `frontend/tests/deploy-sh.test.ts`:

```ts
  it('mede o schema APLICADO no banco, não um diff de arquivos', () => {
    expect(semComentarios).toContain('SELECT migration FROM migrations')
  })

  it('mede o schema CONHECIDO pela imagem alvo, não pela árvore de trabalho', () => {
    expect(semComentarios).toMatch(/docker run --rm --entrypoint sh "\$APP"/)
    expect(semComentarios).toContain('/var/www/database/migrations')
  })

  it('o gate roda depois do pull e antes do migrate', () => {
    const gate = indiceDe('A_FRENTE=')
    expect(gate).toBeGreaterThan(indiceDe('compose pull'))
    expect(gate).toBeLessThan(indiceDe('artisan migrate'))
  })

  it('recusa alvo cujo schema o banco já ultrapassou', () => {
    expect(semComentarios).toMatch(/exit 4/)
    expect(semComentarios).toContain('LOTUS_ACEITAR_SCHEMA_A_FRENTE')
  })
```

- [ ] **Step 2: Rodar e ver reprovar**

```bash
cd /home/jvbat/projetos/lotus-infra/frontend && pnpm test --project repo tests/deploy-sh.test.ts
```

Esperado: FAIL nos quatro testes novos.

- [ ] **Step 3: Implementar o gate**

Entre o `compose pull` e o `compose run --rm app php artisan migrate --force`:

```bash
echo "==> gate de schema"
MYSQL=$(compose ps -q mysql)
[ -n "$MYSQL" ] || { echo "erro: servico mysql nao esta de pe" >&2; exit 1; }

# APLICADAS: o que o BANCO realmente tem. Lido da tabela, nao suposto.
APLICADAS=$(docker exec "$MYSQL" sh -c \
  'exec mysql -N -B -uroot -p"$MYSQL_ROOT_PASSWORD" -e "SELECT migration FROM migrations" "$MYSQL_DATABASE"' \
  | sort)
# CONHECIDAS: o que a IMAGEM ALVO sabe. Diff de arquivos entre dois SHAs nao
# serve: ele nao enxerga `change()` nem `rename` destrutivo, e e exatamente por
# isso que a medicao sai da imagem que vai rodar.
CONHECIDAS=$(docker run --rm --entrypoint sh "$APP" -c 'ls /var/www/database/migrations' \
  | sed 's/\.php$//' | sort)

A_FRENTE=$(comm -23 <(printf '%s\n' "$APLICADAS") <(printf '%s\n' "$CONHECIDAS"))
PENDENTES=$(comm -13 <(printf '%s\n' "$APLICADAS") <(printf '%s\n' "$CONHECIDAS"))

if [ -n "$A_FRENTE" ]; then
  echo "erro: o banco esta A FRENTE de $SHA — a imagem alvo nao conhece:" >&2
  printf '  %s\n' $A_FRENTE >&2
  echo "restaure o dump da release que as introduziu (procure em $BASE/releases.jsonl) e so entao promova." >&2
  # O escape existe para o operador com o dump na mao. O WORKFLOW nunca define
  # esta variavel (catraca em workflow-deploy.test.ts), entao o caminho
  # automatizado nao tem como contornar o gate.
  [ "${LOTUS_ACEITAR_SCHEMA_A_FRENTE:-0}" = "1" ] || exit 4
  echo "aviso: LOTUS_ACEITAR_SCHEMA_A_FRENTE=1 — seguindo por sua conta." >&2
fi
```

- [ ] **Step 4: Rodar e ver passar**

```bash
cd /home/jvbat/projetos/lotus-infra/frontend && pnpm test --project repo tests/deploy-sh.test.ts
```

Esperado: PASS nos onze testes.

- [ ] **Step 5: Conferir a sintaxe do script**

```bash
cd /home/jvbat/projetos/lotus-infra && bash -n deploy/bin/deploy.sh && echo "sintaxe ok"
```

Esperado: `sintaxe ok`. (`comm` com *process substitution* exige bash, não sh — o shebang já é `#!/usr/bin/env bash`.)

- [ ] **Step 6: Commit**

```bash
cd /home/jvbat/projetos/lotus-infra
git add deploy/bin/deploy.sh frontend/tests/deploy-sh.test.ts
git commit -m "feat(deploy): o deploy.sh recusa alvo cujo schema o banco ultrapassou

O rollback deixa de depender da memoria de quem digita. Dois conjuntos
medidos: as migrations APLICADAS, lidas da tabela do banco, e as CONHECIDAS
pela imagem alvo, lidas de dentro dela. Diff de arquivo entre dois SHAs nao
enxerga change() nem rename destrutivo, e por isso nao serve aqui.

Escape declarado para o operador com o dump na mao; o workflow nunca o define.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: `backup-db.sh` publica a chave do dump

O `deploy.sh` precisa da chave `s3://…` para gravar no ledger. Parsear a frase `backup ok: …` seria contrato por texto; a variável entrega o dado direto.

**Files:**
- Modify: `deploy/bin/backup-db.sh`
- Modify: `frontend/tests/backup-db.test.ts`

**Interfaces:**
- Produces: `LOTUS_BACKUP_SAIDA=<arquivo>` — quando definida, o script escreve **só** a URI `s3://…` nesse arquivo, depois do upload bem-sucedido. O stdout não muda; o cron do host segue idêntico.

- [ ] **Step 1: Escrever as asserções que falham**

Acrescentar ao `describe('deploy/bin/backup-db.sh')` em `frontend/tests/backup-db.test.ts`:

```ts
  it('publica a chave do dump sem obrigar ninguém a parsear a frase', () => {
    expect(semComentarios).toContain('LOTUS_BACKUP_SAIDA')
  })

  it('só publica a chave DEPOIS do upload — chave sem objeto no S3 é mentira', () => {
    const linhas = semComentarios.split(/\r?\n/)
    const envio = linhas.findIndex((linha) => linha.includes('aws s3 cp'))
    const chave = linhas.findIndex((linha) => linha.includes('LOTUS_BACKUP_SAIDA'))
    expect(envio).toBeGreaterThan(-1)
    expect(chave).toBeGreaterThan(envio)
  })

  it('não mexe no stdout que o cron do host consome', () => {
    expect(semComentarios).toMatch(/^echo "backup ok: /m)
  })
```

- [ ] **Step 2: Rodar e ver reprovar**

```bash
cd /home/jvbat/projetos/lotus-infra/frontend && pnpm test --project repo tests/backup-db.test.ts
```

Esperado: FAIL nos dois primeiros testes novos (`LOTUS_BACKUP_SAIDA` ausente); o terceiro passa.

- [ ] **Step 3: Implementar**

Entre o `aws s3 cp` e o `echo "backup ok: …"` de `deploy/bin/backup-db.sh`:

```bash
# O deploy.sh (item 12, §7) precisa da CHAVE, nao da frase. Contrato por
# variavel em vez de parsing de stdout: o cron do host continua vendo
# exatamente a mesma linha, e quem quer o dado pede o arquivo.
# Depois do upload, nunca antes: chave publicada sem objeto no S3 e' mentira
# gravada no ledger justamente na hora em que alguem vai precisar dela.
[ -z "${LOTUS_BACKUP_SAIDA:-}" ] || printf '%s\n' "s3://$BUCKET/backups/$ARQ" > "$LOTUS_BACKUP_SAIDA"
```

- [ ] **Step 4: Rodar e ver passar**

```bash
cd /home/jvbat/projetos/lotus-infra/frontend && pnpm test --project repo tests/backup-db.test.ts
```

Esperado: PASS em todos, inclusive nas guardas antigas (piso de 10 KiB no bruto, rodapé do `mysqldump`, ordem `guarda → rodapé → gzip → envio`).

- [ ] **Step 5: Commit**

```bash
cd /home/jvbat/projetos/lotus-infra
git add deploy/bin/backup-db.sh frontend/tests/backup-db.test.ts
git commit -m "feat(backup): o backup-db.sh publica a chave do dump por variavel

O ledger do item 12 precisa da URI s3://, e parsear \"backup ok: ...\" seria
contrato por texto. LOTUS_BACKUP_SAIDA entrega o dado direto, depois do
upload. O stdout nao muda e o cron do host segue identico.

Asserção no mesmo commit (licao 19): o backup-db.sh ja tinha catraca.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Dump pré-deploy e ledger `releases.jsonl`

O registro que faltava. Duas linhas por tentativa, append-only, e o dump amarrado à release que o introduziu.

**Files:**
- Modify: `deploy/bin/deploy.sh`
- Modify: `frontend/tests/deploy-sh.test.ts`

**Interfaces:**
- Consumes: `PENDENTES` da Task 2; `LOTUS_BACKUP_SAIDA` da Task 3.
- Produces: `/opt/lotus/releases.jsonl` (`640 root:root`). Linha `inicio`: `ts`, `evento`, `sha`, `sha_anterior`, `migrations`, `dump`, `ator`. Linha `fim`: `ts`, `evento`, `sha`, `resultado`, `etapa`. `LOTUS_DEPLOY_ATOR` define o ator; sem ela, `manual:<usuário>`.

- [ ] **Step 1: Escrever as asserções que falham**

Acrescentar ao `describe` de `frontend/tests/deploy-sh.test.ts`:

```ts
  it('abre o ledger antes do migrate e o fecha no fim', () => {
    expect(semComentarios).toContain('"evento":"inicio"')
    expect(semComentarios).toContain('"evento":"fim"')
    expect(indiceDe('"evento":"inicio"')).toBeLessThan(indiceDe('artisan migrate'))
  })

  it('escreve o ledger em append, nunca sobrescrevendo', () => {
    expect(semComentarios).toMatch(/>> "\$LEDGER"/)
    expect(semComentarios).not.toMatch(/[^>]> "\$LEDGER"/)
  })

  it('tira o dump antes do migrate e aborta o deploy se ele falhar', () => {
    const dump = indiceDe('LOTUS_BACKUP_SAIDA')
    expect(dump).toBeGreaterThan(-1)
    expect(dump).toBeLessThan(indiceDe('artisan migrate'))
  })

  it('só tira dump quando há migration pendente', () => {
    expect(semComentarios).toMatch(/if \[ -n "\$PENDENTES" \]/)
  })

  it('registra o SHA anterior explicitamente, em vez de deixar deduzir', () => {
    expect(semComentarios).toContain('sha_anterior')
  })

  it('identifica quem promoveu, com default para o caminho manual', () => {
    expect(semComentarios).toMatch(/LOTUS_DEPLOY_ATOR:-manual:/)
  })

  it('recusa nome de migration fora de [A-Za-z0-9_] em vez de emitir JSON quebrado', () => {
    expect(semComentarios).toMatch(/\^\[A-Za-z0-9_\]\+\$/)
  })

  it('fecha o ledger também no caminho de falha, por trap', () => {
    expect(semComentarios).toMatch(/^trap .* EXIT$/m)
    expect(semComentarios).toContain('"resultado":"falha"')
  })
```

- [ ] **Step 2: Rodar e ver reprovar**

```bash
cd /home/jvbat/projetos/lotus-infra/frontend && pnpm test --project repo tests/deploy-sh.test.ts
```

Esperado: FAIL nos oito testes novos.

- [ ] **Step 3: Declarar o ledger e as funções, logo depois do bloco do cadeado**

```bash
LEDGER="$BASE/releases.jsonl"
[ -f "$LEDGER" ] || install -m 640 /dev/null "$LEDGER"
ATOR="${LOTUS_DEPLOY_ATOR:-manual:$(id -un)}"
ETAPA=inicio
INICIO_ESCRITO=0

agora() { date -u +%Y-%m-%dT%H:%M:%SZ; }

# Uma linha por evento, em append. `>>` com linha curta e' escrita atomica no
# Linux, e o flock da linha de cima ja garante escritor unico de qualquer jeito.
ledger() { printf '%s\n' "$1" >> "$LEDGER"; }

# Nome de migration do Laravel e' [A-Za-z0-9_]. Qualquer coisa fora disso aborta
# em vez de produzir JSON quebrado no unico registro que sobra quando o banco
# esta fora do ar — que e' exatamente quando se le este arquivo.
json_lista() {
  local nome saida=""
  while IFS= read -r nome; do
    [ -n "$nome" ] || continue
    printf '%s' "$nome" | grep -qE '^[A-Za-z0-9_]+$' \
      || { echo "erro: nome de migration inesperado: $nome" >&2; exit 1; }
    saida="$saida,\"$nome\""
  done
  printf '[%s]' "${saida#,}"
}

# Tentativa interrompida deixa `inicio` sem `fim`. Isso nao e' buraco: e' a
# informacao que se quer quando o deploy morreu no meio, e e' ela que aponta o
# dump. O trap fecha o que der para fechar.
ao_sair() {
  local codigo=$?
  if [ "$INICIO_ESCRITO" = 1 ]; then
    if [ "$codigo" = 0 ]; then
      ledger "{\"ts\":\"$(agora)\",\"evento\":\"fim\",\"sha\":\"$SHA\",\"resultado\":\"ok\",\"etapa\":\"ok\"}"
    else
      ledger "{\"ts\":\"$(agora)\",\"evento\":\"fim\",\"sha\":\"$SHA\",\"resultado\":\"falha\",\"etapa\":\"$ETAPA\"}"
    fi
  fi
  exit "$codigo"
}
trap ao_sair EXIT
```

- [ ] **Step 4: Tirar o dump e abrir o ledger, logo depois do gate da Task 2**

```bash
ANTERIOR=$(cat "$BASE/CURRENT_SHA" 2>/dev/null || true)
if [ -n "$ANTERIOR" ]; then ANTERIOR_JSON="\"$ANTERIOR\""; else ANTERIOR_JSON=null; fi

DUMP_JSON=null
if [ -n "$PENDENTES" ]; then
  echo "==> dump pre-deploy (ha migration pendente)"
  # Deploy sem migration nao precisa de dump para voltar: o gate acima ja prova
  # que o alvo anterior e' limpo. Se o dump passar a custar minutos, ele sai do
  # caminho critico — o gatilho esta escrito no runbook.
  SAIDA_DUMP=$(mktemp)
  # Falha do backup ABORTA o deploy: promover sem a evidencia de rollback e'
  # promover sem rede, e o `set -e` ja faz isso valer.
  LOTUS_BACKUP_SAIDA="$SAIDA_DUMP" "$BASE/bin/backup-db.sh"
  DUMP_JSON="\"$(cat "$SAIDA_DUMP")\""
  rm -f "$SAIDA_DUMP"
fi

MIGRACOES_JSON=$(printf '%s\n' "$PENDENTES" | json_lista)
ledger "{\"ts\":\"$(agora)\",\"evento\":\"inicio\",\"sha\":\"$SHA\",\"sha_anterior\":$ANTERIOR_JSON,\"migrations\":$MIGRACOES_JSON,\"dump\":$DUMP_JSON,\"ator\":\"$ATOR\"}"
INICIO_ESCRITO=1
```

- [ ] **Step 5: Marcar a etapa corrente ao longo da sequência**

Acrescentar `ETAPA=<nome>` imediatamente antes de cada trecho, para que a linha `fim` diga onde morreu:

```bash
ETAPA=migrate   # antes do `compose run --rm app php artisan migrate --force`
ETAPA=up        # antes do `compose up -d --no-build --pull never`
ETAPA=health    # antes do laço de espera do nginx
ETAPA=digests   # antes do laço de conferência de imagem
```

- [ ] **Step 6: Rodar e ver passar**

```bash
cd /home/jvbat/projetos/lotus-infra/frontend && pnpm test --project repo tests/deploy-sh.test.ts
cd /home/jvbat/projetos/lotus-infra && bash -n deploy/bin/deploy.sh && echo "sintaxe ok"
```

Esperado: PASS nos dezenove testes, e `sintaxe ok`.

- [ ] **Step 7: Provar o `json_lista` isoladamente, sem host**

```bash
cd /home/jvbat/projetos/lotus-infra && bash -c '
json_lista() {
  local nome saida=""
  while IFS= read -r nome; do
    [ -n "$nome" ] || continue
    printf "%s" "$nome" | grep -qE "^[A-Za-z0-9_]+$" || { echo "erro: nome de migration inesperado: $nome" >&2; exit 1; }
    saida="$saida,\"$nome\""
  done
  printf "[%s]" "${saida#,}"
}
printf "%s\n" "" | json_lista; echo
printf "%s\n" "2026_09_18_cria_tabela" "2026_09_19_outra" | json_lista; echo
printf "%s\n" "nome com espaco" | json_lista; echo "saida=$?"
'
```

Esperado, nesta ordem: `[]`; `["2026_09_18_cria_tabela","2026_09_19_outra"]`; a mensagem `erro: nome de migration inesperado: nome com espaco` em stderr.

- [ ] **Step 8: Commit**

```bash
cd /home/jvbat/projetos/lotus-infra
git add deploy/bin/deploy.sh frontend/tests/deploy-sh.test.ts
git commit -m "feat(deploy): releases.jsonl registra a promocao e o dump que a desfaz

Duas linhas por tentativa, append-only. A de `inicio` sai antes do migrate,
com o SHA anterior explicito, as migrations que vao rodar e a chave do dump; a
de `fim` sai por trap, tambem no caminho de falha, dizendo em que etapa morreu.
Tentativa interrompida deixa `inicio` sem `fim` de proposito.

O dump so acontece quando ha migration pendente — deploy sem migration volta
pelo proprio gate —, e a falha dele aborta o deploy.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: O workflow de promoção

**Files:**
- Create: `.github/workflows/deploy.yml`
- Create: `frontend/tests/workflow-deploy.test.ts`

**Interfaces:**
- Consumes: os *repository secrets* `AWS_DEPLOY_ROLE_ARN` e `AWS_INSTANCE_ID`, criados na Task 8 no repositório corporativo.
- Produces: o botão `workflow_dispatch` "Promover para produção", com inputs `sha` e `confirmar`.

- [ ] **Step 1: Escrever a catraca que falha**

Criar `frontend/tests/workflow-deploy.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

/**
 * `.github/workflows/deploy.yml` é o botão de promoção para a produção do
 * cliente — e `.espelho-exclusoes` NÃO exclui `.github/`, então este arquivo
 * existe também em `Andred21/lotus`, que é PÚBLICO. As duas coisas que esta
 * catraca guarda não têm segunda chance: a guarda de dono e a ausência de
 * identificador de infra no fonte.
 */
const RAIZ = resolve(__dirname, '..', '..')
const YAML = readFileSync(join(RAIZ, '.github', 'workflows', 'deploy.yml'), 'utf8')
const semComentarios = YAML.split(/\r?\n/)
  .filter((linha) => !/^\s*#/.test(linha))
  .join('\n')

describe('.github/workflows/deploy.yml', () => {
  it('só promove a partir do repositório corporativo', () => {
    expect(semComentarios).toContain("github.repository == 'Gatika-CL/lotus'")
  })

  it('não dispara sozinho — só workflow_dispatch', () => {
    expect(semComentarios).toContain('workflow_dispatch:')
    expect(semComentarios).not.toMatch(/^\s{2}push:/m)
    expect(semComentarios).not.toMatch(/^\s{2}schedule:/m)
  })

  it('exige confirmação digitada contra dedo gordo', () => {
    expect(semComentarios).toContain('confirmar')
    expect(semComentarios).toContain('PROMOVER')
  })

  it('serializa sem cancelar — matar um deploy no migrate produz estado inconsistente', () => {
    expect(semComentarios).toMatch(/group:\s*producao/)
    expect(semComentarios).toMatch(/cancel-in-progress:\s*false/)
  })

  it('usa OIDC, não access key', () => {
    expect(semComentarios).toMatch(/id-token:\s*write/)
    expect(semComentarios).toContain('aws-actions/configure-aws-credentials')
    expect(semComentarios).not.toMatch(/AWS_SECRET_ACCESS_KEY/)
    expect(semComentarios).not.toMatch(/AKIA[0-9A-Z]{16}/)
  })

  it('não traz ARN nem InstanceId literais — o arquivo é público', () => {
    expect(semComentarios).not.toMatch(/arn:aws:iam::\d{12}/)
    expect(semComentarios).not.toMatch(/\bi-[0-9a-f]{8,}/)
    expect(semComentarios).toContain('secrets.AWS_DEPLOY_ROLE_ARN')
    expect(semComentarios).toContain('secrets.AWS_INSTANCE_ID')
  })

  it('invoca o caminho versionado do host, sem duplicar a sequência de deploy', () => {
    expect(semComentarios).toContain('/opt/lotus/bin/deploy.sh')
    expect(semComentarios).not.toContain('artisan migrate')
    expect(semComentarios).not.toContain('compose up')
  })

  it('não tem como contornar o gate de schema', () => {
    expect(semComentarios).not.toContain('LOTUS_ACEITAR_SCHEMA_A_FRENTE')
  })

  it('exige CI verde e SHA na main antes de promover', () => {
    expect(semComentarios).toContain('actions/workflows/ci.yml/runs')
    expect(semComentarios).toContain('compare/main...')
  })
})
```

- [ ] **Step 2: Rodar e ver reprovar**

```bash
cd /home/jvbat/projetos/lotus-infra/frontend && pnpm test --project repo tests/workflow-deploy.test.ts
```

Esperado: FAIL na leitura do arquivo — `ENOENT: no such file or directory … deploy.yml`.

- [ ] **Step 3: Escrever `.github/workflows/deploy.yml`**

```yaml
name: Promover para producao

# Nao ha gatilho automatico. Promocao e' decisao humana, e o unico caminho e'
# este botao.
on:
  workflow_dispatch:
    inputs:
      sha:
        description: SHA de 40 hexadecimais ja publicado no GHCR
        required: true
      confirmar:
        description: Digite PROMOVER para confirmar
        required: true

# Um deploy por vez, e o segundo ESPERA. `cancel-in-progress: true` mataria um
# deploy no meio do migrate, que e' como se produz estado inconsistente.
concurrency:
  group: producao
  cancel-in-progress: false

permissions:
  id-token: write   # OIDC: e' isto que dispensa access key de longa duracao
  contents: read
  actions: read     # ler a conclusao do run de CI do SHA alvo

jobs:
  promover:
    name: promover
    # `.espelho-exclusoes` NAO exclui `.github/`, entao este arquivo tambem
    # existe no repositorio PESSOAL, que e' publico. Sem esta guarda, qualquer um
    # com acesso la teria um botao de deploy para a producao do cliente. E' o
    # oposto exato do job `image` do ci.yml, que e' dono-agnostico de proposito.
    if: github.repository == 'Gatika-CL/lotus'
    runs-on: ubuntu-latest
    timeout-minutes: 20
    env:
      SHA: ${{ inputs.sha }}
      REGIAO: sa-east-1
    steps:
      - name: Formato do SHA e confirmacao
        run: |
          printf '%s' "$SHA" | grep -qE '^[0-9a-f]{40}$' \
            || { echo "erro: sha precisa de 40 hexadecimais minusculos" >&2; exit 1; }
          [ "${{ inputs.confirmar }}" = "PROMOVER" ] \
            || { echo "erro: confirmar precisa ser exatamente PROMOVER" >&2; exit 1; }

      - name: O SHA esta na main deste repositorio
        env:
          GH_TOKEN: ${{ github.token }}
        run: |
          ESTADO=$(gh api "repos/$GITHUB_REPOSITORY/compare/main...$SHA" --jq .status)
          echo "compare main...$SHA = $ESTADO"
          case "$ESTADO" in
            identical|behind) ;;
            *) echo "erro: $SHA nao esta na main (status $ESTADO)" >&2; exit 1 ;;
          esac

      - name: O CI daquele SHA terminou verde
        env:
          GH_TOKEN: ${{ github.token }}
        run: |
          # A imagem existir no GHCR nao prova CI verde: um `gh run rerun` ou um
          # push anterior podem ter deixado o artefato. Quem decide e' a conclusao
          # do run de push daquele head_sha.
          CONCLUSAO=$(gh api \
            "repos/$GITHUB_REPOSITORY/actions/workflows/ci.yml/runs?head_sha=$SHA&status=completed" \
            --jq '[.workflow_runs[] | select(.event=="push")] | first | .conclusion // "nenhum"')
          echo "ci.yml em $SHA = $CONCLUSAO"
          [ "$CONCLUSAO" = "success" ] \
            || { echo "erro: o CI de $SHA nao esta verde ($CONCLUSAO)" >&2; exit 1; }

      - name: O trio existe no GHCR
        run: |
          echo "${{ secrets.GITHUB_TOKEN }}" | docker login ghcr.io -u "${{ github.actor }}" --password-stdin
          LC="${GITHUB_REPOSITORY,,}"
          for ALVO in app web clamav; do
            docker buildx imagetools inspect "ghcr.io/$LC-$ALVO:$SHA" >/dev/null
          done
          echo "trio presente para $SHA"

      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_DEPLOY_ROLE_ARN }}
          aws-region: sa-east-1

      - name: Quem eu sou na AWS
        # Readback no log: e' esta linha que prova, depois, que a promocao nao
        # usou access key nenhuma.
        run: aws sts get-caller-identity

      - name: deploy.sh no host, por SSM
        env:
          INSTANCIA: ${{ secrets.AWS_INSTANCE_ID }}
        run: |
          # O agente SSM executa como root, entao nao ha `sudo` aqui: /opt/lotus
          # e' 750 root:root.
          # O parametro vai por ARQUIVO para nao depender de aspas aninhadas
          # entre o shell do runner e o JSON da API.
          cat > parametros.json <<JSON
          {"commands":["LOTUS_DEPLOY_ATOR=github:$GITHUB_RUN_ID:$GITHUB_ACTOR /opt/lotus/bin/deploy.sh $SHA"]}
          JSON
          COMANDO=$(aws ssm send-command \
            --instance-ids "$INSTANCIA" \
            --document-name AWS-RunShellScript \
            --comment "promover $SHA" \
            --timeout-seconds 600 \
            --parameters "file://parametros.json" \
            --query Command.CommandId --output text)
          echo "CommandId=$COMANDO"

          ESTADO=Pending
          for _ in $(seq 1 120); do
            # `get-command-invocation` devolve InvocationDoesNotExist na janela
            # entre o send e o registro da invocacao; o `|| echo Pending` e' o que
            # distingue "ainda nao apareceu" de "falhou".
            ESTADO=$(aws ssm get-command-invocation --command-id "$COMANDO" \
              --instance-id "$INSTANCIA" --query Status --output text 2>/dev/null || echo Pending)
            case "$ESTADO" in Success|Failed|Cancelled|TimedOut) break ;; esac
            sleep 5
          done

          echo "----- stdout do host -----"
          aws ssm get-command-invocation --command-id "$COMANDO" --instance-id "$INSTANCIA" \
            --query StandardOutputContent --output text || true
          echo "----- stderr do host -----"
          aws ssm get-command-invocation --command-id "$COMANDO" --instance-id "$INSTANCIA" \
            --query StandardErrorContent --output text || true
          echo "estado final: $ESTADO"
          [ "$ESTADO" = "Success" ] || exit 1
```

- [ ] **Step 4: Rodar e ver passar**

```bash
cd /home/jvbat/projetos/lotus-infra/frontend && pnpm test --project repo tests/workflow-deploy.test.ts
```

Esperado: PASS nos nove testes.

- [ ] **Step 5: Conferir que o YAML é válido**

```bash
cd /home/jvbat/projetos/lotus-infra && python3 -c "import yaml,sys; yaml.safe_load(open('.github/workflows/deploy.yml')); print('yaml ok')"
```

Esperado: `yaml ok`.

- [ ] **Step 6: Commit**

```bash
cd /home/jvbat/projetos/lotus-infra
git add .github/workflows/deploy.yml frontend/tests/workflow-deploy.test.ts
git commit -m "feat(ci): o botao de promocao nasce, e so no repositorio corporativo

workflow_dispatch com sha e confirmacao digitada, concurrency de grupo unico
sem cancelamento, OIDC em vez de access key, e ssm send-command invocando o
/opt/lotus/bin/deploy.sh — o workflow nao duplica a sequencia de deploy, ele
chama a unica que existe.

A guarda de dono nao e' zelo: o .espelho-exclusoes nao exclui .github/, entao
este arquivo tambem vive no repositorio PUBLICO. Pela mesma razao, ARN e
InstanceId entram por secret e a catraca recusa literais.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: O script que cria o OIDC e a role

**Files:**
- Create: `deploy/aws/criar-oidc-e-role.sh`
- Create: `frontend/tests/criar-oidc-role.test.ts`

**Interfaces:**
- Consumes: `LOTUS_INSTANCIA` (obrigatória), `LOTUS_REPO` (default `Gatika-CL/lotus`), `LOTUS_REGIAO` (default `sa-east-1`).
- Produces: provider OIDC `token.actions.githubusercontent.com`, role `lotus-deploy` com política inline `lotus-deploy-ssm`, `AmazonSSMManagedInstanceCore` anexada a `lotus-ec2`, e no stdout o ARN que vira o secret `AWS_DEPLOY_ROLE_ARN`.

- [ ] **Step 1: Escrever a catraca que falha**

Criar `frontend/tests/criar-oidc-role.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

/**
 * `deploy/aws/criar-oidc-e-role.sh` é o único caminho versionado para a
 * identidade que promove release. O que ele não pode virar: uma role ampla, uma
 * trust aberta a qualquer repositório, ou um script que termina verde com o
 * agente SSM morto — role perfeita com agente morto não promove nada.
 */
const RAIZ = resolve(__dirname, '..', '..')
const CAMINHO = join(RAIZ, 'deploy', 'aws', 'criar-oidc-e-role.sh')
const SCRIPT = readFileSync(CAMINHO, 'utf8')
const semComentarios = SCRIPT.split(/\r?\n/)
  .filter((linha) => !/^\s*#/.test(linha))
  .join('\n')

describe('deploy/aws/criar-oidc-e-role.sh', () => {
  it('é executável e falha alto', () => {
    expect(statSync(CAMINHO).mode & 0o111).not.toBe(0)
    expect(semComentarios).toMatch(/^set -euo pipefail$/m)
  })

  it('fixa a trust na main do repositório corporativo', () => {
    expect(semComentarios).toContain('repo:$REPO:ref:refs/heads/main')
    expect(semComentarios).toContain('sts.amazonaws.com')
  })

  it('não usa curinga na condição de sub — trust aberta é conta aberta', () => {
    expect(semComentarios).not.toMatch(/"?[^"]*:sub"?\s*:\s*"[^"]*\*/)
    expect(semComentarios).toContain('StringEquals')
  })

  it('a política é mínima: um comando, uma instância, um documento', () => {
    expect(semComentarios).toContain('ssm:SendCommand')
    expect(semComentarios).toContain('instance/$INSTANCIA')
    expect(semComentarios).toContain('document/AWS-RunShellScript')
    expect(semComentarios).not.toContain('ssm:StartSession')
    expect(semComentarios).not.toMatch(/"Action"\s*:\s*"\*"/)
  })

  it('é idempotente — reexecutar não estraga nada', () => {
    expect(semComentarios).toContain('get-open-id-connect-provider')
    expect(semComentarios).toContain('update-assume-role-policy')
  })

  it('exige o agente SSM Online no readback', () => {
    expect(semComentarios).toContain('describe-instance-information')
    expect(semComentarios).toContain('PingStatus')
    expect(semComentarios).toMatch(/\[ "\$PING" = "Online" \]/)
  })

  it('não deixa documento de política no /tmp depois de rodar', () => {
    expect(semComentarios).toMatch(/^trap .* EXIT$/m)
  })
})
```

- [ ] **Step 2: Rodar e ver reprovar**

```bash
cd /home/jvbat/projetos/lotus-infra/frontend && pnpm test --project repo tests/criar-oidc-role.test.ts
```

Esperado: FAIL na leitura do arquivo — `ENOENT`.

- [ ] **Step 3: Escrever o script**

```bash
#!/usr/bin/env bash
#
# Provider OIDC + role de deploy para a Actions do corporativo (item 12, §9).
# Idempotente: reexecutar nao estraga nada, e termina em readback.
# Quem roda e' o JOAO, com credencial administrativa da conta; a sessao confere
# a saida. Console clicando nao deixa rastro e IaC seria estado novo para
# manter por causa de dois recursos.
#
# Uso:  LOTUS_INSTANCIA=i-0123456789abcdef0 deploy/aws/criar-oidc-e-role.sh
set -euo pipefail

REPO="${LOTUS_REPO:-Gatika-CL/lotus}"
REGIAO="${LOTUS_REGIAO:-sa-east-1}"
INSTANCIA="${LOTUS_INSTANCIA:-}"
[ -n "$INSTANCIA" ] || { echo "erro: defina LOTUS_INSTANCIA=i-..." >&2; exit 2; }

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

CONTA=$(aws sts get-caller-identity --query Account --output text)
EMISSOR=token.actions.githubusercontent.com
ARN_OIDC="arn:aws:iam::$CONTA:oidc-provider/$EMISSOR"
ROLE=lotus-deploy

echo "==> conta $CONTA, regiao $REGIAO, repositorio $REPO, instancia $INSTANCIA"

if aws iam get-open-id-connect-provider --open-id-connect-provider-arn "$ARN_OIDC" >/dev/null 2>&1; then
  echo "==> provider OIDC ja existe"
else
  # O thumbprint deixou de ser verificado pela AWS para ESTE emissor em 2023,
  # mas a API continua exigindo o campo. Valor documentado pela AWS.
  aws iam create-open-id-connect-provider --url "https://$EMISSOR" \
    --client-id-list sts.amazonaws.com \
    --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1 >/dev/null
  echo "==> provider OIDC criado"
fi

# `sub` fixado na main do corporativo: workflow_dispatch de outra branch, ou de
# outro repositorio, recebe AccessDenied em vez de deploy. Curinga aqui seria
# entregar a conta a qualquer branch que alguem crie.
cat > "$TMP/trust.json" <<JSON
{"Version":"2012-10-17","Statement":[{
  "Effect":"Allow",
  "Principal":{"Federated":"$ARN_OIDC"},
  "Action":"sts:AssumeRoleWithWebIdentity",
  "Condition":{"StringEquals":{
    "$EMISSOR:aud":"sts.amazonaws.com",
    "$EMISSOR:sub":"repo:$REPO:ref:refs/heads/main"}}}]}
JSON

if aws iam get-role --role-name "$ROLE" >/dev/null 2>&1; then
  aws iam update-assume-role-policy --role-name "$ROLE" --policy-document "file://$TMP/trust.json"
  echo "==> trust da role $ROLE atualizada"
else
  aws iam create-role --role-name "$ROLE" \
    --assume-role-policy-document "file://$TMP/trust.json" \
    --description "Promocao de release por OIDC da Actions de $REPO" >/dev/null
  echo "==> role $ROLE criada"
fi

# Minima de verdade: mandar UM comando, para UMA instancia, com UM documento.
# Nada de ssm:StartSession — esta role nao abre shell. `GetCommandInvocation` e
# `ListCommandInvocations` ficam em "*" porque sao leitura e o id do comando so
# existe depois do send.
cat > "$TMP/ssm.json" <<JSON
{"Version":"2012-10-17","Statement":[
 {"Effect":"Allow","Action":"ssm:SendCommand","Resource":[
   "arn:aws:ec2:$REGIAO:$CONTA:instance/$INSTANCIA",
   "arn:aws:ssm:$REGIAO::document/AWS-RunShellScript"]},
 {"Effect":"Allow","Action":["ssm:GetCommandInvocation","ssm:ListCommandInvocations"],
  "Resource":"*"}]}
JSON
aws iam put-role-policy --role-name "$ROLE" --policy-name lotus-deploy-ssm \
  --policy-document "file://$TMP/ssm.json"
echo "==> politica lotus-deploy-ssm aplicada"

# Sem isto o agente do host nao fala com o servico, e o send-command fica
# eternamente Pending. Nao mexe no que a lotus-ec2 ja tem (S3 do backup, SNS).
aws iam attach-role-policy --role-name lotus-ec2 \
  --policy-arn arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore
echo "==> lotus-ec2 com AmazonSSMManagedInstanceCore"

echo
echo "===== readback ====="
aws iam get-role --role-name "$ROLE" --query 'Role.AssumeRolePolicyDocument' --output json
aws iam list-role-policies --role-name "$ROLE" --output text
aws iam list-attached-role-policies --role-name lotus-ec2 --output text
PING=$(aws ssm describe-instance-information --region "$REGIAO" \
  --filters "Key=InstanceIds,Values=$INSTANCIA" \
  --query 'InstanceInformationList[0].PingStatus' --output text)
echo "PingStatus de $INSTANCIA: $PING"
[ "$PING" = "Online" ] || { echo "erro: o agente SSM de $INSTANCIA nao esta Online" >&2; exit 1; }
echo
echo "secret AWS_DEPLOY_ROLE_ARN = arn:aws:iam::$CONTA:role/$ROLE"
echo "secret AWS_INSTANCE_ID     = $INSTANCIA"
```

- [ ] **Step 4: Tornar executável, rodar a catraca e conferir a sintaxe**

```bash
cd /home/jvbat/projetos/lotus-infra
chmod +x deploy/aws/criar-oidc-e-role.sh
bash -n deploy/aws/criar-oidc-e-role.sh && echo "sintaxe ok"
cd frontend && pnpm test --project repo tests/criar-oidc-role.test.ts
```

Esperado: `sintaxe ok` e PASS nos sete testes.

- [ ] **Step 5: Commit**

```bash
cd /home/jvbat/projetos/lotus-infra
git add deploy/aws/criar-oidc-e-role.sh frontend/tests/criar-oidc-role.test.ts
git commit -m "feat(aws): script versionado cria o OIDC e a role de deploy

Idempotente, com readback que EXIGE PingStatus Online — role perfeita com
agente SSM morto nao promove nada, e um script que termina verde nesse estado
so adia a descoberta. A trust fixa sub em refs/heads/main do corporativo: sem
curinga, sem entregar a conta a qualquer branch que alguem crie.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: Documentação — ADR-14, runbook e lição 19

**Files:**
- Modify: `docs/adrs.md` (ADR-14, linha ~132)
- Modify: `deploy/aws/README.md` (§4, §8, seção nova)
- Modify: `docs/README.md` (lição 19, linha ~127)

- [ ] **Step 1: Emenda do ADR-14**

Acrescentar, depois do parágrafo `**Itens [FASE 2] a resolver:**` do ADR-14 em `docs/adrs.md`:

```markdown
**Emenda (2026-09-21, bloco `cicd-promocao-deploy-e-rollback`).** O item `[FASE 2]` *"deploy
reproduzível (script git pull → rebuild → restart; GitHub Actions quando incomodar — não montar
pipeline no dia 1)"* está **vencido, e o texto descrevia outra coisa**. O deploy não faz `git pull`
nem build: promove por SHA um trio de imagens já construído e testado pela CI
(`lotus-app`, `lotus-web`, `lotus-clamav`), e o host não tem working tree. O "quando incomodar"
chegou — a promoção passa a ter botão (`workflow_dispatch` no repositório corporativo), transporte
por SSM com OIDC, cadeado no host, dump pré-deploy e o ledger `releases.jsonl`, que registra SHA
corrente, anterior, migrations aplicadas e a chave do dump. **Rollback deixa de ser combinado:** o
`deploy/bin/deploy.sh` recusa alvo cujo schema o banco já ultrapassou e aponta o dump exato.
O `decisao-stack.md` do Drive — planejamento canônico (`CLAUDE.md` §3) — ainda traz o texto
original; **quem vence aqui é esta decisão posterior do João**, e o original não se apaga. O outro
`[FASE 2]` deste ADR, *"backup do banco (snapshot RDS)"*, já tinha sido vencido pela revisão 2026-09
do **ADR-09** — veja lá, não se repete aqui.
```

- [ ] **Step 2: Runbook §4 — a identidade que promove**

Acrescentar ao fim da `## 4. IAM — role da EC2 (least-privilege)` de `deploy/aws/README.md`:

```markdown
**A role da EC2 ganha SSM (item 12).** A promoção pela Actions chega ao host por
`ssm send-command`, e para isso o agente precisa falar com o serviço:
`AmazonSSMManagedInstanceCore` anexada à `lotus-ec2`. **Nenhuma regra nova de inbound no
`lotus-web`** — o agente sai pela 443, que o outbound já libera.

**A role que a Actions assume é outra:** `lotus-deploy`, federada por OIDC, sem access key. As duas
nascem de um script só, idempotente e com readback:

```bash
LOTUS_INSTANCIA=<i-...> deploy/aws/criar-oidc-e-role.sh
```

Ele termina imprimindo os dois valores que viram *repository secret* em `Gatika-CL/lotus`:
`AWS_DEPLOY_ROLE_ARN` e `AWS_INSTANCE_ID`. Eles **não** vão para o YAML: `.github/` atravessa o
espelho e o repositório pessoal é público.
```

- [ ] **Step 3: Runbook §8 — reescrita**

Substituir o corpo de `## 8. Deploy e admin inicial` até (exclusive) `**Admin inicial.**` por:

```markdown
## 8. Deploy e admin inicial

**O caminho normal é o botão.** Em `Gatika-CL/lotus`, Actions → *Promover para producao* →
`Run workflow`, com o SHA de 40 hexadecimais e a palavra `PROMOVER`. O workflow confere que o SHA
está na `main`, que o CI dele terminou verde e que os três manifestos existem no GHCR; assume a
role `lotus-deploy` por OIDC; e manda o host rodar **este mesmo script**:

```bash
sudo /opt/lotus/bin/deploy.sh <sha de 40 hexadecimais>
```

**O SSH manual é contingência**, não o caminho de todo dia: serve quando a Actions está fora do ar
ou quando o rollback precisa do escape do §8.1. Os dois caminhos disputam o mesmo `flock` em
`/opt/lotus/.deploy.lock` — o segundo sai com código **3** em vez de rodar junto.

### 8.1 Rollback

`cat /opt/lotus/CURRENT_SHA` mostra o corrente; `/opt/lotus/releases.jsonl` mostra o histórico
(§8.2). Promover o SHA anterior é o rollback, e o script decide se ele é seguro:

- **o alvo conhece tudo que o banco tem** → roda igual a um deploy normal;
- **o banco está à frente do alvo** → o script **recusa** com código **4**, lista as migrations que
  sobram e manda procurar o dump no ledger. Restaure o dump **antes** de promover. Só depois disso,
  e só por SSH, `LOTUS_ACEITAR_SCHEMA_A_FRENTE=1` pula o gate. O workflow nunca define essa
  variável: o caminho automatizado não tem como contorná-lo.

### 8.2 O ledger `releases.jsonl`

Append-only, `640 root:root`, duas linhas por tentativa:

```bash
sudo tail -4 /opt/lotus/releases.jsonl
```

- `{"evento":"inicio",…}` sai **antes** do `migrate` e traz `sha`, `sha_anterior`, as `migrations`
  que vão rodar, a chave `dump` (ou `null`, quando não havia migration pendente) e o `ator`.
- `{"evento":"fim",…}` traz `resultado` e a `etapa` em que parou.
- **`inicio` sem `fim` significa deploy interrompido no meio.** Não é buraco no registro: é a
  informação que se quer nessa hora, e é a linha que aponta o dump.

O dump pré-deploy só acontece quando há migration pendente — deploy sem migration se desfaz
promovendo o SHA anterior, e o gate do §8.1 prova que ele é limpo. **Gatilho para rever:** se o
dump passar a custar minutos, ele sai do caminho crítico do deploy.

```

- [ ] **Step 4: Lição 19**

No item 19 de `docs/README.md`, acrescentar ao fim do parágrafo:

```markdown
 **Emenda de 2026-09-21 (item 12):** a lista de pares acima dizia `deploy/bin/*.sh` e
`backup-db.test.ts`/`verificar-backup.test.ts`, mas **`deploy/bin/deploy.sh` não tinha asserção
nenhuma** — e `.github/workflows/ci.yml` também não. Glob na lição não é catraca no arquivo. Os
pares passam a ser nominais: `deploy/bin/deploy.sh` ↔ `frontend/tests/deploy-sh.test.ts`,
`.github/workflows/deploy.yml` ↔ `frontend/tests/workflow-deploy.test.ts` e
`deploy/aws/criar-oidc-e-role.sh` ↔ `frontend/tests/criar-oidc-role.test.ts`. O `ci.yml` segue sem
catraca e isso fica **declarado**, não esquecido.
```

- [ ] **Step 5: Rodar a catraca de referências de doc**

```bash
cd /home/jvbat/projetos/lotus-infra/frontend && pnpm test --project repo tests/repo-docs-refs.test.ts
```

Esperado: PASS. (Ela confere que caminhos citados em doc existem; os três testes novos e o script de AWS já existem neste ponto.)

- [ ] **Step 6: Commit**

```bash
cd /home/jvbat/projetos/lotus-infra
git add docs/adrs.md deploy/aws/README.md docs/README.md
git commit -m "docs: o ADR-14 admite que o deploy mudou e o runbook ensina o rollback

A emenda registra que o item [FASE 2] do ADR-14 descrevia git pull + rebuild e
que o deploy real e' promocao de imagem por SHA. O Drive canonico ainda traz o
texto velho; quem vence e' a decisao posterior do Joao, e o original fica.

O runbook ganha o botao, o SSH como contingencia, o procedimento de rollback
com o gate e a leitura do releases.jsonl. A licao 19 troca glob por par nominal
— deploy.sh estava 'coberto' por um asterisco e nao tinha asserção nenhuma.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 8: A identidade na AWS, ao vivo

**Quem executa: o João.** A sessão lê a saída e confere. Escrita na conta AWS e no host não passa pela sessão.

**Files:**
- Create: `docs/superpowers/audits/2026-09-21-cicd-promocao-deploy-e-rollback.md`
- Modify (condicional, ver Step 3): `deploy/aws/user-data.sh`

- [ ] **Step 1: Medir o agente SSM antes de qualquer criação**

João roda, na máquina dele com credencial da conta:

```bash
aws ssm describe-instance-information --region sa-east-1 \
  --query 'InstanceInformationList[].[InstanceId,PingStatus,AgentVersion,PlatformName]' --output table
```

Dois desfechos possíveis, os dois previstos:
- a instância aparece `Online` → siga para o Step 2;
- a instância **não** aparece → o agente não está ativo ou a role ainda não permite. Siga para o Step 2 assim mesmo (a role vem de lá) e volte a medir; se continuar fora depois da role, vá ao Step 3.

- [ ] **Step 2: Rodar o script**

```bash
cd <clone do João> && LOTUS_INSTANCIA=<i-...> deploy/aws/criar-oidc-e-role.sh
```

Esperado no fim: o bloco `===== readback =====` com a trust fixada em
`repo:Gatika-CL/lotus:ref:refs/heads/main`, `lotus-deploy-ssm` listada, `AmazonSSMManagedInstanceCore`
entre as políticas da `lotus-ec2`, `PingStatus de <i-...>: Online`, e as duas linhas `secret …`.

**Conferência da sessão:** a saída colada traz `"$EMISSOR:sub": "repo:Gatika-CL/lotus:ref:refs/heads/main"` sem curinga, e `PingStatus … Online`. Se o script sair em `erro: o agente SSM … nao esta Online`, vá ao Step 3.

- [ ] **Step 3 (condicional — só se o `PingStatus` não ficar `Online`): instalar o agente e versionar a garantia**

João roda no host, por SSH:

```bash
sudo snap install amazon-ssm-agent --classic || sudo snap start amazon-ssm-agent
snap services amazon-ssm-agent
```

E o repositório passa a garantir o mesmo num host reconstruído — acrescentar a `deploy/aws/user-data.sh`, antes do bloco do swap:

```bash
# O agente SSM e' o transporte da promocao (item 12, §9). O AMI da Canonical o
# traz como snap, mas host reparado a mao pode nao ter — e a guarda de
# reexecucao vale aqui como vale para o swap.
snap list amazon-ssm-agent >/dev/null 2>&1 || snap install amazon-ssm-agent --classic
```

Depois, rodar o script do Step 2 de novo e exigir `Online`.

- [ ] **Step 4: Criar os dois secrets no corporativo**

João roda:

```bash
gh secret set AWS_DEPLOY_ROLE_ARN --repo Gatika-CL/lotus --body '<arn impresso no readback>'
gh secret set AWS_INSTANCE_ID     --repo Gatika-CL/lotus --body '<i-... impresso no readback>'
gh secret list --repo Gatika-CL/lotus
```

Esperado: os dois nomes na listagem. **Conferência da sessão:** a listagem mostra nome e data, nunca o valor — é assim que tem de ser.

- [ ] **Step 5: Registrar a evidência**

Criar `docs/superpowers/audits/2026-09-21-cicd-promocao-deploy-e-rollback.md` com o cabeçalho e a primeira seção:

```markdown
# Evidências — `cicd-promocao-deploy-e-rollback` (item 12)

Plano: [`plans/2026-09-21-cicd-promocao-deploy-e-rollback.md`](../plans/2026-09-21-cicd-promocao-deploy-e-rollback.md)

## Task 8 — identidade na AWS

- `describe-instance-information` antes da role: <colar>
- Saída do `criar-oidc-e-role.sh` (readback completo): <colar>
- `gh secret list --repo Gatika-CL/lotus`: <colar>
- Agente SSM: <"já vinha Online" | "instalado no Step 3; user-data.sh emendado">
```

- [ ] **Step 6: Commit**

```bash
cd /home/jvbat/projetos/lotus-infra
git add docs/superpowers/audits/2026-09-21-cicd-promocao-deploy-e-rollback.md deploy/aws/user-data.sh
git commit -m "chore(aws): a role lotus-deploy existe e o agente SSM responde Online

Readback colado nas evidencias. Os dois secrets do corporativo criados; a
listagem mostra nome e data, nunca valor.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

*(Se o Step 3 não foi necessário, remover `deploy/aws/user-data.sh` do `git add` e dizê-lo na evidência.)*

---

### Task 9: Os scripts novos no host, e o primeiro deploy manual

**Quem executa: o João.** Prova os DoD 3 e 6 e monta o terreno para o rollback da Task 10.

- [ ] **Step 1: Publicar os scripts no host**

João, do clone dele, com a branch `cicd/promocao-deploy-e-rollback` em mãos:

```bash
scp deploy/bin/deploy.sh deploy/bin/backup-db.sh ubuntu@18.230.53.197:/tmp/
ssh ubuntu@18.230.53.197 'sudo install -m 750 -o root -g root /tmp/deploy.sh /tmp/backup-db.sh /opt/lotus/bin/ && sudo rm -f /tmp/deploy.sh /tmp/backup-db.sh && sudo ls -l /opt/lotus/bin/'
```

Esperado: os três scripts em `/opt/lotus/bin/`, `750 root:root`.

- [ ] **Step 2: Promover o SHA já em produção, para exercitar o caminho sem mudar nada**

```bash
ssh ubuntu@18.230.53.197 'sudo sh -c "SHA=\$(cat /opt/lotus/CURRENT_SHA); /opt/lotus/bin/deploy.sh \$SHA"'
```

Esperado: `==> gate de schema` sem recusa, `PENDENTES` vazio (portanto **sem** dump), `==> DEPLOY OK: <sha>`.

- [ ] **Step 3: Ler o ledger — DoD 3**

```bash
ssh ubuntu@18.230.53.197 'sudo tail -2 /opt/lotus/releases.jsonl; echo "---"; sudo cat /opt/lotus/CURRENT_SHA'
```

Esperado: linha `inicio` com `"migrations":[]`, `"dump":null`, `"ator":"manual:root"` e `sha_anterior` igual ao `sha` (é o mesmo SHA); linha `fim` com `"resultado":"ok","etapa":"ok"`; e o `CURRENT_SHA` batendo.

- [ ] **Step 4: Provar o cadeado**

Em dois terminais, ou em background:

```bash
ssh ubuntu@18.230.53.197 'sudo sh -c "SHA=\$(cat /opt/lotus/CURRENT_SHA); /opt/lotus/bin/deploy.sh \$SHA" & sleep 2; sudo sh -c "SHA=\$(cat /opt/lotus/CURRENT_SHA); /opt/lotus/bin/deploy.sh \$SHA"; echo "codigo=$?"'
```

Esperado no segundo: `erro: outro deploy ja esta rodando (pid <n>)` e `codigo=3`.

- [ ] **Step 5: Provar o dump — DoD 6**

Rodar o backup isolado, com a variável nova:

```bash
ssh ubuntu@18.230.53.197 'sudo sh -c "LOTUS_BACKUP_SAIDA=/tmp/chave.txt /opt/lotus/bin/backup-db.sh; cat /tmp/chave.txt; rm -f /tmp/chave.txt"'
ssh ubuntu@18.230.53.197 'sudo /opt/lotus/bin/verificar-backup.sh'
```

Esperado: `backup ok: s3://…` no stdout, a mesma URI sozinha no arquivo, e o `verificar-backup.sh` aprovando.

- [ ] **Step 6: Registrar nas evidências e commitar**

Acrescentar ao audit a seção `## Task 9 — deploy manual, cadeado e dump` com as quatro saídas coladas.

```bash
cd /home/jvbat/projetos/lotus-infra
git add docs/superpowers/audits/2026-09-21-cicd-promocao-deploy-e-rollback.md
git commit -m "test(deploy): o caminho manual roda com ledger, cadeado e dump provados

DoD 3 e DoD 6 fechados. O segundo deploy simultaneo saiu com codigo 3 em vez de
correr junto, e a chave do dump chegou pelo arquivo, sem parsear stdout.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 10: Rollback limpo e rollback recusado

**Quem executa: o João.** Prova os DoD 4 e 5 — os dois com execução real, nada deduzido.

- [ ] **Step 1: Escolher os dois SHAs**

Do ledger e do GHCR, escolher `SHA_ANTERIOR` (uma release anterior cujo trio ainda existe no GHCR) e confirmar qual dos dois tem migration a mais. Registrar a escolha e o porquê.

```bash
ssh ubuntu@18.230.53.197 'sudo cat /opt/lotus/releases.jsonl'
```

- [ ] **Step 2: Rollback limpo — DoD 4**

Com um `SHA_ANTERIOR` que **não** perde migration:

```bash
ssh ubuntu@18.230.53.197 'sudo /opt/lotus/bin/deploy.sh <SHA_ANTERIOR>; echo "codigo=$?"'
ssh ubuntu@18.230.53.197 'curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1/up; sudo tail -2 /opt/lotus/releases.jsonl'
```

Esperado: `codigo=0`, `200`, e as duas linhas novas no ledger com `sha_anterior` apontando para o SHA de onde se voltou.

- [ ] **Step 3: Produzir o caso do banco à frente**

Promover de volta um SHA **mais novo, que tenha pelo menos uma migration a mais**, e deixar que ela seja aplicada:

```bash
ssh ubuntu@18.230.53.197 'sudo /opt/lotus/bin/deploy.sh <SHA_NOVO>'
ssh ubuntu@18.230.53.197 'sudo tail -2 /opt/lotus/releases.jsonl'
```

Esperado: a linha `inicio` traz `"migrations"` **não vazio** e `"dump"` com uma chave `s3://…` — é este dump que a recusa do Step 4 vai apontar.

- [ ] **Step 4: Rollback recusado — DoD 5**

```bash
ssh ubuntu@18.230.53.197 'sudo /opt/lotus/bin/deploy.sh <SHA_ANTERIOR>; echo "codigo=$?"'
```

Esperado, literal: `erro: o banco esta A FRENTE de <SHA_ANTERIOR> — a imagem alvo nao conhece:` seguido da lista de migrations, a linha mandando procurar o dump em `releases.jsonl`, e `codigo=4`. **A produção não muda** — confirmar com `curl /up` e `cat CURRENT_SHA`.

- [ ] **Step 5: Voltar a produção ao SHA que deve ficar**

Promover o SHA corrente pretendido e conferir `/up` 200.

- [ ] **Step 6: Registrar nas evidências e commitar**

Acrescentar a seção `## Task 10 — rollback limpo e rollback recusado`, com as saídas literais dos Steps 2 e 4.

```bash
cd /home/jvbat/projetos/lotus-infra
git add docs/superpowers/audits/2026-09-21-cicd-promocao-deploy-e-rollback.md
git commit -m "test(deploy): o rollback limpo passa e o rollback perigoso e' recusado

DoD 4 e DoD 5, os dois por execucao real. A recusa saiu com codigo 4, nomeou as
migrations que a imagem alvo nao conhece e apontou a chave do dump — e a
producao nao se mexeu.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 11: Integração — PR, `main` e espelho

O `workflow_dispatch` só aparece quando o arquivo está na branch default, e o espelho é a única via até o corporativo. Por isso esta task vem **antes** das provas do botão, e não no fechamento.

- [ ] **Step 1: Suíte inteira antes de abrir a PR**

```bash
cd /home/jvbat/projetos/lotus-infra/frontend && pnpm test && pnpm lint && pnpm build
```

Esperado: tudo verde, incluindo as quatro catracas deste bloco.

- [ ] **Step 2: Push e PR**

```bash
cd /home/jvbat/projetos/lotus-infra
git push origin HEAD:refs/heads/cicd/promocao-deploy-e-rollback
gh pr create --fill
```

- [ ] **Step 3: Esperar os gates e mesclar**

```bash
gh pr checks --watch
gh pr merge --merge
```

Esperado: os cinco gates verdes e, depois do merge na `main`, o job `image` publicando o trio do novo SHA.

- [ ] **Step 4: Espelhar**

```bash
git fetch origin
scripts/espelhar-corporativo.sh --simular
scripts/espelhar-corporativo.sh
```

Esperado: a simulação mostra `.github/workflows/deploy.yml` e `deploy/aws/criar-oidc-e-role.sh` **dentro** da árvore filtrada, e `docs/`, `.claude/` e `frontend/tests/repo-docs-refs.test.ts` **fora** — o resto de `frontend/tests/` atravessa. A publicação cria o commit com o trailer `Source-Commit:` e o CI corporativo fica verde.

**Confira isto e não presuma:** as três catracas novas atravessam o espelho e vão rodar no CI corporativo. Elas passam lá porque leem só `deploy/` e `.github/`, que também atravessam. Catraca que lesse `docs/` reprovaria no destino por acerto, não por defeito — é exatamente por isso que o `repo-docs-refs.test.ts` está no `.espelho-exclusoes`.

- [ ] **Step 5: Conferir que o botão nasceu do lado certo, e só dele**

```bash
gh workflow list --repo Gatika-CL/lotus
gh workflow list --repo Andred21/lotus
```

Esperado: *Promover para producao* listado nos dois (o arquivo atravessa), mas um `gh workflow run` no **pessoal** termina com o job `promover` **skipped** pela guarda de dono — medir isso no Step 6 da Task 12.

- [ ] **Step 6: Registrar**

Acrescentar ao audit a seção `## Task 11 — integração` com o SHA do merge, o SHA sintético do espelho e os links dos runs.

---

### Task 12: O botão, ao vivo

Fecha os DoD 1, 2, 7 e 8. **Quem dispara: o João** (o botão é do corporativo); a sessão lê os runs e confere.

- [ ] **Step 1: Promoção verde — DoD 1**

Em `Gatika-CL/lotus` → Actions → *Promover para producao* → `Run workflow`, com o SHA sintético do espelho e `PROMOVER`.

Esperado no log: `compare main...<sha> = identical`, `ci.yml em <sha> = success`, `trio presente`, o `get-caller-identity` mostrando `arn:aws:sts::<conta>:assumed-role/lotus-deploy/…`, o stdout do host com `==> DEPLOY OK: <sha>`, e estado final `Success`.

Conferir de fora:

```bash
curl -s -o /dev/null -w '%{http_code}\n' http://18.230.53.197/up
ssh ubuntu@18.230.53.197 'sudo tail -2 /opt/lotus/releases.jsonl'
```

Esperado: `200`, e no ledger `"ator":"github:<run_id>:<login>"`.

- [ ] **Step 2: Serialização — DoD 2**

Disparar duas vezes seguidas, sem esperar a primeira terminar.

Esperado: o segundo run fica em `Queued` pelo `concurrency`, o primeiro termina `Success` e o segundo roda **depois**. Nenhum dos dois é cancelado.

- [ ] **Step 3: Recusa por confirmação errada — DoD 8a**

Disparar com `confirmar: promover` (minúsculas).

Esperado: falha no primeiro step, `erro: confirmar precisa ser exatamente PROMOVER`, e **nenhum** `send-command`.

- [ ] **Step 4: Recusa por SHA que não passou pelos gates — DoD 8b**

Duas medições, porque são dois guardas diferentes:

**(a) SHA fora da `main`.** Disparar com o SHA **pessoal** de origem, o que o trailer `Source-Commit` registra — ele tem 40 hexadecimais válidos e não existe na `main` do corporativo.

Esperado: falha no step "O SHA esta na main deste repositorio", com `status` diferente de `identical`/`behind`, e **nenhum** `send-command`.

**(b) SHA na `main` sem CI verde.** Procurar um SHA da `main` corporativa cujo run de `ci.yml` não tenha concluído `success`:

```bash
gh api "repos/Gatika-CL/lotus/actions/workflows/ci.yml/runs?status=completed" \
  --jq '.workflow_runs[] | select(.event=="push" and .conclusion!="success") | [.head_sha,.conclusion] | @tsv'
```

Se houver candidato, disparar com ele e esperar `erro: o CI de <sha> nao esta verde (<conclusão>)`. Se a listagem vier vazia — a `main` corporativa nunca teve run vermelho —, **declarar isso na evidência** em vez de fabricar um commit vermelho: a guarda fica provada pela leitura do código e pelo (a), e a lacuna fica escrita, não escondida.

- [ ] **Step 5: A conta não ganhou superfície — DoD 7**

```bash
aws ec2 describe-security-groups --region sa-east-1 --filters Name=group-name,Values=lotus-web \
  --query 'SecurityGroups[0].IpPermissions[].[IpProtocol,FromPort,IpRanges[].CidrIp]' --output json
```

Esperado: exatamente as três regras de sempre — `22` no `/32` do João, `80` e `443` em `0.0.0.0/0`. Nada mais.

- [ ] **Step 6: A guarda de dono vista funcionando**

```bash
gh workflow run "Promover para producao" --repo Andred21/lotus -f sha=<qualquer 40 hex> -f confirmar=PROMOVER
gh run list --repo Andred21/lotus --workflow "Promover para producao" --limit 1
```

Esperado: o run existe e o job `promover` aparece **skipped**. Nenhum `send-command` sai do repositório público.

- [ ] **Step 7: Fechar as evidências e commitar**

Acrescentar a seção `## Task 12 — o botão ao vivo`, com os links dos seis runs, o recorte do `get-caller-identity`, a saída do `describe-security-groups` e a linha do ledger com o ator `github:…`.

```bash
cd /home/jvbat/projetos/lotus-infra
git add docs/superpowers/audits/2026-09-21-cicd-promocao-deploy-e-rollback.md
git commit -m "test(ci): o botao promove, serializa, recusa e nao abriu porta nenhuma

DoD 1, 2, 7 e 8. O segundo disparo ESPEROU em vez de cancelar; confirmacao
errada e SHA fora da main foram recusados antes de qualquer send-command; o
SG segue com as mesmas tres regras de inbound; e o disparo no repositorio
publico saiu skipped pela guarda de dono.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Handoff de execução

**executor: claude**

Este bloco roda na sessão Claude, no worktree `../lotus-infra`. As tasks 1 a 7 e 11 são trabalho de repositório e a sessão as executa por inteiro. As tasks 8, 9, 10 e 12 têm **execução do João** por decisão registrada — escrita na conta AWS e no host de produção não passa pela sessão, que lê a saída, confere contra o esperado e escreve a evidência.

Não há delegação ao Codex neste bloco: o valor está na medição contra a produção real, que exige as credenciais do João, e o restante é pequeno e denso demais para valer o repasse de contexto.

**Gates de execução por task:** cada task termina com a suíte do arquivo tocado verde e um commit próprio. O gate inline do `/executar-bloco` vale normalmente; as tasks de host param e esperam o João em vez de simular.

**Sequência obrigatória:** 1 → 2 → 3 → 4 (o `deploy.sh` cresce em quatro camadas, nessa ordem); 5 e 6 podem vir em qualquer ordem depois da 4; 7 depois de 5 e 6 (o runbook cita os dois); 8 antes de 9; 9 antes de 10; **11 antes de 12** — o `workflow_dispatch` não existe até o arquivo estar na branch default do corporativo, e é o espelho que o leva lá.
