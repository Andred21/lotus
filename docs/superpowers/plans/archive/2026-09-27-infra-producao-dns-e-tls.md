# `infra-producao-dns-e-tls` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `https://app.lotusotec.cl` servido pela produção com certificado Let's Encrypt, HSTS de um ano, cookie `Secure`, renovação por webroot ensaiada, e um certificado emitido em produção com QR em https — o §11 do runbook executado de ponta a ponta pela primeira vez (paga a P-77, destrava a P-79).

**Architecture:** duas fases (D1 da spec). **Fase A**, repositórios: no `lotus-infra`, o fallback do Codex (Task 1), HSTS no `tls.conf`, hook de reload versionado em `deploy/bin/`, molde do `.env` em https, runbook e fichas, tudo com catraca (lição 19) e mesclado/espelhado antes de tocar o host; no `lotus-site`, uma PR curta com o registro `A app`, o `Retain` da D-52 e a catraca de lá, aberta **depois** do merge do B2 (D6). **Fase B**, produção: o João escreve (AWS, host, botão, login, emissão), a sessão lê e registra em `audits/`.

**Tech Stack:** nginx (`add_header … always`), certbot (`--standalone` → `--webroot`, deploy hook), Docker Compose (`exec -T nginx sh -c 'nginx -t && nginx -s reload'`), CloudFormation (`lotus-dns`, `us-east-1`), Route 53, vitest (projeto `repo`) no `lotus-infra`, vitest + prettier no `lotus-site`, `gh`, `aws`, `curl`, `openssl`, `pdftoppm`, `zbarimg`.

**Spec:** [`docs/superpowers/specs/archive/2026-09-27-infra-producao-dns-e-tls-design.md`](../../specs/archive/2026-09-27-infra-producao-dns-e-tls-design.md). Packet: [`2026-09-27-infra-producao-dns-e-tls.md`](../../context-packets/2026-09-27-infra-producao-dns-e-tls.md).

## Global Constraints

- Trabalho no worktree `../lotus-infra`, branch `infra/producao-dns-e-tls`. A PR do site sai de um worktree próprio, `/home/jvbat/projetos/lotus-site-dns`, branch `infra/registro-app-intranet`, criado da `origin/main` do `lotus-site` **só depois do merge do B2** (portão na Task 8). Nenhuma outra lane ou branch é tocada.
- O nome é **`app.lotusotec.cl`**; o EIP é **`18.230.53.197`**; **sem AAAA**; **sem CAA**; HSTS é exatamente `add_header Strict-Transport-Security "max-age=31536000" always;` — sem `includeSubDomains`, sem `preload`.
- Testes de repositório do `lotus-infra`: `cd frontend && pnpm test --project repo tests/<arquivo>.test.ts`. O `tsconfig.node.json` type-checa `tests/`, então `pnpm build` cobre os testes novos. No `lotus-site`, o gate é `pnpm check` (inclui `prettier --check`; rode `pnpm format` antes de commitar).
- **Sondas da lição 19** (uma sonda que desliga o mecanismo tem de reprovar a catraca): `cp` do arquivo para o scratchpad da sessão (`$SCRATCH`), aplicar a sonda, rodar o teste, restaurar com `cp`, fechar com `git diff --exit-code <arquivo>`. **Nunca `git stash`.**
- **Escrita em produção e na AWS é do João**: `update-termination-protection`, `execute-change-set`, merge das PRs, reinstalação pelo §7, `certbot`, `.env`, o botão, o symlink do hook, login e emissão/revogação. A sessão lê (`aws` de leitura, `gh`, `curl` de fora) e escreve o audit. Se o auto mode barrar uma leitura por SSH, o João roda e cola a saída.
- Do `.env` de produção só sai **nome de chave**, nunca valor, no audit e na conversa. Os seis valores do §11 são públicos (o domínio), mas a prova deles é o comportamento (`curl`), não a leitura do arquivo.
- Nenhum identificador de infra (ARN, InstanceId, conta) em arquivo que atravessa o espelho. `docs/` não atravessa.
- Não se abre PR do `lotus-site` a partir de uma `main` que não contenha os seis registros do SES (§1.3 da spec). O portão é executável (Task 8, Step 1).
- Antes de parar o nginx em produção: DNS de fora igual ao EIP **e** SG conferido (Task 10). Um `--standalone` que falha na validação queima uma das 5 tentativas por hora do Let's Encrypt.
- Commits terminam com `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.

## Mapa de arquivos

| Arquivo | Ação | Responsabilidade |
|---|---|---|
| `.claude/commands/planejar-bloco.md:50` | Modificar | Codex: MCP primeiro, plugin read-only depois (packet) |
| `.claude/commands/executar-bloco.md:87` | Modificar | Codex: MCP primeiro, plugin `--write` depois (execução delegada) |
| `.claude/skills/revisar-sprint/SKILL.md:57-58` | Modificar | Codex: MCP primeiro, plugin read-only depois (revisão) |
| `deploy/nginx/tls.conf` | Modificar (server 443, `/assets/`, `/`) | HSTS |
| `frontend/tests/nginx-conf.test.ts` | Modificar | Catraca do HSTS; igualdade com `prod.conf` descontando a linha |
| `deploy/bin/recarregar-nginx.sh` | Criar | Deploy hook do certbot: `nginx -t && nginx -s reload` |
| `frontend/tests/recarregar-nginx.test.ts` | Criar | Catraca do hook |
| `deploy/aws/env.prod.example:15,82` | Modificar | `APP_URL` e `FRONTEND_URL` em https |
| `frontend/tests/env-prod-example.test.ts` | Criar | Catraca dos seis valores do §11 |
| `deploy/aws/README.md` (§7, §11) | Modificar | Hook no `scp`/`mv`; §11 reescrito na ordem da spec §6 |
| `docs/README.md:127` (lição 19) | Modificar | Dois pares nominais novos |
| `docs/superpowers/pendencias/abertas.md:820-854`, `README.md:86` | Modificar | P-77 reescrita |
| `docs/superpowers/audits/2026-09-27-infra-producao-dns-e-tls.md` | Criar (Task 3), estender (9 a 12) | Evidência de cada DoD |
| `lotus-site: infra/lotus-dns.yaml` | Modificar | `IpDaIntranet`, `A app`, `Retain` em `Registros` |
| `lotus-site: scripts/infra/lib/zona.mjs` | Modificar | `app` no `INVENTARIO`; `lerPoliticasDoRecurso` |
| `lotus-site: scripts/infra/zona.test.mjs` | Modificar | Catraca: parâmetro, `app` sem AAAA, `Retain` dos registros |
| `lotus-site: docs/infra/zona-dns-lotusotec.md` | Modificar | Seção do registro da intranet |
| `lotus-site: docs/adr/ADR-SITE-006.md` | Modificar | Emenda: a intranet é `app.` |
| `lotus-site: docs/superpowers/backlog.md` | Modificar | D-49 com a restrição da CAA; D-52 fechada |
| `lotus-site: docs/infra/conferencia-zona-<data>.md` | Criar (gerado) | Zona conferida com `app` e o SES intactos |

## Mapa de DoD

| DoD da spec (§10) | Task |
|---|---|
| 1 — catracas verdes e prova local do HSTS | 2, 3, 4, 5 |
| 2 — `pnpm check` do site, stack `UPDATE_COMPLETE`, proteção, conferência | 8, 9 |
| 3 — `app` resolve exatamente o EIP, sem AAAA | 9 |
| 4 — 301, `/up` 200 nas duas portas, HSTS em `/`, `/assets/*`, erro de `/api/*` | 12 |
| 5 — certificado, webroot, hook executado, `renew --dry-run` | 10, 11 |
| 6 — cookie `Secure`/`Domain`, login real | 12 |
| 7 — certificado emitido com QR em https, revogado | 12 |
| 8 — botão verde com o host novo | 10 |
| 9 — audit, P-77, D-52 | 3, 9, 12 |

---

### Task 1: Codex — MCP primeiro, plugin depois

**Files:**
- Modify: `.claude/commands/planejar-bloco.md:50`
- Modify: `.claude/commands/executar-bloco.md:87`
- Modify: `.claude/skills/revisar-sprint/SKILL.md:57-58`

**Interfaces:**
- Consumes: nada.
- Produces: o texto padrão de fallback, idêntico nos três pontos a menos do modo (`read-only` × `--write`). Sem catraca — prosa de comando, declarado na spec §8.

- [ ] **Step 1: `planejar-bloco.md` — o passo 1 da rota `context_required`**

Substitua a linha

```markdown
1. Carregue as ferramentas do plugin Codex (`ToolSearch "select:mcp__codex__codex"`).
```

por

```markdown
1. Carregue o Codex. Primeiro o MCP: `ToolSearch "select:mcp__codex__codex"`. Se a ferramenta não
   existir na sessão (foi o caso em 2026-09-27), use o plugin `codex-companion` por Bash, em
   background e **sem `--write`** (sandbox `read-only`, que é o que o packet exige):
   `node "$(ls -d ~/.claude/plugins/cache/openai-codex/codex/*/scripts/codex-companion.mjs | sort -V | tail -1)" task --fresh "<prompt>"`.
   O prompt é o mesmo nos dois caminhos e o contrato de saída (markers, `RECOMMENDED_TRANSITION`)
   também; quem valida é você. **Não** use o agente `codex:codex-rescue` como fallback: em
   background ele pede permissão de Bash que ninguém responde.
```

- [ ] **Step 2: `executar-bloco.md` — o gate de delegação**

Substitua

```markdown
- `executor: codex` → carregue `mcp__codex__codex` via ToolSearch e invoque a skill
  `lotus-execute-block` com `plan_path`, intervalo de tasks e commit base. Depois do report:
```

por

```markdown
- `executor: codex` → carregue o Codex — primeiro `mcp__codex__codex` via ToolSearch; ausente, o
  plugin `codex-companion` por Bash, em background e **com `--write`** (a execução delegada
  escreve): `node "$(ls -d ~/.claude/plugins/cache/openai-codex/codex/*/scripts/codex-companion.mjs | sort -V | tail -1)" task --fresh --write "<prompt>"`
  — e invoque a skill `lotus-execute-block` com `plan_path`, intervalo de tasks e commit base.
  O gate abaixo vale igual nos dois caminhos. Depois do report:
```

- [ ] **Step 3: `revisar-sprint/SKILL.md` — a revisão independente**

Substitua

```markdown
**Alto risco** → além da revisão Claude, acione uma revisão independente do Codex: carregue
`mcp__codex__codex` (read-only) e peça revisão do intervalo Git do work item contra plano, spec e
leis §5, retornando achados como `arquivo:linha — problema — impacto`. Depois:
```

por

```markdown
**Alto risco** → além da revisão Claude, acione uma revisão independente do Codex: carregue
`mcp__codex__codex` via ToolSearch; ausente, use o plugin `codex-companion` por Bash, em background
e **sem `--write`** (read-only):
`node "$(ls -d ~/.claude/plugins/cache/openai-codex/codex/*/scripts/codex-companion.mjs | sort -V | tail -1)" task --fresh "<prompt>"`.
Peça revisão do intervalo Git do work item contra plano, spec e leis §5, retornando achados como
`arquivo:linha — problema — impacto`. Depois:
```

- [ ] **Step 4: Conferir que os três pontos têm os dois caminhos**

Run: `grep -c 'codex-companion.mjs' .claude/commands/planejar-bloco.md .claude/commands/executar-bloco.md .claude/skills/revisar-sprint/SKILL.md`
Expected: `1` em cada arquivo.
Run: `grep -n 'mcp__codex__codex' .claude/commands/planejar-bloco.md .claude/commands/executar-bloco.md .claude/skills/revisar-sprint/SKILL.md`
Expected: uma ocorrência em cada, na mesma frase do fallback.
Run: `ls -d ~/.claude/plugins/cache/openai-codex/codex/*/scripts/codex-companion.mjs | sort -V | tail -1`
Expected: `/home/jvbat/.claude/plugins/cache/openai-codex/codex/1.0.6/scripts/codex-companion.mjs` (o glob resolve a versão instalada).

- [ ] **Step 5: Commit**

```bash
git add .claude/commands/planejar-bloco.md .claude/commands/executar-bloco.md .claude/skills/revisar-sprint/SKILL.md
git commit -m "docs(harness): Codex por MCP primeiro e pelo plugin codex-companion quando o MCP faltar

O MCP mcp__codex__codex nao existia na sessao de 2026-09-27 e o packet do
item 32 saiu pelo plugin. Os tres pontos que so citavam o MCP ganham o
fallback: read-only para packet e revisao, --write so na execucao delegada.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2: HSTS no `tls.conf`, com catraca

**Files:**
- Modify: `deploy/nginx/tls.conf` (server 443: nível do server, `location /assets/`, `location /`)
- Test: `frontend/tests/nginx-conf.test.ts`

**Interfaces:**
- Consumes: os helpers já existentes do teste — `limpar`, `corpo`, `servidores`, as constantes `PROD`, `TLS`, `PROXY`, `PROD_80`, `TLS_80`, `TLS_443`.
- Produces: a constante `HSTS` e os helpers `semHsts(texto)`, `nivelDoServer(servidor)` e `locations(servidor)` dentro do mesmo arquivo de teste; a linha exata do HSTS que a Task 3 prova por execução e a Task 12 prova em produção.

- [ ] **Step 1: Escrever os testes (vão reprovar)**

Em `frontend/tests/nginx-conf.test.ts`, logo depois de `const PROXY = …` (linha 85), acrescente:

```ts
/** A ÚNICA linha que o servidor 443 pode ter a mais que o prod.conf (spec do item 32, D3). */
const HSTS = 'add_header Strict-Transport-Security "max-age=31536000" always;'

/** Um corpo sem a linha do HSTS — para comparar location a location com o prod.conf. */
function semHsts(texto: string): string {
  return texto
    .split('\n')
    .filter((linha) => linha !== HSTS)
    .join('\n')
}

/** Só as diretivas do nível do server: o que está dentro de qualquer location sai. */
function nivelDoServer(servidor: string): string[] {
  const fora: string[] = []
  let nivel = 0
  for (const linha of servidor.split('\n')) {
    if (nivel === 0 && !linha.endsWith('{')) fora.push(linha)
    nivel += (linha.match(/{/g) ?? []).length
    nivel -= (linha.match(/}/g) ?? []).length
  }
  return fora
}

/** As locations de um servidor, cada uma com o próprio corpo. */
function locations(servidor: string): Array<{ cabecalho: string; corpo: string }> {
  return [...servidor.matchAll(/^location [^{]+\{/gm)].map((m) => ({
    cabecalho: m[0],
    corpo: corpo(servidor, m[0]),
  }))
}
```

Troque as duas asserções de igualdade que passam a descontar o HSTS:

```ts
  it('o cache dos assets com hash é idêntico — fora o HSTS, que só o 443 tem', () => {
    expect(semHsts(corpo(TLS_443, 'location /assets/'))).toBe(corpo(PROD_80, 'location /assets/'))
  })

  it('o fallback do SPA é idêntico — inclusive o Cache-Control do index.html — fora o HSTS', () => {
    expect(semHsts(corpo(TLS_443, 'location / {'))).toBe(corpo(PROD_80, 'location / {'))
  })
```

E acrescente, no fim do arquivo, o bloco novo:

```ts
describe('deploy/nginx/tls.conf — HSTS (item 32, D3 da spec)', () => {
  /**
   * Um ano, sem includeSubDomains (a zona tem WordPress, e-mail e o que B5 do site decidir) e
   * sem preload (não volta). `always` porque o header tem de sair também em 401/419/422/500 do
   * Laravel — sem ele o nginx só o manda em 2xx/3xx.
   */
  it('o servidor 443 manda o HSTS no nível do server', () => {
    expect(nivelDoServer(TLS_443)).toContain(HSTS)
  })

  it('o proxy do fastcgi não tem add_header nenhum — é assim que ele HERDA o HSTS do server', () => {
    expect(corpo(TLS_443, PROXY)).not.toMatch(/^add_header /m)
  })

  it('toda location do 443 que tem add_header repete o HSTS — add_header na location cancela os do server', () => {
    // Enumerada, não listada: uma location nova com Cache-Control e sem HSTS reprova aqui.
    const comAddHeader = locations(TLS_443).filter((l) => /^add_header /m.test(l.corpo))
    expect(comAddHeader.length).toBeGreaterThanOrEqual(2) // /assets/ e /
    for (const l of comAddHeader) expect(l.corpo, l.cabecalho).toContain(HSTS)
  })

  it('nem includeSubDomains nem preload', () => {
    expect(TLS).not.toMatch(/includeSubDomains|preload/)
  })

  it('o servidor 80 e o prod.conf não mandam HSTS — em HTTP o navegador o ignora, e o prod.conf é o ambiente sem TLS', () => {
    expect(TLS_80).not.toContain('Strict-Transport-Security')
    expect(PROD).not.toContain('Strict-Transport-Security')
  })
})
```

- [ ] **Step 2: Ver reprovar**

Run: `cd frontend && pnpm test --project repo tests/nginx-conf.test.ts`
Expected: FAIL em dois testes — `o servidor 443 manda o HSTS no nível do server` e `toda location do 443 que tem add_header repete o HSTS` (`/assets/` e `/` já têm `add_header`, então a contagem passa e o `toContain(HSTS)` reprova). Os demais passam, inclusive as duas igualdades com o `prod.conf`, porque `semHsts` de um corpo sem HSTS é o próprio corpo.

- [ ] **Step 3: Editar o `tls.conf`**

No servidor 443, depois de `ssl_protocols TLSv1.2 TLSv1.3;` (linha 55):

```nginx
    # HSTS de um ano (spec do item 32, D3): decidido junto com o TLS e ligado no
    # mesmo deploy. Sem includeSubDomains — a zona tem WordPress, e-mail e o que
    # o site decidir — e sem preload, que não tem volta. `always` para sair
    # também nos 401/419/422/500 do Laravel. REPETIDO nas locations abaixo que
    # têm add_header: um add_header dentro de location cancela os do server. O
    # proxy do fastcgi não tem add_header e herda este. Catraca em
    # frontend/tests/nginx-conf.test.ts; comportamento provado em
    # docs/superpowers/audits/2026-09-27-infra-producao-dns-e-tls.md.
    add_header Strict-Transport-Security "max-age=31536000" always;
```

Em `location /assets/`, depois da linha do `Cache-Control`:

```nginx
        add_header Strict-Transport-Security "max-age=31536000" always;
```

Em `location /`, depois da linha do `Cache-Control`:

```nginx
        add_header Strict-Transport-Security "max-age=31536000" always;
```

- [ ] **Step 4: Ver passar**

Run: `cd frontend && pnpm test --project repo tests/nginx-conf.test.ts`
Expected: PASS, todos.

- [ ] **Step 5: Sondas da lição 19 (as duas têm de reprovar)**

```bash
SCRATCH=/tmp/claude-1000/-home-jvbat-projetos-lotus-infra/eb38745f-65c2-447f-b934-a39fd1cfb515/scratchpad
cp deploy/nginx/tls.conf $SCRATCH/tls.conf.bak
# Sonda 1: sem `always` (o header sumiria dos erros)
sed -i 's/"max-age=31536000" always;/"max-age=31536000";/' deploy/nginx/tls.conf
(cd frontend && pnpm test --project repo tests/nginx-conf.test.ts); echo "sonda1 rc=$?"
cp $SCRATCH/tls.conf.bak deploy/nginx/tls.conf
# Sonda 2: sem a repetição em /assets/ (a herança cancelada em silêncio)
python3 - <<'EOF'
p='deploy/nginx/tls.conf'; t=open(p).read()
a='add_header Cache-Control "public, max-age=31536000, immutable";\n        add_header Strict-Transport-Security "max-age=31536000" always;'
assert a in t; open(p,'w').write(t.replace(a, a.split('\n')[0]))
EOF
(cd frontend && pnpm test --project repo tests/nginx-conf.test.ts); echo "sonda2 rc=$?"
cp $SCRATCH/tls.conf.bak deploy/nginx/tls.conf
git diff --exit-code deploy/nginx/tls.conf && echo restaurado
```

Expected: `sonda1 rc=1`, `sonda2 rc=1`, `restaurado`.

- [ ] **Step 6: Commit**

```bash
git add deploy/nginx/tls.conf frontend/tests/nginx-conf.test.ts
git commit -m "feat(tls): HSTS de um ano no servidor 443, repetido nas locations com add_header

max-age=31536000, sem includeSubDomains nem preload, always (spec do item
32, D3). A catraca compara as locations com o prod.conf descontando so esta
linha, exige a repeticao em toda location que tenha add_header e o proxy sem
add_header nenhum.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 3: Prova de comportamento do HSTS com `nginx:alpine` e abertura do audit

**Files:**
- Create: `docs/superpowers/audits/2026-09-27-infra-producao-dns-e-tls.md`

**Interfaces:**
- Consumes: `deploy/nginx/tls.conf` da Task 2.
- Produces: o audit, com a seção `## Task 3 — HSTS provado localmente`, que as Tasks 9 a 12 estendem.

- [ ] **Step 1: Subir o nginx local com o `tls.conf` e um certificado autoassinado**

```bash
SCRATCH=/tmp/claude-1000/-home-jvbat-projetos-lotus-infra/eb38745f-65c2-447f-b934-a39fd1cfb515/scratchpad
mkdir -p $SCRATCH/le/live/app.lotusotec.cl $SCRATCH/certbot
openssl req -x509 -newkey rsa:2048 -nodes -days 1 -subj '/CN=app.lotusotec.cl' \
  -keyout $SCRATCH/le/live/app.lotusotec.cl/privkey.pem \
  -out $SCRATCH/le/live/app.lotusotec.cl/fullchain.pem 2>/dev/null
docker run -d --rm --name hsts-prova -p 18080:80 -p 18443:443 \
  -v "$PWD/deploy/nginx/tls.conf:/etc/nginx/conf.d/default.conf:ro" \
  -v "$SCRATCH/le:/etc/letsencrypt:ro" -v "$SCRATCH/certbot:/var/www/certbot:ro" nginx:alpine
sleep 1; docker exec hsts-prova nginx -t
```

Expected: `nginx: configuration file /etc/nginx/nginx.conf test is successful`. (Sem `app`, o upstream `app:9000` não resolve em runtime — o `nginx -t` não resolve nomes de `fastcgi_pass`, e a resposta do proxy é 502, que é o que se quer para provar o `always`.)

- [ ] **Step 2: Medir os quatro caminhos**

```bash
for p in / /assets/nada /api/nada; do
  printf '%-14s ' "$p"; curl -sk -o /dev/null -w '%{http_code} ' "https://localhost:18443$p"
  curl -sk -D - -o /dev/null "https://localhost:18443$p" | grep -i '^strict-transport-security' || echo SEM-HSTS
done
printf '%-14s ' 'http /x'; curl -s -o /dev/null -w '%{http_code} ' http://localhost:18080/x
curl -s -D - -o /dev/null http://localhost:18080/x | grep -ic '^strict-transport-security'
docker stop hsts-prova >/dev/null
```

Expected:
```
/              200 strict-transport-security: max-age=31536000
/assets/nada   404 strict-transport-security: max-age=31536000
/api/nada      502 strict-transport-security: max-age=31536000
http /x        301 0
```
O 502 com o header é a prova do `always`; o 404 e o 200 provam a repetição nas duas locations; o 301 sem header prova que a porta 80 não o manda. (O `/` devolve 200 porque o `nginx:alpine` tem um `index.html` em `/usr/share/nginx/html`; se devolver 403 ou 404, ainda serve — o que importa é o header.)

- [ ] **Step 3: Escrever o audit**

Crie `docs/superpowers/audits/2026-09-27-infra-producao-dns-e-tls.md`:

```markdown
# Audit — `infra-producao-dns-e-tls` (item 32) — 2026-09-27

> Evidência das DoD da spec
> [`2026-09-27-infra-producao-dns-e-tls-design.md`](../../specs/archive/2026-09-27-infra-producao-dns-e-tls-design.md).
> Do `.env` de produção só se registra nome de chave, nunca valor. Escritas na AWS e no host são do
> João; a sessão lê e confere.

## Task 3 — HSTS provado localmente

`nginx:alpine` com o `deploy/nginx/tls.conf` de `<sha da Task 2>` como `default.conf`, certificado
autoassinado em `live/app.lotusotec.cl/`, sem `app` (o proxy devolve 502), em <data e hora>.
`nginx -t`: `test is successful`.

| Pedido | Código | `Strict-Transport-Security` |
|---|---|---|
| `https://…/` | 200 | `max-age=31536000` |
| `https://…/assets/nada` | 404 | `max-age=31536000` |
| `https://…/api/nada` | 502 | `max-age=31536000` — prova o `always` |
| `http://…/x` | 301 | ausente |

Sondas da lição 19 (Task 2): sem `always` → catraca reprova; sem a repetição em `/assets/` →
catraca reprova.
```

Preencha o SHA e a hora reais.

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/audits/2026-09-27-infra-producao-dns-e-tls.md
git commit -m "docs(item-32): audit aberto com o HSTS provado por execucao no nginx:alpine

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 4: o hook de renovação `deploy/bin/recarregar-nginx.sh`, com catraca

**Files:**
- Create: `deploy/bin/recarregar-nginx.sh`
- Test: `frontend/tests/recarregar-nginx.test.ts`

**Interfaces:**
- Consumes: o projeto compose `lotus` e os dois arquivos que o `compose()` do `deploy.sh` usa (`docker-compose.prod.yml`, `docker-compose.prod-tls.yml`).
- Produces: `/opt/lotus/bin/recarregar-nginx.sh` no host (instalado pelo §7 na Task 10) e o symlink `/etc/letsencrypt/renewal-hooks/deploy/recarregar-nginx.sh` (Task 11). A conferência de alinhamento passa a exigi-lo no host sem mudança em `.github/scripts/conferir-alinhamento.sh` (ela itera `deploy/bin/*.sh` da `main`).

- [ ] **Step 1: Escrever a catraca (vai reprovar — o arquivo não existe)**

`frontend/tests/recarregar-nginx.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

/**
 * `deploy/bin/recarregar-nginx.sh` é o deploy hook do certbot (runbook §11): certificado renovado
 * em /etc/letsencrypt, nginx recarrega. Até o item 32 o hook existia só como texto no runbook —
 * com `restart nginx`, que derruba a 443 a cada renovação — fora do repositório e fora da
 * conferência de alinhamento do botão. Agora mora em `deploy/bin/`, então a conferência o exige
 * no host como aos outros, e esta catraca guarda o que o texto não segurava (lição 19).
 *
 * Textual, como `deploy-sh.test.ts`: o comportamento se prova executando o hook em produção
 * (Task 11 do plano do item 32).
 */
const RAIZ = resolve(__dirname, '..', '..')
const CAMINHO = join(RAIZ, 'deploy', 'bin', 'recarregar-nginx.sh')
const SCRIPT = readFileSync(CAMINHO, 'utf8')
const semComentarios = SCRIPT.split(/\r?\n/)
  .filter((linha) => !/^\s*#/.test(linha))
  .join('\n')
/** O comando inteiro numa linha, com as continuações `\` coladas. */
const comando = semComentarios.replace(/\\\n\s*/g, ' ')

describe('deploy/bin/recarregar-nginx.sh', () => {
  it('é executável', () => {
    expect(statSync(CAMINHO).mode & 0o111).not.toBe(0)
  })

  it('falha alto em erro, variável indefinida e pipe quebrado', () => {
    expect(semComentarios).toMatch(/^set -euo pipefail$/m)
  })

  it('fala com o MESMO projeto compose do deploy.sh — -p lotus, /opt/lotus e os dois arquivos', () => {
    // Sem o -p e os dois -f o compose não acha o serviço `nginx` que o deploy.sh subiu.
    expect(semComentarios).toMatch(/^BASE=\/opt\/lotus$/m)
    expect(comando).toMatch(/docker compose -p lotus --project-directory "\$BASE"/)
    expect(comando).toContain('-f "$BASE/docker-compose.prod.yml"')
    expect(comando).toContain('-f "$BASE/docker-compose.prod-tls.yml"')
  })

  it('testa a conf ANTES de recarregar, no mesmo comando — conf ou certificado quebrado não derruba o nginx', () => {
    expect(comando).toMatch(/exec -T nginx sh -c 'nginx -t && nginx -s reload'/)
  })

  it('recarrega, nunca reinicia — restart/stop/down/up derrubam a 443 na renovação', () => {
    expect(comando).not.toMatch(/\b(restart|stop|down|up)\b/)
  })
})
```

- [ ] **Step 2: Ver reprovar**

Run: `cd frontend && pnpm test --project repo tests/recarregar-nginx.test.ts`
Expected: FAIL com `ENOENT … deploy/bin/recarregar-nginx.sh`.

- [ ] **Step 3: Escrever o hook**

`deploy/bin/recarregar-nginx.sh`:

```bash
#!/usr/bin/env bash
#
# Deploy hook do certbot (runbook deploy/aws/README.md, secao 11): o
# certificado de /etc/letsencrypt foi renovado, o nginx recarrega para ler o
# novo. Ligado por symlink em /etc/letsencrypt/renewal-hooks/deploy/.
#
# Reload, nunca restart: restart derruba a 443 a cada renovacao. O `nginx -t`
# antes do reload e' o que barra a troca se o certificado ou a conf estiverem
# quebrados -- o nginx segue com o certificado anterior, que ainda tem ~30
# dias, e o certbot registra a falha do hook.
#
# `-p lotus` e os dois composes sao os mesmos do compose() do deploy.sh; sem
# eles o compose nao acha o servico. `exec` nao cria container, entao as
# variaveis de imagem nao entram.
#
# Catraca: frontend/tests/recarregar-nginx.test.ts. Conferido no host pelo
# botao como todo deploy/bin/*.sh (item 31).
set -euo pipefail

BASE=/opt/lotus

docker compose -p lotus --project-directory "$BASE" \
  -f "$BASE/docker-compose.prod.yml" -f "$BASE/docker-compose.prod-tls.yml" \
  exec -T nginx sh -c 'nginx -t && nginx -s reload'
```

Run: `chmod +x deploy/bin/recarregar-nginx.sh && bash -n deploy/bin/recarregar-nginx.sh && echo sintaxe-ok`
Expected: `sintaxe-ok`.

- [ ] **Step 4: Ver passar**

Run: `cd frontend && pnpm test --project repo tests/recarregar-nginx.test.ts`
Expected: PASS, 5 testes.

- [ ] **Step 5: Sondas da lição 19**

```bash
SCRATCH=/tmp/claude-1000/-home-jvbat-projetos-lotus-infra/eb38745f-65c2-447f-b934-a39fd1cfb515/scratchpad
cp deploy/bin/recarregar-nginx.sh $SCRATCH/hook.bak
sed -i "s/'nginx -t \&\& nginx -s reload'/'nginx -s reload'/" deploy/bin/recarregar-nginx.sh
(cd frontend && pnpm test --project repo tests/recarregar-nginx.test.ts); echo "sonda1 rc=$?"
cp $SCRATCH/hook.bak deploy/bin/recarregar-nginx.sh
sed -i "s/exec -T nginx sh -c 'nginx -t \&\& nginx -s reload'/restart nginx/" deploy/bin/recarregar-nginx.sh
(cd frontend && pnpm test --project repo tests/recarregar-nginx.test.ts); echo "sonda2 rc=$?"
cp $SCRATCH/hook.bak deploy/bin/recarregar-nginx.sh
git diff --exit-code deploy/bin/recarregar-nginx.sh; git status --short deploy/bin
```

Expected: `sonda1 rc=1`, `sonda2 rc=1`; o último `git status` mostra o arquivo como novo (`??` ou `A`), sem diff contra o que será commitado.

- [ ] **Step 6: A conferência de alinhamento o vê sem mudança**

Run: `cd frontend && pnpm test --project repo tests/conferir-alinhamento.test.ts`
Expected: PASS (a catraca itera `deploy/bin/*.sh` por glob e continua verde com quatro scripts).

- [ ] **Step 7: Commit**

```bash
git add deploy/bin/recarregar-nginx.sh frontend/tests/recarregar-nginx.test.ts
git commit -m "feat(deploy): hook de renovacao do certbot versionado, com nginx -t antes do reload

Sai do texto do runbook (que mandava restart) para deploy/bin/, onde a
conferencia de alinhamento do botao o exige no host. Reload, nunca restart;
conf ou certificado quebrado nao derruba o nginx.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 5: `env.prod.example` em https, com catraca dos seis valores

**Files:**
- Modify: `deploy/aws/env.prod.example:15` (`APP_URL`) e `:82` (`FRONTEND_URL`)
- Test: `frontend/tests/env-prod-example.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces: o molde com os seis valores do §11, que a Task 6 cita e a Task 10 copia para o host.

- [ ] **Step 1: Escrever a catraca (vai reprovar em dois casos)**

`frontend/tests/env-prod-example.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

/**
 * `deploy/aws/env.prod.example` é duas coisas: a referência de NOMES de chave do botão (a
 * conferência de alinhamento do item 31 lê os nomes do host e os compara com o molde) e a
 * referência de VALORES do humano que instala pelo runbook §7/§11. O botão fecha a primeira; nada
 * fechava a segunda — e foi assim que `APP_URL` e `FRONTEND_URL` ficaram em `http://` enquanto o
 * §11 e o resto do molde já diziam https (achado do item 32).
 *
 * Os seis campos abaixo são os do §11: os que viram quando o TLS entra.
 */
const RAIZ = resolve(__dirname, '..', '..')
const MOLDE = readFileSync(join(RAIZ, 'deploy', 'aws', 'env.prod.example'), 'utf8')
const LINHAS = MOLDE.split(/\r?\n/)
const ATRIBUICAO = /^[A-Za-z_][A-Za-z0-9_]*=/
const ATRIBUICOES = LINHAS.filter((linha) => ATRIBUICAO.test(linha))

function valorDe(chave: string): string {
  const linha = ATRIBUICOES.find((l) => l.startsWith(`${chave}=`))
  if (linha === undefined) throw new Error(`chave ausente no molde: ${chave}`)
  return linha.slice(chave.length + 1)
}

const DOMINIO = 'app.lotusotec.cl'

describe('deploy/aws/env.prod.example — os seis campos do runbook §11', () => {
  it.each([
    ['APP_URL', `https://${DOMINIO}`],
    ['FRONTEND_URL', `https://${DOMINIO}`],
    ['CERTIFICATE_VALIDATION_URL', `https://${DOMINIO}`],
    ['SANCTUM_STATEFUL_DOMAINS', DOMINIO],
    ['SESSION_DOMAIN', DOMINIO],
    ['SESSION_SECURE_COOKIE', 'true'],
  ])('%s=%s', (chave, esperado) => {
    expect(valorDe(chave)).toBe(esperado)
  })

  it('nenhuma chave duplicada — o botão lê nomes, e no container a segunda ocorrência venceria em silêncio', () => {
    const nomes = ATRIBUICOES.map((l) => l.slice(0, l.indexOf('=')))
    expect(new Set(nomes).size).toBe(nomes.length)
  })

  it('nenhum valor continua na linha seguinte — o corte por `=` do botão é linha a linha (§7)', () => {
    const soltas = LINHAS.filter((l) => l !== '' && !/^\s*#/.test(l) && !ATRIBUICAO.test(l))
    expect(soltas).toEqual([])
  })
})
```

- [ ] **Step 2: Ver reprovar**

Run: `cd frontend && pnpm test --project repo tests/env-prod-example.test.ts`
Expected: FAIL só em `APP_URL=https://app.lotusotec.cl` e `FRONTEND_URL=https://app.lotusotec.cl` (`expected 'http://app.lotusotec.cl' to be 'https://app.lotusotec.cl'`). Os outros 6 passam (medido em 2026-09-27: o molde não tem chave duplicada nem linha solta).

- [ ] **Step 3: Corrigir o molde**

Linha 15: `APP_URL=http://app.lotusotec.cl` → `APP_URL=https://app.lotusotec.cl`.
Linha 82: `FRONTEND_URL=http://app.lotusotec.cl` → `FRONTEND_URL=https://app.lotusotec.cl`.
Se o comentário acima de qualquer uma das duas justificar o `http://`, atualize-o para dizer que o molde é o estado **com TLS** e que a fase sem DNS do §7 troca os valores à mão.

- [ ] **Step 4: Ver passar**

Run: `cd frontend && pnpm test --project repo tests/env-prod-example.test.ts`
Expected: PASS, 8 testes.

- [ ] **Step 5: Commit**

```bash
git add deploy/aws/env.prod.example frontend/tests/env-prod-example.test.ts
git commit -m "fix(deploy): APP_URL e FRONTEND_URL do molde em https, com catraca dos seis campos do TLS

O molde ja dizia https no CERTIFICATE_VALIDATION_URL e no runbook, e http
nos dois campos que o navegador e o Sanctum leem. Nada guardava valor no
molde; agora a catraca guarda os seis do runbook secao 11.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 6: runbook §7 e §11, lição 19 e P-77

**Files:**
- Modify: `deploy/aws/README.md` (§7 linhas 175 e 183; §11 inteiro, linhas 533–638)
- Modify: `docs/README.md:127` (lição 19, no fim do parágrafo)
- Modify: `docs/superpowers/pendencias/abertas.md:820-854` (P-77) e `docs/superpowers/pendencias/README.md:86`

**Interfaces:**
- Consumes: Tasks 2, 4 e 5 (é o que o §11 descreve).
- Produces: o §11 que o João segue na Task 10 e 11.

- [ ] **Step 1: §7 — o hook no `scp` e no `mv`**

Linha 175 passa a:

```bash
scp -i "$PEM" deploy/bin/deploy.sh deploy/bin/backup-db.sh deploy/bin/verificar-backup.sh deploy/bin/recarregar-nginx.sh ubuntu@<EIP>:/tmp/
```

Linha 183 passa a:

```bash
sudo mv /tmp/deploy.sh /tmp/backup-db.sh /tmp/verificar-backup.sh /tmp/recarregar-nginx.sh /opt/lotus/bin/ && sudo sh -c 'chmod +x /opt/lotus/bin/*.sh'
```

- [ ] **Step 2: §11 — substituir a seção inteira**

Substitua tudo de `## 11. TLS — quando o registro A chegar` até a linha antes de `## 12. Critério de resize` por:

````markdown
## 11. TLS — o registro A, o certificado e a renovação

O nome público da intranet é **`app.lotusotec.cl`** (ADR-14, emenda de 2026-09-27). A zona
`lotusotec.cl` vive no Route 53 desde 2026-09-26 e é um stack do repositório `Andred21/lotus-site`
(`infra/lotus-dns.yaml`, stack `lotus-dns` em `us-east-1`). **O registro nasce por PR lá**, nunca à
mão no console: registro fora do template é drift, e o próximo deploy do stack não o corrige. A zona
não tem wildcard, então "o nome resolve" e "o nome resolve o EIP" passaram a ser a mesma coisa —
mas a prova registrada é o valor, não a resposta.

Não há `dig` no WSL; a leitura de fora é por DNS-over-HTTPS:

```bash
curl -s 'https://dns.google/resolve?name=app.lotusotec.cl&type=A' | python3 -m json.tool | grep '"data"'      # "18.230.53.197", e só ele
curl -s 'https://dns.google/resolve?name=app.lotusotec.cl&type=AAAA' | python3 -m json.tool | grep -c '"data"' # 0 — o EIP não tem IPv6
```

**Restrição cruzada com a CAA do site.** A zona não publica `CAA` hoje (`D-49` do lotus-site). Quando
publicar, ela tem de listar **`letsencrypt.org` além de `amazon.com`** — e continuar listando depois
que o certificado wildcard do WordPress (`D-51` de lá) deixar de existir —, porque `app` é emitido e
renovado pelo Let's Encrypt, por HTTP-01, a cada ~60 dias. Uma `CAA` só com `amazon.com` não derruba
nada na hora: a renovação falha em silêncio e o certificado expira até 90 dias depois.

A ordem abaixo é a da spec do item 32 (§6). Tudo que escreve no host é do João; os portões são
leituras.

### 11.1 Antes de parar o nginx — dois portões e uma reinstalação

1. **DNS de fora igual ao EIP** (os dois `curl` acima). Sem isto o `--standalone` falha na
   validação e consome uma das 5 tentativas por hora que o Let's Encrypt concede ao nome.
2. **Security group** `lotus-web` com 80 e 443 abertos ao mundo (§5). Confere; não alarga:

   ```bash
   aws ec2 describe-security-groups --region sa-east-1 --filters Name=group-name,Values=lotus-web \
     --query 'SecurityGroups[0].IpPermissions[].[FromPort,IpRanges[0].CidrIp]' --output text
   ```

E o host tem de estar **reinstalado pelo §7** a partir de uma árvore igual à `main` do corporativo
— inclusive `bin/recarregar-nginx.sh` e o `tls.conf` com HSTS —, senão o botão do 11.4 recusa.

### 11.2 Emitir o certificado (uma vez, com o nginx parado)

```bash
sudo apt-get install -y certbot
sudo docker compose -p lotus --project-directory /opt/lotus -f /opt/lotus/docker-compose.prod.yml stop nginx
sudo certbot certonly --standalone -d app.lotusotec.cl --agree-tos -m <e-mail> --non-interactive
sudo test -f /etc/letsencrypt/live/app.lotusotec.cl/fullchain.pem && echo certificado ok
```

A partir do `stop nginx` a produção está fora do ar, até o fim do 11.4 — minutos. O último comando é
portão: o `deploy.sh` liga o overlay quando `/etc/letsencrypt/live` **é diretório**, e um `live/`
vazio (emissão que morreu no meio) subiria o nginx apontando para um certificado que não existe.
Falhou? `sudo docker compose -p lotus --project-directory /opt/lotus -f /opt/lotus/docker-compose.prod.yml start nginx`
e nada mudou.

### 11.3 Os seis campos do `.env`

```bash
sudo -e /opt/lotus/.env
```

| Campo | Fase sem DNS (§7) | Agora |
|---|---|---|
| `APP_URL` | `http://<EIP>` | `https://app.lotusotec.cl` |
| `FRONTEND_URL` | `http://<EIP>` | `https://app.lotusotec.cl` |
| `CERTIFICATE_VALIDATION_URL` | vazia | `https://app.lotusotec.cl` |
| `SANCTUM_STATEFUL_DOMAINS` | `<EIP>` | `app.lotusotec.cl` |
| `SESSION_DOMAIN` | `null` (literal) | `app.lotusotec.cl` |
| `SESSION_SECURE_COOKIE` | `false` | `true` |

São os valores do molde `deploy/aws/env.prod.example`, guardados pela catraca
`frontend/tests/env-prod-example.test.ts`. Os dois últimos são os que mordem em silêncio.
`SESSION_SECURE_COOKIE` ausente **não** equivale a `false`: `session.php:172` lê
`env('SESSION_SECURE_COOKIE')` sem default, a ausência vira null, e o cookie de sessão do Sanctum
passa a viajar em claro sob TLS sem aparecer em diff nenhum (lei §5.4). E o
`CERTIFICATE_VALIDATION_URL` não é infra: é a base do QR do certificado, que a cópia distribuída do
PDF carrega para sempre — **só com ele preenchido em https o backend volta a emitir e a entregar
PDF**. Não herda o `FRONTEND_URL`, de propósito (P-79).

### 11.4 Subir com o overlay — pelo botão

Promova pelo botão do corporativo (§8) o SHA `X` da `main` do corporativo — o mesmo da árvore
reinstalada no 11.1 (§7). `CURRENT_SHA` só serve se já for ele: promover outro SHA compara um
`nginx/tls.conf` diferente do host, e o botão recusa (`.github/scripts/conferir-alinhamento.sh:59`).
A conferência de alinhamento passa porque o §7 foi refeito; o `deploy.sh` vê o `live/` e sobe com o
overlay; o nginx volta em 80 e 443, **já com HSTS de um ano** (`Strict-Transport-Security:
max-age=31536000`, sem `includeSubDomains` nem `preload` — decidido na spec do item 32). Fim da
queda.

Provas, de fora, nesta ordem:

```bash
curl -s -o /dev/null -w '%{http_code}\n' https://app.lotusotec.cl/up               # 200
curl -sI http://app.lotusotec.cl/inicio | grep -iE '^(HTTP|location)'             # 301 … Location: https://app.lotusotec.cl/inicio
curl -s -o /dev/null -w '%{http_code}\n' http://app.lotusotec.cl/up                # 200 — isento do redirect
curl -sI https://app.lotusotec.cl/up | grep -i '^strict-transport-security'        # max-age=31536000
curl -sI https://app.lotusotec.cl/ | grep -i '^strict-transport-security'          # idem — a location repete
curl -si https://app.lotusotec.cl/sanctum/csrf-cookie | grep -i '^set-cookie'      # … secure; … domain=app.lotusotec.cl
```

O `/up` na 80 responde **200**, e não 301: o `tls.conf` isenta esse caminho do redirect de
propósito, porque o healthcheck do nginx e o gate pós-deploy do `deploy.sh` falam HTTP puro na
127.0.0.1 (Q-1 do review de 2026-09-20). Se ele voltar a redirecionar, o deploy morre logo após o
`up -d` — e a catraca `frontend/tests/nginx-conf.test.ts` existe para que isso não chegue ao host.

**HSTS é compromisso.** Depois que um navegador viu o header, ele recusa `http://app.lotusotec.cl`
por um ano. Não existe "voltar para HTTP"; o recuo de um TLS quebrado é consertar o TLS.

**Recuo de emergência do deploy** — só serve **antes** de qualquer navegador ter visto o HSTS, isto
é, quando o `deploy.sh` abortou com o nginx `unhealthy` e a 443 nunca respondeu. Cuidado: com o app
quebrado a 443 pode ter respondido mesmo assim (um 502, por exemplo) e o header sai igual, porque o
`add_header ... always` do `tls.conf` não depende do upstream estar de pé — o teste real não é "a
443 respondeu", é "nenhum navegador chegou a ver o HSTS":

```bash
sudo mv /opt/lotus/nginx/tls.conf /opt/lotus/nginx/tls.conf.off
# os seis campos de volta aos valores da coluna "Fase sem DNS" da tabela acima
sudo /opt/lotus/bin/deploy.sh <X — o sha de 40 hexadecimais do 11.4>
```

O botão passa a recusar (`nginx/tls.conf ausente`) até o conserto — é o esperado, não um defeito.

### 11.5 Passar a renovação para webroot

Sem isto o certificado expira em 90 dias, calado. O certbot grava em
`/etc/letsencrypt/renewal/app.lotusotec.cl.conf` o **authenticator da emissão**, e o `renew` repete
o que está lá. Emitido em `--standalone`, o `renew` tentaria ligar na porta 80 — que agora é do
nginx, de pé — e falharia. O `tls.conf` serve `/.well-known/acme-challenge/` a partir de
`/opt/lotus/certbot`, montado `:ro` no container pelo overlay; quem escreve lá é o certbot do host.

```bash
sudo mkdir -p /opt/lotus/certbot && sudo chmod 755 /opt/lotus/certbot     # já existe pelo §7; o 755 é o que importa
sudo certbot reconfigure --cert-name app.lotusotec.cl --webroot -w /opt/lotus/certbot
grep -E '^(authenticator|webroot_path)' /etc/letsencrypt/renewal/app.lotusotec.cl.conf
```

Sem `-d`: o `reconfigure` recusa qualquer `-d` (existe desde o
certbot 2.3; o noble tem 2.9.0). Ele ensaia por conta própria uma renovação em dry-run pelo webroot
e só grava a configuração se o ensaio passar — é a prova antecipada de que o challenge está sendo
servido pelo nginx, sem gastar uma emissão real. Por isso `certonly --keep-until-expiring` não serve
aqui: com o certificado ainda longe do vencimento ele sai "Certificate not yet due for renewal; no
action taken." e **nunca chega a reescrever** `/etc/letsencrypt/renewal/app.lotusotec.cl.conf`
(certbot 2.9.0, `main.py:1592-1598`) — o `grep` acima mostraria `standalone` para sempre.

O `grep` tem de imprimir `authenticator = webroot`. **Se o `reconfigure` falhar**, foi o dry-run que
reprovou: confira o `755` do diretório e se o nginx está de fato servindo
`/.well-known/acme-challenge/` a partir dele — a configuração antiga fica intacta, nada foi
sobrescrito.

O 755 do diretório não é detalhe: quem lê o challenge é o **worker** do nginx (uid 101), não o
master, e `/opt/lotus` é `750 root:root`. O bind mount não carrega a permissão do pai, mas carrega a
do próprio diretório.

### 11.6 O hook de recarga

O hook é `deploy/bin/recarregar-nginx.sh` — versionado, instalado em `/opt/lotus/bin/` pelo §7 e
conferido pelo botão como os outros scripts. Faz `nginx -t && nginx -s reload` dentro do container:
reload, nunca `restart` (que derruba a 443 a cada renovação), e o `-t` barra a troca se o
certificado ou a conf estiverem quebrados — o nginx segue com o anterior, que ainda tem ~30 dias. O
certbot o encontra por symlink:

```bash
sudo ln -sfn /opt/lotus/bin/recarregar-nginx.sh /etc/letsencrypt/renewal-hooks/deploy/recarregar-nginx.sh
sudo /etc/letsencrypt/renewal-hooks/deploy/recarregar-nginx.sh; echo "rc=$?"
```

Esperado: `nginx: configuration file /etc/nginx/nginx.conf test is successful` e `rc=0`, e um
`curl -s -o /dev/null -w '%{http_code}' https://app.lotusotec.cl/up` rodando de fora durante e depois
segue 200. **Executar o symlink é a prova**, porque `certbot renew --dry-run` não roda deploy hook.
Dois limites: o symlink **não** entra na conferência do botão (só o arquivo em `bin/`), então um
symlink apagado só aparece na renovação; e o `chmod +x` do §7 é passo humano — a conferência compara
conteúdo, não permissão.

### 11.7 O gate — e ele é gate, não formalidade

```bash
sudo certbot renew --dry-run
systemctl is-active certbot.timer     # active
```

Tem de passar **com o nginx de pé** — é o ensaio da renovação real, e é a única prova de que a
cadeia toda funciona: authenticator certo, diretório com a permissão certa, e o `tls.conf` servindo
o challenge sem redirecionar. Reprovando aqui, o certificado morre em 90 dias sem uma linha de
aviso. Backup que nunca restaurou não é backup; renovação que nunca ensaiou não é renovação
(lição 1). **Não há alarme de expiração** até o item 34: entre uma renovação falhada e o vencimento
há ~30 dias que ninguém mede.
````

- [ ] **Step 3: Lição 19 — os dois pares novos**

No fim do parágrafo da lição 19 (`docs/README.md:127`, depois de "…sem depender de nenhuma palavra do fonte."), acrescente:

```markdown
 **Emenda de 2026-09-27 (item 32):** dois pares nominais novos, `deploy/bin/recarregar-nginx.sh` ↔ `frontend/tests/recarregar-nginx.test.ts` (o hook de renovação, que até aqui era texto no runbook — com `restart` — fora do repositório e da conferência do botão) e `deploy/aws/env.prod.example` ↔ `frontend/tests/env-prod-example.test.ts` (o molde era referência de **nomes** para o botão e de **valores** para o humano, e só a primeira tinha catraca: `APP_URL` e `FRONTEND_URL` ficaram em `http://` contra o próprio runbook). E o `nginx-conf.test.ts` passou a exigir que toda location do 443 com `add_header` repita o HSTS — a herança de `add_header` no nginx é o tipo de regra que comentário não segura.
```

- [ ] **Step 4: P-77 reescrita**

Substitua a ficha inteira (`docs/superpowers/pendencias/abertas.md`, de `## P-77` até a linha antes de `## P-31`) por:

```markdown
## P-77 — `app.lotusotec.cl` não tem registro A; sem ele a produção fica em HTTP, sem cookie `Secure` e sem emitir certificado

**Bloco:** `infra-producao-dns-e-tls` (item 32, promovido em 2026-09-27) · **Quem decide:** João ·
**Gatilho:** `app.lotusotec.cl` resolver **exatamente** o EIP `18.230.53.197`, sem AAAA, **e** o §11
do `deploy/aws/README.md` executado de ponta a ponta — certificado, seis campos do `.env`, promoção
pelo botão com HSTS, renovação por webroot com o hook, `certbot renew --dry-run` verde. Revisar em
**2026-10-31**.

**Reescrita em 2026-09-27 (planejamento do item 32).** A ficha original dizia que o registro era
pedido à Lotus/agência, que a zona vivia em `ns1–ns4.stackdns.com` sem acesso ao painel e que um
curinga `*.lotusotec.cl` fazia qualquer nome resolver para o WordPress. Nada disso vale mais: desde
2026-09-26 a zona está no Route 53 (stack `lotus-dns`, repo `Andred21/lotus-site`), **sem
wildcard**, e o registro nasce por PR em `infra/lotus-dns.yaml` de lá — nunca à mão no console.
Medido em 2026-09-27: `app.lotusotec.cl` **não resolve** (não há registro). O nome que a ficha
antiga media, `sistema.`, é hoje registro explícito para o WordPress e não muda neste bloco.

| Registro | Valor em 2026-09-27 | |
|---|---|---|
| `A app` | — (não existe) | nasce pela PR do item 32 no `lotus-site` |
| `AAAA app` | — | não nasce: o EIP não tem IPv6 |
| EIP da produção | `18.230.53.197` | — |

Enquanto o registro não existe, a produção atende em `http://18.230.53.197` e **recusa emitir e
baixar certificado** — `CERTIFICATE_VALIDATION_URL` vazio, 500 nomeado da P-79 (item 29). O overlay
`docker-compose.prod-tls.yml`, o `deploy/nginx/tls.conf` e a catraca deles estão no repositório
desde 2026-09-20 e nunca foram exercidos com certificado real. **A prova continua sendo a
igualdade**: o audit do item 32 registra o valor devolvido, não o fato de haver resposta.
```

E a linha da P-77 no índice (`docs/superpowers/pendencias/README.md:86`) passa a:

```markdown
| P-77 | `app.lotusotec.cl` não tem registro A (medido 2026-09-27: não resolve); sem ele a produção fica em HTTP, sem cookie `Secure` e sem emitir certificado | João | item 32: registro por PR no `lotus-site` + §11 do runbook de ponta a ponta; revisar 2026-10-31 |
```

- [ ] **Step 5: Conferir referências e suíte de docs**

Run: `grep -n 'reload-nginx\|StackDNS\|stackdns\|agência\|curinga' deploy/aws/README.md`
Expected: nenhuma linha no §11 (as ocorrências restantes, se houver, são de outras seções e ficam).
Run: `cd frontend && pnpm test --project repo tests/repo-docs-refs.test.ts tests/nginx-conf.test.ts tests/recarregar-nginx.test.ts tests/env-prod-example.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add deploy/aws/README.md docs/README.md docs/superpowers/pendencias/abertas.md docs/superpowers/pendencias/README.md
git commit -m "docs(runbook): secao 11 do TLS reescrita na ordem da spec do item 32; P-77 e licao 19

Registro por PR no lotus-site, sem agencia nem StackDNS nem wildcard; dois
portoes antes de parar o nginx; promocao pelo botao com HSTS; webroot; hook
versionado por symlink e provado por execucao; recuo de emergencia; a
restricao cruzada da CAA. P-77 reescrita com a medicao de 2026-09-27.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 7: PR do `lotus-infra`, merge e espelho

**Files:** nenhum novo.

**Interfaces:**
- Consumes: Tasks 1 a 6.
- Produces: `X` = o SHA da `main` do corporativo que a Task 10 promove; os quatro scripts e o `tls.conf` que o §7 instala.

- [ ] **Step 1: Suíte inteira e build**

Run: `cd frontend && pnpm test --project repo && pnpm build`
Expected: PASS; build verde (o `tsc -b` type-checa os testes novos).

- [ ] **Step 2: Abrir a PR**

```bash
git push -u origin infra/producao-dns-e-tls
gh pr create --fill --title "infra(item-32): HSTS, hook de renovacao versionado, molde em https e runbook do TLS"
```

Corpo da PR: os seis commits em uma linha cada, o link da spec, e a frase "Fase A do item 32; a fase B (produção) começa depois do espelho. Merge trava o botão até a reinstalação do §7, por causa do `bin/recarregar-nginx.sh` novo — esperado." Termina com `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.

- [ ] **Step 3: CI verde e merge (o João decide o momento)**

Run: `gh pr checks --watch`
Expected: todos verdes.
Merge pelo caminho do `CONTRIBUINDO.md` (`gh pr merge --merge`), e o espelho:

```bash
git fetch origin && git log -1 --format=%H origin/main    # este é X
scripts/espelhar-corporativo.sh --simular
scripts/espelhar-corporativo.sh
```

Expected: o espelho publica `X` e o workflow do corporativo constrói as três imagens do SHA. Anote `X` (40 hexadecimais) no audit, seção `## Task 7 — integração`.

- [ ] **Step 4: Confirmar o trio no GHCR**

Run: `gh run list -R Gatika-CL/lotus --commit X --limit 3`
Expected: o run de imagens de `X` em `completed / success`. (O botão confere o trio de novo antes de promover.)

---

### Task 8: PR do `lotus-site` — registro `A app`, `Retain` da D-52 e catraca

**Files (no `lotus-site`):**
- Modify: `infra/lotus-dns.yaml` (Parameters; recurso `Registros`; `RecordSets`)
- Modify: `scripts/infra/lib/zona.mjs` (`INVENTARIO`; `lerPoliticasDaZona` → `lerPoliticasDoRecurso`)
- Test: `scripts/infra/zona.test.mjs`
- Modify: `docs/infra/zona-dns-lotusotec.md`, `docs/adr/ADR-SITE-006.md`, `docs/superpowers/backlog.md` (D-49; D-52 fecha na Task 9)

**Interfaces:**
- Consumes: `origin/main` do `lotus-site` **com o B2 mesclado**.
- Produces: `export function lerPoliticasDoRecurso(texto, recurso)` → `{ deletionPolicy, updateReplacePolicy }`; `lerPoliticasDaZona(texto)` mantida como `lerPoliticasDoRecurso(texto, 'Zona')`; a entrada `app.lotusotec.cl.` / `A` / `['18.230.53.197']` no `INVENTARIO`; o template que a Task 9 deploya.

- [ ] **Step 1: Portão — a `main` do site já tem o B2**

```bash
cd /home/jvbat/projetos/lotus-site && git fetch -q origin
git show origin/main:infra/lotus-dns.yaml | grep -c amazonses
```

Expected: `5` (três CNAME de DKIM, o MX e o TXT de `ses.`). **Menos que 5 → PARE**: o B2 ainda não foi mesclado, e uma PR daqui apagaria os seis registros do SES no deploy (spec §1.3). Espere o merge; a fase A do `lotus-infra` (Tasks 1–7) não depende disto.

- [ ] **Step 2: Worktree e branch**

```bash
git -C /home/jvbat/projetos/lotus-site worktree add /home/jvbat/projetos/lotus-site-dns -b infra/registro-app-intranet origin/main
cd /home/jvbat/projetos/lotus-site-dns && pnpm install --frozen-lockfile
```

- [ ] **Step 3: Escrever os testes (vão reprovar)**

Em `scripts/infra/zona.test.mjs`, no import de `./lib/zona.mjs`, acrescente `lerPoliticasDoRecurso`. No `describe('leitura textual do template')`, dentro de `it('lê o Default de cada parâmetro')`, acrescente:

```js
    expect(parametros.get('IpDaIntranet')).toBe('18.230.53.197')
```

No `describe('infra/lotus-dns.yaml contra o inventário medido')`, depois de `it('protege a zona contra delete-stack')`, acrescente:

```js
  it('protege os registros contra delete-stack (D-52)', () => {
    // A zona já era Retain; os registros não. Um delete-stack apagaria MX,
    // SPF e o resto e deixaria a zona retida vazia, com o e-mail fora do ar.
    expect(lerPoliticasDoRecurso(TEMPLATE, 'Registros')).toEqual({
      deletionPolicy: 'Retain',
      updateReplacePolicy: 'Retain',
    })
  })

  it('lerPoliticasDaZona continua sendo o recurso Zona', () => {
    expect(lerPoliticasDaZona(TEMPLATE)).toEqual(
      lerPoliticasDoRecurso(TEMPLATE, 'Zona'),
    )
  })

  it('reprova recurso que não existe em vez de devolver políticas vazias', () => {
    expect(() => lerPoliticasDoRecurso(TEMPLATE, 'NaoExiste')).toThrow(
      /NaoExiste/,
    )
  })

  it('app tem A para o EIP da intranet e NÃO tem AAAA — o EIP não tem IPv6', () => {
    const app = registros.filter(
      (registro) => registro.nome === 'app.lotusotec.cl.',
    )
    expect(app.map((registro) => registro.tipo)).toEqual(['A'])
    expect(app[0]?.valores).toEqual(['18.230.53.197'])
  })
```

- [ ] **Step 4: Ver reprovar**

Run: `pnpm vitest run scripts/infra/zona.test.mjs`
Expected: FAIL — `lerPoliticasDoRecurso` não exportado (o arquivo inteiro reprova na importação).

- [ ] **Step 5: `zona.mjs` — leitor de políticas por recurso e `app` no inventário**

Substitua a função `lerPoliticasDaZona` por:

```js
/**
 * As duas políticas de um recurso de `Resources:`. Para `Zona`, apagar e
 * recriar dá nameservers novos, e são eles que o registrador aponta. Para
 * `Registros`, um delete-stack sem Retain esvazia a zona viva (D-52).
 * @param {string} texto
 * @param {string} recurso nome lógico, como está no template
 */
export function lerPoliticasDoRecurso(texto, recurso) {
  const de = texto.indexOf(`\n  ${recurso}:`)
  if (de === -1) throw new Error(`template sem o recurso ${recurso}`)
  const politicas = { deletionPolicy: '', updateReplacePolicy: '' }
  // `slice(2)`: o corte comeca no `\n` que antecede `  <recurso>:`, entao a
  // primeira fatia e vazia e a segunda e o proprio cabecalho do recurso --
  // que o `break` abaixo tomaria pelo recurso seguinte.
  for (const linha of texto.slice(de).split('\n').slice(2)) {
    // Próximo recurso de topo dentro de Resources:.
    if (/^ {2}\w/.test(linha)) break
    const apagar = linha.match(/^ {4}DeletionPolicy:\s*(\S+)/)
    if (apagar) politicas.deletionPolicy = apagar[1] ?? ''
    const substituir = linha.match(/^ {4}UpdateReplacePolicy:\s*(\S+)/)
    if (substituir) politicas.updateReplacePolicy = substituir[1] ?? ''
  }
  return politicas
}

/**
 * Mantida pelo nome: é a chamada que o teste e o `conferir-zona` já fazem.
 * @param {string} texto
 */
export function lerPoliticasDaZona(texto) {
  return lerPoliticasDoRecurso(texto, 'Zona')
}
```

No `INVENTARIO`, depois do último item do bloco SES (`_dmarc`), acrescente:

```js
  // ── Intranet do Lotus (item 32 do repo lotus-infra) ─────────────────────
  // Nasce no Route 53: nunca existiu no painel. Sem AAAA, o EIP não tem IPv6.
  { nome: 'app.lotusotec.cl.', tipo: 'A', valores: ['18.230.53.197'] },
```

- [ ] **Step 6: `infra/lotus-dns.yaml`**

Em `Parameters:`, depois de `TokenDkim3`:

```yaml
  IpDaIntranet:
    Type: String
    Default: 18.230.53.197
    Description: >-
      EIP da EC2 do Lotus (intranet), sa-east-1. O nome e `app` por decisao
      de Joao em 2026-09-27 (ADR-14 do repo lotus-infra, emenda). Sem AAAA:
      o EIP nao tem IPv6.
    AllowedPattern: '^\d{1,3}(\.\d{1,3}){3}$'
```

No recurso `Registros`, entre `Type:` e `Properties:`:

```yaml
    # D-52: a zona ja era Retain, os registros nao. Sem isto um delete-stack
    # apaga MX, SPF e o resto e deixa a zona retida VAZIA, com o e-mail da
    # empresa fora do ar. Termination protection ligada pelo Joao na mesma
    # rodada; as duas protecoes, nao uma.
    DeletionPolicy: Retain
    UpdateReplacePolicy: Retain
```

Em `RecordSets`, depois do bloco `_dmarc` (o último do SES):

```yaml
        # ── Intranet do Lotus (item 32 do repo lotus-infra) ───────────────
        # Nasce no Route 53, nunca existiu no painel. Sem AAAA: o EIP nao tem
        # IPv6. `sistema` continua no WordPress ate B5/8.2.1 -- nao e a
        # intranet, por decisao de Joao em 2026-09-27.
        - Name: !Sub 'app.${NomeDaZona}.'
          Type: A
          TTL: !Ref TtlPadrao
          ResourceRecords:
            - !Ref IpDaIntranet
```

(Os comentários não podem conter a string `RecordSets:` — é o âncora do leitor.)

- [ ] **Step 7: Ver passar, formatar, `pnpm check`**

Run: `pnpm vitest run scripts/infra/zona.test.mjs`
Expected: PASS, inclusive `acha exatamente um RecordSet por linha do inventário` (agora 21) e `usa o TTL medido`.
Run: `pnpm format && pnpm check`
Expected: verde de ponta a ponta.

- [ ] **Step 8: Documentos do site**

`docs/infra/zona-dns-lotusotec.md`, depois da seção `## Registros do SES (bloco B2)`:

```markdown
## Registro da intranet do Lotus (item 32 do repo `lotus-infra`)

Um registro entrou pelo stack `lotus-dns`, na data da conferência abaixo, para a intranet do Lotus
(EC2 em `sa-east-1`, EIP fixo). O nome é `app`, por decisão de João em 2026-09-27 (ADR-14 do
`lotus-infra`, emenda); `sistema` **não** é a intranet e segue no WordPress até `B5`/`8.2.1`.

| Nome               | Tipo | Valor           | Para quê                                  |
| ------------------ | ---- | --------------- | ----------------------------------------- |
| `app.lotusotec.cl` | `A`  | `18.230.53.197` | intranet do Lotus; TLS pelo Let's Encrypt |

Sem `AAAA`: o EIP não tem IPv6. O certificado de `app` é emitido e renovado pelo Let's Encrypt
(HTTP-01, no nginx da EC2) — o que restringe a `CAA` da zona (`D-49`): quando existir, lista
`letsencrypt.org` além de `amazon.com`.
```

`docs/adr/ADR-SITE-006.md`, no fim do arquivo:

```markdown
## Emenda de 2026-09-27 — o nome da intranet é `app`, não `sistema`

Este ADR pedia `sistema.lotusotec.cl` "para o Lotus". Em 2026-09-27 João decidiu, no planejamento do
item 32 do repo `lotus-infra` (ADR-14 de lá, emenda da mesma data), que o nome público da intranet
é **`app.lotusotec.cl`**. O registro `sistema` continua no template apontando para o WordPress, como
cópia da zona antiga, e o destino dele é `B5`/`8.2.1` — não muda aqui, também porque é servido pelo
certificado wildcard de `D-51`. O registro `app` é o primeiro da zona que nasce no Route 53 sem ter
existido no painel.
```

`docs/superpowers/backlog.md`, na D-49, depois de "Uma `CAA` só com `amazon.com` bloquearia a renovação do WordPress.":

```markdown
  E bloquearia também a da **intranet do Lotus**: `app.lotusotec.cl` (item 32 do `lotus-infra`) é
  emitido e renovado pelo Let's Encrypt por HTTP-01, então `letsencrypt.org` fica na `CAA` **mesmo
  depois** que o wildcard do WordPress deixar de existir.
```

- [ ] **Step 9: Commit e PR (sem merge ainda — o merge é depois do deploy, Task 9)**

```bash
pnpm format:check
git add infra/lotus-dns.yaml scripts/infra/lib/zona.mjs scripts/infra/zona.test.mjs docs/infra/zona-dns-lotusotec.md docs/adr/ADR-SITE-006.md docs/superpowers/backlog.md
git commit -m "feat(dns): registro A de app.lotusotec.cl para a intranet do Lotus e Retain nos registros (D-52)

app -> 18.230.53.197 (EIP da EC2 do Lotus), sem AAAA, por decisao de Joao
em 2026-09-27; sistema segue no WordPress ate B5. Registros ganha
DeletionPolicy e UpdateReplacePolicy Retain com asserção na catraca; a
D-49 registra que letsencrypt.org fica na CAA por causa de app.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push -u origin infra/registro-app-intranet
gh pr create --fill --title "dns: registro A de app.lotusotec.cl (intranet do Lotus) e Retain nos registros (D-52)"
gh pr checks --watch
```

Expected: CI do site verde. Corpo da PR cita a spec do item 32 e diz que o deploy do stack precede o merge, com a conferência gerada entrando por commit adicional. Termina com `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.

---

### Task 9: deploy do `lotus-dns` — escrita do João, leitura minha

**Files (no `lotus-site-dns`):**
- Create (gerado): `docs/infra/conferencia-zona-<data>.md`
- Modify: `docs/superpowers/backlog.md` (D-52 fecha)
- Modify (no `lotus-infra`): `docs/superpowers/audits/2026-09-27-infra-producao-dns-e-tls.md`

**Interfaces:**
- Consumes: a PR da Task 8.
- Produces: `app.lotusotec.cl` resolvendo o EIP; a PR do site mesclada.

- [ ] **Step 1: Termination protection (João) e leitura**

João:
```bash
AWS_PROFILE=lotus aws cloudformation update-termination-protection \
  --enable-termination-protection --region us-east-1 --stack-name lotus-dns
```
Sessão:
```bash
AWS_PROFILE=lotus aws cloudformation describe-stacks --region us-east-1 --stack-name lotus-dns \
  --query 'Stacks[0].[StackStatus,EnableTerminationProtection]' --output text
```
Expected: `UPDATE_COMPLETE	True`.

- [ ] **Step 2: Drift**

```bash
ID=$(AWS_PROFILE=lotus aws cloudformation detect-stack-drift --region us-east-1 --stack-name lotus-dns --query StackDriftDetectionId --output text)
sleep 20
AWS_PROFILE=lotus aws cloudformation describe-stack-drift-detection-status --region us-east-1 \
  --stack-drift-detection-id "$ID" --query '[DetectionStatus,StackDriftStatus]' --output text
```
Expected: `DETECTION_COMPLETE	IN_SYNC`. Outra coisa → PARE e mostre ao João.

- [ ] **Step 3: Portão de base — o vivo e a PR só diferem no delta desta PR**

```bash
cd /home/jvbat/projetos/lotus-site-dns
SCRATCH=/tmp/claude-1000/-home-jvbat-projetos-lotus-infra/eb38745f-65c2-447f-b934-a39fd1cfb515/scratchpad
AWS_PROFILE=lotus aws cloudformation get-template --region us-east-1 --stack-name lotus-dns \
  --query TemplateBody --output text | grep -vE '^\s*#|^\s*$' > $SCRATCH/dns-vivo.yaml
grep -vE '^\s*#|^\s*$' infra/lotus-dns.yaml > $SCRATCH/dns-pr.yaml
diff $SCRATCH/dns-vivo.yaml $SCRATCH/dns-pr.yaml
```
Expected: só três blocos adicionados (`>`): o parâmetro `IpDaIntranet` (o bloco inteiro, descrição incluída), as duas linhas de `Retain` em `Registros`, e o RecordSet de `app` (5 linhas: `Name`, `Type`, `TTL`, `ResourceRecords`, o `!Ref`). **Qualquer linha removida (`<`) → PARE**: a base está atrás do vivo.

- [ ] **Step 4: Change set, sem executar**

```bash
AWS_PROFILE=lotus aws cloudformation deploy --region us-east-1 --stack-name lotus-dns \
  --template-file infra/lotus-dns.yaml --tags Projeto=lotus-site --no-execute-changeset
```
A saída imprime o comando `describe-change-set` com o nome; rode-o com
`--query 'Changes[].ResourceChange.[LogicalResourceId,Action,Replacement]' --output text`.
Expected: exatamente uma linha, `Registros	Modify	False`. Qualquer outra → não executa; `aws cloudformation delete-change-set … --change-set-name <nome>` e PARE.

- [ ] **Step 5: Execução (João) e espera**

João: `AWS_PROFILE=lotus aws cloudformation execute-change-set --region us-east-1 --stack-name lotus-dns --change-set-name <nome>`.
Sessão: `AWS_PROFILE=lotus aws cloudformation wait stack-update-complete --region us-east-1 --stack-name lotus-dns && echo UPDATE_COMPLETE`
Expected: `UPDATE_COMPLETE`. Se sair `UPDATE_ROLLBACK_COMPLETE`, o rollback é automático; pule para o Step 6 para provar que os seis do SES seguem servidos e PARE.

- [ ] **Step 6: A zona conferida, de fora e direto nos NS**

```bash
cd /home/jvbat/projetos/lotus-site-dns && pnpm infra:conferir-zona --pos-delegacao; echo "rc=$?"
grep -E 'app\.lotusotec\.cl|Nenhuma divergência' docs/infra/conferencia-zona-*.md | tail -3
curl -s 'https://dns.google/resolve?name=app.lotusotec.cl&type=A' | python3 -c 'import json,sys; print([a["data"] for a in json.load(sys.stdin).get("Answer",[])])'
curl -s 'https://dns.google/resolve?name=app.lotusotec.cl&type=AAAA' | python3 -c 'import json,sys; print([a["data"] for a in json.load(sys.stdin).get("Answer",[])])'
```
Expected: `rc=0`; a linha de `app` com `18.230.53.197` nas duas colunas e `sim`; "Nenhuma divergência fora das esperadas"; `['18.230.53.197']`; `[]`. (Se o resolvedor público ainda não tiver o nome — TTL de cache negativo —, a conferência direta nos NS já prova; repita o DoH em alguns minutos.)

- [ ] **Step 7: D-52 fechada e a conferência na PR**

Em `docs/superpowers/backlog.md`, na D-52, acrescente ao fim:

```markdown
  **Pago em <data> (PR desta entrada):** proteção ligada (`EnableTerminationProtection: True`,
  lido por `describe-stacks`), `Registros` com `DeletionPolicy`/`UpdateReplacePolicy: Retain` e
  asserção em `zona.test.mjs`, change set de um recurso (`Registros Modify, Replacement False`).
```

e mova a entrada para `## Fechados`, na forma das que já estão lá. Depois:

```bash
pnpm format && pnpm check
git add docs/infra/conferencia-zona-*.md docs/superpowers/backlog.md
git commit -m "docs(dns): zona conferida com app.lotusotec.cl e o SES intactos; D-52 paga

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

- [ ] **Step 8: Merge (João) e audit**

João mescla a PR do site (`gh pr merge --merge` ou pela UI). Sessão: `git -C /home/jvbat/projetos/lotus-site fetch -q origin && git -C /home/jvbat/projetos/lotus-site show origin/main:infra/lotus-dns.yaml | grep -c 'IpDaIntranet'` → `2` ou mais.

No audit do `lotus-infra`, seção `## Task 9 — DNS`: `describe-stacks` (status e proteção), drift, o diff do portão de base (contagem de linhas `>` e `<`), o change set (a linha única), `UPDATE_COMPLETE` com hora, o `rc` da conferência, os dois DoH, o número da PR. Commit:

```bash
cd /home/jvbat/projetos/lotus-infra && git add docs/superpowers/audits/2026-09-27-infra-producao-dns-e-tls.md
git commit -m "docs(item-32): audit do DNS — app.lotusotec.cl resolve o EIP, D-52 paga

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 10: fase B — SG, reinstalação, certificado, `.env` e promoção pelo botão

**Files:**
- Modify: `docs/superpowers/audits/2026-09-27-infra-producao-dns-e-tls.md`

**Interfaces:**
- Consumes: `X` (Task 7), `app` resolvendo (Task 9), o §11 (Task 6).
- Produces: produção em HTTPS com HSTS; DoD 5 (parte), 8.

- [ ] **Step 1: Portões antes de parar o nginx**

```bash
AWS_PROFILE=lotus aws ec2 describe-security-groups --region sa-east-1 --filters Name=group-name,Values=lotus-web \
  --query 'SecurityGroups[0].IpPermissions[].[FromPort,ToPort,IpRanges[0].CidrIp]' --output text
curl -s 'https://dns.google/resolve?name=app.lotusotec.cl&type=A' | python3 -c 'import json,sys; print([a["data"] for a in json.load(sys.stdin).get("Answer",[])])'
```
Expected: linhas `80 80 0.0.0.0/0` e `443 443 0.0.0.0/0` (e a de 22 com o `/32` do João); `['18.230.53.197']`. Falta 80 ou 443 → PARE e mostre ao João; não alargue.

- [ ] **Step 2: Reinstalação pelo §7 (João)**

De uma árvore igual à `main` do corporativo:
```bash
git fetch upstream && git diff --quiet upstream/main -- deploy/bin docker-compose.prod.yml docker-compose.prod-tls.yml deploy/nginx/tls.conf deploy/aws/env.prod.example && echo arvore-igual
PEM=~/.ssh/<o .pem da §6>
scp -i "$PEM" docker-compose.prod.yml docker-compose.prod-tls.yml ubuntu@18.230.53.197:/tmp/
scp -i "$PEM" deploy/bin/deploy.sh deploy/bin/backup-db.sh deploy/bin/verificar-backup.sh deploy/bin/recarregar-nginx.sh ubuntu@18.230.53.197:/tmp/
scp -i "$PEM" deploy/nginx/tls.conf ubuntu@18.230.53.197:/tmp/
```
No host:
```bash
sudo mv /tmp/docker-compose.prod*.yml /opt/lotus/
sudo mv /tmp/deploy.sh /tmp/backup-db.sh /tmp/verificar-backup.sh /tmp/recarregar-nginx.sh /opt/lotus/bin/ && sudo sh -c 'chmod +x /opt/lotus/bin/*.sh'
sudo mv /tmp/tls.conf /opt/lotus/nginx/
sudo mkdir -p /opt/lotus/certbot && sudo chmod 755 /opt/lotus/certbot
sudo sh -c 'sha256sum /opt/lotus/nginx/tls.conf /opt/lotus/bin/*.sh' | cut -c1-12,65-
```
Sessão compara com `sha256sum deploy/nginx/tls.conf deploy/bin/*.sh | cut -c1-12,65-` na árvore local. Expected: os cinco hashes iguais. Os containers seguem de pé.

- [ ] **Step 3: Certificado (João) — começa a queda**

```bash
sudo apt-get install -y certbot
sudo docker compose -p lotus --project-directory /opt/lotus -f /opt/lotus/docker-compose.prod.yml stop nginx
sudo certbot certonly --standalone -d app.lotusotec.cl --agree-tos -m <e-mail> --non-interactive
sudo test -f /etc/letsencrypt/live/app.lotusotec.cl/fullchain.pem && echo certificado ok
```
Expected: `Successfully received certificate` e `certificado ok`. Falhou → `start nginx` (comando no §11.2), PARE, mostre a saída; a queda termina aí e nada mudou.

- [ ] **Step 4: Os seis campos (João)**

`sudo -e /opt/lotus/.env`, com a tabela do §11.3. Conferência do João, no host:
`sudo grep -cE '^(APP_URL|FRONTEND_URL|CERTIFICATE_VALIDATION_URL)=https://app\.lotusotec\.cl([[:space:]]+#.*)?$|^(SANCTUM_STATEFUL_DOMAINS|SESSION_DOMAIN)=app\.lotusotec\.cl([[:space:]]+#.*)?$|^SESSION_SECURE_COOKIE=true([[:space:]]+#.*)?$' /opt/lotus/.env` → `6` (tolera a nota inline `# na fase sem DNS…` que `SESSION_DOMAIN`/`CERTIFICATE_VALIDATION_URL` carregam no molde). Só a contagem sai do host.

- [ ] **Step 5: O botão (João) — termina a queda**

João dispara o `deploy.yml` do corporativo com `sha=X` e `confirmar=PROMOVER`. Sessão:
```bash
gh run list -R Gatika-CL/lotus --workflow deploy.yml --limit 1
gh run watch -R Gatika-CL/lotus <run-id> --exit-status; echo "rc=$?"
curl -s -o /dev/null -w '%{http_code}\n' https://app.lotusotec.cl/up
```
Expected: passo de conferência `host alinhado ao SHA alvo`; deploy `success`, `rc=0`; `200`. Anote a hora do `stop nginx` (Step 3) e a do primeiro 200 — é a janela de queda, para o audit.

Se a conferência reprovar (`… ausente` / `… diferente`): volte ao Step 2, nenhum navegador viu HSTS. Se o `deploy.sh` abortar com nginx `unhealthy`: o recuo de emergência do §11.4, e PARE.

- [ ] **Step 6: Audit**

Seção `## Task 10 — reinstalação, certificado e promoção`: SG (as três linhas), os cinco hashes, a saída curta do certbot (emissor e validade, via `sudo certbot certificates` colado pelo João), a contagem 6, o run do botão (link) com a linha da conferência, a janela de queda. Commit:

```bash
git add docs/superpowers/audits/2026-09-27-infra-producao-dns-e-tls.md
git commit -m "docs(item-32): audit da promocao com TLS — certificado emitido, botao verde, janela de queda

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 11: fase B — webroot, hook e `renew --dry-run`

**Files:**
- Modify: `docs/superpowers/audits/2026-09-27-infra-producao-dns-e-tls.md`

**Interfaces:**
- Consumes: Task 10.
- Produces: renovação ensaiada; DoD 5 completo.

- [ ] **Step 1: Webroot (João)**

```bash
sudo certbot reconfigure --cert-name app.lotusotec.cl --webroot -w /opt/lotus/certbot
grep -E '^(authenticator|webroot_path)' /etc/letsencrypt/renewal/app.lotusotec.cl.conf
```
Expected: `authenticator = webroot` e `webroot_path = /opt/lotus/certbot,`. Sem `-d`: o `reconfigure` ensaia sozinho uma renovação em dry-run pelo webroot e só grava se passar — prova antecipada do challenge, sem gastar emissão (`certonly --keep-until-expiring` não reescreveria a config com o certificado ainda longe do vencimento). Falhou → o dry-run reprovou: confira o 755 de `/opt/lotus/certbot` e o challenge servido pelo nginx; a config antiga fica intacta.

- [ ] **Step 2: Hook por symlink, provado por execução (João executa; sessão mede de fora)**

Sessão, antes, num terminal: `for i in $(seq 1 20); do curl -s -o /dev/null -w '%{http_code} ' https://app.lotusotec.cl/up; sleep 1; done; echo`
João, enquanto o laço roda:
```bash
sudo ln -sfn /opt/lotus/bin/recarregar-nginx.sh /etc/letsencrypt/renewal-hooks/deploy/recarregar-nginx.sh
sudo /etc/letsencrypt/renewal-hooks/deploy/recarregar-nginx.sh; echo "rc=$?"
```
Expected: `nginx: the configuration file /etc/nginx/nginx.conf syntax is ok`, `… test is successful`, `rc=0`; o laço da sessão imprime vinte `200`.

- [ ] **Step 3: O gate (João)**

```bash
sudo certbot renew --dry-run
systemctl is-active certbot.timer
```
Expected: `Congratulations, all simulated renewals succeeded` e `active`. Reprovou → PARE, cole a saída; as causas prováveis são o `authenticator` (Step 1) e a permissão de `/opt/lotus/certbot` (755).

- [ ] **Step 4: Audit**

Seção `## Task 11 — renovação`: as duas linhas do `grep`, o `rc` do hook e os vinte códigos, a linha do `--dry-run`, o estado do timer. Commit:

```bash
git add docs/superpowers/audits/2026-09-27-infra-producao-dns-e-tls.md
git commit -m "docs(item-32): audit da renovacao — webroot, hook executado sem queda, dry-run verde

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 12: provas de fora, login, certificado com QR em https (emitir e revogar), P-77

**Files:**
- Modify: `docs/superpowers/audits/2026-09-27-infra-producao-dns-e-tls.md`
- Modify: `docs/superpowers/pendencias/abertas.md` (P-77, emenda com a medição)

**Interfaces:**
- Consumes: Tasks 10 e 11.
- Produces: DoD 4, 6, 7 e 9.

- [ ] **Step 1: 301, `/up` nas duas portas, HSTS nos quatro tipos de resposta**

```bash
H=https://app.lotusotec.cl
curl -sI http://app.lotusotec.cl/inicio | grep -iE '^(HTTP|location)'
curl -s -o /dev/null -w 'http /up %{http_code}\n' http://app.lotusotec.cl/up
ASSET=$(curl -s $H/ | grep -oE '/assets/[^"]+\.js' | head -1)
for p in /up / "$ASSET" /api/courses/archived; do
  printf '%-40s ' "$p"; curl -s -o /dev/null -w '%{http_code} ' "$H$p"
  curl -sI "$H$p" | grep -i '^strict-transport-security' || echo SEM-HSTS
done
```
Expected: `HTTP/1.1 301` + `Location: https://app.lotusotec.cl/inicio`; `http /up 200`; e as quatro linhas com `strict-transport-security: max-age=31536000` — `/up` 200, `/` 200, o asset 200, `/api/courses/archived` 401 (sem sessão; é o `always`). Nenhuma `SEM-HSTS`.

- [ ] **Step 2: Certificado e cookie**

```bash
echo | openssl s_client -connect app.lotusotec.cl:443 -servername app.lotusotec.cl 2>/dev/null | openssl x509 -noout -issuer -subject -dates -ext subjectAltName
curl -si https://app.lotusotec.cl/sanctum/csrf-cookie | grep -i '^set-cookie'
```
Expected: `issuer=C = US, O = Let's Encrypt, …`; `subject=CN = app.lotusotec.cl`; `DNS:app.lotusotec.cl`; datas com ~90 dias; dois `Set-Cookie` (`XSRF-TOKEN` e o de sessão) com `secure` e `domain=app.lotusotec.cl`.

- [ ] **Step 3: Login real (João)**

João entra em `https://app.lotusotec.cl` com o admin e confirma que a sessão fecha (navega para uma tela autenticada e recarrega). No audit: hora e "ok", nada mais.

- [ ] **Step 4: Emitir, decodificar, validar, revogar (João emite e revoga; sessão decodifica)**

João, pela UI: emite um certificado sobre uma matrícula cujo aluno/turma estejam marcados como teste (`TESTE item 32` no nome ou observação), baixa o PDF e o entrega à sessão em `$SCRATCH/cert-item32.pdf`. Sessão:

```bash
sudo apt-get install -y zbar-tools    # se faltar; o João aprova
pdftoppm -png -r 144 -f 1 -l 1 $SCRATCH/cert-item32.pdf /tmp/qr-item32
zbarimg -q /tmp/qr-item32-1.png
```
Expected: `QR-Code:https://app.lotusotec.cl/validar/<uuid>`. (Se o QR estiver noutra página, `-f 2 -l 2`.) Então:

```bash
UUID=<uuid do QR>
curl -s -o /dev/null -w '%{http_code}\n' "https://app.lotusotec.cl/validar/$UUID"
curl -s "https://app.lotusotec.cl/api/publico/certificados/$UUID" | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d["codigo"], d["status"], d["display_status"], d["revoked_at"])'
```
Expected: `200`; `LOT-… <status ativo> <display ativo> None`.

João revoga o certificado pela UI (`RevokeCertificateAction`, com motivo `prova do item 32`). Sessão repete o segundo `curl`: Expected: `revoked_at` preenchido e `display_status` de revogado. Apague `$SCRATCH/cert-item32.pdf` e `/tmp/qr-item32-1.png` depois de registrar.

- [ ] **Step 5: Audit fechado e P-77 com a medição**

Seção `## Task 12 — provas`: os comandos do Step 1 com os códigos e o header, emissor/SAN/datas, os dois `Set-Cookie` sem o valor, "login ok" com hora, a URL decodificada do QR (com o UUID), as duas leituras da API pública (antes e depois da revogação).

Na P-77 (`abertas.md`), acrescente ao fim da ficha:

```markdown
**Medição de <data> (item 32).** `A app.lotusotec.cl` = `18.230.53.197` por DoH e direto nos NS da
zona; `AAAA` vazio. §11 executado de ponta a ponta: certificado Let's Encrypt emitido
(`<validade>`), seis campos virados, promoção pelo botão (run `<id>`), HSTS servido, renovação por
webroot com o hook executado sem queda, `renew --dry-run` verde, certificado `<código>` emitido com
QR em `https://app.lotusotec.cl/validar/…` e revogado. Evidência em
`audits/2026-09-27-infra-producao-dns-e-tls.md`. **Gatilho pago; encerra no `/fechar-sprint`.**
```

Commit:

```bash
git add docs/superpowers/audits/2026-09-27-infra-producao-dns-e-tls.md docs/superpowers/pendencias/abertas.md
git commit -m "docs(item-32): provas em producao — 301, HSTS, cookie Secure, login, certificado com QR em https emitido e revogado; P-77 paga

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

## Handoff de execução

**executor: claude**

Este bloco roda na sessão Claude, no worktree `../lotus-infra`, com um segundo worktree do `lotus-site` (`/home/jvbat/projetos/lotus-site-dns`) só para a Task 8 e 9. É cross-repo, toca produção e a fase B exige julgamento fora do plano — nada dele é task mecânica com path fechado (D10 da spec).

**Escrita do João**, por decisão registrada (escrita remota em produção não passa pela sessão): merge das duas PRs; `update-termination-protection` e `execute-change-set` (Task 9); reinstalação pelo §7, `certbot`, `.env`, o botão (Task 10); webroot, symlink do hook, `renew --dry-run` (Task 11); login, emissão e revogação (Task 12). A sessão tira a linha de base, lê a saída, confere contra o esperado e escreve o audit. Leitura por SSH que o auto mode barrar: o João roda e cola.

**Sem delegação ao Codex.** A Task 1 muda a forma de chamá-lo; a revisão independente do `/revisar-sprint` (alto risco — certificados e auth) vai usar exatamente esse fallback.

**Gates por task:** cada task de código termina com a suíte do arquivo tocado verde, as sondas da lição 19 vistas reprovar e um commit próprio. As tasks de produção param e esperam o João em vez de simular; **falha em portão é PARE**, com a saída mostrada, nunca contornada.

**Sequência obrigatória:** 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11 → 12.
- 1 a 6 são independentes entre si em conteúdo, mas a 6 descreve o que 2, 4 e 5 construíram — não se escreve antes.
- **7 antes de 10:** o botão lê a `main` do corporativo; o `tls.conf` com HSTS e o hook chegam ao host pela reinstalação, e a conferência os exige iguais à `main`.
- **8 só depois do merge do B2 no `lotus-site`** (portão executável no Step 1). Se o B2 atrasar, 1 a 7 concluem e o bloco espera em 8; não se abre PR da `main` pré-B2.
- **9 antes de 10:** sem `app` resolvendo de fora, não se para o nginx.
- **10 antes de 11:** o webroot só existe servido com o overlay de pé.
- 12 depois de 11: a emissão é a última prova, e a revogação vem no mesmo passo.
