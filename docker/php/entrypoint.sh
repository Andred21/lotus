#!/bin/sh
# Entrypoint do container `app` em produção.
#
# Duas responsabilidades, e nenhuma terceira: falhar cedo quando falta
# configuração, e aquecer os caches que dependem de env. `migrate` NÃO mora
# aqui (spec D7) — o fluxo de deploy é `compose pull → migrate → up`, e migrar
# no arranque faria containers do mesmo serviço competirem pela migração.
set -e

# A cadeia Sanctum entra na lista pelo mesmo motivo que o APP_KEY: sem ela o
# container sobe SAUDÁVEL e o login não funciona. config/sanctum.php faz
# explode(',', env('SANCTUM_STATEFUL_DOMAINS', <default>)) — chave presente e
# VAZIA devolve '' e não null, o default nunca entra, e `stateful` vira [''].
# Nenhum domínio casa, o EnsureFrontendRequestsAreStateful não aplica sessão e
# o cookie do Sanctum (lei #4) nunca é aceito. O /up continua 200 e o
# healthcheck do nginx continua verde: falha silenciosa, que é exatamente o
# que este gate existe para impedir. Mesma razão para FRONTEND_URL
# (cors.php:22) e SESSION_DOMAIN (session.php:159).
for var in APP_KEY APP_URL DB_HOST DB_DATABASE DB_USERNAME DB_PASSWORD \
           SESSION_DOMAIN FRONTEND_URL SANCTUM_STATEFUL_DOMAINS; do
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
