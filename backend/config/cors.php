<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    |
    | Here you may configure your settings for cross-origin resource sharing
    | or "CORS". This determines what cross-origin operations may execute
    | in web browsers. You are free to adjust these settings as needed.
    |
    | To learn more: https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS
    |
    */

    'paths' => ['api/*', 'sanctum/csrf-cookie', 'login', 'logout'],

    'allowed_methods' => ['*'],

    'allowed_origins' => explode(',', env('FRONTEND_URL', 'http://localhost:5173')),

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => true,

    /*
    |--------------------------------------------------------------------------
    | Política do site institucional (só `api/publico/*`)
    |--------------------------------------------------------------------------
    |
    | O site consulta certificado do navegador. Ele é same-site com o app, então
    | NUNCA recebe credenciais: o cookie de um admin logado iria junto. Lista
    | exata em `CORS_PUBLIC_ORIGINS`, sem curinga (o `App\Shared\Http\Middleware\
    | HandleCors` descarta toda entrada com `*`). Fora de `api/publico/*` esta
    | política não vale; vale a de cima.
    |
    */

    'publico' => [
        'allowed_origins' => array_values(array_filter(array_map('trim', explode(',', (string) env('CORS_PUBLIC_ORIGINS', ''))))),
        'allowed_origins_patterns' => [],
        'allowed_methods' => ['GET', 'POST', 'OPTIONS'],
        'allowed_headers' => ['Content-Type', 'Accept', 'Accept-Language'],
        'exposed_headers' => ['Content-Disposition', 'Retry-After'],
        'max_age' => 0,
        'supports_credentials' => false,
    ],

];
