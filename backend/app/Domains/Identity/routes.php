<?php

use App\Domains\Identity\Http\Controllers\AuthController;
use App\Domains\Identity\Http\Controllers\PermissionController;
use App\Domains\Identity\Http\Controllers\ProfileController;
use App\Domains\Identity\Http\Controllers\RedatorController;
use App\Domains\Identity\Http\Controllers\RedatorDocumentController;
use App\Domains\Identity\Http\Controllers\RedatorPhotoController;
use App\Domains\Identity\Http\Controllers\RoleController;
use App\Domains\Identity\Http\Controllers\StudentController;
use App\Domains\Identity\Http\Controllers\StudentPhotoController;
use App\Domains\Identity\Http\Controllers\UserController;
use App\Domains\Identity\Http\Controllers\UserPhotoController;
use Illuminate\Support\Facades\Route;

// Rotas do domínio Identity. Já entram sob prefixo `api/` e middleware `api`
// (agregadas por routes/api.php).
Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);

    // Perfil próprio (spec D4): recurso próprio, fora do grupo
    // `permission:identity.user.update`. `/me` continua servindo só a sessão.
    Route::get('profile', [ProfileController::class, 'show']);

    // ->parameters: Str::singular('redatores') dá "redatore" (inflector em
    // inglês não reconhece o plural em português) — força o nome do parâmetro
    // de rota para casar com a assinatura `show(Redator $redator)`.
    Route::apiResource('redatores', RedatorController::class)
        ->parameters(['redatores' => 'redator'])
        ->only(['index', 'store', 'show', 'update', 'destroy']);

    Route::apiResource('users', UserController::class)
        ->only(['index', 'store', 'show', 'update', 'destroy']);

    Route::apiResource('students', StudentController::class)
        ->only(['index', 'store', 'show', 'update']);

    Route::apiResource('roles', RoleController::class)->only(['index', 'store', 'update']);
    Route::get('permissions', [PermissionController::class, 'index']);

    Route::middleware('permission:identity.user.update')->group(function () {
        Route::post('redatores/{redator}/documents', [RedatorDocumentController::class, 'store']);
        Route::delete('redatores/{redator}/documents/{document}', [RedatorDocumentController::class, 'destroy'])
            ->scopeBindings();   // {document} resolve por $redator->documents() — cross-redator = 404

        Route::post('users/{user}/photo', [UserPhotoController::class, 'store']);
        Route::delete('users/{user}/photo', [UserPhotoController::class, 'destroy']);

        Route::post('redatores/{redator}/photo', [RedatorPhotoController::class, 'store']);
        Route::delete('redatores/{redator}/photo', [RedatorPhotoController::class, 'destroy']);

        Route::post('students/{student}/photo', [StudentPhotoController::class, 'store']);
        Route::delete('students/{student}/photo', [StudentPhotoController::class, 'destroy']);
    });
});
