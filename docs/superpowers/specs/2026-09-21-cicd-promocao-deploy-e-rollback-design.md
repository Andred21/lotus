# Spec — `cicd-promocao-deploy-e-rollback` — 2026-09-21

> Item 12 do backlog, estacionado em 2026-08-26 por falta de alvo e desestacionado pelo item 10 v2
> (`cff022d4`), que entregou a produção em `sa-east-1`. Nasce do brainstorming com o João em
> 2026-09-21, sobre o Context Packet `2026-09-20-cicd-promocao-deploy-e-rollback.md`
> (`status: partial`). As duas lacunas externas do packet foram fechadas depois dele e estão
> registradas na §1.3 — esta spec não herda nenhuma delas como incógnita.

## 1. Contexto

### 1.1 O que já existe

- **Artefato imutável por SHA.** O job `image` do `ci.yml` publica o trio `lotus-app`, `lotus-web`
  e `lotus-clamav` como manifest list `amd64+arm64`, só depois de `backend`, `frontend`,
  `types-drift`, `audit-prod`, `audit-dev` e `procedencia`, e recusa sobrescrever um conjunto
  completo que já exista para aquele SHA.
- **Produção de pé.** EC2 `t4g.small` em `sa-east-1`, EIP `18.230.53.197`, runtime em `/opt/lotus`
  (`750 root:root`), instance profile `lotus-ec2`, SG `lotus-web` com `22/tcp` restrito ao `/32` do
  João. `/up` 200 provado.
- **Deploy versionado.** `deploy/bin/deploy.sh <sha>` faz `login → manifest inspect ×3 → pull →
  migrate → up → nginx healthy → /up 200 → confere digest puxado contra digest rodando →
  `CURRENT_SHA`. Não faz build, não faz `git pull`, não tem working tree no host.
- **Backup provado.** `deploy/bin/backup-db.sh` (cron do host) e `verificar-backup.sh`, com
  lifecycle de 30 dias no S3.

### 1.2 O que falta — e é isto que o bloco entrega

Duas coisas, e só duas:

1. **Promoção remota governada.** Hoje o deploy é `ssh` do João e `sudo deploy.sh <sha>`. Não há
   botão, não há registro de quem promoveu, não há serialização, e nada impede promover um SHA que
   nunca passou pela CI.
2. **Rollback auditável.** Hoje o rollback é "rodar de novo com o SHA anterior", o SHA anterior não
   está registrado em lugar nenhum (só o corrente, em `CURRENT_SHA`), e o cabeçalho do `deploy.sh`
   declara em texto que migration incompatível é limite aberto — literalmente adiado para este bloco.

### 1.3 As duas lacunas do packet, fechadas

O packet saiu `partial` com quatro fontes `unavailable`. Ambas as lacunas foram medidas depois,
nesta sessão, e nenhuma sobrou como suposição:

- **Google Drive** (`DRIVE-AWS`, `DRIVE-ADR`, `DRIVE-SETUP`) — o Codex headless não alcança o
  conector (`user cancelled MCP tool call` nas sete chamadas, com Notion e GitHub verdes na mesma
  sessão: limitação do harness, não queda de fonte). Lido depois pelo conector desta sessão. O
  `decisao-stack.md` canônico ainda manda *"deploy reproduzível: script (git pull → rebuild →
  restart). Manual via SSH no início; GitHub Actions quando incomodar. NÃO montar pipeline completo
  no dia 1. `[FASE 2]`"*. **O Drive está vencido aqui** e o ADR-14 ganha emenda escrita (§11.1) —
  não se apaga o texto original.
- **GitHub corporativo** (`GITHUB-CORP`) — 404 medido, não copiado do packet velho. Fechado por
  medição direta: `Gatika-CL/lotus` é **privado em organização free**, `Andred21/lotus` é público,
  e **nenhum dos dois tem Environment configurado**. Plano free em repositório privado não oferece
  Environment, protection rule nem environment secret — mesma raiz da **P-62**. É o fato que
  decide a D2.

## 2. Decisões do brainstorming (registro com alternativas recusadas)

| # | Decisão | Escolha | Alternativas recusadas |
|---|---|---|---|
| D1 | Transporte Actions → host | **SSM Session Manager**, com a Actions assumindo uma role por **OIDC** e chamando `ssm send-command` | **SSH com chave em secret** — runner do GitHub tem IP dinâmico, então exigiria abrir `22/tcp` para faixa larga ou `0.0.0.0/0`, o oposto do SG atual; **self-hosted runner no próprio host** — põe um agente com credencial de escrita dentro do alvo; **agente de pull no host** — mais código nosso e mais superfície para manter |
| D2 | Onde mora o botão | **Repositório corporativo `Gatika-CL/lotus`, SEM GitHub Environment** | **Environment com required reviewers** — indisponível (privado em org free, §1.3); **botão no repositório pessoal** — o espelho é one-way e o SHA que existe no GHCR de produção é o **sintético** do corporativo, não o pessoal |
| D3 | Evidência de rollback | **Dump pré-deploy + delta de migrations no ledger.** O alvo que não perde migration roda direto; o alvo que perde é **recusado pelo script**, que aponta o dump exato | **Confiar no operador** — é o estado atual, e é o defeito; **diffar arquivos de migration entre dois SHAs** — não enxerga `change()` nem `rename` destrutivo; **snapshot EBS** — grão errado (disco inteiro), custo e RTO piores que um dump de 62 KiB |
| D4 | Lado AWS (provider OIDC + role) | **Script versionado e idempotente com readback, que o João roda e eu confiro** | **Console clicando** — sem rastro e não reproduzível; **Terraform/CloudFormation** — IaC novo, com estado para manter, por causa de dois recursos |
| D5 | Registro de release | **`releases.jsonl` append-only no host**, com `CURRENT_SHA` mantido | **Só `CURRENT_SHA`** — não guarda anterior, migrations nem dump; **tabela no banco** — o registro precisa sobreviver ao banco fora do ar, que é exatamente quando se faz rollback |

## 3. Escopo

**Dentro:**

- `.github/workflows/deploy.yml` — promoção manual governada (§4);
- ledger `releases.jsonl` no host, escrito pelo `deploy.sh` (§5);
- gate de compatibilidade de schema no `deploy.sh`, com recusa (§6);
- dump pré-deploy amarrado à release (§7);
- serialização em duas camadas: `concurrency` no workflow e `flock` no host (§8);
- `deploy/aws/criar-oidc-e-role.sh` — provider OIDC, role `lotus-deploy` e SSM na `lotus-ec2` (§9);
- catracas novas para `deploy.sh` e para o workflow (§10);
- emenda escrita do ADR-14, runbook §8 reescrito e lição 19 atualizada (§11).

**Fora, declarado e não perdido:**

- **rollback automatizado de migration destrutiva** — o bloco entrega a *recusa* e a *evidência*, não a reversão automática. Continua sendo trabalho humano com o dump na mão;
- **DNS/TLS** (P-77) — o deploy funciona pelo EIP; o overlay TLS do `deploy.sh` já entra sozinho quando o certificado existir;
- **consolidação de migrations** (P-05), **rotação da access key de provisionamento** (P-81), **teto de custo/resize** (P-80), **paginação** (P-78), **branch protection** (P-62);
- **rotação do `ghcr.token`** do host — PAT `read:packages` de longa duração, que segue como está; citado aqui para não parecer esquecido;
- **ECS/Fargate, Kubernetes, ArgoCD, CodePipeline** — o ADR-14 os recusa e este bloco não os reabre.

## 4. O workflow de promoção

Arquivo novo `.github/workflows/deploy.yml`, nome **"Promover para produção"**.

```yaml
on:
  workflow_dispatch:
    inputs:
      sha:       { required: true }   # 40 hexadecimais, o SHA corporativo
      confirmar: { required: true }   # tem de ser exatamente PROMOVER
concurrency: { group: producao, cancel-in-progress: false }
permissions:  { id-token: write, contents: read, actions: read }
```

**Guarda de dono, obrigatória.** O job leva `if: github.repository == 'Gatika-CL/lotus'`. O
`.espelho-exclusoes` **não** exclui `.github/`, então este arquivo existe nos dois repositórios —
e o pessoal é **público**. Sem a guarda, qualquer um com fork/acesso ao público teria um botão de
deploy para a produção do cliente. É o oposto exato do job `image`, que é dono-agnóstico de
propósito, e a diferença tem de estar escrita no arquivo.

**Nada de identificador no fonte.** Pela mesma razão — o arquivo é público — o ARN da role e o
`InstanceId` **não** são literais no YAML. Entram como *repository secrets* do corporativo
(`AWS_DEPLOY_ROLE_ARN`, `AWS_INSTANCE_ID`). Repository secret existe em repositório privado no
plano free; é *environment* secret que não existe.

Sequência do job, cada passo falhando alto:

1. `sha` casa com `^[0-9a-f]{40}$` e `confirmar` é exatamente `PROMOVER`. Anti-dedo-gordo: sem
   Environment, é a única barreira antes do disparo.
2. O SHA **está na `main`** deste repositório (`gh api .../compare/main...<sha>` com `status`
   `identical` ou `behind`). Promover commit de branch é recusado.
3. O run do `ci.yml` para aquele `head_sha` **concluiu `success`**. Verde da CI é pré-requisito
   medido, não presumido pelo fato de a imagem existir.
4. Os **três** manifestos existem no GHCR (`docker buildx imagetools inspect` ×3).
5. `aws-actions/configure-aws-credentials@v4` assume a role por OIDC em `sa-east-1`, e o job
   imprime o readback `aws sts get-caller-identity` — é ele que prova, no log, que não há access key.
6. `aws ssm send-command` com documento `AWS-RunShellScript`, comando único
   `/opt/lotus/bin/deploy.sh <sha>`, com `LOTUS_DEPLOY_ATOR=github:<run_id>:<actor>` no ambiente.
   **O workflow não duplica a sequência de deploy** — ele invoca o caminho versionado do host, que
   é o mesmo que o João roda por SSH. Uma sequência, uma verdade.
7. Faz polling de `aws ssm get-command-invocation` até estado terminal, ecoa
   `StandardOutputContent` e `StandardErrorContent` no log do job, e sai diferente de zero quando o
   estado não for `Success`. Falha do script é falha do job, visível, com a saída do host junto.
8. `timeout-minutes` no job, acima do teto de 150 s do healthcheck mais o `pull`.

**O que substitui o Environment.** Sem required reviewer, a aprovação é a composição de: só quem
tem acesso de escrita no corporativo dispara `workflow_dispatch`; o input `confirmar`; a
`concurrency` de grupo único sem cancelamento; e o log com ator e SHA. É menos do que um Environment
e a spec não finge o contrário — vira extensão da **P-62**, com gatilho "org virar Team".

## 5. O ledger no host

Arquivo novo `/opt/lotus/releases.jsonl`, `640 root:root`, **append-only**, uma linha JSON por
evento. Duas linhas por tentativa, de propósito:

```json
{"ts":"2026-09-21T23:10:04Z","evento":"inicio","sha":"<40hex>","sha_anterior":"<40hex|null>","migrations":["2026_09_18_..."],"dump":"s3://<bucket>/backups/lotus-....sql.gz","ator":"github:1234:Andred21"}
{"ts":"2026-09-21T23:12:41Z","evento":"fim","sha":"<40hex>","resultado":"ok","etapa":"ok"}
```

- A linha `inicio` é escrita **antes do `migrate`**, quando tudo que ela declara já foi medido: o
  SHA anterior (lido do `CURRENT_SHA`), as migrations que vão rodar e a chave do dump.
- `migrations` é exatamente `CONHECIDAS \ APLICADAS` da §6 — o gate já mediu os dois conjuntos, e o
  ledger reaproveita a medição em vez de fazer a sua. `dump` é `null` quando a lista está vazia (§7),
  e `sha_anterior` é `null` no primeiro deploy, quando não há `CURRENT_SHA`.
- A linha `fim` traz `resultado` (`ok`/`falha`) e `etapa` (`migrate`, `up`, `health`, `digests`, `ok`).
- **Tentativa interrompida deixa `inicio` sem `fim`.** Isso não é buraco: é a informação que se
  quer quando o deploy morreu no meio, e é ela que aponta o dump.
- Escrita atômica: `printf '%s\n' "$LINHA" >> "$LEDGER"` com o `flock` da §8 já na mão.
- `ator` vem de `LOTUS_DEPLOY_ATOR`; sem a variável (SSH manual), o script usa `manual:<usuário>`.

`CURRENT_SHA` **continua existindo** — o runbook §8 e o costume do João leem ele — e passa a ser
escrito por `mv` de temporário no mesmo diretório, que é atômico, em vez de redirecionamento.

## 6. O gate de compatibilidade de schema

O `deploy.sh` passa a medir dois conjuntos **antes** de qualquer escrita:

- `APLICADAS` — `SELECT migration FROM migrations`, lido do banco por `docker exec` no serviço
  `mysql`. É o que o banco realmente tem, não o que se supõe.
- `CONHECIDAS` — `ls /var/www/database/migrations` dentro da **imagem alvo**
  (`docker run --rm --entrypoint sh "$APP" -c ...`). É o que aquela release sabe desfazer/manter.

Decisão:

- `APLICADAS \ CONHECIDAS` **vazio** → o alvo conhece tudo que o banco tem. Segue o deploy.
- `APLICADAS \ CONHECIDAS` **não vazio** → o banco está à frente da imagem. O script **recusa**,
  lista as migrations que sobram e imprime, do ledger, a chave do dump da release que as
  introduziu. Sai com código próprio.

Para deploy normal (para frente) o conjunto é vazio por construção, então o gate custa duas
medições e nunca atrapalha.

**Escape declarado:** `LOTUS_ACEITAR_SCHEMA_A_FRENTE=1` no ambiente pula a recusa. Só o caminho
manual pode usá-lo — **o workflow nunca define essa variável**, então o caminho automatizado não
tem como contornar o gate. O runbook documenta que o uso correto é: restaurar o dump primeiro,
depois promover.

## 7. O dump amarrado à release

O `deploy.sh` chama o `backup-db.sh` **antes do `migrate`**, e só **quando há migration pendente** —
deploy sem migration não precisa de dump para voltar, porque o gate da §6 já prova que o alvo
anterior é limpo. O gatilho para rever isso fica escrito no runbook: se o dump passar a custar
minutos, ele sai do caminho crítico.

Para o `deploy.sh` saber a chave sem parsear texto, o `backup-db.sh` ganha `LOTUS_BACKUP_SAIDA`:
quando a variável aponta um arquivo, o script escreve **só a URI `s3://…`** nele. A mensagem humana
no stdout não muda, então o cron do host segue idêntico. **Lição 19:** `backup-db.sh` tem catraca
(`frontend/tests/backup-db.test.ts`) — a asserção da variável nova entra **no mesmo commit**, e ela
tem de provar que as duas guardas (piso de 10 KiB no bruto, rodapé do `mysqldump`) continuam antes
do envio.

Falha do backup **aborta o deploy**. Promover sem a evidência de rollback é promover sem rede.

## 8. Serialização, duas camadas

- `concurrency: {group: producao, cancel-in-progress: false}` no workflow — o segundo disparo
  **espera**, não cancela. Cancelar deploy no meio é como se produz estado inconsistente.
- `flock -n` em `/opt/lotus/.deploy.lock` no topo do `deploy.sh`, com mensagem que nomeia o PID
  detentor e código de saída próprio.

As duas porque elas cobrem coisas diferentes: a `concurrency` não sabe que o João pode estar rodando
`deploy.sh` por SSH ao mesmo tempo, e o `flock` não enfileira o segundo run da Actions.

## 9. Lado AWS — o que o João roda

Script novo `deploy/aws/criar-oidc-e-role.sh`, idempotente (reexecutar não estraga nada), com
readback no fim. Entradas por variável de ambiente: repositório corporativo, `InstanceId`, região.

1. **Provider OIDC** `token.actions.githubusercontent.com`, criado só se ausente.
2. **Role `lotus-deploy`**, trust `sts:AssumeRoleWithWebIdentity` com condição de igualdade em
   `aud = sts.amazonaws.com` e `sub = repo:Gatika-CL/lotus:ref:refs/heads/main`. Fixar o `sub` na
   `main` é deliberado: `workflow_dispatch` de outra branch recebe `AccessDenied`, não deploy.
3. **Política inline mínima:** `ssm:SendCommand` restrito ao ARN daquela instância **e** ao
   documento `AWS-RunShellScript`; `ssm:GetCommandInvocation` para ler o resultado e
   `ssm:ListCommandInvocations` porque o `get` devolve `InvocationDoesNotExist` na janela entre o
   `send` e o registro da invocação, e o polling precisa distinguir "ainda não apareceu" de "falhou".
   A role não abre shell, não lê o S3, não mexe em EC2.
4. **`lotus-ec2` ganha SSM** (`AmazonSSMManagedInstanceCore`), sem mexer no que ela já tem (S3 do
   backup, `sns:Publish`). É esta parte que faz o agente do host conversar com o serviço.
5. **Readback obrigatório:** imprime trust e políticas da role, e exige
   `aws ssm describe-instance-information` devolvendo `PingStatus: Online` para aquela instância.
   Sem `Online`, o script falha — não adianta role perfeita com agente morto.

**Nenhuma regra nova de inbound no SG.** O agente SSM sai pela 443, que o outbound já libera. Este é
o ganho central da D1 e é critério de aceite (§13.7).

**Pré-requisito do host, a medir na execução:** o AMI Ubuntu 24.04 da Canonical traz o
`amazon-ssm-agent` como snap. Se a medição no host mostrar que não está ativo, o fallback declarado
é instalá-lo, e a mesma linha entra no `deploy/aws/user-data.sh` com guarda de reexecução — host
reconstruído tem de nascer igual.

## 10. Catracas (lição 19)

A lição 19 já lista o par `deploy/bin/*.sh` ↔ `backup-db.test.ts`/`verificar-backup.test.ts`, mas o
par é **imperfeito na prática**: `deploy/bin/deploy.sh` não tem asserção nenhuma, e
`.github/workflows/ci.yml` também não. Este bloco fecha os dois buracos que ele mesmo abriria:

- **`frontend/tests/deploy-sh.test.ts`** (novo) — `flock` antes de tudo; gate de schema antes do
  `migrate`; dump antes do `migrate`; escrita das duas linhas do ledger; `CURRENT_SHA` por `mv`
  atômico; caminho de recusa presente; conferência de digest preservada.
- **`frontend/tests/workflow-deploy.test.ts`** (novo) — a guarda `github.repository ==
  'Gatika-CL/lotus'`; `concurrency` de grupo único com `cancel-in-progress: false`; input
  `confirmar`; ausência de ARN e de `InstanceId` literais no arquivo; ausência de
  `LOTUS_ACEITAR_SCHEMA_A_FRENTE`.
- **`frontend/tests/backup-db.test.ts`** (estendido) — `LOTUS_BACKUP_SAIDA`, com as guardas
  existentes ainda antes do envio.

Conferência textual, como nas catracas irmãs: o comportamento se prova rodando contra a produção
(§13); a catraca guarda a regressão silenciosa.

## 11. Documentação

### 11.1 ADR-14 ganha emenda datada

Emenda de 2026-09-21, no formato das outras emendas do `docs/adrs.md`. Registra que o item
`[FASE 2]` *"deploy reproduzível (script git pull → rebuild → restart; GitHub Actions quando
incomodar — não montar pipeline no dia 1)"* **está vencido**: o deploy é promoção de artefato
imutável por SHA, sem build e sem working tree no host, e o "quando incomodar" chegou. Diz também
que o Drive canônico ainda traz o texto velho e que quem vence aqui é a decisão posterior do João —
o texto original não se apaga. O `[FASE 2]` de backup (*"snapshot RDS"*) já foi vencido pela revisão
2026-09 do ADR-09 e a emenda aponta para lá em vez de repetir.

### 11.2 Runbook `deploy/aws/README.md`

- **§4** ganha o SSM na `lotus-ec2` e a role `lotus-deploy` com o ponteiro para o script da §9.
- **§8** reescrita: o caminho normal é o workflow; o SSH manual vira contingência declarada; o
  rollback passa a ser o procedimento do gate, com o dump e o ledger.
- **Seção nova** sobre o ledger: como ler, o que significa `inicio` sem `fim`, e o procedimento
  completo de rollback com schema à frente (restaurar o dump, depois promover).

### 11.3 Lição 19

Ganha os pares novos nominalmente (`deploy.sh` ↔ `deploy-sh.test.ts`, `deploy.yml` ↔
`workflow-deploy.test.ts`) e a observação de que `deploy/bin/*.sh` estava listado como par sem que
o `deploy.sh` tivesse catraca — glob na lição não é catraca no arquivo.

## 12. Limites e riscos declarados

1. **Sem Environment, a aprovação é mais fraca.** Composição descrita na §4; vira extensão da P-62.
2. **Agente SSM não verificado até a execução** — fallback escrito na §9.
3. **O `ghcr.token` do host continua sendo PAT de longa duração.** Fora de escopo, citado.
4. **O gate da §6 não protege de migration destrutiva *para frente*** — um `drop column` numa
   release nova destrói dado no `migrate`, e o que sobra é o dump pré-deploy. É exatamente por isso
   que o dump vem antes e que a falha dele aborta.
5. **O ledger vive no disco do host.** Se o EBS morrer, o registro morre junto. Aceito: os dumps
   estão no S3 e o histórico de promoção também existe no log das Actions.

## 13. Definition of Done — comportamento provado

1. Um `workflow_dispatch` no corporativo promove um SHA e `/up` responde **200** pelo EIP, com os
   três digests em execução iguais aos puxados.
2. Disparo concorrente: o segundo run **espera** — não cancela o primeiro nem roda junto. Medido,
   com os dois runs no log.
3. O ledger tem as linhas `inicio` e `fim` coerentes (SHA, anterior, migrations, dump, ator) e o
   `CURRENT_SHA` bate com a linha de fecho.
4. Rollback para o SHA anterior **sem** migration nova: roda limpo, `/up` 200, ledger registra.
5. Rollback para um SHA com o banco à frente: o `deploy.sh` **recusa**, nomeia as migrations que
   sobram e imprime a chave do dump. Provado por execução real, não deduzido.
6. No deploy que teve migration pendente, o dump pré-deploy existe no S3, está nomeado na linha
   `inicio` do ledger e passa no `verificar-backup.sh`. No deploy sem migration, o ledger registra
   `"dump": null` — a ausência é declarada, não omitida.
7. `aws sts get-caller-identity` no log do job mostra a role `lotus-deploy` assumida por OIDC, e
   `aws ec2 describe-security-groups` do `lotus-web` mostra **as mesmas três** regras de inbound de
   antes do bloco.
8. Promoção de um SHA sem run verde da CI, e promoção sem `confirmar: PROMOVER`, são **recusadas**
   pelo workflow. As duas medidas.
9. As catracas novas foram **vistas reprovar** por sonda antes de entrar verdes.
