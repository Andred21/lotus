# Runbook — base de produção AWS (item 10 v2)

Provisionamento e operação do host único de produção. Escrito para ser seguido **sem o plano
aberto**: cada seção corresponde a uma task da Fase B do plano
`docs/superpowers/plans/2026-09-02-infra-producao-provisionamento-aws.md`.

Decisões que valem para tudo aqui (spec v2, §2): região **`sa-east-1`**, compute **`t4g.small`**
(ARM/Graviton), banco **MySQL em container** (revisão 2026-09 do ADR-09), teto de custo
**US$ 30/mês**.

---

## 1. Fase 0 — usuário IAM dedicado

Console → IAM → Users → **Create user** `lotus-infra`:

- console access habilitado, senha própria;
- política **`AdministratorAccess`** (o least-privilege de verdade é da instance role, §4);
- **MFA próprio**, fora do acesso compartilhado com o cliente.

**Fallback declarado (spec §4):** se a criação exigir o MFA que está com o cliente e ele estiver
indisponível, **prossiga o bloco com o acesso atual** e abra ficha em
`docs/superpowers/pendencias/abertas.md` — gatilho: "MFA disponível". Nenhuma outra seção deste
runbook depende desta.

## 2. Medição de SCP (a conta é membro de outra organização)

CloudShell (`sa-east-1`):

```bash
aws organizations describe-organization
```

`AccessDenied` **também é resposta** — cole a saída literal no audit do bloco. Qualquer recusa de
SCP a um recurso das seções 3–6 vira `blocked` no `state.md`, com a mensagem literal como
`blocker`; não contorne.

## 3. S3 — bucket de documentos e de backup

Console S3, região `sa-east-1`, bucket `lotus-prod-<ACCOUNT_ID>`:

- **Block Public Access**: tudo marcado;
- **Bucket Versioning**: `Enabled` (documento tem peso legal);
- **Lifecycle rule** `expira-backups`: prefixo `backups/`, expiração em **30 dias** (o requisito
  de retenção mínima é 7 — a folga é deliberada). **Com versioning ligado, `Expiration` sozinha
  não apaga nada**: ela só põe delete marker e a versão antiga fica ocupando (e custando) para
  sempre. Medido em 2026-09-04 — a regra tem de ter as três cláusulas:

  ```json
  {"Rules": [{"ID": "expira-backups", "Status": "Enabled",
    "Filter": {"Prefix": "backups/"},
    "Expiration": {"Days": 30},
    "NoncurrentVersionExpiration": {"NoncurrentDays": 7},
    "AbortIncompleteMultipartUpload": {"DaysAfterInitiation": 7}}]}
  ```

  O `Filter` limita ao prefixo `backups/`: documento de aluno, que tem peso legal, não é tocado.
- **CORS**: nenhum. Upload passa pela API e download é URL pré-assinada por GET simples; só uma
  medição que prove necessidade justifica acrescentar.

Prova: `get-bucket-versioning` → `Enabled`; `get-public-access-block` → os quatro `true`;
`get-bucket-lifecycle-configuration` → a regra acima; `get-bucket-location` → `sa-east-1`.
Pela CLI, `create-bucket` em `sa-east-1` **exige** `--create-bucket-configuration
LocationConstraint=sa-east-1`; sem isso o bucket nasce em `us-east-1`.

## 4. IAM — role da EC2 (least-privilege)

Role `lotus-ec2`, trust policy de `ec2.amazonaws.com`, com política inline (substitua
`<BUCKET>`):

```json
{"Version": "2012-10-17", "Statement": [
  {"Effect": "Allow", "Action": ["s3:ListBucket"], "Resource": "arn:aws:s3:::<BUCKET>"},
  {"Effect": "Allow", "Action": ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"],
   "Resource": "arn:aws:s3:::<BUCKET>/*"}
]}
```

É esta role que dispensa access key de longa duração no `.env` (§7).

O `sns:Publish` do `verificar-backup.sh` (§9) é uma **segunda** inline, `lotus-alerta`, e **só
existe depois da §10**, que é quem cria o tópico. Duas ordens possíveis, nenhuma escondida: ou a
§10 vem antes, ou esta política volta aqui depois — o que não pode é o script existir sem a
permissão, porque aí ele recusa rodar e o gatilho do ADR-09 continua sem detecção, que era o
defeito original (e foi o que aconteceu: a produção rodou de 2026-09-17 a 2026-09-24 sem o
verificador, e o item 12 pagou a dívida).

```bash
aws iam put-role-policy --role-name lotus-ec2 --policy-name lotus-alerta --policy-document \
  "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Action\":\"sns:Publish\",\"Resource\":\"$T\"}]}"
aws iam get-role-policy --role-name lotus-ec2 --policy-name lotus-alerta --query PolicyDocument
```

**Pela CLI, a role não basta.** O console cria o *instance profile* junto, escondido; a CLI trata
os dois como objetos separados e o launch da §6 não acha o profile se ele não existir:

```bash
aws iam create-instance-profile --instance-profile-name lotus-ec2
aws iam add-role-to-instance-profile --instance-profile-name lotus-ec2 --role-name lotus-ec2
aws iam get-instance-profile --instance-profile-name lotus-ec2 \
  --query 'InstanceProfile.Roles[].RoleName' --output text   # tem de imprimir: lotus-ec2
```

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

## 5. Security Group

SG `lotus-web`, na **VPC default de `sa-east-1`**:

| Direção | Porta | Origem |
|---|---|---|
| inbound | 22/tcp | IP do João, `/32` (atualizar quando o IP mudar) |
| inbound | 80/tcp | `0.0.0.0/0` |
| inbound | 443/tcp | `0.0.0.0/0` |
| outbound | tudo | liberado |

## 6. EC2 + Elastic IP

Launch instance:

- **AMI**: Ubuntu Server 24.04 LTS **arm64** (conferir a arquitetura: a AMI x86 sobe e só falha
  no `docker pull`);
- **Tipo**: `t4g.small`; **EBS**: gp3 20 GiB;
- **Key pair**: novo, `.pem` guardado fora do repositório;
- **Instance profile**: `lotus-ec2` (§4); **Security group**: `lotus-web` (§5);
- **User data**: o conteúdo de `deploy/aws/user-data.sh`;
- **Advanced → Metadata**: **IMDSv2 `required`** e **hop limit `2`**. Sem o hop 2 o container não
  alcança a credencial da role — a falha é um timeout silencioso de ~10 s por request, não um
  erro claro.

Alocar **Elastic IP** e associar à instância.

Prova do cloud-init, por SSH:

```bash
docker --version; docker compose version; aws --version; free -m | grep -i swap; ls -ld /opt/lotus
sudo docker run --rm hello-world | tail -3
aws sts get-caller-identity
```

Esperado: Docker do repositório oficial (sem `ubuntu` no build), `Docker Compose version v2+`,
`aws-cli/2.x`, `Swap` ≈ 2047 MiB, `/opt/lotus` em `drwxr-x---`. Falhou →
`sudo cat /var/log/cloud-init-output.log`.

O `Arn` do `sts` tem de ser `arn:aws:sts::<conta>:assumed-role/lotus-ec2/i-…` — **role assumida,
não usuário IAM**. É essa linha que prova o hop limit 2; se vier timeout de ~10 s, o hop está em 1
e todo o §8 em diante falha sem erro legível.

## 7. Artefatos no host

**Tudo que fala com o Docker no host roda como root** — `sudo <comando>`, ou um shell de root com
`sudo -i` para os blocos longos. O usuário `ubuntu` **não** entra no grupo `docker` de propósito:
esse grupo é root sem senha, e o `/opt/lotus` é `750 root:root`. Logo `docker …` direto responde
`permission denied while trying to connect to the docker API at unix:///var/run/docker.sock` —
é o comportamento desenhado, não uma instalação quebrada.

Do WSL, com o `.pem` da §6:

```bash
scp docker-compose.prod.yml docker-compose.prod-tls.yml ubuntu@<EIP>:/tmp/
scp deploy/bin/deploy.sh deploy/bin/backup-db.sh deploy/bin/verificar-backup.sh ubuntu@<EIP>:/tmp/
scp deploy/nginx/tls.conf ubuntu@<EIP>:/tmp/
```

No host:

```bash
sudo mv /tmp/docker-compose.prod*.yml /opt/lotus/
sudo mv /tmp/deploy.sh /tmp/backup-db.sh /tmp/verificar-backup.sh /opt/lotus/bin/ && sudo chmod +x /opt/lotus/bin/*.sh
sudo mv /tmp/tls.conf /opt/lotus/nginx/
sudo mkdir -p /opt/lotus/certbot && sudo chmod 755 /opt/lotus/certbot
```

**O botão confere esta instalação antes de promover** (item 31). Um `send-command` só de leitura
lista o sha256 dos dois composes, do `nginx/tls.conf` e de cada `bin/*.sh`, e os **nomes** das
chaves do `.env` (o valor nunca sai do host). O script `.github/scripts/conferir-alinhamento.sh`
compara no runner, com duas referências: o runtime e as chaves contra o **SHA que está sendo
promovido**, e os scripts contra a **`main`**. Arquivo diferente ou ausente, ou chave do molde que
falta no `.env`, reprovam o botão antes do deploy, uma linha por item. Script ou chave **a mais**
no host não reprovam.

Duas consequências. **Todo merge que mudar `deploy/bin/*.sh` trava o botão até a reinstalação** —
os scripts vêm sempre de uma árvore igual à `main` do corporativo, que é a que o botão lê
(`git fetch upstream && git diff --quiet upstream/main -- deploy/bin` antes do `scp`; a
`origin/main` do pessoal pode estar à frente do espelho, e o botão recusaria o que ela tem a
mais). E o script de conferência **não vai para o host**: ele roda no runner a partir do checkout
da `main`, então não entra no `scp` acima.

`.env`: copie `deploy/aws/env.prod.example` para `/opt/lotus/.env`, preencha os `<...>` e
proteja (`sudo chmod 600 /opt/lotus/.env`, dono root). **Sem o registro A ainda**, os quatro
campos de host vão para o EIP e o `SESSION_DOMAIN` recebe o literal **`null`** — nem o domínio
(cookie não volta: 401/419 com a API saudável), nem o IP (`Domain=` com IP não faz domain-match e
o navegador descarta o cookie), nem comentada (o gate do entrypoint exige a variável e o container
sai 1). O molde explica a mecânica das três. **Na mesma fase o `SESSION_SECURE_COOKIE` vai para
`false`** — com `true` em HTTP puro o browser não grava o cookie e o login não fecha; ele volta a
`true` no §11, junto com o domínio. E na fase sem DNS o `CERTIFICATE_VALIDATION_URL` fica
**vazio**: o QR do certificado nasce dele (`CertificateValidationUrl`), a cópia distribuída do PDF
o carrega para sempre, e em produção o backend **recusa emitir e baixar certificado** sem ele em
https — 500 com a razão no `detail` e no log. Até o item 29 isto era uma proibição de procedimento
sobre o `FRONTEND_URL`; agora é mecanismo (P-79), e o EIP não tem como chegar a um documento. Nesta
fase nem certificado de prova se emite em produção.
A `APP_KEY` se gera com o entrypoint
trocado — sem `--entrypoint php` o comando cai no entrypoint da imagem e falha:

```bash
docker run --rm --entrypoint php ghcr.io/gatika-cl/lotus-app:<sha> artisan key:generate --show
```

PAT clássico de escopo `read:packages` em `/opt/lotus/ghcr.token` (`sudo chmod 600`), sem quebra
de linha extra — o `deploy.sh` alimenta o `docker login` com o arquivo inteiro. Para conferir o
arquivo, o redirecionamento tem de acontecer DENTRO do root, senão o `<` é aberto pelo shell do
`ubuntu` e devolve `Permission denied` num arquivo que está correto:

```bash
sudo sh -c 'docker login ghcr.io -u gatika-cl --password-stdin < /opt/lotus/ghcr.token'
```

**São TRÊS imagens por SHA**, não duas: `lotus-app`, `lotus-web` e `lotus-clamav`. O antivírus
passou a ser imagem nossa em 2026-09-04 — `clamav/clamav` publica só `linux/amd64` e este host é
Graviton, então o `compose pull` morria em `no matching manifest for linux/arm64/v8 in the
manifest list entries`. O `deploy.sh` já exige os três manifestos antes de puxar qualquer coisa.

## 8. Deploy e admin inicial

**O caminho normal é o botão.** Em `Gatika-CL/lotus`, Actions → *Promover para producao* →
`Run workflow`, com o SHA de 40 hexadecimais e a palavra `PROMOVER`. O workflow confere que o SHA
está na `main`, que o CI dele terminou verde e que os três manifestos existem no GHCR; assume a
role `lotus-deploy` por OIDC; confere que o host tem o runtime e os scripts que o SHA
pressupõe (§7 — reprovou, o remédio é reinstalar pela §7 e promover de novo); e manda o host rodar
**este mesmo script**:

```bash
sudo /opt/lotus/bin/deploy.sh <sha de 40 hexadecimais>
```

**O SSH manual é contingência**, não o caminho de todo dia: serve quando a Actions está fora do ar
ou quando o rollback precisa do escape do §8.1. **Ele pula a conferência da §7**: promove com o host
como estiver. Antes de um deploy por SSH, confira à mão que o que foi instalado pela §7 é o do SHA.
Os dois caminhos disputam o mesmo `flock` em
`/opt/lotus/.deploy.lock` — o segundo sai com código **3** em vez de rodar junto.

### 8.1 Rollback

`cat /opt/lotus/CURRENT_SHA` mostra o SHA corrente, e `/opt/lotus/releases.jsonl` mostra o
histórico (§8.2). O rollback é promover o SHA anterior pelo botão, como qualquer promoção. O gate
decide se isso é seguro:

- **o alvo conhece tudo que o banco tem**: roda igual a um deploy normal;
- **o banco está à frente do alvo**: o script **recusa** com código **4** e lista as migrations que
  sobram, cada uma com a chave do dump que a precede, lida do ledger. A lista vem ordenada. A
  primeira é a migration mais antiga, e o dump dela desfaz todas. Siga o §8.1.1.

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

**Com `fim` em `"etapa":"migrate"`, siga o §8.1.1 mesmo se o gate não recusar.** O DDL do MySQL não
é transacional. Uma migration que morre no meio deixa tabela ou coluna criada sem linha na
`migrations`, e o gate só lê essa tabela, então não vê o que ficou. O rollback passa, mas o próximo
deploy para frente morre em `Table '…' already exists`. O dump a restaurar é o da linha `inicio`
dessa tentativa.

**O escape `LOTUS_ACEITAR_SCHEMA_A_FRENTE=1` não faz parte do restore.** Com o dump restaurado, o
gate passa sozinho. O escape serve para outra decisão: rodar o código antigo sobre o schema novo
**sem** restaurar, por exemplo quando a migration à frente só acrescentou tabela e o código antigo
não a lê. Só funciona por SSH, porque o workflow nunca define a variável. A linha `inicio` registra
o uso em `schema_a_frente`.

#### 8.1.1 Restaurar o dump

**Restaurar descarta tudo que foi escrito depois do dump**: certificados emitidos, matrículas e a
trilha de auditoria. No ensaio de 2026-09-26, um certificado emitido depois do dump sumiu. Antes de
restaurar, pese a alternativa: promover para frente um SHA que corrija a release não perde nada.
Restaure quando a release estiver corrompendo dado, ou quando não houver correção próxima.

**O restore não é carregar o dump por cima.** O `mysqldump` sem `--databases` só derruba as tabelas
que existiam quando o dump foi tirado. As tabelas criadas pelas migrations à frente ficam para
trás, e o próximo deploy para frente morre no `migrate`. Isso foi medido no ensaio: `ERROR 1050
(42S01) ... Table 'coisas' already exists`. O database é apagado e recriado antes da carga.

Todos os comandos abaixo rodam num shell só de root (`sudo -i`), na ordem:

```bash
umask 077 && cd /opt/lotus
C="docker compose -p lotus --project-directory /opt/lotus -f docker-compose.prod.yml"
DUMP=s3://<bucket>/backups/<chave>   # a que a recusa imprimiu, ou o "dump" da linha inicio que parou no migrate
```

1. **Baixar e conferir o dump, antes de parar qualquer coisa.** A última linha tem de ser
   `-- Dump completed on …`. Sem ela, pare aqui: o banco ainda está intacto.

   ```bash
   aws s3 cp "$DUMP" /root/restore.sql.gz --only-show-errors
   gunzip -t /root/restore.sql.gz && gunzip -c /root/restore.sql.gz | tail -1
   ```

2. **Pegar o cadeado do deploy e parar quem escreve.** Com o cadeado na mão, o botão sai com código
   3 em vez de promover no meio do restore. Se `cadeado ok` não aparecer, há um deploy rodando:
   espere ele terminar e repita. O `nginx` continua de pé e responde 502 na API até o passo 7.

   ```bash
   exec 9>>/opt/lotus/.deploy.lock && flock -n 9 && echo "cadeado ok"
   $C stop app scheduler
   ```

3. **Guardar o banco de agora**, porque o passo 4 vai apagá-lo. Essa cópia é tudo que resta do
   que o restore descarta. A regra `expira-backups` (§3) a apaga em 30 dias.

   ```bash
   LOTUS_BACKUP_SAIDA=/root/antes.txt LOTUS_BACKUP_ROTULO=antes-do-restore /opt/lotus/bin/backup-db.sh
   ANTES=$(cat /root/antes.txt)
   ```

4. **Apagar e recriar o database, depois carregar o dump.** O `CREATE DATABASE` sem charset repete o
   que a imagem do MySQL fez quando o volume nasceu. Cada tabela do dump traz o próprio charset. Se
   a carga falhar no meio, repita o passo 4 inteiro: o `DROP` limpa o que a carga parcial deixou.

   ```bash
   MYSQL=$($C ps -q mysql)
   docker exec "$MYSQL" sh -c 'exec mysql -uroot -p"$MYSQL_ROOT_PASSWORD" -e "DROP DATABASE \`$MYSQL_DATABASE\`; CREATE DATABASE \`$MYSQL_DATABASE\`"'
   gunzip -c /root/restore.sql.gz | docker exec -i "$MYSQL" sh -c 'exec mysql -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"'
   ```

5. **Conferir.** Nenhuma das migrations que a recusa listou pode aparecer:

   ```bash
   docker exec "$MYSQL" sh -c 'exec mysql -N -uroot -p"$MYSQL_ROOT_PASSWORD" -e "SELECT migration FROM migrations ORDER BY id DESC LIMIT 5" "$MYSQL_DATABASE"'
   ```

6. **Registrar no ledger.** O `deploy.sh` não sabe que houve restore, e sem esta linha o rollback
   apareceria no histórico como uma promoção comum:

   ```bash
   printf '{"ts":"%s","evento":"restore","dump":"%s","antes":"%s","ator":"manual:%s"}\n' \
     "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$DUMP" "$ANTES" "$(id -un)" >> /opt/lotus/releases.jsonl
   ```

7. **Soltar o cadeado e promover o SHA que deve rodar**, pelo botão e **sem escape**. O gate passa
   sozinho, porque o banco voltou a ser o de antes da release. O `deploy.sh` sobe `app` e
   `scheduler` de novo.

   ```bash
   exec 9>&-
   rm /root/restore.sql.gz /root/antes.txt
   ```

O ensaio completo (restore por cima contra `DROP`/`CREATE`, na mesma imagem `mysql:8.0` da
produção) está na evidência do item 12, em *Review de 2026-09-26*.

### 8.2 O ledger `releases.jsonl`

Append-only, `640 root:root`, duas linhas por tentativa:

```bash
sudo tail -4 /opt/lotus/releases.jsonl
```

- `{"evento":"inicio",…}` sai **antes** do `migrate` e traz:
  - `sha` e `sha_anterior`;
  - as `migrations` que vão rodar;
  - `schema_a_frente`, as migrations que o alvo não conhece. A lista só fica cheia quando o escape
    do §8.1 foi usado; num deploy comum ela sai vazia;
  - a chave `dump`, ou `null` quando não havia migration pendente;
  - o `ator`.
- `{"evento":"fim",…}` traz `resultado` e a `etapa` em que parou.
- `{"evento":"restore",…}` não é escrita pelo `deploy.sh`. O operador a escreve no passo 6 do
  §8.1.1, com o `dump` carregado e a cópia `antes` do banco descartado.
- **`inicio` sem `fim` significa deploy interrompido no meio.** Não é buraco no registro: é a
  informação que se quer nessa hora, e é a linha que aponta o dump.

O dump pré-deploy só acontece quando há migration pendente — deploy sem migration se desfaz
promovendo o SHA anterior, e o gate do §8.1 prova que ele é limpo. **Gatilho para rever:** se o
dump passar a custar minutos, ele sai do caminho crítico do deploy.

### 8.3 Admin inicial

O `DatabaseSeeder` foi medido: em ambiente que não seja `local`/`demo` ele
instala **só roles e permissões** (`RolePermissionSeeder`, ADR-07) e avisa que o admin de
desenvolvimento foi ignorado — a conta `admin@lotus.cl` de senha pública **nunca** nasce em
produção. Então:

```bash
sudo -i sh -c 'cd /opt/lotus && SHA=$(cat CURRENT_SHA) && \
  LOTUS_IMAGE=ghcr.io/gatika-cl/lotus-app:$SHA \
  LOTUS_CLAMAV_IMAGE=ghcr.io/gatika-cl/lotus-clamav:$SHA \
  LOTUS_ENV_FILE=/opt/lotus/.env docker compose -p lotus -f docker-compose.prod.yml \
  run --rm app php artisan db:seed --force'
```

O comando inteiro mora DENTRO do `sudo -i sh -c '…'`, e as aspas são **simples**, por duas razões
medidas em 2026-09-10: `/opt/lotus` é `750 root:root`, então um `cd /opt/lotus` pelo `ubuntu`
devolve `-bash: cd: /opt/lotus: Permission denied` antes de qualquer variável; e com aspas duplas
o `$SHA` expandiria no shell do `ubuntu`, que não o tem, entregando ao Compose uma tag vazia.

`LOTUS_CLAMAV_IMAGE` não é decoração: `run --rm app` sobe as dependências do serviço, o antivírus
é uma delas, e sem a variável o Compose procuraria `lotus-clamav:local` — que não existe no host.

O primeiro admin de verdade se cria por tinker, com senha escolhida na hora (nunca em arquivo):

```bash
sudo -i sh -c 'cd /opt/lotus && ... run --rm app php artisan tinker'
>>> $u = App\Domains\Identity\Models\User::create(['uuid' => (string) Str::uuid(), 'name' => '<nome>', 'email' => '<email>', 'password' => Hash::make('<senha>'), 'type' => 'admin', 'is_active' => true]);
>>> $u->syncRoles(['superadmin']);
```

## 9. Backup

```bash
sudo crontab -e
```

```
10 6 * * * /opt/lotus/bin/backup-db.sh >> /var/log/lotus-backup.log 2>&1
40 6 * * * /opt/lotus/bin/verificar-backup.sh >> /var/log/lotus-backup.log 2>&1
```

06:10 UTC = 03:10 no Chile. Rodar uma vez à mão para provar: `sudo /opt/lotus/bin/backup-db.sh`
deve imprimir `backup ok: s3://…`.

**A segunda linha é a DETECÇÃO, e ela não é opcional.** A revisão 2026-09 do ADR-09 pagou o
descarte do RDS com "backup provado" e escreveu o gatilho de volta — *backup > 7 dias sem sucesso,
volta-se ao RDS*. Sem esta linha ninguém saberia que passaram 7 dias: a primeira linha manda o
resultado para um log local que nada lê, e o host não tem MTA (Q-4 do review de 2026-09-20).

O `verificar-backup.sh` olha o **efeito**, não o processo: a idade do objeto mais recente em
`s3://<BUCKET>/backups/`. Por isso ele avisa mesmo quando o `backup-db.sh` morre antes de imprimir
qualquer coisa, quando o cron some, ou quando a instância é recriada sem o crontab. Passando de
**2 dias** ele publica no tópico SNS da §10 e sai 1 — 2 e não 7, para o gatilho do ADR chegar como
decisão e não como descoberta.

Duas chaves no `.env` o sustentam: `LOTUS_BACKUP_BUCKET` (já existe) e `LOTUS_ALERT_TOPIC_ARN`, o
ARN do tópico da §10. **Sem o ARN ele recusa rodar** em vez de degradar para o silêncio, que é
exatamente o que ele veio consertar. A região do publish sai do próprio ARN — hoje o tópico vive
em `sa-east-1`, a mesma da EC2, mas o script não depende disso.

Provar as duas pontas à mão, na ordem:

```bash
sudo /opt/lotus/bin/verificar-backup.sh          # com backup do dia: "backup ok: … 0d"
sudo env LOTUS_BACKUP_MAX_DIAS=-1 /opt/lotus/bin/verificar-backup.sh   # força o alerta
```

O `env` não é enfeite: com `env_reset` no sudoers, `sudo VAR=valor comando` pode ser recusado, e
`sudo env VAR=valor` sempre passa porque quem monta o ambiente já é o root.

O segundo comando tem de sair 1 **e** chegar um e-mail. Alerta que nunca chegou não é alerta
(lição 1) — e é a subscription da §10 que entrega, então ela precisa estar confirmada.

**Restore provado** (backup que nunca restaurou não é backup):

```bash
aws s3 cp "s3://<BUCKET>/backups/<arquivo-mais-recente>" /tmp/dump.sql.gz
docker run -d --name restore-prova -e MYSQL_ROOT_PASSWORD=prova -e MYSQL_DATABASE=lotus mysql:8.0
sleep 40
gunzip -c /tmp/dump.sql.gz | docker exec -i restore-prova mysql -uroot -pprova lotus
docker exec restore-prova mysql -uroot -pprova -N -e \
  "SELECT 'certificates', COUNT(*) FROM lotus.certificates UNION ALL SELECT 'audits', COUNT(*) FROM lotus.audits"
```

As contagens têm de bater com o mesmo `SELECT` no mysql de produção. Limpar:
`docker rm -f restore-prova && rm /tmp/dump.sql.gz`.

## 10. Alertas — custo pelo Budgets, backup pelo SNS

**O billing alarm que esta seção descrevia não existe nesta conta.** A métrica
`AWS/Billing EstimatedCharges` só é publicada na conta pagadora, e a conta do Lotus não é ela
(`list-metrics` em `us-east-1` devolve vazio). O item 10 trocou o alarme por **AWS Budgets**, e
foi essa troca que deixou o `verificar-backup.sh` sem canal: o tópico SNS nascia junto com o
alarme, e sem alarme não nasceu tópico. São dois canais, cada um com o seu motivo:

**Custo — AWS Budgets, e-mail direto.** Budget `lotus-prod-teto`, MONTHLY, 30 USD, sem filtro de
serviço, notificações `ACTUAL > 100%` e `FORECASTED > 100%` com subscriber `EMAIL`. O Budgets
entrega sem SNS e sem confirmação de subscription.

**Backup — tópico SNS `lotus-alertas`, em `sa-east-1`.** É o canal do `verificar-backup.sh` (§9).
Não há mais motivo para `us-east-1`: aquela região só existia por causa do alarme.

```bash
T=$(aws sns create-topic --name lotus-alertas --region sa-east-1 --query TopicArn --output text)
aws sns subscribe --region sa-east-1 --topic-arn "$T" --protocol email \
  --notification-endpoint <e-mail do João>
# confirmar pelo link do e-mail "AWS Notification - Subscription Confirmation", e então:
aws sns list-subscriptions-by-topic --region sa-east-1 --topic-arn "$T" \
  --query 'Subscriptions[].SubscriptionArn' --output text   # nao pode dizer PendingConfirmation
```

Sem confirmar, o tópico publica para ninguém. Depois: o `sns:Publish` da §4 e o ARN em
`LOTUS_ALERT_TOPIC_ARN` no `/opt/lotus/.env`.

Canal definitivo de alerta é decisão do bloco de observabilidade. Trocar de canal depois é trocar
um ARN no `.env` e a `Resource` da `lotus-alerta`.

## 11. TLS — quando o registro A chegar

O registro `app.lotusotec.cl` → EIP é pedido à Lotus/agência (a zona está em
`ns1–ns4.stackdns.com` e não temos acesso ao painel). **A prova é a igualdade**, nunca "o nome
resolve": existe curinga `*.lotusotec.cl` apontando para o WordPress, então qualquer nome
resolve.

```bash
dig +short app.lotusotec.cl   # tem de ser exatamente o EIP
```

**Passo 1 — emitir o certificado** (uma vez, com o nginx parado):

```bash
sudo apt-get install -y certbot
docker compose -p lotus --project-directory /opt/lotus -f /opt/lotus/docker-compose.prod.yml stop nginx
sudo certbot certonly --standalone -d app.lotusotec.cl --agree-tos -m <email>
```

**Passo 2 — virar o `.env` para o domínio e para HTTPS.** Este passo é do TLS tanto quanto o
certificado, e é o que a fase sem DNS deixou pendurado. São **seis** campos, não um:

```bash
sudo -e /opt/lotus/.env
```

| Campo | Fase sem DNS | Agora |
|---|---|---|
| `APP_URL` | `http://<EIP>` | `https://app.lotusotec.cl` |
| `FRONTEND_URL` | `http://<EIP>` | `https://app.lotusotec.cl` |
| `CERTIFICATE_VALIDATION_URL` | vazia | `https://app.lotusotec.cl` |
| `SANCTUM_STATEFUL_DOMAINS` | `<EIP>` | `app.lotusotec.cl` |
| `SESSION_DOMAIN` | `null` (literal) | `app.lotusotec.cl` |
| `SESSION_SECURE_COOKIE` | `false` | `true` |

Os dois últimos são os que mordem em silêncio. `SESSION_SECURE_COOKIE` ausente **não** equivale a
`false`: `session.php:172` lê `env('SESSION_SECURE_COOKIE')` sem default, a ausência vira null, e o
cookie de sessão do Sanctum passa a viajar em claro sob TLS sem aparecer em diff nenhum (lei §5.4).
E o `CERTIFICATE_VALIDATION_URL` não é infra: é a base do QR do certificado, que a cópia
distribuída do PDF carrega para sempre — **só com ele preenchido em https o backend volta a emitir e
a entregar PDF**. Não herda o `FRONTEND_URL`, de propósito (P-79).

**Passo 3 — subir com o overlay:**

```bash
sudo /opt/lotus/bin/deploy.sh "$(cat /opt/lotus/CURRENT_SHA)"
```

O `deploy.sh` detecta o certificado e sobe com o overlay TLS sozinho. Prova, nesta ordem:

```bash
curl -s -o /dev/null -w '%{http_code}\n' https://app.lotusotec.cl/up      # 200
curl -s -o /dev/null -w '%{http_code}\n' http://app.lotusotec.cl/inicio   # 301
curl -sI https://app.lotusotec.cl/api/... | grep -i '^set-cookie'          # tem `Secure`
```

O `/up` na 80 responde **200**, e não 301: o `tls.conf` isenta esse caminho do redirect de
propósito, porque o healthcheck do nginx e o gate pós-deploy do `deploy.sh` falam HTTP puro na
127.0.0.1 (Q-1 do review de 2026-09-20). Se ele voltar a redirecionar, o deploy morre logo após o
`up -d` — e a catraca `frontend/tests/nginx-conf.test.ts` existe para que isso não chegue ao host.

**Passo 4 — passar a renovação para webroot.** Este passo não é burocracia: sem ele o certificado
expira em 90 dias, calado.

O certbot grava em `/etc/letsencrypt/renewal/<dominio>.conf` o **authenticator da emissão**, e o
`renew` repete o que está lá. Emitido em `--standalone`, o `renew` tentaria ligar na porta 80 — que
agora é do nginx, de pé — e falharia. A emissão foi `--standalone` porque naquele momento não havia
nginx servindo challenge nenhum; agora há, e o `tls.conf` serve
`/.well-known/acme-challenge/` a partir de `/opt/lotus/certbot`, montado no container pelo overlay.
(Era o Q-6 do review de 2026-09-20, junto com o webroot que antes era um volume nomeado `:ro` — sem
caminho no host, ninguém escrevia nele.)

```bash
sudo mkdir -p /opt/lotus/certbot && sudo chmod 755 /opt/lotus/certbot
sudo certbot certonly --webroot -w /opt/lotus/certbot -d app.lotusotec.cl \
  --cert-name app.lotusotec.cl --keep-until-expiring
grep -E '^(authenticator|webroot_path)' /etc/letsencrypt/renewal/app.lotusotec.cl.conf
```

O `grep` tem de imprimir `authenticator = webroot`. **Se ainda disser `standalone`**, o certbot
manteve o certificado sem reescrever a configuração; então se edita o arquivo à mão — `authenticator
= webroot` e, na seção `[[webroot_map]]`, `app.lotusotec.cl = /opt/lotus/certbot`.

O 755 do diretório não é detalhe: quem lê o challenge é o **worker** do nginx (uid 101), não o
master, e `/opt/lotus` é `750 root:root`. O bind mount não carrega a permissão do pai, mas carrega a
do próprio diretório.

O hook de recarga vive em `/etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh`:

```bash
#!/usr/bin/env bash
docker compose -p lotus --project-directory /opt/lotus \
  -f /opt/lotus/docker-compose.prod.yml -f /opt/lotus/docker-compose.prod-tls.yml restart nginx
```

**O gate, e ele é gate e não formalidade:**

```bash
sudo certbot renew --dry-run
```

Isto tem de passar **com o nginx de pé** — é o ensaio da renovação real, e é a única prova de que a
cadeia toda funciona: authenticator certo, diretório com a permissão certa, e o `tls.conf` servindo
o challenge sem redirecionar. Reprovando aqui, o certificado morre em 90 dias sem uma linha de
aviso. Backup que nunca restaurou não é backup; renovação que nunca ensaiou não é renovação
(lição 1).

## 12. Critério de resize

`t4g.small` (2 GiB) vira `t4g.medium` (4 GiB) quando **qualquer** um acontecer:

- OOM-kill durante geração de PDF em lote (`dmesg | grep -i oom`);
- swap sustentado em uso normal (`free -m`, não pico isolado).

Como: stop → Change instance type → start. São minutos de indisponibilidade, aceitáveis para
~10 usuários. Medição de apoio: `docker stats --no-stream` + `free -m`, com a saída no audit —
o critério é escrito, não memória de quem operou.
