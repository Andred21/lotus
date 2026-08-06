<?php

use App\Domains\Certification\Http\Controllers\CertificateController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth:sanctum')->group(function () {
    Route::post('enrollments/{enrollment}/certificate', [CertificateController::class, 'store']);
});
