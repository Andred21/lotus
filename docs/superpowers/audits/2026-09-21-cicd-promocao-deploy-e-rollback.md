# Evidências — `cicd-promocao-deploy-e-rollback` (item 12)

Plano: [`plans/2026-09-21-cicd-promocao-deploy-e-rollback.md`](../plans/2026-09-21-cicd-promocao-deploy-e-rollback.md)

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
