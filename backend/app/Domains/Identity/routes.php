<?php

use App\Domains\Identity\Http\Controllers\AuthController;
use App\Domains\Identity\Http\Controllers\RedatorController;
use App\Domains\Identity\Http\Controllers\RedatorDocumentController;
use App\Domains\Identity\Http\Controllers\RoleController;
use App\Domains\Identity\Http\Controllers\UserController;
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
        ->only(['index', 'store', 'show', 'update', 'destroy']);

    Route::apiResource('users', UserController::class)
        ->only(['index', 'store', 'show', 'update', 'destroy']);

    Route::get('roles', [RoleController::class, 'index']);

    Route::middleware('permission:identity.user.update')->group(function () {
        Route::post('redatores/{redator}/documents', [RedatorDocumentController::class, 'store']);
        Route::delete('redatores/{redator}/documents/{document}', [RedatorDocumentController::class, 'destroy']);
    });
});
