#!/usr/bin/env bash
#
# user-data da EC2 de produção (Ubuntu 24.04 arm64) — spec v2 do item 10, §6.
# Reproduzível: host novo + este arquivo + runbook = ambiente igual.
set -euxo pipefail

# Docker Engine + compose plugin (repositório oficial do Docker) + AWS CLI
# (o backup-db.sh fala com o S3 pela instance role).
apt-get update
apt-get install -y ca-certificates curl gnupg awscli
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
echo "deb [arch=arm64 signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu noble stable" \
  > /etc/apt/sources.list.d/docker.list
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Swap de 2 GiB — obrigatório (t4g.small tem 2 GiB; o swap absorve pico de
# PDF/reload do clamav; swap SUSTENTADO é critério de resize, não de mais
# swap).
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab

# Árvore de operação. Os artefatos (compose, scripts, conf) chegam pelo
# runbook (§7) — user-data não clona repositório: produção não depende de
# working tree (DoD 8).
mkdir -p /opt/lotus/nginx /opt/lotus/bin
chmod 750 /opt/lotus
