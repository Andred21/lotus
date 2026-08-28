<?php

use App\Domains\Certification\Http\Controllers\CertificateController;
use App\Domains\Certification\Http\Controllers\PublicCertificateController;
use Illuminate\Support\Facades\Route;

// Anônima de propósito (validação do QR, peso legal), e por isso a única
// contenção possível é por IP. Larga o bastante para conferência na mão.
Route::get('publico/certificados/{uuid}', [PublicCertificateController::class, 'show'])
    ->middleware('throttle:public-certificate');

Route::middleware('auth.active')->group(function () {
    Route::post('enrollments/{enrollment}/certificate', [CertificateController::class, 'store']);
    Route::get('certificates', [CertificateController::class, 'index']);
    Route::get('certificates/emission-panel', [CertificateController::class, 'emissionPanel']);
    Route::post('certificates/batch', [CertificateController::class, 'batch'])
        ->middleware('throttle:certificate-batch');
    // Renderiza no Gotenberg a CADA requisição — nada é cacheado nem lido do
    // bucket. É a rota mais cara do sistema, e o limitador é a contenção dela
    // (spec D6); persistir o PDF ficou fora do bloco de propósito.
    Route::get('certificates/{certificate}/pdf', [CertificateController::class, 'pdf'])
        ->middleware('throttle:certificate-pdf');
    Route::get('certificates/{certificate}', [CertificateController::class, 'show']);
    Route::post('certificates/{certificate}/revoke', [CertificateController::class, 'revoke']);
});
