<?php

use App\Domains\Operation\Http\Controllers\EnrollmentController;
use App\Domains\Operation\Http\Controllers\TurmaController;
use App\Domains\Operation\Http\Controllers\TurmaDocumentController;
use Illuminate\Support\Facades\Route;

// Rotas do domínio Operation (agregadas por routes/api.php sob prefixo `api/`).
Route::middleware('auth:sanctum')->group(function () {
    Route::get('turmas', [TurmaController::class, 'index']);
    Route::get('turmas/pendientes-configuracion', [TurmaController::class, 'pending']);
    // ANTES do apiResource/`{turma}`, senão `turmas/archived` casa como
    // `turmas/{turma}`.
    Route::get('turmas/archived', [TurmaController::class, 'archived']);
    // `whereNumber`: sem ele um id não numérico estoura `TypeError` (500) na
    // assinatura `int $turma` antes de qualquer consulta, em vez do 404.
    Route::post('turmas/{turma}/restore', [TurmaController::class, 'restore'])
        ->whereNumber('turma');
    Route::get('turmas/{turma}', [TurmaController::class, 'show']);
    Route::put('turmas/{turma}', [TurmaController::class, 'update']);
    Route::delete('turmas/{turma}', [TurmaController::class, 'destroy']);
    Route::post('quotes/{quote}/turma', [TurmaController::class, 'store']);
    // Redator NÃO pertence à turma: a relação é N:N (`turma_redator`). Não há
    // posse a checar, e `scopeBindings` tentaria resolver `$turma->redator()`,
    // que não existe. A isenção é explícita porque o guardrail
    // (NestedRouteOwnershipTest) reprova rota que não declara nem uma nem outra.
    Route::post('turmas/{turma}/redatores/{redator}', [TurmaController::class, 'designateRedator'])
        ->withoutScopedBindings();
    Route::delete('turmas/{turma}/redatores/{redator}', [TurmaController::class, 'removeRedator'])
        ->withoutScopedBindings();
    Route::post('turmas/{turma}/conclude', [TurmaController::class, 'conclude']);
    Route::get('turmas/{turma}/manual', [TurmaController::class, 'manual']);
    Route::get('turmas/{turma}/manual/docx', [TurmaController::class, 'manualDocx']);

    Route::get('turmas/{turma}/documents', [TurmaDocumentController::class, 'index']);
    Route::post('turmas/{turma}/documents', [TurmaDocumentController::class, 'store']);
    Route::delete('turmas/{turma}/documents/{file}', [TurmaDocumentController::class, 'destroy'])
        ->scopeBindings();   // {file} resolve por $turma->files() — cross-turma = 404

    Route::get('turmas/{turma}/alunos', [EnrollmentController::class, 'index']);
    Route::get('turmas/{turma}/alunos/preview', [EnrollmentController::class, 'preview']);
    Route::post('turmas/{turma}/alunos', [EnrollmentController::class, 'store']);
    Route::post('turmas/{turma}/alunos/importar', [EnrollmentController::class, 'import']);
    Route::put('turmas/{turma}/alunos/{enrollment}/resultado', [EnrollmentController::class, 'result'])
        ->scopeBindings();
    Route::delete('turmas/{turma}/alunos/{enrollment}', [EnrollmentController::class, 'destroy'])
        ->scopeBindings();
});
