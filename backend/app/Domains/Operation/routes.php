<?php

use App\Domains\Operation\Http\Controllers\TurmaController;
use Illuminate\Support\Facades\Route;

// Rotas do domínio Operation (agregadas por routes/api.php sob prefixo `api/`).
Route::middleware('auth:sanctum')->group(function () {
    Route::post('quotes/{quote}/turma', [TurmaController::class, 'store']);
    Route::post('turmas/{turma}/redatores/{redator}', [TurmaController::class, 'designateRedator']);
    Route::delete('turmas/{turma}/redatores/{redator}', [TurmaController::class, 'removeRedator']);
});
