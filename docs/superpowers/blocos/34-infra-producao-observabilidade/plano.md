# `infra-producao-observabilidade` — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** tirar a produção do estado "o único alerta que sai do host é o do backup atrasado": CloudWatch agent instalado pelo `user-data.sh`, sonda de `/up` e do certificado servido, quatro alarmes no SNS `lotus-alertas` provados disparando e chegando, logs de todo contêiner fora do host por 30 dias, e o D-74 pago (D12).

**Architecture:** a Fase A roda na lane, pelo `/executar-bloco` (Tasks 1 a 10). Ela escreve três arquivos de `deploy/`: o user-data que instala e configura o agente e o timer da sonda, a sonda, e o script de IAM, log groups, metric filters e alarmes. Cada um vem com uma catraca que roda o arquivo de verdade. Também liga `mask_bindings_in_exception_messages` no backend e escreve o runbook §14, as emendas dos ADR-14 e ADR-21 e a P-80. Dois passos da Fase A acontecem fora do repositório e antes da PR:
- a leitura do host de produção (Task 1);
- os recursos base e a EC2 de lab (Task 6).

A PR mescla com o bloco em `blocked`, aguardando aceitação (invariante 11). A Fase B roda em produção depois do merge e do espelho: reinstalação, botão, reparo, alarmes, janela de sondas e custo. A escrita é do João, e a leitura, da sessão.

**Tech Stack:** bash (`set -euo pipefail`), CloudWatch agent `1.300073.2b1889` (`.deb` arm64), CloudWatch Logs e métricas, SNS, IAM inline, systemd timer, `curl` e `openssl`, vitest (projeto `repo`, `node:child_process` e `node:http`), Laravel 13.34 (`mask_bindings_in_exception_messages`), PHPUnit no contêiner `app` da lane, Pint no host, `aws` de leitura com `AWS_PROFILE=lotus`.

**Spec:** [`spec.md`](./spec.md), com as emendas de 2026-10-04: D12 decidida, `from_beginning` fora da config e a regex do 5xx. Packet: [`context.md`](./context.md). Audit: [`audit.md`](./audit.md), criado na Task 1.

## Global Constraints

- **Lane.** `../lotus-34-infra-producao-observabilidade`, branch `infra/34-infra-producao-observabilidade`, offset +2 (`.env` da raiz). Nenhuma outra lane é tocada. O `docs/superpowers/backlog.md` não muda na execução: pela invariante 10, a ficha 34 e o D-74 saem pela lane de aceitação.
- **Raiz dos comandos.** Todo comando de task roda da raiz da lane, `/home/jvbat/projetos/lotus-34-infra-producao-observabilidade`, salvo `cd` explícito.
- **Nomes fixos**, iguais em todos os arquivos (a Task 7 tem catraca cruzada):
  - log groups `/lotus/prod/containers`, `/lotus/prod/sonda`, `/lotus/lab/containers` e `/lotus/lab/sonda`;
  - namespaces `Lotus/Host` (agente) e `Lotus/Sonda` (metric filters);
  - métricas `disk_used_percent`, `mem_used_percent`, `swap_used_percent`, `Up`, `CertDias` e `Http5xx`, com a dimensão `Ambiente` (`prod` ou `lab`);
  - alarmes `lotus-prod-up`, `lotus-prod-5xx`, `lotus-prod-disco` e `lotus-prod-certificado`;
  - inline `lotus-observabilidade` na role `lotus-ec2`, e o tópico `lotus-alertas` em `sa-east-1`;
  - sonda `/opt/lotus/bin/sondar-saude.sh`, log `/var/log/lotus/sonda.log`, units `lotus-sonda.service` e `lotus-sonda.timer`;
  - runbook §14, com as subseções 14.1 a 14.10. As descrições dos alarmes apontam para a 14.6.
- **Agente**, medido no planejamento em 2026-10-04, igual nos buckets global e regional:
  - versão `1.300073.2b1889`, pacote `1.300073.2b1889-1`;
  - sha256 `0d04b62f688f257aa35604f89b48f259cea5ed412985831d8d56838f43332169`;
  - URL `https://amazoncloudwatch-agent-sa-east-1.s3.sa-east-1.amazonaws.com/ubuntu/arm64/<versão>/amazon-cloudwatch-agent.deb`.
- **Padrões dos metric filters**, medidos no `test-metric-filter` em 2026-10-04:
  - `Up` é `{ ($.up = 0) || ($.up = 1) }`;
  - `CertDias` é `{ ($.cert_dias > 0) || ($.cert_dias <= 0) }`;
  - `Http5xx` é `{ $.log = %HTTP/[0-9.]+..5[0-9]{2}.% }` e, se a regex for recusada, `{ ($.log = "*HTTP/1.1\" 5*") || ($.log = "*HTTP/2.0\" 5*") || ($.log = "*HTTP/1.0\" 5*") }`.
- **Escrita.** A escrita na AWS, no host de produção e no host de lab é do João. A sessão lê, e toda leitura `aws` roda com `AWS_PROFILE=lotus`. Leitura por SSH que o auto mode barrar, o João roda e cola. Chave: `~/.ssh/lotus-prod.pem`. Host: `ubuntu@app.lotusotec.cl`.
- **Higiene do que se versiona.** Nenhum número de conta (12 dígitos), ARN completo, InstanceId, IP de cliente, endereço de e-mail ou valor do `.env` entra em arquivo versionado.
  - Saída da AWS vai ao audit por `sed -E 's/[0-9]{12}/<conta>/g; s/i-[0-9a-f]{8,17}/<instancia>/g'`.
  - O IP do hairpin vira `203.0.113.10` (TEST-NET-3).
  - E-mail aparece como "o e-mail do João".
- **Testes de repositório.** `cd frontend && pnpm test --project repo tests/<arquivo>.test.ts`.
- **Backend.** Roda no contêiner da lane, da raiz da árvore: `docker compose exec -T app …`. A árvore não tem `backend/vendor`, e a Task 5 roda `composer install` no contêiner antes do primeiro teste. O Pint roda no host, de `backend/`, sempre com argumento: `./vendor/bin/pint <arquivos>`.
- **Sondas da lição 19.**
  1. `cp` do arquivo para o scratchpad da sessão (`$SCRATCH`);
  2. aplicar a sonda e rodar o teste;
  3. restaurar com `cp` e conferir com `cmp`.

  **Nunca `git stash`.**
- **Git.** `git add` só nos caminhos exatos, nunca `-A`. Commits terminam com `Co-Authored-By: Claude <modelo> <noreply@anthropic.com>`, com o modelo que escreveu o commit (ex.: `Sonnet 5.5`).
- **Portões.** Falha em portão é PARE com a saída mostrada, nunca contorno. São portões o D14 da spec (RSS do agente acima de ~100 MB, disco de produção em ≥ 75%, as duas formas do 5xx recusadas) e qualquer `exit` diferente de 0 de script do bloco.
- **Comentários de script.** Os scripts novos (`sondar-saude.sh`, `criar-observabilidade.sh`) têm comentário em ASCII, sem acento, como o `criar-oidc-e-role.sh`. O `user-data.sh` mantém o estilo dele, com acento.

## Review Focus

1. **Config do agente recusada pelo `fetch-config`.** Uma chave fora do schema, como `from_beginning`, derruba o user-data com `set -e` no host vivo, depois de instalar o agente. Teste: `config: cada item de collect_list só tem chaves que o schema do agente aceita` (Task 3), contra a lista lida do schema que vem no `.deb`.
2. **Reexecutar o user-data no host vivo.** O reparo da Fase B não pode subir versão de pacote, porque o upgrade do Docker reinicia todos os contêineres. Também não pode reiniciar o agente à toa. Testes (Task 3):
   - `--no-upgrade em todo apt-get install`;
   - `a config só é reaplicada quando muda ou com o agente parado`.

   O lab da Task 6 prova os dois por `ActiveEnterTimestamp`.
3. **Upstream que aceita a conexão e não responde.** Sem teto de tempo, uma execução da sonda encosta na seguinte e o systemd pula o disparo. O alarme de `/up` então lê falta de dado e acusa um problema que não é do app. Teste: `upstream pendurado termina no teto, com up 0 e http 0` (Task 2).
4. **Alarmes criados antes do dado.** O de `/up` nasceria em `ALARM` e o de disco ficaria em `INSUFFICIENT_DATA` para sempre. Três assinaturas vazias avisariam ninguém. Testes (Task 4, por execução, com um `aws` falso):
   - `recusa sem Up recente`;
   - `recusa sem a métrica de disco com as dimensões do alarme`;
   - `recusa sem assinatura confirmada`.
5. **A máscara da D12 calando o 422 de "já cadastrado".** O `UserProvisioner` reconhece colisão de unicidade pela mensagem da `QueryException`. Teste: `a_colisao_real_de_unicidade_continua_virando_422` (Task 5), com uma colisão real no sqlite da suíte.

## Mapa de arquivos

| Arquivo | Ação | Task |
|---|---|---|
| `docs/superpowers/blocos/34-infra-producao-observabilidade/audit.md` | Criar e estender | 1, 6, 10 |
| `deploy/bin/sondar-saude.sh` | Criar | 2 |
| `frontend/tests/sondar-saude.test.ts` | Criar | 2 |
| `deploy/aws/user-data.sh` | Modificar (arquivo inteiro) | 3 |
| `frontend/tests/user-data.test.ts` | Criar | 3 |
| `deploy/aws/criar-observabilidade.sh` | Criar | 4 |
| `frontend/tests/criar-observabilidade.test.ts` | Criar | 4 |
| `frontend/tests/fixtures/aws-falso.sh` | Criar | 4 |
| `backend/config/database.php` | Modificar: a chave nas conexões `sqlite` e `mysql` | 5 |
| `backend/tests/Feature/Shared/BindingsForaDaMensagemTest.php` | Criar | 5 |
| `deploy/aws/README.md` | Modificar: §6, §7, §10, §11.7, §12 e a §14 nova | 7 |
| `frontend/tests/observabilidade-nomes.test.ts` | Criar | 7 |
| `docs/adrs.md` | Modificar: emendas do ADR-14 e do ADR-21 | 8 |
| `docs/superpowers/pendencias/abertas.md` | Modificar: P-80 | 9 |
| `docs/superpowers/blocos/34-infra-producao-observabilidade/estado.md` e `rulings.md` | Transições e rulings do `/executar-bloco` | Passos 4, 6 e 7 dele |

## Mapa de DoD

| DoD da spec (§9) | Onde se prova |
|---|---|
| 1. Catracas verdes, sondas vistas reprovar, `pnpm lint`, `pnpm test` e `pnpm build` | Tasks 2, 3, 4, 5, 7 e 10 |
| 2. Readback do `base`: inline, retenções e filtros, com o `test-metric-filter` | Task 6 |
| 3. Lab: o §5, passo 3, da spec, com a RSS dentro do portão e a instância terminada | Task 6 |
| 4. Produção: botão, reparo sem reinício, agente e timer, streams, métricas | B4 a B6 |
| 5. Os quatro alarmes iguais ao §4.4, a assinatura confirmada e `OK` 10 min depois | B7 |
| 6. Cada alarme em `ALARM` e de volta a `OK`, com os dois e-mails | B8 |
| 7. `producao GET /up -> 200` ao fim da janela | B8 |
| 8. Runbook §14 e emendas, ADR-14, ADR-21, P-80 (o custo medido vem no B9) | Tasks 7, 8 e 9; B9 |
| 9. Audit com cada leitura, nas regras do §5 | Tasks 1, 6 e 10; PR de aceitação |
| 10. D12: teste verde com a sonda vista reprovar, suíte PHP, Pint, SHA em produção | Task 5; B5 |

---

## Fase A — repositório e leituras pré-merge (`/executar-bloco`)

### Task 1: leituras do host de produção (spec §5, passo 1)

**Quem executa:** o controlador da sessão, não um implementador despachado. São leituras por SSH,
e quando o auto mode barra, o João roda e cola (Handoff). A revisão é a de toda task:
`revisor-task` no commit dela.

**Files:**
- Create: `docs/superpowers/blocos/34-infra-producao-observabilidade/audit.md`

**Interfaces:**
- Consumes: nada.
- Produces, na seção `## Task 1` do audit:
  - **`HAIRPIN: ok`** ou **`HAIRPIN: quebrado`**: decide o default de caminho da sonda (Task 2) e
    uma frase do ADR-14 (Task 8);
  - **`FSTYPE: <valor>`** de `/`: vai ao `DISCO` do `criar-observabilidade.sh` e da catraca dele
    (Task 4);
  - **`NGINX_200`** e **`NGINX_H2_200`**: duas linhas cruas do `json-file` do nginx. A primeira é a
    do healthcheck (HTTP/1.1, `127.0.0.1`); a segunda, a do hairpin (HTTP/2.0, IP trocado por
    `203.0.113.10`). A Task 4 as usa como linhas de prova;
  - o `Use%` do disco (portão D14), `free -m`, `docker system df`, a validade do certificado
    servido, o `ActiveEnterTimestamp` do Docker e a prova de que o agente ainda não existe.

- [ ] **Step 1: as leituras.** Da raiz da lane. Cada `ssh` é só leitura. Se o auto mode barrar,
  tente uma segunda vez (a primeira leitura da sessão às vezes cai em `Production Reads`).
  Barrado de novo, entregue os comandos ao João e espere a saída colada.

```bash
PEM=~/.ssh/lotus-prod.pem; H=ubuntu@app.lotusotec.cl
ssh -i "$PEM" "$H" 'df -h /; findmnt -no FSTYPE /; free -m'
ssh -i "$PEM" "$H" 'sudo docker system df'
ssh -i "$PEM" "$H" 'systemctl is-active docker; systemctl show docker -p ActiveEnterTimestamp; systemctl is-active amazon-cloudwatch-agent || true'
ssh -i "$PEM" "$H" 'curl -s -o /dev/null -w "%{http_code} %{remote_ip} %{time_total}\n" --max-time 10 https://app.lotusotec.cl/up'
ssh -i "$PEM" "$H" 'echo | timeout 10 openssl s_client -connect app.lotusotec.cl:443 -servername app.lotusotec.cl 2>/dev/null | openssl x509 -noout -enddate'
```

Esperado:
- disco em `ext4`;
- `active` e um timestamp para o Docker; `inactive` ou `unknown` para o agente;
- `200 <EIP> <tempo>` no `curl`;
- `notAfter=Dec 27 … 2026 GMT`, ou uma data posterior, se o certbot já renovou.

- [ ] **Step 2: portão D14 do disco.** `Use%` em ≥ 75% no `df -h /` é **PARE**. Registre o número
  e leve ao João antes de qualquer outra task: a janela de sondas encheria o disco até 82%.

- [ ] **Step 3: o hairpin.** `200` no `curl` do Step 1 é `HAIRPIN: ok`. Qualquer outra resposta,
  ou `000`, pede a segunda leitura:

```bash
ssh -i "$PEM" "$H" 'curl -s -o /dev/null -w "%{http_code}\n" --max-time 10 --resolve app.lotusotec.cl:443:127.0.0.1 https://app.lotusotec.cl/up; echo | timeout 10 openssl s_client -connect 127.0.0.1:443 -servername app.lotusotec.cl 2>/dev/null | openssl x509 -noout -enddate'
```

`200` e a data, por esse caminho, é `HAIRPIN: quebrado`: a sonda passa a usar o loopback (Task 2,
variante B). Sem `200` nos dois caminhos, **PARE**: o host não serve `/up` nem para si mesmo, e
isso é incidente, não bloco.

- [ ] **Step 4: as linhas do nginx.** O `curl` do Step 1 deixou uma linha HTTP/2.0 no log. Leia o
  caminho do `json-file` e as últimas linhas de `/up`:

```bash
ssh -i "$PEM" "$H" 'sudo docker inspect --format "{{.LogPath}}" $(sudo docker ps -q --filter label=com.docker.compose.service=nginx)'
ssh -i "$PEM" "$H" "sudo grep -F 'GET /up ' <o caminho acima> | tail -n 6"
```

Escolha duas linhas, sem editar nada além do IP:
- **`NGINX_200`**: uma do healthcheck, com `\"GET /up HTTP/1.1\" 200` e `127.0.0.1` (o `wget` do
  contêiner);
- **`NGINX_H2_200`**: a do `curl` do Step 1, com `\"GET /up HTTP/2.0\" 200`. Troque o IP de origem
  dela, qualquer que seja, por `203.0.113.10`.

Cada uma é um objeto JSON numa linha, `{"log":"…\n","stream":"stdout","time":"…"}`. Se a linha não
tiver a chave `log`, ou se o status não vier logo depois do `HTTP/x.y\"`, **PARE**: os padrões do
5xx supõem esse formato (portão D14).

- [ ] **Step 5: o audit.** Crie `docs/superpowers/blocos/34-infra-producao-observabilidade/audit.md`
  com este conteúdo, preenchido com os valores lidos. Não deixe nenhum `<…>` no arquivo:

````markdown
# Audit — `infra-producao-observabilidade` (item 34)

Leituras da execução, na ordem do plano. Regras (spec §5): sem número de conta (`<conta>`), sem
InstanceId (`<instancia>`), sem IP de cliente, sem endereço de e-mail, sem valor do `.env`. Leitura
que o auto mode barrou, o João rodou e colou — e a seção diz isso.

## Task 1 — leituras do host de produção (spec §5, passo 1)

Lidas em <AAAA-MM-DD HH:MM> UTC, <pela sessão | pelo João, colado>, com `~/.ssh/lotus-prod.pem`.

| Leitura | Valor |
|---|---|
| `df -h /` | <tamanho> total, <usado> usado, **<Use%>** — portão D14 (≥ 75%): passou |
| `findmnt -no FSTYPE /` | **`FSTYPE: <ext4>`** — vai ao `DISCO` da Task 4 |
| `free -m` | Mem <total> MiB, <usado> usados; Swap <total> MiB, <usado> usados |
| `docker system df` | imagens <tamanho> (<recuperável> recuperável); volumes <tamanho> |
| Docker | `active`, `ActiveEnterTimestamp=<…>` |
| agente | `<inactive \| unknown>` — ainda não existe |
| `curl https://app.lotusotec.cl/up`, do host | `<código> <EIP> <tempo>` → **`HAIRPIN: <ok \| quebrado>`** |
| certificado servido, do host | `notAfter=<data>` |

Linhas cruas do `json-file` do nginx, filtradas por `GET /up `. O IP da linha do hairpin foi
trocado por `203.0.113.10`; nada mais mudou.

```text
NGINX_200    <a linha do healthcheck>
NGINX_H2_200 <a linha do hairpin>
```
````

Na linha do `curl`, o IP é o EIP (já público no runbook §11). Mesmo assim, escreva `<EIP>`.

- [ ] **Step 6: commit.** É o primeiro commit de task do bloco: leva junto o `estado.md` que o
  Passo 4 do `/executar-bloco` deixou no working tree.

```bash
git add docs/superpowers/blocos/34-infra-producao-observabilidade/audit.md docs/superpowers/blocos/34-infra-producao-observabilidade/estado.md
git commit -m "docs(34): leituras do host de produção antes do bloco" -m "Co-Authored-By: Claude <modelo> <noreply@anthropic.com>"
```

---

### Task 2: a sonda — `deploy/bin/sondar-saude.sh`

**Files:**
- Create: `deploy/bin/sondar-saude.sh`
- Create: `frontend/tests/sondar-saude.test.ts`

**Interfaces:**
- Consumes: `HAIRPIN` do audit (Task 1). `ok` usa a variante A do Step 3, e `quebrado`, a
  variante B.
- Produces: o executável `/opt/lotus/bin/sondar-saude.sh` (caminho no host), sem argumentos, que
  acrescenta a `/var/log/lotus/sonda.log` uma linha
  `{"ts":"<UTC ISO-8601>","up":<0|1>,"http":<inteiro>[,"cert_dias":<inteiro>]}` e sai 0 quando a
  gravou.
  - Overrides: `LOTUS_SONDA_URL`, `LOTUS_SONDA_TLS` (`host:porta`), `LOTUS_SONDA_CERT_ARQUIVO`
    (PEM) e `LOTUS_SONDA_LOG`.
  - Quem usa esses nomes: a Task 3, na unit; a Task 4, nos filtros `$.up` e `$.cert_dias`; a
    Task 7, no runbook; e a janela de sondas (B8), no `LOTUS_SONDA_CERT_ARQUIVO`.

- [ ] **Step 1: o teste que falha.** Crie `frontend/tests/sondar-saude.test.ts`:

```ts
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { spawn, spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

/**
 * `deploy/bin/sondar-saude.sh` é a sonda do item 34: o timer `lotus-sonda`
 * roda o script a cada minuto, e ele grava UMA linha JSON por execução. Os
 * metric filters fazem dessa linha `Lotus/Sonda Up` e `CertDias`, e o alarme de
 * `/up` trata falta de dado como queda. Por isso as duas falhas que importam
 * são silenciosas:
 * - uma linha mentindo, como `up` 1 com 503, ou `cert_dias` 0 inventado quando
 *   a medição falha;
 * - uma execução que pendura e encosta na seguinte.
 *
 * Por EXECUÇÃO (lição 19): cada caso roda o script de verdade contra um
 * servidor HTTP deste processo e certificados gerados aqui. `spawn` assíncrono,
 * nunca `spawnSync`, porque o servidor vive neste event loop e um `spawnSync`
 * o travaria — o `curl` esperaria uma resposta que nunca vem.
 */
const RAIZ = resolve(__dirname, '..', '..')
const CAMINHO = join(RAIZ, 'deploy', 'bin', 'sondar-saude.sh')
const SCRIPT = readFileSync(CAMINHO, 'utf8')
const semComentarios = SCRIPT.split(/\r?\n/)
  .filter((linha) => !/^\s*#/.test(linha))
  .join('\n')

/** Porta 1 em 127.0.0.1: nada escuta, a conexão é recusada na hora. Nenhum caso sai para a internet. */
const FECHADO = '127.0.0.1:1'

const escutar = (servidor: Server) =>
  new Promise<void>((pronto) => servidor.listen(0, '127.0.0.1', () => pronto()))
const fechar = (servidor: Server) => new Promise<void>((pronto) => servidor.close(() => pronto()))
const porta = (servidor: Server) => (servidor.address() as AddressInfo).port

let base: string
let certificado30: string
let ilegivel: string
let responde: Server
let pendura: Server
let contador = 0

beforeAll(async () => {
  base = mkdtempSync(join(tmpdir(), 'sondar-saude-'))
  certificado30 = join(base, 'certificado-30-dias.pem')
  const gerado = spawnSync(
    'openssl',
    [
      'req', '-x509', '-newkey', 'ec', '-pkeyopt', 'ec_paramgen_curve:prime256v1', '-nodes',
      '-days', '30', '-subj', '/CN=sonda-teste',
      '-keyout', join(base, 'chave.pem'), '-out', certificado30,
    ],
    { encoding: 'utf8' },
  )
  if (gerado.status !== 0) throw new Error(`openssl req falhou: ${gerado.stderr}`)
  ilegivel = join(base, 'ilegivel.pem')
  writeFileSync(ilegivel, 'isto nao e um certificado\n')

  responde = createServer((pedido, resposta) => {
    resposta.statusCode = pedido.url === '/503' ? 503 : 200
    resposta.end('ok')
  })
  // Aceita a conexão e nunca responde: o upstream pendurado.
  pendura = createServer(() => {})
  await Promise.all([escutar(responde), escutar(pendura)])
})

afterAll(async () => {
  pendura.closeAllConnections()
  await Promise.all([fechar(responde), fechar(pendura)])
  rmSync(base, { recursive: true, force: true })
})

type Execucao = { status: number | null; linhas: string[]; segundos: number }

/**
 * Roda a sonda com os overrides dados. Os defaults deste helper nunca saem da
 * máquina: URL e TLS apontam para uma porta fechada.
 */
const sondar = (env: Record<string, string>): Promise<Execucao> => {
  contador += 1
  const log = env.LOTUS_SONDA_LOG ?? join(base, `sonda-${contador}.log`)
  const inicio = Date.now()
  return new Promise((pronto) => {
    const filho = spawn('bash', [CAMINHO], {
      env: {
        ...process.env,
        LOTUS_SONDA_URL: `http://${FECHADO}/up`,
        LOTUS_SONDA_TLS: FECHADO,
        ...env,
        LOTUS_SONDA_LOG: log,
      },
      stdio: 'ignore',
    })
    filho.on('close', (status) => {
      let linhas: string[] = []
      try {
        linhas = readFileSync(log, 'utf8').split('\n').filter(Boolean)
      } catch {
        linhas = []
      }
      pronto({ status, linhas, segundos: (Date.now() - inicio) / 1000 })
    })
  })
}

/** A execução saiu 0 e gravou exatamente uma linha JSON — devolvida parseada. */
const linhaUnica = (e: Execucao): Record<string, unknown> => {
  expect(e.status).toBe(0)
  expect(e.linhas).toHaveLength(1)
  return JSON.parse(e.linhas[0]) as Record<string, unknown>
}

describe('deploy/bin/sondar-saude.sh', () => {
  it('é executável e falha alto', () => {
    expect(statSync(CAMINHO).mode & 0o111).not.toBe(0)
    expect(semComentarios).toMatch(/^set -euo pipefail$/m)
  })

  it('não fala com a AWS nem lê o .env — a medição é a linha', () => {
    expect(semComentarios).not.toMatch(/(^|[\s;&|(])aws\s/m)
    expect(semComentarios).not.toContain('.env')
  })

  it('as duas medições têm teto de 10 s, e o curl não segue redirect', () => {
    const curl = semComentarios.split('\n').find((linha) => /\bcurl\s/.test(linha))
    expect(curl).toBeDefined()
    expect(curl).toContain('--max-time 10')
    expect(curl).not.toMatch(/\s(-L|--location)\b/)
    expect(semComentarios).toMatch(/timeout 10 openssl s_client/)
  })

  it('200 dá up 1, http 200 e os dias do certificado', async () => {
    const linha = linhaUnica(
      await sondar({
        LOTUS_SONDA_URL: `http://127.0.0.1:${porta(responde)}/up`,
        LOTUS_SONDA_CERT_ARQUIVO: certificado30,
      }),
    )
    expect(linha.ts).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/)
    expect(linha.up).toBe(1)
    expect(linha.http).toBe(200)
    // Gerado agora com -days 30: o piso dá 29, ou 30 se tudo cair no mesmo segundo.
    expect([29, 30]).toContain(linha.cert_dias)
  })

  it('503 dá up 0 com o código', async () => {
    const linha = linhaUnica(
      await sondar({
        LOTUS_SONDA_URL: `http://127.0.0.1:${porta(responde)}/503`,
        LOTUS_SONDA_CERT_ARQUIVO: certificado30,
      }),
    )
    expect(linha.up).toBe(0)
    expect(linha.http).toBe(503)
  })

  it('sem servidor dá up 0 e http 0', async () => {
    const linha = linhaUnica(await sondar({ LOTUS_SONDA_CERT_ARQUIVO: certificado30 }))
    expect(linha.up).toBe(0)
    expect(linha.http).toBe(0)
  })

  it('upstream pendurado termina no teto, com up 0 e http 0', async () => {
    const execucao = await sondar({
      LOTUS_SONDA_URL: `http://127.0.0.1:${porta(pendura)}/up`,
      LOTUS_SONDA_CERT_ARQUIVO: certificado30,
    })
    const linha = linhaUnica(execucao)
    expect(linha.up).toBe(0)
    expect(linha.http).toBe(0)
    // Teto de 10 s, com folga para a máquina lenta, e sempre bem abaixo do minuto do timer.
    expect(execucao.segundos).toBeLessThan(20)
  }, 30_000)

  it('certificado ilegível omite cert_dias — nunca grava número inventado', async () => {
    const linha = linhaUnica(
      await sondar({
        LOTUS_SONDA_URL: `http://127.0.0.1:${porta(responde)}/up`,
        LOTUS_SONDA_CERT_ARQUIVO: ilegivel,
      }),
    )
    expect(linha.up).toBe(1)
    expect('cert_dias' in linha).toBe(false)
  })

  it('TLS inalcançável também omite cert_dias', async () => {
    const linha = linhaUnica(await sondar({ LOTUS_SONDA_URL: `http://127.0.0.1:${porta(responde)}/up` }))
    expect('cert_dias' in linha).toBe(false)
  })

  it('grava em append: uma linha por execução', async () => {
    const log = join(base, 'append.log')
    const env = { LOTUS_SONDA_LOG: log, LOTUS_SONDA_CERT_ARQUIVO: certificado30 }
    await sondar(env)
    const segunda = await sondar(env)
    expect(segunda.status).toBe(0)
    expect(segunda.linhas).toHaveLength(2)
  })

  it('sai diferente de 0 quando não consegue gravar a linha', async () => {
    const execucao = await sondar({ LOTUS_SONDA_LOG: join(base, 'nao-existe', 'sonda.log') })
    expect(execucao.status).not.toBe(0)
  })
})
```

- [ ] **Step 2: rodar e ver falhar.**

Run: `cd frontend && pnpm test --project repo tests/sondar-saude.test.ts`
Expected: FAIL. O `readFileSync` do topo não acha `deploy/bin/sondar-saude.sh` (`ENOENT`).

- [ ] **Step 3: a sonda.** Crie `deploy/bin/sondar-saude.sh` com o conteúdo abaixo, usando a
  variante do caminho que o audit da Task 1 decidiu. Depois, `chmod +x deploy/bin/sondar-saude.sh`.

```bash
#!/usr/bin/env bash
#
# Sonda de saude da producao (item 34, spec §4.2). O timer lotus-sonda, que o
# user-data instala, roda este script a cada minuto, como root. Cada execucao
# grava UMA linha JSON no sonda.log:
#
#   {"ts":"2026-10-04T21:00:00Z","up":1,"http":200,"cert_dias":84}
#
# O CloudWatch agent leva a linha ao grupo /lotus/<ambiente>/sonda, e os metric
# filters do deploy/aws/criar-observabilidade.sh fazem dela Lotus/Sonda Up e
# CertDias. A medicao E a linha: o script sai 0 sempre que a grava, qualquer que
# seja o resultado, e so sai diferente de 0 quando nao consegue grava-la.
# Sem credencial AWS e sem ler o .env.
set -euo pipefail

NOME=app.lotusotec.cl
URL="${LOTUS_SONDA_URL:-https://$NOME/up}"
# >>> VARIANTE A (HAIRPIN: ok) — troque este bloco pela VARIANTE B se a Task 1 mandar.
# Caminho ate o nginx: o hairpin pelo EIP, medido na Task 1 do plano do item 34
# (audit do bloco). Passa por DNS, EIP, security group e TLS como um cliente,
# so que de dentro da AWS.
TLS="${LOTUS_SONDA_TLS:-$NOME:443}"
RESOLVER=()
# <<< VARIANTE A
# Com um PEM aqui, os dias saem do arquivo, sem conectar: e assim que o teste e
# a janela de sondas (runbook §14.4) provam o alarme sem tocar no certificado
# servido.
CERT_ARQUIVO="${LOTUS_SONDA_CERT_ARQUIVO:-}"
LOG="${LOTUS_SONDA_LOG:-/var/log/lotus/sonda.log}"

# HTTP. Sem -L: o 301 da porta 80 nao e saude. Teto de 10 s, para uma execucao
# nunca encostar na seguinte. Sem resposta, o curl escreve 000.
HTTP=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "${RESOLVER[@]}" "$URL" || true)
[[ $HTTP =~ ^[0-9]{3}$ ]] || HTTP=000
HTTP=$((10#$HTTP))
UP=0
if [ "$HTTP" -eq 200 ]; then UP=1; fi

if [ -n "$CERT_ARQUIVO" ]; then
  PEM=$(cat "$CERT_ARQUIVO" 2>/dev/null || true)
else
  PEM=$(timeout 10 openssl s_client -connect "$TLS" -servername "$NOME" </dev/null 2>/dev/null || true)
fi
FIM=$(printf '%s\n' "$PEM" | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2 || true)

# Medicao que falhou omite a chave, nunca grava numero: um 0 inventado viraria
# "certificado vencido" no alarme. Piso, nao truncamento: vencido ha 2 h da -1.
CERT=''
if [ -n "$FIM" ] && VENCE=$(date -u -d "$FIM" +%s 2>/dev/null); then
  RESTO=$((VENCE - $(date -u +%s)))
  if [ "$RESTO" -ge 0 ]; then
    DIAS=$((RESTO / 86400))
  else
    DIAS=$((-((-RESTO + 86399) / 86400)))
  fi
  CERT=",\"cert_dias\":$DIAS"
fi

printf '{"ts":"%s","up":%d,"http":%d%s}\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$UP" "$HTTP" "$CERT" >> "$LOG"
```

**VARIANTE B (`HAIRPIN: quebrado`).** Substitui o bloco entre `>>> VARIANTE A` e `<<< VARIANTE A`.
Os marcadores saem nas duas variantes; só o comentário e as duas linhas ficam:

```bash
# Caminho ate o nginx: pelo loopback, com o nome no SNI e no Host, porque o
# hairpin pelo EIP falhou na Task 1 do plano do item 34 (audit do bloco). Passa
# pelo TLS e pelo nginx; nao passa por DNS, EIP nem security group.
TLS="${LOTUS_SONDA_TLS:-127.0.0.1:443}"
RESOLVER=(--resolve "$NOME:443:127.0.0.1")
```

- [ ] **Step 4: rodar e ver passar.**

Run: `cd frontend && pnpm test --project repo tests/sondar-saude.test.ts`
Expected: PASS, 11 testes. O do upstream pendurado leva ~10 s.

- [ ] **Step 5: as sondas da lição 19.** Com `cp` para `$SCRATCH` e restauração por `cp` + `cmp`.
  Cada uma tem de reprovar o teste nomeado:
  1. troque `CERT=''` por `CERT=',"cert_dias":0'`. Reprova
     `certificado ilegível omite cert_dias — nunca grava número inventado`;
  2. troque `if [ "$HTTP" -eq 200 ]` por `if [ "$HTTP" -lt 600 ]`. Reprova
     `503 dá up 0 com o código`;
  3. tire o `--max-time 10` do `curl`. Reprovam
     `as duas medições têm teto de 10 s, e o curl não segue redirect` e o do upstream pendurado
     (por timeout de 30 s).

  Restaure e confira: `cmp deploy/bin/sondar-saude.sh "$SCRATCH/sondar-saude.sh"` não imprime
  nada. Rode o teste de novo: PASS.

- [ ] **Step 6: lint.** `cd frontend && pnpm lint`. Expected: sem erro.

- [ ] **Step 7: commit.**

```bash
git add deploy/bin/sondar-saude.sh frontend/tests/sondar-saude.test.ts
git commit -m "feat(deploy): sonda de /up e do certificado servido, uma linha por minuto" -m "Co-Authored-By: Claude <modelo> <noreply@anthropic.com>"
```

---

### Task 3: o user-data instala o agente e o timer da sonda

**Files:**
- Modify: `deploy/aws/user-data.sh` (o arquivo inteiro, 47 linhas hoje)
- Create: `frontend/tests/user-data.test.ts`

**Interfaces:**
- Consumes: os nomes e o agente de Global Constraints. Nada de outra task.
- Produces, no host:
  - a linha `^AMBIENTE=prod$`, que a Task 6 troca por `lab` com `sed`;
  - o agente em `/opt/aws/amazon-cloudwatch-agent/`, com a config em
    `/opt/aws/amazon-cloudwatch-agent/etc/lotus-agente.json`;
  - as units `lotus-sonda.service` e `lotus-sonda.timer`;
  - o diretório `/var/log/lotus/` e o `/etc/logrotate.d/lotus-sonda`.

- [ ] **Step 1: o teste que falha.** Crie `frontend/tests/user-data.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

/**
 * `deploy/aws/user-data.sh` é o recreate da EC2 e também o REPARO do host vivo
 * (guardas de reexecução). Desde o item 34 ele instala o CloudWatch agent e o
 * timer da sonda. Rodado no host de produção, ele não pode:
 * - subir versão de pacote — o upgrade do Docker reinicia todos os contêineres;
 * - reiniciar o agente à toa;
 * - escrever uma config que o tradutor do agente recuse. O `set -e` derrubaria
 *   o resto do arquivo depois de o agente já estar instalado.
 *
 * A config do agente é lida do heredoc e PARSEADA, não procurada por
 * substring: substring prova presença, nunca ausência (o padrão do
 * criar-oidc-role.test.ts). A validação de AMBIENTE roda de verdade, mas só o
 * trecho até o `esac`, que não toca no host.
 */
const RAIZ = resolve(__dirname, '..', '..')
const CAMINHO = join(RAIZ, 'deploy', 'aws', 'user-data.sh')
const SCRIPT = readFileSync(CAMINHO, 'utf8')
const LINHAS = SCRIPT.split(/\r?\n/)
const semComentarios = LINHAS.filter((linha) => !/^\s*#/.test(linha)).join('\n')

/**
 * As chaves que o schema do agente aceita num item de `collect_list`, que é
 * `additionalProperties: false`. Lidas do
 * `/opt/aws/amazon-cloudwatch-agent/doc/amazon-cloudwatch-agent-schema.json` do
 * `.deb` 1.300073.2b1889, em 2026-10-04. `from_beginning` NÃO está aqui: o
 * schema a recusa, e o tradutor já usa `true` quando ela falta
 * (`ruleFromBeginning.go`). Trocar a versão do agente é reler esta lista.
 */
const CHAVES_DE_COLLECT_LIST = new Set([
  'auto_removal', 'backpressure_mode', 'blacklist', 'deployment.environment', 'encoding',
  'file_path', 'filters', 'log_group_class', 'log_group_name', 'log_stream_name',
  'multi_line_start_pattern', 'publish_multi_logs', 'retention_in_days', 'service.name',
  'timestamp_format', 'timezone', 'trim_timestamp',
])

type ConfigDoAgente = {
  agent: Record<string, unknown>
  metrics: { namespace: string; metrics_collected: Record<string, Record<string, unknown>> }
  logs: { logs_collected: { files: { collect_list: Record<string, unknown>[] } } }
}

const configDoAgente = (): ConfigDoAgente => {
  // Um heredoc só para o arquivo: um segundo `cat >` sobrescreveria o que foi parseado.
  expect(SCRIPT.match(/cat > "\$CONF\.novo" <<JSON/g)).toHaveLength(1)
  const achado = SCRIPT.match(/cat > "\$CONF\.novo" <<JSON\n([\s\S]*?)\nJSON$/m)
  if (!achado) throw new Error(`heredoc da config do agente não encontrado em ${CAMINHO}`)
  return JSON.parse(achado[1]) as ConfigDoAgente
}

const indice = (teste: (linha: string) => boolean, depoisDe = -1) =>
  LINHAS.findIndex((linha, i) => i > depoisDe && teste(linha))

describe('deploy/aws/user-data.sh', () => {
  it('AMBIENTE=prod no topo, validado antes de qualquer apt-get', () => {
    const ambiente = indice((l) => l === 'AMBIENTE=prod')
    const esac = indice((l) => l.trim() === 'esac', ambiente)
    const apt = indice((l) => /^\s*apt-get\s/.test(l))
    expect(ambiente).toBeGreaterThan(-1)
    expect(esac).toBeGreaterThan(ambiente)
    expect(apt).toBeGreaterThan(esac)
  })

  it('AMBIENTE fora de prod|lab sai 1 sem chegar ao fim do trecho; prod e lab passam', () => {
    const esac = indice((l) => l.trim() === 'esac', indice((l) => l === 'AMBIENTE=prod'))
    const trecho = (valor: string) =>
      `${LINHAS.slice(0, esac + 1).join('\n').replace(/^AMBIENTE=prod$/m, `AMBIENTE=${valor}`)}\necho chegou-ao-fim\n`
    const rodar = (valor: string) => spawnSync('bash', ['-c', trecho(valor)], { encoding: 'utf8' })

    const invalido = rodar('teste')
    expect(invalido.status).toBe(1)
    expect(invalido.stdout).not.toContain('chegou-ao-fim')
    expect(invalido.stderr).toContain('AMBIENTE invalido')
    for (const valor of ['prod', 'lab']) {
      const valido = rodar(valor)
      expect(valido.status).toBe(0)
      expect(valido.stdout).toContain('chegou-ao-fim')
    }
  })

  it('--no-upgrade em todo apt-get install — o reparo nunca sobe versão de pacote', () => {
    const instalacoes = semComentarios.split('\n').filter((l) => /\bapt-get\s+install\b/.test(l))
    expect(instalacoes.length).toBeGreaterThanOrEqual(2)
    for (const linha of instalacoes) expect(linha).toContain('--no-upgrade')
  })

  it('o agente vem fixado — versão, pacote e sha256 — e o sha256 é conferido antes do dpkg', () => {
    const versao = semComentarios.match(/^AGENTE_VERSAO=(\d+\.\d+\.\d+b\d+)$/m)
    const pacote = semComentarios.match(/^AGENTE_PACOTE=(\S+)$/m)
    expect(versao).not.toBeNull()
    expect(pacote?.[1]).toMatch(new RegExp(`^${versao![1].replace(/\./g, '\\.')}-\\d+$`))
    expect(semComentarios).toMatch(/^AGENTE_SHA256=[0-9a-f]{64}$/m)
    expect(semComentarios).toContain('/ubuntu/arm64/$AGENTE_VERSAO/amazon-cloudwatch-agent.deb')
    expect(semComentarios).not.toMatch(/arm64\/latest\//)
    const conferencia = semComentarios.indexOf('sha256sum -c')
    const instalacao = semComentarios.indexOf('dpkg -i')
    expect(conferencia).toBeGreaterThan(-1)
    expect(instalacao).toBeGreaterThan(conferencia)
    // Só instala quando a versão instalada é outra: reexecutar não reinstala.
    expect(semComentarios).toMatch(
      /^if \[ "\$\(dpkg-query -W -f='\$\{Version\}' amazon-cloudwatch-agent 2>\/dev\/null \|\| true\)" != "\$AGENTE_PACOTE" \]; then$/m,
    )
  })

  it('config: métricas com dimensões estáveis entre instâncias', () => {
    const config = configDoAgente()
    // Sem run_as_user: o agente roda como root, o default, que é quem lê /var/lib/docker/containers.
    expect(config.agent).toEqual({ metrics_collection_interval: 60, omit_hostname: true })
    expect(config.metrics.namespace).toBe('Lotus/Host')
    expect(Object.keys(config.metrics.metrics_collected).sort()).toEqual(['disk', 'mem', 'swap'])
    const { disk, mem, swap } = config.metrics.metrics_collected
    expect(disk).toEqual({
      resources: ['/'],
      measurement: ['used_percent'],
      drop_device: true,
      append_dimensions: { Ambiente: '${AMBIENTE}' },
    })
    for (const bloco of [mem, swap]) {
      expect(bloco).toEqual({ measurement: ['used_percent'], append_dimensions: { Ambiente: '${AMBIENTE}' } })
    }
  })

  it('config: todos os contêineres e a sonda, sem retenção vinda do host', () => {
    const [conteineres, sonda, ...resto] = configDoAgente().logs.logs_collected.files.collect_list
    expect(resto).toEqual([])
    expect(conteineres).toEqual({
      file_path: '/var/lib/docker/containers/*/*-json.log',
      log_group_name: '/lotus/${AMBIENTE}/containers',
      log_stream_name: '{instance_id}',
      publish_multi_logs: true,
    })
    expect(sonda).toEqual({
      file_path: '/var/log/lotus/sonda.log',
      log_group_name: '/lotus/${AMBIENTE}/sonda',
      log_stream_name: '{instance_id}',
    })
  })

  it('config: cada item de collect_list só tem chaves que o schema do agente aceita', () => {
    for (const item of configDoAgente().logs.logs_collected.files.collect_list) {
      for (const chave of Object.keys(item)) expect(CHAVES_DE_COLLECT_LIST.has(chave), chave).toBe(true)
    }
  })

  it('a config só é reaplicada quando muda ou com o agente parado', () => {
    expect(semComentarios).toMatch(/^CONF=\/opt\/aws\/amazon-cloudwatch-agent\/etc\/lotus-agente\.json$/m)
    expect(semComentarios).toMatch(
      /^if ! cmp -s "\$CONF\.novo" "\$CONF" \|\| ! systemctl is-active --quiet amazon-cloudwatch-agent; then$/m,
    )
    expect(semComentarios).toContain('amazon-cloudwatch-agent-ctl -a fetch-config -m ec2 -c "file:$CONF" -s')
  })

  it('a sonda: timer de um minuto que espera o script chegar pelo §7', () => {
    expect(semComentarios).toContain('ConditionPathExists=/opt/lotus/bin/sondar-saude.sh')
    expect(semComentarios).toContain('ExecStart=/opt/lotus/bin/sondar-saude.sh')
    expect(semComentarios).toContain('Type=oneshot')
    expect(semComentarios).toContain('OnCalendar=minutely')
    expect(semComentarios).toMatch(/^systemctl enable --now lotus-sonda\.timer$/m)
    expect(semComentarios).toMatch(/^install -d -m 0750 \/var\/log\/lotus$/m)
    const rotacao = semComentarios.match(/\/var\/log\/lotus\/sonda\.log \{([\s\S]*?)\}/)
    expect(rotacao?.[1]).toMatch(/^\s*daily$/m)
    expect(rotacao?.[1]).toMatch(/^\s*rotate 7$/m)
  })
})
```

- [ ] **Step 2: rodar e ver falhar.**

Run: `cd frontend && pnpm test --project repo tests/user-data.test.ts`
Expected: FAIL. Falta `AMBIENTE=prod`, falta `--no-upgrade` e falta o heredoc da config. O teste
de `--no-upgrade` já reprova com as duas linhas de hoje.

- [ ] **Step 3: reconferir o agente publicado.** A spec manda ler a versão corrente e o sha256 do
  `.deb` baixado na hora de escrever:

```bash
curl -s https://amazoncloudwatch-agent.s3.amazonaws.com/info/latest/CWAGENT_VERSION
```

- **Saiu `1.300073.2b1889`:** baixe e confira o sha256 de Global Constraints.

  ```bash
  curl -fsSL -o "$SCRATCH/agente.deb" "https://amazoncloudwatch-agent-sa-east-1.s3.sa-east-1.amazonaws.com/ubuntu/arm64/1.300073.2b1889/amazon-cloudwatch-agent.deb"
  sha256sum "$SCRATCH/agente.deb"; dpkg-deb -f "$SCRATCH/agente.deb" Version
  ```

  Esperado: o sha256 de Global Constraints e `1.300073.2b1889-1`. Divergiu → **PARE**: o mesmo
  nome de versão com outro conteúdo é alarme de cadeia de suprimento, não detalhe.
- **Saiu uma versão mais nova:** confira que ela existe no bucket regional, com
  `curl -sI <URL regional com a versão nova>`, que tem de dar `200`. Baixe por essa URL e meça
  `sha256sum` e `dpkg-deb -f … Version`. Releia o schema:

  ```bash
  dpkg-deb -x "$SCRATCH/agente.deb" "$SCRATCH/deb"
  python3 -c "import json,sys; d=json.load(open(sys.argv[1]))['definitions']; i=d['logsDefinition']['definitions']['logsFilesDefinition']['properties']['collect_list']['items']; print(sorted(i['properties']), i.get('additionalProperties'))" "$SCRATCH/deb/opt/aws/amazon-cloudwatch-agent/doc/amazon-cloudwatch-agent-schema.json"
  ```

  Use os três valores novos no Step 4. A lista impressa vira o `CHAVES_DE_COLLECT_LIST` do teste,
  com a versão no comentário. Se `publish_multi_logs` sumir da lista, ou se `from_beginning`
  aparecer nela, **PARE**: a premissa do achado 1 da spec mudou. Registre a versão escolhida e o
  porquê no `rulings.md`.

- [ ] **Step 4: o user-data novo.** Substitua o conteúdo inteiro de `deploy/aws/user-data.sh` por
  este. As seções do AWS CLI, do swap e da árvore de operação ficam iguais às de hoje.

```bash
#!/usr/bin/env bash
#
# user-data da EC2 de produção (Ubuntu 24.04 arm64) — spec v2 do item 10, §6.
# Reproduzível: host novo + este arquivo + runbook = ambiente igual.
set -euxo pipefail

# Ambiente do host (item 34): `prod` na produção; o lab do runbook §14.1 troca
# para `lab`. Vira a dimensão `Ambiente` das métricas e o meio do nome dos log
# groups — um lab com `prod` aqui publicaria nas métricas dos alarmes de
# produção. Validado antes de qualquer outra linha: valor fora disso sai 1 sem
# tocar no host.
AMBIENTE=prod
case "$AMBIENTE" in
  prod|lab) ;;
  *) echo "AMBIENTE invalido: '$AMBIENTE' (use prod ou lab)" >&2; exit 1 ;;
esac

# Docker Engine + compose plugin (repositório oficial do Docker).
# `--no-upgrade` em todo `apt-get install` (item 34, D8): este arquivo também é
# o reparo do host vivo, e sem a flag um pacote já instalado subiria de versão —
# o upgrade do Docker reinicia o daemon e derruba todos os contêineres.
apt-get update
apt-get install -y --no-upgrade ca-certificates curl gnupg unzip
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
echo "deb [arch=arm64 signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu noble stable" \
  > /etc/apt/sources.list.d/docker.list
apt-get update
apt-get install -y --no-upgrade docker-ce docker-ce-cli containerd.io docker-compose-plugin

# AWS CLI v2 pelo instalador oficial — o backup-db.sh fala com o S3 pela
# instance role. NÃO use `apt-get install awscli`: medido em 2026-09-04 no
# host, o noble não tem candidato ("E: Package 'awscli' has no installation
# candidate") e o `set -e` derruba o user-data inteiro antes do Docker.
if ! command -v aws >/dev/null; then
  curl -fsSL https://awscli.amazonaws.com/awscli-exe-linux-aarch64.zip -o /tmp/awscliv2.zip
  unzip -q /tmp/awscliv2.zip -d /tmp
  /tmp/aws/install
  rm -rf /tmp/awscliv2.zip /tmp/aws
fi

# Swap de 2 GiB — obrigatório (t4g.small tem 2 GiB; o swap absorve pico de
# PDF/reload do clamav; swap SUSTENTADO é critério de resize, não de mais
# swap).
# Guardas de reexecução: o script também é o reparo de um host que subiu sem
# user-data (medido em 2026-09-04). Sem elas, `mkswap` em swap ativo aborta e
# a linha do fstab duplica.
if ! swapon --show | grep -q '/swapfile'; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
fi
grep -q '^/swapfile ' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab

# Árvore de operação. Os artefatos (compose, scripts, conf) chegam pelo
# runbook (§7) — user-data não clona repositório: produção não depende de
# working tree (DoD 8).
mkdir -p /opt/lotus/nginx /opt/lotus/bin
chmod 750 /opt/lotus

# CloudWatch agent (item 34, spec §4.1): o .deb arm64 oficial, do bucket
# regional, com versão e sha256 fixados — medidos em 2026-10-04, iguais no
# bucket global. Instala só se a versão instalada for outra: trocar de versão é
# trocar as três linhas, com o sha256 lido do .deb baixado.
AGENTE_VERSAO=1.300073.2b1889
AGENTE_PACOTE=1.300073.2b1889-1
AGENTE_SHA256=0d04b62f688f257aa35604f89b48f259cea5ed412985831d8d56838f43332169
if [ "$(dpkg-query -W -f='${Version}' amazon-cloudwatch-agent 2>/dev/null || true)" != "$AGENTE_PACOTE" ]; then
  curl -fsSL "https://amazoncloudwatch-agent-sa-east-1.s3.sa-east-1.amazonaws.com/ubuntu/arm64/$AGENTE_VERSAO/amazon-cloudwatch-agent.deb" \
    -o /tmp/amazon-cloudwatch-agent.deb
  echo "$AGENTE_SHA256  /tmp/amazon-cloudwatch-agent.deb" | sha256sum -c -
  dpkg -i /tmp/amazon-cloudwatch-agent.deb
  rm -f /tmp/amazon-cloudwatch-agent.deb
fi

# Config do agente (spec §4.1 e achado 1):
# - omit_hostname e drop_device deixam as dimensões estáveis entre instâncias:
#   um recreate não deixa os alarmes órfãos;
# - publish_multi_logs: sem ela, o glob envia só o arquivo modificado por
#   último, um contêiner por vez;
# - sem from_beginning: o schema do agente recusa a chave em collect_list, e o
#   tradutor já usa true por default — escrita, ela derrubaria o fetch-config;
# - sem retention_in_days: a retenção é do criar-observabilidade.sh, e a role
#   não pode mudá-la;
# - sem run_as_user: o agente roda como root, o default, que é quem lê
#   /var/lib/docker/containers.
# Reaplica (e reinicia o agente) só quando a config muda ou o agente não está
# de pé: reexecutar este arquivo no host vivo não mexe em nada.
CONF=/opt/aws/amazon-cloudwatch-agent/etc/lotus-agente.json
cat > "$CONF.novo" <<JSON
{
  "agent": {
    "metrics_collection_interval": 60,
    "omit_hostname": true
  },
  "metrics": {
    "namespace": "Lotus/Host",
    "metrics_collected": {
      "disk": {
        "resources": ["/"],
        "measurement": ["used_percent"],
        "drop_device": true,
        "append_dimensions": {"Ambiente": "${AMBIENTE}"}
      },
      "mem": {
        "measurement": ["used_percent"],
        "append_dimensions": {"Ambiente": "${AMBIENTE}"}
      },
      "swap": {
        "measurement": ["used_percent"],
        "append_dimensions": {"Ambiente": "${AMBIENTE}"}
      }
    }
  },
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/var/lib/docker/containers/*/*-json.log",
            "log_group_name": "/lotus/${AMBIENTE}/containers",
            "log_stream_name": "{instance_id}",
            "publish_multi_logs": true
          },
          {
            "file_path": "/var/log/lotus/sonda.log",
            "log_group_name": "/lotus/${AMBIENTE}/sonda",
            "log_stream_name": "{instance_id}"
          }
        ]
      }
    }
  }
}
JSON
if ! cmp -s "$CONF.novo" "$CONF" || ! systemctl is-active --quiet amazon-cloudwatch-agent; then
  mv "$CONF.novo" "$CONF"
  /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -a fetch-config -m ec2 -c "file:$CONF" -s
else
  rm -f "$CONF.novo"
fi

# Sonda de saúde (item 34, spec §4.2). O script chega pelo §7 do runbook; até
# lá o timer dispara e o ConditionPathExists pula — falta dado, e o alarme de
# /up acusa, que é o certo para um host que ainda não recebeu deploy.
install -d -m 0750 /var/log/lotus
cat > /etc/logrotate.d/lotus-sonda <<'ROTACAO'
/var/log/lotus/sonda.log {
    daily
    rotate 7
    missingok
    notifempty
    compress
    delaycompress
}
ROTACAO
cat > /etc/systemd/system/lotus-sonda.service <<'UNIT'
[Unit]
Description=Lotus - sonda de saude (/up e certificado), uma linha JSON por execucao
ConditionPathExists=/opt/lotus/bin/sondar-saude.sh

[Service]
Type=oneshot
ExecStart=/opt/lotus/bin/sondar-saude.sh
UNIT
cat > /etc/systemd/system/lotus-sonda.timer <<'UNIT'
[Unit]
Description=Lotus - sonda de saude a cada minuto

[Timer]
OnCalendar=minutely
AccuracySec=1s

[Install]
WantedBy=timers.target
UNIT
systemctl daemon-reload
systemctl enable --now lotus-sonda.timer
```

Se o Step 3 trouxe uma versão nova, as três linhas `AGENTE_*` levam os valores medidos lá.

- [ ] **Step 5: rodar e ver passar.**

Run: `cd frontend && pnpm test --project repo tests/user-data.test.ts && bash -n deploy/aws/user-data.sh`
Expected: PASS, 9 testes, e nenhuma saída do `bash -n`.

- [ ] **Step 6: as sondas da lição 19.** Com `cp` para `$SCRATCH` e restauração por `cp` + `cmp`:
  1. tire o `--no-upgrade` da linha do Docker. Reprova
     `--no-upgrade em todo apt-get install — o reparo nunca sobe versão de pacote`;
  2. tire a linha `"publish_multi_logs": true` e a vírgula que a precede. Reprova
     `config: todos os contêineres e a sonda, sem retenção vinda do host`;
  3. acrescente `"from_beginning": true,` no item da sonda. Reprovam
     `config: cada item de collect_list só tem chaves que o schema do agente aceita` e o teste dos
     contêineres e da sonda.

  Restaure, confira com `cmp deploy/aws/user-data.sh "$SCRATCH/user-data.sh"` e rode o teste de
  novo: PASS.

- [ ] **Step 7: lint e commit.**

```bash
(cd frontend && pnpm lint)
git add deploy/aws/user-data.sh frontend/tests/user-data.test.ts
git commit -m "feat(deploy): user-data instala o CloudWatch agent e o timer da sonda" -m "Co-Authored-By: Claude <modelo> <noreply@anthropic.com>"
```

---

### Task 4: `deploy/aws/criar-observabilidade.sh` — inline, log groups, filtros e alarmes

**Files:**
- Create: `deploy/aws/criar-observabilidade.sh`
- Create: `frontend/tests/criar-observabilidade.test.ts`
- Create: `frontend/tests/fixtures/aws-falso.sh`

**Interfaces:**
- Consumes, do audit da Task 1:
  - `FSTYPE`, no `DISCO`;
  - `NGINX_200` e `NGINX_H2_200`, nas linhas de prova. As de 5xx derivam delas, trocando só o
    status.
- Produces:
  - **`criar-observabilidade.sh base <prod|lab>`:**
    - a inline `lotus-observabilidade`;
    - os grupos `/lotus/<ambiente>/containers` e `/lotus/<ambiente>/sonda`, com 30 ou 1 dia;
    - em `prod`, os filtros `Up`, `CertDias` e `Http5xx`;
    - o readback, que sai 1 com retenção errada.
  - **`criar-observabilidade.sh alarmes`:** os quatro alarmes, com as três recusas e o readback.
  - Quem usa: a Task 6 roda os dois `base`, e a Fase B, o `alarmes`. A Task 7 documenta os dois.

- [ ] **Step 1: o `aws` falso.** Crie `frontend/tests/fixtures/aws-falso.sh` e rode
  `chmod +x frontend/tests/fixtures/aws-falso.sh`:

```bash
#!/usr/bin/env bash
#
# `aws` de mentira do frontend/tests/criar-observabilidade.test.ts. Registra
# cada chamada em $FAKE_LOG — uma linha `---` e depois um argumento por linha —
# e devolve o minimo que o deploy/aws/criar-observabilidade.sh le. Os FAKE_*
# escolhem o cenario; sem eles, tudo existe e tudo passa.
{
  printf '%s\n' '---'
  printf '%s\n' "$@"
} >> "$FAKE_LOG"

junto=" $* "
case "$junto" in
  *" sts get-caller-identity "*)
    echo 123456789012
    ;;
  *" logs test-metric-filter "*)
    padrao='' linha='' anterior=''
    for arg in "$@"; do
      case "$anterior" in
        --filter-pattern) padrao=$arg ;;
        --log-event-messages) linha=$arg ;;
      esac
      anterior=$arg
    done
    case "$padrao" in
      *'$.up'*)
        case "$linha" in *'"up":'*) echo 1 ;; *) echo 0 ;; esac
        ;;
      *'$.cert_dias'*)
        case "$linha" in *'"cert_dias":'*) echo 1 ;; *) echo 0 ;; esac
        ;;
      *'$.log'*)
        case "$padrao" in
          *%*) recusa=${FAKE_RECUSA_REGEX:-0} ;;
          *) recusa=${FAKE_RECUSA_LITERAL:-0} ;;
        esac
        if [ "$recusa" = 1 ]; then
          echo 'An error occurred (InvalidParameterException): Invalid character(s) in term' >&2
          exit 254
        fi
        case "$linha" in *' 502 '* | *' 503 '*) echo 1 ;; *) echo 0 ;; esac
        ;;
    esac
    ;;
  *" logs describe-log-groups "*retentionInDays*)
    echo "${FAKE_RETENCAO:-}"
    ;;
  *" cloudwatch get-metric-statistics "*"--metric-name Up "*)
    echo "${FAKE_UP:-5}"
    ;;
  *" cloudwatch get-metric-statistics "*"--metric-name disk_used_percent "*)
    echo "${FAKE_DISCO:-5}"
    ;;
  *" sns list-subscriptions-by-topic "*)
    echo "${FAKE_ASSINATURAS:-1}"
    ;;
  *" cloudwatch describe-alarms "*"length(MetricAlarms"*)
    echo 4
    ;;
esac
exit 0
```

- [ ] **Step 2: o teste que falha.** Crie `frontend/tests/criar-observabilidade.test.ts`. O `ext4`
  do `DISCO` esperado é o `FSTYPE` do audit; se o audit disser outro, troque aqui e no Step 4.

```ts
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { spawnSync } from 'node:child_process'
import { chmodSync, copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

/**
 * `deploy/aws/criar-observabilidade.sh` cria, com a credencial administrativa
 * do João, a inline da EC2, os log groups, os metric filters e os quatro
 * alarmes do item 34. O que ele não pode virar:
 * - uma role que cria grupo ou muda retenção;
 * - um filtro que publica 0 onde devia calar;
 * - um alarme com limiar ou falta de dado diferentes da spec §4.4;
 * - alarmes criados antes de existir o dado que os tira de INSUFFICIENT_DATA.
 *
 * Duas metades. A política IAM é lida do heredoc e PARSEADA (padrão do
 * criar-oidc-role.test.ts). O resto roda o script DE VERDADE, com o
 * `tests/fixtures/aws-falso.sh` no PATH, que registra cada chamada com um
 * argumento por linha. É a lição 19: a catraca que só guarda a palavra deixa o
 * `exit 1` virar aviso.
 */
const RAIZ = resolve(__dirname, '..', '..')
const CAMINHO = join(RAIZ, 'deploy', 'aws', 'criar-observabilidade.sh')
const FALSO = join(__dirname, 'fixtures', 'aws-falso.sh')
const SCRIPT = readFileSync(CAMINHO, 'utf8')
const semComentarios = SCRIPT.split(/\r?\n/)
  .filter((linha) => !/^\s*#/.test(linha))
  .join('\n')

const TOPICO_FALSO = 'arn:aws:sns:sa-east-1:123456789012:lotus-alertas'
const DISCO = ['Name=Ambiente,Value=prod', 'Name=fstype,Value=ext4', 'Name=path,Value=/']
const P_5XX_REGEX = '{ $.log = %HTTP/[0-9.]+..5[0-9]{2}.% }'
const P_5XX_LITERAL =
  '{ ($.log = "*HTTP/1.1\\" 5*") || ($.log = "*HTTP/2.0\\" 5*") || ($.log = "*HTTP/1.0\\" 5*") }'

/** A tabela da spec §4.4, flag a flag. Mudar um número aqui é mudar a spec. */
const ALARMES: Record<string, Record<string, string | string[]>> = {
  'lotus-prod-up': {
    '--namespace': 'Lotus/Sonda', '--metric-name': 'Up', '--dimensions': [],
    '--statistic': 'Minimum', '--period': '60', '--evaluation-periods': '5', '--datapoints-to-alarm': '3',
    '--comparison-operator': 'LessThanThreshold', '--threshold': '1', '--treat-missing-data': 'breaching',
  },
  'lotus-prod-5xx': {
    '--namespace': 'Lotus/Sonda', '--metric-name': 'Http5xx', '--dimensions': [],
    '--statistic': 'Sum', '--period': '300', '--evaluation-periods': '1', '--datapoints-to-alarm': '1',
    '--comparison-operator': 'GreaterThanOrEqualToThreshold', '--threshold': '5', '--treat-missing-data': 'notBreaching',
  },
  'lotus-prod-disco': {
    '--namespace': 'Lotus/Host', '--metric-name': 'disk_used_percent', '--dimensions': DISCO,
    '--statistic': 'Maximum', '--period': '300', '--evaluation-periods': '2', '--datapoints-to-alarm': '2',
    '--comparison-operator': 'GreaterThanThreshold', '--threshold': '80', '--treat-missing-data': 'ignore',
  },
  'lotus-prod-certificado': {
    '--namespace': 'Lotus/Sonda', '--metric-name': 'CertDias', '--dimensions': [],
    '--statistic': 'Minimum', '--period': '300', '--evaluation-periods': '1', '--datapoints-to-alarm': '1',
    '--comparison-operator': 'LessThanThreshold', '--threshold': '21', '--treat-missing-data': 'ignore',
  },
}

type Statement = {
  Effect: string
  Action: string | string[]
  Resource: string | string[]
  Condition?: Record<string, Record<string, string>>
}

const politica = (): Statement[] => {
  expect(SCRIPT.match(/cat > "\$TMP\/observabilidade\.json"/g)).toHaveLength(1)
  const achado = SCRIPT.match(/cat > "\$TMP\/observabilidade\.json" <<JSON\n([\s\S]*?)\nJSON$/m)
  if (!achado) throw new Error(`heredoc da lotus-observabilidade não encontrado em ${CAMINHO}`)
  return (JSON.parse(achado[1]) as { Statement: Statement[] }).Statement
}

let base: string
let bin: string
let contador = 0

beforeAll(() => {
  base = mkdtempSync(join(tmpdir(), 'criar-observabilidade-'))
  bin = join(base, 'bin')
  mkdirSync(bin)
  copyFileSync(FALSO, join(bin, 'aws'))
  chmodSync(join(bin, 'aws'), 0o755)
})

afterAll(() => {
  rmSync(base, { recursive: true, force: true })
})

type Execucao = { status: number | null; stderr: string; chamadas: string[][] }

/** Roda o script com o `aws` falso na frente do PATH. `env` liga os FAKE_* da fixture. */
const rodar = (args: string[], env: Record<string, string> = {}): Execucao => {
  contador += 1
  const log = join(base, `chamadas-${contador}.log`)
  const r = spawnSync('bash', [CAMINHO, ...args], {
    encoding: 'utf8',
    env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, FAKE_LOG: log, ...env },
  })
  const chamadas = existsSync(log)
    ? readFileSync(log, 'utf8')
        .split('---\n')
        .filter(Boolean)
        .map((bloco) => bloco.replace(/\n$/, '').split('\n'))
    : []
  return { status: r.status, stderr: r.stderr, chamadas }
}

const doTipo = (e: Execucao, servico: string, verbo: string) =>
  e.chamadas.filter((c) => c[0] === servico && c[1] === verbo)

/** Os valores de uma flag: tudo o que vem depois dela, até a próxima `--flag`. */
const valores = (chamada: string[], flag: string): string[] => {
  const i = chamada.indexOf(flag)
  if (i === -1) return []
  const fim = chamada.findIndex((arg, j) => j > i && arg.startsWith('--'))
  return chamada.slice(i + 1, fim === -1 ? undefined : fim)
}
const valor = (chamada: string[], flag: string) => valores(chamada, flag)[0]

const primeiraPosicao = (e: Execucao, servico: string, verbo: string) =>
  e.chamadas.findIndex((c) => c[0] === servico && c[1] === verbo)
const ultimaPosicao = (e: Execucao, servico: string, verbo: string) =>
  e.chamadas.map((c) => c[0] === servico && c[1] === verbo).lastIndexOf(true)

describe('deploy/aws/criar-observabilidade.sh — arquivo', () => {
  it('é executável, falha alto e não deixa a política no /tmp', () => {
    expect(statSync(CAMINHO).mode & 0o111).not.toBe(0)
    expect(semComentarios).toMatch(/^set -euo pipefail$/m)
    expect(semComentarios).toMatch(/^trap 'rm -rf "\$TMP"' EXIT$/m)
  })

  it('nenhum número de conta nem ARN fixo — a conta vem do sts', () => {
    expect(SCRIPT).not.toMatch(/\d{12}/)
    expect(semComentarios).toMatch(/^TOPICO="arn:aws:sns:\$REGIAO:\$CONTA:lotus-alertas"$/m)
  })

  it('a inline da EC2 é mínima: não cria grupo nem muda retenção', () => {
    const statements = politica()
    expect(statements.map((s) => s.Effect)).toEqual(['Allow', 'Allow'])
    expect(statements.flatMap((s) => [s.Action].flat()).sort()).toEqual([
      'cloudwatch:PutMetricData',
      'logs:CreateLogStream',
      'logs:DescribeLogStreams',
      'logs:PutLogEvents',
    ])
    const logs = statements.find((s) => [s.Action].flat().includes('logs:PutLogEvents'))
    expect(logs?.Resource).toEqual([
      'arn:aws:logs:$REGIAO:$CONTA:log-group:/lotus/*',
      'arn:aws:logs:$REGIAO:$CONTA:log-group:/lotus/*:log-stream:*',
    ])
    const metricas = statements.find((s) => s.Action === 'cloudwatch:PutMetricData')
    expect(metricas?.Resource).toBe('*')
    expect(metricas?.Condition).toEqual({ StringEquals: { 'cloudwatch:namespace': 'Lotus/Host' } })
    // A única concessão do script é esta inline, na lotus-ec2, com o documento parseado acima.
    expect(semComentarios.match(/(attach|put)-role-policy/g) ?? []).toHaveLength(1)
    expect(semComentarios).toMatch(
      /aws iam put-role-policy --role-name lotus-ec2 --policy-name lotus-observabilidade \\\n\s+--policy-document "file:\/\/\$TMP\/observabilidade\.json"/,
    )
  })

  it('as linhas de prova do 5xx são a mesma requisição da de 200, com outro status', () => {
    const linha = (nome: string) => semComentarios.match(new RegExp(`^${nome}='(.+)'$`, 'm'))?.[1]
    const n200 = linha('NGINX_200')
    const h2200 = linha('NGINX_H2_200')
    expect(n200).toContain('\\" 200 ')
    expect(h2200).toContain('HTTP/2.0\\" 200 ')
    expect(linha('NGINX_502')).toBe(n200?.replace('\\" 200 ', '\\" 502 '))
    expect(linha('NGINX_H2_503')).toBe(h2200?.replace('\\" 200 ', '\\" 503 '))
  })

  it.each([[[]], [['base']], [['base', 'teste']], [['alarmes', 'prod']], [['outra']]])(
    'uso errado %j sai 2 sem chamar a AWS',
    (args) => {
      const e = rodar(args)
      expect(e.status).toBe(2)
      expect(e.chamadas).toEqual([])
    },
  )
})

describe('criar-observabilidade.sh base', () => {
  it('prod: grupos de 30 dias e os três filtros, cada padrão conferido antes de qualquer put', () => {
    const e = rodar(['base', 'prod'], { FAKE_RETENCAO: '30' })
    expect(e.status, e.stderr).toBe(0)
    expect(doTipo(e, 'logs', 'create-log-group').map((c) => valor(c, '--log-group-name'))).toEqual([
      '/lotus/prod/containers',
      '/lotus/prod/sonda',
    ])
    for (const c of doTipo(e, 'logs', 'put-retention-policy')) expect(valor(c, '--retention-in-days')).toBe('30')
    expect(ultimaPosicao(e, 'logs', 'test-metric-filter')).toBeLessThan(primeiraPosicao(e, 'logs', 'put-metric-filter'))

    const filtros = doTipo(e, 'logs', 'put-metric-filter')
    expect(filtros.map((c) => [valor(c, '--log-group-name'), valor(c, '--filter-name'), valor(c, '--metric-transformations')])).toEqual([
      ['/lotus/prod/sonda', 'Up', 'metricName=Up,metricNamespace=Lotus/Sonda,metricValue=$.up'],
      ['/lotus/prod/sonda', 'CertDias', 'metricName=CertDias,metricNamespace=Lotus/Sonda,metricValue=$.cert_dias'],
      ['/lotus/prod/containers', 'Http5xx', 'metricName=Http5xx,metricNamespace=Lotus/Sonda,metricValue=1,defaultValue=0'],
    ])
    expect(valor(filtros[2], '--filter-pattern')).toBe(P_5XX_REGEX)
  })

  it('lab: 1 dia e nenhum filtro — filtro no lab publicaria na métrica de produção', () => {
    const e = rodar(['base', 'lab'], { FAKE_RETENCAO: '1' })
    expect(e.status, e.stderr).toBe(0)
    for (const c of doTipo(e, 'logs', 'put-retention-policy')) {
      expect(valor(c, '--log-group-name')).toMatch(/^\/lotus\/lab\//)
      expect(valor(c, '--retention-in-days')).toBe('1')
    }
    expect(doTipo(e, 'logs', 'test-metric-filter').length).toBeGreaterThan(0)
    expect(doTipo(e, 'logs', 'put-metric-filter')).toEqual([])
  })

  it('regex recusada: o 5xx sai com o termo literal', () => {
    const e = rodar(['base', 'prod'], { FAKE_RETENCAO: '30', FAKE_RECUSA_REGEX: '1' })
    expect(e.status, e.stderr).toBe(0)
    const http5xx = doTipo(e, 'logs', 'put-metric-filter').find((c) => valor(c, '--filter-name') === 'Http5xx')
    expect(valor(http5xx!, '--filter-pattern')).toBe(P_5XX_LITERAL)
  })

  it('as duas formas recusadas: portão D14, sem filtro nenhum', () => {
    const e = rodar(['base', 'prod'], { FAKE_RETENCAO: '30', FAKE_RECUSA_REGEX: '1', FAKE_RECUSA_LITERAL: '1' })
    expect(e.status).toBe(1)
    expect(e.stderr).toContain('PORTAO D14')
    expect(doTipo(e, 'logs', 'put-metric-filter')).toEqual([])
  })

  it('retenção diferente no readback sai 1', () => {
    const e = rodar(['base', 'prod'], { FAKE_RETENCAO: '7' })
    expect(e.status).toBe(1)
    expect(e.stderr).toContain('retencao')
  })
})

describe('criar-observabilidade.sh alarmes', () => {
  it('os quatro alarmes iguais à spec §4.4, com ALARM e OK no tópico', () => {
    const e = rodar(['alarmes'])
    expect(e.status, e.stderr).toBe(0)
    const criados = doTipo(e, 'cloudwatch', 'put-metric-alarm')
    expect(criados.map((c) => valor(c, '--alarm-name'))).toEqual(Object.keys(ALARMES))
    for (const chamada of criados) {
      const esperado = ALARMES[valor(chamada, '--alarm-name')]
      for (const [flag, valorEsperado] of Object.entries(esperado)) {
        if (Array.isArray(valorEsperado)) expect(valores(chamada, flag), flag).toEqual(valorEsperado)
        else expect(valor(chamada, flag), flag).toBe(valorEsperado)
      }
      expect(valores(chamada, '--alarm-actions')).toEqual([TOPICO_FALSO])
      expect(valores(chamada, '--ok-actions')).toEqual([TOPICO_FALSO])
      expect(valor(chamada, '--alarm-description')).toContain('deploy/aws/README.md secao 14.6')
    }
    // A recusa do disco pergunta pelas MESMAS dimensões que o alarme usa.
    const consulta = doTipo(e, 'cloudwatch', 'get-metric-statistics').find(
      (c) => valor(c, '--metric-name') === 'disk_used_percent',
    )
    expect(valores(consulta!, '--dimensions')).toEqual(DISCO)
  })

  it('recusa sem Up recente, sem criar alarme', () => {
    const e = rodar(['alarmes'], { FAKE_UP: '0' })
    expect(e.status).toBe(1)
    expect(e.stderr).toContain('sem Lotus/Sonda Up')
    expect(doTipo(e, 'cloudwatch', 'put-metric-alarm')).toEqual([])
  })

  it('recusa sem a métrica de disco com as dimensões do alarme', () => {
    const e = rodar(['alarmes'], { FAKE_DISCO: '0' })
    expect(e.status).toBe(1)
    expect(e.stderr).toContain('disk_used_percent')
    expect(doTipo(e, 'cloudwatch', 'put-metric-alarm')).toEqual([])
  })

  it('recusa sem assinatura confirmada — PendingConfirmation não conta', () => {
    const e = rodar(['alarmes'], { FAKE_ASSINATURAS: '0' })
    expect(e.status).toBe(1)
    expect(e.stderr).toContain('assinatura confirmada')
    expect(doTipo(e, 'cloudwatch', 'put-metric-alarm')).toEqual([])
    const consulta = doTipo(e, 'sns', 'list-subscriptions-by-topic')[0]
    expect(valor(consulta, '--query')).toBe("length(Subscriptions[?starts_with(SubscriptionArn, 'arn:')])")
  })
})
```

- [ ] **Step 3: rodar e ver falhar.**

Run: `cd frontend && pnpm test --project repo tests/criar-observabilidade.test.ts`
Expected: FAIL. O `readFileSync` do topo não acha `deploy/aws/criar-observabilidade.sh` (`ENOENT`).

- [ ] **Step 4: o script.** Crie `deploy/aws/criar-observabilidade.sh` com o conteúdo abaixo e rode
  `chmod +x deploy/aws/criar-observabilidade.sh`. Antes, troque os quatro `NGINX_*` pelas linhas do
  audit da Task 1:
  - `NGINX_200` é a linha do healthcheck, como está;
  - `NGINX_502` é a mesma linha com `\" 200 ` trocado por `\" 502 `;
  - `NGINX_H2_200` é a linha do hairpin, como está no audit, já com `203.0.113.10`;
  - `NGINX_H2_503` é a mesma com `\" 200 ` trocado por `\" 503 `.

  As linhas ficam entre aspas simples, com os `\"` e o `\n` literais do `json-file`. Uma linha real
  com aspa simples → **PARE** e escolha outra no Step 4 da Task 1. O `ext4` do `DISCO` é o
  `FSTYPE` do audit.

```bash
#!/usr/bin/env bash
#
# Observabilidade da producao (item 34; spec do bloco, §4.3; runbook §14).
# Idempotente: reexecutar nao estraga nada, e cada etapa termina em readback.
# Quem roda e' o JOAO, com credencial administrativa da conta; a sessao confere
# a saida.
#
# Uso, da raiz do repositorio:
#   deploy/aws/criar-observabilidade.sh base prod   # inline, grupos de 30 dias, os tres filtros
#   deploy/aws/criar-observabilidade.sh base lab    # grupos de 1 dia, sem filtro
#   deploy/aws/criar-observabilidade.sh alarmes     # os quatro alarmes de producao
#
# Nenhum numero de conta nem ARN neste arquivo: a conta vem do sts, e o ARN do
# topico se monta com ela.
set -euo pipefail

REGIAO="${LOTUS_REGIAO:-sa-east-1}"

# Dimensoes EXATAS do disk_used_percent de producao: as que o agente publica com
# drop_device e omit_hostname (user-data). O fstype e' o de / no host, lido na
# Task 1 do plano do item 34 e conferido no lab. O alarme e a recusa do
# `alarmes` usam as mesmas.
DISCO=(Name=Ambiente,Value=prod Name=fstype,Value=ext4 Name=path,Value=/)
ALARMES=(lotus-prod-up lotus-prod-5xx lotus-prod-disco lotus-prod-certificado)

# Linhas de prova do test-metric-filter. As do nginx sao linhas reais do
# json-file de producao (audit do item 34, Task 1), com o IP do hairpin trocado
# por 203.0.113.10; a de 5xx e' a de 200 com outro status, para o padrao provar
# que olha o status e nao o resto da linha.
NGINX_200='{"log":"127.0.0.1 - - [04/Oct/2026:21:00:00 +0000] \"GET /up HTTP/1.1\" 200 2 \"-\" \"Wget\" \"-\"\n","stream":"stdout","time":"2026-10-04T21:00:00.000000000Z"}'
NGINX_502='{"log":"127.0.0.1 - - [04/Oct/2026:21:00:00 +0000] \"GET /up HTTP/1.1\" 502 2 \"-\" \"Wget\" \"-\"\n","stream":"stdout","time":"2026-10-04T21:00:00.000000000Z"}'
NGINX_H2_200='{"log":"203.0.113.10 - - [04/Oct/2026:21:00:00 +0000] \"GET /up HTTP/2.0\" 200 2 \"-\" \"curl/8.5.0\" \"-\"\n","stream":"stdout","time":"2026-10-04T21:00:00.000000000Z"}'
NGINX_H2_503='{"log":"203.0.113.10 - - [04/Oct/2026:21:00:00 +0000] \"GET /up HTTP/2.0\" 503 2 \"-\" \"curl/8.5.0\" \"-\"\n","stream":"stdout","time":"2026-10-04T21:00:00.000000000Z"}'
SONDA_OK='{"ts":"2026-10-04T21:00:00Z","up":1,"http":200,"cert_dias":84}'
SONDA_FORA='{"ts":"2026-10-04T21:00:00Z","up":0,"http":0}'
SONDA_VENCIDO='{"ts":"2026-10-04T21:00:00Z","up":1,"http":200,"cert_dias":-2}'
LIXO='linha que nao e da sonda'

# Padroes (spec §4.3). Up e CertDias casam so a linha que traz a chave e ficam
# sem default: um 0 em cada evento que nao casa viraria queda falsa e
# certificado vencido falso. O 5xx tem duas formas, nesta ordem: a regex, com
# `.` no lugar da aspa e do espaco, que o CloudWatch recusa em regex (medido em
# 2026-10-04: "Invalid character(s) in term"), e o termo literal. Vale a
# primeira que o test-metric-filter aceitar e que se comportar.
P_UP='{ ($.up = 0) || ($.up = 1) }'
P_CERT='{ ($.cert_dias > 0) || ($.cert_dias <= 0) }'
P_5XX_REGEX='{ $.log = %HTTP/[0-9.]+..5[0-9]{2}.% }'
P_5XX_LITERAL='{ ($.log = "*HTTP/1.1\" 5*") || ($.log = "*HTTP/2.0\" 5*") || ($.log = "*HTTP/1.0\" 5*") }'

uso() {
  echo "uso: $0 base <prod|lab>  |  $0 alarmes" >&2
  exit 2
}

falha() {
  echo "erro: $*" >&2
  exit 1
}

# confere <padrao> <esperado: 0 ou 1> <linha>: o test-metric-filter da AWS casa
# (1) ou nao (0) a linha. Padrao recusado pela API conta como nao conferido.
confere() {
  local obtido
  if ! obtido=$(aws logs test-metric-filter --region "$REGIAO" --filter-pattern "$1" \
      --log-event-messages "$3" --query 'length(matches)' --output text 2>"$TMP/erro"); then
    echo "    recusado pela API: $(head -c 300 "$TMP/erro")" >&2
    return 1
  fi
  echo "    test-metric-filter: esperado $2, obtido $obtido"
  [ "$obtido" = "$2" ]
}

# filtro <grupo> <metrica> <valor> <default, ou - sem default> <padrao>. O nome
# do filtro e' o da metrica; namespace Lotus/Sonda, sem dimensao (achado 2).
filtro() {
  local transformacao="metricName=$2,metricNamespace=Lotus/Sonda,metricValue=$3"
  [ "$4" = - ] || transformacao="$transformacao,defaultValue=$4"
  aws logs put-metric-filter --region "$REGIAO" --log-group-name "$1" \
    --filter-name "$2" --filter-pattern "$5" --metric-transformations "$transformacao"
  echo "==> filtro $2 em $1"
}

# alarme <nome> <namespace> <metrica> <estatistica> <periodo> <N> <M>
#        <operador> <limiar> <falta de dado> <descricao> [dimensao...]
# Avisa o topico no ALARM e no OK (D5).
alarme() {
  local nome=$1 namespace=$2 metrica=$3 estatistica=$4 periodo=$5 n=$6 m=$7
  local operador=$8 limiar=$9 falta=${10} descricao=${11}
  shift 11
  local dimensoes=()
  [ $# -eq 0 ] || dimensoes=(--dimensions "$@")
  aws cloudwatch put-metric-alarm --region "$REGIAO" --alarm-name "$nome" \
    --alarm-description "$descricao" \
    --namespace "$namespace" --metric-name "$metrica" "${dimensoes[@]}" \
    --statistic "$estatistica" --period "$periodo" \
    --evaluation-periods "$n" --datapoints-to-alarm "$m" \
    --comparison-operator "$operador" --threshold "$limiar" \
    --treat-missing-data "$falta" \
    --alarm-actions "$TOPICO" --ok-actions "$TOPICO"
  echo "==> alarme $nome"
}

base() {
  local ambiente=$1 retencao grupo candidato p5xx=''
  if [ "$ambiente" = prod ]; then retencao=30; else retencao=1; fi

  # A mesma inline nos dois ambientes: o lab assume a lotus-ec2, como um
  # recreate real. So escreve log em grupo /lotus/* e so publica metrica em
  # Lotus/Host. Sem logs:CreateLogGroup e sem logs:PutRetentionPolicy: do host
  # nao se cria grupo nem se muda retencao — as duas coisas sao desta etapa,
  # com a credencial do Joao. PutMetricData nao aceita recurso; a condicao no
  # namespace e' o que o estreita.
  cat > "$TMP/observabilidade.json" <<JSON
{"Version":"2012-10-17","Statement":[
 {"Effect":"Allow",
  "Action":["logs:CreateLogStream","logs:PutLogEvents","logs:DescribeLogStreams"],
  "Resource":[
   "arn:aws:logs:$REGIAO:$CONTA:log-group:/lotus/*",
   "arn:aws:logs:$REGIAO:$CONTA:log-group:/lotus/*:log-stream:*"]},
 {"Effect":"Allow","Action":"cloudwatch:PutMetricData","Resource":"*",
  "Condition":{"StringEquals":{"cloudwatch:namespace":"Lotus/Host"}}}]}
JSON
  aws iam put-role-policy --role-name lotus-ec2 --policy-name lotus-observabilidade \
    --policy-document "file://$TMP/observabilidade.json"
  echo "==> inline lotus-observabilidade na lotus-ec2"

  for grupo in "/lotus/$ambiente/containers" "/lotus/$ambiente/sonda"; do
    if [ -z "$(aws logs describe-log-groups --region "$REGIAO" --log-group-name-prefix "$grupo" \
        --query "logGroups[?logGroupName=='$grupo'].logGroupName" --output text)" ]; then
      aws logs create-log-group --region "$REGIAO" --log-group-name "$grupo"
      echo "==> grupo $grupo criado"
    fi
    aws logs put-retention-policy --region "$REGIAO" --log-group-name "$grupo" \
      --retention-in-days "$retencao"
  done

  # Todo padrao passa pelo test-metric-filter ANTES de qualquer put-metric-filter,
  # nos dois ambientes: no lab, e' a validacao sem publicar.
  echo "==> conferindo os padroes"
  { confere "$P_UP" 1 "$SONDA_OK" && confere "$P_UP" 1 "$SONDA_FORA" \
    && confere "$P_UP" 0 "$LIXO"; } || falha "o padrao de Up nao se comportou como o esperado"
  { confere "$P_CERT" 1 "$SONDA_OK" && confere "$P_CERT" 1 "$SONDA_VENCIDO" \
    && confere "$P_CERT" 0 "$SONDA_FORA"; } || falha "o padrao de CertDias nao se comportou como o esperado"
  for candidato in "$P_5XX_REGEX" "$P_5XX_LITERAL"; do
    echo "    5xx: $candidato"
    if confere "$candidato" 1 "$NGINX_502" && confere "$candidato" 1 "$NGINX_H2_503" \
        && confere "$candidato" 0 "$NGINX_200" && confere "$candidato" 0 "$NGINX_H2_200"; then
      p5xx=$candidato
      break
    fi
  done
  [ -n "$p5xx" ] || falha "PORTAO D14: o test-metric-filter recusou as duas formas do 5xx; o bloco volta ao Joao (spec §6)"
  echo "==> 5xx com: $p5xx"

  # Filtros so em prod (achado 2 da spec): metric filter nao aceita dimensao
  # fixa, e um filtro igual no lab publicaria na metrica dos alarmes de producao.
  if [ "$ambiente" = prod ]; then
    filtro /lotus/prod/sonda Up '$.up' - "$P_UP"
    filtro /lotus/prod/sonda CertDias '$.cert_dias' - "$P_CERT"
    filtro /lotus/prod/containers Http5xx 1 0 "$p5xx"
  fi

  echo
  echo "===== readback ====="
  aws iam get-role-policy --role-name lotus-ec2 --policy-name lotus-observabilidade \
    --query PolicyDocument --output json
  for grupo in "/lotus/$ambiente/containers" "/lotus/$ambiente/sonda"; do
    [ "$(aws logs describe-log-groups --region "$REGIAO" --log-group-name-prefix "$grupo" \
        --query "logGroups[?logGroupName=='$grupo'].retentionInDays" --output text)" = "$retencao" ] \
      || falha "$grupo sem a retencao de $retencao dia(s)"
    echo "$grupo: $retencao dia(s)"
    aws logs describe-metric-filters --region "$REGIAO" --log-group-name "$grupo" \
      --query 'metricFilters[].[filterName,filterPattern,to_string(metricTransformations)]' --output text
  done
}

alarmes() {
  local inicio fim pontos confirmadas
  inicio=$(date -u -d '-10 minutes' +%Y-%m-%dT%H:%M:%SZ)
  fim=$(date -u +%Y-%m-%dT%H:%M:%SZ)

  # Tres recusas, cada uma olhando o efeito (spec §4.3).
  # 1. Sem ponto de Up nos ultimos 10 min, o alarme de /up nasceria disparando
  #    por falta de dado.
  pontos=$(aws cloudwatch get-metric-statistics --region "$REGIAO" --namespace Lotus/Sonda \
    --metric-name Up --start-time "$inicio" --end-time "$fim" --period 60 --statistics SampleCount \
    --query 'length(Datapoints)' --output text)
  [ "$pontos" -gt 0 ] 2>/dev/null \
    || falha "sem Lotus/Sonda Up nos ultimos 10 min: instale a sonda e o agente (runbook §14.2) antes"
  # 2. Sem a metrica de disco com as dimensoes EXATAS do alarme, ele nunca
  #    sairia de INSUFFICIENT_DATA. get-metric-statistics so devolve ponto para
  #    o conjunto exato de dimensoes.
  pontos=$(aws cloudwatch get-metric-statistics --region "$REGIAO" --namespace Lotus/Host \
    --metric-name disk_used_percent --dimensions "${DISCO[@]}" \
    --start-time "$inicio" --end-time "$fim" --period 60 --statistics Maximum \
    --query 'length(Datapoints)' --output text)
  [ "$pontos" -gt 0 ] 2>/dev/null \
    || falha "sem Lotus/Host disk_used_percent com ${DISCO[*]}: compare com o list-metrics (runbook §14.5)"
  # 3. Sem assinatura confirmada, os alarmes avisariam ninguem.
  #    PendingConfirmation nao e' ARN e nao conta.
  confirmadas=$(aws sns list-subscriptions-by-topic --region "$REGIAO" --topic-arn "$TOPICO" \
    --query "length(Subscriptions[?starts_with(SubscriptionArn, 'arn:')])" --output text)
  [ "$confirmadas" -gt 0 ] 2>/dev/null \
    || falha "lotus-alertas sem assinatura confirmada (runbook §14.8)"

  #      nome                   namespace   metrica           estat.  per. N M operador                      limiar falta        descricao
  alarme lotus-prod-up          Lotus/Sonda Up                Minimum 60   5 3 LessThanThreshold             1      breaching    "Lotus producao: a sonda de /up sem 200 ou sem dado (app, nginx, agente, sonda ou host). Runbook deploy/aws/README.md secao 14.6"
  alarme lotus-prod-5xx         Lotus/Sonda Http5xx           Sum     300  1 1 GreaterThanOrEqualToThreshold 5      notBreaching "Lotus producao: 5 ou mais respostas 5xx do nginx em 5 minutos. Runbook deploy/aws/README.md secao 14.6"
  alarme lotus-prod-disco       Lotus/Host  disk_used_percent Maximum 300  2 2 GreaterThanThreshold          80     ignore       "Lotus producao: disco / acima de 80% em 10 minutos. Runbook deploy/aws/README.md secao 14.6" "${DISCO[@]}"
  alarme lotus-prod-certificado Lotus/Sonda CertDias          Minimum 300  1 1 LessThanThreshold             21     ignore       "Lotus producao: o certificado servido na 443 vence em menos de 21 dias. Runbook deploy/aws/README.md secao 14.6"

  echo
  echo "===== readback ====="
  aws cloudwatch describe-alarms --region "$REGIAO" --alarm-names "${ALARMES[@]}" \
    --query 'MetricAlarms[].[AlarmName,Namespace,MetricName,to_string(Dimensions),Statistic,Period,ComparisonOperator,Threshold,EvaluationPeriods,DatapointsToAlarm,TreatMissingData,length(AlarmActions),length(OKActions),StateValue]' \
    --output text
  [ "$(aws cloudwatch describe-alarms --region "$REGIAO" --alarm-names "${ALARMES[@]}" \
      --query 'length(MetricAlarms[?length(AlarmActions) > `0` && length(OKActions) > `0`])' \
      --output text)" = 4 ] || falha "o readback nao mostra os quatro alarmes com acao de ALARM e de OK"
}

case "${1:-}" in
  base) { [ $# -eq 2 ] && { [ "$2" = prod ] || [ "$2" = lab ]; }; } || uso ;;
  alarmes) [ $# -eq 1 ] || uso ;;
  *) uso ;;
esac

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
CONTA=$(aws sts get-caller-identity --query Account --output text)
TOPICO="arn:aws:sns:$REGIAO:$CONTA:lotus-alertas"
echo "==> regiao $REGIAO, etapa $*"

if [ "$1" = base ]; then base "$2"; else alarmes; fi
```

- [ ] **Step 5: rodar e ver passar.**

Run: `cd frontend && pnpm test --project repo tests/criar-observabilidade.test.ts && bash -n deploy/aws/criar-observabilidade.sh`
Expected: PASS, 18 testes (os 5 de uso contam um a um), e nenhuma saída do `bash -n`.

- [ ] **Step 6: as sondas da lição 19.** Com `cp` para `$SCRATCH` e restauração por `cp` + `cmp`:
  1. troque o limiar do `lotus-prod-disco` de `80` para `85`. Reprova
     `os quatro alarmes iguais à spec §4.4, com ALARM e OK no tópico`;
  2. troque o `breaching` do `lotus-prod-up` por `notBreaching`. Reprova o mesmo teste;
  3. comente as duas linhas da recusa 1 (`pontos=…Up…` e o `[ "$pontos" -gt 0 ] … || falha …`).
     Reprova `recusa sem Up recente, sem criar alarme`;
  4. acrescente `,defaultValue=0` ao filtro de `Up`, com `-` trocado por `0`. Reprova
     `prod: grupos de 30 dias e os três filtros, cada padrão conferido antes de qualquer put`.

  Restaure, confira com `cmp` e rode o teste de novo: PASS.

- [ ] **Step 7: lint e commit.**

```bash
(cd frontend && pnpm lint)
git add deploy/aws/criar-observabilidade.sh frontend/tests/criar-observabilidade.test.ts frontend/tests/fixtures/aws-falso.sh
git commit -m "feat(deploy): script de IAM, log groups, filtros e alarmes da observabilidade" -m "Co-Authored-By: Claude <modelo> <noreply@anthropic.com>"
```

---

### Task 5: D-74 — os bindings fora da mensagem da `QueryException` (D12)

**Files:**
- Modify: `backend/config/database.php` (as conexões `sqlite` e `mysql`)
- Create: `backend/tests/Feature/Shared/BindingsForaDaMensagemTest.php`

**Interfaces:**
- Consumes: nada de outra task.
- Produces: `config('database.connections.{sqlite,mysql}.mask_bindings_in_exception_messages') === true`.
  O Laravel 13.34 lê a chave em `Connection::runQueryCallback` e passa `$maskBindings` à
  `QueryException`, que deixa a SQL da mensagem com `?` no lugar dos valores. A Task 8 cita isso na
  emenda do ADR-21.

- [ ] **Step 1: stack, vendor e linha de base.** Da raiz da lane:

```bash
cd /home/jvbat/projetos/lotus-34-infra-producao-observabilidade
docker compose up -d
docker compose exec -T app composer install --no-interaction --no-progress 2>&1 | tail -3
docker compose exec -T app php artisan --version
docker compose exec -T app php artisan test 2>&1 | tail -4
git status --short
```

Esperado:
- `composer install` sem erro;
- `Laravel Framework 13.34.0`;
- a suíte verde. Anote o placar (`Tests: N passed (…)`), que é a linha de base do Step 6;
- `git status` vazio (`backend/vendor` está no `backend/.gitignore`).

Suíte vermelha aqui é **PARE**: a árvore tem de estar verde antes de qualquer edição.

- [ ] **Step 2: o teste que falha.** Crie
  `backend/tests/Feature/Shared/BindingsForaDaMensagemTest.php`:

```php
<?php

namespace Tests\Feature\Shared;

use App\Domains\Identity\Models\User;
use App\Domains\Identity\Services\UserProvisioner;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Exceptions\Handler;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use PHPUnit\Framework\Attributes\Test;
use Psr\Log\LoggerInterface;
use Psr\Log\LoggerTrait;
use Stringable;
use Tests\TestCase;

/**
 * D-74, pago pelo item 34 (D12 da spec do bloco): a mensagem da
 * `QueryException` não leva os valores da consulta.
 *
 * Sem `mask_bindings_in_exception_messages`, o Laravel interpola os bindings na
 * SQL da mensagem (`Str::replaceArray`), e qualquer `report()` grava no log
 * default o e-mail, o RUT ou o nome que a consulta carregava. Desde o item 34
 * esse log fica 30 dias no CloudWatch Logs (ADR-21, emenda de 2026-10-04).
 *
 * Resíduo que esta catraca NÃO cobre, declarado na spec §4.8: o texto de erro
 * do próprio MySQL (`Duplicate entry '<valor>' for key ...`) continua trazendo o
 * valor — a máscara troca só a SQL que o Laravel monta.
 *
 * O handler vem do container por `Handler::class`, com um logger espião no
 * lugar do `LoggerInterface` — o mesmo padrão do `RecusaNaoVaiAoLogTest`.
 */
class BindingsForaDaMensagemTest extends TestCase
{
    use RefreshDatabase;

    private const SENTINELA = 'sentinela-d74@example.com';

    private function consultaQueFalha(): QueryException
    {
        try {
            DB::select('select * from tabela_que_nao_existe where email = ?', [self::SENTINELA]);
        } catch (QueryException $e) {
            return $e;
        }

        $this->fail('a consulta numa tabela inexistente deveria lançar QueryException');
    }

    #[Test]
    public function a_mensagem_traz_a_sql_sem_o_valor(): void
    {
        $mensagem = $this->consultaQueFalha()->getMessage();

        $this->assertStringNotContainsString(self::SENTINELA, $mensagem);
        // A SQL continua no diagnóstico, com o marcador no lugar do valor.
        $this->assertStringContainsString('where email = ?', $mensagem);
    }

    #[Test]
    public function o_log_do_handler_nao_traz_o_valor(): void
    {
        $linhas = [];
        $espiao = new class($linhas) implements LoggerInterface
        {
            use LoggerTrait;

            /** @param  list<string>  $linhas */
            public function __construct(private array &$linhas) {}

            /** @param  array<string, mixed>  $context */
            public function log($level, string|Stringable $message, array $context = []): void
            {
                $this->linhas[] = (string) $message;
            }
        };
        $this->app->instance(LoggerInterface::class, $espiao);

        $this->app->make(Handler::class)->report($this->consultaQueFalha());

        $this->assertNotSame([], $linhas, 'a QueryException deveria chegar ao log');
        foreach ($linhas as $linha) {
            $this->assertStringNotContainsString(self::SENTINELA, $linha);
        }
    }

    #[Test]
    public function a_conexao_de_producao_mascara(): void
    {
        // A suíte roda em sqlite; a produção, em mysql. Sem esta asserção, tirar
        // a chave só da conexão de produção passaria verde.
        $this->assertTrue(config('database.connections.mysql.mask_bindings_in_exception_messages'));
        $this->assertTrue(config('database.connections.sqlite.mask_bindings_in_exception_messages'));
    }

    #[Test]
    public function a_colisao_real_de_unicidade_continua_virando_422(): void
    {
        // O UserProvisioner reconhece a colisão pela MENSAGEM da QueryException
        // (`UNIQUE constraint failed` / `Duplicate entry`). A máscara troca só a
        // SQL do Laravel, e o marcador mora no texto do banco. Este caso prova
        // isso com uma colisão de verdade, não com uma exceção montada à mão.
        User::factory()->create(['email' => self::SENTINELA]);

        try {
            app(UserProvisioner::class)->writing(fn () => User::factory()->create(['email' => self::SENTINELA]));
            $this->fail('esperava ValidationException');
        } catch (ValidationException $e) {
            $this->assertArrayHasKey('email', $e->errors());
        }
    }
}
```

- [ ] **Step 3: rodar e ver falhar.**

Run: `docker compose exec -T app php artisan test --filter=BindingsForaDaMensagemTest`
Expected: FAIL em três dos quatro.
- `a_mensagem_traz_a_sql_sem_o_valor` e `o_log_do_handler_nao_traz_o_valor` reprovam: a mensagem
  contém `sentinela-d74@example.com`.
- `a_conexao_de_producao_mascara` reprova: `null` não é `true`.
- `a_colisao_real_de_unicidade_continua_virando_422` passa desde já. É a guarda do efeito colateral,
  não a do comportamento novo.

- [ ] **Step 4: a chave.** Em `backend/config/database.php`, acrescente a mesma chave nas conexões
  `sqlite` e `mysql`, logo depois de `'driver' => …`, com o comentário:

```php
            // D-74, pago no item 34 (D12): a QueryException não leva os
            // valores da consulta ao log, que fica 30 dias no CloudWatch
            // (ADR-21). O texto de erro do próprio banco não é mascarado.
            'mask_bindings_in_exception_messages' => true,
```

As conexões `mariadb`, `pgsql` e `sqlsrv` não mudam: o app não as usa.

- [ ] **Step 5: rodar e ver passar.**

Run: `docker compose exec -T app php artisan test --filter=BindingsForaDaMensagemTest`
Expected: PASS, 4 testes.

- [ ] **Step 6: sondas, suíte e Pint.**
  1. **Sonda 1.** Tire a chave só da conexão `mysql`, com `cp` e `cmp`, como em Global
     Constraints. Reprova `a_conexao_de_producao_mascara`.
  2. **Sonda 2.** Tire a chave só da `sqlite`. Reprovam `a_mensagem_traz_a_sql_sem_o_valor`,
     `o_log_do_handler_nao_traz_o_valor` e `a_conexao_de_producao_mascara`.

  Restaure e confira com `cmp`. Depois:

```bash
docker compose exec -T app php artisan test 2>&1 | tail -4
cd backend && ./vendor/bin/pint config/database.php tests/Feature/Shared/BindingsForaDaMensagemTest.php && cd ..
git diff --stat
```

Esperado:
- a suíte com o placar do Step 1 mais 4, sem falha;
- o Pint sem mudança, ou só com mudança de estilo nos dois arquivos;
- o `git diff --stat` só com os dois arquivos.

- [ ] **Step 7: commit.**

```bash
git add backend/config/database.php backend/tests/Feature/Shared/BindingsForaDaMensagemTest.php
git commit -m "fix(backend): QueryException sem os bindings na mensagem (D-74)" -m "Co-Authored-By: Claude <modelo> <noreply@anthropic.com>"
```

---

### Task 6: recursos base e o lab (spec §5, passos 2 e 3)

**Quem executa:** o controlador da sessão, com o João. A escrita é dele: os dois `base`, o launch,
os comandos no host de lab, o terminate e o delete. A sessão lê pela AWS (`AWS_PROFILE=lotus`) e
por SSH no lab, e escreve o audit. A revisão é a de toda task: `revisor-task` no commit dela.

**Files:**
- Modify: `docs/superpowers/blocos/34-infra-producao-observabilidade/audit.md` (seção `## Task 6` no fim)

**Interfaces:**
- Consumes:
  - `deploy/aws/criar-observabilidade.sh` (Task 4);
  - `deploy/aws/user-data.sh` (Task 3);
  - `deploy/bin/sondar-saude.sh` (Task 2).
- Produces, no audit:
  - o readback dos dois `base`;
  - a forma do 5xx que valeu (`regex` ou `literal`), que a Task 7 copia no runbook §14.6;
  - as dimensões reais do `disk_used_percent`;
  - a RSS do agente, que a Task 9 copia na P-80;
  - as provas do lab.

- [ ] **Step 1: o João roda os dois `base`.** Da raiz da lane, com a credencial administrativa
  dele:

```bash
deploy/aws/criar-observabilidade.sh base prod
deploy/aws/criar-observabilidade.sh base lab
```

Ele cola as duas saídas. Esperado:
- `rc` 0;
- todo `test-metric-filter: esperado X, obtido X`;
- `==> 5xx com: <forma>`.

`PORTAO D14` → **PARE** e leve ao João (spec §6). Depois, a sessão lê:

```bash
AWS_PROFILE=lotus aws iam get-role-policy --role-name lotus-ec2 --policy-name lotus-observabilidade --query PolicyDocument --output json | sed -E 's/[0-9]{12}/<conta>/g'
AWS_PROFILE=lotus aws logs describe-log-groups --region sa-east-1 --log-group-name-prefix /lotus/ --query 'logGroups[].[logGroupName,retentionInDays]' --output text
for g in /lotus/prod/sonda /lotus/prod/containers /lotus/lab/sonda /lotus/lab/containers; do echo "== $g"; AWS_PROFILE=lotus aws logs describe-metric-filters --region sa-east-1 --log-group-name "$g" --query 'metricFilters[].[filterName,filterPattern,to_string(metricTransformations)]' --output text; done
```

Esperado:
- a inline com as quatro ações, os dois recursos e a condição de namespace;
- `/lotus/prod/*` com `30` e `/lotus/lab/*` com `1`;
- três filtros nos grupos de `prod` e nenhum nos de `lab`.

- [ ] **Step 2: o João sobe o lab.** Da raiz da lane:

```bash
sed 's/^AMBIENTE=prod$/AMBIENTE=lab/' deploy/aws/user-data.sh > /tmp/user-data-lab.sh
grep -c '^AMBIENTE=lab$' /tmp/user-data-lab.sh      # 1
aws ec2 run-instances --region sa-east-1 \
  --image-id resolve:ssm:/aws/service/canonical/ubuntu/server/24.04/stable/current/arm64/hvm/ebs-gp3/ami-id \
  --instance-type t4g.small --key-name lotus-prod \
  --iam-instance-profile Name=lotus-ec2 --security-groups lotus-web \
  --metadata-options HttpTokens=required,HttpPutResponseHopLimit=2 \
  --user-data file:///tmp/user-data-lab.sh \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=lotus-lab}]' \
  --query 'Instances[0].InstanceId' --output text
```

O parâmetro SSM da AMI e o key pair `lotus-prod` foram lidos no planejamento, em 2026-10-04. A
sessão lê o IP do lab com
`AWS_PROFILE=lotus aws ec2 describe-instances --region sa-east-1 --instance-ids <id> --query 'Reservations[0].Instances[0].PublicIpAddress' --output text`.

- [ ] **Step 3: a sessão confere o boot.** Leitura por SSH no lab, com `L=ubuntu@<IP do lab>` e o
  mesmo `.pem`. Espere o SSH responder, ~1–2 min:

```bash
ssh -i ~/.ssh/lotus-prod.pem -o StrictHostKeyChecking=accept-new "$L" 'cloud-init status --wait; systemctl is-active amazon-cloudwatch-agent lotus-sonda.timer docker'
ssh -i ~/.ssh/lotus-prod.pem "$L" 'sudo grep -ci accessdenied /opt/aws/amazon-cloudwatch-agent/logs/amazon-cloudwatch-agent.log; systemctl show lotus-sonda.service -p ConditionResult'
```

Esperado:
- `status: done`;
- `active` três vezes;
- `0` no `grep`;
- `ConditionResult=no`: o timer disparou e pulou, porque a sonda ainda não está lá. É a prova do
  `ConditionPathExists`.

`status: error` → `sudo tail -60 /var/log/cloud-init-output.log` no lab. O defeito é da Task 3:
rodada de correção dela, e o lab repete do Step 2 com uma instância nova. Termine esta antes.

- [ ] **Step 4: o João cria os contêineres e instala a sonda no lab.** Da raiz da lane:

```bash
ssh -i ~/.ssh/lotus-prod.pem "$L" "sudo docker run -d --name lab-a busybox sh -c 'echo PRIMEIRA-LINHA-lab-a; while true; do echo lab-a; sleep 5; done'"
ssh -i ~/.ssh/lotus-prod.pem "$L" "sudo docker run -d --name lab-b busybox sh -c 'echo PRIMEIRA-LINHA-lab-b; while true; do echo lab-b; sleep 5; done'"
scp -i ~/.ssh/lotus-prod.pem deploy/bin/sondar-saude.sh "$L":/tmp/
ssh -i ~/.ssh/lotus-prod.pem "$L" 'sudo mv /tmp/sondar-saude.sh /opt/lotus/bin/ && sudo chmod +x /opt/lotus/bin/sondar-saude.sh'
```

- [ ] **Step 5: a sessão lê as provas.** Uns 3 minutos depois:

```bash
ssh -i ~/.ssh/lotus-prod.pem "$L" 'sudo tail -2 /var/log/lotus/sonda.log; systemctl show lotus-sonda.service -p ConditionResult'
AWS_PROFILE=lotus aws cloudwatch list-metrics --region sa-east-1 --namespace Lotus/Host --dimensions Name=Ambiente,Value=lab --query 'Metrics[].[MetricName,to_string(Dimensions)]' --output text
AWS_PROFILE=lotus aws logs describe-log-streams --region sa-east-1 --log-group-name /lotus/lab/containers --query 'logStreams[].logStreamName' --output text | tr '\t' '\n' | sed -E 's/i-[0-9a-f]{8,17}/<instancia>/g; s/[0-9a-f]{64}/<id>/g'
AWS_PROFILE=lotus aws logs filter-log-events --region sa-east-1 --log-group-name /lotus/lab/containers --filter-pattern '"PRIMEIRA-LINHA"' --query 'events[].message' --output text
AWS_PROFILE=lotus aws logs filter-log-events --region sa-east-1 --log-group-name /lotus/lab/sonda --query 'events[-1].message' --output text
```

Esperado:
- linhas `{"ts":…,"up":1,"http":200,"cert_dias":…}` e `ConditionResult=yes`. A sonda do lab mede a
  produção de fora, o que também prova o caminho do certificado;
- `disk_used_percent`, `mem_used_percent` e `swap_used_percent`. As dimensões do disco são
  `Ambiente`, `fstype` e `path`, e o `fstype` é o do `DISCO`;
- dois streams ou mais, um por contêiner: a prova do `publish_multi_logs`;
- as duas `PRIMEIRA-LINHA`: a prova do `from_beginning` default, porque os dois contêineres
  nasceram depois do agente;
- a linha da sonda no grupo.

Dimensão a mais ou a menos no disco → rodada de correção da Task 4 (`DISCO` e a catraca), com o
valor lido. Sem as duas `PRIMEIRA-LINHA`, ou com um stream só → **PARE**: o achado 1 da spec não
se confirmou, e a decisão volta ao João.

- [ ] **Step 6: reexecução sem efeito.** A sessão lê o antes, o João roda, e a sessão lê o
  depois:

```bash
ssh -i ~/.ssh/lotus-prod.pem "$L" 'systemctl show docker amazon-cloudwatch-agent -p ActiveEnterTimestamp; sudo docker inspect -f "{{.Name}} {{.State.StartedAt}}" lab-a lab-b'
# o João:
scp -i ~/.ssh/lotus-prod.pem /tmp/user-data-lab.sh "$L":/tmp/
ssh -i ~/.ssh/lotus-prod.pem "$L" 'sudo bash /tmp/user-data-lab.sh > /tmp/reexec.log 2>&1; echo rc=$?'
# a sessão:
ssh -i ~/.ssh/lotus-prod.pem "$L" 'systemctl show docker amazon-cloudwatch-agent -p ActiveEnterTimestamp; sudo docker inspect -f "{{.Name}} {{.State.StartedAt}}" lab-a lab-b; grep -cE "^\+ (dpkg -i|/opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl)" /tmp/reexec.log; grep -cE "^(Unpacking|Setting up) " /tmp/reexec.log'
```

Esperado:
- `rc=0`;
- os timestamps e os `StartedAt` iguais aos de antes;
- `0` e `0` nos dois `grep`.

Qualquer diferença → rodada de correção da Task 3, e o lab repete.

- [ ] **Step 7: RSS do agente.** Com o agente rodando há ≥ 10 min, com dois contêineres e a
  sonda:

```bash
ssh -i ~/.ssh/lotus-prod.pem "$L" 'ps -o rss=,etimes= -C amazon-cloudwatch-agent; free -m'
```

A RSS vem em KiB. Divida por 1024 e registre em MiB. **Acima de ~100 MiB é o portão D14: PARE.**
A decisão volta ao João, com o número.

- [ ] **Step 8: o João desmonta o lab.**

```bash
aws ec2 terminate-instances --region sa-east-1 --instance-ids <id do lab>
aws logs delete-log-group --region sa-east-1 --log-group-name /lotus/lab/containers
aws logs delete-log-group --region sa-east-1 --log-group-name /lotus/lab/sonda
```

A sessão confere com `AWS_PROFILE=lotus` no `describe-instances … --query 'Reservations[0].Instances[0].State.Name'`,
que tem de dar `terminated` ou `shutting-down`. Confere também com
`describe-log-groups --log-group-name-prefix /lotus/lab/`, que tem de voltar vazio.

- [ ] **Step 9: o audit.** Acrescente ao fim de `audit.md`, preenchido e sem nenhum `<…>`:

````markdown
## Task 6 — recursos base e lab (spec §5, passos 2 e 3)

Em <AAAA-MM-DD>. Escrita do João; leitura da sessão (`AWS_PROFILE=lotus`), com conta e instância
mascaradas.

**`base prod` e `base lab`** (rodados pelo João, saídas coladas): `rc` 0 nos dois.

| Leitura | Valor |
|---|---|
| inline `lotus-observabilidade` | `logs:CreateLogStream`, `logs:PutLogEvents`, `logs:DescribeLogStreams` em `log-group:/lotus/*` e `…:log-stream:*`; `cloudwatch:PutMetricData` com `cloudwatch:namespace = Lotus/Host` |
| retenção | `/lotus/prod/containers` 30 · `/lotus/prod/sonda` 30 · `/lotus/lab/containers` 1 · `/lotus/lab/sonda` 1 |
| filtros em `prod` | `Up` e `CertDias` sem default; `Http5xx` com default 0 |
| `test-metric-filter` | Up 1/1/0 · CertDias 1/1/0 · 5xx: **<regex \| literal>**, 1/1/0/0 |
| filtros em `lab` | nenhum |

**Lab** (`t4g.small`, Ubuntu 24.04 arm64, `lotus-ec2`, `lotus-web`, IMDSv2 hop 2, `AMBIENTE=lab`):

| Prova | Resultado |
|---|---|
| cloud-init | `status: done` |
| agente, timer, Docker | `active` ×3; `AccessDenied` no log do agente: 0 |
| `ConditionPathExists` | `ConditionResult=no` sem a sonda; `yes` depois do `scp` |
| métricas `Ambiente=lab` | `disk_used_percent` (`Ambiente`, `fstype=<…>`, `path=/`), `mem_used_percent`, `swap_used_percent` |
| `publish_multi_logs` | <N> streams em `/lotus/lab/containers` |
| `from_beginning` default | `PRIMEIRA-LINHA-lab-a` e `PRIMEIRA-LINHA-lab-b` no grupo |
| sonda | `<a linha>` em `/lotus/lab/sonda` |
| reexecução do user-data | `rc=0`; `ActiveEnterTimestamp` do Docker e do agente e `StartedAt` dos contêineres iguais; 0 `dpkg -i`, 0 `fetch-config`, 0 `Unpacking` |
| RSS do agente | **<N> MiB** após <M> min — portão D14 (~100 MiB): passou |
| desmonte | instância `terminated`; grupos de `lab` apagados |
````

- [ ] **Step 10: commit.**

```bash
git add docs/superpowers/blocos/34-infra-producao-observabilidade/audit.md
git commit -m "docs(34): recursos base e lab provados" -m "Co-Authored-By: Claude <modelo> <noreply@anthropic.com>"
```

---

### Task 7: runbook §14 e as emendas, com a catraca cruzada de nomes

**Files:**
- Modify: `deploy/aws/README.md` (§6, §7, §10, §11.7, §12 e a §14 nova no fim)
- Create: `frontend/tests/observabilidade-nomes.test.ts`

**Interfaces:**
- Consumes:
  - os nomes de Global Constraints e dos arquivos das Tasks 2, 3 e 4;
  - do audit da Task 6, a forma do 5xx que valeu.
- Produces: o runbook §14, com as subseções 14.1 a 14.10. As descrições dos alarmes (Task 4)
  apontam para a 14.6, e a Fase B segue a §14.

- [ ] **Step 1: o teste que falha.** Crie `frontend/tests/observabilidade-nomes.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

/**
 * Os nomes do item 34 vivem em quatro arquivos, e nenhum outro teste os junta:
 * - o user-data escreve no grupo;
 * - o criar-observabilidade.sh cria o grupo, o filtro e o alarme;
 * - a sonda grava o JSON que o filtro lê;
 * - o runbook §14 manda o operador ler e responder.
 *
 * Um grupo renomeado num arquivo só não quebra nenhum deles sozinho. Quebra a
 * produção: o agente escreve num grupo que não existe (a role não cria grupo),
 * ou o alarme olha uma métrica que ninguém publica.
 */
const RAIZ = resolve(__dirname, '..', '..')
const ler = (...partes: string[]) => readFileSync(join(RAIZ, ...partes), 'utf8')

/** `${AMBIENTE}`, `$AMBIENTE` e `$ambiente` viram `<amb>`: o nome é o mesmo, a variável muda de arquivo para arquivo. */
const normal = (texto: string) => texto.replace(/\$\{AMBIENTE\}|\$AMBIENTE|\$ambiente/g, '<amb>')

const RUNBOOK = ler('deploy', 'aws', 'README.md')
const secao = (de: string, ate?: string) => {
  const inicio = RUNBOOK.indexOf(de)
  if (inicio === -1) return ''
  const fim = ate === undefined ? -1 : RUNBOOK.indexOf(ate, inicio)
  return RUNBOOK.slice(inicio, fim === -1 ? undefined : fim)
}

const ARQUIVOS = {
  'user-data': normal(ler('deploy', 'aws', 'user-data.sh')),
  criar: normal(ler('deploy', 'aws', 'criar-observabilidade.sh')),
  sonda: ler('deploy', 'bin', 'sondar-saude.sh'),
  'runbook §14': secao('\n## 14. '),
} as const
type Arquivo = keyof typeof ARQUIVOS

const NOMES: [string, Arquivo[]][] = [
  ['/lotus/<amb>/containers', ['user-data', 'criar']],
  ['/lotus/<amb>/sonda', ['user-data', 'criar']],
  ['/lotus/prod/containers', ['criar', 'runbook §14']],
  ['/lotus/prod/sonda', ['criar', 'runbook §14']],
  ['Lotus/Host', ['user-data', 'criar', 'runbook §14']],
  ['Lotus/Sonda', ['criar', 'runbook §14']],
  ['disk_used_percent', ['criar', 'runbook §14']],
  ['mem_used_percent', ['runbook §14']],
  ['swap_used_percent', ['runbook §14']],
  ['/var/log/lotus/sonda.log', ['user-data', 'sonda', 'runbook §14']],
  ['/opt/lotus/bin/sondar-saude.sh', ['user-data', 'runbook §14']],
  ['lotus-sonda.timer', ['user-data', 'runbook §14']],
  ['lotus-observabilidade', ['criar', 'runbook §14']],
  ['lotus-alertas', ['criar', 'runbook §14']],
  ['lotus-prod-up', ['criar', 'runbook §14']],
  ['lotus-prod-5xx', ['criar', 'runbook §14']],
  ['lotus-prod-disco', ['criar', 'runbook §14']],
  ['lotus-prod-certificado', ['criar', 'runbook §14']],
]

describe('nomes da observabilidade (item 34)', () => {
  it('o runbook tem a §14', () => {
    expect(ARQUIVOS['runbook §14']).not.toBe('')
  })

  it.each(NOMES)('%s aparece igual em %j', (nome, arquivos) => {
    for (const arquivo of arquivos) expect(ARQUIVOS[arquivo], arquivo).toContain(nome)
  })

  it.each(['Up', 'CertDias', 'Http5xx'])('a métrica %s que o filtro publica é a que o alarme lê', (metrica) => {
    expect(ARQUIVOS.criar).toMatch(new RegExp(`^\\s*filtro /lotus/prod/\\S+ ${metrica} `, 'm'))
    expect(ARQUIVOS.criar).toMatch(new RegExp(`^\\s*alarme lotus-prod-\\S+\\s+Lotus/Sonda\\s+${metrica}\\s`, 'm'))
    expect(ARQUIVOS['runbook §14']).toContain(`\`${metrica}\``)
  })

  it('a sonda grava as chaves que os filtros leem', () => {
    expect(ARQUIVOS.sonda).toContain('"up":%d')
    expect(ARQUIVOS.sonda).toContain('\\"cert_dias\\":')
    expect(ARQUIVOS.criar).toContain("'$.up'")
    expect(ARQUIVOS.criar).toContain("'$.cert_dias'")
  })

  it('o §7 leva o sondar-saude.sh ao host — sem ele o timer pula calado e o botão trava', () => {
    const s7 = secao('\n## 7. ', '\n## 8. ')
    expect(s7).toMatch(/^scp .*deploy\/bin\/sondar-saude\.sh/m)
    expect(s7).toMatch(/^sudo mv .*\/tmp\/sondar-saude\.sh/m)
  })

  it('a descrição dos alarmes aponta para uma seção que existe', () => {
    expect(ARQUIVOS.criar).toContain('deploy/aws/README.md secao 14.6')
    expect(ARQUIVOS['runbook §14']).toMatch(/^### 14\.6 /m)
  })
})
```

- [ ] **Step 2: rodar e ver falhar.**

Run: `cd frontend && pnpm test --project repo tests/observabilidade-nomes.test.ts`
Expected: FAIL. O runbook ainda não tem a §14, e o §7 ainda não leva a sonda.

- [ ] **Step 3: as emendas pontuais.** Em `deploy/aws/README.md`, cinco trocas exatas.

**§6, o bullet do user data.** Troque a linha

```markdown
- **User data**: o conteúdo de `deploy/aws/user-data.sh`;
```

por:

```markdown
- **User data**: o conteúdo de `deploy/aws/user-data.sh`, com `AMBIENTE=prod` — o lab da §14.1
  troca para `lab`;
```

**§6, a prova do cloud-init.** No bloco `bash` da prova, acrescente a linha
`systemctl is-active amazon-cloudwatch-agent lotus-sonda.timer` depois de `aws sts get-caller-identity`.
No parágrafo `Esperado:` logo abaixo, troque

```markdown
`aws-cli/2.x`, `Swap` ≈ 2047 MiB, `/opt/lotus` em `drwxr-x---`. Falhou →
```

por:

```markdown
`aws-cli/2.x`, `Swap` ≈ 2047 MiB, `/opt/lotus` em `drwxr-x---`, e `active` duas vezes no
`systemctl` — o CloudWatch agent e o timer da sonda, do item 34. O timer só roda depois que o §7
entrega o script, e o `lotus-prod-up` acusa a falta de dado enquanto isso (§14). Falhou →
```

A linha seguinte, `` `sudo cat /var/log/cloud-init-output.log`. ``, fica.

**§7, os scripts.** Na segunda linha de `scp`, acrescente `deploy/bin/sondar-saude.sh` antes de
`ubuntu@<EIP>:/tmp/`. Na linha `sudo mv /tmp/deploy.sh …`, acrescente `/tmp/sondar-saude.sh` antes
de `/opt/lotus/bin/`. As duas linhas ficam:

```bash
scp -i "$PEM" deploy/bin/deploy.sh deploy/bin/backup-db.sh deploy/bin/verificar-backup.sh deploy/bin/recarregar-nginx.sh deploy/bin/sondar-saude.sh ubuntu@<EIP>:/tmp/
```

```bash
sudo mv /tmp/deploy.sh /tmp/backup-db.sh /tmp/verificar-backup.sh /tmp/recarregar-nginx.sh /tmp/sondar-saude.sh /opt/lotus/bin/ && sudo sh -c 'chmod +x /opt/lotus/bin/*.sh'
```

**§10, o canal.** Troque o parágrafo

```markdown
Canal definitivo de alerta é decisão do bloco de observabilidade. Trocar de canal depois é trocar
um ARN no `.env` e a `Resource` da `lotus-alerta`.
```

por:

```markdown
**O `lotus-alertas` é o canal definitivo de alerta de infraestrutura** (item 34, D2). Avisam por
ele o `verificar-backup.sh` e os quatro alarmes da §14, no `ALARM` e no `OK`. O único assinante é o
e-mail do João. Trocar de canal é trocar o ARN no `.env`, a `Resource` da `lotus-alerta` e o
tópico do `deploy/aws/criar-observabilidade.sh`, rodando o `alarmes` de novo (§14.3).
```

**§11.7, o alarme de expiração.** Troque

```markdown
(lição 1). **Não há alarme de expiração** até o item 34: entre uma renovação falhada e o vencimento
há ~30 dias que ninguém mede.
```

por:

```markdown
(lição 1). **O alarme de expiração existe desde o item 34:** o `lotus-prod-certificado` (§14)
dispara quando o certificado **servido** na 443 tem menos de 21 dias. Isso acontece quando a
renovação falhou nove dias seguidos, ou quando ela renovou e o hook não recarregou o nginx. Ele não
substitui este gate: o gate ensaia a renovação antes, e o alarme acusa a falha depois.
```

**§12, a evidência.** Troque

```markdown
~10 usuários. Medição de apoio: `docker stats --no-stream` + `free -m`, com a saída no audit —
o critério é escrito, não memória de quem operou.
```

por:

```markdown
~10 usuários. **A evidência é a série do CloudWatch, desde o item 34:** `mem_used_percent` e
`swap_used_percent` em `Lotus/Host` (`Ambiente=prod`), um ponto por minuto, sem alarme (D9 da spec
do item 34). A leitura está na §14.5. `docker stats --no-stream` e `free -m` viram conferência
pontual, com a saída no audit — o critério é escrito, não memória de quem operou.
```

- [ ] **Step 4: a §14.** Acrescente ao fim de `deploy/aws/README.md`, depois da §13.6, o texto
  abaixo. No 14.6, o padrão do `--filter-pattern` do 5xx é a forma que valeu na Task 6. A regex
  está escrita abaixo; se valeu o literal, troque pelo literal de Global Constraints.

````markdown
## 14. Observabilidade — agente, sonda e os quatro alarmes

O host publica no CloudWatch desde o item 34 (spec
`docs/superpowers/blocos/34-infra-producao-observabilidade/spec.md`). São três peças, e cada uma
nasce de um arquivo versionado:

- **O agente** `amazon-cloudwatch-agent`, instalado pelo `deploy/aws/user-data.sh` (§6) com versão
  e sha256 fixados.
  - Métricas: `disk_used_percent` de `/`, `mem_used_percent` e `swap_used_percent`, no namespace
    `Lotus/Host`, com a dimensão `Ambiente=prod`, um ponto por minuto.
  - Logs: leva ao CloudWatch Logs o log de **todo contêiner** (`/lotus/prod/containers`, um stream
    por contêiner) e o da sonda (`/lotus/prod/sonda`), com retenção de 30 dias. O teto local
    `json-file` 10 MB × 3 continua, para quando o agente cair.
- **A sonda** `/opt/lotus/bin/sondar-saude.sh` (`deploy/bin/`, instalada pelo §7), que o timer
  `lotus-sonda.timer` roda a cada minuto.
  - Mede `https://app.lotusotec.cl/up` e os dias que faltam no certificado servido na 443.
  - Grava uma linha em `/var/log/lotus/sonda.log`:
    `{"ts":"…","up":1,"http":200,"cert_dias":84}`. Medição que falha omite `cert_dias`.
- **Os metric filters e os alarmes**, criados pelo `deploy/aws/criar-observabilidade.sh` com a
  credencial do João.
  - Os filtros transformam as linhas em `Lotus/Sonda` `Up`, `CertDias` e `Http5xx`. Este último
    conta as respostas 5xx no log do nginx.
  - Os alarmes avisam o tópico `lotus-alertas` (§10) no `ALARM` e no `OK`.

| Alarme | Métrica | Estatística, período | Dispara | M de N | Falta de dado |
|---|---|---|---|---|---|
| `lotus-prod-up` | `Lotus/Sonda` `Up` | mínimo, 60 s | `< 1` | 3 de 5 | conta como falha |
| `lotus-prod-5xx` | `Lotus/Sonda` `Http5xx` | soma, 300 s | `≥ 5` | 1 de 1 | conta como OK |
| `lotus-prod-disco` | `Lotus/Host` `disk_used_percent` (`Ambiente=prod`, `fstype`, `path=/`) | máximo, 300 s | `> 80` | 2 de 2 | mantém o estado |
| `lotus-prod-certificado` | `Lotus/Sonda` `CertDias` | mínimo, 300 s | `< 21` | 1 de 1 | mantém o estado |

O `lotus-prod-up` é o único em que falta de dado conta como falha: ele é o *dead-man's switch* do
agente, da sonda e do host. Por isso o e-mail dele não quer dizer "o site caiu", e sim "a linha da
sonda não chegou dizendo 200". O 14.6 separa os casos.

A role `lotus-ec2` ganha uma quarta inline, `lotus-observabilidade`, que o 14.1 aplica:
- `logs:CreateLogStream`, `logs:PutLogEvents` e `logs:DescribeLogStreams` em `log-group:/lotus/*`;
- `cloudwatch:PutMetricData` só no namespace `Lotus/Host`.

Ela não tem `CreateLogGroup` nem `PutRetentionPolicy`: do host não se cria grupo nem se muda
retenção.

### 14.1 Recursos base e o lab

Pré-condição: o `lotus-alertas` com assinatura confirmada (14.8). Da raiz de uma árvore do
repositório, com a credencial administrativa:

```bash
deploy/aws/criar-observabilidade.sh base prod   # inline, grupos de 30 dias, os três filtros
deploy/aws/criar-observabilidade.sh base lab    # grupos de 1 dia, sem filtro
```

Cada etapa confere os padrões no `test-metric-filter` antes de criar qualquer filtro: cada um tem
de casar a linha certa e recusar a errada.
- O padrão do `Http5xx` tem duas formas, a regex `%HTTP/[0-9.]+..5[0-9]{2}.%` e um termo literal, e
  vale a primeira que passar. **As duas recusadas é o portão D14 da spec do item 34:** PARE. A
  saída seria mudar o formato de log do nginx.
- Filtro só existe em `prod`: metric filter não aceita dimensão fixa, e um filtro no grupo do lab
  publicaria na métrica dos alarmes de produção.
- O readback mostra a inline, a retenção de cada grupo e os filtros. Retenção errada sai 1.

**O lab** prova o recreate sem tocar na produção: uma EC2 descartável nasce do user-data da branch,
com `AMBIENTE=lab`, e morre no fim.

```bash
sed 's/^AMBIENTE=prod$/AMBIENTE=lab/' deploy/aws/user-data.sh > /tmp/user-data-lab.sh
grep -c '^AMBIENTE=lab$' /tmp/user-data-lab.sh      # 1
aws ec2 run-instances --region sa-east-1 \
  --image-id resolve:ssm:/aws/service/canonical/ubuntu/server/24.04/stable/current/arm64/hvm/ebs-gp3/ami-id \
  --instance-type t4g.small --key-name lotus-prod \
  --iam-instance-profile Name=lotus-ec2 --security-groups lotus-web \
  --metadata-options HttpTokens=required,HttpPutResponseHopLimit=2 \
  --user-data file:///tmp/user-data-lab.sh \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=lotus-lab}]' \
  --query 'Instances[0].InstanceId' --output text
```

O lab assume a `lotus-ec2`, com o S3, o SES e o SNS de produção, porque é a role que um recreate
real usaria. Vive minutos, sem app. Por SSH (`ubuntu@<IP do lab>`, o mesmo `.pem`), confere-se:

- `cloud-init status --wait` dá `status: done`, e
  `systemctl is-active amazon-cloudwatch-agent lotus-sonda.timer` dá `active` duas vezes;
- `sudo grep -ci accessdenied /opt/aws/amazon-cloudwatch-agent/logs/amazon-cloudwatch-agent.log` dá
  `0`;
- `aws cloudwatch list-metrics --region sa-east-1 --namespace Lotus/Host --dimensions Name=Ambiente,Value=lab`
  lista as três métricas, e as dimensões do disco são as do `DISCO` do script (`Ambiente`,
  `fstype`, `path`);
- dois contêineres nascidos **depois** do agente aparecem em `/lotus/lab/containers`, cada um no
  seu stream, cada um com a sua primeira linha:

  ```bash
  sudo docker run -d --name lab-a busybox sh -c 'echo PRIMEIRA-LINHA-lab-a; while true; do echo lab-a; sleep 5; done'
  sudo docker run -d --name lab-b busybox sh -c 'echo PRIMEIRA-LINHA-lab-b; while true; do echo lab-b; sleep 5; done'
  aws logs filter-log-events --region sa-east-1 --log-group-name /lotus/lab/containers \
    --filter-pattern '"PRIMEIRA-LINHA"' --query 'events[].message' --output text
  ```

- a sonda, copiada como no §7 (`scp` para `/tmp`, `sudo mv` para `/opt/lotus/bin/` e `chmod +x`),
  roda no minuto seguinte, e a linha chega em `/lotus/lab/sonda`;
- o user-data rodado de novo (`sudo bash /tmp/user-data-lab.sh`) não muda nada. O
  `ActiveEnterTimestamp` do `docker` e do agente é o mesmo de antes, e o trace não tem `dpkg -i` nem
  `fetch-config`;
- a memória do agente, com `ps -o rss= -C amazon-cloudwatch-agent` (em KiB).

No fim:

```bash
aws ec2 terminate-instances --region sa-east-1 --instance-ids <i-do-lab>
aws logs delete-log-group --region sa-east-1 --log-group-name /lotus/lab/containers
aws logs delete-log-group --region sa-east-1 --log-group-name /lotus/lab/sonda
```

As métricas `Ambiente=lab` não se apagam: param de receber ponto e deixam de ser cobradas.

### 14.2 Instalar no host vivo

Duas partes, nesta ordem.

1. **A sonda, pelo §7.** O `sondar-saude.sh` vai junto com os outros scripts, de uma árvore igual à
   `main` do corporativo. Como todo `deploy/bin/*.sh` novo, ele trava o botão até esta
   reinstalação.
2. **O agente e o timer, pelo reparo.** O `user-data.sh` também é o reparo do host vivo: copiado
   como os artefatos do §7 e rodado como root. Ele não reinstala o Docker (`--no-upgrade`) nem
   reinicia contêiner.

   ```bash
   scp -i "$PEM" deploy/aws/user-data.sh ubuntu@<EIP>:/tmp/
   ```

   No host:

   ```bash
   systemctl show docker -p ActiveEnterTimestamp
   sudo sh -c 'docker inspect -f "{{.Name}} {{.State.StartedAt}}" $(docker ps -q)'
   sudo bash /tmp/user-data.sh > /tmp/user-data.log 2>&1; echo "rc=$?"
   systemctl show docker -p ActiveEnterTimestamp                                   # igual ao de antes
   sudo sh -c 'docker inspect -f "{{.Name}} {{.State.StartedAt}}" $(docker ps -q)' # iguais aos de antes
   systemctl is-active amazon-cloudwatch-agent lotus-sonda.timer                   # active, active
   sudo tail -2 /var/log/lotus/sonda.log                                           # "up":1,"http":200
   rm /tmp/user-data.sh
   ```

   - `rc` diferente de 0: leia `/tmp/user-data.log` do fim para o começo.
   - **Docker ou contêiner reiniciado: PARE.** O `--no-upgrade` falhou. Leia
     `/var/log/apt/history.log` antes de qualquer outro passo.

Depois, espere pelo menos 10 minutos antes do 14.3. A sonda precisa acumular `Up`. E o primeiro
envio do agente, que lê os logs dos contêineres desde o começo, precisa sair da janela do 5xx.

### 14.3 Os alarmes

```bash
deploy/aws/criar-observabilidade.sh alarmes
```

O script recusa em três casos, e em cada um olha o efeito:
- **sem um ponto de `Lotus/Sonda` `Up` nos últimos 10 minutos:** o alarme de `/up` nasceria
  disparando por falta de dado. Volte ao 14.2;
- **sem `disk_used_percent` com as dimensões exatas do alarme** (o `DISCO` do script): o alarme de
  disco nunca sairia de `INSUFFICIENT_DATA`. Compare com o `list-metrics` do 14.5;
- **sem uma assinatura confirmada no `lotus-alertas`:** os alarmes avisariam ninguém (14.8).

O readback mostra, de cada alarme:
- a métrica e as dimensões;
- a estatística e o período;
- o limiar e o M de N;
- o tratamento de falta de dado;
- o número de ações de `ALARM` e de `OK`.

Falta de ação sai 1. Dez minutos depois, os quatro têm de estar em `OK`:

```bash
aws cloudwatch describe-alarms --region sa-east-1 --alarm-name-prefix lotus-prod- \
  --query 'MetricAlarms[].[AlarmName,StateValue]' --output text
```

Reexecutar é seguro: o `put-metric-alarm` substitui o alarme por ele mesmo.

### 14.4 Janela de sondas

A janela prova que cada alarme dispara **e** que o e-mail chega: alerta que nunca chegou não é
alerta (lição 1).
- Fora do horário comercial do Chile.
- Com os quatro alarmes em `OK`.
- Sem desligar as ações: o e-mail é o que se prova.

Anote o início em UTC, para o histórico.

**`/up` e 5xx (~6 minutos de app parado, de verdade):**

```bash
APP=$(sudo docker ps -q --filter label=com.docker.compose.service=app)
sudo docker stop "$APP"
# esperar lotus-prod-up e lotus-prod-5xx em ALARM, e os dois e-mails
sudo docker start "$APP"
curl -s -o /dev/null -w '%{http_code}\n' https://app.lotusotec.cl/up     # 200
```

Sem 200 em um minuto:
`sudo docker restart $(sudo docker ps -q --filter label=com.docker.compose.service=nginx)`. Sem 200
depois disso: `deploy.sh <SHA corrente>` (§8.1).

**Disco (~12 minutos a 82%):**

```bash
read -r USADO LIVRE <<<"$(df -B1 --output=used,avail / | tail -1)"
sudo fallocate -l $(( (USADO + LIVRE) * 82 / 100 - USADO )) /var/tmp/lotus-sonda-disco
df -h /                                   # ~82%
# esperar lotus-prod-disco em ALARM e o e-mail
sudo rm -f /var/tmp/lotus-sonda-disco
```

A qualquer sinal de problema, o arquivo sai na hora.

**Certificado (uma linha da sonda com um certificado de teste de 1 dia):**

```bash
openssl req -x509 -newkey ec -pkeyopt ec_paramgen_curve:prime256v1 -nodes -days 1 \
  -subj /CN=sonda-certificado -keyout /tmp/sonda.key -out /tmp/sonda-1dia.pem
sudo env LOTUS_SONDA_CERT_ARQUIVO=/tmp/sonda-1dia.pem /opt/lotus/bin/sondar-saude.sh
sudo tail -1 /var/log/lotus/sonda.log     # "cert_dias":0
rm /tmp/sonda.key /tmp/sonda-1dia.pem
```

O `lotus-prod-certificado` vai a `ALARM` na avaliação seguinte. Volta a `OK` no período depois,
com as linhas normais da sonda. O certificado servido não muda.

Cada transição tem de aparecer no histórico. Cada alarme tem de ter mandado dois e-mails, o de
`ALARM` e o de `OK`:

```bash
aws cloudwatch describe-alarm-history --region sa-east-1 --alarm-name <alarme> \
  --history-item-type StateUpdate --start-date <início da janela, UTC> \
  --query 'AlarmHistoryItems[].[Timestamp,HistorySummary]' --output text
```

### 14.5 Ler logs e métricas

```bash
aws logs tail /lotus/prod/containers --region sa-east-1 --since 15m
aws logs tail /lotus/prod/containers --region sa-east-1 --since 1h --filter-pattern '"production.ERROR"'
aws logs tail /lotus/prod/sonda --region sa-east-1 --since 10m
```

O stream de cada contêiner leva o ID dele no nome. Para achar um serviço:
- no host, `sudo docker ps --no-trunc --format '{{.ID}} {{.Names}}'`;
- no `tail`, `--log-stream-name-prefix <instância>_var_lib_docker_containers_<ID>`.

Um deploy recria os contêineres, e cada um ganha stream novo. O antigo some com a retenção.

As métricas do host (`Ambiente=prod`) e a série que decide o resize (§12):

```bash
aws cloudwatch list-metrics --region sa-east-1 --namespace Lotus/Host \
  --query 'Metrics[].[MetricName,to_string(Dimensions)]' --output text
aws cloudwatch get-metric-statistics --region sa-east-1 --namespace Lotus/Host \
  --metric-name swap_used_percent --dimensions Name=Ambiente,Value=prod \
  --start-time "$(date -u -d '-7 days' +%FT%TZ)" --end-time "$(date -u +%FT%TZ)" \
  --period 3600 --statistics Average Maximum \
  --query 'sort_by(Datapoints,&Timestamp)[].[Timestamp,Average,Maximum]' --output text
```

Troque `swap_used_percent` por `mem_used_percent` para ver a memória. Lê esses logs quem tem
`logs:GetLogEvents` ou `logs:FilterLogEvents` na conta, e hoje esse é o usuário administrativo do
João. A role da EC2 só escreve.

### 14.6 O que fazer com cada e-mail

O assunto do SNS traz o nome do alarme e o estado. O e-mail de `OK` é o alarme voltando: anote no
audit do incidente, se houve um.

**`lotus-prod-up`.** Comece pela sonda, no host. A última linha diz o que ela viu:

```bash
sudo tail -3 /var/log/lotus/sonda.log
systemctl status amazon-cloudwatch-agent lotus-sonda.timer --no-pager
```

- **Linhas novas com `"up":1`:** o site está de pé, e o que caiu foi o caminho até o CloudWatch.
  Rode `sudo tail -50 /opt/aws/amazon-cloudwatch-agent/logs/amazon-cloudwatch-agent.log`.
  `AccessDenied` é a inline `lotus-observabilidade` (14.1). Com o agente parado,
  `sudo systemctl restart amazon-cloudwatch-agent`.
- **Sem linha nova:** é o timer ou o script. Rode `systemctl status lotus-sonda.service`. Sem o
  `/opt/lotus/bin/sondar-saude.sh`, o serviço é pulado em silêncio (`ConditionPathExists`):
  reinstale pelo §7.
- **`"up":0` com `"http":502` ou `504`:** é o app. Rode `sudo docker ps` e leia os logs do app pelo
  14.5.
- **`"up":0,"http":0`:** é o nginx, o TLS ou a rede. Rode `sudo docker ps` e o `curl` de fora.

Sem SSH, o host caiu. Não há auto-recover: console da EC2, *status checks*, e reboot ou recreate
(§6).

**`lotus-prod-5xx`.** São cinco ou mais respostas 5xx do nginx em 5 minutos, com ou sem o `/up`
verde. A causa é uma rota quebrada, ou o S3 ou o Gotenberg fora:

```bash
aws logs tail /lotus/prod/containers --region sa-east-1 --since 30m \
  --filter-pattern '{ $.log = %HTTP/[0-9.]+..5[0-9]{2}.% }'
aws logs tail /lotus/prod/containers --region sa-east-1 --since 30m --filter-pattern '"production.ERROR"'
```

Um deploy que demore mais de ~1 minuto pode disparar este alarme sozinho, porque o healthcheck do
nginx leva 502 enquanto o `app` sobe. O `OK` chega no período seguinte.

**`lotus-prod-disco`.** O disco `/` passou de 80% em dois períodos de 5 minutos:

```bash
df -h /
sudo docker system df
sudo du -xh --max-depth=2 /var/lib /opt /var/log /tmp 2>/dev/null | sort -h | tail -15
```

Os logs dos contêineres têm teto (10 MB × 3 cada), e o swap é fixo. O que cresce é imagem de
release antiga e o volume do MySQL. Limpar imagem é decisão do João: o rollback do §8.1 precisa da
imagem anterior.

**`lotus-prod-certificado`.** O certificado **servido** na 443 vence em menos de 21 dias. Ou a
renovação falhou nove dias seguidos, ou ela renovou e o nginx não recarregou.

```bash
sudo certbot certificates
systemctl status certbot.timer --no-pager
sudo tail -50 /var/log/letsencrypt/letsencrypt.log
```

- Renovação falhando: o gate do §11.7 (`sudo certbot renew --dry-run`).
- Certificado novo em disco e o velho servido: o hook do §11.6.

### 14.7 Parada planejada

Resize (§12), reemissão TLS (§11.2) ou qualquer parada de propósito dispara o `lotus-prod-up` e o
`lotus-prod-5xx`. Desligue as ações antes da parada e religue depois:

```bash
aws cloudwatch disable-alarm-actions --region sa-east-1 --alarm-names lotus-prod-up lotus-prod-5xx
aws cloudwatch enable-alarm-actions --region sa-east-1 --alarm-names lotus-prod-up lotus-prod-5xx
```

Esquecer o `enable` é ficar sem alarme sem saber. Confira com
`describe-alarms --query 'MetricAlarms[].[AlarmName,ActionsEnabled]'`. A janela de sondas (14.4)
**não** desliga nada: o que ela prova é o e-mail.

### 14.8 A assinatura do tópico

```bash
CONTA=$(aws sts get-caller-identity --query Account --output text)
aws sns list-subscriptions-by-topic --region sa-east-1 \
  --topic-arn "arn:aws:sns:sa-east-1:$CONTA:lotus-alertas" \
  --query 'Subscriptions[].SubscriptionArn' --output text   # nenhum PendingConfirmation
```

Só o `alarmes` confere a assinatura, e uma vez só. Se ela sumir depois, os alarmes disparam para
ninguém, e nada avisa. Confira depois de trocar o e-mail e antes de cada janela de sondas.

### 14.9 Recuo

No host, sem tocar no app:

```bash
sudo systemctl disable --now amazon-cloudwatch-agent lotus-sonda.timer
aws cloudwatch disable-alarm-actions --region sa-east-1 \
  --alarm-names lotus-prod-up lotus-prod-5xx lotus-prod-disco lotus-prod-certificado
```

Na AWS, se o recuo for de vez:

```bash
aws cloudwatch delete-alarms --region sa-east-1 \
  --alarm-names lotus-prod-up lotus-prod-5xx lotus-prod-disco lotus-prod-certificado
aws logs delete-metric-filter --region sa-east-1 --log-group-name /lotus/prod/sonda --filter-name Up
aws logs delete-metric-filter --region sa-east-1 --log-group-name /lotus/prod/sonda --filter-name CertDias
aws logs delete-metric-filter --region sa-east-1 --log-group-name /lotus/prod/containers --filter-name Http5xx
aws logs delete-log-group --region sa-east-1 --log-group-name /lotus/prod/containers
aws logs delete-log-group --region sa-east-1 --log-group-name /lotus/prod/sonda
aws iam delete-role-policy --role-name lotus-ec2 --policy-name lotus-observabilidade
```

O ADR-14, o ADR-21 e este runbook ficam, com uma emenda datada dizendo o que foi revertido.

### 14.10 Custo

A estimativa da spec do item 34 (D13) é ≈ US$ 0 dentro do free tier permanente do CloudWatch e
≈ US$ 3–4/mês fora dele.
- O free tier cobre 10 métricas custom, 10 alarmes, 1 milhão de chamadas de API e 5 GB de log.
- Este uso cabe nele com folga: 6 métricas, 4 alarmes, ~43 mil `PutMetricData` por mês e
  0,3–0,5 GB de log.
- Mas a conta é membro de uma organização, e o free tier é um só para todas as contas, somado na
  pagadora. Daqui não se lê quanto sobra.

O número real é o do Cost Explorer desta conta (console → *Cost Explorer* → serviço *CloudWatch*,
diário), ~3 dias depois da instalação, registrado na P-80.
````

- [ ] **Step 5: rodar e ver passar.**

Run: `cd frontend && pnpm test --project repo tests/observabilidade-nomes.test.ts tests/repo-docs-refs.test.ts`
Expected: PASS.

- [ ] **Step 6: a sonda da lição 19.** Com `cp` e `cmp`, renomeie o grupo da sonda só no
  `criar-observabilidade.sh`, em todas as ocorrências:
  `sed -i 's#/lotus/\$ambiente/sonda#/lotus/$ambiente/saude#g' deploy/aws/criar-observabilidade.sh`.
  Reprova `/lotus/<amb>/sonda aparece igual em ["user-data","criar"]`. Um nome que só cresce, como
  `sondas`, não serve de sonda, porque ainda contém o original. Restaure, confira com `cmp` e rode
  de novo: PASS.

- [ ] **Step 7: lint e commit.**

```bash
(cd frontend && pnpm lint)
git add deploy/aws/README.md frontend/tests/observabilidade-nomes.test.ts
git commit -m "docs(deploy): runbook §14 de observabilidade e emendas de §6, §7, §10, §11.7 e §12" -m "Co-Authored-By: Claude <modelo> <noreply@anthropic.com>"
```

---

### Task 8: emendas do ADR-14 e do ADR-21

**Files:**
- Modify: `docs/adrs.md` (ADR-14, depois da emenda de 2026-09-27 do TLS; ADR-21, depois do parágrafo **Descartado:**)

**Interfaces:**
- Consumes:
  - `HAIRPIN` do audit da Task 1: decide uma frase da emenda do ADR-14;
  - os nomes de Global Constraints, os arquivos das Tasks 2 a 5 e o runbook §14. O
    `repo-docs-refs` exige que todo caminho citado exista.
- Produces: o `[FASE 2]` "monitoramento básico" do ADR-14 vencido, e a retenção do log de
  segurança do ADR-21 em 30 dias no CloudWatch.

- [ ] **Step 1: ADR-14.** Em `docs/adrs.md`, o último parágrafo do ADR-14 é a emenda de
  2026-09-27 do TLS. Ele termina em "continua aberto e é o item 34." Depois dele, e antes de
  `## ADR-15`, acrescente uma linha em branco e:

```markdown
**Emenda (2026-10-04, bloco `infra-producao-observabilidade`).** O último item `[FASE 2]` deste
ADR, *"monitoramento básico (healthcheck + alerta CloudWatch)"*, está **vencido**.
- **O agente.** O host roda o CloudWatch agent, instalado pelo `deploy/aws/user-data.sh` com
  versão e sha256 fixados. Ele publica disco, memória e swap em `Lotus/Host` e leva o log de todo
  contêiner ao CloudWatch Logs (`/lotus/prod/containers`, 30 dias).
- **A sonda.** O `deploy/bin/sondar-saude.sh` roda num timer de um minuto, mede
  `https://app.lotusotec.cl/up` e os dias do certificado servido, e metric filters fazem disso
  `Lotus/Sonda`.
- **Os alarmes.** São quatro, e todos avisam no `ALARM` e no `OK`:
  - `/up` fora: 3 de 5 minutos, e falta de dado conta como falha;
  - 5xx sustentado: ≥ 5 em 5 minutos;
  - disco acima de 80%;
  - certificado com menos de 21 dias.
- **O canal.** O tópico SNS `lotus-alertas` passa a ser o canal definitivo de alerta de
  infraestrutura.

Fecha também o *"não há alarme de expiração até o item 34"* da emenda de 2026-09-27, que fica como
estava, datada.

Limites escritos:
- a sonda mede de dentro da AWS, pelo hairpin no EIP;
- não há sonda externa nem auto-recover;
- CloudWatch ou SNS fora na região não avisam ninguém.

O procedimento, a leitura e a resposta a cada e-mail estão no runbook `deploy/aws/README.md`, §14.
Se o `decisao-stack.md` do Drive ainda trouxer o texto original, **quem vence aqui é esta decisão
posterior do João**, e o original não se apaga.
```

Com `HAIRPIN: quebrado` no audit, troque o item "a sonda mede de dentro da AWS, pelo hairpin no
EIP;" por "a sonda mede pelo loopback do host, com o nome no SNI, porque o hairpin pelo EIP falhou
na medição (audit do bloco);".

- [ ] **Step 2: ADR-21.** Depois do parágrafo que começa em `**Descartado:** microserviço de logs
  em nuvem` e antes do `---` que fecha o ADR, acrescente uma linha em branco e:

```markdown
**Emenda (2026-10-04, bloco `infra-producao-observabilidade`).** O coletor existe. O CloudWatch
agent leva o log de todo contêiner, inclusive o canal `seguranca`, ao grupo `/lotus/prod/containers`
do CloudWatch Logs. O grupo fica em `sa-east-1`, na mesma conta e região do S3 e dos backups, e o
serviço o cifra em repouso.

- **A retenção.** **A política de retenção declarada do log de segurança passa a ser 30 dias no
  CloudWatch Logs** (D1 e D10 da spec do bloco). O teto local `json-file` 10 MB × 3 continua, para
  quando o coletor cair, e deixa de ser a política.
- **O "log morre com a instância"** deixa de valer para o que já saiu do host: o agente envia a
  cada poucos segundos, e o que se perde numa queda é a janela ainda não enviada.
- **O que sai do host, por 30 dias:**
  - do canal `seguranca`, o id do ator e o IP. Nunca e-mail, senha ou token, pela forma fixa do
    `EventoDeSeguranca`;
  - do nginx, o IP, o user agent e a URL com a query string. O `q` das listas paginadas (ADR-22)
    pode trazer nome ou RUT, e isso é limite declarado, sem mascaramento;
  - as mensagens de erro do Laravel, **sem os bindings da SQL**. A conexão liga
    `mask_bindings_in_exception_messages` (`backend/config/database.php`, D12 da spec: o D-74 pago).
    O que resta é o texto de erro do próprio MySQL, como `Duplicate entry '<valor>'`, que a
    máscara não alcança.
- **O prazo.** 30 dias é menos que os 12 meses do IP em `login_logs` e `audits`: o registro longo é
  o banco.
- **Quem lê.** Lê esses logs quem tem `logs:GetLogEvents` ou `logs:FilterLogEvents` na conta, e
  hoje esse é o usuário administrativo do João. A role da EC2 só escreve (`lotus-observabilidade`).

**A regra deste ADR não muda:** o coletor é infraestrutura da AWS, não o microserviço do
`RNF-SEC-05`, e a P-64 segue aberta.
```

- [ ] **Step 3: rodar a catraca de docs.**

Run: `cd frontend && pnpm test --project repo tests/repo-docs-refs.test.ts`
Expected: PASS. Todo caminho citado existe: `deploy/aws/user-data.sh`, `deploy/bin/sondar-saude.sh`,
`deploy/aws/README.md` e `backend/config/database.php`.

- [ ] **Step 4: commit.**

```bash
git add docs/adrs.md
git commit -m "docs(adrs): ADR-14 com o monitoramento entregue e ADR-21 com a retenção de 30 dias" -m "Co-Authored-By: Claude <modelo> <noreply@anthropic.com>"
```

---

### Task 9: P-80 — a estimativa e a RSS medida

**Files:**
- Modify: `docs/superpowers/pendencias/abertas.md` (a ficha P-80, ao fim dela, antes de `## P-81`)

**Interfaces:**
- Consumes: a RSS do agente, do audit da Task 6.
- Produces: a P-80 com o custo do bloco nas duas hipóteses e a RSS. O custo medido entra depois,
  pela lane de aceitação (B9).

- [ ] **Step 1: a nota.** Ao fim da ficha P-80, depois do parágrafo que começa em
  `O alarme **existe e funciona**` e antes de `## P-81`, acrescente uma linha em branco e o texto
  abaixo. O `<N>` é a RSS em MiB do audit da Task 6.

```markdown
**Observabilidade, item 34 (2026-10-04).** O CloudWatch entra na conta (D13 da spec do bloco):
- ≈ US$ 0/mês dentro do free tier permanente: 10 métricas custom, 10 alarmes, 1 milhão de chamadas
  de API e 5 GB de log;
- ≈ US$ 3–4/mês fora dele: 6 métricas, 4 alarmes, ~43 mil `PutMetricData`/mês e 0,3–0,5 GB de
  log/mês.

A conta é membro de uma organização, e o free tier é um só para todas as contas: daqui não se lê
quanto sobra.

O agente consome **<N> MiB** de RAM, medidos no lab (portão D14 da spec: ~100 MiB), num host de
2 GiB com swap em uso. Isso entra na conta do resize, junto com o resto. O histórico de
`mem_used_percent` e `swap_used_percent` em `Lotus/Host` substitui o `free -m` à mão como evidência
do critério do runbook §12 (§14.5).

O custo medido no Cost Explorer, ~3 dias depois da instalação em produção, entra aqui pela lane de
aceitação do item 34.
```

- [ ] **Step 2: commit.**

```bash
git add docs/superpowers/pendencias/abertas.md
git commit -m "docs(pendencias): P-80 com o custo da observabilidade e a RSS do agente" -m "Co-Authored-By: Claude <modelo> <noreply@anthropic.com>"
```

---

### Task 10: gate da Fase A e o fecho do audit

**Files:**
- Modify: `docs/superpowers/blocos/34-infra-producao-observabilidade/audit.md` (seção `## Task 10` no fim)

**Interfaces:**
- Consumes: a branch inteira, das Tasks 1 a 9.
- Produces: o placar verde no audit. Ele é a prova do DoD 1 e o insumo do `/revisar-bloco`.

- [ ] **Step 1: frontend.**

```bash
cd frontend && pnpm lint && pnpm test && pnpm build; cd ..
```

Esperado: os três verdes. Anote o placar do `pnpm test` (`Test Files … passed`, `Tests … passed`).

- [ ] **Step 2: backend.**

```bash
docker compose exec -T app php artisan test 2>&1 | tail -4
cd backend && ./vendor/bin/pint --test config/database.php tests/Feature/Shared/BindingsForaDaMensagemTest.php; cd ..
```

Esperado: a suíte verde, com o placar da linha de base da Task 5 mais 4, e o Pint `PASS`.

- [ ] **Step 3: os scripts e a higiene.**

```bash
bash -n deploy/aws/user-data.sh deploy/bin/sondar-saude.sh deploy/aws/criar-observabilidade.sh frontend/tests/fixtures/aws-falso.sh
git diff --name-only 77196049..HEAD
git diff 77196049..HEAD | grep -nE '^\+.*([0-9]{12}|i-[0-9a-f]{8,17}|@[a-z0-9-]+\.(com|cl))' | grep -vE '123456789012|@example\.com|lotus@lotusotec\.cl' || echo "limpo"
```

Esperado:
- nenhuma saída do `bash -n`;
- só os arquivos do Mapa de arquivos, mais a `spec.md`, o `context.md`, o `plano.md`, o
  `estado.md`, o `aceitacao.md` e a ficha 34 do `backlog.md` (`0ca0c58b`);
- `limpo`.

Linha que sobrar no `grep` → **PARE** e mascare antes de seguir. A conta de teste `123456789012`,
o domínio reservado e o remetente do molde são as exceções.

- [ ] **Step 4: o audit.** Acrescente ao fim de `audit.md`:

````markdown
## Task 10 — gate da Fase A

Em <AAAA-MM-DD>, no HEAD `<sha curto>`.

| Verificação | Resultado |
|---|---|
| `pnpm lint` · `pnpm test` · `pnpm build` | verdes; <Test Files N passed, Tests M passed> |
| `php artisan test` (contêiner da lane) | <placar> — linha de base da Task 5 + 4 |
| `pint --test` nos dois arquivos PHP | `PASS` |
| `bash -n` nos quatro scripts | sem saída |
| arquivos da branch desde `77196049` | só os do plano |
| higiene (conta, instância, e-mail) | limpo |

Sondas da lição 19, vistas reprovar e restauradas por `cmp`: Task 2 (3), Task 3 (3), Task 4 (4),
Task 5 (2), Task 7 (1).

Os itens 1 e 2 da `## Verificação externa` estão provados nas seções das Tasks 1 e 6. Os itens 3 a
7 só existem depois do merge e do espelho (Fase B).
````

- [ ] **Step 5: commit.**

```bash
git add docs/superpowers/blocos/34-infra-producao-observabilidade/audit.md
git commit -m "docs(34): gate da Fase A" -m "Co-Authored-By: Claude <modelo> <noreply@anthropic.com>"
```

---

## Grupos paralelos

| Grupo | Tasks | Files: disjuntos | Aresta Consumes/Produces |
|---|---|---|---|
| G1 | 2, 3, 4, 5 | sim. A 2 toca a sonda e o teste dela; a 3, o user-data e o teste dele; a 4, o script, o teste e a fixture; a 5, o `database.php` e o teste PHP | nenhuma entre elas. A 2 e a 4 consomem a Task 1, e a 3 e a 5 não consomem task nenhuma. Os nomes que as ligam são de Global Constraints |
| G2 | 7, 8, 9 | sim. A 7 toca o `README.md` e o teste de nomes; a 8, o `adrs.md`; a 9, o `abertas.md` | nenhuma entre elas. As três consomem as Tasks 1 a 6, e a §14 que a 8 cita é um número fixo de Global Constraints |

Task fora de grupo executa e revisa uma a uma. A 1, a 6 e a 10 dividem o `audit.md`, e a 6 consome
as Tasks 2, 3 e 4.

## Handoff de execução

**executor: claude**

- **Sessão:** `sonnet`, esforço `medium`, que é o frontmatter do `/executar-bloco`. Sem `--max`: o
  código e o texto de cada task estão no plano, e a revisão final da branch já é `opus`
  (`revisor-branch`).
- **Escolha do Passo 3:** 10 tasks e 14 arquivos distintos levam a `subagent-driven-development`.
- **Tasks do controlador: a 1 e a 6.** Elas não se despacham. Dependem de leitura de produção por
  SSH e de escrita do João na AWS e no lab, e um subagente não espera o João. O controlador executa
  e commita. O `revisor-task` revisa o commit, como em toda task, olhando a higiene do audit (conta,
  instância, IP, e-mail). Isso é desvio declarado da SDD e vai ao `rulings.md`.
- **Primeiro commit:** o da Task 1, que é do controlador. É ele quem dá o `git add` duplo, com o
  audit e o `estado.md` do Passo 4.
- **Papéis** (`.claude/papeis.md`):
  - `implementador-integracao` na Task 4: três arquivos, o teste por execução com o `aws` falso e
    a política IAM;
  - `implementador-mecanico` nas Tasks 2, 3, 5, 7, 8, 9 e 10: código ou texto pronto no plano, até
    dois arquivos cada;
  - `revisor-task` em toda task;
  - `re-revisor` e `corretor-tardio` só em rodada de correção;
  - `revisor-branch` no fim.
- **Sem delegação ao Codex.** O bloco cria IAM, roda script como root no host de produção e
  depende do João no meio (Tasks 1 e 6), o que é julgamento fora do plano. A lente Codex entra no
  `/revisar-bloco`, que classifica o bloco como alto risco: policy IAM, root no host, agente root.
- **Stack:** o `/executar-bloco` sobe o stack antes da primeira task de backend (`docker compose up -d`
  na raiz da lane), e a Task 5 roda o `composer install` no contêiner.
- **`$SCRATCH`:** o scratchpad da sessão de quem executa a sonda, nunca `/tmp` do repositório.

**Sequência obrigatória:** 1 → G1 (2, 3, 4, 5) → 6 → G2 (7, 8, 9) → 10.
- A 1 vem primeiro. O hairpin decide a variante da sonda (2), e o `FSTYPE` e as linhas do nginx
  entram no script (4).
- O G1 é um pipeline de profundidade 1. A ordem dentro dele é livre, mas a 2 e a 4 esperam a 1.
- A 6 vem depois do G1, porque o lab roda os arquivos das Tasks 2, 3 e 4. Defeito achado no lab
  vira rodada de correção da task dona do arquivo, e o lab repete.
- O G2 vem depois da 6. A 7 escreve no runbook a forma do 5xx que valeu, e a 9, a RSS.
- A 10 vem por último, porque o gate mede a branch inteira.

`efeito_externo: sim` e `executor: claude` já estão no `estado.md`.

---

## Depois da execução — revisão, PR e aceitação

Nada daqui é task do `/executar-bloco`. A ordem do harness:

1. O `/executar-bloco 34` termina em `ready_for_review`, com o `rulings.md`.
2. `/revisar-bloco 34`. É alto risco: policy IAM, script como root no host de produção, agente
   root, user-data do recreate. A lente Codex vai junto.
3. `/finalizar-bloco 34`, na lane. Faz a verificação fresca, o portão da revisão, o merge da
   `origin/main` e os registros de fechamento em **aguardando aceitação**:
   - as provas dos itens 1 e 2 da `## Verificação externa` (Tasks 1 e 6) vão ao corpo do
     `estado.md`, e os itens 3 a 7, ao `blocker`;
   - a linha do `historico/progress.md` diz que o bloco mesclou sem a prova externa;
   - a lane tira a ficha 34 da `# Ordem de execução` e escreve a do bloco em
     `## Aguardando aceitação` (invariante 10).

   Depois, a PR. O merge é do João.
4. O João espelha a `main` no corporativo (`CONTRIBUINDO.md`).
5. `/finalizar-bloco 34` no main tree, depois da PR: `lane.sh fechar 34`. A lane fecha, e o bloco
   segue em `blocked` aguardando aceitação.
6. A Fase B, abaixo, e a PR de docs da aceitação, que leva o bloco a `closed`.

## Fase B — aceitação em produção (spec §5, passos 4 a 9)

**Não é task do `/executar-bloco`:** roda depois do passo 5 acima. A escrita é do João, e a leitura,
da sessão.
- As leituras usam `aws`, `ssh`, `curl` e `gh`, que a allowlist do `guard-main-shell` nega no main
  tree. Rodam numa árvore fora dele, como a da PR de docs da aceitação, ou o João roda e cola.
- Toda leitura `aws` roda com `AWS_PROFILE=lotus`.
- Cada leitura vai ao `audit.md`, seção `## Fase B — aceitação`, nas regras de Global Constraints.

### B4. Reinstalação pelo §7, com a sonda (Verificação externa 3)

O João reinstala pelo runbook §7, a partir de uma árvore igual à `main` do corporativo
(`git fetch upstream && git diff --quiet upstream/main -- deploy/bin`). A lista do `scp` inclui o
`sondar-saude.sh`. Leitura, por SSH:
`sudo sha256sum /opt/lotus/bin/sondar-saude.sh` tem de dar o mesmo hash que
`sha256sum deploy/bin/sondar-saude.sh` na `main`.

### B5. O botão promove o SHA do merge (D12; Verificação externa 3)

O João clica o botão no SHA espelhado. Leitura:

```bash
gh run list --repo Gatika-CL/lotus --workflow deploy.yml --limit 1 --json databaseId,conclusion,headSha 2>/dev/null || echo "o João cola o run e a conclusão"
curl -s -o /dev/null -w '%{http_code}\n' https://app.lotusotec.cl/up
```

Por SSH: `sudo tail -2 /opt/lotus/releases.jsonl`. Esperado:
- o run `success` no SHA espelhado, com a conferência do botão passando depois do B4;
- `200`, que é a prova `producao GET /up -> 200`;
- o ledger com `fim` e `resultado ok` no mesmo SHA.

Com isso, a máscara da D12 está em produção.

### B6. Reparo pelo user-data (Verificação externa 3)

O João segue o runbook §14.2, parte 2, e cola as leituras de antes e de depois. Esperado:
- `rc=0`;
- o `ActiveEnterTimestamp` do Docker e os `StartedAt` dos contêineres iguais aos de antes;
- `active` duas vezes;
- `"up":1,"http":200` na sonda.

Docker ou contêiner reiniciado → **PARE** (spec §6). Depois, a sessão lê:

```bash
AWS_PROFILE=lotus aws logs describe-log-streams --region sa-east-1 --log-group-name /lotus/prod/containers --query 'length(logStreams)' --output text
AWS_PROFILE=lotus aws logs tail /lotus/prod/sonda --region sa-east-1 --since 5m
AWS_PROFILE=lotus aws cloudwatch list-metrics --region sa-east-1 --namespace Lotus/Host --dimensions Name=Ambiente,Value=prod --query 'Metrics[].MetricName' --output text
AWS_PROFILE=lotus aws cloudwatch list-metrics --region sa-east-1 --namespace Lotus/Sonda --query 'Metrics[].MetricName' --output text
```

Esperado:
- um stream por contêiner de `docker ps`;
- linhas da sonda;
- as três métricas do host;
- `Up`, `CertDias` e `Http5xx`.

Depois, espera de ≥ 10 min.

### B7. Os alarmes (Verificação externa 3)

O João roda `deploy/aws/criar-observabilidade.sh alarmes` e cola o readback, que tem de ser igual
à tabela da spec §4.4. Dez minutos depois, a sessão lê o `describe-alarms` do runbook §14.3: os
quatro em `OK`.

### B8. Janela de sondas (Verificação externa 4, 5 e 6)

O João roda o runbook §14.4, fora do horário comercial do Chile. A sessão lê o
`describe-alarm-history` de cada alarme desde o início da janela: `OK → ALARM → OK`. O João
confirma os dois e-mails de cada alarme. Ao audit vão o assunto e o horário, nunca o endereço. Ao
fim, `curl https://app.lotusotec.cl/up` dá `200`.

### B9. Custo (Verificação externa 7)

Uns 3 dias depois do B6, o João lê no Cost Explorer a linha do CloudWatch desta conta. A lane de
aceitação a grava na P-80: valor perto de US$ 0 diz que o free tier da organização cobre.

### A PR de docs da aceitação

Num commit só, pelo modo Aceitação do `/finalizar-bloco`:
- `estado.md`: no corpo, uma linha por item da `## Verificação externa` (3 a 7), com a prova e a
  seção do audit. No frontmatter, `blocked` → `closed`;
- `audit.md`: a seção `## Fase B — aceitação`, de B4 a B9;
- `docs/superpowers/pendencias/abertas.md`: o custo medido na P-80;
- `docs/superpowers/historico/progress.md`: a linha que o fechamento gravou, atualizada, sem linha
  nova;
- `docs/superpowers/backlog.md`: saem a ficha 34, a linha dela em `## Aguardando aceitação` e o
  `D-74`, como pago (invariante 10).
