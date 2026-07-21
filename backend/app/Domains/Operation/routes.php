<?php

use App\Domains\Operation\Http\Controllers\EnrollmentController;
use App\Domains\Operation\Http\Controllers\TurmaController;
use Illuminate\Support\Facades\Route;

// Rotas do domínio Operation (agregadas por routes/api.php sob prefixo `api/`).
Route::middleware('auth:sanctum')->group(function () {
    Route::get('turmas', [TurmaController::class, 'index']);
    Route::get('turmas/{turma}', [TurmaController::class, 'show']);
    Route::put('turmas/{turma}', [TurmaController::class, 'update']);
    Route::delete('turmas/{turma}', [TurmaController::class, 'destroy']);
    Route::post('quotes/{quote}/turma', [TurmaController::class, 'store']);
    Route::post('turmas/{turma}/redatores/{redator}', [TurmaController::class, 'designateRedator']);
    Route::delete('turmas/{turma}/redatores/{redator}', [TurmaController::class, 'removeRedator']);

    Route::get('turmas/{turma}/alunos', [EnrollmentController::class, 'index']);
    Route::post('turmas/{turma}/alunos', [EnrollmentController::class, 'store']);
    Route::post('turmas/{turma}/alunos/importar', [EnrollmentController::class, 'import']);
    Route::delete('turmas/{turma}/alunos/{enrollment}', [EnrollmentController::class, 'destroy'])
        ->scopeBindings();
});
