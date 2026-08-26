<?php

use App\Domains\Identity\Http\Controllers\AuthController;
use App\Domains\Identity\Http\Controllers\PasswordResetController;
use App\Domains\Identity\Http\Controllers\PermissionController;
use App\Domains\Identity\Http\Controllers\ProfileController;
use App\Domains\Identity\Http\Controllers\ProfileDocumentController;
use App\Domains\Identity\Http\Controllers\ProfilePasswordController;
use App\Domains\Identity\Http\Controllers\ProfilePhotoController;
use App\Domains\Identity\Http\Controllers\RedatorController;
use App\Domains\Identity\Http\Controllers\RedatorDocumentController;
use App\Domains\Identity\Http\Controllers\RedatorInvitationController;
use App\Domains\Identity\Http\Controllers\RedatorPhotoController;
use App\Domains\Identity\Http\Controllers\RoleController;
use App\Domains\Identity\Http\Controllers\StudentController;
use App\Domains\Identity\Http\Controllers\StudentPhotoController;
use App\Domains\Identity\Http\Controllers\UserController;
use App\Domains\Identity\Http\Controllers\UserPhotoController;
use Illuminate\Support\Facades\Route;

// Rotas do domínio Identity. Já entram sob prefixo `api/` e middleware `api`
// (agregadas por routes/api.php).
//
// `throttle:login` e não o teto do grupo: a política e a chave (`email|ip`,
// spec D3) moram em `App\Shared\RateLimiting\RateLimits`. Esta rota ficou sem
// limite nenhum até 2026-08-25, três linhas acima do único grupo que tinha.
Route::middleware('throttle:login')->group(function () {
    Route::post('/login', [AuthController::class, 'login']);
});

// Públicas por definição: quem pede acesso ainda não tem sessão. O número saiu
// daqui e virou `RateLimits::SENHA` — mesmo valor de sempre (6/min por IP),
// agora legível num lugar só junto do resto da política.
Route::middleware('throttle:password')->group(function () {
    Route::post('/password/forgot', [PasswordResetController::class, 'forgot']);
    Route::post('/password/reset', [PasswordResetController::class, 'reset']);
    Route::post('/invitation/accept', [PasswordResetController::class, 'accept']);
});

Route::middleware('auth.active')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);

    // Perfil próprio (spec D4): recurso próprio, fora do grupo
    // `permission:identity.user.update`. `/me` continua servindo só a sessão.
    Route::get('profile', [ProfileController::class, 'show']);
    Route::put('profile', [ProfileController::class, 'update']);
    Route::post('profile/photo', [ProfilePhotoController::class, 'store'])->middleware('throttle:upload');
    Route::delete('profile/photo', [ProfilePhotoController::class, 'destroy']);
    Route::put('profile/password', [ProfilePasswordController::class, 'update']);
    Route::post('profile/documents', [ProfileDocumentController::class, 'store'])->middleware('throttle:upload');

    // ANTES do apiResource: `redatores/{redator}` casaria com `archived` e o
    // binding daria 404 tentando resolver a palavra como id.
    Route::get('redatores/archived', [RedatorController::class, 'archived']);
    Route::post('redatores/{redator}/restore', [RedatorController::class, 'restore'])
        ->whereNumber('redator');

    // ->parameters: Str::singular('redatores') dá "redatore" (inflector em
    // inglês não reconhece o plural em português) — força o nome do parâmetro
    // de rota para casar com a assinatura `show(Redator $redator)`.
    Route::apiResource('redatores', RedatorController::class)
        ->parameters(['redatores' => 'redator'])
        ->only(['index', 'store', 'show', 'update', 'destroy'])
        // `store` e `update` recebem `documents[<TIPO>]` no multipart; `index` e
        // `show` não sobem nada e não podem gastar a cota de upload.
        ->middlewareFor(['store', 'update'], 'throttle:upload');

    // ANTES do apiResource, pelo mesmo motivo de `redatores/archived`.
    Route::get('users/archived', [UserController::class, 'archived']);
    Route::post('users/{user}/restore', [UserController::class, 'restore'])
        ->whereNumber('user');

    Route::apiResource('users', UserController::class)
        ->only(['index', 'store', 'show', 'update', 'destroy']);

    Route::apiResource('students', StudentController::class)
        ->only(['index', 'store', 'show', 'update']);

    Route::apiResource('roles', RoleController::class)->only(['index', 'store', 'update']);
    Route::get('permissions', [PermissionController::class, 'index']);

    Route::middleware('permission:identity.user.update')->group(function () {
        Route::post('redatores/{redator}/invitation', [RedatorInvitationController::class, 'store']);

        Route::post('redatores/{redator}/documents', [RedatorDocumentController::class, 'store'])->middleware('throttle:upload');
        Route::delete('redatores/{redator}/documents/{document}', [RedatorDocumentController::class, 'destroy'])
            ->scopeBindings();   // {document} resolve por $redator->documents() — cross-redator = 404

        Route::post('users/{user}/photo', [UserPhotoController::class, 'store'])->middleware('throttle:upload');
        Route::delete('users/{user}/photo', [UserPhotoController::class, 'destroy']);

        Route::post('redatores/{redator}/photo', [RedatorPhotoController::class, 'store'])->middleware('throttle:upload');
        Route::delete('redatores/{redator}/photo', [RedatorPhotoController::class, 'destroy']);

        Route::post('students/{student}/photo', [StudentPhotoController::class, 'store'])->middleware('throttle:upload');
        Route::delete('students/{student}/photo', [StudentPhotoController::class, 'destroy']);
    });
});
