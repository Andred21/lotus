<?php

use App\Domains\Identity\Http\Controllers\AuthController;
use App\Domains\Identity\Http\Controllers\RedatorController;
use Illuminate\Support\Facades\Route;

// Rotas do domínio Identity. Já entram sob prefixo `api/` e middleware `api`
// (agregadas por routes/api.php).
Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);

    // ->parameters: Str::singular('redatores') dá "redatore" (inflector em
    // inglês não reconhece o plural em português) — força o nome do parâmetro
    // de rota para casar com a assinatura `show(Redator $redator)`.
    Route::apiResource('redatores', RedatorController::class)
        ->parameters(['redatores' => 'redator'])
        ->only(['index', 'store', 'show', 'destroy']);
});
