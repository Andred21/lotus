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
freshclam -d --stdout &

exec clamd
