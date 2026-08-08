<?php

use App\Domains\Certification\Http\Controllers\CertificateController;
use App\Domains\Certification\Http\Controllers\PublicCertificateController;
use Illuminate\Support\Facades\Route;

Route::get('publico/certificados/{uuid}', [PublicCertificateController::class, 'show']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('enrollments/{enrollment}/certificate', [CertificateController::class, 'store']);
    Route::get('certificates', [CertificateController::class, 'index']);
    Route::get('certificates/emission-panel', [CertificateController::class, 'emissionPanel']);
    Route::get('certificates/{certificate}/pdf', [CertificateController::class, 'pdf']);
    Route::get('certificates/{certificate}', [CertificateController::class, 'show']);
    Route::post('certificates/{certificate}/revoke', [CertificateController::class, 'revoke']);
});
