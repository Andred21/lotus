# `cicd-host-alinhado-ao-sha` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** o botão de promoção recusa quando o host não tem o runtime e os scripts que o SHA alvo pressupõe (P-87), e o `deploy.sh` promove só imagem de `ghcr.io/gatika-cl/` (P-88); a P-86 fecha se houver release com migration.

**Architecture:** um `send-command` só de leitura lista, do host, hashes do runtime e de `bin/*.sh` e os nomes de chave do `.env`; o script versionado `.github/scripts/conferir-alinhamento.sh`, rodando no runner a partir do checkout da `main`, compara o runtime e as chaves com o checkout do SHA alvo e os scripts com o da `main` (D2), e reprova sem escape (D5). O dono das imagens vira literal no `deploy.sh`.

**Tech Stack:** bash, GitHub Actions (`workflow_dispatch`, `actions/checkout@v4`, OIDC), AWS SSM `AWS-RunShellScript`, `jq`, vitest (projeto `repo`, ambiente node).

**Spec:** [`docs/superpowers/specs/2026-09-26-cicd-host-alinhado-ao-sha-design.md`](../specs/2026-09-26-cicd-host-alinhado-ao-sha-design.md). `Contexto: não` — as fontes estão todas no repositório.

## Global Constraints

- Trabalho só no worktree `../lotus-infra`, branch `cicd/host-alinhado-ao-sha`. Nenhuma outra lane é tocada.
- Testes de repositório: `cd frontend && pnpm test --project repo tests/<arquivo>.test.ts`. O `tsconfig.node.json` faz type-check de `tests/`, então o `pnpm build` também cobre o teste novo.
- **Sondas da lição 19** (uma sonda que remove o `exit`, ou acrescenta `|| true`, tem de reprovar a catraca): `cp` do arquivo para o scratchpad da sessão, aplicar a sonda, rodar o teste, restaurar com `cp` e fechar com `git diff --exit-code <arquivo>`. **Nunca `git stash`.** `$SCRATCH` abaixo é o scratchpad da sessão.
- **Escrita em produção é do João**: clicar o botão, reinstalar pelo runbook §7, rodar `verificar-backup.sh`. A sessão só lê (SSH de leitura, `gh`, `aws`) e confere.
- Nenhum identificador de infra (ARN, InstanceId, conta) em arquivo que atravessa o espelho. `docs/` não atravessa.
- Do `.env` só sai **nome de chave**, nunca valor — nem no log do workflow, nem no audit, nem na conversa. O audit registra contagens, não nomes.
- **Sem escape** (D5): nenhum input, variável ou `if:` que pule a conferência.
- Comentários em `.github/workflows/deploy.yml` e em `.github/scripts/` são ASCII, como o resto do workflow.
- Commits terminam com `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`.

## Mapa de arquivos

| Arquivo | Ação | Responsabilidade |
|---|---|---|
| `deploy/bin/deploy.sh` | Modificar (linhas 15 e 102) | Dono das imagens literal `gatika-cl` (P-88) |
| `frontend/tests/deploy-sh.test.ts` | Modificar | Catraca do dono literal |
| `.github/scripts/conferir-alinhamento.sh` | Criar | Decide, no runner, se a listagem do host bate com o alvo e a `main` |
| `frontend/tests/conferir-alinhamento.test.ts` | Criar | Catraca comportamental: executa o script sobre fixtures |
| `.github/workflows/deploy.yml` | Modificar | Dois checkouts e o passo de conferência antes do deploy |
| `frontend/tests/workflow-deploy.test.ts` | Modificar | Catraca do passo novo: ordem, leitura sem escrita, `.env` cortado, sem escape |
| `deploy/aws/README.md` | Modificar (§7, §8, §8.1) | O que a conferência mede, o SSH sem conferência, o rollback com runtime diferente |
| `docs/README.md` | Modificar (lição 19) | Par nominal novo |
| `docs/superpowers/audits/2026-09-26-cicd-host-alinhado-ao-sha.md` | Criar | Evidência: ensaio, integração, vermelho e verde ao vivo, P-86 |
| `docs/superpowers/pendencias/{abertas,encerradas,README}.md` | Modificar | P-87 e P-88 encerradas; P-86 fechada ou com nota |

## Mapa de DoD

| DoD da spec (§9) | Task |
|---|---|
| 1 — dono literal, catraca vista reprovar pelas duas sondas | 1 |
| 2 — script com os casos verdes, catraca vista reprovar com `exit 0` | 2 |
| 3 — catraca do workflow vista reprovar pelas sondas | 3 |
| 4 — vermelho ao vivo | 7 |
| 5 — verde ao vivo | 8 |
| 6 — P-86 | 8 (Step 5) |
| 7 — runbook, fichas e lição 19 | 5 e 9 |

---

### Task 1: P-88 — o dono das imagens é literal

**Files:**
- Modify: `deploy/bin/deploy.sh:15` (cabeçalho) e `deploy/bin/deploy.sh:102` (atribuição)
- Test: `frontend/tests/deploy-sh.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces: `DONO=gatika-cl` no `deploy.sh`. A Task 7 depende disso para o `bin/deploy.sh diferente`, e a Task 8 para o `grep -c LOTUS_RELEASE_OWNER` devolver 0.

- [ ] **Step 1: Escrever o teste que falha**

Acrescentar dentro do `describe('deploy/bin/deploy.sh', …)` de `frontend/tests/deploy-sh.test.ts`, depois do teste `'é executável'`:

```ts
  it('o dono das imagens é gatika-cl fixo, sem variável que o troque (P-88)', () => {
    // Até o item 31 era `${LOTUS_RELEASE_OWNER:-gatika-cl}`: por SSH, a variável
    // promovia o trio do repositório PESSOAL, que é público. A regra "produção
    // roda sempre ghcr.io/gatika-cl/" valia por padrão, não por mecanismo.
    expect(semComentarios.match(/^\s*DONO=.*$/gm)).toEqual(['DONO=gatika-cl'])
    expect(SCRIPT).not.toContain('LOTUS_RELEASE_OWNER')
    // Toda imagem do código passa pelo mesmo dono — nenhuma com dono próprio.
    const donos = [...semComentarios.matchAll(/ghcr\.io\/([^/\s"']+)\//g)].map((m) => m[1])
    expect(donos.length).toBeGreaterThanOrEqual(3)
    for (const dono of donos) expect(['gatika-cl', '$DONO']).toContain(dono)
    // E o login usa o mesmo dono das imagens.
    expect(semComentarios).toMatch(/^docker login ghcr\.io -u "\$DONO" /m)
  })
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd frontend && pnpm test --project repo tests/deploy-sh.test.ts`
Expected: FAIL no teste novo — `expected [ 'DONO="${LOTUS_RELEASE_OWNER:-gatika-cl}"' ] to deeply equal [ 'DONO=gatika-cl' ]`. Os demais testes do arquivo seguem verdes.

- [ ] **Step 3: Implementar**

Em `deploy/bin/deploy.sh`, apagar a linha 15 inteira do cabeçalho:

```text
#   LOTUS_RELEASE_OWNER             dono das imagens no GHCR (default gatika-cl)
```

E trocar a linha 102, `DONO="${LOTUS_RELEASE_OWNER:-gatika-cl}"`, por:

```bash
# Dono fixo (P-88): produção roda sempre imagem de ghcr.io/gatika-cl/. Até o
# item 31 era ${LOTUS_RELEASE_OWNER:-gatika-cl}, e um SSH com a variável
# promovia o trio PÚBLICO do repositório pessoal.
DONO=gatika-cl
```

- [ ] **Step 4: Rodar e ver passar**

Run: `cd frontend && pnpm test --project repo tests/deploy-sh.test.ts`
Expected: PASS, todos.

Run: `bash -n deploy/bin/deploy.sh && grep -c LOTUS_RELEASE_OWNER deploy/bin/deploy.sh`
Expected: nenhuma saída do `bash -n`; `0` do grep (o grep sai 1 com contagem zero — é o esperado).

- [ ] **Step 5: Sondas da lição 19**

```bash
cp deploy/bin/deploy.sh "$SCRATCH/deploy.sh.orig"

sed -i 's/^DONO=gatika-cl$/DONO="${LOTUS_RELEASE_OWNER:-gatika-cl}"/' deploy/bin/deploy.sh
(cd frontend && pnpm test --project repo tests/deploy-sh.test.ts)   # tem de FALHAR
cp "$SCRATCH/deploy.sh.orig" deploy/bin/deploy.sh

sed -i 's/^DONO=gatika-cl$/DONO=andred21/' deploy/bin/deploy.sh
(cd frontend && pnpm test --project repo tests/deploy-sh.test.ts)   # tem de FALHAR
cp "$SCRATCH/deploy.sh.orig" deploy/bin/deploy.sh

cmp "$SCRATCH/deploy.sh.orig" deploy/bin/deploy.sh && echo "restaurado"
```

Expected: as duas rodadas falham no teste `(P-88)`; `restaurado` no fim. O `cmp` e não o `git diff --exit-code`: o arquivo ainda carrega a mudança do Step 3, não commitada — o que se prova é que ele voltou byte a byte a ela.

- [ ] **Step 6: Commit**

```bash
cmp "$SCRATCH/deploy.sh.orig" deploy/bin/deploy.sh
git add deploy/bin/deploy.sh frontend/tests/deploy-sh.test.ts
git commit -m "$(cat <<'EOF'
fix(deploy): dono das imagens fixo em gatika-cl (P-88)

O DONO vinha de ${LOTUS_RELEASE_OWNER:-gatika-cl}; por SSH, a variavel
promovia o trio publico do repositorio pessoal. A catraca prende o literal
e foi vista reprovar pelas sondas da variavel devolvida e de DONO=andred21.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: o script de conferência e a catraca que o executa

**Files:**
- Create: `.github/scripts/conferir-alinhamento.sh` (executável)
- Test: `frontend/tests/conferir-alinhamento.test.ts` (novo)

**Interfaces:**
- Consumes: nada.
- Produces: `conferir-alinhamento.sh <listagem> <arvore-alvo> <arvore-main>`. Saída 0 com `host alinhado ao SHA alvo` no stdout; 1 com uma linha por divergência no stdout (`<caminho> diferente`, `<caminho> ausente`, `<caminho> sem referencia em <ref>`, `chave faltando: <NOME>`) e o ponteiro para o runbook no stderr; 1 com `marcador` no stderr quando a listagem não tem `--- chaves`; 2 em uso errado. Formato da listagem (Task 3 produz, Task 4 ensaia): linhas `<sha256>  <caminho>` ou `AUSENTE  <caminho>`, depois `--- chaves`, depois um nome de chave por linha. Caminhos no host: `docker-compose.prod.yml`, `docker-compose.prod-tls.yml`, `nginx/tls.conf`, `bin/<x>.sh`.

- [ ] **Step 1: Escrever o teste que falha**

Criar `frontend/tests/conferir-alinhamento.test.ts`:

```ts
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'

/**
 * `.github/scripts/conferir-alinhamento.sh` decide, no runner, se o host tem o
 * que o SHA alvo pressupõe (item 31, P-87). Runtime e chaves do `.env` contra
 * o SHA ALVO; scripts de `bin/` contra a MAIN — um rollback não pode exigir o
 * `deploy.sh` antigo de volta (D2 da spec).
 *
 * Por EXECUÇÃO, não por texto: a lição 19 já pagou três vezes a catraca que
 * guarda a palavra e deixa o `exit 1` virar aviso. Cada caso roda o script de
 * verdade sobre fixtures num diretório temporário.
 */
const RAIZ = resolve(__dirname, '..', '..')
const CAMINHO = join(RAIZ, '.github', 'scripts', 'conferir-alinhamento.sh')

let base: string
let alvo: string
let main: string
let contador = 0

const escrever = (caminho: string, conteudo: string) => {
  mkdirSync(dirname(caminho), { recursive: true })
  writeFileSync(caminho, conteudo)
}
const sha256 = (caminho: string) => createHash('sha256').update(readFileSync(caminho)).digest('hex')

beforeAll(() => {
  base = mkdtempSync(join(tmpdir(), 'conferir-alinhamento-'))
  alvo = join(base, 'alvo')
  main = join(base, 'main')
  escrever(join(alvo, 'docker-compose.prod.yml'), 'services: {app: {image: alvo}}\n')
  escrever(join(alvo, 'docker-compose.prod-tls.yml'), 'services: {nginx: {ports: ["443:443"]}}\n')
  escrever(join(alvo, 'deploy', 'nginx', 'tls.conf'), 'server { listen 443 ssl; }\n')
  escrever(
    join(alvo, 'deploy', 'aws', 'env.prod.example'),
    '# molde\nAPP_NAME=Lotus\nAPP_LOCALE=es\n# COMENTADA=nao-conta\n\nDB_HOST=<rds>\n',
  )
  // O deploy.sh do ALVO é o antigo: a referência de bin/ é a main, não ele.
  escrever(join(alvo, 'deploy', 'bin', 'deploy.sh'), '#!/bin/sh\necho antigo\n')
  escrever(join(main, 'docker-compose.prod.yml'), 'services: {app: {image: main}}\n')
  escrever(join(main, 'deploy', 'bin', 'deploy.sh'), '#!/bin/sh\necho novo\n')
  escrever(join(main, 'deploy', 'bin', 'backup-db.sh'), '#!/bin/sh\necho backup\n')
})

afterAll(() => {
  rmSync(base, { recursive: true, force: true })
})

/** A listagem de um host alinhado: runtime do alvo, bin/ da main, chaves do molde. */
const alinhada = (): string[] => [
  `${sha256(join(alvo, 'docker-compose.prod.yml'))}  docker-compose.prod.yml`,
  `${sha256(join(alvo, 'docker-compose.prod-tls.yml'))}  docker-compose.prod-tls.yml`,
  `${sha256(join(alvo, 'deploy', 'nginx', 'tls.conf'))}  nginx/tls.conf`,
  `${sha256(join(main, 'deploy', 'bin', 'backup-db.sh'))}  bin/backup-db.sh`,
  `${sha256(join(main, 'deploy', 'bin', 'deploy.sh'))}  bin/deploy.sh`,
  '--- chaves',
  'APP_NAME',
  'APP_LOCALE',
  'DB_HOST',
]

/** A listagem alinhada com a linha de `caminhoNoHost` trocada por `nova` (ou removida, com null). */
const comLinha = (caminhoNoHost: string, nova: string | null): string[] =>
  alinhada().flatMap((linha) => (linha.endsWith(`  ${caminhoNoHost}`) ? (nova === null ? [] : [nova]) : [linha]))

const conferir = (listagem: string[] | string, arvoreAlvo = alvo, arvoreMain = main) => {
  contador += 1
  const arquivo = join(base, `listagem-${contador}.txt`)
  writeFileSync(arquivo, typeof listagem === 'string' ? listagem : `${listagem.join('\n')}\n`)
  const r = spawnSync('bash', [CAMINHO, arquivo, arvoreAlvo, arvoreMain], { encoding: 'utf8' })
  return { status: r.status, stdout: r.stdout, stderr: r.stderr }
}

describe('.github/scripts/conferir-alinhamento.sh', () => {
  it('é executável', () => {
    expect(statSync(CAMINHO).mode & 0o111).not.toBe(0)
  })

  it('host alinhado sai 0', () => {
    const r = conferir(alinhada())
    expect(r.stdout).toContain('host alinhado')
    expect(r.status).toBe(0)
  })

  it('compose diferente do ALVO reprova, nomeando o arquivo e apontando o runbook', () => {
    // O host tem o compose da main; o alvo pressupõe outro. É o rollback com
    // runtime diferente (spec §5.4).
    const r = conferir(
      comLinha(
        'docker-compose.prod.yml',
        `${sha256(join(main, 'docker-compose.prod.yml'))}  docker-compose.prod.yml`,
      ),
    )
    expect(r.stdout).toMatch(/^docker-compose\.prod\.yml diferente$/m)
    expect(r.stderr).toContain('deploy/aws/README.md')
    expect(r.status).toBe(1)
  })

  it('deploy.sh diferente da MAIN reprova, mesmo igual ao do alvo', () => {
    const r = conferir(
      comLinha('bin/deploy.sh', `${sha256(join(alvo, 'deploy', 'bin', 'deploy.sh'))}  bin/deploy.sh`),
    )
    expect(r.stdout).toMatch(/^bin\/deploy\.sh diferente$/m)
    expect(r.status).toBe(1)
  })

  it('tls.conf ausente no host reprova', () => {
    const r = conferir(comLinha('nginx/tls.conf', 'AUSENTE  nginx/tls.conf'))
    expect(r.stdout).toMatch(/^nginx\/tls\.conf ausente$/m)
    expect(r.status).toBe(1)
  })

  it('script da main que não está no host reprova', () => {
    const r = conferir(comLinha('bin/backup-db.sh', null))
    expect(r.stdout).toMatch(/^bin\/backup-db\.sh ausente$/m)
    expect(r.status).toBe(1)
  })

  it('chave do molde do alvo que falta no .env reprova, pelo nome', () => {
    const r = conferir(alinhada().filter((linha) => linha !== 'APP_LOCALE'))
    expect(r.stdout).toMatch(/^chave faltando: APP_LOCALE$/m)
    expect(r.stdout).not.toContain('COMENTADA')
    expect(r.status).toBe(1)
  })

  it('várias divergências saem uma por linha', () => {
    const listagem = alinhada()
      .filter((linha) => !linha.endsWith('  bin/backup-db.sh') && linha !== 'DB_HOST')
      .map((linha) => (linha.endsWith('  nginx/tls.conf') ? 'AUSENTE  nginx/tls.conf' : linha))
    const r = conferir(listagem)
    expect(r.stdout).toMatch(/^nginx\/tls\.conf ausente$/m)
    expect(r.stdout).toMatch(/^bin\/backup-db\.sh ausente$/m)
    expect(r.stdout).toMatch(/^chave faltando: DB_HOST$/m)
    expect(r.status).toBe(1)
  })

  it('script e chave a mais no host não reprovam — sobra inofensiva', () => {
    const listagem = alinhada()
    listagem.splice(5, 0, `${'0'.repeat(64)}  bin/velho.sh`)
    listagem.push('CHAVE_A_MAIS')
    const r = conferir(listagem)
    expect(r.stdout).toContain('host alinhado')
    expect(r.status).toBe(0)
  })

  it('listagem sem o marcador não prova alinhamento', () => {
    const r = conferir(alinhada().filter((linha) => linha !== '--- chaves'))
    expect(r.stderr).toContain('marcador')
    expect(r.status).toBe(1)
  })

  it('listagem vazia não prova alinhamento', () => {
    const r = conferir('')
    expect(r.stderr).toContain('marcador')
    expect(r.status).toBe(1)
  })

  it('referência que falta no alvo reprova, não passa em silêncio', () => {
    const incompleto = join(base, 'alvo-incompleto')
    escrever(join(incompleto, 'docker-compose.prod.yml'), readFileSync(join(alvo, 'docker-compose.prod.yml'), 'utf8'))
    escrever(
      join(incompleto, 'docker-compose.prod-tls.yml'),
      readFileSync(join(alvo, 'docker-compose.prod-tls.yml'), 'utf8'),
    )
    const r = conferir(alinhada(), incompleto)
    expect(r.stdout).toMatch(/^nginx\/tls\.conf sem referencia/m)
    expect(r.stdout).toMatch(/^\.env sem referencia/m)
    expect(r.status).toBe(1)
  })

  it('uso errado sai 2', () => {
    const r = spawnSync('bash', [CAMINHO, 'so-um-argumento'], { encoding: 'utf8' })
    expect(r.stderr).toContain('uso:')
    expect(r.status).toBe(2)
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd frontend && pnpm test --project repo tests/conferir-alinhamento.test.ts`
Expected: FAIL em todos — `ENOENT` no `statSync` e `status` 127 do bash (`No such file or directory`) nos demais.

- [ ] **Step 3: Implementar**

Criar `.github/scripts/conferir-alinhamento.sh`:

```bash
#!/usr/bin/env bash
#
# Confere se o host tem o que o SHA alvo pressupoe (item 31, P-87).
#
# Roda no RUNNER, nao no host: o host so devolve a listagem (hashes e nomes de
# chave, por um SSM de leitura), e quem decide e' este script versionado. Se ele
# morasse no host, seria mais um arquivo copiado a mao, sujeito ao mesmo
# defeito que mede.
#
# Duas classes, duas referencias (D2 da spec):
#   runtime   os dois composes e o nginx/tls.conf  -> arvore do SHA ALVO
#   ferramenta bin/*.sh                            -> arvore da MAIN
#   chaves    nomes do .env                        -> env.prod.example do ALVO
# Um rollback nao pode exigir o deploy.sh antigo de volta; e o compose novo nao
# pode rodar calado sobre a imagem velha.
#
# Script e chave a MAIS no host nao reprovam: nao quebram o SHA.
#
# Uso:   conferir-alinhamento.sh <listagem> <arvore-alvo> <arvore-main>
# Saida: 0 alinhado; 1 divergencia (uma linha por item) ou listagem sem o
#        marcador; 2 uso.
set -euo pipefail

if [ $# -ne 3 ]; then
  echo "uso: conferir-alinhamento.sh <listagem> <arvore-alvo> <arvore-main>" >&2
  exit 2
fi
LISTAGEM=$1
ALVO=$2
MAIN=$3

# SSM que devolveu nada nao prova alinhamento.
if ! grep -qxF -- '--- chaves' "$LISTAGEM"; then
  echo "erro: a listagem do host nao tem o marcador '--- chaves'; a leitura nao prova alinhamento" >&2
  exit 1
fi
HASHES=$(awk '$0 == "--- chaves" { exit } { print }' "$LISTAGEM")
CHAVES=$(awk 'marcador { print } $0 == "--- chaves" { marcador = 1 }' "$LISTAGEM")

DIVERGENCIAS=()

conferir() {  # <caminho no host> <referencia no checkout>
  local no_host referencia
  if [ ! -f "$2" ]; then
    DIVERGENCIAS+=("$1 sem referencia em $2")
    return
  fi
  no_host=$(awk -v c="$1" '$2 == c { print $1; exit }' <<<"$HASHES")
  referencia=$(sha256sum "$2" | cut -d' ' -f1)
  if [ -z "$no_host" ] || [ "$no_host" = AUSENTE ]; then
    DIVERGENCIAS+=("$1 ausente")
  elif [ "$no_host" != "$referencia" ]; then
    DIVERGENCIAS+=("$1 diferente")
  fi
}

conferir docker-compose.prod.yml "$ALVO/docker-compose.prod.yml"
conferir docker-compose.prod-tls.yml "$ALVO/docker-compose.prod-tls.yml"
conferir nginx/tls.conf "$ALVO/deploy/nginx/tls.conf"

for SCRIPT in "$MAIN"/deploy/bin/*.sh; do
  conferir "bin/$(basename "$SCRIPT")" "$SCRIPT"
done

MOLDE="$ALVO/deploy/aws/env.prod.example"
if [ ! -f "$MOLDE" ]; then
  DIVERGENCIAS+=(".env sem referencia em $MOLDE")
else
  while IFS= read -r CHAVE; do
    grep -qxF -- "$CHAVE" <<<"$CHAVES" || DIVERGENCIAS+=("chave faltando: $CHAVE")
  done < <(grep -oE '^[A-Za-z_][A-Za-z0-9_]*=' "$MOLDE" | tr -d '=')
fi

if [ ${#DIVERGENCIAS[@]} -gt 0 ]; then
  printf '%s\n' "${DIVERGENCIAS[@]}"
  echo "erro: o host diverge do que o SHA alvo pressupoe. Instale pelo runbook (deploy/aws/README.md, secao 7) e promova de novo." >&2
  exit 1
fi
echo "host alinhado ao SHA alvo"
```

```bash
chmod +x .github/scripts/conferir-alinhamento.sh
```

- [ ] **Step 4: Rodar e ver passar**

Run: `cd frontend && pnpm test --project repo tests/conferir-alinhamento.test.ts`
Expected: PASS, 13 testes.

Run: `git ls-files -s .github/scripts/conferir-alinhamento.sh` depois do `git add` do Step 6.
Expected: modo `100755` — o CI corporativo roda do checkout, e sem o bit o passo da Task 3 sai 126.

- [ ] **Step 5: Sondas da lição 19**

```bash
F=.github/scripts/conferir-alinhamento.sh
cp "$F" "$SCRATCH/conferir.orig"

# (a) a divergencia deixa de reprovar
python3 - "$F" <<'PY'
import sys
p = sys.argv[1]; s = open(p).read()
ancora = 'secao 7) e promova de novo." >&2\n  exit 1'
assert s.count(ancora) == 1
open(p, 'w').write(s.replace(ancora, ancora[:-1] + '0'))
PY
(cd frontend && pnpm test --project repo tests/conferir-alinhamento.test.ts)   # tem de FALHAR
cp "$SCRATCH/conferir.orig" "$F"

# (b) a listagem sem marcador deixa de reprovar
python3 - "$F" <<'PY'
import sys
p = sys.argv[1]; s = open(p).read()
ancora = 'nao prova alinhamento" >&2\n  exit 1'
assert s.count(ancora) == 1
open(p, 'w').write(s.replace(ancora, ancora[:-1] + '0'))
PY
(cd frontend && pnpm test --project repo tests/conferir-alinhamento.test.ts)   # tem de FALHAR
cp "$SCRATCH/conferir.orig" "$F"

cmp "$SCRATCH/conferir.orig" "$F" && test -x "$F"
```

Expected: (a) reprova os seis casos de divergência (`expected 0 to be 1`); (b) reprova os dois casos de marcador. O `cmp` e o `test -x` passam — `cp` sobre arquivo existente preserva o modo.

- [ ] **Step 6: Commit**

```bash
git add .github/scripts/conferir-alinhamento.sh frontend/tests/conferir-alinhamento.test.ts
git ls-files -s .github/scripts/conferir-alinhamento.sh
git commit -m "$(cat <<'EOF'
feat(cicd): script que confere o host contra o SHA alvo e a main (P-87)

Roda no runner sobre a listagem que o host devolve: runtime e chaves do
.env contra o SHA alvo, bin/*.sh contra a main. Sobra nao reprova;
listagem sem marcador reprova. A catraca executa o script sobre fixtures e
foi vista reprovar com os dois exit 1 trocados por exit 0.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: o passo de conferência no botão

**Files:**
- Modify: `.github/workflows/deploy.yml` (inserir entre o passo `Quem eu sou na AWS`, linha 95-98, e `deploy.sh no host, por SSM`, linha 100)
- Test: `frontend/tests/workflow-deploy.test.ts`

**Interfaces:**
- Consumes: `.github/scripts/conferir-alinhamento.sh <listagem> <arvore-alvo> <arvore-main>` da Task 2, lido de `main/` (checkout da `main`).
- Produces: passos `Checkout do SHA alvo` (em `alvo/`), `Checkout da main` (em `main/`) e `O host esta alinhado ao SHA alvo`, cujo heredoc `LEITURA` é o comando de leitura que a Task 4 extrai e ensaia.

- [ ] **Step 1: Escrever os testes que falham**

Em `frontend/tests/workflow-deploy.test.ts`, logo depois da definição de `semComentarios` (linha 17), acrescentar os auxiliares:

```ts
/** Posição do passo pelo nome, ou -1. */
const passo = (nome: string) => semComentarios.indexOf(`- name: ${nome}\n`)
/** Texto do passo até o próximo passo do job. */
const corpoDoPasso = (nome: string) => {
  const inicio = passo(nome)
  if (inicio === -1) return ''
  const fim = semComentarios.indexOf('\n      - ', inicio + 1)
  return semComentarios.slice(inicio, fim === -1 ? undefined : fim)
}
/** O comando que o host executa na conferência — o heredoc LEITURA. */
const leitura = semComentarios.match(/<<'LEITURA'\n([\s\S]*?)\n\s*LEITURA\n/)?.[1] ?? ''
const CONFERENCIA = 'O host esta alinhado ao SHA alvo'
```

E, no fim do `describe`, antes do `})` final:

```ts
  it('confere o host antes do deploy, depois da identidade na AWS (P-87)', () => {
    const identidade = passo('Quem eu sou na AWS')
    const conferencia = passo(CONFERENCIA)
    const deploy = passo('deploy.sh no host, por SSM')
    expect(identidade).toBeGreaterThan(-1)
    expect(conferencia).toBeGreaterThan(identidade)
    expect(deploy).toBeGreaterThan(conferencia)
  })

  it('compara com o checkout do SHA alvo e com o da main, sem credencial persistida', () => {
    expect(semComentarios).toMatch(
      /- name: Checkout do SHA alvo\n\s+uses: actions\/checkout@v4\n\s+with:\n\s+ref: \$\{\{ inputs\.sha \}\}\n\s+path: alvo\n\s+persist-credentials: false\n/,
    )
    expect(semComentarios).toMatch(
      /- name: Checkout da main\n\s+uses: actions\/checkout@v4\n\s+with:\n\s+ref: main\n\s+path: main\n\s+persist-credentials: false\n/,
    )
    for (const checkout of ['Checkout do SHA alvo', 'Checkout da main']) {
      expect(passo(checkout)).toBeGreaterThan(passo('Quem eu sou na AWS'))
      expect(passo(checkout)).toBeLessThan(passo(CONFERENCIA))
    }
  })

  it('a leitura do host não escreve nada', () => {
    expect(leitura).not.toBe('')
    expect(leitura).not.toContain('>')
    expect(leitura).not.toMatch(/\b(mv|cp|rm|install|tee|dd|truncate|chmod|chown)\b/)
    expect(leitura).not.toMatch(/sed\s+-i/)
  })

  it('a leitura cobre o runtime, os scripts e as chaves', () => {
    expect(leitura).toContain('cd /opt/lotus || exit 1')
    for (const caminho of ['docker-compose.prod.yml', 'docker-compose.prod-tls.yml', 'nginx/tls.conf', 'bin/*.sh']) {
      expect(leitura).toContain(caminho)
    }
    expect(leitura).toContain('sha256sum')
    expect(leitura).toContain('AUSENTE  ')
    expect(leitura).toContain("echo '--- chaves'")
  })

  it('do .env só sai o nome da chave, cortado no =', () => {
    const comEnv = leitura.split('\n').filter((linha) => linha.includes('.env'))
    expect(comEnv).toHaveLength(1)
    expect(comEnv[0].trim()).toBe("grep -E '^[A-Za-z_][A-Za-z0-9_]*=' .env | cut -d= -f1")
  })

  it('a leitura que não termina em Success reprova, antes de o script decidir', () => {
    const corpo = corpoDoPasso(CONFERENCIA)
    const gate = corpo.search(
      /\[\s*"\$ESTADO_LEITURA"\s*=\s*Success\s*\][\s\S]{0,80}\|\|[\s\S]{0,150}exit 1/,
    )
    expect(gate).toBeGreaterThan(-1)
    expect(gate).toBeLessThan(corpo.indexOf('conferir-alinhamento.sh'))
  })

  it('quem decide é o script da main, chamado sem nada que engula a saída', () => {
    expect(corpoDoPasso(CONFERENCIA)).toMatch(
      /^\s*main\/\.github\/scripts\/conferir-alinhamento\.sh saida-host\.txt alvo main\s*$/m,
    )
    expect(semComentarios).not.toContain('alvo/.github/scripts/')
    expect(corpoDoPasso(CONFERENCIA)).not.toMatch(/set \+e/)
  })

  it('não há escape da conferência', () => {
    const inputs = semComentarios.slice(semComentarios.indexOf('inputs:'), semComentarios.indexOf('\nconcurrency:'))
    expect([...inputs.matchAll(/^ {6}(\w+):$/gm)].map((m) => m[1])).toEqual(['sha', 'confirmar'])
    expect(corpoDoPasso(CONFERENCIA)).not.toMatch(/^\s+if:/m)
    expect(corpoDoPasso('deploy.sh no host, por SSM')).not.toMatch(/^\s+if:/m)
    expect(semComentarios).not.toContain('continue-on-error')
    expect(semComentarios).not.toMatch(/always\(\)|failure\(\)/)
  })
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd frontend && pnpm test --project repo tests/workflow-deploy.test.ts`
Expected: FAIL nos testes novos de ordem, checkout, leitura (`expected '' not to be ''`), `.env`, gate e chamada; `'não há escape da conferência'` já passa (é guarda de regressão). Os 17 testes antigos seguem verdes.

- [ ] **Step 3: Implementar**

Em `.github/workflows/deploy.yml`, entre o passo `Quem eu sou na AWS` (termina em `run: aws sts get-caller-identity`) e `- name: deploy.sh no host, por SSM`, inserir:

```yaml
      - name: Checkout do SHA alvo
        uses: actions/checkout@v4
        with:
          ref: ${{ inputs.sha }}
          path: alvo
          persist-credentials: false

      - name: Checkout da main
        uses: actions/checkout@v4
        with:
          ref: main
          path: main
          persist-credentials: false

      - name: O host esta alinhado ao SHA alvo
        env:
          INSTANCIA: ${{ secrets.AWS_INSTANCE_ID }}
        run: |
          # Item 31 (P-87). O botao promove imagens; o resto que o SHA
          # pressupoe (os dois composes, o tls.conf, as chaves do .env e os
          # scripts de bin/) chega ao host por copia, pelo runbook secao 7, e
          # nada comparava. Este passo le o host SO PARA LEITURA e compara no
          # runner, com o script da main. Divergencia reprova e o deploy nao
          # roda. Nao ha escape: o remedio e' reinstalar pela secao 7.
          # Do .env so sai o NOME da chave: o `cut -d= -f1` corta no `=`.
          cat > leitura.sh <<'LEITURA'
          cd /opt/lotus || exit 1
          for f in docker-compose.prod.yml docker-compose.prod-tls.yml nginx/tls.conf; do if [ -f "$f" ]; then sha256sum "$f"; else echo "AUSENTE  $f"; fi; done
          for f in bin/*.sh; do if [ -f "$f" ]; then sha256sum "$f"; fi; done
          echo '--- chaves'
          grep -E '^[A-Za-z_][A-Za-z0-9_]*=' .env | cut -d= -f1
          LEITURA
          # Uma linha do script por item de `commands`; o jq cuida das aspas.
          jq -Rs '{commands: (split("\n") | map(select(length > 0)))}' leitura.sh > leitura.json
          COMANDO=$(aws ssm send-command \
            --instance-ids "$INSTANCIA" \
            --document-name AWS-RunShellScript \
            --comment "conferir alinhamento para $SHA" \
            --timeout-seconds 60 \
            --parameters "file://leitura.json" \
            --query Command.CommandId --output text)
          echo "CommandId=$COMANDO"

          ESTADO_LEITURA=Pending
          # Mesmo relogio de parede do passo de deploy, com orcamento proprio:
          # a leitura leva segundos. Nome proprio de proposito -- a catraca da
          # razao com o timeout do job le a PRIMEIRA ocorrencia do orcamento
          # do deploy.
          ORCAMENTO_LEITURA=90
          FIM_LEITURA=$(( $(date +%s) + ORCAMENTO_LEITURA ))
          while [ "$(date +%s)" -lt "$FIM_LEITURA" ]; do
            ESTADO_LEITURA=$(aws ssm get-command-invocation --command-id "$COMANDO" \
              --instance-id "$INSTANCIA" --query Status --output text 2>/dev/null || echo Pending)
            case "$ESTADO_LEITURA" in Success|Failed|Cancelled|TimedOut) break ;; esac
            sleep 3
          done
          [ "$ESTADO_LEITURA" = Success ] \
            || { echo "erro: a leitura do host nao terminou em Success (estado $ESTADO_LEITURA)" >&2; exit 1; }

          aws ssm get-command-invocation --command-id "$COMANDO" --instance-id "$INSTANCIA" \
            --query StandardOutputContent --output text > saida-host.txt
          echo "----- listagem do host -----"
          cat saida-host.txt
          main/.github/scripts/conferir-alinhamento.sh saida-host.txt alvo main
```

Orçamento do job: os gates anteriores levam ~1 min, os checkouts ~20 s e a leitura até 90 s; com os 840 s do deploy, fica abaixo dos 1200 s do `timeout-minutes: 20` com folga. Não mexa no `timeout-minutes` — a catraca da razão prende os dois números.

- [ ] **Step 4: Rodar e ver passar**

Run: `cd frontend && pnpm test --project repo tests/workflow-deploy.test.ts`
Expected: PASS, 25 testes.

Conferir o YAML e o shell de verdade, não só o texto:

```bash
python3 - > "$SCRATCH/passo.sh" <<'PY'
import yaml
wf = yaml.safe_load(open('.github/workflows/deploy.yml'))
passos = wf['jobs']['promover']['steps']
print(next(p for p in passos if p.get('name') == 'O host esta alinhado ao SHA alvo')['run'])
PY
bash -n "$SCRATCH/passo.sh" && echo "sintaxe ok"
( cd "$SCRATCH" && sed -n '/^cat > leitura.sh/,/^jq /p' passo.sh > ate-jq.sh && bash ate-jq.sh && jq . leitura.json && sh -n leitura.sh && echo "leitura ok" )
```

Expected: `sintaxe ok`; o `leitura.json` com `commands` de exatamente 5 itens, iguais às linhas do heredoc sem a indentação, com `"$f"` intacto (a expansão não aconteceu no runner — o heredoc é `'LEITURA'`); `leitura ok`.

- [ ] **Step 5: Sondas da lição 19**

```bash
F=.github/workflows/deploy.yml
cp "$F" "$SCRATCH/deploy.yml.orig"

sonda() {  # <descricao> <python que recebe s e devolve s>
  python3 - "$F" "$2" <<'PY'
import sys
p, codigo = sys.argv[1], sys.argv[2]
s = open(p).read()
novo = eval(codigo, {'s': s})
assert novo != s, 'sonda nao mudou nada'
open(p, 'w').write(novo)
PY
  echo "== sonda: $1"
  (cd frontend && pnpm test --project repo tests/workflow-deploy.test.ts) && echo "!! SONDA PASSOU: $1"
  cp "$SCRATCH/deploy.yml.orig" "$F"
}

sonda 'apaga o passo' "s[:s.index('      - name: O host esta alinhado')] + s[s.index('      - name: deploy.sh no host')]"
sonda '|| true na chamada' "s.replace('saida-host.txt alvo main\n', 'saida-host.txt alvo main || true\n')"
sonda 'cat .env na leitura' "s.replace(\"          echo '--- chaves'\n\", \"          echo '--- chaves'\n          cat .env\n\")"
sonda 'gate da leitura vira aviso' "s.replace('(estado \$ESTADO_LEITURA)\" >&2; exit 1; }', '(estado \$ESTADO_LEITURA)\" >&2; exit 0; }')"

cmp "$SCRATCH/deploy.yml.orig" "$F" && echo "restaurado"
```

Expected: as quatro sondas reprovam (nenhuma linha `!! SONDA PASSOU`), cada uma num teste próprio: ordem; chamada; `.env`; gate. `restaurado` no fim.

- [ ] **Step 6: Commit**

```bash
git add .github/workflows/deploy.yml frontend/tests/workflow-deploy.test.ts
git commit -m "$(cat <<'EOF'
feat(cicd): o botao confere o host antes de promover (P-87)

Dois checkouts (SHA alvo e main) e um SSM so de leitura que devolve hashes
do runtime e de bin/*.sh e os nomes de chave do .env; o script da main
decide. Divergencia reprova e o deploy nao roda, sem escape. A catraca foi
vista reprovar com o passo apagado, com || true na chamada, com cat .env na
leitura e com o gate da leitura virado aviso.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: ensaio só de leitura contra o host real

A leitura é a mesma que o workflow vai mandar, e o comando não escreve nada — é leitura por SSH, que a sessão pode rodar. Se o classificador do auto mode barrar o `ssh`, o João roda o Step 1 e cola a saída em `$SCRATCH/saida-host.txt`.

**Files:**
- Create: `docs/superpowers/audits/2026-09-26-cicd-host-alinhado-ao-sha.md`

**Interfaces:**
- Consumes: o heredoc `LEITURA` da Task 3; o script da Task 2.
- Produces: a previsão do vermelho da Task 7 (quais linhas vão sair) e a lista do que a Task 8 reinstala.

- [ ] **Step 1: Ler o host com o comando do workflow**

```bash
python3 - > "$SCRATCH/leitura.sh" <<'PY'
import re, yaml
wf = yaml.safe_load(open('.github/workflows/deploy.yml'))
passo = next(p for p in wf['jobs']['promover']['steps'] if p.get('name') == 'O host esta alinhado ao SHA alvo')
print(re.search(r"<<'LEITURA'\n(.*?)\nLEITURA\n", passo['run'], re.S).group(1))
PY
ssh ubuntu@18.230.53.197 'sudo sh -s' < "$SCRATCH/leitura.sh" > "$SCRATCH/saida-host.txt"
grep -v -e '^[0-9a-f]\{64\}  ' -e '^AUSENTE  ' -e '^--- chaves$' "$SCRATCH/saida-host.txt" | wc -l
sed -n '1,/^--- chaves$/p' "$SCRATCH/saida-host.txt"
```

Expected: o `grep … | wc -l` dá o número de chaves; o `sed` imprime os hashes (os três de runtime e os três `bin/*.sh`) e o marcador. **Não imprima as linhas depois do marcador** — são nomes de chave, e a regra é contagem no audit.

- [ ] **Step 2: Rodar o script contra a `main` atual e contra a branch**

```bash
rm -rf "$SCRATCH/ref-main" "$SCRATCH/ref-branch" && mkdir -p "$SCRATCH/ref-main" "$SCRATCH/ref-branch"
git archive origin/main | tar -x -C "$SCRATCH/ref-main"
git archive HEAD | tar -x -C "$SCRATCH/ref-branch"

.github/scripts/conferir-alinhamento.sh "$SCRATCH/saida-host.txt" "$SCRATCH/ref-main" "$SCRATCH/ref-main"; echo "saida=$?"
.github/scripts/conferir-alinhamento.sh "$SCRATCH/saida-host.txt" "$SCRATCH/ref-branch" "$SCRATCH/ref-branch"; echo "saida=$?"
```

Expected (previsão, não premissa): contra `origin/main` (`e5ac01a9`, de onde o João reinstalou os scripts no fechamento do item 12), `host alinhado ao SHA alvo` e `saida=0`. Contra a branch, `bin/deploy.sh diferente` e `saida=1` — é o vermelho que a Task 7 vai ver ao vivo. **Qualquer outra linha é achado, não bloqueio**: registre-a no audit; ela vai aparecer também no vermelho da Task 7 (que continua valendo, porque exige `bin/deploy.sh diferente` *entre* as linhas) e entra na reinstalação da Task 8. Mostre ao João as linhas a mais antes da Task 6, para ele já separar o que reinstalar.

- [ ] **Step 3: Escrever o audit**

Criar `docs/superpowers/audits/2026-09-26-cicd-host-alinhado-ao-sha.md`:

```markdown
# Audit — `cicd-host-alinhado-ao-sha` (item 31) — 2026-09-26

> Evidência das DoD da spec
> [`2026-09-26-cicd-host-alinhado-ao-sha-design.md`](../specs/2026-09-26-cicd-host-alinhado-ao-sha-design.md).
> Do `.env` só se registra contagem de chaves, nunca nome nem valor.

## Task 4 — ensaio só de leitura

Leitura do host com o heredoc `LEITURA` extraído do `deploy.yml` da branch, por
`ssh … 'sudo sh -s'`, em <data e hora>.

| Caminho no host | sha256 (12 primeiros) |
|---|---|
| `docker-compose.prod.yml` | `<…>` |
| `docker-compose.prod-tls.yml` | `<…>` |
| `nginx/tls.conf` | `<…>` |
| `bin/backup-db.sh` | `<…>` |
| `bin/deploy.sh` | `<…>` |
| `bin/verificar-backup.sh` | `<…>` |

Chaves no `.env`: <N> (o molde de `origin/main` tem 40).

| Referência | Saída do script | Linhas |
|---|---|---|
| `origin/main` (`e5ac01a9`) | <0 ou 1> | <`host alinhado ao SHA alvo`, ou as linhas> |
| branch (`<sha curto do HEAD>`) | <0 ou 1> | <`bin/deploy.sh diferente`, e o que mais sair> |
```

Preencher os `<…>` com os valores medidos nos Steps 1 e 2 — nenhum pode ficar no arquivo commitado.

- [ ] **Step 4: Commit**

```bash
grep -n '<…>\|<data\|<N>\|<0 ou 1>\|<sha curto' docs/superpowers/audits/2026-09-26-cicd-host-alinhado-ao-sha.md && echo "!! PLACEHOLDER"
git add docs/superpowers/audits/2026-09-26-cicd-host-alinhado-ao-sha.md
git commit -m "$(cat <<'EOF'
docs(audit): ensaio da conferencia contra o host real (item 31)

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: runbook e lição 19

**Files:**
- Modify: `deploy/aws/README.md` (§7, depois do bloco de `mv` no host; §8, depois do parágrafo "O caminho normal é o botão"; §8.1, depois do primeiro parágrafo)
- Modify: `docs/README.md:127` (fim da lição 19)
- Test: `frontend/tests/repo-docs-refs.test.ts` (existente)

**Interfaces:**
- Consumes: nomes das Tasks 2 e 3 (`.github/scripts/conferir-alinhamento.sh`, passo `O host esta alinhado ao SHA alvo`).
- Produces: o texto do §7 que a Task 8 segue e que o erro do script aponta (`deploy/aws/README.md, secao 7`).

- [ ] **Step 1: §7 — o que o botão confere**

Em `deploy/aws/README.md`, logo depois do bloco que termina em `sudo mkdir -p /opt/lotus/certbot && sudo chmod 755 /opt/lotus/certbot` e do fecho do bloco de código, inserir:

```markdown
**O botão confere esta instalação antes de promover** (item 31). Um `send-command` só de leitura
lista o sha256 dos dois composes, do `nginx/tls.conf` e de cada `bin/*.sh`, e os **nomes** das
chaves do `.env` (o valor nunca sai do host). O script `.github/scripts/conferir-alinhamento.sh`
compara no runner, com duas referências: o runtime e as chaves contra o **SHA que está sendo
promovido**, e os scripts contra a **`main`**. Arquivo diferente ou ausente, ou chave do molde que
falta no `.env`, reprovam o botão antes do deploy, uma linha por item. Script ou chave **a mais**
no host não reprovam.

Duas consequências. **Todo merge que mudar `deploy/bin/*.sh` trava o botão até a reinstalação** —
os scripts vêm sempre de uma árvore na `main` atual (`git diff --quiet origin/main -- deploy/bin`
antes do `scp`). E o script de conferência **não vai para o host**: ele roda no runner a partir do
checkout da `main`, então não entra no `scp` acima.
```

- [ ] **Step 2: §8 — o passo novo e o SSH sem conferência**

Na §8, trocar o final do primeiro parágrafo, `assume a role \`lotus-deploy\` por OIDC; e manda o host rodar **este mesmo script**:`, por:

```markdown
assume a role `lotus-deploy` por OIDC; confere que o host tem o runtime e os scripts que o SHA
pressupõe (§7 — reprovou, o remédio é reinstalar pela §7 e promover de novo); e manda o host rodar
**este mesmo script**:
```

E trocar a frase `**O SSH manual é contingência**, não o caminho de todo dia: serve quando a Actions está fora do ar ou quando o rollback precisa do escape do §8.1.` por:

```markdown
**O SSH manual é contingência**, não o caminho de todo dia: serve quando a Actions está fora do ar
ou quando o rollback precisa do escape do §8.1. **Ele pula a conferência da §7**: promove com o host
como estiver. Antes de um deploy por SSH, confira à mão que o que foi instalado pela §7 é o do SHA.
```

- [ ] **Step 3: §8.1 — rollback com runtime diferente**

Na §8.1, logo depois do parágrafo que termina em `O gate decide se isso é seguro:` e da lista de dois itens que o segue, inserir antes de `**Com \`fim\` em \`"etapa":"migrate"\`…` (a cerca externa abaixo é `~~~` só para o plano poder mostrar o bloco `bash` dentro dela; no README ele entra com crases normais):

~~~markdown
**Se o runtime mudou entre o SHA rodando e o alvo, o botão recusa** nomeando o arquivo
(`docker-compose.prod.yml diferente`, por exemplo). Instale pela §7 os arquivos de runtime **do SHA
alvo** e promova de novo. O SHA do corporativo não existe no clone de desenvolvimento; a árvore de
origem vem do trailer `Source-Commit:`:

```bash
ORIGEM=$(gh api repos/Gatika-CL/lotus/commits/<sha alvo> --jq .commit.message | sed -n 's/^Source-Commit: //p')
git show "$ORIGEM:docker-compose.prod.yml"     > /tmp/docker-compose.prod.yml
git show "$ORIGEM:docker-compose.prod-tls.yml" > /tmp/docker-compose.prod-tls.yml
git show "$ORIGEM:deploy/nginx/tls.conf"       > /tmp/tls.conf
```

Depois, `scp` e `mv` como na §7. **Os scripts de `bin/` não voltam**: a referência deles é sempre
a `main`, e o `deploy.sh` atual promove um SHA antigo.
~~~

- [ ] **Step 4: Lição 19 — o par novo**

Em `docs/README.md`, no fim da linha 127 (que termina em `…e não que falha com o mecanismo desligado.`), acrescentar na mesma linha:

```markdown
 **Emenda de 2026-09-26 (item 31):** par nominal novo `.github/scripts/conferir-alinhamento.sh` ↔ `frontend/tests/conferir-alinhamento.test.ts` — o primeiro par da lição provado por **execução**: a catraca roda o script sobre fixtures e confere a saída e o código, então a sonda que troca o `exit 1` por `exit 0` reprova sem depender de nenhuma palavra do fonte.
```

- [ ] **Step 5: Rodar a catraca de refs**

Run: `cd frontend && pnpm test --project repo tests/repo-docs-refs.test.ts`
Expected: PASS — os dois paths citados na lição existem desde a Task 2.

- [ ] **Step 6: Commit**

```bash
git add deploy/aws/README.md docs/README.md
git commit -m "$(cat <<'EOF'
docs(runbook): a conferencia do botao, o SSH sem ela e o rollback com runtime diferente

Secao 7 diz o que o botao mede e que o script de conferencia nao vai ao host;
secao 8, que o SSH pula a conferencia; 8.1, como instalar o runtime do SHA
alvo pelo Source-Commit. Licao 19 ganha o par nominal do script.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: integração e espelho

**Files:** nenhum novo; evidência no audit.

**Interfaces:**
- Consumes: Tasks 1 a 5 na branch.
- Produces: o SHA sintético do corporativo com o trio no GHCR — o SHA que as Tasks 7 e 8 promovem.

- [ ] **Step 1: Suíte inteira do frontend**

```bash
cd frontend && pnpm test && pnpm lint && pnpm build
```

Expected: tudo verde. O `pnpm build` inclui o type-check de `tests/` pelo `tsconfig.node.json`.

- [ ] **Step 2: PR e merge**

```bash
git push -u origin cicd/host-alinhado-ao-sha
gh pr create --fill --base main
gh pr checks --watch
gh pr merge --merge
```

Expected: os gates verdes; o merge na `main` do pessoal.

- [ ] **Step 3: Prever a P-86**

```bash
git fetch origin
git diff --name-only --diff-filter=A f79bf993 origin/main -- backend/database/migrations/
```

Expected: a lista das migrations que a produção (`df30a6bd`, espelho de `f79bf993`, 30 migrations) ainda não tem. Vazia → a promoção da Task 8 não faz dump e a P-86 ganha nota datada (Task 8, Step 5b). Não vazia → a Task 8 fecha a P-86 (Step 5a). Registrar a previsão no audit antes do botão.

- [ ] **Step 4: Espelhar**

```bash
scripts/espelhar-corporativo.sh --simular
scripts/espelhar-corporativo.sh
```

Expected: a simulação mostra `.github/scripts/conferir-alinhamento.sh`, `.github/workflows/deploy.yml`, `deploy/bin/deploy.sh` e `frontend/tests/conferir-alinhamento.test.ts` **dentro** da árvore filtrada; `docs/` e `frontend/tests/repo-docs-refs.test.ts` **fora**. A publicação cria o commit sintético com `Source-Commit: <merge>`.

- [ ] **Step 5: CI corporativo verde com o trio**

```bash
SINTETICO=$(gh api repos/Gatika-CL/lotus/commits/main --jq .sha); echo "$SINTETICO"
gh run list --repo Gatika-CL/lotus --workflow ci.yml --commit "$SINTETICO" --event push
gh run watch --repo Gatika-CL/lotus <run id> --exit-status
```

Expected: o run de push do `$SINTETICO` termina `success`, com o job `image` publicando `lotus-app`, `lotus-web` e `lotus-clamav` — é o que o gate do botão vai exigir. A catraca nova roda lá também e passa: ela lê só `.github/scripts/`, que atravessa.

- [ ] **Step 6: Registrar**

Acrescentar ao audit a seção `## Task 6 — integração`: número da PR, SHA do merge, SHA sintético, link do run do CI corporativo e a previsão da P-86 (lista ou "nenhuma migration nova desde `f79bf993`"). Commit:

```bash
git add docs/superpowers/audits/2026-09-26-cicd-host-alinhado-ao-sha.md
git commit -m "$(cat <<'EOF'
docs(audit): integracao e espelho do item 31

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: vermelho ao vivo — DoD 4

**Quem dispara: o João.** A sessão tira a linha de base, lê o run e confere. **Não reinstale nada antes desta task** — reinstalar primeiro perde o vermelho, e ele é a prova de que o botão agora enxerga o host.

**Interfaces:**
- Consumes: `$SINTETICO` da Task 6; o host ainda com o `deploy.sh` antigo.
- Produces: o link do run vermelho no audit.

- [ ] **Step 1: Linha de base (sessão, leitura)**

```bash
ssh ubuntu@18.230.53.197 'sudo wc -l /opt/lotus/releases.jsonl; sudo tail -1 /opt/lotus/releases.jsonl; sudo cat /opt/lotus/CURRENT_SHA'
```

Expected: anotar o número de linhas, a última linha e o `CURRENT_SHA` (`df30a6bd…`).

- [ ] **Step 2: O João aperta o botão**

Em `Gatika-CL/lotus` → Actions → *Promover para producao* → `Run workflow`, com `$SINTETICO` e `PROMOVER`.

- [ ] **Step 3: Conferir o run (sessão)**

```bash
RUN=$(gh run list --repo Gatika-CL/lotus --workflow deploy.yml --limit 1 --json databaseId --jq '.[0].databaseId')
gh run view --repo Gatika-CL/lotus "$RUN" --json conclusion,jobs --jq '.conclusion, (.jobs[0].steps[] | "\(.name): \(.conclusion)")'
gh run view --repo Gatika-CL/lotus "$RUN" --log-failed | grep -E 'diferente|ausente|chave faltando|sem referencia|erro:'
```

Expected: `failure`; `O host esta alinhado ao SHA alvo: failure`; `deploy.sh no host, por SSM: skipped`; entre as linhas, `bin/deploy.sh diferente` e o `erro: o host diverge…`. Nenhuma linha de chave com valor (só `chave faltando: <NOME>`, se houver).

- [ ] **Step 4: O host não mudou (sessão, leitura)**

Rodar de novo o comando do Step 1.

Expected: mesmo número de linhas, mesma última linha, mesmo `CURRENT_SHA`.

- [ ] **Step 5: Registrar**

Seção `## Task 7 — vermelho ao vivo (DoD 4)` no audit: link do run, as linhas de divergência copiadas do log, os passos com conclusão, e a linha de base antes/depois. Commit `docs(audit): o botao recusa o host desalinhado (item 31, DoD 4)` com o trailer.

---

### Task 8: verde ao vivo e P-86 — DoD 5 e 6

**Quem reinstala e dispara: o João.** A sessão prepara os comandos, lê e confere.

**Interfaces:**
- Consumes: `$SINTETICO`; as linhas de divergência da Task 7 (tudo que elas nomearem entra na reinstalação).
- Produces: o link do run verde, o ledger e o estado da P-86 no audit.

- [ ] **Step 1: O João reinstala pela §7**

De uma árvore na `main` atual — o worktree serve, depois do `git fetch origin` da Task 6. O João roda (o `scp` escreve no host):

```bash
git diff --quiet origin/main -- deploy/bin docker-compose.prod.yml docker-compose.prod-tls.yml deploy/nginx/tls.conf && echo "arvore = main"
scp deploy/bin/deploy.sh deploy/bin/backup-db.sh deploy/bin/verificar-backup.sh ubuntu@18.230.53.197:/tmp/
```

No host (o João):

```bash
sudo mv /tmp/deploy.sh /tmp/backup-db.sh /tmp/verificar-backup.sh /opt/lotus/bin/ && sudo chmod +x /opt/lotus/bin/*.sh
```

Se a Task 7 nomeou também arquivo de runtime ou chave, o João instala esses pelo mesmo §7 (compose, overlay, `tls.conf`; chave nova no `.env` a partir do molde).

- [ ] **Step 2: Conferir antes de apertar (sessão, leitura)**

Repetir a Task 4, Steps 1 e 2, com `git archive origin/main` como alvo e `main`.

Expected: `host alinhado ao SHA alvo`, `saida=0`. Se não, voltar ao Step 1 com a linha que saiu.

- [ ] **Step 3: O João aperta o botão**

Mesmo `$SINTETICO`, `PROMOVER`.

- [ ] **Step 4: Conferir (sessão)**

```bash
RUN=$(gh run list --repo Gatika-CL/lotus --workflow deploy.yml --limit 1 --json databaseId --jq '.[0].databaseId')
gh run view --repo Gatika-CL/lotus "$RUN" --json conclusion --jq .conclusion
gh run view --repo Gatika-CL/lotus "$RUN" --log | grep -E 'host alinhado ao SHA alvo|==> DEPLOY OK|estado final'
curl -s -o /dev/null -w '%{http_code}\n' http://18.230.53.197/up
ssh ubuntu@18.230.53.197 'sudo tail -2 /opt/lotus/releases.jsonl; sudo cat /opt/lotus/CURRENT_SHA; sudo grep -c LOTUS_RELEASE_OWNER /opt/lotus/bin/deploy.sh'
```

Expected: `success`; `host alinhado ao SHA alvo`, `==> DEPLOY OK: <SINTETICO>`, `estado final: Success`; `200`; no ledger `inicio` e `fim` com `"resultado":"ok"` e `"ator":"github:<run>:<login>"`; `CURRENT_SHA` = `$SINTETICO`; `0` do grep (sai com código 1 — o esperado).

- [ ] **Step 5: P-86**

**(a) Se a linha `inicio` trouxer `migrations` não vazio:** ela traz também a chave `dump`. Conferir o objeto e pedir a verificação:

```bash
ssh ubuntu@18.230.53.197 'sudo tail -2 /opt/lotus/releases.jsonl'   # a chave do dump na linha inicio
aws s3 ls "s3://<bucket>/<chave do dump>"                            # bucket do .env, lido pelo João se preciso
```

O João roda `sudo /opt/lotus/bin/verificar-backup.sh <chave do dump>` e cola a saída. Esperado: objeto presente com tamanho > 0 e `verificar-backup.sh` aprovando. A P-86 fecha pelo gatilho dela.

**(b) Se `migrations` vier vazio** (o previsto quando o Step 3 da Task 6 deu lista vazia): a P-86 fica aberta com nota datada — "2026-09-26, item 31: o release `<SINTETICO>` não tinha migration nova; o dump segue sem deploy real".

- [ ] **Step 6: Registrar**

Seção `## Task 8 — verde ao vivo (DoD 5 e 6)` no audit: a árvore usada na reinstalação (`git rev-parse origin/main`), o que foi reinstalado, a conferência pré-botão, o link do run, as duas linhas do ledger, o `/up`, o `grep -c` e o ramo da P-86 com a evidência. Commit `docs(audit): o botao promove com o host alinhado (item 31, DoD 5 e 6)` com o trailer.

---

### Task 9: fichas — DoD 7

**Files:**
- Modify: `docs/superpowers/pendencias/abertas.md` (fichas P-86 em ~1090, P-87 em ~1107, P-88 em ~1167 — a última do arquivo)
- Modify: `docs/superpowers/pendencias/encerradas.md` (seção `## Em rastro`)
- Modify: `docs/superpowers/pendencias/README.md` (linhas 32-34 do índice e o `## Abertas (34)`)

**Interfaces:**
- Consumes: os links de run e os SHAs das Tasks 6 a 8.
- Produces: o estado final das fichas para o `/fechar-sprint`.

- [ ] **Step 1: Mover P-87 e P-88 para o rastro**

Recortar as duas fichas inteiras de `abertas.md`, do cabeçalho `## P-NN — …` até o cabeçalho seguinte (ou o fim do arquivo, no caso da P-88):

```bash
python3 - <<'PY'
import os, re
p = 'docs/superpowers/pendencias/abertas.md'
s = open(p).read()
cortadas = []
for ficha in ('P-88', 'P-87'):
    m = re.search(rf'^## {ficha} — .*?(?=^## P-|\Z)', s, re.S | re.M)
    cortadas.insert(0, m.group(0).rstrip('\n') + '\n')
    s = s[:m.start()] + s[m.end():]
open(p, 'w').write(s.rstrip('\n') + '\n')
open(os.path.join(os.environ['SCRATCH'], 'fichas-encerradas.md'), 'w').write('\n'.join(cortadas))
PY
grep -c '^## P-8[78]' docs/superpowers/pendencias/abertas.md   # 0
```

Colar o conteúdo de `$SCRATCH/fichas-encerradas.md` em `encerradas.md` sob `## Em rastro (saem no próximo \`/fechar-sprint\`)`, substituindo o parágrafo `*(nenhuma. …)*`. Cada ficha ganha, logo abaixo do cabeçalho, a linha de encerramento:

- **P-88:** `**Encerrada em 2026-09-26 (item 31).** \`DONO=gatika-cl\` literal no \`deploy.sh\`, com o \`docker login -u\` pelo mesmo dono; a catraca de \`deploy-sh.test.ts\` foi vista reprovar com \`\${LOTUS_RELEASE_OWNER:-gatika-cl}\` devolvido e com \`DONO=andred21\`; o host roda o script novo desde o run <link da Task 8> (\`grep -c LOTUS_RELEASE_OWNER\` = 0).`
- **P-87:** `**Encerrada em 2026-09-26 (item 31), pela direção (a), detectar.** O botão confere o host antes de promover (\`.github/scripts/conferir-alinhamento.sh\`, runtime e chaves contra o SHA alvo, \`bin/*.sh\` contra a \`main\`), sem escape. Recusou ao vivo com \`bin/deploy.sh diferente\` (run <link da Task 7>) e promoveu depois da reinstalação (run <link da Task 8>). O SSH segue sem conferência, declarado no runbook §8.`

O parágrafo que abria a seção vira: `*(P-87 e P-88, encerradas pelo item 31 em 2026-09-26. A **\`P-59\`**, a **\`P-75\`** e a **\`P-79\`** saíram no fechamento do item 12.)*`

- [ ] **Step 2: P-86**

- Ramo (a) da Task 8: mover a ficha para o rastro do mesmo jeito, com `**Encerrada em 2026-09-26 (item 31).** Primeiro release com migration: \`inicio\` com \`dump\` <chave>, objeto no S3, \`verificar-backup.sh\` aprovando (run <link>).`
- Ramo (b): na ficha, acrescentar a nota datada da Task 8, Step 5b, e trocar a linha **Bloco** de `cicd-host-alinhado-ao-sha` (item 31; condicional) para `—`, porque o bloco fecha sem ela. No índice, a coluna Bloco da linha P-86 vira `—`.

- [ ] **Step 3: Índice**

Em `pendencias/README.md`, remover as linhas de P-87 e P-88 (e a de P-86 no ramo (a)) da tabela "Agrupadas em bloco de execução" e ajustar `## Abertas (34)` para `## Abertas (32)` — ou `(31)` no ramo (a). Conferir a contagem pelo número de linhas `| P-` das tabelas de abertas:

```bash
awk '/^## Abertas/{a=1;next} /^## /{a=0} a&&/^\| P-/' docs/superpowers/pendencias/README.md | wc -l
grep -cE '^## P-[0-9]+' docs/superpowers/pendencias/abertas.md
```

Expected: os dois números iguais ao do cabeçalho `## Abertas (N)` — hoje os três dão 34; as fichas de `abertas.md` são cabeçalhos `## P-NN — …`.

- [ ] **Step 4: Refs e commit**

```bash
cd frontend && pnpm test --project repo tests/repo-docs-refs.test.ts && cd ..
git add docs/superpowers/pendencias/
git commit -m "$(cat <<'EOF'
docs(pendencias): P-87 e P-88 encerradas pelo item 31

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
EOF
)"
```

A integração destes commits de doc (Tasks 7 a 9) vai com o fechamento (`/fechar-sprint`), numa PR própria — `docs/` não atravessa o espelho, então não há release por trás.

---

## Handoff de execução

**executor: claude**

Este bloco roda na sessão Claude, no worktree `../lotus-infra`. As Tasks 1 a 6 e 9 são trabalho de repositório e a sessão as executa por inteiro. As Tasks 7 e 8 têm **escrita do João** — o clique no botão, a reinstalação pelo §7 e o `verificar-backup.sh` —, por decisão registrada: escrita remota em produção não passa pela sessão, que tira a linha de base, lê a saída, confere contra o esperado e escreve a evidência. A leitura por SSH da Task 4 é da sessão; se o auto mode a barrar, o João roda o comando e cola a saída.

Não há delegação ao Codex: o MCP está desconectado, e o valor do bloco está na medição contra a produção real.

**Gates por task:** cada task de código termina com a suíte do arquivo tocado verde, as sondas da lição 19 vistas reprovar e um commit próprio. O gate inline do `/executar-bloco` vale normalmente; as tasks de host param e esperam o João em vez de simular.

**Sequência obrigatória:** 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9.
- A 4 precisa do passo da 3 (é o heredoc dela que se ensaia) e do `deploy.sh` da 1 (é o que produz o `bin/deploy.sh diferente` previsto).
- A 6 antes da 7: o botão lê o `deploy.yml` da branch default do corporativo, e é o espelho que leva o passo novo lá.
- **A 7 antes da 8:** reinstalar primeiro perde o vermelho ao vivo, que é a única prova de que o botão enxerga o host.
- A 9 depois da 8: as fichas citam os dois runs.
