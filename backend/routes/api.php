<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/user', fn (Request $request) => $request->user())
    ->middleware('auth:sanctum');

// Cada domínio declara suas próprias rotas em app/Domains/<Dominio>/routes.php.
// RouteServiceProvider planejado (estrutura-monolito.md) ainda não existe;
// agregamos por glob aqui — routes/api.php fica só como esqueleto.
foreach (glob(app_path('Domains/*/routes.php')) as $routeFile) {
    require $routeFile;
}
