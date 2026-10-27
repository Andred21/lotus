# Saúde da infra AWS — medição de 2026-10-25

Medição só leitura: AWS CLI local (perfil `lotus`, usuário `lotus-infra`) e SSH em
`ubuntu@18.230.53.197`. Nada foi alterado. Os brutos (`s3-versions.json`, `ce-servico.json`,
`ce-uso.json`) ficaram fora do repositório. Este registro é o insumo e a linha de base do item 42
(`infra-producao-higiene-e-manutencao`).

## 1. S3 `lotus-prod-760144413534`

Config: versionamento ligado, SSE AES256, Block Public Access total. Lifecycle só em `backups/`
(expira em 30 d, versão antiga em 7 d, multipart em 7 d).

| Prefixo | Atuais | Bytes | Versões antigas | Bytes | Marcas de delete |
|---|---|---|---|---|---|
| backups/ | 39 | 653 101 | 6 | 59 243 | 6 |
| budget/ | 1 | 2 222 195 | 0 | 0 | 0 |
| probes/ | 0 | 0 | 1 | 22 | 1 |
| quote/ | 4 | 7 593 946 | 0 | 0 | 0 |
| redator/ | 8 | 3 897 569 | 1 | 602 | 1 |
| turma/ | 6 | 2 365 026 | 3 | 335 055 | 3 |
| user-photos/ | 4 | 3 848 546 | 2 | 1 907 421 | 2 |
| **total** | **62** | **20,6 MB** | **13** | **2,3 MB** | **13** |

Custo irrelevante (US$ 0,15 no mês). O problema é higiene de dado pessoal.

**Órfãos: 12 objetos atuais sem linha no banco** (banco = `files.path` ∪ `users.photo_path`,
11 caminhos, todos presentes no S3 — nenhum arquivo faltando):

- `budget/2/…` (1), `quote/2/…` (4), `turma/2/…` (3): anteriores à limpeza de 2026-10-24.
- `turma/1/…` (3): documentos da turma do smoke `SMOKE-GOLIVE`.
- `user-photos/4/H8ow…png` (1): foto do admin antigo, de 2026-09-09. Era o 12º que não fechava
  a conta de ontem.

**Versões antigas fora de `backups/` nunca expiram**: `redator/1`, `turma/1` (3),
`user-photos/4` (2) e `probes/` seguem guardadas para sempre. O lifecycle não cobre esses
prefixos.

**Backups**: 39 atuais, o mais velho de 2026-09-24 (o lifecycle é assíncrono, normal). **Falta o
de 2026-10-07**: `upload failed … Unable to locate credentials` no `/var/log/lotus-backup.log`
(falha transitória do IMDS). O `backup-db.sh` não tem retry, e o `verificar-backup.sh` só alerta
acima de 2 dias, então ninguém foi avisado.

## 2. EC2 `i-0789e30d781790dd4` (t4g.small, sa-east-1a)

**Disco: 87 % de 19 GB (2,5 GB livres). Alarme `lotus-prod-disco` (>80 %) em ALARM desde
2026-10-24 14:55 UTC**, na promoção do go-live; já piscou em 2026-10-05.

| Onde | Tamanho | Observação |
|---|---|---|
| `/var/lib/containerd` | 9,5 GB | image store do Docker 29 (2,4 GB content + 7,1 GB snapshots) |
| `/usr` | 2,7 GB | sistema |
| `/swapfile` | 2,0 GB | swap no mesmo disco |
| `/var/lib/docker` | 608 MB | volumes: `mysql-data` 241 MB, `clamav-data` 176 MB, **anônimo 216 MB** |
| `/var/lib/snapd` | 289 MB | `amazon-ssm-agent` é snap: **não mexer** |
| `/var/lib/apt` + `/var/cache/apt` | 332 MB | cache de pacote |
| `/var/log` | 218 MB | journal 183 MB (cap default ≈ 10 % do FS); logs de contêiner já têm `max-size 10m` |
| `/opt/aws` | 213 MB | CloudWatch agent |

**Imagens Docker**: 41 imagens, 10,06 GB, **5,44 GB recuperáveis**. Cada promoção deixa 3
imagens (`lotus-app`, `lotus-web`, `lotus-clamav`) e ninguém apaga as velhas: 14 SHAs no host.
Em uso: `e28fdc52`. Anterior (rollback): `abd73766`. As outras 12 são lixo. `gotenberg:8`
(2,47 GB) e `mysql:8.0` (1,09 GB) são necessárias.

**Volume anônimo `901f0f78…`** (216 MB), criado em 2026-10-24 17:03:27Z: é o datadir do MySQL
descartável `lotus-golive-prova` do passo 4 do go-live (`deploy/aws/README.md:1428`), com uma cópia
do database `lotus` daquele momento. **Confirma em produção o Q-1 da revisão do bloco 13**, que
ficou PLAUSIBLE: `docker rm -f` sem `-v` deixa o volume. O mesmo padrão está em `README.md:1459`
(ensaio D3) e `:525` (§9).

**`/opt/lotus/prova-certificado.php`** segue no host (script obsoleto do provisionamento).

**Kernel**: roda `7.0.0-1012-aws`; o `1014` já está instalado pelo unattended-upgrades;
`/var/run/reboot-required` ativo. Uptime 35 dias, sem reboot desde o launch de 2026-09-19. O
unattended só aplica `noble-security`, sem `Automatic-Reboot`. **40 pacotes fora de segurança
pendentes**, entre eles `docker-ce` 29.8.0 → 29.9.2, `containerd.io` 2.3.4 → 2.4.2 e
`docker-compose-plugin` 5.5.1 → 5.6.1. Os 6 contêineres têm `restart: unless-stopped` e o
`docker` está `enabled`: voltam sozinhos no boot.

**Memória**: 1,8 GB total, 363 MB disponíveis, **swap com 805 MB usados**. `clamd` = 375 MB RSS +
590 MB em swap; `mysqld` = 58 MB RSS + 419 MB em swap (a primeira consulta depois de ocioso
paga page-in). Nenhum OOM desde 2026-10-01.

**Agendados**: cron root `backup-db.sh` às 06:10 e `verificar-backup.sh` às 06:40 UTC; timer
`lotus-sonda` por minuto; logrotate, fstrim, apt-daily ativos. Sem `/etc/docker/daemon.json`.

## 3. Conta AWS `760144413534`

**Custo** (Cost Explorer, sem filtro):

| Mês | Total USD |
|---|---|
| 2026-08 | 13,33 |
| 2026-09 | 39,28 |
| 2026-10 (até 25) | 33,00, previsão 40,85 |

**O orçamento `lotus-prod-teto` (30 USD, sem filtro) já estourou em outubro**, mas por causa de
recurso que não é do Lotus:

| Origem | Out/2026 (por tipo de uso) |
|---|---|
| **Komit, em us-west-2**: `t2.small` `Komit-server01` (15,82), EBS 60 GB (4,43), IPv4 público (3,45), 5 snapshots manuais (1,01) | ≈ 24,70 (≈ 75 %) |
| Lotus app, em sa-east-1: IPv4 do EIP (3,45), EBS 20 GB (2,81), S3 (0,15) | ≈ 6,40 |
| Route 53: 2 zonas `lotusotec.cl` + `komit.cl` (1,19), health check HTTPS do site (0,65) | ≈ 1,90 |

O `t4g.small` do Lotus saiu US$ 0 (579 h): algum free tier ou trial cobre. Quando acabar, entra
na conta.

**Inventário**:

- Regiões com recurso: só sa-east-1, us-east-1 (stacks do site e DNS) e us-west-2 (Komit).
- Sem RDS, NAT, VPC endpoint, AMI própria ou snapshot do Lotus. **Não há backup de host:** se
  a EC2 se perder, ela é reprovisionada pelo README. O dump diário no S3 cobre o banco.
- Stacks: `lotus-site`, `lotus-contato`, `lotus-oidc-github`, `lotus-observabilidade`,
  `lotus-dns`.
- Log groups com retenção de 30 d: `/lotus/prod/containers` 58 MB, `/lotus/prod/sonda` 3,5 MB.
- Alarmes: `lotus-prod-up`, `-5xx` e `-certificado` em OK; **`lotus-prod-disco` em ALARM**.
- SNS `lotus-alertas` com assinatura de e-mail confirmada.
- SES em sandbox (200/dia, decisão do ADR-23), saudável.

Os achados de segurança da conta que não são do Lotus foram entregues ao João e ficam fora deste
registro.
