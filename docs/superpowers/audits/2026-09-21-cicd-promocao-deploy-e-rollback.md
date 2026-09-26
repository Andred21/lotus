# Evidências — `cicd-promocao-deploy-e-rollback` (item 12)

Plano: [`plans/2026-09-21-cicd-promocao-deploy-e-rollback.md`](../plans/archive/2026-09-21-cicd-promocao-deploy-e-rollback.md)

## Task 8 — identidade na AWS

Executada pelo João em 2026-09-24, com o profile `lotus` (`AWS_PROFILE=lotus`), a partir da árvore
`../lotus-infra` na branch `cicd/promocao-deploy-e-rollback` — o script só existe nela até a Task 11.
A primeira tentativa respondeu `UnrecognizedClientException … security token … invalid`: era o
profile padrão da máquina, não o da conta. Nada foi escrito na conta com a credencial errada.

- **`describe-instance-information` antes da role:** a saída colada foi a listagem de instâncias
  (`i-0789e30d781790dd4 | lotus-prod`), não o inventário do SSM. O estado do agente antes da role
  fica provado pelo próprio script, abaixo: a espera começou em `estado: None`, que é a instância
  **ausente** do inventário do SSM, e não `ConnectionLost` ou `Inactive`.
- **Saída do `criar-oidc-e-role.sh` (readback completo):**

  ```text
  LOTUS_INSTANCIA=i-0789e30d781790dd4 deploy/aws/criar-oidc-e-role.sh
  ==> conta 760144413534, regiao sa-east-1, repositorio Gatika-CL/lotus, instancia i-0789e30d781790dd4
  ==> provider OIDC ja existe, com a audiencia sts.amazonaws.com
  ==> role lotus-deploy criada
  ==> politica lotus-deploy-ssm aplicada
  ==> lotus-ec2 com AmazonSSMManagedInstanceCore

  ===== readback =====
  {
      "Version": "2012-10-17",
      "Statement": [
          {
              "Effect": "Allow",
              "Principal": {
                  "Federated": "arn:aws:iam::760144413534:oidc-provider/token.actions.githubusercontent.com"
              },
              "Action": "sts:AssumeRoleWithWebIdentity",
              "Condition": {
                  "StringEquals": {
                      "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
                      "token.actions.githubusercontent.com:sub": "repo:Gatika-CL/lotus:ref:refs/heads/main"
                  }
              }
          }
      ]
  }
  POLICYNAMES     lotus-deploy-ssm
  ATTACHEDPOLICIES        arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore    AmazonSSMManagedInstanceCore
      agente ainda nao respondeu (estado: None) — esperando ate 300s
      (… a mesma linha, dez vezes no total …)
  PingStatus de i-0789e30d781790dd4: Online

  secret AWS_DEPLOY_ROLE_ARN = arn:aws:iam::760144413534:role/lotus-deploy
  secret AWS_INSTANCE_ID     = i-0789e30d781790dd4
  ```

  Conferência da sessão: `sub` fixado em `repo:Gatika-CL/lotus:ref:refs/heads/main`, **sem
  curinga**; `aud` em `sts.amazonaws.com`; `lotus-deploy-ssm` é a única inline da `lotus-deploy`;
  `AmazonSSMManagedInstanceCore` anexada à `lotus-ec2`; `PingStatus … Online`. O provider OIDC **já
  existia** na conta e o script mediu a audiência em vez de presumi-la.
- **`gh secret list --repo Gatika-CL/lotus`:**

  ```text
  NAME                 UPDATED
  AWS_DEPLOY_ROLE_ARN  less than a minute ago
  AWS_INSTANCE_ID      about 1 minute ago
  ```

  Nome e data, nunca valor, como tem de ser.
- **Agente SSM:** o agente já vinha instalado no host, mas estava fora do inventário do SSM porque a
  `lotus-ec2` não tinha permissão. Ficou `Online` sozinho depois que a política foi anexada, após dez
  ciclos de espera. **O Step 3 não foi necessário**, e por isso `deploy/aws/user-data.sh` não foi
  emendado.

## Task 9 — deploy manual, cadeado e dump

Executada pelo João em 2026-09-24/25, por SSH com `-i ~/.ssh/lotus-prod.pem` (a chave padrão da
máquina é recusada pelo host).

**Step 1 — scripts no host:**

```text
-rwxr-x--- 1 root root 3482 Sep 25 02:41 backup-db.sh
-rwxr-x--- 1 root root 7891 Sep 25 02:41 deploy.sh
```

Só dois: o `verificar-backup.sh` **não estava no host** — ver o achado abaixo.

**Step 2 — promover o SHA já em produção (`a5fc92bb7728ea0da6dc16a62958e02556df999b`):** login,
manifestos, pull do trio, `==> gate de schema` sem recusa, `Nothing to migrate.`, `up`, nginx
healthy, `==> DEPLOY OK: a5fc92bb7728ea0da6dc16a62958e02556df999b`. Nenhum dump. Efeito colateral
observado: o `lotus-gotenberg-1` foi **recriado** — `gotenberg/gotenberg:8` é tag móvel, e o pull
trouxe um digest novo. Promover o mesmo SHA não é, portanto, um no-op estrito fora do trio.

**Step 3 — ledger (DoD 3):**

```text
{"ts":"2026-09-25T02:42:21Z","evento":"inicio","sha":"a5fc92bb7728ea0da6dc16a62958e02556df999b","sha_anterior":"a5fc92bb7728ea0da6dc16a62958e02556df999b","migrations":[],"dump":null,"ator":"manual:root"}
{"ts":"2026-09-25T02:42:27Z","evento":"fim","sha":"a5fc92bb7728ea0da6dc16a62958e02556df999b","resultado":"ok","etapa":"ok"}
---
a5fc92bb7728ea0da6dc16a62958e02556df999b
```

`sha_anterior` = `sha`, `migrations` vazio, `"dump": null` declarado, ator `manual:root`, fecho
`ok/ok`, `CURRENT_SHA` batendo.

**Step 4 — cadeado:** o comando do plano ganhou um `wait` no fim, para o SSH não encerrar o deploy
em background. Trecho decisivo, com as duas saídas intercaladas:

```text
==> login ghcr.io
==> manifestos de a5fc92bb7728ea0da6dc16a62958e02556df999b
erro: outro deploy ja esta rodando (pid 2036654)
codigo=3
==> pull
…
==> DEPLOY OK: a5fc92bb7728ea0da6dc16a62958e02556df999b
```

**Step 5 — a chave do dump pelo arquivo:**

```text
backup ok: s3://lotus-prod-760144413534/backups/lotus-2026-09-25T02-43.sql.gz
---
s3://lotus-prod-760144413534/backups/lotus-2026-09-25T02-43.sql.gz
```

A mesma URI no stdout e, sozinha, no arquivo de `LOTUS_BACKUP_SAIDA`.

### Achado herdado do item 10 — a detecção do backup não existia em produção

O `verificar-backup.sh` do Step 5 respondeu `command not found`. Medido em seguida, host e conta:

- `crontab -l` do root só tinha a linha das 06:10 (`backup-db.sh`); a das 06:40 não existia;
- `sns list-topics` vazio **em todas as regiões**; a `lotus-ec2` só tinha a inline `lotus-s3`;
- instalado o script, ele recusou: `erro: LOTUS_ALERT_TOPIC_ARN ausente do .env — sem canal nao ha aviso`.

Causa: o runbook §10 criava o tópico SNS junto com o billing alarm; o item 10 (evidência §8)
trocou o alarme por AWS Budgets, que manda e-mail direto, e o tópico nunca nasceu. O e-mail de
custo que o João recebe é do Budgets `lotus-prod-teto`, subscriber `EMAIL` — nada a ver com SNS.
A produção fazia backup todo dia (`lotus-backup.log`: 22, 23 e 24/09 `backup ok`), mas **nada
avisaria se parasse**, e o gatilho de reversão do ADR-09 ficava sem detecção.

**Decisão do João (2026-09-24): pagar dentro do item 12**, porque o DoD 6 da spec exige o
verificador aprovando. Executado por ele:

```text
arn:aws:sns:sa-east-1:760144413534:lotus-alertas
email   arn:aws:sns:sa-east-1:760144413534:lotus-alertas:16af7e17-211a-4147-87d7-4b0891408283

POLICYNAMES     lotus-alerta
POLICYNAMES     lotus-s3
{ "Effect": "Allow", "Action": "sns:Publish",
  "Resource": "arn:aws:sns:sa-east-1:760144413534:lotus-alertas" }

LOTUS_ALERT_TOPIC_ARN=arn:aws:sns:sa-east-1:760144413534:lotus-alertas
600 root

backup ok: o mais recente tem 0d (limite 2d) — 2026-09-25T02:43:51+00:00
codigo=0
Lotus: o backup mais recente de s3://lotus-prod-760144413534/backups/ tem 0 dias (limite -1). Ultimo: 2026-09-25T02:43:51+00:00. Aos 7 dias o gatilho de reversao do ADR-09 dispara.
codigo=1

10 6 * * * /opt/lotus/bin/backup-db.sh >> /var/log/lotus-backup.log 2>&1
40 6 * * * /opt/lotus/bin/verificar-backup.sh >> /var/log/lotus-backup.log 2>&1
```

A subscription saiu de `pending confirmation` para um ARN (confirmada pelo link do e-mail). O
alerta forçado saiu 1 **sem** a linha `erro: o alerta NAO saiu`, isto é, o `sns publish` passou;
e o e-mail "Lotus: backup do banco de producao" chegou à caixa do João (confirmado por ele em 2026-09-25). O tópico vive em `sa-east-1`, não em `us-east-1`: a
região só existia por causa do billing alarm. O runbook §4/§9/§10 e o `env.prod.example` foram
corrigidos no mesmo commit.

## Task 10 — rollback recusado (DoD 5), por linha-sentinela

**Por que sentinela, e não o roteiro do plano.** Medido em 2026-09-25 com `docker manifest inspect`
contra o GHCR corporativo: o `a5fc92bb` é o **primeiro** SHA com o trio; `683e6221`, `d0d8db50` e
`3d158773` têm só `app`+`web`, `ccaacacf` não tem nada. E nenhum SHA, em nenhum dos dois
repositórios, passa das 30 migrations que a produção tem. Não havia como "promover um SHA com
migration a mais" (Step 3). Decisão do João: provar a recusa com uma linha-sentinela na tabela
`migrations` — o gate lê a tabela literalmente —, e levar a metade do DoD 6 que exige migration
real para a **P-86**. Emenda registrada no fim do plano.

Executado pelo João, por SSH, com `docker exec -i lotus-mysql-1 mysql` recebendo o SQL por stdin:

```text
# antes
30      1                      <- COUNT(*), MAX(batch) de migrations
200
a5fc92bb7728ea0da6dc16a62958e02556df999b
{"ts":"2026-09-25T02:43:41Z","evento":"fim","sha":"a5fc92bb7728ea0da6dc16a62958e02556df999b","resultado":"ok","etapa":"ok"}

# INSERT ('2099_01_01_000000_sonda_rollback_recusado', 999)
31

# deploy.sh a5fc92bb7728ea0da6dc16a62958e02556df999b
==> login ghcr.io
==> manifestos de a5fc92bb7728ea0da6dc16a62958e02556df999b
==> pull
…
==> gate de schema
erro: o banco esta A FRENTE de a5fc92bb7728ea0da6dc16a62958e02556df999b — a imagem alvo nao conhece:
  2099_01_01_000000_sonda_rollback_recusado
restaure o dump da release que as introduziu (procure em /opt/lotus/releases.jsonl) e so entao promova.
codigo=4

# DELETE da sentinela, depois
30
200
a5fc92bb7728ea0da6dc16a62958e02556df999b
{"ts":"2026-09-25T02:43:41Z","evento":"fim","sha":"a5fc92bb7728ea0da6dc16a62958e02556df999b","resultado":"ok","etapa":"ok"}
```

O que isto prova: a recusa sai com **código 4**, **nomeia** a migration que a imagem alvo não
conhece, e a produção **não se mexeu** — `/up` 200, `CURRENT_SHA` igual e a última linha do ledger
idêntica à de antes: o gate recusa antes de escrever o `inicio`, então a tentativa recusada não
deixa rastro no ledger (só no stdout de quem rodou).

**O que isto NÃO prova — divergência spec × plano achada aqui.** A spec (§6 e DoD 5) pede que a
recusa *imprima, do ledger, a chave do dump da release que as introduziu*. O plano (Task 2) trocou
isso por uma dica textual — `procure em /opt/lotus/releases.jsonl` —, e é o que o `deploy.sh`
faz. A troca não foi declarada como desvio. Com a sentinela, de qualquer modo, não haveria chave a
imprimir: nenhuma release a introduziu.

**Decisão do João (2026-09-25): corrigir o `deploy.sh`, não emendar a spec.** Commit `3154b6bb`,
por TDD: três asserções novas em `deploy-sh.test.ts` falharam primeiro; depois a função
`dump_que_introduziu()` passou a ler do ledger o `dump` da **última** linha `inicio` que registrou
cada migration à frente, e a recusa lista migration e chave lado a lado. O João reinstalou o script
no host e repetiu a sentinela (`2026-09-26T02:32Z`):

```text
# sha256sum /opt/lotus/bin/deploy.sh
ae6686fd7f139ecdaa48b007f4fbbae93c5da3254877a3e9a1992953a2562ffc  /opt/lotus/bin/deploy.sh

# INSERT ('2099_01_01_000000_sonda_rollback_recusado', 999)
31

# deploy.sh a5fc92bb7728ea0da6dc16a62958e02556df999b
==> login ghcr.io
==> manifestos de a5fc92bb7728ea0da6dc16a62958e02556df999b
==> pull
…
==> gate de schema
erro: o banco esta A FRENTE de a5fc92bb7728ea0da6dc16a62958e02556df999b — a imagem alvo nao conhece:
  2099_01_01_000000_sonda_rollback_recusado  (dump anterior: nenhum registrado no ledger)
restaure o dump da PRIMEIRA linha — a migration mais antiga — e so entao promova.
codigo=4

# DELETE da sentinela, depois
30
200
a5fc92bb7728ea0da6dc16a62958e02556df999b
{"ts":"2026-09-25T02:43:41Z","evento":"fim","sha":"a5fc92bb7728ea0da6dc16a62958e02556df999b","resultado":"ok","etapa":"ok"}
```

Conferido em seguida, só por leitura: 30 migrations e nenhuma `2099%`; o ledger com as mesmas 4
linhas e 656 bytes; os seis containers ainda no `a5fc92bb`, sem recriação. O hash é o do
`deploy/bin/deploy.sh` da `main` (`65d81bc9`).

A busca tolera ausência: sem linha `inicio` que registre a migration — o caso da sentinela, que
nenhuma release introduziu —, a recusa diz `nenhum registrado no ledger` em vez de o `pipefail`
matar o script antes de ela explicar. **O ramo que acha uma chave de verdade não rodou em
produção.** Ele rodou numa sonda local: a função extraída do script, sob `set -euo pipefail`,
contra um ledger de mentira. Release refeita devolveu o dump mais recente, `x` não casou `x_y` e
ledger vazio sobreviveu. Esse ramo depende de um deploy com migration e fica na **P-86**, junto
com o dump pré-deploy.

**O DoD 4, o rollback limpo, rodou depois do botão.** Voltar pede uma release anterior com o trio,
e antes do Step 1 da Task 12 só existia o `a5fc92bb` (emenda, item 4). A evidência está na Task 12,
em *Task 10, DoD 4 — o rollback limpo, por SSH*.

## Task 11 — integração

**A `main` andou duas vezes durante a task**: o item 28 (hooks do harness, PR #106) e o item 29
(PR #107). As duas entraram por merge (`d8ab36cb` e `418bc5aa`). Nas duas a pendência nova deste
bloco colidiu com uma do item mesclado e foi renumerada, de P-82 para P-85 e depois para **P-86**
(precedente `52187e0f`). No `state.md` mesclado o foco ficou na `lane-b`, com os campos do topo
espelhando-a; os commits de merge dizem por quê. A suíte da árvore integrada (Step 1) fechou com
858 testes, lint e build verdes.

| Passo | Onde | Resultado |
| --- | --- | --- |
| PR | [#108](https://github.com/Andred21/lotus/pull/108), head `418bc5aa` | gates do `pull_request` verdes no [run 36209218583](https://github.com/Andred21/lotus/actions/runs/36209218583): backend, frontend, types-drift, audit-dev e audit-prod; `procedencia` e `image` pulados, como previsto em PR |
| merge na `main` | `65d81bc966225c6ea66358f7e770d2285e0bc8d6` (2026-09-26T01:43:01Z) | CI de `push` no [run 36209358167](https://github.com/Andred21/lotus/actions/runs/36209358167): os 7 jobs verdes, `image` incluído |
| espelho | `1142911b26430466522bab0be2a87b0e32c4952b` em `Gatika-CL/lotus`, trailer `Source-Commit: 65d81bc966225c6ea66358f7e770d2285e0bc8d6` | CI corporativo no [run 36211051513](https://github.com/Gatika-CL/lotus/actions/runs/36211051513): os 7 jobs verdes (02:14:26Z → 03:01:06Z). O `image` publicou `lotus-app` (`sha256:8c009eca…`), `lotus-web` (`sha256:636d68f3…`) e `lotus-clamav` (`sha256:80d2a658…`), e o passo *O conjunto existe no GHCR* confirmou os três. Levou 42 min, 39 deles no alvo `app`, que não reaproveitou nenhuma camada do cache |

**O CI da `main` estava vermelho desde 2026-09-09.** O último `push` verde antes deste bloco era o
`e9c0850b` (2026-09-02). Do `618f390a` em diante o `audit-dev` reprovava e o `image` era pulado,
e o espelho recusa commit sem CI verde. O item 29 trouxe o vitest 4.1.11 (`03eff0fd`,
GHSA-82fw-gwwq-j7x9), e o `9664faf5` foi o primeiro verde. Sem ele, o espelho recusaria o
`65d81bc9`.

**Espelho.** A simulação (`--simular`) e a publicação deram a mesma árvore,
`d1bab4c7326ffa80d9494b21d1ec70fcc0be6332` (`upstream/main^{tree}`): 1354 dos 1685 arquivos do
`65d81bc9`. Conferido na árvore publicada:

- dentro: `.github/workflows/deploy.yml`, `deploy/aws/criar-oidc-e-role.sh`, `deploy/bin/deploy.sh`
  e as quatro catracas que a PR tocou (`criar-oidc-role`, `workflow-deploy`, `deploy-sh` e
  `backup-db`);
- fora: `docs/`, `.claude/`, `.agents/` e `frontend/tests/repo-docs-refs.test.ts`.

As catracas passaram no CI corporativo, porque leem só `deploy/` e `.github/`. O job `frontend`
fechou 134 arquivos e 842 testes, com `criar-oidc-role` (10), `workflow-deploy` (15), `deploy-sh`
(22) e `backup-db` (14). A diferença para os 858 daqui é o `repo-docs-refs.test.ts`, o único
arquivo de teste que o `.espelho-exclusoes` segura: 135 arquivos aqui, 134 lá.

**O botão.** `gh workflow list` mostra *Promover para producao* `active` nos dois repositórios,
com o mesmo blob (`34ea8f9f`). A guarda de dono, que deixa o job `skipped` no pessoal, se mede
na Task 12, Step 6.

### Antes do botão — o que o SHA novo leva e o que o host guardava por cópia

**O item 29 vai junto.** O `1142911b` leva para a produção o item 29, além deste. Sem
`CERTIFICATE_VALIDATION_URL` em https (ela fica vazia até o registro A, P-77), a produção passa a
recusar emitir e baixar certificado, com 500 e a razão no `detail` (runbook §7). Nenhum
certificado sai da produção até a §11. **Aceito pelo João em 2026-09-25.**

**Os arquivos que o host guarda por cópia estavam defasados.** O `deploy.sh` promove imagens; os
arquivos de compose e o `tls.conf` chegam ao host por cópia manual (runbook §7), e três correções
do review do item 10 nunca tinham chegado lá. Lido por SSH em 2026-09-26T02:30Z:

| Arquivo no host | Hash no host | Versão de | Faltava |
| --- | --- | --- | --- |
| `docker-compose.prod.yml` | `bb43533584bdb497…` | `a5fc92bb` = `db8f8736` | `f9b56707`: o healthcheck do clamav pergunta também a idade da base. Sem ele, base congelada seguia verde, e o antivírus falhava aberto (Q-9) |
| `docker-compose.prod-tls.yml` | `f33411fc6646caed…` | `53ca6ce7` | `74c27652`: webroot do ACME por bind mount do host; sem ele a renovação do certificado não acontece (Q-6) |
| `nginx/tls.conf` | `fef8107ba8894aca…` | `53ca6ce7` | `83e39132`: o `/up` fica fora do redirect 80→443; sem ele, no dia do registro A, o healthcheck do nginx e o gate pós-deploy do `deploy.sh` quebram no 301 (Q-1) |

O João sincronizou os três na mesma instalação do `deploy.sh` corrigido (02:32:33Z). Os quatro
hashes batem com a `main` (`65d81bc9`): `ae6686fd…`, `734d2892…`, `f3b1d0b8…` e `4e9a76e8…`.

- Nada foi recriado. O compose novo só vale no próximo `up`, que é o do botão. A sentinela
  (02:32:49Z) rodou logo depois e parou no gate, com o `compose pull` já lendo o compose novo sem
  erro.
- O overlay TLS segue inerte. O `deploy.sh` só o inclui quando `/etc/letsencrypt/live` existe, e
  a pasta não existe. `/opt/lotus/certbot` (§7) também não existe; a §11 o cria antes da emissão
  por webroot.
- O rollback da Task 10 (`1142911b` → `a5fc92bb`) vai rodar a imagem velha sob o compose novo. A
  imagem clamav dos dois SHAs difere só por um comentário no `docker/clamav/entrypoint.sh`, então
  o healthcheck novo vale para as duas.

**O `.env` do host também estava atrás do molde.** Antes do botão, conferi o que o SHA novo exige
no boot, e não há nada novo: `docker/php`, `bootstrap/` e os providers são os mesmos do
`a5fc92bb`, a URL de validação só é cobrada ao emitir ou baixar, e as migrations são as mesmas 30.
Mas o `.env` do host, criado em 2026-09-04, não tinha 10 das 40 chaves que o Q-2 do review do item
10 pôs no molde em 2026-09-20 (`83e39132`). Comparei só os nomes, nunca os valores:

| Chave ausente | Efeito |
| --- | --- |
| `APP_LOCALE`, `APP_FALLBACK_LOCALE` | locale `en` por default, e o ADR-15 manda `es-CL`: requisição sem `Accept-Language` (QR público, job, notificação, artisan) responde em inglês |
| `SESSION_SECURE_COOKIE` | null, que em HTTP equivale a `false`; mas o passo 2 da §11 manda trocar `false` por `true` numa chave que não existia |
| `SESSION_LIFETIME`, `SESSION_ENCRYPT`, `SESSION_PATH`, `SESSION_SAME_SITE`, `CERTIFICATE_ISSUER_NAME`, `CERTIFICATE_ISSUER_RUT` | defaults que coincidem com o molde, por coincidência e não por decisão |
| `CERTIFICATE_VALIDATION_URL` | a recusa do item 29, já aceita |

**Decisão do João (2026-09-26): completar antes do botão.** Às 02:43:54Z ele acrescentou, por
`tee -a`, as 10 chaves com os valores do molde para a fase sem DNS (`APP_LOCALE=es_CL`,
`SESSION_SECURE_COOKIE=false`, `CERTIFICATE_VALIDATION_URL` vazia). Saída: `permissao 600 root`,
`duplicadas 0`, `chaves 40`. Conferido em seguida: o conjunto de nomes do host é igual ao do
molde, sem sobra de nenhum lado. Os containers só leem o `.env` ao nascer, então a mudança entra
com o `up` do botão.

**O botão vai recriar o `mysql`.** Lido às 02:40Z, antes da mudança acima: com os arquivos de hoje
e o **mesmo** SHA, o hash de configuração do compose já não batia com o dos containers em quatro
serviços. Em `app`, `scheduler` e `mysql`, porque os três leem o `.env` por `env_file` e ele mudou
em 2026-09-25T03:01Z com o ARN do SNS (Task 9); em `clamav`, pelo healthcheck novo. `nginx` e
`gotenberg` batiam. Então o `up -d` do botão reinicia o `mysql` por alguns segundos, com ou sem as
chaves do Q-2, e o volume `mysql-data` fica.

A causa comum dos dois desvios fica na **P-87**: o botão promove imagens, e nada compara com o SHA
promovido o que o host guarda por cópia. A spec não declarava isso entre os limites (§12).

Sobra achada no host: `/opt/lotus/prova-certificado.php` (`ubuntu:ubuntu`, 2026-09-10), que
nenhum arquivo do repositório cita. Ficou intocado; a decisão é do João.

## Task 12 — o botão ao vivo

### Step 1 — a promoção do `1142911b` (DoD 1)

**O primeiro disparo parou na AWS, antes de qualquer `send-command`.** Foi o run `36223231264`
(2026-09-26T06:15:56Z), que depois saiu do histórico da Actions (a API responde 404); o trecho
abaixo foi lido antes disso. Os três gates passaram, e o `configure-aws-credentials` falhou nas 12
tentativas:

```text
compare main...1142911b26430466522bab0be2a87b0e32c4952b = identical
ci.yml em 1142911b26430466522bab0be2a87b0e32c4952b = success
trio presente para 1142911b26430466522bab0be2a87b0e32c4952b
Assuming role with OIDC
(… a mesma linha, 12 vezes no total …)
##[error]Could not assume role with OIDC: Request ARN is invalid
```

*Quem eu sou na AWS* e *deploy.sh no host, por SSM* foram pulados. O host não recebeu nada:
`CURRENT_SHA` seguiu em `a5fc92bb`, o ledger ficou sem linha nova e `aws ssm list-commands` veio
vazio.

**Defeito 1: o secret `AWS_DEPLOY_ROLE_ARN` não era um ARN válido.** A action só chega ao STS
quando o valor começa com `arn:aws`, e o STS recusou o formato. O valor gravado na Task 8
(2026-09-25T00:18:04Z) não é legível, então a causa exata fica desconhecida. O João regravou os
dois secrets com `--body` e o literal do readback da Task 8: `AWS_DEPLOY_ROLE_ARN` às 06:36:47Z e
`AWS_INSTANCE_ID` às 06:36:48Z. O segundo foi por precaução, porque tinha sido gravado do mesmo
jeito.

**Defeito 2: a trust nunca aceitaria um token do corporativo.** Foi achado por leitura, não pelo
run, que parou antes. Repositório criado depois de 2026-07-15 emite o `sub` imutável do GitHub,
com os IDs do dono e do repositório, e o `Gatika-CL/lotus` nasceu em 2026-08-25. A API de OIDC do
repositório confirma:

```text
gh api repos/Gatika-CL/lotus/actions/oidc/customization/sub
{"use_default":true,"use_immutable_subject":true,"sub_claim_prefix":"repo:Gatika-CL@310231788/lotus@1345572200"}
```

O job não declara `environment:`, então o `sub` é
`repo:Gatika-CL@310231788/lotus@1345572200:ref:refs/heads/main`, e a trust exigia
`repo:Gatika-CL/lotus:ref:refs/heads/main`. O `5dee48ab` pôs os IDs no default de `LOTUS_REPO`,
com a catraca `criar-oidc-role` cobrando o literal (vermelha antes, verde depois). O João
reexecutou o script, e o readback trouxe o `sub` novo, `lotus-deploy-ssm`,
`AmazonSSMManagedInstanceCore` e `PingStatus … Online`. Lida às 06:34Z, a trust já exigia o `sub`
novo.

A intenção da spec (§9) continua a mesma: igualdade, `main` e nenhum curinga. Só o literal muda.
O ID ainda fecha o que o nome deixava aberto, porque um repositório recriado com o mesmo nome não
herda a trust. Até esta branch entrar na `main`, o script da `main` (`65d81bc9`) grava o `sub`
antigo, e reexecutá-lo de lá desfaria a correção.

**O segundo disparo passou.** [Run 36224456257](https://github.com/Gatika-CL/lotus/actions/runs/36224456257),
às 06:40:20Z, levou 1 min 38 s, e o passo do `deploy.sh` levou 74 s:

```text
compare main...1142911b26430466522bab0be2a87b0e32c4952b = identical
ci.yml em 1142911b26430466522bab0be2a87b0e32c4952b = success
trio presente para 1142911b26430466522bab0be2a87b0e32c4952b
{
    "UserId": "AROA3B7BDINPDTPIY4QR5:GitHubActions",
    "Account": "760144413534",
    "Arn": "arn:aws:sts::760144413534:assumed-role/lotus-deploy/GitHubActions"
}
CommandId=325ee162-2502-420d-8b4f-896cb179ffff
----- stdout do host -----
==> login ghcr.io
==> manifestos de 1142911b26430466522bab0be2a87b0e32c4952b
==> pull
==> gate de schema
==> migrate
   (… os três caches do entrypoint …)
   INFO  Nothing to migrate.
==> up
==> esperando o nginx ficar healthy (até 150 s)
==> DEPLOY OK: 1142911b26430466522bab0be2a87b0e32c4952b
estado final: Success
```

**Conferido por leitura às 06:43Z:**

- `/up` responde 200 de fora (`http://18.230.53.197/up`) e de dentro, e o `CURRENT_SHA` é
  `1142911b…`.
- O ledger registra o ator do botão:

  ```text
  {"ts":"2026-09-26T06:41:04Z","evento":"inicio","sha":"1142911b26430466522bab0be2a87b0e32c4952b","sha_anterior":"a5fc92bb7728ea0da6dc16a62958e02556df999b","migrations":[],"dump":null,"ator":"github:36224456257:Andred21"}
  {"ts":"2026-09-26T06:41:45Z","evento":"fim","sha":"1142911b26430466522bab0be2a87b0e32c4952b","resultado":"ok","etapa":"ok"}
  ```

- A imagem de cada container é o digest que o CI corporativo publicou: `app` e `scheduler` em
  `8c009eca…`, `nginx` em `636d68f3…` e `clamav` em `80d2a658…`. `nginx` e `clamav` estão
  `healthy`, o `clamav` já com o healthcheck novo (Q-9).
- A recriação saiu como a Task 11 previu. O `compose run` do migrate recriou `mysql` e `clamav`, o
  `up` recriou `app`, `nginx` e `scheduler`, e o `gotenberg` seguiu `Running`. O `mysql` voltou
  `healthy` na mesma imagem (`7dcddc01…`, a única no host, MySQL 8.0.46), cujo digest já estava
  fixado no compose do `a5fc92bb`.
- O `app.locale` efetivo é `es_CL` (Q-2).

### Task 10, DoD 4 — o rollback limpo, por SSH

Às 06:48Z o João voltou a produção do `1142911b` para o `a5fc92bb` com o comando da Task 10,
Step 2. Os dois SHAs têm as mesmas 30 migrations, então o banco não fica à frente de nenhum deles.
Trecho da saída:

```text
ssh … 'sudo /opt/lotus/bin/deploy.sh a5fc92bb7728ea0da6dc16a62958e02556df999b; echo "codigo=$?"'
==> login ghcr.io
==> manifestos de a5fc92bb7728ea0da6dc16a62958e02556df999b
==> pull
(…)
==> gate de schema
(…)
==> migrate
 Container lotus-mysql-1 Running
 Container lotus-gotenberg-1 Running
 Container lotus-clamav-1 Recreate
(…)
   INFO  Nothing to migrate.
==> up
(…)
 Container lotus-app-1 Recreate
(…)
 Container lotus-nginx-1 Recreate
 Container lotus-scheduler-1 Recreate
(…)
==> esperando o nginx ficar healthy (até 150 s)
==> DEPLOY OK: a5fc92bb7728ea0da6dc16a62958e02556df999b
```

A linha `codigo=` não veio na colagem. O código 0 fica provado pelo ledger: o trap `ao_sair` só
grava `"resultado":"ok"` quando o script sai com 0.

**Conferido por leitura às 06:49Z:**

- `/up` responde 200 de fora e de dentro, e o `CURRENT_SHA` é `a5fc92bb…`.
- O ledger fecha o par. O `sha_anterior` aponta para o release de onde se voltou, e o ator é o
  manual:

  ```text
  {"ts":"2026-09-26T06:48:08Z","evento":"inicio","sha":"a5fc92bb7728ea0da6dc16a62958e02556df999b","sha_anterior":"1142911b26430466522bab0be2a87b0e32c4952b","migrations":[],"dump":null,"ator":"manual:root"}
  {"ts":"2026-09-26T06:48:41Z","evento":"fim","sha":"a5fc92bb7728ea0da6dc16a62958e02556df999b","resultado":"ok","etapa":"ok"}
  ```

- `app`, `scheduler`, `nginx` e `clamav` voltaram às imagens do `a5fc92bb`. O `mysql` e o
  `gotenberg` ficaram, porque a configuração deles não depende do SHA, e o `mysql` já tinha nascido
  com o `.env` novo no Step 1.
- A imagem velha do `clamav` passou no healthcheck novo, como a Task 11 previu. O container nasceu
  às 06:48:19Z, e o healthcheck falhou duas vezes com código 21 (06:48:29Z e 06:48:34Z) enquanto o
  `clamd` carregava a base. Respondeu `PONG` a partir de 06:48:40Z, dentro do `start_period` de
  300 s.

### Step 2 — dois disparos seguidos, e o segundo esperou (DoD 2)

O João disparou o botão duas vezes, com dois segundos de intervalo, as duas com o `1142911b` e
`PROMOVER`. Era também a volta do rollback acima. A sessão leu a API a cada 3 s e registrou cada
mudança de estado:

```text
06:51:55 | 36225030524 queued
06:52:01 | 36225030524 queued ;36225032217 pending
06:52:08 | 36225030524 in_progress ;36225032217 pending
06:53:08 | 36225030524 completed success;36225032217 pending
06:53:11 | 36225030524 completed success;36225032217 in_progress
06:53:43 | 36225030524 completed success;36225032217 completed success
```

- [Run 36225030524](https://github.com/Gatika-CL/lotus/actions/runs/36225030524), o primeiro. O
  job `promover` correu de 06:52:04Z a 06:53:07Z, 48 s deles no passo do `deploy.sh`, e levou o
  host do `a5fc92bb` ao `1142911b`.
- [Run 36225032217](https://github.com/Gatika-CL/lotus/actions/runs/36225032217), o segundo. Ficou
  `pending` desde o disparo (06:51:57Z) até o fim do primeiro. O job dele só foi **criado** às
  06:53:08Z, um segundo depois do fim do job do primeiro, e correu até 06:53:42Z, 23 s deles no
  `deploy.sh`.
- Os dois terminaram `success`. Nenhum foi cancelado, e nenhum passo de um correu junto com
  passo do outro.

A API chama a espera de `pending`, e o plano a chamava de `Queued`; o comportamento é o mesmo. A
`concurrency` está declarada no workflow, não no job, e por isso segura o run inteiro antes de o
job existir.

Os dois logs repetem as linhas de gate e de identidade do Step 1 (`identical`, `success`,
`trio presente`, `assumed-role/lotus-deploy/GitHubActions`), passam pelo `Nothing to migrate` e
fecham com `DEPLOY OK: 1142911b…` e `estado final: Success`. O que muda é o que o compose fez em
cada um, no stderr do host:

```text
# 36225030524, CommandId=7a5a8877-5808-473f-8af5-56b094454f7e
 Container lotus-clamav-1 Recreate
(…)
 Container lotus-app-1 Recreate
(…)
 Container lotus-nginx-1 Recreate
 Container lotus-scheduler-1 Recreate

# 36225032217, CommandId=08c82013-6676-4e93-892d-57bafc26ff05
 Container lotus-clamav-1 Running
(…)
 Container lotus-scheduler-1 Running
(…)
 Container lotus-nginx-1 Running
(…)
 Container lotus-app-1 Running
```

**Conferido por leitura às 06:55Z:**

- O ledger tem os dois pares em sequência. O `inicio` do segundo (06:53:32Z) vem 33 s depois do
  `fim` do primeiro (06:52:59Z), e o `sha_anterior` dele já é o `1142911b`:

  ```text
  {"ts":"2026-09-26T06:52:32Z","evento":"inicio","sha":"1142911b26430466522bab0be2a87b0e32c4952b","sha_anterior":"a5fc92bb7728ea0da6dc16a62958e02556df999b","migrations":[],"dump":null,"ator":"github:36225030524:Andred21"}
  {"ts":"2026-09-26T06:52:59Z","evento":"fim","sha":"1142911b26430466522bab0be2a87b0e32c4952b","resultado":"ok","etapa":"ok"}
  {"ts":"2026-09-26T06:53:32Z","evento":"inicio","sha":"1142911b26430466522bab0be2a87b0e32c4952b","sha_anterior":"1142911b26430466522bab0be2a87b0e32c4952b","migrations":[],"dump":null,"ator":"github:36225032217:Andred21"}
  {"ts":"2026-09-26T06:53:37Z","evento":"fim","sha":"1142911b26430466522bab0be2a87b0e32c4952b","resultado":"ok","etapa":"ok"}
  ```

- O `CURRENT_SHA` é `1142911b…`, o `/up` responde 200 de fora e de dentro, e as imagens são os
  digests que o CI publicou (`8c009eca…`, `636d68f3…` e `80d2a658…`).
- `app`, `scheduler`, `nginx` e `clamav` nasceram entre 06:52:32Z e 06:52:41Z, no primeiro run. O
  segundo não recriou nada. O `mysql` roda desde 06:41:04Z (Step 1) e o `gotenberg` desde
  2026-09-25T02:42Z.
- O ledger tem 12 linhas: 6 `inicio`, 6 `fim` e nenhum `falha`.

**Limite, não medido: um terceiro disparo.** A doc do GitHub, lida em 2026-09-26, diz que o padrão
da `concurrency` (`queue: single`) guarda um só run `pending` por grupo: *"When a new job or
workflow run is queued, any existing `pending` job or workflow run in the same group is canceled
and replaced."* Com três disparos seguidos, o do meio seria cancelado sem rodar, e o terceiro
tomaria o lugar dele. O DoD 2 continua valendo, porque o run em andamento nunca é cancelado, e
deploy cortado no meio é o que a §8 da spec quer evitar. Mas "nenhum é cancelado" só vale para dois
disparos. A mesma doc descreve `queue: max`, que deixa até 100 runs esperando. Se o botão deve
enfileirar todo pedido ou deixar valer o último fica para a review.

### Step 5 — a conta não ganhou porta (DoD 7)

Lido pela sessão às 07:01Z, só com chamadas de leitura (perfil `lotus`), com o comando do plano. O
IP do João fica fora, como no `deploy/aws/README.md`:

```text
aws ec2 describe-security-groups --region sa-east-1 --filters Name=group-name,Values=lotus-web \
  --query 'SecurityGroups[0].IpPermissions[].[IpProtocol,FromPort,IpRanges[].CidrIp]' --output json
(o JSON da saída, aqui numa linha só)
[["tcp", 80, ["0.0.0.0/0"]], ["tcp", 22, ["<IP do João>/32"]], ["tcp", 443, ["0.0.0.0/0"]]]
```

São as três regras de sempre, e nada mais: nenhuma origem IPv6, nenhuma prefix list, nenhuma
referência a outro SG.

O DoD pede as mesmas regras *de antes do bloco*, e o estado de hoje sozinho não prova isso. O
histórico do CloudTrail em `sa-east-1` cobre 90 dias, desde 2026-06-28. Nele, o
`sg-0a0876fb2c66689c5` tem três eventos, todos de 2026-09-04:

- `CreateSecurityGroup` às 16:45:28Z;
- um único `AuthorizeSecurityGroupIngress` às 16:47:13Z, com exatamente as três regras acima;
- o `RunInstances` da EC2 às 16:49:40Z.

Nesses 90 dias, a região não tem nenhum `RevokeSecurityGroupIngress`, `ModifySecurityGroupRules`
nem outro `AuthorizeSecurityGroupIngress`. As regras são as de 2026-09-04, e o bloco, aberto em
2026-09-21, não mexeu nelas. A outra metade do DoD 7, o `get-caller-identity` com a `lotus-deploy`
assumida por OIDC, está no Step 1 e se repete nos dois runs do Step 2.

### Steps 3 e 4 — as recusas (DoD 8)

O João disparou as três recusas às 07:07:55Z, 07:08:22Z e 07:08:51Z, uma por vez, para nenhuma
cair na regra do run único na fila, descrita no Step 2. As três pararam no gate esperado, e todos os
passos seguintes saíram `skipped`, inclusive *deploy.sh no host, por SSM*:

| Step | Run | Entrada | Parou em |
|---|---|---|---|
| 3, sem `PROMOVER` | [36225841401](https://github.com/Gatika-CL/lotus/actions/runs/36225841401) | `1142911b…` e `promover` | *Formato do SHA e confirmacao* |
| 4a, fora da `main` | [36225864370](https://github.com/Gatika-CL/lotus/actions/runs/36225864370) | `65d81bc9…`, o SHA pessoal do `Source-Commit`, e `PROMOVER` | *O SHA esta na main deste repositorio* |
| 4b, sem CI verde | [36225886570](https://github.com/Gatika-CL/lotus/actions/runs/36225886570) | `ccaacacf…` e `PROMOVER` | *O CI daquele SHA terminou verde* |

As linhas do passo que falhou, na ordem do log:

```text
# 36225841401 (env do passo: SHA 1142911b26430466522bab0be2a87b0e32c4952b, CONFIRMAR promover)
erro: confirmar precisa ser exatamente PROMOVER
##[error]Process completed with exit code 1.

# 36225864370
erro: 65d81bc966225c6ea66358f7e770d2285e0bc8d6 nao esta na main (status inacessivel)
compare main...65d81bc966225c6ea66358f7e770d2285e0bc8d6 =
##[error]Process completed with exit code 1.

# 36225886570
erro: o CI de ccaacacf79a62e734ac2b722e34be4ce54ab1e91 nao esta verde (cancelled)
ci.yml em ccaacacf79a62e734ac2b722e34be4ce54ab1e91 = cancelled
##[error]Process completed with exit code 1.
```

- **4a:** o corporativo não tem o SHA pessoal, e o `compare` responde 404. O gate trata isso como
  `inacessivel` em vez de morrer antes de explicar, que é o caso descrito no comentário do passo.
- **4b:** a listagem do plano acha um só candidato. O `ci.yml` do corporativo tem 7 runs
  concluídos, todos de push, e só o do `ccaacacf` não terminou verde: o
  [run 33907874327](https://github.com/Gatika-CL/lotus/actions/runs/33907874327), `cancelled` na
  segunda tentativa. O passo anterior respondeu `compare main...ccaacacf… = behind`, então o SHA
  está na `main`, e quem o recusa é o gate do CI.

**O host não recebeu nada. Conferido por leitura às 07:10Z:** o `list-commands` do SSM para a
instância traz três comandos, os dos três botões verdes (`325ee162…` às 06:40:42Z, `7a5a8877…` às
06:52:17Z e `08c82013…` às 06:53:18Z), e nenhum depois. O ledger segue com as mesmas 12 linhas e
2016 bytes, o `CURRENT_SHA` é `1142911b…`, nenhum container foi recriado, e o `/up` responde 200
de fora e de dentro.

### Step 6 — a guarda de dono, no repositório público

[Run 36225909713](https://github.com/Andred21/lotus/actions/runs/36225909713), em
`Andred21/lotus`, disparado às 07:09:19Z com `1142911b…` e `PROMOVER`. O job `promover` saiu
`skipped`, com zero passos, pela guarda `if: github.repository == 'Gatika-CL/lotus'`. Nenhum passo
rodou, então nenhum `send-command` saiu do repositório público.

Mesmo sem a guarda, esse run não teria com que promover. O `gh secret list` do pessoal vem vazio, e
os dois secrets de deploy só existem no corporativo. Só os nomes foram lidos.

### Os runs do botão

| Step | Run | Repositório | Resultado |
|---|---|---|---|
| 1, primeiro disparo | `36223231264`, que saiu do histórico | corporativo | `failure` no `configure-aws-credentials` |
| 1 | [36224456257](https://github.com/Gatika-CL/lotus/actions/runs/36224456257) | corporativo | `success` |
| 2 | [36225030524](https://github.com/Gatika-CL/lotus/actions/runs/36225030524) | corporativo | `success` |
| 2 | [36225032217](https://github.com/Gatika-CL/lotus/actions/runs/36225032217) | corporativo | `success`, depois de esperar o anterior |
| 3 | [36225841401](https://github.com/Gatika-CL/lotus/actions/runs/36225841401) | corporativo | `failure`: confirmação errada |
| 4a | [36225864370](https://github.com/Gatika-CL/lotus/actions/runs/36225864370) | corporativo | `failure`: SHA fora da `main` |
| 4b | [36225886570](https://github.com/Gatika-CL/lotus/actions/runs/36225886570) | corporativo | `failure`: CI não verde |
| 6 | [36225909713](https://github.com/Andred21/lotus/actions/runs/36225909713) | pessoal | `skipped` |

## DoD da spec — onde cada um foi provado

| DoD (spec §13) | Onde | O que ficou provado |
|---|---|---|
| 1. o botão promove, e o `/up` responde 200 pelo EIP com os digests puxados | Task 12, Step 1 | tudo; os dois runs verdes do Step 2 repetem |
| 2. o segundo run espera | Task 12, Step 2 | tudo, com dois disparos; o terceiro disparo é limite anotado, não medido |
| 3. ledger coerente, e o `CURRENT_SHA` bate com o fecho | Task 9, Step 3; Task 12 | tudo: 12 linhas, 6 pares, ator `manual:root` e `github:<run>:<login>` |
| 4. rollback limpo | Task 12, *Task 10, DoD 4* | tudo |
| 5. rollback recusado, com as migrations e a chave do dump | Task 10 | a recusa com código 4 e o nome da migration, em produção, por sentinela; imprimir uma chave real depende de um deploy com migration e fica na **P-86** |
| 6. dump pré-deploy no S3 e no ledger; `"dump": null` sem migration | Task 9 | as seis linhas `inicio` declaram `"dump": null`, e o `verificar-backup.sh` aprova um dump; o dump de um deploy com migration pendente fica na **P-86** |
| 7. a `lotus-deploy` assumida por OIDC; o SG com as mesmas três regras | Task 12, Steps 1 e 5 | tudo |
| 8. recusa sem CI verde e sem `PROMOVER` | Task 12, Steps 3 e 4 | tudo, e também a recusa de SHA fora da `main` |
| 9. catracas vistas reprovar por sonda | Step 2 de cada task (RED nos `task-N-report.md` do ledger local); *Review de 2026-09-26* | o RED de cada task, que mostra a asserção falhando **sem o código novo**. Três delas **não** falhavam com o mecanismo desligado (Q-2 do review). Foram corrigidas, e as sondas estão abaixo |

## Review de 2026-09-26: correções dos sete achados

O João aprovou os sete. A revisão independente do Codex, pelo plugin, não rodou: bateu no limite
de uso (`You've hit your usage limit`).

### Q-2 e Q-3/Q-5: as sondas das catracas

Cada catraca nova ou reforçada foi rodada nos dois sentidos: verde no script corrigido e vermelha
sob a mutação que ela diz guardar. As mutações foram feitas numa cópia no scratchpad, e os scripts
foram restaurados em seguida. O `git status` saiu limpo nos scripts.

| Sonda | Antes do review | Depois |
|---|---|---|
| `exit 1` do gate de CI verde trocado por `echo aviso` | verde | vermelha: *o gate de CI verde tem mecanismo* |
| ramo `*)` do compare com a `main` trocado por aviso | verde | vermelha: *o gate de SHA na main aceita só identical e behind* |
| `compare` aceitando também `ahead` | verde | vermelha: mesma asserção |
| `\|\| true` na chamada do `backup-db.sh` | verde | vermelha: *tira o dump antes do migrate e aborta o deploy se ele falhar* |
| `set +e` antes da chamada do `backup-db.sh` | verde | vermelha: mesma asserção |
| `schema_a_frente` removido da linha `inicio` | (não existia) | vermelha: *o escape do gate fica no ledger* |
| busca do dump sem cortar `schema_a_frente` | (não existia) | vermelha: *a busca do dump ignora a lista schema_a_frente* |
| chave do dump de volta ao minuto | (não existia) | vermelha: *duas execuções no mesmo minuto não gravam na mesma chave* |
| `deploy.sh` sem o rótulo `pre-deploy-<sha>` | (não existia) | vermelha: *o dump do deploy leva o SHA na chave* |

**Q-3 também foi provado por comportamento, fora da catraca.** Extraí do script as funções
`json_lista` e `dump_que_introduziu` e a linha `ledger` do `inicio`, e rodei as três contra um
ledger falso:

```
antes do escape: [s3://b/backups/lotus-2026-09-30T10-00-00-pre-deploy-xxx.sql.gz]
{"ts":"2026-09-26T00:00:00Z","evento":"inicio","sha":"www","sha_anterior":"xxx","migrations":[],"schema_a_frente":["2026_09_30_000000_cria_coisa"],"dump":null,"ator":"manual:root"}
depois do escape: [s3://b/backups/lotus-2026-09-30T10-00-00-pre-deploy-xxx.sql.gz]
{"schema_a_frente":[]}
```

A mesma sonda, sem o `sed` que tira a lista antes da busca, imprime `depois do escape: []`. A linha
do escape, com `"dump": null`, virava a última e apagava a chave certa. Esse defeito nasceu da
própria correção do Q-3 e foi pego antes do commit.

A guarda do rótulo do `backup-db.sh` foi rodada em bash:

- aceita o rótulo vazio (cron), `pre-deploy-1142911b2643` e `antes-do-restore`;
- recusa `a/b`, `ABC`, `a b` e um rótulo com quebra de linha no meio.

O primeiro rascunho usava `printf | grep -qE`, e grep sem linha nenhuma sai 1. Ele recusaria o
cron.

### Q-1: ensaio do restore, na imagem da produção

`mysql:8.0@sha256:7dcddc01…` é o mesmo digest do `docker-compose.prod.yml`. O dump foi tirado com o
comando exato do `backup-db.sh`. O passo 4 do runbook §8.1.1 foi rodado literal. Depois do dump, a
release X criou a tabela `coisas`, registrou a migration e emitiu `LOT-2`:

```
passo 1: -- Dump completed on 2026-09-26  7:36:52
== banco a frente (release X aplicada, LOT-2 emitido depois do dump)
  tabelas: certificates coisas migrations
  migrations: 2026_01_01_000000_create_certificates 2026_09_30_000000_create_coisas
== restore INGENUO: gunzip | mysql por cima
  tabelas: certificates coisas migrations
  migrations: 2026_01_01_000000_create_certificates
  proximo migrate de X: ERROR 1050 (42S01) at line 1: Table 'coisas' already exists
== depois do DROP/CREATE + load
  tabelas: certificates migrations
  migrations: 2026_01_01_000000_create_certificates
  certificates: LOT-1
== passo 5
2026_01_01_000000_create_certificates
  proximo migrate de X: passa
  charset do database recriado: utf8mb4	utf8mb4_0900_ai_ci
== linha restore
{"ts":"2026-09-26T07:36:57Z","evento":"restore","dump":"s3://b/…-pre-deploy-….sql.gz","antes":"s3://b/…-antes-do-restore.sql.gz","ator":"manual:jvbat"}
```

- O restore por cima deixa a tabela órfã, e a tabela `migrations` passa a dizer que ela não existe.
  A próxima promoção para frente morre no `migrate`. Esse era o buraco do §8.1 anterior.
- O `LOT-2` sumiu. É a perda de dado que o §8.1.1 manda pesar antes de restaurar.

**O que o ensaio não prova:** os passos que dependem do host, como o `aws s3 cp` com a role da
EC2, o `compose stop` do projeto `lotus` e o cadeado contra o botão, não rodaram na produção. A
escrita remota na produção é do João. O primeiro restore real fica sendo a prova, e a P-86 já
espera um deploy com migration.

## Depois do fechamento — reinstalação dos scripts e primeiro disparo do `deploy.sh` novo (2026-09-26)

O review mudou `deploy.sh` e `backup-db.sh` (`19aeb734`) e disparou o gatilho da **P-87**. A ordem
seguida foi: merge (PR #109 e #110), CI verde, espelho, reinstalação no host, botão.

**Os três lados com os mesmos bytes**, conferidos às 08:41Z:

| | `deploy.sh` | `backup-db.sh` |
|---|---|---|
| host `/opt/lotus/bin/` (reinstalado pelo João, runbook §7) | `72fb8b358b52…` | `4d28a5273788…` |
| `origin/main` (`9f9ccb3a`) | igual | igual |
| `Gatika-CL/lotus` `df30a6bd` (espelho de `f79bf993`, PR #109) | igual | igual |

As permissões ficaram `-rwxr-x--- root root`, como antes. O `backup-db.sh` novo rodou à mão, como o
cron o chama, sem rótulo, e gravou `s3://lotus-prod-760144413534/backups/lotus-2026-09-26T08-41-18.sql.gz`,
com a chave até o segundo (Q-5). O `verificar-backup.sh` aprovou: `o mais recente tem 0d (limite 2d)`.

**O botão promoveu o `df30a6bd` com o `deploy.sh` novo.** Run
[36230831166](https://github.com/Gatika-CL/lotus/actions/runs/36230831166), `success`:

- o job assumiu `arn:aws:sts::760144413534:assumed-role/lotus-deploy/GitHubActions`; o `migrate`
  saiu `Nothing to migrate.`, e o script terminou em `==> DEPLOY OK: df30a6bdfbbf26f3b9fa9397eaeb9ff6071eb523`;
- `/up` responde 200 pelo EIP, e o `CURRENT_SHA` é `df30a6bd…`;
- `app`, `scheduler`, `nginx` e `clamav` rodam `ghcr.io/gatika-cl/lotus-*:df30a6bd…`, com `nginx` e
  `clamav` `healthy`;
- o ledger passou de 12 para 14 linhas, e a linha `inicio` já traz o campo `schema_a_frente` (Q-3),
  vazio no caso normal:

  ```text
  {"ts":"2026-09-26T08:47:46Z","evento":"inicio","sha":"df30a6bdfbbf26f3b9fa9397eaeb9ff6071eb523","sha_anterior":"1142911b26430466522bab0be2a87b0e32c4952b","migrations":[],"schema_a_frente":[],"dump":null,"ator":"github:36230831166:Andred21"}
  {"ts":"2026-09-26T08:48:12Z","evento":"fim","sha":"df30a6bdfbbf26f3b9fa9397eaeb9ff6071eb523","resultado":"ok","etapa":"ok"}
  ```

O release não tinha migration nova, então o dump pré-deploy com o rótulo `pre-deploy-<sha>` ainda
não rodou em produção. Isso segue na **P-86**.
