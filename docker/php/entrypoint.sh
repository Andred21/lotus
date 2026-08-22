#!/bin/sh
# Entrypoint do container `app` em produção.
#
# Duas responsabilidades, e nenhuma terceira: falhar cedo quando falta
# configuração, e aquecer os caches que dependem de env. `migrate` NÃO mora
# aqui (spec D7) — o fluxo de deploy é `compose pull → migrate → up`, e migrar
# no arranque faria containers do mesmo serviço competirem pela migração.
set -e

for var in APP_KEY APP_URL DB_HOST DB_DATABASE DB_USERNAME DB_PASSWORD; do
    eval value="\$$var"
    if [ -z "$value" ]; then
        echo "entrypoint: variável obrigatória ausente: $var" >&2
        exit 1
    fi
done

# No BOOT e não no build (spec D8): cachear durante o build congelaria as
# variáveis do estágio de build dentro da imagem, e a mesma imagem precisa
# servir qualquer ambiente.
php artisan config:cache
php artisan route:cache
php artisan view:cache

exec "$@"
