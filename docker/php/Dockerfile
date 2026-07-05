FROM php:8.3-fpm-alpine
RUN apk add --no-cache libzip-dev icu-dev oniguruma-dev libpng-dev \
 && docker-php-ext-install pdo_mysql gd zip intl bcmath
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# --- fix de permissão: container roda com o UID do host ---
ARG UID=1000
ARG GID=1000
RUN addgroup -g ${GID} appuser \
 && adduser -D -u ${UID} -G appuser appuser

WORKDIR /var/www
USER appuser
