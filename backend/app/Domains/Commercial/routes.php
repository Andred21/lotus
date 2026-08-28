<?php

use App\Domains\Commercial\Http\Controllers\BudgetController;
use App\Domains\Commercial\Http\Controllers\BudgetFileController;
use App\Domains\Commercial\Http\Controllers\ClientAddressController;
use App\Domains\Commercial\Http\Controllers\ClientContactController;
use App\Domains\Commercial\Http\Controllers\ClientController;
use App\Domains\Commercial\Http\Controllers\ClientPhotoController;
use App\Domains\Commercial\Http\Controllers\QuoteController;
use App\Domains\Commercial\Http\Controllers\QuoteFileController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth.active')->group(function () {
    // ANTES do apiResource, senão `clients/archived` casa como `clients/{client}`.
    Route::get('clients/archived', [ClientController::class, 'archived']);
    // `whereNumber`: sem ele um id não numérico estoura `TypeError` (500) na
    // assinatura `int $client` antes de qualquer consulta, em vez do 404 da spec
    // D5 (Q-6 do review de 2026-08-18).
    Route::post('clients/{client}/restore', [ClientController::class, 'restore'])->whereNumber('client');

    Route::apiResource('clients', ClientController::class);

    // ANTES do apiResource, senão `budgets/archived` casa como `budgets/{budget}`.
    Route::get('budgets/archived', [BudgetController::class, 'archived']);
    // `whereNumber`: sem ele um id não numérico estoura `TypeError` (500) na
    // assinatura `int $budget` antes de qualquer consulta, em vez do 404.
    Route::post('budgets/{budget}/restore', [BudgetController::class, 'restore'])->whereNumber('budget');

    Route::apiResource('budgets', BudgetController::class);

    Route::get('budgets/{budget}/quotes', [QuoteController::class, 'index']);
    Route::post('budgets/{budget}/quotes', [QuoteController::class, 'store']);
    Route::get('budgets/{budget}/quotes/archived', [QuoteController::class, 'archived']);
    Route::post('quotes/{quote}/restore', [QuoteController::class, 'restore'])->whereNumber('quote');
    Route::apiResource('quotes', QuoteController::class)->only(['show', 'update', 'destroy']);
    Route::post('quotes/{quote}/approve', [QuoteController::class, 'approve']);
    Route::post('quotes/{quote}/reject', [QuoteController::class, 'reject']);

    // Nested: gerenciar endereços/contatos de um cliente individualmente.
    // Editar dados do cliente = commercial.client.update.
    Route::middleware('permission:commercial.client.update')->group(function () {
        Route::post('clients/{client}/addresses', [ClientAddressController::class, 'store']);
        Route::put('addresses/{address}', [ClientAddressController::class, 'update']);
        Route::delete('addresses/{address}', [ClientAddressController::class, 'destroy']);

        Route::post('clients/{client}/contacts', [ClientContactController::class, 'store']);
        Route::put('contacts/{contact}', [ClientContactController::class, 'update']);
        Route::delete('contacts/{contact}', [ClientContactController::class, 'destroy']);

        Route::post('clients/{client}/photo', [ClientPhotoController::class, 'store'])->middleware('throttle:upload');
        Route::delete('clients/{client}/photo', [ClientPhotoController::class, 'destroy']);
    });

    Route::middleware('permission:commercial.budget.update')->group(function () {
        Route::post('budgets/{budget}/files', [BudgetFileController::class, 'store'])->middleware('throttle:upload');
        Route::delete('budgets/{budget}/files/{file}', [BudgetFileController::class, 'destroy'])
            ->scopeBindings();   // {file} resolve por $budget->files() — cross-budget = 404
    });

    Route::middleware('permission:commercial.quote.update')->group(function () {
        Route::post('quotes/{quote}/files', [QuoteFileController::class, 'store'])->middleware('throttle:upload');
        Route::delete('quotes/{quote}/files/{file}', [QuoteFileController::class, 'destroy'])
            ->scopeBindings();   // {file} resolve por $quote->files() — cross-quote = 404
    });
});
