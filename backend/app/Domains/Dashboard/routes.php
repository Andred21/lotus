<?php

use App\Domains\Dashboard\Http\Controllers\DashboardController;
use Illuminate\Support\Facades\Route;

// Rotas do domínio Dashboard (agregadas por routes/api.php sob prefixo `api/`).
// Rota flat, sem parâmetro de recurso: o escopo vem do usuário autenticado, não
// da URL — por isso não há binding aninhado a declarar.
Route::middleware('auth:sanctum')->group(function () {
    Route::get('dashboard/metricas', [DashboardController::class, 'metricas']);
});
