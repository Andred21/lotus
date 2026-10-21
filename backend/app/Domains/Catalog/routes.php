<?php

use App\Domains\Catalog\Http\Controllers\CourseController;
use App\Domains\Catalog\Http\Controllers\CourseRedatorController;
use Illuminate\Support\Facades\Route;

// Rotas do domínio Catalog (agregadas por routes/api.php sob prefixo `api/`).
Route::middleware('auth.active')->group(function () {

    // ANTES do apiResource, senão `courses/archived` casa como `courses/{course}`.
    Route::get('courses/archived', [CourseController::class, 'archived']);
    // `whereNumber`: sem ele um id não numérico estoura `TypeError` (500) na
    // assinatura `int $course` antes de qualquer consulta, em vez do 404 da spec
    // D5 (Q-6 do review de 2026-08-18).
    Route::post('courses/{course}/restore', [CourseController::class, 'restore'])->whereNumber('course');

    Route::apiResource('courses', CourseController::class);

    // Habilitação = editar o curso → catalog.course.update.
    Route::middleware('permission:catalog.course.update')->group(function () {
        // Habilitação redator↔curso pelo lado do curso (sync).
        Route::put('courses/{course}/redatores', [CourseRedatorController::class, 'update']);
    });
});
