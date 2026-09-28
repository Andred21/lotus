#!/usr/bin/env bash
#
# Deploy hook do certbot (runbook deploy/aws/README.md, secao 11): o
# certificado de /etc/letsencrypt foi renovado, o nginx recarrega para ler o
# novo. Ligado por symlink em /etc/letsencrypt/renewal-hooks/deploy/.
#
# Reload, nunca restart: restart derruba a 443 a cada renovacao. O `nginx -t`
# antes do reload e' o que barra a troca se o certificado ou a conf estiverem
# quebrados -- o nginx segue com o certificado anterior, que ainda tem ~30
# dias, e o certbot registra a falha do hook.
#
# `-p lotus` e os dois composes sao os mesmos do compose() do deploy.sh; sem
# eles o compose nao acha o servico. `exec` nao cria container, entao as
# variaveis de imagem nao entram.
#
# Catraca: frontend/tests/recarregar-nginx.test.ts. Conferido no host pelo
# botao como todo deploy/bin/*.sh (item 31).
set -euo pipefail

BASE=/opt/lotus

docker compose -p lotus --project-directory "$BASE" \
  -f "$BASE/docker-compose.prod.yml" -f "$BASE/docker-compose.prod-tls.yml" \
  exec -T nginx sh -c 'nginx -t && nginx -s reload'
