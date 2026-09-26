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
real para a **P-82**. Emenda registrada no fim do plano.

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
