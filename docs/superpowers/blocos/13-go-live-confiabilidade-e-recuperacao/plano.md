# Go-live: confiabilidade e recuperação — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar a Fase A do bloco 13: o script só-leitura `deploy/bin/conferir-golive.sh` com catraca por execução, o runbook §7/§15, a emenda-proposta do ADR-14 com nota no ADR-09, a proposta à Lotus em espanhol e o encerramento da P-05.

**Architecture:** Um script bash de host no padrão de `verificar-backup.sh` (`LOTUS_BASE`, `set -euo pipefail`, `umask 077`) que lê o banco e a imagem pelos contêineres vivos do projeto `lotus` (`docker compose ps -q` + `docker exec`) e o S3 pelo `aws`, imprime uma linha por verificação e sai 1 se houver `FALHA`. A catraca `frontend/tests/conferir-golive.test.ts` executa o script de verdade com `docker` e `aws` falsos no `PATH` e um `LOTUS_BASE` temporário. Os docs (runbook, ADRs, proposta, pendências) são texto, cada um na própria task.

**Tech Stack:** bash 5, GNU coreutils (`comm`, `paste`, `date -d`), `docker compose`, `aws` CLI v2, `mysql` client dentro do contêiner `mysql`, `php` dentro do contêiner `app`; vitest 4 (`node:child_process.spawnSync`), Node 22.

**Spec:** `docs/superpowers/blocos/13-go-live-confiabilidade-e-recuperacao/spec.md` (§4 Fase A é o contrato deste plano; §5 Fase B é do João, depois do merge).

## Global Constraints

- Nenhuma mudança em PHP ou em tela (spec §3). A suíte PHP roda no fim como prova de não-regressão.
- O script é **só leitura**: nenhum `INSERT`, `UPDATE`, `DELETE`, DDL, `artisan`, `docker compose run`, `up`, `stop`, `docker run`. Só `docker compose ... ps -q` e `docker exec` em contêiner vivo (spec §4.1).
- Do `.env` o script lê **nomes** de chave e o valor de `LOTUS_BACKUP_BUCKET`. Nenhum outro valor aparece em stdout nem em stderr (spec §4.1).
- Toda verificação roda, mesmo com outra em `FALHA`. Uma linha por verificação: `OK|FALHA|AVISO|INFO <nome> <detalhe>`. Exit 1 com ao menos uma `FALHA`; senão 0 (spec §4.1).
- Leitor indisponível (`docker`/`aws` falhando, serviço fora) é `FALHA` com motivo, nunca `OK` por omissão (spec §4.1).
- Comentários do script e do fake em ASCII, sem acento (spec §4.1, padrão de `sondar-saude.sh`).
- Lição 19 (`docs/README.md`): catraca de gate ancora **comparação e saída de falha**, uma sonda por comparação. Cada Task que cria comparação lista a sonda (`|| true` ou `linha FALHA` trocado por `linha OK`) e o cenário da fixture que a reprova.
- Nomes das verificações, exatos: `migrations`, `rbac`, `dados-antigos`, `sondas-dev`, `env`, `backup`, `smoke`.
- Prefixo das sondas de produção: `SMOKE-GOLIVE`. Limite de nascimento (D-37): `2026-08-18`. Limite de idade do backup: 1 dia.
- Commits em português, tipo pelo conteúdo (`feat(13)`, `test(13)`, `docs(13)`), com a linha `Co-Authored-By` da sessão.

## Review Focus

1. **`.env` com `=` dentro do valor ou linha de comentário**: `grep '^[A-Za-z_][A-Za-z0-9_]*=' | cut -d= -f1` tem de pegar só o nome; valor com `=` (ex. `APP_KEY=base64:...=`) não pode virar chave fantasma. Teste na Task 1.
2. **Tabela de smoke vazia sem `--final`**: `SUM()` sobre conjunto vazio é `NULL`; a linha `INFO` tem de sair com zeros, não com `NULL` nem com erro de aritmética. Teste na Task 5.
3. **`mysql` de pé mas `app` fora** (ou o inverso): `migrations` e `rbac` leem os dois; cada metade indisponível sai `FALHA` nomeando qual leitor faltou, e as outras verificações seguem. Teste na Task 2.
4. **Objeto de backup com data no futuro ou `aws` devolvendo `None`**: idade negativa passa como `OK` por `-le`; `None` é `FALHA` explícita. Teste na Task 4 (o `None`); a idade negativa fica documentada como aceita (relógio do host é fonte).
5. **`--final` com dois certificados, um revogado e um não**: a comparação é "todos revogados", não "existe um revogado". Teste na Task 5.

---

## Estrutura de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `deploy/bin/conferir-golive.sh` | Criar. O script. |
| `frontend/tests/conferir-golive.test.ts` | Criar. Catraca por execução (spec §7) + catraca do runbook §7/§15. |
| `frontend/tests/fixtures/conferir-golive/docker` | Criar. `docker` falso (executável, sem extensão, para entrar no `PATH`). |
| `frontend/tests/fixtures/conferir-golive/aws` | Criar. `aws` falso. |
| `deploy/aws/README.md` | Modificar: §7 (linhas 201 e 210) e §15 novo no fim. |
| `docs/adrs.md` | Modificar: ADR-09 (depois da linha 90) e ADR-14 (depois da linha 205). |
| `docs/superpowers/blocos/13-go-live-confiabilidade-e-recuperacao/proposta-dis02.md` | Criar. Proposta em espanhol. |
| `docs/superpowers/pendencias/abertas.md`, `encerradas.md`, `README.md` | Modificar: P-05 sai de abertas e do índice, entra em encerradas. |
| `docs/README.md` | Modificar: lição 19 ganha o par nominal novo. |

Contrato comum do fake `docker` (Tasks 1–5): registra cada chamada em `$FAKE_LOG` (uma linha `---` e um argumento por linha) e responde pelos `FAKE_*`:

| Variável | Quem lê | Efeito |
|---|---|---|
| `FAKE_SEM_SERVICO=1` | `compose ps -q` | imprime vazio (serviço fora) |
| `FAKE_MYSQL_FORA=1` | `exec mysql-falso` | sai 1 |
| `FAKE_APP_FORA=1` | `exec app-falso` | sai 1 |
| `FAKE_MIGRACOES_BANCO` | consulta `FROM migrations` | arquivo, um nome por linha |
| `FAKE_MIGRACOES_CODIGO` | `exec app-falso ls` | arquivo, um `*.php` por linha |
| `FAKE_PERMS_BANCO` | consulta `FROM permissions` | arquivo |
| `FAKE_PERMS_CODIGO` | `exec app-falso php` | arquivo |
| `FAKE_ROLES` | consulta `FROM roles` | nomes separados por espaço |
| `FAKE_SUPERADMIN_N` | consulta `role_has_permissions` | número |
| `FAKE_DADOS_ANTIGOS` | consulta `MIN(created_at)` | arquivo `tabela<TAB>min` |
| `FAKE_SONDAS_N` | consulta `FROM users WHERE email` | número |
| `FAKE_SMOKE` | consulta `'certificados'` | arquivo `nome<TAB>total<TAB>vivos` |

Contrato do fake `aws`: `FAKE_AWS_FORA=1` sai 255; `FAKE_ULTIMO_BACKUP` é o `LastModified` devolvido (default `None`).

---

### Task 1: Esqueleto do script, fakes, verificação `env` e as catracas transversais

**Files:**
- Create: `deploy/bin/conferir-golive.sh`
- Create: `frontend/tests/fixtures/conferir-golive/docker`
- Create: `frontend/tests/fixtures/conferir-golive/aws`
- Test: `frontend/tests/conferir-golive.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces: no script, `linha <ESTADO> <nome> <detalhe>`, `chave <NOME>`, `sql "<consulta>"`, `no_app <cmd...>`, `$MYSQL`, `$APP`, `$FINAL`, `$FALHAS`, `CHAVES_ESPERADAS`, `LIMITE_NASCIMENTO`, `LIMITE_BACKUP_DIAS`; no teste, `cenarioBom()`, `rodar(env, args)`, `porNome(saida)`, `NOMES` (cresce por task), `chamadas(log)`, `reprovaSo(e, nome)`, `arquivo(dir, nome, linhas)`, `horasAtras(h)`.

- [ ] **Step 1: Criar os dois fakes**

`frontend/tests/fixtures/conferir-golive/docker`:

```bash
#!/usr/bin/env bash
#
# `docker` de mentira do frontend/tests/conferir-golive.test.ts. Registra cada
# chamada em $FAKE_LOG (uma linha `---` e um argumento por linha) e responde o
# minimo que o deploy/bin/conferir-golive.sh le. Os FAKE_* escolhem o cenario.
# A consulta SQL chega por `-e CONSULTA=...`, como o script a envia.
{
  printf '%s\n' '---'
  printf '%s\n' "$@"
} >> "$FAKE_LOG"

sub="${1:-}"
case "$sub" in
  compose)
    [ "${FAKE_SEM_SERVICO:-}" != 1 ] || exit 0
    case " $* " in
      *" ps -q mysql "*) echo mysql-falso ;;
      *" ps -q app "*) echo app-falso ;;
      *) echo "docker falso: compose sem resposta para: $*" >&2; exit 1 ;;
    esac
    ;;
  exec)
    shift
    consulta=''
    alvo=''
    while [ $# -gt 0 ]; do
      case "$1" in
        -e) consulta="${2#CONSULTA=}"; shift 2 ;;
        -*) shift ;;
        *) alvo="$1"; shift; break ;;
      esac
    done
    case "$alvo" in
      mysql-falso)
        [ "${FAKE_MYSQL_FORA:-}" != 1 ] || exit 1
        case "$consulta" in
          *"FROM migrations"*) cat "$FAKE_MIGRACOES_BANCO" ;;
          *"FROM permissions"*) cat "$FAKE_PERMS_BANCO" ;;
          *"FROM roles"*) tr ' ' '\n' <<< "$FAKE_ROLES" ;;
          *"role_has_permissions"*) echo "$FAKE_SUPERADMIN_N" ;;
          *"MIN(created_at)"*) cat "$FAKE_DADOS_ANTIGOS" ;;
          *"FROM users WHERE email"*) echo "$FAKE_SONDAS_N" ;;
          *"'certificados'"*) cat "$FAKE_SMOKE" ;;
          *) echo "docker falso: consulta sem resposta: $consulta" >&2; exit 1 ;;
        esac
        ;;
      app-falso)
        [ "${FAKE_APP_FORA:-}" != 1 ] || exit 1
        case " $* " in
          *" ls "*) cat "$FAKE_MIGRACOES_CODIGO" ;;
          *" php "*) cat "$FAKE_PERMS_CODIGO" ;;
          *) echo "docker falso: comando no app sem resposta: $*" >&2; exit 1 ;;
        esac
        ;;
      *) echo "docker falso: alvo desconhecido: $alvo" >&2; exit 1 ;;
    esac
    ;;
  *) echo "docker falso: subcomando nao previsto: $sub" >&2; exit 1 ;;
esac
```

`frontend/tests/fixtures/conferir-golive/aws`:

```bash
#!/usr/bin/env bash
#
# `aws` de mentira do frontend/tests/conferir-golive.test.ts. Registra a chamada
# em $FAKE_LOG e devolve o LastModified que o cenario pede.
{
  printf '%s\n' '---'
  printf '%s\n' "$@"
} >> "$FAKE_LOG"

[ "${FAKE_AWS_FORA:-}" != 1 ] || { echo 'Unable to locate credentials' >&2; exit 255; }

case " $* " in
  *" s3api list-objects-v2 "*) echo "${FAKE_ULTIMO_BACKUP:-None}" ;;
  *) echo "aws falso: nao previsto: $*" >&2; exit 1 ;;
esac
```

Run: `chmod +x frontend/tests/fixtures/conferir-golive/docker frontend/tests/fixtures/conferir-golive/aws`

- [ ] **Step 2: Escrever o teste com os helpers e os casos desta task**

`frontend/tests/conferir-golive.test.ts`:

```ts
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

/**
 * `deploy/bin/conferir-golive.sh` é a linha de base e a rede final do go-live
 * (bloco 13, spec §4.1): sete verificações só de leitura sobre a produção, uma
 * linha cada, exit 1 com qualquer FALHA. As falhas que importam são silenciosas
 * — um leitor fora saindo OK, uma comparação apagada, um valor do `.env` indo
 * parar na saída — e nenhuma quebra o `bash -n`.
 *
 * Por EXECUÇÃO (lição 19): cada caso roda o script de verdade com `docker` e
 * `aws` falsos no PATH (fixtures/conferir-golive/) e um LOTUS_BASE temporário.
 * Cada comparação do script tem o cenário que a faz reprovar sozinha, então
 * trocar `linha FALHA` por `linha OK` em qualquer uma reprova esta suíte.
 */
const RAIZ = resolve(__dirname, '..', '..')
const CAMINHO = join(RAIZ, 'deploy', 'bin', 'conferir-golive.sh')
const FAKES = join(__dirname, 'fixtures', 'conferir-golive')
const SCRIPT = readFileSync(CAMINHO, 'utf8')
const semComentarios = SCRIPT.split(/\r?\n/)
  .filter((linha) => !/^\s*#/.test(linha))
  .join('\n')

/**
 * As verificações que o script já tem. Cresce uma task por vez (Tasks 2–5)
 * até as sete da spec: migrations, rbac, dados-antigos, sondas-dev, env,
 * backup, smoke. A "fixture boa" e o `reprovaSo` exigem exatamente esta lista.
 */
const NOMES: string[] = ['env']
const SENTINELA = 'SENTINELA-NAO-VAZAR-9f3a'

const ATRIBUICAO = /^[A-Za-z_][A-Za-z0-9_]*=/
const CHAVES_MOLDE = readFileSync(join(RAIZ, 'deploy', 'aws', 'env.prod.example'), 'utf8')
  .split(/\r?\n/)
  .filter((l) => ATRIBUICAO.test(l))
  .map((l) => l.slice(0, l.indexOf('=')))

let base: string
let contador = 0

beforeAll(() => {
  base = mkdtempSync(join(tmpdir(), 'conferir-golive-'))
})

afterAll(() => {
  rmSync(base, { recursive: true, force: true })
})

type Execucao = { status: number | null; stdout: string; stderr: string; log: string }
type Linha = { estado: string; detalhe: string }

/** Escreve um arquivo de fixture no diretório do caso e devolve o caminho. */
const arquivo = (dir: string, nome: string, linhas: string[]): string => {
  const caminho = join(dir, nome)
  writeFileSync(caminho, linhas.length === 0 ? '' : linhas.join('\n') + '\n')
  return caminho
}

const horasAtras = (horas: number): string => new Date(Date.now() - horas * 3600_000).toISOString()

/**
 * Cenário em que tudo passa: `.env` com todas as chaves do molde (e uma
 * sentinela como senha), banco igual ao código, nenhum dado antigo, nenhuma
 * sonda, backup de 2 horas, smoke vazio. Cada caso estraga UMA coisa.
 */
const cenarioBom = (): { env: Record<string, string>; dir: string } => {
  contador += 1
  const dir = join(base, `caso-${contador}`)
  const lotus = join(dir, 'lotus')
  mkdirSync(lotus, { recursive: true })
  writeFileSync(
    join(lotus, '.env'),
    CHAVES_MOLDE.map((k) => (k === 'DB_PASSWORD' ? `${k}=${SENTINELA}` : k === 'APP_KEY' ? `${k}=base64:${SENTINELA}==` : `${k}=valor-${k.toLowerCase()}`)).join('\n') + '\n',
  )
  writeFileSync(join(lotus, 'docker-compose.prod.yml'), 'services: {}\n')
  const migracoes = ['0001_01_01_000000_create_users_table', '2026_08_05_100000_certificates']
  const perms = ['identity.user.view', 'identity.user.create', 'certification.certificate.revoke']
  const env: Record<string, string> = {
    LOTUS_BASE: lotus,
    FAKE_LOG: join(dir, 'chamadas.log'),
    FAKE_MIGRACOES_BANCO: arquivo(dir, 'migracoes-banco', migracoes),
    FAKE_MIGRACOES_CODIGO: arquivo(dir, 'migracoes-codigo', migracoes.map((m) => `${m}.php`)),
    FAKE_PERMS_BANCO: arquivo(dir, 'perms-banco', perms),
    FAKE_PERMS_CODIGO: arquivo(dir, 'perms-codigo', perms),
    FAKE_ROLES: 'admin redator superadmin',
    FAKE_SUPERADMIN_N: String(perms.length),
    FAKE_DADOS_ANTIGOS: arquivo(dir, 'dados-antigos', [
      'client_addresses\t-', 'client_contacts\t-', 'users\t2026-09-10 12:00:00', 'course_modules\t-',
      'course_certificate_templates\t-', 'quotes\t-', 'files\t-', 'enrollments\t-',
    ]),
    FAKE_SONDAS_N: '0',
    FAKE_ULTIMO_BACKUP: horasAtras(2),
    FAKE_SMOKE: arquivo(dir, 'smoke', ['certificados\t0\t0', 'clientes\t0\t0', 'cursos\t0\t0', 'turmas\t0\t0', 'alunos\t0\t0']),
  }
  return { env, dir }
}

/** Roda o script com os fakes na frente do PATH. */
const rodar = (env: Record<string, string>, args: string[] = []): Execucao => {
  const r = spawnSync('bash', [CAMINHO, ...args], {
    env: { ...process.env, ...env, PATH: `${FAKES}:${process.env.PATH ?? ''}` },
    encoding: 'utf8',
  })
  let log = ''
  try {
    log = readFileSync(env.FAKE_LOG, 'utf8')
  } catch {
    log = ''
  }
  return { status: r.status, stdout: r.stdout, stderr: r.stderr, log }
}

/** Uma entrada por verificação: `OK|FALHA|AVISO|INFO <nome> <detalhe>`. */
const porNome = (saida: string): Record<string, Linha> => {
  const mapa: Record<string, Linha> = {}
  for (const l of saida.split('\n').filter(Boolean)) {
    const m = /^(OK|FALHA|AVISO|INFO) (\S+) (.*)$/.exec(l)
    if (m === null) throw new Error(`linha fora do formato: ${l}`)
    if (mapa[m[2]] !== undefined) throw new Error(`verificacao repetida: ${m[2]}`)
    mapa[m[2]] = { estado: m[1], detalhe: m[3] }
  }
  return mapa
}

/** Cada chamada registrada pelos fakes, como lista de argumentos. */
const chamadas = (log: string): string[][] =>
  log.split('---\n').filter(Boolean).map((bloco) => bloco.split('\n').filter(Boolean))

/** Reprova só `nome`, com todas as outras ainda rodando. */
const reprovaSo = (e: Execucao, nome: string): Linha => {
  const mapa = porNome(e.stdout)
  expect(Object.keys(mapa).sort()).toEqual([...NOMES].sort())
  expect(e.status).toBe(1)
  for (const n of NOMES) if (n !== nome) expect(mapa[n].estado).not.toBe('FALHA')
  expect(mapa[nome].estado).toBe('FALHA')
  return mapa[nome]
}

describe('deploy/bin/conferir-golive.sh — forma', () => {
  it('é executável e falha alto', () => {
    expect(statSync(CAMINHO).mode & 0o111).not.toBe(0)
    expect(semComentarios).toMatch(/^set -euo pipefail$/m)
    expect(semComentarios).toMatch(/^umask 077$/m)
  })

  it('a lista embutida de chaves é igual às chaves de deploy/aws/env.prod.example', () => {
    const m = /^CHAVES_ESPERADAS="([^"]+)"$/m.exec(semComentarios)
    expect(m).not.toBeNull()
    const embutidas = (m as RegExpExecArray)[1].trim().split(/\s+/)
    expect([...embutidas].sort()).toEqual([...CHAVES_MOLDE].sort())
  })
})

describe('deploy/bin/conferir-golive.sh — fixture boa', () => {
  it('sai 0 com uma linha por verificação e nenhuma FALHA', () => {
    const e = rodar(cenarioBom().env)
    expect(e.status).toBe(0)
    const mapa = porNome(e.stdout)
    expect(Object.keys(mapa).sort()).toEqual([...NOMES].sort())
    for (const n of NOMES) expect(mapa[n].estado).not.toBe('FALHA')
  })

  it('nenhum valor do .env aparece na saída, nem com todos os leitores fora', () => {
    const bom = rodar(cenarioBom().env)
    expect(bom.stdout + bom.stderr).not.toContain(SENTINELA)
    const ruim = rodar({ ...cenarioBom().env, FAKE_MYSQL_FORA: '1', FAKE_APP_FORA: '1', FAKE_AWS_FORA: '1' })
    expect(ruim.stdout + ruim.stderr).not.toContain(SENTINELA)
    expect(ruim.log).not.toContain(SENTINELA)
  })

  it('não emite nenhum comando de escrita: só compose ps e docker exec, e nenhum SQL que escreva', () => {
    const e = rodar(cenarioBom().env)
    for (const args of chamadas(e.log)) {
      expect(args[0]).toMatch(/^(compose|exec|s3api)$/)
      if (args[0] === 'compose') {
        expect(args).toContain('ps')
        for (const proibido of ['run', 'up', 'down', 'stop', 'start', 'restart', 'exec']) expect(args).not.toContain(proibido)
      }
      const junto = args.join(' ')
      expect(junto).not.toMatch(/\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE|REPLACE)\b/i)
      expect(junto).not.toContain('artisan')
    }
    expect(semComentarios).not.toMatch(/docker run\b/)
    expect(semComentarios).not.toMatch(/\bartisan\b/)
  })
})

describe('deploy/bin/conferir-golive.sh — env', () => {
  it('chave da lista faltando no .env → FALHA nomeando a chave', () => {
    const { env } = cenarioBom()
    const semMail = CHAVES_MOLDE.filter((k) => k !== 'MAIL_MAILER').map((k) => `${k}=x`)
    writeFileSync(join(env.LOTUS_BASE, '.env'), semMail.join('\n') + '\n')
    const l = reprovaSo(rodar(env), 'env')
    expect(l.detalhe).toContain('MAIL_MAILER')
  })

  it('chave a mais sai AVISO, não FALHA, e o script sai 0', () => {
    const { env } = cenarioBom()
    writeFileSync(join(env.LOTUS_BASE, '.env'), CHAVES_MOLDE.map((k) => `${k}=x`).concat('EXTRA_DO_HOST=1').join('\n') + '\n')
    const e = rodar(env)
    expect(e.status).toBe(0)
    const l = porNome(e.stdout).env
    expect(l.estado).toBe('AVISO')
    expect(l.detalhe).toContain('EXTRA_DO_HOST')
  })

  it('valor com `=` e linha de comentário não viram chave', () => {
    const { env } = cenarioBom()
    writeFileSync(
      join(env.LOTUS_BASE, '.env'),
      ['# comentario=nao-e-chave', ...CHAVES_MOLDE.map((k) => (k === 'APP_KEY' ? `${k}=base64:abc==` : `${k}=x`))].join('\n') + '\n',
    )
    const e = rodar(env)
    expect(porNome(e.stdout).env.estado).toBe('OK')
  })

  it('.env ilegível → FALHA', () => {
    const { env } = cenarioBom()
    rmSync(join(env.LOTUS_BASE, '.env'))
    const l = reprovaSo(rodar(env), 'env')
    expect(l.detalhe).toContain('.env')
  })
})
```

A lista de migrations da fixture é **inventada** (duas entradas), não a do repositório: a comparação do script é conjunto × conjunto, e a catraca testa a comparação, não o repositório.

- [ ] **Step 3: Rodar o teste e vê-lo reprovar**

Run: `cd frontend && pnpm vitest run tests/conferir-golive.test.ts`
Expected: FAIL — `ENOENT ... deploy/bin/conferir-golive.sh` no `readFileSync` do topo.

- [ ] **Step 4: Escrever o script com o esqueleto e a verificação `env`**

`deploy/bin/conferir-golive.sh`:

```bash
#!/usr/bin/env bash
#
# Conferencia de go-live (bloco 13, spec secao 4.1). So leitura: le o banco e a
# imagem pelos conteineres vivos do projeto `lotus` (compose ps -q + docker
# exec) e o S3 pelo aws. Nunca sobe conteiner, nunca escreve no banco, nunca
# chama artisan.
#
# Uso no host: sudo /opt/lotus/bin/conferir-golive.sh [--final]
#
# Uma linha por verificacao: OK|FALHA|AVISO|INFO <nome> <detalhe>. Todas rodam,
# mesmo com outra em FALHA. Sai 1 com ao menos uma FALHA; senao 0. Leitor
# indisponivel (mysql fora, app fora, aws sem credencial) e FALHA com o motivo,
# nunca OK por omissao.
#
# Do .env saem so os NOMES das chaves e o valor de LOTUS_BACKUP_BUCKET. Nenhum
# outro valor aparece na saida nem em erro: toda saida de mysql/docker/aws vai
# para /dev/null, e o script nunca faz `source` do .env.
#
# Sem --final, `smoke` e INFO. Com --final, e a rede do passo 8 do runbook
# secao 15: certificado SMOKE-GOLIVE revogado, cliente e curso arquivados,
# turma e aluno presentes.
set -euo pipefail
umask 077

# Mesmo gancho do verificar-backup.sh: a catraca aponta LOTUS_BASE para um
# diretorio temporario e poe docker/aws falsos no PATH.
BASE="${LOTUS_BASE:-/opt/lotus}"
FINAL=0
for arg in "$@"; do
  case "$arg" in
    --final) FINAL=1 ;;
    *) echo "uso: $0 [--final]" >&2; exit 2 ;;
  esac
done

# Chaves que o .env de producao precisa ter. Lista embutida porque o molde
# deploy/aws/env.prod.example nao vai ao host; a catraca prende os dois.
CHAVES_ESPERADAS="APP_NAME APP_ENV APP_KEY APP_DEBUG APP_URL APP_LOCALE APP_FALLBACK_LOCALE LOG_CHANNEL LOG_LEVEL DB_CONNECTION DB_HOST DB_PORT DB_DATABASE DB_USERNAME DB_PASSWORD MYSQL_DATABASE MYSQL_ROOT_PASSWORD SESSION_DRIVER SESSION_DOMAIN SESSION_LIFETIME SESSION_ENCRYPT SESSION_PATH SESSION_SAME_SITE SESSION_SECURE_COOKIE CACHE_STORE QUEUE_CONNECTION FRONTEND_URL SANCTUM_STATEFUL_DOMAINS CERTIFICATE_VALIDATION_URL FILESYSTEM_DISK AWS_DEFAULT_REGION AWS_BUCKET AWS_USE_PATH_STYLE_ENDPOINT LOTUS_BACKUP_BUCKET LOTUS_ALERT_TOPIC_ARN MAIL_MAILER MAIL_FROM_ADDRESS MAIL_FROM_NAME CERTIFICATE_ISSUER_NAME CERTIFICATE_ISSUER_RUT"

# D-37: a coluna archived_with_parent nasceu em 2026-08-18; registro anterior
# so pode ter vindo de importacao do dev.
LIMITE_NASCIMENTO="2026-08-18"
# Backup diario as 06:10 UTC: mais de 1 dia e noite falhada.
LIMITE_BACKUP_DIAS=1

FALHAS=0
# linha <ESTADO> <nome> <detalhe>: a unica porta de saida das verificacoes.
linha() {
  [ "$1" != FALHA ] || FALHAS=$((FALHAS + 1))
  printf '%s %s %s\n' "$1" "$2" "$3"
}

# Le UM valor do .env, so para LOTUS_BACKUP_BUCKET. O `|| true` e porque grep
# sem match sai 1 e o pipefail mataria o script aqui.
chave() { grep -E "^$1=" "$BASE/.env" 2>/dev/null | cut -d= -f2- || true; }

compose() {
  docker compose -p lotus --project-directory "$BASE" -f "$BASE/docker-compose.prod.yml" "$@"
}
MYSQL=$(compose ps -q mysql 2>/dev/null || true)
APP=$(compose ps -q app 2>/dev/null || true)

# sql <consulta>: roda no conteiner mysql vivo, saida -N -B (sem cabecalho,
# tab). A consulta vai por variavel de ambiente para nao passar por nenhum
# shell intermediario. stderr vai fora: e onde o mysql reclamaria da senha.
sql() {
  [ -n "$MYSQL" ] || return 1
  docker exec -e CONSULTA="$1" "$MYSQL" sh -c \
    'exec mysql -N -B -uroot -p"$MYSQL_ROOT_PASSWORD" -e "$CONSULTA" "$MYSQL_DATABASE"' 2>/dev/null
}

# no_app <comando...>: roda no conteiner app vivo (exec, nunca run).
no_app() {
  [ -n "$APP" ] || return 1
  docker exec "$APP" "$@" 2>/dev/null
}

conferir_env() {
  local presentes esperadas faltam sobram
  if [ ! -r "$BASE/.env" ]; then
    linha FALHA env "$BASE/.env ilegivel"
    return
  fi
  presentes=$(grep -E '^[A-Za-z_][A-Za-z0-9_]*=' "$BASE/.env" | cut -d= -f1 | sort -u || true)
  esperadas=$(tr ' ' '\n' <<< "$CHAVES_ESPERADAS" | sort -u)
  faltam=$(comm -13 <(printf '%s\n' "$presentes") <(printf '%s\n' "$esperadas") | paste -sd, -)
  sobram=$(comm -23 <(printf '%s\n' "$presentes") <(printf '%s\n' "$esperadas") | paste -sd, -)
  if [ -n "$faltam" ]; then
    linha FALHA env "faltam: $faltam"
  elif [ -n "$sobram" ]; then
    linha AVISO env "chaves a mais (nao previstas no molde): $sobram"
  else
    linha OK env "$(wc -l <<< "$esperadas" | tr -d ' ') chaves presentes"
  fi
}

conferir_env

exit $(( FALHAS > 0 ? 1 : 0 ))
```

Run: `chmod +x deploy/bin/conferir-golive.sh`

- [ ] **Step 5: Rodar o teste e ver passar**

Run: `cd frontend && pnpm vitest run tests/conferir-golive.test.ts`
Expected: todos PASS — com `NOMES = ['env']`, a fixture boa e os casos de `env` já fecham.

- [ ] **Step 6: Sondas da lição 19**

Troque `linha FALHA env "faltam: $faltam"` por `linha OK env ...` → o caso "chave da lista faltando" reprova. Troque `linha AVISO env` por `linha OK env` → o caso "chave a mais" reprova. Troque `linha FALHA env "$BASE/.env ilegivel"` por `linha OK` → o caso ".env ilegível" reprova. Desfaça as três.

- [ ] **Step 7: Lint e commit**

Run: `cd frontend && pnpm lint && pnpm vitest run tests/conferir-golive.test.ts`
Expected: lint limpo; os casos não-skip PASS.

```bash
git add deploy/bin/conferir-golive.sh frontend/tests/conferir-golive.test.ts frontend/tests/fixtures/conferir-golive/docker frontend/tests/fixtures/conferir-golive/aws
git commit -m "feat(13): conferir-golive.sh — esqueleto, fakes e verificacao env"
```

---

### Task 2: Verificações `migrations` e `rbac`

**Files:**
- Modify: `deploy/bin/conferir-golive.sh` (antes da linha `conferir_env`)
- Test: `frontend/tests/conferir-golive.test.ts`

**Interfaces:**
- Consumes: `linha`, `sql`, `no_app`, `cenarioBom`, `rodar`, `porNome`, `reprovaSo` (Task 1).
- Produces: funções `conferir_migrations`, `conferir_rbac`.

- [ ] **Step 1: Escrever os casos**

Em `frontend/tests/conferir-golive.test.ts`, `NOMES` passa a `['migrations', 'rbac', 'env']`. Acrescente ao fim do arquivo:

```ts
describe('deploy/bin/conferir-golive.sh — migrations', () => {
  it('migration só no código → FALHA listando-a', () => {
    const { env, dir } = cenarioBom()
    env.FAKE_MIGRACOES_CODIGO = arquivo(dir, 'migracoes-codigo-2', [
      '0001_01_01_000000_create_users_table.php', '2026_08_05_100000_certificates.php', '2026_12_01_000000_nova.php',
    ])
    const l = reprovaSo(rodar(env), 'migrations')
    expect(l.detalhe).toContain('so-no-codigo: 2026_12_01_000000_nova')
  })

  it('migration só no banco → FALHA listando-a', () => {
    const { env, dir } = cenarioBom()
    env.FAKE_MIGRACOES_BANCO = arquivo(dir, 'migracoes-banco-2', [
      '0001_01_01_000000_create_users_table', '2026_08_05_100000_certificates', '2026_07_01_000000_sumiu',
    ])
    const l = reprovaSo(rodar(env), 'migrations')
    expect(l.detalhe).toContain('so-no-banco: 2026_07_01_000000_sumiu')
  })

  it('OK imprime as duas contagens', () => {
    const e = rodar(cenarioBom().env)
    expect(porNome(e.stdout).migrations).toEqual({ estado: 'OK', detalhe: 'banco=2 codigo=2' })
  })

  it('mysql fora → FALHA em migrations e rbac nomeando o mysql; env segue', () => {
    const e = rodar({ ...cenarioBom().env, FAKE_MYSQL_FORA: '1' })
    const mapa = porNome(e.stdout)
    expect(e.status).toBe(1)
    expect(Object.keys(mapa).sort()).toEqual([...NOMES].sort())
    expect(mapa.migrations).toEqual({ estado: 'FALHA', detalhe: 'leitor indisponivel: mysql' })
    expect(mapa.rbac).toEqual({ estado: 'FALHA', detalhe: 'leitor indisponivel: mysql' })
    expect(mapa.env.estado).toBe('OK')
  })

  it('serviço mysql fora do compose (ps -q vazio) → mesma FALHA', () => {
    const e = rodar({ ...cenarioBom().env, FAKE_SEM_SERVICO: '1' })
    const mapa = porNome(e.stdout)
    expect(mapa.migrations.estado).toBe('FALHA')
    expect(mapa.rbac.estado).toBe('FALHA')
    expect(mapa.env.estado).toBe('OK')
  })

  it('app fora → FALHA em migrations e rbac nomeando o app; o resto segue', () => {
    const e = rodar({ ...cenarioBom().env, FAKE_APP_FORA: '1' })
    const mapa = porNome(e.stdout)
    expect(mapa.migrations).toEqual({ estado: 'FALHA', detalhe: 'leitor indisponivel: app' })
    expect(mapa.rbac).toEqual({ estado: 'FALHA', detalhe: 'leitor indisponivel: app' })
    expect(mapa.env.estado).toBe('OK')
  })
})

describe('deploy/bin/conferir-golive.sh — rbac', () => {
  it('permissão no catálogo e não no banco → FALHA listando-a', () => {
    const { env, dir } = cenarioBom()
    env.FAKE_PERMS_CODIGO = arquivo(dir, 'perms-codigo-2', ['identity.user.view', 'identity.user.create', 'certification.certificate.revoke', 'nova.perm'])
    const l = reprovaSo(rodar(env), 'rbac')
    expect(l.detalhe).toContain('so-no-codigo: nova.perm')
  })

  it('permissão no banco e não no catálogo → FALHA listando-a', () => {
    const { env, dir } = cenarioBom()
    env.FAKE_PERMS_BANCO = arquivo(dir, 'perms-banco-2', ['identity.user.view', 'identity.user.create', 'certification.certificate.revoke', 'velha.perm'])
    const l = reprovaSo(rodar(env), 'rbac')
    expect(l.detalhe).toContain('so-no-banco: velha.perm')
  })

  it('role de sistema ausente → FALHA nomeando-a', () => {
    const env = { ...cenarioBom().env, FAKE_ROLES: 'admin superadmin' }
    const l = reprovaSo(rodar(env), 'rbac')
    expect(l.detalhe).toContain('roles ausentes: redator')
  })

  it('superadmin sem todas as permissões → FALHA com as contagens', () => {
    const env = { ...cenarioBom().env, FAKE_SUPERADMIN_N: '2' }
    const l = reprovaSo(rodar(env), 'rbac')
    expect(l.detalhe).toContain('superadmin tem 2 de 3')
  })

  it('OK imprime contagem e roles', () => {
    const e = rodar(cenarioBom().env)
    expect(porNome(e.stdout).rbac).toEqual({ estado: 'OK', detalhe: '3 permissoes; roles admin,redator,superadmin; superadmin com todas' })
  })
})
```

- [ ] **Step 2: Ver reprovar**

Run: `cd frontend && pnpm vitest run tests/conferir-golive.test.ts`
Expected: FAIL — `porNome` não encontra `migrations`/`rbac` (`Cannot read properties of undefined`).

- [ ] **Step 3: Implementar as duas verificações**

Insira em `deploy/bin/conferir-golive.sh`, logo antes de `conferir_env() {`:

```bash
# Tabela migrations x basenames de database/migrations/*.php na imagem viva.
conferir_migrations() {
  local banco codigo so_banco so_codigo
  if ! banco=$(sql "SELECT migration FROM migrations" | sort); then
    linha FALHA migrations "leitor indisponivel: mysql"
    return
  fi
  if ! codigo=$(no_app ls /var/www/database/migrations | sed 's/\.php$//' | sort); then
    linha FALHA migrations "leitor indisponivel: app"
    return
  fi
  so_banco=$(comm -23 <(printf '%s\n' "$banco") <(printf '%s\n' "$codigo") | paste -sd, -)
  so_codigo=$(comm -13 <(printf '%s\n' "$banco") <(printf '%s\n' "$codigo") | paste -sd, -)
  if [ -n "$so_banco" ] || [ -n "$so_codigo" ]; then
    linha FALHA migrations "so-no-banco: ${so_banco:--} so-no-codigo: ${so_codigo:--}"
  else
    linha OK migrations "banco=$(wc -l <<< "$banco" | tr -d ' ') codigo=$(wc -l <<< "$codigo" | tr -d ' ')"
  fi
}

# permissions x PermissionCatalog::descriptions(); tres roles; superadmin com todas.
# O catalogo e um array literal: o autoload do composer basta, sem boot do Laravel.
conferir_rbac() {
  local banco codigo roles n_super n_codigo so_banco so_codigo faltam
  if ! banco=$(sql "SELECT name FROM permissions WHERE guard_name = 'web'" | sort); then
    linha FALHA rbac "leitor indisponivel: mysql"
    return
  fi
  if ! codigo=$(no_app php -r 'require "/var/www/vendor/autoload.php"; foreach (array_keys(App\Domains\Identity\Support\PermissionCatalog::descriptions()) as $n) { echo $n, "\n"; }' | sort); then
    linha FALHA rbac "leitor indisponivel: app"
    return
  fi
  if ! roles=$(sql "SELECT name FROM roles WHERE guard_name = 'web' ORDER BY name" | sort); then
    linha FALHA rbac "leitor indisponivel: mysql"
    return
  fi
  if ! n_super=$(sql "SELECT COUNT(*) FROM role_has_permissions rhp JOIN roles r ON r.id = rhp.role_id WHERE r.name = 'superadmin' AND r.guard_name = 'web'"); then
    linha FALHA rbac "leitor indisponivel: mysql"
    return
  fi
  so_banco=$(comm -23 <(printf '%s\n' "$banco") <(printf '%s\n' "$codigo") | paste -sd, -)
  so_codigo=$(comm -13 <(printf '%s\n' "$banco") <(printf '%s\n' "$codigo") | paste -sd, -)
  faltam=$(comm -13 <(printf '%s\n' "$roles") <(printf 'admin\nredator\nsuperadmin\n') | paste -sd, -)
  n_codigo=$(wc -l <<< "$codigo" | tr -d ' ')
  if [ -n "$so_banco" ] || [ -n "$so_codigo" ]; then
    linha FALHA rbac "so-no-banco: ${so_banco:--} so-no-codigo: ${so_codigo:--}"
  elif [ -n "$faltam" ]; then
    linha FALHA rbac "roles ausentes: $faltam"
  elif [ "$n_super" != "$n_codigo" ]; then
    linha FALHA rbac "superadmin tem $n_super de $n_codigo permissoes"
  else
    linha OK rbac "$n_codigo permissoes; roles $(paste -sd, - <<< "$roles"); superadmin com todas"
  fi
}
```

E troque a chamada final para:

```bash
conferir_migrations
conferir_rbac
conferir_env
```

- [ ] **Step 4: Ver passar**

Run: `cd frontend && pnpm vitest run tests/conferir-golive.test.ts`
Expected: tudo PASS, inclusive a fixture boa com os três nomes.

- [ ] **Step 5: Sondas da lição 19**

Uma por comparação, cada uma desfeita em seguida: (a) `linha FALHA migrations "so-no-banco..."` → `linha OK` reprova os dois casos de diff; (b) `linha FALHA migrations "leitor indisponivel: mysql"` → `linha OK` reprova "mysql fora"; (c) idem `app`; (d) `linha FALHA rbac "so-no-banco..."` → `OK` reprova os dois de permissão; (e) `linha FALHA rbac "roles ausentes"` → `OK` reprova "role ausente"; (f) `linha FALHA rbac "superadmin tem"` → `OK` reprova "superadmin sem todas".

- [ ] **Step 6: Commit**

```bash
git add deploy/bin/conferir-golive.sh frontend/tests/conferir-golive.test.ts
git commit -m "feat(13): conferir-golive.sh — migrations e rbac contra a imagem viva"
```

---

### Task 3: Verificações `dados-antigos` e `sondas-dev`

**Files:**
- Modify: `deploy/bin/conferir-golive.sh`
- Test: `frontend/tests/conferir-golive.test.ts`

**Interfaces:**
- Consumes: `linha`, `sql`, `LIMITE_NASCIMENTO`, helpers do teste (Task 1).
- Produces: `conferir_dados_antigos`, `conferir_sondas_dev`.

- [ ] **Step 1: Escrever os casos**

`NOMES` passa a `['migrations', 'rbac', 'dados-antigos', 'sondas-dev', 'env']`. Acrescente:

```ts
describe('deploy/bin/conferir-golive.sh — dados-antigos (D-37)', () => {
  it('tabela com MIN(created_at) anterior a 2026-08-18 → FALHA nomeando tabela e data', () => {
    const { env, dir } = cenarioBom()
    env.FAKE_DADOS_ANTIGOS = arquivo(dir, 'dados-antigos-2', [
      'client_addresses\t-', 'client_contacts\t2026-07-30 09:00:00', 'users\t2026-09-10 12:00:00', 'course_modules\t-',
      'course_certificate_templates\t-', 'quotes\t-', 'files\t-', 'enrollments\t-',
    ])
    const l = reprovaSo(rodar(env), 'dados-antigos')
    expect(l.detalhe).toContain('client_contacts=2026-07-30')
  })

  it('consulta devolvendo menos de oito tabelas → FALHA (leitura incompleta nunca é OK)', () => {
    const { env, dir } = cenarioBom()
    env.FAKE_DADOS_ANTIGOS = arquivo(dir, 'dados-antigos-3', ['users\t-'])
    const l = reprovaSo(rodar(env), 'dados-antigos')
    expect(l.detalhe).toContain('esperava 8 tabelas')
  })

  it('a consulta cobre exatamente as oito tabelas de archived_with_parent', () => {
    const e = rodar(cenarioBom().env)
    const consulta = chamadas(e.log).map((a) => a.join(' ')).find((a) => a.includes('MIN(created_at)')) ?? ''
    for (const t of ['client_addresses', 'client_contacts', 'users', 'course_modules', 'course_certificate_templates', 'quotes', 'files', 'enrollments']) {
      expect(consulta).toContain(`FROM ${t}`)
    }
    expect(porNome(e.stdout)['dados-antigos']).toEqual({ estado: 'OK', detalhe: 'nenhum registro anterior a 2026-08-18 em 8 tabelas' })
  })
})

describe('deploy/bin/conferir-golive.sh — sondas-dev (P-44)', () => {
  it('usuário de sonda presente → FALHA com a contagem', () => {
    const l = reprovaSo(rodar({ ...cenarioBom().env, FAKE_SONDAS_N: '3' }), 'sondas-dev')
    expect(l.detalhe).toContain('3 usuarios de sonda')
  })

  it('a consulta procura os três padrões de e-mail', () => {
    const e = rodar(cenarioBom().env)
    const consulta = chamadas(e.log).map((a) => a.join(' ')).find((a) => a.includes('FROM users WHERE email')) ?? ''
    expect(consulta).toContain("'e2e.gate%'")
    expect(consulta).toContain("'gate.fechamento@lotus.cl'")
    expect(consulta).toContain("'gate-bd9@gate.cl'")
    expect(porNome(e.stdout)['sondas-dev']).toEqual({ estado: 'OK', detalhe: 'nenhum usuario de sonda' })
  })
})
```

- [ ] **Step 2: Ver reprovar**

Run: `cd frontend && pnpm vitest run tests/conferir-golive.test.ts`
Expected: FAIL nos casos novos (nome ausente em `porNome`).

- [ ] **Step 3: Implementar**

Antes de `conferir_env() {`:

```bash
# D-37: MIN(created_at) das oito tabelas de archived_with_parent. Toda tabela
# tem created_at (timestamps() nas migrations). Tabela vazia devolve '-'.
TABELAS_ARQUIVAMENTO="client_addresses client_contacts users course_modules course_certificate_templates quotes files enrollments"
conferir_dados_antigos() {
  local consulta='' t saida n antigas
  for t in $TABELAS_ARQUIVAMENTO; do
    consulta="$consulta${consulta:+ UNION ALL }SELECT '$t', IFNULL(MIN(created_at), '-') FROM $t"
  done
  if ! saida=$(sql "$consulta"); then
    linha FALHA dados-antigos "leitor indisponivel: mysql"
    return
  fi
  n=$(wc -l <<< "$saida" | tr -d ' ')
  if [ "$n" != 8 ]; then
    linha FALHA dados-antigos "esperava 8 tabelas, leu $n"
    return
  fi
  antigas=$(awk -F'\t' -v lim="$LIMITE_NASCIMENTO" '$2 != "-" && $2 < lim { printf "%s=%s,", $1, substr($2, 1, 10) }' <<< "$saida")
  if [ -n "$antigas" ]; then
    linha FALHA dados-antigos "registro anterior a $LIMITE_NASCIMENTO: ${antigas%,}"
  else
    linha OK dados-antigos "nenhum registro anterior a $LIMITE_NASCIMENTO em 8 tabelas"
  fi
}

# P-44: usuarios de sonda dos gates antigos. Conta inclusive soft-deletados.
conferir_sondas_dev() {
  local n
  if ! n=$(sql "SELECT COUNT(*) FROM users WHERE email LIKE 'e2e.gate%' OR email IN ('gate.fechamento@lotus.cl', 'gate-bd9@gate.cl')"); then
    linha FALHA sondas-dev "leitor indisponivel: mysql"
    return
  fi
  if [ "$n" != 0 ]; then
    linha FALHA sondas-dev "$n usuarios de sonda de dev no banco"
  else
    linha OK sondas-dev "nenhum usuario de sonda"
  fi
}
```

Chamadas finais:

```bash
conferir_migrations
conferir_rbac
conferir_dados_antigos
conferir_sondas_dev
conferir_env
```

- [ ] **Step 4: Ver passar; sondas**

Run: `cd frontend && pnpm vitest run tests/conferir-golive.test.ts`
Expected: PASS nos novos. Sondas: `linha FALHA dados-antigos "registro anterior..."` → `OK` reprova o primeiro caso; `linha FALHA dados-antigos "esperava 8..."` → `OK` reprova o segundo; `linha FALHA sondas-dev` → `OK` reprova "usuário de sonda presente". Desfazer.

- [ ] **Step 5: Commit**

```bash
git add deploy/bin/conferir-golive.sh frontend/tests/conferir-golive.test.ts
git commit -m "feat(13): conferir-golive.sh — dados-antigos (D-37) e sondas-dev (P-44)"
```

---

### Task 4: Verificação `backup`

**Files:**
- Modify: `deploy/bin/conferir-golive.sh`
- Test: `frontend/tests/conferir-golive.test.ts`

**Interfaces:**
- Consumes: `linha`, `chave`, `LIMITE_BACKUP_DIAS`, helpers do teste.
- Produces: `conferir_backup`.

- [ ] **Step 1: Casos**

`NOMES` passa a `['migrations', 'rbac', 'dados-antigos', 'sondas-dev', 'env', 'backup']`. Acrescente:

```ts
describe('deploy/bin/conferir-golive.sh — backup', () => {
  it('objeto mais recente com mais de 1 dia → FALHA com idade e limite', () => {
    const l = reprovaSo(rodar({ ...cenarioBom().env, FAKE_ULTIMO_BACKUP: horasAtras(26 + 48) }), 'backup')
    expect(l.detalhe).toContain('3d (limite 1d)')
  })

  it('bucket sem objeto (None) → FALHA', () => {
    const l = reprovaSo(rodar({ ...cenarioBom().env, FAKE_ULTIMO_BACKUP: 'None' }), 'backup')
    expect(l.detalhe).toContain('nenhum objeto')
  })

  it('aws sem credencial → FALHA nomeando o aws, nunca OK', () => {
    const l = reprovaSo(rodar({ ...cenarioBom().env, FAKE_AWS_FORA: '1' }), 'backup')
    expect(l.detalhe).toBe('leitor indisponivel: aws s3api')
  })

  it('LOTUS_BACKUP_BUCKET vazio no .env → FALHA sem chamar o aws', () => {
    const { env } = cenarioBom()
    writeFileSync(join(env.LOTUS_BASE, '.env'), CHAVES_MOLDE.map((k) => (k === 'LOTUS_BACKUP_BUCKET' ? `${k}=` : `${k}=x`)).join('\n') + '\n')
    const e = rodar(env)
    expect(porNome(e.stdout).backup.estado).toBe('FALHA')
    expect(chamadas(e.log).some((a) => a[0] === 's3api')).toBe(false)
  })

  it('OK com 2 horas e consulta ao prefixo backups/ do bucket do .env', () => {
    const e = rodar(cenarioBom().env)
    expect(porNome(e.stdout).backup.estado).toBe('OK')
    const s3 = chamadas(e.log).find((a) => a[0] === 's3api') ?? []
    expect(s3).toContain('valor-lotus_backup_bucket')
    expect(s3).toContain('backups/')
  })
})
```

- [ ] **Step 2: Ver reprovar** — Run: `cd frontend && pnpm vitest run tests/conferir-golive.test.ts`. Expected: FAIL (sem `backup`).

- [ ] **Step 3: Implementar**

Antes de `conferir_env() {`:

```bash
# Mesma medida do verificar-backup.sh: a idade do objeto mais recente em
# s3://$BUCKET/backups/. Limite 1 dia, nao 2: aqui e linha de base, nao alarme.
conferir_backup() {
  local bucket quando idade
  bucket=$(chave LOTUS_BACKUP_BUCKET)
  if [ -z "$bucket" ]; then
    linha FALHA backup "LOTUS_BACKUP_BUCKET ausente ou vazio no .env"
    return
  fi
  if ! quando=$(aws s3api list-objects-v2 --bucket "$bucket" --prefix backups/ \
      --query 'sort_by(Contents,&LastModified)[-1].LastModified' --output text 2>/dev/null); then
    linha FALHA backup "leitor indisponivel: aws s3api"
    return
  fi
  if [ -z "$quando" ] || [ "$quando" = None ]; then
    linha FALHA backup "nenhum objeto em s3://$bucket/backups/"
    return
  fi
  idade=$(( ( $(date -u +%s) - $(date -u -d "$quando" +%s) ) / 86400 ))
  if [ "$idade" -le "$LIMITE_BACKUP_DIAS" ]; then
    linha OK backup "mais recente ha ${idade}d: $quando"
  else
    linha FALHA backup "mais recente ha ${idade}d (limite ${LIMITE_BACKUP_DIAS}d): $quando"
  fi
}
```

Chamadas: `conferir_backup` entre `conferir_env` e o `exit` (ordem final: migrations, rbac, dados-antigos, sondas-dev, env, backup, smoke).

- [ ] **Step 4: Ver passar; sondas** — `linha FALHA backup "mais recente ha..."` → `OK` reprova "mais de 1 dia"; `linha FALHA backup "nenhum objeto"` → `OK` reprova "None"; `linha FALHA backup "leitor indisponivel"` → `OK` reprova "aws sem credencial"; `linha FALHA backup "LOTUS_BACKUP_BUCKET..."` → `OK` reprova "vazio". Desfazer.

- [ ] **Step 5: Commit**

```bash
git add deploy/bin/conferir-golive.sh frontend/tests/conferir-golive.test.ts
git commit -m "feat(13): conferir-golive.sh — idade do backup no S3"
```

---

### Task 5: Verificação `smoke` e o modo `--final`

**Files:**
- Modify: `deploy/bin/conferir-golive.sh`
- Test: `frontend/tests/conferir-golive.test.ts`

**Interfaces:**
- Consumes: `linha`, `sql`, `FINAL`, helpers do teste.
- Produces: `conferir_smoke`; `NOMES` completo.

- [ ] **Step 1: Casos**

`NOMES` passa à lista final: `['migrations', 'rbac', 'dados-antigos', 'sondas-dev', 'env', 'backup', 'smoke']`. Acrescente:

```ts
const smoke = (linhas: Record<string, [number, number]>): string[] =>
  ['certificados', 'clientes', 'cursos', 'turmas', 'alunos'].map((n) => `${n}\t${linhas[n][0]}\t${linhas[n][1]}`)

const SMOKE_LIMPO = { certificados: [1, 0], clientes: [1, 0], cursos: [1, 0], turmas: [1, 0], alunos: [1, 0] } as Record<string, [number, number]>

describe('deploy/bin/conferir-golive.sh — smoke', () => {
  it('sem --final é INFO com as contagens, mesmo com tudo vivo', () => {
    const { env, dir } = cenarioBom()
    env.FAKE_SMOKE = arquivo(dir, 'smoke-2', smoke({ certificados: [1, 1], clientes: [1, 1], cursos: [1, 1], turmas: [1, 0], alunos: [1, 0] }))
    const e = rodar(env)
    expect(e.status).toBe(0)
    expect(porNome(e.stdout).smoke).toEqual({ estado: 'INFO', detalhe: 'certificados=1 (nao revogados 1) clientes=1 (vivos 1) cursos=1 (vivos 1) turmas=1 alunos=1' })
  })

  it('sem --final e sem nada SMOKE-GOLIVE: INFO com zeros', () => {
    const e = rodar(cenarioBom().env)
    expect(porNome(e.stdout).smoke).toEqual({ estado: 'INFO', detalhe: 'certificados=0 (nao revogados 0) clientes=0 (vivos 0) cursos=0 (vivos 0) turmas=0 alunos=0' })
  })

  it('--final com tudo limpo → OK e exit 0', () => {
    const { env, dir } = cenarioBom()
    env.FAKE_SMOKE = arquivo(dir, 'smoke-3', smoke(SMOKE_LIMPO))
    const e = rodar(env, ['--final'])
    expect(e.status).toBe(0)
    expect(porNome(e.stdout).smoke.estado).toBe('OK')
  })

  it.each([
    ['nenhum certificado', { ...SMOKE_LIMPO, certificados: [0, 0] }, 'nenhum certificado SMOKE-GOLIVE'],
    ['dois certificados, um sem revoked_at', { ...SMOKE_LIMPO, certificados: [2, 1] }, 'certificados nao revogados: 1'],
    ['cliente ausente', { ...SMOKE_LIMPO, clientes: [0, 0] }, 'nenhum cliente SMOKE-GOLIVE'],
    ['cliente vivo', { ...SMOKE_LIMPO, clientes: [1, 1] }, 'clientes nao arquivados: 1'],
    ['curso ausente', { ...SMOKE_LIMPO, cursos: [0, 0] }, 'nenhum curso SMOKE-GOLIVE'],
    ['curso vivo', { ...SMOKE_LIMPO, cursos: [1, 1] }, 'cursos nao arquivados: 1'],
    ['turma ausente', { ...SMOKE_LIMPO, turmas: [0, 0] }, 'nenhuma turma SMOKE-GOLIVE'],
    ['aluno ausente', { ...SMOKE_LIMPO, alunos: [0, 0] }, 'nenhum aluno SMOKE-GOLIVE'],
  ] as [string, Record<string, [number, number]>, string][])('--final: %s → FALHA', (_nome, linhas, trecho) => {
    const { env, dir } = cenarioBom()
    env.FAKE_SMOKE = arquivo(dir, `smoke-${_nome.replace(/\W+/g, '-')}`, smoke(linhas))
    const l = reprovaSo(rodar(env, ['--final']), 'smoke')
    expect(l.detalhe).toContain(trecho)
  })

  it('consulta com menos de cinco linhas → FALHA, com ou sem --final', () => {
    const { env, dir } = cenarioBom()
    env.FAKE_SMOKE = arquivo(dir, 'smoke-curto', ['certificados\t0\t0'])
    expect(reprovaSo(rodar(env), 'smoke').detalhe).toContain('esperava 5 linhas')
    expect(reprovaSo(rodar(env, ['--final']), 'smoke').detalhe).toContain('esperava 5 linhas')
  })

  it('argumento desconhecido sai 2 com uso', () => {
    const e = rodar(cenarioBom().env, ['--tudo'])
    expect(e.status).toBe(2)
    expect(e.stderr).toContain('uso:')
  })
})
```

- [ ] **Step 2: Ver reprovar** — Run: `cd frontend && pnpm vitest run tests/conferir-golive.test.ts`. Expected: FAIL nos casos de smoke.

- [ ] **Step 3: Implementar**

Antes de `conferir_env() {`:

```bash
# Entidades SMOKE-GOLIVE (spec D5, emenda do plano). Certificado liga ao curso
# por course_id; turma nao tem nome e liga pelo curso; aluno e cliente vivem em
# users.name (cliente tambem em clients.legal_name). Turma concluida e aluno
# nao se arquivam, por isso so contam presenca. Sem --final e INFO.
CONSULTA_SMOKE="SELECT 'certificados', COUNT(*), IFNULL(SUM(c.revoked_at IS NULL), 0) FROM certificates c JOIN courses co ON co.id = c.course_id WHERE co.name LIKE 'SMOKE-GOLIVE%' UNION ALL SELECT 'clientes', COUNT(*), IFNULL(SUM(cl.deleted_at IS NULL), 0) FROM clients cl JOIN users u ON u.id = cl.user_id WHERE cl.legal_name LIKE 'SMOKE-GOLIVE%' OR u.name LIKE 'SMOKE-GOLIVE%' UNION ALL SELECT 'cursos', COUNT(*), IFNULL(SUM(deleted_at IS NULL), 0) FROM courses WHERE name LIKE 'SMOKE-GOLIVE%' UNION ALL SELECT 'turmas', COUNT(*), 0 FROM turmas t JOIN courses co ON co.id = t.course_id WHERE co.name LIKE 'SMOKE-GOLIVE%' UNION ALL SELECT 'alunos', COUNT(*), 0 FROM students s JOIN users u ON u.id = s.user_id WHERE u.name LIKE 'SMOKE-GOLIVE%'"
conferir_smoke() {
  local saida n cert cert_vivos cli cli_vivos cur cur_vivos tur alu motivo=''
  if ! saida=$(sql "$CONSULTA_SMOKE"); then
    linha FALHA smoke "leitor indisponivel: mysql"
    return
  fi
  n=$(wc -l <<< "$saida" | tr -d ' ')
  if [ "$n" != 5 ]; then
    linha FALHA smoke "esperava 5 linhas, leu $n"
    return
  fi
  cert=$(awk -F'\t' '$1 == "certificados" { print $2 }' <<< "$saida")
  cert_vivos=$(awk -F'\t' '$1 == "certificados" { print $3 }' <<< "$saida")
  cli=$(awk -F'\t' '$1 == "clientes" { print $2 }' <<< "$saida")
  cli_vivos=$(awk -F'\t' '$1 == "clientes" { print $3 }' <<< "$saida")
  cur=$(awk -F'\t' '$1 == "cursos" { print $2 }' <<< "$saida")
  cur_vivos=$(awk -F'\t' '$1 == "cursos" { print $3 }' <<< "$saida")
  tur=$(awk -F'\t' '$1 == "turmas" { print $2 }' <<< "$saida")
  alu=$(awk -F'\t' '$1 == "alunos" { print $2 }' <<< "$saida")
  if [ "$FINAL" != 1 ]; then
    linha INFO smoke "certificados=$cert (nao revogados $cert_vivos) clientes=$cli (vivos $cli_vivos) cursos=$cur (vivos $cur_vivos) turmas=$tur alunos=$alu"
    return
  fi
  [ "$cert" != 0 ] || motivo="$motivo nenhum certificado SMOKE-GOLIVE;"
  [ "$cert_vivos" = 0 ] || motivo="$motivo certificados nao revogados: $cert_vivos;"
  [ "$cli" != 0 ] || motivo="$motivo nenhum cliente SMOKE-GOLIVE;"
  [ "$cli_vivos" = 0 ] || motivo="$motivo clientes nao arquivados: $cli_vivos;"
  [ "$cur" != 0 ] || motivo="$motivo nenhum curso SMOKE-GOLIVE;"
  [ "$cur_vivos" = 0 ] || motivo="$motivo cursos nao arquivados: $cur_vivos;"
  [ "$tur" != 0 ] || motivo="$motivo nenhuma turma SMOKE-GOLIVE;"
  [ "$alu" != 0 ] || motivo="$motivo nenhum aluno SMOKE-GOLIVE;"
  if [ -n "$motivo" ]; then
    linha FALHA smoke "${motivo# }"
  else
    linha OK smoke "certificados=$cert todos revogados; clientes=$cli e cursos=$cur arquivados; turmas=$tur alunos=$alu"
  fi
}
```

Bloco final do script:

```bash
conferir_migrations
conferir_rbac
conferir_dados_antigos
conferir_sondas_dev
conferir_env
conferir_backup
conferir_smoke

exit $(( FALHAS > 0 ? 1 : 0 ))
```

- [ ] **Step 4: Ver passar; sondas** — Run: `cd frontend && pnpm vitest run tests/conferir-golive.test.ts`. Expected: tudo PASS, com a fixture boa nos sete nomes. Sondas: apagar cada uma das oito linhas `[ ... ] || motivo=...` reprova o caso correspondente do `it.each`; `linha FALHA smoke "esperava 5 linhas"` → `OK` reprova "menos de cinco linhas"; `exit 2` do parser → `exit 0` reprova "argumento desconhecido". Desfazer.

- [ ] **Step 5: Lint completo e commit**

Run: `cd frontend && pnpm lint && pnpm test`
Expected: limpo e verde.

```bash
git add deploy/bin/conferir-golive.sh frontend/tests/conferir-golive.test.ts
git commit -m "feat(13): conferir-golive.sh — smoke SMOKE-GOLIVE e modo --final; fixture boa inteira"
```

---

### Task 6: Runbook §7 e §15, com catraca

**Files:**
- Modify: `deploy/aws/README.md:201` (linha `scp` dos scripts), `deploy/aws/README.md:210` (linha `sudo mv`), fim do arquivo (§15 novo)
- Test: `frontend/tests/conferir-golive.test.ts`

**Interfaces:**
- Consumes: nome e contrato do script (Tasks 1–5).
- Produces: §15 que a `aceitacao.md` e o João seguem na Fase B.

- [ ] **Step 1: Casos**

```ts
describe('deploy/aws/README.md — §7 e §15', () => {
  const RUNBOOK = readFileSync(join(RAIZ, 'deploy', 'aws', 'README.md'), 'utf8')
  const secao = (inicio: string, fim: string): string => {
    const a = RUNBOOK.indexOf(inicio)
    expect(a).toBeGreaterThan(-1)
    const b = fim === '' ? RUNBOOK.length : RUNBOOK.indexOf(fim, a + 1)
    expect(b).toBeGreaterThan(a)
    return RUNBOOK.slice(a, b)
  }

  it('o §7 leva o conferir-golive.sh ao host — sem ele o botão trava no sha256 de bin/', () => {
    const s7 = secao('\n## 7. ', '\n## 8. ')
    expect(s7).toMatch(/^scp .*deploy\/bin\/conferir-golive\.sh/m)
    expect(s7).toMatch(/^sudo mv .*\/tmp\/conferir-golive\.sh/m)
  })

  it('o §15 existe, usa o script nos dois modos e marca t0, t1 e t2', () => {
    const s15 = secao('\n## 15. ', '')
    expect(s15).toContain('sudo /opt/lotus/bin/conferir-golive.sh')
    expect(s15).toContain('sudo /opt/lotus/bin/conferir-golive.sh --final')
    expect(s15).toContain('LOTUS_BACKUP_ROTULO=golive')
    for (const marco of ['t0', 't1', 't2']) expect(s15).toContain(`\`${marco}\``)
    expect(s15).toContain('RTO = t2 - t0')
    expect(s15).toContain('§8.1.1')
    expect(s15).toContain('§8.3')
  })
})
```

- [ ] **Step 2: Ver reprovar** — Run: `cd frontend && pnpm vitest run tests/conferir-golive.test.ts -t README`. Expected: FAIL (sem §15; §7 sem o script).

- [ ] **Step 3: Editar o §7**

Linha 201 passa a:

```bash
scp -i "$PEM" deploy/bin/deploy.sh deploy/bin/backup-db.sh deploy/bin/verificar-backup.sh deploy/bin/recarregar-nginx.sh deploy/bin/sondar-saude.sh deploy/bin/conferir-golive.sh ubuntu@<EIP>:/tmp/
```

Linha 210 passa a:

```bash
sudo mv /tmp/deploy.sh /tmp/backup-db.sh /tmp/verificar-backup.sh /tmp/recarregar-nginx.sh /tmp/sondar-saude.sh /tmp/conferir-golive.sh /opt/lotus/bin/ && sudo sh -c 'chmod +x /opt/lotus/bin/*.sh'
```

- [ ] **Step 4: Acrescentar o §15 ao fim do arquivo**

```markdown
## 15. Go-live — linha de base, smoke, restore cronometrado e rede final

Bloco 13 (`docs/superpowers/blocos/13-go-live-confiabilidade-e-recuperacao/spec.md`, §5). Quem
roda é o João, depois do merge e do espelho; a sessão lê e confere. Os marcos de tempo vão na
`aceitacao.md` do bloco, um por linha, em UTC (`date -u +%FT%TZ`).

**Risco declarado (spec D3).** O passo 5 apaga o banco de produção e o recarrega do dump do passo 4.
É aceitável só enquanto não houver dado real de cliente. **Havendo**, o passo 5 roda num contêiner
descartável (bloco "alternativa" abaixo) e o RTO é declarado **parcial**.

`sudo /opt/lotus/bin/conferir-golive.sh` é só leitura: imprime uma linha por verificação
(`OK|FALHA|AVISO|INFO <nome> <detalhe>`) e sai 1 com qualquer `FALHA`. Ele nunca escreve no
banco, nunca sobe contêiner e nunca mostra valor do `.env`.

1. **Instalar e promover.** O script entra pelo §7 (`scp` + `sudo mv`). Até isso o botão recusa:
   ele compara o sha256 de cada `bin/*.sh` do host com a `main`. Depois, promover o SHA mesclado
   pelo botão *Promover para producao*.

2. **Linha de base.**

   ```bash
   sudo /opt/lotus/bin/conferir-golive.sh
   ```

   - `rbac` em `FALHA` → rodar o seeder pelo §8.3 e conferir de novo.
   - `env` em `FALHA` → corrigir o `.env`, promover pelo botão (o `.env` só é lido no subir) e
     conferir de novo. `AVISO` por chave a mais não bloqueia.
   - `migrations`, `dados-antigos` ou `sondas-dev` em `FALHA` → **parar** e voltar ao bloco (spec
     §6): não promover nada.
   - `smoke` sai `INFO`.

3. **Smoke pela UI, sobre HTTPS, com admin real** (`https://app.lotusotec.cl`). Tudo com o
   prefixo `SMOKE-GOLIVE` no nome: cliente, cotação, curso, turma, aluno, matrícula, resultado,
   conclusão da turma e certificado. Abrir o QR fora da sessão: a validação pública mostra
   *emitido*. Anotar o uuid; de fora, `GET /api/publico/certificados/<uuid>` responde 200.

4. **Dump manual com o certificado.**

   ```bash
   sudo env LOTUS_BACKUP_ROTULO=golive LOTUS_BACKUP_SAIDA=/root/golive.txt /opt/lotus/bin/backup-db.sh
   sudo cat /root/golive.txt      # s3://<bucket>/backups/lotus-<data>-golive.sql.gz
   ```

   Conferir `certificates ≥ 1` pela contagem do §9.

5. **Restore cronometrado sobre o volume real.** É o §8.1.1 como está, com `DUMP=$(cat
   /root/golive.txt)`. Três marcos, anotados no momento:

   - `t0`: antes do passo 1 do §8.1.1 (`aws s3 cp`).
   - `t1`: logo depois de `$C stop app scheduler` (passo 2 do §8.1.1).
   - `t2`: o primeiro `/up` 200 depois de soltar o cadeado e apertar o botão (passo 7). Deixe o
     laço rodando **antes** de apertar:

     ```bash
     until curl -fsS -o /dev/null https://app.lotusotec.cl/up; do sleep 2; done; date -u +%FT%TZ
     ```

   **RTO = t2 - t0**, e cada etapa (download, parada, dump "antes", carga, promoção) fica anotada
   com a duração. O tamanho do dump e a data entram na emenda do ADR-14.

   *Alternativa com dado real de cliente (D3):* não tocar no volume. Subir um MySQL descartável e
   cronometrar só a carga:

   ```bash
   sudo docker run --rm -d --name lotus-restore-ensaio -e MYSQL_ROOT_PASSWORD=ensaio -e MYSQL_DATABASE=lotus mysql:8.0
   date -u +%FT%TZ   # t0
   aws s3 cp "$(sudo cat /root/golive.txt)" /tmp/golive.sql.gz --only-show-errors
   gunzip -c /tmp/golive.sql.gz | sudo docker exec -i lotus-restore-ensaio mysql -uroot -pensaio lotus
   date -u +%FT%TZ   # t2 (parcial: sem parada nem promoção)
   sudo docker rm -f lotus-restore-ensaio && rm /tmp/golive.sql.gz
   ```

   O RTO fica declarado **parcial** na proposta e no ADR-14.

6. **Pós-restore.** A validação pública do uuid continua *emitido* e o PDF gera pela UI (sob
   demanda, Gotenberg — ADR-12). Certificado que suma aqui **bloqueia o go-live** (spec §6).

7. **Limpeza.** Com `superadmin`, revogar o certificado pela UI (a validação passa a *revogado*)
   e arquivar o cliente e o curso `SMOKE-GOLIVE`. Turma concluída não se arquiva (RN-15) e aluno
   não tem arquivar: ficam, identificados pelo prefixo. Nada se apaga.

8. **Rede final.**

   ```bash
   sudo /opt/lotus/bin/conferir-golive.sh --final
   ```

   Sai 0, todo `OK`. Qualquer `FALHA` volta ao passo que a causou.

9. **Proposta.** Preencher `<RTO medido>` em
   `docs/superpowers/blocos/13-go-live-confiabilidade-e-recuperacao/proposta-dis02.md`, enviar à
   Lotus e registrar a resposta na `aceitacao.md`. A lane de aceitação finaliza a emenda do
   ADR-14, encerra D-37 e P-44 e remove a ficha 13 do backlog.

**Recuo.** Restore que falha no passo 5: repetir o passo 4 do §8.1.1 inteiro; persistindo, carregar
o dump `antes-do-restore` pelo mesmo procedimento. Restore que falha é gatilho do ADR-09 e bloqueia
o go-live: registrar e parar.
```

- [ ] **Step 5: Ver passar; commit**

Run: `cd frontend && pnpm vitest run tests/conferir-golive.test.ts && pnpm vitest run tests/repo-docs-refs.test.ts tests/observabilidade-nomes.test.ts`
Expected: PASS.

```bash
git add deploy/aws/README.md frontend/tests/conferir-golive.test.ts
git commit -m "docs(13): runbook — conferir-golive.sh no §7 e §15 Go-live"
```

---

### Task 7: ADR-14 emenda-proposta e nota cruzada no ADR-09

**Files:**
- Modify: `docs/adrs.md` (após a linha 90, fim do ADR-09; após a linha 205, fim do ADR-14)

**Interfaces:**
- Consumes: nada de código; o texto cita o §15 (Task 6) e a proposta (Task 8) por caminho.
- Produces: a emenda que a lane de aceitação finaliza.

- [ ] **Step 1: Inserir no fim do ADR-09** (depois do parágrafo "Quem detecta o segundo gatilho"):

```markdown
**Nota cruzada (2026-10-06, bloco `go-live-confiabilidade-e-recuperacao`).** O RTO/RPO desta
revisão passa a ser **proposto à Lotus** como revisão do `RNF-DIS-02`: ver a emenda de 2026-10-06
do ADR-14. Restore que falhar no go-live é o primeiro gatilho desta revisão disparando.
```

- [ ] **Step 2: Inserir no fim do ADR-14** (depois de "o original não se apaga."):

```markdown
**Emenda (2026-10-06, bloco `go-live-confiabilidade-e-recuperacao`) — status: proposta,
aguardando aceite da Lotus.** O `RNF-DIS-02` do Drive (`requisitos-negocio.md`) exige *servidor
redundante pronto para assumir em caso de queda*. **Uma EC2 única não atende esse requisito**, e
nenhum texto anterior registrava aceite da Lotus para o rebaixamento que `arquitetura-aws-lotus.md`
§4 fez sem data nem autor (e citando um snapshot que não existe). Esta emenda propõe a revisão e
só vale como decisão depois do aceite:

- **Sem redundância.** Uma EC2 em `sa-east-1`, MySQL 8 em contêiner (ADR-09, revisão 2026-09).
- **RPO ≤ 24 h**, pelo dump diário às 06:10 UTC para o S3 (lifecycle 30 dias), vigiado pelo
  `verificar-backup.sh`. Num desastre perde-se até um dia de registros, certificados inclusive.
- **RTO = `<RTO medido>`**, medido no go-live pelo runbook §15 sobre o dump de `<data>` com
  `<tamanho>` — restore manual pelo §8.1.1, sem snapshot EBS/AMI/RDS. Cresce com o volume.
- **HA como trilha futura**: RDS multi-AZ + segunda EC2 atrás de ALB. **Gatilho**: a Lotus exigir
  RTO/RPO menor, ou uma indisponibilidade real passar do RTO declarado.

Proposta enviada: `docs/superpowers/blocos/13-go-live-confiabilidade-e-recuperacao/proposta-dis02.md`.
A lane de aceitação troca este status por *aceita em <data>* (ou *recusada*, e então HA vira ficha
no backlog por PR de docs) e preenche os três campos entre `<>`.
```

- [ ] **Step 3: Catraca de docs e commit**

Run: `cd frontend && pnpm vitest run tests/repo-docs-refs.test.ts`
Expected: PASS (os dois caminhos citados existem: o `proposta-dis02.md` nasce na Task 8 — rode esta verificação depois dela, ou execute as Tasks 7 e 8 no mesmo grupo).

```bash
git add docs/adrs.md
git commit -m "docs(13): ADR-14 emenda-proposta do RNF-DIS-02 e nota cruzada no ADR-09"
```

---

### Task 8: Proposta à Lotus (espanhol)

**Files:**
- Create: `docs/superpowers/blocos/13-go-live-confiabilidade-e-recuperacao/proposta-dis02.md`

**Interfaces:**
- Consumes: nada.
- Produces: o documento que o João envia (Fase B, passo 9), com `<RTO medido>` como lacuna de projeto.

- [ ] **Step 1: Escrever o arquivo**

```markdown
# Propuesta de revisión del requisito RNF-DIS-02 — disponibilidad y recuperación

**Para:** Lotus · **De:** equipo de desarrollo de la plataforma · **Fecha:** 2026-10-06 ·
**Estado:** pendiente de aceptación

## 1. Qué dice el requisito hoy

El `RNF-DIS-02` de `requisitos-negocio.md` exige un *servidor redundante listo para asumir en caso
de caída*.

## 2. Qué entrega la arquitectura actual

Una única instancia EC2 en la región `sa-east-1` (São Paulo), con la base de datos MySQL 8 en
contenedor dentro de la misma instancia. **No hay servidor redundante.** La decisión se tomó por
costo (techo de US$ 30/mes para ~10 usuarios internos de baja concurrencia) y está registrada en
las decisiones ADR-09 y ADR-14 del repositorio.

## 3. Qué garantiza la arquitectura actual

| Medida | Valor | Cómo se garantiza |
|---|---|---|
| **RPO** (pérdida máxima de datos) | **≤ 24 horas** | respaldo diario de la base a las 06:10 UTC hacia S3, con retención de 30 días y verificación automática de la edad del último respaldo |
| **RTO** (tiempo máximo de recuperación) | **`<RTO medido>`** | restauración manual según el runbook, medida en el go-live sobre la base real (fecha y tamaño del respaldo registrados en el ADR-14) |

## 4. Qué se pierde en una restauración

Todo lo escrito después del último respaldo: hasta un día de certificados emitidos, matrículas y
registros de auditoría. Un certificado emitido y luego perdido en una restauración tendría que
**volver a emitirse**; el número de serie no se reutiliza.

## 5. Ruta futura de alta disponibilidad

Base de datos gestionada (RDS multi-AZ) y segunda instancia EC2 detrás de un balanceador (ALB).
**Se activa si** Lotus exige un RTO/RPO menor que los declarados arriba, o si una indisponibilidad
real supera el RTO declarado. Costo estimado adicional: del orden de US$ 40–60/mes.

## 6. Lo que se pide

Que Lotus **acepte explícitamente** la revisión del `RNF-DIS-02` en estos términos: sin servidor
redundante, RPO ≤ 24 h, RTO `<RTO medido>`, y la ruta de alta disponibilidad como etapa futura
con los gatillos del punto 5. La aceptación (o el rechazo) queda registrada en el repositorio con
fecha y nombre de quien responde.
```

- [ ] **Step 2: Commit**

```bash
git add docs/superpowers/blocos/13-go-live-confiabilidade-e-recuperacao/proposta-dis02.md
git commit -m "docs(13): proposta de revisao do RNF-DIS-02 para a Lotus (es)"
```

---

### Task 9: P-05 encerrada

**Files:**
- Modify: `docs/superpowers/pendencias/abertas.md:562-580` (remover a ficha `## P-05 …` inteira, até a linha em branco antes de `## P-83`)
- Modify: `docs/superpowers/pendencias/README.md:36` (remover a linha `| P-05 | …` da tabela "Agrupadas em bloco de execução")
- Modify: `docs/superpowers/pendencias/encerradas.md:8` (inserir a ficha abaixo logo depois de `## Em rastro (saem no próximo \`/fechar-sprint\`)` e da linha em branco)

**Interfaces:**
- Consumes: nada.
- Produces: rastro da D4.

- [ ] **Step 1: Inserir em `encerradas.md`**

```markdown
## P-05 — migrations "adicionais" não consolidadas

**Encerrada em 2026-10-06, no bloco `go-live-confiabilidade-e-recuperacao` (item 13), por
decisão D4 da spec: não consolidar.** As 30 migrations são histórico imutável — migration aplicada
em produção nunca se reescreve, e a produção tem as 30 linhas na tabela `migrations` desde
2026-09-04. O que a ficha realmente pedia ("banco = código") passa a ser provado pelo
`deploy/bin/conferir-golive.sh` (verificação `migrations`, catraca em
`frontend/tests/conferir-golive.test.ts`), e o gatilho "antes de subir para produção", disparado e
não pago em 2026-09-20, fica registrado como decisão e não como dívida.

**Bloco:** 13 · **Quem decidiu:** João, 2026-10-05 (brainstorming do bloco 13, P4).
```

- [ ] **Step 2: Remover a ficha de `abertas.md` e a linha do índice**

Em `abertas.md`, apague do `## P-05 — migrations "adicionais" não consolidadas` até a linha em branco que antecede `## P-83`. Em `README.md`, apague a linha que começa com `| P-05 |`.

- [ ] **Step 3: Conferir e commit**

Run: `grep -n "P-05" docs/superpowers/pendencias/abertas.md docs/superpowers/pendencias/README.md`
Expected: em `abertas.md`, nenhuma ocorrência; em `README.md`, só a menção histórica da linha 183 ("E a **P-05** teve o gatilho…"), que fica.

```bash
git add docs/superpowers/pendencias/abertas.md docs/superpowers/pendencias/README.md docs/superpowers/pendencias/encerradas.md
git commit -m "docs(13): P-05 encerrada — migrations nao se consolidam (D4)"
```

---

### Task 10: Lição 19 e verificação final

**Files:**
- Modify: `docs/README.md:127` (lição 19, no fim do parágrafo)

**Interfaces:**
- Consumes: tudo acima.
- Produces: DoD 1–3 da spec provados.

- [ ] **Step 1: Emendar a lição 19**

Acrescente ao fim do parágrafo da lição 19 (depois de "...ancora a saída de falha, não as comparações.**"):

```markdown
 **Emenda de 2026-10-06 (item 13):** par nominal novo `deploy/bin/conferir-golive.sh` ↔ `frontend/tests/conferir-golive.test.ts`, provado por execução com `docker` e `aws` falsos em `frontend/tests/fixtures/conferir-golive/`; a mesma catraca prende o §7 e o §15 do runbook ao script.
```

- [ ] **Step 2: Verificação completa**

Run:

```bash
cd frontend && pnpm lint && pnpm test && pnpm build
cd .. && docker compose up -d && docker compose exec -T app php artisan test
bash -n deploy/bin/conferir-golive.sh
```

Expected: tudo verde; a suíte PHP inalterada (nada de PHP mudou).

- [ ] **Step 3: Commit**

```bash
git add docs/README.md
git commit -m "docs(13): licao 19 — par nominal conferir-golive.sh"
```

---

## Grupos paralelos

| Grupo | Tasks | Files: disjuntos | Aresta Consumes/Produces |
|---|---|---|---|
| G1 | 7, 8, 9 | sim (`docs/adrs.md` · `blocos/13-…/proposta-dis02.md` · `pendencias/{abertas,encerradas,README}.md`) | nenhuma entre elas (7 cita o caminho de 8 por texto, não consome interface) |

Validação por par: 7×8 — `Files:` disjuntos, 8 não consome nada, 7 não consome 8; 7×9 — disjuntos, nenhuma aresta; 8×9 — disjuntos, nenhuma aresta. Tasks 1–5 compartilham o script e o teste; 6 compartilha o teste; 10 depende de todas. Todas as demais executam e revisam uma a uma, na ordem.

## Handoff de execução

- `executor: claude`. Motivo: o script toca procedimento de produção e a D5/D6/D7 exigem julgamento sobre o que é só-leitura; a ADR-14 é decisão de arquitetura; o §15 é roteiro que o João segue sobre o banco real.
- Sessão: modelo `sonnet`, esforço `medium` (frontmatter de `/executar-bloco`); `--max` sobe os despachos `sonnet` para `opus`.
- Papéis despachados (`.claude/papeis.md`): `implementador-integracao` (Tasks 1–6, 9, 10: multi-arquivo), `implementador-mecanico` (Tasks 7 e 8: texto pronto, 1 arquivo), `revisor-task` (uma por task), `revisor-branch` (fim da SDD).
- `paths_autorizados`: não se aplica (`executor: claude`).
- Fase B (spec §5) **não** é deste plano: roda em produção, pelo João, depois do merge; a PR mescla com o bloco `blocked` aguardando aceitação (invariante 11), e a `aceitacao.md` gerada no planejamento é onde os marcos e o RTO são registrados.
