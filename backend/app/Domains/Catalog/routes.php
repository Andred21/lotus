<?php

use App\Domains\Catalog\Http\Controllers\CourseController;
use App\Domains\Catalog\Http\Controllers\CourseRedatorController;
use App\Domains\Catalog\Http\Controllers\CourseTemplateController;
use Illuminate\Support\Facades\Route;

// Rotas do domínio Catalog (agregadas por routes/api.php sob prefixo `api/`).
Route::middleware('auth:sanctum')->group(function () {
    
    Route::apiResource('courses', CourseController::class);

    // Nested: gerenciar templates de certificado de um curso individualmente.
    Route::post('courses/{course}/templates', [CourseTemplateController::class, 'store']);
    Route::put('templates/{template}', [CourseTemplateController::class, 'update']);
    Route::delete('templates/{template}', [CourseTemplateController::class, 'destroy']);

    // Habilitação redator↔curso pelo lado do curso (sync).
    Route::put('courses/{course}/redatores', [CourseRedatorController::class, 'update']);
});
