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
   "Resource": "arn:aws:s3:::<BUCKET>/*"},
  {"Effect": "Allow", "Action": ["sns:Publish"], "Resource": "<ARN DO TOPICO DA §10>"}
]}
```

É esta role que dispensa access key de longa duração no `.env` (§7).

O `sns:Publish` é do `verificar-backup.sh` (§9) e **só existe depois da §10**, que é quem cria o
tópico. Duas ordens possíveis, nenhuma escondida: ou a §10 vem antes desta política, ou esta
política volta aqui depois — o que não pode é o script existir sem a permissão, porque aí ele
recusa rodar e o gatilho do ADR-09 continua sem detecção, que era o defeito original.

**Pela CLI, a role não basta.** O console cria o *instance profile* junto, escondido; a CLI trata
os dois como objetos separados e o launch da §6 não acha o profile se ele não existir:

```bash
aws iam create-instance-profile --instance-profile-name lotus-ec2
aws iam add-role-to-instance-profile --instance-profile-name lotus-ec2 --role-name lotus-ec2
aws iam get-instance-profile --instance-profile-name lotus-ec2 \
  --query 'InstanceProfile.Roles[].RoleName' --output text   # tem de imprimir: lotus-ec2
```

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

`.env`: copie `deploy/aws/env.prod.example` para `/opt/lotus/.env`, preencha os `<...>` e
proteja (`sudo chmod 600 /opt/lotus/.env`, dono root). **Sem o registro A ainda**, os quatro
campos de host vão para o EIP e o `SESSION_DOMAIN` recebe o literal **`null`** — nem o domínio
(cookie não volta: 401/419 com a API saudável), nem o IP (`Domain=` com IP não faz domain-match e
o navegador descarta o cookie), nem comentada (o gate do entrypoint exige a variável e o container
sai 1). O molde explica a mecânica das três. **Na mesma fase o `SESSION_SECURE_COOKIE` vai para
`false`** — com `true` em HTTP puro o browser não grava o cookie e o login não fecha; ele volta a
`true` no §11, junto com o domínio. E a fase sem DNS tem uma proibição: **nenhum certificado REAL
se emite enquanto o `FRONTEND_URL` for o EIP**, porque o QR do certificado nasce desse campo
(`CertificatePdfService`) e o documento é snapshot imutável — o EIP ficaria congelado no QR de um
papel de peso legal. Certificado de prova nesta fase se apaga junto com a prova.
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

```bash
sudo /opt/lotus/bin/deploy.sh <sha de 40 hexadecimais>
```

Rollback: o mesmo comando com o SHA anterior (`cat /opt/lotus/CURRENT_SHA` mostra o corrente).
Migration incompatível é limite declarado — estratégia de rollback de schema é do item 12.

**Admin inicial.** O `DatabaseSeeder` foi medido: em ambiente que não seja `local`/`demo` ele
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
exatamente o que ele veio consertar. A região do publish sai do próprio ARN: o tópico vive em
`us-east-1` e a EC2 em `sa-east-1`.

Provar as duas pontas à mão, na ordem:

```bash
sudo /opt/lotus/bin/verificar-backup.sh          # com backup do dia: "backup ok: … 0d"
sudo LOTUS_BACKUP_MAX_DIAS=-1 /opt/lotus/bin/verificar-backup.sh   # força o alerta
```

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

## 10. Billing alarm

O alarme vive em **`us-east-1`** — a métrica `EstimatedCharges` só existe lá. Isso não é engano
de região a "corrigir" depois.

Console (us-east-1) → CloudWatch → Alarms → Billing → métrica `EstimatedCharges` (USD) →
condição `> 30` → ação: tópico SNS novo com o e-mail do João → **confirmar a subscription pelo
e-mail** (sem confirmar, o alarme dispara para ninguém).

**Guarde o ARN do tópico**: ele vai para `LOTUS_ALERT_TOPIC_ARN` no `/opt/lotus/.env` e para o
`sns:Publish` da role da §4. O tópico tem dois consumidores, não um — o alarme de custo e o
`verificar-backup.sh` da §9.

Canal definitivo de alerta é decisão do bloco de observabilidade. Reusar este aqui não antecipa
essa decisão: é a subscription que já existe e já foi confirmada, e trocar de canal depois é
trocar um ARN no `.env`.

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
certificado, e é o que a fase sem DNS deixou pendurado. São **cinco** campos, não um:

```bash
sudo -e /opt/lotus/.env
```

| Campo | Fase sem DNS | Agora |
|---|---|---|
| `APP_URL` | `http://<EIP>` | `https://app.lotusotec.cl` |
| `FRONTEND_URL` | `http://<EIP>` | `https://app.lotusotec.cl` |
| `SANCTUM_STATEFUL_DOMAINS` | `<EIP>` | `app.lotusotec.cl` |
| `SESSION_DOMAIN` | `null` (literal) | `app.lotusotec.cl` |
| `SESSION_SECURE_COOKIE` | `false` | `true` |

Os dois últimos são os que mordem em silêncio. `SESSION_SECURE_COOKIE` ausente **não** equivale a
`false`: `session.php:172` lê `env('SESSION_SECURE_COOKIE')` sem default, a ausência vira null, e o
cookie de sessão do Sanctum passa a viajar em claro sob TLS sem aparecer em diff nenhum (lei §5.4).
E `FRONTEND_URL` não é só infra: o QR do certificado é `FRONTEND_URL + /validar/{uuid}`, gravado
para sempre num documento de peso legal — **só depois deste passo se emite certificado real**.

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
