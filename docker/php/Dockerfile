FROM php:8.3-fpm-alpine
RUN apk add --no-cache libzip-dev icu-dev oniguruma-dev libpng-dev \
 && docker-php-ext-install pdo_mysql gd zip intl bcmath
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer
WORKDIR /var/www
