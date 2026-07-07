<?php

use App\Domains\Identity\Http\Controllers\AuthController;
use Illuminate\Support\Facades\Route;

// Rotas do domínio Identity. Já entram sob prefixo `api/` e middleware `api`
// (agregadas por routes/api.php).
Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);
});
