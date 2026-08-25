<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'gotenberg' => [
        // Conversor HTML→PDF (compose service `gotenberg`). Sprint 4 (certificados) reusa.
        'url' => env('GOTENBERG_URL', 'http://gotenberg:3000'),
    ],

    'clamav' => [
        // Daemon do compose, protocolo INSTREAM. Rede interna: sem porta
        // publicada, alcançável só de dentro do Compose.
        'host' => env('CLAMAV_HOST', 'clamav'),
        'port' => (int) env('CLAMAV_PORT', 3310),
        // 30 s: o pior caso medido é 551 ms para 10 MB, então este teto só
        // morde quando o daemon está de fato travado — que é quando queremos
        // recusar em vez de esperar.
        'timeout' => (int) env('CLAMAV_TIMEOUT', 30),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

];
