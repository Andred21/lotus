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
