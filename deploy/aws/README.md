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
docker --version && docker compose version && free -m | grep -i swap && ls -ld /opt/lotus
```

Esperado: Docker instalado, `Swap` ≈ 2047 MiB, `/opt/lotus` existente. Falhou →
`sudo cat /var/log/cloud-init-output.log`.

## 7. Artefatos no host

Do WSL, com o `.pem` da §6:

```bash
scp docker-compose.prod.yml docker-compose.prod-tls.yml ubuntu@<EIP>:/tmp/
scp deploy/bin/deploy.sh deploy/bin/backup-db.sh ubuntu@<EIP>:/tmp/
scp deploy/nginx/tls.conf ubuntu@<EIP>:/tmp/
```

No host:

```bash
sudo mv /tmp/docker-compose.prod*.yml /opt/lotus/
sudo mv /tmp/deploy.sh /tmp/backup-db.sh /opt/lotus/bin/ && sudo chmod +x /opt/lotus/bin/*.sh
sudo mv /tmp/tls.conf /opt/lotus/nginx/
```

`.env`: copie `deploy/aws/env.prod.example` para `/opt/lotus/.env`, preencha os `<...>` e
proteja (`sudo chmod 600 /opt/lotus/.env`, dono root). A `APP_KEY` se gera com o entrypoint
trocado — sem `--entrypoint php` o comando cai no entrypoint da imagem e falha:

```bash
docker run --rm --entrypoint php ghcr.io/gatika-cl/lotus-app:<sha> artisan key:generate --show
```

PAT clássico de escopo `read:packages` em `/opt/lotus/ghcr.token` (`sudo chmod 600`), sem quebra
de linha extra — o `deploy.sh` alimenta o `docker login` com o arquivo inteiro.

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
cd /opt/lotus && LOTUS_IMAGE=ghcr.io/gatika-cl/lotus-app:$(cat CURRENT_SHA) \
  LOTUS_ENV_FILE=/opt/lotus/.env docker compose -p lotus -f docker-compose.prod.yml \
  run --rm app php artisan db:seed --force
```

O primeiro admin de verdade se cria por tinker, com senha escolhida na hora (nunca em arquivo):

```bash
cd /opt/lotus && ... run --rm app php artisan tinker
>>> $u = App\Domains\Identity\Models\User::create(['uuid' => (string) Str::uuid(), 'name' => '<nome>', 'email' => '<email>', 'password' => Hash::make('<senha>'), 'type' => 'admin', 'is_active' => true]);
>>> $u->syncRoles(['superadmin']);
```

## 9. Backup

```bash
sudo crontab -e
```

```
10 6 * * * /opt/lotus/bin/backup-db.sh >> /var/log/lotus-backup.log 2>&1
```

06:10 UTC = 03:10 no Chile. Rodar uma vez à mão para provar: `sudo /opt/lotus/bin/backup-db.sh`
deve imprimir `backup ok: s3://…`.

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

Canal definitivo de alerta é decisão do bloco de observabilidade.

## 11. TLS — quando o registro A chegar

O registro `app.lotusotec.cl` → EIP é pedido à Lotus/agência (a zona está em
`ns1–ns4.stackdns.com` e não temos acesso ao painel). **A prova é a igualdade**, nunca "o nome
resolve": existe curinga `*.lotusotec.cl` apontando para o WordPress, então qualquer nome
resolve.

```bash
dig +short app.lotusotec.cl   # tem de ser exatamente o EIP
```

Emissão (uma vez):

```bash
sudo apt-get install -y certbot
docker compose -p lotus --project-directory /opt/lotus -f /opt/lotus/docker-compose.prod.yml stop nginx
sudo certbot certonly --standalone -d app.lotusotec.cl --agree-tos -m <email>
sudo /opt/lotus/bin/deploy.sh "$(cat /opt/lotus/CURRENT_SHA)"
```

O `deploy.sh` detecta o certificado e sobe com o overlay TLS sozinho. Depois:
`curl -s -o /dev/null -w '%{http_code}' https://app.lotusotec.cl/up` → `200`.

Renovação: o timer systemd do certbot renova; o hook
`/etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh` recarrega o nginx:

```bash
#!/usr/bin/env bash
docker compose -p lotus --project-directory /opt/lotus \
  -f /opt/lotus/docker-compose.prod.yml -f /opt/lotus/docker-compose.prod-tls.yml restart nginx
```

Validar com `sudo certbot renew --dry-run` (o webroot do challenge é servido pelo `tls.conf`).

## 12. Critério de resize

`t4g.small` (2 GiB) vira `t4g.medium` (4 GiB) quando **qualquer** um acontecer:

- OOM-kill durante geração de PDF em lote (`dmesg | grep -i oom`);
- swap sustentado em uso normal (`free -m`, não pico isolado).

Como: stop → Change instance type → start. São minutos de indisponibilidade, aceitáveis para
~10 usuários. Medição de apoio: `docker stats --no-stream` + `free -m`, com a saída no audit —
o critério é escrito, não memória de quem operou.
