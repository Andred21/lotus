# Bloco 42 — execução em produção

## Host

### Medição antes

2026-10-27, por volta de 18:30 UTC. O João rodou o comando do Step 1 da Task 9 (só leitura) e colou
a saída.

- `CURRENT_SHA`: `61dde89ddc6ac5bc7dff33c2d3d7e2b41f4ec07d`, promovido em 2026-10-25T17:49:04Z.
- Anterior que a poda guarda: `e28fdc52e1c6a172b9c73f3a5dbdedf40c9be66c`. É o último `fim` ok de
  outro SHA no ledger (2026-10-24T17:14:12Z). O `fim` com falha das 17:09:52Z, do mesmo SHA, não
  conta.
- SHAs por repositório: `lotus-app` 14, `lotus-web` 13, `lotus-clamav` 13. O `683e6221` só existe
  no `lotus-app`. Saem 12 + 11 + 11 = 34 imagens.
- Volume dangling: `901f0f780df7510476a0449772f3ec9605353c322a7fc1cd8b2b7df5c99e04cf`.
- Contêineres: seis, todos `Up`. `app`, `scheduler`, `nginx` e `clamav` rodam o `61dde89d`. Nenhum
  contêiner parado.
- Disco: 88% (17G de 19G, 2,3G livres). `lotus-prod-disco` em `ALARM`. `lotus-prod-up`,
  `lotus-prod-5xx` e `lotus-prod-certificado` em `OK`. Os quatro com ações ligadas.
- Kernel `7.0.0-1012-aws`, com `/var/run/reboot-required` presente. 40 pacotes pendentes no apt,
  entre eles `docker-ce` 29.8.0 → 29.9.2 e `containerd.io` 2.3.4 → 2.4.2.
- Fuso `Etc/UTC`. Journal em 198,9M. Cache do apt em 117M.
- `/opt/lotus/prova-certificado.php` presente (8929 bytes, `ubuntu:ubuntu`, 2026-09-10).

O que mudou desde a medição de 2026-10-25 (`docs/superpowers/audits/2026-10-25-saude-infra.md`):
- A promoção do `61dde89d` (2026-10-25T17:48Z) entrou depois dela.
- O SHA atual passou de `e28fdc52` para `61dde89d`.
- O alvo de rollback passou de `abd73766` para `e28fdc52`, e o `abd73766` agora sai.
- O disco foi de 87% para 88%.

### Limpeza única

2026-10-27, por volta de 18:35 UTC. O João rodou no host a poda, com o `podar-imagens.sh` da lane
em `/tmp` e o cadeado do deploy
(`sudo flock -n /opt/lotus/.deploy.lock sh -c 'bash /tmp/podar-imagens.sh "$(cat /opt/lotus/CURRENT_SHA)"'`).
Depois rodou o `docker ps -a --filter volume=…` (vazio), o `docker volume rm` do
`901f0f780df7510476a0449772f3ec9605353c322a7fc1cd8b2b7df5c99e04cf` e o `rm` de
`/opt/lotus/prova-certificado.php` e `/tmp/podar-imagens.sh`. A saída da poda não foi colada, e o
estado final é a prova.

Conferido por Claude, por SSH, às 18:36 UTC:
- Imagens: só `61dde89d` e `e28fdc52` em cada um dos três repositórios do Lotus, mais
  `gotenberg/gotenberg:8` e `mysql:8.0`. As 34 previstas saíram.
- `docker volume ls -qf dangling=true`: vazio. Dois volumes locais, os dois em uso.
- `prova-certificado.php` e `/tmp/podar-imagens.sh`: ausentes.
- Disco: de 88% para 57% (11G de 19G, 8,1G livres).
- `docker system df`: 8 imagens, 4,221GB. Os 163,9MB recuperáveis são as imagens do `e28fdc52`,
  o alvo de rollback, que não está em uso.
- `lotus-prod-disco`: ainda em `ALARM` às 18:36 UTC. Precisa de dois períodos de 5 minutos abaixo
  de 80%.

### journald e apt

2026-10-27, por volta de 18:37 UTC. O João rodou no host os seis comandos do Step 3 da Task 9: o
`lotus.conf` do journald, o restart do `systemd-journald`, o `journalctl --vacuum-size=200M`, o
`52lotus-limpeza` e o `apt-get clean`. O vacuum soltou 0B: o journal já estava abaixo do teto.

Conferido por Claude, por SSH, às 18:37 UTC:
- `journalctl --disk-usage`: 198,9M, abaixo do teto de 200M.
- `apt-config dump | grep AutocleanInterval`: `APT::Periodic::AutocleanInterval "7";`. Antes era
  `"0"`.
- `/var/cache/apt`: de 117M para 12K.
- `/etc/systemd/journald.conf.d/lotus.conf` e `/etc/apt/apt.conf.d/52lotus-limpeza`, lidos com
  `sudo cat`: iguais aos trechos do `deploy/aws/user-data.sh`.
- Disco em 56%.

### Janela manual

2026-10-27, das 18:41 às 18:45 UTC (15:41 a 15:45 em Santiago), em horário comercial, por decisão
do João.

Antes, às 18:40 UTC: kernel `7.0.0-1012-aws`, 37 dias ligado, `/var/run/reboot-required` presente
por causa do `linux-image-7.0.0-1013-aws` e do `linux-image-7.0.0-1014-aws`. Os 40 pacotes
pendentes eram os da medição.

Passos:
- O João desligou as ações do `lotus-prod-up` e do `lotus-prod-5xx` (§14.7).
- No host, rodou `sudo apt-get update && sudo apt-get -y upgrade && sudo apt-get clean`. O
  `needrestart` reiniciou os serviços do sistema e avisou do kernel pendente.
- O `apt list --upgradable` saiu vazio: nada ficou retido.
- Rodou `sudo reboot`.

A sonda (`curl` no `/up` a cada 5 s, rodando no WSL) registrou duas quedas:
- **Upgrade do `docker-ce`:** 18:42:24 a 18:42:42, cerca de 20 s, com `000` e um `502`.
- **Reboot:** 18:43:57 a 18:44:26, cerca de 30 s, com `000` e um `502`.

Somadas, menos de 1 minuto fora, bem abaixo dos 3 minutos da parada.

Conferido por Claude, por SSH, às 18:44 e 18:45 UTC:
- Kernel `7.0.0-1014-aws`.
- `/var/run/reboot-required` ausente.
- `apt list --upgradable` vazio.
- Docker 29.9.2.
- Os seis contêineres em `Up`: `app`, `scheduler`, `mysql`, `nginx`, `gotenberg` e `clamav`. Os
  cinco com healthcheck estão `healthy`.
- O log do MySQL não tem nenhuma linha de `crash recovery` nem de `not shut down normally`. No
  reboot, o MySQL recebeu o `SHUTDOWN` às 18:43:53, terminou com `Shutdown complete` às 18:43:58 e
  voltou com `ready for connections` às 18:44:23.
- Disco em 56%.

Alarmes:
- O histórico do CloudWatch mostra as ações do `lotus-prod-up` e do `lotus-prod-5xx` desligadas às
  18:41:13 UTC e religadas às 18:47:40 UTC.
- Às 18:48 UTC, os quatro alarmes estavam em `OK` com `ActionsEnabled` `True`.
- O `lotus-prod-disco` saiu de `ALARM` para `OK` às 18:40:48 UTC, fechando o item da limpeza única.

### Reboot automático

2026-10-27, às 18:48 UTC, depois da janela. O João gravou no host o
`/etc/apt/apt.conf.d/53lotus-reboot` com o `printf` do Step 5.

Conferido por Claude, por SSH, às 18:48 UTC:
- `apt-config dump | grep -i Automatic-Reboot`:
  - `Unattended-Upgrade::Automatic-Reboot "true";`
  - `Unattended-Upgrade::Automatic-Reboot-Time "08:30";`
- O arquivo, lido com `sudo cat`, é igual ao trecho do `deploy/aws/user-data.sh`.
- `apt-config dump | grep -i WithUsers` sai vazio. Vale o default do `unattended-upgrades`, que é
  `true`: o reboot acontece mesmo com sessão aberta, que é o desejado.
- `timedatectl`: `Time zone: Etc/UTC (UTC, +0000)`. As 08:30 UTC são 05:30 em Santiago no horário
  de verão.
- `/var/run/reboot-required` está ausente, porque o reboot da janela o consumiu.
  `/run/systemd/shutdown/scheduled` também está ausente. Nada fica agendado agora (spec §7).

## S3

### Lifecycle

### Login da raiz

### Política

### Negações

### Órfãos

### Desfazer

### Leitura de volta
