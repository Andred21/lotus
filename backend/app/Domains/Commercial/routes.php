<?php

use App\Domains\Commercial\Http\Controllers\ClientAddressController;
use App\Domains\Commercial\Http\Controllers\ClientContactController;
use App\Domains\Commercial\Http\Controllers\ClientController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth:sanctum')->group(function () {
    Route::apiResource('clients', ClientController::class);

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
});
