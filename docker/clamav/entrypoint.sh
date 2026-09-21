#!/bin/sh
# Entrypoint do container `clamav`.
#
# Ordem que importa: o clamd RECUSA arrancar sem base ("No supported database
# files found"), e num volume novo a base não existe. Então o primeiro boot
# baixa em primeiro plano e só depois sobe o daemon — o `depends_on` do app é
# `service_started`, então essa espera não trava o deploy.
set -e

if ! ls /var/lib/clamav/*.c[lv]d >/dev/null 2>&1; then
    echo "entrypoint: volume sem base de assinaturas, baixando (~167 MB)"
    freshclam --stdout
fi

# Atualização periódica em segundo plano; NotifyClamd recarrega o daemon.
#
# SEM supervisor, e isso é escolha: o `exec clamd` substitui este shell, então
# não sobra quem vigie o filho. Pôr um supervisor aqui para um processo só
# custaria mais do que resolve. Quem cobre a queda dele é o HEALTHCHECK do
# serviço (docker-compose.prod.yml), que desde 2026-09-20 pergunta também a
# idade da daily — freshclam morto para de rejuvenescer o arquivo e o container
# vira `unhealthy` em três dias, em vez de ficar verde para sempre com a base
# congelada (Q-9 do review do mesmo dia).
freshclam -d --stdout &

exec clamd
