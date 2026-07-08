<?php

use App\Domains\Catalog\Http\Controllers\CourseController;
use Illuminate\Support\Facades\Route;

// Rotas do domínio Catalog (agregadas por routes/api.php sob prefixo `api/`).
Route::middleware('auth:sanctum')->group(function () {
    Route::apiResource('courses', CourseController::class);
});
