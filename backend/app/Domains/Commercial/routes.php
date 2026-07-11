<?php

use App\Domains\Commercial\Http\Controllers\BudgetController;
use App\Domains\Commercial\Http\Controllers\BudgetFileController;
use App\Domains\Commercial\Http\Controllers\ClientAddressController;
use App\Domains\Commercial\Http\Controllers\ClientContactController;
use App\Domains\Commercial\Http\Controllers\ClientController;
use App\Domains\Commercial\Http\Controllers\QuoteController;
use App\Domains\Commercial\Http\Controllers\QuoteFileController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth:sanctum')->group(function () {
    Route::apiResource('clients', ClientController::class);
    Route::apiResource('budgets', BudgetController::class);

    Route::get('budgets/{budget}/quotes', [QuoteController::class, 'index']);
    Route::post('budgets/{budget}/quotes', [QuoteController::class, 'store']);
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
    });

    Route::middleware('permission:commercial.budget.update')->group(function () {
        Route::post('budgets/{budget}/files', [BudgetFileController::class, 'store']);
        Route::delete('budgets/{budget}/files/{file}', [BudgetFileController::class, 'destroy']);
    });

    Route::middleware('permission:commercial.quote.update')->group(function () {
        Route::post('quotes/{quote}/files', [QuoteFileController::class, 'store']);
        Route::delete('quotes/{quote}/files/{file}', [QuoteFileController::class, 'destroy']);
    });
});
